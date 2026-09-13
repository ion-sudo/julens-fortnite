/**
 * botAI.js
 * ---------------------------------------------------------------
 * LA IA DE LOS BOTS. Una maquina de estados sencilla y legible:
 *
 *   explorar -> camina hacia un punto del mapa buscando algo que hacer
 *   botin    -> va a por un arma o una cura que ha visto en el suelo
 *   combate  -> se coloca a la distancia que le gusta y dispara
 *   curarse  -> se para a usar una cura cuando esta tocado
 *
 * Para que sea un reto JUSTO y no un aimbot, cada disparo pasa por:
 *   - un tiempo de REACCION antes de empezar a disparar
 *   - un ERROR DE PUNTERIA que se va reduciendo mientras te ve
 *   - un multiplicador de dano global (CONFIG.bots.damageMult)
 *
 * La IA solo decide unas 8 veces por segundo (no en cada frame): con 50
 * bots eso ahorra mucho trabajo y ademas les da un punto "humano".
 */

import { CONFIG } from '../core/config.js';
import { muzzleDistance } from '../entities/weaponSprite.js';
import { snap, GRID, PIECES } from '../data/structures.js';
import { areAllies } from './teams.js';
import { playShotAt } from '../core/audio.js';

/** Cada cuanto piensa un bot (segundos). */
const THINK_INTERVAL = 0.12;

/**
 * Actualiza la IA de un bot.
 * @param {import('../entities/bot.js').Bot} bot
 * @param {number} dt
 * @param {object} ctx { world, enemies, loot, bullets, particles, supply,
 *   revive, player }
 */
export function updateBotAI(bot, dt, ctx) {
  const ai = bot.ai;
  const P = bot.personality;

  // ABATIDO: tirado en el suelo no decide nada. Se queda quieto
  // esperando a que un companero llegue a levantarlo.
  if (bot.downed) {
    pararse(bot);
    ai.state = 'abatido';
    return;
  }

  ai.fireCooldown = Math.max(0, ai.fireCooldown - dt);
  ai.jumpCooldown = Math.max(0, ai.jumpCooldown - dt);
  ai.detourTimer = Math.max(0, (ai.detourTimer || 0) - dt);

  // --- Decidir (unas 8 veces por segundo) ---
  ai.think -= dt;
  if (ai.think <= 0) {
    ai.think = THINK_INTERVAL;
    decide(bot, ctx);
  }

  // --- Actuar (cada frame) ---
  switch (ai.state) {
    case 'combate': actCombat(bot, dt, ctx); break;
    case 'curarse': actHeal(bot, dt); break;
    case 'botin':   actLoot(bot, dt, ctx); break;
    case 'suministros': actSupply(bot, dt, ctx); break;
    case 'reanimar': actRevive(bot, dt, ctx); break;
    case 'talar':   actChop(bot, dt, ctx); break;
    default:        actRoam(bot, dt, ctx);
  }

  // Si tiene una construccion cerrandole el paso, la parte a picotazos.
  breakBlockingStructure(bot, dt, ctx);

  // Y si le hace falta, construye: rampa para subir, pared para cubrirse.
  buildIfNeeded(bot, dt, ctx);

  detectStuck(bot, dt);
}

/* =============================================================
   1) DECIDIR EN QUE ESTADO ESTAR
   ============================================================= */
