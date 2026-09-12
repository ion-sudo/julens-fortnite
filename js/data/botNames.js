/**
 * botNames.js
 * ---------------------------------------------------------------
 * NOMBRES DE LOS BOTS.
 *
 * Se generan combinando piezas (apodo + base + remate), de modo que:
 *   - dentro de una misma partida NUNCA se repite un nombre
 *   - entre partidas salen combinaciones distintas
 *
 * Con estas listas hay decenas de miles de combinaciones posibles,
 * asi que sacar 50 nombres unicos no es ningun problema.
 */

/** Nucleo del nombre. */
const BASES = [
  'Sombra', 'Trueno', 'Pavo', 'Lobo', 'Cactus', 'Ninja', 'Tiburon', 'Rayo',
  'Pino', 'Roca', 'Tormenta', 'Chispa', 'Halcon', 'Zorro', 'Puma', 'Cuervo',
  'Dragon', 'Fenix', 'Bufalo', 'Escorpion', 'Vikingo', 'Samurai', 'Pirata',
  'Cometa', 'Meteoro', 'Titan', 'Bandido', 'Coyote', 'Jabali', 'Lince',
  'Mantis', 'Avispa', 'Buho', 'Panda', 'Gorila', 'Mapache', 'Erizo', 'Nutria',
  'Tejon', 'Camaleon', 'Iguana', 'Pulpo', 'Orca', 'Morsa', 'Yeti', 'Golem',
  'Espectro', 'Duende', 'Trol', 'Mago',
];

/** Apodo que va delante (opcional). */
const APODOS = [
  'Capi', 'Don', 'Tito', 'Super', 'Mega', 'Ultra', 'Turbo', 'Loco', 'Rey',
  'Mini', 'Gran', 'Viejo', 'Joven', 'Doctor', 'Profe', 'Sargento', 'Comandante',
  'Maestro', 'Senor', 'Jefe',
];

/** Remate que va detras (opcional). */
const REMATES = [
  'Veloz', 'Furtivo', 'Salvaje', 'Feroz', 'Astuto', 'Valiente', 'Sigiloso',
  'Certero', 'Imparable', 'Silencioso', 'Ardiente', 'Glacial', 'Electrico',
  'Dorado', 'Nocturno', 'Errante',
];

/**
 * Genera `count` nombres distintos entre si.
 * @param {number} count
 * @param {() => number} rng
 * @returns {string[]}
 */
export function generateBotNames(count, rng = Math.random) {
  const usados = new Set();
  const nombres = [];
  let intentos = 0;

  // Limite de intentos por si algun dia se piden mas nombres de los posibles.
  while (nombres.length < count && intentos < count * 200) {
    intentos++;

    const nombre = randomName(rng);
    if (usados.has(nombre)) continue;

    usados.add(nombre);
    nombres.push(nombre);
  }

  // Red de seguridad: si (por lo que sea) faltasen nombres, se numeran.
  let extra = 1;
  while (nombres.length < count) {
    const nombre = `Jugador${extra++}`;
    if (!usados.has(nombre)) { usados.add(nombre); nombres.push(nombre); }
  }

  return nombres;
}

/** Una combinacion al azar de las tres listas. */
function randomName(rng) {
  const base = pick(BASES, rng);
  const forma = rng();

  if (forma < 0.30) {
    // Apodo + base:  "TitoLobo"
    return `${pick(APODOS, rng)}${base}`;
  }
  if (forma < 0.60) {
    // Base + remate: "LoboFurtivo"
    return `${base}${pick(REMATES, rng)}`;
  }
  if (forma < 0.85) {
    // Base + numero: "Lobo77"
    return `${base}${10 + Math.floor(rng() * 90)}`;
  }
  // Apodo + base + numero: "TitoLobo7"
  return `${pick(APODOS, rng)}${base}${1 + Math.floor(rng() * 9)}`;
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}
