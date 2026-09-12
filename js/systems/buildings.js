/**
 * buildings.js
 * ---------------------------------------------------------------
 * GESTOR DE EDIFICIOS: los construye a partir de los sitios que marca
 * el mundo, mete sus paredes en las colisiones, abre las puertas con la
 * tecla E y coloca dentro cofres y botin para que merezca la pena entrar.
 *
 * La tecla E la comparten puertas, cofres y objetos del suelo. El orden
 * de prioridad lo decide game.js llamando a estos sistemas en orden:
 * puertas -> cofres -> botin.
 */

import { CONFIG } from '../core/config.js';
import { Building } from '../entities/building.js';
import { DOOR_RADIUS } from '../data/buildings.js';
import { Chest } from '../entities/chest.js';
import { Pickup } from '../entities/pickup.js';
import { rollChestLoot, rollAmmoBox } from '../data/loot.js';
import { playChestOpen } from '../core/audio.js';

export class BuildingManager {
  /**
   * @param {object} deps { world, particles, loot, chests }
   */
  constructor(deps) {
    this.world = deps.world;
    this.particles = deps.particles;
    this.loot = deps.loot;
    this.chests = deps.chests;

    /** @type {Building[]} */
    this.buildings = [];
    /** Edificio con la puerta mas cercana al jugador. */
    this.nearest = null;
    /** Y cual de sus dos puertas es. */
    this.nearestDoor = null;

    this.onMessage = null;
  }

  /* =============================================================
     CONSTRUCCION
     ============================================================= */

  /**
   * Levanta un edificio en cada sitio marcado por el mundo y mete sus
   * paredes en la lista de plataformas.
   *
   * @param {() => number} rng
   * @param {object|null} bounds  { x0, x1 } tramo jugable. En los modos
   *   de mapa reducido solo se levantan los de dentro: los de fuera
   *   quedarian tras la tormenta, y cada uno se lleva sus cofres y su
   *   botin, que es botin sembrado donde nadie puede ir a por el.
   * @param {number} lootScale  multiplica los cofres de dentro de cada
   *   edificio. Los cofres sueltos del mapa se controlan aparte
   *   (CONFIG.chests.count), asi que para bajar el botin de un modo hay
   *   que tocar los dos.
   */
  build(rng = Math.random, bounds = null, lootScale = 1) {
    // Fuera las paredes de la partida anterior: si no, se irian
    // acumulando en el mundo partida tras partida.
    this.clear();

    for (const slot of this.world.buildingSlots) {
      if (bounds && (slot.x < bounds.x0 || slot.x > bounds.x1)) continue;

      const edificio = new Building(slot);
      this.buildings.push(edificio);

      // Las paredes y el techo pasan a ser terreno normal.
      for (const p of edificio.buildPlatforms()) this.world.platforms.push(p);

      this._fillWithLoot(edificio, rng, lootScale);
    }

    // Las paredes son plataformas nuevas: el indice espacial del mundo
    // tiene que enterarse o no colisionarian.
    this.world.rebuildIndex();
  }

  /**
   * Quita del mundo TODO lo que hayan puesto los edificios.
   *
   * Hace falta como metodo suelto porque los minijuegos NO construyen
   * edificios: si solo se limpiara dentro de build(), las paredes de la
   * partida anterior se quedaban plantadas en medio de la arena, y
   * llegaron a tapar el tramo llano que los minijuegos necesitan.
   */
  clear() {
    this.buildings.length = 0;
    this.nearest = null;
    this.nearestDoor = null;

    const platforms = this.world.platforms;
    for (let i = platforms.length - 1; i >= 0; i--) {
      if (platforms[i].building) platforms.splice(i, 1);
    }
    this.world.rebuildIndex();
  }

  /**
   * Coloca cofres y alguna caja de municion dentro del edificio,
   * REPARTIDOS POR PLANTAS: asi merece la pena subir las escaleras y no
   * se queda todo el botin en la entrada.
   */
  _fillWithLoot(edificio, rng, lootScale = 1) {
    // `lootScale` lo baja el modo que quiera menos botin dentro de las
    // casas (el Julen Blitz). Nunca baja de 1 cofre: entrar en un
    // edificio para encontrarlo vacio no invita a volver a entrar.
    const cuantos = Math.max(1, Math.round(edificio.def.loot * lootScale));
    const sitios = edificio.floorSpots(cuantos);

    for (const sitio of sitios) {
      const cofre = new Chest(sitio.x, sitio.y, { id: edificio.zone, name: edificio.def.label });
      cofre.insideBuilding = edificio;
      this.chests.chests.push(cofre);
    }

    // Una caja de municion suelta, en una planta al azar, para que entrar
    // compense siempre aunque los cofres ya esten abiertos.
    const planta = Math.floor(rng() * edificio.floors);
    const span = edificio.floorSpan(planta);   // el tramo libre mas ancho
    const px = span.x0 + 30 + rng() * Math.max(10, (span.x1 - span.x0) - 60);
    const caja = new Pickup(px, edificio.floorY(planta) - 20, rollAmmoBox(rng));
    caja.onGround = false;
    caja.insideBuilding = edificio;
    this.loot.pickups.push(caja);
  }

  /* =============================================================
     UPDATE
     ============================================================= */

