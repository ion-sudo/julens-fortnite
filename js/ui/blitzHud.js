/**
 * blitzHud.js
 * ---------------------------------------------------------------
 * MARCADOR DEL NIVEL BLITZ, abajo a la izquierda.
 *
 * Ocupa el sitio del contador de madera, que en este modo no existe
 * (no se construye). Ensena tres cosas:
 *
 *   - la ESCALERA de los 8 niveles, con el color del arma de cada uno
 *   - el NIVEL Blitz actual, en un rombo dorado
 *   - la BARRA de XP hasta el siguiente nivel
 *   - los POTENCIADORES cogidos, con su icono y cuantas veces
 *
 * Y aparte, en medio de la pantalla, el CARTELON de subida de nivel.
 *
 * Se dibuja en coordenadas de PANTALLA, encima de todo.
 */

import { roundRectPath } from '../core/utils.js';
import { BLITZ_LEVEL_RARITY, BLITZ_MAX_LEVEL } from '../data/blitz.js';
import { rarityColor } from '../data/rarities.js';

const X = 34;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../systems/blitz.js').BlitzManager} blitz
 * @param {{width:number, height:number}} view
 * @param {number} time
 */
export function drawBlitzHud(ctx, blitz, view, time) {
  if (!blitz) return;

  // Justo encima de la barra de ESCUDO, dejando sitio a su etiqueta:
  // la barra empieza en `height - 122` y el rotulo va 4 px por encima.
  const y = view.height - 180;
  const ancho = 196;
  const alto = 36;

  ctx.save();

  // Al subir de nivel el panel se enciende un momento: es la forma de
  // que se note sin tapar la pantalla con un cartel.
  const brillo = blitz.flash > 0 ? blitz.flash / 1.6 : 0;

  // --- Panel ---
  ctx.fillStyle = 'rgba(12, 18, 36, 0.78)';
  roundRectPath(ctx, X, y, ancho, alto, 8);
  ctx.fill();
  ctx.strokeStyle = brillo > 0
    ? `rgba(255, 240, 160, ${0.5 + brillo * 0.5})`
    : 'rgba(255, 176, 58, 0.75)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, X, y, ancho, alto, 8);
  ctx.stroke();

  // --- Rombo con el nivel ---
  const cx = X + 24;
  const cy = y + alto / 2;
  const r = 14 + brillo * 3;

  ctx.fillStyle = '#ffb03a';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.82, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.82, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2b1a06';
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(blitz.level), cx, cy + 1);

  // --- Texto y barra de XP ---
  const bx = X + 46;
  const bw = ancho - 58;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.fillText('NIVEL BLITZ', bx, y + 14);

  if (blitz.level >= blitz.maxLevel) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('AL MAXIMO', X + ancho - 12, y + 14);
    ctx.textAlign = 'left';
  }

  // Canal
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  roundRectPath(ctx, bx, y + 20, bw, 8, 4);
  ctx.fill();

  // Relleno
  const relleno = bw * blitz.progress;
  if (relleno > 2) {
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#ffd23f');
    g.addColorStop(1, '#ff8a3d');
    ctx.fillStyle = g;
    roundRectPath(ctx, bx, y + 20, relleno, 8, 4);
    ctx.fill();
  }

  ctx.restore();

  drawEscalera(ctx, blitz, view, y - 8);
  drawBoosts(ctx, blitz, view, y - 30, time);
}

/* =============================================================
   ESCALERA DE NIVELES
   ============================================================= */

/**
 * Los 8 niveles en fila, cada uno con el color del arma que regala.
 *
 * Es lo que deja ver de un vistazo POR DONDE VAS y, sobre todo, QUE
 * FALTA: que el ultimo peldano sea turquesa cuenta solo que arriba del
 * todo hay una exotica esperando.
 */
