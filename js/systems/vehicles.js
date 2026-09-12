/**
 * vehicles.js
 * ---------------------------------------------------------------
 * GESTOR DE VEHICULOS: los reparte por el mapa, deja subirse y bajarse
 * con la tecla V y los mueve mientras se conducen.
 *
 * Se eligio la V porque el resto ya estaba cogido: E abre puertas y
 * cofres, F es el pico, R suelta, Q construye, Z/X/C son las piezas,
 * M el mapa y H la ayuda.
 *
 * Conduciendo, el jugador va SENTADO: su posicion la manda el vehiculo,
 * no se dispara ni se construye, y no le llegan los golpes del terreno.
 * Al bajarse se le deja al lado, sobre suelo firme.
 */

import { CONFIG } from '../core/config.js';
import { Vehicle } from '../entities/vehicle.js';
import { VEHICLE_SPAWNS } from '../data/vehicles.js';
import { ZONES } from '../data/zones.js';
import { roundRectPath } from '../core/utils.js';

export class VehicleManager {
  /**
   * @param {object} deps { world, particles }
   */
  constructor(deps) {
    this.world = deps.world;
    this.particles = deps.particles;

    /** @type {Vehicle[]} */
    this.vehicles = [];
    /** El que tiene el jugador al alcance (para el cartel). */
    this.nearest = null;
    /** El que conduce el jugador, o null. */
    this.driving = null;
    /** Los que conducen los bots: Map<bot, {v, hasta, tiempo}> */
    this.botDrivers = new Map();

    this.onMessage = null;
  }

  /* =============================================================
     REPARTO
     ============================================================= */

  /**
   * Coloca un vehiculo en cada sitio marcado en data/vehicles.js.
   * @param {object|null} bounds  { x0, x1 } tramo jugable. En los modos
   *   de mapa reducido no tiene sentido sembrar coches donde nadie va a
   *   poder llegar.
   */
  spawn(bounds = null) {
    this.vehicles.length = 0;
    this.driving = null;
    this.nearest = null;

    for (const sitio of VEHICLE_SPAWNS) {
      const zona = ZONES.find((z) => z.id === sitio.zone);
      if (!zona) continue;
      if (bounds && (zona.x1 <= bounds.x0 || zona.x0 >= bounds.x1)) continue;

      const pedido = zona.x0 + (zona.x1 - zona.x0) * sitio.at;
      const v = new Vehicle(this.world, sitio.type, pedido, zona.groundY);

      // Sitio LIBRE de verdad: puesto a ojo, alguno aparecia pegado a la
      // pared de un edificio y no podia arrancar (el muro mide mas que
      // el escalon que sube un coche).
      const x = this._sitioLibre(pedido, v.w, v.h, zona);
      if (x === null) continue;

      v.x = x - v.w / 2;
      v.y = this._groundAt(x, zona.groundY) - v.h;
      this.vehicles.push(v);
    }
  }

  /**
   * Busca una X donde quepa el vehiculo sin tocar nada.
   * Se prueba el sitio pedido y luego a un lado y a otro, cada vez mas
   * lejos, hasta 600 px. Si no hay hueco, se descarta ese vehiculo.
   * @returns {number|null}
   */
  _sitioLibre(pedido, ancho, alto, zona) {
    for (let d = 0; d <= 600; d += 40) {
      for (const x of (d === 0 ? [pedido] : [pedido - d, pedido + d])) {
        if (x - ancho / 2 < zona.x0 || x + ancho / 2 > zona.x1) continue;

        const suelo = this._groundAt(x, zona.groundY);
        const caja = { x: x - ancho / 2 - 8, y: suelo - alto - 10, w: ancho + 16, h: alto + 10 };

        const choca = this.world.getPlatformsNear(caja, 0).some(
          (p) => !p.oneWay && !p.lakeBed &&
                 p.x < caja.x + caja.w && p.x + p.w > caja.x &&
                 p.y < caja.y + caja.h && p.y + p.h > caja.y
        );
        if (!choca) return x;
      }
    }
    return null;
  }

