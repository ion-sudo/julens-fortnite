/**
 * building.js
 * ---------------------------------------------------------------
 * MODO CONSTRUCCION.
 *
 *   Q          entra y sale del modo
 *   Z / X / C  eligen pared, suelo o rampa
 *   clic izq   coloca la pieza donde este la previsualizacion
 *
 * Dentro del modo no se dispara: el clic izquierdo construye. Fuera del
 * modo, todo sigue igual que siempre.
 *
 * Cada pieza cuesta 10 de madera y se coloca sobre una rejilla de 96 px.
 * La previsualizacion se ve en verde si se puede poner y en rojo si no
 * (sin madera, fuera de alcance, o el sitio esta ocupado).
 */

import { CONFIG } from '../core/config.js';
import { Structure } from '../entities/structure.js';
import { pieceOf, snap, GRID, PIECE_ORDER } from '../data/structures.js';
import { playBuild, playBreak } from '../core/audio.js';

/** Motivos de "aqui no" que SI merece la pena reintentar mas arriba. */
const OCUPADO = 'El sitio esta ocupado';
const EN_MEDIO = 'Estas en medio';

export class BuildManager {
  /**
   * @param {object} deps { world, particles }
   */
  constructor(deps) {
    this.world = deps.world;
    this.particles = deps.particles;

    /** @type {Structure[]} */
    this.structures = [];
    /** Estado de la previsualizacion, recalculado cada frame. */
    this.preview = null;
    /**
     * Si el modo permite construir. El Julen Blitz lo apaga: sin esto
     * habria que tocar el pico, la IA de los bots, el HUD y el raton por
     * separado, y bastaria olvidarse de uno para que se colara una
     * pared. Apagandolo aqui, NADIE puede construir: el jugador, los
     * bots y la previsualizacion pasan todos por el mismo sitio.
     */
    this.enabled = true;

    /** Ultima celda ocupada, para poder construir arrastrando el raton. */
    this._lastCell = '';

    this.onMessage = null;
    /** Avisos para las misiones. */
    this.onPlaced = null;
    this.onBroken = null;
  }

  /**
   * Tira todo lo construido (al empezar partida o minijuego).
   *
   * Barre TODO el mundo, no solo su propia lista: cada partida crea un
   * BuildManager nuevo, que nace sin saber nada de las piezas de la
   * anterior. Sin este barrido, lo que construias en un minijuego seguia
   * plantado en el siguiente, y en la partida normal.
   */
  reset() {
    for (const s of this.structures) this._removePlatforms(s);
    this.structures.length = 0;
    this.preview = null;
    this._lastCell = '';

    const platforms = this.world.platforms;
    for (let i = platforms.length - 1; i >= 0; i--) {
      if (platforms[i].structure) platforms.splice(i, 1);
    }
    this.world.rebuildIndex();
  }

  /* =============================================================
     ENTRADA
     ============================================================= */

  /**
   * @param {number} dt
   * @param {object} player
   * @param {import('../core/input.js').Input} input
   * @param {import('../core/mouse.js').Mouse} mouse
   */
  update(dt, player, input, mouse) {
    // Modo sin construccion: se avisa una vez al pulsar Q y ya esta.
    if (!this.enabled) {
      player.buildMode = false;
      this.preview = null;
      if (input.consume('buildMode')) {
        this.onMessage?.('En este modo no se construye', null);
      }
      return;
    }

    // --- Q: entrar y salir del modo ---
    if (input.consume('buildMode')) {
      player.buildMode = !player.buildMode;
      this.onMessage?.(
        player.buildMode ? 'Modo construccion: Z pared · X suelo · C rampa' : 'Modo construccion desactivado',
        player.buildMode ? 'uncommon' : null
      );
    }

    // --- Z / X / C: elegir pieza (entrando al modo si hacia falta) ---
    const elegida =
      input.consume('pieceWall') ? 'pared' :
      input.consume('pieceFloor') ? 'suelo' :
      input.consume('pieceRamp') ? 'rampa' : null;

    if (elegida) {
      player.piece = elegida;
      if (!player.buildMode) player.buildMode = true;
      this.onMessage?.(`${pieceOf(elegida).name} seleccionada`, 'uncommon');
    }

    // --- Estructuras: dano, animaciones y retirada de las rotas ---
    for (let i = this.structures.length - 1; i >= 0; i--) {
      const s = this.structures[i];
      s.update(dt);
      if (s.dead) this._destroy(s, i);
    }

    if (!player.buildMode) { this.preview = null; return; }

    // --- Previsualizacion ---
    this.preview = this._computePreview(player, mouse);

    // --- Clic izquierdo: colocar ---
    // Con el boton pulsado se puede arrastrar y encadenar piezas, pero
    // solo una por celda: asi no se gasta la madera de golpe.
    const celda = `${this.preview.cellX},${this.preview.cellY},${player.piece}`;
    if (mouse.leftPressed) {
      if (this.tryPlace(player)) this._lastCell = celda;
    } else if (mouse.left && celda !== this._lastCell) {
      if (this.tryPlace(player, true)) this._lastCell = celda;
    }
    if (!mouse.left) this._lastCell = '';
  }

