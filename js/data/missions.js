/**
 * missions.js
 * ---------------------------------------------------------------
 * CATALOGO DE MISIONES (solo datos, sin logica).
 *
 * Cada mision es un contador con una meta y una recompensa en pavos.
 * El sistema que las lleva es systems/missions.js, y el progreso se
 * guarda en el perfil (core/profile.js).
 *
 * Campos:
 *   id       identificador unico (se guarda en localStorage)
 *   name     titulo corto
 *   desc     lo que hay que hacer, en una linea
 *   event    que evento la hace avanzar (ver EVENTS)
 *   goal     cuanto hace falta
 *   reward   pavos al completarla
 *   scope    'match' -> hay que lograrlo en UNA partida (se reinicia)
 *            'total' -> se va acumulando entre partidas
 *   zone     (opcional) solo cuenta si el evento ocurre en esa zona
 *   group    para agrupar la lista en la pantalla de misiones
 */

/** Eventos que el juego reporta al sistema de misiones. */
export const EVENTS = {
  KILL: 'kill',                // una eliminacion
  CHEST: 'chest',              // abrir un cofre
  WOOD: 'wood',                // madera conseguida (suma la cantidad)
  BUILD: 'build',              // colocar una pieza
  BREAK: 'break',              // romper una construccion
  TREE: 'tree',                // talar un arbol entero
  FISH: 'fish',                // pescar un pez
  BUILDING: 'building',        // entrar en una casa o edificio
  LAND: 'land',                // aterrizar (lleva la zona)
  WIN: 'win',                  // ganar la partida
  MATCH: 'match',              // terminar una partida
  TOP5: 'top5',                // quedar entre los 5 ultimos
  DAMAGE: 'damage',            // dano hecho a otros
};

