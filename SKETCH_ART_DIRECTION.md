# Nexus — cuaderno a lápiz

Dirección vigente aprobada por el usuario mediante su hoja de personaje (Decisión 033).
Sustituye el acabado moderno y la muestra ilustrada de la plaza en **todo el juego**.

## Personaje y materiales

Cabeza marfil, cara de grafito negro con rayado visible, dos ojos amarillos ovalados
sin boca, antenas largas con puntas naranja y azul, discos laterales azules,
sudadera turquesa con el número **2**, pañuelo naranja, guantes y piernas de carbón,
zapatillas marfil con remates naranja y mochila con puerto turquesa y cable lima.
El contorno es irregular y repetido; el pigmento y las marcas de lápiz se ven dentro
de la ropa. Las dos caminatas alternan la pierna adelantada.

Papel cálido, grafito, turquesa apagado, naranja, marfil y lima sustituyen a los
paneles azul oscuro, los brillos de plástico y los volúmenes facetados. Los nombres,
mensajes y botones usan Patrick Hand, incluida localmente con licencia OFL.
La fuente termina de cargarse antes de crear Phaser, para que el texto del canvas
no quede rasterizado con una fuente provisional.

## Cobertura

- Cuatro poses del jugador; cinco chaquetas, cuatro adornos dibujados y cuatro
  cables mantienen sus identificadores y desbloqueos. El cable del sprite acompaña
  el color elegido. Las preferencias existentes se respetan; el color predeterminado nuevo es lima.
- Siete habitantes conservan su oficio: sombrero y carpeta, tambor, radio y llave,
  casco y bastón, jardín, gafas y herramientas, y farol. Aves con dos poses y plantas
  reemplazan las figuras geométricas. La reacción al paso y el balanceo siguen activos.
- Ocho fondos independientes de 1672×941: siete barrios y museo. El encuadre de los
  barrios conserva sus proporciones; se cachea por distrito y resolución.
- Generador, lámpara, puerta, fuente, antena, interruptor, aspersor, parterre, motor,
  pato, campana, desfile, faroles, escenario, confeti y radio tienen ilustraciones.
  Los estados incluyen puerta abierta, agua, flores, señales y luces. Los contadores
  de entradas parciales y las reglas siguen perteneciendo a los objetos originales.
- Buzón, clasificador, traductor, altavoz, filtro, luna, sol y avisos ilustran también
  los encargos secundarios y los regresos. El puente y las vitrinas son dibujos.
- Portada, armario, diario, encargos, mundo/HUD, museo, final y túnel comparten papel,
  trazos imperfectos y tipografía manuscrita. El joystick y las tarjetas usan materiales
  de lápiz; los cables conservan el color elegido con un contorno de grafito.

## Implementación y revisión

Los WebP de sprites conservan el alfa y se cargan en `public/assets/sketch/`.
Los atlas derivan los cuadros de las dimensiones reales; no se suponen 1024px.
Los márgenes transparentes separan las ilustraciones. Las cuatro poses mantienen
sus claves anteriores para las animaciones y las paletas de ropa. No se incorporan
reglas, niveles ni controles nuevos en este cambio de arte.

Los botones siguen siendo objetos de escena planos. Ninguna ilustración decorativa
recibe input ni cuerpos físicos. La barrera del puente, guardados, proximidad y
efectos suaves conservan su funcionamiento. Las partículas y el papel no generan
ruido nuevo cada fotograma. Validación y orden de integración: `SKETCH_PLAYTEST.md`
y `BRANCH_STACK.md`.
