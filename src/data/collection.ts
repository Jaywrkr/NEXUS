/** Shared by the world and museum so rewards and completion stay in sync. */
export const COLLECTION = [
  { id: 'plaza-fragment', label: 'Luz de la plaza', memory: '¡La plaza se iluminó!', color: 0xffe066 },
  { id: 'fountain-fragment', label: 'Gota de la fuente', memory: '¡El agua volvió a fluir!', color: 0x5ee7ff },
  { id: 'beacon-fragment', label: 'Señal de la antena', memory: '¡Dos cables, una señal!', color: 0xff9ff3 },
  { id: 'bridge-fragment', label: 'Puente de madera', memory: '¡Ya podemos cruzar!', color: 0xcfa574 },
  { id: 'garden-fragment', label: 'Flor del jardín', memory: '¡El jardín volvió a florecer!', color: 0xffb86c },
  { id: 'workshop-fragment', label: 'Pato del taller', memory: '¡Cuac! Ahora soy tu supervisor.', color: 0xffe066 },
];

export type Souvenir = typeof COLLECTION[number];
