/**
 * defense.js (datos)
 * ---------------------------------------------------------------
 * TODOS LOS NUMEROS DE JULEN DEFENSA en un solo sitio: la torre, las
 * oleadas, los zombis, las torres, las trampas y la tienda.
 *
 * Si hay que equilibrar el modo (que sea mas facil, que den mas dinero,
 * que los jefes aguanten menos...) se toca AQUI y en ningun otro sitio.
 * El codigo del modo solo lee estas tablas.
 */

/* =============================================================
   REGLAS GENERALES
   ============================================================= */

export const DEFENSA = {
  /** Oleadas que hay que aguantar para ganar. */
  oleadas: 10,
  /** Cada cuantas oleadas sale un JEFE (en la 5 y en la 10). */
  jefeCada: 5,
  /** Dinero con el que se empieza, para las primeras defensas. */
  dineroInicial: 350,
  /** Segundos de DIA antes de la primera oleada (hay que montarlo todo). */
  preparacionPrimera: 40,
  /** Segundos de DIA entre oleada y oleada. */
  preparacion: 25,
  /** Vida de la torre. A cero, se pierde. */
  vidaBase: 1500,
  /** Segundos que tarda el jugador en volver a la torre si lo tumban. */
  respawnJugador: 4,
  /** Dinero extra por aguantar una oleada: cuanto mas avanzada, mas. */
  bonusOleada: (n) => 100 + n * 25,
};

/** Pavos de la cuenta que se ganan por cada oleada aguantada. */
export const PAVOS_POR_OLEADA = 15;

/* =============================================================
   ZOMBIS
   -------------------------------------------------------------
   vida, velocidad (px/s), dano (por golpe), ritmo (segundos entre
   golpes), w/h (tamano), dinero (lo que dan al morir), y los dos
   colores del dibujo.
   ============================================================= */

export const ZOMBIES = {
  normal: {
    id: 'normal', name: 'Zombi',
    vida: 70, velocidad: 52, dano: 14, ritmo: 1.0,
    w: 30, h: 62, dinero: 10,
    color: '#6f9a4e', ropa: '#5a4a7a',
  },
  rapido: {
    id: 'rapido', name: 'Corredor',
    vida: 45, velocidad: 115, dano: 9, ritmo: 0.7,
    w: 26, h: 56, dinero: 12,
    color: '#8fb35a', ropa: '#a0452f',
  },
  tanque: {
    id: 'tanque', name: 'Mole',
    vida: 320, velocidad: 32, dano: 32, ritmo: 1.4,
    w: 44, h: 78, dinero: 32,
    color: '#557a3c', ropa: '#3b3f55',
  },
  jefe: {
    id: 'jefe', name: 'Rey Zombi', jefe: true,
    vida: 2200, velocidad: 28, dano: 70, ritmo: 1.6,
    w: 76, h: 128, dinero: 300,
    color: '#4e6b34', ropa: '#6b1d2a',
  },
};

/**
 * Que trae una oleada.
 *
 * Crecen tres cosas a la vez: CUANTOS zombis vienen, QUE TIPOS (los
 * corredores a partir de la 2, las moles a partir de la 4) y lo DUROS
 * que son. Y cada `jefeCada` oleadas, un jefe al final de la fila.
 *
 * @param {number} n  numero de oleada (1, 2, 3...)
 */
export function composicionOleada(n) {
  const total = 6 + n * 3;
  const rapidos = n >= 2 ? Math.round(total * Math.min(0.35, 0.08 + n * 0.03)) : 0;
  const tanques = n >= 4 ? 1 + Math.floor((n - 4) * 0.8) : 0;
  const normales = Math.max(3, total - rapidos - tanques);

  const lista = [{ tipo: 'normal', cuantos: normales }];
  if (rapidos) lista.push({ tipo: 'rapido', cuantos: rapidos });
  if (tanques) lista.push({ tipo: 'tanque', cuantos: tanques });

  const jefe = n % DEFENSA.jefeCada === 0;
  if (jefe) lista.push({ tipo: 'jefe', cuantos: 1 });

  return {
    lista,
    jefe,
    /** Multiplicador de vida de esta oleada. */
    vida: 1 + (n - 1) * 0.17,
    /** Multiplicador de dano. */
    dano: 1 + (n - 1) * 0.08,
    /** Segundos entre zombi y zombi (cada vez salen mas seguidos). */
    ritmo: Math.max(0.45, 1.5 - n * 0.09),
    /** El segundo jefe aguanta bastante mas que el primero. */
    vidaJefe: 1 + (n / DEFENSA.jefeCada - 1) * 0.7,
  };
}

/* =============================================================
   TORRES (disparan solas)
   -------------------------------------------------------------
   precio, alcance (px), dano, cadencia (disparos/s), velocidadBala,
   efecto del proyectil ('hielo' ralentiza, 'explosion' hace dano en
   area con `radio`), perfora (atraviesa zombis).
   ============================================================= */

