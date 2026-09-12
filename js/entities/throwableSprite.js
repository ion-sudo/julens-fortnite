/**
 * throwableSprite.js
 * ---------------------------------------------------------------
 * DIBUJO de las granadas, en el mismo estilo que las armas y las curas.
 *
 * Se usa en tres sitios y por eso vive aparte: el objeto tirado por el
 * suelo, la cajita del inventario y la propia granada volando.
 *
 * Convenio: el origen (0,0) es el CENTRO de la granada.
 */

import { roundRectPath } from '../core/utils.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} item  instancia ({ def }) o directamente una def
 * @param {object} opts  { x, y, scale, angle, blink }
 *   blink: 0..1, el parpadeo rojo de la mecha encendida
 */
export function drawThrowable(ctx, item, opts = {}) {
  const { x = 0, y = 0, scale = 1, angle = 0, blink = 0 } = opts;
  const def = item.def || item;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Las tres se dibujan sobre el mismo cuerpo, y lo que las distingue
  // es el color y el remate de arriba: asi se reconocen de un vistazo
  // sin tener tres dibujos que mantener por separado.
  const efecto = def.effect || 'explosion';

  // --- Cuerpo ovalado ---
  ctx.fillStyle = def.dark;
  ctx.beginPath();
  ctx.ellipse(0, 1, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = def.dark;
  ctx.lineWidth = 1.6;

  if (efecto === 'explosion') {
    // Ranuras cruzadas: la piña de toda la vida.
    ctx.beginPath();
    for (const yy of [-5, 0, 5]) {
      ctx.moveTo(-9, yy); ctx.lineTo(9, yy);
    }
    ctx.moveTo(-3.5, -11); ctx.lineTo(-3.5, 11);
    ctx.moveTo(3.5, -11); ctx.lineTo(3.5, 11);
    ctx.stroke();
  } else if (efecto === 'choque') {
    // Ondas concentricas: lo que hace es empujar.
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(-1, 0, i * 3.2, -0.9, 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-1, 0, i * 3.2, Math.PI - 0.9, Math.PI + 0.9);
      ctx.stroke();
    }
  } else {
    // Cupula: una media luna clara dentro del cuerpo.
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.beginPath();
    ctx.arc(-1, 4, 7.5, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-1, 4, 7.5, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  // Brillo
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.beginPath();
  ctx.ellipse(-4, -5, 3.2, 4.5, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // --- Cuello y espoleta ---
  ctx.fillStyle = '#8d97a6';
  roundRectPath(ctx, -4, -16, 8, 6, 2);
  ctx.fill();

  // Palanca lateral
  ctx.strokeStyle = '#c8d0dc';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(3, -15); ctx.lineTo(8, -12); ctx.lineTo(8, -3);
  ctx.stroke();

  // Anilla
  ctx.strokeStyle = '#e0a63a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(-8, -14, 3.6, 0, Math.PI * 2);
  ctx.stroke();

  // --- Luz de la mecha encendida ---
  if (blink > 0) {
    ctx.fillStyle = `rgba(255, 90, 60, ${0.45 + blink * 0.55})`;
    ctx.beginPath();
    ctx.arc(0, -18, 3 + blink * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
