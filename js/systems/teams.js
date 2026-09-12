/**
 * teams.js
 * ---------------------------------------------------------------
 * EQUIPOS: quien va con quien.
 *
 * En el modo individual TODOS son enemigos de todos, y eso se
 * representa dandole a cada uno su propio equipo. Asi no hay dos
 * caminos de codigo: el "todos contra todos" es simplemente 75 equipos
 * de uno, y `areAllies()` responde que no a todo.
 *
 * En duos y escuadrones se reparten en equipos del tamano que diga el
 * modo, y el equipo 0 es SIEMPRE el del jugador.
 *
 * Este modulo no sabe nada de disparar ni de reanimar: solo reparte y
 * responde a "¿estos dos van juntos?". Lo consultan las balas, las
 * explosiones, las torretas, el pico y la IA de los bots.
 */

/** Colores de los equipos, para distinguirlos de un vistazo. */
export const TEAM_COLORS = {
  /** El tuyo: verde. */
  aliado: '#5fd14a',
  aliadoClaro: '#b6f5a8',
  /** Los demas: rojo, como siempre. */
  enemigo: '#e05a4a',
};

/**
 * Reparte a todo el mundo en equipos.
 *
 * @param {object} player
 * @param {Array} bots
 * @param {number} teamSize  1 = individual; 2 = duos; 4 = escuadron
 * @param {(n:number)=>number[]} shuffleIdx  para barajar (determinista)
 * @returns {number} cuantos equipos han salido
 */
export function assignTeams(player, bots, teamSize = 1, rng = Math.random) {
  // El jugador siempre en el 0.
  player.team = 0;

  if (teamSize <= 1) {
    // Individual: uno por equipo. `areAllies` dira que no a todo.
    bots.forEach((b, i) => { b.team = i + 1; });
    return bots.length + 1;
  }

  // Los companeros del jugador se eligen AL AZAR, no los primeros de la
  // lista: si no, siempre te tocarian los que aparecen en el mismo sitio
  // (los bots se crean en orden de posicion por el mapa).
  const orden = bots.map((_, i) => i);
  for (let i = orden.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }

  let equipo = 0;
  // Al equipo 0 le faltan `teamSize - 1`, porque el jugador ya ocupa uno.
  let hueco = teamSize - 1;

  for (const idx of orden) {
    bots[idx].team = equipo;
    hueco--;
    if (hueco <= 0) { equipo++; hueco = teamSize; }
  }

  return equipo + 1;
}

/**
 * ¿Van estos dos en el mismo equipo?
 *
 * Uno solo (sin `team`) nunca es aliado de nadie: asi las dianas, las
 * torretas sin dueno y cualquier cosa suelta siguen funcionando.
 */
export function areAllies(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.team === undefined || b.team === undefined) return false;
  return a.team === b.team;
}

/** Companeros de equipo VIVOS de alguien (sin contarlo a el). */
export function teammatesOf(quien, todos) {
  return todos.filter((e) => e !== quien && e.alive && areAllies(quien, e));
}

/** Color con el que se pinta a alguien visto desde el jugador. */
export function colorFor(quien, player) {
  return areAllies(quien, player) ? TEAM_COLORS.aliado : TEAM_COLORS.enemigo;
}

/** Equipos que siguen con alguien en pie (para el marcador). */
export function aliveTeams(entities) {
  const vivos = new Set();
  for (const e of entities) {
    if (e.alive) vivos.add(e.team);
  }
  return vivos.size;
}
