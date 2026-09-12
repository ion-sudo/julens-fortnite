/**
 * gearSprite.js
 * ---------------------------------------------------------------
 * DIBUJO de PICOS y PARAVELAS, tambien vectorial.
 *
 * Cada cosmetico de js/data/cosmetics.js trae un `shape` (la geometria)
 * y unos `colors` ({ main, dark, metal|accent }). Aqui se traduce eso a
 * formas de canvas.
 *
 * Todas las figuras se dibujan CENTRADAS en el origen dentro de una caja
 * aproximada de 100x100, para que la tienda y la taquilla puedan pintarlas
 * con un simple `scale`. Cuando anadamos el pico en la mano durante la
 * partida, se reutilizara exactamente la misma funcion.
 */

/* =============================================================
   PICOS
   ============================================================= */

/**
 * @param {object} def   entrada de PICKAXES (con .shape y .colors)
 * @param {object} opts  { x, y, scale, rotation }
 */
export function drawPickaxe(ctx, def, opts = {}) {
  const { x = 0, y = 0, scale = 1, rotation = 0 } = opts;
  const c = def.colors;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (def.shape) {
    case 'guante':    drawGuante(ctx, c); break;
    case 'llave':     drawLlave(ctx, c); break;
    case 'hacha':     drawHacha(ctx, c); break;
    case 'katana':    drawKatana(ctx, c); break;
    case 'martillo':  drawMartillo(ctx, c); break;
    case 'guadana':   drawGuadana(ctx, c); break;
    case 'pico':      drawPicoDiamante(ctx, c); break;
    case 'colmillo':  drawColmillo(ctx, c); break;
    case 'pala':      drawPala(ctx, c); break;
    case 'sierra':    drawSierra(ctx, c); break;
    case 'bate':      drawBate(ctx, c); break;
    case 'paraguas':  drawParaguas(ctx, c); break;
    case 'tridente':  drawTridente(ctx, c); break;
    case 'zanahoria': drawZanahoria(ctx, c); break;
    case 'rayo':      drawRayo(ctx, c); break;
    case 'pincel':    drawPincel(ctx, c); break;
    default:          drawLlave(ctx, c);
  }

  ctx.restore();
}

/** Mango de madera/metal comun a varios picos (de abajo-izq a arriba-der). */
function drawMango(ctx, color, x1, y1, x2, y2, width = 8) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Punos de Recluta: un guante cerrado con refuerzos metalicos. */
function drawGuante(ctx, c) {
  // Antebrazo / muneca
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.ellipse(-26, 22, 15, 11, -0.45, 0, Math.PI * 2);
  ctx.fill();

  // Puno
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.ellipse(4, -2, 28, 25, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Separacion de los dedos (surcos)
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-6 - i * 2, -22 + i * 12);
    ctx.lineTo(24, -14 + i * 12);
    ctx.stroke();
  }

  // Pulgar cruzado
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.ellipse(2, 18, 15, 7, -0.25, 0, Math.PI * 2);
  ctx.fill();

  // Nudillos metalicos
  ctx.fillStyle = c.metal;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(22 - i * 3, -18 + i * 12, 5.5, 4.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Brillo
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(2, -14, 13, 6, -0.35, 0, Math.PI * 2);
  ctx.fill();
}

/** Llave inglesa: mango largo y dos mordazas en la cabeza. */
function drawLlave(ctx, c) {
  drawMango(ctx, c.dark, -32, 36, 10, -8, 12);
  drawMango(ctx, c.main, -32, 36, 10, -8, 8);

  ctx.save();
  ctx.translate(20, -22);
  ctx.rotate(-0.78);

  // Cuerpo de la cabeza
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.ellipse(0, 6, 11, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mordaza fija y mordaza movil
  ctx.fillRect(-11, -14, 8, 18);
  ctx.fillRect(4, -9, 7, 13);

  // Hueco entre mordazas
  ctx.fillStyle = '#141c34';
  ctx.beginPath();
  ctx.moveTo(-3, -15);
  ctx.lineTo(4, -10);
  ctx.lineTo(4, 3);
  ctx.lineTo(-3, 3);
  ctx.closePath();
  ctx.fill();

  // Brillo
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-10, -12, 3, 14);
  ctx.restore();

  // Tuerca decorativa del extremo
  ctx.fillStyle = c.metal;
  ctx.beginPath();
  ctx.arc(-27, 31, 5, 0, Math.PI * 2);
  ctx.fill();
}

