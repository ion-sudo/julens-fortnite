/**
 * skinStyle.js
 * ---------------------------------------------------------------
 * DETALLES DE LAS SKINS: lo que hace que un personaje no sea solo un
 * muneco de dos colores.
 *
 * Cada skin puede llevar un `style` en data/cosmetics.js con:
 *
 *   pattern    dibujo de la chaqueta: liso | rayas | camo | chevron | panel
 *              | escamas | circuito | pelaje | lunares | estrellado
 *   emblem     escudo del pecho: rayo | estrella | calavera | rombo | cruz
 *              | llama | luna | ojo | corazon | hueso | engranaje | corona
 *              | pez | pizza
 *   trim       color del ribete (cuello, punos, bajo de la chaqueta)
 *   shoulders  color de las hombreras (null = sin hombreras)
 *   cape       { color, color2 } capa que ondea por detras
 *   glow       color del aura (solo para las mas raras)
 *
 * Todo es OPCIONAL: una skin sin `style` se dibuja igual que siempre,
 * solo que con el sombreado nuevo.
 */

/** Valores por defecto: lo minimo para que nada quede sin definir. */
export const STYLE_DEFAULTS = {
  pattern: 'liso',
  emblem: null,
  trim: null,
  shoulders: null,
  cape: null,
  glow: null,
};

/* =============================================================
   AURA
   Un halo suave detras del personaje. Solo para skins muy raras:
   si lo llevaran todas dejaria de significar nada.
   ============================================================= */
