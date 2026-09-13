/**
 * audio.js
 * ---------------------------------------------------------------
 * TODO EL SONIDO del juego, generado con WebAudio y SIN NINGUN
 * FICHERO: cada efecto se fabrica con osciladores y ruido en el
 * momento. Asi el juego sigue siendo "abrir el index.html y jugar",
 * sin descargas ni carpetas de audio que mantener.
 *
 * La mesa de mezclas tiene tres niveles:
 *
 *   master  ── volumen general y MUTE
 *     ├─ sfx    efectos (disparos, pasos, cofres...)
 *     └─ music  musica de fondo
 *
 * Tener el `sfx` separado del `music` es lo que permitira, en el
 * siguiente paso, bajar la musica sin tocar los efectos.
 *
 * El navegador no deja crear audio hasta que el usuario interactua,
 * asi que el contexto se crea de forma PEREZOSA: la primera llamada
 * util ocurre despues de un clic, que ya es un gesto valido.
 *
 * Si algo falla (navegador sin WebAudio, permisos...), las funciones
 * no hacen nada: el juego nunca se rompe por el sonido.
 */

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;

/** Volumen general elegido por el jugador, de 0 a 1. */
let volume = 0.7;
/** Silencio total. */
let muted = false;

/** Tope del volumen real: al 100% seguiria siendo comodo de escuchar. */
const TECHO = 0.34;

/* =============================================================
   LIMITADOR DE VOCES
   -------------------------------------------------------------
   Con 75 personajes en el mapa, un frame malo podia disparar
   docenas de sonidos a la vez: el navegador se atraganta y lo que
   se oye es un chasquido. Aqui se cuenta cuantos suenan por
   ventana de tiempo y lo que pasa de ahi se tira.
   ============================================================= */
const VOCES_MAX = 14;
const VENTANA = 0.1;
let voces = [];

function hayHueco() {
  if (!ctx) return true;
  const ahora = ctx.currentTime;
  voces = voces.filter((t) => ahora - t < VENTANA);
  if (voces.length >= VOCES_MAX) return false;
  voces.push(ahora);
  return true;
}

/* =============================================================
   CONTEXTO Y MEZCLA
   ============================================================= */

/** Crea el contexto la primera vez que hace falta. */
function ensureContext() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    master = ctx.createGain();
    master.connect(ctx.destination);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 1;
    sfxBus.connect(master);

    musicBus = ctx.createGain();
    musicBus.gain.value = 1;
    musicBus.connect(master);

    aplicarVolumen();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Lleva el volumen y el mute al nodo maestro. */
function aplicarVolumen() {
  if (!master || !ctx) return;
  const destino = muted ? 0 : volume * TECHO;
  // Rampa corta en vez de un salto: cambiar el volumen de golpe suena
  // a chasquido.
  master.gain.setTargetAtTime(destino, ctx.currentTime, 0.02);
}

/** El contexto arranca "suspendido" hasta el primer gesto del usuario. */
function despertar() {
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

/* =============================================================
   AJUSTES (los usa la pantalla de opciones)
   ============================================================= */

/** Volumen general, de 0 a 1. */
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  ensureContext();
  despertar();
  aplicarVolumen();
}

export function getVolume() { return volume; }

/** Silencia o devuelve el sonido. */
export function setMuted(v) {
  muted = !!v;
  ensureContext();
  if (!muted) despertar();
  aplicarVolumen();
}

export function isMuted() { return muted; }

/** Atajo: silencia si sonaba y al reves. @returns {boolean} el estado nuevo */
export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

/** El bus de musica, para el siguiente paso. */
export function musicOutput() {
  ensureContext();
  return musicBus;
}

/** Se mantiene por compatibilidad con lo que ya llamaba a esto. */
export function setAudioEnabled(value) { setMuted(!value); }

/* =============================================================
   LADRILLOS
   Con estos tres se fabrica todo lo demas.
   ============================================================= */

/**
 * Un tono con envolvente.
 * @param {object} o { freq, toFreq, type, duration, volume, delay, curve }
 */
