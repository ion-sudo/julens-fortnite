/**
 * weaponSprite.js
 * ---------------------------------------------------------------
 * DIBUJO de las armas, vectorial como el resto del juego.
 *
 * Convenio: todas se dibujan APUNTANDO HACIA +X, con el origen (0,0)
 * en la EMPUNADURA (donde va la mano del personaje). Asi, para que el
 * personaje apunte, basta con rotar el contexto por el angulo de mira.
 *
 * El color de la rareza tine algunos detalles, de modo que un arma
 * legendaria se distingue de una comun de un vistazo.
 */

import { rarityColor } from '../data/rarities.js';
import { roundRectPath } from '../core/utils.js';

/** Gris metalico base comun a casi todas las armas. */
const METAL = '#4a5164';
const METAL_DARK = '#333949';
const METAL_LIGHT = '#79839b';
const WOOD = '#8a5c2f';
const WOOD_DARK = '#6b4522';

/**
 * @param {object} weapon  instancia de arma ({def, rarity})
 * @param {object} opts    { x, y, angle, scale, flipY }
 *   flipY: al mirar a la izquierda el personaje se voltea; pasando true
 *   el arma se refleja para que no salga del reves.
 */
export function drawWeapon(ctx, weapon, opts = {}) {
  const { x = 0, y = 0, angle = 0, scale = 1, flipY = false } = opts;
  const tint = rarityColor(weapon.rarity);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, flipY ? -scale : scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (weapon.def.kind) {
    case 'pistol':       drawPistol(ctx, tint); break;
    case 'ar':           drawAR(ctx, tint, false); break;
    case 'ar-drum':      drawAR(ctx, tint, true); break;
    case 'smg':          drawSMG(ctx, tint, false); break;
    case 'smg-drum':     drawSMG(ctx, tint, true); break;
    case 'minigun':      drawMinigun(ctx, tint); break;
    case 'shotgun':      drawShotgun(ctx, tint, false); break;
    case 'shotgun-oni':  drawShotgun(ctx, tint, true); break;
    case 'sniper':       drawSniper(ctx, tint); break;
    case 'beam':         drawBeamGun(ctx, tint); break;
    // Exclusivas del Julen Blitz
    case 'lmg':          drawLMG(ctx, tint); break;
    case 'revolver':     drawRevolver(ctx, tint); break;
    case 'llamas':       drawLanzallamas(ctx, tint); break;
    case 'pulso':        drawPulso(ctx, tint); break;
    case 'grieta':       drawGrieta(ctx, tint); break;
    // Las de JULEN DEFENSA
    case 'cohetes':      drawCohetes(ctx, tint); break;
    case 'hielo':        drawHielo(ctx, tint); break;
    case 'cadena':       drawCadena(ctx, tint); break;
    default:             drawPistol(ctx, tint);
  }

  ctx.restore();
}

/** Distancia desde la empunadura hasta la BOCA del canon (de donde sale la bala). */
export function muzzleDistance(weapon) {
  switch (weapon.def.kind) {
    case 'pistol':      return 22;
    case 'ar':          return 42;
    case 'ar-drum':     return 40;
    case 'smg':         return 32;
    case 'smg-drum':    return 31;
    case 'minigun':     return 46;
    case 'shotgun':     return 40;
    case 'shotgun-oni': return 42;
    case 'sniper':      return 56;
    case 'beam':        return 40;
    case 'lmg':         return 48;
    case 'revolver':    return 28;
    case 'llamas':      return 38;
    case 'pulso':       return 50;
    case 'grieta':      return 24;
    case 'cohetes':     return 58;
    case 'hielo':       return 46;
    case 'cadena':      return 44;
    default:            return 26;
  }
}

/* =============================================================
   LAS 10 ARMAS
   ============================================================= */

function grip(ctx, color = METAL_DARK) {
  // Empunadura: arranca DENTRO del cuerpo del arma (y negativa) para que
  // no se vea un palo suelto, y cae ligeramente inclinada hacia atras.
  ctx.fillStyle = color;
  ctx.save();
  ctx.rotate(0.26);
  roundRectPath(ctx, -4.5, -6, 9, 18, 3);
  ctx.fill();
  ctx.restore();

  // Guardamonte
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(4, 1, 5, -0.3, Math.PI * 0.9);
  ctx.stroke();
}

