/**
 * ambience.js
 * ---------------------------------------------------------------
 * CICLO DIA / NOCHE y CLIMA.
 *
 * Cada partida empieza a una hora distinta, sacada al azar, y el tiempo
 * AVANZA mientras juegas: puedes aterrizar de madrugada y terminar con
 * el sol saliendo. Eso es lo que lo hace un ciclo y no cuatro fondos
 * distintos.
 *
 * Como funciona la hora:
 *
 *     0.00  medianoche        0.50  mediodia
 *     0.25  amanecer          0.75  atardecer
 *
 * De ese numero salen dos cosas, las dos interpoladas (nada cambia de
 * golpe): CUANTO oscurece y DE QUE COLOR. Asi el atardecer se vuelve
 * naranja poco a poco y la noche entra azulando la pantalla.
 *
 * LO IMPORTANTE DE LA NOCHE: tiene que verse. Una noche "realista" en
 * un juego de disparos es injugable, asi que el oscurecido va en DOS
 * capas separadas (ver OSCURIDAD_FONDO y OSCURIDAD_MUNDO): el cielo se
 * va a negro de verdad, pero el suelo y la gente se oscurecen mucho
 * menos. Es lo que permite que parezca de noche y se siga jugando.
 *
 * El modulo no sabe nada del juego: solo pinta. Quien decide cuando
 * llamarlo es game.js.
 */

/* =============================================================
   AJUSTES
   ============================================================= */

/**
 * Lo que tarda un dia entero, en segundos.
 *
 * Una partida dura entre dos y tres minutos y medio, asi que con 900 s
 * de dia completo se recorre alrededor de un cuarto del ciclo: se nota
 * que la luz cambia sin que parezca una pelicula acelerada.
 */
const DIA_COMPLETO = 900;

/**
 * LO OSCURA QUE SE PONE LA NOCHE. Son dos numeros distintos a
 * proposito, y en esa diferencia esta todo el truco:
 *
 *   FONDO  el cielo, las colinas y las nubes se van a negro de verdad.
 *          Ahi no hay nada que mirar, asi que oscurecerlo mucho es lo
 *          que hace que parezca de noche.
 *   MUNDO  el terreno, los enemigos, el botin y los cofres se oscurecen
 *          MUCHO MENOS. Es donde se juega: si no se ve, no hay partida.
 *
 * Con un solo velo para todo hay que elegir entre una noche creible y
 * una noche jugable. Con dos, se tienen las dos cosas.
 */
const OSCURIDAD_FONDO = 0.62;
const OSCURIDAD_MUNDO = 0.34;

/** Colores del velo segun el momento. */
const COLOR_NOCHE = { r: 16, g: 26, b: 62 };
const COLOR_ALBA = { r: 255, g: 150, b: 90 };
const COLOR_OCASO = { r: 255, g: 110, b: 105 };

/** Los climas posibles y lo que pesa cada uno en el sorteo. */
const CLIMAS = [
  { id: 'despejado', nombre: 'Despejado', peso: 46, velo: null, alpha: 0, lluvia: 0 },
  { id: 'nublado', nombre: 'Nublado', peso: 24, velo: { r: 150, g: 160, b: 180 }, alpha: 0.12, lluvia: 0 },
  { id: 'lluvia', nombre: 'Lluvia', peso: 20, velo: { r: 120, g: 140, b: 170 }, alpha: 0.2, lluvia: 150 },
  { id: 'niebla', nombre: 'Niebla', peso: 10, velo: { r: 205, g: 212, b: 225 }, alpha: 0.16, lluvia: 0 },
  // Peso 0: no sale en el sorteo. Solo la pide JULEN DEFENSA de noche.
  { id: 'tormenta', nombre: 'Tormenta', peso: 0, velo: { r: 90, g: 100, b: 130 }, alpha: 0.18, lluvia: 260 },
];

/**
 * A QUE HORA EMPIEZA LA PARTIDA.
 *
 * Antes era un azar plano entre 0 y 1, y como el dia ocupa casi media
 * vuelta, 1 de cada 5 partidas era de dia de principio a fin: se veia
 * exactamente igual que antes de existir el ciclo, y parecia que no
 * hubiera nada. Ahora se sortea un TRAMO con pesos y luego una hora
 * dentro de el, para que casi siempre pase algo que se note.
 *
 *   desde/hasta  tramo de la hora (0 medianoche, 0,5 mediodia)
 */
