# Historial de avances — Los Nexus

Resumen cronológico de lo construido, en orden. Para el estado actual y la arquitectura, ver `CLAUDE.md`. Para el detalle técnico de cada cambio, ver los mensajes de commit en git (todos siguen este mismo orden).

## Fase 1 — Arranque del proyecto
Proyecto Phaser 3 + TypeScript + Vite. Escena inicial estática. Documentos base (`GAME_VISION.md`, `MVP_SCOPE.md`, `DECISIONS.md`, `README.md`).

## Fase 2 — Nexus provisional y movimiento
Personaje con formas simples, movimiento con WASD/flechas, límites de mundo, zona estática de plaza.

## Fase 3 — Mecánica de conexión
`ConnectionSystem`, `ConnectableObject`, primera fuente de energía y lámpara, cable visual, feedback de conexión correcta/incorrecta.

## Fase 4 — Puerta, fragmento, museo, progreso
`Door`, `Fragment` coleccionable, `MuseumScene` con una vitrina, `ProgressSystem` + `localStorage`.

## Fase 5 — Transformación visual y pulido del MVP
La ventana de la casa se enciende, el árbol saca hojas, la plaza cambia de color. Flujo completo del MVP 0.0 probado de punta a punta.

**→ MVP 0.0 completado.** A partir de acá, todo lo siguiente fue aprobado explícitamente por el usuario, fuera del alcance original.

## Personalización inicial
Pantalla `CustomizeScene` para elegir color de cuerpo/chaqueta/gorra/zapatos antes de jugar. Apariencia persistida en `localStorage`.

## Controles táctiles
`VirtualJoystick` para mover al Nexus por toque, sin reemplazar teclado/mouse.

## Segunda zona: la fuente de agua
Mundo ampliado a scroll horizontal con cámara siguiendo al Nexus. Segunda fuente de energía + `Fountain` (puzzle de un solo paso).

## Sonido
`AudioSystem` con tonos generados por Web Audio (sin archivos de audio) para conectar/error/recolectar.

## Ajuste de mensajes de estado
El texto superior refleja el progreso real por zona en vez de un mensaje genérico fijo.

## Tercera zona: la antena
`Beacon`, primer puzzle de **doble conexión** (necesita dos fuentes distintas). Estado parcial visible antes de completarse.

## Pulido visual de objetos (rondas de bugs reales)
Se hizo más visible cada objeto interactivo (antes algunos se confundían con el fondo o entre sí): lámpara con bulbo más grande, fuente de agua con borde definido, puerta con color de madera y hueco iluminado al abrir, fragmento recoloreado a rosa/magenta con contorno (antes se confundía con las fuentes de energía, ambas amarillas) y con animación de flotación.

Durante esta ronda se encontraron y arreglaron dos bugs reales:
- Texto de feedback de `ConnectionSystem` invisible en la zona 2 por falta de `setScrollFactor(0)`.
- Crash al flotar el fragmento por usar `StaticBody.updateFromGameObject()` sobre un `Container` (no implementa `getTopLeft`).

## Animación de celebrar + revisión de bugs
`Nexus.celebrate()`: salto, antena/ojos brillantes, chispas de colores al recoger un fragmento. Pasada de QA sobre las tres zonas existentes sin hallazgos nuevos.

## Celebración de colección completa
Flash de cámara + chispas en las tres (luego cuatro) zonas + mensaje especial la primera vez que se completa todo. Se guarda `seenCompletion` para no repetirla.

## Adaptación móvil — primer intento (descartado)
Se probó el juego en un iPhone emulado por primera vez: en vertical, el juego quedaba comprimido en una franja diminuta con barras negras enormes. Primer intento: aviso de "gira tu teléfono" que bloqueaba el juego en vertical.

## Adaptación móvil — solución real
El usuario pidió que el juego se adaptara de verdad en vez de pedir rotar. Se cambió la resolución interna del juego (960×540 ↔ 540×960) según orientación + tipo de puntero (`matchMedia('(orientation: portrait) and (pointer: coarse)')`), y se ajustó el reparto vertical de objetos en el mundo (`vScale`) para aprovechar mejor el alto disponible en vertical.

