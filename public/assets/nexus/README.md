# Assets del Nexus (pendiente)

Esta carpeta es donde van los PNG reales del personaje cuando estén listos
(ver Decisión 017 en `DECISIONS.md` y `ART_PROMPTS.md` en la raíz del
proyecto para los prompts exactos a usar).

## Archivos esperados

Todos en PNG con fondo transparente, mirando hacia la **derecha** (el juego
espeja horizontalmente al caminar a la izquierda, no hace falta una versión
para cada lado). Tamaño sugerido: **256×384px** por imagen (se escala hacia
abajo en el juego; mejor sobrar resolución que faltar). Mismo encuadre y
proporción del personaje en las 4 imágenes, para que no "salte" al cambiar
de una animación a otra.

| Archivo | Pose |
|---|---|
| `nexus-idle.png` | De pie, quieto, postura neutra (la pose "frontal" de la referencia, pero de perfil/3-4 mirando a la derecha). |
| `nexus-walk-1.png` | Mitad del paso, pierna adelantada, leve inclinación del cuerpo. |
| `nexus-walk-2.png` | El paso opuesto (para alternar 1↔2 y generar el ciclo de caminata). |
| `nexus-celebrate.png` | Saltando, brazos arriba u orejas en alto, expresión de alegría. |

## Cómo se activa

Estos archivos hoy **no se cargan todavía** — `Nexus.ts` sigue dibujando el
personaje con formas de Phaser (círculos, elipses, rectángulos). Cuando
estén los 4 PNG acá:

1. Confirmar tamaño/orientación de cada uno contra esta lista.
2. Pedirle a Claude que reemplace `Nexus.buildVisual()` por un `Sprite`/
   `Container` de sprites usando `src/entities/nexusAssets.ts` (ya
   preparado con las claves y rutas, solo falta conectar `loadNexusAssets`
   en el `preload()` de `BootScene` y usar las claves en `Nexus.ts`).
3. Resolver la personalización (color de cuerpo/chaqueta/gorra/mochila):
   probablemente con capas separadas por prenda + `sprite.setTint()`, no
   con un único PNG a todo color — a definir según cómo vengan las imágenes.
