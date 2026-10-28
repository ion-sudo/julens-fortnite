/**
 * player.js
 * ---------------------------------------------------------------
 * LOGICA del jugador: intenciones, fisica, colisiones y energia.
 * El dibujo esta separado en playerSprite.js para que este archivo
 * siga siendo legible cuando anadamos armas, construccion, vida, etc.
 *
 * Sistema de coordenadas: (x, y) = esquina superior izquierda de la hitbox.
 * El "suelo" del personaje es y + h.
 */

import { CONFIG } from '../core/config.js';
import { clamp, moveTowards, rectsOverlap } from '../core/utils.js';
import { AMMO_TYPES, STARTING_AMMO, ammoInfo } from '../data/ammo.js';
import { ReviveManager } from '../systems/revive.js';
import { bodyAt } from '../world/water.js';
import { playFootstep, playJump, playLand, playHurt, playBusJump, playGlider } from '../core/audio.js';

export class Player {
  constructor(world) {
    const P = CONFIG.player;
    this.world = world;

    // --- Hitbox ---
    this.w = P.width;
    this.h = P.height;
    this.x = world.spawn.x;
    this.y = world.spawn.y;

    // --- Cinematica ---
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;          // 1 = mira a la derecha, -1 = izquierda

    // --- Estado ---
    this.onGround = false;
    this.crouching = false;
    this.running = false;

    // --- Energia de carrera ---
    this.stamina = P.staminaMax;
    this.staminaCooldown = 0; // tiempo restante antes de empezar a recargar
    this.exhausted = false;   // agotada: no se puede correr hasta recargar un minimo

    // --- Temporizadores de "game feel" ---
    this.coyoteTimer = 0;     // margen para saltar tras dejar el suelo
    this.jumpBufferTimer = 0; // margen para saltar justo antes de aterrizar
    this.dropTimer = 0;       // ignora plataformas finas mientras baja de una
    this.jumpHeld = false;

    // --- Identidad (la usan las balas para no darse a si mismas) ---
    this.id = 'player';
    this.name = 'Tu';
    this.alive = true;
    /** Quien te ha hecho el ultimo dano (para el mensaje de eliminacion). */
    this.lastAttacker = null;

    // --- Vida y escudo ---
    this.maxHealth = CONFIG.combat.maxHealth;
    this.health = this.maxHealth;

    /**
     * POTENCIADORES: multiplicadores que tocan otros sistemas al usarlos.
     *
     * Viven aqui, en el jugador, y no en el modo que los reparte, para
     * que quien dispara o quien se mueve no tenga que saber nada del
     * Julen Blitz: lee su multiplicador y ya. En los demas modos valen
     * todos 1 (o 0), asi que no cambian nada.
     */
    this.boosts = nuevosBoosts();

    /** Equipo (0 siempre). Lo reparte systems/teams.js. */
    this.team = 0;

    // --- ABATIDO (solo en duos y escuadrones) ---
    /** true = tirado en el suelo esperando que te levanten. */
    this.downed = false;
    /** Si puede quedar abatido: lo pone el gestor segun le queden aliados. */
    this.canBeDowned = false;
    /** Vida mientras esta en el suelo. */
    this.downHealth = 0;
    this.maxDownHealth = 0;
    /** Barra de reanimacion, 0..1. */
    this.reviveProgress = 0;
    this.beingRevived = false;
    this.downedBy = null;

    /** Emote en marcha (ver systems/emotes.js), o null. */
    this.emote = null;
    /** Segundos que lleva bailando. */
    this.emoteTime = 0;
    this.maxShield = CONFIG.combat.maxShield;
    this.shield = 0;
    this.hurtFlash = 0;       // parpadeo rojo al recibir dano

    /**
     * Si este personaje hace sonidos "de cerca" (pasos, salto, golpes
     * recibidos). Bot hereda de Player, asi que esto se pone a true
     * SOLO para el jugador de verdad: si no, sonarian 74 pares de pies.
     */
    this.oye = false;
    /** Reloj interno de los pasos. */
    this._pasoT = 0;
    /** Para detectar el aterrizaje. */
    this._enAire = false;

    // --- Municion: una reserva por tipo, aparte del inventario ---
    this.ammo = { ...STARTING_AMMO };

    // --- Madera para construir (se consigue picando arboles) ---
    this.wood = CONFIG.build.startWood;
    /** true mientras esta en modo construccion (tecla Q). */
    this.buildMode = false;
    /** Pieza elegida: 'pared' | 'suelo' | 'rampa'. */
    this.piece = 'pared';

    /**
     * Fase de vuelo al empezar la partida:
     *   'bus'       -> subido en el bus de batalla
     *   'cayendo'   -> ha saltado, cae en picado
     *   'planeando' -> paravela desplegada
     *   null        -> ya ha aterrizado, juego normal
     */
    this.flight = null;
    /** Se pone a true el frame en que toca tierra tras planear. */
    this.justLanded = false;

    // --- Nado ---
    /** Masa de agua en la que esta metido, o null si esta en tierra. */
    this.water = null;
    /** true mientras nade: lo consultan el sprite, el HUD y la IA. */
    this.swimming = false;
    /** true si esta buceando (pulsando Espacio bajo el agua). */
    this.diving = false;
    /** Se pone a true el frame en el que entra al agua (para la salpicadura). */
    this.justEnteredWater = false;

    // --- Apuntado con el raton ---
    this.aimAngle = 0;        // radianes; 0 = mirando a la derecha
    this.aiming = false;      // clic derecho mantenido
    /** Accion en curso: 'idle' | 'shoot' | 'swing' | 'heal' */
    this.action = 'idle';
    this.actionTimer = 0;

    // --- Animacion ---
    this.stepPhase = 0;       // ciclo de piernas
    this.squash = 0;          // -1 aplastado (aterrizaje), +1 estirado (salto)
    this.animState = 'idle';
    this.respawnFlash = 0;    // parpadeo tras reaparecer
  }

