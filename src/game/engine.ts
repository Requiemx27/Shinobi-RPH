import {
  AttributeKey,
  CLANS,
  ClanMechanicBonus,
  CREATION_KEKKEI_GENKAI_LIST,
  ChakraNature,
  DEFAULT_GEOPOLITICAL_CONFLICTS,
  DEFAULT_GEOPOLITICAL_RELATIONS,
  DiplomaticStatus,
  GeopoliticalConflict,
  GeopoliticalRelation,
  GeopoliticsWorldState,
  ITEM_CATALOG,
  ItemDef,
  JutsuDef,
  JutsuEffectSpec,
  MISSION_TEMPLATES,
  MissionTemplate,
  VILLAGES,
  VillageInfo,
  findMissionTemplateById,
  getMissionsForVillage,
  NINJA_RANKS,
  NinjaRank,
  PROFESSIONS,
  ProfessionDef,
  SHARINGAN_EVOLUTION_STAGES,
  SharinganStageDef,
  SPECIALIZATIONS,
  STATUS_EFFECT_META,
  StatusEffectType,
  SUMMON_QUESTS,
  SummonQuestDef,
  SPECIAL_JUTSU_QUESTS,
  JutsuQuestDef,
  BIJUU_CATALOG,
  BijuuDef,
  BijuuId,
  SEVEN_MIST_SWORD_IDS,
} from './narutoData.ts';

export type MissionRank = 'D' | 'C' | 'B' | 'A' | 'S';

export interface MissionRankCounts {
  D: number;
  C: number;
  B: number;
  A: number;
  S: number;
}

export interface CharacterModel {
  id: number;
  userUid: string;
  name: string;
  avatarUrl: string;
  country: string;
  village: string;
  clan: string;
  specialization: string;
  chakraNature: ChakraNature | string;
  secondaryChakraNature?: ChakraNature | string;
  kekkeiGenkai: string;
  summonContract: string;
  rank: NinjaRank | string;
  profession?: string;
  isKage: boolean;
  jinchuurikiBijuuId?: string | null;
  bijuuMastery?: number;
  level: number;
  xp: number;
  chakraLevel: number;
  chakraXp: number;
  ryo: number;
  meritPoints: number;
  statPoints: number;
  hp: number;
  maxHp: number;
  chakra: number;
  maxChakra: number;
  stamina?: number;
  maxStamina?: number;
  staminaUpdatedAt?: string | Date | null;
  leftEyeBlindness?: number;
  rightEyeBlindness?: number;
  ninjutsu: number;
  taijutsu: number;
  genjutsu: number;
  velocidade: number;
  forca: number;
  inteligencia: number;
  resistencia: number;
  controleChakra: number;
  learnedJutsus: string[];
  equippedGear: Record<string, string | null>;
  inventory: Array<{ itemId: string; qty: number }>;
  missionsCompleted: number;
  missionCountsByRank?: MissionRankCounts;
  wins: number;
  losses: number;
  lastDailyRewardDate?: string | null;
  dailyLoginStreak?: number;
  bio: string;
}

export interface EffectiveStats {
  ninjutsu: number;
  taijutsu: number;
  genjutsu: number;
  velocidade: number;
  forca: number;
  inteligencia: number;
  resistencia: number;
  controleChakra: number;
  maxHp: number;
  maxChakra: number;
  chakraEfficiency: number;
  accuracyBonus?: number;
  evasionBonus?: number;
  critBonus?: number;
  chakraCostReduction?: number;
  natureBonuses?: Record<string, number>;
  categoryBonuses?: Record<string, number>;
  healBoost?: number;
  secretBonus?: number;
  bijuuActiveId?: string | null;
  bijuuCloakActive?: boolean;
}

export interface ActiveStatusEffect {
  type: StatusEffectType;
  label: string;
  turnsRemaining: number;
  potency: number;
  sourceName?: string;
}

export interface AppliedEffectOutcome {
  type: StatusEffectType;
  label: string;
  target: 'enemy' | 'self';
  duration: number;
  potency: number;
}

export type ElementalRelation = 'advantage' | 'disadvantage' | 'neutral';

export interface ElementalAffinityMeta {
  nature: ChakraNature;
  shortLabel: string;
  displayLabel: string;
  strongAgainst: ChakraNature;
  weakAgainst: ChakraNature;
  tone: 'fire' | 'water' | 'lightning' | 'earth' | 'wind';
}

export interface ElementalAffinityBreakdown {
  attackElement: ChakraNature | null;
  defenderElement: ChakraNature | null;
  defenderSecondaryElement: ChakraNature | null;
  relation: ElementalRelation;
  elementalMultiplier: number;
  affinityResonanceMultiplier: number;
  combinedMultiplier: number;
  relationLabel: string;
  affinityLabel: string | null;
}

export interface CombatCalculationOptions {
  attackerStatuses?: ActiveStatusEffect[];
  defenderStatuses?: ActiveStatusEffect[];
  attackerClan?: string;
  attackerKekkei?: string;
  attackerSecondaryNature?: ChakraNature | string;
  defenderSecondaryNature?: ChakraNature | string;
  sharinganActive?: boolean;
}

export interface EffectRollLog {
  type: StatusEffectType;
  label: string;
  target: 'enemy' | 'self';
  chance: number;
  rolled: number;
  applied: boolean;
  duration: number;
}

export interface CombatCalculationResult {
  hitChance: number;
  rolled: number;
  isHit: boolean;
  isEvaded: boolean;
  isCrit: boolean;
  critChance: number;
  critRolled: number;
  damage: number;
  healing: number;
  elementalMultiplier: number;
  affinityMultiplier: number;
  clanDamageMultiplier: number;
  elementalRelation: ElementalRelation;
  elementalBreakdown: ElementalAffinityBreakdown;
  appliedEffects: AppliedEffectOutcome[];
  effectRolls: EffectRollLog[];
  synergyNotes: string[];
  formulaSummary: string;
}

export interface WarMissionMeta {
  isWarMission: true;
  conflictId: string;
  frontName: string;
  conflictType: string;
  intensity: number;
  belligerentA: string;
  belligerentB: string;
  opposingVillage: string;
  alliedSideVillage: string;
  participationRole: 'belligerent' | 'ally' | 'border_containment';
  warBonusRyoPct: number;
  warBonusMeritPct: number;
}

export interface ScaledMission extends MissionTemplate {
  scaledHp: number;
  scaledAttack: number;
  scaledSpeed: number;
  rewardXp: number;
  rewardChakraXp: number;
  rewardRyo: number;
  rewardMerit: number;
  difficultyScale: number;
  staminaCost?: number;
  warMeta?: WarMissionMeta;
}

export function xpRequiredForLevel(level: number): number {
  return Math.round(120 * Math.pow(Math.max(1, level), 1.35));
}

export function chakraXpRequiredForLevel(chakraLevel: number): number {
  return Math.round(90 * Math.pow(Math.max(1, chakraLevel), 1.3));
}

export const ELEMENTAL_AFFINITY_CYCLE: Record<ChakraNature, ElementalAffinityMeta> = {
  Katon: {
    nature: 'Katon',
    shortLabel: 'Katon',
    displayLabel: 'Katon (Fogo)',
    strongAgainst: 'Fuuton',
    weakAgainst: 'Suiton',
    tone: 'fire',
  },
  Fuuton: {
    nature: 'Fuuton',
    shortLabel: 'Futon',
    displayLabel: 'Futon (Vento)',
    strongAgainst: 'Raiton',
    weakAgainst: 'Katon',
    tone: 'wind',
  },
  Raiton: {
    nature: 'Raiton',
    shortLabel: 'Raiton',
    displayLabel: 'Raiton (Relâmpago)',
    strongAgainst: 'Doton',
    weakAgainst: 'Fuuton',
    tone: 'lightning',
  },
  Doton: {
    nature: 'Doton',
    shortLabel: 'Doton',
    displayLabel: 'Doton (Terra)',
    strongAgainst: 'Suiton',
    weakAgainst: 'Raiton',
    tone: 'earth',
  },
  Suiton: {
    nature: 'Suiton',
    shortLabel: 'Suiton',
    displayLabel: 'Suiton (Água)',
    strongAgainst: 'Katon',
    weakAgainst: 'Doton',
    tone: 'water',
  },
};

export const FIVE_ELEMENTAL_AFFINITIES: ChakraNature[] = [
  'Katon',
  'Fuuton',
  'Raiton',
  'Doton',
  'Suiton',
];

export function normalizeElementalNature(raw?: ChakraNature | string | null): ChakraNature | null {
  if (!raw) return null;
  const normalized = String(raw).trim().toLowerCase();
  if (normalized === 'katon') return 'Katon';
  if (normalized === 'suiton') return 'Suiton';
  if (normalized === 'raiton') return 'Raiton';
  if (normalized === 'doton') return 'Doton';
  if (normalized === 'fuuton' || normalized === 'futon') return 'Fuuton';
  return null;
}

export function formatElementalLabel(raw?: ChakraNature | string | null): string {
  const canonical = normalizeElementalNature(raw);
  if (canonical) return ELEMENTAL_AFFINITY_CYCLE[canonical].shortLabel;
  return raw ? String(raw) : 'Neutro';
}

export function getElementalCounterFor(defenderNature?: ChakraNature | string | null): ChakraNature | null {
  const canonical = normalizeElementalNature(defenderNature);
  if (!canonical) return null;
  return ELEMENTAL_AFFINITY_CYCLE[canonical].weakAgainst;
}

export function getElementalMultiplier(
  attackNature: ChakraNature | string,
  defenderNature: ChakraNature | string,
  defenderSecondaryNature?: ChakraNature | string | null
): number {
  const atk = normalizeElementalNature(attackNature);
  const defPrimary = normalizeElementalNature(defenderNature);
  if (!atk || !defPrimary) return 1.0;

  const atkMeta = ELEMENTAL_AFFINITY_CYCLE[atk];
  let mult = 1.0;
  if (atkMeta.strongAgainst === defPrimary) {
    mult = 1.25;
  } else if (atkMeta.weakAgainst === defPrimary) {
    mult = 0.85;
  }

  const defSecondary = normalizeElementalNature(defenderSecondaryNature);
  if (defSecondary && defSecondary !== defPrimary) {
    if (atkMeta.strongAgainst === defSecondary) {
      mult *= 1.12;
    } else if (atkMeta.weakAgainst === defSecondary) {
      mult *= 0.9;
    }
  }

  return Number(mult.toFixed(2));
}

export function evaluateElementalAffinity(params: {
  attackNature?: ChakraNature | string | null;
  attackerPrimaryNature?: ChakraNature | string | null;
  attackerSecondaryNature?: ChakraNature | string | null;
  defenderPrimaryNature?: ChakraNature | string | null;
  defenderSecondaryNature?: ChakraNature | string | null;
}): ElementalAffinityBreakdown {
  const attackElement = normalizeElementalNature(params.attackNature);
  const defenderElement = normalizeElementalNature(params.defenderPrimaryNature);
  const rawDefSecondary = normalizeElementalNature(params.defenderSecondaryNature);
  const defenderSecondaryElement =
    rawDefSecondary && rawDefSecondary !== defenderElement ? rawDefSecondary : null;

  if (!attackElement) {
    return {
      attackElement: null,
      defenderElement,
      defenderSecondaryElement,
      relation: 'neutral',
      elementalMultiplier: 1.0,
      affinityResonanceMultiplier: 1.0,
      combinedMultiplier: 1.0,
      relationLabel: 'Técnica Não-Elemental (×1.00)',
      affinityLabel: null,
    };
  }

  const elementalMultiplier = getElementalMultiplier(
    attackElement,
    defenderElement || 'Neutro',
    defenderSecondaryElement
  );

  const relation: ElementalRelation =
    elementalMultiplier > 1.0
      ? 'advantage'
      : elementalMultiplier < 1.0
      ? 'disadvantage'
      : 'neutral';

  const atkPrimary = normalizeElementalNature(params.attackerPrimaryNature);
  const atkSecondary = normalizeElementalNature(params.attackerSecondaryNature);

  let affinityResonanceMultiplier = 1.0;
  let affinityLabel: string | null = null;
  const atkShort = ELEMENTAL_AFFINITY_CYCLE[attackElement].shortLabel;

  if (atkPrimary && attackElement === atkPrimary) {
    affinityResonanceMultiplier = 1.1;
    affinityLabel = `Afinidade Primária ${atkShort} (+10% Dano)`;
  } else if (atkSecondary && attackElement === atkSecondary) {
    affinityResonanceMultiplier = 1.05;
    affinityLabel = `2ª Afinidade ${atkShort} (+5% Dano)`;
  }

  const defShort = defenderElement
    ? ELEMENTAL_AFFINITY_CYCLE[defenderElement].shortLabel +
      (defenderSecondaryElement
        ? `/${ELEMENTAL_AFFINITY_CYCLE[defenderSecondaryElement].shortLabel}`
        : '')
    : 'Neutro';

  const relationLabel =
    relation === 'advantage'
      ? `Vantagem Elemental: ${atkShort} supera ${defShort} (×${elementalMultiplier.toFixed(2)})`
      : relation === 'disadvantage'
      ? `Desvantagem Elemental: ${atkShort} cede a ${defShort} (×${elementalMultiplier.toFixed(2)})`
      : `Equilíbrio Elemental: ${atkShort} vs ${defShort} (×1.00)`;

  return {
    attackElement,
    defenderElement,
    defenderSecondaryElement,
    relation,
    elementalMultiplier,
    affinityResonanceMultiplier,
    combinedMultiplier: Number((elementalMultiplier * affinityResonanceMultiplier).toFixed(2)),
    relationLabel,
    affinityLabel,
  };
}

export interface EffectiveStatsOptions {
  inCombat?: boolean;
  sharinganActive?: boolean;
  bijuuCloakActive?: boolean;
}

export function calculateEffectiveStats(
  char: CharacterModel,
  options?: EffectiveStatsOptions
): EffectiveStats {
  const base: Record<AttributeKey, number> = {
    ninjutsu: char.ninjutsu,
    taijutsu: char.taijutsu,
    genjutsu: char.genjutsu,
    velocidade: char.velocidade,
    forca: char.forca,
    inteligencia: char.inteligencia,
    resistencia: char.resistencia,
    controleChakra: char.controleChakra,
  };

  let hpMult = 1;
  let chakraMult = 1;
  let accuracyBonus = 0;
  let evasionBonus = 0;
  let critBonus = 0;
  let chakraCostReduction = 0;
  const natureBonuses: Record<string, number> = {};
  const categoryBonuses: Record<string, number> = {};

  const clan = CLANS.find((c) => c.name === char.clan || c.id === char.clan);
  if (clan) {
    for (const [k, val] of Object.entries(clan.bonuses)) {
      if (val) base[k as AttributeKey] += val;
    }
    for (const bonus of clan.twoBonuses) {
      const fx = bonus.combatEffect;
      if (!fx) continue;
      if (fx.hpMultiplier) hpMult *= fx.hpMultiplier;
      if (fx.chakraMultiplier) chakraMult *= fx.chakraMultiplier;
      if (fx.accuracyBonus) accuracyBonus += fx.accuracyBonus;
      if (fx.evasionBonus) evasionBonus += fx.evasionBonus;
      if (fx.critBonus) critBonus += fx.critBonus;
      if (fx.chakraCostReduction) chakraCostReduction += fx.chakraCostReduction;
      if (fx.natureBonus) {
        natureBonuses[fx.natureBonus.nature] =
          (natureBonuses[fx.natureBonus.nature] || 1) * fx.natureBonus.damageMult;
      }
      if (fx.categoryBonus) {
        categoryBonuses[fx.categoryBonus.category] =
          (categoryBonuses[fx.categoryBonus.category] || 1) * fx.categoryBonus.damageMult;
      }
    }
  }

  const spec = SPECIALIZATIONS.find(
    (s) => s.name === char.specialization || s.id === char.specialization
  );
  if (spec) {
    for (const [k, val] of Object.entries(spec.bonuses)) {
      if (val) base[k as AttributeKey] += val;
    }
  }

  let healBoost = 0;
  let secretBonus = 0;
  const profName = char.profession || 'Nenhuma';
  const prof = PROFESSIONS.find((p) => p.name === profName || p.id === profName);
  if (prof) {
    for (const [k, val] of Object.entries(prof.statBonuses)) {
      if (val) base[k as AttributeKey] += val;
    }
    if (prof.hpMultiplier) hpMult *= prof.hpMultiplier;
    if (prof.accuracyBonus) accuracyBonus += prof.accuracyBonus;
    if (prof.evasionBonus) evasionBonus += prof.evasionBonus;
    if (prof.critBonus) critBonus += prof.critBonus;
    if (prof.chakraCostReduction) chakraCostReduction += prof.chakraCostReduction;
    if (prof.healBoost) healBoost += prof.healBoost;
    if (prof.secretBonus) secretBonus += prof.secretBonus;
  }

  const ocular = getOcularState(char);
  const sharinganStageForStats = getSharinganStageForStats(char.kekkeiGenkai, char.clan);

  if (
    sharinganStageForStats !== 0 &&
    !ocular.bothBlind &&
    (options?.inCombat ? Boolean(options.sharinganActive) : true)
  ) {
    const stageDef = getSharinganStageDef(sharinganStageForStats);
    for (const [k, val] of Object.entries(stageDef.statBonuses)) {
      if (val) base[k as AttributeKey] += val;
    }
    if (stageDef.accuracyBonus) accuracyBonus += stageDef.accuracyBonus;
    if (stageDef.evasionBonus) evasionBonus += stageDef.evasionBonus;
    if (stageDef.critBonus) critBonus += stageDef.critBonus;
    if (stageDef.chakraCostReduction) chakraCostReduction += stageDef.chakraCostReduction;
    if (stageDef.genjutsuDamageMult > 1) {
      categoryBonuses['Genjutsu'] =
        Number(((categoryBonuses['Genjutsu'] || 1) * stageDef.genjutsuDamageMult).toFixed(3));
    }
    if (stageDef.kekkeiDamageMult > 1) {
      categoryBonuses['Kekkei Genkai'] =
        Number(((categoryBonuses['Kekkei Genkai'] || 1) * stageDef.kekkeiDamageMult).toFixed(3));
    }
  }

  if (ocular.accuracyPenalty > 0) {
    accuracyBonus -= ocular.accuracyPenalty;
  }
  if (ocular.evasionPenalty > 0) {
    evasionBonus -= ocular.evasionPenalty;
  }

  const gearSlots = Object.values(char.equippedGear || {});
  for (const itemId of gearSlots) {
    if (!itemId) continue;
    const item = ITEM_CATALOG.find((i) => i.id === itemId);
    if (!item) continue;
    for (const [k, val] of Object.entries(item.statBonuses)) {
      if (val) base[k as AttributeKey] += val;
    }
  }

  // Jinchuuriki / Bijuu Passive Synergy + Combat Manto da Bijuu Cloak
  const sealedBijuu = getBijuuById(char.jinchuurikiBijuuId);
  const bijuuCloakOn = Boolean(sealedBijuu && options?.inCombat && options?.bijuuCloakActive);
  if (sealedBijuu) {
    const mastery = Math.max(0, Math.min(100, char.bijuuMastery ?? 0));
    const passiveScale = 1 + mastery / 250;
    for (const [k, val] of Object.entries(sealedBijuu.passiveStatBonuses)) {
      if (val) base[k as AttributeKey] += Math.round(val * passiveScale);
    }
    const extraHpPct = sealedBijuu.hpBonusPct + Math.floor(mastery / 10);
    const extraChPct = sealedBijuu.chakraBonusPct + Math.floor(mastery / 6);
    hpMult *= 1 + extraHpPct / 100;
    chakraMult *= 1 + extraChPct / 100;

    if (bijuuCloakOn) {
      const cloakScale = 1 + mastery / 200;
      for (const [k, val] of Object.entries(sealedBijuu.cloakStatBonuses)) {
        if (val) base[k as AttributeKey] += Math.round(val * cloakScale);
      }
      accuracyBonus += Math.round(sealedBijuu.cloakAccuracyBonus * cloakScale);
      evasionBonus += Math.round(sealedBijuu.cloakEvasionBonus * cloakScale);
      critBonus += Math.round(sealedBijuu.cloakCritBonus * cloakScale);
      categoryBonuses['Ninjutsu'] = Number(
        ((categoryBonuses['Ninjutsu'] || 1) * (1.12 + mastery * 0.001)).toFixed(3)
      );
    }
  }

  const chakraBonusFactor = 1 + (Math.max(1, char.chakraLevel) - 1) * 0.08;
  const maxHp = Math.round((120 + base.resistencia * 7 + char.level * 18) * hpMult);
  const maxChakra = Math.round(
    (100 + base.controleChakra * 7 + char.chakraLevel * 22) *
      chakraMult *
      chakraBonusFactor
  );

  return {
    ...base,
    maxHp,
    maxChakra,
    chakraEfficiency: Number((1 + (char.chakraLevel - 1) * 0.05).toFixed(2)),
    accuracyBonus,
    evasionBonus,
    critBonus,
    chakraCostReduction: Math.min(0.4, chakraCostReduction),
    natureBonuses,
    categoryBonuses,
    healBoost,
    secretBonus,
    bijuuActiveId: sealedBijuu ? sealedBijuu.id : null,
    bijuuCloakActive: bijuuCloakOn,
  };
}

export interface ClanBonusBreakdown {
  clanId: string;
  clanName: string;
  kekkeiGenkai: string;
  passiveTrait: string;
  attributeBoosts: Record<AttributeKey, number>;
  totalAttributePoints: number;
  hpMultiplier: number;
  hpBonusPct: number;
  chakraMultiplier: number;
  chakraBonusPct: number;
  calculatedHpBoost: number;
  calculatedChakraBoost: number;
  baseHpWithoutClan: number;
  hpWithClan: number;
  baseChakraWithoutClan: number;
  chakraWithClan: number;
  accuracyBonus: number;
  evasionBonus: number;
  critBonus: number;
  chakraCostReductionPct: number;
  natureBonuses: Array<{ nature: string; damageMult: number; bonusPct: number }>;
  categoryBonuses: Array<{ category: string; damageMult: number; bonusPct: number }>;
  twoBonuses: ClanMechanicBonus[];
  summaryChips: string[];
}

