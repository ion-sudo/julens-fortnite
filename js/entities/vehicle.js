/**
 * vehicle.js
 * ---------------------------------------------------------------
 * UN VEHICULO.
 *
 * Tiene su propia fisica, sencilla y parecida a la del jugador: gravedad,
 * colision AABB eje por eje y salto. Dos diferencias importantes:
 *
 *   - va MUCHO mas rapido (hasta 900 px/s frente a los 400 corriendo)
 *   - sube escalones de hasta `stepUp` px sin saltar, porque un coche
 *     que se atasca en cada bordillo del terreno no se puede conducir
 *
 * Mientras nadie lo conduce se queda quieto en el suelo; solo se le
 * aplica fisica cuando esta ocupado o cayendo.
 */

import { CONFIG } from '../core/config.js';
import { vehicleType } from '../data/vehicles.js';
import { roundRectPath } from '../core/utils.js';

export class Vehicle {
  /**
   * @param {object} world
   * @param {string} typeId
   * @param {number} x  centro
   * @param {number} groundY  suelo sobre el que se apoya
   */
  constructor(world, typeId, x, groundY) {
    this.world = world;
    this.def = vehicleType(typeId);

    this.w = this.def.w;
    this.h = this.def.h;
    this.x = x - this.w / 2;
    this.y = groundY - this.h;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.facing = 1;

    /** Quien lo conduce, o null. */
    this.driver = null;
    /** Giro de las ruedas, para el dibujo. */
    this.wheelSpin = 0;
    /** Se mece un poco al acelerar y al frenar. */
    this.tilt = 0;
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  /** Donde va sentado el conductor. */
  get seatX() { return this.x + this.w / 2 - 2; }
  get seatY() { return this.y + this.def.seatY; }

  /* =============================================================
     FISICA
     ============================================================= */

  /**
   * @param {number} dt
   * @param {object|null} input  mando del conductor (null = parado)
   */
  update(dt, input) {
    const d = this.def;

    // --- Acelerar / frenar ---
    const eje = input ? input.axisX : 0;

    if (eje !== 0) {
      this.facing = eje;
      this.vx += eje * d.accel * dt;
      this.vx = Math.max(-d.speed, Math.min(d.speed, this.vx));
    } else {
      // Sin gas, frena solo
      const signo = Math.sign(this.vx);
      this.vx -= signo * d.brake * dt;
      if (Math.sign(this.vx) !== signo) this.vx = 0;
    }

    // --- Salto ---
    if (input && this.onGround && d.jump > 0 && input.isDown('jump')) {
      this.vy = -d.jump;
      this.onGround = false;
    }

    // --- Gravedad ---
    this.vy = Math.min(this.vy + CONFIG.world.gravity * dt, CONFIG.world.maxFallSpeed);

    this._moveAndCollide(dt);

    // --- Detalles del dibujo ---
    this.wheelSpin += (this.vx / 26) * dt;
    const objetivo = eje !== 0 ? -eje * 0.06 : 0;
    this.tilt += (objetivo - this.tilt) * Math.min(1, dt * 6);
  }

  _moveAndCollide(dt) {
    const d = this.def;

    // ---- Eje X ----
    this.x += this.vx * dt;

    for (const p of this.world.getPlatformsNear(this)) {
      if (p.oneWay) continue;
      if (!this._overlaps(p)) continue;

      // Bordillo bajito: se sube sin frenar. Un coche que se para en
      // cada escalon del terreno no hay quien lo conduzca.
      const escalon = (this.y + this.h) - p.y;
      if (escalon > 0 && escalon <= d.stepUp) {
        this.y = p.y - this.h;
        continue;
      }

      if (this.vx > 0) this.x = p.x - this.w;
      else if (this.vx < 0) this.x = p.x + p.w;
      this.vx = 0;
    }

    this.x = Math.max(0, Math.min(this.x, this.world.width - this.w));

    // ---- Eje Y ----
    const antes = this.y + this.h;
    this.y += this.vy * dt;
    this.onGround = false;

    for (const p of this.world.getPlatformsNear(this)) {
      if (!this._overlaps(p)) continue;

      // Las plataformas finas solo sostienen desde arriba
      if (p.oneWay) {
        if (this.vy < 0 || antes > p.y + 2) continue;
      }

      if (this.vy > 0) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.onGround = true;
      } else if (this.vy < 0 && !p.oneWay) {
        this.y = p.y + p.h;
        this.vy = 0;
      }
    }
  }

