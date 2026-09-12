/**
 * parkourLevels.js
 * ---------------------------------------------------------------
 * LOS TRES NIVELES de la carrera de obstaculos.
 *
 * El recorrido se GENERA cada vez que juegas, asi que al acabar una
 * carrera la siguiente es otra distinta. Lo que esta fijado son los
 * RANGOS de cada nivel, y son ellos los que garantizan que el circuito
 * siempre se pueda pasar (y que el record siga siendo comparable: todas
 * las variantes tienen la misma dificultad de salto).
 *
 * Cada tramo dice:
 *
 *   dx     hueco que hay que saltar desde el final del tramo anterior
 *   dy     cuanto sube (negativo) o baja (positivo)
 *   w      ancho de la plataforma
 *   thin   plataforma fina: se atraviesa de abajo arriba
 *   salta  trampolin encima: te lanza hacia arriba
 *   picos  pinchos en la franja central (desde este % hasta el 82%).
 *          La plataforma tiene que ser ANCHA: hace falta dejar libre la
 *          zona de aterrizaje y la de despegue, o caes sobre ellos sin
 *          poder hacer nada.
 *   laser  haz vertical al FINAL del tramo, con su ciclo. Va ahi y no en
 *          mitad del hueco a proposito: en el hueco no hay donde pararse
 *          a esperar a que se apague.
 *   fuego  llamarada que sale de la plataforma
 *
 * REGLA DE ORO de los saltos: estan medidos para pasarse ANDANDO
 * (230 px/s), no corriendo. La barra de rapidez se agota a mitad de
 * circuito, y con saltos calculados a 400 px/s el recorrido se volvia
 * imposible justo cuando te quedabas sin energia.
 *
 *   - hueco maximo en llano ............ 125 px
 *   - hueco maximo subiendo ~90 px ..... 95 px
 *   - subida maxima .................... 90 px
 *   - ancho minimo de plataforma ....... 110 px
 *
 * Lo del ancho minimo importa tanto como los huecos: con plataformas de
 * 85 px, ir CORRIENDO te hacia pasarte de largo y caer al otro lado.
 * Ahora hay sitio para aterrizar tanto andando como esprintando.
 *
 * Los tramos que van DESPUES de un trampolin pueden saltarse esa regla:
 * ahi no se llega con un salto normal, sino con el impulso del trampolin.
 */

/* =============================================================
   RANGOS DE CADA NIVEL
   -------------------------------------------------------------
   El recorrido ya no es una tabla fija: se GENERA cada vez, para que al
   acabar una carrera la siguiente sea otra distinta. Lo que se fija son
   los RANGOS, y son ellos los que garantizan que siempre se pueda pasar.
   ============================================================= */

const RANGOS = {
  facil: {
    tramos: 20,
    hueco: [80, 120],      // en llano
    huecoSubida: [80, 95], // cuando ademas hay que subir
    sube: [45, 90],
    baja: [25, 60],
    ancho: [125, 165],
    finos: 0.18,           // probabilidad de plataforma fina
    picos: 0,
    laser: 0,
    fuego: 0,
    trampolines: 0,
  },
  normal: {
    tramos: 20,
    hueco: [85, 125],
    huecoSubida: [80, 95],
    sube: [50, 90],
    baja: [25, 60],
    ancho: [115, 150],
    finos: 0.2,
    picos: 0.3,
    laser: 0,
    fuego: 0,
    trampolines: 2,
  },
  dificil: {
    tramos: 20,
    hueco: [90, 125],
    huecoSubida: [80, 95],
    sube: [55, 90],
    baja: [25, 60],
    ancho: [110, 140],
    finos: 0.22,
    picos: 0.35,
    laser: 0.3,
    fuego: 0.3,
    trampolines: 2,
  },
};

/** Ancho minimo de una plataforma CON PINCHOS (aterrizaje + pinchos + salida). */
const ANCHO_CON_PICOS = 180;

/**
 * Genera un recorrido nuevo respetando los limites de arriba.
 * @param {string} nivelId
 * @param {function} rng   PRNG (Math.random por defecto)
 */
