/**
 * contador.js
 * ---------------------------------------------------------------
 * CONTADOR DE VISITAS: cuanta gente ha entrado al juego.
 *
 * (Antes se llamaba visits.js. Se le cambio el nombre a proposito: los
 * navegadores que ya habian entrado se quedaban con el archivo viejo
 * guardado hasta 10 minutos y seguian sumando en el contador antiguo,
 * asi que se veia una cifra que no era. Una direccion nueva no puede
 * estar guardada de antes, y eso corta el problema de raiz.)
 *
 * El juego es una pagina ESTATICA (GitHub Pages): no hay servidor
 * nuestro, asi que no hay donde guardar un numero compartido entre
 * todos. La cuenta la lleva un servicio de fuera, al que solo se le
 * pide "sube uno" y "dime cuanto llevas". No se le manda NADA del
 * jugador: ni nombre, ni partidas, ni progreso. Solo un numero.
 *
 * TRES COSAS IMPORTANTES DE ESTE MODULO:
 *
 *   1. NUNCA rompe el juego. Si el servicio esta caido, tarda, o el
 *      navegador bloquea la peticion, el contador simplemente no se
 *      ensena y ya. Todo va en try/catch y con un tiempo limite.
 *
 *   2. NO bloquea el arranque. Se lanza y se olvida: el menu no espera
 *      a que conteste nadie.
 *
 *   3. ES CAMBIABLE. Todo lo que depende del servicio de turno esta en
 *      `SERVICIO`, aqui debajo. El dia que haya un contador propio (por
 *      ejemplo en el AWS del dominio), se cambian esas dos URLs y no
 *      hay que tocar nada mas.
 */

/**
 * El servicio que lleva la cuenta.
 *
 *   hit  suma uno y devuelve el total
 *   get  solo lee el total, sin sumar
 *
 * Los dos tienen que devolver un JSON del que `leer` sepa sacar el
 * numero. Si algun dia cambia el servicio, esto es lo unico que se
 * toca.
 */
const SERVICIO = {
  hit: 'https://abacus.jasoncameron.dev/hit/julensfortnite-battlemundial/jugadores',
  get: 'https://abacus.jasoncameron.dev/get/julensfortnite-battlemundial/jugadores',
  leer: (json) => json?.value,
};

/*
 * OJO SI HAY QUE EMPEZAR DE CERO OTRA VEZ.
 * No existe un "borrar" en el servicio: para reiniciar la cuenta se
 * cambia el nombre del contador (la ultima parte de las dos URLs) por
 * uno que no haya usado nadie, y el nuevo empieza en cero solo. El
 * nombre lleva el dominio a proposito, para no chocar con el contador
 * de otra persona: son claves publicas y compartidas.
 */

/** Si tarda mas que esto, se deja estar. */
const TIEMPO_LIMITE = 6000;

/**
 * Marca de "a ti ya te he contado".
 *
 * OJO CON DONDE SE GUARDA, que es lo que decide QUE se esta contando:
 *
 *   sessionStorage  se borra al cerrar la pestana -> cuenta VISITAS.
 *                   Una misma persona que entra cinco veces suma cinco.
 *   localStorage    se queda para siempre en ese navegador -> cuenta
 *                   JUGADORES. Esa persona suma UNO, entre hoy y
 *                   siempre, aunque vuelva mil veces.
 *
 * Va en localStorage porque el cartel dice JUGADORES: la pregunta que
 * se responde es "cuanta gente ha llegado a jugar", no "cuantas veces
 * se ha abierto la web".
 *
 * Lo que esto NO puede saber: si la misma persona entra desde el movil
 * y desde el ordenador cuenta dos, y si borra los datos del navegador
 * vuelve a contar. Para afinar mas haria falta que la gente se
 * registrase, y eso no lo tiene (ni le hace falta) este juego.
 */
const CLAVE_CONTADO = 'fc-jugador-contado';

/**
 * Pide el numero y lo entrega.
 *
 * @param {(total:number) => void} alRecibir  lo llama con el total si
 *   todo va bien. Si algo falla, NO lo llama: el contador se queda sin
 *   ensenar y el juego sigue igual.
 */
export function contarVisita(alRecibir) {
  let yaContado = false;
  try { yaContado = localStorage.getItem(CLAVE_CONTADO) === '1'; } catch { /* modo incognito */ }

  // A quien ya esta contado solo se le lee el total; no vuelve a sumar
  // por mucho que entre.
  const url = yaContado ? SERVICIO.get : SERVICIO.hit;

  if (!yaContado) {
    try { localStorage.setItem(CLAVE_CONTADO, '1'); } catch { /* da igual */ }
  }

  pedir(url)
    .then((total) => {
      if (Number.isFinite(total)) alRecibir(total);
    })
    .catch(() => {
      // Silencio a proposito: que el contador no funcione no es un
      // problema del jugador, y llenarle la consola de rojo por esto
      // solo taparia los errores que si importan.
    });
}

/** Una peticion con tiempo limite, que nunca se queda colgada. */
async function pedir(url) {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), TIEMPO_LIMITE);

  try {
    const res = await fetch(url, { signal: corte.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Number(SERVICIO.leer(json));
  } finally {
    clearTimeout(reloj);
  }
}

/**
 * Pinta el numero con los puntos de los miles (1.234), que es como se
 * escriben en castellano.
 */
export function formatear(n) {
  return Math.max(0, Math.floor(n)).toLocaleString('es-ES');
}
