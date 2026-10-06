import Phaser from 'phaser';
import { modernPlaza, modernTitle } from './modernArt';

// A shared, hand-built palette: ivory plaster, terracotta, ink and turquoise.
const INK = 0x34494e;
const CREAM = 0xffefd1;
type G = Phaser.GameObjects.Graphics;

function house(g: G, x: number, y: number, w: number, color: number, roof: number): void {
  g.fillStyle(INK, 0.13).fillEllipse(x + 8, y + 9, w + 40, 22);
  g.fillStyle(0x96764e).fillRoundedRect(x - w / 2 - 4, y - 98, w + 8, 100, 7);
  g.fillStyle(color).fillRoundedRect(x - w / 2, y - 98, w, 92, 5);
  g.fillStyle(CREAM, 0.5).fillRect(x - w / 2 + 7, y - 93, 5, 82);
  g.fillStyle(0xa55743).fillRect(x + w / 3, y - 159, 16, 45);
  g.fillStyle(roof).fillTriangle(x - w / 2 - 18, y - 94, x, y - 167, x + w / 2 + 18, y - 94);
  g.lineStyle(4, CREAM, 0.7).lineBetween(x - w / 2 - 12, y - 99, x, y - 158);
  g.lineStyle(2, INK, 0.22);
  for (let row = 0; row < 3; row++) {
    const yy = y - 110 - row * 15;
    const ww = w / 2 - row * 20;
    g.lineBetween(x - ww, yy, x + ww, yy);
  }
  for (const dx of [-w / 3, w / 3]) {
    g.fillStyle(0x876748).fillRoundedRect(x + dx - 16, y - 76, 32, 41, 4);
    g.fillStyle(0x729f9f).fillRoundedRect(x + dx - 12, y - 72, 24, 31, 2);
    g.lineStyle(2, CREAM).lineBetween(x + dx, y - 71, x + dx, y - 42).lineBetween(x + dx - 11, y - 57, x + dx + 11, y - 57);
    g.fillStyle(CREAM).fillRect(x + dx - 20, y - 36, 40, 5);
  }
  // Plaster seams, shutters and a shaded eave ground the architecture.
  g.fillStyle(INK,.13).fillRect(x-w/2,y-98,w,9);
  for(let i=0;i<7;i++) {
    const bx=x-w/2+16+(i*31)%(w-32),by=y-28-(i%3)*18;
    g.lineStyle(1,0x876748,.18).lineBetween(bx,by,bx+14,by);
  }
  for(const dx of [-w/3,w/3]) {
    g.fillStyle(roof,.65).fillRoundedRect(x+dx-26,y-73,8,35,2).fillRoundedRect(x+dx+18,y-73,8,35,2);
    g.lineStyle(1,CREAM,.3);
    for(let yy=y-68;yy<y-41;yy+=6)g.lineBetween(x+dx-25,yy,x+dx-19,yy).lineBetween(x+dx+19,yy,x+dx+25,yy);
  }
  g.fillStyle(0x6b7b73).fillRoundedRect(x - 19, y - 57, 38, 51, 12);
  g.fillStyle(0xe9bc74).fillCircle(x + 9, y - 27, 3);
  g.fillStyle(0xc5ac85).fillRoundedRect(x - 27, y - 6, 54, 10, 3);
}

function tree(g: G, x: number, y: number, size = 1): void {
  g.fillStyle(INK, 0.13).fillEllipse(x + 9, y + 5, 100 * size, 20 * size);
  g.fillStyle(0x8b674b).fillRoundedRect(x - 7 * size, y - 64 * size, 14 * size, 64 * size, 3);
  g.lineStyle(3 * size, 0xc4a073).lineBetween(x - 2 * size, y - 48 * size, x - 2 * size, y - 4);
  g.fillStyle(0x476e60).fillCircle(x, y - 81 * size, 43 * size).fillCircle(x - 28 * size, y - 70 * size, 27 * size).fillCircle(x + 25 * size, y - 66 * size, 27 * size);
  g.fillStyle(0x68996c).fillCircle(x - 12 * size, y - 94 * size, 28 * size).fillCircle(x + 23 * size, y - 81 * size, 23 * size);
  g.fillStyle(0x95b67b).fillEllipse(x - 18 * size, y - 109 * size, 27 * size, 13 * size);
  for(let i=0;i<22;i++) {
    const a=i*2.4,r=12+(i%4)*6;
    g.fillStyle(i%2?0xb2c891:0x385d54,.3).fillEllipse(x+Math.cos(a)*r*size,y-81*size+Math.sin(a)*r*size,9*size,5*size);
  }
  for (let i = 0; i < 5; i++) g.fillStyle(0xeac278).fillCircle(x - 28 * size + i * 12 * size, y - (72 + (i % 2) * 18) * size, 3 * size);
}

