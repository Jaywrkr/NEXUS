# Los Nexus — Guía rápida para Claude

Este archivo existe para que una sesión nueva de Claude Code entienda el proyecto en segundos, sin tener que releer todo el historial de conversación. Léelo primero.

## Qué es esto

Juego web 2D hecho con **Phaser 3 (v4 instalado) + TypeScript + Vite**, construido junto a Luca (9 años, TDAH) como ejercicio creativo padre-hijo. No es comercial. Ver `GAME_VISION.md` para la visión completa del proyecto (público, pilares de diseño, filosofía).

**Mecánica única:** el jugador controla al Nexus y **conecta** objetos del escenario entre sí con un cable de energía (clic/toque en origen, luego en destino). Esa es la única acción de juego — nada de combate, inventario o economía. Ver `DECISIONS.md` para el registro completo de decisiones y por qué.

## Estado actual (no es solo el MVP 0.0 original)

El MVP 0.0 original (`MVP_SCOPE.md`) se completó y se probó con Luca en varias rondas. Desde entonces el proyecto avanzó bastante más allá de ese alcance inicial, con aprobación explícita del usuario en cada paso. Estado real hoy:

- **4 zonas jugables** en un mundo de scroll horizontal de 2950px de ancho (no una sola pantalla):
  1. **La plaza**: fuente → lámpara → puerta (puzzle secuencial de 3 pasos).
  2. **La fuente de agua**: fuente → fuente de agua (puzzle de un solo paso).
  3. **La antena**: dos fuentes → una antena (necesita **dos** conexiones simultáneas).
  4. **El puente**: un interruptor revela un puente sobre una grieta que **físicamente bloquea el paso** hasta conectarlo (única zona con barrera real de colisión).
- **Personalización profunda**: color de cuerpo, chaqueta, acento y zapatos + **forma** de gorra (ninguna/gorra/gorro) + **forma** de mochila (núcleo/cuadrada/redonda). 36 combinaciones. Pantalla `CustomizeScene` antes de jugar.
- **Personaje rediseñado** siguiendo una referencia visual que el usuario compartió: orejas tipo conejo con puntas de color, cabeza clara con cara negra y ojos ovalados amarillos, hoodie con capucha asomando, mochila con cable de energía colgando (ver `src/entities/Nexus.ts`).
- **Museo** con 4 vitrinas, mensaje de "Colección completa" y celebración especial (flash + chispas en las 4 zonas) la primera vez que se completan las 4.
- **Controles duales**: teclado/mouse en desktop, joystick virtual táctil + **botón de interacción** (aparece al acercarse a un objeto conectable, evita tener que acertar el toque exacto sobre algo pequeño).
- **Adaptación real a móvil vertical**: la resolución interna del juego cambia (960×540 landscape ↔ 540×960 portrait) según orientación + tipo de puntero, para llenar la pantalla en vez de dejar barras negras. Ver `src/config/gameConfig.ts`.
- **Sonido**: tonos generados por código (Web Audio, sin archivos de audio) para conectar/error/recolectar.
- **Animaciones del Nexus**: idle, caminar, conectar (implícito en el cable), celebrar (salto + chispas al recoger fragmentos).
- **Progreso persistente** en `localStorage` (fragmentos recolectados, apariencia elegida, si ya vio la celebración final).

Todo esto se probó jugando de verdad (no solo `npm run build`) usando Playwright headless para simular clics/toques y tomar capturas de pantalla, además de pruebas reales en el celular de Luca que revelaron bugs que el simulador no mostraba.

## Cómo correr y probar

```bash
npm install
npm run dev      # servidor de desarrollo (localhost:5173)
npm run dev -- --host   # para probar desde el celular en la misma red WiFi
npm run build     # build de producción — SIEMPRE correr esto después de cualquier cambio
```

No hay test suite automatizado. La forma de verificar cambios en esta sesión fue:
1. `npm run build` (debe terminar sin errores).
2. Levantar el dev server y usar Playwright (`chromium` en `/opt/pw-browsers/chromium`, paquete Playwright en `/opt/node22/lib/node_modules/playwright`) para simular clics/teclado, tomar screenshots, y leerlos con la herramienta de lectura de imágenes.
3. Revisar consola por errores (`page.on('pageerror', ...)`).

Ver la sección "Bugs reales encontrados" más abajo antes de asumir que algo raro en una prueba es un bug del juego — varias veces resultó ser imprecisión del script de prueba (el Nexus no estaba lo bastante cerca en el eje Y, por ejemplo), no un problema real.

## Arquitectura (carpetas reales, no las "próximamente" del README viejo)

```
src/
  main.ts                    — entrada, crea el Phaser.Game, recarga si cambia orientación
  config/gameConfig.ts       — resolución dinámica según orientación/puntero
  scenes/
    BootScene.ts             — pantalla de título: "Jugar"/"Continuar" según haya progreso guardado
    CustomizeScene.ts        — elegir apariencia antes de jugar
    WorldScene.ts            — el mundo completo, las 4 zonas, cámara, joystick, botón de interacción
    MuseumScene.ts           — vitrinas de fragmentos
  entities/
    Nexus.ts                 — el personaje jugable (visual + movimiento + celebrar)
  systems/
    ConnectionSystem.ts      — la mecánica de conectar (seleccionar origen → destino, reglas, cable)
    ProgressSystem.ts        — wrapper de localStorage (fragmentos, apariencia, seenCompletion)
    AudioSystem.ts           — tonos generados por Web Audio
  objects/
    ConnectableObject.ts     — clase base abstracta de todo lo conectable
    EnergySource.ts, Lamp.ts, Door.ts, Fountain.ts, Beacon.ts, Bridge.ts, Fragment.ts
  ui/
    VirtualJoystick.ts       — joystick táctil
    InteractButton.ts        — botón fijo de interacción por proximidad (¡NO usar Container, ver abajo!)
  data/
    gameState.ts             — shape del estado guardado + carga/guardado con merge seguro
  styles/main.css
```

