/**
 * reload.js
 * ---------------------------------------------------------------
 * REAPARICION DE ESCUADRON, el corazon del modo JULEN RECARGA
 * (el "Recarga" / Reload de Fortnite).
 *
 * La idea, en una frase: que te eliminen no te saca de la partida
 * MIENTRAS TE QUEDE UN COMPANERO VIVO.
 *
 * Las reglas:
 *
 *   - al morir de verdad (no abatido: MUERTO), si queda alguien de tu
 *     escuadron en pie, empieza una CUENTA ATRAS de 30 segundos
 *   - al llegar a cero, reapareces al lado de un companero, con la vida
 *     llena pero SIN NADA encima de lo que llevabas
 *   - si mientras esperas cae el ultimo companero, se acabo: el
 *     escuadron entero queda eliminado de verdad
 *   - si os eliminan a todos a la vez, igual: nadie sostiene el respawn
 *
 * Esto convive con systems/revive.js sin pisarse, porque son dos
 * escalones distintos de la misma caida:
 *
 *   cero de vida  -> ABATIDO   (revive.js) mientras haya alguien en pie
 *   te rematan    -> MUERTO    (aqui) y empieza la cuenta atras
 *
 * Quien decide si mueres o caes abatido sigue siendo revive.js; este
 * modulo solo mira a los MUERTOS.
 *
 * Vale igual para el jugador y para los bots: los dos son objetos con
 * `alive`, `team` y una posicion, que es todo lo que se necesita.
 */

import { areAllies } from './teams.js';
import { playReward } from '../core/audio.js';

/** Lo que tarda en volver alguien caido. */
export const RESPAWN_TIME = 30;

/** Con cuanta vida vuelves. */
const RESPAWN_HEALTH = 100;

/** A que distancia del companero apareces (a un lado u otro). */
const RESPAWN_OFFSET = 70;

/** Altura desde la que se cae al reaparecer, para que se vea llegar. */
const RESPAWN_DROP = 90;

export class ReloadManager {
  /**
   * @param {object} deps { world, particles }
   */
  constructor(deps) {
    this.world = deps.world;
    this.particles = deps.particles;

    /** Solo se enciende en los modos que lo piden (Julen Recarga). */
    this.enabled = false;

    /** Aviso para la pantalla; lo enchufa game.js. */
    this.onMessage = null;
    /** Aviso de que alguien ha vuelto (para efectos y sonido). */
    this.onRespawn = null;
    /** Aviso de escuadron eliminado del todo. */
    this.onTeamOut = null;

    /** El jugador, para saber a quien avisar por pantalla. */
    this.player = null;

    /**
     * Zona segura. Hace falta para no devolver a nadie fuera de ella:
     * reaparecer directamente en la tormenta seria una broma pesada.
     */
    this.zone = null;

    /** Equipos ya eliminados del todo, para no avisar dos veces. */
    this.equiposFuera = new Set();

    /**
     * TODOS los participantes de la partida, vivos y muertos.
     *
     * Se guarda una sola vez al empezar porque este modulo trabaja
     * justo con los que las demas listas del juego descartan: la de
     * `match.entities` solo trae a los vivos, y un muerto esperando a
     * volver no esta en ninguna.
     */
    this.todos = [];
  }

  /* =============================================================
     ARRANQUE
     ============================================================= */

  /**
   * @param {boolean} enabled  si el modo tiene reaparicion
   * @param {object} [opciones] { zone, todos }
   */
  reset(enabled, opciones = {}) {
    this.enabled = !!enabled;
    this.zone = opciones.zone || null;
    this.todos = opciones.todos || [];
    this.equiposFuera.clear();

    for (const e of this.todos) ReloadManager.limpiar(e);
  }

  /** Deja limpios los campos de reaparicion de alguien. */
  static limpiar(quien) {
    quien.respawnTimer = null;    // segundos que faltan, o null
    quien.respawnOut = false;     // eliminado DE VERDAD
  }

  /* =============================================================
     CONSULTAS
     ============================================================= */

