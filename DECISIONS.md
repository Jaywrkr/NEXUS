# Decisiones — Los Nexus

**Decisión 001**
El juego será web con Phaser, TypeScript y Vite.

**Decisión 002**
El juego será 2D o 2.5D simple.

**Decisión 003**
El Nexus será humanoide fantástico, no humano realista.

**Decisión 004**
La mecánica central será conectar objetos mediante un cable de energía.

**Decisión 005**
El MVP probará únicamente conexión y transformación.

**Decisión 006**
No se agregará combate, inventario complejo, economía ni multijugador.

**Decisión 007**
El progreso será visible en el mundo y en la colección.

**Decisión 008**
Toda mecánica nueva debe reutilizar la acción de conectar.

**Decisión 009**
El proyecto puede crecer más allá del MVP 0.0 mientras el usuario lo apruebe explícitamente en cada paso. El MVP 0.0 fue el punto de partida, no un techo fijo.

**Decisión 010**
El mundo puede tener múltiples zonas conectadas por scroll horizontal de cámara, en vez de una sola pantalla fija. Cada zona debe tener un "sabor" de puzzle distinto (secuencial, un paso, doble conexión, bloqueo físico) sin dejar de ser solo "conectar".

**Decisión 011**
La personalización del Nexus puede incluir forma además de color (gorra, mochila), no solo color plano. Sigue sin usar assets externos: todo son formas de Phaser.

**Decisión 012**
El diseño visual del Nexus se basa en una referencia compartida por el usuario (criatura con orejas de conejo, cabeza clara, cara negra, ojos ovalados, hoodie, mochila con cable de energía) — ver `src/entities/Nexus.ts`. Cualquier cambio de diseño del personaje debe mantener esa identidad.

**Decisión 013**
El juego debe adaptarse de verdad a celular en vertical (cambiando resolución interna), no limitarse a pedir que el jugador rote el teléfono.

**Decisión 014**
Además de tocar los objetos directamente, debe existir una forma de interactuar más tolerante al error de precisión táctil (botón de interacción por proximidad), sin reemplazar el toque directo.

**Decisión 015**
Los problemas reales solo se confirman probando el juego jugando (build limpio no alcanza). Toda funcionalidad nueva se verifica con pruebas automatizadas de interacción (Playwright + capturas) antes de darla por terminada, y las pruebas en dispositivo real del usuario son la validación final que puede revelar cosas que el simulador no muestra.

**Decisión 016**
Idea de Luca: algunas conexiones pueden abrir un mini-juego "dentro" del cable (`CableTunnelScene`) en vez de resolverse al toque — la chispa avanza sola por un túnel ondulado y hay que guiarla (arriba/abajo) sin tocar los bordes; perder devuelve a intentar la conexión de nuevo, sin penalidad extra. Sigue siendo la acción de conectar (Decisión 008), solo que con un paso intermedio. Se probó primero en una sola conexión (fuente→lámpara de la plaza) antes de aplicarlo a otras.

**Decisión 017**
El usuario decidió explícitamente romper la regla de "nada de assets externos" (parte de la Decisión original de solo usar formas de Phaser) para acercar el visual del Nexus al nivel de detalle de una hoja de referencia de personaje que compartió (proporciones, paleta, expresión, mochila/cable, orejas con puntas de color). Las imágenes se generan afuera (otra herramienta de IA, o dibujo) usando los prompts de `ART_PROMPTS.md`, y se integran como sprites en `public/assets/nexus/` (ver ese README para el detalle técnico). Hasta que los archivos reales existan, `Nexus.ts` sigue dibujando el personaje con formas — el cambio de renderizado se hace recién cuando lleguen las imágenes. La personalización (colores/gorra/mochila) habrá que resolverla con capas separadas por prenda + tint, no con un único PNG a todo color, para no perder esa funcionalidad ya existente.


**Decisión 018**
El mini-túnel ofrece una fase de práctica sin derrota antes de empezar. Tras perder permite reintentar directamente la misma conexión o volver al mundo; no hay penalidad ni recompensa por cancelar. Solo superar el recorrido completa la conexión. Esta mejora forma parte del plan aprobado de desarrollo; la dificultad se ajustará después de probar con Luca.


