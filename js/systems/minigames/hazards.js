/**
 * hazards.js
 * ---------------------------------------------------------------
 * OBSTACULOS de la carrera: laseres, fuego, pinchos y trampolines.
 *
 * Todos comparten el mismo contrato para que el circuito pueda mezclarlos
 * sin saber de cual se trata:
 *
 *   update(dt)          mueve su animacion
 *   hits(rect)          ¿esta tocando al jugador AHORA? (los que queman)
 *   bounce(player)      efecto al pisarlo (solo el trampolin)
 *   draw(ctx, time)     se pinta
 *
 * Los que hacen dano no matan: te devuelven al ultimo sitio pisado, igual
 * que caerse. El castigo son los segundos que pierdes.
 */

/** Base con lo comun. */
class Hazard {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.fase = 0;
    /** Los que solo empujan (trampolin) no queman. */
    this.quema = true;
  }

  update(dt) { this.fase += dt; }
  hits() { return false; }
  draw() {}

  /**
   * Sitio que este obstaculo llega a ocupar EN ALGUN MOMENTO.
   * No vale mirar `rect()` para decidir donde es seguro reaparecer: un
   * fuego apagado mide cero y un laser apagado tampoco ocupa nada, asi
   * que el sitio pareceria libre y te achicharraria un segundo despues.
   */
  dangerRect() { return this.rect(); }

  /** ¿Se solapan dos rectangulos? */
  _tocaRect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
}

/* =============================================================
   LASER
   Un haz que se enciende y se apaga con un ciclo fijo. Hay que
   cronometrar el paso, no correr a lo loco.
   ============================================================= */
export class Laser extends Hazard {
  /**
   * @param {number} x
   * @param {number} y     donde arranca el haz
   * @param {number} alto  largo del haz (hacia abajo)
   * @param {object} opts  { ciclo, encendido, desfase }
   */
  constructor(x, y, alto, opts = {}) {
    super(x, y);
    this.alto = alto;
    this.ciclo = opts.ciclo ?? 2.4;        // lo que dura una vuelta entera
    this.encendido = opts.encendido ?? 1.2; // cuanto esta activo
    this.fase = opts.desfase ?? 0;
    this.ancho = 8;
  }

  /** ¿Esta el haz activo en este momento? */
  get activo() {
    return (this.fase % this.ciclo) < this.encendido;
  }

  /** Los ultimos 0,35 s antes de encenderse parpadea avisando. */
  get avisando() {
    const t = this.fase % this.ciclo;
    return !this.activo && t > this.ciclo - 0.35;
  }

  rect() {
    return { x: this.x - this.ancho / 2, y: this.y, w: this.ancho, h: this.alto };
  }

  hits(r) {
    return this.activo && this._tocaRect(r, this.rect());
  }

  /** El haz ocupa siempre lo mismo: encendido o no, ahi no se para uno. */
  dangerRect() { return this.rect(); }

