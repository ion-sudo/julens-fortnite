/**
 * touchControls.js
 * ---------------------------------------------------------------
 * CONTROLES TACTILES en pantalla, al estilo de Fortnite Mobile.
 *
 * LA REGLA DE ORO: esto NO tiene mecanicas propias. Cada boton hace
 * exactamente lo que su tecla, porque "pulsa" la misma accion del
 * teclado (`input.pressVirtual('jump')`) o el mismo boton del raton
 * (`mouse.pressVirtual('left')`). El juego sigue leyendo el teclado y el
 * raton como siempre y no sabe si ha sido un dedo.
 *
 *   IZQUIERDA  joystick flotante: sale donde pongas el dedo.
 *              Empujar hasta el borde = correr. Hacia abajo = agacharse.
 *   DERECHA    disparar (grande), saltar, agacharse, apuntar, correr,
 *              coger/abrir, pico y construir. En modo construccion,
 *              pared, suelo, rampa y volver al combate.
 *   ARRIBA     salir, mapa, bailes, granada, soltar, disparo automatico
 *              y pantalla completa (arriba en iPad, en el lateral en movil).
 *   INVENTARIO las ranuras que ya pinta el juego se tocan directamente.
 *
 * APUNTAR: arrastrando el dedo por cualquier sitio libre (o por el boton
 * de disparar mientras disparas). La mira va PEGADA al personaje: si
 * andas, viene contigo, en vez de quedarse clavada en la pantalla.
 *
 * DISPARO AUTOMATICO (recomendado en movil): si hay un enemigo en la
 * mira y a tiro, dispara solo, y ademas acerca un poco la mira hacia el.
 *
 * PANTALLAS QUE SE PULSAN (la tienda de Defensa, la rueda de bailes, el
 * final de partida...): mientras estan abiertas, tocar la pantalla es
 * hacer clic justo en ese punto.
 *
 * Todo esto solo existe para quien juega con el dedo: en ordenador el
 * modulo no hace nada y el CSS no lo ensena.
 */

import { inventorySlotRects } from './inventoryHud.js';
import { SLOT_COUNT, PICKAXE_SLOT } from '../core/inventory.js';

/** Donde se guardan los ajustes tactiles (aparte del perfil). */
const CLAVE_AJUSTES = 'fortniteClash.touch.v1';

/** Esquina (en pixeles) donde se esconde el truco del disparo automatico. */
const ESQUINA_SECRETA = 100;
/** Segundos que hay que aguantar el dedo ahi para encenderlo. */
const ESPERA_SECRETA = 2000;

/** Radio de recorrido del joystick, en pixeles de pantalla (va con el CSS). */
const RADIO_JOYSTICK = 58;
/** Hasta que parte de la pantalla (desde la izquierda) sale el joystick. */
const ZONA_JOYSTICK = 0.42;
/** Distancia minima y maxima de la mira al personaje (pixeles del lienzo). */
const MIRA_MIN = 70;
const MIRA_MAX = 560;
/** Lo rapido que la ayuda gira la mira hacia el enemigo (rad/s). */
const GIRO_AYUDA = 2.4;

/** Lo que pone el boton grande segun lo que llevas en la mano. */
const ETIQUETA_USAR = {
  weapon: 'DISPARAR', pickaxe: 'GOLPEAR', heal: 'CURAR', throwable: 'LANZAR', gadget: 'PONER',
};

/**
 * TODOS LOS BOTONES.
 *   tipo  mantener           aprieta una accion mientras el dedo esta encima
 *         toque              la pulsa una vez (lo que el juego lee con consume)
 *         raton              aprieta un boton del raton mientras esta el dedo
 *         interruptor        un toque la deja apretada, otro la suelta
 *         interruptor-raton  lo mismo, con un boton del raton
 *         especial           hace algo propio de este modulo
 *   donde racimo (derecha) | barra (arriba o lateral) | contexto (solo a veces)
 *   capa  combate | construir | siempre (dentro del racimo)
 */