/** 1. Pistola: pequena y compacta. */
function drawPistol(ctx, tint) {
  grip(ctx);
  // Corredera
  ctx.fillStyle = METAL;
  ctx.fillRect(-6, -8, 26, 9);
  ctx.fillStyle = METAL_LIGHT;
  ctx.fillRect(-6, -8, 26, 3);
  // Canon
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(18, -6, 6, 5);
  // Detalle de rareza
  ctx.fillStyle = tint;
  ctx.fillRect(-4, -3, 12, 3);
}

/** 2 y 3. Fusil de asalto (recto o de tambor). */
function drawAR(ctx, tint, drum) {
  grip(ctx);
  // Culata
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(-18, -9, 14, 8);
  ctx.fillRect(-8, -7, 8, 6);
  // Cuerpo
  ctx.fillStyle = METAL;
  ctx.fillRect(-6, -11, 34, 10);
  ctx.fillStyle = METAL_LIGHT;
  ctx.fillRect(-6, -11, 34, 3);
  // Canon
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(26, -9, 18, 5);
  // Guardamanos
  ctx.fillStyle = tint;
  ctx.fillRect(20, -10, 10, 8);
  // Alza
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(6, -15, 8, 4);

  if (drum) {
    // Tambor circular
    ctx.fillStyle = METAL;
    ctx.beginPath();
    ctx.arc(7, 3, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = METAL_DARK;
    ctx.beginPath();
    ctx.arc(7, 3, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Cargador recto
    ctx.fillStyle = METAL_DARK;
    ctx.save();
    ctx.translate(6, -1);
    ctx.rotate(0.12);
    ctx.fillRect(-4, 0, 9, 16);
    ctx.restore();
  }
}

/** 4 y 5. Subfusil (compacto). */
function drawSMG(ctx, tint, drum) {
  grip(ctx);
  // Cuerpo corto
  ctx.fillStyle = METAL;
  ctx.fillRect(-8, -10, 26, 9);
  ctx.fillStyle = METAL_LIGHT;
  ctx.fillRect(-8, -10, 26, 2.5);
  // Canon corto con bocacha
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(16, -8, 14, 4.5);
  ctx.fillRect(28, -9.5, 4, 7);
  // Culata plegable
  ctx.strokeStyle = METAL_DARK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, -7);
  ctx.lineTo(-17, -5);
  ctx.stroke();
  // Detalle de rareza
  ctx.fillStyle = tint;
  ctx.fillRect(-2, -6, 11, 3);

  if (drum) {
    ctx.fillStyle = METAL;
    ctx.beginPath();
    ctx.arc(5, 2, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = METAL_DARK;
    ctx.beginPath();
    ctx.arc(5, 2, 3.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = METAL_DARK;
    ctx.fillRect(1, -1, 7, 17);
  }
}

/** 6. Minigun: caja grande y haz de canones. */
function drawMinigun(ctx, tint) {
  grip(ctx);
  // Caja de municion
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(-16, -6, 16, 16);
  ctx.fillStyle = tint;
  ctx.fillRect(-14, -3, 12, 4);

  // Cuerpo
  ctx.fillStyle = METAL;
  ctx.fillRect(-6, -14, 26, 16);
  ctx.fillStyle = METAL_LIGHT;
  ctx.fillRect(-6, -14, 26, 4);

  // Haz de canones
  ctx.fillStyle = METAL_DARK;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(20, -13 + i * 5, 28, 3.5);
  }
  // Anillo delantero
  ctx.fillStyle = METAL_LIGHT;
  ctx.fillRect(44, -14, 4, 15);
}

/** 7 y 8. Escopetas (la de Oni con detalles rojos). */
function drawShotgun(ctx, tint, oni) {
  grip(ctx, oni ? '#3a1f28' : WOOD_DARK);
  // Culata de madera
  ctx.fillStyle = oni ? '#5a2231' : WOOD;
  ctx.fillRect(-20, -10, 16, 9);
  // Cuerpo
  ctx.fillStyle = METAL;
  ctx.fillRect(-6, -11, 22, 9);
  // Canon grueso
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(14, -11, 28, 7);
  ctx.fillStyle = METAL_LIGHT;
  ctx.fillRect(14, -11, 28, 2);
  // Guardamanos
  ctx.fillStyle = oni ? '#5a2231' : WOOD;
  ctx.fillRect(20, -4, 14, 5);
  // Detalle de rareza (en la de Oni va en la culata, para no tapar la mascara)
  ctx.fillStyle = tint;
  if (oni) ctx.fillRect(-19, -8, 13, 3);
  else ctx.fillRect(-4, -8, 10, 3);

  if (oni) {
    // Mascara de oni en el lateral
    ctx.fillStyle = '#d8433f';
    ctx.beginPath();
    ctx.arc(4, -6.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7e6c8';
    ctx.beginPath();
    ctx.arc(4, -6.5, 2, 0, Math.PI * 2);
    ctx.fill();
    // Cuernos
    ctx.strokeStyle = '#f7e6c8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1, -11); ctx.lineTo(-1, -15);
    ctx.moveTo(7, -11); ctx.lineTo(9, -15);
    ctx.stroke();
  }
}

/** 9. Sniper tactico: canon larguisimo, mira y bipode. */
function drawSniper(ctx, tint) {
  grip(ctx);
  // Culata larga
  ctx.fillStyle = WOOD_DARK;
  ctx.fillRect(-24, -10, 20, 9);
  ctx.fillStyle = WOOD;
  ctx.fillRect(-24, -10, 20, 3);
  // Cuerpo
  ctx.fillStyle = METAL;
  ctx.fillRect(-6, -12, 24, 10);
  // Canon muy largo
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(18, -9, 36, 4);
  ctx.fillRect(50, -10.5, 6, 7); // bocacha
  // Mira telescopica
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(2, -19, 20, 6);
  ctx.fillStyle = tint;
  ctx.fillRect(4, -18, 16, 2);
  ctx.fillStyle = '#9fe8ff';
  ctx.fillRect(20, -18, 2.5, 4);
  // Bipode
  ctx.strokeStyle = METAL_DARK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, -5); ctx.lineTo(30, 6);
  ctx.moveTo(34, -5); ctx.lineTo(40, 6);
  ctx.stroke();
}

/** 10. Julen Super Arma: canon de energia con nucleo brillante. */
function drawBeamGun(ctx, tint) {
  grip(ctx, '#2a2440');

  // Cuerpo futurista
  ctx.fillStyle = '#3c3560';
  ctx.beginPath();
  ctx.moveTo(-14, -6);
  ctx.lineTo(-8, -14);
  ctx.lineTo(22, -14);
  ctx.lineTo(26, -4);
  ctx.lineTo(-12, -1);
  ctx.closePath();
  ctx.fill();

  // Nucleo de energia
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.arc(2, -8, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(2, -8, 2.4, 0, Math.PI * 2);
  ctx.fill();

  // Horquilla emisora
  ctx.strokeStyle = '#6a5fd0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(24, -12); ctx.lineTo(40, -14);
  ctx.moveTo(24, -5);  ctx.lineTo(40, -3);
  ctx.stroke();

  // Chispa entre las puntas
  ctx.strokeStyle = tint;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(39, -13);
  ctx.lineTo(35, -8.5);
  ctx.lineTo(39, -4);
  ctx.stroke();

  // Aletas superiores
  ctx.fillStyle = '#544a86';
  ctx.fillRect(6, -18, 12, 4);
}


/* =============================================================
   EXCLUSIVAS DEL JULEN BLITZ
   ============================================================= */

/** Ametralladora ligera: larga, con bipode y cinta de balas. */
function drawLMG(ctx, tint) {
  grip(ctx);

  // Culata gruesa
  ctx.fillStyle = WOOD_DARK;
  ctx.fillRect(-20, -10, 16, 9);
  ctx.fillStyle = WOOD;
  ctx.fillRect(-20, -10, 16, 3);

  // Cuerpo
  ctx.fillStyle = METAL;
  ctx.fillRect(-6, -13, 36, 12);
  ctx.fillStyle = METAL_LIGHT;
  ctx.fillRect(-6, -13, 36, 3);

  // Canon largo con camisa de refrigeracion
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(28, -10, 22, 6);
  ctx.fillStyle = METAL;
  for (let x = 30; x < 46; x += 4) ctx.fillRect(x, -11, 2, 8);

  // Bipode
  ctx.strokeStyle = METAL_DARK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, -4); ctx.lineTo(35, 7);
  ctx.moveTo(40, -4); ctx.lineTo(46, 7);
  ctx.stroke();

  // Caja de municion y cinta colgando
  ctx.fillStyle = tint;
  roundRectPath(ctx, 2, -2, 16, 12, 3);
  ctx.fill();
  ctx.fillStyle = '#e0a63a';
  for (let i = 0; i < 4; i++) ctx.fillRect(16 + i * 3, -1 + i * 1.4, 2.4, 4);

  // Asa de transporte
  ctx.strokeStyle = METAL_DARK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(6, -13); ctx.lineTo(8, -18); ctx.lineTo(18, -18); ctx.lineTo(20, -13);
  ctx.stroke();
}

/** Revolver pesado: tambor gordo y canon corto. */
function drawRevolver(ctx, tint) {
  grip(ctx, WOOD_DARK);

  // Cuerpo
  ctx.fillStyle = METAL;
  roundRectPath(ctx, -6, -10, 22, 9, 2);
  ctx.fill();
  ctx.fillStyle = METAL_LIGHT;
  ctx.fillRect(-6, -10, 22, 2.5);

  // Tambor
  ctx.fillStyle = METAL_DARK;
  ctx.beginPath();
  ctx.arc(4, -5, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tint;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.arc(4 + Math.cos(a) * 4.6, -5 + Math.sin(a) * 4.6, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Canon corto y grueso
  ctx.fillStyle = METAL;
  ctx.fillRect(14, -9, 14, 7);
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(14, -9, 14, 2);
  // Punto de mira
  ctx.fillRect(24, -12, 2.4, 3);

  // Percutor
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(-6, -13, 5, 4);
}

/** Lanzallamas: bombona a la espalda, tubo grueso y piloto encendido. */
function drawLanzallamas(ctx, tint) {
  grip(ctx);

  // Bombona
  ctx.fillStyle = '#b03a2a';
  roundRectPath(ctx, -22, -14, 15, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#8a2a1c';
  ctx.fillRect(-22, -3, 15, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(-19, -12, 4, 17);

  // Manguera hasta el cuerpo
  ctx.strokeStyle = METAL_DARK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-8, -6);
  ctx.quadraticCurveTo(-2, 2, 2, -5);
  ctx.stroke();

  // Cuerpo y tubo
  ctx.fillStyle = METAL;
  ctx.fillRect(-2, -11, 24, 9);
  ctx.fillStyle = METAL_LIGHT;
  ctx.fillRect(-2, -11, 24, 2.5);
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(20, -10, 14, 7);

  // Boca acampanada
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.moveTo(32, -12);
  ctx.lineTo(38, -14);
  ctx.lineTo(38, 1);
  ctx.lineTo(32, -1);
  ctx.closePath();
  ctx.fill();

  // Piloto siempre encendido
  ctx.fillStyle = '#ff8a3d';
  ctx.beginPath();
  ctx.moveTo(38, -9); ctx.lineTo(44, -6.5); ctx.lineTo(38, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(39, -6.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

/** Rifle de pulsos: energia, con bobinas y un canon largo y fino. */
function drawPulso(ctx, tint) {
  grip(ctx);

  // Culata angular
  ctx.fillStyle = '#2f3648';
  ctx.beginPath();
  ctx.moveTo(-22, -12); ctx.lineTo(-4, -13); ctx.lineTo(-4, -2); ctx.lineTo(-16, 0);
  ctx.closePath();
  ctx.fill();

  // Cuerpo
  ctx.fillStyle = METAL;
  roundRectPath(ctx, -6, -14, 32, 12, 3);
  ctx.fill();
  ctx.fillStyle = METAL_LIGHT;
  ctx.fillRect(-6, -14, 32, 3);

  // Bobinas del acelerador: tres anillos por el canon
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(24, -10, 26, 4);
  for (const x of [28, 36, 44]) {
    ctx.fillStyle = tint;
    roundRectPath(ctx, x, -12.5, 4, 9, 1.5);
    ctx.fill();
  }

  // Celda de energia, luminosa
  ctx.fillStyle = tint;
  roundRectPath(ctx, 2, -3, 14, 9, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(4, -1.5, 10, 2.4);

  // Mira alargada
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(4, -19, 18, 4);
  ctx.fillStyle = tint;
  ctx.fillRect(6, -18, 3, 2);
}

/**
 * Grieta Portatil: no es un arma, es un aparato. Un marco con un ojal
 * morado dentro, que es la grieta a medio abrir.
 */
function drawGrieta(ctx, tint) {
  grip(ctx, '#3a2f52');

  // Cuerpo compacto
  ctx.fillStyle = '#4a3f6b';
  roundRectPath(ctx, -8, -13, 22, 13, 4);
  ctx.fill();
  ctx.fillStyle = '#6a5a94';
  ctx.fillRect(-8, -13, 22, 3);

  // El aro por el que se abre la grieta
  ctx.strokeStyle = '#8a74c8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(11, -7, 8, 10, 0, 0, Math.PI * 2);
  ctx.stroke();

  // La grieta: un ojal morado con el centro claro
  const g = ctx.createRadialGradient(11, -7, 1, 11, -7, 9);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, tint);
  g.addColorStop(1, 'rgba(138, 116, 200, 0.15)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(11, -7, 6.5, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dos chispas orbitando
  ctx.fillStyle = '#e2b6ff';
  ctx.beginPath();
  ctx.arc(11, -16, 1.8, 0, Math.PI * 2);
  ctx.arc(11, 1.5, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

/* =============================================================
   ARMAS DE JULEN DEFENSA
   ============================================================= */

/** Lanzacohetes: un tubo largo con la punta del cohete asomando. */
function drawCohetes(ctx, tint) {
  grip(ctx);

  ctx.fillStyle = '#4c5a3a';
  roundRectPath(ctx, -18, -15, 64, 13, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(-16, -14, 60, 3);

  // Franjas de la rareza
  ctx.fillStyle = tint;
  ctx.fillRect(-10, -15, 4, 13);
  ctx.fillRect(30, -15, 4, 13);

  // Boca y cohete
  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(44, -17, 8, 17);
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.moveTo(52, -13); ctx.lineTo(60, -8.5); ctx.lineTo(52, -4);
  ctx.closePath();
  ctx.fill();

  // Mira
  ctx.fillStyle = METAL;
  ctx.fillRect(6, -21, 12, 6);
}

/** Rifle de Hielo: canon de cristal con picos de escarcha. */
function drawHielo(ctx, tint) {
  grip(ctx);

  ctx.fillStyle = '#2f4a62';
  roundRectPath(ctx, -14, -13, 34, 12, 4);
  ctx.fill();
  ctx.fillStyle = '#9fe6ff';
  ctx.fillRect(-14, -13, 34, 3);

  ctx.fillStyle = 'rgba(170, 235, 255, 0.85)';
  ctx.beginPath();
  ctx.moveTo(18, -12); ctx.lineTo(46, -9); ctx.lineTo(46, -5); ctx.lineTo(18, -2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = tint;
  for (const [x, h] of [[24, 7], [32, 9], [40, 6]]) {
    ctx.beginPath();
    ctx.moveTo(x - 3, -12); ctx.lineTo(x, -12 - h); ctx.lineTo(x + 3, -12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillRect(20, -9, 22, 1.6);
}

/** Arma de Rayo en Cadena: bobina de cobre y una esfera cargada. */
function drawCadena(ctx, tint) {
  grip(ctx);

  ctx.fillStyle = METAL;
  roundRectPath(ctx, -12, -14, 30, 13, 4);
  ctx.fill();
  ctx.fillStyle = METAL_LIGHT;
  ctx.fillRect(-12, -14, 30, 3);

  ctx.fillStyle = METAL_DARK;
  ctx.fillRect(16, -11, 20, 7);
  ctx.strokeStyle = '#c8a04a';
  ctx.lineWidth = 2;
  for (const x of [19, 23, 27, 31]) {
    ctx.beginPath();
    ctx.moveTo(x, -12); ctx.lineTo(x, -3);
    ctx.stroke();
  }

  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.arc(40, -7.5, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.arc(38.5, -9, 2, 0, Math.PI * 2);
  ctx.fill();
}
