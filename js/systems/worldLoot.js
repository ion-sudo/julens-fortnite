/**
 * worldLoot.js
 * ---------------------------------------------------------------
 * BOTIN DEL MUNDO: reparte armas y curas por las plataformas de la isla
 * y gestiona recogerlas y soltarlas.
 *
 *   - Al empezar la partida se siembran objetos con las probabilidades
 *     de data/loot.js (las armas buenas salen pocas veces).
 *   - Pasar por encima con una ranura libre lo recoge solo.
 *   - Con el inventario lleno, la tecla E INTERCAMBIA por lo que llevas.
 *   - La tecla R suelta el objeto equipado, que cae al suelo.
 */

import { Pickup, PICKUP_RADIUS } from '../entities/pickup.js';
import { rollLoot } from '../data/loot.js';
import { ammoInfo } from '../data/ammo.js';
import { PICKAXE_SLOT } from '../core/inventory.js';
import { playPickup } from '../core/audio.js';
import { control, segunControl } from '../ui/controlHints.js';

/** Separacion minima entre dos objetos del suelo. */
const MIN_GAP = 150;

export class LootManager {
  /**
   * @param {object} deps { world, inventory, particles }
   */
  constructor(deps) {
    this.world = deps.world;
    this.inventory = deps.inventory;
    this.particles = deps.particles;

    /** @type {Pickup[]} */
    this.pickups = [];
    /** Objeto mas cercano al jugador (para el cartel y la tecla E). */
    this.nearest = null;

    /** Aviso para la pantalla (lo enchufa game.js). */
    this.onMessage = null;
  }

  /* =============================================================
     SIEMBRA
     ============================================================= */

  /**
   * Reparte `count` objetos por las superficies del mundo.
   * @param {number} count
   * @param {() => number} rng
   */
  spawnInitial(count, rng = Math.random, bounds = null) {
    this.pickups.length = 0;
    /** Para explicar las granadas solo la primera vez de cada partida. */
    this._avisoGranada = false;

    // Superficies validas: el techo de cada plataforma, con un margen.
    const superficies = this.world.platforms
      // Los fondos de lago quedan bajo el agua: ahi no se siembra nada.
      // Los edificios tampoco: su botin lo pone BuildingManager.
      .filter((p) => p.w >= 120 && !p.lakeBed && !p.building && !p.structure)
      // Y en los modos de mapa reducido, solo el tramo jugable: no vale
      // sembrar armas donde nadie va a poder ir.
      .filter((p) => !bounds || (p.x + p.w > bounds.x0 && p.x < bounds.x1))
      .map((p) => ({
        x0: Math.max(p.x + 40, bounds ? bounds.x0 + 40 : -Infinity),
        x1: Math.min(p.x + p.w - 40, bounds ? bounds.x1 - 40 : Infinity),
        y: p.y,
      }))
      .filter((s) => s.x1 > s.x0);

    if (superficies.length === 0) return;

    const usadas = [];
    let intentos = 0;

    while (this.pickups.length < count && intentos < count * 30) {
      intentos++;

      const s = superficies[Math.floor(rng() * superficies.length)];
      const x = s.x0 + rng() * (s.x1 - s.x0);

      // No amontonar objetos
      if (usadas.some((u) => Math.abs(u.x - x) < MIN_GAP && Math.abs(u.y - s.y) < 60)) continue;
      usadas.push({ x, y: s.y });

      // Aparece un poco por encima del suelo y cae hasta apoyarse.
      this.pickups.push(new Pickup(x, s.y - 30, rollLoot(rng)));
    }
  }

  /* =============================================================
     UPDATE
     ============================================================= */

  /**
   * @param {number} dt
   * @param {import('../entities/player.js').Player} player
   * @param {import('../core/input.js').Input} input
   */
  update(dt, player, input) {
    this.nearest = null;
    let mejorDist = Infinity;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.update(dt, this.world);

      if (p.taken) { this.pickups.splice(i, 1); continue; }

      if (p.pickupDelay <= 0 && p.isNear(player)) {
        // La municion NUNCA ocupa ranura: se coge siempre, va a la reserva.
        if (p.item.kind === 'ammo') {
          this._takeAmmo(p, i, player);
          continue;
        }

        // Recogida AUTOMATICA si queda hueco
        if (this.inventory.hasSpace || this.inventory.findStackable(p.item) !== -1) {
          this._take(p, i);
          continue;
        }

        // Inventario lleno: se guarda como candidato para la tecla E
        const px = player.x + player.w / 2;
        const d = Math.abs(px - p.x);
        if (d < mejorDist) { mejorDist = d; this.nearest = p; }
      }
    }

