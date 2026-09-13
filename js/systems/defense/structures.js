/**
 * structures.js (JULEN DEFENSA)
 * ---------------------------------------------------------------
 * LAS TORRES Y TRAMPAS que coloca el jugador en el camino.
 *
 * Todo va sobre el CAMINO: una linea recta de suelo llano entre la
 * torre y el portal. Por eso colocar es tan sencillo como elegir una X:
 * no hay que buscar superficies ni esquivar escalones.
 *
 *   TORRES   buscan al zombi mas cercano en su alcance y le disparan
 *            con las balas normales del juego (mismo sistema, mismos
 *            impactos), cada una con su efecto.
 *   TRAMPAS  actuan sobre quien las pisa (o esta cerca) y se GASTAN:
 *            tienen un numero de usos. Mejorarlas las rellena.
 *
 * Las torres no se rompen: son la inversion del jugador, y perderlas en
 * mitad de una oleada solo frustraria. Lo que se gasta son las trampas.
 */

import {
  NIVEL_MAX, multNivel, usosMaximos, precioMejora, precioRecarga,
} from '../../data/defense.js';
import { drawTower, drawTrap } from '../../entities/defenseSprites.js';
import { playShotAt } from '../../core/audio.js';

/** Color de las balas de las torres segun su nivel. */
const RAREZA_NIVEL = [null, 'rare', 'epic', 'legendary'];
/** A que suena cada torre (reutiliza los disparos del juego). */
const SONIDO_TORRE = { ametralladora: 'smg', canon: 'sniper', hielo: 'hielo', mortero: 'cohetes' };
/** Ancho que ocupa una torre en el suelo. */
const ANCHO_TORRE = 46;

export class DefenseStructures {
  /** @param {object} mode  el modo JULEN DEFENSA */
  constructor(mode) {
    this.mode = mode;
    /** Todo lo colocado, torres y trampas mezcladas. */
    this.lista = [];
    /** Reloj propio, para las esperas de las trampas. */
    this.reloj = 0;
  }

  /* =============================================================
     COLOCAR
     ============================================================= */

  ancho(def, tipo) {
    return tipo === 'torre' ? ANCHO_TORRE : def.w;
  }

  /** ¿Se puede poner esto en esta X? @returns {{ok:boolean, motivo:string|null}} */
  puedeColocar(def, tipo, x) {
    const c = this.mode.carril;
    const w = this.ancho(def, tipo);

    if (x - w / 2 < this.mode.base.x + 70) return { ok: false, motivo: 'Demasiado pegado a la torre' };
    if (x + w / 2 > c.x1 - 70) return { ok: false, motivo: 'Ahi salen los zombis' };

    for (const s of this.lista) {
      const w2 = this.ancho(s.def, s.tipo);
      if (Math.abs(s.x - x) < (w + w2) / 2 + 4) return { ok: false, motivo: 'Ahi ya hay algo puesto' };
    }
    return { ok: true, motivo: null };
  }

  colocar(def, tipo, x) {
    const s = {
      def, tipo, x,
      y: this.mode.carril.y,
      nivel: 1,
      cooldown: 0,
      angle: Math.PI,          // mirando al portal
      flash: 0,
      golpes: new Map(),       // trampa: cuando golpeo por ultima vez a cada zombi
      usos: 0,
      usosMax: 0,
    };
    if (tipo === 'trampa') {
      s.usosMax = usosMaximos(def, 1);
      s.usos = s.usosMax;
    }
    this.lista.push(s);
    this.mode.particles.puff(x, s.y - 10, 'rgba(200, 210, 230, 0.6)', 6);
    return s;
  }

  /* =============================================================
     MEJORAR
     ============================================================= */

  /** Lo colocado mas cerca de una X, dentro de un margen. */
  cercana(px, rango = 90) {
    let mejor = null;
    let mejorD = rango;
    for (const s of this.lista) {
      const d = Math.abs(s.x - px);
      if (d < mejorD) { mejorD = d; mejor = s; }
    }
    return mejor;
  }

  /**
   * Que se le puede hacer a algo colocado, y cuanto cuesta.
   * @returns {{tipo:'mejorar'|'recargar', precio:number}|null}
   */
  accionMejora(s) {
    if (s.nivel < NIVEL_MAX) return { tipo: 'mejorar', precio: precioMejora(s.def, s.nivel) };
    if (s.tipo === 'trampa' && s.usos < s.usosMax) return { tipo: 'recargar', precio: precioRecarga(s.def) };
    return null;
  }

  aplicarMejora(s, accion) {
    if (accion.tipo === 'mejorar') {
      s.nivel++;
      if (s.tipo === 'trampa') s.usosMax = usosMaximos(s.def, s.nivel);
    }
    // Mejorar una trampa tambien la deja llena.
    if (s.tipo === 'trampa') s.usos = s.usosMax;
    s.flash = 1;
    this.mode.particles.spark(s.x, s.y - 30, '#ffd23f', 18, 280);
  }

  /** Al empezar oleada se olvidan los golpes de la anterior. */
  nuevaOleada() {
    for (const s of this.lista) s.golpes.clear();
  }

  /* =============================================================
     UPDATE
     ============================================================= */

  update(dt, zombies) {
    this.reloj += dt;
    for (const s of this.lista) {
      s.flash = Math.max(0, s.flash - dt * 4);
      if (s.tipo === 'torre') this._torre(s, dt, zombies);
      else this._trampa(s, dt, zombies);
    }
  }

