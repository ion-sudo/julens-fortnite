/**
 * gadgets.js (sistema)
 * ---------------------------------------------------------------
 * TORRETAS Y TRAMPAS colocadas en el escenario.
 *
 * Se colocan con el CLIC IZQUIERDO llevandolas equipadas, sobre
 * cualquier superficie solida al alcance: el suelo, un tejado o una
 * pared que hayas construido tu. Mientras las llevas en la mano se ve
 * una PREVISUALIZACION en fantasma, verde si se puede y roja si no,
 * igual que al construir.
 *
 * Una vez puestas funcionan solas:
 *
 *   TORRETA  busca al enemigo mas cercano dentro de su alcance y le
 *            dispara sola, con las balas normales del juego.
 *   TRAMPA   hace dano a quien la pise, con un respiro entre golpe y
 *            golpe para que pasar por encima no te mate del tiron.
 *
 * Las dos tienen VIDA y se pueden reventar a tiros, a picotazos o de un
 * granadazo: se apuntan a la lista de objetivos de las balas, asi que
 * les da todo lo que le da a un personaje.
 */

import { PLACE_RANGE } from '../data/gadgets.js';
import { drawGadget } from '../entities/gadgetSprite.js';
import { CONFIG } from '../core/config.js';
import { areAllies } from './teams.js';

/** Separacion minima entre dos trastos colocados. */
const MIN_GAP = 46;

export class GadgetManager {
  /**
   * @param {object} deps { world, particles, bullets }
   */
  constructor(deps) {
    this.world = deps.world;
    this.particles = deps.particles;
    this.bullets = deps.bullets;

    /** @type {Array<object>} lo ya colocado */
    this.list = [];
    /** Previsualizacion mientras llevas uno equipado: { def, x, y, ok }. */
    this.preview = null;

    /** Aviso para la pantalla (lo enchufa game.js). */
    this.onMessage = null;
    /** Aviso de colocacion (misiones, XP). */
    this.onPlaced = null;
  }

  reset() {
    this.list.length = 0;
    this.preview = null;
  }

  /* =============================================================
     COLOCAR
     ============================================================= */

  /**
   * Calcula donde caeria el trasto si lo pusieras ahora, y si vale.
   * Lo llama game.js cada frame mientras lleves uno equipado; el
   * resultado se usa para el fantasma Y para colocarlo de verdad, para
   * que no puedan decir cosas distintas.
   *
   * @returns {object|null} { def, x, y, ok, motivo }
   */
  aim(def, player, mouse) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;

    // Superficie bajo el raton: el techo de la plataforma solida mas
    // alta que haya por debajo del puntero.
    const y = this._superficie(mouse.worldX, mouse.worldY);
    const punto = { def, x: mouse.worldX, y, ok: false, motivo: null };

    if (y === null) {
      punto.motivo = 'Ahi no hay suelo';
      return punto;
    }
    if (Math.hypot(mouse.worldX - px, y - py) > PLACE_RANGE) {
      punto.motivo = 'Demasiado lejos';
      return punto;
    }
    if (this.list.some((g) => Math.abs(g.x - punto.x) < MIN_GAP && Math.abs(g.y - y) < 60)) {
      punto.motivo = 'Ahi ya hay algo puesto';
      return punto;
    }
    // Ni encima del propio jugador: quedaria dentro y no podrias salir
    // de la trampa sin comerte todos los pinchazos.
    if (Math.abs(punto.x - px) < 30 && Math.abs(y - (player.y + player.h)) < 20) {
      punto.motivo = 'Apartate un poco';
      return punto;
    }

