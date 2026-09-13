/**
 * main.js
 * ---------------------------------------------------------------
 * Punto de entrada: monta las tres piezas y las conecta.
 *
 *   Profile  -> pavos, compras y equipamiento (localStorage)
 *   Menu     -> interfaz DOM: inicio, tienda, taquilla, instrucciones
 *   Game     -> escenario, jugador y bucle de render
 *
 * El flujo es: menu -> elegir modo -> partida -> Escape -> menu.
 *
 * Todo el arranque va dentro de una red de seguridad (core/boot.js): si
 * algo falla, se ve un panel con el error en vez de quedarse la pantalla
 * en blanco sin explicacion.
 */

import { CONFIG } from './core/config.js';
import { Game } from './core/game.js';
import { Profile } from './core/profile.js';
import { Menu } from './ui/menu.js';
import { showFatalError, watchRuntimeErrors } from './core/boot.js';
import { BootScreen } from './ui/bootScreen.js';
import { AudioPanel } from './ui/audioPanel.js';
import { PAVOS_POR_OLEADA } from './data/defense.js';
import { contarVisita, formatear } from './core/contador.js';

const canvas = document.getElementById('game-canvas');

/** Ajusta el tamano CSS del canvas (la resolucion interna no cambia). */
function resize() {
  const margin = 24;
  const availW = window.innerWidth - margin;
  const availH = window.innerHeight - margin;
  const ratio = CONFIG.canvas.width / CONFIG.canvas.height;

  let w = availW;
  let h = w / ratio;
  if (h > availH) {
    h = availH;
    w = h * ratio;
  }

  canvas.style.width = `${Math.floor(w)}px`;
  canvas.style.height = `${Math.floor(h)}px`;
}

/* =============================================================
   MONTAJE
   ============================================================= */