  /* =============================================================
     PUNTO DE LA MANO
     De ahi sale el arma (y por tanto los disparos).
     ============================================================= */

  /** Altura del hombro respecto a los pies (coincide con el dibujo). */
  get shoulderOffset() {
    return this.crouching ? 29 : 42;
  }

  get handX() { return this.x + this.w / 2 + this.facing * 3; }
  get handY() { return this.y + this.h - this.shoulderOffset; }

  /* =============================================================
     MUNICION
     ============================================================= */

  /** Balas que le quedan de un tipo. */
  getAmmo(type) {
    return this.ammo[type] ?? 0;
  }

  /** Balas que le quedan para un arma concreta. */
  ammoFor(weapon) {
    if (!weapon?.def?.ammo) return 0;
    return this.getAmmo(weapon.def.ammo);
  }

  /** ¿Puede disparar esta arma? */
  hasAmmoFor(weapon) {
    return this.ammoFor(weapon) > 0;
  }

  /**
   * Gasta una bala. Un disparo = una bala, aunque el arma suelte
   * varios perdigones.
   * @returns {boolean} false si no quedaba nada
   */
  spendAmmo(weapon) {
    const tipo = weapon?.def?.ammo;
    if (!tipo || (this.ammo[tipo] ?? 0) <= 0) return false;
    this.ammo[tipo]--;
    return true;
  }

  /**
   * Suma balas de un tipo respetando su tope.
   * @returns {number} cuantas ha cogido de verdad
   */
  addAmmo(type, amount) {
    const info = ammoInfo(type);
    const antes = this.ammo[type] ?? 0;
    const nuevo = Math.min(info.max, antes + amount);
    this.ammo[type] = nuevo;
    return nuevo - antes;
  }

  /* =============================================================
     MADERA
     ============================================================= */

  /** Suma madera respetando el tope. @returns {number} lo que ha cogido */
  addWood(cantidad) {
    const antes = this.wood;
    this.wood = Math.min(CONFIG.build.maxWood, this.wood + cantidad);
    return this.wood - antes;
  }

