/**
 * weaponDrop.js
 * ---------------------------------------------------------------
 * LA CAJA QUE CAE DEL CIELO al subir de nivel Blitz.
 *
 * Es un paquete con paracaidas que aparece muy por encima de ti, baja
 * despacio y, al tocar el suelo, se abre y suelta el arma del nivel.
 *
 * Se hace asi y no metiendo el arma en el inventario sin mas porque
 * subir de nivel tiene que VERSE: el paracaidas cayendo mientras
 * peleas se ve desde lejos, avisa a los demas de que has subido y te
 * obliga a decidir si vas a por el ahora o despues.
 *
 * No colisiona con nada: cae en linea recta hasta la altura del suelo
 * que tenga debajo.
 */

import { roundRectPath } from '../core/utils.js';

/** Lo que baja por segundo. */
const CAIDA = 190;
/** Altura a la que aparece por encima del suelo. */
export const ALTURA_SALIDA = 620;
/** Lo que tarda en abrirse una vez ha tocado tierra. */
const APERTURA = 0.5;

export class WeaponDrop {
  /**
   * @param {number} x        columna por la que cae
   * @param {number} groundY  altura del suelo donde va a posarse
   * @param {object} item     el arma que suelta al abrirse
   * @param {string} color    color de la rareza, para la tela y la luz
   */
  constructor(x, groundY, item, color = '#ffd23f') {
    this.x = x;
    this.groundY = groundY;
    this.item = item;
    this.color = color;

    this.w = 42;
    this.h = 34;
    this.y = groundY - ALTURA_SALIDA;

    /** 'cayendo' | 'abriendo' | 'listo' */
    this.state = 'cayendo';
    this.timer = 0;
    /** Balanceo del paracaidas. */
    this.bob = Math.random() * Math.PI * 2;
    /** true cuando ya ha soltado el arma y se puede tirar. */
    this.done = false;
  }

  get landed() { return this.state !== 'cayendo'; }

  /**
   * @returns {object|null} el arma, la unica vez que toca soltarla
   */
  update(dt) {
    this.bob += dt * 2.2;

    if (this.state === 'cayendo') {
      this.y += CAIDA * dt;
      if (this.y + this.h >= this.groundY) {
        this.y = this.groundY - this.h;
        this.state = 'abriendo';
        this.timer = APERTURA;
      }
      return null;
    }

    if (this.state === 'abriendo') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'listo';
        this.done = true;
        return this.item;      // <- se suelta una sola vez
      }
    }
    return null;
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, time) {
    const cx = this.x;
    const cy = this.y;
    const vaiven = Math.sin(this.bob) * (this.state === 'cayendo' ? 5 : 0);

    ctx.save();

    // --- Haz de luz hasta el suelo: es lo que se ve desde lejos ---
    if (!this.done) {
      const g = ctx.createLinearGradient(0, cy, 0, this.groundY);
      g.addColorStop(0, hexA(this.color, 0.28));
      g.addColorStop(1, hexA(this.color, 0.02));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy);
      ctx.lineTo(cx + 16, cy);
      ctx.lineTo(cx + 46, this.groundY);
      ctx.lineTo(cx - 46, this.groundY);
      ctx.closePath();
      ctx.fill();

      // Anillo en el suelo, marcando donde va a caer
      ctx.strokeStyle = hexA(this.color, 0.75);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, this.groundY - 2, 40, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // --- Paracaidas (solo mientras cae) ---
    if (this.state === 'cayendo') {
      const py = cy - 46;

      // Cuerdas
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (const dx of [-20, -7, 7, 20]) {
        ctx.moveTo(cx + dx + vaiven * 1.4, py + 4);
        ctx.lineTo(cx + dx * 0.35, cy + 2);
      }
      ctx.stroke();

      // Tela, en gajos alternos
      const R = 34;
      for (let i = 0; i < 6; i++) {
        const a0 = Math.PI + (i * Math.PI) / 6;
        const a1 = Math.PI + ((i + 1) * Math.PI) / 6;
        ctx.fillStyle = i % 2 === 0 ? this.color : '#f2f4f8';
        ctx.beginPath();
        ctx.moveTo(cx + vaiven * 1.4, py + 6);
        ctx.arc(cx + vaiven * 1.4, py + 6, R, a0, a1);
        ctx.closePath();
        ctx.fill();
      }
    }

    // --- La caja ---
    const abierta = this.state !== 'cayendo';
    ctx.translate(cx + vaiven, cy);

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, this.groundY - cy + 2, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo
    ctx.fillStyle = '#4a5164';
    roundRectPath(ctx, -this.w / 2, 0, this.w, this.h, 4);
    ctx.fill();
    ctx.fillStyle = '#333949';
    ctx.fillRect(-this.w / 2, this.h - 8, this.w, 8);

    // Franjas de la rareza
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w / 2, 6, this.w, 5);
    ctx.fillRect(-this.w / 2, this.h - 16, this.w, 4);

    // Tapa: cerrada mientras cae, levantada al abrirse
    const p = abierta ? 1 - Math.max(0, this.timer) / APERTURA : 0;
    ctx.save();
    ctx.translate(-this.w / 2, 0);
    ctx.rotate(-p * 1.9);
    ctx.fillStyle = '#79839b';
    roundRectPath(ctx, 0, -8, this.w, 9, 3);
    ctx.fill();
    ctx.restore();

    // Brillo de dentro al abrirse
    if (p > 0.1) {
      ctx.fillStyle = hexA(this.color, 0.55 * p);
      ctx.beginPath();
      ctx.ellipse(0, 2, this.w * 0.42, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/** Un color hex con transparencia. */
function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
