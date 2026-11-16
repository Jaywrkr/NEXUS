# Plan «siguiente nivel» — Los Nexus 3D

Jay pidió llevar el juego al siguiente nivel con el repositorio
[gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
(79 «habilidades» de desarrollo de juegos para agentes, Apache 2.0). Las que sirven para un juego web
con three.js r187 quedaron instaladas en `.claude/skills/` (cualquier sesión de Claude Code en este
repo las usa sola). Este plan cruza esas guías con lo que el juego ya tiene.

Reglas de siempre: todo con la acción de conectar (Decisión 008), nada de combate ni economía, pensado
para Luca (9 años, TDAH) en celular, y cada fase con pruebas, capturas, documentación y commit.

## Qué ya cumplíamos

- **Rendimiento** (`performance-optimization`): medir antes de optimizar, medidor en pantalla y
  presupuesto de dibujos por cuadro (Etapas A–C, Decisiones 063–065).
- **Cámara** (`camera-systems`): seguimiento con suavizado independiente de los fps (`damp`),
  anticipación según la velocidad, silueta cuando algo tapa al Nexus.
- **Luz** (`threejs-materials-lighting`): luces físicas de r155+, una sola luz con sombra ajustada a la
  vista, sin sombras de luces puntuales.

## Fases

| Fase | Guías | Qué | Estado |
|---|---|---|---|
| **1. Se siente mejor** | `game-feel`, `platformer`, `input-systems` | Salto con tiempo de coyote y salto anticipado, flotadita arriba al mantener, caída más firme con tope; el botón táctil salta al apretar (antes saltaba al soltar); sacudida de cámara por trauma en tres tamaños (juntar, conectar, revivir) y una pausa mínima en lo grande; el Nexus se estira al despegar; los contadores del HUD saltan al cambiar; todo respeta «Efectos suaves». | ✅ (Decisión 066) |
| **2. El guardado no se pierde** | `save-systems` | Versión del guardado y migraciones, copia de respaldo antes de escribir, recuperación si el guardado se rompe, y un «código de partida» para pasar el progreso a otro equipo. | ✅ (Decisión 067) |
| **3. Sonido de verdad** | `audio-design` | Volúmenes por categoría (música, efectos, ambiente) en Opciones, compresor en la salida para que nada sature, variación de tono en los sonidos repetidos y música que baja cuando hablan los vecinos. | ✅ (Decisión 068) |
| **4. Controles para todos** | `input-systems`, `game-ui-ux` | Joystick de consola (zona muerta circular, botones que cambian de ícono según el control), menús que se recorren con el joystick, márgenes seguros del celular, tamaño mínimo de texto y contraste. | ✅ (Decisión 069) |
| **5. Agua y luz** | `shader-programming`, `threejs-materials-lighting` | Shader de agua de verdad (olas, espuma en la orilla, reflejo del cielo), luz de cielo/piso suave y atardecer más lindo. | ✅ (Decisión 070) |
| **6. El mundo se lee solo** | `level-design`, `puzzle`, `dialogue-systems` | Caminos y señales que guían sin texto (luces que marcan la ruta, hitos visibles de lejos), pistas escalonadas en todos los acertijos y diálogos de los vecinos con más vida. | ✅ (Decisión 071) |

## Lo que se decidió no hacer (y por qué)

- **Salto variable que se corta al soltar** (`platformer`): con un toque rápido el Nexus no llegaba a
  escalones de 1 m que antes sí. Para Luca, todo salto llega a la altura completa; mantener solo da una
  flotadita arriba.
- **Modelos glTF y texturas PBR** (`threejs-gltf-loading`, `create-game-assets`): el juego se arma con
  primitivas por decisión (Decisiones 033–035); se usan las ideas de dirección de arte, no los modelos.
