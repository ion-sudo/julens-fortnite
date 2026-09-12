/**
 * combat.js
 * ---------------------------------------------------------------
 * SISTEMA DE COMBATE: traduce el raton en disparos, golpes de pico y
 * curaciones. Es el unico sitio que conoce la cadencia, la dispersion
 * y el "calentamiento" del minigun.
 *
 *   Clic izquierdo -> usar lo que llevas en la mano
 *                     (arma = disparar, pico = golpear, cura = tomarla)
 *   Clic derecho   -> apuntar: mira grande y mucha menos dispersion
 *
 * No dibuja nada: de eso se encargan bullet.js, particles.js y ui/crosshair.js.
 */

import { CONFIG } from '../core/config.js';
import { muzzleDistance } from '../entities/weaponSprite.js';
import { areAllies } from './teams.js';
import { playShot, playEmpty } from '../core/audio.js';

export class Combat {
  /**
   * @param {object} deps { player, inventory, bullets, particles, world }
   */
  constructor(deps) {
    this.player = deps.player;
    this.inventory = deps.inventory;
    this.bullets = deps.bullets;
    this.particles = deps.particles;
    this.world = deps.world;
    /** Sistema de tala: lo enchufa game.js. */
    this.harvest = deps.harvest || null;
    /** Gestor de construccion: lo enchufa game.js. */
    this.build = deps.build || null;
    /** Granadas en vuelo: lo enchufa game.js. */
    this.throwables = deps.throwables || null;
    /** Torretas y trampas: lo enchufa game.js. */
    this.gadgets = deps.gadgets || null;

    /** Segundos que faltan para poder volver a disparar. */
    this.cooldown = 0;
    /** Calentamiento del minigun: 0 parado, 1 a tope. */
    this.spin = 0;
    /** Curacion en curso. */
    this.healing = null;      // { item, def, timer, total }
    /** Retroceso acumulado (lo lee el dibujo del arma). */
    this.recoil = 0;
    /** Espera entre avisos de "sin municion". */
    this.emptyNotice = 0;

    /** Se rellena desde fuera para avisar por pantalla. */
    this.onMessage = null;
    /**
     * Efecto especial de un arma que NO dispara (de momento, solo la
     * Grieta Portatil). Lo resuelve game.js, que es quien sabe mover al
     * jugador por el mundo.
     */
    this.onEffect = null;
    /** Avisos para las misiones. */
    this.onWood = null;
    this.onDamageDealt = null;
    /** Lista de objetivos a los que pueden dar las balas. */
    this.targets = [];
  }

  /** Se llama al empezar una partida. */
  reset() {
    this.cooldown = 0;
    this.spin = 0;
    this.healing = null;
    this.recoil = 0;
    this.emptyNotice = 0;
  }

  /* =============================================================
     UPDATE
     ============================================================= */

