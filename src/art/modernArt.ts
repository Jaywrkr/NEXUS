import Phaser from 'phaser';

/** Original stylized direction: strong silhouettes, saturated light and flat UI. */
export const MODERN = {
  ink: 0x14234e, blue: 0x345cdd, violet: 0x7964ed, cyan: 0x27e7da, yellow: 0xffe342,
  body: 'Arial, sans-serif', display: '"Arial Black", Arial, sans-serif',
};
type G=Phaser.GameObjects.Graphics;
function polygon(g:G,points:number[],color:number,alpha=1):void {
  g.fillStyle(color,alpha).beginPath().moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);
  g.closePath().fillPath();
}

export function ensureFlatTexture(scene:Phaser.Scene,key:string,width:number,height:number,radius:number):void {
  if(scene.textures.exists(key))return;
  const tex=scene.textures.createCanvas(key,width,height)!;const c=tex.getContext();
  c.fillStyle='#ffffff';c.beginPath();c.roundRect(0,0,width,height,Math.min(radius,8));c.fill();tex.refresh();
}

function building(g:G,x:number,y:number,w:number,face:number,roof:number):void {
  const h=w*.7,d=w*.22;
  polygon(g,[x-w*.65,y+6,x+w*.65,y+6,x+w*.88,y+25,x-w*.28,y+29],MODERN.ink,.16);
  polygon(g,[x+w/2,y-h,x+w/2+d,y-h-d*.45,x+w/2+d,y-d*.45,x+w/2,y],0x6684c1);
  g.fillStyle(face).fillRoundedRect(x-w/2,y-h,w,h,4);
  polygon(g,[x-w/2-10,y-h,x,y-h-w*.31,x+w/2+10,y-h],roof);
  polygon(g,[x,y-h-w*.31,x+d,y-h-w*.31-d*.45,x+w/2+d+10,y-h-d*.45,x+w/2+10,y-h],0x443b94);
  g.fillStyle(0x132855,.12).fillRect(x-w/2,y-h,w,9);
  g.lineStyle(3,0xf4faff,.55).lineBetween(x-w/2+5,y-h+12,x-w/2+5,y-9);
  for(const dx of [-w*.29,w*.29]) {
    g.fillStyle(0x2c4b87).fillRoundedRect(x+dx-13,y-h*.72,26,35,3);
    g.fillStyle(0x87e4f5).fillRect(x+dx-10,y-h*.72+3,20,27);
    polygon(g,[x+dx-10,y-h*.72+3,x+dx+10,y-h*.72+3,x+dx-10,y-h*.72+20],0xe7ffff,.6);
    g.fillStyle(0xe5f3ff).fillRect(x+dx-17,y-h*.72+35,34,5);
  }
  g.fillStyle(0x38569a).fillRoundedRect(x-17,y-49,34,49,5);
  g.fillStyle(MODERN.cyan).fillRoundedRect(x-12,y-44,24,15,2);
  g.fillStyle(MODERN.yellow).fillCircle(x+9,y-22,2);
  g.fillStyle(0xadc4e6).fillRect(x-26,y,52,7);
}

function tree(g:G,x:number,y:number,s=1):void {
  g.fillStyle(MODERN.ink,.13).fillEllipse(x+14*s,y+6*s,105*s,22*s);
  polygon(g,[x-7*s,y,x-5*s,y-74*s,x+9*s,y-74*s,x+8*s,y],0x565591);
  polygon(g,[x-4*s,y-28*s,x-23*s,y-60*s,x-17*s,y-65*s,x+3*s,y-35*s],0x72669e);
  polygon(g,[x-48*s,y-79*s,x-32*s,y-121*s,x+2*s,y-137*s,x+40*s,y-118*s,x+51*s,y-78*s,x+13*s,y-57*s],0x238e85);
  polygon(g,[x-48*s,y-79*s,x-32*s,y-121*s,x+2*s,y-137*s,x+8*s,y-89*s,x-12*s,y-69*s],0x6fdb96);
  polygon(g,[x+2*s,y-137*s,x+40*s,y-118*s,x+51*s,y-78*s,x+8*s,y-89*s],0x3abfa6);
}