  _overlaps(p) {
    return this.x < p.x + p.w && this.x + this.w > p.x &&
           this.y < p.y + p.h && this.y + this.h > p.y;
  }

  /** ¿Esta este personaje lo bastante cerca para subirse? */
  isNear(quien, radio = 90) {
    const qx = quien.x + quien.w / 2;
    const qy = quien.y + quien.h / 2;
    return Math.hypot(qx - this.centerX, qy - this.centerY) < radio;
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, time) {
    const d = this.def;

    ctx.save();
    ctx.translate(this.centerX, this.y + this.h);
    ctx.rotate(this.tilt);
    ctx.scale(this.facing, 1);

    const w = this.w;
    const h = this.h;

    // --- Sombra ---
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 2, w * 0.46, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Ruedas (detras del chasis) ---
    const rr = h * 0.34;
    for (const rx of [-w * 0.29, w * 0.29]) this._wheel(ctx, rx, -rr + 1, rr);

    // --- Chasis ---
    ctx.fillStyle = d.body;
    roundRectPath(ctx, -w / 2, -h, w, h - rr * 0.5, 8);
    ctx.fill();

    // Sombra de abajo
    ctx.fillStyle = d.bodyDark;
    roundRectPath(ctx, -w / 2, -h * 0.42, w, h * 0.42 - rr * 0.5, 6);
    ctx.fill();

    // Franja de color
    ctx.fillStyle = d.accent;
    ctx.fillRect(-w / 2 + 4, -h * 0.52, w - 8, 3);

    // --- Techo y cristal ---
    if (d.roof) {
      ctx.fillStyle = d.roof;
      ctx.beginPath();
      ctx.moveTo(-w * 0.28, -h);
      ctx.lineTo(-w * 0.16, -h - 15);
      ctx.lineTo(w * 0.20, -h - 15);
      ctx.lineTo(w * 0.30, -h);
      ctx.closePath();
      ctx.fill();

      if (d.glass) {
        ctx.fillStyle = d.glass;
        ctx.beginPath();
        ctx.moveTo(w * 0.02, -h - 1);
        ctx.lineTo(w * 0.02, -h - 12);
        ctx.lineTo(w * 0.19, -h - 12);
        ctx.lineTo(w * 0.27, -h - 1);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Sin techo: barra antivuelco
      ctx.strokeStyle = d.bodyDark;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-w * 0.12, -h);
      ctx.lineTo(-w * 0.06, -h - 14);
      ctx.lineTo(w * 0.14, -h - 14);
      ctx.lineTo(w * 0.20, -h);
      ctx.stroke();
    }

    // --- Faro ---
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.ellipse(w / 2 - 5, -h * 0.62, 4, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Contorno ---
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.6;
    roundRectPath(ctx, -w / 2, -h, w, h - rr * 0.5, 8);
    ctx.stroke();

    ctx.restore();
  }

  _wheel(ctx, x, y, r) {
    const d = this.def;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = d.wheel;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Llanta con radios, para que se vea girar
    ctx.rotate(this.wheelSpin);
    ctx.strokeStyle = d.rim;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3));
      ctx.lineTo(-Math.cos(a) * (r - 3), -Math.sin(a) * (r - 3));
      ctx.stroke();
    }

    ctx.fillStyle = d.rim;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