const STAT_SHORT_LABELS: Record<AttributeKey, string> = {
  ninjutsu: 'NIN',
  taijutsu: 'TAI',
  genjutsu: 'GEN',
  velocidade: 'VEL',
  forca: 'FOR',
  inteligencia: 'INT',
  resistencia: 'RES',
  controleChakra: 'CON',
};

export function calculateClanBonuses(
  clanName?: string | null,
  charContext?: Partial<CharacterModel>
): ClanBonusBreakdown {
  const clan =
    CLANS.find((c) => c.name === clanName || c.id === clanName) ||
    CLANS.find((c) => c.id === 'sem_cla') ||
    CLANS[0];

  const attributeBoosts: Record<AttributeKey, number> = {
    ninjutsu: 0,
    taijutsu: 0,
    genjutsu: 0,
    velocidade: 0,
    forca: 0,
    inteligencia: 0,
    resistencia: 0,
    controleChakra: 0,
  };

  let totalAttributePoints = 0;
  for (const key of Object.keys(attributeBoosts) as AttributeKey[]) {
    const val = clan?.bonuses[key] || 0;
    attributeBoosts[key] = val;
    totalAttributePoints += val;
  }

  let hpMultiplier = 1;
  let chakraMultiplier = 1;
  let accuracyBonus = 0;
  let evasionBonus = 0;
  let critBonus = 0;
  let chakraCostReduction = 0;
  const natureMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();

  for (const b of clan?.twoBonuses || []) {
    const fx = b.combatEffect;
    if (!fx) continue;
    if (fx.hpMultiplier) hpMultiplier *= fx.hpMultiplier;
    if (fx.chakraMultiplier) chakraMultiplier *= fx.chakraMultiplier;
    if (fx.accuracyBonus) accuracyBonus += fx.accuracyBonus;
    if (fx.evasionBonus) evasionBonus += fx.evasionBonus;
    if (fx.critBonus) critBonus += fx.critBonus;
    if (fx.chakraCostReduction) chakraCostReduction += fx.chakraCostReduction;
    if (fx.natureBonus) {
      natureMap.set(
        fx.natureBonus.nature,
        (natureMap.get(fx.natureBonus.nature) || 1) * fx.natureBonus.damageMult
      );
    }
    if (fx.categoryBonus) {
      categoryMap.set(
        fx.categoryBonus.category,
        (categoryMap.get(fx.categoryBonus.category) || 1) * fx.categoryBonus.damageMult
      );
    }
  }

  const level = Math.max(1, charContext?.level ?? 1);
  const chakraLevel = Math.max(1, charContext?.chakraLevel ?? 1);
  const baseRes = charContext?.resistencia ?? 11;
  const baseCon = charContext?.controleChakra ?? 13;
  const chakraBonusFactor = 1 + (chakraLevel - 1) * 0.08;

  const baseHpWithoutClan = Math.round(120 + baseRes * 7 + level * 18);
  const hpWithClan = Math.round(
    (120 + (baseRes + attributeBoosts.resistencia) * 7 + level * 18) * hpMultiplier
  );
  const calculatedHpBoost = Math.max(0, hpWithClan - baseHpWithoutClan);

  const baseChakraWithoutClan = Math.round(
    (100 + baseCon * 7 + chakraLevel * 22) * chakraBonusFactor
  );
  const chakraWithClan = Math.round(
    (100 + (baseCon + attributeBoosts.controleChakra) * 7 + chakraLevel * 22) *
      chakraMultiplier *
      chakraBonusFactor
  );
  const calculatedChakraBoost = Math.max(0, chakraWithClan - baseChakraWithoutClan);

  const hpBonusPct = Math.round((hpMultiplier - 1) * 100);
  const chakraBonusPct = Math.round((chakraMultiplier - 1) * 100);
  const chakraCostReductionPct = Math.min(40, Math.round(chakraCostReduction * 100));

  const natureBonuses = Array.from(natureMap.entries()).map(([nature, damageMult]) => ({
    nature,
    damageMult: Number(damageMult.toFixed(2)),
    bonusPct: Math.round((damageMult - 1) * 100),
  }));
  const categoryBonuses = Array.from(categoryMap.entries()).map(([category, damageMult]) => ({
    category,
    damageMult: Number(damageMult.toFixed(2)),
    bonusPct: Math.round((damageMult - 1) * 100),
  }));

  const summaryChips: string[] = [];
  for (const key of Object.keys(attributeBoosts) as AttributeKey[]) {
    if (attributeBoosts[key] > 0) {
      summaryChips.push(`${STAT_SHORT_LABELS[key]} +${attributeBoosts[key]}`);
    }
  }
  if (hpBonusPct > 0) summaryChips.push(`+${hpBonusPct}% HP Máx`);
  if (chakraBonusPct > 0) summaryChips.push(`+${chakraBonusPct}% CH Máx`);
  if (accuracyBonus > 0) summaryChips.push(`+${accuracyBonus}% Precisão`);
  if (evasionBonus > 0) summaryChips.push(`+${evasionBonus}% Esquiva`);
  if (critBonus > 0) summaryChips.push(`+${critBonus}% Crítico`);
  if (chakraCostReductionPct > 0) summaryChips.push(`-${chakraCostReductionPct}% Custo CH`);
  for (const nb of natureBonuses) {
    if (nb.bonusPct > 0) summaryChips.push(`+${nb.bonusPct}% Dano ${formatElementalLabel(nb.nature)}`);
  }
  for (const cb of categoryBonuses) {
    if (cb.bonusPct > 0) summaryChips.push(`+${cb.bonusPct}% Dano ${cb.category}`);
  }

  return {
    clanId: clan.id,
    clanName: clan.name,
    kekkeiGenkai: clan.kekkeiGenkai,
    passiveTrait: clan.passiveTrait,
    attributeBoosts,
    totalAttributePoints,
    hpMultiplier: Number(hpMultiplier.toFixed(3)),
    hpBonusPct,
    chakraMultiplier: Number(chakraMultiplier.toFixed(3)),
    chakraBonusPct,
    calculatedHpBoost,
    calculatedChakraBoost,
    baseHpWithoutClan,
    hpWithClan,
    baseChakraWithoutClan,
    chakraWithClan,
    accuracyBonus,
    evasionBonus,
    critBonus,
    chakraCostReductionPct,
    natureBonuses,
    categoryBonuses,
    twoBonuses: clan.twoBonuses,
    summaryChips,
  };
}

export function getClanJutsuBoostSummary(
  clanName: string | null | undefined,
  effStats: Pick<EffectiveStats, 'natureBonuses' | 'categoryBonuses' | 'chakraCostReduction'>,
  jutsu: Pick<JutsuDef, 'nature' | 'category'>
): {
  damageMult: number;
  damageBonusPct: number;
  costReductionPct: number;
  badges: string[];
} {
  const clanBreakdown = calculateClanBonuses(clanName);
  const normalizedNature = normalizeElementalNature(jutsu.nature);

  const natureMultFromClan =
    clanBreakdown.natureBonuses.find(
      (n) => n.nature === jutsu.nature || (normalizedNature && n.nature === normalizedNature)
    )?.damageMult || 1;
  const catMultFromClan =
    clanBreakdown.categoryBonuses.find((c) => c.category === jutsu.category)?.damageMult || 1;

  const effNatureMult =
    effStats.natureBonuses?.[jutsu.nature] ||
    (normalizedNature ? effStats.natureBonuses?.[normalizedNature] : undefined) ||
    1;
  const effCategoryMult = effStats.categoryBonuses?.[jutsu.category] || 1;

  const clanCombinedMult = Number((natureMultFromClan * catMultFromClan).toFixed(2));
  const totalAppliedMult = Number((effNatureMult * effCategoryMult).toFixed(2));
  const damageMult = Math.max(clanCombinedMult, totalAppliedMult);
  const damageBonusPct = Math.round((clanCombinedMult - 1) * 100);
  const costReductionPct = Math.round((effStats.chakraCostReduction || 0) * 100);

  const badges: string[] = [];
  if (damageBonusPct > 0) {
    badges.push(`Clã ${clanBreakdown.clanName} +${damageBonusPct}% Dano`);
  } else if (totalAppliedMult > 1) {
    badges.push(`Linhagem +${Math.round((totalAppliedMult - 1) * 100)}% Dano`);
  }
  if (clanBreakdown.chakraCostReductionPct > 0) {
    badges.push(`-${clanBreakdown.chakraCostReductionPct}% CH Clã`);
  }

  return {
    damageMult,
    damageBonusPct,
    costReductionPct,
    badges,
  };
}

export function getSharinganStageNumber(
  kekkeiGenkai?: string | null,
  clan?: string | null
): 0 | 1 | 2 | 3 | 4 {
  const norm = (kekkeiGenkai || '').trim().toLowerCase();
  if (norm === 'mangekyo sharingan' || norm === 'mangekyou sharingan') return 4;
  if (norm === 'sharingan (nível 3)' || norm === 'sharingan (nivel 3)') return 3;
  if (norm === 'sharingan (nível 2)' || norm === 'sharingan (nivel 2)') return 2;
  if (norm === 'sharingan (nível 1)' || norm === 'sharingan (nivel 1)') return 1;
  if (norm === 'sharingan') {
    if (!clan || clan.trim().toLowerCase() === 'uchiha') return 1;
    return 1;
  }
  return 0;
}

function getSharinganStageForStats(
  kekkeiGenkai?: string | null,
  clan?: string | null
): 0 | 1 | 2 | 3 | 4 {
  const norm = (kekkeiGenkai || '').trim().toLowerCase();
  if (norm === 'mangekyo sharingan' || norm === 'mangekyou sharingan') return 4;
  if (norm === 'sharingan (nível 3)' || norm === 'sharingan (nivel 3)') return 3;
  if (norm === 'sharingan (nível 2)' || norm === 'sharingan (nivel 2)') return 2;
  if (norm === 'sharingan (nível 1)' || norm === 'sharingan (nivel 1)') return 1;
  if (norm === 'sharingan' && (clan || '').trim().toLowerCase() === 'uchiha') return 1;
  return 0;
}

export function getSharinganStageDef(stage: 1 | 2 | 3 | 4): SharinganStageDef {
  return (
    SHARINGAN_EVOLUTION_STAGES.find((s) => s.stage === stage) ||
    SHARINGAN_EVOLUTION_STAGES[0]
  );
}

