/**
 * device.js
 * ---------------------------------------------------------------
 * ¿SE ESTA JUGANDO CON EL DEDO O CON RATON Y TECLADO?
 *
 * Lo decide al arrancar y lo SIGUE MIRANDO mientras juegas, porque hay
 * aparatos que tienen las dos cosas (un iPad con teclado, un portatil con
 * pantalla tactil). La respuesta se deja en el body como la clase
 * `modo-tactil`: el CSS la usa para ensenar u ocultar los botones en
 * pantalla, y main.js para ajustar el tamano del lienzo.
 *
 * Como cambia de un modo a otro:
 *
 *   un TOQUE en la pantalla           -> modo tactil
 *   mover un RATON de verdad          -> modo ordenador
 *   pulsar una TECLA fuera de un campo de texto -> modo ordenador
 *
 * OJO con el raton "de mentira": despues de cada toque, el navegador
 * manda eventos de raton de compatibilidad (para paginas antiguas). Si
 * se hiciera caso a esos, cada toque apagaria el modo tactil al momento.
 * Por eso, justo despues de un toque, el raton no cuenta.
 */

/** Tras un toque, cuanto tiempo se ignora el raton (ms). */
const ESPERA_RATON_FALSO = 900;

/**
 * Primera impresion, antes de que nadie toque nada.
 *
 * `pointer: coarse` es "el puntero principal es un dedo" (moviles y
 * tablets). El segundo caso pilla a los iPad, que se presentan como un
 * Mac pero tienen puntos de contacto y ningun puntero fino.
 */
export function pareceTactil() {
  const media = (q) => !!window.matchMedia?.(q).matches;
  const dedoPrincipal = media('(pointer: coarse)');
  const puntos = (navigator.maxTouchPoints || 0) > 0;
  const hayRaton = media('(any-pointer: fine)');
  return dedoPrincipal || (puntos && !hayRaton);
}

export class DeviceMode {
  constructor() {
    /** true = controles tactiles en pantalla. */
    this.tactil = pareceTactil();
    /** Aviso de cambio de modo: (tactil) => void. Lo engancha main.js. */
    this.onChange = null;

    this._ultimoToque = -Infinity;
    this._aplicar();

    // capture: true para enterarse antes que nadie, aunque un boton pare
    // el evento.
    const toque = () => {
      this._ultimoToque = performance.now();
      this._poner(true);
    };
    window.addEventListener('touchstart', toque, { passive: true, capture: true });
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') toque();
    }, true);

    window.addEventListener('mousemove', (e) => {
      if (this._recienTocado()) return;
      // Un raton de verdad se mueve; los de compatibilidad suelen venir quietos.
      if (!e.movementX && !e.movementY) return;
      this._poner(false);
    }, true);

    window.addEventListener('keydown', (e) => {
      if (!e.isTrusted || this._recienTocado()) return;
      // Escribir tu nombre con el teclado del movil no es "usar teclado".
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      this._poner(false);
    }, true);
  }

  /** Para probar, o para un ajuste manual. */
  forzar(tactil) {
    this._poner(!!tactil);
  }

  _recienTocado() {
    return performance.now() - this._ultimoToque < ESPERA_RATON_FALSO;
  }

  _poner(valor) {
    if (valor === this.tactil) return;
    this.tactil = valor;
    this._aplicar();
    this.onChange?.(valor);
  }

  _aplicar() {
    document.body.classList.toggle('modo-tactil', this.tactil);
  }
}
