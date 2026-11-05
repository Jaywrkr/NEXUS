# Los Nexus — Contexto completo para continuar con cualquier IA

> **Para la IA que lee esto (ChatGPT, Codex u otra):** este archivo es autocontenido.
> **Desde el 2026-11-04 el juego principal es 3D** (`index.html`, código en `src/3d/`).
> La versión 2D completa sigue en `2d.html`; su documentación está más abajo, en "Versión 2D completa".
> Si cambiás algo importante, actualizá este archivo (y `CLAUDE.md`).

## Los Nexus 3D (juego principal)

> **Idea central (Decisión 036):** el pueblo empieza **triste y sin color**, y el Nexus le devuelve la vida conectando cosas: cada conexión abre un círculo de color, cada zona resuelta colorea su lugar, y al terminar vuelve el color a todo el pueblo. **Mundo abierto (Decisión 037):** un solo barrio, sin niveles, lugares en cualquier orden. Todo lo nuevo tiene que respetar estas dos ideas.
>
> **Vecinos (Decisión 038):** Miga, Bombo, Vera y Don Paso ya están en 3D (`src/3d/entities/Resident3D.ts`), con los textos de `src/data/chapter.ts`. Están grises y cabizbajos hasta que su lugar revive.
>
> **Vida en el código:** `LIFE`, `withLife()` y `keepVivid()` en `src/3d/core/render.ts`; los círculos se manejan en `WorldMode.addLife()` / `applyConnection()`. Un material nuevo del mundo hecho con `toon()`/`flat()` ya se apaga solo; un objeto que deba quedar con color usa `keepVivid(grupo)`. El progreso 3D guarda fragmentos, conexiones y vecinos escuchados (`src/3d/core/progress.ts`).

### 1. Qué es

**Los Nexus** es un juego web que un padre (Jay, Cuenca, Ecuador) construye junto a su hijo **Luca (9 años, TDAH)**.
No es comercial: el objetivo es que Luca vea que sus ideas se convierten en algo jugable, con ciclos cortos entre idea y resultado.

- **Mecánica única:** el jugador controla al Nexus (criatura humanoide con orejas de conejo, hoodie turquesa y mochila con cable) y **conecta** objetos del barrio con un cable de energía: toca un objeto que tenga energía y luego el que quiere encender. Si la conexión es válida, el mundo cambia.
- **Nada de** combate, enemigos, inventario, economía, tiendas, multijugador ni login.
- **Ciclo:** explorar → encontrar algo apagado → conectar → el mundo se transforma → aparece un fragmento → se guarda en el Museo.

Público y filosofía: sesiones cortas, progreso visible en el mundo, aprender probando (sin tutoriales largos), juego justo. Regla permanente: *ninguna idea nueva puede romper la simplicidad del primer minuto.*

### Historia corta
1. Empezó como juego **2D en Phaser** (scroll lateral). Esa versión creció mucho (7 zonas, capítulo 1 con habitantes, historias secundarias, radio, armario, final, pistas, tests) y sigue completa y jugable en **`2d.html`** — ver la sección "Versión 2D completa" más abajo.
2. En noviembre de 2026, a pedido de Jay, el juego principal (`index.html`) pasó a **3D** con el estilo visual de otro proyecto suyo, *Calle 85* (un juego de skate 3D en un barrio ochentero): fondo de anime pintado en gouache, toon shading, contornos y filtro de pincel. **El 3D tiene hoy la lógica de las 4 zonas originales** (plaza, fuente, antena, puente) más señuelo y fragmento secreto. Lo demás de la 2D (zonas 5–7, capítulo, habitantes, historias, radio, armario, final, pistas) **todavía no está en 3D**: se va pasando de a una pieza (ver "Qué sigue").

### 2. Stack y cómo correrlo

- **Three.js r187** + **TypeScript 6** + **Vite 8**, sin backend. (Phaser 4 sigue instalado para la versión 2D.)
- Repo: `github.com/Jaywrkr/NEXUS`.
- Dos páginas (Vite multipágina, `vite.config.ts`): `index.html` = **Los Nexus 3D** (la actual), `2d.html` = versión 2D original.

```bash
npm install
npm run dev              # http://localhost:5173  (3D)  ·  http://localhost:5173/2d.html  (2D)
npm run dev -- --host    # para probar desde el celular en la misma WiFi
npm run build            # tsc + vite build — correr SIEMPRE tras cualquier cambio
npm test                 # pruebas unitarias + E2E (2D en /2d.html y 3D en tests/e2e/nexus3d.spec.js)
```

Además de los tests, se prueba jugando (Playwright headless con capturas; el usuario prueba en el celular real de Luca).

### 3. Estado actual del juego (3D)

Un **barrio abierto en 3D** (~90 × 90 m) con calles, veredas, casas de estuco con techo de teja, palmeras, árboles, postes con cables, autos, tiendas (HELADOS, PANADERÍA, JUEGOS, TIENDA) y un **canal** que corta el sur del barrio. El Nexus camina libre en cualquier dirección.

| Zona | Dónde | Puzzle |
|---|---|---|
| 1. La plaza | noroeste | fuente → **farola** → **puerta** de la casa apagada. Fuente→farola abre el **mini-túnel del cable**. Al encender la farola se ilumina la ventana; al abrir la puerta la plaza recupera el color (piso cálido, casa de estuco y teja, el árbol saca hojas). |
| 2. La fuente de agua | suroeste | fuente → fuente de agua (un paso). Sube el agua y sale un chorro. |
| 3. La antena | noreste | fuente A + fuente B → antena (**dos** conexiones). Hay una **fuente señuelo** gris sin brillo que no conecta con nada. |
| 4. El puente | sureste | fuente → **palanca**. El **canal bloquea el paso** hasta que se despliega el puente de madera; el fragmento está del otro lado. |
| 5. El jardín municipal | sur, del otro lado del canal | fuente → **aspersor** → **cantero de flores** (cadena de dos pasos: el aspersor solo puede iniciar un cable cuando ya está encendido). El cantero arranca con tierra seca y agrietada y flores grises caídas; al regarlo la tierra se oscurece, los tallos se enderezan y abren 24 flores. Ahí vive el **Alcalde Goteo** (banda, medalla, sombrero y regadera), triste hasta que el jardín florece. Hay setos con dos entradas (norte y este, con arco y cartel «JARDÍN MUNICIPAL»), glorieta, bebedero de pájaros, bancos y faroles. Solo se llega cruzando el puente. |

Además:
- **Fragmentos:** estrellas de cristal que aparecen al resolver cada zona; se recogen acercándose y llevan al Museo. Contador `★ n/5`.
- **Fragmento secreto (dorado):** escondido **detrás de la casa** de la plaza, visible desde el inicio. No cuenta para `★ n/5` ni para "¡Colección completa!", pero tiene vitrina.
- **Museo Nexus:** sala 3D con 6 vitrinas (una fila en horizontal; filas de 2 en vertical, separadas para que ninguna tape a la de atrás). Al completar las 5 zonas por primera vez: destello + chispas de colores en el barrio + "¡Colección completa!".
- **Mini-túnel del cable** (idea de Luca): vamos dentro del tubo, detrás de la chispa, y hay que guiarla (flechas/WASD o joystick) para que no toque las paredes mientras el cable serpentea. La chispa **no** sigue sola el centro del tubo: hay que manejarla. Tiene fases: **práctica** (se mueve sin avanzar ni chocar, botón EMPEZAR), **cuenta 3-2-1-¡YA!** (vibra en el celular), **carrera**, y al fallar un panel con **REINTENTAR** / **VOLVER**. Espacio/Enter = empezar o reintentar, Esc = volver. Volver sin terminar avisa que el cable quedó sin terminar y se puede intentar de nuevo. **En el celular** el joystick se muestra también en el túnel y toda la pantalla sirve para manejar (antes estaba oculto y no se podía controlar).
- **Carteles flotantes:** al acercarse (≤ 5 m) aparece el nombre de cada objeto conectable sobre él (HTML proyectado, no texto en 3D, para que el filtro de pincel no lo borronee).
- **Sorpresas:** las parejas inválidas pero graciosas (de `connectionSurprise`) muestran una tarjeta con la broma y hacen tambalear el objeto, en vez del error genérico.
- **Cables:** mientras hay una fuente elegida, el cable sale de la **mochila del Nexus** y lo sigue. Las conexiones hechas **quedan dibujadas** en el mundo. No se puede repetir una conexión ("¡Eso ya está conectado!"). Al conectar: chispa que recorre el cable, ráfaga de chispas y anillo.
- **Cámara:** **isométrica** por defecto (ortográfica, mira desde el sureste) con **silueta amarilla** cuando algo tapa al Nexus; tecla **V** o botón **VISTA** cambia a cámara **detrás** del personaje (tercera persona). La elección se recuerda.
- **Controles:** PC: WASD/flechas, **E/Espacio** para tocar/conectar, **clic** directo sobre un objeto. Celular: joystick a la izquierda, **botón grande** "Tocar/Conectar" (aparece cerca de un objeto) o tocar el objeto en pantalla.
- **Celular vertical:** la cámara se aleja en vertical para que el ancho visible no quede angosto.
- **Pantalla de título:** "Jugar", o "Continuar" + "Nueva partida" si hay progreso.
- **Progreso** en `localStorage`, **separado del 2D** (`src/3d/core/progress.ts`): clave `los-nexus-3d-progress` (`{ fragmentsCollected: string[], seenCompletion: boolean }`). Mute en `los-nexus-muted`, vista en `los-nexus-3d-view`.
- **Sonido** generado por código (Web Audio), botón 🔊/🔇.

