/**
 * shooting.js
 * ---------------------------------------------------------------
 * MINIJUEGO: CAMPO DE TIRO.
 *
 * Salen dianas por una zona despejada del mapa y hay 60 segundos para
 * reventar todas las que se pueda. Cada diana que cae suma un punto y
 * aparece otra en otro sitio, asi que nunca se queda uno sin blancos.
 *
 * Reutiliza tal cual las dianas del mundo (entities/target.js), las
 * armas, las balas y el pico: aqui solo se decide donde salen, cuando
 * reaparecen y como se cuentan.
 */

import { Minigame } from './base.js';
import { Target } from '../../entities/target.js';
import { makeWeapon } from '../../data/loot.js';
import { WEAPONS } from '../../data/weapons.js';
import { roundRectPath } from '../../core/utils.js';

/** Cuantas dianas hay a la vez. */
const A_LA_VEZ = 5;
/** Dianas mas blandas que las del mundo: aqui se trata de encadenar. */
const VIDA_DIANA = 90;

export class ShootingRange extends Minigame {
  constructor(game) {
    super(game, 'tiro');

    // Arena limpia: sin botin por el suelo, sin cofres y sin peces.
    // Las dianas las pone el propio modo.
    this.systems = {
      worldLoot: false, chests: false, buildings: false, targets: false, fish: false,
      vehicles: false, mobility: false,
    };

    this.timeLimit = 60;
    this.aciertos = 0;
    /** Donde puede salir una diana: se calcula una vez al empezar. */
    this.sitios = [];
    /** Aviso de "+1" flotante sobre la ultima diana abatida. */
    this.flash = 0;
  }

  setup() {
    // --- El campo: el tramo LLANO mas largo del mapa ---
    // Tiene que estar despejado de verdad: si hay un escalon por medio,
    // las balas chocan contra el y las dianas de detras son inalcanzables.
    const campo = this.bestField(500);
    const isla = campo.isla;
    const run = campo.run;

    this.campo = { x: run.x, w: run.w, y: isla.y };
    this.placePlayer(run.x + 50, isla.y);

    // --- Sitios donde pueden salir las dianas ---
    // Repartidos a lo largo del tramo y a tres alturas, para que haya que
    // apuntar arriba y abajo, no solo a lo lejos.
    const desde = run.x + 190;
    const hasta = run.x + run.w - 40;
    const cuantos = 14;
    for (let i = 0; i < cuantos; i++) {
      const t = i / (cuantos - 1);
      const x = desde + (hasta - desde) * t;
      const alto = [0, 90, 180][i % 3];
      this.sitios.push({ x, y: isla.y - alto });
    }

    // --- Las dianas ---
    this.game.targets = [];
    for (let i = 0; i < A_LA_VEZ; i++) this._nuevaDiana();
    this.game.combat.targets = this.game.targets;

    // --- El arma: un fusil con municion de sobra ---
    // Se trata de apuntar, no de buscar armas por el suelo.
    const fusil = WEAPONS.find((w) => w.id === 'fusil') || WEAPONS[1];
    const arma = makeWeapon(fusil, 'rare');
    arma.ammo = 999;
    this.game.inventory.add(arma);
    // La municion la lleva el JUGADOR, no el inventario.
    for (const tipo of Object.keys(this.player.ammo)) this.player.ammo[tipo] = 999;
    const ranura = this.game.inventory.slots.findIndex((s) => s?.kind === 'weapon');
    if (ranura >= 0) this.game.inventory.select(ranura);

    this.game.showMessage('¡Dispara a todas las dianas que puedas!', 'legendary');
  }

  /** Saca una diana en un sitio libre. */
  _nuevaDiana() {
    const ocupados = this.game.targets.map((t) => t.x);
    const libres = this.sitios.filter((s) => !ocupados.some((x) => Math.abs(x - s.x) < 60));
    const lista = libres.length ? libres : this.sitios;

    const sitio = lista[Math.floor(Math.random() * lista.length)];
    const diana = new Target(sitio.x, sitio.y, VIDA_DIANA);
    diana.onDamage = (amount, x, y) =>
      this.particles.damageNumber(x, y, amount, '#ffd23f');

    this.game.targets.push(diana);
    return diana;
  }

  step(dt) {
    this.flash = Math.max(0, this.flash - dt);

    // Una diana abatida cuenta un punto y deja sitio a otra nueva.
    // (Las dianas del mundo reaparecen solas; aqui interesa que cambien
    // de sitio, asi que se sustituyen.)
    for (let i = this.game.targets.length - 1; i >= 0; i--) {
      const t = this.game.targets[i];
      if (!t.dead) continue;

      this.aciertos++;
      this.score = this.aciertos;
      this.flash = 0.6;
      this.particles.spark(t.x, t.groundY - t.h / 2, '#ffd23f', 14, 260);
      this.particles.puff(t.x, t.groundY - t.h / 2, 'rgba(255, 210, 63, 0.5)', 7);

      this.game.targets.splice(i, 1);
      this._nuevaDiana();
    }

    this.game.combat.targets = this.game.targets;
  }

  onTimeUp() {
    // La frase no repite el numero: ese ya sale debajo, en grande.
    const n = this.aciertos;
    const frase =
      n === 0 ? 'Ni una... otra vez' :
      n < 8 ? 'No esta mal' :
      n < 15 ? '¡Buena punteria!' :
      '¡Eres una maquina!';

    this.finish(n, frase);
  }

  drawHud(ctx, view, time) {
    const restante = this.timeLeft;

    ctx.save();
    ctx.textAlign = 'center';

    // --- Reloj grande arriba ---
    const apurado = restante <= 10;
    const ancho = 210;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.86)';
    roundRectPath(ctx, view.width / 2 - ancho / 2, 90, ancho, 62, 12);
    ctx.fill();
    ctx.strokeStyle = apurado ? '#e0554d' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.fillStyle = apurado ? '#ff8a7a' : '#ffffff';
    ctx.fillText(restante.toFixed(1), view.width / 2 - 44, 130);

    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('SEGUNDOS', view.width / 2 - 44, 146);

    // --- Aciertos ---
    const brillo = this.flash > 0 ? 1 + this.flash * 0.5 : 1;
    ctx.font = `bold ${Math.round(30 * brillo)}px "Trebuchet MS", sans-serif`;
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(String(this.aciertos), view.width / 2 + 54, 130);

    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('DIANAS', view.width / 2 + 54, 146);

    ctx.restore();
  }
}
