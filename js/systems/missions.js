/**
 * missions.js
 * ---------------------------------------------------------------
 * SISTEMA DE MISIONES.
 *
 * El juego le va reportando lo que pasa (`report('kill')`, `report('wood', 60)`…)
 * y este sistema se encarga del resto: sumar progreso, detectar cuando
 * una mision se completa, pagar los pavos y avisar en pantalla.
 *
 * Hay dos tipos de mision:
 *   - scope 'match': hay que lograrlo en UNA partida. El contador se
 *     reinicia al empezar cada partida.
 *   - scope 'total': se va acumulando entre partidas y se guarda en el
 *     perfil (localStorage).
 *
 * Las completadas no vuelven a pagar: quedan marcadas para siempre.
 */

import { MISSIONS, MISSION_GROUPS, missionsFor } from '../data/missions.js';

export class MissionManager {
  /**
   * @param {object} deps { profile }
   */
  constructor(deps) {
    this.profile = deps.profile;

    /** Progreso de las misiones de partida: { id: numero } */
    this.matchProgress = {};

    /** Aviso al completar una mision: lo engancha game.js. */
    this.onComplete = null;
    /** Cola de misiones completadas en esta partida (para el resumen final). */
    this.completedThisMatch = [];
  }

  /* =============================================================
     CONSULTA
     ============================================================= */

  /** ¿Esta ya cobrada esta mision? */
  isDone(m) {
    return this.profile.missionDone(m.id);
  }

  /** Progreso actual de una mision (0..goal). */
  progressOf(m) {
    if (this.isDone(m)) return m.goal;
    return m.scope === 'match'
      ? (this.matchProgress[m.id] || 0)
      : this.profile.missionProgress(m.id);
  }

  /**
   * La lista completa con su estado, lista para pintar.
   * @returns {Array<{mission, progress, goal, done, ratio}>}
   */
  list() {
    return MISSIONS.map((m) => {
      const progress = Math.min(m.goal, this.progressOf(m));
      return {
        mission: m,
        progress,
        goal: m.goal,
        done: this.isDone(m),
        ratio: m.goal > 0 ? progress / m.goal : 0,
      };
    });
  }

  /** La lista agrupada, en el orden de MISSION_GROUPS. */
  byGroup() {
    const todas = this.list();
    return MISSION_GROUPS
      .map((g) => ({ group: g, items: todas.filter((e) => e.mission.group === g) }))
      .filter((g) => g.items.length > 0);
  }

  /** Cuantas van completadas, para el contador del menu. */
  get summary() {
    const todas = this.list();
    return {
      done: todas.filter((e) => e.done).length,
      total: todas.length,
      pending: todas.filter((e) => !e.done).length,
    };
  }

  /* =============================================================
     PARTIDA
     ============================================================= */

  /** Al empezar una partida: los contadores de partida vuelven a cero. */
  startMatch() {
    this.matchProgress = {};
    this.completedThisMatch = [];
  }

  /* =============================================================
     PROGRESO
     ============================================================= */

  /**
   * El juego reporta algo que ha pasado.
   * @param {string} event    uno de data/missions.js EVENTS
   * @param {number} amount   cuanto suma (1 por defecto; la madera suma su cantidad)
   * @param {object} extra    datos del suceso, p. ej. { zone: 'villa' }
   */
  report(event, amount = 1, extra = {}) {
    if (amount <= 0) return;

    for (const m of missionsFor(event)) {
      if (this.isDone(m)) continue;
      // Las misiones de sitio solo cuentan en SU zona.
      if (m.zone && extra.zone !== m.zone) continue;

      const antes = this.progressOf(m);
      const ahora = antes + amount;

      if (m.scope === 'match') this.matchProgress[m.id] = ahora;
      else this.profile.setMissionProgress(m.id, ahora);

      if (ahora >= m.goal) this._complete(m);
    }
  }

  /** Mision cumplida: se marca, se pagan los pavos y se avisa. */
  _complete(m) {
    this.profile.completeMission(m.id);
    this.profile.addVbucks(m.reward);

    this.completedThisMatch.push(m);
    this.onComplete?.(m);
  }

  /**
   * Reinicia TODO el progreso de misiones (lo usa el boton de reiniciar).
   * El perfil se encarga de borrar lo guardado.
   */
  reset() {
    this.matchProgress = {};
    this.completedThisMatch = [];
  }
}
