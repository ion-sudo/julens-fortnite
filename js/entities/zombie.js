/**
 * zombie.js
 * ---------------------------------------------------------------
 * UN ZOMBI de JULEN DEFENSA.
 *
 * Tiene la misma "cara" que cualquier objetivo del juego: `rect()` y
 * `takeDamage()`. Solo con eso ya le dan las balas, el pico y las
 * granadas, sin tocar una linea del combate. Tambien tiene `x/y/w/h`
 * sueltos y `alive`, que es lo que miran las explosiones.
 *
 * Camina en linea recta HACIA LA TORRE, que esta en el centro del
 * camino. Por eso lleva un `dir`: -1 si viene del portal de la derecha
 * (anda hacia la izquierda) y +1 si viene del de la izquierda. Todo lo
 * que tiene lado -a donde mira, por donde le entra el escudo, hacia
 * donde sale despedido- se saca de ahi.
 *
 * Se para a golpear lo primero que se encuentre: al jugador, una pared
 * que hayas construido, una torre o la propia base. Que tiene delante
 * lo decide el modo (`mode.objetivoDelante`), porque es quien lo conoce
 * todo.
 *
 * ESTADOS que le pueden poner las torres, las trampas y las armas:
 *   lento      ralentizado (hielo)
 *   congelado  quieto del todo (trampa congelante)
 *   quema      pierde vida poco a poco (fuego)
 *   enAire     volando por un lanzador; al caer se hace dano
 *
 * Y dos tipos con reglas propias (ver data/defense.js):
 *   vuela      va por el aire: ni trampas de suelo ni paredes le paran
 *   explota    no golpea: revienta contra lo que tiene delante
 *   escudo     chapa por delante: para casi todo lo que le llega de frente
 */

import { drawZombie } from './defenseSprites.js';

/** Gravedad de los zombis lanzados por los aires. */
const GRAVEDAD = 1900;
/** Lo que dura la animacion de morir. */
const MUERTE = 0.6;

export class Zombie {
  /**
   * @param {object} def    entrada de ZOMBIES (data/defense.js)
   * @param {number} x      centro, donde aparece
   * @param {number} laneY  altura del suelo del camino
   * @param {object} mode   el modo JULEN DEFENSA
   * @param {object} mult   { vida, dano } de la oleada
   * @param {number} dir     -1 viene de la derecha, +1 de la izquierda
   */
  constructor(def, x, laneY, mode, mult = {}, dir = -1) {
    this.def = def;
    this.mode = mode;
    /** Hacia donde anda: -1 izquierda, +1 derecha. */
    this.dir = dir < 0 ? -1 : 1;

    this.w = def.w;
    this.h = def.h;
    this.laneY = laneY;
    // Como el jugador: x/y es la esquina de arriba a la izquierda.
    this.x = x - def.w / 2;
    // Los voladores empiezan ya a su altura.
    this.y = laneY - def.h - (def.vuela ? def.altura : 0);
    this.vx = 0;
    this.vy = 0;

    this.maxHealth = Math.round(def.vida * (mult.vida || 1));
    this.health = this.maxHealth;
    /** Chapa frontal: aguanta por su cuenta hasta que se rompe. */
    this.escudoMax = Math.round((def.escudo || 0) * (mult.vida || 1));
    this.escudo = this.escudoMax;
    this.dano = def.dano * (mult.dano || 1);

    this.dead = false;
    this.muerte = 0;
    this.hitFlash = 0;

    // --- Estados ---
    this.lento = 0;
    this.lentoFactor = 1;
    this.congelado = 0;
    this.quema = 0;
    this.quemaDps = 0;
    this.quemaFuente = null;
    this._acumQuema = 0;
    this.enAire = false;
    this.caidaDano = 0;
    this.caidaFuente = null;

    /** Espera entre golpe y golpe. */
    this.golpeT = 0;
    /** Brazos adelante al golpear (solo para el dibujo). */
    this.atacando = 0;
    /** Reloj de la animacion, desfasado para que no anden todos a la vez. */
    this.fase = Math.random() * 10;
  }

  /* =============================================================
     LA CARA DE OBJETIVO
     ============================================================= */

