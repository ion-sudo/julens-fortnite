/**
 * chest.js
 * ---------------------------------------------------------------
 * COFRES al estilo Fortnite: cajas de madera con herrajes dorados que
 * brillan un poco para que se vean de lejos.
 *
 * Ciclo de vida:
 *   'cerrado'   -> se puede abrir con la tecla E si estas cerca
 *   'abriendo'  -> animacion: la tapa gira y salen destellos (0,55 s)
 *   'abierto'   -> queda vacio para siempre; ya no se puede volver a abrir
 *
 * El cofre NO decide que suelta: de eso se encarga systems/chests.js,
 * que le pide el botin a data/loot.js y crea los Pickup.
 *
 * COFRES DORADOS (Julen Blitz): los mismos, pero de oro y con un
 * resplandor mas grande, para que se vean desde el otro lado del mapa
 * y todo el mundo salga corriendo hacia el mismo sitio. Dan un
 * potenciador ademas de botin de rareza alta.
 */

import { CONFIG } from '../core/config.js';
import { control, segunControl } from '../ui/controlHints.js';

/** Los dos aspectos del cofre: el normal de madera y el dorado. */
const MADERA = {
  cuerpo: '#8a5c2f', veta: '#6b4522', herraje: '#e0a63a', tapa: '#9c6a37',
};
const DORADO = {
  cuerpo: '#e8b53a', veta: '#a87a17', herraje: '#fff3b0', tapa: '#f5cc55',
};

/** Distancia (px) a la que se puede abrir. */
export const CHEST_RADIUS = 74;

/** Lo que dura la animacion de apertura. */
const OPEN_TIME = 0.55;

export class Chest {
  /**
   * @param {number} x  centro del cofre
   * @param {number} groundY  altura del suelo donde se apoya
   * @param {object|null} zone  zona con nombre en la que esta (o null)
   */
  constructor(x, groundY, zone = null, golden = false) {
    this.x = x;
    this.groundY = groundY;
    this.zone = zone;

    /** Cofre DORADO: mejor botin y un potenciador (solo en Julen Blitz). */
    this.golden = golden;

    this.w = golden ? 52 : 46;
    this.h = 34;

    /** 'cerrado' | 'abriendo' | 'abierto' */
    this.state = 'cerrado';
    this.openTimer = 0;

    // Desfase para que no brillen todos a la vez
    this.shimmer = Math.random() * Math.PI * 2;
  }

  get isOpen() { return this.state === 'abierto'; }
  get canOpen() { return this.state === 'cerrado'; }

  /** Rectangulo del cofre en el mundo. */
  rect() {
    return { x: this.x - this.w / 2, y: this.groundY - this.h, w: this.w, h: this.h };
  }