### El Nexus en 3D
Con detalle de cerca: brillo en los ojos, sonrisa y borde claro en el visor, cachetes rosados, interior rosado de las orejas, puños naranjas, pulgares, tirantes con hebillas y mochila con manija, bolsillos, rejilla y hebilla. **Cuando se queda quieto ~1 s en la vista isométrica gira hacia la cámara** (`Nexus3D.idleFacing`, que pone `WorldMode`), así se le ve la cara y no la mochila; también en la pantalla de título.
Armado con primitivas (esferas, cápsulas, cajas) y **animación procedural** (no hay modelos ni imágenes): cabeza clara grande, visor oscuro con ojos amarillos que parpadean, orejas de conejo con punta celeste (izq.) y naranja (der.) que rebotan al caminar, hoodie turquesa con cuello naranja, guantes y pantalón azul marino, zapatillas blancas con suela naranja, mochila gris con lente cian y cable verde lima colgando. Camina con piernas/brazos en oposición, festeja con salto y giro, estira el brazo al tocar algo. Está a escala 1.3 para leerse bien en el celular.

### 4. Arquitectura (3D en `src/3d/`)

```
index.html                 — página 3D: canvas + HUD HTML (título, mensajes, botones, museo, túnel)
2d.html                    — página 2D original (Phaser, src/main.ts)
vite.config.ts             — build de las dos páginas
src/3d/
  main.ts                  — clase Game: modos (title/world/tunnel/museum), menú de pausa (☰/Esc), mapa (M),
                             opciones, ayuda, sonidos de interfaz, fundidos, loop; expone window.__nexus3d
  style.css                — kit de UI (tinta #1d1630, crema #fff3dc, sol #ffc23a, teal #2bb3a8; Bowlby One + Nunito):
                             .ui-btn, .big-btn, .menu-btn, .pill, .objective(.event), .overlay/.sheet, .action-btn, .round-btn
  core/settings.ts         — opciones guardadas aparte de la partida (sonido, vibración, efectos suaves, botones
                             grandes, cámara) + vibrate() y flashScreen()
  ui/MapView.ts            — mapa de la ciudad en un canvas 2D (vida, lugares, cosas, nidos, distritos que vienen)
  core/
    render.ts              — look gouache: toon 3 bandas, contorno por casco invertido, textura de pincel,
                             post-proceso Kuwahara + grading + grano + viñeta; Renderer; cielo
    batch.ts               — junta la escenografía quieta en pocas mallas (rendimiento)
    input.ts               — teclado + joystick HTML; `move` en coordenadas de pantalla
    tween.ts               — tweens mínimos (tween, after, ease)
    util.ts                — clamp/lerp/damp, rnd con semilla 85, isTouch
  world/World.ts           — el barrio: luz, cielo, calles, canal, casas, tiendas, postes, naturaleza,
                             escenografía de cada zona, colisiones (rectángulos + círculos), portón del skatepark
  world/districts.ts       — distritos de la ciudad (Centro, Camino al Skatepark y los que vienen) + districtAt()
  world/MigaHouse.ts       — primer interior (casa de Miga) en x = 300 + roomShell() para armar habitaciones "maqueta"
  data/chispis.ts          — las 40 cartas (tipo, rareza, origen, vecino que la cambia, frase), TYPES, rollPack()
  ui/cardArt.ts            — drawChispi() y drawCard(): dibujo procedural de cada Chispi y de la carta
  objects/festival.ts      — Motor, ToyDuck, ToyBell, ToyParade (2 entradas), LanternPost (tímido), Stage, ConfettiCannon
  world/Festival.ts        — FESTIVAL (posiciones del canal sur), buildFestivalStreet (faroles, plaza de la fiesta, galpón)
                             y buildWorkshopRoom (taller de Pipa por dentro, x = 700)
  objects/rides.ts         — Carousel, FerrisWheel, Coaster (vía con CatmullRom), MirrorBall; interfaz Ride (seat, startRide, updateRide)
  world/Park.ts            — PARK (posiciones), PARK_REGION, buildPark (piso, cerco, portón, puestos, casa de los espejos)
                             y buildMirrorRoom (x = 800)
  entities/Companion.ts    — Chispi compañero: makeBuddy(tipo) y Companion (sigue al Nexus, show() vuela a mostrar algo)
  objects/pack.ts          — makePack(): sobre que flota en el mundo
  world/ShopRooms.ts       — interiores de la heladería (x = 500) y la tienda de cartas (x = 600)
  world/revive.ts          — makeGray(): una habitación empieza gris y revive() le devuelve el color
  objects/indoor.ts        — FuseBox (casa de Miga), IceCreamMachine (heladería), CardDisplay (tienda de cartas)
  world/Skatepark.ts       — distrito Skatepark: piso, grafitis, portón, rampitas (Kicker), barandas (Rail), cajón,
                             sala con persiana, nodos del circuito, lugar del Chispi y el interior de la sala (x = 400)
  objects/skate.ts         — makeBoard() (patineta), SkateRamp (rampa grande conectable), makeNode()
  systems/Skate.ts         — andar en patineta: move, kick (rampitas/rampa), tryGrind/updateGrind, bonk
  systems/Voltio.ts        — Mundo Voltio: voltaje, estela, círculos cerrados, Estáticas, jaula del Chispi, nodos
  entities/Nexus3D.ts      — el personaje
  objects/
    Connectable.ts         — base de todo lo conectable (id, role, group, plugAnchor, activate, restore)
    objects.ts             — EnergySource ('active'|'dim'), StreetLamp, Door, Fountain, Beacon, BridgeLever, Fragment
  systems/Connections.ts   — la mecánica de conectar (reglas, cables 3D, partículas)
  scenes/
    WorldMode.ts           — el mundo jugable: zonas, reglas, fragmentos, HUD, cámaras, silueta
    TunnelMode.ts          — mini-túnel 3D
    MuseumMode.ts          — museo 3D (ZONE_FRAGMENTS, SECRET_FRAGMENT)
src/3d/core/progress.ts     — progreso del 3D (separado del de la 2D)
src/systems/AudioSystem.ts — sonidos, compartido con el 2D
src/scenes, src/objects, src/art, src/zones ... — versión 2D (Phaser)
tests/e2e/nexus3d.spec.js  — pruebas E2E del 3D (usan window.__nexus3d.step)
```

### Cómo funciona la conexión (para agregar contenido)

```ts
// En WorldMode (constructor):
const src = new EnergySource('mi-fuente', x, z);            // role 'source': puede iniciar
const obj = new MiObjeto('mi-objeto', x2, z2);               // extiende Connectable, role 'target'
scene.add(obj.group); this.connections.register(obj);        // (igual con src)
this.connections.addRule({ sourceId: src.id, targetId: obj.id });   // conexión válida
// opcional: { ..., useTunnel: true } para pasar por el mini-túnel

// Reacción del mundo: en WorldMode.onConnectionMade(target)
if (target === obj) { /* revelar fragmento, cambiar el mundo, setMessage(...) */ }
```

- Primer toque en algo con `canInitiate()` (fuentes; la farola solo cuando está encendida) lo selecciona; segundo toque busca una regla `source→target`.
- **Sin regla = conexión inválida** (cable rojo que se desvanece, sonido de error, "Esa conexión no encaja, prueba otra"). Un señuelo es solo un objeto registrado sin reglas.
- Al completar: `source.activate()`, `target.activate()`, efectos, y `onConnectionMade`.
- Objeto nuevo: extender `Connectable`, dibujarlo con `box()`, `rounded()`, `toon()` dentro de `this.group`, ubicar `this.plugAnchor` (de dónde sale/llega el cable), implementar `activate()` y `restore()` (estado ya resuelto, sin animar), y opcional `update(dt, time)`. `collideRadius` define el bloqueo y el alcance para interactuar.
- Partida guardada: `WorldMode.restoreProgress()` restaura cada zona resuelta y redibuja sus cables con `connections.restore(a, b)`.

Casas con zócalo, esquineros, alero, cumbrera, chimenea, ventanas con marco/cruz/alféizar/postigos de tablillas (a veces jardinera con flores), puerta con marco, tableros, ventanita, picaporte, farolito y número (`World.house`/`windowSet`). Tiendas con cornisa, toldo a rayas con volado, vidriera con divisiones, puerta vidriada y macetas. Fuente de energía con placa, pernos, franjas de luz, garras y conducto; farola con anillos, voluta, remate y placa. Todo quieto se agrupa con `batchStatic`, así que el detalle extra casi no suma llamadas de dibujo.

**Vecinos** (`Resident3D`): cara con nariz, orejas, brillo en los ojos, **cejas y boca que cambian con el ánimo** (cejas caídas y boca triste → cejas relajadas y sonrisa cuando su lugar revive), cuello, cinturón con hebilla, botones, puños y suelas. Extras: Miga con mameluco, chaleco con banda reflectiva y cinturón de herramientas; Bombo con capucha, botas amarillas, aro dorado en el tambor y palillos; Vera con cola de caballo, bufanda, prendedor de estrella, micrófono con rejilla y luz "al aire"; Don Paso con solapas, flor en el ojal y bastón; Goteo con botones dorados y cadena de reloj. **Antena**: base de hormigón con pernos, torre reticulada (cruces en cada tramo, función `strut`), escalera, cartel de peligro, tablero con rejilla y perilla, conducto, receptor con tres brazos que gira con el plato y luz roja que parpadea al transmitir. **Puente**: palanca con base y pernos, franjas de peligro y rueda dentada que gira al activarse; tablones desparejos con clavos, vigas laterales, baranda intermedia y remates; pilares de piedra con bolardos en las dos orillas (con colisión).

**Fuente de agua**: escalón de piedra, juntas en el muro, anillos en la columna, pico central, cuatro caños que echan chorritos al estanque, ondas en el agua, plaqueta con una gota, y en el fondo seco hojas caídas y monedas (quedan bajo el agua). La plaza de la fuente tiene anillo de baldosas, juntas radiales, dos bancos (`World.bench`, con colisión circular porque están en diagonal) y un tacho. **Canal** (`World.buildCanalDetail`): cordón de piedra, juntas y línea de humedad en la cara del muro norte (la única que ve la cámara), caños de desagüe, anillas de amarre, juncos con totoras, nenúfares con flores, vetas de corriente y hojas que viajan hacia el este (`drifting`, animadas en `World.update`) y un bote amarrado que se mece. **Autos**: el frente mira a +Z; parabrisas y luneta, parantes, paragolpes, parrilla, faros, luces traseras, patentes, puertas, manijas, espejos, llantas con taza y tuerca; las camionetas tienen caja de carga (a veces con un cajón) y algunos autos portaequipaje.

