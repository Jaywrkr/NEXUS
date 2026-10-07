# Ilustraciones de lápiz

Dirección: `SKETCH_ART_DIRECTION.md`; referencia original aportada por el usuario.
Imágenes generadas con esa referencia y revisadas visualmente, convertidas a WebP.
No contienen la interfaz del teléfono que rodeaba la hoja de personaje.

| Archivo | Contenido |
| --- | --- |
| `nexus.webp` | Cuatro poses registradas, 2×2: quieto, dos pasos alternos, festejo |
| `residents.webp` | 3×3: Miga, Bombo, Vera, Don Paso, Goteo, Pipa, Lucio y dos aves |
| `props-off.webp` / `props-on.webp` | 4×4: generador, lámpara, puerta, fuente, antena, palanca, aspersor, flores, motor, pato, campana, desfile, farol, escenario, confeti, radio |
| `extras.webp` | 4×4: lazo, antena, insignia de pato, corona, buzón, clasificador, traductor, altavoz, planta, estrella, vitrina vacía, puente, luna, sol, filtro, cartel |
| `district-0.webp` … `district-7.webp` | Plaza, agua, radio, puente, jardín, taller, faroles y museo; 1672×941 |

Los sprites se convierten sin pérdida, incluidos sus márgenes transparentes;
los fondos usan WebP calidad 92. Los recortes y claves de compatibilidad se crean
al cargar el juego; no se mantiene ningún PNG ni WebP del acabado anterior activo.
La tipografía está en `../fonts/` y lleva su licencia OFL. No hay fuentes remotas.

## Ampliación: poses y circuito de agua (2026-10-06)

Assets originales generados para esta entrega mediante imagegen y revisados como
imágenes y dentro del juego. Se conserva el grafito, marfil, teal, naranja y lima.

- `nexus-directions.png`: 2×2, dos pasos de perfil hacia la derecha en la fila
  superior; dos pasos de espalda en la inferior. El perfil izquierdo se refleja.
- `nexus-idle-directions.png`: 2×1, reposo de perfil y de espalda, ambos pies apoyados.
- `water-machines.png`: 3×1, bomba eléctrica de agua, válvula directa naranja y
  reguladora teal. Referencia de generación: `props-off.webp`; sin letras ni suelo.

Los PNG mantienen alfa. `nexusAssets.ts` registra casco y pies al extraer cada pose;
`gridFrames` recorta cada máquina por su silueta. Los labels, luces de entrada/salida,
conductos y lectura de presión se dibujan en ejecución; no son parte del atlas.
No se incorporan imágenes de terceros. Los originales anteriores se conservan.
