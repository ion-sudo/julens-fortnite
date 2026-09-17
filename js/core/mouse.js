/**
 * mouse.js
 * ---------------------------------------------------------------
 * Entrada de RATON para apuntar y disparar.
 *
 * Su trabajo principal es traducir la posicion del cursor (pixeles de
 * pantalla) a COORDENADAS DEL MUNDO, teniendo en cuenta dos cosas:
 *   1. el canvas tiene resolucion interna fija (1280x720) pero CSS lo escala
 *   2. la camara tiene zoom y esta desplazada
 *
 * API:
 *   mouse.worldX / worldY   posicion del cursor en el mundo
 *   mouse.left / right      botones mantenidos
 *   mouse.leftPressed       clic izquierdo justo en este frame
 *   mouse.update()          llamar al final del frame
 */

export class Mouse {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./camera.js').Camera} camera
   */
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;

    // Posicion en pixeles internos del canvas (0..1280, 0..720)
    this.screenX = canvas.width / 2;
    this.screenY = canvas.height / 2;

    // Posicion equivalente en el mundo (la recalcula update())
    this.worldX = 0;
    this.worldY = 0;

    // El boton puede estar apretado por el RATON de verdad o por algo
    // virtual (la pantalla tactil, el disparo automatico). Se llevan
    // aparte para que soltar uno no suelte el otro: con el automatico
    // puesto, tu clic manual tiene que seguir valiendo, y al reves.
    this._realLeft = false;
    this._realRight = false;
    this._virtualLeft = false;
    this._virtualRight = false;
    this.leftPressed = false;
    this.rightPressed = false;
    /** true mientras el cursor este dentro del lienzo. */
    this.inside = false;

    this._onMove = this._onMove.bind(this);
    this._onDown = this._onDown.bind(this);
    this._onUp = this._onUp.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._onBlur = this._onBlur.bind(this);
  }

  /** ¿Esta apretado el boton? Da igual si es el raton o algo virtual. */
  get left() { return this._realLeft || this._virtualLeft; }
  get right() { return this._realRight || this._virtualRight; }

  attach() {
    this.canvas.addEventListener('mousemove', this._onMove);
    this.canvas.addEventListener('mousedown', this._onDown);
    // El mouseup va en window: si sueltas fuera del canvas, tambien cuenta.
    window.addEventListener('mouseup', this._onUp);
    this.canvas.addEventListener('contextmenu', this._onContextMenu);
    this.canvas.addEventListener('mouseleave', this._onLeave);
    window.addEventListener('blur', this._onBlur);
  }

  detach() {
    this.canvas.removeEventListener('mousemove', this._onMove);
    this.canvas.removeEventListener('mousedown', this._onDown);
    window.removeEventListener('mouseup', this._onUp);
    this.canvas.removeEventListener('contextmenu', this._onContextMenu);
    this.canvas.removeEventListener('mouseleave', this._onLeave);
    window.removeEventListener('blur', this._onBlur);
    this._onBlur();
  }

  /** Pantalla (CSS) -> pixeles internos del canvas. */
  _updateFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.screenX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    this.screenY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    this.inside = true;
  }

  _onMove(e) { this._updateFromEvent(e); }

  _onDown(e) {
    this._updateFromEvent(e);
    if (e.button === 0) { this._realLeft = true; this.leftPressed = true; }
    if (e.button === 2) { this._realRight = true; this.rightPressed = true; e.preventDefault(); }
  }

  _onUp(e) {
    if (e.button === 0) this._realLeft = false;
    if (e.button === 2) this._realRight = false;
  }

  /** Sin esto, el clic derecho abriria el menu contextual del navegador. */
  _onContextMenu(e) { e.preventDefault(); }

  _onLeave() { this.inside = false; }

  _onBlur() {
    this._realLeft = false;
    this._realRight = false;
    this._virtualLeft = false;
    this._virtualRight = false;
    this.leftPressed = false;
    this.rightPressed = false;
  }

  /* =============================================================
     RATON VIRTUAL (controles tactiles, ui/touchControls.js)
     -------------------------------------------------------------
     El dedo mueve la mira y aprieta los botones por aqui, asi que el
     combate, la construccion y las pantallas que se pulsan siguen
     leyendo el raton de siempre.
     ============================================================= */

  /** Pone el cursor en un punto del lienzo (pixeles internos). */
  setVirtualPosition(sx, sy) {
    this.screenX = Math.max(0, Math.min(this.canvas.width, sx));
    this.screenY = Math.max(0, Math.min(this.canvas.height, sy));
    this.inside = true;
  }

  /** Aprieta un boton ('left' o 'right') y lo deja apretado. */
  pressVirtual(boton = 'left') {
    if (boton === 'right') {
      if (!this.right) this.rightPressed = true;
      this._virtualRight = true;
    } else {
      if (!this.left) this.leftPressed = true;
      this._virtualLeft = true;
    }
  }

  releaseVirtual(boton = 'left') {
    if (boton === 'right') this._virtualRight = false;
    else this._virtualLeft = false;
  }

  /** Un clic: pulsado este frame, sin quedarse apretado. */
  clickVirtual(boton = 'left') {
    if (boton === 'right') this.rightPressed = true;
    else this.leftPressed = true;
  }

  /**
   * Recalcula la posicion en el mundo. Hay que llamarlo cada frame
   * DESPUES de mover la camara, para que la mira no vaya con retraso.
   */
  syncWorld() {
    const cam = this.camera;
    this.worldX = cam.x + this.screenX / cam.zoom;
    this.worldY = cam.y + this.screenY / cam.zoom;
  }

  /** Limpia las pulsaciones de un frame. Llamar al final del update. */
  update() {
    this.leftPressed = false;
    this.rightPressed = false;
  }
}
