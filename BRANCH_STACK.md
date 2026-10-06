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

Al iniciar este bloque se verificaron los siete primeros heads publicados y
la base original en `05a5e52`. Las seis fases nuevas se ejecutan en este orden;
ver `CHAPTER_ONE.md` para el diseño y `CHANGELOG.md` para lo que se implementó.
