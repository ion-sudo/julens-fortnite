/**
 * buildings.js (datos)
 * ---------------------------------------------------------------
 * PLANTILLAS DE CASAS Y EDIFICIOS y las medidas que comparten.
 *
 * Un edificio es su SECCION vista de lado: se ven las dos paredes
 * laterales, el tejado, los suelos de cada planta y las escaleras que
 * los unen. La pared de delante (la FACHADA) tapa el interior mientras
 * estas fuera y se desvanece al entrar.
 *
 * Cada plantilla dice:
 *   label      nombre que sale en los avisos
 *   w          ancho del cuerpo
 *   floors     numero de PLANTAS (1 = casa de una altura)
 *   floorH     alto de cada planta
 *   loot       cuantos cofres se reparten dentro
 *   colores    fachada, tejado, ventanas
 *   roofStyle  punta | plano | curvo | palma | roto
 *
 * El alto total sale de las plantas: ROOF + floors * floorH.
 */

/** Grosor de las paredes laterales y del tejado. */
export const WALL = 14;
export const ROOF = 16;

/** Hueco de la puerta (siempre en la planta baja, pared izquierda). */
export const DOOR_H = 72;
export const DOOR_W = 14;

/** Distancia a la que se puede abrir o cerrar una puerta. */
export const DOOR_RADIUS = 78;

/**
 * Escaleras. El peldano NUNCA puede pasar de CONFIG.build.rampStep (30),
 * porque es lo que el jugador sube andando sin tener que saltar.
 */
export const STEP_H = 26;

export const BUILDING_TYPES = {
  cabana: {
    label: 'Cabana', w: 210, floors: 1, floorH: 134, loot: 1,
    wall: '#a9763f', wallDark: '#8a5c2f', roof: '#6b4522', roofEdge: '#54361b',
    window: '#ffe9a8', roofStyle: 'punta', floorMat: '#7a5230',
  },
  chiringuito: {
    label: 'Chiringuito', w: 230, floors: 1, floorH: 124, loot: 1,
    wall: '#e8d6a8', wallDark: '#cbb489', roof: '#c0562f', roofEdge: '#9a4225',
    window: '#bfefff', roofStyle: 'palma', floorMat: '#b98d55',
  },
  casa: {
    label: 'Casa', w: 250, floors: 2, floorH: 132, loot: 1,
    wall: '#f0e6d2', wallDark: '#d6c8ac', roof: '#c0562f', roofEdge: '#9a4225',
    window: '#9fe0ff', roofStyle: 'punta', floorMat: '#a9764a',
  },
  tienda: {
    label: 'Tienda', w: 270, floors: 2, floorH: 128, loot: 2,
    wall: '#dfe8f2', wallDark: '#c2cedc', roof: '#3f8fe8', roofEdge: '#2456a8',
    window: '#ffe9a8', roofStyle: 'plano', floorMat: '#9aa6b4',
  },
  refugio: {
    label: 'Refugio', w: 230, floors: 2, floorH: 130, loot: 1,
    wall: '#8a6b52', wallDark: '#6d5340', roof: '#ffffff', roofEdge: '#cfe0ee',
    window: '#ffe9a8', roofStyle: 'punta', floorMat: '#7c5b41',
  },
  nave: {
    label: 'Nave', w: 320, floors: 2, floorH: 148, loot: 2,
    wall: '#79879a', wallDark: '#5b6874', roof: '#4a5563', roofEdge: '#39424d',
    window: '#a8d8e8', roofStyle: 'curvo', floorMat: '#6a7684',
  },
  mansion: {
    label: 'Mansion', w: 400, floors: 3, floorH: 134, loot: 2,
    wall: '#f2e7cd', wallDark: '#d8c9a6', roof: '#8e3a62', roofEdge: '#6a2a49',
    window: '#ffd9a0', roofStyle: 'punta', floorMat: '#8a5f3a',
  },
  ruina: {
    label: 'Ruina', w: 240, floors: 1, floorH: 124, loot: 1,
    wall: '#c9a86f', wallDark: '#a5854f', roof: '#b08c52', roofEdge: '#8a6c3c',
    window: '#6b5a3a', roofStyle: 'roto', floorMat: '#a08a5c',
  },
  torre: {
    label: 'Torre', w: 330, floors: 3, floorH: 130, loot: 2,
    wall: '#cdd6e0', wallDark: '#aab6c4', roof: '#556274', roofEdge: '#3e4959',
    window: '#ffe9a8', roofStyle: 'plano', floorMat: '#8e9aa8',
  },

  /* ---------- Los tres sitios nuevos ---------- */

  // Puerto Ancla: estrecho y alto, con la franja roja del faro.
  faro: {
    label: 'Faro', w: 200, floors: 3, floorH: 128, loot: 2,
    wall: '#f4f1e8', wallDark: '#d6d0c2', roof: '#d8442f', roofEdge: '#a52f20',
    window: '#ffe9a8', roofStyle: 'punta', floorMat: '#9a8f7c',
  },

  // Feria Fortuna: una barraca de feria, de colores y de una sola altura.
  caseta: {
    label: 'Caseta', w: 220, floors: 1, floorH: 128, loot: 1,
    wall: '#ffd6e8', wallDark: '#e8aecb', roof: '#e8434f', roofEdge: '#b62d3a',
    window: '#bfefff', roofStyle: 'punta', floorMat: '#c98fa8',
  },

  // Volcan Ceniza: hormigon y ventanas naranjas, como si dentro hubiera
  // lava. Ancho y bajo, para que aguante lo que le cae encima.
  bunker: {
    label: 'Bunker', w: 300, floors: 2, floorH: 132, loot: 2,
    wall: '#6b625c', wallDark: '#4e4741', roof: '#3a3430', roofEdge: '#26221f',
    window: '#ff9a4c', roofStyle: 'plano', floorMat: '#57504a',
  },
};

/** Alto total de un tipo de edificio (tejado incluido). */
export function heightOf(def) {
  return ROOF + def.floors * def.floorH;
}