  /** Donde pisa: lo usa el render para saber si esta en pantalla. */
  get groundY() { return this.laneY; }
  get alive() { return !this.dead; }
  get cx() { return this.x + this.w / 2; }

  rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /**
   * Recibir un golpe.
   * @param {object} [bala]  el proyectil, si lo ha habido: trae su
   *   efecto especial (explosion, hielo, cadena, fuego)
   */
  takeDamage(amount, hx, hy, source = null, bala = null) {
    if (this.dead || !Number.isFinite(amount) || amount <= 0) return;

    // Un cohete no hace dano directo: revienta, y la explosion le da a
    // este y a todos los de alrededor. Se marca la bala para que no
    // explote dos veces si toca a dos zombis.
    if (bala?.effect === 'explosion') {
      if (bala.exploded) return;
      bala.exploded = true;
      this.mode.explosion(hx ?? this.cx, hy ?? this.y + this.h / 2, bala.radius || 110, amount, source);
      return;
    }

    this.recibir(amount, hx, hy, source);
    if (this.dead) return;

    if (bala?.effect === 'hielo') this.ralentizar(0.45, 2.2);
    else if (bala?.effect === 'fuego') this.quemar(12, 2.5, source);
    else if (bala?.effect === 'cadena') this.mode.cadena(this, amount * 0.6, source);
    else if (bala?.effect === 'aturde') this.congelar(0.6);
  }