    // --- Tecla E: intercambiar con lo que llevas ---
    if (this.nearest && input.consume('pickup')) this._swap(this.nearest, player);
  }

  /**
   * Coge una caja de municion: suma a la reserva del jugador y
   * desaparece del suelo. No pasa por el inventario.
   */
  _takeAmmo(pickup, index, player) {
    const info = ammoInfo(pickup.item.ammoType);
    const cogidas = player.addAmmo(info.id, pickup.item.amount);

    if (cogidas <= 0) {
      // Ya va lleno de ese tipo: se deja en el suelo y se avisa una vez.
      pickup.pickupDelay = 2.5;
      this.onMessage?.(`Municion ${info.name} al maximo`);
      return;
    }

    this.pickups.splice(index, 1);
    this.particles.puff(pickup.x, pickup.y - 16, info.color + '99', 4);
    playPickup();
    this.onMessage?.(`+${cogidas} balas ${info.name}`);
  }

  /** Mete el objeto en el inventario y lo quita del suelo. */
  _take(pickup, index) {
    const res = this.inventory.add(pickup.item);
    if (!res.ok) return;

    this.pickups.splice(index, 1);
    this.particles.puff(pickup.x, pickup.y - 16, 'rgba(255,255,255,0.5)', 4);
    playPickup();

    const nombre = pickup.item.name + (pickup.item.count > 1 ? ` x${pickup.item.count}` : '');

    // La PRIMERA granada de la partida explica como se usa. Sin esto se
    // recogian y se quedaban en la ranura sin que nadie supiera que
    // habia que equiparlas y tirarlas con el clic.
    if (pickup.item.kind === 'throwable' && !this._avisoGranada) {
      this._avisoGranada = true;
      this.onMessage?.(
        segunControl(
          `${nombre} — pulsa ${res.slot} para equiparla y clic izquierdo para lanzarla`,
          `${nombre} — toca su ranura y luego LANZAR`
        ),
        pickup.item.rarity
      );
      return;
    }

    this.onMessage?.(`Has cogido: ${nombre}`, pickup.item.rarity);
  }

  /** Intercambia el objeto del suelo por el de la ranura equipada. */
  _swap(pickup, player) {
    if (this.inventory.selected === PICKAXE_SLOT) {
      this.onMessage?.(segunControl('Selecciona una ranura de objeto (1-5) para cambiar', 'Toca una ranura de objeto para cambiar'));
      return;
    }

    const anterior = this.inventory.replace(this.inventory.selected, pickup.item);
    const idx = this.pickups.indexOf(pickup);
    if (idx !== -1) this.pickups.splice(idx, 1);

    if (anterior) this._dropAt(anterior, player);

    this.onMessage?.(`Has cogido: ${pickup.item.name}`, pickup.item.rarity);
    this.nearest = null;
  }

  /* =============================================================
     SOLTAR (tecla R)
     ============================================================= */

  /** Suelta lo que lleva equipado. Devuelve true si ha soltado algo. */
  dropEquipped(player) {
    const item = this.inventory.dropEquipped();
    if (!item) {
      this.onMessage?.('El pico no se puede soltar');
      return false;
    }

    this._dropAt(item, player);
    this.onMessage?.(`Has soltado: ${item.name}`);
    return true;
  }

  /**
   * Deja un objeto en un punto concreto del mundo.
   * Lo usan los bots al cambiar de arma y al morir.
   */
  dropItemAt(item, x, y, delay = 0.6) {
    const p = new Pickup(x, y, item);
    p.pickupDelay = delay;
    this.pickups.push(p);
    return p;
  }

  /** Deja un objeto en el aire delante del jugador, para que caiga. */
  _dropAt(item, player) {
    const p = new Pickup(
      player.x + player.w / 2 + player.facing * 34,
      player.y + player.h - 26,
      item
    );
    // Sin este margen lo recogerias otra vez al instante.
    p.pickupDelay = 0.9;
    this.pickups.push(p);
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    for (const p of this.pickups) {
      if (!camera.isVisible(p.x - 60, p.y - 90, 120, 120)) continue;
      p.draw(ctx, time);
    }

    // El cartel solo del mas cercano, y por encima de todo lo demas.
    if (this.nearest) this.nearest.drawLabel(ctx, true);
  }
}

export { PICKUP_RADIUS };
