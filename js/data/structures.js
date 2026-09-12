/**
 * structures.js
 * ---------------------------------------------------------------
 * LAS PIEZAS DE CONSTRUCCION, adaptadas a un juego de vista lateral.
 *
 * Todo se coloca sobre una REJILLA de celdas cuadradas, como en
 * Fortnite. Cada pieza dice que cajas de colision aporta dentro de su
 * celda; el motor de fisica solo entiende rectangulos, asi que:
 *
 *   - la PARED es un rectangulo alto y estrecho
 *   - el SUELO es un rectangulo ancho y bajo
 *   - la RAMPA es una ESCALERA de cuatro peldanos. Es la forma de tener
 *     algo diagonal por lo que se pueda subir sin tocar la fisica de
 *     colisiones, que es de rectangulos.
 */

/** Lado de la celda de construccion. */
export const GRID = 96;

/** Grosor de paredes y suelos. */
const GROSOR = 18;
/** Peldanos de la rampa. */
const PELDANOS = 4;

export const PIECES = {
  pared: {
    id: 'pared',
    name: 'Pared',
    tecla: 'Z',
    cost: 10,
    health: 150,
    /**
     * Cajas dentro de la celda, en coordenadas relativas a su esquina
     * superior izquierda. `dir` es 1 o -1 (hacia donde mira el jugador).
     */
    boxes: () => [{ dx: 0, dy: 0, w: GROSOR, h: GRID }],
  },

  suelo: {
    id: 'suelo',
    name: 'Suelo',
    tecla: 'X',
    cost: 10,
    health: 120,
    boxes: () => [{ dx: 0, dy: 0, w: GRID, h: GROSOR }],
  },

  rampa: {
    id: 'rampa',
    name: 'Rampa',
    tecla: 'C',
    cost: 10,
    health: 110,
    /**
     * Escalera de cuatro peldanos que sube en la direccion en la que
     * mira el jugador. Cada peldano baja hasta el fondo de la celda,
     * asi que la rampa es maciza y se puede caminar por encima.
     */
    boxes: (dir = 1) => {
      const paso = GRID / PELDANOS;
      const out = [];
      for (let i = 0; i < PELDANOS; i++) {
        const alto = paso * (i + 1);
        // Si mira a la izquierda, la escalera se refleja dentro de la celda.
        const dx = dir > 0 ? i * paso : GRID - (i + 1) * paso;
        out.push({ dx, dy: GRID - alto, w: paso, h: alto });
      }
      return out;
    },
  },
};

/** Orden fijo para recorrerlas y para el selector del HUD. */
export const PIECE_ORDER = ['pared', 'suelo', 'rampa'];

/** Pieza por id (con la pared como respaldo). */
export function pieceOf(id) {
  return PIECES[id] || PIECES.pared;
}

/** Ajusta una coordenada del mundo a la esquina de su celda. */
export function snap(value) {
  return Math.floor(value / GRID) * GRID;
}
