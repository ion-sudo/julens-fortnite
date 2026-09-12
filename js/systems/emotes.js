/**
 * emotes.js (sistema)
 * ---------------------------------------------------------------
 * LOS EMOTES EN PARTIDA: la rueda, el que se esta haciendo y cuando se
 * corta.
 *
 * Reglas, que son las que le dan sentido:
 *
 *   - la rueda se abre con B y CONGELA al jugador mientras esta abierta
 *   - bailar te deja VENDIDO: no disparas, no construyes, no te curas
 *   - moverte, saltar, disparar o recibir un tiro lo corta al momento
 *
 * Sin lo ultimo un emote seria una animacion bonita sin ninguna
 * consecuencia; con ello, sacar un baile en mitad de la partida es una
 * decision (y una provocacion).
 */

import { EMOTES, emoteById, WHEEL_SLOTS } from '../data/emotes.js';

export class EmoteManager {
  /**
   * @param {object} deps { player, profile }
   */
  constructor(deps) {
    this.player = deps.player;
    this.profile = deps.profile || null;

    /** true mientras la rueda esta abierta. */
    this.wheelOpen = false;
    /** Indice resaltado en la rueda (-1 = ninguno). */
    this.hover = -1;

    /** Aviso para la pantalla (lo enchufa game.js). */
    this.onMessage = null;

    /**
     * EL CLIC CON EL QUE ELIGES NO CUENTA COMO DISPARAR.
     *
     * Sin esto, el emote duraba UN FRAME: eliges con el raton, se pone a
     * bailar, y al frame siguiente el corte por "estas disparando" veia
     * el boton todavia pulsado —un clic normal dura seis frames— y lo
     * paraba. Hasta que sueltes el boton, el raton no cuenta.
     */
    this._ignoraRaton = false;
    /**
     * Y un respiro por si acaso: si acabas de elegir con la tecla 1..6 y
     * todavia tienes otra pulsada, tampoco se corta al instante.
     */
    this._gracia = 0;
  }

  reset() {
    this.wheelOpen = false;
    this.hover = -1;
    this._ignoraRaton = false;
    this._gracia = 0;
    this.stop();
  }

  /** Los seis emotes que el jugador lleva equipados en la rueda. */
  get slots() {
    const eq = this.profile?.emoteSlots || [];
    const out = [];
    for (let i = 0; i < WHEEL_SLOTS; i++) {
      const id = eq[i];
      // Solo entran los que tenga desbloqueados: si vende uno o se
      // reinicia el perfil, la rueda no puede quedarse con un hueco roto.
      out.push(id && this.profile?.hasEmote(id) ? emoteById(id) : null);
    }
    return out;
  }

  /* =============================================================
     UPDATE
     ============================================================= */

  /**
   * @param {number} dt
   * @param {import('../core/input.js').Input} input
   * @param {object} mouse
   */
  update(dt, input, mouse) {
    const p = this.player;

    // El clic de elegir deja de contar en cuanto sueltas el boton.
    if (!mouse.left) this._ignoraRaton = false;
    this._gracia = Math.max(0, this._gracia - dt);

    // --- Abrir y cerrar la rueda ---
    if (input.consume('emoteWheel')) {
      this.wheelOpen = !this.wheelOpen;
      this.hover = -1;
      if (this.wheelOpen) this.stop();
    }

    // Bailando o eligiendo, nunca en el aire ni abatido ni conduciendo.
    if (!this._puedeBailar()) {
      this.wheelOpen = false;
      this.stop();
      return;
    }

    if (this.wheelOpen) {
      this._updateWheel(input, mouse);
      return;
    }

    // --- Emote en marcha ---
    if (!p.emote) return;

    p.emoteTime += dt;

    // Los de duracion fija se acaban solos; los de bucle, cuando te mueves.
    if (p.emote.duration !== null && p.emoteTime >= p.emote.duration) {
      this.stop();
      return;
    }
    if (this._gracia <= 0 && this._seHaMovido(input, mouse)) this.stop();
  }

  /** La rueda: el raton apunta y el clic (o 1..6) elige. */
  _updateWheel(input, mouse) {
    const lista = this.slots;

    // --- Teclas 1..6 ---
    for (let i = 0; i < WHEEL_SLOTS; i++) {
      if (input.consume(`slot${i + 1}`)) {
        this.play(lista[i]);
        return;
      }
    }

    // --- Raton: el sector al que apunta desde el centro ---
    // El centro de la pantalla, que es donde se dibuja la rueda.
    const cx = mouse.canvas.width / 2;
    const cy = mouse.canvas.height / 2;
    const dx = mouse.screenX - cx;
    const dy = mouse.screenY - cy;

    if (Math.hypot(dx, dy) < 46) {
      this.hover = -1;      // en el centro no se elige nada
    } else {
      // El sector 0 empieza ARRIBA, no a la derecha: es donde la gente
      // espera que este el primero.
      let a = Math.atan2(dy, dx) + Math.PI / 2;
      if (a < 0) a += Math.PI * 2;
      this.hover = Math.floor((a / (Math.PI * 2)) * WHEEL_SLOTS) % WHEEL_SLOTS;
    }

    if (mouse.leftPressed && this.hover >= 0) this.play(lista[this.hover]);
  }

  /** ¿Ha hecho algo que deba cortar el baile? */
  _seHaMovido(input, mouse) {
    const p = this.player;
    return input.axisX !== 0
      || input.isDown('jump')
      || input.isDown('crouch')
      // El boton del raton solo cuenta despues de haberlo soltado una
      // vez: si no, el clic con el que has elegido corta el emote.
      || (mouse.left && !this._ignoraRaton)
      || !p.onGround
      || p.hurtFlash > 0;      // le han dado
  }

  /** Situaciones en las que no se puede bailar. */
  _puedeBailar() {
    const p = this.player;
    return p.alive && !p.downed && !p.flight && !p.driving && !p.riding && !p.swimming;
  }

  /* =============================================================
     EMPEZAR Y PARAR
     ============================================================= */

  /** Arranca un emote. `null` (ranura vacia) simplemente cierra la rueda. */
  play(def) {
    this.wheelOpen = false;
    this.hover = -1;
    if (!def) return false;

    const p = this.player;
    p.emote = def;
    p.emoteTime = 0;

    // El clic (o la tecla) con el que acabas de elegir no debe cortarlo.
    this._ignoraRaton = true;
    this._gracia = 0.2;

    p.buildMode = false;
    p.aiming = false;
    p.cancelAction?.();
    p.vx = 0;

    this.onMessage?.(def.name, def.rarity);
    return true;
  }

  /** Corta lo que este haciendo. */
  stop() {
    this.player.emote = null;
    this.player.emoteTime = 0;
  }

  /** ¿Esta bailando ahora mismo? */
  get active() {
    return !!this.player.emote;
  }
}

export { EMOTES, WHEEL_SLOTS };
