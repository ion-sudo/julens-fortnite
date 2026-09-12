# JULEN'S FORTNITE

Battle royale 2D de **vista de lado** (plataformas) hecho con HTML + CSS + JavaScript puro
(canvas 2D, sin librerias ni build step).

> **Estado: PASO 3**
> - Paso 1 — escenario + personaje (andar, saltar, agacharse, correr con barra de energia) + camara.
> - Paso 2 — menu principal, pavos, tienda de cosmeticos, taquilla y guardado en el navegador.
> - Paso 3 — inventario de 6 ranuras, apuntado y disparo con el raton, 10 armas, 10 curas,
>   rarezas por color y botin repartido por la isla.
> - Paso 4 — cofres en 7 sitios con nombre, 50 bots con IA y nombres unicos,
>   contador de vivos, zona segura que se cierra y final de partida.
> - Paso 5 — municion por tipos, cajas de balas, lagos con nado y buceo, y peces.
> - Paso 6 — mapa generado desde las zonas, 7 ambientes distintos,
>   edificios con puertas y reparto de los participantes por todo el mapa.
> - Paso 7 — bus de batalla y paravela, 75 jugadores, mapa de 17 800 px,
>   mapa con la tecla M e indice espacial para el rendimiento.
> - Paso 8 — **construccion**: talar arboles con el pico para sacar madera,
>   modo construccion con `Q` y pared / suelo / rampa con vida, solidas y
>   rompibles por todos (jugador y bots).
> - Paso 9 — **casas por dentro**: separacion garantizada entre edificios,
>   plantas con escaleras que se suben andando, fachada que tapa el
>   interior hasta que entras, y puertas que se abren y se cierran.
> - Paso 10 — **tienda ampliada**: 53 cosmeticos (22 skins, 16 picos y
>   15 paravelas), con 8 peinados/cascos, 8 picos y 8 paravelas de arte nuevo.
> - Paso 11 — **misiones**: 19 desafios con recompensa en pavos, su
>   pantalla en el menu y progreso guardado; y para que los edificios
>   altos no corten el paso, cornisas para escalarlos y puerta trasera.
> - Paso 15 — **movilidad**: vehiculos conducibles con `V`, tirolinas
>   y saltadores repartidos por la isla. Los bots tambien los usan.
> - Paso 14 — **pase de batalla**: 100 niveles con ruta gratis y premium,
>   22 cosmeticos exclusivos, compra por 4000 pavos y entrega automatica
>   de recompensas al subir de nivel.
> - Paso 13 — **niveles y XP**: se gana experiencia jugando, se sube de
>   nivel y la barra de progreso vive en la cabecera del menu.
> - Paso 16 — **mapa de 10 sitios**: tres sitios nuevos intercalados
>   (Puerto Ancla, Feria Fortuna y Volcan Ceniza), mapa de 25 840 px,
>   tinte de cielo por ambiente y decorado indexado por columnas.
> - Paso 17 — **selector de modos y JULEN BLITZ**: el menu abre a
>   Julen Royale y a la pantalla MAS JUEGOS, y el modo nuevo es un
>   blitz royale expres de 32 jugadores en medio mapa, sin construir,
>   con la misma arma para todos, tormenta rapida, nivel Blitz,
>   bendiciones y cofres dorados.
> - Paso 12 — **minijuegos**: boton en el menu, pantalla de seleccion con
>   los 7 modos y sus records. Los modos en si van llegando por partes:
>   ya se pueden jugar **los siete**.

## Como arrancarlo

Necesita un servidor local (el juego usa modulos ES, no funciona abriendo el HTML con doble clic).

```bash
python3 dev-server.py
```

Luego abre: **http://localhost:8000**

`dev-server.py` es igual que `python3 -m http.server 8000` pero manda cabeceras de
**no-cache**. Usalo siempre: es la causa numero uno de fallos raros (ver abajo).

## Si el juego no arranca

Sintoma tipico: se ve el menu pero el **lienzo esta en blanco**, el personaje de la
vitrina no aparece y **el boton JULEN ROYALE no hace nada**.

Casi siempre es la **cache del navegador**: se ha quedado con la version antigua de
algun modulo y la mezcla con las nuevas, asi que algo revienta al arrancar.

El juego **se arregla solo**: un vigilante (`js/watchdog.js`) comprueba a los 2 segundos
si ha arrancado y, si no, recarga una vez saltandose la cache. Si tras ese intento sigue
fallando, ensena un panel con **el error exacto** y botones para reintentar o copiarlo.

Ese vigilante es un script **clasico** (sin `type="module"`) a proposito: cuando el
navegador mezcla versiones cacheadas, el fallo ocurre al *enlazar* los modulos, antes de
que corra una sola linea del juego. Un try/catch de dentro no puede enterarse; este si.

Si prefieres hacerlo a mano:

- **Safari**: Menu *Desarrollo -> Vaciar cache* (o `Cmd + Option + E`) y recarga con
  `Cmd + R`. Si no ves el menu Desarrollo: *Ajustes -> Avanzado -> Mostrar funciones
  para desarrolladores web*.
- **Chrome / Edge**: `Cmd + Shift + R` (Mac) o `Ctrl + Shift + R`.
- Y arranca el servidor con `python3 dev-server.py`, que ya manda no-cache.

Por si acaso, el juego **no usa APIs recientes de canvas** (como `ctx.roundRect`, que
solo existe en Safari 16.4+): todo el dibujo va con funciones propias compatibles con
navegadores mas antiguos.

## Controles

| Tecla            | Accion                              |
|------------------|-------------------------------------|
| `A` / `D`        | Mover a izquierda / derecha         |
| `W` o `Espacio`  | Saltar (salto variable)             |
| `S` o `Ctrl`     | Agacharse                           |
| `Shift`          | Correr (gasta la barra de corrida)  |
| `S` + salto      | Bajarse de una plataforma fina      |
| `Clic izq.`      | Disparar / golpear / tomar una cura |
| `Clic der.`      | Apuntar (mira de precision)         |
| `F`              | Cajita 1: el pico                   |
| `1` … `5`        | Cajitas 2 a 6: armas y curas        |
| `E`              | Abrir **y cerrar** puertas, abrir cofres, recoger objetos |
| `R`              | Soltar lo equipado                  |
| `Espacio` (en agua) | **Bucear** hacia el fondo        |
| `Q`              | Entrar/salir del **modo construccion** |
| `Z` / `X` / `C`  | Pared / suelo / rampa (10 de madera) |
| `V`              | Subir / bajar de un vehiculo        |
| `M`              | Abrir el mapa de la isla            |
| `Esc`            | Terminar partida (+50 pavos)        |
| `H`              | Ocultar/mostrar la ayuda            |
| `F1`             | Ver hitboxes + panel de depuracion  |

## La portada de carga

Lo primero que se ve al abrir el juego, al estilo de la pantalla de "conectando" del
Fortnite de verdad: un vortice morado de rayos y anillos girando, el logo grande en medio
con un brillo que recorre las letras, cuatro personajes saliendo del portal y, abajo a la
izquierda, **CARGANDO...** con su barra y frases que van cambiando.

Los cuatro personajes se dibujan con **las mismas skins y paravelas del juego**
(`drawPlayer`), no son un dibujo aparte: si manana cambia una skin, cambia tambien en la
portada.

Dos decisiones que parecen detalles y no lo son:

- **El bucle va con `setInterval`, no con `requestAnimationFrame`.** rAF se para en cuanto
  el navegador decide que la pagina no se esta viendo, y si eso pasa justo en el arranque
  la portada se queda **congelada tapando el juego para siempre**. Son tres segundos de
  animacion sencilla; un intervalo fijo la mueve igual y no puede colgarse. Ademas hay una
  red debajo: pase lo que pase, a los 8 segundos se quita sola.
- **Los tiempos van por RELOJ REAL, no sumando el dt de cada frame.** Con la suma de dt,
  en un navegador que da pocos frames la barra tardaba veinte segundos en llegar al final.
  La animacion (rayos, brillo, flotar) si usa dt, porque ahi lo que importa es que se vea
  suave.

## Teclas: por posicion, con respaldo por letra

El teclado se lee por `e.code`, o sea por la **posicion fisica** de la tecla: la A esta
donde esta aunque el teclado sea frances. Eso es lo correcto y es lo que se usa siempre.

Pero algunas formas de escribir —teclados en pantalla, escritorio remoto, herramientas de
automatizacion— mandan el evento **sin `code`, solo con `key`**, y ahi el juego se
quedaba completamente sordo: ni la B de los emotes, ni la M del mapa, ni nada. Ahora,
**solo cuando no viene `code`**, se busca por letra. El camino normal no cambia.

## Perfil, estadisticas y rachas

Una pantalla propia en el menu con tres bloques.

**El nombre.** El primero es **gratis**; cada cambio cuesta **500 pavos**. La validacion
(minimo 3 letras, maximo 16, no vale el que ya tienes, tienes que poder pagarlo) vive en
`Profile.setPlayerName()` y no en la pantalla: la interfaz puede cambiar, las reglas no.
Una vez puesto sale **encima de tu personaje** en partida, en verde, igual que las chapas
de los bots.

**Las estadisticas** se apuntan en `Game.endMatch()`, en un solo sitio, para que cuenten
igual salgas por Escape o te eliminen: victorias, eliminaciones, partidas, % de
victorias, kills por partida, mejor partida y mejor puesto.

**La racha** sube al ganar y **vuelve a cero al perder** — sin lo segundo no seria una
racha, seria otro contador de victorias. Se guarda tambien la mejor de siempre.

Todo va a `localStorage` con el resto del perfil.

## Emotes

Ocho bailes y gestos, dos gratis y el resto por pavos. Se abren con la tecla **B** (que
estaba libre, y es la del Fortnite de verdad) y se eligen con el raton o con **1..6**
mientras la rueda esta abierta.

### Son una categoria mas del catalogo

Se compran en la **TIENDA** (pestana *Emotes*) y se ponen en la rueda desde la
**TAQUILLA**, exactamente igual que una skin — y tambien desde el **perfil**, que ensena
los ocho juntos.

Eso no son tres pantallas con tres codigos: los emotes se anadieron como una **categoria
mas** en `data/cosmetics.js`, con su `type: 'emote'`. Con eso, las pestanas, los
contadores, la rejilla, las vistas previas, `buy()`, `equip()` y `isOwned()` los tratan
como a cualquier otro cosmetico sin un solo caso especial. El perfil llama a **las mismas
acciones**, asi que comprar uno hace lo mismo se haga desde donde se haga.

Solo hubo que separar dos cosas, porque de verdad se comportan distinto:

- **"Equipado" no es un estado, son seis.** De skins, picos y paravelas se lleva UNO; de
  emotes caben seis a la vez. Por eso `isEquipped('emote', id)` es "esta en la rueda", y
  el boton de un emote ya equipado sigue siendo pulsable: quitarlo es justo como se hace
  sitio cuando las seis ranuras estan llenas.
- **Al comprarlo se pone solo** en el primer hueco libre. Comprar un emote y tener que ir
  a otra pantalla a equiparlo seria un paso de mas.

Los perfiles guardados antes de este cambio llevaban su propia lista de emotes; al cargar
se pasan a `owned.emote` y se olvida la vieja.

### El clic con el que eliges no cuenta como disparar

El emote duraba **un frame**. Elegias con el raton, el personaje se ponia a bailar, y al
frame siguiente el corte por "estas disparando" veia el boton **todavia pulsado** —un clic
normal dura unos seis frames— y lo paraba. Desde fuera parecia que el personaje
simplemente no hacia el emote.

Ahora, despues de elegir, el raton **no cuenta hasta que sueltas el boton**. Un clic
nuevo si lo corta, como debe ser. Y hay 0,2 s de respiro por si acabas de elegir con las
teclas 1..6 y todavia tienes alguna pulsada.

### Bailando estas vendido

No disparas, no construyes y no te curas, y se corta en cuanto **te mueves, saltas,
disparas o te dan un tiro**. Sin eso un emote seria una animacion bonita sin ninguna
consecuencia; con ello, sacar un baile en mitad de la partida es una decision.

### Como se mueven

Las animaciones viven en [`js/entities/emoteAnim.js`](js/entities/emoteAnim.js), aparte
del dibujo del personaje: ahi estan las poses del juego (andar, saltar, nadar, planear),
que son pocas y no cambian, mientras que los emotes se van a ir anadiendo. Cada emote es
una funcion que solo toca angulos; no dibuja nada.

Dos detalles que los hacen reconocibles:

- **El Robot** no usa un seno suave: **cuantiza el tiempo** y salta de postura en
  postura. Por eso parece una maquina y no alguien bailando despacio.
- **El Bailecito** manda los brazos a un lado y las caderas **al contrario**. Eso es
  justo lo que lo hace reconocible.

La guitarra y las "z" de la siesta las pide la propia animacion (`st.guitarra`,
`st.dormido`) y las pinta el sprite al final, por delante de todo.

## Modos de juego

"Jugar" ya no es una sola cosa. Hay un **selector de modos** (`MAS JUEGOS`), como en
Fortnite, y la lista de modos vive en [`js/data/modes.js`](js/data/modes.js):

