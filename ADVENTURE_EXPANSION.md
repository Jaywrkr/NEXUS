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

## Propuestas posteriores al primer bloque

4. Historias secundarias: ampliar los encargos que resulten interesantes para
   Luca; cada historia necesita problema, conexiones propias y desenlace.
5. Segunda aventura: investigar la señal de una estación abandonada, con un
   objetivo central y nuevos lugares que cambien al resolverlos.
6. Combinación de reglas: enseñar una variante por vez y después combinarla con
   ramificaciones y decisiones ya conocidas; evitar dificultad por ensayo ciego.
7. Variaciones del final y secretos: mostrar consecuencias de las decisiones y
   motivos concretos para volver a jugar. Sin exigir todos los secretos.

Esta lista describía las propuestas al cerrar el primer bloque. Las historias
secundarias ya se desarrollan en el bloque autorizado de abajo, después de la
mejora gráfica. El segundo capítulo y las otras ampliaciones siguen pendientes.

## Validación del bloque implementado
Las tres fases están implementadas y publicadas. Build de producción aprobado;
`npm test` aprobó las 14 pruebas unitarias y los 36 escenarios E2E en escritorio
y móvil vertical. Se revisaron las capturas de pistas, radio y ambos encargos.
La primera partida con Luca sigue pendiente; estos resultados no demuestran
una duración humana de 20–30 minutos.

## Bloque autorizado: historias y personalización
La petición posterior de «más largo, más cosas y más personalización» autoriza
las historias secundarias y el armario. La cadena continúa desde
`codex/identidad-visual`: primero `codex/personalizacion-nexus`, después
`codex/historias-del-barrio`.

- Armario: nombre, cuatro chaquetas iniciales, tres accesorios iniciales y
  cuatro colores de cable. 48 combinaciones iniciales; 100 al conseguir los
  tres estilos de los encargos. Guardar/cancelar; persistencia independiente.
- Correo indisciplinado: ordenar, traducir, elegir tono y publicar. Cuatro
  conexiones y dos respuestas del buzón. Desbloquea chaqueta ámbar.
- Inspección del pato: rueda, freno, propuesta, dos pruebas y aprobación. Seis
  conexiones, dos desenlaces e insignia de pato. Repetir una misma prueba no
  sustituye a la otra.
- Flores de madrugada: dirección, ritmo y perfume, concierto y destinatario.
  Seis conexiones, dos desenlaces y corona del jardín.
- Diario: requisitos por lugar restaurado, entrada a los nuevos espacios,
  avance parcial guardado y álbum de seis desenlaces. Repetir borra solamente
  los cables de esa historia; conserva el barrio, finales vistos y estilos.

Se añaden 16 conexiones por una pasada de los tres encargos. No se exige
completarlos para terminar la fiesta. Las decisiones cambian el desenlace y
permiten repetir; las recompensas no dependen de escoger una opción «correcta».
La duración de primera partida se sigue comprobando con una persona; no se
atribuye una cantidad de minutos a un piloto que conoce las soluciones.
La estación abandonada y un segundo capítulo siguen siendo propuestas futuras.

Validación del bloque: 18 pruebas unitarias y 42 escenarios E2E aprobados en la suite completa, con build de producción. La corrección posterior de espaciado del armario se verifica con build y cuatro escenarios de apariencia/historias en ambos formatos.
