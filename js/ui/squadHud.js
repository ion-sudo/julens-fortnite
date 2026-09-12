/**
 * squadHud.js
 * ---------------------------------------------------------------
 * LO QUE SE VE EN PANTALLA cuando juegas en equipo:
 *
 *   - el aviso de "ESTAS ABATIDO" con lo que te queda de desangrado
 *   - el cartel de "MANTEN E PARA LEVANTAR" con su barra, cuando estas
 *     al lado de un companero caido
 *   - la lista de tu ESCUADRON abajo a la derecha, con la vida de cada
 *     uno y quien esta en el suelo
 *
 * En individual no se dibuja nada de esto: el gestor de reanimacion
 * viene apagado y se sale a la primera.
 */

import { roundRectPath } from '../core/utils.js';
import { TEAM_COLORS } from '../systems/teams.js';
import { REVIVE_TIME } from '../systems/revive.js';
import { RESPAWN_TIME } from '../systems/reload.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} player
 * @param {import('../systems/revive.js').ReviveManager} revive
 * @param {import('../systems/match.js').MatchManager} match
 * @param {import('../systems/reload.js').ReloadManager} [reload]
 *   gestor de reaparicion (solo en el Julen Recarga)
 */
export function drawReviveHud(ctx, player, revive, match, view, time, reload = null) {
  if (!revive?.enabled) return;

  drawSquadList(ctx, match, view, reload);

  if (player.downed) drawDownedWarning(ctx, player, view, time);
  else if (revive.target) drawRevivePrompt(ctx, revive.target, view);
}

/* =============================================================
   ESTAS ABATIDO
   ============================================================= */

