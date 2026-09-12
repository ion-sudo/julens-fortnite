/**
 * zones.js
 * ---------------------------------------------------------------
 * LOS 10 SITIOS CON NOMBRE del mapa. Son la BASE del mundo: el terreno
 * se genera a partir de esta lista (ver world/level.js), no al reves.
 * Cambiar una zona aqui cambia el mapa.
 *
 * Cada zona describe:
 *   x0, x1      tramo horizontal que ocupa
 *   biome       ambiente (colores, vegetacion) -> data/biomes.js
 *   groundY     altura del suelo (menos = mas alto)
 *   chestWeight cuantos cofres salen, en peso relativo
 *   gapAfter    ancho del canal de agua que la separa de la siguiente
 *   lake        lago dentro de la zona, opcional { at, w, depth }
 *   buildings   edificios de la zona (ver entities/building.js)
 *
 * DOS REGLAS AL TOCAR ESTA LISTA:
 *
 *   1) Las alturas van escalonadas de zona a zona, pero NUNCA mas de
 *      150 px de diferencia entre vecinas: es lo que alcanza el salto
 *      del personaje. Con mas, el mapa se parte en dos mitades.
 *   2) `x0` de una zona = `x1` de la anterior + su `gapAfter`. No hay
 *      hueco sin declarar: lo que no es zona es canal de agua.
 *
 * Todo lo demas (bus, paravela, cofres, vehiculos, tirolinas, mapa de
 * la M, reparto de los 75 jugadores) se calcula a partir de aqui, asi
 * que anadir un sitio los actualiza a todos solo.
 */

export const ZONES = [
  {
    id: 'pinar', name: 'Pinar Perdido', biome: 'bosque',
    x0: 0, x1: 2400, groundY: 1080, chestWeight: 3, gapAfter: 260,
    buildings: [{ type: 'cabana', at: 0.30 }, { type: 'cabana', at: 0.72, variant: 1 }],
  },
  {
    id: 'cala', name: 'Cala Rocosa', biome: 'playa',
    x0: 2660, x1: 4900, groundY: 1150, chestWeight: 2, gapAfter: 260,
    buildings: [{ type: 'chiringuito', at: 0.28 }, { type: 'chiringuito', at: 0.70, variant: 1 }],
  },
  {
    // NUEVO. Va detras de la playa porque un puerto pegado al mar tiene
    // sentido, y el faro se ve desde media isla.
    id: 'puerto', name: 'Puerto Ancla', biome: 'muelle',
    x0: 5160, x1: 7560, groundY: 1180, chestWeight: 4, gapAfter: 260,
    lake: { at: 0.62, w: 300, depth: 200 },   // la darsena donde atracan
    buildings: [
      { type: 'faro', at: 0.16 },
      { type: 'nave', at: 0.50 },
      { type: 'chiringuito', at: 0.88, variant: 1 },   // pasado el agua de la darsena
    ],
  },
  {
    id: 'villa', name: 'Villa Pavo', biome: 'pueblo',
    x0: 7820, x1: 10360, groundY: 1060, chestWeight: 4, gapAfter: 0,
    lake: { at: 0.86, w: 260, depth: 190 },
    buildings: [
      { type: 'casa', at: 0.12 },
      { type: 'casa', at: 0.30, variant: 1 },
      { type: 'tienda', at: 0.50 },
      { type: 'casa', at: 0.68, variant: 1 },
    ],
  },
  {
    id: 'cumbre', name: 'Cumbre Helada', biome: 'nevada',
    x0: 10360, x1: 12660, groundY: 980, chestWeight: 4, gapAfter: 260,
    buildings: [{ type: 'refugio', at: 0.32 }, { type: 'refugio', at: 0.74, variant: 1 }],
  },
  {
    id: 'fabrica', name: 'Fabrica Tornillo', biome: 'fabrica',
    x0: 12920, x1: 15260, groundY: 1090, chestWeight: 4, gapAfter: 260,
    buildings: [
      { type: 'nave', at: 0.22 },
      { type: 'nave', at: 0.55, variant: 1 },
      { type: 'nave', at: 0.84 },
    ],
  },
  {
    // NUEVO. El sitio mas llamativo del mapa y el mas peligroso: mucho
    // cofre junto y ningun sitio donde esconderse.
    id: 'feria', name: 'Feria Fortuna', biome: 'feria',
    x0: 15520, x1: 17980, groundY: 1040, chestWeight: 5, gapAfter: 0,
    buildings: [
      { type: 'caseta', at: 0.16 },
      { type: 'torre', at: 0.48 },
      { type: 'caseta', at: 0.82, variant: 1 },
    ],
  },
  {
    id: 'mansion', name: 'Mansion Dorada', biome: 'mansion',
    x0: 17980, x1: 20280, groundY: 1030, chestWeight: 5, gapAfter: 260,
    lake: { at: 0.18, w: 240, depth: 175 },
    buildings: [{ type: 'mansion', at: 0.55 }, { type: 'casa', at: 0.85 }],
  },
  {
    id: 'dunas', name: 'Dunas Secas', biome: 'desierto',
    x0: 20540, x1: 22980, groundY: 1120, chestWeight: 3, gapAfter: 260,
    buildings: [{ type: 'ruina', at: 0.32 }, { type: 'ruina', at: 0.74, variant: 1 }],
  },
  {
    // NUEVO. Cierra el mapa por el este. Negro, naranja y sin vegetacion:
    // no se parece a nada de lo que hay antes.
    id: 'volcan', name: 'Volcan Ceniza', biome: 'volcan',
    x0: 23240, x1: 25640, groundY: 1010, chestWeight: 4, gapAfter: 0,
    buildings: [{ type: 'bunker', at: 0.30 }, { type: 'ruina', at: 0.72, variant: 1 }],
  },
];

/** Ancho total del mundo, con un margen al final. */
export const WORLD_WIDTH = ZONES[ZONES.length - 1].x1 + 200;

/** Zona en la que cae una coordenada X, o null si es campo abierto. */
export function zoneAt(x) {
  return ZONES.find((z) => x >= z.x0 && x <= z.x1) || null;
}

/** Zona por id. */
export function zoneById(id) {
  return ZONES.find((z) => z.id === id) || null;
}