function planter(g: G, x: number, y: number): void {
  g.fillStyle(INK, 0.12).fillEllipse(x + 5, y + 4, 65, 12);
  g.fillStyle(0x9e6451).fillRoundedRect(x - 25, y - 14, 50, 18, 3);
  g.fillStyle(0xc58b64).fillRoundedRect(x - 28, y - 17, 56, 6, 2);
  for (let i = -1; i <= 1; i++) {
    g.lineStyle(3, 0x55735a).lineBetween(x + i * 16, y - 17, x + i * 16, y - 35);
    g.fillStyle(0x7fa47b).fillEllipse(x + i * 16 + 5, y - 25, 14, 7);
    g.fillStyle(i === 0 ? 0xf6d278 : 0xe89c87).fillCircle(x + i * 16, y - 37, 7);
    g.fillStyle(CREAM).fillCircle(x + i * 16, y - 37, 3);
  }
}

function bunting(g: G, from: number, to: number, y: number): void {
  g.lineStyle(2, 0x6b7b73).beginPath().moveTo(from, y);
  for (let x = from; x <= to; x += 10) g.lineTo(x, y + Math.sin((x - from) / (to - from) * Math.PI) * 25);
  g.strokePath();
  for (let x = from + 15, i = 0; x < to - 10; x += 32, i++) {
    const yy = y + Math.sin((x - from) / (to - from) * Math.PI) * 25;
    g.fillStyle([0xe6a078, 0x76bab3, 0xe8ca76, 0xb59bcc][i % 4]).fillTriangle(x - 9, yy, x + 9, yy, x, yy + 18);
  }
}