  /**
   * @param {number} dt
   * @param {import('../core/mouse.js').Mouse} mouse
   */
  update(dt, mouse) {
    const player = this.player;

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.recoil *= Math.max(0, 1 - dt * 9);
    this.emptyNotice = Math.max(0, this.emptyNotice - dt);

    // --- Apuntado: el personaje mira siempre hacia el cursor ---
    player.aiming = mouse.right;
    const dx = mouse.worldX - player.handX;
    const dy = mouse.worldY - player.handY;
    player.aimAngle = Math.atan2(dy, dx);

    // Al apuntar, el cuerpo se gira hacia el lado del raton.
    if (Math.abs(dx) > 6) player.facing = dx > 0 ? 1 : -1;

    // ABATIDO: tirado en el suelo no se hace nada de esto. Solo puedes
    // arrastrarte y esperar a que alguien te levante.
    if (player.downed) {
      this.spin = 0;
      this.healing = null;
      if (this.gadgets) this.gadgets.preview = null;
      return;
    }

    // En modo construccion el clic izquierdo coloca piezas, no dispara.
    if (player.buildMode) {
      this.spin = Math.max(0, this.spin - dt * 2.2);   // el minigun se enfria
      this.healing = null;                             // y se corta la curacion
      return;
    }

    const equipado = this.inventory.equipped;

    // --- Curacion en curso ---
    if (this.healing) {
      this._updateHealing(dt);
      return;
    }

    // --- Minigun: sube o baja el calentamiento ---
    const esMinigun = equipado?.kind === 'weapon' && equipado.def.spinUp > 0;
    if (esMinigun && mouse.left) {
      this.spin = Math.min(1, this.spin + dt / equipado.def.spinUp);
    } else {
      this.spin = Math.max(0, this.spin - dt * 2.2);
    }

    // El fantasma solo se ve mientras llevas el trasto en la mano.
    if (this.gadgets && equipado?.kind !== 'gadget') this.gadgets.preview = null;

    if (!equipado) return;

    // --- Clic izquierdo: usar lo que lleve en la mano ---
    switch (equipado.kind) {
      case 'weapon':
        // Las armas automaticas disparan mientras mantienes el boton;
        // las semiautomaticas, solo al pulsarlo.
        if (equipado.def.auto ? mouse.left : mouse.leftPressed) {
          this._tryShoot(equipado);
        }
        break;

      case 'pickaxe':
        if (mouse.leftPressed) this._swingPickaxe();
        break;

      case 'heal':
        if (mouse.leftPressed) this._startHealing(equipado);
        break;

      case 'throwable':
        if (mouse.leftPressed) this._throw(equipado, mouse);
        break;

      case 'gadget':
        // La previsualizacion se recalcula cada frame (la pinta el
        // gestor); el clic coloca justo lo que se esta viendo.
        if (this.gadgets) {
          this.gadgets.preview = this.gadgets.aim(equipado.def, player, mouse);
          if (mouse.leftPressed) this._place(equipado);
        }
        break;
    }
  }

  /* =============================================================
     TORRETAS Y TRAMPAS
     ============================================================= */

  /** Coloca lo que se este previsualizando y descuenta una unidad. */
  _place(item) {
    if (this.cooldown > 0) return;
    if (!this.gadgets?.place(this.gadgets.preview, this.player)) return;

    this.cooldown = 0.4;
    this.player.action = 'shoot';
    this.player.actionTimer = 0.2;

    this.inventory.consumeEquipped();
    // Si era la ultima, se vuelve al pico en vez de dejar la mano vacia.
    if (!this.inventory.equipped) this.inventory.select(0);
  }

  /* =============================================================
     GRANADAS
     ============================================================= */

  /**
   * Lanza una granada hacia donde apunta el raton y descuenta una.
   *
   * El arco y el vuelo los lleva systems/throwables.js; aqui solo se
   * comprueba la cadencia y se gasta la unidad.
   */
  _throw(item, mouse) {
    if (this.cooldown > 0) return;
    if (!this.throwables) return;

    this.throwables.throwFrom(item.def, this.player, mouse.worldX, mouse.worldY);

    // Un respiro entre granadas, para que no se vacie la ranura de un
    // clic mantenido sin querer.
    this.cooldown = 0.55;
    this.player.action = 'shoot';
    this.player.actionTimer = 0.18;

    this.inventory.consumeEquipped();

    // Si era la ultima, se vuelve al pico en vez de dejar la mano vacia.
    if (!this.inventory.equipped) this.inventory.select(0);
  }

  /* =============================================================
     DISPARO
     ============================================================= */

