/**
 * chests.js
 * ---------------------------------------------------------------
 * SISTEMA DE COFRES: los reparte por la isla, los abre con la tecla E
 * y escupe el botin en arco para que se pueda recoger.
 *
 * Reparto: la mayoria caen dentro de los 7 SITIOS CON NOMBRE
 * (data/zones.js), con el peso que indica cada zona; el resto se
 * reparte por campo abierto.
 *
 * Botin: usa rollChestLoot() de data/loot.js, que tira la rareza dos
 * veces y se queda con la mejor. Por eso un cofre da mejores cosas
 * que lo que te encuentras suelto por el suelo.
 */

import { Chest, CHEST_RADIUS } from '../entities/chest.js';
import { Pickup } from '../entities/pickup.js';
import { rollChestLoot, rollAmmoBox, rollChestWeapon, makeWeapon } from '../data/loot.js';
import { GOLDEN_MIN_RARITY, GOLDEN_EXOTIC_CHANCE } from '../data/blitz.js';
import { ZONES, zoneAt } from '../data/zones.js';
import { playChestOpen } from '../core/audio.js';
import { CONFIG } from '../core/config.js';
import { rarityRank } from '../data/rarities.js';

/** Separacion minima entre dos cofres. */
const MIN_GAP = 260;

export class ChestManager {
  /**
   * @param {object} deps { world, particles, loot }
   *   `loot` es el LootManager: ahi van a parar los objetos que salen.
   */
  constructor(deps) {
    this.world = deps.world;
    this.particles = deps.particles;
    this.loot = deps.loot;

    /** @type {Chest[]} */
    this.chests = [];
    /** Cofre cerrado mas cercano al jugador (para el cartel y la tecla E). */
    this.nearest = null;

    /** Aviso para la pantalla (lo enchufa game.js). */
    this.onMessage = null;
    /** Aviso de cofre abierto (lo usan las misiones). */
    this.onOpened = null;
    /** Aviso de cofre DORADO abierto (lo usa el Julen Blitz). */
    this.onGolden = null;
  }

  /* =============================================================
     SIEMBRA
     ============================================================= */

  /**
   * Reparte cofres por el mundo.
   * @param {number} count  cuantos cofres en total
   * @param {() => number} rng
   */
  spawnInitial(count = CONFIG.chests.count, rng = Math.random, bounds = null) {
    this.chests.length = 0;

    // Superficies donde puede apoyarse un cofre (techo de las plataformas).
    const superficies = this.world.platforms
      // Nada de cofres bajo el agua, ni encima de los tejados, ni en los
      // suelos interiores de los edificios: de lo de dentro se encarga
      // BuildingManager, que lo reparte por plantas.
      .filter((p) => p.w >= 140 && !p.lakeBed && !p.building && !p.structure)
      // Modos de mapa reducido: solo el tramo jugable.
      .filter((p) => !bounds || (p.x + p.w > bounds.x0 && p.x < bounds.x1))
      .map((p) => ({
        x0: Math.max(p.x + 45, bounds ? bounds.x0 + 45 : -Infinity),
        x1: Math.min(p.x + p.w - 45, bounds ? bounds.x1 - 45 : Infinity),
        y: p.y,
      }))
      .filter((s) => s.x1 > s.x0);

    if (superficies.length === 0) return;

    // Los sitios que entran en el sorteo por peso. En mapa reducido,
    // solo los que caen dentro del tramo.
    const zonas = ZONES.filter(
      (z) => !bounds || (z.x1 > bounds.x0 && z.x0 < bounds.x1)
    );

    // Cuantos van dentro de zonas con nombre y cuantos en campo abierto.
    const enZonas = Math.round(count * CONFIG.chests.zoneShare);

    this._spawnInZones(enZonas, superficies, rng, zonas);
    this._spawnAnywhere(count - this.chests.length, superficies, rng);
  }

  /**
   * Convierte en DORADOS una parte de los cofres ya repartidos.
   *
   * Se hace DESPUES de repartirlos, y no al crearlos, para que los
   * dorados salgan bien mezclados por todo el tramo en vez de
   * amontonarse donde tocara. Solo lo usa el Julen Blitz.
   *
   * @param {number} share  proporcion de cofres dorados (0..1)
   */
  makeGolden(share, rng = Math.random) {
    // Se recorren en orden y se marca uno de cada N: asi quedan
    // repartidos por el mapa pase lo que pase con el sorteo.
    const cuantos = Math.max(1, Math.round(this.chests.length * share));
    const paso = this.chests.length / cuantos;

    for (let i = 0; i < cuantos; i++) {
      const idx = Math.min(this.chests.length - 1, Math.floor(i * paso + rng() * paso));
      const c = this.chests[idx];
      if (c) { c.golden = true; c.w = 52; }
    }

    return this.chests.filter((c) => c.golden).length;
  }

  /** Cofres dentro de los sitios con nombre, segun el peso de cada uno. */
  _spawnInZones(count, superficies, rng, zonas = ZONES) {
    if (zonas.length === 0) return;
    const pesoTotal = zonas.reduce((sum, z) => sum + z.chestWeight, 0);
    let intentos = 0;

    while (this.chests.length < count && intentos < count * 40) {
      intentos++;

      // Zona elegida por peso
      let tirada = rng() * pesoTotal;
      let zona = zonas[zonas.length - 1];
      for (const z of zonas) {
        tirada -= z.chestWeight;
        if (tirada <= 0) { zona = z; break; }
      }

      // Una superficie que caiga dentro de esa zona
      const dentro = superficies.filter((s) => s.x1 > zona.x0 && s.x0 < zona.x1);
      if (dentro.length === 0) continue;

      const s = dentro[Math.floor(rng() * dentro.length)];
      const x0 = Math.max(s.x0, zona.x0);
      const x1 = Math.min(s.x1, zona.x1);
      if (x1 <= x0) continue;

      const x = x0 + rng() * (x1 - x0);
      if (this._tooClose(x, s.y)) continue;

      this.chests.push(new Chest(x, s.y, zona));
    }
  }

