import Phaser from 'phaser';
import { screenArt, cardArt, ART } from '../art/interfaceArt';
import { SIDE_STORIES, storyAvailable, storyObjectId, type SideStory, type StoryId } from '../data/sideStories';
import { StoryMachine } from '../objects/StoryMachine';
import { ProgressSystem } from '../systems/ProgressSystem';
import { ConnectionSystem, type ConnectionRule } from '../systems/ConnectionSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { StoryCard } from '../ui/StoryCard';
import { unlockAppearance } from '../data/appearance';
import { ensureRoundedRectTexture } from '../utils/uiTextures';

export class SideStoryScene extends Phaser.Scene {
  private story!: SideStory;
  private machines=new Map<string,StoryMachine>();
  private connection!: ConnectionSystem;
  private progress!: ProgressSystem;
  private speech!: StoryCard;
  private objective!: Phaser.GameObjects.Text;
  private hintLevel=0;
  private repeat?: Phaser.GameObjects.Image;
  constructor(){ super('SideStoryScene'); }
  init(data:{id?:StoryId}):void { this.story=SIDE_STORIES.find(s=>s.id===data.id)??SIDE_STORIES[0]; }
  create():void {
    this.progress=new ProgressSystem();
    if(!storyAvailable(this.story,this.progress.snapshot())){this.scene.start('JournalScene');return;}
    const {width,height}=this.scale,mobile=height>width;
    this.machines=new Map();this.hintLevel=0;
    screenArt(this, false, false);
    const room=this.add.graphics();

    const top=mobile?195:150,bottom=height-110;
    cardArt(room,35,top,width-70,bottom-top,this.story.color);
    room.fillStyle(0xe4dcc5,.55).fillRoundedRect(43,top+8,width-86,bottom-top-16,14);
    for(let y=top+12;y<bottom-20;y+=30)for(let x=50+(Math.floor(y/30)%2)*23;x<width-85;x+=48){
      room.lineStyle(1,0xb8a786,.3).strokeRoundedRect(x,y,42,24,5);
    }
    this.add.text(width/2,38,this.story.title,{fontFamily:'Georgia, serif',fontSize:'26px',color:'#34494e'}).setOrigin(.5);
    this.objective=this.add.text(width/2,70,'',{fontFamily:ART.body,fontSize:'15px',color:'#59695c',align:'center',wordWrap:{width:width-80}}).setOrigin(.5,0);
    const six=this.story.nodes.length===6;
    const positions=mobile?(six?[[.25,240],[.75,240],[.5,405],[.25,575],[.75,575],[.5,735]]:[[.25,240],[.75,240],[.25,410],[.25,575],[.75,575],[.75,410],[.5,735]])
      :(six?[[.11,270],[.29,270],[.48,270],[.68,205],[.68,350],[.88,270]]:[[.1,270],[.27,270],[.44,205],[.44,350],[.63,350],[.63,205],[.87,270]]);
    this.connection=new ConnectionSystem(this,new AudioSystem());
    this.story.nodes.forEach((node,i)=>{
      const [x,y]=positions[i];
      const machine=new StoryMachine(this,width*x,y,storyObjectId(this.story.id,node.id),node,this.story.links.some(l=>l.source===node.id),node.id==='source');
      this.machines.set(node.id,machine);this.connection.register(machine);
    });
    this.story.links.forEach(link=>{
      const choices=this.story.links.filter(l=>l.choice);
      const rule:ConnectionRule={sourceId:storyObjectId(this.story.id,link.source),targetId:storyObjectId(this.story.id,link.target),
        onActivate:()=>{
          if(link.choice)choices.forEach(l=>this.machines.get(l.target)!.setPowered(l.target===link.target));
          this.machines.get(link.target)!.receive(link.credit??link.source);
        },
      };
      if(link.choice){
        rule.exclusiveGroup=`side-choice-${this.story.id}`;
        rule.available=()=>!choices.some(l=>this.machines.get(l.target)!.isActive);
        rule.restoreAvailable=()=>true;
        rule.blockedMessage='El encargo acepta una sola propuesta. Al terminar puedes repetirlo y elegir otra.';
      }
      this.connection.addRule(rule);
    });
    this.connection.restoreConnections(this.progress.getConnections());
    this.speech=new StoryCard(this);
    this.speech.show(this.story.resident,this.story.introduction);
    const onMade=(target:string,source:string):void=>{
      const choice=this.story.links.some(l=>l.choice&&storyObjectId(this.story.id,l.target)===target);
      if(choice)this.progress.saveExclusiveConnection(source,target,this.story.links.filter(l=>l.choice&&storyObjectId(this.story.id,l.source)===source).map(l=>storyObjectId(this.story.id,l.target)));
      else this.progress.saveConnection(source,target);
      this.hintLevel=0;this.refresh();
    };
    this.events.on('connection-made',onMade);
    this.events.once('shutdown',()=>this.events.off('connection-made',onMade));
    this.button(75,height-42,112,'Pista',()=>this.showHint());
    this.button(width/2,height-42,230,'Volver al diario',()=>this.scene.start('JournalScene'));
    this.repeat=this.button(width-80,height-42,130,'Repetir',()=>{
      this.progress.restartStory(this.story.id);this.scene.restart({id:this.story.id});
    }).setVisible(false);
    this.refresh(false);
  }

