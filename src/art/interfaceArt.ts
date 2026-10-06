import Phaser from 'phaser';
import { MODERN } from './modernArt';

/** Shared modern visual materials; no navigation, state, input or animation. */
export const ART={...MODERN,paper:0xf4faff,brass:MODERN.cyan,teal:MODERN.cyan};
type G=Phaser.GameObjects.Graphics;

export function ornament(g:G,x:number,y:number,width:number,color=ART.brass):void {
  g.lineStyle(1,color,.25).lineBetween(x-width/2,y,x+width/2,y);
  g.fillStyle(color).fillRoundedRect(x-22,y-2,44,4,2);
}

/** Cached blue/violet gradients and static facets keep menus quiet and inexpensive. */
export function screenArt(scene:Phaser.Scene,dark=false,headingRule=true):void {
  const {width,height}=scene.scale,key=`art-screen-${width}-${height}-${dark}`;
  if(!scene.textures.exists(key)){
    const tex=scene.textures.createCanvas(key,width,height)!,c=tex.getContext();
    const bg=c.createLinearGradient(0,0,width,height);
    bg.addColorStop(0,dark?'#172451':'#284ca7');bg.addColorStop(.55,dark?'#1d2860':'#293580');bg.addColorStop(1,'#101c43');
    c.fillStyle=bg;c.fillRect(0,0,width,height);
    const light=c.createRadialGradient(width*.18,height*.1,0,width*.18,height*.1,width*.8);
    light.addColorStop(0,'rgba(39,231,218,.17)');light.addColorStop(1,'rgba(39,231,218,0)');
    c.fillStyle=light;c.fillRect(0,0,width,height);
    c.fillStyle='rgba(143,153,255,.07)';c.beginPath();c.moveTo(0,height*.7);c.lineTo(width*.6,0);c.lineTo(width*.82,0);c.lineTo(width*.22,height);c.lineTo(0,height);c.fill();
    c.strokeStyle='rgba(170,209,255,.14)';c.lineWidth=1;c.beginPath();c.roundRect(16.5,16.5,width-33,height-33,12);c.stroke();
    tex.refresh();
  }
  scene.add.image(0,0,key).setOrigin(0).setDepth(-5);
  if(headingRule)ornament(scene.add.graphics().setDepth(-4),width/2,78,Math.min(190,width*.35));
}

export function cardArt(g:G,x:number,y:number,width:number,height:number,accent:number,_dark=false):void {
  g.fillStyle(0x0b1636,.25).fillRoundedRect(x+3,y+7,width,height,10);
  g.fillStyle(0x182956,.95).fillRoundedRect(x,y,width,height,10);
  g.lineStyle(1,0x9bc8ff,.2).strokeRoundedRect(x+.5,y+.5,width-1,height-1,10);
  g.fillStyle(accent).fillRoundedRect(x+14,y,42,4,2);
}

/** Small illustrated emblems reuse existing story themes instead of adding controls. */
export function emblem(g: G, kind: string, x: number, y: number, color: number, r=21): void {
  g.fillStyle(ART.ink,.08).fillCircle(x,y+3,r+4);
  g.fillStyle(ART.paper).fillCircle(x,y,r+3);
  g.lineStyle(1,color,.9).strokeCircle(x,y,r+3).strokeCircle(x,y,r);
  g.fillStyle(color);
  if(kind==='mail') {
    g.fillRoundedRect(x-13,y-8,26,17,2);g.lineStyle(2,ART.paper).lineBetween(x-12,y-7,x,y+2).lineBetween(x,y+2,x+12,y-7);
  }else if(kind==='toys'){
    g.fillEllipse(x-2,y+3,24,14).fillCircle(x+7,y-6,8);g.fillStyle(ART.brass).fillTriangle(x+12,y-8,x+20,y-4,x+12,y-1);g.fillStyle(ART.ink).fillCircle(x+9,y-8,1.5);
  }else{
    for(let i=0;i<5;i++)g.fillCircle(x+Math.cos(i*1.256)*8,y+Math.sin(i*1.256)*8,5);
    g.fillStyle(ART.brass).fillCircle(x,y,4);
  }
}

export function typography(scene: Phaser.Scene): void {
  for(const item of scene.children.list)if(item instanceof Phaser.GameObjects.Text){
    if(!item.style.fontFamily.includes('serif')||item.style.fontFamily==='sans-serif')item.setFontFamily(ART.body);
  }
}
