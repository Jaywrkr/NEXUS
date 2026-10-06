# Verificación — cuaderno a lápiz

## Entorno y comandos

Node 24, TypeScript/Vite, Phaser y Chromium del entorno en la nube.
`npm run build` y `npm run test:unit` completados; 19 pruebas unitarias aprobadas.

Para las pruebas de navegador en este entorno:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test
```

Para jugar localmente, tras descargar la rama final:

```bash
npm ci
npm run dev
```

Abrir la dirección que muestra Vite. El aspecto completo está en
`codex/bosquejo-interfaces`, descendiente de `codex/bosquejo-mundo`,
`codex/bosquejo-nexus` y la cadena pendiente de la plaza. El usuario hace los
PR/merges; el orden completo está en `BRANCH_STACK.md`.

## Validación visual y funcional

Se revisaron capturas de los siete barrios, portada, armario y museo en
960×540 y 540×960. Todos los fondos son ilustraciones independientes de
1672×941; el encuadre conserva proporciones. Las pruebas comprueban la carga de
la fuente local, los siete fondos cacheados, las ilustraciones de todos los
habitantes y conectables, el estado visual encendido y su reutilización al volver
del museo. Ningún dibujo decorativo captura clics/toques.

Los sprites conservan alfa. Los cuadros se registran por silueta sin modificar
los archivos fuente; máquinas apagadas/encendidas usan límites comunes para que
su base y escala no salten. La revisión corrigió trazos de cuadros vecinos,
vitrinas demasiado pequeñas, etiquetas sobre fondos oscuros y consecuencias que
quedaban debajo de los nuevos paisajes.

Armario, museo y recorrido visual pasaron las comprobaciones específicas. La
batería completa aprobó **48/48 casos** (24 escritorio y 24 móvil; 29,4 minutos),
con un trabajador para mantener estable el ritmo de fotogramas de Chromium.
Incluye movimiento real por todo el capítulo, primeros pasos, ambos caminos de
faroles, túnel, guardado antiguo, rotación, museo, pistas, efectos suaves,
consecuencias, regresos y los seis desenlaces secundarios.

Después se amplió la máscara de recoloración a las mangas levantadas del festejo
sin recolorear los discos azules, y se añadió papel bajo el aviso del concierto
para separarlo del follaje. Compilación y 19 pruebas unitarias volvieron a pasar.
La revisión final específica aprobó **4/4 casos** de armario y regresos
en escritorio y móvil (2,4 minutos), incluyendo capturas de festejo personalizado.
La batería de 48 casos corresponde al cambio completo antes de esos dos retoques;
los cuatro casos finales y las unitarias validan el estado final.

## Revisión con el jugador

Comprobar el Nexus quieto, sus dos pasos y festejo, y sus chaquetas/adornos/cables;
recorrer ambos caminos de faroles; activar fuente, jardín y máquinas con dos
entradas; volver a Miga y Goteo tras cambiar la radio; abrir diario, encargos, museo
y final. Los seis pasos iniciales continúan derivados del progreso y selección.
La duración del recorrido automático usa soluciones conocidas y no mide una
primera partida humana ni las pausas de lectura/exploración.