  draw(ctx, time) {
    const r = this.rect();

    // Emisores arriba y abajo: se ven siempre, para saber donde estan
    ctx.fillStyle = '#5b6874';
    ctx.fillRect(this.x - 11, this.y - 10, 22, 12);
    ctx.fillRect(this.x - 11, this.y + this.alto - 2, 22, 12);
    ctx.fillStyle = this.activo ? '#ff5a4d' : (this.avisando ? '#ffd23f' : '#3b4356');
    ctx.fillRect(this.x - 7, this.y - 6, 14, 5);
    ctx.fillRect(this.x - 7, this.y + this.alto + 1, 14, 5);

    if (this.activo) {
      // Halo + nucleo
      ctx.fillStyle = 'rgba(255, 90, 77, 0.28)';
      ctx.fillRect(r.x - 6, r.y, r.w + 12, r.h);
      ctx.fillStyle = '#ff5a4d';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(r.x + 2.5, r.y, r.w - 5, r.h);
    } else if (this.avisando) {
      // Linea de aviso, punteada
      ctx.strokeStyle = 'rgba(255, 210, 63, 0.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x, this.y + this.alto);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

/* =============================================================
   FUEGO
   Una llamarada que sale de la plataforma cada pocos segundos.
   ============================================================= */
export class Fire extends Hazard {
  constructor(x, y, opts = {}) {
    super(x, y);
    this.ancho = opts.ancho ?? 46;
    this.altoMax = opts.alto ?? 86;
    this.ciclo = opts.ciclo ?? 2.8;
    this.encendido = opts.encendido ?? 1.1;
    this.fase = opts.desfase ?? 0;
  }

  /** 0 apagado, 1 llamarada entera (sube y baja suave). */
  get fuerza() {
    const t = this.fase % this.ciclo;
    if (t >= this.encendido) return 0;
    return Math.sin((t / this.encendido) * Math.PI);
  }

  rect() {
    const alto = this.altoMax * this.fuerza;
    return { x: this.x - this.ancho / 2, y: this.y - alto, w: this.ancho, h: alto };
  }

  hits(r) {
    if (this.fuerza < 0.25) return false;   // una llama bajita no quema
    return this._tocaRect(r, this.rect());
  }

  /** La llamarada a pleno: es lo que hay que esquivar al reaparecer. */
  dangerRect() {
    return {
      x: this.x - this.ancho / 2, y: this.y - this.altoMax,
      w: this.ancho, h: this.altoMax,
    };
  }

  draw(ctx, time) {
    // Boquilla
    ctx.fillStyle = '#5b6874';
    ctx.fillRect(this.x - this.ancho / 2, this.y - 8, this.ancho, 10);
    ctx.fillStyle = '#3b4356';
    ctx.fillRect(this.x - this.ancho / 2 + 4, this.y - 5, this.ancho - 8, 4);

    const f = this.fuerza;
    if (f <= 0.02) return;

    const alto = this.altoMax * f;
    const capas = [
      { c: 'rgba(255, 90, 60, 0.55)', k: 1.0, w: 1.0 },
      { c: 'rgba(255, 160, 50, 0.8)', k: 0.72, w: 0.72 },
      { c: 'rgba(255, 235, 140, 0.9)', k: 0.42, w: 0.42 },
    ];

    for (const capa of capas) {
      const w = this.ancho * capa.w;
      const h = alto * capa.k;
      ctx.fillStyle = capa.c;
      ctx.beginPath();
      ctx.moveTo(this.x - w / 2, this.y);
      // Un par de lenguas que ondean
      ctx.quadraticCurveTo(
        this.x - w / 2 + Math.sin(time * 9 + this.x) * 5, this.y - h * 0.6,
        this.x, this.y - h
      );
      ctx.quadraticCurveTo(
        this.x + w / 2 + Math.sin(time * 11 + this.x) * 5, this.y - h * 0.6,
        this.x + w / 2, this.y
      );
      ctx.closePath();
      ctx.fill();
    }
  }
}

/* =============================================================
   PINCHOS
   Fijos y siempre activos: hay que saltarlos o rodearlos.
   ============================================================= */
export class Spikes extends Hazard {
  constructor(x, y, ancho = 60) {
    super(x, y);
    this.ancho = ancho;
    this.alto = 18;
  }

  rect() {
    return { x: this.x, y: this.y - this.alto, w: this.ancho, h: this.alto };
  }

  hits(r) {
    return this._tocaRect(r, this.rect());
  }

  draw(ctx, time) {
    const r = this.rect();

    // Base
    ctx.fillStyle = '#3b4356';
    ctx.fillRect(r.x, r.y + r.h - 5, r.w, 5);

    // Dientes
    const paso = 14;
    for (let x = r.x; x < r.x + r.w - 2; x += paso) {
      ctx.fillStyle = '#c2cedc';
      ctx.beginPath();
      ctx.moveTo(x, r.y + r.h);
      ctx.lineTo(x + paso / 2, r.y);
      ctx.lineTo(x + paso, r.y + r.h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(x + paso / 2, r.y);
      ctx.lineTo(x + paso * 0.62, r.y + r.h * 0.55);
      ctx.lineTo(x + paso * 0.38, r.y + r.h * 0.55);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/* =============================================================
   TRAMPOLIN
   No hace dano: te lanza hacia arriba. Sirve para subir de golpe
   tramos que no se alcanzan de un salto normal.
   ============================================================= */
export class Trampoline extends Hazard {
  constructor(x, y, ancho = 80, fuerza = 1320) {
    super(x, y);
    this.ancho = ancho;
    this.fuerza = fuerza;
    this.quema = false;
    /** Animacion de aplastado al usarlo. */
    this.squash = 0;
  }

  rect() {
    return { x: this.x, y: this.y - 14, w: this.ancho, h: 16 };
  }

  update(dt) {
    super.update(dt);
    this.squash = Math.max(0, this.squash - dt * 3);
  }

  /**
   * ¿Lo esta pisando? Solo cuenta si viene CAYENDO: si no, al andar por
   * encima te relanzaria sin parar.
   */
  bounce(player) {
    if (player.vy < 0) return false;
    const r = this.rect();
    const caja = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (!this._tocaRect(caja, r)) return false;

    player.vy = -this.fuerza;
    player.onGround = false;
    this.squash = 1;
    return true;
  }

  draw(ctx, time) {
    const r = this.rect();
    const hundido = this.squash * 7;

    // Patas
    ctx.fillStyle = '#3b4356';
    ctx.fillRect(r.x + 4, r.y + 6, 8, 16);
    ctx.fillRect(r.x + r.w - 12, r.y + 6, 8, 16);

    // Lona
    ctx.fillStyle = '#b45cf0';
    ctx.beginPath();
    ctx.moveTo(r.x, r.y + 4);
    ctx.quadraticCurveTo(r.x + r.w / 2, r.y + 4 + hundido * 2, r.x + r.w, r.y + 4);
    ctx.lineTo(r.x + r.w, r.y + 12);
    ctx.quadraticCurveTo(r.x + r.w / 2, r.y + 12 + hundido * 2, r.x, r.y + 12);
    ctx.closePath();
    ctx.fill();

    // Brillo y flechas de "arriba"
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(r.x + 6, r.y + 5, r.w - 12, 2);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 2; i++) {
      const fy = r.y - 10 - i * 12 - Math.sin(time * 4 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(r.x + r.w / 2, fy);
      ctx.lineTo(r.x + r.w / 2 + 7, fy + 8);
      ctx.lineTo(r.x + r.w / 2 - 7, fy + 8);
      ctx.closePath();
      ctx.fill();
    }
  }
}
