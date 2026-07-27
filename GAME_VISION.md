# Los Nexus — Visión del juego

## Propósito

Este juego no busca ser comercial por ahora. El objetivo principal es:

- motivar a Luca a crear;
- construir algo juntos;
- permitirle probar cambios rápidamente;
- enseñarle que una idea puede convertirse en algo jugable;
- mantener tiempos cortos entre idea y resultado;
- evitar que el proyecto se vuelva demasiado grande o complejo.

El juego debe funcionar primero en navegador web y poder probarse desde computadora y celular.

## Público: Luca (9 años, TDAH)

Referentes: Minecraft, Sneaky Sasquatch, Roblox, Score! Hero, Head Ball 2, Goat Simulator, 99 Nights in the Forest.

Le gusta: construir y mejorar cosas, ver progreso visible, misiones claras, explorar, ganar recursos con esfuerzo, personalizar su personaje, jugar con otros, descubrir cosas inesperadas, retos y minijuegos, humor, coleccionar y mostrar objetos, sentir que sus acciones cambian el mundo.

No le gusta: mundos vacíos, repetición, linealidad, pagar para ganar, ventajas por dinero, ambientes tóxicos, esperas largas, exceso de explicaciones.

Principios: el progreso depende del esfuerzo, el juego es justo, el jugador entiende qué hace, cada objetivo tiene sentido, las sesiones dan resultados visibles rápido, se puede jugar solo (cooperación es una posibilidad futura, no del MVP).

## Pilares de diseño

1. Conectar es la acción principal y debe ser divertida por sí sola.
2. El progreso se ve en el mundo, no solo en un menú.
3. Sesiones cortas con retroalimentación inmediata.
4. Simplicidad ante todo: ninguna idea nueva puede romper la claridad del primer minuto.
5. Juego justo, sin pagar para ganar.

## Mecánica central: el Cable Nexus

El Nexus tiene una conexión de energía que sale de su cuerpo, mochila, antena o núcleo. El jugador la extiende hacia objetos del escenario para **conectar**.

El Nexus no dispara, no pelea, no usa armas, no tiene inventario complejo ni muchas acciones distintas.

Usos de la conexión: encender una lámpara, activar una máquina, abrir una puerta, mover un objeto pequeño, revelar un símbolo, conectar dos fuentes, restaurar color, crear un puente temporal, despertar un objeto, resolver un circuito simple.

La conexión debe sentirse visual, clara, satisfactoria, elástica, responsiva y divertida incluso sin recompensa. El jugador aprende probando, sin tutoriales largos.

## Ciclo principal

Explorar → encontrar algo apagado → observar conexiones posibles → conectar correctamente → provocar una reacción → descubrir algo → obtener un fragmento o recuerdo → transformar el lugar.

El progreso se mide por: lugares restaurados, conexiones descubiertas, objetos recuperados, cambios visibles en el mundo, elementos mostrados en la base o museo — no principalmente por niveles.

## Personaje: el Nexus

Criatura humanoide fantástica, no un niño humano realista, no un robot genérico, no un personaje estilo Roblox.

Mantiene rasgos humanoides reconocibles: dos brazos, dos piernas, postura reconocible, ropa, zapatos, gorra, mochila, accesorios.

Pero es su propia especie: cuerpo pequeño y compacto, proporciones estilizadas, cabeza no anatómica, cara oscura o simple, dos luces/ojos muy expresivos, antenas/orejas/extensiones que reaccionan, manos simples sin dedos detallados, silueta reconocible, apariencia ligeramente fantástica.

La identidad del jugador se expresa mediante ropa, colores, accesorios, gorra, chaqueta, zapatos, mochila y pequeños detalles visuales. La personalización es mínima en el MVP, pero el código debe permitir cambiar color del cuerpo, color de la chaqueta, gorra y zapatos más adelante.

## Mundo

Mundo contemporáneo estilizado, no cyberpunk ni futurista, no realista tipo GTA, no mundo abierto 3D.

Sí: barrios pequeños, talleres, plazas, parques, casas, tiendas, caminos, estaciones, arquitectura estilizada, ambiente cercano al presente con elementos fantásticos integrados con naturalidad.

El mundo comienza parcialmente apagado o sin vida. Al resolver conexiones: aparecen colores, se encienden luces, se mueven objetos, se abren caminos, llegan personajes, crecen plantas, aparecen sonidos, cambian detalles del escenario. El progreso debe verse directamente en el mundo.

## Fragmentos y museo

Al resolver un lugar, el jugador obtiene un fragmento, recuerdo u objeto especial que se guarda en un espacio personal (nombre pendiente: Museo Nexus / Archivo Nexus / Sala de recuerdos / Base Nexus). Sirve para que Luca vea y muestre lo que consiguió.

MVP: una habitación, una vitrina, un objeto coleccionable.

## Estilo visual

2D o 2.5D simple, sprites, capas de fondo, formas grandes, paleta limitada, pocos detalles, animaciones cortas, sombras pintadas, partículas simples, escenarios modulares y reutilizables.

Nada de 3D libre, cámaras complejas, modelos realistas, iluminación 3D, físicas avanzadas, animaciones difíciles, escenarios enormes ni arte excesivamente detallado.

La calidad visual viene de composición, colores, siluetas, animaciones simples, reacciones claras y la transformación antes/después. Para empezar: gráficos temporales con rectángulos, círculos, líneas, colores, texto y formas SVG simples. Sin assets externos por ahora.

## Restricciones (fuera de alcance por ahora)

Combate, enemigos, vida, daño, crafting, economía, tiendas, monedas, vehículos, misiones múltiples, diálogos, NPCs complejos, inventario completo, mapa, árbol de habilidades, clima, ciclo día/noche, mundo abierto, multijugador, login, skins comerciales, pay to win.

## Filosofía de simplicidad

Inspirada en Shigeru Miyamoto: "Antes de la historia, el primer minuto debe ser divertido por sí solo."

Pregunta guía: "¿La mecánica principal es divertida incluso si no existe historia?" La respuesta debe ser sí.

Regla permanente: ninguna nueva idea puede romper la simplicidad del primer minuto. Cada nueva idea debe mejorar la mecánica principal (conectar), no agregar botones innecesarios.

## Decisiones aprobadas

Ver `DECISIONS.md`.
