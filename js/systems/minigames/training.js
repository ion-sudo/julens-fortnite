/**
 * training.js
 * ---------------------------------------------------------------
 * MINIJUEGO: ZONA DE ENTRENAMIENTO.
 *
 * Un sitio tranquilo, sin enemigos y sin reloj, con una fila de
 * MANIQUIES y las 10 ARMAS del juego en el suelo para ir cogiendolas y
 * probarlas. Los maniquies aguantan mucho y se reparan solos, asi que se
 * puede medir el dano de cada arma con calma.
 *
 * Reutiliza las dianas del mundo como maniquies y el sistema de botin
 * normal para dejar las armas por el suelo: no hay logica nueva de
 * combate, es el mismo de siempre.
 */

import { Minigame } from './base.js';
import { Target } from '../../entities/target.js';
import { Pickup } from '../../entities/pickup.js';
import { makeWeapon, makeHeal } from '../../data/loot.js';
import { WEAPONS } from '../../data/weapons.js';
import { HEALS } from '../../data/heals.js';
import { roundRectPath } from '../../core/utils.js';

/** Vida de cada maniqui: aguanta lo suyo para poder medir el dano. */
const VIDA_MANIQUI = 600;

export class TrainingGround extends Minigame {
  constructor(game) {
    super(game, 'entreno');

    this.systems = {
      worldLoot: false, chests: false, buildings: false, targets: false, fish: false,
      vehicles: false, mobility: false,
    };

    // Sin reloj y sin puntuacion: es un modo libre.
    this.timeLimit = null;

    /** Dano acumulado a los maniquies, solo por curiosidad. */
    this.danoTotal = 0;
    /** Armas distintas que se han llegado a empunar. */
    this.probadas = new Set();
  }

  setup() {
    // El tramo LLANO mas largo: los maniquies tienen que estar a la
    // vista, sin escalones del terreno que paren las balas por el camino.
    const campo = this.bestField(500);
    const isla = campo.isla;
    const run = campo.run;

    this.campo = { x: run.x, w: run.w, y: isla.y };
    this.placePlayer(run.x + 50, isla.y);

    // --- Una fila de maniquies, a partir de la mitad del tramo ---
    // La primera mitad se deja para las armas, que van por el suelo.
    this.game.targets = [];
    const desde = run.x + Math.max(640, run.w * 0.35);
    const paso = 130;
    const sitio = (run.x + run.w - 60) - desde;
    const cuantos = Math.max(3, Math.min(7, Math.floor(sitio / paso)));

    for (let i = 0; i < cuantos; i++) {
      const maniqui = new Target(desde + i * paso, isla.y, VIDA_MANIQUI);
      maniqui.onDamage = (amount, x, y) => {
        this.danoTotal += amount;
        this.particles.damageNumber(x, y, amount, '#ffd23f');
      };
      this.game.targets.push(maniqui);
    }
    this.game.combat.targets = this.game.targets;

    // --- Las 10 armas por el suelo, en fila y en orden ---
    // Asi se pueden ir cogiendo una detras de otra con E.
    const armas = [...WEAPONS].sort((a, b) => (a.order || 0) - (b.order || 0));
    armas.forEach((def, i) => {
      const x = run.x + 110 + i * 52;
      const item = makeWeapon(def, 'epic');
      const p = new Pickup(x, isla.y - 20, item);
      p.onGround = true;
      this.game.loot.pickups.push(p);
    });

    // --- Y un par de curas, para probarlas tambien ---
    HEALS.slice(0, 4).forEach((def, i) => {
      const x = run.x + 130 + i * 52;
      const p = new Pickup(x, isla.y - 110, makeHeal(def));
      p.onGround = false;
      this.game.loot.pickups.push(p);
    });

    // Municion infinita: aqui se viene a probar, no a administrar balas.
    // La municion la lleva el JUGADOR, no el inventario.
    for (const tipo of Object.keys(this.player.ammo)) this.player.ammo[tipo] = 999;

    this.game.showMessage('Coge las armas con E y prueba contra los maniquies', 'legendary');
  }

  step(dt) {
    // La municion no baja nunca.
    for (const tipo of Object.keys(this.player.ammo)) {
      if (this.player.ammo[tipo] < 200) this.player.ammo[tipo] = 999;
    }

    // Se apunta que armas se han llegado a empunar, solo para el marcador.
    const equipado = this.game.inventory.equipped;
    if (equipado?.kind === 'weapon') this.probadas.add(equipado.def.id);
  }

  drawHud(ctx, view, time) {
    ctx.save();
    ctx.textAlign = 'left';

    const ancho = 268;
    const x = view.width / 2 - ancho / 2;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.86)';
    roundRectPath(ctx, x, 90, ancho, 58, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(58, 162, 245, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('ARMAS PROBADAS', x + 16, 110);
    ctx.fillText('DANO TOTAL', x + 158, 110);

    ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#3aa2f5';
    ctx.fillText(`${this.probadas.size} / ${WEAPONS.length}`, x + 16, 136);
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(String(Math.round(this.danoTotal)), x + 158, 136);

    ctx.restore();
  }
}
