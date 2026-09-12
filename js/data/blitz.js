/**
 * blitz.js
 * ---------------------------------------------------------------
 * DATOS DEL MODO JULEN BLITZ: el nivel Blitz, los potenciadores
 * ("bendiciones") y los cofres dorados.
 *
 * En el Blitz no se saquea para mejorar: se MATA para mejorar. Cada
 * baja y cada segundo aguantando dentro de la tormenta dan XP de nivel
 * Blitz, y cada nivel te regala un arma mejor y un potenciador. Por eso
 * una partida que empieza con todos iguales acaba con supervivientes
 * que pegan el doble y corren mas.
 *
 * Todo esto es SOLO de este modo: el nivel Blitz se reinicia cada
 * partida y no tiene nada que ver con el nivel de cuenta ni con el
 * pase de batalla, que siguen subiendo aparte.
 */

/* =============================================================
   NIVEL BLITZ
   ============================================================= */

/** Niveles que se pueden alcanzar (el 1 es con el que empiezas). */
export const BLITZ_MAX_LEVEL = 8;

/**
 * XP ACUMULADA para estar en cada nivel. El indice es el nivel - 1.
 *
 * Los saltos crecen despacio a proposito: en una partida de tres
 * minutos hay que poder llegar al 5 o al 6 jugando bien, pero el 8 se
 * reserva para quien de verdad esta arrasando.
 */
export const BLITZ_XP_LEVELS = [0, 110, 260, 450, 690, 990, 1350, 1780];

/** XP por eliminar a alguien. */
export const BLITZ_XP_KILL = 110;
/** XP por cada segundo vivo mientras la tormenta ya se esta cerrando. */
export const BLITZ_XP_PER_SECOND = 7;
/** XP extra cada vez que la tormenta termina de cerrar una fase. */
export const BLITZ_XP_SURVIVE_STEP = 90;

/**
 * MUNICION de salida. Generosa: en un modo de tres minutos, quedarse
 * sin balas a mitad de partida no es una decision tactica, es perder
 * el tiempo buscando cajas.
 */
export const BLITZ_START_AMMO = 160;

/**
 * Rareza del arma que regala cada nivel. El indice es el nivel - 1, y
 * el nivel 1 no regala nada porque es con el que se empieza.
 */
export const BLITZ_LEVEL_RARITY = [
  null,          // 1 - el arma comun de salida
  'rare',        // 2
  'rare',        // 3
  'epic',        // 4
  'epic',        // 5
  'legendary',   // 6
  'mythic',      // 7
  'exotic',      // 8 - EXOTICA: no se consigue de ninguna otra forma
];

/* =============================================================
   ARMAS EXOTICAS
   ============================================================= */

/**
 * Las EXOTICAS son el techo del juego: pegan un 145% mas que un arma
 * comun, mas incluso que una mitica, y NO se pueden sortear (ver
 * data/rarities.js). Solo hay dos formas de tener una, las dos aqui:
 *
 *   1. llegar al NIVEL BLITZ 8, el ultimo
 *   2. tener suerte en un COFRE DORADO
 *
 * Lo del nivel 8 es duro de verdad: son 1780 XP, y en las partidas de
 * prueba el jugador se quedaba en el 5 o el 6. Hay que encadenar bajas
 * Y aguantar hasta el final, no vale una cosa sola.
 */

/** Probabilidad de que el arma de un cofre dorado salga EXOTICA. */
export const GOLDEN_EXOTIC_CHANCE = 0.10;

/* =============================================================
   POTENCIADORES ("bendiciones")
   ============================================================= */

/**
 * Se acumulan: coger dos veces el mismo sube su nivel y suma su efecto
 * otra vez. `apply` recibe los multiplicadores del jugador y los toca.
 *
 *   id      identificador
 *   name    nombre que sale en el aviso y en el HUD
 *   desc    que hace, en una linea
 *   color   color del icono
 *   icon    dibujo (ver ui/blitzHud.js)
 *   apply   como cambia al jugador
 */
export const BOOSTS = [
  {
    id: 'dano', name: 'Furia', desc: '+18% de dano',
    color: '#e8434f', icon: 'espada',
    apply: (p) => { p.boosts.damage += 0.18; },
  },
  {
    id: 'velocidad', name: 'Ligereza', desc: '+12% de velocidad',
    color: '#3ad6f5', icon: 'ala',
    apply: (p) => { p.boosts.speed += 0.12; },
  },
  {
    id: 'vida', name: 'Vigor', desc: '+25 de vida maxima',
    color: '#5fd14a', icon: 'corazon',
    // Sube el tope Y cura lo mismo: si solo subiera el tope, el premio
    // por subir de nivel seria una barra mas larga y mas vacia.
    apply: (p) => { p.maxHealth += 25; p.health = Math.min(p.maxHealth, p.health + 25); },
  },
  {
    id: 'cadencia', name: 'Gatillo Rapido', desc: '+20% de cadencia',
    color: '#ffd23f', icon: 'rayo',
    apply: (p) => { p.boosts.fireRate += 0.20; },
  },
  {
    id: 'robo', name: 'Sanguijuela', desc: 'Te curas 30 por cada baja',
    color: '#b45cf0', icon: 'gota',
    apply: (p) => { p.boosts.lifesteal += 30; },
  },
  {
    id: 'escudo', name: 'Coraza', desc: '+35 de escudo al momento',
    color: '#4fc3f7', icon: 'escudo',
    apply: (p) => { p.shield = Math.min(p.maxShield, p.shield + 35); },
  },
];

/** Un potenciador por su id. */
export function boostById(id) {
  return BOOSTS.find((b) => b.id === id) || BOOSTS[0];
}

/* =============================================================
   COFRES DORADOS
   ============================================================= */

/**
 * Cuantos de los cofres del mapa son DORADOS. Dan un potenciador ademas
 * de su botin, y el botin es de rareza alta: son el sitio al que ir
 * corriendo nada mas aterrizar, y por lo tanto donde se pelea.
 */
export const GOLDEN_CHEST_SHARE = 0.34;

/**
 * Aviso: al bajar el numero de cofres del modo, esta proporcion se
 * aplica sobre menos cofres, asi que tambien bajan los dorados. Es lo
 * que se busca: que encontrar uno sea un acontecimiento.
 */

/** Rareza minima del arma que sale de un cofre dorado. */
export const GOLDEN_MIN_RARITY = 'epic';