  update():void { this.connection?.updateHint(); }
  private pending(){
    const saved=this.progress.getConnections();
    return this.story.links.find(l=>!saved.some(c=>c.sourceId===storyObjectId(this.story.id,l.source)&&c.targetId===storyObjectId(this.story.id,l.target))&&this.machines.get(l.source)!.canInitiate()&&!this.machines.get(l.target)!.isActive
      &&(!l.choice||!this.story.links.filter(c=>c.choice).some(c=>this.machines.get(c.target)!.isActive)));
  }
  private result(){
    const choices=this.story.endings.filter(e=>this.machines.get(e.choice)!.isActive);
    const finished=this.story.id==='flowers'?choices.length>0:this.machines.get('finish')!.isActive;
    return finished?choices[0]:undefined;
  }
  private refresh(celebrate=true):void {
    const ending=this.result();
    this.repeat?.setVisible(Boolean(ending));
    if(ending){
      const marker=`side-ending-${this.story.id}-${ending.choice}`;
      const fresh=!this.progress.snapshot().story?.discoveries.includes(marker);
      this.progress.markDiscovery(`side-finished-${this.story.id}`);this.progress.markDiscovery(marker);
      unlockAppearance(this.story.id);
      this.objective.setText(`${ending.title} · ${this.story.reward} conseguida`);
      if(celebrate&&fresh)this.speech.show(this.story.resident,ending.line);
    }else{
      const credits=this.story.nodes.filter(n=>n.required===2).find(n=>!this.machines.get(n.id)!.isActive);
      this.objective.setText(credits?`${credits.label} necesita dos señales distintas` : this.story.need);
    }
  }
  private showHint():void {
    if(this.result()){this.speech.show('Otro desenlace','Puedes repetir este encargo y probar la otra propuesta. Tu estilo ganado se conserva.');return;}
    const next=this.pending();
    if(!next)return;
    const source=this.story.nodes.find(n=>n.id===next.source)!,target=this.story.nodes.find(n=>n.id===next.target)!;
    const clues=[this.story.need,`${source.label} ya funciona. ¿Qué puede hacer por ${target.label.toLowerCase()}?`,`${source.label} → ${target.label}.`];
    const level=Math.min(this.hintLevel++,2);
    this.speech.show(`Pista ${level+1}/3`,clues[level]);this.connection.resetHint();
  }
  private button(x:number,y:number,width:number,label:string,callback:()=>void):Phaser.GameObjects.Image {
    const key=`side-button-${width}`;ensureRoundedRectTexture(this,key,width,42,12);
    const image=this.add.image(x,y,key).setTint(this.story.color).setDepth(50).setInteractive({useHandCursor:true});
    const text=this.add.text(x,y,label,{fontFamily:ART.body,fontSize:'15px',color:'#34494e'}).setOrigin(.5).setDepth(51);
    if(label==='Repetir'){
      const sync=()=>text.setVisible(image.visible);this.events.on('postupdate',sync);
      this.events.once('shutdown',()=>this.events.off('postupdate',sync));
    }
    image.on('pointerdown',callback);return image;
  }
}