/** Static art is baked per district; seven culled images instead of thousands of live shapes. */
export function drawNeighborhood(scene: Phaser.Scene, height: number): void {
  const v = height / 540;
  const mid = height / 2;
  const starts = [0, 1160, 1840, 2410, 3020, 3860, 4790, 6100];
  const names = ['PLAZA DE MIGA', 'PASEO DEL AGUA', 'CUAC FM', 'DON PASO', 'EL JARDÍN', 'TALLER DE PIPA', 'CAMINO DE LUCIO'];
  for (let zone = 0; zone < 7; zone++) {
    const left = starts[zone];
    const width = starts[zone + 1] - left;
    const key = `neighborhood-${height}-${zone}`;
    if (!scene.textures.exists(key)) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      // Atmospheric ground lighting, baked alongside the district.
      for(let y=mid-105*v;y<height;y+=12) {
        const t=(y-(mid-105*v))/(height-(mid-105*v));
        g.fillStyle(t>.7?0x406c61:0x8ba780,t>.7?.055:.075).fillRect(0,y,width,12);
      }
      // Paving is deliberately quiet under cables and interactive objects.
      const top = mid - 93 * v;
      g.fillStyle(0xc9c6a1, 0.4).fillRoundedRect(25, top - 6, width - 50, 245 * v, 38);
      g.lineStyle(3,0xfaf2df,.65).strokeRoundedRect(30,top-2,width-60,234*v,35);
      g.fillStyle(0xf1e3be, 0.8).fillRoundedRect(32, top, width - 64, 230 * v, 34);
      for (let row = 0; row < Math.ceil(230 * v / 31); row++) {
        for (let x = 48 + (row % 2) * 25; x < width - 55; x += 51) {
          const y = top + 10 + row * 30;
          g.fillStyle([0xf8ebcf, 0xe8d7b3, 0xefdfbf][(row + Math.floor(x / 51)) % 3], 0.5).fillRoundedRect(x, y, 46, 25, 5);
          g.lineStyle(1, 0x9d987c, 0.17).strokeRoundedRect(x, y, 46, 25, 5);
        }
      }
      // Border stones read as a sidewalk rather than a floating rounded platform.
      for(let x=45;x<width-40;x+=34) {
        g.fillStyle(0x807d66,.18).fillRoundedRect(x,top+224*v,29,9,3);
        g.lineStyle(1,0xfff8df,.6).lineBetween(x+2,top+224*v,x+26,top+224*v);
      }
      // Grass and pebbles along the walking path, away from the object silhouettes.
      for (let i = 0; i < width / 12; i++) {
        const x = (i * 73 + zone * 17) % width;
        const y = mid + 166 * v + ((i * 29) % Math.max(1, height - mid - 166 * v));
        g.lineStyle(1, 0x73927a, 0.5).lineBetween(x, y, x - 3, y - 6).lineBetween(x, y, x + 2, y - 8);
        if (i % 4 === 0) g.fillStyle(CREAM, 0.65).fillEllipse(x + 7, y + 2, 5, 3);
      }
      const back = mid - 112 * v;
      if (zone === 0) {
        modernPlaza(g,width,mid,v);
      } else if (zone === 1) {
        house(g, 220, back + 5, 174, 0xc6ddd0, 0x648f88);
        planter(g, 64, mid + 138 * v); planter(g, width - 80, mid + 138 * v);
        tree(g, width - 70, back + 35, 0.8);
      } else if (zone === 2) {
        house(g, 360, back + 6, 146, 0xd0c4dd, 0x687b97);
        g.lineStyle(3, INK, 0.6).lineBetween(370, back - 140, 370, back - 200).lineBetween(351, back - 178, 389, back - 178);
        g.fillStyle(0xe6b67f).fillCircle(370, back - 204, 5);
      } else if (zone === 3) {
        const bankY = mid - 96 * v;
        g.fillStyle(0x527d81).fillRect(150, bankY, 100, height - bankY);
        g.fillStyle(0x3d626b).fillRect(150, bankY, 17, height - bankY).fillRect(236, bankY, 14, height - bankY);
        g.lineStyle(3, 0xafd4c6, 0.55);
        for (let y = bankY + 28; y < height; y += 39) {
          g.lineBetween(180, y, 205, y - 4).lineBetween(205, y - 4, 223, y + 1);
          g.fillStyle(0xa5ad87).fillEllipse(143, y + 10, 18, 26).fillEllipse(257, y - 8, 18, 26);
        }
        tree(g, 436, back + 70, 1.1);
        planter(g, 480, mid + 150 * v);
      } else if (zone === 4) {
        // Timber-and-glass greenhouse, set behind the playable garden.
        g.fillStyle(0x749e8c, 0.8).fillRoundedRect(210, back - 90, 270, 95, 6);
        g.fillStyle(0xb9d8c6, 0.8).fillTriangle(200, back - 89, 345, back - 157, 490, back - 89);
        g.lineStyle(5, 0x8c8260).strokeRect(210, back - 90, 270, 95);
        for (let x = 210; x <= 480; x += 54) g.lineBetween(x, back - 90, x, back + 5).lineBetween(345, back - 155, x, back - 90);
        g.lineStyle(2, CREAM, 0.45).lineBetween(223, back - 78, 252, back - 50).lineBetween(280, back - 78, 309, back - 50);
        planter(g, 255, back + 4); planter(g, 432, back + 4);
        tree(g, 65, back + 46, 0.85);
      } else if (zone === 5) {
        house(g, 435, back + 8, 246, 0xe8c5a1, 0xb27865);
        g.fillStyle(0x759d99).fillRoundedRect(340, back - 26, 190, 29, 3);
        for (let x = 343; x < 530; x += 24) g.fillStyle(CREAM, 0.65).fillRect(x, back - 26, 12, 29);
        g.fillStyle(0x917252).fillRoundedRect(38, mid + 152 * v, 86, 16, 4);
        g.fillStyle(0xbd9270).fillRoundedRect(38, mid + 142 * v, 86, 9, 3);
        planter(g, 680, back + 44);
      } else {
        house(g, 820, back + 25, 202, 0xd7c8d4, 0x727e98);
        bunting(g, 130, width - 60, back - 32);
        tree(g, 44, back + 50, 0.85); tree(g, width - 63, mid + 113 * v, 1.1);
        for (const x of [135, 435, 710, 1140]) planter(g, x, mid + 160 * v);
      }
      // Foreground details stay below the playable silhouettes and receive no input.
      for(let i=0;zone!==0 && i<Math.floor(width/230);i++) {
        const x=75+i*231,y=mid+185*v;
        g.fillStyle(0x365c51,.1).fillEllipse(x+8,y+12,102,15);
        g.fillStyle(0x648771).fillEllipse(x,y,74,23).fillEllipse(x+34,y+4,56,20);
        g.lineStyle(1,0xa7bd88,.6).lineBetween(x-18,y-5,x+5,y-5);
        for(let j=0;j<4;j++)g.fillStyle(j%2?0xd3b573:0xe8cda3,.75).fillCircle(x-18+j*16,y+(j%2)*4,2);
      }
      // District plaque: visual landmarks, rather than giant labels over the play area.
      const plaqueX = zone === 0 ? 264 : zone === 3 ? 445 : width / 2;
      g.fillStyle(zone===0?0x14234e:INK, 0.9).fillRoundedRect(plaqueX - 104, back - 43, 208, 28, 8);
      g.lineStyle(1, zone===0?0x27e7da:0xe4c68e, 0.75).strokeRoundedRect(plaqueX - 101, back - 40, 202, 22, 6);
      g.generateTexture(key, width, height);
      g.destroy();
    }
    scene.add.image(left, 0, key).setOrigin(0).setDepth(2.5);
    const plaqueX = zone === 0 ? 264 : zone === 3 ? 445 : width / 2;
    scene.add.text(left + plaqueX, mid - 112 * v - 29, names[zone], {
      fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffefd1', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(3);
  }
}

export function drawSky(scene: Phaser.Scene, width: number, height: number): void {
  const sky = scene.add.graphics().setDepth(-30).setScrollFactor(0);
  for (let y = 0; y < height; y += 8) {
    const t = y / height;
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x498fe0), Phaser.Display.Color.ValueToColor(0xb5eafb), 100, t * 100,
    );
    sky.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b)).fillRect(0, y, scene.scale.width, 8);
  }
  scene.add.circle(scene.scale.width * 0.78, 104, 55, 0xffe9b0, 0.26).setDepth(-25).setScrollFactor(0);
  scene.add.circle(scene.scale.width * 0.78, 104, 33, 0xffefd1, 0.9).setDepth(-24).setScrollFactor(0);
  for (let x = -150; x < width; x += 370) {
    const g = scene.add.graphics({ x, y: 90 + Math.sin(x * 0.03) * 26 }).setDepth(-20).setScrollFactor(0.18);
    g.fillStyle(0xf4fcff, 0.85).fillRoundedRect(-55, -6, 122, 21, 10).fillCircle(-20, -8, 22).fillCircle(10, -16, 27).fillCircle(36, -4, 17);
  }
  for (let x = -200; x < width; x += 280) {
    scene.add.ellipse(x, height / 2 - 86 * height / 540, 420, 160 * height / 540, 0x63b9b9, 0.65).setDepth(-11).setScrollFactor(0.35);
    scene.add.ellipse(x + 170, height / 2 - 35 * height / 540, 330, 130 * height / 540, 0x428f9f, 0.6).setDepth(-10).setScrollFactor(0.55);
  }
}

export function drawTitleArt(scene: Phaser.Scene, width: number, height: number): void {
  modernTitle(scene,width,height);
}
