/**
 * parkour.js
 * ---------------------------------------------------------------
 * MINIJUEGO: CARRERA DE OBSTACULOS.
 *
 * Un recorrido de plataformas desde una SALIDA hasta una META, con
 * cronometro. Gana el mejor tiempo.
 *
 * Hay TRES NIVELES (data/parkourLevels.js), cada uno con su recorrido y
 * su record aparte:
 *
 *   facil    solo plataformas
 *   normal   plataformas pequenas, pinchos y trampolines
 *   dificil  ademas, laseres y llamaradas
 *
 * Los recorridos estan escritos a mano, no generados al azar: si
 * cambiasen en cada intento, el record no significaria nada. Y los
 * saltos estan medidos para pasarse ANDANDO (230 px/s), no corriendo:
 * la barra de rapidez se agota a mitad de circuito, asi que correr es
 * una ventaja de TIEMPO, no un requisito para llegar.
 *
 * Caerse o tocar un obstaculo te devuelve A LA SALIDA, y el cronometro
 * no se para: ese es el castigo.
 *
 * Aqui no se pica madera ni se construye: con madera se podia levantar
 * un atajo hasta la meta, y eso es hacer trampas.
 *
 * Reutiliza el movimiento y el salto de siempre: aqui solo se levantan
 * plataformas y se mira cuando se pisa la meta.
 */

import { Minigame } from './base.js';
import { roundRectPath } from '../../core/utils.js';
import { parkourLevel, buildTramos } from '../../data/parkourLevels.js';
import { Laser, Fire, Spikes, Trampoline } from './hazards.js';

/** Lo que se ve la pantalla de resultado antes de montar otro circuito. */
const REINICIO = 6;

/** Alto de las plataformas del recorrido. */
const GROSOR = 22;



export class Parkour extends Minigame {
  /**
   * @param {import('../../core/game.js').Game} game
   * @param {string} nivelId  'facil' | 'normal' | 'dificil'
   */
  constructor(game, nivelId = 'facil') {
    super(game, 'parkour');

    /** Nivel elegido: cada uno tiene su dificultad y su record aparte. */
    this.nivel = parkourLevel(nivelId);
    /**
     * El recorrido se genera AQUI, y por eso cada carrera es distinta:
     * al acabar una y darle a reintentar sale otra nueva. Los rangos del
     * nivel garantizan que siempre se pueda pasar.
     */
    this._tramos = buildTramos(this.nivel.id);
    /**
     * El record se guarda por nivel ('parkour:dificil'): un tiempo del
     * facil no tiene nada que ver con uno del dificil.
     */
    this.id = `parkour:${this.nivel.id}`;

    // Arena limpia del todo: aqui estorba cualquier cosa del mundo.
    //
    // Y sobre todo, NADA DE MADERA: `build: false` apaga de golpe el
    // pico contra los arboles y la construccion entera, para el jugador
    // y para todos. Antes solo se ponia `player.wood = 0` cada frame,
    // que dejaba talar arboles igualmente (se veian caer) y dependia de
    // acordarse de ponerlo a cero en todos los sitios. Construir un
    // atajo hasta la meta es hacer trampas: aqui se corre y se salta.
    this.systems = {
      worldLoot: false, chests: false, buildings: false, targets: false, fish: false,
      vehicles: false, mobility: false, build: false,
    };

    this.timeLimit = null;          // sin limite: se corre hasta llegar

    /** Plataformas que este modo mete en el mundo (para quitarlas luego). */
    this.plataformas = [];
    /** Rectangulo de la meta. */
    this.meta = null;
    /** Rectangulo de la salida. */
    this.salida = null;
    /** El crono no arranca hasta que te mueves. */
    this.corriendo = false;
    /** Segundos que faltan para montar otro circuito (null = no toca). */
    this.reinicio = null;
    /** Donde arranca la carrera: si te caes, vuelves ahi. */
    this.salidaPunto = null;
    /** Cuantas veces has vuelto a la salida (caida u obstaculo). */
    this.caidas = 0;
    /** Laseres, fuego y pinchos. */
    this.peligros = [];
    /** Trampolines (no queman: empujan). */
    this.saltadores = [];
    /** Destello rojo al quemarte. */
    this.quemado = 0;
    /**
     * Instantes de gracia al volver a la salida. Sin esto, si el
     * obstaculo sigue activo al reaparecer te vuelve a dar en el acto y
     * se encadenan miles de caidas seguidas.
     */
    this.gracia = 0;
  }