  /** Cofres sueltos por cualquier parte del mapa. */
  _spawnAnywhere(count, superficies, rng) {
    let intentos = 0;
    let puestos = 0;

    while (puestos < count && intentos < count * 40) {
      intentos++;
      const s = superficies[Math.floor(rng() * superficies.length)];
      const x = s.x0 + rng() * (s.x1 - s.x0);
      if (this._tooClose(x, s.y)) continue;

      this.chests.push(new Chest(x, s.y, zoneAt(x)));
      puestos++;
    }
  }

  _tooClose(x, y) {
    return this.chests.some((c) => Math.abs(c.x - x) < MIN_GAP && Math.abs(c.groundY - y) < 70);
  }

  /* =============================================================
     UPDATE
     ============================================================= */

  /**
   * @param {number} dt
   * @param {object} player
   * @param {import('../core/input.js').Input} input
   */
  update(dt, player, input) {
    this.nearest = null;
    let mejorDist = Infinity;

    for (const chest of this.chests) {
      chest.update(dt);

      if (!chest.canOpen) continue;
      if (!chest.isNear(player)) continue;

      const d = Math.abs(player.x + player.w / 2 - chest.x);
      if (d < mejorDist) { mejorDist = d; this.nearest = chest; }
    }

    // La tecla E abre el cofre. Se consume aqui ANTES que el botin del
    // suelo, para que estando junto a un cofre E abra el cofre.
    if (this.nearest && input.consume('pickup')) this.openChest(this.nearest, player);
  }

  /** Abre un cofre y suelta su botin. */
  openChest(chest, player) {
    if (!chest.open()) return;
    this.onOpened?.(chest, player);

    playChestOpen();

    // --- Efectos ---
    const cx = chest.x;
    const cy = chest.groundY - 30;
    this.particles.spark(cx, cy, '#ffd23f', 16, 300);
    this.particles.puff(cx, cy, 'rgba(255, 230, 140, 0.6)', 7);

    /** Si el cofre dorado ha soltado una exotica, para avisar a lo grande. */
    let exotica = null;

    // --- Botin: 2 o 3 objetos ---
    const { minItems, maxItems } = CONFIG.chests;
    const normales = minItems + Math.floor(Math.random() * (maxItems - minItems + 1));
    // Todo cofre suelta ADEMAS una caja de municion garantizada.
    const cuantos = normales + CONFIG.chests.ammoBoxes;

    for (let i = 0; i < cuantos; i++) {
      // Los ultimos objetos del abanico son las cajas de municion.
      // Y el PRIMERO de un cofre dorado es siempre un arma buena: es lo
      // que justifica cruzar medio mapa a por el.
      let item;
      if (chest.golden && i === 0) {
        item = this._armaDorada();
        if (item.rarity === 'exotic') exotica = item;
      } else {
        item = i < normales ? rollChestLoot() : rollAmmoBox();
      }
      const pickup = new Pickup(cx, chest.groundY - 34, item);

      // Salen en abanico: los objetos se reparten a izquierda y derecha.
      const t = cuantos > 1 ? (i / (cuantos - 1)) - 0.5 : 0;
      pickup.vx = t * 260 + (Math.random() - 0.5) * 60;
      pickup.vy = -260 - Math.random() * 90;
      // Un respiro antes de poder recogerlos, para que se vea el arco.
      pickup.pickupDelay = 0.45;

      this.loot.pickups.push(pickup);
    }

    const donde = chest.zone ? ` en ${chest.zone.name}` : '';

    if (chest.golden) {
      // El potenciador lo reparte quien sepa de eso (el Julen Blitz):
      // aqui solo se avisa de que se ha abierto uno dorado.
      this.onMessage?.(
        exotica ? `¡¡EXOTICA!! ${exotica.name}` : `¡Cofre DORADO${donde}!`,
        exotica ? 'exotic' : 'mythic'
      );
      this.onGolden?.(chest, player);
    } else {
      this.onMessage?.(`Cofre abierto${donde}: ${cuantos} objetos`, 'legendary');
    }
  }

  /**
   * El arma de un cofre dorado: nunca por debajo de epica y, una de
   * cada diez, EXOTICA.
   *
   * Es la unica forma de tener una exotica sin llegar al nivel Blitz 8,
   * y sale poco a proposito: con un tercio de los cofres dorados y un
   * 10% cada uno, en una partida entera puede no aparecer ninguna.
   */
  _armaDorada(rng = Math.random) {
    const arma = rollChestWeapon();
    const rareza = rng() < GOLDEN_EXOTIC_CHANCE
      ? 'exotic'
      : subeHasta(arma.rarity, GOLDEN_MIN_RARITY);
    return makeWeapon(arma.def, rareza);
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    for (const chest of this.chests) {
      if (!camera.isVisible(chest.x - 70, chest.groundY - 90, 140, 100)) continue;
      chest.draw(ctx, time);
    }

    // El cartel solo del cofre mas cercano, por encima de todo.
    if (this.nearest) this.nearest.drawPrompt(ctx);
  }

  /** Cuantos cofres quedan sin abrir (para el panel de depuracion). */
  get remaining() {
    return this.chests.filter((c) => c.canOpen).length;
  }
}

/** La mayor de dos rarezas (para poner un suelo sin bajar nunca). */
function subeHasta(rareza, minima) {
  return rarityRank(rareza) >= rarityRank(minima) ? rareza : minima;
}

export { CHEST_RADIUS };
