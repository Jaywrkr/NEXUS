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

function modernGround(g:G,width:number,mid:number,v:number):void {
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
  for(let i=0;i<20;i++) {
    const x=35+(i*137)%Math.floor(width-70),y=bottom+55+(i*43)%Math.max(1,Math.floor(mid*2-bottom-60));
    g.lineStyle(2,0x90e8a9,.7).lineBetween(x,y,x-4,y-9).lineBetween(x,y,x+5,y-7);
  }
}


function planter(g:G,x:number,y:number):void {
  polygon(g,[x-30,y-9,x+22,y-9,x+34,y-17,x-18,y-17],0x97c4ed);
  g.fillStyle(0x527ac5).fillRoundedRect(x-30,y-8,52,19,3);
  polygon(g,[x+22,y-9,x+34,y-17,x+34,y+4,x+22,y+11],0x344c9a);
  for(let i=-1;i<=1;i++)g.fillStyle(i%2?MODERN.cyan:0x8ee978).fillCircle(x+i*15,y-23,11);
}

/** Seven original landmarks, baked once. Coordinates preserve the existing playable river. */
export function modernDistrict(g:G,width:number,mid:number,v:number,zone:number):void {
  modernGround(g,width,mid,v);
  const back=mid-112*v,bottom=mid+142*v;
  if(zone===0){
    building(g,265,mid+30*v,154,0xbcd0ff,MODERN.violet);
    building(g,795,mid-65*v,145,0x8bdadf,MODERN.blue);
    tree(g,105,mid+38*v,1.05);
    planter(g,350,mid+45*v);planter(g,1060,mid+45*v);
  }else if(zone===1){
    building(g,220,back+5,174,0x90e3dc,MODERN.blue);
    tree(g,width-70,back+35,.8);
    planter(g,64,bottom-4*v);planter(g,width-80,bottom-4*v);
    // Waterworks: glazed roof vent and an offset, shaded pipe.
    g.lineStyle(10,0x3659a4).lineBetween(125,back-24,85,back-24).lineBetween(85,back-24,85,back+16);
    g.lineStyle(3,0x8cecff).lineBetween(125,back-27,89,back-27);
  }else if(zone===2){
    building(g,360,back+6,146,0xc1b6ff,MODERN.violet);
    g.lineStyle(5,MODERN.ink).lineBetween(370,back-139,370,back-200);
    g.lineStyle(3,0x98daff).lineBetween(350,back-178,390,back-178);
    g.fillStyle(MODERN.yellow).fillCircle(370,back-204,6);
    for(const radius of [18,30])g.lineStyle(2,MODERN.cyan,.55).beginPath().arc(370,back-204,radius,-.7,.7).strokePath();
    tree(g,70,back+40,.7);
  }else if(zone===3){
    const bankY=mid-96*v;
    g.fillStyle(0x345caa).fillRect(150,bankY,100,mid*2-bankY);
    g.fillStyle(0x183976).fillRect(150,bankY,12,mid*2-bankY).fillRect(238,bankY,12,mid*2-bankY);
    g.fillStyle(0x44c5e3).fillRect(162,bankY,76,mid*2-bankY);
    for(let y=bankY+28;y<mid*2;y+=39){
      polygon(g,[174,y,205,y-4,229,y+2,199,y+6],0xa7fff4,.5);
      polygon(g,[140,y+10,149,y+1,149,y+21],0x88cbb5);
    }
    tree(g,436,back+70,1.1);planter(g,480,bottom+8*v);
  }else if(zone===4){
    // A faceted glass greenhouse: teal glazing, blue steel, reflected sky.
    polygon(g,[210,back-90,345,back-157,480,back-90,480,back+5,210,back+5],0x72dce3);
    polygon(g,[345,back-157,505,back-135,530,back-67,480,back-90],0x4c87ce);
    polygon(g,[480,back-90,530,back-67,530,back+27,480,back+5],0x347cb5);
    g.lineStyle(4,0x3256aa).strokeRect(210,back-90,270,95);
    for(let x=210;x<=480;x+=54)g.lineBetween(x,back-90,x,back+5).lineBetween(345,back-157,x,back-90);
    for(const x of [222,276,384])polygon(g,[x,back-80,x+35,back-80,x,back-39],0xe5ffff,.45);
    planter(g,255,back+4);planter(g,432,back+4);tree(g,65,back+46,.85);
  }else if(zone===5){
    building(g,435,back+8,246,0xffc078,MODERN.violet);
    polygon(g,[340,back-26,530,back-26,545,back+3,325,back+3],MODERN.blue);
    for(let x=340;x<530;x+=32)polygon(g,[x,back-26,x+15,back-26,x+20,back+3,x-5,back+3],0x93f5ec);
    g.fillStyle(0x34529b).fillRoundedRect(38,bottom,86,16,4);
    polygon(g,[38,bottom,124,bottom,136,bottom-9,50,bottom-9],0x9ec7ff);
    planter(g,680,back+44);
  }else{
    building(g,820,back+25,202,0xc7b7ff,MODERN.violet);
    g.lineStyle(2,MODERN.ink).beginPath().moveTo(130,back-32);
    for(let x=130;x<=width-60;x+=10)g.lineTo(x,back-32+Math.sin((x-130)/(width-190)*Math.PI)*25);
    g.strokePath();
    for(let x=145,i=0;x<width-70;x+=42,i++){
      const y=back-32+Math.sin((x-130)/(width-190)*Math.PI)*25;
      g.fillStyle([MODERN.cyan,MODERN.yellow,MODERN.violet,0xff75be][i%4]).fillTriangle(x-10,y,x+10,y,x,y+20);
    }
    tree(g,44,back+50,.85);tree(g,width-63,mid+113*v,1.1);
    for(const x of [135,435,710,1140])planter(g,x,bottom+18*v);
  }
  for(let x=160;x<width-50;x+=230){
    const y=bottom+14;
    g.fillStyle(0x39549b).fillRoundedRect(x-14,y,28,8,3);
    g.fillStyle(MODERN.cyan,.3).fillEllipse(x,y+6,57,17);
    g.fillStyle(0x99fcf0).fillRoundedRect(x-10,y-2,20,4,2);
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