const BOTONES = [
  // --- Racimo de la derecha ---
  { id: 'disparar', donde: 'racimo', capa: 'siempre', tipo: 'raton', accion: 'left', icono: '◎', texto: 'DISPARAR' },
  { id: 'saltar', donde: 'racimo', capa: 'siempre', tipo: 'mantener', accion: 'jump', icono: '⤒', texto: 'SALTAR' },
  { id: 'agachar', donde: 'racimo', capa: 'combate', tipo: 'mantener', accion: 'crouch', icono: '⤓', texto: 'AGACHAR' },
  { id: 'recoger', donde: 'racimo', capa: 'combate', tipo: 'mantener', accion: 'pickup', icono: '✋', texto: 'COGER' },
  { id: 'apuntar', donde: 'racimo', capa: 'combate', tipo: 'interruptor-raton', accion: 'right', icono: '⌖', texto: 'APUNTAR' },
  { id: 'correr', donde: 'racimo', capa: 'combate', tipo: 'interruptor', accion: 'sprint', icono: '»', texto: 'CORRER' },
  { id: 'construir', donde: 'racimo', capa: 'combate', tipo: 'toque', accion: 'buildMode', icono: '▦', texto: 'CONSTRUIR' },
  { id: 'pico', donde: 'racimo', capa: 'combate', tipo: 'toque', accion: 'slotPickaxe', icono: '⛏', texto: 'PICO' },
  { id: 'pared', donde: 'racimo', capa: 'construir', tipo: 'toque', accion: 'pieceWall', icono: '▮', texto: 'PARED' },
  { id: 'suelo', donde: 'racimo', capa: 'construir', tipo: 'toque', accion: 'pieceFloor', icono: '▬', texto: 'SUELO' },
  { id: 'rampa', donde: 'racimo', capa: 'construir', tipo: 'toque', accion: 'pieceRamp', icono: '◢', texto: 'RAMPA' },
  { id: 'combate', donde: 'racimo', capa: 'construir', tipo: 'toque', accion: 'buildMode', icono: '⚔', texto: 'COMBATE' },

  // --- Barra de utilidades ---
  { id: 'salir', donde: 'barra', tipo: 'especial', icono: '✕', texto: 'SALIR' },
  { id: 'mapa', donde: 'barra', tipo: 'toque', accion: 'map', icono: '🗺', texto: 'MAPA' },
  { id: 'bailes', donde: 'barra', tipo: 'toque', accion: 'emoteWheel', icono: '♪', texto: 'BAILES' },
  { id: 'granada', donde: 'barra', tipo: 'especial', icono: '💣', texto: 'GRANADA' },
  { id: 'soltar', donde: 'barra', tipo: 'toque', accion: 'drop', icono: '⇩', texto: 'SOLTAR' },
  // El AUTO solo aparece cuando ya se ha desbloqueado el truco secreto
  // (ver systems/autoFire.js). Hasta entonces, ni existe.
  { id: 'auto', donde: 'barra', solo: 'auto', tipo: 'especial', icono: '⚡', texto: 'AUTO' },
  { id: 'completa', donde: 'barra', tipo: 'especial', icono: '⛶', texto: 'PANTALLA' },

  // --- Solo cuando tocan ---
  { id: 'vehiculo', donde: 'contexto', solo: 'vehiculo', tipo: 'toque', accion: 'vehicle', icono: '🚗', texto: 'SUBIR' },
  { id: 'tienda', donde: 'contexto', solo: 'defensa', tipo: 'toque', accion: 'defenseShop', icono: '$', texto: 'TIENDA' },
  { id: 'mejorar', donde: 'contexto', solo: 'defensa', tipo: 'toque', accion: 'defenseUpgrade', icono: '▲', texto: 'MEJORAR' },
  { id: 'empezar', donde: 'contexto', solo: 'defensa', tipo: 'toque', accion: 'defenseReady', icono: '▶', texto: 'EMPEZAR' },
  { id: 'cancelar', donde: 'contexto', solo: 'colocando', tipo: 'especial', icono: '✕', texto: 'CANCELAR' },
];

/** Angulo llevado a -PI..PI. */
function normalizar(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function cargarAjustes() {
  const porDefecto = { auto: true, sensibilidad: 1 };
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_AJUSTES) || 'null');
    return { ...porDefecto, ...(guardado || {}) };
  } catch {
    return porDefecto;
  }
}

