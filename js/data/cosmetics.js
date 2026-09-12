/**
 * cosmetics.js
 * ---------------------------------------------------------------
 * CATALOGO de objetos cosmeticos del juego: SKINS, PICOS y PARAVELAS.
 * Es solo DATOS (sin logica): el dibujo vive en playerSprite.js y
 * gearSprite.js, y la propiedad/equipamiento en core/profile.js.
 *
 * Para anadir un cosmetico nuevo basta con anadir una entrada aqui:
 * la tienda y la taquilla se rellenan solas a partir de estas listas.
 */

/* =============================================================
   RAREZAS
   Viven en data/rarities.js porque las comparten armas y curas.
   Se reexportan aqui para no cambiar los imports de la tienda.
   ============================================================= */
export { RARITIES, rarityOf } from './rarities.js';
import { EMOTES } from './emotes.js';
import { RARITIES, RARITY_ORDER } from './rarities.js';

/** Pavos con los que empieza un jugador nuevo: se empieza de cero. */
export const STARTING_VBUCKS = 0;

/** Pavos que se ganan al terminar una partida. */
export const MATCH_REWARD = 50;

/* =============================================================
   SKINS
   -------------------------------------------------------------
   `palette` alimenta directamente al dibujo del personaje.
   `head` define el peinado/casco (el dibujo vive en playerSprite.js):
     tipo: 'pelo' | 'melena' | 'gorra' | 'casco' | 'capucha' | 'sombrero'
           | 'corona' | 'mono' | 'coleta' | 'cresta' | 'orejas' | 'bandana'
           | 'mascara' | 'cuernos' | 'astro'
   ============================================================= */

/** Rellena los valores por defecto para que cada skin sea corta de escribir. */
function makeSkin(def) {
  const p = def.palette;
  return {
    type: 'skin',
    ...def,
    palette: {
      skin: '#f3c197',
      skinShade: '#d9a377',
      boots: '#2a2f45',
      glove: '#2b3050',
      belt: '#2b3050',
      accent: 'rgba(255,255,255,0.45)', // franja/cremallera del pecho
      eye: '#20304a',
      ...p,
      // Tonos oscuros derivados si no se especifican
      jacketDark: p.jacketDark || shade(p.jacket, -0.28),
      pantsDark: p.pantsDark || shade(p.pants, -0.28),
    },
    head: { tipo: 'pelo', color: '#3a2a1c', color2: '#ffffff', ...def.head },
    // Detalles del traje (patron, emblema, capa...). Ver entities/skinStyle.js
    style: def.style || {},
  };
}

