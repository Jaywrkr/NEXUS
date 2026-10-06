# Bloque actual: muestra de la plaza

Las 22 ramas de la tabla histórica de abajo ya fueron integradas por el usuario.
El bloque nuevo parte de `27fe834` del destino `claude/los-nexus-game-mvp-cppkef`.

1. `codex/plaza-primeros-pasos`: enseñanza en seis pasos y señal del objetivo.
2. `codex/plaza-arte-ilustrado`: fondo y sprites originales, composición del inicio.
3. `codex/plaza-entorno-vivo`: reacciones de fauna, plantas, cables, iluminación y pruebas.

Las tres ramas están anidadas. Integra una por una, en ese orden, en el destino
habitual mediante commits de merge. Si preparas PR antes de integrar la base,
compara la segunda con la primera y la tercera con la segunda para revisar
solo su fase; después cambia la base al destino. El usuario hace PR y merge.
No usar squash/rebase para conservar la ascendencia de las ramas pendientes.

Para probar la muestra completa tras los merges: `npm ci`, `npm run dev`,
y **Nueva partida** (conserva la apariencia, reinicia la aventura). Continúa
una partida anterior también para verificar que no se repite lo ya resuelto.
La renovación de los otros distritos queda pendiente de revisar esta muestra.

---

## Historial de integración de las 22 ramas anteriores

# Integrar las ramas una por una

Destino de integración: `claude/los-nexus-game-mvp-cppkef`.
Base verificada al reparar: `6e3e08a`.

Las 22 ramas conservan su historial y están actualizadas con esa base.
Cada rama contiene la anterior reparada. El usuario crea los PR y hace merge.

Usar **Create a merge commit** (Crear un commit de merge), en el orden siguiente.
El squash o rebase pierde la ascendencia que mantiene limpia esta cadena; no
usar esos métodos para estas ramas pendientes. Para integrar en la rama destino,
apuntar allí el PR de la siguiente fase después de integrar la anterior.
Si el PR está abierto contra su rama padre pendiente, cambiar su base al destino
tras integrar esa rama padre. No hace falta integrar todas en un solo PR.

| Orden | Rama |
| --- | --- |
| 1 | `codex/museo-movil` |
| 2 | `codex/continuar-progreso` |
| 3 | `codex/pruebas-recorrido` |
| 4 | `codex/tunel-practica-reintento` |
| 5 | `codex/pistas-efectos-suaves` |
| 6 | `codex/museo-recuerdos` |
| 7 | `codex/zona-jardin` |
| 8 | `codex/capitulo-diseno` |
| 9 | `codex/capitulo-habitantes` |
| 10 | `codex/capitulo-consecuencias` |
| 11 | `codex/capitulo-taller` |
| 12 | `codex/capitulo-faroles` |
| 13 | `codex/capitulo-desenlace` |
| 14 | `codex/encargos-misterio` |
| 15 | `codex/decisiones-radio` |
| 16 | `codex/consecuencias-regreso` |
| 17 | `codex/identidad-visual` |
| 18 | `codex/personalizacion-nexus` |
| 19 | `codex/historias-del-barrio` |
| 20 | `codex/acabado-artistico` |
| 21 | `codex/estilo-moderno-plaza` |
| 22 | `codex/estilo-moderno-completo` |

La resolución conserva el fragmento secreto con vitrina independiente, el
señuelo de la antena y las partículas de conexión, además del contenido y
arte de cada fase. Los recuerdos de zona mantienen su propio contador.
`CONTEXTO.md` acompaña al estado actual de cada rama.

La comprobación de conflictos corresponde a estos heads y a la base indicada.
Si llegan otros cambios al destino durante la integración, volver a comprobar
la cadena contra ese nuevo head.

Validación de la reparación: cada una de las 22 fases compiló. La suite completa
aprobó 18 pruebas unitarias y 44 escenarios E2E en escritorio y móvil vertical.
Después del ajuste visual de separación de las ocho vitrinas, volvieron a pasar
los builds afectados y ocho escenarios de museo, secreto y distritos.
La simulación verificó 22 merges consecutivos y 231 parejas sin conflictos.
Se conservan los commits originales; no se usó force push ni se crearon PR.
