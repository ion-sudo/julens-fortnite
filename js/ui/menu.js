/**
 * menu.js
 * ---------------------------------------------------------------
 * Controlador del MENU PRINCIPAL: inicio, tienda, taquilla e
 * instrucciones. La interfaz es DOM (ver index.html + css/menu.css);
 * aqui solo va la logica de pintarla y reaccionar a los clics.
 *
 * No sabe nada del bucle del juego: cuando el jugador elige un modo
 * simplemente llama al callback `onPlay(loadout, modo)` que le pasa
 * main.js.
 */

import { CATEGORIES, rarityOf } from '../data/cosmetics.js';
import { drawItemPreview, makePreviewCanvas } from './itemPreview.js';
import { MissionManager } from '../systems/missions.js';
import { MINIGAMES, formatScore } from '../data/minigames.js';
import { MAX_LEVEL } from '../data/levels.js';
import { PASS_LEVELS, PRECIO_PREMIUM, totalVbucksPremium } from '../data/battlePass.js';
import { findCosmetic } from '../data/cosmetics.js';
import { PARKOUR_LEVELS } from '../data/parkourLevels.js';
import { drawMinigameIcon } from './minigameIcon.js';
import { MODES, DEFAULT_MODE } from '../data/modes.js';
import { drawModeIcon } from './modeIcon.js';
import { EMOTES, WHEEL_SLOTS } from '../data/emotes.js';
import { drawEmoteIcon } from './emoteWheel.js';
import { RENAME_COST, NAME_MIN, NAME_MAX } from '../core/profile.js';

/**
 * Los minijuegos que salen en su pantalla. Alguno esta en el catalogo
 * solo para reutilizar su montaje y NO es un minijuego (JULEN DEFENSA es
 * un modo de MAS JUEGOS): esos llevan `hidden` y aqui se quedan fuera.
 */
const MINIJUEGOS_VISIBLES = MINIGAMES.filter((m) => !m.hidden);

export class Menu {
  /**
   * @param {import('../core/profile.js').Profile} profile
   * @param {{onPlay: (loadout: object, mode: string) => void}} handlers
   */
  constructor(profile, handlers = {}) {
    this.profile = profile;
    this.onPlay = handlers.onPlay || (() => {});

    // --- Referencias del DOM ---
    this.root = document.getElementById('menu-root');
    this.screens = [...this.root.querySelectorAll('.menu-screen')];
    this.toastEl = document.getElementById('menu-toast');
    this.vbucksEl = document.getElementById('vbucks-amount');

    /** Nivel y barra de experiencia de la barra superior. */
    this.levelBox = document.getElementById('level-box');
    this.levelNumber = document.getElementById('level-number');
    this.levelFill = document.getElementById('level-fill');
    this.levelXp = document.getElementById('level-xp');

    this.showcaseCanvas = document.getElementById('showcase-canvas');
    this.showcaseCtx = this.showcaseCanvas.getContext('2d');

    // Pestana activa de cada rejilla (tienda y taquilla van por separado)
    this.activeTab = { shop: 'skin', locker: 'skin' };

    /**
     * Vista de MISIONES. Se crea aqui su propio gestor: el del juego
     * lleva el progreso durante la partida, y este solo lee lo que hay
     * guardado en el perfil para pintarlo. Los dos miran los mismos
     * datos, asi que siempre coinciden.
     */
    this.missions = new MissionManager({ profile });
    this.missionsList = document.getElementById('missions-list');
    this.missionsCount = document.getElementById('missions-count');
    this.missionsSub = document.getElementById('missions-sub');

    /** Vista del PASE DE BATALLA. */
    this.passGrid = document.getElementById('pass-grid');
    this.passTop = document.getElementById('pass-top');
    this.passState = document.getElementById('pass-state');
    this.passSub = document.getElementById('pass-sub');

    /** Vista de MINIJUEGOS. */
    this.minigameGrid = document.getElementById('minigame-grid');
    this.minigamesSub = document.getElementById('minigames-sub');
    this.onPlayMinigame = handlers.onPlayMinigame || (() => {});

    /** Vista de MAS JUEGOS (el selector de modos). */
    this.modeGrid = document.getElementById('mode-grid');
    this.modesSub = document.getElementById('modes-sub');

    /** Vista de PERFIL. */
    this.profileBody = document.getElementById('profile-body');

    this.visible = false;
    this.time = 0;
    this._rafId = 0;
    this._lastTs = 0;
    this._toastTimer = 0;

    this._buildTabs();
    this._bindEvents();

    this._tick = this._tick.bind(this);
  }

  /* =============================================================
     MOSTRAR / OCULTAR
     ============================================================= */

  show(screen = 'home') {
    this.visible = true;
    document.body.classList.add('in-menu');
    this.goto(screen);
    this.refresh();

    // Bucle propio solo para animar la vitrina (barato y autocontenido).
    this._lastTs = performance.now();
    if (!this._rafId) this._rafId = requestAnimationFrame(this._tick);
  }

  hide() {
    this.visible = false;
    document.body.classList.remove('in-menu');
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
  }

  /** Cambia de pantalla dentro del menu. */
  goto(screen) {
    for (const section of this.screens) {
      section.classList.toggle('is-active', section.dataset.screen === screen);
    }
    this.currentScreen = screen;

    // Las rejillas se repintan al entrar (pueden haber cambiado saldo/compras).
    if (screen === 'shop') this.renderGrid('shop');
    if (screen === 'locker') this.renderGrid('locker');
    if (screen === 'missions') this.renderMissions();
    if (screen === 'minigames') this.renderMinigames();
    if (screen === 'modes') this.renderModes();
    if (screen === 'profile') this.renderProfile();
    if (screen === 'pass') this.renderPass();
  }

