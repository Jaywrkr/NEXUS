# Capítulo 1 — La ciudad al revés

Bloque de seis fases aprobado por el usuario el 6 de octubre de 2026. Amplía el
prototipo con una aventura original y humor absurdo; conserva conectar como
única acción de puzzle. Los documentos del MVP permanecen como historia.

## Premisa y primer minuto

Miga, una pequeña encargada de mantenimiento, descubre que el ayuntamiento usó
un manual redactado por un pato. La ciudad acepta sus averías como costumbres:
una fuente ensaya conciertos en seco, un puente pide buena iluminación y un
aspersor se proclama alcalde. Hay que preparar una fiesta que funcione de verdad.
La primera tarea sigue siendo conectar la fuente de energía con la lámpara.
La introducción es breve y no bloquea el movimiento; no hay menús de diálogo.

## Habitantes y preparativos

| Lugar | Habitante | Encargo y personalidad |
| --- | --- | --- |
| Plaza | Miga | Conseguir luz y abrir el barrio; arregla cosas con paciencia y comentarios secos. |
| Fuente | Bombo | Recuperar el agua; cree que su goteo es una gran orquesta. |
| Antena | Vera | Juntar las dos señales para anunciar la fiesta; toma demasiado en serio los partes de radio. |
| Puente | Don Paso | Abrir el acceso; está convencido de que es una celebridad. |
| Jardín | Alcalde Goteo | Regar las flores; confunde tener un aspersor con gobernar. |
| Taller | Pipa | Poner en marcha un pato y una campana y reunirlos en un desfile. |
| Faroles | Lucio | Llevar luz a la fiesta por un recorrido directo o uno más curioso. |

## Progresión y variedad

Las primeras cinco zonas siguen accesibles como antes: fuente y antena pueden
resolverse en distinto orden, y el puente conserva su barrera física. El taller
ramifica y reúne dos resultados: energía → motor; motor → pato y campana;
pato y campana → desfile. Cada rama puede resolverse primero, y repetir un
cable nunca sustituye la otra.

Los faroles tienen dos rutas hacia una misma salida. La ruta más larga descubre
una sorpresa opcional; no es una espera ni una penalidad. El final necesita los
preparativos del barrio, el desfile y la luz del camino. Conectar luz → escenario
y escenario → confeti cierra el capítulo. Completar el álbum es un objetivo
separado: siete recuerdos de los lugares, sin obligar a recogerlos para terminar.

Tres conexiones equivocadas concretas tienen respuestas originales y se
registran como descubrimientos, sin regalar progreso de los puzzles. Volver a
lugares reparados permite escuchar respuestas nuevas y observar consecuencias
de otros lugares. Una visita opcional a Miga después de reparar la fuente revela
otra broma. No se añaden combate, inventario, dinero ni castigos.

## Presentación y guardado

Personajes y objetos nuevos se dibujan con formas de Phaser. Las frases son
cortas, se pueden cerrar tocándolas y no paran el juego. Los objetivos indican
el siguiente paso y sus requisitos. Efectos suaves evita movimiento innecesario.
Se conservan los IDs, conexiones y posiciones existentes; historia, secretos y
desenlace son campos opcionales del mismo guardado. Nueva partida los borra.
El museo debe acomodar siete recuerdos sin superposición ni perder el regreso.

## Duración y comprobación

Objetivo de diseño: 20–30 minutos para una primera partida con exploración.
**No es una duración demostrada ni una promesa.** No se usarán temporizadores,
repeticiones ni desplazamientos vacíos para fabricar ese tiempo.

Referencia del prototipo: cinco lugares, ocho conexiones principales y un
túnel; caminar desde x=480 hasta x=3500 a 220 px/s toma unos 14 segundos sin
desvíos. El E2E del prototipo usa posiciones abreviadas y conoce las soluciones:
su duración sirve para detectar regresiones, no para medir una primera partida.
El 6 de octubre de 2026 pasó en Chromium/escritorio en **45,2 s** (47,6 s
con arranque del runner); incluye derrota/reintento del túnel y viajes al museo.
Al cerrar este bloque habrá una ruta guiada con movimiento real y un protocolo
de prueba con Luca; se informará su límite sin equipararla a una sesión humana.

En cada fase: build, interacciones relevantes en escritorio y móvil, capturas,
documentación, commit y push. Al terminar: suite completa, recuperación del
capítulo/secretos, elección de rutas, final y nueva partida. Los PR y merges
siguen a cargo del usuario; no se abren ni fusionan automáticamente.
