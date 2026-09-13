/**
 * worldMap.js
 * ---------------------------------------------------------------
 * EL MAPA DE LA ISLA (tecla M).
 *
 * El mundo es una tira horizontal de casi 18 000 px, asi que el mapa no
 * puede ser una vista cenital como la de Fortnite: se dibuja como un
 * MAPA DE RELIEVE de perfil, que ademas tiene la ventaja de enseñar el
 * terreno de verdad (se calca de world.platforms, no es un decorado).
 *
 * Lleva:
 *   - el relieve real, con su cielo, su agua y sus lagos
 *   - los 7 sitios con su nombre, su color y un icono de su ambiente
 *   - una cuadricula tipo A1-H3 y el cuadrante en el que estas
 *   - la ruta del bus de batalla y donde va ahora
 *   - la zona segura y lo que queda fuera
 *   - tu posicion, con marcador y haz de luz
 *   - una leyenda con lo que significa cada cosa
 */

import { ZONES } from '../data/zones.js';
import { biomeOf } from '../data/biomes.js';
import { control, segunControl } from './controlHints.js';

/* ---------- Medidas del panel ---------- */
const PANEL = { x: 58, y: 148, w: 1164, h: 330 };
/** Franja de altura del mundo que se representa. */
const WORLD_TOP = 720;
const WORLD_BOT = 1380;
/** Alto reservado arriba para el cielo y los rotulos. */
const SKY_H = 74;

/** Columnas y filas de la cuadricula. */
const COLS = 8;
const ROWS = 3;
const LETRAS = 'ABCDEFGH';

export function drawWorldMap(ctx, game, view, time) {
  const world = game.world;
  const player = game.player;
  const match = game.match;

  const sx = PANEL.w / world.width;                          // escala horizontal
  const relieveY = PANEL.y + SKY_H;                          // donde empieza el relieve
  const relieveH = PANEL.h - SKY_H;
  const sy = relieveH / (WORLD_BOT - WORLD_TOP);             // escala vertical (exagerada)

  /** Mundo -> panel. */
  const mx = (x) => PANEL.x + x * sx;
  const my = (y) => relieveY + (y - WORLD_TOP) * sy;

  ctx.save();

  drawBackdrop(ctx, view, time);
  drawTitle(ctx, view, world);

  // --- Panel ---
  drawPanelFrame(ctx, time);

  ctx.save();
  panelPath(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 16);
  ctx.clip();

  drawSky(ctx);
  drawOcean(ctx, relieveY, relieveH);
  drawZoneBands(ctx, mx, relieveY, relieveH);
  drawRelief(ctx, world, mx, my);
  drawWater(ctx, world, mx, my, time);
  drawBiomeIcons(ctx, mx, my, time);
  drawBuildings(ctx, world, mx, my);
  drawSafeZone(ctx, match, mx);
  drawGrid(ctx);
  drawBusRoute(ctx, match, mx, time);
  drawPlayerMarker(ctx, player, mx, my, time);

  ctx.restore();

  // El marco se repinta encima para que quede limpio
  drawPanelFrame(ctx, time, true);
  drawZoneLabels(ctx, mx);
  drawLegend(ctx, view);
  drawFooter(ctx, view, player, world);

  ctx.restore();
}

/* =============================================================
   FONDO Y MARCO
   ============================================================= */

