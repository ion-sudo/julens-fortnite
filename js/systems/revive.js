/**
 * revive.js
 * ---------------------------------------------------------------
 * ABATIDOS Y REANIMACION, como en los duos y escuadrones de Fortnite.
 *
 * Con companeros vivos, quedarse a cero de vida NO te mata: te deja
 * ABATIDO en el suelo. Arrastrandote, sin poder disparar ni construir,
 * desangrandote poco a poco y esperando a que alguien te levante.
 *
 * Las reglas:
 *
 *   - solo se cae abatido si TE QUEDA algun companero en pie. Si eres el
 *     ultimo del equipo, mueres del tiron (si no, seria inmortalidad:
 *     nadie podria levantarte nunca)
 *   - mientras estas abatido tienes una vida aparte (`downHealth`) que
 *     baja SOLA con el tiempo y baja MAS RAPIDO si te rematan
 *   - un companero te levanta acercandose y MANTENIENDO LA E, y al
 *     soltarla la barra se vacia poco a poco
 *   - al levantarte vuelves con poca vida: sales del apuro, pero sales
 *     tocado
 *
 * Vale igual para el jugador y para los bots: los dos usan los mismos
 * campos, asi que tus aliados te reaniman a ti y tu a ellos.
 */

import { areAllies, teammatesOf } from './teams.js';

/** Vida "de abatido": lo que aguantas en el suelo. */
export const DOWN_HEALTH = 90;
/** Lo que te desangras por segundo si nadie te levanta. */
const BLEED = 3.4;
/** Cuanto cuenta cada punto de dano recibido estando abatido. */
const REMATE = 0.55;
/**
 * Segundos de E mantenida para levantar a alguien.
 *
 * Cuatro se hacian eternos en mitad de un tiroteo (quien reanima esta
 * quieto y vendido) y casi ninguna llegaba a terminar. Con tres sigue
 * siendo una decision arriesgada, pero se completa.
 */
export const REVIVE_TIME = 3;
/**
 * Distancia a la que se puede reanimar, medida DE PIES A PIES.
 *
 * De centro a centro no valia: un abatido esta tumbado y su cuerpo
 * queda mas bajo, asi que estando justo a su lado la cuenta daba 85 px
 * y no llegaba por tres. Los pies son lo que de verdad dice si estas
 * encima de alguien, y es la misma medida que usan los cofres.
 */
export const REVIVE_RANGE = 95;
/** Con cuanta vida te levantas. */
export const REVIVE_HEALTH = 35;
/** Lo rapido que se vacia la barra al dejar de reanimar. */
const DECAY = 0.5;
/**
 * Margen antes de empezar a vaciarla.
 *
 * No basta con un booleano "me estan reanimando" puesto cada frame: los
 * bots lejos del jugador se simulan UNA VEZ DE CADA TRES para ahorrar
 * CPU, asi que en los otros dos frames nadie tocaba la barra y se
 * vaciaba mas rapido de lo que se llenaba — y no se levantaba nadie en
 * toda la partida. Con un margen de tiempo eso deja de importar.
 */
const GRACIA = 0.4;

export class ReviveManager {
  /**
   * @param {object} deps { particles }
   */
  constructor(deps) {
    this.particles = deps.particles;

    /** Aviso para la pantalla (lo enchufa game.js). */
    this.onMessage = null;
    /** Aviso de reanimacion terminada. */
    this.onRevived = null;

    /** Si el modo tiene equipos (en individual esto no se usa). */
    this.enabled = false;
    /** A quien esta reanimando el jugador ahora mismo, o null. */
    this.target = null;
    this.time = 0;
  }

  reset(enabled = false) {
    this.enabled = enabled;
    this.target = null;
    /** Reloj propio, para saber cuando se toco cada barra por ultima vez. */
    this.time = 0;
  }

  /* =============================================================
     UPDATE
     ============================================================= */

  /**
   * @param {number} dt
   * @param {object} player
   * @param {Array} entities  jugador + bots vivos
   * @param {import('../core/input.js').Input} input
   */
  update(dt, player, entities, input) {
    if (!this.enabled) return;
    this.time += dt;

    // Se guarda para saber a quien han levantado (ver `raise`). Hace
    // falta comparar CONTRA EL OBJETO: `Bot extends Player`, asi que
    // cualquier marca del tipo `isPlayer` la heredan tambien los bots.
    this.player = player;

    // --- Quien puede caer abatido y quien no ---
    // Se recalcula cada frame: en cuanto te quedas solo de tu equipo,
    // dejas de poder quedarte en el suelo y el siguiente tiro te mata.
    for (const e of entities) {
      e.canBeDowned = teammatesOf(e, entities).some((t) => !t.downed);
    }

    // --- Los abatidos se desangran ---
    for (const e of entities) {
      if (!e.downed) continue;

      e.downHealth -= BLEED * dt;
      if (e.downHealth <= 0) this.finish(e, e.downedBy);

      // La barra se vacia sola cuando lleva un rato sin que nadie la
      // toque (ver GRACIA).
      const abandonado = this.time - (e.reviveTouch ?? -99) > GRACIA;
      e.beingRevived = !abandonado;
      if (abandonado) {
        e.reviveProgress = Math.max(0, e.reviveProgress - DECAY * dt * (1 / REVIVE_TIME));
      }
    }

    // --- El jugador reanimando ---
    this._playerRevive(dt, player, entities, input);
  }