  _tryShoot(weapon) {
    const def = weapon.def;
    if (this.cooldown > 0) return;

    // --- Sin balas no se dispara ---
    if (!this.player.hasAmmoFor(weapon)) {
      // Un aviso de vez en cuando, para no llenar la pantalla.
      if (this.emptyNotice <= 0) {
        this.emptyNotice = 1.2;
        this.onMessage?.('¡Sin municion! Busca cajas de balas');
        playEmpty();
      }
      // Pequeno bloqueo para que el "clic" no se repita cada frame.
      this.cooldown = 0.25;
      return;
    }

    // El minigun no dispara hasta haber girado lo suficiente.
    if (def.spinUp > 0 && this.spin < 1) return;

    this.player.spendAmmo(weapon);
    // La cadencia sube con el potenciador "Gatillo Rapido" del Blitz.
    // Fuera de ese modo el multiplicador vale 1 y esto no cambia nada.
    this.cooldown = 1 / (def.fireRate * (this.player.boosts?.fireRate || 1));

    // --- Armas que no disparan, hacen otra cosa ---
    // La Grieta Portatil no suelta balas: abre una grieta y te sube al
    // cielo. Se resuelve aqui, antes de fabricar proyectiles, porque no
    // hay ninguno que fabricar.
    if (def.effect === 'rift') {
      this.onEffect?.('rift', weapon);
      this.player.action = 'shoot';
      this.player.actionTimer = 0.2;
      return;
    }

    const player = this.player;
    const angle = player.aimAngle;

    // La boca del canon: desde la mano, en la direccion de apuntado.
    const dist = muzzleDistance(weapon);
    const mx = player.handX + Math.cos(angle) * dist;
    const my = player.handY + Math.sin(angle) * dist;

    // --- Dispersion ---
    let spread = player.aiming ? def.adsSpread : def.spread;
    // Disparar corriendo abre el cono.
    if (Math.abs(player.vx) > 60) spread *= CONFIG.combat.moveSpreadPenalty;

    for (let i = 0; i < def.pellets; i++) {
      // Los perdigones se reparten por el cono; una bala sola se desvia al azar.
      const t = def.pellets > 1 ? (i / (def.pellets - 1)) - 0.5 : 0;
      const desvio = def.pellets > 1
        ? t * spread * 2 + (Math.random() - 0.5) * spread * 0.4
        : (Math.random() - 0.5) * spread * 2;

      this.bullets.spawn({
        x: mx,
        y: my,
        angle: angle + desvio,
        speed: def.speed * (0.94 + Math.random() * 0.12),
        // El dano ya viene con la rareza aplicada; aqui se le suma el
        // potenciador "Furia" (1 fuera del Blitz).
        damage: weapon.damage * (player.boosts?.damage || 1),
        range: def.range,
        pierce: def.pierce,
        rarity: weapon.rarity,
        kind: def.kind === 'beam' ? 'rayo' : 'bala',
        owner: player,
      });
    }

    // --- Efectos ---
    this.particles.muzzleFlash(mx, my, angle, this._flashColor(def), def.pellets > 1 ? 1.3 : 1);
    playShot(def.kind);
    this.recoil = def.recoil;
    this.player.action = 'shoot';
    this.player.actionTimer = 0.12;
  }

  _flashColor(def) {
    return def.kind === 'beam' ? '#c9a6ff' : '#ffd27f';
  }

  /* =============================================================
     PICO
     ============================================================= */

