/**
 * mobility.js
 * ---------------------------------------------------------------
 * TIROLINAS Y SALTADORES.
 *
 * TIROLINA: una cuerda entre dos postes. Al tocarla te enganchas solo y
 * te deslizas hasta el otro extremo a 720 px/s (casi el doble que
 * corriendo, y en linea recta por encima del terreno). Te sueltas con
 * Espacio o al llegar al final.
 *
 * SALTADOR: una plataforma con muelle. Al pisarla te lanza hacia arriba
 * y hacia delante. Sirve para subir a los tejados y a las plataformas
 * altas sin tener que construir una rampa.
 *
 * Ninguno de los dos toca la fisica del jugador: la tirolina le fija la
 * posicion mientras dura, y el saltador solo le cambia la velocidad.
 */

import { ZIPLINES, JUMP_PADS, ZIP_SPEED, ZIP_GRAB } from '../data/mobility.js';
import { ZONES } from '../data/zones.js';

/** Tiempo sin poder volver a engancharse tras soltarse. */
const REENGANCHE = 0.45;

export class MobilityManager {
  /**
   * @param {object} deps { world, particles }
   */
  constructor(deps) {
    this.world = deps.world;
    this.particles = deps.particles;

    /** @type {Array<{x1:number,y1:number,x2:number,y2:number,len:number}>} */
    this.ziplines = [];
    /** @type {Array<{x:number,y:number,w:number,up:number,push:number,anim:number}>} */
    this.pads = [];

    /** Estado del jugador en la tirolina, o null. */
    this.riding = null;
    /** Cuenta atras para poder volver a engancharse. */
    this.cooldown = 0;

    /** Bots colgados de una cuerda: Map<bot, {line, t, dir}> */
    this.botRiders = new Map();
    /** Y su cuenta atras para reengancharse: Map<bot, number> */
    this.botCooldown = new Map();

    this.onMessage = null;
  }

  /* =============================================================
     REPARTO
     ============================================================= */

  /**
   * @param {object|null} bounds  { x0, x1 } tramo jugable, o null = todo.
   *   Igual que con los vehiculos: en mapa reducido no se ponen cuerdas
   *   ni saltadores fuera del tramo en el que se juega.
   */
  build(bounds = null) {
    this.ziplines.length = 0;
    this.pads.length = 0;
    this.riding = null;
    this.cooldown = 0;

    /** ¿Cae este punto dentro del tramo jugable? */
    const dentro = (p) => !bounds || (p.x >= bounds.x0 && p.x <= bounds.x1);

    // --- Tirolinas ---
    for (const z of ZIPLINES) {
      let a = this._punto(z.from);
      let b = this._punto(z.to);
      if (!a || !b) continue;
      // Una tirolina que se sale del tramo te dejaria en plena tormenta.
      if (!dentro(a) || !dentro(b)) continue;

      // El trazado tiene que estar DESPEJADO. Dos de ellas pasaban por
      // encima de los tejados de Villa Pavo y de la Fabrica: al tocar la
      // cuerda, la fisica te sacaba del tejado y ya no enganchabas.
      // Si choca, se suben los dos postes y se vuelve a mirar.
      let intentos = 0;
      while (!this._trazadoLibre(a, b) && intentos++ < 8) {
        a = { ...a, y: a.y - 45 };
        b = { ...b, y: b.y - 45 };
      }

      this.ziplines.push({
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        // Los postes se dibujan desde el suelo hasta el anclaje
        suelo1: a.suelo, suelo2: b.suelo,
        len: Math.hypot(b.x - a.x, b.y - a.y),
      });
    }

    // --- Saltadores ---
    for (const p of JUMP_PADS) {
      const zona = ZONES.find((z) => z.id === p.zone);
      if (!zona) continue;
      if (bounds && (zona.x1 <= bounds.x0 || zona.x0 >= bounds.x1)) continue;

      // Sitio libre: un par de ellos caian dentro de un edificio y el
      // jugador aterrizaba en el suelo de la casa sin llegar a pisarlos.
      const x = this._sitioLibrePad(zona.x0 + (zona.x1 - zona.x0) * p.at, zona);
      if (x === null) continue;

      const suelo = this._suelo(x, zona.groundY);
      this.pads.push({ x: x - 26, y: suelo - 10, w: 52, h: 10, up: p.up, push: p.push, anim: 0 });
    }
  }

