/**
 * profile.js
 * ---------------------------------------------------------------
 * PERFIL DEL JUGADOR: pavos, objetos desbloqueados y equipamiento.
 * Se guarda en localStorage para que no se pierda entre partidas.
 *
 * Es la unica fuente de verdad sobre "que tengo" y "que llevo puesto".
 * La tienda y la taquilla solo llaman a sus metodos.
 */

import {
  CATEGORIES, DEFAULT_EQUIPPED, STARTING_VBUCKS, MATCH_REWARD, findCosmetic,
} from '../data/cosmetics.js';
import { missionById } from '../data/missions.js';
import { minigameById, isBetter } from '../data/minigames.js';
import { MAX_LEVEL, xpToNext } from '../data/levels.js';
import { passLevel, PRECIO_PREMIUM } from '../data/battlePass.js';
import { EMOTES, emoteById, freeEmotes, WHEEL_SLOTS } from '../data/emotes.js';

/** Clave de guardado. Si cambia el formato, se sube la version. */
const STORAGE_KEY = 'fortniteClash.profile.v1';

/** Lo que cuesta cambiarse el nombre (el primero es gratis). */
export const RENAME_COST = 500;
/** Limites del nombre. */
export const NAME_MIN = 3;
export const NAME_MAX = 16;

/** Estadisticas en blanco. */
function nuevasStats() {
  return {
    matches: 0,        // partidas jugadas
    wins: 0,           // victorias
    kills: 0,          // eliminaciones totales
    bestKills: 0,      // la mejor partida, en kills
    bestPlacement: null, // el mejor puesto (1 = victoria)
  };
}

export class Profile {
  constructor() {
    this.vbucks = STARTING_VBUCKS;

    /** Objetos desbloqueados por categoria: { skin: Set, pickaxe: Set, glider: Set } */
    this.owned = {};
    /** Objeto equipado por categoria: { skin: 'recluta', ... } */
    this.equipped = { ...DEFAULT_EQUIPPED };

    /**
     * MISIONES.
     *   missions[id] = progreso acumulado (solo las de scope 'total')
     *   missionsDone = ids ya cobradas, que no vuelven a pagar
     */
    this.missions = {};
    this.missionsDone = new Set();

    /**
     * AJUSTES DE SONIDO (ver ui/audioPanel.js).
     *   sfx    volumen de los efectos, 0 a 1
     *   music  volumen de la musica, 0 a 1
     *   muted  silencio total
     */
    this.audio = { sfx: 0.7, music: 0.7, muted: false };

    /** Mejor marca de cada minijuego: { tiro: 12, parkour: 18.4, ... } */
    this.records = {};

    /**
     * NIVEL Y EXPERIENCIA.
     *   level  nivel actual (1..MAX_LEVEL)
     *   xp     experiencia DENTRO del nivel actual, no la total
     */
    this.level = 1;
    this.xp = 0;

    /**
     * PASE DE BATALLA.
     *   hasPremium   si se ha comprado la ruta premium
     *   passClaimed  niveles del pase ya entregados, para no repetirlos
     */
    this.hasPremium = false;
    this.passClaimed = new Set();

    /**
     * NOMBRE DEL JUGADOR.
     *
     * Vacio = todavia no lo ha puesto, y entonces el primero es GRATIS.
     * A partir de ahi cada cambio cuesta pavos (ver `renameCost`): sin
     * eso, poner nombre no seria una decision, seria un formulario.
     */
    this.playerName = '';
    /** Cuantas veces lo ha cambiado (solo para ensenarlo en el perfil). */
    this.nameChanges = 0;

    /**
     * ESTADISTICAS DE TODAS LAS PARTIDAS.
     *
     * Se suman al terminar cada una y viven en localStorage con el
     * resto del perfil. `bestKills` y `bestPlacement` guardan la mejor
     * partida, para tener algo que superar.
     */
    this.stats = nuevasStats();

    /**
     * RACHA DE VICTORIAS.
     *   streak     partidas seguidas ganadas ahora mismo
     *   bestStreak la mejor que se ha conseguido nunca
     */
    this.streak = 0;
    this.bestStreak = 0;

    /**
     * EMOTES EQUIPADOS: los seis de la rueda, en orden.
     *
     * Cuales tienes desbloqueados vive en `owned.emote`, como el resto
     * de cosmeticos: los emotes son una categoria mas del catalogo (ver
     * data/cosmetics.js), y por eso la tienda y la taquilla los
     * ensenan sin ningun caso especial.
     */
    this.emoteSlots = new Array(WHEEL_SLOTS).fill(null);

    for (const cat of CATEGORIES) this.owned[cat.key] = new Set();

    this._grantFreeItems();
    // La rueda arranca con los emotes gratuitos ya puestos.
    freeEmotes().forEach((id, i) => { if (i < WHEEL_SLOTS) this.emoteSlots[i] = id; });
    this.load();
  }