export function normalizeCreationKekkeiGenkai(
  rawKekkei?: string | null,
  clan?: string | null
): string {
  const trimmed = (rawKekkei || 'Nenhum').trim();
  if ((clan || '').trim() === 'Uchiha' && (trimmed === 'Sharingan' || trimmed === 'Sharingan (Nível 1)')) {
    return 'Sharingan (Nível 1)';
  }
  if (
    trimmed === 'Sharingan (Nível 2)' ||
    trimmed === 'Sharingan (Nível 3)' ||
    trimmed === 'Mangekyo Sharingan' ||
    trimmed === 'Mangekyou Sharingan'
  ) {
    return (clan || '').trim() === 'Uchiha' ? 'Sharingan (Nível 1)' : 'Nenhum';
  }
  if ((CREATION_KEKKEI_GENKAI_LIST as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  if (trimmed === 'Sharingan') {
    return 'Sharingan (Nível 1)';
  }
  return 'Nenhum';
}

export function checkSharinganEvolutionEligibility(
  char: Pick<
    CharacterModel,
    | 'clan'
    | 'kekkeiGenkai'
    | 'rank'
    | 'level'
    | 'chakraLevel'
    | 'missionsCompleted'
    | 'wins'
    | 'meritPoints'
    | 'ryo'
  >
): {
  isSharinganUser: boolean;
  currentStage: 0 | 1 | 2 | 3 | 4;
  currentStageDef: SharinganStageDef | null;
  nextStageDef: SharinganStageDef | null;
  maxStageReached: boolean;
  eligible: boolean;
  unmetReasons: string[];
} {
  const currentStage = getSharinganStageNumber(char.kekkeiGenkai, char.clan);
  const isUchiha = (char.clan || '').trim().toLowerCase() === 'uchiha';
  const isSharinganUser = isUchiha || currentStage > 0;

  if (!isSharinganUser) {
    return {
      isSharinganUser: false,
      currentStage: 0,
      currentStageDef: null,
      nextStageDef: null,
      maxStageReached: false,
      eligible: false,
      unmetReasons: ['A evolução do Sharingan é exclusiva da linhagem ocular Uchiha / Sharingan.'],
    };
  }

  const currentStageDef = currentStage !== 0 ? getSharinganStageDef(currentStage) : null;
  if (currentStage >= 4) {
    return {
      isSharinganUser: true,
      currentStage: 4,
      currentStageDef,
      nextStageDef: null,
      maxStageReached: true,
      eligible: false,
      unmetReasons: ['Você já despertou o Mangekyou Sharingan (estágio máximo).'],
    };
  }

  const targetStageNumber = (currentStage === 0 ? 1 : currentStage + 1) as 1 | 2 | 3 | 4;
  const nextStageDef = getSharinganStageDef(targetStageNumber);
  const unmetReasons: string[] = [];

  if (!isUchiha && currentStage === 0) {
    unmetReasons.push('Requer pertencer ao Clã Uchiha ou já portar o Sharingan Nível 1.');
  }

  const minRankLabel = nextStageDef.minRank || 'Estudante da Academia';
  const charRankOrder = GRADUATION_RANK_ORDER[char.rank] ?? 0;
  const reqRankOrder = GRADUATION_RANK_ORDER[minRankLabel] ?? 0;
  if (charRankOrder < reqRankOrder) {
    unmetReasons.push(`Graduação mínima: ${minRankLabel} (atual: ${char.rank})`);
  }
  if (char.level < nextStageDef.minLevel) {
    unmetReasons.push(`Nível mínimo: ${nextStageDef.minLevel} (atual: ${char.level})`);
  }
  if (char.chakraLevel < nextStageDef.minChakraLevel) {
    unmetReasons.push(`Nível de Chakra mínimo: ${nextStageDef.minChakraLevel} (atual: ${char.chakraLevel})`);
  }
  if ((char.missionsCompleted || 0) < nextStageDef.minMissions) {
    unmetReasons.push(
      `Missões concluídas mínimas: ${nextStageDef.minMissions} (atual: ${char.missionsCompleted || 0})`
    );
  }
  if ((char.wins || 0) < nextStageDef.minWins) {
    unmetReasons.push(`Vitórias em combate mínimas: ${nextStageDef.minWins} (atual: ${char.wins || 0})`);
  }
  if ((char.meritPoints || 0) < nextStageDef.minMerit) {
    unmetReasons.push(`Mérito mínimo: ${nextStageDef.minMerit} (atual: ${char.meritPoints || 0})`);
  }
  if ((char.ryo || 0) < nextStageDef.costRyo) {
    unmetReasons.push(`Custo de Treinamento Ocular: ${nextStageDef.costRyo} Ryo (atual: ${char.ryo || 0})`);
  }

  return {
    isSharinganUser: true,
    currentStage,
    currentStageDef,
    nextStageDef,
    maxStageReached: false,
    eligible: unmetReasons.length === 0,
    unmetReasons,
  };
}

export function getEffectiveJutsuChakraCost(
  jutsu: Pick<JutsuDef, 'chakraCost'>,
  stats: Pick<EffectiveStats, 'chakraCostReduction'>
): number {
  const reduction = stats.chakraCostReduction || 0;
  return Math.max(4, Math.round(jutsu.chakraCost * (1 - reduction)));
}

export function getEffectiveJutsuEffects(
  jutsu: Pick<JutsuDef, 'id' | 'category' | 'nature' | 'basePower'> & { effects?: JutsuEffectSpec[] },
  attackerClan?: string,
  attackerKekkei?: string,
  sharinganActive: boolean = true
): JutsuEffectSpec[] {
  const baseEffects: JutsuEffectSpec[] = jutsu.effects ? [...jutsu.effects] : [];

  if (baseEffects.length === 0) {
    if (jutsu.nature === 'Katon') {
      baseEffects.push({
        type: 'burn',
        target: 'enemy',
        chance: 75,
        duration: 2,
        potency: Math.max(12, Math.round(jutsu.basePower * 0.25)),
        label: 'Queimadura (75%, 2t)',
      });
    } else if (jutsu.nature === 'Raiton') {
      baseEffects.push({
        type: 'stun',
        target: 'enemy',
        chance: 50,
        duration: 1,
        label: 'Atordoamento (50%, 1t)',
      });
    } else if (jutsu.nature === 'Suiton') {
      baseEffects.push({
        type: 'soaked',
        target: 'enemy',
        chance: 90,
        duration: 3,
        label: 'Encharcado (90%, 3t · +35% dano Raiton)',
      });
    } else if (jutsu.nature === 'Doton') {
      baseEffects.push({
        type: 'crush',
        target: 'enemy',
        chance: 80,
        duration: 2,
        label: 'Esmagamento (80%, 2t)',
      });
    } else if (jutsu.nature === 'Fuuton') {
      baseEffects.push({
        type: 'bleed',
        target: 'enemy',
        chance: 70,
        duration: 2,
        potency: Math.max(10, Math.round(jutsu.basePower * 0.2)),
        label: 'Laceração (70%, 2t)',
      });
    } else if (jutsu.category === 'Genjutsu') {
      baseEffects.push({
        type: 'paralysis',
        target: 'enemy',
        chance: 80,
        duration: 2,
        label: 'Paralisia Ilusória (80%, 2t)',
      });
    } else if (jutsu.category === 'Iryou') {
      baseEffects.push({
        type: 'regen',
        target: 'self',
        chance: 100,
        duration: 2,
        potency: 24,
        label: 'Regeneração Celular (2t)',
      });
    } else if (jutsu.category === 'Kenjutsu') {
      baseEffects.push({
        type: 'bleed',
        target: 'enemy',
        chance: 75,
        duration: 2,
        potency: Math.max(12, Math.round(jutsu.basePower * 0.22)),
        label: 'Corte de Lâmina (75%, 2t)',
      });
    } else if (jutsu.category === 'Fuinjutsu') {
      baseEffects.push({
        type: 'chakra_seal',
        target: 'enemy',
        chance: 85,
        duration: 2,
        potency: 20,
        label: 'Selo Supressor de Chakra (85%, 2t)',
      });
    }
  }

  const kekkei = (attackerKekkei || '').toLowerCase();
  const clan = (attackerClan || '').toLowerCase();
  const sharinganStage = getSharinganStageNumber(attackerKekkei, attackerClan);
  const sharinganStageDef =
    sharinganActive && sharinganStage !== 0 ? getSharinganStageDef(sharinganStage) : null;

  // Sharingan / Uchiha amplifies existing Genjutsu/illusion triggers ONLY when Sharingan is active
  if (sharinganActive && (kekkei.includes('sharingan') || clan === 'uchiha') && jutsu.category === 'Genjutsu') {
    const genBonus = sharinganStageDef ? sharinganStageDef.genjutsuEffectChanceBonus : 15;
    for (let i = 0; i < baseEffects.length; i++) {
      if (baseEffects[i].type === 'mind_control' || baseEffects[i].type === 'paralysis') {
        baseEffects[i] = {
          ...baseEffects[i],
          chance: Math.min(100, baseEffects[i].chance + genBonus),
        };
      }
    }
  }

  // Evolved Sharingan (Nível 2 / 3 / Mangekyou) amplifies ocular Kekkei Genkai non-mind_control effects when active
  if (
    sharinganActive &&
    sharinganStageDef &&
    sharinganStageDef.kekkeiEffectChanceBonus > 0 &&
    jutsu.category === 'Kekkei Genkai'
  ) {
    for (let i = 0; i < baseEffects.length; i++) {
      if (baseEffects[i].type !== 'mind_control') {
        baseEffects[i] = {
          ...baseEffects[i],
          chance: Math.min(100, baseEffects[i].chance + sharinganStageDef.kekkeiEffectChanceBonus),
        };
      }
    }
  }

  // Byakugan / Hyuga tenketsu closure
  if ((kekkei.includes('byakugan') || clan === 'hyuga') && (jutsu.category === 'Taijutsu' || jutsu.category === 'Kekkei Genkai')) {
    if (!baseEffects.some((e) => e.type === 'chakra_seal')) {
      baseEffects.push({
        type: 'chakra_seal',
        target: 'enemy',
        chance: 55,
        duration: 2,
        potency: 16,
        label: 'Byakugan: Dano nos Tenketsu (55%)',
      });
    }
  }

  // Yamanaka clan: mind_control applies to Yamanaka techniques & Yin/Genjutsu mental manipulation
  if (clan === 'yamanaka') {
    const existingMindIdx = baseEffects.findIndex((e) => e.type === 'mind_control');
    if (existingMindIdx >= 0) {
      baseEffects[existingMindIdx] = {
        ...baseEffects[existingMindIdx],
        chance: Math.min(100, baseEffects[existingMindIdx].chance + 10),
      };
    } else if (jutsu.category === 'Genjutsu') {
      baseEffects.push({
        type: 'mind_control',
        target: 'enemy',
        chance: 45,
        duration: 1,
        label: 'Clã Yamanaka: Controle Mental (45%)',
      });
    }
  }

  // Kurama / Ketsuryugan strengthen Genjutsu paralysis (not blanket mind_control)
  if ((clan === 'kurama' || kekkei.includes('ketsuryugan')) && jutsu.category === 'Genjutsu') {
    if (!baseEffects.some((e) => e.type === 'paralysis')) {
      baseEffects.push({
        type: 'paralysis',
        target: 'enemy',
        chance: 65,
        duration: 2,
        label: 'Ilusão Ocular/Sensorial: Paralisia (65%)',
      });
    }
  }

  // Aburame Kikaichu chakra siphon
  if (clan === 'aburame' && jutsu.category === 'Ninjutsu') {
    if (!baseEffects.some((e) => e.type === 'chakra_seal')) {
      baseEffects.push({
        type: 'chakra_seal',
        target: 'enemy',
        chance: 50,
        duration: 2,
        potency: 15,
        label: 'Kikaichu: Dreno de Chakra (50%)',
      });
    }
  }

  // Akimichi / Kaguya physical bone/expansion crush
  if ((clan === 'akimichi' || clan === 'kaguya') && jutsu.category === 'Taijutsu') {
    if (!baseEffects.some((e) => e.type === 'crush')) {
      baseEffects.push({
        type: 'crush',
        target: 'enemy',
        chance: 55,
        duration: 2,
        label: 'Impacto Esmagador do Clã (55%)',
      });
    }
  }

  return baseEffects;
}

export function mergeStatusEffects(
  current: ActiveStatusEffect[],
  incoming: AppliedEffectOutcome,
  sourceName?: string
): ActiveStatusEffect[] {
  const next = [...current];
  // Regeneration purifies burn & bleed on self
  const filtered =
    incoming.type === 'regen'
      ? next.filter((s) => s.type !== 'burn' && s.type !== 'bleed')
      : next;

  const existingIdx = filtered.findIndex((s) => s.type === incoming.type);
  const meta = STATUS_EFFECT_META[incoming.type];
  const entry: ActiveStatusEffect = {
    type: incoming.type,
    label: meta?.shortTag || incoming.label,
    turnsRemaining: incoming.duration,
    potency: incoming.potency,
    sourceName,
  };

  if (existingIdx >= 0) {
    filtered[existingIdx] = {
      ...entry,
      turnsRemaining: Math.max(filtered[existingIdx].turnsRemaining, incoming.duration),
      potency: Math.max(filtered[existingIdx].potency, incoming.potency),
    };
  } else {
    filtered.push(entry);
  }
  return filtered;
}

export function resolveTurnStartControl(
  statuses: ActiveStatusEffect[],
  maxHp: number,
  rng: () => number = Math.random
): {
  canAct: boolean;
  reason?: 'stun' | 'paralysis' | 'mind_control';
  selfDamage: number;
  narration?: string;
  updatedStatuses: ActiveStatusEffect[];
} {
  const hasStun = statuses.find((s) => s.type === 'stun');
  if (hasStun) {
    return {
      canAct: false,
      reason: 'stun',
      selfDamage: 0,
      narration: 'está Atordoado pela descarga elétrica e não consegue reagir neste turno!',
      updatedStatuses: statuses.filter((s) => s.type !== 'stun'),
    };
  }

  const hasMind = statuses.find((s) => s.type === 'mind_control');
  if (hasMind && rng() < 0.55) {
    const selfDamage = Math.max(14, Math.round(maxHp * 0.08));
    return {
      canAct: false,
      reason: 'mind_control',
      selfDamage,
      narration: `sofre Controle Mental Momentâneo e atinge a si mesmo por ${selfDamage} de dano!`,
      updatedStatuses: statuses.filter((s) => s.type !== 'mind_control'),
    };
  }

  const hasParalysis = statuses.find((s) => s.type === 'paralysis');
  if (hasParalysis && rng() < 0.6) {
    return {
      canAct: false,
      reason: 'paralysis',
      selfDamage: 0,
      narration: 'tem os músculos travados por Paralisia e falha ao executar o movimento!',
      updatedStatuses: statuses,
    };
  }

  return {
    canAct: true,
    selfDamage: 0,
    updatedStatuses: statuses,
  };
}

export function tickEndOfTurnStatuses(
  statuses: ActiveStatusEffect[],
  currentHp: number,
  maxHp: number,
  currentChakra: number = 0,
  maxChakra: number = 0
): {
  nextHp: number;
  nextChakra: number;
  hpDelta: number;
  chakraDelta: number;
  nextStatuses: ActiveStatusEffect[];
  logs: string[];
} {
  let hpDelta = 0;
  let chakraDelta = 0;
  const logs: string[] = [];
  const nextStatuses: ActiveStatusEffect[] = [];

  for (const st of statuses) {
    if (st.type === 'burn') {
      const dmg = Math.max(10, st.potency || Math.round(maxHp * 0.06));
      hpDelta -= dmg;
      logs.push(`Queimadura (-${dmg} HP)`);
    } else if (st.type === 'black_flames') {
      const dmg = Math.max(22, st.potency || Math.round(maxHp * 0.1));
      hpDelta -= dmg;
      logs.push(`Chamas Negras (-${dmg} HP)`);
    } else if (st.type === 'drowning') {
      const dmg = Math.max(14, st.potency || Math.round(maxHp * 0.07));
      const chDrain = 12;
      hpDelta -= dmg;
      chakraDelta -= chDrain;
      logs.push(`Afogamento (-${dmg} HP / -${chDrain} CH)`);
    } else if (st.type === 'bleed') {
      const dmg = Math.max(10, st.potency || Math.round(maxHp * 0.06));
      hpDelta -= dmg;
      logs.push(`Laceração (-${dmg} HP)`);
    } else if (st.type === 'chakra_seal') {
      const chDrain = Math.max(12, st.potency || 18);
      chakraDelta -= chDrain;
      logs.push(`Tenketsu Selados (-${chDrain} CH)`);
    } else if (st.type === 'regen') {
      const heal = Math.max(16, st.potency || Math.round(maxHp * 0.08));
      hpDelta += heal;
      logs.push(`Regeneração (+${heal} HP)`);
    }

    const rem = st.turnsRemaining - 1;
    if (rem > 0) {
      nextStatuses.push({ ...st, turnsRemaining: rem });
    }
  }

  const nextHp = Math.max(0, Math.min(maxHp, currentHp + hpDelta));
  const nextChakra = Math.max(0, Math.min(maxChakra, currentChakra + chakraDelta));
  return { nextHp, nextChakra, hpDelta, chakraDelta, nextStatuses, logs };
}

export function calculateHitAndDamage(
  attacker: EffectiveStats,
  attackerNature: ChakraNature | string,
  defender: EffectiveStats,
  defenderNature: ChakraNature | string,
  jutsu: Pick<
    JutsuDef,
    'category' | 'nature' | 'basePower' | 'accuracyMod' | 'critBonus' | 'healRatio'
  > & { id?: string; effects?: JutsuEffectSpec[] },
  rng: () => number = Math.random,
  options?: CombatCalculationOptions
): CombatCalculationResult {
  const atkStatuses = options?.attackerStatuses || [];
  const defStatuses = options?.defenderStatuses || [];

  const atkDrowning = atkStatuses.some((s) => s.type === 'drowning');
  const atkFrozen = atkStatuses.some((s) => s.type === 'freeze');
  const atkMindControl = atkStatuses.some((s) => s.type === 'mind_control');
  const atkChakraSeal = atkStatuses.some((s) => s.type === 'chakra_seal');
  const atkBurned = atkStatuses.some((s) => s.type === 'burn' || s.type === 'black_flames');

  const defSoaked = defStatuses.some((s) => s.type === 'soaked');
  const defCrushed = defStatuses.some((s) => s.type === 'crush');
  const defImpaired = defStatuses.some((s) => s.type === 'paralysis' || s.type === 'freeze');
  const defShielded = defStatuses.some((s) => s.type === 'shield');

  const accuracyStat =
    jutsu.category === 'Taijutsu'
      ? attacker.velocidade * 1.15 + attacker.taijutsu * 0.6
      : jutsu.category === 'Kenjutsu'
      ? attacker.velocidade * 1.15 + attacker.forca * 0.45 + attacker.taijutsu * 0.35
      : jutsu.category === 'Genjutsu'
      ? attacker.inteligencia * 1.1 + attacker.genjutsu * 0.7
      : attacker.controleChakra * 0.9 + attacker.inteligencia * 0.7 + attacker.velocidade * 0.4;

  const baseEvasionStat = defender.velocidade * 1.05 + defender.inteligencia * 0.45;
  const evasionStat = defImpaired ? baseEvasionStat * 0.78 : baseEvasionStat;
  const statusAccPenalty = (atkDrowning ? 18 : 0) + (atkFrozen ? 12 : 0);

  const rawHitChance =
    76 +
    (accuracyStat - evasionStat) * 0.9 +
    jutsu.accuracyMod +
    (attacker.accuracyBonus || 0) -
    (defender.evasionBonus || 0) -
    statusAccPenalty;
  const hitChance = Math.max(25, Math.min(98, Math.round(rawHitChance)));
  const rolled = Math.floor(rng() * 100) + 1;
  const isHit = rolled <= hitChance;

  const critChance = Math.max(
    5,
    Math.min(48, Math.round(6 + attacker.velocidade * 0.35 + jutsu.critBonus + (attacker.critBonus || 0)))
  );
  const critRoll = Math.floor(rng() * 100) + 1;
  const isCrit = isHit && critRoll <= critChance;

  const elementalBreakdown = evaluateElementalAffinity({
    attackNature: jutsu.nature,
    attackerPrimaryNature: attackerNature,
    attackerSecondaryNature: options?.attackerSecondaryNature,
    defenderPrimaryNature: defenderNature,
    defenderSecondaryNature: options?.defenderSecondaryNature,
  });
  const elementalMultiplier = elementalBreakdown.elementalMultiplier;
  const affinityMultiplier = elementalBreakdown.affinityResonanceMultiplier;
  const normalizedJutsuElement = elementalBreakdown.attackElement;

  const clanNatureMult =
    attacker.natureBonuses?.[jutsu.nature] ||
    (normalizedJutsuElement ? attacker.natureBonuses?.[normalizedJutsuElement] : undefined) ||
    1;
  const clanCategoryMult = attacker.categoryBonuses?.[jutsu.category] || 1;
  const clanDamageMult = clanNatureMult * clanCategoryMult;

  const synergyNotes: string[] = [];
  let statusDamageMult = 1;

  if (elementalBreakdown.relation === 'advantage') {
    synergyNotes.push(elementalBreakdown.relationLabel);
  } else if (elementalBreakdown.relation === 'disadvantage') {
    synergyNotes.push(elementalBreakdown.relationLabel);
  }

  if (elementalBreakdown.affinityLabel) {
    synergyNotes.push(elementalBreakdown.affinityLabel);
  }

  if (clanNatureMult > 1) {
    const pct = Math.round((clanNatureMult - 1) * 100);
    const elemText = normalizedJutsuElement
      ? formatElementalLabel(normalizedJutsuElement)
      : jutsu.nature;
    synergyNotes.push(
      `Bônus de Clã${options?.attackerClan ? ` (${options.attackerClan})` : ''}: +${pct}% Dano ${elemText}`
    );
  }
  if (clanCategoryMult > 1) {
    const pct = Math.round((clanCategoryMult - 1) * 100);
    synergyNotes.push(
      `Bônus de Clã/Linhagem${options?.attackerClan ? ` (${options.attackerClan})` : ''}: +${pct}% Dano ${jutsu.category}`
    );
  }

  if (defSoaked && normalizedJutsuElement === 'Raiton') {
    statusDamageMult *= 1.35;
    synergyNotes.push('Combo Encharcado + Raiton (+35% Dano & Choque Amplificado)');
  } else if (defSoaked && normalizedJutsuElement === 'Katon') {
    statusDamageMult *= 0.85;
    synergyNotes.push('Alvo Encharcado amortece Katon (-15% Dano)');
  }

  if (atkMindControl) {
    statusDamageMult *= 0.75;
    synergyNotes.push('Controle Mental reduz ataque em 25%');
  }

  if (atkChakraSeal && ['Ninjutsu', 'Genjutsu', 'Kekkei Genkai'].includes(jutsu.category)) {
    statusDamageMult *= 0.75;
    synergyNotes.push('Tenketsu Selados reduzem poder em 25%');
  }

  if (defCrushed && isHit) {
    synergyNotes.push('Defesa quebrada por Esmagamento (-30% Mitigação)');
  }

  const candidateEffects = getEffectiveJutsuEffects(
    {
      id: jutsu.id || 'custom',
      category: jutsu.category,
      nature: normalizedJutsuElement || jutsu.nature,
      basePower: jutsu.basePower,
      effects: jutsu.effects,
    },
    options?.attackerClan,
    options?.attackerKekkei,
    options?.sharinganActive !== false
  );
  const ignoresShield = candidateEffects.some((e) => e.type === 'black_flames');
  if (defShielded && !ignoresShield && isHit) {
    statusDamageMult *= 0.7;
    synergyNotes.push('Escudo reduz impacto em 30%');
  }

  let offensivePower = attacker.ninjutsu * 1.5 + attacker.controleChakra * 0.7;
  if (jutsu.category === 'Taijutsu') {
    offensivePower = attacker.taijutsu * 1.45 + attacker.forca * 0.95;
  } else if (jutsu.category === 'Kenjutsu') {
    offensivePower =
      attacker.velocidade * 1.1 + attacker.forca * 0.85 + attacker.controleChakra * 0.45;
  } else if (jutsu.category === 'Genjutsu') {
    offensivePower = attacker.genjutsu * 1.55 + attacker.inteligencia * 0.85;
  } else if (jutsu.category === 'Iryou') {
    offensivePower = attacker.controleChakra * 1.4 + attacker.inteligencia * 0.8;
  }

  const baseMitigation = defender.resistencia * 0.95 + defender.controleChakra * 0.35;
  const mitigation = defCrushed ? baseMitigation * 0.7 : baseMitigation;
  const variance = 0.92 + rng() * 0.16;

  let damage = 0;
  let healing = 0;

  if (jutsu.healRatio && jutsu.healRatio > 0) {
    const healMult = (atkBurned ? 0.7 : 1) * (1 + (attacker.healBoost || 0));
    healing = Math.round((jutsu.basePower + offensivePower * 0.9) * jutsu.healRatio * 2.1 * healMult);
  }

  if (isHit && !(jutsu.category === 'Iryou' && jutsu.basePower <= 30)) {
    const rawDamage =
      (jutsu.basePower + offensivePower - mitigation * 0.65) *
      elementalMultiplier *
      affinityMultiplier *
      clanDamageMult *
      statusDamageMult *
      variance;
    damage = Math.max(10, Math.round(rawDamage * (isCrit ? 1.55 : 1)));
  } else if (isHit && jutsu.category === 'Iryou') {
    damage = Math.max(8, Math.round(jutsu.basePower * 0.5));
  }

  // Trigger Jutsu & Dojutsu / Clan Status Effects
  const appliedEffects: AppliedEffectOutcome[] = [];
  const effectRolls: EffectRollLog[] = [];
  for (const fx of candidateEffects) {
    if (fx.target === 'enemy' && !isHit) continue;
    let effectiveChance = fx.chance;
    if (defSoaked && normalizedJutsuElement === 'Raiton' && fx.type === 'stun') {
      effectiveChance = Math.min(100, fx.chance * 2);
    }
    if (isCrit && fx.target === 'enemy') {
      effectiveChance = Math.min(100, effectiveChance + 15);
    }
    const fxRoll = Math.floor(rng() * 100) + 1;
    const fxLabel = STATUS_EFFECT_META[fx.type]?.shortTag || fx.label;
    const applied = fxRoll <= effectiveChance;
    effectRolls.push({
      type: fx.type,
      label: fxLabel,
      target: fx.target,
      chance: effectiveChance,
      rolled: fxRoll,
      applied,
      duration: fx.duration,
    });
    if (applied) {
      appliedEffects.push({
        type: fx.type,
        label: fxLabel,
        target: fx.target,
        duration: fx.duration,
        potency: fx.potency ?? Math.max(12, Math.round(jutsu.basePower * 0.22)),
      });
    }
  }

  const effectSuffix =
    appliedEffects.length > 0
      ? ` · Efeitos: ${appliedEffects.map((e) => `${e.label} (${e.duration}t)`).join(', ')}`
      : '';
  const affinitySuffix =
    affinityMultiplier > 1 ? ` · Afinidade x${affinityMultiplier.toFixed(2)}` : '';
  const elemTag =
    elementalBreakdown.relation === 'advantage'
      ? `Vantagem Elem x${elementalMultiplier.toFixed(2)}`
      : elementalBreakdown.relation === 'disadvantage'
      ? `Desvantagem Elem x${elementalMultiplier.toFixed(2)}`
      : `Elem x${elementalMultiplier.toFixed(2)}`;
  const formulaSummary = `Precisão ${hitChance}% (Rolado ${rolled}) · ${elemTag}${affinitySuffix} · Crítico ${critChance}%${effectSuffix}`;

  return {
    hitChance,
    rolled,
    isHit,
    isEvaded: !isHit,
    isCrit,
    critChance,
    critRolled: critRoll,
    damage,
    healing,
    elementalMultiplier,
    affinityMultiplier,
    clanDamageMultiplier: Number(clanDamageMult.toFixed(2)),
    elementalRelation: elementalBreakdown.relation,
    elementalBreakdown,
    appliedEffects,
    effectRolls,
    synergyNotes,
    formulaSummary,
  };
}

export function determineRankForCharacter(level: number, meritPoints: number, isKage: boolean): NinjaRank {
  if (isKage) return 'Kage';
  let best: NinjaRank = 'Estudante da Academia';
  for (const tier of NINJA_RANKS) {
    if (tier.rank === 'Kage') continue;
    if (level >= tier.minLevel && meritPoints >= tier.minMerit) {
      best = tier.rank;
    }
  }
  return best;
}

export function applyProgression(
  char: CharacterModel,
  gainedXp: number,
  gainedChakraXp: number,
  gainedRyo: number,
  gainedMerit: number
): {
  updated: CharacterModel;
  leveledUp: boolean;
  chakraLeveledUp: boolean;
  rankPromoted: boolean;
} {
  let level = char.level;
  let xp = char.xp + Math.max(0, gainedXp);
  let statPoints = char.statPoints;
  let leveledUp = false;

  while (xp >= xpRequiredForLevel(level)) {
    xp -= xpRequiredForLevel(level);
    level += 1;
    statPoints += 4;
    leveledUp = true;
  }

  let chakraLevel = char.chakraLevel;
  let chakraXp = char.chakraXp + Math.max(0, gainedChakraXp);
  let chakraLeveledUp = false;

  while (chakraXp >= chakraXpRequiredForLevel(chakraLevel)) {
    chakraXp -= chakraXpRequiredForLevel(chakraLevel);
    chakraLevel += 1;
    chakraLeveledUp = true;
  }

  const meritPoints = char.meritPoints + Math.max(0, gainedMerit);
  const ryo = char.ryo + Math.max(0, gainedRyo);
  // Canon graduation: rank never promotes automatically from XP/merit alone.
  // Estudante -> Genin via Teste da Academia; Genin -> Chunin via Exame Bimestral or X missions;
  // Chunin -> Jonin/Jounin Experiente via Kage appointment; Kage via Admin appointment.
  const newRank = char.rank;
  const rankPromoted = false;

  const draft: CharacterModel = {
    ...char,
    level,
    xp,
    chakraLevel,
    chakraXp,
    statPoints,
    meritPoints,
    ryo,
    rank: newRank,
  };

  const effective = calculateEffectiveStats(draft);
  draft.maxHp = effective.maxHp;
  draft.maxChakra = effective.maxChakra;
  draft.hp = effective.maxHp;
  draft.chakra = effective.maxChakra;

  return {
    updated: draft,
    leveledUp,
    chakraLeveledUp,
    rankPromoted,
  };
}

export type DailyRewardType = 'ryo' | 'xp';

export interface DailyLoginScheduleDay {
  day: number;
  rewardType: DailyRewardType;
  amount: number;
  label: string;
}

export interface DailyLoginRewardEvaluation {
  eligible: boolean;
  alreadyClaimedToday: boolean;
  dateKey: string;
  previousClaimDate: string | null;
  streakDay: number;
  cycleDay: number;
  rewardType: DailyRewardType;
  ryoGranted: number;
  xpGranted: number;
  title: string;
  description: string;
  schedule: DailyLoginScheduleDay[];
}

export interface DailyLoginRewardPopupData extends DailyLoginRewardEvaluation {
  prevRyo: number;
  newRyo: number;
  prevXp: number;
  newXp: number;
  prevLevel: number;
  newLevel: number;
  leveledUp: boolean;
  xpNeeded: number;
}

export function toUtcDateKey(input: Date | string | number = new Date()): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export function getPreviousUtcDateKey(dateKey: string): string {
  const parts = dateKey.split('-').map((n) => Number(n));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return toUtcDateKey(Date.now() - 86_400_000);
  }
  const [year, month, day] = parts;
  const prevMs = Date.UTC(year, month - 1, day) - 86_400_000;
  return new Date(prevMs).toISOString().slice(0, 10);
}

export function getDailyLoginSchedule(level = 1): DailyLoginScheduleDay[] {
  const safeLevel = Math.max(1, Math.floor(level));
  const ryoScale = Math.min(80, (safeLevel - 1) * 8);
  const xpScale = Math.min(45, (safeLevel - 1) * 5);

  const template: Array<{ day: number; rewardType: DailyRewardType; base: number }> = [
    { day: 1, rewardType: 'ryo', base: 120 },
    { day: 2, rewardType: 'xp', base: 45 },
    { day: 3, rewardType: 'ryo', base: 160 },
    { day: 4, rewardType: 'xp', base: 65 },
    { day: 5, rewardType: 'ryo', base: 200 },
    { day: 6, rewardType: 'xp', base: 85 },
    { day: 7, rewardType: 'ryo', base: 260 },
  ];

  return template.map((entry) => {
    const amount =
      entry.rewardType === 'ryo' ? entry.base + ryoScale : entry.base + xpScale;
    return {
      day: entry.day,
      rewardType: entry.rewardType,
      amount,
      label: entry.rewardType === 'ryo' ? `+${amount} Ryo` : `+${amount} XP`,
    };
  });
}

export function evaluateDailyLoginReward(
  char: Pick<CharacterModel, 'level' | 'lastDailyRewardDate' | 'dailyLoginStreak'>,
  now: Date | string | number = new Date()
): DailyLoginRewardEvaluation {
  const dateKey = toUtcDateKey(now);
  const yesterdayKey = getPreviousUtcDateKey(dateKey);
  const previousClaimDate = char.lastDailyRewardDate
    ? String(char.lastDailyRewardDate).slice(0, 10)
    : null;
  const alreadyClaimedToday = previousClaimDate === dateKey;

  let streakDay = 1;
  if (alreadyClaimedToday) {
    streakDay = Math.max(1, char.dailyLoginStreak || 1);
  } else if (previousClaimDate === yesterdayKey) {
    streakDay = Math.max(1, (char.dailyLoginStreak || 0) + 1);
  }

  const cycleDay = ((streakDay - 1) % 7) + 1;
  const schedule = getDailyLoginSchedule(char.level || 1);
  const todaySlot = schedule[cycleDay - 1] || schedule[0];
  const ryoGranted = todaySlot.rewardType === 'ryo' ? todaySlot.amount : 0;
  const xpGranted = todaySlot.rewardType === 'xp' ? todaySlot.amount : 0;

  return {
    eligible: !alreadyClaimedToday,
    alreadyClaimedToday,
    dateKey,
    previousClaimDate,
    streakDay,
    cycleDay,
    rewardType: todaySlot.rewardType,
    ryoGranted,
    xpGranted,
    title:
      todaySlot.rewardType === 'ryo'
        ? `Bolsa Diária da Vila — +${ryoGranted} Ryo`
        : `Pergaminho de Treino Diário — +${xpGranted} XP`,
    description:
      todaySlot.rewardType === 'ryo'
        ? `Primeiro acesso de hoje confirmado (Dia ${streakDay} de sequência). A tesouraria da sua vila depositou +${ryoGranted} Ryo na sua carteira.`
        : `Primeiro acesso de hoje confirmado (Dia ${streakDay} de sequência). Seu treino matinal concedeu +${xpGranted} XP de experiência ninja.`,
    schedule,
  };
}

export function applyDailyLoginReward(
  char: CharacterModel,
  now: Date | string | number = new Date()
): {
  claimed: boolean;
  evaluation: DailyLoginRewardEvaluation;
  updated: CharacterModel;
  leveledUp: boolean;
  prevRyo: number;
  prevXp: number;
  prevLevel: number;
  xpNeeded: number;
} {
  const evaluation = evaluateDailyLoginReward(char, now);
  if (!evaluation.eligible) {
    return {
      claimed: false,
      evaluation,
      updated: char,
      leveledUp: false,
      prevRyo: char.ryo,
      prevXp: char.xp,
      prevLevel: char.level,
      xpNeeded: xpRequiredForLevel(char.level),
    };
  }

  const prog = applyProgression(char, evaluation.xpGranted, 0, evaluation.ryoGranted, 0);
  const updated: CharacterModel = {
    ...prog.updated,
    hp: prog.leveledUp ? prog.updated.maxHp : Math.min(prog.updated.maxHp, char.hp),
    chakra: prog.leveledUp ? prog.updated.maxChakra : Math.min(prog.updated.maxChakra, char.chakra),
    lastDailyRewardDate: evaluation.dateKey,
    dailyLoginStreak: evaluation.streakDay,
  };

  return {
    claimed: true,
    evaluation,
    updated,
    leveledUp: prog.leveledUp,
    prevRyo: char.ryo,
    prevXp: char.xp,
    prevLevel: char.level,
    xpNeeded: xpRequiredForLevel(updated.level),
  };
}

export function generateDynamicMission(
  char: Pick<CharacterModel, 'level' | 'missionsCompleted'> & { village?: string },
  templateId?: string,
  villageOverride?: string
): ScaledMission {
  const fallbackVillage = villageOverride || char.village || 'Konohagakure';
  const tpl =
    findMissionTemplateById(templateId) ||
    getMissionsForVillage(fallbackVillage)[0] ||
    MISSION_TEMPLATES[0];

  const progressionBoost = Math.max(0, char.level - tpl.minLevel) * 0.14 + char.missionsCompleted * 0.03;
  const difficultyScale = Number((1 + Math.min(2.8, progressionBoost)).toFixed(2));

  return {
    ...tpl,
    difficultyScale,
    staminaCost: getMissionStaminaCost(tpl.rank, false),
    scaledHp: Math.round(tpl.baseHp * difficultyScale),
    scaledAttack: Math.round(tpl.baseAttack * (1 + (difficultyScale - 1) * 0.72)),
    scaledSpeed: Math.round(tpl.baseSpeed * (1 + (difficultyScale - 1) * 0.45)),
    rewardXp: Math.round(tpl.baseXp * (1 + (difficultyScale - 1) * 0.6)),
    rewardChakraXp: Math.round(tpl.baseChakraXp * (1 + (difficultyScale - 1) * 0.6)),
    rewardRyo: Math.round(tpl.baseRyo * (1 + (difficultyScale - 1) * 0.55)),
    rewardMerit: Math.round(tpl.baseMerit * (1 + (difficultyScale - 1) * 0.5)),
  };
}

export const JUTSU_RANK_ORDER: Record<JutsuDef['rank'], number> = {
  E: 0,
  D: 1,
  C: 2,
  B: 3,
  A: 4,
  S: 5,
};

export const ELEMENTAL_NATURES: ReadonlyArray<ChakraNature> = [
  'Katon',
  'Suiton',
  'Fuuton',
  'Doton',
  'Raiton',
];

export function getMaxJutsuRankForGraduation(rank: string): JutsuDef['rank'] {
  switch (rank) {
    case 'Estudante da Academia':
      return 'D';
    case 'Genin':
      return 'C';
    case 'Chunin':
      return 'B';
    case 'Tokubetsu Jonin':
    case 'Jonin':
      return 'A';
    case 'Jounin Experiente':
    case 'Anbu':
    case 'Sannin':
    case 'Kage':
      return 'S';
    default:
      return 'D';
  }
}

export function getOwnedElements(
  char: Pick<CharacterModel, 'chakraNature' | 'secondaryChakraNature'>
): string[] {
  const list: string[] = [];
  if (char.chakraNature && char.chakraNature !== 'Nenhum') {
    list.push(char.chakraNature);
  }
  if (
    char.secondaryChakraNature &&
    char.secondaryChakraNature !== 'Nenhum' &&
    ELEMENTAL_NATURES.includes(char.secondaryChakraNature as ChakraNature) &&
    !list.includes(char.secondaryChakraNature)
  ) {
    list.push(char.secondaryChakraNature);
  }
  return list;
}

export function isClanless(clan: string | undefined | null): boolean {
  const normalized = (clan || '').trim().toLowerCase();
  return (
    normalized === '' ||
    normalized === 'nenhum' ||
    normalized === 'sem clã' ||
    normalized === 'sem cla' ||
    normalized === 'sem clã (independente)'
  );
}

export function hasNoKekkeiGenkai(kekkei: string | undefined | null): boolean {
  const normalized = (kekkei || '').trim().toLowerCase();
  return normalized === '' || normalized === 'nenhum';
}

export const GREAT_SUMMON_CONTRACTS: ReadonlyArray<string> = [
  'Sapos do Monte Myoboku (Gamabunta)',
  'Lesmas da Floresta Shikkotsu (Katsuyu)',
  'Cobras da Caverna Ryuchi (Manda)',
];

export function isGreatSummonContract(contract: string | undefined | null): boolean {
  if (!contract) return false;
  return GREAT_SUMMON_CONTRACTS.includes(contract);
}

export const GRADUATION_RANK_ORDER: Record<string, number> = {
  'Estudante da Academia': 0,
  Genin: 1,
  Chunin: 2,
  'Tokubetsu Jonin': 3,
  Jonin: 4,
  'Jounin Experiente': 5,
  Anbu: 6,
  Sannin: 7,
  Kage: 8,
};

export function checkSummonQuestEligibility(
  char: Pick<
    CharacterModel,
    'rank' | 'level' | 'chakraLevel' | 'missionsCompleted' | 'meritPoints' | 'ryo' | 'summonContract'
  >,
  quest: SummonQuestDef
): {
  eligible: boolean;
  alreadyOwned: boolean;
  unmetReasons: string[];
} {
  const alreadyOwned = char.summonContract === quest.contractName;
  const unmetReasons: string[] = [];

  if (alreadyOwned) {
    return { eligible: false, alreadyOwned: true, unmetReasons: ['Você já possui este contrato assinado.'] };
  }

  const charRankOrder = GRADUATION_RANK_ORDER[char.rank] ?? 0;
  const reqRankOrder = GRADUATION_RANK_ORDER[quest.minRank] ?? 1;
  if (charRankOrder < reqRankOrder) {
    unmetReasons.push(`Graduação mínima: ${quest.minRank} (atual: ${char.rank})`);
  }
  if (char.level < quest.minLevel) {
    unmetReasons.push(`Nível mínimo: ${quest.minLevel} (atual: ${char.level})`);
  }
  if (char.chakraLevel < quest.minChakraLevel) {
    unmetReasons.push(`Nível de Chakra mínimo: ${quest.minChakraLevel} (atual: ${char.chakraLevel})`);
  }
  if ((char.missionsCompleted || 0) < quest.minMissions) {
    unmetReasons.push(`Missões concluídas mínimas: ${quest.minMissions} (atual: ${char.missionsCompleted || 0})`);
  }
  if ((char.meritPoints || 0) < quest.minMerit) {
    unmetReasons.push(`Mérito mínimo: ${quest.minMerit} (atual: ${char.meritPoints || 0})`);
  }
  if ((char.ryo || 0) < quest.costRyo) {
    unmetReasons.push(`Oferenda do Pergaminho: ${quest.costRyo} Ryo (atual: ${char.ryo || 0})`);
  }

  return {
    eligible: unmetReasons.length === 0,
    alreadyOwned: false,
    unmetReasons,
  };
}

export type JutsuDojoSectionKey =
  | 'Ninjutsu'
  | 'Ninjutsu Elemental'
  | 'Taijutsu'
  | 'Kenjutsu'
  | 'Genjutsu'
  | 'Por Clã'
  | 'Kekkei Genkai'
  | 'Fuinjutsu'
  | 'Iryou'
  | 'Kuchiyose';

export function classifyJutsuSection(j: JutsuDef): JutsuDojoSectionKey {
  if (j.category === 'Kekkei Genkai') return 'Kekkei Genkai';
  if (j.category === 'Kenjutsu') return 'Kenjutsu';
  if (j.category === 'Taijutsu') return 'Taijutsu';
  if (j.category === 'Genjutsu') return 'Genjutsu';
  if (j.category === 'Fuinjutsu') return 'Fuinjutsu';
  if (j.category === 'Iryou') return 'Iryou';
  if (j.category === 'Kuchiyose') return 'Kuchiyose';
  if (j.clanExclusive) return 'Por Clã';
  if (ELEMENTAL_NATURES.includes(j.nature as ChakraNature)) return 'Ninjutsu Elemental';
  return 'Ninjutsu';
}

export function matchesJutsuDojoFilter(
  j: JutsuDef,
  primarySection: 'Todos' | JutsuDojoSectionKey,
  subFilter: string = 'Todos'
): boolean {
  if (primarySection === 'Todos') return true;

  if (primarySection === 'Ninjutsu') {
    return j.category === 'Ninjutsu' && !ELEMENTAL_NATURES.includes(j.nature as ChakraNature) && !j.clanExclusive;
  }
  if (primarySection === 'Ninjutsu Elemental') {
    const isElemental = j.category === 'Ninjutsu' && ELEMENTAL_NATURES.includes(j.nature as ChakraNature);
    if (!isElemental) return false;
    return subFilter === 'Todos' || j.nature === subFilter;
  }
  if (primarySection === 'Taijutsu') {
    return j.category === 'Taijutsu';
  }
  if (primarySection === 'Kenjutsu') {
    if (j.category !== 'Kenjutsu') return false;
    return subFilter === 'Todos' || j.nature === subFilter;
  }
  if (primarySection === 'Genjutsu') {
    return j.category === 'Genjutsu';
  }
  if (primarySection === 'Por Clã') {
    if (!j.clanExclusive) return false;
    return subFilter === 'Todos' || j.clanExclusive === subFilter;
  }
  if (primarySection === 'Kekkei Genkai') {
    const isKg = j.category === 'Kekkei Genkai' || Boolean(j.kekkeiRequired);
    if (!isKg) return false;
    if (subFilter === 'Todos') return true;
    if (subFilter === 'Sharingan') {
      return (
        j.kekkeiRequired === 'Sharingan' ||
        j.kekkeiRequired === 'Sharingan (Nível 1)' ||
        j.kekkeiRequired === 'Sharingan (Nível 2)' ||
        j.kekkeiRequired === 'Sharingan (Nível 3)'
      );
    }
    return j.kekkeiRequired === subFilter;
  }
  if (primarySection === 'Fuinjutsu') return j.category === 'Fuinjutsu';
  if (primarySection === 'Iryou') return j.category === 'Iryou';
  if (primarySection === 'Kuchiyose') return j.category === 'Kuchiyose';
  return true;
}

export function canCharacterLearnJutsu(
  char: Pick<
    CharacterModel,
    | 'rank'
    | 'chakraNature'
    | 'clan'
    | 'kekkeiGenkai'
    | 'level'
    | 'chakraLevel'
    | 'ryo'
    | 'learnedJutsus'
  > & { summonContract?: string },
  jutsu: JutsuDef
): {
  allowed: boolean;
  reason?: string;
  maxRank: JutsuDef['rank'];
  ownedElements: string[];
} {
  const maxRank = getMaxJutsuRankForGraduation(char.rank);
  const ownedElements = getOwnedElements(char);

  if (char.learnedJutsus.includes(jutsu.id)) {
    return { allowed: false, reason: 'Você já domina esta técnica.', maxRank, ownedElements };
  }

  if (JUTSU_RANK_ORDER[jutsu.rank] > JUTSU_RANK_ORDER[maxRank]) {
    return {
      allowed: false,
      reason: `Sua graduação (${char.rank}) permite aprender técnicas até Rank ${maxRank} (técnica Rank ${jutsu.rank}).`,
      maxRank,
      ownedElements,
    };
  }

  if (
    ELEMENTAL_NATURES.includes(jutsu.nature as ChakraNature) &&
    !ownedElements.includes(jutsu.nature)
  ) {
    return {
      allowed: false,
      reason: `Elemento incompatível: você possui ${ownedElements.join(', ')}, mas esta técnica exige ${jutsu.nature}.`,
      maxRank,
      ownedElements,
    };
  }

  if (jutsu.clanExclusive && jutsu.clanExclusive !== char.clan) {
    return {
      allowed: false,
      reason: `Técnica exclusiva do Clã ${jutsu.clanExclusive}.`,
      maxRank,
      ownedElements,
    };
  }

  if (jutsu.kekkeiRequired) {
    const reqStage = getSharinganStageNumber(jutsu.kekkeiRequired, char.clan);
    const charStage = getSharinganStageNumber(char.kekkeiGenkai, char.clan);
    const satisfiesSharinganStage = reqStage > 0 && charStage >= reqStage;

    if (jutsu.kekkeiRequired !== char.kekkeiGenkai && !satisfiesSharinganStage) {
      return {
        allowed: false,
        reason: `Requer Kekkei Genkai: ${jutsu.kekkeiRequired}.`,
        maxRank,
        ownedElements,
      };
    }
  }

  if (jutsu.category === 'Kuchiyose') {
    const contract = (char.summonContract || 'Nenhum').trim();
    if (!contract || contract === 'Nenhum') {
      return {
        allowed: false,
        reason: 'Requer Contrato de Invocação conquistado por Quest Especial em Missões.',
        maxRank,
        ownedElements,
      };
    }
    if (jutsu.id === 'kuchiyose_grande_sabio' && !isGreatSummonContract(contract)) {
      return {
        allowed: false,
        reason: 'Exige um dos Três Grandes Contratos Sábios (Sapos, Lesmas ou Cobras), obtidos via Quest Sábia Complexa.',
        maxRank,
        ownedElements,
      };
    }
  }

  if (jutsu.questRequired && !char.learnedJutsus.includes(jutsu.id)) {
    const linkedQuest = SPECIAL_JUTSU_QUESTS.find((q) => q.id === jutsu.questRequired);
    const title = linkedQuest ? linkedQuest.title : 'Quest Especial de Jutsu';
    const restrictionNote =
      linkedQuest?.requiresNoClan || linkedQuest?.requiresNoKekkeiGenkai
        ? ' (requisito: não possuir Clã e não possuir Kekkei Genkai)'
        : '';
    return {
      allowed: false,
      reason: `Desbloqueio obrigatório via ${title}${restrictionNote} na aba Missões → Quests de Jutsus.`,
      maxRank,
      ownedElements,
    };
  }

  if (char.level < jutsu.requiredLevel || char.chakraLevel < jutsu.requiredChakraLevel) {
    return {
      allowed: false,
      reason: `Requer Nível ${jutsu.requiredLevel} e Nível de Chakra ${jutsu.requiredChakraLevel}.`,
      maxRank,
      ownedElements,
    };
  }

  if (char.ryo < jutsu.learnCostRyo) {
    return {
      allowed: false,
      reason: `Ryo insuficiente (${jutsu.learnCostRyo} Ryo necessários).`,
      maxRank,
      ownedElements,
    };
  }

  return { allowed: true, maxRank, ownedElements };
}

export function checkJutsuQuestEligibility(
  char: Pick<
    CharacterModel,
    | 'rank'
    | 'level'
    | 'chakraLevel'
    | 'missionsCompleted'
    | 'meritPoints'
    | 'ryo'
    | 'clan'
    | 'kekkeiGenkai'
    | 'chakraNature'
    | 'secondaryChakraNature'
    | 'taijutsu'
    | 'controleChakra'
    | 'learnedJutsus'
  >,
  quest: JutsuQuestDef
): {
  eligible: boolean;
  alreadyCompleted: boolean;
  unmetReasons: string[];
} {
  const alreadyCompleted = quest.grantsSecondElement
    ? Boolean(
        char.secondaryChakraNature &&
          char.secondaryChakraNature !== 'Nenhum' &&
          ELEMENTAL_NATURES.includes(char.secondaryChakraNature as ChakraNature)
      )
    : Boolean(quest.rewardJutsuId && char.learnedJutsus.includes(quest.rewardJutsuId));

  if (alreadyCompleted) {
    return {
      eligible: false,
      alreadyCompleted: true,
      unmetReasons: ['Você já concluiu esta Quest Especial de Jutsu.'],
    };
  }

  const unmetReasons: string[] = [];

  if (quest.requiresNoClan && !isClanless(char.clan)) {
    unmetReasons.push(
      `Não pode possuir Clã: exige Sem Clã (Independente) (atual: ${char.clan})`
    );
  }
  if (quest.requiresNoKekkeiGenkai && !hasNoKekkeiGenkai(char.kekkeiGenkai)) {
    unmetReasons.push(
      `Não pode possuir Kekkei Genkai: exige Nenhum (atual: ${char.kekkeiGenkai})`
    );
  }

  const charRankOrder = GRADUATION_RANK_ORDER[char.rank] ?? 0;
  const reqRankOrder = GRADUATION_RANK_ORDER[quest.minRank] ?? 1;
  if (charRankOrder < reqRankOrder) {
    unmetReasons.push(`Graduação mínima: ${quest.minRank} (atual: ${char.rank})`);
  }
  if (char.level < quest.minLevel) {
    unmetReasons.push(`Nível mínimo: ${quest.minLevel} (atual: ${char.level})`);
  }
  if (char.chakraLevel < quest.minChakraLevel) {
    unmetReasons.push(`Nível de Chakra mínimo: ${quest.minChakraLevel} (atual: ${char.chakraLevel})`);
  }
  if ((char.missionsCompleted || 0) < quest.minMissions) {
    unmetReasons.push(`Missões concluídas mínimas: ${quest.minMissions} (atual: ${char.missionsCompleted || 0})`);
  }
  if ((char.meritPoints || 0) < quest.minMerit) {
    unmetReasons.push(`Mérito mínimo: ${quest.minMerit} (atual: ${char.meritPoints || 0})`);
  }
  if (quest.minTaijutsu && (char.taijutsu || 0) < quest.minTaijutsu) {
    unmetReasons.push(`Taijutsu mínimo: ${quest.minTaijutsu} (atual: ${char.taijutsu || 0})`);
  }
  if (quest.minChakraControl && (char.controleChakra || 0) < quest.minChakraControl) {
    unmetReasons.push(`Controle de Chakra mínimo: ${quest.minChakraControl} (atual: ${char.controleChakra || 0})`);
  }
  if ((char.ryo || 0) < quest.costRyo) {
    unmetReasons.push(`Custo de Treinamento: ${quest.costRyo} Ryo (atual: ${char.ryo || 0})`);
  }

  return {
    eligible: unmetReasons.length === 0,
    alreadyCompleted: false,
    unmetReasons,
  };
}

export function getJutsuQuestById(questId: string): JutsuQuestDef | undefined {
  return SPECIAL_JUTSU_QUESTS.find((q) => q.id === questId);
}

export function getSummonQuestById(questId: string): SummonQuestDef | undefined {
  return SUMMON_QUESTS.find((q) => q.id === questId);
}

export function validateAvatarUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }
  return '';
}

