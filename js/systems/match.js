/**
 * match.js
 * ---------------------------------------------------------------
 * LA PARTIDA: los bots, quien sigue vivo y como termina.
 *
 * Cuantos bots hay, en que tramo del mapa se juega, como de rapido se
 * cierra la tormenta y si todos empiezan con la misma arma lo decide el
 * MODO (ver data/modes.js), que llega por `start(rng, reglas)`.
 *
 * Se encarga de:
 *   - crear los 50 bots con NOMBRES UNICOS y repartirlos por la isla
 *   - actualizar su fisica y su IA cada frame
 *   - llevar la cuenta de VIVOS (jugador + bots)
 *   - registrar las bajas y decidir el final: derrota o victoria
 *
 * Para que 50 bots no se coman la CPU, los que estan lejos del jugador
 * se simulan una vez de cada tres (con el dt acumulado). Se mueven y
 * pelean igual, solo que con menos resolucion; como no los ves, no se nota.
 */

import { CONFIG } from '../core/config.js';
import { Bot, rollPersonality } from '../entities/bot.js';
import { updateBotAI } from './botAI.js';
import { generateBotNames } from '../data/botNames.js';
import { SKINS, GLIDERS } from '../data/cosmetics.js';
import { rollWeapon, rollLoot, makeWeapon } from '../data/loot.js';
import { WEAPONS } from '../data/weapons.js';
import { SafeZone } from './safeZone.js';
import { BattleBus } from '../entities/battleBus.js';
import { spreadSpawnPoints, shuffle } from './spawnPoints.js';
import { assignTeams, areAllies } from './teams.js';

/** Cuantas bajas se ensenan a la vez en el registro. */
const FEED_MAX = 4;
/** Lo que dura cada linea del registro de bajas. */
const FEED_TIME = 4.5;

export class MatchManager {
  /**
   * @param {object} deps { world, player, loot, bullets, particles }
   */
  constructor(deps) {
    this.world = deps.world;
    this.player = deps.player;
    this.loot = deps.loot;
    this.bullets = deps.bullets;
    this.particles = deps.particles;
    /** Tala de arboles y construcciones: los bots tambien las usan. */
    this.harvest = deps.harvest || null;
    this.build = deps.build || null;
    /** Supply drops: los bots tambien van a por ellos. */
    this.supply = deps.supply || null;
    /** Abatidos y reanimacion (solo en duos y escuadrones). */
    this.revive = deps.revive || null;

    /** Tamano de equipo del modo: 1 = individual. */
    this.teamSize = 1;

    /**
     * Gestor de REAPARICION (systems/reload.js), o null en los modos
     * que no la tienen. Lo enchufa game.js.
     *
     * Mientras alguien espera a reaparecer NO esta fuera de la partida,
     * asi que el marcador, la victoria y la derrota tienen que contar
     * con el. Ese es todo el cambio que necesita este archivo.
     */
    this.respawn = null;

    /** Zona segura que se cierra: sin ella la partida no termina. */
    this.zone = new SafeZone(deps.world);

    /** El bus de batalla del principio. */
    this.bus = null;
    /** true mientras se juega una ARENA de minijuego (sin bus ni tormenta). */
    this.arena = false;
    /**
     * Fase de la partida:
     *   'bus'     -> el jugador aun esta cayendo (bus, caida o paravela)
     *   'jugando' -> ha tocado tierra; a partir de aqui, todo normal
     */
    this.phase = 'bus';

    /** @type {Bot[]} */
    this.bots = [];
    /** Registro de bajas: [{ text, life, mine }] */
    this.feed = [];

    /** 'jugando' | 'derrota' | 'victoria' */
    this.result = 'jugando';
    /** Nombre del bot que te elimino. */
    this.killerName = null;
    /** Puesto en el que has quedado (1 = victoria). */
    this.placement = null;
    /** Bajas del jugador. */
    this.kills = 0;

    this.matchTime = 0;
    this._stepCounter = 0;
    this.zone.reset();

    /** Aviso para la pantalla (lo enchufa game.js). */
    this.onMessage = null;
  }