const SALIDAS = [
  { id: 'noche', desde: 0.88, hasta: 1.10, peso: 30 },   // cruza medianoche
  { id: 'amanecer', desde: 0.12, hasta: 0.26, peso: 22 },
  { id: 'atardecer', desde: 0.62, hasta: 0.80, peso: 30 },
  { id: 'dia', desde: 0.34, hasta: 0.56, peso: 18 },
];

/** Cuantas estrellas tiene el cielo de noche. */
const ESTRELLAS = 70;

export class Ambience {
  constructor() {
    /** Hora del dia, de 0 a 1. */
    this.hora = 0.5;
    /** Clima de esta partida. */
    this.clima = CLIMAS[0];
    /** Si esta encendido (en el menu y los minijuegos, no). */
    this.enabled = false;

    /** Estrellas fijas, colocadas una vez. */
    this.estrellas = [];
    /** Gotas de lluvia, recicladas sin parar. */
    this.gotas = [];

    /** RAYOS: solo con tormenta y cuando alguien los pide. */
    this.rayos = false;
    /** Fogonazo de luz del ultimo rayo, de 1 a 0. */
    this.flash = 0;
    /** El rayo que se esta viendo ahora: { x, vida, semilla }. */
    this.rayo = null;
    this._proxRayo = 2;
    /** Aviso al caer un rayo (para el sonido del trueno). */
    this.onRayo = null;
  }

  /* =============================================================
     ARRANQUE
     ============================================================= */

  /**
   * Sortea la hora y el clima de una partida.
   * @param {function} rng
   * @param {object} [opciones] { enabled }
   */
  reset(rng = Math.random, opciones = {}) {
    this.enabled = opciones.enabled !== false;
    const tramo = pesado(SALIDAS, rng);
    this.hora = (tramo.desde + rng() * (tramo.hasta - tramo.desde)) % 1;
    this.clima = pesado(CLIMAS, rng);

    // Estrellas repartidas por la mitad de arriba de la pantalla.
    this.estrellas = [];
    for (let i = 0; i < ESTRELLAS; i++) {
      this.estrellas.push({
        x: rng(),
        y: rng() * 0.55,
        r: 0.7 + rng() * 1.5,
        // Cada una parpadea a su ritmo, si no se ve el patron.
        fase: rng() * Math.PI * 2,
        vel: 0.6 + rng() * 1.8,
      });
    }

    this._crearGotas(rng);
    this.rayos = false;
    this.flash = 0;
    this.rayo = null;
  }

  /** Gotas para el clima en curso (ninguna si no llueve). */
  _crearGotas(rng = Math.random) {
    this.gotas = [];
    for (let i = 0; i < this.clima.lluvia; i++) {
      this.gotas.push({ x: rng(), y: rng(), v: 0.55 + rng() * 0.5, l: 9 + rng() * 12 });
    }
  }

  /**
   * CONTROL MANUAL del cielo, para los modos que mandan ellos.
   *
   * JULEN DEFENSA lo usa para que sea de DIA mientras te preparas y de
   * NOCHE con tormenta y rayos durante cada oleada. Lo que no se pasa
   * se queda como estaba.
   * @param {object} o { hora, clima, rayos }
   */
  forzar({ hora = null, clima = null, rayos = null } = {}) {
    this.enabled = true;
    if (hora !== null) this.hora = ((hora % 1) + 1) % 1;
    if (clima) {
      const c = CLIMAS.find((x) => x.id === clima);
      if (c && c !== this.clima) {
        this.clima = c;
        this._crearGotas();
      }
    }
    if (rayos !== null) this.rayos = rayos;
  }

  /** Nombre del momento, para el aviso del principio de partida. */
  get momento() {
    const h = this.hora;
    if (h < 0.18) return 'Noche cerrada';
    if (h < 0.28) return 'Amanecer';
    if (h < 0.42) return 'Manana';
    if (h < 0.60) return 'Mediodia';
    if (h < 0.72) return 'Tarde';
    if (h < 0.82) return 'Atardecer';
    if (h < 0.90) return 'Anochecer';
    return 'Noche';
  }

  /** Un resumen de una linea: "Atardecer · Lluvia". */
  get descripcion() {
    return this.clima.id === 'despejado'
      ? this.momento
      : `${this.momento} · ${this.clima.nombre}`;
  }

