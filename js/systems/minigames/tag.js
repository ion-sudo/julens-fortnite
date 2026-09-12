/**
 * tag.js
 * ---------------------------------------------------------------
 * MINIJUEGO: PILLA-PILLA.
 *
 * Once participantes: tu y diez bots. Uno empieza siendo EL CONTADOR
 * (puedes tocarte a ti), y quien es pillado se convierte en contador
 * tambien: la cosa va creciendo como una bola de nieve.
 *
 * Dos fases:
 *   ESCONDERSE   30 s   los contadores no ven ni pillan; los demas corren
 *   PILLAR      150 s   a por ellos
 *
 * Al final: si queda alguien libre, ganan los escondidos; si caen todos,
 * ganan los contadores.
 *
 * El record depende del papel que te toque, asi que se guardan dos por
 * separado ('pilla:escondido' y 'pilla:contador'): aguantar sin que te
 * pillen y cuantos pillas no se pueden comparar.
 *
 * Los bots son los de siempre, pero con la decision FORZADA: los
 * contadores van a por el escondido mas cercano y los escondidos huyen
 * del contador mas cercano. Con la IA normal se pondrian a saquear, y
 * aqui no hay nada que saquear.
 */

import { Minigame } from './base.js';
import { Bot, rollPersonality } from '../../entities/bot.js';
import { SKINS } from '../../data/cosmetics.js';
import { generateBotNames } from '../../data/botNames.js';
import { roundRectPath } from '../../core/utils.js';

/** Cuantos bots acompanan al jugador. */
const BOTS = 10;
/** Lo que dura cada fase. */
const ESCONDERSE = 30;
const PILLAR = 150;
/** A que distancia te pillan. */
const ALCANCE = 36;
/** Instantes de gracia al ser pillado, para no encadenar contagios. */
const GRACIA = 1.5;
/**
 * Ancho del campo.
 * Es un equilibrio medido a base de probar: con 1800 px (un tramo llano)
 * once participantes se pisan y la caceria se acaba en quince segundos;
 * con 5000, el contador no alcanza a nadie y no cae ni uno en los 2:30.
 */
const ANCHO_CAMPO = 2800;

export class Tag extends Minigame {
  constructor(game) {
    super(game, 'pilla');

    this.systems = {
      worldLoot: false, chests: false, buildings: false, targets: false, fish: false,
      vehicles: false, mobility: false,
    };
    this.arena = { bots: BOTS };

    this.timeLimit = ESCONDERSE + PILLAR;

    /** 'esconderse' | 'pillar' */
    this.fase = 'esconderse';
    /** ¿Eres tu el contador? */
    this.soyContador = false;
    /** Segundos que aguantaste libre (si empezaste escondido). */
    this.aguantado = 0;
    /** A cuantos has pillado tu. */
    this.pillados = 0;
    /** Aviso grande en pantalla. */
    this.aviso = '';
    this.avisoVida = 0;
  }

  /** Segundos que quedan de la fase actual. */
  get faseRestante() {
    return this.fase === 'esconderse'
      ? Math.max(0, ESCONDERSE - this.time)
      : Math.max(0, this.timeLimit - this.time);
  }