| Modo | Que es | Estado |
|------|--------|--------|
| **Julen Royale** | El battle royale completo: 75 jugadores, los 10 sitios, con construccion | Jugable |
| **Julen Duos** | Lo mismo, pero de dos en dos: 37 parejas y reanimacion | Jugable |
| **Julen Escuadron** | Equipos de cuatro: 19 escuadrones y reanimacion | Jugable |
| **Julen Blitz** | Blitz royale expres: 32 jugadores, medio mapa, sin construccion, tormenta rapida, nivel Blitz, cinco armas propias y exoticas | Jugable |

Un MODO no es lo mismo que un minijuego. Los minijuegos son entrenamiento y no cuentan
para nada; un modo es una partida de verdad y da **pavos, XP, misiones y progreso del
pase**.

Elegir modo pasa por un unico camino: el boton grande del inicio y las tarjetas del
selector usan los dos `data-action="mode"` con su `data-id`, que acaba en
`game.startMatch(loadout, modo)`. Ahi se guarda `game.modeDef` **antes** de montar nada,
para que los sistemas puedan consultar con que reglas se juega.

### Las reglas viven en los datos

Lo unico que separa un modo de otro es su bloque `rules`. Los sistemas son los mismos:
`startMatch()` los monta con esas reglas en vez de tener un camino de codigo por modo.

| Regla | Que hace | Royale | Blitz |
|-------|----------|--------|-------|
| `bots` | Cuantos enemigos | 74 | 31 |
| `build` | Si se puede talar y construir | si | **no** |
| `arena` | Recorta el mapa a un tramo de zonas | todo | Fabrica → Dunas |
| `busTime` | Lo que tarda el bus en cruzar | 30 s | 16 s |
| `storm` | Pisa los ajustes de la tormenta | los de CONFIG | mucho mas duros |
| `startWeapon` | Si todos empiezan con la MISMA arma | no | **si** |
| `chests` / `buildingLoot` / `worldLoot` | Cuanto botin se siembra | 30 / x1 / 34 | 8 / x0,5 / 22 |
| `blitz` | Nivel Blitz, bendiciones y cofres dorados | no | **si** |

**Anadir un modo nuevo** son tres cosas: su entrada en `data/modes.js` (con sus reglas),
su dibujo en [`js/ui/modeIcon.js`](js/ui/modeIcon.js) y, si trae alguna regla que aun no
existe, el sitio donde se aplique. La pantalla del selector se pinta sola desde la lista.

## Duos y escuadrones

El **individual sigue exactamente igual**: no hay un camino de codigo para "en equipo" y
otro para "solo". Lo que hay es una sola regla — `teamSize` — y el modo individual es
simplemente **75 equipos de uno**, donde `areAllies()` responde que no a todo.

| Modo | teamSize | Equipos que salen |
|------|----------|-------------------|
| Julen Royale / Blitz | 1 | 75 (o 32) de uno |
| Julen Duos | 2 | 37 parejas y un suelto (75 es impar) |
| Julen Escuadron | 4 | 18 de cuatro y uno de tres |

Tu equipo es **siempre el 0**, y tus companeros se eligen **al azar** de entre los bots:
si se cogieran los primeros de la lista te tocarian siempre los que aparecen en el mismo
sitio del mapa, porque los bots se crean en orden de posicion.

### Sin fuego amigo

Una sola funcion (`areAllies`) y todos los que reparten dano preguntan por ella: las
**balas**, las **explosiones**, las **torretas**, las **trampas** y el **pico**. La onda
de choque es la excepcion a proposito: SI empuja a los companeros, porque no les hace
dano y de hecho les viene bien para salir de un apuro.

### Se distinguen de un vistazo

Los aliados llevan la **chapa verde con borde**, un **galon** encima y la barra de vida en
verde; los enemigos siguen en rojo. Y abajo a la derecha esta **TU ESCUADRON**: cada
companero con su vida, y en naranja el que este en el suelo.

Arriba, debajo de VIVOS, aparece el contador de **ESCUADRONES**. Es el numero que de
verdad importa ahi: 30 vivos repartidos en 8 escuadrones no es lo mismo que 30 sueltos.

### Los aliados no te dejan tirado

Un bot aliado se comporta como cualquier otro salvo por dos cosas: no dispara a los suyos
y **no se aleja mas de 1200 px de ti**. Sin esa correa se repartian por el mapa como
cualquier bot y tu escuadron dejaba de existir a los treinta segundos.

## Abatidos y reanimacion

En equipo, quedarse a cero **no te mata**: te deja ABATIDO, tirado en el suelo,
arrastrandote a un tercio de la velocidad de agachado, sin poder disparar, construir ni
curarte. Tienes una vida aparte de **90** que baja sola (**3,4 por segundo**, o sea unos
**26 segundos**) y baja mas rapido si te rematan a tiros.

Un companero te levanta acercandose y **manteniendo la E 3 segundos**, y te deja con
**35 de vida**. Sales del apuro, pero sales tocado. Los bots aliados hacen exactamente lo
mismo: te levantan a ti y tu a ellos.

**Si eres el ultimo de tu equipo en pie, mueres del tiron.** Sin esa regla seria
inmortalidad: nadie podria levantarte nunca. Se recalcula cada frame, asi que en cuanto
cae tu ultimo companero dejas de poder quedarte en el suelo.

Y se gana cuando **no queda ningun escuadron enemigo**, aunque hayan caido companeros
tuyos: que es justo la gracia de jugar en equipo.

### Cuatro cosas que costaron

Que un bot aliado levante a alguien parece una tonteria y fueron cuatro fallos seguidos,
todos del mismo tipo: **el bot llegaba y no remataba**.

1. **`axisX` es de solo lectura.** Sale de las dos teclas de direccion, asi que pararlo
   no es asignarle cero, es soltar las dos.
2. **El umbral de "ya estoy al lado" era mio, no el de verdad.** Con 40 px el bot se
   plantaba a 72 —que es donde `moveTowards` da el destino por bueno— y se quedaba
   mirando a su companero desangrarse. Ahora usa el mismo `inRange()` que el jugador.
3. **La barra se vaciaba mas rapido de lo que se llenaba.** Los bots lejos del jugador se
   simulan **una vez de cada tres**; en los otros dos frames nadie tocaba la barra y el
   decaimiento se la comia. Ahora se guarda **cuando se toco por ultima vez** y hay
   0,4 s de margen antes de empezar a vaciarla.
4. **El antiatascos.** Quien reanima esta quieto a proposito, y a los 2,8 segundos el
   sistema lo daba por atascado y lo mandaba 500 px en direccion contraria — justo antes
   de terminar. Estar quieto queriendo no es estar atascado.

Con los cuatro arreglados se levantan **2-4 companeros por partida**. Antes, cero.

Y una trampa de herencia: `Bot extends Player`, asi que una marca `isPlayer` puesta en el
jugador **la heredaban los 74 bots** y el aviso de "te han levantado" salia siempre. Se
compara contra el objeto, no contra una marca.

### La distancia se mide de pies a pies

De centro a centro no valia: un abatido esta **tumbado**, su cuerpo queda mas bajo, y
estando justo a su lado la cuenta daba 85 px cuando el limite eran 82. Los pies son lo
que de verdad dice si estas encima de alguien, y es la misma medida que usan los cofres.

## Julen Blitz

Un battle royale **expres**: **32 jugadores** (tu y 31 bots) en **medio mapa**, partidas
de **un par de minutos** y **nada de construir**.

### El mapa reducido

No hay un segundo mundo. Se juega en un **TRAMO** del de siempre —Fabrica Tornillo,
Feria Fortuna, Mansion Dorada y Dunas Secas, 10.060 de los 25.840 px— y ese tramo se pasa
como `bounds` a todo lo que siembra cosas: apariciones, cofres, botin suelto, vehiculos,
tirolinas, saltadores, edificios y la propia tormenta. Generar otro mundo habria obligado
a duplicar generacion, decorado y edificios para siempre.

Primero se probo con **tres** sitios (7360 px) y las partidas se acababan en **menos de
un minuto**: 32 personas armadas a 230 px unas de otras se encuentran nada mas tocar el
suelo y no queda partida que jugar. Con cuatro sitios salen **83-109 segundos**, que ya
es una partida.

### Igualdad al empezar

Se sortea **UN arma para toda la partida** y esa llevan el jugador y los 31 bots, con
municion de sobra. No entran ni el francotirador (32 personas disparando de lejos es una
espera, no una partida) ni el minigun ni el Julen, y siempre sale en rareza **poco
comun**, para que la mejora se note al subir de nivel Blitz.

### Sin construccion

Se apaga en **un solo sitio** (`BuildManager.enabled` y `HarvestManager.enabled`). Si se
hubiera hecho tocando el pico, la IA de los bots, el HUD y el raton por separado,
bastaria olvidarse de uno para que se colara una pared. Asi no puede construir **nadie**:
la tecla `Q` avisa y no hace nada, los bots no reciben madera de salida ni pueden colocar
piezas, y no hay arboles que talar. Medido: **0 construcciones** en una partida entera.

### Nivel Blitz y bendiciones

Como todos empiezan iguales, la unica forma de mejorar es jugar. Cada **baja** da 110 XP
de nivel Blitz y cada **segundo** aguantando con la tormenta ya cerrandose da 7. Al subir
de nivel (hasta el 8) llegan solas dos cosas:

- un **arma mejor**: rara, rara, epica, epica, legendaria, legendaria y mitica;
- una **bendicion**, que se **acumula** con las que ya tengas.

| Nivel | Arma que cae del cielo |
|-------|------------------------|
| 2 y 3 | Rara |
| 4 y 5 | Epica |
| 6 | Legendaria |
| 7 | Mitica |
| **8** | **EXOTICA** |

Los ocho niveles se ven **todo el rato** en el HUD, en una escalera de barritas: las que
ya has pasado van a todo color y las que faltan quedan apagadas **pero con su color**.
Que el ultimo peldano sea turquesa cuenta solo que arriba del todo hay una exotica
esperando.

### El arma cae del cielo

Al subir de nivel el arma **no aparece en el inventario**: cae en una **caja con
paracaidas** justo encima de ti, con un haz de luz del color de su rareza y un anillo en
el suelo marcando donde va a posarse. Se hace asi porque subir de nivel tiene que
**verse**: el paracaidas se ve desde lejos, avisa a los demas de que acabas de subir y te
obliga a decidir si vas a por el ahora o cuando acabe el tiroteo.

Y en medio de la pantalla sale el **cartelon**: `NIVEL 4` en grande, debajo el arma que
cae y debajo la bendicion. Entra de golpe, aguanta y se desvanece.

La caja se posa en la **primera superficie que haya bajo tus pies**, tejados incluidos.
La primera version usaba el suelo del terreno y la caja atravesaba el tejado de la nave
en la que estabas para aterrizar en la calle. Y si lo unico que hay debajo es agua, se
busca a los lados: una caja que cae al mar es un premio perdido.

| Bendicion | Que hace |
|-----------|----------|
| Furia | +18% de dano |
| Ligereza | +12% de velocidad |
| Vigor | +25 de vida maxima (y te cura lo mismo) |
| Gatillo Rapido | +20% de cadencia |
| Sanguijuela | Te curas 30 por cada baja |
| Coraza | +35 de escudo al momento |

Se prefiere una que **no tengas** todavia, para que la primera vuelta sea variada; a
partir de ahi se repiten y suman (el HUD marca `x2`, `x3`...).

Las bendiciones no viven en el modo: son **multiplicadores del propio jugador**
(`player.boosts`) que leen el movimiento y el combate. Asi ni el que dispara ni el que
corre saben que existe este modo, y fuera del Blitz valen todos 1, o sea que no cambian
nada.

### Las exoticas

El techo del juego: pegan un **145% mas** que un arma comun, mas incluso que una mitica,
y son de un turquesa que no se confunde con ninguna otra rareza. Solo hay **dos formas**
de conseguir una, las dos aqui:

- **llegar al nivel Blitz 8**, el ultimo. Son 1780 XP: en las partidas de prueba, un
  jugador que solo aguanta se queda en el **5 o el 6**, asi que hace falta encadenar
  bajas Y sobrevivir hasta el final. Una cosa sola no basta.
- **un cofre dorado**, con un **10%** de probabilidad. Con seis cofres dorados por
  partida, lo normal es que en una partida entera no salga ninguna.

### Armas propias del Blitz

Cinco armas que **solo salen en este modo**. El Royale se queda con las diez de siempre y
el equilibrio que ya tenia; el campo `modes` de cada arma decide donde aparece, y
`setWeaponPool()` lo fija una vez al empezar la partida. Va por ahi **un solo
interruptor** porque por el sorteo de armas pasan el botin del suelo, los cofres, los
bots y los premios de nivel: encadenar el modo por los cuatro sitios habria sido cuatro
sitios donde olvidarselo.

| Arma | Municion | Que hace |
|------|----------|----------|
| **Ametralladora Ligera** | Media | No para de escupir balas. Bipode y cinta colgando |
| **Revolver Pesado** | Pesada | 74 de dano base por tiro, uno cada tres cuartos de segundo |
| **Lanzallamas** | Energia | 14 disparos por segundo a 330 px. De cerca no hay quien lo aguante |
| **Rifle de Pulsos** | Energia | Preciso, largo y **atraviesa** a todo el que este en fila |
| **Grieta Portatil** | Energia | No dispara: te sube al cielo (ver abajo) |

### La Grieta Portatil

Copiada de la de Fortnite. **No es un arma**: al usarla abre una grieta y te **sube al
cielo**, cayendo, con la paravela lista. Sirve para huir de un tiroteo que llevas perdido
o para cruzar medio mapa de golpe — y en un modo donde no se puede construir una rampa
para escapar, es la unica salida rapida que hay.

