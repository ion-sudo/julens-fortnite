/**
 * supplyDrop.js
 * ---------------------------------------------------------------
 * SUPPLY DROP: la caja de suministros que cae del cielo a mitad de
 * partida, como en Fortnite.
 *
 * Tiene dos vidas:
 *
 *   CAYENDO   baja colgada de un paracaidas, con un haz de luz y un
 *             anillo en el suelo marcando donde va a caer. El aviso es
 *             la mitad de la gracia: todo el mundo lo ve y sale
 *             corriendo hacia el mismo sitio.
 *   POSADA    se queda como un cofre grande que se abre con la tecla E
 *             y suelta botin mejor que ningun cofre normal.
 *
 * No colisiona con nada mientras cae: baja en linea recta hasta la
 * altura que le diga el gestor.
 */

import { roundRectPath } from '../core/utils.js';
import { playSupplyLandAt } from '../core/audio.js';
import { control, segunControl } from '../ui/controlHints.js';

/** Lo que baja por segundo (despacio, para que de tiempo a llegar). */
const CAIDA = 105;
/** Altura a la que aparece por encima de su suelo. */
export const ALTURA_SALIDA = 900;
/** Lo que dura la animacion de apertura. */
const APERTURA = 0.6;
/** Distancia a la que se puede abrir. */
export const SUPPLY_RADIUS = 92;

export class SupplyDrop {
  /**
   * @param {number} x        columna por la que cae
   * @param {number} groundY  altura del suelo donde se posa
   */
  constructor(x, groundY) {
    this.x = x;
    this.groundY = groundY;

    this.w = 66;
    this.h = 50;
    this.y = groundY - ALTURA_SALIDA;

    /** 'cayendo' | 'posada' | 'abriendo' | 'abierto' */
    this.state = 'cayendo';
    this.timer = 0;
    this.bob = Math.random() * Math.PI * 2;
    /** Desfase del brillo, para que no parpadeen todas a la vez. */
    this.shimmer = Math.random() * Math.PI * 2;
  }

  get falling() { return this.state === 'cayendo'; }
  get canOpen() { return this.state === 'posada'; }
  get isOpen() { return this.state === 'abierto'; }
  /** Sigue contando como objetivo mientras no este abierta. */
  get active() { return this.state !== 'abierto'; }

  /** ¿Esta este personaje lo bastante cerca para abrirla? */
  isNear(quien) {
    const px = quien.x + quien.w / 2;
    const py = quien.y + quien.h;
    return Math.hypot(px - this.x, py - this.groundY) < SUPPLY_RADIUS;
  }

  /** Empieza la apertura. @returns {boolean} true si estaba cerrada */
  open() {
    if (!this.canOpen) return false;
    this.state = 'abriendo';
    this.timer = APERTURA;
    return true;
  }