## Bug real en dispositivo real: botón "Jugar" inalcanzable
Probando en el celular real de Luca (no emulado), no se podía tocar "Jugar" en la personalización. Causa: `100vh` no coincide con el área visible real en navegadores móviles (barra de direcciones). Arreglado con `100dvh` + reposicionar el botón relativo al contenido de arriba en vez de pegado al borde inferior.

## Rediseño del personaje
El usuario compartió una referencia visual (character sheet) de cómo quería que se viera el Nexus: orejas de conejo con puntas de color, cabeza clara con cara negra y ojos ovalados amarillos, hoodie con capucha asomando, mochila con cable de energía colgando. Se rediseñó `Nexus.ts` completo siguiendo esa referencia, manteniendo solo formas de Phaser.

## Botón de interacción por proximidad
El usuario reportó que tocar los objetos pequeños es difícil. Se agregó `InteractButton`: botón fijo en pantalla que aparece al acercarse a un objeto conectable (radio 90px) y hace lo mismo que tocarlo directamente.

**Bug real encontrado:** el botón funcionaba una vez pero no en clics posteriores, por estar envuelto en un `Phaser.GameObjects.Container` con hijos interactivos. Se resolvió usando objetos de escena planos (mismo patrón que el botón "Jugar", que siempre funcionó bien).

## Cuarta zona: el puente
`Bridge`: un interruptor que revela un puente de madera sobre una grieta que **bloquea físicamente el paso** (barrera de Arcade Physics) hasta conectarlo. Primera zona con bloqueo real de movimiento. Usa la idea de "puente temporal" de la visión original, no explorada hasta entonces.

## Personalización profunda: gorra y mochila con forma
`capStyle` ('none'/'gorra'/'gorro') y `backpackStyle` ('core'/'square'/'round'), accesorios con forma real, no solo color. `gameState.ts` se ajustó para hacer merge seguro con `DEFAULT_APPEARANCE` al cargar, para no romper partidas guardadas antes de estos campos.

## Documentación de contexto
Se crean/actualizan `CLAUDE.md`, `CHANGELOG.md`, y se actualizan `DECISIONS.md`, `MVP_SCOPE.md`, `README.md` para que una sesión nueva de Claude tenga contexto completo del proyecto sin depender del historial de conversación.

## Pulido general: transiciones, parallax, cable curvo, HUD, sonido, mundo vivo
Ronda de pulido para "hacer el juego más profesional": fade in/out entre escenas, fondo con parallax en `WorldScene`, cable de conexión dibujado como curva bezier con chispa animada, indicador `★ n/4` en el HUD, pantalla de título con Jugar/Continuar, control de mute, movimiento del Nexus con aceleración/desaceleración, sombras de piso, viento en el árbol y mariposas, y micro-juice de movimiento (squash/stretch al girar y caminar).

## Mini-túnel del cable (idea de Luca)
`CableTunnelScene`: algunas conexiones (por ahora solo fuente→lámpara de la plaza) abren un mini-juego donde la chispa vuela sola por un tubo que serpentea, visto desde atrás con perspectiva tipo Mario Kart (anillos concéntricos). Hubo que corregir dos bugs reales encontrados jugando: el dibujo de los anillos tapaba los internos por el orden incorrecto, y la posición del jugador se calculaba relativa al centro del tubo en vez de ser independiente (por lo que quedarse quieto nunca fallaba pase lo que pasara la curva). Se agregó soporte de joystick táctil.

## El Nexus pasa a usar imágenes reales (Decisión 017)
El usuario decidió romper la regla de "solo formas de Phaser" para el personaje, para acercarlo a una hoja de referencia visual más detallada. Se generaron 4 poses (idle, dos de caminata, celebrar) con un generador de imágenes por IA usando prompts preparados en `ART_PROMPTS.md`, se recortaron/optimizaron (de ~8MB a ~700KB en total) y se integraron como sprites en `Nexus.ts`. Como consecuencia, se sacó la personalización (`CustomizeScene` se eliminó): el Nexus ahora tiene un único diseño fijo, ya no hay elección de color/gorra/mochila antes de jugar.

