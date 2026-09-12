/**
 * music.js
 * ---------------------------------------------------------------
 * LA MUSICA, tambien generada con WebAudio y sin ficheros.
 *
 * En vez de reproducir una cancion grabada, hay un pequeno SECUENCIADOR:
 * cada pista es una lista de acordes y un patron de bajo, y el modulo va
 * programando las notas por adelantado. El resultado es un bucle que no
 * se repite exactamente igual (las notas de arriba se eligen al azar
 * dentro del acorde) y que dura lo que haga falta.
 *
 * Hay tres pistas:
 *   menu     tranquila, acordes largos, sin percusion
 *   partida  ritmo constante, bajo marcado
 *   tension  mas rapida, tonalidad menor, corazon de fondo
 *
 * Cambiar de pista NO corta: se hace un fundido cruzado de un par de
 * segundos (ver `play`). Y todo cuelga del bus `music` de audio.js, asi
 * que el mute y el volumen general la afectan igual que a los efectos.
 */

import { musicOutput } from './audio.js';

/* =============================================================
   LAS PISTAS
   -------------------------------------------------------------
   Cada acorde es una lista de frecuencias en Hz. Se escriben asi,
   a pelo, para no tener que arrastrar una tabla de notas.
   ============================================================= */

const PISTAS = {
  /** MENU: mayor, lento y amable. */
  menu: {
    bpm: 82,
    compas: 8,              // pulsos que dura cada acorde
    bajo: 0.18,
    percusion: false,
    ondaPad: 'triangle',
    ondaMelodia: 'sine',
    melodiaCada: 2,         // una nota suelta cada N pulsos
    acordes: [
      [131, 165, 196, 262],   // Do
      [147, 175, 220, 294],   // Re menor
      [110, 165, 196, 262],   // La menor
      [117, 175, 233, 294],   // Si bemol
    ],
  },

  /** PARTIDA: el mismo mundo pero con pulso; acompana sin molestar. */
  partida: {
    bpm: 104,
    compas: 4,
    bajo: 0.24,
    percusion: true,
    ondaPad: 'triangle',
    ondaMelodia: 'square',
    melodiaCada: 2,
    acordes: [
      [98, 147, 196, 247],
      [110, 165, 220, 277],
      [87, 131, 175, 220],
      [110, 165, 196, 262],
    ],
  },

  /** TENSION: quedan pocos. Menor, mas rapida y con latido. */
  tension: {
    bpm: 132,
    compas: 4,
    bajo: 0.3,
    percusion: true,
    latido: true,
    ondaPad: 'sawtooth',
    ondaMelodia: 'square',
    melodiaCada: 1,
    acordes: [
      [82, 123, 155, 196],
      [87, 131, 165, 208],
      [78, 117, 147, 196],
      [73, 110, 147, 185],
    ],
  },
};

/* =============================================================
   ESTADO
   ============================================================= */

/** Pista sonando ahora mismo: { def, gain, timer, paso } */
let actual = null;
/** Las que se estan apagando; se limpian solas. */
let saliendo = [];
/** Volumen propio de la musica (aparte del general). */
let nivel = 0.55;
/** Id de la pista pedida, para no reiniciarla si ya suena. */
let pistaId = null;

/** Cuanto dura el fundido al cambiar de pista. */
const FUNDIDO = 1.8;
/** Con cuanta antelacion se programan las notas. */
const ANTICIPO = 0.35;

function ctxDe(salida) { return salida?.context || null; }

/* =============================================================
   UNA NOTA
   ============================================================= */

/**
 * @param {AudioNode} salida  a donde va la nota
 * @param {object} o { freq, t, dur, type, vol, attack }
 */
function nota(salida, o) {
  const c = ctxDe(salida);
  if (!c) return;

  const osc = c.createOscillator();
  osc.type = o.type || 'triangle';
  osc.frequency.setValueAtTime(o.freq, o.t);

  const g = c.createGain();
  const att = o.attack ?? 0.04;
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.linearRampToValueAtTime(o.vol, o.t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);

  osc.connect(g);
  g.connect(salida);
  osc.start(o.t);
  osc.stop(o.t + o.dur + 0.05);
}

/** Percusion: un golpe corto de ruido. */
function golpe(salida, t, grave) {
  const c = ctxDe(salida);
  if (!c) return;

  if (grave) {
    // Bombo: un seno que cae en picado.
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.linearRampToValueAtTime(45, t + 0.12);
    const g = c.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(g); g.connect(salida);
    osc.start(t); osc.stop(t + 0.16);
    return;
  }

  // Charles: ruido corto y agudo.
  const frames = Math.floor(c.sampleRate * 0.05);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 6000;
  const g = c.createGain();
  g.gain.value = 0.12;
  src.connect(f); f.connect(g); g.connect(salida);
  src.start(t);
}

