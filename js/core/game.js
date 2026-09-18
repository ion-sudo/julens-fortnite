/**
 * game.js
 * ---------------------------------------------------------------
 * Orquestador: crea el mundo, el jugador y la camara, y ejecuta
 * el bucle principal (update de fisica con paso fijo + render).
 *
 * Tiene DOS estados:
 *   'menu'    -> el escenario se ve de fondo con la camara paseando sola
 *                (el menu en si es DOM: ver js/ui/menu.js)
 *   'playing' -> partida: teclado, raton, inventario, combate y HUD
 *
 * Los sistemas de partida (inventario, combate, botin) se crean al
 * empezar cada partida en startMatch(), no en el constructor.
 */

import { CONFIG } from './config.js';
import { damp, roundRectPath } from './utils.js';
import { Input } from './input.js';
import { Mouse } from './mouse.js';
import { Camera } from './camera.js';
import { Inventory, PICKAXE_SLOT } from './inventory.js';
import { playPickup, playKill, setListener, setStormLevel, stopStorm } from './audio.js';
import { playMusic, updateMusic } from './music.js';

import { World } from '../world/level.js';
import { drawSky, drawHills, drawClouds, drawBiomeTint } from '../world/background.js';
import { drawWaterBodies } from '../world/water.js';
import { drawTerrain } from '../world/terrain.js';
import { drawProp } from '../world/props.js';
import { modeById, DEFAULT_MODE } from '../data/modes.js';
import { zoneById } from '../data/zones.js';
import { makeWeapon, setWeaponPool } from '../data/loot.js';
import { BLITZ_START_AMMO, GOLDEN_CHEST_SHARE } from '../data/blitz.js';
import { BlitzManager } from '../systems/blitz.js';
import { drawBlitzHud, drawBlitzBanner } from '../ui/blitzHud.js';
import { drawReviveHud } from '../ui/squadHud.js';

import { Player } from '../entities/player.js';
import { drawPlayer } from '../entities/playerSprite.js';
import { Particles } from '../entities/particles.js';
import { BulletSystem } from '../entities/bullet.js';
import { spawnTargets } from '../entities/target.js';
import { spawnFish } from '../entities/fish.js';

import { Combat } from '../systems/combat.js';
import { LootManager } from '../systems/worldLoot.js';
import { ChestManager } from '../systems/chests.js';
import { HarvestManager } from '../systems/harvest.js';
import { BuildManager } from '../systems/building.js';
import { ThrowableManager } from '../systems/throwables.js';
import { SupplyDropManager } from '../systems/supplyDrops.js';
import { GadgetManager } from '../systems/gadgets.js';
import { ReviveManager } from '../systems/revive.js';
import { EmoteManager } from '../systems/emotes.js';
import { drawEmoteWheel } from '../ui/emoteWheel.js';
import { BuildingManager } from '../systems/buildings.js';
import { VehicleManager } from '../systems/vehicles.js';
import { MobilityManager } from '../systems/mobility.js';
import { MatchManager } from '../systems/match.js';
import { MissionManager } from '../systems/missions.js';
import { XpTracker } from '../systems/xp.js';
import { EVENTS } from '../data/missions.js';
import { XP } from '../data/levels.js';
import { minigameById } from '../data/minigames.js';
import { modeFor } from '../systems/minigames/index.js';
import { drawMinigameEnd, endButtons, hits } from '../ui/minigameHud.js';
import { zoneAt } from '../data/zones.js';

import { drawHUD } from '../ui/hud.js';
import { drawInventory } from '../ui/inventoryHud.js';
import { drawBuildHud } from '../ui/buildHud.js';
import { drawCrosshair } from '../ui/crosshair.js';
import { drawMatchHud, drawEndScreen, drawDeploymentHud } from '../ui/matchHud.js';
import { drawWorldMap } from '../ui/worldMap.js';
import { ReloadManager } from '../systems/reload.js';
import { AutoFire } from '../systems/autoFire.js';
import { drawRespawnHud } from '../ui/reloadHud.js';
import { Ambience } from '../world/ambience.js';
import { control, segunControl } from '../ui/controlHints.js';

/**
 * MANDO MUDO. Se le pasa al jugador cuando esta caido esperando a
 * reaparecer (Julen Recarga): el cuerpo sigue teniendo fisica, pero no
 * obedece a nadie. Es mas seguro que apagar el update entero, porque
 * asi la gravedad y las colisiones siguen igual que siempre.
 */
/**
 * Respiro antes de que las pantallas de FIN hagan caso a un clic.
 *
 * Al acabar una partida (o la ultima oleada de JULEN DEFENSA) lo normal
 * es estar disparando, y los botones salen en mitad de la pantalla: el
 * tiro que estabas dando caia encima de SALIR y te mandaba al menu sin
 * darte tiempo a leer nada. Ademas, el clic que YA venias apretando no
 * cuenta: hay que soltar y volver a pulsar.
 */
const ESPERA_FIN = 1.2;

const INPUT_QUIETO = {
  axisX: 0,
  isDown: () => false,
  wasPressed: () => false,
  consume: () => false,
};

/** Paso fijo de simulacion: fisica estable e independiente del monitor. */
const FIXED_DT = 1 / 120;
const MAX_STEPS = 8; // tope para no bloquear el hilo si la pestana estuvo parada

