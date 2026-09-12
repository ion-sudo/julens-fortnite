/**
 * blitz.js (sistema)
 * ---------------------------------------------------------------
 * EL NIVEL BLITZ y los POTENCIADORES del modo Julen Blitz.
 *
 * En el Blitz todos empiezan con la misma arma comun, asi que la unica
 * forma de mejorar es JUGAR: cada baja y cada segundo aguantando
 * mientras la tormenta se cierra dan XP de nivel Blitz. Al subir, se
 * recibe automaticamente un arma mejor (rara, epica, legendaria,
 * mitica) y un potenciador, que se acumula con los que ya tengas.
 *
 * Los potenciadores no viven aqui: se aplican sobre `player.boosts`,
 * unos multiplicadores del propio jugador que leen el movimiento y el
 * combate. Asi ni el que dispara ni el que corre saben que existe este
 * modo (ver entities/player.js).
 *
 * Este sistema SOLO se monta si el modo lo pide (`rules.blitz`). En el
 * Julen Royale no existe, y nada de lo que hay aqui se ejecuta.
 */

import {
  BLITZ_MAX_LEVEL, BLITZ_XP_LEVELS, BLITZ_XP_KILL, BLITZ_XP_PER_SECOND,
  BLITZ_XP_SURVIVE_STEP, BLITZ_LEVEL_RARITY, BOOSTS,
} from '../data/blitz.js';
import { makeWeapon, randomWeaponDef } from '../data/loot.js';
import { RARITIES } from '../data/rarities.js';
import { WeaponDrop } from '../entities/weaponDrop.js';

/** Cada cuantos segundos de tormenta se da el extra por sobrevivir. */
const PASO_SUPERVIVENCIA = 20;

export class BlitzManager {
  /**
   * @param {object} deps { player, inventory, particles, zone, world, loot }
   */
  constructor(deps) {
    this.player = deps.player;
    this.inventory = deps.inventory;
    this.particles = deps.particles;
    this.zone = deps.zone;
    this.world = deps.world;
    this.loot = deps.loot;

    /** Aviso para la pantalla (lo enchufa game.js). */
    this.onMessage = null;

    this.reset();
  }

  reset() {
    /** Nivel Blitz actual (empieza en 1). */
    this.level = 1;
    /** XP acumulada de esta partida. */
    this.xp = 0;
    /** Potenciadores cogidos: [{ def, count }], en orden de llegada. */
    this.boosts = [];
    /** Cronometro del extra por aguantar dentro de la tormenta. */
    this._survive = 0;
    /** Fogonazo del HUD al subir de nivel. */
    this.flash = 0;

    /**
     * CARTELON de subida de nivel: { nivel, arma, rareza, life }.
     * Lo pinta ui/blitzHud.js en grande, en medio de la pantalla.
     */
    this.banner = null;

    /** Cajas cayendo del cielo con el arma del nivel. */
    this.drops = [];

    // Los multiplicadores del jugador ya los reinicia player.reset().
  }

  /* =============================================================
     CONSULTAS PARA EL HUD
     ============================================================= */

  get maxLevel() { return BLITZ_MAX_LEVEL; }

  /** XP acumulada con la que empieza el nivel actual. */
  get xpNivel() { return BLITZ_XP_LEVELS[this.level - 1] ?? 0; }

  /** XP acumulada que hace falta para el siguiente (null si es el tope). */
  get xpSiguiente() {
    return this.level >= BLITZ_MAX_LEVEL ? null : BLITZ_XP_LEVELS[this.level];
  }

  /** Progreso hacia el siguiente nivel, de 0 a 1. */
  get progress() {
    const sig = this.xpSiguiente;
    if (sig === null) return 1;
    const base = this.xpNivel;
    return Math.max(0, Math.min(1, (this.xp - base) / (sig - base)));
  }

  /* =============================================================
     GANAR XP
     ============================================================= */

  update(dt) {
    this.flash = Math.max(0, this.flash - dt);

    // --- El cartelon de NIVEL X ---
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }

    // --- Las cajas que caen del cielo ---
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const caja = this.drops[i];
      const soltado = caja.update(dt);

