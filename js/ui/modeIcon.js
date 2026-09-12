/**
 * modeIcon.js
 * ---------------------------------------------------------------
 * Dibujitos de las tarjetas de MODOS DE JUEGO.
 *
 * Mismo estilo que ui/minigameIcon.js: vectorial, sin imagenes, para
 * que se vea nitido a cualquier tamano. El encuadre tambien es el
 * mismo: el dibujo cabe en un cuadrado de 100x100 centrado en el
 * origen (de -50 a 50).
 *
 * Anadir un modo = anadir un `case` aqui y su entrada en data/modes.js.
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} icon   royale | blitz | duos | escuadron | recarga
 * @param {string} color  color de acento del modo
 */
export function drawModeIcon(ctx, icon, color) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (icon) {
    case 'royale': dibujarRoyale(ctx, color); break;
    case 'blitz':  dibujarBlitz(ctx, color); break;
    case 'duos':      dibujarEquipo(ctx, color, 2); break;
    case 'escuadron': dibujarEquipo(ctx, color, 4); break;
    case 'recarga': dibujarRecarga(ctx, color); break;
    default:       dibujarRoyale(ctx, color);
  }

  ctx.restore();
}

/**
 * JULEN ROYALE: el bus de batalla sobre la isla.
 *
 * Es la imagen que resume el modo largo: empiezas arriba, en el bus, y
 * saltas sobre un mapa grande.
 */