  /**
   * Los cosmeticos marcados como `free` se tienen siempre.
   * Los del PASE DE BATALLA tambien valen 0 pavos, pero NO son gratis:
   * se ganan subiendo de nivel, asi que quedan fuera.
   */
  _grantFreeItems() {
    for (const cat of CATEGORIES) {
      for (const item of cat.list) {
        if (item.pass) continue;
        if (item.free || item.price === 0) this.owned[cat.key].add(item.id);
      }
    }
  }

  /* =============================================================
     CONSULTAS
     ============================================================= */

  /** ¿Tiene desbloqueado este objeto? */
  isOwned(category, id) {
    return this.owned[category]?.has(id) ?? false;
  }

  /**
   * ¿Lo lleva puesto ahora mismo?
   *
   * De skins, picos y paravelas solo se lleva UNO; de emotes, hasta
   * seis a la vez, asi que "equipado" es "esta en la rueda".
   */
  isEquipped(category, id) {
    if (category === 'emote') return this.emoteSlots.includes(id);
    return this.equipped[category] === id;
  }

  /** ¿Le llega el saldo para comprarlo? */
  canAfford(item) {
    return this.vbucks >= item.price;
  }

  /** Definicion completa del objeto equipado en una categoria. */
  getEquipped(category) {
    return (
      findCosmetic(category, this.equipped[category]) ||
      findCosmetic(category, DEFAULT_EQUIPPED[category])
    );
  }

  /**
   * Equipamiento completo, listo para pasarselo a la partida.
   * @returns {{skin: object, pickaxe: object, glider: object}}
   */
  getLoadout() {
    return {
      skin: this.getEquipped('skin'),
      pickaxe: this.getEquipped('pickaxe'),
      glider: this.getEquipped('glider'),
    };
  }

  /** Numero de objetos desbloqueados / totales de una categoria. */
  getProgress(category) {
    const cat = CATEGORIES.find((c) => c.key === category);
    return { owned: this.owned[category]?.size ?? 0, total: cat ? cat.list.length : 0 };
  }

  /* =============================================================
     ACCIONES
     ============================================================= */

  /**
   * Compra un cosmetico. No hace nada si ya lo tiene o no le llega.
   * @returns {{ok: boolean, reason?: string}}
   */
  buy(category, id) {
    const item = findCosmetic(category, id);
    if (!item) return { ok: false, reason: 'Ese objeto no existe.' };
    if (this.isOwned(category, id)) return { ok: false, reason: 'Ya tienes este objeto.' };
    if (!this.canAfford(item)) {
      const faltan = item.price - this.vbucks;
      return { ok: false, reason: `Te faltan ${faltan} pavos.` };
    }

    this.vbucks -= item.price;
    this.owned[category].add(id);
    // Comprar un emote y tener que ir a equiparlo aparte seria un paso
    // de mas: se mete solo en el primer hueco libre de la rueda.
    if (category === 'emote') this._autoEquipEmote(id);
    this.save();
    return { ok: true };
  }

