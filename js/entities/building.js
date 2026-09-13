/**
 * building.js
 * ---------------------------------------------------------------
 * UNA CASA O EDIFICIO, con PLANTAS, ESCALERAS y PUERTA.
 *
 * Al ser un juego de vista lateral, el edificio es su SECCION. La gracia
 * esta en que desde fuera NO se ve lo de dentro:
 *
 *   - drawInterior()  va al FONDO (antes que el jugador y los bots):
 *                     el hueco, los suelos de cada planta, las escaleras,
 *                     los muebles, las paredes laterales, el tejado y la
 *                     puerta.
 *   - drawFacade()    va DELANTE de todo: es la pared de delante, que
 *                     tapa el interior (y a quien haya dentro). Se
 *                     desvanece cuando TU entras, y vuelve al salir.
 *
 * Colisiones: el edificio aporta plataformas normales al mundo (paredes,
 * tejado, suelos de cada planta y peldanos de escalera). La PUERTA es una
 * plataforma mas que deja de estorbar al abrirse; de eso se encarga
 * World.getPlatformsNear, que ignora las puertas abiertas.
 *
 * Los peldanos llevan la marca `ramp: true`, la misma que usan las rampas
 * de construccion: asi se suben ANDANDO, sin tener que saltar en cada uno.
 */

import { CONFIG } from '../core/config.js';
import { roundRectPath, makeRng } from '../core/utils.js';
import {
  BUILDING_TYPES, WALL, ROOF, DOOR_H, DOOR_W, DOOR_RADIUS, STEP_H, heightOf,
} from '../data/buildings.js';
import { control, segunControl } from '../ui/controlHints.js';

export { BUILDING_TYPES, DOOR_RADIUS };

/** Grosor del suelo de una planta. */
const SLAB = 12;
/** Fondo (en horizontal) de cada peldano de escalera. */
const STEP_W = 16;
/**
 * Rellano que se deja libre antes de que arranque la escalera.
 *
 * La escalera es maciza (por eso se sube ANDANDO, sin saltar en cada
 * peldano), asi que corta la planta baja: quien entra por la puerta de
 * delante sube si o si. El rellano existe para que al menos haya un
 * trozo de planta baja utilizable junto a cada puerta.
 */
const LANDING = 64;

/**
 * Cornisas exteriores: cada cuanto se repiten y cuanto sobresalen.
 * El saliente tiene que ser MAS ANCHO que el personaje (30 px) o no hay
 * sitio para pisarlo sin quedarse a medias sobre la pared.
 */
const LEDGE_STEP = 100;
const LEDGE_W = 46;
const LEDGE_H = 9;

export class Building {
  /**
   * @param {object} slot  { x, groundY, type, variant, zone }
   */
  constructor(slot) {
    const def = BUILDING_TYPES[slot.type] || BUILDING_TYPES.casa;

    this.type = slot.type;
    this.def = def;
    this.zone = slot.zone;
    this.variant = slot.variant || 0;

    this.w = def.w;
    this.floors = def.floors;
    this.floorH = def.floorH;
    this.h = heightOf(def);

    this.x = slot.x - def.w / 2;      // esquina izquierda
    this.groundY = slot.groundY;      // suelo de la planta baja
    this.y = slot.groundY - this.h;   // arranque del tejado

    /**
     * DOS puertas, una en cada pared, a ras de suelo.
     *
     * La de atras no es un adorno: sin ella un edificio de tres plantas
     * es un muro de 400 px que corta el camino, porque el salto sube
     * ~150 px y no hay forma de pasar al otro lado. Con las dos puertas
     * el edificio se ATRAVIESA, y con las cornisas de fuera ademas se
     * puede ESCALAR hasta el tejado.
     */
    this.doors = [
      { side: 'izq', x: this.x, y: this.groundY - DOOR_H, open: false, anim: 0, forcing: 0 },
      { side: 'der', x: this.x + this.w - DOOR_W, y: this.groundY - DOOR_H, open: false, anim: 0, forcing: 0 },
    ];

    /**
     * Cuanto se ve el interior: 0 = fachada opaca (estas fuera),
     * 1 = fachada transparente (estas dentro).
     */
    this.reveal = 0;

    /** Plataformas que aporta al mundo (las rellena buildPlatforms). */
    this.platforms = [];
    /** Tramos de escalera, solo para dibujarlos. */
    this.stairs = [];

    // Semilla propia: asi los muebles de cada edificio son distintos
    // pero siempre los mismos en cada partida.
    this._rng = makeRng(Math.round(slot.x) * 31 + this.variant * 7 + 101);
  }