      if (soltado) {
        // El arma sale de la caja igual que el botin de un cofre: en
        // arco y con un respiro antes de poder cogerla.
        this.loot?.dropItemAt(soltado, caja.x, caja.y - 10, 0.35);
        this.particles.spark(caja.x, caja.y, caja.color, 22, 340);
      }
      if (caja.done) this.drops.splice(i, 1);
    }

    // Solo se puntua por aguantar cuando la tormenta ya aprieta: los
    // primeros segundos, mientras todos caen, no cuentan.
    if (!this.player.alive) return;
    if (!this.zone || this.zone.progress <= 0) return;

    this.addXp(BLITZ_XP_PER_SECOND * dt);

    // Y cada cierto rato, un pellizco extra por seguir vivo.
    this._survive += dt;
    if (this._survive >= PASO_SUPERVIVENCIA) {
      this._survive -= PASO_SUPERVIVENCIA;
      this.addXp(BLITZ_XP_SURVIVE_STEP);
      this.onMessage?.('Sigues vivo: +XP Blitz', 'uncommon');
    }
  }

  /** Una baja del jugador. */
  onKill() {
    this.addXp(BLITZ_XP_KILL);

    // Potenciador "Sanguijuela": cada baja devuelve vida.
    const robo = this.player.boosts.lifesteal;
    if (robo > 0 && this.player.alive) {
      const antes = this.player.health;
      this.player.health = Math.min(this.player.maxHealth, antes + robo);
      const curado = Math.round(this.player.health - antes);
      if (curado > 0) {
        this.particles.damageNumber(
          this.player.x + this.player.w / 2,
          this.player.y,
          `+${curado}`, '#5fd14a'
        );
      }
    }
  }

  /**
   * Suma XP y sube tantos niveles como toque.
   * Se hace en bucle porque una baja puede dar para dos niveles seguidos.
   */
  addXp(cantidad) {
    if (this.level >= BLITZ_MAX_LEVEL) return;
    this.xp += cantidad;

    while (this.level < BLITZ_MAX_LEVEL && this.xp >= BLITZ_XP_LEVELS[this.level]) {
      this.level++;
      this._levelUp();
    }
  }

  /* =============================================================
     SUBIR DE NIVEL
     ============================================================= */

  _levelUp() {
    this.flash = 1.6;

    const arma = this._tirarArma();
    const boost = this._darBoost();

    this.particles.spark(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2,
      '#ffd23f', 26, 380
    );

    // EL CARTELON: "NIVEL 2" en grande y debajo lo que cae. Es lo que
    // convierte subir de nivel en un momento y no en una linea de
    // texto que se pierde entre los avisos de siempre.
    this.banner = {
      nivel: this.level,
      arma: arma ? arma.name : null,
      rareza: arma ? arma.rarity : 'mythic',
      boost: boost ? boost.name : null,
      life: 3.4,
      max: 3.4,
    };
  }

  /**
   * Manda el arma del nivel EN UNA CAJA DESDE EL CIELO, encima del
   * jugador, en vez de metersela en el inventario.
   *
   * Asi subir de nivel se ve: el paracaidas baja mientras peleas, lo
   * ven los demas y tienes que decidir si vas a por el ahora o luego.
   */
  _tirarArma() {
    const rareza = BLITZ_LEVEL_RARITY[this.level - 1];
    if (!rareza) return null;

    // Se sortea entre las armas del modo; a este nivel ya entran el
    // francotirador y el minigun, que en la salida estaban vetados.
    const def = randomWeaponDef();
    // Una arma no puede salir por debajo de su rareza minima.
    const arma = makeWeapon(def, this._mejorRareza(def.minRarity, rareza));

    const cx = this.player.x + this.player.w / 2;
    const suelo = this._sueloDebajo(cx);
    this.drops.push(new WeaponDrop(cx, suelo, arma, RARITIES[arma.rarity].color));

    // Y municion ya, que si no llegas a la caja sin balas no sirve.
    this.player.addAmmo(def.ammo, 90);
    return arma;
  }

  /**
   * Donde tiene que posarse la caja: la PRIMERA superficie que hay bajo
   * los pies del jugador.
   *
   * No vale `groundYAtFast`, que devuelve el suelo del terreno y se
   * salta los edificios: subiendo al tejado de una nave, la caja
   * atravesaba el tejado y aterrizaba en la calle. Aqui se miran todas
   * las plataformas de esa columna, tejados incluidos.
   *
   * Y si lo unico que hay debajo es agua, se prueba a los lados: una
   * caja que cae al mar es un premio perdido.
   */
  _sueloDebajo(x) {
    const w = this.world;
    const pies = this.player.y + this.player.h;
    if (!w) return pies;

    for (const dx of [0, -120, 120, -260, 260, -420, 420]) {
      const y = this._superficieEn(x + dx, pies);
      if (y !== null && y < w.waterY) return y;
    }
    return this._superficieEn(x, pies) ?? w.groundYAtFast(x);
  }

  /** Techo de la plataforma mas alta que hay en esa columna, desde `desdeY`. */
  _superficieEn(x, desdeY) {
    const caja = { x: x - 2, y: desdeY - 6, w: 4, h: this.world.height - desdeY };
    let mejor = null;

    for (const p of this.world.getPlatformsNear(caja, 0)) {
      if (p.x > x || p.x + p.w < x) continue;
      if (p.y < desdeY - 6) continue;           // por encima de los pies: no cuenta
      if (mejor === null || p.y < mejor) mejor = p.y;
    }
    return mejor;
  }

  /** La mas alta de dos rarezas. */
  _mejorRareza(a, b) {
    const orden = Object.keys(RARITIES);
    return orden.indexOf(a) > orden.indexOf(b) ? a : b;
  }

  /**
   * Da un potenciador al azar y lo aplica ya.
   *
   * Se prefiere uno que NO tengas todavia, para que la primera vuelta
   * sea variada; a partir de ahi ya se repiten y se acumulan.
   */
  _darBoost(rng = Math.random) {
    const nuevos = BOOSTS.filter((b) => !this.boosts.some((x) => x.def.id === b.id));
    const bolsa = nuevos.length > 0 ? nuevos : BOOSTS;
    const def = bolsa[Math.floor(rng() * bolsa.length)];

    return this.grantBoost(def);
  }

  /**
   * Aplica un potenciador concreto y lo apunta en la lista.
   * Lo usan tanto la subida de nivel como los cofres dorados.
   */
  grantBoost(def) {
    def.apply(this.player);

    const ya = this.boosts.find((x) => x.def.id === def.id);
    if (ya) ya.count++;
    else this.boosts.push({ def, count: 1 });

    return def;
  }

  /** Las cajas que estan cayendo (las pinta game.js con el resto). */
  draw(ctx, camera, time) {
    for (const caja of this.drops) {
      if (!camera.isVisible(caja.x - 60, caja.y - 90, 120, caja.groundY - caja.y + 100)) continue;
      caja.draw(ctx, time);
    }
  }

  /** Un cofre dorado: un potenciador al azar, sin subir de nivel. */
  onGoldenChest(rng = Math.random) {
    const def = this._darBoost(rng);
    this.onMessage?.(`Bendicion: ${def.name} — ${def.desc}`, 'mythic');

    this.particles.spark(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2,
      def.color, 20, 320
    );
    return def;
  }
}
