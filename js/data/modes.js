/**
 * modes.js
 * ---------------------------------------------------------------
 * CATALOGO DE MODOS DE JUEGO (solo datos).
 *
 * Como en Fortnite, "jugar" ya no es una sola cosa: hay varios modos y
 * el jugador elige. Esta lista es la fuente de verdad de la pantalla
 * MAS JUEGOS, y esta pensada para que anadir uno nuevo sea escribir
 * una entrada aqui y su dibujo en ui/modeIcon.js.
 *
 * OJO con la diferencia entre esto y data/minigames.js: los minijuegos
 * son entrenamiento, no cuentan para nada. Un MODO es una partida de
 * verdad: da pavos, XP, misiones y progreso del pase.
 *
 * Campos:
 *   id        identificador; lo recibe game.startMatch(loadout, id)
 *   name      titulo de la tarjeta
 *   tagline   la coletilla corta, debajo del nombre
 *   desc      de que va, en dos lineas
 *   bullets   las 4 senas de identidad, para comparar modos de un vistazo
 *   icon      dibujo de la tarjeta (ver ui/modeIcon.js)
 *   color     color de acento
 *   ready     si ya se puede jugar
 *   rules     LAS REGLAS DEL MODO (ver abajo)
 *
 * `rules` es lo unico que separa un modo de otro. Los sistemas son los
 * mismos: game.startMatch() lee estas reglas y monta la partida con
 * ellas, en vez de tener un camino de codigo por modo.
 *
 *   bots        cuantos enemigos (el jugador va aparte)
 *   build       si se puede talar y construir
 *   arena       { from, to } ids de zona: recorta el mapa a ese tramo.
 *               null = la isla entera
 *   busTime     segundos que tarda el bus en cruzar
 *   storm       ajustes de la tormenta que pisan a CONFIG.safeZone
 *   startWeapon si todos empiezan con LA MISMA arma
 *   supply      { first, every } ritmo de los supply drops
 *   chests      cofres sueltos (null = los de CONFIG)
 *   worldLoot   objetos sueltos por el suelo (null = los de CONFIG)
 *   teamSize    tamano de escuadron: 1 = individual, 2 = duos, 4 = escuadron
 *   blitz       si corre el sistema de nivel Blitz y potenciadores
 *   launch      en vez de un battle royale, monta este escenario
 *               (JULEN DEFENSA). El resto de reglas no se usan
 *   respawn     ajustes de REAPARICION: los caidos vuelven mientras
 *               quede un companero vivo (ver systems/reload.js).
 *               null = sin reaparicion, morir es morir
 */

