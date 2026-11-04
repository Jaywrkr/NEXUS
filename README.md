# Los Nexus

Juego web **3D** hecho con Three.js, TypeScript y Vite. La versión 2D completa (Phaser) sigue jugable en `2d.html`.

Es un ejercicio creativo para construir junto a Luca (9 años). El jugador controla al Nexus y conecta objetos del escenario entre sí con un cable de energía — esa es la única mecánica de juego.

**Para retomar el proyecto (con cualquier IA o a mano), empezar por `CONTEXTO.md`**: tiene todo en un solo archivo — qué es, estado actual, arquitectura, reglas, trampas conocidas y próximos pasos.

Documentos de apoyo:
1. `CONTEXTO.md` — contexto completo y autocontenido (pensado para ChatGPT u otra IA).
2. `CLAUDE.md` — lo mismo orientado a sesiones de Claude Code.
3. `GAME_VISION.md` — visión original y filosofía de diseño.
4. `DECISIONS.md` — registro de decisiones tomadas.
5. `IDEAS.md` — backlog vivo de próximas ideas.
6. `CHANGELOG.md` — historial cronológico de todo lo construido.
7. `MVP_SCOPE.md` — alcance del MVP original (histórico).
8. `ART_PROMPTS.md` — prompts usados para generar los sprites del Nexus.

## Requisitos

- Node.js 24+ para desarrollo y pruebas (Vite requiere como mínimo 20.19 o 22.12).

## Uso

```bash
npm ci
npm run dev              # servidor de desarrollo: 3D en / · 2D en /2d.html
npm run dev -- --host    # para probar desde el celular (misma red WiFi)
npm run build            # build de producción
npm run preview          # previsualizar el build
```

## Pruebas

`npm test` ejecuta las pruebas de guardado y el recorrido en Chromium, en escritorio y móvil vertical: la 2D en `/2d.html` y el 3D en `tests/e2e/nexus3d.spec.js`. Preparación, cobertura y límites en [tests/README.md](tests/README.md). Ejecutar también `npm run build`.

## Estructura

```
index.html                   — Los Nexus 3D (juego principal)
2d.html                      — versión 2D completa (Phaser)
src/3d/
  main.ts                    — entrada 3D: modos título / mundo / túnel / museo
  core/                      — render (look gouache), batch, input, progreso, tween, util
  world/World.ts             — el barrio
  entities/Nexus3D.ts        — el personaje
  objects/                   — objetos conectables y fragmentos
  systems/Connections.ts     — mecánica de conectar
  scenes/                    — WorldMode, TunnelMode, MuseumMode
src/ (resto)                 — versión 2D: scenes, objects, art, zones, data, systems, ui...
tests/                       — unitarias y E2E (2D y 3D)
```

## Estado actual

**3D (principal):** barrio abierto con estilo de fondo de anime pintado, las 4 zonas originales (plaza, fuente de agua, antena, puente sobre el canal), mini-túnel del cable en 3D, fuente señuelo, fragmento secreto, museo 3D, cámara isométrica o detrás del personaje, controles de PC y celular. **2D (`2d.html`):** 7 zonas, capítulo 1 con habitantes, historias secundarias, radio, armario, final y pistas — se irán pasando al 3D. Detalle completo en `CONTEXTO.md`.
