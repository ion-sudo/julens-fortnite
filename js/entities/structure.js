/**
 * structure.js
 * ---------------------------------------------------------------
 * UNA PIEZA CONSTRUIDA (pared, suelo o rampa).
 *
 * Cada pieza aporta al mundo una o varias CAJAS DE COLISION normales,
 * asi que para la fisica es terreno como cualquier otro: la pared
 * bloquea, el suelo sostiene y la rampa se sube. Las cajas llevan una
 * referencia `structure` para que las balas y el pico sepan a quien
 * hacer dano cuando le dan.
 */

import { pieceOf, GRID } from '../data/structures.js';

export class Structure {
  /**
   * @param {string} pieceId  'pared' | 'suelo' | 'rampa'
   * @param {number} cellX,cellY  esquina de la celda (ya ajustada a la rejilla)
   * @param {number} dir  1 o -1: hacia donde sube la rampa
   * @param {object} owner  quien la construyo (jugador o bot)
   */
  constructor(pieceId, cellX, cellY, dir, owner) {
    this.piece = pieceOf(pieceId);
    this.cellX = cellX;
    this.cellY = cellY;
    this.dir = dir >= 0 ? 1 : -1;
    this.owner = owner;
    this.ownerId = owner?.id ?? null;

    this.maxHealth = this.piece.health;
    this.health = this.maxHealth;
    this.dead = false;

    /** Parpadeo al recibir un golpe. */
    this.hitFlash = 0;
    /** Animacion de aparicion. */
    this.pop = 1;

    /** Cajas de colision, ya en coordenadas del mundo. */
    this.platforms = this.piece.boxes(this.dir).map((b) => ({
      x: cellX + b.dx,
      y: cellY + b.dy,
      w: b.w,
      h: b.h,
      oneWay: false,
      ground: false,
      structure: this,          // referencia inversa: por aqui le llega el dano
      // Los peldanos de la rampa se suben ANDANDO, sin saltar en cada uno
      // (ver Player._moveAndCollide).
      ramp: this.piece.id === 'rampa',
    }));
  }

  /** Rectangulo que engloba toda la pieza. */
  rect() {
    return { x: this.cellX, y: this.cellY, w: GRID, h: GRID };
  }

  /** Rectangulo ajustado a lo que ocupa de verdad (para los solapes). */
  tightRect() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of this.platforms) {
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x + p.w); y1 = Math.max(y1, p.y + p.h);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /**
   * Recibe dano de un disparo o de un pico.
   * @returns {boolean} true si la pieza acaba de romperse
   */
  takeDamage(amount, source = null) {
    if (this.dead) return false;

    // Quien dio el ultimo golpe: asi el gestor sabe a quien apuntarle la
    // construccion rota (lo usan las misiones).
    this.lastHitBy = source || null;

    this.health -= amount;
    this.hitFlash = 0.14;

    if (this.health > 0) return false;

    this.health = 0;
    this.dead = true;
    return true;
  }

  update(dt) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.pop = Math.max(0, this.pop - dt * 4);
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, time) {
    const dano = 1 - this.health / this.maxHealth;

    ctx.save();

    // Al colocarse, la pieza "crece" un instante desde el centro.
    if (this.pop > 0) {
      const r = this.rect();
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const s = 1 + this.pop * 0.12;
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.translate(-cx, -cy);
      ctx.globalAlpha = 1 - this.pop * 0.35;
    }

    for (const p of this.platforms) this._drawPlank(ctx, p, dano);

    ctx.restore();

    // Barra de vida solo si esta tocada
    if (dano > 0.02 && !this.dead) this._drawHealth(ctx);
  }

  _drawPlank(ctx, p, dano) {
    // La madera se oscurece y se agrieta segun el dano.
    const base = this.hitFlash > 0 ? '#ffffff' : mezcla('#c08a4e', '#6b4522', dano);
    const claro = this.hitFlash > 0 ? '#ffffff' : mezcla('#dcae74', '#8a5c2f', dano);

    ctx.fillStyle = base;
    ctx.fillRect(p.x, p.y, p.w, p.h);

    // Borde superior mas claro
    ctx.fillStyle = claro;
    ctx.fillRect(p.x, p.y, p.w, Math.min(4, p.h * 0.3));

    // Marco
    ctx.strokeStyle = 'rgba(70, 44, 20, 0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);

    // Vetas
    ctx.strokeStyle = 'rgba(70, 44, 20, 0.35)';
    ctx.lineWidth = 1;
    if (p.w > p.h) {
      for (let x = p.x + 14; x < p.x + p.w - 6; x += 18) {
        ctx.beginPath(); ctx.moveTo(x, p.y + 3); ctx.lineTo(x, p.y + p.h - 3); ctx.stroke();
      }
    } else {
      for (let y = p.y + 14; y < p.y + p.h - 6; y += 18) {
        ctx.beginPath(); ctx.moveTo(p.x + 3, y); ctx.lineTo(p.x + p.w - 3, y); ctx.stroke();
      }
    }

    // Grietas cuando esta muy tocada
    if (dano > 0.5) {
      ctx.strokeStyle = 'rgba(40, 24, 10, 0.7)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x + p.w * 0.3, p.y + 2);
      ctx.lineTo(p.x + p.w * 0.55, p.y + p.h * 0.5);
      ctx.lineTo(p.x + p.w * 0.35, p.y + p.h - 2);
      ctx.stroke();
    }
  }

  _drawHealth(ctx) {
    const r = this.tightRect();
    const ancho = Math.max(28, r.w);
    const x = r.x + r.w / 2 - ancho / 2;
    const y = r.y - 9;

    ctx.fillStyle = 'rgba(10, 16, 34, 0.75)';
    ctx.fillRect(x - 1, y - 1, ancho + 2, 6);
    ctx.fillStyle = '#c8a06a';
    ctx.fillRect(x, y, ancho * (this.health / this.maxHealth), 4);
  }
}

/** Mezcla dos colores hexadecimales. */
function mezcla(a, b, t) {
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const r = Math.round(((ca >> 16) & 255) * (1 - t) + ((cb >> 16) & 255) * t);
  const g = Math.round(((ca >> 8) & 255) * (1 - t) + ((cb >> 8) & 255) * t);
  const bl = Math.round((ca & 255) * (1 - t) + (cb & 255) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
