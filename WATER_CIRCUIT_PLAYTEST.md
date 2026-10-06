# Paseo del Agua: circuito y movimiento

La rama `codex/water-circuit-polish` parte de la rama predeterminada
`claude/los-nexus-game-mvp-cppkef`, commit `e97282f` (plaza ya integrada).
PR y merge quedan a cargo del usuario.

## Resultado

El generador alimenta una bomba; la bomba convierte energía en caudal de agua.
Dos válvulas alternativas llevan a la misma fuente: directa de 3 bar y regulada
de 2 bar. La elección cambia el ritmo y altura de las gotas. Cambiar de válvula
cierra la ruta anterior y deja la fuente seca hasta conectar la nueva salida.
Las áreas de toque del generador y la fuente cubren sus ilustraciones, incluidos
los sockets laterales y el surtidor alto; antes había zonas visibles sin respuesta.
Los conductos persisten, con energía dorada y agua azul; conectores de entrada
y salida, nombres y presión permiten seguir el recorrido. No se agregan botones,
combate ni inventario: se conserva la acción de conectar.

Las partidas antiguas restauran el circuito completo sin sonidos ni recompensas
repetidas. Su conexión histórica no se reescribe al cargar. Al cambiar la ruta se
guarda la cadena nueva completa, conservando los recuerdos. Las partidas modernas
parciales permanecen parciales, incluso si el recuerdo ya estaba recogido.

La bomba, las válvulas, el generador y la fuente tienen huellas físicas. La zona
transitable sigue el pavimento, y la profundidad se calcula por los pies.
La estación de radio ocupa la franja inferior junto a CUAC FM, separada de la
fuente y sus conductos. Nexus usa pasos de perfil, de espalda y de frente;
se detiene con ambos pies apoyados, mira hacia el objeto al interactuar y el ritmo
de los pasos depende de la distancia recorrida, evitando caminar contra un obstáculo.

## Recursos y respuesta

Las poses se registran por casco y base al cargar. La paleta elegida se prepara
antes de jugar, evitando recolorear al primer paso. Se retiran las variantes de
ropa anteriores al cambiar de apariencia: quedan como máximo diez poses coloreadas. Los sprites de las máquinas
solo cambian al activarse; los conductos solo se redibujan cuando cambia la ruta
o la presión. Las gotas anteriores se detienen al cambiar de presión.

Cada escena cierra su contexto de audio al salir; los osciladores y ganancias
se desconectan al terminar. La falta de AudioContext no interrumpe una conexión.
El joystick libera el gesto al pausar o perder el foco y retira listeners al salir.

`water-circuit.spec.js` registra once conexiones/cambios mediante input real,
el tiempo entre pointerdown y connection-made, tareas largas de Chromium y
contextos creados/cerrados. Estos datos describen el navegador cloud con render
por software; no demuestran FPS ni ausencia de bloqueos en el teléfono del usuario.

## Revisión manual recomendada

En `NEXUS-actualizado`, probar ambas rutas, cambiarlas antes y después de recoger
el recuerdo, recargar y regresar del museo. Caminar contra la bomba y rodearla,
mirar los pies y las poses al cambiar de dirección. En móvil, sostener el joystick,
abrir una escena y volver: el personaje debe quedar quieto. Comparar si los pasos,
las etiquetas y la respuesta a conectar resultan claros para Luca.

## Validación de esta entrega

- `npm run build`: correcto con el código final.
- `npm run test:unit`: 23 pruebas correctas.
- Suite completa: 60 escenarios ejecutados, 51 correctos inicialmente y nueve
  fallos investigados (cuatro expectativas del texto anterior, dos del atlas,
  un recorrido que atravesaba la válvula y dos pulsaciones sobre el joystick).
- Tras corregir: selección de 14 escenarios, 13 correctos y un fallo de fixture
  por pulsar antes de actualizar la matriz de cámara. La espera por `postrender`
  corrige ese caso sin modificar controles o aserciones del juego.
- Última selección: seis escenarios correctos, escritorio y móvil, de radio,
  regreso y circuito con pulsaciones en el socket lateral/surtidor alto. Verifica
  además las áreas interactivas ampliadas. Todos los escenarios que fallaron
  pasaron después de sus correcciones; no hubo omisiones ni retries automáticos.
- Recorrido completo con controles reales: 126,4 s en escritorio y 135,7 s en
  vertical, 20 conexiones y siete recuerdos. Duración guiada, no una primera
  partida humana.
- Once conexiones/cambios medidos por formato: 2,3–9,5 ms en escritorio y
  2,3–8,2 ms en vertical para procesar el input. La prueba exige menos de 250 ms
  y cero voces activas tras terminar. Se crearon dos contextos de audio y se
  cerró el del mundo al entrar al museo; permanece el de Phaser.
- La caché de ropa conserva diez poses de la apariencia elegida al cambiar de
  paleta, sin retener las anteriores; comprobado en ambos formatos.

Chromium renderiza por software en esta máquina. Se observaron tareas largas
(70 en escritorio y 50 en vertical durante la medición); estos resultados no
validan 60 FPS ni sustituyen una prueba en teléfono real.
Capturas y métricas están adjuntas al informe Playwright local, en
`test-results/` y `playwright-report/` (salidas ignoradas por Git).