No hubo que programar nada para volar: se reutiliza **tal cual** el sistema del bus. Con
el jugador en `flight = 'cayendo'` ya cae, elige donde ir, abre la paravela con Espacio y
aterriza. Lo unico que hace falta es ponerlo arriba. La partida no vuelve a la fase de
bus, asi que la tormenta sigue cerrandose mientras vuelas.

Dos cosas que hubo que atar: los **bots la ignoran** en el suelo (uno sin arma la cogia,
se creia armado y se plantaba delante del enemigo disparando aire) y **no puede tocar**
ni como arma de salida ni como premio de subir de nivel.

### Cofres dorados

Un **tercio** de los cofres del tramo son dorados: de oro, con tres chispas girando y un
resplandor que llega **casi el doble de lejos** que el de un cofre normal. Sueltan un
arma de rareza **epica o mejor** —o exotica, con suerte— y regalan una bendicion. Que se
vean desde tan lejos es a proposito: son el sitio al que va todo el mundo corriendo, y
por lo tanto donde se pelea.

### Cuantos cofres hay

**43 por partida** en el Julen Royale: 18 sueltos por el mapa y 25 dentro de los
edificios. Llegaron a ser **64** —30 sueltos y 34 en las casas— porque al agrandar el
mapa se subieron los sueltos "para mantener la densidad" sin contar los de dentro, que
eran mas que todos los del mapa juntos. Entrar en una casa era llenar el inventario.

### Poco botin, a proposito

En un modo de dos minutos, cada cofre que abres es tiempo que no estas peleando. Asi que
el Blitz tiene **18 cofres** frente a los **64** del Royale, y para bajarlos hubo que
tocar los **dos sitios** de donde salen: los sueltos por el mapa (`chests`) y los de
dentro de las casas (`buildingLoot`), que eran casi tantos como los otros. Ningun
edificio se queda a cero: entrar y encontrarlo vacio no invita a volver a entrar.

Asi el botin se pilla **de camino** a otro sitio, en vez de hacerse una ruta de saqueo.

### Y cuenta para todo

Una partida de Blitz da **pavos, XP de cuenta, misiones y progreso del pase** igual que
una de Royale: pasa por el mismo `endMatch`. El **nivel Blitz** en cambio es solo de la
partida: empieza en 1 cada vez y no tiene nada que ver con el nivel de cuenta.

## Menu, tienda y taquilla

Al abrir el juego aparece el **menu principal**, con el escenario de fondo y la camara
paseando sola. Desde ahi:

- **JULEN ROYALE** — empieza el battle royale completo con la skin, el pico y la
  paravela equipados. Es el boton grande, el atajo al modo de siempre.
- **MAS JUEGOS** — el **selector de modos**: una pantalla con una tarjeta por modo, su
  dibujo, su descripcion y sus cuatro senas de identidad para compararlos de un vistazo.
  De momento estan **Julen Royale** (jugable) y **Julen Blitz** (en camino).
- **TIENDA** — **53 cosmeticos** (22 skins, 16 picos, 15 paravelas) con seis rarezas y
  precio en **pavos**, de 120 a 2600. Se empieza con **0 pavos** y se ganan **50 por
  partida**; los objetos gratuitos ya vienen desbloqueados. No se puede comprar dos
  veces lo mismo ni nada que no te alcance. Cada pestana lleva su contador
  (`Skins 22`), y en la taquilla marca cuantos llevas (`2/22`).

  Las listas se **ordenan solas** de menos a mas raro y, dentro de cada rareza, de mas
  barato a mas caro (`porRarezaYPrecio` en `cosmetics.js`): un cosmetico nuevo se anade
  al final del array y se coloca en su sitio.
- **PASE DE BATALLA** — 100 niveles de recompensas, ruta gratis y ruta premium.
- **MINIJUEGOS** — 7 modos de entrenamiento, cada uno con su record.
- **MISIONES** — 19 desafios con recompensa en pavos. El boton lleva el marcador
  (`3 de 19 cumplidas`).
- **TAQUILLA** — solo lo que ya tienes; ahi eliges que equipar. La vitrina del menu y el
  personaje de la partida reflejan al momento lo equipado.
- **INSTRUCCIONES** — controles y un boton para reiniciar el progreso.

Los pavos, las compras y el equipamiento se guardan en `localStorage`
(clave `fortniteClash.profile.v1`). Si el guardado esta corrupto o contiene objetos que ya
no existen, se ignora esa parte y el juego arranca igualmente.

## Pase de batalla

Cien niveles de recompensas ([`js/data/battlePass.js`](js/data/battlePass.js)) que se
desbloquean con el **nivel de jugador**: no hay que reclamar nada, al subir de nivel te
llevas lo que toque.

Hay dos rutas:

| Ruta | Que trae |
|------|----------|
| **Gratis** | 12 recompensas sueltas (600 pavos y algunos cosmeticos de la tienda) |
| **Premium** | Los 100 niveles: 20 cosmeticos exclusivos, **3500 pavos** y bonus de XP |

El premium cuesta **4000 pavos**. Devuelve 3500 en pavos repartidos por los niveles: no
cubre el precio entero a proposito —la gracia son los cosmeticos— pero sale muy rentable.

### Los 22 cosmeticos exclusivos

Ocho skins, siete picos y siete paravelas que **no se venden en la tienda**: van marcados
con `pass: true` en `cosmetics.js` y solo se consiguen subiendo de nivel. Van de Cadete
Estelar (nivel 1) a **ECLIPSE** (nivel 100), con su pico y su paravela a juego.

Dos detalles que hubo que atar: valen 0 pavos, asi que `_grantFreeItems()` los habria
regalado al empezar (ahora los salta), y la tienda los habria puesto a la venta a precio
cero (ahora los filtra, y su contador tambien).

### La pantalla

Una tarjeta por nivel con **dos casillas**: la gratis arriba y la premium abajo. Las que
ya tienes salen a color y las que no, en gris y con candado. El nivel en el que estas va
resaltado en verde.

### Comprar el premium y cobrar las recompensas

`buyPremiumPass()` cobra los 4000 pavos (si no llegan, avisa de cuantos faltan y no cobra
nada) y **entrega tambien lo de los niveles que ya tenias**: si vas por el 40, no seria
justo empezar a recibir desde el 41.

`claimPass()` se llama sola cada vez que subes de nivel y mira **siempre desde el nivel
1**, no solo los niveles nuevos. Da igual como hayas llegado hasta ahi —subiendo,
comprando el premium a mitad o cargando una partida guardada—: nunca se queda nada sin
dar ni se da dos veces, porque cada recompensa entregada queda apuntada en `passClaimed`
con su clave (`f12` gratis, `p12` premium).

Dos cosas tienen truco:

- **Las recompensas de XP pueden hacerte subir de nivel**, y ese nivel nuevo trae mas
  recompensas. `claimPass()` repite el reparto hasta que no queda nada pendiente, y por
  eso subir niveles se hace en `_addXpRaw()`, que no toca el pase: si se llamaran el uno
  al otro seria una recursion sin fin.
- **`passClaimed` guarda TEXTO, no numeros.** Validandolo como numero al cargar se
  descartaba entero, y en la siguiente subida de nivel el pase volvia a pagar todo lo ya
  entregado.

## Minijuegos

Siete modos sueltos para entrenar sin arriesgar la partida, con su pantalla propia en el
menu ([`js/data/minigames.js`](js/data/minigames.js)):

| Minijuego | Objetivo | Puntua |
|-----------|----------|--------|
| Campo de tiro ✔ | Acertar a las dianas en 60 s | dianas (mas es mejor) |
| Zona de entrenamiento ✔ | Probar las 10 armas contra maniquies | modo libre |
| Carrera de obstaculos ✔ | Llegar a la meta cuanto antes | tiempo (menos es mejor) |
| Caja de construccion ✔ | Construir a gusto, con madera de sobra | modo libre |
| 1 contra 1 ✔ | Eliminar a un bot en un escenario pequeno | victorias |
| Recoge-monedas ✔ | Pillar monedas antes de que acabe el tiempo | monedas |
| Pilla-pilla ✔ | 11 jugadores: uno la queda y contagia | segundos / pillados |

La idea es **no rehacer nada**: un minijuego usa los mismos sistemas que el battle royale
(movimiento, salto, raton, armas, construccion). Lo unico suyo es QUE se monta en el
escenario y CUANDO se acaba.

### Como estan hechos

- `Game.startMatch()` se partio en tres: `_setupSystems()` (monta el mundo entero),
  `_wireMissions()` y `_afterSetup()`. Un minijuego llama a los mismos `_setupSystems`,
  pasandole que partes quiere (`worldLoot`, `chests`, `buildings`, `targets`, `fish`), asi
  que **no hay dos caminos distintos** que mantener.
- `MatchManager.startArena()` monta el mismo mundo pero **sin bus y sin tormenta**, y con
  los bots que pida el modo (normalmente ninguno). Las comprobaciones de victoria y
  derrota se apagan: en un minijuego el final lo decide el modo.
- Cada modo hereda de [`Minigame`](js/systems/minigames/base.js) y solo rellena `setup()`,
  `step()` y `drawHud()`. El cronometro, el marcador, la pantalla de fin y guardar el
  record son comunes.
- La pantalla de fin ([`ui/minigameHud.js`](js/ui/minigameHud.js)) tiene **REINTENTAR**
  (vuelve a montar el modo con lo mismo equipado) y **SALIR** (vuelve a la lista de
  minijuegos). `Esc` sale directamente al menu principal.

### Campo de tiro

Sesenta segundos y **cinco dianas a la vez** repartidas por el campo a tres alturas: cada
una que cae suma un punto y aparece otra en otro sitio, asi que nunca faltan blancos. Se
entra con un **fusil y municion infinita**, que aqui se trata de apuntar, no de buscar
armas.

### Zona de entrenamiento

Modo libre, sin reloj: una fila de **7 maniquies** de 600 de vida y **las 10 armas** del
juego por el suelo (mas cuatro curas) para ir cogiendolas con `E` y probarlas. La
municion no baja nunca. El marcador lleva la cuenta de cuantas armas has empunado y del
dano total.

### Carrera de obstaculos

Veinte plataformas de la salida a la meta, con cronometro, en **tres niveles**
([`js/data/parkourLevels.js`](js/data/parkourLevels.js)) y **un record por nivel**
(`parkour:dificil`), que un tiempo del facil no tiene nada que ver con uno del dificil.

**Cada carrera es un recorrido NUEVO**: al acabar una y darle a reintentar sale otra
distinta. Lo que esta fijado no es el trazado sino los **rangos** de cada nivel (huecos,
subidas, anchos, cuantos obstaculos), y son ellos los que garantizan que siempre se pueda
pasar y que el record siga siendo comparable.

Se comprobo con la formula del salto —no simulando, midiendo— que de **3.180 saltos
generados no hay ni uno imposible andando**. Salieron dos fallos por el camino:

- El tramo de **llegada** usaba el hueco de llano aunque sube: un hueco de 120 subiendo 85
  no se alcanza.
- Dos **trampolines seguidos** se comian el uno al otro y quedaba un salto de 230 px sin
  trampolin que lo alcanzase. Ahora se generan separados al menos dos tramos.

| Nivel | Que trae |
|-------|----------|
| Facil | Solo plataformas. Para cogerle el punto al salto. |
| Normal | Plataformas mas pequenas, **pinchos** y **trampolines**. |
| Dificil | Ademas, **laseres** y **llamaradas**. Hay que cronometrar. |

Los obstaculos viven en [`hazards.js`](js/systems/minigames/hazards.js) y comparten
contrato (`update` / `hits` / `draw`), asi que el circuito los mezcla sin saber de cual se
trata. Ninguno mata: te devuelven al ultimo sitio pisado, igual que caerse, y el castigo
son los segundos que pierdes.

- **Laser** — haz que se enciende y se apaga (unos 2 s apagado). Parpadea en amarillo
  antes de encenderse.
- **Fuego** — llamarada que sale de la plataforma; con la llama baja no quema.
- **Pinchos** — fijos, siempre activos: hay que saltarlos.
- **Trampolin** — no quema: te lanza 420 px hacia arriba. Hay tramos que **solo** se
  alcanzan rebotando.

Los recorridos estan **escritos a mano**, no generados al azar: si cambiasen en cada
intento, el record no significaria nada.

Dos cosas se aprendieron probandolo:

- **Se monta en el CIELO, no sobre el terreno.** El circuito mide 4600 px, muchisimo mas
  que cualquier tramo llano; montado abajo, sus plataformas se cruzaban con escalones e
  islas del mundo y el recorrido se volvia intransitable. `skyBand()` busca una franja de
  cielo libre (por encima de 794 px no hay nada en todo el mapa) y lo levanta ahi.
- **Los saltos estan medidos para ANDAR, no para correr.** Con los huecos calculados a
  400 px/s el circuito se volvia imposible justo a mitad, cuando se agota la barra de
  rapidez y bajas a 230. Ahora ningun hueco pasa de 125 px y ninguna subida de 90:
  correr es una ventaja de tiempo, no un requisito.

Caerse o tocar un obstaculo te devuelve **A LA SALIDA**, sin checkpoints, y el crono
**no se para**: ese es el castigo, y es lo que hace que el tiempo signifique algo.