export class TouchControls {
  /**
   * @param {object} deps { game, dispositivo }
   */
  constructor({ game, dispositivo }) {
    this.game = game;
    this.dispositivo = dispositivo;
    this.ajustes = cargarAjustes();

    /** Cada dedo en pantalla y a que esta dedicado: pointerId -> estado. */
    this.punteros = new Map();
    /**
     * Quien tiene apretada cada accion. Hace falta porque varias cosas
     * pueden apretar la misma (el boton AGACHAR y bajar el joystick): la
     * accion solo se suelta cuando la suelta el ULTIMO.
     */
    this.fuentes = new Map();
    this.fuentesRaton = new Map();
    /** Botones de "dejar apretado" (correr, apuntar). */
    this.interruptores = { correr: false, apuntar: false };

    /** La mira, como distancia al personaje (pixeles del lienzo). */
    this.mira = { x: 220, y: -20 };
    /** Dedo que esta apuntando ahora mismo, o null. */
    this.apuntando = null;
    this.tiempoSinApuntar = 99;
    /** Joystick en uso: { id, x0, y0, nx, ny } o null. */
    this.joy = null;

    this.disposicion = 'tc-barra-lado';
    this._clasesPrevias = '';
    this._etiquetas = {};
    this._reloj = 0;
    this._activo = false;

    this._montar();
    this._colocar();

    window.addEventListener('resize', () => this._colocar());
    window.visualViewport?.addEventListener('resize', () => this._colocar());
    window.addEventListener('blur', () => this.soltarTodo());

    // El juego llama a esto cada frame, ANTES de leer teclado y raton.
    game.onFrame = (dt) => this.frame(dt);

    // El disparo automatico es comun a ordenador y movil (systems/autoFire.js).
    // Aqui solo se le presta la mano que aprieta (que sabe de varios dedos
    // a la vez) y la ayuda para apuntar, que solo tiene sentido con dedo.
    game.autoFire.onHold = (apretado) => this._fuenteRaton('left', 'auto', apretado);
    game.autoFire.asistir = (objetivo, dt) => {
      if (this.dispositivo.tactil && this.apuntando === null) this._acercarMira(objetivo, dt);
    };
  }

  /* =============================================================
     MONTAJE DEL HTML
     ============================================================= */

  _montar() {
    const raiz = document.createElement('div');
    raiz.id = 'touch-root';
    raiz.innerHTML = `
      <div class="tc-zona"></div>
      <div class="tc-joy-base reposo"><div class="tc-joy-mando"></div></div>
      <div class="tc-barra"></div>
      <div class="tc-contexto"></div>
      <div class="tc-racimo"></div>
      <div class="tc-ranuras"></div>
      <div class="tc-confirmar" hidden>
        <div class="tc-caja">
          <p>¿Salir de la partida?</p>
          <div class="tc-fila">
            <button type="button" data-conf="no">Seguir jugando</button>
            <button type="button" data-conf="si" class="tc-peligro">Salir</button>
          </div>
        </div>
      </div>
    `;

    this.raiz = raiz;
    this.joyBase = raiz.querySelector('.tc-joy-base');
    this.joyMando = raiz.querySelector('.tc-joy-mando');
    this.confirmar = raiz.querySelector('.tc-confirmar');

    // --- Botones ---
    this.defs = new Map();
    this.botones = {};
    const puedeCompleta = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);

    for (const def of BOTONES) {
      if (def.id === 'completa' && !puedeCompleta) continue;

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tc-boton';
      if (def.capa) b.classList.add(`tc-capa-${def.capa}`);
      if (def.solo) b.classList.add(`solo-${def.solo}`);
      b.dataset.id = def.id;
      b.innerHTML = `<span class="tc-icono">${def.icono}</span><span class="tc-texto">${def.texto}</span>`;

      raiz.querySelector(`.tc-${def.donde}`).appendChild(b);
      this.defs.set(def.id, def);
      this.botones[def.id] = b;
    }