function tone(o) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  despertar();

  const t0 = c.currentTime + (o.delay || 0);
  const dur = o.duration ?? 0.15;

  const osc = c.createOscillator();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.toFreq) {
    // Lineal para caidas muy grandes (la exponencial se vuelve loca
    // cuando el destino se acerca a cero).
    if (o.curve === 'linear') osc.frequency.linearRampToValueAtTime(Math.max(1, o.toFreq), t0 + dur);
    else osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.toFreq), t0 + dur);
  }

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(o.volume ?? 0.5, t0 + (o.attack ?? 0.012));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(gain);
  gain.connect(sfxBus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/**
 * Ruido filtrado: la base de golpes, pasos, disparos y explosiones.
 * @param {object} o { duration, volume, delay, freq, q, type, sweepTo }
 */
function noise(o = {}) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  despertar();

  const dur = o.duration ?? 0.12;
  const t0 = c.currentTime + (o.delay || 0);
  const frames = Math.max(1, Math.floor(c.sampleRate * dur));

  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    // Ruido que se apaga hacia el final
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }

  const src = c.createBufferSource();
  src.buffer = buffer;

  const filtro = c.createBiquadFilter();
  filtro.type = o.type || 'bandpass';
  filtro.frequency.setValueAtTime(o.freq ?? 1200, t0);
  if (o.sweepTo) filtro.frequency.exponentialRampToValueAtTime(Math.max(20, o.sweepTo), t0 + dur);
  filtro.Q.value = o.q ?? 1;

  const gain = c.createGain();
  gain.gain.setValueAtTime(o.volume ?? 0.25, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filtro);
  filtro.connect(gain);
  gain.connect(sfxBus);
  src.start(t0);
}

/** Golpe grave: lo que le da cuerpo a disparos, saltos y explosiones. */
function thump(o = {}) {
  tone({
    freq: o.freq ?? 160, toFreq: o.toFreq ?? 40, type: 'sine',
    duration: o.duration ?? 0.12, volume: o.volume ?? 0.5,
    delay: o.delay || 0, curve: 'linear',
  });
}


/* =============================================================
   EL OYENTE
   -------------------------------------------------------------
   Los sonidos del mundo (disparos de bots, explosiones lejanas)
   tienen que oirse mas flojo cuanto mas lejos pasan. game.js
   apunta aqui donde esta la camara/jugador cada frame y el resto
   del modulo lo usa para calcular el volumen.
   ============================================================= */

let oyenteX = 0;
let oyenteY = 0;
/** Mas alla de esto no se oye nada: unas tres pantallas. */
const ALCANCE = 2600;

/** @param {number} x @param {number} y */
export function setListener(x, y) { oyenteX = x; oyenteY = y; }

/**
 * Convierte una posicion del mundo en "cuanto de lejos suena".
 * @returns {number} 0 = encima, 1 = ya no se oye
 */
export function distanceFactor(x, y) {
  const dx = x - oyenteX;
  const dy = (y - oyenteY) * 0.6;   // la altura importa menos
  const d = Math.hypot(dx, dy);
  return Math.min(1, d / ALCANCE);
}

/** Disparo situado en el mundo: se apaga con la distancia. */
export function playShotAt(kind, x, y) {
  const d = distanceFactor(x, y);
  if (d >= 1) return;
  playShot(kind, d);
}

/* =============================================================
   DISPAROS
   Cada familia de arma suena distinto: es lo que deja saber, sin
   mirar, si el que dispara al otro lado del muro lleva una pistola
   o una escopeta.
   ============================================================= */

/**
 * @param {string} kind  `def.kind` del arma (ver data/weapons.js)
 * @param {number} dist  0 = al lado, 1 = en el borde de lo que se oye
 */