- El punto de salida se elige **seguro** (mirando el alcance MAXIMO de cada obstaculo con
  `dangerRect()`, no el de ese instante: un fuego apagado mide cero y el sitio pareceria
  libre justo antes de achicharrarte), y al reaparecer hay **0,8 s de gracia**.
- La caida se mide por la **BASE** del personaje y con poco margen sobre la plataforma mas
  baja del circuito. El circuito esta en el cielo y el terreno del mundo queda justo
  debajo: con un umbral alto, al caerte aterrizabas en la isla sin llegar a cruzarlo y la
  caida no contaba.

**Ni pico ni construccion**: con madera se podia levantar un atajo hasta la meta, y eso es
hacer trampas. El modo pone la madera a cero y apaga el modo construccion cada frame.

Y dos reglas de trazado que solo se ven probando:

- Las plataformas con pinchos son **anchas (180 px)** y los pinchos van en su **franja
  central**: hay que dejar libre la zona donde aterrizas y la del borde de salida. Con los
  pinchos pegados al aterrizaje, caias sobre ellos sin poder hacer nada.
- Los laseres van al **final de la plataforma**, no en mitad del hueco: en el hueco no hay
  donde pararse a esperar a que se apaguen.

### Caja de construccion

Modo libre con **madera infinita** (se rellena sola en cuanto baja), los **arboles
rebrotan** para practicar tambien el pico, y unos **postes de referencia** con una marca
cada 96 px — el tamano de una celda de construccion — para ver a que altura vas. Se entra
ya en modo construccion. El marcador cuenta piezas puestas y rotas.

### 1 contra 1

Un rival, un escenario pequeno y solo puede quedar uno. Cada ronda ganada suma una
victoria y sale un rival nuevo; la primera derrota corta la racha, que es el record.

**Cada rival viene mas duro que el anterior** (`_dificultad`), por tres sitios a la vez:

| Ronda | Escudo | Arma | Error de punteria | Reaccion |
|-------|--------|------|-------------------|----------|
| 1 | 0 | rara | 0,250 | 0,50 s |
| 3 | 36 | epica | 0,185 | 0,36 s |
| 5 | 72 | legendaria | 0,120 | 0,22 s |
| 7 | 100 | mitica | 0,075 | 0,13 s |

A partir de la septima ya no sube mas. Tu equipo no cambia, asi que la racha se acaba
tarde o temprano: de eso va.

Los rivales parten **siempre de la misma personalidad base**, no de una al azar. Con
personalidades aleatorias un rival "torpe" de la ronda 3 salia mejor que uno "bueno" de la
2, y la dificultad daba tumbos en vez de subir.

El rival es un **Bot normal**, con su personalidad y su arma, movido por el mismo
`systems/botAI.js` de la partida. Dos ajustes hicieron falta:

- **Sin fase de paz.** En una partida los primeros 14 segundos nadie dispara, para dar
  tiempo a saquear; en un duelo eso eran 14 segundos mirandose las caras. `startArena()`
  adelanta el reloj para saltarsela.
- **Empiezan a 330 px.** Tiene que caber dentro de lo que ve un bot (su `viewRange` va de
  280 a 560 segun la personalidad): mas lejos, el rival ni se entera de que estas ahi.

### Recoge-monedas

Catorce monedas a la vez repartidas por el tramo, unas a ras de suelo y otras a altura de
salto, y 60 segundos. Al recoger una sale otra en otro sitio, asi que nunca hay que
esperar parado.

### Pilla-pilla

**Once participantes**: tu y diez bots. Uno empieza contando —**puede tocarte a ti**— y
quien es pillado se convierte en contador tambien, asi que la cosa crece como una bola de
nieve. Dos fases:

| Fase | Dura | Que pasa |
|------|------|----------|
| Esconderse | 30 s | Los contadores no ven ni pillan; los demas corren |
| Pillar | 2:30 | A por ellos |

Gana quien quede libre al acabar el tiempo; si caen todos, ganan los contadores. Nadie
puede morir: esto va de correr.

Como el papel te toca al azar y **aguantar libre no se puede comparar con pillar**, hay
**dos records** (`pilla:escondido` en segundos y `pilla:contador` en pillados), y la
tarjeta del menu ensena los dos.

La IA va **forzada** cada frame: los contadores persiguen al libre mas cercano y los
libres huyen del contador mas cercano. Con la IA normal se pondrian a buscar botin.

Dos numeros que costo ajustar:

- **El campo mide 2800 px.** Con los ~1800 de un tramo llano, once participantes se pisan
  y la caceria se acaba en quince segundos; con 5000 el contador no alcanza a nadie y no
  cae ni uno en los 2:30.
- **Los acorralados escapan por encima.** Un libre pegado al borde con el contador cerca
  cambia de lado y salta. Sin eso corrian hasta la pared y esperaban ahi a que los
  pillaran.

### El tramo llano

Los dos modos se montan sobre el **tramo llano mas largo del mapa**, no sobre "la isla
mas ancha". Es una diferencia que se noto enseguida: colocando los maniquies sobre la
isla a secas, varios quedaban **detras de un escalon del terreno** y las balas chocaban
contra el escalon sin llegar a tocarlos. `Minigame.flatRun()` recorre cada isla buscando
el trozo donde no hay nada encima, y `bestField()` se queda con el mas largo.

### Lo construido no se queda de un modo a otro

Cada partida y cada minijuego crean un `BuildManager` **nuevo**, que nace sin saber nada
de las piezas del anterior. Por eso `reset()` barre **todo el mundo** quitando las
plataformas con `structure`, y no solo su propia lista: sin ese barrido, lo que
construias en la caja de construccion seguia plantado en el campo de tiro y en la partida
normal.

### Records

Cada minijuego guarda su mejor marca en el perfil (`records` dentro de
`fortniteClash.profile.v1`). `Profile.saveRecord()` solo la guarda **si mejora**, y sabe
en que direccion: en los de tiempo gana la marca **menor** y en el resto la **mayor**
(`isBetter` en `data/minigames.js`). Los modos libres no puntuan. El boton **Reiniciar
progreso** los borra junto con lo demas.

## Niveles y experiencia

El jugador tiene un **NIVEL** (1 a 100) que sube ganando **XP**. El nivel y la barra de
progreso se ven arriba en el menu, al lado de los pavos, y se guardan en el perfil.

### De donde sale la XP

| Por | XP |
|-----|----|
| Terminar una partida | 100 |
| Ganarla | +300 |
| Cada eliminacion | 25 |
| Quedar entre los 5 ultimos | 80 |
| Cumplir una mision | 150 |
| Cada 100 de dano hecho | 10 |
| Cada pez | 12 |
| Cada edificio en el que entras | 10 |
| Cada cofre | 8 |
| Cada arbol talado | 6 |
| Terminar un minijuego | 40 (+60 si es record) |

Una partida normal deja unos **250-450 XP**.

### La curva

`xpToNext(n) = 120 + (n - 1) * 20`: del 1 al 2 hacen falta 120 XP y del 99 al 100, 2080.
En total, **108.900 XP** para llegar al nivel maximo. Es una curva suave a proposito: los
primeros niveles caen en una partida y los ultimos piden tres o cuatro.

### Cuando se entrega

Durante la partida la XP **se va apuntando** en [`XpTracker`](js/systems/xp.js), agrupada
por motivo, y se entrega **de golpe al terminar**. Se hace asi por dos razones: subir de
nivel a mitad de partida seria un lio, y al acabar se puede ensenar el desglose
(*"Misiones x1: 150 · Partida jugada: 100 · Eliminaciones x3: 75"*). Los minijuegos si
entregan al momento: son cortos y no tienen resumen.

## Misiones

**19 desafios** repartidos en cinco grupos (Combate, Saqueo, Construccion, Aterrizajes y
Constancia), definidos en [`js/data/missions.js`](js/data/missions.js) y llevados por
[`js/systems/missions.js`](js/systems/missions.js). En total dan **3690 pavos**.

Cada mision es un contador con una meta y una recompensa. Hay dos tipos:

- **En una partida** (`scope: 'match'`) — hay que lograrlo de una sentada; el contador se
  reinicia al empezar cada partida. Por ejemplo *3 eliminaciones*, *5 cofres*,
  *entrar en 3 edificios* o *quedar entre los 5 ultimos*.
- **Acumulada** (`scope: 'total'`) — suma entre partidas y se guarda en el perfil. Por
  ejemplo *25 eliminaciones*, *500 de madera*, *1500 de dano* o *ganar una partida*.

Las de **Aterrizajes** llevan `zone` y solo cuentan si caes en ese sitio: hay una por
Villa Pavo, Mansion Dorada, Cumbre Helada, Fabrica Tornillo, Dunas Secas, Puerto Ancla,
Feria Fortuna y Volcan Ceniza, para que la
isla se recorra entera en vez de saltar siempre al mismo punto.

### Como se entera de lo que pasa

El juego no consulta nada: **cada sistema avisa** cuando ocurre algo, y `game.js` traduce
ese aviso a un evento de mision.

| Evento | De donde sale |
|--------|---------------|
| `kill` | `match.onKill` (solo si el asesino eres tu) |
| `damage` | `bullets.onDamage` y `combat.onDamageDealt`, filtrando por dueno |
| `chest` | `chests.onOpened` |
| `wood` / `tree` | `combat.onWood`, cuando el pico termina de talar |
| `build` / `break` | `build.onPlaced` y `build.onBroken` |
| `fish` | al pescar, en `_updateFish` |
| `building` | `_updateMissionWatch`, una vez por edificio y partida |
| `top5` | `_updateMissionWatch`, al bajar de 5 vivos estando vivo |
| `land` | `match.onLanded`, con la zona en la que caes |
| `win` / `match` | `endMatch`, segun el resultado |

Al completarse, la mision **paga sola**: suma los pavos, se marca como cumplida (no
vuelve a pagar) y sale el aviso en pantalla. Al volver al menu, el toast resume lo
ganado: *"+50 pavos por la partida · +270 por 2 mision(es)"*.

El progreso vive en el perfil (`missions` y `missionsDone` dentro de
`fortniteClash.profile.v1`), se ignoran ids que ya no existan en el catalogo, y el boton
**Reiniciar progreso** lo borra junto con los pavos y las compras.

## Estructura del proyecto

```
index.html              Contenedor, canvas y capa HUD en HTML
css/style.css           Escalado responsive y paneles del HUD
css/menu.css            Menu principal, tienda, taquilla y tarjetas
js/watchdog.js          Vigilante de arranque (script clasico, sin modulos)
js/main.js              Punto de entrada: monta Profile + Menu + Game (con red de seguridad)
js/core/
  boot.js               Red de seguridad del arranque y panel de errores
  audio.js              Sonidos sintetizados (cofre, recoger)
  config.js             TODAS las constantes de diseno y la paleta
  utils.js              Matematicas, PRNG con semilla, helpers de dibujo
  input.js              Teclado por ACCIONES (no por teclas sueltas)
  mouse.js              Raton: pantalla -> mundo, botones, apuntado
  camera.js             Camara con suavizado, look-ahead, zoom y limites
  inventory.js          Las 6 ranuras (pico + 5 objetos)
  game.js               Bucle principal (paso fijo) + estados menu/partida
  profile.js            Pavos, compras y equipamiento (localStorage)
js/data/
  biomes.js             Los 7 ambientes: paletas y que decorado sale
  ammo.js               Los 5 tipos de municion y sus cajas
  botNames.js           Generador de nombres unicos por partida
  zones.js              Los 10 sitios: DE AQUI se genera el mapa entero
  structures.js         Las 3 piezas de construccion y la rejilla de 96 px
  buildings.js          Los 9 tipos de casa: tamano, plantas, colores y botin
  vehicles.js           Los 3 tipos de vehiculo y donde aparece cada uno
  mobility.js           Donde van las tirolinas y los saltadores
  missions.js           Los 19 desafios: meta, recompensa y evento que los mueve
  minigames.js          Los 7 minijuegos: objetivo, como puntuan y su record
  levels.js             Curva de niveles y cuanta XP da cada cosa
  battlePass.js         Los 100 niveles del pase y sus recompensas
  parkourLevels.js      Los 3 recorridos de la carrera y sus obstaculos
  rarities.js           Las 7 rarezas: color, probabilidad y multiplicador
  cosmetics.js          CATALOGO de skins, picos y paravelas
  emotes.js             Los 8 emotes: rareza, precio y como se mueven
  weapons.js            LAS 15 ARMAS (5 solo del Julen Blitz)
  heals.js              LAS 10 CURAS
  throwables.js         Las granadas: mecha, radio y dano
  gadgets.js            Torretas y trampas: vida, alcance y dano
  loot.js               Sorteos de arma/rareza y creacion de objetos
js/systems/
  minigames/
    base.js             Clase base: reloj, marcador, fin y record
    index.js            Registro id -> clase de cada modo
    shooting.js         Campo de tiro
    training.js         Zona de entrenamiento
    parkour.js          Carrera de obstaculos (tres niveles)
    hazards.js          Laseres, fuego, pinchos y trampolines
    sandbox.js          Caja de construccion
    duel.js             1 contra 1
    coins.js            Recoge-monedas
    tag.js              Pilla-pilla
  spawnPoints.js        Reparto de los 51 participantes por el mapa
  buildings.js          Levanta los edificios, abre puertas y los llena
  combat.js             Disparo, cadencia, dispersion, pico y curaciones
  worldLoot.js          Siembra de botin, recogida e intercambio
  chests.js             Reparto de cofres, apertura y botin mejorado
  supplyDrops.js        Cajas del cielo: cuando, donde y que traen
  gadgets.js            Colocar torretas y trampas, y que funcionen solas
  throwables.js         Granadas en vuelo y explosiones en area
  match.js              Los 50 bots, vivos, bajas y final de partida
  botAI.js              La maquina de estados de la IA
  harvest.js            Talar arboles: progreso, madera y aviso
  vehicles.js           Reparto de vehiculos, subir, bajar y conducir
  mobility.js           Tirolinas (engancharse y deslizarse) y saltadores
  missions.js           Progreso de las misiones, recompensas y avisos
  xp.js                 Contador de experiencia de la partida
  building.js           Modo construccion: previsualizacion, colocar y romper
  safeZone.js           La zona que se cierra
  teams.js              Reparto de equipos y quien es aliado de quien
  revive.js             Abatidos, desangrado y reanimacion
js/world/
  water.js              Masas de agua (lagos y canales) y su dibujo
  level.js              Datos del escenario + consultas de colision
  terrain.js            Dibujo de islas, hierba y plataformas finas
  props.js              Los 32 elementos de decorado de los 10 ambientes
  background.js         Cielo, colinas parallax, nubes y mar
js/entities/
  battleBus.js          El bus de batalla del principio
  player.js             Fisica, colisiones, salto, energia, vida, escudo y vuelo
  playerSprite.js       Dibujo del personaje, coloreado por SKIN, apuntando
  skinStyle.js          Detalles del traje: patron, emblema, capa, aura
  gearSprite.js         Dibujo de picos y paravelas
  weaponSprite.js       Dibujo de las 10 armas
  healSprite.js         Dibujo de las 10 curas
  bullet.js             Proyectiles (balas y rayos) y sus impactos
  particles.js          Chispas, fogonazos y numeros de dano
  pickup.js             Objetos tirados en el suelo, con su halo de rareza
  chest.js              El cofre y su animacion de apertura
  building.js           Edificios: paredes, techo y puerta que se abre
  ammoSprite.js         Dibujo de las cajas de municion
  fish.js               Los peces y la pesca
  bot.js                Un bot enemigo (reutiliza la fisica del jugador)
  target.js             Dianas de entrenamiento
  structure.js          Una pieza construida: cajas de colision, vida y dibujo
  building.js           Una casa: plantas, escaleras, interior y fachada
  vehicle.js            Un vehiculo: fisica propia, escalones y dibujo
js/ui/
  hud.js                Vida, escudo, rapidez, curacion y avisos
  matchHud.js           Vivos, kills, registro, fase del bus y pantallas de final
  worldMap.js           El mapa de la isla (tecla M)
  inventoryHud.js       Las 6 cajitas del inventario
  buildHud.js           Selector de pieza del modo construccion
  minigameIcon.js       Los dibujos de las tarjetas de minijuegos
  minigameHud.js        Pantalla de fin de minijuego (resultado y botones)
  crosshair.js          La mira que sigue al cursor
  menu.js               Logica del menu, tienda y taquilla
  itemPreview.js        Vista previa de cualquier cosmetico en un canvas
```

