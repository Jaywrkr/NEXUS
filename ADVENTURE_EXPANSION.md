# Más decisiones en el barrio

Bloque iniciado el 6 de octubre de 2026 tras la petición de alargar la aventura.
Se ejecutan primero tres fases, con ramas anidadas desde
`codex/capitulo-desenlace`; PR y merge siguen a cargo del usuario.

1. **Encargos con misterio**: los habitantes describen necesidades y el objetivo
   evita resolver cada cable. El primer cable conserva su explicación. «Pista»
   ofrece observación, orientación y solución; no pausa el juego y se reinicia
   al cambiar de tarea. Las ayudas visuales existentes siguen disponibles.
2. **Decisiones reversibles**: una pequeña central de radio puede emitir música
   al jardín o anuncios a la plaza. Un solo destino recibe la señal; conectar el
   otro cambia la elección. No borra preparativos ni altera la colección. Se
   guarda y restaura la última elección, no una historia de elecciones activas.
3. **Consecuencias entre lugares**: la señal cambia detalles y respuestas en los
   lugares anteriores. Dos pequeños encargos de regreso permiten conectar algo
   nuevo allí y obtener un desenlace opcional distinto, sin bloquear la fiesta.

No se añaden esperas, kilómetros de mundo, combate ni inventario. Se verifica
el flujo en escritorio y móvil con clics/toques, capturas y guardado parcial.
Las mediciones automáticas con soluciones conocidas no acreditan duración de
una primera partida. El objetivo de 20–30 minutos sigue pendiente de probar
con Luca; usar `PLAYTEST_CHAPTER_ONE.md`, anotando qué decisiones investiga.

Después de esa prueba quedan propuestas: historias secundarias más largas,
segunda aventura en una estación abandonada, puzzles que combinan reglas y
finales según decisiones. No forman parte de estas tres ramas.

## Orden del bloque posterior propuesto

4. Historias secundarias: ampliar los encargos que resulten interesantes para
   Luca; cada historia necesita problema, conexiones propias y desenlace.
5. Segunda aventura: investigar la señal de una estación abandonada, con un
   objetivo central y nuevos lugares que cambien al resolverlos.
6. Combinación de reglas: enseñar una variante por vez y después combinarla con
   ramificaciones y decisiones ya conocidas; evitar dificultad por ensayo ciego.
7. Variaciones del final y secretos: mostrar consecuencias de las decisiones y
   motivos concretos para volver a jugar. Sin exigir todos los secretos.

Este bloque está propuesto, no implementado ni publicado. Si se desarrolla,
continuará la cadena desde `codex/consecuencias-regreso`, conservando una rama,
commit y push por fase y dejando los PR y merges al usuario.

## Validación del bloque implementado
Las tres fases están implementadas y publicadas. Build de producción aprobado;
`npm test` aprobó las 14 pruebas unitarias y los 36 escenarios E2E en escritorio
y móvil vertical. Se revisaron las capturas de pistas, radio y ambos encargos.
La primera partida con Luca sigue pendiente; estos resultados no demuestran
una duración humana de 20–30 minutos.