**Decisión 019**
Las ayudas deben ser discretas y aparecer solo tras un período sin interacción: resaltan un paso pendiente visible, sin añadir botones ni explicaciones largas. La opción «Efectos suaves» permite desactivar flashes/sacudidas y mantener estáticas las pistas, siguiendo inicialmente la preferencia del dispositivo. Se guarda de forma independiente y no altera dificultad ni recompensas. Forma parte del plan aprobado de desarrollo.


**Decisión 020**
Los recuerdos del museo representan cada zona con una forma propia y una pequeña respuesta al toque, como parte del plan aprobado. No añaden un puzzle ni recompensas: la colección se obtiene conectando en el mundo. Las vitrinas completas ofrecen un área táctil amplia; la reacción respeta «Efectos suaves» y conserva el formato de las partidas existentes.


**Decisión 021**
La quinta zona del plan aprobado es un jardín al otro lado del puente, con energía → aspersor → flores. Mantiene la única acción de conectar y no añade otro mini-juego ni botones. Completar el riego transforma el lugar y entrega una flor para el museo. La colección actual se define en un lugar compartido; la celebración guardada incluye su tamaño para permitir continuar una partida terminada antes de añadir zonas sin perder progreso ni repetir la celebración al recargar.


**Decisión 022**
El usuario autoriza ejecutar de forma autónoma seis fases anidadas para crear un primer capítulo: diseño, habitantes/objetivos, humor/consecuencias, taller, faroles/reto final y desenlace/exploración. La historia y las reacciones son breves y originales, sin bloquear los controles ni añadir otra acción de puzzle. La duración se valida jugando; no se fabrica con esperas. Cada fase se prueba, se publica en su rama y deja PR/merge al usuario.


**Decisión 023**
Se desarrolla el primer bloque de la ampliación propuesta: encargos con misterio, decisiones reversibles y consecuencias entre lugares. El primer cable conserva una enseñanza explícita. El botón opcional «Pista» revela ayuda en tres niveles sin detener el movimiento, ampliando la ayuda automática de la Decisión 019. Cambiar una elección se hace conectando otro destino, conserva los preparativos y no penaliza. No se atribuye duración humana a un recorrido automático. Cada fase se publica en una rama anidada y el usuario integra los PR.


**Decisión 024**
Los dos encargos de regreso forman parte del bloque de consecuencias aprobado. La emisión habilita resolverlos, pero el resultado de un proyecto terminado permanece al cambiar de canal. Se distingue disponibilidad inicial de restauración de un cable guardado. Los encargos amplían las sorpresas de cinco a siete sin añadir recuerdos obligatorios ni impedir el desenlace. Las pistas locales reutilizan «Pista» y mantienen la graduación en tres niveles.

**Decisión 025**
El usuario pide mejorar los gráficos. El barrio adopta una ilustración original con yeso crema, terracota, cobre, vegetación y energía turquesa. Cada zona tiene arquitectura y un letrero propio; portada, museo, final y controles comparten materiales y marcos. Se mantiene el Nexus existente y el dibujo procedural de Phaser para el resto. Los escenarios estáticos se generan una vez por zona/altura y reutilizan sus texturas al regresar del museo; los objetos conservan capas de estado y áreas de toque. La decoración no recibe input ni añade colisiones. No se añaden efectos animados obligatorios: las fuentes y la vida ambiental respetan «Efectos suaves».

**Decisión 026**
El usuario solicita más duración, contenido y personalización. Se autoriza un armario con nombre, colores de chaqueta/mochila, accesorios y cable, conservando la identidad y las cuatro poses del Nexus. La ropa usa paletas calculadas en ejecución sobre los sprites existentes; los adornos son Graphics. La apariencia y los estilos ganados persisten separados del progreso y sobreviven a «Nueva partida». Tres historias secundarias con reglas propias y decisiones otorgarán los estilos especiales, sin monedas ni esperas. Cada bloque tiene rama anidada, commit y push; PR y merge siguen a cargo del usuario.


