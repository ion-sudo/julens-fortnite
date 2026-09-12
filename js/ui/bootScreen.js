/**
 * bootScreen.js
 * ---------------------------------------------------------------
 * LA PORTADA DE CARGA: lo primero que se ve al abrir el juego, al
 * estilo de la pantalla de "conectando" del Fortnite de verdad.
 *
 * En medio, el LOGO grande del juego. Alrededor, cuatro personajes con
 * skins de las buenas saliendo de un vortice de colores. Abajo a la
 * izquierda, CARGANDO... con su barra.
 *
 * Se dibuja en un canvas propio, por encima de todo, y desaparece con
 * un fundido cuando el juego ya esta montado. Todo lo que pinta sale
 * del propio juego (las mismas skins, las mismas paravelas), asi que
 * la portada no es un dibujo aparte que haya que mantener: es el juego.
 */

import { drawPlayer } from '../entities/playerSprite.js';
import { SKINS, GLIDERS, findCosmetic } from '../data/cosmetics.js';

/** Skins que salen en la portada, de izquierda a derecha. */
const REPARTO = ['julen', 'dragon', 'cosmica', 'robot'];

/** Lo que dura como minimo, aunque el juego cargue antes. */
const MINIMO = 2.2;
/** Lo que tarda en desvanecerse al terminar. */
const FUNDIDO = 0.55;
/** Lo que tarda la barra en llegar al final una vez el juego esta listo. */
const LLENADO = 0.7;

export class BootScreen {
  /**
   * @param {HTMLCanvasElement} canvas  lienzo propio, encima del juego
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = canvas.width;
    this.h = canvas.height;

    this.time = 0;
    /** Segundos REALES desde que se abrio (ver `start`). */
    this.vivo = 0;
    /** 0..1, lo que lleva cargado. */
    this.progress = 0;
    /** true cuando el juego ya esta listo y solo falta el fundido. */
    this.ready = false;
    this.fade = 0;
    this.done = false;
    this._listoEn = 0;
    this._progresoAlListo = 0;
    this._fundeDesde = 0;

    /** Frases que se van turnando debajo de la barra. */
    this.frases = [
      'Preparando la isla...',
      'Inflando el globo del bus...',
      'Repartiendo cofres...',
      'Afilando los picos...',
      'Avisando a los 74 bots...',
    ];

    // Maniqui compartido: los cuatro personajes se pintan con el mismo
    // objeto cambiandole la posicion, para no crear basura por frame.
    this._maniqui = maniquiBase();

