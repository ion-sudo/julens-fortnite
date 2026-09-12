/**
 * index.js (minijuegos)
 * ---------------------------------------------------------------
 * REGISTRO de modos: id del catalogo -> clase que lo implementa.
 *
 * Estan los siete. Si alguno se quitase de aqui, su tarjeta del menu
 * volveria a salir como "Proximamente" (ver data/minigames.js).
 */

import { ShootingRange } from './shooting.js';
import { TrainingGround } from './training.js';
import { Parkour } from './parkour.js';
import { Sandbox } from './sandbox.js';
import { Duel } from './duel.js';
import { CoinRush } from './coins.js';
import { Tag } from './tag.js';

export const MINIGAME_MODES = {
  tiro: ShootingRange,
  entreno: TrainingGround,
  parkour: Parkour,
  caja: Sandbox,
  duelo: Duel,
  monedas: CoinRush,
  pilla: Tag,
};

/** La clase de un minijuego, o undefined si todavia no existe. */
export function modeFor(id) {
  return MINIGAME_MODES[id];
}
