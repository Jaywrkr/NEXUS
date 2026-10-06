import Phaser from 'phaser';
type G = Phaser.GameObjects.Graphics;
const INK = 0x34494e;
const BRASS = 0xc49a61;
const IVORY = 0xffefd1;

export function workshopArt(g: G, kind: string, active: boolean, inputs: number): void {
  g.clear();
  const light = active ? 0xffe39b : 0xafa997;
  if (kind === 'motor') {
    g.fillStyle(INK).fillRoundedRect(-38, -27, 76, 56, 10);
    g.fillStyle(0xb58662).fillRoundedRect(-34, -23, 68, 48, 8);
    g.fillStyle(0xe4be8a).fillRoundedRect(-31, -23, 62, 7, 3);
    g.fillStyle(0x425b60).fillCircle(0, 0, 21);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      g.lineStyle(7, light).lineBetween(Math.cos(a) * 9, Math.sin(a) * 9, Math.cos(a) * 16, Math.sin(a) * 16);
    }
    g.fillStyle(active ? 0x8ae6da : 0x71847e).fillCircle(0, 0, 10);
    g.fillStyle(IVORY, 0.65).fillCircle(-3, -3, 3);
    for (const x of [-28, 28]) for (const y of [-16, 18]) g.fillStyle(INK).fillCircle(x, y, 2);
    g.fillStyle(0x987351).fillRoundedRect(-37, 26, 74, 9, 3);
  } else if (kind === 'duck') {
    g.fillStyle(0xb88661).fillRoundedRect(-36, 21, 72, 10, 3);
    g.fillStyle(INK).fillCircle(-23, 32, 9).fillCircle(23, 32, 9);
    g.fillStyle(BRASS).fillCircle(-23, 32, 4).fillCircle(23, 32, 4);
    g.fillStyle(active ? 0xd9b258 : 0xaa9b77).fillEllipse(-5, 4, 64, 39).fillCircle(14, -17, 20);
    g.fillStyle(light).fillEllipse(-8, 0, 55, 30).fillCircle(12, -20, 17);
    g.fillStyle(0xb59253).fillEllipse(-9, 5, 29, 17);
    g.lineStyle(2, IVORY, 0.65).lineBetween(-18, 1, -7, -3);
    g.fillStyle(0xd78c54).fillTriangle(28, -23, 48, -15, 28, -7);
    g.fillStyle(INK).fillCircle(19, -23, 3);
    g.fillStyle(IVORY).fillCircle(20, -24, 1);
    g.fillStyle(0x648f88).fillRoundedRect(0, -43, 28, 6, 2).fillRoundedRect(4, -53, 20, 12, 3);
    g.fillStyle(0xe79d84).fillTriangle(-2, -5, 4, 0, -2, 5).fillTriangle(10, -5, 4, 0, 10, 5);
  } else if (kind === 'bell') {
    g.lineStyle(5, 0x896d55).lineBetween(-33, 32, -33, -42).lineBetween(33, 32, 33, -42).lineBetween(-33, -42, 33, -42);
    g.fillStyle(INK).fillRoundedRect(-36, 28, 72, 9, 3);
    g.fillStyle(BRASS).fillCircle(0, -30, 6).fillCircle(0, 28, 7);
    g.fillStyle(active ? 0xe9bc6b : 0x9d9686).fillRoundedRect(-19, -29, 38, 42, 18).fillTriangle(-13, -16, -29, 18, 29, 18);
    g.fillStyle(light).fillRoundedRect(-32, 15, 64, 9, 4);
    g.lineStyle(4, IVORY, 0.55).lineBetween(-8, -21, -15, 9);
  } else {
    g.fillStyle(0x896d55).fillRoundedRect(-43, 10, 86, 16, 4);
    g.fillStyle(BRASS).fillRect(-43, 10, 86, 4);
    g.fillStyle(INK).fillCircle(-28, 33, 8).fillCircle(28, 33, 8);
    g.lineStyle(3, INK).lineBetween(-34, 10, -34, -40).lineBetween(34, 10, 34, -40).lineBetween(-34, -38, 34, -38);
    g.fillStyle(0x79b8ad).fillTriangle(-32, -36, -32, -14, -8, -26);
    g.fillStyle(0xe4a08c).fillTriangle(32, -36, 32, -14, 8, -26);
    g.fillStyle(INK).fillRoundedRect(-26, -10, 52, 21, 7);
    g.fillStyle(inputs > 0 ? 0x88ded5 : 0x71847e).fillCircle(-13, 0, 7);
    g.fillStyle(inputs > 1 ? 0xf2bcd8 : 0x71847e).fillCircle(13, 0, 7);
  }
}