export function playShot(kind, dist = 0) {
  if (muted || !hayHueco()) return;
  // De lejos se oye mas flojo y mas apagado, como en la vida real.
  const v = 0.42 * (1 - dist * 0.78);
  const grave = 1 - dist * 0.5;

  switch (kind) {
    case 'shotgun':
    case 'shotgun-oni':
      noise({ duration: 0.22, volume: 0.5 * v, freq: 900, sweepTo: 180, q: 0.7 });
      thump({ freq: 130, toFreq: 42, duration: 0.2, volume: 0.75 * v * grave });
      break;

    case 'sniper':
      noise({ duration: 0.09, volume: 0.5 * v, freq: 3200, sweepTo: 700, q: 1.4 });
      thump({ freq: 190, toFreq: 45, duration: 0.3, volume: 0.85 * v * grave });
      // Cola: el eco del disparo por el valle.
      tone({ freq: 300, toFreq: 120, type: 'sine', duration: 0.5, volume: 0.12 * v, delay: 0.06, curve: 'linear' });
      break;

    case 'minigun':
      noise({ duration: 0.05, volume: 0.32 * v, freq: 1700, q: 1.2 });
      thump({ freq: 120, toFreq: 60, duration: 0.06, volume: 0.4 * v * grave });
      break;

    case 'beam':
    case 'pulso':
      tone({ freq: 1400, toFreq: 380, type: 'sawtooth', duration: 0.18, volume: 0.3 * v, curve: 'linear' });
      tone({ freq: 700, toFreq: 190, type: 'sine', duration: 0.2, volume: 0.22 * v, curve: 'linear' });
      break;

    case 'llamas':
      noise({ duration: 0.12, volume: 0.3 * v, freq: 700, sweepTo: 1800, q: 0.6, type: 'lowpass' });
      break;

    case 'revolver':
      noise({ duration: 0.12, volume: 0.46 * v, freq: 2100, sweepTo: 400, q: 1.1 });
      thump({ freq: 170, toFreq: 44, duration: 0.24, volume: 0.8 * v * grave });
      break;

    case 'pistol':
      noise({ duration: 0.07, volume: 0.34 * v, freq: 2400, sweepTo: 600, q: 1.3 });
      thump({ freq: 150, toFreq: 55, duration: 0.1, volume: 0.45 * v * grave });
      break;

    // --- Las armas de JULEN DEFENSA ---
    case 'cohetes':
      noise({ duration: 0.35, volume: 0.35 * v, freq: 600, sweepTo: 1600, q: 0.6, type: 'lowpass' });
      thump({ freq: 110, toFreq: 40, duration: 0.25, volume: 0.7 * v * grave });
      break;

    case 'hielo':
      tone({ freq: 1800, toFreq: 900, type: 'triangle', duration: 0.16, volume: 0.22 * v, curve: 'linear' });
      noise({ duration: 0.06, volume: 0.15 * v, freq: 5000, q: 2 });
      break;

    case 'cadena':
      tone({ freq: 220, toFreq: 1400, type: 'sawtooth', duration: 0.12, volume: 0.2 * v, curve: 'linear' });
      noise({ duration: 0.1, volume: 0.22 * v, freq: 3000, q: 3 });
      break;

    default:   // fusiles, subfusiles y ametralladora
      noise({ duration: 0.08, volume: 0.36 * v, freq: 1900, sweepTo: 500, q: 1.1 });
      thump({ freq: 140, toFreq: 50, duration: 0.11, volume: 0.5 * v * grave });
  }
}

/** Clic de arma sin balas. */
export function playEmpty() {
  if (!hayHueco()) return;
  noise({ duration: 0.04, volume: 0.18, freq: 2600, q: 2.2 });
}

/* =============================================================
   MOVIMIENTO
   ============================================================= */

/**
 * Un paso. `running` lo hace mas fuerte y mas seco.
 * El tono cambia un poco cada vez para que no suene a metronomo.
 */
export function playFootstep(running = false) {
  if (muted || !hayHueco()) return;
  const v = running ? 0.16 : 0.1;
  const f = 420 + Math.random() * 260;
  noise({ duration: running ? 0.07 : 0.09, volume: v, freq: f, sweepTo: f * 0.45, q: 0.9, type: 'lowpass' });
}

/** Salto. */
export function playJump() {
  tone({ freq: 330, toFreq: 560, type: 'triangle', duration: 0.1, volume: 0.14 });
}

/** Aterrizaje. */
export function playLand() {
  if (!hayHueco()) return;
  noise({ duration: 0.11, volume: 0.2, freq: 300, sweepTo: 110, q: 0.8, type: 'lowpass' });
  thump({ freq: 110, toFreq: 40, duration: 0.12, volume: 0.3 });
}

/** Saltar del bus: un golpe de aire hacia abajo. */
export function playBusJump() {
  noise({ duration: 0.55, volume: 0.26, freq: 400, sweepTo: 1700, q: 0.5, type: 'lowpass' });
  tone({ freq: 520, toFreq: 190, type: 'sine', duration: 0.45, volume: 0.2, curve: 'linear' });
}

/** Abrir la paravela: el tirón de la tela al hincharse. */
export function playGlider() {
  noise({ duration: 0.32, volume: 0.3, freq: 1500, sweepTo: 420, q: 0.7, type: 'lowpass' });
  tone({ freq: 220, toFreq: 400, type: 'triangle', duration: 0.3, volume: 0.18 });
}