**Decisión 027**
Las historias secundarias son opcionales y se abren al restaurar su lugar. Cada pasada acepta una sola propuesta; repetir permite explorar el otro desenlace sin borrar los finales vistos, la apariencia ganada ni los cables del barrio. Las metas de dos entradas necesitan señales distintas. Cambiar una propuesta guardada solo sustituye los destinos de su grupo, conservando las otras ramas del origen. Los tres encargos aportan 16 conexiones por pasada y seis desenlaces, sin afirmar una duración humana a partir de las pruebas automatizadas.


**Decisión 028**
El usuario solicita una revisión completa del arte y todas las interfaces sin añadir funcionalidades. Se aplica una dirección ilustrada común a las ocho escenas: tinta azul petróleo, papel cálido, cobre, vegetación y energía turquesa. Se mejora composición, tipografía, luz, materiales y legibilidad de estados conservando mecánicas, contenido, guardado, áreas de input y controles. Fondos y materiales se hornean y reutilizan; no se incorporan assets remotos ni animaciones obligatorias. Se mantienen sprites e identidad del Nexus. La rama continúa desde `codex/historias-del-barrio`, con commit y push; PR y merge a cargo del usuario.


**Decisión 029**
El usuario pide una estética más moderna con toques visuales de Fortnite y autoriza la muestra propuesta de plaza, portada y HUD. Se adopta una ilustración original de formas volumétricas estilizadas, color saturado, energía cian, base azul/violeta y acciones amarillas. Paneles y botones planos, tipografía gruesa y sombras por planos sustituyen el acabado de papel y cobre en la muestra. Se conservan identidad del Nexus, funciones, guardado, controles y áreas de input. La rama se anida sobre `codex/acabado-artistico`; el usuario integra los PR.


**Decisión 030**
Con «sigue», el usuario autoriza extender la dirección moderna aprobada al resto del juego. Los siete distritos comparten losas grandes, fachadas con volumen y vegetación facetada, con hitos propios por barrio. Armario, diario, encargos, museo, final y túnel adoptan azul/violeta, energía cian, texto claro y botones planos. La estética es original; no se incorporan recursos de Fortnite. Se conservan funciones, posiciones, geometría del túnel, identidad del Nexus y guardado. La rama se anida sobre `codex/estilo-moderno-plaza`; PR y merge a cargo del usuario.


**Decisión histórica H018 (señuelo)**
Un "señuelo" (objeto que parece conectable pero no sirve) no necesita lógica especial: es un objeto registrado en `ConnectionSystem` sin ninguna regla, así que cae en el manejo genérico de conexión inválida. Debe verse sutilmente distinto de los reales (la fuente señuelo es gris y sin brillo animado) para que el puzzle sea de observar, no de adivinar. Primer uso: zona de la antena.

**Decisión histórica H019 (fragmento secreto)**
Puede haber fragmentos extra que premian explorar (el primero: el fragmento secreto detrás de la casa) sin depender de una conexión. No cuentan para el contador `★ n/4` ni para "¡Colección completa!" — eso sigue atado solo a los fragmentos de zona (`ALL_FRAGMENT_IDS`) — pero sí tienen vitrina propia en el Museo.


**Decisión 031**
Por petición explícita del usuario se reparan todas las ramas pendientes para integrar de una en una. Se usan merges normales que preservan el historial y los cambios de la base, sin force push. Los PR y merges finales siguen a cargo del usuario; la cadena requiere commits de merge para conservar la ascendencia. El secreto conserva vitrina propia sin contar como recuerdo del capítulo; el señuelo y las partículas también se conservan.

**Decisión 032 — Primera experiencia y muestra de arte**
Tras probar el juego, el usuario pide mejorar la claridad inicial y sustituir el aspecto rudimentario. Se autoriza una muestra de la plaza antes de renovar el resto del mundo. Seis instrucciones persistentes enseñan acercarse a Miga, elegir origen y destino, conectar la lámpara con la puerta y recoger el recuerdo; se derivan del guardado y la selección real. No bloquean explorar ni repiten progreso antiguo. Miga se sitúa cerca del inicio. El túnel mantiene su práctica después de elegir el primer destino. Se autoriza expresamente arte ilustrado y sprites originales para escenario, objetos, Miga y fauna, ampliando la excepción de la Decisión 017. La mecánica sigue siendo conectar. Ramas anidadas con commit/push; el usuario hace PR y merge y revisa la muestra antes de extenderla.


