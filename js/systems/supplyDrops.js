/**
 * supplyDrops.js
 * ---------------------------------------------------------------
 * LOS SUPPLY DROPS: cajas de suministros que caen del cielo cada cierto
 * tiempo durante la partida.
 *
 * La idea, como en Fortnite, es crear PELEA: la caja se anuncia con un
 * paracaidas y un haz de luz que se ven desde media pantalla, tarda un
 * buen rato en bajar, y dentro lleva mejor botin que ningun cofre. Todo
 * el mundo la ve, todo el mundo la quiere, y ahi es donde se monta.
 *
 * Cae siempre DENTRO de la zona segura y sobre suelo firme: una caja en
 * mitad de la tormenta o en el fondo del mar no la disputaria nadie.
 */

import { CONFIG } from '../core/config.js';
import { SupplyDrop } from '../entities/supplyDrop.js';
import { Pickup } from '../entities/pickup.js';
import {
  makeWeapon, rollChestWeapon, rollChestHeal, rollAmmoBox, rollThrowable,
  rollGadget,
} from '../data/loot.js';
import { rarityRank } from '../data/rarities.js';
import { playChestOpen, playSupplyDrop } from '../core/audio.js';

export class SupplyDropManager {
  /**
   * @param {object} deps { world, particles, loot, zone }
   */
  constructor(deps) {
    this.world = deps.world;
    this.particles = deps.particles;
    this.loot = deps.loot;
    /** Zona segura: la caja cae dentro de ella. */
    this.zone = deps.zone || null;

    /** @type {SupplyDrop[]} */
    this.drops = [];
    /** Caja abierta mas cercana al jugador (para el cartel y la E). */
    this.nearest = null;

    /** Aviso para la pantalla (lo enchufa game.js). */
    this.onMessage = null;
    /** Aviso de caja abierta (misiones, XP). */
    this.onOpened = null;

    this.reset();
  }

  /**
   * @param {object} opciones
   *   bounds   { x0, x1 } tramo jugable (modos de mapa reducido)
   *   first    segundos hasta el primero
   *   every    segundos entre uno y el siguiente
   */
  reset(opciones = {}) {
    this.drops.length = 0;
    this.nearest = null;

    // `enabled` lo pone game.js segun el modo: los minijuegos lo apagan.
    if (this.enabled === undefined) this.enabled = true;

    const C = CONFIG.supply;
    this.bounds = opciones.bounds || null;
    this.first = opciones.first ?? C.firstAt;
    this.every = opciones.every ?? C.every;

    /** Cuenta atras para el siguiente. */
    this.timer = this.first;
    /** Cuantos han caido ya (solo para el aviso). */
    this.count = 0;
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
    if (!this.enabled) return;
    // Se guarda para saber quien abrio cada caja (ver _soltarBotin).
    this.player = player;

    // --- ¿Toca soltar uno? ---
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.every;
      this._spawn();
    }

    // --- Cajas en el aire y en el suelo ---
    this.nearest = null;
    let mejorDist = Infinity;

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      const abierta = d.update(dt);

      if (abierta) {
        this._soltarBotin(d);
        continue;
      }

      // Las abiertas se quedan un rato de adorno y luego se van.
      if (d.isOpen) {
        d.restos = (d.restos || 0) + dt;
        if (d.restos > 20) this.drops.splice(i, 1);
        continue;
      }

      if (!d.canOpen) continue;
      if (!d.isNear(player)) continue;

