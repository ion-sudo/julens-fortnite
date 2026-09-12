/**
 * props.js
 * ---------------------------------------------------------------
 * DECORADO de los 10 sitios. Cada bioma tiene sus propios elementos,
 * y es lo que hace que se reconozca de un vistazo donde estas:
 *
 *   bosque   pinos, arbustos, rocas
 *   playa    palmeras, sombrillas, conchas
 *   pueblo   farolas, vallas, arbustos
 *   nevada   abetos nevados, rocas con nieve, munecos de nieve
 *   fabrica  barriles, tuberias, cajas metalicas
 *   mansion  setos recortados, fuentes, estatuas
 *   desierto cactus, craneos, matorrales rodantes
 *   muelle   gruas, contenedores, bolardos, redes de pesca
 *   feria    norias, carpas de rayas, globos, taquillas
 *   volcan   roca con lava, fumarolas, arboles quemados, obsidiana
 *
 * Todos se dibujan con el origen en la BASE (los pies del objeto), en
 * coordenadas de mundo.
 */

import { PALETTE } from '../core/config.js';
import { fillRoundRect } from '../core/utils.js';

/** Punto de entrada: reparte segun el tipo del prop. */
export function drawProp(ctx, prop, time = 0) {
  // Un arbol talado ya no esta.
  if (prop.chopped) return;

  ctx.save();
  ctx.translate(prop.x, prop.y);

  // Mientras se pica: se tambalea con cada golpe y se va inclinando,
  // para que se vea que esta a punto de caer.
  if (prop.chopProgress > 0) {
    const temblor = (prop.shake || 0) * Math.sin(time * 40) * 0.06;
    ctx.rotate(temblor + prop.chopProgress * 0.16);
  }

  ctx.scale(prop.scale, prop.scale);

  switch (prop.type) {
    case 'pino':      drawPino(ctx, prop); break;
    case 'abeto':     drawAbeto(ctx, prop); break;
    case 'palmera':   drawPalmera(ctx, prop, time); break;
    case 'cactus':    drawCactus(ctx, prop); break;
    case 'arbusto':   drawArbusto(ctx, prop); break;
    case 'seto':      drawSeto(ctx, prop); break;
    case 'roca':      drawRoca(ctx, prop, '#9aa4ae', '#c3ccd4'); break;
    case 'rocaNieve': drawRoca(ctx, prop, '#8fa3b8', '#ffffff'); break;
    case 'sombrilla': drawSombrilla(ctx, prop); break;
    case 'concha':    drawConcha(ctx, prop); break;
    case 'farola':    drawFarola(ctx, prop); break;
    case 'valla':     drawValla(ctx, prop); break;
    case 'barril':    drawBarril(ctx, prop); break;
    case 'tuberia':   drawTuberia(ctx, prop); break;
    case 'cajaMetal': drawCajaMetal(ctx, prop); break;
    case 'fuente':    drawFuente(ctx, prop, time); break;
    case 'estatua':   drawEstatua(ctx, prop); break;
    case 'craneo':    drawCraneo(ctx, prop); break;
    case 'rodante':   drawRodante(ctx, prop, time); break;
    case 'munieco':   drawMunieco(ctx, prop); break;
    case 'grua':      drawGrua(ctx, prop); break;
    case 'contenedor': drawContenedor(ctx, prop); break;
    case 'bolardo':   drawBolardo(ctx, prop); break;
    case 'redes':     drawRedes(ctx, prop); break;
    case 'noria':     drawNoria(ctx, prop, time); break;
    case 'carpa':     drawCarpa(ctx, prop); break;
    case 'globos':    drawGlobos(ctx, prop, time); break;
    case 'taquilla':  drawTaquilla(ctx, prop); break;
    case 'rocaLava':  drawRocaLava(ctx, prop, time); break;
    case 'fumarola':  drawFumarola(ctx, prop, time); break;
    case 'arbolQuemado': drawArbolQuemado(ctx, prop); break;
    case 'cristal':   drawCristal(ctx, prop); break;
    default:          drawArbusto(ctx, prop);
  }

  ctx.restore();
}

