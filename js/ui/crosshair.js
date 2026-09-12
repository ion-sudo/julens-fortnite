/**
 * crosshair.js
 * ---------------------------------------------------------------
 * MIRA que sigue al cursor.
 *
 *   - Sin apuntar: una cruz pequena y discreta.
 *   - Con el clic derecho: mira grande de precision, con el cono de
 *     dispersion del arma y una guia hasta el personaje.
 *
 * Se dibuja en coordenadas de PANTALLA (encima de todo).
 */

import { rarityColor } from '../data/rarities.js';

/**
 * @param {object} o { mouse, player, weapon, aiming, spin }
 */
export function drawCrosshair(ctx, o) {
  const { mouse, aiming, weapon, spin = 0 } = o;
  if (!mouse.inside) return;

  const x = mouse.screenX;
  const y = mouse.screenY;
  const color = weapon ? rarityColor(weapon.rarity) : '#ffffff';

  ctx.save();
  ctx.lineCap = 'round';

  if (aiming && weapon) {
    // --- Mira de precision ---
    const spread = weapon.def.adsSpread;
    // El radio crece con la dispersion del arma (referencia visual)
    const radio = 16 + spread * 900;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(x, y, radio, 0, Math.PI * 2);
    ctx.stroke();

    // Marcas exteriores
    ctx.lineWidth = 3;
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const ix = Math.cos(a);
      const iy = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(x + ix * (radio + 5), y + iy * (radio + 5));
      ctx.lineTo(x + ix * (radio + 13), y + iy * (radio + 13));
      ctx.stroke();
    }

    // Punto central
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Anillo de calentamiento del minigun
    if (weapon.def.spinUp > 0 && spin > 0) {
      ctx.strokeStyle = spin >= 1 ? '#5fd14a' : '#ffd23f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, radio + 20, -Math.PI / 2, -Math.PI / 2 + spin * Math.PI * 2);
      ctx.stroke();
    }
  } else {
    // --- Cruz sencilla ---
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2.5;
    const g = 5;   // hueco central
    const l = 9;   // largo de cada brazo
    ctx.beginPath();
    ctx.moveTo(x - g - l, y); ctx.lineTo(x - g, y);
    ctx.moveTo(x + g, y);     ctx.lineTo(x + g + l, y);
    ctx.moveTo(x, y - g - l); ctx.lineTo(x, y - g);
    ctx.moveTo(x, y + g);     ctx.lineTo(x, y + g + l);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