function drawBackdrop(ctx, view, time) {
  // Oscurecido con un halo suave en el centro
  ctx.fillStyle = 'rgba(5, 9, 22, 0.90)';
  ctx.fillRect(0, 0, view.width, view.height);

  const g = ctx.createRadialGradient(
    view.width / 2, view.height / 2, 60,
    view.width / 2, view.height / 2, view.width * 0.6
  );
  g.addColorStop(0, 'rgba(60, 120, 220, 0.16)');
  g.addColorStop(1, 'rgba(60, 120, 220, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);
}

function drawTitle(ctx, view, world) {
  ctx.textAlign = 'center';

  ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeText('MAPA DE LA ISLA', view.width / 2, 84);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('MAPA DE LA ISLA', view.width / 2, 84);

  // Filete con rombo central
  ctx.strokeStyle = 'rgba(255, 210, 63, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(view.width / 2 - 190, 98); ctx.lineTo(view.width / 2 - 14, 98);
  ctx.moveTo(view.width / 2 + 14, 98);  ctx.lineTo(view.width / 2 + 190, 98);
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(view.width / 2, 92); ctx.lineTo(view.width / 2 + 6, 98);
  ctx.lineTo(view.width / 2, 104); ctx.lineTo(view.width / 2 - 6, 98);
  ctx.closePath();
  ctx.fill();

  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  // El numero de sitios sale de la lista, no escrito a mano: si manana
  // se anade otra zona, el rotulo se actualiza solo.
  ctx.fillText(
    `${(world.width / 100).toFixed(0)} km de costa a costa · ${ZONES.length} sitios con nombre`,
    view.width / 2, 122
  );
}

function drawPanelFrame(ctx, time, soloBorde = false) {
  if (!soloBorde) {
    // Sombra exterior
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#0d1730';
    panelPath(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 16);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Borde doble, con brillo
  ctx.strokeStyle = 'rgba(255, 210, 63, 0.85)';
  ctx.lineWidth = 3;
  panelPath(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 16);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  panelPath(ctx, PANEL.x + 5, PANEL.y + 5, PANEL.w - 10, PANEL.h - 10, 12);
  ctx.stroke();

  // Escuadras en las cuatro esquinas
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 3;
  const L = 26;
  const esquinas = [
    [PANEL.x, PANEL.y, 1, 1], [PANEL.x + PANEL.w, PANEL.y, -1, 1],
    [PANEL.x, PANEL.y + PANEL.h, 1, -1], [PANEL.x + PANEL.w, PANEL.y + PANEL.h, -1, -1],
  ];
  for (const [ex, ey, dx, dy] of esquinas) {
    ctx.beginPath();
    ctx.moveTo(ex + dx * L, ey);
    ctx.lineTo(ex + dx * 8, ey);
    ctx.moveTo(ex, ey + dy * L);
    ctx.lineTo(ex, ey + dy * 8);
    ctx.stroke();
  }
}

/* =============================================================
   CONTENIDO DEL MAPA
   ============================================================= */

function drawSky(ctx) {
  const g = ctx.createLinearGradient(0, PANEL.y, 0, PANEL.y + SKY_H + 40);
  g.addColorStop(0, '#173a6b');
  g.addColorStop(1, '#2d6fa8');
  ctx.fillStyle = g;
  ctx.fillRect(PANEL.x, PANEL.y, PANEL.w, SKY_H + 40);
}

/** Mar de fondo: el terreno se recorta sobre el, como una isla. */
function drawOcean(ctx, relieveY, relieveH) {
  const g = ctx.createLinearGradient(0, relieveY - 20, 0, PANEL.y + PANEL.h);
  g.addColorStop(0, '#1b4f7a');
  g.addColorStop(1, '#0c2a49');
  ctx.fillStyle = g;
  ctx.fillRect(PANEL.x, relieveY - 20, PANEL.w, relieveH + 20);

  // Rayas de oleaje muy tenues
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let y = relieveY + 20; y < PANEL.y + PANEL.h; y += 16) {
    ctx.beginPath();
    ctx.moveTo(PANEL.x, y);
    ctx.lineTo(PANEL.x + PANEL.w, y);
    ctx.stroke();
  }
}

/** Franja de color de cada zona, de arriba abajo. */
function drawZoneBands(ctx, mx, relieveY, relieveH) {
  for (const z of ZONES) {
    const biome = biomeOf(z.biome);
    const x0 = mx(z.x0);
    const x1 = mx(z.x1);

    const g = ctx.createLinearGradient(0, relieveY - 30, 0, relieveY + relieveH);
    g.addColorStop(0, hexA(biome.grassMid, 0.30));
    g.addColorStop(1, hexA(biome.dirtDark, 0.16));
    ctx.fillStyle = g;
    ctx.fillRect(x0, relieveY - 30, x1 - x0, relieveH + 30);
  }
}

/**
 * El RELIEVE de verdad: se dibuja cada plataforma del mundo. Asi el mapa
 * no es un adorno, sino el terreno tal cual.
 */
function drawRelief(ctx, world, mx, my) {
  const suelo = my(WORLD_BOT);

  // Primero la tierra (suelo y escalones), que es la que forma la isla.
  for (const p of world.platforms) {
    if (p.building || p.oneWay) continue;
    const x = mx(p.x);
    const w = Math.max(1.5, p.w * (PANEL.w / world.width));
    const y = my(p.y);
    const biome = biomeOf(p.biome);

    if (p.lakeBed) {
      ctx.fillStyle = '#bea578';
      ctx.fillRect(x, y, w, Math.max(3, suelo - y));
      continue;
    }

    const g = ctx.createLinearGradient(0, y, 0, suelo);
    g.addColorStop(0, biome.dirtMid);
    g.addColorStop(1, biome.dirtDark);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, Math.max(2, suelo - y));

    // Capa de hierba / nieve / arena
    ctx.fillStyle = biome.grassMid;
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = biome.grassLight;
    ctx.fillRect(x, y, w, 1.8);
  }

  // Y despues las plataformas finas: solo la barra, sin columna debajo.
  // (Dibujarlas hasta el fondo llenaba el mapa de torres colgantes.)
  for (const p of world.platforms) {
    if (p.building || !p.oneWay) continue;
    const x = mx(p.x);
    const w = Math.max(2, p.w * (PANEL.w / world.width));
    const y = my(p.y);
    const biome = biomeOf(p.biome);

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x, y + 3, w, 2);
    ctx.fillStyle = biome.grassMid;
    ctx.fillRect(x, y, w, 3);
  }
}

