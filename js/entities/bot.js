/**
 * bot.js
 * ---------------------------------------------------------------
 * UN BOT ENEMIGO.
 *
 * Hereda de Player a proposito: asi usa EXACTAMENTE la misma fisica,
 * colisiones, salto y animacion que el jugador (ya probadas), y no hay
 * dos implementaciones que mantener. Lo unico que cambia es quien le da
 * las ordenes: en vez de un teclado, un BotInput que rellena la IA
 * (ver systems/botAI.js).
 *
 * El bot lleva un inventario simplificado (un arma y unas curas), que es
 * todo lo que su IA necesita; el inventario de 6 ranuras es cosa del
 * jugador y no se toca.
 */

import { Player } from './player.js';
import { drawPlayer } from './playerSprite.js';
import { SKINS } from '../data/cosmetics.js';
import { CONFIG } from '../core/config.js';
import { roundRectPath } from '../core/utils.js';
import { ReviveManager } from '../systems/revive.js';
import { areAllies, TEAM_COLORS } from '../systems/teams.js';

/**
 * Mando "de mentira" con la misma interfaz que core/input.js.
 * La IA escribe en `state` y la fisica del Player lo lee sin enterarse
 * de que no hay un teclado detras.
 */
export class BotInput {
  constructor() {
    this.state = { left: false, right: false, jump: false, crouch: false, sprint: false };
    this.jumpPressed = false;
  }

  isDown(action) { return !!this.state[action]; }
  wasPressed(action) { return action === 'jump' && this.jumpPressed; }
  consume(action) {
    if (action === 'jump' && this.jumpPressed) { this.jumpPressed = false; return true; }
    return false;
  }
  get axisX() { return (this.state.right ? 1 : 0) - (this.state.left ? 1 : 0); }

  /** Pide un salto en el siguiente update. */
  requestJump() {
    if (!this.state.jump) this.jumpPressed = true;
    this.state.jump = true;
  }

  releaseJump() { this.state.jump = false; }

  /** Se llama al final de cada update del bot. */
  update() { this.jumpPressed = false; }
}

/* =============================================================
   PERSONALIDADES
   Dan variedad: unos van a por todas y otros esperan escondidos.
   ============================================================= */
export const PERSONALITIES = [
  {
    id: 'agresivo', label: 'Agresivo', weight: 30,
    viewRange: 400, engageRange: 340, keepDistance: 140,
    reaction: 0.35, aimError: 0.20, aimTrack: 2.0,
    healBelow: 0.30, roamSpeed: 1, sprintChance: 0.7,
  },
  {
    id: 'equilibrado', label: 'Equilibrado', weight: 40,
    viewRange: 340, engageRange: 300, keepDistance: 210,
    reaction: 0.50, aimError: 0.25, aimTrack: 1.6,
    healBelow: 0.45, roamSpeed: 1, sprintChance: 0.45,
  },
  {
    id: 'pasivo', label: 'Pasivo', weight: 20,
    viewRange: 280, engageRange: 250, keepDistance: 240,
    reaction: 0.70, aimError: 0.32, aimTrack: 1.2,
    healBelow: 0.60, roamSpeed: 0.85, sprintChance: 0.25,
  },
  {
    id: 'francotirador', label: 'Francotirador', weight: 10,
    viewRange: 560, engageRange: 520, keepDistance: 400,
    reaction: 0.65, aimError: 0.16, aimTrack: 2.2,
    healBelow: 0.40, roamSpeed: 0.9, sprintChance: 0.3,
  },
];

/** Elige una personalidad segun su peso. */
export function rollPersonality(rng = Math.random) {
  const total = PERSONALITIES.reduce((s, p) => s + p.weight, 0);
  let t = rng() * total;
  for (const p of PERSONALITIES) {
    t -= p.weight;
    if (t <= 0) return p;
  }
  return PERSONALITIES[1];
}

/* =============================================================
   EL BOT
   ============================================================= */