/** Hacha de lenador. */
function drawHacha(ctx, c) {
  drawMango(ctx, c.metal, -28, 36, 16, -18, 9);

  // Hoja
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(8, -10);
  ctx.quadraticCurveTo(34, -46, 44, -14);
  ctx.quadraticCurveTo(30, -2, 14, 0);
  ctx.closePath();
  ctx.fill();

  // Filo claro
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(30, -38);
  ctx.quadraticCurveTo(42, -30, 42, -16);
  ctx.quadraticCurveTo(36, -22, 28, -32);
  ctx.closePath();
  ctx.fill();

  // Refuerzo
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.ellipse(11, -10, 6, 9, -0.7, 0, Math.PI * 2);
  ctx.fill();
}

/** Katana con hoja luminosa. */
function drawKatana(ctx, c) {
  // Empunadura
  drawMango(ctx, c.metal, -34, 38, -14, 16, 9);

  // Guarda
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.ellipse(-11, 13, 10, 4, -0.78, 0, Math.PI * 2);
  ctx.fill();

  // Hoja
  ctx.strokeStyle = c.main;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-8, 10);
  ctx.quadraticCurveTo(18, -14, 40, -38);
  ctx.stroke();

  // Filo brillante
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, 8);
  ctx.quadraticCurveTo(19, -15, 39, -37);
  ctx.stroke();
}

