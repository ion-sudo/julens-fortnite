/**
 * minigameHud.js
 * ---------------------------------------------------------------
 * PANTALLA DE FIN de un minijuego: el resultado, si ha sido record, y
 * los dos botones (reintentar / salir).
 *
 * Es la misma para todos los modos: cada uno solo aporta su marca y su
 * frase. Los botones se pintan aqui y game.js mira si el raton cae
 * encima, para no montar nada de HTML por encima del canvas.
 */

import { roundRectPath } from '../core/utils.js';
import { formatScore } from '../data/minigames.js';

/** Rectangulos de los botones, en coordenadas de pantalla. */
export function endButtons(view) {
  const w = 190;
  const h = 52;
  const y = view.height / 2 + 66;
  const gap = 18;

  return {
    retry: { x: view.width / 2 - w - gap / 2, y, w, h, label: 'REINTENTAR' },
    exit: { x: view.width / 2 + gap / 2, y, w, h, label: 'SALIR' },
  };
}

/** ¿Cae este punto dentro del rectangulo? */
export function hits(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../systems/minigames/base.js').Minigame} mg
 * @param {{width:number, height:number}} view
 * @param {number} time
 * @param {{x:number, y:number}} [cursor]  para resaltar el boton senalado
 */
export function drawMinigameEnd(ctx, mg, view, time, cursor = null) {
  const def = mg.def;

  ctx.save();

  // --- Velo oscuro ---
  ctx.fillStyle = 'rgba(6, 10, 24, 0.78)';
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.textAlign = 'center';

  // --- Panel ---
  const pw = 460;
  const ph = 300;
  const px = view.width / 2 - pw / 2;
  const py = view.height / 2 - ph / 2 - 20;

  ctx.fillStyle = 'rgba(13, 20, 42, 0.97)';
  roundRectPath(ctx, px, py, pw, ph, 16);
  ctx.fill();
  ctx.strokeStyle = def.color;
  ctx.lineWidth = 3;
  ctx.stroke();

  // --- Titulo ---
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(def.name.toUpperCase(), view.width / 2, py + 38);

  // --- Frase del modo ---
  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(mg.resultText || 'Se acabo', view.width / 2, py + 84);

  // --- La marca ---
  if (def.score !== 'none') {
    ctx.font = 'bold 54px "Trebuchet MS", sans-serif';
    ctx.fillStyle = def.color;
    ctx.fillText(formatScore(def, mg.score), view.width / 2, py + 146);

    // --- Record ---
    const pulso = 0.75 + 0.25 * Math.sin(time * 6);
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';

    if (mg.isRecord) {
      ctx.globalAlpha = pulso;
      ctx.fillStyle = '#ffd23f';
      ctx.fillText('¡NUEVO RECORD!', view.width / 2, py + 178);
      ctx.globalAlpha = 1;
    } else {
      const mejor = mg.game.profile?.record(mg.id);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(`Tu record: ${formatScore(def, mejor)}`, view.width / 2, py + 178);
    }
  }

  // --- Cuenta atras para el siguiente circuito ---
  // Solo la carrera de obstaculos la usa: al acabar se monta OTRO
  // recorrido distinto sola, y aqui se ve cuanto falta.
  if (mg.reinicio !== null && mg.reinicio !== undefined) {
    const seg = Math.max(0, Math.ceil(mg.reinicio));
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.fillText(`Nuevo recorrido en ${seg}...`, view.width / 2, py + 204);
  }

  // --- XP ganada ---
  if (mg.xpGanada > 0) {
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#7ee06a';
    ctx.fillText(`+${mg.xpGanada} XP`, view.width / 2, py + 214);
  }

  // --- Botones ---
  const botones = endButtons(view);
  for (const b of [botones.retry, botones.exit]) {
    const encima = cursor && hits(b, cursor.x, cursor.y);

    ctx.fillStyle = encima ? def.color : 'rgba(255,255,255,0.08)';
    roundRectPath(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    ctx.strokeStyle = encima ? '#ffffff' : 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    ctx.fillStyle = encima ? '#0d142a' : '#ffffff';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 6);
  }

  ctx.restore();
}
