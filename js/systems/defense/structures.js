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
 *            tienen un numero de usos.
 *
 * TODO LO COLOCADO SE ROMPE, y cuando se rompe NO VUELVE:
 *
 *   - los zombis se paran a golpear las torres que les cierran el paso,
 *   - las explosiones (las de los zombis bomba) se llevan por delante
 *     lo que tengan cerca, torres y trampas,
 *   - una trampa que gasta su ultimo uso tambien desaparece.
 *
 * No hay recarga ni reparacion de nada de esto: lo que cae, cae, y para
 * volver a tenerlo hay que pagarlo otra vez. Por eso ahora las torres
 * son una decision y no una inversion para siempre.
 */

import {
  DEFENSA, NIVEL_MAX, multNivel, usosMaximos, precioMejora, vidaEstructura,
} from '../../data/defense.js';
import { drawTower, drawTrap } from '../../entities/defenseSprites.js';
import { playShotAt, playExplosionAt } from '../../core/audio.js';

/** Color de las balas de las torres segun su nivel. */
const RAREZA_NIVEL = [null, 'rare', 'epic', 'legendary'];
/** A que suena cada torre (reutiliza los disparos del juego). */
const SONIDO_TORRE = {
  ametralladora: 'smg', canon: 'sniper', hielo: 'hielo', mortero: 'cohetes',
  tesla: 'cadena', lanzallamas: 'llamas', francotiradora: 'sniper',
  laser: 'beam', aturdidora: 'pulso',
};
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
    const margen = DEFENSA.margenPortal;

    // La torre esta en el CENTRO: hay que dejarle sitio por los dos lados.
    if (x - w / 2 < this.mode.base.x + 70 && x + w / 2 > this.mode.base.x - 70) {
      return { ok: false, motivo: 'Demasiado pegado a la torre' };
    }
    // Y tampoco encima de ninguno de los dos portales.
    if (x - w / 2 < c.x0 + margen || x + w / 2 > c.x1 - margen) {
      return { ok: false, motivo: 'Ahi salen los zombis' };
    }

    // Algunas tienen tope (la de reparacion): si no, poner diez seria
    // una torre inmortal.
    if (def.maximo && this.lista.filter((s) => s.def.id === def.id).length >= def.maximo) {
      return { ok: false, motivo: `Como mucho ${def.maximo} de ${def.name}` };
    }

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
      // Lo que aguanta antes de romperse (y romperse aqui es para siempre).
      vida: vidaEstructura(def, tipo, 1),
      vidaMax: vidaEstructura(def, tipo, 1),
      dead: false,
      danoFlash: 0,
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
   *
   * Solo MEJORAR. La recarga ya no existe: una trampa gastada no se
   * rellena, desaparece, y una torre rota tampoco se levanta. Mejorar
   * mientras siguen en pie si las deja como nuevas.
   *
   * @returns {{tipo:'mejorar', precio:number}|null}
   */
  accionMejora(s) {
    if (s.nivel < NIVEL_MAX) return { tipo: 'mejorar', precio: precioMejora(s.def, s.nivel) };
    return null;
  }

  aplicarMejora(s) {
    s.nivel++;
    if (s.tipo === 'trampa') {
      s.usosMax = usosMaximos(s.def, s.nivel);
      s.usos = s.usosMax;
    }
    // Sube el tope de vida y se queda entera.
    s.vidaMax = vidaEstructura(s.def, s.tipo, s.nivel);
    s.vida = s.vidaMax;
    s.flash = 1;
    this.mode.particles.spark(s.x, s.y - 30, '#ffd23f', 18, 280);
  }

  /* =============================================================
     ROMPERSE (y no volver)
     ============================================================= */

  /**
   * Le pega a algo colocado. Lo usan los zombis que golpean una torre y
   * las explosiones.
   */
  danar(s, dano) {
    if (!s || s.dead || dano <= 0) return;
    s.vida -= dano;
    s.danoFlash = 0.2;
    this.mode.particles.spark(s.x, s.y - 30, '#e8434f', 4, 160);
    if (s.vida <= 0) this.destruir(s);
  }

  /** Dano en area: lo que revienta cerca se lleva su parte. */
  danarCerca(x, radio, dano) {
    for (const s of [...this.lista]) {
      const d = Math.abs(s.x - x);
      if (d > radio) continue;
      this.danar(s, Math.round(dano * (1 - Math.min(1, d / radio) * 0.6)));
    }
  }

  /** Fuera del mapa y de la lista. Esto no tiene vuelta atras. */
  destruir(s, motivo = 'destruida') {
    if (s.dead) return;
    s.dead = true;
    const i = this.lista.indexOf(s);
    if (i !== -1) this.lista.splice(i, 1);

    this.mode.particles.spark(s.x, s.y - 26, s.def.acento || '#e8434f', 20, 300);
    this.mode.particles.puff(s.x, s.y - 16, 'rgba(120, 120, 130, 0.6)', 10);
    playExplosionAt(s.x, s.y - 20);
    this.mode.game.showMessage(`${s.def.name} ${motivo} · ya no vuelve`, 'legendary');
  }

  /** Lo colocado que le cierra el paso a un zombi, o null. */
  bloqueoDelante(z, dir) {
    for (const s of this.lista) {
      // Las trampas van en el suelo: se pisan, no se chocan.
      if (s.tipo !== 'torre') continue;
      const medio = this.ancho(s.def, s.tipo) / 2;
      const morro = dir < 0 ? z.x : z.x + z.w;
      if (Math.abs(morro - s.x) > medio + 12) continue;
      // Solo lo que tiene DELANTE, no lo que ya ha pasado.
      if (dir < 0 ? s.x > morro : s.x < morro) continue;
      return s;
    }
    return null;
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
    // Copia de la lista: algo puede romperse (y salir de ella) a mitad.
    for (const s of [...this.lista]) {
      if (s.dead) continue;
      s.flash = Math.max(0, s.flash - dt * 4);
      s.danoFlash = Math.max(0, s.danoFlash - dt);
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

    // La de reparacion no dispara: cura la torre.
    if (d.repara) {
      this._reparar(s, dt);
      return;
    }

    // A quien apunta: al mas cercano o, la francotiradora, al que MAS
    // vida tenga a tiro (suele ser una mole o el jefe).
    let mejor = null;
    let mejorD = d.alcance;
    let mejorVida = -1;
    for (const z of zombies) {
      if (z.dead) continue;
      const dist = Math.abs(z.cx - cx);
      if (dist > d.alcance) continue;
      if (d.objetivo === 'mas-vida') {
        if (z.health > mejorVida) { mejorVida = z.health; mejor = z; }
      } else if (dist < mejorD) {
        mejorD = dist;
        mejor = z;
      }
    }
    if (!mejor) return;

    s.angle = Math.atan2(mejor.y + mejor.h * 0.45 - cy, mejor.cx - cx);
    if (s.cooldown > 0) return;
    s.cooldown = 1 / (d.cadencia * (1 + (s.nivel - 1) * 0.2));

    const game = this.mode.game;
    game.bullets.spawn({
      x: cx + Math.cos(s.angle) * 30,
      y: cy + Math.sin(s.angle) * 30,
      angle: s.angle + (Math.random() - 0.5) * (d.dispersion ?? 0.03),
      speed: d.velocidadBala,
      damage: Math.round(d.dano * multNivel(s.nivel)),
      range: d.alcanceBala ?? d.alcance + 160,
      pierce: !!d.perfora,
      rarity: RAREZA_NIVEL[s.nivel],
      kind: d.efecto === 'hielo' || d.efecto === 'cadena' || d.efecto === 'aturde' || d.id === 'laser' ? 'rayo' : 'bala',
      // Las balas son del jugador: asi nunca le dan a el.
      owner: this.mode.player,
      effect: d.efecto || null,
      radius: d.radio || 0,
    });
    this.mode.particles.muzzleFlash(cx + Math.cos(s.angle) * 32, cy + Math.sin(s.angle) * 32, s.angle, d.acento, 0.8);
    playShotAt(SONIDO_TORRE[d.id] || 'ar', cx, cy);
  }

  /** Torre de Reparacion: devuelve vida a la torre poco a poco. */
  _reparar(s, dt) {
    const base = this.mode.base;
    if (base.vida >= base.vidaMax || base.vida <= 0) return;
    base.vida = Math.min(base.vidaMax, base.vida + s.def.repara * multNivel(s.nivel) * dt);

    // Un destello de vez en cuando, para que se vea que esta trabajando.
    if (s.cooldown <= 0) {
      s.cooldown = 0.7;
      s.flash = 1;
      this.mode.particles.spark(base.x, base.y - 120, '#5fd14a', 8, 160);
    }
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
      // Los dardos van a ras de suelo: a un volador no le llegan.
      // Como ahora los zombis vienen por los DOS lados, dispara hacia
      // el lado que tenga alguno a tiro (el mas cercano manda).
      let lado = 0;
      let mejorD = d.alcance;
      for (const z of zombies) {
        if (z.dead || z.enAire || z.def.vuela) continue;
        const dist = Math.abs(z.cx - s.x);
        if (dist > mejorD) continue;
        mejorD = dist;
        lado = z.cx >= s.x ? 1 : -1;
      }
      if (!lado) return;
      s.cooldown = d.espera;
      this._gastar(s);
      this.mode.game.bullets.spawn({
        x: s.x + 16 * lado, y: s.y - 42, angle: lado > 0 ? 0 : Math.PI, speed: 1300,
        damage: dano, range: d.alcance + 40, pierce: false,
        rarity: 'uncommon', kind: 'bala', owner: jugador,
      });
      playShotAt('pistol', s.x, s.y);
      return;
    }

    // --- Descarga (electrica y bobina): a todo lo que tenga cerca ---
    if (d.descarga || d.id === 'electrica') {
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
      // Para pisar una trampa hay que ir por el suelo.
      if (z.dead || z.enAire || z.def.vuela) continue;
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
      } else if (d.quema) {
        z.quemar(d.dps * multNivel(s.nivel), d.quema, jugador);
        z.takeDamage(dano, z.cx, pie, jugador);
      } else if (d.id === 'lanzador') {
        z.lanzar(d.empuje, 260, dano, jugador);
        this.mode.particles.puff(s.x, s.y - 10, 'rgba(200, 230, 160, 0.6)', 6);
      } else if (d.id === 'pegamento') {
        // Sin dano: los deja pegados, casi quietos, un buen rato.
        z.ralentizar(d.ralentiza, d.duracion);
        this.mode.particles.puff(z.cx, pie, 'rgba(40, 30, 20, 0.6)', 3);
      } else if (d.id === 'mina') {
        // Revienta en area: a este y a todos los de alrededor.
        this.mode.explosion(s.x, s.y - 14, d.radio, dano, jugador);
        break;   // un pisoton, una explosion
      } else if (d.id === 'empujador') {
        // Golpe seco hacia atras, a ras de suelo: de vuelta al portal.
        z.lanzar(d.fuerza, d.empuje, dano, jugador);
        this.mode.particles.puff(s.x, s.y - 10, 'rgba(255, 200, 120, 0.6)', 6);
      } else {
        // La sierra, y cualquier trampa nueva que solo haga dano. Antes
        // esto no existia: la sierra gastaba usos y no quitaba vida,
        // porque no tenia su rama. Con este respaldo, una trampa nueva
        // hace su dano aunque se olvide anadirle nada especial.
        z.takeDamage(dano, z.cx, pie, jugador);
        this.mode.particles.spark(z.cx, pie - 8, d.acento, 10, 240);
      }

      if (s.usos <= 0) break;
    }
  }

  /**
   * Gasta un uso. Al ultimo, la trampa SE ROMPE y desaparece: no hay
   * recarga que valga, hay que comprar otra.
   */
  _gastar(s) {
    s.usos--;
    s.flash = 1;
    if (s.usos <= 0) this.destruir(s, 'gastada');
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    for (const s of this.lista) {
      if (!camera.isVisible(s.x - 60, s.y - 110, 120, 120)) continue;
      if (s.tipo === 'torre') drawTower(ctx, s, time);
      else drawTrap(ctx, s, time);
      this._barraVida(ctx, s);
    }
  }

  /**
   * Barrita de vida: solo aparece cuando ya le han dado. Estando
   * entera no se ve nada, para no llenar el camino de barras.
   */
  _barraVida(ctx, s) {
    if (s.vida >= s.vidaMax) return;
    const w = 44;
    const y = s.y - (s.tipo === 'torre' ? 74 : 60);
    const f = Math.max(0, s.vida / s.vidaMax);

    ctx.save();
    ctx.fillStyle = 'rgba(10, 16, 34, 0.8)';
    ctx.fillRect(s.x - w / 2, y, w, 5);
    ctx.fillStyle = s.danoFlash > 0 ? '#ffffff' : (f < 0.35 ? '#e8434f' : '#ffb03a');
    ctx.fillRect(s.x - w / 2, y, w * f, 5);
    ctx.restore();
  }
}