### Como se dibuja una skin

El personaje no es un muneco de dos colores: cada skin tiene su
[`style`](js/entities/skinStyle.js), que se pinta encima de la paleta.

| Campo | Que hace |
|-------|----------|
| `pattern` | Dibujo de la chaqueta: `liso`, `rayas`, `camo`, `chevron`, `panel` |
| `emblem` | Parche del pecho: rayo, estrella, calavera, rombo, cruz, llama, luna, ojo |
| `trim` | Color del ribete: cuello, punos, bajo y hebilla |
| `shoulders` | Hombreras |
| `cape` | Capa que ondea con el tiempo y con la velocidad |
| `glow` | Aura, solo para las mas raras |

Ademas, el cuerpo lleva **contorno oscuro** (lo que lo separa del fondo y le da aire de
dibujo), **degradado de luz** en el torso, silueta con hombros anchos y cintura, rodilleras,
botas con suela y guantes con brillo.

Tres cosas que se aprendieron colocandolo:

- Las **hombreras** van en el borde de arriba del torso. Puestas a la altura de la cadera
  quedaban en mitad del pecho.
- El **emblema va al LADO**, como un parche, no en el centro: el brazo delantero nace
  dentro del torso y cae por delante, asi que uno centrado queda tapado en cuanto el
  personaje se mueve.
- Hay una pose **`showcase`** solo para la tienda, la taquilla y la vitrina, con los brazos
  algo separados del cuerpo. Con la pose normal el brazo tapa justo lo que se viene a ver.

### Que hay en el catalogo

- **22 skins**, cada una con su paleta y su **peinado o casco**. Hay 15 tipos de cabeza
  dibujados en `playerSprite.js`: pelo, melena, gorra, casco, capucha, sombrero, corona,
  mono, coleta, cresta, orejas, bandana, mascara, cuernos y astro (el casco de
  astronauta, con burbuja, visor y antena).
- **16 picos**, cada uno con su geometria propia en `gearSprite.js`: punos, llave,
  hacha, katana, martillo, guadana, pico de diamante, colmillo, pala, sierra circular,
  bate, paraguas, tridente, zanahoria, rayo y pincel.
- **15 paravelas**: paracaidas, ala delta, sombrilla, murcielago, nube, dragon, alas,
  cometa, globo aerostatico, pizza, medusa, ala jet, hoja, bandera pirata y fenix.

Ninguna forma cae al dibujo por defecto: cada una pinta algo distinto (comprobado
comparando el mapa de pixeles de las 53).

### Anadir un cosmetico nuevo

Basta con anadir una entrada en `js/data/cosmetics.js`: la tienda y la taquilla se
rellenan solas a partir de esas listas. Para las skins se define una paleta de colores
y un tipo de peinado (`pelo`, `melena`, `gorra`, `casco`, `capucha`, `sombrero`, `corona`);
para picos y paravelas, un `shape` de los que dibuja `gearSprite.js`.

## Combate, inventario y botin

### Inventario (6 cajitas, abajo a la derecha)

| Cajita | Contenido | Tecla |
|--------|-----------|-------|
| 1 | El **pico** (siempre lo llevas, no se puede soltar) | `F` |
| 2-6 | Armas y curas que recoges | `1` … `5` |

Las curas del mismo tipo se apilan en una misma ranura. `R` suelta lo equipado al suelo.

### Apuntar y disparar

El personaje apunta **hacia donde este el cursor**, en cualquier direccion. El clic
izquierdo usa lo que lleves en la mano: dispara, golpea con el pico o toma la cura.
El clic derecho apunta: la mira pasa a ser de precision y la dispersion baja mucho
(cada arma tiene su `spread` normal y su `adsSpread`). Disparar en movimiento abre el cono.

### Las 10 armas

De la mas comun a la mas rara, con su probabilidad de aparecer:

| # | Arma | Prob. | Dano base | Cadencia | Comportamiento |
|---|------|-------|-----------|----------|----------------|
| 1 | Pistola | 22 % | 24 | 4/s | Semiautomatica |
| 2 | Fusil de Asalto | 17 % | 30 | 6/s | Automatica, buen alcance |
| 3 | Fusil de Tambor | 13 % | 26 | 8/s | Automatica, mas dispersion |
| 4 | Subfusil Rapido | 11 % | 17 | 11/s | Automatica, corto alcance |
| 5 | Subfusil de Tambor | 9 % | 15 | 13/s | Automatica, muy dispersa |
| 6 | Minigun | 8 % | 14 | 16/s | Tarda 0,55 s en arrancar |
| 7 | Escopeta Tactica | 7 % | 12 x7 | 1,4/s | 7 perdigones |
| 8 | Escopeta de Oni | 6 % | 16 x8 | 1/s | 8 perdigones |
| 9 | Sniper Tactico | 4,5 % | 105 | 0,55/s | Atraviesa, alcance 2400 |
| 10 | Julen Super Arma | 2,5 % | 40 | 5/s | Dispara **rayos** que atraviesan |

### Rarezas

Cada arma puede salir en cualquiera de las seis rarezas sorteables (las mejores tienen
un suelo: el Julen nunca sale por debajo de epico). Cuanto mas rara, **menos probable y
mas dano**:

| Rareza | Color | Prob. | Dano |
|--------|-------|-------|------|
| Comun | gris | 40 | x1,00 |
| Poco comun | verde | 26 | x1,15 |
| Raro | azul | 17 | x1,32 |
| Epico | morado | 10 | x1,52 |
| Legendario | naranja | 5 | x1,75 |
| Mitico | dorado | 2 | x2,05 |
| **Exotico** | **turquesa** | **0** | **x2,45** |

La **exotica es distinta a todas**: su probabilidad es **cero**, o sea que NUNCA sale de
un sorteo. No aparece por el suelo, ni en un cofre normal, ni en el Julen Royale. Solo se
da a mano, y solo en el Julen Blitz (ver mas abajo).

Eso obligo a separar dos listas que antes eran una: `RARITY_ORDER` sigue teniendo las
siete, porque tambien sirve para **comparar** ("al menos epico"), y `RARITY_DROPS` tiene
solo las que se pueden **sortear**. Sin esa separacion la exotica se colaba por el
respaldo de `pickWeighted`, que devuelve el ultimo de la lista cuando no encuentra
ninguno: y el ultimo era justo ella. Comprobado despues: **0 exoticas en 80.000 tiradas**
de botin del suelo y de cofre.

### Las 10 curas

Tienen rareza **fija** (como en Fortnite: las vendas siempre son grises):

Manzana de Pino, Setas del Bosque y Vendas (grises) · Mini Escudo y Botiquin (verdes) ·
Escudo Grande y Refresco de la Isla (azules) · Pocima de Tormenta (morada) ·
Nectar Dorado (naranja) · Elixir Julen (dorado).

Cada una cura vida, escudo o ambos, con su propio tope y su tiempo de uso. Saltar o
recibir dano interrumpe la curacion.

### Botin

Al empezar la partida se reparten ~26 objetos por las plataformas de la isla, cada uno
con el halo del color de su rareza. Pasar por encima con una ranura libre los recoge
solo; con el inventario lleno, `E` intercambia por lo que lleves equipado.

## El bus de batalla

La partida ya no empieza en el suelo. El arranque es:

1. **En el bus.** Un autobus volador colgado de un globo cruza el cielo de punta a punta
   del mapa (30 segundos). Tu vas colgado de la puerta y la camara sube el encuadre para
   que se vea entero.
2. **Espacio para saltar.** Si no saltas, el bus te suelta cuando lleva el 88 % del
   recorrido.
3. **Caida libre.** Bajas rapido (hasta 900 px/s) y te diriges con `A`/`D`. El HUD te
   dice a que altura vas.
4. **Paravela.** Se abre sola a 330 px del suelo, o antes con `Espacio`. Planeas a
   165 px/s y eliges donde aterrizar. Se dibuja la paravela que lleves equipada de la
   taquilla, colgando del personaje.
5. **Al tocar tierra empieza el juego normal.** Hasta entonces no se dispara, no se
   recoge nada y no se toca el inventario.

Los **74 bots tambien salen del bus**: cada uno tiene asignado su punto de aterrizaje y
se suelta cuando el bus pasa por encima, con un margen al azar para que no salten todos
a la vez. Su descenso va **guiado** en vez de simulado con fisica completa: con 74 bots
cayendo cuesta una fraccion y ademas garantiza que aterrizan repartidos donde toca.

## 75 jugadores y mapa grande

Cada partida son **75 vivos**: tu y 74 bots, en un mapa de **25 840 px** con los 10 sitios
bien separados (2 200-2 500 px cada uno). Repartidos: 9-12 bots por zona y solo 4 de 75
con algun vecino cerca.

Para que el mapa mas grande no se quedase corto, sube tambien lo demas: **73 cofres**,
**77 objetos** de botin y **17 edificios**.

### Rendimiento

Medido con los 75 jugadores en marcha, en el navegador:

| | ms por frame |
|---|---|
| Simulacion (fisica + IA de 74 bots) | 0,04 |
| Dibujo | 0,48 |
| **Total** | **0,55 de los 16,7 que da un frame a 60 fps** |

O sea, un **3 % del presupuesto**. Lo que mas costaba era la busqueda de colisiones: con
75 personajes preguntando varias veces por frame, recorrer las 135 plataformas del mapa
se hacia caro. Ahora hay un **indice espacial** (columnas de 512 px) y cada consulta solo
mira su columna: el doble de rapido. A eso se suma lo que ya habia: los bots lejanos se
actualizan un tercio de veces, y solo se dibuja lo que entra en camara.

Con estos numeros no hace falta bajar el numero de jugadores.

## El mapa (tecla M)

Como el mundo es una tira de casi 18 000 px, no puede ser una vista cenital tipo Fortnite:
es un **mapa de relieve de perfil**, que ademas tiene la ventaja de enseñar el terreno de
verdad (se calca de `world.platforms`, no es un decorado). Lleva:

- el **relieve real** con su cielo y su oceano de fondo, y el color de tierra y hierba de
  cada bioma
- el **agua**: los canales y los dos lagos, con su rizo en la superficie
- los **10 sitios** con su chapa de nombre (en tres alturas, para que los rotulos largos no
  se pisen) y **dos iconos de su ambiente** (pinos, palmeras, anclas, norias, volcanes,
  casas, montañas nevadas, chimeneas humeando, coronas, cactus)
