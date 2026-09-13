/**
 * input.js
 * ---------------------------------------------------------------
 * Gestor de entrada por teclado basado en ACCIONES, no en teclas sueltas.
 * Asi, cuando anadamos armas/construccion, basta con anadir la accion en
 * CONFIG.keys y consultarla con input.isDown('build') etc.
 *
 * API:
 *   input.isDown(action)     -> boolean (mantenida)
 *   input.wasPressed(action) -> boolean (pulsada en ESTE frame)
 *   input.consume(action)    -> boolean (pulsada y la "gasta")
 *   input.update()           -> llamar al FINAL de cada frame
 */

import { CONFIG } from './config.js';

export class Input {
  constructor(keymap = CONFIG.keys) {
    /** Mapa inverso: 'KeyA' -> ['left'] */
    this.codeToActions = new Map();
    for (const [action, codes] of Object.entries(keymap)) {
      for (const code of codes) {
        if (!this.codeToActions.has(code)) this.codeToActions.set(code, []);
        this.codeToActions.get(code).push(action);
      }
    }

    /**
     * Mapa de respaldo por LETRA: 'a' -> ['left'].
     *
     * Solo se usa cuando el evento llega sin `code` (ver `_actionsFor`).
     * Se saca de los propios codigos: 'KeyA' -> 'a', 'Digit1' -> '1'.
     */
    this.keyToActions = new Map();
    for (const [code, acciones] of this.codeToActions) {
      const letra = code.startsWith('Key') ? code.slice(3).toLowerCase()
        : code.startsWith('Digit') ? code.slice(5)
        : code === 'Space' ? ' '
        : code.startsWith('Numpad') ? code.slice(6)
        : code.toLowerCase();
      if (!this.keyToActions.has(letra)) this.keyToActions.set(letra, acciones);
    }

    this.down = new Set();     // acciones mantenidas
    this.pressed = new Set();  // acciones pulsadas este frame
    /** Acciones apretadas desde la pantalla tactil (ver pressVirtual). */
    this.virtual = new Set();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
  }

  /** Engancha los listeners globales. */
  attach(target = window) {
    // Una partida nueva empieza SIN NADA PULSADO. Sin esto, un toque de
    // la pantalla hecho fuera de partida ("Salir" justo cuando acababa)
    // se quedaba guardado, porque en el menu nadie lo gasta, y sacaba al
    // menu la partida siguiente en su primer frame.
    this._onBlur();
    this.virtual.clear();
    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp);
    target.addEventListener('blur', this._onBlur);
  }

  detach(target = window) {
    target.removeEventListener('keydown', this._onKeyDown);
    target.removeEventListener('keyup', this._onKeyUp);
    target.removeEventListener('blur', this._onBlur);
    // Y al salir de la partida, tampoco se lleva nada pulsado.
    this._onBlur();
    this.virtual.clear();
  }

  /**
   * Acciones de una tecla.
   *
   * Se busca por `e.code` (la POSICION fisica de la tecla, que es lo
   * correcto: la A esta donde esta aunque el teclado sea frances). Pero
   * algunas formas de escribir —teclados en pantalla, escritorio
   * remoto, automatizacion— mandan el evento SIN `code`, solo con
   * `key`, y entonces el juego se quedaba sordo. Ahi se usa `key` como
   * respaldo, sin tocar el camino normal.
   */
  _actionsFor(e) {
    const porCodigo = this.codeToActions.get(e.code);
    if (porCodigo) return porCodigo;
    if (e.code) return null;                 // tenia code, pero no es nuestro
    return this.keyToActions.get((e.key || '').toLowerCase()) || null;
  }

  _onKeyDown(e) {
    const actions = this._actionsFor(e);
    if (!actions) return;

    // Evita que Espacio/flechas hagan scroll de la pagina.
    e.preventDefault();

    // e.repeat -> autorepeat del SO: mantiene "down" pero NO cuenta como pulsacion nueva.
    for (const action of actions) {
      if (!e.repeat && !this.down.has(action)) this.pressed.add(action);
      this.down.add(action);
    }
  }

  _onKeyUp(e) {
    // Mismo respaldo que al pulsar: si soltar no encontrara la accion,
    // la tecla se quedaria "pulsada" para siempre.
    const actions = this._actionsFor(e);
    if (!actions) return;
    e.preventDefault();
    for (const action of actions) this.down.delete(action);
  }

  /** Si la ventana pierde el foco soltamos todo (evita quedarse "corriendo solo"). */
  _onBlur() {
    this.down.clear();
    this.pressed.clear();
  }

  /* =============================================================
     TECLAS VIRTUALES (controles tactiles, ui/touchControls.js)
     -------------------------------------------------------------
     Un boton en pantalla hace EXACTAMENTE lo mismo que su tecla: en vez
     de inventarse otra forma de saltar o construir, "pulsa" la misma
     accion. El resto del juego sigue leyendo isDown('jump') y no sabe
     si ha sido un dedo o el teclado.
     ============================================================= */

  /** Aprieta una accion, como pulsar su tecla y dejarla pulsada. */
  pressVirtual(action) {
    if (!this.down.has(action)) this.pressed.add(action);
    this.down.add(action);
    this.virtual.add(action);
  }

  /** La suelta. */
  releaseVirtual(action) {
    this.virtual.delete(action);
    this.down.delete(action);
  }

  /** Un toque: cuenta como pulsada este frame (lo que se lee con consume). */
  tapVirtual(action) {
    this.pressed.add(action);
  }

  /** Suelta todo lo apretado desde la pantalla. */
  releaseAllVirtual() {
    for (const a of this.virtual) this.down.delete(a);
    this.virtual.clear();
  }

  isDown(action) { return this.down.has(action); }
  wasPressed(action) { return this.pressed.has(action); }

  /** Como wasPressed pero marca la accion como ya usada en este frame. */
  consume(action) {
    if (!this.pressed.has(action)) return false;
    this.pressed.delete(action);
    return true;
  }

  /** Eje horizontal: -1 izquierda, +1 derecha, 0 quieto. */
  get axisX() {
    return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
  }

  /** Limpia las pulsaciones de un frame. Llamar al final del update del juego. */
  update() {
    this.pressed.clear();
  }
}