function decide(bot, ctx) {
  const ai = bot.ai;
  const P = bot.personality;

  // Si esta rodeando un obstaculo, se le deja terminar la maniobra.
  // (Sin esto, la regla de "ir al centro" le reescribia el destino cada
  // 0,12 s y el bot se quedaba empotrado contra un escalon para siempre.)
  if (ai.detourTimer > 0 && ai.state === 'explorar') return;

  // --- COMPROMISO CON UN COMPANERO QUE YA ESTA LEVANTANDO ---
  // Va ANTES QUE TODO lo demas, curarse incluido. Una reanimacion son
  // cuatro segundos seguidos, y basta con que el bot se distraiga una
  // vez —a curarse, a disparar, a coger un arma— para que la barra se
  // vacie y haya que empezar de cero. Sin esta regla se quedaban en la
  // mitad una y otra vez y no se levantaba NADIE en toda la partida.
  if (ai.state === 'reanimar' && ai.targetDown?.downed && ai.targetDown.alive) {
    if (ai.targetDown.reviveProgress > 0) return;
  }

  // --- Curarse tiene prioridad si esta tocado y tiene con que ---
  const vidaRatio = (bot.health + bot.shield) / (bot.maxHealth + bot.maxShield);
  if (bot.heals > 0 && bot.health / bot.maxHealth < P.healBelow && ai.state !== 'curarse') {
    // Solo si no tiene a nadie pegado encima
    const cerca = nearestEnemy(bot, ctx.enemies, 240);
    if (!cerca) {
      ai.state = 'curarse';
      ai.healTimer = CONFIG.bots.healTime;
      return;
    }
  }
  if (ai.state === 'curarse' && ai.healTimer > 0) return; // dejarle terminar

  // --- Dentro del agua: salir es lo primero ---
  // Los bots comparten la fisica del jugador, asi que nadan igual; lo
  // que no hacen es pelear desde el agua: buscan la orilla mas cercana.
  if (bot.swimming && bot.water) {
    const centroAgua = bot.water.centerX;
    const haciaFuera = bot.x + bot.w / 2 < centroAgua ? -1 : 1;
    ai.targetEnemy = null;
    ai.targetPickup = null;
    ai.state = 'explorar';
    ai.waypointX = clampX(
      haciaFuera < 0 ? bot.water.x - 90 : bot.water.x + bot.water.w + 90,
      ctx.world
    );
    ai.detourTimer = 0.6;
    return;
  }

  // --- Fuera de la zona segura: volver es lo primero ---
  const zona = ctx.zone;
  const cx = bot.x + bot.w / 2;
  if (zona && !zona.contains(cx)) {
    ai.targetPickup = null;
    ai.targetEnemy = null;
    ai.state = 'explorar';
    // Un poco hacia dentro, no justo al borde.
    ai.waypointX = cx < zona.minX ? zona.minX + 140 : zona.maxX - 140;
    ai.detourTimer = 0;
    return;
  }

  // --- ¿HAY UN COMPANERO EN EL SUELO? ---
  // Va lo primero despues de salvarse uno mismo: un companero abatido
  // se desangra, y si se muere te quedas solo contra un escuadron
  // entero. Levantarlo vale mas que cualquier tiroteo o botin.
  if (ctx.revive?.enabled) {
    const caido = ctx.revive.nearestDown(bot, ctx.enemies, REVIVE_SEEK);
    if (caido) {
      ai.targetDown = caido;
      ai.targetEnemy = null;
      ai.state = 'reanimar';
      return;
    }
    ai.targetDown = null;
  }

  // --- COMPROMISO CON UNA CAJA DE SUMINISTROS ---
  // Si ya iba a por una y no tiene a nadie encima, sigue. Sin esto
  // cualquier tiroteo a media pantalla le cancelaba el viaje y a la
  // caja no llegaba nadie: 2 bots de 74 en una partida entera.
  if (ai.state === 'suministros' && ai.targetSupply?.active) {
    if (!nearestEnemy(bot, ctx.enemies, SUPPLY_COMMIT_RANGE)) return;
  }

  // --- Fase inicial de saqueo: nadie dispara todavia ---
  const enPaz = ctx.matchTime < CONFIG.bots.graceTime;

  // --- ¿Hay un enemigo a la vista? ---
  // En la recta final se buscan activamente, asi que ven mucho mas lejos.
  const alcanceVista = ctx.aliveBots <= CONFIG.bots.closeInBelow
    ? P.viewRange * CONFIG.bots.endgameViewMult
    : P.viewRange;
  const enemigo = enPaz ? null : nearestEnemy(bot, ctx.enemies, alcanceVista);

  if (enemigo && hasLineOfSight(bot, enemigo, ctx.world)) {
    const distancia = Math.abs(enemigo.x - bot.x);

    // Con arma se pelea de lejos; sin arma, solo si lo tiene al lado
    // (va a por el a puñetazos, igual que el jugador con el pico).
    const puedePelear = bot.weapon || distancia < CONFIG.bots.meleeApproach;

    if (puedePelear) {
      if (ai.targetEnemy !== enemigo) {
        ai.targetEnemy = enemigo;
        ai.seenTime = 0;   // reinicia la punteria al cambiar de objetivo
      }
      ai.state = 'combate';
      return;
    }

    // Sin arma y con el enemigo lejos: busca un arma, no se queda quieto.
    ai.targetEnemy = null;
    const arma = nearestUsefulPickup(bot, ctx.loot);
    if (arma) {
      ai.targetPickup = arma;
      ai.state = 'botin';
      return;
    }
  }

  ai.targetEnemy = null;

  // --- ¿Hay un SUPPLY DROP al que merezca la pena ir? ---
  // Por delante de todo lo demas que no sea pelear: dentro hay mejor
  // arma que cualquier cosa tirada por el suelo, y que varios salgan
  // hacia la misma caja es justo lo que se busca. Tambien manda sobre
  // la regla de "al centro en la recta final": la caja ya los junta.
  const caja = nearestSupply(bot, ctx);
  if (caja) {
    ai.targetSupply = caja;
    ai.targetPickup = null;
    ai.state = 'suministros';
    return;
  }
  ai.targetSupply = null;

  // --- Recta final: buscarse las caras antes que seguir saqueando ---
  // Cuando quedan pocos, ir al centro manda sobre el botin. Sin esto los
  // ultimos supervivientes se pasaban la partida encadenando objetos por
  // los extremos del mapa y no se encontraban nunca.
  const recta = ctx.aliveBots <= CONFIG.bots.closeInBelow;
  const lejosDelCentro = Math.abs(bot.x - ctx.world.width / 2) > CONFIG.bots.closeInRadius;

  if (recta && lejosDelCentro) {
    ai.targetPickup = null;
    ai.state = 'explorar';
    ai.waypointX = pickWaypoint(bot, ctx);
    return;
  }

  // --- ¿Toca ir a por madera? ---
  // No todos los bots talan: cada uno lo decide una sola vez al nacer
  // (CONFIG.build.botChopChance), para que el bosque no se vacie.
  if (ai.chopper === undefined) ai.chopper = Math.random() < CONFIG.build.botChopChance;

  if (ai.state === 'talar' && ai.targetTree && !ai.targetTree.chopped && ai.chopTimer > 0) {
    return;   // esta a medio talar: dejarle terminar
  }

  if (ai.chopper && (bot.wood || 0) < CONFIG.build.botWoodTarget && ctx.harvest) {
    const arbol = ctx.harvest.nearestTreeByX(bot.x + bot.w / 2, 460);
    if (arbol) {
      ai.targetTree = arbol;
      ai.chopTimer = CONFIG.build.chopSeconds * 2.6;   // margen para llegar y talarlo
      ai.targetPickup = null;
      ai.state = 'talar';
      return;
    }
  }

  // --- ¿Merece la pena ir a por botin? ---
  const objeto = nearestUsefulPickup(bot, ctx.loot);
  if (objeto) {
    ai.targetPickup = objeto;
    ai.state = 'botin';
    return;
  }

  // --- Los ALIADOS del jugador se quedan cerca ---
  // Sin esto se repartian por el mapa como cualquier bot y tu escuadron
  // no existia: te dejaban solo a los treinta segundos.
  if (areAllies(bot, ctx.player) && ctx.player?.alive) {
    const lejos = Math.abs(bot.x - ctx.player.x) > ALLY_LEASH;
    if (lejos) {
      ai.targetPickup = null;
      ai.state = 'explorar';
      ai.waypointX = ctx.player.x + (Math.random() - 0.5) * 260;
      return;
    }
  }

  // --- Explorar ---
  // Tambien se recalcula el destino si se ha quedado pegado a un borde,
  // para que nadie acabe atrapado en la esquina del mapa.
  const enBorde = bot.x < 160 || bot.x > ctx.world.width - 160;
  if (ai.state !== 'explorar' || Math.abs(bot.x - ai.waypointX) < 70 || enBorde) {
    ai.state = 'explorar';
    ai.waypointX = pickWaypoint(bot, ctx);
  }
}

