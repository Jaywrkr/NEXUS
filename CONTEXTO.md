# Los Nexus — Contexto completo para continuar con cualquier IA

> **Para la IA que lee esto (ChatGPT u otra):** este archivo es autocontenido.
> Con él solo deberías poder entender el proyecto, su estado y cómo seguir.
> Si tenés acceso al repo, los demás `.md` amplían cada tema (ver "Mapa de documentos" al final).
> Última actualización: 2026-10-05.

---

## 1. Qué es

**Los Nexus** es un juego web 2D que un padre construye junto a su hijo **Luca (9 años, TDAH)**.
No es comercial: el objetivo es que Luca vea que sus ideas se convierten en algo jugable, con ciclos cortos entre idea y resultado.

- **Mecánica única:** el jugador controla al Nexus (criatura humanoide con orejas de conejo, hoodie turquesa y mochila con cable) y **conecta** objetos del escenario con un cable de energía: toca un objeto origen y luego un destino. Si la conexión es válida, algo cambia en el mundo.
- **Nada de** combate, enemigos, inventario, economía, tiendas, multijugador ni login.
- **Ciclo:** explorar → encontrar algo apagado → conectar → el mundo se transforma → aparece un fragmento → se guarda en el Museo.

Público y filosofía: sesiones cortas, progreso visible en el mundo, aprender probando (sin tutoriales largos), juego justo. Regla permanente: *ninguna idea nueva puede romper la simplicidad del primer minuto.*

## 2. Stack y cómo correrlo

- **Phaser 4.2** (API compatible con Phaser 3) + **TypeScript 6** + **Vite 8**. Sin backend.
- Repo: `github.com/Jaywrkr/NEXUS`.

```bash
npm install
npm run dev              # http://localhost:5173
npm run dev -- --host    # para probar desde el celular en la misma WiFi
npm run build            # tsc + vite build — correr SIEMPRE tras cualquier cambio
```

No hay tests automatizados. La verificación se hace con `npm run build` sin errores + jugando (Playwright headless con capturas, y el usuario prueba en el celular real de Luca).

## 3. Estado actual del juego

Mundo de **scroll horizontal de 2950 px** (la cámara sigue al Nexus) con **4 zonas**, cada una con un "sabor" de puzzle distinto, siempre usando solo "conectar":

| Zona | Puzzle | Detalle |
|---|---|---|
| 1. La plaza | fuente → lámpara → puerta | Secuencial de 3 pasos. La conexión fuente→lámpara abre el **mini-túnel del cable** (ver abajo). Al abrir la puerta: la ventana de la casa se enciende, el árbol saca hojas, la plaza cambia de color. |
| 2. La fuente de agua | fuente → fuente de agua | Un solo paso. |
| 3. La antena | fuente A + fuente B → antena | Necesita **dos** conexiones. Hay además una **fuente señuelo** gris (sin brillo) que no conecta con nada: obliga a observar antes de tocar. |
| 4. El puente | interruptor → puente | Una grieta **bloquea físicamente** el paso hasta conectar el interruptor. |

Además:
- **Fragmentos:** cada zona revela uno al resolverse; se recogen por cercanía y llevan al Museo. Contador `★ n/4` en el HUD.
- **Fragmento secreto:** un 5º fragmento escondido detrás de la casa, al oeste del punto de partida. Visible desde el inicio (no depende de conectar nada). **No** cuenta para `★ n/4` ni para "¡Colección completa!", pero tiene su propia vitrina.
- **Museo:** 5 vitrinas (4 de zona + secreta). Al completar las 4 de zona por primera vez: flash + chispas en todo el mundo y mensaje "¡Colección completa!".
- **Mini-túnel del cable** (idea de Luca): mini-juego en perspectiva tipo Mario Kart; la chispa avanza sola por un tubo ondulado y hay que esquivar las paredes (flechas/WASD o joystick). Ganar completa la conexión; perder permite reintentar sin castigo. Por ahora solo en fuente→lámpara.
- **Feedback de conexión:** cable curvo (bezier) con una chispa que lo recorre; al completar, ráfaga de chispas variadas (círculos y estrellas, cian/blanco) + anillo expansivo. Cable rojo y sonido de error si la conexión no encaja.
- **Controles:** teclado/mouse en PC; joystick virtual + **botón de interacción** por proximidad en celular ("Tocar"/"Conectar", aparece cerca de un objeto conectable).
- **Celular vertical real:** la resolución interna cambia (960×540 ↔ 540×960) según orientación + tipo de puntero.
- **Sonido** generado por código (Web Audio), con botón mute 🔊/🔇.
- **Personaje con sprites PNG reales** (4 poses: idle, caminar ×2, celebrar). Es la **única** excepción a "todo con formas de Phaser". Sin personalización por ahora.
- **Pantalla de título:** "Jugar", o "Continuar" + "Nueva partida" si hay progreso.
- **Progreso** en `localStorage` (clave `los-nexus-progress`: `{ fragmentsCollected: string[], seenCompletion: boolean }`).
- Pulido: fades entre escenas, parallax (nubes y colinas), sombras de piso, aceleración suave del Nexus, viento en el árbol, mariposas.

