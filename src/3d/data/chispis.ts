/*
 * Las cartas de Chispis (Fase 3, PLAN_MAESTRO.md §7). 40 criaturas originales en 9 tipos.
 * Cada carta sale de un lugar: rescate en el Mundo Voltio, intercambio con un vecino, o sobres
 * (escondidos por el mundo y los que deja cada lugar que revive). Si Luca inventa Chispis,
 * se agregan acá tal cual.
 */

export type ChispiType = 'luz' | 'agua' | 'radio' | 'flor' | 'ruedas' | 'feria' | 'bosque' | 'via' | 'mar';
export type Rarity = 'comun' | 'brillante' | 'dorada';
export type CardSource = 'sobre' | 'rescate' | 'cambio';

export interface ChispiCard {
  id: string;
  name: string;
  type: ChispiType;
  rarity: Rarity;
  source: CardSource;
  /** Vecino que la cambia (solo source 'cambio'). */
  trader?: string;
  /** Frase graciosa de la carta. */
  phrase: string;
}

export interface TypeInfo {
  name: string;
  icon: string;
  color: string;
  dark: string;
  /** Ayudita de compañero (llega en la Fase 4). */
  helper: string;
}

export const TYPES: Record<ChispiType, TypeInfo> = {
  luz: { name: 'Luz', icon: '💡', color: '#ffd23a', dark: '#b8860b', helper: 'Señala las chispitas cercanas' },
  agua: { name: 'Agua', icon: '💧', color: '#5ec8ff', dark: '#1f6fa8', helper: 'Los charcos te dan un impulso' },
  radio: { name: 'Radio', icon: '📻', color: '#b77cff', dark: '#5b2fa0', helper: 'Escucha dónde hay sobres escondidos' },
  flor: { name: 'Flor', icon: '🌸', color: '#ff8fc8', dark: '#b03a7a', helper: 'Las cosas despiertas dan más color' },
  ruedas: { name: 'Ruedas', icon: '🛹', color: '#ff9f43', dark: '#b05a10', helper: 'Más velocidad en patineta' },
  feria: { name: 'Feria', icon: '🎪', color: '#ff5a6e', dark: '#a01f33', helper: 'Las carreras de luz dan más chispitas' },
  bosque: { name: 'Bosque', icon: '🍃', color: '#7be07a', dark: '#2f8a2e', helper: 'Saltás un poco más alto' },
  via: { name: 'Vía', icon: '🚂', color: '#c7a17a', dark: '#6e5133', helper: 'Caminás más rápido, como un tren' },
  mar: { name: 'Mar', icon: '🌊', color: '#3f7fd6', dark: '#163f80', helper: 'Más voltaje en el Mundo Voltio' },
};

export const TYPE_ORDER: ChispiType[] = ['luz', 'agua', 'radio', 'flor', 'ruedas', 'feria', 'bosque', 'via', 'mar'];

export const RARITY_NAMES: Record<Rarity, string> = { comun: 'Común', brillante: 'Brillante ✦', dorada: 'Dorada ★' };

const c = (id: string, name: string, type: ChispiType, rarity: Rarity, source: CardSource, phrase: string, trader?: string): ChispiCard => ({
  id,
  name,
  type,
  rarity,
  source,
  phrase,
  trader,
});