/* =============================================================
   2) COMPORTAMIENTOS
   ============================================================= */

/* =============================================================
   LOS BOTS TAMBIEN CONSTRUYEN
   ============================================================= */

/** Lo que espera un bot entre pieza y pieza. */
const BUILD_COOLDOWN = 1.1;

/**
 * Dos usos, los mismos que le da cualquiera que juegue:
 *
 *   RAMPA  cuando se queda trabado contra algo que no puede saltar. Es
 *          la forma natural de salir: antes se quedaban dando vueltas
 *          hasta que el antiatasco les daba media vuelta.
 *   PARED  cuando les estan disparando, para taparse. En 2D una pared
 *          entre tu y el que dispara corta la linea de tiro.
 */
function buildIfNeeded(bot, dt, ctx) {
  const ai = bot.ai;
  ai.buildCooldown = Math.max(0, (ai.buildCooldown || 0) - dt);

  const build = ctx.build;
  if (!build || ai.buildCooldown > 0) return;
  if (!bot.hasWood?.(PIECES.pared.cost)) return;

  if (ai.state === 'combate') {
    if (buildCover(bot, ctx, build)) ai.buildCooldown = BUILD_COOLDOWN;
    return;
  }

  if (buildRamp(bot, ctx, build)) ai.buildCooldown = BUILD_COOLDOWN;
}

/**
 * PARED para cubrirse: solo si le acaban de dar y el enemigo esta lejos
 * (de cerca, taparse no sirve de nada y encima te encierras).
 */
function buildCover(bot, ctx, build) {
  const enemigo = bot.ai.targetEnemy;
  if (!enemigo || bot.hurtFlash <= 0) return false;

  const bx = bot.x + bot.w / 2;
  const ex = enemigo.x + enemigo.w / 2;
  const dist = Math.abs(ex - bx);
  if (dist < 140 || dist > 700) return false;

  // La pared va justo delante, del lado del enemigo.
  const dir = ex > bx ? 1 : -1;
  const cellX = snap(bx + dir * 46);
  const cellY = snap(bot.y + bot.h - GRID + 1);

  return build.tryPlaceFor(bot, 'pared', cellX, cellY, dir) !== null;
}

/**
 * RAMPA para salir de un atasco: se pone delante, en el sentido en el
 * que estaba intentando avanzar.
 */
function buildRamp(bot, ctx, build) {
  const ai = bot.ai;

  // Solo si lleva un rato sin avanzar y de verdad quiere ir a algun sitio.
  if ((ai.stuckTimer || 0) < 0.9) return false;
  if (Math.abs(bot.x - ai.waypointX) < 120) return false;

  const dir = ai.waypointX > bot.x ? 1 : -1;
  const bx = bot.x + bot.w / 2;
  const cellX = snap(bx + dir * 30);
  const cellY = snap(bot.y + bot.h - GRID + 1);

  const puesta = build.tryPlaceFor(bot, 'rampa', cellX, cellY, dir);
  if (puesta) {
    // Ya no esta atascado: que vuelva a intentarlo por la rampa.
    ai.stuckTimer = 0;
    return true;
  }
  return false;
}

/** Pasear por el mapa. */
function actRoam(bot, dt, ctx) {
  const ai = bot.ai;
  moveTowards(bot, ai.waypointX, ctx, bot.personality.roamSpeed);
  bot.aimAngle = bot.facing > 0 ? 0 : Math.PI;
}

/** Ir a por un objeto del suelo y cogerlo al llegar. */
function actLoot(bot, dt, ctx) {
  const ai = bot.ai;
  const objetivo = ai.targetPickup;

  // Si alguien se lo ha llevado antes, a explorar
  if (!objetivo || objetivo.taken || !ctx.loot.pickups.includes(objetivo)) {
    ai.targetPickup = null;
    ai.state = 'explorar';
    return;
  }

  moveTowards(bot, objetivo.x, ctx, 1);
  bot.aimAngle = bot.facing > 0 ? 0 : Math.PI;

  // ¿Ya lo alcanza?
  const cx = bot.x + bot.w / 2;
  const cy = bot.y + bot.h / 2;
  if (Math.hypot(cx - objetivo.x, cy - (objetivo.y - 14)) < 46) {
    takePickup(bot, objetivo, ctx);
    ai.targetPickup = null;
    ai.state = 'explorar';
  }
}

