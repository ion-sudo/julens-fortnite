/**
 * target.js
 * ---------------------------------------------------------------
 * DIANAS DE ENTRENAMIENTO: maniquies de madera repartidos por la isla.
 *
 * Existen para poder COMPROBAR el dano de cada arma mientras no haya
 * bots: reciben impactos, ensenan su barra de vida y el numero de dano,
 * se rompen y vuelven a montarse solos a los pocos segundos.
 * Cuando lleguen los 50 bots, este archivo se puede borrar sin tocar
 * nada mas: el sistema de balas solo necesita objetos con rect() y
 * takeDamage().
 */

import { roundRectPath } from '../core/utils.js';

const RESPAWN_TIME = 4;

export class Target {
  constructor(x, groundY, maxHealth = 200) {
    this.x = x;
    this.groundY = groundY;
    this.w = 34;
    this.h = 70;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.dead = false;
    this.hitFlash = 0;
    this.wobble = 0;
    this.respawnTimer = 0;
    /** Se rellena desde fuera: sirve para mostrar el dano acumulado. */
    this.onDamage = null;
  }

  rect() {
    return { x: this.x - this.w / 2, y: this.groundY - this.h, w: this.w, h: this.h };
  }

  takeDamage(amount, hx, hy) {
    if (this.dead) return;

    this.health -= amount;
    this.hitFlash = 0.14;
    this.wobble = 1;
    this.onDamage?.(amount, hx ?? this.x, hy ?? this.groundY - this.h / 2);

    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.respawnTimer = RESPAWN_TIME;
    }
  }

  update(dt) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.wobble *= Math.max(0, 1 - dt * 5);

    if (this.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.dead = false;
        this.health = this.maxHealth;
      }
    }
  }

  draw(ctx, time) {
    const r = this.rect();

    if (this.dead) {
      // Restos en el suelo mientras se "reconstruye"
      ctx.fillStyle = 'rgba(122, 75, 38, 0.55)';
      ctx.fillRect(this.x - 18, this.groundY - 6, 36, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.ceil(this.respawnTimer)}s`, this.x, this.groundY - 14);
      return;
    }

    ctx.save();
    // Se balancea al recibir impactos
    ctx.translate(this.x, this.groundY);
    ctx.rotate(Math.sin(time * 26) * 0.05 * this.wobble);
    ctx.translate(-this.x, -this.groundY);

    // Poste
    ctx.fillStyle = '#6b4522';
    ctx.fillRect(this.x - 4, this.groundY - 34, 8, 34);
    // Base
    ctx.fillStyle = '#5e3819';
    ctx.fillRect(this.x - 14, this.groundY - 6, 28, 6);

    // Tablero
    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#c89a5e';
    roundRectPath(ctx, r.x, r.y, r.w, 42, 6);
    ctx.fill();
    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#a9763f';
    ctx.fillRect(r.x, r.y + 18, r.w, 5);

    // Circulos de diana
    if (this.hitFlash <= 0) {
      ctx.fillStyle = '#d8433f';
      ctx.beginPath();
      ctx.arc(this.x, r.y + 21, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4efe4';
      ctx.beginPath();
      ctx.arc(this.x, r.y + 21, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d8433f';
      ctx.beginPath();
      ctx.arc(this.x, r.y + 21, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // --- Barra de vida encima ---
    const bw = 40;
    const bx = this.x - bw / 2;
    const by = r.y - 12;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.75)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
    ctx.fillStyle = '#5fd14a';
    ctx.fillRect(bx, by, bw * (this.health / this.maxHealth), 5);
  }
}

/**
 * Coloca unas cuantas dianas sobre las islas del mundo.
 * @param {import('../world/level.js').World} world
 */
export function spawnTargets(world) {
  // Una diana por zona, en un hueco despejado de su isla principal.
  // Antes eran posiciones fijas escritas a mano; al crecer el mapa se
  // quedaron cortas, asi que ahora se sacan del propio mundo.
  const porZona = new Map();

  for (const isla of world.islands) {
    if (!isla.zone || isla.w < 300) continue;
    const actual = porZona.get(isla.zone);
    if (!actual || isla.w > actual.w) porZona.set(isla.zone, isla);
  }

  return [...porZona.values()].map((isla) => {
    // Un poco descentrada, para que no tape siempre lo mismo
    const x = isla.x + isla.w * 0.72;
    return new Target(x, isla.y);
  });
}
