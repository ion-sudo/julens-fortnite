/**
 * background.js
 * ---------------------------------------------------------------
 * Cielo, colinas lejanas, nubes y mar. Todo con parallax:
 * cuanto menor es `depth`, mas lejos parece y menos se mueve.
 */

import { PALETTE } from '../core/config.js';
import { ZONES } from '../data/zones.js';
import { biomeOf } from '../data/biomes.js';

/** Ancho de la transicion entre el cielo de un sitio y el del siguiente. */
const BLEND = 1100;

/**
 * TINTE DE CIELO de cada sitio.
 *
 * Cada bioma declara su `sky` (ver data/biomes.js): amarillo en la
 * playa, azul palido en la nieve, naranja en el volcan... Devuelve los
 * tintes que se ven desde esta X con su peso, para que al cruzar de un
 * sitio a otro el cielo cambie POCO A POCO y no de golpe en una linea.
 *
 * @returns {Array<{color: string, weight: number}>} 0, 1 o 2 tintes
 */
export function skyTintsAt(x) {
  // Zona "duena" de esta X. En un canal entre dos sitios, la de la
  // izquierda: la mezcla de abajo se encarga del resto.
  let i = 0;
  for (let k = 0; k < ZONES.length; k++) {
    if (x >= ZONES[k].x0) i = k;
  }

  // ¿Con cual de las vecinas hay que mezclar, y cuanto?
  let mezcla = 0;    // 0 = solo la zona actual, 1 = solo la vecina
  let vecina = -1;

  const siguiente = ZONES[i + 1];
  if (siguiente) {
    // La frontera esta a mitad del canal que las separa.
    const frontera = (ZONES[i].x1 + siguiente.x0) / 2;
    const t = (x - (frontera - BLEND / 2)) / BLEND;
    if (t > 0) { mezcla = Math.min(1, t); vecina = i + 1; }
  }
  if (mezcla === 0 && i > 0) {
    const frontera = (ZONES[i - 1].x1 + ZONES[i].x0) / 2;
    const t = ((frontera + BLEND / 2) - x) / BLEND;
    if (t > 0) { mezcla = Math.min(1, t); vecina = i - 1; }
  }

  const out = [];
  const propio = biomeOf(ZONES[i].biome).sky;
  if (propio) out.push({ color: propio, weight: 1 - mezcla });

  if (vecina >= 0 && mezcla > 0) {
    const otro = biomeOf(ZONES[vecina].biome).sky;
    if (otro) out.push({ color: otro, weight: mezcla });
  }

  return out.filter((t) => t.weight > 0.004);
}

/**
 * Pinta el tinte del sitio sobre TODO EL FONDO.
 *
 * Va despues del cielo, del sol, de las colinas y de las nubes, pero
 * antes del terreno. Asi las colinas del fondo tambien se tinen: eran
 * verdes en todos los sitios, y en el volcan quedaba una franja de
 * pradera detras de la roca negra que cantaba muchisimo.
 *
 * El suelo NO se tine: cada bioma ya tiene sus colores de tierra.
 *
 * @param {number} worldX  centro de la camara en el mundo
 */
export function drawBiomeTint(ctx, viewW, viewH, worldX) {
  for (const t of skyTintsAt(worldX)) {
    ctx.globalAlpha = t.weight;
    ctx.fillStyle = t.color;
    ctx.fillRect(0, 0, viewW, viewH);
  }
  ctx.globalAlpha = 1;
}

/** Degradado de cielo. Se dibuja en coordenadas de PANTALLA (fijo). */
export function drawSky(ctx, viewW, viewH) {
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0.0, PALETTE.skyTop);
  g.addColorStop(0.55, PALETTE.skyMid);
  g.addColorStop(1.0, PALETTE.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  // Sol con halo suave, arriba a la derecha.
  const sunX = viewW * 0.82;
  const sunY = viewH * 0.16;
  const halo = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 190);
  halo.addColorStop(0, 'rgba(255, 244, 190, 0.95)');
  halo.addColorStop(0.35, 'rgba(255, 236, 160, 0.35)');
  halo.addColorStop(1, 'rgba(255, 236, 160, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 190, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff6c8';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 46, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Colinas de fondo (dos capas). Se dibujan en coordenadas de MUNDO
 * pero con la transformacion de parallax de la camara.
 */
export function drawHills(ctx, world, camera) {
  for (const layer of world.hills) {
    ctx.save();
    camera.applyParallax(ctx, layer.depth);

    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(layer.points[0].x, layer.baseY);

    // Curva suave uniendo los picos con cuadraticas.
    for (let i = 0; i < layer.points.length - 1; i++) {
      const p = layer.points[i];
      const n = layer.points[i + 1];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + n.x) / 2, (p.y + n.y) / 2);
    }

    const last = layer.points[layer.points.length - 1];
    ctx.lineTo(last.x, layer.baseY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** Nubes con deriva horizontal lenta, cada una con su propio parallax. */
export function drawClouds(ctx, world, camera, time) {
  for (const c of world.clouds) {
    // Deriva continua, envuelta dentro del ancho del mundo.
    const wx = (((c.x + time * c.speed) % world.width) + world.width) % world.width;

    // Descarte: con applyParallax, lo visible es [cam*depth, cam*depth + tamano].
    const viewX = camera.x * c.depth;
    const viewY = camera.y * c.depth;
    const m = 220 * c.scale;
    if (wx < viewX - m || wx > viewX + camera.w + m) continue;
    if (c.y < viewY - m || c.y > viewY + camera.h + m) continue;

    ctx.save();
    camera.applyParallax(ctx, c.depth);
    drawCloud(ctx, wx, c.y, c.scale);
    ctx.restore();
  }
}

/** Una nube = varios circulos solapados + brillo superior. */
function drawCloud(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  ctx.fillStyle = PALETTE.cloudSoft;
  ctx.beginPath();
  ctx.ellipse(0, 14, 96, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.cloud;
  const puffs = [
    [-52, 6, 26], [-20, -8, 34], [16, -14, 30], [48, 2, 24], [0, 8, 30],
  ];
  ctx.beginPath();
  for (const [px, py, pr] of puffs) {
    ctx.moveTo(px + pr, py);
    ctx.arc(px, py, pr, 0, Math.PI * 2);
  }
  ctx.fill();

  ctx.restore();
}

/*
 * El mar ya NO se dibuja aqui: ahora cada masa de agua (canales y lagos)
 * es un objeto con su propia superficie. Ver js/world/water.js.
 */