function dibujarRoyale(ctx, color) {
  // --- La isla, abajo ---
  ctx.fillStyle = '#8a5c2f';
  ctx.beginPath();
  ctx.moveTo(-44, 22);
  ctx.lineTo(44, 22);
  ctx.lineTo(30, 46);
  ctx.lineTo(-30, 46);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-44, 22);
  ctx.quadraticCurveTo(0, 12, 44, 22);
  ctx.lineTo(44, 28);
  ctx.quadraticCurveTo(0, 18, -44, 28);
  ctx.closePath();
  ctx.fill();

  // Un par de pinos, que es lo que hace que se lea como "isla"
  for (const [x, s] of [[-26, 1], [22, 0.8]]) {
    ctx.fillStyle = '#2f8c49';
    ctx.beginPath();
    ctx.moveTo(x, 18 - 22 * s);
    ctx.lineTo(x + 9 * s, 20);
    ctx.lineTo(x - 9 * s, 20);
    ctx.closePath();
    ctx.fill();
  }

  // --- El globo del bus ---
  ctx.fillStyle = '#e8434f';
  ctx.beginPath();
  ctx.arc(0, -26, 21, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.arc(-7, -28, 8, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  // Cuerdas
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-19, -25); ctx.lineTo(-13, -12);
  ctx.moveTo(19, -25); ctx.lineTo(13, -12);
  ctx.stroke();

  // --- El autobus ---
  ctx.fillStyle = '#f5c23f';
  redondo(ctx, -24, -12, 48, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#c99a1f';
  ctx.fillRect(-24, -1, 48, 5);

  // Ventanillas
  ctx.fillStyle = '#bfefff';
  for (let x = -19; x < 20; x += 11) ctx.fillRect(x, -9, 8, 7);

  // Ruedas
  ctx.fillStyle = '#20242f';
  for (const x of [-14, 14]) {
    ctx.beginPath();
    ctx.arc(x, 6, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * JULEN BLITZ: un rayo dentro del anillo de la tormenta.
 *
 * El anillo va partido y cerrandose (dos arcos que no llegan a juntarse)
 * para que se entienda de un vistazo que aqui la tormenta aprieta.
 */
function dibujarBlitz(ctx, color) {
  // --- Anillo de tormenta, en dos capas ---
  ctx.strokeStyle = 'rgba(150, 80, 220, 0.35)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#b45cf0';
  ctx.lineWidth = 5;
  ctx.setLineDash([13, 9]);
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Flechas hacia dentro: la tormenta se cierra
  ctx.fillStyle = '#d8a8ff';
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 2 + Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(-6, -40);
    ctx.lineTo(6, -40);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- El rayo ---
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(9, -30);
  ctx.lineTo(-14, 4);
  ctx.lineTo(-1, 4);
  ctx.lineTo(-8, 31);
  ctx.lineTo(16, -6);
  ctx.lineTo(2, -6);
  ctx.closePath();
  ctx.fill();

  // Brillo, para que no quede plano
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.moveTo(9, -30);
  ctx.lineTo(-14, 4);
  ctx.lineTo(-7, 4);
  ctx.closePath();
  ctx.fill();
}

/**
 * DUOS y ESCUADRON: siluetas juntas, con la tuya destacada delante.
 *
 * El mismo dibujo sirve para los dos: lo unico que cambia es cuantas
 * hay, que es exactamente lo unico que cambia entre los dos modos.
 */
function dibujarEquipo(ctx, color, cuantos) {
  // Escudo de fondo: se lee como "equipo" antes que como "personas".
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.moveTo(0, -44);
  ctx.lineTo(36, -26);
  ctx.lineTo(36, 6);
  ctx.quadraticCurveTo(36, 34, 0, 46);
  ctx.quadraticCurveTo(-36, 34, -36, 6);
  ctx.lineTo(-36, -26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexA(color, 0.55);
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Las siluetas: la del jugador en el centro y a todo color, las
  // demas detras y apagadas. Se ve de un vistazo quien eres tu.
  const sitios = cuantos === 2
    ? [{ x: -11, s: 0.88, tuyo: false }, { x: 11, s: 1, tuyo: true }]
    : [
        { x: -24, s: 0.74, tuyo: false }, { x: -8, s: 0.86, tuyo: false },
        { x: 9, s: 1, tuyo: true }, { x: 25, s: 0.78, tuyo: false },
      ];

  // De atras hacia delante, para que la tuya tape a las demas.
  for (const p of [...sitios].sort((a, b) => a.s - b.s)) {
    ctx.save();
    ctx.translate(p.x, 6);
    ctx.scale(p.s, p.s);

    ctx.fillStyle = p.tuyo ? color : hexA(color, 0.42);

    // Cabeza
    ctx.beginPath();
    ctx.arc(0, -20, 8, 0, Math.PI * 2);
    ctx.fill();
    // Cuerpo
    ctx.beginPath();
    ctx.moveTo(-11, 14);
    ctx.quadraticCurveTo(-11, -8, 0, -8);
    ctx.quadraticCurveTo(11, -8, 11, 14);
    ctx.closePath();
    ctx.fill();

    // Al tuyo, un galon encima para que no haya duda.
    if (p.tuyo) {
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(0, -36);
      ctx.lineTo(7, -29);
      ctx.lineTo(0, -32);
      ctx.lineTo(-7, -29);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}


/**
 * JULEN RECARGA: la flecha de reaparicion.
 *
 * Un circulo de recarga (como el de "volver a intentarlo") con la
 * silueta de alguien volviendo dentro y el reloj de la cuenta atras
 * en una esquina. Resume el modo de un vistazo: te eliminan, corre un
 * tiempo y vuelves.
 */
function dibujarRecarga(ctx, color) {
  // --- El anillo de recarga, abierto por arriba ---
  ctx.strokeStyle = hexA(color, 0.3);
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.stroke();

  // El tramo "ya cargado": tres cuartos de vuelta.
  ctx.strokeStyle = color;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, 34, -Math.PI * 0.62, Math.PI * 0.92);
  ctx.stroke();

  // Punta de flecha al final del arco, para que se lea como "gira y
  // vuelve" y no como un simple aro.
  ctx.save();
  ctx.translate(Math.cos(-Math.PI * 0.62) * 34, Math.sin(-Math.PI * 0.62) * 34);
  ctx.rotate(-Math.PI * 0.62);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(15, 0);
  ctx.lineTo(0, 13);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // --- La silueta que vuelve, dentro del anillo ---
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -11, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10, 17);
  ctx.quadraticCurveTo(-10, -1, 0, -1);
  ctx.quadraticCurveTo(10, -1, 10, 17);
  ctx.closePath();
  ctx.fill();

  // --- El reloj de la cuenta atras ---
  ctx.fillStyle = '#0e1426';
  ctx.beginPath();
  ctx.arc(30, 31, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Agujas marcando poco tiempo restante.
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(30, 31); ctx.lineTo(30, 22);
  ctx.moveTo(30, 31); ctx.lineTo(37, 34);
  ctx.stroke();
}

/** Un color hex con transparencia. */
function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Rectangulo redondeado (los canvas del menu no tienen roundRect). */
function redondo(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