### La Gran Chispa, la mochila y las cosas dormidas (Decisiones 040 y 041)

**Historia:** el barrio tenía una **Gran Chispa** (la energía de la alegría). Se apagó y se rompió en chispitas que quedaron atrapadas en los cables, escondidas por el barrio y dormidas adentro de las cosas; por eso el pueblo está gris. El Nexus tiene la **mochila Atrapachispas**: junta chispitas y las devuelve donde hacen falta. La intro de Miga lo cuenta. (Idea a futuro: cuando todo el barrio esté vivo, vuelve la Gran Chispa → la fiesta/final.)

- **Dos formas de conectar.** Lo grande (farola, puerta, fuente, antena ×2, puente, aspersor, flores) sigue con cable directo desde una fuente de energía y **siempre abre la carrera de luz** (`useTunnel: true` en todas sus reglas). Lo chico (las 20 cosas dormidas) se despierta **solo con la mochila**: tocar la cosa gasta 1 chispita y sale un rayito de la mochila (`WorldMode.wakeWithBackpack`, `Connections.zap`); se guarda como conexión `{ sourceId: 'mochila', targetId }`. Sin carga, aviso «Tu mochila está vacía» (y la primera vez una tarjeta que explica de dónde salen).
- **Mochila:** hasta 5 chispitas (`MAX_CHARGE` en `core/progress.ts`, guardado en `charge`). HUD `#charge` (🎒 ●●○○○) arriba a la izquierda; la lente de la mochila del Nexus pasa de cian apagado a dorado y late con la carga (`Nexus3D.charge`, `sparkle()`). Llena: las chispitas no se juntan y avisa.
- **De dónde salen las chispitas** (`systems/SparkPickups.ts`): (1) **adentro de cada carrera de luz** (se suman al volver, aunque se abandone); (2) **estallan 4 al revivir un lugar grande**; (3) **10 escondidas** por el barrio (`HIDDEN_SPARKS`, ids guardados en `sparks`; se escapan un poquito al acercarse, más lento que el Nexus); (4) **nidos de chispitas**: los 6 ex-chisperos (`Spark` en `objects/sleepers.ts`) ya no inician cables; al tocarlos sueltan 3 que saltan alrededor y se vuelven a llenar en 40 s (`NEST_REFILL`). Cerca del Nexus un imán suave las atrae.
- **Cosas dormidas** (`Sleeper`): buzón, casitas de pájaros, tacho (con ojos), hidrante, radio, cartel ABIERTO de la heladería, carrito de helados, bici, tendedero, pato de goma (borde de la fuente), globos, enano de jardín, molinete, luces de 4 autos y 2 desagües. Reacción corta con sonido propio (`AudioSystem.tone`/`noise`), un círculo de color chico, y ya despiertas se pueden volver a tocar (`Connectable.poke`, no gastan). Contador ✦ n/20 y celebración con las 20.
- **Carrera de luz** (`scenes/TunnelMode.ts`, Decisión 041): cada una se arma con `planTunnel(zona, dificultad)`: **forma** al azar distinta a la anterior (curvas suaves, zigzag, espiral, sube y baja, pasadizo angosto con radio variable), **tema** según el lugar (plaza dorado con estrellas, fuente azul con burbujas, antena violeta con ondas, puente verde con hojas, jardín rosa con pétalos) con un corrimiento de color al azar, **largo/velocidad/ancho** según la dificultad, **compuertas que giran** desde dificultad 0.3, y 6–9 **chispitas** para juntar. Dificultad adaptable guardada en `tunnelSkill` (sube 0.1 al ganar, baja 0.12 al abandonar); **dos choques seguidos** rehacen la misma carrera 0.25 más fácil. Pruebas: `tunnel.autopilot = true` esquiva compuertas y junta chispitas; `tunnel.current` describe la carrera; `world.tunnelPending` indica que hay una pedida.
- Ubicación: `WorldMode.buildSleepers` busca en espiral un lugar pisable (`World.isWalkable`; `isFree` es para decoración y además evita calles y zonas reservadas). El cartel, el pato, los autos y los desagües van fijos.
- **Barrio que reacciona** (`src/3d/systems/Playground.ts`): 5 bandadas de palomas que picotean y se espantan al acercarse (vuelan, dan vueltas y vuelven), 6 charcos que salpican al pasar corriendo, 5 montoncitos de hojas que vuelan al correr encima y 3 pelotas que se patean, ruedan, rebotan contra paredes y objetos (`world.resolve`).
- Los círculos de vida del shader pasaron de 16 a 32 (`LIFE_SPOTS`).

### Saltar, tirolesa y bailar (Decisión 042)

- **Saltar** (Espacio en PC, botón SALTAR en el celular): sube ~1,3 m (`JUMP_V`, `GRAVITY` en `WorldMode`). Rects y círculos de colisión con `h` son **plataformas**: se pueden saltar encima (`World.groundAt`, `resolve(..., feetY)`): bancos (0,56/0,51), tacho de la fuente (0,88), autos (capó 1,15 y techo 1,9: se sube al capó y desde ahí al techo). Sin `h` = pared. Al caer se aplasta y rebota (`Nexus3D.land`); en el aire recoge las piernas.
- **Chispitas altas**: arriba del techo de 3 autos (`spark-high-*`) y en el medio de los dos cables de la tirolesa (`spark-zip-*`). `SparkPickups` solo junta las que están a la altura del Nexus (`baseY`).
- **Tirolesa**: las dos filas de postes son recorridos (`World.zipLines`, comba `ZIP_SAG`). Al lado de un poste el botón dice **Tirolesa**: el Nexus sube al cable, se desliza hasta el poste vecino que queda hacia donde mira y se suelta (cae con la gravedad). No cruza el canal (no hay postes del otro lado). La cámara sube un poco cuando el Nexus está alto.
- **Bailar** (B o botón 💃 BAILAR): el Nexus baila ~2,4 s; los vecinos a menos de 7 m se suman (contentos bailan de verdad; tristes levantan un poco la cabeza) y las cosas despiertas cercanas repiten su reacción. Al hablar con un vecino el Nexus lo saluda con la mano.
- Controles: **E** tocar/conectar (y subir/bajar de la patineta), **Espacio** saltar (ollie), **Q** Mundo Voltio, **B** bailar, **V** vista, **H** pista, **M** mapa, **Esc** menú. En PC el botón de tocar está abajo a la derecha; en el celular, bailar y saludar están en el menú ☰.

### Interfaz y base para crecer (Decisión 043, Fase 0)

- **HUD**: `#menuBtn` ☰, `#charge` 🎒, `#msg` (botón: objetivo; `setMessage` lo marca `.event` ~5 s y vuelve solo con `showObjective()`), `#stars`, `#awake`, `#toast`, `#story` con `#storyFace` (retrato por quién habla), `#districtBanner`, `.action-dock` con `#jumpBtn` (solo táctil) e `#interact`.
- **Pista**: tocar `#msg` o H → `WorldMode.showHint()`: elige el paso grande pendiente más cercano (`bigSteps`) o, si no queda, cosas dormidas / nidos; muestra tarjeta «Pista» y una flecha en el piso + aro en el destino (`pointTo`, 8 s, se apaga al llegar).
- **Menú** (`main.ts`): ☰ o Esc pausa (`body.paused`, `world.update` no corre, tampoco en `step()`); hojas `#menuMain`, `#menuOptions`, `#menuHelp`; `#mapPanel` (M) dibuja `drawMap(world.mapData())` cada cuadro. Opciones en `core/settings.ts` (claves `los-nexus-vibration`, `los-nexus-reduced-effects`, `los-nexus-big-buttons`, `los-nexus-3d-view`); «Borrar partida» pide confirmación y no borra las opciones.
- **Distritos**: `districtAt(x, z)`; al cambiar aparece el cartel. Hoy abiertos: Centro y Camino al Skatepark (la calle z = 0 sigue hasta x = 57,5; el portón está en x = 61,5). Fuera del Centro solo se camina por la calle (`World.resolve` empuja por el lado más corto).
- **Interiores**: `World.interior` (`room`, `spawn`, `exit`, `spark`). Dentro de `room` el `resolve` usa las paredes de la habitación en vez de los límites del barrio; muebles con `h` son plataformas (cama 0,55, banco 0,95, mesa, sillón). `WorldMode.findDoorway` ofrece **Entrar** frente a la puerta de la plaza (si está abierta) y **Salir** sobre el felpudo; `enterHouse`/`leaveHouse` hacen un fundido corto. Adentro la cámara es isométrica y un poco más cerca. Chispita `spark-room-casa` arriba del banco. Para agregar otro interior: otra habitación lejos (otro x), su puerta y su `findDoorway`.

### Skatepark, patineta y Mundo Voltio (Decisión 044, Fase 1)

