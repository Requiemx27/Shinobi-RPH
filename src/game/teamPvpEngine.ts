import {
  ActiveStatusEffect,
  applyOcularJutsuStrain,
  applyTileCloudArea,
  calculateEffectiveStats,
  calculateHitAndDamage,
  canActivateSharinganInCombat,
  canMoveToTile,
  canUseOcularJutsuInCombat,
  CharacterModel,
  CombatCalculationResult,
  computeEnemyGridMove,
  computeKnockbackTile,
  createTacticalGrid,
  EffectiveStats,
  formatElementalLabel,
  getEffectiveJutsuChakraCost,
  getJutsuGridRange,
  getPlayerMoveRange,
  getSharinganCombatConfig,
  getSharinganStageNumber,
  GridCoord,
  manhattanDistance,
  MELEE_STRIKES,
  mergeStatusEffects,
  normalizeElementalNature,
  resolveTurnStartControl,
  ScaledMission,
  TacticalGridState,
  tickEndOfTurnStatuses,
  tickTileClouds,
} from './engine.ts';
import {
  ChakraNature,
  EQUIPPED_WEAPON_PROFILES,
  ITEM_CATALOG,
  JUTSU_CATALOG,
  JutsuDef,
  STANDARD_NINJA_TOOLS,
} from './narutoData.ts';

// ============================================================================
// 1. COLOR-CODED COMBAT LOG CLASSIFIER (RED = DAMAGE, GREEN = HEALING)
// ============================================================================

export interface ParsedStatusTick {
  text: string;
  kind: 'damage' | 'heal' | 'chakra' | 'neutral';
  hpAmount: number;
}

export interface ClassifiedCombatLogDelta {
  damageDealtToTarget: number;
  damageFromTicks: number;
  totalRedDamage: number;
  healingDirect: number;
  healingFromTicks: number;
  totalGreenHealing: number;
  hasAnyDelta: boolean;
  tone: 'damage' | 'heal' | 'mixed' | 'neutral';
  parsedTicks: ParsedStatusTick[];
}

