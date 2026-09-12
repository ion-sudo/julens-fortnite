/**
 * utils.js
 * ---------------------------------------------------------------
 * Funciones matematicas y helpers reutilizables en todo el juego.
 */

/** Limita v al rango [min, max]. */
export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/** Interpolacion lineal. */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Interpolacion suavizada e independiente del framerate.
 * `smooth` es la "velocidad" de acercamiento; dt el delta en segundos.
 */
export const damp = (a, b, smooth, dt) => lerp(a, b, 1 - Math.exp(-smooth * dt));

/** Aproxima `value` hacia `target` como mucho `maxDelta`. */
export function moveTowards(value, target, maxDelta) {
  if (Math.abs(target - value) <= maxDelta) return target;
  return value + Math.sign(target - value) * maxDelta;
}

/** Colision AABB (rectangulos alineados a los ejes). */
export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
 * PRNG deterministico (mulberry32).
 * Lo usamos para generar decoracion (hierba, piedras, arboles) siempre igual,
 * de modo que el escenario no "parpadee" entre frames ni cambie al recargar.
 */
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Numero aleatorio en [min, max) usando un rng dado. */
export const randRange = (rng, min, max) => min + rng() * (max - min);

/** Entero aleatorio en [min, max]. */
export const randInt = (rng, min, max) => Math.floor(randRange(rng, min, max + 1));

/** Dibuja un rectangulo con esquinas redondeadas (path listo para fill/stroke). */
export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Atajo: rectangulo redondeado relleno. */
export function fillRoundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}