export const TORRES = [
  {
    id: 'ametralladora', name: 'Torre Ametralladora',
    desc: 'Dispara muy rapido. La de siempre.',
    precio: 150, alcance: 520, dano: 10, cadencia: 5, velocidadBala: 1500,
    color: '#5b6874', acento: '#ffd23f',
  },
  {
    id: 'canon', name: 'Canon Pesado',
    desc: 'Mucho dano y atraviesa a varios.',
    precio: 260, alcance: 720, dano: 70, cadencia: 0.75, velocidadBala: 1900,
    perfora: true,
    color: '#4a4f5c', acento: '#e8434f',
  },
  {
    id: 'hielo', name: 'Torre de Hielo',
    desc: 'Poco dano, pero los deja a camara lenta.',
    precio: 200, alcance: 460, dano: 7, cadencia: 1.6, velocidadBala: 1300,
    efecto: 'hielo',
    color: '#3c6a8a', acento: '#9fe6ff',
  },
  {
    id: 'mortero', name: 'Mortero',
    desc: 'Cada disparo revienta en area.',
    precio: 320, alcance: 820, dano: 55, cadencia: 0.55, velocidadBala: 1100,
    efecto: 'explosion', radio: 120,
    color: '#5a4b3a', acento: '#ff8a3d',
  },
];

/* =============================================================
   TRAMPAS (se ponen en el suelo)
   -------------------------------------------------------------
   usos (golpes antes de gastarse), dano, espera (segundos entre golpe
   y golpe al mismo zombi), w (ancho) y lo propio de cada una.
   ============================================================= */

export const TRAMPAS = [
  {
    id: 'pinchos', name: 'Pinchos',
    desc: 'Pinchan a todo el que pasa por encima.',
    precio: 60, usos: 30, dano: 28, espera: 0.7, w: 70,
    color: '#7a4b26', acento: '#c8d0dc',
  },
  {
    id: 'congelante', name: 'Trampa Congelante',
    desc: 'Congela un momento y luego ralentiza.',
    precio: 90, usos: 14, dano: 8, espera: 1.2, w: 70, congela: 1.6,
    color: '#2f5f7a', acento: '#bff1ff',
  },
  {
    id: 'electrica', name: 'Trampa Electrica',
    desc: 'Descarga a todos los que tenga cerca.',
    precio: 120, usos: 16, dano: 34, espera: 1.1, w: 60, radio: 140,
    color: '#3a3f5a', acento: '#ffe34a',
  },
  {
    id: 'parrilla', name: 'Parrilla de Fuego',
    desc: 'Les prende fuego al pisarla.',
    precio: 100, usos: 40, dano: 4, espera: 0.5, w: 80, quema: 3, dps: 14,
    color: '#5a3326', acento: '#ff7a2a',
  },
  {
    id: 'lanzador', name: 'Lanzador',
    desc: 'Los manda por los aires hacia atras.',
    precio: 110, usos: 12, dano: 45, espera: 0.4, w: 64, empuje: 780,
    color: '#4c5a3a', acento: '#9be35a',
  },
  {
    id: 'dardos', name: 'Pared de Dardos',
    desc: 'Dispara dardos a lo largo del camino.',
    precio: 130, usos: 60, dano: 18, espera: 0.55, w: 34, alcance: 300,
    color: '#6b4522', acento: '#e8d8b0',
  },
];

/* =============================================================
   MEJORAS
   ============================================================= */

/** Nivel maximo de torres y trampas. */
export const NIVEL_MAX = 3;

/** Multiplicador de dano por nivel: x1, x1,5, x2. */
export function multNivel(nivel) {
  return 1 + (nivel - 1) * 0.5;
}

/** Usos de una trampa segun su nivel (la mejora tambien la rellena). */
export function usosMaximos(def, nivel) {
  return Math.round(def.usos * (1 + (nivel - 1) * 0.5));
}

/** Lo que cuesta pasar de `nivel` al siguiente. */
export function precioMejora(def, nivel) {
  return Math.round(def.precio * (0.7 + nivel * 0.3));
}

/** Lo que cuesta rellenar los usos de una trampa ya al maximo. */
export function precioRecarga(def) {
  return Math.round(def.precio * 0.45);
}

/* =============================================================
   TIENDA DE ARMAS
   -------------------------------------------------------------
   Las armas del juego con su rareza, y las cuatro nuevas de este modo
   (ver data/weapons.js, las que llevan `modes: ['defensa']`).
   ============================================================= */

export const TIENDA_ARMAS = [
  { id: 'municion', name: 'Municion completa', desc: 'Rellena todas tus balas.', precio: 40, municion: true },
  { id: 'fusil', arma: 'fusil', rareza: 'rare', precio: 120 },
  { id: 'escopeta', arma: 'escopeta', rareza: 'rare', precio: 150 },
  { id: 'llamas', arma: 'llamas', rareza: 'epic', precio: 220 },
  { id: 'rifle-hielo', arma: 'rifle-hielo', rareza: 'epic', precio: 260 },
  { id: 'cadena', arma: 'cadena', rareza: 'epic', precio: 300 },
  { id: 'lanzacohetes', arma: 'lanzacohetes', rareza: 'legendary', precio: 420 },
];