    // --- Ranuras del inventario (invisibles, encima de las pintadas) ---
    this.ranuras = [];
    const cajaRanuras = raiz.querySelector('.tc-ranuras');
    for (let i = 0; i < SLOT_COUNT; i++) {
      const r = document.createElement('div');
      r.className = 'tc-ranura';
      r.dataset.ranura = String(i);
      cajaRanuras.appendChild(r);
      this.ranuras.push(r);
    }

    document.getElementById('game-container').appendChild(raiz);

    // --- Aviso de girar el movil (va fuera: tambien sale en el menu) ---
    const girar = document.createElement('div');
    girar.className = 'tc-girar';
    girar.innerHTML = `
      <div class="tc-girar-caja">
        <div class="tc-girar-icono">📱</div>
        <p>Gira el movil</p>
        <small>JULEN'S FORTNITE se juega mucho mejor en horizontal</small>
        <button type="button">Seguir en vertical</button>
      </div>
    `;
    girar.querySelector('button').addEventListener('click', () => {
      document.body.classList.add('tc-girar-ignorado');
    });
    document.body.appendChild(girar);

    // --- Eventos ---
    raiz.addEventListener('pointerdown', (e) => this._abajo(e));
    raiz.addEventListener('pointermove', (e) => this._mover(e));
    raiz.addEventListener('pointerup', (e) => this._arriba(e));
    raiz.addEventListener('pointercancel', (e) => this._arriba(e));
    raiz.addEventListener('lostpointercapture', (e) => this._arriba(e));
    // Sin esto el navegador haria scroll, zoom, la lupa de iOS o mandaria
    // clics de raton "de mentira" despues de cada toque.
    raiz.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    raiz.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    raiz.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * Coloca lo que depende del tamano del lienzo: las ranuras tocables
   * encima de las pintadas, la altura del racimo (justo por encima del
   * inventario) y donde va la barra.
   */
  _colocar() {
    const canvas = this.game.canvas;
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;

    this.rect = r;
    const k = r.width / canvas.width;

    const rects = inventorySlotRects({ width: canvas.width, height: canvas.height });
    rects.forEach((s, i) => {
      const el = this.ranuras[i];
      el.style.left = `${r.left + s.x * k}px`;
      el.style.top = `${r.top + s.y * k}px`;
      el.style.width = `${s.w * k}px`;
      el.style.height = `${s.h * k}px`;
    });

    const altoVentana = window.innerHeight;
    const topeInventario = r.top + rects[0].y * k;
    this.raiz.style.setProperty('--tc-sobre-inventario', `${Math.max(12, altoVentana - topeInventario + 10)}px`);

    // En un iPad sobra una franja negra arriba: ahi va la barra y no tapa
    // nada. En un movil alargado sobra por los lados: va en vertical.
    this.disposicion = r.top >= 54 ? 'tc-barra-arriba' : 'tc-barra-lado';
  }

  /* =============================================================
     DEDOS
     ============================================================= */

  _abajo(e) {
    e.preventDefault();
    // Fuera de partida no se pulsa nada: un toque en el menu no debe
    // llegar a la partida siguiente.
    if (this.game.state !== 'playing') return;

    const conf = e.target.closest('[data-conf]');
    if (conf) {
      this._responderSalir(conf.dataset.conf === 'si');
      return;
    }

    // Que el dedo siga siendo "de este boton" aunque se salga de el.
    try { e.target.setPointerCapture?.(e.pointerId); } catch { /* no pasa nada */ }

    const boton = e.target.closest('.tc-boton');
    if (boton) {
      this._pulsarBoton(boton, e);
      return;
    }

    const ranura = e.target.closest('.tc-ranura');
    if (ranura && !this._hayModal()) {
      this._tocarRanura(Number(ranura.dataset.ranura));
      this.punteros.set(e.pointerId, { tipo: 'nada' });
      return;
    }

    // --- Zona libre ---
    if (this._hayModal()) {
      // Tienda, rueda de bailes, final de partida: el toque es un clic ahi.
      this._ratonEn(e.clientX, e.clientY);
      this._fuenteRaton('left', `clic${e.pointerId}`, true);
      this.punteros.set(e.pointerId, { tipo: 'clic' });
      return;
    }

    // EL TRUCO: el dedo quieto 2 segundos en la esquina de arriba a la
    // izquierda enciende (o apaga) el disparo automatico. No hay boton en
    // ninguna parte: es un secreto (ver systems/autoFire.js).
    if (e.clientX < ESQUINA_SECRETA && e.clientY < ESQUINA_SECRETA) {
      this._secretoDesde = { x: e.clientX, y: e.clientY };
      this._secretoReloj = setTimeout(() => {
        this._secretoReloj = null;
        this.game.autoFire.avisar(this.game.autoFire.secreto());
      }, ESPERA_SECRETA);
    }

    if (e.clientX < window.innerWidth * ZONA_JOYSTICK && !this.joy) {
      this.joy = { id: e.pointerId, x0: e.clientX, y0: e.clientY, nx: 0, ny: 0 };
      this.punteros.set(e.pointerId, { tipo: 'joystick' });
      this._dibujarJoystick();
      return;
    }

    this.punteros.set(e.pointerId, { tipo: 'mira', x: e.clientX, y: e.clientY });
    this.apuntando = e.pointerId;
  }