  /** ¿Le llega para pagar esto? */
  hasWood(cantidad) {
    return this.wood >= cantidad;
  }

  /** Gasta madera. @returns {boolean} false si no llegaba */
  spendWood(cantidad) {
    if (this.wood < cantidad) return false;
    this.wood -= cantidad;
    return true;
  }

  /** Rectangulo de colision, para las balas y la IA. */
  rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /* =============================================================
     VIDA Y ESCUDO
     ============================================================= */

  /**
   * Interfaz comun con los bots y las dianas: asi las balas pueden
   * golpear a cualquiera sin saber a quien.
   * @param {number} amount
   * @param {number} hx,hy   punto del impacto
   * @param {object} source  quien dispara (bot o jugador)
   */
  takeDamage(amount, hx, hy, source = null) {
    if (!this.alive) return;
    if (source) this.lastAttacker = source;

    // Ya en el suelo: los tiros no rematan de golpe, aceleran el
    // desangrado (ver systems/revive.js).
    if (this.downed) {
      ReviveManager.hurtDowned(this, amount, source);
      return;
    }

    this.applyDamage(amount);
    if (this.health > 0) return;

    // A cero. Con companeros en pie se queda ABATIDO; solo, muere.
    if (this.canBeDowned) ReviveManager.down(this, source);
    else this.alive = false;
  }

  /** El escudo absorbe primero; lo que sobra va a la vida. */
  applyDamage(amount) {
    if (amount <= 0) return 0;

    const alEscudo = Math.min(this.shield, amount);
    this.shield -= alEscudo;
    const aLaVida = amount - alEscudo;
    this.health = Math.max(0, this.health - aLaVida);

    this.hurtFlash = 0.25;
    if (this.oye) playHurt();
    // Recibir un golpe interrumpe una curacion.
    if (this.action === 'heal') this.cancelAction();

    return amount;
  }

  /**
   * Aplica una cura respetando sus topes.
   * @returns {{health: number, shield: number}} lo que ha subido de verdad
   */
  applyHeal(def) {
    let vida = 0;
    let escudo = 0;

    if (def.health > 0) {
      const tope = Math.min(def.healthCap || this.maxHealth, this.maxHealth);
      if (this.health < tope) {
        const nueva = Math.min(tope, this.health + def.health);
        vida = nueva - this.health;
        this.health = nueva;
      }
    }

    if (def.shield > 0) {
      const tope = Math.min(def.shieldCap || this.maxShield, this.maxShield);
      if (this.shield < tope) {
        const nuevo = Math.min(tope, this.shield + def.shield);
        escudo = nuevo - this.shield;
        this.shield = nuevo;
      }
    }

    return { health: vida, shield: escudo };
  }

  /** ¿Le serviria de algo esta cura ahora mismo? */
  canUseHeal(def) {
    const topeVida = Math.min(def.healthCap || this.maxHealth, this.maxHealth);
    const topeEscudo = Math.min(def.shieldCap || this.maxShield, this.maxShield);
    return (def.health > 0 && this.health < topeVida) ||
           (def.shield > 0 && this.shield < topeEscudo);
  }

  /** Corta la accion en curso (curacion interrumpida, cambio de arma...). */
  cancelAction() {
    this.action = 'idle';
    this.actionTimer = 0;
  }

