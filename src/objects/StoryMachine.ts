import Phaser from 'phaser';
import { ART } from '../art/interfaceArt';
import { ConnectableObject } from './ConnectableObject';
import type { StoryNode } from '../data/sideStories';
import { workshopArt, lanternArt } from '../art/props';

/** Named signal credits keep two variants of the same proposal from counting twice. */
export class StoryMachine extends ConnectableObject {
  protected override get sketchKind(): string { return ({ power: 'generator', wheel: 'motor', brake: 'bridge', flower: 'flowers' } as Record<string, string>)[this.node.kind] ?? (this.node.kind === 'filter' && this.id.includes('translator') ? 'translator' : this.node.kind === 'mail' && this.id.endsWith('finish') ? 'mailbox' : this.node.kind); }
  private art: Phaser.GameObjects.Graphics;
  private credits = new Set<string>();
  private counter?: Phaser.GameObjects.Text;
  private node: StoryNode;
  private emits: boolean;
  constructor(scene: Phaser.Scene, x: number, y: number, id: string, node: StoryNode, emits: boolean, source: boolean) {
    super(scene,x,y,id,source?'source':'target');
    this.node=node; this.emits=emits;
    this.active_=source;
    this.art=scene.add.graphics(); this.add(this.art); this.addShadow(43,78,12);
    this.add(scene.add.text(0,58,node.label,{fontFamily:ART.body,fontSize:'14px',color:'#ffffff',align:'center',wordWrap:{width:130}}).setOrigin(0.5,0));
    if (node.required===2) { this.counter=scene.add.text(0,37,'0/2',{fontFamily:ART.body,fontSize:'14px',color:'#ffffff',backgroundColor:'#14234e'}).setOrigin(0.5); this.add(this.counter); }
    this.draw(); this.setSize(96,106).setDepth(11).setInteractive(new Phaser.Geom.Rectangle(0,0,96,106),Phaser.Geom.Rectangle.Contains);
  }
  canInitiate(): boolean { return this.emits&&this.active_; }
  receive(credit: string): void { this.credits.add(credit); this.active_=this.credits.size >= (this.node.required??1); this.draw(); }
  setPowered(active: boolean): void { this.active_=active; this.draw(); }
  activate(): void { if ((this.node.required??1)===1) this.active_=true; this.draw(); }
  private draw(): void {
    const g=this.art.clear(); const color=this.active_?0xffe342:0x91a6bf;
    if (this.node.kind==='wheel'||this.node.kind==='filter') workshopArt(g,'motor',this.active_,0);
    else if(this.node.kind==='duck') workshopArt(g,'duck',this.active_,0);
    else if(this.node.kind==='stage') lanternArt(g,'stage',this.active_,0xb59bca);
    else {
      g.fillStyle(0x14234e).fillRoundedRect(-35,-34,70,70,9);
      g.fillStyle(0x67b7fa).fillRoundedRect(-31,-30,62,62,7);
      g.fillStyle(0x233875).fillRoundedRect(-27,-26,54,54,5);
      g.lineStyle(3,color).strokeRoundedRect(-24,-23,48,48,4);
      g.fillStyle(0x14234e).fillRoundedRect(-39,29,78,10,3);
      g.fillStyle(0x27e7da).fillRoundedRect(-36,29,72,3,1);
      for(const x of [-30,30])for(const y of [-29,28]){
        g.fillStyle(0xf4faff).fillCircle(x,y,2);g.lineStyle(1,0x345cdd).lineBetween(x-1,y,x+1,y);
      }
      g.lineStyle(2,0x91bbff).lineBetween(-12,-34,-12,-41).lineBetween(-12,-41,12,-41).lineBetween(12,-41,12,-34);
      g.fillStyle(color);
      if(this.node.kind==='power') {
        g.fillTriangle(-3,-21,-15,3,0,3).fillTriangle(1,-4,14,-4,-1,23);
      } else if(this.node.kind==='mail') {
        g.fillRoundedRect(-19,-12,38,25,3); g.lineStyle(2,0xf4faff).lineBetween(-17,-10,0,3).lineBetween(0,3,17,-10);
      } else if(this.node.kind==='speaker') {
        g.fillCircle(0,0,17);g.fillStyle(0x14234e).fillCircle(0,0,10);g.fillStyle(color).fillCircle(0,0,4);
      } else if(this.node.kind==='flower') {
        for(let i=0;i<5;i++)g.fillCircle(Math.cos(i*1.26)*11,Math.sin(i*1.26)*11,7);
        g.fillStyle(0xe8a28b).fillCircle(0,0,6);
      } else if(this.node.kind==='moon') {
        g.fillCircle(0,0,19);g.fillStyle(0x233875).fillCircle(9,-7,16);
      } else if(this.node.kind==='sun') {
        g.fillCircle(0,0,13);g.lineStyle(3,color);
        for(let i=0;i<8;i++)g.lineBetween(Math.cos(i*.785)*18,Math.sin(i*.785)*18,Math.cos(i*.785)*23,Math.sin(i*.785)*23);
      } else {
        g.fillRoundedRect(-18,-7,36,14,4);g.fillStyle(0x14234e).fillCircle(-13,16,4).fillCircle(13,16,4);
      }
    }
    this.counter?.setText(`${this.credits.size}/2`);
  }
}
