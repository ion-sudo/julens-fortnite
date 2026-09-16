/**
 * minigames.js
 * ---------------------------------------------------------------
 * CATALOGO DE MINIJUEGOS (solo datos).
 *
 * Todos se juegan con los mismos sistemas del battle royale (movimiento,
 * salto, raton, armas, construccion): un minijuego solo decide QUE se
 * monta en el escenario y CUANDO se acaba.
 *
 * Campos:
 *   id        identificador (se usa para guardar el record)
 *   name      titulo
 *   desc      de que va, en una linea
 *   goal      el objetivo, para el cartel de la pantalla de seleccion
 *   icon      dibujo de la tarjeta (ver ui/minigameIcon.js)
 *   color     color de acento de la tarjeta
 *   score     como se puntua:
 *               'points' -> mas es mejor (aciertos, monedas)
 *               'time'   -> MENOS es mejor (crono de la carrera)
 *               'survive'-> MAS es mejor, pero en segundos (aguantar)
 *               'none'   -> sin record (modos libres)
 *   unit      texto de la unidad, para pintar el record
 *   ready     si ya esta implementado
 *   hidden    no sale en la pantalla de MINIJUEGOS (ver JULEN DEFENSA)
 */

export const MINIGAMES = [
  {
    id: 'tiro', name: 'Campo de tiro', icon: 'diana', color: '#e0554d',
    desc: 'Dianas por todo el campo y un minuto para reventarlas.',
    goal: 'Acierta a todas las dianas que puedas en 60 s',
    score: 'points', unit: 'dianas', ready: true,
  },
  {
    id: 'entreno', name: 'Zona de entrenamiento', icon: 'maniqui', color: '#3aa2f5',
    desc: 'Maniquies y todas las armas del juego para probarlas a gusto.',
    goal: 'Prueba las 10 armas sin que nadie te dispare',
    score: 'none', unit: '', ready: true,
  },
  {
    id: 'parkour', name: 'Carrera de obstaculos', icon: 'bandera', color: '#5fd14a',
    desc: 'Un recorrido de plataformas de la salida a la meta.',
    goal: 'Llega a la meta lo mas rapido que puedas',
    score: 'time', unit: 's', ready: true,
    // Tres recorridos distintos, cada uno con su record (ver
    // data/parkourLevels.js). La tarjeta del menu saca un boton por nivel.
    levels: 'parkour',
  },
  {
    id: 'caja', name: 'Caja de construccion', icon: 'ladrillo', color: '#c08a4e',
    desc: 'Una zona tranquila con madera infinita para practicar.',
    goal: 'Construye lo que quieras, sin prisa y sin enemigos',
    score: 'none', unit: '', ready: true,
  },
  {
    id: 'duelo', name: '1 contra 1', icon: 'duelo', color: '#b45cf0',
    desc: 'Un escenario pequeno, un bot y solo puede quedar uno.',
    goal: 'Elimina al rival antes de que te elimine',
    score: 'points', unit: 'victorias', ready: true,
  },
  {
    id: 'monedas', name: 'Recoge-monedas', icon: 'moneda', color: '#ffd23f',
    desc: 'Monedas repartidas por la isla y el reloj en contra.',
    goal: 'Pilla todas las monedas que puedas en 60 s',
    score: 'points', unit: 'monedas', ready: true,
  },
  {
    id: 'pilla', name: 'Pilla-pilla', icon: 'huella', color: '#ff8a3d',
    desc: 'Once jugadores, uno la queda. A quien pillan, tambien pilla.',
    goal: '30 s para esconderse y 2:30 de caceria',
    score: 'survive', unit: 's', ready: true,
    // El papel te toca al azar, y aguantar libre no se puede comparar con
    // pillar: cada uno lleva su record ('pilla:escondido' / 'pilla:contador').
    roles: true,
  },
  {
    // JULEN DEFENSA no es un minijuego: es un MODO de MAS JUEGOS. Esta
    // entrada existe solo para reutilizar el montaje de minijuegos
    // (arena, marcador, pantalla de fin y record). `hidden` la saca de
    // la pantalla de MINIJUEGOS.
    id: 'defensa', name: 'Julen Defensa', icon: 'diana', color: '#e8434f',
    desc: 'Defiende la torre de oleadas de zombis.',
    goal: 'Aguanta las 2 oleadas sin que caiga la torre',
    score: 'points', unit: 'oleadas', ready: true,
    hidden: true,
  },
];

/**
 * Busca un minijuego por id.
 * Los modos con niveles guardan el record como 'parkour:dificil', asi que
 * se admite el id con sufijo y se busca por la parte de delante.
 */
export function minigameById(id) {
  const base = String(id).split(':')[0];
  return MINIGAMES.find((m) => m.id === base);
}

/**
 * ¿Es este resultado mejor que el record guardado?
 * En los de tiempo gana el MENOR; en el resto, el mayor.
 */
export function isBetter(def, valor, record) {
  if (record === null || record === undefined) return true;
  return def.score === 'time' ? valor < record : valor > record;
}

/** Da formato al record para pintarlo. */
export function formatScore(def, valor) {
  if (valor === null || valor === undefined) return '—';
  if (def.score === 'time' || def.score === 'survive') {
    return `${Number(valor).toFixed(1)} ${def.unit}`;
  }
  return `${valor} ${def.unit}`;
}
