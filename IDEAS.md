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

## Realismo (pedido explícito del usuario, 3 frentes — ir de a uno)
- **Mundo más vivo**: detalles ambientales con movimiento propio — pájaros o
  mariposas cruzando, viento sutil en las hojas del árbol — para que no se
  sienta estático incluso sin que el jugador haga nada.