## 033 — La referencia de lápiz define todo el arte (2026-10-06)

El usuario sustituye expresamente la dirección anterior y pide extender su hoja
Nexus a todos los personajes, accesorios, objetos, barrios e interfaces. Se autoriza
la generación y carga de ilustraciones originales para todo el juego. La cara de
grafito, ojos ovalados amarillos, antenas naranja/azul, sudadera turquesa con **2**,
pañuelo naranja, mochila marfil y cable lima definen el protagonista. Se conserva
el trazo irregular y el pigmento de lápiz. Papel y Patrick Hand local sustituyen
menús oscuros y tipografía industrial. No se añaden funciones. Las poses, ropa,
adornos y estados de máquinas se adaptan al mismo lenguaje visual; los colores
seleccionados y desbloqueos siguen guardados. Las preferencias antiguas del cable
se respetan; el nuevo color predeterminado es lima. Los fondos independientes evitan ampliar
celdas pequeñas y se encuadran sin deformarlas. Las tres ramas son descendientes
de la cadena pendiente de la plaza; el usuario hace PR y merge.

## 034 — Plaza con suelo, huellas y conexiones explicables

La plaza usa una línea transitable medida por los pies: el Nexus no puede entrar en las fachadas o caminar sobre los tejados. El borde baja suavemente al salir hacia el paseo. Generador, lámpara y puerta tienen huellas físicas pequeñas, y los objetos y habitantes se ordenan por la altura de sus pies. La sombra del Nexus se mantiene en el suelo; caminar usa un balanceo corto y la celebración no arrastra la sombra.

Se conserva el circuito guardado generador → lámpara → puerta, explicándolo como lámpara con relé que alimenta el cierre eléctrico. La selección señala las entradas disponibles y admite cancelación tocando de nuevo el origen o con Escape. Los errores y éxitos reemplazan su feedback anterior, sin dejar temporizadores que borren un cable más reciente. El túnel sigue siendo una prueba explícita de conducir energía, con práctica y salida.

Los sprites de los conectables solo se sincronizan cuando cambia su estado, contador o variante, en lugar de volver a aplicar textura y escala cada fotograma. Esto reduce trabajo repetido; no equivale a demostrar rendimiento en un teléfono real.

## 035 — Circuito de agua con causa visible y poses por dirección

El usuario pide elevar la profesionalidad, resolver demoras y exigir lógica en
movimientos y conexiones, y autoriza la implementación con «hazlo». El Paseo del
Agua sustituye el enchufe directo a la fuente por generador → bomba → una válvula
→ fuente. Directa de 3 bar y reguladora de 2 bar son alternativas reversibles,
con distinta animación del flujo; cambiar cierra la salida anterior. Sigue siendo
la única acción de conectar y no añade penalizaciones ni requisitos al álbum.
Partidas antiguas restauran su logro; cambiar de ruta persiste la cadena completa.

Se autorizan sprites originales adicionales con el mismo lápiz: dos pasos de
perfil, dos de espalda, reposo de perfil y espalda, bomba y dos válvulas.
La cadencia depende del desplazamiento real; no se corre contra las huellas.
La sombra queda en el suelo. La radio se separa de la fuente para evitar solapes.
Se prepara la paleta antes de jugar, y audio/gestos se liberan al salir de escenas.
Build, pruebas unitarias, circuito en ambas orientaciones y recorrido completo
caminando documentan el alcance; rendimiento real en teléfono requiere playtest.
Rama desde la base integrada, commit y push; PR/merge a cargo del usuario.

**Decisión 033 — Paso a 3D**
El juego principal pasa a **3D** con el estilo visual de *Calle 85* (otro proyecto de Jay): barrio abierto, toon shading de 3 bandas, contorno por casco invertido, textura de pincel y post-proceso Kuwahara tipo gouache. Pedido explícito del usuario; reemplaza la Decisión 002 ("2D o 2.5D simple") y la línea de `GAME_VISION.md` que descartaba el 3D. Motor: **Three.js en el navegador** (no Godot como Calle 85), porque Luca juega en el celular desde el navegador. El usuario eligió que el 3D sea la página principal (`index.html`) **aunque hoy tenga menos contenido que la 2D** (solo las 4 zonas originales + señuelo + secreto); la 2D completa queda en `2d.html` con sus pruebas, y su contenido se irá pasando al 3D de a una pieza.