  /**
   * Devuelve al jugador al punto de salida en estado limpio.
   * Se llama al empezar cada partida desde el menu.
   */
  reset() {
    const P = CONFIG.player;

    this.w = P.width;
    this.h = P.height;
    this.x = this.world.spawn.x;
    this.y = this.world.spawn.y;

    this.vx = 0;
    this.vy = 0;
    this.facing = 1;

    this.onGround = false;
    this.crouching = false;
    this.running = false;

    this.stamina = P.staminaMax;
    this.staminaCooldown = 0;
    this.exhausted = false;

    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.dropTimer = 0;
    this.jumpHeld = false;

    this.stepPhase = 0;
    this.squash = 0;
    this.animState = 'idle';
    this.respawnFlash = 0;

    // La vida maxima puede haber subido con un potenciador de la partida
    // anterior: se vuelve a la de siempre antes de rellenarla.
    this.maxHealth = CONFIG.combat.maxHealth;
    this.boosts = nuevosBoosts();

    this.health = this.maxHealth;
    this.shield = 0;
    this.hurtFlash = 0;

    // Nada de arrastrarse de la partida anterior.
    this.downed = false;
    this.canBeDowned = false;
    this.emote = null;
    this.emoteTime = 0;
    this.downHealth = 0;
    this.reviveProgress = 0;
    this.beingRevived = false;
    this.downedBy = null;
    this.aimAngle = 0;
    this.aiming = false;
    this.alive = true;
    this.lastAttacker = null;
    this.ammo = { ...STARTING_AMMO };
    this.wood = CONFIG.build.startWood;
    this.buildMode = false;
    this.piece = 'pared';
    this.water = null;
    this.swimming = false;
    this.diving = false;
    this.flight = null;
    this.justLanded = false;
    this.cancelAction();
  }

  /**
   * Pasos y aterrizaje.
   * Los pasos van a un ritmo proporcional a la velocidad, asi que
   * andar agachado suena mas espaciado que correr sin que haya que
   * llevar dos relojes distintos.
   */
  _sonidosDePie(dt) {
    if (!this.oye || !this.alive) return;

    // Aterrizar: solo cuando se venia de verdad por el aire.
    if (this.onGround && this._enAire) playLand();
    this._enAire = !this.onGround && !this.swimming && !this.flight;

    if (!this.onGround || this.swimming || this.flight) { this._pasoT = 0; return; }

    const vel = Math.abs(this.vx);
    if (vel < 40) { this._pasoT = 0; return; }

    // Entre 0,24 s (a tope) y 0,45 s (arrastrandose)
    const cada = Math.max(0.24, 0.45 - vel / 2200);
    this._pasoT += dt;
    if (this._pasoT >= cada) {
      this._pasoT = 0;
      playFootstep(vel > 250);
    }
  }

  /** Altura objetivo segun este agachado o no. */
  get targetHeight() {
    return this.crouching ? CONFIG.player.crouchHeight : CONFIG.player.height;
  }

  /* =============================================================
     UPDATE PRINCIPAL
     ============================================================= */
  update(dt, input) {
    this._sonidosDePie(dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.actionTimer > 0) {
      this.actionTimer -= dt;
      if (this.actionTimer <= 0 && this.action !== 'heal') this.action = 'idle';
    }

    this.justLanded = false;

    // --- Fase de vuelo (bus, caida y paravela) ---
    // Mientras se cae del bus no hay nado, ni agacharse, ni saltar:
    // manda una fisica aparte, mucho mas simple.
    if (this.flight) {
      this._updateFlight(dt, input);
      this._updateAnimation(dt);
      return;
    }

    // El agua manda: hay que saber si estamos dentro ANTES de decidir
    // que hace cada tecla (sobre todo Espacio: saltar o bucear).
    this._updateWaterState();

    if (this.swimming) {
      this._updateSwim(dt, input);
    } else {
      this._updateCrouch(input);
      this._updateStamina(dt, input);
      this._updateHorizontal(dt, input);
      this._updateJump(dt, input);
      this._applyGravity(dt);
    }

    this._moveAndCollide(dt);
    this._updateAnimation(dt);
    this._checkOutOfBounds();
  }

  /* =============================================================
     VUELO: BUS, CAIDA LIBRE Y PARAVELA
     ============================================================= */

  /** Sube al jugador al bus (lo llama el gestor de partida). */
  boardBus() {
    this.flight = 'bus';
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.crouching = false;
    this.h = CONFIG.player.height;
  }

  /** Salta del bus: empieza la caida libre. */
  jumpOffBus() {
    if (this.flight !== 'bus') return false;
    this.flight = 'cayendo';
    if (this.oye) playBusJump();
    this.vy = 60;          // un empujoncito hacia abajo al soltarse
    return true;
  }