/* =============================================================
   COMPANEROS: REANIMAR Y NO PERDERSE
   ============================================================= */

/**
 * Deja quieto a un bot A PROPOSITO.
 *
 * `axisX` es de SOLO LECTURA (sale de las dos teclas de direccion), asi
 * que pararlo es soltar las dos, no asignarle cero.
 *
 * Y ademas hay que reiniciarle el contador de atasco. El antiatascos
 * mira si el bot lleva rato sin avanzar, y quien esta reanimando a un
 * companero NO avanza: a los 2,8 segundos lo daba por atascado y lo
 * mandaba 500 px en direccion contraria, justo antes de terminar de
 * levantarlo. Estar quieto queriendo no es estar atascado.
 */
function pararse(bot) {
  bot.botInput.state.left = false;
  bot.botInput.state.right = false;
  bot.ai.stuckTimer = 0;
}

/** Hasta donde busca un bot a un companero abatido. */
const REVIVE_SEEK = 1600;
/** Lo lejos que deja un aliado que te vayas antes de volver contigo. */
const ALLY_LEASH = 1200;

/**
 * Ir hasta el companero caido y levantarlo.
 *
 * Mientras lo levanta el bot esta quieto y vendido, igual que el
 * jugador: reanimar en mitad de un tiroteo es jugarsela.
 */
function actRevive(bot, dt, ctx) {
  const ai = bot.ai;
  const caido = ai.targetDown;

  // Ya no vale: lo han levantado, se ha muerto, o no queda nada que hacer.
  if (!caido || !caido.downed || !caido.alive) {
    ai.targetDown = null;
    ai.state = 'explorar';
    return;
  }

  const objetivo = caido.x + caido.w / 2;

  // Se usa EL MISMO criterio que el jugador (ReviveManager.inRange), no
  // uno inventado aqui. Con un umbral propio de 40 px el bot se
  // plantaba a 72 —donde `moveTowards` da por bueno el destino— y se
  // quedaba mirando a su companero desangrarse sin llegar a tocarlo.
  const cerca = ctx.revive.inRange(bot, caido);

  if (!cerca) {
    moveTowards(bot, objetivo, ctx, 1);
    bot.aimAngle = bot.facing > 0 ? 0 : Math.PI;
    return;
  }

  // Al lado: se para y levanta.
  pararse(bot);
  ctx.revive.progress(caido, bot, dt);
}

/* =============================================================
   SUPPLY DROPS
   ============================================================= */

/** Hasta donde se molesta un bot en ir a por una caja de suministros. */
const SUPPLY_RANGE = 2600;
/**
 * Con un enemigo mas cerca que esto, se deja la caja y se pelea. Mas
 * lejos, se sigue andando hacia ella: media partida yendo al mismo
 * sitio es exactamente lo que hace interesante un supply drop.
 */
const SUPPLY_COMMIT_RANGE = 480;

/**
 * La caja de suministros mas cercana que siga sin abrirse.
 *
 * Cuenta tambien mientras esta CAYENDO: en Fortnite media partida sale
 * corriendo en cuanto ve el paracaidas, no cuando ya ha tocado suelo.
 */
function nearestSupply(bot, ctx) {
  const cajas = ctx.supply?.active;
  if (!cajas || cajas.length === 0) return null;

  const cx = bot.x + bot.w / 2;
  let mejor = null;
  let mejorD = SUPPLY_RANGE;

  for (const c of cajas) {
    const d = Math.abs(c.x - cx);
    if (d < mejorD) { mejorD = d; mejor = c; }
  }
  return mejor;
}

/**
 * Ir hasta la caja y abrirla en cuanto se pueda.
 *
 * Si mientras tanto la abre otro, se cancela y a otra cosa: quedarse
 * andando hacia una caja vacia seria tonto, y ademas ahi es justo donde
 * hay alguien al que disparar.
 */
function actSupply(bot, dt, ctx) {
  const ai = bot.ai;
  const caja = ai.targetSupply;

  if (!caja || !caja.active) {
    ai.targetSupply = null;
    ai.state = 'explorar';
    return;
  }

  moveTowards(bot, caja.x, ctx, 1);
  bot.aimAngle = bot.facing > 0 ? 0 : Math.PI;

  // Posada y al alcance: la abre.
  if (caja.canOpen && caja.isNear(bot)) {
    ctx.supply.openDrop(caja, bot);
    ai.targetSupply = null;
    ai.state = 'explorar';
  }
}

/**
 * Ir a un arbol y picarlo hasta tirarlo, igual que hace el jugador con
 * el pico: mismos golpes y misma madera (60).
 */