  /** El subtitulo de la TIENDA cuenta los cosmeticos que hay de verdad. */
  _updateShopBadge() {
    const el = document.getElementById('shop-sub');
    if (!el) return;
    const total = CATEGORIES.reduce((n, c) => n + c.list.length, 0);
    el.textContent = `${total} skins, picos y paravelas`;
  }

  /** Repinta saldo, vitrina y la rejilla que se este viendo. */
  refresh() {
    this.renderVbucks();
    this.renderLevel();
    this.renderShowcase();
    if (this.currentScreen === 'shop') this.renderGrid('shop');
    if (this.currentScreen === 'locker') this.renderGrid('locker');
    if (this.currentScreen === 'missions') this.renderMissions();
    if (this.currentScreen === 'minigames') this.renderMinigames();
    if (this.currentScreen === 'modes') this.renderModes();
    if (this.currentScreen === 'profile') this.renderProfile();
    if (this.currentScreen === 'pass') this.renderPass();
    this._updatePassBadge();
    this._updateTabCounts();
    this._updateMissionsBadge();
    this._updateMinigamesBadge();
    this._updateModesBadge();
    this._updateShopBadge();
    this._updateProfileBadge();
  }

  /** Nivel y barra de experiencia de la barra superior. */
  renderLevel() {
    if (!this.levelNumber) return;

    const p = this.profile;
    this.levelNumber.textContent = String(p.level);
    this.levelFill.style.width = `${Math.round(p.levelProgress * 100)}%`;
    this.levelXp.textContent = p.maxLevel
      ? `NIVEL ${MAX_LEVEL} · al maximo`
      : `${p.xp} / ${p.xpNeeded} XP`;

    this.levelBox?.classList.toggle('is-max', p.maxLevel);
  }

  /* =============================================================
     PASE DE BATALLA
     ============================================================= */

  /** Subtitulo del boton del menu. */
  _updatePassBadge() {
    if (!this.passSub) return;
    const p = this.profile;
    this.passSub.textContent = p.hasPremium
      ? `Premium · nivel ${p.level} de ${MAX_LEVEL}`
      : `Nivel ${p.level} de ${MAX_LEVEL} · sin premium`;
  }

  /** Pinta la cabecera y los 100 niveles. */
  renderPass() {
    if (!this.passGrid) return;

    const p = this.profile;
    const premium = p.hasPremium;

    // --- Estado en la cabecera ---
    if (this.passState) {
      this.passState.textContent = premium ? 'PASE PREMIUM' : 'Pase gratis';
      this.passState.classList.toggle('is-premium', premium);
    }

    this._renderPassTop();

    // --- Los 100 niveles ---
    this.passGrid.innerHTML = '';
    for (const tier of PASS_LEVELS) this.passGrid.appendChild(this._passTier(tier));
  }

  /** La barra de arriba: estado, progreso y boton de compra. */
  _renderPassTop() {
    if (!this.passTop) return;
    const p = this.profile;
    const premium = p.hasPremium;

    this.passTop.innerHTML = '';

    const info = document.createElement('div');
    info.className = 'pass-top-info';

    const titulo = document.createElement('div');
    titulo.className = 'pass-top-title';
    titulo.textContent = premium
      ? `Pase premium · vas por el nivel ${p.level} de ${MAX_LEVEL}`
      : `Nivel ${p.level} de ${MAX_LEVEL}`;

    const nota = document.createElement('div');
    nota.className = 'pass-top-note';
    nota.textContent = premium
      ? 'Cada nivel que subes te entrega su recompensa automaticamente.'
      : `Con el pase premium desbloqueas la ruta completa de los ${MAX_LEVEL} niveles, ` +
        `que devuelve ${totalVbucksPremium()} pavos ademas de todos los cosmeticos.`;

    info.append(titulo, nota);

    const btn = document.createElement('button');
    if (premium) {
      btn.className = 'pass-buy is-off';
      btn.textContent = 'YA LO TIENES';
      btn.disabled = true;
    } else {
      const puede = p.vbucks >= PRECIO_PREMIUM;
      btn.className = 'pass-buy' + (puede ? '' : ' is-off');
      btn.textContent = `COMPRAR · ${PRECIO_PREMIUM} PAVOS`;
      btn.dataset.action = 'buy-pass';
    }

    this.passTop.append(info, btn);
  }

  /** Una tarjeta de nivel del pase. */
  _passTier(tier) {
    const p = this.profile;
    const card = document.createElement('article');
    card.className = 'pass-tier' + (p.level === tier.level ? ' is-now' : '');

    const num = document.createElement('div');
    num.className = 'pass-tier-num';
    num.textContent = `NIVEL ${tier.level}`;
    card.appendChild(num);

    // Casilla gratis (puede no haber recompensa en este nivel)
    card.appendChild(this._passSlot(tier.free, 'free', tier.level));
    // Casilla premium
    card.appendChild(this._passSlot(tier.premium, 'premium', tier.level));

    return card;
  }

