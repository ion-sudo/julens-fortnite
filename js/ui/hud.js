/**
 * hud.js
 * ---------------------------------------------------------------
 * HUD de partida dibujado sobre el canvas (coordenadas de PANTALLA):
 *
 *   abajo a la izquierda -> escudo, vida y barra de rapidez
 *   abajo en el centro   -> barra de progreso al usar una cura
 *   arriba en el centro  -> avisos ("Has cogido: Fusil de Asalto")
 *
 * Las 6 cajitas del inventario van en ui/inventoryHud.js.
 */

import { CONFIG } from '../core/config.js';
import { rarityColor } from '../data/rarities.js';

const BAR_X = 34;
const BAR_W = 300;
const BAR_H = 20;
const BAR_R = 10;

/** Alturas desde abajo de cada barra. */
const ROW = { shield: 122, health: 96, stamina: 62 };

export function drawHUD(ctx, player, view, stats, time, extra = {}) {
  drawStatBar(ctx, {
    x: BAR_X, y: view.height - ROW.shield,
    ratio: player.shield / player.maxShield,
    label: 'ESCUDO',
    value: Math.round(player.shield),
    from: '#7fd8ff', to: '#3aa2f5',
  });

  drawStatBar(ctx, {
    x: BAR_X, y: view.height - ROW.health,
    ratio: player.health / player.maxHealth,
    label: 'VIDA',
    value: Math.round(player.health),
    from: '#8ef07a', to: '#33a83f',
    flash: player.hurtFlash > 0,
  });

  drawStaminaBar(ctx, player, view, time);
  // En los modos SIN construccion la madera no existe: ensenar un
  // contador clavado en cero solo despista, y ademas ese hueco lo ocupa
  // el marcador del nivel Blitz.
  if (extra.showWood !== false) drawWood(ctx, player, view);

  if (extra.healProgress != null) drawHealProgress(ctx, view, extra.healProgress, extra.healName);
  if (extra.message) drawMessage(ctx, view, extra.message);
  if (extra.zoneLabel) drawZoneLabel(ctx, view, extra.zoneLabel);
  if (extra.outsideZone) drawOutsideWarning(ctx, view, time);

  if (CONFIG.debug.showHitboxes) drawDebugPanel(ctx, player, stats, extra);
}

/* =============================================================
   BARRAS
   ============================================================= */

function drawStatBar(ctx, o) {
  const ratio = Math.max(0, Math.min(1, o.ratio));

  ctx.save();

  // Fondo
  ctx.fillStyle = 'rgba(12, 18, 36, 0.72)';
  roundRect(ctx, o.x, o.y, BAR_W, BAR_H, BAR_R);
  ctx.fill();

  // Relleno
  if (ratio > 0) {
    ctx.save();
    roundRect(ctx, o.x + 3, o.y + 3, Math.max((BAR_W - 6) * ratio, BAR_H - 6), BAR_H - 6, BAR_R - 3);
    ctx.clip();

    const g = ctx.createLinearGradient(o.x, 0, o.x + BAR_W, 0);
    g.addColorStop(0, o.from);
    g.addColorStop(1, o.to);
    ctx.fillStyle = g;
    ctx.fillRect(o.x + 3, o.y + 3, BAR_W, BAR_H - 6);

    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(o.x + 3, o.y + 4, BAR_W, (BAR_H - 6) * 0.36);
    ctx.restore();
  }

  // Marco (parpadea en blanco al recibir dano)
  ctx.strokeStyle = o.flash ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, o.x, o.y, BAR_W, BAR_H, BAR_R);
  ctx.stroke();

  // Etiqueta y numero
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(o.label, o.x + 2, o.y - 4);

  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(o.value), o.x + BAR_W - 10, o.y + BAR_H - 6);

  ctx.restore();
}

/** Barra de RAPIDEZ (la energia de correr, con su aviso de agotada). */
function drawStaminaBar(ctx, player, view, time) {
  const x = BAR_X;
  const y = view.height - ROW.stamina;
  const ratio = Math.max(0, Math.min(1, player.staminaRatio));

  ctx.save();

  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('RAPIDEZ', x + 2, y - 4);

  ctx.fillStyle = 'rgba(12, 18, 36, 0.72)';
  roundRect(ctx, x, y, BAR_W, BAR_H, BAR_R);
  ctx.fill();

  if (ratio > 0) {
    ctx.save();
    roundRect(ctx, x + 3, y + 3, Math.max((BAR_W - 6) * ratio, BAR_H - 6), BAR_H - 6, BAR_R - 3);
    ctx.clip();

    const g = ctx.createLinearGradient(x, 0, x + BAR_W, 0);
    if (player.exhausted) {
      const pulse = 0.55 + 0.45 * Math.sin(time * 10);
      g.addColorStop(0, `rgba(255, 90, 80, ${pulse})`);
      g.addColorStop(1, `rgba(255, 150, 60, ${pulse})`);
    } else if (ratio < 0.3) {
      g.addColorStop(0, '#ff8a3d');
      g.addColorStop(1, '#ffd23f');
    } else {
      g.addColorStop(0, '#ffd23f');
      g.addColorStop(1, '#7ce85a');
    }
    ctx.fillStyle = g;
    ctx.fillRect(x + 3, y + 3, BAR_W, BAR_H - 6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
    ctx.fillRect(x + 3, y + 4, BAR_W, (BAR_H - 6) * 0.36);
    ctx.restore();
  }

  ctx.strokeStyle = player.running ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, BAR_W, BAR_H, BAR_R);
  ctx.stroke();

  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(`${Math.round(ratio * 100)}%`, x + BAR_W - 10, y + BAR_H - 6);

  if (player.exhausted) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff9b8a';
    ctx.fillText('¡SIN ENERGIA!', x + BAR_W + 12, y + BAR_H - 6);
  }

  ctx.restore();
}

