/**
 * safeZone.js
 * ---------------------------------------------------------------
 * ZONA SEGURA que se va cerrando (version minima de la tormenta).
 *
 * Sin ella el battle royale no puede terminar: los ultimos
 * supervivientes se quedan dando vueltas por los extremos de la isla y
 * nunca se encuentran, asi que "ser el ultimo en pie" era inalcanzable
 * la mitad de las partidas. Con la zona, el area util se reduce con el
 * tiempo y quien se queda fuera pierde vida poco a poco.
 *
 * Como el mapa es 2D de lado, la zona es un TRAMO horizontal [minX, maxX]
 * que se estrecha hacia el centro.
 *
 * Cada MODO puede traer la suya (ver data/modes.js): el Julen Blitz la
 * arranca ya ceñida a su tramo de mapa, la cierra en la mitad de tiempo
 * y pega cuatro veces mas fuerte.
 *
 * Cuando se implemente la tormenta completa (aviso previo, fases con
 * cuenta atras, efecto morado), bastara con ampliar este modulo.
 */

import { CONFIG } from '../core/config.js';

export class SafeZone {
  constructor(world) {
    this.world = world;
    this.reset();
  }

  /**
   * Deja la zona lista para una partida.
   *
   * @param {object} opciones
   *   bounds  { x0, x1 } tramo jugable. Sirve para los modos de MAPA
   *           REDUCIDO (Julen Blitz): la tormenta arranca ya ceñida a
   *           ese tramo en vez de al mapa entero.
   *   storm   ajustes que pisan a CONFIG.safeZone (lo que hace que la
   *           tormenta del Blitz sea mucho mas agresiva que la normal).
   */
  reset(opciones = {}) {
    this.time = 0;

    this.bounds = opciones.bounds || null;
    this.x0 = this.bounds ? this.bounds.x0 : 0;
    this.x1 = this.bounds ? this.bounds.x1 : this.world.width;

    // Las reglas del modo pisan a las de CONFIG, campo a campo.
    this.cfg = { ...CONFIG.safeZone, ...(opciones.storm || {}) };

    this.minX = this.x0;
    this.maxX = this.x1;

    // Donde acaba cerrandose. Se calcula una vez por partida.
    this.centro = this._centroEnTierra();
  }

  /**
   * CENTRO DEL CIERRE: el sitio donde va a acabar la partida.
   *
   * Antes era el medio exacto del mapa. Con 7 sitios eso caia en tierra
   * de casualidad; al pasar a 10 el medio cayo justo en un canal de
   * agua, y las ultimas partidas terminaban con los tres supervivientes
   * nadando en circulos sin poder dispararse.
   *
   * Asi que en vez de fiarlo a la suerte, se prueban posiciones a lo
   * largo del mapa y se elige la que deja MAS SUELO PISABLE dentro de
   * la zona final; a igualdad de suelo, la mas cercana al medio. Vale
   * igual para los canales que para los lagos de dentro de una zona.
   */
  _centroEnTierra() {
    const medio = (this.x0 + this.x1) / 2;
    const mitad = this.cfg.finalWidth / 2;

    let mejor = medio;
    let mejorNota = -Infinity;

    // Solo se buscan sitios DENTRO del tramo jugable.
    for (let c = this.x0 + mitad; c <= this.x1 - mitad; c += 200) {
      let tierra = 0;
      let total = 0;
      for (let x = c - mitad; x <= c + mitad; x += 40) {
        total++;
        // Sin suelo solido por encima del nivel del mar: es agua.
        if (this.world.groundYAtFast(x) < this.world.waterY) tierra++;
      }

      const nota = (tierra / total) * 1000 - Math.abs(c - medio) / this.world.width;

      if (nota > mejorNota) { mejorNota = nota; mejor = c; }
    }

    return mejor;
  }

  get centerX() { return (this.minX + this.maxX) / 2; }
  get width() { return this.maxX - this.minX; }

  /** ¿Esta este punto dentro de la zona segura? */
  contains(x) { return x >= this.minX && x <= this.maxX; }

  /** Progreso del cierre, de 0 (recien empezada) a 1 (zona minima). */
  get progress() {
    const C = this.cfg;
    if (this.time <= C.startDelay) return 0;
    return Math.min(1, (this.time - C.startDelay) / C.closeTime);
  }

  /** Dano por segundo a quien este fuera (crece con el cierre). */
  get damagePerSecond() {
    const C = this.cfg;
    return C.damageStart + (C.damageEnd - C.damageStart) * this.progress;
  }

  /**
   * @param {number} dt
   * @param {Array} entities  jugador y bots (todos con .alive y .takeDamage)
   */
  update(dt, entities) {
    const C = this.cfg;
    this.time += dt;

    // --- Cierre progresivo hacia el centro elegido ---
    const centro = this.centro;
    // El ancho de partida tiene que tapar el TRAMO JUGABLE entero desde
    // ese centro. Si se usara su ancho a secas, con el centro corrido de
    // sitio quedaria una franja del borde fuera de la zona desde el
    // primer segundo, y quien cayera ahi empezaria perdiendo vida.
    const anchoMax = 2 * Math.max(centro - this.x0, this.x1 - centro);
    const ancho = anchoMax + (C.finalWidth - anchoMax) * this.progress;

    this.minX = Math.max(this.x0, centro - ancho / 2);
    this.maxX = Math.min(this.x1, centro + ancho / 2);

    // --- Dano a quien esta fuera ---
    if (this.progress <= 0) return;

    const dps = this.damagePerSecond;
    for (const e of entities) {
      if (!e.alive) continue;
      const cx = e.x + e.w / 2;
      if (this.contains(cx)) continue;

      // `null` como origen: no cuenta como baja de nadie.
      e.takeDamage(dps * dt, cx, e.y + e.h / 2, null);
    }
  }

  /* =============================================================
     DIBUJO (en coordenadas de mundo)
     ============================================================= */
  draw(ctx, camera) {
    if (this.progress <= 0) return;

    const top = camera.y - 100;
    const alto = camera.h + 200;

    ctx.save();

    // Velo sobre las zonas de fuera
    ctx.fillStyle = 'rgba(150, 80, 220, 0.20)';
    if (this.minX > camera.x - 100) {
      ctx.fillRect(camera.x - 200, top, this.minX - camera.x + 200, alto);
    }
    if (this.maxX < camera.x + camera.w + 100) {
      ctx.fillRect(this.maxX, top, camera.x + camera.w + 200 - this.maxX, alto);
    }

    // Paredes de la zona
    ctx.strokeStyle = 'rgba(190, 130, 255, 0.85)';
    ctx.lineWidth = 5;
    for (const x of [this.minX, this.maxX]) {
      if (x < camera.x - 60 || x > camera.x + camera.w + 60) continue;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + alto);
      ctx.stroke();
    }

    ctx.restore();
  }
}