/** Oscurece (amount < 0) o aclara (amount > 0) un color hexadecimal. */
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.max(0, Math.min(255, Math.round(c + (amount < 0 ? c : 255 - c) * amount)))
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export const SKINS = [
  makeSkin({
    id: 'recluta', name: 'Recluta', rarity: 'common', price: 0, free: true,
    desc: 'El uniforme con el que todo el mundo empieza.',
    palette: { jacket: '#3f7fe8', pants: '#37406b', backpack: '#e0a63a' },
    style: { pattern: 'panel', emblem: 'rombo', trim: '#2b3050' },
    head: { tipo: 'pelo', color: '#3a2a1c' },
  }),
  makeSkin({
    id: 'explorador', name: 'Explorador Pino', rarity: 'uncommon', price: 200,
    desc: 'Conoce cada arbol de la isla por su nombre.',
    palette: { jacket: '#4f9440', pants: '#5a4a2f', backpack: '#7a4b26', boots: '#3d2c1a' },
    style: { pattern: 'camo', emblem: 'estrella', trim: '#2f6b28' },
    head: { tipo: 'gorra', color: '#2f6b28', color2: '#8a6a3a' },
  }),
  makeSkin({
    id: 'comando', name: 'Comando Carmesi', rarity: 'uncommon', price: 300,
    desc: 'Entra primero y pregunta despues.',
    palette: { jacket: '#c8392b', pants: '#2f3542', backpack: '#1f2430' },
    style: { pattern: 'chevron', emblem: 'cruz', trim: '#2f3542', shoulders: '#8e241a' },
    head: { tipo: 'gorra', color: '#8e241a', color2: '#2f3542' },
  }),
  makeSkin({
    id: 'buzo', name: 'Buzo Neon', rarity: 'rare', price: 500,
    desc: 'Traje pensado para los canales de la isla.',
    palette: { jacket: '#18d9c8', pants: '#13415e', backpack: '#0e6d80', glove: '#0e6d80' },
    style: { pattern: 'panel', emblem: 'ojo', trim: '#0e6d80' },
    head: { tipo: 'casco', color: '#18d9c8', color2: '#0d2b3d' },
  }),
  makeSkin({
    id: 'ninja', name: 'Ninja Sombra', rarity: 'rare', price: 700,
    desc: 'Nadie le ha oido caer de una plataforma.',
    palette: { jacket: '#333a55', pants: '#1c1f2e', backpack: '#c0392b', accent: 'rgba(192,57,43,0.9)' },
    style: { pattern: 'rayas', emblem: 'luna', trim: '#c0392b' },
    head: { tipo: 'capucha', color: '#333a55', color2: '#1c1f2e' },
  }),
  makeSkin({
    id: 'glaciar', name: 'Reina Glaciar', rarity: 'epic', price: 1000,
    desc: 'Deja escarcha en cada plataforma que pisa.',
    palette: {
      jacket: '#a9e4ff', pants: '#3f7ea8', backpack: '#dff4ff',
      skin: '#e9d7d0', skinShade: '#cbb2ab', glove: '#5f9fc4', boots: '#3f7ea8',
    },
    style: { pattern: 'chevron', emblem: 'rombo', trim: '#dff4ff', cape: { color: '#8fd4f5', color2: '#dff4ff' } },
    head: { tipo: 'melena', color: '#eaf7ff' },
  }),
  makeSkin({
    id: 'pirata', name: 'Pirata Tormenta', rarity: 'epic', price: 1200,
    desc: 'Llego a la isla antes que el bus de batalla.',
    palette: { jacket: '#8e3a68', pants: '#3b2b4a', backpack: '#6b4522', boots: '#3d2415' },
    style: { pattern: 'rayas', emblem: 'calavera', trim: '#ffd23f', cape: { color: '#5b2340', color2: '#8e3a68' } },
    head: { tipo: 'sombrero', color: '#3f2d59', color2: '#ffd23f' },
  }),
  makeSkin({
    id: 'solar', name: 'Cazadora Solar', rarity: 'legendary', price: 1600,
    desc: 'Su chaqueta brilla aunque el sol se esconda.',
    palette: { jacket: '#ff8a3d', pants: '#7a3b12', backpack: '#ffd23f', glove: '#7a3b12' },
    style: { pattern: 'chevron', emblem: 'llama', trim: '#ffd23f', shoulders: '#ff8a3d', glow: '#ffb03d' },
    head: { tipo: 'melena', color: '#ffc93f' },
  }),
  makeSkin({
    id: 'caballero', name: 'Caballero Oscuro', rarity: 'legendary', price: 1800,
    desc: 'Armadura forjada en la tormenta.',
    palette: {
      jacket: '#332b47', pants: '#1a1526', backpack: '#5b2340',
      accent: 'rgba(216,74,74,0.9)', glove: '#1a1526', boots: '#120e1c',
    },
    style: { pattern: 'panel', emblem: 'cruz', trim: '#d84a4a', shoulders: '#3d3357', cape: { color: '#2a1420', color2: '#5b2340' } },
    head: { tipo: 'casco', color: '#3d3357', color2: '#d84a4a' },
  }),
  makeSkin({
    id: 'cartero', name: 'Cartero Veloz', rarity: 'common', price: 120,
    desc: 'Reparte cajas de municion casa por casa.',
    palette: { jacket: '#4a6fa5', pants: '#2f3a52', backpack: '#c9a227', glove: '#2f3a52' },
    style: { pattern: 'panel', emblem: 'rombo', trim: '#c9a227' },
    head: { tipo: 'gorra', color: '#33507a', color2: '#c9a227' },
  }),
  makeSkin({
    id: 'obrero', name: 'Obrero de Tornillo', rarity: 'common', price: 180,
    desc: 'Ha levantado media Fabrica Tornillo el solo.',
    palette: { jacket: '#e8a33d', pants: '#4d5666', backpack: '#7a4b26', boots: '#3b3f4a' },
    style: { pattern: 'chevron', emblem: 'cruz', trim: '#ffc93f' },
    head: { tipo: 'casco', color: '#ffc93f', color2: '#c98a10' },
  }),
  makeSkin({
    id: 'surfera', name: 'Surfera de la Cala', rarity: 'uncommon', price: 250,
    desc: 'Se conoce todas las corrientes de la isla.',
    palette: { jacket: '#2fc4c0', pants: '#f0e6d2', backpack: '#ff8a3d', glove: '#128f8c' },
    style: { pattern: 'rayas', emblem: 'ojo', trim: '#ff8a3d' },
    head: { tipo: 'coleta', color: '#e8c05a' },
  }),
  makeSkin({
    id: 'lenadora', name: 'Lenadora Roja', rarity: 'uncommon', price: 320,
    desc: 'Sesenta de madera antes del desayuno.',
    palette: { jacket: '#b3382f', pants: '#3a3f4d', backpack: '#6b4522', boots: '#4a3220' },
    style: { pattern: 'camo', emblem: 'estrella', trim: '#e8d6a8' },
    head: { tipo: 'mono', color: '#5a3a20', color2: '#e8d6a8' },
  }),
  makeSkin({
    id: 'punki', name: 'Punki Cactus', rarity: 'rare', price: 520,
    desc: 'Tan comodo de abrazar como un cactus de las Dunas.',
    palette: { jacket: '#4f8a3d', pants: '#2b2f3d', backpack: '#c0392b', accent: 'rgba(255,210,63,0.85)' },
    style: { pattern: 'rayas', emblem: 'calavera', trim: '#ffd23f', shoulders: '#c0392b' },
    head: { tipo: 'cresta', color: '#5ad84a', color2: '#2b2f3d' },
  }),
  makeSkin({
    id: 'zorro', name: 'Zorro de Nieve', rarity: 'rare', price: 620,
    desc: 'Baja la Cumbre Helada sin dejar huella.',
    palette: {
      jacket: '#eef4fa', pants: '#8fa8bd', backpack: '#5f7f9c',
      glove: '#8fa8bd', boots: '#5f7f9c', accent: 'rgba(120,180,220,0.7)',
    },
    style: { pattern: 'panel', emblem: 'luna', trim: '#78b4dc' },
    head: { tipo: 'orejas', color: '#eef4fa', color2: '#f0a0b0' },
  }),
  makeSkin({
    id: 'corsaria', name: 'Corsaria Escarlata', rarity: 'rare', price: 750,
    desc: 'Cambio el barco por el bus de batalla.',
    palette: { jacket: '#c8392b', pants: '#2f2a3a', backpack: '#ffd23f', boots: '#3d2415' },
    style: { pattern: 'rayas', emblem: 'calavera', trim: '#ffd23f', cape: { color: '#8a2018', color2: '#c8392b' } },
    head: { tipo: 'bandana', color: '#c8392b', color2: '#2a1f16' },
  }),
  makeSkin({
    id: 'luchador', name: 'Luchador Rayo', rarity: 'epic', price: 950,
    desc: 'Sale al bus como quien sale al ring.',
    palette: {
      jacket: '#3a2f6b', pants: '#22203d', backpack: '#ffd23f',
      accent: 'rgba(255,210,63,0.9)', glove: '#ffd23f',
    },
    style: { pattern: 'chevron', emblem: 'rayo', trim: '#ffd23f', shoulders: '#ffd23f', cape: { color: '#241d4a', color2: '#4a3a8c' } },
    head: { tipo: 'mascara', color: '#4a3a8c', color2: '#ffd23f' },
  }),
  makeSkin({
    id: 'vikinga', name: 'Vikinga del Norte', rarity: 'epic', price: 1100,
    desc: 'Cruzo medio mapa a pie y sin quejarse.',
    palette: { jacket: '#7a5a3a', pants: '#4a3a2a', backpack: '#8a3a2a', boots: '#3a2a1a' },
    style: { pattern: 'camo', emblem: 'rombo', trim: '#e8dcc0', shoulders: '#b0b8c4', cape: { color: '#5a3a24', color2: '#8a6b4a' } },
    head: { tipo: 'cuernos', color: '#b0b8c4', color2: '#e8dcc0' },
  }),
  makeSkin({
    id: 'astronauta', name: 'Astronauta Perdido', rarity: 'legendary', price: 1700,
    desc: 'Aterrizo en la isla y decidio quedarse.',
    palette: {
      jacket: '#eef2f8', pants: '#c8d0dc', backpack: '#8d97a6',
      glove: '#aab4c2', boots: '#8d97a6', accent: 'rgba(255,138,61,0.9)',
    },
    style: { pattern: 'panel', emblem: 'estrella', trim: '#ff8a3d', shoulders: '#eef2f8', glow: '#a8d8ff' },
    head: { tipo: 'astro', color: '#eef2f8', color2: '#2f4a6b' },
  }),
  makeSkin({
    id: 'sombras', name: 'Senora de las Sombras', rarity: 'legendary', price: 1900,
    desc: 'La tormenta la esquiva a ella.',
    palette: {
      jacket: '#2a2340', pants: '#181428', backpack: '#7d4fd1',
      accent: 'rgba(180,92,240,0.9)', glove: '#181428', boots: '#120e1c',
      skin: '#d8c8d8', skinShade: '#b8a4bc',
    },
    style: { pattern: 'rayas', emblem: 'luna', trim: '#b45cf0', cape: { color: '#1a1030', color2: '#7d4fd1' }, glow: '#b45cf0' },
    head: { tipo: 'melena', color: '#b45cf0' },
  }),
  makeSkin({
    id: 'arcoiris', name: 'Prisma Arcoiris', rarity: 'mythic', price: 2600,
    desc: 'Cambia de color segun le da la luz.',
    palette: {
      jacket: '#ff6bd6', pants: '#3aa2f5', backpack: '#5ad84a',
      glove: '#ffd23f', boots: '#7d4fd1', accent: 'rgba(255,255,255,0.8)',
    },
    style: { pattern: 'chevron', emblem: 'estrella', trim: '#ffffff', shoulders: '#ffd23f', cape: { color: '#ff6bd6', color2: '#3aa2f5' }, glow: '#ff8ae0' },
    head: { tipo: 'cresta', color: '#ff6bd6', color2: '#3aa2f5' },
  }),
  /* ---------- Exclusivas del PASE DE BATALLA ----------
     No salen en la tienda: solo se consiguen subiendo de nivel. */
  makeSkin({
    id: 'pass_cadete', name: 'Cadete Estelar', rarity: 'uncommon', price: 0, pass: true,
    desc: 'Recompensa del pase · nivel 1.',
    palette: { jacket: '#4a5fa5', pants: '#2a3350', backpack: '#8fa8d8', accent: 'rgba(255,255,255,0.6)' },
    style: { pattern: 'panel', emblem: 'estrella', trim: '#cfe0ff' },
    head: { tipo: 'casco', color: '#6a7fc5', color2: '#cfe0ff' },
  }),
  makeSkin({
    id: 'pass_bosque', name: 'Centinela del Bosque', rarity: 'rare', price: 0, pass: true,
    desc: 'Recompensa del pase · nivel 15.',
    palette: { jacket: '#3f6b3a', pants: '#2f3d2a', backpack: '#7a5a2f', boots: '#2a2018' },
    style: { pattern: 'camo', emblem: 'ojo', trim: '#a8d878' },
    head: { tipo: 'capucha', color: '#3f6b3a', color2: '#26351f' },
  }),
  makeSkin({
    id: 'pass_tormenta', name: 'Jinete de Tormenta', rarity: 'rare', price: 0, pass: true,
    desc: 'Recompensa del pase · nivel 30.',
    palette: { jacket: '#2f4a6b', pants: '#1e2a3d', backpack: '#7ed0ff', accent: 'rgba(126,208,255,0.9)' },
    style: { pattern: 'chevron', emblem: 'rayo', trim: '#7ed0ff', shoulders: '#2f4a6b' },
    head: { tipo: 'bandana', color: '#7ed0ff', color2: '#1e2a3d' },
  }),
  makeSkin({
    id: 'pass_magma', name: 'Guardian de Magma', rarity: 'epic', price: 0, pass: true,
    desc: 'Recompensa del pase · nivel 45.',
    palette: {
      jacket: '#5a2320', pants: '#2a1512', backpack: '#ff6b2b',
      accent: 'rgba(255,140,60,0.95)', glove: '#ff6b2b', boots: '#2a1512',
    },
    style: { pattern: 'rayas', emblem: 'llama', trim: '#ff8a3d', shoulders: '#ff6b2b', glow: '#ff6b2b' },
    head: { tipo: 'cuernos', color: '#3a1a16', color2: '#ff8a3d' },
  }),
  makeSkin({
    id: 'pass_neon', name: 'Sombra de Neon', rarity: 'epic', price: 0, pass: true,
    desc: 'Recompensa del pase · nivel 60.',
    palette: {
      jacket: '#241f36', pants: '#15121f', backpack: '#00e0c0',
      accent: 'rgba(0,224,192,0.95)', glove: '#00e0c0', boots: '#15121f',
    },
    style: { pattern: 'panel', emblem: 'ojo', trim: '#00e0c0', shoulders: '#00e0c0', glow: '#00e0c0' },
    head: { tipo: 'mascara', color: '#2e2748', color2: '#00e0c0' },
  }),
  makeSkin({
    id: 'pass_arena', name: 'Nomada de Arena', rarity: 'legendary', price: 0, pass: true,
    desc: 'Recompensa del pase · nivel 75.',
    palette: {
      jacket: '#d8b473', pants: '#8a6b3f', backpack: '#5a4326',
      glove: '#8a6b3f', boots: '#5a4326', accent: 'rgba(255,240,200,0.7)',
    },
    style: { pattern: 'camo', emblem: 'luna', trim: '#8a6b3f', cape: { color: '#c8a86a', color2: '#e8d6a8' } },
    head: { tipo: 'bandana', color: '#e8d6a8', color2: '#8a6b3f' },
  }),
  makeSkin({
    id: 'pass_cosmos', name: 'Viajera del Cosmos', rarity: 'legendary', price: 0, pass: true,
    desc: 'Recompensa del pase · nivel 90.',
    palette: {
      jacket: '#3a2a6b', pants: '#1f1740', backpack: '#b39ddb',
      accent: 'rgba(200,166,255,0.95)', glove: '#b39ddb', boots: '#1f1740',
      skin: '#e8dcf0', skinShade: '#c8b8d8',
    },
    style: { pattern: 'chevron', emblem: 'estrella', trim: '#c8a6ff', shoulders: '#b39ddb', cape: { color: '#2a1f52', color2: '#7d4fd1' }, glow: '#b39ddb' },
    head: { tipo: 'astro', color: '#e8dcf0', color2: '#3a2a6b' },
  }),
  makeSkin({
    id: 'pass_eclipse', name: 'ECLIPSE', rarity: 'mythic', price: 0, pass: true,
    desc: 'La skin del nivel 100. No hay otra forma de conseguirla.',
    palette: {
      jacket: '#12101c', pants: '#0a0912', backpack: '#ffd23f',
      accent: 'rgba(255,210,63,1)', glove: '#ffd23f', boots: '#0a0912',
      skin: '#e0d4c0', skinShade: '#bfb09a',
    },
    style: { pattern: 'panel', emblem: 'luna', trim: '#ffd23f', shoulders: '#ffd23f', cape: { color: '#0a0912', color2: '#ffd23f' }, glow: '#ffd23f' },
    head: { tipo: 'corona', color: '#12101c', color2: '#ffd23f' },
  }),
  makeSkin({
    id: 'dorado', name: 'Dorado Supremo', rarity: 'mythic', price: 2500,
    desc: 'La skin que todo el mundo mira en el bus.',
    palette: {
      jacket: '#ffd23f', pants: '#8a6a12', backpack: '#fff2b0',
      glove: '#8a6a12', boots: '#6b520c', accent: 'rgba(255,255,255,0.75)',
    },
    style: { pattern: 'chevron', emblem: 'estrella', trim: '#fff2b0', shoulders: '#ffd23f', cape: { color: '#b98f10', color2: '#ffd23f' }, glow: '#ffd23f' },
    head: { tipo: 'corona', color: '#3a2a1c', color2: '#ffd23f' },
  }),

  /* =============================================================
     TANDA NUEVA
     -------------------------------------------------------------
     Catorce mas, buscando que no se parezcan entre ellas: monas,
     graciosas, duras y raras. Cada una usa alguno de los patrones y
     emblemas nuevos (escamas, circuito, pelaje, lunares, estrellado /
     corazon, hueso, engranaje, corona, pez, pizza) para que el detalle
     no sea solo "otro color de chaqueta".
     ============================================================= */

  /* ---------- Monas ---------- */
  makeSkin({
    id: 'gatita', name: 'Michi Rosa', rarity: 'uncommon', price: 350,
    desc: 'Ronronea antes de eliminarte. Cuidado con las garras.',
    palette: {
      jacket: '#ff9ec7', jacketDark: '#d96fa0', pants: '#7a4a63',
      backpack: '#ffd6e8', glove: '#ffd6e8', boots: '#7a4a63',
    },
    style: { pattern: 'lunares', emblem: 'corazon', trim: '#ffe3f0' },
    head: { tipo: 'orejas', color: '#ff9ec7', color2: '#ffd6e8' },
  }),
  makeSkin({
    id: 'panda', name: 'Panda Perezoso', rarity: 'rare', price: 700,
    desc: 'Se echa la siesta en mitad de la tormenta.',
    palette: {
      jacket: '#f4f1e8', jacketDark: '#cfcabc', pants: '#20242f',
      backpack: '#20242f', glove: '#20242f', boots: '#20242f',
    },
    style: { pattern: 'pelaje', emblem: 'corazon', trim: '#20242f', shoulders: '#20242f' },
    head: { tipo: 'orejas', color: '#20242f', color2: '#f4f1e8' },
  }),
  makeSkin({
    id: 'nube', name: 'Nubecita', rarity: 'rare', price: 780,
    desc: 'Flota mas que anda. Nadie sabe como llego aqui.',
    palette: {
      jacket: '#dff2ff', jacketDark: '#b4d8ee', pants: '#8fb8d8',
      backpack: '#ffffff', glove: '#ffffff', boots: '#8fb8d8',
      skin: '#ffeede', skinShade: '#e0c5b0',
    },
    style: { pattern: 'lunares', emblem: 'luna', trim: '#ffffff', glow: '#bfe7ff' },
    head: { tipo: 'coleta', color: '#bfe7ff', color2: '#ffffff' },
  }),

  /* ---------- Graciosas ---------- */
  makeSkin({
    id: 'pizzero', name: 'Rey de la Pizza', rarity: 'rare', price: 820,
    desc: 'Reparte en menos de 30 minutos o la partida es gratis.',
    palette: {
      jacket: '#f5c23f', jacketDark: '#c9971f', pants: '#c0562f',
      backpack: '#e8434f', glove: '#c0562f', boots: '#7a3418',
    },
    style: { pattern: 'rayas', emblem: 'pizza', trim: '#fff4d0', shoulders: '#c0562f' },
    head: { tipo: 'gorra', color: '#e8434f', color2: '#f5c23f' },
  }),
  makeSkin({
    id: 'platano', name: 'Don Platano', rarity: 'epic', price: 1300,
    desc: 'Resbaladizo, amarillo y con una seguridad en si mismo enorme.',
    palette: {
      jacket: '#ffe14f', jacketDark: '#d9b81f', pants: '#8a7a1c',
      backpack: '#6b5a10', glove: '#f0d040', boots: '#5c4d0c',
      skin: '#fff3b0', skinShade: '#e0cf7a',
    },
    style: { pattern: 'liso', emblem: 'estrella', trim: '#6b5a10', shoulders: '#c9a91f' },
    head: { tipo: 'mono', color: '#6b5a10', color2: '#ffe14f' },
  }),
  makeSkin({
    id: 'buzo', name: 'Buzo Despistado', rarity: 'uncommon', price: 420,
    desc: 'Se metio al lago a por un pez y ya no se quito el traje.',
    palette: {
      jacket: '#2f9fb8', jacketDark: '#1f7086', pants: '#1a4a5a',
      backpack: '#f5c23f', glove: '#ffb03a', boots: '#ffb03a',
    },
    style: { pattern: 'escamas', emblem: 'pez', trim: '#7fe0f0' },
    head: { tipo: 'astro', color: '#2f9fb8', color2: '#bfefff' },
  }),

  /* ---------- Fuertes ---------- */
  makeSkin({
    id: 'gladiador', name: 'Gladiador Bronce', rarity: 'epic', price: 1500,
    desc: 'Vino a por la corona y no piensa irse sin ella.',
    palette: {
      jacket: '#c98f3a', jacketDark: '#96661f', pants: '#7a2c22',
      backpack: '#5c3a14', glove: '#8a6a2a', boots: '#5c3a14',
    },
    style: {
      pattern: 'escamas', emblem: 'corona', trim: '#ffd88a',
      shoulders: '#e8b45a', cape: { color: '#7a2c22', color2: '#c9584a' },
    },
    head: { tipo: 'casco', color: '#c98f3a', color2: '#7a2c22' },
  }),
  makeSkin({
    id: 'chatarra', name: 'Chatarrero', rarity: 'rare', price: 900,
    desc: 'Hecho con lo que sobraba de la Fabrica Tornillo.',
    palette: {
      jacket: '#79879a', jacketDark: '#4a5563', pants: '#3a4149',
      backpack: '#e8a33f', glove: '#5b6874', boots: '#2f3542',
    },
    style: { pattern: 'circuito', emblem: 'engranaje', trim: '#e8a33f', shoulders: '#8d97a6' },
    head: { tipo: 'casco', color: '#5b6874', color2: '#e8a33f' },
  }),
  makeSkin({
    id: 'volcanica', name: 'Guardia del Volcan', rarity: 'legendary', price: 1900,
    desc: 'Se paseaba por el Volcan Ceniza cuando aun echaba lava.',
    palette: {
      jacket: '#3a2420', jacketDark: '#241210', pants: '#2c211f',
      backpack: '#ff7a3c', glove: '#4a2f28', boots: '#1a0f0d',
      accent: 'rgba(255, 140, 60, 0.8)',
    },
    style: {
      pattern: 'escamas', emblem: 'llama', trim: '#ff7a3c',
      shoulders: '#8a3a1c', cape: { color: '#5c1f10', color2: '#ff7a3c' }, glow: '#ff7a3c',
    },
    head: { tipo: 'casco', color: '#2c211f', color2: '#ff7a3c' },
  }),

  /* ---------- Raras ---------- */
  makeSkin({
    id: 'robot', name: 'Unidad JB-7', rarity: 'epic', price: 1450,
    desc: 'Dice que es un jugador normal. Nadie se lo cree.',
    palette: {
      jacket: '#cdd6e0', jacketDark: '#98a4b4', pants: '#4a5563',
      backpack: '#3ad6f5', glove: '#8d97a6', boots: '#3a4149',
      skin: '#b8c4d4', skinShade: '#8d9aab',
      eye: '#3ad6f5',
    },
    style: { pattern: 'circuito', emblem: 'ojo', trim: '#3ad6f5', shoulders: '#aab6c4', glow: '#3ad6f5' },
    head: { tipo: 'astro', color: '#8d97a6', color2: '#3ad6f5' },
  }),
  makeSkin({
    id: 'esqueleto', name: 'Hueso Alegre', rarity: 'epic', price: 1400,
    desc: 'Lleva muerto desde la primera partida y sigue igual de contento.',
    palette: {
      jacket: '#2a2f3f', jacketDark: '#1a1e2a', pants: '#1a1e2a',
      backpack: '#e8e4d8', glove: '#e8e4d8', boots: '#12141c',
      skin: '#e8e4d8', skinShade: '#c4bfae',
    },
    style: { pattern: 'liso', emblem: 'hueso', trim: '#e8e4d8', shoulders: '#e8e4d8' },
    head: { tipo: 'mascara', color: '#e8e4d8', color2: '#2a2f3f' },
  }),
  makeSkin({
    id: 'cosmica', name: 'Viajera Cosmica', rarity: 'legendary', price: 2100,
    desc: 'Trae el cielo de otro sitio cosido en la chaqueta.',
    palette: {
      jacket: '#241a4e', jacketDark: '#150e30', pants: '#150e30',
      backpack: '#7a4fd1', glove: '#3d2c6e', boots: '#150e30',
      accent: 'rgba(200, 170, 255, 0.7)',
      skin: '#d8c4f0', skinShade: '#b09ad0',
    },
    style: {
      pattern: 'estrellado', emblem: 'luna', trim: '#b48cff',
      shoulders: '#7a4fd1', cape: { color: '#150e30', color2: '#7a4fd1' }, glow: '#b48cff',
    },
    head: { tipo: 'melena', color: '#b48cff', color2: '#e2d0ff' },
  }),
  makeSkin({
    id: 'dragon', name: 'Cria de Dragon', rarity: 'legendary', price: 2200,
    desc: 'Todavia no echa fuego, pero lo intenta cada partida.',
    palette: {
      jacket: '#3f9a5c', jacketDark: '#26663c', pants: '#1f4a2e',
      backpack: '#ffd23f', glove: '#2f7a48', boots: '#163a22',
    },
    style: {
      pattern: 'escamas', emblem: 'llama', trim: '#9ee88a',
      shoulders: '#2f7a48', cape: { color: '#1f4a2e', color2: '#9ee88a' }, glow: '#7ce06a',
    },
    head: { tipo: 'orejas', color: '#3f9a5c', color2: '#ffd23f' },
  }),
  makeSkin({
    id: 'julen', name: 'Julen Legendario', rarity: 'mythic', price: 2800,
    desc: 'El dueno del juego. Sale en la portada y lo sabe.',
    palette: {
      jacket: '#1b2440', jacketDark: '#101733', pants: '#101733',
      backpack: '#ffd23f', glove: '#2b3a63', boots: '#0b1024',
      accent: 'rgba(255, 210, 63, 0.85)',
    },
    style: {
      pattern: 'estrellado', emblem: 'corona', trim: '#ffd23f',
      shoulders: '#ffd23f', cape: { color: '#101733', color2: '#ffd23f' }, glow: '#ffd23f',
    },
    head: { tipo: 'corona', color: '#1b2440', color2: '#ffd23f' },
  }),
];