  /* =============================================================
     MEDIDAS
     ============================================================= */

  /** Centro de una puerta concreta. */
  doorCenterX(d) { return d.x + DOOR_W / 2; }
  doorCenterY(d) { return d.y + DOOR_H / 2; }

  /** ¿Hay alguna puerta abierta? (lo usa el dibujo de la fachada) */
  get anyDoorOpen() { return this.doors.some((d) => d.open); }

  /** Borde izquierdo del hueco interior. */
  get inX() { return this.x + WALL; }
  /** Ancho del hueco interior. */
  get inW() { return this.w - WALL * 2; }

  /** Altura del SUELO de la planta f (0 = planta baja). */
  floorY(f) { return this.groundY - f * this.floorH; }

  /**
   * Todos los tramos suben HACIA LA DERECHA y encadenados: el tramo de
   * la planta f arranca justo donde acabo el de la planta f-1.
   *
   * Se probo el zigzag (un tramo a cada lado) y NO funciona en 2D: al
   * subir sales por el extremo ALTO de la escalera, y el tramo siguiente
   * te presenta su peldano mas alto, que es un muro de una planta entera
   * y no se puede rodear. En diagonal continua sales de un tramo justo
   * donde empieza el otro.
   */
  stairGoesRight() { return true; }

  /** Cuantos peldanos tiene un tramo, y cuanto ancho ocupa. */
  get stepCount() { return Math.max(3, Math.ceil(this.floorH / STEP_H)); }
  get stairW() { return this.stepCount * STEP_W; }

  /**
   * Donde arranca el tramo que sube DESDE la planta f.
   * Se deja un rellano (LANDING) al entrar, para no toparse con los
   * peldanos nada mas cruzar la puerta.
   */
  stairStart(f) {
    return this.inX + LANDING + f * this.stairW;
  }

  /**
   * Tramos de SUELO de una planta. Son varios porque el hueco de la
   * escalera parte el piso en dos: la losa de este lado y la del otro.
   * @returns {Array<{x0:number, x1:number}>}
   */
  floorSpans(f) {
    if (f === 0) return [{ x0: this.inX, x1: this.inX + this.inW }];

    // El hueco cae justo encima del tramo que sube a esta planta.
    const hx0 = this.stairStart(f - 1);
    const hx1 = hx0 + this.stairW;


    const out = [];
    if (hx0 - this.inX > 24) out.push({ x0: this.inX, x1: hx0 });
    if (this.inX + this.inW - hx1 > 24) out.push({ x0: hx1, x1: this.inX + this.inW });
    return out;
  }

  /**
   * Suelo LIBRE de una planta: lo de floorSpans() menos el tramo que
   * ocupa la escalera que sube desde aqui. Es donde se pueden dejar
   * cofres y muebles sin que acaben clavados en los peldanos.
   */
  freeSpans(f) {
    const spans = this.floorSpans(f);
    if (f >= this.floors - 1) return spans;   // la ultima planta no sube a ningun sitio

    const ex0 = this.stairStart(f);
    const ex1 = ex0 + this.stairW;

    const out = [];
    for (const s of spans) {
      if (ex1 <= s.x0 || ex0 >= s.x1) { out.push(s); continue; }  // no se tocan
      if (ex0 - s.x0 > 40) out.push({ x0: s.x0, x1: ex0 });
      if (s.x1 - ex1 > 40) out.push({ x0: ex1, x1: s.x1 });
    }
    return out.length ? out : spans;
  }

  /** El tramo libre MAS ANCHO de una planta (donde se deja el botin). */
  floorSpan(f) {
    const spans = this.freeSpans(f);
    return spans.reduce((a, b) => ((b.x1 - b.x0) > (a.x1 - a.x0) ? b : a), spans[0]);
  }

  /** Interior de la planta baja (lo usan el botin y el HUD). */
  get inside() {
    return {
      x: this.inX + 10,
      y: this.y + ROOF,
      w: this.inW - 20,
      h: this.h - ROOF,
    };
  }

