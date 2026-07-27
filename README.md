# Los Nexus

Juego web en desarrollo, hecho con Phaser 3, TypeScript y Vite.

Este proyecto es un ejercicio creativo para construir junto a Luca (9 años). Ver `GAME_VISION.md` para la visión completa, `MVP_SCOPE.md` para el alcance del MVP y `DECISIONS.md` para el registro de decisiones.

## Requisitos

- Node.js 18+

## Uso

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run preview  # previsualizar el build
```

## Estructura

```
src/
  main.ts
  config/
    gameConfig.ts
  scenes/
    BootScene.ts
    WorldScene.ts       (próximamente)
    MuseumScene.ts      (próximamente)
  entities/
    Nexus.ts            (próximamente)
  systems/
    ConnectionSystem.ts (próximamente)
    ProgressSystem.ts   (próximamente)
  objects/
    ConnectableObject.ts (próximamente)
    EnergySource.ts      (próximamente)
    Lamp.ts              (próximamente)
    Door.ts              (próximamente)
    Fragment.ts          (próximamente)
  ui/
    InstructionUI.ts    (próximamente)
  data/
    gameState.ts         (próximamente)
  styles/
    main.css

public/
  assets/
    placeholder/
  favicon.svg
```

## Estado actual

Fase 1 completada: proyecto configurado, escena inicial con el título "Los Nexus".