  /** Calcula donde iria la pieza y si se puede poner ahi. */
  _computePreview(player, mouse) {
    const piece = pieceOf(player.piece);
    const cellX = snap(mouse.worldX);
    const baseY = this._settle(cellX, snap(mouse.worldY));
    const dir = mouse.worldX >= player.x + player.w / 2 ? 1 : -1;

    let cellY = baseY;
    let razon = this._whyNot(player, piece, cellX, cellY, dir);

    // Si el hueco esta pillado (terreno irregular, otra pieza, o tu mismo
    // en medio) se prueba una celda mas arriba, y luego otra. Es lo que
    // hace que se pueda construir sin pelearse con la rejilla.
    if (razon === OCUPADO || razon === EN_MEDIO) {
      for (let k = 1; k <= 2; k++) {
        const y2 = baseY - GRID * k;
        if (this._whyNot(player, piece, cellX, y2, dir) === null) {
          cellY = y2;
          razon = null;
          break;
        }
      }
    }

    return { piece, cellX, cellY, dir, ok: razon === null, razon };
  }

  /**
   * Baja la celda hasta POSAR la pieza en el suelo que tenga debajo.
   *
   * El terreno es irregular y casi nunca cae en la rejilla de 96 px: sin
   * esto, media celda queda enterrada (y no deja construir) y la de
   * encima queda flotando a 20 o 30 px, con lo que las rampas no se
   * pueden subir. Si no hay suelo cerca (construyendo en el aire) se
   * respeta la rejilla tal cual.
   */
  _settle(cellX, cellY) {
    const zona = {
      x: cellX + 2, y: cellY, w: GRID - 4, h: GRID * CONFIG.build.groundSnap,
    };

    let mejor = null;
    for (const p of this.world.getPlatformsNear(zona, 0)) {
      if (p.structure) continue;             // solo el terreno natural
      if (p.y <= cellY) continue;            // tiene que estar por debajo
      if (p.y > zona.y + zona.h) continue;   // demasiado lejos
      if (p.x >= zona.x + zona.w || p.x + p.w <= zona.x) continue;
      if (mejor === null || p.y < mejor) mejor = p.y;
    }

    return mejor === null ? cellY : mejor - GRID;
  }

  /**
   * Devuelve el motivo por el que NO se puede construir ahi, o null si
   * se puede. Tenerlo en un solo sitio evita que la previsualizacion y
   * la colocacion real digan cosas distintas.
   */
  _whyNot(player, piece, cellX, cellY, dir) {
    // ¿Este modo deja construir?
    if (!this.enabled) return 'Aqui no se construye';

    // ¿Le llega la madera?
    if (!player.hasWood(piece.cost)) return `Necesitas ${piece.cost} de madera`;

    // ¿Esta al alcance?
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const dx = (cellX + GRID / 2) - px;
    const dy = (cellY + GRID / 2) - py;
    if (Math.hypot(dx, dy) > CONFIG.build.buildRange) return 'Demasiado lejos';

    // ¿Ya hay algo construido en esa celda?
    const ocupada = this.structures.some(
      (s) => s.cellX === cellX && s.cellY === cellY && s.piece.id === piece.id
    );
    if (ocupada) return 'Ahi ya hay una pieza';

    // ¿Choca con el terreno o con otra construccion?
    for (const b of piece.boxes(dir)) {
      const caja = { x: cellX + b.dx, y: cellY + b.dy, w: b.w, h: b.h };

      const choca = this.world.getPlatformsNear(caja, 0).some((p) => {
        if (p.oneWay) return false;               // las finas no estorban
        return p.x < caja.x + caja.w - 1 && p.x + p.w > caja.x + 1 &&
               p.y < caja.y + caja.h - 1 && p.y + p.h > caja.y + 1;
      });
      if (choca) return OCUPADO;

      // Y que no te encierre a ti mismo
      const enc = player.x < caja.x + caja.w && player.x + player.w > caja.x &&
                  player.y < caja.y + caja.h && player.y + player.h > caja.y;
      if (enc) return EN_MEDIO;
    }

    return null;
  }

  /* =============================================================
     COLOCAR Y QUITAR
     ============================================================= */

  /**
   * Coloca la pieza de la previsualizacion.
   * @returns {Structure|null}
   */
  tryPlace(player, silencioso = false) {
    const pv = this.preview;
    if (!pv) return null;

    if (!pv.ok) {
      if (!silencioso) this.onMessage?.(pv.razon, true);
      return null;
    }

    return this.place(player.piece, pv.cellX, pv.cellY, pv.dir, player);
  }