  /* =============================================================
     ARRANQUE
     ============================================================= */

  /**
   * Crea los bots y los reparte por la isla.
   *
   * @param {() => number} rng
   * @param {object} reglas  reglas del modo (ver data/modes.js):
   *   bots         cuantos enemigos (por defecto, los de CONFIG)
   *   bounds       { x0, x1 } tramo jugable en los modos de mapa reducido
   *   busTime      segundos que tarda el bus en cruzarlo
   *   storm        ajustes de la tormenta
   *   startWeapon  si todos empiezan con LA MISMA arma
   */
  start(rng = Math.random, reglas = {}) {
    this.bots.length = 0;
    this.feed.length = 0;
    this.result = 'jugando';
    this.killerName = null;
    this.placement = null;
    this.kills = 0;
    this.matchTime = 0;

    /** Tramo jugable de este modo (null = la isla entera). */
    this.bounds = reglas.bounds || null;

    // La partida empieza en el aire: bus nuevo y zona sin empezar.
    this.arena = false;
    this.zone.reset({ bounds: this.bounds, storm: reglas.storm });
    this.phase = 'bus';
    this.bus = new BattleBus(this.world, rng, {
      bounds: this.bounds,
      crossTime: reglas.busTime,
    });

    const count = reglas.bots ?? CONFIG.bots.count;
    const nombres = generateBotNames(count, rng);

    // TODOS CON LA MISMA ARMA (Julen Blitz): se sortea UNA para la
    // partida entera. Es lo que hace que el arranque sea justo: nadie
    // gana por haber caido encima de una escopeta legendaria.
    const armaComun = reglas.startWeapon ? this._armaDeSalida(rng) : null;

    // Un punto por participante (los bots MAS el jugador), repartidos de
    // punta a punta del tramo, y luego barajados para que no vaya
    // siempre el jugador al mismo lado.
    const puntos = shuffle(
      spreadSpawnPoints(this.world, count + 1, CONFIG.player.height, rng, this.bounds),
      rng
    );

    // El primero es para el jugador: ahi es donde deberia aterrizar,
    // pero primero sale del bus (la posicion real la decide el jugador).
    this.playerSpawn = puntos[0];
    this.player.boardBus();

    // Se le coloca ya en la puerta del bus: si no, la camara se centra
    // primero en el suelo y luego pega un barrido hasta el cielo.
    this.player.x = this.bus.doorX - this.player.w / 2;
    this.player.y = this.bus.doorY;

    for (let i = 0; i < count; i++) {
      const bot = new Bot(this.world, {
        id: `bot${i}`,
        name: nombres[i],
        x: puntos[i + 1].x,
        y: puntos[i + 1].y,
        skin: SKINS[Math.floor(rng() * SKINS.length)],
        personality: rollPersonality(rng),
      });

      if (armaComun) {
        // Misma arma para todos: una copia por bot, para que cada uno
        // gaste su propia municion y no compartan estado.
        bot.weapon = makeWeapon(armaComun.def, armaComun.rarity);
      } else if (rng() < CONFIG.bots.startArmedChance) {
        // Algunos empiezan ya con arma, para que la partida arranque viva.
        bot.weapon = rollWeapon(rng);
      }

      // Y con algo de madera, para que puedan construir desde el
      // principio. En los modos sin construccion no se reparte ninguna.
      if (reglas.build !== false && rng() < CONFIG.bots.startWoodChance) {
        const [min, max] = CONFIG.bots.startWood;
        bot.wood = Math.round(min + rng() * (max - min));
      }

      // Todos salen del bus: cada uno con su punto de aterrizaje y con
      // un margen al azar para no soltarse todos a la vez.
      bot.flight = 'bus';
      bot.glider = GLIDERS[Math.floor(rng() * GLIDERS.length)];
      bot.landX = puntos[i + 1].x;
      bot.landY = puntos[i + 1].y;
      bot.jumpMargin = (rng() - 0.5) * CONFIG.bus.botJumpSpread;

      this.bots.push(bot);
    }

    /** El arma con la que empiezan todos, si el modo la impone. */
    this.startWeapon = armaComun;

    // --- EQUIPOS ---
    // En individual sale uno por cabeza (75 equipos de 1) y `areAllies`
    // dice que no a todo, asi que no hay dos caminos que mantener.
    this.teamSize = reglas.teamSize || 1;
    this.teamCount = assignTeams(this.player, this.bots, this.teamSize, rng);
  }