  /** Despliega la paravela (a mano con Espacio, o sola al acercarse al suelo). */
  deployGlider() {
    if (this.flight !== 'cayendo') return false;
    this.flight = 'planeando';
    if (this.oye) playGlider();
    this.vy = Math.min(this.vy, CONFIG.bus.glideFallSpeed);
    return true;
  }

  /** Altura a la que esta sobre el suelo que tiene debajo. */
  heightAboveGround() {
    const suelo = this.world.groundYAt(this.x + this.w / 2);
    return suelo - (this.y + this.h);
  }

  /**
   * Fisica mientras cae del bus. En 'bus' no hace nada: la posicion la
   * manda el propio autobus.
   */
  _updateFlight(dt, input) {
    // En el bus lo unico que se puede hacer es saltar.
    if (this.flight === 'bus') {
      if (input.consume('jump')) this.jumpOffBus();
      return;
    }

    const B = CONFIG.bus;
    const planeando = this.flight === 'planeando';

    // --- Movimiento horizontal: asi se elige donde aterrizar ---
    const axis = input.axisX;
    const maxV = planeando ? B.glideMoveSpeed : B.fallMoveSpeed;
    const acc = planeando ? B.glideAccel : B.fallAccel;

    if (axis !== 0) {
      this.facing = axis;
      this.vx = moveTowards(this.vx, axis * maxV, acc * dt);
    } else {
      this.vx = moveTowards(this.vx, 0, acc * 0.6 * dt);
    }

    // --- Descenso ---
    if (planeando) {
      // La paravela frena la caida hasta dejarla en un descenso suave
      this.vy = moveTowards(this.vy, B.glideFallSpeed, 1400 * dt);
    } else {
      this.vy = Math.min(this.vy + B.fallGravity * dt, B.fallMaxSpeed);
    }

    // --- Abrir la paravela ---
    if (!planeando) {
      const cerca = this.heightAboveGround() < B.autoGlideHeight;
      if (cerca || input.consume('jump')) this.deployGlider();
    }

    // --- Mover y comprobar si ya ha tocado suelo ---
    this._moveAndCollide(dt);

    // Caer al agua tambien cuenta como aterrizar: se sigue nadando.
    const agua = bodyAt(this.world.waterBodies || [], this.x + this.w / 2, this.y + this.h * 0.45);

    if (this.onGround || agua) this._land();

    // Red de seguridad: si por lo que sea se sale del mundo, se le deja
    // en la superficie mas cercana en vez de caer sin fin.
    if (this.world.isOutOfBounds(this)) {
      const punto = this.world.getRespawnPoint(this.x + this.w / 2, this.h);
      this.x = punto.x - this.w / 2;
      this.y = punto.y;
      this.vy = 0;
      this._land();
    }
  }

  /** Toma de tierra: a partir de aqui, juego normal. */
  _land() {
    this.flight = null;
    this.justLanded = true;
    this.squash = -1;
    this.vx *= 0.4;
  }

  /* =============================================================
     AGUA
     ============================================================= */

  /**
   * Comprueba si el personaje esta dentro de alguna masa de agua.
   * Se mide por el PECHO (no por los pies) para que estar de pie en la
   * orilla con los pies mojados no cuente como nadar.
   */
  _updateWaterState() {
    const bodies = this.world.waterBodies;
    if (!bodies) { this.water = null; this.swimming = false; return; }

    const cx = this.x + this.w / 2;
    const cy = this.y + this.h * 0.45;

    const antes = this.swimming;
    this.water = bodyAt(bodies, cx, cy);
    this.swimming = this.water !== null;

    this.justEnteredWater = this.swimming && !antes;

    if (this.justEnteredWater) {
      // Al entrar se pierde la inercia de la caida y se cancelan acciones.
      this.vy *= 0.35;
      this.crouching = false;
      this.h = CONFIG.player.height;
      if (this.action === 'heal') this.cancelAction();
    }
  }

