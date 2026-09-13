/**
 * emoteWheel.js
 * ---------------------------------------------------------------
 * LA RUEDA DE EMOTES: seis sectores alrededor del centro de la
 * pantalla, como la de Fortnite.
 *
 * Se apunta con el raton y se elige con el clic, o directamente con
 * las teclas 1..6. El sector al que apuntas se ilumina y se abre un
 * poco hacia fuera, para que no haya duda de cual vas a soltar.
 *
 * Tambien dibuja el cartel de "estas bailando" mientras dura el emote.
 */

import { roundRectPath } from '../core/utils.js';
import { rarityColor } from '../data/rarities.js';
import { WHEEL_SLOTS } from '../data/emotes.js';
import { control, segunControl } from './controlHints.js';

const RADIO = 132;      // del centro al medio del sector
const GROSOR = 74;      // ancho de cada sector

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../systems/emotes.js').EmoteManager} emotes
 */
export function drawEmoteWheel(ctx, emotes, view, time) {
  if (!emotes) return;

  if (emotes.wheelOpen) dibujarRueda(ctx, emotes, view, time);
  else if (emotes.active) dibujarEnMarcha(ctx, emotes, view, time);
}

/* =============================================================
   LA RUEDA
   ============================================================= */

function dibujarRueda(ctx, emotes, view, time) {
  const cx = view.width / 2;
  const cy = view.height / 2;
  const lista = emotes.slots;

  ctx.save();

  // Velo, para que la rueda se lea sobre cualquier escenario.
  ctx.fillStyle = 'rgba(6, 10, 24, 0.55)';
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.translate(cx, cy);

  const paso = (Math.PI * 2) / WHEEL_SLOTS;

  for (let i = 0; i < WHEEL_SLOTS; i++) {
    const def = lista[i];
    const activo = emotes.hover === i;

    // El sector 0 arranca ARRIBA: es donde se espera que este el primero.
    const a0 = -Math.PI / 2 + i * paso + 0.03;
    const a1 = -Math.PI / 2 + (i + 1) * paso - 0.03;
    // El resaltado se abre un poco hacia fuera.
    const r0 = RADIO - GROSOR / 2 + (activo ? 4 : 0);
    const r1 = RADIO + GROSOR / 2 + (activo ? 10 : 0);

    const color = def ? rarityColor(def.rarity) : '#4a5164';

    ctx.beginPath();
    ctx.arc(0, 0, r1, a0, a1);
    ctx.arc(0, 0, r0, a1, a0, true);
    ctx.closePath();

    ctx.fillStyle = activo ? hexA(color, 0.45) : 'rgba(13, 20, 42, 0.9)';
    ctx.fill();
    ctx.strokeStyle = activo ? '#ffffff' : hexA(color, 0.75);
    ctx.lineWidth = activo ? 3 : 2;
    ctx.stroke();

    // --- Contenido del sector ---
    const am = (a0 + a1) / 2;
    const mx = Math.cos(am) * RADIO;
    const my = Math.sin(am) * RADIO;

    if (def) {
      ctx.save();
      ctx.translate(mx, my - 8);
      ctx.scale(activo ? 1.15 : 1, activo ? 1.15 : 1);
      drawEmoteIcon(ctx, def.icon, color, time);
      ctx.restore();

      ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = activo ? '#ffffff' : 'rgba(255,255,255,0.72)';
      ctx.fillText(def.name, mx, my + 22);
    } else {
      ctx.font = '11px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillText('vacio', mx, my + 4);
    }

    // Numero de la tecla, pegado al borde de dentro
    const nx = Math.cos(am) * (r0 - 13);
    const ny = Math.sin(am) * (r0 - 13);
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = activo ? '#ffd23f' : 'rgba(255,255,255,0.45)';
    ctx.fillText(String(i + 1), nx, ny);
    ctx.textBaseline = 'alphabetic';
  }

  // --- Centro ---
  ctx.fillStyle = 'rgba(10, 16, 34, 0.92)';
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('EMOTES', 0, -2);
  ctx.font = '10px "Trebuchet MS", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(segunControl('B para cerrar', 'BAILES para cerrar'), 0, 14);

  ctx.restore();
}

/* =============================================================
   CARTEL MIENTRAS BAILAS
   ============================================================= */