  _mover(e) {
    // Si el dedo del truco se mueve, ya no cuenta.
    if (this._secretoReloj && this._secretoDesde) {
      const d = Math.hypot(e.clientX - this._secretoDesde.x, e.clientY - this._secretoDesde.y);
      if (d > 25) this._cancelarSecreto();
    }

    const est = this.punteros.get(e.pointerId);
    if (!est) return;

    if (est.tipo === 'joystick') {
      this._moverJoystick(e.clientX, e.clientY);
    } else if (est.tipo === 'clic') {
      this._ratonEn(e.clientX, e.clientY);
    } else if (est.tipo === 'mira' || (est.tipo === 'boton' && est.def.id === 'disparar')) {
      // Con el dedo en DISPARAR tambien se apunta: se dispara y se corrige
      // la mira a la vez, como en Fortnite Mobile.
      const dx = e.clientX - est.x;
      const dy = e.clientY - est.y;
      est.x = e.clientX;
      est.y = e.clientY;
      if (dx || dy) {
        this.apuntando = e.pointerId;
        this._moverMira(dx, dy);
      }
    }
  }

  _arriba(e) {
    this._cancelarSecreto();

    const est = this.punteros.get(e.pointerId);
    if (!est) return;
    this.punteros.delete(e.pointerId);
    if (this.apuntando === e.pointerId) this.apuntando = null;

    if (est.tipo === 'boton') {
      est.el.classList.remove('activo');
      const def = est.def;
      if (def.tipo === 'mantener') this._fuente(def.accion, `boton-${def.id}`, false);
      if (def.tipo === 'raton') this._fuenteRaton(def.accion, `boton-${def.id}`, false);
    } else if (est.tipo === 'clic') {
      this._fuenteRaton('left', `clic${e.pointerId}`, false);
    } else if (est.tipo === 'joystick') {
      this.joy = null;
      this._aplicarJoystick();
      this._dibujarJoystick();
    }
  }

  /* =============================================================
     BOTONES
     ============================================================= */

  _cancelarSecreto() {
    if (!this._secretoReloj) return;
    clearTimeout(this._secretoReloj);
    this._secretoReloj = null;
    this._secretoDesde = null;
  }

  _pulsarBoton(el, e) {
    const def = this.defs.get(el.dataset.id);
    if (!def) return;

    el.classList.add('activo');
    this.punteros.set(e.pointerId, { tipo: 'boton', el, def, x: e.clientX, y: e.clientY });

    const input = this.game.input;
    const mouse = this.game.mouse;

    switch (def.tipo) {
      case 'mantener':
        this._fuente(def.accion, `boton-${def.id}`, true);
        break;
      case 'toque':
        input.tapVirtual(def.accion);
        break;
      case 'raton':
        this._fuenteRaton(def.accion, `boton-${def.id}`, true);
        break;
      case 'interruptor': {
        const on = !this.interruptores[def.id];
        this.interruptores[def.id] = on;
        this._fuente(def.accion, `interruptor-${def.id}`, on);
        break;
      }
      case 'interruptor-raton': {
        const on = !this.interruptores[def.id];
        this.interruptores[def.id] = on;
        if (on) mouse.pressVirtual(def.accion);
        else mouse.releaseVirtual(def.accion);
        break;
      }
      case 'especial':
        this._especial(def.id);
        break;
    }
  }

