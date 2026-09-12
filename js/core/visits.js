/**
 * visits.js
 * ---------------------------------------------------------------
 * CONTADOR DE VISITAS: cuanta gente ha entrado al juego.
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
  hit: 'https://abacus.jasoncameron.dev/hit/julensfortnite/visitas',
  get: 'https://abacus.jasoncameron.dev/get/julensfortnite/visitas',
  leer: (json) => json?.value,
};

/** Si tarda mas que esto, se deja estar. */
const TIEMPO_LIMITE = 6000;

/**
 * Marca de "ya te he contado en esta sesion".
 *
 * Sin esto, recargar la pagina sumaria otra visita, y el vigilante de
 * arranque (js/watchdog.js) recarga solo cuando hace falta: una persona
 * podia contar tres veces. Con sessionStorage se cuenta UNA vez por
 * pestana abierta, que es lo que la gente entiende por "una visita".
 */
const CLAVE_SESION = 'fc-visita-contada';

/**
 * Pide el numero y lo entrega.
 *
 * @param {(total:number) => void} alRecibir  lo llama con el total si
 *   todo va bien. Si algo falla, NO lo llama: el contador se queda sin
 *   ensenar y el juego sigue igual.
 */
export function contarVisita(alRecibir) {
  let yaContada = false;
  try { yaContada = sessionStorage.getItem(CLAVE_SESION) === '1'; } catch { /* modo incognito */ }

  // Si ya se conto en esta pestana, solo se lee el total.
  const url = yaContada ? SERVICIO.get : SERVICIO.hit;

  if (!yaContada) {
    try { sessionStorage.setItem(CLAVE_SESION, '1'); } catch { /* da igual */ }
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
