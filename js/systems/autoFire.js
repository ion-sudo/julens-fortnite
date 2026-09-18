/**
 * autoFire.js
 * ---------------------------------------------------------------
 * DISPARO AUTOMATICO: si tienes un enemigo en la mira y a tiro, el juego
 * aprieta el gatillo por ti.
 *
 * ES UN TRUCO SECRETO, en dos pasos: primero hay que DESBLOQUEARLO y
 * luego ya se enciende y se apaga cuando quieras.
 *
 * 1) DESBLOQUEAR (una vez, y se recuerda):
 *      ORDENADOR     tecleando J - U - L - I seguidas (cuatro teclas que
 *                    no hacen nada en el juego, para no darle sin querer)
 *      MOVIL / IPAD  dejando el dedo 2 segundos quieto en la esquina de
 *                    arriba a la izquierda (ver ui/touchControls.js)
 *
 * 2) USARLO: la tecla O lo enciende y lo apaga. En movil aparece el boton
 *    AUTO en la barra, pero SOLO despues de desbloquearlo.
 *
 * Sin desbloquear, la O no hace nada y no hay ningun boton: quien no se
 * sepa el truco no encuentra esto ni queriendo. Viene APAGADO, y lo unico
 * que se ve mientras esta puesto es un punto minusculo en la esquina de
 * abajo a la izquierda.
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
/** Y donde se guarda si ya se ha descubierto el truco. */
const CLAVE_DESBLOQUEO = 'fortniteClash.auto.desbloqueado.v1';
/** Cono en el que busca enemigos alrededor de la mira (radianes). */
const CONO = 0.35;

/** El truco: estas teclas, en este orden. Ninguna hace nada en el juego. */
const SECRETO = ['KeyJ', 'KeyU', 'KeyL', 'KeyI'];

function cargar() {
  try {
    // Apagado de fabrica: hay que saberse el truco para encenderlo.
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

function cargarDesbloqueo() {
  try {
    return localStorage.getItem(CLAVE_DESBLOQUEO) === '1';
  } catch {
    return false;
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
    /** ¿Ya se sabe el truco? Hasta entonces, la tecla O no hace nada. */
    this.desbloqueado = cargarDesbloqueo();

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

  /**
   * El truco: desbloquea (la primera vez) o enciende y apaga.
   * @returns {'desbloqueado'|boolean}
   */
  secreto() {
    if (!this.desbloqueado) {
      this.desbloquear();
      return 'desbloqueado';
    }
    return this.toggle();
  }

  /** A partir de aqui ya vale la tecla O (y el boton en movil). */
  desbloquear() {
    this.desbloqueado = true;
    try { localStorage.setItem(CLAVE_DESBLOQUEO, '1'); } catch { /* sin guardado */ }
    this.set(true);
    this.onChange?.(this.enabled);
  }

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

  /* =============================================================
     EL TRUCO DEL TECLADO
     -------------------------------------------------------------
     Hay que teclear J-U-L-I del tiron. Si te equivocas de tecla, o
     tardas mas de dos segundos y medio entre una y otra, se empieza
     de cero. Escribiendo tu nombre en el perfil no cuenta.
     ============================================================= */

  escucharSecreto(target = window) {
    let paso = 0;
    let ultima = 0;

    target.addEventListener('keydown', (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

      const ahora = performance.now();
      if (ahora - ultima > 2500) paso = 0;
      ultima = ahora;

      // Vale el codigo de la tecla y, si no llega (teclados en pantalla),
      // la letra: es el mismo respaldo que usa core/input.js.
      const esperada = SECRETO[paso];
      const acierta = e.code ? e.code === esperada : (e.key || '').toLowerCase() === esperada.slice(3).toLowerCase();

      if (!acierta) {
        paso = 0;
        return;
      }

      paso++;
      if (paso < SECRETO.length) return;

      paso = 0;
      this.avisar(this.secreto());
    }, true);
  }

  /**
   * Lo que se ensena al usar el truco o la tecla. Al desbloquear si se
   * canta, que es el premio; el encender y apagar de cada dia, discreto.
   */
  avisar(resultado) {
    if (resultado === 'desbloqueado') {
      this.game.showMessage('AUTO DESBLOQUEADO', 'legendary');
      return;
    }
    this.game.showMessage(resultado ? 'AUTO: SI' : 'AUTO: NO');
  }

  _apretar(valor) {
    if (valor === this._apretado) return;
    this._apretado = valor;
    if (this.onHold) this.onHold(valor);
    else if (valor) this.game.mouse.pressVirtual('left');
    else this.game.mouse.releaseVirtual('left');
  }
}
