/**
 * inventoryHud.js
 * ---------------------------------------------------------------
 * LAS 6 CAJITAS del inventario, abajo a la derecha.
 *
 *   Cajita 1 -> el pico (tecla F)
 *   Cajitas 2..6 -> armas y curas (teclas 1..5)
 *
 * Cada cajita ensena el dibujo del objeto, el borde del color de su
 * rareza y la tecla que la selecciona. La ranura equipada se resalta.
 *
 * A la izquierda de las cajitas va el CONTADOR DE BALAS del arma que
 * llevas puesta, con el color de su tipo de municion.
 */

import { SLOT_COUNT, PICKAXE_SLOT } from '../core/inventory.js';
import { rarityColor } from '../data/rarities.js';
import { drawWeapon } from '../entities/weaponSprite.js';
import { drawHeal } from '../entities/healSprite.js';
import { drawPickaxe } from '../entities/gearSprite.js';
import { drawAmmoBox } from '../entities/ammoSprite.js';
import { drawThrowable } from '../entities/throwableSprite.js';
import { drawGadget } from '../entities/gadgetSprite.js';
import { ammoInfo } from '../data/ammo.js';

const SLOT_W = 74;
const SLOT_H = 74;
const GAP = 8;
const MARGIN = 24;

/** Etiqueta de tecla de cada ranura. */
const KEY_LABELS = ['F', '1', '2', '3', '4', '5'];

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../core/inventory.js').Inventory} inventory
 * @param {{width:number,height:number}} view
 */
export function drawInventory(ctx, inventory, view, time, player = null) {
  const totalW = SLOT_COUNT * SLOT_W + (SLOT_COUNT - 1) * GAP;
  const x0 = view.width - MARGIN - totalW;
  const y0 = view.height - MARGIN - SLOT_H;

  for (let i = 0; i < SLOT_COUNT; i++) {
    const x = x0 + i * (SLOT_W + GAP);
    drawSlot(ctx, inventory, i, x, y0, time, player);
  }

  // Contador de balas del arma equipada, a la izquierda de las cajitas.
  const equipada = inventory.equipped;
  if (player && equipada?.kind === 'weapon') {
    drawAmmoCounter(ctx, player, equipada, x0 - GAP - AMMO_W, y0);
  }
}

/* =============================================================
   CONTADOR DE BALAS
   ============================================================= */
const AMMO_W = 126;

function drawAmmoCounter(ctx, player, weapon, x, y) {
  const info = ammoInfo(weapon.def.ammo);
  const balas = player.ammoFor(weapon);
  const vacio = balas <= 0;

  ctx.save();

  // Panel
  ctx.fillStyle = 'rgba(10, 16, 34, 0.82)';
  roundRect(ctx, x, y, AMMO_W, SLOT_H, 10);
  ctx.fill();
  ctx.strokeStyle = vacio ? '#e05a4a' : info.color;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, AMMO_W, SLOT_H, 10);
  ctx.stroke();

  // Icono de la caja de balas
  drawAmmoBox(ctx, { ammoType: info.id }, { x: x + 26, y: y + SLOT_H / 2 + 2, scale: 0.62 });

  // Cantidad
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
  ctx.fillStyle = vacio ? '#e05a4a' : '#ffffff';
  ctx.fillText(String(balas), x + AMMO_W - 12, y + 44);

  // Tipo de municion
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.fillStyle = info.color;
  ctx.fillText(info.name.toUpperCase(), x + AMMO_W - 12, y + 60);

  // Aviso de vacio
  if (vacio) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#ff9b8a';
    ctx.fillText('SIN BALAS', x + 10, y + 66);
  }

  ctx.restore();
}