export const MODES = [
  {
    id: 'royale',
    name: 'Julen Royale',
    tagline: 'El battle royale completo',
    icon: 'royale', color: '#5fd14a',
    desc: 'La isla entera y 75 jugadores. Saltas del bus, saqueas, ' +
          'construyes y aguantas hasta quedarte solo.',
    bullets: ['75 jugadores', 'Los 10 sitios', 'Con construccion', 'Unos 3 minutos'],
    ready: true,
    // El royale es el modo "sin reglas raras": todo como estaba antes de
    // que existieran los modos. Los `null` dicen "usa lo de CONFIG".
    rules: {
      bots: null,
      build: true,
      arena: null,
      busTime: null,
      storm: null,
      startWeapon: false,
      supply: null,
      chests: null,
      // Los edificios ponian 34 cofres ellos solos, mas que todos los
      // del mapa juntos: entrar en una casa era llenar el inventario.
      buildingLoot: 0.6,
      worldLoot: null,
      teamSize: 1,
      blitz: false,
    },
  },
  {
    id: 'blitz',
    name: 'Julen Blitz',
    tagline: 'Blitz royale expres',
    icon: 'blitz', color: '#ffb03a',
    desc: 'Medio mapa, 32 jugadores, poco botin y nada de construir. Todos ' +
          'empiezan con la misma arma y cada baja sube tu nivel Blitz: armas ' +
          'mejores, bendiciones y, al final del todo, una EXOTICA.',
    bullets: ['32 jugadores', 'Mapa reducido', 'Sin construccion', 'Armas exoticas'],
    ready: true,
    rules: {
      // 31 bots + tu = 32.
      bots: 31,

      // Nada de madera ni de paredes: aqui se pelea de frente.
      build: false,

      // EL MAPA REDUCIDO. En vez de generar otro mundo (que obligaria a
      // duplicar generacion, decorado y edificios), se juega en un TRAMO
      // del de siempre: Fabrica Tornillo, Feria Fortuna, Mansion Dorada
      // y Dunas Secas. Son 10.060 px de los 25.840 del mapa entero:
      // menos de la mitad, con cuatro ambientes muy distintos.
      //
      // Con tres sitios (7360 px) las partidas se acababan en menos de
      // un minuto: 32 personas armadas a 230 px unas de otras se
      // encuentran nada mas tocar el suelo y no queda partida que jugar.
      arena: { from: 'fabrica', to: 'dunas' },

      // El bus cruza un tramo corto, asi que tambien tarda menos.
      busTime: 16,

      // LA TORMENTA RAPIDA: empieza casi al aterrizar, se cierra en poco
      // mas de dos minutos y aprieta hasta dejar un pasillo diminuto.
      // Fuera duele de verdad: quedarse a mirar no es una opcion.
      storm: {
        startDelay: 10,
        closeTime: 125,
        finalWidth: 520,
        damageStart: 5,
        damageEnd: 20,
      },

      // TODOS IGUAL AL EMPEZAR: se sortea UN arma para la partida y esa
      // llevan el jugador y los 31 bots, con municion para usarla.
      startWeapon: true,

      // MENOS COFRES QUE EN EL ROYALE, y no solo porque el mapa sea mas
      // pequeno: en un modo de dos minutos, cada cofre que abres es
      // tiempo que no estas peleando. Con pocos, el botin se pilla de
      // camino a otro sitio en vez de hacerse una ruta de saqueo.
      //
      // Hay que bajar los DOS sitios de donde salen: los sueltos por el
      // mapa (`chests`) y los de dentro de las casas (`buildingLoot`),
      // que eran casi tantos como los otros.
      // Los suministros caen antes y mas seguido: en una partida de dos
      // minutos, la primera caja a los 55 segundos llegaria cuando ya
      // queda medio mundo, y la segunda no llegaria nunca.
      supply: { first: 20, every: 34 },

      chests: 8,
      buildingLoot: 0.5,
      worldLoot: 22,
      teamSize: 1,

      // Nivel Blitz, potenciadores y cofres dorados.
      blitz: true,
    },
  },

  /* =============================================================
     MODOS EN EQUIPO
     -------------------------------------------------------------
     Mismas reglas que el Julen Royale salvo por `teamSize`. Todo lo
     demas (mapa, bots, tormenta, botin) es identico a proposito: lo
     unico que cambia es CON QUIEN juegas, y eso ya lo cambia todo.
     ============================================================= */
  {
    id: 'duos',
    name: 'Julen Duos',
    tagline: 'De dos en dos',
    icon: 'duos', color: '#3aa2f5',
    desc: 'Tu y un aliado contra 36 parejas mas. Si te abaten, tu ' +
          'companero puede levantarte antes de que te desangres.',
    bullets: ['75 jugadores', 'Parejas', 'Puedes reanimar', 'Sin fuego amigo'],
    ready: true,
    rules: {
      bots: null, build: true, arena: null, busTime: null, storm: null,
      startWeapon: false, supply: null, chests: null, buildingLoot: 0.6,
      worldLoot: null, blitz: false,
      teamSize: 2,
    },
  },
  {
    id: 'escuadron',
    name: 'Julen Escuadron',
    tagline: 'Cuatro contra el mundo',
    icon: 'escuadron', color: '#b45cf0',
    desc: 'Tu y tres aliados. Podeis levantaros entre vosotros, asi ' +
          'que caer no es el final mientras quede alguien en pie.',
    bullets: ['75 jugadores', 'Equipos de 4', 'Puedes reanimar', 'Sin fuego amigo'],
    ready: true,
    rules: {
      bots: null, build: true, arena: null, busTime: null, storm: null,
      startWeapon: false, supply: null, chests: null, buildingLoot: 0.6,
      worldLoot: null, blitz: false,
      teamSize: 4,
    },
  },

  /* =============================================================
     JULEN RECARGA
     -------------------------------------------------------------
     El modo "Recarga" de Fortnite: escuadrones en un mapa mediano,
     tormenta rapida y, sobre todo, REAPARICION. Aqui caer no es el
     final: vuelves mientras te quede un companero en pie.

     Esta primera parte monta el escenario (mapa, equipos, tormenta);
     la reaparicion en si la lleva systems/reload.js.
     ============================================================= */
  {
    id: 'recarga',
    name: 'Julen Recarga',
    tagline: 'Caes, vuelves, sigues',
    icon: 'recarga', color: '#ff5fa2',
    desc: 'Escuadrones de 4 en un mapa mediano y con la tormenta encima. ' +
          'Si te eliminan REAPARECES a los 30 segundos, siempre que quede ' +
          'un companero vivo. Al final se acaban las segundas oportunidades.',
    bullets: ['40 jugadores', 'Equipos de 4', 'Reapareces al caer', 'Tormenta rapida'],
    ready: true,
    rules: {
      // 39 bots + tu = 40, repartidos en 10 escuadrones de 4.
      bots: 39,

      // Con construccion, como el Royale: con reaparicion constante las
      // paredes son lo unico que da un respiro para curarse.
      build: true,

      // MAPA MEDIANO. Ni la isla entera (25.840 px) ni el pasillo del
      // Blitz (10.060): cinco sitios, 12.460 px. Con 40 jugadores salen
      // unos 310 px por cabeza, mas apretado que el Royale (344), que es
      // justo lo que se busca: encontrarse rapido y pelear seguido.
      arena: { from: 'villa', to: 'mansion' },

      // Tramo mas corto, viaje mas corto.
      busTime: 20,

      // TORMENTA RAPIDA: mas que en el Royale, menos bruta que en el
      // Blitz. Tiene que apretar sin dejar sin sentido el respawn: si
      // cerrase en dos minutos, reaparecer no serviria de nada.
      storm: {
        startDelay: 14,
        closeTime: 150,
        finalWidth: 640,
        damageStart: 4,
        damageEnd: 16,
      },

      startWeapon: false,

      // Suministros algo mas seguidos que en el Royale: con gente
      // volviendo a la partida sin nada, hace falta botin fresco.
      supply: { first: 35, every: 45 },

      chests: null,
      buildingLoot: 0.6,
      worldLoot: null,

      // Escuadrones de 4: reanimar sigue funcionando igual, y ademas
      // esta la reaparicion.
      teamSize: 4,
      blitz: false,

      /**
       * REAPARICION: lo que hace que este modo sea lo que es. Lo lleva
       * systems/reload.js; ningun otro modo la tiene.
       *
       *   time          segundos de espera al caer
       *   kill/chest/   cuanto RECORTA de la espera de tus companeros
       *   supply        cada accion util que haces
       *   lastTeams     con estos equipos o menos, se acaban las
       *                 segundas oportunidades
       *   stormProgress lo mismo, pero por tormenta: 0,75 es tres
       *                 cuartas partes del cierre
       */
      respawn: {
        time: 30,
        kill: 7,
        chest: 4,
        supply: 6,
        lastTeams: 3,
        stormProgress: 0.75,
      },
    },
  },

  /* =============================================================
     JULEN DEFENSA
     -------------------------------------------------------------
     Tower defense de noche contra zombis. No es un battle royale: no
     tiene bus, ni bots, ni zona. Por eso sus reglas no son las de los
     demas, sino un `launch`: el id del escenario que monta (ver
     systems/minigames/defense.js). Aun asi CUENTA COMO PARTIDA.
     ============================================================= */
  {
    id: 'defensa',
    name: 'Julen Defensa',
    tagline: 'Defiende la torre de noche',
    icon: 'defensa', color: '#e8434f',
    desc: 'Aguanta 2 oleadas de zombis: disparas tu, colocas torres y ' +
          'trampas, y de dia te preparas. La ultima trae de todo y un jefe.',
    bullets: ['Oleadas de zombis', 'Torres y trampas', 'Dia y noche', 'Jefes'],
    ready: true,
    rules: { launch: 'defensa' },
  },
];

/** Reglas de un modo, con las del royale como respaldo. */
export function rulesOf(id) {
  return modeById(id).rules;
}

/** Un modo por su id (el royale como respaldo). */
export function modeById(id) {
  return MODES.find((m) => m.id === id) || MODES[0];
}

/** El modo por defecto: el que arranca el boton grande del menu. */
export const DEFAULT_MODE = 'royale';
