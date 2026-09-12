/**
 * terrain.js
 * ---------------------------------------------------------------
 * Dibujo del terreno: islas de tierra con hierba encima,
 * plataformas finas de madera y la decoracion pequena
 * (matas de hierba, manchas de tierra).
 *
 * Se dibuja en coordenadas de MUNDO (dentro de la camara).
 */

import { PALETTE, CONFIG } from '../core/config.js';
import { roundRectPath } from '../core/utils.js';
import { biomeOf } from '../data/biomes.js';

const GRASS_BAND = 22;   // grosor de la capa de hierba
const SCALLOP = 26;      // ancho de cada "onda" del borde superior

export function drawTerrain(ctx, world, camera) {
  // --- 1) Bloques de tierra + hierba ---
  for (const p of world.platforms) {
    if (!p.ground) continue;
    if (!camera.isVisible(p.x, p.y, p.w, p.h)) continue;
    // Los fondos de lago se pintan como roca sumergida, sin hierba.
    if (p.lakeBed) drawLakeBed(ctx, p);
    else drawGroundBlock(ctx, p, biomeOf(p.biome));
  }

  // El tramo de mundo que ve la camara. La hierba y las manchas se
  // consultan por columnas (ver World.forEachDecorNear): son decenas de
  // miles de piezas repartidas por 26.000 px y en pantalla caben 1.400.
  const [vx0, vx1] = world.viewRange(camera);

  // --- 2) Manchas de tierra (textura) ---
  world.forEachDecorNear(world.spotGrid, vx0, vx1, (spot) => {
    if (!camera.isVisible(spot.x - spot.r, spot.y - spot.r, spot.r * 2, spot.r * 2)) return;
    ctx.fillStyle = spot.dark ? 'rgba(60, 36, 16, 0.30)' : 'rgba(212, 160, 96, 0.28)';
    ctx.beginPath();
    ctx.ellipse(spot.x, spot.y, spot.r, spot.r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // --- 3) Matas de hierba en el borde ---
  // Cada bioma tiene su color de mata, asi que se agrupan por color
  // para no cambiar de estilo en cada brizna.
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  let colorActual = null;
  world.forEachDecorNear(world.tuftGrid, vx0, vx1, (t) => {
    if (!camera.isVisible(t.x - 4, t.y - t.h, 8, t.h)) return;
    if (t.color !== colorActual) {
      if (colorActual !== null) ctx.stroke();
      colorActual = t.color;
      ctx.strokeStyle = colorActual;
      ctx.beginPath();
    }
    ctx.moveTo(t.x, t.y - 2);
    ctx.quadraticCurveTo(t.x + t.lean * 0.5, t.y - t.h * 0.6, t.x + t.lean, t.y - t.h);
  });
  if (colorActual !== null) ctx.stroke();

  // --- 4) Plataformas finas ---
  for (const p of world.platforms) {
    if (p.ground) continue;
    if (!camera.isVisible(p.x, p.y, p.w, p.h)) continue;
    drawThinPlatform(ctx, p, biomeOf(p.biome));
  }

  // --- 5) Hitboxes de depuracion (F1) ---
  if (CONFIG.debug.showHitboxes) {
    ctx.strokeStyle = 'rgba(255, 0, 128, 0.85)';
    ctx.lineWidth = 2;
    for (const p of world.platforms) {
      if (!camera.isVisible(p.x, p.y, p.w, p.h)) continue;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }
  }
}

/** Fondo de lago: arena y piedras, sin hierba (queda bajo el agua). */
function drawLakeBed(ctx, p) {
  const g = ctx.createLinearGradient(0, p.y, 0, p.y + 160);
  g.addColorStop(0, '#c9b184');
  g.addColorStop(1, '#8a7350');
  ctx.fillStyle = g;
  ctx.fillRect(p.x, p.y, p.w, p.h);

  // Piedrecitas del fondo
  ctx.fillStyle = 'rgba(90, 78, 58, 0.5)';
  for (let i = 0; i < 7; i++) {
    const x = p.x + ((i * 53) % (p.w - 20)) + 10;
    ctx.beginPath();
    ctx.ellipse(x, p.y + 8 + (i % 3) * 7, 6 - (i % 3), 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Isla / escalon de tierra: cuerpo marron + banda de hierba ondulada. */
function drawGroundBlock(ctx, p, biome) {
  // Cuerpo de tierra (degradado vertical para dar profundidad),
  // con los colores del bioma de la zona.
  const g = ctx.createLinearGradient(0, p.y, 0, p.y + Math.min(p.h, 520));
  g.addColorStop(0, biome.dirtLight);
  g.addColorStop(0.35, biome.dirtMid);
  g.addColorStop(1, biome.dirtDark);
  ctx.fillStyle = g;
  roundRectPath(ctx, p.x, p.y, p.w, p.h, 14);
  ctx.fill();

  // Sombras laterales para separar bloques
  ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
  ctx.fillRect(p.x, p.y + GRASS_BAND, 10, p.h - GRASS_BAND);
  ctx.fillRect(p.x + p.w - 10, p.y + GRASS_BAND, 10, p.h - GRASS_BAND);

  // Banda de hierba con borde superior "ondulado"
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + GRASS_BAND + 6);
  ctx.lineTo(p.x, p.y + 4);

  // Ondas suaves a lo largo del ancho
  const steps = Math.max(2, Math.round(p.w / SCALLOP));
  const stepW = p.w / steps;
  for (let i = 0; i < steps; i++) {
    const x0 = p.x + i * stepW;
    ctx.quadraticCurveTo(x0 + stepW * 0.5, p.y - 5, x0 + stepW, p.y + 2);
  }

  ctx.lineTo(p.x + p.w, p.y + GRASS_BAND + 6);
  // Base de la hierba, tambien ligeramente ondulada
  for (let i = steps; i > 0; i--) {
    const x0 = p.x + i * stepW;
    ctx.quadraticCurveTo(x0 - stepW * 0.5, p.y + GRASS_BAND + 12, x0 - stepW, p.y + GRASS_BAND + 6);
  }
  ctx.closePath();

  const gg = ctx.createLinearGradient(0, p.y - 6, 0, p.y + GRASS_BAND + 10);
  gg.addColorStop(0, biome.grassLight);
  gg.addColorStop(0.55, biome.grassMid);
  gg.addColorStop(1, biome.grassDark);
  ctx.fillStyle = gg;
  ctx.fill();
  ctx.restore();
}

/** Plataforma fina: tabla de madera con musgo por encima. */
function drawThinPlatform(ctx, p, biome) {
  // Sombra proyectada
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  roundRectPath(ctx, p.x + 4, p.y + 8, p.w, p.h, 8);
  ctx.fill();

  // Tabla
  const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
  g.addColorStop(0, '#a9713c');
  g.addColorStop(1, '#7a4b26');
  ctx.fillStyle = g;
  roundRectPath(ctx, p.x, p.y, p.w, p.h, 8);
  ctx.fill();

  // Vetas de la madera
  ctx.strokeStyle = 'rgba(60, 34, 12, 0.35)';
  ctx.lineWidth = 2;
  for (let x = p.x + 18; x < p.x + p.w - 8; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, p.y + 8);
    ctx.lineTo(x, p.y + p.h - 4);
    ctx.stroke();
  }

  // Musgo/hierba encima, del color del bioma
  ctx.fillStyle = biome.grassMid;
  roundRectPath(ctx, p.x, p.y, p.w, 8, 4);
  ctx.fill();
  ctx.fillStyle = biome.grassLight;
  roundRectPath(ctx, p.x + 2, p.y, p.w - 4, 4, 2);
  ctx.fill();
}
