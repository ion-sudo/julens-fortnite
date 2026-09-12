/**
 * duel.js
 * ---------------------------------------------------------------
 * MINIJUEGO: 1 CONTRA 1.
 *
 * Un escenario pequeno, un bot enemigo y solo puede quedar uno. Cada
 * ronda ganada suma una victoria; la primera derrota acaba la racha, que
 * es lo que se guarda como record.
 *
 * CADA RIVAL VIENE MAS DURO que el anterior: mas escudo, mejor punteria,
 * menos tiempo de reaccion y mejor arma (ver _dificultad). Tu equipo no
 * cambia, asi que la racha se acaba tarde o temprano: de eso va.
 *
 * No hay IA nueva: el rival es un Bot normal, con su personalidad y su
 * arma, movido por el mismo systems/botAI.js de la partida. Lo unico
 * propio del modo es preparar el duelo y mirar quien cae primero.
 */

import { Minigame } from './base.js';
import { Bot, PERSONALITIES } from '../../entities/bot.js';
import { makeWeapon } from '../../data/loot.js';
import { WEAPONS } from '../../data/weapons.js';
import { RARITY_ORDER } from '../../data/rarities.js';
import { SKINS } from '../../data/cosmetics.js';
import { generateBotNames } from '../../data/botNames.js';
import { roundRectPath } from '../../core/utils.js';

/**
 * Separacion inicial entre los dos.
 * Tiene que caber dentro de lo que ve un bot (viewRange va de 280 a 560
 * segun la personalidad): mas lejos y el rival ni se entera de que estas
 * ahi, y el duelo empieza con los dos paseando.
 */
const DISTANCIA = 330;
/** Pausa entre rondas, para respirar. */
const PAUSA = 1.6;

/**
 * Personalidad de partida de todos los rivales. Siempre la misma, para
 * que la unica diferencia entre una ronda y la siguiente sea la subida
 * de dificultad y no la suerte del sorteo.
 */
const BASE = PERSONALITIES.find((p) => p.id === 'equilibrado') || PERSONALITIES[1];

export class Duel extends Minigame {
  constructor(game) {
    super(game, 'duelo');

    this.systems = {
      worldLoot: false, chests: false, buildings: false, targets: false, fish: false,
      vehicles: false, mobility: false,
    };

    this.timeLimit = null;

    /** Rondas ganadas seguidas. */
    this.victorias = 0;
    /** Numero de ronda (para el marcador). */
    this.ronda = 1;
    /** Cuenta atras entre rondas. */
    this.pausa = 0;
    /** El rival de esta ronda. */
    this.rival = null;
    /** Nombres disponibles, para que cada rival sea distinto. */
    this.nombres = [];
  }

  setup() {
    const campo = this.bestField(500);
    const isla = campo.isla;
    const run = campo.run;

    // El duelo se pelea en el centro del tramo llano.
    this.campo = { x: run.x, w: run.w, y: isla.y };
    this.centro = run.x + run.w / 2;

    this.nombres = generateBotNames(30);
    this._nuevaRonda();

    this.game.showMessage('¡Solo puede quedar uno!', 'legendary');
  }

  /** Prepara al jugador y saca un rival nuevo. */
  _nuevaRonda() {
    const y = this.campo.y;

    // --- El jugador, entero y armado ---
    const p = this.player;
    p.health = p.maxHealth;
    p.shield = 0;
    p.lastAttacker = null;
    p.alive = true;
    p.buildMode = false;
    this.placePlayer(this.centro - DISTANCIA / 2, y);

    // Un arma decente y municion de sobra: aqui se viene a pelear, no a
    // buscar por el suelo. La TUYA no cambia: la que sube es la del rival.
    this.game.inventory.slots[1] = this._arma('rare');
    this.game.inventory.select(1);
    for (const tipo of Object.keys(p.ammo)) p.ammo[tipo] = 300;

    // --- El rival ---
    const nombre = this.nombres[(this.ronda - 1) % this.nombres.length];
    const bot = new Bot(this.world, {
      id: `rival${this.ronda}`,
      name: nombre,
      x: this.centro + DISTANCIA / 2,
      y: y - 60,
      skin: SKINS[(this.ronda * 3) % SKINS.length],
      // La personalidad NO es al azar: se parte siempre de la misma base
      // y se afina con la ronda. Con personalidades aleatorias, un rival
      // "torpe" de la ronda 3 salia peor que uno "bueno" de la 2 y la
      // dificultad daba tumbos en vez de subir.
      personality: { ...BASE },
    });
    bot.flight = null;
    bot.heals = 0;

    // Cada ronda, un rival mas duro (arma, escudo, punteria y reflejos).
    this.escala = this._dificultad(bot, this.ronda);

    // La lista de bots de la arena es la que mueve la IA y encajan las balas.
    this.game.match.bots.length = 0;
    this.game.match.bots.push(bot);
    this.rival = bot;

    // El pico del jugador tambien le alcanza.
    this.game.combat.targets = [bot];
  }