/** Sombra ovalada en el suelo, comun a casi todo. */
function sombra(ctx, ancho = 26, alpha = 0.14) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 1, ancho, ancho * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* =============================================================
   BOSQUE
   ============================================================= */

const PINE_TINTS = [
  { light: PALETTE.pineLight, mid: PALETTE.pineMid, dark: PALETTE.pineDark },
  { light: '#57bd6a', mid: '#3d9a55', dark: '#2b7440' },
  { light: '#79c95d', mid: '#57a848', dark: '#3f8036' },
];

function drawPino(ctx, prop) {
  const tint = PINE_TINTS[prop.variant % PINE_TINTS.length];
  sombra(ctx, 34);

  ctx.fillStyle = PALETTE.trunk;
  fillRoundRect(ctx, -9, -66, 18, 68, 4, PALETTE.trunk);
  ctx.fillStyle = PALETTE.trunkDark;
  ctx.fillRect(-9, -66, 6, 68);

  let y = -58;
  let halfW = 52;
  let hStep = 46;
  const capas = 3 + (prop.variant % 2);

  for (let i = 0; i < capas; i++) {
    ctx.fillStyle = i % 2 === 0 ? tint.mid : tint.light;
    ctx.beginPath();
    ctx.moveTo(0, y - hStep - 14);
    ctx.lineTo(halfW, y);
    ctx.quadraticCurveTo(0, y + 10, -halfW, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = tint.dark;
    ctx.beginPath();
    ctx.moveTo(0, y - hStep - 14);
    ctx.lineTo(-halfW, y);
    ctx.quadraticCurveTo(-halfW * 0.4, y + 6, 0, y + 4);
    ctx.closePath();
    ctx.fill();

    y -= hStep;
    halfW *= 0.76;
    hStep *= 0.86;
  }
}

function drawArbusto(ctx, prop) {
  sombra(ctx, 26, 0.12);
  ctx.fillStyle = PALETTE.pineMid;
  ctx.beginPath();
  ctx.arc(-13, -10, 14, 0, Math.PI * 2);
  ctx.arc(13, -9, 13, 0, Math.PI * 2);
  ctx.arc(0, -18, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.pineLight;
  ctx.beginPath();
  ctx.arc(2, -22, 11, 0, Math.PI * 2);
  ctx.arc(-11, -15, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawRoca(ctx, prop, base, brillo) {
  sombra(ctx, 20, 0.12);
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(-11, -15);
  ctx.lineTo(3, -20);
  ctx.lineTo(16, -10);
  ctx.lineTo(18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = brillo;
  ctx.beginPath();
  ctx.moveTo(-11, -15);
  ctx.lineTo(3, -20);
  ctx.lineTo(6, -12);
  ctx.lineTo(-6, -9);
  ctx.closePath();
  ctx.fill();
}

/* =============================================================
   NEVADA
   ============================================================= */

function drawAbeto(ctx, prop) {
  sombra(ctx, 32, 0.10);

  ctx.fillStyle = '#5e4630';
  fillRoundRect(ctx, -7, -54, 14, 56, 3, '#5e4630');

  let y = -48;
  let halfW = 44;
  let hStep = 42;

  for (let i = 0; i < 4; i++) {
    // Follaje oscuro
    ctx.fillStyle = i % 2 === 0 ? '#2c6b4e' : '#357a58';
    ctx.beginPath();
    ctx.moveTo(0, y - hStep - 12);
    ctx.lineTo(halfW, y);
    ctx.quadraticCurveTo(0, y + 8, -halfW, y);
    ctx.closePath();
    ctx.fill();

    // Nieve encima de cada faldon
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, y - hStep - 12);
    ctx.lineTo(halfW * 0.62, y - hStep * 0.32);
    ctx.quadraticCurveTo(0, y - hStep * 0.1, -halfW * 0.62, y - hStep * 0.32);
    ctx.closePath();
    ctx.fill();

    y -= hStep;
    halfW *= 0.76;
    hStep *= 0.86;
  }
}

function drawMunieco(ctx, prop) {
  sombra(ctx, 24, 0.12);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -14, 15, 0, Math.PI * 2);
  ctx.arc(0, -35, 11, 0, Math.PI * 2);
  ctx.fill();
  // Botones y ojos
  ctx.fillStyle = '#2f3542';
  for (const [bx, by, r] of [[0, -16, 2], [0, -9, 2], [-4, -37, 1.6], [4, -37, 1.6]]) {
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
  }
  // Zanahoria
  ctx.fillStyle = '#f5822b';
  ctx.beginPath();
  ctx.moveTo(4, -34); ctx.lineTo(15, -32); ctx.lineTo(4, -30);
  ctx.closePath(); ctx.fill();
  // Ramas
  ctx.strokeStyle = '#6b4522';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-13, -18); ctx.lineTo(-26, -26);
  ctx.moveTo(13, -18); ctx.lineTo(26, -26);
  ctx.stroke();
}

/* =============================================================
   PLAYA
   ============================================================= */

function drawPalmera(ctx, prop, time) {
  sombra(ctx, 30, 0.13);

  // Tronco curvado
  ctx.strokeStyle = '#a9763f';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -45, 20, -84);
  ctx.stroke();
  ctx.strokeStyle = '#8a5c2f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-2, -4);
  ctx.quadraticCurveTo(4, -45, 17, -82);
  ctx.stroke();

  // Hojas
  const balanceo = Math.sin(time * 1.1 + prop.x * 0.01) * 0.08;
  ctx.save();
  ctx.translate(20, -84);
  ctx.rotate(balanceo);
  for (const [ang, largo] of [[-2.5, 44], [-1.9, 50], [-1.1, 46], [-0.4, 40], [0.4, 34]]) {
    ctx.fillStyle = ang < -1.5 ? '#2f8c49' : '#4cbb4c';
    ctx.save();
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(largo * 0.6, -13, largo, 2);
    ctx.quadraticCurveTo(largo * 0.6, 5, 0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Cocos
  ctx.fillStyle = '#6b4522';
  ctx.beginPath();
  ctx.arc(-4, 6, 5, 0, Math.PI * 2);
  ctx.arc(5, 8, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSombrilla(ctx, prop) {
  sombra(ctx, 22, 0.12);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-4, -52);
  ctx.stroke();

  ctx.save();
  ctx.translate(-4, -52);
  const gajos = 6;
  for (let i = 0; i < gajos; i++) {
    const a0 = Math.PI + (Math.PI / gajos) * i;
    ctx.fillStyle = i % 2 === 0 ? '#e05a4a' : '#f4efe4';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 34, a0, a0 + Math.PI / gajos);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawConcha(ctx, prop) {
  ctx.fillStyle = '#f6e2d0';
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.quadraticCurveTo(-9, -15, 0, -15);
  ctx.quadraticCurveTo(9, -15, 11, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#dcbfa6';
  ctx.lineWidth = 1.4;
  for (const dx of [-5, 0, 5]) {
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(dx, 0);
    ctx.stroke();
  }
}

/* =============================================================
   PUEBLO
   ============================================================= */

function drawFarola(ctx, prop) {
  sombra(ctx, 16, 0.14);
  ctx.fillStyle = '#3b4453';
  fillRoundRect(ctx, -4, -74, 8, 76, 3, '#3b4453');
  ctx.fillStyle = '#2b3240';
  fillRoundRect(ctx, -10, -6, 20, 8, 3, '#2b3240');

  // Brazo y farol
  ctx.strokeStyle = '#3b4453';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -74);
  ctx.quadraticCurveTo(0, -86, 16, -86);
  ctx.stroke();

  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.moveTo(8, -84); ctx.lineTo(24, -84); ctx.lineTo(20, -72); ctx.lineTo(12, -72);
  ctx.closePath(); ctx.fill();

  // Halo de luz
  const g = ctx.createRadialGradient(16, -78, 2, 16, -78, 34);
  g.addColorStop(0, 'rgba(255, 233, 168, 0.42)');
  g.addColorStop(1, 'rgba(255, 233, 168, 0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(16, -78, 34, 0, Math.PI * 2); ctx.fill();
}

function drawValla(ctx, prop) {
  ctx.fillStyle = '#f4efe4';
  for (const dx of [-22, -6, 10, 26]) {
    ctx.beginPath();
    ctx.moveTo(dx - 4, 0);
    ctx.lineTo(dx - 4, -26);
    ctx.lineTo(dx, -32);
    ctx.lineTo(dx + 4, -26);
    ctx.lineTo(dx + 4, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#e0d8c8';
  ctx.fillRect(-28, -22, 60, 5);
  ctx.fillRect(-28, -12, 60, 5);
}

/* =============================================================
   FABRICA
   ============================================================= */

function drawBarril(ctx, prop) {
  sombra(ctx, 18, 0.14);
  const colores = ['#c0562f', '#4a7fae', '#6f7d5a'];
  const c = colores[prop.variant % colores.length];

  ctx.fillStyle = c;
  fillRoundRect(ctx, -14, -38, 28, 38, 4, c);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(-14, -30, 28, 5);
  ctx.fillRect(-14, -14, 28, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.fillRect(-11, -36, 5, 34);
  ctx.fillStyle = '#2f3542';
  ctx.beginPath();
  ctx.ellipse(0, -38, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTuberia(ctx, prop) {
  sombra(ctx, 22, 0.13);
  ctx.strokeStyle = '#8d9aa6';
  ctx.lineWidth = 13;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(-24, -8);
  ctx.lineTo(6, -8);
  ctx.quadraticCurveTo(20, -8, 20, -24);
  ctx.lineTo(20, -46);
  ctx.stroke();

  ctx.strokeStyle = '#6f7d8a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-24, -12); ctx.lineTo(4, -12);
  ctx.stroke();

  // Bridas
  ctx.fillStyle = '#5b6874';
  ctx.fillRect(-26, -16, 5, 16);
  ctx.fillRect(14, -50, 12, 5);
}

function drawCajaMetal(ctx, prop) {
  sombra(ctx, 20, 0.14);
  ctx.fillStyle = '#79879a';
  fillRoundRect(ctx, -18, -32, 36, 32, 3, '#79879a');
  ctx.fillStyle = '#5b6874';
  ctx.fillRect(-18, -32, 36, 6);
  ctx.strokeStyle = '#4a5563';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-18, -18); ctx.lineTo(18, -18);
  ctx.moveTo(0, -32); ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = '#f5b942';
  ctx.fillRect(-14, -14, 8, 4);
}

/* =============================================================
   MANSION
   ============================================================= */

function drawSeto(ctx, prop) {
  sombra(ctx, 26, 0.12);
  // Seto recortado en forma de cono
  ctx.fillStyle = '#3f9a48';
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.quadraticCurveTo(-16, -46, 0, -56);
  ctx.quadraticCurveTo(16, -46, 20, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#57bd57';
  ctx.beginPath();
  ctx.moveTo(-4, -2);
  ctx.quadraticCurveTo(-8, -44, 2, -54);
  ctx.quadraticCurveTo(10, -44, 12, -2);
  ctx.closePath();
  ctx.fill();
  // Maceta
  ctx.fillStyle = '#b06a3f';
  fillRoundRect(ctx, -16, -10, 32, 12, 3, '#b06a3f');
}

function drawFuente(ctx, prop, time) {
  sombra(ctx, 34, 0.14);
  ctx.fillStyle = '#d8d3c4';
  fillRoundRect(ctx, -32, -18, 64, 18, 5, '#d8d3c4');
  ctx.fillStyle = '#7fd0ff';
  fillRoundRect(ctx, -27, -14, 54, 8, 3, '#7fd0ff');
  ctx.fillStyle = '#c4bfb0';
  fillRoundRect(ctx, -7, -44, 14, 30, 3, '#c4bfb0');
  ctx.beginPath();
  ctx.ellipse(0, -46, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Chorros
  ctx.strokeStyle = 'rgba(160, 220, 255, 0.8)';
  ctx.lineWidth = 3;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.quadraticCurveTo(dir * 16, -60 + Math.sin(time * 3) * 2, dir * 22, -16);
    ctx.stroke();
  }
}

function drawEstatua(ctx, prop) {
  sombra(ctx, 22, 0.14);
  ctx.fillStyle = '#cfc9b8';
  fillRoundRect(ctx, -16, -14, 32, 14, 3, '#cfc9b8');
  ctx.fillStyle = '#e0dbcc';
  fillRoundRect(ctx, -9, -52, 18, 40, 4, '#e0dbcc');
  ctx.beginPath();
  ctx.arc(0, -60, 10, 0, Math.PI * 2);
  ctx.fill();
  // Brazo levantado
  ctx.strokeStyle = '#e0dbcc';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(6, -46); ctx.lineTo(20, -64);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  fillRoundRect(ctx, -9, -52, 6, 40, 3, 'rgba(0,0,0,0.12)');
}

/* =============================================================
   DESIERTO
   ============================================================= */

function drawCactus(ctx, prop) {
  sombra(ctx, 22, 0.13);
  const verde = '#4a9a5c';
  const oscuro = '#37784a';

  ctx.fillStyle = verde;
  fillRoundRect(ctx, -11, -76, 22, 78, 10, verde);
  ctx.fillStyle = oscuro;
  fillRoundRect(ctx, -11, -76, 7, 78, 10, oscuro);

  // Brazos
  ctx.fillStyle = verde;
  fillRoundRect(ctx, 8, -58, 20, 11, 6, verde);
  fillRoundRect(ctx, 18, -74, 11, 22, 6, verde);
  if (prop.variant % 2 === 0) {
    fillRoundRect(ctx, -28, -48, 20, 11, 6, verde);
    fillRoundRect(ctx, -29, -62, 11, 20, 6, verde);
  }

  // Espinas
  ctx.strokeStyle = '#e8dfae';
  ctx.lineWidth = 1.4;
  for (let y = -68; y < -8; y += 12) {
    ctx.beginPath();
    ctx.moveTo(-3, y); ctx.lineTo(3, y);
    ctx.stroke();
  }
}

function drawCraneo(ctx, prop) {
  ctx.fillStyle = '#efe6d2';
  ctx.beginPath();
  ctx.ellipse(0, -10, 13, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, -3); ctx.lineTo(6, -3); ctx.lineTo(3, 2); ctx.lineTo(-3, 2);
  ctx.closePath(); ctx.fill();
  // Cuernos
  ctx.strokeStyle = '#efe6d2';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-11, -16); ctx.quadraticCurveTo(-24, -20, -22, -8);
  ctx.moveTo(11, -16); ctx.quadraticCurveTo(24, -20, 22, -8);
  ctx.stroke();
  // Ojos
  ctx.fillStyle = '#7c6a4a';
  ctx.beginPath();
  ctx.arc(-5, -11, 3, 0, Math.PI * 2);
  ctx.arc(5, -11, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawRodante(ctx, prop, time) {
  const giro = Math.sin(time * 0.8 + prop.x * 0.02) * 0.25;
  ctx.save();
  ctx.translate(0, -16);
  ctx.rotate(giro);
  ctx.strokeStyle = '#b08c52';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 15);
    ctx.lineTo(Math.cos(a + 2.2) * 15, Math.sin(a + 2.2) * 15);
    ctx.stroke();
  }
  ctx.strokeStyle = '#8f7040';
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}


/* =============================================================
   MUELLE (Puerto Ancla)
   ============================================================= */

/** Grua de contenedores: lo mas alto del puerto, se ve desde lejos. */
function drawGrua(ctx, prop) {
  sombra(ctx, 34, 0.15);

  // Patas en A
  ctx.strokeStyle = '#e8a33f';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-22, 0); ctx.lineTo(-8, -96);
  ctx.moveTo(22, 0); ctx.lineTo(8, -96);
  ctx.stroke();

  // Travesanos de la celosia
  ctx.strokeStyle = '#c4832a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let y = -18; y > -92; y -= 24) {
    const t = (-y) / 96;
    const half = 22 - 14 * t;
    ctx.moveTo(-half, y); ctx.lineTo(half, y);
  }
  ctx.stroke();

  // Brazo horizontal, en voladizo hacia el mar
  ctx.fillStyle = '#e8a33f';
  ctx.fillRect(-16, -106, 68, 10);
  ctx.fillStyle = '#c4832a';
  ctx.fillRect(-16, -98, 68, 3);

  // Contrapeso al otro lado
  ctx.fillStyle = '#5b6874';
  ctx.fillRect(-34, -110, 20, 18);

  // Cable y gancho colgando
  ctx.strokeStyle = '#2f3542';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(38, -96); ctx.lineTo(38, -58);
  ctx.stroke();
  ctx.fillStyle = '#8d97a6';
  ctx.fillRect(33, -58, 10, 7);
}

/** Contenedor de barco, apilable segun la variante. */
function drawContenedor(ctx, prop) {
  sombra(ctx, 26, 0.15);
  const colores = ['#c0562f', '#3f7fe8', '#4a9a5c'];
  const c = colores[prop.variant % colores.length];
  const pisos = 1 + (prop.variant % 2);   // uno o dos, apilados

  for (let i = 0; i < pisos; i++) {
    const y = -32 - i * 32;
    // El de arriba va un poco desplazado: apilado a ojo, no con regla.
    const dx = i === 0 ? 0 : 5;

    ctx.fillStyle = c;
    ctx.fillRect(-24 + dx, y, 48, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(-24 + dx, y, 48, 4);

    // Nervios verticales de la chapa
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = -18; x < 24; x += 8) {
      ctx.moveTo(x + dx, y + 5); ctx.lineTo(x + dx, y + 30);
    }
    ctx.stroke();

    // Esquineras
    ctx.fillStyle = '#3a4149';
    ctx.fillRect(-24 + dx, y, 5, 5);
    ctx.fillRect(19 + dx, y, 5, 5);
  }
}

/** Bolardo de amarre con su cabo. */
function drawBolardo(ctx, prop) {
  sombra(ctx, 15, 0.14);

  ctx.fillStyle = '#4a5563';
  fillRoundRect(ctx, -8, -24, 16, 24, 3, '#4a5563');
  ctx.fillStyle = '#6f7d8a';
  ctx.beginPath();
  ctx.ellipse(0, -24, 11, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(-6, -22, 4, 20);

  // Cabo que cae al suelo
  ctx.strokeStyle = '#c9b184';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.quadraticCurveTo(20, -6, 34, -1);
  ctx.stroke();
}

/** Red de pesca tendida entre dos palos (de aqui sale madera). */
function drawRedes(ctx, prop) {
  sombra(ctx, 24, 0.12);

  ctx.strokeStyle = '#8a6238';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-20, 0); ctx.lineTo(-18, -52);
  ctx.moveTo(20, 0); ctx.lineTo(18, -44);
  ctx.stroke();

  // La malla: dos familias de lineas cruzadas, colgando en curva
  ctx.strokeStyle = 'rgba(226, 216, 186, 0.75)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const x = -18 + t * 36;
    ctx.moveTo(x, -52 + t * 8);
    ctx.lineTo(x, -14 + t * 4);
  }
  for (let i = 0; i <= 4; i++) {
    const y = -48 + i * 9;
    ctx.moveTo(-18, y);
    ctx.quadraticCurveTo(0, y + 7, 18, y + 4);
  }
  ctx.stroke();

  // Flotadores
  ctx.fillStyle = '#e8434f';
  for (const x of [-10, 4, 15]) {
    ctx.beginPath();
    ctx.arc(x, -13, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* =============================================================
   FERIA (Feria Fortuna)
   ============================================================= */

/** Noria. Gira despacio: es lo que le da vida a la zona. */
function drawNoria(ctx, prop, time) {
  sombra(ctx, 40, 0.16);

  const R = 58;
  const cy = -92;

  // Patas
  ctx.strokeStyle = '#7a8494';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-26, 0); ctx.lineTo(0, cy);
  ctx.moveTo(26, 0); ctx.lineTo(0, cy);
  ctx.stroke();

  const giro = time * 0.35 + prop.variant;

  // Rueda
  ctx.strokeStyle = '#e8d6a8';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // Radios
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = giro + (i * Math.PI) / 4;
    ctx.moveTo(0, cy);
    ctx.lineTo(Math.cos(a) * R, cy + Math.sin(a) * R);
  }
  ctx.stroke();

  // Cabinas: cuelgan del aro, siempre miran hacia abajo
  const cabinas = ['#e8434f', '#3f8fe8', '#ffd23f', '#5fd14a'];
  for (let i = 0; i < 8; i++) {
    const a = giro + (i * Math.PI) / 4;
    const x = Math.cos(a) * R;
    const y = cy + Math.sin(a) * R;
    ctx.fillStyle = cabinas[i % cabinas.length];
    fillRoundRect(ctx, x - 6, y + 2, 12, 10, 3, cabinas[i % cabinas.length]);
  }

  // Buje
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(0, cy, 6, 0, Math.PI * 2);
  ctx.fill();
}

/** Carpa de rayas (de aqui sale madera: los palos). */
function drawCarpa(ctx, prop) {
  sombra(ctx, 34, 0.14);

  const pares = [['#e8434f', '#fff4f4'], ['#3f8fe8', '#f2f8ff'], ['#7a4fd1', '#f6f0ff']];
  const [a, b] = pares[prop.variant % pares.length];

  // Faldon de rayas, en abanico desde la punta
  const R = 40;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? a : b;
    const a0 = Math.PI + (i * Math.PI) / 8;
    const a1 = Math.PI + ((i + 1) * Math.PI) / 8;
    ctx.beginPath();
    ctx.moveTo(0, -64);
    ctx.lineTo(Math.cos(a0) * R, -18 + Math.sin(a0) * 6);
    ctx.lineTo(Math.cos(a1) * R, -18 + Math.sin(a1) * 6);
    ctx.closePath();
    ctx.fill();
  }

  // Entrada: opaca a proposito. Con transparencia se veian las rayas
  // por debajo y parecia una roca delante de la carpa, no una puerta.
  ctx.fillStyle = '#2b2038';
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(-9, -26);
  ctx.quadraticCurveTo(0, -32, 9, -26);
  ctx.lineTo(11, 0);
  ctx.closePath();
  ctx.fill();

  // Mastil y banderin
  ctx.strokeStyle = '#8a6238';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -62); ctx.lineTo(0, -80);
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(0, -80); ctx.lineTo(16, -74); ctx.lineTo(0, -68);
  ctx.closePath();
  ctx.fill();
}

/** Ramo de globos atado a un poste. */
function drawGlobos(ctx, prop, time) {
  sombra(ctx, 12, 0.10);

  ctx.fillStyle = '#6d4f92';
  ctx.fillRect(-3, -20, 6, 20);

  const colores = ['#e8434f', '#ffd23f', '#3f8fe8', '#5fd14a', '#ff7ac0'];
  const vaiven = Math.sin(time * 1.4 + prop.x * 0.01) * 3;

  for (let i = 0; i < 5; i++) {
    const bx = (i - 2) * 9 + vaiven * (0.4 + i * 0.12);
    const by = -46 - Math.abs(i - 2) * -4 - 8;

    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(bx * 0.5, -34, bx, by + 9);
    ctx.stroke();

    ctx.fillStyle = colores[(i + prop.variant) % colores.length];
    ctx.beginPath();
    ctx.ellipse(bx, by, 7, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(bx - 2.4, by - 3, 2.2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Taquilla de tickets, con su toldo de rayas. */
function drawTaquilla(ctx, prop) {
  sombra(ctx, 22, 0.14);

  ctx.fillStyle = '#f6f0ff';
  fillRoundRect(ctx, -20, -46, 40, 46, 3, '#f6f0ff');
  ctx.fillStyle = '#d8cce8';
  ctx.fillRect(-20, -10, 40, 10);

  // Ventanilla
  ctx.fillStyle = '#2b2340';
  fillRoundRect(ctx, -13, -38, 26, 17, 2, '#2b2340');
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-13, -38, 26, 5);

  // Toldo de rayas
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#e8434f' : '#fff4f4';
    ctx.beginPath();
    ctx.moveTo(-24 + i * 8, -46);
    ctx.lineTo(-24 + (i + 1) * 8, -46);
    ctx.lineTo(-24 + (i + 1) * 8, -54);
    ctx.lineTo(-24 + i * 8, -54);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-24, -58, 48, 5);
}

/* =============================================================
   VOLCAN (Volcan Ceniza)
   ============================================================= */

/** Roca de basalto con lava en las grietas: late despacio. */
function drawRocaLava(ctx, prop, time) {
  sombra(ctx, 22, 0.20);

  ctx.fillStyle = '#2c211f';
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(-15, -20);
  ctx.lineTo(-3, -28);
  ctx.lineTo(12, -22);
  ctx.lineTo(20, -6);
  ctx.lineTo(19, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#42332f';
  ctx.beginPath();
  ctx.moveTo(-15, -20);
  ctx.lineTo(-3, -28);
  ctx.lineTo(4, -18);
  ctx.lineTo(-10, -12);
  ctx.closePath();
  ctx.fill();

  // Grietas: el brillo sube y baja, como una brasa
  const latido = 0.55 + 0.45 * Math.sin(time * 1.6 + prop.x * 0.02);
  ctx.strokeStyle = `rgba(255, 122, 60, ${0.5 + latido * 0.5})`;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, -3); ctx.lineTo(-4, -13); ctx.lineTo(3, -9); ctx.lineTo(11, -16);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255, 226, 120, ${0.35 * latido})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Fumarola: una grieta en el suelo echando humo. */
function drawFumarola(ctx, prop, time) {
  // Boca de la grieta
  ctx.fillStyle = '#1a0f0d';
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 140, 60, ${0.45 + 0.25 * Math.sin(time * 2.2 + prop.x)})`;
  ctx.beginPath();
  ctx.ellipse(0, -1, 11, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Columna de humo: cuanto mas sube, mas grande y mas transparente
  for (let i = 0; i < 5; i++) {
    const t = ((time * 16 + i * 15 + prop.x * 0.4) % 75) / 75;
    const y = -6 - t * 66;
    const r = 5 + t * 13;
    ctx.fillStyle = `rgba(190, 175, 168, ${0.34 * (1 - t)})`;
    ctx.beginPath();
    ctx.arc(Math.sin(t * 5 + i) * 7, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Arbol quemado, sin una sola hoja (de aqui sale la madera). */
function drawArbolQuemado(ctx, prop) {
  sombra(ctx, 24, 0.18);

  ctx.strokeStyle = '#231a18';
  ctx.lineCap = 'round';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-4, -34, 2, -62);
  ctx.stroke();

  // Ramas peladas, alternas
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-1, -30); ctx.quadraticCurveTo(-18, -40, -26, -56);
  ctx.moveTo(1, -44); ctx.quadraticCurveTo(16, -52, 24, -70);
  ctx.moveTo(2, -58); ctx.quadraticCurveTo(-6, -70, -14, -78);
  ctx.stroke();

  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-24, -54); ctx.lineTo(-32, -66);
  ctx.moveTo(22, -66); ctx.lineTo(30, -78);
  ctx.stroke();

  // Ceniza al pie
  ctx.fillStyle = 'rgba(120, 110, 105, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 17, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Aguja de obsidiana. */
function drawCristal(ctx, prop) {
  sombra(ctx, 15, 0.16);

  const alto = 34 + (prop.variant % 3) * 9;

  ctx.fillStyle = '#241a2e';
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.lineTo(-4, -alto);
  ctx.lineTo(6, -alto * 0.86);
  ctx.lineTo(10, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#3d2c4e';
  ctx.beginPath();
  ctx.moveTo(-4, -alto);
  ctx.lineTo(6, -alto * 0.86);
  ctx.lineTo(2, 0);
  ctx.lineTo(-1, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 150, 90, 0.30)';
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.lineTo(-4.5, -alto * 0.9);
  ctx.lineTo(-2, -alto * 0.88);
  ctx.lineTo(-4, -4);
  ctx.closePath();
  ctx.fill();

  // Esquirlas sueltas al pie
  ctx.fillStyle = '#241a2e';
  ctx.beginPath();
  ctx.moveTo(12, 0); ctx.lineTo(16, -9); ctx.lineTo(20, 0);
  ctx.closePath();
  ctx.fill();
}
