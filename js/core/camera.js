/**
 * camera.js
 * ---------------------------------------------------------------
 * Camara 2D que sigue al jugador con suavizado y "look ahead"
 * (se adelanta en la direccion en la que corre). Queda limitada
 * a los bordes del mundo para no ensenar el vacio.
 */

import { CONFIG } from './config.js';
import { clamp, damp } from './utils.js';

export class Camera {
  constructor(viewWidth, viewHeight, world) {
    this.zoom = CONFIG.camera.zoom;
    // Area del MUNDO que cabe en pantalla (menor cuanto mayor es el zoom).
    this.w = viewWidth / this.zoom;
    this.h = viewHeight / this.zoom;
    this.world = world;

    this.x = 0;          // esquina superior izquierda del area visible (mundo)
    this.y = 0;
    this.lookAhead = 0;  // desplazamiento horizontal actual por direccion
    /** Ajuste vertical extra (lo usa la fase del bus para verlo entero). */
    this.offsetBias = 0;
  }

  /** Coloca la camara instantaneamente sobre un objetivo (al arrancar la partida). */
  snapTo(target) {
    this.lookAhead = 0;
    const { cx, cy } = this._desiredCenter(target);
    this.x = cx - this.w / 2;
    this.y = cy - this.h / 2;
    this._clampToWorld();
  }

  _desiredCenter(target) {
    return {
      cx: target.x + target.w / 2 + this.lookAhead,
      cy: target.y + target.h / 2 + CONFIG.camera.offsetY + this.offsetBias,
    };
  }

  /** Actualiza la posicion siguiendo al objetivo (normalmente el jugador). */
  update(dt, target) {
    const cfg = CONFIG.camera;

    // El adelanto depende de hacia donde mira/va el jugador.
    const wanted = (target.facing || 1) * cfg.lookAhead * clamp(Math.abs(target.vx) / 300, 0, 1);
    this.lookAhead = damp(this.lookAhead, wanted, cfg.lookAheadSmooth, dt);

    const { cx, cy } = this._desiredCenter(target);
    this.x = damp(this.x, cx - this.w / 2, cfg.smooth, dt);
    this.y = damp(this.y, cy - this.h / 2, cfg.smooth, dt);

    this._clampToWorld();
  }

  /** No dejamos que la camara se salga del mundo. */
  _clampToWorld() {
    const maxX = Math.max(0, this.world.width - this.w);
    const maxY = Math.max(0, this.world.height - this.h);
    this.x = clamp(this.x, 0, maxX);
    this.y = clamp(this.y, 0, maxY);
  }

  /** Aplica la transformacion de camara al contexto (usar entre save/restore). */
  apply(ctx) {
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  /**
   * Igual que apply() pero con PARALLAX: `depth` < 1 hace que la capa
   * se mueva menos (parece mas lejana). Se usa para colinas y nubes.
   */
  applyParallax(ctx, depth) {
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x * depth, -this.y * depth);
  }

  /** Comprueba si un rectangulo del mundo esta (parcialmente) visible. */
  isVisible(x, y, w, h, margin = 64) {
    return (
      x + w > this.x - margin &&
      x < this.x + this.w + margin &&
      y + h > this.y - margin &&
      y < this.y + this.h + margin
    );
  }
}
