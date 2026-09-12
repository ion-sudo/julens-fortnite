/**
 * playerSprite.js
 * ---------------------------------------------------------------
 * DIBUJO del personaje (vista de perfil), separado de su logica.
 * Todo es vectorial (canvas), sin sprites externos: eso permite
 * RECOLOREARLO por completo con la SKIN equipada.
 *
 * El origen local del dibujo esta en los PIES, centrado en X:
 *   (0, 0) = centro de la base de la hitbox,  Y negativo = hacia arriba.
 *
 * Una "skin" es una entrada de js/data/cosmetics.js:
 *   { palette: {...colores...}, head: { tipo, color, color2 } }
 */

import { CONFIG } from '../core/config.js';
import { applyEmote } from './emoteAnim.js';
import { SKINS } from '../data/cosmetics.js';
import { fillRoundRect } from '../core/utils.js';
import { drawWeapon } from './weaponSprite.js';
import { drawHeal } from './healSprite.js';
import { drawPickaxe, drawGlider } from './gearSprite.js';
import {
  STYLE_DEFAULTS, drawAura, drawCape, drawPattern, drawEmblem, drawShoulder,
} from './skinStyle.js';

/** Proporciones base pensadas para una altura de pie de 58 px. */
const BASE_HEIGHT = 58;

/** Skin de reserva si no se pasa ninguna (la gratuita). */
const DEFAULT_SKIN = SKINS[0];

/* =============================================================
   API PUBLICA
   ============================================================= */

/**
 * Dibuja al jugador de la partida en coordenadas de mundo.
 * @param {object} player  instancia de Player
 * @param {number} time    segundos transcurridos (para el idle)
 * @param {object} [skin]  definicion de skin; por defecto la gratuita
 * @param {object} [gear]  { item, recoil, glider } lo que lleva encima
 */
