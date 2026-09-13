/**
 * defenseHud.js
 * ---------------------------------------------------------------
 * LO QUE SE VE EN PANTALLA en JULEN DEFENSA: el marcador de oleada, el
 * dinero, la vida del jefe, los carteles de "ANOCHECE / AMANECE", las
 * ayudas para colocar y mejorar... y LA TIENDA.
 *
 * La tienda es un panel pintado en el propio lienzo. Los botones se
 * calculan en UNA sola funcion (`botonesTienda`), que usan tanto el
 * dibujo como el modo para saber donde has hecho clic: asi lo que se ve
 * y lo que se pulsa no pueden descuadrarse nunca.
 */

import { roundRectPath } from '../core/utils.js';
import { rarityColor } from '../data/rarities.js';
import { findWeapon } from '../data/weapons.js';
import { DEFENSA, TORRES, TRAMPAS, TIENDA_ARMAS } from '../data/defense.js';
import { control, segunControl } from './controlHints.js';

const FUENTE = '"Trebuchet MS", sans-serif';
const PANEL = { w: 820, h: 480 };
const PESTANAS = [
  { id: 'torres', nombre: 'TORRES' },
  { id: 'trampas', nombre: 'TRAMPAS' },
  { id: 'armas', nombre: 'ARMAS' },
];
const NOMBRE_RAREZA = {
  common: 'Comun', uncommon: 'Poco comun', rare: 'Rara',
  epic: 'Epica', legendary: 'Legendaria', mythic: 'Mitica',
};

/* =============================================================
   BOTONES DE LA TIENDA
   ============================================================= */

function catalogo(pestana) {
  if (pestana === 'torres') return TORRES.map((item) => ({ item, tipo: 'torre' }));
  if (pestana === 'trampas') return TRAMPAS.map((item) => ({ item, tipo: 'trampa' }));
  return TIENDA_ARMAS.map((item) => ({ item, tipo: 'arma' }));
}

function origenPanel(view) {
  return { x: (view.width - PANEL.w) / 2, y: (view.height - PANEL.h) / 2 - 10 };
}

/**
 * Todos los rectangulos pulsables de la tienda.
 * @returns {Array<{accion:string, x:number, y:number, w:number, h:number}>}
 */
export function botonesTienda(view, pestana) {
  const o = origenPanel(view);
  const lista = [];

  lista.push({ accion: 'cerrar', x: o.x + PANEL.w - 48, y: o.y + 14, w: 34, h: 34 });

  PESTANAS.forEach((p, i) => {
    lista.push({ accion: 'pestana', valor: p.id, nombre: p.nombre, x: o.x + 24 + i * 150, y: o.y + 62, w: 140, h: 36 });
  });

  const cols = 3;
  const cw = 250;
  const ch = 96;
  const gap = 14;
  const x0 = o.x + (PANEL.w - (cols * cw + (cols - 1) * gap)) / 2;
  const y0 = o.y + 116;
  catalogo(pestana).forEach((c, i) => {
    lista.push({
      accion: 'comprar', tipo: c.tipo, item: c.item,
      x: x0 + (i % cols) * (cw + gap),
      y: y0 + Math.floor(i / cols) * (ch + gap),
      w: cw, h: ch,
    });
  });

  return lista;
}

/* =============================================================
   HUD PRINCIPAL
   ============================================================= */

export function drawDefenseHud(ctx, m, view, time) {
  if (m.state === 'fin' || !m.base) return;

  ctx.save();
  panelOleada(ctx, m);
  panelDinero(ctx, m);
  barraJefe(ctx, m, view);

  if (!m.player.alive) avisoMuerto(ctx, m, view);
  else if (m.colocando) ayudaColocar(ctx, m, view);
  else if (!m.tienda.abierta) ayudaMejora(ctx, m, view);

  if (m.banner) cartel(ctx, m, view);
  if (m.tienda.abierta) tienda(ctx, m, view, time);
  ctx.restore();
}

