# Los Nexus

Juego web 2D hecho con Phaser, TypeScript y Vite.

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

- Node.js 18+

## Uso

```bash
npm install
npm run dev              # servidor de desarrollo
npm run dev -- --host    # para probar desde el celular (misma red WiFi)
npm run build            # build de producción
npm run preview          # previsualizar el build
```

## Estructura

```
src/
  main.ts                    — entrada, crea el Phaser.Game
  config/gameConfig.ts       — resolución dinámica según orientación/puntero
  scenes/
    BootScene.ts             — pantalla de título (Jugar / Continuar / Nueva partida)
    WorldScene.ts            — el mundo (4 zonas), cámara, joystick, botón de interacción
    MuseumScene.ts           — vitrinas de fragmentos
    CableTunnelScene.ts      — mini-juego dentro del cable
  entities/
    Nexus.ts, nexusAssets.ts — personaje jugable (sprites PNG)
  systems/
    ConnectionSystem.ts      — mecánica de conectar
    ProgressSystem.ts        — wrapper de localStorage
    AudioSystem.ts           — tonos generados por Web Audio
  objects/
    ConnectableObject.ts     — clase base
    EnergySource.ts, Lamp.ts, Door.ts, Fountain.ts, Beacon.ts, Bridge.ts, Fragment.ts
  ui/
    VirtualJoystick.ts, InteractButton.ts
  data/gameState.ts
  utils/sceneTransition.ts, utils/uiTextures.ts
  styles/main.css

public/
  favicon.svg
  assets/nexus/              — sprites del personaje
```

## Estado actual

4 zonas jugables (plaza, fuente de agua, antena, puente), mini-túnel del cable, fuente señuelo, fragmento secreto, museo con 5 vitrinas, controles táctiles con botón de interacción, adaptación a celular vertical y sonido. Detalle completo en `CONTEXTO.md`.
