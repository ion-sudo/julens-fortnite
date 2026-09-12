/**
 * pickup.js
 * ---------------------------------------------------------------
 * OBJETOS TIRADOS EN EL SUELO: armas y curas que se ven por el mundo
 * con el halo del color de su rareza, flotando suavemente.
 *
 * Se recogen de dos maneras:
 *   - automaticamente al pasar por encima, si te queda una ranura libre
 *   - con la tecla E, que ademas INTERCAMBIA por lo que llevas si
 *     tienes el inventario lleno
 */

import { rarityColor, rarityOf } from '../data/rarities.js';
import { drawWeapon } from './weaponSprite.js';
import { drawHeal } from './healSprite.js';
import { drawAmmoBox } from './ammoSprite.js';
import { drawThrowable } from './throwableSprite.js';
import { drawGadget } from './gadgetSprite.js';
import { ammoInfo } from '../data/ammo.js';
import { CONFIG } from '../core/config.js';
import { bodyAt } from '../world/water.js';
import { roundRectPath } from '../core/utils.js';

/** Radio (px) dentro del cual se puede recoger. */
export const PICKUP_RADIUS = 46;

export class Pickup {
  /**
   * @param {number} x,y  posicion inicial (cae hasta apoyarse en el suelo)
   * @param {object} item instancia de arma o cura (ver data/loot.js)
   */
  constructor(x, y, item) {
    this.x = x;
    this.y = y;
    this.item = item;
    this.vx = 0;   // los cofres los expulsan en arco; lo demas cae recto
    this.vy = 0;
    this.onGround = false;
    this.w = 34;
    this.h = 26;
    // Desfase para que no floten todos a la vez
    this.bobOffset = Math.random() * Math.PI * 2;
    this.taken = false;
    /** Evita recoger al instante lo que acabas de soltar con R. */
    this.pickupDelay = 0;
  }

  /** Rectangulo de contacto con el jugador. */
  rect() {
    return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
  }

  /** Cae por gravedad hasta posarse sobre una plataforma. */
  update(dt, world) {
    this.pickupDelay = Math.max(0, this.pickupDelay - dt);

    if (this.onGround) return;

    this.vy = Math.min(this.vy + CONFIG.world.gravity * dt, CONFIG.world.maxFallSpeed);
    const anteriorY = this.y;
    this.y += this.vy * dt;

    // Desplazamiento horizontal (solo lo usan los objetos de cofre),
    // con rozamiento del aire para que no se vayan muy lejos.
    if (this.vx !== 0) {
      this.x += this.vx * dt;
      this.vx *= Math.max(0, 1 - dt * 2.6);
      this.x = Math.max(20, Math.min(world.width - 20, this.x));
    }

    // Busca la primera superficie que cruza en esta caida
    const zona = {
      x: this.x - this.w / 2,
      y: Math.min(anteriorY, this.y) - 4,
      w: this.w,
      h: Math.abs(this.y - anteriorY) + 8,
    };

    for (const p of world.getPlatformsNear(zona, 4)) {
      const dentroX = this.x > p.x - 4 && this.x < p.x + p.w + 4;
      if (!dentroX) continue;
      if (anteriorY <= p.y + 1 && this.y >= p.y) {
        this.y = p.y;
        this.vy = 0;
        this.vx = 0;
        this.onGround = true;
        return;
      }
    }

    // Si cae al agua, se queda flotando en la superficie (antes se perdia).
    const agua = bodyAt(world.waterBodies || [], this.x, this.y);
    if (agua) {
      this.y = agua.y;
      this.vy = 0;
      this.vx *= 0.5;
      this.onGround = true;
      this.floating = true;
    }
  }

  /** ¿Esta el jugador lo bastante cerca para recogerlo? */
  isNear(player) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    return Math.hypot(px - this.x, py - (this.y - this.h / 2)) < PICKUP_RADIUS;
  }

  /** Color del halo: la rareza, o el tipo de balas si es municion. */
  get glowColor() {
    return this.item.kind === 'ammo'
      ? ammoInfo(this.item.ammoType).color
      : rarityColor(this.item.rarity);
  }

  draw(ctx, time) {
    const color = this.glowColor;
    const flota = Math.sin(time * 2.4 + this.bobOffset) * 3;
    const cy = this.y - 18 + flota;

    ctx.save();

    // --- Peana luminosa en el suelo ---
    const g = ctx.createRadialGradient(this.x, this.y - 4, 2, this.x, this.y - 4, 30);
    g.addColorStop(0, color + 'cc');
    g.addColorStop(1, color + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y - 4, 28, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Haz vertical suave ---
    const haz = ctx.createLinearGradient(0, this.y - 60, 0, this.y);
    haz.addColorStop(0, color + '00');
    haz.addColorStop(1, color + '55');
    ctx.fillStyle = haz;
    ctx.fillRect(this.x - 13, this.y - 60, 26, 60);

    // --- El objeto ---
    ctx.translate(this.x, cy);
    if (this.item.kind === 'weapon') {
      // Un poco inclinada y centrada respecto a la empunadura
      drawWeapon(ctx, this.item, { x: -14, y: 6, angle: -0.32, scale: 0.72 });
    } else if (this.item.kind === 'ammo') {
      drawAmmoBox(ctx, this.item, { x: 0, y: 2, scale: 0.8 });
    } else if (this.item.kind === 'throwable') {
      drawThrowable(ctx, this.item, { x: 0, y: 0, scale: 0.95 });
    } else if (this.item.kind === 'gadget') {
      // El dibujo se apoya en su base, asi que se baja para centrarlo.
      drawGadget(ctx, this.item, { x: 0, y: 14, scale: 0.6 });
    } else {
      drawHeal(ctx, this.item, { x: 0, y: 0, scale: 0.72 });
    }

    ctx.restore();

    // --- Hitbox de depuracion ---
    if (CONFIG.debug.showHitboxes) {
      const r = this.rect();
      ctx.strokeStyle = 'rgba(255,220,80,0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  }

  /** Cartel con el nombre y la rareza; solo cuando estas al lado. */
  drawLabel(ctx, lleno) {
    const esMunicion = this.item.kind === 'ammo';
    const rareza = esMunicion
      ? { color: this.glowColor, name: 'Municion' }
      : rarityOf(this.item);
    const nombre = esMunicion
      ? `${this.item.name} x${this.item.amount}`
      : this.item.name + (this.item.count > 1 ? ` x${this.item.count}` : '');
    const pie = lleno ? 'E para cambiar' : 'E para recoger';

    ctx.save();
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    const ancho = Math.max(ctx.measureText(nombre).width, 96) + 22;
    const x = this.x - ancho / 2;
    const y = this.y - 84;

    // Panel
    ctx.fillStyle = 'rgba(10, 16, 34, 0.88)';
    ctx.strokeStyle = rareza.color;
    ctx.lineWidth = 2;
    roundRectPath(ctx, x, y, ancho, 44, 8);
    ctx.fill();
    ctx.stroke();

    // Textos
    ctx.textAlign = 'center';
    ctx.fillStyle = rareza.color;
    ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
    ctx.fillText(rareza.name.toUpperCase(), this.x, y + 13);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillText(nombre, this.x, y + 27);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
    ctx.fillText(pie, this.x, y + 39);

    ctx.restore();
  }
}