function dibujarEnMarcha(ctx, emotes, view, time) {
  const def = emotes.player.emote;
  if (!def) return;

  const x = view.width / 2;
  const y = view.height - 268;

  ctx.save();
  ctx.textAlign = 'center';

  // Dos lineas centradas: el nombre arriba y el aviso debajo. En una
  // sola linea el nombre y el "muevete para parar" se pisaban.
  const pista = 'muevete para parar';
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  const anchoNombre = ctx.measureText(def.name).width;
  ctx.font = '10px "Trebuchet MS", sans-serif';
  const ancho = Math.max(anchoNombre, ctx.measureText(pista).width) + 34;

  ctx.fillStyle = 'rgba(10, 16, 34, 0.85)';
  roundRectPath(ctx, x - ancho / 2, y, ancho, 40, 9);
  ctx.fill();
  ctx.strokeStyle = rarityColor(def.rarity);
  ctx.lineWidth = 2;
  roundRectPath(ctx, x - ancho / 2, y, ancho, 40, 9);
  ctx.stroke();

  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(def.name, x, y + 18);

  ctx.font = '10px "Trebuchet MS", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(pista, x, y + 32);

  ctx.restore();
}

/* =============================================================
   ICONOS
   Uno por `icon` de data/emotes.js. Caben en 34x34 centrados en el
   origen, igual que los demas dibujitos del juego.
   ============================================================= */

export function drawEmoteIcon(ctx, icon, color, time = 0) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;

  switch (icon) {
    // Saludo: una mano abierta
    case 'mano':
      ctx.beginPath();
      ctx.moveTo(-5, 9); ctx.lineTo(-5, -2);
      ctx.moveTo(-1.6, 9); ctx.lineTo(-1.6, -7);
      ctx.moveTo(1.8, 9); ctx.lineTo(1.8, -8);
      ctx.moveTo(5.2, 9); ctx.lineTo(5.2, -4);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 8, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    // Aplauso: dos manos juntandose
    case 'palmas':
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 5, 0);
        ctx.rotate(s * 0.4);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      for (const [ax, ay] of [[-11, -8], [11, -8], [0, -12]]) {
        ctx.beginPath();
        ctx.moveTo(ax * 0.6, ay * 0.6); ctx.lineTo(ax, ay);
        ctx.stroke();
      }
      break;

    // Bailecito: una figura con los brazos cruzados
    case 'baile':
      ctx.beginPath();
      ctx.arc(0, -8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -4); ctx.lineTo(0, 5);
      ctx.moveTo(-8, 1); ctx.lineTo(8, -3);
      ctx.moveTo(-4, 12); ctx.lineTo(0, 5); ctx.lineTo(4, 12);
      ctx.stroke();
      break;

    // Robot: cabeza cuadrada con antena
    case 'robot':
      ctx.fillRect(-7, -8, 14, 12);
      ctx.fillStyle = '#0d1424';
      ctx.fillRect(-4, -5, 3, 3);
      ctx.fillRect(1, -5, 3, 3);
      ctx.fillRect(-4, 0, 8, 2);
      ctx.fillStyle = color;
      ctx.fillRect(-1, -13, 2, 5);
      ctx.beginPath();
      ctx.arc(0, -14, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-9, 5, 18, 3);
      break;

    // Sentadillas: una pesa
    case 'pesa':
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-9, 0); ctx.lineTo(9, 0);
      ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.fillRect(s * 8 - 2, -7, 4, 14);
        ctx.fillRect(s * 12 - 2, -4, 4, 8);
      }
      break;

    // Victoria: una copa
    case 'copa':
      ctx.beginPath();
      ctx.moveTo(-7, -10);
      ctx.lineTo(7, -10);
      ctx.lineTo(5, -1);
      ctx.quadraticCurveTo(0, 4, -5, -1);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-7, -8); ctx.quadraticCurveTo(-12, -4, -7, -2);
      ctx.moveTo(7, -8); ctx.quadraticCurveTo(12, -4, 7, -2);
      ctx.moveTo(0, 4); ctx.lineTo(0, 9);
      ctx.stroke();
      ctx.fillRect(-6, 9, 12, 3);
      break;

    // Siesta: unas zetas
    case 'zeta':
      ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Z', 4, 4);
      ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
      ctx.fillText('z', -5, -3);
      ctx.font = 'bold 8px "Trebuchet MS", sans-serif';
      ctx.fillText('z', -11, -9);
      break;

    // Guitarrista
    case 'guitarra':
      ctx.save();
      ctx.rotate(-0.5);
      ctx.beginPath();
      ctx.ellipse(-4, 4, 7, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0d1424';
      ctx.beginPath();
      ctx.arc(-3, 4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillRect(1, 2.6, 13, 2.8);
      ctx.fillRect(13, 1.4, 4, 5);
      ctx.restore();
      break;

    default:
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
  }

  ctx.restore();
}

/** Un color hex con transparencia. */
function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
