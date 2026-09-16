/**
 * defenseSprites.js
 * ---------------------------------------------------------------
 * LOS DIBUJOS DE JULEN DEFENSA: la torre, los zombis, las torres
 * defensivas, las trampas, el portal por el que salen y el fantasma de
 * lo que vas a colocar.
 *
 * Vectorial, como todo el juego: nada de imagenes. Todos reciben la
 * posicion en coordenadas de MUNDO (el juego ya ha aplicado la camara).
 */

import { roundRectPath } from '../core/utils.js';

/* =============================================================
   ZOMBI
   ============================================================= */

/**
 * Se dibuja en un tamano de referencia de 62 px de alto y se escala al
 * de cada tipo: asi la mole y el jefe son el mismo muneco, en grande.
 * Mira a la IZQUIERDA (hacia la torre), con los brazos por delante.
 */
export function drawZombie(ctx, z, time, alpha) {
  const d = z.def;
  const s = z.h / 62;
  const cx = z.x + z.w / 2;
  const pie = z.y + z.h;
  const quieto = z.congelado > 0 || z.dead || z.enAire;
  const andar = quieto ? 0 : Math.sin(z.fase * (d.velocidad / 9));

  // Los voladores dejan la sombra en el suelo, lejos de sus pies.
  if (d.vuela && !z.dead) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.22 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(cx, z.laneY, 18 * s, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, pie);
  // Al morir se hunde un poco mientras se desvanece.
  if (z.dead) ctx.translate(0, (1 - alpha) * 12);
  // Escala negativa en X: se dibuja mirando a +X y sale mirando a la izquierda.
  ctx.scale(-s, s);

  // Sombra (la del volador ya esta pintada en el suelo)
  if (!d.vuela) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const blanco = z.hitFlash > 0;
  const piel = blanco ? '#ffffff' : d.color;
  const ropa = blanco ? '#ffffff' : d.ropa;

  // Alas de murcielago batiendo (solo el volador)
  if (d.vuela) {
    const aleteo = Math.sin(z.fase * 16);
    ctx.fillStyle = blanco ? '#ffffff' : '#3b2f45';
    for (const lado of [-1, 1]) {
      ctx.save();
      ctx.translate(0, -40);
      ctx.scale(1, 0.75 + aleteo * 0.35);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(lado * 28, -16);
      ctx.lineTo(lado * 22, -2);
      ctx.lineTo(lado * 34, 6);
      ctx.lineTo(lado * 10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Piernas
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2d2a33';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-4, -22); ctx.lineTo(-4 + andar * 7, -2);
  ctx.moveTo(5, -22); ctx.lineTo(5 - andar * 7, -2);
  ctx.stroke();

  // Torso con la ropa rota
  ctx.fillStyle = ropa;
  roundRectPath(ctx, -10, -46, 21, 26, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(-6, -30, 5, 4);
  ctx.fillRect(3, -40, 4, 3);

  // La bomba del zombi bomba, con la mecha chispeando
  if (d.explota) {
    ctx.fillStyle = '#2a2a2e';
    ctx.beginPath();
    ctx.arc(1, -32, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c8a06a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, -38);
    ctx.quadraticCurveTo(8, -44, 5, -48);
    ctx.stroke();
    if (Math.sin(time * 14) > 0) {
      ctx.fillStyle = '#ff5a3a';
      ctx.beginPath();
      ctx.arc(5, -48, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Brazos estirados hacia delante; al golpear, mas todavia.
  const brazo = Math.sin(z.fase * 3) * 2 + (z.atacando > 0 ? 8 : 0);
  ctx.strokeStyle = piel;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(6, -42); ctx.lineTo(24 + brazo, -40 + Math.sin(z.fase * 2) * 2);
  ctx.moveTo(4, -36); ctx.lineTo(22 + brazo, -33);
  ctx.stroke();

  // Cabeza
  ctx.fillStyle = piel;
  ctx.beginPath();
  ctx.arc(4, -54, 9, 0, Math.PI * 2);
  ctx.fill();

  // Ojos rojos que brillan: de noche es casi lo primero que se ve.
  ctx.fillStyle = '#ff3b3b';
  ctx.shadowColor = '#ff3b3b';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(8, -56, 1.8, 0, Math.PI * 2);
  ctx.arc(3, -56, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Boca
  ctx.strokeStyle = '#2a1a1a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(3, -49); ctx.lineTo(10, -50);
  ctx.stroke();

  // Corona del jefe
  if (d.jefe) {
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(-4, -62); ctx.lineTo(-2, -70); ctx.lineTo(2, -64);
    ctx.lineTo(5, -72); ctx.lineTo(8, -64); ctx.lineTo(12, -70);
    ctx.lineTo(13, -62);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // --- Estados, por encima del muneco ---
  if (z.congelado > 0 && !z.dead) {
    ctx.save();
    ctx.globalAlpha = 0.45 * alpha;
    ctx.fillStyle = '#9fe6ff';
    roundRectPath(ctx, z.x - 3, z.y - 3, z.w + 6, z.h + 6, 6);
    ctx.fill();
    ctx.restore();
  } else if (z.lento > 0 && !z.dead) {
    ctx.save();
    ctx.strokeStyle = 'rgba(159, 230, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, pie - 2, z.w * 0.7, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Barra de vida, solo si ya le han dado.
  if (!z.dead && z.health < z.maxHealth) {
    const bw = Math.max(34, z.w + 6);
    const bx = cx - bw / 2;
    const by = z.y - (d.jefe ? 16 : 10);
    ctx.fillStyle = 'rgba(10, 16, 34, 0.85)';
    ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = d.jefe ? '#e8434f' : '#7ee06a';
    ctx.fillRect(bx, by, bw * (z.health / z.maxHealth), 5);
  }
}

/* =============================================================
   LA TORRE A DEFENDER
   ============================================================= */

/**
 * Torre de piedra con un FARO ROJO arriba, que de noche brilla mucho
 * mas: es lo que se ve de lejos en mitad de la tormenta.
 * @param {object} b      { x (centro), y (suelo), vida, vidaMax, hitFlash }
 * @param {boolean} noche
 */
export function drawBase(ctx, b, time, noche) {
  const x = b.x;
  const y = b.y;
  const w = 96;
  const h = 230;

  ctx.save();

  // Cuerpo: un poco mas estrecho arriba.
  ctx.fillStyle = b.hitFlash > 0 ? '#f0e6e6' : '#6d6f7a';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2 + 10, y - h);
  ctx.lineTo(x + w / 2 - 10, y - h);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  ctx.fill();

  // Hileras de piedra
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.lineWidth = 2;
  for (let yy = y - 24; yy > y - h; yy -= 26) {
    const entra = ((y - yy) / h) * 10;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + entra, yy);
    ctx.lineTo(x + w / 2 - entra, yy);
    ctx.stroke();
  }

  // Puerta y ventana (encendida de noche)
  ctx.fillStyle = '#3a2a1e';
  roundRectPath(ctx, x - 16, y - 52, 32, 52, 14);
  ctx.fill();
  ctx.fillStyle = noche ? '#ffcf6a' : '#2b3450';
  ctx.fillRect(x - 9, y - 140, 18, 24);

  // Almenas
  ctx.fillStyle = '#5a5c66';
  for (let i = 0; i < 4; i++) ctx.fillRect(x - w / 2 + 10 + i * ((w - 20) / 3.5), y - h - 16, 14, 16);
  ctx.fillStyle = '#4a4c56';
  ctx.fillRect(x - w / 2 + 6, y - h - 4, w - 12, 6);

  // --- Faro rojo ---
  const pulso = 0.6 + 0.4 * Math.sin(time * 4);
  const fuerza = noche ? 1 : 0.45;
  const fx = x;
  const fy = y - h - 34;
  const halo = ctx.createRadialGradient(fx, fy, 2, fx, fy, 90);
  halo.addColorStop(0, `rgba(255, 50, 40, ${0.75 * pulso * fuerza})`);
  halo.addColorStop(1, 'rgba(255, 50, 40, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(fx, fy, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3a3c46';
  ctx.fillRect(fx - 10, fy + 8, 20, 14);
  ctx.fillStyle = `rgb(255, ${Math.round(60 + 60 * pulso)}, 50)`;
  ctx.beginPath();
  ctx.arc(fx, fy + 2, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* =============================================================
   TORRES DEFENSIVAS
   ============================================================= */

/** Pastillas doradas con el nivel. */
function pips(ctx, x, y, n) {
  ctx.fillStyle = '#ffd23f';
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(x - (n - 1) * 4 + i * 8, y, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** @param {object} s { def, x, y (suelo), nivel, angle, flash } */
export function drawTower(ctx, s, time) {
  const { def, x, y } = s;

  ctx.save();

  // Pedestal
  ctx.fillStyle = '#3a3f4c';
  roundRectPath(ctx, x - 22, y - 30, 44, 30, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(x - 22, y - 30, 44, 4);

  // Cabeza
  const hy = y - 44;
  ctx.fillStyle = s.flash > 0 ? '#ffffff' : def.color;
  ctx.beginPath();
  ctx.arc(x, hy, 17, 0, Math.PI * 2);
  ctx.fill();

  // Canon, girado hacia el objetivo. Cada tipo tiene el suyo.
  ctx.save();
  ctx.translate(x, hy);
  ctx.rotate(s.angle ?? Math.PI);
  ctx.fillStyle = '#2b2f3a';
  if (def.id === 'ametralladora') {
    ctx.fillRect(8, -6, 24, 4);
    ctx.fillRect(8, 2, 24, 4);
  } else if (def.id === 'canon') {
    ctx.fillRect(6, -6, 34, 12);
    ctx.fillStyle = def.acento;
    ctx.fillRect(34, -7, 6, 14);
  } else if (def.id === 'hielo') {
    ctx.fillStyle = def.acento;
    ctx.beginPath();
    ctx.moveTo(8, -6); ctx.lineTo(34, 0); ctx.lineTo(8, 6);
    ctx.closePath();
    ctx.fill();
  } else if (def.id === 'tesla') {
    // Bobina y una esfera cargada: no tiene canon.
    ctx.fillStyle = '#c8a04a';
    for (const bx of [6, 11, 16]) ctx.fillRect(bx, -7, 3, 14);
    ctx.fillStyle = def.acento;
    ctx.beginPath();
    ctx.arc(24, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (def.id === 'lanzallamas') {
    ctx.fillRect(6, -5, 22, 10);
    ctx.fillStyle = def.acento;
    ctx.beginPath();
    ctx.moveTo(26, -8); ctx.lineTo(34, -10); ctx.lineTo(34, 10); ctx.lineTo(26, 8);
    ctx.closePath();
    ctx.fill();
  } else if (def.id === 'francotiradora') {
    ctx.fillRect(4, -3, 46, 6);
    ctx.fillStyle = def.acento;
    ctx.fillRect(10, -9, 12, 5);
  } else if (def.id === 'reparadora') {
    // Una cruz en vez de canon: esta no dispara.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -10, 6, 20);
    ctx.fillRect(-10, -3, 20, 6);
  } else {
    ctx.fillRect(2, -8, 20, 16);
    ctx.fillStyle = def.acento;
    ctx.beginPath();
    ctx.arc(22, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = def.acento;
  ctx.beginPath();
  ctx.arc(x, hy, 6, 0, Math.PI * 2);
  ctx.fill();

  pips(ctx, x, y - 12, s.nivel);

  // La de reparacion lanza un anillo verde cada vez que cura.
  if (def.repara && s.flash > 0) {
    ctx.strokeStyle = `rgba(95, 209, 74, ${s.flash})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, hy, 22 + (1 - s.flash) * 20, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/* =============================================================
   TRAMPAS
   ============================================================= */

/** @param {object} s { def, x, y (suelo), nivel, usos, usosMax, flash } */
export function drawTrap(ctx, s, time) {
  const d = s.def;
  const x = s.x;
  const y = s.y;
  const w = d.w;
  const vacia = s.usosMax > 0 && s.usos <= 0;

  ctx.save();
  if (vacia) ctx.globalAlpha = 0.5;

  switch (d.id) {
    case 'pinchos': {
      ctx.fillStyle = d.color;
      roundRectPath(ctx, x - w / 2, y - 7, w, 7, 2);
      ctx.fill();
      ctx.fillStyle = d.acento;
      const sube = s.flash > 0 ? 4 : 0;
      for (let i = 0; i < 6; i++) {
        const px = x - w / 2 + 6 + i * ((w - 12) / 5);
        ctx.beginPath();
        ctx.moveTo(px - 4, y - 6); ctx.lineTo(px, y - 18 - sube); ctx.lineTo(px + 4, y - 6);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'congelante': {
      ctx.fillStyle = d.color;
      roundRectPath(ctx, x - w / 2, y - 8, w, 8, 3);
      ctx.fill();
      ctx.fillStyle = d.acento;
      for (let i = 0; i < 4; i++) {
        const px = x - w / 2 + 12 + i * ((w - 24) / 3);
        ctx.beginPath();
        ctx.moveTo(px, y - 8); ctx.lineTo(px - 3, y - 14); ctx.lineTo(px, y - 20); ctx.lineTo(px + 3, y - 14);
        ctx.closePath();
        ctx.fill();
      }
      if (s.flash > 0) {
        ctx.fillStyle = `rgba(190, 240, 255, ${s.flash * 0.6})`;
        ctx.beginPath();
        ctx.ellipse(x, y - 6, w * 0.7, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'electrica': {
      ctx.fillStyle = d.color;
      roundRectPath(ctx, x - w / 2, y - 8, w, 8, 3);
      ctx.fill();
      for (const dx of [-w / 2 + 10, w / 2 - 10]) {
        ctx.fillStyle = '#8a8f9c';
        ctx.fillRect(x + dx - 3, y - 30, 6, 22);
        ctx.fillStyle = d.acento;
        ctx.beginPath();
        ctx.arc(x + dx, y - 32, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Chispazo entre las dos bobinas: al descargar, y de vez en cuando.
      if (!vacia && (s.flash > 0 || Math.sin(time * 9 + x) > 0.85)) {
        ctx.strokeStyle = d.acento;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - w / 2 + 10, y - 32);
        for (let i = 1; i < 5; i++) ctx.lineTo(x - w / 2 + 10 + i * (w - 20) / 5, y - 32 + (Math.random() - 0.5) * 10);
        ctx.lineTo(x + w / 2 - 10, y - 32);
        ctx.stroke();
      }
      break;
    }

    case 'parrilla': {
      ctx.fillStyle = '#2b2b30';
      roundRectPath(ctx, x - w / 2, y - 9, w, 9, 2);
      ctx.fill();
      const brillo = 0.5 + 0.5 * Math.sin(time * 7 + x * 0.1);
      const fuerte = s.flash > 0 ? 1 : brillo;
      ctx.fillStyle = `rgba(255, ${Math.round(110 + 60 * brillo)}, 40, ${0.55 + 0.35 * fuerte})`;
      const hueco = (w - 10) / 6;
      for (let i = 0; i < 6; i++) ctx.fillRect(x - w / 2 + 5 + i * hueco, y - 8, hueco - 3, 5);
      if (!vacia) {
        ctx.fillStyle = `rgba(255, 140, 40, ${0.25 * brillo})`;
        ctx.beginPath();
        ctx.ellipse(x, y - 12, w * 0.55, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'lanzador': {
      const baja = s.flash > 0 ? -10 * s.flash : 0;
      ctx.fillStyle = '#3a3f4c';
      ctx.fillRect(x - w / 2, y - 6, w, 6);
      // Muelle
      ctx.strokeStyle = '#c8d0dc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(x - 12, y - 8 - i * 4 + baja * 0.3);
        ctx.lineTo(x + 12, y - 10 - i * 4 + baja * 0.3);
      }
      ctx.stroke();
      ctx.fillStyle = d.color;
      roundRectPath(ctx, x - w / 2 + 4, y - 26 + baja, w - 8, 8, 3);
      ctx.fill();
      ctx.fillStyle = d.acento;
      ctx.beginPath();
      ctx.moveTo(x, y - 38 + baja); ctx.lineTo(x + 8, y - 28 + baja); ctx.lineTo(x - 8, y - 28 + baja);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'pegamento': {
      // Charco de brea con burbujas
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.ellipse(x, y - 3, w / 2, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = d.acento;
      for (let i = 0; i < 3; i++) {
        const bx = x - w / 3 + i * (w / 3);
        const r = 2.5 + 1.5 * Math.abs(Math.sin(time * 2 + i * 2 + x));
        ctx.beginPath();
        ctx.arc(bx, y - 6, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'mina': {
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.ellipse(x, y - 4, w / 2, 7, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#3a3f4c';
      ctx.fillRect(x - w / 2, y - 4, w, 4);
      // Luz roja que parpadea (y se queda encendida al saltar)
      const encendida = s.flash > 0 || Math.sin(time * 6 + x) > 0;
      ctx.fillStyle = encendida ? d.acento : '#5a2020';
      ctx.beginPath();
      ctx.arc(x, y - 10, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'empujador': {
      const golpe = s.flash > 0 ? 12 * s.flash : 0;
      ctx.fillStyle = '#3a3f4c';
      ctx.fillRect(x - w / 2, y - 6, w, 6);
      // Placa que golpea hacia el portal (a la derecha)
      ctx.fillStyle = d.color;
      roundRectPath(ctx, x - 6 + golpe, y - 34, 12, 28, 3);
      ctx.fill();
      ctx.fillStyle = d.acento;
      ctx.beginPath();
      ctx.moveTo(x + 10 + golpe, y - 26);
      ctx.lineTo(x + 20 + golpe, y - 20);
      ctx.lineTo(x + 10 + golpe, y - 14);
      ctx.closePath();
      ctx.fill();
      break;
    }

    default: {   // dardos: un poste con agujeros mirando al camino
      ctx.fillStyle = d.color;
      roundRectPath(ctx, x - w / 2, y - 72, w, 72, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(x - w / 2, y - 72, 6, 72);
      ctx.fillStyle = '#1a1a1f';
      for (const yy of [y - 58, y - 42, y - 26]) {
        ctx.beginPath();
        ctx.arc(x + w / 2 - 7, yy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = d.acento;
      ctx.fillRect(x - w / 2 + 4, y - 70, w - 8, 4);
    }
  }

  ctx.globalAlpha = 1;

  // Usos que le quedan
  const alta = d.id === 'dardos';
  if (s.usosMax > 0) {
    const bw = Math.max(30, Math.min(w, 60));
    const by = alta ? y - 82 : y - 46;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.8)';
    ctx.fillRect(x - bw / 2, by, bw, 4);
    ctx.fillStyle = vacia ? '#e8434f' : '#5fd14a';
    ctx.fillRect(x - bw / 2, by, bw * Math.max(0, s.usos / s.usosMax), 4);
  }
  pips(ctx, x, alta ? y - 90 : y - 54, s.nivel);

  ctx.restore();
}

/* =============================================================
   PORTAL Y FANTASMA
   ============================================================= */

/** Por donde salen los zombis. De noche gira y brilla; de dia, apagado. */
export function drawPortal(ctx, x, y, time, activo) {
  const a = activo ? 1 : 0.35;
  ctx.save();

  const g = ctx.createRadialGradient(x, y - 60, 4, x, y - 60, 70);
  g.addColorStop(0, `rgba(190, 80, 255, ${0.7 * a})`);
  g.addColorStop(1, 'rgba(120, 40, 200, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y - 60, 46, 70, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(220, 160, 255, ${0.8 * a})`;
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const giro = time * (1.5 + i);
    ctx.beginPath();
    ctx.ellipse(x, y - 60, 34 - i * 9, 58 - i * 16, 0, giro, giro + Math.PI * 1.3);
    ctx.stroke();
  }
  ctx.restore();
}

/** Lo que vas a colocar, en fantasma: verde si se puede, rojo si no. */
export function drawGhost(ctx, def, tipo, x, y, ok, time) {
  const s = { def, tipo, x, y, nivel: 1, angle: Math.PI, flash: 0, usos: 1, usosMax: 0 };

  ctx.save();
  ctx.globalAlpha = 0.55;
  if (tipo === 'torre') drawTower(ctx, s, time);
  else drawTrap(ctx, s, time);
  ctx.restore();

  ctx.save();
  const color = ok ? 'rgba(95, 209, 74, 0.95)' : 'rgba(232, 67, 79, 0.95)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  const w = tipo === 'torre' ? 46 : def.w;
  ctx.beginPath();
  ctx.ellipse(x, y - 2, w * 0.6, 9, 0, 0, Math.PI * 2);
  ctx.stroke();

  // El alcance, como una raya por el suelo.
  const r = def.alcance || def.radio;
  if (r) {
    ctx.setLineDash([8, 8]);
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(x - r, y - 4);
    ctx.lineTo(x + r, y - 4);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