- **Zonas caminables**: `World.keepInRegions` lleva al Nexus al punto más cercano del Centro, la calle del este (|z| < 6,1) o el Skatepark (`SKATE_REGION`: x 61–96, z −20…20). Las habitaciones (`World.rooms`) tienen sus propias paredes.
- **Skatepark** (`World.skate`): fuente (66,5, −12) → `SkateRamp` (frente en 82, −15,2; rectángulo de 12 × 4,2 hacia −Z) con carrera de luz `skate`; Rulo (67,2, 4,6); patineta (68,8, 6,2); rampitas en (70, 9) hacia +X y (90,5, −5) hacia −X, más la rampa grande (rebota hacia afuera); barandas z = −6 (x 67–79) y z = 15,5 (x 66–78), altura 0,55; cajón (75, 2) h 0,65; sala con puerta en (91,5, 17) que mira a +Z; nodos (81,5, 8), (87,5, 5,5), (93, 9); jaula del Chispi (72,5, −11,5).
- **Patineta**: `progress.hasFlag('board')`. Botón contextual: «Patineta» junto a la tabla, «🛹 Subir» / «Bajar» cuando no hay nada cerca. `Skate.move` (velocidad máx. 9, ×1,25 en Voltio), `kick` en el piso, `tryGrind` cayendo; trucos `trick-ollie`, `trick-air`, `trick-grind` → flag `hood` (clase `body.has-hood` muestra ⚡). Pose de patineta en `Nexus3D` (`riding`, `grinding`, `lean`).
- **Mundo Voltio** (`WorldMode.enterVoltio/exitVoltio`, ⚡ o Q): `Renderer.voltio` (0..1) pasa el post-proceso a negro + bordes de neón; `Voltio.group` (grilla, estela, Estáticas, nodos, jaula) solo se ve adentro; capucha puesta (`Nexus3D.setHood`), caminar ×1,5, salto ×1,2. No hay tocar/hablar/entrar. Estela: puntos cada 0,3 m que duran 4 s; si el tramo nuevo cruza uno viejo se cierra un polígono (área > 1,2 m²) y se rompe lo que quede adentro. Estáticas: si tocan al Nexus (0,85 m) → `exitVoltio('¡Bzzzt!…')`; encerradas → 3 chispitas y reaparecen a los 25 s. Nodos: tocarlos los prende; los tres → flag `sala-open` (persiana arriba, segundo interior). Rescate → `progress.rescueChispi('rueditas')` y `cb.card(id)` (carta `#cardPop`, pausa). Voltaje 30 s (`MAX_VOLT`), se recarga a 2/s afuera.
- **Objetivo y pistas**: `skateStep()` da el paso que toca en el Skatepark o en Voltio; tiene prioridad en el objetivo y en `showHint()`.
- **Pruebas**: el escenario «skatepark» recorre todo (caminar hasta allá, patineta, tres trucos, capucha, Voltio, rescate, circuito, Estática, sala, rampa, voltaje, guardado).

### Interiores que se reviven (Decisión 045, Fase 2)

- **Habitaciones** (`World.rooms`): casa de Miga (x = 300), sala del skatepark (400), heladería (500), tienda de cartas (600). Las tres del Centro son `ReviveRoom` (`source`, `target`, `gray`): empiezan grises (`makeGray`, materiales clonados) y no se agrupan (`userData.dynamic`).
- **Revivir**: en cada una, `EnergySource` (`casa-source`, `helados-source`, `cartas-source`) → `FuseBox` / `IceCreamMachine` / `CardDisplay` con `useTunnel` (temas `casa`, `helado`, `cartas`). `applyConnection` llama `room.gray.revive()` y prende lo de afuera (`World.outside`: `miga` guirnalda, `helados` y `cartas` vidrieras).
- **Puertas** (`WorldMode.interiors`): casa de Miga (con la plaza viva), heladería (`World.shopDoors.helados` = 15,5, 13,9; siempre abierta), tienda de cartas (`shopDoors.cartas` = 33,5, 13,9; flag `cartas-open`). Los locales miran a +Z (hacia el canal), no a la calle.
- **Circuitos del Mundo Voltio** (`Voltio` recibe `Circuit[]`): `sala-open` (nodos del skatepark) y `cartas-open` (`World.cardNodes`: 28, 17,5 · 31,5, 20 · 36, 17,5). Al cerrarse llaman `hooks.circuit(id)`: persiana de la sala o reja de la tienda. Cerca de la tienda trabada aparece un aviso.
- **Objetivo y pistas adentro**: `skateStep()` (también cubre interiores) dice qué revivir y apunta a la energía (o al objeto si ya hay cable en la mano).
- **Horizonte**: no hay cerros al este (cos(a) > 0,75), porque tapaban las habitaciones.

### Cartas de Chispis (Decisión 046, Fase 3)

- **Datos**: `data/chispis.ts` (40 cartas; `source` 'rescate' | 'sobre' | 'cambio'; `trader` = id del vecino). Para agregar un Chispi de Luca, sumar una línea ahí: el dibujo sale solo según su tipo.
- **Progreso**: `progress.cards` (id → cantidad), `addCard`, `giveCard` (nunca deja sin la última), `uniqueCards`, `duplicates`. `rescueChispi` también suma la carta. Los sobres juntados son flags `pack-<id>`.
- **Sobres** (`WorldMode`): `HIDDEN_PACKS` (8) + `dropPack('lugar-<lugar>')` en `applyConnection` para los 9 lugares que reviven (al costado, lejos de fragmentos y de otros sobres). Se juntan pasando encima (`updatePacks`, misma altura ± 0,5). `openPack` guarda las cartas (`rollPack`) y llama `cb.pack(ids)`.
- **Jaulas**: `CAGES` (Centro) + Rueditas; `Voltio` recibe `CageSpot[]` con las que faltan; `isCaged(id)`, `cageSpots`. En Voltio, la jaula a menos de 14 m pasa a ser el objetivo.
- **Cambios**: `speak(r, asked)`; si el jugador habló (no el saludo automático), el vecino tiene carta sin dar y hay repetidas → `cb.trade(...)`; `WorldMode.trade(who, give)` hace el cambio.
- **Pantallas** (`main.ts`, `index.html`): `#cardPop` (carta grande, encima de todo), `#packPop` (cartas `.flip-card` en orden), `#tradePop`, `#albumPop` (`.mini-card`, `.missing`). `pauseFor`/`closePop` pausan el mundo mientras están abiertas. La vitrina encendida de la tienda abre el álbum (`CardDisplay.onPoke`).

### Chispi compañero (Decisión 047, Fase 4)

- Se elige con `#cardBuddy` en la carta grande → `WorldMode.setCompanion(id)` (null lo saca); se guarda en `progress.companion`. `companionId`, `helps(tipo)`.
- `updateCompanion` lo mueve cada cuadro y lo reubica si queda a más de 25 m (puertas, teletransportes). Cada 6 s, Luz (`pickups.nearestHidden`) y Radio (sobres a < 40 m) vuelan a mostrar algo con `show()` + `pointTo`.
- Ayuditas: `pickups.magnet` (Luz 3,4), `playground.onSplash` → `boostT` (Agua), `walkScale()` (Voltio × Vía × charco), salto ×1,2 (Bosque), patineta ×1,25 (Ruedas), `addLife` 5,2 al despertar (Flor), +2 chispitas en `finishTunnel` (Feria), `voltio.maxVolt` 45 (Mar).

### El Centro completo y la fiesta (Decisión 048, Fase 5)

- **Taller de Pipa**: galpón en (39,5, 51,5), portón (41,5, 54) que mira a +Z; interior `World.taller` (x = 700, `ReviveRoom` gris). Reglas: `toy-source → toy-motor` (túnel `taller`), `toy-motor → toy-duck | toy-bell`, `toy-duck | toy-bell → toy-parade` (instantáneas). `ToyParade` necesita 2 entradas (en `restoreProgress` se activa por conexión, igual que la antena). Objetivo y pista adentro guían paso a paso. Pipa está adentro.
- **Faroles** (`FESTIVAL`): energía (9,5, 52) → inicio (14, 54) con túnel `faroles`; directo (20, 50,5) → salida (27,5, 55); curioso (18,5, 59) → tímido (24,5, 60) → salida. Lucio en (11,5, 58).
- **Fiesta**: `lantern-last → party-stage` (túnel `fiesta`) y `party-stage → party-confetti`, con `ConnectionRule.available = prepared` (puerta, fuente, antena completa, flores y desfile) y `blockedMessage`. `party()` marca el flag `chapter-done`, hace bailar a todos y llama `cb.ending(stats)` → `#endPop`. `progress.snapshot().story.chapterSeen` sale de ese flag (epílogos de `residentLine`).
- **7 lugares**: `ZONE_FRAGMENTS` suma `workshop-fragment` y `lantern-fragment`; `zonesDone()` cuenta desfile y salida de faroles. Los sobres de lugares nunca caen cerca de puertas, felpudos ni fragmentos.
- Cosas dormidas nuevas al final de la lista (para no cambiar los ids guardados): globos, molinete, enano y casita de pájaros en el canal sur.

### Parque de diversiones (Decisión 049, Fase 6)

- **Región** `PARK_REGION` (x −36…36, z −94…−52) + corredor de la calle norte-sur (|x| < 6,1) desde el Centro. Distrito `parque` abierto.
- **Juegos** (`objects/rides.ts`): `park-carousel` (−15, −66), `park-wheel` (17, −80), `park-coaster` (estación −9, −82; vía en `PARK.coasterTrack`). Fuentes `park-*-source`. Reglas con túnel; la vuelta y la montaña rusa con `available: unlocked` (flags `wheel-open` / `coaster-open`, circuitos del Mundo Voltio con nodos `PARK.wheelNodes` / `PARK.coasterNodes`).
- **Subirse**: `findRideSpot` (a < 1,9 m de `boardAt`, juego vivo) → «🎠 Subir» → `boardRide`; `updateRideOn` pega al Nexus al `seat()` del juego; «Bajar» → `leaveRide` (la montaña rusa termina sola al dar la vuelta). `WorldMode.onRide` da el id. Chispitas `spark-coaster-*` arriba de la vía (solo se alcanzan andando).
- **Objetivo**: `parkStep()` en el distrito parque (también dentro del Mundo Voltio). Tita: `titaText()`.
- **Casa de los espejos**: puerta (25,5, −55,5), interior `World.espejos` (x = 800): `espejos-source → espejos-bola` (túnel `espejos`).
- **keepVivid**: los materiales `toonUnique` (marcados `userData.unique`) se modifican en el lugar en vez de copiarse; así las referencias guardadas por cada clase siguen siendo las que se ven.

### Estación y tren (Decisión 050, Fase 7)