  /**
   * Sortea el arma de salida de un modo con IGUALDAD AL EMPEZAR.
   *
   * No vale `rollWeapon`: ahi entran el francotirador (32 personas
   * disparando desde lejos no es una partida, es una espera), el minigun
   * y el Julen, que es el arma mas fuerte del juego. Se sortea entre las
   * de tiro corriente y siempre en rareza `poco comun`, para que la
   * mejora se note de verdad al subir de nivel Blitz.
   */
  _armaDeSalida(rng) {
    const FUERA = new Set(['sniper', 'minigun', 'julen']);
    // Y nada de aparatos que no disparan: empezar con una Grieta
    // Portatil por toda arma seria empezar desarmado.
    const candidatas = WEAPONS.filter((w) => !FUERA.has(w.id) && !w.effect);
    const def = candidatas[Math.floor(rng() * candidatas.length)] || WEAPONS[0];
    return makeWeapon(def, 'uncommon');
  }

  /** Lleva al jugador a su punto de aparicion de esta partida. */
  _placePlayer() {
    if (!this.playerSpawn) return;
    this.player.x = this.playerSpawn.x;
    this.player.y = this.playerSpawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
  }

  /* =============================================================
     UPDATE
     ============================================================= */

  /**
   * Arranca una ARENA de minijuego: mismo mundo y mismos sistemas, pero
   * sin bus, sin zona que se cierre y con los bots que pida el modo (a
   * menudo ninguno). El final lo decide el minijuego, no el marcador.
   *
   * @param {object} opciones { bots, spawn: {x, y}, botOptions }
   */
  startArena(opciones = {}) {
    this.bots.length = 0;
    this.feed.length = 0;
    this.result = 'jugando';
    this.killerName = null;
    this.placement = null;
    this.kills = 0;
    this.matchTime = 0;

    this.arena = true;
    this.phase = 'jugando';
    this.bus = null;
    this.zone.reset();

    // Sin fase de paz: en una partida los primeros 14 segundos nadie
    // dispara para dar tiempo a saquear, pero en un minijuego eso serian
    // 14 segundos mirandose las caras.
    this.matchTime = CONFIG.bots.graceTime + 1;

    // El jugador entra ya de pie donde diga el modo.
    this.player.flight = null;
    if (opciones.spawn) {
      this.player.x = opciones.spawn.x;
      this.player.y = opciones.spawn.y;
      this.player.vx = 0;
      this.player.vy = 0;
    }

    return this.bots;
  }

