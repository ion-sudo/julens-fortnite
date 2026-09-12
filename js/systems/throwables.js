/**
 * throwables.js (sistema)
 * ---------------------------------------------------------------
 * LAS GRANADAS EN VUELO y sus explosiones.
 *
 * Ciclo de una granada:
 *   1. el jugador la lanza en ARCO hacia donde apunta el raton
 *   2. vuela con gravedad y REBOTA en el terreno y en las construcciones
 *   3. explota cuando se acaba la mecha (o poco despues de quedarse
 *      quieta en el suelo, para que tirarla a los pies de alguien
 *      responda al momento)
 *   4. la explosion hace dano EN AREA: a los bots, al jugador y a las
 *      construcciones, y menos cuanto mas lejos del centro
 *
 * La explosion no distingue amigos: si te pilla a ti, te pilla. Es lo
 * que hace que haya que pensar antes de tirarla de cerca.
 *
 * Hay tres tipos, y lo unico que cambia es lo que pasa al reventar
 * (`def.effect`, ver data/throwables.js):
 *
 *   explosion  dano en area (la granada de siempre)
 *   choque     NO hace dano: manda por los aires a todo el que pille
 *   burbuja    deja una CUPULA que para las balas por los dos lados
 */

import { CONFIG } from '../core/config.js';
import { drawThrowable } from '../entities/throwableSprite.js';
import { areAllies } from './teams.js';
import { playExplosionAt } from '../core/audio.js';

/** Gravedad de una granada (algo menos que la del personaje). */
const GRAVEDAD = 1750;
/** Rozamiento del suelo, para que no ruede eternamente. */
const ROCE = 0.72;
/** Por debajo de esta velocidad se considera parada. */
const QUIETA = 42;
/** Radio de la granada, para rebotar. */
const RADIO = 8;

export class ThrowableManager {
  /**
   * @param {object} deps { world, particles, build }
   */
  constructor(deps) {
    this.world = deps.world;
    this.particles = deps.particles;
    /** Construcciones: la explosion tambien las rompe. */
    this.build = deps.build || null;

    /** @type {Array<object>} granadas en vuelo */
    this.list = [];
    /** @type {Array<object>} anillos de onda expansiva */
    this.rings = [];
    /**
     * @type {Array<object>} CUPULAS en pie del escudo burbuja.
     * Las lee el sistema de balas para pararlas (ver entities/bullet.js).
     */
    this.shields = [];

    /** Aviso para la pantalla (lo enchufa game.js). */
    this.onMessage = null;
    /** Aviso de dano hecho por el jugador (para misiones y XP). */
    this.onDamage = null;
  }

  reset() {
    this.list.length = 0;
    /** Anillos de onda expansiva, solo decorativos. */
    this.rings = [];
    /** Cupulas del escudo burbuja que siguen en pie. */
    this.shields.length = 0;
  }

  /* =============================================================
     LANZAR
     ============================================================= */

  /**
   * Lanza una granada desde `quien` hacia un punto del mundo.
   *
   * El ARCO sale solo: se apunta al objetivo y se le suma un empujon
   * hacia arriba proporcional a la distancia, asi que de cerca sale
   * casi recta y de lejos describe una parabola alta.
   *
   * @param {object} def     definicion (data/throwables.js)
   * @param {object} quien   jugador o bot que la lanza
   * @param {number} targetX punto al que apunta
   * @param {number} targetY
   */
  throwFrom(def, quien, targetX, targetY) {
    const x = quien.x + quien.w / 2 + (quien.facing || 1) * 14;
    const y = quien.y + quien.h * 0.35;

    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.max(1, Math.hypot(dx, dy));

    // Direccion al objetivo, con el arco anadido.
    const fuerza = Math.min(1, dist / 620);
    const vx = (dx / dist) * def.throwSpeed;
    const vy = (dy / dist) * def.throwSpeed - 260 - fuerza * 320;

    this.list.push({
      def,
      owner: quien,
      x, y,
      vx: vx + (quien.vx || 0) * 0.35,   // hereda algo de tu carrera
      vy,
      fuse: def.fuse,
      angle: 0,
      spin: (dx >= 0 ? 1 : -1) * 9,
      resting: 0,
    });
  }