function drawEscalera(ctx, blitz, view, baseY) {
  const ANCHO = 20;
  const ALTO = 7;
  const SEP = 3;
  const y = baseY - ALTO;
  const total = BLITZ_MAX_LEVEL * (ANCHO + SEP) - SEP;

  ctx.save();

  // Fondo oscuro detras: los peldanos son barritas de color y sobre un
  // cielo claro o una pared blanca no se leian.
  ctx.fillStyle = 'rgba(12, 18, 36, 0.72)';
  roundRectPath(ctx, X - 5, y - 4, total + 10, ALTO + 8, 5);
  ctx.fill();

  for (let n = 1; n <= BLITZ_MAX_LEVEL; n++) {
    const x = X + (n - 1) * (ANCHO + SEP);
    const rareza = BLITZ_LEVEL_RARITY[n - 1];
    const color = rareza ? rarityColor(rareza) : '#8d97a6';
    const hecho = n <= blitz.level;

    // Los ya pasados van a todo color; los que faltan, apagados pero
    // con SU color, para saber que hay al final del camino.
    ctx.fillStyle = hecho ? color : 'rgba(255,255,255,0.10)';
    roundRectPath(ctx, x, y, ANCHO, ALTO, 3);
    ctx.fill();

    if (!hecho) {
      ctx.strokeStyle = hexA(color, 0.5);
      ctx.lineWidth = 1.2;
      roundRectPath(ctx, x, y, ANCHO, ALTO, 3);
      ctx.stroke();
    }

    // El peldano en el que estas, marcado con una muesca encima.
    if (n === blitz.level) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x + ANCHO / 2, y - 6);
      ctx.lineTo(x + ANCHO / 2 + 4, y - 1.5);
      ctx.lineTo(x + ANCHO / 2 - 4, y - 1.5);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

/** Un color hex con transparencia. */
function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* =============================================================
   CARTELON DE SUBIDA DE NIVEL
   ============================================================= */

/**
 * "NIVEL 2" en grande, y debajo lo que cae del cielo.
 *
 * Se pinta en medio de la pantalla, por encima de todo. Entra de golpe,
 * aguanta y se va desvaneciendo: subir de nivel tiene que notarse
 * aunque estes en mitad de un tiroteo.
 */
export function drawBlitzBanner(ctx, blitz, view, time) {
  const b = blitz?.banner;
  if (!b) return;

  const t = 1 - b.life / b.max;          // 0 recien salido, 1 a punto de irse
  const entrada = Math.min(1, t / 0.12);  // aparece rapido
  const salida = Math.min(1, b.life / 0.6);

  // Por debajo del rotulo de zona ("DUNAS SECAS", arriba del todo): a
  // 0,30 el "NIVEL 7" le rozaba las letras y parecia un fallo.
  const cy = view.height * 0.37;

  ctx.save();
  ctx.globalAlpha = entrada * salida;
  ctx.textAlign = 'center';

  const color = rarityColor(b.rareza);

  // Un rebote corto al aparecer
  const escala = 1 + (1 - entrada) * 0.35;
  ctx.translate(view.width / 2, cy);
  ctx.scale(escala, escala);

  // --- Resplandor detras ---
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 300);
  g.addColorStop(0, hexA(color, 0.30));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-300, -110, 600, 220);

  // --- NIVEL N ---
  ctx.font = 'bold 68px "Trebuchet MS", sans-serif';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(6, 10, 22, 0.9)';
  ctx.strokeText(`NIVEL ${b.nivel}`, 0, -6);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`NIVEL ${b.nivel}`, 0, -6);

  // --- El arma que cae ---
  if (b.arma) {
    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(6, 10, 22, 0.9)';
    ctx.strokeText(b.arma, 0, 34);
    ctx.fillStyle = color;
    ctx.fillText(b.arma, 0, 34);

    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(6, 10, 22, 0.9)';
    ctx.strokeText('CAYENDO DEL CIELO', 0, 56);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('CAYENDO DEL CIELO', 0, 56);
  }

  // --- Y la bendicion, mas pequena ---
  if (b.boost) {
    ctx.font = 'bold 17px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(6, 10, 22, 0.9)';
    ctx.strokeText(`Bendicion: ${b.boost}`, 0, 82);
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(`Bendicion: ${b.boost}`, 0, 82);
  }

  ctx.restore();
}