  /**
   * X donde cabe un saltador sin que le estorbe nada por encima.
   * @returns {number|null}
   */
  _sitioLibrePad(pedido, zona) {
    for (let d = 0; d <= 500; d += 40) {
      for (const x of (d === 0 ? [pedido] : [pedido - d, pedido + d])) {
        if (x < zona.x0 + 60 || x > zona.x1 - 60) continue;

        const suelo = this._suelo(x, zona.groundY);
        // La caja llega hasta 4 px POR ENCIMA del suelo: si tocara el
        // suelo, chocaria siempre con la propia plataforma que sostiene
        // el saltador y no habria sitio valido en todo el mapa.
        const caja = { x: x - 34, y: suelo - 70, w: 68, h: 66 };

        const choca = this.world.getPlatformsNear(caja, 0).some(
          (p) => !p.oneWay &&
                 p.x < caja.x + caja.w && p.x + p.w > caja.x &&
                 p.y < caja.y + caja.h && p.y + p.h > caja.y
        );
        if (!choca) return x;
      }
    }
    return null;
  }

  /**
   * ¿Esta despejado el recorrido de la cuerda?
   * Se muestrea el segmento cada pocos pixeles: no hace falta mas, las
   * plataformas del mundo son anchas.
   */
  _trazadoLibre(a, b) {
    const pasos = Math.max(8, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 40));

    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const caja = { x: x - 16, y: y - 20, w: 32, h: 50 };