**Decisión 034 — El Nexus y el mundo 3D con primitivas**
El Nexus 3D se arma con primitivas y animación procedural (como Nico en Calle 85), manteniendo la identidad de las Decisiones 012/017: orejas de conejo con puntas celeste y naranja, cabeza clara con visor oscuro y ojos amarillos, hoodie turquesa, mochila con cable. El barrio también se arma con primitivas, sin modelos ni imágenes externas. Los sprites de lápiz quedan para la 2D.

**Decisión 035 — Cámara y cables en 3D**
Cámara isométrica por defecto (lee mejor el barrio y deja tocar los objetos en el celular) con silueta cuando algo tapa al Nexus; la vista "detrás" del personaje queda disponible con V / botón VISTA. Las conexiones hechas quedan dibujadas en el mundo, el cable "en la mano" sale de la mochila del Nexus mientras hay un origen elegido, y una misma conexión no se puede repetir.

**Decisión 036 — El pueblo empieza triste y sin color**
Objetivo central del juego, pedido por el usuario: el mundo arranca gris y triste, y el Nexus le devuelve la vida conectando cosas. En 3D se implementa en el shader de los materiales del mundo (`withLife` en `src/3d/core/render.ts`): fuera de los "círculos de vida" todo se ve desaturado y frío. Cada conexión abre un círculo de color alrededor de lo que se encendió; resolver una zona lo agranda a toda la zona; con todas las zonas, el color vuelve al pueblo entero. Cielo, niebla y luz también pasan de gris a cobalto. El Nexus, los objetos conectables y los fragmentos mantienen su color (`keepVivid`): traen la vida y se leen como "lo que se puede tocar". Los vecinos están grises y cabizbajos hasta que su lugar revive. Todo contenido nuevo tiene que sumarse a esta idea: algo apagado que, al conectarlo, devuelve color y vida.

**Decisión 037 — Mundo abierto, no niveles**
El usuario quiere un mundo abierto, no puntos fijos ni niveles. El barrio 3D es un solo mapa sin cargas, por donde se camina libre, y los lugares se pueden restaurar en cualquier orden (salvo lo que esté físicamente del otro lado de un obstáculo, como el canal). Lo nuevo (zonas de la 2D que se pasen, ideas futuras) se agrega como partes del mismo barrio, no como pantallas o niveles aparte. Los mensajes y pistas orientan pero no imponen un orden.

**Decisión 038 — Los vecinos del capítulo 1 en 3D**
Miga, Bombo, Vera y Don Paso ya viven en el barrio 3D, armados con primitivas (cada uno con su accesorio: casco y llave, impermeable y tambor, auriculares y micrófono, galera y lentes). Usan los mismos textos de la 2D (`src/data/chapter.ts`, `residentLine`), salvo el pedido de Bombo, porque en 3D la fuente todavía no tiene bomba ni válvulas. Hablan solos la primera vez que el Nexus se acerca, después con el botón "Hablar" o tocándolos; las visitas se guardan. Goteo, Pipa y Lucio llegan cuando se pasen sus zonas.

**Decisión 039 — El jardín municipal en 3D y un túnel con fases**
La zona 5 de la 2D pasa al 3D como **jardín municipal** del otro lado del canal (se llega por el puente, así el mundo abierto tiene un lugar que se "gana" sin ser un nivel). Conserva el puzzle de la 2D: fuente → aspersor → cantero, y el aspersor solo puede iniciar el segundo cable cuando está encendido. Sigue la Decisión 036: el cantero empieza seco y gris y florece al conectarlo; Goteo está triste hasta entonces. Los objetos grandes se alcanzan por su borde (`distanceFrom`). El mini-túnel se ordena en fases (práctica, cuenta regresiva, carrera, reintentar/volver) para que un chico de 9 años entienda qué pasa antes de que empiece a moverse, y se maneja igual en el celular. Los nombres de los objetos aparecen al acercarse (HTML, legible con el filtro de pincel), y las parejas graciosas responden con su broma en vez de un error.

