/**
 * vehicles.js
 * ---------------------------------------------------------------
 * TIPOS DE VEHICULO (solo datos).
 *
 * El mapa mide casi 18.000 px y cruzarlo a pie se hace largo: un coche
 * va al doble de rapido que corriendo, asi que un viaje de punta a punta
 * pasa de unos 45 segundos a menos de 20.
 *
 * Campos:
 *   w, h        tamano de la caja de colision
 *   speed       velocidad maxima
 *   accel       lo que tarda en coger la velocidad
 *   brake       frenada al soltar
 *   jump        impulso del salto (0 = no salta)
 *   stepUp      escalon que sube solo, sin saltar. Tiene que ser
 *               generoso: el terreno esta lleno de bordillos y con un
 *               valor pequeno el coche se paraba en todos ellos. Lo que
 *               no llega, se salta.
 *   seatY       donde van los PIES del conductor, medido desde el techo
 *               del chasis hacia abajo. En positivo queda metido dentro
 *               del vehiculo; en negativo parecia ir de pie encima.
 *   colores     chasis, techo, cristal, ruedas y detalles
 */

export const VEHICLE_TYPES = {
  buggy: {
    id: 'buggy', label: 'Buggy',
    w: 74, h: 34,
    speed: 780, accel: 1400, brake: 1600,
    jump: 700, stepUp: 58,
    seatY: 14,
    body: '#e0554d', bodyDark: '#a8352f', roof: '#2a2f45',
    glass: '#a8d8e8', wheel: '#20242f', rim: '#c8d0dc', accent: '#ffd23f',
  },
  furgo: {
    id: 'furgo', label: 'Furgoneta',
    w: 88, h: 42,
    speed: 640, accel: 1000, brake: 1300,
    jump: 640, stepUp: 58,
    seatY: 20,
    body: '#3f7fe8', bodyDark: '#2456a8', roof: '#dfe8f2',
    glass: '#bfefff', wheel: '#20242f', rim: '#8d97a6', accent: '#ffffff',
  },
  kart: {
    id: 'kart', label: 'Kart',
    w: 62, h: 28,
    speed: 900, accel: 1800, brake: 1900,
    jump: 760, stepUp: 52,
    seatY: 12,
    body: '#5fd14a', bodyDark: '#2f8c49', roof: null,
    glass: null, wheel: '#20242f', rim: '#ffd23f', accent: '#ffd23f',
  },
};

/** Un tipo por su id (buggy por defecto). */
export function vehicleType(id) {
  return VEHICLE_TYPES[id] || VEHICLE_TYPES.buggy;
}

/**
 * Que vehiculo va en cada sitio del mapa.
 * Se pone uno por zona para que siempre haya alguno cerca de donde caigas.
 */
export const VEHICLE_SPAWNS = [
  { zone: 'pinar',   type: 'buggy', at: 0.55 },
  { zone: 'cala',    type: 'kart',  at: 0.45 },
  { zone: 'villa',   type: 'furgo', at: 0.42 },
  { zone: 'villa',   type: 'buggy', at: 0.80 },
  { zone: 'cumbre',  type: 'buggy', at: 0.52 },
  { zone: 'fabrica', type: 'furgo', at: 0.38 },
  { zone: 'fabrica', type: 'kart',  at: 0.70 },
  { zone: 'mansion', type: 'buggy', at: 0.40 },
  { zone: 'dunas',   type: 'kart',  at: 0.52 },
  // Los tres sitios nuevos. La furgo va al puerto (es el sitio mas
  // largo de recorrer) y el kart a la feria, que esta despejada.
  { zone: 'puerto',  type: 'furgo', at: 0.35 },
  { zone: 'feria',   type: 'kart',  at: 0.60 },
  { zone: 'volcan',  type: 'buggy', at: 0.45 },
];