function drawWater(ctx, world, mx, my, time) {
  for (const b of world.waterBodies) {
    const x = mx(b.x);
    const w = Math.max(3, b.w * (PANEL.w / world.width));
    const y = my(b.y);
    const h = Math.max(4, my(Math.min(b.bottom, WORLD_BOT)) - y);

    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#6fd2f2');
    g.addColorStop(1, '#1b6ba8');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    // Rizo en la superficie
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= w; i += 4) {
      const yy = y + 1.5 + Math.sin(i * 0.5 + time * 2) * 1.1;
      if (i === 0) ctx.moveTo(x + i, yy); else ctx.lineTo(x + i, yy);
    }
    ctx.stroke();
  }
}

/** Un par de iconos por zona: identifican el ambiente de un vistazo. */
function drawBiomeIcons(ctx, mx, my, time) {
  for (const z of ZONES) {
    const ancho = z.x1 - z.x0;
    for (const t of [0.22, 0.62]) {
      const x = mx(z.x0 + ancho * t);
      const y = my(z.groundY) - 3;
      drawBiomeIcon(ctx, z.biome, x, y, time);
    }
  }
}

function drawBiomeIcon(ctx, biome, x, y, time) {
  ctx.save();
  ctx.translate(x, y);

  switch (biome) {
    case 'bosque':
      triangulo(ctx, 0, -14, 6, '#2f8c49');
      triangulo(ctx, 0, -8, 7, '#3fa85a');
      ctx.fillStyle = '#6b4522';
      ctx.fillRect(-1.2, -3, 2.4, 4);
      break;

    case 'playa':
      ctx.strokeStyle = '#a9763f';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2, -11); ctx.stroke();
      ctx.fillStyle = '#4cbb4c';
      for (const a of [-0.9, -0.3, 0.4]) {
        ctx.save(); ctx.translate(2, -11); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(5, 0, 6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      break;

    case 'pueblo':
      ctx.fillStyle = '#f0e6d2';
      ctx.fillRect(-6, -8, 12, 8);
      ctx.fillStyle = '#c0562f';
      ctx.beginPath();
      ctx.moveTo(-8, -8); ctx.lineTo(0, -15); ctx.lineTo(8, -8);
      ctx.closePath(); ctx.fill();
      break;

    case 'nevada':
      triangulo(ctx, 0, -15, 8, '#8fa3b8');
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -15); ctx.lineTo(4, -9); ctx.lineTo(-4, -9);
      ctx.closePath(); ctx.fill();
      break;

    case 'fabrica':
      ctx.fillStyle = '#6f7d8a';
      ctx.fillRect(-7, -9, 14, 9);
      ctx.fillStyle = '#55626e';
      ctx.fillRect(2, -16, 4, 8);
      // Humo
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (let i = 0; i < 3; i++) {
        const o = (time * 12 + i * 6) % 18;
        ctx.beginPath();
        ctx.arc(4 + Math.sin(o * 0.3) * 2, -17 - o, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'mansion':
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(-7, -4); ctx.lineTo(-7, -12); ctx.lineTo(-3, -8);
      ctx.lineTo(0, -14); ctx.lineTo(3, -8); ctx.lineTo(7, -12);
      ctx.lineTo(7, -4);
      ctx.closePath(); ctx.fill();
      break;

    case 'desierto':
      ctx.fillStyle = '#4a9a5c';
      round(ctx, -2.5, -14, 5, 14, 2.5); ctx.fill();
      round(ctx, 2, -11, 5, 2.6, 1.3); ctx.fill();
      round(ctx, 4.5, -13, 2.6, 4, 1.3); ctx.fill();
      break;

    // --- Los tres sitios nuevos ---

    case 'muelle': {
      // Un ancla: se lee como puerto de un vistazo
      ctx.strokeStyle = '#dfe8f2';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -13); ctx.lineTo(0, -2);
      ctx.moveTo(-4, -11); ctx.lineTo(4, -11);
      ctx.moveTo(-6, -6); ctx.quadraticCurveTo(0, 1, 6, -6);
      ctx.stroke();
      ctx.fillStyle = '#dfe8f2';
      ctx.beginPath();
      ctx.arc(0, -14.5, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'feria': {
      // Noria girando de verdad, aunque sea del tamano de una moneda
      const giro = time * 0.6;
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -10, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = giro + (i * Math.PI) / 4;
        ctx.moveTo(-Math.cos(a) * 7, -10 - Math.sin(a) * 7);
        ctx.lineTo(Math.cos(a) * 7, -10 + Math.sin(a) * 7);
      }
      ctx.stroke();
      ctx.strokeStyle = '#e8434f';
      ctx.beginPath();
      ctx.moveTo(-4, 0); ctx.lineTo(0, -10); ctx.lineTo(4, 0);
      ctx.stroke();
      break;
    }

    case 'volcan': {
      // Cono negro con la boca encendida y humo saliendo
      ctx.fillStyle = '#2c211f';
      ctx.beginPath();
      ctx.moveTo(-9, 0); ctx.lineTo(-3.5, -13); ctx.lineTo(3.5, -13); ctx.lineTo(9, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff7a3c';
      ctx.fillRect(-3.5, -14, 7, 2.5);
      ctx.fillStyle = 'rgba(255, 140, 60, 0.55)';
      ctx.beginPath();
      ctx.moveTo(-2, -13); ctx.lineTo(0, -4); ctx.lineTo(2, -13);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(200, 190, 185, 0.45)';
      for (let i = 0; i < 3; i++) {
        const o = (time * 10 + i * 6) % 18;
        ctx.beginPath();
        ctx.arc(Math.sin(o * 0.35) * 2.5, -16 - o, 1.6 + o * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }

  ctx.restore();
}

function drawBuildings(ctx, world, mx, my) {
  for (const slot of world.buildingSlots) {
    const x = mx(slot.x);
    const y = my(slot.groundY) - 2;

    ctx.fillStyle = 'rgba(10, 16, 34, 0.75)';
    ctx.beginPath();
    ctx.arc(x, y - 6, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(x - 3.5, y - 7, 7, 5);
    ctx.beginPath();
    ctx.moveTo(x - 4.5, y - 7); ctx.lineTo(x, y - 11); ctx.lineTo(x + 4.5, y - 7);
    ctx.closePath();
    ctx.fill();
  }
}

function drawSafeZone(ctx, match, mx) {
  if (!match?.zone || match.zone.progress <= 0) return;

  const zona = match.zone;
  // Suave a proposito: si tapa mucho, no se distinguen los biomas.
  ctx.fillStyle = 'rgba(120, 60, 190, 0.20)';
  const izq = mx(zona.minX) - PANEL.x;
  if (izq > 0) ctx.fillRect(PANEL.x, PANEL.y, izq, PANEL.h);
  const der = PANEL.x + PANEL.w - mx(zona.maxX);
  if (der > 0) ctx.fillRect(mx(zona.maxX), PANEL.y, der, PANEL.h);

  ctx.strokeStyle = '#d8a8ff';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([7, 5]);
  for (const bx of [zona.minX, zona.maxX]) {
    ctx.beginPath();
    ctx.moveTo(mx(bx), PANEL.y);
    ctx.lineTo(mx(bx), PANEL.y + PANEL.h);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

/** Cuadricula tipo A1-H3, como las referencias de un mapa de verdad. */
function drawGrid(ctx) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.lineWidth = 1;

  for (let c = 1; c < COLS; c++) {
    const x = PANEL.x + (PANEL.w / COLS) * c;
    ctx.beginPath();
    ctx.moveTo(x, PANEL.y); ctx.lineTo(x, PANEL.y + PANEL.h);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    const y = PANEL.y + (PANEL.h / ROWS) * r;
    ctx.beginPath();
    ctx.moveTo(PANEL.x, y); ctx.lineTo(PANEL.x + PANEL.w, y);
    ctx.stroke();
  }

  // Letras y numeros
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  for (let c = 0; c < COLS; c++) {
    ctx.fillText(LETRAS[c], PANEL.x + (PANEL.w / COLS) * (c + 0.5), PANEL.y + PANEL.h - 8);
  }
  ctx.textAlign = 'left';
  for (let r = 0; r < ROWS; r++) {
    ctx.fillText(String(r + 1), PANEL.x + 7, PANEL.y + (PANEL.h / ROWS) * (r + 0.5) + 4);
  }
}

/** Ruta del bus y donde va ahora mismo. */
function drawBusRoute(ctx, match, mx, time) {
  if (!match?.bus || match.phase !== 'bus') return;

  const bus = match.bus;
  const y = PANEL.y + 17;

  // Trazado
  ctx.strokeStyle = 'rgba(255, 210, 63, 0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([9, 7]);
  ctx.beginPath();
  ctx.moveTo(mx(bus.startX), y);
  ctx.lineTo(mx(bus.endX), y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Punta de flecha en el destino
  const dir = Math.sign(bus.endX - bus.startX) || 1;
  ctx.fillStyle = 'rgba(255, 210, 63, 0.8)';
  ctx.beginPath();
  ctx.moveTo(mx(bus.endX), y);
  ctx.lineTo(mx(bus.endX) - dir * 9, y - 5);
  ctx.lineTo(mx(bus.endX) - dir * 9, y + 5);
  ctx.closePath();
  ctx.fill();

  // El bus
  const bx = mx(bus.x);
  ctx.fillStyle = '#3f8fe8';
  ctx.beginPath();
  ctx.arc(bx, y - 9, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5c23f';
  round(ctx, bx - 11, y - 4, 22, 9, 3);
  ctx.fill();
  ctx.fillStyle = '#9fe0ff';
  ctx.fillRect(bx - 7, y - 2, 4, 3);
  ctx.fillRect(bx - 1, y - 2, 4, 3);
  ctx.fillRect(bx + 5, y - 2, 3, 3);
}

function drawPlayerMarker(ctx, player, mx, my, time) {
  const px = mx(player.x + player.w / 2);
  const py = my(Math.max(WORLD_TOP, Math.min(WORLD_BOT, player.y + player.h)));

  // Haz de luz hasta el suelo
  const haz = ctx.createLinearGradient(0, PANEL.y, 0, py);
  haz.addColorStop(0, 'rgba(255, 210, 63, 0)');
  haz.addColorStop(1, 'rgba(255, 210, 63, 0.35)');
  ctx.fillStyle = haz;
  ctx.fillRect(px - 9, PANEL.y, 18, py - PANEL.y);

  // Anillos que laten
  for (let i = 0; i < 2; i++) {
    const t = ((time * 0.9 + i * 0.5) % 1);
    ctx.strokeStyle = `rgba(255, 210, 63, ${0.5 * (1 - t)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 6 + t * 20, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Rombo
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#ffd23f';
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 2;
  ctx.fillRect(-5, -5, 10, 10);
  ctx.strokeRect(-5, -5, 10, 10);
  ctx.restore();

  // Etiqueta
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeText('TU', px, py - 16);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('TU', px, py - 16);
}

/** Chapas con el nombre de cada sitio, encima del panel. */
function drawZoneLabels(ctx, mx) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';

  ZONES.forEach((z, i) => {
    const cx = mx((z.x0 + z.x1) / 2);
    // Se alternan TRES alturas. Con 7 sitios bastaban dos, pero al pasar
    // a 10 cada zona ocupa menos ancho en el panel y los rotulos largos
    // ("FABRICA TORNILLO") se pisaban con el del vecino.
    const y = PANEL.y + 34 + (i % 3) * 20;
    const biome = biomeOf(z.biome);
    const texto = z.name.toUpperCase();
    const ancho = ctx.measureText(texto).width + 20;

    ctx.fillStyle = 'rgba(8, 14, 30, 0.82)';
    round(ctx, cx - ancho / 2, y - 12, ancho, 17, 5);
    ctx.fill();
    ctx.strokeStyle = hexA(biome.grassMid, 0.9);
    ctx.lineWidth = 1.5;
    round(ctx, cx - ancho / 2, y - 12, ancho, 17, 5);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(texto, cx, y);
  });
}

/* =============================================================
   LEYENDA Y PIE
   ============================================================= */

function drawLegend(ctx, view) {
  const items = [
    { color: '#ffe9a8', texto: 'Edificio' },
    { color: '#6fd2f2', texto: 'Agua' },
    { color: '#d8a8ff', texto: 'Fuera de la zona' },
    { color: '#f5c23f', texto: 'Bus de batalla' },
    { color: '#ffd23f', texto: 'Tu posicion' },
  ];

  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';

  const anchos = items.map((it) => ctx.measureText(it.texto).width + 30);
  const total = anchos.reduce((a, b) => a + b, 0);
  let x = (view.width - total) / 2;
  const y = PANEL.y + PANEL.h + 34;

  items.forEach((it, i) => {
    ctx.fillStyle = it.color;
    ctx.beginPath();
    ctx.arc(x + 7, y - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(234, 241, 255, 0.8)';
    ctx.fillText(it.texto, x + 18, y);
    x += anchos[i];
  });
}

function drawFooter(ctx, view, player, world) {
  const cx = player.x + player.w / 2;
  const zona = ZONES.find((z) => cx >= z.x0 && cx <= z.x1);

  // Cuadrante donde estas
  const col = Math.max(0, Math.min(COLS - 1, Math.floor((cx / world.width) * COLS)));
  const alturaRel = (player.y + player.h - WORLD_TOP) / (WORLD_BOT - WORLD_TOP);
  const fila = Math.max(0, Math.min(ROWS - 1, Math.floor(alturaRel * ROWS)));
  const cuadrante = `${LETRAS[col]}${fila + 1}`;

  ctx.textAlign = 'center';

  ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#eaf1ff';
  ctx.fillText(
    zona ? `${zona.name}   ·   cuadrante ${cuadrante}` : `Campo abierto   ·   cuadrante ${cuadrante}`,
    view.width / 2, PANEL.y + PANEL.h + 76
  );

  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(segunControl('Pulsa M para cerrar el mapa', 'Toca MAPA para cerrarlo'), view.width / 2, PANEL.y + PANEL.h + 102);
}

/* =============================================================
   UTILIDADES
   ============================================================= */

function panelPath(ctx, x, y, w, h, r) {
  round(ctx, x, y, w, h, r);
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

function triangulo(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + r, y + r * 1.5);
  ctx.lineTo(x - r, y + r * 1.5);
  ctx.closePath();
  ctx.fill();
}

/** Color hexadecimal con transparencia. */
function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