/** Cuanto dura en pantalla un aviso ("Has cogido: ..."). */
const MESSAGE_TIME = 2.2;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.view = { width: CONFIG.canvas.width, height: CONFIG.canvas.height };

    // --- Sistemas permanentes ---
    this.input = new Input();
    this.world = new World();
    this.player = new Player(this.world);
    // Solo el jugador de verdad hace sonidos de cerca (pasos, salto...).
    this.player.oye = true;
    // CICLO DIA/NOCHE Y CLIMA. Es permanente (no se recrea cada partida)
    // porque solo guarda la hora y el clima, y los sortea en cada start.
    this.ambience = new Ambience();

    this.camera = new Camera(this.view.width, this.view.height, this.world);
    this.camera.snapTo(this.player);
    this.mouse = new Mouse(canvas, this.camera);

    // DISPARO AUTOMATICO. Vale en ordenador y en movil: aprieta el raton
    // por ti cuando tienes a alguien en la mira (ver systems/autoFire.js).
    this.autoFire = new AutoFire(this);
    // El truco del teclado (J-U-L-I). No hay boton en ninguna parte.
    this.autoFire.escucharSecreto();

    // --- Sistemas de partida (se rellenan en startMatch) ---
    this.inventory = null;
    this.combat = null;
    this.loot = null;
    this.chests = null;
    this.buildings = null;
    this.harvest = null;
    this.build = null;
    /** Misiones: lo crea attachProfile() desde main.js. */
    this.missions = null;
    /** Contador de experiencia de la partida (tambien de attachProfile). */
    this.xp = null;

    /**
     * MINIJUEGO en marcha, o null si se esta en el battle royale.
     * Los modos concretos se van registrando en systems/minigames/.
     */
    this.minigame = null;
    /** Salir de un minijuego (lo engancha main.js). */
    this.onExitToMinigames = null;

    /**
     * MODO en el que se juega la partida (ver data/modes.js). Lo fija
     * startMatch(); mientras no haya partida vale el de por defecto.
     */
    this.mode = DEFAULT_MODE;
    this.modeDef = modeById(DEFAULT_MODE);
    /** Nivel Blitz de la partida, o null si el modo no lo usa. */
    this.blitz = null;
    this.match = null;
    this.particles = new Particles();
    this.bullets = new BulletSystem(this.particles);
    this.targets = [];
    /** Peces de los lagos y canales. */
    this.fish = [];

    // --- Estado del juego ---
    this.state = 'menu';    // 'menu' | 'playing'
    this.loadout = null;
    this.onExitToMenu = null;
    this.message = null;    // { text, rarity, life }
    this.zoneLabel = null;  // { name, life } rotulo del sitio con nombre
    this.currentZone = null;

    // Paseo automatico de camara mientras estamos en el menu
    this.menuPanX = 0;
    this.menuPanDir = 1;
    /** Mapa desplegado con la tecla M. */
    this.showMap = false;

    // --- Tiempo / estadisticas ---
    this.time = 0;
    this.accumulator = 0;
    this.lastTs = 0;
    this.running = false;
    this.stats = { fps: 0, _frames: 0, _acc: 0 };

    this._loop = this._loop.bind(this);
  }

  /** Arranca el bucle de render (el estado inicial es el menu). */
  start() {
    this.running = true;
    this.lastTs = performance.now();
    requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    this.input.detach();
    this.mouse.detach();
  }

  /* =============================================================
     CAMBIOS DE ESTADO
     ============================================================= */

  /**
   * Empieza una partida con el equipamiento elegido en el menu.
   *
   * @param {{skin: object, pickaxe: object, glider: object}} loadout
   * @param {string} [mode]  id del modo (ver data/modes.js). Por
   *   defecto 'royale', que es el battle royale de siempre.
   */
  startMatch(loadout, mode = DEFAULT_MODE) {
    // Modos que no son un battle royale y montan su propio escenario
    // (JULEN DEFENSA). Se lanzan con el montaje de minijuegos, pero
    // recordando el modo: al acabar cuentan como partida.
    const lanzar = modeById(mode).rules?.launch;
    if (lanzar) {
      this.modeDef = modeById(mode);
      this.mode = this.modeDef.id;
      return this.startMinigame(lanzar, loadout);
    }

    // El aviso de la partida anterior fuera, ANTES de montar nada: los
    // sistemas ponen los suyos durante el montaje (ver _afterSetup).
    this.message = null;
    this.minigame = null;
    this.minigameDef = null;

    // El modo elegido se guarda ANTES de montar nada: los sistemas
    // consultan `this.modeDef` para saber con que reglas jugar.
    this.modeDef = modeById(mode);
    this.mode = this.modeDef.id;

    const reglas = this.modeDef.rules;
    // El tramo jugable, ya en pixeles. null = la isla entera.
    const bounds = this._boundsOf(reglas);

    // QUE ARMAS ENTRAN EN ESTA PARTIDA. Va lo primero, antes de sembrar
    // botin o crear bots: todos los sorteos de arma leen de aqui.
    setWeaponPool(this.mode);

    this._setupSystems(loadout, {
      supply: true,
      bounds,
      chests: reglas.chests ?? true,
      worldLoot: reglas.worldLoot ?? true,
      buildingLoot: reglas.buildingLoot ?? 1,
      build: reglas.build,
    });
    this._wireMissions();

    // start() reparte a los participantes por el tramo y coloca al jugador.
    this.match.start(Math.random, { ...reglas, bounds });

    // IGUALDAD AL EMPEZAR: si el modo impone un arma, el jugador la
    // recibe igual que los bots, con municion de sobra para usarla.
    if (this.match.startWeapon) this._darArmaDeSalida(this.match.startWeapon);

    // ABATIDOS: solo tiene sentido con companeros. En individual se
    // queda apagado y morir sigue siendo morir.
    this.revive.reset((reglas.teamSize || 1) > 1);

    // REAPARICION. Solo el modo que la pide (Julen Recarga); en los
    // demas se queda apagada y morir sigue siendo morir.
    this.reload.player = this.player;
    this.reload.reset(reglas.respawn, {
      zone: this.match.zone,
      // Todos los participantes, vivos y caidos: es con los caidos con
      // los que trabaja este sistema.
      todos: [this.player, ...this.match.bots],
    });
    // El marcador y el final de partida tienen que saber que un caido
    // con cuenta atras sigue dentro.
    this.match.respawn = reglas.respawn ? this.reload : null;
    // (reset() ya deja a todos sin cuenta atras de la partida anterior)

    // SUPPLY DROPS: caen dentro de la zona segura, asi que necesitan
    // conocerla. Y cada modo marca su ritmo (el Blitz, mas seguido).
    this.supply.zone = this.match.zone;
    this.supply.reset({
      bounds,
      first: reglas.supply?.first,
      every: reglas.supply?.every,
    });

    // NIVEL BLITZ, potenciadores y cofres dorados. Solo si el modo lo
    // pide: en el royale este sistema ni se crea.
    this._setupBlitz(reglas);

    // HORA Y CLIMA de esta partida: los dos al azar, y el reloj sigue
    // corriendo mientras juegas.
    this.ambience.reset(Math.random, { enabled: true });
    // Si el modo ya ha puesto su aviso (el de JULEN BLITZ), la hora se
    // le anade detras en vez de pisarlo: solo hay un hueco de aviso y
    // los dos tienen que verse.
    if (this.message) {
      this.showMessage(`${this.message.text} · ${this.ambience.descripcion}`, this.message.rarity);
    } else {
      this.showMessage(this.ambience.descripcion, 'rare');
    }

    // Ya sabemos donde ha caido: ahora si se centra la camara.
    this.camera.snapTo(this.player);

    this._afterSetup();
  }

  /**
   * Monta (o desmonta) el sistema de nivel Blitz segun el modo.
   *
   * Se llama DESPUES de match.start() porque necesita la zona segura ya
   * creada: la XP por sobrevivir depende de si la tormenta esta
   * cerrandose o no.
   */
  _setupBlitz(reglas) {
    if (!reglas.blitz) {
      this.blitz = null;
      return;
    }

    this.blitz = new BlitzManager({
      player: this.player,
      inventory: this.inventory,
      particles: this.particles,
      zone: this.match.zone,
      // Para saber donde tiene que posarse la caja que cae del cielo,
      // y por donde sale el arma cuando se abre.
      world: this.world,
      loot: this.loot,
    });
    this.blitz.onMessage = (text, rarity) => this.showMessage(text, rarity);

    // Una parte de los cofres pasan a ser DORADOS.
    const dorados = this.chests.makeGolden(GOLDEN_CHEST_SHARE);
    this.chests.onGolden = () => this.blitz.onGoldenChest();

    this.showMessage(
      `JULEN BLITZ · misma arma para todos · ${dorados} cofres dorados`,
      'mythic'
    );
  }

  /**
   * Traduce el `arena` de un modo (ids de zona) a pixeles.
   * @returns {{x0:number, x1:number}|null}
   */
  _boundsOf(reglas) {
    if (!reglas?.arena) return null;
    const desde = zoneById(reglas.arena.from);
    const hasta = zoneById(reglas.arena.to);
    if (!desde || !hasta) return null;
    return { x0: desde.x0, x1: hasta.x1 };
  }

  /**
   * GRIETA PORTATIL: te sube al cielo con la paravela lista.
   *
   * No hay nada nuevo que programar para volar: se reutiliza tal cual
   * el sistema del bus. Con `flight = 'cayendo'` el jugador cae, elige
   * donde ir, abre la paravela con Espacio (o sola al acercarse al
   * suelo) y aterriza. Lo unico que hace falta es ponerlo arriba.
   *
   * La partida NO vuelve a la fase de bus: `match.phase` ya esta en
   * 'jugando', asi que la tormenta sigue cerrandose mientras vuelas y
   * el aviso de aterrizaje no se repite.
   */
  _abrirGrieta() {
    const p = this.player;
    const cx = p.x + p.w / 2;

    // Efecto en el sitio del que desapareces, para que se vea por donde
    // te has ido (y lo vean los demas).
    this.particles.spark(cx, p.y + p.h / 2, '#b45cf0', 26, 420);
    this.particles.puff(cx, p.y + p.h / 2, 'rgba(180, 130, 255, 0.55)', 9);

    p.vx = 0;
    p.vy = 0;
    p.y = CONFIG.bus.altitude + 40;
    p.flight = 'cayendo';
    p.buildMode = false;
    p.crouching = false;
    p.h = CONFIG.player.height;

    // Al volante o en una tirolina no se puede: hay que soltarse antes.
    this.vehicles?.forceExit(p);
    this.mobility?.forceRelease(p);

    this.particles.spark(cx, p.y + p.h, '#b45cf0', 20, 360);
    this.showMessage(`¡Grieta abierta! Cae y abre la paravela con ${control('jump')}`, 'epic');
  }

  /**
   * Le da al jugador el arma con la que empiezan todos, y municion.
   * Se mete en la ranura 2 (la primera libre) y se deja equipada, para
   * que al aterrizar ya se pueda disparar sin tocar nada.
   */
  _darArmaDeSalida(arma) {
    const copia = makeWeapon(arma.def, arma.rarity);
    const res = this.inventory.add(copia);
    if (res.ok) this.inventory.select(res.slot);
    this.player.addAmmo(copia.def.ammo, BLITZ_START_AMMO);
  }

  /**
   * Monta TODOS los sistemas de juego desde cero. Lo comparten la partida
   * normal y los minijuegos: un minijuego dice con `opts` que partes del
   * mundo quiere (botin suelto, cofres, edificios, dianas, peces) y el
   * resto es identico, para no tener dos caminos distintos que mantener.
   *
   * @param {object} loadout
   * @param {object} opts { worldLoot, chests, buildings, targets, fish }
   */
  _setupSystems(loadout, opts = {}) {
    const o = {
      worldLoot: true, chests: true, buildings: true, targets: true, fish: true,
      vehicles: true, mobility: true,
      // Tramo jugable (modos de mapa reducido) y si se puede construir.
      bounds: null, build: true, buildingLoot: 1,
      // Cajas de suministros. Los minijuegos NO las piden: una caja
      // cayendo en mitad de la carrera de obstaculos no viene a cuento.
      supply: false,
      ...opts,
    };

    /** Tramo del mapa en el que se juega, o null si es la isla entera. */
    this.bounds = o.bounds;

    this.loadout = loadout;
    this.state = 'playing';

    // El jugador vuelve a su estado inicial. Su POSICION la decide luego
    // el reparto de la partida (match.start), asi que la camara se centra
    // despues, no aqui.
    this.player.reset();

    // --- Sistemas de partida, de cero cada vez ---
    this.particles.clear();
    this.bullets.clear();
    // Nadie hereda el aviso de impacto de un modo anterior.
    this.bullets.onImpact = null;

    // La ranura 1 lleva el pico con el aspecto elegido en la taquilla.
    this.inventory = new Inventory(loadout.pickaxe);

    this.targets = o.targets ? spawnTargets(this.world) : [];
    this.fish = o.fish ? spawnFish(this.world) : [];
    for (const t of this.targets) {
      t.onDamage = (amount, x, y) => this.particles.damageNumber(x, y, amount, '#ffd23f');
    }

    // Tala de arboles: hay que crearla antes que el combate, porque el
    // pico la usa para picar.
    this.harvest = new HarvestManager({ world: this.world, particles: this.particles });
    this.harvest.reset();
    this.harvest.enabled = o.build !== false;

    // Construccion: tambien antes que el combate, porque el pico
    // rompe estructuras ademas de talar arboles.
    this.build = new BuildManager({ world: this.world, particles: this.particles });
    this.build.reset();
    // Modos sin construccion (Julen Blitz): se apaga aqui y ya no puede
    // construir nadie, ni el jugador ni los bots.
    this.build.enabled = o.build !== false;
    this.build.onMessage = (text, rarity) => this.showMessage(text, rarity);

    // Granadas: van antes del combate, que es quien las lanza.
    this.throwables = new ThrowableManager({
      world: this.world,
      particles: this.particles,
      build: this.build,
    });
    this.throwables.reset();

    // Torretas y trampas: tambien antes del combate, que es quien las
    // coloca. Disparan con las balas normales del juego.
    this.gadgets = new GadgetManager({
      world: this.world,
      particles: this.particles,
      bullets: this.bullets,
    });
    this.gadgets.reset();
    this.gadgets.onMessage = (text, rarity) => this.showMessage(text, rarity);

    this.combat = new Combat({
      player: this.player,
      inventory: this.inventory,
      bullets: this.bullets,
      particles: this.particles,
      world: this.world,
      harvest: this.harvest,
      build: this.build,
      throwables: this.throwables,
      gadgets: this.gadgets,
    });
    this.combat.onMessage = (text) => this.showMessage(text);
    // La Grieta Portatil no dispara: abre una grieta y te sube al cielo.
    this.combat.onEffect = (efecto) => { if (efecto === 'rift') this._abrirGrieta(); };

    this.loot = new LootManager({
      world: this.world,
      inventory: this.inventory,
      particles: this.particles,
    });
    this.loot.onMessage = (text, rarity) => this.showMessage(text, rarity);
    if (o.worldLoot) {
      // Un modo puede pedir un numero concreto (`worldLoot: 26`) o
      // simplemente decir que si (`true`), y entonces vale el de CONFIG.
      const cuantos = typeof o.worldLoot === 'number'
        ? o.worldLoot : CONFIG.combat.worldLootCount;
      this.loot.spawnInitial(cuantos, Math.random, o.bounds);
    }

    this.chests = new ChestManager({
      world: this.world,
      particles: this.particles,
      loot: this.loot,
    });
    this.chests.onMessage = (text, rarity) => this.showMessage(text, rarity);
    if (o.chests) {
      const cuantos = typeof o.chests === 'number' ? o.chests : CONFIG.chests.count;
      this.chests.spawnInitial(cuantos, Math.random, o.bounds);
    }

    // Los edificios se levantan DESPUES del botin y los cofres sueltos,
    // porque anaden los suyos propios dentro.
    this.buildings = new BuildingManager({
      world: this.world,
      particles: this.particles,
      loot: this.loot,
      chests: this.chests,
    });
    this.buildings.onMessage = (text, rarity) => this.showMessage(text, rarity);
    // build() limpia lo anterior antes de levantar lo nuevo; si este modo
    // no quiere edificios, hay que limpiarlo igualmente.
    if (o.buildings) this.buildings.build(Math.random, o.bounds, o.buildingLoot);
    else this.buildings.clear();

    // --- Vehiculos repartidos por el mapa ---
    this.vehicles = new VehicleManager({ world: this.world, particles: this.particles });
    this.vehicles.onMessage = (text, rarity) => this.showMessage(text, rarity);
    if (o.vehicles) this.vehicles.spawn(o.bounds);

    // --- Tirolinas y saltadores ---
    this.mobility = new MobilityManager({ world: this.world, particles: this.particles });
    this.mobility.onMessage = (text, rarity) => this.showMessage(text, rarity);
    if (o.mobility) this.mobility.build(o.bounds);
    else { this.mobility.ziplines.length = 0; this.mobility.pads.length = 0; }

    // --- Emotes ---
    // El perfil dice cuales tiene desbloqueados y cuales lleva en la rueda.
    this.emotes = new EmoteManager({ player: this.player, profile: this.profile });
    this.emotes.reset();
    this.emotes.onMessage = (text, rarity) => this.showMessage(text, rarity);

    // --- Abatidos y reanimacion ---
    // Va antes de la partida porque los bots aliados lo consultan para
    // decidir si van a levantar a alguien.
    this.revive = new ReviveManager({ particles: this.particles });
    this.revive.onMessage = (text, rarity) => this.showMessage(text, rarity);

    // REAPARICION DE ESCUADRON (solo la usa el Julen Recarga).
    this.reload = new ReloadManager({ world: this.world, particles: this.particles });
    this.reload.onMessage = (text, rarity) => this.showMessage(text, rarity);

    // --- Supply drops ---
    // Va despues del botin (ahi suelta lo suyo) y antes de la partida,
    // porque los bots lo consultan para decidir a donde van.
    this.supply = new SupplyDropManager({
      world: this.world,
      particles: this.particles,
      loot: this.loot,
    });
    this.supply.onMessage = (text, rarity) => this.showMessage(text, rarity);
    // Con `enabled` en false el gestor existe pero no suelta nada: asi
    // dibujar y actualizar no tienen que preguntar si hay modo o no.
    this.supply.enabled = o.supply !== false;
    this.supply.reset();

    // --- Los bots ---
    this.match = new MatchManager({
      world: this.world,
      player: this.player,
      loot: this.loot,
      bullets: this.bullets,
      particles: this.particles,
      harvest: this.harvest,
      build: this.build,
      supply: this.supply,
      revive: this.revive,
    });
    this.match.onMessage = (text, rarity) => this.showMessage(text, rarity);

  }

  /**
   * Engancha los avisos de cada sistema con las MISIONES.
   * Solo lo llama la partida normal: en los minijuegos no se progresa,
   * son para entrenar.
   */
  _wireMissions() {
    this.missions?.startMatch();
    this.xp?.reset();
    this._buildingsVisited = new Set();
    this._top5Reported = false;

    this.match.onKill = () => {
      playKill();
      this._mission(EVENTS.KILL);
      this._xp('KILL');
      // Y, en el Julen Blitz, XP de nivel Blitz y robo de vida.
      this.blitz?.onKill();
    };
    this.match.onLanded = () => {
      const zona = zoneAt(this.player.x + this.player.w / 2);
      this._mission(EVENTS.LAND, 1, { zone: zona?.id });
    };
    this.chests.onOpened = (chest, quien) => {
      this._mission(EVENTS.CHEST);
      this._xp('CHEST');
      // JULEN RECARGA: saquear acorta la espera de tus caidos.
      this.reload.bonus(quien || this.player, 'chest');
    };
    // Un supply drop cuenta como cofre para las misiones y la XP: es lo
    // mismo, pero mejor y peleado.
    this.supply.onOpened = (drop, quien) => {
      // Un supply drop vale mas que un cofre porque hay que pelearlo:
      // esto si cuenta para todos, tambien para los escuadrones de bots.
      this.reload.bonus(quien, 'supply');

      if (quien !== this.player) return;    // los bots no dan XP a nadie
      this._mission(EVENTS.CHEST);
      this._xp('CHEST');
    };

    // JULEN RECARGA: cada baja recorta la espera de los companeros del
    // que la consigue, sea el jugador o un bot.
    this.match.onAnyKill = (asesino) => this.reload.bonus(asesino, 'kill');
    // El dano suma XP por cada 100 acumulados, no bala a bala.
    this._danoAcumulado = 0;
    const anotarDano = (dano) => {
      this._mission(EVENTS.DAMAGE, Math.round(dano));
      this._danoAcumulado += dano;
      while (this._danoAcumulado >= 100) {
        this._danoAcumulado -= 100;
        this._xp('DAMAGE_100');
      }
    };
    this.bullets.onDamage = (dano, owner) => {
      if (owner === this.player) anotarDano(dano);
    };
    // El dano de las granadas cuenta igual que el de las balas.
    this.throwables.onDamage = (dano, owner) => {
      if (owner === this.player) anotarDano(dano);
    };
    this.combat.onDamageDealt = (dano) => anotarDano(dano);
    this.combat.onWood = (cantidad) => {
      this._mission(EVENTS.WOOD, cantidad);
      this._mission(EVENTS.TREE);          // la madera solo llega al talar un arbol entero
      this._xp('TREE');
    };
    this.build.onPlaced = (pieza, owner) => {
      if (owner === this.player) this._mission(EVENTS.BUILD);
    };
    this.build.onBroken = (pieza, quien) => {
      if (quien === this.player) this._mission(EVENTS.BREAK);
    };
  }

  /** Lo ultimo de arrancar: HUD limpio y controles a la escucha. */
  _afterSetup() {
    // El pico golpea a bots y dianas: se recalcula cada frame en update().
    this.combat.targets = this.targets;

    // El respiro de la pantalla de fin empieza de cero en cada partida.
    this._finDesde = null;
    this._finConClic = false;

    // OJO: aqui NO se borra `this.message`. Antes si, y como esto va lo
    // ultimo del arranque, se comia los avisos que la propia partida
    // acababa de poner: el de la hora y el clima ("Noche cerrada") y el
    // de JULEN BLITZ no llegaban a verse nunca. Se borra al PRINCIPIO de
    // startMatch y startMinigame, antes de que nadie ponga nada.
    this.zoneLabel = null;
    this.currentZone = null;
    this.showMap = false;

    // El teclado y el raton solo se escuchan durante la partida.
    this.input.attach();
    this.mouse.attach();
    // Se oculta el cursor del navegador: la punteria la marca la mira.
    this.canvas.style.cursor = 'none';
  }

  /**
   * Termina la partida y vuelve al menu.
   * @returns {{played: boolean}} resumen para que main.js de la recompensa
   */
  endMatch(datos = null) {
    // `datos` lo pasan los modos que no son un battle royale (JULEN
    // DEFENSA) para decir como ha ido: sin el, se lee de la partida.
    const jugada = this.state === 'playing';
    this.vehicles?.forceExit(this.player);
    this.mobility?.forceRelease(this.player);
    const resultado = datos?.result ?? this.match?.result ?? 'jugando';
    // La partida cuenta para las misiones de constancia, y el resultado
    // para las de victoria. Se reporta ANTES de armar el resumen: si no,
    // la mision de ganar no saldria en el aviso del menu.
    if (jugada) {
      this._mission(EVENTS.MATCH);
      this._xp('MATCH');
      if (resultado === 'victoria') {
        this._mission(EVENTS.WIN);
        this._xp('WIN');
      }
    }

    // La XP se entrega de golpe al acabar: subir de nivel a mitad de
    // partida seria un lio, y asi el resumen ensena el desglose.
    const xp = jugada && this.xp ? this.xp.commit() : null;

    // ESTADISTICAS Y RACHA. Se apuntan aqui, en un solo sitio, para que
    // cuenten igual salgas por Escape o te eliminen.
    const stats = jugada && this.profile
      ? this.profile.recordMatch({
          won: resultado === 'victoria',
          kills: datos?.kills ?? this.match?.kills ?? 0,
          placement: datos?.placement ?? this.match?.placement ?? null,
        })
      : null;

    const resumen = {
      played: jugada,
      result: resultado,
      stats,
      streak: this.profile?.streak ?? 0,
      kills: datos?.kills ?? this.match?.kills ?? 0,
      placement: datos?.placement ?? this.match?.placement ?? null,
      killerName: datos ? null : (this.match?.killerName ?? null),
      // Oleadas aguantadas (solo JULEN DEFENSA): dan pavos extra.
      waves: datos?.waves ?? 0,
      missions: this.missions ? [...this.missions.completedThisMatch] : [],
      xp,
    };
    this.enterMenu();
    return resumen;
  }

  /* =============================================================
     MINIJUEGOS
     ============================================================= */

  /**
   * Arranca un minijuego por su id.
   *
   * Un minijuego NO es un modo aparte: usa los mismos sistemas que la
   * partida normal (movimiento, raton, armas, construccion). Lo unico
   * que cambia es que se monta un escenario distinto y hay una condicion
   * de fin propia.
   *
   * @param {string} id       id de data/minigames.js
   * @param {object} loadout  lo equipado en la taquilla
   */
  /**
   * @param {string} id       id de data/minigames.js, con nivel opcional
   *                          ('parkour:dificil')
   * @param {object} loadout
   */
  startMinigame(id, loadout) {
    this.message = null;   // idem: antes de montar, no despues
    // Un minijuego no es un modo: nada de nivel Blitz aqui.
    this.blitz = null;

    const [base, nivel] = String(id).split(':');
    const def = minigameById(base);
    const Modo = modeFor(base);

    if (!def || !def.ready || !Modo) {
      // Todavia no implementado: se vuelve por donde se vino en vez de
      // dejar la pantalla en negro.
      this.onExitToMinigames?.();
      return false;
    }

    // Si venia otro modo en marcha, que recoja lo suyo del mundo.
    this.minigame?.teardown?.();

    this.minigameDef = def;
    this.minigameId = id;
    this.minigame = new Modo(this, nivel);

    // El modo dice que partes del mundo quiere; el montaje es el mismo
    // que el de la partida normal.
    this._setupSystems(loadout, this.minigame.systems);

    // Arena: mismo mundo, pero sin bus ni tormenta.
    this.match.startArena(this.minigame.arena);

    // Los minijuegos van siempre de dia: son de entrenar, no de ambiente.
    this.ambience.reset(Math.random, { enabled: false });

    this.minigame.setup();
    this._afterSetup();
    return true;
  }

  /** Los dos botones de la pantalla de fin de un minijuego. */
  _updateMinigameEnd() {
    // Durante la partida el cursor esta oculto (la mira hace de puntero);
    // aqui hace falta verlo para poder pulsar los botones.
    this.canvas.style.cursor = 'default';

    // El respiro: se apunta cuando aparecio la pantalla y si se llego
    // con el boton ya apretado (ver ESPERA_FIN).
    const mg = this.minigame;
    if (mg._finDesde == null) {
      mg._finDesde = this.time;
      mg._finConClic = this.mouse.left;
    }
    if (mg._finConClic && !this.mouse.left) mg._finConClic = false;
    if (mg._finConClic || this.time - mg._finDesde < ESPERA_FIN) return;

    const view = { width: this.canvas.width, height: this.canvas.height };
    const botones = endButtons(view);
    const mx = this.mouse.screenX;
    const my = this.mouse.screenY;

    if (!this.mouse.leftPressed) return;

    if (hits(botones.retry, mx, my)) {
      // Un modo que cuenta como partida cobra antes de volver a empezar.
      if (this.minigame.countsAsMatch) {
        this.onRetryCounted?.();
        return;
      }
      // Otra vez, con lo mismo equipado. startMinigame ya llama al
      // teardown del modo anterior antes de montar el nuevo.
      // Se reintenta el MISMO nivel, no el modo a secas.
      const id = this.minigameId || this.minigameDef.id;
      const loadout = this.loadout;
      this.startMinigame(id, loadout);
      return;
    }

    if (hits(botones.exit, mx, my)) {
      // Salir de un modo que cuenta como partida es salir de una partida.
      if (this.minigame.countsAsMatch) this.onExitToMenu?.();
      else this.onExitToMinigames?.();
    }
  }

  /**
   * Termina un modo que CUENTA COMO PARTIDA (JULEN DEFENSA) y lo paga
   * como una: misiones, XP, pase y estadisticas, por el mismo camino
   * que el battle royale.
   * @returns el mismo resumen que endMatch
   */
  endCountedMinigame() {
    const datos = this.minigame?.matchSummary?.() || {};
    this.vehicles?.forceExit(this.player);
    this.mobility?.forceRelease(this.player);
    this.minigame?.teardown?.();
    this.minigame = null;
    this.minigameDef = null;
    return this.endMatch(datos);
  }

  /** Termina el minijuego en curso y vuelve al modo menu. */
  endMinigame() {
    this.vehicles?.forceExit(this.player);
    this.mobility?.forceRelease(this.player);
    this.minigame?.teardown?.();
    this.minigame = null;
    this.minigameDef = null;
    this.enterMenu();
  }

  /**
   * Engancha el perfil del jugador. De momento solo lo necesitan las
   * MISIONES, que guardan ahi su progreso y pagan sus recompensas.
   */
  attachProfile(profile) {
    this.profile = profile;
    this.xp = new XpTracker({ profile });

    this.missions = new MissionManager({ profile });
    this.missions.onComplete = (m) => {
      // Cumplir una mision tambien da experiencia.
      this.xp.add('MISSION');
      this.showMessage(
        `Mision cumplida: ${m.name} · +${m.reward} pavos · +${XP.MISSION} XP`, 'legendary');
    };
  }

  /** Atajo para apuntar experiencia. */
  _xp(motivo, cuantas = 1) {
    this.xp?.add(motivo, cuantas);
  }

  /** Atajo corto para reportar sucesos a las misiones. */
  _mission(event, amount = 1, extra = {}) {
    this.missions?.report(event, amount, extra);
  }

  /** Vuelve al modo menu (el escenario sigue de fondo). */
  enterMenu() {
    this.state = 'menu';
    this.input.detach();
    this.mouse.detach();
    this.canvas.style.cursor = 'default';
    this.message = null;
    // El paseo arranca donde este la camara ahora mismo.
    this.menuPanX = this.camera.x;
  }

  /** Aviso breve en la parte superior de la pantalla. */
  showMessage(text, rarity = null) {
    this.message = { text, rarity, life: MESSAGE_TIME };
  }

  /**
   * Detecta cuando el jugador entra en uno de los 10 sitios con nombre
   * y ensena el rotulo un par de segundos.
   */
  _updateZone(dt) {
    if (this.zoneLabel) {
      this.zoneLabel.life -= dt;
      if (this.zoneLabel.life <= 0) this.zoneLabel = null;
    }

    const zona = zoneAt(this.player.x + this.player.w / 2);
    if (zona !== this.currentZone) {
      this.currentZone = zona;
      if (zona) this.zoneLabel = { name: zona.name, life: 2.6 };
    }
  }

  /* =============================================================
     BUCLE PRINCIPAL
     ============================================================= */
  _loop(ts) {
    if (!this.running) return;

    let frameDt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    if (frameDt > 0.25) frameDt = 0.25;

    this._updateFps(frameDt);
    // Lo guarda para el dibujo, que va con el delta real (la lluvia).
    this.frameDt = frameDt;

    // CONTROLES TACTILES (ui/touchControls.js): colocan la mira y aprietan
    // botones virtuales ANTES de que el juego lea el raton y el teclado.
    // En ordenador no hay nada enganchado aqui.
    this.onFrame?.(frameDt);

    // La mira debe leerse con la camara del frame anterior ya aplicada.
    if (this.state === 'playing') this.mouse.syncWorld();

    // --- Fisica con paso fijo ---
    this.accumulator += frameDt;
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS) {
      this.update(FIXED_DT);
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_STEPS) this.accumulator = 0;

    // --- Camara y render usan el delta real (movimiento suave) ---
    if (this.state === 'playing') {
      // En el bus se sube el encuadre para que se vea el autobus entero.
      this.camera.offsetBias = this.player.flight === 'bus' ? -150 : 0;
      this.camera.update(frameDt, this.player);
    }
    else this._updateMenuCamera(frameDt);

    // La musica se programa por adelantado, asi que va aqui: una vez
    // por frame real, no una por paso de fisica.
    updateMusic();

    this.render();

    requestAnimationFrame(this._loop);
  }

  _updateFps(dt) {
    this.stats._frames++;
    this.stats._acc += dt;
    if (this.stats._acc >= 0.5) {
      this.stats.fps = Math.round(this.stats._frames / this.stats._acc);
      this.stats._frames = 0;
      this.stats._acc = 0;
    }
  }

  /* =============================================================
     UPDATE
     ============================================================= */
  /**
   * Sonido ambiental: dice al modulo de audio donde esta el oyente y
   * cuanto se tiene que oir la tormenta.
   */
  _ambiente() {
    setListener(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);

    if (this.state !== 'playing') { stopStorm(); playMusic('menu'); return; }

    // Los minijuegos van con la musica de partida y sin tormenta, salvo
    // que el modo pida la suya (JULEN DEFENSA: calma de dia, tension y
    // viento de tormenta de noche).
    if (this.minigame) {
      playMusic(this.minigame.musicTrack?.() || 'partida');
      const viento = this.minigame.stormLevel?.() || 0;
      if (viento > 0) setStormLevel(viento);
      else stopStorm();
      return;
    }
    const zona = this.match?.zone;
    if (!zona) { stopStorm(); return; }

    // --- Que musica toca ---
    // Con pocos supervivientes (o ya fuera de la zona al final) entra
    // la pista de tension; al acabar la partida, se calla.
    if (this.match.result !== 'jugando') playMusic(null);
    else if (this.match.aliveCount <= 8) playMusic('tension');
    else playMusic('partida');

    // Fuera de la zona se oye entera; dentro, un rumor si la pared
    // esta cerca, para que se note que se acerca sin agobiar.
    const cx = this.player.x + this.player.w / 2;
    const dentro = zona.contains(cx);
    if (dentro) {
      const borde = Math.min(Math.abs(cx - zona.minX), Math.abs(cx - zona.maxX));
      setStormLevel(borde < 700 ? 0.25 * (1 - borde / 700) : 0);
    } else {
      setStormLevel(1);
    }
  }

  update(dt) {
    this.time += dt;
    this._ambiente();
    this.ambience.update(dt);

    // En el menu no se simula nada: ni teclado ni raton estan enganchados.
    if (this.state !== 'playing') return;

    // --- Teclas de sistema ---
    if (this.input.consume('debug')) {
      CONFIG.debug.showHitboxes = !CONFIG.debug.showHitboxes;
    }
    if (this.input.consume('map')) {
      this.showMap = !this.showMap;
    }
    // La O solo vale si ya se ha descubierto el truco; si no, ni se entera.
    if (this.input.consume('autoFire') && this.autoFire.desbloqueado) {
      this.autoFire.avisar(this.autoFire.toggle());
    }
    if (this.input.consume('toggleHelp')) {
      document.getElementById('controls-help')?.classList.toggle('hidden');
    }
    if (this.input.consume('menu')) {
      this.onExitToMenu?.();
      this.input.update();
      return;
    }

    // Si te eliminan conduciendo, te bajas: si no, el jugador se queda
    // pegado al asiento y el vehiculo lo arrastra ya muerto.
    if (this.player.driving && !this.player.alive) this.vehicles.forceExit(this.player);
    if (!this.player.alive) this.mobility.forceRelease(this.player);

    // Minijuego terminado: se congela y se espera a que se elija entre
    // reintentar o salir en su pantalla de fin.
    if (this.minigame && this.minigame.state === 'fin') {
      // Lo unico que sigue vivo aqui: si el modo quiere hacer algo en
      // la pantalla de resultado (la carrera monta otro circuito sola).
      this.minigame.endStep(dt);
      this._updateMinigameEnd();
      this.input.update();
      this.mouse.update();
      return;
    }

    // Con el jugador eliminado (o ganada la partida) solo queda mirar:
    // se congela la accion y se espera a que vuelva al menu.
    if (this.match.result !== 'jugando') {
      // Mismo respiro que en los modos: el tiro con el que ganaste no
      // vale como "volver al menu".
      if (this._finDesde == null) {
        this._finDesde = this.time;
        this._finConClic = this.mouse.left;
      }
      if (this._finConClic && !this.mouse.left) this._finConClic = false;
      const listo = !this._finConClic && this.time - this._finDesde >= ESPERA_FIN;
      if (listo && this.mouse.leftPressed) this.onExitToMenu?.();
      this.input.update();
      this.mouse.update();
      return;
    }

    // Mientras se cae del bus no se dispara ni se toca el inventario:
    // solo se elige donde aterrizar.
    const volando = !!this.player.flight;

    if (!volando) this._updateInventoryKeys();

    // --- Simulacion ---
    // CAIDO ESPERANDO A VOLVER (Julen Recarga): la partida sigue
    // corriendo a tu alrededor, pero tu no controlas nada hasta que
    // termina la cuenta atras.
    const esperando = this.reload.isPending(this.player) || !!this.minigame?.freezePlayer;
    // El modo puede pedir que el clic sea suyo (la tienda de JULEN
    // DEFENSA abierta, o colocando una torre): se anda, pero no se
    // dispara, ni se construye, ni se baila, ni se recoge.
    const bloqueado = esperando || !!this.minigame?.blocksActions;
    this.player.update(dt, esperando ? INPUT_QUIETO : this.input);

    // EMOTES. Van los primeros porque mandan sobre todo lo demas: con la
    // rueda abierta o bailando no se dispara, no se construye y no se
    // anda, y asi no hay que comprobarlo en cada sistema por separado.
    // Disparo automatico: aprieta el raton ANTES de que lo lea el combate.
    if (!volando && !bloqueado) this.autoFire.update(dt);

    if (!volando && !bloqueado) this.emotes.update(dt, this.input, this.mouse);
    const bailando = this.emotes.wheelOpen || this.emotes.active;

    // La construccion va ANTES del combate: en modo construccion el clic
    // izquierdo coloca piezas en lugar de disparar.
    // Tirado en el suelo no se construye ni se conduce.
    const abatido = this.player.downed;
    const conduciendo = !!this.player.driving;
    if (abatido) this.player.buildMode = false;

    if (!volando && !conduciendo && !abatido && !bailando && !bloqueado) {
      this.build.update(dt, this.player, this.input, this.mouse);
    } else {
      this.player.buildMode = false;   // ni en el aire, ni al volante, ni abatido
    }

    if (!volando && !conduciendo && !bailando && !bloqueado) this.combat.update(dt, this.mouse);

    // Abatidos: desangrado, y la E mantenida para levantar companeros.
    // Va ANTES de los cofres y del botin, que consumen la E de un toque.
    this.revive.update(dt, this.player, this.match.entities, this.input);

    // Nivel Blitz: XP por aguantar dentro de la tormenta.
    this.blitz?.update(dt);

    // Los bots (fisica + IA) y sus disparos.
    this.match.update(dt);

    // Las balas pueden golpear al jugador, a los bots y a las dianas.
    // Las torretas disparan y las trampas pinchan a todo el que no sea
    // su dueno. Van ANTES que las balas, para que lo que disparen este
    // frame se mueva ya en este frame.
    this.gadgets.tick(dt);
    this.gadgets.update(dt, this.match.entities);

    const objetivos = [
      ...this.match.entities,
      ...this.targets,
      // Lo colocado tambien recibe: tiros, pico y explosiones.
      ...this.gadgets.targets,
    ];
    // Las cupulas del escudo burbuja paran las balas por los dos lados.
    this.bullets.update(dt, this.world, objetivos, this.throwables.shields);

    // Las granadas vuelan, rebotan y revientan sobre esos mismos.
    this.throwables.update(dt, objetivos);

    // REAPARICION. Va ANTES de collectDeaths a proposito: es ahi donde
    // se decide si el jugador ha perdido la partida, y para saberlo hay
    // que haber abierto ya la cuenta atras del que acaba de caer. Al
    // reves, la primera muerte daba "derrota" en el mismo frame.
    //
    // Mira a los MUERTOS, que las demas listas del juego ya han
    // descartado, asi que necesita a todos: vivos y caidos.
    this.reload.update(dt);

    // Las bajas se recuentan DESPUES de las balas: si no, un bot abatido
    // de un disparo no contaba en el marcador ni en el registro.
    this.match.collectDeaths();

    // Reparto de la tecla E, por orden de prioridad:
    // puerta de edificio -> cofre -> objeto del suelo.
    // En el aire no se recoge nada, y caido esperando a volver, tampoco.
    if (!volando && !bloqueado) {
      // Los vehiculos van primero: al volante, el resto de interacciones
      // (puertas, cofres, botin) no tienen sentido.
      this.vehicles.update(dt, this.player, this.input, this.match.bots);

      // Tirolinas y saltadores: se enganchan y se pisan solos, tanto el
      // jugador como los bots.
      this.mobility.update(dt, this.player, this.input, this.match.bots);

      if (!this.player.driving) {
        // Los bots van como cuarto parametro: son los que pueden forzar
        // una puerta que hayas cerrado.
        this.buildings.update(dt, this.player, this.input, this.match.bots);
        // Los suministros van ANTES que los cofres y que el botin del
        // suelo: estando al lado de una caja de suministros, la E abre
        // la caja, que es lo que uno espera.
        this.supply.update(dt, this.player, this.input);
        this.chests.update(dt, this.player, this.input);
        this.loot.update(dt, this.player, this.input);
      }

      // El pico golpea a lo que tenga delante: bots vivos, dianas y lo
      // que haya colocado alguien (torretas y trampas se pican igual).
      this.combat.targets = [
        ...this.match.bots.filter((b) => b.alive),
        ...this.gadgets.targets,
        ...this.targets,
      ];
    }

    // El minijuego lleva su propio reloj y su condicion de fin.
    if (this.minigame) this.minigame.update(dt);
    else this._updateMissionWatch();

    this._updateZone(dt);

    for (const t of this.targets) t.update(dt);
    this.harvest.update(dt);
    this._updateFish(dt);
    this.particles.update(dt);

    // --- Aviso en pantalla ---
    if (this.message) {
      this.message.life -= dt;
      if (this.message.life <= 0) this.message = null;
    }

    // Importante: limpia las pulsaciones de este frame al final.
    this.input.update();
    this.mouse.update();
  }

  /**
   * Cosas de las misiones que no tienen un aviso propio y hay que
   * mirarlas cada frame: en que edificio estas y si ya quedan pocos.
   */
  _updateMissionWatch() {
    if (!this.missions || !this.player.alive) return;

    // Entrar en un edificio cuenta UNA vez por edificio y partida.
    const dentro = this.buildings.buildingAt(this.player);
    if (dentro && !this._buildingsVisited.has(dentro)) {
      this._buildingsVisited.add(dentro);
      this._mission(EVENTS.BUILDING);
      this._xp('BUILDING');
    }

    // Quedar entre los 5 ultimos, estando vivo.
    if (!this._top5Reported && this.match.aliveCount <= 5) {
      this._top5Reported = true;
      this._mission(EVENTS.TOP5);
      this._xp('TOP5');
    }
  }

  /** Teclas F y 1..5 para cambiar de ranura, R para soltar. */
  _updateInventoryKeys() {
    const antes = this.inventory.selected;

    if (this.input.consume('slotPickaxe')) this.inventory.select(PICKAXE_SLOT);
    for (let i = 1; i <= 5; i++) {
      if (this.input.consume(`slot${i}`)) this.inventory.select(i);
    }

    // Cambiar de ranura corta cualquier curacion en curso.
    if (this.inventory.selected !== antes) {
      this.player.cancelAction();
      this.combat.healing = null;
      this.combat.spin = 0;
    }

    if (this.input.consume('drop')) this.loot.dropEquipped(this.player);
  }

  /**
   * Peces: nadan y, si el jugador esta en el agua, se pueden coger
   * simplemente pasando por encima.
   */
  _updateFish(dt) {
    const nadando = this.player.swimming;

    for (const f of this.fish) {
      f.update(dt);
      if (!nadando || f.caught) continue;

      const curado = f.tryCatch(this.player);
      if (curado > 0) {
        this.particles.damageNumber(f.x, f.y - 10, `+${curado}`, '#5fd14a');
        this.particles.puff(f.x, f.y, 'rgba(255,255,255,0.6)', 5);
        playPickup();
        this.showMessage(`¡${f.species.name} pescado! +${curado} de vida`, 'uncommon');
        this._mission(EVENTS.FISH);
        this._xp('FISH');
      }
    }
  }

  /** Marcador triangular que senala al jugador. */
  /**
   * TU NOMBRE encima del personaje, como el de los bots.
   *
   * Sale en verde para que se distinga de los demas de un vistazo, y
   * solo si has puesto uno: con el "Jugador" por defecto no aportaria
   * nada y taparia el escenario.
   */
  _drawPlayerName(ctx) {
    if (!this.profile?.hasName) return;
    if (this.player.flight) return;

    const nombre = this.profile.displayName;
    const cx = this.player.x + this.player.w / 2;
    const y = this.player.y - 34;

    ctx.save();
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';

    const ancho = ctx.measureText(nombre).width + 16;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.72)';
    roundRectPath(ctx, cx - ancho / 2, y - 11, ancho, 15, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(95, 209, 74, 0.8)';
    ctx.lineWidth = 1.4;
    roundRectPath(ctx, cx - ancho / 2, y - 11, ancho, 15, 4);
    ctx.stroke();

    ctx.fillStyle = '#b6f5a8';
    ctx.fillText(nombre, cx, y);
    ctx.restore();
  }

  _drawPlayerMarker(ctx) {
    if (!this.player.alive) return;

    const cx = this.player.x + this.player.w / 2;
    const y = this.player.y - 16 + Math.sin(this.time * 3.4) * 2.5;

    ctx.save();
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, y - 10);
    ctx.lineTo(cx + 8, y - 10);
    ctx.lineTo(cx, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Paseo lento de la camara de un extremo a otro de la isla mientras
   * estamos en el menu: da vidilla al fondo sin coste de simulacion.
   */
  _updateMenuCamera(dt) {
    const maxX = Math.max(0, this.world.width - this.camera.w);

    this.menuPanX += this.menuPanDir * CONFIG.camera.menuPanSpeed * dt;
    if (this.menuPanX <= 0) { this.menuPanX = 0; this.menuPanDir = 1; }
    if (this.menuPanX >= maxX) { this.menuPanX = maxX; this.menuPanDir = -1; }

    this.camera.x = this.menuPanX;
    this.camera.y = damp(this.camera.y, 700, 2.5, dt);
  }

  /* =============================================================
     RENDER
     ============================================================= */
  render() {
    const { ctx, view, camera, world } = this;
    const jugando = this.state === 'playing';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, view.width, view.height);

    // --- 1) Fondo (pantalla + parallax) ---
    // La luz del dia apaga o enciende el sol (ver world/ambience.js).
    const luz = jugando ? 1 - this.ambience.oscuridad : 1;
    drawSky(ctx, view.width, view.height, luz);
    drawHills(ctx, world, camera);
    drawClouds(ctx, world, camera, this.time);
    // Y encima de todo el fondo, el color del sitio donde estas.
    drawBiomeTint(ctx, view.width, view.height, camera.x + camera.w / 2);
    // Luna y estrellas: detras del terreno, como el sol.
    if (jugando) this.ambience.drawCielo(ctx, view, this.time);

    // --- 2) Mundo (coordenadas de mundo) ---
    ctx.save();
    camera.apply(ctx);

    // El agua va DETRAS del terreno: asi solo se ve en los canales y
    // en los huecos de los lagos, sin tapar las islas.
    drawWaterBodies(ctx, world.waterBodies, camera, this.time, false);
    drawTerrain(ctx, world, camera);

    // Decorado de cada bioma (pinos, palmeras, cactus, barriles, gruas,
    // norias...). Solo se miran las columnas que pilla la camara: con
    // 10 sitios hay mas de 2.000 props repartidos por todo el mapa.
    const [vx0, vx1] = world.viewRange(camera);
    world.forEachDecorNear(world.propGrid, vx0, vx1, (prop) => {
      if (!camera.isVisible(prop.x - 90, prop.y - 300, 180, 320)) return;
      drawProp(ctx, prop, this.time);
    });

    if (jugando) {
      // Dianas y botin por debajo del jugador
      for (const t of this.targets) {
        if (camera.isVisible(t.x - 40, t.groundY - 100, 80, 110)) t.draw(ctx, this.time);
      }
      // Los edificios van al fondo: asi, al entrar, se te ve dentro.
      // (La FACHADA se pinta luego, por delante de todo: ver mas abajo.)
      this.buildings.drawInterior(ctx, camera, this.time);
      this.vehicles.draw(ctx, camera, this.time);
      this.mobility.draw(ctx, camera, this.time);
      this.chests.draw(ctx, camera, this.time);
      this.supply.draw(ctx, camera, this.time);
      this.blitz?.draw(ctx, camera, this.time);
      this.loot.draw(ctx, camera, this.time);
      this.gadgets.draw(ctx, camera, this.time);
      this.throwables.draw(ctx, camera, this.time);
      this.match.draw(ctx, camera, this.time);
      this.match.zone.draw(ctx, camera);

      if (this.player.downed) {
        // ABATIDO: se pinta tumbado, girando el lienzo alrededor de sus
        // pies. Mismo truco que con los bots, sin dibujo aparte.
        const p = this.player;
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h);
        ctx.rotate(p.facing > 0 ? -Math.PI / 2 : Math.PI / 2);
        ctx.translate(-(p.x + p.w / 2), -(p.y + p.h));
        ctx.globalAlpha = 0.9;
        drawPlayer(ctx, p, this.time, this.loadout?.skin, {
          item: null, recoil: 0, glider: null,
        });
        ctx.restore();
      } else {
        drawPlayer(ctx, this.player, this.time, this.loadout?.skin, {
          // En el aire no se lleva nada en la mano, solo la paravela.
          item: this.player.flight ? null : this.inventory.equipped,
          recoil: this.combat.recoil,
          glider: this.loadout?.glider,
        });
      }

      // Flechita sobre tu personaje: con 50 bots por medio, y varios
      // llevando tu misma skin, hace falta saber cual eres.
      this._drawPlayerMarker(ctx);
      this._drawPlayerName(ctx);

      // Los peces van por delante del agua de fondo pero detras del velo.
      for (const f of this.fish) {
        if (camera.isVisible(f.x - 20, f.y - 20, 40, 40)) f.draw(ctx, this.time);
      }

      this.harvest.draw(ctx, camera);
      this.build.draw(ctx, camera, this.time);
      this.build.drawPreview(ctx, this.player, this.time);
      this.bullets.draw(ctx);
      this.particles.draw(ctx);

      // La FACHADA de los edificios, por DELANTE de todo lo de dentro:
      // desde fuera solo se ve la casa; al entrar se desvanece y aparecen
      // las habitaciones, las escaleras y lo que haya (o quien haya).
      this.minigame?.draw(ctx, camera, this.time);

      this.buildings.drawFacade(ctx, camera, this.time);

      this.buildings.drawPrompt(ctx);
      this.vehicles.drawPrompt(ctx);

      // Segunda pasada del agua: un velo por DELANTE, para que se vea
      // que el personaje (y los peces) estan sumergidos.
      drawWaterBodies(ctx, world.waterBodies, camera, this.time, true);
    }

    ctx.restore();

    // --- 2b) La noche y el clima, sobre el mundo ya pintado ---
    // Va DESPUES del restore y ANTES del HUD: oscurece la isla y a la
    // gente, pero nunca los numeros de la vida ni el mapa.
    if (jugando) {
      this.ambience.drawVelo(ctx, view);
      this.ambience.drawLluvia(ctx, view, this.frameDt || 0.016);
    }

    // --- 3) HUD (solo durante la partida) ---
    if (jugando) {
      drawHUD(ctx, this.player, view, this.stats, this.time, {
        healProgress: this.combat.healProgress,
        healName: this.combat.healing?.def.name,
        message: this.message,
        zoneLabel: this.zoneLabel,
        bulletCount: this.bullets.bullets.length,
        pickupCount: this.loot.pickups.length,
        chestCount: this.chests.remaining,
        aliveCount: this.match.aliveCount,
        // El aviso de zona solo tiene sentido con la partida en marcha.
        outsideZone: this.match.phase === 'jugando' &&
          this.match.zone.progress > 0 &&
          !this.match.zone.contains(this.player.x + this.player.w / 2),
        // Sin construccion no hay madera que contar, y ese hueco lo
        // ocupa el marcador del nivel Blitz.
        showWood: this.build.enabled,
      });

      // La rueda de emotes, y el cartel de "estas bailando".
      drawEmoteWheel(ctx, this.emotes, view, this.time);

      // Estado de abatido y reanimacion (solo en duos y escuadrones).
      drawReviveHud(ctx, this.player, this.revive, this.match, view, this.time, this.reload);
      // La cuenta atras grande, encima de todo lo demas.
      drawRespawnHud(ctx, this.player, this.reload, view, this.time);

      // Flecha al borde de la pantalla si hay suministros cayendo lejos.
      this.supply.drawCompass(ctx, camera, view, this.time);

      // Marcador del nivel Blitz y sus potenciadores.
      if (this.blitz && !this.player.flight) {
        drawBlitzHud(ctx, this.blitz, view, this.time);
      }
      // Y el cartelon de subida de nivel, que se ve tambien en el aire.
      if (this.blitz) drawBlitzBanner(ctx, this.blitz, view, this.time);

      // En un minijuego manda su propio marcador: nada de vivos, kills
      // ni registro de bajas, que no vienen a cuento.
      if (this.minigame) this.minigame.drawHud(ctx, view, this.time);
      else drawMatchHud(ctx, this.match, view, this.time);

      // El mapa se despliega por encima del HUD (tambien en el aire:
      // viene bien para elegir donde saltar).
      if (this.showMap) drawWorldMap(ctx, this, view, this.time);

      // Cayendo del bus: ni inventario ni mira, solo las indicaciones.
      if (this.player.flight) {
        if (!this.showMap) drawDeploymentHud(ctx, this.player, this.match, view, this.time);
        return;
      }

      // En la pantalla de fin de un minijuego sobran inventario y mira:
      // ahi solo se elige entre reintentar y salir.
      const enFinDeModo = this.minigame?.state === 'fin';
      if (enFinDeModo) {
        drawMinigameEnd(ctx, this.minigame, view, this.time,
          { x: this.mouse.screenX, y: this.mouse.screenY });
        return;
      }

      // La unica senal de que el disparo automatico esta puesto: un punto
      // minusculo en la esquina. Quien no sepa el truco no lo mira.
      if (this.autoFire.enabled) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(4, view.height - 8, 4, 4);
      }

      drawInventory(ctx, this.inventory, view, this.time, this.player);
      drawBuildHud(ctx, this.player, view, this.time);

      const equipado = this.inventory.equipped;
      drawCrosshair(ctx, {
        mouse: this.mouse,
        player: this.player,
        weapon: equipado?.kind === 'weapon' ? equipado : null,
        aiming: this.player.aiming,
        spin: this.combat.spin,
      });

      // Pantalla de eliminado o de victoria de la partida normal.
      // (La de los minijuegos se pinta antes, ver mas arriba.)
      if (!this.minigame && this.match.result !== 'jugando') {
        drawEndScreen(ctx, this.match, view, this.time);
      }
    }
  }
}