- **Región** `STATION_REGION` (x 52…94, z 38…62) + `STATION_CORRIDOR` (x 44…53, z 42,5…48,5) desde el canal sur. Distrito `estacion` abierto.
- **Tren** `station-train` (`objects/train.ts`) en (82, 41), mira a +X; su largo va de x 71 a 85 (`distanceFrom` rectangular, rect de colisión sobre la vía). Fuente `station-source` (60, 48,5). Regla con túnel `via` y `available: train.unlocked` (flag `train-open`; nodos `STATION.nodes`).
- **Paradas** (`TRAIN_STOPS` en `world/Station.ts`): centro (−7,5, −7,5), skatepark (64, 8,6), parque (8, −55), estación (72, 44,5); cerro y puerto tienen `need` y se construyen cuando su distrito está abierto. `nearStop()` (< 1,9 m) → botón «🚂 Viajar» → `cb.travel()` → `#travelPop` (main.ts `showTravel`) → `world.travelTo(id)` (fundido con `crossDoor`, flag `train-<id>`; 4 paradas → `train-tour`). `world.trainAwake`/`trainStops` para la interfaz.
- **Nora** (`STATION.nora`, look `conductor`), texto `noraText()`, objetivo `stationStep()`. Rielito se rescata en (88, 58).
- `tunnelPlanFor` usa una tabla objeto → tema (plaza, fountain, beacon, bridge, skate, casa, helado, cartas, taller, faroles, fiesta, feria, montana, espejos, via; si no, garden).

### Coordenadas del barrio (metros; +X este, +Z sur; suelo y = 0)
- Límites ±45. Calle este-oeste en z = 0 y calle norte-sur en x = 0 (termina en el canal). Canal: z de 30 a 36. Puente en x = 18.
- Inicio del Nexus: (-20, -11).
- Zona 1: fuente (-24, -15), farola (-13, -18), casa (-18, -31) con puerta en (-15.5, -26.95), fragmento (-15.5, 1, -24.2). **Secreto**: (-18, 1, -39.6), detrás de la casa.
- Zona 2: fuente (-28.5, 9.5), fuente de agua (-20, 16), fragmento (-20, 1, 20.4).
- Zona 3: fuente A (15, -23), fuente B (15, -13), señuelo (21, -18), antena (27, -18), fragmento (30.5, 1, -15.2).
- Zona 4: fuente (10.5, 23.5), palanca (15.6, 27.9), tablero del puente z 29.3 → 36.7, fragmento (18, 1, 40.5).
- Zona 5 (jardín, rectángulo x −26..4, z 47..61.5; el límite sur del barrio se extiende a z = 63): fuente (1.6, 50.6) junto a la entrada este, aspersor (−5.6, 54.2), cantero (−13, 54), fragmento (−13, 1, 58.2) — el cantero ocupa x −16.7..−9.3, z 52.3..55.7 y su distancia se mide al rectángulo (`distanceFrom`), Goteo (−1.6, 55.6), glorieta (−20.5, 57.5), bebedero (−20.5, 50.2). Entradas: norte x −3.2..1.2, este z 50.4..53.2. Círculo de vida del jardín: centro (−11, 54), radio 16. Valores exactos en `WorldMode.ts`/`World.ts`.

### 5. Reglas que no hay que romper sin preguntar

1. **Toda mecánica nueva reutiliza la acción de conectar.** Variar el ritmo (secuencia, doble conexión, bloqueo físico, timing), no agregar botones ni acciones.
2. **El mundo se arma con primitivas de Three.js** (cajas, esferas, cápsulas, extrusiones) con el material toon y contorno — sin modelos 3D, imágenes ni audio externos, salvo que el usuario lo pida. (Las únicas cosas externas: las tipografías de Google Fonts para la UI.)
3. Nada de combate, inventario complejo, economía, multijugador ni login.
4. **No ampliar el alcance sin aprobación explícita.** Se avanza de a un paso chico, se prueba, y se pregunta antes del siguiente.
5. Pensar siempre en celular (vertical incluido) y en un niño de 9 años con TDAH: poco texto, feedback inmediato, nada frustrante.
6. No usar nada de *Regreso al Futuro* (regla heredada de Calle 85).

Registro completo de decisiones: `DECISIONS.md` (las del 3D son 033–050).

### 6. Trampas técnicas ya conocidas (no repetirlas)

**3D**
1. **Sin GPU (navegador headless) el juego corre a ~2 fps.** Para probar lógica usar `window.__nexus3d.step(segundos)`, que avanza el juego a 60 Hz sin dibujar; para capturas esperar ~1.3 s a que se dibuje un cuadro. El rendimiento real no se midió en una GPU de verdad.
   **Definición (nitidez):** se dibuja a la resolución real de la pantalla (hasta 2×, `Renderer.dpr`), el Kuwahara es de radio 2 (25 lecturas) con paso ~0.8 px de pantalla y se le devuelve 35 % de la imagen nítida + una máscara de enfoque suave, las texturas de pincel tienen filtrado anisótropo y la sombra del sol (2048) cubre solo lo que muestra la cámara (`World.setShadowSpan`). `Renderer.adapt()` baja la resolución de a 0.25 (mínimo 1×) si el equipo no llega a ~45 fps y la sube si va sobrado; está desactivado con `navigator.webdriver` (pruebas), así que las capturas de prueba salen a resolución completa.
2. **Escenografía agrupada (`batchStatic`)**: al final de `new World()` todo lo quieto se fusiona por material y por celda de 24 m. Lo que se anima o cambia de material después debe tener `userData.dynamic = true` (o agregarse después, como los objetos conectables). Cambiar el color de un material agrupado cambia todas sus piezas: para lo que cambia de color usar `toonUnique()`.
3. `toon()` y `flat()` devuelven materiales **compartidos** (cacheados): nunca mutarlos.
4. **Color**: Three r187 usa luces físicas (intensidades ~π veces las "viejas") y trabaja en lineal; el post-proceso convierte a sRGB a mano. Un `ShaderMaterial` propio que dibuja la escena (cielo, túnel) tiene que devolver color **lineal** (`pow(c, 2.2)`).
5. La cámara isométrica mira desde +X+Z: las fachadas importantes (puertas, carteles) tienen que mirar a +Z o +X, si no se ven de espaldas. Lo alto cerca del borde sur de una zona la tapa (por eso los postes van del lado sur de la calle).
6. `tsconfig` tiene `erasableSyntaxOnly`: nada de `enum` ni propiedades en el constructor (`constructor(readonly x)`).
7. Durante pruebas con Playwright, editar `index.html` hace que Vite recargue la página.
8. Las tipografías de Google fallan en el sandbox de pruebas (certificado); en un dispositivo real cargan bien.
9. **Lo que se muestra en el túnel** (joystick, botón) usa la clase `play-only`, no `world-only`: si no, en el celular no hay control dentro del túnel.
10. **Objetos grandes** (como el cantero) se alcanzan por su borde, no por su centro: sobrescribir `distanceFrom(x, z)` en `Connectable` y usar `collideRadius = 0` + un rectángulo en `WorldMode` para chocar.
11. **Texto sobre objetos 3D**: usar HTML proyectado (`makeLabels`/`updateLabels`); los sprites de texto quedan ilegibles con el Kuwahara.
12. En la vista isométrica, un árbol al sureste de un objeto lo tapa: usar arbustos bajos en esos lugares.

**Heredadas del 2D (siguen valiendo para la UI)**
9. Botones: elementos simples, sin contenedores con hijos interactivos raros; en el 3D la UI es HTML.
10. CSS: `100dvh` con `100vh` de respaldo; respetar `env(safe-area-inset-*)`.
11. Detectar celular con `matchMedia('(pointer: coarse)')`, no por ancho de ventana.

### Qué sigue en el 3D

> **Fases 0 a 7 hechas (Decisiones 043–050). Sigue la Fase 8: Cerro y cascada (subida, mirador, tirolesa larga y cueva oscura).**
> **El rumbo completo está en `PLAN_MAESTRO.md`** (aprobado el 2026-11-05): historia de la Gran Chispa, Mundo Voltio, distritos nuevos, edificios con interior, patineta, cartas de Chispis, sistema de interfaz y fases 0–9. Lo de abajo queda como referencia histórica.


1. **Probarlo en el celular de Luca** y medir si va fluido; si no, bajar el filtro de pincel o las sombras en celular.
2. **Pasar al 3D lo que ya existe en la 2D**, de a una pieza y en este orden sugerido (los vecinos Miga, Bombo, Vera y Don Paso ya están): ~~zona 5 (jardín) con Goteo~~ (hecho), zona 6 (taller) con Pipa, zona 7 (faroles + fiesta/confeti y final) con Lucio, objetivo del capítulo y pistas/ayudas visuales, efectos suaves, radio CUAC FM, armario del Nexus, historias secundarias. La lógica y los textos están en `src/data/*` y `src/scenes/*` de la 2D: reutilizarlos en vez de reescribirlos.
3. Después, las ideas nuevas del backlog (criatura que sigue al Nexus, objeto en movimiento, energía compartida, cable largo entre zonas).
4. Decidir con Luca la cámara final (isométrica o detrás).

### Forma de trabajo

- Pasos chicos: proponer → el usuario aprueba → implementar → `npm run build` → `npm test` → probar jugando → actualizar docs → commit.
- El usuario maneja los PR y merges a mano; las ramas de trabajo salen de la rama por defecto `claude/los-nexus-game-mvp-cppkef`.
- Idioma: español (código en inglés, comentarios y textos del juego en español).

---

## Versión 2D completa (`2d.html`)

Lo que sigue es la documentación de la versión 2D en Phaser, tal como quedó antes del paso a 3D. Todo sigue funcionando en `2d.html` (las pruebas E2E de la 2D abren esa página).

### Guía de la versión 2D

Este archivo existe para que una sesión nueva de Claude Code entienda el proyecto en segundos, sin tener que releer todo el historial de conversación. Léelo primero.