/* =============================================================
   PICOS
   `shape` selecciona la geometria en gearSprite.js
   ============================================================= */
export const PICKAXES = [
  { type: 'pickaxe', id: 'punos', name: 'Punos de Recluta', rarity: 'common', price: 0, free: true,
    shape: 'guante', colors: { main: '#3f7fe8', dark: '#2f62b8', metal: '#c8d0dc' },
    desc: 'Gratis, contundente y siempre a mano.' },

  { type: 'pickaxe', id: 'llave', name: 'Llave Inglesa', rarity: 'common', price: 150,
    shape: 'llave', colors: { main: '#c8d0dc', dark: '#8d97a6', metal: '#e8edf4' },
    desc: 'Del taller de la isla directa a tu espalda.' },

  { type: 'pickaxe', id: 'hacha', name: 'Hacha del Lenador', rarity: 'uncommon', price: 300,
    shape: 'hacha', colors: { main: '#d9dee6', dark: '#98a1ad', metal: '#7a4b26' },
    desc: 'Los pinos de la isla la conocen bien.' },

  { type: 'pickaxe', id: 'katana', name: 'Katana Neon', rarity: 'rare', price: 600,
    shape: 'katana', colors: { main: '#18d9c8', dark: '#0e8f85', metal: '#22283d' },
    desc: 'Corta el aire con un zumbido electrico.' },

  { type: 'pickaxe', id: 'martillo', name: 'Martillo Trueno', rarity: 'rare', price: 800,
    shape: 'martillo', colors: { main: '#5aa9e6', dark: '#2f6f9e', metal: '#3b4356' },
    desc: 'Pesa el doble y suena el triple.' },

  { type: 'pickaxe', id: 'guadana', name: 'Guadana Estelar', rarity: 'epic', price: 1100,
    shape: 'guadana', colors: { main: '#c9a6ff', dark: '#7d4fd1', metal: '#2b2440' },
    desc: 'Dicen que recoge estrellas, no materiales.' },

  { type: 'pickaxe', id: 'diamante', name: 'Pico de Diamante', rarity: 'legendary', price: 1600,
    shape: 'pico', colors: { main: '#7ff0ff', dark: '#2f9fb8', metal: '#8a5c2f' },
    desc: 'Rompe la roca como si fuera hierba.' },

  { type: 'pickaxe', id: 'colmillo', name: 'Colmillo Dorado', rarity: 'mythic', price: 2400,
    shape: 'colmillo', colors: { main: '#ffd23f', dark: '#b98f10', metal: '#3a2a1c' },
    desc: 'El trofeo definitivo de la isla.' },

  /* ---------- Exclusivos del PASE DE BATALLA ---------- */
  { type: 'pickaxe', id: 'pass_remo', name: 'Remo Estelar', rarity: 'uncommon', price: 0, pass: true,
    shape: 'pala', colors: { main: '#8fa8d8', dark: '#4a5fa5', metal: '#cfe0ff' },
    desc: 'Recompensa del pase · nivel 5.' },

  { type: 'pickaxe', id: 'pass_garra', name: 'Garra del Bosque', rarity: 'rare', price: 0, pass: true,
    shape: 'hacha', colors: { main: '#5ad84a', dark: '#2f6b28', metal: '#3f2d1a' },
    desc: 'Recompensa del pase · nivel 20.' },

  { type: 'pickaxe', id: 'pass_rayo', name: 'Chispa de Tormenta', rarity: 'rare', price: 0, pass: true,
    shape: 'rayo', colors: { main: '#7ed0ff', dark: '#2f6b9e', metal: '#1e2a3d' },
    desc: 'Recompensa del pase · nivel 35.' },

  { type: 'pickaxe', id: 'pass_fundido', name: 'Hoja Fundida', rarity: 'epic', price: 0, pass: true,
    shape: 'katana', colors: { main: '#ff6b2b', dark: '#a83a10', metal: '#2a1512' },
    desc: 'Recompensa del pase · nivel 50.' },

  { type: 'pickaxe', id: 'pass_sierra', name: 'Disco de Neon', rarity: 'epic', price: 0, pass: true,
    shape: 'sierra', colors: { main: '#00e0c0', dark: '#00a08a', metal: '#241f36' },
    desc: 'Recompensa del pase · nivel 65.' },

  { type: 'pickaxe', id: 'pass_cetro', name: 'Cetro del Cosmos', rarity: 'legendary', price: 0, pass: true,
    shape: 'guadana', colors: { main: '#c8a6ff', dark: '#5a3a9e', metal: '#1f1740' },
    desc: 'Recompensa del pase · nivel 85.' },

  { type: 'pickaxe', id: 'pass_eclipse', name: 'Filo Eclipse', rarity: 'mythic', price: 0, pass: true,
    shape: 'colmillo', colors: { main: '#ffd23f', dark: '#8a6a12', metal: '#12101c' },
    desc: 'El pico del nivel 100.' },

  { type: 'pickaxe', id: 'pala', name: 'Pala de Obra', rarity: 'common', price: 120,
    shape: 'pala', colors: { main: '#c2cedc', dark: '#8d97a6', metal: '#a9763f' },
    desc: 'Prestada de la Fabrica Tornillo. No preguntes.' },

  { type: 'pickaxe', id: 'zanahoria', name: 'Zanahoria Gigante', rarity: 'common', price: 200,
    shape: 'zanahoria', colors: { main: '#ff8a3d', dark: '#c9601c', metal: '#4f9440' },
    desc: 'La broma de la isla. Pega igual de fuerte.' },

  { type: 'pickaxe', id: 'bate', name: 'Bate Estelar', rarity: 'uncommon', price: 340,
    shape: 'bate', colors: { main: '#b39ddb', dark: '#7d4fd1', metal: '#8a5c2f' },
    desc: 'Un home run por cada estructura.' },

  { type: 'pickaxe', id: 'paraguas', name: 'Paraguas Afilado', rarity: 'uncommon', price: 420,
    shape: 'paraguas', colors: { main: '#3f4a6b', dark: '#242c44', metal: '#c8d0dc' },
    desc: 'Elegante, discreto y con muy mala idea.' },

  { type: 'pickaxe', id: 'sierra', name: 'Sierra Circular', rarity: 'rare', price: 700,
    shape: 'sierra', colors: { main: '#dfe6ef', dark: '#e8a33d', metal: '#4d5666' },
    desc: 'Los pinos la oyen llegar desde lejos.' },

  { type: 'pickaxe', id: 'tridente', name: 'Tridente de la Cala', rarity: 'rare', price: 850,
    shape: 'tridente', colors: { main: '#2fc4c0', dark: '#128f8c', metal: '#c9a227' },
    desc: 'Salio del fondo del lago y ya no vuelve.' },

  { type: 'pickaxe', id: 'pincel', name: 'Pincel del Artista', rarity: 'epic', price: 1200,
    shape: 'pincel', colors: { main: '#ff6bd6', dark: '#c93aa2', metal: '#a9763f' },
    desc: 'Deja la isla mas bonita de lo que estaba.' },

  { type: 'pickaxe', id: 'rayo', name: 'Rayo Fundido', rarity: 'legendary', price: 1800,
    shape: 'rayo', colors: { main: '#ffe066', dark: '#e0a63a', metal: '#3b4356' },
    desc: 'Cayo del cielo durante una tormenta.' },
];

