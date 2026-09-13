/**
 * levels.js
 * ---------------------------------------------------------------
 * SISTEMA DE NIVELES (XP).
 *
 * El jugador tiene un NIVEL que sube ganando experiencia. Aqui vive todo
 * lo que es "cuanta XP hace falta" y "cuanta XP da cada cosa"; el
 * progreso en si lo guarda core/profile.js.
 *
 * La curva es SUAVE a proposito: cada nivel pide un poco mas que el
 * anterior, sin dispararse. Con la XP que da una partida normal
 * (unos 250-450), los primeros niveles caen en una partida y los del
 * final piden tres o cuatro.
 */

/** Nivel maximo: coincide con los 100 niveles del pase de batalla. */
export const MAX_LEVEL = 100;

/** XP base del primer nivel y cuanto sube por cada nivel. */
const BASE = 120;
const PASO = 20;

/**
 * XP que hace falta para pasar del nivel `n` al `n + 1`.
 * @param {number} n
 */
export function xpToNext(n) {
  if (n >= MAX_LEVEL) return Infinity;
  return BASE + (n - 1) * PASO;
}

/** XP acumulada total para llegar al nivel `n` desde el 1. */
export function totalXpFor(n) {
  let total = 0;
  for (let i = 1; i < n; i++) total += xpToNext(i);
  return total;
}

/* =============================================================
   DE DONDE SALE LA XP
   ============================================================= */

export const XP = {
  /** Por terminar una partida, se gane o se pierda. */
  MATCH: 100,
  /** Por cada eliminacion. */
  KILL: 25,
  /** Por ganar la partida (ademas de lo anterior). */
  WIN: 300,
  /** Por quedar entre los 5 ultimos. */
  TOP5: 80,
  /** Por cada cofre abierto. */
  CHEST: 8,
  /** Por cada edificio en el que entras (una vez por edificio). */
  BUILDING: 10,
  /** Por talar un arbol entero. */
  TREE: 6,
  /** Por cada pez pescado. */
  FISH: 12,
  /** Por cada oleada aguantada en JULEN DEFENSA. */
  WAVE: 45,
  /** Por completar una mision. */
  MISSION: 150,
  /** Por cada 100 de dano hecho. */
  DAMAGE_100: 10,
  /** Por terminar un minijuego. */
  MINIGAME: 40,
  /** Por batir un record en un minijuego. */
  MINIGAME_RECORD: 60,
};

/** Nombre bonito de cada fuente, para el resumen de fin de partida. */
export const XP_LABELS = {
  MATCH: 'Partida jugada',
  KILL: 'Eliminaciones',
  WIN: '¡Victoria!',
  TOP5: 'Top 5',
  CHEST: 'Cofres',
  BUILDING: 'Edificios',
  TREE: 'Arboles',
  FISH: 'Peces',
  WAVE: 'Oleadas',
  MISSION: 'Misiones',
  DAMAGE_100: 'Dano hecho',
  MINIGAME: 'Minijuego',
  MINIGAME_RECORD: '¡Nuevo record!',
};