## Qué es esto

Juego web 2D hecho con **Phaser 3 (v4 instalado) + TypeScript + Vite**, construido junto a Luca (9 años, TDAH) como ejercicio creativo padre-hijo. No es comercial. Ver `GAME_VISION.md` para la visión completa del proyecto (público, pilares de diseño, filosofía).

**Mecánica única:** el jugador controla al Nexus y **conecta** objetos del escenario entre sí con un cable de energía (clic/toque en origen, luego en destino). Esa es la única acción de juego — nada de combate, inventario o economía. Ver `DECISIONS.md` para el registro completo de decisiones y por qué.

El capítulo está en `CHAPTER_ONE.md`; ampliación actual en `ADVENTURE_EXPANSION.md`; orden de ramas en `BRANCH_STACK.md`.

## Estado actual (no es solo el MVP 0.0 original)

El MVP 0.0 original (`MVP_SCOPE.md`) se completó y se probó con Luca en varias rondas. Desde entonces el proyecto avanzó bastante más allá de ese alcance inicial, con aprobación explícita del usuario en cada paso. Estado real hoy:

- **Historias secundarias**: «Diario» en el mundo abre correo, inspección del pato y concierto de flores según el lugar restaurado. 16 cables adicionales y seis desenlaces; avance parcial y álbum guardados. «Repetir» borra únicamente conexiones `side-<historia>-`, conserva barrio/álbum y estilos ganados. Las propuestas son únicas por pasada; repetir permite cambiar. Las dos pruebas del pato y las dos señales del concierto necesitan grupos diferentes. `saveExclusiveConnection` cambia solo destinos del grupo y conserva las otras ramas de la fuente. Recompensas de apariencia: ámbar, pato y corona; 100 combinaciones al ganarlas. No bloquean la fiesta.
- **Consecuencias y secretos**: el agua de la fuente hace brotar flores en la plaza y la antena publica CUAC FM en la casa. Tres parejas inválidas muestran bromas específicas; se guardan como descubrimientos únicos sin resolver puzzles. Volver a Miga tras reparar la fuente descubre otra frase.
- **Desenlace y exploración**: el cable escenario→confeti cierra el capítulo con una pantalla de resultados y créditos. Permite seguir explorando o visitar el museo; «Ver final» en el museo permite releerlo. `story.chapterSeen` evita repetir la celebración al continuar. Los habitantes tienen epílogos, y álbum/habitantes/sorpresas son objetivos opcionales. Validación y protocolo de duración en `PLAYTEST_CHAPTER_ONE.md`.
- **Capítulo 1 — La ciudad al revés**: Miga, Bombo, Vera, Don Paso, Alcalde Goteo, Pipa y Lucio dan encargos breves para preparar una fiesta. Las frases aparecen al acercarse por primera vez o tocar al habitante, se cierran al tocar el recuadro y no pausan el movimiento. Se guardan las visitas; el objetivo considera conexiones parciales y recuerdos antiguos.
- **7 zonas jugables** en un mundo de scroll horizontal de 6100px de ancho (no una sola pantalla):
  1. **La plaza**: fuente → lámpara → puerta (dos cables y el mini-túnel del primero).
  2. **La fuente de agua**: fuente → fuente de agua (puzzle de un solo paso).
  3. **La antena**: dos fuentes → una antena (necesita **dos** conexiones simultáneas).
  4. **El puente**: un interruptor revela un puente sobre una grieta que **físicamente bloquea el paso** hasta conectarlo (única zona con barrera real de colisión).
  5. **El jardín**: fuente de energía → aspersor → flores. El aspersor solo puede iniciar el segundo cable una vez encendido; las flores transforman el parterre y revelan un quinto fragmento, al otro lado del puente.
  6. **El taller**: energía → motor; motor → pato y campana; ambos → desfile. Dos ramas en cualquier orden y reunión de dos entradas distintas.
  7. **Los faroles**: luz por una ruta directa o curiosa hacia la misma salida. La curiosa descubre al farol tímido. Salida → escenario → confeti necesita todos los preparativos anteriores, sin exigir recoger los recuerdos.
- **Personaje con sprites reales** (Decisión 017): el Nexus ya no se dibuja con formas de Phaser — son cuatro poses de lápiz en `public/assets/sketch/nexus.webp` (idle, dos pasos alternos, celebrar), cargadas por `loadNexusAssets()` y extraídas en `BootScene.create()`. Personalización en `CustomizeScene`: nombre, paletas de ropa/mochila, accesorios y color del cable; sus preferencias y desbloqueos viven en `los-nexus-appearance` separados de la aventura. El diseño base se conserva: orejas tipo conejo con puntas de color, cabeza clara con cara negra y ojos ovalados amarillos, hoodie turquesa, mochila con cable de energía colgando. Los prompts usados están en `ART_PROMPTS.md` por si hay que generar más poses o variantes.
- **Museo** con 7 vitrinas (dos columnas y cuatro filas en vertical, ilustraciones compactas y última centrada; una fila en horizontal), recuerdos distintos por zona (luz, gota, antena, puente, flor, pato y farol) que reaccionan al toque con un mensaje y un pulso breve, botón táctil «Volver al mundo» y atajo ESPACIO para regresar, mensaje de "Colección completa" y celebración especial (flash + chispas en las 7 zonas) la primera vez que se completa la colección actual. Mundo y museo comparten la lista `src/data/collection.ts`.
- **Controles duales**: teclado/mouse en desktop, joystick virtual táctil + **botón de interacción** (aparece al acercarse a un objeto conectable, evita tener que acertar el toque exacto sobre algo pequeño).
- **Adaptación real a móvil vertical**: la resolución interna del juego cambia (960×540 landscape ↔ 540×960 portrait) según orientación + tipo de puntero, para llenar la pantalla en vez de dejar barras negras. Ver `src/config/gameConfig.ts`.
- **Sonido**: tonos generados por código (Web Audio, sin archivos de audio) para conectar/error/recolectar, con botón de mute/unmute (🔊/🔇, esquina superior izquierda de `WorldScene`) que persiste en `localStorage`.
- **Animaciones del Nexus**: idle, caminar, conectar (implícito en el cable), celebrar (salto + chispas al recoger fragmentos).
- **Encargos de regreso**: música de CUAC FM + jardín restaurado habilita aspersor→escenario de flores; noticias + plaza restaurada habilita lámpara→cartel de Miga. Ambos son opcionales, dan una sorpresa y una reacción local, sin añadir recuerdos. Los proyectos terminados permanecen resueltos al cambiar de emisión; `restoreAvailable` conserva esa diferencia entre requisito inicial y restauración. «Pista» prioriza un encargo de regreso disponible y cercano.
- **Radio reversible**: después de completar la antena, CUAC FM permite elegir música al jardín o noticias a la plaza. Conectar el otro receptor sustituye el destino y apaga el anterior; no afecta preparativos ni recuerdos. `ConnectionRule.exclusiveGroup` mantiene una sola elección activa; el guardado sustituye los cables de esa fuente dedicada.
- **Pistas a petición**: «Pista» ofrece tres niveles según el preparativo pendiente; se reinicia al cambiar de tarea y no pausa el movimiento. Los encargos describen problemas; solo la enseñanza del primer cable da instrucciones directas.
- **Ayudas visuales**: tras diez segundos sin interacción, un aro discreto señala un origen pendiente de la zona visible; si hay origen seleccionado, señala un destino válido visible. Desaparece al interactuar o completar y no marca puzzles resueltos. Al volver del túnel se reinicia la espera.
- **Efectos suaves**: opción en el título que suprime flashes/sacudidas de cámara y deja las pistas estáticas y suprime el pulso de los recuerdos y el crecimiento animado de las flores. Sigue por defecto `prefers-reduced-motion`; una elección explícita se guarda en `los-nexus-reduced-effects`, independiente del progreso y de «Nueva partida». No cambia dificultad, recompensas ni controles.
- **Progreso persistente** en `localStorage`: fragmentos, celebración final (y tamaño de la colección completada), conexiones resueltas (incluida la antena parcial) y posición del Nexus. La posición Y se guarda como proporción de la altura para conservar el lugar al rotar. Se guarda cada 500 ms si cambió y al ocultar/salir/pausar el mundo; volver del museo recupera el lugar. Las partidas antiguas siguen funcionando: una celebración anterior sin `completionCount` corresponde a cuatro recuerdos, y completar el quinto permite una nueva celebración, una sola vez. «Nueva partida» borra todo ese progreso.
- **Pantalla de título** (`BootScene`): "Jugar" si no hay progreso guardado, o "Continuar" + "Nueva partida" si ya hay fragmentos recolectados — las tres van directo a `WorldScene` (el armario se abre con «Mi Nexus»).
- **Dirección moderna**: `MODERN_VISUAL_PILOT.md` registra la muestra y `MODERN_ART_DIRECTION.md` su extensión completa. `modernArt.ts` centraliza paleta, superficies planas, portada y los siete distritos con fachadas por planos, vegetación facetada, losas grandes y hitos propios. `interfaceArt.ts` comparte tipografía sin serif, fondos azul/violeta horneados por tamaño, tarjetas oscuras y emblemas. Armario, diario, encargos, museo, final, túnel, HUD y diálogos usan el mismo lenguaje. Los objetos conectables conservan siluetas y estados con materiales azules y luz cian/amarilla. El río conserva su ancho y posición físicos. Los fondos se reutilizan al regresar; no hay nuevas funciones, assets externos ni animaciones obligatorias. Nexus conserva sprites, poses y estilos. `ART_DIRECTION.md` documenta el acabado editorial anterior, sustituido por la dirección moderna.
- **Pulido visual**: transiciones de fade in/out entre las 5 escenas (`src/utils/sceneTransition.ts`), fondo con parallax en `WorldScene` (nubes + dos capas de colinas con distinto `scrollFactor`), cable de conexión dibujado como curva bezier con una chispa que lo recorre al conectar válido, e indicador `★ n/7` fijo en el HUD del mundo que se actualiza al recolectar cada fragmento.
- **Realismo**: movimiento del Nexus con aceleración/desaceleración gradual (no velocidad instantánea), sombras de piso en todos los objetos interactivos y decoración estática, viento sutil en el árbol y mariposas cruzando el mundo.
- **Mini-túnel del cable** (idea de Luca, `CableTunnelScene`): la conexión fuente→lámpara de la plaza, en vez de resolverse al toque, abre un mini-juego con perspectiva tipo Mario Kart — anillos concéntricos que se agrandan al acercarse (efecto vórtex dibujado con `Graphics`, sin assets), la chispa vista desde atrás/abajo, y control libre en 2D (flechas/WASD, las 4 direcciones, o el mismo joystick táctil que en `WorldScene`) para esquivar las paredes del tubo mientras serpentea. Al entrar ofrece práctica sin avanzar ni perder y botón «Empezar». Perder muestra «Reintentar» (reinicia directamente el mismo túnel) y «Volver al mundo»; ganar completa la conexión normalmente. ESPACIO empieza/reintenta y ESC vuelve desde práctica o fallo. La dificultad queda pendiente de validar con Luca. Ver Decisión 016. Por ahora solo esa conexión lo usa — el resto sigue resolviéndose al toque directo.

