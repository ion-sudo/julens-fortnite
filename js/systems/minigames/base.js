/**
 * base.js
 * ---------------------------------------------------------------
 * CLASE BASE de todos los minijuegos.
 *
 * La idea es que un minijuego NO reinvente nada: el movimiento, el
 * salto, el raton, las armas, las balas y la construccion son los mismos
 * que en el battle royale. Un modo solo decide tres cosas:
 *
 *   1. QUE SISTEMAS quiere del mundo (`systems`): si hay botin suelto,
 *      cofres, edificios, dianas o peces.
 *   2. QUE MONTA en el escenario y DONDE empieza el jugador (`setup`).
 *   3. CUANDO SE ACABA y con que resultado (`update` -> `finish`).
 *
 * Lo demas (cronometro, marcador, pantalla de fin, guardar el record)
 * lo hace esta clase, igual para todos.
 */

import { minigameById } from '../../data/minigames.js';
import { XP } from '../../data/levels.js';

export class Minigame {
  /**
   * @param {import('../../core/game.js').Game} game
   * @param {string} id
   */
  constructor(game, id) {
    this.game = game;
    this.id = id;
    this.def = minigameById(id);

    /**
     * Que partes del mundo hacen falta. Por defecto una arena limpia:
     * cada modo enciende lo que necesite.
     */
    this.systems = {
      worldLoot: false, chests: false, buildings: true, targets: false, fish: false,
      vehicles: false, mobility: false,
    };

    /** Cuantos bots quiere la arena (el 1 contra 1 pide uno). */
    this.arena = { bots: 0 };

    /** 'jugando' | 'fin' */
    this.state = 'jugando';
    /**
     * Cuenta atras opcional de la pantalla de resultado. Solo la usa la
     * carrera de obstaculos, para montar otro circuito sola.
     */
    this.reinicio = null;
    /** Segundos que lleva en marcha. */
    this.time = 0;
    /** Cuenta atras, si el modo tiene limite (null = sin limite). */
    this.timeLimit = null;

    /** Resultado final: puntos, segundos... segun el modo. */
    this.score = 0;
    /** ¿La ultima partida fue record? */
    this.isRecord = false;
    /** Texto grande de la pantalla de fin. */
    this.resultText = '';
  }

  /* =============================================================
     PARA QUE LO RELLENE CADA MODO
     ============================================================= */

  /** Monta el escenario. Se llama una vez, al arrancar. */
  setup() {}

  /** Logica propia del modo, cada frame. */
  step(dt) {}

  /** Dibujo dentro del mundo (con la camara aplicada). */
  draw(ctx, camera, time) {}

  /** Dibujo del marcador, en coordenadas de pantalla. */
  drawHud(ctx, view, time) {}

  /**
   * Deshace lo que el modo haya metido en el mundo.
   * Es IMPRESCINDIBLE en los modos que anaden plataformas (el parkour):
   * el mundo no se regenera entre intentos, asi que sin esto el
   * recorrido se iria acumulando encima del anterior.
   */
  teardown() {}

  /* =============================================================
     COMUN A TODOS
     ============================================================= */

  /** Segundos que quedan, o null si el modo no tiene reloj. */
  get timeLeft() {
    return this.timeLimit === null ? null : Math.max(0, this.timeLimit - this.time);
  }

  update(dt) {
    if (this.state !== 'jugando') return;

    this.time += dt;
    this.step(dt);

    // Se acabo el tiempo: lo decide la clase base, no cada modo.
    if (this.timeLimit !== null && this.time >= this.timeLimit) {
      this.onTimeUp();
    }
  }

  /** Que pasa al agotarse el reloj. Por defecto, se acaba con lo que haya. */
  onTimeUp() {
    this.finish(this.score);
  }

  /**
   * Latido de la PANTALLA DE RESULTADO.
   *
   * Al terminar, el juego congela el minijuego y deja de llamar a
   * `step()`. Esto es lo unico que sigue corriendo, por si un modo
   * quiere hacer algo mientras se ve el marcador. Por defecto, nada.
   */
  endStep(dt) {}