## Museo adaptado a celular
Botón «Volver al mundo» accesible por toque y clic, conservando ESPACIO como atajo. En vertical las cuatro vitrinas se distribuyen en una cuadrícula 2×2; en horizontal conservan una fila. Las entradas repetidas y los estados vacío, parcial y completo se verifican con Playwright en escritorio y móvil vertical.

## Continuar conexiones y posición
El guardado incluye las conexiones resueltas y la posición del Nexus, además de los fragmentos. Al continuar o volver del museo se restauran la lámpara, puerta, fuente, antena parcial/completa, puente y fragmentos pendientes. La posición vertical es relativa a la altura para soportar la rotación; se valida contra los límites del mundo y un puente cerrado. «Continuar» también aparece antes del primer fragmento y «Nueva partida» borra todos los campos. Las partidas antiguas conservan sus fragmentos. Las conexiones repetidas ya no cuentan dos veces para la antena. Se añaden cuatro pruebas de serialización, migración, datos inválidos y reinicio (`node --test tests/gameState.test.mjs`, Node 24).

## Pruebas automatizadas del recorrido e interacción
Se incorpora Playwright como dependencia de desarrollo y los comandos `npm test`, `npm run test:unit` y `npm run test:e2e`. Tres escenarios se ejecutan en escritorio y móvil vertical: las cuatro zonas (incluidos perder/ganar el túnel con controles reales, física del puente y museo completo), recuperación de conexiones/posición y rotación móvil, y partidas antiguas con cancelación/confirmación de «Nueva partida». El runner inicia un Vite propio, aísla el almacenamiento y conserva capturas y trazas de fallos. Preparación y límites en `tests/README.md`.

Las pruebas encontraron áreas interactivas desplazadas por el origen de los Container de Phaser: el centro del interruptor del puente no recibía el toque y otros centros quedaban en el límite de sus áreas. Se corrigieron las coordenadas de los hit areas de fuente de energía, lámpara, puerta, fuente de agua, antena y puente para coincidir con las zonas previstas.

El recorrido completo también detectó listeners del mundo que se acumulaban al volver del museo: abrir el puente intentaba destruir su collider varias veces. Se eliminan los listeners propios en shutdown y la retirada de la barrera es idempotente, incluyendo puentes restaurados desde partidas antiguas.

## Práctica y reintento directo del túnel
La conexión fuente→lámpara abre una fase de práctica con los mismos controles, sin avance ni derrota. «Empezar» inicia el recorrido desde el centro. Al perder se conserva el mundo pausado y aparecen «Reintentar» (reinicia ese túnel sin volver a seleccionar objetos) y «Volver al mundo». ESPACIO empieza/reintenta y ESC sale desde práctica o fallo. Solo ganar guarda la conexión; practicar, perder y salir no la desbloquean. Se reinicia el joystick al comenzar y tras un fallo, y se limpian los atajos al cerrar/reiniciar la escena. Velocidad, curvas y radio mantienen sus valores: el balance sigue pendiente de la prueba con Luca. Se amplían las pruebas E2E del recorrido y se agrega un escenario de práctica/cancelación/reintentos para escritorio y móvil.

## Pistas discretas y efectos suaves
Tras diez segundos sin interacción, un aro señala un origen pendiente de la zona visible o un destino válido si ya hay origen seleccionado. No aparece inmediatamente ni marca conexiones resueltas; se oculta al interactuar/completar y reinicia la espera al volver del túnel.

«Efectos suaves» en el título desactiva flashes y sacudidas de cámara en túnel y celebración del mundo, y mantiene las pistas estáticas. Por defecto respeta la preferencia del dispositivo; la elección explícita persiste aparte del progreso y sobrevive a «Nueva partida». No cambia dificultad ni recompensas. Se amplían las pruebas con preferencias y un escenario de pistas/efectos en escritorio y móvil; las llamadas de cámara se observan conservando su comportamiento real.