  /**
   * Una casilla de recompensa.
   * @param {object|null} premio
   * @param {'free'|'premium'} ruta
   */
  _passSlot(premio, ruta, nivel) {
    const p = this.profile;
    const slot = document.createElement('div');
    slot.className = `pass-slot is-${ruta}`;

    if (!premio) {
      slot.classList.add('is-empty');
      const vacio = document.createElement('div');
      vacio.className = 'pass-slot-name';
      vacio.textContent = '—';
      slot.append(vacio);
      return slot;
    }

    // Desbloqueada si has llegado al nivel Y tienes acceso a esa ruta.
    const alcanzado = p.level >= nivel;
    const conAcceso = ruta === 'free' || p.hasPremium;
    if (!alcanzado || !conAcceso) slot.classList.add('is-locked');

    // --- Dibujo y nombre ---
    if (premio.type === 'vbucks' || premio.type === 'xp') {
      const icono = document.createElement('div');
      icono.style.fontSize = '26px';
      icono.style.lineHeight = '54px';
      icono.textContent = premio.type === 'vbucks' ? '🪙' : '⭐';
      slot.appendChild(icono);

      const nombre = document.createElement('div');
      nombre.className = 'pass-slot-name';
      nombre.textContent = premio.type === 'vbucks'
        ? `${premio.amount} pavos`
        : `${premio.amount} XP`;
      slot.appendChild(nombre);
    } else {
      const item = findCosmetic(premio.type, premio.id);
      const canvas = makePreviewCanvas(54, 54);
      if (item) drawItemPreview(canvas.getContext('2d'), item);
      slot.appendChild(canvas);

      const nombre = document.createElement('div');
      nombre.className = 'pass-slot-name';
      nombre.textContent = item ? item.name : premio.id;
      slot.appendChild(nombre);
    }

    const tag = document.createElement('div');
    tag.className = 'pass-slot-tag';
    tag.textContent = ruta === 'free' ? 'Gratis' : 'Premium';
    slot.appendChild(tag);

    return slot;
  }

  /* =============================================================
     MINIJUEGOS
     ============================================================= */

  /* =============================================================
     PERFIL
     ============================================================= */

  /** Subtitulo del boton: tu nombre, o el aviso de que falta ponerlo. */
  _updateProfileBadge() {
    const el = document.getElementById('profile-sub');
    if (!el) return;
    el.textContent = this.profile.hasName
      ? `${this.profile.displayName} · ${this.profile.stats.wins} victorias`
      : 'Ponte un nombre (gratis)';
  }

  /** La pantalla entera: nombre, numeros, racha y emotes. */
  renderProfile() {
    if (!this.profileBody) return;
    this.profileBody.innerHTML = '';

    this.profileBody.appendChild(this._profileNombre());
    this.profileBody.appendChild(this._profileStats());
    this.profileBody.appendChild(this._profileEmotes());
  }