export const ACADEMY_PASS_SCORE = 70;
export const CHUNIN_EXAM_PASS_SCORE = 75;
export const MISSION_RANK_ORDER: ReadonlyArray<MissionRank> = ['D', 'C', 'B', 'A', 'S'];

export const GRADUATION_RANK_MISSION_REQUIREMENTS: Record<
  'ChuninExam' | 'ChuninMissions' | 'Tokubetsu Jonin' | 'Jonin' | 'Jounin Experiente',
  MissionRankCounts
> = {
  ChuninExam: { D: 2, C: 1, B: 0, A: 0, S: 0 },
  ChuninMissions: { D: 4, C: 3, B: 0, A: 0, S: 0 },
  'Tokubetsu Jonin': { D: 5, C: 4, B: 2, A: 0, S: 0 },
  Jonin: { D: 6, C: 5, B: 4, A: 3, S: 0 },
  'Jounin Experiente': { D: 8, C: 6, B: 5, A: 5, S: 2 },
};

export const CHUNIN_MISSION_REQUIREMENT =
  GRADUATION_RANK_MISSION_REQUIREMENTS.ChuninMissions.D +
  GRADUATION_RANK_MISSION_REQUIREMENTS.ChuninMissions.C;

export const KAGE_APPOINTABLE_RANKS: ReadonlyArray<NinjaRank> = [
  'Tokubetsu Jonin',
  'Jonin',
  'Jounin Experiente',
];

export interface RankMissionRequirementRow {
  rank: MissionRank;
  completed: number;
  required: number;
  met: boolean;
}

export interface MissionRankCheckResult {
  met: boolean;
  counts: MissionRankCounts;
  required: MissionRankCounts;
  missingByRank: MissionRankCounts;
  progressPercent: number;
  details: RankMissionRequirementRow[];
  summaryText: string;
}

export function normalizeMissionCountsByRank(
  raw?: Partial<MissionRankCounts> | null,
  fallbackTotalMissions?: number
): MissionRankCounts {
  if (!raw) {
    const safeFallback = Math.max(0, Math.floor(Number(fallbackTotalMissions) || 0));
    return { D: safeFallback, C: 0, B: 0, A: 0, S: 0 };
  }
  return {
    D: Math.max(0, Math.floor(Number(raw.D) || 0)),
    C: Math.max(0, Math.floor(Number(raw.C) || 0)),
    B: Math.max(0, Math.floor(Number(raw.B) || 0)),
    A: Math.max(0, Math.floor(Number(raw.A) || 0)),
    S: Math.max(0, Math.floor(Number(raw.S) || 0)),
  };
}