  update(dt) {
    this.matchTime += dt;
    this._stepCounter++;

    this._updateFeed(dt);

    if (this.result !== 'jugando') return;

    // --- Fase del bus: nadie pelea todavia ---
    this._updateDeployment(dt);

    // La zona se cierra y hace dano a quien se queda fuera.
    // No empieza hasta que el jugador ha tocado tierra. En las arenas de
    // minijuego no hay tormenta: se entrena tranquilo.
    if (this.phase === 'jugando' && !this.arena) this.zone.update(dt, this.entities);

    // Lista de todos los que pueden recibir o repartir tiros.
    const enemies = this.entities;

    const px = this.player.x;
    const lejos = CONFIG.bots.farDistance;
    const cada = CONFIG.bots.farStepEvery;

    const ctx = {
      world: this.world,
      enemies,
      loot: this.loot,
      bullets: this.bullets,
      particles: this.particles,
      matchTime: this.matchTime,
      aliveBots: this.aliveBots,
      zone: this.zone,
      harvest: this.harvest,
      build: this.build,
      // Cajas de suministros: los bots tambien van a por ellas.
      supply: this.supply,
      // Reanimacion: los aliados van a levantar a los suyos.
      revive: this.revive,
      // Para que los aliados no se alejen del jugador.
      player: this.player,
    };

    for (const bot of this.bots) {
      if (!bot.alive) continue;
      // Los que aun caen del bus se mueven en _updateDeployment.
      if (bot.flight) continue;

      // Al volante o colgado de una tirolina, la posicion la manda el
      // sistema correspondiente: aplicarle ademas su fisica normal lo
      // arrancaria del asiento o de la cuerda.
      if (bot.driving || bot.riding) {
        updateBotAI(bot, dt, ctx);   // sigue pensando a donde va
        continue;
      }

      // --- Nivel de detalle: los lejanos van a un tercio de ritmo ---
      const distancia = Math.abs(bot.x - px);
      if (distancia > lejos) {
        if (this._stepCounter % cada !== 0) continue;
        updateBotAI(bot, dt * cada, ctx);
        bot.step(dt * cada);
      } else {
        updateBotAI(bot, dt, ctx);
        bot.step(dt);
      }

    }

    this.collectDeaths();
  }

  /**
   * Procesa las bajas ocurridas desde la ultima llamada.
   *
   * Va aparte del bucle de bots a proposito: las balas se resuelven
   * DESPUES de actualizar la partida, asi que un bot abatido por un
   * disparo moria sin que se registrase su baja (ni contaba para el
   * marcador ni salia en el registro). game.js lo llama justo despues
   * de mover las balas.
   */
  collectDeaths() {
    for (const bot of this.bots) {
      if (bot.alive || bot.deathHandled) continue;
      bot.deathHandled = true;
      this._onBotDown(bot);
    }

    this._checkPlayer();
    this._checkVictory();
  }

  /**
   * FASE DEL BUS: mueve el autobus, mantiene encima a quien no ha
   * saltado y hace descender a los que ya van por el aire.
   */
  _updateDeployment(dt) {
    if (!this.bus) return;

    this.bus.update(dt);

    // --- El jugador ---
    if (this.player.flight === 'bus') {
      // Va agarrado a la puerta del bus.
      this.player.x = this.bus.doorX - this.player.w / 2;
      this.player.y = this.bus.doorY;
      this.player.vx = 0;
      this.player.vy = 0;

      // Si no salta por su cuenta, el bus lo suelta antes de irse.
      if (this.bus.progress >= CONFIG.bus.autoJumpAt) {
        this.player.jumpOffBus();
        this.onMessage?.('¡El bus te ha soltado!', 'legendary');
      }
    } else if (this.player.flight === null && this.phase === 'bus') {
      // Acaba de tocar tierra: empieza la partida de verdad.
      this.phase = 'jugando';
      this.onMessage?.('¡Has aterrizado! Busca armas', 'uncommon');
      this.onLanded?.();
    }

    // --- Los bots ---
    for (const bot of this.bots) {
      if (!bot.alive || !bot.flight) continue;

      if (bot.flight === 'bus') {
        // Colgados del bus hasta que toca su turno
        bot.x = this.bus.doorX - bot.w / 2;
        bot.y = this.bus.doorY;

        // Saltan cuando el bus pasa por encima de su destino
        const distancia = (bot.landX + bot.jumpMargin) - this.bus.x;
        const yaPasado = this.bus.dir > 0 ? distancia <= 0 : distancia >= 0;
        if (yaPasado || this.bus.progress >= CONFIG.bus.autoJumpAt) {
          bot.flight = 'cayendo';
        }
        continue;
      }

      this._updateBotFlight(bot, dt);
    }
  }

