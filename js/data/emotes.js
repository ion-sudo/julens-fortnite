/**
 * emotes.js
 * ---------------------------------------------------------------
 * LOS EMOTES: bailes y gestos que hace tu personaje en partida.
 *
 * Se abren con la tecla B (la rueda) y se elige con el raton o con las
 * teclas 1..6. Mientras bailas no puedes disparar ni construir: es
 * exactamente el riesgo que los hace divertidos.
 *
 * Cada emote dice:
 *   id        identificador
 *   name      nombre
 *   desc      que hace, en una linea
 *   rarity    rareza (para el color de la ficha y de la tienda)
 *   price     lo que cuesta en pavos (0 = gratis desde el principio)
 *   free      si viene desbloqueado de serie
 *   duration  segundos que dura, o null si es en bucle hasta moverte
 *   loop      true = se repite hasta que te mueves
 *   icon      dibujo de la rueda (ver ui/emoteWheel.js)
 *   anim      COMO se mueve el cuerpo (ver entities/emoteAnim.js)
 *
 * `anim` es lo que de verdad separa un emote de otro, y por eso vive
 * aparte: la rueda y la tienda solo necesitan estos datos.
 */

export const EMOTES = [
  {
    // `type` es lo que hace que la tienda, la taquilla y la vista previa
    // los traten como a cualquier otro cosmetico.
    type: 'emote',
    id: 'saludo', name: 'Saludo', rarity: 'common', price: 0, free: true,
    desc: 'Un hola de toda la vida. Nunca falla.',
    duration: 1.6, loop: false, icon: 'mano', anim: 'saludo',
  },
  {
    type: 'emote', id: 'aplauso', name: 'Aplausos', rarity: 'common', price: 0, free: true,
    desc: 'Para cuando el rival hace algo bonito antes de eliminarte.',
    duration: 2.0, loop: false, icon: 'palmas', anim: 'aplauso',
  },
  {
    type: 'emote', id: 'floss', name: 'Bailecito', rarity: 'uncommon', price: 400,
    desc: 'Los brazos van a un lado y las caderas al otro.',
    duration: null, loop: true, icon: 'baile', anim: 'floss',
  },
  {
    type: 'emote', id: 'robot', name: 'El Robot', rarity: 'rare', price: 700,
    desc: 'Movimientos a tirones, como si le faltara aceite.',
    duration: null, loop: true, icon: 'robot', anim: 'robot',
  },
  {
    type: 'emote', id: 'sentadillas', name: 'Sentadillas', rarity: 'uncommon', price: 450,
    desc: 'Para presumir de piernas encima del que acabas de eliminar.',
    duration: null, loop: true, icon: 'pesa', anim: 'sentadillas',
  },
  {
    type: 'emote', id: 'victoria', name: 'Baile de Victoria', rarity: 'epic', price: 1100,
    desc: 'Saltos, brazos arriba y a mirar a camara.',
    duration: null, loop: true, icon: 'copa', anim: 'victoria',
  },
  {
    type: 'emote', id: 'dormir', name: 'Siesta', rarity: 'rare', price: 650,
    desc: 'Se echa a dormir en mitad de la tormenta. Muy valiente.',
    duration: null, loop: true, icon: 'zeta', anim: 'dormir',
  },
  {
    type: 'emote', id: 'guitarra', name: 'Guitarrista', rarity: 'legendary', price: 1600,
    desc: 'Toca una guitarra que no existe, y le sale bien.',
    duration: null, loop: true, icon: 'guitarra', anim: 'guitarra',
  },
];

/** Cuantos caben en la rueda (las teclas 1..6 mientras esta abierta). */
export const WHEEL_SLOTS = 6;

/** Un emote por su id. */
export function emoteById(id) {
  return EMOTES.find((e) => e.id === id) || EMOTES[0];
}

/** Los que vienen desbloqueados de serie. */
export function freeEmotes() {
  return EMOTES.filter((e) => e.free).map((e) => e.id);
}
