/**
 * gadgetSprite.js
 * ---------------------------------------------------------------
 * DIBUJO de las torretas y las trampas.
 *
 * Se usa en cuatro sitios, y por eso vive aparte: el objeto tirado por
 * el suelo, la cajita del inventario, la PREVISUALIZACION en fantasma
 * mientras eliges donde ponerlo, y lo ya colocado en el mundo.
 *
 * Convenio: el origen (0,0) es el CENTRO DE LA BASE, o sea donde se
 * apoya en el suelo. Asi colocarlo es poner el origen en la superficie.
 */

import { roundRectPath } from '../core/utils.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} item   instancia ({ def }) o directamente una def
 * @param {object} opts   { x, y, scale, angle, ghost, armado }
 *   angle:  hacia donde apunta el canon de la torreta
 *   ghost:  0..1, transparencia de la previsualizacion
 *   armado: false mientras se esta montando (parpadea en rojo)
 */
export function drawGadget(ctx, item, opts = {}) {
  const { x = 0, y = 0, scale = 1, angle = 0, ghost = 1, armado = true } = opts;
  const def = item.def || item;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha *= ghost;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (def.kindOf === 'trampa') dibujarTrampa(ctx, def, armado);
  else dibujarTorreta(ctx, def, angle, armado);

  ctx.restore();
}

/* =============================================================
   TORRETA
   ============================================================= */

function dibujarTorreta(ctx, def, angle, armado) {
  // --- Patas ---
  ctx.strokeStyle = def.dark;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-6, -12); ctx.lineTo(-13, 0);
  ctx.moveTo(6, -12); ctx.lineTo(13, 0);
  ctx.stroke();

  // --- Base ---
  ctx.fillStyle = def.dark;
  roundRectPath(ctx, -15, -18, 30, 8, 3);
  ctx.fill();

  // --- Cuerpo giratorio ---
  ctx.save();
  ctx.translate(0, -26);

  // El canon apunta a donde mire; el cuerpo lo acompana un poco.
  ctx.save();
  ctx.rotate(Math.max(-0.8, Math.min(0.8, Math.sin(angle) * 0.5)));

  ctx.fillStyle = def.color;
  roundRectPath(ctx, -13, -11, 26, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#79879a';
  roundRectPath(ctx, -13, -11, 26, 7, 4);
  ctx.fill();
  ctx.restore();

  // --- Canon, apuntando de verdad ---
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = def.dark;
  roundRectPath(ctx, 6, -4, 24, 8, 3);
  ctx.fill();
  ctx.fillStyle = '#8d97a6';
  ctx.fillRect(24, -3, 6, 6);
  ctx.restore();

  // --- El "ojo": rojo mientras se monta, verde cuando ya dispara ---
  ctx.fillStyle = armado ? '#5fd14a' : def.accent;
  ctx.beginPath();
  ctx.arc(0, -2, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(-1.2, -3.4, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* =============================================================
   TRAMPA
   ============================================================= */

function dibujarTrampa(ctx, def, armado) {
  const halfW = def.w / 2;

  // --- Placa de madera ---
  ctx.fillStyle = def.dark;
  roundRectPath(ctx, -halfW, -10, def.w, 10, 3);
  ctx.fill();
  ctx.fillStyle = def.color;
  roundRectPath(ctx, -halfW, -12, def.w, 8, 3);
  ctx.fill();

  // Tornillos de las esquinas
  ctx.fillStyle = '#4a5164';
  for (const sx of [-halfW + 6, halfW - 6]) {
    ctx.beginPath();
    ctx.arc(sx, -8, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Pinchos ---
  // Salidos cuando esta armada, medio metidos mientras se monta: asi se
  // ve de un vistazo si ya hace dano o todavia no.
  const alto = armado ? 15 : 6;
  ctx.fillStyle = def.accent;
  for (let i = 0; i < 6; i++) {
    const px = -halfW + 8 + i * ((def.w - 16) / 5);
    ctx.beginPath();
    ctx.moveTo(px - 4, -12);
    ctx.lineTo(px, -12 - alto);
    ctx.lineTo(px + 4, -12);
    ctx.closePath();
    ctx.fill();
  }
  // Brillo en la punta
  if (armado) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      const px = -halfW + 8 + i * ((def.w - 16) / 5);
      ctx.beginPath();
      ctx.arc(px, -12 - alto + 2, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