## Recuerdos únicos e interactivos del museo
Cada vitrina obtenida muestra un recuerdo propio: luz de la plaza, gota de la fuente, señal de la antena o puente de madera. Se dibujan con formas de Phaser, sin assets externos. Tocar o hacer clic en toda la vitrina muestra una frase de su zona y un pulso breve; los toques repetidos reinician el pulso sin acumular animaciones. Con «Efectos suaves» la respuesta es solo textual. Se mantienen los IDs de fragmentos, el guardado y la distribución vertical/horizontal. Se añaden pruebas de museo vacío, parcial y completo, interacción repetida y ambas opciones de efectos en escritorio y móvil, con capturas.

La comprobación de reintento del túnel compara el avance tras reiniciar con el punto de derrota, en lugar de un límite fijo de 200: el navegador sigue simulando mientras procesa entradas, y esa cifra producía fallos de tiempo aunque el reinicio funcionara.

## Quinta zona: el jardín
El mundo se amplía de 2950 a 3750 px, conservando las coordenadas de las cuatro zonas anteriores. Después del puente aparece un jardín seco: conectar energía al aspersor permite conectar el aspersor a las flores; el suelo se vuelve verde y se revela el quinto fragmento. El aspersor apagado no puede iniciar cables y un cable directo de energía a las flores es inválido. Ambos pasos admiten clic/toque y el botón de proximidad, se guardan y se restauran, con pistas para el siguiente paso pendiente.

La colección compartida por mundo y museo incluye una flor interactiva; el HUD y el estado cuentan cinco lugares. El museo vertical tiene tres filas y centra la quinta vitrina, conservando el botón de regreso. Los mensajes del mundo ajustan sus líneas al espacio entre los controles del HUD.

El guardado añade un `completionCount` opcional: una celebración de una partida antigua equivale a la colección original de cuatro recuerdos. Completar la colección de cinco permite celebrar otra vez, sin repetirla al recargar. No se borran fragmentos, conexiones ni posición. Se amplía el recorrido E2E a cinco zonas y se añade un escenario del jardín con partida antigua, movimiento real, pares inválidos, botón de proximidad, restauración intermedia y completa, y premio/celebración, en escritorio y móvil vertical. Las capturas incluyen jardín seco, regado y museo de cinco recuerdos.

## Diseño del primer capítulo
Se define «La ciudad al revés»: habitantes originales, preparativos relacionados, taller ramificado, dos rutas de faroles y final por conexiones. Se conserva el MVP histórico y se documenta el orden de las seis nuevas ramas anidadas. La duración de 20–30 minutos es un objetivo pendiente de una primera partida humana, no una medida del E2E acelerado.

## Habitantes y objetivos del capítulo
El título presenta «La ciudad al revés». Cinco habitantes con siluetas propias ofrecen encargos y reaccionan al reparar su lugar, con frases breves que no bloquean los controles. La primera visita se recuerda; se puede volver a tocar al personaje para releer. Una introducción de Miga aparece una sola vez. El objetivo sigue conexiones parciales y los fragmentos de partidas antiguas. Historia opcional validada en el guardado; nueva partida la elimina. Se prueban movimiento durante la introducción, diálogo antes/después de restaurar, cierre táctil y recuperación al recargar en escritorio/móvil.

## Consecuencias y humor del barrio
Tres parejas inválidas tienen respuestas propias: puerta cantante, devolución de luz y ensalada electrificada. Se guardan como descubrimientos únicos, sin conexiones ni fragmentos gratis. La puerta hace una pequeña inclinación si los efectos suaves están desactivados. Reparar la fuente hace brotar flores en la plaza; completar la antena publica CUAC FM en la casa. Miga comenta el riego compartido al volver, otra sorpresa opcional. Estos cambios se restauran sin repetir recompensas. El feedback del cable se ajusta en líneas y sube para no tapar el botón de proximidad. Se prueban bromas repetidas, ausencia de premio, efectos entre zonas y recuperación al recargar.