  /**
   * Intenta colocar una pieza para CUALQUIERA (bots incluidos).
   *
   * Comprueba lo mismo que la previsualizacion del jugador —madera,
   * alcance, sitio ocupado— y solo entonces la pone. Los bots lo usan
   * para levantar rampas y parapetos.
   *
   * @returns {Structure|null}
   */
  tryPlaceFor(quien, pieceId, cellX, cellY, dir = 1) {
    const piece = pieceOf(pieceId);
    if (this._whyNot(quien, piece, cellX, cellY, dir) !== null) return null;
    return this.place(pieceId, cellX, cellY, dir, quien);
  }

  /**
   * Coloca una pieza sin preguntar (tambien la usan los bots).
   * Cobra la madera y mete las cajas en el mundo.
   */
  place(pieceId, cellX, cellY, dir, owner) {
    const piece = pieceOf(pieceId);
    if (!owner.spendWood?.(piece.cost)) return null;

    const s = new Structure(pieceId, cellX, cellY, dir, owner);
    this.structures.push(s);

    for (const p of s.platforms) this.world.addPlatform(p);

    this.particles?.puff(cellX + GRID / 2, cellY + GRID / 2, 'rgba(200, 165, 110, 0.6)', 6);
    playBuild();
    this.onPlaced?.(s, owner);
    return s;
  }

  /** Quita las cajas de una pieza del mundo. */
  _removePlatforms(s) {
    for (const p of s.platforms) this.world.removePlatform(p);
  }

  /** Una pieza se ha roto: astillas y fuera del mundo. */
  _destroy(s, index) {
    this._removePlatforms(s);
    this.structures.splice(index, 1);
    playBreak();
    this.onBroken?.(s, s.lastHitBy);

    const r = s.tightRect();
    this.particles?.spark(r.x + r.w / 2, r.y + r.h / 2, '#c8a06a', 12, 240);
    this.particles?.puff(r.x + r.w / 2, r.y + r.h / 2, 'rgba(150, 110, 60, 0.55)', 7);
  }

  /* =============================================================
     DANO
     ============================================================= */

  /**
   * Estructura mas cercana a un punto (para el pico).
   * @returns {Structure|null}
   */
  nearestStructure(x, y, range = 60) {
    let mejor = null;
    let mejorD = range;

    for (const s of this.structures) {
      if (s.dead) continue;
      const r = s.tightRect();
      const cx = Math.max(r.x, Math.min(x, r.x + r.w));
      const cy = Math.max(r.y, Math.min(y, r.y + r.h));
      const d = Math.hypot(x - cx, y - cy);
      if (d < mejorD) { mejorD = d; mejor = s; }
    }
    return mejor;
  }

  /** Estructura que ocupa una franja vertical (la usa la IA de los bots). */
  structureBlocking(x0, x1, y0, y1) {
    return this.structures.find((s) => {
      if (s.dead) return false;
      const r = s.tightRect();
      return r.x < x1 && r.x + r.w > x0 && r.y < y1 && r.y + r.h > y0;
    }) || null;
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    for (const s of this.structures) {
      const r = s.rect();
      if (!camera.isVisible(r.x - 10, r.y - 20, r.w + 20, r.h + 30)) continue;
      s.draw(ctx, time);
    }
  }

  /** Silueta translucida de la pieza que se va a colocar. */
  drawPreview(ctx, player, time) {
    const pv = this.preview;
    if (!pv || !player.buildMode) return;

    const verde = pv.ok;
    const pulso = 0.55 + 0.2 * Math.sin(time * 6);

    ctx.save();

    for (const b of pv.piece.boxes(pv.dir)) {
      const x = pv.cellX + b.dx;
      const y = pv.cellY + b.dy;

      ctx.fillStyle = verde
        ? `rgba(110, 230, 120, ${0.30 * pulso + 0.12})`
        : `rgba(235, 90, 80, ${0.30 * pulso + 0.12})`;
      ctx.fillRect(x, y, b.w, b.h);

      ctx.strokeStyle = verde ? 'rgba(140, 255, 150, 0.95)' : 'rgba(255, 130, 120, 0.95)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, b.w - 2, b.h - 2);
    }

    // Recuadro de la celda, para ver la rejilla
    ctx.strokeStyle = verde ? 'rgba(140, 255, 150, 0.35)' : 'rgba(255, 130, 120, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(pv.cellX, pv.cellY, GRID, GRID);
    ctx.setLineDash([]);

    // Motivo por el que no se puede, junto a la celda
    if (!verde && pv.razon) {
      ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10, 16, 34, 0.85)';
      const ancho = ctx.measureText(pv.razon).width + 16;
      ctx.fillRect(pv.cellX + GRID / 2 - ancho / 2, pv.cellY - 24, ancho, 18);
      ctx.fillStyle = '#ff9b8a';
      ctx.fillText(pv.razon, pv.cellX + GRID / 2, pv.cellY - 11);
    }

    ctx.restore();
  }
}

export { PIECE_ORDER };