  /** Bloque del NOMBRE, con su campo y su boton. */
  _profileNombre() {
    const p = this.profile;
    const caja = document.createElement('section');
    caja.className = 'profile-card';

    const h = document.createElement('h3');
    h.textContent = 'TU NOMBRE';
    caja.appendChild(h);

    const fila = document.createElement('div');
    fila.className = 'profile-name-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'profile-name-input';
    input.id = 'profile-name-input';
    input.maxLength = NAME_MAX;
    input.placeholder = `De ${NAME_MIN} a ${NAME_MAX} letras`;
    input.value = p.playerName;
    // Enter equivale a pulsar el boton: es lo que espera cualquiera.
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleRename();
      e.stopPropagation();
    });

    const btn = document.createElement('button');
    btn.className = 'item-action buy';
    btn.dataset.action = 'rename';
    btn.textContent = p.hasName ? `CAMBIAR · ${RENAME_COST} pavos` : 'PONER NOMBRE · GRATIS';

    fila.append(input, btn);
    caja.appendChild(fila);

    const nota = document.createElement('p');
    nota.className = 'profile-note';
    nota.textContent = p.hasName
      ? `El primero fue gratis; cada cambio cuesta ${RENAME_COST} pavos. Lo has cambiado ${p.nameChanges} vez(ces).`
      : 'El primero es gratis. A partir de ahi, cada cambio cuesta pavos.';
    caja.appendChild(nota);

    return caja;
  }

  /** Bloque de ESTADISTICAS y RACHA. */
  _profileStats() {
    const p = this.profile;
    const st = p.stats;

    const caja = document.createElement('section');
    caja.className = 'profile-card';

    const h = document.createElement('h3');
    h.textContent = 'ESTADISTICAS';
    caja.appendChild(h);

    const rejilla = document.createElement('div');
    rejilla.className = 'profile-stats';

    const filas = [
      { label: 'Victorias', valor: st.wins, destaca: true },
      { label: 'Eliminaciones', valor: st.kills, destaca: true },
      { label: 'Partidas', valor: st.matches },
      { label: '% victorias', valor: `${p.winRate}%` },
      { label: 'Kills por partida', valor: p.killsPerMatch },
      { label: 'Mejor partida', valor: `${st.bestKills} kills` },
      { label: 'Mejor puesto', valor: st.bestPlacement === null ? '—' : `#${st.bestPlacement}` },
    ];

    for (const f of filas) {
      const d = document.createElement('div');
      d.className = 'profile-stat' + (f.destaca ? ' is-big' : '');
      const v = document.createElement('b');
      v.textContent = String(f.valor);
      const l = document.createElement('span');
      l.textContent = f.label;
      d.append(v, l);
      rejilla.appendChild(d);
    }
    caja.appendChild(rejilla);

    // --- Racha ---
    const racha = document.createElement('div');
    racha.className = 'profile-streak' + (p.streak > 0 ? ' is-hot' : '');

    const izq = document.createElement('div');
    izq.innerHTML = `<b>${p.streak}</b><span>Racha actual</span>`;
    const der = document.createElement('div');
    der.innerHTML = `<b>${p.bestStreak}</b><span>Mejor racha</span>`;

    const texto = document.createElement('p');
    texto.className = 'profile-note';
    texto.textContent = p.streak > 0
      ? `¡Llevas ${p.streak} seguida(s)! Si pierdes, vuelve a cero.`
      : 'Gana dos partidas seguidas para empezar una racha.';

    racha.append(izq, der);
    caja.append(racha, texto);

    return caja;
  }

  /**
   * Bloque de EMOTES: los ocho, con su precio o su ranura.
   *
   * Se compran y se equipan desde aqui mismo. Tenerlo todo junto en el
   * perfil evita repartir los emotes entre la tienda y la taquilla por
   * dos objetos que no son cosmeticos del personaje.
   */
  _profileEmotes() {
    const p = this.profile;
    const caja = document.createElement('section');
    caja.className = 'profile-card';

    const h = document.createElement('h3');
    h.textContent = `EMOTES · rueda con la tecla B`;
    caja.appendChild(h);

    const nota = document.createElement('p');
    nota.className = 'profile-note';
    nota.textContent =
      'Los que equipes salen en la rueda, en este orden. Bailando no puedes disparar.';
    caja.appendChild(nota);

    const rejilla = document.createElement('div');
    rejilla.className = 'emote-grid';

    for (const def of EMOTES) {
      rejilla.appendChild(this._emoteCard(def));
    }
    caja.appendChild(rejilla);
    return caja;
  }

  _emoteCard(def) {
    const p = this.profile;
    const tengo = p.hasEmote(def.id);
    const ranura = p.emoteSlots.indexOf(def.id);

    const card = document.createElement('article');
    card.className = 'emote-card' + (tengo ? ' is-owned' : '');
    card.style.setProperty('--em-color', rarityOf(def).color);

    const stage = document.createElement('div');
    stage.className = 'emote-stage';
    const canvas = makePreviewCanvas(64, 64);
    const ctx = canvas.getContext('2d');
    ctx.translate(32, 32);
    ctx.scale(1.5, 1.5);
    drawEmoteIcon(ctx, def.icon, rarityOf(def).color, 0);
    stage.appendChild(canvas);

    const nombre = document.createElement('div');
    nombre.className = 'emote-name';
    nombre.textContent = def.name;

    const desc = document.createElement('p');
    desc.className = 'emote-desc';
    desc.textContent = def.desc;

    card.append(stage, nombre, desc);

    if (ranura !== -1) {
      const marca = document.createElement('div');
      marca.className = 'emote-slot';
      marca.textContent = `EN LA RUEDA · ${ranura + 1}`;
      card.appendChild(marca);
    }

    const btn = document.createElement('button');
    if (!tengo) {
      btn.className = 'item-action buy';
      btn.dataset.action = 'buy-emote';
      btn.dataset.id = def.id;
      btn.textContent = `${def.price} pavos`;
      if (def.price > p.vbucks) btn.classList.add('is-locked');
    } else if (ranura === -1) {
      btn.className = 'item-action equip';
      btn.dataset.action = 'equip-emote';
      btn.dataset.id = def.id;
      btn.textContent = 'PONER EN LA RUEDA';
    } else {
      btn.className = 'item-action equip is-equipped';
      btn.dataset.action = 'equip-emote';
      btn.dataset.id = def.id;
      btn.textContent = 'QUITAR';
    }
    card.appendChild(btn);

    return card;
  }

  /* ---------- Acciones del perfil ---------- */

  _handleRename() {
    const input = document.getElementById('profile-name-input');
    if (!input) return;

    const res = this.profile.setPlayerName(input.value);
    if (!res.ok) {
      this.toast(res.reason, true);
      return;
    }

    this.refresh();
    this.renderProfile();
    this.toast(res.cost > 0
      ? `Ahora te llamas ${this.profile.displayName} · -${res.cost} pavos`
      : `¡Hola, ${this.profile.displayName}!`);
  }

  /**
   * Comprar y equipar emotes desde el PERFIL.
   *
   * Por dentro son las mismas acciones de la tienda (`buy` y `equip`
   * con la categoria 'emote'): asi comprar uno hace exactamente lo
   * mismo se haga desde donde se haga.
   */
  _handleBuyEmote(id) {
    const res = this.profile.buy('emote', id);
    if (!res.ok) { this.toast(res.reason, true); return; }
    this.refresh();
    this.renderProfile();
    this.toast('Emote comprado y puesto en la rueda');
  }

  /** Lo mete en el primer hueco libre, o lo saca si ya estaba. */
  _handleEquipEmote(id) {
    const res = this.profile.equip('emote', id);
    if (!res.ok) { this.toast(res.reason, true); return; }
    this.renderProfile();
    this.refresh();
  }

  /* =============================================================
     MAS JUEGOS (selector de modos)
     ============================================================= */

  /** Subtitulo del boton del menu: cuantos modos hay jugables. */
  _updateModesBadge() {
    if (!this.modesSub) return;
    const listos = MODES.filter((m) => m.ready).length;
    this.modesSub.textContent = listos === MODES.length
      ? `${MODES.length} modos de juego`
      : `${listos} de ${MODES.length} modos disponibles`;
  }

  /** Pinta una tarjeta por modo, con su dibujo y sus senas de identidad. */
  renderModes() {
    if (!this.modeGrid) return;
    this.modeGrid.innerHTML = '';

    for (const def of MODES) {
      this.modeGrid.appendChild(this._modeCard(def));
    }
  }

  _modeCard(def) {
    const card = document.createElement('article');
    card.className = 'mode-card ' + (def.ready ? 'is-ready' : 'is-soon');
    card.style.setProperty('--mode-color', def.color);

    // --- Dibujo ---
    const stage = document.createElement('div');
    stage.className = 'mode-stage';
    const canvas = makePreviewCanvas(104, 104);
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    // El dibujo esta pensado para un cuadrado de 100 px
    ctx.scale(canvas.width / 110, canvas.height / 110);
    drawModeIcon(ctx, def.icon, def.color);
    stage.appendChild(canvas);

    // --- Textos ---
    const body = document.createElement('div');
    body.className = 'mode-body';

    const tagline = document.createElement('div');
    tagline.className = 'mode-tagline';
    tagline.textContent = def.tagline;

    const nombre = document.createElement('div');
    nombre.className = 'mode-name';
    nombre.textContent = def.name;

    const desc = document.createElement('p');
    desc.className = 'mode-desc';
    desc.textContent = def.desc;

    const bullets = document.createElement('div');
    bullets.className = 'mode-bullets';
    for (const b of def.bullets) {
      const chip = document.createElement('span');
      chip.className = 'mode-bullet';
      chip.textContent = b;
      bullets.appendChild(chip);
    }

    body.append(tagline, nombre, desc, bullets);

    // --- Boton ---
    if (def.ready) {
      const btn = document.createElement('button');
      btn.className = 'item-action buy';
      btn.textContent = 'JUGAR';
      btn.dataset.action = 'mode';
      btn.dataset.id = def.id;
      body.appendChild(btn);
    } else {
      const aviso = document.createElement('div');
      aviso.className = 'btn-soon';
      aviso.textContent = 'Proximamente';
      body.appendChild(aviso);
    }

    card.append(stage, body);
    return card;
  }

  /* =============================================================
     MINIJUEGOS
     ============================================================= */

  /** Subtitulo del boton del menu: cuantos hay listos. */
  _updateMinigamesBadge() {
    if (!this.minigamesSub) return;
    const listos = MINIJUEGOS_VISIBLES.filter((m) => m.ready).length;
    this.minigamesSub.textContent = listos === MINIJUEGOS_VISIBLES.length
      ? `${MINIJUEGOS_VISIBLES.length} modos para entrenar`
      : `${listos} de ${MINIJUEGOS_VISIBLES.length} disponibles`;
  }

  /** Pinta las tarjetas de los minijuegos, con su dibujo y su record. */
  renderMinigames() {
    if (!this.minigameGrid) return;
    this.minigameGrid.innerHTML = '';

    for (const def of MINIJUEGOS_VISIBLES) {
      this.minigameGrid.appendChild(this._minigameCard(def));
    }
  }

  _minigameCard(def) {
    const card = document.createElement('article');
    card.className = 'minigame-card ' + (def.ready ? 'is-ready' : 'is-soon');
    card.style.setProperty('--mg-color', def.color);

    // --- Dibujo ---
    const stage = document.createElement('div');
    stage.className = 'minigame-stage';
    const canvas = makePreviewCanvas(100, 100);
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    // El dibujo esta pensado para un cuadrado de 100 px
    ctx.scale(canvas.width / 110, canvas.height / 110);
    drawMinigameIcon(ctx, def.icon, def.color);
    stage.appendChild(canvas);

    // --- Textos ---
    const nombre = document.createElement('div');
    nombre.className = 'minigame-name';
    nombre.textContent = def.name;

    const desc = document.createElement('p');
    desc.className = 'minigame-desc';
    desc.textContent = def.desc;

    const objetivo = document.createElement('div');
    objetivo.className = 'minigame-goal';
    objetivo.textContent = def.goal;

    card.append(stage, nombre, desc, objetivo);

    // --- Los modos CON NIVELES sacan una fila por nivel, cada una con
    // su record y su boton: un tiempo del facil no tiene nada que ver
    // con uno del dificil. ---
    if (def.levels === 'parkour' && def.ready) {
      for (const nivel of PARKOUR_LEVELS) {
        card.appendChild(this._levelRow(def, nivel));
      }
      return card;
    }

    // --- Los modos con ROLES llevan un record por papel: en el
    // pilla-pilla, aguantar libre y pillar no se pueden comparar. ---
    if (def.roles) {
      for (const [clave, etiqueta] of [['escondido', 'Aguantando'], ['contador', 'Pillando']]) {
        const f = document.createElement('div');
        f.className = 'minigame-record';
        const e = document.createElement('span');
        e.textContent = etiqueta;
        const v = document.createElement('b');
        const marca = this.profile.record(`${def.id}:${clave}`);
        v.textContent = clave === 'contador'
          ? (marca === null ? '—' : `${marca} pillados`)
          : formatScore(def, marca);
        f.append(e, v);
        card.appendChild(f);
      }

      const btn = document.createElement('button');
      btn.className = 'item-action buy';
      btn.textContent = 'JUGAR';
      btn.dataset.action = 'minigame';
      btn.dataset.id = def.id;
      card.appendChild(btn);
      return card;
    }

    // --- Record. Los modos libres no puntuan, pero se pone la fila
    // igualmente para que todas las tarjetas midan lo mismo. ---
    const fila = document.createElement('div');
    fila.className = 'minigame-record';
    const etiqueta = document.createElement('span');
    const valor = document.createElement('b');

    if (def.score === 'none') {
      etiqueta.textContent = 'Modo libre';
      valor.textContent = 'sin record';
    } else {
      etiqueta.textContent = def.score === 'time' ? 'Mejor tiempo' : 'Record';
      valor.textContent = formatScore(def, this.profile.record(def.id));
    }

    fila.append(etiqueta, valor);
    card.appendChild(fila);

    // --- Boton ---
    if (def.ready) {
      const btn = document.createElement('button');
      btn.className = 'item-action buy';
      btn.textContent = 'JUGAR';
      btn.dataset.action = 'minigame';
      btn.dataset.id = def.id;
      card.appendChild(btn);
    } else {
      const soon = document.createElement('button');
      soon.className = 'btn-soon';
      soon.textContent = 'Proximamente';
      soon.disabled = true;
      card.appendChild(soon);
    }

    return card;
  }

  /* =============================================================
     MISIONES
     ============================================================= */

  /** El contador del boton del menu ("3 de 19 cumplidas"). */
  _updateMissionsBadge() {
    if (!this.missionsSub) return;
    const { done, total } = this.missions.summary;
    this.missionsSub.textContent = done === total
      ? '¡Todas cumplidas!'
      : `${done} de ${total} cumplidas`;
  }

  /** Pinta la lista de misiones agrupada, con sus barras de progreso. */
  renderMissions() {
    if (!this.missionsList) return;

    const { done, total } = this.missions.summary;
    if (this.missionsCount) this.missionsCount.textContent = `${done} / ${total}`;

    this.missionsList.innerHTML = '';

    for (const grupo of this.missions.byGroup()) {
      const bloque = document.createElement('div');
      bloque.className = 'mission-group';

      const titulo = document.createElement('h3');
      titulo.className = 'mission-group-title';
      titulo.textContent = grupo.group;
      bloque.appendChild(titulo);

      const rejilla = document.createElement('div');
      rejilla.className = 'mission-group-items';

      for (const e of grupo.items) rejilla.appendChild(this._missionCard(e));

      bloque.appendChild(rejilla);
      this.missionsList.appendChild(bloque);
    }
  }

  /** Una tarjeta de mision. */
  /** Una linea de nivel: nombre, mejor tiempo y boton de jugar. */
  _levelRow(def, nivel) {
    const fila = document.createElement('div');
    fila.className = 'minigame-level';
    fila.style.setProperty('--lv-color', nivel.color);

    const texto = document.createElement('div');
    texto.className = 'minigame-level-text';

    const nombre = document.createElement('span');
    nombre.className = 'minigame-level-name';
    nombre.textContent = nivel.name;

    const marca = document.createElement('span');
    marca.className = 'minigame-level-record';
    marca.textContent = formatScore(def, this.profile.record(`${def.id}:${nivel.id}`));

    texto.append(nombre, marca);

    const desc = document.createElement('span');
    desc.className = 'minigame-level-desc';
    desc.textContent = nivel.desc;

    const btn = document.createElement('button');
    btn.className = 'minigame-level-play';
    btn.textContent = 'JUGAR';
    btn.dataset.action = 'minigame';
    btn.dataset.id = `${def.id}:${nivel.id}`;

    fila.append(texto, desc, btn);
    return fila;
  }

  _missionCard(e) {
    const m = e.mission;
    const card = document.createElement('article');
    card.className = 'mission-card' + (e.done ? ' is-done' : '');

    const head = document.createElement('div');
    head.className = 'mission-head';

    const nombre = document.createElement('span');
    nombre.className = 'mission-name';
    nombre.textContent = (e.done ? '✔ ' : '') + m.name;

    const premio = document.createElement('span');
    premio.className = 'mission-reward';
    premio.textContent = `${m.reward} pavos`;

    head.append(nombre, premio);

    const desc = document.createElement('p');
    desc.className = 'mission-desc';
    desc.textContent = m.desc;

    const barra = document.createElement('div');
    barra.className = 'mission-bar';
    const relleno = document.createElement('div');
    relleno.className = 'mission-bar-fill';
    relleno.style.width = `${Math.round(e.ratio * 100)}%`;
    barra.appendChild(relleno);

    const pie = document.createElement('div');
    pie.className = 'mission-foot';

    const ambito = document.createElement('span');
    ambito.className = 'mission-scope';
    ambito.textContent = m.scope === 'match' ? 'En una partida' : 'Acumulada';

    const cuenta = document.createElement('span');
    cuenta.textContent = e.done ? 'Cumplida' : `${e.progress} / ${e.goal}`;

    pie.append(ambito, cuenta);

    card.append(head, desc, barra, pie);
    return card;
  }

  /* =============================================================
     CONSTRUCCION DE LA INTERFAZ
     ============================================================= */

  /** Crea las pestanas (Skins / Picos / Paravelas) de tienda y taquilla. */
  _buildTabs() {
    for (const mode of ['shop', 'locker']) {
      const holder = this.root.querySelector(`[data-tabs="${mode}"]`);
      if (!holder) continue;

      holder.innerHTML = '';
      for (const cat of CATEGORIES) {
        const tab = document.createElement('button');
        tab.className = 'tab';
        tab.dataset.action = 'tab';
        tab.dataset.mode = mode;
        tab.dataset.category = cat.key;
        tab.innerHTML = `${cat.label}<span class="tab-count" data-count="${mode}:${cat.key}"></span>`;
        tab.classList.toggle('is-active', this.activeTab[mode] === cat.key);
        holder.appendChild(tab);
      }
    }
  }

  /** En la taquilla la pestana muestra "desbloqueados / total". */
  _updateTabCounts() {
    for (const cat of CATEGORIES) {
      const { owned, total } = this.profile.getProgress(cat.key);

      const lockerCount = this.root.querySelector(`[data-count="locker:${cat.key}"]`);
      if (lockerCount) lockerCount.textContent = `${owned}/${total}`;

      // En la tienda no se cuentan los del pase: ahi no se venden.
      const enTienda = cat.list.filter((item) => !item.pass).length;
      const shopCount = this.root.querySelector(`[data-count="shop:${cat.key}"]`);
      if (shopCount) shopCount.textContent = `${enTienda}`;
    }
  }

  /** Un unico listener para todo el menu (delegacion de eventos). */
  _bindEvents() {
    this.root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;

      switch (el.dataset.action) {
        // Elegir un MODO: tanto desde el boton grande del inicio como
        // desde las tarjetas de MAS JUEGOS. Es el mismo camino.
        case 'mode':
          this.onPlay(this.profile.getLoadout(), el.dataset.id || DEFAULT_MODE);
          break;

        // Se mantiene por compatibilidad: equivale al modo por defecto.
        case 'play':
          this.onPlay(this.profile.getLoadout(), DEFAULT_MODE);
          break;

        case 'goto':
          this.goto(el.dataset.screen);
          break;

        case 'tab':
          this.activeTab[el.dataset.mode] = el.dataset.category;
          // Marca visualmente la pestana elegida dentro de su grupo
          for (const t of el.parentElement.children) {
            t.classList.toggle('is-active', t === el);
          }
          this.renderGrid(el.dataset.mode);
          break;

        case 'buy':
          this._handleBuy(el.dataset.category, el.dataset.id);
          break;

        case 'equip':
          this._handleEquip(el.dataset.category, el.dataset.id);
          break;

        case 'buy-pass':
          this._handleBuyPass();
          break;

        case 'minigame':
          this.hide();
          this.onPlayMinigame(el.dataset.id, this.profile.getLoadout());
          break;

        case 'rename':
          this._handleRename();
          break;

        case 'buy-emote':
          this._handleBuyEmote(el.dataset.id);
          break;

        case 'equip-emote':
          this._handleEquipEmote(el.dataset.id);
          break;

        case 'reset':
          this._handleReset();
          break;
      }
    });
  }

  /* =============================================================
     ACCIONES
     ============================================================= */

  /** Compra el pase premium y avisa de lo que ha entregado. */
  _handleBuyPass() {
    const res = this.profile.buyPremiumPass();

    if (!res.ok) {
      this.toast(res.reason, true);
      return;
    }

    this.refresh();

    const n = res.premios.length;
    this.toast(n > 0
      ? `¡Pase premium! Se han desbloqueado ${n} recompensa(s) de tus niveles`
      : '¡Pase premium activado!');
  }

  _handleBuy(category, id) {
    const result = this.profile.buy(category, id);
    if (!result.ok) {
      this.toast(result.reason, true);
      return;
    }

    const item = CATEGORIES.find((c) => c.key === category).list.find((i) => i.id === id);
    this.toast(`¡${item.name} desbloqueado!`);

    this.renderVbucks(true);
    this.renderGrid('shop');
    this._updateTabCounts();
    if (this.currentScreen === 'profile') this.renderProfile();
  }

  _handleEquip(category, id) {
    const result = this.profile.equip(category, id);
    if (!result.ok) {
      this.toast(result.reason, true);
      return;
    }

    const item = CATEGORIES.find((c) => c.key === category).list.find((i) => i.id === id);
    // `removed` lo devuelve el perfil cuando un emote SALE de la rueda.
    if (category === 'emote') {
      this.toast(result.removed
        ? `${item.name} fuera de la rueda`
        : `${item.name} en la rueda`);
    } else {
      this.toast(`${item.name} equipado`);
    }

    this.renderShowcase();
    this.renderGrid('locker');
    // El perfil ensena la misma rueda: si esta abierto, que no se quede
    // con la version vieja.
    if (this.currentScreen === 'profile') this.renderProfile();
  }

  _handleReset() {
    const ok = window.confirm(
      'Se borraran los pavos, las compras y el equipamiento guardados. ¿Seguro?'
    );
    if (!ok) return;

    this.profile.reset();
    this.refresh();
    this.toast('Progreso reiniciado');
  }

  /* =============================================================
     PINTADO
     ============================================================= */

  /** Saldo de pavos (con un pequeno pulso si acaba de cambiar). */
  renderVbucks(bump = false) {
    this.vbucksEl.textContent = this.profile.vbucks.toLocaleString('es-ES');
    if (!bump) return;

    this.vbucksEl.classList.add('bump');
    setTimeout(() => this.vbucksEl.classList.remove('bump'), 180);
  }

  /** Vitrina: nombre y rareza de la skin + miniaturas de pico y paravela. */
  renderShowcase() {
    const loadout = this.profile.getLoadout();
    const rarity = rarityOf(loadout.skin);

    const nameEl = document.getElementById('showcase-name');
    const rarityEl = document.getElementById('showcase-rarity');
    nameEl.textContent = loadout.skin.name;
    rarityEl.textContent = rarity.name;
    rarityEl.style.setProperty('--rarity', rarity.color);

    document.getElementById('chip-pickaxe-name').textContent = loadout.pickaxe.name;
    document.getElementById('chip-glider-name').textContent = loadout.glider.name;

    drawItemPreview(document.getElementById('chip-pickaxe').getContext('2d'), loadout.pickaxe);
    drawItemPreview(document.getElementById('chip-glider').getContext('2d'), loadout.glider);

    this._showcaseSkin = loadout.skin;
  }

  /**
   * Rellena la rejilla de la tienda o de la taquilla.
   * @param {'shop'|'locker'} mode
   */
  renderGrid(mode) {
    const grid = document.getElementById(mode === 'shop' ? 'shop-grid' : 'locker-grid');
    if (!grid) return;

    const category = this.activeTab[mode];
    const cat = CATEGORIES.find((c) => c.key === category);

    // La taquilla solo ensena lo que ya tienes.
    // La TIENDA, ademas, esconde los exclusivos del pase de batalla: no
    // se venden, se ganan subiendo de nivel.
    const items = mode === 'locker'
      ? cat.list.filter((item) => this.profile.isOwned(category, item.id))
      : cat.list.filter((item) => !item.pass);

    grid.innerHTML = '';

    if (items.length === 0) {
      const note = document.createElement('p');
      note.className = 'empty-note';
      note.textContent = 'Todavia no tienes nada de esta categoria. ¡Pasate por la tienda!';
      grid.appendChild(note);
      return;
    }

    // Los mas baratos primero, para que se lea como una tienda de verdad.
    const sorted = [...items].sort((a, b) => a.price - b.price);
    for (const item of sorted) {
      grid.appendChild(this._buildCard(item, category, mode));
    }
  }

  /** Construye una tarjeta de objeto. */
  _buildCard(item, category, mode) {
    const owned = this.profile.isOwned(category, item.id);
    const equipped = this.profile.isEquipped(category, item.id);
    const rarity = rarityOf(item);

    const card = document.createElement('article');
    card.className = 'item-card';
    card.style.setProperty('--rarity', rarity.color);

    // --- Dibujo ---
    const art = document.createElement('div');
    art.className = 'item-art';
    art.appendChild(makePreviewCanvas(item));

    if (equipped) {
      art.appendChild(makeFlag('equipped', 'Equipado'));
    } else if (owned && mode === 'shop') {
      art.appendChild(makeFlag('owned', 'Comprado'));
    }
    card.appendChild(art);

    // --- Texto ---
    const body = document.createElement('div');
    body.className = 'item-body';
    body.innerHTML = `
      <span class="item-rarity">${rarity.name}</span>
      <h3 class="item-name">${item.name}</h3>
      <p class="item-desc">${item.desc || ''}</p>
    `;

    body.appendChild(this._buildActionButton(item, category, mode, owned, equipped));
    card.appendChild(body);

    return card;
  }

  /** Boton de la tarjeta: comprar, equipar, "equipado" o "sin pavos". */
  _buildActionButton(item, category, mode, owned, equipped) {
    const btn = document.createElement('button');
    btn.dataset.category = category;
    btn.dataset.id = item.id;

    if (equipped) {
      // De skins, picos y paravelas solo se lleva UNO, asi que
      // "equipado" es un estado y no una accion. De EMOTES caben seis a
      // la vez, y quitar uno de la rueda es justo como se hace sitio:
      // ahi el boton tiene que seguir siendo pulsable.
      if (category === 'emote' && mode === 'locker') {
        btn.className = 'item-action equip is-equipped';
        btn.dataset.action = 'equip';
        btn.textContent = `EN LA RUEDA · ${this.profile.emoteSlots.indexOf(item.id) + 1}`;
        return btn;
      }
      btn.className = 'item-action equipped';
      btn.textContent = category === 'emote' ? 'EN LA RUEDA' : 'EQUIPADO';
      btn.disabled = true;
      return btn;
    }

    if (owned) {
      // En la taquilla se puede equipar; en la tienda solo se informa.
      if (mode === 'locker') {
        btn.className = 'item-action equip';
        btn.dataset.action = 'equip';
        btn.textContent = category === 'emote' ? 'PONER EN LA RUEDA' : 'EQUIPAR';
      } else {
        btn.className = 'item-action owned';
        btn.textContent = 'YA LO TIENES';
        btn.disabled = true;
      }
      return btn;
    }

    // No lo tiene: boton de compra (activo solo si le llega el saldo).
    const puede = this.profile.canAfford(item);
    btn.className = `item-action ${puede ? 'buy' : 'cant'}`;
    btn.dataset.action = 'buy';
    btn.innerHTML = `<span>${puede ? 'COMPRAR' : 'SIN PAVOS'}</span>
                     <span class="price">${item.price.toLocaleString('es-ES')}</span>`;
    if (!puede) btn.disabled = true;
    return btn;
  }

  /** Aviso flotante en la parte inferior. */
  toast(message, isError = false) {
    this.toastEl.textContent = message;
    this.toastEl.classList.toggle('error', isError);
    this.toastEl.classList.add('show');

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 2200);
  }

  /* =============================================================
     ANIMACION DE LA VITRINA
     ============================================================= */
  _tick(ts) {
    if (!this.visible) { this._rafId = 0; return; }

    const dt = Math.min(0.1, (ts - this._lastTs) / 1000);
    this._lastTs = ts;
    this.time += dt;

    // Solo hace falta redibujar cuando se ve la pantalla de inicio.
    if (this.currentScreen === 'home' && this._showcaseSkin) {
      drawItemPreview(this.showcaseCtx, this._showcaseSkin, {
        time: this.time,
        state: 'showcase',
      });
    }

    this._rafId = requestAnimationFrame(this._tick);
  }
}

/** Cinta de estado (COMPRADO / EQUIPADO) sobre el dibujo. */
function makeFlag(kind, text) {
  const flag = document.createElement('span');
  flag.className = `item-flag ${kind}`;
  flag.textContent = text;
  return flag;
}
