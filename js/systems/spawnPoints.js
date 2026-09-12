/**
 * spawnPoints.js
 * ---------------------------------------------------------------
 * REPARTO DE APARICIONES al empezar la partida.
 *
 * El metodo anterior sorteaba posiciones y descartaba las que caian
 * demasiado cerca de otra. Con 50 bots y un mapa lineal eso no da:
 * en cuanto se llenaba, los que faltaban se colocaban SIN separacion y
 * acababan amontonados unos encima de otros.
 *
 * Aqui se hace al reves y de forma determinista:
 *   1. se suman todos los tramos de suelo pisable -> ancho util W
 *   2. se reparte a los N participantes cada W/N pixeles
 *   3. cada uno se mueve un poco al azar dentro de su hueco
 *
 * Asi TODOS quedan separados por la maxima distancia que permite el
 * mapa, repartidos de punta a punta, y nunca se amontonan.
 */

/**
 * Tramos de suelo donde se puede aparecer.
 * @param {import('../world/level.js').World} world
 * @param {number} minWidth  ancho minimo de plataforma para contar
 * @param {object|null} bounds  { x0, x1 } tramo jugable, o null = todo
 */
export function surfaceStrips(world, minWidth = 160, bounds = null) {
  const candidatos = world.platforms
    .filter((p) => p.ground && p.w >= minWidth && !p.lakeBed)
    // Modos de MAPA REDUCIDO: solo cuenta el suelo del tramo jugable.
    .filter((p) => !bounds || (p.x + p.w > bounds.x0 && p.x < bounds.x1))
    .map((p) => ({
      x0: Math.max(p.x + 45, bounds ? bounds.x0 + 45 : -Infinity),
      x1: Math.min(p.x + p.w - 45, bounds ? bounds.x1 - 45 : Infinity),
      y: p.y,
    }))
    .filter((s) => s.x1 > s.x0)
    // De mas ancho a mas estrecho: las islas grandes mandan.
    .sort((a, b) => (b.x1 - b.x0) - (a.x1 - a.x0));

  // Los escalones estan ENCIMA de las islas, asi que ocupan la misma
  // franja de X. Si se contasen los dos, el reparto pondria a dos
  // participantes en la misma columna (uno arriba y otro abajo) y
  // pareceria que estan amontonados. Nos quedamos con una superficie
  // por franja horizontal.
  const elegidos = [];
  for (const c of candidatos) {
    const solapa = elegidos.some((e) => c.x0 < e.x1 && c.x1 > e.x0);
    if (!solapa) elegidos.push(c);
  }

  return elegidos.sort((a, b) => a.x0 - b.x0);
}

/**
 * Reparte `count` puntos de aparicion por todo el mapa.
 *
 * @param {import('../world/level.js').World} world
 * @param {number} count       cuantos puntos (jugador incluido)
 * @param {number} bodyHeight  alto del personaje, para posarlo sobre el suelo
 * @param {() => number} rng
 * @param {object|null} bounds  { x0, x1 } tramo jugable, o null = todo
 * @returns {Array<{x:number, y:number}>} en orden de izquierda a derecha
 */
export function spreadSpawnPoints(world, count, bodyHeight, rng = Math.random, bounds = null) {
  const strips = surfaceStrips(world, 160, bounds);
  if (strips.length === 0 || count <= 0) return [];

  const edificios = world.buildingRanges ? world.buildingRanges() : [];

  // Ancho util total y separacion ideal entre participantes.
  const total = strips.reduce((sum, s) => sum + (s.x1 - s.x0), 0);
  const paso = total / count;

  const puntos = [];

  // Se recorre el ancho util como si fuera UNA SOLA linea continua y se
  // va traduciendo cada posicion al tramo que le toca. El recorrido tiene
  // que ser monotono (siempre hacia delante), asi que el desvio aleatorio
  // se aplica DESPUES de traducir, no antes: si se aplicase antes, dos
  // participantes podian cruzarse de tramo y acabar pegados en un borde.
  let stripIndex = 0;
  let consumido = 0;   // ancho ya recorrido de los tramos anteriores

  for (let i = 0; i < count; i++) {
    const objetivo = i * paso + paso / 2;

    // Avanza hasta el tramo que contiene esa posicion.
    while (
      stripIndex < strips.length - 1 &&
      objetivo >= consumido + (strips[stripIndex].x1 - strips[stripIndex].x0)
    ) {
      consumido += strips[stripIndex].x1 - strips[stripIndex].x0;
      stripIndex++;
    }

    const s = strips[stripIndex];
    const base = s.x0 + (objetivo - consumido);

    // Desvio suave, sin salirse del tramo ni invadir al vecino.
    const jitter = (rng() - 0.5) * paso * 0.5;
    let x = Math.min(s.x1, Math.max(s.x0, base + jitter));

    // Nadie aparece DENTRO de un edificio: quedaria encerrado hasta
    // que alguien abriese la puerta.
    x = pushOutOfBuildings(x, edificios, s);

    puntos.push({ x, y: s.y - bodyHeight - 2 });
  }

  return puntos;
}

/**
 * Si la posicion cae dentro de un edificio, la saca por el lado mas
 * cercano sin salirse del tramo de suelo.
 */
function pushOutOfBuildings(x, edificios, strip) {
  for (const e of edificios) {
    if (x < e.x0 || x > e.x1) continue;

    const izquierda = e.x0 - 5;
    const derecha = e.x1 + 5;

    const cabeIzq = izquierda >= strip.x0;
    const cabeDer = derecha <= strip.x1;

    if (cabeIzq && (!cabeDer || x - e.x0 < e.x1 - x)) return izquierda;
    if (cabeDer) return derecha;
    // Si no cabe por ninguno, se deja donde estaba (caso raro).
  }
  return x;
}

/** Baraja una lista (Fisher-Yates) con el rng que se le pase. */
export function shuffle(list, rng = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Separacion minima real entre puntos consecutivos. Solo se usa para
 * comprobar en las pruebas que el reparto ha quedado bien.
 */
export function minGap(points) {
  const xs = points.map((p) => p.x).sort((a, b) => a - b);
  let min = Infinity;
  for (let i = 1; i < xs.length; i++) min = Math.min(min, xs[i] - xs[i - 1]);
  return min === Infinity ? 0 : min;
}