export function parseStatusTickLine(line: string): ParsedStatusTick {
  const hpNeg = line.match(/\(-(\d+)\s*HP\b/i);
  if (hpNeg) {
    return { text: line, kind: 'damage', hpAmount: Number(hpNeg[1]) || 0 };
  }
  const hpPos = line.match(/\(\+(\d+)\s*HP\b/i);
  if (hpPos) {
    return { text: line, kind: 'heal', hpAmount: Number(hpPos[1]) || 0 };
  }
  if (/\([+-]\d+\s*CH\b/i.test(line) || /Manutenç/i.test(line) || /Selados/i.test(line)) {
    return { text: line, kind: 'chakra', hpAmount: 0 };
  }
  return { text: line, kind: 'neutral', hpAmount: 0 };
}

export function classifyCombatLogDelta(input: {
  calc?: CombatCalculationResult;
  damageAmount?: number;
  healingAmount?: number;
  actionMeta?: string;
  statusTicks?: string[];
  category?: string;
}): ClassifiedCombatLogDelta {
  let damageDealtToTarget = 0;
  let healingDirect = 0;

  if (input.calc) {
    if (input.calc.isHit && input.calc.damage > 0) {
      damageDealtToTarget += input.calc.damage;
    }
    if (input.calc.healing > 0) {
      healingDirect += input.calc.healing;
    }
  }

  if (typeof input.damageAmount === 'number' && input.damageAmount > 0 && damageDealtToTarget === 0) {
    damageDealtToTarget += Math.round(input.damageAmount);
  }
  if (typeof input.healingAmount === 'number' && input.healingAmount > 0 && healingDirect === 0) {
    healingDirect += Math.round(input.healingAmount);
  }

  // Fallback for legacy item heal entries that only put "+120 HP" in actionMeta
  if (healingDirect === 0 && input.actionMeta) {
    const metaHeal = input.actionMeta.match(/\+(\d+)\s*HP\b/i);
    if (metaHeal) {
      healingDirect += Number(metaHeal[1]) || 0;
    }
  }

  let damageFromTicks = 0;
  let healingFromTicks = 0;
  const parsedTicks = (input.statusTicks || []).map((tick) => {
    const parsed = parseStatusTickLine(tick);
    if (parsed.kind === 'damage') damageFromTicks += parsed.hpAmount;
    else if (parsed.kind === 'heal') healingFromTicks += parsed.hpAmount;
    return parsed;
  });

  const totalRedDamage = damageDealtToTarget + damageFromTicks;
  const totalGreenHealing = healingDirect + healingFromTicks;
  const hasAnyDelta = totalRedDamage > 0 || totalGreenHealing > 0;

  let tone: ClassifiedCombatLogDelta['tone'] = 'neutral';
  if (totalRedDamage > 0 && totalGreenHealing > 0) tone = 'mixed';
  else if (totalRedDamage > 0) tone = 'damage';
  else if (totalGreenHealing > 0) tone = 'heal';

  return {
    damageDealtToTarget,
    damageFromTicks,
    totalRedDamage,
    healingDirect,
    healingFromTicks,
    totalGreenHealing,
    hasAnyDelta,
    tone,
    parsedTicks,
  };
}

// ============================================================================
// 2. SHINOBI TEAM SYSTEM (CANONICAL 1 SENSEI + UP TO 3 ALUNOS)
// ============================================================================

export type TeamMemberRole = 'sensei' | 'student';

export interface ShinobiTeamMemberRecord {
  id: number;
  teamId: number;
  characterId: number;
  userUid: string;
  characterName: string;
  characterAvatar: string;
  characterRank: string;
  characterVillage: string;
  role: TeamMemberRole;
  slotIndex: number; // 0 = Sensei, 1..3 = Alunos
  status: 'active' | 'invited';
  level?: number;
  chakraNature?: string;
  joinedAt?: string;
}

export interface ShinobiTeamRecord {
  id: number;
  name: string;
  village: string;
  motto: string;
  senseiCharacterId: number;
  senseiUid: string;
  senseiName: string;
  missionsCompleted: number;
  wins: number;
  createdAt?: string;
  members: ShinobiTeamMemberRecord[];
  synergy: TeamSynergySummary;
}

export interface TeamSynergySummary {
  hasSensei: boolean;
  studentCount: number;
  activeCount: number;
  maxSlots: number;
  isCanonicalFullCell: boolean;
  xpBonusPct: number;
  ryoBonusPct: number;
  attackBonusPct: number;
  sameVillageCohesion: boolean;
  formationLabel: string;
}

export const SENSEI_ELIGIBLE_RANKS = new Set<string>([
  'Tokubetsu Jonin',
  'Jonin',
  'Jounin',
  'Jounin Experiente',
  'ANBU',
  'Sannin',
  'Kage',
]);

export const STUDENT_ELIGIBLE_RANKS = new Set<string>([
  'Estudante da Academia',
  'Genin',
  'Chunin',
]);

export function isSenseiEligibleRank(rank?: string | null): boolean {
  if (!rank) return false;
  return SENSEI_ELIGIBLE_RANKS.has(rank.trim());
}

export function isStudentEligibleRank(rank?: string | null): boolean {
  if (!rank) return false;
  return STUDENT_ELIGIBLE_RANKS.has(rank.trim());
}

export function computeTeamSynergy(members: Pick<ShinobiTeamMemberRecord, 'role' | 'status' | 'characterVillage'>[]): TeamSynergySummary {
  const active = members.filter((m) => m.status === 'active');
  const hasSensei = active.some((m) => m.role === 'sensei');
  const studentCount = active.filter((m) => m.role === 'student').length;
  const activeCount = active.length;
  const isCanonicalFullCell = hasSensei && studentCount === 3;

  const villages = new Set(active.map((m) => m.characterVillage).filter(Boolean));
  const sameVillageCohesion = activeCount >= 2 && villages.size <= 1;

  let xpBonusPct = (hasSensei ? 10 : 0) + studentCount * 5;
  let ryoBonusPct = (hasSensei ? 5 : 0) + studentCount * 4;
  let attackBonusPct = studentCount * 3 + (sameVillageCohesion ? 5 : 0);

  if (isCanonicalFullCell) {
    xpBonusPct += 5; // Total >= 25%
    ryoBonusPct += 5; // Total >= 20%
    attackBonusPct += 4;
  }

  let formationLabel = 'Célula em Formação';
  if (isCanonicalFullCell) {
    formationLabel = 'Célula Canônica Completa (1 Sensei + 3 Alunos)';
  } else if (hasSensei && studentCount > 0) {
    formationLabel = `Célula Ativa (1 Sensei + ${studentCount}/3 Alunos)`;
  } else if (hasSensei) {
    formationLabel = 'Liderança Pronta (Aguardando até 3 Alunos)';
  }

  return {
    hasSensei,
    studentCount,
    activeCount,
    maxSlots: 4,
    isCanonicalFullCell,
    xpBonusPct,
    ryoBonusPct,
    attackBonusPct,
    sameVillageCohesion,
    formationLabel,
  };
}

export function validateTeamSlotAddition(
  existingMembers: Pick<ShinobiTeamMemberRecord, 'characterId' | 'role' | 'slotIndex' | 'status'>[],
  candidate: { characterId: number; rank: string; requestedRole?: TeamMemberRole }
): {
  allowed: boolean;
  role: TeamMemberRole;
  slotIndex: number;
  reason?: string;
} {
  if (existingMembers.some((m) => m.characterId === candidate.characterId)) {
    return {
      allowed: false,
      role: 'student',
      slotIndex: -1,
      reason: 'Este shinobi já pertence ou já recebeu convite nesta equipe.',
    };
  }

  const inferredRole: TeamMemberRole =
    candidate.requestedRole || (isSenseiEligibleRank(candidate.rank) ? 'sensei' : 'student');

  if (inferredRole === 'sensei') {
    if (!isSenseiEligibleRank(candidate.rank)) {
      return {
        allowed: false,
        role: 'sensei',
        slotIndex: 0,
        reason: `Apenas Tokubetsu Jonin, Jonin, Jounin Experiente, ANBU, Sannin ou Kage podem atuar como Sensei (atual: ${candidate.rank}).`,
      };
    }
    const hasSensei = existingMembers.some((m) => m.role === 'sensei' || m.slotIndex === 0);
    if (hasSensei) {
      return {
        allowed: false,
        role: 'sensei',
        slotIndex: 0,
        reason: 'Esta equipe já possui 1 Sensei ocupando a liderança (regra 1 Sensei + 3 Alunos).',
      };
    }
    return { allowed: true, role: 'sensei', slotIndex: 0 };
  }

  if (!isStudentEligibleRank(candidate.rank)) {
    return {
      allowed: false,
      role: 'student',
      slotIndex: -1,
      reason: `Apenas Estudante da Academia, Genin ou Chunin podem ocupar as 3 vagas de Aluno (atual: ${candidate.rank}).`,
    };
  }

  const occupiedStudentSlots = new Set(
    existingMembers.filter((m) => m.role === 'student').map((m) => m.slotIndex)
  );
  const freeSlot = [1, 2, 3].find((s) => !occupiedStudentSlots.has(s));
  if (!freeSlot) {
    return {
      allowed: false,
      role: 'student',
      slotIndex: -1,
      reason: 'A equipe já preencheu as 3 vagas máximas de Alunos (1 Sensei + 3 Alunos).',
    };
  }

  return { allowed: true, role: 'student', slotIndex: freeSlot };
}

// ============================================================================
// 3. TEAM CO-OP MISSIONS CATALOG & SCALING (ZERO CANON CHARACTERS)
// ============================================================================

export interface TeamMissionTemplate {
  id: string;
  title: string;
  rank: 'C' | 'B' | 'A' | 'S';
  minAverageLevel: number;
  staminaCostPerMember: number;
  bossName: string;
  bossTitle: string;
  bossClan: string;
  bossVillage: string;
  bossAvatar: string;
  bossNature: ChakraNature;
  baseHp: number;
  baseAttack: number;
  baseSpeed: number;
  baseXp: number;
  baseChakraXp: number;
  baseRyo: number;
  baseMerit: number;
  briefing: string;
}

export const TEAM_MISSION_TEMPLATES: TeamMissionTemplate[] = [
  {
    id: 'team_escolta_ponte',
    title: 'Escolta de Mensageiro na Ponte da Neblina',
    rank: 'C',
    minAverageLevel: 1,
    staminaCostPerMember: 16,
    bossName: 'Capitão Kiriya da Névoa Sanguinária',
    bossTitle: 'Mercenário Renegado de Kirigakure',
    bossClan: 'Divisão de Lâminas',
    bossVillage: 'Kirigakure',
    bossAvatar: '',
    bossNature: 'Suiton',
    baseHp: 390,
    baseAttack: 24,
    baseSpeed: 15,
    baseXp: 135,
    baseChakraXp: 90,
    baseRyo: 420,
    baseMerit: 70,
    briefing:
      'Operação conjunta de 1 Sensei e seus Alunos para romper uma emboscada Suiton na Ponte da Neblina e garantir a passagem do pergaminho diplomático.',
  },
  {
    id: 'team_selo_ruinas',
    title: 'Cerco às Ruínas do Clã Renegado',
    rank: 'B',
    minAverageLevel: 4,
    staminaCostPerMember: 22,
    bossName: 'Mestre de Marionetes Kurogane',
    bossTitle: 'Artífice Desertor de Sunagakure',
    bossClan: 'Oficina Oculta',
    bossVillage: 'Sunagakure',
    bossAvatar: '',
    bossNature: 'Fuuton',
    baseHp: 620,
    baseAttack: 35,
    baseSpeed: 20,
    baseXp: 230,
    baseChakraXp: 155,
    baseRyo: 790,
    baseMerit: 120,
    briefing:
      'O Sensei coordena os flancos enquanto os Alunos cercam o manipulador Kurogane antes que seus selos de vento colapsem o templo antigo.',
  },
  {
    id: 'team_batalhao_fronteira',
    title: 'Interceptação do Batalhão de Elite',
    rank: 'A',
    minAverageLevel: 7,
    staminaCostPerMember: 28,
    bossName: 'Comandante Raikichi da Tempestade',
    bossTitle: 'Capitão de Choque de Kumogakure',
    bossClan: 'Esquadrão Trovão',
    bossVillage: 'Kumogakure',
    bossAvatar: '',
    bossNature: 'Raiton',
    baseHp: 940,
    baseAttack: 48,
    baseSpeed: 26,
    baseXp: 360,
    baseChakraXp: 245,
    baseRyo: 1380,
    baseMerit: 195,
    briefing:
      'Confronto tático contra o Comandante Raikichi. Exige formação coordenada, suporte médico Iryou e ataque sincronizado entre Sensei e Alunos.',
  },
  {
    id: 'team_fortaleza_s',
    title: 'Invasão à Fortaleza Subterrânea de Obsidiana',
    rank: 'S',
    minAverageLevel: 10,
    staminaCostPerMember: 34,
    bossName: 'General Obsidiana Takeshi',
    bossTitle: 'Guardião da Muralha Negra',
    bossClan: 'Brigada Sísmica',
    bossVillage: 'Iwagakure',
    bossAvatar: '',
    bossNature: 'Doton',
    baseHp: 1320,
    baseAttack: 62,
    baseSpeed: 29,
    baseXp: 540,
    baseChakraXp: 380,
    baseRyo: 2250,
    baseMerit: 310,
    briefing:
      'Missão de equipe Rank S no coração da fortaleza rochosa. Somente uma célula disciplinada capaz de curar feridos e combinar afinidades elementais sobreviverá.',
  },
];

export interface ScaledTeamMission extends TeamMissionTemplate {
  scaledHp: number;
  scaledAttack: number;
  scaledSpeed: number;
  rewardXp: number;
  rewardChakraXp: number;
  rewardRyo: number;
  rewardMerit: number;
}

export function scaleTeamMission(
  tpl: TeamMissionTemplate,
  squadSize: number,
  avgLevel: number,
  synergy?: TeamSynergySummary
): ScaledTeamMission {
  const safeSquad = Math.max(1, Math.min(4, squadSize));
  const safeLevel = Math.max(1, avgLevel);
  const memberScale = 0.72 + (safeSquad - 1) * 0.28;
  const levelScale = 1 + Math.max(0, safeLevel - tpl.minAverageLevel) * 0.09;

  const xpMult = 1 + (synergy?.xpBonusPct || 0) / 100;
  const ryoMult = 1 + (synergy?.ryoBonusPct || 0) / 100;

  return {
    ...tpl,
    scaledHp: Math.round(tpl.baseHp * memberScale * levelScale),
    scaledAttack: Math.round(tpl.baseAttack * (0.88 + (safeLevel - 1) * 0.05)),
    scaledSpeed: Math.round(tpl.baseSpeed * (1 + Math.max(0, safeLevel - 1) * 0.03)),
    rewardXp: Math.round(tpl.baseXp * levelScale * xpMult),
    rewardChakraXp: Math.round(tpl.baseChakraXp * levelScale * xpMult),
    rewardRyo: Math.round(tpl.baseRyo * levelScale * ryoMult),
    rewardMerit: Math.round(tpl.baseMerit * levelScale),
  };
}

// ============================================================================
// 4. CO-OP TEAM MISSION TURN-BY-TURN COMBAT ENGINE
// ============================================================================

export interface TeamMissionFighter {
  characterId: number;
  userUid: string;
  name: string;
  avatarUrl: string;
  rank: string;
  role: TeamMemberRole;
  slotIndex: number;
  village: string;
  clan: string;
  kekkeiGenkai: string;
  chakraNature: string;
  secondaryChakraNature: string;
  learnedJutsus: string[];
  specialization: string;
  hp: number;
  maxHp: number;
  chakra: number;
  maxChakra: number;
  statuses: ActiveStatusEffect[];
  sharinganActive: boolean;
  leftEyeBlindness: number;
  rightEyeBlindness: number;
  pos: GridCoord;
  moveRemaining: number;
  stats: EffectiveStats;
  baseCharacter: CharacterModel;
}

export interface TeamMissionBossState {
  name: string;
  title: string;
  clan: string;
  village: string;
  avatarUrl: string;
  nature: ChakraNature;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  statuses: ActiveStatusEffect[];
  pos: GridCoord;
}

export interface SerializedBattleLogItem {
  id: string;
  turn: number;
  timestampLabel: string;
  actor: 'player' | 'ally' | 'enemy' | 'system';
  actorName: string;
  category: 'attack' | 'move' | 'stance' | 'item' | 'secret' | 'control' | 'system' | 'outcome';
  actionName: string;
  actionMeta?: string;
  summary: string;
  calc?: CombatCalculationResult;
  damageAmount?: number;
  healingAmount?: number;
  statusTicks?: string[];
  extraNotes?: string[];
  hpSnapshot?: {
    playerHp: number;
    playerMaxHp: number;
    enemyHp: number;
    enemyMaxHp: number;
  };
}

export interface TeamMissionBattleState {
  teamId: number;
  teamName: string;
  synergy: TeamSynergySummary;
  mission: ScaledTeamMission;
  grid: TacticalGridState;
  squad: TeamMissionFighter[];
  boss: TeamMissionBossState;
  activeSlotIndex: number;
  roundNumber: number;
  turnNumber: number;
  comboCooldown: number;
  status: 'active' | 'won' | 'lost';
  logs: SerializedBattleLogItem[];
  ocularStrainEvents: Array<{
    characterId: number;
    userUid: string;
    leftEyeBlindness: number;
    rightEyeBlindness: number;
    event: string;
  }>;
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false });
}

function buildFighterFromChar(
  char: CharacterModel,
  role: TeamMemberRole,
  slotIndex: number,
  spawnPos: GridCoord
): TeamMissionFighter {
  const eff = calculateEffectiveStats(char, { inCombat: true, sharinganActive: false });
  return {
    characterId: char.id,
    userUid: char.userUid,
    name: char.name,
    avatarUrl: char.avatarUrl,
    rank: char.rank,
    role,
    slotIndex,
    village: char.village,
    clan: char.clan,
    kekkeiGenkai: char.kekkeiGenkai,
    chakraNature: char.chakraNature,
    secondaryChakraNature: char.secondaryChakraNature || 'Nenhum',
    learnedJutsus: Array.isArray(char.learnedJutsus) && char.learnedJutsus.length > 0 ? char.learnedJutsus : ['bunshin'],
    specialization: char.specialization,
    hp: eff.maxHp,
    maxHp: eff.maxHp,
    chakra: eff.maxChakra,
    maxChakra: eff.maxChakra,
    statuses: [],
    sharinganActive: false,
    leftEyeBlindness: char.leftEyeBlindness ?? 0,
    rightEyeBlindness: char.rightEyeBlindness ?? 0,
    pos: spawnPos,
    moveRemaining: getPlayerMoveRange(eff),
    stats: eff,
    baseCharacter: char,
  };
}

export function buildInitialTeamMissionState(params: {
  teamId: number;
  teamName: string;
  synergy: TeamSynergySummary;
  mission: ScaledTeamMission;
  members: Array<{ character: CharacterModel; role: TeamMemberRole; slotIndex: number }>;
}): TeamMissionBattleState {
  const grid = createTacticalGrid(`team_${params.teamId}_${params.mission.id}`);
  const spawnPositions: GridCoord[] = [
    { x: 1, y: 2 },
    { x: 0, y: 1 },
    { x: 1, y: 3 },
    { x: 0, y: 3 },
  ];

  const ordered = [...params.members].sort((a, b) => a.slotIndex - b.slotIndex);
  const squad = ordered.map((m, idx) =>
    buildFighterFromChar(m.character, m.role, m.slotIndex, spawnPositions[idx] || { x: 0, y: idx % 5 })
  );

  // Clear rocks on spawn tiles so every ally starts cleanly
  for (const member of squad) {
    if (grid.terrain[member.pos.y]?.[member.pos.x] === 'rock') {
      grid.terrain[member.pos.y][member.pos.x] = 'ground';
    }
  }
  grid.playerPos = squad[0]?.pos || { x: 1, y: 2 };
  grid.enemyPos = { x: 5, y: 2 };

  const activeFighter = squad[0];
  const openingLog: SerializedBattleLogItem = {
    id: `team_init_${Date.now()}`,
    turn: 0,
    timestampLabel: nowTimeLabel(),
    actor: 'system',
    actorName: 'Comando da Célula',
    category: 'system',
    actionName: `Missão em Equipe: ${params.mission.title}`,
    actionMeta: `Rank ${params.mission.rank} · ${squad.length} Shinobi(s) · Alvo ${formatElementalLabel(params.mission.bossNature)}`,
    summary: `${params.teamName} (${params.synergy.formationLabel}) entra em formação contra ${params.mission.bossName} (${params.mission.scaledHp} HP). Turno inicial de ${activeFighter?.name || 'Sensei'}.`,
    hpSnapshot: {
      playerHp: squad.reduce((s, f) => s + f.hp, 0),
      playerMaxHp: squad.reduce((s, f) => s + f.maxHp, 0),
      enemyHp: params.mission.scaledHp,
      enemyMaxHp: params.mission.scaledHp,
    },
  };

  return {
    teamId: params.teamId,
    teamName: params.teamName,
    synergy: params.synergy,
    mission: params.mission,
    grid,
    squad,
    boss: {
      name: params.mission.bossName,
      title: params.mission.bossTitle,
      clan: params.mission.bossClan,
      village: params.mission.bossVillage,
      avatarUrl: params.mission.bossAvatar,
      nature: params.mission.bossNature,
      hp: params.mission.scaledHp,
      maxHp: params.mission.scaledHp,
      attack: params.mission.scaledAttack,
      speed: params.mission.scaledSpeed,
      statuses: [],
      pos: { x: 5, y: 2 },
    },
    activeSlotIndex: activeFighter ? activeFighter.slotIndex : 0,
    roundNumber: 1,
    turnNumber: 1,
    comboCooldown: 0,
    status: 'active',
    logs: [openingLog],
    ocularStrainEvents: [],
  };
}

export type TeamMissionActionPayload =
  | { type: 'move'; to: GridCoord }
  | { type: 'toggle_sharingan' }
  | { type: 'jutsu'; jutsuId: string; targetSlotIndex?: number; customJutsu?: JutsuDef }
  | { type: 'melee'; strikeId: string }
  | { type: 'heal_ally'; targetSlotIndex: number }
  | { type: 'team_combo' }
  | { type: 'defend' };

function getBossEffectiveStats(boss: TeamMissionBossState): EffectiveStats {
  return {
    ninjutsu: Math.round(boss.attack * 0.72),
    taijutsu: Math.round(boss.attack * 0.7),
    genjutsu: 14,
    velocidade: boss.speed,
    forca: 16,
    inteligencia: 16,
    resistencia: Math.round(boss.attack * 0.48),
    controleChakra: 16,
    maxHp: boss.maxHp,
    maxChakra: 400,
    chakraEfficiency: 1,
  };
}

function advanceTeamTurnOrTriggerBoss(
  state: TeamMissionBattleState,
  rng: () => number
): TeamMissionBattleState {
  if (state.boss.hp <= 0) {
    state.status = 'won';
    state.logs.push({
      id: `team_win_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: 'system',
      actorName: 'Comando da Célula',
      category: 'outcome',
      actionName: 'Missão em Equipe Concluída',
      actionMeta: `+${state.mission.rewardXp} XP · +${state.mission.rewardRyo} Ryo`,
      summary: `${state.teamName} derrotou ${state.boss.name} em trabalho coordenado no Turno ${state.turnNumber}!`,
      hpSnapshot: {
        playerHp: state.squad.reduce((s, f) => s + f.hp, 0),
        playerMaxHp: state.squad.reduce((s, f) => s + f.maxHp, 0),
        enemyHp: 0,
        enemyMaxHp: state.boss.maxHp,
      },
    });
    return state;
  }

  const aliveSorted = state.squad
    .filter((m) => m.hp > 0)
    .sort((a, b) => a.slotIndex - b.slotIndex);

  if (aliveSorted.length === 0) {
    state.status = 'lost';
    return state;
  }

  const nextMember = aliveSorted.find((m) => m.slotIndex > state.activeSlotIndex);
  if (nextMember) {
    nextMember.moveRemaining = getPlayerMoveRange(nextMember.stats);
    state.activeSlotIndex = nextMember.slotIndex;
    state.grid.playerPos = { ...nextMember.pos };
    state.turnNumber += 1;
    return state;
  }

  // End of squad round -> Boss executes its counter-turn
  return resolveTeamMissionBossTurn(state, rng);
}

export function resolveTeamMissionBossTurn(
  state: TeamMissionBattleState,
  rng: () => number = Math.random
): TeamMissionBattleState {
  if (state.status !== 'active' || state.boss.hp <= 0) return state;

  const boss = state.boss;
  const bossStats = getBossEffectiveStats(boss);
  const aliveSquad = state.squad.filter((m) => m.hp > 0);
  if (aliveSquad.length === 0) {
    state.status = 'lost';
    return state;
  }

  const ctrl = resolveTurnStartControl(boss.statuses, boss.maxHp, rng);
  boss.statuses = ctrl.updatedStatuses;

  if (!ctrl.canAct) {
    if (ctrl.selfDamage > 0) boss.hp = Math.max(0, boss.hp - ctrl.selfDamage);
    const bossTick = tickEndOfTurnStatuses(boss.statuses, boss.hp, boss.maxHp, 300, 400);
    boss.hp = bossTick.nextHp;
    boss.statuses = bossTick.nextStatuses;

    state.logs.push({
      id: `team_boss_ctrl_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: 'enemy',
      actorName: boss.name,
      category: 'control',
      actionName: 'Controle Tático',
      damageAmount: ctrl.selfDamage > 0 ? ctrl.selfDamage : undefined,
      summary: `${boss.name} ${ctrl.narration || 'perdeu a iniciativa neste round!'}.`,
      statusTicks: bossTick.logs.map((l) => `${boss.name}: ${l}`),
      hpSnapshot: {
        playerHp: state.squad.reduce((s, f) => s + f.hp, 0),
        playerMaxHp: state.squad.reduce((s, f) => s + f.maxHp, 0),
        enemyHp: boss.hp,
        enemyMaxHp: boss.maxHp,
      },
    });
  } else {
    // Pick Sensei or highest-HP closest ally as primary target
    const target = [...aliveSquad].sort((a, b) => {
      const distDiff = manhattanDistance(a.pos, boss.pos) - manhattanDistance(b.pos, boss.pos);
      if (distDiff !== 0) return distDiff;
      return b.hp - a.hp;
    })[0];

    const movedPos = computeEnemyGridMove(state.grid, boss.pos, target.pos, 2);
    const occupiedBySquad = state.squad.some(
      (f) => f.hp > 0 && f.pos.x === movedPos.x && f.pos.y === movedPos.y
    );
    if (!occupiedBySquad) {
      boss.pos = movedPos;
      state.grid.enemyPos = movedPos;
    }

    const isSweepRound = state.roundNumber % 3 === 0 && aliveSquad.length >= 2;
    const bossTechnique: Pick<
      JutsuDef,
      'id' | 'category' | 'nature' | 'basePower' | 'accuracyMod' | 'critBonus'
    > & { name: string } = {
      id: `boss_${boss.nature.toLowerCase()}`,
      name: isSweepRound
        ? `${formatElementalLabel(boss.nature)}: Onda de Pressão em Área`
        : `${formatElementalLabel(boss.nature)}: Técnica de Combate`,
      category: 'Ninjutsu',
      nature: boss.nature,
      basePower: isSweepRound ? Math.round(boss.attack * 0.72) : boss.attack,
      accuracyMod: 5,
      critBonus: 6,
    };

    const calc = calculateHitAndDamage(
      bossStats,
      boss.nature,
      target.stats,
      target.chakraNature,
      bossTechnique,
      rng,
      {
        attackerStatuses: boss.statuses,
        defenderStatuses: target.statuses,
        attackerClan: boss.clan,
        defenderSecondaryNature: target.secondaryChakraNature,
        sharinganActive: target.sharinganActive,
      }
    );

    let totalDamageAcrossSquad = 0;
    if (calc.isHit && calc.damage > 0) {
      target.hp = Math.max(0, target.hp - calc.damage);
      totalDamageAcrossSquad += calc.damage;
      for (const fx of calc.appliedEffects) {
        if (fx.target === 'enemy') {
          target.statuses = mergeStatusEffects(target.statuses, fx, bossTechnique.name);
        } else {
          boss.statuses = mergeStatusEffects(boss.statuses, fx, bossTechnique.name);
        }
      }
      if (isSweepRound) {
        const secondaryTargets = aliveSquad.filter((m) => m.characterId !== target.characterId);
        const splash = Math.max(8, Math.round(calc.damage * 0.45));
        for (const sec of secondaryTargets) {
          sec.hp = Math.max(0, sec.hp - splash);
          totalDamageAcrossSquad += splash;
        }
      }
    }

    const bossTick = tickEndOfTurnStatuses(boss.statuses, boss.hp, boss.maxHp, 300, 400);
    boss.hp = bossTick.nextHp;
    boss.statuses = bossTick.nextStatuses;

    state.logs.push({
      id: `team_boss_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: 'enemy',
      actorName: boss.name,
      category: 'attack',
      actionName: bossTechnique.name,
      actionMeta: `${formatElementalLabel(boss.nature)} · Alvo: ${target.name}${isSweepRound ? ' (+Área)' : ''}`,
      summary: calc.isHit
        ? `${boss.name} atinge ${target.name} causando ${calc.damage} de dano${isSweepRound ? ` (Total no esquadrão: ${totalDamageAcrossSquad})` : ''}.`
        : `${target.name} evade o contra-ataque de ${boss.name}!`,
      calc: isSweepRound ? { ...calc, damage: totalDamageAcrossSquad } : calc,
      statusTicks: bossTick.logs.map((l) => `${boss.name}: ${l}`),
      hpSnapshot: {
        playerHp: state.squad.reduce((s, f) => s + f.hp, 0),
        playerMaxHp: state.squad.reduce((s, f) => s + f.maxHp, 0),
        enemyHp: boss.hp,
        enemyMaxHp: boss.maxHp,
      },
    });
  }

  state.grid.clouds = tickTileClouds(state.grid.clouds);
  if (state.comboCooldown > 0) state.comboCooldown -= 1;

  if (boss.hp <= 0) {
    state.status = 'won';
    return state;
  }

  const stillAlive = state.squad.filter((m) => m.hp > 0).sort((a, b) => a.slotIndex - b.slotIndex);
  if (stillAlive.length === 0) {
    state.status = 'lost';
    state.logs.push({
      id: `team_lost_${Date.now()}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: 'system',
      actorName: 'Comando da Célula',
      category: 'outcome',
      actionName: 'Esquadrão Derrubado',
      summary: `Todos os integrantes de ${state.teamName} caíram em combate contra ${boss.name}.`,
    });
    return state;
  }

  state.roundNumber += 1;
  state.turnNumber += 1;
  state.activeSlotIndex = stillAlive[0].slotIndex;
  stillAlive[0].moveRemaining = getPlayerMoveRange(stillAlive[0].stats);
  state.grid.playerPos = { ...stillAlive[0].pos };

  return state;
}

export function resolveTeamMissionMemberAction(
  prevState: TeamMissionBattleState,
  actingSlotIndex: number,
  action: TeamMissionActionPayload,
  rng: () => number = Math.random
): { ok: boolean; error?: string; state: TeamMissionBattleState } {
  const state: TeamMissionBattleState = structuredClone(prevState);

  if (state.status !== 'active') {
    return { ok: false, error: 'Esta missão em equipe já foi encerrada.', state: prevState };
  }

  const actor = state.squad.find((m) => m.slotIndex === actingSlotIndex && m.hp > 0);
  if (!actor) {
    return { ok: false, error: 'Membro ativo inválido ou fora de combate.', state: prevState };
  }
  if (state.activeSlotIndex !== actingSlotIndex) {
    return { ok: false, error: 'Aguarde o turno do membro da equipe indicado.', state: prevState };
  }

  if (action.type === 'move') {
    const occupiedCoords = [
      state.boss.pos,
      ...state.squad.filter((f) => f.hp > 0 && f.slotIndex !== actor.slotIndex).map((f) => f.pos),
    ];
    const isOccupied = occupiedCoords.some((c) => c.x === action.to.x && c.y === action.to.y);
    if (isOccupied || !canMoveToTile(state.grid, actor.pos, action.to, actor.moveRemaining)) {
      return { ok: false, error: 'Movimento inválido no grid tático.', state: prevState };
    }
    const steps = manhattanDistance(actor.pos, action.to);
    const fromCoord = `${String.fromCharCode(65 + actor.pos.x)}${actor.pos.y + 1}`;
    const toCoord = `${String.fromCharCode(65 + action.to.x)}${action.to.y + 1}`;
    actor.pos = action.to;
    actor.moveRemaining = Math.max(0, actor.moveRemaining - steps);
    state.grid.playerPos = { ...action.to };
    state.logs.push({
      id: `team_move_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: actor.role === 'sensei' ? 'player' : 'ally',
      actorName: actor.name,
      category: 'move',
      actionName: `Deslocamento (${fromCoord} → ${toCoord})`,
      actionMeta: `-${steps} passo(s)`,
      summary: `${actor.name} reposiciona-se em ${toCoord}. Distância até ${state.boss.name}: ${manhattanDistance(actor.pos, state.boss.pos)} casa(s).`,
    });
    return { ok: true, state };
  }

  if (action.type === 'toggle_sharingan') {
    const stage = getSharinganStageNumber(actor.kekkeiGenkai, actor.clan);
    if (stage === 0) {
      return { ok: false, error: 'Este membro não possui Sharingan.', state: prevState };
    }
    const cfg = getSharinganCombatConfig(stage);
    if (actor.sharinganActive) {
      actor.sharinganActive = false;
      actor.stats = calculateEffectiveStats(
        {
          ...actor.baseCharacter,
          leftEyeBlindness: actor.leftEyeBlindness,
          rightEyeBlindness: actor.rightEyeBlindness,
        },
        { inCombat: true, sharinganActive: false }
      );
      state.logs.push({
        id: `team_sh_off_${Date.now()}`,
        turn: state.turnNumber,
        timestampLabel: nowTimeLabel(),
        actor: 'player',
        actorName: actor.name,
        category: 'stance',
        actionName: `Desativar ${cfg.shortTitle}`,
        summary: `${actor.name} desativou o Sharingan para economizar chakra.`,
      });
      return { ok: true, state };
    }

    const check = canActivateSharinganInCombat(
      {
        clan: actor.clan,
        kekkeiGenkai: actor.kekkeiGenkai,
        leftEyeBlindness: actor.leftEyeBlindness,
        rightEyeBlindness: actor.rightEyeBlindness,
      },
      actor.chakra
    );
    if (!check.allowed) {
      return { ok: false, error: check.reason, state: prevState };
    }
    actor.chakra = Math.max(0, actor.chakra - check.activationChakra);
    actor.sharinganActive = true;
    actor.stats = calculateEffectiveStats(
      {
        ...actor.baseCharacter,
        leftEyeBlindness: actor.leftEyeBlindness,
        rightEyeBlindness: actor.rightEyeBlindness,
      },
      { inCombat: true, sharinganActive: true }
    );
    state.logs.push({
      id: `team_sh_on_${Date.now()}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: 'player',
      actorName: actor.name,
      category: 'stance',
      actionName: `Ativar ${cfg.shortTitle}`,
      actionMeta: `-${check.activationChakra} CH`,
      summary: `${actor.name} ativou o ${cfg.shortTitle} em batalha (${cfg.bonusBadge}).`,
    });
    return { ok: true, state };
  }

  // Turn-ending actions start here -> resolve start-of-turn control
  const ctrl = resolveTurnStartControl(actor.statuses, actor.maxHp, rng);
  actor.statuses = ctrl.updatedStatuses;

  if (!ctrl.canAct) {
    if (ctrl.selfDamage > 0) actor.hp = Math.max(0, actor.hp - ctrl.selfDamage);
    const tick = tickEndOfTurnStatuses(actor.statuses, actor.hp, actor.maxHp, actor.chakra, actor.maxChakra);
    actor.hp = tick.nextHp;
    actor.chakra = tick.nextChakra;
    actor.statuses = tick.nextStatuses;

    state.logs.push({
      id: `team_skip_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: actor.role === 'sensei' ? 'player' : 'ally',
      actorName: actor.name,
      category: 'control',
      actionName: 'Turno Impedido',
      damageAmount: ctrl.selfDamage > 0 ? ctrl.selfDamage : undefined,
      summary: `${actor.name} ${ctrl.narration || 'perdeu a ação.'}`,
      statusTicks: tick.logs.map((l) => `${actor.name}: ${l}`),
    });

    return { ok: true, state: advanceTeamTurnOrTriggerBoss(state, rng) };
  }

  if (action.type === 'defend') {
    actor.chakra = Math.min(actor.maxChakra, actor.chakra + 16);
    actor.statuses = mergeStatusEffects(
      actor.statuses,
      { type: 'shield', label: 'Postura Defensiva', target: 'self', duration: 1, potency: 0 },
      'Guarda de Equipe'
    );
    const tick = tickEndOfTurnStatuses(actor.statuses, actor.hp, actor.maxHp, actor.chakra, actor.maxChakra);
    actor.hp = tick.nextHp;
    actor.chakra = tick.nextChakra;
    actor.statuses = tick.nextStatuses;

    state.logs.push({
      id: `team_def_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: actor.role === 'sensei' ? 'player' : 'ally',
      actorName: actor.name,
      category: 'stance',
      actionName: 'Guarda Coordenada',
      actionMeta: '+16 CH · Escudo 1t',
      summary: `${actor.name} assume guarda fechada protegendo o flanco da célula e recupera +16 Chakra.`,
      statusTicks: tick.logs.map((l) => `${actor.name}: ${l}`),
    });

    return { ok: true, state: advanceTeamTurnOrTriggerBoss(state, rng) };
  }

  if (action.type === 'heal_ally') {
    const healCost = 22;
    if (actor.chakra < healCost) {
      return { ok: false, error: `Chakra insuficiente para Iryou de Campo (${actor.chakra}/${healCost} CH).`, state: prevState };
    }
    const target = state.squad.find((m) => m.slotIndex === action.targetSlotIndex && m.hp > 0);
    if (!target) {
      return { ok: false, error: 'Aliado alvo inválido para cura.', state: prevState };
    }

    const isMedic =
      actor.specialization.toLowerCase().includes('médic') ||
      actor.learnedJutsus.includes('shousen_jutsu');
    const healRatio = isMedic ? 0.34 : 0.24;
    const rawHeal = Math.round(target.maxHp * healRatio + actor.stats.controleChakra * 1.15);
    const actualHeal = Math.max(24, rawHeal);
    const beforeHp = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + actualHeal);
    const appliedHeal = Math.max(actualHeal, target.hp - beforeHp);
    target.statuses = target.statuses.filter((s) => s.type !== 'bleed' && s.type !== 'burn');

    actor.chakra = Math.max(0, actor.chakra - healCost);
    const tick = tickEndOfTurnStatuses(actor.statuses, actor.hp, actor.maxHp, actor.chakra, actor.maxChakra);
    actor.hp = tick.nextHp;
    actor.chakra = tick.nextChakra;
    actor.statuses = tick.nextStatuses;

    state.logs.push({
      id: `team_heal_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: actor.role === 'sensei' ? 'player' : 'ally',
      actorName: actor.name,
      category: 'item',
      actionName: isMedic ? 'Shousen no Jutsu (Cura em Equipe)' : 'Primeiros Socorros Shinobi',
      actionMeta: `+${appliedHeal} HP em ${target.name} · -${healCost} CH`,
      healingAmount: appliedHeal,
      summary: `${actor.name} canaliza chakra médico e restaura +${appliedHeal} HP de ${target.name} (${target.hp}/${target.maxHp} HP), purificando queimaduras e sangramentos.`,
      statusTicks: tick.logs.map((l) => `${actor.name}: ${l}`),
      hpSnapshot: {
        playerHp: state.squad.reduce((s, f) => s + f.hp, 0),
        playerMaxHp: state.squad.reduce((s, f) => s + f.maxHp, 0),
        enemyHp: state.boss.hp,
        enemyMaxHp: state.boss.maxHp,
      },
    });

    return { ok: true, state: advanceTeamTurnOrTriggerBoss(state, rng) };
  }

  if (action.type === 'team_combo') {
    if (state.comboCooldown > 0) {
      return {
        ok: false,
        error: `Ataque Sincronizado em recarga (aguarde ${state.comboCooldown} round(s)).`,
        state: prevState,
      };
    }
    const aliveMembers = state.squad.filter((m) => m.hp > 0);
    if (aliveMembers.length < 2) {
      return {
        ok: false,
        error: 'É necessário pelo menos 2 membros vivos na célula para executar Formação Sincronizada.',
        state: prevState,
      };
    }
    const comboCost = 28;
    if (actor.chakra < comboCost) {
      return { ok: false, error: `Chakra insuficiente (${actor.chakra}/${comboCost} CH).`, state: prevState };
    }

    actor.chakra = Math.max(0, actor.chakra - comboCost);
    const bossStats = getBossEffectiveStats(state.boss);
    const avgBasePower = Math.round(
      26 + aliveMembers.length * 14 * (1 + (state.synergy.attackBonusPct || 0) / 100)
    );
    const calc = calculateHitAndDamage(
      actor.stats,
      actor.chakraNature,
      bossStats,
      state.boss.nature,
      {
        id: 'team_combo_attack',
        category: 'Ninjutsu',
        nature: normalizeElementalNature(actor.chakraNature) || 'Neutro',
        basePower: avgBasePower,
        accuracyMod: 12,
        critBonus: 12,
      },
      rng,
      {
        attackerStatuses: actor.statuses,
        defenderStatuses: state.boss.statuses,
        attackerClan: actor.clan,
        attackerKekkei: actor.kekkeiGenkai,
        attackerSecondaryNature: actor.secondaryChakraNature,
        sharinganActive: actor.sharinganActive,
      }
    );

    if (calc.isHit && calc.damage > 0) {
      state.boss.hp = Math.max(0, state.boss.hp - calc.damage);
      for (const fx of calc.appliedEffects) {
        if (fx.target === 'enemy') {
          state.boss.statuses = mergeStatusEffects(state.boss.statuses, fx, 'Formação Sincronizada');
        }
      }
    }

    state.comboCooldown = 2;
    const tick = tickEndOfTurnStatuses(actor.statuses, actor.hp, actor.maxHp, actor.chakra, actor.maxChakra);
    actor.hp = tick.nextHp;
    actor.chakra = tick.nextChakra;
    actor.statuses = tick.nextStatuses;

    state.logs.push({
      id: `team_combo_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: 'player',
      actorName: actor.name,
      category: 'attack',
      actionName: `Formação Sincronizada (${aliveMembers.length} Shinobis)`,
      actionMeta: `Combo da Célula (+${state.synergy.attackBonusPct}% Sinergia) · -${comboCost} CH`,
      summary: calc.isHit
        ? `${aliveMembers.map((m) => m.name).join(' + ')} cercam ${state.boss.name} em ataque coordenado causando ${calc.damage} de dano!`
        : `${state.boss.name} escapa por pouco do cerco sincronizado da célula!`,
      calc,
      statusTicks: tick.logs.map((l) => `${actor.name}: ${l}`),
      hpSnapshot: {
        playerHp: state.squad.reduce((s, f) => s + f.hp, 0),
        playerMaxHp: state.squad.reduce((s, f) => s + f.maxHp, 0),
        enemyHp: state.boss.hp,
        enemyMaxHp: state.boss.maxHp,
      },
    });

    return { ok: true, state: advanceTeamTurnOrTriggerBoss(state, rng) };
  }

  if (action.type === 'melee') {
    const strike = MELEE_STRIKES.find((s) => s.id === action.strikeId) || MELEE_STRIKES[0];
    const dist = manhattanDistance(actor.pos, state.boss.pos);
    if (dist < strike.minRange || dist > strike.maxRange) {
      return { ok: false, error: `Aproxime-se a ${strike.maxRange} casa(s) do chefe (atual: ${dist}).`, state: prevState };
    }
    if (actor.chakra < strike.chakraCost) {
      return { ok: false, error: 'Chakra insuficiente para o golpe.', state: prevState };
    }
    actor.chakra = Math.max(0, actor.chakra - strike.chakraCost);
    const calc = calculateHitAndDamage(
      actor.stats,
      'Neutro',
      getBossEffectiveStats(state.boss),
      state.boss.nature,
      {
        id: strike.id,
        category: 'Taijutsu',
        nature: 'Neutro',
        basePower: strike.basePower,
        accuracyMod: strike.accuracyMod,
        critBonus: strike.critBonus,
        effects: strike.effects,
      },
      rng,
      {
        attackerStatuses: actor.statuses,
        defenderStatuses: state.boss.statuses,
        attackerClan: actor.clan,
        attackerKekkei: actor.kekkeiGenkai,
        sharinganActive: actor.sharinganActive,
      }
    );
    if (calc.isHit && calc.damage > 0) {
      state.boss.hp = Math.max(0, state.boss.hp - calc.damage);
      for (const fx of calc.appliedEffects) {
        if (fx.target === 'enemy') {
          state.boss.statuses = mergeStatusEffects(state.boss.statuses, fx, strike.name);
        } else {
          actor.statuses = mergeStatusEffects(actor.statuses, fx, strike.name);
        }
      }
    }
    const tick = tickEndOfTurnStatuses(actor.statuses, actor.hp, actor.maxHp, actor.chakra, actor.maxChakra);
    actor.hp = tick.nextHp;
    actor.chakra = tick.nextChakra;
    actor.statuses = tick.nextStatuses;

    state.logs.push({
      id: `team_melee_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: actor.role === 'sensei' ? 'player' : 'ally',
      actorName: actor.name,
      category: 'attack',
      actionName: strike.name,
      actionMeta: `Taijutsu · -${strike.chakraCost} CH`,
      summary: calc.isHit
        ? `${actor.name} conecta ${strike.name} causando ${calc.damage} de dano em ${state.boss.name}.`
        : `${state.boss.name} bloqueia ${strike.name} de ${actor.name}.`,
      calc,
      statusTicks: tick.logs.map((l) => `${actor.name}: ${l}`),
      hpSnapshot: {
        playerHp: state.squad.reduce((s, f) => s + f.hp, 0),
        playerMaxHp: state.squad.reduce((s, f) => s + f.maxHp, 0),
        enemyHp: state.boss.hp,
        enemyMaxHp: state.boss.maxHp,
      },
    });
    return { ok: true, state: advanceTeamTurnOrTriggerBoss(state, rng) };
  }

  // Jutsu action
  const jutsu = action.customJutsu || JUTSU_CATALOG.find((j) => j.id === action.jutsuId);
  if (!jutsu) {
    return { ok: false, error: 'Jutsu não encontrado.', state: prevState };
  }

  const ocularGate = canUseOcularJutsuInCombat(jutsu, actor.sharinganActive, {
    bothBlind: actor.leftEyeBlindness >= 100 && actor.rightEyeBlindness >= 100,
    usableEyes:
      (actor.leftEyeBlindness < 100 ? 1 : 0) + (actor.rightEyeBlindness < 100 ? 1 : 0) === 0
        ? 0
        : (actor.leftEyeBlindness < 100 && actor.rightEyeBlindness < 100 ? 2 : 1),
  });
  if (!ocularGate.allowed) {
    return { ok: false, error: ocularGate.reason, state: prevState };
  }

  const cost = getEffectiveJutsuChakraCost(jutsu, actor.stats);
  if (actor.chakra < cost) {
    return { ok: false, error: `Chakra insuficiente (${actor.chakra}/${cost} CH).`, state: prevState };
  }

  const isHealJutsu = jutsu.category === 'Iryou' && (jutsu.healRatio || 0) > 0;
  const dist = manhattanDistance(actor.pos, state.boss.pos);
  const range = getJutsuGridRange(jutsu);
  if (!isHealJutsu && (dist < range.minRange || dist > range.maxRange)) {
    return {
      ok: false,
      error: `Fora de alcance no grid (atual ${dist}, alcance ${range.minRange}-${range.maxRange}).`,
      state: prevState,
    };
  }

  const synergyScale = 1 + (state.synergy.attackBonusPct || 0) / 100;
  const calc = calculateHitAndDamage(
    actor.stats,
    actor.chakraNature,
    getBossEffectiveStats(state.boss),
    state.boss.nature,
    {
      ...jutsu,
      basePower: Math.round(jutsu.basePower * (isHealJutsu ? 1 : synergyScale)),
    },
    rng,
    {
      attackerStatuses: actor.statuses,
      defenderStatuses: state.boss.statuses,
      attackerClan: actor.clan,
      attackerKekkei: actor.kekkeiGenkai,
      attackerSecondaryNature: actor.secondaryChakraNature,
      sharinganActive: actor.sharinganActive,
    }
  );

  actor.chakra = Math.max(0, actor.chakra - cost);

  if (calc.healing > 0) {
    const healTarget =
      action.targetSlotIndex !== undefined
        ? state.squad.find((m) => m.slotIndex === action.targetSlotIndex && m.hp > 0) || actor
        : actor;
    healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + calc.healing);
    healTarget.statuses = mergeStatusEffects(
      healTarget.statuses,
      { type: 'regen', label: 'Regeneração', target: 'self', duration: 2, potency: 18 },
      jutsu.name
    );
  }

  if (calc.isHit && calc.damage > 0 && !isHealJutsu) {
    state.boss.hp = Math.max(0, state.boss.hp - calc.damage);
    for (const fx of calc.appliedEffects) {
      if (fx.target === 'enemy') {
        state.boss.statuses = mergeStatusEffects(state.boss.statuses, fx, jutsu.name);
      } else {
        actor.statuses = mergeStatusEffects(actor.statuses, fx, jutsu.name);
      }
    }
  }

  const strain = applyOcularJutsuStrain(
    { leftEyeBlindness: actor.leftEyeBlindness, rightEyeBlindness: actor.rightEyeBlindness },
    jutsu
  );
  if (strain.triggered) {
    actor.leftEyeBlindness = strain.leftEyeBlindness;
    actor.rightEyeBlindness = strain.rightEyeBlindness;
    if (strain.becameCompletelyBlind) actor.sharinganActive = false;
    if (strain.logMessage) {
      state.ocularStrainEvents.push({
        characterId: actor.characterId,
        userUid: actor.userUid,
        leftEyeBlindness: strain.leftEyeBlindness,
        rightEyeBlindness: strain.rightEyeBlindness,
        event: strain.logMessage,
      });
    }
  }

  const tick = tickEndOfTurnStatuses(actor.statuses, actor.hp, actor.maxHp, actor.chakra, actor.maxChakra);
  actor.hp = tick.nextHp;
  actor.chakra = tick.nextChakra;
  actor.statuses = tick.nextStatuses;

  state.logs.push({
    id: `team_jutsu_${Date.now()}_${state.turnNumber}`,
    turn: state.turnNumber,
    timestampLabel: nowTimeLabel(),
    actor: actor.role === 'sensei' ? 'player' : 'ally',
    actorName: actor.name,
    category: 'attack',
    actionName: jutsu.name,
    actionMeta: `${jutsu.category} · ${jutsu.nature} · -${cost} CH`,
    summary: isHealJutsu
      ? `${actor.name} executa ${jutsu.name} restaurando +${calc.healing} HP!`
      : calc.isHit
      ? `${actor.name} acerta ${state.boss.name} com ${jutsu.name} causando ${calc.damage} de dano!`
      : `${state.boss.name} esquiva de ${jutsu.name}!`,
    calc: isHealJutsu ? { ...calc, damage: 0, isHit: true } : calc,
    statusTicks: tick.logs.map((l) => `${actor.name}: ${l}`),
    extraNotes: strain.logMessage ? [strain.logMessage] : undefined,
    hpSnapshot: {
      playerHp: state.squad.reduce((s, f) => s + f.hp, 0),
      playerMaxHp: state.squad.reduce((s, f) => s + f.maxHp, 0),
      enemyHp: state.boss.hp,
      enemyMaxHp: state.boss.maxHp,
    },
  });

  return { ok: true, state: advanceTeamTurnOrTriggerBoss(state, rng) };
}

// ============================================================================
// 5. SERVER-AUTHORITATIVE 1v1 PVP DUEL ENGINE
// ============================================================================

export interface PvpFighterState {
  characterId: number;
  userUid: string;
  name: string;
  avatarUrl: string;
  rank: string;
  village: string;
  clan: string;
  kekkeiGenkai: string;
  chakraNature: string;
  secondaryChakraNature: string;
  learnedJutsus: string[];
  hp: number;
  maxHp: number;
  chakra: number;
  maxChakra: number;
  leftEyeBlindness: number;
  rightEyeBlindness: number;
  sharinganActive: boolean;
  statuses: ActiveStatusEffect[];
  pos: GridCoord;
  moveRemaining: number;
  consumables: Array<{ itemId: string; qty: number }>;
  stats: EffectiveStats;
  baseCharacter: CharacterModel;
}

export interface PvpBattleState {
  mode: 'live_pvp' | 'ranked_spar';
  village: string;
  wagerRyo: number;
  grid: TacticalGridState;
  challenger: PvpFighterState;
  opponent: PvpFighterState | null;
  activeTurnSide: 'challenger' | 'opponent';
  turnNumber: number;
  winnerSide: 'challenger' | 'opponent' | null;
  logs: SerializedBattleLogItem[];
  ocularStrainEvents: Array<{
    characterId: number;
    userUid: string;
    leftEyeBlindness: number;
    rightEyeBlindness: number;
    event: string;
  }>;
}

export interface PvpDuelRecord {
  id: number;
  mode: 'live_pvp' | 'ranked_spar';
  status: 'waiting' | 'active' | 'finished';
  village: string;
  wagerRyo: number;
  challengerUid: string;
  challengerCharId: number;
  challengerName: string;
  opponentUid: string | null;
  opponentCharId: number | null;
  opponentName: string | null;
  currentTurnUid: string;
  turnNumber: number;
  winnerUid: string | null;
  winnerName: string | null;
  state: PvpBattleState;
  createdAt?: string;
}

function buildPvpFighter(char: CharacterModel, pos: GridCoord): PvpFighterState {
  const eff = calculateEffectiveStats(char, { inCombat: true, sharinganActive: false });
  const consumables = (char.inventory || [])
    .filter((entry) => {
      const def = ITEM_CATALOG.find((i) => i.id === entry.itemId);
      return def?.category === 'consumable' && entry.qty > 0;
    })
    .map((e) => ({ itemId: e.itemId, qty: e.qty }));

  return {
    characterId: char.id,
    userUid: char.userUid,
    name: char.name,
    avatarUrl: char.avatarUrl,
    rank: char.rank,
    village: char.village,
    clan: char.clan,
    kekkeiGenkai: char.kekkeiGenkai,
    chakraNature: char.chakraNature,
    secondaryChakraNature: char.secondaryChakraNature || 'Nenhum',
    learnedJutsus:
      Array.isArray(char.learnedJutsus) && char.learnedJutsus.length > 0 ? char.learnedJutsus : ['bunshin'],
    hp: eff.maxHp,
    maxHp: eff.maxHp,
    chakra: eff.maxChakra,
    maxChakra: eff.maxChakra,
    leftEyeBlindness: char.leftEyeBlindness ?? 0,
    rightEyeBlindness: char.rightEyeBlindness ?? 0,
    sharinganActive: false,
    statuses: [],
    pos,
    moveRemaining: getPlayerMoveRange(eff),
    consumables,
    stats: eff,
    baseCharacter: char,
  };
}

export function buildInitialPvpState(params: {
  mode: 'live_pvp' | 'ranked_spar';
  village: string;
  wagerRyo: number;
  challenger: CharacterModel;
  opponent?: CharacterModel | null;
}): PvpBattleState {
  const grid = createTacticalGrid(`pvp_${params.challenger.id}_${Date.now()}`);
  const challengerPos: GridCoord = { x: 1, y: 2 };
  const opponentPos: GridCoord = { x: 5, y: 2 };
  grid.playerPos = challengerPos;
  grid.enemyPos = opponentPos;

  const challengerFighter = buildPvpFighter(params.challenger, challengerPos);
  const opponentFighter = params.opponent ? buildPvpFighter(params.opponent, opponentPos) : null;

  const logs: SerializedBattleLogItem[] = [
    {
      id: `pvp_init_${Date.now()}`,
      turn: 0,
      timestampLabel: nowTimeLabel(),
      actor: 'system',
      actorName: 'Árbitro PvP',
      category: 'system',
      actionName:
        params.mode === 'live_pvp' ? 'Sala PvP 1v1 Criada' : `Duelo Rankeado 1v1: ${params.challenger.name} vs ${opponentFighter?.name || 'Rival'}`,
      actionMeta: `Arena ${params.village} · Aposta ${params.wagerRyo} Ryo`,
      summary: opponentFighter
        ? `${challengerFighter.name} (${challengerFighter.chakraNature}) enfrenta ${opponentFighter.name} (${opponentFighter.chakraNature}) no grid tático 7×5. Turno 1 de ${challengerFighter.name}.`
        : `${challengerFighter.name} abriu desafio PvP na Arena de ${params.village}. Aguardando oponente aceitar!`,
      hpSnapshot: opponentFighter
        ? {
            playerHp: challengerFighter.hp,
            playerMaxHp: challengerFighter.maxHp,
            enemyHp: opponentFighter.hp,
            enemyMaxHp: opponentFighter.maxHp,
          }
        : undefined,
    },
  ];

  return {
    mode: params.mode,
    village: params.village,
    wagerRyo: params.wagerRyo,
    grid,
    challenger: challengerFighter,
    opponent: opponentFighter,
    activeTurnSide: 'challenger',
    turnNumber: 1,
    winnerSide: null,
    logs,
    ocularStrainEvents: [],
  };
}

export function attachPvpOpponent(prev: PvpBattleState, opponentChar: CharacterModel): PvpBattleState {
  const next: PvpBattleState = structuredClone(prev);
  const opponentFighter = buildPvpFighter(opponentChar, { x: 5, y: 2 });
  next.opponent = opponentFighter;
  next.grid.enemyPos = { x: 5, y: 2 };
  next.logs.push({
    id: `pvp_join_${Date.now()}`,
    turn: 1,
    timestampLabel: nowTimeLabel(),
    actor: 'system',
    actorName: 'Árbitro PvP',
    category: 'system',
    actionName: `${opponentFighter.name} aceitou o duelo PvP`,
    actionMeta: `${opponentFighter.village} · ${opponentFighter.rank}`,
    summary: `O combate 1v1 começou! ${next.challenger.name} inicia o Turno 1 contra ${opponentFighter.name}.`,
    hpSnapshot: {
      playerHp: next.challenger.hp,
      playerMaxHp: next.challenger.maxHp,
      enemyHp: opponentFighter.hp,
      enemyMaxHp: opponentFighter.maxHp,
    },
  });
  return next;
}

export type PvpActionPayload =
  | { type: 'move'; to: GridCoord }
  | { type: 'toggle_sharingan' }
  | { type: 'jutsu'; jutsuId: string; customJutsu?: JutsuDef }
  | { type: 'melee'; strikeId: string }
  | { type: 'weapon'; weaponId: string; infusionElement?: string }
  | { type: 'consumable'; itemId: string }
  | { type: 'defend' }
  | { type: 'surrender' };

function finalizePvpTurn(
  state: PvpBattleState,
  actingSide: 'challenger' | 'opponent',
  rng: () => number
): PvpBattleState {
  const attacker = actingSide === 'challenger' ? state.challenger : state.opponent!;
  const defender = actingSide === 'challenger' ? state.opponent! : state.challenger;

  // Apply Sharingan upkeep if active
  if (attacker.sharinganActive) {
    const stage = getSharinganStageNumber(attacker.kekkeiGenkai, attacker.clan);
    const cfg = getSharinganCombatConfig(stage);
    if (attacker.chakra < cfg.upkeepChakra) {
      attacker.chakra = 0;
      attacker.sharinganActive = false;
      attacker.stats = calculateEffectiveStats(
        {
          ...attacker.baseCharacter,
          leftEyeBlindness: attacker.leftEyeBlindness,
          rightEyeBlindness: attacker.rightEyeBlindness,
        },
        { inCombat: true, sharinganActive: false }
      );
    } else {
      attacker.chakra = Math.max(0, attacker.chakra - cfg.upkeepChakra);
    }
  }

  const tick = tickEndOfTurnStatuses(
    attacker.statuses,
    attacker.hp,
    attacker.maxHp,
    attacker.chakra,
    attacker.maxChakra
  );
  attacker.hp = tick.nextHp;
  attacker.chakra = tick.nextChakra;
  attacker.statuses = tick.nextStatuses;

  if (tick.logs.length > 0 && state.logs.length > 0) {
    const lastLog = state.logs[state.logs.length - 1];
    lastLog.statusTicks = [...(lastLog.statusTicks || []), ...tick.logs.map((l) => `${attacker.name}: ${l}`)];
    lastLog.hpSnapshot = {
      playerHp: state.challenger.hp,
      playerMaxHp: state.challenger.maxHp,
      enemyHp: state.opponent!.hp,
      enemyMaxHp: state.opponent!.maxHp,
    };
  }

  if (defender.hp <= 0) {
    state.winnerSide = actingSide;
    state.logs.push({
      id: `pvp_ko_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: 'system',
      actorName: 'Árbitro PvP',
      category: 'outcome',
      actionName: `Vitória de ${attacker.name}`,
      actionMeta: state.wagerRyo > 0 ? `+${state.wagerRyo} Ryo` : 'Duelo Oficial',
      summary: `${attacker.name} derrotou ${defender.name} na Arena PvP após ${state.turnNumber} turno(s)!`,
      hpSnapshot: {
        playerHp: state.challenger.hp,
        playerMaxHp: state.challenger.maxHp,
        enemyHp: state.opponent!.hp,
        enemyMaxHp: state.opponent!.maxHp,
      },
    });
    return state;
  }

  if (attacker.hp <= 0) {
    const otherSide = actingSide === 'challenger' ? 'opponent' : 'challenger';
    state.winnerSide = otherSide;
    state.logs.push({
      id: `pvp_ko_self_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: 'system',
      actorName: 'Árbitro PvP',
      category: 'outcome',
      actionName: `Vitória de ${defender.name}`,
      summary: `${attacker.name} sucumbiu aos efeitos contínuos! Vitória de ${defender.name}.`,
      hpSnapshot: {
        playerHp: state.challenger.hp,
        playerMaxHp: state.challenger.maxHp,
        enemyHp: state.opponent!.hp,
        enemyMaxHp: state.opponent!.maxHp,
      },
    });
    return state;
  }

  state.grid.clouds = tickTileClouds(state.grid.clouds);
  const nextSide = actingSide === 'challenger' ? 'opponent' : 'challenger';
  state.activeTurnSide = nextSide;
  state.turnNumber += 1;
  const nextFighter = nextSide === 'challenger' ? state.challenger : state.opponent!;
  nextFighter.moveRemaining = getPlayerMoveRange(nextFighter.stats);

  // Sync grid coords cleanly
  state.grid.playerPos = state.challenger.pos;
  state.grid.enemyPos = state.opponent!.pos;

  // Touch rng if passed so compiler stays clean
  void rng;
  return state;
}

export function resolvePvpAction(
  prevState: PvpBattleState,
  side: 'challenger' | 'opponent',
  action: PvpActionPayload,
  rng: () => number = Math.random
): { ok: boolean; error?: string; state: PvpBattleState } {
  const state: PvpBattleState = structuredClone(prevState);

  if (state.winnerSide) {
    return { ok: false, error: 'Este duelo PvP já foi concluído.', state: prevState };
  }
  if (!state.opponent) {
    return { ok: false, error: 'Aguardando um oponente entrar na sala PvP.', state: prevState };
  }
  if (state.activeTurnSide !== side) {
    return { ok: false, error: 'Não é o seu turno neste duelo.', state: prevState };
  }

  const actor = side === 'challenger' ? state.challenger : state.opponent;
  const defender = side === 'challenger' ? state.opponent : state.challenger;
  const logActor: 'player' | 'enemy' = side === 'challenger' ? 'player' : 'enemy';

  if (action.type === 'surrender') {
    const otherSide = side === 'challenger' ? 'opponent' : 'challenger';
    state.winnerSide = otherSide;
    state.logs.push({
      id: `pvp_surr_${Date.now()}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: 'system',
      actorName: 'Árbitro PvP',
      category: 'outcome',
      actionName: `${actor.name} rendeu-se`,
      summary: `${actor.name} sinalizou retirada da arena. Vitória declarada para ${defender.name}!`,
    });
    return { ok: true, state };
  }

  if (action.type === 'move') {
    if (!canMoveToTile(state.grid, actor.pos, action.to, actor.moveRemaining, defender.pos)) {
      return { ok: false, error: 'Casa de destino inválida ou fora do alcance de movimento.', state: prevState };
    }
    const steps = manhattanDistance(actor.pos, action.to);
    const fromCoord = `${String.fromCharCode(65 + actor.pos.x)}${actor.pos.y + 1}`;
    const toCoord = `${String.fromCharCode(65 + action.to.x)}${action.to.y + 1}`;
    actor.pos = action.to;
    actor.moveRemaining = Math.max(0, actor.moveRemaining - steps);
    state.grid.playerPos = state.challenger.pos;
    state.grid.enemyPos = state.opponent.pos;
    state.logs.push({
      id: `pvp_mv_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: logActor,
      actorName: actor.name,
      category: 'move',
      actionName: `Movimento (${fromCoord} → ${toCoord})`,
      actionMeta: `-${steps} passo(s)`,
      summary: `${actor.name} move-se para ${toCoord} no grid. Distância atual: ${manhattanDistance(actor.pos, defender.pos)} casa(s).`,
    });
    return { ok: true, state };
  }

  if (action.type === 'toggle_sharingan') {
    const stage = getSharinganStageNumber(actor.kekkeiGenkai, actor.clan);
    if (stage === 0) {
      return { ok: false, error: 'Este lutador não possui Sharingan.', state: prevState };
    }
    const cfg = getSharinganCombatConfig(stage);
    if (actor.sharinganActive) {
      actor.sharinganActive = false;
      actor.stats = calculateEffectiveStats(
        {
          ...actor.baseCharacter,
          leftEyeBlindness: actor.leftEyeBlindness,
          rightEyeBlindness: actor.rightEyeBlindness,
        },
        { inCombat: true, sharinganActive: false }
      );
      state.logs.push({
        id: `pvp_sh_off_${Date.now()}`,
        turn: state.turnNumber,
        timestampLabel: nowTimeLabel(),
        actor: logActor,
        actorName: actor.name,
        category: 'stance',
        actionName: `Desativar ${cfg.shortTitle}`,
        summary: `${actor.name} desativa o ${cfg.shortTitle}.`,
      });
      return { ok: true, state };
    }

    const check = canActivateSharinganInCombat(
      {
        clan: actor.clan,
        kekkeiGenkai: actor.kekkeiGenkai,
        leftEyeBlindness: actor.leftEyeBlindness,
        rightEyeBlindness: actor.rightEyeBlindness,
      },
      actor.chakra
    );
    if (!check.allowed) {
      return { ok: false, error: check.reason, state: prevState };
    }
    actor.chakra = Math.max(0, actor.chakra - check.activationChakra);
    actor.sharinganActive = true;
    actor.stats = calculateEffectiveStats(
      {
        ...actor.baseCharacter,
        leftEyeBlindness: actor.leftEyeBlindness,
        rightEyeBlindness: actor.rightEyeBlindness,
      },
      { inCombat: true, sharinganActive: true }
    );
    state.logs.push({
      id: `pvp_sh_on_${Date.now()}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: logActor,
      actorName: actor.name,
      category: 'stance',
      actionName: `Ativar ${cfg.shortTitle}`,
      actionMeta: `-${check.activationChakra} CH`,
      summary: `${actor.name} desperta o ${cfg.shortTitle} em batalha (${cfg.bonusBadge})!`,
    });
    return { ok: true, state };
  }

  // Turn-ending action: resolve control statuses
  const ctrl = resolveTurnStartControl(actor.statuses, actor.maxHp, rng);
  actor.statuses = ctrl.updatedStatuses;

  if (!ctrl.canAct) {
    if (ctrl.selfDamage > 0) actor.hp = Math.max(0, actor.hp - ctrl.selfDamage);
    state.logs.push({
      id: `pvp_ctrl_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: logActor,
      actorName: actor.name,
      category: 'control',
      actionName: 'Controle Tático',
      damageAmount: ctrl.selfDamage > 0 ? ctrl.selfDamage : undefined,
      summary: `${actor.name} ${ctrl.narration || 'perdeu o turno!'}`,
    });
    return { ok: true, state: finalizePvpTurn(state, side, rng) };
  }

  if (action.type === 'defend') {
    actor.chakra = Math.min(actor.maxChakra, actor.chakra + 14);
    actor.statuses = mergeStatusEffects(
      actor.statuses,
      { type: 'shield', label: 'Postura Defensiva', target: 'self', duration: 1, potency: 0 },
      'Guarda PvP'
    );
    state.logs.push({
      id: `pvp_def_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: logActor,
      actorName: actor.name,
      category: 'stance',
      actionName: 'Postura Defensiva',
      actionMeta: '+14 CH · Escudo (-30% Dano 1t)',
      summary: `${actor.name} fecha a guarda e recupera +14 Chakra.`,
    });
    return { ok: true, state: finalizePvpTurn(state, side, rng) };
  }

  if (action.type === 'consumable') {
    const slot = actor.consumables.find((c) => c.itemId === action.itemId && c.qty > 0);
    const def = ITEM_CATALOG.find((i) => i.id === action.itemId);
    if (!slot || !def) {
      return { ok: false, error: 'Consumível indisponível.', state: prevState };
    }
    slot.qty -= 1;
    const beforeHp = actor.hp;
    const healHp = def.healHp || 0;
    const healCh = def.healChakra || 0;
    actor.hp = Math.min(actor.maxHp, actor.hp + healHp);
    actor.chakra = Math.min(actor.maxChakra, actor.chakra + healCh);
    const actualHeal = actor.hp - beforeHp;
    state.logs.push({
      id: `pvp_item_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: logActor,
      actorName: actor.name,
      category: 'item',
      actionName: `Consumível: ${def.name}`,
      actionMeta: healHp ? `+${healHp} HP` : `+${healCh} CH`,
      healingAmount: healHp > 0 ? Math.max(healHp, actualHeal) : undefined,
      summary: `${actor.name} utilizou ${def.name} recuperando ${healHp ? `${healHp} HP` : `${healCh} Chakra`}.`,
    });
    return { ok: true, state: finalizePvpTurn(state, side, rng) };
  }

  if (action.type === 'melee') {
    const strike = MELEE_STRIKES.find((s) => s.id === action.strikeId) || MELEE_STRIKES[0];
    const dist = manhattanDistance(actor.pos, defender.pos);
    if (dist < strike.minRange || dist > strike.maxRange) {
      return { ok: false, error: `Corpo a corpo exige alcance 1 (atual: ${dist}).`, state: prevState };
    }
    if (actor.chakra < strike.chakraCost) {
      return { ok: false, error: 'Chakra insuficiente.', state: prevState };
    }
    actor.chakra = Math.max(0, actor.chakra - strike.chakraCost);
    const calc = calculateHitAndDamage(
      actor.stats,
      'Neutro',
      defender.stats,
      defender.chakraNature,
      {
        id: strike.id,
        category: 'Taijutsu',
        nature: 'Neutro',
        basePower: strike.basePower,
        accuracyMod: strike.accuracyMod,
        critBonus: strike.critBonus,
        effects: strike.effects,
      },
      rng,
      {
        attackerStatuses: actor.statuses,
        defenderStatuses: defender.statuses,
        attackerClan: actor.clan,
        attackerKekkei: actor.kekkeiGenkai,
        defenderSecondaryNature: defender.secondaryChakraNature,
        sharinganActive: actor.sharinganActive,
      }
    );
    if (calc.isHit && calc.damage > 0) {
      defender.hp = Math.max(0, defender.hp - calc.damage);
      for (const fx of calc.appliedEffects) {
        if (fx.target === 'enemy') defender.statuses = mergeStatusEffects(defender.statuses, fx, strike.name);
        else actor.statuses = mergeStatusEffects(actor.statuses, fx, strike.name);
      }
      if (strike.knockbackTiles > 0) {
        defender.pos = computeKnockbackTile(state.grid, actor.pos, defender.pos, strike.knockbackTiles);
      }
    }
    state.logs.push({
      id: `pvp_melee_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: logActor,
      actorName: actor.name,
      category: 'attack',
      actionName: strike.name,
      actionMeta: `Taijutsu · -${strike.chakraCost} CH`,
      summary: calc.isHit
        ? `${actor.name} acerta ${strike.name} causando ${calc.damage} de dano em ${defender.name}.`
        : `${defender.name} esquiva do ataque ${strike.name}!`,
      calc,
    });
    return { ok: true, state: finalizePvpTurn(state, side, rng) };
  }

  if (action.type === 'weapon') {
    const equippedId = actor.baseCharacter.equippedGear?.weapon;
    const customWp = equippedId ? EQUIPPED_WEAPON_PROFILES[equippedId] : undefined;
    const allWeapons = customWp ? [customWp, ...STANDARD_NINJA_TOOLS] : STANDARD_NINJA_TOOLS;
    const weapon = allWeapons.find((w) => w.id === action.weaponId) || STANDARD_NINJA_TOOLS[0];
    const dist = manhattanDistance(actor.pos, defender.pos);
    if (dist < weapon.minRange || dist > weapon.maxRange) {
      return { ok: false, error: `Fora do alcance da arma (atual: ${dist}, máx: ${weapon.maxRange}).`, state: prevState };
    }
    if (actor.chakra < weapon.chakraCost) {
      return { ok: false, error: 'Chakra insuficiente.', state: prevState };
    }

    if (weapon.kind === 'smoke_bomb') {
      actor.chakra = Math.max(0, actor.chakra - weapon.chakraCost);
      state.grid.clouds = applyTileCloudArea(state.grid.clouds, actor.pos, 1, 'smoke', 3);
      state.logs.push({
        id: `pvp_smoke_${Date.now()}_${state.turnNumber}`,
        turn: state.turnNumber,
        timestampLabel: nowTimeLabel(),
        actor: logActor,
        actorName: actor.name,
        category: 'item',
        actionName: weapon.name,
        actionMeta: `Fumaça 3×3 (3t) · -${weapon.chakraCost} CH`,
        summary: `${actor.name} detona ${weapon.name} cobrindo a área ao redor de seu posicionamento.`,
      });
      return { ok: true, state: finalizePvpTurn(state, side, rng) };
    }

    const infused =
      action.infusionElement && action.infusionElement !== 'none' && !weapon.nature
        ? normalizeElementalNature(action.infusionElement) || 'Neutro'
        : weapon.nature || 'Neutro';
    const extraCh = infused !== 'Neutro' && !weapon.nature ? 4 : 0;
    if (actor.chakra < weapon.chakraCost + extraCh) {
      return { ok: false, error: 'Chakra insuficiente para fluxo elemental na arma.', state: prevState };
    }
    actor.chakra = Math.max(0, actor.chakra - (weapon.chakraCost + extraCh));
    const calc = calculateHitAndDamage(
      actor.stats,
      actor.chakraNature,
      defender.stats,
      defender.chakraNature,
      {
        id: weapon.id,
        category: weapon.kind === 'melee_blade' ? 'Kenjutsu' : 'Taijutsu',
        nature: infused,
        basePower: weapon.basePower + (extraCh > 0 ? 6 : 0),
        accuracyMod: weapon.accuracyMod,
        critBonus: weapon.critBonus,
        effects: weapon.appliesEffect
          ? [
              {
                type: weapon.appliesEffect,
                target: 'enemy' as const,
                chance: 75,
                duration: 2,
                potency: Math.max(12, Math.round(weapon.basePower * 0.25)),
                label: weapon.appliesEffect,
              },
            ]
          : undefined,
      },
      rng,
      {
        attackerStatuses: actor.statuses,
        defenderStatuses: defender.statuses,
        attackerClan: actor.clan,
        attackerKekkei: actor.kekkeiGenkai,
        attackerSecondaryNature: actor.secondaryChakraNature,
        defenderSecondaryNature: defender.secondaryChakraNature,
        sharinganActive: actor.sharinganActive,
      }
    );
    if (calc.isHit && calc.damage > 0) {
      defender.hp = Math.max(0, defender.hp - calc.damage);
      for (const fx of calc.appliedEffects) {
        if (fx.target === 'enemy') defender.statuses = mergeStatusEffects(defender.statuses, fx, weapon.name);
        else actor.statuses = mergeStatusEffects(actor.statuses, fx, weapon.name);
      }
    }
    state.logs.push({
      id: `pvp_wp_${Date.now()}_${state.turnNumber}`,
      turn: state.turnNumber,
      timestampLabel: nowTimeLabel(),
      actor: logActor,
      actorName: actor.name,
      category: 'attack',
      actionName: weapon.name,
      actionMeta: `${formatElementalLabel(infused)} · -${weapon.chakraCost + extraCh} CH`,
      summary: calc.isHit
        ? `${actor.name} atinge ${defender.name} com ${weapon.name} causando ${calc.damage} de dano.`
        : `${defender.name} desvia de ${weapon.name}!`,
      calc,
    });
    return { ok: true, state: finalizePvpTurn(state, side, rng) };
  }

  // Jutsu action
  const jutsu = action.customJutsu || JUTSU_CATALOG.find((j) => j.id === action.jutsuId);
  if (!jutsu) {
    return { ok: false, error: 'Jutsu não encontrado.', state: prevState };
  }

  const ocularGate = canUseOcularJutsuInCombat(jutsu, actor.sharinganActive, {
    bothBlind: actor.leftEyeBlindness >= 100 && actor.rightEyeBlindness >= 100,
    usableEyes:
      actor.leftEyeBlindness >= 100 && actor.rightEyeBlindness >= 100
        ? 0
        : actor.leftEyeBlindness < 100 && actor.rightEyeBlindness < 100
        ? 2
        : 1,
  });
  if (!ocularGate.allowed) {
    return { ok: false, error: ocularGate.reason, state: prevState };
  }

  const cost = getEffectiveJutsuChakraCost(jutsu, actor.stats);
  if (actor.chakra < cost) {
    return { ok: false, error: `Chakra insuficiente (${actor.chakra}/${cost} CH).`, state: prevState };
  }

  const dist = manhattanDistance(actor.pos, defender.pos);
  const range = getJutsuGridRange(jutsu);
  if (dist < range.minRange || dist > range.maxRange) {
    return {
      ok: false,
      error: `Fora de alcance no grid (atual: ${dist}, necessário: ${range.minRange}–${range.maxRange}).`,
      state: prevState,
    };
  }

  if (jutsu.id === 'uchiha_izanagi' || jutsu.id === 'izanagi') {
    actor.statuses = actor.statuses.filter(
      (s) =>
        !new Set([
          'burn',
          'bleed',
          'poison',
          'drowning',
          'paralysis',
          'stun',
          'chakra_seal',
          'crush',
          'mind_control',
        ]).has(s.type)
    );
  }

  const calc = calculateHitAndDamage(
    actor.stats,
    actor.chakraNature,
    defender.stats,
    defender.chakraNature,
    jutsu,
    rng,
    {
      attackerStatuses: actor.statuses,
      defenderStatuses: defender.statuses,
      attackerClan: actor.clan,
      attackerKekkei: actor.kekkeiGenkai,
      attackerSecondaryNature: actor.secondaryChakraNature,
      defenderSecondaryNature: defender.secondaryChakraNature,
      sharinganActive: actor.sharinganActive,
    }
  );

  actor.chakra = Math.max(0, actor.chakra - cost);
  if (calc.healing > 0) {
    actor.hp = Math.min(actor.maxHp, actor.hp + calc.healing);
  }
  if (calc.isHit && calc.damage > 0) {
    defender.hp = Math.max(0, defender.hp - calc.damage);
    for (const fx of calc.appliedEffects) {
      if (fx.target === 'enemy') defender.statuses = mergeStatusEffects(defender.statuses, fx, jutsu.name);
      else actor.statuses = mergeStatusEffects(actor.statuses, fx, jutsu.name);
    }
  }

  const strain = applyOcularJutsuStrain(
    { leftEyeBlindness: actor.leftEyeBlindness, rightEyeBlindness: actor.rightEyeBlindness },
    jutsu
  );
  if (strain.triggered) {
    actor.leftEyeBlindness = strain.leftEyeBlindness;
    actor.rightEyeBlindness = strain.rightEyeBlindness;
    if (strain.becameCompletelyBlind) actor.sharinganActive = false;
    if (strain.logMessage) {
      state.ocularStrainEvents.push({
        characterId: actor.characterId,
        userUid: actor.userUid,
        leftEyeBlindness: strain.leftEyeBlindness,
        rightEyeBlindness: strain.rightEyeBlindness,
        event: strain.logMessage,
      });
    }
  }

  if (jutsu.nature === 'Katon') {
    state.grid.clouds = applyTileCloudArea(state.grid.clouds, defender.pos, 1, 'soot', 2);
  } else if (jutsu.nature === 'Suiton') {
    state.grid.clouds = applyTileCloudArea(state.grid.clouds, defender.pos, 1, 'mist', 2);
  }

  state.logs.push({
    id: `pvp_jutsu_${Date.now()}_${state.turnNumber}`,
    turn: state.turnNumber,
    timestampLabel: nowTimeLabel(),
    actor: logActor,
    actorName: actor.name,
    category: 'attack',
    actionName: jutsu.name,
    actionMeta: `${jutsu.category} · ${jutsu.nature} · -${cost} CH`,
    summary: calc.isHit
      ? `${actor.name} atinge ${defender.name} com ${jutsu.name}${calc.damage > 0 ? ` causando ${calc.damage} de dano` : ''}${calc.healing > 0 ? ` e restaurando +${calc.healing} HP` : ''}.`
      : `${defender.name} evade ${jutsu.name}!`,
    calc,
    extraNotes: strain.logMessage ? [strain.logMessage] : undefined,
  });

  return { ok: true, state: finalizePvpTurn(state, side, rng) };
}