  /**
   * Fisica de NADO: flotante, lenta y sin salto.
   *
   * Espacio (accion 'jump') aqui significa BUCEAR hacia el fondo; en
   * tierra sigue siendo saltar, porque esta rama solo se ejecuta cuando
   * this.swimming es true.
   */
  _updateSwim(dt, input) {
    const S = CONFIG.swim;
    const P = CONFIG.player;

    // Nadar no gasta la barra de rapidez, y esta se recupera.
    this.running = false;
    this.stamina = Math.min(P.staminaMax, this.stamina + P.staminaRegen * dt);
    if (this.exhausted && this.stamina >= P.staminaMinToStart) this.exhausted = false;

    // --- Horizontal ---
    const axis = input.axisX;
    if (axis !== 0) {
      this.facing = axis;
      this.vx = moveTowards(this.vx, axis * S.maxSpeed, S.accel * dt);
    }
    this.vx *= Math.max(0, 1 - S.dragX * dt);

    // --- Vertical ---
    this.diving = input.isDown('jump');

    // Gravedad muy suave dentro del agua
    this.vy += CONFIG.world.gravity * S.gravityFactor * dt;

    if (this.diving) {
      // Espacio bajo el agua: hundirse
      this.vy += S.diveAccel * dt;
    } else {
      // Sin pulsar nada, el cuerpo sube solo hasta quedarse flotando
      const flotaY = this.water.y - this.h * S.floatDepth;
      if (this.y > flotaY) {
        this.vy -= S.buoyancy * dt;
      } else {
        // Ya en la superficie: se queda ahi sin rebotar
        this.y = flotaY;
        if (this.vy < 0) this.vy *= 0.3;
      }
    }

    this.vy *= Math.max(0, 1 - S.dragY * dt);
    this.vy = clamp(this.vy, -S.maxRise, S.maxSink);

    // Nadando no se salta ni se agacha
    this.onGround = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.jumpHeld = input.isDown('jump');
  }

  /* ---------- Agacharse (S / Ctrl) ---------- */
  _updateCrouch(input) {
    const wants = input.isDown('crouch') && this.onGround;

    if (wants && !this.crouching) {
      // Al agacharse, la hitbox encoge pero los pies se quedan donde estan.
      const diff = CONFIG.player.height - CONFIG.player.crouchHeight;
      this.y += diff;
      this.h = CONFIG.player.crouchHeight;
      this.crouching = true;
    } else if (!wants && this.crouching) {
      // Solo se levanta si tiene hueco por encima (no hay techo).
      const diff = CONFIG.player.height - CONFIG.player.crouchHeight;
      const test = { x: this.x, y: this.y - diff, w: this.w, h: CONFIG.player.height };
      if (!this._collidesSolid(test)) {
        this.y -= diff;
        this.h = CONFIG.player.height;
        this.crouching = false;
      }
    }
  }

  /* ---------- Barra de corrida ---------- */
  _updateStamina(dt, input) {
    const P = CONFIG.player;

    const wantsRun = input.isDown('sprint');
    const moving = Math.abs(this.vx) > 20 && input.axisX !== 0;

    // Se puede correr si: se pulsa Shift, hay movimiento, no esta agachado
    // y queda energia (y no venimos de agotarla).
    this.running = wantsRun && moving && !this.crouching && !this.exhausted && this.stamina > 0;

    if (this.running) {
      this.stamina -= P.staminaDrain * dt;
      this.staminaCooldown = P.staminaRegenDelay;

      if (this.stamina <= 0) {
        this.stamina = 0;
        this.exhausted = true;  // hay que esperar a recargar un minimo
        this.running = false;
      }
    } else {
      // Recarga tras un pequeno retardo
      if (this.staminaCooldown > 0) {
        this.staminaCooldown -= dt;
      } else {
        this.stamina = Math.min(P.staminaMax, this.stamina + P.staminaRegen * dt);
      }
      if (this.exhausted && this.stamina >= P.staminaMinToStart) this.exhausted = false;
    }
  }

