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
  /**
   * Oleadas que hay que aguantar para ganar. Es UN solo numero: la
   * dificultad, los tipos de zombi y los jefes se reparten solos a lo
   * largo de las que sean, y la ultima siempre trae de todo y un jefe
   * (ver composicionOleada).
   */
  oleadas: 30,
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
  /**
   * REPARAR LA TORRE con dinero: acercandose a ella y pulsando la tecla
   * de mejorar. Es la otra forma de gastar: o mas defensas, o aguantar
   * con la que tienes.
   */
  reparacion: { precio: 120, cantidad: 300 },
  /** Dinero extra por aguantar una oleada: cuanto mas avanzada, mas. */
  bonusOleada: (n) => 100 + n * 25,
};

/** Pavos de la cuenta que se ganan por cada oleada aguantada. */
export const PAVOS_POR_OLEADA = 15;

/**
 * TOPE de vida de un jefe, en veces la suya normal.
 *
 * Un jefe se multiplicaba DOS veces: por lo dura que es la oleada y por
 * ser jefe. Con pocas oleadas daba igual, pero con 30 el ultimo salia
 * con casi 59.000 de vida: imposible de tirar por mucha torre que
 * tuvieras. Con el tope se queda en algo duro pero matable.
 */
export const TOPE_VIDA_JEFE = 12;

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

  /*
   * VOLADOR: va por el aire (`altura` px por encima del camino), asi que
   * pasa por encima de las trampas de suelo y de las paredes. Solo lo
   * paran las torres, tus disparos y la trampa electrica.
   */
  volador: {
    id: 'volador', name: 'Zombi Volador', vuela: true, altura: 130,
    vida: 55, velocidad: 80, dano: 16, ritmo: 1.0,
    w: 34, h: 48, dinero: 18,
    color: '#7c8f5a', ropa: '#3a2f4a',
  },

  /*
   * ESCUDO: lleva una chapa por delante. Como camina hacia la torre, lo
   * que le llega DE FRENTE (tus disparos desde la torre) casi no le hace
   * nada; las trampas del suelo y las explosiones si. Obliga a no fiarlo
   * todo a disparar de lejos.
   */
  escudo: {
    id: 'escudo', name: 'Zombi con Escudo', escudo: 260,
    vida: 140, velocidad: 42, dano: 26, ritmo: 1.2,
    w: 40, h: 68, dinero: 26,
    color: '#5d7a45', ropa: '#2f3b55',
  },

  /*
   * BOMBA: no golpea, REVIENTA contra lo primero que encuentra (la torre,
   * una pared o tu). Si lo matas antes, explota igual... encima de los
   * zombis que tenga al lado.
   *   explosion.dano      a los zombis de alrededor
   *   explosion.danoBase  a la torre o a la pared contra la que revienta
   */
  bomba: {
    id: 'bomba', name: 'Zombi Bomba', explota: true,
    explosion: { radio: 140, dano: 90, danoBase: 160 },
    vida: 90, velocidad: 62, dano: 0, ritmo: 1.0,
    w: 32, h: 60, dinero: 22,
    color: '#8a9a50', ropa: '#7a2a2a',
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
  // LA ULTIMA OLEADA TRAE DE TODO: todos los tipos de zombi y un jefe,
  // sean cuantas sean las oleadas. Sin esto, en una partida corta (2
  // oleadas) no llegaban a salir ni los voladores, ni las bombas, ni el
  // jefe. Con 10 oleadas no cambia nada: la decima ya los traia todos.
  const ultima = n >= DEFENSA.oleadas;

  const total = 6 + n * 3;
  const rapidos = (n >= 2 || ultima) ? Math.max(1, Math.round(total * Math.min(0.35, 0.08 + n * 0.03))) : 0;
  const tanques = (n >= 4 || ultima) ? Math.max(1, 1 + Math.floor((n - 4) * 0.8)) : 0;
  // Voladores desde la 3 (obligan a tener torres, porque las trampas de
  // suelo no les tocan) y bombas desde la 5 (castigan dejar la torre sola).
  const voladores = (n >= 3 || ultima) ? Math.max(1, Math.round(total * Math.min(0.2, 0.04 + n * 0.015))) : 0;
  const bombas = (n >= 5 || ultima) ? Math.max(1, 1 + Math.floor((n - 5) * 0.6)) : 0;
  const escudos = (n >= 4 || ultima) ? Math.max(1, Math.floor((n - 3) * 0.7)) : 0;
  const normales = Math.max(3, total - rapidos - tanques - voladores - bombas - escudos);

  const lista = [{ tipo: 'normal', cuantos: normales }];
  if (rapidos) lista.push({ tipo: 'rapido', cuantos: rapidos });
  if (tanques) lista.push({ tipo: 'tanque', cuantos: tanques });
  if (voladores) lista.push({ tipo: 'volador', cuantos: voladores });
  if (bombas) lista.push({ tipo: 'bomba', cuantos: bombas });
  if (escudos) lista.push({ tipo: 'escudo', cuantos: escudos });

  const jefe = n % DEFENSA.jefeCada === 0 || ultima;
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
    // Cuanto mas duro es cada jefe que el anterior (se multiplica por la
    // dureza de la oleada, y el total lo limita TOPE_VIDA_JEFE).
    vidaJefe: Math.max(1, 1 + (n / DEFENSA.jefeCada - 1) * 0.25),
  };
}

