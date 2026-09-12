/**
 * coins.js
 * ---------------------------------------------------------------
 * MINIJUEGO: RECOGE-MONEDAS CONTRARRELOJ.
 *
 * Monedas repartidas por un buen trozo de isla y 60 segundos para pillar
 * las que se pueda. Van sobre el suelo y sobre las plataformas, asi que
 * hay que correr y saltar: se usa el movimiento de siempre, y el modo
 * solo pone las monedas y cuenta.
 *
 * Cuando quedan pocas se reponen, para que nunca haya que quedarse
 * parado esperando.
 */

import { Minigame } from './base.js';
import { roundRectPath } from '../../core/utils.js';

/** Cuantas monedas hay a la vez. */
const A_LA_VEZ = 14;
/** Radio de recogida. */
const ALCANCE = 34;

export class CoinRush extends Minigame {
  constructor(game) {
    super(game, 'monedas');

    this.systems = {
      worldLoot: false, chests: false, buildings: false, targets: false, fish: false,
      vehicles: false, mobility: false,
    };

    this.timeLimit = 60;
    this.recogidas = 0;
    /** @type {Array<{x:number,y:number,fase:number,viva:boolean}>} */
    this.monedas = [];
    /** Sitios posibles, calculados una vez al empezar. */
    this.sitios = [];
    /** Brillo del contador al pillar una. */
    this.flash = 0;
  }

  setup() {
    const campo = this.bestField(500);
    const isla = campo.isla;
    const run = campo.run;

    this.campo = { x: run.x, w: run.w, y: isla.y };
    this.placePlayer(run.x + run.w / 2, isla.y);

    // --- Sitios: a ras de suelo y a dos alturas de salto ---
    // Las de arriba obligan a saltar, que si no seria solo correr.
    const paso = 90;
    for (let x = run.x + 40; x < run.x + run.w - 40; x += paso) {
      const suelo = this.groundAt(x, isla.y - 300) ?? isla.y;
      this.sitios.push({ x, y: suelo - 26 });
      this.sitios.push({ x: x + paso / 2, y: suelo - 120 });
    }

    // Y tambien sobre las plataformas finas que haya cerca, si las hay.
    for (const p of this.world.platforms) {
      if (!p.oneWay || p.w < 90) continue;
      if (p.x < run.x - 400 || p.x > run.x + run.w + 400) continue;
      this.sitios.push({ x: p.x + p.w / 2, y: p.y - 26 });
    }

    for (let i = 0; i < A_LA_VEZ; i++) this._nuevaMoneda();

    this.game.showMessage('¡Pilla todas las monedas que puedas!', 'legendary');
  }

  _nuevaMoneda() {
    const ocupados = this.monedas.filter((m) => m.viva);
    const libres = this.sitios.filter(
      (s) => !ocupados.some((m) => Math.abs(m.x - s.x) < 50 && Math.abs(m.y - s.y) < 50)
    );
    const lista = libres.length ? libres : this.sitios;
    const sitio = lista[Math.floor(Math.random() * lista.length)];

    this.monedas.push({ x: sitio.x, y: sitio.y, fase: Math.random() * 6.28, viva: true });
  }

  step(dt) {
    this.flash = Math.max(0, this.flash - dt);

    const p = this.player;
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;

    for (const m of this.monedas) {
      if (!m.viva) continue;
      m.fase += dt * 3;

      if (Math.hypot(px - m.x, py - m.y) > ALCANCE) continue;

      m.viva = false;
      this.recogidas++;
      this.score = this.recogidas;
      this.flash = 0.5;
      this.particles.spark(m.x, m.y, '#ffd23f', 10, 220);
      this.particles.damageNumber(m.x, m.y - 12, '+1', '#ffd23f');
    }

    // Las recogidas se van quitando y salen otras nuevas.
    this.monedas = this.monedas.filter((m) => m.viva);
    while (this.monedas.length < A_LA_VEZ) this._nuevaMoneda();
  }

  onTimeUp() {
    const n = this.recogidas;
    const frase =
      n < 10 ? 'Se te ha escapado el tiempo' :
      n < 25 ? 'Buen paseo' :
      n < 40 ? '¡Que ritmo!' :
      '¡Imparable!';
    this.finish(n, frase);
  }

  draw(ctx, camera, time) {
    for (const m of this.monedas) {
      if (!m.viva) continue;
      if (!camera.isVisible(m.x - 30, m.y - 30, 60, 60)) continue;

      // Flotan y giran: una moneda quieta no se ve.
      const y = m.y + Math.sin(m.fase) * 5;
      const ancho = 11 * Math.abs(Math.cos(m.fase * 0.7)) + 3;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 210, 63, 0.22)';
      ctx.beginPath();
      ctx.arc(m.x, y, 17, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b98f10';
      ctx.beginPath();
      ctx.ellipse(m.x, y + 2, ancho, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.ellipse(m.x, y, ancho, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      if (ancho > 7) {
        ctx.fillStyle = '#b98f10';
        ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('V', m.x, y + 1);
      }
      ctx.restore();
    }
  }

  drawHud(ctx, view, time) {
    const restante = this.timeLeft;
    const apurado = restante <= 10;

    ctx.save();
    ctx.textAlign = 'center';

    const ancho = 220;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.86)';
    roundRectPath(ctx, view.width / 2 - ancho / 2, 90, ancho, 62, 12);
    ctx.fill();
    ctx.strokeStyle = apurado ? '#e0554d' : 'rgba(255, 210, 63, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.fillStyle = apurado ? '#ff8a7a' : '#ffffff';
    ctx.fillText(restante.toFixed(1), view.width / 2 - 48, 130);
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('SEGUNDOS', view.width / 2 - 48, 146);

    const brillo = 1 + this.flash * 0.6;
    ctx.font = `bold ${Math.round(30 * brillo)}px "Trebuchet MS", sans-serif`;
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(String(this.recogidas), view.width / 2 + 54, 130);
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('MONEDAS', view.width / 2 + 54, 146);

    ctx.restore();
  }
}
