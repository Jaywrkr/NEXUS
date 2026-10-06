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


**Decisión histórica H018 (señuelo)**
Un "señuelo" (objeto que parece conectable pero no sirve) no necesita lógica especial: es un objeto registrado en `ConnectionSystem` sin ninguna regla, así que cae en el manejo genérico de conexión inválida. Debe verse sutilmente distinto de los reales (la fuente señuelo es gris y sin brillo animado) para que el puzzle sea de observar, no de adivinar. Primer uso: zona de la antena.

**Decisión histórica H019 (fragmento secreto)**
Puede haber fragmentos extra que premian explorar (el primero: el fragmento secreto detrás de la casa) sin depender de una conexión. No cuentan para el contador `★ n/4` ni para "¡Colección completa!" — eso sigue atado solo a los fragmentos de zona (`ALL_FRAGMENT_IDS`) — pero sí tienen vitrina propia en el Museo.
