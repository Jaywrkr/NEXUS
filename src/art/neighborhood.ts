import Phaser from 'phaser';
import { PLAZA } from './plazaAssets';
import { modernDistrict, modernTitle, MODERN } from './modernArt';

/** Static art is baked per district; seven culled images, with no decorative input. */
export function drawNeighborhood(scene:Phaser.Scene,height:number):void {
  const v=height/540,mid=height/2;
  const starts=[0,1160,1840,2410,3020,3860,4790,6100];
  const names=['PLAZA DE MIGA','PASEO DEL AGUA','CUAC FM','DON PASO','EL JARDÍN','TALLER DE PIPA','CAMINO DE LUCIO'];
  for(let zone=0;zone<7;zone++){
    if (zone === 0 && scene.textures.exists(PLAZA.background)) {
      scene.add.image(0, 0, PLAZA.background).setOrigin(0).setDisplaySize(1160, height).setDepth(4);
      // Feather the transition into the next district without covering any gameplay.
      const edge = scene.add.graphics().setDepth(4.1);
      for (let x = 1100; x < 1160; x += 4) edge.fillStyle(0x66ada6, (x - 1100) / 60 * .8).fillRect(x, 0, 4, height);
      continue;
    }
    const left=starts[zone],width=starts[zone+1]-left,key=`neighborhood-${height}-${zone}`;
    const plaqueX=zone===0?264:zone===3?445:width/2,back=mid-112*v;
    if(!scene.textures.exists(key)){
      const g=scene.make.graphics({x:0,y:0});
      modernDistrict(g,width,mid,v,zone);
      g.fillStyle(MODERN.ink,.94).fillRoundedRect(plaqueX-104,back-43,208,28,6);
      g.fillStyle(MODERN.cyan).fillRect(plaqueX-100,back-43,36,3);
      g.generateTexture(key,width,height);g.destroy();
    }
    scene.add.image(left,0,key).setOrigin(0).setDepth(2.5);
    scene.add.text(left+plaqueX,back-29,names[zone],{
      fontFamily:MODERN.body,fontSize:'12px',fontStyle:'bold',color:'#ffffff',letterSpacing:2,
    }).setOrigin(.5).setDepth(3);
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
