/**
 * config.js
 * ---------------------------------------------------------------
 * Todas las constantes "de diseno" del juego en un solo sitio.
 * Tocar valores aqui para ajustar el game feel sin bucear en la logica.
 * Unidades: pixeles y segundos (px, px/s, px/s^2).
 */

export const CONFIG = {
  /* ---------- Lienzo (resolucion interna fija; CSS la escala) ---------- */
  canvas: {
    width: 1280,
    height: 720,
  },

  /* ---------- Mundo ---------- */
  world: {
    width: 25840,     // referencia; el ancho real lo calcula data/zones.js
    height: 1600,     // alto total (sobra cielo por arriba)
    gravity: 2400,    // aceleracion de caida (px/s^2)
    maxFallSpeed: 1400,

    // --- Edificios ---
    // Separacion MINIMA entre dos edificios vecinos. Si se tocan, sus
    // paredes se cruzan y el jugador puede quedarse encerrado entre dos
    // muros solidos sin poder abrir ninguna puerta.
    buildingGap: 150,
    // Margen que se respeta contra el borde de la zona.
    buildingMargin: 120,
    // Lo que tarda un bot en forzar una puerta cerrada. Cerrarla te da
    // ese respiro para curarte o recargar, pero no te hace invulnerable.
    botDoorTime: 1.4,
  },

  /* ---------- Jugador ---------- */
  player: {
    // Hitbox (rectangulo). El dibujo se adapta a estas medidas.
    width: 30,
    height: 58,
    crouchHeight: 38,

    // Velocidades horizontales
    walkSpeed: 230,
    runSpeed: 400,
    crouchSpeed: 110,

    // Aceleracion / frenada (px/s^2)
    accelGround: 2600,
    accelAir: 1500,
    frictionGround: 3200,
    frictionAir: 500,

    // Salto
    jumpSpeed: 850,          // impulso inicial (da ~150 px de altura de salto)
    jumpCutMultiplier: 0.45, // al soltar salto, recorta la subida (salto variable)
    coyoteTime: 0.10,        // margen para saltar tras salir del borde (s)
    jumpBuffer: 0.12,        // margen para "pre-pulsar" salto antes de tocar suelo (s)

    // Barra de corrida (energia)
    staminaMax: 100,
    staminaDrain: 30,        // por segundo corriendo
    staminaRegen: 24,        // por segundo recargando
    staminaRegenDelay: 0.6,  // espera tras dejar de correr (s)
    staminaMinToStart: 25,   // energia minima para volver a correr tras agotarla

    // Animacion
    stepCycleSpeed: 0.045,   // radianes de ciclo de piernas por pixel recorrido
  },

  /* ---------- Picar arboles y construir ---------- */
  build: {
    // --- Madera ---
    woodPerTree: 60,       // lo que da un arbol al terminar de picarlo
    chopSeconds: 5,        // lo que se tarda en talarlo dandole golpes
    chopRange: 78,         // alcance del pico sobre un arbol
    maxWood: 999,
    startWood: 0,

    // --- Construccion ---
    buildRange: 430,       // hasta donde se puede colocar una pieza
    rampStep: 30,          // altura de peldano que se sube andando
    groundSnap: 1.45,      // la pieza se posa en el suelo si lo tiene a menos de 1,45 celdas
    // Los bots tambien pican arboles
    botChopChance: 0.35,   // probabilidad de que un bot decida ir a talar
    botWoodTarget: 90,     // deja de talar al llegar a esta madera
    // Y rompen lo que les estorba
    botBreakRange: 120,
  },

  /* ---------- Bus de batalla y caida ---------- */
  bus: {
    altitude: 210,        // altura a la que vuela el bus
    crossTime: 30,        // segundos en cruzar el mapa de punta a punta
    autoJumpAt: 0.88,     // si no saltas, te suelta al llegar aqui (0..1)
    // Caida libre tras saltar
    fallGravity: 1500,
    fallMaxSpeed: 900,
    fallMoveSpeed: 430,
    fallAccel: 1400,
    // Planeo con la paravela
    glideFallSpeed: 165,
    glideMoveSpeed: 300,
    glideAccel: 1100,
    // Altura sobre el suelo a la que se abre sola la paravela
    autoGlideHeight: 330,
    botJumpSpread: 420,   // margen al azar para que los bots no salten a la vez
  },

  /* ---------- Nado ---------- */
  swim: {
    // La gravedad dentro del agua es casi nula: el cuerpo flota.
    gravityFactor: 0.10,
    buoyancy: 620,        // empuje hacia arriba cuando NO se bucea
    diveAccel: 1150,      // fuerza al pulsar Espacio dentro del agua
    maxSpeed: 190,        // velocidad horizontal nadando
    accel: 900,
    dragX: 3.2,           // rozamiento del agua (horizontal)
    dragY: 2.6,           // rozamiento del agua (vertical)
    maxRise: 260,         // no se sube mas rapido que esto
    maxSink: 340,         // ni se baja mas rapido que esto
    // Cuanto asoma el cuerpo por encima de la superficie al flotar.
    floatDepth: 0.55,     // 0 = de pie sobre el agua, 1 = sumergido del todo
    // Escalon que se puede subir nadando para salir a la orilla.
    // Flotando, los pies quedan unos 26 px por debajo del borde del lago,
    // asi que tiene que ser algo mayor que eso.
    exitStep: 36,
    enterSplash: 130,     // velocidad de caida a partir de la cual salpica
  },

  /* ---------- Peces ---------- */
  fish: {
    healAmount: 12,       // vida que da cada pez
    respawnTime: 9,       // segundos hasta que vuelve a aparecer
    areaPerFish: 14000,   // superficie de agua por pez
    minPerBody: 3,
  },

  /* ---------- Camara ---------- */
  camera: {
    zoom: 1.25,         // acercamiento: el personaje se ve mas grande
    smooth: 7.5,        // mayor = camara mas pegada al jugador
    lookAhead: 130,     // adelanto en la direccion de movimiento (px)
    lookAheadSmooth: 3, // suavizado del adelanto
    offsetY: -60,       // sube un poco el encuadre para ver mas escenario
    menuPanSpeed: 55,   // px/s del paseo automatico de camara en el menu
  },

  /* ---------- Combate ---------- */
  combat: {
    maxHealth: 100,
    maxShield: 100,

    // Pico
    pickaxeDamage: 20,
    pickaxeRange: 62,      // alcance del golpe (px)
    pickaxeRate: 1.6,      // golpes por segundo
    pickaxeVsBuild: 2,     // el pico hace el doble de dano a las construcciones

    // Ayudas de punteria
    aimSpreadFactor: 1.0,  // multiplicador de dispersion apuntando (usa adsSpread)
    moveSpreadPenalty: 1.6, // se dispersa mas si disparas en movimiento

    // Botin repartido por el mundo al empezar la partida
    worldLootCount: 60,
  },

  /* ---------- Bots ---------- */
  bots: {
    count: 74,             // enemigos por partida (+ el jugador = 75 vivos)
    damageMult: 0.52,      // los bots pegan bastante menos que el jugador
    aimErrorMult: 1.0,     // sube esto para que fallen mas (mas facil)
    lootRange: 460,        // distancia a la que ven un objeto del suelo
    maxHeals: 3,
    healTime: 2.2,         // lo que tardan en usar una cura
    healAmount: 45,
    centerBiasTime: 120,   // segundos hasta que tienden claramente al centro
    closeInBelow: 10,      // con menos bots vivos, todos van al centro
    closeInRadius: 700,    // distancia al centro a partir de la cual vuelven
    endgameViewMult: 2.5,  // en la recta final se ven de mucho mas lejos
    stalemateTime: 7,      // segundos de tiroteo sin dano antes de lanzarse
    // Los bots lejos del jugador se simulan mas espaciado (ahorra CPU)
    farDistance: 2200,
    farStepEvery: 3,
    spawnSpread: 260,      // separacion minima entre bots al empezar
    startArmedChance: 0.45, // proporcion que empieza ya con arma
    // Madera con la que empiezan algunos: sin nada que gastar no
    // podrian construir hasta talar su primer arbol, y para entonces la
    // partida ya va por la mitad.
    startWoodChance: 0.5,
    startWood: [40, 110],
    // Fase inicial de saqueo: durante estos segundos los bots buscan
    // botin y no entran en combate (como el aterrizaje de Fortnite).
    graceTime: 14,
    meleeApproach: 220,    // sin arma, solo se lanza a por ti desde esta distancia
  },

  /* ---------- Zona segura (version minima de la tormenta) ---------- */
  safeZone: {
    startDelay: 35,    // segundos antes de empezar a cerrarse
    closeTime: 150,    // lo que tarda en llegar a su tamano minimo
    finalWidth: 820,   // ancho final del tramo seguro (px)
    damageStart: 1.5,  // dano por segundo fuera, al principio
    damageEnd: 9,      // dano por segundo fuera, al final
  },

  /* ---------- Supply drops ---------- */
  // Las cajas de suministros que caen del cielo a mitad de partida.
  // Tardan un rato en bajar a proposito: el paracaidas es un aviso para
  // todo el mundo, y lo que hace gracia es la pelea por llegar.
  supply: {
    // A los 55 segundos la primera llegaba tarde: muchas partidas se
    // acababan (o te acababan) sin haber visto ninguna caja caer.
    firstAt: 30,            // segundos hasta la primera
    every: 50,              // y entre una y la siguiente
    minRarity: 'legendary', // rareza minima del arma buena
    minRaritySecond: 'epic',// y de la segunda
  },

  /* ---------- Cofres ---------- */
  chests: {
    // Cofres SUELTOS por el mapa. Los edificios ponen los suyos aparte
    // (ver data/buildings.js), asi que el total es este mas los de dentro.
    // MENOS COFRES. Subieron a 30 al agrandar el mapa "para mantener la
    // densidad", pero contando los que ponen los edificios salian 64 en
    // una partida: mas de los que habia cuando ya parecian demasiados.
    // Con 18 sueltos y los de dentro recortados quedan unos 38, que se
    // nota de verdad.
    count: 18,
    zoneShare: 0.72,  // proporcion que cae dentro de los sitios con nombre
    minItems: 2,      // objetos que suelta cada cofre
    maxItems: 3,
    ammoBoxes: 1,     // cajas de municion garantizadas por cofre
  },

  /* ---------- Mapeo de teclas (accion -> event.code) ---------- */
  keys: {
    left:   ['KeyA', 'ArrowLeft'],
    right:  ['KeyD', 'ArrowRight'],
    jump:   ['KeyW', 'Space', 'ArrowUp'],
    crouch: ['KeyS', 'ArrowDown', 'ControlLeft', 'ControlRight'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    menu:   ['Escape'],

    // Inventario: F = pico, 1..5 = las cinco ranuras de objetos
    slotPickaxe: ['KeyF'],
    slot1:  ['Digit1', 'Numpad1'],
    slot2:  ['Digit2', 'Numpad2'],
    slot3:  ['Digit3', 'Numpad3'],
    slot4:  ['Digit4', 'Numpad4'],
    slot5:  ['Digit5', 'Numpad5'],
    drop:   ['KeyR'],
    pickup: ['KeyE'],

    map:    ['KeyM'],

    // Emotes: B abre y cierra la rueda (la usa el Fortnite de verdad, y
    // aqui estaba libre). Con la rueda abierta, 1..6 eligen directo.
    emoteWheel: ['KeyB'],

    // Vehiculos: la V estaba libre (E, F, R, Q, Z, X, C, M y H ya se usan)
    vehicle: ['KeyV'],

    // Construccion: Q entra y sale del modo, Z/X/C eligen la pieza
    buildMode: ['KeyQ'],
    pieceWall:  ['KeyZ'],
    pieceFloor: ['KeyX'],
    pieceRamp:  ['KeyC'],
    toggleHelp: ['KeyH'],
    debug:  ['F1'],
  },

  /* ---------- Depuracion ---------- */
  debug: {
    showHitboxes: false, // se activa/desactiva en caliente con F1
  },
};

/* ---------- Paleta de colores del juego (estetica colorida tipo Fortnite) ---------- */
export const PALETTE = {
  skyTop:     '#3aa7f0',
  skyMid:     '#7fd0ff',
  skyBottom:  '#c8efff',

  cloud:      'rgba(255, 255, 255, 0.92)',
  cloudSoft:  'rgba(255, 255, 255, 0.55)',

  hillFar:    '#7fc4a8',
  hillNear:   '#5aab88',

  grassLight: '#6fd36a',
  grassMid:   '#4cbb4c',
  grassDark:  '#37a03c',

  dirtLight:  '#a9763f',
  dirtMid:    '#8a5c2f',
  dirtDark:   '#6b4522',
  rock:       '#9aa4ae',

  trunk:      '#7a4b26',
  trunkDark:  '#5e3819',
  pineLight:  '#3fa85a',
  pineMid:    '#2f8c49',
  pineDark:   '#236b39',

  // Jugador
  skin:       '#f3c197',
  skinShade:  '#d9a377',
  hair:       '#3a2a1c',
  jacket:     '#3f7fe8',
  jacketDark: '#2f62b8',
  pants:      '#37406b',
  pantsDark:  '#2a3154',
  boots:      '#2a2f45',
  backpack:   '#e0a63a',
};
