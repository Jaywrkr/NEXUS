# Muestra moderna — Nexus

El usuario pide modernizar el juego con toques visuales de Fortnite. Esta fase
materializa la muestra propuesta: portada, plaza y HUD, conservando funciones,
coordenadas de puzzles, áreas táctiles, guardado e identidad del Nexus.

## Dirección
- Azul profundo y violeta como base; energía cian y amarillo para la acción
  principal. Tipografía gruesa, inclinada en portada y acciones.
- Botones planos, paneles de tinta y contraste alto; se retiran papel, cobre
  ornamental, biseles y serif de la muestra.
- Edificios originales con caras laterales, techos por planos, vidrio iluminado
  y sombras proyectadas. Árbol facetado y suelo de losas grandes, con vegetación
  saturada y luces de camino.
- Fuente de energía, lámpara y puerta de la plaza reciben acabado tecnológico.
  El estado apagado y los cambios al conectar siguen siendo legibles.
- Cielo más luminoso, HUD, diálogos, joystick y botón de proximidad comparten
  la paleta contemporánea. Las áreas interactivas y posiciones no cambian.

## Implementación
`src/art/modernArt.ts` contiene materiales planos e ilustración procedural.
El fondo de portada se guarda por tamaño; la plaza conserva la caché de las
siete zonas. No hay descargas, fuentes remotas ni nuevas animaciones obligatorias.
Los demás distritos y las pantallas de colección/encargos conservan su arte
anterior: esta fase establece una referencia visible para la siguiente revisión.

## Integración
`codex/estilo-moderno-plaza` continúa desde `codex/acabado-artistico`.
Commit y push propios; PR y merge a cargo del usuario.

## Validación
Build y suite completa aprobados: 18 pruebas unitarias y 42 escenarios E2E,
sin omisiones, en escritorio y móvil vertical. Las capturas de portada y plaza
se revisaron en ambas orientaciones. El build servido también cargó portada,
armario y mundo y conservó el nombre guardado, sin errores JavaScript/HTTP.
Capturas en `/workspace/nexus-modern-evidence/`.

## Extensión aprobada
La continuación `codex/estilo-moderno-completo` extiende esta muestra a todos
los distritos, objetos y pantallas. Ver `MODERN_ART_DIRECTION.md` para la
dirección vigente; los párrafos anteriores describen el alcance de la muestra.