export function incrementMissionCountByRank(
  raw: Partial<MissionRankCounts> | null | undefined,
  missionRank: string | undefined,
  fallbackTotalMissions?: number
): MissionRankCounts {
  const counts = normalizeMissionCountsByRank(raw, fallbackTotalMissions);
  const key = (missionRank || 'D').trim().toUpperCase() as MissionRank;
  if (MISSION_RANK_ORDER.includes(key)) {
    counts[key] += 1;
  } else {
    counts.D += 1;
  }
  return counts;
}

export function getTargetRankMissionQuotas(
  targetKey: keyof typeof GRADUATION_RANK_MISSION_REQUIREMENTS
): MissionRankCounts {
  return { ...GRADUATION_RANK_MISSION_REQUIREMENTS[targetKey] };
}

export function meetsMissionRankRequirements(
  charOrCounts:
    | Pick<CharacterModel, 'missionCountsByRank' | 'missionsCompleted'>
    | MissionRankCounts,
  required: MissionRankCounts
): MissionRankCheckResult {
  const isRawCounts =
    'D' in charOrCounts && 'C' in charOrCounts && 'B' in charOrCounts && !('missionsCompleted' in charOrCounts);
  const counts = isRawCounts
    ? normalizeMissionCountsByRank(charOrCounts as MissionRankCounts)
    : normalizeMissionCountsByRank(
        (charOrCounts as Pick<CharacterModel, 'missionCountsByRank'>).missionCountsByRank,
        (charOrCounts as Pick<CharacterModel, 'missionsCompleted'>).missionsCompleted
      );

  const missingByRank: MissionRankCounts = { D: 0, C: 0, B: 0, A: 0, S: 0 };
  const details: RankMissionRequirementRow[] = [];
  let totalReq = 0;
  let totalCappedDone = 0;
  let met = true;

  for (const rk of MISSION_RANK_ORDER) {
    const req = Math.max(0, required[rk] || 0);
    const done = counts[rk] || 0;
    const isMet = done >= req;
    if (!isMet) met = false;
    missingByRank[rk] = Math.max(0, req - done);
    if (req > 0) {
      totalReq += req;
      totalCappedDone += Math.min(req, done);
      details.push({ rank: rk, completed: done, required: req, met: isMet });
    }
  }

  const progressPercent =
    totalReq === 0 ? 100 : Math.min(100, Math.round((totalCappedDone / totalReq) * 100));
  const summaryText = details
    .map((d) => `${d.required} Rank ${d.rank} (${d.completed}/${d.required})`)
    .join(' · ');

  return {
    met,
    counts,
    required: { ...required },
    missingByRank,
    progressPercent,
    details,
    summaryText,
  };
}

export interface ExamQuestionDef {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface PublicExamQuestion {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
}

export const ACADEMY_EXAM_QUESTIONS: ExamQuestionDef[] = [
  {
    id: 'acad_1',
    topic: 'Técnica Básica da Academia',
    prompt:
      'Para se formar na Academia Ninja e receber a bandana da vila, qual técnica de duplicação cria uma cópia ilusória intangível sem gastar grandes reservas?',
    options: [
      'Bunshin no Jutsu (Técnica dos Clones)',
      'Kage Bunshin no Jutsu (Clones das Sombras)',
      'Rasengan',
      'Kuchiyose no Jutsu',
    ],
    correctIndex: 0,
  },
  {
    id: 'acad_2',
    topic: 'Controle de Chakra',
    prompt:
      'Durante o treinamento básico de concentração na Academia, qual é a finalidade do Kawarimi no Jutsu?',
    options: [
      'Aumentar permanentemente o ataque elemental',
      'Trocar de lugar com um objeto próximo no instante de um ataque',
      'Selar bestas com cauda em pergaminhos',
      'Curar ferimentos internos profundos',
    ],
    correctIndex: 1,
  },
  {
    id: 'acad_3',
    topic: 'Ciclo Elemental',
    prompt:
      'Na relação clássica das cinco naturezas básicas de chakra, qual elemento tem vantagem direta sobre Fuuton (Vento)?',
    options: [
      'Raiton (Relâmpago)',
      'Doton (Terra)',
      'Katon (Fogo)',
      'Suiton (Água)',
    ],
    correctIndex: 2,
  },
  {
    id: 'acad_4',
    topic: 'Código do Esquadrão',
    prompt:
      'Segundo o teste dos guizos de sobrevivência em equipe aplicado aos recém-formados Genin, o que define a aprovação verdadeira?',
    options: [
      'Capturar o líder individualmente ignorando os aliados',
      'Priorizar o trabalho em equipe e a proteção dos companheiros',
      'Gastar todo o chakra no primeiro golpe',
      'Abandonar a missão ao primeiro sinal de genjutsu',
    ],
    correctIndex: 1,
  },
  {
    id: 'acad_5',
    topic: 'Limite de Técnicas',
    prompt:
      'Um Estudante da Academia está restrito a técnicas Rank E e D até comprovar desempenho satisfatório. Qual rank se torna o novo limite ao virar Genin?',
    options: ['Rank S', 'Rank B', 'Rank C', 'Permanece Rank D'],
    correctIndex: 2,
  },
];

export const CHUNIN_EXAM_QUESTIONS: ExamQuestionDef[] = [
  {
    id: 'chunin_1',
    topic: '1ª Fase · Prova Escrita & Coleta de Informação',
    prompt:
      'Na primeira etapa do Exame Chunin conduzida sob pressão psicológica, qual habilidade shinobi é realmente avaliada pelos examinadores?',
    options: [
      'Decorar livros da biblioteca sem observar ao redor',
      'Coletar informações discretamente sem ser pego e manter firmeza diante da última pergunta',
      'Atacar os examinadores antes do término do tempo',
      'Desistir na 10ª pergunta para preservar Ryo',
    ],
    correctIndex: 1,
  },
  {
    id: 'chunin_2',
    topic: '2ª Fase · Floresta da Morte',
    prompt:
      'Sua equipe já possui o Pergaminho do Céu e precisa atravessar a floresta até a torre central. O que resta conquistar e por que abrir o pergaminho antes é proibido?',
    options: [
      'Conquistar o Pergaminho da Terra; abrir qualquer pergaminho antes da torre resulta em desclassificação/nocaute',
      'Derrotar todos os times da floresta e queimar o pergaminho',
      'Entregar o pergaminho ao adversário mais forte',
      'Correr sozinho sem aguardar o restante do trio Genin',
    ],
    correctIndex: 0,
  },
  {
    id: 'chunin_3',
    topic: '3ª Fase · Julgamento de Liderança',
    prompt:
      'Um Chunin é responsável por liderar esquadrões em missões de alto risco. Na avaliação final dos Kages e Jounins, o que garante a promoção mesmo se uma luta terminar em empate ou recuo?',
    options: [
      'Força bruta inconsequente e desperdício total de chakra',
      'Análise tática fria, leitura de armadilhas e saber quando recuar para manter a equipe viva',
      'Usar apenas jutsus proibidos de Rank S',
      'Ignorar ordens de missão para buscar fama solo',
    ],
    correctIndex: 1,
  },
  {
    id: 'chunin_4',
    topic: 'Protocolo de Comando Chunin',
    prompt:
      'Após conquistar a colete tático de Chunin (por exame bimestral ou histórico sólido de missões), até qual patente de jutsu o shinobi pode treinar no Dojo?',
    options: ['Até Rank D', 'Até Rank C', 'Até Rank B', 'Até Rank S'],
    correctIndex: 2,
  },
];

export function stripExamAnswers(questions: ExamQuestionDef[]): PublicExamQuestion[] {
  return questions.map(({ id, topic, prompt, options }) => ({ id, topic, prompt, options }));
}

export function gradeExam(
  questions: ExamQuestionDef[],
  answers: Record<string, number>,
  passThresholdPercent: number
): {
  scorePercent: number;
  correctCount: number;
  total: number;
  passed: boolean;
} {
  const total = questions.length;
  if (total === 0) {
    return { scorePercent: 0, correctCount: 0, total: 0, passed: false };
  }
  let correctCount = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correctIndex) {
      correctCount += 1;
    }
  }
  const scorePercent = Math.round((correctCount / total) * 100);
  return {
    scorePercent,
    correctCount,
    total,
    passed: scorePercent >= passThresholdPercent,
  };
}

export interface BimesterInfo {
  key: string;
  year: number;
  bimesterNumber: number;
  label: string;
  periodLabel: string;
  daysRemaining: number;
}

const BIMESTER_RANGES = [
  'Jan–Fev',
  'Mar–Abr',
  'Mai–Jun',
  'Jul–Ago',
  'Set–Out',
  'Nov–Dez',
] as const;

export function getBimesterInfo(date: Date = new Date()): BimesterInfo {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0..11
  const bimesterNumber = Math.floor(month / 2) + 1;
  const startMonth = (bimesterNumber - 1) * 2;
  const endDate = new Date(Date.UTC(year, startMonth + 2, 0, 23, 59, 59));
  const msRemaining = Math.max(0, endDate.getTime() - date.getTime());
  const daysRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const periodLabel = BIMESTER_RANGES[bimesterNumber - 1] || 'Bimestre';
  return {
    key: `${year}-B${bimesterNumber}`,
    year,
    bimesterNumber,
    label: `${bimesterNumber}º Bimestre (${periodLabel} ${year})`,
    periodLabel,
    daysRemaining,
  };
}

export interface GraduationLadderTier {
  id: string;
  rankLabel: string;
  maxJutsuRank: JutsuDef['rank'];
  unlockedRanks: JutsuDef['rank'][];
  blockedRanks: JutsuDef['rank'][];
  requirementSummary: string;
  isCurrent: boolean;
  isUnlockedTier: boolean;
}

const ALL_JUTSU_RANKS: JutsuDef['rank'][] = ['E', 'D', 'C', 'B', 'A', 'S'];

export function getGraduationLadderMatrix(currentRank: string): GraduationLadderTier[] {
  const maxRank = getMaxJutsuRankForGraduation(currentRank);
  const currentMaxOrder = JUTSU_RANK_ORDER[maxRank];

  const defs: Array<{
    id: string;
    rankLabel: string;
    maxJutsuRank: JutsuDef['rank'];
    requirementSummary: string;
    matches: (r: string) => boolean;
  }> = [
    {
      id: 'estudante',
      rankLabel: 'Estudante da Academia',
      maxJutsuRank: 'D',
      requirementSummary: 'Patente inicial · Até Rank D liberado (C, B, A, S bloqueados)',
      matches: (r) => r === 'Estudante da Academia',
    },
    {
      id: 'genin',
      rankLabel: 'Genin',
      maxJutsuRank: 'C',
      requirementSummary: 'Passar no Teste da Academia (≥ 70%) · Libera até Rank C',
      matches: (r) => r === 'Genin',
    },
    {
      id: 'chunin',
      rankLabel: 'Chunin',
      maxJutsuRank: 'B',
      requirementSummary: `Exame Bimestral (mín. 2 Rank D + 1 Rank C) OU Carreira de Campo (4 Rank D + 3 Rank C) · Libera Rank B`,
      matches: (r) => r === 'Chunin',
    },
    {
      id: 'jonin',
      rankLabel: 'Tokubetsu Jonin / Jonin',
      maxJutsuRank: 'A',
      requirementSummary: `Nomeado pelo Kage · Tokubetsu (5D, 4C, 2B) · Jonin (6D, 5C, 4B, 3A) · Libera Rank A`,
      matches: (r) => r === 'Tokubetsu Jonin' || r === 'Jonin',
    },
    {
      id: 'jounin_experiente',
      rankLabel: 'Jounin Experiente / Kage',
      maxJutsuRank: 'S',
      requirementSummary: `Nomeado pelo Kage (8D, 6C, 5B, 5A, 2S) · Kage apontado pelo Admin · Libera Rank S`,
      matches: (r) =>
        r === 'Jounin Experiente' || r === 'Anbu' || r === 'Sannin' || r === 'Kage',
    },
  ];

  return defs.map((d) => {
    const tierOrder = JUTSU_RANK_ORDER[d.maxJutsuRank];
    return {
      id: d.id,
      rankLabel: d.rankLabel,
      maxJutsuRank: d.maxJutsuRank,
      unlockedRanks: ALL_JUTSU_RANKS.filter((rk) => JUTSU_RANK_ORDER[rk] <= tierOrder),
      blockedRanks: ALL_JUTSU_RANKS.filter((rk) => JUTSU_RANK_ORDER[rk] > tierOrder),
      requirementSummary: d.requirementSummary,
      isCurrent: d.matches(currentRank),
      isUnlockedTier: currentMaxOrder >= tierOrder,
    };
  });
}

export interface GraduationProgressInfo {
  xpCurrent: number;
  xpRequired: number;
  xpPercent: number;
  xpRemaining: number;
  chakraXpCurrent: number;
  chakraXpRequired: number;
  chakraXpPercent: number;
  chakraXpRemaining: number;
  maxJutsuRank: JutsuDef['rank'];
  unlockedJutsuRanks: JutsuDef['rank'][];
  blockedJutsuRanks: JutsuDef['rank'][];
  missionsCompleted: number;
  missionCountsByRank: MissionRankCounts;
  chuninExamRankCheck: MissionRankCheckResult;
  chuninMissionsRankCheck: MissionRankCheckResult;
  joninRankChecks: {
    tokubetsuJonin: MissionRankCheckResult;
    jonin: MissionRankCheckResult;
    jouninExperiente: MissionRankCheckResult;
  };
  missionsRequiredForChunin: number;
  missionsProgressPercent: number;
  canTakeAcademyTest: boolean;
  canTakeBimesterChuninExam: boolean;
  canPromoteChuninByMissions: boolean;
  requiresKageAppointment: boolean;
  nextPromotionTitle: string;
  nextPromotionRule: string;
}

export function getGraduationPathInfo(
  char: Pick<
    CharacterModel,
    'rank' | 'level' | 'xp' | 'chakraLevel' | 'chakraXp' | 'missionsCompleted' | 'missionCountsByRank' | 'isKage'
  >,
  bimesterExamAttempted: boolean
): GraduationProgressInfo {
  const xpRequired = xpRequiredForLevel(char.level);
  const xpCurrent = Math.max(0, char.xp);
  const xpPercent = Math.min(100, Math.round((xpCurrent / Math.max(1, xpRequired)) * 100));
  const xpRemaining = Math.max(0, xpRequired - xpCurrent);

  const chakraXpRequired = chakraXpRequiredForLevel(char.chakraLevel);
  const chakraXpCurrent = Math.max(0, char.chakraXp);
  const chakraXpPercent = Math.min(100, Math.round((chakraXpCurrent / Math.max(1, chakraXpRequired)) * 100));
  const chakraXpRemaining = Math.max(0, chakraXpRequired - chakraXpCurrent);

  const maxJutsuRank = getMaxJutsuRankForGraduation(char.rank);
  const maxOrder = JUTSU_RANK_ORDER[maxJutsuRank];
  const unlockedJutsuRanks = ALL_JUTSU_RANKS.filter((rk) => JUTSU_RANK_ORDER[rk] <= maxOrder);
  const blockedJutsuRanks = ALL_JUTSU_RANKS.filter((rk) => JUTSU_RANK_ORDER[rk] > maxOrder);

  const missionCountsByRank = normalizeMissionCountsByRank(
    char.missionCountsByRank,
    char.missionsCompleted
  );
  const missionsCompleted = Math.max(0, char.missionsCompleted || 0);

  const chuninExamRankCheck = meetsMissionRankRequirements(
    missionCountsByRank,
    GRADUATION_RANK_MISSION_REQUIREMENTS.ChuninExam
  );
  const chuninMissionsRankCheck = meetsMissionRankRequirements(
    missionCountsByRank,
    GRADUATION_RANK_MISSION_REQUIREMENTS.ChuninMissions
  );
  const joninRankChecks = {
    tokubetsuJonin: meetsMissionRankRequirements(
      missionCountsByRank,
      GRADUATION_RANK_MISSION_REQUIREMENTS['Tokubetsu Jonin']
    ),
    jonin: meetsMissionRankRequirements(
      missionCountsByRank,
      GRADUATION_RANK_MISSION_REQUIREMENTS.Jonin
    ),
    jouninExperiente: meetsMissionRankRequirements(
      missionCountsByRank,
      GRADUATION_RANK_MISSION_REQUIREMENTS['Jounin Experiente']
    ),
  };

  const missionsProgressPercent = chuninMissionsRankCheck.progressPercent;
  const canTakeAcademyTest = char.rank === 'Estudante da Academia';
  const canTakeBimesterChuninExam =
    char.rank === 'Genin' && !bimesterExamAttempted && chuninExamRankCheck.met;
  const canPromoteChuninByMissions =
    char.rank === 'Genin' && chuninMissionsRankCheck.met;
  const requiresKageAppointment =
    char.rank === 'Chunin' || char.rank === 'Tokubetsu Jonin' || char.rank === 'Jonin';

  let nextPromotionTitle = 'Patente Máxima Shinobi';
  let nextPromotionRule = 'Você já alcançou o ápice da hierarquia técnica de Rank S.';

  if (char.rank === 'Estudante da Academia') {
    nextPromotionTitle = 'Genin (Desbloqueia Jutsus Rank C)';
    nextPromotionRule = `Conclua o Teste da Academia Ninja com aproveitamento mínimo de ${ACADEMY_PASS_SCORE}%.`;
  } else if (char.rank === 'Genin') {
    nextPromotionTitle = 'Chunin (Desbloqueia Jutsus Rank B)';
    nextPromotionRule = `Exame Chunin Bimestral (mín. ${chuninExamRankCheck.summaryText}) OU Carreira de Campo (${chuninMissionsRankCheck.summaryText}).`;
  } else if (char.rank === 'Chunin') {
    nextPromotionTitle = 'Tokubetsu Jonin / Jonin (Desbloqueia Jutsus Rank A)';
    nextPromotionRule = `Nomeação do Kage + cotas por rank — Tokubetsu (${joninRankChecks.tokubetsuJonin.summaryText}) ou Jonin (${joninRankChecks.jonin.summaryText}).`;
  } else if (char.rank === 'Tokubetsu Jonin' || char.rank === 'Jonin') {
    nextPromotionTitle = 'Jounin Experiente (Desbloqueia Jutsus Rank S)';
    nextPromotionRule = `Nomeação do Kage + histórico completo de missões (${joninRankChecks.jouninExperiente.summaryText}).`;
  } else if (char.rank === 'Jounin Experiente' && !char.isKage) {
    nextPromotionTitle = 'Kage da Vila';
    nextPromotionRule = 'Liderança suprema da vila apontada oficialmente pela Administração no ACP.';
  }

  return {
    xpCurrent,
    xpRequired,
    xpPercent,
    xpRemaining,
    chakraXpCurrent,
    chakraXpRequired,
    chakraXpPercent,
    chakraXpRemaining,
    maxJutsuRank,
    unlockedJutsuRanks,
    blockedJutsuRanks,
    missionsCompleted,
    missionCountsByRank,
    chuninExamRankCheck,
    chuninMissionsRankCheck,
    joninRankChecks,
    missionsRequiredForChunin: CHUNIN_MISSION_REQUIREMENT,
    missionsProgressPercent,
    canTakeAcademyTest,
    canTakeBimesterChuninExam,
    canPromoteChuninByMissions,
    requiresKageAppointment,
    nextPromotionTitle,
    nextPromotionRule,
  };
}

// =============================================================================
// SHINOBI PROFESSIONS (CHUNIN & TOKUBETSU JONIN)
// =============================================================================

export function getProfessionByIdOrName(val: string | undefined | null): ProfessionDef | undefined {
  if (!val || val === 'Nenhuma') return undefined;
  return PROFESSIONS.find((p) => p.id === val || p.name === val);
}

export function checkProfessionEligibility(
  char: Pick<CharacterModel, 'rank' | 'profession'>,
  profession: ProfessionDef
): {
  eligible: boolean;
  isActive: boolean;
  reason?: string;
} {
  const isActive = (char.profession || 'Nenhuma') === profession.name;
  const charRankOrder = GRADUATION_RANK_ORDER[char.rank] ?? 0;
  const minRankOrder = GRADUATION_RANK_ORDER[profession.minRank] ?? 2;
  if (charRankOrder < minRankOrder) {
    return {
      eligible: false,
      isActive,
      reason: `Requer graduação mínima: ${profession.minRank} (atual: ${char.rank}).`,
    };
  }
  return { eligible: true, isActive };
}

// =============================================================================
// TACTICAL RPG GRID COMBAT ENGINE (7x5 SQUARE GRID)
// =============================================================================

export const GRID_COLS = 7;
export const GRID_ROWS = 5;

export type TileTerrain = 'ground' | 'rock' | 'water' | 'tree';
export type TileCloudKind = 'none' | 'smoke' | 'soot' | 'mist';

export interface GridCoord {
  x: number;
  y: number;
}

export interface TileCloud {
  kind: Exclude<TileCloudKind, 'none'>;
  turnsRemaining: number;
}

export interface TacticalGridState {
  cols: number;
  rows: number;
  terrain: TileTerrain[][];
  clouds: Record<string, TileCloud>;
  playerPos: GridCoord;
  enemyPos: GridCoord;
}

export function coordKey(c: GridCoord): string {
  return `${c.x},${c.y}`;
}

export function manhattanDistance(a: GridCoord, b: GridCoord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function createTacticalGrid(seedKey: string = 'default'): TacticalGridState {
  const terrain: TileTerrain[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => 'ground' as TileTerrain)
  );

  let hash = 0;
  for (let i = 0; i < seedKey.length; i++) {
    hash = (hash * 31 + seedKey.charCodeAt(i)) % 997;
  }

  // Balanced arena cover: rocks (impassable), trees (cover), and water (Raiton synergy)
  if (hash % 3 === 0) {
    terrain[1][3] = 'rock';
    terrain[3][3] = 'rock';
    terrain[0][2] = 'tree';
    terrain[4][4] = 'tree';
    terrain[2][2] = 'water';
    terrain[2][4] = 'water';
  } else if (hash % 3 === 1) {
    terrain[1][2] = 'tree';
    terrain[3][4] = 'tree';
    terrain[2][3] = 'rock';
    terrain[0][4] = 'water';
    terrain[4][2] = 'water';
  } else {
    terrain[0][3] = 'rock';
    terrain[4][3] = 'rock';
    terrain[2][2] = 'tree';
    terrain[2][4] = 'tree';
    terrain[1][4] = 'water';
    terrain[3][2] = 'water';
  }

  return {
    cols: GRID_COLS,
    rows: GRID_ROWS,
    terrain,
    clouds: {},
    playerPos: { x: 1, y: 2 },
    enemyPos: { x: 5, y: 2 },
  };
}