function actChop(bot, dt, ctx) {
  const ai = bot.ai;
  const arbol = ai.targetTree;

  ai.chopTimer -= dt;

  // Ya no vale: talado, no existe, o se ha quedado sin tiempo.
  if (!arbol || arbol.chopped || !ctx.harvest || ai.chopTimer <= 0) {
    ai.targetTree = null;
    ai.state = 'explorar';
    ai.waypointX = pickWaypoint(bot, ctx);
    return;
  }

  const cx = bot.x + bot.w / 2;
  const dx = arbol.x - cx;
  const cerca = Math.abs(dx) < CONFIG.build.chopRange * 0.8 &&
                Math.abs((bot.y + bot.h) - arbol.y) < 120;

  if (!cerca) {
    moveTowards(bot, arbol.x, ctx, 1);
    bot.aimAngle = bot.facing > 0 ? 0 : Math.PI;
    return;
  }

  // Ya lo tiene delante: quieto y a picar.
  bot.botInput.state.left = false;
  bot.botInput.state.right = false;
  bot.botInput.state.sprint = false;
  bot.facing = dx >= 0 ? 1 : -1;
  bot.aimAngle = bot.facing > 0 ? 0 : Math.PI;

  if (ai.fireCooldown > 0) return;
  ai.fireCooldown = 1 / CONFIG.combat.pickaxeRate;
  bot.action = 'swing';
  bot.actionTimer = 0.28;

  const madera = ctx.harvest.hit(arbol, bot);
  if (madera > 0) {
    ai.targetTree = null;
    ai.state = 'explorar';
    ai.waypointX = pickWaypoint(bot, ctx);
  }
}

/**
 * Romper una construccion que le tapa el camino.
 * Vale tanto para las que ha puesto el jugador como para las de otros
 * bots: cualquiera puede tirar abajo cualquier pieza.
 */
function breakBlockingStructure(bot, dt, ctx) {
  const ai = bot.ai;
  if (!ctx.build || ctx.build.structures.length === 0) return;
  if (ai.state === 'curarse' || ai.fireCooldown > 0) return;

  // Solo si de verdad quiere avanzar hacia ese lado.
  const dir = bot.botInput.state.right ? 1 : (bot.botInput.state.left ? -1 : 0);
  if (dir === 0) return;

  const x0 = dir > 0 ? bot.x + bot.w : bot.x - CONFIG.build.botBreakRange;
  const pieza = ctx.build.structureBlocking(
    x0, x0 + CONFIG.build.botBreakRange, bot.y - 6, bot.y + bot.h + 6
  );
  if (!pieza) return;

  ai.fireCooldown = 1 / CONFIG.combat.pickaxeRate;
  bot.action = 'swing';
  bot.actionTimer = 0.28;
  bot.facing = dir;

  const r = pieza.tightRect();
  pieza.takeDamage(CONFIG.combat.pickaxeDamage * CONFIG.combat.pickaxeVsBuild, bot);
  ctx.particles.spark(
    dir > 0 ? r.x : r.x + r.w,
    Math.max(r.y, Math.min(bot.y + bot.h * 0.5, r.y + r.h)),
    '#c8a06a', 6, 200
  );
}

/** Pelear: colocarse a su distancia preferida y disparar. */
function actCombat(bot, dt, ctx) {
  const ai = bot.ai;
  const P = bot.personality;
  const enemigo = ai.targetEnemy;

  if (!enemigo || enemigo.alive === false) {
    ai.state = 'explorar';
    return;
  }

  // Sin arma: pelea cuerpo a cuerpo (el equivalente al pico del jugador).
  if (!bot.weapon) {
    actMelee(bot, dt, ctx, enemigo);
    return;
  }

  ai.seenTime += dt;

  // --- Antiatasco de combate ---
  // Dos bots a distinta altura pueden tirotearse sin acertar nunca
  // (las balas chocan con el borde de sus plataformas) y quedarse asi
  // eternamente. Si en unos segundos nadie ha perdido vida, el bot deja
  // de guardar las distancias y se lanza a por el enemigo.
  if (ai.combatTarget !== enemigo) {
    ai.combatTarget = enemigo;
    ai.combatTime = 0;
    ai.combatRefHealth = enemigo.health + enemigo.shield;
  }
  ai.combatTime += dt;
  const haHechoDano = (enemigo.health + enemigo.shield) < ai.combatRefHealth - 1;
  if (haHechoDano) {
    ai.combatTime = 0;
    ai.combatRefHealth = enemigo.health + enemigo.shield;
  }
  const estancado = ai.combatTime > CONFIG.bots.stalemateTime;

  const bx = bot.x + bot.w / 2;
  const by = bot.handY;
  const ex = enemigo.x + enemigo.w / 2;
  const ey = enemigo.y + enemigo.h * 0.42;
  const dist = Math.hypot(ex - bx, ey - by);

  // --- Muy tocado: romper el contacto en vez de morir peleando ---
  const critico = bot.health / bot.maxHealth < 0.28;
  if (critico) {
    moveTowards(bot, bx + (bx - ex) * 3, ctx, 1, true);
    // Sigue disparando hacia atras, pero peor
    bot.aimAngle = Math.atan2(ey - by, ex - bx) + (Math.random() - 0.5) * 0.5;
    if (ai.fireCooldown <= 0 && bot.weapon && dist < P.engageRange) {
      ai.fireCooldown = 1 / bot.weapon.def.fireRate;
      shoot(bot, ctx);
    }
    return;
  }

  // --- Colocarse: acercarse si esta lejos, retroceder si esta encima ---
  // Si el tiroteo esta estancado, se olvida de la distancia comoda y va
  // directo, hasta poder pegarle de cerca.
  const quiere = estancado ? 40 : P.keepDistance;
  if (dist > quiere * 1.25) {
    moveTowards(bot, ex, ctx, 1, true);
  } else if (dist < quiere * 0.65) {
    moveTowards(bot, bx + (bx - ex), ctx, 1);
  } else {
    // A la distancia buena: quieto, pero mirando al enemigo
    bot.botInput.state.left = false;
    bot.botInput.state.right = false;
    bot.botInput.state.sprint = false;
    bot.facing = ex > bx ? 1 : -1;
  }

  // --- Apuntar con error decreciente ---
  const anguloReal = Math.atan2(ey - by, ex - bx);
  // Cuanto mas tiempo lleva viendote, mejor apunta (hasta un minimo).
  const afinado = Math.max(0.25, 1 - ai.seenTime * (P.aimTrack * 0.25));
  const error = P.aimError * afinado * CONFIG.bots.aimErrorMult;
  bot.aimAngle = anguloReal + (Math.random() - 0.5) * 2 * error;
  bot.facing = Math.cos(bot.aimAngle) >= 0 ? 1 : -1;

  // --- Disparar ---
  // Estancado demasiado tiempo: olvida a este enemigo y sigue a lo suyo.
  if (ai.combatTime > CONFIG.bots.stalemateTime * 3) {
    ai.targetEnemy = null;
    ai.combatTarget = null;
    ai.state = 'explorar';
    ai.waypointX = enemigo.x + (bot.x < enemigo.x ? -260 : 260);
    ai.detourTimer = 1.5;
    return;
  }

  const def = bot.weapon.def;
  if (ai.seenTime < P.reaction) return;                 // tiempo de reaccion
  if (dist > Math.min(def.range, P.engageRange)) return; // fuera de su alcance
  if (ai.fireCooldown > 0) return;

  ai.fireCooldown = 1 / def.fireRate;
  shoot(bot, ctx);
}