  /** Dano a pelo, sin efectos. `silencioso` = sin numerito flotando. */
  recibir(amount, hx, hy, source, silencioso = false) {
    if (this.dead || amount <= 0) return;

    // ESCUDO: lo lleva por delante, o sea del lado hacia el que anda, y
    // solo le protege de lo que le llega desde ahi (tus disparos). Lo
    // que le pilla desde abajo o desde atras (trampas, explosiones) le
    // entra entero.
    const porDelante = this.dir < 0
      ? hx < this.cx - this.w * 0.1
      : hx > this.cx + this.w * 0.1;
    if (this.escudo > 0 && hx != null && porDelante) {
      const parado = Math.min(this.escudo, amount * 0.75);
      this.escudo -= parado;
      amount -= parado;
      this.mode.particles.spark(this.x, this.y + this.h * 0.4, '#c8d0dc', 3, 130);
      if (amount < 1) return;
    }

    this.health -= amount;
    this.hitFlash = 0.12;
    if (!silencioso) {
      this.mode.particles.damageNumber(hx ?? this.cx, hy ?? this.y, Math.round(amount), '#ffd23f');
    }

    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.muerte = MUERTE;
      this.mode.onZombieMuerto(this, source);
    }
  }

  /* =============================================================
     ESTADOS
     ============================================================= */

  ralentizar(factor, segundos) {
    this.lento = Math.max(this.lento, segundos);
    this.lentoFactor = Math.min(this.lentoFactor, factor);
  }

  congelar(segundos) {
    // A un jefe no se le congela del todo: seria demasiado facil.
    this.congelado = Math.max(this.congelado, this.def.jefe ? segundos * 0.3 : segundos);
  }

  quemar(dps, segundos, fuente) {
    this.quema = Math.max(this.quema, segundos);
    this.quemaDps = Math.max(this.quemaDps, dps);
    this.quemaFuente = fuente;
  }

  /** Por los aires, hacia atras. Al jefe casi ni lo mueve. */
  lanzar(fuerza, empujeX, danoCaida, fuente) {
    // A uno que ya vuela no hay por donde lanzarlo.
    if (this.def.vuela) return;
    const f = this.def.jefe ? 0.3 : 1;
    this.vy = -fuerza * f;
    // Hacia ATRAS: al reves de como anda, o sea de vuelta a su portal.
    this.vx = -this.dir * empujeX * f;
    this.enAire = true;
    this.caidaDano = danoCaida;
    this.caidaFuente = fuente;
  }

  /* =============================================================
     UPDATE (lo llama el juego, como a cualquier objetivo)
     ============================================================= */

  update(dt) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.fase += dt;

    if (this.dead) {
      this.muerte -= dt;
      return;
    }

    this._actualizarQuemadura(dt);
    if (this.dead) return;

    this.lento = Math.max(0, this.lento - dt);
    if (this.lento <= 0) this.lentoFactor = 1;
    this.congelado = Math.max(0, this.congelado - dt);
    this.golpeT = Math.max(0, this.golpeT - dt);
    this.atacando = Math.max(0, this.atacando - dt);

    // Los voladores van por su cuenta (ver _volarBajo).
    if (this.def.vuela) {
      this._volarBajo(dt);
      return;
    }

    // Una granada de choque tambien puede mandarlo por los aires.
    if (!this.enAire && this.vy < -150) {
      this.enAire = true;
      this.caidaDano = 20;
    }

    if (this.enAire) {
      this._volar(dt);
      return;
    }

    // Empujon lateral (granadas): se frena solo.
    if (Math.abs(this.vx) > 1) {
      this.x += this.vx * dt;
      this.vx *= Math.max(0, 1 - dt * 6);
    }

    if (this.congelado > 0) return;

    // ¿Algo delante? Se para y le pega.
    const objetivo = this.mode.objetivoDelante(this);
    if (objetivo) {
      // El zombi bomba no golpea: revienta contra lo que tenga delante.
      if (this.def.explota) {
        this.mode.detonar(this, objetivo);
        return;
      }
      if (this.golpeT <= 0) {
        this.golpeT = this.def.ritmo;
        this.atacando = 0.25;
        objetivo.golpear(this.dano, this);
      }
      return;
    }

    const vel = this.def.velocidad * (this.lento > 0 ? this.lentoFactor : 1);
    this.x += this.dir * vel * dt;
    this.mode.limitarCarril(this);
  }

  /**
   * VOLADOR: avanza a su altura con un vaiven suave. Solo se para al
   * llegar a la torre: las trampas del suelo y las paredes no le tocan.
   */
  _volarBajo(dt) {
    if (Math.abs(this.vx) > 1) {
      this.x += this.vx * dt;
      this.vx *= Math.max(0, 1 - dt * 6);
    }
    this.y = this.laneY - this.h - this.def.altura + Math.sin(this.fase * 3) * 8;
    if (this.congelado > 0) return;

    const objetivo = this.mode.objetivoDelante(this);
    if (objetivo) {
      if (this.golpeT <= 0) {
        this.golpeT = this.def.ritmo;
        this.atacando = 0.25;
        objetivo.golpear(this.dano, this);
      }
      return;
    }

    const vel = this.def.velocidad * (this.lento > 0 ? this.lentoFactor : 1);
    this.x += this.dir * vel * dt;
    this.mode.limitarCarril(this);
  }

  _actualizarQuemadura(dt) {
    if (this.quema <= 0) return;

    this.quema -= dt;
    // Se acumula y se cobra de punto en punto: si no, con un dano tan
    // pequeno por frame no bajaria nunca de un numero entero.
    this._acumQuema += this.quemaDps * dt;
    if (this._acumQuema >= 1) {
      const d = Math.floor(this._acumQuema);
      this._acumQuema -= d;
      this.recibir(d, this.cx, this.y + 10, this.quemaFuente, true);
    }
    if (Math.random() < dt * 10) {
      this.mode.particles.spark(this.cx, this.y + this.h * 0.4, '#ff8a3d', 1, 90);
    }
    if (this.quema <= 0) this.quemaDps = 0;
  }

  _volar(dt) {
    this.vy += GRAVEDAD * dt;
    this.y += this.vy * dt;
    this.x += this.vx * dt;

    if (this.y + this.h >= this.laneY) {
      this.y = this.laneY - this.h;
      this.enAire = false;
      this.vx = 0;
      this.vy = 0;
      this.mode.particles.puff(this.cx, this.laneY, 'rgba(160, 130, 90, 0.6)', 6);
      if (this.caidaDano > 0) this.recibir(this.caidaDano, this.cx, this.laneY - 20, this.caidaFuente);
    }
    this.mode.limitarCarril(this);
  }

  /* =============================================================
     DIBUJO (tambien lo llama el juego)
     ============================================================= */

  draw(ctx, time) {
    const alpha = this.dead ? Math.max(0, this.muerte / MUERTE) : 1;
    if (alpha <= 0) return;
    drawZombie(ctx, this, time, alpha);
  }
}