**Decisión 040 — Más cosas para hacer sin agrandar el barrio**
El usuario pidió que el juego sea más divertido y con más cosas **sin hacer más grande el espacio**. Se llena el barrio que ya existe en vez de agregar zonas: (1) **cosas dormidas**, veinte objetos chicos con «Zzz» que se despiertan con la misma acción de conectar desde **chisperos** cercanos, con reacciones cortas, graciosas y repetibles, y un contador opcional; y (2) **el barrio reacciona al Nexus** al caminar (palomas, charcos, hojas, pelotas), sin acciones nuevas. Pensado para Luca: premios cortos y seguidos, siempre algo cerca para hacer, y cada cosa despierta suma un poco de color (Decisión 036). No bloquean nada ni cuentan para el museo. Los cables de estas conexiones se desvanecen para no tapar el barrio.

**Decisión 041 — La Gran Chispa: mochila Atrapachispas y carrera de luz siempre distinta**
Pedido del usuario: que la mochila se cargue de energía y con ella se despierten las cosas nuevas y chicas; que lo grande siga necesitando conexión directa desde una fuente, y que esa conexión **siempre** pase por la carrera de luz, cada vez diferente (forma, dificultad, color, animación). Se le da sentido con una historia: la **Gran Chispa** del barrio se apagó y se rompió en chispitas; la mochila del Nexus las junta y las devuelve. Las chispitas salen de las carreras de luz, de los lugares que reviven, de escondites por el barrio y de nidos que se recargan (los chisperos de la Decisión 040 pasan a ser nidos). Sigue siendo una sola acción: conectar (con cable o con la mochila). La dificultad de la carrera se adapta para que Luca no se frustre: sube de a poco, y dos choques seguidos la hacen más fácil. Reemplaza la idea de que solo fuente→farola tuviera túnel (Decisión 016).

**Decisión 042 — El Nexus hace más cosas: saltar, tirolesa y bailar**
El usuario pidió que el Nexus pueda interactuar de más formas y aprobó las tres propuestas. Son las primeras acciones que no son conectar (se amplía la Decisión 008 con su aprobación expresa): **saltar** (con lugares altos —bancos, tacho, autos— y chispitas arriba que premian explorar), **tirolesa** con el cable de la mochila entre los postes de luz (encaja con la historia de la Gran Chispa y reutiliza los postes) y **bailar** (los vecinos se suman; al hablar, el Nexus saluda). No hay combate ni castigos. En el celular se agrega un solo botón grande (SALTAR) y uno chico (BAILAR); la tirolesa usa el mismo botón de tocar cuando el Nexus está al lado de un poste. Espacio pasa a ser saltar; tocar queda en E.

**Decisión 043 — Fase 0 del plan maestro: interfaz pulida y base para crecer**
Primera fase de `PLAN_MAESTRO.md`, aprobada por el usuario. **Interfaz**: un solo kit (tinta, crema, sol, teal; Bowlby One + Nunito; botones con sombra dura) en título, HUD, menús, museo y túnel. HUD final: ☰ y mochila 🎒 arriba a la izquierda, **objetivo** arriba al centro (los avisos de lo que acaba de pasar se destacan unos segundos y después vuelve el objetivo; tocarlo o H da una **pista** con flecha en el piso y aro en el destino), contadores ★ ✦ arriba a la derecha, tarjetas de los vecinos con retrato, cartel grande al entrar a un distrito. En el celular hay como máximo dos botones de acción (contextual y SALTAR); bailar y saludar pasan al menú. **Menú ☰ / Esc** pausa el mundo: mapa (también M), museo, gestos, cómo se juega, opciones (sonido, vibración, efectos suaves, cámara detrás, botones grandes, borrar partida con confirmación) y volver al título. Las opciones se guardan aparte de la partida. **Base para crecer**: distritos con nombre (`world/districts.ts`), mapa que muestra los que vienen, la calle del este sigue hasta el portón cerrado del Skatepark («¡muy pronto!»), y el primer **interior**: la casa de Miga se abre cuando la plaza revive (botón Entrar en la puerta, Salir en el felpudo), con cama y banco de trabajo para saltar y una chispita escondida. Los interiores son habitaciones "maqueta" lejos del barrio dentro de la misma escena, siempre a todo color.