  setup() {
    const campo = this.bestField(500);
    const isla = campo.isla;
    const run = campo.run;

    // --- El campo es ANCHO a proposito ---
    // Con los ~1800 px de un tramo llano, once participantes se pisan y
    // la caceria se acababa en quince segundos. Se juega en una franja
    // de 5000 px alrededor: el terreno de por medio da igual, porque los
    // bots saben saltar escalones y cruzar huecos.
    const centro = run.x + run.w / 2;
    const ancho = Math.min(ANCHO_CAMPO, this.world.width - 400);
    const x = Math.max(200, Math.min(centro - ancho / 2, this.world.width - 200 - ancho));

    this.campo = { x, w: ancho, y: isla.y, casa: { x: run.x, w: run.w } };

    // Sin armas: esto va de correr (y de construir, si sabes).
    this.game.inventory.select(0);
    this.player.wood = 300;

    // --- Los diez bots, repartidos por el campo ---
    const nombres = generateBotNames(BOTS + 4);
    this.game.match.bots.length = 0;

    for (let i = 0; i < BOTS; i++) {
      const t = (i + 0.5) / BOTS;
      const bx = this.campo.x + 80 + (this.campo.w - 160) * t;
      const bot = new Bot(this.world, {
        id: `pilla${i}`,
        name: nombres[i],
        x: bx,
        y: (this.groundAt(bx, 300) ?? isla.y) - 60,
        skin: SKINS[(i * 3 + 1) % SKINS.length],
        personality: rollPersonality(),
      });
      bot.weapon = null;
      bot.heals = 0;
      bot.flight = null;
      bot.contador = false;
      bot.gracia = 0;
      this.game.match.bots.push(bot);
    }

    this.placePlayer(centro, isla.y);
    this.player.contador = false;
    this.player.gracia = 0;

    // --- ¿A quien le toca contar? ---
    // Puedes ser tu: es parte de la gracia.
    const todos = [this.player, ...this.game.match.bots];
    const elegido = todos[Math.floor(Math.random() * todos.length)];
    this._hacerContador(elegido, true);
    this.soyContador = elegido === this.player;

    // El record es distinto segun el papel que te haya tocado.
    this.id = this.soyContador ? 'pilla:contador' : 'pilla:escondido';

    this._avisar(this.soyContador
      ? '¡TE TOCA CONTAR! Espera 30 s'
      : '¡CORRE A ESCONDERTE! 30 s');

    this.game.showMessage(
      this.soyContador
        ? 'Cuentas tu: espera a que se escondan'
        : 'Escondete: en 30 segundos empiezan a buscarte',
      'legendary'
    );
  }

  /** Marca a alguien como contador. */
  _hacerContador(quien, inicial = false) {
    quien.contador = true;
    quien.gracia = inicial ? 0 : GRACIA;

    if (!inicial) {
      this.particles.puff(quien.x + quien.w / 2, quien.y + quien.h / 2,
        'rgba(255, 138, 61, 0.7)', 10);
    }
  }

  /** Todos los que van pillando. */
  get contadores() {
    const out = this.game.match.bots.filter((b) => b.alive && b.contador);
    if (this.player.contador) out.push(this.player);
    return out;
  }

  /** Los que aun estan libres. */
  get libres() {
    const out = this.game.match.bots.filter((b) => b.alive && !b.contador);
    if (!this.player.contador) out.push(this.player);
    return out;
  }

  /* =============================================================
     PARTIDA
     ============================================================= */

  step(dt) {
    this.avisoVida = Math.max(0, this.avisoVida - dt);

    // --- Cambio de fase ---
    if (this.fase === 'esconderse' && this.time >= ESCONDERSE) {
      this.fase = 'pillar';
      this._avisar(this.player.contador ? '¡A POR ELLOS!' : '¡YA VIENEN!');
      this.game.showMessage('¡Empieza la caza!', 'legendary');
    }

    const buscando = this.fase === 'pillar';
    const p = this.player;
    p.health = p.maxHealth;      // aqui no se pelea
    p.gracia = Math.max(0, p.gracia - dt);

    // --- Que hace cada bot ---
    for (const bot of this.game.match.bots) {
      if (!bot.alive) continue;
      bot.health = bot.maxHealth;
      bot.gracia = Math.max(0, bot.gracia - dt);
      this._pilotar(bot, buscando);
    }

    if (!buscando) return;

    // --- Pillar ---
    for (const c of this.contadores) {
      if (c.gracia > 0) continue;

      for (const l of this.libres) {
        if (l.gracia > 0) continue;
        const d = Math.hypot(
          (c.x + c.w / 2) - (l.x + l.w / 2),
          (c.y + c.h / 2) - (l.y + l.h / 2)
        );
        if (d > ALCANCE) continue;

        this._pillar(c, l);
        break;
      }
    }

    // --- ¿Se acabo? ---
    if (this.libres.length === 0) this._terminar(true);
  }