  /**
   * Equipa un cosmetico ya desbloqueado.
   * @returns {{ok: boolean, reason?: string}}
   */
  equip(category, id) {
    if (!findCosmetic(category, id)) return { ok: false, reason: 'Ese objeto no existe.' };
    if (!this.isOwned(category, id)) return { ok: false, reason: 'Todavia no tienes este objeto.' };

    // Los emotes van a la rueda: si ya estaba, el boton lo QUITA, que es
    // la unica forma de hacer sitio cuando las seis ranuras estan llenas.
    if (category === 'emote') {
      const ranura = this.emoteSlots.indexOf(id);
      if (ranura !== -1) {
        this.emoteSlots[ranura] = null;
        this.save();
        return { ok: true, removed: true };
      }
      const libre = this.emoteSlots.indexOf(null);
      if (libre === -1) {
        return { ok: false, reason: 'La rueda esta llena: quita uno primero' };
      }
      this.emoteSlots[libre] = id;
      this.save();
      return { ok: true };
    }

    this.equipped[category] = id;
    this.save();
    return { ok: true };
  }

  /** Anade pavos. */
  addVbucks(amount) {
    this.vbucks = Math.max(0, this.vbucks + amount);
    this.save();
  }

  /**
   * Recompensa por jugar una partida.
   * Cuando existan los bots y el final de partida de verdad, bastara con
   * llamar a esto solo cuando el jugador GANE.
   * @returns {number} pavos ganados
   */
  addMatchReward() {
    this.addVbucks(MATCH_REWARD);
    this.matchesPlayed = (this.matchesPlayed || 0) + 1;
    return MATCH_REWARD;
  }

  /* =============================================================
     NOMBRE DEL JUGADOR
     ============================================================= */

  /** El nombre que se ensena. Si no ha puesto ninguno, uno por defecto. */
  get displayName() {
    return this.playerName || 'Jugador';
  }

  /** ¿Todavia no ha puesto nombre? Entonces el primero es gratis. */
  get hasName() {
    return this.playerName.length > 0;
  }

  /** Lo que cuesta el proximo cambio: 0 la primera vez. */
  get renameCost() {
    return this.hasName ? RENAME_COST : 0;
  }

  /**
   * Cambia el nombre, cobrando si toca.
   *
   * Valida aqui y no en la pantalla a proposito: la interfaz puede
   * cambiar, pero las reglas de que es un nombre valido y de cuanto
   * cuesta tienen que vivir en un solo sitio.
   *
   * @returns {{ok: boolean, reason?: string, cost?: number}}
   */
  setPlayerName(nombre) {
    const limpio = String(nombre || '').trim().replace(/\s+/g, ' ').slice(0, NAME_MAX);

    if (limpio.length < NAME_MIN) {
      return { ok: false, reason: `Minimo ${NAME_MIN} letras` };
    }
    if (limpio === this.playerName) {
      return { ok: false, reason: 'Ese ya es tu nombre' };
    }

    const coste = this.renameCost;
    if (coste > this.vbucks) {
      return { ok: false, reason: `Te faltan ${coste - this.vbucks} pavos` };
    }

    if (coste > 0) {
      this.vbucks -= coste;
      this.nameChanges++;
    }
    this.playerName = limpio;
    this.save();
    return { ok: true, cost: coste };
  }

  /* =============================================================
     EMOTES
     ============================================================= */

  /** ¿Lo tiene desbloqueado? */
  hasEmote(id) {
    return this.isOwned('emote', id);
  }

  /** Compra un emote. Atajo de `buy('emote', id)`, que hace lo mismo. */
  buyEmote(id) {
    return this.buy('emote', id);
  }

  /** Mete un emote en el primer hueco libre de la rueda. */
  _autoEquipEmote(id) {
    if (this.emoteSlots.includes(id)) return;
    const hueco = this.emoteSlots.indexOf(null);
    if (hueco !== -1) this.emoteSlots[hueco] = id;
  }

  /**
   * Pone un emote en una ranura de la rueda. Si ya estaba en otra, se
   * intercambian: asi no se puede tener el mismo dos veces.
   */
  equipEmote(slot, id) {
    if (slot < 0 || slot >= WHEEL_SLOTS) return false;
    if (id !== null && !this.hasEmote(id)) return false;

    const anterior = this.emoteSlots[slot];
    const otra = this.emoteSlots.indexOf(id);
    if (id !== null && otra !== -1) this.emoteSlots[otra] = anterior;

    this.emoteSlots[slot] = id;
    this.save();
    return true;
  }

