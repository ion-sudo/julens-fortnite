/**
 * bullet.js
 * ---------------------------------------------------------------
 * PROYECTILES. Hay dos aspectos distintos segun el arma:
 *   'bala'  -> trazo corto y rapido (la mayoria)
 *   'rayo'  -> haz de energia del Julen, mas ancho y luminoso
 *
 * Cada proyectil avanza en linea recta, muere al agotar su ALCANCE
 * y se detiene al chocar con el terreno (salvo que atraviese).
 */

import { rarityColor } from '../data/rarities.js';
import { areAllies } from '../systems/teams.js';

/** Objetivos que puede atravesar como mucho un proyectil perforante. */
const MAX_PIERCE = 3;

/**
 * Cuanto avanza una bala como maximo antes de volver a comprobar si ha
 * chocado. Tiene que ser MENOR que lo mas fino que se pueda atravesar
 * (las paredes de un edificio miden 14 px).
 */
const PASO_MAX = 6;

export class BulletSystem {
  constructor(particles) {
    /** Cupulas del escudo burbuja activas (las pone game.js cada frame). */
    this.barreras = [];
    /** @type {Array<object>} */
    this.bullets = [];
    this.particles = particles;
    /**
     * Aviso de que una bala muere SIN darle a nadie (suelo, pared o
     * fin de alcance). Lo usa JULEN DEFENSA para que los cohetes revienten
     * tambien al chocar con el suelo. null en el resto de modos.
     */
    this.onImpact = null;
  }

  clear() { this.bullets.length = 0; }

  /**
   * Crea un proyectil.
   * @param {object} o { x, y, angle, speed, damage, range, pierce, rarity, kind, owner }
   */
  spawn(o) {
    this.bullets.push({
      x: o.x,
      y: o.y,
      vx: Math.cos(o.angle) * o.speed,
      vy: Math.sin(o.angle) * o.speed,
      angle: o.angle,
      damage: o.damage,
      range: o.range,
      traveled: 0,
      pierce: !!o.pierce,
      kind: o.kind || 'bala',
      color: rarityColor(o.rarity),
      // Quien ha disparado: ni se golpea a si mismo ni se atribuye mal la baja.
      owner: o.owner || null,
      ownerId: o.owner?.id ?? null,
      // A quien ya ha golpeado (para que un proyectil perforante
      // no dane dos veces al mismo objetivo).
      hit: new Set(),
      // Tope de objetivos que puede atravesar: sin esto, un disparo
      // perforante horizontal barria filas enteras de bots (todos
      // estan a la misma altura sobre el suelo).
      pierceLeft: o.pierce ? MAX_PIERCE : 0,
      // Efecto especial al impactar (armas de JULEN DEFENSA). Viaja con
      // la bala y se le pasa al objetivo, que decide que hacer con el.
      effect: o.effect || null,
      radius: o.radius || 0,
      exploded: false,
      dead: false,
      // ¿Nacio dentro de una cupula? Se apunta al crearla: una bala que
      // se dispara desde dentro tiene que poder moverse por dentro, y
      // solo se para al intentar SALIR.
      inShield: this._cupulaEn(o.x, o.y),
    });
  }

  /** Cupula que contiene un punto, o null. */
  _cupulaEn(x, y) {
    for (const c of this.barreras || []) {
      if ((x - c.x) ** 2 + (y - c.y) ** 2 < c.r * c.r) return c;
    }
    return null;
  }

  /**
   * @param {number} dt
   * @param {import('../world/level.js').World} world
   * @param {Array<object>} targets  objetos con .rect() y .takeDamage()
   */
  update(dt, world, targets, barreras = []) {
    /**
     * CUPULAS del escudo burbuja. Se guardan para el frame entero
     * porque _resolveHit se llama muchas veces por bala (una por trozo).
     */
    this.barreras = barreras;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];

      const stepX = b.vx * dt;
      const stepY = b.vy * dt;
      const dist = Math.hypot(stepX, stepY);

      // --- El avance se parte en trozos cortos ---
      // Una bala rapida recorre mas de 20 px por frame, y las paredes de
      // un edificio solo miden 14: moviendola de golpe y mirando el
      // punto final, la bala SALTABA la pared y salia por el otro lado.
      // Avanzando de PASO en PASO no se cuela por ningun sitio.
      const trozos = Math.max(1, Math.ceil(dist / PASO_MAX));
      let muerta = false;

      for (let k = 0; k < trozos && !muerta; k++) {
        b.x += stepX / trozos;
        b.y += stepY / trozos;
        b.traveled += dist / trozos;
        muerta = this._resolveHit(b, world, targets);
      }

