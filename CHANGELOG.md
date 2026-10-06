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
