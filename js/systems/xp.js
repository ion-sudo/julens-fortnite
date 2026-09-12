/**
 * xp.js
 * ---------------------------------------------------------------
 * CONTADOR DE EXPERIENCIA DE LA PARTIDA.
 *
 * Va apuntando la XP que se gana durante una partida, agrupada por
 * motivo, y al terminar la entrega de golpe al perfil. Se hace asi por
 * dos razones:
 *
 *   - la pantalla de fin puede ensenar el desglose ("3 kills, 75 XP")
 *   - subir de nivel a mitad de partida seria un lio; se sube al acabar,
 *     que es cuando el jugador esta mirando el resumen
 *
 * La XP de los MINIJUEGOS si se entrega al momento: son cortos y no
 * tienen pantalla de resumen con desglose.
 */

import { XP, XP_LABELS } from '../data/levels.js';

export class XpTracker {
  /**
   * @param {object} deps { profile }
   */
  constructor(deps) {
    this.profile = deps.profile;
    this.reset();
  }

  /** Empieza una partida nueva: el contador vuelve a cero. */
  reset() {
    /** { KILL: 75, CHEST: 24, ... } */
    this.ganada = {};
    /** Cuantas veces ha pasado cada cosa (para el desglose). */
    this.veces = {};
  }

  /**
   * Apunta XP por algo que acaba de pasar.
   * @param {string} motivo  clave de data/levels.js XP
   * @param {number} cuantas cuantas veces (1 por defecto)
   */
  add(motivo, cuantas = 1) {
    const valor = XP[motivo];
    if (!valor || cuantas <= 0) return;

    this.ganada[motivo] = (this.ganada[motivo] || 0) + valor * cuantas;
    this.veces[motivo] = (this.veces[motivo] || 0) + cuantas;
  }

  /** Total acumulado en esta partida. */
  get total() {
    return Object.values(this.ganada).reduce((a, b) => a + b, 0);
  }

  /**
   * El desglose, listo para pintar.
   * @returns {Array<{motivo:string, label:string, veces:number, xp:number}>}
   */
  get breakdown() {
    return Object.keys(this.ganada)
      .map((m) => ({ motivo: m, label: XP_LABELS[m] || m, veces: this.veces[m], xp: this.ganada[m] }))
      .sort((a, b) => b.xp - a.xp);
  }

  /**
   * Entrega la XP al perfil y devuelve el resultado.
   * @returns {{ganada:number, subidos:number[], nivel:number, desglose:Array}}
   */
  commit() {
    const desglose = this.breakdown;
    const res = this.profile.addXp(this.total);
    this.reset();
    return { ...res, desglose };
  }

  /** XP suelta, sin pasar por el contador (minijuegos). */
  give(motivo, cuantas = 1) {
    const valor = XP[motivo];
    if (!valor || cuantas <= 0) return { ganada: 0, subidos: [], nivel: this.profile.level };
    return this.profile.addXp(valor * cuantas);
  }
}
