import Phaser from 'phaser';
import { screenArt, cardArt, emblem, ART } from '../art/interfaceArt';
import { ProgressSystem } from '../systems/ProgressSystem';
import { SIDE_STORIES, storyAvailable, storyCompleted, storyEndings } from '../data/sideStories';
import { ensureRoundedRectTexture } from '../utils/uiTextures';
import { fadeToScene } from '../utils/sceneTransition';
export class JournalScene extends Phaser.Scene {
  constructor(){ super('JournalScene'); }
  create():void {
    const {width,height}=this.scale, mobile=height>width;
    const state=new ProgressSystem().snapshot();
    screenArt(this);
    this.add.text(width/2,45,'Historias del barrio',{fontFamily:'Georgia, serif',fontSize:'30px',color:'#34494e'}).setOrigin(.5);
    this.add.text(width/2,90,'Tres encargos · seis desenlaces · estilos para tu Nexus',{fontFamily:ART.body,fontSize:'16px',color:'#59695c',wordWrap:{width:width-50},align:'center'}).setOrigin(.5);
    SIDE_STORIES.forEach((story,i)=>{
      const x=mobile?width/2:width/2+(i-1)*298, y=mobile?215+i*217:270;
      const w=mobile?width-64:280,h=mobile?192:285;
      const card=this.add.graphics();
      cardArt(card,x-w/2,y-h/2,w,h,story.color);
      if(!mobile)emblem(card,story.id,x,y-h/2+33,story.color,18);
      else {card.fillStyle(story.color).fillRoundedRect(x-w/2+1,y-h/2+16,4,h-32,2);}
      this.add.text(x,y-h/2+(mobile?25:67),story.title,{fontFamily:ART.body,fontSize:'19px',fontStyle:'bold',color:'#34494e',wordWrap:{width:w-28},align:'center'}).setOrigin(.5,0);
      this.add.text(x,y-(mobile?32:48),story.need,{fontFamily:ART.body,fontSize:'15px',color:'#59695c',wordWrap:{width:w-30},align:'center'}).setOrigin(.5,0);
      const available=storyAvailable(story,state);
      this.add.text(x,y+(mobile?10:30),`${available?`Recompensa: ${story.reward}`:story.prerequisite}\nDesenlaces: ${storyEndings(story.id,state)}/2`,{fontFamily:ART.body,fontSize:'14px',color:'#6d624e',align:'center'}).setOrigin(.5,0);
      const label=!available?'Por descubrir':storyCompleted(story.id,state)?'Volver a la historia':'Explorar historia';
      ensureRoundedRectTexture(this,'journal-choice',210,44,12);
      const button=this.add.image(x,y+h/2-32,'journal-choice').setTint(available?story.color:0xd5d0bc);
      this.add.text(x,y+h/2-32,label,{fontFamily:ART.body,fontSize:'16px',color:'#34494e'}).setOrigin(.5);
      button.setName(`story-${story.id}`);
      if(available)button.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.scene.start('SideStoryScene',{id:story.id}));
    });
    ensureRoundedRectTexture(this,'journal-return',240,48,12);
    this.add.image(width/2,height-55,'journal-return').setTint(0x8dd4c5).setInteractive({useHandCursor:true}).on('pointerdown',()=>fadeToScene(this,'WorldScene'));
    this.add.text(width/2,height-55,'Volver al barrio',{fontFamily:ART.body,fontSize:'18px',color:'#34494e'}).setOrigin(.5);
  }
}
