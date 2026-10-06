## Cadena pendiente actual — plaza y bosquejo

Al iniciar este cambio, la integración seguía en `27fe834`; las 22 ramas anteriores
ya estaban integradas. Las tres ramas de muestra de la plaza siguen siendo la base
publicada del nuevo bloque. Las tres siguientes extienden esa cadena, sin ramas
paralelas ni PR/merge automáticos.

| Orden | Rama | Base pendiente |
| --- | --- | --- |
| 1 | `codex/plaza-primeros-pasos` | `claude/los-nexus-game-mvp-cppkef` |
| 2 | `codex/plaza-arte-ilustrado` | `codex/plaza-primeros-pasos` |
| 3 | `codex/plaza-entorno-vivo` | `codex/plaza-arte-ilustrado` |
| 4 | `codex/bosquejo-nexus` | `codex/plaza-entorno-vivo` |
| 5 | `codex/bosquejo-mundo` | `codex/bosquejo-nexus` |
| 6 | `codex/bosquejo-interfaces` | `codex/bosquejo-mundo` |

El usuario abre los PR y hace los merges en orden. Si ya integró una base, el PR
siguiente debe apuntar al destino de integración real. El aspecto completo de
bosquejo está en el último head; las fases anteriores cambian personaje y mundo.

---

# Orden de integración del capítulo

Las ramas forman una cadena. Cada PR debe apuntar a la base indicada mientras
esa base siga pendiente; si ya se integró, ajustar la base al destino real.
El usuario hace los PR y merges. No hay ramas paralelas independientes.

| Orden | Rama | Base | Alcance |
| --- | --- | --- | --- |
| 1 | `codex/museo-movil` | `claude/los-nexus-game-mvp-cppkef` | Museo táctil |
| 2 | `codex/continuar-progreso` | `codex/museo-movil` | Guardado |
| 3 | `codex/pruebas-recorrido` | `codex/continuar-progreso` | Recorrido automatizado |
| 4 | `codex/tunel-practica-reintento` | `codex/pruebas-recorrido` | Práctica y reintentos |
| 5 | `codex/pistas-efectos-suaves` | `codex/tunel-practica-reintento` | Pistas y comodidad |
| 6 | `codex/museo-recuerdos` | `codex/pistas-efectos-suaves` | Recuerdos únicos |
| 7 | `codex/zona-jardin` | `codex/museo-recuerdos` | Quinta zona |
| 8 | `codex/capitulo-diseno` | `codex/zona-jardin` | Diseño y referencia de duración |
| 9 | `codex/capitulo-habitantes` | `codex/capitulo-diseno` | Historia y objetivos |
| 10 | `codex/capitulo-consecuencias` | `codex/capitulo-habitantes` | Humor y consecuencias |
| 11 | `codex/capitulo-taller` | `codex/capitulo-consecuencias` | Taller de juguetes |
| 12 | `codex/capitulo-faroles` | `codex/capitulo-taller` | Rutas y reto final |
| 13 | `codex/capitulo-desenlace` | `codex/capitulo-faroles` | Desenlace, exploración y validación |
| 14 | `codex/encargos-misterio` | `codex/capitulo-desenlace` | Problemas y pistas graduadas |
| 15 | `codex/decisiones-radio` | `codex/encargos-misterio` | Elección reversible de señal |
| 16 | `codex/consecuencias-regreso` | `codex/decisiones-radio` | Encargos y consecuencias entre lugares |
| 17 | `codex/identidad-visual` | `codex/consecuencias-regreso` | Barrio ilustrado, objetos y pantallas |
| 18 | `codex/personalizacion-nexus` | `codex/identidad-visual` | Armario, nombre, chaquetas, accesorios y cable |
| 19 | `codex/historias-del-barrio` | `codex/personalizacion-nexus` | Tres historias, seis desenlaces y estilos desbloqueables |
| 20 | `codex/acabado-artistico` | `codex/historias-del-barrio` | Dirección de arte y acabado de las ocho escenas; sin funciones nuevas |
| 21 | `codex/estilo-moderno-plaza` | `codex/acabado-artistico` | Muestra moderna: portada, plaza y HUD con color y volumen estilizados |
| 22 | `codex/estilo-moderno-completo` | `codex/estilo-moderno-plaza` | Dirección moderna en los siete distritos, objetos y todas las interfaces |