function drawSlot(ctx, inventory, index, x, y, time, player = null) {
  const item = inventory.slots[index];
  const seleccionada = inventory.selected === index;
  const color = item ? rarityColor(item.rarity) : 'rgba(255,255,255,0.28)';

  ctx.save();

  // --- Fondo ---
  ctx.fillStyle = seleccionada ? 'rgba(24, 36, 70, 0.94)' : 'rgba(10, 16, 34, 0.78)';
  roundRect(ctx, x, y, SLOT_W, SLOT_H, 10);
  ctx.fill();

  // Tinte de rareza dentro de la cajita
  if (item) {
    const g = ctx.createLinearGradient(0, y, 0, y + SLOT_H);
    g.addColorStop(0, color + '00');
    g.addColorStop(1, color + '4d');
    ctx.fillStyle = g;
    roundRect(ctx, x, y, SLOT_W, SLOT_H, 10);
    ctx.fill();
  }

  // --- Borde ---
  ctx.strokeStyle = seleccionada ? '#ffd23f' : color;
  ctx.lineWidth = seleccionada ? 3 : 2;
  roundRect(ctx, x, y, SLOT_W, SLOT_H, 10);
  ctx.stroke();

  // Resplandor de la ranura activa
  if (seleccionada) {
    ctx.strokeStyle = 'rgba(255, 210, 63, 0.35)';
    ctx.lineWidth = 6;
    roundRect(ctx, x - 2, y - 2, SLOT_W + 4, SLOT_H + 4, 12);
    ctx.stroke();
  }

  // --- Dibujo del objeto ---
  if (item) {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x + 2, y + 2, SLOT_W - 4, SLOT_H - 4, 8);
    ctx.clip();
    drawSlotIcon(ctx, item, x + SLOT_W / 2, y + SLOT_H / 2 + 2);
    ctx.restore();
  }

  // --- Balas disponibles de cada arma, en pequeno ---
  if (item?.kind === 'weapon' && player) {
    const info = ammoInfo(item.def.ammo);
    const balas = player.ammoFor(item);
    ctx.fillStyle = 'rgba(10, 16, 34, 0.9)';
    roundRect(ctx, x + SLOT_W - 32, y + SLOT_H - 20, 28, 16, 5);
    ctx.fill();
    ctx.fillStyle = balas > 0 ? info.color : '#e05a4a';
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(balas), x + SLOT_W - 18, y + SLOT_H - 11);
  }

  // --- Cantidad (curas y granadas apiladas) ---
  // Las granadas la ensenan SIEMPRE, aunque quede una: saber cuantas te
  // quedan es justo lo que decide si la tiras ahora o te la guardas.
  const apilable = item?.kind === 'heal' || item?.kind === 'throwable' ||
                   item?.kind === 'gadget';
  if (apilable && (item.count > 1 || item.kind !== 'heal')) {
    ctx.fillStyle = 'rgba(10, 16, 34, 0.9)';
    roundRect(ctx, x + SLOT_W - 26, y + SLOT_H - 20, 22, 16, 5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`x${item.count}`, x + SLOT_W - 15, y + SLOT_H - 11);
  }

  // --- Tecla ---
  ctx.fillStyle = seleccionada ? '#ffd23f' : 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(KEY_LABELS[index], x + 7, y + 6);

  ctx.restore();

  // --- Nombre del objeto equipado, encima de la barra ---
  if (seleccionada && item) {
    ctx.save();
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const cx = x + SLOT_W / 2;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(item.name, cx, y - 10);
    ctx.fillStyle = rarityColor(item.rarity);
    ctx.fillText(item.name, cx, y - 10);
    ctx.restore();
  }
}

/** Dibuja el icono correcto segun el tipo de objeto. */
function drawSlotIcon(ctx, item, cx, cy) {
  switch (item.kind) {
    case 'pickaxe':
      // El pico usa el dibujo del cosmetico equipado en la taquilla.
      if (item.cosmetic) drawPickaxe(ctx, item.cosmetic, { x: cx, y: cy, scale: 0.42 });
      break;

    case 'weapon':
      // Se centra la empunadura para que quepa dentro de la cajita.
      drawWeapon(ctx, item, { x: cx - 20, y: cy + 6, angle: -0.24, scale: 0.82 });
      break;

    case 'heal':
      drawHeal(ctx, item, { x: cx, y: cy, scale: 1.05 });
      break;

    case 'throwable':
      drawThrowable(ctx, item, { x: cx, y: cy, scale: 1.15 });
      break;

    case 'gadget':
      // Se apoya en su base: se baja para que quede centrado en la caja.
      drawGadget(ctx, item, { x: cx, y: cy + 18, scale: 0.72 });
      break;
  }
}

/** roundRect propio para no depender del soporte del navegador. */
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
