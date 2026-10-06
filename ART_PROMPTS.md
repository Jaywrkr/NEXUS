> **Dirección vigente: [cuaderno a lápiz](SKETCH_ART_DIRECTION.md), Decisión 033.** El usuario sustituyó expresamente el acabado anterior por su hoja de referencia para todos los personajes, objetos y pantallas. Las secciones anteriores a esa decisión son históricas.

# Prompts para generar las imágenes del Nexus

Ver Decisión 017 en `DECISIONS.md` y `public/assets/nexus/README.md` para
el contexto técnico. Estos prompts están pensados para pegar en un
generador de imágenes por IA (o como guía si los dibuja alguien a mano).
Ajustá el estilo/herramienta según lo que uses — lo importante es mantener
igual la **descripción del personaje** en las 4 imágenes para que no
cambie de forma entre poses.

## Descripción del personaje (pegar siempre, no cambia entre imágenes)

> A small friendly robot-creature character called "Nexus" for a children's
> 2D platformer game. Round cream-white head with tall rabbit-like ears,
> each ear tip a different accent color (one cyan/blue, one orange). Face
> is a soft black rounded panel with two glowing yellow oval eyes, no
> mouth. Teal/turquoise hoodie jacket with an orange collar peeking out
> from the hood, dark navy sleeves and legs. A small backpack/energy-core
> pack on the back with a thin glowing lime-green/yellow-green energy
> cable dangling from it, ending in a small plug connector. White sneakers
> with blue and orange color-block accents. Chunky, rounded, toylike
> proportions — big head, small simple body, no visible hand detail
> (mitten-like paws). Flat cel-shaded / vector illustration style, clean
> outlines, soft shadows, NOT photorealistic — a friendly stylized game
> character, similar to Pixar-adjacent mascot design. Transparent
> background (PNG, no background scene).

## Paleta de referencia (para que el generador no invente colores)

- Chaqueta/hoodie: turquesa `#2ea3a3`
- Acento (orejas/mochila/detalles): celeste `#5ee7ff`
- Punta de oreja secundaria / cuello: naranja `#ff8c42`
- Cuerpo/mangas/piernas: azul marino oscuro `#2b2e43`
- Cabeza/zapatillas: crema `#f4f1e8`
- Cable de energía: verde lima `#d4e157`
- Ojos: amarillo cálido `#ffe066`

## Las 4 imágenes a generar

Todas: **256×384px, fondo transparente, personaje mirando hacia la
derecha**, mismo tamaño/encuadre relativo del personaje en el cuadro
(para que no "salte" al pasar de una a otra en el juego).

### 1. `nexus-idle.png` — de pie, quieto
```
[descripción del personaje de arriba], standing idle pose, facing right,
weight centered, arms relaxed at sides, neutral friendly stance, slight
3/4 angle showing the side energy port/backpack. Full body visible from
head to feet.
```

### 2. `nexus-walk-1.png` — mitad del paso
```
[descripción del personaje de arriba], mid-walk-cycle pose, facing right,
right leg stepping forward and slightly bent, left leg trailing back,
slight forward lean, arms swinging naturally opposite the legs. Same
framing and character size as the idle pose.
```

### 3. `nexus-walk-2.png` — paso opuesto
```
[descripción del personaje de arriba], mid-walk-cycle pose, facing right,
opposite leg position from a "right leg forward" walk frame — left leg
forward and bent, right leg trailing back, slight forward lean, arms
swinging opposite the legs. Same framing and character size as the idle
pose, meant to alternate with a mirrored-leg walk frame to form a
2-frame walk cycle.
```

### 4. `nexus-celebrate.png` — festejando
```
[descripción del personaje de arriba], joyful celebration pose, facing
right, small hop with both feet slightly off the ground, arms raised up
in triumph, ears perked up and glowing brighter, big happy energy, a few
small spark/star particles floating around. Same framing and character
size as the idle pose.
```

## Después de generarlas

1. Revisar que fondo sea transparente de verdad (no blanco).
2. Confirmar que el personaje ocupa aproximadamente el mismo espacio/
   posición en el cuadro en las 4 imágenes (si no, recortar/alinear).
3. Guardarlas en `public/assets/nexus/` con esos nombres exactos.
4. Avisarle a Claude para conectar `loadNexusAssets()` y reemplazar el
   dibujo por formas en `Nexus.ts` por estos sprites.

## Prompts vigentes — Decisión 033

Usar la hoja de personaje aportada por el usuario como referencia visual, no el
acabado de los prompts históricos. Describir siempre:

> Loose graphite and coloured-pencil sketch on warm ivory paper. Repeated,
> imperfect construction contours, visible scribbled charcoal face and pencil
> pigment. Cream pod head, two long pale yellow oval eyes, no mouth. Outward
> antenna ears with orange and dusty blue tips, blue circular side discs. Teal
> zip hoodie with a clearly curved handwritten numeral **2**, orange scarf,
> charcoal gloves and short legs, ivory sneakers with orange trims. Ivory
> backpack with teal circular energy port and dangling lime cable. No 3D,
> no smooth vector contours, no plastic shading, no phone UI or screenshot frame.

Para las cuatro poses: atlas 2×2 registrado, quieto / paso izquierdo / paso derecho
/ festejo, misma proporción de cabeza y ropa. Para atlas de objetos y habitantes:
cuadros iguales, cada silueta completa dentro de su cuadro y márgenes transparentes
amplios, sin trazos de un cuadro en el vecino. Interiores opacos; alfa cero fuera.
Los estados apagado/encendido conservan tamaño y posición de la base. Fuente y
aspersor apagados no tienen agua; flores apagadas son capullos; puerta activa está
abierta. Las luces encendidas se dibujan con pigmento amarillo, sin efecto de plástico.

Para cada barrio: ilustración panorámica independiente de alta resolución,
construcciones al fondo y bordes, suelo amplio despejado, sin personajes ni máquinas
interactivas. El agua del paseo queda al fondo; no atraviesa la zona de caminar.
El barrio del puente no incorpora un puente permanente al fondo.