  /* =============================================================
     ESTADISTICAS Y RACHAS
     ============================================================= */

  /**
   * Apunta el resultado de una partida.
   *
   * @param {object} resumen { won, kills, placement }
   */
  recordMatch({ won = false, kills = 0, placement = null } = {}) {
    const st = this.stats;

    st.matches++;
    st.kills += kills;
    if (won) st.wins++;
    if (kills > st.bestKills) st.bestKills = kills;
    if (placement && (st.bestPlacement === null || placement < st.bestPlacement)) {
      st.bestPlacement = placement;
    }

    // --- Racha ---
    // Sube al ganar y se va a cero al perder. Sin lo segundo no seria
    // una racha, seria otro contador de victorias.
    if (won) {
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    } else {
      this.streak = 0;
    }

    this.save();
    return st;
  }

  /** Kills por partida, redondeado a un decimal. */
  get killsPerMatch() {
    const st = this.stats;
    return st.matches > 0 ? Math.round((st.kills / st.matches) * 10) / 10 : 0;
  }

  /** Porcentaje de victorias, entero. */
  get winRate() {
    const st = this.stats;
    return st.matches > 0 ? Math.round((st.wins / st.matches) * 100) : 0;
  }

  /* =============================================================
     MISIONES
     ============================================================= */

  /** Progreso guardado de una mision acumulativa. */
  missionProgress(id) {
    return this.missions[id] || 0;
  }

  /** Guarda el progreso de una mision acumulativa. */
  setMissionProgress(id, value) {
    this.missions[id] = Math.max(0, Math.floor(value));
    this.save();
  }

  /** ¿Esta mision ya esta cobrada? */
  missionDone(id) {
    return this.missionsDone.has(id);
  }

  /** Marca una mision como cumplida (no vuelve a pagar). */
  completeMission(id) {
    this.missionsDone.add(id);
    this.save();
  }

  /* =============================================================
     NIVEL Y EXPERIENCIA
     ============================================================= */

  /** XP que falta para el siguiente nivel. */
  get xpNeeded() {
    return xpToNext(this.level);
  }

  /** Progreso dentro del nivel actual, de 0 a 1. */
  get levelProgress() {
    if (this.level >= MAX_LEVEL) return 1;
    return Math.max(0, Math.min(1, this.xp / this.xpNeeded));
  }

  /** ¿Esta ya al maximo? */
  get maxLevel() {
    return this.level >= MAX_LEVEL;
  }

  /**
   * Suma experiencia y sube de nivel las veces que haga falta.
   *
   * Devuelve el detalle para poder avisar en pantalla: cuantos niveles
   * se han subido y cuales, que es lo que necesita el pase de batalla
   * para entregar sus recompensas.
   *
   * @param {number} cantidad
   * @returns {{ganada:number, subidos:number[], nivel:number}}
   */
  addXp(cantidad) {
    if (!Number.isFinite(cantidad) || cantidad <= 0 || this.maxLevel) {
      return { ganada: 0, subidos: [], nivel: this.level, premios: [] };
    }

    const subidos = this._addXpRaw(cantidad);

    // Subir de nivel entrega lo que toque del pase de batalla.
    const premios = this.claimPass();

    this.save();
    return { ganada: Math.round(cantidad), subidos, nivel: this.level, premios };
  }

  /**
   * Suma XP y sube niveles, SIN tocar el pase.
   * Existe aparte porque las recompensas del pase pueden dar XP: si esto
   * llamase al reparto del pase, se llamarian el uno al otro sin fin.
   * @returns {number[]} niveles alcanzados
   */
  _addXpRaw(cantidad) {
    const subidos = [];
    if (this.maxLevel) return subidos;

    this.xp += Math.round(cantidad);

    while (!this.maxLevel && this.xp >= this.xpNeeded) {
      this.xp -= this.xpNeeded;
      this.level++;
      subidos.push(this.level);
    }

    if (this.maxLevel) this.xp = 0;
    return subidos;
  }