/* =============================================================
   MADERA
   ============================================================= */

/** Contador de madera, encima de las barras. */
function drawWood(ctx, player, view) {
  const x = BAR_X;
  const y = view.height - 158;
  const ancho = 132;

  ctx.save();

  ctx.fillStyle = 'rgba(12, 18, 36, 0.78)';
  roundRect(ctx, x, y, ancho, 30, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 160, 106, 0.75)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, ancho, 30, 8);
  ctx.stroke();

  // Iconito de tablones
  ctx.fillStyle = '#a9763f';
  roundRect(ctx, x + 9, y + 8, 20, 6, 2);
  ctx.fill();
  ctx.fillStyle = '#c8a06a';
  roundRect(ctx, x + 9, y + 16, 20, 6, 2);
  ctx.fill();

  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.fillText('MADERA', x + 38, y + 13);

  ctx.font = 'bold 17px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#e8c99a';
  ctx.fillText(String(player.wood ?? 0), x + 38, y + 26);

  ctx.restore();
}

/* =============================================================
   CURACION EN CURSO
   ============================================================= */

function drawHealProgress(ctx, view, progress, name) {
  const w = 300;
  const h = 16;
  const x = (view.width - w) / 2;
  const y = view.height - 172;

  ctx.save();

  ctx.fillStyle = 'rgba(10, 16, 34, 0.86)';
  roundRect(ctx, x - 4, y - 24, w + 8, h + 30, 10);
  ctx.fill();

  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Usando ${name}...`, view.width / 2, y - 8);

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();

  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#8ef07a');
  g.addColorStop(1, '#4fc3f7');
  ctx.fillStyle = g;
  roundRect(ctx, x, y, Math.max(w * progress, 8), h, 8);
  ctx.fill();

  ctx.restore();
}

/* =============================================================
   AVISOS
   ============================================================= */

function drawMessage(ctx, view, msg) {
  const alpha = Math.min(1, msg.life / 0.4);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';

  const ancho = ctx.measureText(msg.text).width + 34;
  const x = (view.width - ancho) / 2;
  const y = 76;

  ctx.fillStyle = 'rgba(10, 16, 34, 0.9)';
  ctx.strokeStyle = msg.rarity ? rarityColor(msg.rarity) : 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, ancho, 34, 9);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(msg.text, view.width / 2, y + 22);
  ctx.restore();
}

/** Aviso de estar fuera de la zona segura (pierdes vida). */
function drawOutsideWarning(ctx, view, time) {
  const pulso = 0.6 + 0.4 * Math.sin(time * 6);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';

  const texto = '¡ESTAS FUERA DE LA ZONA SEGURA!';
  const ancho = ctx.measureText(texto).width + 40;
  const x = (view.width - ancho) / 2;

  ctx.fillStyle = `rgba(120, 50, 180, ${0.55 + 0.25 * pulso})`;
  roundRect(ctx, x, 210, ancho, 38, 10);
  ctx.fill();
  ctx.strokeStyle = `rgba(215, 160, 255, ${pulso})`;
  ctx.lineWidth = 2;
  roundRect(ctx, x, 210, ancho, 38, 10);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(texto, view.width / 2, 236);
  ctx.restore();
}

/* =============================================================
   ROTULO DE ZONA (los 10 sitios con nombre)
   ============================================================= */

function drawZoneLabel(ctx, view, zone) {
  const alpha = Math.min(1, zone.life / 0.6);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';

  // Nombre grande con sombra
  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.strokeText(zone.name.toUpperCase(), view.width / 2, 178);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(zone.name.toUpperCase(), view.width / 2, 178);

  // Filete decorativo
  ctx.strokeStyle = 'rgba(255, 210, 63, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(view.width / 2 - 90, 188);
  ctx.lineTo(view.width / 2 + 90, 188);
  ctx.stroke();

  ctx.restore();
}

/* =============================================================
   DEPURACION (F1)
   ============================================================= */

function drawDebugPanel(ctx, player, stats, extra) {
  const lines = [
    `FPS: ${stats.fps}`,
    `pos: ${player.x.toFixed(0)}, ${player.y.toFixed(0)}`,
    `vel: ${player.vx.toFixed(0)}, ${player.vy.toFixed(0)}`,
    `estado: ${player.animState} / ${player.action}`,
    `suelo: ${player.onGround}  agachado: ${player.crouching}`,
    `vida: ${player.health.toFixed(0)}  escudo: ${player.shield.toFixed(0)}`,
    `mira: ${(player.aimAngle * 180 / Math.PI).toFixed(0)}deg  ads: ${player.aiming}`,
    `balas: ${extra.bulletCount ?? 0}  botin: ${extra.pickupCount ?? 0}`,
    `cofres sin abrir: ${extra.chestCount ?? 0}`,
    `vivos: ${extra.aliveCount ?? '-'}`,
  ];

  const w = 260;
  const h = 14 + lines.length * 16;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  roundRect(ctx, 20, 20, w, h, 8);
  ctx.fill();

  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fe8ff';
  lines.forEach((line, i) => ctx.fillText(line, 32, 40 + i * 16));
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
