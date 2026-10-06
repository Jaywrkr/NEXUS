import Phaser from 'phaser';

/** Visual materials only: no input, scene navigation, saved state or animation. */
export const ART = {
  ink: 0x243f48, paper: 0xfaf2df, brass: 0xc9a36b, teal: 0x87c9bb,
  body: '"Trebuchet MS", Arial, sans-serif', display: 'Georgia, serif',
};
type G = Phaser.GameObjects.Graphics;

export function ornament(g: G, x: number, y: number, width: number, color = ART.brass): void {
  g.lineStyle(1, color, .65).lineBetween(x-width/2,y,x-12,y).lineBetween(x+12,y,x+width/2,y);
  g.fillStyle(color).fillTriangle(x,y-5,x-5,y,x,y+5).fillTriangle(x,y-5,x+5,y,x,y+5);
  g.fillCircle(x-width/2,y,2).fillCircle(x+width/2,y,2);
}

/** Baked, size-specific backdrop: paper grain, soft lighting and a quiet inset frame. */
export function screenArt(scene: Phaser.Scene, dark = false, headingRule = true): void {
  const {width,height}=scene.scale;
  const key=`art-screen-${width}-${height}-${dark}`;
  if(!scene.textures.exists(key)) {
    const tex=scene.textures.createCanvas(key,width,height)!;const c=tex.getContext();
    const bg=c.createLinearGradient(0,0,width,height);
    bg.addColorStop(0,dark?'#112c37':'#24434a');bg.addColorStop(1,dark?'#071b26':'#112e38');
    c.fillStyle=bg;c.fillRect(0,0,width,height);
    c.shadowColor='rgba(0,0,0,.3)';c.shadowBlur=18;c.shadowOffsetY=8;
    c.beginPath();c.roundRect(16,16,width-32,height-32,22);
    const paper=c.createLinearGradient(0,16,0,height-16);
    paper.addColorStop(0,dark?'#29434b':'#fff9eb');paper.addColorStop(1,dark?'#142e38':'#eadbc0');
    c.fillStyle=paper;c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
    // Deterministic stipple: baked once, with no randomness or per-frame cost.
    for(let i=0;i<width*height/135;i++) {
      const x=28+(i*137.23)%(width-56),y=28+(i*71.81)%(height-56);
      c.fillStyle=dark?'rgba(236,215,170,.025)':'rgba(101,75,38,.035)';c.fillRect(x,y,1,1);
    }
    const light=c.createRadialGradient(width*.4,height*.15,0,width*.4,height*.15,width*.8);
    light.addColorStop(0,dark?'rgba(124,184,168,.09)':'rgba(255,255,255,.4)');light.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=light;c.fillRect(26,26,width-52,height-52);
    c.strokeStyle=dark?'rgba(202,165,108,.5)':'rgba(131,98,52,.45)';c.lineWidth=1;
    const frame=(inset:number,r:number)=>{
      const bottom=height-inset;
      c.beginPath();c.moveTo(60,bottom);c.lineTo(inset+r,bottom);
      c.quadraticCurveTo(inset,bottom,inset,bottom-r);c.lineTo(inset,inset+r);
      c.quadraticCurveTo(inset,inset,inset+r,inset);c.lineTo(width-inset-r,inset);
      c.quadraticCurveTo(width-inset,inset,width-inset,inset+r);c.lineTo(width-inset,bottom-r);
      c.quadraticCurveTo(width-inset,bottom,width-inset-r,bottom);c.lineTo(width-60,bottom);c.stroke();
    };
    // The bottom keyline leaves an opening for existing footer text.
    frame(25.5,16);
    c.strokeStyle=dark?'rgba(247,227,191,.08)':'rgba(255,255,255,.8)';
    frame(29.5,13);
    tex.refresh();
  }
  scene.add.image(0,0,key).setOrigin(0).setDepth(-5);
  const trim=scene.add.graphics().setDepth(-4);
  if(headingRule)ornament(trim,width/2,78,Math.min(190,width*.35));
  for(const x of [35,width-35])for(const y of [35,height-35]){
    trim.lineStyle(2,ART.brass,.7).lineBetween(x,y,x+(x<width/2?14:-14),y).lineBetween(x,y,x,y+(y<height/2?14:-14));
    trim.fillStyle(ART.brass,.8).fillCircle(x,y,2);
  }
}

export function cardArt(g: G, x: number, y: number, width: number, height: number, accent: number, dark=false): void {
  g.fillStyle(0x122d36,.12).fillRoundedRect(x+3,y+6,width,height,16);
  g.fillStyle(dark?0x18343e:0xfffaee).fillRoundedRect(x,y,width,height,16);
  g.lineStyle(1,accent,.65).strokeRoundedRect(x+.5,y+.5,width-1,height-1,16);
  g.lineStyle(1,dark?0xffffff:0xc9a36b,dark?.08:.18).strokeRoundedRect(x+5,y+5,width-10,height-10,12);
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