- los **edificios**, como casitas sobre el terreno
- una **cuadricula A1-H3** y el cuadrante en el que estas
- la **ruta del bus** en discontinua, con el bus en su posicion actual
- la **zona segura**, con lo que queda fuera en morado
- **tu posicion**, con haz de luz, anillos que laten y marcador

Se abre y se cierra con `M`, y tambien funciona mientras caes del bus, que viene bien para
elegir donde saltar.

## El mapa: 10 sitios distintos

El mundo mide **25 840 px** y no es una lista de rectangulos escrita a mano: se
**genera a partir de las zonas** (`js/data/zones.js`). Cada zona dice donde empieza, que
ambiente tiene, a que altura esta su suelo, si lleva lago y que edificios hay; el
generador traduce eso a plataformas, agua y decorado.

| # | Sitio | Ambiente | Se reconoce por |
|---|-------|----------|-----------------|
| 1 | Pinar Perdido | Bosque | Pinos, arbustos, cabana |
| 2 | Cala Rocosa | Playa | Arena, palmeras, sombrillas, chiringuito |
| 3 | **Puerto Ancla** | **Muelle** | Grua naranja, contenedores, bolardos, redes, faro y darsena |
| 4 | Villa Pavo | Pueblo | Casas con tejado rojo, tienda, farolas, vallas, lago |
| 5 | Cumbre Helada | Nevada | Nieve, abetos, munecos de nieve, refugio |
| 6 | Fabrica Tornillo | Fabrica | Suelo gris, barriles, tuberias, tres naves |
| 7 | **Feria Fortuna** | **Feria** | Norias girando, carpas de rayas, globos, taquillas, torre |
| 8 | Mansion Dorada | Mansion | Setos, fuentes, estatuas, mansion, lago |
| 9 | Dunas Secas | Desierto | Cactus, craneos, matorrales, ruina |
| 10 | **Volcan Ceniza** | **Volcan** | Basalto negro, grietas de lava, fumarolas, obsidiana, bunker |

Los tres nuevos no van seguidos al final: se han **intercalado** entre los que ya habia
(puestos 3, 7 y 10), para que al cruzar el mapa el ambiente cambie a menudo en vez de
tener toda la novedad amontonada en un extremo.

Cada bioma tiene su **paleta de terreno** propia (hierba, tierra y matas) y su **tinte de
cielo**: amarillo en la playa, azul palido en la nieve, naranja en el volcan. El tinte se
pinta encima del cielo, del sol, de las colinas y de las nubes, pero **no del suelo**, y
se funde con el del sitio vecino a lo largo de 1100 px para que el cambio no sea una raya
en mitad del aire.

El generador comprueba que el mapa sea **transitable**: ningun salto pide mas de los
150 px que sube el personaje, y cada canal de agua tiene su puente.

### Que se toca al anadir un sitio

Casi nada, y es el motivo de que la lista de zonas sea la fuente de verdad. Anadiendo una
entrada a `ZONES` se actualizan solos el **ancho del mundo**, el recorrido del **bus**, el
reparto de los **75 jugadores**, los **cofres** (van por peso de zona), el **mapa de la M**
y el **rotulo de zona** del HUD. Lo unico que hay que escribir a mano es lo propio del
sitio: su bioma en `biomes.js`, el dibujo de sus props en `props.js`, y sus vehiculos,
tirolinas y saltadores, que se declaran **por zona y en tanto por uno** (`{ zone, at }`),
no en pixeles: por eso intercalar zonas nuevas no descoloco ni un vehiculo de los que ya
estaban.

## Vehiculos

**Doce vehiculos** repartidos por el mapa, al menos uno por sitio, de tres tipos
([`js/data/vehicles.js`](js/data/vehicles.js)):

| Tipo | Velocidad | Salto |
|------|-----------|-------|
| Kart | 900 px/s | 760 |
| Buggy | 780 px/s | 700 |
| Furgoneta | 640 px/s | 640 |

A pie se corre a 400 px/s, asi que un coche cruza el mapa en menos de la mitad de tiempo.
Se sube y se baja con **V** (el resto de teclas ya estaban cogidas: `E` abre puertas y
cofres, `F` es el pico, `R` suelta, `Q` construye, `Z`/`X`/`C` son las piezas, `M` el mapa
y `H` la ayuda).

Al volante **no se dispara ni se construye** —las manos estan en el volante— y el jugador
va sentado: su posicion la manda el vehiculo. Si te eliminan conduciendo te bajas solo; si
no, el cadaver seguiria pegado al asiento.

**Los bots tambien conducen.** Si estan explorando y les toca recorrer mas de 700 px, se
suben al coche que tengan al lado y conducen hacia su destino; se bajan al llegar, si
llevan mas de 14 segundos o si les entra combate. No hizo falta darles logica nueva: su
mando (`botInput`) ya tiene `axisX` e `isDown`, que es justo lo que pide el vehiculo. En
una partida normal llegan a conducir **11 bots distintos**, hasta 3 a la vez.

Un vehiculo ocupado por un bot no se puede robar: hay que esperar a que se baje.

Tres cosas que hubo que ajustar probando:

- **El conductor iba de pie encima del coche.** `seatY` se mide desde el techo del chasis
  hacia abajo: en negativo quedaba flotando sobre el capo.
- **Aparecian pegados a las paredes de los edificios** y no podian arrancar (un muro mide
  mas que el escalon que sube un coche). Ahora `_sitioLibre()` busca un hueco de verdad,
  probando a un lado y a otro hasta 600 px.
- **El escalon que suben solos es generoso (52-58 px)**. Con los 34 iniciales el coche se
  paraba en cada bordillo del terreno y no avanzaba ni 30 px en seis segundos; lo que no
  llega, se salta con Espacio. Medido despues: los vehiculos se conducen a una media de
  **508 px/s**.

## Tirolinas y saltadores

Dos formas mas de moverse por un mapa de 25.840 px
([`js/data/mobility.js`](js/data/mobility.js)):

**Ocho TIROLINAS.** Seis cruzan de un sitio al siguiente por encima de los canales de
260 px que los separan, y dos recorren de punta a punta Villa Pavo y la Feria. Son pocas
y bien puestas a proposito: con nueve el cielo se llenaba de cuerdas y perdian la gracia.
Al pasar a 10 sitios subieron de cinco a ocho, que es mantener la misma densidad de antes
en un mapa un 44% mas largo.
Te enganchas **al tocar la cuerda**, sin pulsar nada, y te deslizas a **720 px/s**
(casi el doble que corriendo, y en linea recta por encima del terreno). Te sueltas con
**Espacio** o al llegar al final, y **sales con la inercia del viaje**: si te quedaras
clavado en el aire, el impulso no serviria de nada.

**Veinte SALTADORES**, dos por sitio. Al pisarlos te lanzan hacia arriba y hacia
delante: suben unos **277 px** de media, frente a los 150 de un salto normal, asi que
llegas a tejados y plataformas altas sin construir una rampa. Solo saltan si vienes
**cayendo**: si no, andando por encima te relanzarian sin parar.

Ninguno de los dos toca la fisica del jugador: la tirolina le fija la posicion mientras
dura y el saltador solo le cambia la velocidad.

**Los bots tambien las usan.** Se enganchan si la cuerda les pilla de paso Y les acerca a
donde van —engancharse para acabar mas lejos del destino no tendria sentido—, y los
saltadores les lanzan igual que a ti. No se les toca la IA: siguen decidiendo su destino
por su cuenta, lo unico que cambia es como llegan.

Tres cosas que hubo que ajustar probando:

- **Dos tirolinas atravesaban tejados** (Villa Pavo y la Fabrica): al tocar la cuerda la
  fisica te sacaba del tejado y ya no enganchabas. Ahora se muestrea el trazado y, si
  choca, se suben los dos postes hasta que este despejado.
- **Dos saltadores caian dentro de un edificio** y aterrizabas en el suelo de la casa sin
  llegar a pisarlos. Se busca sitio libre, como con los vehiculos.
- Esa comprobacion de sitio libre **chocaba con el propio suelo** que sostiene el
  saltador: de 14 solo sobrevivio 1. La caja de comprobacion se queda 4 px por encima.

## Casas y edificios

Hay **17 edificios** de 9 tipos repartidos por las zonas
([`js/data/buildings.js`](js/data/buildings.js)). Al ser un juego de vista lateral, cada
uno es su **seccion**: paredes laterales, tejado, los suelos de cada planta y las
escaleras que los unen.

### Fuera se ve la fachada, dentro se ve el interior

El edificio se dibuja en **dos pasadas**:

1. `drawInterior()` va al **fondo**, antes que el jugador, el botin y los bots: el hueco,
   los suelos, las escaleras, los muebles, las paredes laterales, el tejado y la puerta.
2. `drawFacade()` va **por delante de todo**: es la pared de delante. Mientras estas
   fuera tapa el interior *y a quien haya dentro*, asi que una casa parece una casa. En
   cuanto **entras**, se desvanece en un cuarto de segundo y aparecen las habitaciones,
   las escaleras, los cofres y los bots que estuvieran escondidos. Al salir vuelve.

Con la puerta abierta se recorta un vano en la fachada: se atisba el interior desde
fuera, lo justo para saber que ahi dentro hay algo.

### Plantas y escaleras

Cinco de los nueve tipos tienen **varias plantas** (la mansion tiene 3, la torre 3, y
casa, tienda, refugio y nave tienen 2). Cada planta aporta su **suelo solido** y los
tramos de escalera que suben a la siguiente.

Los peldanos llevan la marca `ramp: true`, **la misma que usan las rampas de
construccion**: se suben **andando**, sin tener que saltar en cada uno. Para bajar,
basta con andar hacia el hueco de la escalera y dejarse caer peldano a peldano.

Los tramos suben **todos hacia la derecha y encadenados**, formando una diagonal
continua. El zigzag (un tramo a cada lado) se probo y **no funciona en 2D**: al subir
sales por el extremo alto de la escalera, y el tramo siguiente te presenta su peldano
mas alto — un muro de una planta entera que no se puede rodear.

### Pasar al otro lado: cornisas y puerta trasera

Al crecer los edificios (de 150 px a 418 en la mansion) aparecio un problema serio: el
salto sube unos **150 px**, asi que una casa alta se convertia en un **muro que corta el
camino**. Dos arreglos:

**1. Cornisas para escalar.** Cada fachada lleva salientes finos (`ledge`) a los dos
lados, repartidos a partes iguales de forma que **ningun salto pase de 100 px**
(`LEDGE_STEP`), y el ultimo cae **a ras del tejado**. Ese ultimo es imprescindible: sin
el, el salto final choca con el alero (que sobresale 8 px) y no hay manera de plantarse
arriba. Son plataformas **finas**: se atraviesan de abajo arriba, no estorban al andar y
se puede bajar de ellas con `S` + salto. Miden 46 px de fondo, mas que el personaje
(30), para que haya donde pisar.

Los **bots tambien las usan** y acaban subidos a los tejados.

**2. Puerta trasera.** Cada edificio tiene ahora **dos puertas**, una en cada pared, y
las dos se abren y se cierran por separado con `E` (se actua sobre la que tengas mas
cerca). En las casas de **una planta** se entra por delante y se sale por detras.

> En los edificios de **varias plantas** no se cruza por dentro a ras de suelo: la
> escalera es maciza y te sube en cuanto la pisas. Es el precio de que se suba
> **andando**, sin saltar en cada peldano. Para cruzarlos, se rodea **por el tejado** —
> que es justo para lo que estan las cornisas.

### Las balas no atraviesan las paredes

Una bala rapida recorre mas de 20 px por frame y las paredes de un edificio miden 14:
moviendola de golpe y comprobando el punto final, la bala **se colaba** por la pared y
salia por el otro lado. Ahora el avance se parte en trozos de **6 px como maximo**
(`PASO_MAX` en `entities/bullet.js`) y se comprueba en cada uno. Verificado a 60 y a 30
fps, y con balas de 3000 px/s: ninguna pasa.

### Puertas que se abren y se cierran

`E` **alterna** la puerta que tengas mas cerca (delantera o trasera): abre si esta
cerrada y cierra si esta abierta. El cartel de encima dice cual toca.

- **Cerrarla te protege**: la puerta vuelve a ser un muro solido, corta el paso y
  **para las balas**.
- No deja cerrarla **con alguien en el vano** (avisa "Apartate del hueco para cerrar").
  Sin esa comprobacion, el personaje se quedaria metido dentro de la plataforma.
- Un enemigo pegado a la puerta acaba **forzandola** en `CONFIG.world.botDoorTime`
  (1,4 s). Cada puerta lleva su propia cuenta: forzar la de delante no abre la de atras. Es a proposito: si nadie pudiera abrirla, encerrarse seria invencible y
  aburrido; asi cerrar da el respiro justo para curarse o recargar.
- La `E` la comparten puerta, cofre y botin. Si hay un **cofre sin abrir mas cerca** que
  la puerta, manda el cofre: si no, un cofre pegado a la entrada seria imposible de abrir.

### Botin

Hay **30 cofres sueltos** por el mapa (`CONFIG.chests.count`) y los que ponen los
edificios: entre 1 y 2 cada uno, unos 22 mas. Antes eran 46 sueltos y hasta 4 por
edificio, y con 82 cofres en la isla no habia que buscar nada.

Los cofres y la caja de municion se reparten **por plantas** y siempre sobre suelo
libre, nunca clavados en los peldanos: por eso merece la pena subir hasta arriba. El
botin del mundo, en cambio, no se siembra nunca sobre un edificio (ni en los tejados ni
en los suelos interiores); de lo de dentro se encarga `BuildingManager`.

