/**
 * reloadHud.js
 * ---------------------------------------------------------------
 * LA PANTALLA DE ESPERA del modo JULEN RECARGA.
 *
 * Cuando te eliminan pero tu escuadron aguanta, no ves la pantalla de
 * derrota: ves esto. Un cartel grande con la cuenta atras y un anillo
 * que se va llenando, encima de la partida, que sigue viendose detras.
 *
 * Es lo unico que hace falta para que la reaparicion se entienda sin
 * que nadie la explique: se ve cuanto falta y se ve que el mundo sigue.
 */



import { roundRectPath } from '../core/utils.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} player
 * @param {import('../systems/reload.js').ReloadManager} reload
 * @param {object} view { width, height }
 * @param {number} time  reloj del juego, para los pulsos
 */
export function drawRespawnHud(ctx, player, reload, view, time) {
  if (!reload?.enabled) return;

  // El aviso de que se han acabado las segundas oportunidades va
  // siempre, estes vivo o caido.
  if (reload.finalPhase) drawSinRespawn(ctx, view, time);

  const queda = reload.timeLeft(player);
  if (queda == null) return;

  const pulso = 0.65 + 0.35 * Math.sin(time * 4);
  const cx = view.width / 2;
  const cy = view.height * 0.38;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // --- Velo oscuro: la partida se ve, pero se ve que no es tuya ---
  const g = ctx.createRadialGradient(cx, cy, 40, cx, cy, view.width * 0.62);
  g.addColorStop(0, 'rgba(6, 10, 22, 0.18)');
  g.addColorStop(1, 'rgba(6, 10, 22, 0.66)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);

  // --- El anillo que se llena ---
  const R = 62;
  const total = reload.cfg?.time || 30;
  const progreso = 1 - Math.max(0, Math.min(1, queda / total));

  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 95, 162, ${0.75 + 0.25 * pulso})`;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progreso);
  ctx.stroke();

  // --- Los segundos, dentro ---
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px "Trebuchet MS", sans-serif';
  ctx.fillText(String(Math.ceil(queda)), cx, cy + 2);

  // --- Titulo y explicacion ---
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(6, 10, 22, 0.9)';

  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  ctx.strokeText('REAPARECIENDO', cx, cy - R - 34);
  ctx.fillStyle = '#ff5fa2';
  ctx.fillText('REAPARECIENDO', cx, cy - R - 34);

  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.strokeText('Tu escuadron te sostiene: aguantad', cx, cy + R + 30);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('Tu escuadron te sostiene: aguantad', cx, cy + R + 30);

  ctx.restore();
}

/* =============================================================
   ULTIMA RONDA
   -------------------------------------------------------------
   A partir de cierto punto (pocos equipos o tormenta casi cerrada)
   se acaba la reaparicion. Hay que decirlo bien claro: cambia por
   completo como se juega, porque de repente arriesgarse cuesta la
   partida entera.
   ============================================================= */

function drawSinRespawn(ctx, view, time) {
  const pulso = 0.55 + 0.45 * Math.sin(time * 3.2);
  const texto = 'SIN REAPARICION';

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = view.width / 2;
  const y = 78;

  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  const ancho = ctx.measureText(texto).width + 34;

  // Chapa de fondo, para que se lea sobre cualquier cielo.
  ctx.fillStyle = `rgba(150, 25, 60, ${0.55 + 0.25 * pulso})`;
  roundRectPath(ctx, cx - ancho / 2, y - 15, ancho, 30, 15);
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 120, 170, ${0.7 + 0.3 * pulso})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(texto, cx, y + 1);

  ctx.restore();
}
