/**
 * harvest.js
 * ---------------------------------------------------------------
 * PICAR ARBOLES para conseguir MADERA.
 *
 * Se pica con el pico (ranura 1, tecla F) dandole golpes con el clic
 * izquierdo. Un arbol tarda unos 5 segundos en caer: como el pico da
 * 1,6 golpes por segundo, eso son 8 golpes, y cada golpe suma su parte
 * del progreso. Al terminar, el arbol da 60 de madera de golpe y
 * desaparece.
 *
 * El calculo de "cuantos golpes" se hace a partir de la cadencia real
 * del pico, asi que si algun dia se cambia esa cadencia, el arbol
 * seguira tardando los mismos 5 segundos.
 */

import { CONFIG } from '../core/config.js';
import { playChop, playTreeFall } from '../core/audio.js';

/** Que decorados se pueden talar (los que son "vegetacion grande"). */
// Lo que da madera al picarlo. Cada sitio tiene lo suyo: en el puerto
// son los palos de las redes, en la feria los mastiles de las carpas y
// en el volcan los arboles quemados. Sin esto, en los tres sitios
// nuevos no habria forma de conseguir madera para construir.
const TALABLES = new Set([
  'pino', 'abeto', 'palmera', 'cactus', 'seto',
  'redes', 'carpa', 'arbolQuemado',
]);

export class HarvestManager {
  /**
   * @param {object} deps { world, particles }
   */
  constructor(deps) {
    this.world = deps.world;
    this.particles = deps.particles;

    /** Aviso para la pantalla (lo enchufa game.js). */
    this.onMessage = null;

    /**
     * Si en este modo se puede talar. Va de la mano de
     * BuildManager.enabled: sin madera no hay nada que construir, y con
     * la construccion apagada picar arboles solo seria perder el tiempo.
     */
    this.enabled = true;

    /** Arboles en pie, con su estado de tala. */
    this.trees = [];
    this.reset();
  }

  /** Deja todos los arboles en pie otra vez (al empezar partida). */
  reset() {
    this.trees.length = 0;

    for (const prop of this.world.props) {
      if (!TALABLES.has(prop.type)) continue;

      // El estado vive en el propio prop: asi props.js puede dibujar el
      // arbol inclinandose sin necesitar nada mas.
      prop.choppable = true;
      prop.chopProgress = 0;
      prop.chopped = false;
      prop.shake = 0;

      this.trees.push(prop);
    }
  }

  /** Golpes que hacen falta para talar un arbol, segun la cadencia del pico. */
  get hitsToChop() {
    return Math.max(1, Math.round(CONFIG.build.chopSeconds * CONFIG.combat.pickaxeRate));
  }

  /* =============================================================
     CONSULTAS
     ============================================================= */

  /**
   * Arbol en pie mas cercano a un punto, dentro del alcance.
   * @returns {object|null}
   */
  nearestTree(x, y, range = CONFIG.build.chopRange) {
    if (!this.enabled) return null;
    let mejor = null;
    let mejorD = range;

    for (const t of this.trees) {
      if (t.chopped) continue;
      // Se mide contra el tronco, a media altura del arbol.
      const d = Math.hypot(t.x - x, (t.y - 40) - y);
      if (d < mejorD) { mejorD = d; mejor = t; }
    }
    return mejor;
  }

  /** ¿Quedan arboles en pie cerca de esta X? (lo usa la IA) */
  nearestTreeByX(x, range = 900) {
    if (!this.enabled) return null;
    let mejor = null;
    let mejorD = range;
    for (const t of this.trees) {
      if (t.chopped) continue;
      const d = Math.abs(t.x - x);
      if (d < mejorD) { mejorD = d; mejor = t; }
    }
    return mejor;
  }

  /* =============================================================
     PICAR
     ============================================================= */

  /**
   * Un golpe de pico sobre un arbol.
   * @param {object} tree
   * @param {object} quien  jugador o bot (tiene que tener `.wood`)
   * @returns {number} madera conseguida (0 si aun no ha caido)
   */
  hit(tree, quien) {
    if (!tree || tree.chopped) return 0;

    tree.chopProgress = Math.min(1, tree.chopProgress + 1 / this.hitsToChop);
    tree.shake = 1;

    // Astillas en cada golpe
    this.particles?.spark(tree.x, tree.y - 45, '#c8a06a', 6, 170);
    playChop();

    if (tree.chopProgress < 1) return 0;

    // --- Cae el arbol ---
    tree.chopped = true;
    const madera = CONFIG.build.woodPerTree;

    this.particles?.puff(tree.x, tree.y - 50, 'rgba(200, 165, 110, 0.7)', 10);
    this.particles?.spark(tree.x, tree.y - 40, '#a9763f', 14, 260);

    playTreeFall();
    quien.addWood?.(madera);
    return madera;
  }

  /* =============================================================
     UPDATE / DIBUJO
     ============================================================= */

  update(dt) {
    for (const t of this.trees) {
      if (t.shake > 0) t.shake = Math.max(0, t.shake - dt * 4);
    }
  }

  /**
   * Barra de progreso encima del arbol que se esta picando.
   * Se dibuja en coordenadas de MUNDO.
   */
  draw(ctx, camera) {
    for (const t of this.trees) {
      if (t.chopped || t.chopProgress <= 0) continue;
      if (!camera.isVisible(t.x - 40, t.y - 140, 80, 140)) continue;

      const ancho = 46;
      const x = t.x - ancho / 2;
      const y = t.y - 128;

      ctx.fillStyle = 'rgba(10, 16, 34, 0.8)';
      ctx.fillRect(x - 1, y - 1, ancho + 2, 8);

      const g = ctx.createLinearGradient(x, 0, x + ancho, 0);
      g.addColorStop(0, '#c8a06a');
      g.addColorStop(1, '#8a5c2f');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, ancho * t.chopProgress, 6);

      // Icono de madera al lado
      ctx.fillStyle = '#c8a06a';
      ctx.fillRect(x + ancho + 5, y, 7, 6);
    }
  }
}