  /**
   * Sitios donde dejar cofres y botin, repartidos POR PLANTAS.
   * @param {number} cuantos
   * @returns {Array<{x:number, y:number, floor:number}>}
   */
  floorSpots(cuantos) {
    const out = [];
    for (let i = 0; i < cuantos; i++) {
      // Se van alternando las plantas de abajo arriba
      const f = i % this.floors;
      const libres = this.freeSpans(f);
      const span = libres[Math.floor(i / this.floors) % libres.length];

      // Repartidos a lo ancho, sin pegarse a las paredes ni al hueco
      const t = ((Math.floor(i / this.floors) % 3) + 1) / 4;
      const x = span.x0 + 18 + Math.max(0, span.x1 - span.x0 - 36) * t;
      out.push({ x, y: this.floorY(f), floor: f });
    }
    return out;
  }

  /* =============================================================
     COLISIONES
     ============================================================= */

  /**
   * Crea las plataformas del edificio.
   * @returns {Array<object>} para meterlas en world.platforms
   */
  buildPlatforms() {
    const p = [];
    const marca = { oneWay: false, ground: false, building: this };

    // --- Tejado: solido, se puede andar por encima ---
    p.push({ x: this.x - 8, y: this.y, w: this.w + 16, h: ROOF, ...marca });

    // --- Paredes laterales: las dos se paran encima de su puerta ---
    for (const lado of [0, 1]) {
      p.push({
        x: lado === 0 ? this.x : this.x + this.w - WALL,
        y: this.y + ROOF, w: WALL,
        h: this.h - ROOF - DOOR_H, ...marca,
      });
    }

    // --- Las PUERTAS: bloquean mientras estan cerradas ---
    for (const d of this.doors) {
      d.platform = {
        x: d.x, y: d.y, w: DOOR_W, h: DOOR_H,
        oneWay: false, ground: false, building: this,
        door: true, open: d.open,
      };
      p.push(d.platform);
    }

    // --- Cornisas de fuera: la escalera exterior hasta el tejado ---
    for (const caja of this._ledgeBoxes()) {
      p.push({ ...caja, oneWay: true, ground: false, building: this, ledge: true });
    }

    // --- Suelos de las plantas altas (una losa a cada lado del hueco) ---
    for (let f = 1; f < this.floors; f++) {
      for (const span of this.floorSpans(f)) {
        p.push({
          x: span.x0, y: this.floorY(f), w: span.x1 - span.x0, h: SLAB, ...marca,
        });
      }
    }

    // --- Escaleras entre plantas ---
    this.stairs.length = 0;
    for (let f = 0; f < this.floors - 1; f++) {
      for (const caja of this._stairBoxes(f)) {
        p.push({ ...caja, ...marca, ramp: true });
        this.stairs.push(caja);
      }
    }

    this.platforms = p;
    return p;
  }

  /**
   * CORNISAS: salientes finos a los dos lados del edificio, escalonados
   * cada LEDGE_STEP px hasta el alero.
   *
   * El salto del personaje sube unos 150 px (CONFIG.player.jumpSpeed),
   * asi que con un saliente cada 105 px se sube de uno en uno sin
   * problemas. Son plataformas FINAS: se atraviesan de abajo arriba, no
   * estorban al andar y se puede bajar de ellas con S + salto.
   */
  _ledgeBoxes() {
    const alto = this.groundY - this.y;

    // Los salientes se reparten a partes iguales, de forma que ningun
    // salto pase de LEDGE_STEP. El ULTIMO cae siempre a ras del tejado:
    // si no, el ultimo salto choca con el alero (que sobresale) y no hay
    // manera de plantarse arriba. Asi se pisa el saliente y se pasa al
    // tejado sin escalon.
    const tramos = Math.max(1, Math.ceil(alto / LEDGE_STEP));

    const out = [];
    for (let i = 1; i <= tramos; i++) {
      const y = this.groundY - (alto * i) / tramos;
      // Una a cada lado, sobresaliendo hacia fuera.
      out.push({ x: this.x - LEDGE_W, y, w: LEDGE_W + 4, h: LEDGE_H });
      out.push({ x: this.x + this.w - 4, y, w: LEDGE_W + 4, h: LEDGE_H });
    }
    return out;
  }