### Separacion garantizada

Dos edificios pegados son un **bug de verdad**: sus paredes se cruzan y te puedes quedar
encerrado entre dos muros solidos sin ninguna puerta que abrir. Por eso el reparto de
`_collectBuildingSlots` los **separa**: empuja cada uno hasta dejar al menos
`CONFIG.world.buildingGap` (150 px) de aire con el anterior — contando el ancho real de
cada tipo y mirando tambien el ultimo edificio de la zona vecina — y **descarta** el que
ya no quepa. Mejor un edificio menos que dos encajados a la fuerza.

El terreno se genera **esquivando los edificios**: los escalones y las plataformas no
invaden su parcela, para que ninguna puerta acabe tapada por un monton de tierra.

## Reparto de la partida

Antes todos los bots salian sorteando posiciones y descartando las que caian cerca de
otra; con 50 bots en un mapa lineal eso no daba de si, y **los que sobraban se colocaban
sin separacion, amontonados**. Ademas el jugador empezaba siempre en la misma esquina.

Ahora (`js/systems/spawnPoints.js`) se hace al reves y de forma determinista: se suma
todo el suelo pisable, se reparte a los 51 participantes cada `ancho/51` pixeles y cada
uno se mueve un poco dentro de su hueco. Detalles que hubo que resolver:

- Los **escalones se solapan en X con las islas**; contarlos dos veces ponia a dos
  participantes en la misma columna. Se usa una superficie por franja.
- Nadie aparece **dentro de un edificio** (quedaria encerrado).
- El jugador cae en un sitio **distinto cada partida**.

Resultado medido: **0 de 51 apinados** (antes 34-40 de 51) y una separacion minima de
unos 110 px, con los bots repartidos por los 10 sitios (6-9 en cada uno).

## Municion

Las armas **ya no tienen balas infinitas**. Hay cinco tipos y cada arma usa el suyo:

| Tipo | Color | Armas | Por caja | Tope |
|------|-------|-------|----------|------|
| Ligera | amarillo | Pistola, subfusiles | 30 | 480 |
| Media | verde | Fusiles, minigun | 24 | 360 |
| Cartuchos | rojo | Escopetas | 8 | 90 |
| Pesada | morado | Sniper | 4 | 40 |
| Energia | cian | Julen Super Arma | 6 | 60 |

Un **disparo gasta una bala**, aunque el arma suelte varios perdigones: la escopeta
gasta un cartucho por tiro, no siete. Sin balas no se dispara y sale un aviso.

La reserva **no ocupa ranuras** del inventario, igual que en Fortnite: es un contador
aparte que se ve a la izquierda de las cajitas, con el color de su tipo, y en pequeno
dentro de cada cajita de arma.

Se consigue en **cajas de municion**: cerca de un tercio del botin del suelo, y ademas
**todo cofre suelta una caja garantizada**. Se empieza la partida con una reserva corta
(60 ligeras, 40 medias, 8 cartuchos, 3 pesadas y 6 de energia).

Los bots no llevan cuenta de balas — no se quedan tirados sin municion — y por eso
ignoran las cajas y te las dejan a ti.

## Agua: nadar, bucear y pescar

Hay **cinco masas de agua**: dos lagos excavados dentro de las islas y los tres canales
de mar que las separan. Cada una tiene su propia superficie, asi que un lago puede estar
a distinta altura que el mar.

### La tecla Espacio

Es la misma tecla haciendo dos cosas segun donde estes:

- **En tierra** → salta, exactamente igual que siempre (147 px de altura).
- **Dentro del agua** → bucea hacia el fondo.

La deteccion se hace por el PECHO del personaje, no por los pies, para que estar de pie
en la orilla con los pies mojados no cuente como nadar.

### Como se siente

Nadar es mas flotante y mas lento: la gravedad baja al 10 %, la velocidad maxima es de
190 px/s (frente a 230 andando y 400 corriendo) y el agua frena. Sin pulsar nada el
cuerpo **flota solo** hasta la superficie; nadando contra la orilla se **sube el escalon**
y se sale a tierra andando. Nadar no gasta la barra de rapidez: la recupera.

Caerse al agua **ya no mata** (antes te reaparecia en la isla mas cercana): ahora se nada.

### Peces

Repartidos por lagos y canales (unos 23 por partida), de cuatro colores. Se cogen
**nadando por encima** y dan **+12 de vida**; reaparecen a los 9 segundos, asi que el
agua nunca se queda vacia.

## Cofres

Cada partida aparecen **30 cofres**, la mayoria dentro de los **10 sitios con nombre**
(Pinar Perdido, Cala Rocosa, Meseta Musgosa, Puente Partido, Cumbre Dorada, Valle Ventoso
y Bahia Bravia). Brillan para verse de lejos; al acercarte sale el cartel *"E para abrir"*.
Al abrirlo se levanta la tapa, suena, y escupe **2 o 3 objetos** en arco que puedes recoger.
Un cofre abierto se queda abierto.

El botin de cofre es **mejor que el del suelo**: la rareza se tira dos veces y se queda
la mejor de las dos. Medido sobre 200 000 tiradas:

| Rareza | Suelo | Cofre |
|--------|-------|-------|
| Comun | 31,6 % | 12,6 % |
| Poco comun | 26,8 % | 24,4 % |
| Raro | 19,6 % | 25,7 % |
| Epico | 13,0 % | 20,2 % |
| Legendario | 6,4 % | 11,9 % |
| Mitico | 2,6 % | 5,2 % |

## Los 50 bots

Cada partida empieza con **51 vivos**: tu y 50 bots. Cada bot tiene:

- un **nombre distinto**, generado combinando apodo + base + remate, de modo que no se
  repiten dentro de una partida ni entre partidas (decenas de miles de combinaciones);
- una **skin** al azar de las 10 del catalogo;
- una **personalidad** que cambia como juega:

| Personalidad | Cuantos | Como juega |
|--------------|---------|------------|
| Agresivo | ~30 % | Se te echa encima, dispara pronto |
| Equilibrado | ~40 % | Mantiene las distancias |
| Pasivo | ~20 % | Espera, se cura antes, dispara peor |
| Francotirador | ~10 % | Te ve de lejos y apunta mejor |

### Como piensan

Una maquina de estados con cuatro comportamientos — **explorar**, **botin**, **combate**
y **curarse** — que decide unas 8 veces por segundo (no en cada frame). Los bots pasean
por el mapa, cogen armas y curas del suelo, saltan escalones y canales, se colocan a su
distancia preferida, disparan, huyen cuando estan muy tocados y se paran a curarse.
Sin arma pelean cuerpo a cuerpo.

Los bots reutilizan **la misma fisica que el jugador** (`Bot extends Player`): en vez de
un teclado les da ordenes un `BotInput` que rellena la IA. Asi no hay dos motores que
mantener.

### Que hace que sea justo

- **Fase de saqueo**: los primeros 14 segundos nadie dispara.
- **Tiempo de reaccion** de 0,35 a 0,70 s antes de abrir fuego.
- **Error de punteria** que solo mejora mientras te tienen a la vista.
- **Dano reducido** al 52 % del que hace el jugador.

Medido contra un jugador **quieto y sin escudo**, un bot tarda entre **2,5 y 4,6 segundos**
en abatirlo, y muchas veces falla. Todo esto se ajusta en `CONFIG.bots`.

## Granadas

Hay **tres**, y todas funcionan igual salvo por lo que pasa al reventar:

| | Que hace |
|---|---|
| **Granada** | Explota en area. Rompe construcciones y a ti tambien te pilla |
| **Granada de Choque** | **No hace dano**: manda por los aires a todo el que pille |
| **Escudo Burbuja** | Deja una **cupula** que para las balas por los dos lados |

Son un objeto mas del inventario, como las curas: se recogen del suelo o de un cofre, se
**apilan** (hasta 6 en una ranura), se equipan con las teclas `1`..`5` y se lanzan con el
**clic izquierdo**. La **primera** que coges en cada partida se explica sola por pantalla:
sin eso se recogian y se quedaban muertas en la ranura.

### Cuantas hay

La primera version repartia una cada **5168 px** de mapa. Como en pantalla caben 1024,
habia que recorrer **cinco pantallas** para tropezarse con una, y una partida entera podia
pasar sin ver ninguna. Ahora sale una cada **1846 px** en el Royale (14 por partida) y
cada **1437** en el Blitz (7): en el primer minuto ya has visto varias. No hizo falta ninguna tecla nueva, y ademas es como funciona en
Fortnite. El HUD ensena **siempre** cuantas te quedan, aunque quede una: saber eso es
justo lo que decide si la tiras ahora o te la guardas.

### El arco sale solo

No hay que calcular nada al lanzar: se apunta al raton y se le suma un empujon hacia
arriba **proporcional a la distancia**. De cerca sale casi recta; de lejos, en parabola
alta. Ademas hereda parte de tu carrera, asi que corriendo llega mas lejos.

Luego vuela con gravedad y **rebota** en el terreno y en las construcciones, resolviendo
la colision **eje a eje** igual que la fisica de los personajes: es lo que evita que una
granada rapida en diagonal se cuele por una esquina.

### Cuando explota

A los **2,2 segundos**... salvo que se quede quieta en el suelo, y entonces la mecha se
recorta a **medio segundo**. Sin eso, tirarla a los pies de alguien no servia de nada:
le daba tiempo de sobra a apartarse. Con eso, tirarla de cerca responde al momento y
sigue habiendo margen para huir de una que te tiren a ti.

### La explosion

Hace **105 de dano en el centro** y solo **22 en el borde** de sus 165 px; fuera de ahi,
nada. Y no distingue amigos: **si te pilla a ti, te pilla**. Es lo que obliga a pensar
antes de tirarla de cerca.

Contra las **construcciones** pega x2,6, para que una granada pueda abrir un hueco en una
pared de madera de un solo golpe (150 de vida, y la explosion le mete mas de eso a
bocajarro).

De momento **solo las lanza el jugador**. Los bots ni las cogen: sin esa regla, un bot se
las guardaba como cura —todo lo que no es arma cuenta como cura en su IA— y se "bebia"
una granada para curarse.

### Granada de choque

Copiada de la Shockwave Grenade de Fortnite. **No hace dano a nadie**: lo que hace es
**mandar por los aires** a todo el que pille en 240 px, tu incluido. El empujon va del
centro hacia fuera, baja con la distancia y **la mayor parte va hacia arriba**: por eso
sirve igual para escapar de un tiroteo, para subir a un tejado sin construir o para
descolocar al que viene a por ti. Aqui **conviene** que te pille.

(En Fortnite ademas quita el dano de caida. En este juego ese dano no existe, asi que no
habia nada que quitar.)

### Escudo burbuja

La Bubble Shield: al reventar deja una **cupula** de 155 px que dura **30 segundos** y
tiene **600 de vida**. Para las balas **en los dos sentidos** —ni te disparan desde fuera
ni tu disparas desde dentro— pero **se puede entrar andando**, asi que no te salva de que
se te metan dentro. En un modo sin construccion como el Julen Blitz, es la unica forma de
taparte para curarte con calma.

Lo de "los dos sentidos" es lo unico con miga: no basta con mirar si la bala esta dentro
del circulo, porque entonces una disparada desde dentro moriria en el mismo frame. Cada
bala **recuerda si nacio dentro** de una cupula, y solo se para cuando **cruza el borde**
—entrando si venia de fuera, saliendo si venia de dentro—. Comprobado: bloquea desde
fuera, bloquea desde dentro, y una bala que se queda dentro no le hace ni un rasguño.

La cupula se ve **a traves**: saber si hay alguien dentro es parte de la decision de
entrar o no. Parpadea en blanco cuando le dan, ensena su barra de vida en cuanto la
tocan, y los ultimos 4 segundos parpadea entera para avisar de que se va.

## Torretas y trampas

Dos trastos que se **colocan** y luego funcionan solos. Se recogen del suelo, de los
cofres y de los supply drops, se apilan en una ranura del inventario y se ponen con el
**clic izquierdo** donde apunte el raton — la misma tecla que todo lo demas, sin inventar
atajos nuevos.

| | Que hace | Vida |
|---|---|---|
| **Torreta** | Busca al enemigo mas cercano en **620 px** y le dispara sola, 2,6 veces por segundo | 260 |
| **Trampa de Pinchos** | **52 de dano** a quien la pise, con un respiro de 1,1 s entre pinchazo y pinchazo | 130 |

### Colocarlas

Mientras llevas una en la mano se ve un **fantasma** de donde caeria, con un anillo
**verde** si se puede y **rojo** si no, igual que al construir. Se apoya en la primera
superficie solida bajo el puntero, **tejados y construcciones tuyas incluidos**, y hay que
estar a menos de **260 px**. No deja ponerlas encima de otra ni justo debajo de tus pies
(de una trampa asi no saldrias sin comerte todos los pinchazos).

El fantasma y la colocacion de verdad salen de la **misma funcion** (`aim`), para que no
puedan decir cosas distintas: si lo ves verde, se pone.

### Se rompen

Las dos tienen vida y se las lleva **todo lo que se lleva a un personaje**: tiros, pico y
explosiones. Se consigue metiendolas en la lista de objetivos de las balas, dandoles la
misma cara que a un bot (`rect()`, `alive`, `takeDamage`).