## Decisiones de diseño que no romper sin preguntar

Ver `DECISIONS.md` para la lista completa. Las más importantes:
- **Toda mecánica nueva debe reutilizar la acción de conectar** (Decisión 008). La antena (doble conexión) y el puente (bloqueo físico) son ejemplos de cómo variar el ritmo sin salirse de esto.
- Nada de assets externos — todo son formas de Phaser (rectángulos, elipses, círculos, líneas, graphics).
- No agregar combate, inventario complejo, economía, multijugador, login (Decisión 006).
- No ampliar el alcance sin que el usuario lo pida explícitamente.

## Gotchas / bugs reales ya encontrados y arreglados (no los repitas)

1. **`Phaser.GameObjects.Container` con hijos interactivos es poco confiable para botones de UI**: el primer clic funciona, los siguientes no se registran. `InteractButton` se reescribió usando objetos de escena planos (rectángulo + texto sueltos, sin Container) — igual que el botón "Jugar" de `CustomizeScene`, que siempre funcionó bien. Si agregás un botón nuevo, seguí ese patrón (sin Container).
2. **`StaticBody.updateFromGameObject()` no funciona con `Container`**: llama a `gameObject.getTopLeft()`, que `Container` no implementa. Si necesitás mover un cuerpo físico estático cada frame (ej. un objeto que flota), actualizá `body.x`/`body.y` manualmente en vez de usar ese método.
3. **Objetos de texto/gráficos de UI necesitan `setScrollFactor(0)` explícito**, incluso si están dentro de un sistema que ya parece "fijo en pantalla". El texto de feedback de `ConnectionSystem` quedó invisible en la zona 2 por esto — se posicionaba en coordenadas de mundo y la cámara lo dejaba fuera de vista al hacer scroll.
4. **`100vh` en CSS no es confiable en navegadores móviles** (la barra de direcciones ocupa espacio variable). Se usa `100dvh` con `100vh` como respaldo. Además, ningún elemento de UI importante (como el botón "Jugar") debería depender de estar pegado al borde inferior de la pantalla — mejor calcularlo relativo al contenido de arriba.
5. **`window.matchMedia('(orientation: portrait) and (pointer: coarse)')`** es la forma de distinguir un celular real en vertical de una ventana de escritorio angosta (que tiene `pointer: fine`). No uses solo el ancho de la ventana para esa detección.
6. **Cuidado al probar con Playwright**: mover al Nexus solo en un eje (por ejemplo solo `ArrowRight`) y luego hacer clic en el botón de interacción puede fallar si el objetivo está a más de 90px en el otro eje (el radio de interacción es circular, no solo horizontal). Varias veces esto se confundió con un bug real cuando en realidad era el script de prueba. Siempre mover en diagonal (mantener dos teclas) para acercarse de verdad, o usar clics directos con coordenadas ya validadas en este documento/commits anteriores.

## Coordenadas de referencia del mundo (para pruebas o debug futuro)

`WORLD_WIDTH = 2950`, altura del mundo = `this.scale.height` (540 en landscape, 960 en portrait). `midY = height / 2`. Con `vScale = height / 540` (1 en landscape) multiplicando los desplazamientos verticales:

- Zona 1 (plaza): fuente `(480, midY-40·v)`, lámpara `(680, midY-20·v)`, puerta `(820, midY+60·v)`, fragmento `(820, midY-10·v)`.
- Zona 2 (fuente de agua): fuente `(1300, midY-40·v)`, fuente de agua `(1460, midY+40·v)`, fragmento `(1460, midY-60·v)`.
- Zona 3 (antena): fuente A `(1980, midY-80·v)`, fuente B `(1980, midY+80·v)`, antena `(2220, midY)`, fragmento `(2220, midY-90·v)`.
- Zona 4 (puente): fuente `(2500, midY-40·v)`, interruptor `(2560, midY)`, grieta centrada en `x=2610` (ancho 100), fragmento `(2820, midY-40·v)`.

El Nexus arranca en `(480, midY+100·v)`. La cámara sigue al Nexus con `startFollow(nexus, true, 0.12, 0.12)` y límites `(0,0,WORLD_WIDTH,height)`.

## Cómo seguir trabajando

1. Leé este archivo, `GAME_VISION.md`, `MVP_SCOPE.md` y `DECISIONS.md`.
2. Antes de proponer algo nuevo, preguntate si reutiliza la acción de conectar (Decisión 008) y si el usuario lo pidió o aprobó.
3. Después de cualquier cambio: `npm run build` sin errores, y probar de verdad jugando (Playwright headless + screenshots como mínimo; el usuario prueba en dispositivo real por su cuenta).
4. Documentar en `DECISIONS.md` si es una decisión de diseño nueva, y actualizar este archivo si cambia la arquitectura o aparece un gotcha nuevo.
5. El usuario maneja los PR y merges a mano — vos trabajás en una rama y hacés commit, no hace falta abrir PR salvo que te lo pidan explícitamente.
