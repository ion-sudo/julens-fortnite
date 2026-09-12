/**
 * healSprite.js
 * ---------------------------------------------------------------
 * DIBUJO de las 10 curas. Centradas en el origen dentro de una caja
 * de unos 40x40, para que sirvan igual como icono del inventario,
 * como objeto tirado en el suelo y en la mano del personaje.
 */

import { rarityColor } from '../data/rarities.js';

export function drawHeal(ctx, heal, opts = {}) {
  const { x = 0, y = 0, scale = 1 } = opts;
  const tint = rarityColor(heal.rarity);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (heal.def.shape) {
    case 'manzana':        drawManzana(ctx); break;
    case 'setas':          drawSetas(ctx); break;
    case 'vendas':         drawVendas(ctx); break;
    case 'frasco-pequeno': drawFrasco(ctx, '#4fc3f7', 9, 13); break;
    case 'botiquin':       drawBotiquin(ctx); break;
    case 'frasco-grande':  drawFrasco(ctx, '#3aa2f5', 12, 17); break;
    case 'lata':           drawLata(ctx, tint); break;
    case 'pocima':         drawPocima(ctx); break;
    case 'nectar':         drawNectar(ctx); break;
    case 'elixir':         drawElixir(ctx, tint); break;
    default:               drawFrasco(ctx, tint, 10, 14);
  }

  ctx.restore();
}

/* ---------- Curas concretas ---------- */