**Decisión 044 — Fase 1: Skatepark, patineta, capucha y Mundo Voltio básico**
Segunda fase de `PLAN_MAESTRO.md`, aprobada por el usuario. **Skatepark** al final de la calle del este (x 61–96, z −20…20): cemento, grafitis originales, la **rampa grande** (lugar grande: fuente → rampa con carrera de luz de tema grafiti, revive el distrito y alegra a **Rulo**, el patinador), dos rampitas, dos barandas, un cajón y la **sala del skatepark** con persiana. **Patineta**: Rulo deja la suya; con el botón contextual (E) el Nexus sube y baja; va hacia donde mira (dobla de a poco, acelera, se desliza, frena tirando para atrás), Espacio hace ollie, las rampitas lo hacen volar y cayendo sobre una baranda a lo largo grinda hasta la punta. **Desafío de Rulo**: ollie + vuelo + grind destraban la **capucha**. **Mundo Voltio** (⚡ o Q): el mismo mapa en negro con bordes de neón (post-proceso), grilla en el piso, más velocidad y salto; no se conecta ni se habla: se dibuja con la **estela**. Cerrar un círculo con la estela rompe lo que quede adentro: la jaula del Chispi **Rueditas** (primer rescate, carta que pausa el juego) o una **Estática** (se vuelve chispitas y reaparece). Si una Estática te toca: «¡bzzzt!» y volvés al mundo normal, sin castigo. Barra de voltaje de 30 s que se recarga afuera. **Regla de oro**: los tres nodos del circuito frente a la sala, tocados en el Mundo Voltio, abren la persiana en el mundo normal; la sala es el segundo interior (chispita arriba de las cajas). En el celular siguen siendo como máximo tres botones de acción (contextual, SALTAR y ⚡). Todo se guarda (`flags`, `chispis` en el progreso 3D). Pendiente para fases siguientes: medio tubo, rieles de luz en Voltio, álbum de cartas y Chispi compañero.

**Decisión 045 — Fase 2: primeros interiores que se reviven**
Tercera fase de `PLAN_MAESTRO.md`, pedida por el usuario. La idea central (Decisión 036) llega adentro de las casas: cada interior **empieza gris** y tiene **algo para revivir** con la misma acción de siempre (cable desde la energía de la habitación + carrera de luz con tema propio). Al revivirlo, la habitación recupera el color y **se nota desde afuera**. Tres interiores en el Centro: **casa de Miga** (tablero de luz → guirnalda de luces en el frente de la casa; antes la casa estaba siempre a color, ahora sigue la regla), **heladería** (máquina de helados → vidriera encendida; abierta desde el principio) y **tienda de cartas** (vitrina de cartas → vidriera encendida). La tienda de cartas está **trabada con una reja** que se abre cerrando su **circuito en el Mundo Voltio** (tres nodos frente al local), como pide la regla de oro: lo que se arregla en un mundo se nota en el otro. Cada interior tiene una chispita escondida. El local «JUEGOS» de la calle pasa a ser «CARTAS». Las habitaciones se arman con `roomShell`, se grisan con `makeGray` (sin usar los círculos de vida, que están lejos) y no se agrupan con `batchStatic`. Los cerros del horizonte al este se sacaron porque tapaban las habitaciones.

**Decisión 046 — Fase 3: cartas de Chispis**
Cuarta fase de `PLAN_MAESTRO.md`, pedida por el usuario. **40 Chispis originales** en 9 tipos (Luz, Agua, Radio, Flor, Ruedas, Feria, Bosque, Vía, Mar), con tres rarezas (común, brillante ✦, dorada ★ con brillo holográfico) y una frase graciosa cada uno. El dibujo es procedural (canvas, sin imágenes): cada tipo tiene su forma de cuerpo y cada Chispi varía tono, ojos y boca. **De dónde salen**: (1) **rescates en el Mundo Voltio**: 5 jaulas de Estática (Rueditas en el Skatepark; Chispazo, Gotita, Antenita y Brotecito en el Centro) que se rompen cerrando un círculo con la estela; (2) **sobres**: 8 escondidos por el mundo y uno al costado de cada lugar que revive (nunca encima de un fragmento ni de una puerta), con 3 cartas que se dan vuelta de a una, la más rara al final (mínimo una brillante), prefiriendo las que faltan; (3) **cambios con vecinos**: cada vecino (Miga, Bombo, Vera, Don Paso, Goteo, Rulo) tiene su Chispi y lo cambia por una carta repetida. El cambio se ofrece solo cuando el jugador elige hablar; el saludo automático no abre ventanas. **Álbum** desde el menú ☰ y tocando la vitrina encendida de la tienda de cartas: las 40 por tipo, la sombra de las que faltan, cuántas repetidas hay y la carta grande al tocarla. Contador 🃏 n/40 en el HUD. Sin plata ni tienda con precios (Decisión 006). La ayudita de compañero se muestra en la carta pero llega en la Fase 4.