export function drawPlayer(ctx, player, time, skin = DEFAULT_SKIN, gear = null) {
  const pose = getPose(player, time);

  // El brazo delantero apunta hacia el raton cuando lleva algo en la mano.
  // Como el sprite se voltea con scale(facing, 1), hay que reflejar el
  // angulo: un vector (cos a, sin a) del mundo es (cos(PI-a), sin(PI-a))
  // dentro del espacio ya volteado.
  if (gear?.item) {
    pose.held = gear.item;
    pose.recoil = gear.recoil || 0;
    pose.aim = player.facing === 1 ? player.aimAngle : Math.PI - player.aimAngle;
    pose.action = player.action;
    pose.actionTimer = player.actionTimer;
  }

  ctx.save();

  // --- Sombra en el suelo (independiente de la pose) ---
  const shadowAlpha = player.onGround ? 0.22 : 0.12;
  ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(player.x + player.w / 2, player.y + player.h + 2, player.w * 0.62, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- Parpadeo al reaparecer ---
  if (player.respawnFlash > 0 && Math.floor(player.respawnFlash * 12) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  // --- Transformacion: pies del personaje, direccion y squash ---
  ctx.translate(player.x + player.w / 2, player.y + player.h);
  ctx.scale(player.facing, 1);

  // Squash & stretch: se aplasta al aterrizar y se estira al saltar.
  const squashY = 1 + player.squash * 0.13;
  const squashX = 1 - player.squash * 0.10;
  // Si algun dia cambiamos la altura del jugador en CONFIG, el dibujo escala solo.
  // (Agachado NO se escala: la pose de getPose() ya viene "encogida".)
  const heightScale = player.crouching ? 1 : CONFIG.player.height / BASE_HEIGHT;
  ctx.scale(squashX, squashY * heightScale);

  drawCharacter(ctx, pose, skin);

  // La paravela va por encima, colgando del personaje.
  if (player.flight === 'planeando' && gear?.glider) {
    ctx.save();
    // Se compensa el volteo para que la paravela no salga del reves
    ctx.scale(player.facing, 1);
    drawGlider(ctx, gear.glider, { x: 0, y: -104, scale: 0.85 });
    // Cuerdas hasta las manos
    ctx.strokeStyle = 'rgba(60, 60, 70, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, -92); ctx.lineTo(-5, -56);
    ctx.moveTo(16, -92); ctx.lineTo(5, -56);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  // --- Hitbox de depuracion (F1) ---
  if (CONFIG.debug.showHitboxes) {
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.w, player.h);
  }
}

/**
 * Dibuja el personaje SIN necesidad de una partida en marcha.
 * Lo usan el menu, la tienda y la taquilla para las vistas previas.
 *
 * @param {object} opts
 * @param {object} opts.skin      definicion de skin
 * @param {number} opts.x,opts.y  posicion de los PIES en el canvas destino
 * @param {number} [opts.scale]   1 = tamano de partida
 * @param {string} [opts.state]   'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'crouch'
 * @param {number} [opts.time]    segundos (anima el idle)
 */
export function drawCharacterPreview(ctx, opts) {
  const {
    skin = DEFAULT_SKIN, x = 0, y = 0, scale = 1,
    facing = 1, state = 'idle', time = 0, stepPhase = 0,
  } = opts;

  // getPose solo necesita estos dos campos: creamos un "jugador falso".
  const pose = getPose({ animState: state, stepPhase }, time);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale, scale);
  drawCharacter(ctx, pose, skin);
  ctx.restore();
}

/* =============================================================
   1) POSE: convierte el estado del jugador en angulos de miembros
   ============================================================= */
function getPose(p, time) {
  const phase = p.stepPhase;
  const st = {
    // Angulos en radianes; 0 = miembro colgando recto hacia abajo.
    legFront: 0, legBack: 0, kneeFront: 0, kneeBack: 0,
    armFront: 0, armBack: 0, elbowFront: 0.2, elbowBack: 0.2,
    lean: 0,        // inclinacion del torso
    hipY: -22,      // altura de la cadera
    headY: -50,
    bob: 0,         // rebote vertical del cuerpo
    crouch: false,
    // Se rellenan desde drawPlayer si lleva algo en la mano
    held: null, aim: 0, recoil: 0, action: 'idle', actionTimer: 0,
    // Para los detalles de la skin: la capa ondea con el tiempo y con
    // la velocidad, y el aura late.
    time, speed: Math.abs(p.vx || 0),
  };

  // EMOTE en marcha: manda sobre cualquier otra pose. Se comprueba antes
  // del switch porque bailando da igual si estabas quieto o andando.
  if (p.emote) {
    applyEmote(st, p.emote.anim, p.emoteTime || 0);
    return st;
  }

  switch (p.animState) {
    /**
     * VITRINA: la pose de la tienda y la taquilla.
     * Con la pose normal el brazo delantero cae cruzando el pecho y tapa
     * justo lo que se quiere ver (el emblema, el patron, el ribete). Aqui
     * se separan los brazos del cuerpo y se planta firme.
     */
    case 'showcase': {
      const respira = Math.sin(time * 1.6);
      st.legFront = 0.18; st.legBack = -0.18;
      st.kneeFront = 0.06; st.kneeBack = 0.06;
      // Brazos algo separados del cuerpo, sin exagerar: abiertos del
      // todo el personaje parece que saluda.
      st.armFront = 0.34; st.armBack = -0.40;
      st.elbowFront = 0.22; st.elbowBack = 0.24;
      st.lean = -0.03;
      st.bob = respira * 0.7;
      break;
    }
    case 'run': {
      const swing = 1.05;
      st.legFront = Math.sin(phase) * swing;
      st.legBack = Math.sin(phase + Math.PI) * swing;
      st.kneeFront = Math.max(0, Math.sin(phase + 1.2)) * 1.15;
      st.kneeBack = Math.max(0, Math.sin(phase + 1.2 + Math.PI)) * 1.15;
      st.armFront = Math.sin(phase + Math.PI) * 0.95;
      st.armBack = Math.sin(phase) * 0.95;
      st.elbowFront = 0.9; st.elbowBack = 0.9;
      st.lean = -0.24;
      st.bob = Math.abs(Math.sin(phase)) * -2.5;
      break;
    }
    case 'walk': {
      const swing = 0.62;
      st.legFront = Math.sin(phase) * swing;
      st.legBack = Math.sin(phase + Math.PI) * swing;
      st.kneeFront = Math.max(0, Math.sin(phase + 1.1)) * 0.6;
      st.kneeBack = Math.max(0, Math.sin(phase + 1.1 + Math.PI)) * 0.6;
      st.armFront = Math.sin(phase + Math.PI) * 0.5;
      st.armBack = Math.sin(phase) * 0.5;
      st.lean = -0.10;
      st.bob = Math.abs(Math.sin(phase)) * -1.6;
      break;
    }
    case 'jump': {
      st.legFront = -0.55; st.kneeFront = 0.95;
      st.legBack = 0.35;  st.kneeBack = 0.35;
      st.armFront = -1.5; st.armBack = -1.1;
      st.elbowFront = 0.5; st.elbowBack = 0.4;
      st.lean = -0.18;
      break;
    }
    case 'fall': {
      st.legFront = 0.42; st.kneeFront = 0.35;
      st.legBack = -0.32; st.kneeBack = 0.55;
      st.armFront = -2.1; st.armBack = -1.7;
      st.elbowFront = 0.3; st.elbowBack = 0.3;
      st.lean = 0.10;
      break;
    }
    case 'crouch': {
      st.crouch = true;
      st.hipY = -14;
      st.headY = -33;
      st.legFront = -0.85; st.kneeFront = 1.65;
      st.legBack = -0.45; st.kneeBack = 1.75;
      st.armFront = 0.75; st.armBack = 0.55;
      st.elbowFront = 1.2; st.elbowBack = 1.0;
      st.lean = -0.42;
      break;
    }
    // Colgando de la paravela: brazos arriba y piernas sueltas
    case 'glide': {
      const b = Math.sin(time * 2.2);
      st.legFront = 0.30 + b * 0.10;
      st.legBack = 0.14 - b * 0.10;
      st.kneeFront = 0.35; st.kneeBack = 0.20;
      // Los dos brazos hacia arriba, agarrando el asa
      st.armFront = -2.5; st.armBack = -2.65;
      st.elbowFront = 0.35; st.elbowBack = 0.35;
      st.lean = b * 0.05;
      st.bob = b * 1.2;
      break;
    }

    // Nadando: cuerpo inclinado y piernas pataleando
    case 'swim': {
      const k = time * 7;
      st.legFront = 0.55 + Math.sin(k) * 0.45;
      st.legBack = 0.55 + Math.sin(k + Math.PI) * 0.45;
      st.kneeFront = Math.max(0, Math.sin(k)) * 0.7;
      st.kneeBack = Math.max(0, Math.sin(k + Math.PI)) * 0.7;
      st.armFront = -0.9 + Math.sin(k * 0.8) * 0.7;
      st.armBack = -0.9 + Math.sin(k * 0.8 + Math.PI) * 0.7;
      st.elbowFront = 0.5; st.elbowBack = 0.5;
      st.lean = -0.42;                       // el torso se echa adelante
      st.bob = Math.sin(k * 0.5) * 1.5;
      break;
    }

    // 'pose': quieto y erguido, para las vistas previas del menu
    case 'pose': {
      st.legFront = 0.16; st.legBack = -0.16;
      st.armFront = 0.22; st.armBack = -0.18;
      st.elbowFront = 0.25; st.elbowBack = 0.2;
      st.bob = Math.sin(time * 2) * 0.7;
      break;
    }
    default: { // idle: respiracion suave
      const b = Math.sin(time * 2.2);
      st.legFront = 0.05; st.legBack = -0.05;
      st.armFront = 0.10 + b * 0.05;
      st.armBack = -0.10 - b * 0.05;
      st.bob = b * 0.8;
      st.lean = -0.03;
    }
  }

  return st;
}

/* =============================================================
   2) DIBUJO por capas: brazo/pierna traseros -> cuerpo -> delanteros
   ============================================================= */
function drawCharacter(ctx, st, skin) {
  const P = skin.palette;
  const S = { ...STYLE_DEFAULTS, ...(skin.style || {}) };

  const hipX = 0;
  const hipY = st.hipY + st.bob;
  const shoulderY = hipY - (st.crouch ? 15 : 20);
  const torsoH = st.crouch ? 20 : 25;

  // --- Aura (solo las skins mas raras la llevan) ---
  if (S.glow) {
    ctx.save();
    ctx.translate(hipX, hipY);
    drawAura(ctx, S.glow, st.time || 0);
    ctx.restore();
  }

  // --- Capa, por detras de todo ---
  if (S.cape) {
    ctx.save();
    ctx.translate(hipX, hipY);
    ctx.rotate(st.lean);
    drawCape(ctx, S.cape, st.time || 0, st.speed || 0);
    ctx.restore();
  }

  // --- Capa TRASERA del cuerpo (tonos oscurecidos, dan profundidad) ---
  drawLeg(ctx, hipX - 2, hipY, st.legBack, st.kneeBack, P.pantsDark, shadeBoot(P.boots), st.crouch, true);
  drawArm(ctx, hipX - 2, shoulderY, st.armBack, st.elbowBack, P.jacketDark, P, st.crouch, S, true);

  // --- Mochila (detras del torso) ---
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(st.lean);
  fillRoundRect(ctx, -16, -23, 12, 21, 5, P.backpack);
  // Tapa y correa, para que no sea un ladrillo
  fillRoundRect(ctx, -16, -23, 12, 7, 4, 'rgba(255,255,255,0.18)');
  fillRoundRect(ctx, -16, -13, 12, 3.4, 1.6, 'rgba(0,0,0,0.28)');
  ctx.restore();

  // --- Torso ---
  drawTorso(ctx, hipX, hipY, st, P, S, torsoH);

  // --- Cabeza ---
  drawHead(ctx, hipX, st.headY + st.bob, st.lean, skin);

  // --- Capa DELANTERA ---
  drawLeg(ctx, hipX + 2, hipY, st.legFront, st.kneeFront, P.pants, P.boots, st.crouch, false);

  if (st.held) {
    drawHoldingArm(ctx, st, hipX + 2, shoulderY, P);
  } else {
    drawArm(ctx, hipX + 2, shoulderY, st.armFront, st.elbowFront, P.jacket, P, st.crouch, S, false);
  }

  // --- Hombreras, por encima de los brazos ---
  // Van en el borde de arriba del torso, que es donde se apoyarian de
  // verdad: puestas a la altura de la cadera quedaban en mitad del pecho.
  if (S.shoulders) {
    ctx.save();
    ctx.translate(hipX, hipY);
    ctx.rotate(st.lean);
    const hy = -torsoH + 3;
    drawShoulder(ctx, S.shoulders, -9.5, hy, -1);
    drawShoulder(ctx, S.shoulders, 9.5, hy, 1);
    ctx.restore();
  }

  // --- Atrezo de algunos emotes ---
  // La guitarra y las "z" de la siesta se piden desde la animacion
  // (ver entities/emoteAnim.js) y se pintan lo ultimo, por delante.
  if (st.guitarra) dibujarGuitarra(ctx, hipX, hipY, st);
  if (st.dormido) dibujarZetas(ctx, hipX, st.headY + st.bob, st.time);
}

/** Guitarra imaginaria del emote de guitarrista. */
function dibujarGuitarra(ctx, hipX, hipY, st) {
  ctx.save();
  ctx.translate(hipX + 2, hipY - 8);
  ctx.rotate(-0.5);

  // Cuerpo
  ctx.fillStyle = '#c0562f';
  ctx.beginPath();
  ctx.ellipse(0, 0, 7.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a3418';
  ctx.beginPath();
  ctx.arc(1, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Mastil
  ctx.fillStyle = '#4a3018';
  ctx.fillRect(5, -1.6, 17, 3.2);
  ctx.fillStyle = '#e8d6a8';
  ctx.fillRect(21, -2.6, 4, 5.2);

  // Cuerdas
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (const yy of [-1, 0, 1]) {
    ctx.moveTo(-3, yy); ctx.lineTo(21, yy);
  }
  ctx.stroke();

  ctx.restore();
}

/** Las "z" que suben mientras duerme. */
function dibujarZetas(ctx, hipX, headY, time) {
  ctx.save();
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';

  for (let i = 0; i < 3; i++) {
    const t = ((time * 0.7 + i * 0.34) % 1);
    ctx.globalAlpha = 0.85 * (1 - t);
    ctx.fillStyle = '#cfe0ee';
    // Se pinta con el lienzo ya volteado, asi que hay que
    // des-voltearlo o las letras saldrian del reves.
    ctx.save();
    ctx.translate(hipX + 10 + t * 12, headY - 6 - t * 24);
    ctx.scale(-1, 1);
    ctx.fillText('z', 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * EL TORSO.
 *
 * Ya no es un rectangulo redondeado plano: tiene hombros mas anchos que
 * la cintura, un degradado de luz de arriba abajo, ribete en el cuello y
 * en el bajo, y encima el patron y el emblema de la skin.
 */
function drawTorso(ctx, hipX, hipY, st, P, S, torsoH) {
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(st.lean);

  const top = -torsoH - 1;
  const bot = 3;

  // --- Silueta: hombros anchos, cintura estrecha ---
  ctx.beginPath();
  ctx.moveTo(-10, top + 5);
  ctx.quadraticCurveTo(-10.5, top, -6, top);
  ctx.lineTo(6, top);
  ctx.quadraticCurveTo(10.5, top, 10, top + 5);
  ctx.lineTo(8.6, bot - 2);
  ctx.quadraticCurveTo(8.6, bot, 6, bot);
  ctx.lineTo(-6, bot);
  ctx.quadraticCurveTo(-8.6, bot, -8.6, bot - 2);
  ctx.closePath();

  ctx.save();
  ctx.clip();

  // Base
  ctx.fillStyle = P.jacket;
  ctx.fillRect(-11, top - 1, 22, torsoH + 8);

  // Luz de arriba y sombra abajo
  const luz = ctx.createLinearGradient(0, top, 0, bot);
  luz.addColorStop(0, 'rgba(255,255,255,0.22)');
  luz.addColorStop(0.45, 'rgba(255,255,255,0)');
  luz.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = luz;
  ctx.fillRect(-11, top - 1, 22, torsoH + 8);

  // Sombra del lado de atras
  ctx.fillStyle = P.jacketDark;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(-11, top - 1, 5, torsoH + 8);
  ctx.globalAlpha = 1;

  // Patron de la skin
  drawPattern(ctx, S.pattern, { dark: P.jacketDark, accent: P.accent }, torsoH);

  ctx.restore();

  // --- Contorno ---
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // --- Cuello ---
  ctx.fillStyle = S.trim || P.jacketDark;
  fillRoundRect(ctx, -5.5, top - 1.5, 11, 4, 2, S.trim || P.jacketDark);

  // --- Cremallera / franja del pecho ---
  fillRoundRect(ctx, 0.5, top + 4, 2.6, torsoH - 9, 1.3, P.accent);

  // --- Cinturon ---
  fillRoundRect(ctx, -9, -3, 18, 6, 3, P.belt);
  // Hebilla
  fillRoundRect(ctx, -1.6, -2, 4, 4, 1.4, S.trim || P.accent);

  // --- Ribete del bajo ---
  if (S.trim) fillRoundRect(ctx, -8.6, 1, 17, 2.4, 1.2, S.trim);

  // --- Emblema del pecho ---
  // Va al LADO del pecho, como un parche, y no en el centro: el brazo
  // delantero nace dentro del torso y cae por delante, asi que un
  // emblema centrado queda tapado en cuanto el personaje se mueve.
  if (S.emblem) {
    ctx.save();
    ctx.translate(-6.5, 0);
    ctx.scale(1.05, 1.05);
    drawEmblem(ctx, S.emblem, S.trim || P.accent, (top + 9) / 1.05);
    ctx.restore();
  }

  ctx.restore();
}

/* =============================================================
   BRAZO QUE APUNTA + OBJETO EN LA MANO
   ============================================================= */

/** Largo total del brazo estirado (manga + antebrazo). */
const ARM_REACH = 23;

function drawHoldingArm(ctx, st, shoulderX, shoulderY, P) {
  const item = st.held;

  // Las curas no se apuntan: se sostienen delante del pecho.
  if (item.kind === 'heal') {
    drawArm(ctx, shoulderX, shoulderY, 0.9, 1.5, P.jacket, P, st.crouch);
    const hx = shoulderX + Math.sin(0.9) * 12 + Math.sin(2.4) * 11;
    const hy = shoulderY + Math.cos(0.9) * 12 + Math.cos(2.4) * 11;
    drawHeal(ctx, item, { x: hx, y: hy - 4, scale: 0.55 });
    return;
  }

  // --- Angulo del brazo ---
  // El pico describe un arco al golpear; las armas siguen al raton.
  let aim = st.aim;
  if (st.action === 'swing') {
    const t = 1 - Math.max(0, st.actionTimer) / 0.28;   // 0 -> 1
    aim -= Math.sin(t * Math.PI) * 1.15;                 // arco hacia arriba y abajo
  }

  // El retroceso empuja el arma hacia atras un instante.
  const retro = st.recoil || 0;

  // drawArm usa 0 = brazo colgando hacia abajo y avanza con sin/cos,
  // asi que para apuntar en direccion `aim` hace falta PI/2 - aim.
  const shoulderAngle = Math.PI / 2 - aim;

  drawArm(ctx, shoulderX, shoulderY, shoulderAngle, 0, P.jacket, P, st.crouch);

  // Punto de la mano al final del brazo estirado
  const hx = shoulderX + Math.cos(aim) * (ARM_REACH - retro * 0.4);
  const hy = shoulderY + Math.sin(aim) * (ARM_REACH - retro * 0.4);

  if (item.kind === 'weapon') {
    drawWeapon(ctx, item, { x: hx, y: hy, angle: aim, scale: 0.62 });
  } else if (item.kind === 'pickaxe' && item.cosmetic) {
    // El pico se dibuja centrado, asi que se desplaza para agarrarlo por el mango.
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(aim + 0.6);
    drawPickaxe(ctx, item.cosmetic, { x: 14, y: -12, scale: 0.42 });
    ctx.restore();
  }
}

/** La bota trasera va un poco mas oscura que la delantera. */
function shadeBoot(color) {
  return color === '#2a2f45' ? '#1f2338' : color;
}

/* =============================================================
   3) CABEZA + PEINADO/CASCO segun la skin
   ============================================================= */
function drawHead(ctx, x, y, lean, skin) {
  const P = skin.palette;
  const H = skin.head;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean * 0.5);

  // Cuello
  fillRoundRect(ctx, -4, 4, 8, 8, 3, P.skinShade);

  // Melenas, capuchas y nucas van DETRAS del craneo (profundidad),
  // asi que se dibujan antes de la cara.
  drawHeadwearBack(ctx, P, H);

  // Craneo
  ctx.fillStyle = P.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mandibula / mejilla en sombra (lado trasero)
  ctx.fillStyle = P.skinShade;
  ctx.beginPath();
  ctx.ellipse(-5, 1, 6, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // El casco cerrado tapa la cara: se dibuja el visor en lugar del ojo.
  if (H.tipo !== 'casco') drawFace(ctx, P, H);

  drawHeadwearFront(ctx, P, H);

  ctx.restore();
}

/** Ojo, ceja y boca. El sprite mira siempre hacia +X (se voltea fuera). */
function drawFace(ctx, P, H) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(5, -1, 3.1, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = P.eye;
  ctx.beginPath();
  ctx.arc(6.2, -1, 1.7, 0, Math.PI * 2);
  ctx.fill();

  // Ceja (del color del pelo)
  ctx.strokeStyle = H.color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(2.5, -6);
  ctx.lineTo(8, -5.2);
  ctx.stroke();

  // Boca
  ctx.strokeStyle = 'rgba(120, 70, 50, 0.9)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(5.5, 4.5, 2.6, 0.15, Math.PI * 0.85);
  ctx.stroke();
}

/**
 * CAPA TRASERA del peinado: nuca, melena larga y bulto de la capucha.
 * Se dibuja antes del craneo para que la cara quede siempre por delante.
 */
function drawHeadwearBack(ctx, P, H) {
  switch (H.tipo) {
    case 'melena':
      ctx.fillStyle = H.color;
      // Cabellera cayendo sobre la espalda
      ctx.beginPath();
      ctx.ellipse(-7, 7, 8.5, 17, 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-9, -1, 6, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'capucha':
      // Bulto de tela por detras de la cabeza
      ctx.fillStyle = H.color2;
      ctx.beginPath();
      ctx.ellipse(-7, 1, 11, 15, 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'mono':
      // Nuca + el mono recogido por detras
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.ellipse(-8, 0, 5.5, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-12, -9, 6.5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'coleta':
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.ellipse(-8, 0, 5.5, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // La coleta, cayendo en diagonal
      ctx.beginPath();
      ctx.moveTo(-10, -6);
      ctx.quadraticCurveTo(-22, 2, -17, 18);
      ctx.quadraticCurveTo(-13, 6, -7, -2);
      ctx.fill();
      break;

    case 'orejas':
      // Gorro: nuca abultada
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.ellipse(-8, 0, 6.5, 10.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'astro':
      // Mochila/collarin del traje
      ctx.fillStyle = H.color2;
      ctx.beginPath();
      ctx.ellipse(-9, 4, 7, 10, 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'gorra':
    case 'sombrero':
    case 'corona':
    case 'pelo':
    default:
      // El casco, la mascara y el astro son piezas unicas de delante
      if (H.tipo === 'casco' || H.tipo === 'mascara' || H.tipo === 'astro') break;
      ctx.fillStyle = H.tipo === 'gorra' ? H.color2 : H.color;
      ctx.beginPath();
      ctx.ellipse(-8, 0, 5.5, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
  }
}

/** CAPA DELANTERA: flequillo, gorra, casco, borde de capucha, sombrero, corona. */
function drawHeadwearFront(ctx, P, H) {
  switch (H.tipo) {
    /* ---------- Melena larga ---------- */
    case 'melena':
      ctx.fillStyle = H.color;
      // Solo la parte de arriba: asi no tapa el ojo
      ctx.beginPath();
      ctx.ellipse(-1, -4, 12.5, 9.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      break;

    /* ---------- Gorra ---------- */
    case 'gorra':
      ctx.fillStyle = H.color;
      // Casquete
      ctx.beginPath();
      ctx.ellipse(-1, -5, 12, 9, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // Visera
      ctx.beginPath();
      ctx.ellipse(6, -5, 9, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    /* ---------- Casco cerrado con visor ---------- */
    case 'casco':
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.ellipse(-0.5, -1, 12.5, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      // Barbilla abierta (se ve algo de piel)
      ctx.fillStyle = P.skin;
      ctx.beginPath();
      ctx.ellipse(4, 8, 6, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Cresta superior
      ctx.fillStyle = H.color2;
      ctx.beginPath();
      ctx.ellipse(-1, -11, 9, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Visor brillante (visera horizontal)
      ctx.beginPath();
      ctx.ellipse(4, -2, 8, 3.1, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(6.5, -3, 2.6, 1.3, -0.2, 0, Math.PI * 2);
      ctx.fill();
      break;

    /* ---------- Capucha (deja ver la cara) ---------- */
    case 'capucha':
      ctx.fillStyle = H.color;
      // Casquete que baja hasta justo encima del ojo
      ctx.beginPath();
      ctx.ellipse(-1, -4, 14, 12, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // Pico de la capucha, hacia atras
      ctx.beginPath();
      ctx.moveTo(-13, -6);
      ctx.quadraticCurveTo(-16, -20, -2, -16);
      ctx.quadraticCurveTo(-8, -10, -13, -6);
      ctx.fill();
      // Mascara que cubre la boca (muy ninja)
      ctx.fillStyle = H.color2;
      ctx.beginPath();
      ctx.ellipse(1, 5, 10, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    /* ---------- Tricornio pirata ---------- */
    case 'sombrero':
      // Ala ancha
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.ellipse(-0.5, -8, 16, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Copa
      ctx.beginPath();
      ctx.moveTo(-11, -8);
      ctx.quadraticCurveTo(0, -23, 11, -8);
      ctx.closePath();
      ctx.fill();
      // Cinta dorada
      ctx.fillStyle = H.color2;
      ctx.beginPath();
      ctx.ellipse(0.5, -10, 9, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Brillo del ala
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      ctx.ellipse(4, -9.5, 10, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    /* ---------- Corona ---------- */
    case 'corona':
      // Pelo debajo
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.ellipse(-1, -4, 12, 9, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // Corona apoyada sobre el pelo
      ctx.fillStyle = H.color2;
      ctx.beginPath();
      ctx.moveTo(-9.5, -9);
      ctx.lineTo(-9.5, -17);
      ctx.lineTo(-4.5, -12);
      ctx.lineTo(0, -19);
      ctx.lineTo(4.5, -12);
      ctx.lineTo(9.5, -17);
      ctx.lineTo(9.5, -9);
      ctx.closePath();
      ctx.fill();
      // Gema central
      ctx.fillStyle = '#e0554d';
      ctx.beginPath();
      ctx.arc(0, -11, 2, 0, Math.PI * 2);
      ctx.fill();
      break;

    /* ---------- Mono alto ---------- */
    case 'mono':
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.ellipse(-1, -4, 12, 9, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // Cinta del mono
      ctx.fillStyle = H.color2;
      ctx.beginPath();
      ctx.ellipse(-9, -8, 3.4, 2.2, 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;

    /* ---------- Coleta ---------- */
    case 'coleta':
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.ellipse(-1, -4, 12.5, 9.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // Flequillo de lado
      ctx.beginPath();
      ctx.moveTo(-2, -12);
      ctx.quadraticCurveTo(12, -11, 10, -2);
      ctx.quadraticCurveTo(6, -8, -2, -8);
      ctx.fill();
      break;

    /* ---------- Cresta punk ---------- */
    case 'cresta':
      // Cabeza rapada
      ctx.fillStyle = H.color2;
      ctx.beginPath();
      ctx.ellipse(-1, -4, 12, 9, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // Puas
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.moveTo(-9, -10);
      for (let i = 0; i < 5; i++) {
        const x = -9 + i * 4.6;
        ctx.lineTo(x + 2.3, -22 + Math.abs(i - 2) * 2.4);
        ctx.lineTo(x + 4.6, -10);
      }
      ctx.closePath();
      ctx.fill();
      break;

    /* ---------- Gorro con orejas ---------- */
    case 'orejas':
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.ellipse(-1, -3, 13, 11.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // Las dos orejas
      for (const ox of [-6.5, 6]) {
        ctx.fillStyle = H.color;
        ctx.beginPath();
        ctx.ellipse(ox, -13, 4.6, 5.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = H.color2;
        ctx.beginPath();
        ctx.ellipse(ox, -13, 2.4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    /* ---------- Bandana ---------- */
    case 'bandana':
      // Pelo asomando
      ctx.fillStyle = H.color2;
      ctx.beginPath();
      ctx.ellipse(-1, -3, 12, 9, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // Panuelo
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.ellipse(-1, -7, 12.5, 6, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-13, -8, 25, 4);
      // Nudo y colas
      ctx.beginPath();
      ctx.moveTo(-11, -6);
      ctx.quadraticCurveTo(-19, -2, -16, 6);
      ctx.quadraticCurveTo(-12, -1, -8, -4);
      ctx.fill();
      break;

    /* ---------- Mascara de luchador ---------- */
    case 'mascara':
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.ellipse(-0.5, -1, 12.5, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      // Boca al aire
      ctx.fillStyle = P.skin;
      ctx.beginPath();
      ctx.ellipse(4, 8, 5.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Contorno del ojo
      ctx.fillStyle = H.color2;
      ctx.beginPath();
      ctx.ellipse(5, -2, 5.4, 4.2, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = P.skin;
      ctx.beginPath();
      ctx.ellipse(5.4, -2, 3.4, 2.6, -0.15, 0, Math.PI * 2);
      ctx.fill();
      // Rayo en la frente
      ctx.fillStyle = H.color2;
      ctx.beginPath();
      ctx.moveTo(-2, -13);
      ctx.lineTo(3, -7);
      ctx.lineTo(0, -7);
      ctx.lineTo(2, -1);
      ctx.lineTo(-4, -8);
      ctx.lineTo(-1, -8);
      ctx.closePath();
      ctx.fill();
      break;

    /* ---------- Casco con cuernos ---------- */
    case 'cuernos':
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.ellipse(-1, -3, 12.5, 11, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-13.5, -4, 26, 4);
      // Nasal
      ctx.fillRect(3, -4, 3.4, 8);
      // Los dos cuernos
      ctx.fillStyle = H.color2;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(dir * 9, -8);
        ctx.quadraticCurveTo(dir * 20, -14, dir * 17, -25);
        ctx.quadraticCurveTo(dir * 13, -17, dir * 7, -11);
        ctx.closePath();
        ctx.fill();
      }
      break;

    /* ---------- Casco de astronauta ---------- */
    case 'astro':
      // Burbuja
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.arc(0, -1, 14, 0, Math.PI * 2);
      ctx.fill();
      // Visor
      ctx.fillStyle = H.color2;
      ctx.beginPath();
      ctx.ellipse(2, -1, 10.5, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Cara asomando detras del visor
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.ellipse(4, -3.5, 6, 3.4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Aro del cuello
      ctx.fillStyle = H.color;
      ctx.fillRect(-9, 10, 18, 4);
      // Antena
      ctx.strokeStyle = H.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -9);
      ctx.lineTo(-14, -18);
      ctx.stroke();
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(-14.5, -19, 2.2, 0, Math.PI * 2);
      ctx.fill();
      break;

    /* ---------- Pelo normal (por defecto) ---------- */
    default:
      ctx.fillStyle = H.color;
      ctx.beginPath();
      ctx.ellipse(-1, -4, 12, 9, 0, Math.PI, Math.PI * 2);
      ctx.fill();
  }
}

/* =============================================================
   4) MIEMBROS
   ============================================================= */

/**
 * Pierna de 2 segmentos (muslo + pantorrilla) + bota.
 * `hipAngle` y `kneeAngle` en radianes; 0 = recta hacia abajo.
 */
function drawLeg(ctx, x, y, hipAngle, kneeAngle, colorLeg, colorBoot, crouch, atras) {
  const thigh = crouch ? 11 : 13;
  const shin = crouch ? 10 : 13;

  const kx = x + Math.sin(hipAngle) * thigh;
  const ky = y + Math.cos(hipAngle) * thigh;

  const totalAngle = hipAngle - kneeAngle;
  const fx = kx + Math.sin(totalAngle) * shin;
  const fy = ky + Math.cos(totalAngle) * shin;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Contorno oscuro: es lo que separa al personaje del fondo y le da
  // ese aire de dibujo, en vez de parecer una mancha de color.
  if (!atras) {
    ctx.strokeStyle = 'rgba(0,0,0,0.32)';
    ctx.lineWidth = 11.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(kx, ky);
    ctx.lineTo(fx, fy);
    ctx.stroke();
  }

  ctx.strokeStyle = colorLeg;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(kx, ky);
  ctx.lineTo(fx, fy);
  ctx.stroke();

  // Brillo por delante de la pernera
  if (!atras) {
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 1.6, y + 1);
    ctx.lineTo(kx + 1.6, ky - 1);
    ctx.stroke();
  }

  // Rodillera
  ctx.fillStyle = colorBoot;
  ctx.beginPath();
  ctx.arc(kx, ky, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Cana de la bota
  ctx.strokeStyle = colorBoot;
  ctx.lineWidth = 9.5;
  ctx.beginPath();
  ctx.moveTo(fx, fy - 4);
  ctx.lineTo(fx, fy);
  ctx.stroke();

  // Pie
  ctx.fillStyle = colorBoot;
  ctx.beginPath();
  ctx.ellipse(fx + 2.5, fy + 0.5, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Suela
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(fx + 2.5, fy + 3, 7, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Brazo de 2 segmentos (manga + antebrazo) + guante. */
function drawArm(ctx, x, y, shoulderAngle, elbowAngle, colorSleeve, palette, crouch, style, atras) {
  const upper = crouch ? 10 : 12;
  const fore = crouch ? 9 : 11;

  const ex = x + Math.sin(shoulderAngle) * upper;
  const ey = y + Math.cos(shoulderAngle) * upper;

  const total = shoulderAngle + elbowAngle;
  const hx = ex + Math.sin(total) * fore;
  const hy = ey + Math.cos(total) * fore;

  ctx.lineCap = 'round';

  // Contorno
  if (!atras) {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 9.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
  }

  // Manga
  ctx.strokeStyle = colorSleeve;
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // Antebrazo (piel)
  ctx.strokeStyle = palette.skin;
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(hx, hy);
  ctx.stroke();

  // Puno de la manga
  const trim = style?.trim;
  if (trim) {
    ctx.strokeStyle = trim;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(ex - Math.sin(total) * 1.5, ey - Math.cos(total) * 1.5);
    ctx.lineTo(ex + Math.sin(total) * 2, ey + Math.cos(total) * 2);
    ctx.stroke();
  }

  // Mano (guante) con nudillos
  ctx.fillStyle = palette.glove;
  ctx.beginPath();
  ctx.arc(hx, hy, 4.2, 0, Math.PI * 2);
  ctx.fill();

  if (!atras) {
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.arc(hx - 1, hy - 1.4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}
