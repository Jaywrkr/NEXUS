> **Estado: MVP 0.0 completado y probado con Luca.** El proyecto avanzó más allá de este alcance original (4 zonas en vez de 1, personalización con formas, adaptación móvil, botón de interacción). Este documento describe el alcance ORIGINAL del primer MVP, tal como se definió al principio — se conserva como referencia histórica. Para el estado actual del proyecto, ver `CLAUDE.md`.

# MVP 0.0 — Alcance

Duración objetivo: 2 a 5 minutos.

Pregunta que debe responder: **¿Es divertido conectar cosas y ver cómo cambia el mundo?**

## Entra en el MVP

- Un Nexus controlable (formas simples, animaciones mínimas: idle, caminar, conectar, celebrar).
- Una calle o plaza pequeña (una sola pantalla/zona).
- Tres objetos conectables: fuente de energía, lámpara, puerta.
- Cable visual de conexión (ConnectionSystem).
- Un fragmento coleccionable.
- Una sala museo mínima (una habitación, una vitrina, un objeto).
- Guardado de progreso con localStorage.
- Transformación visual del escenario (antes/después).
- Controles: teclado/mouse en desktop; arquitectura preparada para controles táctiles después.

## No entra en el MVP

Combate, enemigos, vida, daño, crafting, economía, tiendas, monedas, vehículos, misiones múltiples, diálogos, NPCs complejos, inventario completo, mapa, árbol de habilidades, clima, ciclo día/noche, mundo abierto, multijugador, login, skins comerciales, pay to win, backend, base de datos, autenticación, cuentas, servidores, compras, anuncios, integraciones externas.

## Flujo completo

1. El Nexus aparece en una zona apagada.
2. El jugador aprende a moverse.
3. Ve una fuente de energía.
4. Conecta la fuente con una lámpara.
5. La lámpara se enciende.
6. La luz revela un símbolo o conexión oculta.
7. El jugador conecta ese punto con una puerta.
8. La puerta se abre.
9. El jugador obtiene un fragmento.
10. Va a una sala sencilla (museo).
11. Coloca el fragmento en una vitrina.
12. Regresa o ve la zona restaurada.
13. Aparecen color, plantas, luz o movimiento.
14. Fin del MVP.

## Criterios de aceptación

- Abre correctamente en navegador.
- El personaje puede moverse.
- El jugador puede apuntar hacia objetos.
- Aparece un cable visual.
- La fuente se conecta con la lámpara.
- La lámpara cambia de estado.
- La puerta puede abrirse mediante una segunda conexión.
- El jugador obtiene un fragmento.
- El fragmento aparece en la vitrina.
- El progreso se guarda con localStorage.
- El escenario cambia visualmente.
- El flujo puede completarse sin leer instrucciones largas.
- El build (`npm run build`) termina sin errores.
- Funciona en una ventana de escritorio.
- La interfaz puede adaptarse a móvil.
- No existen funcionalidades fuera del alcance descrito arriba.

## Fases de trabajo

1. Requisitos, documentos, arquitectura, estructura del proyecto, configuración de Phaser/TS/Vite, build.
2. Escena estática, Nexus provisional, movimiento.
3. ConnectionSystem, conexión fuente–lámpara, cable visual.
4. Puerta, fragmento, museo, guardado de progreso.
5. Transformación visual, mejora de feedback, prueba de flujo completo.

Después de cada fase: ejecutar `npm run build`, corregir errores, resumir lo realizado, indicar archivos modificados, no avanzar si hay bloqueo, no ampliar el alcance.