export function lanternArt(g: G, kind: string, active: boolean, color: number): void {
  g.clear();
  if (kind === 'lantern') {
    if (active) {
      g.fillStyle(color, 0.08).fillCircle(0, -16, 45);
      g.fillStyle(color, 0.13).fillCircle(0, -16, 32);
    }
    g.fillStyle(INK).fillRoundedRect(-4, 6, 8, 33, 3).fillRoundedRect(-27, 35, 54, 9, 4);
    g.fillStyle(BRASS).fillRoundedRect(-25, -38, 50, 50, 6);
    g.fillStyle(active ? color : 0x72918e).fillRoundedRect(-19, -32, 38, 36, 3);
    g.fillStyle(IVORY, active ? 0.9 : 0.2).fillRoundedRect(-12, -27, 24, 26, 4);
    g.lineStyle(3, BRASS).lineBetween(0, -32, 0, 5).lineBetween(-19, -12, 19, -12);
    g.fillStyle(INK).fillTriangle(-29, -37, 0, -54, 29, -37).fillRoundedRect(-28, 9, 56, 6, 2);
    g.fillStyle(BRASS).fillCircle(0, -55, 4);
    g.lineStyle(2, IVORY, 0.6).lineBetween(-18, -31, -10, -24);
  } else if (kind === 'stage') {
    g.fillStyle(INK).fillRoundedRect(-39, 20, 78, 17, 4);
    g.fillStyle(BRASS).fillRoundedRect(-39, 17, 78, 7, 3);
    g.lineStyle(4, INK).lineBetween(-33, 18, -33, -43).lineBetween(33, 18, 33, -43);
    g.fillStyle(active ? color : 0x847f92).fillRoundedRect(-37, -43, 74, 13, 4).fillTriangle(-32, -30, -32, 12, -17, -24).fillTriangle(32, -30, 32, 12, 17, -24);
    g.fillStyle(IVORY, active ? 0.65 : 0.2).fillTriangle(-20, -26, -31, 17, 7, 17);
    g.lineStyle(3, INK).lineBetween(0, -6, 0, 17).lineBetween(-9, 17, 9, 17);
    g.fillStyle(active ? 0xe5c98c : 0x8a9a90).fillCircle(0, -8, 6);
  } else {
    g.fillStyle(INK).fillCircle(-18, 33, 8).fillCircle(18, 33, 8);
    g.fillStyle(BRASS).fillRoundedRect(-25, 22, 50, 9, 3);
    g.fillStyle(active ? color : 0x9f9685).fillRoundedRect(-13, -10, 26, 39, 6);
    g.fillStyle(0xc58970).fillRect(-13, -7, 26, 9).fillRect(-13, 14, 26, 7);
    g.fillStyle(INK).fillEllipse(0, -9, 27, 10);
    if (active) for (let i = 0; i < 12; i++) {
      g.fillStyle([0xe9cb73, 0xe7a8c6, 0x86d7cc][i % 3]).fillRect(Math.cos(i * 2) * 28, -28 + Math.sin(i * 2) * 20, 4, 7);
    }
  }
}
