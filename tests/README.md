# Pruebas de Los Nexus

## Preparación

Usar Node 24 o superior para las pruebas unitarias de TypeScript nativo y ejecutar:

```bash
npm ci
npx playwright install chromium
```

En Linux, si faltan bibliotecas del navegador, usar la instalación oficial
`npx playwright install --with-deps chromium` con los permisos correspondientes.
Si ya hay un Chromium instalado, no hace falta descargar otro:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test
```

## Comandos

```bash
npm run test:unit    # cuatro pruebas de guardado
npm run test:e2e     # tres escenarios en escritorio y tres en móvil vertical
npm test            # ambas suites
npm run build       # TypeScript y build de producción; check separado
```

Playwright inicia y detiene su propio Vite en el puerto 5174. Ese puerto debe
estar libre; no reutiliza ni detiene un servidor de desarrollo ajeno.
Cada prueba usa un contexto de navegador nuevo con almacenamiento independiente.
No hay retries automáticos ni pruebas omitidas por defecto.

## Cobertura

- Recorrido de las cuatro zonas: conexión inválida, perder y ganar el túnel,
  abrir la puerta, restaurar la fuente, conectar dos fuentes distintas a la
  antena, comprobar la colisión del puente cerrado y cruzarlo al abrirlo.
- Recogida de los cuatro fragmentos mediante overlaps reales, museo parcial y
  completo, distribución móvil, salida táctil/clic/ESPACIO, celebración guardada
  y recuperación de la colección al recargar.
- Continuar antes del primer fragmento, antena parcial, fuentes duplicadas,
  movimiento de teclado/joystick y recuperación de posición. En móvil también
  se gira a horizontal y se comprueba que la posición vertical relativa se conserva.
- Partidas antiguas y confirmación/cancelación de «Nueva partida».
- Serialización, migración, datos malformados y reinicio sin arrays compartidos.

Para leer el estado de Phaser, el harness intercepta la respuesta de Vite de
`src/main.ts` y expone la instancia solo dentro del navegador de pruebas.
No modifica el archivo ni añade accesos de prueba al juego distribuido.
Para reducir el tiempo de desplazamiento entre zonas, coloca al personaje cerca
de los puzzles y fragmentos. Las conexiones usan clics/toques reales, la recogida
usa física real y el túnel se juega con controles; no se llaman los métodos de
completar conexión, recoger fragmento o ganar/perder el túnel.
El piloto automático del túnel observa la posición de la chispa y del tubo para
orientar las entradas, por lo que comprueba el flujo y controles; no sustituye la
prueba de dificultad con Luca ni valida que el puzzle sea intuitivo.

## Resultados

Las capturas de puntos relevantes y los errores se guardan en `test-results/`.
El informe queda en `playwright-report/` y se puede abrir con
`npx playwright show-report`. En caso de fallo se conserva también una traza:
`npx playwright show-trace <ruta-al-trace.zip>`.
Estos directorios están ignorados por Git y se regeneran en cada ejecución.
La suite comprueba errores JavaScript y respuestas HTTP fallidas.

Las pruebas E2E usan el servidor de desarrollo en Chromium. `npm run build`
comprueba el build de producción, pero estas pruebas no ejecutan ese build ni
sustituyen una prueba en el teléfono real de Luca.