/**
 * Pelea sin arma: se echa encima del enemigo y golpea.
 * Sin esto, dos bots desarmados se ignoraban para siempre y la partida
 * no podia terminar nunca.
 */
function actMelee(bot, dt, ctx, enemigo) {
  const ai = bot.ai;
  const bx = bot.x + bot.w / 2;
  const ex = enemigo.x + enemigo.w / 2;
  const dist = Math.hypot(ex - bx, enemigo.y - bot.y);

  moveTowards(bot, ex, ctx, 1, true);
  bot.aimAngle = Math.atan2(
    (enemigo.y + enemigo.h * 0.5) - bot.handY,
    ex - bot.handX
  );
  bot.facing = ex > bx ? 1 : -1;

  if (dist > CONFIG.combat.pickaxeRange) return;
  if (ai.fireCooldown > 0) return;

  ai.fireCooldown = 1 / CONFIG.combat.pickaxeRate;
  bot.action = 'swing';
  bot.actionTimer = 0.28;

  const dano = Math.max(1, Math.round(CONFIG.combat.pickaxeDamage * CONFIG.bots.damageMult));
  enemigo.takeDamage(dano, ex, enemigo.y + enemigo.h * 0.4, bot);
  ctx.particles.spark(ex, enemigo.y + enemigo.h * 0.4, '#ffd27f', 6, 190);
}

/** Pararse a usar una cura. */
function actHeal(bot, dt) {
  bot.botInput.state.left = false;
  bot.botInput.state.right = false;
  bot.botInput.state.sprint = false;

  // Si le han disparado mientras se curaba, lo deja y sale corriendo.
  if (bot.hurtFlash > 0) {
    bot.ai.healTimer = 0;
    bot.ai.state = 'explorar';
    return;
  }

  bot.ai.healTimer -= dt;
  if (bot.ai.healTimer > 0) return;

  // Cura sencilla: los bots no manejan los 10 tipos, solo "una cura".
  bot.heals--;
  bot.health = Math.min(bot.maxHealth, bot.health + CONFIG.bots.healAmount);
  bot.ai.state = 'explorar';
}

/* =============================================================
   3) MOVIMIENTO
   ============================================================= */

/**
 * Camina hacia una X del mundo, saltando huecos y obstaculos.
 * @param {boolean} allowSprint si puede correr para acortar distancias
 */
function moveTowards(bot, targetX, ctx, speedFactor = 1, allowSprint = false) {
  const input = bot.botInput;
  const cx = bot.x + bot.w / 2;
  const dx = targetX - cx;

  if (Math.abs(dx) < 16) {
    input.state.left = false;
    input.state.right = false;
    return;
  }

  const derecha = dx > 0;
  input.state.right = derecha;
  input.state.left = !derecha;

  // Correr solo si le toca por personalidad y hay distancia que cubrir
  input.state.sprint =
    allowSprint && Math.abs(dx) > 260 && Math.random() < bot.personality.sprintChance;

  // Los mas pausados andan un poco menos
  if (speedFactor < 1 && Math.random() > speedFactor) {
    input.state.left = false;
    input.state.right = false;
  }

  // --- Saltar: si hay pared delante o se acaba el suelo ---
  if (bot.onGround && bot.ai.jumpCooldown <= 0) {
    const dir = derecha ? 1 : -1;
    const hueco = gapAhead(bot, dir, ctx.world);
    const muro = wallAhead(bot, dir, ctx.world);
    if (muro || hueco) {
      // Tanto los canales entre islas como los escalones se superan
      // mucho mejor llegando con velocidad.
      input.state.sprint = true;
      input.requestJump();
      bot.ai.jumpCooldown = 0.35;
    }
  } else if (!bot.onGround && bot.vy > 0) {
    // Soltar el salto al empezar a caer (salto variable)
    input.releaseJump();
  }
}