Todo esto se probó jugando de verdad (no solo `npm run build`) usando Playwright headless para simular clics/toques y tomar capturas de pantalla, además de pruebas reales en el celular de Luca que revelaron bugs que el simulador no mostraba.

## Cómo correr y probar

```bash
npm install
npm run dev      # servidor de desarrollo (localhost:5173)
npm run dev -- --host   # para probar desde el celular en la misma red WiFi
npm run build     # build de producción — SIEMPRE correr esto después de cualquier cambio
```

Hay una suite automatizada: `npm run test:unit` verifica el guardado y `npm run test:e2e` prueba el recorrido en Chromium para escritorio y móvil vertical. `npm test` ejecuta ambas. Usar Node 24+ y preparar Chromium con `npx playwright install chromium`, o configurar `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` si ya está instalado. Ver `tests/README.md` para cobertura, fixtures y limitaciones.

Después de cambios:
1. `npm run build` (debe terminar sin errores).
2. `npm test` (18 pruebas unitarias y 44 escenarios E2E). Playwright inicia su propio Vite en el puerto 5174.
3. Revisar las capturas adjuntas en `test-results/` y el informe en `playwright-report/`; los fallos conservan trazas.
4. La prueba en dispositivo real con Luca sigue siendo necesaria para validar comodidad y dificultad.

Ver la sección "Bugs reales encontrados" más abajo antes de asumir que algo raro en una prueba es un bug del juego — varias veces resultó ser imprecisión del script de prueba (el Nexus no estaba lo bastante cerca en el eje Y, por ejemplo), no un problema real.

## Arquitectura (carpetas reales, no las "próximamente" del README viejo)

```
src/
  main.ts                    — entrada, crea el Phaser.Game, recarga si cambia orientación
  config/gameConfig.ts       — resolución dinámica según orientación/puntero
  scenes/
    JournalScene.ts          — encargos, requisitos y álbum de desenlaces
    SideStoryScene.ts        — salas de conexiones, restauración y repetición
    CustomizeScene.ts        — armario, preview, guardar/cancelar y nombre
    BootScene.ts             — pantalla de título: "Jugar"/"Continuar" según haya progreso guardado, precarga los sprites del Nexus
    WorldScene.ts            — el mundo completo, las 7 zonas, cámara, joystick, botón de interacción
    MuseumScene.ts           — vitrinas de fragmentos
    EndingScene.ts           — desenlace y resultados, regreso al barrio/museo
    CableTunnelScene.ts      — mini-túnel dentro del cable (ver Decisión 016), se lanza sobre WorldScene pausada
  art/
    modernArt.ts             — dirección contemporánea: portada, siete distritos y materiales planos
    interfaceArt.ts          — interfaces modernas: fondos, tarjetas, emblemas y tipografía
    neighborhood.ts          — arquitectura, terreno y cielo; texturas estáticas reutilizables
    props.ts                 — juguetes y faroles con materiales y estados
    nexusLook.ts             — paletas de ropa compartidas por poses y adornos procedurales
  entities/
    Nexus.ts                 — el personaje jugable (sprite real + movimiento + celebrar, ver Decisión 017)
    nexusAssets.ts           — claves y cuadros del atlas a lápiz (public/assets/sketch/nexus.webp)
  systems/
    ConnectionSystem.ts      — la mecánica de conectar (seleccionar origen → destino, reglas, cable)
    ProgressSystem.ts        — wrapper de localStorage (fragmentos, seenCompletion)
    AudioSystem.ts           — tonos generados por Web Audio
  objects/
    ConnectableObject.ts     — clase base abstracta de todo lo conectable
    EnergySource.ts, Lamp.ts, Door.ts, Fountain.ts, Beacon.ts, Bridge.ts, Sprinkler.ts, FlowerBed.ts, Fragment.ts
  zones/
    WorkshopZone.ts, LanternZone.ts, RadioStation.ts, ReturnCircuits.ts — circuitos modulares de las zonas nuevas
  ui/
    VirtualJoystick.ts       — joystick táctil
    StoryCard.ts             — frases que no bloquean los controles
    InteractButton.ts        — botón fijo de interacción por proximidad (¡NO usar Container, ver abajo!)
  data/
    appearance.ts            — aspecto y desbloqueos persistentes separados de la aventura
    sideStories.ts           — historias, máquinas, reglas y desenlaces
    collection.ts            — recuerdos y tamaño de la colección actual
    gameState.ts             — shape del estado guardado + carga/guardado con merge seguro
  utils/
    sceneTransition.ts       — fadeToScene(): fade out + scene.start(), usado por las 5 escenas
  styles/main.css
```

## Decisiones de diseño que no romper sin preguntar

Ver `DECISIONS.md` para la lista completa. Las más importantes:
- **Toda mecánica nueva debe reutilizar la acción de conectar** (Decisión 008). La antena (doble conexión) y el puente (bloqueo físico) son ejemplos de cómo variar el ritmo sin salirse de esto.
- La dirección vigente es **cuaderno a lápiz** (Decisión 033, `SKETCH_ART_DIRECTION.md`). El usuario autorizó expresamente sustituir todos los personajes, accesorios, barrios, objetos e interfaces con la referencia aportada. Los WebP están en `public/assets/sketch/`; la muestra 032 y el acabado moderno quedaron sustituidos. No introducir mecánicas nuevas al cambiar el arte.
- No agregar combate, inventario complejo, economía, multijugador, login (Decisión 006).
- No ampliar el alcance sin que el usuario lo pida explícitamente.

## Gotchas / bugs reales ya encontrados y arreglados (no los repitas)

1. **`Phaser.GameObjects.Container` con hijos interactivos es poco confiable para botones de UI**: el primer clic funciona, los siguientes no se registran. `InteractButton` se reescribió usando objetos de escena planos (rectángulo + texto sueltos, sin Container) — igual que los botones de `BootScene`, que siempre funcionaron bien. Si agregás un botón nuevo, seguí ese patrón (sin Container).
2. **`StaticBody.updateFromGameObject()` no funciona con `Container`**: llama a `gameObject.getTopLeft()`, que `Container` no implementa. Si necesitás mover un cuerpo físico estático cada frame (ej. un objeto que flota), actualizá `body.x`/`body.y` manualmente en vez de usar ese método.
3. **Objetos de texto/gráficos de UI necesitan `setScrollFactor(0)` explícito**, incluso si están dentro de un sistema que ya parece "fijo en pantalla". El texto de feedback de `ConnectionSystem` quedó invisible en la zona 2 por esto — se posicionaba en coordenadas de mundo y la cámara lo dejaba fuera de vista al hacer scroll.
4. **`100vh` en CSS no es confiable en navegadores móviles** (la barra de direcciones ocupa espacio variable). Se usa `100dvh` con `100vh` como respaldo. Además, ningún elemento de UI importante (como el botón "Jugar") debería depender de estar pegado al borde inferior de la pantalla — mejor calcularlo relativo al contenido de arriba.
5. **`window.matchMedia('(orientation: portrait) and (pointer: coarse)')`** es la forma de distinguir un celular real en vertical de una ventana de escritorio angosta (que tiene `pointer: fine`). No uses solo el ancho de la ventana para esa detección.
6. **Cuidado al probar con Playwright**: mover al Nexus solo en un eje (por ejemplo solo `ArrowRight`) y luego hacer clic en el botón de interacción puede fallar si el objetivo está a más de 90px en el otro eje (el radio de interacción es circular, no solo horizontal). Varias veces esto se confundió con un bug real cuando en realidad era el script de prueba. Siempre mover en diagonal (mantener dos teclas) para acercarse de verdad, o usar clics directos con coordenadas ya validadas en este documento/commits anteriores.
7. **Patrón para mini-juegos que se abren "sobre" `WorldScene`** (como `CableTunnelScene`): `this.scene.launch('OtraEscena', data)` + `this.scene.pause()` desde `WorldScene`, y al terminar la escena hija hace `this.scene.stop()` + `this.scene.resume('WorldScene', resultado)`. `WorldScene` escucha su propio evento `'resume'` (`this.events.on('resume', (sys, data) => ...)`) para recibir el resultado. Pausar la escena para el input/física del Nexus automáticamente sin código extra.
8. **Registro de los atlas de ilustración**: conservar alfa y márgenes transparentes. `gridFrames` registra los límites de cada silueta mediante metadatos de cuadro, sin modificar el archivo fuente; las parejas apagado/encendido usan los límites comunes de ambas para que no cambie el tamaño de la máquina al activar el agua o la luz. Escalar por la altura del cuadro conserva proporciones; las poses del Nexus usan sus cuatro celdas registradas. La conversión a WebP de sprites es sin pérdida.

