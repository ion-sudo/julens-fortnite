/**
 * weapons.js
 * ---------------------------------------------------------------
 * LAS ARMAS, ordenadas de la mas comun a la mas rara.
 *
 * Las diez primeras salen en TODOS los modos. Las ultimas cinco son
 * EXCLUSIVAS DEL JULEN BLITZ (`modes: ['blitz']`): asi el modo rapido
 * tiene armas propias que no se ven en el Royale, sin cambiarle a este
 * el equilibrio que ya tenia.
 *
 * Campos de cada arma:
 *   ammo        tipo de municion que gasta (ver data/ammo.js)
 *   order       posicion en la lista (1 = mas comun)
 *   dropWeight  probabilidad relativa de que salga esta arma
 *   modes       en que modos aparece. Sin campo = en todos.
 *   minRarity   rareza minima con la que puede aparecer (opcional)
 *   kind        familia, define el comportamiento y el dibujo
 *   damage      dano BASE por proyectil (se multiplica por la rareza)
 *   fireRate    disparos por segundo
 *   auto        true = dispara mientras mantienes el clic izquierdo
 *   pellets     proyectiles por disparo (escopetas)
 *   spread      dispersion en radianes (0 = perfecto)
 *   adsSpread   dispersion apuntando con el clic derecho
 *   speed       velocidad del proyectil (px/s)
 *   range       alcance en px; al agotarse el proyectil desaparece
 *   pierce      atraviesa objetivos
 *   spinUp      segundos de "calentamiento" antes de disparar (minigun)
 *   recoil      empujon visual de la camara/arma
 *   effect      efecto especial en vez de disparar (de momento: 'rift')
 *   bulletEffect  efecto de cada PROYECTIL al impactar (JULEN DEFENSA):
 *               'explosion' (dano en area, radio `bulletRadius`),
 *               'hielo' (ralentiza), 'cadena' (salta a otros), 'fuego'.
 *               Solo lo entienden los zombis: a un personaje le da igual.
 *
 * El dibujo de cada arma esta en js/entities/weaponSprite.js (usa `kind`).
 */