  /**
   * Descenso de un bot: en vez de fisica completa se le guia hacia su
   * punto de aterrizaje. Con 74 bots cayendo a la vez, esto cuesta una
   * fraccion de lo que costaria simularlos de verdad, y ademas garantiza
   * que caen repartidos donde toca.
   */
  _updateBotFlight(bot, dt) {
    const B = CONFIG.bus;

    // Hacia su destino
    const cx = bot.x + bot.w / 2;
    const dx = bot.landX - cx;
    const paso = (bot.flight === 'planeando' ? B.glideMoveSpeed : B.fallMoveSpeed) * dt;
    bot.x += Math.abs(dx) < paso ? dx : Math.sign(dx) * paso;
    bot.facing = dx >= 0 ? 1 : -1;

    // Descenso
    const suelo = this.world.groundYAt(bot.x + bot.w / 2);
    const altura = suelo - (bot.y + bot.h);

    if (bot.flight === 'cayendo' && altura < B.autoGlideHeight) {
      bot.flight = 'planeando';
    }

    // La pose: cayendo en picado o colgando de la paravela.
    bot.animState = bot.flight === 'planeando' ? 'glide' : 'fall';
    bot.stepPhase += dt * 4;

    const caida = bot.flight === 'planeando' ? B.glideFallSpeed : B.fallMaxSpeed * 0.75;
    bot.y += caida * dt;

    // ¿Ya ha tocado tierra?
    if (bot.y + bot.h >= suelo) {
      bot.y = suelo - bot.h;
      bot.vx = 0;
      bot.vy = 0;
      bot.onGround = true;
      bot.flight = null;
      bot.animState = 'idle';
    }
  }

  /** Todos los que participan en el tiroteo (jugador + bots vivos). */
  get entities() {
    const list = [];
    if (this.player.alive) list.push(this.player);
    for (const b of this.bots) if (b.alive) list.push(b);
    return list;
  }

  /**
   * Bots que siguen EN PIE. Solo lo usa la IA, para saber cuando toca
   * dejar de saquear e irse al centro a buscarse las caras.
   *
   * Los ABATIDOS no cuentan: no disparan a nadie y se van a morir en
   * medio minuto. Contandolos, la recta final tardaba de mas en
   * arrancar y las partidas de escuadron se alargaban.
   */
  get aliveBots() {
    let n = 0;
    for (const b of this.bots) if (b.alive && !b.downed) n++;
    return n;
  }

  /**
   * ¿Sigue este participante en la partida?
   *
   * Vivo, abatido... o muerto pero con la cuenta atras de reaparicion
   * corriendo, que en el Julen Recarga es lo mismo que seguir dentro.
   */
  _enJuego(quien) {
    return quien.alive || !!this.respawn?.sostenido(quien);
  }

  /** Vivos que quedan: el jugador (si sigue) mas los bots en pie. */
  get aliveCount() {
    let n = this._enJuego(this.player) ? 1 : 0;
    for (const b of this.bots) if (this._enJuego(b)) n++;
    return n;
  }

  /**
   * ESCUADRONES que siguen con alguien en pie.
   *
   * Un abatido cuenta como vivo: mientras le quede un companero que
   * pueda levantarlo, su equipo sigue en la partida. Es lo mismo que
   * hace Fortnite y lo que hace que el marcador tenga sentido.
   */
  get aliveTeams() {
    const vivos = new Set();
    if (this._enJuego(this.player)) vivos.add(this.player.team);
    for (const b of this.bots) if (this._enJuego(b)) vivos.add(b.team);
    return vivos.size;
  }

  /**
   * Tus companeros de escuadron: vivos, abatidos o esperando a
   * reaparecer. Los tres estados siguen siendo "companeros que tienes",
   * y los tres se pintan en la lista del HUD.
   */
  get squad() {
    return this.bots.filter((b) => this._enJuego(b) && areAllies(b, this.player));
  }

  /* =============================================================
     BAJAS
     ============================================================= */

