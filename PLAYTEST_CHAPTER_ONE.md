# Validación del capítulo 1

## Qué se puede afirmar

La aventura contiene siete lugares, siete habitantes, dos rutas de faroles,
dieciocho conexiones principales por la ruta directa (diecinueve por la curiosa),
siete recuerdos y siete sorpresas opcionales (cinco originales y dos encargos nuevos). El taller admite ambos órdenes de
sus ramas. El desenlace requiere resolver los preparativos; completar el álbum
es independiente. Se puede volver al barrio después del final.

## Referencias de duración

Estas mediciones corresponden a `5da8899`, antes del bloque de decisiones.

| Recorrido | Medida | Interpretación |
| --- | --- | --- |
| Prototipo de cinco zonas, E2E de escritorio | 45,2 s | Usa posiciones abreviadas y soluciones conocidas; incluye fallo/reintento del túnel. |
| Capítulo completo, escritorio con movimiento real | 95,5 s | Ruta directa, todas las recompensas, soluciones conocidas, sin pausas de lectura. |
| Capítulo completo, joystick móvil con movimiento real | 111,1 s | Mismas condiciones, con controles táctiles reales. |
| Primera partida humana | Pendiente de Luca | Objetivo de diseño 20–30 min, todavía sin confirmar. |

La prueba nueva `chapter-walking.spec.js` nunca cambia posiciones, velocidades,
conexiones ni estado de las escenas. Observa posición y velocidad para orientar teclas o
joystick; emite sus eventos DOM al ritmo de los fotogramas para evitar que
la latencia del protocolo sobrepase un destino. Toca objetos y juega el túnel. Las medidas se adjuntan al informe como
`guided-duration`. Es un recorrido guiado por alguien que ya conoce todas las
soluciones: no predice el tiempo de aprender, leer, equivocarse o explorar.
Las referencias del prototipo y del capítulo usan métodos diferentes y no son
una comparación directa de cuánto creció la duración.

## Primera partida con Luca

1. Empezar de cero en el teléfono habitual, sin explicar soluciones. Registrar
   desde «Jugar» hasta el desenlace; anotar aparte interrupciones externas.
2. Observar si entiende el primer cable, la práctica del túnel y el objetivo
   después de volver del museo. Anotar dónde necesita ayuda y cuántos reintentos
   hace, sin añadir esperas ni dificultades solo para aumentar los minutos.
3. Preguntar al final qué personaje recuerda, qué reacción le hizo gracia y qué
   quería hacer cuando dejó de seguir la tarea principal.
4. Comprobar si descubre el orden alternativo del taller y el desvío de faroles;
   dejar que elija. No es obligatorio encontrar las siete sorpresas.
5. Probar continuar a mitad del taller o camino, girar el móvil y volver después
   del final. Confirmar comodidad de texto, precisión táctil y efectos suaves.

Si la primera partida resulta corta, el siguiente paso es añadir decisiones y
situaciones interesantes donde Luca mostró curiosidad. Si se atasca, aclarar
ese punto antes de ampliar. El tiempo por sí solo no es un criterio de calidad.

## Alcance de las pruebas automáticas del cierre original (`5da8899`)

Validación del 6 de octubre de 2026: build aprobado y 13 pruebas unitarias aprobadas.
La ejecución general aprobó 28 escenarios; los dos recorridos caminados se
repitieron y aprobaron tras corregir el piloto del test (latencia y espera de cámara).
No se modificó el juego para conseguirlo.

13 pruebas unitarias: guardado, migración, reinicio, opciones, objetivos y
entradas distintas. 30 escenarios E2E: escritorio y móvil, recorrido original
ampliado, estados parciales, habitantes, consecuencias, taller, ambas rutas,
final, álbum, efectos y la ruta completa caminada. Build de producción aparte.
Las capturas y trazas quedan en el informe de Playwright, sin versionar imágenes
ni añadir accesos de prueba al juego distribuido. Chromium simulado no sustituye
la prueba de comodidad ni la primera partida de Luca.

## Ampliación de decisiones y regresos
El bloque posterior añade pistas a petición, una elección reversible de radio y
dos proyectos opcionales en la plaza y el jardín. Hay siete sorpresas posibles;
la ruta principal conserva sus dieciocho cables y siete recuerdos. Registrar
aparte si Luca prueba ambas emisiones, vuelve a los habitantes y resuelve los
encargos sin que se le indique el cable. Los tiempos anteriores son referencias
de sus versiones y condiciones originales, no mediciones de toda la ampliación.

Validación del bloque ampliado: build y `npm test` aprobados, con 14 pruebas
unitarias y 36 escenarios E2E, sin casos omitidos. La ruta principal guiada
midió 95,4 s en escritorio y 108,2 s en móvil; no incluye lecturas ni los encargos
opcionales. Estos se verificaron en escenarios separados con partidas preparadas,
por lo que no existe todavía una medición completa de primera partida humana.