/* =============================================================
   PARAVELAS
   ============================================================= */
export const GLIDERS = [
  { type: 'glider', id: 'basica', name: 'Paracaidas Basico', rarity: 'common', price: 0, free: true,
    shape: 'paracaidas', colors: { main: '#e8edf4', dark: '#aab4c2', accent: '#3f7fe8' },
    desc: 'Cumple. Nada mas, pero cumple.' },

  { type: 'glider', id: 'aladelta', name: 'Ala Delta Bosque', rarity: 'uncommon', price: 250,
    shape: 'aladelta', colors: { main: '#4cbb4c', dark: '#2f8c49', accent: '#7a4b26' },
    desc: 'Del mismo verde que los pinos de abajo.' },

  { type: 'glider', id: 'sombrilla', name: 'Sombrilla Playera', rarity: 'uncommon', price: 350,
    shape: 'sombrilla', colors: { main: '#ff6b6b', dark: '#d94a4a', accent: '#ffffff' },
    desc: 'Aterrizar con estilo veraniego.' },

  { type: 'glider', id: 'murcielago', name: 'Alas de Murcielago', rarity: 'rare', price: 700,
    shape: 'murcielago', colors: { main: '#3b3350', dark: '#241f36', accent: '#b45cf0' },
    desc: 'Silenciosa y con muy mala fama.' },

  { type: 'glider', id: 'nube', name: 'Nube Arcoiris', rarity: 'epic', price: 1000,
    shape: 'nube', colors: { main: '#ffffff', dark: '#d6e4f0', accent: '#ff8ac0' },
    desc: 'Cae despacio y de muy buen humor.' },

  { type: 'glider', id: 'dragon', name: 'Dragon Celeste', rarity: 'legendary', price: 1500,
    shape: 'dragon', colors: { main: '#3aa2f5', dark: '#1d6cb0', accent: '#ffd23f' },
    desc: 'Las alas se abren con un rugido.' },

  { type: 'glider', id: 'alas', name: 'Alas Doradas', rarity: 'mythic', price: 2400,
    shape: 'alas', colors: { main: '#ffd23f', dark: '#b98f10', accent: '#fff6c8' },
    desc: 'Solo para quien ya lo tiene todo.' },

  /* ---------- Exclusivas del PASE DE BATALLA ---------- */
  { type: 'glider', id: 'pass_planeador', name: 'Planeador Cadete', rarity: 'uncommon', price: 0, pass: true,
    shape: 'aladelta', colors: { main: '#8fa8d8', dark: '#4a5fa5', accent: '#cfe0ff' },
    desc: 'Recompensa del pase · nivel 10.' },

  { type: 'glider', id: 'pass_hoja', name: 'Hoja del Centinela', rarity: 'rare', price: 0, pass: true,
    shape: 'hoja', colors: { main: '#3f6b3a', dark: '#26351f', accent: '#a8d878' },
    desc: 'Recompensa del pase · nivel 25.' },

  { type: 'glider', id: 'pass_nube', name: 'Nube de Tormenta', rarity: 'rare', price: 0, pass: true,
    shape: 'nube', colors: { main: '#4a5f7a', dark: '#2f3d52', accent: '#7ed0ff' },
    desc: 'Recompensa del pase · nivel 40.' },

  { type: 'glider', id: 'pass_fenix', name: 'Alas de Magma', rarity: 'epic', price: 0, pass: true,
    shape: 'fenix', colors: { main: '#ff6b2b', dark: '#8a2a10', accent: '#ffd23f' },
    desc: 'Recompensa del pase · nivel 55.' },

  { type: 'glider', id: 'pass_jet', name: 'Jet de Neon', rarity: 'epic', price: 0, pass: true,
    shape: 'jet', colors: { main: '#241f36', dark: '#15121f', accent: '#00e0c0' },
    desc: 'Recompensa del pase · nivel 70.' },

  { type: 'glider', id: 'pass_medusa', name: 'Medusa del Cosmos', rarity: 'legendary', price: 0, pass: true,
    shape: 'medusa', colors: { main: '#b39ddb', dark: '#5a3a9e', accent: '#ffd23f' },
    desc: 'Recompensa del pase · nivel 95.' },

  { type: 'glider', id: 'pass_eclipse', name: 'Alas Eclipse', rarity: 'mythic', price: 0, pass: true,
    shape: 'alas', colors: { main: '#ffd23f', dark: '#12101c', accent: '#fff6c8' },
    desc: 'La paravela del nivel 100.' },

  { type: 'glider', id: 'cometa', name: 'Cometa de Papel', rarity: 'common', price: 150,
    shape: 'cometa', colors: { main: '#ffd23f', dark: '#e0a63a', accent: '#c8392b' },
    desc: 'Ligera, ruidosa y sorprendentemente fiable.' },

  { type: 'glider', id: 'hoja', name: 'Hoja Gigante', rarity: 'uncommon', price: 280,
    shape: 'hoja', colors: { main: '#5ad84a', dark: '#2f8c49', accent: '#7a4b26' },
    desc: 'Cae dando vueltas, como en otono.' },

  { type: 'glider', id: 'pizza', name: 'Pizza Voladora', rarity: 'uncommon', price: 400,
    shape: 'pizza', colors: { main: '#ffcf6b', dark: '#c98a3a', accent: '#c8392b' },
    desc: 'Llega caliente al aterrizar.' },

  { type: 'glider', id: 'globo', name: 'Globo del Pinar', rarity: 'rare', price: 650,
    shape: 'globo', colors: { main: '#ff6b6b', dark: '#d94a4a', accent: '#3f7fe8' },
    desc: 'La bajada mas tranquila de la isla.' },

  { type: 'glider', id: 'medusa', name: 'Medusa Flotante', rarity: 'rare', price: 800,
    shape: 'medusa', colors: { main: '#a9e4ff', dark: '#5f9fc4', accent: '#c9a6ff' },
    desc: 'Sube y baja como si el aire fuera agua.' },

  { type: 'glider', id: 'calavera', name: 'Bandera Corsaria', rarity: 'epic', price: 1100,
    shape: 'calavera', colors: { main: '#2a2430', dark: '#15121c', accent: '#e8edf4' },
    desc: 'Se ve venir desde la otra punta del mapa.' },

  { type: 'glider', id: 'jet', name: 'Ala Jet', rarity: 'legendary', price: 1600,
    shape: 'jet', colors: { main: '#c2cedc', dark: '#4d5666', accent: '#ff8a3d' },
    desc: 'Dos turbinas para llegar el primero.' },

  { type: 'glider', id: 'fenix', name: 'Alas de Fenix', rarity: 'mythic', price: 2600,
    shape: 'fenix', colors: { main: '#ff8a3d', dark: '#c8392b', accent: '#ffe066' },
    desc: 'Arde durante toda la caida y no se apaga.' },
];