  /** Superficie solida mas alta bajo una X (para no dejarlos flotando). */
  _groundAt(x, porDefecto) {
    const sonda = { x: x - 6, y: 300, w: 12, h: 1400 };
    let mejor = null;

    for (const p of this.world.getPlatformsNear(sonda, 0)) {
      if (p.oneWay || p.lakeBed || p.building) continue;
      if (p.x > x || p.x + p.w < x) continue;
      if (mejor === null || p.y < mejor) mejor = p.y;
    }
    return mejor ?? porDefecto;
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
   * @param {Array<object>} bots  tambien conducen
   */
  update(dt, player, input, bots = []) {
    this._updateBots(dt, bots);

    // --- El que se conduce ---
    if (this.driving) {
      this.driving.update(dt, input);
      this._sentar(player, this.driving);

      if (input.consume('vehicle')) this._bajar(player);
      this.nearest = null;
      return;
    }

    // --- Los demas: solo caen si estan en el aire ---
    for (const v of this.vehicles) {
      if (v.driver) continue;    // ya lo ha movido su conductor
      if (v.onGround && Math.abs(v.vx) < 1 && Math.abs(v.vy) < 1) continue;
      v.update(dt, null);
    }

    // --- ¿Hay alguno al alcance? ---
    this.nearest = null;
    let mejor = Infinity;

    for (const v of this.vehicles) {
      if (v.driver) continue;                 // ocupado por un bot
      if (!v.isNear(player)) continue;
      const d = Math.abs(v.centerX - (player.x + player.w / 2));
      if (d < mejor) { mejor = d; this.nearest = v; }
    }

    if (this.nearest && input.consume('vehicle')) this._subir(player, this.nearest);
  }

  /** Pega al jugador al asiento. */
  _sentar(player, v) {
    player.x = v.seatX - player.w / 2;
    player.y = v.seatY - player.h;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.facing = v.facing;
  }

  _subir(player, v) {
    this.driving = v;
    v.driver = player;

    // Conduciendo no se dispara ni se construye: las manos estan en el
    // volante.
    player.driving = true;
    player.buildMode = false;

    this.particles?.puff(v.centerX, v.centerY, 'rgba(255,255,255,0.45)', 6);
    this.onMessage?.(`${v.def.label} · V para bajar`, 'uncommon');
  }

  _bajar(player) {
    const v = this.driving;
    if (!v) return;

    // Se baja por el lado contrario al que mira, y un poco por encima
    // del suelo para que la fisica lo asiente.
    player.x = v.centerX - v.facing * (v.w / 2 + 14) - player.w / 2;
    player.y = v.y + v.h - player.h - 4;
    player.vx = 0;
    player.vy = 0;
    player.driving = false;

    v.driver = null;
    v.vx = 0;
    this.driving = null;

    this.particles?.puff(v.centerX, v.centerY, 'rgba(255,255,255,0.4)', 5);
    this.onMessage?.('Has bajado del vehiculo', null);
  }

  /* =============================================================
     LOS BOTS TAMBIEN CONDUCEN
     ============================================================= */

  /**
   * Un bot se sube a un coche cuando esta explorando y tiene que
   * recorrer un buen trecho; se baja al llegar cerca de su destino.
   *
   * No se les toca la IA: siguen decidiendo a donde van con
   * systems/botAI.js. Lo unico que cambia es COMO llegan, porque su
   * mando (botInput) sirve tal cual para conducir: ya tiene `axisX` y
   * `isDown`, que es lo que pide el vehiculo.
   */
  _updateBots(dt, bots) {
    // --- Los que ya conducen ---
    for (const [bot, info] of this.botDrivers) {
      if (!bot.alive) { this._bajarBot(bot); continue; }

      info.tiempo += dt;
      const v = info.v;
      const destino = bot.ai?.waypointX ?? bot.x;
      const falta = destino - v.centerX;

      // Se dirige al destino con su propio mando
      const st = bot.botInput.state;
      st.left = falta < -40;
      st.right = falta > 40;

      // Atascado contra algo: salta
      if (Math.abs(v.vx) < 30 && v.onGround && info.tiempo > 0.6) {
        st.jump = true;
      } else {
        st.jump = false;
      }

      v.update(dt, bot.botInput);
      this._sentar(bot, v);

      // Se baja al llegar, si lleva mucho, o si le entra combate
      const llego = Math.abs(falta) < 220;
      const cansado = info.tiempo > 14;
      const pelea = bot.ai?.state === 'combate';
      if (llego || cansado || pelea) this._bajarBot(bot);
    }

    // --- ¿Alguien se sube? ---
    for (const v of this.vehicles) {
      if (v.driver) continue;

      for (const bot of bots) {
        if (!bot.alive || bot.flight || bot.driving) continue;
        if (bot.ai?.state !== 'explorar') continue;
        if (!v.isNear(bot, 110)) continue;

        // Solo si de verdad le compensa: un viaje largo.
        const destino = bot.ai.waypointX ?? bot.x;
        if (Math.abs(destino - bot.x) < 700) continue;

        this._subirBot(bot, v);
        break;
      }
    }
  }

  _subirBot(bot, v) {
    v.driver = bot;
    bot.driving = true;
    this.botDrivers.set(bot, { v, tiempo: 0 });
  }

  _bajarBot(bot) {
    const info = this.botDrivers.get(bot);
    this.botDrivers.delete(bot);
    if (!info) return;

    const v = info.v;
    bot.driving = false;
    bot.x = v.centerX - v.facing * (v.w / 2 + 12) - bot.w / 2;
    bot.y = v.y + v.h - bot.h - 4;
    bot.vx = 0;
    bot.vy = 0;

    v.driver = null;
    v.vx = 0;
    v.botInput = null;
  }

  /** Baja al jugador sin preguntar (al morir o al acabar la partida). */
  forceExit(player) {
    if (this.driving) this._bajar(player);
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    for (const v of this.vehicles) {
      if (!camera.isVisible(v.x - 30, v.y - 40, v.w + 60, v.h + 60)) continue;
      v.draw(ctx, time);
    }
  }

  /** Cartel "V para subir" sobre el vehiculo mas cercano. */
  drawPrompt(ctx) {
    const v = this.nearest;
    if (!v) return;

    const x = v.centerX;
    const y = v.y - 34;
    const texto = `V para subir · ${v.def.label}`;

    ctx.save();
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    const ancho = ctx.measureText(texto).width + 26;

    ctx.fillStyle = 'rgba(10, 16, 34, 0.9)';
    ctx.strokeStyle = '#7ee06a';
    ctx.lineWidth = 2;
    roundRectPath(ctx, x - ancho / 2, y, ancho, 28, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#7ee06a';
    ctx.fillText(texto, x, y + 19);
    ctx.restore();
  }
}
