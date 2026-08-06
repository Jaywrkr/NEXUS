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

## Más variedad de partículas al conectar
`ConnectionSystem.spawnConnectBurst` ahora mezcla círculos y estrellas de distinto tamaño y color (cian del cable, blanco, cian claro) en vez de una sola chispa uniforme, y se agregó `spawnGlowRing`: un anillo que se expande y desvanece en el punto de conexión como remate adicional. Primer paso de la lista de "ideas de jugabilidad" que se acordó con el usuario ir implementando de a una.

## Fuente señuelo en la antena
`EnergySource` ahora acepta un `variant` ('active' | 'dim'); la variante 'dim' no tiene brillo animado ni rotación. Se agregó una tercera fuente (`beacon-source-fake`, variante 'dim') en la zona de la antena, entre las dos fuentes reales y la antena, sin ninguna regla de conexión asociada — cualquier intento de conectarla da el mensaje genérico de "no encaja". No requirió tocar `ConnectionSystem`: el comportamiento de señuelo sale gratis del manejo existente de conexiones inválidas, solo hacía falta un objeto de más para que el jugador tuviera que observar antes de conectar.

## Fragmento secreto
Quinto fragmento (`secret-fragment`) escondido detrás de la casa apagada, al oeste del punto de partida — visible desde el arranque (no depende de ninguna conexión), premia a quien explore para atrás en vez de ir directo a la derecha. No cuenta para el contador `★ n/4` del HUD ni para "¡Colección completa!" (esos siguen atados solo a los 4 fragmentos de zona), pero sí tiene su propia vitrina en el Museo. `MuseumScene` ahora separa `FRAGMENTS` (los 4 que definen la colección completa) de `SECRET_FRAGMENT` (se muestra igual, no afecta ese chequeo).