## 4. Arquitectura

```
src/
  main.ts                  — crea Phaser.Game; recarga la página si cambia la orientación
  config/gameConfig.ts     — resolución según orientación/puntero; lista de escenas
  scenes/
    BootScene.ts           — título + precarga de sprites del Nexus
    WorldScene.ts          — todo el mundo: zonas, reglas de conexión, fragmentos, HUD, cámara
    MuseumScene.ts         — vitrinas (FRAGMENTS = las 4 de zona; SECRET_FRAGMENT aparte)
    CableTunnelScene.ts    — mini-túnel; se lanza encima de WorldScene pausada
  entities/
    Nexus.ts               — personaje (sprite, movimiento con aceleración, celebrate())
    nexusAssets.ts         — claves y loader de public/assets/nexus/*.png
  systems/
    ConnectionSystem.ts    — mecánica de conectar
    ProgressSystem.ts      — wrapper de localStorage
    AudioSystem.ts         — tonos Web Audio + mute
  objects/
    ConnectableObject.ts   — base abstracta (Container) de todo lo conectable
    EnergySource.ts        — fuente; variant 'active' (dorada) | 'dim' (señuelo gris)
    Lamp.ts, Door.ts, Fountain.ts, Beacon.ts, Bridge.ts
    Fragment.ts            — coleccionable (reveal(), collect())
  ui/VirtualJoystick.ts, ui/InteractButton.ts
  data/gameState.ts        — forma del estado guardado + load/save con merge seguro
  utils/sceneTransition.ts — fadeToScene()
  utils/uiTextures.ts      — texturas de rectángulo redondeado para botones/HUD
public/assets/nexus/       — los 4 PNG del personaje
```

### Cómo funciona la conexión (lo más importante para agregar contenido)

```ts
// En WorldScene.setupConnections():
const src = new EnergySource(this, x, y, 'mi-fuente');      // role 'source': puede iniciar
const obj = new Lamp(this, x2, y2);                           // role 'target'
this.connectables.push(src, obj);                             // se registran con connectionSystem.register()
this.connectionSystem.addRule({ sourceId: src.id, targetId: obj.id });          // conexión válida
// opcional: { ..., useTunnel: true } para pasar por el mini-túnel antes de completarse

// Reacción del mundo:
this.events.on('connection-made', (targetId: string) => { if (targetId === obj.id) { /* ... */ } });
```

- Primer toque en un objeto con `canInitiate()` (fuentes) lo selecciona; segundo toque en otro objeto busca una regla `source→target`.
- **Sin regla = conexión inválida** (cable rojo, sonido de error, "Esa conexión no encaja, prueba otra"). Por eso un señuelo no necesita código especial: es un objeto registrado sin reglas.
- Al completar: `source.activate()`, `target.activate()`, partículas, y se emite `'connection-made'` con el id del destino.
- Para un objeto nuevo: extender `ConnectableObject`, dibujarlo con formas de Phaser, implementar `activate()`, y llamar `setSize` + `setInteractive`.

### Fragmentos
`new Fragment(scene, x, y)` empieza invisible; `reveal()` lo muestra; se recoge con `this.physics.add.overlap(this.nexus, frag, () => this.collectFragment(frag, ID))`. `collectFragment` guarda el progreso, actualiza el HUD y lleva al Museo. Solo los ids de `ALL_FRAGMENT_IDS` cuentan para la colección completa.

### Coordenadas del mundo (landscape: `midY = 270`, `v = height/540 = 1`)
- Inicio del Nexus `(480, midY+100v)`. Cámara con límites `(0, 0, 2950, height)`.
- Zona 1: fuente `(480, midY-40v)`, lámpara `(680, midY-20v)`, puerta `(820, midY+60v)`, fragmento `(820, midY-10v)`. Casa decorativa en `x=280`.
- Fragmento secreto: `(140, midY+60v)`.
- Zona 2: fuente `(1300, midY-40v)`, fuente de agua `(1460, midY+40v)`, fragmento `(1460, midY-60v)`.
- Zona 3: fuente A `(1980, midY-80v)`, fuente B `(1980, midY+80v)`, señuelo `(2100, midY)`, antena `(2220, midY)`, fragmento `(2220, midY-90v)`.
- Zona 4: fuente `(2500, midY-40v)`, interruptor `(2560, midY)`, grieta en `x=2610` (ancho 100), fragmento `(2820, midY-40v)`.

## 5. Reglas que no hay que romper sin preguntar

