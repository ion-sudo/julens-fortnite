/**
 * battleBus.js
 * ---------------------------------------------------------------
 * EL BUS DE BATALLA: un autobus volador colgado de un globo que cruza
 * el cielo por encima del mapa al empezar la partida.
 *
 * Es de donde saltan el jugador y los 74 bots. El bus no colisiona con
 * nada: solo se mueve en linea recta de un extremo al otro del mundo y
 * se dibuja bien grande para que se vea.
 */

import { CONFIG } from '../core/config.js';

export class BattleBus {
  /**
   * @param {import('../world/level.js').World} world
   * @param {() => number} rng
   * @param {object} opciones
   *   bounds     { x0, x1 } tramo que sobrevuela. Por defecto, el mapa
   *              entero; los modos de mapa reducido pasan el suyo.
   *   crossTime  segundos en recorrerlo (por defecto, CONFIG.bus)
   */
  constructor(world, rng = Math.random, opciones = {}) {
    const C = CONFIG.bus;

    this.world = world;
    this.w = 260;
    this.h = 110;

    const x0 = opciones.bounds ? opciones.bounds.x0 : 0;
    const x1 = opciones.bounds ? opciones.bounds.x1 : world.width;

    // La ruta cruza el tramo entero. Empieza DENTRO a proposito: la
    // camara no puede salirse de los limites del mapa, asi que si el bus
    // arrancase fuera, no se veria.
    this.dir = rng() < 0.5 ? 1 : -1;
    // El margen es media pantalla: asi el bus arranca ya centrado en
    // camara y no aparece pegado al borde. En un tramo corto se recorta,
    // porque si no el bus casi no tendria por donde volar.
    const MARGEN = Math.min(520, (x1 - x0) * 0.16);
    this.startX = this.dir > 0 ? x0 + MARGEN : x1 - MARGEN;
    this.endX = this.dir > 0 ? x1 - MARGEN : x0 + MARGEN;
    this.x = this.startX;
    this.y = C.altitude;

    // Velocidad para tardar `crossTime` segundos en cruzar.
    const crossTime = opciones.crossTime || C.crossTime;
    this.speed = Math.abs(this.endX - this.startX) / crossTime;

    /** Balanceo suave del globo. */
    this.bob = 0;
    /** true cuando ya ha salido del mapa por el otro lado. */
    this.finished = false;
  }

  /** Punto del que cuelgan los pasajeros (la puerta del bus). */
  get doorX() { return this.x; }
  get doorY() { return this.y + this.h * 0.42; }

  /** Cuanto le queda de recorrido, de 0 (empieza) a 1 (se va). */
  get progress() {
    const total = Math.abs(this.endX - this.startX);
    const hecho = Math.abs(this.x - this.startX);
    return Math.max(0, Math.min(1, hecho / total));
  }

  update(dt) {
    this.x += this.dir * this.speed * dt;
    this.bob += dt;

    if (this.dir > 0 && this.x >= this.endX) { this.x = this.endX; this.finished = true; }
    if (this.dir < 0 && this.x <= this.endX) { this.x = this.endX; this.finished = true; }
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, time) {
    const flot = Math.sin(this.bob * 1.6) * 6;

    ctx.save();
    ctx.translate(this.x, this.y + flot);
    // Mira hacia donde vuela
    ctx.scale(this.dir, 1);

    this._drawBalloon(ctx, time);
    this._drawRopes(ctx);
    this._drawBus(ctx);
    this._drawThrusters(ctx, time);

    ctx.restore();
  }

  /** Globo azul con gajos, como el de Fortnite. */
  _drawBalloon(ctx, time) {
    const cy = -118;

    ctx.fillStyle = '#3f8fe8';
    ctx.beginPath();
    ctx.ellipse(0, cy, 88, 74, 0, 0, Math.PI * 2);
    ctx.fill();

    // Gajos mas claros
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 30, cy, 11, 72, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Brillo
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-32, cy - 28, 24, 15, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Franja inferior
    ctx.fillStyle = '#2456a8';
    ctx.beginPath();
    ctx.ellipse(0, cy + 58, 52, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawRopes(ctx) {
    ctx.strokeStyle = '#3b4453';
    ctx.lineWidth = 3;
    for (const dx of [-78, -30, 30, 78]) {
      ctx.beginPath();
      ctx.moveTo(dx * 0.55, -62);
      ctx.lineTo(dx, -6);
      ctx.stroke();
    }
  }

  /** El autobus amarillo. */
  _drawBus(ctx) {
    const w = this.w;
    const h = this.h;
    const x = -w / 2;
    const y = -h / 2;

    // Sombra bajo el bus
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 6, w * 0.42, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Carroceria
    ctx.fillStyle = '#f5c23f';
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();

    // Techo y bajos
    ctx.fillStyle = '#d9a327';
    roundRect(ctx, x, y, w, 18, 14);
    ctx.fill();
    ctx.fillRect(x + 8, y + h - 16, w - 16, 12);

    // Morro redondeado delante
    ctx.fillStyle = '#f5c23f';
    ctx.beginPath();
    ctx.ellipse(x + w - 6, 0, 22, h / 2 - 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ventanas
    ctx.fillStyle = '#9fe0ff';
    for (let i = 0; i < 4; i++) {
      roundRect(ctx, x + 22 + i * 48, y + 26, 38, 30, 6);
      ctx.fill();
    }
    // Parabrisas
    ctx.beginPath();
    ctx.ellipse(x + w - 4, -6, 15, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Puerta (por donde se salta)
    ctx.fillStyle = '#2f6fb8';
    roundRect(ctx, x + 6, y + 24, 14, h - 44, 4);
    ctx.fill();

    // Franja lateral
    ctx.fillStyle = '#e05a4a';
    ctx.fillRect(x + 6, y + 64, w - 30, 8);

    // Ruedas (decorativas, va volando)
    ctx.fillStyle = '#2b3240';
    for (const rx of [x + 52, x + w - 60]) {
      ctx.beginPath();
      ctx.arc(rx, h / 2 - 2, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5b6874';
      ctx.beginPath();
      ctx.arc(rx, h / 2 - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b3240';
    }
  }

  /** Llamitas de los propulsores traseros. */
  _drawThrusters(ctx, time) {
    const x = -this.w / 2;
    const parpadeo = 0.7 + 0.3 * Math.sin(time * 22);

    for (const dy of [-18, 16]) {
      ctx.fillStyle = '#5b6874';
      roundRect(ctx, x - 22, dy - 9, 22, 18, 5);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 170, 60, ${parpadeo})`;
      ctx.beginPath();
      ctx.moveTo(x - 22, dy - 7);
      ctx.quadraticCurveTo(x - 52 * parpadeo, dy, x - 22, dy + 7);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = `rgba(255, 240, 190, ${parpadeo})`;
      ctx.beginPath();
      ctx.moveTo(x - 22, dy - 4);
      ctx.quadraticCurveTo(x - 34 * parpadeo, dy, x - 22, dy + 4);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** roundRect propio (compatible con navegadores sin ctx.roundRect). */
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