  /** ¿Esta esperando a volver? */
  isPending(quien) {
    return this.enabled && quien?.respawnTimer != null && !quien.alive;
  }

  /** Segundos que le faltan (o null si no esta esperando). */
  timeLeft(quien) {
    return this.isPending(quien) ? quien.respawnTimer : null;
  }

  /**
   * ¿Va a volver este caido, o esta ya esperando?
   *
   * Es LA pregunta del modo, y no vale con mirar si tiene la cuenta
   * atras puesta: entre que alguien muere y que este modulo se entera
   * pasan varios pasos del frame, y en ese hueco el final de partida ya
   * habia declarado la derrota. Asi que aqui se responde tambien por
   * los que acaban de caer y todavia no tienen cuenta atras.
   */
  sostenido(quien) {
    if (!this.enabled || !quien || quien.respawnOut) return false;
    if (quien.alive) return false;
    if (quien.respawnTimer != null) return true;
    return this._tieneApoyo(quien, this.todos);
  }

  /**
   * ¿Sigue este personaje en la partida?
   * Es lo que tienen que preguntar el marcador y el final de partida:
   * un muerto que va a volver NO esta fuera todavia.
   */
  inPlay(quien) {
    return !!quien && (quien.alive || this.sostenido(quien));
  }

  /**
   * Le quita segundos a la cuenta atras de todo el escuadron de
   * `quien`. Lo usa la parte 3 (acciones utiles).
   * @returns {number} a cuantos companeros ha ayudado
   */
  speedUp(quien, segundos) {
    if (!this.enabled || segundos <= 0) return 0;
    let n = 0;
    for (const e of this.todos) {
      if (!this.isPending(e) || !areAllies(quien, e)) continue;
      e.respawnTimer = Math.max(0.6, e.respawnTimer - segundos);
      n++;
    }
    return n;
  }

  /* =============================================================
     BUCLE
     ============================================================= */

  /** @param {number} dt */
  update(dt) {
    if (!this.enabled) return;
    const todos = this.todos;

    for (const e of todos) {
      if (e.alive) continue;
      if (e.respawnOut) continue;          // ya esta fuera del todo

      // --- Acaba de caer: ¿le sostiene alguien? ---
      if (e.respawnTimer == null) {
        if (this._tieneApoyo(e, todos)) {
          e.respawnTimer = RESPAWN_TIME;
          this._avisarCaida(e);
        } else {
          this._eliminar(e, todos);
        }
        continue;
      }

      // --- Esperando: si cae el ultimo companero, se acabo ---
      if (!this._tieneApoyo(e, todos)) {
        this._eliminar(e, todos);
        continue;
      }

      e.respawnTimer -= dt;
      if (e.respawnTimer <= 0) this._reaparecer(e, todos);
    }
  }

  /**
   * ¿Queda alguien de su equipo EN PIE para sostener la reaparicion?
   *
   * Un companero ABATIDO cuenta: sigue vivo y pueden levantarlo. Uno
   * que esta esperando a reaparecer NO cuenta, porque si no dos muertos
   * se sostendrian el uno al otro y el equipo no caeria nunca.
   */
  _tieneApoyo(quien, todos) {
    return todos.some((e) => e !== quien && e.alive && areAllies(quien, e));
  }

  /* =============================================================
     CAER, VOLVER Y QUEDARSE FUERA
     ============================================================= */

  _avisarCaida(e) {
    if (e === this.player) {
      this.onMessage?.(`Vuelves en ${RESPAWN_TIME} s · aguanta, equipo`, 'rare');
    } else if (areAllies(e, this.player)) {
      this.onMessage?.(`${e.name} ha caido · vuelve en ${RESPAWN_TIME} s`, 'uncommon');
    }
  }

