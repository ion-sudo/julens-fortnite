/**
 * throwables.js
 * ---------------------------------------------------------------
 * OBJETOS QUE SE LANZAN (granadas y explosivos).
 *
 * Van en una ranura del inventario, como las curas: se equipan con las
 * teclas 1..5 y se lanzan con el CLIC IZQUIERDO. No hacia falta ninguna
 * tecla nueva, y ademas es como funciona en Fortnite.
 *
 * Se APILAN: llevas varias en la misma ranura y el HUD muestra cuantas
 * quedan. Cada lanzamiento gasta una, y al llegar a cero la ranura se
 * queda libre.
 *
 * Campos:
 *   id          identificador
 *   name        nombre
 *   rarity      rareza FIJA (como las curas, no se sortea)
 *   stack       cuantas caben en una ranura
 *   dropWeight  probabilidad relativa de que salga esta y no otra
 *   fuse        segundos hasta que explota
 *   fuseOnRest  al quedarse quieta en el suelo, la mecha se recorta a
 *               esto: tirarla a los pies de alguien tiene que responder
 *   radius      radio de la explosion (px)
 *   damage      dano en el centro (en el borde se queda en `minDamage`)
 *   minDamage   dano justo en el borde del radio
 *   structMult  multiplica el dano contra construcciones
 *   throwSpeed  velocidad de salida al lanzarla
 *   bounce      cuanto rebota (0 = se queda clavada, 1 = rebota entera)
 *   color/dark  colores del cuerpo
 *   effect      que hace al reventar:
 *                 'explosion' (por defecto) -> dano en area
 *                 'choque'    -> NO hace dano, empuja
 *                 'burbuja'   -> deja una cupula que para balas
 *   push        (choque) fuerza del empujon en el centro
 *   pushUp      (choque) parte del empujon que va hacia arriba
 *   shield      (burbuja) { radius, life, health }
 */

export const THROWABLES = [
  {
    id: 'granada', name: 'Granada', rarity: 'uncommon',
    stack: 6, dropWeight: 100,
    fuse: 2.2, fuseOnRest: 0.55,
    radius: 165, damage: 105, minDamage: 22, structMult: 2.6,
    throwSpeed: 860, bounce: 0.42,
    color: '#4f7a3a', dark: '#335326',
    desc: 'Explota en area. Cuidado, que a ti tambien te pilla.',
  },
];

/* ---------- Granada de choque ---------- */
// Copiada de la Shockwave Grenade de Fortnite: NO hace dano a nadie,
// lo que hace es MANDAR POR LOS AIRES a todo el que pille, tu incluido.
// Sirve igual para escapar de un tiroteo, para subir a un tejado sin
// construir o para descolocar al que viene a por ti.
//
// (En Fortnite ademas quita el dano de caida; aqui ese dano no existe,
// asi que no habia nada que quitar.)
THROWABLES.push({
  id: 'choque', name: 'Granada de Choque', rarity: 'rare',
  stack: 4, dropWeight: 55,
  fuse: 1.5, fuseOnRest: 0.35,
  radius: 240, damage: 0, minDamage: 0, structMult: 0,
  throwSpeed: 900, bounce: 0.5,
  effect: 'choque',
  push: 1250, pushUp: 0.72,
  color: '#3ad6f5', dark: '#1f7f9c',
  desc: 'No hace dano: te manda por los aires. A ti tambien.',
});

/* ---------- Escudo burbuja ---------- */
// La Bubble Shield de Fortnite: al reventar deja una CUPULA que para
// las balas EN LOS DOS SENTIDOS. Ni te disparan desde fuera ni tu
// disparas desde dentro. Se puede entrar andando, y se rompe a tiros.
//
// En un modo donde no puedes construirte una pared, es la unica forma
// de taparte para curarte con calma.
THROWABLES.push({
  id: 'burbuja', name: 'Escudo Burbuja', rarity: 'epic',
  stack: 2, dropWeight: 32,
  fuse: 1.1, fuseOnRest: 0.25,
  radius: 0, damage: 0, minDamage: 0, structMult: 0,
  throwSpeed: 760, bounce: 0.25,
  effect: 'burbuja',
  shield: { radius: 155, life: 30, health: 600 },
  color: '#7fd8ff', dark: '#2b6f9c',
  desc: 'Deja una cupula que para las balas por los dos lados.',
});

/** Un lanzable por su id. */
export function throwableById(id) {
  return THROWABLES.find((t) => t.id === id) || THROWABLES[0];
}
