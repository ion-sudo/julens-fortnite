/**
 * itemPreview.js
 * ---------------------------------------------------------------
 * Pinta la vista previa de CUALQUIER cosmetico dentro de un canvas.
 * Lo usan la vitrina del menu, las tarjetas de la tienda y la taquilla,
 * asi que todas ensenan exactamente el mismo dibujo que veras en partida.
 */

import { drawCharacterPreview } from '../entities/playerSprite.js';
import { drawPickaxe, drawGlider } from '../entities/gearSprite.js';
import { drawEmoteIcon } from './emoteWheel.js';
import { rarityOf } from '../data/rarities.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} item  entrada del catalogo (skin, pico o paravela)
 * @param {object} [opts]
 * @param {number} [opts.time]   segundos, para animar el idle de las skins
 * @param {string} [opts.state]  estado de animacion de la skin
 */
export function drawItemPreview(ctx, item, opts = {}) {
  // 'showcase': la pose de escaparate, con los brazos separados del
  // cuerpo. Con la de andar, el brazo tapa justo el emblema y el
  // patron de la chaqueta, que es lo que hay que lucir aqui.
  const { time = 0, state = 'showcase' } = opts;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  switch (item.type) {
    case 'skin':
      // Los pies se apoyan cerca del borde inferior del canvas.
      drawCharacterPreview(ctx, {
        skin: item,
        x: w / 2,
        y: h * 0.92,
        scale: h / 96,
        state,
        time,
      });
      break;

    case 'pickaxe':
      drawPickaxe(ctx, item, {
        x: w / 2,
        y: h / 2,
        scale: Math.min(w, h) / 115,
        rotation: -0.12,
      });
      break;

    case 'glider':
      drawGlider(ctx, item, {
        x: w / 2,
        y: h / 2 + h * 0.06,
        scale: Math.min(w, h) / 140,
      });
      break;

    case 'emote':
      // El mismo icono que sale en la rueda, para que sea reconocible.
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(Math.min(w, h) / 46, Math.min(w, h) / 46);
      drawEmoteIcon(ctx, item.icon, rarityOf(item).color, time);
      ctx.restore();
      break;
  }
}

/** Crea un canvas ya dibujado (para las tarjetas de la rejilla). */
export function makePreviewCanvas(item, size = 168) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  drawItemPreview(canvas.getContext('2d'), item);
  return canvas;
}
