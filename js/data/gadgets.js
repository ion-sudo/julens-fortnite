/**
 * gadgets.js
 * ---------------------------------------------------------------
 * TRASTOS QUE SE COLOCAN: torretas y trampas.
 *
 * Se recogen como cualquier objeto y van en una ranura del inventario,
 * apilados, igual que las granadas. Se equipan con las teclas 1..5 y se
 * colocan con el CLIC IZQUIERDO donde apunte el raton.
 *
 * Una vez puestos funcionan SOLOS y ya no son tuyos en ningun sentido
 * util: siguen ahi aunque te vayas, tienen vida y se pueden reventar a
 * tiros o a picotazos.
 *
 * Campos comunes:
 *   id, name, rarity, stack, dropWeight
 *   kindOf     'torreta' | 'trampa'  (como se comporta)
 *   health     vida de lo colocado
 *   w, h       tamano de lo colocado
 *   armTime    segundos hasta que empieza a funcionar
 *
 * Torreta:
 *   range      hasta donde ve y dispara
 *   damage     dano por disparo
 *   fireRate   disparos por segundo
 *   bulletSpeed
 *
 * Trampa:
 *   damage     dano a quien la toca
 *   cooldown   segundos entre golpe y golpe al mismo objetivo
 */

export const GADGETS = [
  {
    id: 'torreta', name: 'Torreta', kindOf: 'torreta',
    rarity: 'epic', stack: 2, dropWeight: 45,
    health: 260, w: 42, h: 40, armTime: 1.2,
    range: 620, damage: 11, fireRate: 2.6, bulletSpeed: 1500,
    color: '#5b6874', dark: '#3a4149', accent: '#e8434f',
    desc: 'Se coloca y dispara sola a quien se acerque.',
  },
  {
    id: 'trampa', name: 'Trampa de Pinchos', kindOf: 'trampa',
    rarity: 'rare', stack: 3, dropWeight: 55,
    health: 130, w: 74, h: 18, armTime: 0.6,
    damage: 52, cooldown: 1.1,
    color: '#7a4b26', dark: '#573418', accent: '#c8d0dc',
    desc: 'Pinchos en el suelo. Al que la pise le duele.',
  },
];

/** Un trasto por su id. */
export function gadgetById(id) {
  return GADGETS.find((g) => g.id === id) || GADGETS[0];
}

/** Distancia maxima a la que se puede colocar algo. */
export const PLACE_RANGE = 260;
