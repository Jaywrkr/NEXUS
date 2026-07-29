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