  _especial(id) {
    const game = this.game;

    if (id === 'salir') {
      this.confirmar.hidden = false;
    } else if (id === 'granada') {
      this._siguienteGranada();
    } else if (id === 'auto') {
      game.autoFire.avisar(game.autoFire.toggle());
    } else if (id === 'completa') {
      this._pantallaCompleta();
    } else if (id === 'cancelar') {
      // Cancelar lo que se esta colocando es el clic derecho.
      game.mouse.clickVirtual('right');
    }
  }

  /** Ranura del inventario tocada: lo mismo que su tecla (F o 1..5). */
  _tocarRanura(i) {
    this.game.input.tapVirtual(i === PICKAXE_SLOT ? 'slotPickaxe' : `slot${i}`);
  }

  /** Salta a la siguiente ranura que tenga granadas. */
  _siguienteGranada() {
    const inv = this.game.inventory;
    if (!inv) return;
    for (let paso = 1; paso <= SLOT_COUNT; paso++) {
      const i = (inv.selected + paso) % SLOT_COUNT;
      if (inv.slots[i]?.kind === 'throwable') {
        this._tocarRanura(i);
        return;
      }
    }
    this.game.showMessage('No llevas granadas');
  }

  _responderSalir(salir) {
    this.confirmar.hidden = true;
    if (!salir || this.game.state !== 'playing') return;
    this.soltarTodo();
    // Salir es la tecla Escape: se va por el mismo camino (y cobra igual).
    this.game.input.tapVirtual('menu');
  }