      const dist = Math.abs(player.x + player.w / 2 - d.x);
      if (dist < mejorDist) { mejorDist = dist; this.nearest = d; }
    }

    // La E abre la caja. Se consume ANTES que la de los cofres y la del
    // botin del suelo (ver game.js): estando al lado de un supply drop,
    // la E abre el supply drop.
    if (this.nearest && input.consume('pickup')) {
      this.openDrop(this.nearest, player);
    }
  }

  /** Cajas a las que puede ir alguien (las usa la IA de los bots). */
  get active() {
    return this.drops.filter((d) => d.active);
  }

  /* =============================================================
     DONDE CAE
     ============================================================= */

  /** Suelta una caja en un punto valido de la zona segura. */
  _spawn() {
    const punto = this._sitio();
    if (!punto) return;

    this.drops.push(new SupplyDrop(punto.x, punto.y));
    playSupplyDrop();
    this.count++;

    this.onMessage?.('¡SUMINISTROS EN CAMINO! Mira el paracaidas', 'legendary');
  }

  /**
   * Busca donde soltarla: dentro de la zona segura, sobre tierra firme y
   * sin que caiga encima de un edificio (dentro no se podria coger).
   *
   * Se prueban varios sitios al azar y se coge el primero que valga; si
   * ninguno sirve, no cae nada esta vez y se reintenta al siguiente
   * ciclo. Mejor saltarse una que dejarla en el fondo del mar.
   */
  _sitio() {
    const w = this.world;

    // Los limites: la zona segura, recortada al tramo jugable del modo.
    let x0 = this.zone ? this.zone.minX : 0;
    let x1 = this.zone ? this.zone.maxX : w.width;
    if (this.bounds) {
      x0 = Math.max(x0, this.bounds.x0);
      x1 = Math.min(x1, this.bounds.x1);
    }
    // Un margen, para que no caiga pegada al borde de la zona.
    x0 += 160;
    x1 -= 160;
    if (x1 - x0 < 200) return null;

    const edificios = w.buildingRanges ? w.buildingRanges(40) : [];

    for (let intento = 0; intento < 40; intento++) {
      const x = x0 + Math.random() * (x1 - x0);

      // Dentro de un edificio no: la caja quedaria en el tejado o
      // encerrada entre paredes.
      if (edificios.some((e) => x > e.x0 && x < e.x1)) continue;

      const y = w.groundYAtFast(x);
      if (y >= w.waterY) continue;          // agua: se descarta
      if (y >= w.height - 40) continue;     // vacio

      // Ni encima de otra que siga sin abrirse.
      if (this.drops.some((d) => d.active && Math.abs(d.x - x) < 320)) continue;

      return { x, y };
    }
    return null;
  }

  /* =============================================================
     ABRIR Y BOTIN
     ============================================================= */

  /** Abre una caja (lo llaman el jugador con la E y tambien los bots). */
  openDrop(drop, quien) {
    if (!drop.open()) return false;

    playChestOpen();
    this.particles.spark(drop.x, drop.groundY - 40, '#78d7ff', 22, 340);
    this.particles.puff(drop.x, drop.groundY - 40, 'rgba(180, 230, 255, 0.6)', 8);

    // Quien la ha abierto viaja en el aviso: game.js decide si cuenta
    // para las misiones (solo si ha sido el jugador).
    drop.openedBy = quien;
    this.onOpened?.(drop, quien);
    return true;
  }

  /**
   * EL BOTIN. Mejor que el de cualquier cofre y, sobre todo, FIJO: un
   * supply drop siempre trae un arma de rareza alta, curas, granadas y
   * municion. Un cofre puede darte tres vendas; esto no.
   */
  _soltarBotin(drop) {
    const C = CONFIG.supply;
    const objetos = [];

    // 1) El arma buena: nunca por debajo de legendaria.
    objetos.push(this._armaMinimo(C.minRarity));
    // 2) Una segunda, algo peor pero tambien de las de arriba.
    objetos.push(this._armaMinimo(C.minRaritySecond));
    // 3) Curas, granadas, una torreta o trampa y dos cajas de balas.
    objetos.push(rollChestHeal());
    objetos.push(rollThrowable());
    objetos.push(rollGadget());
    objetos.push(rollAmmoBox());
    objetos.push(rollAmmoBox());

    // Salen en abanico, como los de un cofre.
    objetos.forEach((item, i) => {
      const p = new Pickup(drop.x, drop.groundY - 40, item);
      const t = objetos.length > 1 ? (i / (objetos.length - 1)) - 0.5 : 0;
      p.vx = t * 320 + (Math.random() - 0.5) * 70;
      p.vy = -300 - Math.random() * 100;
      p.pickupDelay = 0.45;
      this.loot.pickups.push(p);
    });

    // El aviso solo si lo has abierto TU: enterarse por pantalla de que
    // un bot ha abierto una caja al otro lado del mapa no aporta nada.
    if (drop.openedBy === this.player) {
      this.onMessage?.(`¡Suministros abiertos! ${objetos.length} objetos`, 'mythic');
    }
  }

  /** Un arma de cofre, subida a `minima` si salio por debajo. */
  _armaMinimo(minima) {
    const arma = rollChestWeapon();
    const rareza = rarityRank(arma.rarity) >= rarityRank(minima) ? arma.rarity : minima;
    return makeWeapon(arma.def, rareza);
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    for (const d of this.drops) {
      // El alto incluye todo el haz de luz hasta el suelo.
      if (!camera.isVisible(d.x - 90, d.y - 130, 180, d.groundY - d.y + 150)) continue;
      d.draw(ctx, time);
    }
    if (this.nearest) this.nearest.drawPrompt(ctx);
  }

  /**
   * FLECHA EN EL BORDE DE LA PANTALLA apuntando a la caja mas cercana
   * que siga cayendo, cuando queda fuera de camara.
   *
   * Sin esto, un supply drop que cae a dos pantallas de distancia no
   * existe: el aviso de texto pasa y ya no hay forma de saber por donde
   * era. Se dibuja en coordenadas de PANTALLA.
   */
  drawCompass(ctx, camera, view, time) {
    const objetivo = this.drops.find((d) => d.active);
    if (!objetivo) return;

    // Si se ve en pantalla, no hace falta flecha.
    if (camera.isVisible(objetivo.x - 60, objetivo.y - 60, 120, 160)) return;

    const derecha = objetivo.x > camera.x + camera.w / 2;
    const x = derecha ? view.width - 46 : 46;
    const y = view.height * 0.34;
    const pulso = 0.7 + 0.3 * Math.sin(time * 4);

    ctx.save();

    ctx.fillStyle = `rgba(10, 16, 34, ${0.82 * pulso})`;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(120, 215, 255, ${pulso})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Flecha hacia el lado en el que esta
    ctx.fillStyle = '#78d7ff';
    ctx.beginPath();
    const s = derecha ? 1 : -1;
    ctx.moveTo(x + s * 10, y);
    ctx.lineTo(x - s * 5, y - 9);
    ctx.lineTo(x - s * 5, y + 9);
    ctx.closePath();
    ctx.fill();

    // Distancia, en "metros" (100 px = 1 m, como en el mapa)
    const dist = Math.round(Math.abs(objetivo.x - (camera.x + camera.w / 2)) / 100);
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`${dist} m`, x, y + 36);

    ctx.restore();
  }
}