/* =============================================================
   ORDEN DE ESCAPARATE
   -------------------------------------------------------------
   Las listas se muestran tal cual en la tienda y en la taquilla, asi
   que se ordenan aqui una sola vez: de menos a mas raro y, dentro de
   cada rareza, de mas barato a mas caro. Anadir un cosmetico nuevo al
   final del array de arriba lo coloca solo en su sitio.
   ============================================================= */

function porRarezaYPrecio(a, b) {
  const d = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
  return d !== 0 ? d : a.price - b.price;
}

for (const lista of [SKINS, PICKAXES, GLIDERS]) lista.sort(porRarezaYPrecio);

/* =============================================================
   ACCESO UNIFICADO
   ============================================================= */

/** Las tres categorias, con su etiqueta para la interfaz. */
export const CATEGORIES = [
  { key: 'skin',    label: 'Skins',     plural: 'skins',     list: SKINS },
  { key: 'pickaxe', label: 'Picos',     plural: 'pickaxes',  list: PICKAXES },
  { key: 'glider',  label: 'Paravelas', plural: 'gliders',   list: GLIDERS },
  // Los EMOTES son una categoria mas: asi la tienda, la taquilla, las
  // pestanas, los contadores y las vistas previas los tratan igual que a
  // una skin, sin un camino aparte que mantener.
  { key: 'emote',   label: 'Emotes',    plural: 'emotes',    list: EMOTES },
];

/** Objetos que el jugador tiene desde el principio (gratuitos). */
export const DEFAULT_EQUIPPED = {
  skin: 'recluta',
  pickaxe: 'punos',
  glider: 'basica',
};

/** Busca un cosmetico por categoria e id. Devuelve undefined si no existe. */
export function findCosmetic(category, id) {
  const cat = CATEGORIES.find((c) => c.key === category);
  return cat ? cat.list.find((item) => item.id === id) : undefined;
}

/** Devuelve la lista completa de una categoria. */
export function listCosmetics(category) {
  const cat = CATEGORIES.find((c) => c.key === category);
  return cat ? cat.list : [];
}