export const CARDS: ChispiCard[] = [
  // Luz
  c('chispazo', 'Chispazo', 'luz', 'brillante', 'rescate', 'Prende la luz de la plaza con un estornudo.'),
  c('foquito', 'Foquito', 'luz', 'comun', 'sobre', 'Cuando tiene una idea, se le prende la cabeza.'),
  c('linternin', 'Linternín', 'luz', 'brillante', 'cambio', 'Le tiene miedo a la oscuridad, por eso brilla. Lucio lo cuida.', 'lucio'),
  c('tuerquin', 'Tuerquín', 'luz', 'brillante', 'cambio', 'Ayuda a Miga a arreglar todo… y a desarmarlo.', 'miga'),
  c('faroluz', 'Faroluz', 'luz', 'dorada', 'rescate', 'Dicen que vio a la Gran Chispa antes de romperse.'),
  // Agua
  c('gotita', 'Gotita', 'agua', 'brillante', 'rescate', 'Salta de charco en charco sin mojarse nunca.'),
  c('charquin', 'Charquín', 'agua', 'comun', 'sobre', 'Se esconde en los charcos y salpica a las palomas.'),
  c('burbujo', 'Burbujo', 'agua', 'comun', 'sobre', 'Habla con burbujas. Nadie le entiende, pero es simpático.'),
  c('salpicon', 'Salpicón', 'agua', 'brillante', 'cambio', 'Baila al ritmo del tambor de Bombo.', 'bombo'),
  c('cascadita', 'Cascadita', 'agua', 'dorada', 'sobre', 'Duerme en la fuente y sueña con el mar.'),
  // Radio
  c('antenita', 'Antenita', 'radio', 'brillante', 'rescate', 'Agarra radios de otros planetas (o eso dice).'),
  c('ondita', 'Ondita', 'radio', 'comun', 'sobre', 'Repite todo lo que escucha, pero más agudo.'),
  c('parlantin', 'Parlantín', 'radio', 'brillante', 'cambio', 'Trabaja en CUAC FM anunciando el clima.', 'vera'),
  c('frecuencio', 'Frecuencio', 'radio', 'dorada', 'sobre', 'Cuando canta, todas las radios del barrio se prenden.'),
  // Flor
  c('brotecito', 'Brotecito', 'flor', 'brillante', 'rescate', 'Crece un centímetro cada vez que alguien sonríe.'),
  c('petalo', 'Pétalo', 'flor', 'comun', 'sobre', 'Se pone colorado cuando le dicen que es lindo.'),
  c('regadin', 'Regadín', 'flor', 'brillante', 'cambio', 'El Alcalde Goteo lo nombró ministro del riego.', 'goteo'),
  c('girasolin', 'Girasolín', 'flor', 'brillante', 'rescate', 'Siempre mira hacia donde está la diversión.'),
  c('floripon', 'Floripón', 'flor', 'dorada', 'sobre', 'Su perfume hace estornudar a las Estáticas.'),
  // Ruedas
  c('rueditas', 'Rueditas', 'ruedas', 'brillante', 'rescate', 'Le encanta la velocidad y hacer chispas al frenar.'),
  c('ruleman', 'Rulemán', 'ruedas', 'brillante', 'cambio', 'Rulo lo encontró adentro de una patineta vieja.', 'rulo'),
  c('ollin', 'Ollín', 'ruedas', 'comun', 'sobre', 'Salta todo el día, hasta dormido.'),
  c('patinon', 'Patinón', 'ruedas', 'comun', 'sobre', 'Frena con la nariz. No se lo recomienda a nadie.'),
  c('turbochispa', 'Turbochispa', 'ruedas', 'dorada', 'rescate', 'Una vez fue tan rápido que llegó ayer.'),
  // Feria
  c('pochoclin', 'Pochoclín', 'feria', 'brillante', 'rescate', 'Explota de alegría. Literalmente: ¡pop!'),
  c('calesito', 'Calesito', 'feria', 'brillante', 'cambio', 'Da vueltas y vueltas y nunca se marea. Pipa lo armó.', 'pipa'),
  c('globin', 'Globín', 'feria', 'brillante', 'rescate', 'Si lo soltás, se va volando a saludar a las nubes.'),
  c('monito', 'Moñito', 'feria', 'brillante', 'cambio', 'Don Paso le enseñó a saludar como una estrella.', 'don-paso'),
  // Bosque
  c('hojin', 'Hojín', 'bosque', 'brillante', 'sobre', 'En otoño se pone naranja y se hace el importante.'),
  c('ventarron', 'Ventarrón', 'bosque', 'brillante', 'rescate', 'Sopla tan fuerte que despeina a las palomas.'),
  c('pinita', 'Piñita', 'bosque', 'brillante', 'rescate', 'Rueda cerro abajo cuando se aburre.'),
  c('musguito', 'Musguito', 'bosque', 'brillante', 'rescate', 'Es suave como una almohada y igual de dormilón.'),
  // Vía
  c('vagoncito', 'Vagoncito', 'via', 'comun', 'sobre', 'Lleva chispitas de un lado al otro, sin boleto.'),
  c('silbatin', 'Silbatín', 'via', 'brillante', 'sobre', '¡Fiii! Así saluda. Así se despide. Así estornuda.'),
  c('boletito', 'Boletito', 'via', 'comun', 'sobre', 'Colecciona boletos de trenes que todavía no existen.'),
  c('rielito', 'Rielito', 'via', 'brillante', 'rescate', 'Se desliza por las vías como si fueran tobogán.'),
  // Mar
  c('caracolin', 'Caracolín', 'mar', 'comun', 'sobre', 'Si lo acercás a la oreja, se escucha el mar… y chistes.'),
  c('gaviotin', 'Gaviotín', 'mar', 'brillante', 'rescate', 'Le roba las papas fritas a las otras gaviotas.'),
  c('olita', 'Olita', 'mar', 'brillante', 'sobre', 'Va y viene, va y viene, va y viene…'),
  c('farito', 'Farito', 'mar', 'dorada', 'sobre', 'Guarda la última luz del faro del puerto.'),
];

export const CARD_BY_ID = new Map(CARDS.map((k) => [k.id, k]));
export const TOTAL_CARDS = CARDS.length;

/** Las cartas que salen en sobres. */
export const PACK_POOL = CARDS.filter((k) => k.source === 'sobre');

/**
 * Arma un sobre de 3 cartas. La última es al menos brillante y sale ordenado de menos a más raro
 * (la más rara se da vuelta última). Prefiere cartas que faltan, para que la colección avance.
 */
export function rollPack(owned: (id: string) => boolean, rnd: () => number = Math.random): string[] {
  const pick = (minRarity: Rarity): ChispiCard => {
    const roll = rnd();
    let rarity: Rarity = roll < 0.07 ? 'dorada' : roll < 0.32 ? 'brillante' : 'comun';
    if (minRarity === 'brillante' && rarity === 'comun') rarity = 'brillante';
    // Si una rareza se quedó sin cartas de sobre (pasaron a rescates), se usa la más cercana
    const exact = PACK_POOL.filter((k) => k.rarity === rarity);
    const ofRarity = exact.length ? exact : PACK_POOL.filter((k) => (rarity === 'comun' ? k.rarity === 'comun' : k.rarity !== 'comun'));
    const missing = ofRarity.filter((k) => !owned(k.id) && !out.includes(k.id));
    const list = missing.length && rnd() < 0.8 ? missing : ofRarity;
    return list[Math.floor(rnd() * list.length)];
  };
  const out: string[] = [];
  out.push(pick('comun').id);
  out.push(pick('comun').id);
  out.push(pick('brillante').id);
  const rank: Record<Rarity, number> = { comun: 0, brillante: 1, dorada: 2 };
  return out.sort((a, b) => rank[CARD_BY_ID.get(a)!.rarity] - rank[CARD_BY_ID.get(b)!.rarity]);
}