/* =============================================================
   EL SECUENCIADOR
   ============================================================= */

/**
 * Programa los pulsos que caen dentro de la ventana de anticipo.
 * Se llama desde `update` y no hace nada si no toca.
 */
function programar(p) {
  const c = ctxDe(p.gain);
  if (!c) return;

  const def = p.def;
  const porPulso = 60 / def.bpm;
  const limite = c.currentTime + ANTICIPO;

  while (p.siguiente < limite) {
    const t = p.siguiente;
    const paso = p.paso;
    const acorde = def.acordes[Math.floor(paso / def.compas) % def.acordes.length];
    const enAcorde = paso % def.compas;

    // --- Bajo: la fundamental en cada pulso ---
    nota(p.gain, {
      freq: acorde[0], t, dur: porPulso * 0.9,
      type: 'sine', vol: def.bajo, attack: 0.02,
    });

    // --- Colchon: el acorde entero al empezar ---
    if (enAcorde === 0) {
      for (let i = 1; i < acorde.length; i++) {
        nota(p.gain, {
          freq: acorde[i], t, dur: porPulso * def.compas * 0.95,
          type: def.ondaPad, vol: 0.075, attack: 0.5,
        });
      }
    }

    // --- Melodia: una nota del acorde, una octava arriba ---
    if (paso % def.melodiaCada === 0 && Math.random() < 0.6) {
      const f = acorde[1 + Math.floor(Math.random() * (acorde.length - 1))] * 2;
      nota(p.gain, {
        freq: f, t: t + porPulso * 0.25, dur: porPulso * 0.7,
        type: def.ondaMelodia, vol: 0.055,
      });
    }

    // --- Ritmo ---
    if (def.percusion) {
      if (enAcorde % 2 === 0) golpe(p.gain, t, true);
      golpe(p.gain, t + porPulso * 0.5, false);
    }
    // El "latido" de la tension: dos golpes graves seguidos.
    if (def.latido && enAcorde === 0) {
      golpe(p.gain, t + porPulso * 0.12, true);
    }

    p.siguiente += porPulso;
    p.paso++;
  }
}

/* =============================================================
   API
   ============================================================= */

/**
 * Pone una pista. Si ya sonaba esa, no hace nada (asi se puede
 * llamar cada frame sin miedo).
 * @param {'menu'|'partida'|'tension'|null} id
 */
export function playMusic(id) {
  if (id === pistaId) return;
  pistaId = id;

  const salida = musicOutput();
  if (!salida) return;
  const c = salida.context;

  // Lo que sonaba se va apagando mientras entra lo nuevo.
  if (actual) {
    actual.gain.gain.cancelScheduledValues(c.currentTime);
    actual.gain.gain.setValueAtTime(actual.gain.gain.value, c.currentTime);
    actual.gain.gain.linearRampToValueAtTime(0.0001, c.currentTime + FUNDIDO);
    actual.finDe = c.currentTime + FUNDIDO + 0.2;
    saliendo.push(actual);
    actual = null;
  }

  const def = PISTAS[id];
  if (!def) return;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.linearRampToValueAtTime(nivel, c.currentTime + FUNDIDO);
  gain.connect(salida);

  actual = { def, gain, siguiente: c.currentTime + 0.1, paso: 0 };
}

/** Para la musica con un fundido. */
export function stopMusic() { playMusic(null); }

/** Volumen propio de la musica, de 0 a 1. */
export function setMusicVolume(v) {
  nivel = Math.max(0, Math.min(1, v)) * 0.55;
  const salida = musicOutput();
  if (actual && salida) {
    actual.gain.gain.setTargetAtTime(nivel, salida.context.currentTime, 0.15);
  }
}

/** Qué suena ahora. */
export function currentTrack() { return pistaId; }

/**
 * Hay que llamarlo cada frame: es lo que va escribiendo las notas
 * por delante y limpiando las pistas que ya se han apagado.
 */
export function updateMusic() {
  const salida = musicOutput();
  if (!salida) return;
  const ahora = salida.context.currentTime;

  if (actual) programar(actual);

  if (saliendo.length) {
    for (const p of saliendo) {
      // Se sigue programando mientras se desvanece, si no la cola
      // sonaria cortada en seco.
      if (ahora < p.finDe) programar(p);
      else { try { p.gain.disconnect(); } catch { /* ya estaba */ } }
    }
    saliendo = saliendo.filter((p) => ahora < p.finDe);
  }
}
