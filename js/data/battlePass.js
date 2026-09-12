/**
 * battlePass.js
 * ---------------------------------------------------------------
 * EL PASE DE BATALLA: 100 niveles de recompensas.
 *
 * Hay dos rutas:
 *   GRATIS   unas pocas recompensas sueltas, para todo el mundo
 *   PREMIUM  la ruta completa; se compra una vez por PRECIO_PREMIUM pavos
 *
 * Cada nivel del pase se desbloquea al llegar a ESE nivel de jugador
 * (el sistema de XP de data/levels.js). No hay que reclamar nada a mano:
 * al subir de nivel, lo que toque se entrega solo.
 *
 * Los cosmeticos del pase estan marcados con `pass: true` en
 * data/cosmetics.js y NO se venden en la tienda: solo se consiguen aqui.
 *
 * Cada recompensa es:
 *   { type: 'skin' | 'pickaxe' | 'glider', id }
 *   { type: 'vbucks', amount }
 *   { type: 'xp',     amount }
 */

import { MAX_LEVEL } from './levels.js';

/** Lo que cuesta el pase premium. */
export const PRECIO_PREMIUM = 4000;

/* =============================================================
   COSMETICOS DEL PASE, EN ORDEN
   Los grandes caen en niveles redondos, como en Fortnite.
   ============================================================= */
const COSMETICOS_PREMIUM = [
  [1,   { type: 'skin',    id: 'pass_cadete' }],
  [5,   { type: 'pickaxe', id: 'pass_remo' }],
  [10,  { type: 'glider',  id: 'pass_planeador' }],
  [15,  { type: 'skin',    id: 'pass_bosque' }],
  [20,  { type: 'pickaxe', id: 'pass_garra' }],
  [25,  { type: 'glider',  id: 'pass_hoja' }],
  [30,  { type: 'skin',    id: 'pass_tormenta' }],
  [35,  { type: 'pickaxe', id: 'pass_rayo' }],
  [40,  { type: 'glider',  id: 'pass_nube' }],
  [45,  { type: 'skin',    id: 'pass_magma' }],
  [50,  { type: 'pickaxe', id: 'pass_fundido' }],
  [55,  { type: 'glider',  id: 'pass_fenix' }],
  [60,  { type: 'skin',    id: 'pass_neon' }],
  [65,  { type: 'pickaxe', id: 'pass_sierra' }],
  [70,  { type: 'glider',  id: 'pass_jet' }],
  [75,  { type: 'skin',    id: 'pass_arena' }],
  [85,  { type: 'pickaxe', id: 'pass_cetro' }],
  [90,  { type: 'skin',    id: 'pass_cosmos' }],
  [95,  { type: 'glider',  id: 'pass_medusa' }],
  // El conjunto ECLIPSE cierra el pase: paravela, pico y skin.
  [96,  { type: 'glider',  id: 'pass_eclipse' }],
  [98,  { type: 'pickaxe', id: 'pass_eclipse' }],
  [100, { type: 'skin',    id: 'pass_eclipse' }],
];

/**
 * Recompensas de la ruta GRATIS. Pocas y repartidas, como debe ser:
 * lo justo para que jugar sin pagar tambien de algo.
 */
const GRATIS = [
  [3,   { type: 'vbucks',  amount: 50 }],
  [8,   { type: 'pickaxe', id: 'llave' }],
  [14,  { type: 'vbucks',  amount: 75 }],
  [22,  { type: 'glider',  id: 'cometa' }],
  [31,  { type: 'vbucks',  amount: 100 }],
  [42,  { type: 'skin',    id: 'cartero' }],
  [53,  { type: 'vbucks',  amount: 100 }],
  [64,  { type: 'pickaxe', id: 'zanahoria' }],
  [72,  { type: 'vbucks',  amount: 125 }],
  [81,  { type: 'glider',  id: 'hoja' }],
  [88,  { type: 'vbucks',  amount: 150 }],
  // El nivel 100 gratis da pavos, no un exclusivo: el conjunto ECLIPSE
  // es el premio del pase premium.
  [100, { type: 'vbucks',  amount: 200 }],
];

/**
 * Niveles premium que dan PAVOS.
 *
 * Estan repartidos para que, completando el pase, se recuperen 3100 de
 * los 4000 que cuesta. No cubre el precio entero a proposito: la gracia
 * son los cosmeticos, y aun asi sale muy rentable.
 */
const PAVOS_PREMIUM = [
  [3, 100], [7, 100], [12, 100], [17, 100], [22, 100], [27, 125],
  [32, 125], [37, 125], [42, 125], [47, 125], [52, 150], [57, 150],
  [62, 150], [67, 150], [72, 150], [77, 175], [82, 175],
  [87, 175], [92, 200], [97, 200], [99, 300],
];

/* =============================================================
   LA TABLA COMPLETA
   ============================================================= */

/**
 * Relleno de los niveles sueltos: ninguno se queda vacio.
 *
 * Se alterna propina de pavos con bonus de XP a proposito. Si todos
 * dieran pavos, el pase devolveria mas de 5000 y saldria mas a cuenta
 * comprarlo que jugar; asi el total se queda en torno a 3000 de los
 * 4000 que cuesta, que es lo que se buscaba.
 */
const EXTRAS = [
  { type: 'vbucks', amount: 10 },
  { type: 'xp', amount: 250 },
  { type: 'vbucks', amount: 15 },
  { type: 'xp', amount: 300 },
];

function construirNiveles() {
  const premium = new Map(COSMETICOS_PREMIUM);
  for (const [n, amount] of PAVOS_PREMIUM) premium.set(n, { type: 'vbucks', amount });

  const gratis = new Map(GRATIS);
  const out = [];

  for (let n = 1; n <= MAX_LEVEL; n++) {
    out.push({
      level: n,
      free: gratis.get(n) || null,
      // Los niveles premium sin nada asignado dan una propina de pavos:
      // asi ninguno se queda vacio.
      premium: premium.get(n) || EXTRAS[n % EXTRAS.length],
    });
  }
  return out;
}

/** Los 100 niveles, ya montados. */
export const PASS_LEVELS = construirNiveles();

/** Cuantos pavos da la ruta premium en total. */
export function totalVbucksPremium() {
  return PASS_LEVELS.reduce(
    (a, n) => a + (n.premium?.type === 'vbucks' ? n.premium.amount : 0), 0);
}

/** Cuantos pavos da la ruta gratis en total. */
export function totalVbucksGratis() {
  return PASS_LEVELS.reduce(
    (a, n) => a + (n.free?.type === 'vbucks' ? n.free.amount : 0), 0);
}

/** Recompensas de un nivel concreto. */
export function passLevel(n) {
  return PASS_LEVELS[n - 1] || null;
}