  /**
   * Un arma equilibrada para el duelo (ni sniper ni minigun).
   * @param {string} rareza
   */
  _arma(rareza = 'rare') {
    const buenas = WEAPONS.filter((w) => ['fusil', 'subfusil', 'escopeta'].includes(w.id));
    const def = buenas[Math.floor(Math.random() * buenas.length)] || WEAPONS[1];
    const arma = makeWeapon(def, rareza);
    arma.ammo = 300;
    return arma;
  }

  /**
   * CADA RIVAL ES MAS DURO QUE EL ANTERIOR.
   *
   * Se sube por tres sitios a la vez, que es lo que se nota de verdad:
   *   - escudo, para que aguante mas
   *   - punteria y reflejos (menos error, menos tiempo de reaccion)
   *   - rareza del arma, que sube el dano
   *
   * Todo con tope: a partir de la ronda 6 el rival ya no mejora, o seria
   * imposible por aburrimiento.
   */
  _dificultad(bot, ronda) {
    const n = Math.min(ronda - 1, 6);   // 0 en la primera ronda

    // --- Aguante ---
    bot.shield = Math.min(100, n * 18);

    // --- Punteria y reflejos: se parte de la base y se afina ---
    const P = { ...BASE };
    P.aimError = P.aimError * Math.max(0.3, 1 - n * 0.13);
    P.reaction = P.reaction * Math.max(0.25, 1 - n * 0.14);
    P.aimTrack = P.aimTrack * (1 + n * 0.12);
    bot.personality = P;

    // Variedad de estilo (unos se pegan mas, otros aguantan la distancia)
    // SIN tocar la punteria ni los reflejos, que son los que marcan la
    // dificultad.
    P.keepDistance = 140 + ((ronda * 47) % 160);

    // --- Arma: sube de rareza ---
    // Tope en MITICO, no en el ultimo de la lista: por debajo esta la
    // exotica, que es exclusiva del Julen Blitz y no debe salir aqui.
    const tope = RARITY_ORDER.indexOf('mythic');
    const rareza = RARITY_ORDER[Math.min(tope, 2 + Math.floor(n / 2))];
    bot.weapon = this._arma(rareza);

    return { nivel: n + 1, rareza };
  }

  step(dt) {
    // --- Pausa entre rondas ---
    if (this.pausa > 0) {
      this.pausa -= dt;
      if (this.pausa <= 0) this._nuevaRonda();
      return;
    }

    const rival = this.rival;
    if (!rival) return;

    // --- ¿Ha caido el rival? ---
    if (!rival.alive) {
      this.victorias++;
      this.ronda++;
      this.pausa = PAUSA;
      this.game.showMessage(
        `¡Ronda ganada! Van ${this.victorias} · el siguiente viene mas duro`, 'legendary');
      this.particles.puff(rival.x, rival.y, 'rgba(255, 240, 200, 0.7)', 12);
      return;
    }

    // --- ¿He caido yo? ---
    if (!this.player.alive) {
      const n = this.victorias;
      this.finish(n, n === 0
        ? `Te gano ${rival.name}`
        : `Racha de ${n} victoria${n === 1 ? '' : 's'}`);
    }
  }

  drawHud(ctx, view, time) {
    ctx.save();
    ctx.textAlign = 'center';

    const ancho = 250;
    const x = view.width / 2 - ancho / 2;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.86)';
    roundRectPath(ctx, x, 90, ancho, 62, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180, 92, 240, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#b45cf0';
    ctx.fillText(String(this.victorias), view.width / 2 - 52, 130);
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('VICTORIAS', view.width / 2 - 52, 146);

    // Vida del rival, para saber como va el duelo
    const rival = this.rival;
    const ratio = rival ? Math.max(0, rival.health / rival.maxHealth) : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(rival?.name || '', view.width / 2 + 48, 112);

    const bw = 130;
    const bx = view.width / 2 + 48 - bw / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(bx, 120, bw, 12);
    ctx.fillStyle = ratio > 0.35 ? '#e0554d' : '#ff8a7a';
    ctx.fillRect(bx, 120, bw * ratio, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, 120, bw, 12);

    // --- Lo duro que viene el rival ---
    if (this.escala) {
      ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(`Rival nivel ${this.escala.nivel}`, view.width / 2 + 48, 148);
    }

    // --- Cuenta atras entre rondas ---
    if (this.pausa > 0) {
      ctx.font = 'bold 44px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#ffd23f';
      ctx.fillText(`RONDA ${this.ronda}`, view.width / 2, view.height / 2 - 40);
    }

    ctx.restore();
  }
}
