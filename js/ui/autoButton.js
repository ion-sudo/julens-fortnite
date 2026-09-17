/**
 * autoButton.js
 * ---------------------------------------------------------------
 * EL BOTON DE DISPARO AUTOMATICO EN ORDENADOR.
 *
 * En movil e iPad el boton AUTO ya sale en la barra de los controles
 * tactiles (ui/touchControls.js). En ordenador no habia ninguno, asi que
 * el disparo automatico no se podia ni encender: este boton lo arregla.
 *
 * Va junto al del sonido, solo se ve DURANTE la partida (en el menu
 * estorba) y hace exactamente lo mismo que la tecla O.
 */

export class AutoButton {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;

    const b = document.createElement('button');
    b.id = 'auto-boton';
    b.type = 'button';
    b.title = 'Disparo automatico (tecla O)';
    b.innerHTML = '<span class="auto-icono">⚡</span><span class="auto-texto">AUTO</span>';
    document.body.appendChild(b);
    this.boton = b;

    b.addEventListener('click', () => {
      const encendido = game.autoFire.toggle();
      game.showMessage(
        encendido ? 'Disparo automatico: SI' : 'Disparo automatico: NO',
        encendido ? 'uncommon' : null
      );
    });

    // Si se enciende con la tecla, el boton se entera igual.
    game.autoFire.onChange = (encendido) => this._pintar(encendido);
    this._pintar(game.autoFire.enabled);
  }

  _pintar(encendido) {
    this.boton.classList.toggle('encendido', encendido);
    this.boton.querySelector('.auto-texto').textContent = encendido ? 'AUTO' : 'AUTO NO';
  }
}
