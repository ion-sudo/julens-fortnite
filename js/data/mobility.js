/**
 * mobility.js
 * ---------------------------------------------------------------
 * TIROLINAS Y SALTADORES repartidos por el mapa (solo datos).
 *
 * El mapa mide casi 26.000 px y entre zona y zona hay canales de 260 px.
 * Estas dos cosas resuelven los dos problemas de moverse por el:
 *
 *   TIROLINAS   cruzan largo y en diagonal, sobre todo de un sitio al
 *               siguiente por encima de los canales
 *   SALTADORES  suben rapido, para llegar a plataformas altas y tejados
 *
 * Las tirolinas se definen por zona con dos anclajes:
 *   from / to   { zone, at, alto }  at = 0..1 dentro de la zona,
 *                                   alto = px por encima del suelo
 */

export const ZIPLINES = [
  // --- De un sitio al siguiente, cruzando el canal ---
  // Son pocas y bien puestas: llenar el cielo de cuerdas quitaba gracia
  // a moverse por el mapa, y ademas se cruzaban entre ellas.
  { from: { zone: 'pinar',   at: 0.88, alto: 300 }, to: { zone: 'cala',    at: 0.10, alto: 210 } },
  { from: { zone: 'cala',    at: 0.90, alto: 250 }, to: { zone: 'villa',   at: 0.08, alto: 320 } },
  { from: { zone: 'cumbre',  at: 0.90, alto: 280 }, to: { zone: 'fabrica', at: 0.08, alto: 340 } },
  { from: { zone: 'mansion', at: 0.90, alto: 300 }, to: { zone: 'dunas',   at: 0.10, alto: 240 } },

  { from: { zone: 'puerto',  at: 0.90, alto: 300 }, to: { zone: 'villa',   at: 0.08, alto: 280 } },
  { from: { zone: 'dunas',   at: 0.90, alto: 280 }, to: { zone: 'volcan',  at: 0.10, alto: 300 } },

  // --- Dentro de un sitio, las dos mas utiles ---
  { from: { zone: 'villa',   at: 0.18, alto: 300 }, to: { zone: 'villa',   at: 0.72, alto: 190 } },
  { from: { zone: 'feria',   at: 0.15, alto: 330 }, to: { zone: 'feria',   at: 0.78, alto: 200 } },
];

/**
 * SALTADORES.
 *   at     donde va, dentro de la zona
 *   up     impulso hacia arriba
 *   push   empujon hacia delante (positivo = a la derecha)
 */
export const JUMP_PADS = [
  { zone: 'pinar',   at: 0.20, up: 1250, push: 260 },
  { zone: 'pinar',   at: 0.62, up: 1150, push: -220 },
  { zone: 'cala',    at: 0.35, up: 1300, push: 280 },
  { zone: 'cala',    at: 0.78, up: 1200, push: 200 },
  { zone: 'villa',   at: 0.26, up: 1350, push: 240 },
  { zone: 'villa',   at: 0.60, up: 1250, push: -260 },
  { zone: 'cumbre',  at: 0.22, up: 1400, push: 300 },
  { zone: 'cumbre',  at: 0.66, up: 1250, push: -240 },
  { zone: 'fabrica', at: 0.30, up: 1350, push: 260 },
  { zone: 'fabrica', at: 0.62, up: 1300, push: -240 },
  { zone: 'mansion', at: 0.28, up: 1400, push: 280 },
  { zone: 'mansion', at: 0.70, up: 1250, push: -220 },
  { zone: 'dunas',   at: 0.18, up: 1300, push: 260 },
  { zone: 'dunas',   at: 0.62, up: 1350, push: -260 },
  // Dos por cada sitio nuevo, igual que en los demas.
  { zone: 'puerto',  at: 0.24, up: 1400, push: 280 },
  { zone: 'puerto',  at: 0.72, up: 1300, push: -240 },
  { zone: 'feria',   at: 0.28, up: 1450, push: 260 },
  { zone: 'feria',   at: 0.66, up: 1300, push: -260 },
  { zone: 'volcan',  at: 0.22, up: 1350, push: 280 },
  { zone: 'volcan',  at: 0.68, up: 1400, push: -240 },
];

/** Lo rapido que se desliza uno por una tirolina. */
export const ZIP_SPEED = 720;

/** A que distancia de la cuerda te enganchas. */
export const ZIP_GRAB = 30;