  /* =============================================================
     EL RELOJ
     ============================================================= */

  update(dt) {
    if (!this.enabled) return;
    this.hora = (this.hora + dt / DIA_COMPLETO) % 1;
    this._actualizarRayos(dt);
  }

  /** Cada pocos segundos, un rayo: fogonazo, trazo y trueno. */
  _actualizarRayos(dt) {
    this.flash = Math.max(0, this.flash - dt * 2.8);
    if (this.rayo) {
      this.rayo.vida -= dt;
      if (this.rayo.vida <= 0) this.rayo = null;
    }
    if (!this.rayos) return;

    this._proxRayo -= dt;
    if (this._proxRayo > 0) return;
    this._proxRayo = 2.5 + Math.random() * 5;
    this.flash = 1;
    this.rayo = { x: 0.1 + Math.random() * 0.8, vida: 0.28, semilla: Math.random() };
    this.onRayo?.();
  }

  /**
   * CUANTO oscurece ahora mismo, de 0 (pleno dia) a 1 (noche cerrada).
   *
   * La curva no es un seno pelado: el dia dura mas que la noche y los
   * cambios se concentran en el amanecer y el atardecer, que es cuando
   * de verdad se nota. Asi no estas media partida en penumbra.
   */
  get oscuridad() {
    const h = this.hora;
    if (h >= 0.30 && h <= 0.70) return 0;              // de dia, nada
    if (h > 0.70 && h < 0.88) return suave((h - 0.70) / 0.18);   // cae la tarde
    if (h > 0.12 && h < 0.30) return 1 - suave((h - 0.12) / 0.18); // amanece
    return 1;                                          // noche cerrada
  }

  /** El color del velo, mezclando noche con el naranja del horizonte. */
  _colorVelo() {
    const h = this.hora;
    // Cuanto de "horizonte naranja" tiene este momento: maximo justo al
    // amanecer y al atardecer, cero en plena noche y en pleno dia.
    let calidez = 0;
    let calido = COLOR_OCASO;

    if (h > 0.68 && h < 0.86) { calidez = campana((h - 0.68) / 0.18); calido = COLOR_OCASO; }
    else if (h > 0.14 && h < 0.32) { calidez = campana((h - 0.14) / 0.18); calido = COLOR_ALBA; }

    return {
      r: Math.round(COLOR_NOCHE.r + (calido.r - COLOR_NOCHE.r) * calidez),
      g: Math.round(COLOR_NOCHE.g + (calido.g - COLOR_NOCHE.g) * calidez),
      b: Math.round(COLOR_NOCHE.b + (calido.b - COLOR_NOCHE.b) * calidez),
    };
  }

  /* =============================================================
     DIBUJO 1: EL CIELO
     Va justo despues del fondo, antes del terreno: asi la luna y
     las estrellas quedan detras de todo lo demas.
     ============================================================= */

  drawCielo(ctx, view, time) {
    if (!this.enabled) return;
    const osc = this.oscuridad;
    if (osc <= 0.02) return;

    ctx.save();

    // --- Se apaga el fondo ---
    // Aqui solo hay pintado cielo, colinas y nubes: el mundo viene
    // despues. Por eso se puede oscurecer a gusto sin tapar nada
    // importante.
    const c = this._colorVelo();
    ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${OSCURIDAD_FONDO * osc})`;
    ctx.fillRect(0, 0, view.width, view.height);

    // --- Estrellas ---
    // Solo con la noche entrada, y nunca con el cielo tapado.
    // Con cualquier clima que no sea despejado, el cielo esta tapado.
    const tapado = this.clima.id !== 'despejado';
    if (osc > 0.45 && !tapado) {
      const fuerza = (osc - 0.45) / 0.55;
      for (const e of this.estrellas) {
        const brillo = 0.45 + 0.55 * Math.abs(Math.sin(time * e.vel + e.fase));
        ctx.fillStyle = `rgba(255, 255, 235, ${brillo * fuerza * 0.9})`;
        ctx.beginPath();
        ctx.arc(e.x * view.width, e.y * view.height, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- La luna ---
    // Sale por el mismo sitio por el que se pone el sol, al otro lado.
    if (osc > 0.3) {
      const fuerza = (osc - 0.3) / 0.7;
      const lx = view.width * 0.18;
      const ly = view.height * 0.14;

      const halo = ctx.createRadialGradient(lx, ly, 6, lx, ly, 130);
      halo.addColorStop(0, `rgba(220, 232, 255, ${0.5 * fuerza})`);
      halo.addColorStop(1, 'rgba(220, 232, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(lx, ly, 130, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(238, 243, 255, ${0.92 * fuerza})`;
      ctx.beginPath();
      ctx.arc(lx, ly, 32, 0, Math.PI * 2);
      ctx.fill();