    punto.ok = true;
    return punto;
  }

  /**
   * Coloca de verdad lo que diga `aim`.
   * @returns {boolean} true si se ha puesto
   */
  place(punto, owner) {
    if (!punto?.ok) {
      if (punto?.motivo) this.onMessage?.(punto.motivo);
      return false;
    }

    const def = punto.def;
    this.list.push({
      def,
      x: punto.x,
      y: punto.y,               // el suelo sobre el que se apoya
      health: def.health,
      maxHealth: def.health,
      owner,
      arming: def.armTime,      // cuenta atras hasta que empieza a funcionar
      cooldown: 0,              // torreta: entre disparo y disparo
      angle: 0,                 // torreta: hacia donde apunta
      target: null,
      hurtFlash: 0,
      lastHit: new Map(),       // trampa: cuando golpeo por ultima vez a cada uno
      dead: false,
    });

    // Su hitbox para las balas, fija de por vida.
    const puesto = this.list[this.list.length - 1];
    puesto.hitbox = this._hitboxDe(puesto);

    this.particles.puff(punto.x, punto.y - 12, 'rgba(200, 210, 230, 0.6)', 5);
    this.onMessage?.(`${def.name} colocada`, def.rarity);
    this.onPlaced?.(def, owner);
    return true;
  }

  /**
   * Techo de la plataforma solida mas alta que hay bajo un punto.
   * Vale tanto el terreno como los tejados y lo que hayas construido.
   */
  _superficie(x, y) {
    // Se mira desde un poco por encima del raton hacia abajo.
    const caja = { x: x - 2, y: y - 40, w: 4, h: this.world.height };
    let mejor = null;

    for (const p of this.world.getPlatformsNear(caja, 0)) {
      if (p.door && p.open) continue;
      if (p.x > x || p.x + p.w < x) continue;
      if (p.y < y - 40) continue;              // por encima del raton: no
      if (mejor === null || p.y < mejor) mejor = p.y;
    }
    return mejor;
  }

  /* =============================================================
     UPDATE
     ============================================================= */

  /**
   * @param {number} dt
   * @param {Array} enemigos  a quien atacan las torretas y las trampas
   */
  update(dt, enemigos) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const g = this.list[i];

      if (g.health <= 0) {
        this._reventar(g);
        this.list.splice(i, 1);
        continue;
      }

      g.hurtFlash = Math.max(0, g.hurtFlash - dt * 3);
      g.arming = Math.max(0, g.arming - dt);
      if (g.arming > 0) continue;              // todavia montandose

      if (g.def.kindOf === 'torreta') this._updateTorreta(g, dt, enemigos);
      else this._updateTrampa(g, dt, enemigos);
    }
  }

  /** La torreta busca objetivo y dispara sola. */
  _updateTorreta(g, dt, enemigos) {
    g.cooldown = Math.max(0, g.cooldown - dt);

    const cx = g.x;
    const cy = g.y - 26;

    // Objetivo: el enemigo vivo mas cercano dentro del alcance. No
    // dispara a quien la puso, claro.
    let mejor = null;
    let mejorD = g.def.range;

    for (const e of enemigos) {
      if (!e.alive || e === g.owner) continue;
      // Ni a los companeros de quien la puso.
      if (areAllies(g.owner, e)) continue;
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      const d = Math.hypot(ex - cx, ey - cy);
      if (d < mejorD) { mejorD = d; mejor = e; }
    }

    g.target = mejor;
    if (!mejor) return;

    // Apuntar (el canon se gira al momento; es una maquina).
    const tx = mejor.x + mejor.w / 2;
    const ty = mejor.y + mejor.h * 0.45;
    g.angle = Math.atan2(ty - cy, tx - cx);

    if (g.cooldown > 0) return;
    g.cooldown = 1 / g.def.fireRate;

    // Dispara con las balas de siempre: asi le afectan las mismas
    // reglas (paredes, cupulas del escudo burbuja, alcance...).
    this.bullets.spawn({
      x: cx + Math.cos(g.angle) * 26,
      y: cy + Math.sin(g.angle) * 26,
      angle: g.angle + (Math.random() - 0.5) * 0.05,
      speed: g.def.bulletSpeed,
      damage: g.def.damage,
      range: g.def.range + 120,
      pierce: false,
      rarity: g.def.rarity,
      kind: 'bala',
      owner: g.owner,
    });

    this.particles.muzzleFlash(
      cx + Math.cos(g.angle) * 28, cy + Math.sin(g.angle) * 28,
      g.angle, '#ffd27f', 0.8
    );
  }

  /** La trampa pincha a quien la pise. */
  _updateTrampa(g, dt, enemigos) {
    const caja = {
      x: g.x - g.def.w / 2,
      y: g.y - g.def.h - 6,
      w: g.def.w,
      h: g.def.h + 10,
    };

    for (const e of enemigos) {
      if (!e.alive || e === g.owner) continue;
      if (areAllies(g.owner, e)) continue;

      const r = { x: e.x, y: e.y, w: e.w, h: e.h };
      if (r.x > caja.x + caja.w || r.x + r.w < caja.x) continue;
      if (r.y > caja.y + caja.h || r.y + r.h < caja.y) continue;

      // Respiro entre pinchazo y pinchazo al MISMO objetivo: sin esto,
      // cruzar la trampa te quitaba la vida entera en medio segundo.
      const ultimo = g.lastHit.get(e) || -99;
      if (this._tiempo - ultimo < g.def.cooldown) continue;
      g.lastHit.set(e, this._tiempo);

      e.takeDamage(g.def.damage, e.x + e.w / 2, e.y + e.h, g.owner);
      this.particles.spark(e.x + e.w / 2, e.y + e.h, '#e8434f', 10, 260);
    }
  }

  /** Reloj propio, para los respiros de las trampas. */
  tick(dt) {
    this._tiempo = (this._tiempo || 0) + dt;
  }

  _reventar(g) {
    this.particles.spark(g.x, g.y - 14, '#c8d0dc', 16, 300);
    this.particles.puff(g.x, g.y - 14, 'rgba(90, 96, 110, 0.6)', 6);
    this.onMessage?.(`${g.def.name} destruida`);
  }

  /* =============================================================
     RECIBIR DANO
     -------------------------------------------------------------
     Se les da la misma cara que a un personaje (rect + takeDamage)
     para poder meterlas en la lista de objetivos de las balas: asi les
     dan los tiros, el pico y las explosiones sin tocar nada de eso.
     ============================================================= */

  /**
   * Objetivos que puede alcanzar una bala.
   *
   * El envoltorio se crea UNA VEZ al colocar el trasto y se reutiliza:
   * las balas recuerdan a quien ya han golpeado comparando objetos, y
   * fabricando uno nuevo cada frame esa cuenta no valdria de nada.
   */
  get targets() {
    return this.list.map((g) => g.hitbox);
  }

  /**
   * El envoltorio con la cara que esperan las balas... y las
   * explosiones, que no usan `rect()` sino `x/y/w/h` sueltos. Hacen
   * falta LOS DOS: sin las coordenadas sueltas, una granada le calculaba
   * la distancia con `undefined`, salia NaN, y como `NaN > radio` es
   * falso le metia un dano NaN que dejaba la vida rota para siempre.
   */
  _hitboxDe(g) {
    const alto = g.def.kindOf === 'trampa' ? g.def.h + 6 : g.def.h + 22;
    return {
      get x() { return g.x - g.def.w / 2; },
      get y() { return g.y - alto; },
      get w() { return g.def.w; },
      get h() { return alto; },
      rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; },
      get alive() { return g.health > 0; },
      takeDamage: (amount) => {
        if (!Number.isFinite(amount)) return;
        g.health -= amount;
        g.hurtFlash = 1;
      },
    };
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    for (const g of this.list) {
      if (!camera.isVisible(g.x - 50, g.y - 80, 100, 100)) continue;

      // Parpadeo blanco al recibir un tiro.
      if (g.hurtFlash > 0) {
        ctx.save();
        ctx.globalAlpha = g.hurtFlash * 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(g.x, g.y - 20, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      drawGadget(ctx, g.def, {
        x: g.x, y: g.y, angle: g.angle, armado: g.arming <= 0,
      });

      // Barra de vida, solo si ya le han dado.
      if (g.health < g.maxHealth) {
        const w = 40;
        const x = g.x - w / 2;
        const y = g.y - (g.def.kindOf === 'trampa' ? 34 : 62);
        ctx.fillStyle = 'rgba(10, 16, 34, 0.8)';
        ctx.fillRect(x, y, w, 5);
        ctx.fillStyle = '#5fd14a';
        ctx.fillRect(x, y, w * (g.health / g.maxHealth), 5);
      }
    }

    // --- Previsualizacion ---
    if (this.preview) {
      const p = this.preview;
      ctx.save();
      ctx.globalAlpha = 0.55;
      drawGadget(ctx, p.def, { x: p.x, y: p.y ?? 0, angle: 0, armado: false });
      ctx.restore();

      // Marca en el suelo: verde si se puede, roja si no.
      if (p.y !== null) {
        ctx.strokeStyle = p.ok ? 'rgba(95, 209, 74, 0.9)' : 'rgba(232, 67, 79, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 2, p.def.w * 0.55, 9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (CONFIG.debug.showHitboxes) {
      ctx.strokeStyle = 'rgba(120, 220, 255, 0.6)';
      ctx.lineWidth = 1.5;
      for (const g of this.list) {
        if (g.def.kindOf !== 'torreta') continue;
        ctx.beginPath();
        ctx.arc(g.x, g.y - 26, g.def.range, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}
