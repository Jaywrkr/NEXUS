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