/** Martillo pesado: cabeza rectangular con dos caras. */
function drawMartillo(ctx, c) {
  drawMango(ctx, c.metal, -28, 40, 8, -6, 10);

  ctx.save();
  ctx.translate(16, -18);
  ctx.rotate(-0.72);

  // Cabeza
  ctx.fillStyle = c.main;
  ctx.fillRect(-13, -22, 26, 44);
  // Caras de golpeo (mas claras)
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.fillRect(-13, -22, 26, 9);
  ctx.fillRect(-13, 13, 26, 9);
  // Banda central oscura
  ctx.fillStyle = c.dark;
  ctx.fillRect(-13, -6, 26, 12);
  // Remache
  ctx.fillStyle = c.metal;
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Guadana estelar: asta larga y hoja plana curva. */
function drawGuadana(ctx, c) {
  drawMango(ctx, c.metal, -30, 42, 4, -20, 8);

  // Hoja: dos curvas que se cierran (silueta de guadana)
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(2, -20);
  ctx.quadraticCurveTo(34, -40, 44, -6);   // filo exterior
  ctx.quadraticCurveTo(28, -18, 4, -12);   // lomo interior
  ctx.closePath();
  ctx.fill();

  // Filo brillante
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.moveTo(4, -20);
  ctx.quadraticCurveTo(32, -38, 41, -10);
  ctx.quadraticCurveTo(30, -28, 6, -19);
  ctx.closePath();
  ctx.fill();

  // Abrazadera del asta
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.ellipse(2, -17, 5, 7, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Estrellitas
  ctx.fillStyle = c.main;
  for (const [sx, sy, r] of [[-14, 6, 3], [-24, 22, 2.2], [20, 14, 2.6]]) {
    star(ctx, sx, sy, r);
  }
}

/** Pico de diamante: cabeza de dos puntas con cristal en el centro. */
function drawPicoDiamante(ctx, c) {
  drawMango(ctx, c.metal, -22, 42, 4, -14, 9);

  // Cabeza: arco con las dos puntas mirando hacia abajo
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(-34, -6);                       // punta izquierda
  ctx.quadraticCurveTo(-18, -34, 4, -36);    // lomo
  ctx.quadraticCurveTo(26, -34, 42, -6);     // lomo derecho
  ctx.quadraticCurveTo(28, -20, 4, -22);     // filo interior
  ctx.quadraticCurveTo(-18, -20, -34, -6);
  ctx.closePath();
  ctx.fill();

  // Brillo del lomo
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(-26, -12);
  ctx.quadraticCurveTo(-14, -30, 4, -32);
  ctx.quadraticCurveTo(-14, -25, -22, -11);
  ctx.closePath();
  ctx.fill();

  // Cristal central
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.moveTo(4, -32);
  ctx.lineTo(13, -20);
  ctx.lineTo(4, -8);
  ctx.lineTo(-5, -20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(4, -32);
  ctx.lineTo(13, -20);
  ctx.lineTo(4, -20);
  ctx.closePath();
  ctx.fill();
}

/** Colmillo dorado (mitico). */
function drawColmillo(ctx, c) {
  // Empunadura envuelta
  drawMango(ctx, c.metal, -30, 38, -8, 12, 10);
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-28 + i * 5, 34 - i * 5);
    ctx.lineTo(-22 + i * 5, 32 - i * 5);
    ctx.stroke();
  }

  // Colmillo curvo
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(-10, 14);
  ctx.quadraticCurveTo(26, -6, 38, -42);
  ctx.quadraticCurveTo(16, -18, -2, 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.moveTo(-4, 8);
  ctx.quadraticCurveTo(22, -10, 34, -36);
  ctx.quadraticCurveTo(18, -14, -1, 3);
  ctx.closePath();
  ctx.fill();

  // Gema en la base
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.arc(-9, 15, 6, 0, Math.PI * 2);
  ctx.fill();
}

/** Estrella de 4 puntas (decoracion). */
/* =============================================================
   PICOS NUEVOS
   Todos comparten el mismo encuadre: el mango arranca abajo a la
   izquierda (la mano) y la pieza util queda arriba a la derecha.
   ============================================================= */

/** Pala de obra: hoja ancha y cuadrada. */
function drawPala(ctx, c) {
  drawMango(ctx, c.metal, -30, 38, 10, -8, 8);

  // Cuello
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.ellipse(11, -9, 5, 7, -0.7, 0, Math.PI * 2);
  ctx.fill();

  // Hoja
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(6, -14);
  ctx.lineTo(30, -34);
  ctx.quadraticCurveTo(44, -22, 34, -6);
  ctx.lineTo(14, -2);
  ctx.closePath();
  ctx.fill();

  // Filo
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(32, -32);
  ctx.quadraticCurveTo(42, -22, 33, -9);
  ctx.quadraticCurveTo(38, -20, 29, -29);
  ctx.closePath();
  ctx.fill();
}

/** Sierra circular: disco dentado que gira. */
function drawSierra(ctx, c) {
  drawMango(ctx, c.metal, -30, 38, 2, 4, 10);

  // Carcasa
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.arc(16, -12, 12, 0, Math.PI * 2);
  ctx.fill();

  // Disco con dientes
  const R = 20;
  ctx.fillStyle = c.main;
  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const b = ((i + 0.5) / 14) * Math.PI * 2;
    ctx.lineTo(16 + Math.cos(a) * R, -12 + Math.sin(a) * R);
    ctx.lineTo(16 + Math.cos(b) * (R - 6), -12 + Math.sin(b) * (R - 6));
  }
  ctx.closePath();
  ctx.fill();

  // Buje
  ctx.fillStyle = c.metal;
  ctx.beginPath();
  ctx.arc(16, -12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(14, -14, 2, 0, Math.PI * 2);
  ctx.fill();
}

/** Bate estelar: mazo redondeado con estrellas. */
function drawBate(ctx, c) {
  drawMango(ctx, c.metal, -30, 38, -8, 14, 8);

  // Cuerpo del bate, que se ensancha
  ctx.strokeStyle = c.main;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(-4, 10);
  ctx.lineTo(26, -26);
  ctx.stroke();

  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-2, 8);
  ctx.lineTo(6, -2);
  ctx.stroke();

  // Punta redondeada
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.arc(28, -28, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  star(ctx, 26, -28, 5);
}

/** Paraguas afilado: elegante y con muy mala idea. */
function drawParaguas(ctx, c) {
  drawMango(ctx, c.metal, -30, 38, 4, -2, 7);

  // Empunadura curva
  ctx.strokeStyle = c.metal;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-30, 38);
  ctx.quadraticCurveTo(-40, 34, -36, 26);
  ctx.stroke();

  // Copa
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.quadraticCurveTo(14, -46, 40, -18);
  ctx.quadraticCurveTo(26, -22, 14, -14);
  ctx.quadraticCurveTo(2, -20, -12, -10);
  ctx.closePath();
  ctx.fill();

  // Varillas
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 2;
  for (const t of [0.25, 0.5, 0.75]) {
    ctx.beginPath();
    ctx.moveTo(14, -30);
    ctx.lineTo(-12 + 52 * t, -10 - Math.sin(t * Math.PI) * 6);
    ctx.stroke();
  }

  // Punta
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.moveTo(12, -32);
  ctx.lineTo(16, -46);
  ctx.lineTo(19, -31);
  ctx.closePath();
  ctx.fill();
}

/** Tridente marino: tres puntas y mango largo. */
function drawTridente(ctx, c) {
  drawMango(ctx, c.metal, -32, 40, 16, -20, 8);

  ctx.strokeStyle = c.main;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';

  // Travesano
  ctx.beginPath();
  ctx.moveTo(6, -16);
  ctx.lineTo(30, -32);
  ctx.stroke();

  // Las tres puas
  const puas = [[4, -20], [17, -28], [30, -36]];
  for (const [px, py] of puas) {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 8, py - 18);
    ctx.stroke();
  }

  // Brillo
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(17, -28);
  ctx.lineTo(25, -46);
  ctx.stroke();
}