  /** Los tramos del recorrido de esta carrera. */
  get tramos() { return this._tramos; }

  setup() {
    // --- Donde se monta ---
    // En el CIELO, no sobre el terreno: el circuito mide mas de 5000 px,
    // muchisimo mas que cualquier tramo llano, y montado abajo sus
    // plataformas se cruzaban con escalones e islas del mundo y el
    // recorrido se volvia intransitable. Arriba no hay nada.
    const medidas = this._medidas();
    const sitio = this.skyBand(medidas.ancho, medidas.alto) ||
                  { x: 400, y: 200 };   // por si acaso: el cielo siempre esta libre

    let x = sitio.x;
    let y = sitio.y + medidas.subeTotal;   // se empieza abajo y se sube

    this.plataformas.length = 0;

    for (let i = 0; i < this.tramos.length; i++) {
      const t = this.tramos[i];
      x += (i === 0 ? 0 : t.dx);
      y += t.dy;

      const p = {
        x, y, w: t.w, h: GROSOR,
        oneWay: !!t.thin, ground: false, parkour: true, indice: i,
      };
      this.world.addPlatform(p);
      this.plataformas.push(p);

      this._montarObstaculos(t, p);

      x += t.w;   // el siguiente tramo empieza al final de este
    }

    const primera = this.plataformas[0];
    const ultima = this.plataformas[this.plataformas.length - 1];

    this.salida = { x: primera.x, y: primera.y - 90, w: primera.w, h: 90 };
    this.meta = { x: ultima.x + ultima.w - 130, y: ultima.y - 110, w: 130, h: 110 };

    // Punto de salida: es TAMBIEN donde vuelves cada vez que te caes.
    this.salidaPunto = { x: this._puntoSeguro(primera), y: primera.y };
    this.placePlayer(this.salidaPunto.x, this.salidaPunto.y);

    // Umbral de caida: por debajo de la plataforma MAS BAJA del circuito.
    // No vale usar la salida: un recorrido generado puede bajar por
    // debajo de ella, y entonces estando tranquilamente de pie en una
    // plataforma el juego creia que te habias caido.
    this.suelo = Math.max(...this.plataformas.map((p) => p.y));

    // --- Nada de pico ni de construccion ---
    // Con madera se podia construir un atajo hasta la meta, y eso es
    // hacer trampas: aqui se corre y se salta, y punto.
    this.player.wood = 0;
    this.player.buildMode = false;
    this.game.inventory.select(0);

    this.game.showMessage('¡Corre hasta la meta! El crono arranca al moverte', 'legendary');
  }

  step(dt) {
    const p = this.player;
    this.quemado = Math.max(0, this.quemado - dt);

    // Sin madera no se construye, y el modo construccion se apaga solo.
    p.wood = 0;
    if (p.buildMode) p.buildMode = false;

    // --- Obstaculos ---
    const caja = { x: p.x, y: p.y, w: p.w, h: p.h };

    this.gracia = Math.max(0, this.gracia - dt);

    for (const h of this.peligros) {
      h.update(dt);
      if (this.gracia > 0 || !h.hits(caja)) continue;

      // Tocar un laser, el fuego o los pinchos cuesta lo mismo que
      // caerse: vuelta al ultimo sitio pisado, con el crono corriendo.
      this._caer('¡Te ha dado! Vuelta a la salida');
      break;
    }

    for (const t of this.saltadores) {
      t.update(dt);
      if (t.bounce(p)) this.particles.puff(p.x + p.w / 2, p.y + p.h, 'rgba(180,92,240,0.55)', 6);
    }


    // --- El crono no corre hasta que te mueves ---
    if (!this.corriendo) {
      if (Math.abs(p.vx) > 8 || !p.onGround) this.corriendo = true;
      else this.time = 0;
    }

    // --- Te has caido: VUELTA A LA SALIDA ---
    // Sin checkpoints: caerse manda al principio y el crono no se para.
    // Es lo que hace que el tiempo signifique algo.
    // Se mira la BASE del personaje, no su cabeza, y con poco margen: el
    // circuito esta en el cielo y el terreno del mundo queda justo
    // debajo, asi que al caerte aterrizas en el suelo de la isla. Con un
    // umbral alto no llegabas a cruzarlo nunca y la caida no contaba.
    if (p.y + p.h > this.suelo + 100) this._caer('¡Te has caido! Vuelta a la salida');

    // --- ¿Meta? ---
    if (this._toca(this.meta)) {
      const t = this.time;
      this.finish(Math.round(t * 10) / 10, this.caidas === 0
        ? '¡Sin caerte ni una vez!'
        : `Con ${this.caidas} caida${this.caidas === 1 ? '' : 's'}`);

      // Y arranca la cuenta atras para montar OTRO circuito distinto.
      this.reinicio = REINICIO;
    }
  }