  /** La E mantenida cerca de un companero abatido. */
  _playerRevive(dt, player, entities, input) {
    this.target = null;
    if (player.downed || !player.alive) return;

    const caido = this.nearestDown(player, entities);
    if (!caido) return;

    this.target = caido;

    // `isDown('pickup')` es la E MANTENIDA, no el pulsarla: reanimar es
    // aguantar, no dar un toque. (La E de un toque la consumen los
    // cofres y el botin, que van despues.)
    if (!input.isDown('pickup')) return;

    this.progress(caido, player, dt);
  }

  /**
   * El companero abatido mas cercano.
   *
   * @param {number} range  hasta donde mirar. El jugador usa el alcance
   *   de reanimar (tiene que estar AL LADO); los bots aliados usan uno
   *   mucho mayor, porque lo que quieren saber es si les toca ir.
   * @returns {object|null}
   */
  nearestDown(quien, entities, range = REVIVE_RANGE) {
    let mejor = null;
    let mejorD = range;

    for (const e of entities) {
      if (!e.downed || e === quien) continue;
      if (!areAllies(quien, e)) continue;

      const d = distanciaPies(quien, e);
      if (d < mejorD) { mejorD = d; mejor = e; }
    }
    return mejor;
  }

  /** ¿Esta `quien` lo bastante cerca de `caido` para levantarlo? */
  inRange(quien, caido) {
    return distanciaPies(quien, caido) < REVIVE_RANGE;
  }

  /**
   * Avanza la reanimacion de `caido` a manos de `quien`.
   * Lo llaman el jugador (con la E) y los bots aliados desde su IA.
   */
  progress(caido, quien, dt) {
    if (!caido.downed) return false;

    caido.beingRevived = true;
    caido.reviveTouch = this.time;
    caido.reviveProgress = Math.min(1, caido.reviveProgress + dt / REVIVE_TIME);

    if (Math.random() < 0.3) {
      this.particles.spark(
        caido.x + caido.w / 2, caido.y + caido.h * 0.4, '#5fd14a', 2, 90
      );
    }

    if (caido.reviveProgress >= 1) {
      this.raise(caido, quien);
      return true;
    }
    return false;
  }

  /* =============================================================
     CAER Y LEVANTARSE
     ============================================================= */

  /** Deja a alguien ABATIDO (lo llama su propio takeDamage). */
  static down(quien, source) {
    quien.downed = true;
    quien.downedBy = source || null;
    quien.downHealth = DOWN_HEALTH;
    quien.maxDownHealth = DOWN_HEALTH;
    quien.reviveProgress = 0;
    quien.beingRevived = false;
    quien.reviveTouch = -99;

    // Se queda tirado: ni construyendo, ni curandose, ni corriendo.
    quien.health = 0;
    quien.shield = 0;
    quien.vx = 0;
    quien.buildMode = false;
    quien.aiming = false;
    quien.crouching = false;
    quien.cancelAction?.();
  }

  /** Alguien levanta a un abatido. */
  raise(caido, quien) {
    caido.downed = false;
    caido.reviveProgress = 0;
    caido.beingRevived = false;
    caido.reviveTouch = -99;
    caido.health = REVIVE_HEALTH;
    caido.downedBy = null;

    this.particles.spark(caido.x + caido.w / 2, caido.y + caido.h / 2, '#5fd14a', 18, 300);
    this.onRevived?.(caido, quien);

    const nombre = caido.name || 'tu companero';
    if (caido === this.player) this.onMessage?.('¡Te han levantado!', 'uncommon');
    else if (quien === this.player) this.onMessage?.(`Has levantado a ${nombre}`, 'uncommon');
  }

  /** Se acabo: el abatido muere del todo. */
  finish(caido, source) {
    caido.downed = false;
    caido.alive = false;
    caido.health = 0;
    caido.killedBy = source || caido.downedBy || null;
    caido.lastAttacker = caido.killedBy || caido.lastAttacker;
  }

  /**
   * Dano recibido ESTANDO abatido: no mata de golpe, acelera el
   * desangrado. Lo llama el takeDamage de cada uno.
   */
  static hurtDowned(quien, amount, source) {
    quien.downHealth -= amount * REMATE;
    if (source) quien.downedBy = source;
    quien.hurtFlash = 0.25;
  }
}

/**
 * Distancia entre los PIES de dos personajes.
 *
 * Es la medida buena para "estoy encima de esto": no la afecta que uno
 * este de pie y el otro tumbado, ni que tengan alturas distintas.
 */
function distanciaPies(a, b) {
  return Math.hypot(
    (a.x + a.w / 2) - (b.x + b.w / 2),
    (a.y + a.h) - (b.y + b.h)
  );
}