function arrancar() {
  window.addEventListener('resize', resize);
  resize();

  // PORTADA DE CARGA. Arranca lo primero de todo, antes de montar nada,
  // para que se vea al momento; se retira sola cuando el juego esta
  // listo (y nunca antes de un par de segundos, o pasaria de largo sin
  // que diera tiempo a verla).
  const bootCanvas = document.getElementById('boot-canvas');
  const portada = bootCanvas ? new BootScreen(bootCanvas) : null;
  portada?.start();

  const profile = new Profile();
  const game = new Game(canvas);

  // El sistema de misiones necesita el perfil (ahi se guarda el progreso
  // y de ahi salen los pavos de las recompensas).
  game.attachProfile(profile);

  // Control de sonido (altavoz de la esquina). Se monta pronto para que
  // el volumen guardado este puesto antes del primer sonido.
  const audioPanel = new AudioPanel(profile);

  // El bucle se arranca ANTES del menu: asi, si el menu fallase, al menos
  // el escenario se sigue viendo y el fallo es evidente.
  game.enterMenu();
  game.start();

  const menu = new Menu(profile, {
    // JUGAR un MODO: se oculta el menu y arranca la partida con lo
    // equipado. `mode` dice a que se juega (ver data/modes.js): el
    // boton grande del inicio manda 'royale' y las tarjetas de MAS
    // JUEGOS mandan la suya.
    onPlay: (loadout, mode) => {
      try {
        menu.hide();
        game.startMatch(loadout, mode);
      } catch (e) {
        showFatalError(e, `inicio de partida (${mode})`);
      }
    },

    // JUGAR a un MINIJUEGO: el menu ya se ha ocultado solo.
    onPlayMinigame: (id, loadout) => {
      try {
        game.startMinigame(id, loadout);
      } catch (e) {
        showFatalError(e, `minijuego ${id}`);
      }
    },
  });

  // Escape durante la partida: terminar y volver al menu principal.
  // Al terminar una partida se ganan pavos (empezamos con cero).
  // Salir de un minijuego: se vuelve a la pantalla de minijuegos, que es
  // de donde se venia (asi se puede reintentar sin dar vueltas).
  game.onExitToMinigames = () => {
    game.endMinigame();
    menu.show('minigames');
  };

  /**
   * Reparte lo que da una partida terminada y arma el aviso.
   *
   * Lo comparten las dos formas de acabar: salir al menu y, en los modos
   * que cuentan como partida (JULEN DEFENSA), el boton REINTENTAR.
   * @returns {string|null} el texto del aviso, o null si no se llego a jugar
   */
  const repartirPremios = (resumen) => {
    if (!resumen.played) return null;

    const ganado = profile.addMatchReward();
    const partes = [`+${ganado} pavos`];

    // JULEN DEFENSA: un extra por cada oleada aguantada.
    if (resumen.waves > 0) {
      const extra = resumen.waves * PAVOS_POR_OLEADA;
      profile.addVbucks(extra);
      partes.push(`+${extra} por ${resumen.waves} oleada(s)`);
    }

    const mis = resumen.missions || [];
    if (mis.length) {
      const extra = mis.reduce((a, m) => a + m.reward, 0);
      partes.push(`+${extra} por ${mis.length} mision(es)`);
    }

    const xp = resumen.xp;
    if (xp && xp.ganada > 0) {
      partes.push(`+${xp.ganada} XP`);
      if (xp.subidos.length) {
        partes.push(xp.subidos.length === 1
          ? `¡NIVEL ${xp.nivel}!`
          : `¡${xp.subidos.length} niveles! Vas por el ${xp.nivel}`);
      }
      // Y lo que haya soltado el pase de batalla al subir.
      if (xp.premios?.length) {
        partes.push(`${xp.premios.length} recompensa(s) del pase`);
      }
    }

    return partes.join(' · ');
  };

  game.onExitToMenu = () => {
    // Un minijuego de entreno no cuenta como partida ni da pavos: se
    // vuelve al menu y ya.
    if (game.minigame && !game.minigame.countsAsMatch) {
      game.endMinigame();
      menu.show('home');
      return;
    }

    // Una partida normal, o un modo que cuenta como partida.
    const resumen = game.minigame ? game.endCountedMinigame() : game.endMatch();
    const texto = repartirPremios(resumen);
    menu.show('home');
    if (texto) menu.toast(texto);
  };

  // REINTENTAR en un modo que cuenta como partida: se cobra la que acaba
  // de terminar y se empieza otra con lo mismo equipado.
  game.onRetryCounted = () => {
    const loadout = game.loadout;
    const modo = game.mode;
    const texto = repartirPremios(game.endCountedMinigame());
    game.startMatch(loadout, modo);
    if (texto) game.showMessage(texto, 'legendary');
  };

  menu.show('home');

  // Todo montado: la portada se llena y se va con un fundido.
  portada?.finish();

  // Expuesto en consola para depurar comodamente.
  window.FC = { game, menu, profile, CONFIG, portada, audioPanel };

  // CONTADOR DE VISITAS. Va lo ultimo y sin esperar a nada: si el
  // servicio tarda o esta caido, el juego ya esta funcionando y el
  // contador simplemente no aparece.
  contarVisita((total) => {
    const caja = document.getElementById('visitas-display');
    const numero = document.getElementById('visitas-amount');
    if (!caja || !numero) return;
    numero.textContent = formatear(total);
    caja.classList.remove('hidden');
  });

  // Avisa al vigilante de arranque de que todo ha ido bien.
  if (window.__fcArrancado) window.__fcArrancado();

  console.log("%cJULEN'S FORTNITE listo", 'color:#ffd23f;font-weight:bold;font-size:14px');
  console.log('Menu: JUGAR · TIENDA · TAQUILLA. En partida: clic izq disparar, clic der apuntar, E abrir, Esc salir.');
}

watchRuntimeErrors();

try {
  arrancar();
} catch (e) {
  showFatalError(e, 'arranque');
}
