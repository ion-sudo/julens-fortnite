/**
 * audioPanel.js
 * ---------------------------------------------------------------
 * EL CONTROL DE SONIDO: el altavoz de la esquina.
 *
 * Es un boton que vive por encima de todo (menu y partida) y que abre
 * un panelito con dos barras: efectos y musica. Se encarga de tres
 * cosas y nada mas:
 *
 *   1. dibujarse (crea su propio HTML, no hace falta tocar index.html)
 *   2. mandar los cambios a core/audio.js y core/music.js
 *   3. guardarlos en el perfil para que se recuerden
 *
 * El teclado tambien vale: la tecla N silencia y devuelve el sonido.
 * Se registra aqui con un listener propio en vez de pasar por
 * core/input.js porque tiene que funcionar tambien en el menu, donde
 * el input del juego esta desenganchado.
 */

import {
  setVolume, getVolume, setMuted, isMuted, toggleMuted,
} from '../core/audio.js';
import { setMusicVolume } from '../core/music.js';

/** Iconos segun el estado. */
const ICONO_ON = '🔊';
const ICONO_OFF = '🔇';

export class AudioPanel {
  /** @param {import('../core/profile.js').Profile} profile */
  constructor(profile) {
    this.profile = profile;
    this.abierto = false;

    this._montar();
    this._aplicarDesdePerfil();
  }

  /* =============================================================
     HTML
     ============================================================= */

  _montar() {
    const raiz = document.createElement('div');
    raiz.id = 'audio-panel';
    raiz.innerHTML = `
      <button id="audio-toggle" type="button" title="Sonido (N para silenciar)">
        <span id="audio-icon">${ICONO_ON}</span>
      </button>
      <div id="audio-sliders" class="hidden">
        <label>
          <span>Efectos <b data-out="sfx">70%</b></span>
          <input type="range" id="audio-sfx" min="0" max="100" value="70">
        </label>
        <label>
          <span>Musica <b data-out="music">70%</b></span>
          <input type="range" id="audio-music" min="0" max="100" value="70">
        </label>
        <button type="button" id="audio-mute">Silenciar todo</button>
      </div>
    `;
    document.body.appendChild(raiz);

    this.raiz = raiz;
    this.icono = raiz.querySelector('#audio-icon');
    this.sliders = raiz.querySelector('#audio-sliders');
    this.sfx = raiz.querySelector('#audio-sfx');
    this.music = raiz.querySelector('#audio-music');
    this.outSfx = raiz.querySelector('[data-out="sfx"]');
    this.outMusic = raiz.querySelector('[data-out="music"]');
    this.btnMute = raiz.querySelector('#audio-mute');

    // --- Abrir y cerrar ---
    raiz.querySelector('#audio-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      this.abierto = !this.abierto;
      this.sliders.classList.toggle('hidden', !this.abierto);
    });

    // Un clic fuera lo cierra.
    document.addEventListener('click', (e) => {
      if (this.abierto && !raiz.contains(e.target)) {
        this.abierto = false;
        this.sliders.classList.add('hidden');
      }
    });

    // --- Barras ---
    this.sfx.addEventListener('input', () => this._cambiar());
    this.music.addEventListener('input', () => this._cambiar());

    this.btnMute.addEventListener('click', (e) => {
      e.stopPropagation();
      this._setMute(toggleMuted());
    });

    // --- Tecla N ---
    window.addEventListener('keydown', (e) => {
      // Si se esta escribiendo (el nombre del perfil), la N es una letra.
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if ((e.key || '').toLowerCase() === 'n') this._setMute(toggleMuted());
    });
  }

  /* =============================================================
     ESTADO
     ============================================================= */

  /** Lee lo guardado y lo aplica a los modulos de sonido. */
  _aplicarDesdePerfil() {
    const a = this.profile?.audio || {};
    const sfx = Number.isFinite(a.sfx) ? a.sfx : 0.7;
    const mus = Number.isFinite(a.music) ? a.music : 0.7;

    this.sfx.value = Math.round(sfx * 100);
    this.music.value = Math.round(mus * 100);

    setVolume(sfx);
    setMusicVolume(mus);
    this._setMute(a.muted === true, false);
    this._pintarValores();
  }

  _cambiar() {
    const sfx = this.sfx.value / 100;
    const mus = this.music.value / 100;

    setVolume(sfx);
    setMusicVolume(mus);

    // Tocar una barra con todo silenciado quiere decir "quiero oirlo".
    if (isMuted() && (sfx > 0 || mus > 0)) this._setMute(false, false);

    this._pintarValores();
    this._guardar();
  }

  /** @param {boolean} v @param {boolean} guardar */
  _setMute(v, guardar = true) {
    setMuted(v);
    this.icono.textContent = v ? ICONO_OFF : ICONO_ON;
    this.raiz.classList.toggle('muted', v);
    this.btnMute.textContent = v ? 'Activar sonido' : 'Silenciar todo';
    if (guardar) this._guardar();
  }

  _pintarValores() {
    this.outSfx.textContent = `${this.sfx.value}%`;
    this.outMusic.textContent = `${this.music.value}%`;
  }

  _guardar() {
    if (!this.profile) return;
    this.profile.audio = {
      sfx: getVolume(),
      music: this.music.value / 100,
      muted: isMuted(),
    };
    this.profile.save();
  }
}