export function buildTramos(nivelId, rng = Math.random) {
  const R = RANGOS[nivelId] || RANGOS.facil;
  const entre = (par) => par[0] + rng() * (par[1] - par[0]);

  const out = [];

  // Salida: ancha y limpia, para arrancar con calma.
  out.push({ dx: 0, dy: 0, w: 260 });

  // Donde van los trampolines: repartidos por el circuito y nunca al
  // final. SEPARADOS al menos dos tramos: si dos cayesen seguidos, el
  // segundo se comeria al primero y quedaria un salto de 230 px sin
  // trampolin que lo alcance, o sea imposible.
  const saltos = new Set();
  let ultimo = -99;
  for (let i = 0; i < R.trampolines; i++) {
    const base = 5 + Math.round((i * (R.tramos - 10)) / Math.max(1, R.trampolines) + rng() * 2);
    const donde = Math.max(base, ultimo + 3);
    if (donde >= R.tramos - 3) break;
    saltos.add(donde);
    ultimo = donde;
  }

  for (let i = 1; i < R.tramos - 1; i++) {
    // Tras un trampolin, el tramo se alcanza REBOTANDO: puede estar
    // mucho mas arriba de lo que da un salto normal.
    if (saltos.has(i - 1)) {
      out.push({ dx: 110 + rng() * 25, dy: -(200 + rng() * 40), w: 110 + rng() * 25 });
      continue;
    }

    // Este tramo lleva trampolin: plataforma ancha y sin nada mas encima.
    if (saltos.has(i)) {
      out.push({ dx: entre(R.hueco), dy: 20 + rng() * 40, w: 115 + rng() * 15, salta: true });
      continue;
    }

    // El circuito SUBE en conjunto (2 de cada 3 tramos), como el de toda
    // la vida: se empieza abajo y se acaba arriba.
    const sube = rng() < 0.68;
    const dy = sube ? -entre(R.sube) : entre(R.baja);
    const dx = sube ? entre(R.huecoSubida) : entre(R.hueco);

    const t = { dx, dy, w: entre(R.ancho) };

    // Plataforma fina (se atraviesa de abajo arriba)
    if (rng() < R.finos) t.thin = true;

    // --- Obstaculos ---
    // Nunca dos en la misma plataforma, ni sobre una fina: seria injusto.
    if (!t.thin) {
      if (rng() < R.picos) {
        t.picos = 0.42 + rng() * 0.12;
        t.w = Math.max(t.w, ANCHO_CON_PICOS);
      } else if (rng() < R.laser) {
        t.laser = { ciclo: 2.8 + rng() * 0.6, encendido: 0.8 + rng() * 0.2, desfase: rng() * 3 };
      } else if (rng() < R.fuego) {
        t.fuego = { ciclo: 2.8 + rng() * 0.4, encendido: 0.8 + rng() * 0.2, desfase: rng() * 3 };
      }
    }

    out.push(t);
  }

  // Llegada: ancha, para no fallar el ultimo salto. Y con el hueco de
  // SUBIDA, que tambien sube: con el de llano se colaba algun salto
  // imposible (hueco de 120 subiendo 85 no se alcanza andando).
  out.push({ dx: entre(R.huecoSubida), dy: -entre(R.sube), w: 240 });

  return out;
}

export const PARKOUR_LEVELS = [
  {
    id: 'facil', name: 'Facil', color: '#5fd14a',
    desc: 'Solo plataformas. Para cogerle el punto al salto.',
  },
  {
    id: 'normal', name: 'Normal', color: '#ffd23f',
    desc: 'Plataformas mas pequenas, pinchos y trampolines.',
  },
  {
    id: 'dificil', name: 'Dificil', color: '#e0554d',
    desc: 'Ademas, laseres y llamaradas. Hay que cronometrar.',
  },
];

/** Un nivel por su id (por defecto, el facil). */
export function parkourLevel(id) {
  return PARKOUR_LEVELS.find((l) => l.id === id) || PARKOUR_LEVELS[0];
}