  /**
   * @param {number} dt
   * @param {object} player
   * @param {import('../core/input.js').Input} input
   */
  /**
   * @param {number} dt
   * @param {object} player
   * @param {import('../core/input.js').Input} input
   * @param {Array<object>} otros  bots vivos: pueden forzar una puerta cerrada
   */
  update(dt, player, input, otros = []) {
    this.nearest = null;
    this.nearestDoor = null;
    let mejorDist = Infinity;

    const px = player.x + player.w / 2;

    for (const b of this.buildings) {
      // El jugador va como parametro: es quien hace que la fachada se
      // desvanezca al entrar.
      b.update(dt, player);

      // Los bots empujan las puertas cerradas que les cortan el paso.
      this._botsForceDoor(b, dt, otros);

      // Cada edificio tiene DOS puertas (delantera y trasera): hay que
      // quedarse con la que tenga mas cerca el jugador.
      const puerta = b.nearestDoor(player);
      if (!puerta) continue;

      const d = Math.abs(px - b.doorCenterX(puerta));
      if (d < mejorDist) { mejorDist = d; this.nearest = b; this.nearestDoor = puerta; }
    }

    if (!this.nearest) return;

    // La tecla E la comparten puerta, cofre y botin. Si hay un cofre sin
    // abrir MAS CERCA que la puerta, manda el cofre: si no, un cofre
    // pegado a la entrada seria imposible de abrir.
    if (this._chestIsCloser(player, mejorDist)) {
      this.nearest = null;
      this.nearestDoor = null;
      return;
    }

    if (input.consume('pickup')) this._toggleDoor(this.nearest, this.nearestDoor, player);
  }

  /** ¿Hay un cofre sin abrir mas cerca que la puerta? */
  _chestIsCloser(player, distPuerta) {
    if (!this.chests) return false;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;

    return this.chests.chests.some((c) => {
      if (c.opened) return false;
      return Math.hypot(px - c.x, py - (c.groundY - 20)) < distPuerta;
    });
  }

  /**
   * Un bot pegado a una puerta cerrada acaba abriendola.
   * Cerrar la puerta TE PROTEGE: para las balas y corta el paso. Pero si
   * nadie pudiera abrirla, encerrarse seria invencible y aburrido; asi
   * ganas el respiro justo para curarte o recargar.
   */
  _botsForceDoor(b, dt, otros) {
    if (otros.length === 0) return;

    // Cada puerta lleva su propia cuenta: forzar la de delante no abre
    // la de atras.
    for (const d of b.doors) {
      if (d.open) { d.forcing = 0; continue; }

      const cx = b.doorCenterX(d);
      const cy = b.doorCenterY(d);
      const empujando = otros.some((o) => {
        if (o.alive === false) return false;
        return Math.hypot((o.x + o.w / 2) - cx, (o.y + o.h / 2) - cy) < DOOR_RADIUS;
      });

      if (!empujando) { d.forcing = 0; continue; }

      d.forcing += dt;
      if (d.forcing < CONFIG.world.botDoorTime) continue;

      d.forcing = 0;
      b.openDoor(d);
      playChestOpen();
      this.particles.puff(cx, cy, 'rgba(255, 220, 180, 0.5)', 5);
    }
  }

  /** Abre o cierra con la tecla E la puerta que tengas mas cerca. */
  _toggleDoor(edificio, puerta, player) {
    const estado = edificio.toggleDoor(puerta, player);

    if (estado === 'ocupada') {
      this.onMessage?.('Apartate del hueco para cerrar', true);
      return;
    }

    playChestOpen();
    this.particles.puff(
      edificio.doorCenterX(puerta), edificio.doorCenterY(puerta),
      'rgba(255, 240, 200, 0.55)', 6
    );

    const nombre = edificio.def.label.toLowerCase();
    this.onMessage?.(
      estado === 'abierta' ? `Has abierto la ${nombre}` : 'Has cerrado la puerta',
      'uncommon'
    );
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  /**
   * PASADA 1 — el interior, DETRAS del jugador, del botin y de los bots:
   * el hueco, los suelos, las escaleras, los muebles, las paredes
   * laterales, el tejado y la puerta.
   */
  drawInterior(ctx, camera, time) {
    for (const b of this._visibles(camera)) b.drawInterior(ctx, time);
  }

  /**
   * PASADA 2 — la fachada, POR DELANTE de todo: es lo que hace que desde
   * fuera veas una casa normal y no lo que hay dentro. Se desvanece sola
   * cuando entras.
   */
  drawFacade(ctx, camera, time) {
    for (const b of this._visibles(camera)) b.drawFacade(ctx, time);
  }

  _visibles(camera) {
    return this.buildings.filter(
      (b) => camera.isVisible(b.x - 40, b.y - 70, b.w + 80, b.h + 90)
    );
  }

  /** El cartel de la puerta mas cercana, por encima de todo. */
  drawPrompt(ctx) {
    if (this.nearest) this.nearest.drawPrompt(ctx, this.nearestDoor);
  }

  /** ¿Dentro de que edificio esta el jugador? (para el HUD) */
  buildingAt(player) {
    return this.buildings.find((b) => b.containsPlayer(player)) || null;
  }
}