  /** ¿Esta el jugador lo bastante cerca para abrirlo? */
  isNear(player) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h;
    return Math.hypot(px - this.x, py - this.groundY) < CHEST_RADIUS;
  }

  /**
   * Empieza la animacion de apertura.
   * @returns {boolean} true si se ha abierto de verdad (estaba cerrado)
   */
  open() {
    if (!this.canOpen) return false;
    this.state = 'abriendo';
    this.openTimer = OPEN_TIME;
    return true;
  }

  update(dt) {
    if (this.state !== 'abriendo') return;

    this.openTimer -= dt;
    if (this.openTimer <= 0) {
      this.openTimer = 0;
      this.state = 'abierto';
    }
  }

  /** Progreso de la apertura [0..1]. */
  get openProgress() {
    if (this.state === 'cerrado') return 0;
    if (this.state === 'abierto') return 1;
    return 1 - this.openTimer / OPEN_TIME;
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, time) {
    const p = this.openProgress;
    // La tapa gira hasta unos 115 grados hacia atras, con un rebote suave
    const lidAngle = -easeOutBack(p) * 2.0;

    ctx.save();

    // Paleta: el dorado usa oro donde el normal usa madera.
    const C = this.golden ? DORADO : MADERA;

    // --- Resplandor del cofre cerrado (para verlo de lejos) ---
    if (this.state !== 'abierto') {
      const pulso = 0.55 + 0.45 * Math.sin(time * 2.4 + this.shimmer);
      // El dorado brilla casi el doble de lejos: es el que hace que
      // varios jugadores se junten en el mismo sitio a la vez.
      const radio = this.golden ? 108 : 62;
      const g = ctx.createRadialGradient(
        this.x, this.groundY - 18, 4,
        this.x, this.groundY - 18, radio
      );
      g.addColorStop(0, `rgba(255, 210, 63, ${(this.golden ? 0.52 : 0.34) * pulso})`);
      g.addColorStop(1, 'rgba(255, 210, 63, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(this.x, this.groundY - 18, radio, radio * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();

      // Y ademas, tres chispas dando vueltas alrededor.
      if (this.golden) {
        ctx.fillStyle = '#fff3b0';
        for (let i = 0; i < 3; i++) {
          const a = time * 1.6 + this.shimmer + (i * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.arc(
            this.x + Math.cos(a) * 34,
            this.groundY - 20 + Math.sin(a) * 16,
            2.4, 0, Math.PI * 2
          );
          ctx.fill();
        }
      }
    }

    // --- Sombra en el suelo ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.20)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.groundY + 1, this.w * 0.58, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const baseY = this.groundY;
    const halfW = this.w / 2;
    const bodyH = 22;

    // --- Interior (solo se ve cuando la tapa se levanta) ---
    if (p > 0.05) {
      ctx.fillStyle = '#2a1a0e';
      ctx.fillRect(this.x - halfW + 3, baseY - bodyH - 4, this.w - 6, 10);
      // Brillo dorado del interior al abrirse
      const brillo = ctx.createLinearGradient(0, baseY - bodyH - 30, 0, baseY - bodyH);
      brillo.addColorStop(0, `rgba(255, 240, 170, 0)`);
      brillo.addColorStop(1, `rgba(255, 230, 130, ${0.55 * p})`);
      ctx.fillStyle = brillo;
      ctx.fillRect(this.x - halfW, baseY - bodyH - 30, this.w, 30);
    }

    // --- Cuerpo del cofre ---
    ctx.fillStyle = C.cuerpo;
    roundRect(ctx, this.x - halfW, baseY - bodyH, this.w, bodyH, 4);
    ctx.fill();
    // Vetas
    ctx.fillStyle = C.veta;
    ctx.fillRect(this.x - halfW, baseY - 7, this.w, 3);
    ctx.fillRect(this.x - halfW, baseY - bodyH, 4, bodyH);
    ctx.fillRect(this.x + halfW - 4, baseY - bodyH, 4, bodyH);
    // Herrajes
    ctx.fillStyle = C.herraje;
    ctx.fillRect(this.x - halfW + 8, baseY - bodyH, 5, bodyH);
    ctx.fillRect(this.x + halfW - 13, baseY - bodyH, 5, bodyH);

    // --- Tapa (gira sobre la bisagra trasera) ---
    ctx.save();
    ctx.translate(this.x - halfW, baseY - bodyH);
    ctx.rotate(lidAngle);

    ctx.fillStyle = C.tapa;
    roundRect(ctx, 0, -13, this.w, 14, 5);
    ctx.fill();
    ctx.fillStyle = C.veta;
    ctx.fillRect(0, -13, this.w, 4);
    ctx.fillStyle = C.herraje;
    ctx.fillRect(8, -13, 5, 14);
    ctx.fillRect(this.w - 13, -13, 5, 14);

    ctx.restore();

    // --- Cerradura (desaparece al abrirse) ---
    if (p < 0.4) {
      ctx.globalAlpha = 1 - p / 0.4;
      ctx.fillStyle = '#ffd23f';
      roundRect(ctx, this.x - 6, baseY - bodyH - 4, 12, 11, 3);
      ctx.fill();
      ctx.fillStyle = '#6b4522';
      ctx.beginPath();
      ctx.arc(this.x, baseY - bodyH + 1, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    if (CONFIG.debug.showHitboxes) {
      const r = this.rect();
      ctx.strokeStyle = 'rgba(255, 210, 63, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  }

  /** Cartel "E para abrir" encima del cofre. */
  drawPrompt(ctx) {
    const texto = `${control('pickup')} para abrir`;
    const y = this.groundY - 74;

    ctx.save();
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    const ancho = ctx.measureText(texto).width + 26;

    ctx.fillStyle = 'rgba(10, 16, 34, 0.9)';
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2;
    roundRect(ctx, this.x - ancho / 2, y, ancho, 30, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(texto, this.x, y + 20);

    // Flechita hacia el cofre
    ctx.fillStyle = 'rgba(10, 16, 34, 0.9)';
    ctx.beginPath();
    ctx.moveTo(this.x - 6, y + 30);
    ctx.lineTo(this.x + 6, y + 30);
    ctx.lineTo(this.x, y + 37);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

/* ---------- utilidades ---------- */

/** Rebote suave al final de la animacion de la tapa. */
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
