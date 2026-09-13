/**
 * defense.js (modo)
 * ---------------------------------------------------------------
 * JULEN DEFENSA: tower defense estilo Fortnite.
 *
 * Una TORRE con un faro rojo, un CAMINO llano y un PORTAL por el que
 * salen los zombis. Hay que aguantar 10 OLEADAS sin que tiren la torre.
 *
 * EL RITMO es un ciclo de dia y noche:
 *
 *   DIA    tranquilo. Se compra en la tienda (T), se colocan torres y
 *          trampas, se mejoran (G). Cuando se acaba la cuenta atras, o
 *          si pulsas P, anochece.
 *   NOCHE  llega la oleada, con tormenta y rayos. Disparas tu con las
 *          armas del juego, las torres disparan solas y las trampas
 *          hacen lo suyo. Cuando cae el ultimo zombi, amanece.
 *
 * Cada 5 oleadas sale un JEFE. Cada zombi da dinero, y cada oleada
 * aguantada da un extra.
 *
 * REUTILIZA LO QUE YA HABIA: se monta con el sistema de minijuegos
 * (arena, sin bus ni tormenta de zona), los zombis son objetivos
 * normales para las balas, el pico y las granadas, el jugador se mueve,
 * dispara y construye igual que siempre, y el cielo es el ciclo dia/noche
 * del juego. Lo unico nuevo es lo que es propio del modo.
 *
 * A DIFERENCIA de un minijuego, este CUENTA COMO PARTIDA (`countsAsMatch`):
 * da pavos, XP, progreso del pase y estadisticas al terminar.
 */

import { Minigame } from './base.js';
import { Zombie } from '../../entities/zombie.js';
import { DefenseStructures } from '../defense/structures.js';
import { drawBase, drawGhost, drawPortal } from '../../entities/defenseSprites.js';
import { drawDefenseHud, botonesTienda } from '../../ui/defenseHud.js';
import { hits } from '../../ui/minigameHud.js';
import { DEFENSA, ZOMBIES, composicionOleada } from '../../data/defense.js';
import { makeWeapon, setWeaponPool } from '../../data/loot.js';
import { findWeapon } from '../../data/weapons.js';
import { AMMO_TYPES } from '../../data/ammo.js';
import { XP } from '../../data/levels.js';
import {
  playExplosionAt, playShotAt, playTrueno, playReward, playPickup,
} from '../../core/audio.js';

/** Hora del ciclo en cada fase (ver world/ambience.js: 0,5 es mediodia). */
const HORA_DIA = 0.45;
const HORA_NOCHE = 0.98;
/** Lo rapido que se pasa de una a otra: unos 3 segundos. */
const VELOCIDAD_CIELO = 0.16;

export class JulenDefense extends Minigame {
  constructor(game) {
    super(game, 'defensa');

    // Una arena limpia: sin botin, cofres, casas, dianas, peces ni
    // vehiculos. Pero SI con construccion: una pared a tiempo para a los
    // zombis, que se paran a golpearla.
    this.systems = {
      worldLoot: false, chests: false, buildings: false, targets: false, fish: false,
      vehicles: false, mobility: false, supply: false, build: true,
    };
    this.arena = { bots: 0 };
    this.timeLimit = null;

    /** Da pavos, XP y estadisticas al acabar (ver game.endCountedMinigame). */
    this.countsAsMatch = true;
  }

  /* =============================================================
     MONTAJE
     ============================================================= */

