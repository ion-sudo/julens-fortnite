/**
 * ammo.js
 * ---------------------------------------------------------------
 * SISTEMA DE MUNICION.
 *
 * Hay cinco tipos de balas, como en Fortnite. Cada arma usa uno, y el
 * jugador lleva una RESERVA por tipo (no ocupa ranuras del inventario:
 * es un contador aparte, igual que en el juego original).
 *
 * Cada DISPARO gasta 1 bala, no una por perdigon: una escopeta gasta
 * un cartucho aunque suelte ocho perdigones.
 */

export const AMMO_TYPES = {
  ligera: {
    id: 'ligera', name: 'Ligera', short: 'LIG',
    color: '#f5b942', max: 480,
    boxAmount: 30,   // balas por caja
    boxWeight: 30,   // probabilidad relativa de que salga esta caja
    desc: 'Pistolas y subfusiles',
  },
  media: {
    id: 'media', name: 'Media', short: 'MED',
    color: '#5fd14a', max: 360,
    boxAmount: 24,
    boxWeight: 26,
    desc: 'Fusiles y minigun',
  },
  cartuchos: {
    id: 'cartuchos', name: 'Cartuchos', short: 'CAR',
    color: '#e05a4a', max: 90,
    boxAmount: 8,
    boxWeight: 20,
    desc: 'Escopetas',
  },
  pesada: {
    id: 'pesada', name: 'Pesada', short: 'PES',
    color: '#b45cf0', max: 40,
    boxAmount: 4,
    boxWeight: 14,
    desc: 'Sniper',
  },
  energia: {
    id: 'energia', name: 'Energia', short: 'ENE',
    color: '#3ad6f5', max: 60,
    boxAmount: 6,
    boxWeight: 10,
    desc: 'Julen Super Arma',
  },
};

/** Orden fijo para recorrerlos siempre igual. */
export const AMMO_ORDER = ['ligera', 'media', 'cartuchos', 'pesada', 'energia'];

/** Con lo que empieza el jugador: poco, pero suficiente para arrancar. */
export const STARTING_AMMO = {
  ligera: 60,
  media: 40,
  cartuchos: 8,
  pesada: 3,
  energia: 6,
};

/** Datos de un tipo de municion. */
export function ammoInfo(id) {
  return AMMO_TYPES[id] || AMMO_TYPES.ligera;
}

/** Color del tipo de municion que usa un arma. */
export function ammoColorOf(weapon) {
  return ammoInfo(weapon?.def?.ammo).color;
}