export class Bot extends Player {
  /**
   * @param {object} world
   * @param {object} opts { id, name, x, y, skin, personality }
   */
  constructor(world, opts) {
    super(world);

    this.id = opts.id;
    this.name = opts.name;
    this.skin = opts.skin || SKINS[0];
    this.personality = opts.personality || PERSONALITIES[1];

    this.x = opts.x;
    this.y = opts.y;

    // --- Inventario simplificado ---
    /** @type {object|null} instancia de arma (ver data/loot.js) */
    this.weapon = null;
    /** Paravela con la que salta del bus (solo decorativa). */
    this.glider = null;
    /** Curas que lleva encima (sin distinguir tipo: la IA no lo necesita). */
    this.heals = Math.random() < 0.5 ? 1 : 0;

    /** Equipo. Lo reparte systems/teams.js; en individual, uno por bot. */
    this.team = -1;

    // --- ABATIDO (solo en duos y escuadrones) ---
    this.downed = false;
    this.canBeDowned = false;
    this.downHealth = 0;
    this.maxDownHealth = 0;
    this.reviveProgress = 0;
    this.beingRevived = false;
    this.downedBy = null;

    // --- Mando falso que rellena la IA ---
    this.botInput = new BotInput();

    // --- Estado de la IA (lo gestiona systems/botAI.js) ---
    this.ai = {
      state: 'explorar',      // explorar | botin | combate | curarse | talar
      think: Math.random() * 0.2,  // temporizador de decision
      waypointX: this.x,
      targetEnemy: null,
      targetPickup: null,
      seenTime: 0,            // cuanto lleva viendo al enemigo (mejora la punteria)
      fireCooldown: 0,
      healTimer: 0,
      stuckTimer: 0,
      lastX: this.x,
      jumpCooldown: 0,
      detourTimer: 0,
      combatTarget: null,
      combatTime: 0,
      combatRefHealth: 0,
      // Tala de arboles: 'chopper' se sortea una vez, la primera vez que
      // el bot se plantea ir a por madera.
      chopper: undefined,
      targetTree: null,
      chopTimer: 0,
      // Espera entre pieza y pieza al construir
      buildCooldown: 0,

      // Caja de suministros a la que va, si hay alguna cayendo
      targetSupply: null,

      // Companero abatido al que va a levantar
      targetDown: null,
    };

    this.kills = 0;
    /** Quien lo elimino (para el registro de bajas). */
    this.killedBy = null;
    /** Ya se ha contabilizado su baja (ver MatchManager.collectDeaths). */
    this.deathHandled = false;
  }

  /** Los bots no reaparecen: si caen al agua, mueren. */
  _checkOutOfBounds() {
    if (!this.world.isOutOfBounds(this)) return;
    this.health = 0;
    this.alive = false;
  }

  /**
   * Un paso de fisica usando el mando que ha rellenado la IA.
   * (La IA se actualiza aparte, en systems/botAI.js.)
   */
  step(dt) {
    if (!this.alive) return;
    this.update(dt, this.botInput);
    this.botInput.update();
  }

  /** Recibe dano de una bala. */
  takeDamage(amount, hx, hy, source = null) {
    if (!this.alive) return;
    if (source) this.lastAttacker = source;

    // Ya en el suelo: acelera el desangrado, no remata de golpe.
    if (this.downed) {
      ReviveManager.hurtDowned(this, amount, source);
      return;
    }

    this.applyDamage(amount);
    if (this.health > 0) return;

    // Igual que el jugador: con companeros en pie queda ABATIDO.
    if (this.canBeDowned) {
      ReviveManager.down(this, source);
      return;
    }

    this.alive = false;
    this.killedBy = source;
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  /**
   * Chapa de un ABATIDO: el nombre, lo que le queda de desangrado y,
   * si alguien lo esta levantando, la barra de reanimacion.
   */
  _drawDownTag(ctx, viewer) {
    const cx = this.x + this.w / 2;
    const top = this.y - 6;
    const aliado = areAllies(this, viewer);
    const color = aliado ? TEAM_COLORS.aliado : '#e05a4a';

    ctx.save();
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';

    const texto = `${this.name} · ABATIDO`;
    const ancho = ctx.measureText(texto).width + 16;

    ctx.fillStyle = 'rgba(10, 16, 34, 0.82)';
    roundRectPath(ctx, cx - ancho / 2, top - 12, ancho, 14, 4);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    roundRectPath(ctx, cx - ancho / 2, top - 12, ancho, 14, 4);
    ctx.stroke();

    ctx.fillStyle = '#ffd0d0';
    ctx.fillText(texto, cx, top - 2);

    // Lo que le queda antes de morir del todo
    const bw = ancho;
    const bx = cx - bw / 2;
    const by = top + 5;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.8)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
    ctx.fillStyle = '#e8a33f';
    ctx.fillRect(bx, by, bw * Math.max(0, this.downHealth / this.maxDownHealth), 4);

    // Y si lo estan levantando, la barra verde por encima
    if (this.reviveProgress > 0) {
      ctx.fillStyle = 'rgba(10, 16, 34, 0.8)';
      ctx.fillRect(bx - 1, by + 6, bw + 2, 6);
      ctx.fillStyle = TEAM_COLORS.aliado;
      ctx.fillRect(bx, by + 7, bw * this.reviveProgress, 4);
    }

    ctx.restore();
  }