/* =============================================================
   POTENCIADORES
   ============================================================= */

/** Fila de fichas con los potenciadores cogidos, encima del panel. */
function drawBoosts(ctx, blitz, view, baseY, time) {
  if (blitz.boosts.length === 0) return;

  const LADO = 30;
  const SEP = 6;

  ctx.save();
  ctx.textBaseline = 'middle';

  blitz.boosts.forEach((b, i) => {
    const x = X + i * (LADO + SEP);
    const y = baseY - LADO;

    // Ficha
    ctx.fillStyle = 'rgba(12, 18, 36, 0.86)';
    roundRectPath(ctx, x, y, LADO, LADO, 7);
    ctx.fill();
    ctx.strokeStyle = b.def.color;
    ctx.lineWidth = 2;
    roundRectPath(ctx, x, y, LADO, LADO, 7);
    ctx.stroke();

    // Icono
    ctx.save();
    ctx.translate(x + LADO / 2, y + LADO / 2);
    drawBoostIcon(ctx, b.def.icon, b.def.color);
    ctx.restore();

    // Cuantas veces lo llevas (solo si va por mas de una).
    if (b.count > 1) {
      ctx.fillStyle = '#0d1424';
      ctx.beginPath();
      ctx.arc(x + LADO - 3, y + LADO - 3, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.def.color;
      ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`x${b.count}`, x + LADO - 3, y + LADO - 2);
    }
  });

  ctx.restore();
}

/**
 * Dibujos de los potenciadores, en un cuadrado de 20x20 centrado en el
 * origen. Uno por `icon` de data/blitz.js.
 */
function drawBoostIcon(ctx, icon, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  switch (icon) {
    // Furia: una espada
    case 'espada':
      ctx.beginPath();
      ctx.moveTo(-6, 7); ctx.lineTo(5, -6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(2, -8); ctx.lineTo(8, -8); ctx.lineTo(8, -2);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8, 2); ctx.lineTo(-1, 9);
      ctx.stroke();
      break;

    // Ligereza: un ala
    case 'ala':
      ctx.beginPath();
      ctx.moveTo(-9, 5);
      ctx.quadraticCurveTo(-2, -9, 9, -6);
      ctx.quadraticCurveTo(2, -1, -1, 6);
      ctx.closePath();
      ctx.fill();
      break;

    // Vigor: un corazon
    case 'corazon':
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.bezierCurveTo(-11, 0, -8, -9, 0, -3);
      ctx.bezierCurveTo(8, -9, 11, 0, 0, 8);
      ctx.closePath();
      ctx.fill();
      break;

    // Gatillo rapido: un rayo
    case 'rayo':
      ctx.beginPath();
      ctx.moveTo(2, -9); ctx.lineTo(-6, 1); ctx.lineTo(-1, 1);
      ctx.lineTo(-3, 9); ctx.lineTo(6, -2); ctx.lineTo(1, -2);
      ctx.closePath();
      ctx.fill();
      break;

    // Sanguijuela: una gota
    case 'gota':
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.bezierCurveTo(7, -1, 7, 8, 0, 8);
      ctx.bezierCurveTo(-7, 8, -7, -1, 0, -9);
      ctx.closePath();
      ctx.fill();
      break;

    // Coraza: un escudo
    case 'escudo':
    default:
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(8, -5);
      ctx.lineTo(8, 2);
      ctx.quadraticCurveTo(8, 7, 0, 9);
      ctx.quadraticCurveTo(-8, 7, -8, 2);
      ctx.lineTo(-8, -5);
      ctx.closePath();
      ctx.fill();
      break;
  }
}
