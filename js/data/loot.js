/**
 * loot.js
 * ---------------------------------------------------------------
 * GENERACION DE BOTIN: decide que arma o cura sale, con que rareza,
 * y crea la "instancia" que acaba en el inventario del jugador.
 *
 * Distincion importante:
 *   - DEFINICION (data/weapons.js, data/heals.js): el modelo, comun a todos.
 *   - INSTANCIA (lo que devuelve este modulo): un objeto concreto del mundo,
 *     con su rareza y su dano ya calculado.
 */

import { RARITIES, RARITY_DROPS, rarityRank } from './rarities.js';
import { weaponsFor } from './weapons.js';
import { HEALS } from './heals.js';
import { THROWABLES } from './throwables.js';
import { GADGETS } from './gadgets.js';
import { AMMO_TYPES, AMMO_ORDER, ammoInfo } from './ammo.js';

/** Proporcion de armas frente a curas al generar botin suelto. */
const WEAPON_SHARE = 0.6;

let nextUid = 1;

/* =============================================================
   SORTEOS
   ============================================================= */

/**
 * Elige un elemento de una lista segun su `dropWeight`.
 * @param {Array} list
 * @param {() => number} rng  generador [0,1)
 */
function pickWeighted(list, rng) {
  const total = list.reduce((sum, item) => sum + item.dropWeight, 0);
  let roll = rng() * total;
  for (const item of list) {
    roll -= item.dropWeight;
    if (roll <= 0) return item;
  }
  return list[list.length - 1];
}

/**
 * Sortea una rareza. `minRarity` sube el suelo: las rarezas por debajo
 * no entran en el sorteo (asi el Julen nunca sale gris).
 */
export function rollRarity(rng = Math.random, minRarity = 'common') {
  const min = rarityRank(minRarity);
  // RARITY_DROPS y no RARITY_ORDER: la exotica no se sortea NUNCA, solo
  // se da a mano (ver data/rarities.js). Si estuviera en la lista, el
  // respaldo de pickWeighted podria acabar devolviendola por ser la
  // ultima, y saldrian exoticas por el suelo.
  const candidatas = RARITY_DROPS
    .filter((id) => rarityRank(id) >= min)
    .map((id) => RARITIES[id]);

  if (candidatas.length === 0) return minRarity;
  return pickWeighted(candidatas, rng).id;
}

/* =============================================================
   CREACION DE INSTANCIAS
   ============================================================= */

/**
 * Crea un arma concreta lista para usar.
 * @param {object} def     entrada de la lista de armas
 * @param {string} rarity  id de rareza
 */
export function makeWeapon(def, rarity) {
  const mult = RARITIES[rarity].damageMult;
  return {
    uid: nextUid++,
    kind: 'weapon',
    def,
    rarity,
    // El dano ya viene multiplicado por la rareza: quien dispara no
    // tiene que saber nada de rarezas.
    damage: Math.round(def.damage * mult),
    name: def.name,
  };
}

/**
 * Crea una cura concreta.
 * @param {object} def    entrada de HEALS
 * @param {number} count  unidades (se apilan en la ranura)
 */
export function makeHeal(def, count = 1) {
  return {
    uid: nextUid++,
    kind: 'heal',
    def,
    rarity: def.rarity,          // las curas tienen rareza fija
    count: Math.min(count, def.stack),
    name: def.name,
  };
}

/* =============================================================
   BOTIN ALEATORIO
   ============================================================= */

/* =============================================================
   QUE ARMAS ENTRAN EN EL SORTEO
   ============================================================= */

/**
 * Armas del modo en curso. Arranca con las de siempre y la cambia
 * game.startMatch() al empezar una partida.
 *
 * Es una variable de modulo y no un parametro a proposito: por aqui
 * pasan TODOS los sorteos de arma del juego (suelo, cofres, bots,
 * premios de nivel), y encadenar el modo por los cuatro sitios habria
 * sido cuatro sitios donde olvidarselo. Aqui hay un solo interruptor.
 */
let POOL = weaponsFor('royale');