  /**
   * Termina el minijuego.
   * @param {number} score  la marca a guardar (puntos o segundos)
   * @param {string} texto  mensaje grande de la pantalla de fin
   */
  finish(score, texto = '') {
    if (this.state === 'fin') return;

    this.state = 'fin';
    this.score = score;
    this.resultText = texto;

    // El record lo guarda el perfil, que sabe si en este modo gana la
    // marca mayor o la menor.
    this.isRecord = this.game.profile?.saveRecord(this.id, score) || false;

    // Los minijuegos entregan la XP al momento: son cortos y no tienen
    // pantalla de resumen con desglose como la partida.
    this.xpGanada = 0;
    if (this.game.xp) {
      this.game.xp.give('MINIGAME');
      this.xpGanada = XP.MINIGAME;
      if (this.isRecord) {
        this.game.xp.give('MINIGAME_RECORD');
        this.xpGanada += XP.MINIGAME_RECORD;
      }
    }
  }

  /* =============================================================
     ATAJOS COMODOS PARA LOS MODOS
     ============================================================= */

  get world() { return this.game.world; }
  get player() { return this.game.player; }
  get particles() { return this.game.particles; }

  /** Deja al jugador de pie en un punto, quieto y sin inercia. */
  placePlayer(x, y) {
    const p = this.player;
    p.x = x - p.w / 2;
    p.y = y - p.h;
    p.vx = 0;
    p.vy = 0;
    p.flight = null;
    this.game.camera.snapTo(p);
  }

  /**
   * TRAMO LLANO mas largo de una isla: el trozo donde el suelo esta a la
   * altura de la isla y no hay NADA encima (ni escalones ni plataformas
   * solidas).
   *
   * Hace falta de verdad: al colocar los maniquies "sobre la isla" a
   * secas, algunos quedaban detras de un escalon del terreno y las balas
   * chocaban contra el escalon sin llegar a tocarlos.
   *
   * @returns {{x:number, w:number}|null}
   */
  flatRun(isla, paso = 32, margen = 60) {
    const desde = isla.x + margen;
    const hasta = isla.x + isla.w - margen;

    let mejor = null;
    let ini = null;

    const cerrar = (fin) => {
      if (ini === null) return;
      const largo = fin - ini;
      if (!mejor || largo > mejor.w) mejor = { x: ini, w: largo };
      ini = null;
    };

    for (let x = desde; x <= hasta; x += paso) {
      const y = this.groundAt(x, isla.y - 400);
      const libre = y !== null && Math.abs(y - isla.y) < 3;
      if (libre) { if (ini === null) ini = x; }
      else cerrar(x);
    }
    cerrar(hasta);

    return mejor;
  }

  /**
   * La isla con el tramo llano mas largo. Es donde se montan los modos
   * que necesitan sitio despejado (campo de tiro, entrenamiento...).
   * @returns {{isla: object, run: {x:number, w:number}}|null}
   */
  bestField(anchoMinimo = 400) {
    let mejor = null;

    for (const isla of this.world.islands) {
      if (isla.w < anchoMinimo) continue;
      const run = this.flatRun(isla);
      if (!run || run.w < anchoMinimo) continue;
      if (!mejor || run.w > mejor.run.w) mejor = { isla, run };
    }
    return mejor;
  }

  /**
   * Busca una FRANJA DE CIELO libre donde montar un circuito.
   *
   * El parkour necesita 5000 px de largo, mucho mas de lo que mide
   * cualquier tramo llano: montado sobre el terreno, sus plataformas se
   * cruzaban con escalones e islas y el recorrido se volvia intransitable.
   * Arriba, en cambio, no hay nada.
   *
   * @returns {{x:number, y:number}|null}
   */
  skyBand(ancho, alto, margen = 70) {
    const world = this.world;

    for (let y = 140; y + alto < 940; y += 60) {
      for (let x = 300; x + ancho < world.width - 300; x += 240) {
        const caja = { x: x - margen, y: y - margen, w: ancho + margen * 2, h: alto + margen * 2 };

        const choca = world.getPlatformsNear(caja, 0).some(
          (p) => p.x < caja.x + caja.w && p.x + p.w > caja.x &&
                 p.y < caja.y + caja.h && p.y + p.h > caja.y
        );
        if (!choca) return { x, y };
      }
    }
    return null;
  }

  /**
   * Superficie de suelo firme mas cercana a una X.
   * La usan varios modos para colocar cosas sin que floten.
   */
  groundAt(x, desde = 400) {
    const sonda = { x: x - 4, y: desde, w: 8, h: 2000 };
    let mejor = null;
    for (const p of this.world.getPlatformsNear(sonda, 0)) {
      if (p.oneWay || p.lakeBed) continue;
      if (p.x > x || p.x + p.w < x) continue;
      if (p.y < desde) continue;
      if (mejor === null || p.y < mejor) mejor = p.y;
    }
    return mejor;
  }
}