/* =============================================================
   BOTIN
   ============================================================= */

/** Cofre abriendose: crujido de madera + arpegio ascendente. */
export function playChestOpen() {
  noise({ duration: 0.18, volume: 0.22, freq: 1200 });
  tone({ freq: 440, toFreq: 660, type: 'triangle', duration: 0.14, volume: 0.35 });
  tone({ freq: 660, toFreq: 880, type: 'triangle', duration: 0.16, volume: 0.32, delay: 0.10 });
  tone({ freq: 880, toFreq: 1320, type: 'triangle', duration: 0.24, volume: 0.28, delay: 0.20 });
}

/** Recoger un objeto: dos notas cortas hacia arriba. */
export function playPickup() {
  tone({ freq: 700, type: 'square', duration: 0.06, volume: 0.16 });
  tone({ freq: 1050, type: 'square', duration: 0.08, volume: 0.14, delay: 0.055 });
}

/** Coger municion: mas seco y metalico que un objeto normal. */
export function playAmmo() {
  noise({ duration: 0.06, volume: 0.12, freq: 3000, q: 2 });
  tone({ freq: 900, type: 'square', duration: 0.05, volume: 0.1, delay: 0.03 });
}

/* =============================================================
   PICO Y CONSTRUCCION
   ============================================================= */

/** Picotazo a un arbol. */
export function playChop() {
  if (!hayHueco()) return;
  noise({ duration: 0.09, volume: 0.24, freq: 800, sweepTo: 300, q: 1.4 });
  tone({ freq: 240, toFreq: 150, type: 'triangle', duration: 0.08, volume: 0.14, curve: 'linear' });
}

/** El arbol cae y se lleva la madera. */
export function playTreeFall() {
  noise({ duration: 0.5, volume: 0.3, freq: 600, sweepTo: 140, q: 0.6, type: 'lowpass' });
  tone({ freq: 180, toFreq: 70, type: 'triangle', duration: 0.45, volume: 0.2, curve: 'linear' });
}

/** Colocar una pieza de construccion. */
export function playBuild() {
  if (!hayHueco()) return;
  noise({ duration: 0.08, volume: 0.16, freq: 900, q: 1.1 });
  tone({ freq: 520, toFreq: 760, type: 'square', duration: 0.07, volume: 0.12 });
}

/** Una construccion revienta. */
export function playBreak() {
  if (!hayHueco()) return;
  noise({ duration: 0.24, volume: 0.28, freq: 1100, sweepTo: 260, q: 0.8 });
  tone({ freq: 300, toFreq: 110, type: 'triangle', duration: 0.2, volume: 0.16, curve: 'linear' });
}

/* =============================================================
   COMBATE
   ============================================================= */

/** Te han dado. */
export function playHurt() {
  if (!hayHueco()) return;
  noise({ duration: 0.1, volume: 0.22, freq: 500, sweepTo: 180, q: 0.9, type: 'lowpass' });
  tone({ freq: 190, toFreq: 90, type: 'sawtooth', duration: 0.14, volume: 0.16, curve: 'linear' });
}

/** Impacto de TUS balas en alguien: el "tic" que confirma que aciertas. */
export function playHitmark() {
  if (!hayHueco()) return;
  tone({ freq: 1500, type: 'square', duration: 0.04, volume: 0.13 });
}

/** Has eliminado a alguien. */
export function playKill() {
  tone({ freq: 880, type: 'square', duration: 0.06, volume: 0.2 });
  tone({ freq: 1320, type: 'square', duration: 0.07, volume: 0.18, delay: 0.05 });
  tone({ freq: 1760, type: 'square', duration: 0.12, volume: 0.16, delay: 0.1 });
}

/** Explosion de granada. */
export function playExplosion() {
  noise({ duration: 0.55, volume: 0.5, freq: 900, sweepTo: 90, q: 0.5, type: 'lowpass' });
  thump({ freq: 120, toFreq: 32, duration: 0.5, volume: 0.85 });
  tone({ freq: 70, toFreq: 30, type: 'sine', duration: 0.7, volume: 0.4, curve: 'linear' });
}