/** Fija las armas que pueden salir en la partida que empieza. */
export function setWeaponPool(mode) {
  POOL = weaponsFor(mode);
  return POOL;
}

/** Las armas del modo en curso (solo lectura). */
export function weaponPool() {
  return POOL;
}

/**
 * Un tipo de arma al azar SIN pesos: todas con la misma probabilidad.
 * La usan los premios de nivel Blitz, donde el arma ya viene con su
 * rareza decidida y lo unico que se sortea es cual toca.
 */
export function randomWeaponDef(rng = Math.random) {
  // Los aparatos que no disparan (la Grieta Portatil) se quedan fuera:
  // como premio de subir de nivel, un arma que no dispara decepciona.
  const armas = POOL.filter((w) => !w.effect);
  return armas[Math.floor(rng() * armas.length)];
}

/** Un arma al azar, respetando probabilidades de arma y de rareza. */
export function rollWeapon(rng = Math.random) {
  const def = pickWeighted(POOL, rng);
  return makeWeapon(def, rollRarity(rng, def.minRarity));
}

/** Una cura al azar (con una cantidad razonable segun lo que apile). */
export function rollHeal(rng = Math.random) {
  const def = pickWeighted(HEALS, rng);
  const count = 1 + Math.floor(rng() * def.stack);
  return makeHeal(def, count);
}

/**
 * Crea un puñado de granadas.
 * @param {object} def    entrada de THROWABLES
 * @param {number} count  unidades (se apilan en la ranura)
 */
export function makeThrowable(def, count = 1) {
  return {
    uid: nextUid++,
    kind: 'throwable',
    def,
    rarity: def.rarity,          // fija, como las curas
    count: Math.min(count, def.stack),
    name: def.name,
  };
}

/** Granadas al azar, en una cantidad razonable. */
export function rollThrowable(rng = Math.random) {
  const def = pickWeighted(THROWABLES, rng);
  const count = 2 + Math.floor(rng() * 2);   // 2 o 3
  return makeThrowable(def, count);
}

/**
 * Crea torretas o trampas para llevar en el inventario.
 * @param {object} def    entrada de GADGETS
 * @param {number} count  unidades (se apilan en la ranura)
 */
export function makeGadget(def, count = 1) {
  return {
    uid: nextUid++,
    kind: 'gadget',
    def,
    rarity: def.rarity,          // fija, como las curas y las granadas
    count: Math.min(count, def.stack),
    name: def.name,
  };
}

/** Una torreta o una trampa al azar. */
export function rollGadget(rng = Math.random) {
  const def = pickWeighted(GADGETS, rng);
  // De una en una, o dos si es la trampa (que apila mas y pega menos).
  const count = def.stack > 2 && rng() < 0.5 ? 2 : 1;
  return makeGadget(def, count);
}

/* =============================================================
   CAJAS DE MUNICION
   No ocupan ranura del inventario: al cogerlas suman a la reserva.
   ============================================================= */

/**
 * Crea una caja de municion.
 * @param {string} type  id del tipo (ligera, media, cartuchos...)
 * @param {number} [amount]  balas; por defecto las de ese tipo
 */
export function makeAmmoBox(type, amount) {
  const info = ammoInfo(type);
  return {
    uid: nextUid++,
    kind: 'ammo',
    ammoType: info.id,
    amount: amount ?? info.boxAmount,
    // Las cajas no tienen rareza propia: se pintan del color del tipo.
    rarity: 'common',
    name: `Balas ${info.name}`,
  };
}

/** Una caja de municion al azar (las ligeras y medias, mas probables). */
export function rollAmmoBox(rng = Math.random) {
  const lista = AMMO_ORDER.map((id) => AMMO_TYPES[id]);
  const total = lista.reduce((sum, a) => sum + a.boxWeight, 0);
  let t = rng() * total;
  for (const a of lista) {
    t -= a.boxWeight;
    if (t <= 0) return makeAmmoBox(a.id);
  }
  return makeAmmoBox('ligera');
}

