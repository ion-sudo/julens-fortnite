/**
 * ammoSprite.js
 * ---------------------------------------------------------------
 * DIBUJO de las CAJAS DE MUNICION. Una cajita de madera con refuerzos
 * metalicos, una banda del color del tipo de balas que lleva dentro y
 * un par de casquillos asomando.
 *
 * Centrada en el origen, dentro de una caja de unos 40x34, igual que
 * las curas: asi sirve para el suelo, el icono y el HUD.
 */

import { ammoInfo } from '../data/ammo.js';
import { roundRectPath } from '../core/utils.js';

export function drawAmmoBox(ctx, item, opts = {}) {
  const { x = 0, y = 0, scale = 1 } = opts;
  const info = ammoInfo(item.ammoType);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';

  // --- Casquillos asomando por detras ---
  ctx.fillStyle = '#c9a227';
  for (const [bx, by, rot] of [[-9, -14, -0.35], [2, -16, 0.2], [11, -13, 0.5]]) {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(rot);
    ctx.fillRect(-2.5, -7, 5, 12);
    ctx.fillStyle = '#e8c94a';
    ctx.fillRect(-2.5, -7, 5, 3);
    ctx.fillStyle = '#c9a227';
    ctx.restore();
  }

  // --- Caja ---
  ctx.fillStyle = '#8a5c2f';
  roundRectPath(ctx, -19, -9, 38, 22, 3);
  ctx.fill();

  // Tapa
  ctx.fillStyle = '#a9763f';
  roundRectPath(ctx, -19, -9, 38, 6, 3);
  ctx.fill();

  // Refuerzos metalicos
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(-15, -9, 4, 22);
  ctx.fillRect(11, -9, 4, 22);

  // --- Banda del color del tipo de municion ---
  ctx.fillStyle = info.color;
  ctx.fillRect(-10, -1, 20, 8);

  // Etiqueta con las tres letras del tipo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.font = 'bold 7px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(info.short, 0, 3.5);

  // Brillo
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(-19, -9, 38, 3);

  ctx.restore();
}