## Taller de Pipa y desfile ramificado
Sexta zona en un mundo de 4750 px. Un motor despierta al pato supervisor y a la campana; sus cables distintos reúnen el desfile. El orden de las ramas es libre y repetir una entrada no completa el desfile. Se restauran motor, ramas y reunión parcial; el fragmento solo aparece al completar ambas. Pipa explica el encargo y comenta el resultado. El museo añade un pato, y la colección pasa a seis. Se prueban la rama de la campana primero, duplicación, reload parcial, premio y museo de seis recuerdos; el recorrido general usa el orden inverso.

## Dos rutas de faroles y circuito de la fiesta
Séptima zona en un mundo de 6100 px. La luz puede viajar por tres cables directos o cuatro por los faroles curiosos; ambas rutas llegan a la misma salida y la curiosa guarda la broma del farol tímido. Los pasos y el escenario se restauran. La salida puede alimentar el escenario solo cuando plaza, fuente, antena, puente, jardín y desfile están resueltos; el siguiente cable activa el confeti. El álbum es independiente: no hace falta recoger todos sus premios para resolver el circuito final. Las pistas dejan de sugerir rutas alternativas al haber alcanzado la salida. El museo compacto presenta siete piezas y texto de 14 px en móvil, sin paginación ni botones extra. Se prueban ambas rutas, partida parcial, final bloqueado, desbloqueo por la antena y museo en ambos modos de efectos.

## Desenlace, exploración y validación del capítulo
El último cable abre un desenlace original con resultados, el Nexus celebrando y créditos de Luca. Permite volver al barrio o al museo, desde donde se puede releer el final. Se guarda `story.chapterSeen`: continuar recupera la fiesta sin repetir la celebración, y nueva partida borra historia y sorpresas junto con el progreso. Los siete habitantes tienen epílogos. El álbum cuenta las cinco sorpresas y las visitas; ninguna bloquea el final. Se unifican guardas de salida para evitar transiciones simultáneas al tocar varios destinos. Se añade una ruta E2E que camina todo el capítulo con controles reales, sin modificar posiciones ni saltarse puzzles, y un protocolo de primera partida con Luca. La duración humana de 20–30 min sigue siendo un objetivo por validar.

Validación: build y 13 pruebas unitarias aprobadas; 28 escenarios E2E aprobaron en la ejecución general y los dos recorridos caminados aprobaron al repetirlos con el piloto corregido. Ruta guiada completa: 95,5 s en escritorio y 111,1 s en móvil; soluciones conocidas, sin pausas de lectura, sin equivaler a una primera partida humana.

## Encargos con misterio y pistas graduadas
Los habitantes describen problemas en lugar de dictar todos los cables. El objetivo sigue los preparativos, entradas parciales y recompensas antiguas, conservando la explicación del primer cable. «Pista» ofrece tres niveles a petición: observación, orientación y solución; no pausa el movimiento, repite el último nivel y vuelve al primero al cambiar la tarea. Las pistas automáticas siguen disponibles. Se prueba graduación, movimiento, cambio de tarea, recarga y textos en escritorio y móvil; se repite el recorrido completo y la visita a habitantes.

## CUAC FM: una señal, dos decisiones
Una central entre la fuente y la antena ofrece música al jardín o noticias a la plaza. La antena completa habilita ambas; un solo receptor permanece encendido. Conectar el otro cambia la elección y se puede volver al anterior. El sistema añade grupos exclusivos y callbacks de activación para restaurar y cambiar la elección sin afectar circuitos permanentes. El guardado sustituye únicamente los cables de la fuente de radio. No entrega recuerdos ni bloquea el final. Se verifican cambios repetidos, duplicados, restauración del último destino válido y conservación de preparativos, además del taller y las rutas de faroles.

