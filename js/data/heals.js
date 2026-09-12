/**
 * heals.js
 * ---------------------------------------------------------------
 * LAS 10 CURAS. A diferencia de las armas, cada cura tiene una rareza
 * FIJA (como en Fortnite: las vendas siempre son grises).
 *
 * Campos:
 *   rarity     rareza fija -> color con el que se ve
 *   dropWeight probabilidad relativa de aparecer
 *   health     vida que devuelve (0 = ninguna)
 *   shield     escudo que devuelve (0 = ninguno)
 *   healthCap  no cura por encima de este limite (vendas: hasta 75)
 *   shieldCap  limite de escudo que puede alcanzar
 *   useTime    segundos que tarda en aplicarse
 *   stack      cuantas caben en una ranura del inventario
 */

export const HEALS = [
  {
    id: 'manzana', name: 'Manzana de Pino', kind: 'heal', rarity: 'common',
    dropWeight: 18, health: 5, shield: 0, healthCap: 100, shieldCap: 0,
    useTime: 0.5, stack: 6, shape: 'manzana',
    desc: 'Se come de un bocado. Poca vida, pero instantanea.',
  },
  {
    id: 'setas', name: 'Setas del Bosque', kind: 'heal', rarity: 'common',
    dropWeight: 16, health: 0, shield: 5, healthCap: 0, shieldCap: 100,
    useTime: 0.4, stack: 6, shape: 'setas',
    desc: 'Crecen a la sombra de los pinos y dan un puntito de escudo.',
  },
  {
    id: 'vendas', name: 'Vendas', kind: 'heal', rarity: 'common',
    dropWeight: 15, health: 15, shield: 0, healthCap: 75, shieldCap: 0,
    useTime: 2.5, stack: 5, shape: 'vendas',
    desc: 'Curan hasta 75 de vida, no mas.',
  },
  {
    id: 'mini-escudo', name: 'Mini Escudo', kind: 'heal', rarity: 'uncommon',
    dropWeight: 14, health: 0, shield: 25, healthCap: 0, shieldCap: 50,
    useTime: 2.0, stack: 4, shape: 'frasco-pequeno',
    desc: 'Sube el escudo hasta 50. Rapido de tomar.',
  },
  {
    id: 'botiquin', name: 'Botiquin', kind: 'heal', rarity: 'uncommon',
    dropWeight: 12, health: 100, shield: 0, healthCap: 100, shieldCap: 0,
    useTime: 5.0, stack: 2, shape: 'botiquin',
    desc: 'Deja la vida al maximo, pero tardas cinco segundos.',
  },
  {
    id: 'escudo-grande', name: 'Escudo Grande', kind: 'heal', rarity: 'rare',
    dropWeight: 9, health: 0, shield: 50, healthCap: 0, shieldCap: 100,
    useTime: 4.5, stack: 3, shape: 'frasco-grande',
    desc: 'Medio escudo de golpe. Buscate un sitio tranquilo.',
  },
  {
    id: 'refresco', name: 'Refresco de la Isla', kind: 'heal', rarity: 'rare',
    dropWeight: 7, health: 40, shield: 40, healthCap: 100, shieldCap: 100,
    useTime: 5.0, stack: 2, shape: 'lata',
    desc: 'Vida y escudo a la vez. La bebida oficial de la isla.',
  },
  {
    id: 'pocima', name: 'Pocima de Tormenta', kind: 'heal', rarity: 'epic',
    dropWeight: 5, health: 0, shield: 100, healthCap: 0, shieldCap: 100,
    useTime: 6.0, stack: 2, shape: 'pocima',
    desc: 'Escudo al maximo. Seis segundos muy largos.',
  },
  {
    id: 'nectar', name: 'Nectar Dorado', kind: 'heal', rarity: 'legendary',
    dropWeight: 3, health: 50, shield: 50, healthCap: 100, shieldCap: 100,
    useTime: 3.0, stack: 2, shape: 'nectar',
    desc: 'Mucha cura en poco tiempo. Un lujo.',
  },
  {
    id: 'elixir', name: 'Elixir Julen', kind: 'heal', rarity: 'mythic',
    dropWeight: 1, health: 100, shield: 100, healthCap: 100, shieldCap: 100,
    useTime: 2.0, stack: 1, shape: 'elixir',
    desc: 'Vida y escudo al maximo en dos segundos. Casi no existe.',
  },
];

/** Busca una cura por id. */
export function findHeal(id) {
  return HEALS.find((h) => h.id === id);
}