  /**
   * Cuenta atras del final: se ve el tiempo y el record unos segundos y
   * despues la carrera se monta OTRA VEZ, con un recorrido nuevo.
   *
   * Va en `endStep` y no en `step` porque al terminar un minijuego el
   * juego lo CONGELA y deja de llamar a `step`. `endStep` es el unico
   * hilo que sigue vivo en la pantalla de resultado.
   */
  endStep(dt) {
    if (this.reinicio === null) return;

    this.reinicio -= dt;
    if (this.reinicio > 0) return;

    this.reinicio = null;
    // Volver a lanzar el modo lo monta entero de cero: como el
    // recorrido se genera al azar en `setup()`, sale uno distinto.
    this.game.startMinigame(this.def.id, this.game.loadout);
  }

  /** Cuelga de una plataforma los obstaculos que pida su tramo. */
  _montarObstaculos(t, p) {
    // --- Pinchos: en la franja CENTRAL de la plataforma ---
    // Ni al principio ni al final: hace falta dejar libre la zona donde
    // aterrizas (llegas del salto anterior) y la del borde de salida
    // (desde donde despegas). Si los pinchos pisan el aterrizaje, caes
    // sobre ellos sin poder hacer nada.
    if (t.picos != null) {
      const desde = p.x + p.w * t.picos;
      const hasta = p.x + p.w * 0.82;
      if (hasta - desde > 20) this.peligros.push(new Spikes(desde, p.y, hasta - desde));
    }

    // --- Fuego: sale del centro de la plataforma ---
    if (t.fuego) {
      this.peligros.push(new Fire(p.x + p.w / 2, p.y, t.fuego));
    }

    // --- Laser: al FINAL de la plataforma, no en mitad del hueco ---
    // En el hueco no habia donde pararse a esperar: o cruzabas a ciegas
    // o caias. Aqui aterrizas tranquilo, te acercas y cruzas cuando se
    // apaga.
    if (t.laser) {
      this.peligros.push(new Laser(p.x + p.w - 30, p.y - 210, 214, t.laser));
    }

    // --- Trampolin: ocupa la plataforma entera ---
    if (t.salta) {
      this.saltadores.push(new Trampoline(p.x + 6, p.y, p.w - 12));
    }
  }

  /** Cuanto ocupa el circuito y cuanto sube en total. */
  _medidas() {
    let ancho = 0;
    let alto = 0;
    let sube = 0;

    for (let i = 0; i < this.tramos.length; i++) {
      const t = this.tramos[i];
      ancho += (i === 0 ? 0 : t.dx) + t.w;
      alto += t.dy;
      if (alto < sube) sube = alto;   // el punto mas alto del recorrido
    }
    return { ancho, alto: Math.abs(sube) + 120, subeTotal: Math.abs(sube) };
  }

  /**
   * Un sitio de la plataforma donde reaparecer sin que te toque nada.
   * Se prueba de izquierda a derecha y se coge el primero libre.
   */
  _puntoSeguro(pl) {
    const p = this.player;
    const paso = 12;

    for (let x = pl.x + 10; x < pl.x + pl.w - 10 - p.w; x += paso) {
      const caja = { x, y: pl.y - p.h, w: p.w, h: p.h };
      // Se mira el alcance MAXIMO del obstaculo, no el de este instante:
      // un fuego apagado mide cero y el sitio pareceria libre.
      const libre = !this.peligros.some((h) => this._solapa(caja, h.dangerRect()));
      if (libre) return x + p.w / 2;
    }
    // Si toda la plataforma estuviera ocupada (no deberia), el borde izquierdo.
    return pl.x + 10 + p.w / 2;
  }

