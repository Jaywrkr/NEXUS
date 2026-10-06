import Phaser from 'phaser';
import { ProgressSystem } from '../systems/ProgressSystem';
import { SIDE_STORIES, storyAvailable, storyCompleted, storyEndings } from '../data/sideStories';
import { ensureRoundedRectTexture } from '../utils/uiTextures';
import { fadeToScene } from '../utils/sceneTransition';
export class JournalScene extends Phaser.Scene {
  constructor(){ super('JournalScene'); }
  create():void {
    const {width,height}=this.scale, mobile=height>width;
    const state=new ProgressSystem().snapshot();
    this.cameras.main.setBackgroundColor('#bed4c6');
    this.add.text(width/2,45,'Historias del barrio',{fontFamily:'Georgia, serif',fontSize:'30px',color:'#34494e'}).setOrigin(.5);
    this.add.text(width/2,90,'Tres encargos · seis desenlaces · estilos para tu Nexus',{fontFamily:'sans-serif',fontSize:'16px',color:'#59695c',wordWrap:{width:width-50},align:'center'}).setOrigin(.5);
    SIDE_STORIES.forEach((story,i)=>{
      const x=mobile?width/2:width/2+(i-1)*298, y=mobile?215+i*217:270;
      const w=mobile?width-50:280,h=mobile?192:285;
      const card=this.add.graphics();card.fillStyle(0xffefd1).fillRoundedRect(x-w/2,y-h/2,w,h,18).lineStyle(2,story.color).strokeRoundedRect(x-w/2+5,y-h/2+5,w-10,h-10,14);
      this.add.text(x,y-h/2+25,story.title,{fontFamily:'sans-serif',fontSize:'19px',fontStyle:'bold',color:'#34494e',wordWrap:{width:w-28},align:'center'}).setOrigin(.5,0);
      this.add.text(x,y-(mobile?32:48),story.need,{fontFamily:'sans-serif',fontSize:'15px',color:'#59695c',wordWrap:{width:w-30},align:'center'}).setOrigin(.5,0);
      const available=storyAvailable(story,state);
      this.add.text(x,y+(mobile?10:30),`${available?`Recompensa: ${story.reward}`:story.prerequisite}\nDesenlaces: ${storyEndings(story.id,state)}/2`,{fontFamily:'sans-serif',fontSize:'14px',color:'#6d624e',align:'center'}).setOrigin(.5,0);
      const label=!available?'Por descubrir':storyCompleted(story.id,state)?'Volver a la historia':'Explorar historia';
      ensureRoundedRectTexture(this,'journal-choice',210,44,12);
      const button=this.add.image(x,y+h/2-32,'journal-choice').setTint(available?story.color:0xd5d0bc);
      this.add.text(x,y+h/2-32,label,{fontFamily:'sans-serif',fontSize:'16px',color:'#34494e'}).setOrigin(.5);
      button.setName(`story-${story.id}`);
      if(available)button.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.scene.start('SideStoryScene',{id:story.id}));
    });
    ensureRoundedRectTexture(this,'journal-return',240,48,12);
    this.add.image(width/2,height-55,'journal-return').setTint(0x8dd4c5).setInteractive({useHandCursor:true}).on('pointerdown',()=>fadeToScene(this,'WorldScene'));
    this.add.text(width/2,height-55,'Volver al barrio',{fontFamily:'sans-serif',fontSize:'18px',color:'#34494e'}).setOrigin(.5);
  }
}