  setup() {
    const game = this.game;

    // Las armas de este modo (las de siempre y las nuevas de defensa).
    setWeaponPool('defensa');

    // --- El camino: el tramo llano mas largo del mapa ---
    const campo = this.bestField(900) || this.bestField(400);
    this.carril = { x0: campo.run.x, x1: campo.run.x + campo.run.w, y: campo.isla.y };

    this.base = {
      x: this.carril.x0 + 60,
      y: this.carril.y,
      vida: DEFENSA.vidaBase,
      vidaMax: DEFENSA.vidaBase,
      hitFlash: 0,
    };

    // --- Los zombis ---
    // Se meten en la lista de objetivos del juego: con eso ya les dan
    // las balas, el pico y las granadas, y el juego los actualiza y los
    // dibuja como a cualquier objetivo.
    this.zombies = [];
    game.targets = this.zombies;
    game.combat.targets = this.zombies;

    this.estructuras = new DefenseStructures(this);

    // --- Estado de la partida ---
    this.dinero = DEFENSA.dineroInicial;
    this.oleada = 0;           // la ultima que ha empezado
    this.superadas = 0;        // las que se han aguantado
    this.fase = 'dia';
    this.cuenta = DEFENSA.preparacionPrimera;
    this.porSalir = [];        // zombis de la oleada que aun no han salido
    this.salidaT = 0;
    this.comp = null;          // composicion de la oleada en curso
    this.bajas = 0;
    this.ganada = false;

    this.tienda = { abierta: false, pestana: 'torres' };
    this.colocando = null;     // { def, tipo, x, ok, motivo }
    this.blocksActions = false;
    this.freezePlayer = false;
    /**
     * El clic ya lo ha usado la tienda o la colocacion: hasta que se
     * SUELTE el boton no puede disparar. Sin esto, el mismo clic que
     * colocaba una trampa disparaba el fusil nada mas quedar puesta,
     * porque el boton sigue apretado unos milisegundos y el arma es
     * automatica (mismo fallo que ya tuvieron los emotes).
     */
    this._esperarSoltar = false;
    this.muerteJugador = 0;

    // Efectos de pantalla
    this.zaps = [];
    this.anillos = [];
    this.textos = [];
    this.banner = { texto: 'JULEN DEFENSA', sub: 'Es de dia: prepara la defensa', vida: 3.5, color: '#ffd23f' };

    // --- Lo que golpean los zombis ---
    // Se crean una vez y se reutilizan: un zombi pregunta que tiene
    // delante cada frame, y fabricar objetos nuevos cada vez seria tirar.
    this._golpeBase = {
      golpear: (dano) => {
        this.base.vida = Math.max(0, this.base.vida - dano);
        this.base.hitFlash = 0.15;
        this.particles.spark(this.base.x + 44, this.base.y - 80, '#c8c8d0', 6, 200);
      },
    };
    this._golpeJugador = {
      golpear: (dano) => {
        const p = this.player;
        p.takeDamage(dano, p.x + p.w / 2, p.y + 20, null);
      },
    };
    this._golpeMuro = {
      estructura: null,
      golpear: (dano) => this._golpeMuro.estructura?.takeDamage(dano * 1.6, null),
    };

    // --- El jugador: un arma para empezar y municion a tope ---
    const inv = game.inventory;
    const res = inv.add(makeWeapon(findWeapon('fusil'), 'uncommon'));
    if (res.ok) inv.select(res.slot);
    this._rellenarMunicion();
    this.placePlayer(this.base.x + 150, this.carril.y);

    // --- Cielo: de dia y despejado para empezar ---
    this.horaActual = HORA_DIA;
    game.ambience.forzar({ hora: HORA_DIA, clima: 'despejado', rayos: false });
    game.ambience.onRayo = () => playTrueno();

    // Los cohetes y los morteros revientan tambien al chocar con el
    // suelo, no solo al darle a un zombi.
    game.bullets.onImpact = (b) => this._alImpactar(b);

    // Cuenta como partida: su XP y sus misiones empiezan de cero.
    game.xp?.reset();
    game.missions?.startMatch();

    game.showMessage('T tienda · G mejorar · P empezar la oleada', 'legendary');
  }

  /** Quita lo que el modo ha enganchado fuera de si mismo. */
  teardown() {
    const game = this.game;
    if (game.bullets.onImpact) game.bullets.onImpact = null;
    game.ambience.rayos = false;
    game.ambience.onRayo = null;
  }