export function getPlayerMoveRange(stats: Pick<EffectiveStats, 'velocidade'>): number {
  return Math.min(4, 2 + Math.floor(Math.max(0, stats.velocidade) / 14));
}

export function canMoveToTile(
  grid: TacticalGridState,
  from: GridCoord,
  to: GridCoord,
  maxSteps: number,
  occupied?: GridCoord
): boolean {
  if (to.x < 0 || to.x >= grid.cols || to.y < 0 || to.y >= grid.rows) return false;
  if (grid.terrain[to.y][to.x] === 'rock') return false;
  if (occupied && to.x === occupied.x && to.y === occupied.y) return false;
  const dist = manhattanDistance(from, to);
  return dist > 0 && dist <= maxSteps;
}

export function applyTileCloudArea(
  clouds: Record<string, TileCloud>,
  center: GridCoord,
  radius: number,
  kind: Exclude<TileCloudKind, 'none'>,
  turns: number
): Record<string, TileCloud> {
  const next = { ...clouds };
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = center.x + dx;
      const ny = center.y + dy;
      if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
      const key = `${nx},${ny}`;
      const existing = next[key];
      next[key] = {
        kind,
        turnsRemaining: existing ? Math.max(existing.turnsRemaining, turns) : turns,
      };
    }
  }
  return next;
}

export function tickTileClouds(clouds: Record<string, TileCloud>): Record<string, TileCloud> {
  const next: Record<string, TileCloud> = {};
  for (const [k, c] of Object.entries(clouds)) {
    const rem = c.turnsRemaining - 1;
    if (rem > 0) {
      next[k] = { ...c, turnsRemaining: rem };
    }
  }
  return next;
}

export function hasDojutsuPerception(
  clan?: string,
  kekkei?: string,
  sharinganActive: boolean = true
): boolean {
  const c = (clan || '').toLowerCase();
  const k = (kekkei || '').toLowerCase();
  if (
    c.includes('hyuga') ||
    c.includes('hyuuga') ||
    c.includes('otsutsuki') ||
    k.includes('byakugan') ||
    k.includes('rinnegan')
  ) {
    return true;
  }
  if (c.includes('uchiha') || k.includes('sharingan')) {
    return sharinganActive !== false;
  }
  return false;
}

export function canUseSecretAction(
  grid: TacticalGridState,
  playerPos: GridCoord,
  enemyPos: GridCoord,
  enemyClan?: string,
  enemyKekkei?: string
): {
  allowed: boolean;
  concealed: boolean;
  cloudAtPlayer: TileCloudKind;
  enemySeesThrough: boolean;
  reason: string;
} {
  const playerTileCloud: TileCloud | undefined = grid.clouds[coordKey(playerPos)];
  const enemyTileCloud: TileCloud | undefined = grid.clouds[coordKey(enemyPos)];
  const cloudAtPlayer: TileCloudKind = playerTileCloud ? playerTileCloud.kind : 'none';
  const cloudAtEnemy: TileCloudKind = enemyTileCloud ? enemyTileCloud.kind : 'none';
  const enemySeesThrough = hasDojutsuPerception(enemyClan, enemyKekkei);

  if (enemySeesThrough) {
    return {
      allowed: false,
      concealed: false,
      cloudAtPlayer,
      enemySeesThrough: true,
      reason:
        'Oponente possui Byakugan/Sharingan: a percepção ocular enxerga através de fumaça, fuligem e ações ocultas.',
    };
  }

  // Also check if midpoint along line of sight has smoke/soot/mist
  const midX = Math.round((playerPos.x + enemyPos.x) / 2);
  const midY = Math.round((playerPos.y + enemyPos.y) / 2);
  const midTileCloud: TileCloud | undefined = grid.clouds[`${midX},${midY}`];
  const cloudAtMid: TileCloudKind = midTileCloud ? midTileCloud.kind : 'none';

  const hasVisualObstruction =
    cloudAtPlayer !== 'none' || cloudAtEnemy !== 'none' || cloudAtMid !== 'none';

  if (!hasVisualObstruction) {
    return {
      allowed: false,
      concealed: false,
      cloudAtPlayer,
      enemySeesThrough: false,
      reason:
        'Campo limpo: o oponente vê todos os seus movimentos. Lance Bomba de Fumaça, Papel Bomba ou Katon (Fuligem) antes de preparar uma Ação Secreta.',
    };
  }

  const label =
    cloudAtPlayer === 'soot' || cloudAtMid === 'soot'
      ? 'Fuligem'
      : cloudAtPlayer === 'mist' || cloudAtMid === 'mist'
      ? 'Névoa'
      : 'Fumaça';

  return {
    allowed: true,
    concealed: true,
    cloudAtPlayer,
    enemySeesThrough: false,
    reason: `Campo coberto por ${label}! Visão inimiga bloqueada — Ação Secreta pronta para execução furtiva.`,
  };
}

export function getJutsuGridRange(
  jutsu: Pick<JutsuDef, 'category' | 'nature' | 'healRatio'>
): { minRange: number; maxRange: number } {
  if (jutsu.category === 'Iryou') return { minRange: 0, maxRange: 2 };
  if (jutsu.category === 'Taijutsu') return { minRange: 1, maxRange: 2 };
  if (jutsu.category === 'Kenjutsu') return { minRange: 1, maxRange: 2 };
  if (jutsu.category === 'Fuinjutsu') return { minRange: 1, maxRange: 3 };
  if (jutsu.category === 'Genjutsu') return { minRange: 1, maxRange: 5 };
  if (jutsu.category === 'Kuchiyose') return { minRange: 1, maxRange: 5 };
  return { minRange: 1, maxRange: 4 };
}

export function computeKnockbackTile(
  grid: TacticalGridState,
  attackerPos: GridCoord,
  targetPos: GridCoord,
  steps: number = 1
): GridCoord {
  if (steps <= 0) return targetPos;
  const dx = targetPos.x - attackerPos.x;
  const dy = targetPos.y - attackerPos.y;
  const stepX = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0;
  const stepY = stepX === 0 ? Math.sign(dy) : 0;
  let current = { ...targetPos };
  for (let i = 0; i < steps; i++) {
    const candidate = { x: current.x + stepX, y: current.y + stepY };
    if (
      candidate.x < 0 ||
      candidate.x >= grid.cols ||
      candidate.y < 0 ||
      candidate.y >= grid.rows ||
      grid.terrain[candidate.y][candidate.x] === 'rock' ||
      (candidate.x === attackerPos.x && candidate.y === attackerPos.y)
    ) {
      break;
    }
    current = candidate;
  }
  return current;
}

export function computeEnemyGridMove(
  grid: TacticalGridState,
  enemyPos: GridCoord,
  playerPos: GridCoord,
  preferredRange: number = 2
): GridCoord {
  const currentDist = manhattanDistance(enemyPos, playerPos);
  if (currentDist <= preferredRange && currentDist >= 1) {
    return enemyPos;
  }

  let best = { ...enemyPos };
  let bestScore = Math.abs(currentDist - preferredRange);

  const candidates: GridCoord[] = [];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const distMove = Math.abs(dx) + Math.abs(dy);
      if (distMove === 0 || distMove > 2) continue;
      const nx = enemyPos.x + dx;
      const ny = enemyPos.y + dy;
      if (nx < 0 || nx >= grid.cols || ny < 0 || ny >= grid.rows) continue;
      if (grid.terrain[ny][nx] === 'rock') continue;
      if (nx === playerPos.x && ny === playerPos.y) continue;
      candidates.push({ x: nx, y: ny });
    }
  }

  for (const c of candidates) {
    const distToPlayer = manhattanDistance(c, playerPos);
    const score = Math.abs(distToPlayer - preferredRange);
    const coverBonus = grid.terrain[c.y][c.x] === 'tree' ? -0.2 : 0;
    if (score + coverBonus < bestScore) {
      bestScore = score + coverBonus;
      best = c;
    }
  }
  return best;
}

export interface MeleeStrikeSpec {
  id: 'soco_direto' | 'chute_giratorio' | 'combo_soco_chute';
  name: string;
  minRange: number;
  maxRange: number;
  chakraCost: number;
  basePower: number;
  accuracyMod: number;
  critBonus: number;
  knockbackTiles: number;
  effects: JutsuEffectSpec[];
  description: string;
}

export const MELEE_STRIKES: MeleeStrikeSpec[] = [
  {
    id: 'soco_direto',
    name: 'Soco Direto de Impacto',
    minRange: 1,
    maxRange: 1,
    chakraCost: 0,
    basePower: 28,
    accuracyMod: 12,
    critBonus: 8,
    knockbackTiles: 0,
    effects: [
      {
        type: 'crush',
        target: 'enemy',
        chance: 45,
        duration: 1,
        label: 'Guarda Abalada (45%, 1t)',
      },
    ],
    description: 'Golpe físico fechado (alcance 1 casa, 0 Chakra) com alta precisão e quebra de guarda.',
  },
  {
    id: 'chute_giratorio',
    name: 'Chute Giratório Tático',
    minRange: 1,
    maxRange: 1,
    chakraCost: 0,
    basePower: 33,
    accuracyMod: 8,
    critBonus: 14,
    knockbackTiles: 1,
    effects: [],
    description: 'Chute potente (alcance 1 casa, 0 Chakra) que empurra o inimigo 1 casa no grid.',
  },
  {
    id: 'combo_soco_chute',
    name: 'Sequência Soco + Chute',
    minRange: 1,
    maxRange: 1,
    chakraCost: 6,
    basePower: 42,
    accuracyMod: 10,
    critBonus: 16,
    knockbackTiles: 1,
    effects: [
      {
        type: 'crush',
        target: 'enemy',
        chance: 65,
        duration: 2,
        label: 'Esmagamento (65%, 2t)',
      },
    ],
    description: 'Combinação contínua de soco e chute (alcance 1 casa, 6 CH) com esmagamento e empurrão.',
  },
];

export interface SecretActionDef {
  id: 'secret_ambush_strike' | 'secret_snare_trap' | 'secret_shadow_clone_decoy';
  name: string;
  chakraCost: number;
  minRange: number;
  maxRange: number;
  basePower: number;
  accuracyMod: number;
  critBonus: number;
  appliesEffect?: StatusEffectType;
  grantsSelfShield?: boolean;
  description: string;
}

export const SECRET_ACTION_CATALOG: SecretActionDef[] = [
  {
    id: 'secret_ambush_strike',
    name: 'Ação Secreta: Emboscada Oculta',
    chakraCost: 12,
    minRange: 1,
    maxRange: 4,
    basePower: 64,
    accuracyMod: 25,
    critBonus: 28,
    appliesEffect: 'bleed',
    description:
      'Ataque surpresa preparado sem que o inimigo veja através da fumaça/fuligem (+25% precisão, +28% crítico e Laceração).',
  },
  {
    id: 'secret_snare_trap',
    name: 'Ação Secreta: Armadilha de Fios & Selo',
    chakraCost: 14,
    minRange: 1,
    maxRange: 4,
    basePower: 48,
    accuracyMod: 28,
    critBonus: 18,
    appliesEffect: 'paralysis',
    description:
      'Posiciona fios invisíveis na névoa/fuligem, prendendo e aplicando Paralisia ao alvo desavisado.',
  },
  {
    id: 'secret_shadow_clone_decoy',
    name: 'Ação Secreta: Isca & Contra-Golpe',
    chakraCost: 15,
    minRange: 1,
    maxRange: 5,
    basePower: 52,
    accuracyMod: 24,
    critBonus: 22,
    grantsSelfShield: true,
    description:
      'Substitui sua posição por um clone oculto na fumaça, ganhando Escudo (+30% defesa) e atacando pelo flanco.',
  },
];

// ============================================================================
// POST-MISSION LOOT & REPORT ENGINE
// ============================================================================

export interface MissionLootDrop {
  itemId: string;
  name: string;
  category: ItemDef['category'];
  rarity: ItemDef['rarity'];
  qty: number;
  imageUrl?: string;
  description: string;
  statBonuses: ItemDef['statBonuses'];
  healHp?: number;
  healChakra?: number;
  valueRyo: number;
  isRareOrAbove: boolean;
}

export interface CharacterProgressSnapshot {
  prevLevel: number;
  newLevel: number;
  prevXp: number;
  newXp: number;
  xpNeeded: number;
  prevChakraLevel: number;
  newChakraLevel: number;
  prevChakraXp: number;
  newChakraXp: number;
  chakraXpNeeded: number;
  prevRyo: number;
  newRyo: number;
  prevRank: string;
  newRank: string;
}

export interface PostMissionReportData {
  missionId: string;
  missionTitle: string;
  missionRank: 'D' | 'C' | 'B' | 'A' | 'S';
  missionVillage: string;
  enemyName: string;
  won: boolean;
  turnsElapsed: number;
  rewards: {
    xp: number;
    chakraXp: number;
    ryo: number;
    merit: number;
    baseRyo?: number;
    geopoliticalBonusRyo?: number;
    geopoliticalBonusMerit?: number;
  };
  geopoliticalBonusPct: number;
  activeConflictFront?: string | null;
  isWarMission?: boolean;
  staminaSpent?: number;
  remainingStamina?: number;
  maxStamina?: number;
  ocularSummary?: {
    leftBlindness: number;
    rightBlindness: number;
    visionLabel: string;
    events: string[];
  } | null;
  lootDrops: MissionLootDrop[];
  progress: CharacterProgressSnapshot;
  leveledUp: boolean;
  chakraLeveledUp: boolean;
  rankPromoted: boolean;
  becameKage: boolean;
  completedAt: string;
}

const RARITY_ORDER_SCORE: Record<ItemDef['rarity'], number> = {
  Lendário: 4,
  Épico: 3,
  Raro: 2,
  Comum: 1,
};

const MISSION_LOOT_WEIGHTS: Record<
  'D' | 'C' | 'B' | 'A' | 'S',
  { rolls: number; extraRollChance: number; weights: Record<ItemDef['rarity'], number> }
> = {
  D: {
    rolls: 1,
    extraRollChance: 0.35,
    weights: { Comum: 62, Raro: 32, Épico: 6, Lendário: 0 },
  },
  C: {
    rolls: 1,
    extraRollChance: 0.55,
    weights: { Comum: 40, Raro: 42, Épico: 15, Lendário: 3 },
  },
  B: {
    rolls: 2,
    extraRollChance: 0.35,
    weights: { Comum: 20, Raro: 46, Épico: 27, Lendário: 7 },
  },
  A: {
    rolls: 2,
    extraRollChance: 0.65,
    weights: { Comum: 8, Raro: 36, Épico: 40, Lendário: 16 },
  },
  S: {
    rolls: 2,
    extraRollChance: 0.85,
    weights: { Comum: 0, Raro: 22, Épico: 46, Lendário: 32 },
  },
};

function pickWeightedRarity(
  weights: Record<ItemDef['rarity'], number>,
  rng: () => number,
): ItemDef['rarity'] {
  const entries = Object.entries(weights) as Array<[ItemDef['rarity'], number]>;
  const total = entries.reduce((acc, [, w]) => acc + Math.max(0, w), 0);
  if (total <= 0) return 'Comum';
  let cursor = rng() * total;
  for (const [rarity, weight] of entries) {
    if (weight <= 0) continue;
    if (cursor < weight) return rarity;
    cursor -= weight;
  }
  return entries[entries.length - 1][0];
}

export function isSevenMistSwordId(itemId: string): boolean {
  return (SEVEN_MIST_SWORD_IDS as readonly string[]).includes(itemId);
}

export function canOwnOrEquipItem(
  char: Pick<CharacterModel, 'village'>,
  item: Pick<ItemDef, 'id' | 'name' | 'villageRequired' | 'isSevenMistSword'>
): { allowed: boolean; reason?: string } {
  const requiresKiri = Boolean(item.isSevenMistSword || isSevenMistSwordId(item.id));
  const requiredVillage = requiresKiri ? 'Kirigakure' : item.villageRequired;
  if (requiredVillage && char.village !== requiredVillage) {
    return {
      allowed: false,
      reason: requiresKiri
        ? `Exclusivo de Kirigakure: apenas ninjas da Névoa Oculta podem possuir ou empunhar ${item.name} (Sete Espadas da Névoa).`
        : `Equipamento restrito a ninjas de ${requiredVillage}.`,
    };
  }
  return { allowed: true };
}

export function rollMissionLootDrops(
  missionRank: 'D' | 'C' | 'B' | 'A' | 'S',
  charLevel: number,
  charVillage: string,
  rng: () => number = Math.random,
): MissionLootDrop[] {
  const cfg = MISSION_LOOT_WEIGHTS[missionRank] || MISSION_LOOT_WEIGHTS.D;
  const eligibleItems = ITEM_CATALOG.filter(
    (it) => canOwnOrEquipItem({ village: charVillage }, it).allowed,
  );
  if (eligibleItems.length === 0) return [];

  const levelBonusShift = Math.min(10, Math.floor(Math.max(0, charLevel - 1) / 3));
  const adjustedWeights: Record<ItemDef['rarity'], number> = {
    Comum: Math.max(0, cfg.weights.Comum - levelBonusShift),
    Raro: cfg.weights.Raro + Math.ceil(levelBonusShift * 0.5),
    Épico: cfg.weights.Épico + Math.floor(levelBonusShift * 0.35),
    Lendário:
      missionRank === 'D'
        ? 0
        : cfg.weights.Lendário + Math.floor(levelBonusShift * 0.15),
  };

  let totalRolls = cfg.rolls + (rng() < cfg.extraRollChance ? 1 : 0);
  totalRolls = Math.max(1, Math.min(3, totalRolls));

  const pickedMap = new Map<string, MissionLootDrop>();

  for (let i = 0; i < totalRolls; i++) {
    let targetRarity = pickWeightedRarity(adjustedWeights, rng);
    // Guarantee at least 1 Épico or Lendário on Rank S first roll
    if (missionRank === 'S' && i === 0 && RARITY_ORDER_SCORE[targetRarity] < 3) {
      targetRarity = rng() < 0.42 ? 'Lendário' : 'Épico';
    }

    let pool = eligibleItems.filter((it) => it.rarity === targetRarity);
    // Slightly favor mission-exclusive dropOnly relics when rolling Raro/Épico/Lendário
    const dropOnlyPool = pool.filter((it) => it.dropOnly);
    if (dropOnlyPool.length > 0 && rng() < 0.62) {
      pool = dropOnlyPool;
    }
    if (pool.length === 0) {
      pool = eligibleItems;
    }

    const idx = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
    const chosen = pool[idx];
    const existing = pickedMap.get(chosen.id);
    if (existing) {
      existing.qty += 1;
    } else {
      pickedMap.set(chosen.id, {
        itemId: chosen.id,
        name: chosen.name,
        category: chosen.category,
        rarity: chosen.rarity,
        qty: 1,
        imageUrl: chosen.imageUrl,
        description: chosen.description,
        statBonuses: chosen.statBonuses,
        healHp: chosen.healHp,
        healChakra: chosen.healChakra,
        valueRyo: chosen.priceRyo,
        isRareOrAbove: RARITY_ORDER_SCORE[chosen.rarity] >= 2,
      });
    }
  }

  return Array.from(pickedMap.values()).sort(
    (a, b) => RARITY_ORDER_SCORE[b.rarity] - RARITY_ORDER_SCORE[a.rarity],
  );
}

export function mergeLootIntoInventory(
  inventory: Array<{ itemId: string; qty: number }>,
  drops: Array<{ itemId: string; qty: number }>,
): Array<{ itemId: string; qty: number }> {
  const next = inventory.map((entry) => ({ itemId: entry.itemId, qty: entry.qty }));
  for (const drop of drops) {
    if (!drop.itemId || drop.qty <= 0) continue;
    const found = next.find((entry) => entry.itemId === drop.itemId);
    if (found) {
      found.qty += drop.qty;
    } else {
      next.push({ itemId: drop.itemId, qty: drop.qty });
    }
  }
  return next;
}

// ============================================================================
// GEOPOLITICS & DIPLOMACY ENGINE
// ============================================================================

export function makeVillagePairKey(villageA: string, villageB: string): string {
  const a = villageA.trim();
  const b = villageB.trim();
  return a.localeCompare(b, 'pt-BR') <= 0 ? `${a}::${b}` : `${b}::${a}`;
}

export function buildDefaultGeopoliticsState(): GeopoliticsWorldState {
  const now = new Date().toISOString();
  const relations: Record<string, GeopoliticalRelation> = {};
  for (const seed of DEFAULT_GEOPOLITICAL_RELATIONS) {
    if (seed.villageA === seed.villageB) continue;
    const pairKey = makeVillagePairKey(seed.villageA, seed.villageB);
    const [vA, vB] = pairKey.split('::');
    relations[pairKey] = {
      pairKey,
      villageA: vA,
      villageB: vB,
      status: seed.status,
      treatyTitle: seed.treatyTitle.trim(),
      updatedAt: now,
      updatedBy: 'Conselho das Nações',
    };
  }
  const conflicts: GeopoliticalConflict[] = DEFAULT_GEOPOLITICAL_CONFLICTS.map((c) => ({ ...c }));
  return {
    relations,
    conflicts,
    updatedAt: now,
  };
}

export function normalizeGeopoliticsState(raw: unknown): GeopoliticsWorldState {
  if (!raw || typeof raw !== 'object') {
    return buildDefaultGeopoliticsState();
  }
  const candidate = raw as Partial<GeopoliticsWorldState>;
  if (!candidate.relations || typeof candidate.relations !== 'object' || !Array.isArray(candidate.conflicts)) {
    return buildDefaultGeopoliticsState();
  }
  return {
    relations: candidate.relations,
    conflicts: candidate.conflicts,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
  };
}

export function getActiveConflictsForVillage(
  state: GeopoliticsWorldState,
  villageName: string,
): GeopoliticalConflict[] {
  return state.conflicts.filter(
    (c) => c.active && (c.villageA === villageName || c.villageB === villageName),
  );
}