  /**
   * Se dibuja igual que el jugador (misma funcion), con su skin y su
   * arma, mas una chapa con el nombre y la vida encima.
   */
  draw(ctx, time, viewer = null) {
    if (!this.alive) return;

    // ABATIDO: se pinta tumbado. Se gira el lienzo alrededor de sus
    // pies, asi no hace falta un dibujo aparte del personaje.
    if (this.downed) {
      ctx.save();
      ctx.translate(this.x + this.w / 2, this.y + this.h);
      ctx.rotate(this.facing > 0 ? -Math.PI / 2 : Math.PI / 2);
      ctx.translate(-(this.x + this.w / 2), -(this.y + this.h));
      ctx.globalAlpha = 0.85;
      drawPlayer(ctx, this, time, this.skin, { item: null, recoil: 0, glider: null });
      ctx.restore();

      this._drawDownTag(ctx, viewer);
      return;
    }

    drawPlayer(ctx, this, time, this.skin, {
      // Cayendo del bus no llevan nada en la mano, solo la paravela.
      item: this.flight ? null : this.weapon,
      recoil: 0,
      glider: this.glider,
    });

    this._drawNameTag(ctx, viewer);
  }

  _drawNameTag(ctx, viewer = null) {
    const cx = this.x + this.w / 2;
    const top = this.y - 20;
    // ALIADO: todo en verde y con un galon encima. En individual nunca
    // es aliado de nadie, asi que sale rojo como siempre.
    const aliado = areAllies(this, viewer);

    ctx.save();
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';

    const ancho = Math.max(ctx.measureText(this.name).width + 14, 48);

    // Fondo
    ctx.fillStyle = aliado ? 'rgba(14, 40, 18, 0.78)' : 'rgba(10, 16, 34, 0.72)';
    roundRectPath(ctx, cx - ancho / 2, top - 12, ancho, 15, 4);
    ctx.fill();
    if (aliado) {
      ctx.strokeStyle = TEAM_COLORS.aliado;
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, cx - ancho / 2, top - 12, ancho, 15, 4);
      ctx.stroke();

      // Galon: se ve aunque la chapa quede tapada por otra cosa.
      ctx.fillStyle = TEAM_COLORS.aliado;
      ctx.beginPath();
      ctx.moveTo(cx, top - 22);
      ctx.lineTo(cx + 7, top - 15);
      ctx.lineTo(cx, top - 17);
      ctx.lineTo(cx - 7, top - 15);
      ctx.closePath();
      ctx.fill();
    }

    // Nombre
    ctx.fillStyle = aliado ? TEAM_COLORS.aliadoClaro : '#ffdede';
    ctx.fillText(this.name, cx, top - 1);

    // Barra de vida (+ escudo si tiene)
    const bw = ancho;
    const bx = cx - bw / 2;
    const by = top + 5;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.72)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
    ctx.fillStyle = aliado ? TEAM_COLORS.aliado : '#e05a4a';
    ctx.fillRect(bx, by, bw * (this.health / this.maxHealth), 4);
    if (this.shield > 0) {
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(bx, by - 3, bw * (this.shield / this.maxShield), 2);
    }

    ctx.restore();

    if (CONFIG.debug.showHitboxes) {
      ctx.strokeStyle = 'rgba(255, 90, 90, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.x, this.y, this.w, this.h);
      ctx.fillStyle = '#ffb3b3';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.ai.state, cx, this.y + this.h + 12);
    }
  }
}