  /* =============================================================
     BUCLE
     ============================================================= */

  step(dt) {
    // Sin rotulo de zona ("FABRICA TORNILLO"): aqui no se viaja por el
    // mapa, y al empezar se montaba encima del cartel del modo.
    this.game.zoneLabel = null;

    this._teclas();
    this._cielo(dt);

    if (this.fase === 'dia') {
      this.cuenta -= dt;
      if (this.cuenta <= 0) this._empezarOleada();
    } else {
      this._oleadaEnCurso(dt);
    }

    this.estructuras.update(dt, this.zombies);
    this._limpiarZombis();
    this._jugador(dt);
    this._efectos(dt);

    if (this.base.vida <= 0) this._acabar(false);
  }

  /** Zombis que faltan por matar en esta oleada (salidos y por salir). */
  get zombiesRestantes() {
    return this.porSalir.length + this.zombies.filter((z) => !z.dead).length;
  }

  /* =============================================================
     TECLAS, TIENDA Y COLOCACION
     ============================================================= */

  _teclas() {
    const input = this.game.input;

    if (this.player.alive) {
      if (input.consume('defenseShop')) {
        this.tienda.abierta = !this.tienda.abierta;
        this.colocando = null;
      }
      if (input.consume('defenseUpgrade')) this._mejorarCercana();
      if (input.consume('defenseReady') && this.fase === 'dia') this.cuenta = 0;

      if (this.tienda.abierta) this._usarTienda();
      else if (this.colocando) this._usarColocacion();
    }

    if (this._esperarSoltar && !this.game.mouse.left) this._esperarSoltar = false;

    // Con la tienda abierta, colocando, o con el clic de eso aun apretado,
    // el raton es para eso y no para disparar ni construir (lo mira game.js).
    this.blocksActions = this.tienda.abierta || !!this.colocando || this._esperarSoltar;

    // Con la tienda abierta hace falta ver el puntero para pulsar.
    const cursor = this.tienda.abierta ? 'default' : 'none';
    if (this._cursor !== cursor) {
      this._cursor = cursor;
      this.game.canvas.style.cursor = cursor;
    }
  }

  _usarTienda() {
    const mouse = this.game.mouse;
    if (!mouse.leftPressed) return;

    for (const b of botonesTienda(this.game.view, this.tienda.pestana)) {
      if (hits(b, mouse.screenX, mouse.screenY)) {
        this._esperarSoltar = true;
        this._accionTienda(b);
        return;
      }
    }
  }

  _accionTienda(b) {
    if (b.accion === 'cerrar') { this.tienda.abierta = false; return; }
    if (b.accion === 'pestana') { this.tienda.pestana = b.valor; return; }

    const it = b.item;
    if (this.dinero < it.precio) {
      this.game.showMessage(`Te faltan $${it.precio - this.dinero}`);
      return;
    }

    // Torres y trampas: se paga al colocarlas, no al elegirlas.
    if (b.tipo === 'torre' || b.tipo === 'trampa') {
      this.colocando = { def: it, tipo: b.tipo, x: this.player.x, ok: false, motivo: null };
      this.tienda.abierta = false;
      return;
    }

    if (it.municion) {
      this.dinero -= it.precio;
      this._rellenarMunicion();
      playPickup();
      this.game.showMessage('Municion al maximo', 'uncommon');
      return;
    }

    const def = findWeapon(it.arma);
    if (!def) return;
    const res = this.game.inventory.add(makeWeapon(def, it.rareza));
    if (!res.ok) {
      this.game.showMessage('Inventario lleno · suelta algo con R');
      return;
    }
    this.game.inventory.select(res.slot);
    this.player.addAmmo(def.ammo, AMMO_TYPES[def.ammo]?.max || 999);
    this.dinero -= it.precio;
    playPickup();
    this.game.showMessage(`${def.name} comprada`, it.rareza);
  }