Dos cosas que hubo que atar ahi:

- El envoltorio se crea **una vez** al colocarlas y se reutiliza. Las balas recuerdan a
  quien ya han golpeado **comparando objetos**, asi que fabricando uno nuevo cada frame
  esa cuenta no habria valido de nada.
- Necesita `x/y/w/h` sueltos **ademas** de `rect()`: las explosiones no usan `rect()`.
  Sin las coordenadas sueltas, una granada calculaba la distancia con `undefined`, salia
  `NaN`, y como `NaN > radio` es **falso** le metia un dano `NaN` que dejaba la vida rota
  para siempre. Ahora `takeDamage` ademas descarta cualquier cosa que no sea un numero.

Ni la torreta ni la trampa tocan a **quien las puso**. Los bots todavia no las colocan, y
por eso tampoco las recogen del suelo.

## Supply drops

Cada cierto tiempo cae del cielo una **caja de suministros**: paracaidas rojo y blanco,
caja metalica con franjas de aviso y **botin mejor que el de cualquier cofre**. La
primera a los **30 s** y luego cada **50** (en el Julen Blitz, a los 20 y cada 34).

Al principio la primera caia a los 55 s y en el Blitz a los 32, y era **demasiado tarde**:
muchas partidas se acababan —o te acababan— sin haber visto ninguna caer.

### El aviso es media gracia

La caja tarda **8 segundos** en bajar, con un **haz de luz** hasta el suelo y un
**anillo** marcando donde va a posarse. Todo el mundo lo ve, todo el mundo lo quiere, y
ahi es donde se monta. Si cae fuera de camara, sale una **flecha en el borde de la
pantalla** con la distancia en metros: sin ella, un supply drop a dos pantallas no existe
—el aviso de texto pasa y ya no hay forma de saber por donde era.

### Donde cae

Siempre **dentro de la zona segura** y sobre **tierra firme**: una caja en mitad de la
tormenta o en el fondo del mar no la disputaria nadie. Tampoco encima de un edificio, que
quedaria en el tejado o encerrada entre paredes. Se prueban 40 sitios al azar y se coge
el primero que valga; si ninguno sirve, no cae nada esa vez y se reintenta al siguiente
ciclo. Mejor saltarse una que dejarla donde no llega nadie.

### Lo que trae

Botin **fijo**, no sorteado: un cofre puede darte tres vendas, esto no.

| | Que sale |
|---|---|
| 1 | Un arma **legendaria o mejor** |
| 2 | Otra arma, **epica o mejor** |
| 3 | Una cura de las buenas |
| 4 | Granadas |
| 5 y 6 | Dos cajas de municion |

### Los bots tambien van

Y van **en cuanto ven el paracaidas**, no cuando ya ha tocado suelo: en Fortnite media
partida sale corriendo al ver la caja bajar. Cualquier bot a menos de 2600 px la pone por
delante de todo lo que no sea pelear.

La primera version se quedaba en **2 bots de 74** por partida: cualquier tiroteo a media
pantalla les cancelaba el viaje y a la caja no llegaba nadie. Ahora hay una regla de
**compromiso**: un bot que ya iba a por una caja solo se da la vuelta si tiene un enemigo
a menos de **480 px**; mas lejos, sigue andando. Con eso pasan a converger **3 o 4 a la
vez** y se abren **2 de cada 3** cajas por partida (la tercera suele seguir cayendo
cuando la partida acaba).

Si mientras va otro la abre, el bot cancela y se dedica a otra cosa — que casualmente es
justo donde hay alguien al que disparar.

## Zona segura

Sin nada que junte a los supervivientes, las partidas no terminaban: los ultimos bots se
quedaban dando vueltas por los extremos de la isla. Por eso hay una **zona segura** que se
cierra hacia el centro (a los 35 s empieza, y en 150 s llega a 900 px de ancho). Fuera de
ella se pierde vida poco a poco, y los bots corren a meterse dentro.

Con la zona, **12 de 12 partidas de prueba terminaron** con un unico superviviente, en
29-183 segundos. Es la version minima de la tormenta; cuando se implemente la de verdad
(fases con cuenta atras, aviso previo, efecto morado) basta con ampliar
`js/systems/safeZone.js`.

### Donde se cierra

El cierre **no va al medio exacto del mapa**. Con 7 sitios el medio caia en tierra de
casualidad; al pasar a 10, cayo justo en un canal de agua, y las partidas de prueba se
iban a **320 segundos sin acabar**: los tres ultimos supervivientes terminaban nadando en
circulos, sin poder dispararse.

Ahora se prueban posiciones cada 200 px a lo largo del mapa y se elige la que deja **mas
suelo pisable** dentro de la zona final; a igualdad de suelo, la mas cercana al medio. Se
calcula una vez por partida y vale igual para los canales entre sitios que para los lagos
de dentro de uno. Con el mapa actual sale el **13 410**, dentro de la Fabrica Tornillo, y
las partidas volvieron a **188-193 segundos**, lo mismo que tardaban con 7 sitios.

Un detalle que hubo que arreglar de paso: al mover el centro, el ancho de partida ya no
podia ser `world.width` a secas, o quedaba una franja del borde fuera de la zona **desde
el primer segundo** y quien cayera ahi empezaba perdiendo vida. Ahora el ancho inicial se
mide desde el centro elegido hasta el borde mas lejano.

## La carrera de obstaculos

Tres reglas que la hacen una carrera y no un paseo:

- **Cada intento es un recorrido nuevo.** Al llegar a la meta se ve el tiempo y el record
  unos segundos y despues **se monta otro circuito distinto** sin tocar nada. La cuenta
  atras vive en `endStep()`, un enganche aparte: al terminar un minijuego el juego lo
  CONGELA y deja de llamar a `step()`, asi que ahi no habria corrido nada.
- **Si te caes, vuelves a la salida.** No hay puntos de control: la carrera entera o nada.
- **Ni pico ni construccion.** `build: false` apaga de golpe la tala y la construccion,
  para el jugador y para todos. Antes solo se ponia `player.wood = 0` cada frame, que
  dejaba talar arboles igualmente —se veian caer— y dependia de acordarse de poner la
  madera a cero en todos los sitios. Construirse un atajo hasta la meta es hacer trampas.

## Rendimiento con el mapa grande

Al crecer el mapa un 44%, lo que mas se notaba no era la fisica sino **dibujar**: la
decoracion (props, matas de hierba y manchas de tierra) se recorria **entera cada frame**
para preguntarle a cada pieza si estaba en pantalla, cuando en pantalla caben 1.400 px de
los 25.840 del mapa.

Ahora la decoracion se reparte en las **mismas columnas de 512 px** que ya usaban las
plataformas (`World._bucketize`), y dibujar solo mira las columnas que pilla la camara
(`World.forEachDecorNear`). La IA de los bots ya tenia lo suyo: los que estan a mas de
2.200 px del jugador se simulan **uno de cada tres frames**, y con un mapa mas largo eso
alcanza a mas bots, asi que el mapa grande sale hasta a favor.

Medido con 75 personajes, actualizando **y dibujando** cada paso: **0,31 ms por frame**,
frente a los 16,7 ms que hay de presupuesto a 60 fps. Y 0 bots atascados en 3 partidas
completas.

## Madera y construccion

### 1) Talar arboles

Con el **pico** (`F`) se golpean los arboles: pinos, abetos, palmeras, cactus y setos.
Hacen falta unos **5 segundos** de golpes (`CONFIG.build.chopSeconds`), que a la cadencia
del pico salen **8 golpes**. Mientras tanto el arbol **tiembla y se inclina**, y encima
sale una **barra de progreso**. Al terminar, el arbol cae y da **60 de madera**
(`CONFIG.build.woodPerTree`). La madera se ve abajo a la izquierda, junto a la vida.

Los **bots tambien talan**: un 35 % de ellos (`botChopChance`) van a por madera cuando no
tienen nada mejor que hacer, hasta juntar 90 (`botWoodTarget`).

Todo esto vive en [`js/systems/harvest.js`](js/systems/harvest.js).

### 2) El modo construccion (`Q`)

`Q` entra y sale. Dentro, el **clic izquierdo coloca** en vez de disparar; el resto de
controles (mover, saltar, correr) no cambian. Se ve una **silueta translucida** de la
pieza pegada a una **rejilla de 96 px**: **verde** si se puede poner y **roja** con el
motivo escrito encima si no (`Necesitas 10 de madera`, `Demasiado lejos`,
`El sitio esta ocupado`, `Estas en medio`). `Z`, `X` y `C` eligen pieza y, si hace falta,
entran solos en el modo.

Manteniendo el boton pulsado se pueden encadenar piezas arrastrando, pero solo **una por
celda**, para no vaciar la madera de un tiron.

### 3) Las 3 piezas — 10 de madera cada una

| Tecla | Pieza  | Que hace                                    | Vida |
|-------|--------|---------------------------------------------|------|
| `Z`   | Pared  | Columna vertical: corta el paso y para las balas | 150 |
| `X`   | Suelo  | Plataforma horizontal para cruzar o cubrirte | 120 |
| `C`   | Rampa  | Cuatro peldanos para subir 96 px             | 110 |

Las medidas y las cajas de colision estan en
[`js/data/structures.js`](js/data/structures.js).

Dos detalles que hacen que se sienta bien:

- **Las piezas se posan en el suelo.** El terreno es irregular y casi nunca cae en la
  rejilla, asi que al construir a ras de suelo la pieza **baja hasta apoyarse**
  (`CONFIG.build.groundSnap`). Sin esto media celda quedaba enterrada (y no dejaba
  construir) y la de encima flotaba a 20 o 30 px.
- **Las rampas se suben andando.** Sus peldanos llevan la marca `ramp`, y el resolvedor
  de colisiones del jugador sube escalones de hasta 30 px (`CONFIG.build.rampStep`) sin
  tener que saltar en cada uno. Es el mismo truco que ya se usaba para salir del agua.

### 4) Romperlas

Toda pieza tiene **vida** y la puede tirar abajo **cualquiera**:

- **A tiros**: la bala se para en la pieza y le hace su dano normal.
- **A picotazos**: el pico hace el **doble** de dano a las construcciones
  (`CONFIG.combat.pickaxeVsBuild`). Si hay un arbol y una construccion cerca, golpea
  **lo que este mas cerca** de la punta del pico.

Los **bots rompen lo que les estorba**: si tienen una pieza delante mientras avanzan,
se paran a picarla (`botBreakRange`). Cuando una pieza revienta, sus cajas salen del
indice de colisiones del mundo y deja de bloquear al momento.

### Los bots tambien construyen

Le dan los dos usos que le daria cualquiera:

- **RAMPA para salir de un atasco.** Cuando llevan casi un segundo sin avanzar y su
  destino esta lejos, plantan una rampa en el sentido en el que iban. Antes se quedaban
  dando vueltas hasta que el antiatasco les daba media vuelta.
- **PARED para cubrirse.** En combate, si les acaban de dar y el enemigo esta entre 140 y
  700 px, levantan una pared en medio. De mas cerca no sirve de nada y encima se
  encierran; de mas lejos ya no les estan acertando.

Esperan `BUILD_COOLDOWN` (1,1 s) entre pieza y pieza, para que no levanten una torre de
golpe. Y **la mitad empieza con madera** (`CONFIG.bots.startWood`): sin nada que gastar no
podrian construir hasta talar su primer arbol, y para entonces la partida ya va por la
mitad.

Todo pasa por `BuildManager.tryPlaceFor()`, que comprueba lo mismo que la
previsualizacion del jugador —madera, alcance, sitio ocupado— asi que los bots no pueden
hacer nada que tu no pudieras. En una partida normal construyen unos **27 bots
distintos**, unas 70 piezas (3 de cada 4 son rampas), y lo que levantan se queda en el
mapa: se puede usar, y romper, como cualquier otra construccion.

### Dianas de entrenamiento

Siguen los seis **maniquies de practica** repartidos por la isla, utiles para probar el
dano de cada arma sin que te disparen. Se pueden borrar (`js/entities/target.js`) sin
tocar nada mas.

## Ajustes rapidos

Casi todo el *game feel* se toca en [`js/core/config.js`](js/core/config.js):
velocidades, altura de salto, gravedad, consumo/recarga de la barra de corrida,
zoom y suavizado de la camara, y la paleta de colores.

## Notas de diseno

- **Paso fijo de fisica** (1/120 s) con acumulador: el juego se comporta igual a 60 y a 144 Hz.
- **Colisiones AABB eje por eje** (primero X, luego Y), con plataformas *solidas* y *finas*
  (one-way: solo se aterriza desde arriba).
- **Game feel**: coyote time, jump buffer, salto variable y squash & stretch.
- **Nado**: fisica aparte con flotabilidad, rozamiento y salida por escalon.
- **Decoracion deterministica**: generada con un PRNG con semilla, asi el mapa es siempre igual.
- Todo el arte es vectorial en canvas, sin imagenes: recolorear skins sera trivial.

## Siguientes pasos (todavia NO implementados)

La tormenta completa (la zona segura actual es su version minima). Los bots
**rompen** construcciones pero todavia no las **levantan**: darles rampas y paredes
seria el siguiente paso natural de la IA.

Los 50 pavos se siguen dando **al terminar** cualquier partida. Ahora que la victoria
existe de verdad, para darlos solo al GANAR basta con envolver la llamada a
`profile.addMatchReward()` de `js/main.js` en `if (resumen.result === 'victoria')`.