  /** Alguien ha sido pillado: pasa a contar el tambien. */
  _pillar(contador, victima) {
    this._hacerContador(victima);

    if (contador === this.player) {
      this.pillados++;
      this.game.showMessage(`¡Has pillado a ${victima.name}!`, 'legendary');
    } else if (victima === this.player) {
      this.aguantado = Math.round((this.time - ESCONDERSE) * 10) / 10;
      this._avisar(`¡TE PILLO ${contador.name.toUpperCase()}!`);
      this.game.showMessage(`Te pillo ${contador.name}. Ahora cuentas tu`, true);
    } else {
      this.game.showMessage(`${contador.name} pillo a ${victima.name}`, null);
    }
  }

  /**
   * La IA del pilla-pilla, forzada cada frame.
   *   contador  -> va a por el libre mas cercano
   *   libre     -> huye del contador mas cercano
   * Durante la fase de esconderse, los contadores se quedan quietos.
   */
  _pilotar(bot, buscando) {
    const ai = bot.ai;

    if (bot.contador) {
      if (!buscando) {
        // Quietos: estan "contando".
        bot.botInput.state.left = false;
        bot.botInput.state.right = false;
        bot.botInput.state.sprint = false;
        ai.state = 'explorar';
        ai.waypointX = bot.x;
        return;
      }

      const presa = this._masCercano(bot, this.libres);
      if (presa) {
        ai.state = 'combate';
        ai.targetEnemy = presa;
        ai.think = 0.3;
      }
      return;
    }

    // --- Libre: huir ---
    const amenaza = this._masCercano(bot, this.contadores);
    ai.state = 'explorar';
    ai.targetEnemy = null;
    ai.think = 0.3;

    if (!amenaza || !buscando) {
      // Sin nadie cerca (o todavia escondiendose): buscar un rincon.
      if (Math.abs(bot.x - ai.waypointX) < 90) {
        ai.waypointX = this.campo.x + 40 + Math.random() * (this.campo.w - 80);
      }
      return;
    }

    // --- Con alguien detras: al punto mas lejano que se pueda ---
    const izq = this.campo.x + 40;
    const der = this.campo.x + this.campo.w - 40;
    const haciaDerecha = bot.x > amenaza.x;

    ai.waypointX = haciaDerecha ? der : izq;
    ai.detourTimer = 0.5;
    bot.botInput.state.sprint = true;

    // ¿Acorralado contra el borde? Entonces hay que ESCAPAR POR ENCIMA:
    // se salta y se cambia de lado. Sin esto, los libres corrian hasta
    // la pared y se quedaban ahi esperando a que los pillaran, y la
    // caceria se acababa en medio minuto.
    const contraElBorde = Math.abs(bot.x - ai.waypointX) < 90;
    const dist = Math.abs(bot.x - amenaza.x);

    if (contraElBorde && dist < 220) {
      ai.waypointX = haciaDerecha ? izq : der;   // por el otro lado
      if (bot.onGround && ai.jumpCooldown <= 0) {
        bot.botInput.requestJump();
        ai.jumpCooldown = 0.5;
      }
    }
  }

  _masCercano(quien, lista) {
    let mejor = null;
    let mejorD = Infinity;
    for (const o of lista) {
      if (o === quien) continue;
      const d = Math.abs((o.x + o.w / 2) - (quien.x + quien.w / 2));
      if (d < mejorD) { mejorD = d; mejor = o; }
    }
    return mejor;
  }

  onTimeUp() {
    this._terminar(false);
  }

