/**
 * emoteAnim.js
 * ---------------------------------------------------------------
 * COMO SE MUEVE EL CUERPO en cada emote.
 *
 * Vive aparte de playerSprite.js a proposito: ahi estan las poses del
 * juego (andar, saltar, nadar, planear), que son pocas y no cambian.
 * Los emotes en cambio se van a ir anadiendo, y no hay razon para que
 * cada baile nuevo engorde el dibujo del personaje.
 *
 * Cada funcion recibe el objeto de pose ya inicializado (los mismos
 * angulos que usa playerSprite) y `t`, los segundos que lleva bailando,
 * y lo unico que hace es tocar angulos. Nada de dibujar.
 *
 * Convenio de los angulos, igual que en playerSprite:
 *   0 = miembro colgando recto hacia abajo
 *   positivo = hacia delante
 */

/**
 * Aplica la animacion de un emote sobre una pose.
 *
 * @param {object} st    pose (se modifica en el sitio)
 * @param {string} anim  id de la animacion (ver data/emotes.js)
 * @param {number} t     segundos desde que empezo
 */
export function applyEmote(st, anim, t) {
  switch (anim) {
    case 'saludo':      saludo(st, t); break;
    case 'aplauso':     aplauso(st, t); break;
    case 'floss':       floss(st, t); break;
    case 'robot':       robot(st, t); break;
    case 'sentadillas': sentadillas(st, t); break;
    case 'victoria':    victoria(st, t); break;
    case 'dormir':      dormir(st, t); break;
    case 'guitarra':    guitarra(st, t); break;
    default:            saludo(st, t);
  }
}

/* =============================================================
   GESTOS CORTOS
   ============================================================= */

/** Levanta el brazo y lo mueve de lado a lado. */
function saludo(st, t) {
  const agita = Math.sin(t * 9);

  st.legFront = 0.10; st.legBack = -0.10;
  // Brazo delantero arriba del todo (casi 180 grados) y agitando.
  st.armFront = 2.6 + agita * 0.25;
  st.elbowFront = 0.15;
  st.armBack = -0.12;
  st.elbowBack = 0.2;
  st.lean = 0.03;
  st.bob = Math.sin(t * 4) * 0.6;
}

/** Palmas delante del pecho. */
function aplauso(st, t) {
  // Onda rapida: las manos se juntan y se separan.
  const golpe = Math.abs(Math.sin(t * 8));

  st.legFront = 0.08; st.legBack = -0.08;
  st.armFront = 1.35 + golpe * 0.25;
  st.armBack = 1.35 - golpe * 0.25;
  st.elbowFront = 1.1;
  st.elbowBack = 1.1;
  st.lean = 0.04;
  // Un tironcito hacia arriba en cada palmada.
  st.bob = -golpe * 1.2;
}

/* =============================================================
   BAILES EN BUCLE
   ============================================================= */

/**
 * El clasico: los brazos van a un lado y las caderas al contrario.
 * Lo que lo hace reconocible es justo eso, que van al reves.
 */
function floss(st, t) {
  const ritmo = Math.sin(t * 7);
  const contra = Math.sin(t * 7 + Math.PI);

  st.armFront = 0.5 + ritmo * 1.5;
  st.armBack = -0.5 + ritmo * 1.5;
  st.elbowFront = 0.5;
  st.elbowBack = 0.5;

  // Piernas y cadera al reves que los brazos
  st.legFront = contra * 0.22;
  st.legBack = -contra * 0.22;
  st.lean = contra * 0.14;
  st.bob = Math.abs(ritmo) * 1.4;
}

/**
 * A TIRONES. El truco es cuantizar el tiempo: en vez de un seno suave,
 * se salta de posicion en posicion, y por eso parece una maquina.
 */
function robot(st, t) {
  const paso = Math.floor(t * 5) % 4;
  const brazos = [
    [1.6, 0.0], [1.6, 1.6], [0.0, 1.6], [0.0, 0.0],
  ][paso];

  st.armFront = brazos[0];
  st.armBack = brazos[1];
  st.elbowFront = 1.35;
  st.elbowBack = 1.35;
  st.legFront = 0.06; st.legBack = -0.06;
  st.lean = (paso % 2 === 0 ? 1 : -1) * 0.07;
  st.bob = paso % 2 === 0 ? 0 : -1.2;
}

/** Arriba y abajo, con los brazos al frente. */
function sentadillas(st, t) {
  const baja = (Math.sin(t * 4) + 1) / 2;    // 0 arriba, 1 abajo

  st.legFront = 0.30 * baja + 0.05;
  st.legBack = -0.30 * baja - 0.05;
  st.kneeFront = 1.15 * baja;
  st.kneeBack = 1.15 * baja;
  st.armFront = 1.5;
  st.armBack = 1.4;
  st.elbowFront = 0.15;
  st.elbowBack = 0.15;
  st.lean = 0.10 * baja;
  // La cadera baja de verdad: sin esto solo dobla las rodillas.
  st.hipY = -22 + baja * 9;
  st.headY = -50 + baja * 9;
}

/** Saltitos con los brazos arriba, celebrando. */
function victoria(st, t) {
  const salto = Math.abs(Math.sin(t * 5));
  const abre = Math.sin(t * 5);

  st.armFront = 2.5 + abre * 0.35;
  st.armBack = 2.5 - abre * 0.35;
  st.elbowFront = 0.1;
  st.elbowBack = 0.1;

  st.legFront = 0.14 + salto * 0.2;
  st.legBack = -0.14 - salto * 0.2;
  st.kneeFront = salto * 0.5;
  st.kneeBack = salto * 0.5;

  st.bob = -salto * 3.5;
  st.lean = abre * 0.05;
}

/** Tumbado y roncando. */
function dormir(st, t) {
  const respira = Math.sin(t * 1.6);

  // Se tira al suelo: la cadera baja casi hasta los pies y el torso se
  // inclina del todo. El giro entero lo hace quien dibuja (ver
  // playerSprite), aqui solo se le da la postura.
  st.hipY = -8;
  st.headY = -20;
  st.legFront = 1.3; st.legBack = 1.15;
  st.kneeFront = 0.5; st.kneeBack = 0.35;
  st.armFront = 1.5; st.armBack = 1.35;
  st.elbowFront = 0.6; st.elbowBack = 0.5;
  st.lean = 0.55;
  st.bob = respira * 0.9;
  st.dormido = true;    // lo lee playerSprite para pintar las "z"
}

/** Guitarra imaginaria: una mano rasga y la otra sube y baja el mastil. */
function guitarra(st, t) {
  const rasgueo = Math.sin(t * 11);
  const salto = Math.abs(Math.sin(t * 2.6));

  // Mano que rasga, a la altura de la cintura
  st.armFront = 0.95 + rasgueo * 0.35;
  st.elbowFront = 0.85;
  // Mano del mastil, mas arriba y abierta
  st.armBack = 1.9;
  st.elbowBack = 1.25;

  st.legFront = 0.24; st.legBack = -0.24;
  st.kneeFront = 0.12;
  st.lean = -0.12;                 // echado hacia atras, como debe ser
  st.bob = -salto * 1.6;
  st.guitarra = true;              // lo lee playerSprite para pintarla
}