/**
 * ¿Hay un muro solido delante, a la altura del cuerpo?
 *
 * La sonda va ADELANTADA unos 26 px a proposito: si el bot espera a
 * tocar la pared, salta pegado a ella, sube sin velocidad horizontal y
 * vuelve a caer al mismo sitio. Detectandolo antes salta con carrerilla
 * y sube el escalon a la primera.
 */
const WALL_LOOKAHEAD = 26;

function wallAhead(bot, dir, world) {
  const sonda = {
    x: bot.x + (dir > 0 ? bot.w : -WALL_LOOKAHEAD - 14),
    y: bot.y + 8,
    w: WALL_LOOKAHEAD + 14,
    h: bot.h - 16,
  };
  return world.getPlatformsNear(sonda, 2).some(
    (p) => !p.oneWay &&
      sonda.x < p.x + p.w && sonda.x + sonda.w > p.x &&
      sonda.y < p.y + p.h && sonda.y + sonda.h > p.y
  );
}

/**
 * ¿Se acaba el suelo un poco mas adelante?
 * La sonda mira bastante por delante (unos 60 px) para que le de tiempo
 * a coger carrerilla y cruzar los canales entre islas.
 */
function gapAhead(bot, dir, world) {
  const sonda = {
    x: bot.x + (dir > 0 ? bot.w + 10 : -70),
    y: bot.y + bot.h + 2,
    w: 60,
    h: 30,
  };
  const haySuelo = world.getPlatformsNear(sonda, 2).some(
    (p) => sonda.x < p.x + p.w && sonda.x + sonda.w > p.x &&
      sonda.y < p.y + p.h && sonda.y + sonda.h > p.y
  );
  return !haySuelo;
}

/**
 * Si lleva mucho rato sin avanzar, da media vuelta.
 *
 * OJO: hay estados en los que el bot esta quieto A PROPOSITO (curandose
 * o aguantando la distancia en un tiroteo). Si no se excluyen, esta
 * funcion los saca de ese estado cada 1,4 s y, como curarse tarda mas,
 * no terminaban de curarse NUNCA.
 */
function detectStuck(bot, dt) {
  const ai = bot.ai;

  if (ai.state === 'curarse' || ai.state === 'combate' || ai.state === 'talar') {
    ai.stuckTimer = 0;
    ai.lastX = bot.x;
    return;
  }

  if (Math.abs(bot.x - ai.lastX) < 6) {
    ai.stuckTimer += dt;

    // Primer aviso: saltar, que casi siempre basta (escalon o borde).
    if (ai.stuckTimer > 0.7 && bot.onGround && ai.jumpCooldown <= 0) {
      bot.botInput.requestJump();
      ai.jumpCooldown = 0.4;
    }

    // Sigue sin avanzar: da media vuelta y se protege la maniobra.
    if (ai.stuckTimer > 2.8) {
      ai.stuckTimer = 0;
      ai.waypointX = clampX(bot.x - Math.sign(bot.facing) * 500, bot.world);
      ai.state = 'explorar';
      ai.targetPickup = null;
      ai.detourTimer = 2.2;
      if (bot.onGround) bot.botInput.requestJump();
    }
  } else {
    ai.stuckTimer = 0;
    ai.lastX = bot.x;
  }
}

/* =============================================================
   4) DISPARO
   ============================================================= */

function shoot(bot, ctx) {
  const weapon = bot.weapon;
  const def = weapon.def;

  const dist = muzzleDistance(weapon);
  const mx = bot.handX + Math.cos(bot.aimAngle) * dist;
  const my = bot.handY + Math.sin(bot.aimAngle) * dist;

  for (let i = 0; i < def.pellets; i++) {
    const t = def.pellets > 1 ? (i / (def.pellets - 1)) - 0.5 : 0;
    const desvio = def.pellets > 1
      ? t * def.spread * 2
      : (Math.random() - 0.5) * def.spread;

    ctx.bullets.spawn({
      x: mx,
      y: my,
      angle: bot.aimAngle + desvio,
      speed: def.speed,
      // Los bots pegan algo menos que el jugador para que sea justo.
      damage: Math.max(1, Math.round(weapon.damage * CONFIG.bots.damageMult)),
      range: def.range,
      pierce: def.pierce,
      rarity: weapon.rarity,
      kind: def.kind === 'beam' ? 'rayo' : 'bala',
      owner: bot,
    });
  }

  ctx.particles.muzzleFlash(mx, my, bot.aimAngle, '#ffd27f', def.pellets > 1 ? 1.2 : 0.9);
  playShotAt(def.kind, mx, my);
  bot.action = 'shoot';
  bot.actionTimer = 0.12;
}

/* =============================================================
   5) PERCEPCION
   ============================================================= */

/** El enemigo vivo mas cercano dentro de un radio. */
function nearestEnemy(bot, enemies, range) {
  let mejor = null;
  let mejorD = range;

  const bx = bot.x + bot.w / 2;
  const by = bot.y + bot.h / 2;

  for (const e of enemies) {
    if (e === bot || e.alive === false) continue;
    // Ni companeros de equipo (en individual esto nunca se cumple)...
    if (areAllies(bot, e)) continue;
    // ...ni gente ya abatida: rematar a uno tirado en el suelo mientras
    // sus companeros te disparan es la peor decision posible.
    if (e.downed) continue;
    const d = Math.hypot(e.x + e.w / 2 - bx, e.y + e.h / 2 - by);
    if (d < mejorD) { mejorD = d; mejor = e; }
  }
  return mejor;
}

