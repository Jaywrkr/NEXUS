# Revisión de la primera experiencia

Esta muestra renueva la plaza, no las otras seis zonas. Se revisa antes de
extender el arte. No introduce combate, inventario ni nuevas soluciones.

## Cómo probar

1. Integra las tres ramas según `MERGE_ORDER.md`, instala con `npm ci` y arranca
   con `npm run dev`. En la portada elige **Nueva partida**. Conserva la apariencia.
2. Sin leer las soluciones de abajo, comprueba si encuentras a Miga, entiendes
   cómo moverte y distingues el generador de la lámpara.
3. Selecciona el generador y cancela tocándolo otra vez. La instrucción debe
   volver al origen. Vuelve a elegirlo: la señal apunta a la lámpara, incluso
   cuando queda fuera de la pantalla del teléfono.
4. Tras elegir la lámpara entra la práctica del cable; puedes practicar sin
   perder, comenzar, volver al mundo o reintentar tras fallar.
5. Al encender la lámpara, ciérralo y continúa. Debe retomar el segundo cable.
6. Sigue la enseñanza hasta la puerta y el recuerdo. En el museo vuelve al
   mundo: ahora el objetivo corresponde al siguiente barrio, no al tutorial.
7. Acércate a las aves y pasa junto a las plantas. Comprueba vuelo, retorno,
   flexión, pies/sombras, cables y luz del suelo. Activa efectos suaves desde
   la portada: conserva las aves y las plantas sin animación.
8. Continúa también un guardado anterior y revisa diario, personalización y
   museo. La enseñanza no debe reiniciar conexiones ni recuerdos existentes.

La prueba automática cubre esos estados y los controles en dos orientaciones.
La comprensión de una persona que nunca ha jugado requiere esta prueba humana.
No se ha medido una duración nueva ni se ha renovado el arte de los otros barrios.

## Validación de entrega

- Build correcto en las tres ramas; 19 pruebas unitarias correctas en la muestra completa.
- Regresión completa: 48 casos ejecutados en escritorio/móvil; 46 pasaron y dos fallaron porque la visita automatizada intentaba tocar a Miga desde su posición anterior.
- Se corrigió el recorrido de esa prueba, se comprobó explícitamente su pista del anuncio y se hizo accesible esa pista cerca de la nueva posición de Miga. El texto del cartel queda por encima del fondo ilustrado.
- Revisión final específica: 10/10 casos correctos (guía, fauna, efectos suaves, pistas, conversaciones y encargos de regreso), en ambas orientaciones.
- La corrección se propagó a la primera y segunda rama mediante commits/merges normales. Los dos casos de encargos de regreso también pasan por separado en la primera rama, sin el arte ni las reacciones posteriores.
- No se repitió toda la suite después del ajuste aislado; se volvieron a ejecutar los casos afectados y los flujos relacionados. El historial de resultados se conserva en `/workspace/nexus-plaza-slice-evidence/` del entorno de desarrollo.
