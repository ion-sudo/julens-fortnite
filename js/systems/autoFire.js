/**
 * autoFire.js
 * ---------------------------------------------------------------
 * DISPARO AUTOMATICO: si tienes un enemigo en la mira y a tiro, el juego
 * aprieta el gatillo por ti.
 *
 * Estaba dentro de los controles tactiles, y por eso solo existia en
 * movil y iPad. Aqui esta aparte, asi que sirve para los dos sitios:
 *
 *   MOVIL / IPAD  boton AUTO de la barra de arriba
 *   ORDENADOR     boton AUTO de la esquina (ui/autoButton.js) o la tecla O
 *
 * Lo unico que hace es "apretar el raton": el disparo, la cadencia, la
 * municion y el retroceso siguen siendo los de siempre (systems/combat.js).
 * Por eso respeta el arma que lleves: las automaticas las mantiene
 * apretadas y las de un tiro las dispara cada vez que pueden volver a
 * disparar.
 *
 * NO dispara a traves de las paredes: usa la misma comprobacion de linea
 * de vision que los bots.
 */

import { hasLineOfSight } from './botAI.js';
import { areAllies } from './teams.js';

/** Donde se guarda si esta encendido. */
const CLAVE = 'fortniteClash.auto.v1';
/** Cono en el que busca enemigos alrededor de la mira (radianes). */
const CONO = 0.35;

function cargar() {
  try {
    const v = localStorage.getItem(CLAVE);
    // Por defecto encendido: es lo comodo en movil, y en ordenador se
    // apaga de un toque.
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

/** Angulo llevado a -PI..PI. */
function normalizar(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export class AutoFire {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.enabled = cargar();

    /**
     * Quien aprieta el raton. Los controles tactiles lo cambian por el
     * suyo, que lleva la cuenta de varios dedos a la vez (el boton de
     * disparar y el automatico pueden coincidir).
     */
    this.onHold = null;
    /** Ayuda a apuntar (solo tactil): la ponen los controles en pantalla. */
    this.asistir = null;
    /** Aviso de encendido/apagado, para los botones. */
    this.onChange = null;

    this._apretado = false;
  }

  /* =============================================================
     ENCENDER Y APAGAR
     ============================================================= */

  toggle() {
    this.set(!this.enabled);
    return this.enabled;
  }

  set(valor) {
    this.enabled = !!valor;
    if (!this.enabled) this._apretar(false);
    try { localStorage.setItem(CLAVE, this.enabled ? '1' : '0'); } catch { /* sin guardado */ }
    this.onChange?.(this.enabled);
  }

  /* =============================================================
     CADA FRAME
     ============================================================= */

  update(dt) {
    const g = this.game;
    const p = g.player;
    const arma = g.inventory?.equipped;

    // Solo con un arma en la mano, de pie y jugando de verdad.
    const puede = this.enabled &&
      g.state === 'playing' &&
      p.alive && !p.downed && !p.flight && !p.driving && !p.buildMode &&
      !g.emotes?.wheelOpen &&
      !g.minigame?.blocksActions &&
      (g.minigame ? g.minigame.state !== 'fin' : g.match?.result === 'jugando') &&
      arma?.kind === 'weapon' && !arma.def.effect;

    if (!puede) {
      this._apretar(false);
      return null;
    }

    const objetivo = this.buscarObjetivo(arma);
    if (!objetivo) {
      this._apretar(false);
      return null;
    }

    // En movil, ademas, acerca un poco la mira al enemigo.
    this.asistir?.(objetivo, dt);

    if (!objetivo.enMira) {
      this._apretar(false);
    } else if (arma.def.auto) {
      this._apretar(true);
    } else {
      // Las de un tiro disparan al PULSAR: un clic cada vez que se puede.
      this._apretar(false);
      if (g.combat.cooldown <= 0) g.mouse.clickVirtual('left');
    }
    return objetivo;
  }

  /**
   * El enemigo mas prometedor cerca de la mira: dentro del cono, a tiro y
   * sin paredes por medio.
   * @returns {{ang:number, dist:number, enMira:boolean}|null}
   */
  buscarObjetivo(arma) {
    const g = this.game;
    const p = g.player;
    const hx = p.handX;
    const hy = p.handY;
    const alcance = arma.def.range * 0.95;
    let mejor = null;

    const mirar = (t) => {
      const r = t.rect ? t.rect() : t;
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const dist = Math.hypot(cx - hx, cy - hy);
      if (dist > alcance || dist < 1) return;

      const ang = Math.atan2(cy - hy, cx - hx);
      const diff = Math.abs(normalizar(ang - p.aimAngle));
      if (diff > CONO) return;
      if (!hasLineOfSight(p, r, g.world)) return;

      // "En la mira": el angulo que ocupa su cuerpo visto desde el arma.
      const tolerancia = Math.atan2(Math.max(r.h * 0.5, 20), dist) + 0.02;
      const cand = { ang, dist, enMira: diff <= tolerancia };
      if (!mejor || (cand.enMira && !mejor.enMira) || (cand.enMira === mejor.enMira && dist < mejor.dist)) {
        mejor = cand;
      }
    };

    for (const e of g.match?.entities || []) {
      if (e === p || areAllies(p, e)) continue;
      mirar(e);
    }
    // Dianas, maniquies y los zombis de JULEN DEFENSA.
    for (const t of g.targets || []) {
      if (t.dead || t.alive === false) continue;
      mirar(t);
    }
    return mejor;
  }

  _apretar(valor) {
    if (valor === this._apretado) return;
    this._apretado = valor;
    if (this.onHold) this.onHold(valor);
    else if (valor) this.game.mouse.pressVirtual('left');
    else this.game.mouse.releaseVirtual('left');
  }
}