export const WEAPONS = [
  {
    id: 'pistola', order: 1, name: 'Pistola', kind: 'pistol',
    ammo: 'ligera',
    dropWeight: 22,
    damage: 24, fireRate: 4, auto: false,
    pellets: 1, spread: 0.030, adsSpread: 0.010,
    speed: 1400, range: 900, recoil: 2.0,
    desc: 'Fiable y siempre disponible. Nada del otro mundo.',
  },
  {
    id: 'fusil', order: 2, name: 'Fusil de Asalto', kind: 'ar',
    ammo: 'media',
    dropWeight: 17,
    damage: 30, fireRate: 6, auto: true,
    pellets: 1, spread: 0.045, adsSpread: 0.014,
    speed: 1600, range: 1300, recoil: 2.6,
    desc: 'El todoterreno: buen dano y buen alcance.',
  },
  {
    id: 'fusil-tambor', order: 3, name: 'Fusil de Tambor', kind: 'ar-drum',
    ammo: 'media',
    dropWeight: 13,
    damage: 26, fireRate: 8, auto: true,
    pellets: 1, spread: 0.062, adsSpread: 0.026,
    speed: 1500, range: 1100, recoil: 2.2,
    desc: 'Escupe balas del tambor sin descanso.',
  },
  {
    id: 'subfusil', order: 4, name: 'Subfusil Rapido', kind: 'smg',
    ammo: 'ligera',
    dropWeight: 11,
    damage: 17, fireRate: 11, auto: true,
    pellets: 1, spread: 0.075, adsSpread: 0.034,
    speed: 1400, range: 800, recoil: 1.5,
    desc: 'Cadencia altisima para el combate a media distancia.',
  },
  {
    id: 'subfusil-tambor', order: 5, name: 'Subfusil de Tambor', kind: 'smg-drum',
    ammo: 'ligera',
    dropWeight: 9,
    damage: 15, fireRate: 13, auto: true,
    pellets: 1, spread: 0.092, adsSpread: 0.044,
    speed: 1350, range: 750, recoil: 1.3,
    desc: 'Una lluvia de balas. Puntería opcional.',
  },
  {
    id: 'minigun', order: 6, name: 'Minigun', kind: 'minigun',
    ammo: 'media',
    dropWeight: 8, minRarity: 'uncommon',
    damage: 14, fireRate: 16, auto: true,
    pellets: 1, spread: 0.110, adsSpread: 0.060,
    speed: 1400, range: 950, recoil: 1.1, spinUp: 0.55,
    desc: 'Tarda un momento en arrancar, luego no para.',
  },
  {
    id: 'escopeta', order: 7, name: 'Escopeta Tactica', kind: 'shotgun',
    ammo: 'cartuchos',
    dropWeight: 7,
    damage: 12, fireRate: 1.4, auto: false,
    pellets: 7, spread: 0.170, adsSpread: 0.115,
    speed: 1250, range: 460, recoil: 5.0,
    desc: 'Siete perdigones. De cerca, demoledora.',
  },
  {
    id: 'escopeta-oni', order: 8, name: 'Escopeta de Oni', kind: 'shotgun-oni',
    ammo: 'cartuchos',
    dropWeight: 6, minRarity: 'uncommon',
    damage: 16, fireRate: 1.0, auto: false,
    pellets: 8, spread: 0.200, adsSpread: 0.130,
    speed: 1300, range: 520, recoil: 6.5,
    desc: 'Un rugido y ocho perdigones con muy malas intenciones.',
  },
  {
    id: 'sniper', order: 9, name: 'Sniper Tactico', kind: 'sniper',
    ammo: 'pesada',
    dropWeight: 4.5, minRarity: 'rare',
    damage: 105, fireRate: 0.55, auto: false,
    pellets: 1, spread: 0.020, adsSpread: 0.002,
    speed: 2600, range: 2400, recoil: 8.0, pierce: true,
    desc: 'Un disparo, una historia. Apunta con el clic derecho.',
  },
  {
    id: 'julen', order: 10, name: 'Julen Super Arma', kind: 'beam',
    ammo: 'energia',
    dropWeight: 2.5, minRarity: 'epic',
    damage: 40, fireRate: 5, auto: true,
    pellets: 1, spread: 0.030, adsSpread: 0.006,
    speed: 2200, range: 1200, recoil: 1.8, pierce: true,
    desc: 'Dispara RAYOS que atraviesan todo lo que se le ponga delante.',
  },

  /* =============================================================
     EXCLUSIVAS DEL JULEN BLITZ
     Solo aparecen en ese modo (`modes`). El Royale se queda con las
     diez de siempre y su equilibrio intacto.
     ============================================================= */
  {
    id: 'lmg', order: 11, name: 'Ametralladora Ligera', kind: 'lmg',
    ammo: 'media', modes: ['blitz'],
    dropWeight: 11,
    damage: 21, fireRate: 10, auto: true,
    pellets: 1, spread: 0.070, adsSpread: 0.030,
    speed: 1550, range: 1250, recoil: 3.2,
    desc: 'No para de escupir balas. Aguanta el gatillo y no sueltes.',
  },
  {
    id: 'revolver', order: 12, name: 'Revolver Pesado', kind: 'revolver',
    ammo: 'pesada', modes: ['blitz'],
    dropWeight: 8, minRarity: 'uncommon',
    damage: 74, fireRate: 1.3, auto: false,
    pellets: 1, spread: 0.022, adsSpread: 0.006,
    speed: 2000, range: 1500, recoil: 7.0,
    desc: 'Seis balas y ninguna de sobra. Como te acierte, se acabo.',
  },
  {
    id: 'llamas', order: 13, name: 'Lanzallamas', kind: 'llamas',
    ammo: 'energia', modes: ['blitz', 'defensa'],
    dropWeight: 7, minRarity: 'uncommon',
    damage: 8, fireRate: 14, auto: true,
    pellets: 2, spread: 0.230, adsSpread: 0.170,
    speed: 780, range: 330, recoil: 1.2,
    bulletEffect: 'fuego',
    desc: 'De cerca no hay quien lo aguante. De lejos, no llega ni al suelo.',
  },
  {
    id: 'pulso', order: 14, name: 'Rifle de Pulsos', kind: 'pulso',
    ammo: 'energia', modes: ['blitz'],
    dropWeight: 5, minRarity: 'rare',
    damage: 44, fireRate: 3.2, auto: false,
    pellets: 1, spread: 0.018, adsSpread: 0.004,
    speed: 2100, range: 1800, recoil: 4.0, pierce: true,
    desc: 'Cada disparo es un pulso que atraviesa a todo el que este en fila.',
  },
  {
    // NO dispara: al usarla abre una GRIETA y te manda al cielo, con la
    // paravela lista. Es la copia de la "Grieta Portatil" de Fortnite,
    // que sirve para huir de un tiroteo perdido o para cruzar medio mapa.
    id: 'grieta', order: 15, name: 'Grieta Portatil', kind: 'grieta',
    ammo: 'energia', modes: ['blitz'],
    dropWeight: 6, minRarity: 'rare',
    damage: 0, fireRate: 0.8, auto: false,
    pellets: 1, spread: 0, adsSpread: 0,
    speed: 0, range: 0, recoil: 0,
    effect: 'rift',
    desc: 'Abre una grieta y te sube al cielo con la paravela. Para escapar.',
  },

  /* =============================================================
     EXCLUSIVAS DE JULEN DEFENSA
     Se compran en la tienda del modo. Cada proyectil lleva su efecto
     (`bulletEffect`), que es lo que las hace utiles contra hordas.
     ============================================================= */
  {
    id: 'lanzacohetes', order: 16, name: 'Lanzacohetes', kind: 'cohetes',
    ammo: 'pesada', modes: ['defensa'],
    dropWeight: 3, minRarity: 'rare',
    damage: 90, fireRate: 0.9, auto: false,
    pellets: 1, spread: 0.020, adsSpread: 0.006,
    speed: 950, range: 1300, recoil: 7.0,
    bulletEffect: 'explosion', bulletRadius: 130,
    desc: 'Un cohete que revienta en area. Lo mejor contra un grupo.',
  },
  {
    id: 'rifle-hielo', order: 17, name: 'Rifle de Hielo', kind: 'hielo',
    ammo: 'energia', modes: ['defensa'],
    dropWeight: 3, minRarity: 'rare',
    damage: 22, fireRate: 4, auto: true,
    pellets: 1, spread: 0.030, adsSpread: 0.010,
    speed: 1700, range: 1100, recoil: 2.0,
    bulletEffect: 'hielo',
    desc: 'Cada impacto deja al zombi a camara lenta.',
  },
  {
    id: 'cadena', order: 18, name: 'Arma de Rayo en Cadena', kind: 'cadena',
    ammo: 'energia', modes: ['defensa'],
    dropWeight: 3, minRarity: 'epic',
    damage: 30, fireRate: 3, auto: true,
    pellets: 1, spread: 0.020, adsSpread: 0.008,
    speed: 2300, range: 900, recoil: 2.4,
    bulletEffect: 'cadena',
    desc: 'El rayo salta de un zombi a otro, hasta tres.',
  },
  {
    id: 'ballesta', order: 19, name: 'Ballesta Perforante', kind: 'ballesta',
    ammo: 'pesada', modes: ['defensa'],
    dropWeight: 3, minRarity: 'rare',
    damage: 72, fireRate: 1.3, auto: false,
    pellets: 1, spread: 0.012, adsSpread: 0.003,
    speed: 1900, range: 1400, recoil: 3.0, pierce: true,
    desc: 'Una flecha que atraviesa la fila entera.',
  },
  {
    id: 'lanzagranadas', order: 20, name: 'Lanzagranadas', kind: 'lanzagranadas',
    ammo: 'pesada', modes: ['defensa'],
    dropWeight: 3, minRarity: 'rare',
    damage: 55, fireRate: 1.7, auto: false,
    pellets: 1, spread: 0.030, adsSpread: 0.010,
    speed: 900, range: 900, recoil: 5.0,
    bulletEffect: 'explosion', bulletRadius: 95,
    desc: 'Dispara mas rapido que el lanzacohetes, en menos area.',
  },
  {
    // Usa el dibujo del fusil de asalto: por fuera es uno normal.
    id: 'incendiario', order: 21, name: 'Fusil Incendiario', kind: 'ar',
    ammo: 'media', modes: ['defensa'],
    dropWeight: 3, minRarity: 'uncommon',
    damage: 20, fireRate: 7, auto: true,
    pellets: 1, spread: 0.050, adsSpread: 0.016,
    speed: 1500, range: 1100, recoil: 2.4,
    bulletEffect: 'fuego',
    desc: 'Un fusil de asalto con balas que prenden fuego.',
  },
];

/**
 * Las armas que pueden salir en un modo.
 * Un arma sin `modes` sale en todos; con `modes`, solo en los que diga.
 */
export function weaponsFor(mode) {
  return WEAPONS.filter((w) => !w.modes || w.modes.includes(mode));
}

/** Busca un arma por id. */
export function findWeapon(id) {
  return WEAPONS.find((w) => w.id === id);
}