/** Arriba a la izquierda: oleada, fase, vida de la torre y teclas. */
function panelOleada(ctx, m) {
  const x = 16;
  const y = 12;
  const w = 430;
  const h = 98;
  const noche = m.fase === 'noche';

  ctx.fillStyle = 'rgba(10, 16, 34, 0.86)';
  roundRectPath(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = noche ? 'rgba(232, 67, 79, 0.85)' : 'rgba(255, 210, 63, 0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = `bold 21px ${FUENTE}`;
  ctx.fillStyle = '#ffffff';
  const titulo = m.oleada === 0 ? 'PREPARA LA DEFENSA' : `OLEADA ${m.oleada} / ${DEFENSA.oleadas}`;
  ctx.fillText(titulo, x + 16, y + 28);

  ctx.font = `bold 13px ${FUENTE}`;
  if (noche) {
    ctx.fillStyle = '#ff9a9a';
    ctx.fillText(`NOCHE · quedan ${m.zombiesRestantes} zombis`, x + 16, y + 49);
  } else {
    ctx.fillStyle = '#ffd76a';
    const s = Math.max(0, Math.ceil(m.cuenta));
    ctx.fillText(`DIA · la oleada ${m.oleada + 1} llega en ${s} s · ${control('ready')} para empezar ya`, x + 16, y + 49);
  }

  // Vida de la torre
  const bw = w - 32;
  const bx = x + 16;
  const by = y + 60;
  const r = Math.max(0, m.base.vida / m.base.vidaMax);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(bx, by, bw, 10);
  ctx.fillStyle = r > 0.5 ? '#5fd14a' : r > 0.25 ? '#ffb03a' : '#e8434f';
  ctx.fillRect(bx, by, bw * r, 10);

  ctx.font = `bold 10px ${FUENTE}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(`TORRE ${Math.ceil(m.base.vida)} / ${m.base.vidaMax}`, bx, by + 25);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText(segunControl('T tienda · G mejorar · P empezar', 'Botones TIENDA · MEJORAR · EMPEZAR'), bx + bw, by + 25);
}

function panelDinero(ctx, m) {
  const x = 16;
  const y = 118;
  ctx.fillStyle = 'rgba(10, 16, 34, 0.86)';
  roundRectPath(ctx, x, y, 150, 38, 19);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 210, 63, 0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = `bold 20px ${FUENTE}`;
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(`$ ${m.dinero}`, x + 18, y + 26);
}

/** Vida del jefe, grande y arriba en el centro, mientras este vivo. */
function barraJefe(ctx, m, view) {
  const jefe = m.zombies.find((z) => z.def.jefe && !z.dead);
  if (!jefe) return;

  const w = 420;
  const x = (view.width - w) / 2;
  const y = 124;
  ctx.textAlign = 'center';
  ctx.font = `bold 14px ${FUENTE}`;
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(6, 10, 22, 0.9)';
  ctx.strokeText(jefe.def.name.toUpperCase(), view.width / 2, y - 6);
  ctx.fillStyle = '#ff8a8a';
  ctx.fillText(jefe.def.name.toUpperCase(), view.width / 2, y - 6);

  ctx.fillStyle = 'rgba(10, 16, 34, 0.9)';
  roundRectPath(ctx, x, y, w, 14, 7);
  ctx.fill();
  ctx.fillStyle = '#e8434f';
  roundRectPath(ctx, x + 2, y + 2, (w - 4) * (jefe.health / jefe.maxHealth), 10, 5);
  ctx.fill();
}

/** Cartel de abajo, encima del inventario. */
function cajaAyuda(ctx, view, lineas, color) {
  ctx.font = `bold 15px ${FUENTE}`;
  const ancho = Math.max(...lineas.map((l) => ctx.measureText(l).width)) + 40;
  const alto = 18 + lineas.length * 22;
  const x = (view.width - ancho) / 2;
  const y = view.height - 150 - alto;

  ctx.fillStyle = 'rgba(10, 16, 34, 0.88)';
  roundRectPath(ctx, x, y, ancho, alto, 10);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  lineas.forEach((l, i) => {
    ctx.fillStyle = i === 0 ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(l, view.width / 2, y + 26 + i * 22);
  });
}

function ayudaColocar(ctx, m, view) {
  const c = m.colocando;
  const lineas = [segunControl(
    `Clic: colocar ${c.def.name} ($${c.def.precio}) · clic derecho: cancelar`,
    `Toca el camino: colocar ${c.def.name} ($${c.def.precio}) · CANCELAR`
  )];
  if (!c.ok && c.motivo) lineas.push(c.motivo);
  cajaAyuda(ctx, view, lineas, c.ok ? 'rgba(95, 209, 74, 0.8)' : 'rgba(232, 67, 79, 0.8)');
}

function ayudaMejora(ctx, m, view) {
  const s = m.estructuras.cercana(m.player.x + m.player.w / 2, 90);
  if (!s) return;

  const accion = m.estructuras.accionMejora(s);
  const lineas = [];
  if (!accion) lineas.push(`${s.def.name} · nivel maximo`);
  else if (accion.tipo === 'mejorar') lineas.push(`G · Mejorar ${s.def.name} a nivel ${s.nivel + 1} ($${accion.precio})`);
  else lineas.push(`G · Recargar ${s.def.name} ($${accion.precio})`);
  if (s.tipo === 'trampa') lineas.push(`Usos: ${s.usos} / ${s.usosMax}`);

  cajaAyuda(ctx, view, lineas, 'rgba(255, 210, 63, 0.7)');
}

function avisoMuerto(ctx, m, view) {
  const falta = Math.max(0, Math.ceil(DEFENSA.respawnJugador - m.muerteJugador));
  ctx.textAlign = 'center';
  ctx.font = `bold 30px ${FUENTE}`;
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(6, 10, 22, 0.9)';
  const texto = `Te han tumbado · vuelves en ${falta} s`;
  ctx.strokeText(texto, view.width / 2, view.height * 0.4);
  ctx.fillStyle = '#ff8a8a';
  ctx.fillText(texto, view.width / 2, view.height * 0.4);
}

/** ANOCHECE / AMANECE / JEFE: el cartel grande de los cambios de fase. */
function cartel(ctx, m, view) {
  const b = m.banner;
  const alpha = Math.min(1, b.vida / 0.5);
  const y = view.height * 0.3;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(6, 10, 22, 0.9)';

  ctx.font = `bold 54px ${FUENTE}`;
  ctx.strokeText(b.texto, view.width / 2, y);
  ctx.fillStyle = b.color || '#ffffff';
  ctx.fillText(b.texto, view.width / 2, y);

  if (b.sub) {
    ctx.font = `bold 20px ${FUENTE}`;
    ctx.lineWidth = 5;
    ctx.strokeText(b.sub, view.width / 2, y + 36);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(b.sub, view.width / 2, y + 36);
  }
  ctx.restore();
}

/* =============================================================
   LA TIENDA
   ============================================================= */

function tienda(ctx, m, view, time) {
  const o = origenPanel(view);
  const cursor = { x: m.game.mouse.screenX, y: m.game.mouse.screenY };
  const encima = (b) => cursor.x >= b.x && cursor.x <= b.x + b.w && cursor.y >= b.y && cursor.y <= b.y + b.h;

  // Velo
  ctx.fillStyle = 'rgba(6, 10, 24, 0.55)';
  ctx.fillRect(0, 0, view.width, view.height);

  // Panel
  ctx.fillStyle = 'rgba(13, 20, 42, 0.97)';
  roundRectPath(ctx, o.x, o.y, PANEL.w, PANEL.h, 16);
  ctx.fill();
  ctx.strokeStyle = '#e8434f';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = `bold 24px ${FUENTE}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TIENDA DE DEFENSA', o.x + 24, o.y + 42);

  ctx.textAlign = 'right';
  ctx.font = `bold 20px ${FUENTE}`;
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(`$ ${m.dinero}`, o.x + PANEL.w - 64, o.y + 40);

  for (const b of botonesTienda(view, m.tienda.pestana)) {
    if (b.accion === 'cerrar') {
      ctx.fillStyle = encima(b) ? '#e8434f' : 'rgba(255, 255, 255, 0.1)';
      roundRectPath(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.font = `bold 18px ${FUENTE}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('X', b.x + b.w / 2, b.y + 24);
    } else if (b.accion === 'pestana') {
      const activa = m.tienda.pestana === b.valor;
      ctx.fillStyle = activa ? '#e8434f' : (encima(b) ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.07)');
      roundRectPath(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.font = `bold 15px ${FUENTE}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.nombre, b.x + b.w / 2, b.y + 24);
    } else {
      tarjeta(ctx, b, m, encima(b));
    }
  }

  ctx.textAlign = 'center';
  ctx.font = `bold 12px ${FUENTE}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText(segunControl('Clic en algo para comprarlo · T para cerrar', 'Toca algo para comprarlo · TIENDA para cerrar'), view.width / 2, o.y + PANEL.h - 14);
}

function tarjeta(ctx, b, m, encima) {
  const it = b.item;
  const puede = m.dinero >= it.precio;

  let nombre = it.name;
  let desc = it.desc;
  let detalle = '';
  let color = '#e8434f';

  if (b.tipo === 'torre') {
    detalle = `Dano ${it.dano} · Alcance ${it.alcance}`;
    color = it.acento;
  } else if (b.tipo === 'trampa') {
    detalle = `Dano ${it.dano} · ${it.usos} usos`;
    color = it.acento;
  } else if (it.arma) {
    const def = findWeapon(it.arma);
    nombre = def ? def.name : it.arma;
    desc = def?.desc || '';
    detalle = NOMBRE_RAREZA[it.rareza] || it.rareza;
    color = rarityColor(it.rareza);
  } else {
    detalle = 'Todas las balas al maximo';
    color = '#5fd14a';
  }

  ctx.fillStyle = encima && puede ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.06)';
  roundRectPath(ctx, b.x, b.y, b.w, b.h, 10);
  ctx.fill();
  ctx.strokeStyle = encima ? color : 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Franja de color
  ctx.fillStyle = color;
  roundRectPath(ctx, b.x, b.y, 6, b.h, 3);
  ctx.fill();

  ctx.globalAlpha = puede ? 1 : 0.5;
  ctx.textAlign = 'left';
  ctx.font = `bold 15px ${FUENTE}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nombre, b.x + 16, b.y + 24);

  ctx.font = `12px ${FUENTE}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(recortar(ctx, desc, b.w - 30), b.x + 16, b.y + 44);

  ctx.font = `bold 12px ${FUENTE}`;
  ctx.fillStyle = color;
  ctx.fillText(detalle, b.x + 16, b.y + 64);

  ctx.textAlign = 'right';
  ctx.font = `bold 17px ${FUENTE}`;
  ctx.fillStyle = puede ? '#ffd23f' : '#e8434f';
  ctx.fillText(`$${it.precio}`, b.x + b.w - 14, b.y + 84);
  ctx.globalAlpha = 1;
}

/** Recorta un texto con puntos suspensivos si no cabe. */
function recortar(ctx, texto, ancho) {
  if (!texto || ctx.measureText(texto).width <= ancho) return texto || '';
  let t = texto;
  while (t.length > 3 && ctx.measureText(`${t}...`).width > ancho) t = t.slice(0, -1);
  return `${t}...`;
}
