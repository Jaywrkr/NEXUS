# Ideas para seguir mejorando — Los Nexus

Backlog vivo de mejoras futuras. No es una lista para "terminar" — este proyecto
sigue creciendo indefinidamente. Cuando se implementa una idea, se borra de acá
y queda su historia en `CHANGELOG.md` (qué se hizo) y `DECISIONS.md` (si fue una
decisión de diseño relevante).

Cómo se usa: agregar una línea cuando surge una idea (jugando con Luca, viendo
qué se siente flojo, etc.), sin necesidad de implementarla ya. Antes de picking
la siguiente a hacer, revisar que siga reutilizando la acción de conectar
(Decisión 008) si es una mecánica nueva.

## Pulido visual pendiente
- Pantalla de créditos simple (nombres, "hecho con Luca", fecha).
- Micro-juice de movimiento: easing en vez de movimiento lineal, squash/stretch
  sutil al saltar/celebrar.
- Más variedad de partículas al conectar (ahora es una sola chispa por el cable).

## Producto / UX
- Pantalla de opciones más completa (volumen si se agregan más tipos de sonido,
  no solo mute/unmute).
- Mensaje más suave si el jugador gira el teléfono a mitad de partida, en vez de
  recargar la página de golpe.

## Distribución (cuando se decida encarar)
- Deploy a una URL propia para que Luca lo abra desde el celular sin depender
  de que la compu esté prendida y corriendo `npm run dev`.
- Ícono / PWA instalable.
- Dominio propio.

## Ideas de contenido (mecánica, siempre reutilizando "conectar")
- (vacío por ahora — agregar acá si surge una quinta zona, variante de puzzle, etc.)

## Mini-túnel del cable (idea de Luca, prototipo en fuente→lámpara de la plaza)
- Probarlo con Luca de verdad antes de decidir si se aplica a más conexiones —
  por ahora solo está en esa una, a propósito (Decisión 016).
- Si se siente bien: aplicarlo a más conexiones, quizás con dificultad creciente
  (túnel más angosto o más ondulado en zonas más avanzadas).
- Posible variante: que el ancho del túnel varíe (no solo constante), para más
  variedad de dificultad entre conexiones.