  /**
   * @returns {boolean} true la unica vez que termina de abrirse (es
   *   cuando toca soltar el botin)
   */
  update(dt) {
    this.bob += dt * 1.5;

    if (this.state === 'cayendo') {
      this.y += CAIDA * dt;
      if (this.y + this.h >= this.groundY) {
        this.y = this.groundY - this.h;
        this.state = 'posada';
        playSupplyLandAt(this.x, this.y);
      }
      return false;
    }

    if (this.state === 'abriendo') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 0;
        this.state = 'abierto';
        return true;
      }
    }
    return false;
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, time) {
    const cx = this.x;
    const cy = this.y;
    const vaiven = this.falling ? Math.sin(this.bob) * 7 : 0;

    ctx.save();

    // --- Aviso: haz de luz y anillo en el suelo ---
    if (this.active) {
      const pulso = 0.6 + 0.4 * Math.sin(time * 2.6 + this.shimmer);

      if (this.falling) {
        const g = ctx.createLinearGradient(0, cy, 0, this.groundY);
        // Bien marcado: sobre un cielo claro un haz suave no se veia, y
        // el aviso de donde va a caer es media gracia del supply drop.
        g.addColorStop(0, `rgba(90, 200, 255, ${0.42 * pulso})`);
        g.addColorStop(1, 'rgba(90, 200, 255, 0.06)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx - 26, cy);
        ctx.lineTo(cx + 26, cy);
        ctx.lineTo(cx + 72, this.groundY);
        ctx.lineTo(cx - 72, this.groundY);
        ctx.closePath();
        ctx.fill();
      }

      // Anillo: marca el sitio mientras cae y sigue ahi al posarse
      ctx.fillStyle = `rgba(90, 200, 255, ${0.14 * pulso})`;
      ctx.beginPath();
      ctx.ellipse(cx, this.groundY - 2, 58, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(150, 230, 255, ${0.7 + 0.3 * pulso})`;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }

    // --- Paracaidas ---
    if (this.falling) {
      const py = cy - 68;

      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (const dx of [-30, -11, 11, 30]) {
        ctx.moveTo(cx + dx + vaiven, py + 6);
        ctx.lineTo(cx + dx * 0.36, cy + 2);
      }
      ctx.stroke();

      // Tela de gajos rojos y blancos: se ve desde media pantalla
      const R = 50;
      for (let i = 0; i < 8; i++) {
        const a0 = Math.PI + (i * Math.PI) / 8;
        const a1 = Math.PI + ((i + 1) * Math.PI) / 8;
        ctx.fillStyle = i % 2 === 0 ? '#e8434f' : '#f2f4f8';
        ctx.beginPath();
        ctx.moveTo(cx + vaiven, py + 8);
        ctx.arc(cx + vaiven, py + 8, R, a0, a1);
        ctx.closePath();
        ctx.fill();
      }
      // Sombreado del borde
      ctx.strokeStyle = 'rgba(0,0,0,0.16)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + vaiven, py + 8, R, Math.PI, Math.PI * 2);
      ctx.stroke();
    }

    // --- La caja ---
    ctx.translate(cx + vaiven, cy);

    // Sombra en el suelo
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, this.groundY - cy + 2, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const halfW = this.w / 2;

    // Cuerpo metalico
    ctx.fillStyle = '#5b6874';
    roundRectPath(ctx, -halfW, 0, this.w, this.h, 5);
    ctx.fill();
    ctx.fillStyle = '#79879a';
    ctx.fillRect(-halfW, 0, this.w, 5);
    ctx.fillStyle = '#454f5a';
    ctx.fillRect(-halfW, this.h - 10, this.w, 10);

    // Franjas de aviso, en diagonal
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, -halfW, 10, this.w, 20, 2);
    ctx.clip();
    for (let i = -3; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#f5c23f' : '#2f3542';
      ctx.beginPath();
      ctx.moveTo(-halfW + i * 12, 10);
      ctx.lineTo(-halfW + i * 12 + 8, 10);
      ctx.lineTo(-halfW + i * 12 - 4, 30);
      ctx.lineTo(-halfW + i * 12 - 12, 30);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Refuerzos de las esquinas
    ctx.fillStyle = '#8d97a6';
    ctx.fillRect(-halfW, 0, 5, this.h);
    ctx.fillRect(halfW - 5, 0, 5, this.h);

    // Tapa: se levanta al abrirse
    const p = this.state === 'cayendo' || this.state === 'posada'
      ? 0
      : 1 - Math.max(0, this.timer) / APERTURA;

    ctx.save();
    ctx.translate(-halfW, 0);
    ctx.rotate(-p * 2.0);
    ctx.fillStyle = '#79879a';
    roundRectPath(ctx, 0, -11, this.w, 12, 4);
    ctx.fill();
    ctx.fillStyle = '#5b6874';
    ctx.fillRect(0, -11, this.w, 4);
    ctx.fillStyle = '#f5c23f';
    ctx.fillRect(this.w / 2 - 9, -11, 18, 12);
    ctx.restore();

    // Brillo del interior al abrirse
    if (p > 0.1) {
      ctx.fillStyle = `rgba(255, 235, 150, ${0.6 * p})`;
      ctx.beginPath();
      ctx.ellipse(0, 4, halfW * 0.85, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /** Cartel "E para abrir", solo cuando estas al lado. */
  drawPrompt(ctx) {
    if (!this.canOpen) return;

    const texto = `${control('pickup')}  ·  SUMINISTROS`;
    ctx.save();
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    const ancho = ctx.measureText(texto).width + 24;
    const x = this.x - ancho / 2;
    const y = this.groundY - this.h - 34;

    ctx.fillStyle = 'rgba(10, 16, 34, 0.9)';
    roundRectPath(ctx, x, y, ancho, 24, 7);
    ctx.fill();
    ctx.strokeStyle = '#78d7ff';
    ctx.lineWidth = 2;
    roundRectPath(ctx, x, y, ancho, 24, 7);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, this.x, y + 13);
    ctx.restore();
  }
}