      const choca = this.world.getPlatformsNear(caja, 0).some(
        (p) => !p.oneWay &&
               p.x < caja.x + caja.w && p.x + p.w > caja.x &&
               p.y < caja.y + caja.h && p.y + p.h > caja.y
      );
      if (choca) return false;
    }
    return true;
  }

  /** Punto de anclaje de una tirolina. */
  _punto(ancla) {
    const zona = ZONES.find((z) => z.id === ancla.zone);
    if (!zona) return null;

    const x = zona.x0 + (zona.x1 - zona.x0) * ancla.at;
    const suelo = this._suelo(x, zona.groundY);
    return { x, y: suelo - ancla.alto, suelo };
  }

  /** Superficie solida mas alta bajo una X. */
  _suelo(x, porDefecto) {
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
   * @param {Array<object>} bots  los bots tambien se enganchan y saltan
   */
  update(dt, player, input, bots = []) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (const p of this.pads) p.anim = Math.max(0, p.anim - dt * 2.5);

    this._updateBots(dt, bots);

    // --- Deslizandose ---
    if (this.riding) {
      this._ride(dt, player, input);
      return;
    }

    // Ni conduciendo ni volando se usa nada de esto.
    if (player.driving || player.flight) return;

    this._checkZip(player);
    this._checkPads(player);
  }

  /** Avanza por la cuerda. */
  _ride(dt, player, input) {
    const r = this.riding;
    r.t += (r.dir * ZIP_SPEED * dt) / r.line.len;

    // Soltarse con el salto (o al llegar al final)
    const salta = input.consume('jump');
    const fin = r.t <= 0 || r.t >= 1;

    if (salta || fin) {
      this._soltar(player, salta);
      return;
    }

    const L = r.line;
    player.x = L.x1 + (L.x2 - L.x1) * r.t - player.w / 2;
    player.y = L.y1 + (L.y2 - L.y1) * r.t + 6;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.facing = r.dir > 0 ? (L.x2 > L.x1 ? 1 : -1) : (L.x2 > L.x1 ? -1 : 1);

    if (Math.random() < 0.25) {
      this.particles?.spark(player.x + player.w / 2, player.y, '#c8d0dc', 1, 60);
    }
  }

  _soltar(player, saltando) {
    const r = this.riding;
    const L = r.line;

    // Se sale con la inercia de la cuerda: si no, te quedas clavado en
    // el aire y el impulso del viaje no sirve de nada.
    const dx = (L.x2 - L.x1) / L.len * r.dir;
    const dy = (L.y2 - L.y1) / L.len * r.dir;

    player.vx = dx * ZIP_SPEED * 0.75;
    player.vy = dy * ZIP_SPEED * 0.5 - (saltando ? 380 : 0);

    this.riding = null;
    this.cooldown = REENGANCHE;
  }

  /** ¿Toca alguna cuerda? */
  _checkZip(player) {
    if (this.cooldown > 0) return;

    const px = player.x + player.w / 2;
    const py = player.y + 6;

    for (const L of this.ziplines) {
      const t = this._proyectar(L, px, py);
      const cx = L.x1 + (L.x2 - L.x1) * t;
      const cy = L.y1 + (L.y2 - L.y1) * t;

      if (Math.hypot(px - cx, py - cy) > ZIP_GRAB) continue;
      // Enganchado justo en la punta no vale: saldrias en el acto.
      if (t < 0.02 || t > 0.98) continue;

      // Se va hacia el extremo al que ya se dirige; parado, hacia el
      // que este mas lejos, que es el viaje que interesa.
      const dir = Math.abs(player.vx) > 30
        ? (player.vx > 0 === L.x2 > L.x1 ? 1 : -1)
        : (t < 0.5 ? 1 : -1);

      this.riding = { line: L, t, dir };
      this.onMessage?.('¡Tirolina! Espacio para soltarte', 'uncommon');
      this.particles?.puff(cx, cy, 'rgba(255,255,255,0.5)', 5);
      return;
    }
  }

  /** Posicion 0..1 del punto mas cercano de la cuerda. */
  _proyectar(L, px, py) {
    const dx = L.x2 - L.x1;
    const dy = L.y2 - L.y1;
    const t = ((px - L.x1) * dx + (py - L.y1) * dy) / (dx * dx + dy * dy);
    return Math.max(0, Math.min(1, t));
  }

  /** ¿Ha pisado un saltador? */
  _checkPads(player) {
    // Solo cuenta si viene cayendo: si no, al andar por encima te
    // relanzaria sin parar.
    if (player.vy < 0) return;

    for (const p of this.pads) {
      if (player.x + player.w < p.x || player.x > p.x + p.w) continue;
      const base = player.y + player.h;
      if (base < p.y - 4 || base > p.y + 22) continue;

      player.vy = -p.up;
      player.vx = p.push;
      player.onGround = false;

      p.anim = 1;
      this.particles?.puff(p.x + p.w / 2, p.y, 'rgba(126, 224, 106, 0.6)', 8);
      this.particles?.spark(p.x + p.w / 2, p.y, '#7ee06a', 8, 260);
      return;
    }
  }

  /* =============================================================
     LOS BOTS TAMBIEN LAS USAN
     ============================================================= */

  /**
   * Un bot se engancha si la cuerda le pilla de paso y le acerca a donde
   * va; y los saltadores le lanzan igual que al jugador.
   *
   * No se les toca la IA: siguen decidiendo su destino por su cuenta.
   */
  _updateBots(dt, bots) {
    // --- Los que van colgados ---
    for (const [bot, r] of this.botRiders) {
      if (!bot.alive) { this.botRiders.delete(bot); bot.riding = false; continue; }

      r.t += (r.dir * ZIP_SPEED * dt) / r.line.len;

      if (r.t <= 0 || r.t >= 1) {
        this._soltarBot(bot, r);
        continue;
      }

      const L = r.line;
      bot.x = L.x1 + (L.x2 - L.x1) * r.t - bot.w / 2;
      bot.y = L.y1 + (L.y2 - L.y1) * r.t + 6;
      bot.vx = 0;
      bot.vy = 0;
      bot.onGround = false;
    }

    // --- Enfriamientos ---
    for (const [bot, t] of this.botCooldown) {
      const nuevo = t - dt;
      if (nuevo <= 0) this.botCooldown.delete(bot);
      else this.botCooldown.set(bot, nuevo);
    }

    // --- ¿Alguno se engancha o pisa un saltador? ---
    for (const bot of bots) {
      if (!bot.alive || bot.flight || bot.driving || bot.riding) continue;
      if (this.botCooldown.has(bot)) continue;

      if (!this._botZip(bot)) this._botPad(bot);
    }
  }

  /** ¿Se engancha este bot a alguna cuerda? */
  _botZip(bot) {
    const px = bot.x + bot.w / 2;
    const py = bot.y + 6;
    const destino = bot.ai?.waypointX ?? bot.x;

    for (const L of this.ziplines) {
      const t = this._proyectar(L, px, py);
      const cx = L.x1 + (L.x2 - L.x1) * t;
      const cy = L.y1 + (L.y2 - L.y1) * t;
      if (Math.hypot(px - cx, py - cy) > ZIP_GRAB) continue;
      if (t < 0.02 || t > 0.98) continue;

      // Solo si la cuerda le acerca a donde va: engancharse para acabar
      // mas lejos del destino no tiene ningun sentido.
      const haciaB = Math.abs(destino - L.x2) < Math.abs(destino - L.x1);
      const dir = haciaB ? 1 : -1;
      const finX = haciaB ? L.x2 : L.x1;
      if (Math.abs(destino - finX) > Math.abs(destino - px)) continue;

      this.botRiders.set(bot, { line: L, t, dir });
      bot.riding = true;
      return true;
    }
    return false;
  }

  _soltarBot(bot, r) {
    const L = r.line;
    const dx = ((L.x2 - L.x1) / L.len) * r.dir;
    const dy = ((L.y2 - L.y1) / L.len) * r.dir;

    bot.vx = dx * ZIP_SPEED * 0.7;
    bot.vy = dy * ZIP_SPEED * 0.5;
    bot.riding = false;

    this.botRiders.delete(bot);
    this.botCooldown.set(bot, REENGANCHE * 3);
  }

  /** Saltadores para bots: igual que para el jugador. */
  _botPad(bot) {
    if (bot.vy < 0) return;

    for (const p of this.pads) {
      if (bot.x + bot.w < p.x || bot.x > p.x + p.w) continue;
      const base = bot.y + bot.h;
      if (base < p.y - 4 || base > p.y + 22) continue;

      bot.vy = -p.up;
      bot.vx = p.push;
      bot.onGround = false;
      p.anim = 1;
      this.particles?.puff(p.x + p.w / 2, p.y, 'rgba(126, 224, 106, 0.5)', 5);
      return;
    }
  }

  /** Suelta la cuerda sin preguntar (al morir o acabar). */
  forceRelease(player) {
    if (this.riding) this._soltar(player, false);
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    // --- Tirolinas ---
    for (const L of this.ziplines) {
      const x = Math.min(L.x1, L.x2);
      const y = Math.min(L.y1, L.y2);
      const w = Math.abs(L.x2 - L.x1);
      const h = Math.abs(L.y2 - L.y1);
      if (!camera.isVisible(x - 40, y - 40, w + 80, h + 400)) continue;

      this._drawPoste(ctx, L.x1, L.y1, L.suelo1);
      this._drawPoste(ctx, L.x2, L.y2, L.suelo2);

      // Cuerda: una linea gruesa oscura con un brillo encima
      ctx.strokeStyle = 'rgba(20, 26, 40, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(L.x1, L.y1);
      ctx.lineTo(L.x2, L.y2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(200, 220, 255, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(L.x1, L.y1 - 1);
      ctx.lineTo(L.x2, L.y2 - 1);
      ctx.stroke();
    }

    // --- Saltadores ---
    for (const p of this.pads) {
      if (!camera.isVisible(p.x - 20, p.y - 40, p.w + 40, 70)) continue;
      this._drawPad(ctx, p, time);
    }
  }

  _drawPoste(ctx, x, y, suelo) {
    // Mastil
    ctx.strokeStyle = '#5b6874';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, suelo);
    ctx.stroke();

    // Tirantes
    ctx.strokeStyle = 'rgba(91, 104, 116, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 16, suelo);
    ctx.lineTo(x, suelo - 46);
    ctx.lineTo(x + 16, suelo);
    ctx.stroke();

    // Cabeza y anclaje
    ctx.fillStyle = '#3b4356';
    ctx.fillRect(x - 8, y - 8, 16, 10);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(x, y, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawPad(ctx, p, time) {
    const hundido = p.anim * 6;
    const pulso = 0.6 + 0.4 * Math.sin(time * 4);

    // Base
    ctx.fillStyle = '#3b4356';
    ctx.fillRect(p.x, p.y + 4, p.w, 10);

    // Muelles
    ctx.strokeStyle = '#8d97a6';
    ctx.lineWidth = 2.4;
    for (const sx of [p.x + 10, p.x + p.w - 10]) {
      ctx.beginPath();
      for (let i = 0; i <= 3; i++) {
        ctx.lineTo(sx + (i % 2 ? 4 : -4), p.y + 4 - i * (3 - hundido * 0.4));
      }
      ctx.stroke();
    }

    // Lona
    ctx.fillStyle = '#5fd14a';
    ctx.beginPath();
    ctx.moveTo(p.x - 2, p.y - 6 + hundido);
    ctx.quadraticCurveTo(p.x + p.w / 2, p.y - 10 + hundido * 2, p.x + p.w + 2, p.y - 6 + hundido);
    ctx.lineTo(p.x + p.w + 2, p.y + 2 + hundido);
    ctx.quadraticCurveTo(p.x + p.w / 2, p.y - 2 + hundido * 2, p.x - 2, p.y + 2 + hundido);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(p.x + 3, p.y - 5 + hundido, p.w - 6, 2);

    // Flechas de "para arriba"
    ctx.globalAlpha = pulso;
    ctx.fillStyle = '#7ee06a';
    const dir = Math.sign(p.push) || 1;
    for (let i = 0; i < 2; i++) {
      const fy = p.y - 16 - i * 11 - Math.sin(time * 5 + i) * 2;
      const fx = p.x + p.w / 2 + dir * (4 + i * 5);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + 7, fy + 8);
      ctx.lineTo(fx - 7, fy + 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