## Consecuencias y encargos de regreso
La emisión musical hace aparecer notas en el jardín restaurado y Goteo descubre una banda de flores que necesita escenario. Las noticias cambian el anuncio de la casa y Miga pide publicar una prohibición de prohibir tostadas. Dos cables opcionales (aspersor→escenario de flores y lámpara→cartel) cierran los encargos con respuestas propias y dos sorpresas nuevas; la colección y los requisitos del final permanecen iguales. Las pistas a petición priorizan el encargo local disponible. Cambiar de radio conserva los proyectos terminados; su restauración requiere el lugar reparado, sin exigir la emisión original. Se mueve el estado de la central de radio fuera del carril habitual del personaje para que pueda leerse mejor. Se prueban ida/vuelta con movimiento, requisitos, textos, guardado, cambio de canal y nueva partida en ambos dispositivos.

Validación final del bloque: build de producción y `npm test` aprobados; 14 pruebas unitarias y 36 escenarios E2E, sin omisiones. Capturas revisadas en escritorio y móvil. La duración de primera partida y la comprensión con Luca siguen pendientes de prueba humana.

## Identidad gráfica del barrio
Las siete zonas pasan de bloques planos a un barrio ilustrado: tejados, ventanas, adoquines, macetas, invernadero, taller con toldo y banderines de fiesta. El cielo vuelve a verse, con gradación de color, sol y dos capas de colinas. La grieta tiene orillas y corriente visible; el puente conserva su bloqueo y despliegue con un tablero de madera. Fuentes, lámpara, puerta, fuente de agua, antena, aspersor, flores, radio, juguetes y faroles reciben detalles de material y luz. Cada habitante tiene accesorios de su oficio. La portada presenta al Nexus; museo y final comparten marcos de cobre, y diálogo/interacción usan paneles redondeados.

El arte de cada zona se convierte en una textura reutilizable para evitar miles de formas vivas en cada fotograma. La nueva prueba visual recorre las siete zonas en ambos formatos, captura portada y museo, conecta objetos con input real y comprueba que volver del museo reutiliza las texturas y permite seguir conectando. Se conservan coordenadas, recompensas y partidas. Las capturas documentan la composición; no son comparaciones automáticas de píxeles.

La primera validación detectó un fallo del piloto de reintentos del túnel en móvil: los viajes de protocolo espaciaban demasiado la corrección y el piloto perdía. Se comparte el conductor de entradas DOM por fotograma que ya usaba el recorrido completo; una derrota ahora falla explícitamente en vez de esperar a que vuelva el mundo. No cambia la física ni la dificultad. El barrio pausado se oculta mientras lo cubre el túnel opaco y vuelve a mostrarse al ganar, cancelar o regresar tras perder, evitando renderizar dos escenarios.

Validación final: build de producción y `npm test` aprobados. 14 pruebas unitarias y 38 escenarios E2E, sin omisiones, en escritorio y móvil vertical. Capturas revisadas de portada, siete zonas, museo y final. El build servido también cargó portada y mundo sin errores JavaScript en ambos formatos.

## Armario del Nexus
«Mi Nexus» permite cambiar nombre, cuatro colores iniciales de chaqueta/mochila, tres accesorios y cuatro colores del cable (48 combinaciones de estilo). Se abre desde portada y mundo, permite guardar o cancelar y conserva la posición al regresar. Portada, caminata, celebración y final usan la misma apariencia. La cara y las orejas conservan su diseño. Los estilos se guardan aparte de la aventura; «Nueva partida» no borra el aspecto ni las recompensas cosméticas. Se reservan chaqueta ámbar, insignia de pato y corona para tres historias secundarias. Build, 16 pruebas unitarias y cuatro escenarios de armario/diálogos en ambos formatos aprobados; la suite completa se ejecuta al cerrar el bloque de contenido.

