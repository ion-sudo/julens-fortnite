/**
 * biomes.js
 * ---------------------------------------------------------------
 * LOS AMBIENTES de los 10 sitios del mapa.
 *
 * Cada bioma define su propia paleta de terreno, que vegetacion o
 * "trastos" salen por el suelo, y de que color es el cielo por encima.
 * Con eso, dos zonas nunca se parecen aunque compartan el mismo motor
 * de terreno.
 *
 * `props` es una lista de tipos con su peso: cuanto mas alto, mas
 * aparece ese elemento en la zona. Los dibuja js/world/props.js.
 */

export const BIOMES = {
  /* ---------- Bosque de pinos ---------- */
  bosque: {
    id: 'bosque',
    grassLight: '#6fd36a', grassMid: '#4cbb4c', grassDark: '#37a03c',
    dirtLight: '#a9763f', dirtMid: '#8a5c2f', dirtDark: '#6b4522',
    tuft: '#37a03c',
    sky: null,                       // sin tinte: el cielo normal
    props: [
      { type: 'pino', weight: 60, spacing: [170, 280] },
      { type: 'arbusto', weight: 25 },
      { type: 'roca', weight: 15 },
    ],
  },

  /* ---------- Playa de arena ---------- */
  playa: {
    id: 'playa',
    grassLight: '#f2dfa8', grassMid: '#e3c983', grassDark: '#c9a95f',
    dirtLight: '#d8bb84', dirtMid: '#b8996a', dirtDark: '#93764a',
    tuft: '#cbb06a',
    sky: 'rgba(255, 225, 160, 0.16)',
    props: [
      { type: 'palmera', weight: 45, spacing: [210, 330] },
      { type: 'sombrilla', weight: 20 },
      { type: 'roca', weight: 15 },
      { type: 'concha', weight: 20 },
    ],
  },

  /* ---------- Pueblo con casas ---------- */
  pueblo: {
    id: 'pueblo',
    grassLight: '#7dd97a', grassMid: '#57bd57', grassDark: '#3d9c43',
    dirtLight: '#b0805a', dirtMid: '#8d6242', dirtDark: '#6b4a31',
    tuft: '#3d9c43',
    sky: null,
    props: [
      { type: 'farola', weight: 30, spacing: [230, 340] },
      { type: 'arbusto', weight: 30 },
      { type: 'valla', weight: 25 },
      { type: 'pino', weight: 15, spacing: [260, 400] },
    ],
  },

  /* ---------- Montana nevada ---------- */
  nevada: {
    id: 'nevada',
    grassLight: '#ffffff', grassMid: '#e2eef7', grassDark: '#bcd2e4',
    dirtLight: '#8fa3b8', dirtMid: '#6f8399', dirtDark: '#53657a',
    tuft: '#cfe0ee',
    sky: 'rgba(200, 230, 255, 0.22)',
    props: [
      { type: 'abeto', weight: 50, spacing: [190, 300] },
      { type: 'rocaNieve', weight: 30 },
      { type: 'munieco', weight: 20 },
    ],
  },

  /* ---------- Fabrica ---------- */
  fabrica: {
    id: 'fabrica',
    grassLight: '#8d9aa6', grassMid: '#6f7d8a', grassDark: '#55626e',
    dirtLight: '#7a6a5c', dirtMid: '#5e5148', dirtDark: '#443b34',
    tuft: '#7c8a72',
    sky: 'rgba(170, 160, 150, 0.20)',
    props: [
      { type: 'barril', weight: 35, spacing: [180, 280] },
      { type: 'tuberia', weight: 30 },
      { type: 'cajaMetal', weight: 25 },
      { type: 'roca', weight: 10 },
    ],
  },

  /* ---------- Mansion y jardines ---------- */
  mansion: {
    id: 'mansion',
    grassLight: '#8ae085', grassMid: '#5cc45e', grassDark: '#40a349',
    dirtLight: '#b48f6a', dirtMid: '#907050', dirtDark: '#6d543c',
    tuft: '#40a349',
    sky: 'rgba(255, 240, 190, 0.12)',
    props: [
      { type: 'seto', weight: 40, spacing: [200, 300] },
      { type: 'fuente', weight: 15 },
      { type: 'estatua', weight: 20 },
      { type: 'arbusto', weight: 25 },
    ],
  },

  /* ---------- Desierto ---------- */
  desierto: {
    id: 'desierto',
    grassLight: '#e8c98a', grassMid: '#d4ad63', grassDark: '#b58e49',
    dirtLight: '#c49a63', dirtMid: '#a07a48', dirtDark: '#7c5c34',
    tuft: '#b58e49',
    sky: 'rgba(255, 200, 130, 0.20)',
    props: [
      { type: 'cactus', weight: 45, spacing: [200, 320] },
      { type: 'craneo', weight: 20 },
      { type: 'roca', weight: 20 },
      { type: 'rodante', weight: 15 },
    ],
  },

  /* ---------- Muelle de un puerto ---------- */
  // Tablones mojados por arriba y roca oscura por debajo: se nota que
  // el suelo es un embarcadero y no tierra firme.
  muelle: {
    id: 'muelle',
    grassLight: '#c69b64', grassMid: '#a87c4c', grassDark: '#8a6238',
    dirtLight: '#6a7a86', dirtMid: '#51606b', dirtDark: '#3b4750',
    tuft: '#8a6238',
    sky: 'rgba(150, 190, 215, 0.18)',
    // Las redes pesan mucho porque son la UNICA madera del puerto: con
    // menos, quien cae aqui no puede construir en toda la partida.
    props: [
      { type: 'grua', weight: 12, spacing: [420, 620] },
      { type: 'contenedor', weight: 24, spacing: [200, 320] },
      { type: 'bolardo', weight: 20 },
      { type: 'redes', weight: 44 },
    ],
  },

  /* ---------- Parque de atracciones ---------- */
  feria: {
    id: 'feria',
    grassLight: '#9be86f', grassMid: '#6fcf4f', grassDark: '#4aa83c',
    dirtLight: '#8c6bb1', dirtMid: '#6d4f92', dirtDark: '#523a70',
    tuft: '#4aa83c',
    sky: 'rgba(255, 190, 235, 0.16)',
    // Los mastiles de las carpas son la madera de la feria.
    props: [
      { type: 'noria', weight: 10, spacing: [520, 760] },
      { type: 'carpa', weight: 46, spacing: [230, 350] },
      { type: 'globos', weight: 22 },
      { type: 'taquilla', weight: 22 },
    ],
  },

  /* ---------- Volcan ---------- */
  // Basalto negro con grietas naranjas. La "hierba" del borde son
  // brasas, por eso el tuft es del color de la lava.
  volcan: {
    id: 'volcan',
    grassLight: '#5a4a48', grassMid: '#42332f', grassDark: '#2c211f',
    dirtLight: '#4a2f28', dirtMid: '#382019', dirtDark: '#241210',
    tuft: '#ff7a3c',
    sky: 'rgba(255, 110, 60, 0.28)',
    // Y aqui, los arboles quemados.
    props: [
      { type: 'rocaLava', weight: 22, spacing: [190, 300] },
      { type: 'fumarola', weight: 16 },
      { type: 'arbolQuemado', weight: 46, spacing: [200, 300] },
      { type: 'cristal', weight: 16 },
    ],
  },
};

/** Datos de un bioma por id (con el bosque como respaldo). */
export function biomeOf(id) {
  return BIOMES[id] || BIOMES.bosque;
}