  /** La torre elige al zombi mas cercano y le dispara. */
  _torre(s, dt, zombies) {
    s.cooldown = Math.max(0, s.cooldown - dt);
    const d = s.def;
    const cx = s.x;
    const cy = s.y - 44;

    let mejor = null;
    let mejorD = d.alcance;
    for (const z of zombies) {
      if (z.dead) continue;
      const dist = Math.abs(z.cx - cx);
      if (dist < mejorD) { mejorD = dist; mejor = z; }
    }
    if (!mejor) return;

    s.angle = Math.atan2(mejor.y + mejor.h * 0.45 - cy, mejor.cx - cx);
    if (s.cooldown > 0) return;
    s.cooldown = 1 / (d.cadencia * (1 + (s.nivel - 1) * 0.2));

    const game = this.mode.game;
    game.bullets.spawn({
      x: cx + Math.cos(s.angle) * 30,
      y: cy + Math.sin(s.angle) * 30,
      angle: s.angle + (Math.random() - 0.5) * 0.03,
      speed: d.velocidadBala,
      damage: Math.round(d.dano * multNivel(s.nivel)),
      range: d.alcance + 160,
      pierce: !!d.perfora,
      rarity: RAREZA_NIVEL[s.nivel],
      kind: d.efecto === 'hielo' ? 'rayo' : 'bala',
      // Las balas son del jugador: asi nunca le dan a el.
      owner: this.mode.player,
      effect: d.efecto || null,
      radius: d.radio || 0,
    });
    this.mode.particles.muzzleFlash(cx + Math.cos(s.angle) * 32, cy + Math.sin(s.angle) * 32, s.angle, d.acento, 0.8);
    playShotAt(SONIDO_TORRE[d.id] || 'ar', cx, cy);
  }

  /** Cada trampa a lo suyo. */
  _trampa(s, dt, zombies) {
    if (s.usos <= 0) return;
    const d = s.def;
    const dano = Math.round(d.dano * multNivel(s.nivel));
    const jugador = this.mode.player;

    // --- Pared de dardos: dispara a lo largo del camino ---
    if (d.id === 'dardos') {
      s.cooldown = Math.max(0, s.cooldown - dt);
      if (s.cooldown > 0) return;
      const hay = zombies.some((z) => !z.dead && !z.enAire && z.cx > s.x && z.cx - s.x < d.alcance);
      if (!hay) return;
      s.cooldown = d.espera;
      this._gastar(s);
      this.mode.game.bullets.spawn({
        x: s.x + 16, y: s.y - 42, angle: 0, speed: 1300,
        damage: dano, range: d.alcance + 40, pierce: false,
        rarity: 'uncommon', kind: 'bala', owner: jugador,
      });
      playShotAt('pistol', s.x, s.y);
      return;
    }

    // --- Electrica: descarga a todo lo que tenga cerca ---
    if (d.id === 'electrica') {
      s.cooldown = Math.max(0, s.cooldown - dt);
      if (s.cooldown > 0) return;
      const cerca = zombies.filter((z) => !z.dead && Math.abs(z.cx - s.x) < d.radio);
      if (cerca.length === 0) return;
      s.cooldown = d.espera;
      this._gastar(s);
      for (const z of cerca.slice(0, 5)) {
        this.mode.zaps.push({ x0: s.x, y0: s.y - 32, x1: z.cx, y1: z.y + z.h * 0.4, vida: 0.18 });
        z.takeDamage(dano, z.cx, z.y + z.h * 0.4, jugador);
      }
      playShotAt('cadena', s.x, s.y);
      return;
    }

    // --- Las de pisar: pinchos, congelante, parrilla y lanzador ---
    const x0 = s.x - d.w / 2;
    const x1 = s.x + d.w / 2;
    for (const z of zombies) {
      if (z.dead || z.enAire) continue;
      if (z.x > x1 || z.x + z.w < x0) continue;

      // Respiro entre golpe y golpe al MISMO zombi: si no, cruzarla le
      // quitaria la vida entera en medio segundo y la gastaria de golpe.
      const ultimo = s.golpes.get(z) ?? -99;
      if (this.reloj - ultimo < d.espera) continue;
      s.golpes.set(z, this.reloj);
      this._gastar(s);

      const pie = z.laneY - 10;
      if (d.id === 'pinchos') {
        z.takeDamage(dano, z.cx, pie, jugador);
        this.mode.particles.spark(z.cx, pie, '#e8434f', 8, 220);
      } else if (d.id === 'congelante') {
        z.takeDamage(dano, z.cx, pie, jugador);
        z.congelar(d.congela * (1 + (s.nivel - 1) * 0.25));
        z.ralentizar(0.5, 3);
        this.mode.particles.spark(z.cx, pie, '#bff1ff', 12, 200);
      } else if (d.id === 'parrilla') {
        z.quemar(d.dps * multNivel(s.nivel), d.quema, jugador);
        z.takeDamage(dano, z.cx, pie, jugador);
      } else if (d.id === 'lanzador') {
        z.lanzar(d.empuje, 260, dano, jugador);
        this.mode.particles.puff(s.x, s.y - 10, 'rgba(200, 230, 160, 0.6)', 6);
      }

      if (s.usos <= 0) break;
    }
  }

  /** Gasta un uso y avisa si se ha acabado. */
  _gastar(s) {
    s.usos--;
    s.flash = 1;
    if (s.usos === 0) this.mode.game.showMessage(`${s.def.name} gastada · G para recargarla`);
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    for (const s of this.lista) {
      if (!camera.isVisible(s.x - 60, s.y - 110, 120, 120)) continue;
      if (s.tipo === 'torre') drawTower(ctx, s, time);
      else drawTrap(ctx, s, time);
    }
  }
}
