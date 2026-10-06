# Dirección de arte — La ciudad al revés

## Alcance
El usuario pide un acabado visual de publicación, sin añadir funcionalidades.
Esta rama cambia composición, materiales, tipografía, luz y dibujo; mantiene
reglas, contenidos, coordenadas de puzzles, áreas táctiles, guardado y controles.
Se apila sobre `codex/historias-del-barrio`; el usuario hace PR y merge.

## Lenguaje visual
Una aventura ilustrada con personalidad editorial: tinta azul petróleo, papel
cálido, metal de cobre, vegetación y energía turquesa. Las superficies reciben
una luz suave y líneas de contorno, con el detalle concentrado en marcos y bordes.
Los objetos conectables conservan su silueta clara y el cambio de estado.

- Portada: personaje protagonista en una ilustración circular del barrio y
  columna de acciones legible; composición propia para vertical.
- Interfaces: fondos con grano sutil y luz, marcos interiores, reglas ornamentales
  y botones con relieve. Misma familia tipográfica para textos y una serif para
  títulos. Botones planos de escena, sin hijos interactivos de contenedores.
- Armario: foco sobre el personaje, categorías alineadas y nombre sin invadir
  el botón de edición. Estilo seleccionado y bloqueado usan el estado existente.
- Diario: tarjetas con emblemas ilustrados en horizontal y acentos en vertical.
- Museo y final: materiales oscuros, cobre y luz cálida, compatibles con el resto.
- Barrio: cielo atmosférico, juntas y contraventanas en edificios, bordes de
  adoquines, vegetación y sombras de contacto. La decoración nunca recibe input.
- Túnel: interfaz del mismo sistema y anillos metálicos con remaches; conserva
  exactamente la geometría, velocidad y avisos de peligro del recorrido.

## Coste de renderizado
Los fondos se hornean por tamaño y las siete zonas conservan su caché. Las
texturas reutilizables de botones contienen luz y contorno; el tintado conserva
los estados actuales. No se añaden descargas, fuentes remotas, efectos de cámara
ni nuevas animaciones ambientales. La identidad y las poses del Nexus siguen
usando los sprites existentes.

## Revisión
Revisar portada, armario, diario vacío/completo, encargos, siete distritos, museo,
final y túnel en 960×540 y 540×960. Comprobar los textos largos, la legibilidad de
los estados y el uso de botones repetido. La revisión visual acompaña al build y
las pruebas de interacción; las capturas se conservan fuera del repositorio.

Validación realizada: build, 18 pruebas unitarias y 42 escenarios E2E aprobados.
Dos escenarios de historias repetidos tras la corrección final de la regla
ornamental. Build servido probado en ambas orientaciones con portada, edición
y guardado de nombre largo y entrada al mundo, sin errores JavaScript/HTTP.
Capturas conservadas en `/workspace/nexus-art-finish-evidence/`.

## Revisión posterior de la dirección
El usuario pidió después un aspecto contemporáneo con toques de Fortnite.
`MODERN_VISUAL_PILOT.md` registra la nueva muestra de portada, plaza y HUD.
La extensión completa, documentada en `MODERN_ART_DIRECTION.md`, sustituye
el lenguaje editorial de este documento en los siete distritos y todas las
interfaces. Este archivo se conserva como referencia histórica.
