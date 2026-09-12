/**
 * rarities.js
 * ---------------------------------------------------------------
 * RAREZAS del juego, compartidas por cosmeticos, armas y curas.
 *
 * Cuanto mas rara es una pieza:
 *   - menos probable es que aparezca  (dropWeight mas bajo)
 *   - mas dano hace si es un arma     (damageMult mas alto)
 *
 * Antes vivian dentro de cosmetics.js; se han sacado aqui para que
 * las armas no dependan del catalogo de la tienda.
 *
 * LA EXOTICA ES DISTINTA A TODAS: tiene `dropWeight: 0`, o sea que
 * NUNCA sale en un sorteo de botin. No aparece por el suelo, ni en un
 * cofre normal, ni en el Julen Royale. Solo se consigue a mano, y hoy
 * solo hay dos formas, las dos en el Julen Blitz:
 *
 *   - llegando al NIVEL BLITZ 8, el ultimo
 *   - con suerte (1 de cada 10) en un cofre dorado
 */

export const RARITIES = {
  common:    { id: 'common',    name: 'Comun',       color: '#b1b6c1', glow: '#e6e9ef', dropWeight: 40, damageMult: 1.00 },
  uncommon:  { id: 'uncommon',  name: 'Poco comun',  color: '#5fd14a', glow: '#b8f5aa', dropWeight: 26, damageMult: 1.15 },
  rare:      { id: 'rare',      name: 'Raro',        color: '#3aa2f5', glow: '#a8dcff', dropWeight: 17, damageMult: 1.32 },
  epic:      { id: 'epic',      name: 'Epico',       color: '#b45cf0', glow: '#e2b6ff', dropWeight: 10, damageMult: 1.52 },
  legendary: { id: 'legendary', name: 'Legendario',  color: '#f5822b', glow: '#ffc98a', dropWeight:  5, damageMult: 1.75 },
  mythic:    { id: 'mythic',    name: 'Mitico',      color: '#ffd23f', glow: '#fff3b0', dropWeight:  2, damageMult: 2.05 },
  exotic:    { id: 'exotic',    name: 'Exotico',     color: '#22e0c0', glow: '#a8fff0', dropWeight:  0, damageMult: 2.45 },
};

/** De menos a mas rara. El indice sirve para comparar ("al menos raro"). */
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'exotic'];

/**
 * Las rarezas que SI entran en un sorteo de botin. Se saca aparte
 * porque `RARITY_ORDER` tambien sirve para comparar (rarityRank), y ahi
 * la exotica tiene que estar la ultima aunque no se pueda sortear.
 */
export const RARITY_DROPS = RARITY_ORDER.filter((id) => RARITIES[id].dropWeight > 0);

/** Datos de rareza de cualquier objeto que tenga `.rarity`. */
export function rarityOf(item) {
  return RARITIES[item?.rarity] || RARITIES.common;
}

/** Color de una rareza por su id. */
export function rarityColor(id) {
  return (RARITIES[id] || RARITIES.common).color;
}

/** Posicion en la escala (0 = comun ... 5 = mitico). */
export function rarityRank(id) {
  const i = RARITY_ORDER.indexOf(id);
  return i === -1 ? 0 : i;
}