1. **Toda mecánica nueva reutiliza la acción de conectar.** Variar el ritmo (secuencia, doble conexión, bloqueo físico, timing), no agregar botones ni acciones.
2. **Todo se dibuja con formas de Phaser** (rectángulos, círculos, estrellas, `Graphics`). Única excepción: los sprites del Nexus. No agregar imágenes/audio externos sin que el usuario lo pida.
3. Nada de combate, inventario complejo, economía, multijugador ni login.
4. **No ampliar el alcance sin aprobación explícita.** Se avanza de a un paso chico, se prueba, y se pregunta antes del siguiente.
5. Pensar siempre en celular vertical y en un niño de 9 años con TDAH: poco texto, feedback inmediato, nada frustrante.

Registro completo de decisiones (001–019): `DECISIONS.md`.

## 6. Trampas técnicas ya conocidas (no repetirlas)

1. **Botones de UI: no usar `Container` con hijos interactivos** — el primer clic funciona y los siguientes no. Usar rectángulo + texto sueltos (como `InteractButton` y los botones de `BootScene`).
2. `StaticBody.updateFromGameObject()` no funciona con `Container`: si un cuerpo estático se mueve, actualizar `body.x/body.y` a mano.
3. Todo texto/gráfico de HUD necesita `setScrollFactor(0)`, si no desaparece al hacer scroll.
4. En CSS usar `100dvh` (con `100vh` de respaldo); no pegar UI importante al borde inferior.
5. Detectar celular vertical con `matchMedia('(orientation: portrait) and (pointer: coarse)')`, no por ancho de ventana.
6. Mini-juegos encima del mundo: `scene.launch('Otra', data)` + `scene.pause()`; al terminar, la hija hace `scene.stop()` + `scene.resume('WorldScene', resultado)`, y `WorldScene` escucha `this.events.on('resume', (sys, data) => ...)`.
7. PNG generados por IA: recortar margen transparente (umbral de alpha ~40) y reducir (~480 px de alto); recortar todas las poses con el mismo criterio para que los pies queden alineados.
8. Al probar con Playwright: el radio de interacción es circular (90 px) — acercarse en diagonal. Para pruebas puntuales sirve exponer temporalmente el juego (`(window as any).__debugGame = new Phaser.Game(...)` en `main.ts`) y llamar métodos de la escena; **revertirlo antes de commitear**.
9. Las animaciones cortas (<600 ms) pueden terminar antes de que Playwright saque la captura: capturar sin espera, o no asumir que "no se ve" = bug.

## 7. Qué sigue (backlog acordado, en este orden)

Ya hechos de esta lista: partículas variadas, fuente señuelo, fragmento secreto.

1. **Criatura que despierta**: al conectar algo aparece una criatura pequeña que sigue al Nexus un rato y reacciona (salto/sonido) cerca de conexiones pendientes. Sin diálogo.
2. **Objeto en movimiento**: algo que se mueve (péndulo, luz que gira) y solo se puede conectar cuando está en la posición correcta — variante de timing.
3. **Energía compartida**: una fuente que alimenta un solo objeto a la vez; hay que decidir el orden. Toca las reglas de `ConnectionSystem` → más riesgo.
4. **Cable largo entre zonas**: conectar algo de una zona con algo de otra ya visitada. La más compleja; dejar para el final.

Otras ideas sueltas (`IDEAS.md`): pantalla de créditos ("hecho con Luca"), mensaje suave al girar el teléfono en vez de recargar, deploy a una URL propia + PWA instalable, ajustar dificultad del mini-túnel jugando con Luca y quizá aplicarlo a más conexiones.

## 8. Forma de trabajo

- Pasos chicos: proponer → el usuario aprueba → implementar → `npm run build` → probar jugando → actualizar docs → commit.
- Tras cada cambio: borrar la idea de `IDEAS.md`, sumar una entrada a `CHANGELOG.md`, y si es una decisión de diseño, agregarla a `DECISIONS.md`. Mantener este archivo al día.
- Git: el usuario maneja los PR y merges a mano. Trabajo reciente en la rama `claude/project-documentation-43sxil` (partículas, señuelo, fragmento secreto, docs) — pusheada, sin PR todavía.
- Idioma del proyecto: español (código en inglés, comentarios y textos del juego en español).

## 9. Mapa de documentos

| Archivo | Para qué |
|---|---|
| `CONTEXTO.md` | Este archivo: todo en uno, para cualquier IA. |
| `CLAUDE.md` | Lo mismo orientado a Claude Code (se carga solo en esas sesiones). |
| `GAME_VISION.md` | Visión original, público, pilares, estilo (no se modifica). |
| `DECISIONS.md` | Registro numerado de decisiones de diseño. |
| `IDEAS.md` | Backlog vivo. |
| `CHANGELOG.md` | Historial cronológico de lo construido. |
| `MVP_SCOPE.md` | Alcance del MVP 0.0 original (histórico). |
| `ART_PROMPTS.md` | Prompts usados para generar los sprites del Nexus. |
| `public/assets/nexus/README.md` | Detalle técnico de los sprites. |