/** Explosion situada en el mundo. */
export function playExplosionAt(x, y) {
  const d = distanceFactor(x, y);
  if (d >= 1) return;
  noise({ duration: 0.55, volume: 0.5 * (1 - d), freq: 900, sweepTo: 90, q: 0.5, type: 'lowpass' });
  thump({ freq: 120, toFreq: 32, duration: 0.5, volume: 0.85 * (1 - d) });
  tone({ freq: 70, toFreq: 30, type: 'sine', duration: 0.7, volume: 0.4 * (1 - d), curve: 'linear' });
}

/* =============================================================
   AVISOS
   ============================================================= */

/** Cae un supply drop: sirena suave de aviso. */
export function playSupplyDrop() {
  tone({ freq: 700, toFreq: 980, type: 'triangle', duration: 0.3, volume: 0.2 });
  tone({ freq: 980, toFreq: 700, type: 'triangle', duration: 0.3, volume: 0.18, delay: 0.28 });
  tone({ freq: 700, toFreq: 980, type: 'triangle', duration: 0.3, volume: 0.16, delay: 0.56 });
}

/** El supply drop toca suelo. */
export function playSupplyLand() {
  noise({ duration: 0.28, volume: 0.32, freq: 700, sweepTo: 160, q: 0.7, type: 'lowpass' });
  thump({ freq: 130, toFreq: 40, duration: 0.3, volume: 0.55 });
}

/** Un supply drop toca suelo, con la distancia aplicada. */
export function playSupplyLandAt(x, y) {
  const d = distanceFactor(x, y);
  if (d >= 1) return;
  noise({ duration: 0.28, volume: 0.32 * (1 - d), freq: 700, sweepTo: 160, q: 0.7, type: 'lowpass' });
  thump({ freq: 130, toFreq: 40, duration: 0.3, volume: 0.55 * (1 - d) });
}

/** Trueno de la tormenta: un rugido grave que tarda en apagarse. */
export function playTrueno() {
  noise({ duration: 1.6, volume: 0.45, freq: 260, sweepTo: 60, q: 0.4, type: 'lowpass' });
  thump({ freq: 90, toFreq: 28, duration: 1.2, volume: 0.6 });
  noise({ duration: 0.25, volume: 0.25, freq: 1800, sweepTo: 400, q: 0.6, delay: 0.02 });
}

/** Subir de nivel Blitz / recompensa. */
export function playReward() {
  const notas = [523, 659, 784, 1047];
  notas.forEach((f, i) => {
    tone({ freq: f, type: 'triangle', duration: 0.18, volume: 0.22, delay: i * 0.075 });
  });
}

/* =============================================================
   LA TORMENTA
   -------------------------------------------------------------
   No es un efecto suelto sino un BUCLE que sube y baja: suena
   siempre que estas fuera de la zona, y se calla al volver dentro.
   ============================================================= */

let stormSrc = null;
let stormGain = null;

/** Arranca el bucle (una sola vez por partida). */
function ensureStorm() {
  const c = ensureContext();
  if (!c || stormSrc) return;

  // Dos segundos de ruido rosa en bucle: suficiente para que no se
  // note la costura y barato de generar.
  const frames = c.sampleRate * 2;
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  let ultimo = 0;
  for (let i = 0; i < frames; i++) {
    const blanco = Math.random() * 2 - 1;
    // Filtro sencillo de un polo: convierte el ruido blanco en algo
    // mas grave y mas parecido al viento.
    ultimo = (ultimo * 0.96) + blanco * 0.04;
    data[i] = ultimo * 8;
  }

  stormSrc = c.createBufferSource();
  stormSrc.buffer = buffer;
  stormSrc.loop = true;

  const filtro = c.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 520;

  stormGain = c.createGain();
  stormGain.gain.value = 0;

  stormSrc.connect(filtro);
  filtro.connect(stormGain);
  stormGain.connect(sfxBus);
  stormSrc.start();
}

/**
 * Cuanto se oye la tormenta, de 0 a 1.
 * Se llama cada frame con 1 si estas fuera de la zona y 0 si no; la
 * rampa se encarga de que entre y salga suave.
 */
export function setStormLevel(nivel) {
  if (muted) { if (stormGain && ctx) stormGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2); return; }
  ensureStorm();
  if (!stormGain || !ctx) return;
  stormGain.gain.setTargetAtTime(Math.max(0, Math.min(1, nivel)) * 0.35, ctx.currentTime, 0.25);
}

/** Corta la tormenta (al salir de una partida). */
export function stopStorm() {
  if (stormGain && ctx) stormGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
}