  /* =============================================================
     UPDATE
     ============================================================= */

  /**
   * @param {number} dt
   * @param {Array} objetivos  jugador y bots (todos con .alive y .takeDamage)
   */
  update(dt, objetivos) {
    // --- Cupulas del escudo burbuja ---
    // Se van solas al agotarse el tiempo o la vida.
    for (let i = this.shields.length - 1; i >= 0; i--) {
      const c = this.shields[i];
      c.life -= dt;
      c.hitFlash = Math.max(0, c.hitFlash - dt * 3);
      if (c.life <= 0 || c.health <= 0) {
        this.particles.puff(c.x, c.y, 'rgba(150, 220, 255, 0.6)', 10);
        this.shields.splice(i, 1);
      }
    }

    // --- Ondas expansivas (solo adorno) ---
    // Se envejecen aqui y no al dibujar: dibujar no debe cambiar el
    // estado del juego, y ademas asi no dependen de ir a 60 fps.
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].life -= dt;
      if (this.rings[i].life <= 0) this.rings.splice(i, 1);
    }

    for (let i = this.list.length - 1; i >= 0; i--) {
      const g = this.list[i];

      g.fuse -= dt;
      g.angle += g.spin * dt;

      this._mover(g, dt);

      // Quieta en el suelo: se recorta la mecha para que responda.
      if (g.resting > 0.1 && g.fuse > g.def.fuseOnRest) {
        g.fuse = g.def.fuseOnRest;
      }

      // Rastro de humo mientras vuela
      if (Math.random() < 0.35) {
        this.particles.puff(g.x, g.y, 'rgba(190, 190, 190, 0.35)', 1);
      }

      if (g.fuse <= 0) {
        this.explode(g, objetivos);
        this.list.splice(i, 1);
      }
    }
  }

  /**
   * Fisica de la granada: gravedad, y rebote contra cualquier cosa
   * solida (terreno o construccion).
   *
   * Se resuelve eje a eje, igual que la fisica de los personajes: es lo
   * que evita que una granada se cuele por una esquina cuando viene muy
   * rapida en diagonal.
   */
  _mover(g, dt) {
    g.vy += GRAVEDAD * dt;

    // --- Eje X ---
    g.x += g.vx * dt;
    if (this._chocaEn(g.x, g.y)) {
      g.x -= g.vx * dt;
      g.vx = -g.vx * g.def.bounce;
      g.spin = -g.spin * 0.6;
    }

    // --- Eje Y ---
    g.y += g.vy * dt;
    if (this._chocaEn(g.x, g.y)) {
      g.y -= g.vy * dt;

      // Rebote hacia arriba, cada vez mas flojo
      if (g.vy > 0) {
        g.vy = -g.vy * g.def.bounce;
        g.vx *= ROCE;
        g.spin *= 0.5;
      } else {
        g.vy = 0;
      }
    }

    // ¿Se ha parado? (para recortar la mecha)
    const quieta = Math.abs(g.vx) < QUIETA && Math.abs(g.vy) < QUIETA * 3;
    g.resting = quieta ? g.resting + dt : 0;

    // Si se sale del mundo por abajo, que reviente y no se quede colgada.
    if (g.y > this.world.height) g.fuse = 0;
  }

  /** ¿Hay algo solido en este punto? Las plataformas finas no cuentan. */
  _chocaEn(x, y) {
    const caja = { x: x - RADIO, y: y - RADIO, w: RADIO * 2, h: RADIO * 2 };
    return this.world.getPlatformsNear(caja, 2).some(
      (p) => !p.oneWay &&
        x + RADIO > p.x && x - RADIO < p.x + p.w &&
        y + RADIO > p.y && y - RADIO < p.y + p.h
    );
  }

  /* =============================================================
     EXPLOSION
     ============================================================= */

  /**
   * Revienta una granada: efectos, dano a todo el que este cerca y a
   * las construcciones.
   *
   * El dano baja con la distancia, de `damage` en el centro a
   * `minDamage` justo en el borde. Fuera del radio, nada.
   */
  explode(g, objetivos = []) {
    const def = g.def;

    // Cada tipo revienta a su manera.
    if (def.effect === 'burbuja') return this._abrirCupula(g);
    if (def.effect === 'choque') return this._onda(g, objetivos);

    playExplosionAt(g.x, g.y);
    this._efectos(g.x, g.y, def.radius);

    // --- Personajes ---
    for (const e of objetivos) {
      if (!e.alive) continue;
      // Sin fuego amigo. Tu si te pillas a ti mismo: `areAllies(a, a)`
      // es true, asi que se comprueba aparte.
      if (e !== g.owner && areAllies(g.owner, e)) continue;

      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      const d = Math.hypot(ex - g.x, ey - g.y);
      if (d > def.radius) continue;

      const dano = this._danoA(def, d);
      // `owner` para que la baja cuente a quien la tiro. Si te pillas a
      // ti mismo, tambien: la explosion no distingue.
      e.takeDamage(dano, ex, ey, g.owner);

      if (g.owner && g.owner !== e) this.onDamage?.(dano, g.owner);
    }

    // --- Construcciones ---
    // Pegan mas que a la gente (structMult): una granada tiene que
    // poder abrir un hueco en una pared de madera.
    if (this.build) {
      // Copia de la lista: al reventar una pieza se quita de `structures`.
      for (const s of [...this.build.structures]) {
        // rect() es la celda que ocupa la pieza en el mundo.
        const r = s.rect();
        const sx = r.x + r.w / 2;
        const sy = r.y + r.h / 2;
        const d = Math.hypot(sx - g.x, sy - g.y);
        if (d > def.radius * 1.15) continue;

        s.takeDamage(this._danoA(def, d) * def.structMult, g.owner);
      }
    }
  }

  /* =============================================================
     GRANADA DE CHOQUE
     ============================================================= */

  /**
   * La onda de choque: NO hace dano a nadie, los MANDA POR LOS AIRES.
   *
   * El empujon va del centro hacia fuera y baja con la distancia, con
   * la mayor parte hacia ARRIBA (`pushUp`): es lo que la hace util para
   * subir a un tejado o para salir de un apuro, y no solo para
   * apartar a alguien de un empujon.
   *
   * Como no hace dano, aqui SI conviene que te pille: es su gracia.
   */
  _onda(g, objetivos) {
    const def = g.def;

    this.particles.spark(g.x, g.y, '#3ad6f5', 24, 460);
    this.particles.puff(g.x, g.y, 'rgba(160, 225, 255, 0.6)', 10);
    this.rings.push({ x: g.x, y: g.y, r: 12, max: def.radius, life: 0.5, total: 0.5 });

    // La onda SI empuja a los companeros: no les hace dano y de hecho
    // les viene bien para salir de un apuro.
    for (const e of objetivos) {
      if (!e.alive) continue;

      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      const dx = ex - g.x;
      const dy = ey - g.y;
      const d = Math.hypot(dx, dy);
      if (d > def.radius) continue;

      // Fuerza: entera en el centro, nada en el borde.
      const fuerza = def.push * (1 - d / def.radius);
      // Direccion, con un minimo hacia arriba aunque estes justo encima.
      const nx = d < 1 ? 0 : dx / d;
      const ny = d < 1 ? -1 : dy / d;

      e.vx += nx * fuerza * (1 - def.pushUp);
      e.vy += (ny - 0.6) * fuerza * def.pushUp;

      // Despegarlo del suelo, o la fisica se lo come en el mismo frame.
      e.onGround = false;
      // Y sacarlo de lo que estuviera haciendo (curarse, apuntar...).
      e.cancelAction?.();
    }
  }

  /* =============================================================
     ESCUDO BURBUJA
     ============================================================= */

  /**
   * Planta una cupula donde ha caido.
   *
   * Se apoya en el suelo (no flotando a media altura, que quedaria
   * raro y ademas dejaria un hueco por debajo para dispararte).
   */
  _abrirCupula(g) {
    const S = g.def.shield;

    this.particles.spark(g.x, g.y, '#7fd8ff', 22, 380);

    this.shields.push({
      x: g.x,
      y: g.y,
      r: S.radius,
      health: S.health,
      maxHealth: S.health,
      life: S.life,
      total: S.life,
      hitFlash: 0,
      owner: g.owner,
    });
  }

  /** Dano segun la distancia al centro. */
  _danoA(def, d) {
    const t = Math.min(1, d / def.radius);
    return def.damage + (def.minDamage - def.damage) * t;
  }

  /** Fogonazo, humo y onda expansiva. */
  _efectos(x, y, radio) {
    this.particles.spark(x, y, '#ffd23f', 26, 520);
    this.particles.spark(x, y, '#ff8a3d', 20, 380);
    this.particles.puff(x, y, 'rgba(90, 84, 80, 0.65)', 12);

    // El anillo de la onda vive aparte: es lo que deja ver de un vistazo
    // hasta donde ha llegado.
    this.rings.push({ x, y, r: 10, max: radio, life: 0.42, total: 0.42 });
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    // --- Ondas expansivas ---
    for (const o of this.rings) {
      const t = 1 - o.life / o.total;
      ctx.strokeStyle = `rgba(255, 200, 120, ${0.75 * (1 - t)})`;
      ctx.lineWidth = 5 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r + (o.max - o.r) * t, 0, Math.PI * 2);
      ctx.stroke();
    }

    // --- Cupulas del escudo burbuja ---
    // Se pintan por delante de todo lo que hay dentro (se ve a traves),
    // asi que el orden importa: van aqui, no antes del terreno.
    for (const c of this.shields) {
      if (!camera.isVisible(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2)) continue;
      this._drawShield(ctx, c, time);
    }

    // --- Granadas en vuelo ---
    for (const g of this.list) {
      if (!camera.isVisible(g.x - 20, g.y - 20, 40, 40)) continue;

      // La mecha parpadea cada vez mas rapido segun se acaba.
      const prisa = 1 - Math.max(0, g.fuse) / g.def.fuse;
      const blink = Math.abs(Math.sin(time * (8 + prisa * 26)));

      drawThrowable(ctx, g.def, {
        x: g.x, y: g.y, scale: 0.85, angle: g.angle, blink,
      });
    }

    if (CONFIG.debug.showHitboxes) {
      ctx.strokeStyle = 'rgba(255,140,60,0.7)';
      ctx.lineWidth = 1.5;
      for (const g of this.list) {
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.def.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  /**
   * La cupula: un domo de cristal azul.
   *
   * Se ve lo de dentro a proposito (es semitransparente): saber si hay
   * alguien dentro es parte de la decision de entrar o no. Parpadea en
   * blanco cada vez que le dan, y se va apagando segun se le acaba el
   * tiempo, para que se vea venir el momento en que desaparece.
   */
  _drawShield(ctx, c, time) {
    const vida = c.health / c.maxHealth;
    const queda = c.life / c.total;
    // Los ultimos 4 segundos parpadea: aviso de que se va.
    const agonia = c.life < 4 ? 0.45 + 0.55 * Math.abs(Math.sin(time * 9)) : 1;
    const alpha = (0.30 + 0.35 * vida) * agonia;

    ctx.save();

    // Relleno
    const g = ctx.createRadialGradient(c.x, c.y, c.r * 0.25, c.x, c.y, c.r);
    g.addColorStop(0, `rgba(160, 225, 255, ${0.10 * agonia})`);
    g.addColorStop(0.75, `rgba(110, 200, 255, ${0.16 * agonia})`);
    g.addColorStop(1, `rgba(200, 240, 255, ${alpha})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();

    // Borde, mas brillante cuanto mas entera este
    ctx.strokeStyle = c.hitFlash > 0
      ? `rgba(255, 255, 255, ${0.9 * agonia})`
      : `rgba(150, 225, 255, ${(0.55 + 0.4 * vida) * agonia})`;
    ctx.lineWidth = 3 + c.hitFlash * 3;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.stroke();

    // Nervios hexagonales, para que se lea como escudo y no como niebla
    ctx.strokeStyle = `rgba(190, 240, 255, ${0.22 * agonia})`;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + time * 0.12;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.r, c.r * 0.34, a, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Barra de vida encima, solo si ya le han dado
    if (vida < 1) {
      const w = 84;
      const x = c.x - w / 2;
      const y = c.y - c.r - 16;
      ctx.fillStyle = 'rgba(10, 16, 34, 0.75)';
      ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = '#7fd8ff';
      ctx.fillRect(x, y, w * vida, 6);
    }

    ctx.restore();
  }
}