9. **Áreas interactivas de `Container`**: Phaser suma `displayOriginX/Y` (la mitad del tamaño) antes de comprobar el hit area. No pasar directamente rectángulos con coordenadas de dibujo centradas en cero: desplaza el área hacia arriba/izquierda. Para un objeto de 52×52 con área local centrada, usar `Rectangle(0, 0, 52, 52)`. Las pruebas del recorrido encontraron que tocar el centro del interruptor del puente no funcionaba por esta diferencia; se corrigieron las áreas de los seis objetos conectables.

10. **Listeners de escena al volver del museo**: los eventos propios de `WorldScene` deben desregistrarse en shutdown. Si se vuelven a registrar en cada create sin limpieza, una conexión dispara callbacks duplicados y el puente puede intentar destruir dos veces su collider. La retirada de la barrera también es idempotente para partidas antiguas con puente ya restaurado.

11. **Pausar una escena no oculta su render**: el barrio se oculta explícitamente al lanzar el túnel opaco y se muestra al recibir `resume`, incluso cuando se cancela sin resultado. Conservar ambas partes para evitar dibujar dos escenarios o volver a un mundo invisible.

## Coordenadas de referencia del mundo (para pruebas o debug futuro)

`WORLD_WIDTH = 6100`, altura del mundo = `this.scale.height` (540 en landscape, 960 en portrait). `midY = height / 2`. Con `vScale = height / 540` (1 en landscape) multiplicando los desplazamientos verticales:

- Zona 1 (plaza): fuente `(480, midY+65·v)`, lámpara `(680, midY+70·v)`, puerta `(980, midY+35·v)`, fragmento `(980, midY+90·v)`.
- Zona 2 (fuente de agua): fuente `(1300, midY-40·v)`, fuente de agua `(1460, midY+40·v)`, fragmento `(1460, midY-60·v)`.
- Zona 3 (antena): fuente A `(1980, midY-80·v)`, fuente B `(1980, midY+80·v)`, antena `(2220, midY)`, fragmento `(2220, midY-90·v)`.
- Zona 4 (puente): fuente `(2500, midY-40·v)`, interruptor `(2560, midY)`, grieta centrada en `x=2610` (ancho 100), fragmento `(2820, midY-40·v)`.
- Zona 5 (jardín): fuente `(3150, midY-40·v)`, aspersor `(3310, midY+10·v)`, flores `(3500, midY+40·v)`, fragmento `(3500, midY-85·v)`.

- Zona 6 (taller): fuente x=3950, motor x=4110, pato/campana x=4290, desfile/fragmento x=4490. Implementación modular en `src/zones/WorkshopZone.ts`.

- Zona 7 (faroles): fuente x=4870; inicio x=5030; directo x=5210; curiosos x=5150/5320; salida/fragmento x=5410; escenario x=5600; confeti x=5780. Implementación en `src/zones/LanternZone.ts`.

El Nexus arranca en `(550, midY+100·v)`. La cámara sigue al Nexus con `startFollow(nexus, true, 0.12, 0.12)` y límites `(0,0,WORLD_WIDTH,height)`.

## Cómo seguir trabajando

1. Leé este archivo, `GAME_VISION.md`, `MVP_SCOPE.md`, `DECISIONS.md` e `IDEAS.md`.
2. Este es un proyecto que sigue creciendo, no una lista para "terminar". `IDEAS.md` es el backlog vivo: agregá ahí las ideas que surjan aunque no se implementen todavía, y borrá la línea cuando se implemente una.
3. Antes de proponer algo nuevo, preguntate si reutiliza la acción de conectar (Decisión 008) y si el usuario lo pidió o aprobó.
4. Después de cualquier cambio: `npm run build` sin errores, y probar de verdad jugando (Playwright headless + screenshots como mínimo; el usuario prueba en dispositivo real por su cuenta).
5. Documentar en `DECISIONS.md` si es una decisión de diseño nueva, y actualizar este archivo si cambia la arquitectura o aparece un gotcha nuevo.
6. El usuario maneja los PR y merges a mano — vos trabajás en una rama y hacés commit, no hace falta abrir PR salvo que te lo pidan explícitamente.


## Cambios de la base conservados al sincronizar ramas
Además de esta fase, se conservan la fuente señuelo gris de la antena
(`beacon-source-fake`, variante `dim`), las partículas variadas y el anillo
al conectar, y el fragmento secreto al oeste (`secret-fragment`, x=140).
El secreto tiene una vitrina propia; no incrementa el contador de recuerdos
de zona ni el requisito de colección completa. El museo conserva adaptación
táctil y vertical. Los efectos nuevos respetan la opción de efectos suaves.
`CONTEXTO.md` refleja el estado de esta rama para continuar con otras IAs.

Las pruebas de integración verifican que el secreto no cuenta como recuerdo
de zona, no reaparece al cargar y tiene vitrina; el señuelo sigue sin reglas.
El museo muestra ocho vitrinas: siete de zona y una secreta. Ver `MERGE_ORDER.md`.

## Muestra de la plaza en curso (Decisión 032)
`plazaGuide.ts` deriva seis pasos del progreso real y del origen seleccionado;
`PlazaGuide` muestra instrucción persistente y flecha (también en el borde si
el destino está fuera de pantalla). No hay campos nuevos de guardado ni bloqueos.
Miga está en x=350, midY+70·v, cerca del inicio. El usuario autorizó ampliar
los assets originales al escenario, objetos y fauna de esta muestra de la plaza.
Las zonas restantes conservan el arte anterior hasta que el usuario la pruebe.
`BootScene` precarga `art/plazaAssets.ts`: fondo WebP y dos atlas transparentes
3×2 (celdas de 512). Solo se sustituye la plaza x=0..1160; los cuerpos de
input y progreso siguen separados del arte. Fuente (480,midY+65·v), lámpara
(680,midY+70·v), puerta (980,midY+35·v), recuerdo (980,midY+90·v).
Estas coordenadas sustituyen las referencias históricas de la primera zona.
`PlazaAtmosphere` añade fauna con dos poses, plantas con resorte amortiguado,
cables persistentes de la plaza y luz de suelo. No tiene cuerpos ni input
interactivo; sus listeners se limpian al cerrar la escena. `stepSpring` limita
el delta y usa subpasos para sobrevivir a pestañas suspendidas. Efectos suaves
mantiene plantas/aves quietas y cables visibles. El inicio ahora es x=550,
midY+100·v; el botón de interacción conserva el centro en móvil y se sitúa
abajo a la derecha en escritorio. La profundidad se ordena por los pies solo
para Nexus y los tres objetos de la plaza. El resto del mundo conserva su arte.

## Dirección de arte vigente — bosquejo completo

El usuario pidió en esta fase extender su referencia de lápiz a **todo** el juego.
Ver `SKETCH_ART_DIRECTION.md`, `SKETCH_PLAYTEST.md` y Decisión 033.
Fuentes locales; sprites con alfa; ocho fondos de alta resolución; todas las UI
en papel y grafito. Las funciones y los guardados se conservan. Tres ramas nuevas
anidadas después de `codex/plaza-entorno-vivo`; el usuario sigue haciendo PR y merge.

## Plaza: suelo y respuesta de conexiones

`utils/walkableGround.ts` define el borde posterior transitable en coordenadas de los pies. `WorldScene` limita también las posiciones antiguas guardadas y usa huellas físicas para los tres objetos de la plaza. El cuerpo físico del Nexus representa sus pies, no el torso. La profundidad de conectables, habitantes y personaje se calcula por su base. Al cambiar la geometría, ejecutar el recorrido completo caminando en ambos proyectos, además de `plaza-polish.spec.js` y `plaza-guide.spec.js`.

Las conexiones muestran una selección y destinos disponibles, y la plaza explica el relé de la lámpara y el cierre eléctrico. `ConnectionSystem` limpia feedback y temporizadores anteriores; cancelar el túnel debe liberar también su estado pendiente. `ConnectableObject` sincroniza el dibujo solo cuando cambia el estado visible. La sombra permanece fuera del contenedor animado del Nexus.

## Paseo del Agua y poses direccionales

Ver Decisión 035 y `WATER_CIRCUIT_PLAYTEST.md`. `zones/WaterZone.ts` agrupa cinco
objetos y tres pasos: generador x1230 → bomba x1350 → válvula x1490 → fuente x1630.
Directa está en .48 de la altura; reguladora en .72; la fuente en .61. Recuerdo
x1630,.80; Bombo x1720. `waterCircuit.ts` normaliza conexiones antiguas al restaurar
sin escribir el guardado, y distingue logros antiguos de rutas modernas parciales.
Los grupos exclusivos invalidan las dos salidas al cambiar de válvula. Al guardar
una elección desde la bomba se incluye su alimentación, también en partidas antiguas.

`WaterMachine` usa el atlas alfa 3×1 y conectores separados; `Fountain.setFlow`
cambia presión y gotas. Radio: origen x1850,.70; receptores x2020/x2190,.87, fuera
de la fuente. `groundTop` incluye el pavimento del paseo; sus máquinas tienen
huellas estáticas. Diez poses mantienen las claves originales y añaden perfil y
espalda. Las adicionales se registran por casco/base, y la ropa se precalcula al
inicio del mundo; las variantes anteriores se eliminan al cambiar de apariencia. El avance de pasos se calcula con desplazamiento real.
`AudioSystem(scene)` cierra el contexto al shutdown y desconecta voces terminadas.
`VirtualJoystick` limpia listeners al salir y el gesto al pause/blur.

Las áreas interactivas de `EnergySource` y `Fountain` se ampliaron a la silueta
ilustrada; el atlas sustituyó estrellas y círculos mucho menores. La prueba de
agua toca explícitamente el socket lateral y el surtidor alto. Los fixtures
`near()` esperan `game.events.postrender` después de mover la cámara para que
su matriz de entrada coincida con los puntos de clic. Los recorridos de regreso
usan la franja baja del pavimento antes de acercarse a Miga, rodeando las válvulas.
