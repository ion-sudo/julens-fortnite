/**
 * buildHud.js
 * ---------------------------------------------------------------
 * Selector de piezas del MODO CONSTRUCCION: aparece abajo, encima del
 * inventario, con las tres piezas, su tecla, su coste y cual llevas
 * elegida. Solo se ve mientras el modo esta activo (tecla Q).
 */

import { PIECES, PIECE_ORDER } from '../data/structures.js';
import { control, segunControl } from './controlHints.js';

const SLOT_W = 92;
const SLOT_H = 66;
const GAP = 8;

export function drawBuildHud(ctx, player, view, time) {
  if (!player.buildMode) return;

  const total = PIECE_ORDER.length * SLOT_W + (PIECE_ORDER.length - 1) * GAP;
  const x0 = (view.width - total) / 2;
  const y = view.height - 196;   // por encima del inventario y de sus etiquetas

  ctx.save();

  // --- Rotulo del modo ---
  // Va sobre una pastilla oscura: si no, el verde se pierde encima de la
  // nieve o del cielo segun donde este el jugador.
  const pulso = 0.7 + 0.3 * Math.sin(time * 4);
  const rotulo = segunControl(
    'MODO CONSTRUCCION  ·  Q para salir  ·  clic izquierdo para colocar',
    'MODO CONSTRUCCION  ·  COMBATE para salir  ·  COLOCAR para poner'
  );
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';

  const anchoR = ctx.measureText(rotulo).width + 26;
  ctx.fillStyle = 'rgba(8, 14, 30, 0.78)';
  round(ctx, view.width / 2 - anchoR / 2, y - 30, anchoR, 22, 11);
  ctx.fill();
  ctx.strokeStyle = `rgba(126, 224, 106, ${0.35 * pulso})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.globalAlpha = pulso;
  ctx.fillStyle = '#7ee06a';
  ctx.fillText(rotulo, view.width / 2, y - 14);
  ctx.globalAlpha = 1;

  // --- Las tres piezas ---
  PIECE_ORDER.forEach((id, i) => {
    const piece = PIECES[id];
    const x = x0 + i * (SLOT_W + GAP);
    const elegida = player.piece === id;
    const puede = player.wood >= piece.cost;

    ctx.fillStyle = elegida ? 'rgba(24, 44, 30, 0.94)' : 'rgba(10, 16, 34, 0.8)';
    round(ctx, x, y, SLOT_W, SLOT_H, 10);
    ctx.fill();

    ctx.strokeStyle = elegida ? '#7ee06a' : (puede ? 'rgba(200,160,106,0.65)' : 'rgba(235,90,80,0.6)');
    ctx.lineWidth = elegida ? 3 : 2;
    round(ctx, x, y, SLOT_W, SLOT_H, 10);
    ctx.stroke();

    drawPieceIcon(ctx, id, x + SLOT_W / 2, y + 26, puede);

    // Tecla
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.fillStyle = elegida ? '#7ee06a' : 'rgba(255,255,255,0.55)';
    ctx.fillText(piece.tecla, x + 8, y + 16);

    // Nombre y coste
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(piece.name, x + SLOT_W / 2, y + SLOT_H - 18);

    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.fillStyle = puede ? '#e8c99a' : '#ff8a7a';
    ctx.fillText(`${piece.cost} madera`, x + SLOT_W / 2, y + SLOT_H - 5);
  });

  ctx.restore();
}

/** Dibujito de cada pieza dentro de su cuadro. */
function drawPieceIcon(ctx, id, cx, cy, puede) {
  const color = puede ? '#c08a4e' : 'rgba(160, 120, 80, 0.45)';
  const claro = puede ? '#dcae74' : 'rgba(190, 150, 105, 0.45)';

  ctx.save();
  ctx.translate(cx, cy);

  if (id === 'pared') {
    ctx.fillStyle = color;
    ctx.fillRect(-5, -16, 10, 32);
    ctx.fillStyle = claro;
    ctx.fillRect(-5, -16, 10, 4);
  } else if (id === 'suelo') {
    ctx.fillStyle = color;
    ctx.fillRect(-18, -5, 36, 10);
    ctx.fillStyle = claro;
    ctx.fillRect(-18, -5, 36, 3);
  } else {
    // Rampa: los cuatro peldanos
    ctx.fillStyle = color;
    for (let i = 0; i < 4; i++) {
      const w = 9;
      const h = 5 + i * 6;
      ctx.fillRect(-18 + i * w, 14 - h, w, h);
    }
    ctx.fillStyle = claro;
    for (let i = 0; i < 4; i++) {
      const w = 9;
      const h = 5 + i * 6;
      ctx.fillRect(-18 + i * w, 14 - h, w, 2.5);
    }
  }

  ctx.restore();
}

function round(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