/** Manzana de pino: roja con hoja. */
function drawManzana(ctx) {
  ctx.fillStyle = '#d8433f';
  ctx.beginPath();
  ctx.arc(-3, 2, 10, 0, Math.PI * 2);
  ctx.arc(4, 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-5, -3, 4, 2.5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Rabito y hoja
  ctx.strokeStyle = '#6b4522';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -7); ctx.lineTo(1, -13);
  ctx.stroke();
  ctx.fillStyle = '#4cbb4c';
  ctx.beginPath();
  ctx.ellipse(6, -13, 6, 3, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

/** Setas del bosque: dos setas moradas. */
function drawSetas(ctx) {
  for (const [sx, sy, s] of [[-6, 3, 1], [6, 6, 0.75]]) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(s, s);
    ctx.fillStyle = '#efe3d0';
    ctx.fillRect(-3, -2, 6, 11);
    ctx.fillStyle = '#a05ae0';
    ctx.beginPath();
    ctx.ellipse(0, -3, 10, 7, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(-4, -5, 1.8, 0, Math.PI * 2);
    ctx.arc(3, -6, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Vendas: rollo con la cinta. */
function drawVendas(ctx) {
  ctx.fillStyle = '#f4efe4';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8cfbc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.stroke();
  // Punta que cuelga
  ctx.fillStyle = '#f4efe4';
  ctx.fillRect(8, -2, 12, 7);
  ctx.strokeStyle = '#d8cfbc';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, 5); ctx.lineTo(20, 5);
  ctx.stroke();
  // Cruz roja
  ctx.fillStyle = '#d8433f';
  ctx.fillRect(-2.5, -5, 5, 10);
  ctx.fillRect(-5, -2.5, 10, 5);
}

/** Frascos de escudo (mini y grande). */
function drawFrasco(ctx, color, w, h) {
  // Cuello
  ctx.fillStyle = '#c9d4e2';
  ctx.fillRect(-3, -h - 6, 6, 6);
  ctx.fillStyle = '#8d9bb0';
  ctx.fillRect(-4.5, -h - 9, 9, 4);
  // Cuerpo
  ctx.fillStyle = 'rgba(220, 235, 250, 0.5)';
  ctx.beginPath();
  ctx.moveTo(-w, -h + 4);
  ctx.quadraticCurveTo(-w - 2, h, 0, h);
  ctx.quadraticCurveTo(w + 2, h, w, -h + 4);
  ctx.closePath();
  ctx.fill();
  // Liquido
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w + 1, -h + 10);
  ctx.quadraticCurveTo(-w - 1, h - 1, 0, h - 1);
  ctx.quadraticCurveTo(w + 1, h - 1, w - 1, -h + 10);
  ctx.closePath();
  ctx.fill();
  // Brillo
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(-w + 3, -h + 12, 3, h);
}

/** Botiquin: maletin blanco con cruz. */
function drawBotiquin(ctx) {
  ctx.fillStyle = '#f4efe4';
  ctx.fillRect(-15, -10, 30, 21);
  ctx.fillStyle = '#d8cfbc';
  ctx.fillRect(-15, -10, 30, 4);
  // Asa
  ctx.strokeStyle = '#8d9bb0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, -10, 6, Math.PI, Math.PI * 2);
  ctx.stroke();
  // Cruz
  ctx.fillStyle = '#d8433f';
  ctx.fillRect(-3, -4, 6, 13);
  ctx.fillRect(-8, 1, 16, 6);
}

/** Refresco de la isla: lata de colores. */
function drawLata(ctx, tint) {
  ctx.fillStyle = '#e8edf4';
  ctx.fillRect(-9, -14, 18, 27);
  ctx.fillStyle = tint;
  ctx.fillRect(-9, -6, 18, 11);
  ctx.fillStyle = '#c9d4e2';
  ctx.fillRect(-9, -14, 18, 3);
  ctx.fillRect(-9, 10, 18, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(-6, -12, 3, 23);
  // Anilla
  ctx.strokeStyle = '#8d9bb0';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(2, -15, 3, 0, Math.PI * 2);
  ctx.stroke();
}

/** Pocima de tormenta: matraz morado con burbujas. */
function drawPocima(ctx) {
  ctx.fillStyle = '#8d9bb0';
  ctx.fillRect(-3.5, -20, 7, 7);
  // Matraz conico
  ctx.fillStyle = 'rgba(220,235,250,0.5)';
  ctx.beginPath();
  ctx.moveTo(-4, -14);
  ctx.lineTo(-14, 12);
  ctx.quadraticCurveTo(0, 17, 14, 12);
  ctx.lineTo(4, -14);
  ctx.closePath();
  ctx.fill();
  // Liquido
  ctx.fillStyle = '#b45cf0';
  ctx.beginPath();
  ctx.moveTo(-9, -1);
  ctx.lineTo(-13, 11);
  ctx.quadraticCurveTo(0, 16, 13, 11);
  ctx.lineTo(9, -1);
  ctx.closePath();
  ctx.fill();
  // Burbujas
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(-4, 5, 2.2, 0, Math.PI * 2);
  ctx.arc(4, 8, 1.6, 0, Math.PI * 2);
  ctx.arc(1, 2, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

/** Nectar dorado: frasco con tapon de corcho y brillo. */
function drawNectar(ctx) {
  ctx.fillStyle = '#8a5c2f';
  ctx.fillRect(-4, -19, 8, 6);
  ctx.fillStyle = 'rgba(220,235,250,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5a623';
  ctx.beginPath();
  ctx.ellipse(0, 3, 10, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-4, -2, 3, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Destellos
  ctx.fillStyle = '#ffd23f';
  for (const [sx, sy, r] of [[11, -10, 2.4], [-11, 6, 1.8]]) {
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 2);
    ctx.quadraticCurveTo(sx, sy, sx + r * 2, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy + r * 2);
    ctx.quadraticCurveTo(sx, sy, sx - r * 2, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy - r * 2);
    ctx.fill();
  }
}

/** Elixir Julen: el mitico, con aura dorada. */
function drawElixir(ctx, tint) {
  // Aura
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
  g.addColorStop(0, 'rgba(255, 210, 63, 0.55)');
  g.addColorStop(1, 'rgba(255, 210, 63, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();

  // Frasco de diamante
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(11, -4);
  ctx.lineTo(0, 15);
  ctx.lineTo(-11, -4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(8, -2);
  ctx.lineTo(0, 12);
  ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(11, -4);
  ctx.lineTo(0, -4);
  ctx.closePath();
  ctx.fill();

  // Tapon
  ctx.fillStyle = '#b98f10';
  ctx.fillRect(-4, -22, 8, 6);
}
