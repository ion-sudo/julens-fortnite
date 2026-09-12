/**
 * sandbox.js
 * ---------------------------------------------------------------
 * MINIJUEGO: CAJA DE CONSTRUCCION.
 *
 * Una zona tranquila, sin enemigos y sin reloj, para practicar a
 * construir: madera infinita, arboles que vuelven a crecer y un par de
 * plataformas de referencia para medir alturas.
 *
 * No hay logica de construccion nueva: es la misma de la partida
 * (systems/building.js). Aqui solo se prepara el sitio y se rellena la
 * madera para que nunca falte.
 */

import { Minigame } from './base.js';
import { CONFIG } from '../../core/config.js';
import { roundRectPath } from '../../core/utils.js';

/** Por debajo de esta madera se vuelve a llenar (nunca se acaba). */
const MINIMO = 600;

export class Sandbox extends Minigame {
  constructor(game) {
    super(game, 'caja');

    this.systems = {
      worldLoot: false, chests: false, buildings: false, targets: false, fish: false,
      vehicles: false, mobility: false,
    };

    this.timeLimit = null;

    /** Piezas puestas y rotas, solo para el marcador. */
    this.puestas = 0;
    this.rotas = 0;
    /** Postes de referencia que se dibujan en el suelo. */
    this.marcas = [];
  }

  setup() {
    const campo = this.bestField(400);
    const isla = campo.isla;
    const run = campo.run;

    this.campo = { x: run.x, w: run.w, y: isla.y };
    this.placePlayer(run.x + 90, isla.y);

    // --- Madera de sobra ---
    this.player.wood = CONFIG.build.maxWood;

    // --- Postes de referencia cada 2 celdas ---
    // Sirven para ver de un vistazo a que altura vas construyendo.
    const paso = 192;
    for (let x = run.x + 60; x < run.x + run.w - 40; x += paso) {
      this.marcas.push({ x, y: isla.y });
    }

    // --- El contador de piezas ---
    this.game.build.onPlaced = () => { this.puestas++; };
    this.game.build.onBroken = () => { this.rotas++; };

    // Se entra ya en modo construccion: es a lo que se viene.
    this.player.buildMode = true;
    this.player.piece = 'rampa';

    this.game.showMessage('Madera infinita · Q sale del modo · Z pared · X suelo · C rampa', 'legendary');
  }

  step(dt) {
    // La madera nunca se acaba.
    if (this.player.wood < MINIMO) this.player.wood = CONFIG.build.maxWood;

    // Los arboles vuelven a crecer, para poder practicar tambien el pico.
    for (const arbol of this.game.harvest.trees) {
      if (!arbol.chopped) continue;
      arbol.chopped = false;
      arbol.chopProgress = 0;
    }
  }

  draw(ctx, camera, time) {
    // Postes de referencia: una linea de puntos hacia arriba cada 96 px
    // (el tamano de una celda de construccion).
    for (const m of this.marcas) {
      if (!camera.isVisible(m.x - 20, m.y - 500, 40, 520)) continue;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 10]);
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x, m.y - 480);
      ctx.stroke();
      ctx.setLineDash([]);

      // Una marca mas gorda a cada celda
      ctx.fillStyle = 'rgba(200, 165, 110, 0.5)';
      for (let k = 1; k <= 5; k++) ctx.fillRect(m.x - 5, m.y - k * 96, 10, 3);
      ctx.restore();
    }
  }

  drawHud(ctx, view, time) {
    ctx.save();
    ctx.textAlign = 'left';

    const ancho = 250;
    const x = view.width / 2 - ancho / 2;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.86)';
    roundRectPath(ctx, x, 90, ancho, 58, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(192, 138, 78, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('PIEZAS PUESTAS', x + 16, 110);
    ctx.fillText('ROTAS', x + 168, 110);

    ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#c08a4e';
    ctx.fillText(String(this.puestas), x + 16, 136);
    ctx.fillStyle = '#ff8a7a';
    ctx.fillText(String(this.rotas), x + 168, 136);

    ctx.restore();
  }
}