/**
 * ¿Hay linea de tiro? Se muestrean unos puntos entre los dos y se mira
 * si alguno cae dentro de una plataforma solida. Barato y suficiente.
 *
 * Exportada: tambien la usa el disparo automatico de los controles
 * tactiles, para no disparar a alguien que esta detras de una pared.
 */
export function hasLineOfSight(a, b, world) {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h * 0.4;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h * 0.4;

  const PASOS = 7;
  for (let i = 1; i < PASOS; i++) {
    const t = i / PASOS;
    const px = ax + (bx - ax) * t;
    const py = ay + (by - ay) * t;

    const punto = { x: px - 1, y: py - 1, w: 2, h: 2 };
    const bloqueado = world.getPlatformsNear(punto, 2).some(
      (p) => !p.oneWay && px > p.x && px < p.x + p.w && py > p.y && py < p.y + p.h
    );
    if (bloqueado) return false;
  }
  return true;
}

/** El objeto del suelo mas cercano que al bot le sirva de algo. */
function nearestUsefulPickup(bot, loot) {
  // Un bot desarmado busca arma mucho mas lejos: es su prioridad.
  const RADIO = bot.weapon ? CONFIG.bots.lootRange : CONFIG.bots.lootRange * 3.5;
  const bx = bot.x + bot.w / 2;
  const by = bot.y + bot.h / 2;

  let mejor = null;
  let mejorD = RADIO;

  for (const p of loot.pickups) {
    if (p.taken) continue;

    // Los bots no llevan la cuenta de balas, asi que las cajas de
    // municion las dejan para el jugador.
    if (p.item.kind === 'ammo') continue;

    // Ni granadas ni torretas/trampas: un bot no sabe usarlas todavia, y
    // sin esto se las guardaba como si fueran curas (todo lo que no es
    // arma cuenta como cura mas abajo) y se "bebia" una granada.
    if (p.item.kind === 'throwable' || p.item.kind === 'gadget') continue;

    // ¿Le interesa?
    const esArma = p.item.kind === 'weapon';
    if (esArma) {
      // Los aparatos que no disparan (la Grieta Portatil) no son un arma
      // para un bot: la cogeria por no tener nada, se creeria armado y
      // se plantaria delante del enemigo disparando aire.
      if (p.item.def.effect) continue;
      // Sin arma le vale cualquiera; con arma, solo si pega mas.
      if (bot.weapon && p.item.damage <= bot.weapon.damage) continue;
    } else {
      if (bot.heals >= CONFIG.bots.maxHeals) continue;
    }

    const d = Math.hypot(p.x - bx, p.y - by);
    if (d < mejorD) { mejorD = d; mejor = p; }
  }
  return mejor;
}

/** El bot coge un objeto del suelo. */
function takePickup(bot, pickup, ctx) {
  const idx = ctx.loot.pickups.indexOf(pickup);
  if (idx === -1) return;

  ctx.loot.pickups.splice(idx, 1);
  pickup.taken = true;

  if (pickup.item.kind === 'weapon') {
    // Si ya tenia arma, tira la vieja al suelo (asi el botin circula).
    if (bot.weapon) dropWeapon(bot, ctx);
    bot.weapon = pickup.item;
  } else {
    bot.heals = Math.min(CONFIG.bots.maxHeals, bot.heals + (pickup.item.count || 1));
  }
}

/** Deja el arma actual en el suelo. */
function dropWeapon(bot, ctx) {
  if (!bot.weapon) return;
  ctx.loot.dropItemAt(bot.weapon, bot.x + bot.w / 2, bot.y + bot.h - 20);
  bot.weapon = null;
}

/**
 * Un punto del mapa al que ir a pasear.
 *
 * Con el tiempo los bots tienden al CENTRO y la zona por la que se
 * mueven se va estrechando, de modo que los ultimos supervivientes
 * acaban encontrandose y la partida termina. Es un sustituto sencillo
 * de la tormenta: cuando exista el circulo que se cierra de verdad,
 * esta funcion se reemplaza por "ir hacia la zona segura".
 */
function pickWaypoint(bot, ctx) {
  const world = ctx.world;
  const zona = ctx.zone;

  // Si la zona ya se esta cerrando, se pasea DENTRO de ella.
  if (zona && zona.progress > 0) {
    const margen = Math.max(80, zona.width * 0.35);
    return clamp(zona.centerX + (Math.random() - 0.5) * 2 * margen, zona.minX + 60, zona.maxX - 60);
  }

  const centro = world.width / 2;

  // 0 al empezar, 1 cuando la partida ya lleva rato.
  const t = Math.min(1, ctx.matchTime / CONFIG.bots.centerBiasTime);

  // Cuando quedan pocos, todos van al centro si o si.
  const pocos = ctx.aliveBots <= CONFIG.bots.closeInBelow;
  const sesgo = pocos ? 1 : Math.min(0.8, t);

  if (pocos) {
    // Recta final: todos al MISMO punto, con un margen minimo. Asi los
    // ultimos supervivientes acaban a menos de 120 px y se ven seguro.
    return clampX(centro + (Math.random() - 0.5) * 120, world);
  }

  if (Math.random() < sesgo) {
    // El area util se encoge de +-1600 px a +-240 px.
    const radio = 1600 * (1 - t) + 240 * t;
    return clampX(centro + (Math.random() - 0.5) * 2 * radio, world);
  }
  return clampX(bot.x + (Math.random() - 0.5) * 2000, world);
}

function clampX(x, world) {
  return Math.max(80, Math.min(world.width - 80, x));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