  /* ---------- Movimiento horizontal (A / D) ---------- */
  _updateHorizontal(dt, input) {
    const P = CONFIG.player;
    const axis = input.axisX;

    if (axis !== 0) this.facing = axis;

    // Velocidad objetivo segun el estado, por el multiplicador de los
    // potenciadores (1 mientras no haya ninguno).
    let maxSpeed = P.walkSpeed;
    if (this.crouching) maxSpeed = P.crouchSpeed;
    else if (this.running) maxSpeed = P.runSpeed;
    maxSpeed *= this.boosts.speed;

    // Abatido se va A RASTRAS: puedes apartarte de la linea de tiro o
    // arrimarte a un companero, pero no huir.
    if (this.downed) maxSpeed = P.crouchSpeed * 0.45;

    const accel = this.onGround ? P.accelGround : P.accelAir;
    const friction = this.onGround ? P.frictionGround : P.frictionAir;

    if (axis !== 0) {
      this.vx = moveTowards(this.vx, axis * maxSpeed, accel * dt);
    } else {
      this.vx = moveTowards(this.vx, 0, friction * dt);
    }
  }

  /* ---------- Salto (W / Espacio) ---------- */
  _updateJump(dt, input) {
    const P = CONFIG.player;

    // Temporizadores
    this.coyoteTimer = this.onGround ? P.coyoteTime : Math.max(0, this.coyoteTimer - dt);
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);

    if (input.wasPressed('jump')) this.jumpBufferTimer = P.jumpBuffer;