  _solapa(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /** Vuelta a la SALIDA, sea por caida o por obstaculo. */
  _caer(aviso) {
    this.caidas++;
    this.quemado = 0.5;
    this.gracia = 0.8;
    this.placePlayer(this.salidaPunto.x, this.salidaPunto.y);
    this.particles.puff(this.salidaPunto.x, this.salidaPunto.y - 30, 'rgba(255,255,255,0.5)', 8);
    this.game.showMessage(aviso, true);
  }

  _toca(r) {
    const p = this.player;
    return p.x < r.x + r.w && p.x + p.w > r.x && p.y < r.y + r.h && p.y + p.h > r.y;
  }

  /** Al salir hay que devolver el mundo como estaba. */
  teardown() {
    for (const p of this.plataformas) this.world.removePlatform(p);
    this.plataformas.length = 0;
    this.peligros.length = 0;
    this.saltadores.length = 0;
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    // --- Las plataformas del recorrido ---
    for (const p of this.plataformas) {
      if (!camera.isVisible(p.x - 10, p.y - 10, p.w + 20, p.h + 20)) continue;

      // Las finas se pintan distintas, para que se vea que se atraviesan
      ctx.fillStyle = p.oneWay ? '#7ad8ff' : '#5fd14a';
      ctx.fillRect(p.x, p.y, p.w, p.oneWay ? 8 : p.h);

      ctx.fillStyle = p.oneWay ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)';
      ctx.fillRect(p.x, p.y, p.w, 3);

      if (!p.oneWay) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(p.x, p.y + p.h - 5, p.w, 5);
      }
    }

    // --- Obstaculos ---
    for (const t of this.saltadores) {
      if (camera.isVisible(t.x - 20, t.y - 60, t.ancho + 40, 100)) t.draw(ctx, time);
    }
    for (const h of this.peligros) {
      const r = h.rect ? h.rect() : { x: h.x - 40, y: h.y - 60, w: 80, h: 120 };
      if (camera.isVisible(r.x - 30, Math.min(r.y, h.y) - 120, r.w + 60, Math.abs(r.h) + 240)) {
        h.draw(ctx, time);
      }
    }

    // --- Salida ---
    this._cartel(ctx, this.salida, 'SALIDA', '#5fd14a', time);

    // --- Meta: bandera a cuadros ---
    const m = this.meta;
    ctx.fillStyle = '#c8d0dc';
    ctx.fillRect(m.x + m.w / 2 - 3, m.y, 6, m.h);

    const cuadro = 12;
    for (let fx = 0; fx < 4; fx++) {
      for (let fy = 0; fy < 3; fy++) {
        ctx.fillStyle = (fx + fy) % 2 === 0 ? '#ffffff' : '#20263a';
        ctx.fillRect(m.x + m.w / 2 + 3 + fx * cuadro, m.y + 6 + fy * cuadro, cuadro, cuadro);
      }
    }
    this._cartel(ctx, { ...m, y: m.y - 34 }, 'META', '#ffd23f', time);
  }

  _cartel(ctx, r, texto, color, time) {
    const x = r.x + r.w / 2;
    const y = r.y - 6 + Math.sin(time * 2.5) * 3;

    ctx.save();
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    const ancho = ctx.measureText(texto).width + 26;

    ctx.fillStyle = 'rgba(10, 16, 34, 0.86)';
    roundRectPath(ctx, x - ancho / 2, y - 24, ancho, 26, 8);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillText(texto, x, y - 6);
    ctx.restore();
  }

  drawHud(ctx, view, time) {
    ctx.save();
    ctx.textAlign = 'center';

    // Destello rojo al tocar un obstaculo
    if (this.quemado > 0) {
      ctx.fillStyle = `rgba(224, 85, 77, ${this.quemado * 0.5})`;
      ctx.fillRect(0, 0, view.width, view.height);
    }

    const ancho = 230;
    const x = view.width / 2 - ancho / 2;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.86)';
    roundRectPath(ctx, x, 90, ancho, 62, 12);
    ctx.fill();
    ctx.strokeStyle = this.corriendo ? '#5fd14a' : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.fillStyle = this.corriendo ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.fillText(this.time.toFixed(1), view.width / 2 - 48, 130);

    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(this.corriendo ? 'SEGUNDOS' : 'MUEVETE', view.width / 2 - 48, 146);

    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.fillStyle = this.caidas > 0 ? '#ff8a7a' : '#5fd14a';
    ctx.fillText(String(this.caidas), view.width / 2 + 58, 130);

    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('CAIDAS', view.width / 2 + 58, 146);

    // Nivel que se esta jugando
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = this.nivel.color;
    ctx.fillText(this.nivel.name.toUpperCase(), view.width / 2, 168);

    ctx.restore();
  }
}
