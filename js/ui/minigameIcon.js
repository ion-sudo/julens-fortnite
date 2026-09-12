/**
 * minigameIcon.js
 * ---------------------------------------------------------------
 * Dibujitos de las tarjetas de MINIJUEGOS.
 *
 * Son canvas pequenos, al estilo del resto del menu: nada de imagenes,
 * todo vectorial, para que se vean nitidos a cualquier tamano.
 *
 * El encuadre es siempre el mismo: el dibujo cabe en un cuadrado de
 * 100x100 centrado en el origen (de -50 a 50).
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} icon   diana | maniqui | bandera | ladrillo | duelo | moneda | huella
 * @param {string} color  color de acento del minijuego
 */
export function drawMinigameIcon(ctx, icon, color) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (icon) {
    case 'diana':    dibujarDiana(ctx, color); break;
    case 'maniqui':  dibujarManiqui(ctx, color); break;
    case 'bandera':  dibujarBandera(ctx, color); break;
    case 'ladrillo': dibujarLadrillo(ctx, color); break;
    case 'duelo':    dibujarDuelo(ctx, color); break;
    case 'moneda':   dibujarMoneda(ctx, color); break;
    case 'huella':   dibujarHuella(ctx, color); break;
    default:         dibujarDiana(ctx, color);
  }

  ctx.restore();
}

/** Campo de tiro: una diana con su flecha clavada. */
function dibujarDiana(ctx, color) {
  const anillos = ['#f2f4f8', color, '#f2f4f8', color];
  for (let i = 0; i < anillos.length; i++) {
    ctx.fillStyle = anillos[i];
    ctx.beginPath();
    ctx.arc(-4, 0, 40 - i * 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Flecha clavada arriba a la derecha
  ctx.strokeStyle = '#7a4b26';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(6, -10);
  ctx.lineTo(44, -46);
  ctx.stroke();

  ctx.fillStyle = '#c8d0dc';
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(14, -18);
  ctx.lineTo(4, -20);
  ctx.closePath();
  ctx.fill();
}

/** Entrenamiento: un maniqui de practica. */
function dibujarManiqui(ctx, color) {
  // Poste
  ctx.fillStyle = '#7a4b26';
  ctx.fillRect(-5, 6, 10, 40);
  ctx.fillStyle = '#5e3819';
  ctx.fillRect(-20, 42, 40, 8);

  // Saco
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -14, 24, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // Correas
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 4;
  for (const y of [-28, -14, 0]) {
    ctx.beginPath();
    ctx.moveTo(-22, y);
    ctx.lineTo(22, y);
    ctx.stroke();
  }

  // Marca de impacto
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(8, -20, 6, 0, Math.PI * 2);
  ctx.fill();
}

/** Parkour: bandera de meta sobre unas plataformas. */
function dibujarBandera(ctx, color) {
  // Plataformas en escalera
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(-46, 30, 30, 8);
  ctx.fillRect(-16, 12, 30, 8);

  // Mastil
  ctx.strokeStyle = '#c8d0dc';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(18, 36);
  ctx.lineTo(18, -42);
  ctx.stroke();

  // Bandera a cuadros
  ctx.fillStyle = color;
  ctx.fillRect(18, -42, 32, 24);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (let fx = 0; fx < 4; fx++) {
    for (let fy = 0; fy < 3; fy++) {
      if ((fx + fy) % 2 === 0) ctx.fillRect(18 + fx * 8, -42 + fy * 8, 8, 8);
    }
  }
}

/** Caja de construccion: piezas de madera apiladas. */
function dibujarLadrillo(ctx, color) {
  // Suelo
  ctx.fillStyle = color;
  ctx.fillRect(-40, 24, 80, 14);
  // Pared
  ctx.fillStyle = '#a9763f';
  ctx.fillRect(-38, -20, 20, 44);
  // Rampa
  ctx.fillStyle = '#dcae74';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(-8 + i * 12, 24 - (i + 1) * 11, 12, (i + 1) * 11);
  }
  // Contorno
  ctx.strokeStyle = 'rgba(70,44,20,0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-38, -20, 20, 44);
  ctx.strokeRect(-40, 24, 80, 14);
}

/** 1 contra 1: dos siluetas enfrentadas. */
function dibujarDuelo(ctx, color) {
  for (const [dx, c] of [[-22, '#3f7fe8'], [22, color]]) {
    ctx.fillStyle = c;
    // Cabeza
    ctx.beginPath();
    ctx.arc(dx, -22, 11, 0, Math.PI * 2);
    ctx.fill();
    // Cuerpo
    ctx.beginPath();
    ctx.moveTo(dx - 12, -8);
    ctx.lineTo(dx + 12, -8);
    ctx.lineTo(dx + 9, 30);
    ctx.lineTo(dx - 9, 30);
    ctx.closePath();
    ctx.fill();
  }

  // Chispa del choque en medio
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? 15 : 6;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r - 4);
  }
  ctx.closePath();
  ctx.fill();
}

/** Recoge-monedas: una moneda con su brillo. */
function dibujarMoneda(ctx, color) {
  ctx.fillStyle = '#b98f10';
  ctx.beginPath();
  ctx.ellipse(0, 2, 36, 38, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -2, 36, 38, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#b98f10';
  ctx.font = 'bold 40px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('V', 0, 0);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-14, -20, 9, 5, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

/** Pilla-pilla: huellas corriendo. */
function dibujarHuella(ctx, color) {
  for (const [x, y, s] of [[-26, 18, 1], [2, -4, 0.9], [28, -26, 0.8]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.rotate(-0.5);

    ctx.fillStyle = color;
    ctx.globalAlpha = s;
    // Planta
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dedos
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(-8 + i * 5.5, -20, 2.6, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