  /* =============================================================
     PASE DE BATALLA
     ============================================================= */

  /**
   * Compra la ruta premium.
   *
   * Al comprarla se entregan TAMBIEN las recompensas de los niveles que
   * ya tenias: si vas por el 40, no seria justo empezar a recibir desde
   * el 41 en adelante.
   *
   * @returns {{ok:boolean, reason?:string, premios?:Array}}
   */
  buyPremiumPass() {
    if (this.hasPremium) return { ok: false, reason: 'Ya tienes el pase premium.' };
    if (this.vbucks < PRECIO_PREMIUM) {
      return { ok: false, reason: `Te faltan ${PRECIO_PREMIUM - this.vbucks} pavos.` };
    }

    this.vbucks -= PRECIO_PREMIUM;
    this.hasPremium = true;

    const premios = this.claimPass();
    this.save();
    return { ok: true, premios };
  }

  /**
   * Entrega todo lo del pase que te corresponda y aun no tengas.
   *
   * Se mira SIEMPRE desde el nivel 1: asi da igual como hayas llegado
   * hasta aqui (subiendo, comprando el premium a mitad o cargando una
   * partida guardada), nunca se queda nada sin dar ni se da dos veces.
   *
   * @returns {Array<{level:number, ruta:string, premio:object}>}
   */
  claimPass() {
    if (this._claiming) return [];
    this._claiming = true;

    const premios = [];
    let vueltas = 0;

    // Las recompensas de XP pueden hacerte subir de nivel, y ese nivel
    // nuevo puede traer mas recompensas: se repite hasta que no quede
    // nada pendiente (con tope, por si acaso).
    while (vueltas++ < 20) {
      let xpExtra = 0;

      for (let n = 1; n <= this.level; n++) {
        const tier = passLevel(n);
        if (!tier) continue;

        for (const ruta of ['free', 'premium']) {
          const premio = tier[ruta];
          if (!premio) continue;
          if (ruta === 'premium' && !this.hasPremium) continue;

          const clave = `${ruta[0]}${n}`;
          if (this.passClaimed.has(clave)) continue;

          this.passClaimed.add(clave);
          xpExtra += this._entregar(premio);
          premios.push({ level: n, ruta, premio });
        }
      }

      if (xpExtra <= 0) break;
      this._addXpRaw(xpExtra);
    }

    this._claiming = false;
    return premios;
  }

  /**
   * Da una recompensa concreta.
   * @returns {number} XP que hay que sumar aparte (0 si no es de XP)
   */
  _entregar(premio) {
    switch (premio.type) {
      case 'vbucks':
        this.vbucks = Math.max(0, this.vbucks + premio.amount);
        return 0;

      case 'xp':
        // No se suma aqui: la devuelve claimPass para aplicarla sin
        // meterse en una recursion.
        return premio.amount;

      default: {
        // skin | pickaxe | glider
        const set = this.owned[premio.type];
        if (set) set.add(premio.id);
        return 0;
      }
    }
  }

  /* =============================================================
     MINIJUEGOS
     ============================================================= */

  /** Mejor marca guardada de un minijuego (null si nunca se ha jugado). */
  record(id) {
    return Object.prototype.hasOwnProperty.call(this.records, id) ? this.records[id] : null;
  }

  /**
   * Guarda una marca solo si mejora la anterior. En los minijuegos de
   * tiempo gana la MENOR y en el resto la mayor: de eso se encarga
   * isBetter, que conoce el tipo de cada uno.
   * @returns {boolean} si era record
   */
  saveRecord(id, valor) {
    const def = minigameById(id);
    if (!def || !Number.isFinite(valor)) return false;
    if (def.score === 'none') return false;
    if (!isBetter(def, valor, this.record(id))) return false;

    this.records[id] = valor;
    this.save();
    return true;
  }

  /* =============================================================
     PERSISTENCIA
     ============================================================= */