  /**
   * Cajas de un tramo de escalera: una escalinata maciza igual que la
   * rampa de construccion. Sube hacia la derecha en las plantas pares y
   * hacia la izquierda en las impares, para que el recorrido haga zigzag
   * y siempre se llegue al suelo de la planta de arriba.
   */
  _stairBoxes(f) {
    const n = this.stepCount;
    const alto = this.floorH / n;
    const base = this.floorY(f);
    const x0 = this.stairStart(f);

    const out = [];
    for (let i = 0; i < n; i++) {
      // El peldano i mide (i+1) alturas; el mas alto acaba justo a ras
      // del suelo de la planta de arriba.
      const alturaCaja = alto * (i + 1);
      const dx = i * STEP_W;
      out.push({
        x: x0 + dx,
        y: base - alturaCaja,
        w: STEP_W,
        h: alturaCaja,
      });
    }
    return out;
  }

  /* =============================================================
     PUERTA Y PRESENCIA
     ============================================================= */

  /**
   * La puerta que tiene mas cerca este personaje, o null si ninguna esta
   * al alcance. Con dos puertas hay que elegir, no vale con una sola.
   */
  nearestDoor(quien) {
    const px = quien.x + quien.w / 2;
    const py = quien.y + quien.h / 2;

    let mejor = null;
    let mejorD = DOOR_RADIUS;

    for (const d of this.doors) {
      const dist = Math.hypot(px - this.doorCenterX(d), py - this.doorCenterY(d));
      if (dist < mejorD) { mejorD = dist; mejor = d; }
    }
    return mejor;
  }

  /** ¿Tiene alguna puerta al alcance? */
  isNearDoor(quien) { return this.nearestDoor(quien) !== null; }