export function executeSparAiTurn(
  prevState: PvpBattleState,
  rng: () => number = Math.random
): PvpBattleState {
  if (prevState.winnerSide || !prevState.opponent || prevState.activeTurnSide !== 'opponent') {
    return prevState;
  }

  let working = prevState;
  const bot = working.opponent!;
  const challenger = working.challenger;

  // Activate Sharingan if available & affordable
  const shStage = getSharinganStageNumber(bot.kekkeiGenkai, bot.clan);
  if (shStage > 0 && !bot.sharinganActive && bot.chakra >= 40) {
    const res = resolvePvpAction(working, 'opponent', { type: 'toggle_sharingan' }, rng);
    if (res.ok) working = res.state;
  }

  // Move closer if needed
  const currentBot = working.opponent!;
  const dist = manhattanDistance(currentBot.pos, challenger.pos);
  if (dist > 3 && currentBot.moveRemaining > 0) {
    const stepTarget = computeEnemyGridMove(working.grid, currentBot.pos, challenger.pos, 2);
    if (stepTarget.x !== currentBot.pos.x || stepTarget.y !== currentBot.pos.y) {
      const mv = resolvePvpAction(working, 'opponent', { type: 'move', to: stepTarget }, rng);
      if (mv.ok) working = mv.state;
    }
  }

  const botAfterMove = working.opponent!;
  const distNow = manhattanDistance(botAfterMove.pos, working.challenger.pos);

  // Heal if HP is critically low & knows Iryou
  if (botAfterMove.hp < botAfterMove.maxHp * 0.4) {
    const healJutsu = botAfterMove.learnedJutsus
      .map((id) => JUTSU_CATALOG.find((j) => j.id === id))
      .find((j) => j && (j.healRatio || 0) > 0 && botAfterMove.chakra >= getEffectiveJutsuChakraCost(j, botAfterMove.stats));
    if (healJutsu) {
      const r = resolvePvpAction(working, 'opponent', { type: 'jutsu', jutsuId: healJutsu.id }, rng);
      if (r.ok) return r.state;
    }
  }

  // Pick strongest in-range affordable jutsu
  const candidates = botAfterMove.learnedJutsus
    .map((id) => JUTSU_CATALOG.find((j) => j.id === id))
    .filter((j): j is JutsuDef => Boolean(j))
    .filter((j) => {
      const range = getJutsuGridRange(j);
      const cost = getEffectiveJutsuChakraCost(j, botAfterMove.stats);
      const ocularOk = canUseOcularJutsuInCombat(j, botAfterMove.sharinganActive, {
        bothBlind: botAfterMove.leftEyeBlindness >= 100 && botAfterMove.rightEyeBlindness >= 100,
        usableEyes:
          botAfterMove.leftEyeBlindness >= 100 && botAfterMove.rightEyeBlindness >= 100 ? 0 : 1,
      }).allowed;
      return ocularOk && distNow >= range.minRange && distNow <= range.maxRange && botAfterMove.chakra >= cost;
    })
    .sort((a, b) => b.basePower - a.basePower);

  if (candidates.length > 0) {
    const res = resolvePvpAction(working, 'opponent', { type: 'jutsu', jutsuId: candidates[0].id }, rng);
    if (res.ok) return res.state;
  }

  if (distNow <= 1) {
    const res = resolvePvpAction(working, 'opponent', { type: 'melee', strikeId: 'soco_direto' }, rng);
    if (res.ok) return res.state;
  }

  if (distNow <= 4) {
    const res = resolvePvpAction(working, 'opponent', { type: 'weapon', weaponId: 'shuriken_aco' }, rng);
    if (res.ok) return res.state;
  }

  const def = resolvePvpAction(working, 'opponent', { type: 'defend' }, rng);
  return def.state;
}