      if (muerta) { this.bullets.splice(i, 1); continue; }
    }
  }

  /**
   * Comprueba la bala en su posicion actual.
   * @returns {boolean} true si hay que quitarla
   */
  _resolveHit(b, world, targets) {
    {

      // --- Fin de alcance ---
      if (b.traveled >= b.range) {
        this.onImpact?.(b);
        return true;
      }

      // --- Cupulas del escudo burbuja ---
      // Paran las balas EN LOS DOS SENTIDOS: se comprueba si la bala ha
      // CRUZADO el borde, o sea si esta dentro y antes estaba fuera (o
      // al reves). Por eso hace falta recordar dentro de cual estaba.
      for (const c of this.barreras) {
        const dentro = (b.x - c.x) ** 2 + (b.y - c.y) ** 2 < c.r * c.r;

        if (dentro && b.inShield !== c) {
          // Entrando desde fuera: la para. Salvo que naciera dentro,
          // que es el caso de abajo.
          if (b.inShield === null) {
            c.health -= b.damage;
            c.hitFlash = 1;
            this.particles.spark(b.x, b.y, '#7fd8ff', 8, 220);
            return true;
          }
        } else if (!dentro && b.inShield === c) {
          // Saliendo desde dentro: tambien la para.
          c.health -= b.damage;
          c.hitFlash = 1;
          this.particles.spark(b.x, b.y, '#7fd8ff', 8, 220);
          return true;
        }
      }

      // --- Fuera del mundo ---
      if (b.x < -100 || b.x > world.width + 100 || b.y < -400 || b.y > world.height + 100) {
        return true;
      }

      // --- Impacto contra objetivos ---
      let consumido = false;
      for (const t of targets) {
        if (t.dead || t.alive === false || b.hit.has(t)) continue;
        // Nadie se dispara a si mismo.
        if (b.ownerId != null && t.id === b.ownerId) continue;
        // Ni a un companero de equipo: en duos y escuadrones no hay
        // fuego amigo. En individual cada uno va en su propio equipo,
        // asi que esto nunca se cumple y todo sigue igual.
        if (areAllies(b.owner, t)) continue;

        const r = t.rect();
        if (b.x >= r.x && b.x <= r.x + r.w && b.y >= r.y && b.y <= r.y + r.h) {
          // La bala va como quinto dato: asi un zombi sabe si le ha dado
          // un cohete, hielo o un rayo. A los demas objetivos les sobra.
          t.takeDamage(b.damage, b.x, b.y, b.owner, b);
          this.onDamage?.(b.damage, b.owner);
          b.hit.add(t);
          this.particles.spark(b.x, b.y, b.color, 7, 260);

          if (!b.pierce) { consumido = true; break; }
          // Aunque atraviese, se acaba parando tras unos cuantos objetivos.
          b.pierceLeft--;
          if (b.pierceLeft <= 0) { consumido = true; break; }
        }
      }
      if (consumido) return true;

      // --- Impacto contra el terreno ---
      // Las plataformas finas no paran las balas (se dispara a traves).
      const punto = { x: b.x - 1, y: b.y - 1, w: 2, h: 2 };
      const golpe = world.getPlatformsNear(punto, 2).find(
        (p) => !p.oneWay &&
          b.x > p.x && b.x < p.x + p.w &&
          b.y > p.y && b.y < p.y + p.h
      );

      if (golpe) {
        // Si lo que ha parado la bala es una construccion, se lleva el dano.
        if (golpe.structure) {
          golpe.structure.takeDamage(b.damage, b.owner);
          this.particles.spark(b.x, b.y, '#c8a06a', 6, 200);
        } else {
          this.particles.spark(b.x, b.y, '#e8d8b0', 5, 190);
        }
        this.onImpact?.(b);
        return true;
      }

      return false;
    }
  }

  draw(ctx) {
    for (const b of this.bullets) {
      const largo = b.kind === 'rayo' ? 34 : 16;
      const dx = Math.cos(b.angle) * largo;
      const dy = Math.sin(b.angle) * largo;

      if (b.kind === 'rayo') {
        // Halo exterior
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(b.x - dx, b.y - dy);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Nucleo blanco
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(b.x - dx, b.y - dy);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      } else {
        // Estela
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b.x - dx, b.y - dy);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Punta (los cohetes, gordos y naranjas; el hielo, azul)
        ctx.fillStyle = b.effect === 'explosion' ? '#ff8a3d' : b.effect === 'hielo' ? '#bff1ff' : '#fff6c8';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.effect === 'explosion' ? 4.5 : 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.lineWidth = 1;
  }
}