## Historias secundarias y estilos ganados
El diario abre tres espacios cuando se restaura su lugar: el correo de Miga, la inspección del pato de Pipa y el concierto de flores. Añaden 16 conexiones por una pasada, dos desenlaces cada uno y chaqueta ámbar/insignia de pato/corona como recompensas; el armario pasa de 48 a 100 combinaciones. Las propuestas son decisiones de un encargo; «Repetir» permite probar la otra y conserva todos los desenlaces vistos y el estilo ganado. Las dos entradas de un objetivo son señales distintas: una prueba repetida no cuenta dos veces. Elegir una propuesta conserva las demás ramas de ese origen en el guardado. Se restaura el avance parcial sin perder los cables principales; repetir elimina solo las conexiones del encargo elegido. El final añade el total de encargos y desenlaces, y Miga/Pipa/Goteo comentan sus historias terminadas.

Se separa el título «Chaqueta» del botón de nombre en móvil vertical; una comprobación de sus límites evita solapamientos.

Validación del bloque: build aprobado; `npm test` aprobó 18 pruebas unitarias y 42 escenarios E2E en escritorio y móvil vertical. Tras ajustar únicamente el espaciado del armario, aprobaron otra vez el build y los cuatro escenarios de apariencia/historias, incluida la selección y persistencia de estilos desbloqueados. Capturas de armario y encargos revisadas en ambos formatos. La duración humana de primera partida sigue pendiente de la prueba con Luca.


## Acabado de arte e interfaces
Revisión visual de las ocho escenas sin ampliar funciones: portada con personaje protagonista e ilustración circular, fondos con luz/grano y marcos comunes, tipografía unificada, botones con relieve, armario con muestras de color/contorno de selección y nombres largos que caben en una línea, diario con emblemas y tarjetas, museo/final con luz cálida sobre tinta, diálogos y controles con el mismo material. El borde inferior deja espacio para los textos de pie. Arquitectura con juntas y contraventanas, bordes de adoquines, vegetación y sombras suaves de contacto. Fuentes de energía, lámparas y fuente reciben acabado metálico; las máquinas de encargos añaden remaches, asas y bases. El túnel mantiene recorrido/velocidad/colisiones y avisos, con remaches y contornos en anillos e interfaz común. Fondos horneados por tamaño y zonas estáticas reutilizadas; sin fuentes remotas, cambios del guardado ni nuevas animaciones obligatorias. Ver `ART_DIRECTION.md`.

Validación: build de producción y suite completa aprobados: 18 pruebas unitarias y 42 escenarios E2E en escritorio y móvil vertical. Tras retirar una línea ornamental que interfería con el objetivo de los encargos, aprobaron otra vez el build y los dos escenarios de historias. Capturas revisadas de portada, armario, diario, encargos, siete distritos, museo, final y túnel.
El build servido también cargó portada, armario y mundo, permitió editar/guardar un nombre ancho de 16 caracteres y no produjo errores JavaScript ni HTTP en ambos formatos.


## Muestra moderna de portada, plaza y HUD
Dirección contemporánea aprobada con toques visuales de Fortnite: portada azul/violeta con iluminación cian, título y acciones de tipografía gruesa inclinada, acción principal amarilla y botones secundarios azules. Se retira papel, ornamentos y biseles en la muestra. Plaza con fachadas laterales, techos por planos, vidrio luminoso, árbol facetado, losas grandes y luces de camino; fuente de energía, lámpara y puerta con materiales tecnológicos. HUD, diálogo, joystick y proximidad comparten paneles planos y colores nuevos. Contraste oscuro sobre amarillo en las acciones principales. Se conservan funciones, áreas interactivas, posiciones y guardado. Portada y plaza siguen usando texturas horneadas y caché. Los demás distritos y pantallas mantienen su arte anterior; ver `MODERN_VISUAL_PILOT.md`.

Validación: build aprobado y suite completa sin fallos ni omisiones: 18 pruebas unitarias y 42 escenarios E2E en escritorio y móvil vertical. Capturas revisadas de la nueva portada, plaza y controles en ambas orientaciones; siguen funcionando diálogo, conexiones, túnel, armario y restauración del progreso.
El build servido cargó portada, armario y mundo en ambos formatos, con edición/guardado de nombre y sin errores JavaScript ni HTTP.