  /**
   * @param {boolean} pilladosTodos  si han caido todos antes de tiempo
   */
  _terminar(pilladosTodos) {
    if (this.soyContador) {
      // Empezaste contando: cuenta a cuantos pillaste.
      const n = this.pillados;
      this.finish(n, pilladosTodos
        ? `¡Caceria completa! Pillaste a ${n}`
        : (n === 0 ? 'No pillaste a nadie' : `Pillaste a ${n}`));
      return;
    }

    // Empezaste escondido: cuenta lo que aguantaste libre.
    const libre = !this.player.contador;
    const t = libre ? Math.round(PILLAR * 10) / 10 : this.aguantado;
    this.finish(t, libre
      ? '¡Aguantaste hasta el final!'
      : `Te pillaron a los ${t} s`);
  }

  _avisar(texto) {
    this.aviso = texto;
    this.avisoVida = 2.6;
  }

  /* =============================================================
     DIBUJO
     ============================================================= */

  draw(ctx, camera, time) {
    // Corona naranja sobre los que van pillando, para verlos de lejos.
    for (const c of this.contadores) {
      if (c === this.player) continue;
      if (!camera.isVisible(c.x - 30, c.y - 60, c.w + 60, c.h + 60)) continue;

      const y = c.y - 26 + Math.sin(time * 4 + c.x) * 3;
      ctx.save();
      ctx.fillStyle = '#ff8a3d';
      ctx.beginPath();
      ctx.moveTo(c.x + c.w / 2 - 11, y + 9);
      ctx.lineTo(c.x + c.w / 2 - 11, y - 1);
      ctx.lineTo(c.x + c.w / 2 - 5, y + 4);
      ctx.lineTo(c.x + c.w / 2, y - 4);
      ctx.lineTo(c.x + c.w / 2 + 5, y + 4);
      ctx.lineTo(c.x + c.w / 2 + 11, y - 1);
      ctx.lineTo(c.x + c.w / 2 + 11, y + 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawHud(ctx, view, time) {
    const restante = this.faseRestante;
    const escondiendose = this.fase === 'esconderse';
    const apurado = restante <= 10;

    ctx.save();
    ctx.textAlign = 'center';

    const ancho = 300;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.86)';
    roundRectPath(ctx, view.width / 2 - ancho / 2, 90, ancho, 72, 12);
    ctx.fill();
    ctx.strokeStyle = this.player.contador ? '#ff8a3d' : 'rgba(126, 224, 106, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fase y reloj
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.fillStyle = escondiendose ? '#7ee06a' : '#ff8a3d';
    ctx.fillText(escondiendose ? 'ESCONDEOS' : 'A PILLAR', view.width / 2, 108);

    ctx.font = 'bold 28px "Trebuchet MS", sans-serif';
    ctx.fillStyle = apurado ? '#ff8a7a' : '#ffffff';
    ctx.fillText(this._reloj(restante), view.width / 2 - 88, 138);

    // Tu papel
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.fillStyle = this.player.contador ? '#ff8a3d' : '#7ee06a';
    ctx.fillText(this.player.contador ? 'PILLAS' : 'LIBRE', view.width / 2, 140);

    // Cuantos quedan libres
    ctx.font = 'bold 28px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#7ee06a';
    ctx.fillText(String(this.libres.length), view.width / 2 + 88, 138);
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('LIBRES', view.width / 2 + 88, 154);

    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(this.player.contador ? `HAS PILLADO ${this.pillados}` : 'HUYE', view.width / 2 - 88, 154);

    // Aviso grande de cambio de fase
    if (this.avisoVida > 0) {
      ctx.globalAlpha = Math.min(1, this.avisoVida / 0.6);
      ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
      ctx.fillStyle = this.player.contador ? '#ff8a3d' : '#7ee06a';
      ctx.fillText(this.aviso, view.width / 2, view.height / 2 - 70);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /** mm:ss */
  _reloj(seg) {
    const m = Math.floor(seg / 60);
    const s = Math.floor(seg % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