  _pantallaCompleta() {
    const d = document;
    const el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) {
        (d.exitFullscreen || d.webkitExitFullscreen)?.call(d);
      } else {
        (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
      }
    } catch { /* hay navegadores que no lo dejan: se sigue igual */ }
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  }

  /* =============================================================
     APRETAR Y SOLTAR (con varias fuentes a la vez)
     ============================================================= */

  /** Una accion del teclado: la aprieta el primero y la suelta el ultimo. */
  _fuente(accion, quien, activa) {
    let set = this.fuentes.get(accion);
    if (!set) this.fuentes.set(accion, set = new Set());
    const antes = set.size > 0;
    if (activa) set.add(quien);
    else set.delete(quien);
    const ahora = set.size > 0;
    if (ahora && !antes) this.game.input.pressVirtual(accion);
    if (!ahora && antes) this.game.input.releaseVirtual(accion);
  }

  /** Lo mismo con un boton del raton ('left' o 'right'). */
  _fuenteRaton(boton, quien, activa) {
    let set = this.fuentesRaton.get(boton);
    if (!set) this.fuentesRaton.set(boton, set = new Set());
    const antes = set.size > 0;
    if (activa) set.add(quien);
    else set.delete(quien);
    const ahora = set.size > 0;
    if (ahora && !antes) this.game.mouse.pressVirtual(boton);
    if (!ahora && antes) this.game.mouse.releaseVirtual(boton);
  }

  /** Suelta TODO: al salir de la partida, al perder el foco, al cambiar de modo. */
  soltarTodo() {
    const game = this.game;
    for (const [accion, set] of this.fuentes) {
      if (set.size > 0) game.input.releaseVirtual(accion);
      set.clear();
    }
    for (const [boton, set] of this.fuentesRaton) {
      if (set.size > 0) game.mouse.releaseVirtual(boton);
      set.clear();
    }
    if (this.interruptores.apuntar) game.mouse.releaseVirtual('right');
    this.interruptores.correr = false;
    this.interruptores.apuntar = false;

    for (const b of Object.values(this.botones)) b.classList.remove('activo');
    this.punteros.clear();
    this.apuntando = null;
    this.joy = null;
    this._dibujarJoystick();
  }

  /** Lo llama main.js al pasar de dedo a raton o al reves. */
  alCambiarModo() {
    this.soltarTodo();
    this._colocar();
  }

  /* =============================================================
     JOYSTICK
     ============================================================= */

  _moverJoystick(x, y) {
    const j = this.joy;
    let dx = x - j.x0;
    let dy = y - j.y0;
    const d = Math.hypot(dx, dy);

    // Si el dedo se va mas alla del borde, la base le sigue: asi el
    // joystick nunca se queda "sin recorrido" al cambiar de direccion.
    if (d > RADIO_JOYSTICK) {
      const k = (d - RADIO_JOYSTICK) / d;
      j.x0 += dx * k;
      j.y0 += dy * k;
      dx = x - j.x0;
      dy = y - j.y0;
    }

    j.nx = dx / RADIO_JOYSTICK;
    j.ny = dy / RADIO_JOYSTICK;
    this._aplicarJoystick();
    this._dibujarJoystick();
  }

  /** El joystick, traducido a las teclas de moverse (A/D, Shift y S). */
  _aplicarJoystick() {
    const nx = this.joy ? this.joy.nx : 0;
    const ny = this.joy ? this.joy.ny : 0;

    this._fuente('left', 'joystick', nx < -0.28);
    this._fuente('right', 'joystick', nx > 0.28);
    // Empujar hasta el borde = correr, como en Fortnite Mobile.
    this._fuente('sprint', 'joystick', Math.abs(nx) > 0.92);
    // Bien hacia abajo = agacharse (y, con saltar, bajar por una plataforma).
    this._fuente('crouch', 'joystick', ny > 0.75 && Math.abs(nx) < 0.6);
  }

  _dibujarJoystick() {
    const base = this.joyBase;
    if (!this.joy) {
      base.classList.add('reposo');
      base.style.left = '';
      base.style.top = '';
      this.joyMando.style.transform = '';
      return;
    }
    base.classList.remove('reposo');
    base.style.left = `${this.joy.x0}px`;
    base.style.top = `${this.joy.y0}px`;
    this.joyMando.style.transform = `translate(${this.joy.nx * RADIO_JOYSTICK}px, ${this.joy.ny * RADIO_JOYSTICK}px)`;
  }

  /* =============================================================
     MIRA
     ============================================================= */

  /** Pixeles del lienzo que hay en un pixel de pantalla. */
  _escala() {
    return this.rect ? this.game.canvas.width / this.rect.width : 1;
  }

  /** Pone el raton justo debajo del dedo (para los toques-clic). */
  _ratonEn(clientX, clientY) {
    const r = this.game.canvas.getBoundingClientRect();
    if (!r.width) return;
    const k = this.game.canvas.width / r.width;
    this.game.mouse.setVirtualPosition((clientX - r.left) * k, (clientY - r.top) * k);
  }

  _moverMira(dx, dy) {
    const s = this.ajustes.sensibilidad * this._escala() * 1.15;
    this.mira.x += dx * s;
    this.mira.y += dy * s;

    const largo = Math.hypot(this.mira.x, this.mira.y);
    if (largo > MIRA_MAX) {
      this.mira.x *= MIRA_MAX / largo;
      this.mira.y *= MIRA_MAX / largo;
    } else if (largo < MIRA_MIN && largo > 0.01) {
      this.mira.x *= MIRA_MIN / largo;
      this.mira.y *= MIRA_MIN / largo;
    }
    this.tiempoSinApuntar = 0;
  }

  /** La mira va pegada al personaje: se recoloca cada frame. */
  _actualizarMira(dt) {
    const g = this.game;
    const p = g.player;
    const cam = g.camera;
    this.tiempoSinApuntar += dt;

    // Si llevas un rato sin tocar la mira y echas a andar hacia el otro
    // lado, la mira se da la vuelta contigo: disparas hacia donde vas.
    const eje = g.input.axisX;
    if (eje !== 0 && Math.sign(this.mira.x) !== eje && this.apuntando === null && this.tiempoSinApuntar > 0.6) {
      this.mira.x = -this.mira.x;
    }

    const hx = Number.isFinite(p.handX) ? p.handX : p.x + p.w / 2;
    const hy = Number.isFinite(p.handY) ? p.handY : p.y + p.h / 2;
    g.mouse.setVirtualPosition((hx - cam.x) * cam.zoom + this.mira.x, (hy - cam.y) * cam.zoom + this.mira.y);
  }

  /* =============================================================
     AYUDA PARA APUNTAR
     -------------------------------------------------------------
     El disparo automatico esta en systems/autoFire.js, que sirve
     igual para ordenador. Lo unico que es de aqui es acercar la
     mira, que solo tiene sentido apuntando con el dedo.
     ============================================================= */

  /** Gira la mira un poco hacia el objetivo, sin cambiar su distancia. */
  _acercarMira(objetivo, dt) {
    const ang = Math.atan2(this.mira.y, this.mira.x);
    const largo = Math.hypot(this.mira.x, this.mira.y) || 200;
    const d = normalizar(objetivo.ang - ang);
    const paso = Math.sign(d) * Math.min(Math.abs(d), GIRO_AYUDA * dt);
    this.mira.x = Math.cos(ang + paso) * largo;
    this.mira.y = Math.sin(ang + paso) * largo;
  }

  /* =============================================================
     CADA FRAME
     ============================================================= */

  frame(dt) {
    const g = this.game;

    // En ordenador, nada de nada.
    if (!this.dispositivo.tactil) {
      if (this._activo) this.soltarTodo();
      this._activo = false;
      return;
    }

    if (g.state !== 'playing') {
      if (this._activo) this.soltarTodo();
      this._activo = false;
      this.confirmar.hidden = true;
      return;
    }
    this._activo = true;

    this._reloj += dt;
    if (this._reloj > 0.5) {
      this._reloj = 0;
      this._colocar();
    }

    const modal = this._hayModal();
    const hayClic = [...this.punteros.values()].some((p) => p.tipo === 'clic');
    if (!modal && !hayClic) this._actualizarMira(dt);

    this._pintarEstado(modal);
  }

  /**
   * ¿Hay una pantalla que se maneja pulsando encima? Entonces tocar es
   * hacer clic, y los botones de combate se esconden.
   */
  _hayModal() {
    const g = this.game;
    if (g.state !== 'playing') return true;
    if (g.emotes?.wheelOpen) return true;

    const mg = g.minigame;
    if (mg) return mg.state === 'fin' || !!mg.tienda?.abierta || !!mg.colocando;
    return !!g.match && g.match.result !== 'jugando';
  }

  /** Clases del contenedor (el CSS decide que se ve) y textos que cambian. */
  _pintarEstado(modal) {
    const g = this.game;
    const p = g.player;
    const mg = g.minigame;

    const c = ['tc-jugando', this.disposicion];
    if (modal) c.push('tc-modal');
    if (g.emotes?.wheelOpen) c.push('tc-bailando');
    if (p.buildMode) c.push('tc-construyendo');
    if (p.flight) c.push('tc-volando');
    if (g.build?.enabled === false) c.push('tc-sin-construir');
    if (mg?.id === 'defensa' && mg.state !== 'fin') c.push('tc-defensa');
    if (mg?.colocando) c.push('tc-colocando');
    if (!modal && (g.vehicles?.nearest || p.driving)) c.push('tc-vehiculo');
    if (g.autoFire.desbloqueado) c.push('tc-auto-listo');
    if (g.autoFire.enabled) c.push('tc-auto');
    if (this.interruptores.correr) c.push('tc-correr');
    if (this.interruptores.apuntar) c.push('tc-apuntar');

    const clases = c.join(' ');
    if (clases !== this._clasesPrevias) {
      this.raiz.className = clases;
      this._clasesPrevias = clases;
    }

    const usar = p.buildMode ? 'COLOCAR' : (ETIQUETA_USAR[g.inventory?.equipped?.kind] || 'DISPARAR');
    this._etiqueta('disparar', usar);
    this._etiqueta('vehiculo', p.driving ? 'BAJAR' : 'SUBIR');
  }

  _etiqueta(id, texto) {
    if (this._etiquetas[id] === texto || !this.botones[id]) return;
    this._etiquetas[id] = texto;
    this.botones[id].querySelector('.tc-texto').textContent = texto;
  }

  _guardarAjustes() {
    try { localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(this.ajustes)); } catch { /* sin guardado */ }
  }
}