/** Proporcion del botin de COFRE que son granadas. */
const CHEST_THROW_SHARE = 0.28;
/** Y de los que quedan, cuantos son torretas o trampas. */
const CHEST_GADGET_SHARE = 0.22;

/** Proporcion del botin del suelo que son cajas de municion. */
const AMMO_SHARE = 0.34;
/**
 * Y proporcion (del resto) que son granadas.
 *
 * Empezo en 0,14 y salia UNA CADA 5168 px de mapa: como en pantalla
 * caben 1024, habia que recorrer cinco pantallas para tropezarse con
 * una, y una partida entera podia pasar sin ver ninguna. Con 0,30 sale
 * una cada 1500 px, o sea que en el primer minuto ya has visto varias.
 */
const THROW_SHARE = 0.30;

/**
 * Proporcion (del resto) que son torretas o trampas.
 *
 * Con 0,13 salian TRES en una partida entera de Royale, o sea que casi
 * nadie llegaba a ver una. Misma leccion que con las granadas: si hay
 * que recorrer medio mapa para encontrar algo, ese algo no existe.
 */
const GADGET_SHARE = 0.24;

/** Botin generico: municion, granadas, trastos, armas o curas. */
export function rollLoot(rng = Math.random) {
  if (rng() < AMMO_SHARE) return rollAmmoBox(rng);
  if (rng() < THROW_SHARE) return rollThrowable(rng);
  if (rng() < GADGET_SHARE) return rollGadget(rng);
  return rng() < WEAPON_SHARE ? rollWeapon(rng) : rollHeal(rng);
}

/* =============================================================
   BOTIN DE COFRE
   -------------------------------------------------------------
   Los cofres dan MEJORES cosas que el botin suelto del suelo.
   El truco es simple y facil de razonar: se tira la rareza DOS
   veces y se queda la mejor de las dos ("best of 2"). Eso desplaza
   la distribucion hacia arriba sin romper el orden de rarezas:
   lo comun sigue siendo lo mas probable y lo mitico lo mas raro.
   ============================================================= */

/** Cuantas tiradas de rareza hace un cofre (se queda con la mejor). */
const CHEST_RARITY_ROLLS = 2;
/** Los cofres dan armas con algo mas de frecuencia que curas. */
const CHEST_WEAPON_SHARE = 0.62;

/** Rareza "de cofre": la mejor de varias tiradas. */
export function rollChestRarity(rng = Math.random, minRarity = 'common') {
  let mejor = rollRarity(rng, minRarity);
  for (let i = 1; i < CHEST_RARITY_ROLLS; i++) {
    const otra = rollRarity(rng, minRarity);
    if (rarityRank(otra) > rarityRank(mejor)) mejor = otra;
  }
  return mejor;
}

/** Un arma de cofre. */
export function rollChestWeapon(rng = Math.random) {
  const def = pickWeighted(POOL, rng);
  return makeWeapon(def, rollChestRarity(rng, def.minRarity));
}

/**
 * Una cura de cofre. Las curas tienen rareza fija, asi que aqui la
 * mejora consiste en dar mas unidades y sortear dos veces quedandose
 * con la mejor de las dos.
 */
export function rollChestHeal(rng = Math.random) {
  let def = pickWeighted(HEALS, rng);
  const otra = pickWeighted(HEALS, rng);
  if (rarityRank(otra.rarity) > rarityRank(def.rarity)) def = otra;

  const count = Math.max(1, Math.ceil(rng() * def.stack));
  return makeHeal(def, count);
}

/** Un objeto suelto de los que escupe un cofre. */
export function rollChestLoot(rng = Math.random) {
  // Los cofres tambien dan granadas, y mas que el suelo: es donde se
  // supone que se va a por material de guerra.
  if (rng() < CHEST_THROW_SHARE) return rollThrowable(rng);
  if (rng() < CHEST_GADGET_SHARE) return rollGadget(rng);
  return rng() < CHEST_WEAPON_SHARE ? rollChestWeapon(rng) : rollChestHeal(rng);
}