  _usarColocacion() {
    const c = this.colocando;
    const mouse = this.game.mouse;

    if (mouse.rightPressed) {
      this.colocando = null;
      return;
    }

    c.x = Math.max(this.carril.x0, Math.min(this.carril.x1, mouse.worldX));
    const chequeo = this.estructuras.puedeColocar(c.def, c.tipo, c.x);
    c.ok = chequeo.ok;
    c.motivo = chequeo.motivo;

    if (!mouse.leftPressed) return;
    this._esperarSoltar = true;
    if (!c.ok) {
      this.game.showMessage(c.motivo);
      return;
    }
    if (this.dinero < c.def.precio) {
      this.game.showMessage(`Te faltan $${c.def.precio - this.dinero}`);
      this.colocando = null;
      return;
    }

    this.dinero -= c.def.precio;
    this.estructuras.colocar(c.def, c.tipo, c.x);
    this.game.showMessage(`${c.def.name} colocada`, 'rare');
    this.colocando = null;
  }

  _mejorarCercana() {
    const s = this.estructuras.cercana(this.player.x + this.player.w / 2, 90);
    if (!s) {
      this.game.showMessage('Acercate a una torre o trampa para mejorarla');
      return;
    }
    const accion = this.estructuras.accionMejora(s);
    if (!accion) {
      this.game.showMessage(`${s.def.name} ya esta al maximo`);
      return;
    }
    if (this.dinero < accion.precio) {
      this.game.showMessage(`Te faltan $${accion.precio - this.dinero}`);
      return;
    }
    this.dinero -= accion.precio;
    this.estructuras.aplicarMejora(s, accion);
    playReward();
    this.game.showMessage(
      accion.tipo === 'mejorar' ? `${s.def.name} · nivel ${s.nivel}` : `${s.def.name} recargada`,
      'epic'
    );
  }

  _rellenarMunicion() {
    for (const tipo of Object.keys(this.player.ammo)) {
      this.player.addAmmo(tipo, AMMO_TYPES[tipo]?.max || 999);
    }
  }

  /* =============================================================
     DIA Y NOCHE
     ============================================================= */

  /**
   * Lleva el cielo a la hora de la fase, SIEMPRE HACIA DELANTE: de dia a
   * noche pasa por el atardecer y de noche a dia por el amanecer. Asi el
   * cambio de fase se ve venir y marca clarisimo cuando empieza y
   * acaba cada oleada.
   */
  _cielo(dt) {
    const objetivo = this.fase === 'noche' ? HORA_NOCHE : HORA_DIA;
    const falta = (objetivo - this.horaActual + 1) % 1;
    if (falta > 0.002) {
      this.horaActual = (this.horaActual + Math.min(falta, dt * VELOCIDAD_CIELO)) % 1;
    }
    this.game.ambience.hora = this.horaActual;
    this.base.hitFlash = Math.max(0, this.base.hitFlash - dt);
  }

  /** Lo que suena (lo pregunta game.js). */
  musicTrack() {
    return this.fase === 'noche' && this.state !== 'fin' ? 'tension' : 'menu';
  }

  /** Cuanto viento de tormenta se oye (lo pregunta game.js). */
  stormLevel() {
    return this.fase === 'noche' && this.state !== 'fin' ? 0.45 : 0;
  }

  /* =============================================================
     OLEADAS
     ============================================================= */

  _empezarOleada() {
    this.oleada++;
    this.fase = 'noche';
    this.comp = composicionOleada(this.oleada);

    // La fila de salida, barajada; el jefe siempre el ultimo.
    const cola = [];
    for (const grupo of this.comp.lista) {
      if (grupo.tipo === 'jefe') continue;
      for (let i = 0; i < grupo.cuantos; i++) cola.push(grupo.tipo);
    }
    for (let i = cola.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cola[i], cola[j]] = [cola[j], cola[i]];
    }
    if (this.comp.jefe) cola.push('jefe');

