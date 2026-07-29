# Los Nexus

Juego web hecho con Phaser 3, TypeScript y Vite.

Este proyecto es un ejercicio creativo para construir junto a Luca (9 años). El jugador controla al Nexus y conecta objetos del escenario entre sí con un cable de energía — esa es la única mecánica de juego.

**Para retomar el contexto rápido del proyecto (recomendado antes de tocar código), leer en este orden:**
1. `CLAUDE.md` — estado actual, arquitectura, gotchas conocidos.
2. `GAME_VISION.md` — visión completa del proyecto y filosofía de diseño.
3. `DECISIONS.md` — registro de decisiones tomadas.
4. `MVP_SCOPE.md` — alcance del MVP original (histórico).
5. `CHANGELOG.md` — historial cronológico de todo lo construido.

## Requisitos

- Node.js 18+

## Uso

```bash
npm install
npm run dev              # servidor de desarrollo
npm run dev -- --host    # para probar desde el celular (misma red WiFi)
npm run build             # build de producción
npm run preview           # previsualizar el build
```

## Estructura

```
src/
  main.ts                    — entrada, crea el Phaser.Game
  config/
    gameConfig.ts            — resolución dinámica según orientación/puntero
  scenes/
    BootScene.ts
    CustomizeScene.ts        — elegir apariencia antes de jugar
    WorldScene.ts             — el mundo (4 zonas), cámara, joystick, botón de interacción
    MuseumScene.ts            — vitrinas de fragmentos
  entities/
    Nexus.ts                  — personaje jugable
  systems/
    ConnectionSystem.ts       — mecánica de conectar
    ProgressSystem.ts         — wrapper de localStorage
    AudioSystem.ts            — tonos generados por Web Audio
  objects/
    ConnectableObject.ts       — clase base
    EnergySource.ts, Lamp.ts, Door.ts, Fountain.ts, Beacon.ts, Bridge.ts, Fragment.ts
  ui/
    VirtualJoystick.ts
    InteractButton.ts
  data/
    gameState.ts
  styles/
    main.css

public/
  favicon.svg
```

## Estado actual

El MVP 0.0 original se completó y se probó con Luca. El proyecto avanzó más allá de ese alcance (con aprobación explícita en cada paso): 4 zonas jugables, personalización con formas (gorra, mochila), adaptación real a celular en vertical, botón de interacción por proximidad, sonido, y animaciones del Nexus. Ver `CLAUDE.md` para el detalle completo.