export function getGeopoliticalMissionBonus(
  state: GeopoliticsWorldState,
  villageName: string,
): { bonusPct: number; frontName: string | null; opponentVillage: string | null } {
  const active = getActiveConflictsForVillage(state, villageName);
  if (active.length === 0) {
    return { bonusPct: 0, frontName: null, opponentVillage: null };
  }
  const top = [...active].sort((a, b) => b.intensity - a.intensity)[0];
  const opponentVillage = top.villageA === villageName ? top.villageB : top.villageA;
  return {
    bonusPct: top.bonusRyoPct || 15,
    frontName: top.frontName,
    opponentVillage,
  };
}

export interface VillageDiplomaticPeer {
  village: VillageInfo;
  status: DiplomaticStatus;
  treatyTitle: string;
  inActiveConflict: boolean;
  conflict?: GeopoliticalConflict;
  updatedBy?: string;
}

export interface VillageGeopoliticsOverview {
  targetVillage: VillageInfo;
  allies: VillageDiplomaticPeer[];
  enemies: VillageDiplomaticPeer[];
  neutrals: VillageDiplomaticPeer[];
  activeConflicts: GeopoliticalConflict[];
  globalActiveConflicts: GeopoliticalConflict[];
}

export function getRelationBetweenVillages(
  state: GeopoliticsWorldState,
  villageA: string,
  villageB: string,
): {
  status: DiplomaticStatus;
  treatyTitle: string;
  inActiveConflict: boolean;
  conflict?: GeopoliticalConflict;
  updatedBy?: string;
} {
  if (villageA === villageB) {
    return { status: 'allied', treatyTitle: 'Território Soberano', inActiveConflict: false };
  }
  const activeConflict = state.conflicts.find(
    (c) =>
      c.active &&
      ((c.villageA === villageA && c.villageB === villageB) ||
        (c.villageA === villageB && c.villageB === villageA)),
  );
  const key = makeVillagePairKey(villageA, villageB);
  const rel = state.relations[key];
  if (activeConflict) {
    return {
      status: 'enemy',
      treatyTitle: rel?.treatyTitle || activeConflict.frontName,
      inActiveConflict: true,
      conflict: activeConflict,
      updatedBy: rel?.updatedBy,
    };
  }
  if (!rel) {
    return {
      status: 'neutral',
      treatyTitle: 'Não-Agressão & Comércio Regular',
      inActiveConflict: false,
    };
  }
  return {
    status: rel.status,
    treatyTitle: rel.treatyTitle || 'Tratado Diplomático',
    inActiveConflict: false,
    updatedBy: rel.updatedBy,
  };
}

export function getVillageGeopoliticsOverview(
  state: GeopoliticsWorldState,
  targetVillageName: string,
): VillageGeopoliticsOverview {
  const targetVillage =
    VILLAGES.find((v) => v.name === targetVillageName) || VILLAGES[0];
  const allies: VillageDiplomaticPeer[] = [];
  const enemies: VillageDiplomaticPeer[] = [];
  const neutrals: VillageDiplomaticPeer[] = [];

  for (const peer of VILLAGES) {
    if (peer.name === targetVillage.name) continue;
    const info = getRelationBetweenVillages(state, targetVillage.name, peer.name);
    const entry: VillageDiplomaticPeer = {
      village: peer,
      status: info.status,
      treatyTitle: info.treatyTitle,
      inActiveConflict: info.inActiveConflict,
      conflict: info.conflict,
      updatedBy: info.updatedBy,
    };
    if (info.status === 'allied') allies.push(entry);
    else if (info.status === 'enemy') enemies.push(entry);
    else neutrals.push(entry);
  }

  enemies.sort((a, b) => Number(b.inActiveConflict) - Number(a.inActiveConflict));

  return {
    targetVillage,
    allies,
    enemies,
    neutrals,
    activeConflicts: getActiveConflictsForVillage(state, targetVillage.name),
    globalActiveConflicts: state.conflicts.filter((c) => c.active),
  };
}

export function setBilateralRelation(
  state: GeopoliticsWorldState,
  villageA: string,
  villageB: string,
  status: DiplomaticStatus,
  treatyTitle: string,
  actorName: string,
): GeopoliticsWorldState {
  if (!villageA || !villageB || villageA === villageB) return state;
  const now = new Date().toISOString();
  const key = makeVillagePairKey(villageA, villageB);
  const [vA, vB] = key.split('::');
  const nextRelations = { ...state.relations };
  nextRelations[key] = {
    pairKey: key,
    villageA: vA,
    villageB: vB,
    status,
    treatyTitle:
      treatyTitle.trim() ||
      (status === 'allied'
        ? 'Aliança Estratégica Oficial'
        : status === 'enemy'
          ? 'Hostilidade Declarada'
          : 'Neutralidade Diplomática'),
    updatedAt: now,
    updatedBy: actorName,
  };

  // If peace/alliance or neutrality is signed, end any active armed clash between the pair
  const nextConflicts = state.conflicts.map((c) => {
    const matchesPair =
      (c.villageA === villageA && c.villageB === villageB) ||
      (c.villageA === villageB && c.villageB === villageA);
    if (matchesPair && status !== 'enemy' && c.active) {
      return { ...c, active: false };
    }
    return c;
  });

  return {
    relations: nextRelations,
    conflicts: nextConflicts,
    updatedAt: now,
  };
}

export function upsertOrResolveConflict(
  state: GeopoliticsWorldState,
  payload: {
    villageA: string;
    villageB: string;
    frontName?: string;
    conflictType?: string;
    intensity?: number;
    summary?: string;
    active: boolean;
    actorName: string;
  },
): GeopoliticsWorldState {
  const { villageA, villageB, active, actorName } = payload;
  if (!villageA || !villageB || villageA === villageB) return state;
  const now = new Date().toISOString();
  const existingIdx = state.conflicts.findIndex(
    (c) =>
      (c.villageA === villageA && c.villageB === villageB) ||
      (c.villageA === villageB && c.villageB === villageA),
  );

  const nextConflicts = [...state.conflicts];
  const safeIntensity = Math.max(25, Math.min(100, Math.round(payload.intensity ?? 80)));

  if (existingIdx >= 0) {
    const prev = nextConflicts[existingIdx];
    nextConflicts[existingIdx] = {
      ...prev,
      frontName: payload.frontName?.trim() || prev.frontName,
      conflictType: payload.conflictType?.trim() || prev.conflictType,
      intensity: safeIntensity,
      summary: payload.summary?.trim() || prev.summary,
      active,
    };
  } else if (active) {
    nextConflicts.unshift({
      id: `conflict_${Date.now()}`,
      villageA,
      villageB,
      frontName: payload.frontName?.trim() || `Fronteira ${villageA}–${villageB}`,
      conflictType: payload.conflictType?.trim() || 'Confronto Militar Aberto',
      intensity: safeIntensity,
      summary:
        payload.summary?.trim() ||
        `Forças de ${villageA} e ${villageB} mobilizaram esquadrões na zona limítrofe em estado de guerra aberta.`,
      bonusRyoPct: 15,
      active: true,
      startedAt: 'Mobilização Recente',
    });
  }

  const nextRelations = { ...state.relations };
  const key = makeVillagePairKey(villageA, villageB);
  const [vA, vB] = key.split('::');
  if (active) {
    nextRelations[key] = {
      pairKey: key,
      villageA: vA,
      villageB: vB,
      status: 'enemy',
      treatyTitle: payload.frontName?.trim() || 'Confronto Armado em Curso',
      updatedAt: now,
      updatedBy: actorName,
    };
  }

  return {
    relations: nextRelations,
    conflicts: nextConflicts,
    updatedAt: now,
  };
}

// ============================================================================
// STAMINA RECOVERY & MISSION FATIGUE ENGINE (TIME-GATED ANTI-RUSH)
// ============================================================================

export const DEFAULT_MAX_STAMINA = 100;
export const STAMINA_RECOVERY_INTERVAL_MS = 2 * 60 * 1000; // +1 STA every 2 minutes (+30 STA/hour)

export const MISSION_STAMINA_COSTS: Record<'D' | 'C' | 'B' | 'A' | 'S', number> = {
  D: 18,
  C: 24,
  B: 30,
  A: 38,
  S: 45,
};

export function getMissionStaminaCost(
  rank: 'D' | 'C' | 'B' | 'A' | 'S',
  isWarOrSpecialQuest: boolean = false
): number {
  const base = MISSION_STAMINA_COSTS[rank] ?? 24;
  return isWarOrSpecialQuest ? Math.max(26, base) : base;
}

export interface StaminaComputation {
  stamina: number;
  maxStamina: number;
  secondsUntilNextPoint: number;
  secondsUntilFull: number;
  isFull: boolean;
  effectiveUpdatedAtMs: number;
}

export function computeCurrentStamina(
  char: Pick<CharacterModel, 'stamina' | 'maxStamina' | 'staminaUpdatedAt'>,
  nowMs: number = Date.now()
): StaminaComputation {
  const maxStamina = Math.max(50, Math.round(char.maxStamina ?? DEFAULT_MAX_STAMINA));
  const rawStored = char.stamina ?? maxStamina;
  const storedStamina = Math.max(0, Math.min(maxStamina, Math.round(rawStored)));

  if (storedStamina >= maxStamina) {
    return {
      stamina: maxStamina,
      maxStamina,
      secondsUntilNextPoint: 0,
      secondsUntilFull: 0,
      isFull: true,
      effectiveUpdatedAtMs: nowMs,
    };
  }

  let updatedMs = nowMs;
  if (char.staminaUpdatedAt) {
    const parsed =
      char.staminaUpdatedAt instanceof Date
        ? char.staminaUpdatedAt.getTime()
        : new Date(char.staminaUpdatedAt).getTime();
    if (Number.isFinite(parsed)) {
      updatedMs = parsed;
    }
  }

  const elapsedMs = Math.max(0, nowMs - updatedMs);
  const recoveredPoints = Math.floor(elapsedMs / STAMINA_RECOVERY_INTERVAL_MS);
  const stamina = Math.min(maxStamina, storedStamina + recoveredPoints);

  if (stamina >= maxStamina) {
    return {
      stamina: maxStamina,
      maxStamina,
      secondsUntilNextPoint: 0,
      secondsUntilFull: 0,
      isFull: true,
      effectiveUpdatedAtMs: nowMs,
    };
  }

  const remainderMs = elapsedMs % STAMINA_RECOVERY_INTERVAL_MS;
  const msUntilNext = STAMINA_RECOVERY_INTERVAL_MS - remainderMs;
  const secondsUntilNextPoint = Math.max(1, Math.ceil(msUntilNext / 1000));
  const remainingAfterNext = Math.max(0, maxStamina - stamina - 1);
  const secondsUntilFull = Math.max(
    1,
    Math.ceil((msUntilNext + remainingAfterNext * STAMINA_RECOVERY_INTERVAL_MS) / 1000)
  );
  const effectiveUpdatedAtMs = updatedMs + recoveredPoints * STAMINA_RECOVERY_INTERVAL_MS;

  return {
    stamina,
    maxStamina,
    secondsUntilNextPoint,
    secondsUntilFull,
    isFull: false,
    effectiveUpdatedAtMs,
  };
}

export function consumeCharacterStamina(
  char: Pick<CharacterModel, 'stamina' | 'maxStamina' | 'staminaUpdatedAt' | 'village'>,
  requiredCost: number,
  nowMs: number = Date.now()
): {
  allowed: boolean;
  currentStamina: number;
  remainingStamina: number;
  maxStamina: number;
  cost: number;
  deficit: number;
  waitSeconds: number;
  waitMinutes: number;
  nextUpdatedAt: Date;
  reason?: string;
} {
  const safeCost = Math.max(0, Math.round(requiredCost));
  const computed = computeCurrentStamina(char, nowMs);

  if (computed.stamina < safeCost) {
    const deficit = safeCost - computed.stamina;
    const waitSeconds =
      computed.secondsUntilNextPoint +
      Math.max(0, deficit - 1) * Math.floor(STAMINA_RECOVERY_INTERVAL_MS / 1000);
    const waitMinutes = Math.max(1, Math.ceil(waitSeconds / 60));
    return {
      allowed: false,
      currentStamina: computed.stamina,
      remainingStamina: computed.stamina,
      maxStamina: computed.maxStamina,
      cost: safeCost,
      deficit,
      waitSeconds,
      waitMinutes,
      nextUpdatedAt: new Date(computed.effectiveUpdatedAtMs),
      reason: `Stamina insuficiente (${computed.stamina}/${safeCost} STA). Seu personagem precisa descansar cerca de ${waitMinutes} min para recuperar +${deficit} STA. Aproveite o descanso para interagir nos locais Play-by-Forum de ${char.village || 'sua vila'}!`,
    };
  }

  const remainingStamina = Math.max(0, computed.stamina - safeCost);
  const nextUpdatedAt = computed.isFull
    ? new Date(nowMs)
    : new Date(computed.effectiveUpdatedAtMs);

  return {
    allowed: true,
    currentStamina: computed.stamina,
    remainingStamina,
    maxStamina: computed.maxStamina,
    cost: safeCost,
    deficit: 0,
    waitSeconds: 0,
    waitMinutes: 0,
    nextUpdatedAt,
  };
}

export function formatStaminaCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ============================================================================
// OCULAR BLINDNESS (IZANAGI / IZANAMI INSTANT + MANGEKYOU BUILDUP) & SHARINGAN COMBAT ACTIVATION
// ============================================================================

export const IZANAGI_IZANAMI_JUTSU_IDS = new Set<string>([
  'uchiha_izanagi',
  'izanagi',
  'uchiha_izanami',
  'izanami',
]);

export const MANGEKYOU_STRAIN_TABLE: Record<string, { left: number; right: number }> = {
  amaterasu: { left: 16, right: 10 },
  enton_kagutsuchi: { left: 12, right: 18 },
  kagutsuchi_enton: { left: 12, right: 18 },
  tsukuyomi: { left: 18, right: 12 },
  kamui: { left: 14, right: 18 },
  yasaka_magatama: { left: 15, right: 15 },
  yasaka_no_magatama: { left: 15, right: 15 },
  susanoo: { left: 20, right: 20 },
  kotoamatsukami: { left: 24, right: 24 },
};

export interface OcularStateSummary {
  leftBlindness: number;
  rightBlindness: number;
  leftLightPct: number;
  rightLightPct: number;
  leftSealed: boolean;
  rightSealed: boolean;
  bothBlind: boolean;
  usableEyes: 0 | 1 | 2;
  averageBlindness: number;
  accuracyPenalty: number;
  evasionPenalty: number;
  visionLabel: string;
}

export function getOcularState(
  char: Pick<CharacterModel, 'leftEyeBlindness' | 'rightEyeBlindness'>
): OcularStateSummary {
  const leftBlindness = Math.max(0, Math.min(100, Math.round(char.leftEyeBlindness ?? 0)));
  const rightBlindness = Math.max(0, Math.min(100, Math.round(char.rightEyeBlindness ?? 0)));
  const leftLightPct = 100 - leftBlindness;
  const rightLightPct = 100 - rightBlindness;
  const leftSealed = leftBlindness >= 100;
  const rightSealed = rightBlindness >= 100;
  const bothBlind = leftSealed && rightSealed;
  const usableEyes = ((leftSealed ? 0 : 1) + (rightSealed ? 0 : 1)) as 0 | 1 | 2;
  const averageBlindness = Math.round((leftBlindness + rightBlindness) / 2);

  let accuracyPenalty = 0;
  let evasionPenalty = 0;
  let visionLabel = 'Visão Ocular Íntegra';

  if (bothBlind) {
    accuracyPenalty = 28;
    evasionPenalty = 16;
    visionLabel = 'Cegueira Total (Luz Ocular Extinta nos 2 Olhos)';
  } else if (leftSealed || rightSealed) {
    const remainingEyeBlindness = Math.min(leftBlindness, rightBlindness);
    accuracyPenalty = 10 + Math.floor(remainingEyeBlindness / 8);
    evasionPenalty = 6 + Math.floor(remainingEyeBlindness / 20);
    visionLabel = leftSealed
      ? `Olho Esquerdo Cego (Luz Direita ${rightLightPct}%)`
      : `Olho Direito Cego (Luz Esquerda ${leftLightPct}%)`;
  } else if (averageBlindness >= 75) {
    accuracyPenalty = 12;
    evasionPenalty = 6;
    visionLabel = 'Penumbra Severa (Mangekyou à Beira da Cegueira)';
  } else if (averageBlindness >= 50) {
    accuracyPenalty = 7;
    evasionPenalty = 3;
    visionLabel = 'Visão Turva & Sangramento Ocular';
  } else if (averageBlindness >= 25) {
    accuracyPenalty = 3;
    evasionPenalty = 0;
    visionLabel = 'Desgaste Ocular Progressivo';
  }

  return {
    leftBlindness,
    rightBlindness,
    leftLightPct,
    rightLightPct,
    leftSealed,
    rightSealed,
    bothBlind,
    usableEyes,
    averageBlindness,
    accuracyPenalty,
    evasionPenalty,
    visionLabel,
  };
}

export function isInstantBlindnessKinjutsu(jutsuId?: string | null): boolean {
  if (!jutsuId) return false;
  return IZANAGI_IZANAMI_JUTSU_IDS.has(jutsuId.trim().toLowerCase());
}

export function isMangekyouJutsu(
  jutsu: Pick<JutsuDef, 'id'> & { kekkeiRequired?: string | null }
): boolean {
  const id = (jutsu.id || '').trim().toLowerCase();
  if (id in MANGEKYOU_STRAIN_TABLE) return true;
  const req = (jutsu.kekkeiRequired || '').trim().toLowerCase();
  return req === 'mangekyo sharingan' || req === 'mangekyou sharingan';
}

export function isSharinganRequiredJutsu(
  jutsu: Pick<JutsuDef, 'id'> & { kekkeiRequired?: string | null }
): boolean {
  if (isInstantBlindnessKinjutsu(jutsu.id)) return true;
  if (isMangekyouJutsu(jutsu)) return true;
  const req = (jutsu.kekkeiRequired || '').trim().toLowerCase();
  return req.includes('sharingan');
}

export function getSharinganCombatConfig(stage: 0 | 1 | 2 | 3 | 4): {
  canEverActivate: boolean;
  activationChakra: number;
  upkeepChakra: number;
  shortTitle: string;
  bonusBadge: string;
} {
  if (stage === 1) {
    return {
      canEverActivate: true,
      activationChakra: 10,
      upkeepChakra: 3,
      shortTitle: 'Sharingan Nv. 1 (1 Tomoe)',
      bonusBadge: '+5% Prec · +6% Esq · +4% Crít · -6% Custo CH',
    };
  }
  if (stage === 2) {
    return {
      canEverActivate: true,
      activationChakra: 14,
      upkeepChakra: 4,
      shortTitle: 'Sharingan Nv. 2 (2 Tomoe)',
      bonusBadge: '+7% Prec · +9% Esq · +6% Crít · -9% Custo CH',
    };
  }
  if (stage === 3) {
    return {
      canEverActivate: true,
      activationChakra: 18,
      upkeepChakra: 5,
      shortTitle: 'Sharingan Nv. 3 (3 Tomoe)',
      bonusBadge: '+9% Prec · +11% Esq · +8% Crít · Libera Izanagi/Izanami',
    };
  }
  if (stage === 4) {
    return {
      canEverActivate: true,
      activationChakra: 24,
      upkeepChakra: 7,
      shortTitle: 'Mangekyou Sharingan',
      bonusBadge: '+12% Prec · +14% Esq · +12% Crít · Libera Técnicas Mangekyou',
    };
  }
  return {
    canEverActivate: false,
    activationChakra: 0,
    upkeepChakra: 0,
    shortTitle: 'Sem Sharingan',
    bonusBadge: '',
  };
}

export function canActivateSharinganInCombat(
  char: Pick<CharacterModel, 'clan' | 'kekkeiGenkai' | 'leftEyeBlindness' | 'rightEyeBlindness'>,
  currentChakra: number
): {
  allowed: boolean;
  stage: 0 | 1 | 2 | 3 | 4;
  activationChakra: number;
  upkeepChakra: number;
  reason?: string;
} {
  const stage = getSharinganStageNumber(char.kekkeiGenkai, char.clan);
  const cfg = getSharinganCombatConfig(stage);
  if (stage === 0) {
    return {
      allowed: false,
      stage: 0,
      activationChakra: 0,
      upkeepChakra: 0,
      reason: 'Apenas portadores do Sharingan podem ativá-lo em batalha.',
    };
  }
  const ocular = getOcularState(char);
  if (ocular.bothBlind) {
    return {
      allowed: false,
      stage,
      activationChakra: cfg.activationChakra,
      upkeepChakra: cfg.upkeepChakra,
      reason: 'Seus dois olhos perderam 100% da luz ocular. O Sharingan está selado na escuridão.',
    };
  }
  if (currentChakra < cfg.activationChakra) {
    return {
      allowed: false,
      stage,
      activationChakra: cfg.activationChakra,
      upkeepChakra: cfg.upkeepChakra,
      reason: `Chakra insuficiente para despertar o Sharingan em combate (${currentChakra}/${cfg.activationChakra} CH).`,
    };
  }
  return {
    allowed: true,
    stage,
    activationChakra: cfg.activationChakra,
    upkeepChakra: cfg.upkeepChakra,
  };
}

export function canUseOcularJutsuInCombat(
  jutsu: Pick<JutsuDef, 'id' | 'name'> & { kekkeiRequired?: string | null },
  sharinganActive: boolean,
  ocular: Pick<OcularStateSummary, 'bothBlind' | 'usableEyes'>
): {
  allowed: boolean;
  requiresSharingan: boolean;
  reason?: string;
} {
  const requiresSharingan = isSharinganRequiredJutsu(jutsu);
  if (!requiresSharingan) {
    return { allowed: true, requiresSharingan: false };
  }
  if (ocular.bothBlind || ocular.usableEyes === 0) {
    return {
      allowed: false,
      requiresSharingan: true,
      reason: 'Cegueira Ocular Total (100%): técnicas do Sharingan/Mangekyou estão permanentemente inacessíveis.',
    };
  }
  if (!sharinganActive) {
    return {
      allowed: false,
      requiresSharingan: true,
      reason: `Ative o Sharingan na batalha antes de executar ${jutsu.name}.`,
    };
  }
  return { allowed: true, requiresSharingan: true };
}

