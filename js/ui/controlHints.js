/**
 * controlHints.js
 * ---------------------------------------------------------------
 * LOS AVISOS QUE NOMBRAN UN CONTROL, segun se juegue.
 *
 * "E para abrir" tiene sentido con teclado, pero en un movil no hay
 * ninguna E: hay un boton que pone COGER. Todos los carteles del juego
 * que nombran una tecla la piden aqui, y aqui se decide si se dice la
 * tecla o el boton de la pantalla (ver ui/touchControls.js).
 *
 * Se mira en el momento de pintar el aviso: si alguien pasa del dedo al
 * raton a mitad de partida, los carteles cambian solos.
 */

/** ¿Se esta jugando con el dedo? (la clase la pone core/device.js) */
export function esTactil() {
  return typeof document !== 'undefined' && document.body.classList.contains('modo-tactil');
}

/**
 * Nombre de cada control: [con teclado, en pantalla tactil].
 * Lo de la derecha es exactamente lo que pone el boton.
 */
const NOMBRES = {
  pickup: ['E', 'COGER'],
  jump: ['ESPACIO', 'SALTAR'],
  vehicle: ['V', 'SUBIR'],
  buildMode: ['Q', 'COMBATE'],
  map: ['M', 'MAPA'],
  emotes: ['B', 'BAILES'],
  shop: ['T', 'TIENDA'],
  upgrade: ['G', 'MEJORAR'],
  ready: ['P', 'EMPEZAR'],
  place: ['clic izquierdo', 'COLOCAR'],
};

/** El nombre de un control: `control('pickup')` -> 'E' o 'COGER'. */
export function control(accion) {
  const par = NOMBRES[accion];
  if (!par) return accion;
  return esTactil() ? par[1] : par[0];
}

/**
 * Para las frases que no quedan bien cambiando solo una palabra
 * ("PULSA ESPACIO PARA SALTAR" -> "TOCA SALTAR PARA TIRARTE").
 */
export function segunControl(conTeclado, enTactil) {
  return esTactil() ? enTactil : conTeclado;
}