  /** Se acabaron las segundas oportunidades para este. */
  _eliminar(e, todos) {
    e.respawnTimer = null;
    e.respawnOut = true;

    // Aviso de ESCUADRON eliminado: una sola vez por equipo, y solo
    // cuando ya no queda nadie suyo en juego.
    const equipo = e.team;
    if (equipo === undefined || this.equiposFuera.has(equipo)) return;

    const quedaAlguien = todos.some((o) => o.team === equipo && this.inPlay(o));
    if (quedaAlguien) return;

    this.equiposFuera.add(equipo);
    this.onTeamOut?.(equipo);

    if (equipo === this.player?.team) {
      this.onMessage?.('Escuadron eliminado · no queda nadie para traerte', 'legendary');
    }
  }

  /** Vuelve a la partida. */
  _reaparecer(e, todos) {
    const punto = this._puntoDeVuelta(e, todos);

    e.respawnTimer = null;
    e.alive = true;
    e.downed = false;
    e.downHealth = 0;
    e.reviveProgress = 0;
    e.beingRevived = false;
    e.downedBy = null;
    e.killedBy = null;
    e.lastAttacker = null;

    e.health = Math.min(RESPAWN_HEALTH, e.maxHealth || RESPAWN_HEALTH);
    e.shield = 0;
    e.hurtFlash = 0;

    e.x = punto.x;
    e.y = punto.y;
    e.vx = 0;
    e.vy = 0;
    e.onGround = false;
    e.flight = null;
    e.swimming = false;
    e.crouching = false;
    e.aiming = false;
    e.buildMode = false;
    e.cancelAction?.();

    // Parpadeo de "acabo de llegar" (el dibujo ya lo entiende).
    e.respawnFlash = 1;

    // Que su PROXIMA baja se vuelva a registrar: match.js marca
    // `deathHandled` para no contar dos veces la misma muerte.
    e.deathHandled = false;

    // A un bot hay que sacarlo de su estado de "abatido" o se quedaria
    // tirado en el suelo para siempre.
    if (e.ai) {
      e.ai.state = 'explorar';
      e.ai.think = 0;
      e.ai.targetEnemy = null;
      e.ai.targetPickup = null;
      e.ai.targetDown = null;
      e.ai.combatTarget = null;
      e.ai.stuckTimer = 0;
      e.ai.lastX = e.x;
      e.ai.waypointX = e.x;
    }

    this.particles?.spark(e.x + e.w / 2, e.y + e.h / 2, '#5fd14a', 22, 320);
    this.particles?.puff(e.x + e.w / 2, e.y + e.h / 2, 'rgba(120, 255, 180, 0.5)', 10);

    this.onRespawn?.(e);

    if (e === this.player) {
      playReward();
      this.onMessage?.('¡Has vuelto! Busca un arma', 'epic');
    } else if (areAllies(e, this.player)) {
      this.onMessage?.(`${e.name} ha vuelto`, 'uncommon');
    }
  }

  /**
   * DONDE reaparece: justo al lado de un companero en pie.
   *
   * Se prefiere uno que no este abatido (aparecer encima de alguien que
   * se desangra no ayuda a nadie) y se cae desde un poco mas arriba
   * para que se vea llegar en vez de materializarse de la nada.
   */
  _puntoDeVuelta(e, todos) {
    const companeros = todos.filter((o) => o !== e && o.alive && areAllies(e, o));
    const enPie = companeros.filter((o) => !o.downed);
    const guia = enPie[0] || companeros[0];

    // Sin guia no deberia llegarse nunca (se ha comprobado antes), pero
    // si pasara, se vuelve al centro de la zona segura.
    let x = guia
      ? guia.x + (Math.random() < 0.5 ? -RESPAWN_OFFSET : RESPAWN_OFFSET)
      : (this.zone ? (this.zone.minX + this.zone.maxX) / 2 : this.world.width / 2);

    // Nunca fuera de la zona segura ni fuera del mapa.
    if (this.zone) {
      x = Math.max(this.zone.minX + 60, Math.min(this.zone.maxX - 60, x));
    }
    x = Math.max(40, Math.min(this.world.width - 40, x));

    const suelo = this.world.groundYAt(x + (e.w || 0) / 2);
    return { x, y: suelo - (e.h || 0) - RESPAWN_DROP };
  }
}