**Decisión 047 — Fase 4: Chispi compañero**
Quinta fase de `PLAN_MAESTRO.md`, pedida por el usuario. Desde la carta de cualquier Chispi que se tenga (álbum, sobre, rescate o cambio) se lo elige de **compañero** («⭐ Elegir de compañero»); hay uno solo a la vez y se guarda. Aparece en 3D al lado del Nexus, armado con primitivas según su tipo (rayos, gota, antena, pétalos, ruedas, gorrito de feria, hojas, vagón, ola), flota detrás de su hombro **en los dos mundos**, salta cuando el Nexus salta y gira cuando baila. Su nombre se ve en el HUD (al tocarlo abre el álbum). **Ayudita por tipo**, todas funcionando: Luz agranda el imán de la mochila y vuela a señalar chispitas escondidas; Agua da un impulso al pisar charcos; Radio escucha sobres cercanos y vuela a mostrarlos; Flor hace que las cosas despiertas den más color; Ruedas da más velocidad en patineta; Feria suma 2 chispitas a cada carrera de luz ganada; Bosque hace saltar más alto; Vía hace caminar más rápido (hasta que haya tren); Mar da 50 % más voltaje en el Mundo Voltio. Ninguna es obligatoria para avanzar: son ventajas suaves para elegir según lo que se quiera hacer.

**Decisión 048 — Fase 5: el Centro completo y la fiesta del capítulo 1**
Sexta fase de `PLAN_MAESTRO.md`, pedida por el usuario. Las dos zonas que faltaban de la 2D pasan al 3D con su misma lógica y sus mismos textos (`src/data/chapter.ts`, ids `toy-*`, `lantern-*`, `party-*`), en el **barrio del canal sur**, al este del jardín (se llega por el puente). **Taller de Pipa** (galpón violeta con portón que mira a +Z; interior gris en x = 700): energía → **motor** (carrera de luz «cable de juguete»); del motor, cables cortos al **pato supervisor** y a la **campana**; los dos al **desfile**, que necesita las dos entradas (como la antena). Al terminar, el taller recupera el color. **Faroles de Lucio**: energía → farol del inicio (carrera «cable de faroles»); de ahí, camino **directo** (farol apurado → salida) o **curioso** (curioso → tímido → salida); el **farol tímido** cuenta su chiste la primera vez. **La fiesta**: salida → **escenario** (carrera «cable de fiesta») → **cañón de confeti**, solo con todos los preparativos (luz, agua, radio, jardín y desfile; si no, avisa qué falta). El confeti cierra el capítulo: todos los vecinos bailan, hay confeti y fuegos de chispas, y aparece la pantalla «¡Fiesta en el barrio!» con los resultados (lugares, cosas despiertas, cartas, Chispis). Después se sigue explorando; los vecinos dicen sus epílogos (`chapterSeen`) y la pantalla no se repite. Los cables entre piezas del taller y entre faroles son cortos e instantáneos (sin carrera), para no cortar el ritmo; las carreras quedan en el motor, el primer farol y el escenario. Ahora son **7 lugares** (★ n/7, museo con 8 vitrinas); el color vuelve a todo el pueblo con los siete. Suma **Pipa** y **Lucio** como vecinos (antiparras y delantal; gorra y vara de farolero), **4 cosas dormidas** (✦ n/24), **3 sobres** (taller y faroles) y cambia el origen de 3 cartas: Calesito (cambio con Pipa), Linternín (cambio con Lucio) y Globín (rescate en el Mundo Voltio, junto al canal sur).
