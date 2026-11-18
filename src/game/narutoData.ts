export type ChakraNature = 'Katon' | 'Suiton' | 'Fuuton' | 'Doton' | 'Raiton';

export type NinjaRank =
  | 'Estudante da Academia'
  | 'Genin'
  | 'Chunin'
  | 'Tokubetsu Jonin'
  | 'Jonin'
  | 'Jounin Experiente'
  | 'Anbu'
  | 'Sannin'
  | 'Kage';

export type GearSlot = 'weapon' | 'armor' | 'headband' | 'accessory';

export interface VillageInfo {
  id: string;
  name: string;
  country: string;
  kageTitle: string;
  primaryNature: ChakraNature;
  emblemGlyph: string;
  accentHex: string;
  imageUrl?: string;
  worldMapPos: { xPct: number; yPct: number };
  description: string;
}

export interface ClanMechanicBonus {
  title: string;
  description: string;
  statBonuses?: Partial<Record<AttributeKey, number>>;
  combatEffect?: {
    hpMultiplier?: number;
    chakraMultiplier?: number;
    critBonus?: number;
    evasionBonus?: number;
    accuracyBonus?: number;
    chakraCostReduction?: number;
    natureBonus?: { nature: ChakraNature | 'Neutro' | 'Yin' | 'Yang'; damageMult: number };
    categoryBonus?: { category: JutsuDef['category']; damageMult: number };
  };
}

export interface ClanInfo {
  id: string;
  name: string;
  villageAffiliations: string[];
  kekkeiGenkai: string;
  bonuses: Partial<Record<AttributeKey, number>>;
  passiveTrait: string;
  twoBonuses: [ClanMechanicBonus, ClanMechanicBonus];
}

export interface SpecializationInfo {
  id: string;
  name: string;
  focusStat: AttributeKey;
  bonuses: Partial<Record<AttributeKey, number>>;
  description: string;
}

export type StatusEffectType =
  | 'burn'
  | 'black_flames'
  | 'stun'
  | 'soaked'
  | 'drowning'
  | 'crush'
  | 'paralysis'
  | 'mind_control'
  | 'bleed'
  | 'chakra_seal'
  | 'freeze'
  | 'regen'
  | 'shield';

export interface StatusEffectMeta {
  type: StatusEffectType;
  label: string;
  shortTag: string;
  tone: 'fire' | 'lightning' | 'water' | 'earth' | 'wind' | 'illusion' | 'seal' | 'heal';
  summary: string;
}

export const STATUS_EFFECT_META: Record<StatusEffectType, StatusEffectMeta> = {
  burn: {
    type: 'burn',
    label: 'Queimadura',
    shortTag: 'Queimadura',
    tone: 'fire',
    summary: 'Causa dano contínuo de fogo por turno e reduz cura recebida em 30%.',
  },
  black_flames: {
    type: 'black_flames',
    label: 'Chamas Negras (Amaterasu)',
    shortTag: 'Chamas Negras',
    tone: 'fire',
    summary: 'Fogo inextinguível que causa dano elevado contínuo e ignora barreiras.',
  },
  stun: {
    type: 'stun',
    label: 'Atordoamento',
    shortTag: 'Atordoamento',
    tone: 'lightning',
    summary: 'Choque neural que impede a ação do próximo turno do alvo.',
  },
  soaked: {
    type: 'soaked',
    label: 'Encharcado',
    shortTag: 'Encharcado',
    tone: 'water',
    summary: 'Aumenta em +35% o dano de Raiton recebido, dobra chance de Atordoamento elétrico e reduz dano de Katon em 15%.',
  },
  drowning: {
    type: 'drowning',
    label: 'Afogamento',
    shortTag: 'Afogamento',
    tone: 'water',
    summary: 'Pressão aquática sufocante: causa dano por turno, drena Chakra e reduz precisão em 18%.',
  },
  crush: {
    type: 'crush',
    label: 'Esmagamento',
    shortTag: 'Esmagamento',
    tone: 'earth',
    summary: 'Fratura a guarda física, reduzindo a resistência defensiva em 25%.',
  },
  paralysis: {
    type: 'paralysis',
    label: 'Paralisia',
    shortTag: 'Paralisia',
    tone: 'illusion',
    summary: 'Restrição motora com 60% de chance de falhar o turno e -20% de esquiva.',
  },
  mind_control: {
    type: 'mind_control',
    label: 'Controle Mental Momentâneo',
    shortTag: 'Controle Mental',
    tone: 'illusion',
    summary: 'Subjuga a percepção do alvo por instantes: 55% de chance de ferir a si mesmo no turno e -25% de ataque.',
  },
  bleed: {
    type: 'bleed',
    label: 'Laceração',
    shortTag: 'Laceração',
    tone: 'wind',
    summary: 'Cortes de chakra ou vento que causam sangramento contínuo por turno.',
  },
  chakra_seal: {
    type: 'chakra_seal',
    label: 'Tenketsu Selados',
    shortTag: 'Selo de Chakra',
    tone: 'seal',
    summary: 'Bloqueia o fluxo de chakra, drenando CH por turno e reduzindo dano de Ninjutsu/Genjutsu em 25%.',
  },
  freeze: {
    type: 'freeze',
    label: 'Congelamento',
    shortTag: 'Congelamento',
    tone: 'water',
    summary: 'Reduz velocidade/esquiva em 25% e aplica risco de paralisia térmica.',
  },
  regen: {
    type: 'regen',
    label: 'Regeneração Celular',
    shortTag: 'Regeneração',
    tone: 'heal',
    summary: 'Recupera HP continuamente por turno e purifica Queimadura e Laceração.',
  },
  shield: {
    type: 'shield',
    label: 'Defesa Reforçada',
    shortTag: 'Escudo',
    tone: 'earth',
    summary: 'Reduz todo dano sofrido em 30% durante a duração.',
  },
};

export interface JutsuEffectSpec {
  type: StatusEffectType;
  target: 'enemy' | 'self';
  chance: number;
  duration: number;
  potency?: number;
  label: string;
}

export interface JutsuDef {
  id: string;
  name: string;
  rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  category:
    | 'Ninjutsu'
    | 'Taijutsu'
    | 'Genjutsu'
    | 'Kenjutsu'
    | 'Fuinjutsu'
    | 'Kekkei Genkai'
    | 'Kuchiyose'
    | 'Iryou';
  nature: ChakraNature | 'Neutro' | 'Yin' | 'Yang';
  chakraCost: number;
  basePower: number;
  accuracyMod: number;
  critBonus: number;
  requiredLevel: number;
  requiredChakraLevel: number;
  learnCostRyo: number;
  clanExclusive?: string;
  kekkeiRequired?: string;
  questRequired?: string;
  healRatio?: number;
  effects?: JutsuEffectSpec[];
  imageUrl?: string;
  description: string;
}

export interface ItemDef {
  id: string;
  name: string;
  category: GearSlot | 'consumable';
  rarity: 'Comum' | 'Raro' | 'Épico' | 'Lendário';
  priceRyo: number;
  statBonuses: Partial<Record<AttributeKey, number>>;
  healHp?: number;
  healChakra?: number;
  villageRequired?: string;
  factionTag?: string;
  isSevenMistSword?: boolean;
  imageUrl?: string;
  dropOnly?: boolean;
  description: string;
}

export interface SharinganStageDef {
  stage: 1 | 2 | 3 | 4;
  id: 'sharingan_1' | 'sharingan_2' | 'sharingan_3' | 'mangekyo';
  kekkeiValue: string;
  title: string;
  tomoeLabel: string;
  imageUrl: string;
  minRank?: NinjaRank;
  minLevel: number;
  minChakraLevel: number;
  minMissions: number;
  minWins: number;
  minMerit: number;
  costRyo: number;
  statBonuses: Partial<Record<AttributeKey, number>>;
  evasionBonus: number;
  accuracyBonus: number;
  critBonus: number;
  chakraCostReduction: number;
  genjutsuEffectChanceBonus: number;
  kekkeiEffectChanceBonus: number;
  genjutsuDamageMult: number;
  kekkeiDamageMult: number;
  bonusSummary: string;
  description: string;
}

export interface MissionTemplate {
  id: string;
  assignedVillage: string;
  title: string;
  rank: 'D' | 'C' | 'B' | 'A' | 'S';
  minLevel: number;
  enemyName: string;
  enemyClan: string;
  enemyVillage: string;
  enemyAvatar: string;
  enemyNature: ChakraNature;
  baseHp: number;
  baseAttack: number;
  baseSpeed: number;
  baseXp: number;
  baseChakraXp: number;
  baseRyo: number;
  baseMerit: number;
  briefing: string;
}

export interface SummonQuestQuestion {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface SummonQuestDef {
  id: string;
  contractName: string;
  tier: 'standard' | 'great_sage';
  isGreatSummon: boolean;
  sanctuary: string;
  guardianTitle: string;
  minRank: NinjaRank;
  minLevel: number;
  minChakraLevel: number;
  minMissions: number;
  minMerit: number;
  costRyo: number;
  complexityLabel: string;
  description: string;
  bossName: string;
  bossNature: ChakraNature;
  bossAvatar: string;
  bossHp: number;
  bossAttack: number;
  bossSpeed: number;
  rewardXp: number;
  rewardChakraXp: number;
  rewardMerit: number;
  trialQuestions: SummonQuestQuestion[];
}

export type JutsuQuestKind = 'second_element' | 'rasengan' | 'eight_gates';

export interface JutsuQuestDef {
  id: string;
  kind: JutsuQuestKind;
  title: string;
  rewardLabel: string;
  rewardJutsuId?: string;
  grantsSecondElement?: boolean;
  requiresNoClan: boolean;
  requiresNoKekkeiGenkai: boolean;
  minRank: NinjaRank;
  minLevel: number;
  minChakraLevel: number;
  minMissions: number;
  minMerit: number;
  minTaijutsu?: number;
  minChakraControl?: number;
  costRyo: number;
  complexityLabel: string;
  description: string;
  bossName: string;
  bossTitle: string;
  bossNature: ChakraNature;
  bossAvatar: string;
  bossHp: number;
  bossAttack: number;
  bossSpeed: number;
  rewardXp: number;
  rewardChakraXp: number;
  rewardMerit: number;
  trialQuestions: SummonQuestQuestion[];
}

export type AttributeKey =
  | 'ninjutsu'
  | 'taijutsu'
  | 'genjutsu'
  | 'velocidade'
  | 'forca'
  | 'inteligencia'
  | 'resistencia'
  | 'controleChakra';

export const PRESET_AVATARS = [
  {
    id: 'naruto',
    label: 'Naruto Uzumaki',
    url: 'https://static.wikia.nocookie.net/naruto/images/d/d6/Naruto_Part_I.png/revision/latest/scale-to-width-down/800?cb=20251228135525',
  },
  {
    id: 'sasuke',
    label: 'Sasuke Uchiha',
    url: 'https://static.wikia.nocookie.net/naruto/images/2/21/Sasuke_Part_1.png/revision/latest/scale-to-width-down/800?cb=20170716092103',
  },
  {
    id: 'kakashi',
    label: 'Kakashi Hatake',
    url: 'https://static.wikia.nocookie.net/naruto/images/2/27/Kakashi_Hatake.png/revision/latest/scale-to-width-down/800?cb=20251019002845',
  },
  {
    id: 'itachi',
    label: 'Itachi Uchiha',
    url: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Itachi_Child_OL.png/revision/latest?cb=20210415223303',
  },
  {
    id: 'gaara',
    label: 'Gaara',
    url: 'https://static.wikia.nocookie.net/naruto/images/2/20/Gaara_in_Part_I.png/revision/latest/scale-to-width-down/800?cb=20221010023824',
  },
  {
    id: 'mei',
    label: 'Mei Terumi',
    url: 'https://static.wikia.nocookie.net/naruto/images/6/6f/Mei.png/revision/latest/scale-to-width-down/800?cb=20170927110950',
  },
];

export const NINJA_RANKS: Array<{
  rank: NinjaRank;
  minLevel: number;
  minMerit: number;
}> = [
  { rank: 'Estudante da Academia', minLevel: 1, minMerit: 0 },
  { rank: 'Genin', minLevel: 2, minMerit: 120 },
  { rank: 'Chunin', minLevel: 5, minMerit: 350 },
  { rank: 'Tokubetsu Jonin', minLevel: 9, minMerit: 750 },
  { rank: 'Jonin', minLevel: 14, minMerit: 1400 },
  { rank: 'Jounin Experiente', minLevel: 18, minMerit: 2100 },
  { rank: 'Anbu', minLevel: 22, minMerit: 2900 },
  { rank: 'Sannin', minLevel: 28, minMerit: 4000 },
  { rank: 'Kage', minLevel: 35, minMerit: 6500 },
];

export const WORLD_MAP_IMAGE_URL =
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Naruto_World_Map.svg/1280px-Naruto_World_Map.svg.png?utm_source=pt.wikipedia.org&utm_campaign=index&utm_content=thumbnail';

export const VILLAGES: VillageInfo[] = [
  { id: 'konoha', name: 'Konohagakure', country: 'País do Fogo', kageTitle: 'Hokage', primaryNature: 'Katon', emblemGlyph: '木ノ葉', accentHex: '#10B981', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/34/Konohagakure.png/revision/latest/scale-to-width-down/800?cb=20160728115517', worldMapPos: { xPct: 52, yPct: 54 }, description: 'Vila Oculta da Folha, berço da Vontade do Fogo e dos clãs fundadores.' },
  { id: 'suna', name: 'Sunagakure', country: 'País do Vento', kageTitle: 'Kazekage', primaryNature: 'Fuuton', emblemGlyph: '砂', accentHex: '#D4A037', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b0/Sunagakure.png/revision/latest/scale-to-width-down/800?cb=20201012155824', worldMapPos: { xPct: 21, yPct: 67 }, description: 'Vila Oculta da Areia, mestra das marionetes e técnicas de vento no deserto.' },
  { id: 'kiri', name: 'Kirigakure', country: 'País da Água', kageTitle: 'Mizukage', primaryNature: 'Suiton', emblemGlyph: '霧', accentHex: '#3B82A6', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/9d/Current_Kirigakure.png/revision/latest/scale-to-width-down/800?cb=20220220024956', worldMapPos: { xPct: 83, yPct: 65 }, description: 'Vila Oculta da Névoa Sangrenta e dos Sete Espadachins da Névoa.' },
  { id: 'iwa', name: 'Iwagakure', country: 'País da Terra', kageTitle: 'Tsuchikage', primaryNature: 'Doton', emblemGlyph: '岩', accentHex: '#B87333', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e4/Iwagakure_no_Sato.png/revision/latest/scale-to-width-down/800?cb=20131007010456', worldMapPos: { xPct: 27, yPct: 33 }, description: 'Vila Oculta da Pedra, protegida por muralhas rochosas e Kekkei Tota.' },
  { id: 'kumo', name: 'Kumogakure', country: 'País do Relâmpago', kageTitle: 'Raikage', primaryNature: 'Raiton', emblemGlyph: '雲', accentHex: '#D9A726', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/5a/Kumogakure.png/revision/latest/scale-to-width-down/800?cb=20160129210622', worldMapPos: { xPct: 76, yPct: 29 }, description: 'Vila Oculta da Nuvem, renomada pela velocidade relâmpago e Nintaijutsu.' },
  { id: 'ame', name: 'Amegakure', country: 'País da Chuva', kageTitle: 'Guardião da Chuva', primaryNature: 'Suiton', emblemGlyph: '雨', accentHex: '#5B768E', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/4/41/Amegakure.png/revision/latest/scale-to-width-down/800?cb=20150406162100', worldMapPos: { xPct: 37, yPct: 50 }, description: 'Metrópole industrial sob chuva constante entre as Cinco Grandes Nações.' },
  { id: 'oto', name: 'Otogakure', country: 'País do Som', kageTitle: 'Líder do Som', primaryNature: 'Fuuton', emblemGlyph: '音', accentHex: '#7A5EA7', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/c/cc/Otogakure.png/revision/latest/scale-to-width-down/800?cb=20180802115411', worldMapPos: { xPct: 58, yPct: 37 }, description: 'Laboratórios ocultos e técnicas baseadas em ondas sonoras e marcas amaldiçoadas.' },
  { id: 'taki', name: 'Takigakure', country: 'País da Cachoeira', kageTitle: 'Ancião da Cachoeira', primaryNature: 'Suiton', emblemGlyph: '滝', accentHex: '#3A9A8F', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/bc/Takigakure.png/revision/latest/scale-to-width-down/800?cb=20150430115115', worldMapPos: { xPct: 48, yPct: 34 }, description: 'Fortaleza cercada por cataratas monumentais e guardiã da Água do Herói.' },
  { id: 'kusa', name: 'Kusagakure', country: 'País da Grama', kageTitle: 'Comandante da Grama', primaryNature: 'Doton', emblemGlyph: '草', accentHex: '#4E8D5C', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/09/Kusagakure.png/revision/latest/scale-to-width-down/800?cb=20150924125321', worldMapPos: { xPct: 39, yPct: 40 }, description: 'Especialistas em espionagem diplomática e infiltração silenciosa.' },
  { id: 'uzushio', name: 'Uzushiogakure', country: 'País dos Redemoinhos', kageTitle: 'Patriarca Uzushio', primaryNature: 'Suiton', emblemGlyph: '渦', accentHex: '#B83333', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/31/Uzushio.png/revision/latest/scale-to-width-down/800?cb=20160129054629', worldMapPos: { xPct: 68, yPct: 57 }, description: 'Antiga ilha legendária da arte suprema de Fuinjutsu e longevidade.' },
  { id: 'hoshi', name: 'Hoshigakure', country: 'País dos Ursos', kageTitle: 'Hoshikage', primaryNature: 'Katon', emblemGlyph: '星', accentHex: '#A78B3D', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/01/Hoshigakure.png/revision/latest/scale-to-width-down/800?cb=20150216084622', worldMapPos: { xPct: 24, yPct: 49 }, description: 'Vila envolta por um cânion venenoso e treinamento estelar de chakra.' },
  { id: 'yuki', name: 'Yukigakure', country: 'País da Neve', kageTitle: 'Senhor da Neve', primaryNature: 'Suiton', emblemGlyph: '雪', accentHex: '#7FAAC7', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/50/Land_of_Snow.png/revision/latest/scale-to-width-down/800?cb=20160116171901', worldMapPos: { xPct: 35, yPct: 14 }, description: 'Território ártico onde armaduras de chakra resistem a técnicas glaciais.' },
  { id: 'tetsu', name: 'País do Ferro', country: 'País do Ferro', kageTitle: 'General Samurai', primaryNature: 'Doton', emblemGlyph: '鉄', accentHex: '#7D8590', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/82/LandofIron.png/revision/latest/scale-to-width-down/800?cb=20210918020204', worldMapPos: { xPct: 57, yPct: 21 }, description: 'Nação neutra de samurais, ronins e sede da Reunião dos Cinco Kages.' },
  { id: 'nami', name: 'País das Ondas', country: 'País das Ondas', kageTitle: 'Guardião da Ponte', primaryNature: 'Suiton', emblemGlyph: '波', accentHex: '#4A7D9B', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/53/Land_of_Waves.png/revision/latest/scale-to-width-down/800?cb=20150221133452', worldMapPos: { xPct: 62, yPct: 71 }, description: 'Arquipélago costeiro ligado ao continente pela Grande Ponte.' },
  { id: 'getsu', name: 'Getsugakure', country: 'País da Lua', kageTitle: 'Guardião Lunar', primaryNature: 'Raiton', emblemGlyph: '月', accentHex: '#94A3B8', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/60/Tsuki_no_Kuni.png/revision/latest/scale-to-width-down/800?cb=20160123105534', worldMapPos: { xPct: 45, yPct: 83 }, description: 'Vila em forma de lua crescente com rotas mercantes marítimas.' },
  { id: 'yu', name: 'Yugakure', country: 'País das Fontes Termais', kageTitle: 'Regente das Termas', primaryNature: 'Katon', emblemGlyph: '湯', accentHex: '#C2674A', imageUrl: 'https://static.wikia.nocookie.net/naruto/images/d/d3/Yugakure.PNG/revision/latest/scale-to-width-down/800?cb=20110309002022', worldMapPos: { xPct: 67, yPct: 38 }, description: 'Vila que transitou para santuário pacífico, porém abriga renegados perigosos.' },
  { id: 'shimo', name: 'Shimogakure', country: 'País da Geada', kageTitle: 'Regente da Geada', primaryNature: 'Suiton', emblemGlyph: '霜', accentHex: '#6A8CAF', worldMapPos: { xPct: 67, yPct: 24 }, description: 'Fronteira montanhosa entre a Terra do Relâmpago e o mar do norte.' },
  { id: 'tani', name: 'Tanigakure', country: 'País dos Rios', kageTitle: 'Vigia do Vale', primaryNature: 'Doton', emblemGlyph: '谷', accentHex: '#847558', worldMapPos: { xPct: 38, yPct: 67 }, description: 'Passagem estratégica entre desfiladeiros escarpados.' },
];

export const CLANS: ClanInfo[] = [
  {
    id: 'uchiha',
    name: 'Uchiha',
    villageAffiliations: ['Konohagakure'],
    kekkeiGenkai: 'Sharingan',
    bonuses: { ninjutsu: 4, genjutsu: 4, velocidade: 2 },
    passiveTrait: 'Leitura de movimentos e afinidade natural com Katon.',
    twoBonuses: [
      {
        title: 'Olhos da Previsão (Sharingan)',
        description: '+4 Genjutsu, +2 Velocidade, +7% Precisão e +5% Crítico por leitura cinética.',
        statBonuses: { genjutsu: 4, velocidade: 2 },
        combatEffect: { accuracyBonus: 7, critBonus: 5 },
      },
      {
        title: 'Sangue da Chama Uchiha',
        description: '+4 Ninjutsu e +15% de dano em todas as técnicas de elemento Katon.',
        statBonuses: { ninjutsu: 4 },
        combatEffect: { natureBonus: { nature: 'Katon', damageMult: 1.15 } },
      },
    ],
  },
  {
    id: 'hyuga',
    name: 'Hyuga',
    villageAffiliations: ['Konohagakure'],
    kekkeiGenkai: 'Byakugan',
    bonuses: { taijutsu: 5, controleChakra: 3, velocidade: 2 },
    passiveTrait: 'Visão de 360° e golpes diretos nos tenketsu.',
    twoBonuses: [
      {
        title: 'Visão 360° do Byakugan',
        description: '+3 Controle de Chakra, +2 Velocidade e +8% Esquiva em combate.',
        statBonuses: { controleChakra: 3, velocidade: 2 },
        combatEffect: { evasionBonus: 8 },
      },
      {
        title: 'Punho Gentil (Juken)',
        description: '+5 Taijutsu e +15% de dano em técnicas da categoria Taijutsu.',
        statBonuses: { taijutsu: 5 },
        combatEffect: { categoryBonus: { category: 'Taijutsu', damageMult: 1.15 } },
      },
    ],
  },
  {
    id: 'uzumaki',
    name: 'Uzumaki',
    villageAffiliations: ['Konohagakure', 'Uzushiogakure'],
    kekkeiGenkai: 'Correntes de Selamento Adamantinas',
    bonuses: { resistencia: 5, controleChakra: 3, ninjutsu: 2 },
    passiveTrait: 'Reservas vitais e de chakra amplificadas em +20%.',
    twoBonuses: [
      {
        title: 'Vitalidade Inquebrável',
        description: '+5 Resistência e +15% de HP Máximo total na ficha e combate.',
        statBonuses: { resistencia: 5 },
        combatEffect: { hpMultiplier: 1.15 },
      },
      {
        title: 'Reservas Adamantinas de Chakra',
        description: '+3 Controle de Chakra, +2 Ninjutsu e +20% de Chakra Máximo.',
        statBonuses: { controleChakra: 3, ninjutsu: 2 },
        combatEffect: { chakraMultiplier: 1.2 },
      },
    ],
  },
  {
    id: 'senju',
    name: 'Senju',
    villageAffiliations: ['Konohagakure'],
    kekkeiGenkai: 'Mokuton (Madeira)',
    bonuses: { ninjutsu: 4, resistencia: 4, forca: 2 },
    passiveTrait: 'Regeneração celular e versatilidade das mil técnicas.',
    twoBonuses: [
      {
        title: 'Corpo do Sábio (Vitalidade)',
        description: '+4 Resistência, +2 Força e +10% de HP Máximo.',
        statBonuses: { resistencia: 4, forca: 2 },
        combatEffect: { hpMultiplier: 1.1 },
      },
      {
        title: 'Mestre das Mil Técnicas',
        description: '+4 Ninjutsu e +12% de dano em técnicas da categoria Ninjutsu.',
        statBonuses: { ninjutsu: 4 },
        combatEffect: { categoryBonus: { category: 'Ninjutsu', damageMult: 1.12 } },
      },
    ],
  },
  {
    id: 'nara',
    name: 'Nara',
    villageAffiliations: ['Konohagakure'],
    kekkeiGenkai: 'Nenhum',
    bonuses: { inteligencia: 6, controleChakra: 3, genjutsu: 1 },
    passiveTrait: 'Estratégia tática e aprisionamento pelas sombras.',
    twoBonuses: [
      {
        title: 'Mente Tática (QI 200+)',
        description: '+6 Inteligência e +9% Precisão ao calcular rotas de ataque.',
        statBonuses: { inteligencia: 6 },
        combatEffect: { accuracyBonus: 9 },
      },
      {
        title: 'Economia de Sombras',
        description: '+3 Controle de Chakra, +1 Genjutsu e -15% custo de Chakra em jutsus.',
        statBonuses: { controleChakra: 3, genjutsu: 1 },
        combatEffect: { chakraCostReduction: 0.15 },
      },
    ],
  },
  {
    id: 'akimichi',
    name: 'Akimichi',
    villageAffiliations: ['Konohagakure'],
    kekkeiGenkai: 'Nenhum',
    bonuses: { forca: 6, resistencia: 4 },
    passiveTrait: 'Conversão calórica em massa física e impacto brutal.',
    twoBonuses: [
      {
        title: 'Expansão Muscular (Baika)',
        description: '+6 Força e +12% de dano em golpes de Taijutsu.',
        statBonuses: { forca: 6 },
        combatEffect: { categoryBonus: { category: 'Taijutsu', damageMult: 1.12 } },
      },
      {
        title: 'Reserva Calórica Reforçada',
        description: '+4 Resistência e +12% de HP Máximo.',
        statBonuses: { resistencia: 4 },
        combatEffect: { hpMultiplier: 1.12 },
      },
    ],
  },
  {
    id: 'yamanaka',
    name: 'Yamanaka',
    villageAffiliations: ['Konohagakure'],
    kekkeiGenkai: 'Nenhum',
    bonuses: { genjutsu: 5, inteligencia: 3, controleChakra: 2 },
    passiveTrait: 'Transferência mental e percepção sensorial de longo alcance.',
    twoBonuses: [
      {
        title: 'Invasão Psíquica (Shintenshin)',
        description: '+5 Genjutsu e +15% de dano/efeito em técnicas de Genjutsu.',
        statBonuses: { genjutsu: 5 },
        combatEffect: { categoryBonus: { category: 'Genjutsu', damageMult: 1.15 } },
      },
      {
        title: 'Rede Sensorial da Vila',
        description: '+3 Inteligência, +2 Controle de Chakra e +6% Esquiva antecipada.',
        statBonuses: { inteligencia: 3, controleChakra: 2 },
        combatEffect: { evasionBonus: 6 },
      },
    ],
  },
  {
    id: 'aburame',
    name: 'Aburame',
    villageAffiliations: ['Konohagakure'],
    kekkeiGenkai: 'Nenhum',
    bonuses: { controleChakra: 5, inteligencia: 3, ninjutsu: 2 },
    passiveTrait: 'Simbiose com insetos kikaichu que drenam chakra.',
    twoBonuses: [
      {
        title: 'Colônia Simbiótica Kikaichu',
        description: '+5 Controle de Chakra e +12% Chakra Máximo armazenado pelos insetos.',
        statBonuses: { controleChakra: 5 },
        combatEffect: { chakraMultiplier: 1.12 },
      },
      {
        title: 'Enxame Tático de Rastreio',
        description: '+3 Inteligência, +2 Ninjutsu e -10% custo de Chakra em combate.',
        statBonuses: { inteligencia: 3, ninjutsu: 2 },
        combatEffect: { chakraCostReduction: 0.1 },
      },
    ],
  },
  {
    id: 'inuzuka',
    name: 'Inuzuka',
    villageAffiliations: ['Konohagakure'],
    kekkeiGenkai: 'Nenhum',
    bonuses: { velocidade: 5, taijutsu: 3, forca: 2 },
    passiveTrait: 'Olfato aguçado e combate sincronizado com Ninken.',
    twoBonuses: [
      {
        title: 'Investida Selvagem (Gatsuuga)',
        description: '+5 Velocidade e +7% de Chance de Crítico em investidas rápidas.',
        statBonuses: { velocidade: 5 },
        combatEffect: { critBonus: 7 },
      },
      {
        title: 'Sincronia com Parceiro Ninken',
        description: '+3 Taijutsu, +2 Força e +6% Precisão em ataques combinados.',
        statBonuses: { taijutsu: 3, forca: 2 },
        combatEffect: { accuracyBonus: 6 },
      },
    ],
  },
  {
    id: 'hatake',
    name: 'Hatake',
    villageAffiliations: ['Konohagakure'],
    kekkeiGenkai: 'Nenhum',
    bonuses: { velocidade: 4, ninjutsu: 3, inteligencia: 3 },
    passiveTrait: 'Maestria em Kenjutsu de chakra branco e Raiton.',
    twoBonuses: [
      {
        title: 'Sabre de Chakra Branco',
        description: '+4 Velocidade, +3 Inteligência e +8% Chance de Crítico.',
        statBonuses: { velocidade: 4, inteligencia: 3 },
        combatEffect: { critBonus: 8 },
      },
      {
        title: 'Condutividade Raiton',
        description: '+3 Ninjutsu e +15% de dano em técnicas de elemento Raiton.',
        statBonuses: { ninjutsu: 3 },
        combatEffect: { natureBonus: { nature: 'Raiton', damageMult: 1.15 } },
      },
    ],
  },
  {
    id: 'sarutobi',
    name: 'Sarutobi',
    villageAffiliations: ['Konohagakure'],
    kekkeiGenkai: 'Nenhum',
    bonuses: { ninjutsu: 4, taijutsu: 3, resistencia: 3 },
    passiveTrait: 'Aptidão equilibrada com todas as cinco naturezas.',
    twoBonuses: [
      {
        title: 'Vontade do Fogo (Professor)',
        description: '+4 Ninjutsu e +15% de dano em técnicas de elemento Katon.',
        statBonuses: { ninjutsu: 4 },
        combatEffect: { natureBonus: { nature: 'Katon', damageMult: 1.15 } },
      },
      {
        title: 'Disciplina de Combate Completo',
        description: '+3 Taijutsu, +3 Resistência e +8% HP Máximo.',
        statBonuses: { taijutsu: 3, resistencia: 3 },
        combatEffect: { hpMultiplier: 1.08 },
      },
    ],
  },
  {
    id: 'shimura',
    name: 'Shimura',
    villageAffiliations: ['Konohagakure'],
    kekkeiGenkai: 'Nenhum',
    bonuses: { ninjutsu: 4, inteligencia: 3, velocidade: 3 },
    passiveTrait: 'Especialistas táticos em Fuuton e selamentos ocultos.',
    twoBonuses: [
      {
        title: 'Lâminas de Vácuo (Fuuton)',
        description: '+4 Ninjutsu e +15% de dano em técnicas de elemento Fuuton.',
        statBonuses: { ninjutsu: 4 },
        combatEffect: { natureBonus: { nature: 'Fuuton', damageMult: 1.15 } },
      },
      {
        title: 'Protocolo da Raiz (Anbu)',
        description: '+3 Inteligência, +3 Velocidade e +6% Precisão tática.',
        statBonuses: { inteligencia: 3, velocidade: 3 },
        combatEffect: { accuracyBonus: 6 },
      },
    ],
  },
  {
    id: 'kurama',
    name: 'Kurama',
    villageAffiliations: ['Konohagakure'],
    kekkeiGenkai: 'Genjutsu Sensorial Real',
    bonuses: { genjutsu: 6, controleChakra: 3, inteligencia: 1 },
    passiveTrait: 'Ilusões tão densas que causam dano físico real.',
    twoBonuses: [
      {
        title: 'Ilusão Materializada',
        description: '+6 Genjutsu e +18% de dano em técnicas de Genjutsu.',
        statBonuses: { genjutsu: 6 },
        combatEffect: { categoryBonus: { category: 'Genjutsu', damageMult: 1.18 } },
      },
      {
        title: 'Sintonia Sensorial Fina',
        description: '+3 Controle de Chakra, +1 Inteligência e -12% custo de Chakra.',
        statBonuses: { controleChakra: 3, inteligencia: 1 },
        combatEffect: { chakraCostReduction: 0.12 },
      },
    ],
  },
  {
    id: 'kaguya',
    name: 'Kaguya',
    villageAffiliations: ['Kirigakure'],
    kekkeiGenkai: 'Shikotsumyaku (Ossos)',
    bonuses: { taijutsu: 5, resistencia: 3, forca: 2 },
    passiveTrait: 'Manipulação da própria estrutura óssea como armas.',
    twoBonuses: [
      {
        title: 'Armadura Óssea Shikotsumyaku',
        description: '+3 Resistência, +2 Força e +12% HP Máximo.',
        statBonuses: { resistencia: 3, forca: 2 },
        combatEffect: { hpMultiplier: 1.12 },
      },
      {
        title: 'Dança das Lâminas Ósseas',
        description: '+5 Taijutsu e +6% de Chance de Crítico em combate corpo a corpo.',
        statBonuses: { taijutsu: 5 },
        combatEffect: { critBonus: 6 },
      },
    ],
  },
  {
    id: 'hozuki',
    name: 'Hozuki',
    villageAffiliations: ['Kirigakure'],
    kekkeiGenkai: 'Hidratação Corporal',
    bonuses: { velocidade: 4, ninjutsu: 4, resistencia: 2 },
    passiveTrait: 'Corpo liquidificado que reduz dano físico comum.',
    twoBonuses: [
      {
        title: 'Corpo Liquefeito (Suika)',
        description: '+4 Velocidade, +2 Resistência e +9% Esquiva natural.',
        statBonuses: { velocidade: 4, resistencia: 2 },
        combatEffect: { evasionBonus: 9 },
      },
      {
        title: 'Pistola de Água da Névoa',
        description: '+4 Ninjutsu e +15% de dano em técnicas de elemento Suiton.',
        statBonuses: { ninjutsu: 4 },
        combatEffect: { natureBonus: { nature: 'Suiton', damageMult: 1.15 } },
      },
    ],
  },
  {
    id: 'yuki',
    name: 'Yuki',
    villageAffiliations: ['Kirigakure', 'Yukigakure'],
    kekkeiGenkai: 'Hyouton (Gelo)',
    bonuses: { ninjutsu: 4, velocidade: 4, controleChakra: 2 },
    passiveTrait: 'Fusão Suiton + Fuuton em espelhos de gelo velozes.',
    twoBonuses: [
      {
        title: 'Espelhos Demoníacos de Gelo',
        description: '+4 Velocidade e +8% Esquiva entre reflexos cristalinos.',
        statBonuses: { velocidade: 4 },
        combatEffect: { evasionBonus: 8 },
      },
      {
        title: 'Cristalização Hyouton',
        description: '+4 Ninjutsu, +2 Controle de Chakra e +15% de dano em Kekkei Genkai.',
        statBonuses: { ninjutsu: 4, controleChakra: 2 },
        combatEffect: { categoryBonus: { category: 'Kekkei Genkai', damageMult: 1.15 } },
      },
    ],
  },
  {
    id: 'chinoike',
    name: 'Chinoike',
    villageAffiliations: ['Amegakure', 'Yugakure'],
    kekkeiGenkai: 'Ketsuryugan',
    bonuses: { genjutsu: 5, ninjutsu: 4, controleChakra: 1 },
    passiveTrait: 'Dojutsu sangrento capaz de manipular líquidos férricos.',
    twoBonuses: [
      {
        title: 'Olhar Carmesim (Ketsuryugan)',
        description: '+5 Genjutsu e +14% de dano em técnicas de Genjutsu.',
        statBonuses: { genjutsu: 5 },
        combatEffect: { categoryBonus: { category: 'Genjutsu', damageMult: 1.14 } },
      },
      {
        title: 'Manipulação Férrica de Sangue',
        description: '+4 Ninjutsu, +1 Controle de Chakra e +6% Precisão.',
        statBonuses: { ninjutsu: 4, controleChakra: 1 },
        combatEffect: { accuracyBonus: 6 },
      },
    ],
  },
  {
    id: 'jugo',
    name: 'Clã de Jugo',
    villageAffiliations: ['Otogakure'],
    kekkeiGenkai: 'Absorção de Energia Natural',
    bonuses: { forca: 5, resistencia: 4, taijutsu: 1 },
    passiveTrait: 'Transformação parcial com energia natural.',
    twoBonuses: [
      {
        title: 'Selo Amaldiçoado Primordial',
        description: '+5 Força, +1 Taijutsu e +8% de Chance de Crítico.',
        statBonuses: { forca: 5, taijutsu: 1 },
        combatEffect: { critBonus: 8 },
      },
      {
        title: 'Absorção Constante de Senjutsu',
        description: '+4 Resistência e +12% Chakra Máximo acumulado da natureza.',
        statBonuses: { resistencia: 4 },
        combatEffect: { chakraMultiplier: 1.12 },
      },
    ],
  },
  {
    id: 'otsutsuki',
    name: 'Otsutsuki',
    villageAffiliations: ['Getsugakure', 'Konohagakure'],
    kekkeiGenkai: 'Rinnegan',
    bonuses: { ninjutsu: 5, controleChakra: 5 },
    passiveTrait: 'Domínio primordial de seis caminhos e reservas celestes.',
    twoBonuses: [
      {
        title: 'Reservas Celestes Primordiais',
        description: '+5 Controle de Chakra e +20% de Chakra Máximo.',
        statBonuses: { controleChakra: 5 },
        combatEffect: { chakraMultiplier: 1.2 },
      },
      {
        title: 'Seis Caminhos da Criação',
        description: '+5 Ninjutsu e +14% de dano em técnicas Kekkei Genkai.',
        statBonuses: { ninjutsu: 5 },
        combatEffect: { categoryBonus: { category: 'Kekkei Genkai', damageMult: 1.14 } },
      },
    ],
  },
  {
    id: 'kazekage',
    name: 'Linhagem Kazekage',
    villageAffiliations: ['Sunagakure'],
    kekkeiGenkai: 'Saten (Areia Magnética)',
    bonuses: { ninjutsu: 4, controleChakra: 4, inteligencia: 2 },
    passiveTrait: 'Defesa automática e manipulação de areia mineral.',
    twoBonuses: [
      {
        title: 'Escudo Absoluto de Areia',
        description: '+4 Controle de Chakra e +10% de HP Máximo por barreira mineral.',
        statBonuses: { controleChakra: 4 },
        combatEffect: { hpMultiplier: 1.1 },
      },
      {
        title: 'Magnetismo do Deserto',
        description: '+4 Ninjutsu, +2 Inteligência e +12% dano em Ninjutsu.',
        statBonuses: { ninjutsu: 4, inteligencia: 2 },
        combatEffect: { categoryBonus: { category: 'Ninjutsu', damageMult: 1.12 } },
      },
    ],
  },
  {
    id: 'kamizuru',
    name: 'Kamizuru',
    villageAffiliations: ['Iwagakure'],
    kekkeiGenkai: 'Nenhum',
    bonuses: { ninjutsu: 4, inteligencia: 3, controleChakra: 3 },
    passiveTrait: 'Enxames de abelhas de cera e armadilhas Doton.',
    twoBonuses: [
      {
        title: 'Cera e Rocha de Iwagakure',
        description: '+4 Ninjutsu e +15% de dano em técnicas de elemento Doton.',
        statBonuses: { ninjutsu: 4 },
        combatEffect: { natureBonus: { nature: 'Doton', damageMult: 1.15 } },
      },
      {
        title: 'Enxame Batedor Kamizuru',
        description: '+3 Inteligência, +3 Controle de Chakra e +7% Precisão.',
        statBonuses: { inteligencia: 3, controleChakra: 3 },
        combatEffect: { accuracyBonus: 7 },
      },
    ],
  },
  {
    id: 'fuuma',
    name: 'Fuuma',
    villageAffiliations: ['Amegakure', 'Otogakure'],
    kekkeiGenkai: 'Nenhum',
    bonuses: { velocidade: 4, taijutsu: 3, forca: 3 },
    passiveTrait: 'Precisão letal com armas arremessáveis gigantes.',
    twoBonuses: [
      {
        title: 'Arremesso Fuuma Shuriken',
        description: '+4 Velocidade e +9% de Precisão em projeções à distância.',
        statBonuses: { velocidade: 4 },
        combatEffect: { accuracyBonus: 9 },
      },
      {
        title: 'Impacto de Fios e Lâminas',
        description: '+3 Taijutsu, +3 Força e +6% Chance de Crítico.',
        statBonuses: { taijutsu: 3, forca: 3 },
        combatEffect: { critBonus: 6 },
      },
    ],
  },
  {
    id: 'sem_cla',
    name: 'Sem Clã (Independente)',
    villageAffiliations: ['Todas as Vilas'],
    kekkeiGenkai: 'Nenhum',
    bonuses: { velocidade: 3, inteligencia: 3, resistencia: 2, taijutsu: 2 },
    passiveTrait: 'Esforço puro e adaptabilidade em qualquer especialidade.',
    twoBonuses: [
      {
        title: 'Determinação Inabalável',
        description: '+3 Velocidade, +2 Resistência e +6% Esquiva por treino incessante.',
        statBonuses: { velocidade: 3, resistencia: 2 },
        combatEffect: { evasionBonus: 6 },
      },
      {
        title: 'Versatilidade de Campo',
        description: '+3 Inteligência, +2 Taijutsu e -10% custo de Chakra em todas as técnicas.',
        statBonuses: { inteligencia: 3, taijutsu: 2 },
        combatEffect: { chakraCostReduction: 0.1 },
      },
    ],
  },
];

export const SPECIALIZATIONS: SpecializationInfo[] = [
  { id: 'ninjutsu', name: 'Mestre em Ninjutsu Elemental', focusStat: 'ninjutsu', bonuses: { ninjutsu: 4, controleChakra: 2 }, description: 'Potencializa técnicas elementais e reduz dispersão de chakra.' },
  { id: 'taijutsu', name: 'Especialista em Taijutsu', focusStat: 'taijutsu', bonuses: { taijutsu: 4, velocidade: 2 }, description: 'Combate corpo a corpo de alta pressão e abertura de Portões.' },
  { id: 'genjutsu', name: 'Estrategista de Genjutsu', focusStat: 'genjutsu', bonuses: { genjutsu: 4, inteligencia: 2 }, description: 'Ilusões complexas que quebram a precisão e reação do alvo.' },
  { id: 'kenjutsu', name: 'Espadachim (Kenjutsu)', focusStat: 'velocidade', bonuses: { velocidade: 3, forca: 3 }, description: 'Fluxo de chakra em lâminas para cortes críticos letais.' },
  { id: 'fuinjutsu', name: 'Selador (Fuinjutsu)', focusStat: 'controleChakra', bonuses: { controleChakra: 4, inteligencia: 2 }, description: 'Selos supressores, barreiras táticas e pergaminhos ofensivos.' },
  { id: 'iryou', name: 'Ninja Médico (Iryou-Nin)', focusStat: 'controleChakra', bonuses: { controleChakra: 4, resistencia: 2 }, description: 'Regeneração cirúrgica e bisturi de chakra com precisão absoluta.' },
  { id: 'sensorial', name: 'Shinobi Sensorial', focusStat: 'inteligencia', bonuses: { inteligencia: 4, velocidade: 2 }, description: 'Rastreamento de assinaturas de chakra e esquiva antecipada.' },
  { id: 'marionetista', name: 'Marionetista (Kugutsu)', focusStat: 'inteligencia', bonuses: { inteligencia: 3, controleChakra: 3 }, description: 'Controle de fios de chakra com venenos e arsenais ocultos.' },
];

export const SHARINGAN_EVOLUTION_STAGES: SharinganStageDef[] = [
  {
    stage: 1,
    id: 'sharingan_1',
    kekkeiValue: 'Sharingan (Nível 1)',
    title: 'Sharingan · Nível 1 (1 Tomoe)',
    tomoeLabel: '1 Tomoe · Olho da Percepção',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/93/Sharingan_1_Tomoe.svg',
    minLevel: 1,
    minChakraLevel: 1,
    minMissions: 0,
    minWins: 0,
    minMerit: 0,
    costRyo: 0,
    statBonuses: {},
    evasionBonus: 4,
    accuracyBonus: 0,
    critBonus: 0,
    chakraCostReduction: 0.05,
    genjutsuEffectChanceBonus: 15,
    kekkeiEffectChanceBonus: 0,
    genjutsuDamageMult: 1,
    kekkeiDamageMult: 1,
    bonusSummary:
      '+4% Esquiva · -5% Custo de Chakra · +15% chance em efeitos de Genjutsu · Enxerga através de fumaça e anula Ações Secretas',
    description:
      'Primeiro despertar ocular da linhagem Uchiha com um tomoe: distingue fluxos de chakra através de névoa e fumaça, ampliando reflexos básicos e ilusões visuais.',
  },
  {
    stage: 2,
    id: 'sharingan_2',
    kekkeiValue: 'Sharingan (Nível 2)',
    title: 'Sharingan · Nível 2 (2 Tomoe)',
    tomoeLabel: '2 Tomoe · Olho da Cópia & Previsão',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/88/Sharingan_2_Tomoe.svg',
    minRank: 'Genin',
    minLevel: 5,
    minChakraLevel: 2,
    minMissions: 3,
    minWins: 2,
    minMerit: 150,
    costRyo: 700,
    statBonuses: { velocidade: 2, genjutsu: 2 },
    evasionBonus: 7,
    accuracyBonus: 5,
    critBonus: 4,
    chakraCostReduction: 0.08,
    genjutsuEffectChanceBonus: 18,
    kekkeiEffectChanceBonus: 4,
    genjutsuDamageMult: 1.06,
    kekkeiDamageMult: 1,
    bonusSummary:
      '+2 Genjutsu · +2 Velocidade · +7% Esquiva · +5% Precisão · +4% Crítico · -8% Custo de Chakra · +6% Dano e +18% Efeito em Genjutsu',
    description:
      'Segundo estágio ocular com dois tomoe: acompanha sequências velozes de Taijutsu e copia selos de mão inimigos em tempo real com maior precisão.',
  },
  {
    stage: 3,
    id: 'sharingan_3',
    kekkeiValue: 'Sharingan (Nível 3)',
    title: 'Sharingan · Nível 3 (3 Tomoe)',
    tomoeLabel: '3 Tomoe · Maturidade Ocular Completa',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/56/Sharingan_Triple.svg',
    minRank: 'Chunin',
    minLevel: 8,
    minChakraLevel: 3,
    minMissions: 6,
    minWins: 5,
    minMerit: 280,
    costRyo: 1200,
    statBonuses: { velocidade: 3, genjutsu: 4, ninjutsu: 2 },
    evasionBonus: 11,
    accuracyBonus: 9,
    critBonus: 8,
    chakraCostReduction: 0.11,
    genjutsuEffectChanceBonus: 21,
    kekkeiEffectChanceBonus: 9,
    genjutsuDamageMult: 1.11,
    kekkeiDamageMult: 1.06,
    bonusSummary:
      '+4 Genjutsu · +3 Velocidade · +2 Ninjutsu · +11% Esquiva · +9% Precisão · +8% Crítico · -11% Custo CH · +11% Dano Genjutsu · Libera Izanagi e Izanami',
    description:
      'Ápice do Sharingan base com três tomoe perfeitamente sincronizados: antecipa a intenção muscular do oponente antes do golpe partir e libera os Kinjutsus Izanagi e Izanami.',
  },
  {
    stage: 4,
    id: 'mangekyo',
    kekkeiValue: 'Mangekyo Sharingan',
    title: 'Mangekyou Sharingan',
    tomoeLabel: 'Caleidoscópio Hipnótico Supremo',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/4/46/Kotoamatsukami_Activated.png',
    minRank: 'Tokubetsu Jonin',
    minLevel: 13,
    minChakraLevel: 5,
    minMissions: 12,
    minWins: 9,
    minMerit: 500,
    costRyo: 2600,
    statBonuses: { ninjutsu: 5, genjutsu: 6, velocidade: 5 },
    evasionBonus: 15,
    accuracyBonus: 14,
    critBonus: 13,
    chakraCostReduction: 0.15,
    genjutsuEffectChanceBonus: 25,
    kekkeiEffectChanceBonus: 15,
    genjutsuDamageMult: 1.16,
    kekkeiDamageMult: 1.16,
    bonusSummary:
      '+6 Genjutsu · +5 Ninjutsu · +5 Velocidade · +15% Esquiva · +14% Precisão · +13% Crítico · -15% Custo CH · +16% Dano Kekkei/Genjutsu · Libera Amaterasu, Tsukuyomi, Susanoo, Kamui, Kagutsuchi e Kotoamatsukami',
    description:
      'Despertar lendário além dos três tomoe após provações extremas. Concede domínio ocular absoluto e desbloqueia as técnicas divinas de Rank S do clã Uchiha.',
  },
];

export const KEKKEI_GENKAI_LIST = [
  'Nenhum',
  'Sharingan (Nível 1)',
  'Sharingan (Nível 2)',
  'Sharingan (Nível 3)',
  'Mangekyo Sharingan',
  'Byakugan',
  'Rinnegan',
  'Mokuton (Madeira)',
  'Hyouton (Gelo)',
  'Youton (Lava)',
  'Futton (Vapor)',
  'Jinton (Poeira - Kekkei Tota)',
  'Bakuton (Explosão)',
  'Shakuton (Calor)',
  'Ranton (Tempestade)',
  'Shikotsumyaku (Ossos)',
  'Saten (Areia Magnética)',
  'Ketsuryugan',
];

export const CREATION_KEKKEI_GENKAI_LIST = KEKKEI_GENKAI_LIST.filter(
  (kg) =>
    kg !== 'Sharingan (Nível 2)' &&
    kg !== 'Sharingan (Nível 3)' &&
    kg !== 'Mangekyo Sharingan'
);

export const SUMMON_CONTRACTS = [
  'Nenhum',
  'Sapos do Monte Myoboku (Gamabunta)',
  'Cobras da Caverna Ryuchi (Manda)',
  'Lesmas da Floresta Shikkotsu (Katsuyu)',
  'Cães Ninjas (Ninken)',
  'Corvos de Ilusão',
  'Falcões Mensageiros',
  'Águias de Combate',
  'Mariposa Venenosa',
];

export const SUMMON_QUESTS: SummonQuestDef[] = [
  {
    id: 'quest_ninken',
    contractName: 'Cães Ninjas (Ninken)',
    tier: 'standard',
    isGreatSummon: false,
    sanctuary: 'Canil Tático de Rastreamento',
    guardianTitle: 'Alfa Rastreador da Matilha Ninken',
    minRank: 'Genin',
    minLevel: 3,
    minChakraLevel: 2,
    minMissions: 2,
    minMerit: 120,
    costRyo: 300,
    complexityLabel: 'Quest Especial · Padrão',
    description: 'Prove sincronia de rastreamento, passe no juramento da matilha e enfrente o guardião Ninken para assinar o pergaminho de sangue.',
    bossName: 'Guardião Veterano Ninken',
    bossNature: 'Doton',
    bossAvatar: '',
    bossHp: 235,
    bossAttack: 34,
    bossSpeed: 16,
    rewardXp: 210,
    rewardChakraXp: 150,
    rewardMerit: 95,
    trialQuestions: [
      {
        id: 'ninken_1',
        topic: 'Ritual Kuchiyose',
        prompt: 'Qual é o primeiro requisito físico imediato antes de pressionar a palma no solo ao executar Kuchiyose no Jutsu?',
        options: [
          'Oferecer um selo de sangue no polegar para validar o contrato',
          'Abrir os Oito Portões Internos até o Portão da Morte',
          'Ativar um Genjutsu ocular contra si mesmo',
          'Esvaziar completamente o chakra para zero',
        ],
        correctIndex: 0,
      },
      {
        id: 'ninken_2',
        topic: 'Tática Ninken',
        prompt: 'Qual é a especialidade tática mais famosa da matilha Ninken em operações de campo?',
        options: [
          'Derreter armaduras com lava vulcânica',
          'Rastreamento olfativo implacável e emboscadas subterrâneas coordenadas',
          'Absorver Bijuudamas com barreiras gravitacionais',
          'Cura cirúrgica em massa através de mitose celular',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'quest_corvos',
    contractName: 'Corvos de Ilusão',
    tier: 'standard',
    isGreatSummon: false,
    sanctuary: 'Bosque Crepuscular dos Corvos',
    guardianTitle: 'Bandos Sombrios de Karasu',
    minRank: 'Genin',
    minLevel: 3,
    minChakraLevel: 2,
    minMissions: 2,
    minMerit: 120,
    costRyo: 300,
    complexityLabel: 'Quest Especial · Padrão',
    description: 'Decifre as fintas visuais do bando negro e vença o duelo simbólico contra o Corvo Sentinela para selar o pacto.',
    bossName: 'Corvo Sentinela de Névoa',
    bossNature: 'Katon',
    bossAvatar: '',
    bossHp: 225,
    bossAttack: 35,
    bossSpeed: 18,
    rewardXp: 210,
    rewardChakraXp: 155,
    rewardMerit: 95,
    trialQuestions: [
      {
        id: 'corvo_1',
        topic: 'Finta de Penas',
        prompt: 'Como shinobis ilusionistas utilizam bandos de corvos invocados durante combates de alto risco?',
        options: [
          'Para minerar ferro magnético no deserto',
          'Para dispersar a linha de visão, camuflar clones e mascarar o início de ilusões',
          'Para erguer muralhas de pedra maciça',
          'Para neutralizar venenos em hospitais',
        ],
        correctIndex: 1,
      },
      {
        id: 'corvo_2',
        topic: 'Controle de Fluxo',
        prompt: 'Qual atributo garante estabilidade ao invocar dezenas de corvos simultaneamente sem desperdiçar chakra?',
        options: [
          'Ignorar selos de mão',
          'Controle preciso de Chakra aliado ao contrato assinado',
          'Peso corporal elevado',
          'Apenas força física bruta',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'quest_falcoes',
    contractName: 'Falcões Mensageiros',
    tier: 'standard',
    isGreatSummon: false,
    sanctuary: 'Penhascos dos Ventos Cortantes',
    guardianTitle: 'Falcão Real Takamaru',
    minRank: 'Genin',
    minLevel: 3,
    minChakraLevel: 2,
    minMissions: 2,
    minMerit: 120,
    costRyo: 300,
    complexityLabel: 'Quest Especial · Padrão',
    description: 'Supere o teste de altitude e intercepte o voo supersônico do Falcão Real para conquistar o pacto aéreo.',
    bossName: 'Falcão Real das Correntes',
    bossNature: 'Fuuton',
    bossAvatar: '',
    bossHp: 220,
    bossAttack: 34,
    bossSpeed: 20,
    rewardXp: 205,
    rewardChakraXp: 150,
    rewardMerit: 95,
    trialQuestions: [
      {
        id: 'falcao_1',
        topic: 'Reconhecimento Aéreo',
        prompt: 'Qual a principal vantagem estratégica dos Falcões Mensageiros em grandes guerras e fronteiras?',
        options: [
          'Comunicação rápida entre nações e suporte aéreo veloz',
          'Construção de túneis subterrâneos profundos',
          'Paralisia por sombras estendidas no solo',
          'Regeneração do selo Byakugo',
        ],
        correctIndex: 0,
      },
      {
        id: 'falcao_2',
        topic: 'Proporção de Chakra',
        prompt: 'No Kuchiyose no Jutsu, o que determina o porte e a resistência da ave invocada?',
        options: [
          'A cor da bandana do usuário',
          'A quantidade de chakra canalizada no momento da invocação',
          'O preço da kunai equipada',
          'O clima apenas do País da Água',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'quest_aguias',
    contractName: 'Águias de Combate',
    tier: 'standard',
    isGreatSummon: false,
    sanctuary: 'Pico das Nuvens Trovejantes',
    guardianTitle: 'Águia Gigante Garuda',
    minRank: 'Genin',
    minLevel: 4,
    minChakraLevel: 2,
    minMissions: 3,
    minMerit: 140,
    costRyo: 380,
    complexityLabel: 'Quest Especial · Padrão',
    description: 'Domine o equilíbrio em queda livre e sobreviva aos mergulhos da Águia Gigante para assinar o pergaminho celeste.',
    bossName: 'Águia Gigante dos Cânions',
    bossNature: 'Raiton',
    bossAvatar: '',
    bossHp: 255,
    bossAttack: 38,
    bossSpeed: 20,
    rewardXp: 230,
    rewardChakraXp: 165,
    rewardMerit: 110,
    trialQuestions: [
      {
        id: 'aguia_1',
        topic: 'Manobra Aérea',
        prompt: 'Durante um combate contra usuários terrestres poderosos, como uma Águia de Combate muda o rumo da luta?',
        options: [
          'Oferecendo mobilidade vertical e ataques em rasante fora da linha de defesa',
          'Prendendo o invocador embaixo da terra',
          'Selando os próprios tenketsu',
          'Dissolvendo espadas em névoa ácida',
        ],
        correctIndex: 0,
      },
      {
        id: 'aguia_2',
        topic: 'Ordem dos Selos',
        prompt: 'Qual a sequência clássica de 5 selos usada para invocações de combate padrão?',
        options: [
          'Javali -> Cão -> Pássaro -> Macaco -> Carneiro',
          'Tigre -> Dragão -> Tigre -> Cobra -> Tigre',
          'Boi -> Coelho -> Macaco',
          'Carneiro -> Cavalo -> Coelho -> Javali',
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    id: 'quest_mariposa',
    contractName: 'Mariposa Venenosa',
    tier: 'standard',
    isGreatSummon: false,
    sanctuary: 'Vale Oculto dos Pólens Carmesins',
    guardianTitle: 'Mariposa Imperatriz Ageha',
    minRank: 'Genin',
    minLevel: 4,
    minChakraLevel: 2,
    minMissions: 3,
    minMerit: 140,
    costRyo: 380,
    complexityLabel: 'Quest Especial · Padrão',
    description: 'Resista às nuvens de esporos paralisantes e derrote a Mariposa Guardiã para gravar seu nome no contrato.',
    bossName: 'Mariposa Rainha Tóxica',
    bossNature: 'Suiton',
    bossAvatar: '',
    bossHp: 245,
    bossAttack: 37,
    bossSpeed: 18,
    rewardXp: 225,
    rewardChakraXp: 165,
    rewardMerit: 110,
    trialQuestions: [
      {
        id: 'mariposa_1',
        topic: 'Dispersão de Pólen',
        prompt: 'Como nuvens de escamas tóxicas dispersadas por insetos gigantes afetam shinobis desprevenidos?',
        options: [
          'Reduzem a visibilidade, aplicam intoxicação contínua e abrem brechas para capturas',
          'Aumentam o HP do inimigo',
          'Desfazem contratos Sábios instantaneamente',
          'Substituem o elemento Katon por Raiton',
        ],
        correctIndex: 0,
      },
      {
        id: 'mariposa_2',
        topic: 'Pacto de Sangue',
        prompt: 'O que acontece caso um ninja tente realizar Kuchiyose no Jutsu sem possuir nenhum contrato assinado?',
        options: [
          'Invoca o Rei dos Sapos automaticamente',
          'A técnica falha ou transporta o usuário aleatoriamente ao santuário compatível sem aliado',
          'Ganha 10.000 Ryo do Kage',
          'Destrói a bandana da vila',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'quest_sapos_myoboku',
    contractName: 'Sapos do Monte Myoboku (Gamabunta)',
    tier: 'great_sage',
    isGreatSummon: true,
    sanctuary: 'Monte Myoboku · Santuário dos Sapos Sábios',
    guardianTitle: 'Chefe Sapo Gamabunta & Grande Sábio',
    minRank: 'Chunin',
    minLevel: 10,
    minChakraLevel: 4,
    minMissions: 12,
    minMerit: 350,
    costRyo: 2500,
    complexityLabel: 'Três Grandes Invocações · Quest Sábia Extrema (3 Etapas)',
    description: 'Uma das Três Grandes Invocações Lendárias. Exige patente Chunin+, Nível 10, Chakra Nv.4, 12+ Missões, 350 Mérito, oferenda de 2.500 Ryo, 100% na Provação de Energia Natural e vitória contra o Chefe Sapo Gamabunta!',
    bossName: 'Gamabunta, O Chefe Sapo de Myoboku',
    bossNature: 'Suiton',
    bossAvatar: 'https://static.wikia.nocookie.net/naruto/images/f/f6/Gamabunta2.png/revision/latest/scale-to-width-down/800?cb=20150131220923',
    bossHp: 640,
    bossAttack: 88,
    bossSpeed: 28,
    rewardXp: 950,
    rewardChakraXp: 680,
    rewardMerit: 420,
    trialQuestions: [
      {
        id: 'myoboku_1',
        topic: 'Equilíbrio de Senjutsu (Myoboku)',
        prompt: 'Durante o treinamento no Monte Myoboku, o que ocorre com o ninja que absorve Energia Natural em excesso sem equilibrá-la com chakra físico e espiritual?',
        options: [
          'Transforma-se gradualmente em sapo até petrificar-se em pedra',
          'Desbloqueia instantaneamente o Tsukuyomi Infinito',
          'Converte todo seu chakra em elemento Jinton',
          'Torna-se imune a qualquer dano físico para sempre',
        ],
        correctIndex: 0,
      },
      {
        id: 'myoboku_2',
        topic: 'Óleo do Monte Myoboku',
        prompt: 'Como o óleo especial do Monte Myoboku auxilia na percepção da Energia Natural e também em batalha?',
        options: [
          'Evapora instantaneamente e apaga memórias',
          'Facilita sentir Energia Natural enquanto está aplicado e potencializa técnicas Katon em combos devastadores',
          'Impede que sapos usem Suiton',
          'Substitui os selos de mão por veneno paralítico',
        ],
        correctIndex: 1,
      },
      {
        id: 'myoboku_3',
        topic: 'Teste de Respeito de Gamabunta',
        prompt: 'Quando um shinobi consegue invocar Gamabunta pela primeira vez em crise, o que o Chefe Sapo exige antes de reconhecer o invocador?',
        options: [
          'Que o invocador pague apenas 10 Ryo',
          'Que o invocador suporte suas manobras colossais sem cair e prove coragem digna de um Sannin',
          'Que o invocador abandone sua vila natal',
          'Que o invocador nunca use Ninjutsu',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'quest_lesmas_shikkotsu',
    contractName: 'Lesmas da Floresta Shikkotsu (Katsuyu)',
    tier: 'great_sage',
    isGreatSummon: true,
    sanctuary: 'Floresta Shikkotsu · Clareira Sábia',
    guardianTitle: 'Rainha Lesma Katsuyu',
    minRank: 'Chunin',
    minLevel: 10,
    minChakraLevel: 4,
    minMissions: 12,
    minMerit: 350,
    costRyo: 2500,
    complexityLabel: 'Três Grandes Invocações · Quest Sábia Extrema (3 Etapas)',
    description: 'Uma das Três Grandes Invocações Lendárias. Exige patente Chunin+, Nível 10, Chakra Nv.4, 12+ Missões, 350 Mérito, oferenda de 2.500 Ryo, 100% na Provação Médica & Sábia e superação do Avatar de Katsuyu!',
    bossName: 'Avatar Colossal de Katsuyu (Shikkotsu)',
    bossNature: 'Suiton',
    bossAvatar: 'https://static.wikia.nocookie.net/naruto/images/5/59/Katsuyu_Summoned.png/revision/latest/scale-to-width-down/800?cb=20150131221131',
    bossHp: 660,
    bossAttack: 84,
    bossSpeed: 26,
    rewardXp: 950,
    rewardChakraXp: 700,
    rewardMerit: 420,
    trialQuestions: [
      {
        id: 'shikkotsu_1',
        topic: 'Escala Real de Katsuyu',
        prompt: 'Por que nenhuma invocação isolada revela o tamanho verdadeiro completo de Katsuyu da Floresta Shikkotsu?',
        options: [
          'Porque apenas o Selo Byakugo de dois usuários unidos invocou até mesmo um décimo de seu corpo real gigante',
          'Porque ela existe apenas dentro de um Genjutsu',
          'Porque seu tamanho nunca passa de um sapo comum',
          'Porque ela se transforma em areia ao tocar água',
        ],
        correctIndex: 0,
      },
      {
        id: 'shikkotsu_2',
        topic: 'Divisão & Cura em Massa',
        prompt: 'Qual combinação de habilidades torna Katsuyu incomparável na proteção de toda uma vila ou exército?',
        options: [
          'Divisão em milhares de fragmentos imunes a esmagamento e canalização remota de Iryou-Ninjutsu (Cura)',
          'Arremesso de kunais explosivas pelas nuvens',
          'Manipulação magnética de ouro e ferro',
          'Ilusões sonoras por flauta demoníaca',
        ],
        correctIndex: 0,
      },
      {
        id: 'shikkotsu_3',
        topic: 'Defesa Ácida (Zesshi Nensan)',
        prompt: 'Além de curar aliados, qual técnica ofensiva extrema Katsuyu utiliza para proteger seu invocador de inimigos próximos?',
        options: [
          'Jatos de ácido altamente corrosivo capazes de dissolver rocha sólida instantaneamente',
          'Chamas Negras do Mangekyo Sharingan',
          'Esfera da Verdade gravitacional',
          'Prisão de Espelhos de Gelo Hyouton',
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    id: 'quest_cobras_ryuchi',
    contractName: 'Cobras da Caverna Ryuchi (Manda)',
    tier: 'great_sage',
    isGreatSummon: true,
    sanctuary: 'Caverna Ryuchi · Trono da Serpente Branca',
    guardianTitle: 'Rei Serpente Manda & Sábio Cobra Branca',
    minRank: 'Chunin',
    minLevel: 10,
    minChakraLevel: 4,
    minMissions: 12,
    minMerit: 350,
    costRyo: 2500,
    complexityLabel: 'Três Grandes Invocações · Quest Sábia Extrema (3 Etapas)',
    description: 'Uma das Três Grandes Invocações Lendárias. Exige patente Chunin+, Nível 10, Chakra Nv.4, 12+ Missões, 350 Mérito, oferenda de 2.500 Ryo, 100% na Provação da Caverna Ryuchi e subjugação de Manda em combate Rank S!',
    bossName: 'Manda, O Rei das Serpentes (Ryuchi)',
    bossNature: 'Doton',
    bossAvatar: 'https://static.wikia.nocookie.net/naruto/images/e/e0/Manda_Summoned.png/revision/latest/scale-to-width-down/800?cb=20150131221107',
    bossHp: 650,
    bossAttack: 92,
    bossSpeed: 30,
    rewardXp: 980,
    rewardChakraXp: 680,
    rewardMerit: 430,
    trialQuestions: [
      {
        id: 'ryuchi_1',
        topic: 'Provação da Caverna Ryuchi',
        prompt: 'Como o Grande Sábio da Serpente Branca na Caverna Ryuchi testa os candidatos dignos do poder das serpentes?',
        options: [
          'Injetando energia natural com presas diretamente; os fracos são devorados caso seu corpo não suporte a transformação',
          'Aplicando uma prova escrita de matemática acadêmica',
          'Solicitando ajuda na entrega de correspondência entre países',
          'Concedendo o título sem nenhum risco corporal',
        ],
        correctIndex: 0,
      },
      {
        id: 'ryuchi_2',
        topic: 'Natureza Impiedosa de Manda',
        prompt: 'Por que Manda exige extrema cautela e domínio absoluto até mesmo de invocadores de nível Sannin?',
        options: [
          'Porque ele obedece docilmente a qualquer Estudante da Academia',
          'Porque Manda é orgulhoso, hostil ao próprio invocador e exige respeito absoluto pela força — caso contrário ataca o usuário',
          'Porque ele só consegue se mover dentro de lagos congelados',
          'Porque sua única função é curar ferimentos leves',
        ],
        correctIndex: 1,
      },
      {
        id: 'ryuchi_3',
        topic: 'Evasão Reptiliana',
        prompt: 'Qual habilidade fisiológica permite a Manda escapar de ataques mortais quase instantaneamente em campo aberto?',
        options: [
          'Troca instantânea de pele (muda) deixando o corpo exterior como isca sob as chamas',
          'Voo supersônico com asas de mariposa',
          'Criação de espelhos de cristal Hyouton',
          'Ativação automática do Byakugan',
        ],
        correctIndex: 0,
      },
    ],
  },
];

export const SPECIAL_JUTSU_QUESTS: JutsuQuestDef[] = [
  {
    id: 'quest_segundo_elemento',
    kind: 'second_element',
    title: 'Treinamento da Segunda Natureza Elemental',
    rewardLabel: 'Desbloqueia 2º Elemento de Chakra (à sua escolha)',
    grantsSecondElement: true,
    requiresNoClan: false,
    requiresNoKekkeiGenkai: false,
    minRank: 'Chunin',
    minLevel: 6,
    minChakraLevel: 3,
    minMissions: 8,
    minMerit: 220,
    minChakraControl: 16,
    costRyo: 1200,
    complexityLabel: 'QUEST DE MAESTRIA ELEMENTAL · 3 ETAPAS',
    description:
      'Submeta-se ao método intensivo de divisão por clones e folhas sensíveis de indução para despertar uma segunda afinidade elemental permanente.',
    bossName: 'Grão-Mestre da Dualidade Elemental',
    bossTitle: 'Preceptor Sênior de Transformação da Natureza',
    bossNature: 'Raiton',
    bossAvatar: '',
    bossHp: 460,
    bossAttack: 56,
    bossSpeed: 22,
    rewardXp: 420,
    rewardChakraXp: 320,
    rewardMerit: 180,
    trialQuestions: [
      {
        id: 'elem_1',
        topic: 'Papel de Indução de Chakra',
        prompt:
          'Durante o teste clássico com o papel sensível a chakra, o que acontece quando um shinobi canaliza afinidade Fuuton (Vento)?',
        options: [
          'O papel se parte ao meio instantaneamente',
          'O papel umedece por completo',
          'O papel enruga e se rasga sem fogo',
          'O papel se reduz a cinzas imediatamente',
        ],
        correctIndex: 0,
      },
      {
        id: 'elem_2',
        topic: 'Ciclo de Superioridade Elemental',
        prompt:
          'Qual par representa corretamente uma relação de vantagem elemental natural no combate shinobi?',
        options: [
          'Raiton supera Doton, e Doton supera Suiton',
          'Katon supera Suiton, e Suiton supera Doton',
          'Fuuton supera Katon, e Katon supera Suiton',
          'Doton supera Raiton, e Raiton supera Fuuton',
        ],
        correctIndex: 0,
      },
      {
        id: 'elem_3',
        topic: 'Transformação de Natureza',
        prompt:
          'Por que a maioria dos ninjas abaixo de Jonin domina apenas um elemento antes de concluir treinamentos avançados?',
        options: [
          'Dominar uma nova Transformação da Natureza exige anos ou sobrecarga de Controle de Chakra',
          'Porque apenas o Byakugan permite detectar elementos secundários',
          'Porque jutsus elementais sempre consomem HP no lugar de Chakra',
          'Porque selos de mão anulam a segunda afinidade',
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    id: 'quest_rasengan',
    kind: 'rasengan',
    title: 'Treinamento em 3 Etapas do Rasengan',
    rewardLabel: 'Aprende a técnica Rank A: Rasengan',
    rewardJutsuId: 'rasengan',
    requiresNoClan: false,
    requiresNoKekkeiGenkai: false,
    minRank: 'Genin',
    minLevel: 7,
    minChakraLevel: 3,
    minMissions: 6,
    minMerit: 180,
    minChakraControl: 16,
    costRyo: 950,
    complexityLabel: 'QUEST DE MANIPULAÇÃO DA FORMA · 3 ETAPAS',
    description:
      'Domine o pináculo ancestral da Transformação da Forma: Rotação (Balão de Água), Poder (Bola de Borracha) e Contenção Espiral sem selos de mão.',
    bossName: 'Ancião Guardião da Esfera Espiral',
    bossTitle: 'Mestre da Manipulação Pura da Forma',
    bossNature: 'Katon',
    bossAvatar: '',
    bossHp: 500,
    bossAttack: 60,
    bossSpeed: 23,
    rewardXp: 480,
    rewardChakraXp: 340,
    rewardMerit: 210,
    trialQuestions: [
      {
        id: 'ras_1',
        topic: '1ª Etapa — Balão de Água',
        prompt:
          'Qual é o objetivo central da primeira fase de treino do Rasengan usando um balão cheio d’água?',
        options: [
          'Fazer o chakra girar em múltiplas direções simultâneas até estourar o balão',
          'Congelar a água por transformação de gelo Hyouton',
          'Formar sete selos de mão em menos de um segundo',
          'Expelir fogo para evaporar o conteúdo interno',
        ],
        correctIndex: 0,
      },
      {
        id: 'ras_2',
        topic: '2ª Etapa — Bola de Borracha',
        prompt:
          'Ao passar do balão de água para a bola sólida de borracha sem líquido no interior, o shinobi treina principalmente:',
        options: [
          'Poder bruto e densidade máxima de emissão em um único ponto focal',
          'Controle de Genjutsu auditivo a longa distância',
          'Redução do peso corporal para caminhar sobre paredes',
          'Absorção passiva de chakra inimigo',
        ],
        correctIndex: 0,
      },
      {
        id: 'ras_3',
        topic: '3ª Etapa — Contenção Espiral',
        prompt:
          'Na fase final que estabiliza o Rasengan completo na palma da mão sem dispersar, o usuário combina:',
        options: [
          'Rotação + Poder contidos dentro de uma fina casca esférica estável sem exigir selos de mão',
          'Transformação de Relâmpago combinada com espelhos de gelo',
          'Abertura simultânea do Oitavo Portão da Morte',
          'Selamento de contrato sanguíneo em pergaminho',
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    id: 'quest_portoes_chakra',
    kind: 'eight_gates',
    title: 'Abertura dos Portões de Chakra (Hachimon Tonkou)',
    rewardLabel: 'Aprende a técnica Rank A: Hachimon Tonkou (Oito Portões Internos)',
    rewardJutsuId: 'hachimon_tonkou',
    requiresNoClan: true,
    requiresNoKekkeiGenkai: true,
    minRank: 'Genin',
    minLevel: 6,
    minChakraLevel: 2,
    minMissions: 6,
    minMerit: 160,
    minTaijutsu: 16,
    costRyo: 850,
    complexityLabel: 'QUEST DE TAIJUTSU PURO · APENAS SEM CLÃ & SEM KEKKEI GENKAI',
    description:
      'Provação extrema de esforço puro reservada exclusivamente a ninjas sem linhagem de clã e sem Kekkei Genkai: quebre os limitadores naturais dos Tenketsu.',
    bossName: 'Mestre Supremo dos Oito Portões',
    bossTitle: 'Vanguarda do Punho de Esforço Puro',
    bossNature: 'Katon',
    bossAvatar: '',
    bossHp: 520,
    bossAttack: 64,
    bossSpeed: 26,
    rewardXp: 520,
    rewardChakraXp: 260,
    rewardMerit: 240,
    trialQuestions: [
      {
        id: 'gate_1',
        topic: 'Primeiro Portão (Kaimon)',
        prompt:
          'Qual é a função fisiológica imediata de abrir o Primeiro Portão (Portão da Abertura - Kaimon)?',
        options: [
          'Remover as restrições cerebrais sobre os músculos, liberando 100% da força muscular do corpo',
          'Converter todo o sangue em lava corrosiva Youton',
          'Despertar habilidades oculares do Mangekyo Sharingan',
          'Invocar uma lesma gigante da Floresta Shikkotsu',
        ],
        correctIndex: 0,
      },
      {
        id: 'gate_2',
        topic: 'Suor Verde e Vapor Carmesim',
        prompt:
          'Nos portões elevados (Sexto e Sétimo Portões), o que gera a aura brilhante visível ao redor do usuário?',
        options: [
          'A evaporação instantânea do suor causada pelo calor extremo da circulação de chakra',
          'Chamas negras lançadas pelo Amaterasu',
          'Fios de marionete invisíveis de Sunagakure',
          'Nuvens venenosas de besouros kikaichu',
        ],
        correctIndex: 0,
      },
      {
        id: 'gate_3',
        topic: 'Filosofia do Esforço Puro',
        prompt:
          'Qual é a ordem correta dos quatro primeiros Portões Internos de chakra?',
        options: [
          'Abertura (Kaimon), Cura (Kyumon), Vida (Seimon) e Dor (Shomon)',
          'Morte (Shimon), Dor (Shomon), Visão (Keimon) e Limite (Tomon)',
          'Água, Vento, Relâmpago e Terra',
          'Byakugan, Sharingan, Rinnegan e Tenseigan',
        ],
        correctIndex: 0,
      },
    ],
  },
];

export const JUTSU_CATALOG: JutsuDef[] = [
  // ================= NINJUTSU GERAL (SEM ELEMENTO) =================
  { id: 'bunshin', name: 'Bunshin no Jutsu', rank: 'E', category: 'Ninjutsu', nature: 'Neutro', chakraCost: 8, basePower: 18, accuracyMod: 12, critBonus: 2, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 0, effects: [{ type: 'paralysis', target: 'enemy', chance: 35, duration: 1, label: 'Confusão de Clones (35% Paralisia 1t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/fc/Clone_technique.png/revision/latest/scale-to-width-down/800?cb=20150504141733', description: 'Clones ilusórios básicos para confundir o oponente e abrir brechas.' },
  { id: 'kawarimi', name: 'Kawarimi no Jutsu', rank: 'E', category: 'Ninjutsu', nature: 'Neutro', chakraCost: 10, basePower: 15, accuracyMod: 15, critBonus: 0, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 0, healRatio: 0.15, effects: [{ type: 'shield', target: 'self', chance: 100, duration: 1, label: 'Substituição Tática (Escudo 1t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/eb/Body_Replacement.PNG/revision/latest/scale-to-width-down/800?cb=20150504131249', description: 'Substituição rápida por tronco para evadir ataques e recuperar fôlego.' },
  { id: 'shunshin', name: 'Shunshin no Jutsu (Cintilação Corporal)', rank: 'D', category: 'Ninjutsu', nature: 'Neutro', chakraCost: 12, basePower: 30, accuracyMod: 18, critBonus: 8, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 140, effects: [{ type: 'shield', target: 'self', chance: 70, duration: 1, label: 'Deslocamento Veloz (70% Escudo 1t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/ef/Body_flicker_pt_1.png/revision/latest/scale-to-width-down/800?cb=20170123030549', description: 'Movimento em alta velocidade usando chakra nos pés para surgir no ponto cego do alvo.' },
  { id: 'kage_bunshin', name: 'Kage Bunshin no Jutsu (Clones das Sombras)', rank: 'B', category: 'Ninjutsu', nature: 'Neutro', chakraCost: 30, basePower: 64, accuracyMod: 14, critBonus: 12, requiredLevel: 4, requiredChakraLevel: 2, learnCostRyo: 720, effects: [{ type: 'shield', target: 'self', chance: 100, duration: 2, label: 'Clones Sólidos (Escudo 2t)' }, { type: 'crush', target: 'enemy', chance: 60, duration: 2, label: 'Cercamento Combinado (60% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/07/Tobirama_creating_Shadow_Clones.png/revision/latest/scale-to-width-down/800?cb=20140904190251', description: 'Divide o chakra igualmente criando réplicas físicas sólidas capazes de usar técnicas e transmitir experiência.' },
  { id: 'rasengan', name: 'Rasengan', rank: 'A', category: 'Ninjutsu', nature: 'Neutro', chakraCost: 48, basePower: 102, accuracyMod: 10, critBonus: 18, requiredLevel: 7, requiredChakraLevel: 3, learnCostRyo: 1650, questRequired: 'quest_rasengan', effects: [{ type: 'crush', target: 'enemy', chance: 85, duration: 2, label: 'Torção Espiral (85% Esmagamento 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/2/28/Rasengan.png/revision/latest/scale-to-width-down/800?cb=20250401003710', description: 'Esfera espiral de chakra puro em rotação máxima sem selos de mão. Desbloqueado via Quest Especial em 3 etapas.' },
  { id: 'hiraishin', name: 'Hiraishin no Jutsu (Deus Voador do Trovão)', rank: 'S', category: 'Ninjutsu', nature: 'Neutro', chakraCost: 62, basePower: 138, accuracyMod: 20, critBonus: 24, requiredLevel: 14, requiredChakraLevel: 5, learnCostRyo: 3900, effects: [{ type: 'shield', target: 'self', chance: 100, duration: 1, label: 'Teleporte Instantâneo (Escudo 1t)' }, { type: 'stun', target: 'enemy', chance: 60, duration: 1, label: 'Golpe nas Costas (60% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/36/A_attacks_Minato.png/revision/latest/scale-to-width-down/800?cb=20150212215443', description: 'Ninjutsu Espaço-Tempo que transporta o shinobi instantaneamente para qualquer selo de fórmula marcado.' },

  // ================= NINJUTSU ELEMENTAL: KATON =================
  { id: 'katon_hibashiri', name: 'Katon: Hibashiri (Fogo Corredor)', rank: 'D', category: 'Ninjutsu', nature: 'Katon', chakraCost: 14, basePower: 36, accuracyMod: 10, critBonus: 6, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 150, effects: [{ type: 'burn', target: 'enemy', chance: 75, duration: 2, potency: 14, label: 'Queimadura (75%, 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b7/Running_Fire.png/revision/latest/scale-to-width-down/800?cb=20150723214925', description: 'Trilha de chamas rasteiras que envolve o alvo com velocidade.' },
  { id: 'katon_goukakyuu', name: 'Katon: Goukakyuu no Jutsu', rank: 'C', category: 'Ninjutsu', nature: 'Katon', chakraCost: 22, basePower: 46, accuracyMod: 6, critBonus: 8, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 300, effects: [{ type: 'burn', target: 'enemy', chance: 85, duration: 3, potency: 18, label: 'Queimadura Intensa (85%, 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/4/48/Grandfire_Ball.PNG/revision/latest/scale-to-width-down/800?cb=20160429031210', description: 'Grande Bola de Fogo concentrada capaz de carbonizar a área frontal.' },
  { id: 'katon_housenka', name: 'Katon: Housenka no Jutsu (Chamas da Fênix)', rank: 'C', category: 'Ninjutsu', nature: 'Katon', chakraCost: 24, basePower: 48, accuracyMod: 11, critBonus: 9, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 340, effects: [{ type: 'burn', target: 'enemy', chance: 85, duration: 2, potency: 16, label: 'Chuva de Brasas (85% Queimadura 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/4/4c/Kakashi_vs_Itachi.png/revision/latest/scale-to-width-down/800?cb=20160429031512', description: 'Dispara uma saraivada de pequenas bolas de fogo em trajetórias imprevisíveis, ocultando shurikens dentro das chamas.' },
  { id: 'katon_ryuen_houka', name: 'Katon: Ryuen Houka no Jutsu', rank: 'B', category: 'Ninjutsu', nature: 'Katon', chakraCost: 35, basePower: 74, accuracyMod: 8, critBonus: 12, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 820, effects: [{ type: 'burn', target: 'enemy', chance: 90, duration: 3, potency: 22, label: 'Cabeças de Dragão (90% Queimadura 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/c/c7/Ry%C5%ABen_H%C5%8Dka_no_Jutsu.png/revision/latest/scale-to-width-down/800?cb=20131128131328', description: 'Comprime chakra Katon em diversas cabeças de dragão ígneas que perseguem múltiplos alvos.' },
  { id: 'katon_gouka_mekkyaku', name: 'Katon: Gouka Mekkyaku (Grande Aniquilação de Fogo)', rank: 'A', category: 'Ninjutsu', nature: 'Katon', chakraCost: 52, basePower: 114, accuracyMod: 9, critBonus: 16, requiredLevel: 9, requiredChakraLevel: 4, learnCostRyo: 1950, effects: [{ type: 'burn', target: 'enemy', chance: 100, duration: 3, potency: 30, label: 'Muralha de Fogo (100% Queimadura 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/95/Katon_G%C5%8Dka_Mekkyaku.png/revision/latest/scale-to-width-down/800?cb=20130725121345', description: 'Converte um mar de chakra em uma parede imensa de fogo que obriga dezenas de oponentes a combinar Suiton para contê-la.' },

  // ================= NINJUTSU ELEMENTAL: SUITON =================
  { id: 'suiton_teppoudama', name: 'Suiton: Teppoudama (Bala de Água)', rank: 'D', category: 'Ninjutsu', nature: 'Suiton', chakraCost: 14, basePower: 36, accuracyMod: 11, critBonus: 5, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 150, effects: [{ type: 'soaked', target: 'enemy', chance: 90, duration: 3, label: 'Encharcado (90%, 3t · +35% dano Raiton)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/bd/Suidan_no_Jutsu.png/revision/latest/scale-to-width-down/800?cb=20140522130836', description: 'Projétil comprimido de água disparado em linha reta com alto impacto.' },
  { id: 'suiton_suirou', name: 'Suiton: Suirou no Jutsu (Prisão de Água)', rank: 'C', category: 'Ninjutsu', nature: 'Suiton', chakraCost: 23, basePower: 42, accuracyMod: 10, critBonus: 6, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 360, effects: [{ type: 'soaked', target: 'enemy', chance: 100, duration: 3, label: 'Encharcado (100%, 3t)' }, { type: 'drowning', target: 'enemy', chance: 75, duration: 2, potency: 16, label: 'Esfera Sufocante (75% Afogamento 2t)' }, { type: 'paralysis', target: 'enemy', chance: 55, duration: 1, label: 'Aprisionado (55% Paralisia)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/84/Water_Prison.PNG/revision/latest/scale-to-width-down/800?cb=20240828123433', description: 'Prende o alvo em uma esfera densa e pesada de água onde é quase impossível respirar ou se mover.' },
  { id: 'suiton_suijinheki', name: 'Suiton: Suijinheki (Barreira Formação de Água)', rank: 'B', category: 'Ninjutsu', nature: 'Suiton', chakraCost: 28, basePower: 48, accuracyMod: 11, critBonus: 5, requiredLevel: 3, requiredChakraLevel: 2, learnCostRyo: 580, healRatio: 0.2, effects: [{ type: 'shield', target: 'self', chance: 100, duration: 2, label: 'Muralha Circular de Água (Escudo 2t)' }, { type: 'soaked', target: 'enemy', chance: 90, duration: 3, label: 'Respingo Pressurizado (90% Encharcado)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/09/Water_Encampment_Wall.png/revision/latest/scale-to-width-down/800?cb=20150912163936', description: 'Ergue uma coluna circular giratória de água pura ao redor do usuário para extinguir Katon e absorver impactos.' },
  { id: 'suiton_suiryuudan', name: 'Suiton: Suiryuudan no Jutsu', rank: 'B', category: 'Ninjutsu', nature: 'Suiton', chakraCost: 34, basePower: 68, accuracyMod: 5, critBonus: 10, requiredLevel: 4, requiredChakraLevel: 2, learnCostRyo: 750, effects: [{ type: 'soaked', target: 'enemy', chance: 100, duration: 3, label: 'Encharcado (100%, 3t)' }, { type: 'drowning', target: 'enemy', chance: 70, duration: 2, potency: 18, label: 'Afogamento (70%, 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/f5/Tobirama%27s_Water_Dragon.png/revision/latest/scale-to-width-down/800?cb=20140711100646', description: 'Dragão de água maciço que esmaga defesas com pressão hidráulica.' },
  { id: 'suiton_daibakufu', name: 'Suiton: Daibakufu no Jutsu (Grande Catarata)', rank: 'A', category: 'Ninjutsu', nature: 'Suiton', chakraCost: 48, basePower: 104, accuracyMod: 8, critBonus: 14, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1650, effects: [{ type: 'soaked', target: 'enemy', chance: 100, duration: 3, label: 'Encharcado Total (100%, 3t)' }, { type: 'drowning', target: 'enemy', chance: 80, duration: 2, potency: 22, label: 'Vórtice da Cachoeira (80% Afogamento 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/c/cf/Great_Waterfall_Technique.png/revision/latest/scale-to-width-down/800?cb=20150921215431', description: 'Ergue uma massa gigantesca de água em espiral e a precipita como uma cachoeira devastadora contra o inimigo.' },
  { id: 'suiton_bakusui_shouha', name: 'Suiton: Bakusui Shouha (Onda Explosiva)', rank: 'A', category: 'Ninjutsu', nature: 'Suiton', chakraCost: 50, basePower: 108, accuracyMod: 10, critBonus: 13, requiredLevel: 9, requiredChakraLevel: 4, learnCostRyo: 1800, effects: [{ type: 'soaked', target: 'enemy', chance: 100, duration: 4, label: 'Campo Inundado (100% Encharcado 4t)' }, { type: 'drowning', target: 'enemy', chance: 75, duration: 3, potency: 20, label: 'Tsunami Tático (75% Afogamento 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/07/Water_Release_Exploding_Water_Colliding_Wave.png/revision/latest/scale-to-width-down/800?cb=20191016215848', description: 'Libera pela boca um tsunami massivo capaz de transformar terrenos áridos em um lago inteiro sob controle do usuário.' },

  // ================= NINJUTSU ELEMENTAL: FUUTON =================
  { id: 'fuuton_reppushou', name: 'Fuuton: Reppushou (Palma do Vendaval)', rank: 'D', category: 'Ninjutsu', nature: 'Fuuton', chakraCost: 13, basePower: 35, accuracyMod: 12, critBonus: 6, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 150, effects: [{ type: 'bleed', target: 'enemy', chance: 65, duration: 2, potency: 12, label: 'Laceração de Vento (65%, 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/2/21/Gale_Palm.png/revision/latest/scale-to-width-down/800?cb=20180404110311', description: 'Rajada concentrada de vento capaz de desequilibrar adversários.' },
  { id: 'fuuton_daitoppa', name: 'Fuuton: Daitoppa', rank: 'C', category: 'Ninjutsu', nature: 'Fuuton', chakraCost: 20, basePower: 44, accuracyMod: 9, critBonus: 7, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 280, effects: [{ type: 'bleed', target: 'enemy', chance: 75, duration: 2, potency: 16, label: 'Laceração Ciclônica (75%, 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b8/Wind_Release_Great_Breakthrough.png/revision/latest/scale-to-width-down/800?cb=20240906230211', description: 'Rajada ciclônica de vento cortante que empurra adversários.' },
  { id: 'fuuton_shinkuugyoku', name: 'Fuuton: Shinkuugyoku (Esfera de Vácuo)', rank: 'B', category: 'Ninjutsu', nature: 'Fuuton', chakraCost: 32, basePower: 70, accuracyMod: 11, critBonus: 14, requiredLevel: 4, requiredChakraLevel: 2, learnCostRyo: 700, effects: [{ type: 'bleed', target: 'enemy', chance: 85, duration: 2, potency: 18, label: 'Projéteis de Vácuo (85% Laceração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/6a/Vacuum_Sphere_Anime.png/revision/latest/scale-to-width-down/800?cb=20150207104305', description: 'Inala ar profundamente e dispara balas pressurizadas de vento capazes de perfurar carne e rocha a longa distância.' },
  { id: 'rasenshuriken', name: 'Fuuton: Rasenshuriken', rank: 'S', category: 'Ninjutsu', nature: 'Fuuton', chakraCost: 70, basePower: 145, accuracyMod: 7, critBonus: 22, requiredLevel: 15, requiredChakraLevel: 5, learnCostRyo: 4000, effects: [{ type: 'bleed', target: 'enemy', chance: 100, duration: 3, potency: 28, label: 'Agulhas Microscópicas (100% Laceração 3t)' }, { type: 'chakra_seal', target: 'enemy', chance: 85, duration: 2, potency: 24, label: 'Corte na Rede de Chakra (85% Selo 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/52/F%C5%ABton_Rasenshuriken.png/revision/latest/scale-to-width-down/800?cb=20220118210921', description: 'Vórtice microscópico de lâminas de vento que desintegra a rede de chakra.' },

  // ================= NINJUTSU ELEMENTAL: DOTON =================
  { id: 'doton_shinjuu', name: 'Doton: Shinjuu Zanshu', rank: 'D', category: 'Ninjutsu', nature: 'Doton', chakraCost: 15, basePower: 37, accuracyMod: 9, critBonus: 6, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 150, effects: [{ type: 'crush', target: 'enemy', chance: 80, duration: 2, label: 'Esmagamento (80%, 2t)' }, { type: 'paralysis', target: 'enemy', chance: 65, duration: 1, label: 'Enterrado no Solo (65% Paralisia 1t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/58/Double_Suicide_Decapitation_Technique.png/revision/latest/scale-to-width-down/800?cb=20150203065356', description: 'Submerge pelo solo para puxar e imobilizar o inimigo na terra.' },
  { id: 'doton_retsudo_tenshou', name: 'Doton: Retsudo Tenshou (Palma da Terra Cortante)', rank: 'C', category: 'Ninjutsu', nature: 'Doton', chakraCost: 22, basePower: 48, accuracyMod: 9, critBonus: 8, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 340, effects: [{ type: 'crush', target: 'enemy', chance: 85, duration: 2, label: 'Fenda Rochosa (85% Esmagamento 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/12/Doton_Retsudo_Tensh%C5%8D.png/revision/latest/scale-to-width-down/800?cb=20131220220051', description: 'Canaliza chakra no solo para fazer placas tectônicas locais se chocarem e esmagarem quem estiver no centro.' },
  { id: 'doton_doryuuheki', name: 'Doton: Doryuuheki', rank: 'B', category: 'Ninjutsu', nature: 'Doton', chakraCost: 26, basePower: 42, accuracyMod: 10, critBonus: 4, requiredLevel: 3, requiredChakraLevel: 2, learnCostRyo: 550, healRatio: 0.2, effects: [{ type: 'shield', target: 'self', chance: 100, duration: 2, label: 'Muralha Rochosa (Escudo 2t)' }, { type: 'crush', target: 'enemy', chance: 60, duration: 2, label: 'Impacto Sísmico (60% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/1e/Earth_Release_Earth_Style_Wall.png/revision/latest/scale-to-width-down/800?cb=20170919092504', description: 'Ergue muralha rochosa reforçada com chakra para conter impactos.' },
  { id: 'doton_domu', name: 'Doton: Domu (Lança de Terra)', rank: 'B', category: 'Ninjutsu', nature: 'Doton', chakraCost: 33, basePower: 69, accuracyMod: 11, critBonus: 14, requiredLevel: 4, requiredChakraLevel: 2, learnCostRyo: 780, effects: [{ type: 'shield', target: 'self', chance: 100, duration: 2, label: 'Pele de Diamante Negro (Escudo 2t)' }, { type: 'crush', target: 'enemy', chance: 90, duration: 2, label: 'Impacto Blindado (90% Esmagamento 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/9c/Doton_Domu.png/revision/latest/scale-to-width-down/800?cb=20211025010638', description: 'Endurece o corpo até a rigidez do aço mineral negro, resistindo a cortes enquanto esmaga ossos em golpes diretos.' },
  { id: 'doton_yomi_numa', name: 'Doton: Yomi Numa (Pântano do Submundo)', rank: 'A', category: 'Ninjutsu', nature: 'Doton', chakraCost: 48, basePower: 98, accuracyMod: 11, critBonus: 10, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1620, effects: [{ type: 'paralysis', target: 'enemy', chance: 90, duration: 2, label: 'Lama Profunda (90% Paralisia 2t)' }, { type: 'crush', target: 'enemy', chance: 80, duration: 2, label: 'Pressão Subterrânea (80% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/7/7e/Dark_Swamp.png/revision/latest/scale-to-width-down/800?cb=20240925024544', description: 'Liquefaz uma vasta área de terra em um brejo viscoso capaz de afundar e imobilizar até invocações gigantes.' },

  // ================= NINJUTSU ELEMENTAL: RAITON =================
  { id: 'raiton_denkousekka', name: 'Raiton: Denkousekka (Centelha Veloz)', rank: 'D', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 15, basePower: 37, accuracyMod: 11, critBonus: 8, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 150, effects: [{ type: 'stun', target: 'enemy', chance: 45, duration: 1, label: 'Atordoamento (45% · 90% se Encharcado)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/c/c2/Raiton_Bakurai.png/revision/latest/scale-to-width-down/800?cb=20121115133357', description: 'Descarga elétrica curta que aumenta a velocidade do golpe.' },
  { id: 'raiton_jibashi', name: 'Raiton: Jibashi', rank: 'C', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 24, basePower: 49, accuracyMod: 11, critBonus: 12, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 350, effects: [{ type: 'stun', target: 'enemy', chance: 55, duration: 1, label: 'Atordoamento (55% · 100% se Encharcado)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/82/Lightning_Release_Electromagnetic_Murder.png/revision/latest/scale-to-width-down/800?cb=20210829211128', description: 'Descarga elétrica direcional de altíssima velocidade.' },
  { id: 'raiton_raijuu_tsuiga', name: 'Raiton: Raijuu Tsuiga (Besta Relâmpago)', rank: 'C', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 26, basePower: 54, accuracyMod: 13, critBonus: 14, requiredLevel: 3, requiredChakraLevel: 2, learnCostRyo: 420, effects: [{ type: 'stun', target: 'enemy', chance: 60, duration: 1, label: 'Mordida Elétrica (60% · 100% se Encharcado)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/65/Lightning_hound_manga.png/revision/latest?cb=20150808143725', description: 'Molda o relâmpago em um cão de caça conectado por fio de chakra ao punho para perseguir alvos ágeis.' },
  { id: 'raiton_gian', name: 'Raiton: Gian (Escuridão Falsa)', rank: 'B', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 34, basePower: 72, accuracyMod: 10, critBonus: 15, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 800, effects: [{ type: 'stun', target: 'enemy', chance: 65, duration: 1, label: 'Lanças Elétricas (65% · 100% se Encharcado)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/c/c1/Lightning_Release_False_Darkness.png/revision/latest/scale-to-width-down/800?cb=20150202075443', description: 'Dispara lanças de raios capazes de se ramificar no impacto e destruir múltiplas defesas ao mesmo tempo.' },
  { id: 'raiton_yoroi', name: 'Raiton no Yoroi (Modo de Chakra Relâmpago)', rank: 'B', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 36, basePower: 64, accuracyMod: 16, critBonus: 16, requiredLevel: 5, requiredChakraLevel: 3, learnCostRyo: 880, effects: [{ type: 'shield', target: 'self', chance: 100, duration: 2, label: 'Armadura Elétrica (Escudo 2t)' }, { type: 'stun', target: 'enemy', chance: 55, duration: 1, label: 'Sinapse Sônica (55% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/81/Raiton_no_yoroi.png/revision/latest/scale-to-width-down/800?cb=20150518165136', description: 'Envolve o corpo com chakra elétrico para acelerar os reflexos sinápticos ao limite humano e resistir a lâminas.' },
  { id: 'chidori', name: 'Chidori (Mil Pássaros)', rank: 'A', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 46, basePower: 98, accuracyMod: 8, critBonus: 22, requiredLevel: 7, requiredChakraLevel: 3, learnCostRyo: 1500, effects: [{ type: 'stun', target: 'enemy', chance: 65, duration: 1, label: 'Atordoamento (65% · 100% se Encharcado)' }, { type: 'crush', target: 'enemy', chance: 80, duration: 2, label: 'Perfuração Raiton (80% Esmagamento 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/50/Sasuke%27s_chidori.png/revision/latest/scale-to-width-down/800?cb=20220118071928', description: 'Concentração letal de relâmpago na palma com investida sônica.' },
  { id: 'raikiri', name: 'Raikiri (Corte Relâmpago)', rank: 'S', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 60, basePower: 132, accuracyMod: 13, critBonus: 26, requiredLevel: 12, requiredChakraLevel: 4, learnCostRyo: 3100, effects: [{ type: 'stun', target: 'enemy', chance: 75, duration: 1, label: 'Corte Elétrico (75% · 100% se Encharcado)' }, { type: 'bleed', target: 'enemy', chance: 80, duration: 2, potency: 22, label: 'Corte Cirúrgico (80% Laceração)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/91/Lightning_cutter.png/revision/latest/scale-to-width-down/800?cb=20220118070235', description: 'Forma refinada do Chidori que ganhou fama ao partir um relâmpago real ao meio em pleno ar.' },
  { id: 'kirin', name: 'Kirin', rank: 'S', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 72, basePower: 152, accuracyMod: 18, critBonus: 25, requiredLevel: 15, requiredChakraLevel: 5, learnCostRyo: 4200, effects: [{ type: 'stun', target: 'enemy', chance: 90, duration: 1, label: 'Impacto Atmosférico (90% · 100% se Encharcado)' }, { type: 'crush', target: 'enemy', chance: 100, duration: 2, label: 'Colapso Tectônico (100% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/ee/Kirin.png/revision/latest/scale-to-width-down/800?cb=20150202192059', description: 'Manipula raios naturais de nuvens de tempestade formando um dragão elétrico que atinge o solo em um milésimo de segundo.' },

  // ================= TAIJUTSU =================
  { id: 'konoha_senpuu', name: 'Konoha Senpuu', rank: 'D', category: 'Taijutsu', nature: 'Neutro', chakraCost: 12, basePower: 34, accuracyMod: 14, critBonus: 10, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 150, effects: [{ type: 'crush', target: 'enemy', chance: 55, duration: 2, label: 'Desequilíbrio (55% Esmagamento 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/7/7f/Leaf_Whirlwind.png/revision/latest/scale-to-width-down/800?cb=20150121174411', description: 'Chute giratório veloz em dois ângulos visando o torso.' },
  { id: 'renge', name: 'Omote Renge (Lótus Primária)', rank: 'B', category: 'Taijutsu', nature: 'Neutro', chakraCost: 35, basePower: 74, accuracyMod: 4, critBonus: 16, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 900, effects: [{ type: 'crush', target: 'enemy', chance: 90, duration: 2, label: 'Impacto Lótus (90% Esmagamento 2t)' }, { type: 'stun', target: 'enemy', chance: 55, duration: 1, label: 'Concussão (55% Atordoamento 1t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/9c/Front_Lotus_Lee.png/revision/latest/scale-to-width-down/800?cb=20240901230614', description: 'Abre o Primeiro Portão para arremessar o oponente em queda giratória.' },
  { id: 'ura_renge', name: 'Ura Renge (Lótus Reversa)', rank: 'A', category: 'Taijutsu', nature: 'Neutro', chakraCost: 46, basePower: 98, accuracyMod: 10, critBonus: 20, requiredLevel: 7, requiredChakraLevel: 3, learnCostRyo: 1550, effects: [{ type: 'crush', target: 'enemy', chance: 95, duration: 2, label: 'Combo Sônico (95% Esmagamento 2t)' }, { type: 'stun', target: 'enemy', chance: 65, duration: 1, label: 'Choque de Queda (65% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/ed/Reverse_Lotus.png/revision/latest/scale-to-width-down/800?cb=20150529160332', description: 'Com o terceiro ao quinto portão abertos, dispara dezenas de golpes no ar antes de esmagar o alvo contra o chão.' },
  { id: 'hachimon_tonkou', name: 'Hachimon Tonkou (Oito Portões Internos)', rank: 'A', category: 'Taijutsu', nature: 'Neutro', chakraCost: 50, basePower: 104, accuracyMod: 12, critBonus: 22, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1750, questRequired: 'quest_portoes_chakra', effects: [{ type: 'crush', target: 'enemy', chance: 90, duration: 2, label: 'Pressão Liberada (90% Esmagamento 2t)' }, { type: 'shield', target: 'self', chance: 100, duration: 1, label: 'Aura de Vapor Carmesim (Escudo 1t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e3/Eight_Gates-Rock_Lee.png/revision/latest/scale-to-width-down/800?cb=20210219185416', description: 'Remove os limitadores internos do fluxo de chakra corporal, multiplicando força e velocidade além dos padrões normais. Exclusivo via Quest Especial (Sem Clã e Sem Kekkei Genkai).' },
  { id: 'asakujaku', name: 'Asakujaku (Pavão da Manhã)', rank: 'A', category: 'Taijutsu', nature: 'Neutro', chakraCost: 52, basePower: 112, accuracyMod: 11, critBonus: 20, requiredLevel: 9, requiredChakraLevel: 4, learnCostRyo: 1900, effects: [{ type: 'burn', target: 'enemy', chance: 80, duration: 2, potency: 22, label: 'Fricção Ígnea do Ar (80% Queimadura 2t)' }, { type: 'crush', target: 'enemy', chance: 85, duration: 2, label: 'Leque de Socos (85% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e2/Asakujaku.png/revision/latest/scale-to-width-down/800?cb=20250819102256', description: 'Com o Sexto Portão aberto, soca o ar em velocidades tão absurdas que cria ondas de choque inflamadas em formato de leque.' },
  { id: 'hirudora', name: 'Hirudora (Tigre Diurno)', rank: 'A', category: 'Taijutsu', nature: 'Neutro', chakraCost: 58, basePower: 124, accuracyMod: 12, critBonus: 24, requiredLevel: 10, requiredChakraLevel: 4, learnCostRyo: 2300, effects: [{ type: 'crush', target: 'enemy', chance: 100, duration: 2, label: 'Onda de Pressão Sétimo Portão (100% Esmagamento)' }, { type: 'stun', target: 'enemy', chance: 70, duration: 1, label: 'Explosão de Ar (70% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/f3/Guy_attack_Madara.png/revision/latest/scale-to-width-down/800?cb=20230629144044', description: 'Dispara um soco único sob o Sétimo Portão, comprimindo ar puro em um tigre titânico que detona ao menor contato.' },
  { id: 'yagai', name: 'Yagai (Guy Noturno)', rank: 'S', category: 'Taijutsu', nature: 'Neutro', chakraCost: 76, basePower: 162, accuracyMod: 16, critBonus: 30, requiredLevel: 16, requiredChakraLevel: 5, learnCostRyo: 4800, effects: [{ type: 'crush', target: 'enemy', chance: 100, duration: 3, label: 'Distorção Espacial pelo Impacto (100% Esmagamento 3t)' }, { type: 'bleed', target: 'enemy', chance: 90, duration: 3, potency: 30, label: 'Fratura Massiva (90% Laceração 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/bd/Night_Guy_Silhouette.png/revision/latest/scale-to-width-down/800?cb=20150730122532', description: 'O ataque proibido máximo do Oitavo Portão da Morte: uma investida com aura de dragão sangrento que distorce o próprio espaço.' },

  // ================= GENJUTSU =================
  { id: 'genjutsu_narakumi', name: 'Magen: Narakumi no Jutsu', rank: 'D', category: 'Genjutsu', nature: 'Yin', chakraCost: 14, basePower: 30, accuracyMod: 13, critBonus: 6, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 150, effects: [{ type: 'paralysis', target: 'enemy', chance: 70, duration: 1, label: 'Visão Aterradora (70% Paralisia 1t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/83/Hell_Viewing_Technique.png/revision/latest/scale-to-width-down/800?cb=20150203070119', description: 'Ilusão inicial que faz o alvo contemplar uma visão chocante, travando seus movimentos.' },
  { id: 'genjutsu_karasu', name: 'Magen: Jubaku Satsu', rank: 'B', category: 'Genjutsu', nature: 'Yin', chakraCost: 28, basePower: 58, accuracyMod: 12, critBonus: 11, requiredLevel: 4, requiredChakraLevel: 2, learnCostRyo: 680, effects: [{ type: 'paralysis', target: 'enemy', chance: 90, duration: 2, label: 'Paralisia Ilusória (90%, 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/09/Demonic_Illusion.png/revision/latest/scale-to-width-down/800?cb=20240820183706', description: 'Ilusão arbórea que prende o oponente no lugar e imobiliza seus movimentos.' },
  { id: 'mateki_mugen_onsa', name: 'Mateki: Mugen Onsa (Correntes Sonoras Fantasma)', rank: 'B', category: 'Genjutsu', nature: 'Yin', chakraCost: 30, basePower: 62, accuracyMod: 14, critBonus: 11, requiredLevel: 4, requiredChakraLevel: 2, learnCostRyo: 720, effects: [{ type: 'paralysis', target: 'enemy', chance: 90, duration: 2, label: 'Amarras Sonoras (90% Paralisia 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/35/Demon_Flute_Phantom_Sound_Chains.png/revision/latest/scale-to-width-down/800?cb=20150307021858', description: 'Genjutsu auditivo transmitido por melodia de flauta que envolve os membros do alvo em fios de som paralisantes.' },
  { id: 'genjutsu_sharingan', name: 'Genjutsu: Sharingan (Hipnose Ocular)', rank: 'B', category: 'Genjutsu', nature: 'Yin', chakraCost: 30, basePower: 60, accuracyMod: 14, critBonus: 12, requiredLevel: 4, requiredChakraLevel: 2, learnCostRyo: 740, kekkeiRequired: 'Sharingan', effects: [{ type: 'mind_control', target: 'enemy', chance: 75, duration: 1, label: 'Genjutsu Ocular: Controle Mental (75%, 1t)' }, { type: 'paralysis', target: 'enemy', chance: 70, duration: 2, label: 'Paralisia Hipnótica (70%, 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/6b/Genjutsu_Sharingan.png/revision/latest/scale-to-width-down/800?cb=20220214124807', description: 'Contato visual direto do Sharingan para sugerir comandos momentâneos e paralisar o adversário.' },
  { id: 'nehan_shouja', name: 'Nehan Shouja no Jutsu (Templo do Nirvana)', rank: 'A', category: 'Genjutsu', nature: 'Yin', chakraCost: 40, basePower: 76, accuracyMod: 15, critBonus: 10, requiredLevel: 7, requiredChakraLevel: 3, learnCostRyo: 1380, effects: [{ type: 'paralysis', target: 'enemy', chance: 95, duration: 2, label: 'Sonolência de Penas (95% Paralisia 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/99/Temple_of_Nirvana.png/revision/latest/scale-to-width-down/800?cb=20240903200139', description: 'Faz penas brancas caírem do céu em ampla área, induzindo sono profundo e paralisia em quem contemplar.' },
  { id: 'magen_subjugacao', name: 'Magen: Subjugação Mental', rank: 'A', category: 'Genjutsu', nature: 'Yin', chakraCost: 42, basePower: 82, accuracyMod: 13, critBonus: 12, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1500, effects: [{ type: 'mind_control', target: 'enemy', chance: 75, duration: 1, label: 'Controle Mental Ilusório (75%, 1t)' }, { type: 'paralysis', target: 'enemy', chance: 65, duration: 2, label: 'Paralisia Psíquica (65%, 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b2/False_Surrondings_1.png/revision/latest/scale-to-width-down/800?cb=20150529132306', description: 'Genjutsu avançado que distorce a percepção e obriga o oponente a atacar a si próprio por instantes.' },
  { id: 'kokuangyou', name: 'Kokuangyou no Jutsu (Portador da Escuridão)', rank: 'A', category: 'Genjutsu', nature: 'Yin', chakraCost: 44, basePower: 88, accuracyMod: 15, critBonus: 13, requiredLevel: 9, requiredChakraLevel: 3, learnCostRyo: 1680, effects: [{ type: 'paralysis', target: 'enemy', chance: 90, duration: 2, label: 'Cegueira Absoluta (90% Paralisia 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/8f/The_3rd_Caught_In_The_Infinite_Darkness.PNG/revision/latest/scale-to-width-down/800?cb=20240908043329', description: 'Mergulha o campo visual do alvo em breu absoluto para anular completamente sua defesa e noção de espaço.' },
  { id: 'kotoamatsukami', name: 'Kotoamatsukami', rank: 'S', category: 'Genjutsu', nature: 'Yin', chakraCost: 70, basePower: 136, accuracyMod: 18, critBonus: 20, requiredLevel: 15, requiredChakraLevel: 5, learnCostRyo: 4100, clanExclusive: 'Uchiha', kekkeiRequired: 'Mangekyo Sharingan', effects: [{ type: 'mind_control', target: 'enemy', chance: 100, duration: 2, label: 'Controle Mental Imperceptível (100%, 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/4/46/Kotoamatsukami_Activated.png/revision/latest/scale-to-width-down/800?cb=20150615204859', description: 'Genjutsu supremo de manipulação mental sutil: implanta convicções falsas no alvo sem que ele perceba estar controlado.' },

  // ================= TÉCNICAS DE CLÃ (HIDEN) =================
  { id: 'kagemane', name: 'Kagemane no Jutsu (Possessão das Sombras)', rank: 'C', category: 'Ninjutsu', nature: 'Yin', chakraCost: 22, basePower: 48, accuracyMod: 14, critBonus: 8, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 420, clanExclusive: 'Nara', effects: [{ type: 'paralysis', target: 'enemy', chance: 90, duration: 2, label: 'Clã Nara: Imobilização pelas Sombras (90%, 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/02/Shadow_Imitation_Technique.png/revision/latest/scale-to-width-down/800?cb=20150222031550', description: 'Estende a própria sombra para capturar e imobilizar o oponente.' },
  { id: 'kage_kubishibari', name: 'Kage Kubishibari no Jutsu (Estrangulamento Sombrio)', rank: 'B', category: 'Ninjutsu', nature: 'Yin', chakraCost: 34, basePower: 72, accuracyMod: 13, critBonus: 12, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 800, clanExclusive: 'Nara', effects: [{ type: 'paralysis', target: 'enemy', chance: 90, duration: 2, label: 'Sombra Física (90% Paralisia 2t)' }, { type: 'crush', target: 'enemy', chance: 80, duration: 2, label: 'Compressão Sombria (80% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/fd/Shadow_Neck_Binding.png/revision/latest/scale-to-width-down/800?cb=20150307030619', description: 'Materializa a sombra capturada em uma mão sólida que sobe pelo corpo do adversário para sufocá-lo.' },
  { id: 'yamanaka_shintenshin', name: 'Shintenshin no Jutsu (Transferência da Mente)', rank: 'C', category: 'Ninjutsu', nature: 'Yin', chakraCost: 24, basePower: 42, accuracyMod: 10, critBonus: 8, requiredLevel: 2, requiredChakraLevel: 2, learnCostRyo: 450, clanExclusive: 'Yamanaka', effects: [{ type: 'mind_control', target: 'enemy', chance: 90, duration: 2, label: 'Clã Yamanaka: Controle Mental (90%, 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b7/Mind_Body_Switch_Handseal.png/revision/latest/scale-to-width-down/800?cb=20150504141223', description: 'Projeta a consciência do usuário para assumir temporariamente o controle do corpo do adversário.' },
  { id: 'yamanaka_shinranshin', name: 'Shinranshin no Jutsu (Perturbação da Mente)', rank: 'B', category: 'Ninjutsu', nature: 'Yin', chakraCost: 34, basePower: 56, accuracyMod: 12, critBonus: 10, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 820, clanExclusive: 'Yamanaka', effects: [{ type: 'mind_control', target: 'enemy', chance: 95, duration: 2, label: 'Clã Yamanaka: Controle Mental Forçado (95%, 2t)' }, { type: 'paralysis', target: 'enemy', chance: 60, duration: 1, label: 'Desorientação Motora (60%, 1t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/c/c2/Inoichi.png/revision/latest/scale-to-width-down/800?cb=20160121222821', description: 'Envia ondas de chakra espiritual que sequestram o sistema nervoso e forçam o inimigo contra si mesmo.' },
  { id: 'akimichi_baika', name: 'Baika no Jutsu (Expansão Corporal)', rank: 'C', category: 'Taijutsu', nature: 'Yang', chakraCost: 22, basePower: 52, accuracyMod: 11, critBonus: 10, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 420, clanExclusive: 'Akimichi', effects: [{ type: 'crush', target: 'enemy', chance: 90, duration: 2, label: 'Massa Colossal Akimichi (90% Esmagamento 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/83/Multi-Size_Technique.png/revision/latest/scale-to-width-down/800?cb=20150424175425', description: 'Converte calorias armazenadas em aumento drástico de massa corporal para esmagar linhas inimigas.' },
  { id: 'aburame_kikaichu', name: 'Kikaichu no Jutsu (Enxame Parasita)', rank: 'C', category: 'Ninjutsu', nature: 'Neutro', chakraCost: 22, basePower: 46, accuracyMod: 14, critBonus: 8, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 440, clanExclusive: 'Aburame', effects: [{ type: 'chakra_seal', target: 'enemy', chance: 90, duration: 2, potency: 22, label: 'Dreno Kikaichu (90% Selo de Chakra 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/c/c3/Destruction_Bug_Host_Technique.png/revision/latest/scale-to-width-down/481?cb=20140621103150', description: 'Libera milhões de besouros kikaichu simbiontes do próprio corpo para cercar o alvo e devorar suas reservas de chakra.' },
  { id: 'inuzuka_gatsuuga', name: 'Gatsuuga (Presa Sobre Presa)', rank: 'C', category: 'Taijutsu', nature: 'Neutro', chakraCost: 24, basePower: 55, accuracyMod: 12, critBonus: 16, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 450, clanExclusive: 'Inuzuka', effects: [{ type: 'bleed', target: 'enemy', chance: 80, duration: 2, potency: 16, label: 'Torção Bestial (80% Laceração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/a/a1/Fang_passing_fang.png/revision/latest/scale-to-width-down/800?cb=20240908045504', description: 'Shinobi e parceiro Ninken giram como furadeiras humanas gêmeas, estraçalhando o adversário em alta velocidade.' },
  { id: 'hozuki_suika', name: 'Suika no Jutsu (Técnica da Hidrificação)', rank: 'B', category: 'Ninjutsu', nature: 'Suiton', chakraCost: 30, basePower: 60, accuracyMod: 13, critBonus: 10, requiredLevel: 4, requiredChakraLevel: 2, learnCostRyo: 780, clanExclusive: 'Hozuki', effects: [{ type: 'shield', target: 'self', chance: 100, duration: 2, label: 'Corpo Líquido (Escudo 2t)' }, { type: 'soaked', target: 'enemy', chance: 95, duration: 3, label: 'Encharcado (95%, 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/d/d4/Hydrification_Technique.png/revision/latest/scale-to-width-down/800?cb=20150131223735', description: 'Liquefaz os tecidos corporais à vontade, tornando armas cortantes e golpes físicos comuns praticamente ineficazes.' },
  { id: 'sabaku_kyuu', name: 'Sabaku Kyuu / Suna no Mayu (Caixão de Areia)', rank: 'B', category: 'Ninjutsu', nature: 'Doton', chakraCost: 34, basePower: 74, accuracyMod: 12, critBonus: 12, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 850, clanExclusive: 'Linhagem Kazekage', effects: [{ type: 'crush', target: 'enemy', chance: 95, duration: 2, label: 'Pressão da Areia (95% Esmagamento 2t)' }, { type: 'paralysis', target: 'enemy', chance: 75, duration: 1, label: 'Prisão Mineral (75% Paralisia 1t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e2/Sand_Coffin.PNG/revision/latest/scale-to-width-down/800?cb=20240901215848', description: 'Envolve totalmente o oponente em areia compactada impregnada de chakra para imobilizar e esmagar seu corpo.' },

  // ================= KEKKEI GENKAI & KEKKEI TOTA =================
  { id: 'hyuga_kaiten', name: 'Hakkeshō Kaiten (Rotação Celestial)', rank: 'B', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 32, basePower: 66, accuracyMod: 12, critBonus: 12, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 840, clanExclusive: 'Hyuga', kekkeiRequired: 'Byakugan', effects: [{ type: 'shield', target: 'self', chance: 100, duration: 2, label: 'Cúpula Rotatória (Escudo 2t)' }, { type: 'chakra_seal', target: 'enemy', chance: 65, duration: 2, potency: 16, label: 'Repulsão de Chakra (65% Selo)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b4/Eight_Trigrams_Palms_Revolving_Heaven.png/revision/latest/scale-to-width-down/800?cb=20150316094721', description: 'Emite chakra por todos os tenketsu enquanto gira rapidamente, criando uma cúpula defensiva que desvia projéteis e repele atacantes.' },
  { id: 'hyuga_kuushou', name: 'Hakke Kuushou (Palma de Vácuo)', rank: 'B', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 34, basePower: 72, accuracyMod: 13, critBonus: 14, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 860, clanExclusive: 'Hyuga', kekkeiRequired: 'Byakugan', effects: [{ type: 'crush', target: 'enemy', chance: 80, duration: 2, label: 'Onda de Choque Juken (80% Esmagamento)' }, { type: 'chakra_seal', target: 'enemy', chance: 70, duration: 2, potency: 18, label: 'Ruptura Tenketsu (70% Selo)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/16/Eight_Trigrams_Vacuum_Palm.png/revision/latest/scale-to-width-down/800?cb=20150122115839', description: 'Dispara uma onda de ar comprimido pelo Punho Gentil a média distância capaz de arremessar adversários antes da aproximação.' },
  { id: 'juuken_hakke', name: 'Hakke Rokujuuyon Shou (64 Palmas)', rank: 'A', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 45, basePower: 94, accuracyMod: 10, critBonus: 15, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1600, clanExclusive: 'Hyuga', kekkeiRequired: 'Byakugan', effects: [{ type: 'chakra_seal', target: 'enemy', chance: 100, duration: 3, potency: 26, label: 'Byakugan: 64 Tenketsu Selados (100%, 3t)' }, { type: 'paralysis', target: 'enemy', chance: 65, duration: 1, label: 'Bloqueio Neuromuscular (65% Paralisia)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/d/df/8_Trigrams_64_Palms.PNG/revision/latest/scale-to-width-down/800?cb=20090428130856', description: 'Sequência precisa do Punho Gentil selando os tenketsu do inimigo.' },
  { id: 'youton_youkai', name: 'Youton: Youkai no Jutsu (Aparição Derretedora)', rank: 'B', category: 'Kekkei Genkai', nature: 'Katon', chakraCost: 34, basePower: 74, accuracyMod: 10, critBonus: 12, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 850, kekkeiRequired: 'Youton (Lava)', effects: [{ type: 'burn', target: 'enemy', chance: 95, duration: 3, potency: 22, label: 'Lava Ácida (95% Queimadura 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b8/Mei_spitting_Lava.png/revision/latest/scale-to-width-down/800?cb=20150123214637', description: 'Funde Katon e Doton em jatos espessos de lava corrosiva capazes de derreter até o exterior do Susanoo.' },
  { id: 'futton_koumu', name: 'Futton: Koumu no Jutsu (Névoa Habilidade Corrosiva)', rank: 'B', category: 'Kekkei Genkai', nature: 'Suiton', chakraCost: 34, basePower: 70, accuracyMod: 12, critBonus: 10, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 850, kekkeiRequired: 'Futton (Vapor)', effects: [{ type: 'burn', target: 'enemy', chance: 90, duration: 2, potency: 20, label: 'Vapor Ácido (90% Corrosão/Queimadura)' }, { type: 'soaked', target: 'enemy', chance: 90, duration: 3, label: 'Condensação Úmida (90% Encharcado)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/a/ac/Skilled_Mist.png/revision/latest/scale-to-width-down/800?cb=20150123214353', description: 'Expele vapor acídico de pH controlado que corrói armaduras de chakra sem ferir o invocador.' },
  { id: 'bakuton_jiraiken', name: 'Bakuton: Jiraiken (Punho Mina Terrestre)', rank: 'B', category: 'Kekkei Genkai', nature: 'Doton', chakraCost: 34, basePower: 76, accuracyMod: 9, critBonus: 15, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 860, kekkeiRequired: 'Bakuton (Explosão)', effects: [{ type: 'crush', target: 'enemy', chance: 90, duration: 2, label: 'Detonação de Contato (90% Esmagamento)' }, { type: 'stun', target: 'enemy', chance: 50, duration: 1, label: 'Onda de Choque (50% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/bc/Landmine_Fist.png/revision/latest/scale-to-width-down/800?cb=20150123214706', description: 'Golpe físico carregado com natureza Explosão que explode violentamente o alvo ao menor contato.' },
  { id: 'hyouton_makyou', name: 'Hyouton: Makyou Hyoushou', rank: 'A', category: 'Kekkei Genkai', nature: 'Suiton', chakraCost: 44, basePower: 92, accuracyMod: 14, critBonus: 18, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1700, kekkeiRequired: 'Hyouton (Gelo)', effects: [{ type: 'freeze', target: 'enemy', chance: 85, duration: 2, label: 'Congelamento Cristalino (85%, 2t)' }, { type: 'bleed', target: 'enemy', chance: 70, duration: 2, potency: 16, label: 'Estilhaços de Gelo (70% Laceração)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/92/Demonic_Mirroring_Ice_Crystals.png/revision/latest/scale-to-width-down/800?cb=20150123214451', description: 'Cúpula de espelhos de gelo cristalinos para ataques simultâneos.' },
  { id: 'ranton_laser_circus', name: 'Ranton: Laser Circus (Circo de Laser)', rank: 'A', category: 'Kekkei Genkai', nature: 'Raiton', chakraCost: 46, basePower: 100, accuracyMod: 15, critBonus: 16, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1750, kekkeiRequired: 'Ranton (Tempestade)', effects: [{ type: 'stun', target: 'enemy', chance: 65, duration: 1, label: 'Feixes Teleguiados (65% Atordoamento)' }, { type: 'bleed', target: 'enemy', chance: 75, duration: 2, potency: 18, label: 'Cortes de Luz (75% Laceração)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/06/Ranton_Reiz%C4%81_S%C4%81kasu.png/revision/latest/scale-to-width-down/800?cb=20120705141609', description: 'Funde Suiton e Raiton em feixes luminosos flexíveis que curvam no ar perseguindo os inimigos.' },
  { id: 'shakuton_kajousatsu', name: 'Shakuton: Kajousatsu (Assassinato por Vapor)', rank: 'A', category: 'Kekkei Genkai', nature: 'Katon', chakraCost: 48, basePower: 104, accuracyMod: 12, critBonus: 17, requiredLevel: 9, requiredChakraLevel: 3, learnCostRyo: 1850, kekkeiRequired: 'Shakuton (Calor)', effects: [{ type: 'burn', target: 'enemy', chance: 100, duration: 3, potency: 26, label: 'Evaporação Instantânea (100% Queimadura 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e4/Scorch_Release_suns.png/revision/latest/scale-to-width-down/800?cb=20151102011645', description: 'Cria esferas flamejantes orbitais de Calor extremo que evaporam toda a água do corpo humano ao tocar.' },
  { id: 'sawarabi_no_mai', name: 'Sawarabi no Mai (Dança da Samambaia)', rank: 'A', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 48, basePower: 102, accuracyMod: 11, critBonus: 18, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1720, clanExclusive: 'Kaguya', kekkeiRequired: 'Shikotsumyaku (Ossos)', effects: [{ type: 'bleed', target: 'enemy', chance: 90, duration: 2, potency: 22, label: 'Floresta de Ossos (90% Laceração 2t)' }, { type: 'crush', target: 'enemy', chance: 80, duration: 2, label: 'Perfuração Óssea (80% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/6c/Kimimaro_vs_Gaara_Rock_Lee.png/revision/latest/scale-to-width-down/800?cb=20260811022134', description: 'Faz irromper do subsolo uma floresta inteira de lanças ósseas gigantes, podendo o usuário emergir de qualquer uma delas.' },
  { id: 'saten_kesshuu', name: 'Saten Kesshuu (Assalto da Areia de Ferro)', rank: 'A', category: 'Kekkei Genkai', nature: 'Doton', chakraCost: 48, basePower: 106, accuracyMod: 11, critBonus: 18, requiredLevel: 9, requiredChakraLevel: 3, learnCostRyo: 1820, kekkeiRequired: 'Saten (Areia Magnética)', effects: [{ type: 'crush', target: 'enemy', chance: 95, duration: 2, label: 'Colisão Magnética (95% Esmagamento 2t)' }, { type: 'paralysis', target: 'enemy', chance: 65, duration: 1, label: 'Peso Férrico (65% Paralisia)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b7/Satetsu_Kessh%C5%AB.png/revision/latest/scale-to-width-down/800?cb=20240827203121', description: 'Compacta limalha de ferro com chakra magnético em blocos colossais que destroem defesas e marionetes.' },
  { id: 'tsukuyomi', name: 'Tsukuyomi', rank: 'S', category: 'Kekkei Genkai', nature: 'Yin', chakraCost: 65, basePower: 132, accuracyMod: 14, critBonus: 20, requiredLevel: 14, requiredChakraLevel: 5, learnCostRyo: 3500, clanExclusive: 'Uchiha', kekkeiRequired: 'Mangekyo Sharingan', effects: [{ type: 'mind_control', target: 'enemy', chance: 90, duration: 2, label: 'Tsukuyomi: Controle Psíquico (90%, 2t)' }, { type: 'stun', target: 'enemy', chance: 80, duration: 1, label: 'Colapso Temporal (80% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/14/Tsukuyomi.png/revision/latest/scale-to-width-down/800?cb=20260701122915', description: 'Genjutsu supremo que distorce 72 horas em um segundo.' },
  { id: 'amaterasu', name: 'Amaterasu', rank: 'S', category: 'Kekkei Genkai', nature: 'Katon', chakraCost: 68, basePower: 140, accuracyMod: 12, critBonus: 18, requiredLevel: 14, requiredChakraLevel: 5, learnCostRyo: 3800, clanExclusive: 'Uchiha', kekkeiRequired: 'Mangekyo Sharingan', effects: [{ type: 'black_flames', target: 'enemy', chance: 100, duration: 4, potency: 32, label: 'Sharingan: Chamas Negras Inextinguíveis (100%, 4t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e0/Amaterasu.png/revision/latest/scale-to-width-down/800?cb=20151203010730', description: 'Chamas negras inextinguíveis no ponto focal da visão.' },
  { id: 'susanoo', name: 'Susanoo (Armadura Espiritual)', rank: 'S', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 70, basePower: 144, accuracyMod: 14, critBonus: 20, requiredLevel: 15, requiredChakraLevel: 5, learnCostRyo: 4200, clanExclusive: 'Uchiha', kekkeiRequired: 'Mangekyo Sharingan', effects: [{ type: 'shield', target: 'self', chance: 100, duration: 3, label: 'Avatar Humanoide Mangekyo (Escudo 3t)' }, { type: 'crush', target: 'enemy', chance: 95, duration: 2, label: 'Espada Espiritual (95% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/2/2b/Susanoo.png/revision/latest/scale-to-width-down/800?cb=20150207103348', description: 'Invoca um guerreiro espiritual colossal de chakra solidificado que protege o usuário e esmaga o campo de batalha.' },
  { id: 'kamui', name: 'Kamui', rank: 'S', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 68, basePower: 140, accuracyMod: 18, critBonus: 22, requiredLevel: 15, requiredChakraLevel: 5, learnCostRyo: 4100, clanExclusive: 'Uchiha', kekkeiRequired: 'Mangekyo Sharingan', effects: [{ type: 'shield', target: 'self', chance: 100, duration: 2, label: 'Intangibilidade Espacial (Escudo 2t)' }, { type: 'paralysis', target: 'enemy', chance: 75, duration: 1, label: 'Sucção Dimensional (75% Paralisia)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/6a/Obito%27s_kamui.png/revision/latest/scale-to-width-down/800?cb=20160819164838', description: 'Distorce o espaço-tempo no foco ocular para transportar objetos, alvos ou partes do próprio corpo a outra dimensão.' },
  { id: 'mokuton_jukai', name: 'Mokuton: Jukai Koutan', rank: 'S', category: 'Kekkei Genkai', nature: 'Doton', chakraCost: 62, basePower: 128, accuracyMod: 9, critBonus: 12, requiredLevel: 12, requiredChakraLevel: 4, learnCostRyo: 3100, kekkeiRequired: 'Mokuton (Madeira)', effects: [{ type: 'paralysis', target: 'enemy', chance: 85, duration: 2, label: 'Raízes Constritoras (85% Paralisia 2t)' }, { type: 'chakra_seal', target: 'enemy', chance: 75, duration: 2, potency: 22, label: 'Absorção Mokuton (75% Selo de Chakra)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e1/Mokuton_Kajukai_K%C5%8Drin.png/revision/latest/scale-to-width-down/800?cb=20130926125824', description: 'Nascimento de uma floresta densa controlada diretamente pelo usuário.' },
  { id: 'shinra_tensei', name: 'Shinra Tensei', rank: 'S', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 72, basePower: 148, accuracyMod: 15, critBonus: 18, requiredLevel: 16, requiredChakraLevel: 6, learnCostRyo: 4500, kekkeiRequired: 'Rinnegan', effects: [{ type: 'crush', target: 'enemy', chance: 100, duration: 2, label: 'Rinnegan: Gravidade Esmagadora (100%, 2t)' }, { type: 'stun', target: 'enemy', chance: 65, duration: 1, label: 'Repulsão Absoluta (65% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/0d/ShinraTensei.png/revision/latest/scale-to-width-down/800?cb=20140131144706', description: 'Repulsão gravitacional absoluta que varre tudo ao redor.' },
  { id: 'chibaku_tensei', name: 'Chibaku Tensei (Devastação Planetária)', rank: 'S', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 78, basePower: 158, accuracyMod: 16, critBonus: 20, requiredLevel: 17, requiredChakraLevel: 6, learnCostRyo: 4900, kekkeiRequired: 'Rinnegan', effects: [{ type: 'paralysis', target: 'enemy', chance: 90, duration: 2, label: 'Núcleo Gravitacional (90% Paralisia 2t)' }, { type: 'crush', target: 'enemy', chance: 100, duration: 2, label: 'Esfera Tectônica (100% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/96/Chibaku_Tensei_orb.png/revision/latest/scale-to-width-down/800?cb=20150309054038', description: 'Lança um núcleo negro aos céus que atrai toda a massa rochosa da região e sela até Bijuus em uma lua artificial.' },
  { id: 'jinton_genkai_hakuri', name: 'Jinton: Genkai Hakuri no Jutsu (Desmantelamento Atômico)', rank: 'S', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 75, basePower: 156, accuracyMod: 16, critBonus: 24, requiredLevel: 16, requiredChakraLevel: 6, learnCostRyo: 4700, kekkeiRequired: 'Jinton (Poeira - Kekkei Tota)', effects: [{ type: 'crush', target: 'enemy', chance: 100, duration: 2, label: 'Kekkei Tota: Desintegração Molecular (100% Esmagamento)' }, { type: 'chakra_seal', target: 'enemy', chance: 80, duration: 2, potency: 26, label: 'Pulverização de Chakra (80% Selo)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/7/76/Detachment_of_the_primitive_world.png/revision/latest/scale-to-width-down/800?cb=20150218031042', description: 'Kekkei Tota de Iwagakure que funde Katon, Fuuton e Doton em prismas de energia branca capazes de desintegrar matéria a nível molecular.' },

  // ================= IRYOU (NINJUTSU MÉDICO) =================
  { id: 'shousen_jutsu', name: 'Iryou: Shousen no Jutsu', rank: 'B', category: 'Iryou', nature: 'Yang', chakraCost: 26, basePower: 30, accuracyMod: 25, critBonus: 5, requiredLevel: 3, requiredChakraLevel: 2, learnCostRyo: 600, healRatio: 0.45, effects: [{ type: 'regen', target: 'self', chance: 100, duration: 2, potency: 28, label: 'Regeneração Celular (2t · Purifica Queimadura/Corte)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/f0/Mystical_Palm_Technique.png/revision/latest/scale-to-width-down/800?cb=20230224021339', description: 'Palma mística médica que acelera a regeneração celular de HP.' },
  { id: 'souzou_saisei', name: 'Ninpou: Souzou Saisei (Renascimento da Criação)', rank: 'S', category: 'Iryou', nature: 'Yang', chakraCost: 58, basePower: 55, accuracyMod: 25, critBonus: 8, requiredLevel: 13, requiredChakraLevel: 5, learnCostRyo: 3400, healRatio: 0.8, effects: [{ type: 'regen', target: 'self', chance: 100, duration: 4, potency: 48, label: 'Selo Byakugo: Regeneração Absoluta (4t)' }, { type: 'shield', target: 'self', chance: 100, duration: 2, label: 'Sobrevivência Celular (Escudo 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/fe/Creation_Rebirth.png/revision/latest/scale-to-width-down/800?cb=20240928171334', description: 'Libera o selo de reservas acumuladas na testa para forçar mitose instantânea e regenerar ferimentos quase fatais em combate.' },

  // ================= FUINJUTSU =================
  { id: 'fuuin_shishou', name: 'Fuinjutsu: Selo dos Quatro Símbolos', rank: 'A', category: 'Fuinjutsu', nature: 'Yin', chakraCost: 42, basePower: 86, accuracyMod: 13, critBonus: 10, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1550, effects: [{ type: 'chakra_seal', target: 'enemy', chance: 90, duration: 3, potency: 24, label: 'Supressão de Chakra (90% Selo 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/2/27/Four_Symbols_Seal.svg/revision/latest?cb=20150510014907', description: 'Fórmula de selamento que suprime a emissão de chakra do alvo.' },
  { id: 'shiki_fuujin', name: 'Shiki Fuujin (Selo Ceifador da Morte)', rank: 'S', category: 'Fuinjutsu', nature: 'Yin', chakraCost: 68, basePower: 146, accuracyMod: 15, critBonus: 18, requiredLevel: 15, requiredChakraLevel: 5, learnCostRyo: 4000, effects: [{ type: 'chakra_seal', target: 'enemy', chance: 100, duration: 4, potency: 36, label: 'Selamento da Alma (100% Selo 4t)' }, { type: 'paralysis', target: 'enemy', chance: 85, duration: 2, label: 'Garra do Shinigami (85% Paralisia 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/be/Reaper_death_seal.png/revision/latest/scale-to-width-down/800?cb=20240908041630', description: 'Kinjutsu de Uzushiogakure que invoca o Shinigami para extrair e selar eternamente a alma e o chakra do oponente.' },

  // ================= KENJUTSU (TÉCNICAS DE ESPADA & FLUXO EM LÂMINA) =================
  { id: 'kenjutsu_tsukikage', name: 'Tsukikage (Luar Cortante)', rank: 'D', category: 'Kenjutsu', nature: 'Neutro', chakraCost: 14, basePower: 38, accuracyMod: 15, critBonus: 12, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 180, effects: [{ type: 'bleed', target: 'enemy', chance: 70, duration: 2, potency: 13, label: 'Corte em Meia-Lua (70% Laceração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/3a/Tsukikage.png/revision/latest/scale-to-width-down/800?cb=20150417014327', description: 'Deslizamento veloz sob a luz lunar seguido por um corte diagonal ascendente que rompe a guarda.' },
  { id: 'kenjutsu_omotegiri', name: 'Kumo-Ryuu: Omotegiri (Decapitação Frontal)', rank: 'C', category: 'Kenjutsu', nature: 'Neutro', chakraCost: 20, basePower: 48, accuracyMod: 14, critBonus: 14, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 340, effects: [{ type: 'bleed', target: 'enemy', chance: 75, duration: 2, potency: 15, label: 'Talho Estilo Nuvem (75% Laceração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/fb/Omotegiri.png/revision/latest?cb=20150807082918', description: 'Técnica fundamental do estilo de espada de Kumogakure: um giro amplo de alta tração que corta defesas frontais.' },
  { id: 'kenjutsu_yanagi_no_mai', name: 'Yanagi no Mai (Dança do Salgueiro)', rank: 'C', category: 'Kenjutsu', nature: 'Neutro', chakraCost: 22, basePower: 52, accuracyMod: 15, critBonus: 15, requiredLevel: 3, requiredChakraLevel: 1, learnCostRyo: 420, effects: [{ type: 'bleed', target: 'enemy', chance: 80, duration: 2, potency: 16, label: 'Estocadas Flexíveis (80% Laceração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b2/Willow.png/revision/latest/scale-to-width-down/800?cb=20150125164852', description: 'Movimentação fluida que desvia golpes como ramos de salgueiro ao vento enquanto contra-ataca com lâminas precisas.' },
  { id: 'kenjutsu_mikazuki_kumo', name: 'Kumo-Ryuu: Mikazukigiri (Corte da Lua Crescente)', rank: 'B', category: 'Kenjutsu', nature: 'Neutro', chakraCost: 30, basePower: 68, accuracyMod: 15, critBonus: 18, requiredLevel: 4, requiredChakraLevel: 2, learnCostRyo: 740, effects: [{ type: 'bleed', target: 'enemy', chance: 85, duration: 2, potency: 18, label: 'Arco Crescente (85% Laceração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/d/d1/Kumo-Ry%C5%AB_Mikazukigiri.png/revision/latest/scale-to-width-down/800?cb=20120510134926', description: 'Golpe giratório feroz em arco crescente capaz de aparar projéteis e atingir alvos em pontos cegos simultaneamente.' },
  { id: 'kenjutsu_kaengiri', name: 'Kumo-Ryuu: Kaengiri (Corte Flamejante)', rank: 'B', category: 'Kenjutsu', nature: 'Katon', chakraCost: 32, basePower: 74, accuracyMod: 13, critBonus: 16, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 820, effects: [{ type: 'burn', target: 'enemy', chance: 85, duration: 2, potency: 20, label: 'Arco de Fogo na Lâmina (85% Queimadura 2t)' }, { type: 'bleed', target: 'enemy', chance: 65, duration: 2, potency: 16, label: 'Fio Incandescente (65% Laceração)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b4/Kumo-Ry%C5%AB_Kaengiri.png/revision/latest/scale-to-width-down/800?cb=20120705134747', description: 'Canaliza chakra Katon pela espada ao girá-la, gerando um anel de chamas cortantes que incinera quem tenta avançar.' },
  { id: 'kenjutsu_hien', name: 'Hien (Andorinha Voadora)', rank: 'B', category: 'Kenjutsu', nature: 'Fuuton', chakraCost: 30, basePower: 72, accuracyMod: 16, critBonus: 20, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 800, effects: [{ type: 'bleed', target: 'enemy', chance: 90, duration: 2, potency: 20, label: 'Extensão de Chakra nas Lâminas (90% Laceração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/c/cf/Flying_Swallow.png/revision/latest/scale-to-width-down/800?cb=20150816160830', description: 'Infusão densa de chakra de vento em lâminas ou facas de trincheira, duplicando o alcance invisível e o poder de perfuração.' },
  { id: 'kenjutsu_chakra_issen', name: 'Chakra Tou: Issen (Linha Reta da Lâmina de Chakra)', rank: 'B', category: 'Kenjutsu', nature: 'Fuuton', chakraCost: 34, basePower: 78, accuracyMod: 15, critBonus: 21, requiredLevel: 6, requiredChakraLevel: 2, learnCostRyo: 880, effects: [{ type: 'bleed', target: 'enemy', chance: 90, duration: 2, potency: 21, label: 'Talho Sônico Linear (90% Laceração 2t)' }, { type: 'stun', target: 'enemy', chance: 45, duration: 1, label: 'Impacto Direto (45% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/08/Asuma_beheads_Hidan.png/revision/latest/scale-to-width-down/800?cb=20211024195155', description: 'Investida em linha reta com lâminas banhadas em fluxo de chakra para atravessar a defesa antes que o inimigo forme selos.' },
  { id: 'kenjutsu_mikazuki_no_mai', name: 'Mikazuki no Mai (Dança da Lua Crescente)', rank: 'A', category: 'Kenjutsu', nature: 'Neutro', chakraCost: 44, basePower: 98, accuracyMod: 16, critBonus: 22, requiredLevel: 7, requiredChakraLevel: 3, learnCostRyo: 1580, effects: [{ type: 'bleed', target: 'enemy', chance: 95, duration: 2, potency: 24, label: 'Tríade da Lua Crescente (95% Laceração 2t)' }, { type: 'paralysis', target: 'enemy', chance: 55, duration: 1, label: 'Ponto Cego Triplo (55% Paralisia)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/18/Dance_of_the_Crescent_Moon.png/revision/latest/scale-to-width-down/800?cb=20150123161542', description: 'Técnica clássica de Konoha que coordena dois clones das sombras atacando em zigue-zague aéreo pelos três pontos cegos do alvo.' },
  { id: 'kenjutsu_chidori_katana', name: 'Kusanagi no Tsurugi: Chidori Katana', rank: 'A', category: 'Kenjutsu', nature: 'Raiton', chakraCost: 46, basePower: 104, accuracyMod: 15, critBonus: 22, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1720, effects: [{ type: 'stun', target: 'enemy', chance: 70, duration: 1, label: 'Vibração Elétrica (70% · 100% se Encharcado)' }, { type: 'bleed', target: 'enemy', chance: 85, duration: 2, potency: 22, label: 'Lâmina de Alta Frequência (85% Laceração)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/bb/ChidoriKatana.png/revision/latest/scale-to-width-down/800?cb=20151230090504', description: 'Canaliza o Chidori ao longo da lâmina da espada, elevando o corte por vibração elétrica e entorpecendo os nervos ao contato.' },
  { id: 'kenjutsu_samurai_sabre', name: 'Samurai Sabre Technique (Hadou)', rank: 'A', category: 'Kenjutsu', nature: 'Neutro', chakraCost: 45, basePower: 102, accuracyMod: 17, critBonus: 20, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1680, effects: [{ type: 'bleed', target: 'enemy', chance: 90, duration: 3, potency: 23, label: 'Onda de Chakra Projetada (90% Laceração 3t)' }, { type: 'crush', target: 'enemy', chance: 70, duration: 2, label: 'Quebra de Guarda (70% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/13/Samurai_Sabre_Technique.png/revision/latest?cb=20140813081538', description: 'Arte suprema dos Samurais do País do Ferro que molda puro chakra na katana e dispara ondas cortantes de energia a distância.' },
  { id: 'kenjutsu_iaido', name: 'Iaidō (Saque Instantâneo Corta-Selos)', rank: 'S', category: 'Kenjutsu', nature: 'Neutro', chakraCost: 60, basePower: 138, accuracyMod: 20, critBonus: 28, requiredLevel: 13, requiredChakraLevel: 4, learnCostRyo: 3400, effects: [{ type: 'bleed', target: 'enemy', chance: 100, duration: 3, potency: 28, label: 'Desembainhar Relâmpago (100% Laceração 3t)' }, { type: 'chakra_seal', target: 'enemy', chance: 80, duration: 2, potency: 22, label: 'Interrupção de Selos de Mão (80% Selo 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/a/a3/Mifune_counters_Hanzo2.png/revision/latest/scale-to-width-down/800?cb=20150125141656', description: 'Mestria máxima de saque e embainhamento em fração de segundo, capaz de interceptar shinobis antes que completem um único selo de mão.' },

  // ================= TÉCNICAS CANÔNICAS ADICIONAIS (ELEMENTAIS, CLÃS, MANGEKYOU & SUPORTE) =================
  { id: 'suiton_kirigakure', name: 'Kirigakure no Jutsu (Ocultação na Névoa)', rank: 'D', category: 'Ninjutsu', nature: 'Suiton', chakraCost: 14, basePower: 28, accuracyMod: 16, critBonus: 8, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 160, effects: [{ type: 'soaked', target: 'enemy', chance: 95, duration: 3, label: 'Umidade Densa (95% Encharcado 3t)' }, { type: 'shield', target: 'self', chance: 85, duration: 2, label: 'Cobertura de Névoa (85% Escudo 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/17/Hiding_in_Mist_Technique.png/revision/latest/scale-to-width-down/800?cb=20240922020458', description: 'Satura o ar com água suspensa em chakra para erguer uma neblina espessa que anula a visão comum e prepara execuções silenciosas.' },
  { id: 'katon_ryuuka', name: 'Katon: Ryuuka no Jutsu (Fogo do Dragão)', rank: 'C', category: 'Ninjutsu', nature: 'Katon', chakraCost: 24, basePower: 52, accuracyMod: 12, critBonus: 10, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 360, effects: [{ type: 'burn', target: 'enemy', chance: 90, duration: 2, potency: 18, label: 'Trilho de Fogo Guiado (90% Queimadura 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/87/Dragon_Flame.png/revision/latest/scale-to-width-down/800?cb=20240817043600', description: 'Canaliza labaredas concentradas ao longo de fios ninjas para atingir o alvo preso com precisão cirúrgica.' },
  { id: 'katon_haisekishou', name: 'Katon: Haisekishou (Pilha Ardente de Cinzas)', rank: 'B', category: 'Ninjutsu', nature: 'Katon', chakraCost: 34, basePower: 74, accuracyMod: 11, critBonus: 13, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 820, effects: [{ type: 'burn', target: 'enemy', chance: 95, duration: 3, potency: 22, label: 'Ignição de Cinzas (95% Queimadura 3t)' }, { type: 'stun', target: 'enemy', chance: 45, duration: 1, label: 'Detonação Súbita (45% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/4/40/Haisekish%C5%8D_1.png/revision/latest/scale-to-width-down/800?cb=20211022053203', description: 'Expele uma densa nuvem de cinzas superaquecidas que envolve o inimigo e explode instantaneamente ao estalar os dentes.' },
  { id: 'katon_goukakuryuu', name: 'Katon: Gouryuuka no Jutsu (Grande Fogo do Dragão)', rank: 'B', category: 'Ninjutsu', nature: 'Katon', chakraCost: 38, basePower: 80, accuracyMod: 10, critBonus: 15, requiredLevel: 6, requiredChakraLevel: 3, learnCostRyo: 940, effects: [{ type: 'burn', target: 'enemy', chance: 95, duration: 3, potency: 24, label: 'Dragão Ígneo Atmosférico (95% Queimadura 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/f8/Fire_Release_Great_Dragon_Fire_Technique.png/revision/latest/scale-to-width-down/800?cb=20160202063935', description: 'Comprime imensa reserva de Katon na forma de enormes cabeças dracônicas capazes de aquecer até as nuvens de tempestade.' },
  { id: 'suiton_suikoudan', name: 'Suiton: Suikoudan no Jutsu (Projétil Tubarão de Água)', rank: 'B', category: 'Ninjutsu', nature: 'Suiton', chakraCost: 33, basePower: 72, accuracyMod: 12, critBonus: 13, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 790, effects: [{ type: 'soaked', target: 'enemy', chance: 100, duration: 3, label: 'Encharcado (100%, 3t)' }, { type: 'bleed', target: 'enemy', chance: 75, duration: 2, potency: 18, label: 'Mandíbula Hidráulica (75% Laceração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/8b/Suikodan.png/revision/latest/scale-to-width-down/800?cb=20160303214807', description: 'Molda a água em um tubarão feroz que salta contra o adversário rasgando armaduras pelo impacto hidrodinâmico.' },
  { id: 'fuuton_shinkuujin', name: 'Fuuton: Shinkuujin (Lâmina de Vácuo)', rank: 'B', category: 'Ninjutsu', nature: 'Fuuton', chakraCost: 31, basePower: 72, accuracyMod: 14, critBonus: 16, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 780, effects: [{ type: 'bleed', target: 'enemy', chance: 90, duration: 2, potency: 19, label: 'Fio de Vento Invisível (90% Laceração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/c/c4/Wind_Blade.png/revision/latest/scale-to-width-down/800?cb=20150124172308', description: 'Sopra chakra Fuuton sobre shurikens ou kunais, transformando armas simples em lâminas de vento invisíveis de amplo raio.' },
  { id: 'doton_doryuu_taiga', name: 'Doton: Doryuu Taiga (Rio de Fluxo de Lama)', rank: 'C', category: 'Ninjutsu', nature: 'Doton', chakraCost: 22, basePower: 46, accuracyMod: 12, critBonus: 7, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 330, effects: [{ type: 'paralysis', target: 'enemy', chance: 75, duration: 1, label: 'Correnteza de Lama (75% Paralisia 1t)' }, { type: 'crush', target: 'enemy', chance: 70, duration: 2, label: 'Desequilíbrio Terrestre (70% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/4/41/Earth_Release_Earth_Flow_River.png/revision/latest/scale-to-width-down/800?cb=20240902034841', description: 'Converte o chão sob os pés do oponente em uma torrente veloz de lama que o arrasta e quebra sua postura.' },
  { id: 'raiton_chidori_senbon', name: 'Raiton: Chidori Senbon (Agulhas Elétricas)', rank: 'A', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 42, basePower: 92, accuracyMod: 16, critBonus: 18, requiredLevel: 7, requiredChakraLevel: 3, learnCostRyo: 1480, effects: [{ type: 'stun', target: 'enemy', chance: 65, duration: 1, label: 'Chuva Condutora (65% · 100% se Encharcado)' }, { type: 'paralysis', target: 'enemy', chance: 60, duration: 1, label: 'Pontos Vitais Tingidos (60% Paralisia)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/5d/Chidori_Senbon.PNG/revision/latest/scale-to-width-down/800?cb=20150310001051', description: 'Transforma o Chidori em dezenas de agulhas de relâmpago disparadas em rajada visando os tenketsu do inimigo.' },
  { id: 'raiton_chidori_nagashi', name: 'Chidori Nagashi (Corrente Chidori)', rank: 'A', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 45, basePower: 96, accuracyMod: 14, critBonus: 16, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1580, effects: [{ type: 'stun', target: 'enemy', chance: 75, duration: 1, label: 'Descarga Omnidirecional (75% · 100% se Encharcado)' }, { type: 'shield', target: 'self', chance: 85, duration: 1, label: 'Campo Eletrostático (85% Escudo 1t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/2/2c/Chidori_Current.png/revision/latest/scale-to-width-down/800?cb=20160115214142', description: 'Emite eletricidade por todo o corpo simultaneamente, criando uma zona defensiva e paralisando quem se aproximar.' },
  { id: 'raiton_kuropansa', name: 'Raiton: Kuropansa (Relâmpago Negro: Pantera Negra)', rank: 'A', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 52, basePower: 116, accuracyMod: 13, critBonus: 20, requiredLevel: 10, requiredChakraLevel: 4, learnCostRyo: 2200, effects: [{ type: 'stun', target: 'enemy', chance: 80, duration: 1, label: 'Relâmpago Negro de Kumo (80% · 100% se Encharcado)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/8f/Raiton_Kuropansa.png/revision/latest/scale-to-width-down/800?cb=20120628112807', description: 'Técnica herdada do Terceiro Raikage que gera uma pantera de relâmpago negro de altíssima voltagem letal.' },
  { id: 'taijutsu_dynamic_entry', name: 'Dynamic Entry (Entrada Dinâmica)', rank: 'D', category: 'Taijutsu', nature: 'Neutro', chakraCost: 12, basePower: 38, accuracyMod: 15, critBonus: 12, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 170, effects: [{ type: 'stun', target: 'enemy', chance: 45, duration: 1, label: 'Voadora Surpresa (45% Atordoamento 1t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/9a/Dynamic_Entry.png/revision/latest/scale-to-width-down/800?cb=20160425232519', description: 'Arremessa uma kunai para distrair a linha de visão e surge com uma voadora direta no rosto do oponente.' },
  { id: 'nara_kage_nui', name: 'Kage Nui no Jutsu (Costura das Sombras)', rank: 'B', category: 'Ninjutsu', nature: 'Yin', chakraCost: 34, basePower: 74, accuracyMod: 13, critBonus: 14, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 830, clanExclusive: 'Nara', effects: [{ type: 'bleed', target: 'enemy', chance: 85, duration: 2, potency: 19, label: 'Agulhas Sombrias (85% Laceração 2t)' }, { type: 'paralysis', target: 'enemy', chance: 80, duration: 2, label: 'Costura no Solo (80% Paralisia 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/81/Hidan_restrained_by_Shikamaru.png/revision/latest/scale-to-width-down/800?cb=20170117064127', description: 'Ergue a sombra do solo na forma de múltiplos tentáculos pontiagudos que perfuram e costuram o alvo no lugar.' },
  { id: 'akimichi_nikudan_sensha', name: 'Nikudan Sensha (Tanque Bala Humana)', rank: 'C', category: 'Taijutsu', nature: 'Yang', chakraCost: 24, basePower: 56, accuracyMod: 11, critBonus: 12, requiredLevel: 3, requiredChakraLevel: 1, learnCostRyo: 450, clanExclusive: 'Akimichi', effects: [{ type: 'crush', target: 'enemy', chance: 90, duration: 2, label: 'Atropelamento Rotatório (90% Esmagamento 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/85/Human_bullet_tank.png/revision/latest/scale-to-width-down/800?cb=20150225060708', description: 'Após expandir o tronco, recolhe os membros e gira em velocidade demolidora esmagando barreiras e inimigos.' },
  { id: 'akimichi_chou_modo', name: 'Chou Baika: Modo Borboleta de Chakra', rank: 'A', category: 'Taijutsu', nature: 'Yang', chakraCost: 50, basePower: 112, accuracyMod: 13, critBonus: 20, requiredLevel: 9, requiredChakraLevel: 4, learnCostRyo: 1950, clanExclusive: 'Akimichi', effects: [{ type: 'crush', target: 'enemy', chance: 100, duration: 2, label: 'Punho de Calorias Puras (100% Esmagamento 2t)' }, { type: 'shield', target: 'self', chance: 90, duration: 2, label: 'Asas de Chakra Condensado (90% Escudo)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/16/Butterfly_Ch%C5%8Dji_Mode.png/revision/latest/scale-to-width-down/800?cb=20161201120611', description: 'Converte reservas calóricas em asas colossais de chakra puro, concentrando força titânica em um único soco.' },
  { id: 'hyuga_juho_soushiken', name: 'Juho Soushiken (Punhos dos Leões Gêmeos)', rank: 'A', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 46, basePower: 100, accuracyMod: 13, critBonus: 16, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1680, clanExclusive: 'Hyuga', kekkeiRequired: 'Byakugan', effects: [{ type: 'chakra_seal', target: 'enemy', chance: 95, duration: 3, potency: 28, label: 'Drenagem dos Leões Gêmeos (95% Selo 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/15/J%C5%ABho_S%C5%8Dshiken.png/revision/latest/scale-to-width-down/800?cb=20141026170900', description: 'Molda o chakra liberado pelas palmas em duas cabeças de leão que drenam instantaneamente a rede de chakra ao menor toque.' },
  { id: 'hyuga_128_palmas', name: 'Hakke Hyaku Nijuuha Shou (128 Palmas)', rank: 'A', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 52, basePower: 112, accuracyMod: 14, critBonus: 18, requiredLevel: 10, requiredChakraLevel: 4, learnCostRyo: 2150, clanExclusive: 'Hyuga', kekkeiRequired: 'Byakugan', effects: [{ type: 'chakra_seal', target: 'enemy', chance: 100, duration: 3, potency: 32, label: '128 Tenketsu Fechados (100% Selo 3t)' }, { type: 'paralysis', target: 'enemy', chance: 80, duration: 2, label: 'Colapso da Rede Interna (80% Paralisia 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/a/a4/Eight_Trigrams_One_Hundred_Twenty-Eight_Palms.png/revision/latest/scale-to-width-down/800?cb=20161116214556', description: 'Duplica a velocidade das 64 Palmas dentro do campo de adivinhação para bloquear completamente a circulação de chakra.' },
  { id: 'mokuton_mokuryuu', name: 'Mokuton: Mokuryuu no Jutsu (Dragão de Madeira)', rank: 'A', category: 'Kekkei Genkai', nature: 'Doton', chakraCost: 50, basePower: 108, accuracyMod: 12, critBonus: 14, requiredLevel: 10, requiredChakraLevel: 4, learnCostRyo: 2100, kekkeiRequired: 'Mokuton (Madeira)', effects: [{ type: 'chakra_seal', target: 'enemy', chance: 90, duration: 3, potency: 26, label: ' Constrição Absorvedora (90% Selo 3t)' }, { type: 'paralysis', target: 'enemy', chance: 75, duration: 2, label: 'Enraizamento Dracônico (75% Paralisia)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/91/Mokury%C5%AB_no_jutsu.png/revision/latest/scale-to-width-down/800?cb=20140619145749', description: 'Cria um dragão serpenteante gigante de madeira divina capaz de prender Bijuus e drenar seu chakra continuamente.' },
  { id: 'uchiha_izanagi', name: 'Izanagi (Reescrita Ocular da Realidade)', rank: 'A', category: 'Kekkei Genkai', nature: 'Yin', chakraCost: 54, basePower: 84, accuracyMod: 18, critBonus: 16, requiredLevel: 10, requiredChakraLevel: 4, learnCostRyo: 2300, clanExclusive: 'Uchiha', kekkeiRequired: 'Sharingan (Nível 3)', healRatio: 0.45, effects: [{ type: 'shield', target: 'self', chance: 100, duration: 3, label: 'Ilusão sobre a Realidade (Escudo 3t)' }, { type: 'regen', target: 'self', chance: 100, duration: 2, potency: 30, label: 'Reversão de Dano (Regeneração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/93/Izanagi_1.png/revision/latest/scale-to-width-down/800?cb=20151004045309', description: 'Kinjutsu ocular do Sharingan de 3 tomoe que converte ferimentos fatais em mera ilusão por breves instantes. Exige Sharingan Nível 3 ou Mangekyou.' },
  { id: 'uchiha_izanami', name: 'Izanami (Laço Infinito do Destino)', rank: 'S', category: 'Genjutsu', nature: 'Yin', chakraCost: 66, basePower: 128, accuracyMod: 18, critBonus: 18, requiredLevel: 13, requiredChakraLevel: 5, learnCostRyo: 3600, clanExclusive: 'Uchiha', kekkeiRequired: 'Sharingan (Nível 3)', effects: [{ type: 'paralysis', target: 'enemy', chance: 100, duration: 3, label: 'Loop Temporal Infinito (100% Paralisia 3t)' }, { type: 'stun', target: 'enemy', chance: 80, duration: 1, label: 'Travamento Sensorial (80% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/52/Izanami_1.png/revision/latest/scale-to-width-down/800?cb=20131107155109', description: 'Genjutsu proibido complementar ao Izanagi (Sharingan Nível 3+) que aprisiona o alvo por sensações físicas em um ciclo eterno sem depender de contato visual.' },
  { id: 'enton_kagutsuchi', name: 'Enton: Kagutsuchi (Controle da Chama Negra)', rank: 'S', category: 'Kekkei Genkai', nature: 'Katon', chakraCost: 68, basePower: 146, accuracyMod: 15, critBonus: 22, requiredLevel: 14, requiredChakraLevel: 5, learnCostRyo: 3950, clanExclusive: 'Uchiha', kekkeiRequired: 'Mangekyo Sharingan', effects: [{ type: 'black_flames', target: 'enemy', chance: 100, duration: 4, potency: 34, label: 'Espinhos de Amaterasu (100% Chamas Negras 4t)' }, { type: 'shield', target: 'self', chance: 85, duration: 2, label: 'Escudo Enton (85% Escudo 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/06/Blaze_Release-_Kagutsuchi.png/revision/latest/scale-to-width-down/800?cb=20150214203538', description: 'Aplica transformação da forma às chamas inextinguíveis do Amaterasu, moldando espadas, lanças e barreiras letais de fogo negro.' },
  { id: 'yasaka_magatama', name: 'Yasaka no Magatama', rank: 'S', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 66, basePower: 142, accuracyMod: 16, critBonus: 20, requiredLevel: 14, requiredChakraLevel: 5, learnCostRyo: 3850, clanExclusive: 'Uchiha', kekkeiRequired: 'Mangekyo Sharingan', effects: [{ type: 'crush', target: 'enemy', chance: 95, duration: 2, label: 'Projéteis do Susanoo (95% Esmagamento 2t)' }, { type: 'stun', target: 'enemy', chance: 65, duration: 1, label: 'Choque Espiritual (65% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/bf/Yasaka_Magatama.png/revision/latest/scale-to-width-down/800?cb=20150107140106', description: 'Técnica ofensiva de longo alcance do Susanoo que arremessa joias magatama de chakra giratório com força explosiva.' },
  { id: 'iryou_chakra_mesu', name: 'Chakra no Mesu (Bisturi de Chakra)', rank: 'C', category: 'Iryou', nature: 'Yang', chakraCost: 22, basePower: 54, accuracyMod: 18, critBonus: 18, requiredLevel: 3, requiredChakraLevel: 2, learnCostRyo: 460, effects: [{ type: 'bleed', target: 'enemy', chance: 80, duration: 2, potency: 16, label: 'Incisão Interna nos Tendões (80% Laceração 2t)' }, { type: 'paralysis', target: 'enemy', chance: 65, duration: 1, label: 'Músculo Seccionado (65% Paralisia 1t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/36/Chakra_Scalpel.PNG/revision/latest/scale-to-width-down/800?cb=20240927021044', description: 'Concentra chakra médico afiado nas palmas para seccionar músculos internos e vias de chakra sem sequer rasgar a pele externa.' },
  { id: 'fuuin_gogyou', name: 'Gogyou Fuuin (Selo dos Cinco Elementos)', rank: 'A', category: 'Fuinjutsu', nature: 'Yin', chakraCost: 44, basePower: 90, accuracyMod: 14, critBonus: 12, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1620, effects: [{ type: 'chakra_seal', target: 'enemy', chance: 95, duration: 3, potency: 26, label: 'Desarmonia Elemental (95% Selo 3t)' }, { type: 'paralysis', target: 'enemy', chance: 60, duration: 1, label: 'Perturbação de Fluxo (60% Paralisia)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/1b/Five_Elements_Seal.png/revision/latest/scale-to-width-down/800?cb=20240906230419', description: 'Fórmula nos cinco dedos que grava um selo ímpar sobre o abdômen do inimigo, desestabilizando completamente seu controle de chakra.' },

  // ================= KUCHIYOSE (REQUER CONTRATO CONQUISTADO POR QUEST) =================
  { id: 'kuchiyose_gamabunta', name: 'Kuchiyose: Invocação de Combate', rank: 'A', category: 'Kuchiyose', nature: 'Neutro', chakraCost: 52, basePower: 108, accuracyMod: 11, critBonus: 14, requiredLevel: 9, requiredChakraLevel: 4, learnCostRyo: 2000, effects: [{ type: 'crush', target: 'enemy', chance: 85, duration: 2, label: 'Impacto Colossal (85% Esmagamento 2t)' }, { type: 'stun', target: 'enemy', chance: 45, duration: 1, label: 'Onda de Choque (45% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/6a/Summoning_Technique.png/revision/latest/scale-to-width-down/800?cb=20150120115239', description: 'Pacto de sangue (requer contrato conquistado por Quest) para invocar o aliado titular em combate.' },
  { id: 'kuchiyose_grande_sabio', name: 'Kuchiyose: Invocação dos Três Grandes Sábios', rank: 'S', category: 'Kuchiyose', nature: 'Neutro', chakraCost: 70, basePower: 150, accuracyMod: 14, critBonus: 20, requiredLevel: 14, requiredChakraLevel: 5, learnCostRyo: 3800, effects: [{ type: 'crush', target: 'enemy', chance: 100, duration: 2, label: 'Força Sábia Colossal (100% Esmagamento 2t)' }, { type: 'stun', target: 'enemy', chance: 70, duration: 1, label: 'Rugido do Santuário (70% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/d/da/Sanjuu_Rashomon.png/revision/latest/scale-to-width-down/800?cb=20241128034152', description: 'Pacto supremo reservado exclusivamente a quem concluiu a Quest Sábia Complexa de Gamabunta (Sapos), Katsuyu (Lesmas) ou Manda (Cobras).' },

  // ================= EXPANSÃO ENCICLOPÉDICA DA OBRA (40 JUTSUS CANÔNICOS COM ARTE OFICIAL) =================
  { id: 'henge_no_jutsu', name: 'Henge no Jutsu (Técnica de Transformação)', rank: 'E', category: 'Ninjutsu', nature: 'Neutro', chakraCost: 10, basePower: 24, accuracyMod: 18, critBonus: 10, requiredLevel: 1, requiredChakraLevel: 1, learnCostRyo: 90, effects: [{ type: 'shield', target: 'self', chance: 80, duration: 1, label: 'Disfarce Tático (80% Escudo 1t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/d/db/Transformation_Technique_part_1.png/revision/latest/scale-to-width-down/800?cb=20150504124845', description: 'Técnica fundamental da Academia que altera a aparência física para emboscadas, infiltração e fintas de arma.' },
  { id: 'tajuu_kage_bunshin', name: 'Tajuu Kage Bunshin no Jutsu (Clones em Massa)', rank: 'A', category: 'Ninjutsu', nature: 'Neutro', chakraCost: 48, basePower: 102, accuracyMod: 14, critBonus: 16, requiredLevel: 8, requiredChakraLevel: 4, learnCostRyo: 1750, effects: [{ type: 'shield', target: 'self', chance: 100, duration: 2, label: 'Exército de Clones (Escudo 2t)' }, { type: 'crush', target: 'enemy', chance: 80, duration: 2, label: 'Cerco Massivo (80% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e6/Multiple_Shadow_Clone_Technique.png/revision/latest/scale-to-width-down/800?cb=20150221104302', description: 'Kinjutsu do Pergaminho Proibido que divide vastas reservas de chakra em centenas de clones físicos simultâneos.' },
  { id: 'oodama_rasengan', name: 'Oodama Rasengan (Grande Bola Rasengan)', rank: 'A', category: 'Ninjutsu', nature: 'Neutro', chakraCost: 50, basePower: 112, accuracyMod: 13, critBonus: 20, requiredLevel: 9, requiredChakraLevel: 4, learnCostRyo: 1950, questRequired: 'quest_rasengan', effects: [{ type: 'crush', target: 'enemy', chance: 95, duration: 2, label: 'Vórtice Gigante (95% Esmagamento 2t)' }, { type: 'stun', target: 'enemy', chance: 55, duration: 1, label: 'Turbulência Interna (55% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e8/Great_Ball_Rasengan.PNG/revision/latest/scale-to-width-down/800?cb=20240827155606', description: 'Evolução de alta densidade do Rasengan estabilizada com um clone das sombras para escavar crateras inteiras no impacto.' },
  { id: 'senpou_kawazu_kumite', name: 'Senpou: Kawazu Kumite (Kata dos Sapos)', rank: 'A', category: 'Taijutsu', nature: 'Neutro', chakraCost: 46, basePower: 104, accuracyMod: 18, critBonus: 20, requiredLevel: 9, requiredChakraLevel: 4, learnCostRyo: 1880, effects: [{ type: 'crush', target: 'enemy', chance: 90, duration: 2, label: 'Extensão de Energia Natural (90% Esmagamento)' }, { type: 'stun', target: 'enemy', chance: 60, duration: 1, label: 'Golpe Invisível Senjutsu (60% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/4/4d/Frog_Kata_1.PNG/revision/latest/scale-to-width-down/800?cb=20150930041716', description: 'Estilo marcial do Monte Myouboku onde a energia natural ao redor do punho atinge o inimigo mesmo quando este esquiva visualmente.' },
  { id: 'senpou_goemon', name: 'Senpou: Goemon (Banho de Óleo Fervente)', rank: 'S', category: 'Ninjutsu', nature: 'Katon', chakraCost: 66, basePower: 144, accuracyMod: 15, critBonus: 18, requiredLevel: 14, requiredChakraLevel: 5, learnCostRyo: 3900, effects: [{ type: 'burn', target: 'enemy', chance: 100, duration: 3, potency: 28, label: 'Óleo Senjutsu Incandescente (100% Queimadura 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/66/Sage_Art_Goemon.png/revision/latest/scale-to-width-down/800?cb=20150330030237', description: 'Combinação cooperativa suprema de óleo de sapo, Fuuton e Katon que inunda o campo com chamas líquidas a milhares de graus.' },
  { id: 'katon_gamayu_endan', name: 'Katon: Gamayu Endan (Bala Flamejante de Óleo)', rank: 'B', category: 'Ninjutsu', nature: 'Katon', chakraCost: 35, basePower: 78, accuracyMod: 12, critBonus: 14, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 850, effects: [{ type: 'burn', target: 'enemy', chance: 95, duration: 3, potency: 22, label: 'Labareda Oleosa (95% Queimadura 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/5b/Toad_Oil_Flame_Bullet.png/revision/latest/scale-to-width-down/800?cb=20240925014049', description: 'Incendeia um jato pressurizado de óleo anfíbio com Katon, gerando uma torrente contínua de fogo aderente.' },
  { id: 'katon_zukokku', name: 'Katon: Zukokku (Dor de Cabeça Extrema)', rank: 'B', category: 'Ninjutsu', nature: 'Katon', chakraCost: 36, basePower: 80, accuracyMod: 11, critBonus: 15, requiredLevel: 6, requiredChakraLevel: 2, learnCostRyo: 900, effects: [{ type: 'burn', target: 'enemy', chance: 95, duration: 3, potency: 23, label: 'Mar de Fogo Florestal (95% Queimadura 3t)' }, { type: 'crush', target: 'enemy', chance: 55, duration: 1, label: 'Onda Térmica (55% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/a/a0/Fire_Release_Intelligent_Hard_Work.png/revision/latest/scale-to-width-down/800?cb=20150202214241', description: 'Dispara uma pequena esfera ígnea que detona ao tocar o solo, expandindo-se instantaneamente em uma tempestade incineradora.' },
  { id: 'katon_gouka_messhitsu', name: 'Katon: Gouka Messhitsu (Grande Destruição Ígnea)', rank: 'A', category: 'Ninjutsu', nature: 'Katon', chakraCost: 50, basePower: 110, accuracyMod: 13, critBonus: 18, requiredLevel: 9, requiredChakraLevel: 4, learnCostRyo: 1920, effects: [{ type: 'burn', target: 'enemy', chance: 100, duration: 3, potency: 26, label: 'Torrente Contínua Uchiha (100% Queimadura 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/12/Katon_G%C5%8Dka_Messhitsu.png/revision/latest/scale-to-width-down/800?cb=20130926130201', description: 'Converte o chakra amassado no peito em um oceano intenso de fogo concentrado que exige esquadrões inteiros de Suiton para conter.' },
  { id: 'suiton_mizu_bunshin', name: 'Mizu Bunshin no Jutsu (Clone de Água)', rank: 'C', category: 'Ninjutsu', nature: 'Suiton', chakraCost: 20, basePower: 46, accuracyMod: 14, critBonus: 10, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 330, effects: [{ type: 'shield', target: 'self', chance: 90, duration: 2, label: 'Escolta Aquática (90% Escudo 2t)' }, { type: 'soaked', target: 'enemy', chance: 85, duration: 2, label: 'Estouro Líquido (85% Encharcado)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/5c/Water_Clone_Technique.png/revision/latest/scale-to-width-down/800?cb=20160417083953', description: 'Técnica clássica de Kirigakure que molda água em réplicas físicas autônomas para cercar o adversário na neblina.' },
  { id: 'suiton_mizurappa', name: 'Suiton: Mizurappa (Onda Violenta de Água)', rank: 'C', category: 'Ninjutsu', nature: 'Suiton', chakraCost: 22, basePower: 50, accuracyMod: 13, critBonus: 9, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 350, effects: [{ type: 'soaked', target: 'enemy', chance: 95, duration: 3, label: 'Jato de Alta Pressão (95% Encharcado 3t)' }, { type: 'crush', target: 'enemy', chance: 50, duration: 1, label: 'Empurrão Hidráulico (50% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e0/Violent_Water_Wave.PNG/revision/latest/scale-to-width-down/800?cb=20211010024843', description: 'Expele um jato espumante de água pressurizada pela boca capaz de varrer chamas e derrubar alvos em linha reta.' },
  { id: 'suiton_suigadan', name: 'Suiton: Suigadan (Projétil Presa de Água)', rank: 'B', category: 'Ninjutsu', nature: 'Suiton', chakraCost: 34, basePower: 74, accuracyMod: 14, critBonus: 15, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 820, effects: [{ type: 'bleed', target: 'enemy', chance: 85, duration: 2, potency: 19, label: 'Brocas Líquidas 360° (85% Laceração 2t)' }, { type: 'soaked', target: 'enemy', chance: 95, duration: 3, label: 'Encharcado (95%, 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/a/ae/Suigadan.png/revision/latest/scale-to-width-down/800?cb=20240821161116', description: 'Ergue presas espirais de água ao redor do inimigo, perfurando pelos pontos cegos com altíssima rotação.' },
  { id: 'suiton_daikoudan', name: 'Suiton: Daikoudan no Jutsu (Grande Tubarão Absorvedor)', rank: 'S', category: 'Ninjutsu', nature: 'Suiton', chakraCost: 66, basePower: 144, accuracyMod: 14, critBonus: 18, requiredLevel: 14, requiredChakraLevel: 5, learnCostRyo: 3900, effects: [{ type: 'chakra_seal', target: 'enemy', chance: 95, duration: 3, potency: 28, label: 'Absorção de Ninjutsu (95% Selo de Chakra 3t)' }, { type: 'soaked', target: 'enemy', chance: 100, duration: 3, label: 'Impacto Abissal (100% Encharcado)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/c/c3/Daik%C5%8Ddan_no_Jutsu.png/revision/latest/scale-to-width-down/800?cb=20120218222343', description: 'Cria um megalodonte aquático colossal que devora o chakra das técnicas inimigas no caminho para crescer ainda mais antes do impacto.' },
  { id: 'fuuton_kaze_no_yaiba', name: 'Kaze no Yaiba (Espada de Vento)', rank: 'A', category: 'Ninjutsu', nature: 'Fuuton', chakraCost: 44, basePower: 96, accuracyMod: 16, critBonus: 22, requiredLevel: 7, requiredChakraLevel: 3, learnCostRyo: 1560, effects: [{ type: 'bleed', target: 'enemy', chance: 95, duration: 2, potency: 22, label: 'Lâmina Intangível Suna (95% Laceração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/d/d7/Blade_of_Wind_Disk_1.png/revision/latest/scale-to-width-down/800?cb=20150821121852', description: 'Técnica de elite de Sunagakure que materializa uma espada de vento sem forma física, impossível de ser bloqueada por kunais comuns.' },
  { id: 'fuuton_atsugai', name: 'Fuuton: Atsugai (Dano de Pressão)', rank: 'B', category: 'Ninjutsu', nature: 'Fuuton', chakraCost: 36, basePower: 79, accuracyMod: 12, critBonus: 15, requiredLevel: 6, requiredChakraLevel: 2, learnCostRyo: 890, effects: [{ type: 'crush', target: 'enemy', chance: 85, duration: 2, label: 'Tornado Hiperbárico (85% Esmagamento 2t)' }, { type: 'bleed', target: 'enemy', chance: 70, duration: 2, potency: 17, label: 'Rajada Cortante (70% Laceração)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e1/Wind_Release_Pressure_Damage.png/revision/latest/scale-to-width-down/800?cb=20150202214346', description: 'Dispara um vórtice esférico de ar comprimido que explode como um ciclone devastador ao atingir o solo.' },
  { id: 'fuuton_shinkuu_renpa', name: 'Fuuton: Shinkuu Renpa (Ondas Seriais de Vácuo)', rank: 'A', category: 'Ninjutsu', nature: 'Fuuton', chakraCost: 47, basePower: 104, accuracyMod: 14, critBonus: 19, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1690, effects: [{ type: 'bleed', target: 'enemy', chance: 95, duration: 3, potency: 23, label: 'Foice Tripla de Vácuo (95% Laceração 3t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/51/Vacuum_Serial_Waves.png/revision/latest/scale-to-width-down/800?cb=20150309054347', description: 'Inspira profundamente e dispara dezenas de lâminas curvas de vácuo em ângulos sobrepostos capazes de rasgar até defesas de Susanoo.' },
  { id: 'doton_moguragakure', name: 'Doton: Moguragakure no Jutsu (Ocultação da Toupeira)', rank: 'C', category: 'Ninjutsu', nature: 'Doton', chakraCost: 20, basePower: 45, accuracyMod: 16, critBonus: 12, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 340, effects: [{ type: 'shield', target: 'self', chance: 90, duration: 2, label: 'Submersão Subterrânea (90% Escudo 2t)' }, { type: 'paralysis', target: 'enemy', chance: 60, duration: 1, label: 'Puxão pelos Tornozelos (60% Paralisia)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/2/2c/Hiding_Like_a_Mole_Technique.png/revision/latest/scale-to-width-down/800?cb=20150826162902', description: 'Converte a terra em areia fina ao redor do corpo para mergulhar sob o solo, escapar de ataques e emboscar por baixo.' },
  { id: 'doton_keijuugan', name: 'Doton: Keijuugan no Jutsu (Rocha de Peso Leve)', rank: 'B', category: 'Ninjutsu', nature: 'Doton', chakraCost: 30, basePower: 68, accuracyMod: 16, critBonus: 14, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 790, effects: [{ type: 'shield', target: 'self', chance: 95, duration: 2, label: 'Levitação Tática Iwa (95% Escudo 2t)' }, { type: 'stun', target: 'enemy', chance: 50, duration: 1, label: 'Investida Aérea (50% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/ee/Flight_Technique.png/revision/latest/scale-to-width-down/800?cb=20150815015721', description: 'Segredo dos Tsuchikages de Iwagakure que reduz drasticamente a massa gravitacional para permitir voo veloz e golpes supersônicos.' },
  { id: 'doton_sando', name: 'Doton: Sando no Jutsu (Sanduíche Tectônico)', rank: 'B', category: 'Ninjutsu', nature: 'Doton', chakraCost: 38, basePower: 82, accuracyMod: 11, critBonus: 12, requiredLevel: 6, requiredChakraLevel: 3, learnCostRyo: 940, effects: [{ type: 'crush', target: 'enemy', chance: 95, duration: 2, label: 'Prensa Hemisférica (95% Esmagamento 2t)' }, { type: 'paralysis', target: 'enemy', chance: 70, duration: 1, label: 'Imobilização Rochosa (70% Paralisia)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/2/2d/Earth_Release-_Sandwich_Technique.png/revision/latest/scale-to-width-down/800?cb=20150617095654', description: 'Ergue duas muralhas hemisféricas colossais de rocha em lados opostos que se fecham esmagando tudo no centro.' },
  { id: 'raiton_chidori_eisou', name: 'Chidori Eisou (Lança Afiada Chidori)', rank: 'A', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 44, basePower: 98, accuracyMod: 15, critBonus: 20, requiredLevel: 7, requiredChakraLevel: 3, learnCostRyo: 1550, effects: [{ type: 'stun', target: 'enemy', chance: 70, duration: 1, label: 'Lança de 5 Metros (70% · 100% se Encharcado)' }, { type: 'bleed', target: 'enemy', chance: 80, duration: 2, potency: 20, label: 'Bifurcação Interna (80% Laceração)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b3/Sasuke_stabs_Karin_and_Danzo.png/revision/latest/scale-to-width-down/800?cb=20210817045621', description: 'Aplica transformação da forma ao Chidori para projetar uma lança elétrica extensível que empala o alvo a média distância.' },
  { id: 'raiton_lariat', name: 'Raiton: Lariat (Laço Relâmpago)', rank: 'A', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 48, basePower: 108, accuracyMod: 13, critBonus: 21, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1740, effects: [{ type: 'crush', target: 'enemy', chance: 90, duration: 2, label: 'Impacto Nintaijutsu Kumo (90% Esmagamento 2t)' }, { type: 'stun', target: 'enemy', chance: 65, duration: 1, label: 'Choque Cervical (65% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/f5/Lariat.PNG/revision/latest/scale-to-width-down/800?cb=20150203070452', description: 'Técnica assinatura de Nintaijutsu de Kumogakure: reveste o braço em manto elétrico e avança arrancando o torso inimigo.' },
  { id: 'raiton_jigokuzuki', name: 'Jigokuzuki (Punhalada do Inferno de Quatro Dedos)', rank: 'S', category: 'Ninjutsu', nature: 'Raiton', chakraCost: 66, basePower: 146, accuracyMod: 15, critBonus: 26, requiredLevel: 14, requiredChakraLevel: 5, learnCostRyo: 3980, effects: [{ type: 'crush', target: 'enemy', chance: 100, duration: 2, label: 'Lança Mais Forte (100% Esmagamento 2t)' }, { type: 'stun', target: 'enemy', chance: 80, duration: 1, label: 'Perfuração Absoluta (80% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/09/Jigokuzuki_Yohon.png/revision/latest/scale-to-width-down/800?cb=20150222111312', description: 'Concentra todo o chakra da Armadura Relâmpago na ponta dos dedos em uma estocada capaz de furar qualquer barreira conhecida.' },
  { id: 'shishi_rendan', name: 'Shishi Rendan (Combo do Leão)', rank: 'C', category: 'Taijutsu', nature: 'Neutro', chakraCost: 22, basePower: 54, accuracyMod: 13, critBonus: 15, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 380, effects: [{ type: 'crush', target: 'enemy', chance: 80, duration: 2, label: 'Queda de Calcanhar Aérea (80% Esmagamento 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/7/72/Sasuke_vs_Yoroi.png/revision/latest/scale-to-width-down/800?cb=20240906235010', description: 'Lança o alvo para o alto com a Dança da Folha Sombria e finaliza com uma sequência giratória brutal até o chão.' },
  { id: 'konoha_daisenpuu', name: 'Konoha Daisenpuu (Grande Furacão da Folha)', rank: 'C', category: 'Taijutsu', nature: 'Neutro', chakraCost: 20, basePower: 50, accuracyMod: 15, critBonus: 13, requiredLevel: 2, requiredChakraLevel: 1, learnCostRyo: 350, effects: [{ type: 'crush', target: 'enemy', chance: 75, duration: 2, label: 'Chutes Rotatórios Contínuos (75% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/c/ca/Leaf_Great_Whirlwind.png/revision/latest/scale-to-width-down/800?cb=20150120114812', description: 'Encadeia múltiplos chutes giratórios baixos, médios e altos sem tocar o pé de apoio no chão, impedindo contra-ataques.' },
  { id: 'ouka_shou', name: 'Ouka Shou (Impacto da Flor de Cerejeira)', rank: 'B', category: 'Taijutsu', nature: 'Neutro', chakraCost: 32, basePower: 76, accuracyMod: 12, critBonus: 18, requiredLevel: 5, requiredChakraLevel: 3, learnCostRyo: 860, effects: [{ type: 'crush', target: 'enemy', chance: 95, duration: 2, label: 'Cratera Sísmica (95% Esmagamento 2t)' }, { type: 'stun', target: 'enemy', chance: 55, duration: 1, label: 'Estilhaçamento do Solo (55% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/fe/Cherry_Blossom_Shockwave.png/revision/latest/scale-to-width-down/800?cb=20160108090307', description: 'Concentra chakra milimétrico no punho e o libera no instante exato do impacto, pulverizando rochas e defesas em área.' },
  { id: 'kenjutsu_silent_killing', name: 'Muon Satsujin (Execução Silenciosa na Névoa)', rank: 'B', category: 'Kenjutsu', nature: 'Suiton', chakraCost: 32, basePower: 75, accuracyMod: 17, critBonus: 22, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 850, effects: [{ type: 'bleed', target: 'enemy', chance: 95, duration: 2, potency: 21, label: 'Corte Cego de Kiri (95% Laceração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/a/ae/Haku_attacks_shinobi.png/revision/latest/scale-to-width-down/800?cb=20160120050949', description: 'Arte assassina dos Sete Espadachins da Névoa que rastreia batimentos cardíacos na bruma para abater o alvo em um único golpe sem som.' },
  { id: 'kenjutsu_tsubaki_no_mai', name: 'Tsubaki no Mai (Dança da Camélia)', rank: 'B', category: 'Kenjutsu', nature: 'Neutro', chakraCost: 30, basePower: 72, accuracyMod: 16, critBonus: 19, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 810, effects: [{ type: 'bleed', target: 'enemy', chance: 90, duration: 2, potency: 19, label: 'Estocadas Imprevisíveis (90% Laceração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b3/Camellia.png/revision/latest/scale-to-width-down/800?cb=20150315210447', description: 'Esgrima veloz que altera constantemente o ângulo do punho para criar dezenas de imagens residuais de estocada.' },
  { id: 'kenjutsu_acrobat', name: 'Acrobat (Dança das Sete Lâminas)', rank: 'A', category: 'Kenjutsu', nature: 'Raiton', chakraCost: 46, basePower: 104, accuracyMod: 16, critBonus: 23, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1720, effects: [{ type: 'bleed', target: 'enemy', chance: 95, duration: 2, potency: 24, label: 'Sete Espadas Vibratórias (95% Laceração 2t)' }, { type: 'stun', target: 'enemy', chance: 60, duration: 1, label: 'Supervibração Raiton (60% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/81/Acrobat.PNG/revision/latest/scale-to-width-down/800?cb=20150124180516', description: 'Equilibra sete lâminas nas articulações do corpo imbuídas em Raiton, girando em cadência imprevisível impossível de prever até pelo Sharingan inicial.' },
  { id: 'magen_gamarinshou', name: 'Magen: Gamarinshou (Canto dos Sapos)', rank: 'S', category: 'Genjutsu', nature: 'Yin', chakraCost: 66, basePower: 138, accuracyMod: 18, critBonus: 18, requiredLevel: 14, requiredChakraLevel: 5, learnCostRyo: 3950, effects: [{ type: 'paralysis', target: 'enemy', chance: 100, duration: 3, label: 'Prisão Sonora Senjutsu (100% Paralisia 3t)' }, { type: 'stun', target: 'enemy', chance: 80, duration: 1, label: 'Colapso dos Quatro Guerreiros (80% Atordoar)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/82/Demonic_Illusion-_Toad_Confrontation_Chant.png/revision/latest/scale-to-width-down/800?cb=20150125141415', description: 'Genjutsu sonoro supremo entoado pelos sábios anfíbios que captura corpo e mente mesmo de usuários com visão compartilhada.' },
  { id: 'genjutsu_utakata', name: 'Utakata (Efêmero de Corvos)', rank: 'B', category: 'Genjutsu', nature: 'Yin', chakraCost: 30, basePower: 64, accuracyMod: 15, critBonus: 13, requiredLevel: 4, requiredChakraLevel: 2, learnCostRyo: 760, effects: [{ type: 'paralysis', target: 'enemy', chance: 85, duration: 2, label: 'Ilusão por Um Dedo (85% Paralisia 2t)' }, { type: 'stun', target: 'enemy', chance: 65, duration: 1, label: 'Reversão Psíquica (65% Atordoar)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/ed/Ephemeral2.PNG/revision/latest/scale-to-width-down/800?cb=20160113184538', description: 'Induz um genjutsu de bando de corvos apontando apenas um único dedo, sem exigir contato ocular direto.' },
  { id: 'uzumaki_kongou_fuusa', name: 'Kongou Fuusa (Correntes de Selamento Adamantinas)', rank: 'A', category: 'Fuinjutsu', nature: 'Yang', chakraCost: 48, basePower: 106, accuracyMod: 15, critBonus: 16, requiredLevel: 8, requiredChakraLevel: 4, learnCostRyo: 1780, clanExclusive: 'Uzumaki', effects: [{ type: 'chakra_seal', target: 'enemy', chance: 100, duration: 3, potency: 28, label: 'Correntes Uzumaki (100% Selo de Chakra 3t)' }, { type: 'paralysis', target: 'enemy', chance: 85, duration: 2, label: 'Barreira Adamantina (85% Paralisia 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/33/Adamantine_Sealing_chains.png/revision/latest/scale-to-width-down/800?cb=20150501093108', description: 'Hiden supremo do Clã Uzumaki que projeta correntes douradas de chakra capazes de suprimir e acorrentar até Bestas com Cauda.' },
  { id: 'aburame_mushidama', name: 'Hijutsu: Mushidama (Esfera de Insetos)', rank: 'B', category: 'Ninjutsu', nature: 'Neutro', chakraCost: 32, basePower: 70, accuracyMod: 15, critBonus: 12, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 820, clanExclusive: 'Aburame', effects: [{ type: 'chakra_seal', target: 'enemy', chance: 95, duration: 3, potency: 25, label: 'Domo Kikaichu (95% Selo de Chakra 3t)' }, { type: 'paralysis', target: 'enemy', chance: 70, duration: 1, label: 'Enxame Total (70% Paralisia)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/87/Secret_Technique_Insect_Sphere.png/revision/latest/scale-to-width-down/800?cb=20141218061630', description: 'Cobre completamente o corpo do inimigo em uma esfera viva de kikaichu que drena chakra por todos os poros simultaneamente.' },
  { id: 'inuzuka_garouga', name: 'Garouga (Presa Dupla do Lobo)', rank: 'B', category: 'Taijutsu', nature: 'Neutro', chakraCost: 35, basePower: 80, accuracyMod: 13, critBonus: 20, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 880, clanExclusive: 'Inuzuka', effects: [{ type: 'bleed', target: 'enemy', chance: 90, duration: 2, potency: 22, label: 'Vórtice Lupino (90% Laceração 2t)' }, { type: 'crush', target: 'enemy', chance: 80, duration: 2, label: 'Ruptura de Muralha (80% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/09/Kiba_and_Akamaru%27s_Dual_wolf_fang.png/revision/latest/scale-to-width-down/800?cb=20250331224853', description: 'Transformação combinada em lobo gigante de duas cabeças cujo giro gera ondas de vácuo que rasgam o alvo mesmo sem tocá-lo.' },
  { id: 'sabaku_taisou', name: 'Sabaku Taisou (Funeral Imperial do Deserto)', rank: 'A', category: 'Ninjutsu', nature: 'Doton', chakraCost: 50, basePower: 110, accuracyMod: 14, critBonus: 16, requiredLevel: 9, requiredChakraLevel: 4, learnCostRyo: 1940, clanExclusive: 'Linhagem Kazekage', effects: [{ type: 'crush', target: 'enemy', chance: 100, duration: 2, label: 'Tsunami de Areia Compactada (100% Esmagamento 2t)' }, { type: 'paralysis', target: 'enemy', chance: 80, duration: 2, label: 'Soterramento Total (80% Paralisia)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/8d/Waterfall_Funeral.png/revision/latest/scale-to-width-down/800?cb=20150424204825', description: 'Após inundar o terreno com um maremoto de areia, comprime milhões de toneladas minerais de uma só vez sobre todo o esquadrão.' },
  { id: 'hyuga_hasangeki', name: 'Hakke Hasangeki (Esmagador de Montanhas)', rank: 'A', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 46, basePower: 102, accuracyMod: 14, critBonus: 18, requiredLevel: 8, requiredChakraLevel: 3, learnCostRyo: 1700, clanExclusive: 'Hyuga', kekkeiRequired: 'Byakugan', effects: [{ type: 'crush', target: 'enemy', chance: 95, duration: 2, label: 'Canhão Juken (95% Esmagamento 2t)' }, { type: 'chakra_seal', target: 'enemy', chance: 85, duration: 2, potency: 22, label: 'Choque nos Tenketsu (85% Selo)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/2/25/Hakke_Hasangeki.png/revision/latest/scale-to-width-down/800?cb=20160113190204', description: 'Variante pesada da Palma de Vácuo do Clã Hyuga que dispara um feixe maciço de chakra concentrado à queima-roupa.' },
  { id: 'kaguya_teshi_sendan', name: 'Teshi Sendan (Projéteis Perfurantes dos Dez Dedos)', rank: 'C', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 22, basePower: 52, accuracyMod: 15, critBonus: 15, requiredLevel: 3, requiredChakraLevel: 1, learnCostRyo: 450, clanExclusive: 'Kaguya', kekkeiRequired: 'Shikotsumyaku (Ossos)', effects: [{ type: 'bleed', target: 'enemy', chance: 85, duration: 2, potency: 17, label: 'Falanges Giratórias (85% Laceração 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/3f/Drilling_Finger_Bullets.png/revision/latest/scale-to-width-down/800?cb=20260811021258', description: 'Dispara os ossos endurecidos das pontas dos dez dedos como projéteis estriados capazes de perfurar chapas de aço.' },
  { id: 'rinnegan_banshou_tenin', name: "Banshou Ten'in (Atração Celestial Universal)", rank: 'A', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 48, basePower: 104, accuracyMod: 18, critBonus: 18, requiredLevel: 10, requiredChakraLevel: 4, learnCostRyo: 2250, kekkeiRequired: 'Rinnegan', effects: [{ type: 'paralysis', target: 'enemy', chance: 90, duration: 2, label: 'Puxão Gravitacional (90% Paralisia 2t)' }, { type: 'crush', target: 'enemy', chance: 85, duration: 2, label: 'Empalamento Receptor (85% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/33/Bansho_Tenin_Anime.png/revision/latest/scale-to-width-down/800?cb=20150214202207', description: 'Poder do Caminho Deva que manipula força atrativa irresistível para arrastar o alvo diretamente para um golpe letal.' },
  { id: 'rinnegan_tengai_shinsei', name: 'Tengai Shinsei (Meteoro Celestial Devastador)', rank: 'S', category: 'Kekkei Genkai', nature: 'Neutro', chakraCost: 78, basePower: 160, accuracyMod: 17, critBonus: 22, requiredLevel: 17, requiredChakraLevel: 6, learnCostRyo: 4950, kekkeiRequired: 'Rinnegan', effects: [{ type: 'crush', target: 'enemy', chance: 100, duration: 3, label: 'Duplo Asteroide Orbital (100% Esmagamento 3t)' }, { type: 'stun', target: 'enemy', chance: 85, duration: 1, label: 'Cataclismo Continental (85% Atordoamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/2/2e/Tengai_Shinsei.png/revision/latest/scale-to-width-down/800?cb=20130725115020', description: 'Forma selos simultâneos com o Susanoo sob o Rinnegan para atrair meteoritos colossais da órbita superior sobre todo o campo.' },
  { id: 'mokuton_shinsuusenju', name: 'Senpou Mokuton: Shinsuusenju (Mil Mãos Verdadeiras)', rank: 'S', category: 'Kekkei Genkai', nature: 'Doton', chakraCost: 76, basePower: 158, accuracyMod: 16, critBonus: 20, requiredLevel: 17, requiredChakraLevel: 6, learnCostRyo: 4850, kekkeiRequired: 'Mokuton (Madeira)', effects: [{ type: 'crush', target: 'enemy', chance: 100, duration: 3, label: 'Choujou Kebutsu (100% Esmagamento 3t)' }, { type: 'shield', target: 'self', chance: 100, duration: 2, label: ' Titã de Madeira Sábia (Escudo 2t)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/a/af/Shin_S%C5%ABsenju.png/revision/latest/scale-to-width-down/800?cb=20140619122300', description: 'Ápice lendário do Mokuton: ergue uma estátua budista maior que montanhas cujos milhares de punhos redesenham o mapa.' },
  { id: 'iryou_byakugou', name: 'Ninpou Souzou Saisei: Byakugou no Jutsu (Força de uma Centena)', rank: 'S', category: 'Iryou', nature: 'Yang', chakraCost: 62, basePower: 118, accuracyMod: 22, critBonus: 18, requiredLevel: 14, requiredChakraLevel: 5, learnCostRyo: 3850, healRatio: 0.75, effects: [{ type: 'regen', target: 'self', chance: 100, duration: 4, potency: 45, label: 'Cura Sem Selos (Regeneração 4t)' }, { type: 'crush', target: 'enemy', chance: 85, duration: 2, label: 'Punho Mitótico (85% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/1f/Strength_of_a_Hundred_Seal.svg/revision/latest?cb=20191201052102', description: 'Ápice absoluto do Ninjutsu Médico: espalha marcas negras pelo corpo mantendo regeneração celular automática contínua enquanto ataca.' },
  { id: 'kuchiyose_rashoumon', name: 'Kuchiyose: Rashoumon (Portão Demoníaco Blindado)', rank: 'B', category: 'Kuchiyose', nature: 'Neutro', chakraCost: 34, basePower: 68, accuracyMod: 16, critBonus: 10, requiredLevel: 5, requiredChakraLevel: 2, learnCostRyo: 860, effects: [{ type: 'shield', target: 'self', chance: 100, duration: 3, label: 'Muralha de Ferro Rashoumon (Escudo 3t)' }, { type: 'crush', target: 'enemy', chance: 65, duration: 1, label: 'Rebote Balístico (65% Esmagamento)' }], imageUrl: 'https://static.wikia.nocookie.net/naruto/images/7/7c/Rash%C5%8Dmon.png/revision/latest/scale-to-width-down/800?cb=20140620061002', description: 'Invoca um colossal portão de ferro demoníaco cravado no solo para interceptar e desviar disparos devastadores.' },
];

export interface VillageLocationDef {
  id: string;
  name: string;
  zoneLabel: string;
  description: string;
  ambientPrompt: string;
  imageUrl: string;
  openingNarrative: string;
}

export const VILLAGE_SPECIFIC_LOCATIONS: Record<string, VillageLocationDef[]> = {
  Konohagakure: [
    {
      id: 'konoha_portao',
      name: 'Portão Principal A-Un',
      zoneLabel: 'Fronteira & Vigia',
      description: 'Entrada monumental de Konohagakure fiscalizada pelos Chunins da Guarda do Portão.',
      ambientPrompt: 'Registre a chegada ou partida do seu esquadrão nos portões principais da Folha...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/34/Konohagakure.png',
      openingNarrative:
        'As colossais folhas de madeira carmesim e verde do Portão Principal A-Un erguem-se entre as muralhas externas da Vila Oculta da Folha, cercadas pela densa floresta do País do Fogo. Na guarita lateral, os registros de entrada e saída permanecem abertos para a conferência de autorizações de missão, escoltas mercantes e patrulhas de fronteira.',
    },
    {
      id: 'konoha_hokage',
      name: 'Residência do Hokage & Monumento',
      zoneLabel: 'Governo & Missões',
      description: 'Sede administrativa onde missões são despachadas sob os rostos esculpidos na rocha.',
      ambientPrompt: 'Apresente seu relatório de missão ou solicite audiência no gabinete do Hokage...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b6/Hokage_Residence.png',
      openingNarrative:
        'Sob a encosta imponente do Monumento dos Hokages, o edifício administrativo central concentra os salões de despacho, arquivos confidenciais e o gabinete superior do líder da Folha. Mensageiros, capitães de esquadrão e diplomatas cruzam os corredores vermelhos carregando pergaminhos lacrados de Rank D a Rank S.',
    },
    {
      id: 'konoha_ichiraku',
      name: 'Distrito Comercial & Ramen Ichiraku',
      zoneLabel: 'Convivência Social',
      description: 'Rua movimentada e balcão tradicional de lámen para conversa entre times ninjas.',
      ambientPrompt: 'Puxe um banco sob a cortina do Ichiraku e converse com outros shinobis da vila...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/9b/Ichiraku_Ramen.png',
      openingNarrative:
        'Lanternas aquecem a rua principal do distrito comercial, onde o aroma de caldo fumegante escapa por trás das cortinas tradicionais de linho do Ramen Ichiraku. Os bancos de madeira diante do balcão oferecem refúgio tranquilo para shinobis descansarem após longas patrulhas e trocarem rumores das fronteiras.',
    },
    {
      id: 'konoha_campo3',
      name: 'Campo de Treinamento Nº 3',
      zoneLabel: 'Treino & Sparring',
      description: 'Clareira histórica com os três troncos de madeira à margem do rio para duelos e treinos.',
      ambientPrompt: 'Posicione-se diante dos troncos de treino para praticar jutsus ou desafiar um aliado...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/61/Third_Training_Ground.PNG',
      openingNarrative:
        'À margem de um riacho cristalino cercado por copas altas, três postes de madeira marcados por inúmeras lâminas e queimaduras elementais demarcam o centro da clareira. O terreno amplo de grama e rocha permite desde testes de equipe para recém-graduados até duelos intensos de Kenjutsu e Ninjutsu.',
    },
    {
      id: 'konoha_academia',
      name: 'Academia Ninja & Pátio',
      zoneLabel: 'Ensino & Graduação',
      description: 'Centro de formação de Estudantes, Senseis e candidatos aos Exames de Graduação.',
      ambientPrompt: 'Reúna sua equipe no pátio da Academia ou oriente novos recrutas shinobi...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/4/4d/Academy.png',
      openingNarrative:
        'Anexo à base do complexo governamental, o pátio de terra batida da Academia Ninja reúne alvos concêntricos de arremesso de shuriken, pistas de corrida e salas táticas de instrução. Sob a sombra da grande árvore e do balanço de madeira, gerações de estudantes iniciam sua jornada no caminho shinobi.',
    },
    {
      id: 'konoha_hospital',
      name: 'Hospital de Konoha & Ala Médica',
      zoneLabel: 'Iryou-Nin & Clãs',
      description: 'Complexo médico dirigido pelos Iryou-Nin para recuperação celular e perícias.',
      ambientPrompt: 'Visite companheiros em recuperação ou conduza tratamentos na ala médica...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
      openingNarrative:
        'Silencioso e banhado pela brisa que atravessa os jardins internos, o Hospital Geral de Konoha abriga enfermarias cirúrgicas, estufas de ervas medicinais e salas de terapia por Iryou-Ninjutsu. Médicos ninjas circulam em plantão contínuo para restaurar redes de chakra exauridas em missões críticas.',
    },
  ],
  Sunagakure: [
    {
      id: 'suna_portao',
      name: 'Desfiladeiro da Barreira de Vento',
      zoneLabel: 'Fronteira & Vigia',
      description: 'Única fenda estreita entre os paredões rochosos que protegem Sunagakure do deserto.',
      ambientPrompt: 'Atravesse o cânion vigiado pelas sentinelas da Areia sob o vento cortante...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b0/Sunagakure.png',
      openingNarrative:
        'Esculpida numa garganta monumental de arenito que barra tempestades e exércitos invasores, a fenda de acesso de Sunagakure canaliza rajadas constantes do deserto do País do Vento. Torres de vigia camufladas nas escarpas observam cada caravana e esquadrão que cruza a sombra das falésias.',
    },
    {
      id: 'suna_kazekage',
      name: 'Esfera Central do Kazekage',
      zoneLabel: 'Governo & Missões',
      description: 'Edifício esférico de arenito no coração da vila onde o Conselho e o Kazekage deliberam.',
      ambientPrompt: 'Compareça à cúpula do Kazekage para receber diretrizes estratégicas do País do Vento...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/fe/Kazekage_Residence.PNG',
      openingNarrative:
        'No centro da cratera fortificada ergue-se a imponente estrutura esférica marcada pelo kanji do Vento, sede do gabinete do Kazekage e da câmara de conselheiros de Suna. Mapas das rotas de oásis e relatórios de fronteira cobrem as mesas de pedra fresca no interior da cúpula.',
    },
    {
      id: 'suna_oficina_kugutsu',
      name: 'Brigada & Oficina de Marionetes',
      zoneLabel: 'Artesãos & Kugutsu',
      description: 'Galeria subterrânea de engenharia de marionetes, selos mecânicos e antídotos.',
      ambientPrompt: 'Ajuste mecanismos ocultos ou discuta táticas com os mestres marionetistas...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/88/Kikyo_Castle.png',
      openingNarrative:
        'Sob abóbadas iluminadas por lâmpadas a óleo, bancadas repletas de engrenagens articuladas, fios de chakra e cilindros selados compõem o berço da Brigada de Marionetes. O som cadenciado de madeira temperada e lâminas retráteis ecoa pelos salões de montagem tática.',
    },
    {
      id: 'suna_mercado_oasis',
      name: 'Aviário & Bazar das Dunas',
      zoneLabel: 'Convivência Social',
      description: 'Mercado coberto por tendas térmicas e aviário postal onde shinobis trocam suprimentos.',
      ambientPrompt: 'Sente-se à sombra das tendas do Bazar e interaja com ninjas recém-chegados...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/60/Suna_Aviary.png',
      openingNarrative:
        'Toldos de tecido ocre filtram o sol escaldante sobre as passagens comerciais e as torres do aviário mensageiro de Sunagakure. Entre falcões postais pousando nas cúpulas de barro e casas de chá aromático, mercadores e ninjas reúnem-se ao abrigo do calor.',
    },
    {
      id: 'suna_arena_vento',
      name: 'Pátio de Treino das Tempestades',
      zoneLabel: 'Treino & Sparring',
      description: 'Arena rebaixada em pedra para treinos de Fuuton, Kenjutsu e controle magnético.',
      ambientPrompt: 'Inicie uma sessão de treinamento tático nas areias da arena interna...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/7/75/Kazekage_Office.png',
      openingNarrative:
        'Cercado por paredes circulares de rocha densa que contêm ondas cortantes de vento e turbilhões de areia, o pátio rebaixado serve como campo oficial de combate de Suna. Leques de ferro, lâminas e selos de barreira são postos à prova diariamente sob o céu árido.',
    },
    {
      id: 'suna_estufa_medica',
      name: 'Hospital de Suna & Estufa Médica',
      zoneLabel: 'Iryou-Nin & Pesquisa',
      description: 'Complexo hospitalar e jardim botânico selado dedicado a antídotos e cura celular.',
      ambientPrompt: 'Examine amostras medicinais ou trate ferimentos de combate na estufa...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/8f/Suna_Hospital.PNG',
      openingNarrative:
        'Protegida por cúpulas de vidro úmido em pleno deserto, a ala médica de Sunagakure cultiva plantas medicinais raras indispensáveis para neutralizar toxinas e desidratação severa. Laboratórios silenciosos conectam o jardim botânico aos leitos de recuperação intensiva.',
    },
  ],
  Kirigakure: [
    {
      id: 'kiri_portao',
      name: 'Portão da Névoa Espessa',
      zoneLabel: 'Fronteira & Vigia',
      description: 'Passagem montanhosa permanentemente encoberta por neblina densa e patrulhas.',
      ambientPrompt: 'Cruze os marcos de pedra sob a cerração vigiada pelos rastreadores da Névoa...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/9d/Current_Kirigakure.png',
      openingNarrative:
        'Entre picos serrilhados e bosques encharcados de sereno marítimo, os pilares úmidos do portão de Kirigakure emergem de uma cortina perene de neblina branca. Apenas passos treinados distinguem o contorno das pontes e os postos ocultos dos vigias da Água.',
    },
    {
      id: 'kiri_mizukage',
      name: 'Torre Cilíndrica do Mizukage',
      zoneLabel: 'Governo & Missões',
      description: 'Centro de comando diplomático e militar da Vila Oculta da Névoa.',
      ambientPrompt: 'Apresente-se diante do gabinete do Mizukage para ordens oficiais...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/f6/Mizukage%27s_Office.png',
      openingNarrative:
        'A torre principal de pedra azul-acinzentada ergue-se no coração das passarelas suspensas de Kirigakure, abrigando o salão de audiências do Mizukage. Da varanda superior avistam-se os canais internos da vila e partem as ordens para a frota e os esquadrões de caça.',
    },
    {
      id: 'kiri_lago_espadas',
      name: 'Lago dos Sete Espadachins',
      zoneLabel: 'Kenjutsu & Sparring',
      description: 'Espelho d’água cercado por pilares de pedra onde espadachins refinam cortes silenciosos.',
      ambientPrompt: 'Desembainhe sua lâmina sobre a superfície do lago para treino de Kenjutsu...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/53/Land_of_Waves.png',
      openingNarrative:
        'Uma enseada calma cercada por colunas antigas reflete a bruma fria como um espelho imóvel, exigindo controle perfeito de chakra nos pés de quem caminha sobre a água. É neste santuário silencioso que os espadachins da Névoa aperfeiçoam golpes guiados apenas pela audição.',
    },
    {
      id: 'kiri_porto',
      name: 'Cais Mercante & Ponte Marítima',
      zoneLabel: 'Convivência Social',
      description: 'Porto interno de embarcações ninjas e ponto de encontro das equipes de Kiri.',
      ambientPrompt: 'Observe os barcos atracarem na névoa e converse com aliados no cais...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/1b/Great_Naruto_Bridge.png',
      openingNarrative:
        'Cordames úmidos e cascos velozes balançam suavemente junto aos píeres de pedra que ligam o arquipélago do País da Água às rotas continentais. Lanternas azuis guiam navegadores e shinobis que se reúnem nas tavernas portuárias ao som das marés.',
    },
    {
      id: 'kiri_academia',
      name: 'Pátio da Nova Academia da Névoa',
      zoneLabel: 'Ensino & Graduação',
      description: 'Reformada para forjar cooperação tática e maestria elemental Suiton.',
      ambientPrompt: 'Treine controle de chakra sobre a água ou instrua jovens Genins...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/4/4d/Academy.png',
      openingNarrative:
        'Superando as eras sombrias do passado, o pátio escalonado da Academia de Kirigakure conta com tanques de canalização aquática e arenas de combate supervisionado. Instrutores avaliam precisão de selos Suiton, leitura na neblina e trabalho coordenado de esquadrão.',
    },
    {
      id: 'kiri_santuario',
      name: 'Pavilhão Médico & Arquivos da Bruma',
      zoneLabel: 'Iryou-Nin & Clãs',
      description: 'Ala costeira de regeneração e arquivo histórico das linhagens de Kirigakure.',
      ambientPrompt: 'Recupere suas reservas de chakra ou reúna membros de clã no pavilhão...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
      openingNarrative:
        'Construído sobre canais de águas termais costeiras, o pavilhão combina enfermarias especializadas em hipotermia e lacerações de espada com arquivos lacrados sobre linhagens aquáticas. Pergaminhos antigos preservam a memória náutica e militar da vila.',
    },
  ],
  Kumogakure: [
    {
      id: 'kumo_portao',
      name: 'Ponte Suspensa das Altas Nuvens',
      zoneLabel: 'Fronteira & Vigia',
      description: 'Passarela elevada entre picos escarpados onde trovões ecoam constantemente.',
      ambientPrompt: 'Aproxime-se da ponte suspensa sob o céu carregado de Kumogakure...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/5a/Kumogakure.png',
      openingNarrative:
        'Acima do mar de nuvens brancas, pontes colossais de pedra e cabos de aço conectam as agulhas montanhosas que formam a fortaleza natural de Kumogakure. Descargas elétricas cruzam o horizonte alpino enquanto sentinelas monitoram os acessos elevados.',
    },
    {
      id: 'kumo_raikage',
      name: 'Torre Suspensa do Raikage',
      zoneLabel: 'Governo & Missões',
      description: 'Cúpula suspensa nas montanhas equipada com transmissão sensorial e comando militar.',
      ambientPrompt: 'Compareça ao salão do Raikage para despacho de missões de alto impacto...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/c/c4/Raikage%27s_Office_Outside.png',
      openingNarrative:
        'Ancorada no pico central do País do Relâmpago, a estrutura cilíndrica azul e dourada do gabinete do Raikage domina toda a cadeia montanhosa. No interior, aparelhos de transmissão de chakra e mesas táticas coordenam respostas imediatas de velocidade máxima.',
    },
    {
      id: 'kumo_unraikyo',
      name: 'Vale das Nuvens e Relâmpago (Unraikyo)',
      zoneLabel: 'Kenjutsu & Sparring',
      description: 'Cânion lendário cercado por cachoeiras onde mestres praticam Kumo-Ryuu e Raiton.',
      ambientPrompt: 'Salte entre os pilares rochosos de Unraikyo para treinar velocidade e lâminas...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/4/43/Valley_of_Clouds_and_Lightning.PNG',
      openingNarrative:
        'Espigões calcários erguem-se sobre águas profundas envoltas por neblina alpina no lendário cânion de Unraikyo. O eco metálico de espadas banhadas em Raiton mistura-se ao rugido das quedas d’água onde guerreiros de Kumo testam seu domínio físico e espiritual.',
    },
    {
      id: 'kumo_praca_trovao',
      name: 'Cachoeira da Verdade & Santuário',
      zoneLabel: 'Meditação & Convivência',
      description: 'Queda d’água sagrada e terraços rochosos de reflexão e encontro de shinobis.',
      ambientPrompt: 'Sente-se diante da queda d’água ou converse nos terraços de Kumogakure...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/4/4b/FallsofTruth.png',
      openingNarrative:
        'Diante de uma cortina cristalina d’água ladeada por formações ancestrais, uma plataforma circular convida shinobis a encararem seu próprio equilíbrio interior. Nos terraços adjacentes, veteranos e aprendizes reúnem-se após jornadas intensas nas cordilheiras.',
    },
    {
      id: 'kumo_camara_selos',
      name: 'Ilha Tartaruga & Câmara de Selamento',
      zoneLabel: 'Pesquisa & Arsenal',
      description: 'Fortaleza móvel ancestral e câmara blindada de relíquias e barreiras táticas.',
      ambientPrompt: 'Estude registros de batalha ou inspecione barreiras de contenção...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/69/Island_Turtle.png',
      openingNarrative:
        'Câmaras revestidas por matrizes de contenção de altíssima densidade resguardam relíquias históricas e áreas de treinamento isoladas sob a jurisdição de Kumogakure. Seladores mantêm vigilância ininterrupta sobre os pilares rúnicos do complexo.',
    },
    {
      id: 'kumo_hospital',
      name: 'Centro Médico & Termas da Nuvem',
      zoneLabel: 'Iryou-Nin & Sensores',
      description: 'Unidade integrada de regeneração bioelétrica, fontes aquecidas e sensores.',
      ambientPrompt: 'Coordene leituras sensoriais ou receba atendimento médico especializado...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/ef/Konoha_Hot_Springs.png',
      openingNarrative:
        'Abastecido por nascentes geotérmicas das altas montanhas, o complexo médico de Kumo une reabilitação muscular para praticantes de Nintaijutsu a uma esfera sensorial de vigilância costeira. O vapor quente contrasta com o ar rarefeito dos picos.',
    },
  ],
  Iwagakure: [
    {
      id: 'iwa_portao',
      name: 'Muralha Rochosa & Ponte Kannabi',
      zoneLabel: 'Fronteira & Vigia',
      description: 'Fortificação natural ligada por pontes de rocha maciça sobre abismos profundos.',
      ambientPrompt: 'Cruze a ponte de pedra sob a inspeção da guarda de fronteira de Iwa...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/fc/Kannabi_Bridge.PNG',
      openingNarrative:
        'Arcos monumentais de pedra talhada cruzam ravinas vertiginosas na rota que conecta as cordilheiras defensivas do País da Terra. Ventos fortes varrem os parapeitos enquanto patrulhas da Rocha fiscalizam comboios e viajantes.',
    },
    {
      id: 'iwa_tsuchikage',
      name: 'Monólito Central do Tsuchikage',
      zoneLabel: 'Governo & Missões',
      description: 'Torre cônica esculpida em pedra viva onde o Tsuchikage comanda as legiões da Terra.',
      ambientPrompt: 'Receba suas ordens de missão nos salões de granito do Tsuchikage...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e4/Iwagakure_no_Sato.png',
      openingNarrative:
        'No centro de Iwagakure, edifícios cônicos de telhados avermelhados interligam-se por dezenas de pontes aéreas de granito ao redor da torre soberana do Tsuchikage. A vontade inabalável da Pedra ecoa nos salões onde as diretrizes militares são seladas.',
    },
    {
      id: 'iwa_pedreira',
      name: 'Anfiteatro de Rocha & Treino Doton',
      zoneLabel: 'Treino & Sparring',
      description: 'Cratera de treinamento reforçada para suportar muralhas terrestres e ondas sísmicas.',
      ambientPrompt: 'Teste sua resistência e técnicas Doton na cratera de combate de Iwa...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b1/Chunin_Examination_Arena.png',
      openingNarrative:
        'Escavada diretamente no basalto da cordilheira norte, esta arena escalonada exibe colunas partidas e fendas deixadas por gerações de mestres Doton. O solo denso absorve impactos colossais durante sessões de combate e provas táticas.',
    },
    {
      id: 'iwa_mercado',
      name: 'Galeria Subterrânea dos Artesãos',
      zoneLabel: 'Convivência Social',
      description: 'Corredores iluminados por lanternas com tavernas, forjas e comércio entre shinobis.',
      ambientPrompt: 'Converse com outros ninjas nas galerias aquecidas de Iwagakure...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/a/a6/Yakiniku_Q.png',
      openingNarrative:
        'Abrigadas do vento frio das montanhas, galerias escavadas na rocha viva fervilham com o calor de grelhas acesas, forjas de armaduras pesadas e casas de chá. É o ponto predileto de confraternização das divisões de Iwagakure ao fim do expediente.',
    },
    {
      id: 'iwa_divisao_explosao',
      name: 'Arquivo & Quartel do Corpo Tático',
      zoneLabel: 'Esquadrões Especiais',
      description: 'Quartel fortificado dedicado a estratégias de cerco, barreiras e demolição.',
      ambientPrompt: 'Planeje manobras conjuntas com veteranos dos esquadrões especiais...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
      openingNarrative:
        'Paredes duplas de pedra selada protegem os arquivos cartográficos e os pátios de instrução dos esquadrões especiais da Terra. Maquetes topográficas das fronteiras orientam o planejamento de cercos e defesas de longo alcance.',
    },
    {
      id: 'iwa_hospital',
      name: 'Santuário Médico da Cantaria',
      zoneLabel: 'Iryou-Nin & Cura',
      description: 'Hospital escavado na montanha protegido contra qualquer ataque aéreo.',
      ambientPrompt: 'Trate lesões de missão ou auxilie os médicos ninjas da Rocha...',
      imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
      openingNarrative:
        'Instalado numa câmara iluminada por claraboias naturais no interior da montanha, o hospital central de Iwagakure oferece segurança intransponível aos feridos. Equipes de Iryou-Nin atuam em turnos ininterruptos para restaurar combatentes.',
    },
  ],
};

const MINOR_VILLAGE_SCENERY: Record<
  string,
  { gateImg: string; hallImg: string; districtImg: string; trainImg: string; archiveImg: string; medImg: string; atmosphere: string }
> = {
  Amegakure: {
    gateImg: 'https://static.wikia.nocookie.net/naruto/images/4/41/Amegakure.png',
    hallImg: 'https://static.wikia.nocookie.net/naruto/images/4/41/Amegakure.png',
    districtImg: 'https://static.wikia.nocookie.net/naruto/images/9/9b/Ichiraku_Ramen.png',
    trainImg: 'https://static.wikia.nocookie.net/naruto/images/4/4a/Tenchi_Bridge.png',
    archiveImg: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
    medImg: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
    atmosphere: 'sob a chuva incessante e as tubulações metálicas verticais que ecoam pela metrópole cinzenta do País da Chuva',
  },
  Otogakure: {
    gateImg: 'https://static.wikia.nocookie.net/naruto/images/c/cc/Otogakure.png',
    hallImg: 'https://static.wikia.nocookie.net/naruto/images/c/cc/Otogakure.png',
    districtImg: 'https://static.wikia.nocookie.net/naruto/images/7/76/Naka_Shrine.png',
    trainImg: 'https://static.wikia.nocookie.net/naruto/images/6/61/Third_Training_Ground.PNG',
    archiveImg: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
    medImg: 'https://static.wikia.nocookie.net/naruto/images/8/8f/Suna_Hospital.PNG',
    atmosphere: 'entre câmaras acústicas subterrâneas, vales nebulosos e postos ocultos de ressonância sonora',
  },
  Takigakure: {
    gateImg: 'https://static.wikia.nocookie.net/naruto/images/b/bc/Takigakure.png',
    hallImg: 'https://static.wikia.nocookie.net/naruto/images/b/bc/Takigakure.png',
    districtImg: 'https://static.wikia.nocookie.net/naruto/images/f/f4/Dango_Shop.png',
    trainImg: 'https://static.wikia.nocookie.net/naruto/images/4/4b/FallsofTruth.png',
    archiveImg: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
    medImg: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
    atmosphere: 'atrás da cortina trovejante das cataratas gigantes e raízes centenárias que ocultam a vila',
  },
  Kusagakure: {
    gateImg: 'https://static.wikia.nocookie.net/naruto/images/0/09/Kusagakure.png',
    hallImg: 'https://static.wikia.nocookie.net/naruto/images/0/09/Kusagakure.png',
    districtImg: 'https://static.wikia.nocookie.net/naruto/images/f/f4/Dango_Shop.png',
    trainImg: 'https://static.wikia.nocookie.net/naruto/images/4/4a/Tenchi_Bridge.png',
    archiveImg: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
    medImg: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
    atmosphere: 'em meio às campinas verdes, pontes suspensas e bosques de bambu cruzados por diplomatas e espiões',
  },
  Uzushiogakure: {
    gateImg: 'https://static.wikia.nocookie.net/naruto/images/3/31/Uzushio.png',
    hallImg: 'https://static.wikia.nocookie.net/naruto/images/3/31/Uzushio.png',
    districtImg: 'https://static.wikia.nocookie.net/naruto/images/7/76/Naka_Shrine.png',
    trainImg: 'https://static.wikia.nocookie.net/naruto/images/5/53/Land_of_Waves.png',
    archiveImg: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
    medImg: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
    atmosphere: 'cercado pelos redemoinhos oceânicos e obeliscos gravados com antigas matrizes de Fuinjutsu',
  },
  Hoshigakure: {
    gateImg: 'https://static.wikia.nocookie.net/naruto/images/0/01/Hoshigakure.png',
    hallImg: 'https://static.wikia.nocookie.net/naruto/images/0/01/Hoshigakure.png',
    districtImg: 'https://static.wikia.nocookie.net/naruto/images/f/f4/Dango_Shop.png',
    trainImg: 'https://static.wikia.nocookie.net/naruto/images/b/b1/Chunin_Examination_Arena.png',
    archiveImg: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
    medImg: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
    atmosphere: 'no interior da cratera isolada cercada pelo desfiladeiro de gases densos do País dos Ursos',
  },
  Yukigakure: {
    gateImg: 'https://static.wikia.nocookie.net/naruto/images/5/50/Land_of_Snow.png',
    hallImg: 'https://static.wikia.nocookie.net/naruto/images/5/50/Land_of_Snow.png',
    districtImg: 'https://static.wikia.nocookie.net/naruto/images/e/ef/Konoha_Hot_Springs.png',
    trainImg: 'https://static.wikia.nocookie.net/naruto/images/5/50/Land_of_Snow.png',
    archiveImg: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
    medImg: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
    atmosphere: 'sob nevascas cortantes, trilhos aquecidos a vapor e picos glaciais espelhados do País da Neve',
  },
  'País do Ferro': {
    gateImg: 'https://static.wikia.nocookie.net/naruto/images/8/82/LandofIron.png',
    hallImg: 'https://static.wikia.nocookie.net/naruto/images/8/82/LandofIron.png',
    districtImg: 'https://static.wikia.nocookie.net/naruto/images/e/ef/Konoha_Hot_Springs.png',
    trainImg: 'https://static.wikia.nocookie.net/naruto/images/8/82/LandofIron.png',
    archiveImg: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
    medImg: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
    atmosphere: 'diante das montanhas dos Três Lobos, onde estandartes samurais tremulam sobre a neve neutra',
  },
  'País das Ondas': {
    gateImg: 'https://static.wikia.nocookie.net/naruto/images/1/1b/Great_Naruto_Bridge.png',
    hallImg: 'https://static.wikia.nocookie.net/naruto/images/5/53/Land_of_Waves.png',
    districtImg: 'https://static.wikia.nocookie.net/naruto/images/9/9b/Ichiraku_Ramen.png',
    trainImg: 'https://static.wikia.nocookie.net/naruto/images/5/53/Land_of_Waves.png',
    archiveImg: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
    medImg: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
    atmosphere: 'ao longo da grande ponte marítima, enseadas brumosas e canais de pescadores e mercadores',
  },
  Getsugakure: {
    gateImg: 'https://static.wikia.nocookie.net/naruto/images/6/60/Tsuki_no_Kuni.png',
    hallImg: 'https://static.wikia.nocookie.net/naruto/images/6/60/Tsuki_no_Kuni.png',
    districtImg: 'https://static.wikia.nocookie.net/naruto/images/f/f4/Dango_Shop.png',
    trainImg: 'https://static.wikia.nocookie.net/naruto/images/6/60/Tsuki_no_Kuni.png',
    archiveImg: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
    medImg: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
    atmosphere: 'na ilha em formato de lua crescente banhada por marés prateadas e brisas tropicais noturnas',
  },
  Yugakure: {
    gateImg: 'https://static.wikia.nocookie.net/naruto/images/d/d3/Yugakure.PNG',
    hallImg: 'https://static.wikia.nocookie.net/naruto/images/d/d3/Yugakure.PNG',
    districtImg: 'https://static.wikia.nocookie.net/naruto/images/e/ef/Konoha_Hot_Springs.png',
    trainImg: 'https://static.wikia.nocookie.net/naruto/images/6/61/Third_Training_Ground.PNG',
    archiveImg: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
    medImg: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
    atmosphere: 'envolto pelo vapor branco das fontes termais vulcânicas e trilhas tranquilas nas encostas arborizadas',
  },
  Shimogakure: {
    gateImg: 'https://static.wikia.nocookie.net/naruto/images/5/50/Land_of_Snow.png',
    hallImg: 'https://static.wikia.nocookie.net/naruto/images/8/82/LandofIron.png',
    districtImg: 'https://static.wikia.nocookie.net/naruto/images/e/ef/Konoha_Hot_Springs.png',
    trainImg: 'https://static.wikia.nocookie.net/naruto/images/4/43/Valley_of_Clouds_and_Lightning.PNG',
    archiveImg: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
    medImg: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
    atmosphere: 'nas encostas cobertas de geada cristalina entre os desfiladeiros boreais e o mar setentrional',
  },
  Tanigakure: {
    gateImg: 'https://static.wikia.nocookie.net/naruto/images/4/4a/Tenchi_Bridge.png',
    hallImg: 'https://static.wikia.nocookie.net/naruto/images/f/fc/Kannabi_Bridge.PNG',
    districtImg: 'https://static.wikia.nocookie.net/naruto/images/f/f4/Dango_Shop.png',
    trainImg: 'https://static.wikia.nocookie.net/naruto/images/4/48/Valley_of_the_End.png',
    archiveImg: 'https://static.wikia.nocookie.net/naruto/images/e/e9/Konoha_Archive_Library.png',
    medImg: 'https://static.wikia.nocookie.net/naruto/images/1/17/Konoha_Hospital.png',
    atmosphere: 'sobre as pontes estreitas e gargantas fluviais profundas que cortam o País dos Rios',
  },
};

export function getVillageLocations(villageName: string): VillageLocationDef[] {
  const specific = VILLAGE_SPECIFIC_LOCATIONS[villageName];
  if (specific) return specific;

  const meta = VILLAGES.find((v) => v.name === villageName);
  const slug = (meta?.id || villageName).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const leader = meta?.kageTitle || 'Líder da Vila';
  const scenery = MINOR_VILLAGE_SCENERY[villageName] || MINOR_VILLAGE_SCENERY.Tanigakure;

  return [
    {
      id: `${slug}_portao`,
      name: `Portão de Entrada de ${villageName}`,
      zoneLabel: 'Fronteira & Vigia',
      description: `Posto avançado de controle e vigilância nas divisas de ${villageName}.`,
      ambientPrompt: `Descreva sua chegada ou patrulha nos arredores de ${villageName}...`,
      imageUrl: scenery.gateImg,
      openingNarrative: `Os marcos fortificados de entrada de ${villageName} erguem-se ${scenery.atmosphere}. Sentinelas de turno registram a passagem de esquadrões, mensageiros e viajantes que cruzam o perímetro externo do território.`,
    },
    {
      id: `${slug}_comando`,
      name: `Salão de Comando (${leader})`,
      zoneLabel: 'Governo & Missões',
      description: `Sede oficial de decisões políticas, diplomacia e despacho de missões em ${villageName}.`,
      ambientPrompt: `Reúna-se no salão principal de ${villageName} para tratar de missões e alianças...`,
      imageUrl: scenery.hallImg,
      openingNarrative: `No edifício central de governança de ${villageName}, o gabinete do ${leader} concentra mapas estratégicos, tratados de fronteira e o quadro oficial de contratos shinobi. Capitães e emissários aguardam despacho nos corredores solenes.`,
    },
    {
      id: `${slug}_distrito`,
      name: `Distrito Comercial & Casa de Chá`,
      zoneLabel: 'Convivência Social',
      description: `Ponto de encontro movimentado onde shinobis e viajantes de ${villageName} interagem.`,
      ambientPrompt: `Inicie um diálogo livre com outros jogadores nas ruas de ${villageName}...`,
      imageUrl: scenery.districtImg,
      openingNarrative: `Lanternas acesas iluminam as bancas de suprimentos e a tradicional Casa de Chá de ${villageName}, situada ${scenery.atmosphere}. O ambiente acolhedor reúne ninjas locais em descanso entre missões e patrulhas.`,
    },
    {
      id: `${slug}_treino`,
      name: `Campo de Treinamento Tático`,
      zoneLabel: 'Treino & Sparring',
      description: `Área reservada para aprimorar jutsus, Kenjutsu e realizar combates amistosos.`,
      ambientPrompt: `Posicione seu personagem no campo de treino de ${villageName} e role suas técnicas...`,
      imageUrl: scenery.trainImg,
      openingNarrative: `Demarcado por alvos de madeira, formações naturais e espaço aberto ${scenery.atmosphere}, o Campo de Treinamento Tático de ${villageName} recebe diariamente duelos supervisionados, exercícios elementais e práticas de Kenjutsu.`,
    },
    {
      id: `${slug}_arsenal`,
      name: `Forja & Arquivo de Pergaminhos`,
      zoneLabel: 'Estudo & Arsenal',
      description: `Local de manutenção de armas ninjas, estudo de selos e preparação pré-missão.`,
      ambientPrompt: `Prepare seu equipamento ou troque informações estratégicas no arquivo...`,
      imageUrl: scenery.archiveImg,
      openingNarrative: `Estantes altas repletas de compêndios táticos dividem espaço com bancadas de afiação e selamento no Arquivo de ${villageName}. Antes de partir em operação, shinobis revisam armadilhas, mapas e ferramentas ninjas neste recinto.`,
    },
    {
      id: `${slug}_enfermaria`,
      name: `Pavilhão Médico & Descanso`,
      zoneLabel: 'Iryou-Nin & Recuperação',
      description: `Ala de cuidados médicos ninjas para recuperação após missões de alto risco.`,
      ambientPrompt: `Relate a recuperação pós-batalha ou atendimento médico em ${villageName}...`,
      imageUrl: scenery.medImg,
      openingNarrative: `Resguardado em setor silencioso de ${villageName}, o Pavilhão Médico dispõe de leitos de recuperação celular, bandagens estéreis e reservas de ervas curativas mantidas pelos Iryou-Nin de plantão.`,
    },
  ];
}

export function getVillageImage(villageNameOrId: string): string | null {
  const key = villageNameOrId.trim().toLowerCase();
  const match = VILLAGES.find(
    (v) => v.name.toLowerCase() === key || v.id.toLowerCase() === key
  );
  return match?.imageUrl || null;
}

export function getJutsuImage(
  jutsu: Pick<JutsuDef, 'id' | 'category' | 'nature'> & { imageUrl?: string }
): string | null {
  if (jutsu.imageUrl) return jutsu.imageUrl;
  const match = JUTSU_CATALOG.find((j) => j.id === jutsu.id);
  return match?.imageUrl || null;
}

export const SEVEN_MIST_SWORD_IDS = [
  'kubikiribocho',
  'samehada',
  'nuibari',
  'kabutowari',
  'shibuki',
  'kiba',
  'hiramekarei',
] as const;

export const ITEM_CATALOG: ItemDef[] = [
  { id: 'kunai_tatica', name: 'Kunai Tática Balanceada', category: 'weapon', rarity: 'Comum', priceRyo: 250, statBonuses: { velocidade: 3, taijutsu: 3 }, imageUrl: 'https://static.wikia.nocookie.net/naruto/images/d/d7/Kunai.png/revision/latest/scale-to-width-down/800?cb=20180109022105', description: 'Kunai de aço temperado equilibrada para combate próximo e arremesso.' },
  { id: 'shuriken_fuuma', name: 'Fuuma Shuriken Gigante', category: 'weapon', rarity: 'Raro', priceRyo: 780, statBonuses: { velocidade: 5, forca: 6 }, imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b8/F%C5%ABma_Shuriken.png/revision/latest/scale-to-width-down/800?cb=20160819165115', description: 'Estrela dobrável de quatro lâminas de longo alcance.' },
  {
    id: 'kubikiribocho',
    name: 'Kubikiribocho (Espada Decapitadora)',
    category: 'weapon',
    rarity: 'Épico',
    priceRyo: 2400,
    statBonuses: { forca: 12, taijutsu: 8, resistencia: 4 },
    villageRequired: 'Kirigakure',
    factionTag: 'Sete Espadachins da Névoa',
    isSevenMistSword: true,
    dropOnly: true,
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/d/de/J%C5%ABz%C5%8D_wielding_the_Kubikirib%C5%8Dch%C5%8D.png/revision/latest/scale-to-width-down/800?cb=20150709135936',
    description: 'Uma das Sete Espadas da Névoa (Exclusiva de Kirigakure · Fora da Loja): lâmina gigante que se regenera absorvendo o ferro do sangue inimigo.',
  },
  {
    id: 'samehada',
    name: 'Samehada (Pele de Tubarão)',
    category: 'weapon',
    rarity: 'Lendário',
    priceRyo: 5200,
    statBonuses: { forca: 15, controleChakra: 14, resistencia: 8 },
    villageRequired: 'Kirigakure',
    factionTag: 'Sete Espadachins da Névoa',
    isSevenMistSword: true,
    dropOnly: true,
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/9/9f/Samehada_unwrapped.png/revision/latest/scale-to-width-down/800?cb=20150207111701',
    description: 'Uma das Sete Espadas da Névoa (Exclusiva de Kirigakure · Fora da Loja): lâmina viva escamosa que rasga a carne e devora chakra a cada golpe.',
  },
  {
    id: 'nuibari',
    name: 'Nuibari (Agulha de Costura)',
    category: 'weapon',
    rarity: 'Épico',
    priceRyo: 2650,
    statBonuses: { velocidade: 11, taijutsu: 10, ninjutsu: 5 },
    villageRequired: 'Kirigakure',
    factionTag: 'Sete Espadachins da Névoa',
    isSevenMistSword: true,
    dropOnly: true,
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/31/Nuibari_katana.png/revision/latest/scale-to-width-down/800?cb=20150124180417',
    description: 'Uma das Sete Espadas da Névoa (Exclusiva de Kirigakure · Fora da Loja): lâmina longa em formato de agulha conectada a um fio de aço cortante que costura e imobiliza alvos.',
  },
  {
    id: 'kabutowari',
    name: 'Kabutowari (Rachadora de Elmos)',
    category: 'weapon',
    rarity: 'Épico',
    priceRyo: 2900,
    statBonuses: { forca: 16, resistencia: 8, taijutsu: 6 },
    villageRequired: 'Kirigakure',
    factionTag: 'Sete Espadachins da Névoa',
    isSevenMistSword: true,
    dropOnly: true,
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/81/Kabutowari.png/revision/latest/scale-to-width-down/800?cb=20220403103723',
    description: 'Uma das Sete Espadas da Névoa (Exclusiva de Kirigakure · Fora da Loja): conjunto de machado e marreta ligados por corrente capaz de esmagar qualquer armadura ou defesa absoluta.',
  },
  {
    id: 'shibuki',
    name: 'Shibuki (Lâmina Explosiva)',
    category: 'weapon',
    rarity: 'Épico',
    priceRyo: 3100,
    statBonuses: { forca: 10, ninjutsu: 12, velocidade: 6 },
    villageRequired: 'Kirigakure',
    factionTag: 'Sete Espadachins da Névoa',
    isSevenMistSword: true,
    dropOnly: true,
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/c/ce/Shibuki.png/revision/latest/scale-to-width-down/800?cb=20150115115849',
    description: 'Uma das Sete Espadas da Névoa (Exclusiva de Kirigakure · Fora da Loja): espada revestida por um rolo infinito de selos explosivos que detona ao impacto e cobre o campo com fuligem.',
  },
  {
    id: 'kiba',
    name: 'Kiba (Presas Relâmpago)',
    category: 'weapon',
    rarity: 'Lendário',
    priceRyo: 4500,
    statBonuses: { velocidade: 14, ninjutsu: 11, taijutsu: 9 },
    villageRequired: 'Kirigakure',
    factionTag: 'Sete Espadachins da Névoa',
    isSevenMistSword: true,
    dropOnly: true,
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/10/Kiba_swords.png/revision/latest/scale-to-width-down/800?cb=20171025111157',
    description: 'Uma das Sete Espadas da Névoa (Exclusiva de Kirigakure · Fora da Loja): par de espadas gêmeas imbuídas com Raiton para cortes elétricos de altíssima velocidade.',
  },
  {
    id: 'hiramekarei',
    name: 'Hiramekarei (Lâmina Gêmea de Chakra)',
    category: 'weapon',
    rarity: 'Lendário',
    priceRyo: 4700,
    statBonuses: { controleChakra: 14, ninjutsu: 12, taijutsu: 9 },
    villageRequired: 'Kirigakure',
    factionTag: 'Sete Espadachins da Névoa',
    isSevenMistSword: true,
    dropOnly: true,
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/e/ef/Ch%C5%8Dj%C5%ABr%C5%8D_Wielding_Hiramekarei.png/revision/latest/scale-to-width-down/800?cb=20220213105741',
    description: 'Uma das Sete Espadas da Névoa (Exclusiva de Kirigakure · Fora da Loja): espada bandada de dois cabos que acumula chakra para manifestar martelos ou lâminas gigantes.',
  },
  { id: 'kusanagi', name: 'Lâmina Kusanagi', category: 'weapon', rarity: 'Lendário', priceRyo: 4800, statBonuses: { velocidade: 14, ninjutsu: 12, taijutsu: 10 }, imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/32/Sword_of_Kusanagi.png/revision/latest/scale-to-width-down/800?cb=20220215010339', description: 'Espada lendária capaz de conduzir Raiton e cortar quase qualquer defesa.' },
  { id: 'colete_chunin', name: 'Colete Tático Chunin', category: 'armor', rarity: 'Comum', priceRyo: 420, statBonuses: { resistencia: 5, controleChakra: 2 }, imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/fc/Fourth_Division.png/revision/latest/scale-to-width-down/800?cb=20150215231630', description: 'Colete padrão com bolsos para pergaminhos e proteção balística.' },
  { id: 'armadura_kumo', name: 'Armadura de Chakra de Kumo', category: 'armor', rarity: 'Épico', priceRyo: 2200, statBonuses: { resistencia: 11, velocidade: 7, controleChakra: 5 }, imageUrl: 'https://static.wikia.nocookie.net/naruto/images/8/81/Raiton_no_yoroi.png/revision/latest/scale-to-width-down/800?cb=20150518165136', description: 'Malha condutora que amplia a velocidade de reação em campo.' },
  { id: 'manto_akatsuki', name: 'Manto das Nuvens Carmesins', category: 'armor', rarity: 'Lendário', priceRyo: 4600, statBonuses: { ninjutsu: 12, genjutsu: 10, resistencia: 10 }, imageUrl: 'https://static.wikia.nocookie.net/naruto/images/4/46/Kotoamatsukami_Activated.png/revision/latest/scale-to-width-down/800?cb=20150615204859', description: 'Manto negro forrado com selos protetores de alta densidade.' },
  { id: 'bandana_vila', name: 'Bandana Ninja Gravada', category: 'headband', rarity: 'Comum', priceRyo: 150, statBonuses: { inteligencia: 2, resistencia: 2 }, imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/fc/Forehead_Protector.png/revision/latest/scale-to-width-down/800?cb=20160116193641', description: 'Protetor frontal metálico com o brasão da vila oculta.' },
  { id: 'elmo_anbu', name: 'Máscara Anbu de Porcelana', category: 'headband', rarity: 'Épico', priceRyo: 1950, statBonuses: { velocidade: 8, genjutsu: 6, inteligencia: 6 }, imageUrl: 'https://static.wikia.nocookie.net/naruto/images/7/7d/Konoha_Anbu.png/revision/latest/scale-to-width-down/800?cb=20150226122737', description: 'Máscara tática para operações secretas e ocultação de intenção.' },
  { id: 'pergaminho_selamento', name: 'Pergaminho de Selamento Duplo', category: 'accessory', rarity: 'Raro', priceRyo: 900, statBonuses: { controleChakra: 7, ninjutsu: 5 }, imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/6a/Summoning_Technique.png/revision/latest/scale-to-width-down/800?cb=20150120115239', description: 'Armazena armas e amplia a eficiência na execução de selos.' },
  { id: 'anel_kage', name: 'Selo do Conselho Kage', category: 'accessory', rarity: 'Lendário', priceRyo: 4200, statBonuses: { ninjutsu: 10, inteligencia: 10, controleChakra: 10 }, imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/1f/Strength_of_a_Hundred_Seal.svg/revision/latest?cb=20191201052102', description: 'Relíquia cerimonial concedida aos grandes estrategistas da vila.' },
  { id: 'pilula_soldado', name: 'Pílula do Soldado (Hyourougan)', category: 'consumable', rarity: 'Comum', priceRyo: 180, statBonuses: {}, healChakra: 85, imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/f3/Military_Rations_Pill.PNG/revision/latest/scale-to-width-down/800?cb=20150529150622', description: 'Restaura 85 de Chakra imediatamente em combate.' },
  { id: 'kit_medico', name: 'Kit Médico de Campo', category: 'consumable', rarity: 'Comum', priceRyo: 200, statBonuses: {}, healHp: 110, imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/f0/Mystical_Palm_Technique.png/revision/latest/scale-to-width-down/800?cb=20230224021339', description: 'Bandagens e pomadas de ervas que recuperam 110 de HP.' },
  // ================= ESPÓLIOS RAROS DE MISSÃO (DROP EXCLUSIVO / P2P) =================
  {
    id: 'laminas_chakra_asuma',
    name: 'Lâminas de Trincheira de Chakra',
    category: 'weapon',
    rarity: 'Raro',
    priceRyo: 1350,
    statBonuses: { taijutsu: 7, velocidade: 6, controleChakra: 5 },
    dropOnly: true,
    factionTag: 'Espólio Raro de Missão',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/68/Asuma_With_His_Chakra_Blades.PNG/revision/latest/scale-to-width-down/800?cb=20160216223830',
    description: 'Par de facas de trincheira forjadas em metal especial que absorve a natureza elemental do usuário. Obtida como espólio em missões.',
  },
  {
    id: 'pergaminho_explosivo_raro',
    name: 'Pergaminho Tático de Selos Explosivos',
    category: 'accessory',
    rarity: 'Raro',
    priceRyo: 1200,
    statBonuses: { ninjutsu: 6, inteligencia: 5, velocidade: 3 },
    dropOnly: true,
    factionTag: 'Espólio Raro de Missão',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/be/Paperbomb.png/revision/latest/scale-to-width-down/800?cb=20150529135157',
    description: 'Conjunto selado de tarjas explosivas calibradas para emboscadas rápidas. Obtido em missões táticas.',
  },
  {
    id: 'pilulas_tres_cores',
    name: 'Pílulas Secretas das Três Cores',
    category: 'consumable',
    rarity: 'Épico',
    priceRyo: 950,
    statBonuses: {},
    healHp: 180,
    healChakra: 160,
    dropOnly: true,
    factionTag: 'Espólio Épico de Missão',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/b/b9/Three_Coloured_Pills.png/revision/latest?cb=20141010122500',
    description: 'Composto medicinal de elite que restaura 180 de HP e 160 de Chakra de imediato. Obtido em missões de alto risco.',
  },
  {
    id: 'reliquia_quatro_simbolos',
    name: 'Relíquia Ancestral dos Quatro Símbolos',
    category: 'accessory',
    rarity: 'Épico',
    priceRyo: 2600,
    statBonuses: { controleChakra: 10, ninjutsu: 9, resistencia: 6 },
    dropOnly: true,
    factionTag: 'Espólio Épico de Missão',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/2/27/Four_Symbols_Seal.svg/revision/latest?cb=20150510014907',
    description: 'Talismã gravado com matrizes de Fuinjutsu antigas recuperado de ruínas de guerra.',
  },
  {
    id: 'amuleto_cinco_elementos',
    name: 'Insígnia Sábia dos Cinco Elementos',
    category: 'accessory',
    rarity: 'Lendário',
    priceRyo: 4900,
    statBonuses: { ninjutsu: 13, controleChakra: 12, inteligencia: 9, velocidade: 6 },
    dropOnly: true,
    factionTag: 'Relíquia Lendária de Missão',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/1/1b/Five_Elements_Seal.png/revision/latest/scale-to-width-down/800?cb=20240906230419',
    description: 'Artefato lendário encontrado apenas em operações Rank A e S, harmonizando todas as naturezas elementais.',
  },
  {
    id: 'elixir_byakugou',
    name: 'Elixir Regenerativo Celular',
    category: 'consumable',
    rarity: 'Lendário',
    priceRyo: 1800,
    statBonuses: {},
    healHp: 280,
    healChakra: 220,
    dropOnly: true,
    factionTag: 'Relíquia Lendária de Missão',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/f/fe/Creation_Rebirth.png/revision/latest/scale-to-width-down/800?cb=20240928171334',
    description: 'Ampola médica suprema recuperada em missões críticas: restaura 280 HP e 220 Chakra.',
  },
];

const GREAT_NATION_MISSIONS: MissionTemplate[] = [
  // ================= KONOHAGAKURE (10 MISSÕES: D, C, B, A, S) =================
  {
    id: 'patrulha_fronteira',
    assignedVillage: 'Konohagakure',
    title: 'Patrulha nos Bosques Externos de Konoha',
    rank: 'D',
    minLevel: 1,
    enemyName: 'Batedor Errante das Colinas',
    enemyClan: 'Fuuma',
    enemyVillage: 'Tanigakure',
    enemyAvatar: '',
    enemyNature: 'Fuuton',
    baseHp: 135,
    baseAttack: 22,
    baseSpeed: 10,
    baseXp: 90,
    baseChakraXp: 65,
    baseRyo: 320,
    baseMerit: 35,
    briefing: 'Vasculhe a trilha leste do País do Fogo e intercepte um batedor furtivo próximo aos marcos de vigilância de Konoha.',
  },
  {
    id: 'konoha_pomar_naka_d',
    assignedVillage: 'Konohagakure',
    title: 'Escolta de Colheita às Margens do Rio Naka',
    rank: 'D',
    minLevel: 1,
    enemyName: 'Saqueador da Estrada Sul',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Kusagakure',
    enemyAvatar: '',
    enemyNature: 'Doton',
    baseHp: 142,
    baseAttack: 23,
    baseSpeed: 11,
    baseXp: 95,
    baseChakraXp: 70,
    baseRyo: 340,
    baseMerit: 38,
    briefing: 'Proteja os agricultores locais e recupere caixas de suprimentos medicinais roubadas perto da ponte do Rio Naka.',
  },
  {
    id: 'konoha_caravana_cha_c',
    assignedVillage: 'Konohagakure',
    title: 'Escolta Mercante rumo à Fronteira Sul do Fogo',
    rank: 'C',
    minLevel: 2,
    enemyName: 'Mercenário das Lâminas Curtas',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Amegakure',
    enemyAvatar: '',
    enemyNature: 'Suiton',
    baseHp: 205,
    baseAttack: 33,
    baseSpeed: 15,
    baseXp: 165,
    baseChakraXp: 120,
    baseRyo: 620,
    baseMerit: 70,
    briefing: 'Acompanhe uma caravana comercial pelas estradas florestais do País do Fogo e neutralize emboscadas de mercenários.',
  },
  {
    id: 'konoha_posto_kikyo_c',
    assignedVillage: 'Konohagakure',
    title: 'Rastreamento no Forte da Colina Kikyo',
    rank: 'C',
    minLevel: 3,
    enemyName: 'Sabotador da Fronteira Oeste',
    enemyClan: 'Kamizuru',
    enemyVillage: 'Iwagakure',
    enemyAvatar: '',
    enemyNature: 'Doton',
    baseHp: 230,
    baseAttack: 37,
    baseSpeed: 16,
    baseXp: 190,
    baseChakraXp: 140,
    baseRyo: 710,
    baseMerit: 84,
    briefing: 'Inspecione armadilhas explosivas instaladas nas rotas montanhosas do oeste e detenha o agente sabotador.',
  },
  {
    id: 'konoha_pergaminho_floresta_b',
    assignedVillage: 'Konohagakure',
    title: 'Contra-Espionagem no Setor Restrito 44',
    rank: 'B',
    minLevel: 4,
    enemyName: 'Infiltrador Mascarado do Vale',
    enemyClan: 'Fuuma',
    enemyVillage: 'Otogakure',
    enemyAvatar: '',
    enemyNature: 'Fuuton',
    baseHp: 290,
    baseAttack: 47,
    baseSpeed: 19,
    baseXp: 280,
    baseChakraXp: 195,
    baseRyo: 1120,
    baseMerit: 140,
    briefing: 'Intercepte uma célula invasora que tenta cruzar a mata densa portando mapas codificados das defesas de Konoha.',
  },
  {
    id: 'konoha_comitiva_fogo_b',
    assignedVillage: 'Konohagakure',
    title: 'Guarda Tática da Comitiva Feudal do Fogo',
    rank: 'B',
    minLevel: 6,
    enemyName: 'Assassino Contratado Kagerou',
    enemyClan: 'Kurama',
    enemyVillage: 'Kusagakure',
    enemyAvatar: '',
    enemyNature: 'Katon',
    baseHp: 340,
    baseAttack: 54,
    baseSpeed: 21,
    baseXp: 345,
    baseChakraXp: 240,
    baseRyo: 1380,
    baseMerit: 180,
    briefing: 'Proteja os emissários diplomáticos da capital feudal contra ataques coordenados de ilusão e fogo na estrada imperial.',
  },
  {
    id: 'konoha_bingo_nukenin_a',
    assignedVillage: 'Konohagakure',
    title: 'Caçada ANBU no Templo Fronteiriço do Fogo',
    rank: 'A',
    minLevel: 7,
    enemyName: 'Renegado Classe-A Ryuzen',
    enemyClan: 'Shimura',
    enemyVillage: 'Konohagakure',
    enemyAvatar: '',
    enemyNature: 'Fuuton',
    baseHp: 415,
    baseAttack: 65,
    baseSpeed: 25,
    baseXp: 475,
    baseChakraXp: 325,
    baseRyo: 2020,
    baseMerit: 260,
    briefing: 'Rastreie e neutralize um ex-oficial desertor listado no Livro Bingo antes que venda segredos táticos da Folha.',
  },
  {
    id: 'konoha_barreira_leste_a',
    assignedVillage: 'Konohagakure',
    title: 'Restauração da Grande Barreira Sensorial',
    rank: 'A',
    minLevel: 9,
    enemyName: 'Mestre de Selos Corrompidos Genma-Ryu',
    enemyClan: 'Chinoike',
    enemyVillage: 'Yugakure',
    enemyAvatar: '',
    enemyNature: 'Raiton',
    baseHp: 470,
    baseAttack: 72,
    baseSpeed: 27,
    baseXp: 560,
    baseChakraXp: 390,
    baseRyo: 2480,
    baseMerit: 315,
    briefing: 'Defenda os quatro obeliscos de Fuinjutsu ao norte da vila contra um esquadrão especializado em ruptura de barreiras.',
  },
  {
    id: 'konoha_vale_fronteira_s',
    assignedVillage: 'Konohagakure',
    title: 'Operação Suprema nas Cataratas da Fronteira',
    rank: 'S',
    minLevel: 11,
    enemyName: 'Comandante Renegado Kurogane',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Takigakure',
    enemyAvatar: '',
    enemyNature: 'Katon',
    baseHp: 590,
    baseAttack: 88,
    baseSpeed: 31,
    baseXp: 870,
    baseChakraXp: 590,
    baseRyo: 3850,
    baseMerit: 510,
    briefing: 'Impeça um senhor da guerra mercenário de ativar um artefato proibido nas quedas d’água limítrofes do País do Fogo.',
  },
  {
    id: 'konoha_defesa_monumento_s',
    assignedVillage: 'Konohagakure',
    title: 'Diretriz Vermelha: Cerco Noturno à Folha',
    rank: 'S',
    minLevel: 14,
    enemyName: 'Arconte Mercenário das Cinco Lâminas',
    enemyClan: 'Fuuma',
    enemyVillage: 'Amegakure',
    enemyAvatar: '',
    enemyNature: 'Raiton',
    baseHp: 710,
    baseAttack: 102,
    baseSpeed: 35,
    baseXp: 1120,
    baseChakraXp: 760,
    baseRyo: 5200,
    baseMerit: 690,
    briefing: 'Lidere a linha de contenção máxima nos penhascos superiores e elimine o líder da coalizão clandestina.',
  },

  // ================= SUNAGAKURE (10 MISSÕES: D, C, B, A, S) =================
  {
    id: 'suna_ronda_quebra_vento_d',
    assignedVillage: 'Sunagakure',
    title: 'Vistoria na Fenda do Quebra-Vento',
    rank: 'D',
    minLevel: 1,
    enemyName: 'Pilhador Nômade das Dunas',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Sunagakure',
    enemyAvatar: '',
    enemyNature: 'Fuuton',
    baseHp: 138,
    baseAttack: 22,
    baseSpeed: 11,
    baseXp: 92,
    baseChakraXp: 66,
    baseRyo: 325,
    baseMerit: 36,
    briefing: 'Verifique os sensores acústicos instalados nas paredes de arenito de Suna e expulse saqueadores oportunistas.',
  },
  {
    id: 'suna_estufa_oasis_d',
    assignedVillage: 'Sunagakure',
    title: 'Proteção das Cisternas Subterrâneas',
    rank: 'D',
    minLevel: 1,
    enemyName: 'Ladrão de Água do Deserto',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Kusagakure',
    enemyAvatar: '',
    enemyNature: 'Doton',
    baseHp: 146,
    baseAttack: 24,
    baseSpeed: 11,
    baseXp: 98,
    baseChakraXp: 70,
    baseRyo: 345,
    baseMerit: 39,
    briefing: 'Guarde os dutos de irrigação das estufas medicinais contra invasores noturnos em busca de reservas hídricas.',
  },
  {
    id: 'suna_rota_escorpiao_c',
    assignedVillage: 'Sunagakure',
    title: 'Escolta pelo Desfiladeiro das Tempestades',
    rank: 'C',
    minLevel: 2,
    enemyName: 'Assaltante dos Ventos Cortantes',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Sunagakure',
    enemyAvatar: '',
    enemyNature: 'Fuuton',
    baseHp: 210,
    baseAttack: 34,
    baseSpeed: 15,
    baseXp: 170,
    baseChakraXp: 122,
    baseRyo: 635,
    baseMerit: 74,
    briefing: 'Guie mercadores de especiarias e metais raros através de uma tempestade de areia infestada de emboscadores.',
  },
  {
    id: 'suna_oasis_meridional_c',
    assignedVillage: 'Sunagakure',
    title: 'Retomada do Posto do Oásis Carmesim',
    rank: 'C',
    minLevel: 3,
    enemyName: ' Artilheiro Renegado Sabaku-Jin',
    enemyClan: 'Kamizuru',
    enemyVillage: 'Iwagakure',
    enemyAvatar: '',
    enemyNature: 'Doton',
    baseHp: 235,
    baseAttack: 38,
    baseSpeed: 16,
    baseXp: 195,
    baseChakraXp: 142,
    baseRyo: 725,
    baseMerit: 86,
    briefing: 'Desaloje batedores estrangeiros que ocuparam um ponto de parada vital para os mensageiros do País do Vento.',
  },
  {
    id: 'suna_oficina_marionetes_b',
    assignedVillage: 'Sunagakure',
    title: 'Recuperação de Núcleos da Brigada de Marionetes',
    rank: 'B',
    minLevel: 4,
    enemyName: 'Marionetista Desertor Karasu-Kai',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Sunagakure',
    enemyAvatar: '',
    enemyNature: 'Fuuton',
    baseHp: 295,
    baseAttack: 48,
    baseSpeed: 19,
    baseXp: 285,
    baseChakraXp: 200,
    baseRyo: 1150,
    baseMerit: 145,
    briefing: 'Persiga pelas dunas altas um ex-artesão que fugiu com engrenagens venenosas seladas da Brigada Kugutsu.',
  },
  {
    id: 'suna_fronteira_rocha_b',
    assignedVillage: 'Sunagakure',
    title: 'Interdição no Platô Pedregoso do Norte',
    rank: 'B',
    minLevel: 6,
    enemyName: 'Capitão de Cerco Ganpeki',
    enemyClan: 'Kamizuru',
    enemyVillage: 'Iwagakure',
    enemyAvatar: '',
    enemyNature: 'Doton',
    baseHp: 345,
    baseAttack: 55,
    baseSpeed: 20,
    baseXp: 350,
    baseChakraXp: 245,
    baseRyo: 1400,
    baseMerit: 182,
    briefing: 'Destrua um depósito avançado de explosivos montado na divisa árida entre o País do Vento e o País da Terra.',
  },
  {
    id: 'suna_ruinas_antigas_a',
    assignedVillage: 'Sunagakure',
    title: 'Selamento na Necrópole Soterrada de Suna',
    rank: 'A',
    minLevel: 7,
    enemyName: 'Profanador de Selos Shakunetsu',
    enemyClan: 'Terumi',
    enemyVillage: 'Amegakure',
    enemyAvatar: '',
    enemyNature: 'Katon',
    baseHp: 420,
    baseAttack: 66,
    baseSpeed: 25,
    baseXp: 485,
    baseChakraXp: 335,
    baseRyo: 2060,
    baseMerit: 268,
    briefing: 'Impeça mercenários de Rank-A de violarem câmaras subterrâneas de selamento milenar sob o grande deserto.',
  },
  {
    id: 'suna_caçada_tempestade_a',
    assignedVillage: 'Sunagakure',
    title: 'Eliminação de Esquadrão no Mar de Areia Negra',
    rank: 'A',
    minLevel: 9,
    enemyName: 'Vanguarda Magnética Jinrai',
    enemyClan: 'Yotsuki',
    enemyVillage: 'Kumogakure',
    enemyAvatar: '',
    enemyNature: 'Raiton',
    baseHp: 475,
    baseAttack: 73,
    baseSpeed: 27,
    baseXp: 570,
    baseChakraXp: 395,
    baseRyo: 2520,
    baseMerit: 320,
    briefing: 'Use o terreno de areia densa a seu favor para neutralizar um comando relâmpago infiltrado no extremo leste.',
  },
  {
    id: 'suna_olho_ciclone_s',
    assignedVillage: 'Sunagakure',
    title: 'Protocolo Suna: Fortaleza do Ciclone Escarlate',
    rank: 'S',
    minLevel: 11,
    enemyName: 'Senhor das Cem Marionetes Renki',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Sunagakure',
    enemyAvatar: '',
    enemyNature: 'Fuuton',
    baseHp: 600,
    baseAttack: 89,
    baseSpeed: 31,
    baseXp: 880,
    baseChakraXp: 600,
    baseRyo: 3920,
    baseMerit: 520,
    briefing: 'Invada o reduto oculto nas falésias de vento e derrote um mestre renegado de marionetes de guerra.',
  },
  {
    id: 'suna_soberania_vento_s',
    assignedVillage: 'Sunagakure',
    title: 'Defesa Absoluta da Cúpula do Vento',
    rank: 'S',
    minLevel: 14,
    enemyName: 'General Exilado das Dunas Cinzentas',
    enemyClan: 'Fuuma',
    enemyVillage: 'Takigakure',
    enemyAvatar: '',
    enemyNature: 'Katon',
    baseHp: 720,
    baseAttack: 103,
    baseSpeed: 35,
    baseXp: 1140,
    baseChakraXp: 775,
    baseRyo: 5300,
    baseMerit: 700,
    briefing: 'Neutralize uma ofensiva de escala catastrófica antes que alcance a muralha monolítica de Sunagakure.',
  },

  // ================= KIRIGAKURE (10 MISSÕES: D, C, B, A, S) =================
  {
    id: 'kiri_farol_nevoa_d',
    assignedVillage: 'Kirigakure',
    title: 'Manutenção Tática dos Faróis de Neblina',
    rank: 'D',
    minLevel: 1,
    enemyName: 'Contrabandista dos Recifes',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'País das Ondas',
    enemyAvatar: '',
    enemyNature: 'Suiton',
    baseHp: 136,
    baseAttack: 22,
    baseSpeed: 11,
    baseXp: 90,
    baseChakraXp: 66,
    baseRyo: 325,
    baseMerit: 35,
    briefing: 'Reative os sinalizadores de chakra nas ilhotas externas de Kiri e detenha pequenos barcos clandestinos.',
  },
  {
    id: 'kiri_docas_orientais_d',
    assignedVillage: 'Kirigakure',
    title: 'Vigilância Noturna nas Docas Submersas',
    rank: 'D',
    minLevel: 1,
    enemyName: 'Saqueador de Carga Naval',
    enemyClan: 'Karatachi',
    enemyVillage: 'Kirigakure',
    enemyAvatar: '',
    enemyNature: 'Suiton',
    baseHp: 145,
    baseAttack: 24,
    baseSpeed: 12,
    baseXp: 98,
    baseChakraXp: 70,
    baseRyo: 345,
    baseMerit: 39,
    briefing: 'Impeça o furto de provisões navais armazenadas nos ancoradouros cobertos por serração espessa.',
  },
  {
    id: 'kiri_comboio_arquipelago_c',
    assignedVillage: 'Kirigakure',
    title: 'Escolta Naval pelo Estreito das Correntes',
    rank: 'C',
    minLevel: 2,
    enemyName: 'Corsário da Maré Negra',
    enemyClan: 'Hozuki',
    enemyVillage: 'Kirigakure',
    enemyAvatar: '',
    enemyNature: 'Suiton',
    baseHp: 212,
    baseAttack: 34,
    baseSpeed: 15,
    baseXp: 170,
    baseChakraXp: 125,
    baseRyo: 640,
    baseMerit: 75,
    briefing: 'Proteja embarcações de suprimentos do País da Água contra piratas armados durante a maré de nevoeiro.',
  },
  {
    id: 'kiri_ilha_vigia_c',
    assignedVillage: 'Kirigakure',
    title: 'Varredura na Ilha de Escuta Costeira',
    rank: 'C',
    minLevel: 3,
    enemyName: 'Batedor Marítimo de Trovão',
    enemyClan: 'Yotsuki',
    enemyVillage: 'Kumogakure',
    enemyAvatar: '',
    enemyNature: 'Raiton',
    baseHp: 238,
    baseAttack: 39,
    baseSpeed: 17,
    baseXp: 198,
    baseChakraXp: 145,
    baseRyo: 735,
    baseMerit: 88,
    briefing: 'Investigue o silêncio de um posto avançado insular e expulse espiões que mapeiam as rotas navais de Kiri.',
  },
  {
    id: 'kiri_oinin_silencio_b',
    assignedVillage: 'Kirigakure',
    title: 'Operação Oinin: Silêncio nas Águas Frias',
    rank: 'B',
    minLevel: 4,
    enemyName: 'Desertor Portador de Pergaminho Suigetsu-Ryu',
    enemyClan: 'Hoshigaki',
    enemyVillage: 'Kirigakure',
    enemyAvatar: '',
    enemyNature: 'Suiton',
    baseHp: 298,
    baseAttack: 48,
    baseSpeed: 20,
    baseXp: 290,
    baseChakraXp: 205,
    baseRyo: 1180,
    baseMerit: 148,
    briefing: 'Cumpra ordens dos Caçadores da Névoa para interceptar um fugitivo antes que alcance navios estrangeiros.',
  },
  {
    id: 'kiri_forja_laminas_b',
    assignedVillage: 'Kirigakure',
    title: 'Defesa do Comboio de Aço Temperado',
    rank: 'B',
    minLevel: 6,
    enemyName: 'Espadachim Mercenário Kiri-Saki',
    enemyClan: 'Karatachi',
    enemyVillage: 'Getsugakure',
    enemyAvatar: '',
    enemyNature: 'Fuuton',
    baseHp: 348,
    baseAttack: 55,
    baseSpeed: 21,
    baseXp: 355,
    baseChakraXp: 248,
    baseRyo: 1410,
    baseMerit: 185,
    briefing: 'Guarde lingotes especiais destinados aos mestres armeiros de Kirigakure contra um grupo de espadachins rivais.',
  },
  {
    id: 'kiri_caca_renegado_mar_a',
    assignedVillage: 'Kirigakure',
    title: 'Expurgo no Atol das Brumas Sangrentas',
    rank: 'A',
    minLevel: 7,
    enemyName: 'Capitão Renegado Kaizaru',
    enemyClan: 'Hoshigaki',
    enemyVillage: 'Kirigakure',
    enemyAvatar: '',
    enemyNature: 'Suiton',
    baseHp: 425,
    baseAttack: 67,
    baseSpeed: 25,
    baseXp: 490,
    baseChakraXp: 340,
    baseRyo: 2080,
    baseMerit: 272,
    briefing: 'Desmantele uma fortaleza pirata erguida por ex-ninjas rebeldes nos recifes orientais do País da Água.',
  },
  {
    id: 'kiri_bloqueio_abissal_a',
    assignedVillage: 'Kirigakure',
    title: 'Contra-Ataque na Fossa das Marés',
    rank: 'A',
    minLevel: 9,
    enemyName: 'Incursor de Vapor Enkaku',
    enemyClan: 'Terumi',
    enemyVillage: 'Shimogakure',
    enemyAvatar: '',
    enemyNature: 'Katon',
    baseHp: 480,
    baseAttack: 74,
    baseSpeed: 27,
    baseXp: 575,
    baseChakraXp: 400,
    baseRyo: 2550,
    baseMerit: 325,
    briefing: 'Impeça sabotadores de alto escalão de romperem os selos termais submarinos que protegem a baía interna.',
  },
  {
    id: 'kiri_julgamento_espadas_s',
    assignedVillage: 'Kirigakure',
    title: 'Caçada S-Rank: Usurpador de Lâmina Ancestral',
    rank: 'S',
    minLevel: 11,
    enemyName: 'Mestre Espadachim Exilado Mizuhara',
    enemyClan: 'Hozuki',
    enemyVillage: 'Kirigakure',
    enemyAvatar: '',
    enemyNature: 'Suiton',
    baseHp: 605,
    baseAttack: 90,
    baseSpeed: 32,
    baseXp: 890,
    baseChakraXp: 610,
    baseRyo: 3980,
    baseMerit: 530,
    briefing: 'Recupere uma relíquia de Kenjutsu das mãos de um veterano letal oculto nas cavernas costeiras do norte.',
  },
  {
    id: 'kiri_armada_fantasma_s',
    assignedVillage: 'Kirigakure',
    title: 'Operação Leviatã: Defesa de Kirigakure',
    rank: 'S',
    minLevel: 14,
    enemyName: 'Almirante Renegado Shinkai',
    enemyClan: 'Karatachi',
    enemyVillage: 'Uzushiogakure',
    enemyAvatar: '',
    enemyNature: 'Raiton',
    baseHp: 725,
    baseAttack: 104,
    baseSpeed: 35,
    baseXp: 1150,
    baseChakraXp: 785,
    baseRyo: 5350,
    baseMerit: 710,
    briefing: 'Afunde a nau capitânia de uma frota mercenária e derrote seu comandante sob tempestade elétrica em alto-mar.',
  },

  // ================= IWAGAKURE (10 MISSÕES: D, C, B, A, S) =================
  {
    id: 'iwa_tuneis_basalto_d',
    assignedVillage: 'Iwagakure',
    title: 'Desobstrução e Vigia nas Galerias de Basalto',
    rank: 'D',
    minLevel: 1,
    enemyName: 'Garimpeiro Invasor das Minas',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Kusagakure',
    enemyAvatar: '',
    enemyNature: 'Doton',
    baseHp: 140,
    baseAttack: 22,
    baseSpeed: 10,
    baseXp: 92,
    baseChakraXp: 66,
    baseRyo: 325,
    baseMerit: 36,
    briefing: 'Patrulhe os túneis mineradores externos de Iwagakure e expulse invasores que furtam quartzo condutor.',
  },
  {
    id: 'iwa_ponte_pedra_d',
    assignedVillage: 'Iwagakure',
    title: 'Inspeção nos Viadutos da Cordilheira',
    rank: 'D',
    minLevel: 1,
    enemyName: 'Salteador das Escarpas',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Tanigakure',
    enemyAvatar: '',
    enemyNature: 'Fuuton',
    baseHp: 148,
    baseAttack: 24,
    baseSpeed: 11,
    baseXp: 98,
    baseChakraXp: 70,
    baseRyo: 345,
    baseMerit: 39,
    briefing: 'Garanta a passagem livre nas pontes suspensas de pedra utilizadas pelos mensageiros locais.',
  },
  {
    id: 'iwa_comboio_minerio_c',
    assignedVillage: 'Iwagakure',
    title: 'Escolta de Minério pelo Passo da Garganta',
    rank: 'C',
    minLevel: 2,
    enemyName: 'Líder Bandoleiro Ganseki',
    enemyClan: 'Kamizuru',
    enemyVillage: 'Iwagakure',
    enemyAvatar: '',
    enemyNature: 'Doton',
    baseHp: 215,
    baseAttack: 34,
    baseSpeed: 14,
    baseXp: 170,
    baseChakraXp: 122,
    baseRyo: 635,
    baseMerit: 74,
    briefing: 'Defenda vagões de ferro forjado contra emboscadas de deslizamento nos cânions estreitos do País da Terra.',
  },
  {
    id: 'iwa_fronteira_grama_c',
    assignedVillage: 'Iwagakure',
    title: 'Reconhecimento na Divisa de Kusagakure',
    rank: 'C',
    minLevel: 3,
    enemyName: 'Espião de Campo Kusa-Kage',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Kusagakure',
    enemyAvatar: '',
    enemyNature: 'Katon',
    baseHp: 238,
    baseAttack: 38,
    baseSpeed: 16,
    baseXp: 196,
    baseChakraXp: 142,
    baseRyo: 730,
    baseMerit: 86,
    briefing: 'Monitore movimentações irregulares nas planícies fronteiriças do sul e capture o informante inimigo.',
  },
  {
    id: 'iwa_brigada_demolicao_b',
    assignedVillage: 'Iwagakure',
    title: 'Neutralização de Paiol Clandestino na Serra',
    rank: 'B',
    minLevel: 4,
    enemyName: 'Artífice Renegado Bakuren',
    enemyClan: 'Kamizuru',
    enemyVillage: 'Iwagakure',
    enemyAvatar: '',
    enemyNature: 'Katon',
    baseHp: 300,
    baseAttack: 49,
    baseSpeed: 18,
    baseXp: 290,
    baseChakraXp: 205,
    baseRyo: 1170,
    baseMerit: 146,
    briefing: 'Desarme cargas de argila e selos incendiários estocados por desertores em uma caverna vulcânica.',
  },
  {
    id: 'iwa_bastião_norte_b',
    assignedVillage: 'Iwagakure',
    title: 'Defesa da Fortaleza Rochosa Setentrional',
    rank: 'B',
    minLevel: 6,
    enemyName: 'Incursor Veloz Raiko',
    enemyClan: 'Yotsuki',
    enemyVillage: 'Kumogakure',
    enemyAvatar: '',
    enemyNature: 'Raiton',
    baseHp: 352,
    baseAttack: 55,
    baseSpeed: 21,
    baseXp: 355,
    baseChakraXp: 248,
    baseRyo: 1415,
    baseMerit: 185,
    briefing: 'Sustente o perímetro fortificado nas montanhas altas contra ataques relâmpago de batedores hostis.',
  },
  {
    id: 'iwa_colosso_canyon_a',
    assignedVillage: 'Iwagakure',
    title: 'Caçada ao Desertor da Guarda de Pedra',
    rank: 'A',
    minLevel: 7,
    enemyName: 'Comandante Renegado Dogan',
    enemyClan: 'Kamizuru',
    enemyVillage: 'Iwagakure',
    enemyAvatar: '',
    enemyNature: 'Doton',
    baseHp: 430,
    baseAttack: 67,
    baseSpeed: 24,
    baseXp: 490,
    baseChakraXp: 340,
    baseRyo: 2080,
    baseMerit: 270,
    briefing: 'Enfrente um veterano mestre em muralhas e golens de rocha que traiu o Conselho da Pedra.',
  },
  {
    id: 'iwa_santuario_tectonico_a',
    assignedVillage: 'Iwagakure',
    title: 'Estabilização dos Pilares Sísmicos',
    rank: 'A',
    minLevel: 9,
    enemyName: 'Sabotador Elemental Fujin-Ryu',
    enemyClan: 'Fuuma',
    enemyVillage: 'Sunagakure',
    enemyAvatar: '',
    enemyNature: 'Fuuton',
    baseHp: 485,
    baseAttack: 74,
    baseSpeed: 26,
    baseXp: 575,
    baseChakraXp: 400,
    baseRyo: 2550,
    baseMerit: 325,
    briefing: 'Impeça que lâminas de vento pressurizado rachem as colunas naturais que sustentam o distrito leste de Iwa.',
  },
  {
    id: 'iwa_julgamento_montanha_s',
    assignedVillage: 'Iwagakure',
    title: 'Operação Titã: Conflito nos Picos Eternos',
    rank: 'S',
    minLevel: 11,
    enemyName: 'Grão-Mestre Renegado Kongou',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Iwagakure',
    enemyAvatar: '',
    enemyNature: 'Doton',
    baseHp: 615,
    baseAttack: 90,
    baseSpeed: 30,
    baseXp: 895,
    baseChakraXp: 610,
    baseRyo: 3980,
    baseMerit: 530,
    briefing: 'Subjugue um criminoso de Rank-S capaz de erguer fortalezas inteiras de granito no coração da cordilheira.',
  },
  {
    id: 'iwa_muralha_inabalavel_s',
    assignedVillage: 'Iwagakure',
    title: 'Vontade da Pedra: Cerco à Cidadela Central',
    rank: 'S',
    minLevel: 14,
    enemyName: 'Senhor da Guerra Trovão Rubro',
    enemyClan: 'Yotsuki',
    enemyVillage: 'Getsugakure',
    enemyAvatar: '',
    enemyNature: 'Raiton',
    baseHp: 735,
    baseAttack: 104,
    baseSpeed: 34,
    baseXp: 1155,
    baseChakraXp: 785,
    baseRyo: 5380,
    baseMerit: 710,
    briefing: 'Lidere a guarda de elite do País da Terra na batalha decisiva sobre as pontes rochosas monumentais.',
  },

  // ================= KUMOGAKURE (10 MISSÕES: D, C, B, A, S) =================
  {
    id: 'kumo_para_raios_d',
    assignedVillage: 'Kumogakure',
    title: 'Calibragem das Torres Condutoras de Trovão',
    rank: 'D',
    minLevel: 1,
    enemyName: 'Invasor das Passarelas Altas',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Shimogakure',
    enemyAvatar: '',
    enemyNature: 'Fuuton',
    baseHp: 136,
    baseAttack: 23,
    baseSpeed: 12,
    baseXp: 92,
    baseChakraXp: 66,
    baseRyo: 325,
    baseMerit: 36,
    briefing: 'Inspecione os cabos coletores de relâmpago nos picos de Kumogakure e afaste ladrões de bobinas metálicas.',
  },
  {
    id: 'kumo_trilha_nuvens_d',
    assignedVillage: 'Kumogakure',
    title: 'Ronda nas Escadarias Nebulosas do Sul',
    rank: 'D',
    minLevel: 1,
    enemyName: 'Batedor Montanhês Fugitivo',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Yugakure',
    enemyAvatar: '',
    enemyNature: 'Suiton',
    baseHp: 145,
    baseAttack: 24,
    baseSpeed: 12,
    baseXp: 98,
    baseChakraXp: 70,
    baseRyo: 345,
    baseMerit: 39,
    briefing: 'Mantenha seguras as rotas suspensas que conectam os terraços superiores da Vila Oculta da Nuvem.',
  },
  {
    id: 'kumo_correio_relampago_c',
    assignedVillage: 'Kumogakure',
    title: 'Escolta Expressa pelo Porto Setentrional',
    rank: 'C',
    minLevel: 2,
    enemyName: 'Saqueador Costeiro Jinpachi-Gumi',
    enemyClan: 'Hozuki',
    enemyVillage: 'Kirigakure',
    enemyAvatar: '',
    enemyNature: 'Suiton',
    baseHp: 212,
    baseAttack: 35,
    baseSpeed: 16,
    baseXp: 172,
    baseChakraXp: 125,
    baseRyo: 640,
    baseMerit: 75,
    briefing: 'Garanta o embarque seguro de pergaminhos cifrados no litoral rochoso do País do Relâmpago.',
  },
  {
    id: 'kumo_vale_nuvens_c',
    assignedVillage: 'Kumogakure',
    title: 'Contenção no Desfiladeiro de Unraikyo',
    rank: 'C',
    minLevel: 3,
    enemyName: 'Espião de Reconhecimento Alpino',
    enemyClan: 'Kamizuru',
    enemyVillage: 'Iwagakure',
    enemyAvatar: '',
    enemyNature: 'Doton',
    baseHp: 236,
    baseAttack: 39,
    baseSpeed: 17,
    baseXp: 198,
    baseChakraXp: 145,
    baseRyo: 735,
    baseMerit: 88,
    briefing: 'Expulse observadores infiltrados nas agulhas de pedra cercadas por nuvens ao redor de Unraikyo.',
  },
  {
    id: 'kumo_caca_tesouros_b',
    assignedVillage: 'Kumogakure',
    title: 'Recuperação de Artefato de Selamento de Kumo',
    rank: 'B',
    minLevel: 4,
    enemyName: 'Mercenário das Duas Lâminas Shiden',
    enemyClan: 'Yotsuki',
    enemyVillage: 'Kumogakure',
    enemyAvatar: '',
    enemyNature: 'Raiton',
    baseHp: 295,
    baseAttack: 49,
    baseSpeed: 20,
    baseXp: 290,
    baseChakraXp: 205,
    baseRyo: 1180,
    baseMerit: 148,
    briefing: 'Intercepte um desertor veloz que roubou um pote cerimonial dos cofres superiores de Kumogakure.',
  },
  {
    id: 'kumo_fronteira_geada_b',
    assignedVillage: 'Kumogakure',
    title: 'Patrulha de Choque na Divisa de Shimogakure',
    rank: 'B',
    minLevel: 6,
    enemyName: 'Capitão Renegado Hyouga',
    enemyClan: 'Sem Clã (Independente)',
    enemyVillage: 'Shimogakure',
    enemyAvatar: '',
    enemyNature: 'Fuuton',
    baseHp: 348,
    baseAttack: 55,
    baseSpeed: 22,
    baseXp: 355,
    baseChakraXp: 248,
    baseRyo: 1415,
    baseMerit: 186,
    briefing: 'Neutralize uma coluna armada entrincheirada nos passos gelados ao sul do País do Relâmpago.',
  },
  {
    id: 'kumo_esquadrao_tempestade_a',
    assignedVillage: 'Kumogakure',
    title: 'Supressão da Célula Rebelde do Trovão Negro',
    rank: 'A',
    minLevel: 7,
    enemyName: 'Vanguarda Dissidente Raiga-Jin',
    enemyClan: 'Yotsuki',
    enemyVillage: 'Kumogakure',
    enemyAvatar: '',
    enemyNature: 'Raiton',
    baseHp: 425,
    baseAttack: 67,
    baseSpeed: 26,
    baseXp: 490,
    baseChakraXp: 340,
    baseRyo: 2090,
    baseMerit: 272,
    briefing: 'Enfrente em combate direto um especialista em Kenjutsu elétrico que lidera insurrectos nas montanhas.',
  },
  {
    id: 'kumo_ilha_tartaruga_a',
    assignedVillage: 'Kumogakure',
    title: 'Defesa Perimetral do Santuário Oceânico',
    rank: 'A',
    minLevel: 9,
    enemyName: 'Infiltrador Abissal Suiran',
    enemyClan: 'Hoshigaki',
    enemyVillage: 'Kirigakure',
    enemyAvatar: '',
    enemyNature: 'Suiton',
    baseHp: 482,
    baseAttack: 74,
    baseSpeed: 27,
    baseXp: 575,
    baseChakraXp: 400,
    baseRyo: 2550,
    baseMerit: 325,
    briefing: 'Proteja a zona de treinamento restrita no mar oriental contra uma equipe anfíbia de sabotagem.',
  },
  {
    id: 'kumo_julgamento_relampago_s',
    assignedVillage: 'Kumogakure',
    title: 'Trovão Supremo: Duelo no Pico da Tempestade',
    rank: 'S',
    minLevel: 11,
    enemyName: 'Mestre Renegado da Armadura Voltaica Denkou',
    enemyClan: 'Yotsuki',
    enemyVillage: 'Kumogakure',
    enemyAvatar: '',
    enemyNature: 'Raiton',
    baseHp: 605,
    baseAttack: 91,
    baseSpeed: 33,
    baseXp: 895,
    baseChakraXp: 610,
    baseRyo: 3990,
    baseMerit: 530,
    briefing: 'Supere a velocidade extrema de um criminoso S-Rank no topo das agulhas rochosas de Kumogakure.',
  },
  {
    id: 'kumo_bastião_celeste_s',
    assignedVillage: 'Kumogakure',
    title: 'Operação Celeste: Proteção da Torre Central',
    rank: 'S',
    minLevel: 14,
    enemyName: 'Arconte Mercenário Tenrai',
    enemyClan: 'Chinoike',
    enemyVillage: 'Tanigakure',
    enemyAvatar: '',
    enemyNature: 'Katon',
    baseHp: 730,
    baseAttack: 105,
    baseSpeed: 36,
    baseXp: 1160,
    baseChakraXp: 790,
    baseRyo: 5400,
    baseMerit: 715,
    briefing: 'Rechaçe um ataque aéreo coordenado contra o complexo administrativo de Kumogakure.',
  },
];

interface MinorVillageMissionProfile {
  village: string;
  slug: string;
  terrainD1: string;
  terrainD2: string;
  routeC1: string;
  outpostC2: string;
  intrigueB1: string;
  convoyB2: string;
  strongholdA1: string;
  crisisA2: string;
  cataclysmS1: string;
  sovereigntyS2: string;
  rivalVillages: [string, string, string];
  natures: [ChakraNature, ChakraNature, ChakraNature, ChakraNature, ChakraNature];
}

const MINOR_VILLAGE_MISSION_PROFILES: MinorVillageMissionProfile[] = [
  {
    village: 'Amegakure',
    slug: 'ame',
    terrainD1: 'Vistoria das Válvulas Pluviais do Setor Cinza',
    terrainD2: 'Ronda nas Passarelas Metálicas Inferiores',
    routeC1: 'Escolta de Suprimentos sob Chuva Torrencial',
    outpostC2: 'Interceptação nos Dutos Submersos do Lago',
    intrigueB1: 'Contra-Espionagem nas Torres de Condensação',
    convoyB2: 'Bloqueio de Contrabando na Tríplice Fronteira',
    strongholdA1: 'Caçada ao Desertor nos Pináculos de Aço',
    crisisA2: 'Sabotagem de Esquadrão Invasor na Chuva Contínua',
    cataclysmS1: 'Operação Dilúvio: Cerco ao Santuário Pluvial',
    sovereigntyS2: 'Defesa Absoluta do Alto Comando de Amegakure',
    rivalVillages: ['Iwagakure', 'Kusagakure', 'Sunagakure'],
    natures: ['Suiton', 'Raiton', 'Fuuton', 'Doton', 'Suiton'],
  },
  {
    village: 'Otogakure',
    slug: 'oto',
    terrainD1: 'Vigilância nos Corredores Acústicos Externos',
    terrainD2: 'Coleta de Reagentes nos Campos de Arroz do Norte',
    routeC1: 'Escolta de Caravana Científica pelas Colinas',
    outpostC2: 'Varredura na Entrada da Base Subterrânea Leste',
    intrigueB1: 'Recuperação de Pergaminhos de Ressonância Sonora',
    convoyB2: 'Eliminação de Espiões nas Câmaras de Eco',
    strongholdA1: 'Contenção de Rebelião no Pavilhão Subterrâneo',
    crisisA2: 'Caçada ao Renegado dos Diapasões de Chakra',
    cataclysmS1: 'Sinfonia Sombria: Batalha na Cidadela Oculta do Som',
    sovereigntyS2: 'Protocolo Silêncio Total nas Fronteiras de Oto',
    rivalVillages: ['Takigakure', 'Kusagakure', 'Konohagakure'],
    natures: ['Fuuton', 'Raiton', 'Doton', 'Katon', 'Fuuton'],
  },
  {
    village: 'Takigakure',
    slug: 'taki',
    terrainD1: 'Patrulha nas Trilhas da Grande Cortina d’Água',
    terrainD2: 'Proteção dos Jardins da Árvore Gigante',
    routeC1: 'Escolta Fluvial pelas Corredeiras do Norte',
    outpostC2: 'Expulsão de Saqueadores na Gruta Oculta',
    intrigueB1: 'Defesa das Nascentes Sagradas de Takigakure',
    convoyB2: 'Interdição de Mercenários nos Penhascos Úmidos',
    strongholdA1: 'Caçada ANBU nas Gargantas Nebulosas da Cachoeira',
    crisisA2: 'Selamento da Comporta Ancestral de Taki',
    cataclysmS1: 'Torrente Suprema: Duelo no Abismo das Quedas',
    sovereigntyS2: 'Guarda Imortal do Santuário Central de Takigakure',
    rivalVillages: ['Iwagakure', 'Kusagakure', 'Otogakure'],
    natures: ['Suiton', 'Fuuton', 'Doton', 'Raiton', 'Suiton'],
  },
  {
    village: 'Kusagakure',
    slug: 'kusa',
    terrainD1: 'Ronda pelos Campos de Bambu e Ervas Altas',
    terrainD2: 'Vistoria nos Marcos da Estrada Mercante Central',
    routeC1: 'Escolta Diplomática pela Ponte das Planícies Verdes',
    outpostC2: 'Captura de Sabotadores no Vale Florido',
    intrigueB1: 'Interceptação de Correio Militar Estrangeiro',
    convoyB2: 'Proteção do Entreposto Comercial de Kusagakure',
    strongholdA1: 'Expurgo de Facção Clandestina na Floresta de Cogumelos',
    crisisA2: 'Defesa da Relíquia Selada das Planícies da Grama',
    cataclysmS1: 'Vendaval Esmeralda: Guerra Sombra nas Fronteiras',
    sovereigntyS2: 'Operação Soberania nos Domínios de Kusagakure',
    rivalVillages: ['Iwagakure', 'Takigakure', 'Amegakure'],
    natures: ['Doton', 'Fuuton', 'Katon', 'Suiton', 'Fuuton'],
  },
  {
    village: 'Uzushiogakure',
    slug: 'uzushio',
    terrainD1: 'Inspeção dos Totens de Maré e Redemoinhos',
    terrainD2: 'Recuperação de Relíquias nos Recifes Espirais',
    routeC1: 'Escolta Naval através do Turbilhão Leste',
    outpostC2: 'Defesa do Arquivo Costeiro de Caligrafia de Selos',
    intrigueB1: 'Neutralização de Profanadores no Templo das Máscaras',
    convoyB2: 'Reativação das Correntes de Barreira Marítima',
    strongholdA1: 'Caçada ao Ladrão de Fuinjutsu nas Ruínas Antigas',
    crisisA2: 'Contenção de Vórtice Instável na Torre Espiral',
    cataclysmS1: 'Selo Primordial: Julgamento no Altar de Uzushio',
    sovereigntyS2: 'Defesa Eterna do Legado Espiral do Redemoinho',
    rivalVillages: ['Kirigakure', 'Kumogakure', 'Getsugakure'],
    natures: ['Suiton', 'Fuuton', 'Raiton', 'Katon', 'Suiton'],
  },
  {
    village: 'Hoshigakure',
    slug: 'hoshi',
    terrainD1: 'Guarda nos Barrancos de Gás Venenoso do Vale',
    terrainD2: 'Manutenção das Passarelas da Cratera Estelar',
    routeC1: 'Escolta de Suprimentos além da Neblina Tóxica',
    outpostC2: 'Interceptação de Espiões no Observatório Norte',
    intrigueB1: 'Proteção do Pavilhão de Treinamento Astral',
    convoyB2: 'Caçada a Mercenários nos Desfiladeiros dos Ursos',
    strongholdA1: 'Recuperação de Fragmento Radiante Roubado',
    crisisA2: 'Bloqueio Tático na Garganta Cravada da Estrela',
    cataclysmS1: 'Pavão Astral: Confronto na Cúpula da Cratera',
    sovereigntyS2: 'Defesa Máxima do Santuário do Meteorito',
    rivalVillages: ['Iwagakure', 'Takigakure', 'Otogakure'],
    natures: ['Katon', 'Fuuton', 'Raiton', 'Doton', 'Raiton'],
  },
  {
    village: 'Yukigakure',
    slug: 'yuki',
    terrainD1: 'Limpeza e Vigia nos Trilhos Térmicos da Neve',
    terrainD2: 'Patrulha nos Penhascos Congelados do Porto Polar',
    routeC1: 'Escolta de Comboio Ferroviário pela Geleira',
    outpostC2: 'Retomada da Estação Meteorológica Boreal',
    intrigueB1: 'Sabotagem de Artilharia Blindada no Campo Branco',
    convoyB2: 'Defesa dos Geradores Geotérmicos da Capital',
    strongholdA1: 'Caçada ao Comandante Renegado de Armadura Polar',
    crisisA2: 'Interdição Naval entre os Icebergs Setentrionais',
    cataclysmS1: 'Nevasca Absoluta: Cerco à Fortaleza de Gelo',
    sovereigntyS2: 'Guarda Soberana do Palácio Invernal de Yukigakure',
    rivalVillages: ['Kirigakure', 'Shimogakure', 'Kumogakure'],
    natures: ['Suiton', 'Fuuton', 'Raiton', 'Doton', 'Suiton'],
  },
  {
    village: 'País do Ferro',
    slug: 'ferro',
    terrainD1: 'Ronda de Honra nos Portões dos Três Lobos',
    terrainD2: 'Vistoria das Forjas de Sabres de Chakra',
    routeC1: 'Escolta de Emissários Neutros pela Estrada Branca',
    outpostC2: 'Expulsão de Bandoleiros no Passo Nevado Sul',
    intrigueB1: 'Duelo de Contenção contra Ronins Desertores',
    convoyB2: 'Segurança da Caravana de Aço Tamahagane',
    strongholdA1: 'Caçada ao Mestre Ronin do Estilo Iaido Sombrio',
    crisisA2: 'Proteção do Salão de Tratados Internacionais',
    cataclysmS1: 'Código Bushido: Julgamento nas Montanhas dos Lobos',
    sovereigntyS2: 'Defesa Inviolável da Neutralidade do País do Ferro',
    rivalVillages: ['Iwagakure', 'Otogakure', 'Shimogakure'],
    natures: ['Fuuton', 'Raiton', 'Suiton', 'Katon', 'Fuuton'],
  },
  {
    village: 'País das Ondas',
    slug: 'ondas',
    terrainD1: 'Patrulha nos Estaleiros Comunitários da Ilha',
    terrainD2: 'Vigilância nos Pilares de Sustento da Grande Ponte',
    routeC1: 'Escolta Mercantil pela Travessia Marítima Central',
    outpostC2: 'Desmantelamento de Contrabandistas nos Manguezais',
    intrigueB1: 'Defesa da Frota Pesqueira contra Corsários Armados',
    convoyB2: 'Segurança dos Armazéns Portuários das Ondas',
    strongholdA1: 'Expurgo de Sindicato Mercenário na Baía Oculta',
    crisisA2: 'Bloqueio contra Infiltradores na Grande Ponte',
    cataclysmS1: 'Maré Indomável: Batalha pelo Estreito das Ondas',
    sovereigntyS2: 'Liberdade Costeira: Defesa Total do Arquipélago',
    rivalVillages: ['Kirigakure', 'Getsugakure', 'Uzushiogakure'],
    natures: ['Suiton', 'Fuuton', 'Raiton', 'Katon', 'Suiton'],
  },
  {
    village: 'Getsugakure',
    slug: 'getsu',
    terrainD1: 'Vigia Noturna no Farol da Baía Crescente',
    terrainD2: 'Patrulha nos Jardins Lunares da Ilha',
    routeC1: 'Escolta Marítima sob a Maré da Lua Cheia',
    outpostC2: 'Captura de Saqueadores nas Falésias Prateadas',
    intrigueB1: 'Proteção do Tesouro Real da Ilha da Lua',
    convoyB2: 'Interceptação de Navio Mercenário no Canal Sul',
    strongholdA1: 'Caçada ao Espadachim Exilado do Eclipse',
    crisisA2: 'Defesa da Cidadela Costeira de Getsugakure',
    cataclysmS1: 'Luar Carmesim: Confronto no Pico da Meia-Lua',
    sovereigntyS2: 'Guarda Suprema do Santuário Insular de Getsu',
    rivalVillages: ['Kirigakure', 'Kumogakure', 'País das Ondas'],
    natures: ['Raiton', 'Suiton', 'Fuuton', 'Katon', 'Raiton'],
  },
  {
    village: 'Yugakure',
    slug: 'yu',
    terrainD1: 'Manutenção e Vigia nas Fontes Termais Superiores',
    terrainD2: 'Patrulha nas Trilhas de Vapor e Azaleias',
    routeC1: 'Escolta de Peregrinos pelas Montanhas Fumegantes',
    outpostC2: 'Neutralização de Salteadores no Vale Sulfuroso',
    intrigueB1: 'Desarticulação de Seita Fanática nas Grutas Quentes',
    convoyB2: 'Proteção das Hospedarias Diplomáticas de Yugakure',
    strongholdA1: 'Caçada ao Renegado das Lâminas de Vapor Escaldante',
    crisisA2: 'Selamento de Fissura Vulcânica Sabotada',
    cataclysmS1: 'Vapor Carmesim: Purificação nas Cavernas Abissais',
    sovereigntyS2: 'Paz Inabalável: Defesa das Terras Termais de Yu',
    rivalVillages: ['Kumogakure', 'Shimogakure', 'Konohagakure'],
    natures: ['Katon', 'Suiton', 'Doton', 'Fuuton', 'Katon'],
  },
  {
    village: 'Shimogakure',
    slug: 'shimo',
    terrainD1: 'Ronda pelos Bosques de Pinheiros Cobertos de Geada',
    terrainD2: 'Inspeção dos Abrigos Alpinos da Fronteira Norte',
    routeC1: 'Escolta de Suprimentos pelo Vale Congelado',
    outpostC2: 'Expulsão de Batedores no Desfiladeiro Branco',
    intrigueB1: 'Emboscada Tática na Serra da Geada Eterna',
    convoyB2: 'Proteção dos Depósitos Subterrâneos de Inverno',
    strongholdA1: 'Caçada ao Desertor nas Ravinas de Gelo Negro',
    crisisA2: 'Defesa da Linha Fortificada de Shimogakure',
    cataclysmS1: 'Geada Cortante: Duelo nos Picos Silenciosos',
    sovereigntyS2: 'Bastião Boreal: Operação Suprema em Shimogakure',
    rivalVillages: ['Kumogakure', 'Yukigakure', 'Yugakure'],
    natures: ['Suiton', 'Fuuton', 'Raiton', 'Doton', 'Fuuton'],
  },
  {
    village: 'Tanigakure',
    slug: 'tani',
    terrainD1: 'Vigilância nas Pontes de Corda do Grande Cânion',
    terrainD2: 'Ronda pelos Terraços Esculpidos dos Vales',
    routeC1: 'Escolta Mercantil pelas Gargantas Profundas',
    outpostC2: 'Captura de Sabotadores nas Cavernas de Vento',
    intrigueB1: 'Recuperação de Mapas Topográficos dos Desfiladeiros',
    convoyB2: 'Defesa das Forjas Suspensas de Tanigakure',
    strongholdA1: 'Caçada ao Comandante Exilado das Ravinas',
    crisisA2: 'Contenção de Incursão Armada na Ponte Abissal',
    cataclysmS1: 'Eco do Abismo: Batalha na Cidadela do Vale',
    sovereigntyS2: 'Soberania das Ravinas: Defesa Total de Tanigakure',
    rivalVillages: ['Iwagakure', 'Sunagakure', 'Kusagakure'],
    natures: ['Fuuton', 'Doton', 'Katon', 'Raiton', 'Doton'],
  },
];

function buildMinorVillageMissions(p: MinorVillageMissionProfile): MissionTemplate[] {
  return [
    {
      id: `${p.slug}_missao_d1`,
      assignedVillage: p.village,
      title: p.terrainD1,
      rank: 'D',
      minLevel: 1,
      enemyName: `Saqueador Errante de ${p.village}`,
      enemyClan: 'Sem Clã (Independente)',
      enemyVillage: p.rivalVillages[0],
      enemyAvatar: '',
      enemyNature: p.natures[0],
      baseHp: 136,
      baseAttack: 22,
      baseSpeed: 11,
      baseXp: 90,
      baseChakraXp: 65,
      baseRyo: 320,
      baseMerit: 35,
      briefing: `Patrulhe o setor inicial designado pelo quadro de ${p.village} e detenha batedores oportunistas antes que causem danos.`,
    },
    {
      id: `${p.slug}_missao_d2`,
      assignedVillage: p.village,
      title: p.terrainD2,
      rank: 'D',
      minLevel: 1,
      enemyName: 'Invasor Furtivo da Fronteira',
      enemyClan: 'Fuuma',
      enemyVillage: p.rivalVillages[1],
      enemyAvatar: '',
      enemyNature: p.natures[1],
      baseHp: 146,
      baseAttack: 24,
      baseSpeed: 12,
      baseXp: 98,
      baseChakraXp: 70,
      baseRyo: 345,
      baseMerit: 39,
      briefing: `Reforce a guarda perimetral de ${p.village} e recupere materiais táticos furtados durante a madrugada.`,
    },
    {
      id: `${p.slug}_missao_c1`,
      assignedVillage: p.village,
      title: p.routeC1,
      rank: 'C',
      minLevel: 2,
      enemyName: 'Mercenário das Estradas Cinzentas',
      enemyClan: 'Sem Clã (Independente)',
      enemyVillage: p.rivalVillages[1],
      enemyAvatar: '',
      enemyNature: p.natures[2],
      baseHp: 210,
      baseAttack: 34,
      baseSpeed: 15,
      baseXp: 168,
      baseChakraXp: 122,
      baseRyo: 630,
      baseMerit: 74,
      briefing: `Acompanhe o comboio contratado pelo posto administrativo de ${p.village} e repila emboscadas no trajeto.`,
    },
    {
      id: `${p.slug}_missao_c2`,
      assignedVillage: p.village,
      title: p.outpostC2,
      rank: 'C',
      minLevel: 3,
      enemyName: 'Batedor Especialista Kagerou-Jin',
      enemyClan: 'Kamizuru',
      enemyVillage: p.rivalVillages[2],
      enemyAvatar: '',
      enemyNature: p.natures[3],
      baseHp: 236,
      baseAttack: 38,
      baseSpeed: 16,
      baseXp: 196,
      baseChakraXp: 142,
      baseRyo: 730,
      baseMerit: 86,
      briefing: `Neutralize observadores hostis instalados próximo às rotas vitais de ${p.village}.`,
    },
    {
      id: `${p.slug}_missao_b1`,
      assignedVillage: p.village,
      title: p.intrigueB1,
      rank: 'B',
      minLevel: 4,
      enemyName: 'Agente Encoberto Kurokage',
      enemyClan: 'Fuuma',
      enemyVillage: p.rivalVillages[0],
      enemyAvatar: '',
      enemyNature: p.natures[0],
      baseHp: 295,
      baseAttack: 48,
      baseSpeed: 19,
      baseXp: 285,
      baseChakraXp: 200,
      baseRyo: 1160,
      baseMerit: 146,
      briefing: `Impeça o vazamento de documentos estratégicos de ${p.village} eliminando a célula infiltrada.`,
    },
    {
      id: `${p.slug}_missao_b2`,
      assignedVillage: p.village,
      title: p.convoyB2,
      rank: 'B',
      minLevel: 6,
      enemyName: 'Capitão Mercenário Renjou',
      enemyClan: 'Yotsuki',
      enemyVillage: p.rivalVillages[2],
      enemyAvatar: '',
      enemyNature: p.natures[1],
      baseHp: 348,
      baseAttack: 55,
      baseSpeed: 21,
      baseXp: 352,
      baseChakraXp: 245,
      baseRyo: 1405,
      baseMerit: 184,
      briefing: `Sustente a defesa tática dos recursos estratégicos de ${p.village} contra incursores veteranos.`,
    },
    {
      id: `${p.slug}_missao_a1`,
      assignedVillage: p.village,
      title: p.strongholdA1,
      rank: 'A',
      minLevel: 7,
      enemyName: 'Renegado Classe-A Shinobu-Kai',
      enemyClan: 'Hozuki',
      enemyVillage: p.village,
      enemyAvatar: '',
      enemyNature: p.natures[4],
      baseHp: 425,
      baseAttack: 66,
      baseSpeed: 25,
      baseXp: 488,
      baseChakraXp: 338,
      baseRyo: 2070,
      baseMerit: 270,
      briefing: `Cace um desertor perigoso procurado pelas autoridades de ${p.village} e recupere o equipamento confidencial.`,
    },
    {
      id: `${p.slug}_missao_a2`,
      assignedVillage: p.village,
      title: p.crisisA2,
      rank: 'A',
      minLevel: 9,
      enemyName: 'Comandante de Assalto Jinmu',
      enemyClan: 'Terumi',
      enemyVillage: p.rivalVillages[0],
      enemyAvatar: '',
      enemyNature: p.natures[3],
      baseHp: 480,
      baseAttack: 74,
      baseSpeed: 27,
      baseXp: 572,
      baseChakraXp: 398,
      baseRyo: 2540,
      baseMerit: 322,
      briefing: `Desarticule uma operação de sabotagem de alto risco direcionada às estruturas centrais de ${p.village}.`,
    },
    {
      id: `${p.slug}_missao_s1`,
      assignedVillage: p.village,
      title: p.cataclysmS1,
      rank: 'S',
      minLevel: 11,
      enemyName: 'Mestre Mercenário S-Rank Gennosuke',
      enemyClan: 'Chinoike',
      enemyVillage: p.rivalVillages[1],
      enemyAvatar: '',
      enemyNature: p.natures[4],
      baseHp: 605,
      baseAttack: 90,
      baseSpeed: 32,
      baseXp: 890,
      baseChakraXp: 605,
      baseRyo: 3960,
      baseMerit: 525,
      briefing: `Enfrente um veterano letal de nível Kage que ameaça o equilíbrio militar de ${p.village}.`,
    },
    {
      id: `${p.slug}_missao_s2`,
      assignedVillage: p.village,
      title: p.sovereigntyS2,
      rank: 'S',
      minLevel: 14,
      enemyName: 'Senhor da Guerra Renegado Takemitsu',
      enemyClan: 'Sem Clã (Independente)',
      enemyVillage: p.rivalVillages[2],
      enemyAvatar: '',
      enemyNature: p.natures[2],
      baseHp: 725,
      baseAttack: 104,
      baseSpeed: 35,
      baseXp: 1150,
      baseChakraXp: 780,
      baseRyo: 5340,
      baseMerit: 705,
      briefing: `Diretriz máxima emitida pela liderança de ${p.village}: elimine a ameaça soberana antes que rompa a última linha defensiva.`,
    },
  ];
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  ...GREAT_NATION_MISSIONS,
  ...MINOR_VILLAGE_MISSION_PROFILES.flatMap(buildMinorVillageMissions),
];

export function getMissionsForVillage(villageName: string): MissionTemplate[] {
  const normalized = (villageName || '').trim().toLowerCase();
  const matches = MISSION_TEMPLATES.filter(
    (m) => m.assignedVillage.toLowerCase() === normalized
  );
  if (matches.length > 0) return matches;
  return MISSION_TEMPLATES.filter((m) => m.assignedVillage === 'Konohagakure');
}

export function findMissionTemplateById(id?: string): MissionTemplate | undefined {
  if (!id) return undefined;
  return MISSION_TEMPLATES.find((m) => m.id === id);
}

export type ProfessionTier = 'Chunin' | 'Tokubetsu Jonin';

export interface ProfessionDef {
  id: string;
  name: string;
  minRank: NinjaRank;
  availableInTiers: ProfessionTier[];
  division: string;
  description: string;
  statBonuses: Partial<Record<AttributeKey, number>>;
  combatBonusSummary: string;
  accuracyBonus?: number;
  evasionBonus?: number;
  critBonus?: number;
  hpMultiplier?: number;
  chakraCostReduction?: number;
  secretBonus?: number;
  healBoost?: number;
}

export const PROFESSIONS: ProfessionDef[] = [
  {
    id: 'anbu',
    name: 'ANBU',
    minRank: 'Chunin',
    availableInTiers: ['Chunin'],
    division: 'Forças Especiais de Assassinato e Tática',
    description:
      'Operativo mascarado subordinado diretamente ao Kage, treinado em eliminação silenciosa, incursões noturnas e ações secretas letais.',
    statBonuses: { velocidade: 4, ninjutsu: 3, taijutsu: 2 },
    combatBonusSummary: '+4 Velocidade · +3 Ninjutsu · +2 Taijutsu · +8% Crítico · +15% eficácia em Ações Secretas',
    critBonus: 8,
    accuracyBonus: 5,
    secretBonus: 0.15,
  },
  {
    id: 'guarda_portao',
    name: 'Guarda do Portão',
    minRank: 'Chunin',
    availableInTiers: ['Chunin'],
    division: 'Segurança Perimetral & Portões da Vila',
    description:
      'Sentinela veterano responsável por triagem de visitantes, defesa das muralhas e interceptação imediata de invasores.',
    statBonuses: { resistencia: 5, forca: 3, taijutsu: 2 },
    combatBonusSummary: '+5 Resistência · +3 Força · +2 Taijutsu · +10% HP Máximo',
    hpMultiplier: 1.1,
    accuracyBonus: 4,
  },
  {
    id: 'sensei',
    name: 'Sensei',
    minRank: 'Chunin',
    availableInTiers: ['Chunin'],
    division: 'Instrutor de Esquadrão & Academia Avançada',
    description:
      'Líder tático encarregado de treinar times de Genins, coordenar formações e otimizar o gasto de chakra em campo.',
    statBonuses: { inteligencia: 4, controleChakra: 4, velocidade: 2 },
    combatBonusSummary: '+4 Inteligência · +4 Controle de Chakra · +2 Velocidade · -8% Custo de Chakra',
    chakraCostReduction: 0.08,
    accuracyBonus: 6,
  },
  {
    id: 'medico_ninja',
    name: 'Médico Ninja',
    minRank: 'Chunin',
    availableInTiers: ['Chunin', 'Tokubetsu Jonin'],
    division: 'Corpo Médico Hospitalar & Suporte de Campo',
    description:
      'Especialista em anatomia shinobi e Iryou Ninjutsu capaz de atuar desde a patente Chunin até o alto comando de Tokubetsu Jonin.',
    statBonuses: { controleChakra: 5, inteligencia: 4, resistencia: 2 },
    combatBonusSummary: '+5 Controle de Chakra · +4 Inteligência · +2 Resistência · +25% Poder de Cura/Iryou',
    healBoost: 0.25,
    chakraCostReduction: 0.05,
  },
  {
    id: 'interrogador',
    name: 'Interrogador',
    minRank: 'Tokubetsu Jonin',
    availableInTiers: ['Tokubetsu Jonin'],
    division: 'Divisão de Inteligência e Tortura Psicológica',
    description:
      'Tokubetsu Jonin perito em decodificação mental, leitura de microexpressões e quebra de resistência sob pressão psicológica.',
    statBonuses: { genjutsu: 6, inteligencia: 5, controleChakra: 3 },
    combatBonusSummary: '+6 Genjutsu · +5 Inteligência · +3 Controle de Chakra · +10% Precisão',
    accuracyBonus: 10,
    critBonus: 4,
  },
  {
    id: 'espiao',
    name: 'Espião',
    minRank: 'Tokubetsu Jonin',
    availableInTiers: ['Tokubetsu Jonin'],
    division: 'Rede de Infiltração & Contraespionagem',
    description:
      'Mestre em disfarces prolongados, coleta clandestina de pergaminhos e ataques surpresa executados sob fumaça ou fuligem.',
    statBonuses: { velocidade: 6, genjutsu: 4, inteligencia: 4 },
    combatBonusSummary: '+6 Velocidade · +4 Genjutsu · +4 Inteligência · +10% Esquiva · +25% dano em Ações Secretas',
    evasionBonus: 10,
    critBonus: 6,
    secretBonus: 0.25,
  },
  {
    id: 'rastreador',
    name: 'Rastreador',
    minRank: 'Tokubetsu Jonin',
    availableInTiers: ['Tokubetsu Jonin'],
    division: 'Esquadrão Oinin & Caça a Nukenins',
    description:
      'Especialista em leitura de assinaturas de chakra, emboscadas de precisão e perseguição implacável em terreno hostil.',
    statBonuses: { inteligencia: 6, velocidade: 5, ninjutsu: 3 },
    combatBonusSummary: '+6 Inteligência · +5 Velocidade · +3 Ninjutsu · +12% Precisão · +5% Crítico',
    accuracyBonus: 12,
    critBonus: 5,
  },
];

export interface NinjaWeaponCombatDef {
  id: string;
  itemId?: string;
  name: string;
  kind: 'melee_blade' | 'thrown_weapon' | 'smoke_bomb' | 'explosive_tag';
  nature?: ChakraNature | 'Neutro';
  minRange: number;
  maxRange: number;
  basePower: number;
  accuracyMod: number;
  critBonus: number;
  chakraCost: number;
  createsCloud?: 'smoke' | 'soot';
  cloudRadius?: number;
  appliesEffect?: StatusEffectType;
  knockbackTiles?: number;
  description: string;
}

export const STANDARD_NINJA_TOOLS: NinjaWeaponCombatDef[] = [
  {
    id: 'tool_kunai',
    itemId: 'kunai_tatica',
    name: 'Arremesso de Kunai',
    kind: 'thrown_weapon',
    minRange: 1,
    maxRange: 3,
    basePower: 26,
    accuracyMod: 10,
    critBonus: 8,
    chakraCost: 0,
    description: 'Ataque preciso com kunai ninja balanceada (alcance 1–3 casas no grid, 0 Chakra).',
  },
  {
    id: 'tool_shuriken_barrage',
    name: 'Rajada de Shurikens',
    kind: 'thrown_weapon',
    minRange: 2,
    maxRange: 4,
    basePower: 29,
    accuracyMod: 12,
    critBonus: 10,
    chakraCost: 0,
    appliesEffect: 'bleed',
    description: 'Leque múltiplo de shurikens de longo alcance (2–4 casas) capaz de causar Laceração.',
  },
  {
    id: 'tool_bomba_fumaca',
    name: 'Bomba de Fumaça (Kemuridama)',
    kind: 'smoke_bomb',
    minRange: 0,
    maxRange: 3,
    basePower: 0,
    accuracyMod: 100,
    critBonus: 0,
    chakraCost: 0,
    createsCloud: 'smoke',
    cloudRadius: 1,
    description:
      'Cobre uma área 3×3 do grid com fumaça espessa por 3 turnos, ocultando sua posição para preparar Ações Secretas (exceto contra Byakugan/Sharingan).',
  },
  {
    id: 'tool_papel_bomba',
    name: 'Papel Bomba (Kibaku Fuda)',
    kind: 'explosive_tag',
    minRange: 1,
    maxRange: 3,
    basePower: 40,
    accuracyMod: 6,
    critBonus: 12,
    chakraCost: 4,
    createsCloud: 'soot',
    cloudRadius: 1,
    appliesEffect: 'burn',
    description:
      'Detona selo explosivo no alvo (alcance 1–3), causando Queimadura e deixando Fuligem (3×3) no grid por 2 turnos.',
  },
];

export const EQUIPPED_WEAPON_PROFILES: Record<string, NinjaWeaponCombatDef> = {
  kunai_tatica: {
    id: 'wp_kunai_tatica',
    itemId: 'kunai_tatica',
    name: 'Golpe com Kunai Tática',
    kind: 'melee_blade',
    minRange: 1,
    maxRange: 2,
    basePower: 30,
    accuracyMod: 12,
    critBonus: 10,
    chakraCost: 0,
    description: 'Investida ágil com Kunai Tática Balanceada (alcance 1–2).',
  },
  shuriken_fuuma: {
    id: 'wp_shuriken_fuuma',
    itemId: 'shuriken_fuuma',
    name: 'Arremesso de Fuuma Shuriken Gigante',
    kind: 'thrown_weapon',
    minRange: 2,
    maxRange: 5,
    basePower: 44,
    accuracyMod: 8,
    critBonus: 14,
    chakraCost: 0,
    appliesEffect: 'bleed',
    description: 'Lâmina gigante de longo alcance (2–5 casas) com alto impacto cortante.',
  },
  kubikiribocho: {
    id: 'wp_kubikiribocho',
    itemId: 'kubikiribocho',
    name: 'Corte Brutal: Kubikiribocho',
    kind: 'melee_blade',
    minRange: 1,
    maxRange: 2,
    basePower: 52,
    accuracyMod: 4,
    critBonus: 14,
    chakraCost: 0,
    appliesEffect: 'bleed',
    knockbackTiles: 1,
    description: 'Golpe pesado da espada decapitadora (1–2 casas), aplica Laceração e empurra 1 casa.',
  },
  samehada: {
    id: 'wp_samehada',
    itemId: 'samehada',
    name: 'Dilaceração Devoradora: Samehada',
    kind: 'melee_blade',
    minRange: 1,
    maxRange: 2,
    basePower: 54,
    accuracyMod: 7,
    critBonus: 12,
    chakraCost: 0,
    appliesEffect: 'chakra_seal',
    description: 'Escamas cortantes que rasgam e drenam o chakra inimigo (alcance 1–2).',
  },
  nuibari: {
    id: 'wp_nuibari',
    itemId: 'nuibari',
    name: 'Costura Mortal: Nuibari',
    kind: 'melee_blade',
    minRange: 1,
    maxRange: 3,
    basePower: 50,
    accuracyMod: 14,
    critBonus: 16,
    chakraCost: 2,
    appliesEffect: 'paralysis',
    description: 'Perfuração cirúrgica à média distância (1–3 casas) que costura o alvo com fio de aço (Paralisia).',
  },
  kabutowari: {
    id: 'wp_kabutowari',
    itemId: 'kabutowari',
    name: 'Golpe Demolidor: Kabutowari',
    kind: 'melee_blade',
    minRange: 1,
    maxRange: 2,
    basePower: 58,
    accuracyMod: 2,
    critBonus: 12,
    chakraCost: 0,
    appliesEffect: 'crush',
    knockbackTiles: 1,
    description: 'Machado seguido do impacto do martelo (1–2 casas): aplica Esmagamento e arremessa 1 casa.',
  },
  shibuki: {
    id: 'wp_shibuki',
    itemId: 'shibuki',
    name: 'Corte Explosivo: Shibuki',
    kind: 'melee_blade',
    nature: 'Katon',
    minRange: 1,
    maxRange: 2,
    basePower: 56,
    accuracyMod: 6,
    critBonus: 15,
    chakraCost: 6,
    createsCloud: 'soot',
    cloudRadius: 1,
    appliesEffect: 'burn',
    description: 'Detona selos explosivos ao corte (1–2 casas), aplica Queimadura e cobre a área com Fuligem (2t).',
  },
  kiba: {
    id: 'wp_kiba',
    itemId: 'kiba',
    name: 'Presas Relâmpago: Kiba',
    kind: 'melee_blade',
    nature: 'Raiton',
    minRange: 1,
    maxRange: 3,
    basePower: 56,
    accuracyMod: 13,
    critBonus: 18,
    chakraCost: 8,
    appliesEffect: 'stun',
    description: 'Lâminas gêmeas Raiton (1–3 casas): amplifica dano contra alvos Encharcados e aplica Atordoamento.',
  },
  hiramekarei: {
    id: 'wp_hiramekarei',
    itemId: 'hiramekarei',
    name: 'Liberação Gêmea: Hiramekarei',
    kind: 'melee_blade',
    minRange: 1,
    maxRange: 3,
    basePower: 58,
    accuracyMod: 10,
    critBonus: 16,
    chakraCost: 8,
    appliesEffect: 'crush',
    knockbackTiles: 1,
    description: 'Expande o chakra armazenado em martelo/espada gigante (1–3 casas), aplica Esmagamento e recuo.',
  },
  kusanagi: {
    id: 'wp_kusanagi',
    itemId: 'kusanagi',
    name: 'Estocada Perfurante: Kusanagi',
    kind: 'melee_blade',
    nature: 'Raiton',
    minRange: 1,
    maxRange: 3,
    basePower: 56,
    accuracyMod: 14,
    critBonus: 18,
    chakraCost: 5,
    appliesEffect: 'stun',
    description: 'Lâmina condutora de alta velocidade com perfuração cirúrgica (alcance 1–3).',
  },
  laminas_chakra_asuma: {
    id: 'wp_laminas_chakra_asuma',
    itemId: 'laminas_chakra_asuma',
    name: 'Talho Hien: Lâminas de Chakra',
    kind: 'melee_blade',
    nature: 'Fuuton',
    minRange: 1,
    maxRange: 2,
    basePower: 50,
    accuracyMod: 15,
    critBonus: 17,
    chakraCost: 5,
    appliesEffect: 'bleed',
    description: 'Facas de trincheira imbuídas em Fuuton (1–2 casas) com corte estendido e Laceração.',
  },
};

export type DiplomaticStatus = 'allied' | 'enemy' | 'neutral';

export interface GeopoliticalRelation {
  pairKey: string;
  villageA: string;
  villageB: string;
  status: DiplomaticStatus;
  treatyTitle: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface GeopoliticalConflict {
  id: string;
  villageA: string;
  villageB: string;
  frontName: string;
  conflictType: string;
  intensity: number;
  summary: string;
  bonusRyoPct: number;
  active: boolean;
  startedAt: string;
}

export interface GeopoliticsWorldState {
  relations: Record<string, GeopoliticalRelation>;
  conflicts: GeopoliticalConflict[];
  updatedAt: string;
}

export const DEFAULT_GEOPOLITICAL_RELATIONS: Array<{
  villageA: string;
  villageB: string;
  status: DiplomaticStatus;
  treatyTitle: string;
}> = [
  // Alianças estratégicas
  { villageA: 'Konohagakure', villageB: 'Sunagakure', status: 'allied', treatyTitle: 'Pacto do Fogo e Vento' },
  { villageA: 'Konohagakure', villageB: 'Uzushiogakure', status: 'allied', treatyTitle: 'Laço Ancestral do Redemoinho' },
  { villageA: 'Konohagakure', villageB: 'País das Ondas', status: 'allied', treatyTitle: 'Tratado Comercial da Grande Ponte' },
  { villageA: 'Konohagakure', villageB: 'Takigakure', status: 'allied', treatyTitle: 'Acordo Fronteiriço das Cataratas' },
  { villageA: 'Sunagakure', villageB: 'País das Ondas', status: 'allied', treatyTitle: 'Rota Mercante Costeira' },
  { villageA: 'Kirigakure', villageB: 'Getsugakure', status: 'allied', treatyTitle: 'Convênio Marítimo do Leste' },
  { villageA: 'Iwagakure', villageB: 'Kusagakure', status: 'allied', treatyTitle: 'Corredor Logístico da Grama' },
  { villageA: 'Kumogakure', villageB: 'Shimogakure', status: 'allied', treatyTitle: 'Guarnição Conjunta do Norte' },
  { villageA: 'Kumogakure', villageB: 'Yugakure', status: 'allied', treatyTitle: ' Zona de Passagem das Termas' },
  { villageA: 'Yukigakure', villageB: 'País do Ferro', status: 'allied', treatyTitle: 'Acordo de Comércio Glacial' },
  // Rivalidades e Hostilidades Declaradas
  { villageA: 'Konohagakure', villageB: 'Otogakure', status: 'enemy', treatyTitle: 'Incursão nos Laboratórios de Fronteira' },
  { villageA: 'Konohagakure', villageB: 'Iwagakure', status: 'enemy', treatyTitle: 'Tensão Histórica da Ponte Kannabi' },
  { villageA: 'Konohagakure', villageB: 'Amegakure', status: 'enemy', treatyTitle: 'Bloqueio de Inteligência na Chuva' },
  { villageA: 'Sunagakure', villageB: 'Iwagakure', status: 'enemy', treatyTitle: 'Disputa dos Desfiladeiros Rochosos' },
  { villageA: 'Sunagakure', villageB: 'Otogakure', status: 'enemy', treatyTitle: 'Ruptura Pós-Sabotagem Diplomática' },
  { villageA: 'Kirigakure', villageB: 'Kumogakure', status: 'enemy', treatyTitle: 'Guerra Naval do Mar Oriental' },
  { villageA: 'Kirigakure', villageB: 'Iwagakure', status: 'enemy', treatyTitle: 'Emboscadas nas Ilhas Nebulosas' },
  { villageA: 'Kumogakure', villageB: 'Konohagakure', status: 'enemy', treatyTitle: 'Incidentes de Espionagem de Kekkei Genkai' },
  { villageA: 'Amegakure', villageB: 'Kusagakure', status: 'enemy', treatyTitle: 'Conflito de Escoamento Industrial' },
  { villageA: 'Amegakure', villageB: 'Tanigakure', status: 'enemy', treatyTitle: 'Contenção Militar nos Vales' },
  { villageA: 'Otogakure', villageB: 'Takigakure', status: 'enemy', treatyTitle: 'Caça Clandestina de Linhagens' },
  { villageA: 'Hoshigakure', villageB: 'Iwagakure', status: 'enemy', treatyTitle: 'Embargo do Meteorito Estelar' },
];

export const DEFAULT_GEOPOLITICAL_CONFLICTS: GeopoliticalConflict[] = [
  {
    id: 'conflict_konoha_oto',
    villageA: 'Konohagakure',
    villageB: 'Otogakure',
    frontName: 'Floresta Fronteiriça do Norte',
    conflictType: 'Incursão Tática & Sabotagem',
    intensity: 84,
    summary: 'Esquadrões de rastreio de Konoha interceptam células de Otogakure tentando erguer laboratórios avançados nos bosques limítrofes.',
    bonusRyoPct: 15,
    active: true,
    startedAt: 'Era Atual · Semana 14',
  },
  {
    id: 'conflict_suna_iwa',
    villageA: 'Sunagakure',
    villageB: 'Iwagakure',
    frontName: 'Desfiladeiro das Dunas Vermelhas',
    conflictType: 'Escaramuça de Fronteira',
    intensity: 76,
    summary: 'Brigadas de marionetistas de Suna e divisões Doton de Iwa disputam o controle das rotas minerais entre o Vento e a Terra.',
    bonusRyoPct: 15,
    active: true,
    startedAt: 'Era Atual · Semana 11',
  },
  {
    id: 'conflict_kiri_kumo',
    villageA: 'Kirigakure',
    villageB: 'Kumogakure',
    frontName: 'Estreito das Águas Tempestuosas',
    conflictType: 'Bloqueio Naval & Emboscada',
    intensity: 88,
    summary: 'Espadachins da Névoa e esquadrões Raiton de Kumo travam combates intensos sobre comboios marítimos sob tempestades elétricas.',
    bonusRyoPct: 15,
    active: true,
    startedAt: 'Era Atual · Semana 15',
  },
  {
    id: 'conflict_ame_kusa',
    villageA: 'Amegakure',
    villageB: 'Kusagakure',
    frontName: 'Viadutos Cinzentos da Chuva',
    conflictType: 'Guerra de Inteligência',
    intensity: 68,
    summary: 'Infiltradores de Kusagakure e sentinelas sensoriais de Amegakure chocam-se pelo domínio dos dutos subterrâneos entre as grandes nações.',
    bonusRyoPct: 15,
    active: true,
    startedAt: 'Era Atual · Semana 09',
  },
];

export type BijuuId =
  | 'shukaku'
  | 'matatabi'
  | 'isobu'
  | 'son_goku'
  | 'kokuo'
  | 'saiken'
  | 'chomei'
  | 'gyuki'
  | 'kurama';

export interface BijuuDef {
  id: BijuuId;
  tails: number;
  name: string;
  shortName: string;
  japaneseTitle: string;
  element: ChakraNature;
  originVillage: string;
  minRank: NinjaRank;
  minLevel: number;
  minChakraLevel: number;
  accentHex: string;
  imageUrl: string;
  passiveTrait: string;
  passiveStatBonuses: Partial<Record<AttributeKey, number>>;
  hpBonusPct: number;
  chakraBonusPct: number;
  cloakStatBonuses: Partial<Record<AttributeKey, number>>;
  cloakCritBonus: number;
  cloakAccuracyBonus: number;
  cloakEvasionBonus: number;
  cloakActivationChakra: number;
  cloakUpkeepChakra: number;
  bijuudamaName: string;
  bijuudamaPower: number;
  bijuudamaCost: number;
  trialBossHp: number;
  trialBossAttack: number;
  trialBossSpeed: number;
  loreSummary: string;
}

export const BIJUU_CATALOG: BijuuDef[] = [
  {
    id: 'shukaku',
    tails: 1,
    name: 'Shukaku (Ichibi — 1 Cauda)',
    shortName: 'Shukaku',
    japaneseTitle: 'Ichibi',
    element: 'Fuuton',
    originVillage: 'Sunagakure',
    minRank: 'Genin',
    minLevel: 3,
    minChakraLevel: 2,
    accentHex: '#D4A037',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/7/75/Shukaku_body.png/revision/latest/scale-to-width-down/800?cb=20150114175722',
    passiveTrait: 'Escudo natural de areia, selos amaldiçoados e rajadas Fuuton de alta pressão.',
    passiveStatBonuses: { controleChakra: 3, resistencia: 3, ninjutsu: 2 },
    hpBonusPct: 10,
    chakraBonusPct: 16,
    cloakStatBonuses: { ninjutsu: 5, resistencia: 6, forca: 4 },
    cloakCritBonus: 5,
    cloakAccuracyBonus: 5,
    cloakEvasionBonus: 4,
    cloakActivationChakra: 28,
    cloakUpkeepChakra: 9,
    bijuudamaName: 'Fuuton: Renkuudan (Esfera de Ar de Shukaku)',
    bijuudamaPower: 76,
    bijuudamaCost: 34,
    trialBossHp: 320,
    trialBossAttack: 42,
    trialBossSpeed: 17,
    loreSummary: 'Besta de uma cauda feita de areia condensada com marcas naturais de selamento.',
  },
  {
    id: 'matatabi',
    tails: 2,
    name: 'Matatabi (Nibi — 2 Caudas)',
    shortName: 'Matatabi',
    japaneseTitle: 'Nibi',
    element: 'Katon',
    originVillage: 'Kumogakure',
    minRank: 'Genin',
    minLevel: 3,
    minChakraLevel: 2,
    accentHex: '#38BDF8',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/a/a7/Matatabi.png/revision/latest/scale-to-width-down/800?cb=20150215123215',
    passiveTrait: 'Chamas azuis etéreas e agilidade felina avassaladora em combate.',
    passiveStatBonuses: { velocidade: 4, ninjutsu: 3, taijutsu: 2 },
    hpBonusPct: 10,
    chakraBonusPct: 18,
    cloakStatBonuses: { velocidade: 7, ninjutsu: 5, taijutsu: 5 },
    cloakCritBonus: 7,
    cloakAccuracyBonus: 6,
    cloakEvasionBonus: 7,
    cloakActivationChakra: 30,
    cloakUpkeepChakra: 10,
    bijuudamaName: 'Katon: Névoa Azul Felina (Bijuudama)',
    bijuudamaPower: 80,
    bijuudamaCost: 36,
    trialBossHp: 350,
    trialBossAttack: 45,
    trialBossSpeed: 21,
    loreSummary: 'Gato espectral envolto em chakra azul flamejante da Vila da Nuvem.',
  },
  {
    id: 'isobu',
    tails: 3,
    name: 'Isobu (Sanbi — 3 Caudas)',
    shortName: 'Isobu',
    japaneseTitle: 'Sanbi',
    element: 'Suiton',
    originVillage: 'Kirigakure',
    minRank: 'Genin',
    minLevel: 4,
    minChakraLevel: 2,
    accentHex: '#3B82A6',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/5/55/Isobu.png/revision/latest/scale-to-width-down/800?cb=20150216140119',
    passiveTrait: 'Carapaça blindada de coral, névoa ilusória e domínio absoluto de Suiton.',
    passiveStatBonuses: { resistencia: 5, controleChakra: 3, genjutsu: 2 },
    hpBonusPct: 14,
    chakraBonusPct: 18,
    cloakStatBonuses: { resistencia: 8, ninjutsu: 5, controleChakra: 4 },
    cloakCritBonus: 5,
    cloakAccuracyBonus: 5,
    cloakEvasionBonus: 5,
    cloakActivationChakra: 32,
    cloakUpkeepChakra: 10,
    bijuudamaName: 'Suiton: Maré Coral Bijuudama',
    bijuudamaPower: 84,
    bijuudamaCost: 38,
    trialBossHp: 390,
    trialBossAttack: 47,
    trialBossSpeed: 18,
    loreSummary: 'Tartaruga colossal de três caudas associada às águas densas de Kirigakure.',
  },
  {
    id: 'son_goku',
    tails: 4,
    name: 'Son Goku (Yonbi — 4 Caudas)',
    shortName: 'Son Goku',
    japaneseTitle: 'Yonbi',
    element: 'Katon',
    originVillage: 'Iwagakure',
    minRank: 'Chunin',
    minLevel: 5,
    minChakraLevel: 3,
    accentHex: '#EF4444',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/32/Son_Gok%C5%AB.png/revision/latest/scale-to-width-down/800?cb=20150214203121',
    passiveTrait: 'Chakra vulcânico Youton e força bruta sísmica em Taijutsu e Ninjutsu.',
    passiveStatBonuses: { forca: 4, ninjutsu: 4, taijutsu: 3 },
    hpBonusPct: 14,
    chakraBonusPct: 20,
    cloakStatBonuses: { forca: 7, ninjutsu: 7, taijutsu: 5 },
    cloakCritBonus: 7,
    cloakAccuracyBonus: 6,
    cloakEvasionBonus: 4,
    cloakActivationChakra: 34,
    cloakUpkeepChakra: 11,
    bijuudamaName: 'Youton: Montanha Incandescente (Bijuudama)',
    bijuudamaPower: 88,
    bijuudamaCost: 40,
    trialBossHp: 430,
    trialBossAttack: 52,
    trialBossSpeed: 20,
    loreSummary: 'Rei Sábio Macaco guardião do estilo Lava de Iwagakure.',
  },
  {
    id: 'kokuo',
    tails: 5,
    name: 'Kokuo (Gobi — 5 Caudas)',
    shortName: 'Kokuo',
    japaneseTitle: 'Gobi',
    element: 'Suiton',
    originVillage: 'Iwagakure',
    minRank: 'Chunin',
    minLevel: 5,
    minChakraLevel: 3,
    accentHex: '#E2E8F0',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/6/63/Koku%C5%8D.png/revision/latest/scale-to-width-down/800?cb=20150226115215',
    passiveTrait: 'Chakra de Vapor (Futton) que ferve músculos e acelera investidas físicas.',
    passiveStatBonuses: { velocidade: 4, taijutsu: 4, controleChakra: 3 },
    hpBonusPct: 15,
    chakraBonusPct: 22,
    cloakStatBonuses: { velocidade: 8, taijutsu: 7, forca: 6 },
    cloakCritBonus: 8,
    cloakAccuracyBonus: 7,
    cloakEvasionBonus: 6,
    cloakActivationChakra: 36,
    cloakUpkeepChakra: 11,
    bijuudamaName: 'Futton: Disparo de Vapor Incomparável',
    bijuudamaPower: 91,
    bijuudamaCost: 41,
    trialBossHp: 455,
    trialBossAttack: 54,
    trialBossSpeed: 24,
    loreSummary: 'Besta equina branca capaz de elevar o chakra à pressão de ebulição instantânea.',
  },
  {
    id: 'saiken',
    tails: 6,
    name: 'Saiken (Rokubi — 6 Caudas)',
    shortName: 'Saiken',
    japaneseTitle: 'Rokubi',
    element: 'Suiton',
    originVillage: 'Kirigakure',
    minRank: 'Chunin',
    minLevel: 6,
    minChakraLevel: 3,
    accentHex: '#A78BFA',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/0/07/Saiken.png/revision/latest/scale-to-width-down/800?cb=20150215123215',
    passiveTrait: 'Secreções ácidas corrosivas e viscosidade defensiva de alta absorção.',
    passiveStatBonuses: { controleChakra: 5, ninjutsu: 4, resistencia: 3 },
    hpBonusPct: 16,
    chakraBonusPct: 24,
    cloakStatBonuses: { controleChakra: 8, ninjutsu: 7, resistencia: 6 },
    cloakCritBonus: 6,
    cloakAccuracyBonus: 7,
    cloakEvasionBonus: 6,
    cloakActivationChakra: 38,
    cloakUpkeepChakra: 12,
    bijuudamaName: 'Suiton: Bolha Corrosiva Bijuudama',
    bijuudamaPower: 94,
    bijuudamaCost: 42,
    trialBossHp: 480,
    trialBossAttack: 56,
    trialBossSpeed: 21,
    loreSummary: 'Lesma alcalina de seis caudas envolta em névoa corrosiva.',
  },
  {
    id: 'chomei',
    tails: 7,
    name: 'Chomei (Nanabi — 7 Caudas)',
    shortName: 'Chomei',
    japaneseTitle: 'Nanabi',
    element: 'Fuuton',
    originVillage: 'Takigakure',
    minRank: 'Chunin',
    minLevel: 6,
    minChakraLevel: 3,
    accentHex: '#22C55E',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/a/af/Ch%C5%8Dmei.png/revision/latest/scale-to-width-down/800?cb=20150215123214',
    passiveTrait: 'Asas de chakra cintilantes, pó ofuscante e manobras aéreas em velocidade máxima.',
    passiveStatBonuses: { velocidade: 5, genjutsu: 4, ninjutsu: 4 },
    hpBonusPct: 16,
    chakraBonusPct: 26,
    cloakStatBonuses: { velocidade: 9, ninjutsu: 7, genjutsu: 6 },
    cloakCritBonus: 8,
    cloakAccuracyBonus: 8,
    cloakEvasionBonus: 9,
    cloakActivationChakra: 40,
    cloakUpkeepChakra: 12,
    bijuudamaName: 'Fuuton: Pó Estelar & Bijuudama',
    bijuudamaPower: 97,
    bijuudamaCost: 44,
    trialBossHp: 510,
    trialBossAttack: 59,
    trialBossSpeed: 26,
    loreSummary: 'Besouro rinoceronte alado de Takigakure mestre em camuflagem e pó brilhante.',
  },
  {
    id: 'gyuki',
    tails: 8,
    name: 'Gyuki (Hachibi — 8 Caudas)',
    shortName: 'Gyuki',
    japaneseTitle: 'Hachibi',
    element: 'Raiton',
    originVillage: 'Kumogakure',
    minRank: 'Chunin',
    minLevel: 7,
    minChakraLevel: 4,
    accentHex: '#F59E0B',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/2/25/Gy%C5%ABki.png/revision/latest/scale-to-width-down/800?cb=20150215123213',
    passiveTrait: 'Simbiose perfeita para quebrar Genjutsus e impacto brutal de Nintaijutsu.',
    passiveStatBonuses: { taijutsu: 5, forca: 5, controleChakra: 5 },
    hpBonusPct: 20,
    chakraBonusPct: 28,
    cloakStatBonuses: { taijutsu: 9, forca: 9, controleChakra: 7, velocidade: 7 },
    cloakCritBonus: 9,
    cloakAccuracyBonus: 9,
    cloakEvasionBonus: 7,
    cloakActivationChakra: 42,
    cloakUpkeepChakra: 13,
    bijuudamaName: 'Lariat & Bijuudama Contínua de Gyuki',
    bijuudamaPower: 104,
    bijuudamaCost: 46,
    trialBossHp: 560,
    trialBossAttack: 65,
    trialBossSpeed: 25,
    loreSummary: 'Ushi-oni colossal de oito caudas guardião histórico de Kumogakure.',
  },
  {
    id: 'kurama',
    tails: 9,
    name: 'Kurama (Kyubi — 9 Caudas)',
    shortName: 'Kurama',
    japaneseTitle: 'Kyubi',
    element: 'Katon',
    originVillage: 'Konohagakure',
    minRank: 'Chunin',
    minLevel: 8,
    minChakraLevel: 4,
    accentHex: '#DC2626',
    imageUrl: 'https://static.wikia.nocookie.net/naruto/images/3/3a/Kurama.png/revision/latest/scale-to-width-down/800?cb=20150214174805',
    passiveTrait: 'Reservas quase infinitas de chakra Yang/Katon, percepção de intenção hostil e regeneração acelerada.',
    passiveStatBonuses: { controleChakra: 6, ninjutsu: 6, resistencia: 5, velocidade: 4 },
    hpBonusPct: 24,
    chakraBonusPct: 35,
    cloakStatBonuses: { ninjutsu: 11, taijutsu: 9, velocidade: 9, forca: 8, controleChakra: 8 },
    cloakCritBonus: 11,
    cloakAccuracyBonus: 10,
    cloakEvasionBonus: 9,
    cloakActivationChakra: 46,
    cloakUpkeepChakra: 14,
    bijuudamaName: 'Bijuudama Suprema da Raposa de Nove Caudas',
    bijuudamaPower: 114,
    bijuudamaCost: 50,
    trialBossHp: 640,
    trialBossAttack: 74,
    trialBossSpeed: 28,
    loreSummary: 'A mais poderosa das nove Bestas com Cauda, detentora de reservas colossais de chakra.',
  },
];