  _swingPickaxe() {
    const rate = CONFIG.combat.pickaxeRate;
    if (this.cooldown > 0) return;
    this.cooldown = 1 / rate;

    const player = this.player;
    player.action = 'swing';
    player.actionTimer = 0.28;

    // Punto donde impacta el pico: al final del brazo, hacia el cursor.
    const r = CONFIG.combat.pickaxeRange;
    const hx = player.handX + Math.cos(player.aimAngle) * r;
    const hy = player.handY + Math.sin(player.aimAngle) * r;

    // --- Primero: arboles y construcciones, lo que este MAS CERCA ---
    // Si se decidiera siempre por el arbol, un pino pegado a tu muro te
    // impediria romper el muro; asi se golpea lo que de verdad tienes
    // delante del pico.
    const arbol = this.harvest?.nearestTree(hx, hy);
    const construccion = this.build?.nearestStructure(hx, hy, 48);

    const dArbol = arbol ? Math.hypot(hx - arbol.x, hy - (arbol.y - 40)) : Infinity;
    const dObra = construccion ? distanciaARect(hx, hy, construccion.tightRect()) : Infinity;

    if (dObra < dArbol) {
      construccion.takeDamage(CONFIG.combat.pickaxeDamage * CONFIG.combat.pickaxeVsBuild, player);
      this.particles.spark(hx, hy, '#c8a06a', 7, 210);
      return;
    }
    if (arbol) {
      const madera = this.harvest.hit(arbol, player);
      if (madera > 0) {
        this.onMessage?.(`+${madera} de madera`, 'uncommon');
        this.onWood?.(madera);
      }
      return;
    }

    let alcanzado = false;
    for (const t of this.targets) {
      if (t.dead) continue;
      // Ni a los companeros de escuadron: el pico tampoco los toca.
      if (areAllies(this.player, t)) continue;
      const rect = t.rect();
      // Distancia del punto de impacto al rectangulo del objetivo
      const cx = Math.max(rect.x, Math.min(hx, rect.x + rect.w));
      const cy = Math.max(rect.y, Math.min(hy, rect.y + rect.h));
      if (Math.hypot(hx - cx, hy - cy) < 22) {
        t.takeDamage(CONFIG.combat.pickaxeDamage, hx, hy);
        this.onDamageDealt?.(CONFIG.combat.pickaxeDamage);
        alcanzado = true;
      }
    }

    this.particles.spark(hx, hy, alcanzado ? '#ffd27f' : '#cfd6e4', alcanzado ? 8 : 4, 200);
  }

  /* =============================================================
     CURACION
     ============================================================= */

  _startHealing(item) {
    const def = item.def;

    if (!this.player.canUseHeal(def)) {
      this.onMessage?.(
        def.health > 0 && def.shield > 0 ? 'Ya tienes vida y escudo al maximo'
          : def.shield > 0 ? 'Ya tienes el escudo al maximo'
          : 'Ya tienes la vida al maximo'
      );
      return;
    }

    this.healing = { item, def, timer: def.useTime, total: def.useTime };
    this.player.action = 'heal';
    this.player.actionTimer = def.useTime;
  }

  _updateHealing(dt) {
    const h = this.healing;

    // Si el jugador ha cancelado (salto, dano, cambio de ranura), se corta.
    if (this.player.action !== 'heal' || this.inventory.equipped !== h.item) {
      this.healing = null;
      this.player.cancelAction();
      return;
    }

    h.timer -= dt;
    if (h.timer > 0) return;

    // --- Se aplica la cura ---
    const subida = this.player.applyHeal(h.def);
    this.inventory.consumeEquipped();

    const px = this.player.x + this.player.w / 2;
    const py = this.player.y + 10;
    if (subida.health > 0) {
      this.particles.damageNumber(px - 10, py, `+${subida.health}`, '#5fd14a');
      this.particles.puff(px, py + 20, 'rgba(120, 230, 120, 0.5)', 6);
    }
    if (subida.shield > 0) {
      this.particles.damageNumber(px + 10, py - 12, `+${subida.shield}`, '#4fc3f7');
      this.particles.puff(px, py + 20, 'rgba(120, 190, 255, 0.5)', 6);
    }

    this.healing = null;
    this.player.cancelAction();
  }

  /** Progreso de la curacion en curso [0..1], o null si no hay ninguna. */
  get healProgress() {
    if (!this.healing) return null;
    return 1 - this.healing.timer / this.healing.total;
  }
}

/** Distancia de un punto al borde (o al interior) de un rectangulo. */
function distanciaARect(x, y, r) {
  const cx = Math.max(r.x, Math.min(x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(y, r.y + r.h));
  return Math.hypot(x - cx, y - cy);
}