function drawDownedWarning(ctx, player, view, time) {
  const pulso = 0.6 + 0.4 * Math.sin(time * 5);
  const queda = Math.max(0, player.downHealth / player.maxDownHealth);

  ctx.save();
  ctx.textAlign = 'center';

  // Velo rojo en los bordes: se nota que estas en apuros sin tapar nada.
  const g = ctx.createLinearGradient(0, 0, 0, view.height);
  g.addColorStop(0, `rgba(180, 30, 30, ${0.22 * pulso})`);
  g.addColorStop(0.45, 'rgba(180, 30, 30, 0)');
  g.addColorStop(1, `rgba(180, 30, 30, ${0.28 * pulso})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);

  const cx = view.width / 2;
  const y = view.height * 0.26;

  ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(6, 10, 22, 0.9)';
  ctx.strokeText('ESTAS ABATIDO', cx, y);
  ctx.fillStyle = '#ff6a6a';
  ctx.fillText('ESTAS ABATIDO', cx, y);

  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(6, 10, 22, 0.9)';
  ctx.strokeText('Arrastrate hasta un companero: pueden levantarte', cx, y + 24);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText('Arrastrate hasta un companero: pueden levantarte', cx, y + 24);

  // Barra de lo que te queda
  const w = 300;
  const x = cx - w / 2;
  ctx.fillStyle = 'rgba(10, 16, 34, 0.85)';
  roundRectPath(ctx, x - 2, y + 34, w + 4, 14, 7);
  ctx.fill();
  ctx.fillStyle = queda < 0.3 ? '#e8434f' : '#e8a33f';
  roundRectPath(ctx, x, y + 36, w * queda, 10, 5);
  ctx.fill();

  // Y si alguien te esta levantando, la verde encima
  if (player.reviveProgress > 0) {
    ctx.fillStyle = 'rgba(10, 16, 34, 0.85)';
    roundRectPath(ctx, x - 2, y + 52, w + 4, 14, 7);
    ctx.fill();
    ctx.fillStyle = TEAM_COLORS.aliado;
    roundRectPath(ctx, x, y + 54, w * player.reviveProgress, 10, 5);
    ctx.fill();

    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.fillStyle = TEAM_COLORS.aliadoClaro;
    ctx.fillText('¡Te estan levantando!', cx, y + 80);
  }

  ctx.restore();
}

/* =============================================================
   LEVANTANDO A UN COMPANERO
   ============================================================= */

function drawRevivePrompt(ctx, caido, view) {
  const cx = view.width / 2;
  const y = view.height - 232;
  const w = 300;
  const x = cx - w / 2;

  ctx.save();
  ctx.textAlign = 'center';

  ctx.fillStyle = 'rgba(10, 16, 34, 0.88)';
  roundRectPath(ctx, x, y, w, 46, 9);
  ctx.fill();
  ctx.strokeStyle = TEAM_COLORS.aliado;
  ctx.lineWidth = 2;
  roundRectPath(ctx, x, y, w, 46, 9);
  ctx.stroke();

  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`MANTEN  E  PARA LEVANTAR A ${caido.name || 'TU COMPANERO'}`, cx, y + 17);

  // Barra: se llena mientras aguantas la E y se vacia si la sueltas.
  const bw = w - 28;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRectPath(ctx, x + 14, y + 25, bw, 11, 5);
  ctx.fill();
  ctx.fillStyle = TEAM_COLORS.aliado;
  roundRectPath(ctx, x + 14, y + 25, bw * caido.reviveProgress, 11, 5);
  ctx.fill();

  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(`${REVIVE_TIME} s`, cx, y + 34);

  ctx.restore();
}

/* =============================================================
   TU ESCUADRON
   ============================================================= */

/**
 * Lista de companeros abajo a la derecha, encima del inventario.
 *
 * Sale SIEMPRE que juegues en equipo, aunque esten todos bien: saber
 * de un vistazo cuantos te quedan es la mitad de jugar en escuadron.
 */
function drawSquadList(ctx, match, view, reload = null) {
  const squad = match?.squad || [];
  if (squad.length === 0) return;

  const ANCHO = 158;
  const ALTO = 26;
  const x = view.width - ANCHO - 24;
  let y = view.height - 250 - squad.length * (ALTO + 4);

  ctx.save();
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('TU ESCUADRON', x + 2, y - 8);

  for (const b of squad) {
    // Tres estados posibles: en pie, abatido en el suelo, o muerto
    // esperando a reaparecer (solo en el Julen Recarga).
    const volviendo = reload?.timeLeft(b);

    ctx.fillStyle = 'rgba(10, 16, 34, 0.8)';
    roundRectPath(ctx, x, y, ANCHO, ALTO, 6);
    ctx.fill();
    ctx.strokeStyle = volviendo != null ? '#ff5fa2' : (b.downed ? '#e8a33f' : TEAM_COLORS.aliado);
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, x, y, ANCHO, ALTO, 6);
    ctx.stroke();

    ctx.fillStyle = volviendo != null ? '#ffc0dc' : (b.downed ? '#ffd0a0' : '#ffffff');
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.fillText(b.name, x + 8, y + 9);

    // La barra dice una cosa distinta en cada estado: la vida, lo que
    // le queda de desangrado, o cuanto lleva de la cuenta atras.
    const bw = ANCHO - 16;
    let ratio;
    let colorBarra;
    if (volviendo != null) {
      ratio = 1 - Math.max(0, Math.min(1, volviendo / RESPAWN_TIME));
      colorBarra = '#ff5fa2';
    } else if (b.downed) {
      ratio = Math.max(0, b.downHealth / b.maxDownHealth);
      colorBarra = '#e8a33f';
    } else {
      ratio = b.health / b.maxHealth;
      colorBarra = TEAM_COLORS.aliado;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x + 8, y + 16, bw, 5);
    ctx.fillStyle = colorBarra;
    ctx.fillRect(x + 8, y + 16, bw * ratio, 5);

    if (volviendo != null) {
      ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#ff5fa2';
      ctx.textAlign = 'right';
      ctx.fillText(`VUELVE ${Math.ceil(volviendo)}s`, x + ANCHO - 8, y + 9);
      ctx.textAlign = 'left';
    } else if (b.downed) {
      ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#e8a33f';
      ctx.textAlign = 'right';
      ctx.fillText('ABATIDO', x + ANCHO - 8, y + 9);
      ctx.textAlign = 'left';
    }

    y += ALTO + 4;
  }

  ctx.restore();
}