    const jumpDown = input.isDown('jump');

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      // S + Salto sobre una plataforma fina => bajarse por ella
      if (input.isDown('crouch') && this._standingOnOneWay()) {
        this.dropTimer = 0.22;
        this.y += 4;
        this.onGround = false;
        this.jumpBufferTimer = 0;
      } else {
        this.vy = -P.jumpSpeed;
        this.onGround = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.squash = 1;          // estiramiento al despegar
        if (this.oye) playJump();
        // Saltar interrumpe la curacion, como en Fortnite.
        if (this.action === 'heal') this.cancelAction();
        // Al saltar agachado nos levantamos si podemos
        if (this.crouching && !input.isDown('crouch')) this.crouching = false;
      }
    }

    // Salto variable: al soltar la tecla, se recorta la subida.
    if (this.jumpHeld && !jumpDown && this.vy < 0) {
      this.vy *= P.jumpCutMultiplier;
    }
    this.jumpHeld = jumpDown;
  }

  /* ---------- Gravedad ---------- */
  _applyGravity(dt) {
    this.vy = Math.min(this.vy + CONFIG.world.gravity * dt, CONFIG.world.maxFallSpeed);
  }

  /* =============================================================
     COLISIONES (eje por eje: primero X, luego Y)
     ============================================================= */
  _moveAndCollide(dt) {
    const prevBottom = this.y + this.h;

    // ---- Eje X ----
    this.x += this.vx * dt;
    for (const p of this.world.getPlatformsNear(this)) {
      if (p.oneWay) continue;                 // las finas no bloquean de lado
      if (!this._overlaps(p)) continue;

      // Nadando: si el obstaculo es bajito (la orilla), se sube encima
      // en vez de chocar. Es lo que permite SALIR del agua andando.
      if (this.swimming) {
        const escalon = (this.y + this.h) - p.y;
        if (escalon > 0 && escalon <= CONFIG.swim.exitStep) {
          this.y = p.y - this.h;
          continue;
        }
      }

      // Rampas construidas: sus peldanos se suben ANDANDO, sin tener que
      // saltar en cada uno. Es el mismo truco que para salir del agua.
      if (p.ramp && this.vy >= 0) {
        const peldano = (this.y + this.h) - p.y;
        if (peldano > 0 && peldano <= CONFIG.build.rampStep) {
          this.y = p.y - this.h;
          continue;
        }
      }

      if (this.vx > 0) this.x = p.x - this.w; // choque por la derecha
      else if (this.vx < 0) this.x = p.x + p.w;
      this.vx = 0;
    }

    // Limites del mundo
    this.x = clamp(this.x, 0, this.world.width - this.w);

    // ---- Eje Y ----
    const wasOnGround = this.onGround;
    this.onGround = false;
    this.y += this.vy * dt;

    for (const p of this.world.getPlatformsNear(this)) {
      if (!this._overlaps(p)) continue;

      if (p.oneWay) {
        // Plataforma fina: solo colisiona cayendo y viniendo desde arriba.
        if (this.dropTimer > 0) continue;
        if (this.vy < 0) continue;
        if (prevBottom > p.y + 2) continue;

        this.y = p.y - this.h;
        this.vy = 0;
        this.onGround = true;
      } else {
        if (this.vy > 0) {          // aterrizaje
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
        } else if (this.vy < 0) {   // golpe de cabeza
          this.y = p.y + p.h;
          this.vy = 0;
        }
      }
    }

    // Efecto de aterrizaje (aplastamiento)
    if (this.onGround && !wasOnGround) this.squash = -1;
  }

  /** ¿Este rectangulo choca con algo solido? (para levantarse tras agacharse) */
  _collidesSolid(rect) {
    return this.world
      .getPlatformsNear(rect)
      .some((p) => !p.oneWay && rectsOverlap(rect, p));
  }

  /** ¿Estamos de pie justo encima de una plataforma fina? */
  _standingOnOneWay() {
    const feet = { x: this.x, y: this.y + this.h - 2, w: this.w, h: 6 };
    return this.world
      .getPlatformsNear(feet)
      .some((p) => p.oneWay && rectsOverlap(feet, p));
  }

  _overlaps(p) { return rectsOverlap(this, p); }

  /* ---------- Caida al agua -> reaparecer ---------- */
  _checkOutOfBounds() {
    if (!this.world.isOutOfBounds(this)) return;

    const point = this.world.getRespawnPoint(this.x + this.w / 2, CONFIG.player.height);
    this.crouching = false;
    this.h = CONFIG.player.height;
    this.x = point.x - this.w / 2;
    this.y = point.y;
    this.vx = 0;
    this.vy = 0;
    this.respawnFlash = 1.1;
  }

  /* ---------- Animacion ---------- */
  _updateAnimation(dt) {
    // Ciclo de piernas proporcional a la distancia recorrida.
    if (this.onGround) {
      this.stepPhase += Math.abs(this.vx) * dt * CONFIG.player.stepCycleSpeed;
    } else {
      this.stepPhase += dt * 4;
    }

    // El squash vuelve a 0 progresivamente.
    this.squash = moveTowards(this.squash, 0, dt * 6);
    this.respawnFlash = Math.max(0, this.respawnFlash - dt);

    // Estado visual
    if (this.flight === 'bus') this.animState = 'idle';
    else if (this.flight === 'cayendo') this.animState = 'fall';
    else if (this.flight === 'planeando') this.animState = 'glide';
    else if (this.swimming) this.animState = 'swim';
    else if (!this.onGround) this.animState = this.vy < 0 ? 'jump' : 'fall';
    else if (this.crouching) this.animState = 'crouch';
    else if (Math.abs(this.vx) > 30) this.animState = this.running ? 'run' : 'walk';
    else this.animState = 'idle';
  }

  /** Porcentaje de energia [0..1] para el HUD. */
  get staminaRatio() {
    return this.stamina / CONFIG.player.staminaMax;
  }
}

/**
 * Multiplicadores de potenciador en su estado NEUTRO: sin ningun
 * potenciador cogido, todo se comporta como siempre.
 */
function nuevosBoosts() {
  return {
    damage: 1,      // multiplica el dano de sus balas
    speed: 1,       // multiplica lo que corre y lo que anda
    fireRate: 1,    // multiplica la cadencia de tiro
    lifesteal: 0,   // vida que devuelve cada baja
  };
}
