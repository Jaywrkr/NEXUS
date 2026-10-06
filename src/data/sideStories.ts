import type { GameState } from './gameState';
import { hasChapterConnection } from './chapter.ts';
export type StoryId = 'mail' | 'toys' | 'flowers';
export interface StoryNode { id: string; label: string; kind: string; required?: number }
export interface StoryLink { source: string; target: string; credit?: string; choice?: boolean }
export interface SideStory {
  id: StoryId; title: string; resident: string; color: number; prerequisite: string; fragment: string; target: string;
  introduction: string; need: string; reward: string; nodes: StoryNode[]; links: StoryLink[];
  endings: { choice: string; title: string; line: string }[];
}
export const SIDE_STORIES: SideStory[] = [
  { id:'mail', title:'El correo indisciplinado', resident:'Miga', color:0x80b8ac, prerequisite:'Repara la plaza', fragment:'plaza-fragment', target:'door',
    introduction:'El buzón entrega insultos a las tostadas. Miga sospecha que el traductor confunde sinceridad con crueldad. El correo acepta una sola versión de cada carta.',
    need:'Ordena las cartas, tradúcelas y elige cómo debe hablar el buzón.', reward:'Chaqueta ámbar',
    nodes:[{id:'source',label:'Chispa postal',kind:'power'},{id:'sorter',label:'Ordenador de cartas',kind:'mail'},
      {id:'translator',label:'Traductor',kind:'filter'},{id:'kind',label:'Diplomacia',kind:'flower'},
      {id:'loud',label:'Sinceridad brutal',kind:'speaker'},{id:'finish',label:'Buzón de Miga',kind:'mail'}],
    links:[{source:'source',target:'sorter'},{source:'sorter',target:'translator'},
      {source:'translator',target:'kind',choice:true},{source:'translator',target:'loud',choice:true},
      {source:'kind',target:'finish'},{source:'loud',target:'finish'}],
    endings:[{choice:'kind',title:'Correo diplomático',line:'La tostada es «pan con ambiciones». Miga abraza al buzón. El buzón solicita una distancia profesional.'},
      {choice:'loud',title:'Correo demasiado sincero',line:'El buzón declara que las tostadas son pan quemado. Miga funda el sindicato de desayunos incomprendidos.'}],
  },
  { id:'toys', title:'La inspección del pato', resident:'Pipa', color:0xb59bca, prerequisite:'Completa el desfile del taller', fragment:'workshop-fragment', target:'toy-parade',
    introduction:'El pato inspector exige que una rueda cuadrada sea segura y entretenida. Hay que probar su freno y presentar una sola propuesta: hacerle reír o dormirlo.',
    need:'Prepara una rueda segura y convence al inspector con dos pruebas distintas.', reward:'Insignia de pato',
    nodes:[{id:'source',label:'Chispa del taller',kind:'power'},{id:'engine',label:'Rueda cuadrada',kind:'wheel'},
      {id:'brake',label:'Freno educado',kind:'brake'},{id:'laugh',label:'Máquina de chistes',kind:'speaker'},
      {id:'sleep',label:'Arrullador',kind:'moon'},{id:'judge',label:'Inspector pato',kind:'duck',required:2},{id:'finish',label:'Sello de aprobación',kind:'mail'}],
    links:[{source:'source',target:'engine'},{source:'engine',target:'brake'},
      {source:'engine',target:'laugh',choice:true},{source:'engine',target:'sleep',choice:true},
      {source:'brake',target:'judge',credit:'safety'},{source:'laugh',target:'judge',credit:'proposal'},{source:'sleep',target:'judge',credit:'proposal'},
      {source:'judge',target:'finish'}],
    endings:[{choice:'laugh',title:'Aprobación entre carcajadas',line:'El pato se ríe de la rueda cuadrada. Aprueba el taller, pero exige cobrar los chistes en migas.'},
      {choice:'sleep',title:'Aprobación bajo una siesta',line:'El inspector firma dormido. Pipa guarda el certificado junto a su nuevo manual: «Roncar también es supervisar».'}],
  },
  { id:'flowers', title:'Flores de madrugada', resident:'Alcalde Goteo', color:0xe1b381, prerequisite:'Haz florecer el jardín', fragment:'garden-fragment', target:'garden-bed',
    introduction:'Las flores quieren actuar después de la fiesta. Su concierto necesita ritmo y perfume. Luego decidirán si amanecen cantando o le dan serenata a la luna.',
    need:'Mezcla dos señales para el concierto y elige a quién se lo dedicarán.', reward:'Corona del jardín',
    nodes:[{id:'source',label:'Chispa del jardín',kind:'power'},{id:'conductor',label:'Director regadera',kind:'filter'},
      {id:'rhythm',label:'Ritmo de lluvia',kind:'speaker'},{id:'aroma',label:'Perfume afinado',kind:'flower'},
      {id:'stage',label:'Concierto',kind:'stage',required:2},{id:'moon',label:'Serenata lunar',kind:'moon'},{id:'sun',label:'Coro del amanecer',kind:'sun'}],
    links:[{source:'source',target:'conductor'},{source:'conductor',target:'rhythm'},{source:'conductor',target:'aroma'},
      {source:'rhythm',target:'stage',credit:'rhythm'},{source:'aroma',target:'stage',credit:'aroma'},
      {source:'stage',target:'moon',choice:true},{source:'stage',target:'sun',choice:true}],
    endings:[{choice:'moon',title:'La luna pide un bis',line:'La luna aplaude sin manos. Goteo declara que eso confirma su teoría de los aplausos administrativos.'},
      {choice:'sun',title:'Amanecer con polen',line:'El sol llega temprano al concierto. Las flores estornudan. Goteo lo anuncia como un nuevo género musical.'}],
  },
];
export const storyObjectId = (story: StoryId, node: string): string => `side-${story}-${node}`;
export function storyAvailable(story: SideStory, state: GameState): boolean {
  return state.fragmentsCollected.includes(story.fragment) || hasChapterConnection(state,story.target);
}
export function storyCompleted(id: StoryId, state: GameState): boolean { return state.story?.discoveries.includes(`side-finished-${id}`) ?? false; }
export function storyEndings(id: StoryId, state: GameState): number {
  return SIDE_STORIES.find(s=>s.id===id)!.endings.filter(e=>state.story?.discoveries.includes(`side-ending-${id}-${e.choice}`)).length;
}
export function sideResidentLine(resident: string, state: GameState): string | undefined {
  const story=SIDE_STORIES.find(s=>s.resident===resident);
  if (!story || !storyCompleted(story.id,state)) return undefined;
  const ending=story.endings.findLast(e=>state.story?.discoveries.includes(`side-ending-${story.id}-${e.choice}`));
  return ending?.line;
}