export function drawAura(ctx, color, time) {
  const pulso = 0.72 + 0.28 * Math.sin(time * 2.4);

  ctx.save();
  ctx.globalAlpha = 0.3 * pulso;
  const g = ctx.createRadialGradient(0, -18, 4, 0, -18, 34);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -18, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* =============================================================
   CAPA
   Va DETRAS de todo, y ondea con el tiempo y con el movimiento.
   ============================================================= */
export function drawCape(ctx, capa, time, vel = 0) {
  const ondas = Math.sin(time * 4) * 3 + vel * 0.012;

  ctx.save();
  // Cara exterior
  ctx.fillStyle = capa.color;
  ctx.beginPath();
  ctx.moveTo(-6, -24);
  ctx.quadraticCurveTo(-20 - ondas, -8, -16 - ondas * 1.6, 14);
  ctx.quadraticCurveTo(-8, 10, 2, 12);
  ctx.quadraticCurveTo(4, -6, 4, -24);
  ctx.closePath();
  ctx.fill();

  // Forro, un poco mas claro
  if (capa.color2) {
    ctx.fillStyle = capa.color2;
    ctx.beginPath();
    ctx.moveTo(-1, -23);
    ctx.quadraticCurveTo(-6, -6, -4 - ondas * 0.6, 11);
    ctx.quadraticCurveTo(1, 11, 3, 11);
    ctx.quadraticCurveTo(4, -6, 4, -23);
    ctx.closePath();
    ctx.fill();
  }

  // Cuello de la capa
  ctx.fillStyle = capa.color2 || capa.color;
  ctx.beginPath();
  ctx.ellipse(-1, -25, 8, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* =============================================================
   PATRON DE LA CHAQUETA
   Se pinta DENTRO del torso (el llamador ya ha recortado).
   ============================================================= */
export function drawPattern(ctx, pattern, colores, torsoH) {
  const x0 = -9;
  const y0 = -torsoH - 1;
  const w = 18;
  const h = torsoH + 4;

  switch (pattern) {
    // --- ESCAMAS: filas de medias lunas, como un dragon o un pez ---
    case 'escamas': {
      ctx.fillStyle = colores.jacketDark;
      for (let fila = 0; fila * 5 < h; fila++) {
        const yy = y0 + 3 + fila * 5;
        const desfase = (fila % 2) * 3.5;
        for (let cx = x0 + desfase; cx < x0 + w; cx += 7) {
          ctx.beginPath();
          ctx.arc(cx, yy, 3.1, Math.PI, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    // --- CIRCUITO: pistas y nodos, para las skins robot ---
    case 'circuito': {
      ctx.strokeStyle = colores.trim || colores.accent;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x0 + 3, y0 + 5); ctx.lineTo(x0 + 9, y0 + 5);
      ctx.lineTo(x0 + 9, y0 + 12); ctx.lineTo(x0 + 15, y0 + 12);
      ctx.moveTo(x0 + 5, y0 + h - 6); ctx.lineTo(x0 + 5, y0 + 14);
      ctx.lineTo(x0 + 12, y0 + 14);
      ctx.moveTo(x0 + 14, y0 + 4); ctx.lineTo(x0 + 14, y0 + 9);
      ctx.stroke();

      ctx.fillStyle = colores.trim || colores.accent;
      for (const [nx, ny] of [[9, 5], [15, 12], [5, 14], [14, 4]]) {
        ctx.beginPath();
        ctx.arc(x0 + nx, y0 + ny, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    // --- PELAJE: mechones sueltos, para los peludos ---
    case 'pelaje': {
      ctx.fillStyle = colores.jacketDark;
      for (let i = 0; i < 16; i++) {
        const fx = x0 + 2 + ((i * 5.3) % (w - 4));
        const fy = y0 + 3 + ((i * 7.7) % (h - 6));
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + 2.4, fy + 4.4);
        ctx.lineTo(fx - 1.4, fy + 3.6);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    // --- LUNARES: topos grandes, para las skins mas monas ---
    case 'lunares': {
      ctx.fillStyle = colores.trim || 'rgba(255,255,255,0.5)';
      for (let fila = 0; fila * 6 < h; fila++) {
        const yy = y0 + 5 + fila * 6;
        const desfase = (fila % 2) * 4;
        for (let cx = x0 + 3 + desfase; cx < x0 + w - 1; cx += 8) {
          ctx.beginPath();
          ctx.arc(cx, yy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    // --- ESTRELLADO: cielo de noche en la chaqueta ---
    case 'estrellado': {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const puntos = [[3, 4], [11, 7], [6, 12], [15, 15], [8, 19], [14, 24], [4, 22]];
      for (const [sx, sy] of puntos) {
        if (sy > h - 2) continue;
        ctx.beginPath();
        ctx.arc(x0 + sx, y0 + sy, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      // Un par mas grandes, de cuatro puntas
      ctx.fillStyle = '#ffe9a8';
      for (const [sx, sy] of [[9, 5], [13, 18]]) {
        if (sy > h - 2) continue;
        ctx.beginPath();
        ctx.moveTo(x0 + sx, y0 + sy - 3);
        ctx.lineTo(x0 + sx + 1, y0 + sy);
        ctx.lineTo(x0 + sx + 3, y0 + sy + 1);
        ctx.lineTo(x0 + sx + 1, y0 + sy + 2);
        ctx.lineTo(x0 + sx, y0 + sy + 4);
        ctx.lineTo(x0 + sx - 1, y0 + sy + 2);
        ctx.lineTo(x0 + sx - 3, y0 + sy + 1);
        ctx.lineTo(x0 + sx - 1, y0 + sy);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'rayas':
      ctx.fillStyle = colores.dark;
      for (let y = y0 + 4; y < y0 + h; y += 7) ctx.fillRect(x0, y, w, 3);
      break;

    case 'camo':
      ctx.fillStyle = colores.dark;
      for (const [cx, cy, r] of [[-4, -18, 4], [3, -12, 3.4], [-2, -6, 3], [5, -21, 2.6]]) {
        ctx.beginPath();
        ctx.ellipse(cx, y0 + h + cy, r, r * 0.7, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'chevron':
      ctx.strokeStyle = colores.accent || colores.dark;
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 3; i++) {
        const y = y0 + 7 + i * 7;
        ctx.beginPath();
        ctx.moveTo(x0 + 2, y + 3);
        ctx.lineTo(0, y);
        ctx.lineTo(x0 + w - 2, y + 3);
        ctx.stroke();
      }
      break;

    case 'panel':
      // Dos paneles verticales de distinto tono
      ctx.fillStyle = colores.dark;
      ctx.fillRect(x0, y0, 6, h);
      ctx.fillStyle = colores.accent || 'rgba(255,255,255,0.16)';
      ctx.fillRect(x0 + w - 5, y0, 4, h);
      break;

    default:
      break;
  }
}

/* =============================================================
   EMBLEMA DEL PECHO
   ============================================================= */
export function drawEmblem(ctx, emblem, color, y) {
  ctx.save();
  ctx.translate(1.5, y);
  ctx.fillStyle = color;

  switch (emblem) {
    case 'rayo':
      ctx.beginPath();
      ctx.moveTo(1, -5); ctx.lineTo(-3, 1); ctx.lineTo(0, 1);
      ctx.lineTo(-1, 5); ctx.lineTo(3, -1); ctx.lineTo(0, -1);
      ctx.closePath();
      ctx.fill();
      break;

    case 'estrella':
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 5 : 2.2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;

    case 'calavera':
      ctx.beginPath();
      ctx.ellipse(0, -1, 4, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-2, 2, 4, 2.4);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(-1.6, -1.4, 1.2, 0, Math.PI * 2);
      ctx.arc(1.6, -1.4, 1.2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'rombo':
      ctx.beginPath();
      ctx.moveTo(0, -5); ctx.lineTo(3.6, 0); ctx.lineTo(0, 5); ctx.lineTo(-3.6, 0);
      ctx.closePath();
      ctx.fill();
      break;

    case 'cruz':
      ctx.fillRect(-1.4, -5, 2.8, 10);
      ctx.fillRect(-4.4, -2, 8.8, 2.8);
      break;

    case 'llama':
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.quadraticCurveTo(4.5, -1, 2.6, 3);
      ctx.quadraticCurveTo(0, 6, -2.6, 3);
      ctx.quadraticCurveTo(-4.5, -1, 0, -6);
      ctx.closePath();
      ctx.fill();
      break;

    case 'luna':
      ctx.beginPath();
      ctx.arc(0.6, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(3, -1, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;

    case 'ojo':
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath();
      ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;

    /* ---------- Emblemas nuevos ---------- */

    case 'corazon':
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(-6, -1, -4.5, -5.5, 0, -2);
      ctx.bezierCurveTo(4.5, -5.5, 6, -1, 0, 4);
      ctx.closePath();
      ctx.fill();
      break;

    case 'hueso':
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-3, -2.5); ctx.lineTo(3, 2.5);
      ctx.stroke();
      for (const [hx, hy] of [[-3, -2.5], [3, 2.5]]) {
        ctx.beginPath();
        ctx.arc(hx - 1, hy - 1, 1.6, 0, Math.PI * 2);
        ctx.arc(hx + 1, hy + 1, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'engranaje': {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const r = i % 2 === 0 ? 5 : 3.4;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'corona':
      ctx.beginPath();
      ctx.moveTo(-5, 3);
      ctx.lineTo(-5, -2);
      ctx.lineTo(-2.5, 0.5);
      ctx.lineTo(0, -4);
      ctx.lineTo(2.5, 0.5);
      ctx.lineTo(5, -2);
      ctx.lineTo(5, 3);
      ctx.closePath();
      ctx.fill();
      break;

    case 'pez':
      ctx.beginPath();
      ctx.ellipse(-0.5, 0, 4.4, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(3.6, 0);
      ctx.lineTo(6.4, -2.6);
      ctx.lineTo(6.4, 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.arc(-2.2, -0.6, 0.8, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'pizza': {
      // Un triangulo de pizza, con su borde y su pepperoni.
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(4.2, 4);
      ctx.lineTo(-4.2, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c0562f';
      ctx.beginPath();
      ctx.arc(-1.4, 1.4, 1, 0, Math.PI * 2);
      ctx.arc(1.6, 2.2, 0.9, 0, Math.PI * 2);
      ctx.arc(0.2, -1.4, 0.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

/* =============================================================
   HOMBRERAS
   ============================================================= */
export function drawShoulder(ctx, color, x, y, dir) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 6.2, 5, dir * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Brillo arriba
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(x - dir * 1.2, y - 2, 3.4, 1.8, dir * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
