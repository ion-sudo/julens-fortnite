/**
 * matchHud.js
 * ---------------------------------------------------------------
 * Interfaz propia del battle royale:
 *
 *   arriba a la derecha -> VIVOS: 51  y  KILLS: 0
 *   debajo              -> registro de bajas ("X elimino a Y")
 *   pantalla completa   -> derrota ("Te ha eliminado X") o victoria
 *
 * Todo en coordenadas de PANTALLA, encima del resto del HUD.
 */

const PANEL_W = 178;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../systems/match.js').MatchManager} match
 * @param {{width:number,height:number}} view
 */
export function drawMatchHud(ctx, match, view, time) {
  drawAliveCounter(ctx, match, view);
  drawKillFeed(ctx, match, view);
}

/* =============================================================
   CONTADOR DE VIVOS
   ============================================================= */
function drawAliveCounter(ctx, match, view) {
  const x = view.width - PANEL_W - 24;
  const y = 20;

  ctx.save();

  // Panel
  ctx.fillStyle = 'rgba(10, 16, 34, 0.82)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, PANEL_W, 58, 10);
  ctx.fill();
  ctx.stroke();

  // Vivos
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('VIVOS', x + 14, y + 20);

  ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(match.aliveCount), x + 14, y + 46);

  // Separador
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + PANEL_W * 0.56, y + 12);
  ctx.lineTo(x + PANEL_W * 0.56, y + 46);
  ctx.stroke();

  // Bajas
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('KILLS', x + PANEL_W * 0.56 + 14, y + 20);

  ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(String(match.kills), x + PANEL_W * 0.56 + 14, y + 46);

  ctx.restore();

  // En equipo, debajo, cuantos ESCUADRONES quedan. Es el numero que de
  // verdad importa ahi: 30 vivos repartidos en 8 escuadrones no es lo
  // mismo que 30 vivos sueltos.
  if (match.teamSize > 1) drawTeamCounter(ctx, match, x, y + 58);
}

/** Cuantos escuadrones siguen en pie. */
function drawTeamCounter(ctx, match, x, y) {
  ctx.save();

  ctx.fillStyle = 'rgba(10, 16, 34, 0.82)';
  ctx.strokeStyle = 'rgba(95, 209, 74, 0.55)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, PANEL_W, 28, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('ESCUADRONES', x + 14, y + 14);

  ctx.textAlign = 'right';
  ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#5fd14a';
  ctx.fillText(String(match.aliveTeams), x + PANEL_W - 14, y + 15);

  ctx.restore();
}

/* =============================================================
   REGISTRO DE BAJAS
   ============================================================= */