Al iniciar este bloque se verificaron los siete primeros heads publicados y
la base original en `05a5e52`. Las seis fases nuevas se ejecutan en este orden;
ver `CHAPTER_ONE.md` para el diseño y `CHANGELOG.md` para lo que se implementó.

Las seis fases del capítulo se publicaron durante este bloque. La fase 6 reúne
la validación completa, el desenlace y el protocolo `PLAYTEST_CHAPTER_ONE.md`.
Cada rama conserva el estado jugable correspondiente a su fase; la última
incluye toda la cadena.

El siguiente bloque de tres fases está definido en `ADVENTURE_EXPANSION.md`.
Las filas 14–16 están implementadas, probadas y publicadas, en ese orden.

La fila 17 responde a la petición de mejorar los gráficos y continúa la misma cadena.
La rama gráfica está probada y publicada; el usuario sigue gestionando los PR y merges.

Las filas 18–19 amplían la cadena con personalización e historias secundarias.
Ambas están probadas y publicadas, con commit y push propios. La última incluye
todo el bloque; los PR y merges siguen a cargo del usuario.

La fila 20 aplica únicamente el acabado visual de interfaces y escenarios.
Continúa desde la rama de historias, con su propio commit y push; el usuario
sigue gestionando los PR y merges. Ver `ART_DIRECTION.md`.

La fila 21 publica la muestra moderna de portada, plaza y HUD. Está probada
en ambas orientaciones y conserva el flujo de juego. PR y merge a cargo del
usuario; las pantallas y distritos restantes mantienen el acabado anterior.

La fila 22 extiende la muestra aprobada a todos los distritos y pantallas.
Conserva mecánicas, contenidos, guardado y áreas táctiles; el usuario hace PR y merge.

## Reparación de toda la cadena
A petición del usuario se incorporó la base `6e3e08a` y se propagaron los merges
hacia las 22 ramas, conservando los commits originales. Se preservaron también
el señuelo, las partículas de conexión y el secreto con su vitrina independiente.
Cada fase compila; la simulación verificó 22 merges consecutivos y 231 parejas
sin conflictos. El destino sigue siendo `claude/los-nexus-game-mvp-cppkef`.
Ver `MERGE_ORDER.md` para integrar una por una mediante commits de merge.

## Nuevo bloque: muestra de la plaza (base integrada)
Las 22 fases anteriores ya están integradas por el usuario. Este bloque parte
del commit `27fe834` de `claude/los-nexus-game-mvp-cppkef`.

| Orden | Rama | Base | Contenido |
| --- | --- | --- | --- |
| 1 | `codex/plaza-primeros-pasos` | `claude/los-nexus-game-mvp-cppkef` | Enseñanza persistente en seis pasos; Miga cerca del inicio |
| 2 | `codex/plaza-arte-ilustrado` | `codex/plaza-primeros-pasos` | Escenario y sprites originales de la muestra |
| 3 | `codex/plaza-entorno-vivo` | `codex/plaza-arte-ilustrado` | Fauna, vegetación y reacciones con inercia; validación del bloque |

Integrar en ese orden mediante commits de merge, sin squash ni rebase para
preservar la ascendencia. No se crean PR ni se integran ramas por cuenta del agente.

Las tres fases se publican con commits y pushes propios. La corrección de la
visita/pistas de Miga se incorporó a la primera fase y se propagó mediante
merges normales hacia las otras dos, conservando el historial y la ascendencia.
La validación y sus alcances están documentados en `PLAZA_PLAYTEST.md`.
