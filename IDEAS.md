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
Backlog acordado con el usuario (2026-08-06) para ir probando de a una, ordenado
de menor a mayor esfuerzo/riesgo de romper zonas existentes:
- Conexión con señuelo: un objeto extra en una zona que no debe conectarse (o
  rompe la conexión si se usa), para que haya que observar antes de tocar.
- Fragmento secreto oculto, además de los 4 de zona, premiando la exploración.
- Criatura que se despierta al conectar algo y sigue un rato al Nexus,
  reaccionando cerca de conexiones pendientes (sin diálogo, sin ser NPC complejo).
- Objeto en movimiento (péndulo, luz que gira) que solo se puede conectar
  cuando está en la posición correcta — variante de timing.
- Energía compartida: una fuente que solo alimenta un objeto a la vez, hay que
  decidir el orden de conexión. Toca las reglas del `ConnectionSystem`, más
  riesgo de afectar zonas existentes — dejar para cuando el resto esté probado.
- Cable largo entre zonas: conectar algo en una zona con algo en otra ya
  visitada. La más compleja (cable cruzando cámara/scroll, estado entre zonas
  lejanas) — dejar para el final.

## Mini-túnel del cable (idea de Luca, prototipo en fuente→lámpara de la plaza)
- Probarlo con Luca de verdad antes de decidir si se aplica a más conexiones —
  por ahora solo está en esa una, a propósito (Decisión 016).
- Ajustar la dificultad real jugándolo (amplitud/frecuencia de la curva vs.
  velocidad del barco) — se corrigió un bug donde quedarse quieto nunca
  fallaba (la posición dependía del propio centro del tubo en vez de ser
  independiente), pero el balance fino de qué tan difícil se siente hay que
  afinarlo jugando de verdad, no solo con la cuenta matemática.
- Si se siente bien: aplicarlo a más conexiones, quizás con dificultad creciente
  (túnel más angosto o más ondulado en zonas más avanzadas).
- Posible variante: que el ancho del túnel varíe (no solo constante), para más
  variedad de dificultad entre conexiones.