    this._timer = 0;
    this._guardia = 0;
    this._tick = this._tick.bind(this);
    this._last = 0;
  }

  /**
   * Arranca el bucle propio de la portada.
   *
   * Va con `setInterval` y NO con `requestAnimationFrame` a proposito:
   * rAF se para en cuanto el navegador decide que la pagina no se esta
   * viendo (pestana de fondo, ventana tapada, arranque a medias), y si
   * eso pasa justo aqui la portada se queda congelada TAPANDO EL JUEGO
   * para siempre. Son tres segundos de animacion sencilla; un intervalo
   * fijo la mueve igual de bien y no puede quedarse colgado.
   */
  start() {
    this._last = performance.now();
    /**
     * Cuando arranco, en reloj de verdad.
     *
     * Los tiempos de la portada (lo que dura como minimo, cuando
     * empieza el fundido) se miden CONTRA ESTE RELOJ y no sumando los
     * dt de cada frame: si el navegador decide dar menos frames de la
     * cuenta, la suma de dt se queda muy por detras del tiempo real y
     * la portada tarda una eternidad en irse.
     */
    this._nacio = this._last;
    this._timer = setInterval(this._tick, 16);

    // Y por si acaso, una red debajo: pase lo que pase, a los 8 segundos
    // la portada se quita. Nunca puede dejar el juego inaccesible.
    this._guardia = setTimeout(() => this._quitar(), 8000);
  }

  /** Se lleva la portada y para todo. */
  _quitar() {
    this.done = true;
    clearInterval(this._timer);
    clearTimeout(this._guardia);
    this.canvas.remove();
  }

  /** El juego ya esta montado: se llena la barra y se va. */
  finish() {
    if (this.ready) return;
    this.ready = true;
    // Desde donde y desde cuando termina de llenarse la barra.
    this._listoEn = performance.now();
    this._progresoAlListo = this.progress;
  }

  _tick() {
    if (this.done) return;

    const ahora = performance.now();
    const dt = Math.min(0.05, (ahora - this._last) / 1000);
    this._last = ahora;

    // `time` mueve la animacion (rayos, brillo, flotar) y por eso suma
    // dt; `vivo` es el tiempo REAL desde que arranco, y es el que
    // decide cuando se va.
    this.time += dt;
    this.vivo = (ahora - this._nacio) / 1000;

    // La barra sube sola hasta el 90% y solo llega al 100 cuando el
    // juego avisa: asi nunca se queda parada al final esperando.
    // TODO lo que decide cuando se va la portada va por RELOJ REAL, no
    // por frames. Con un lerp por dt, en un navegador que da pocos
    // frames la barra tardaba veinte segundos en llegar al final y la
    // portada se quedaba tapando el juego.
    if (this.ready) {
      const desde = (ahora - this._listoEn) / 1000;
      this.progress = Math.min(1, this._progresoAlListo + desde / LLENADO);
    } else {
      this.progress = Math.min(0.9, this.vivo / MINIMO);
    }

    if (this.ready && this.vivo > MINIMO && this.progress >= 1) {
      if (!this._fundeDesde) this._fundeDesde = ahora;
      this.fade = (ahora - this._fundeDesde) / 1000 / FUNDIDO;
    }

    this.draw();

    if (this.fade >= 1) this._quitar();
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw() {
    const ctx = this.ctx;
    const { w, h } = this;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);

    this._fondo(ctx, w, h);
    this._vortice(ctx, w, h);
    this._personajes(ctx, w, h);
    this._logo(ctx, w, h);
    this._carga(ctx, w, h);

    // Fundido de salida, por encima de todo.
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(8, 12, 26, ${Math.min(1, this.fade)})`;
      ctx.fillRect(0, 0, w, h);
    }
    this.canvas.style.opacity = String(Math.max(0, 1 - this.fade));
  }

  /** Cielo morado con un resplandor en el centro. */
  _fondo(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1b1040');
    g.addColorStop(0.55, '#2d1568');
    g.addColorStop(1, '#120a2c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const halo = ctx.createRadialGradient(w / 2, h * 0.46, 40, w / 2, h * 0.46, w * 0.5);
    halo.addColorStop(0, 'rgba(150, 90, 255, 0.55)');
    halo.addColorStop(0.5, 'rgba(90, 60, 200, 0.22)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * El VORTICE: rayos girando desde el centro, mas un par de anillos.
   * Es lo que da la sensacion de portal y hace que el logo destaque.
   */
  _vortice(ctx, w, h) {
    const cx = w / 2;
    const cy = h * 0.46;

    ctx.save();
    ctx.translate(cx, cy);

    // Rayos
    const RAYOS = 26;
    for (let i = 0; i < RAYOS; i++) {
      const a = (i / RAYOS) * Math.PI * 2 + this.time * 0.22;
      const largo = w * 0.62;
      const ancho = 0.028 + 0.018 * Math.sin(i * 2.3 + this.time * 1.4);

      const g = ctx.createLinearGradient(0, 0, Math.cos(a) * largo, Math.sin(a) * largo);
      g.addColorStop(0, i % 3 === 0 ? 'rgba(255, 140, 240, 0.30)' : 'rgba(120, 190, 255, 0.24)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, largo, a - ancho, a + ancho);
      ctx.closePath();
      ctx.fill();
    }

    // Anillos girando en sentidos contrarios
    for (const [r, vel, col] of [[150, 0.5, 'rgba(180, 130, 255, 0.5)'],
                                 [210, -0.35, 'rgba(120, 210, 255, 0.4)'],
                                 [270, 0.22, 'rgba(255, 160, 230, 0.28)']]) {
      ctx.save();
      ctx.rotate(this.time * vel);
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.setLineDash([26, 20]);
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);

    // Chispas flotando
    for (let i = 0; i < 30; i++) {
      const a = i * 2.399 + this.time * 0.4;
      const r = 90 + ((i * 53) % 260) + Math.sin(this.time + i) * 12;
      ctx.fillStyle = i % 2 ? 'rgba(255, 220, 255, 0.8)' : 'rgba(180, 230, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 0.62, 1.6 + (i % 3) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /** Los cuatro personajes, saliendo del vortice. */
  _personajes(ctx, w, h) {
    // Los dos de dentro van MAS ABAJO y MAS ABIERTOS que los de fuera:
    // llevan paravela, que se dibuja por encima de la cabeza, y puestos
    // a la misma altura le tapaban media palabra al logo.
    const sitios = [
      { x: 0.14, y: 0.42, s: 3.1, flip: false },
      { x: 0.30, y: 0.86, s: 2.2, flip: false },
      { x: 0.71, y: 0.86, s: 2.2, flip: true },
      { x: 0.87, y: 0.40, s: 3.1, flip: true },
    ];

    sitios.forEach((p, i) => {
      const skin = SKINS.find((s) => s.id === REPARTO[i]) || SKINS[0];
      // Flotan un poco, cada uno a su ritmo.
      const bob = Math.sin(this.time * 1.5 + i * 1.7) * 7;

      ctx.save();
      ctx.translate(w * p.x, h * p.y + bob);
      ctx.scale(p.flip ? -p.s : p.s, p.s);

      const m = this._maniqui;
      m.x = -17;
      m.y = -52;
      m.facing = 1;
      m.animState = i % 2 === 0 ? 'pose' : 'glide';
      m.flight = i % 2 === 0 ? null : 'planeando';

      drawPlayer(ctx, m, this.time + i, skin, {
        item: null,
        recoil: 0,
        glider: i % 2 === 0 ? null : (findCosmetic('glider', 'alas-fuego') || GLIDERS[GLIDERS.length - 1]),
      });
      ctx.restore();
    });
  }

  /** El logo, en medio y bien grande. */
  _logo(ctx, w, h) {
    const cx = w / 2;
    const cy = h * 0.45;
    const pulso = 1 + 0.012 * Math.sin(this.time * 2);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulso, pulso);
    ctx.textAlign = 'center';

    // --- JULEN'S, arriba y pequeno ---
    ctx.font = 'bold 40px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(10, 6, 24, 0.85)';
    ctx.strokeText("JULEN'S", 0, -58);
    ctx.fillStyle = '#ffffff';
    ctx.fillText("JULEN'S", 0, -58);

    // --- FORTNITE, enorme y con degradado ---
    ctx.font = 'bold 116px "Trebuchet MS", sans-serif';
    const g = ctx.createLinearGradient(0, -46, 0, 34);
    g.addColorStop(0, '#fff6c8');
    g.addColorStop(0.45, '#ffd23f');
    g.addColorStop(1, '#f0932b');

    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(10, 6, 24, 0.9)';
    ctx.strokeText('FORTNITE', 0, 30);
    ctx.fillStyle = g;
    ctx.fillText('FORTNITE', 0, 30);

    // Brillo que recorre las letras
    ctx.save();
    ctx.beginPath();
    ctx.rect(-360, -60, 720, 100);
    ctx.clip();
    const bx = ((this.time * 260) % 1000) - 340;
    const brillo = ctx.createLinearGradient(bx - 70, 0, bx + 70, 0);
    brillo.addColorStop(0, 'rgba(255,255,255,0)');
    brillo.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    brillo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = brillo;
    ctx.font = 'bold 116px "Trebuchet MS", sans-serif';
    ctx.fillText('FORTNITE', 0, 30);
    ctx.restore();

    // --- Subtitulo ---
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(220, 210, 255, 0.85)';
    ctx.fillText('BATTLE ROYALE 2D  ·  75 JUGADORES  ·  10 SITIOS', 0, 62);

    ctx.restore();
  }

  /** CARGANDO... con su barra, abajo a la izquierda. */
  _carga(ctx, w, h) {
    const x = 58;
    const y = h - 78;

    ctx.save();
    ctx.textAlign = 'left';

    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(10, 6, 24, 0.8)';
    // Los puntos suspensivos van apareciendo, para que se vea vivo.
    const puntos = '.'.repeat(1 + Math.floor(this.time * 2) % 3);
    ctx.strokeText(`CARGANDO${puntos}`, x, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`CARGANDO${puntos}`, x, y);

    // Barra
    const bw = 320;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    redondo(ctx, x, y + 14, bw, 10, 5);
    ctx.fill();

    const g = ctx.createLinearGradient(x, 0, x + bw, 0);
    g.addColorStop(0, '#ffd23f');
    g.addColorStop(1, '#ff8a3d');
    ctx.fillStyle = g;
    redondo(ctx, x, y + 14, Math.max(6, bw * this.progress), 10, 5);
    ctx.fill();

    // Frase, que va cambiando
    const frase = this.frases[Math.floor(this.time / 1.1) % this.frases.length];
    ctx.font = '13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(220, 210, 255, 0.7)';
    ctx.fillText(frase, x, y + 42);

    // Aviso de la esquina, como en el de verdad
    ctx.textAlign = 'right';
    ctx.font = '12px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(210, 200, 240, 0.55)';
    ctx.fillText('Hecho con HTML, CSS y JavaScript · sin librerias', w - 40, h - 34);

    ctx.restore();
  }
}

/** Un personaje "de escaparate" con lo justo para poder dibujarlo. */
function maniquiBase() {
  return {
    x: 0, y: 0, w: 34, h: 52,
    vx: 0, vy: 0, facing: 1,
    onGround: true, crouching: false, running: false,
    alive: true, health: 100, maxHealth: 100, shield: 0, maxShield: 100,
    aimAngle: 0, aiming: false, flight: null, swimming: false, downed: false,
    action: null, actionTimer: 0, squash: 0, animState: 'pose',
    hurtFlash: 0, buildMode: false, driving: null, riding: null, water: null,
    boosts: { damage: 1, speed: 1, fireRate: 1, lifesteal: 0 },
  };
}

/** Rectangulo redondeado. */
function redondo(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
