/**
 * fish.js
 * ---------------------------------------------------------------
 * PECES. Nadan de un lado a otro dentro de su masa de agua; al tocarlos
 * se cogen y dan un poco de VIDA.
 *
 * Cuando se pesca uno, reaparece en el mismo lago pasados unos segundos,
 * asi que el agua nunca se queda vacia del todo.
 */

import { CONFIG } from '../core/config.js';

/** Distancia a la que se atrapa un pez. */
const CATCH_RADIUS = 26;

/** Colores: peces distintos, para que se vean variados. */
const SPECIES = [
  { body: '#f5a623', fin: '#d9821a', name: 'Pez dorado' },
  { body: '#4fc3f7', fin: '#2f8fd8', name: 'Pez azul' },
  { body: '#e05a7a', fin: '#b53f5c', name: 'Pez rojo' },
  { body: '#7ee06a', fin: '#4fa842', name: 'Pez verde' },
];

export class Fish {
  /**
   * @param {import('../world/water.js').WaterBody} body  lago o canal
   * @param {() => number} rng
   */
  constructor(body, rng = Math.random) {
    this.body = body;
    this.species = SPECIES[Math.floor(rng() * SPECIES.length)];
    this.scale = 0.8 + rng() * 0.5;
    this.respawnTimer = 0;
    this.caught = false;
    this._place(rng);
  }

  /** Lo coloca en un punto al azar de su masa de agua. */
  _place(rng = Math.random) {
    const margen = 22;
    this.x = this.body.x + margen + rng() * (this.body.w - margen * 2);
    // Nunca justo en la superficie: se nada un poco por debajo.
    this.y = this.body.y + 30 + rng() * Math.max(20, this.body.h - 60);
    this.dir = rng() < 0.5 ? -1 : 1;
    this.speed = 26 + rng() * 34;
    this.wobble = rng() * Math.PI * 2;
    this.baseY = this.y;
  }

  update(dt, rng = Math.random) {
    if (this.caught) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.caught = false;
        this._place(rng);
      }
      return;
    }

    // Nada en horizontal y rebota en los bordes de su lago
    this.x += this.dir * this.speed * dt;
    const margen = 18;
    if (this.x < this.body.x + margen) { this.x = this.body.x + margen; this.dir = 1; }
    if (this.x > this.body.x + this.body.w - margen) {
      this.x = this.body.x + this.body.w - margen;
      this.dir = -1;
    }

    // Sube y baja suavemente
    this.wobble += dt * 1.7;
    this.y = this.baseY + Math.sin(this.wobble) * 9;
  }

  /**
   * ¿Lo ha atrapado el jugador? Si si, devuelve la vida que da.
   * @param {object} player
   * @returns {number} vida curada (0 si no lo ha cogido)
   */
  tryCatch(player) {
    if (this.caught) return 0;

    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    if (Math.hypot(px - this.x, py - this.y) > CATCH_RADIUS) return 0;

    // Solo cura si le hace falta
    const antes = player.health;
    player.health = Math.min(player.maxHealth, player.health + CONFIG.fish.healAmount);
    const curado = player.health - antes;

    this.caught = true;
    this.respawnTimer = CONFIG.fish.respawnTime;
    return curado;
  }

  draw(ctx, time) {
    if (this.caught) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.dir * this.scale, this.scale);

    // Cola (se agita al nadar)
    const coleteo = Math.sin(time * 9 + this.wobble) * 0.35;
    ctx.save();
    ctx.translate(-9, 0);
    ctx.rotate(coleteo);
    ctx.fillStyle = this.species.fin;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-9, -6);
    ctx.lineTo(-9, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Cuerpo
    ctx.fillStyle = this.species.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Aleta de arriba
    ctx.fillStyle = this.species.fin;
    ctx.beginPath();
    ctx.moveTo(-2, -5);
    ctx.lineTo(2, -11);
    ctx.lineTo(5, -4);
    ctx.closePath();
    ctx.fill();

    // Ojo
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, -1.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20304a';
    ctx.beginPath();
    ctx.arc(6.6, -1.5, 1.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Reparte peces por todas las masas de agua del mundo.
 * @param {import('../world/level.js').World} world
 */
export function spawnFish(world, rng = Math.random) {
  const peces = [];

  for (const body of world.waterBodies) {
    // Mas peces cuanto mas grande sea el agua, con un minimo decente.
    const cuantos = Math.max(
      CONFIG.fish.minPerBody,
      Math.round((body.w * body.h) / CONFIG.fish.areaPerFish)
    );
    for (let i = 0; i < cuantos; i++) peces.push(new Fish(body, rng));
  }

  return peces;
}