function drawKillFeed(ctx, match, view) {
  if (match.feed.length === 0) return;

  const x = view.width - 24;
  let y = 96;

  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';

  for (const linea of match.feed) {
    const alpha = Math.min(1, linea.life / 0.6);
    ctx.globalAlpha = alpha;

    const ancho = ctx.measureText(linea.text).width + 22;

    ctx.fillStyle = 'rgba(10, 16, 34, 0.8)';
    ctx.strokeStyle = linea.mine ? '#ffd23f' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = linea.mine ? 2 : 1;
    roundRect(ctx, x - ancho, y, ancho, 24, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = linea.mine ? '#ffd23f' : 'rgba(255,255,255,0.85)';
    ctx.fillText(linea.text, x - 11, y + 16);

    y += 28;
  }

  ctx.restore();
}

/* =============================================================
   FASE DEL BUS: indicaciones mientras caes
   ============================================================= */

/**
 * Avisos de la fase de despliegue: que tecla pulsar y a que altura vas.
 * @param {object} player
 * @param {import('../systems/match.js').MatchManager} match
 */
export function drawDeploymentHud(ctx, player, match, view, time) {
  const fase = player.flight;
  if (!fase) return;

  ctx.save();
  ctx.textAlign = 'center';

  if (fase === 'bus') {
    // Cartel grande con la tecla de salto
    const pulso = 0.75 + 0.25 * Math.sin(time * 4);
    const texto = 'PULSA ESPACIO PARA SALTAR';

    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    const ancho = ctx.measureText(texto).width + 56;
    const x = (view.width - ancho) / 2;

    ctx.globalAlpha = pulso;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.88)';
    roundRect(ctx, x, view.height - 168, ancho, 56, 14);
    ctx.fill();
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 3;
    roundRect(ctx, x, view.height - 168, ancho, 56, 14);
    ctx.stroke();

    ctx.fillStyle = '#ffd23f';
    ctx.fillText(texto, view.width / 2, view.height - 130);
    ctx.globalAlpha = 1;

    // Aviso de que al bus le queda poco
    const queda = match.bus ? Math.max(0, 1 - match.bus.progress / 0.88) : 1;
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.fillStyle = queda < 0.25 ? '#ff8a7a' : 'rgba(255,255,255,0.75)';
    ctx.fillText(
      queda < 0.25 ? '¡El bus esta a punto de soltarte!' : 'Elige donde saltar',
      view.width / 2, view.height - 92
    );
  } else {
    // Cayendo o planeando: altura y aviso de la paravela
    const altura = Math.max(0, Math.round(player.heightAboveGround()));
    const planeando = fase === 'planeando';
    const ancho = 220;
    const x = (view.width - ancho) / 2;

    ctx.fillStyle = 'rgba(10, 16, 34, 0.85)';
    roundRect(ctx, x, 84, ancho, 62, 12);
    ctx.fill();
    ctx.strokeStyle = planeando ? '#7ee06a' : '#ffd23f';
    ctx.lineWidth = 2;
    roundRect(ctx, x, 84, ancho, 62, 12);
    ctx.stroke();

    ctx.fillStyle = planeando ? '#7ee06a' : '#ffd23f';
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.fillText(planeando ? 'PLANEANDO' : 'CAIDA LIBRE', view.width / 2, 104);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    ctx.fillText(`${altura} m`, view.width / 2, 134);

    if (!planeando) {
      ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('ESPACIO para abrir la paravela', view.width / 2, 170);
    }

    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText('A / D para dirigirte', view.width / 2, planeando ? 170 : 190);
  }

  ctx.restore();
}

/* =============================================================
   PANTALLA FINAL (derrota / victoria)
   ============================================================= */

/**
 * @param {'derrota'|'victoria'} result
 */
export function drawEndScreen(ctx, match, view, time) {
  const victoria = match.result === 'victoria';

  ctx.save();

  // Velo oscuro
  ctx.fillStyle = victoria ? 'rgba(8, 24, 12, 0.72)' : 'rgba(20, 8, 12, 0.74)';
  ctx.fillRect(0, 0, view.width, view.height);

  const cx = view.width / 2;
  const cy = view.height / 2;

  // Panel
  const pw = 560;
  const ph = 250;
  ctx.fillStyle = 'rgba(10, 16, 34, 0.94)';
  ctx.strokeStyle = victoria ? '#ffd23f' : '#e05a4a';
  ctx.lineWidth = 3;
  roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 18);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';

  if (victoria) {
    // Titulo con latido suave
    const pulso = 1 + Math.sin(time * 3) * 0.03;
    ctx.save();
    ctx.translate(cx, cy - 58);
    ctx.scale(pulso, pulso);
    ctx.font = 'bold 44px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeText('¡VICTORIA MAGISTRAL!', 0, 0);
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('¡VICTORIA MAGISTRAL!', 0, 0);
    ctx.restore();

    ctx.font = 'bold 17px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#eaf1ff';
    ctx.fillText('Ultimo en pie de 51 jugadores', cx, cy - 14);
  } else {
    ctx.font = 'bold 38px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeText('ELIMINADO', cx, cy - 58);
    ctx.fillStyle = '#ff7a6a';
    ctx.fillText('ELIMINADO', cx, cy - 58);

    ctx.font = 'bold 19px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#eaf1ff';
    ctx.fillText('Te ha eliminado', cx, cy - 18);

    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(match.killerName || '???', cx, cy + 12);
  }

  // Puesto y bajas
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.fillStyle = 'rgba(234, 241, 255, 0.85)';
  const puesto = match.placement ? `Puesto #${match.placement} de 51` : '';
  ctx.fillText(`${puesto}    ·    Kills: ${match.kills}`, cx, cy + (victoria ? 26 : 46));

  // Pie
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.fillText('Pulsa ESC o haz clic para volver al menu', cx, cy + ph / 2 - 22);

  ctx.restore();
}

/* ---------- utilidad ---------- */
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