export const MISSIONS = [
  /* ---------- Combate ---------- */
  {
    id: 'kills3', group: 'Combate', name: 'Triple eliminacion',
    desc: 'Consigue 3 eliminaciones en una partida',
    event: EVENTS.KILL, goal: 3, scope: 'match', reward: 150,
  },
  {
    id: 'kills25', group: 'Combate', name: 'Veterano de la isla',
    desc: 'Consigue 25 eliminaciones en total',
    event: EVENTS.KILL, goal: 25, scope: 'total', reward: 400,
  },
  {
    id: 'dano1500', group: 'Combate', name: 'Mano pesada',
    desc: 'Haz 1500 de dano en total',
    event: EVENTS.DAMAGE, goal: 1500, scope: 'total', reward: 250,
  },
  {
    id: 'top5', group: 'Combate', name: 'Recta final',
    desc: 'Queda entre los 5 ultimos de una partida',
    event: EVENTS.TOP5, goal: 1, scope: 'match', reward: 200,
  },
  {
    id: 'victoria', group: 'Combate', name: '¡Victoria magistral!',
    desc: 'Gana una partida',
    event: EVENTS.WIN, goal: 1, scope: 'total', reward: 500,
  },

  /* ---------- Saqueo ---------- */
  {
    id: 'cofres5', group: 'Saqueo', name: 'Abrelatas',
    desc: 'Abre 5 cofres en una partida',
    event: EVENTS.CHEST, goal: 5, scope: 'match', reward: 120,
  },
  {
    id: 'cofres40', group: 'Saqueo', name: 'Coleccionista',
    desc: 'Abre 40 cofres en total',
    event: EVENTS.CHEST, goal: 40, scope: 'total', reward: 350,
  },
  {
    id: 'casas3', group: 'Saqueo', name: 'Puerta a puerta',
    desc: 'Entra en 3 edificios en una partida',
    event: EVENTS.BUILDING, goal: 3, scope: 'match', reward: 130,
  },
  {
    id: 'peces3', group: 'Saqueo', name: 'Buen pescador',
    desc: 'Pesca 3 peces en total',
    event: EVENTS.FISH, goal: 3, scope: 'total', reward: 100,
  },

  /* ---------- Construccion ---------- */
  {
    id: 'madera500', group: 'Construccion', name: 'Lenador aplicado',
    desc: 'Consigue 500 de madera en total',
    event: EVENTS.WOOD, goal: 500, scope: 'total', reward: 200,
  },
  {
    id: 'arboles5', group: 'Construccion', name: 'Tala controlada',
    desc: 'Tala 5 arboles en una partida',
    event: EVENTS.TREE, goal: 5, scope: 'match', reward: 140,
  },
  {
    id: 'construye10', group: 'Construccion', name: 'Manos a la obra',
    desc: 'Coloca 10 piezas en una partida',
    event: EVENTS.BUILD, goal: 10, scope: 'match', reward: 130,
  },
  {
    id: 'rompe15', group: 'Construccion', name: 'Demoledor',
    desc: 'Rompe 15 construcciones en total',
    event: EVENTS.BREAK, goal: 15, scope: 'total', reward: 220,
  },

  /* ---------- Aterrizajes ---------- */
  // Una por sitio: obligan a repartirse por el mapa en vez de caer
  // siempre en el mismo punto.
  {
    id: 'caer_villa', group: 'Aterrizajes', name: 'Turista en Villa Pavo',
    desc: 'Aterriza en Villa Pavo',
    event: EVENTS.LAND, goal: 1, scope: 'total', reward: 100, zone: 'villa',
  },
  {
    id: 'caer_mansion', group: 'Aterrizajes', name: 'Visita a la Mansion',
    desc: 'Aterriza en Mansion Dorada',
    event: EVENTS.LAND, goal: 1, scope: 'total', reward: 100, zone: 'mansion',
  },
  {
    id: 'caer_cumbre', group: 'Aterrizajes', name: 'Frio de verdad',
    desc: 'Aterriza en Cumbre Helada',
    event: EVENTS.LAND, goal: 1, scope: 'total', reward: 100, zone: 'cumbre',
  },
  {
    id: 'caer_fabrica', group: 'Aterrizajes', name: 'Turno de noche',
    desc: 'Aterriza en Fabrica Tornillo',
    event: EVENTS.LAND, goal: 1, scope: 'total', reward: 100, zone: 'fabrica',
  },
  {
    id: 'caer_dunas', group: 'Aterrizajes', name: 'Sed de arena',
    desc: 'Aterriza en Dunas Secas',
    event: EVENTS.LAND, goal: 1, scope: 'total', reward: 100, zone: 'dunas',
  },
  // Los tres sitios nuevos, para que la lista siga cubriendo el mapa
  // entero y no solo la mitad de siempre.
  {
    id: 'caer_puerto', group: 'Aterrizajes', name: 'Marinero de agua dulce',
    desc: 'Aterriza en Puerto Ancla',
    event: EVENTS.LAND, goal: 1, scope: 'total', reward: 100, zone: 'puerto',
  },
  {
    id: 'caer_feria', group: 'Aterrizajes', name: 'Dia de feria',
    desc: 'Aterriza en Feria Fortuna',
    event: EVENTS.LAND, goal: 1, scope: 'total', reward: 100, zone: 'feria',
  },
  {
    id: 'caer_volcan', group: 'Aterrizajes', name: 'Suelo caliente',
    desc: 'Aterriza en Volcan Ceniza',
    event: EVENTS.LAND, goal: 1, scope: 'total', reward: 100, zone: 'volcan',
  },

  /* ---------- Constancia ---------- */
  {
    id: 'partidas10', group: 'Constancia', name: 'Habitual del bus',
    desc: 'Juega 10 partidas',
    event: EVENTS.MATCH, goal: 10, scope: 'total', reward: 300,
  },
];

/** Orden en el que se muestran los grupos en la pantalla de misiones. */
export const MISSION_GROUPS = [
  'Combate', 'Saqueo', 'Construccion', 'Aterrizajes', 'Constancia',
];

/** Busca una mision por id. */
export function missionById(id) {
  return MISSIONS.find((m) => m.id === id);
}

/** Todas las misiones que reaccionan a un evento. */
export function missionsFor(event) {
  return MISSIONS.filter((m) => m.event === event);
}