export function applyOcularJutsuStrain(
  current: { leftEyeBlindness: number; rightEyeBlindness: number },
  jutsu: Pick<JutsuDef, 'id' | 'name'> & { kekkeiRequired?: string | null }
): {
  triggered: boolean;
  instantBlindness: boolean;
  blindedEye: 'left' | 'right' | 'both' | null;
  leftEyeBlindness: number;
  rightEyeBlindness: number;
  becameCompletelyBlind: boolean;
  logMessage: string | null;
} {
  const prevLeft = Math.max(0, Math.min(100, Math.round(current.leftEyeBlindness || 0)));
  const prevRight = Math.max(0, Math.min(100, Math.round(current.rightEyeBlindness || 0)));

  if (isInstantBlindnessKinjutsu(jutsu.id)) {
    if (prevLeft < 100) {
      const nextLeft = 100;
      const becameCompletelyBlind = nextLeft >= 100 && prevRight >= 100;
      return {
        triggered: true,
        instantBlindness: true,
        blindedEye: becameCompletelyBlind ? 'both' : 'left',
        leftEyeBlindness: nextLeft,
        rightEyeBlindness: prevRight,
        becameCompletelyBlind,
        logMessage: `CEGUEIRA INSTANTÂNEA (${jutsu.name}): O Olho Esquerdo perdeu 100% da visão permanentemente ao reescrever o destino!`,
      };
    }
    if (prevRight < 100) {
      return {
        triggered: true,
        instantBlindness: true,
        blindedEye: 'both',
        leftEyeBlindness: 100,
        rightEyeBlindness: 100,
        becameCompletelyBlind: true,
        logMessage: `CEGUEIRA TOTAL (${jutsu.name}): O Olho Direito apagou-se instantaneamente (100% nos dois olhos). O Sharingan selou-se para sempre!`,
      };
    }
    return {
      triggered: false,
      instantBlindness: false,
      blindedEye: 'both',
      leftEyeBlindness: 100,
      rightEyeBlindness: 100,
      becameCompletelyBlind: true,
      logMessage: null,
    };
  }

  if (isMangekyouJutsu(jutsu)) {
    const id = (jutsu.id || '').trim().toLowerCase();
    const spec = MANGEKYOU_STRAIN_TABLE[id] || { left: 15, right: 15 };
    let nextLeft = prevLeft;
    let nextRight = prevRight;

    if (prevLeft >= 100 && prevRight < 100) {
      const concentrated = Math.round((spec.left + spec.right) * 0.75);
      nextRight = Math.min(100, prevRight + concentrated);
    } else if (prevRight >= 100 && prevLeft < 100) {
      const concentrated = Math.round((spec.left + spec.right) * 0.75);
      nextLeft = Math.min(100, prevLeft + concentrated);
    } else {
      nextLeft = Math.min(100, prevLeft + spec.left);
      nextRight = Math.min(100, prevRight + spec.right);
    }

    const becameCompletelyBlind = nextLeft >= 100 && nextRight >= 100;
    const newlyBlindedLeft = prevLeft < 100 && nextLeft >= 100;
    const newlyBlindedRight = prevRight < 100 && nextRight >= 100;
    const blindedEye: 'left' | 'right' | 'both' | null = becameCompletelyBlind
      ? 'both'
      : newlyBlindedLeft
      ? 'left'
      : newlyBlindedRight
      ? 'right'
      : null;

    const logMessage = becameCompletelyBlind
      ? `ESCURIDÃO DO MANGEKYOU (${jutsu.name}): A pressão ocular extinguiu toda a luz restante (Esq 100% · Dir 100% Cegueira)!`
      : newlyBlindedLeft || newlyBlindedRight
      ? `COLAPSO OCULAR (${jutsu.name}): Um dos olhos atingiu 100% de cegueira pelo abuso do Mangekyou (Cegueira Esq ${nextLeft}% · Dir ${nextRight}%)!`
      : `Desgaste do Mangekyou (${jutsu.name}): Cegueira progressiva subiu para Esq ${nextLeft}% · Dir ${nextRight}%.`;

    return {
      triggered: true,
      instantBlindness: false,
      blindedEye,
      leftEyeBlindness: nextLeft,
      rightEyeBlindness: nextRight,
      becameCompletelyBlind,
      logMessage,
    };
  }

  return {
    triggered: false,
    instantBlindness: false,
    blindedEye: null,
    leftEyeBlindness: prevLeft,
    rightEyeBlindness: prevRight,
    becameCompletelyBlind: prevLeft >= 100 && prevRight >= 100,
    logMessage: null,
  };
}

// ============================================================================
// EXCLUSIVE VILLAGE MISSION LOCK & ACTIVE WAR MISSIONS GENERATOR
// ============================================================================

const WAR_COMMANDER_ARCHETYPES: Array<{
  rank: 'C' | 'B' | 'A' | 'S';
  minLevel: number;
  titlePrefix: string;
  commanderRole: string;
  givenNames: string[];
  clanTag: string;
  baseHp: number;
  baseAttack: number;
  baseSpeed: number;
  baseXp: number;
  baseChakraXp: number;
  baseRyo: number;
  baseMerit: number;
  avatarUrl: string;
}> = [
  {
    rank: 'C',
    minLevel: 1,
    titlePrefix: 'Patrulha de Trincheira & Batedores',
    commanderRole: 'Batedor de Linha Avançada',
    givenNames: ['Kagerou', 'Hayato', 'Retsuya', 'Shinobu', 'Tatsumi'],
    clanTag: 'Vanguarda Tática',
    baseHp: 175,
    baseAttack: 24,
    baseSpeed: 16,
    baseXp: 95,
    baseChakraXp: 65,
    baseRyo: 360,
    baseMerit: 55,
    avatarUrl:
      'https://static.wikia.nocookie.net/naruto/images/5/55/Valley_of_the_End.png/revision/latest/scale-to-width-down/800?cb=20111011170341',
  },
  {
    rank: 'B',
    minLevel: 4,
    titlePrefix: 'Sabotagem de Comboio & Suprimentos de Guerra',
    commanderRole: 'Capitão de Logística Bélica',
    givenNames: ['Raidou', 'Gennosuke', 'Yuzuru', 'Masaki', 'Kuroba'],
    clanTag: 'Divisão de Cerco',
    baseHp: 265,
    baseAttack: 36,
    baseSpeed: 21,
    baseXp: 165,
    baseChakraXp: 115,
    baseRyo: 680,
    baseMerit: 95,
    avatarUrl:
      'https://static.wikia.nocookie.net/naruto/images/0/0c/Kannabi_Bridge.png/revision/latest/scale-to-width-down/800?cb=20150529150213',
  },
  {
    rank: 'A',
    minLevel: 8,
    titlePrefix: 'Ruptura do Batalhão de Assalto no Front',
    commanderRole: 'Comandante de Esquadrão',
    givenNames: ['Kurogane', 'Soujirou', 'Kazanari', 'Hagiri', 'Zanpaku'],
    clanTag: 'Alto Comando',
    baseHp: 390,
    baseAttack: 52,
    baseSpeed: 27,
    baseXp: 280,
    baseChakraXp: 195,
    baseRyo: 1220,
    baseMerit: 160,
    avatarUrl: '',
  },
  {
    rank: 'S',
    minLevel: 12,
    titlePrefix: 'Confronto Decisivo pelo Domínio da Fronteira',
    commanderRole: 'General de Campanha',
    givenNames: ['Daikoku', 'Murakumo', 'Shiranui', 'Takemikazuchi', 'Onikage'],
    clanTag: 'Estado-Maior de Guerra',
    baseHp: 540,
    baseAttack: 68,
    baseSpeed: 33,
    baseXp: 430,
    baseChakraXp: 300,
    baseRyo: 1950,
    baseMerit: 255,
    avatarUrl: '',
  },
];

function deterministicHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function generateActiveWarMissions(
  state: GeopoliticsWorldState,
  char: Pick<CharacterModel, 'village' | 'level' | 'missionsCompleted'>
): ScaledMission[] {
  const activeConflicts = (state?.conflicts || []).filter((c) => c.active);
  if (activeConflicts.length === 0) return [];

  const results: ScaledMission[] = [];

  for (const conflict of activeConflicts) {
    const isBelligerentA = char.village === conflict.villageA;
    const isBelligerentB = char.village === conflict.villageB;

    let participationRole: WarMissionMeta['participationRole'] = 'border_containment';
    let alliedSideVillage = char.village;
    let opposingVillage = conflict.villageB;

    if (isBelligerentA) {
      participationRole = 'belligerent';
      alliedSideVillage = conflict.villageA;
      opposingVillage = conflict.villageB;
    } else if (isBelligerentB) {
      participationRole = 'belligerent';
      alliedSideVillage = conflict.villageB;
      opposingVillage = conflict.villageA;
    } else {
      const relA = getRelationBetweenVillages(state, char.village, conflict.villageA);
      const relB = getRelationBetweenVillages(state, char.village, conflict.villageB);
      if (relA.status === 'allied' && relB.status !== 'allied') {
        participationRole = 'ally';
        alliedSideVillage = conflict.villageA;
        opposingVillage = conflict.villageB;
      } else if (relB.status === 'allied' && relA.status !== 'allied') {
        participationRole = 'ally';
        alliedSideVillage = conflict.villageB;
        opposingVillage = conflict.villageA;
      } else {
        participationRole = 'border_containment';
        alliedSideVillage = char.village;
        opposingVillage =
          deterministicHash(`${conflict.id}:${char.village}`) % 2 === 0
            ? conflict.villageB
            : conflict.villageA;
      }
    }

    const oppMeta = VILLAGES.find((v) => v.name === opposingVillage);
    const enemyNature: ChakraNature = oppMeta?.primaryNature || 'Katon';
    const warBonusRyoPct =
      participationRole === 'belligerent'
        ? Math.max(25, (conflict.bonusRyoPct || 15) + 10)
        : participationRole === 'ally'
        ? 20
        : 15;
    const warBonusMeritPct =
      participationRole === 'belligerent' ? 30 : participationRole === 'ally' ? 22 : 15;

    for (const arch of WAR_COMMANDER_ARCHETYPES) {
      const h = deterministicHash(`${conflict.id}:${opposingVillage}:${arch.rank}`);
      const rawName = arch.givenNames[h % arch.givenNames.length];
      const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const enemyName = `${arch.commanderRole} ${cleanName}`;

      const roleHeadline =
        participationRole === 'belligerent'
          ? `[Guerra Direta · ${alliedSideVillage}]`
          : participationRole === 'ally'
          ? `[Reforço Aliado · ${alliedSideVillage}]`
          : `[Contenção de Guerra · ${char.village}]`;

      const briefing =
        participationRole === 'belligerent'
          ? `Campanha militar oficial no teatro "${conflict.frontName}" (${conflict.villageA} vs ${conflict.villageB}, intensidade ${conflict.intensity}%). Neutralize ${enemyName} de ${opposingVillage} para avançar a frente de batalha de ${char.village}.`
          : participationRole === 'ally'
          ? `Expedição de coalizão em apoio ao vilarejo aliado ${alliedSideVillage} na frente "${conflict.frontName}". Intercepte ${enemyName} de ${opposingVillage} antes que rompa o flanco aliado.`
          : `A guerra entre ${conflict.villageA} e ${conflict.villageB} ("${conflict.frontName}") espalhou incursões armadas pelas rotas próximas a ${char.village}. Contenha ${enemyName} (${opposingVillage}) para proteger a soberania local.`;

      const progressionBoost =
        Math.max(0, char.level - arch.minLevel) * 0.14 + (char.missionsCompleted || 0) * 0.03;
      const difficultyScale = Number((1 + Math.min(2.8, progressionBoost)).toFixed(2));
      const intensityFactor = 1 + Math.max(0, conflict.intensity - 50) * 0.002;

      const baseRyoWithWar = Math.round(arch.baseRyo * (1 + warBonusRyoPct / 100));
      const baseMeritWithWar = Math.round(arch.baseMerit * (1 + warBonusMeritPct / 100));

      results.push({
        id: `war__${conflict.id}__${arch.rank.toLowerCase()}`,
        assignedVillage: char.village,
        title: `${roleHeadline} ${arch.titlePrefix} — ${conflict.frontName}`,
        rank: arch.rank,
        minLevel: arch.minLevel,
        enemyName,
        enemyClan: arch.clanTag,
        enemyVillage: opposingVillage,
        enemyAvatar: oppMeta?.imageUrl || arch.avatarUrl,
        enemyNature,
        baseHp: arch.baseHp,
        baseAttack: arch.baseAttack,
        baseSpeed: arch.baseSpeed,
        baseXp: arch.baseXp,
        baseChakraXp: arch.baseChakraXp,
        baseRyo: baseRyoWithWar,
        baseMerit: baseMeritWithWar,
        briefing,
        difficultyScale,
        staminaCost: getMissionStaminaCost(arch.rank, true),
        scaledHp: Math.round(arch.baseHp * difficultyScale * intensityFactor),
        scaledAttack: Math.round(arch.baseAttack * (1 + (difficultyScale - 1) * 0.74)),
        scaledSpeed: Math.round(arch.baseSpeed * (1 + (difficultyScale - 1) * 0.45)),
        rewardXp: Math.round(arch.baseXp * (1 + (difficultyScale - 1) * 0.62)),
        rewardChakraXp: Math.round(arch.baseChakraXp * (1 + (difficultyScale - 1) * 0.62)),
        rewardRyo: Math.round(baseRyoWithWar * (1 + (difficultyScale - 1) * 0.55)),
        rewardMerit: Math.round(baseMeritWithWar * (1 + (difficultyScale - 1) * 0.5)),
        warMeta: {
          isWarMission: true,
          conflictId: conflict.id,
          frontName: conflict.frontName,
          conflictType: conflict.conflictType,
          intensity: conflict.intensity,
          belligerentA: conflict.villageA,
          belligerentB: conflict.villageB,
          opposingVillage,
          alliedSideVillage,
          participationRole,
          warBonusRyoPct,
          warBonusMeritPct,
        },
      });
    }
  }

  return results;
}

export function canExecuteMissionForCharacter(
  char: Pick<CharacterModel, 'village' | 'level' | 'missionsCompleted'>,
  missionId: string,
  geopolitics: GeopoliticsWorldState
): {
  allowed: boolean;
  isWarMission: boolean;
  resolvedWarMission?: ScaledMission;
  reason?: string;
} {
  const cleanId = (missionId || '').trim();
  if (!cleanId) {
    return { allowed: false, isWarMission: false, reason: 'Identificador de missão ausente.' };
  }

  if (cleanId.startsWith('war__')) {
    const activeWarMissions = generateActiveWarMissions(geopolitics, char);
    const match = activeWarMissions.find((wm) => wm.id === cleanId);
    if (!match) {
      return {
        allowed: false,
        isWarMission: true,
        reason: 'Esta frente de guerra já foi encerrada por cessar-fogo ou não está ativa no momento.',
      };
    }
    return {
      allowed: true,
      isWarMission: true,
      resolvedWarMission: match,
    };
  }

  const tpl = findMissionTemplateById(cleanId);
  if (tpl && tpl.assignedVillage && tpl.assignedVillage !== char.village) {
    return {
      allowed: false,
      isWarMission: false,
      reason: `Acesso restrito: ninjas de ${char.village} só podem realizar o quadro de missões de ${char.village} (esta missão pertence a ${tpl.assignedVillage}).`,
    };
  }

  return {
    allowed: true,
    isWarMission: false,
  };
}

// =============================================================================
// BIJUU & JINCHUURIKI SYSTEM
// =============================================================================

export interface BijuuCloakConfig {
  bijuuId: BijuuId;
  bijuuName: string;
  shortTitle: string;
  activationChakra: number;
  upkeepChakra: number;
  masteryScale: number;
  bonusBadge: string;
}

export function getBijuuById(id?: string | null): BijuuDef | undefined {
  if (!id) return undefined;
  const clean = id.trim().toLowerCase();
  return BIJUU_CATALOG.find(
    (b) => b.id.toLowerCase() === clean || b.shortName.toLowerCase() === clean
  );
}

export function getBijuuCloakConfig(bijuu: BijuuDef, mastery: number = 0): BijuuCloakConfig {
  const safeMastery = Math.max(0, Math.min(100, Math.floor(mastery)));
  const masteryScale = Number((1 + safeMastery / 200).toFixed(2));
  const statTokens = Object.entries(bijuu.cloakStatBonuses)
    .filter(([, val]) => (val || 0) > 0)
    .map(([k, val]) => `${STAT_SHORT_LABELS[k as AttributeKey] || k} +${Math.round((val || 0) * masteryScale)}`);
  const critShown = Math.round(bijuu.cloakCritBonus * masteryScale);
  const bonusBadge = `${statTokens.join(' · ')} · +${critShown}% Crít · +${Math.round(12 + safeMastery * 0.1)}% Ninjutsu`;
  return {
    bijuuId: bijuu.id,
    bijuuName: bijuu.name,
    shortTitle: `Manto de ${bijuu.shortName}`,
    activationChakra: bijuu.cloakActivationChakra,
    upkeepChakra: bijuu.cloakUpkeepChakra,
    masteryScale,
    bonusBadge,
  };
}

export function canActivateBijuuCloakInCombat(
  char: Pick<CharacterModel, 'jinchuurikiBijuuId' | 'bijuuMastery'>,
  currentChakra: number
): {
  allowed: boolean;
  reason?: string;
  activationChakra: number;
  upkeepChakra: number;
  config?: BijuuCloakConfig;
} {
  const bijuu = getBijuuById(char.jinchuurikiBijuuId);
  if (!bijuu) {
    return {
      allowed: false,
      activationChakra: 0,
      upkeepChakra: 0,
      reason: 'Você não possui nenhuma Bijuu selada para canalizar o Manto de Chakra.',
    };
  }
  const config = getBijuuCloakConfig(bijuu, char.bijuuMastery ?? 0);
  if (currentChakra < config.activationChakra) {
    return {
      allowed: false,
      activationChakra: config.activationChakra,
      upkeepChakra: config.upkeepChakra,
      config,
      reason: `Chakra insuficiente para despertar o ${config.shortTitle} (${currentChakra}/${config.activationChakra} CH).`,
    };
  }
  return {
    allowed: true,
    activationChakra: config.activationChakra,
    upkeepChakra: config.upkeepChakra,
    config,
  };
}

export function getBijuuSignatureJutsu(
  char: Pick<CharacterModel, 'jinchuurikiBijuuId' | 'bijuuMastery'>
): JutsuDef | null {
  const bijuu = getBijuuById(char.jinchuurikiBijuuId);
  if (!bijuu) return null;
  const mastery = Math.max(0, Math.min(100, Math.floor(char.bijuuMastery ?? 0)));
  const scaledPower = bijuu.bijuudamaPower + Math.floor(mastery / 4);
  return {
    id: `bijuu_bijuudama_${bijuu.id}`,
    name: bijuu.bijuudamaName,
    rank: 'S',
    nature: bijuu.element,
    category: 'Kekkei Genkai',
    chakraCost: bijuu.bijuudamaCost,
    basePower: scaledPower,
    accuracyMod: 12,
    critBonus: 14,
    requiredLevel: 1,
    requiredChakraLevel: 1,
    learnCostRyo: 0,
    minRange: 1,
    maxRange: 5,
    imageUrl: bijuu.imageUrl,
    description: `Esfera de chakra comprimida da ${bijuu.name} (${mastery}% Domínio · +${Math.floor(mastery / 4)} Poder). Devasta o alvo em até 5 casas.`,
    effects: [
      {
        type: 'crush',
        target: 'enemy',
        chance: 85,
        duration: 2,
        potency: 24,
        label: 'Onda de Choque Bijuudama (85%, 2t)',
      },
      {
        type: 'burn',
        target: 'enemy',
        chance: 70,
        duration: 2,
        potency: 20,
        label: 'Chakra Corrosivo de Bijuu (70%, 2t)',
      },
    ],
  };
}

export function checkBijuuSealingEligibility(
  char: Pick<CharacterModel, 'id' | 'rank' | 'level' | 'chakraLevel' | 'jinchuurikiBijuuId'>,
  bijuu: BijuuDef,
  activeHost?: { id: number; name: string; village: string } | null
): {
  eligible: boolean;
  alreadyHostOfThis: boolean;
  alreadyHostOfAnother: boolean;
  occupiedByOther: boolean;
  unmetReasons: string[];
} {
  const alreadyHostOfThis = Boolean(char.jinchuurikiBijuuId && char.jinchuurikiBijuuId === bijuu.id);
  const alreadyHostOfAnother = Boolean(char.jinchuurikiBijuuId && char.jinchuurikiBijuuId !== bijuu.id);
  const occupiedByOther = Boolean(activeHost && activeHost.id !== char.id);
  const unmetReasons: string[] = [];

  if (alreadyHostOfThis) {
    unmetReasons.push(`Você já é o Jinchuuriki ativo de ${bijuu.shortName}.`);
  }
  if (alreadyHostOfAnother) {
    unmetReasons.push('Um shinobi só pode hospedar 1 Bijuu ativa por vez (libere a atual para disputar outra).');
  }
  if (occupiedByOther && activeHost) {
    unmetReasons.push(
      `Bijuu atualmente selada em ${activeHost.name} (${activeHost.village}). Só pode haver 1 Jinchuuriki ativo por Bijuu no mundo.`
    );
  }

  const charRankOrder = GRADUATION_RANK_ORDER[char.rank] ?? 0;
  const minRankOrder = GRADUATION_RANK_ORDER[bijuu.minRank] ?? 1;
  if (charRankOrder < minRankOrder) {
    unmetReasons.push(`Graduação mínima para subjugar ${bijuu.shortName}: ${bijuu.minRank} (atual: ${char.rank}).`);
  }
  if ((char.level || 1) < bijuu.minLevel) {
    unmetReasons.push(`Nível mínimo para conter o selo: ${bijuu.minLevel} (atual: ${char.level}).`);
  }
  if ((char.chakraLevel || 1) < bijuu.minChakraLevel) {
    unmetReasons.push(`Nível de Chakra mínimo: ${bijuu.minChakraLevel} (atual: ${char.chakraLevel}).`);
  }

  return {
    eligible: unmetReasons.length === 0,
    alreadyHostOfThis,
    alreadyHostOfAnother,
    occupiedByOther,
    unmetReasons,
  };
}