  save() {
    const data = {
      vbucks: this.vbucks,
      equipped: this.equipped,
      owned: {},
      matchesPlayed: this.matchesPlayed || 0,
      missions: this.missions,
      missionsDone: [...this.missionsDone],
      records: this.records,
      level: this.level,
      xp: this.xp,
      hasPremium: this.hasPremium,
      passClaimed: [...this.passClaimed],
      playerName: this.playerName,
      nameChanges: this.nameChanges,
      stats: this.stats,
      streak: this.streak,
      bestStreak: this.bestStreak,
      emoteSlots: this.emoteSlots,
      audio: this.audio,
    };
    for (const cat of CATEGORIES) data.owned[cat.key] = [...this.owned[cat.key]];

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Modo incognito o almacenamiento lleno: el juego sigue funcionando,
      // simplemente no se guarda la partida.
      console.warn('[FORTNITE CLASH] No se ha podido guardar el perfil:', e);
    }
  }

  load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      console.warn('[FORTNITE CLASH] No se ha podido leer el perfil guardado:', e);
      return false;
    }
    if (!raw) return false;

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.warn('[FORTNITE CLASH] Perfil guardado corrupto; se empieza de cero.');
      return false;
    }

    // Saldo (validando que sea un numero razonable)
    if (Number.isFinite(data?.vbucks)) this.vbucks = Math.max(0, Math.floor(data.vbucks));

    // Desbloqueados: se ignoran ids que ya no existan en el catalogo
    for (const cat of CATEGORIES) {
      const ids = data?.owned?.[cat.key];
      if (!Array.isArray(ids)) continue;
      for (const id of ids) {
        if (findCosmetic(cat.key, id)) this.owned[cat.key].add(id);
      }
    }

    // Equipado: solo si existe Y esta desbloqueado
    for (const cat of CATEGORIES) {
      const id = data?.equipped?.[cat.key];
      if (id && this.isOwned(cat.key, id)) this.equipped[cat.key] = id;
    }

    if (Number.isFinite(data?.matchesPlayed)) this.matchesPlayed = data.matchesPlayed;

    // Misiones: se ignoran ids que ya no existan en el catalogo, igual
    // que con los cosmeticos.
    if (data?.missions && typeof data.missions === 'object') {
      for (const [id, valor] of Object.entries(data.missions)) {
        if (missionById(id) && Number.isFinite(valor)) {
          this.missions[id] = Math.max(0, Math.floor(valor));
        }
      }
    }
    if (Array.isArray(data?.missionsDone)) {
      for (const id of data.missionsDone) {
        if (missionById(id)) this.missionsDone.add(id);
      }
    }

    // Records de minijuegos (se ignoran ids que ya no existan)
    if (data?.records && typeof data.records === 'object') {
      for (const [id, valor] of Object.entries(data.records)) {
        if (minigameById(id) && Number.isFinite(valor)) this.records[id] = valor;
      }
    }

    // Nivel y experiencia (acotados por si el guardado viene tocado)
    if (Number.isFinite(data?.level)) {
      this.level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(data.level)));
    }
    if (Number.isFinite(data?.xp)) {
      this.xp = Math.max(0, Math.min(this.xpNeeded, Math.floor(data.xp)));
    }

    // Pase de batalla.
    // OJO: las claves son TEXTO ('f12' gratis, 'p12' premium), no numeros.
    // Validandolas como numeros se descartaban todas al cargar, y en la
    // siguiente subida de nivel el pase volvia a pagar lo ya entregado.
    this.hasPremium = data?.hasPremium === true;

    // --- Nombre, estadisticas, rachas y emotes ---
    if (typeof data?.playerName === 'string') {
      this.playerName = data.playerName.slice(0, NAME_MAX);
    }
    if (Number.isFinite(data?.nameChanges)) this.nameChanges = Math.max(0, data.nameChanges);

    if (data?.stats && typeof data.stats === 'object') {
      const st = nuevasStats();
      for (const k of Object.keys(st)) {
        const v = data.stats[k];
        // `bestPlacement` puede ser null a proposito (aun sin partidas).
        if (v === null) continue;
        if (Number.isFinite(v)) st[k] = Math.max(0, Math.floor(v));
      }
      this.stats = st;
    }
    if (Number.isFinite(data?.streak)) this.streak = Math.max(0, Math.floor(data.streak));
    if (Number.isFinite(data?.bestStreak)) this.bestStreak = Math.max(0, Math.floor(data.bestStreak));

    // --- Sonido ---
    if (data?.audio && typeof data.audio === 'object') {
      const a = data.audio;
      const clamp01 = (v, porDefecto) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : porDefecto);
      this.audio = {
        sfx: clamp01(a.sfx, 0.7),
        music: clamp01(a.music, 0.7),
        muted: a.muted === true,
      };
    }

    // Perfiles guardados ANTES de que los emotes fueran una categoria:
    // llevaban su propia lista. Se pasan a `owned.emote` y listo.
    if (Array.isArray(data?.emotes)) {
      for (const id of data.emotes) {
        if (emoteById(id).id === id) this.owned.emote.add(id);
      }
    }
    if (Array.isArray(data?.emoteSlots)) {
      this.emoteSlots = new Array(WHEEL_SLOTS).fill(null);
      data.emoteSlots.slice(0, WHEEL_SLOTS).forEach((id, i) => {
        if (id && this.isOwned('emote', id)) this.emoteSlots[i] = id;
      });
    }
    if (Array.isArray(data?.passClaimed)) {
      for (const clave of data.passClaimed) {
        if (typeof clave === 'string' && /^[fp]\d+$/.test(clave)) {
          this.passClaimed.add(clave);
        }
      }
    }

    return true;
  }

  /** Borra el progreso y vuelve al estado inicial (util para probar). */
  reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* da igual: reconstruimos en memoria de todos modos */ }

    this.vbucks = STARTING_VBUCKS;
    this.equipped = { ...DEFAULT_EQUIPPED };
    for (const cat of CATEGORIES) this.owned[cat.key] = new Set();
    this.missions = {};
    this.missionsDone = new Set();
    this.records = {};
    this.matchesPlayed = 0;
    this.playerName = '';
    this.nameChanges = 0;
    this.stats = nuevasStats();
    this.streak = 0;
    this.bestStreak = 0;
    this.emoteSlots = new Array(WHEEL_SLOTS).fill(null);
    freeEmotes().forEach((id, i) => { if (i < WHEEL_SLOTS) this.emoteSlots[i] = id; });
    this.level = 1;
    this.xp = 0;
    this.hasPremium = false;
    this.passClaimed = new Set();

    /**
     * NOMBRE DEL JUGADOR.
     *
     * Vacio = todavia no lo ha puesto, y entonces el primero es GRATIS.
     * A partir de ahi cada cambio cuesta pavos (ver `renameCost`): sin
     * eso, poner nombre no seria una decision, seria un formulario.
     */
    this.playerName = '';
    /** Cuantas veces lo ha cambiado (solo para ensenarlo en el perfil). */
    this.nameChanges = 0;

    /**
     * ESTADISTICAS DE TODAS LAS PARTIDAS.
     *
     * Se suman al terminar cada una y viven en localStorage con el
     * resto del perfil. `bestKills` y `bestPlacement` guardan la mejor
     * partida, para tener algo que superar.
     */
    this.stats = nuevasStats();

    /**
     * RACHA DE VICTORIAS.
     *   streak     partidas seguidas ganadas ahora mismo
     *   bestStreak la mejor que se ha conseguido nunca
     */
    this.streak = 0;
    this.bestStreak = 0;

    /**
     * EMOTES EQUIPADOS: los seis de la rueda, en orden.
     *
     * Cuales tienes desbloqueados vive en `owned.emote`, como el resto
     * de cosmeticos: los emotes son una categoria mas del catalogo (ver
     * data/cosmetics.js), y por eso la tienda y la taquilla los
     * ensenan sin ningun caso especial.
     */
    this.emoteSlots = new Array(WHEEL_SLOTS).fill(null);
    this._grantFreeItems();
    this.save();
  }
}