  /** Un bot ha caido. */
  _onBotDown(bot) {
    const asesino = bot.killedBy;

    // Suelta lo que llevaba, para que el botin siga circulando.
    if (bot.weapon) {
      this.loot.dropItemAt(bot.weapon, bot.x + bot.w / 2, bot.y + bot.h - 20);
      bot.weapon = null;
    }
    if (bot.heals > 0) {
      this.loot.dropItemAt(rollLoot(), bot.x + bot.w / 2 + 24, bot.y + bot.h - 20);
      bot.heals = 0;
    }

    this.particles.puff(bot.x + bot.w / 2, bot.y + bot.h / 2, 'rgba(255, 240, 200, 0.65)', 10);
    this.particles.spark(bot.x + bot.w / 2, bot.y + bot.h / 2, '#ffd23f', 10, 240);

    const porMi = asesino === this.player;
    if (porMi) { this.kills++; this.onKill?.(bot); }
    else if (asesino) asesino.kills++;

    // Aviso de baja para TODOS, tambien las de bot contra bot: lo usa la
    // reaparicion del Julen Recarga, donde cada baja acorta la espera de
    // los companeros del que ha matado, sea quien sea.
    if (asesino) this.onAnyKill?.(asesino, bot);

    const quien = asesino ? asesino.name : 'la isla';
    this._pushFeed(
      porMi ? `Has eliminado a ${bot.name}` : `${quien} elimino a ${bot.name}`,
      porMi
    );
  }

  /** ¿Ha caido el jugador? */
  _checkPlayer() {
    if (this.arena) return;      // en un minijuego el final lo decide el modo
    if (this.player.alive) return;
    if (this.result !== 'jugando') return;
    // Caido, pero tu escuadron te sostiene: todavia no has perdido nada.
    if (this.respawn?.sostenido(this.player)) return;

    const asesino = this.player.lastAttacker;
    this.killerName = asesino?.name || 'la isla';
    // El puesto es cuantos quedaban contandote a ti: jugadores en
    // individual, ESCUADRONES cuando se juega en equipo.
    this.placement = this.teamSize > 1
      ? this.aliveTeams + (this.squad.length > 0 ? 0 : 1)
      : this.aliveCount + 1;
    this.result = 'derrota';
  }

  /**
   * ¿Ha ganado el jugador?
   *
   * En individual, cuando no queda ningun bot. En equipo, cuando no
   * queda ningun bot ENEMIGO: tu escuadron gana aunque hayan caido
   * companeros, que es justo la gracia de jugar en equipo.
   */
  _checkVictory() {
    if (this.arena) return;      // idem: sin bots no hay "victoria" que anunciar
    if (this.result !== 'jugando') return;
    if (!this.player.alive) return;

    const enemigosVivos = this.bots.some((b) => this._enJuego(b) && !areAllies(b, this.player));
    if (!enemigosVivos) {
      this.placement = 1;
      this.result = 'victoria';
    }
  }

  /* =============================================================
     REGISTRO DE BAJAS
     ============================================================= */

  _pushFeed(text, mine = false) {
    this.feed.unshift({ text, life: FEED_TIME, mine });
    if (this.feed.length > FEED_MAX) this.feed.length = FEED_MAX;
  }

  _updateFeed(dt) {
    for (let i = this.feed.length - 1; i >= 0; i--) {
      this.feed[i].life -= dt;
      if (this.feed[i].life <= 0) this.feed.splice(i, 1);
    }
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    // El bus se dibuja antes que nadie: va por detras de los personajes.
    if (this.bus && !this.bus.finished && this.phase === 'bus') {
      if (camera.isVisible(this.bus.x - 200, this.bus.y - 220, 500, 400)) {
        this.bus.draw(ctx, time);
      }
    }

    for (const bot of this.bots) {
      if (!bot.alive) continue;
      // Los que aun van DENTRO del bus no se pintan: estarian todos en
      // el mismo punto y sus chapas de nombre se amontonarian.
      if (bot.flight === 'bus') continue;
      if (!camera.isVisible(bot.x - 40, bot.y - 40, bot.w + 80, bot.h + 80)) continue;
      // El jugador viaja como "quien mira": es quien decide si un bot
      // se pinta como aliado (verde) o como enemigo (rojo).
      bot.draw(ctx, time, this.player);
    }
  }
}