    this.porSalir = cola;
    this.salidaT = 2;
    this.estructuras.nuevaOleada();
    this.tienda.abierta = false;

    this.game.ambience.forzar({ clima: 'tormenta', rayos: true });
    playTrueno();
    this.banner = {
      texto: 'ANOCHECE',
      sub: this.comp.jefe ? `Oleada ${this.oleada} · ¡viene un JEFE!` : `Oleada ${this.oleada} · ${cola.length} zombis`,
      vida: 3,
      color: '#ff6a6a',
    };
  }

  _oleadaEnCurso(dt) {
    if (this.porSalir.length > 0) {
      this.salidaT -= dt;
      if (this.salidaT <= 0) {
        const tipo = this.porSalir.shift();
        this._sacarZombi(tipo);
        this.salidaT = tipo === 'jefe' ? 2 : this.comp.ritmo * (0.6 + Math.random() * 0.8);
      }
      return;
    }
    if (this.zombies.every((z) => z.dead)) this._terminarOleada();
  }

  _sacarZombi(tipo) {
    const def = ZOMBIES[tipo];
    const mult = {
      vida: this.comp.vida * (def.jefe ? this.comp.vidaJefe : 1),
      dano: this.comp.dano,
    };
    const x = this.carril.x1 - 40 - Math.random() * 30;
    this.zombies.push(new Zombie(def, x, this.carril.y, this, mult));

    if (def.jefe) {
      playTrueno();
      this.banner = { texto: '¡EL REY ZOMBI!', sub: 'Aguanta la torre', vida: 2.6, color: '#ff4a4a' };
    }
  }

  _terminarOleada() {
    this.superadas = this.oleada;
    const bonus = DEFENSA.bonusOleada(this.oleada);
    this.dinero += bonus;
    this.game.xp?.add('WAVE');
    playReward();

    if (this.oleada >= DEFENSA.oleadas) {
      this._acabar(true);
      return;
    }

    this.fase = 'dia';
    this.cuenta = DEFENSA.preparacion;
    this.game.ambience.forzar({ clima: 'despejado', rayos: false });
    this.banner = { texto: 'AMANECE', sub: `Oleada ${this.oleada} superada · +$${bonus}`, vida: 3, color: '#ffd23f' };
  }

  /* =============================================================
     LO QUE PREGUNTAN LOS ZOMBIS
     ============================================================= */

  /** Que tiene delante un zombi para golpear, o null si puede andar. */
  objetivoDelante(z) {
    // 1) La torre
    if (z.x <= this.base.x + 44) return this._golpeBase;

    // 2) El jugador, pegado a el y a su altura
    const p = this.player;
    if (p.alive && p.x + p.w > z.x - 16 && p.x < z.x + z.w * 0.6 &&
        p.y + p.h > z.y + 8 && p.y < z.y + z.h) {
      return this._golpeJugador;
    }

    // 3) Algo que haya construido el jugador
    const caja = { x: z.x - 10, y: z.y + 4, w: 12, h: z.h - 8 };
    for (const plat of this.world.getPlatformsNear(caja, 0)) {
      const st = plat.structure;
      if (!st || st.dead) continue;
      if (plat.x > caja.x + caja.w || plat.x + plat.w < caja.x) continue;
      if (plat.y > caja.y + caja.h || plat.y + plat.h < caja.y) continue;
      this._golpeMuro.estructura = st;
      return this._golpeMuro;
    }
    return null;
  }

  /** Que ningun zombi se salga del camino. */
  limitarCarril(z) {
    z.x = Math.max(this.carril.x0, Math.min(this.carril.x1 + 60, z.x));
  }

  /* =============================================================
     EFECTOS DE LAS ARMAS
     ============================================================= */

  /** Dano en area: cohetes, morteros. */
  explosion(x, y, radio, dano, fuente) {
    for (const z of this.zombies) {
      if (z.dead) continue;
      const alcance = radio + z.w / 2;
      const d = Math.hypot(z.cx - x, (z.y + z.h / 2) - y);
      if (d > alcance) continue;
      // En el centro, todo; en el borde, menos de la mitad.
      const f = 1 - Math.min(1, d / alcance) * 0.6;
      z.takeDamage(Math.round(dano * f), z.cx, z.y + z.h * 0.4, fuente);
    }
    this.particles.spark(x, y, '#ff8a3d', 22, 380);
    this.particles.puff(x, y, 'rgba(90, 70, 60, 0.6)', 10);
    this.anillos.push({ x, y, r: radio, vida: 0.35 });
    playExplosionAt(x, y);
  }

  /** Rayo en cadena: salta a los tres zombis mas cercanos, uno tras otro. */
  cadena(origen, dano, fuente) {
    const tocados = new Set([origen]);
    let actual = origen;

    for (let salto = 0; salto < 3; salto++) {
      let mejor = null;
      let mejorD = 200;
      for (const z of this.zombies) {
        if (z.dead || tocados.has(z)) continue;
        const d = Math.abs(z.cx - actual.cx);
        if (d < mejorD) { mejorD = d; mejor = z; }
      }
      if (!mejor) break;

      this.zaps.push({
        x0: actual.cx, y0: actual.y + actual.h * 0.4,
        x1: mejor.cx, y1: mejor.y + mejor.h * 0.4,
        vida: 0.2,
      });
      tocados.add(mejor);
      mejor.takeDamage(Math.round(dano), mejor.cx, mejor.y + 10, fuente);
      actual = mejor;
      dano *= 0.8;
    }
  }

  /** Un cohete que choca con el suelo o se queda sin alcance, tambien revienta. */
  _alImpactar(b) {
    if (b.effect !== 'explosion' || b.exploded) return;
    b.exploded = true;
    this.explosion(b.x, b.y, b.radius || 110, b.damage, b.owner);
  }

  /** Lo llama cada zombi al morir. */
  onZombieMuerto(z, fuente) {
    const dinero = z.def.dinero + (z.def.jefe ? this.oleada * 40 : 0);
    this.dinero += dinero;
    this.bajas++;
    this.textos.push({ x: z.cx, y: z.y - 10, texto: `+$${dinero}`, vida: 1.1 });
    this.particles.puff(z.cx, z.y + z.h / 2, 'rgba(120, 160, 90, 0.6)', 8);

    if (z.def.jefe) {
      this.banner = { texto: '¡JEFE ELIMINADO!', sub: `+$${dinero}`, vida: 2.5, color: '#ffd23f' };
      playReward();
    }
  }

  /* =============================================================
     JUGADOR, LIMPIEZA Y FINAL
     ============================================================= */

  /** Si te tumban, vuelves a la torre a los pocos segundos. */
  _jugador(dt) {
    const p = this.player;
    if (p.alive) {
      this.freezePlayer = false;
      this.muerteJugador = 0;
      return;
    }

    this.freezePlayer = true;
    this.tienda.abierta = false;
    this.colocando = null;
    this.muerteJugador += dt;
    if (this.muerteJugador < DEFENSA.respawnJugador) return;

    p.alive = true;
    p.downed = false;
    p.health = p.maxHealth;
    p.shield = 0;
    p.hurtFlash = 0;
    this.placePlayer(this.base.x + 150, this.carril.y);
    p.respawnFlash = 1.2;
    this.game.showMessage('¡De vuelta en la torre!', 'uncommon');
  }

  /** Los zombis que ya han terminado de desvanecerse, fuera. */
  _limpiarZombis() {
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.dead && z.muerte <= 0) this.zombies.splice(i, 1);
    }
  }

  _efectos(dt) {
    for (const z of this.zaps) z.vida -= dt;
    for (const a of this.anillos) a.vida -= dt;
    for (const t of this.textos) { t.vida -= dt; t.y -= 34 * dt; }
    this.zaps = this.zaps.filter((z) => z.vida > 0);
    this.anillos = this.anillos.filter((a) => a.vida > 0);
    this.textos = this.textos.filter((t) => t.vida > 0);

    if (this.banner) {
      this.banner.vida -= dt;
      if (this.banner.vida <= 0) this.banner = null;
    }
  }

  _acabar(ganada) {
    if (this.state === 'fin') return;

    this.ganada = ganada;
    this.blocksActions = false;
    this.freezePlayer = false;
    this.tienda.abierta = false;
    this.colocando = null;
    this.game.ambience.rayos = false;

    this.finish(this.superadas, ganada ? '¡Torre defendida!' : 'La torre ha caido');

    // La XP se cobra al salir, como en una partida: aqui se ensena lo
    // que se va a llevar (oleadas, dano, partida y victoria).
    this.xpGanada = (this.game.xp?.total || 0) + XP.MATCH + (ganada ? XP.WIN : 0);
  }

  /** El resumen que necesita game.endMatch para pagar la partida. */
  matchSummary() {
    return {
      result: this.state === 'fin' && this.ganada ? 'victoria' : 'derrota',
      // Los zombis no cuentan como eliminaciones: si no, una sola
      // partida de defensa inflaria para siempre las estadisticas de
      // kills del battle royale.
      kills: 0,
      placement: null,
      waves: this.superadas,
    };
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    if (!this.carril) return;
    const noche = this.game.ambience.oscuridad > 0.4;

    drawPortal(ctx, this.carril.x1 - 20, this.carril.y, time, this.fase === 'noche');
    this.estructuras.draw(ctx, camera, time);

    // La torre se aclara si el jugador pasa por delante: si no, lo tapa.
    const p = this.player;
    const tapa = p.x + p.w > this.base.x - 50 && p.x < this.base.x + 50;
    ctx.save();
    if (tapa) ctx.globalAlpha = 0.5;
    drawBase(ctx, this.base, time, noche);
    ctx.restore();

    if (this.colocando) {
      const c = this.colocando;
      drawGhost(ctx, c.def, c.tipo, c.x, this.carril.y, c.ok, time);
    }

    this._dibujarEfectos(ctx);
  }

  _dibujarEfectos(ctx) {
    // Rayos electricos
    if (this.zaps.length) {
      ctx.save();
      ctx.strokeStyle = '#fff59a';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ffe34a';
      ctx.shadowBlur = 10;
      for (const z of this.zaps) {
        ctx.globalAlpha = Math.min(1, z.vida * 6);
        ctx.beginPath();
        ctx.moveTo(z.x0, z.y0);
        for (let i = 1; i < 6; i++) {
          const t = i / 6;
          ctx.lineTo(
            z.x0 + (z.x1 - z.x0) * t + (Math.random() - 0.5) * 16,
            z.y0 + (z.y1 - z.y0) * t + (Math.random() - 0.5) * 16
          );
        }
        ctx.lineTo(z.x1, z.y1);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Ondas de las explosiones
    for (const a of this.anillos) {
      ctx.save();
      ctx.globalAlpha = a.vida / 0.35;
      ctx.strokeStyle = '#ffb45a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r * (1.2 - a.vida / 0.35 * 0.5), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Dinero ganado, flotando
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    for (const t of this.textos) {
      ctx.globalAlpha = Math.min(1, t.vida * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(6, 10, 22, 0.8)';
      ctx.strokeText(t.texto, t.x, t.y);
      ctx.fillStyle = '#ffd23f';
      ctx.fillText(t.texto, t.x, t.y);
    }
    ctx.restore();
  }

  drawHud(ctx, view, time) {
    drawDefenseHud(ctx, this, view, time);
  }
}