export function modernPlaza(g:G,width:number,mid:number,v:number):void {
  g.clear();const top=mid-95*v,bottom=mid+142*v;
  g.fillStyle(0x58bda4).fillRect(0,top,width,mid*2-top);
  polygon(g,[0,bottom+38,width,bottom-5,width,mid*2,0,mid*2],0x43a698);
  g.fillStyle(0x183970,.18).fillRoundedRect(28,top+10,width-48,bottom-top+8,22);
  g.fillStyle(0xc8dbf0).fillRoundedRect(20,top,width-40,bottom-top,18);
  g.fillStyle(0xe7f1fb).fillRoundedRect(24,top,width-48,bottom-top-9,16);
  for(let y=top+12,row=0;y<bottom-24;y+=56,row++)for(let x=36+(row%2)*44;x<width-45;x+=89){
    g.fillStyle((row+Math.floor(x/89))%3?0xdce9f7:0xcddff2).fillRoundedRect(x,y,81,47,4);
    g.lineStyle(1,0xffffff,.6).lineBetween(x+4,y+2,x+75,y+2);
  }
  building(g,265,mid+30*v,154,0xbcd0ff,MODERN.violet);
  building(g,795,mid-65*v,145,0x8bdadf,0x376ae5);
  tree(g,105,mid+38*v,1.05);
  // Low planter volumes and path lights sit away from puzzle hit areas.
  for(const x of [350,1060]){
    const y=mid+45*v;
    polygon(g,[x-30,y-9,x+22,y-9,x+34,y-17,x-18,y-17],0x97c4ed);
    g.fillStyle(0x527ac5).fillRoundedRect(x-30,y-8,52,19,3);
    polygon(g,[x+22,y-9,x+34,y-17,x+34,y+4,x+22,y+11],0x344c9a);
    for(let i=-1;i<=1;i++)g.fillStyle(i%2?0x41d9b0:0x8ee978).fillCircle(x+i*15,y-23,11);
  }
  for(const x of [160,390,720,1020]){
    const y=bottom+14;
    g.fillStyle(0x39549b).fillRoundedRect(x-14,y,28,8,3);
    g.fillStyle(MODERN.cyan,.35).fillEllipse(x,y+6,57,17);
    g.fillStyle(0x99fcf0).fillRoundedRect(x-10,y-2,20,4,2);
  }
  for(let i=0;i<20;i++) {
    const x=35+(i*137)%Math.floor(width-70),y=bottom+55+(i*43)%Math.max(1,Math.floor(mid*2-bottom-60));
    g.lineStyle(2,0x90e8a9,.7).lineBetween(x,y,x-4,y-9).lineBetween(x,y,x+5,y-7);
  }
}

export function modernTitle(scene:Phaser.Scene,width:number,height:number):void {
  const key=`modern-title-${width}-${height}`;
  if(!scene.textures.exists(key)) {
    const tex=scene.textures.createCanvas(key,width,height)!;const c=tex.getContext();
    const bg=c.createLinearGradient(0,0,width,height);bg.addColorStop(0,'#3159c6');bg.addColorStop(.55,'#283b9c');bg.addColorStop(1,'#181b56');
    c.fillStyle=bg;c.fillRect(0,0,width,height);
    const glow=c.createRadialGradient(width*.25,height*.35,0,width*.25,height*.35,width*.7);
    glow.addColorStop(0,'rgba(37,226,221,.4)');glow.addColorStop(1,'rgba(37,226,221,0)');c.fillStyle=glow;c.fillRect(0,0,width,height);tex.refresh();
  }
  scene.add.image(0,0,key).setOrigin(0).setDepth(-5);
  const mobile=height>width,g=scene.add.graphics(),hero=mobile?width/2:width*.25,base=mobile?height/2-168:height*.78;
  polygon(g,[0,height*.8,width*.55,0,width*.72,0,width*.17,height],0x6a7afa,.12);
  polygon(g,[hero-170,base-15,hero-130,base-215,hero+85,base-255,hero+168,base-10],0x39ecdc,.1);
  g.lineStyle(2,0x87faff,.28).lineBetween(hero-130,base-215,hero+85,base-255);
  g.fillStyle(0x0d215b,.4).fillEllipse(hero,base,245,36);
  g.fillStyle(MODERN.cyan,.18).fillEllipse(hero,base-4,227,17);
  building(g,hero-103,base-22,76,0xaccdff,MODERN.violet);
  building(g,hero+102,base-35,82,0x6cd6df,MODERN.blue);
  tree(g,hero+146,base-2,.5);
  const menu=mobile?width/2:width*.68;
  g.fillStyle(0x101e56,.52).fillRoundedRect(menu-220,height/2-155,440,340,12);
  g.fillStyle(MODERN.cyan).fillRoundedRect(menu-220,height/2-155,52,4,2);
  g.lineStyle(1,0xb8d5ff,.12).strokeRoundedRect(menu-220,height/2-155,440,340,12);
}