/* =============================================================
   TORRES (disparan solas)
   -------------------------------------------------------------
   precio, alcance (px), dano, cadencia (disparos/s), velocidadBala,
   efecto del proyectil ('hielo' ralentiza, 'explosion' hace dano en
   area con `radio`, 'cadena' salta a otros, 'fuego' quema, 'aturde'
   los deja clavados un momento), perfora
   (atraviesa zombis). Y opcionales:
     dispersion   lo que se abre cada disparo (por defecto, casi nada)
     alcanceBala  hasta donde llega la bala (por defecto, alcance + 160)
     objetivo     'mas-vida': apunta al que mas vida tenga, no al cercano
     repara       no dispara: cura la torre esa vida por segundo
     maximo       cuantas se pueden poner como mucho
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
  {
    id: 'tesla', name: 'Torre Tesla',
    desc: 'Un rayo que salta de zombi en zombi.',
    precio: 280, alcance: 480, dano: 24, cadencia: 1.1, velocidadBala: 2200,
    efecto: 'cadena',
    color: '#34405c', acento: '#ffe34a',
  },
  {
    id: 'lanzallamas', name: 'Torre Lanzallamas',
    desc: 'De cerca, los deja ardiendo.',
    precio: 230, alcance: 300, dano: 6, cadencia: 9, velocidadBala: 760,
    efecto: 'fuego', dispersion: 0.22, alcanceBala: 340,
    color: '#5a3a2a', acento: '#ff7a2a',
  },
  {
    id: 'francotiradora', name: 'Torre Francotiradora',
    desc: 'Todo el camino. Apunta al que mas vida tiene.',
    precio: 350, alcance: 1400, dano: 150, cadencia: 0.35, velocidadBala: 2600,
    perfora: true, objetivo: 'mas-vida',
    color: '#3f4a3a', acento: '#b45cf0',
  },
  {
    id: 'laser', name: 'Torre Laser',
    desc: 'Rayo continuo que atraviesa a varios.',
    precio: 300, alcance: 700, dano: 18, cadencia: 4, velocidadBala: 2600,
    perfora: true,
    color: '#3a5a5c', acento: '#7ff0ff',
  },
  {
    id: 'aturdidora', name: 'Torre Aturdidora',
    desc: 'Poco dano: los deja clavados un instante.',
    precio: 260, alcance: 420, dano: 10, cadencia: 1.0, velocidadBala: 1500,
    efecto: 'aturde',
    color: '#4a3a6a', acento: '#c9a6ff',
  },
  {
    id: 'reparadora', name: 'Torre de Reparacion',
    desc: 'No dispara: va curando la torre.',
    precio: 400, repara: 10, maximo: 2,
    color: '#2f5a3a', acento: '#5fd14a',
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
  {
    // ralentiza: a que velocidad los deja (0,25 = una cuarta parte)
    id: 'pegamento', name: 'Charco de Brea',
    desc: 'No hace dano, pero los deja casi quietos.',
    precio: 70, usos: 40, dano: 0, espera: 0.6, w: 84, ralentiza: 0.25, duracion: 3,
    color: '#1f1a17', acento: '#4a3b30',
  },
  {
    id: 'mina', name: 'Mina',
    desc: 'Explota en area al pisarla. Pocos usos.',
    precio: 150, usos: 3, dano: 110, espera: 1.5, w: 44, radio: 130,
    color: '#4a4f3a', acento: '#ff3b3b',
  },
  {
    id: 'sierra', name: 'Sierra Circular',
    desc: 'Muerde fuerte y muy seguido.',
    precio: 140, usos: 25, dano: 45, espera: 0.45, w: 60,
    color: '#4a4f5c', acento: '#d8dde6',
  },
  {
    // empuje: hacia atras; fuerza: hacia arriba (poca: va a ras de suelo)
    id: 'empujador', name: 'Muro Empujador',
    desc: 'Los devuelve de un golpe hacia el portal.',
    precio: 120, usos: 18, dano: 14, espera: 0.8, w: 40, empuje: 560, fuerza: 260,
    color: '#6b5a3a', acento: '#ffb03a',
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
  { id: 'incendiario', arma: 'incendiario', rareza: 'epic', precio: 200 },
  { id: 'ballesta', arma: 'ballesta', rareza: 'epic', precio: 240 },
  { id: 'lanzagranadas', arma: 'lanzagranadas', rareza: 'legendary', precio: 360 },
];