      // Un par de crateres, que si no parece una pelota de pingpong.
      ctx.fillStyle = `rgba(200, 210, 235, ${0.55 * fuerza})`;
      ctx.beginPath();
      ctx.arc(lx - 10, ly - 7, 7, 0, Math.PI * 2);
      ctx.arc(lx + 11, ly + 6, 5, 0, Math.PI * 2);
      ctx.arc(lx + 2, ly + 15, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /* =============================================================
     DIBUJO 2: EL VELO
     Va al final, sobre el mundo ya pintado pero DEBAJO del HUD: la
     noche oscurece la isla y a la gente, nunca los numeros de la
     vida ni el minimapa.
     ============================================================= */

  drawVelo(ctx, view) {
    if (!this.enabled) return;

    const osc = this.oscuridad;

    // --- La noche, sobre el mundo ---
    // Flojito y parejo: lo justo para que la isla no parezca iluminada
    // a mediodia, sin que deje de verse quien viene por el lado.
    if (osc > 0.02) {
      const c = this._colorVelo();
      ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${OSCURIDAD_MUNDO * osc})`;
      ctx.fillRect(0, 0, view.width, view.height);
    }

    // --- El clima ---
    if (this.clima.velo && this.clima.alpha > 0) {
      const v = this.clima.velo;
      // De noche el clima pinta menos: ya esta todo oscuro y sumar
      // gris encima solo quitaria visibilidad a cambio de nada.
      const a = this.clima.alpha * (1 - osc * 0.55);
      ctx.fillStyle = `rgba(${v.r}, ${v.g}, ${v.b}, ${a})`;
      ctx.fillRect(0, 0, view.width, view.height);
    }

    // --- Rayos ---
    if (this.rayo) this._dibujarRayo(ctx, view);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(220, 230, 255, ${this.flash * 0.32})`;
      ctx.fillRect(0, 0, view.width, view.height);
    }
  }

  /** Un rayo en zigzag, siempre igual mientras dura (va con semilla). */
  _dibujarRayo(ctx, view) {
    const r = this.rayo;
    let x = r.x * view.width;
    let y = 0;
    let s = Math.floor(r.semilla * 233280);
    const azar = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    ctx.save();
    ctx.strokeStyle = `rgba(235, 240, 255, ${Math.min(1, r.vida * 4)})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#bcd4ff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (y < view.height * 0.62) {
      y += 22 + azar() * 30;
      x += (azar() - 0.5) * 70;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* =============================================================
     DIBUJO 3: LA LLUVIA
     ============================================================= */

  drawLluvia(ctx, view, dt) {
    if (!this.enabled || this.gotas.length === 0) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(190, 215, 255, 0.34)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();

    for (const g of this.gotas) {
      // Caen en pantalla, no en el mundo: mucho mas barato y desde
      // dentro no se distingue.
      g.y += g.v * dt;
      if (g.y > 1) { g.y -= 1; g.x = Math.random(); }

      const x = g.x * view.width;
      const y = g.y * view.height;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + g.l);     // un poco inclinadas, por el viento
    }

    ctx.stroke();
    ctx.restore();
  }
}

/* =============================================================
   AYUDAS
   ============================================================= */

/** Suaviza un 0..1 para que no haya saltos en los extremos. */
function suave(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Campana 0 -> 1 -> 0 sobre un 0..1. */
function campana(t) {
  const x = Math.max(0, Math.min(1, t));
  return Math.sin(x * Math.PI);
}

/** Sorteo con pesos. */
function pesado(lista, rng) {
  const total = lista.reduce((s, o) => s + o.peso, 0);
  let n = rng() * total;
  for (const o of lista) {
    n -= o.peso;
    if (n <= 0) return o;
  }
  return lista[0];
}