/** Zanahoria: la broma de la isla, pero pega igual. */
function drawZanahoria(ctx, c) {
  // Cuerpo
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(-24, 34);
  ctx.quadraticCurveTo(6, 6, 34, -32);
  ctx.quadraticCurveTo(20, -34, 6, -22);
  ctx.quadraticCurveTo(-8, -10, -30, 24);
  ctx.closePath();
  ctx.fill();

  // Estrias
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    ctx.beginPath();
    ctx.moveTo(-24 + 58 * t - 6, 34 - 66 * t);
    ctx.lineTo(-24 + 58 * t + 4, 34 - 66 * t - 6);
    ctx.stroke();
  }

  // Hojas
  ctx.fillStyle = c.metal;
  for (const a of [-0.5, -0.15, 0.2]) {
    ctx.save();
    ctx.translate(-26, 32);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(-6, 6, 4, 11, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Rayo fundido: pura energia con un asa. */
function drawRayo(ctx, c) {
  // Asa
  ctx.strokeStyle = c.metal;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-28, 36);
  ctx.lineTo(-14, 18);
  ctx.stroke();

  // Rayo
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(-16, 20);
  ctx.lineTo(12, -6);
  ctx.lineTo(0, -8);
  ctx.lineTo(30, -40);
  ctx.lineTo(18, -12);
  ctx.lineTo(30, -10);
  ctx.closePath();
  ctx.fill();

  // Nucleo brillante
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.moveTo(-8, 14);
  ctx.lineTo(10, -4);
  ctx.lineTo(4, -5);
  ctx.lineTo(22, -30);
  ctx.lineTo(12, -10);
  ctx.lineTo(18, -9);
  ctx.closePath();
  ctx.fill();
}

/** Pincel de artista: mancha lo que toca. */
function drawPincel(ctx, c) {
  drawMango(ctx, c.metal, -30, 38, 12, -12, 8);

  // Virola
  ctx.fillStyle = c.dark;
  ctx.save();
  ctx.translate(15, -15);
  ctx.rotate(-0.86);
  ctx.fillRect(-6, -7, 12, 14);
  ctx.restore();

  // Pelo del pincel
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(14, -20);
  ctx.quadraticCurveTo(34, -34, 38, -22);
  ctx.quadraticCurveTo(30, -12, 20, -10);
  ctx.closePath();
  ctx.fill();

  // Goterones
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.arc(40, -34, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(33, -44, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2.2);
  ctx.quadraticCurveTo(x, y, x + r * 2.2, y);
  ctx.quadraticCurveTo(x, y, x, y + r * 2.2);
  ctx.quadraticCurveTo(x, y, x - r * 2.2, y);
  ctx.quadraticCurveTo(x, y, x, y - r * 2.2);
  ctx.fill();
}

/* =============================================================
   PARAVELAS
   ============================================================= */

/**
 * @param {object} def   entrada de GLIDERS (con .shape y .colors)
 * @param {object} opts  { x, y, scale }
 */
export function drawGlider(ctx, def, opts = {}) {
  const { x = 0, y = 0, scale = 1 } = opts;
  const c = def.colors;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (def.shape) {
    case 'paracaidas': drawParacaidas(ctx, c); break;
    case 'aladelta':   drawAlaDelta(ctx, c); break;
    case 'sombrilla':  drawSombrilla(ctx, c); break;
    case 'murcielago': drawMurcielago(ctx, c); break;
    case 'nube':       drawNube(ctx, c); break;
    case 'dragon':     drawDragon(ctx, c); break;
    case 'alas':       drawAlas(ctx, c); break;
    case 'cometa':     drawCometa(ctx, c); break;
    case 'globo':      drawGlobo(ctx, c); break;
    case 'pizza':      drawPizza(ctx, c); break;
    case 'medusa':     drawMedusa(ctx, c); break;
    case 'jet':        drawJet(ctx, c); break;
    case 'hoja':       drawHoja(ctx, c); break;
    case 'calavera':   drawCalavera(ctx, c); break;
    case 'fenix':      drawFenix(ctx, c); break;
    default:           drawParacaidas(ctx, c);
  }

  ctx.restore();
}

/** Cuerdas + asa, comunes a paracaidas y sombrilla. */
function drawCuerdas(ctx, color, y0 = -6, y1 = 30) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  for (const sx of [-40, -14, 14, 40]) {
    ctx.beginPath();
    ctx.moveTo(sx, y0);
    ctx.lineTo(0, y1);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, y1 + 4, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Paracaidas de gajos. */
function drawParacaidas(ctx, c) {
  const gajos = 5;
  for (let i = 0; i < gajos; i++) {
    const x0 = -50 + (100 / gajos) * i;
    const x1 = x0 + 100 / gajos;
    ctx.fillStyle = i % 2 === 0 ? c.main : c.dark;
    ctx.beginPath();
    ctx.moveTo(x0, -6);
    ctx.quadraticCurveTo((x0 + x1) / 2, -56, x1, -6);
    ctx.quadraticCurveTo((x0 + x1) / 2, -1, x0, -6);
    ctx.closePath();
    ctx.fill();
  }
  // Banda superior de color
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -6, 48, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();

  drawCuerdas(ctx, c.dark);
}

/** Ala delta triangular. */
function drawAlaDelta(ctx, c) {
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(-56, -18);
  ctx.quadraticCurveTo(0, -34, 56, -18);
  ctx.lineTo(0, 26);
  ctx.closePath();
  ctx.fill();

  // Media ala en sombra
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.moveTo(-56, -18);
  ctx.quadraticCurveTo(-28, -26, 0, -26);
  ctx.lineTo(0, 26);
  ctx.closePath();
  ctx.fill();

  // Mastil y barra
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-56, -18); ctx.lineTo(56, -18);
  ctx.moveTo(0, -28); ctx.lineTo(0, 26);
  ctx.stroke();
}

/** Sombrilla de playa. */
function drawSombrilla(ctx, c) {
  const gajos = 6;
  for (let i = 0; i < gajos; i++) {
    const a0 = Math.PI + (Math.PI / gajos) * i;
    const a1 = a0 + Math.PI / gajos;
    ctx.fillStyle = i % 2 === 0 ? c.main : c.accent;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.arc(0, -4, 52, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  // Borde festoneado
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -4, 52, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Mastil
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 34);
  ctx.stroke();
  // Remate
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.arc(0, -14, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

/** Alas de murcielago. */
function drawMurcielago(ctx, c) {
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.scale(dir, 1);
    ctx.fillStyle = dir === -1 ? c.dark : c.main;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.quadraticCurveTo(30, -34, 58, -20);
    // Festones del borde
    ctx.quadraticCurveTo(46, -6, 42, -12);
    ctx.quadraticCurveTo(34, 6, 26, -6);
    ctx.quadraticCurveTo(16, 16, 8, 0);
    ctx.quadraticCurveTo(4, 8, 0, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Cuerpo central
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.ellipse(0, -2, 7, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Orejitas
  ctx.beginPath();
  ctx.moveTo(-6, -16); ctx.lineTo(-3, -26); ctx.lineTo(0, -16);
  ctx.moveTo(6, -16); ctx.lineTo(3, -26); ctx.lineTo(0, -16);
  ctx.fill();
}

/** Nube con arcoiris. */
function drawNube(ctx, c) {
  // Arcoiris: arco hacia abajo, para que asome por debajo de la nube
  const bandas = ['#ff6b6b', '#ffa93d', '#ffd23f', '#5fd14a', '#3aa2f5', '#b45cf0'];
  ctx.lineWidth = 6;
  bandas.forEach((color, i) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(0, -6, 22 + i * 6, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();
  });

  // Nube
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.ellipse(0, -4, 52, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = c.main;
  ctx.beginPath();
  for (const [px, py, pr] of [[-30, -10, 17], [-8, -22, 22], [18, -16, 19], [38, -6, 14]]) {
    ctx.moveTo(px + pr, py);
    ctx.arc(px, py, pr, 0, Math.PI * 2);
  }
  ctx.fill();

  // Mejillas sonrosadas
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.arc(-16, -6, 5, 0, Math.PI * 2);
  ctx.arc(14, -4, 5, 0, Math.PI * 2);
  ctx.fill();
}

/** Alas de dragon con puas. */
function drawDragon(ctx, c) {
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.scale(dir, 1);

    // Membrana
    ctx.fillStyle = dir === -1 ? c.dark : c.main;
    ctx.beginPath();
    ctx.moveTo(2, -18);
    ctx.quadraticCurveTo(36, -40, 62, -14);
    ctx.quadraticCurveTo(48, -8, 44, -14);
    ctx.quadraticCurveTo(38, 6, 30, -8);
    ctx.quadraticCurveTo(22, 14, 14, -2);
    ctx.quadraticCurveTo(8, 10, 2, 10);
    ctx.closePath();
    ctx.fill();

    // Nervios del ala
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(4, -14); ctx.lineTo(44, -16);
    ctx.moveTo(4, -14); ctx.lineTo(30, -10);
    ctx.moveTo(4, -14); ctx.lineTo(15, -4);
    ctx.stroke();

    ctx.restore();
  }

  // Cuerpo con puas
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.ellipse(0, -4, 8, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const y = -20 + i * 12;
    ctx.moveTo(0, y); ctx.lineTo(6, y + 5); ctx.lineTo(0, y + 10);
  }
  ctx.fill();
}

/** Alas doradas: silueta de ala con plumas festoneadas. */
function drawAlas(ctx, c) {
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.scale(dir, 1);

    // Silueta del ala: borde superior liso, borde inferior de plumas
    ctx.fillStyle = dir === -1 ? c.dark : c.main;
    ctx.beginPath();
    ctx.moveTo(2, -16);
    ctx.quadraticCurveTo(30, -36, 62, -22);   // borde de ataque
    ctx.quadraticCurveTo(52, -8, 44, -14);    // plumas largas
    ctx.quadraticCurveTo(38, 2, 30, -10);
    ctx.quadraticCurveTo(22, 10, 15, -5);
    ctx.quadraticCurveTo(9, 8, 2, 6);
    ctx.closePath();
    ctx.fill();

    // Segunda fila de plumas (mas claras) sobre el ala
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.moveTo(4, -16);
    ctx.quadraticCurveTo(24, -30, 44, -22);
    ctx.quadraticCurveTo(36, -12, 30, -18);
    ctx.quadraticCurveTo(24, -6, 18, -15);
    ctx.quadraticCurveTo(12, -4, 4, -8);
    ctx.closePath();
    ctx.fill();

    // Plumas cortas del hombro
    ctx.fillStyle = dir === -1 ? c.dark : c.main;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(9 + i * 7, -20 - i * 2.5, 5, 3.4, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Nucleo brillante entre las dos alas
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.ellipse(0, -8, 6.5, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.ellipse(0, -12, 3, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}


/* =============================================================
   PARAVELAS NUEVAS
   El encuadre es el mismo para todas: la vela ocupa la franja de
   y = -40 a y = 20, y el personaje cuelga en (0, 34).
   ============================================================= */

/** Cometa de papel, con su cola de lazos. */
function drawCometa(ctx, c) {
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.lineTo(38, -8);
  ctx.lineTo(0, 22);
  ctx.lineTo(-38, -8);
  ctx.closePath();
  ctx.fill();

  // Mitad en sombra
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.lineTo(0, 22);
  ctx.lineTo(-38, -8);
  ctx.closePath();
  ctx.fill();

  // Varillas
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -46); ctx.lineTo(0, 22);
  ctx.moveTo(-38, -8); ctx.lineTo(38, -8);
  ctx.stroke();

  drawCuerdas(ctx, c.accent, 14, 34);

  // Lacitos de la cola
  ctx.fillStyle = c.accent;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.ellipse(-8 - i * 5, 24 + i * 9, 4.5, 2.6, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Globo aerostatico con su cesta. */
function drawGlobo(ctx, c) {
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.ellipse(0, -18, 40, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gajos
  ctx.fillStyle = c.dark;
  for (const dx of [-30, -8, 14]) {
    ctx.beginPath();
    ctx.ellipse(dx + 6, -18, 7, 33, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Brillo
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(-14, -32, 12, 8, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Cuello
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.moveTo(-12, 12);
  ctx.lineTo(12, 12);
  ctx.lineTo(7, 22);
  ctx.lineTo(-7, 22);
  ctx.closePath();
  ctx.fill();

  // Cesta
  ctx.fillStyle = '#a9763f';
  ctx.fillRect(-12, 24, 24, 12);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-12, 24, 24, 12);
}

/** Porcion de pizza voladora. Sin comentarios. */
function drawPizza(ctx, c) {
  // Masa
  ctx.fillStyle = '#e8b566';
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.lineTo(-46, -34);
  ctx.quadraticCurveTo(0, -46, 46, -34);
  ctx.closePath();
  ctx.fill();

  // Queso
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(-40, -30);
  ctx.quadraticCurveTo(0, -40, 40, -30);
  ctx.closePath();
  ctx.fill();

  // Borde
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-46, -34);
  ctx.quadraticCurveTo(0, -46, 46, -34);
  ctx.stroke();

  // Pepperoni
  ctx.fillStyle = c.accent;
  for (const [px, py] of [[-16, -22], [12, -24], [-2, -6], [24, -12]]) {
    ctx.beginPath();
    ctx.arc(px, py, 5.4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCuerdas(ctx, '#c98a3a', 14, 34);
}

/** Medusa flotante con tentaculos. */
function drawMedusa(ctx, c) {
  // Campana
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(-42, 4);
  ctx.quadraticCurveTo(-42, -44, 0, -44);
  ctx.quadraticCurveTo(42, -44, 42, 4);
  ctx.quadraticCurveTo(21, -6, 0, 4);
  ctx.quadraticCurveTo(-21, -6, -42, 4);
  ctx.closePath();
  ctx.fill();

  // Brillo interior
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(-12, -26, 13, 9, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Manchas
  ctx.fillStyle = c.dark;
  for (const dx of [-20, 0, 20]) {
    ctx.beginPath();
    ctx.ellipse(dx, -14, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tentaculos
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const x = -28 + i * 14;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + 8, 14, x - 4, 30);
    ctx.stroke();
  }
}

/** Ala jet: dos alas rigidas con turbinas. */
function drawJet(ctx, c) {
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(-58, -12);
  ctx.lineTo(-10, -24);
  ctx.lineTo(10, -24);
  ctx.lineTo(58, -12);
  ctx.lineTo(34, 6);
  ctx.lineTo(-34, 6);
  ctx.closePath();
  ctx.fill();

  // Morro
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.moveTo(-14, -24);
  ctx.lineTo(14, -24);
  ctx.lineTo(10, 6);
  ctx.lineTo(-10, 6);
  ctx.closePath();
  ctx.fill();

  // Turbinas
  ctx.fillStyle = c.accent;
  for (const dx of [-34, 34]) {
    ctx.beginPath();
    ctx.ellipse(dx, -4, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Estelas
  ctx.fillStyle = 'rgba(255,190,90,0.55)';
  for (const dx of [-34, 34]) {
    ctx.beginPath();
    ctx.moveTo(dx - 5, 2);
    ctx.lineTo(dx + 5, 2);
    ctx.lineTo(dx, 20);
    ctx.closePath();
    ctx.fill();
  }
}

/** Hoja gigante: se baja planeando como en otono. */
function drawHoja(ctx, c) {
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(-50, 6);
  ctx.quadraticCurveTo(-26, -46, 0, -42);
  ctx.quadraticCurveTo(30, -38, 50, 6);
  ctx.quadraticCurveTo(0, 22, -50, 6);
  ctx.closePath();
  ctx.fill();

  // Media hoja en sombra
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.moveTo(-50, 6);
  ctx.quadraticCurveTo(-26, -46, 0, -42);
  ctx.lineTo(0, 14);
  ctx.closePath();
  ctx.fill();

  // Nervios
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.lineTo(0, 30);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  for (let i = 1; i <= 3; i++) {
    const y = -30 + i * 14;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(-16 - i * 5, y + 10);
    ctx.moveTo(0, y);
    ctx.lineTo(16 + i * 5, y + 10);
    ctx.stroke();
  }
}

/** Bandera pirata con calavera. */
function drawCalavera(ctx, c) {
  // Pano
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(-46, -34);
  ctx.lineTo(46, -34);
  ctx.quadraticCurveTo(40, 0, 46, 14);
  ctx.quadraticCurveTo(0, 2, -46, 14);
  ctx.quadraticCurveTo(-40, 0, -46, -34);
  ctx.closePath();
  ctx.fill();

  // Craneo
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.ellipse(0, -18, 15, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-8, -8, 16, 8);

  // Ojos y nariz
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.ellipse(-5.5, -20, 4, 4.6, 0, 0, Math.PI * 2);
  ctx.ellipse(5.5, -20, 4, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(2.6, -9); ctx.lineTo(-2.6, -9);
  ctx.closePath();
  ctx.fill();

  // Tibias cruzadas
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-22, 6); ctx.lineTo(22, -4);
  ctx.moveTo(-22, -4); ctx.lineTo(22, 6);
  ctx.stroke();

  drawCuerdas(ctx, c.dark, 12, 34);
}

/** Alas de fenix: plumas en llamas. */
function drawFenix(ctx, c) {
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.scale(dir, 1);

    // Ala
    ctx.fillStyle = c.main;
    ctx.beginPath();
    ctx.moveTo(2, 4);
    ctx.quadraticCurveTo(30, -42, 62, -20);
    ctx.quadraticCurveTo(46, -12, 40, 2);
    ctx.quadraticCurveTo(24, -4, 2, 4);
    ctx.closePath();
    ctx.fill();

    // Plumas largas
    ctx.fillStyle = c.dark;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(16 + i * 12, -6 - i * 4);
      ctx.quadraticCurveTo(30 + i * 12, 8, 20 + i * 12, 20);
      ctx.quadraticCurveTo(22 + i * 12, 4, 12 + i * 12, -4);
      ctx.closePath();
      ctx.fill();
    }

    // Chispa
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.ellipse(44, -22, 8, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Nucleo brillante
  ctx.fillStyle = 'rgba(255,240,180,0.6)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
}
