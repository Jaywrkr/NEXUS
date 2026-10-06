import Phaser from 'phaser';

/** Shared pencil palette. The export name preserves existing rendering imports. */
export const MODERN = {
  ink: 0x34332e, blue: 0x638f8b, violet: 0x99869c, cyan: 0x76a59e, yellow: 0xe6bd65,
  body: '"Patrick Hand", cursive', display: '"Patrick Hand", cursive',
};

/** Deterministic fibres: baked once, never noise or flicker in the update loop. */
export function paperTexture(scene: Phaser.Scene, key: string, width: number, height: number): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, width, height)!, c = tex.getContext();
  c.fillStyle = '#eee5d2'; c.fillRect(0, 0, width, height);
  let seed = 713;
  const random = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < width * height / 24; i++) {
    c.fillStyle = i % 3 ? 'rgba(99,82,55,.035)' : 'rgba(255,253,238,.35)';
    c.fillRect(random() * width, random() * height, random() * 2 + .5, .7);
  }
  tex.refresh();
}

/** Tintable paper swatches with a repeated, imperfect graphite contour. */
export function ensureFlatTexture(scene: Phaser.Scene, key: string, width: number, height: number, _radius: number): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, width, height)!, c = tex.getContext();
  c.fillStyle = '#fffdf5'; c.fillRect(3, 3, width - 6, height - 6);
  for (let y = 5; y < height - 4; y += 3) for (let x = 5; x < width - 4; x += 7) {
    c.fillStyle = 'rgba(69,56,31,.07)'; c.fillRect(x + Math.sin(y) * 2, y, 3, .5);
  }
  c.lineWidth = 1;
  for (let pass = 0; pass < 2; pass++) {
    c.strokeStyle = pass ? 'rgba(49,46,39,.35)' : 'rgba(49,46,39,.75)';
    c.beginPath();
    const points = [[2, 3], [width * .33, 2], [width * .67, 4], [width - 3, 2],
      [width - 2, height * .5], [width - 4, height - 3], [width * .5, height - 2], [3, height - 4], [2, height * .5], [2, 3]];
    points.forEach(([x, y], i) => i ? c.lineTo(x + pass, y + pass) : c.moveTo(x, y));
    c.stroke();
  }
  tex.refresh();
}

export function pencilLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, color = MODERN.ink, alpha = .55): void {
  for (let pass = 0; pass < 2; pass++) {
    g.lineStyle(1, color, alpha * (pass ? .45 : 1)).beginPath().moveTo(x1 + pass, y1 + pass);
    const steps = Math.min(12, Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 18)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, jitter = Math.sin(i * 2.1 + pass * 3) * .8;
      g.lineTo(x1 + (x2 - x1) * t + jitter, y1 + (y2 - y1) * t + jitter);
    }
    g.strokePath();
  }
}
export function pencilCard(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, color = 0xf2ead9): void {
  g.fillStyle(0x34332e, .09).fillRect(x + 3, y + 4, width, height);
  g.fillStyle(color, .98).fillRect(x, y, width, height);
  pencilLine(g, x, y, x + width, y); pencilLine(g, x + width, y, x + width, y + height);
  pencilLine(g, x + width, y + height, x, y + height); pencilLine(g, x, y + height, x, y);
}
export function pencilCircle(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, color = MODERN.ink, alpha = .55): void {
  for (let pass = 0; pass < 2; pass++) {
    g.lineStyle(1, color, pass ? alpha * .45 : alpha).beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * Math.PI * 2, r = radius + Math.sin(i * 1.7 + pass) * .7 + pass;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.strokePath();
  }
}

export function modernTitle(scene: Phaser.Scene, width: number, height: number): void {
  const key = `pencil-title-${width}-${height}`;
  paperTexture(scene, key, width, height);
  scene.add.image(0, 0, key).setOrigin(0).setDepth(-5);
  const background = scene.add.image(width / 2, height / 2, 'sketch-district-0');
  background.setScale(Math.max(width / background.width, height / background.height)).setAlpha(.24).setDepth(-4);
  const mobile = height > width, menu = mobile ? width / 2 : width * .68;
  const g = scene.add.graphics().setDepth(-3);
  pencilCard(g, menu - Math.min(220, width / 2 - 20), height / 2 - 155,
    Math.min(440, width - 40), 340);
  const hero = mobile ? width / 2 : width * .25, base = mobile ? height / 2 - 168 : height * .78;
  pencilLine(g, hero - 110, base + 5, hero + 110, base + 5);
  scene.add.text(hero, mobile ? base - 205 : base - 260, 'Un barrio por conectar', {
    fontFamily: MODERN.body, fontSize: '23px', color: '#655f50',
  }).setOrigin(.5).setAngle(-2);
}

export function pencilDiscTexture(scene: Phaser.Scene, key: string, radius: number): void {
  if (scene.textures.exists(key)) return;
  const size = radius * 2 + 6, tex = scene.textures.createCanvas(key, size, size)!, c = tex.getContext();
  c.fillStyle = '#fffdf5'; c.beginPath(); c.arc(size / 2, size / 2, radius, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(49,46,39,.7)'; c.lineWidth = 1;
  for (let pass = 0; pass < 2; pass++) {
    c.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * Math.PI * 2, r = radius + Math.sin(i * 1.7 + pass) * .7 - pass * 2;
      const x = size / 2 + Math.cos(a) * r, y = size / 2 + Math.sin(a) * r;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.stroke();
  }
  for (let i = 0; i < 20; i++) {
    const y = size / 2 - radius + i * radius / 10;
    const half = Math.sqrt(Math.max(0, radius * radius - (y - size / 2) ** 2)) - 3;
    c.strokeStyle = 'rgba(49,46,39,.06)'; c.beginPath(); c.moveTo(size / 2 - half, y); c.lineTo(size / 2 + half, y + .8); c.stroke();
  }
  tex.refresh();
}