  /** ¿Esta este personaje dentro del edificio? (vale para bots) */
  containsPlayer(player) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    return px > this.inX && px < this.inX + this.inW &&
           py > this.y + ROOF && py < this.groundY;
  }

  /** Abre una puerta. @returns {boolean} si ha cambiado algo */
  openDoor(d) {
    if (d.open) return false;
    d.open = true;
    if (d.platform) d.platform.open = true;
    return true;
  }

  /** Abre las dos puertas de golpe (lo usan los bots y las pruebas). */
  open() {
    let algo = false;
    for (const d of this.doors) algo = this.openDoor(d) || algo;
    return algo;
  }

  /**
   * ¿Se puede cerrar esta puerta sin pillar a nadie en el vano?
   * Sin esta comprobacion, cerrar con el personaje en el hueco lo dejaria
   * metido DENTRO de la plataforma de la puerta.
   */
  canClose(d, quien) {
    if (!quien) return true;
    return !(quien.x < d.x + DOOR_W + 4 &&
             quien.x + quien.w > d.x - 4 &&
             quien.y < d.y + DOOR_H &&
             quien.y + quien.h > d.y);
  }

  /** Cierra una puerta: vuelve a ser un muro. */
  closeDoor(d) {
    if (!d.open) return false;
    d.open = false;
    if (d.platform) d.platform.open = false;
    return true;
  }

  /**
   * Abre si esta cerrada y cierra si esta abierta.
   * @returns {'abierta'|'cerrada'|'ocupada'}
   */
  toggleDoor(d, quien) {
    if (!d.open) { this.openDoor(d); return 'abierta'; }
    if (!this.canClose(d, quien)) return 'ocupada';
    this.closeDoor(d);
    return 'cerrada';
  }

  /**
   * @param {number} dt
   * @param {object} player  para saber si hay que ensenar el interior
   */
  update(dt, player) {
    // Cada puerta gira en medio segundo
    for (const d of this.doors) {
      d.anim += ((d.open ? 1 : 0) - d.anim) * Math.min(1, dt * 6);
    }

    // La fachada se desvanece al entrar TU (los bots no la abren)
    const dentro = player ? this.containsPlayer(player) : false;
    const objetivoVelo = dentro ? 1 : 0;
    this.reveal += (objetivoVelo - this.reveal) * Math.min(1, dt * 8);
  }

  /* =============================================================
     DIBUJO 1: EL INTERIOR (va al fondo)
     ============================================================= */

  drawInterior(ctx, time) {
    const d = this.def;

    // --- Sombra en el suelo ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.beginPath();
    ctx.ellipse(this.x + this.w / 2, this.groundY + 2, this.w * 0.52, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- El hueco: la pared del fondo ---
    ctx.fillStyle = '#3a2f26';
    ctx.fillRect(this.inX, this.y + ROOF, this.inW, this.h - ROOF);

    // Un degradado suave para que el fondo no sea plano
    const g = ctx.createLinearGradient(0, this.y + ROOF, 0, this.groundY);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(this.inX, this.y + ROOF, this.inW, this.h - ROOF);

    // --- Papel/pared del fondo por plantas ---
    this._drawBackWall(ctx, d);

    // --- Muebles ---
    this._drawFurniture(ctx, d);

    // --- Escaleras ---
    this._drawStairs(ctx);

    // --- Suelos de las plantas ---
    for (let f = 0; f < this.floors; f++) {
      const y = this.floorY(f);
      const dy = f === 0 ? -10 : 0;
      const alto = f === 0 ? 10 : SLAB;

      for (const span of this.floorSpans(f)) {
        ctx.fillStyle = d.floorMat;
        ctx.fillRect(span.x0, y + dy, span.x1 - span.x0, alto);
        // Listones
        ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
        for (let x = span.x0 + 22; x < span.x1 - 6; x += 26) ctx.fillRect(x, y + dy, 2, alto);
        // Canto claro
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(span.x0, y + dy, span.x1 - span.x0, 2);
      }
    }

    // --- Paredes laterales ---
    ctx.fillStyle = d.wall;
    ctx.fillRect(this.x, this.y + ROOF, WALL, this.h - ROOF);
    ctx.fillRect(this.x + this.w - WALL, this.y + ROOF, WALL, this.h - ROOF);
    ctx.fillStyle = d.wallDark;
    ctx.fillRect(this.x, this.y + ROOF, 5, this.h - ROOF);
    ctx.fillRect(this.x + this.w - 5, this.y + ROOF, 5, this.h - ROOF);

    // --- Tejado ---
    this._drawRoof(ctx, d);

    // --- Las dos puertas ---
    for (const puerta of this.doors) this._drawDoor(ctx, d, puerta);

    // --- Cornisas de fuera (por donde se escala) ---
    this._drawLedges(ctx, d);

    if (CONFIG.debug.showHitboxes) {
      ctx.strokeStyle = 'rgba(120, 220, 255, 0.9)';
      ctx.lineWidth = 1.5;
      for (const p of this.platforms) {
        if (p.door && p.open) continue;
        ctx.strokeRect(p.x, p.y, p.w, p.h);
      }
    }
  }

  /** Pared del fondo: un zocalo por planta, para que se lean los pisos. */
  _drawBackWall(ctx, d) {
    for (let f = 0; f < this.floors; f++) {
      const yBase = this.floorY(f);
      const yTop = yBase - this.floorH + (f === this.floors - 1 ? ROOF : 0);

      // Zocalo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(this.inX, yTop, this.inW, Math.max(0, yBase - yTop));

      // Rodapie
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(this.inX, yBase - 14, this.inW, 4);
    }
  }

  /** Cuatro muebles sencillos, distintos en cada edificio. */
  _drawFurniture(ctx, d) {
    const rng = makeRng(Math.round(this.x) + this.variant * 13);

    for (let f = 0; f < this.floors; f++) {
      const span = this.floorSpan(f);
      const suelo = this.floorY(f);
      const ancho = span.x1 - span.x0;
      if (ancho < 90) continue;
      


      const cuantos = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < cuantos; i++) {
        const x = span.x0 + 20 + rng() * (ancho - 70);
        const tipo = Math.floor(rng() * 3);

        if (tipo === 0) {
          // Estanteria
          ctx.fillStyle = 'rgba(90, 62, 38, 0.9)';
          ctx.fillRect(x, suelo - 56, 34, 56);
          ctx.fillStyle = 'rgba(40, 28, 18, 0.8)';
          for (let k = 1; k < 3; k++) ctx.fillRect(x, suelo - 56 + k * 18, 34, 3);
        } else if (tipo === 1) {
          // Mesa
          ctx.fillStyle = 'rgba(110, 76, 44, 0.9)';
          ctx.fillRect(x, suelo - 26, 48, 6);
          ctx.fillRect(x + 3, suelo - 20, 5, 20);
          ctx.fillRect(x + 40, suelo - 20, 5, 20);
        } else {
          // Cajas apiladas
          ctx.fillStyle = 'rgba(122, 88, 50, 0.9)';
          ctx.fillRect(x, suelo - 24, 26, 24);
          ctx.fillRect(x + 6, suelo - 42, 20, 18);
          ctx.strokeStyle = 'rgba(50, 34, 18, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 0.5, suelo - 23.5, 25, 23);
        }
      }
    }
  }

  /** Los peldanos, en madera, con su barandilla. */
  _drawStairs(ctx) {
    if (this.stairs.length === 0) return;

    for (const s of this.stairs) {
      ctx.fillStyle = '#8a5f36';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      // Huella clara arriba
      ctx.fillStyle = '#b0834f';
      ctx.fillRect(s.x, s.y, s.w, 5);
      // Sombra del canto
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(s.x, s.y + 5, s.w, 3);
    }

    // Barandilla: una linea que sigue las esquinas de cada tramo
    ctx.strokeStyle = 'rgba(60, 40, 22, 0.75)';
    ctx.lineWidth = 3;
    for (let f = 0; f < this.floors - 1; f++) {
      const cajas = this._stairBoxes(f);
      const primera = cajas[0];
      const ultima = cajas[cajas.length - 1];

      ctx.beginPath();
      ctx.moveTo(primera.x, primera.y - 34);
      ctx.lineTo(ultima.x + ultima.w, ultima.y - 34);
      ctx.stroke();
    }
  }

  /* =============================================================
     DIBUJO 2: LA FACHADA (va por delante de todo)
     ============================================================= */

  /**
   * La pared de delante. Con reveal = 0 es opaca y tapa el interior y a
   * quien este dentro; con reveal = 1 desaparece y se ve todo.
   */
  drawFacade(ctx, time) {
    const alpha = 1 - this.reveal;
    if (alpha <= 0.01) return;

    const d = this.def;
    const x0 = this.inX;
    const y0 = this.y + ROOF;
    const alto = this.h - ROOF;

    ctx.save();
    ctx.globalAlpha = alpha;

    // --- La pared ---
    ctx.fillStyle = d.wall;
    ctx.fillRect(x0, y0, this.inW, alto);

    // Textura: bandas verticales muy suaves
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    for (let x = x0 + 30; x < x0 + this.inW; x += 30) ctx.fillRect(x, y0, 2, alto);

    // Linea de forjado entre plantas, para que se lea que tiene pisos
    ctx.fillStyle = d.wallDark;
    for (let f = 1; f < this.floors; f++) {
      ctx.fillRect(x0, this.floorY(f) - 4, this.inW, 7);
    }

    // --- Ventanas: una fila por planta ---
    this._drawWindows(ctx, d);

    // --- Con la puerta abierta se atisba el interior ---
    // Se borra un trozo de fachada junto a la puerta: es el vano por el
    // que entras, y da la pista de que dentro hay algo.
    for (const puerta of this.doors) {
      if (puerta.anim <= 0.05) continue;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0, 0, 0, ${puerta.anim})`;
      const vx = puerta.side === 'izq' ? x0 : x0 + this.inW - 52;
      ctx.fillRect(vx, puerta.y - 6, 52, DOOR_H + 6);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  }

  _drawWindows(ctx, d) {
    const cuantas = Math.max(1, Math.floor(this.inW / 120));
    const paso = this.inW / cuantas;

    for (let f = 0; f < this.floors; f++) {
      const suelo = this.floorY(f);
      const wy = suelo - this.floorH + 34;

      for (let i = 0; i < cuantas; i++) {
        const wx = this.inX + paso * i + paso / 2 - 20;

        // En la planta baja, nada de ventana encima de las puertas
        if (f === 0 && (wx < this.inX + 40 || wx > this.inX + this.inW - 60)) continue;

        ctx.fillStyle = d.wallDark;
        ctx.fillRect(wx - 3, wy - 3, 46, 40);
        ctx.fillStyle = d.window;
        ctx.fillRect(wx, wy, 40, 34);
        ctx.fillStyle = d.wallDark;
        ctx.fillRect(wx + 18, wy, 4, 34);
        ctx.fillRect(wx, wy + 15, 40, 4);
      }
    }
  }

  /* =============================================================
     TEJADO Y PUERTA
     ============================================================= */

  _drawRoof(ctx, d) {
    const x0 = this.x - 10;
    const x1 = this.x + this.w + 10;
    const y = this.y;

    ctx.fillStyle = d.roof;

    switch (d.roofStyle) {
      case 'punta':
        ctx.beginPath();
        ctx.moveTo(x0, y + ROOF);
        ctx.lineTo(this.x + this.w / 2, y - 46);
        ctx.lineTo(x1, y + ROOF);
        ctx.closePath();
        ctx.fill();
        break;

      case 'curvo':
        ctx.beginPath();
        ctx.moveTo(x0, y + ROOF);
        ctx.quadraticCurveTo(this.x + this.w / 2, y - 52, x1, y + ROOF);
        ctx.closePath();
        ctx.fill();
        break;

      case 'palma':
        ctx.fillStyle = '#c9a227';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x0 + i * 4, y + ROOF - i * 9);
          ctx.lineTo(this.x + this.w / 2, y - 18 - i * 12);
          ctx.lineTo(x1 - i * 4, y + ROOF - i * 9);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = i === 0 ? '#d9b53c' : '#b8901c';
        }
        break;

      case 'roto':
        ctx.fillRect(x0, y, (this.w + 20) * 0.42, ROOF);
        ctx.fillRect(x0 + (this.w + 20) * 0.66, y, (this.w + 20) * 0.34, ROOF);
        break;

      default: // plano
        ctx.fillRect(x0, y, x1 - x0, ROOF);
        ctx.fillStyle = d.roofEdge;
        ctx.fillRect(x0, y, x1 - x0, 5);
    }

    if (d.roofStyle !== 'roto') {
      ctx.fillStyle = d.roofEdge;
      ctx.fillRect(x0, y + ROOF - 5, x1 - x0, 5);
    }
  }

  _drawDoor(ctx, d, puerta) {
    const abierta = puerta.anim;

    ctx.save();
    ctx.translate(puerta.x + DOOR_W, puerta.y);
    // Al abrirse se "encoge" en horizontal (se va hacia dentro)
    ctx.scale(Math.max(0.08, 1 - abierta * 0.92), 1);

    ctx.fillStyle = '#7a4b26';
    ctx.fillRect(-DOOR_W - 4, 0, DOOR_W + 8, DOOR_H);
    ctx.fillStyle = '#5e3819';
    ctx.fillRect(-DOOR_W - 4, 0, 4, DOOR_H);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 1; i < 3; i++) {
      ctx.fillRect(-DOOR_W - 4, (DOOR_H / 3) * i, DOOR_W + 8, 3);
    }
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(-4, DOOR_H / 2, 3.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Marco
    ctx.fillStyle = d.wallDark;
    ctx.fillRect(puerta.x - 3, puerta.y - 6, DOOR_W + 12, 6);
  }

  /** Los salientes por los que se escala la fachada. */
  _drawLedges(ctx, d) {
    for (const c of this._ledgeBoxes()) {
      ctx.fillStyle = d.wallDark;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      // Canto claro arriba, para que se lea como un saliente
      ctx.fillStyle = d.wall;
      ctx.fillRect(c.x, c.y, c.w, 3);
      // Sombra debajo
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(c.x, c.y + c.h, c.w, 3);
    }
  }

  /** Cartel encima de la puerta. */
  drawPrompt(ctx, puerta) {
    if (!puerta) return;
    const texto = `${control('pickup')} para ${puerta.open ? 'cerrar' : 'abrir'}`;
    const x = this.doorCenterX(puerta);
    const y = puerta.y - 46;

    ctx.save();
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    const ancho = ctx.measureText(texto).width + 26;

    ctx.fillStyle = 'rgba(10, 16, 34, 0.9)';
    ctx.strokeStyle = '#7ee06a';
    ctx.lineWidth = 2;
    roundRectPath(ctx, x - ancho / 2, y, ancho, 30, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#7ee06a';
    ctx.fillText(texto, x, y + 20);

    ctx.fillStyle = 'rgba(10, 16, 34, 0.9)';
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 30);
    ctx.lineTo(x + 6, y + 30);
    ctx.lineTo(x, y + 37);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
