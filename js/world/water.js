/**
 * water.js
 * ---------------------------------------------------------------
 * ZONAS DE AGUA: los canales de mar entre islas y los lagos excavados
 * dentro de ellas.
 *
 * Cada masa de agua es un rectangulo con su propia SUPERFICIE, asi que
 * un lago puede estar a distinta altura que el mar. La fisica de nado
 * del jugador (y de los bots) solo necesita saber dos cosas:
 *   - ¿estoy dentro de agua?      -> bodyAt()
 *   - ¿donde esta la superficie?  -> body.y
 */

export class WaterBody {
  /**
   * @param {number} x,y  esquina superior izquierda (y = SUPERFICIE)
   * @param {number} w,h  ancho y profundidad
   * @param {string} type 'mar' | 'lago'
   */
  constructor(x, y, w, h, type = 'lago') {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type = type;
  }

  get bottom() { return this.y + this.h; }
  get centerX() { return this.x + this.w / 2; }

  /** ¿Este punto esta dentro del agua? */
  contains(px, py) {
    return px >= this.x && px <= this.x + this.w &&
           py >= this.y && py <= this.bottom;
  }
}

/**
 * Devuelve la masa de agua que contiene un punto, o null.
 * @param {WaterBody[]} bodies
 */
export function bodyAt(bodies, px, py) {
  for (const b of bodies) {
    if (b.contains(px, py)) return b;
  }
  return null;
}

/**
 * ¿Hay agua en esta columna? Sirve para que la IA sepa que no debe
 * meterse (o que tiene que salir).
 */
export function bodyAtColumn(bodies, px) {
  for (const b of bodies) {
    if (px >= b.x && px <= b.x + b.w) return b;
  }
  return null;
}

/* =============================================================
   DIBUJO
   ============================================================= */

/**
 * Pinta todas las masas de agua visibles.
 * @param {boolean} front  true para la pasada de DELANTE (translucida,
 *   la que tapa al personaje sumergido); false para la de detras.
 */
export function drawWaterBodies(ctx, bodies, camera, time, front = false) {
  for (const b of bodies) {
    if (!camera.isVisible(b.x, b.y - 20, b.w, b.h + 40)) continue;
    drawBody(ctx, b, time, front);
  }
}

function drawBody(ctx, b, time, front) {
  ctx.save();

  if (front) {
    // Capa de delante: solo un velo azulado para que se vea que estas
    // metido en el agua. Muy transparente para no tapar la accion.
    ctx.fillStyle = 'rgba(70, 170, 225, 0.28)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.restore();
    return;
  }

  // --- Cuerpo del agua ---
  const g = ctx.createLinearGradient(0, b.y, 0, b.bottom);
  if (b.type === 'lago') {
    g.addColorStop(0, '#63d0ef');
    g.addColorStop(1, '#1f7fb8');
  } else {
    g.addColorStop(0, '#5fc4ea');
    g.addColorStop(1, '#1a6cb4');
  }
  ctx.fillStyle = g;
  ctx.fillRect(b.x, b.y, b.w, b.h);

  // --- Rayos de luz en el fondo ---
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    const rx = b.x + b.w * (0.2 + i * 0.3) + Math.sin(time * 0.5 + i) * 10;
    ctx.beginPath();
    ctx.moveTo(rx, b.y);
    ctx.lineTo(rx + 16, b.y);
    ctx.lineTo(rx + 34, b.bottom);
    ctx.lineTo(rx + 6, b.bottom);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- Olas en la superficie ---
  ctx.lineWidth = 3;
  for (let k = 0; k < 2; k++) {
    ctx.strokeStyle = k === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.32)';
    ctx.beginPath();
    const yBase = b.y + 4 + k * 11;
    for (let x = b.x; x <= b.x + b.w; x += 10) {
      const y = yBase + Math.sin(x * 0.05 + time * (1.8 + k * 0.7)) * (3.5 - k);
      if (x === b.x) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // --- Borde superior brillante ---
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x + b.w, b.y);
  ctx.stroke();

  ctx.restore();
}
