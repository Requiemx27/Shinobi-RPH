import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Socket } from 'socket.io-client';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  CloudFog,
  Crosshair,
  Droplets,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Footprints,
  Globe,
  Lock,
  MapPin,
  MessageSquare,
  Mountain,
  Scroll,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trees,
  Users,
  Zap,
} from 'lucide-react';
import {
  ActiveStatusEffect,
  applyOcularJutsuStrain,
  applyTileCloudArea,
  buildDefaultGeopoliticsState,
  canActivateSharinganInCombat,
  canMoveToTile,
  canUseOcularJutsuInCombat,
  canUseSecretAction,
  CharacterModel,
  CharacterProgressSnapshot,
  chakraXpRequiredForLevel,
  CombatCalculationResult,
  computeCurrentStamina,
  computeEnemyGridMove,
  computeKnockbackTile,
  consumeCharacterStamina,
  createTacticalGrid,
  ELEMENTAL_AFFINITY_CYCLE,
  evaluateElementalAffinity,
  FIVE_ELEMENTAL_AFFINITIES,
  formatElementalLabel,
  formatStaminaCountdown,
  generateActiveWarMissions,
  getActiveConflictsForVillage,
  getEffectiveJutsuChakraCost,
  getEffectiveJutsuEffects,
  getElementalCounterFor,
  getGeopoliticalMissionBonus,
  getJutsuGridRange,
  getMissionStaminaCost,
  getOcularState,
  getOwnedElements,
  getPlayerMoveRange,
  getSharinganCombatConfig,
  getSharinganStageNumber,
  GridCoord,
  hasDojutsuPerception,
  hasNoKekkeiGenkai,
  isClanless,
  isInstantBlindnessKinjutsu,
  isMangekyouJutsu,
  manhattanDistance,
  MELEE_STRIKES,
  MeleeStrikeSpec,
  mergeStatusEffects,
  MissionLootDrop,
  normalizeElementalNature,
  PostMissionReportData,
  PublicExamQuestion,
  resolveTurnStartControl,
  ScaledMission,
  SECRET_ACTION_CATALOG,
  SecretActionDef,
  TacticalGridState,
  tickEndOfTurnStatuses,
  tickTileClouds,
  xpRequiredForLevel,
  calculateClanBonuses,
  calculateEffectiveStats,
  calculateHitAndDamage,
  getClanJutsuBoostSummary,
} from '../game/engine.ts';
import { LanguageCode } from '../game/i18n.ts';
import {
  ChakraNature,
  EQUIPPED_WEAPON_PROFILES,
  GeopoliticsWorldState,
  getVillageImage,
  ITEM_CATALOG,
  JUTSU_CATALOG,
  JutsuDef,
  JutsuEffectSpec,
  NinjaRank,
  NinjaWeaponCombatDef,
  STANDARD_NINJA_TOOLS,
  STATUS_EFFECT_META,
  StatusEffectMeta,
  VILLAGES,
} from '../game/narutoData.ts';
import { shinobiAudio } from '../game/sound.ts';
import { apiFetch } from '../utils/api.ts';
import { BattleLogEntry, BattleLogPanel } from './BattleLogPanel.tsx';
import { NinjaAvatar } from './NinjaAvatar.tsx';
import { PostMissionReportModal } from './PostMissionReportModal.tsx';
import { PvpArenaView } from './PvpArenaView.tsx';
import { TeamMissionView } from './TeamMissionView.tsx';

export interface PublicSummonQuest {
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
  trialQuestions: PublicExamQuestion[];
  eligibility: {
    eligible: boolean;
    alreadyOwned: boolean;
    unmetReasons: string[];
  };
  trialPassed: boolean;
}

export interface PublicJutsuQuest {
  id: string;
  kind: 'second_element' | 'rasengan' | 'eight_gates';
  title: string;
  rewardLabel: string;
  rewardJutsuId?: string;
  grantsSecondElement: boolean;
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
  trialQuestions: PublicExamQuestion[];
  eligibility: {
    eligible: boolean;
    alreadyCompleted: boolean;
    unmetReasons: string[];
  };
  trialPassed: boolean;
  selectedTargetElement?: string | null;
}

interface CombatArenaProps {
  character: CharacterModel;
  missions: ScaledMission[];
  customJutsus?: JutsuDef[];
  lang: LanguageCode;
  initialTab?:
    | 'missions'
    | 'war_missions'
    | 'team_missions'
    | 'pvp'
    | 'jutsu_quests'
    | 'summon_quests';
  geopolitics?: GeopoliticsWorldState;
  socket?: Socket | null;
  initialPvpOpponentId?: number | null;
  onOpenArsenal?: () => void;
  onOpenGeopolitics?: () => void;
  onOpenVillageRp?: () => void;
  onOpenTeamsTab?: () => void;
  onCombatFinished: () => Promise<void>;
}

interface BattleForumPost {
  id: string;
  turn: number;
  actor: 'player' | 'enemy' | 'system';
  authorName: string;
  authorAvatar: string;
  authorVillage: string;
  narration: string;
  calc?: CombatCalculationResult;
  statusLogs?: string[];
  hpRemaining?: number;
  maxHp?: number;
}

function getToneClasses(tone?: StatusEffectMeta['tone']): string {
  switch (tone) {
    case 'fire':
      return 'bg-orange-950/60 border-orange-500/45 text-orange-300';
    case 'lightning':
      return 'bg-amber-950/60 border-amber-400/50 text-amber-200';
    case 'water':
      return 'bg-sky-950/60 border-sky-400/45 text-sky-200';
    case 'earth':
      return 'bg-yellow-950/60 border-yellow-600/45 text-yellow-200';
    case 'wind':
      return 'bg-teal-950/60 border-teal-400/45 text-teal-200';
    case 'illusion':
      return 'bg-purple-950/60 border-purple-400/50 text-purple-200';
    case 'seal':
      return 'bg-rose-950/60 border-rose-500/45 text-rose-200';
    case 'heal':
    default:
      return 'bg-emerald-950/60 border-emerald-400/45 text-emerald-300';
  }
}

function buildEnemyJutsu(
  mission: ScaledMission,
  turn: number
): Pick<JutsuDef, 'id' | 'category' | 'nature' | 'basePower' | 'accuracyMod' | 'critBonus'> & {
  name: string;
  effects?: JutsuEffectSpec[];
} {
  const isAlternate = turn % 2 === 0;
  if (mission.enemyNature === 'Suiton') {
    return isAlternate
      ? {
          id: 'enemy_suiton_drown',
          name: 'Suiton: Suiryuudan',
          category: 'Ninjutsu',
          nature: 'Suiton',
          basePower: mission.scaledAttack,
          accuracyMod: 5,
          critBonus: 6,
          effects: [
            { type: 'soaked', target: 'enemy', chance: 85, duration: 3, label: 'Encharcado (85%, 3t)' },
            { type: 'drowning', target: 'enemy', chance: 45, duration: 2, potency: 14, label: 'Afogamento (45%, 2t)' },
          ],
        }
      : {
          id: 'enemy_suiton_soaked',
          name: 'Suiton: Teppoudama',
          category: 'Ninjutsu',
          nature: 'Suiton',
          basePower: mission.scaledAttack,
          accuracyMod: 6,
          critBonus: 5,
        };
  }
  if (mission.enemyNature === 'Doton') {
    return isAlternate
      ? {
          id: 'enemy_doton_trap',
          name: 'Doton: Shinjuu Zanshu',
          category: 'Ninjutsu',
          nature: 'Doton',
          basePower: mission.scaledAttack,
          accuracyMod: 4,
          critBonus: 6,
          effects: [
            { type: 'crush', target: 'enemy', chance: 75, duration: 2, label: 'Esmagamento (75%, 2t)' },
            { type: 'paralysis', target: 'enemy', chance: 45, duration: 1, label: 'Paralisia no Solo (45%, 1t)' },
          ],
        }
      : {
          id: 'enemy_doton_crush',
          name: 'Doton: Punho Sísmico',
          category: 'Ninjutsu',
          nature: 'Doton',
          basePower: mission.scaledAttack,
          accuracyMod: 6,
          critBonus: 6,
        };
  }
  const enemyElem = normalizeElementalNature(mission.enemyNature) || mission.enemyNature;
  if (mission.enemyClan === 'Uchiha' && turn % 3 === 0) {
    return {
      id: 'enemy_genjutsu',
      name: 'Magen: Jubaku Satsu',
      category: 'Genjutsu',
      nature: 'Yin',
      basePower: Math.round(mission.scaledAttack * 0.9),
      accuracyMod: 7,
      critBonus: 7,
      effects: [
        { type: 'paralysis', target: 'enemy', chance: 75, duration: 2, label: 'Paralisia Ilusória (75%, 2t)' },
      ],
    };
  }
  if (enemyElem === 'Katon') {
    return isAlternate
      ? {
          id: 'enemy_katon_housenka',
          name: 'Katon: Housenka no Jutsu',
          category: 'Ninjutsu',
          nature: 'Katon',
          basePower: mission.scaledAttack,
          accuracyMod: 8,
          critBonus: 8,
          effects: [
            { type: 'burn', target: 'enemy', chance: 80, duration: 2, potency: 15, label: 'Chuva de Brasas (80%, 2t)' },
          ],
        }
      : {
          id: 'enemy_katon_goukakyuu',
          name: 'Katon: Goukakyuu no Jutsu',
          category: 'Ninjutsu',
          nature: 'Katon',
          basePower: mission.scaledAttack,
          accuracyMod: 6,
          critBonus: 7,
        };
  }
  if (enemyElem === 'Fuuton') {
    return isAlternate
      ? {
          id: 'enemy_fuuton_shinkuu',
          name: 'Futon: Shinkuugyoku',
          category: 'Ninjutsu',
          nature: 'Fuuton',
          basePower: mission.scaledAttack,
          accuracyMod: 9,
          critBonus: 10,
          effects: [
            { type: 'bleed', target: 'enemy', chance: 75, duration: 2, potency: 14, label: 'Projéteis de Vácuo (75%, 2t)' },
          ],
        }
      : {
          id: 'enemy_fuuton_daitoppa',
          name: 'Futon: Daitoppa',
          category: 'Ninjutsu',
          nature: 'Fuuton',
          basePower: mission.scaledAttack,
          accuracyMod: 7,
          critBonus: 6,
        };
  }
  if (enemyElem === 'Raiton') {
    return isAlternate
      ? {
          id: 'enemy_raiton_raijuu',
          name: 'Raiton: Raijuu Tsuiga',
          category: 'Ninjutsu',
          nature: 'Raiton',
          basePower: mission.scaledAttack,
          accuracyMod: 9,
          critBonus: 11,
          effects: [
            { type: 'stun', target: 'enemy', chance: 50, duration: 1, label: 'Atordoamento Elétrico (50%, 1t)' },
          ],
        }
      : {
          id: 'enemy_raiton_jibashi',
          name: 'Raiton: Jibashi',
          category: 'Ninjutsu',
          nature: 'Raiton',
          basePower: mission.scaledAttack,
          accuracyMod: 7,
          critBonus: 9,
        };
  }
  return {
    id: `enemy_${String(enemyElem).toLowerCase()}`,
    name: `Técnica de ${formatElementalLabel(enemyElem)}`,
    category: 'Ninjutsu',
    nature: enemyElem,
    basePower: mission.scaledAttack,
    accuracyMod: 5,
    critBonus: 6,
  };
}

export const CombatArena: React.FC<CombatArenaProps> = ({
  character,
  missions,
  customJutsus = [],
  initialTab = 'missions',
  geopolitics,
  socket = null,
  initialPvpOpponentId = null,
  onOpenArsenal,
  onOpenGeopolitics,
  onOpenVillageRp,
  onOpenTeamsTab,
  onCombatFinished,
}) => {
  const ownVillage = character.village || 'Konohagakure';
  const effStats = useMemo(() => calculateEffectiveStats(character), [character]);
  const [boardTab, setBoardTab] = useState<
    'missions' | 'war_missions' | 'team_missions' | 'pvp' | 'jutsu_quests' | 'summon_quests'
  >(initialTab);
  const [postMissionReport, setPostMissionReport] = useState<PostMissionReportData | null>(null);
  const [showPostMissionModal, setShowPostMissionModal] = useState(false);
  const [boardMissions, setBoardMissions] = useState<ScaledMission[]>(() =>
    missions.filter((m) => !m.assignedVillage || m.assignedVillage === ownVillage)
  );
  const [warMissions, setWarMissions] = useState<ScaledMission[]>(() =>
    generateActiveWarMissions(geopolitics || buildDefaultGeopoliticsState(), character)
  );
  const [loadingVillageBoard, setLoadingVillageBoard] = useState(false);
  const [missionRankFilter, setMissionRankFilter] = useState<'Todas' | 'D' | 'C' | 'B' | 'A' | 'S'>('Todas');
  const [warRankFilter, setWarRankFilter] = useState<'Todas' | 'C' | 'B' | 'A' | 'S'>('Todas');
  const [missionSearch, setMissionSearch] = useState('');
  const [selectedMissionId, setSelectedMissionId] = useState<string>(
    missions[0]?.id || 'patrulha_fronteira'
  );
  const [staminaAlert, setStaminaAlert] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const liveStamina = useMemo(() => computeCurrentStamina(character, nowMs), [character, nowMs]);

  const [activeQuestBattle, setActiveQuestBattle] = useState<{
    quest: PublicSummonQuest;
    missionAdapter: ScaledMission;
  } | null>(null);
  const [activeJutsuQuestBattle, setActiveJutsuQuestBattle] = useState<{
    quest: PublicJutsuQuest;
    missionAdapter: ScaledMission;
  } | null>(null);

  // Summon Quests state
  const [summonQuests, setSummonQuests] = useState<PublicSummonQuest[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [expandedTrialQuestId, setExpandedTrialQuestId] = useState<string | null>(null);
  const [trialAnswers, setTrialAnswers] = useState<Record<string, Record<string, number>>>({});
  const [ritualBusyId, setRitualBusyId] = useState<string | null>(null);
  const [questFeedback, setQuestFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  // Special Jutsu Quests state
  const [jutsuQuests, setJutsuQuests] = useState<PublicJutsuQuest[]>([]);
  const [loadingJutsuQuests, setLoadingJutsuQuests] = useState(false);
  const [availableSecondElements, setAvailableSecondElements] = useState<ChakraNature[]>([]);
  const [selectedSecondElement, setSelectedSecondElement] = useState<string>('');
  const [expandedJutsuQuestId, setExpandedJutsuQuestId] = useState<string | null>(null);
  const [jutsuTrialAnswers, setJutsuTrialAnswers] = useState<Record<string, Record<string, number>>>({});
  const [jutsuRitualBusyId, setJutsuRitualBusyId] = useState<string | null>(null);
  const [jutsuQuestFeedback, setJutsuQuestFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    setBoardTab(initialTab);
  }, [initialTab]);

  const loadSummonQuests = useCallback(async () => {
    setLoadingQuests(true);
    try {
      const res = await apiFetch<{ activeContract: string; quests: PublicSummonQuest[] }>(
        '/api/summon-quests/status'
      );
      setSummonQuests(res.quests || []);
    } catch {
      // ignore fetch error gracefully
    } finally {
      setLoadingQuests(false);
    }
  }, []);

  const loadJutsuQuests = useCallback(async () => {
    setLoadingJutsuQuests(true);
    try {
      const res = await apiFetch<{
        primaryElement: string;
        secondaryElement: string;
        availableSecondElements: ChakraNature[];
        quests: PublicJutsuQuest[];
      }>('/api/jutsu-quests/status');
      setJutsuQuests(res.quests || []);
      const avail = res.availableSecondElements || [];
      setAvailableSecondElements(avail);
      if (avail.length > 0) {
        setSelectedSecondElement((prev) => (prev && avail.includes(prev as ChakraNature) ? prev : avail[0]));
      }
    } catch {
      // ignore fetch error gracefully
    } finally {
      setLoadingJutsuQuests(false);
    }
  }, []);

  useEffect(() => {
    loadSummonQuests();
    loadJutsuQuests();
  }, [
    loadSummonQuests,
    loadJutsuQuests,
    character.summonContract,
    character.secondaryChakraNature,
    character.learnedJutsus.length,
    character.level,
    character.rank,
    character.missionsCompleted,
  ]);

  const boardConflictBonus = useMemo(() => {
    if (!geopolitics) {
      return { bonusPct: 0, activeConflict: null };
    }
    const bonus = getGeopoliticalMissionBonus(geopolitics, ownVillage);
    const activeConflicts = getActiveConflictsForVillage(geopolitics, ownVillage);
    const topConflict =
      activeConflicts.length > 0
        ? [...activeConflicts].sort((a, b) => b.intensity - a.intensity)[0]
        : null;
    return {
      bonusPct: bonus.bonusPct,
      activeConflict: topConflict,
    };
  }, [geopolitics, ownVillage]);

  useEffect(() => {
    const computedWar = generateActiveWarMissions(
      geopolitics || buildDefaultGeopoliticsState(),
      character
    );
    setWarMissions(computedWar);
  }, [geopolitics, character]);

  useEffect(() => {
    if (missions.length > 0) {
      const ownOnly = missions.filter((m) => !m.assignedVillage || m.assignedVillage === ownVillage);
      if (ownOnly.length > 0) {
        setBoardMissions(ownOnly);
      }
    }
  }, [missions, ownVillage]);

  useEffect(() => {
    let cancelled = false;
    const loadVillageBoard = async () => {
      setLoadingVillageBoard(true);
      try {
        const res = await apiFetch<{
          boardVillage?: string;
          missions: ScaledMission[];
          warMissions?: ScaledMission[];
        }>('/api/missions/dynamic');
        if (!cancelled) {
          if (Array.isArray(res.missions)) {
            setBoardMissions(res.missions);
            if (res.missions[0]) {
              setSelectedMissionId((prev) =>
                res.missions.some((m) => m.id === prev) ? prev : res.missions[0].id
              );
            }
          }
          if (Array.isArray(res.warMissions)) {
            setWarMissions(res.warMissions);
          }
        }
      } catch {
        // fallback to existing missions prop
      } finally {
        if (!cancelled) setLoadingVillageBoard(false);
      }
    };
    loadVillageBoard();
    return () => {
      cancelled = true;
    };
  }, [ownVillage, character.level, character.missionsCompleted]);

  const allSelectableMissions = useMemo(
    () => [...boardMissions, ...warMissions],
    [boardMissions, warMissions]
  );

  const standardMission =
    allSelectableMissions.find((m) => m.id === selectedMissionId) ||
    boardMissions[0] ||
    warMissions[0] ||
    missions[0];
  const activeMission = activeQuestBattle
    ? activeQuestBattle.missionAdapter
    : activeJutsuQuestBattle
    ? activeJutsuQuestBattle.missionAdapter
    : standardMission;

  const [inBattle, setInBattle] = useState(false);
  const [sharinganActive, setSharinganActive] = useState(false);
  const [battleOcular, setBattleOcular] = useState<{
    leftEyeBlindness: number;
    rightEyeBlindness: number;
  }>({
    leftEyeBlindness: character.leftEyeBlindness ?? 0,
    rightEyeBlindness: character.rightEyeBlindness ?? 0,
  });
  const [battleOcularEvents, setBattleOcularEvents] = useState<string[]>([]);

  useEffect(() => {
    if (!inBattle) {
      setBattleOcular({
        leftEyeBlindness: character.leftEyeBlindness ?? 0,
        rightEyeBlindness: character.rightEyeBlindness ?? 0,
      });
    }
  }, [inBattle, character.leftEyeBlindness, character.rightEyeBlindness]);

  const sharinganStage = useMemo(
    () => getSharinganStageNumber(character.kekkeiGenkai, character.clan),
    [character.kekkeiGenkai, character.clan]
  );
  const sharinganCfg = useMemo(() => getSharinganCombatConfig(sharinganStage), [sharinganStage]);
  const ocularLive = useMemo(() => getOcularState(battleOcular), [battleOcular]);
  const effectiveSharinganOn = inBattle && sharinganActive && !ocularLive.bothBlind;

  const combatEffStats = useMemo(
    () =>
      calculateEffectiveStats(
        { ...character, ...battleOcular },
        { inCombat: true, sharinganActive: effectiveSharinganOn }
      ),
    [character, battleOcular, effectiveSharinganOn]
  );

  const activeClanBonuses = useMemo(
    () => calculateClanBonuses(character.clan, { ...character, ...battleOcular }),
    [character, battleOcular]
  );

  const [playerHp, setPlayerHp] = useState(effStats.maxHp);
  const [playerChakra, setPlayerChakra] = useState(effStats.maxChakra);
  const [enemyHp, setEnemyHp] = useState(activeMission?.scaledHp || 150);
  const [playerStatuses, setPlayerStatuses] = useState<ActiveStatusEffect[]>([]);
  const [enemyStatuses, setEnemyStatuses] = useState<ActiveStatusEffect[]>([]);
  const [turnBusy, setTurnBusy] = useState(false);
  const [turnNumber, setTurnNumber] = useState(1);
  const [customActionNote, setCustomActionNote] = useState('');
  const [battlePosts, setBattlePosts] = useState<BattleForumPost[]>([]);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [consumedInBattle, setConsumedInBattle] = useState<string[]>([]);
  const [tacticalGrid, setTacticalGrid] = useState<TacticalGridState>(() =>
    createTacticalGrid('init')
  );
  const [moveRemaining, setMoveRemaining] = useState<number>(() =>
    getPlayerMoveRange(effStats)
  );
  const [actionTab, setActionTab] = useState<'jutsus' | 'melee' | 'weapons' | 'secret'>('jutsus');
  const [preparedSecret, setPreparedSecret] = useState<SecretActionDef | null>(null);
  const [weaponInfusionElement, setWeaponInfusionElement] = useState<ChakraNature | 'none'>('none');
  const [outcome, setOutcome] = useState<{
    won: boolean;
    rewards: { xp: number; chakraXp: number; ryo: number; merit: number } | null;
    leveledUp?: boolean;
    rankPromoted?: boolean;
    becameKage?: boolean;
    signedContract?: string | null;
    unlockedJutsuReward?: string | null;
  } | null>(null);

  const learnedJutsus = useMemo(
    () => [...JUTSU_CATALOG, ...customJutsus].filter((j) => character.learnedJutsus.includes(j.id)),
    [character.learnedJutsus, customJutsus]
  );

  const availableNinjaWeapons = useMemo(() => {
    const equippedId = character.equippedGear?.weapon;
    const equippedProfile = equippedId ? EQUIPPED_WEAPON_PROFILES[equippedId] : undefined;
    return equippedProfile
      ? [equippedProfile, ...STANDARD_NINJA_TOOLS.filter((w) => w.itemId !== equippedId)]
      : STANDARD_NINJA_TOOLS;
  }, [character.equippedGear]);

  const consumables = useMemo(
    () =>
      (character.inventory || [])
        .map((entry) => ({
          entry,
          def: ITEM_CATALOG.find((i) => i.id === entry.itemId && i.category === 'consumable'),
        }))
        .filter((x) => x.def && x.entry.qty > 0),
    [character.inventory]
  );

  const enemyIsSoaked = enemyStatuses.some((s) => s.type === 'soaked');
  const playerIsStunned = playerStatuses.some((s) => s.type === 'stun');
  const gridDistance = useMemo(
    () => manhattanDistance(tacticalGrid.playerPos, tacticalGrid.enemyPos),
    [tacticalGrid.playerPos, tacticalGrid.enemyPos]
  );
  const enemyHasDojutsu = useMemo(
    () => hasDojutsuPerception(activeMission?.enemyClan, activeMission?.enemyName),
    [activeMission?.enemyClan, activeMission?.enemyName]
  );
  const secretActionStatus = useMemo(
    () =>
      canUseSecretAction(
        tacticalGrid,
        tacticalGrid.playerPos,
        tacticalGrid.enemyPos,
        enemyHasDojutsu ? 'Uchiha' : activeMission?.enemyClan
      ),
    [tacticalGrid, enemyHasDojutsu, activeMission?.enemyClan]
  );
  const playerTerrain = tacticalGrid.terrain[tacticalGrid.playerPos.y]?.[tacticalGrid.playerPos.x] || 'ground';
  const enemyTerrain = tacticalGrid.terrain[tacticalGrid.enemyPos.y]?.[tacticalGrid.enemyPos.x] || 'ground';

  const appendBattleLog = useCallback((entry: Omit<BattleLogEntry, 'id' | 'timestampLabel'>) => {
    const timestampLabel = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setBattleLog((prev) => [...prev, { ...entry, id, timestampLabel }]);
  }, []);

  const startBattle = (
    mission: ScaledMission,
    questContext?: PublicSummonQuest,
    jutsuQuestContext?: PublicJutsuQuest
  ) => {
    // Strictly enforce own-village lock on standard missions
    if (
      !mission.warMeta &&
      !questContext &&
      !jutsuQuestContext &&
      mission.assignedVillage &&
      mission.assignedVillage !== ownVillage
    ) {
      shinobiAudio.playMissWhoosh();
      setStaminaAlert(
        `Acesso restrito: ninjas de ${ownVillage} só podem executar o quadro de missões de ${ownVillage}.`
      );
      return;
    }

    const requiredStamina =
      mission.staminaCost ??
      getMissionStaminaCost(
        mission.rank,
        Boolean(mission.warMeta || questContext || jutsuQuestContext)
      );
    const staminaCheck = consumeCharacterStamina(character, requiredStamina, Date.now());
    if (!staminaCheck.allowed) {
      shinobiAudio.playMissWhoosh();
      setStaminaAlert(
        staminaCheck.reason ||
          `Stamina insuficiente (${staminaCheck.currentStamina}/${requiredStamina} STA). Descanse seu personagem nos locais RP de ${ownVillage}!`
      );
      return;
    }

    setStaminaAlert(null);
    shinobiAudio.playJutsuCast();
    if (questContext) {
      setActiveQuestBattle({ quest: questContext, missionAdapter: mission });
      setActiveJutsuQuestBattle(null);
    } else if (jutsuQuestContext) {
      setActiveJutsuQuestBattle({ quest: jutsuQuestContext, missionAdapter: mission });
      setActiveQuestBattle(null);
    } else {
      setActiveQuestBattle(null);
      setActiveJutsuQuestBattle(null);
      setSelectedMissionId(mission.id);
    }

    const initialOcular = {
      leftEyeBlindness: character.leftEyeBlindness ?? 0,
      rightEyeBlindness: character.rightEyeBlindness ?? 0,
    };
    const startEff = calculateEffectiveStats(
      { ...character, ...initialOcular },
      { inCombat: true, sharinganActive: false }
    );

    // Sharingan ALWAYS starts inactive in battle until activated by the player
    setSharinganActive(false);
    setBattleOcular(initialOcular);
    setBattleOcularEvents([]);

    const initialGrid = createTacticalGrid(mission.id);
    setTacticalGrid(initialGrid);
    setMoveRemaining(getPlayerMoveRange(startEff));
    setActionTab('jutsus');
    setPreparedSecret(null);
    setWeaponInfusionElement('none');
    setPlayerHp(startEff.maxHp);
    setPlayerChakra(startEff.maxChakra);
    setEnemyHp(mission.scaledHp);
    setPlayerStatuses([]);
    setEnemyStatuses([]);
    setTurnNumber(1);
    setConsumedInBattle([]);
    setOutcome(null);
    const pCoord = `${String.fromCharCode(65 + initialGrid.playerPos.x)}${initialGrid.playerPos.y + 1}`;
    const eCoord = `${String.fromCharCode(65 + initialGrid.enemyPos.x)}${initialGrid.enemyPos.y + 1}`;
    const openingMatchup = evaluateElementalAffinity({
      attackNature: character.chakraNature,
      attackerPrimaryNature: character.chakraNature,
      attackerSecondaryNature: character.secondaryChakraNature,
      defenderPrimaryNature: mission.enemyNature,
    });
    const sharinganInitNote =
      sharinganStage >= 1
        ? getOcularState(initialOcular).bothBlind
          ? ' Sharingan selado por cegueira total (100% nos 2 olhos).'
          : ` ${sharinganCfg.shortTitle} inicia desativado — ative-o no seu turno (-${sharinganCfg.activationChakra} CH) para liberar seus bônus.`
        : '';

    const clanInitNote =
      activeClanBonuses.summaryChips.length > 0
        ? ` Clã ${activeClanBonuses.clanName} ativo: ${activeClanBonuses.summaryChips.join(' · ')}.`
        : '';

    setBattleLog([
      {
        id: `log_init_${Date.now()}`,
        turn: 0,
        timestampLabel: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
        actor: 'system',
        actorName: 'Árbitro de Combate',
        category: 'system',
        actionName: `Início: ${mission.title}`,
        actionMeta: `Rank ${mission.rank} · -${requiredStamina} STA · Clã ${character.clan} · Alvo ${formatElementalLabel(mission.enemyNature)}`,
        summary: `${character.name} (${pCoord} · Afinidade ${formatElementalLabel(character.chakraNature)}) encara ${mission.enemyName} (${eCoord} · ${mission.scaledHp} HP · ${formatElementalLabel(mission.enemyNature)}). ${openingMatchup.relationLabel}.${clanInitNote}${sharinganInitNote}`,
        extraNotes: activeClanBonuses.summaryChips.length > 0
          ? [`Bônus Passivos do Clã (${activeClanBonuses.clanName}): ${activeClanBonuses.summaryChips.join(' · ')}`]
          : undefined,
        hpSnapshot: {
          playerHp: startEff.maxHp,
          playerMaxHp: startEff.maxHp,
          enemyHp: mission.scaledHp,
          enemyMaxHp: mission.scaledHp,
        },
      },
    ]);
    setBattlePosts([
      {
        id: `brief_${Date.now()}`,
        turn: 0,
        actor: 'system',
        authorName: questContext
          ? questContext.sanctuary
          : jutsuQuestContext
          ? jutsuQuestContext.title
          : mission.warMeta
          ? `Comando de Guerra · ${mission.warMeta.frontName}`
          : 'Conselho de Missões',
        authorAvatar: '',
        authorVillage: questContext
          ? questContext.sanctuary
          : jutsuQuestContext
          ? jutsuQuestContext.bossTitle
          : ownVillage,
        narration: questContext
          ? `Provação Final de Invocação iniciada (${questContext.complexityLabel}): ${questContext.bossName} surge para testar se ${character.name} é digno do contrato "${questContext.contractName}".`
          : jutsuQuestContext
          ? `Provação Prática de Quest de Jutsu iniciada: ${jutsuQuestContext.bossName} desafia ${character.name} para validar a conquista de "${jutsuQuestContext.rewardLabel}".`
          : `${mission.warMeta ? `[CAMPANHA DE GUERRA ATIVA] ` : ''}Tópico de Missão Rank ${mission.rank} aberto (-${requiredStamina} STA): ${mission.title}. ${mission.briefing} Alvo interceptado: ${mission.enemyName} (${mission.enemyVillage} · ${mission.enemyNature}).${sharinganInitNote}`,
        hpRemaining: mission.scaledHp,
        maxHp: mission.scaledHp,
      },
    ]);
    setInBattle(true);
  };

  const handleToggleSharingan = () => {
    if (turnBusy || outcome || !activeMission || sharinganStage === 0) return;

    if (sharinganActive) {
      shinobiAudio.playUiClick();
      setSharinganActive(false);
      appendBattleLog({
        turn: turnNumber,
        actor: 'player',
        actorName: character.name,
        category: 'stance',
        actionName: `Desativar ${sharinganCfg.shortTitle}`,
        actionMeta: 'Economia de Chakra · Bônus desligados',
        summary: `${character.name} recolhe o ${sharinganCfg.shortTitle}, poupando chakra por turno mas desligando os bônus oculares.`,
        hpSnapshot: {
          playerHp,
          playerMaxHp: combatEffStats.maxHp,
          enemyHp,
          enemyMaxHp: activeMission.scaledHp,
        },
      });
      setBattlePosts((prev) => [
        ...prev,
        {
          id: `sharingan_off_${Date.now()}`,
          turn: turnNumber,
          actor: 'player',
          authorName: character.name,
          authorAvatar: character.avatarUrl,
          authorVillage: character.village,
          narration: `${character.name} desativa o ${sharinganCfg.shortTitle} para preservar suas reservas de chakra.`,
          hpRemaining: enemyHp,
          maxHp: activeMission.scaledHp,
        },
      ]);
      return;
    }

    const check = canActivateSharinganInCombat({ ...character, ...battleOcular }, playerChakra);
    if (!check.allowed) {
      shinobiAudio.playMissWhoosh();
      appendBattleLog({
        turn: turnNumber,
        actor: 'system',
        actorName: 'Árbitro de Combate',
        category: 'system',
        actionName: 'Falha ao Ativar Sharingan',
        summary: check.reason || 'Não foi possível ativar o Sharingan.',
      });
      return;
    }

    shinobiAudio.playJutsuCast();
    const nextChakra = Math.max(0, playerChakra - check.activationChakra);
    const nextActiveEff = calculateEffectiveStats(
      { ...character, ...battleOcular },
      { inCombat: true, sharinganActive: true }
    );
    const deltaMove = Math.max(0, getPlayerMoveRange(nextActiveEff) - getPlayerMoveRange(combatEffStats));
    setPlayerChakra(nextChakra);
    setSharinganActive(true);
    if (deltaMove > 0) {
      setMoveRemaining((m) => m + deltaMove);
    }

    appendBattleLog({
      turn: turnNumber,
      actor: 'player',
      actorName: character.name,
      category: 'stance',
      actionName: `Ativar ${sharinganCfg.shortTitle}`,
      actionMeta: `-${check.activationChakra} CH · -${check.upkeepChakra} CH/turno`,
      summary: `${character.name} desperta o ${sharinganCfg.shortTitle} em batalha! Bônus liberados (${sharinganCfg.bonusBadge}). Luz ocular: Esq ${ocularLive.leftLightPct}% · Dir ${ocularLive.rightLightPct}%.`,
      hpSnapshot: {
        playerHp,
        playerMaxHp: nextActiveEff.maxHp,
        enemyHp,
        enemyMaxHp: activeMission.scaledHp,
      },
    });
    setBattlePosts((prev) => [
      ...prev,
      {
        id: `sharingan_on_${Date.now()}`,
        turn: turnNumber,
        actor: 'player',
        authorName: character.name,
        authorAvatar: character.avatarUrl,
        authorVillage: character.village,
        narration: `Os olhos de ${character.name} giram em escarlate ao ativar o ${sharinganCfg.shortTitle} (-${check.activationChakra} Chakra)! Bônus oculares e técnicas do clã liberados na batalha.`,
        hpRemaining: enemyHp,
        maxHp: activeMission.scaledHp,
      },
    ]);
  };

  const applySharinganUpkeepForTurn = (
    chakraAfterAction: number,
    forceSeal: boolean = false
  ): { nextChakra: number; stillActive: boolean; note: string | null } => {
    if (!effectiveSharinganOn || sharinganStage === 0) {
      return { nextChakra: chakraAfterAction, stillActive: false, note: null };
    }
    if (forceSeal) {
      setSharinganActive(false);
      return {
        nextChakra: chakraAfterAction,
        stillActive: false,
        note: 'Sharingan selado permanentemente após perda total da luz ocular!',
      };
    }
    const upkeep = sharinganCfg.upkeepChakra;
    if (chakraAfterAction < upkeep) {
      setSharinganActive(false);
      return {
        nextChakra: 0,
        stillActive: false,
        note: `Chakra insuficiente para sustentar o ${sharinganCfg.shortTitle} — Dojutsu desativado!`,
      };
    }
    return {
      nextChakra: chakraAfterAction - upkeep,
      stillActive: true,
      note: `Manutenção ${sharinganCfg.shortTitle}: -${upkeep} CH`,
    };
  };

  const handleSubmitRitual = async (quest: PublicSummonQuest) => {
    setRitualBusyId(quest.id);
    setQuestFeedback(null);
    try {
      const answers = trialAnswers[quest.id] || {};
      const res = await apiFetch<{
        passed: boolean;
        alreadyCleared?: boolean;
        result: { scorePercent: number; correctCount: number; total: number };
      }>('/api/summon-quests/ritual', {
        method: 'POST',
        body: JSON.stringify({ questId: quest.id, answers }),
      });

      if (!res.passed) {
        shinobiAudio.playMissWhoosh();
        setQuestFeedback({
          text: `Provação falhou (${res.result.correctCount}/${res.result.total} acertos). Para invocar ${quest.contractName}, todas as respostas precisam estar corretas (100%).`,
          ok: false,
        });
      } else {
        shinobiAudio.playLevelUpChime();
        setExpandedTrialQuestId(null);
        setQuestFeedback({
          text: `Provação concluída (${quest.contractName})! Pergaminho ofertado (${quest.costRyo} Ryo). Agora enfrente ${quest.bossName} no duelo final para assinar o contrato!`,
          ok: true,
        });
        await Promise.all([loadSummonQuests(), onCombatFinished()]);
      }
    } catch (err) {
      setQuestFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setRitualBusyId(null);
    }
  };

  const handleLaunchQuestDuel = (quest: PublicSummonQuest) => {
    const questRank = quest.isGreatSummon ? 'S' : 'B';
    const adapter: ScaledMission = {
      id: quest.id,
      assignedVillage: ownVillage,
      title: `Quest de Invocação: ${quest.contractName}`,
      rank: questRank,
      minLevel: quest.minLevel,
      enemyName: quest.bossName,
      enemyClan: quest.isGreatSummon ? 'Sábio' : 'Guardião',
      enemyVillage: quest.sanctuary,
      enemyAvatar: quest.bossAvatar,
      enemyNature: quest.bossNature,
      baseHp: quest.bossHp,
      baseAttack: quest.bossAttack,
      baseSpeed: quest.bossSpeed,
      baseXp: quest.rewardXp,
      baseChakraXp: quest.rewardChakraXp,
      baseRyo: 0,
      baseMerit: quest.rewardMerit,
      briefing: quest.description,
      difficultyScale: 1,
      staminaCost: getMissionStaminaCost(questRank, true),
      scaledHp: quest.bossHp,
      scaledAttack: quest.bossAttack,
      scaledSpeed: quest.bossSpeed,
      rewardXp: quest.rewardXp,
      rewardChakraXp: quest.rewardChakraXp,
      rewardRyo: 0,
      rewardMerit: quest.rewardMerit,
    };
    startBattle(adapter, quest);
  };

  const handleSubmitJutsuRitual = async (quest: PublicJutsuQuest) => {
    setJutsuRitualBusyId(quest.id);
    setJutsuQuestFeedback(null);
    try {
      const answers = jutsuTrialAnswers[quest.id] || {};
      const res = await apiFetch<{
        passed: boolean;
        alreadyCleared?: boolean;
        selectedTargetElement?: string | null;
        result: { scorePercent: number; correctCount: number; total: number };
      }>('/api/jutsu-quests/ritual', {
        method: 'POST',
        body: JSON.stringify({
          questId: quest.id,
          answers,
          targetElement: quest.grantsSecondElement ? selectedSecondElement : undefined,
        }),
      });

      if (!res.passed) {
        shinobiAudio.playMissWhoosh();
        setJutsuQuestFeedback({
          text: `Provação falhou (${res.result.correctCount}/${res.result.total} acertos). Para avançar em "${quest.title}", é obrigatório acertar 100%.`,
          ok: false,
        });
      } else {
        shinobiAudio.playLevelUpChime();
        setExpandedJutsuQuestId(null);
        setJutsuQuestFeedback({
          text: `Provação teórica concluída (${quest.title})! Agora derrote ${quest.bossName} no duelo prático final!`,
          ok: true,
        });
        await Promise.all([loadJutsuQuests(), onCombatFinished()]);
      }
    } catch (err) {
      setJutsuQuestFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setJutsuRitualBusyId(null);
    }
  };

  const handleLaunchJutsuQuestDuel = (quest: PublicJutsuQuest) => {
    const adapter: ScaledMission = {
      id: quest.id,
      assignedVillage: ownVillage,
      title: `Quest Especial de Jutsu: ${quest.title}`,
      rank: 'A',
      minLevel: quest.minLevel,
      enemyName: quest.bossName,
      enemyClan: 'Instrutor',
      enemyVillage: ownVillage,
      enemyAvatar: quest.bossAvatar,
      enemyNature: quest.bossNature,
      baseHp: quest.bossHp,
      baseAttack: quest.bossAttack,
      baseSpeed: quest.bossSpeed,
      baseXp: quest.rewardXp,
      baseChakraXp: quest.rewardChakraXp,
      baseRyo: 0,
      baseMerit: quest.rewardMerit,
      briefing: quest.description,
      difficultyScale: 1,
      staminaCost: getMissionStaminaCost('A', true),
      scaledHp: quest.bossHp,
      scaledAttack: quest.bossAttack,
      scaledSpeed: quest.bossSpeed,
      rewardXp: quest.rewardXp,
      rewardChakraXp: quest.rewardChakraXp,
      rewardRyo: 0,
      rewardMerit: quest.rewardMerit,
    };
    startBattle(adapter, undefined, quest);
  };

  const buildFallbackProgress = (
    rewards: { xp: number; chakraXp: number; ryo: number; merit: number } | null
  ): CharacterProgressSnapshot => ({
    prevLevel: character.level,
    newLevel: character.level,
    prevXp: character.xp,
    newXp: character.xp + (rewards?.xp || 0),
    xpNeeded: xpRequiredForLevel(character.level),
    prevChakraLevel: character.chakraLevel,
    newChakraLevel: character.chakraLevel,
    prevChakraXp: character.chakraXp,
    newChakraXp: character.chakraXp + (rewards?.chakraXp || 0),
    chakraXpNeeded: chakraXpRequiredForLevel(character.chakraLevel),
    prevRank: character.rank,
    newRank: character.rank,
    prevRyo: character.ryo,
    newRyo: character.ryo + (rewards?.ryo || 0),
  });

  const finishCombatOnServer = async (
    won: boolean,
    usedItems: string[],
    latestOcular: { leftEyeBlindness: number; rightEyeBlindness: number } = battleOcular,
    latestOcularEvents: string[] = battleOcularEvents
  ) => {
    try {
      if (activeQuestBattle) {
        const res = await apiFetch<{
          rewards: { xp: number; chakraXp: number; ryo: number; merit: number; geopoliticalBonusRyo?: number } | null;
          lootDrops?: MissionLootDrop[];
          staminaSpent?: number;
          remainingStamina?: number;
          maxStamina?: number;
          ocularSummary?: PostMissionReportData['ocularSummary'];
          characterProgress?: CharacterProgressSnapshot;
          leveledUp?: boolean;
          chakraLeveledUp?: boolean;
          rankPromoted?: boolean;
          signedContract?: string | null;
        }>('/api/summon-quests/complete', {
          method: 'POST',
          body: JSON.stringify({
            questId: activeQuestBattle.quest.id,
            won,
            consumedItems: usedItems,
            ocularState: latestOcular,
            ocularEvents: latestOcularEvents,
          }),
        });
        if (won) shinobiAudio.playLevelUpChime();
        const drops = res.lootDrops || [];
        appendBattleLog({
          turn: turnNumber,
          actor: 'system',
          actorName: 'Árbitro de Combate',
          category: 'outcome',
          actionName: won ? 'Vitória na Quest de Invocação' : 'Derrota na Provação',
          actionMeta: res.rewards ? `+${res.rewards.xp} XP · +${res.rewards.merit} Mérito` : undefined,
          summary: won
            ? `${character.name} superou ${activeQuestBattle.quest.bossName}${res.signedContract ? ` e assinou o pacto ${res.signedContract}` : ''}.`
            : `${character.name} recuou da provação de invocação.`,
        });
        setOutcome({
          won,
          rewards: res.rewards,
          leveledUp: res.leveledUp,
          signedContract: res.signedContract || null,
        });
        setPostMissionReport({
          missionId: activeQuestBattle.quest.id,
          missionTitle: res.signedContract
            ? `Pacto Kuchiyose: ${res.signedContract}`
            : activeQuestBattle.missionAdapter.title,
          missionRank: activeQuestBattle.missionAdapter.rank,
          missionVillage: activeQuestBattle.quest.sanctuary,
          enemyName: activeQuestBattle.quest.bossName,
          won,
          turnsElapsed: turnNumber,
          rewards: res.rewards || { xp: 0, chakraXp: 0, ryo: 0, merit: 0 },
          lootDrops: drops,
          geopoliticalBonusPct: 0,
          activeConflictFront: null,
          staminaSpent: res.staminaSpent,
          remainingStamina: res.remainingStamina,
          maxStamina: res.maxStamina,
          ocularSummary: res.ocularSummary || null,
          progress: res.characterProgress || buildFallbackProgress(res.rewards),
          leveledUp: Boolean(res.leveledUp),
          chakraLeveledUp: Boolean(res.chakraLeveledUp),
          rankPromoted: Boolean(res.rankPromoted),
          becameKage: false,
          completedAt: new Date().toISOString(),
        });
        setShowPostMissionModal(true);
        await Promise.all([onCombatFinished(), loadSummonQuests()]);
        return;
      }

      if (activeJutsuQuestBattle) {
        const res = await apiFetch<{
          rewards: { xp: number; chakraXp: number; ryo: number; merit: number; geopoliticalBonusRyo?: number } | null;
          lootDrops?: MissionLootDrop[];
          staminaSpent?: number;
          remainingStamina?: number;
          maxStamina?: number;
          ocularSummary?: PostMissionReportData['ocularSummary'];
          characterProgress?: CharacterProgressSnapshot;
          leveledUp?: boolean;
          chakraLeveledUp?: boolean;
          rankPromoted?: boolean;
          unlockedJutsuReward?: string | null;
        }>('/api/jutsu-quests/complete', {
          method: 'POST',
          body: JSON.stringify({
            questId: activeJutsuQuestBattle.quest.id,
            won,
            consumedItems: usedItems,
            ocularState: latestOcular,
            ocularEvents: latestOcularEvents,
            targetElement:
              activeJutsuQuestBattle.quest.selectedTargetElement || selectedSecondElement,
          }),
        });
        if (won) shinobiAudio.playLevelUpChime();
        const drops = res.lootDrops || [];
        appendBattleLog({
          turn: turnNumber,
          actor: 'system',
          actorName: 'Árbitro de Combate',
          category: 'outcome',
          actionName: won ? 'Vitória na Quest Especial' : 'Derrota na Provação',
          actionMeta: res.rewards ? `+${res.rewards.xp} XP · +${res.rewards.merit} Mérito` : undefined,
          summary: won
            ? `${character.name} derrotou ${activeJutsuQuestBattle.quest.bossName}${res.unlockedJutsuReward ? ` e desbloqueou ${res.unlockedJutsuReward}` : ''}.`
            : `${character.name} recuou do duelo especial de jutsu.`,
        });
        setOutcome({
          won,
          rewards: res.rewards,
          leveledUp: res.leveledUp,
          unlockedJutsuReward: res.unlockedJutsuReward || null,
        });
        setPostMissionReport({
          missionId: activeJutsuQuestBattle.quest.id,
          missionTitle: res.unlockedJutsuReward
            ? `${activeJutsuQuestBattle.quest.title} (${res.unlockedJutsuReward})`
            : activeJutsuQuestBattle.quest.title,
          missionRank: activeJutsuQuestBattle.missionAdapter.rank,
          missionVillage: ownVillage,
          enemyName: activeJutsuQuestBattle.quest.bossName,
          won,
          turnsElapsed: turnNumber,
          rewards: res.rewards || { xp: 0, chakraXp: 0, ryo: 0, merit: 0 },
          lootDrops: drops,
          geopoliticalBonusPct: 0,
          activeConflictFront: null,
          staminaSpent: res.staminaSpent,
          remainingStamina: res.remainingStamina,
          maxStamina: res.maxStamina,
          ocularSummary: res.ocularSummary || null,
          progress: res.characterProgress || buildFallbackProgress(res.rewards),
          leveledUp: Boolean(res.leveledUp),
          chakraLeveledUp: Boolean(res.chakraLeveledUp),
          rankPromoted: Boolean(res.rankPromoted),
          becameKage: false,
          completedAt: new Date().toISOString(),
        });
        setShowPostMissionModal(true);
        await Promise.all([onCombatFinished(), loadJutsuQuests()]);
        return;
      }

      const res = await apiFetch<{
        rewards: {
          xp: number;
          chakraXp: number;
          ryo: number;
          merit: number;
          geopoliticalBonusRyo?: number;
        } | null;
        lootDrops?: MissionLootDrop[];
        isWarMission?: boolean;
        staminaSpent?: number;
        remainingStamina?: number;
        maxStamina?: number;
        ocularSummary?: PostMissionReportData['ocularSummary'];
        geopoliticalBonusPct?: number;
        activeConflictFront?: string | null;
        characterProgress?: CharacterProgressSnapshot;
        leveledUp?: boolean;
        chakraLeveledUp?: boolean;
        rankPromoted?: boolean;
        becameKage?: boolean;
      }>('/api/combat/complete', {
        method: 'POST',
        body: JSON.stringify({
          missionId: activeMission.id,
          won,
          consumedItems: usedItems,
          ocularState: latestOcular,
          ocularEvents: latestOcularEvents,
        }),
      });
      if (won) shinobiAudio.playLevelUpChime();
      const drops = res.lootDrops || [];
      appendBattleLog({
        turn: turnNumber,
        actor: 'system',
        actorName: 'Árbitro de Combate',
        category: 'outcome',
        actionName: won ? 'Combate Encerrado: Vitória' : 'Combate Encerrado: Derrota',
        actionMeta: res.rewards
          ? `+${res.rewards.xp} XP · +${res.rewards.ryo} Ryo · +${res.rewards.merit} Mérito${drops.length ? ` · +${drops.length} Espólio(s)` : ''}`
          : undefined,
        summary: won
          ? `${activeMission.enemyName} foi derrotado em combate tático!`
          : `${character.name} caiu em combate e recuou para ${ownVillage}.`,
      });
      setOutcome({
        won,
        rewards: res.rewards,
        leveledUp: res.leveledUp,
        rankPromoted: res.rankPromoted,
        becameKage: res.becameKage,
      });
      setPostMissionReport({
        missionId: activeMission.id,
        missionTitle: activeMission.title,
        missionRank: activeMission.rank,
        missionVillage: activeMission.assignedVillage || ownVillage,
        enemyName: activeMission.enemyName,
        won,
        turnsElapsed: turnNumber,
        rewards: res.rewards || { xp: 0, chakraXp: 0, ryo: 0, merit: 0 },
        lootDrops: drops,
        isWarMission: Boolean(res.isWarMission || activeMission.warMeta),
        staminaSpent: res.staminaSpent,
        remainingStamina: res.remainingStamina,
        maxStamina: res.maxStamina,
        ocularSummary: res.ocularSummary || null,
        geopoliticalBonusPct: res.geopoliticalBonusPct || 0,
        activeConflictFront: res.activeConflictFront || null,
        progress: res.characterProgress || buildFallbackProgress(res.rewards),
        leveledUp: Boolean(res.leveledUp),
        chakraLeveledUp: Boolean(res.chakraLeveledUp),
        rankPromoted: Boolean(res.rankPromoted),
        becameKage: Boolean(res.becameKage),
        completedAt: new Date().toISOString(),
      });
      setShowPostMissionModal(true);
      await onCombatFinished();
    } catch (err) {
      setStaminaAlert((err as Error).message || null);
      setOutcome({ won, rewards: null });
    }
  };

  const executeEnemyCounter = (
    currentPlayerHp: number,
    currentPlayerChakra: number,
    currentPlayerStatuses: ActiveStatusEffect[],
    currentEnemyHp: number,
    currentEnemyStatuses: ActiveStatusEffect[],
    usedItems: string[],
    currentTurn: number,
    gridSnapshot: TacticalGridState,
    sharinganStillActive: boolean = effectiveSharinganOn,
    ocularSnapshot: { leftEyeBlindness: number; rightEyeBlindness: number } = battleOcular,
    ocularEventsSnapshot: string[] = battleOcularEvents
  ) => {
    setTimeout(async () => {
      const defenderCombatEff = calculateEffectiveStats(
        { ...character, ...ocularSnapshot },
        {
          inCombat: true,
          sharinganActive: sharinganStillActive && !getOcularState(ocularSnapshot).bothBlind,
        }
      );

      const enemyStats = {
        ninjutsu: Math.round(activeMission.scaledAttack * 0.72),
        taijutsu: Math.round(activeMission.scaledAttack * 0.7),
        genjutsu: 12,
        velocidade: activeMission.scaledSpeed,
        forca: Math.round(activeMission.scaledAttack * 0.65),
        inteligencia: 14,
        resistencia: Math.round(activeMission.scaledAttack * 0.4),
        controleChakra: 14,
        maxHp: activeMission.scaledHp,
        maxChakra: 300,
        chakraEfficiency: 1,
      };

      let workingEnemyHp = currentEnemyHp;
      let workingEnemyStatuses = currentEnemyStatuses;
      let workingPlayerStatuses = currentPlayerStatuses;

      // Enemy strategic grid positioning & cloud decay at end of round
      const nextEnemyPos = computeEnemyGridMove(
        gridSnapshot,
        gridSnapshot.enemyPos,
        gridSnapshot.playerPos,
        2
      );
      let workingClouds = tickTileClouds(gridSnapshot.clouds);

      const ctrl = resolveTurnStartControl(workingEnemyStatuses, activeMission.scaledHp);
      workingEnemyStatuses = ctrl.updatedStatuses;

      if (!ctrl.canAct) {
        workingEnemyHp = Math.max(0, workingEnemyHp - ctrl.selfDamage);
        const enemyTick = tickEndOfTurnStatuses(
          workingEnemyStatuses,
          workingEnemyHp,
          activeMission.scaledHp,
          100,
          300
        );
        workingEnemyHp = enemyTick.nextHp;
        workingEnemyStatuses = enemyTick.nextStatuses;

        setEnemyHp(workingEnemyHp);
        setEnemyStatuses(workingEnemyStatuses);
        setPlayerStatuses(workingPlayerStatuses);
        setTacticalGrid({
          ...gridSnapshot,
          clouds: workingClouds,
        });
        setMoveRemaining(getPlayerMoveRange(defenderCombatEff));

        setBattlePosts((prev) => [
          ...prev,
          {
            id: `enemy_ctrl_${Date.now()}`,
            turn: currentTurn,
            actor: 'enemy',
            authorName: activeMission.enemyName,
            authorAvatar: activeMission.enemyAvatar,
            authorVillage: activeMission.enemyVillage,
            narration: `${activeMission.enemyName} ${ctrl.narration}`,
            statusLogs: enemyTick.logs,
            hpRemaining: workingEnemyHp,
            maxHp: activeMission.scaledHp,
          },
        ]);

        appendBattleLog({
          turn: currentTurn,
          actor: 'enemy',
          actorName: activeMission.enemyName,
          category: 'control',
          actionName: `Turnos de Controle (${ctrl.reason === 'stun' ? 'Atordoado' : ctrl.reason === 'mind_control' ? 'Controle Mental' : 'Imobilizado'})`,
          actionMeta: ctrl.selfDamage > 0 ? `-${ctrl.selfDamage} HP próprio` : 'Ação perdida',
          summary: `${activeMission.enemyName} ${ctrl.narration}`,
          statusTicks: enemyTick.logs,
          hpSnapshot: {
            playerHp: currentPlayerHp,
            playerMaxHp: defenderCombatEff.maxHp,
            enemyHp: workingEnemyHp,
            enemyMaxHp: activeMission.scaledHp,
          },
        });

        if (workingEnemyHp <= 0) {
          await finishCombatOnServer(true, usedItems, ocularSnapshot, ocularEventsSnapshot);
        }
        setTurnNumber((n) => n + 1);
        setTurnBusy(false);
        return;
      }

      const enemyJutsu = buildEnemyJutsu(activeMission, currentTurn);
      const movedNote =
        nextEnemyPos.x !== gridSnapshot.enemyPos.x || nextEnemyPos.y !== gridSnapshot.enemyPos.y
          ? ` (deslocando-se no grid para ${String.fromCharCode(65 + nextEnemyPos.x)}${nextEnemyPos.y + 1})`
          : '';

      if (enemyJutsu.nature === 'Katon') {
        workingClouds = applyTileCloudArea(workingClouds, gridSnapshot.playerPos, 1, 'soot', 2);
      }

      const playerInTreeCover =
        gridSnapshot.terrain[gridSnapshot.playerPos.y]?.[gridSnapshot.playerPos.x] === 'tree';
      const defenderEff = playerInTreeCover
        ? { ...defenderCombatEff, evasionBonus: (defenderCombatEff.evasionBonus || 0) + 10 }
        : defenderCombatEff;

      const calc = calculateHitAndDamage(
        enemyStats,
        activeMission.enemyNature,
        defenderEff,
        character.chakraNature,
        enemyJutsu,
        Math.random,
        {
          attackerStatuses: workingEnemyStatuses,
          defenderStatuses: workingPlayerStatuses,
          attackerClan: activeMission.enemyClan,
          defenderSecondaryNature: character.secondaryChakraNature,
        }
      );

      if (calc.isHit) shinobiAudio.playHitImpact(calc.isCrit);
      else shinobiAudio.playMissWhoosh();

      for (const fx of calc.appliedEffects) {
        if (fx.target === 'enemy') {
          workingPlayerStatuses = mergeStatusEffects(workingPlayerStatuses, fx, enemyJutsu.name);
        } else {
          workingEnemyStatuses = mergeStatusEffects(workingEnemyStatuses, fx, enemyJutsu.name);
        }
      }

      const nextPlayerHpDirect = Math.max(0, currentPlayerHp - calc.damage);

      const enemyTick = tickEndOfTurnStatuses(
        workingEnemyStatuses,
        Math.min(activeMission.scaledHp, workingEnemyHp + calc.healing),
        activeMission.scaledHp,
        100,
        300
      );

      setTacticalGrid({
        ...gridSnapshot,
        enemyPos: nextEnemyPos,
        clouds: workingClouds,
      });
      setMoveRemaining(getPlayerMoveRange(defenderCombatEff));
      setPlayerHp(nextPlayerHpDirect);
      setPlayerChakra(currentPlayerChakra);
      setPlayerStatuses(workingPlayerStatuses);
      setEnemyHp(enemyTick.nextHp);
      setEnemyStatuses(enemyTick.nextStatuses);

      const combinedLogs = enemyTick.logs.map((l) => `${activeMission.enemyName}: ${l}`);

      const enemyExtraNotes: string[] = [];
      if (movedNote) {
        enemyExtraNotes.push(
          `Inimigo avançou para ${String.fromCharCode(65 + nextEnemyPos.x)}${nextEnemyPos.y + 1}`
        );
      }
      if (enemyJutsu.nature === 'Katon') {
        enemyExtraNotes.push('Fuligem gerada ao redor do alvo (2t)');
      }

      setBattlePosts((prev) => [
        ...prev,
        {
          id: `enemy_${Date.now()}`,
          turn: currentTurn,
          actor: 'enemy',
          authorName: activeMission.enemyName,
          authorAvatar: activeMission.enemyAvatar,
          authorVillage: activeMission.enemyVillage,
          narration: calc.isHit
            ? `${activeMission.enemyName}${movedNote} executa ${enemyJutsu.name} (${enemyJutsu.nature}), atingindo ${character.name} em cheio.`
            : `${activeMission.enemyName}${movedNote} avança com ${enemyJutsu.name} (${enemyJutsu.nature}), mas ${character.name} lê o movimento e evade!`,
          calc,
          statusLogs: combinedLogs,
          hpRemaining: nextPlayerHpDirect,
          maxHp: defenderCombatEff.maxHp,
        },
      ]);

      appendBattleLog({
        turn: currentTurn,
        actor: 'enemy',
        actorName: activeMission.enemyName,
        category: 'attack',
        actionName: enemyJutsu.name,
        actionMeta: `${enemyJutsu.category} · ${enemyJutsu.nature}`,
        summary: calc.isHit
          ? `${activeMission.enemyName} acerta ${character.name} causando ${calc.damage} de dano.`
          : `${character.name} evade o ataque de ${activeMission.enemyName}.`,
        calc,
        statusTicks: combinedLogs,
        extraNotes: enemyExtraNotes.length > 0 ? enemyExtraNotes : undefined,
        hpSnapshot: {
          playerHp: nextPlayerHpDirect,
          playerMaxHp: defenderCombatEff.maxHp,
          enemyHp: enemyTick.nextHp,
          enemyMaxHp: activeMission.scaledHp,
        },
      });

      if (nextPlayerHpDirect <= 0) {
        await finishCombatOnServer(false, usedItems, ocularSnapshot, ocularEventsSnapshot);
      } else if (enemyTick.nextHp <= 0) {
        await finishCombatOnServer(true, usedItems, ocularSnapshot, ocularEventsSnapshot);
      }
      setTurnNumber((n) => n + 1);
      setTurnBusy(false);
    }, 450);
  };

  const handleMoveOnGrid = (target: GridCoord) => {
    if (turnBusy || outcome || !activeMission) return;
    if (!canMoveToTile(tacticalGrid, tacticalGrid.playerPos, target, moveRemaining, tacticalGrid.enemyPos)) {
      return;
    }
    const fromCoord = `${String.fromCharCode(65 + tacticalGrid.playerPos.x)}${tacticalGrid.playerPos.y + 1}`;
    const toCoord = `${String.fromCharCode(65 + target.x)}${target.y + 1}`;
    const steps = manhattanDistance(tacticalGrid.playerPos, target);
    const destTerrain = tacticalGrid.terrain[target.y]?.[target.x] || 'ground';
    const terrainLabel =
      destTerrain === 'tree'
        ? 'Árvore (+10% Esquiva)'
        : destTerrain === 'water'
        ? 'Água (Condutor Raiton)'
        : 'Solo Livre';
    shinobiAudio.playUiClick();
    setTacticalGrid((prev) => ({
      ...prev,
      playerPos: target,
    }));
    setMoveRemaining((m) => Math.max(0, m - steps));

    appendBattleLog({
      turn: turnNumber,
      actor: 'player',
      actorName: character.name,
      category: 'move',
      actionName: `Movimento: ${fromCoord} → ${toCoord}`,
      actionMeta: `-${steps} passo(s)`,
      summary: `Deslocou-se no grid tático para ${toCoord} (${terrainLabel}). Distância até o alvo: ${manhattanDistance(target, tacticalGrid.enemyPos)} casa(s).`,
      hpSnapshot: {
        playerHp,
        playerMaxHp: combatEffStats.maxHp,
        enemyHp,
        enemyMaxHp: activeMission.scaledHp,
      },
    });
  };

  const handleDefensiveStance = async () => {
    if (turnBusy || outcome || !activeMission) return;
    setTurnBusy(true);
    shinobiAudio.playUiClick();
    const shieldStatus: ActiveStatusEffect = {
      type: 'shield',
      label: 'Postura Defensiva',
      turnsRemaining: 1,
      potency: 0,
      sourceName: 'Guarda Tática',
    };
    const workingPlayerStatuses = mergeStatusEffects(
      playerStatuses,
      { type: 'shield', label: 'Postura Defensiva', target: 'self', duration: 1, potency: 0 },
      'Guarda Tática'
    );
    const recoveredChakra = Math.min(combatEffStats.maxChakra, playerChakra + 14);
    const upkeepRes = applySharinganUpkeepForTurn(recoveredChakra);
    const playerTick = tickEndOfTurnStatuses(
      workingPlayerStatuses,
      playerHp,
      combatEffStats.maxHp,
      upkeepRes.nextChakra,
      combatEffStats.maxChakra
    );
    const nextStatuses = playerTick.nextStatuses.some((s) => s.type === 'shield')
      ? playerTick.nextStatuses
      : [...playerTick.nextStatuses, shieldStatus];
    const logsWithUpkeep = upkeepRes.note
      ? [...playerTick.logs, upkeepRes.note]
      : playerTick.logs;

    setPlayerHp(playerTick.nextHp);
    setPlayerChakra(playerTick.nextChakra);
    setPlayerStatuses(nextStatuses);

    setBattlePosts((prev) => [
      ...prev,
      {
        id: `player_def_${Date.now()}`,
        turn: turnNumber,
        actor: 'player',
        authorName: character.name,
        authorAvatar: character.avatarUrl,
        authorVillage: character.village,
        narration: `${character.name} assume Postura Defensiva na casa ${String.fromCharCode(65 + tacticalGrid.playerPos.x)}${tacticalGrid.playerPos.y + 1}, reduzindo dano recebido neste turno e recuperando +14 Chakra.`,
        statusLogs: logsWithUpkeep,
        hpRemaining: enemyHp,
        maxHp: activeMission.scaledHp,
      },
    ]);

    appendBattleLog({
      turn: turnNumber,
      actor: 'player',
      actorName: character.name,
      category: 'stance',
      actionName: 'Postura Defensiva',
      actionMeta: 'Escudo (-30% Dano 1t) · +14 CH',
      summary: `${character.name} reforça a guarda na casa ${String.fromCharCode(65 + tacticalGrid.playerPos.x)}${tacticalGrid.playerPos.y + 1} e recupera +14 Chakra.`,
      statusTicks: logsWithUpkeep,
      hpSnapshot: {
        playerHp: playerTick.nextHp,
        playerMaxHp: combatEffStats.maxHp,
        enemyHp,
        enemyMaxHp: activeMission.scaledHp,
      },
    });

    executeEnemyCounter(
      playerTick.nextHp,
      playerTick.nextChakra,
      nextStatuses,
      enemyHp,
      enemyStatuses,
      consumedInBattle,
      turnNumber,
      tacticalGrid,
      upkeepRes.stillActive
    );
  };

  const handlePassTurnOrControl = async (jutsu?: JutsuDef) => {
    if (turnBusy || outcome || !activeMission) return;
    if (jutsu) {
      const ocularGate = canUseOcularJutsuInCombat(jutsu, effectiveSharinganOn, ocularLive);
      if (!ocularGate.allowed) {
        shinobiAudio.playMissWhoosh();
        return;
      }
      const range = getJutsuGridRange(jutsu);
      if (gridDistance < range.minRange || gridDistance > range.maxRange) return;
      const effectiveCost = getEffectiveJutsuChakraCost(jutsu, combatEffStats);
      if (playerChakra < effectiveCost) return;
    }

    setTurnBusy(true);

    const ctrl = resolveTurnStartControl(playerStatuses, combatEffStats.maxHp);
    let workingPlayerStatuses = ctrl.updatedStatuses;

    if (!ctrl.canAct || !jutsu) {
      if (ctrl.selfDamage > 0) shinobiAudio.playHitImpact(false);
      else shinobiAudio.playMissWhoosh();

      const afterSelfHp = Math.max(0, playerHp - ctrl.selfDamage);
      const upkeepRes = applySharinganUpkeepForTurn(playerChakra);
      const playerTick = tickEndOfTurnStatuses(
        workingPlayerStatuses,
        afterSelfHp,
        combatEffStats.maxHp,
        upkeepRes.nextChakra,
        combatEffStats.maxChakra
      );
      const logsWithUpkeep = upkeepRes.note
        ? [...playerTick.logs, upkeepRes.note]
        : playerTick.logs;

      setPlayerHp(playerTick.nextHp);
      setPlayerChakra(playerTick.nextChakra);
      setPlayerStatuses(playerTick.nextStatuses);

      const skipReason = ctrl.narration
        ? `${character.name} ${ctrl.narration}`
        : `${character.name} recupera o fôlego e aguarda a próxima janela tática.`;

      setBattlePosts((prev) => [
        ...prev,
        {
          id: `player_skip_${Date.now()}`,
          turn: turnNumber,
          actor: 'player',
          authorName: character.name,
          authorAvatar: character.avatarUrl,
          authorVillage: character.village,
          narration: skipReason,
          statusLogs: logsWithUpkeep,
          hpRemaining: playerTick.nextHp,
          maxHp: combatEffStats.maxHp,
        },
      ]);

      appendBattleLog({
        turn: turnNumber,
        actor: 'player',
        actorName: character.name,
        category: 'control',
        actionName: ctrl.narration ? 'Controle / Recuperação' : 'Pausa Tática',
        actionMeta: ctrl.selfDamage > 0 ? `-${ctrl.selfDamage} HP` : 'Turno aguardado',
        summary: skipReason,
        statusTicks: logsWithUpkeep.map((l) => `${character.name}: ${l}`),
        hpSnapshot: {
          playerHp: playerTick.nextHp,
          playerMaxHp: combatEffStats.maxHp,
          enemyHp,
          enemyMaxHp: activeMission.scaledHp,
        },
      });

      if (playerTick.nextHp <= 0) {
        setTimeout(async () => {
          await finishCombatOnServer(false, consumedInBattle);
          setTurnBusy(false);
        }, 400);
        return;
      }

      executeEnemyCounter(
        playerTick.nextHp,
        playerTick.nextChakra,
        playerTick.nextStatuses,
        enemyHp,
        enemyStatuses,
        consumedInBattle,
        turnNumber,
        tacticalGrid,
        upkeepRes.stillActive
      );
      return;
    }

    const effectiveCost = getEffectiveJutsuChakraCost(jutsu, combatEffStats);
    shinobiAudio.playJutsuCast();

    // Izanagi rewrites injury and negative statuses at the price of permanent eyesight in 1 eye
    if (jutsu.id === 'uchiha_izanagi' || jutsu.id === 'izanagi') {
      const negativeTypes = new Set([
        'burn',
        'bleed',
        'poison',
        'drowning',
        'paralysis',
        'stun',
        'chakra_seal',
        'crush',
        'mind_control',
      ]);
      workingPlayerStatuses = workingPlayerStatuses.filter((s) => !negativeTypes.has(s.type));
    }

    const enemyStats = {
      ninjutsu: Math.round(activeMission.scaledAttack * 0.6),
      taijutsu: Math.round(activeMission.scaledAttack * 0.6),
      genjutsu: 12,
      velocidade: activeMission.scaledSpeed,
      forca: 14,
      inteligencia: 14,
      resistencia: Math.round(activeMission.scaledAttack * 0.45),
      controleChakra: 14,
      maxHp: activeMission.scaledHp,
      maxChakra: 300,
      chakraEfficiency: 1,
    };

    const normalizedJutsuNature = normalizeElementalNature(jutsu.nature);
    const effectiveDefStatuses =
      enemyTerrain === 'water' &&
      normalizedJutsuNature === 'Raiton' &&
      !enemyStatuses.some((s) => s.type === 'soaked')
        ? [
            ...enemyStatuses,
            { type: 'soaked' as const, label: 'Água no Grid', turnsRemaining: 1, potency: 0 },
          ]
        : enemyStatuses;

    const calc = calculateHitAndDamage(
      combatEffStats,
      character.chakraNature,
      enemyStats,
      activeMission.enemyNature,
      jutsu,
      Math.random,
      {
        attackerStatuses: workingPlayerStatuses,
        defenderStatuses: effectiveDefStatuses,
        attackerClan: character.clan,
        attackerKekkei: character.kekkeiGenkai,
        attackerSecondaryNature: character.secondaryChakraNature,
        sharinganActive: effectiveSharinganOn,
      }
    );

    let workingEnemyStatuses = [...enemyStatuses];
    for (const fx of calc.appliedEffects) {
      if (fx.target === 'enemy') {
        workingEnemyStatuses = mergeStatusEffects(workingEnemyStatuses, fx, jutsu.name);
      } else {
        workingPlayerStatuses = mergeStatusEffects(workingPlayerStatuses, fx, jutsu.name);
      }
    }

    // Apply Instant Blindness (Izanagi / Izanami) or Progressive Blindness (Mangekyou)
    const strain = applyOcularJutsuStrain(battleOcular, jutsu);
    let nextOcular = battleOcular;
    let nextOcularEvents = battleOcularEvents;
    if (strain.triggered) {
      nextOcular = {
        leftEyeBlindness: strain.leftEyeBlindness,
        rightEyeBlindness: strain.rightEyeBlindness,
      };
      setBattleOcular(nextOcular);
      if (strain.logMessage) {
        nextOcularEvents = [...battleOcularEvents, strain.logMessage];
        setBattleOcularEvents(nextOcularEvents);
      }
      // Persist irreversible ocular strain immediately on server
      apiFetch('/api/characters/ocular-strain', {
        method: 'POST',
        body: JSON.stringify({
          jutsuId: jutsu.id,
          jutsuName: jutsu.name,
          kekkeiRequired: jutsu.kekkeiRequired,
        }),
      }).catch(() => {
        // synced again on finishCombatOnServer
      });
    }

    let nextClouds = tacticalGrid.clouds;
    let cloudNote = '';
    if (jutsu.nature === 'Katon') {
      nextClouds = applyTileCloudArea(nextClouds, tacticalGrid.enemyPos, 1, 'soot', 2);
      cloudNote = ' As chamas cobrem a área com Fuligem (2 turnos).';
    } else if (jutsu.nature === 'Suiton') {
      nextClouds = applyTileCloudArea(nextClouds, tacticalGrid.enemyPos, 1, 'mist', 2);
      cloudNote = ' O vapor d’água gera Névoa Tática (2 turnos).';
    }
    const nextGrid: TacticalGridState = { ...tacticalGrid, clouds: nextClouds };

    const nextChakraDirect = Math.max(0, playerChakra - effectiveCost);
    const upkeepRes = applySharinganUpkeepForTurn(
      nextChakraDirect,
      strain.becameCompletelyBlind
    );
    const healedPlayerHp = Math.min(combatEffStats.maxHp, playerHp + calc.healing);
    const nextEnemyHp = calc.isHit && calc.damage > 0 ? Math.max(0, enemyHp - calc.damage) : enemyHp;

    const playerTick = tickEndOfTurnStatuses(
      workingPlayerStatuses,
      healedPlayerHp,
      combatEffStats.maxHp,
      upkeepRes.nextChakra,
      combatEffStats.maxChakra
    );

    const statusLogsCombined = [
      ...playerTick.logs.map((l) => `${character.name}: ${l}`),
      ...(upkeepRes.note ? [upkeepRes.note] : []),
      ...(strain.logMessage ? [strain.logMessage] : []),
    ];

    setTacticalGrid(nextGrid);
    setPlayerChakra(playerTick.nextChakra);
    setPlayerHp(playerTick.nextHp);
    setPlayerStatuses(playerTick.nextStatuses);
    setEnemyHp(nextEnemyHp);
    setEnemyStatuses(workingEnemyStatuses);

    if (calc.isHit && calc.damage > 0) shinobiAudio.playHitImpact(calc.isCrit);
    else if (!calc.isHit) shinobiAudio.playMissWhoosh();

    const narrationText =
      (customActionNote.trim()
        ? `${customActionNote.trim()} — Técnica executada: ${jutsu.name} (-${effectiveCost} Chakra).`
        : `${character.name} forma os selos de ${jutsu.name} (-${effectiveCost} Chakra) contra ${activeMission.enemyName}.`) +
      cloudNote +
      (strain.logMessage ? ` ${strain.logMessage}` : '');

    setCustomActionNote('');
    setBattlePosts((prev) => [
      ...prev,
      {
        id: `player_${Date.now()}`,
        turn: turnNumber,
        actor: 'player',
        authorName: character.name,
        authorAvatar: character.avatarUrl,
        authorVillage: character.village,
        narration: narrationText,
        calc,
        statusLogs: statusLogsCombined,
        hpRemaining: nextEnemyHp,
        maxHp: activeMission.scaledHp,
      },
    ]);

    const extraNotesList = [
      ...(cloudNote ? [cloudNote.trim()] : []),
      ...(strain.logMessage ? [strain.logMessage] : []),
    ];

    appendBattleLog({
      turn: turnNumber,
      actor: 'player',
      actorName: character.name,
      category: 'attack',
      actionName: jutsu.name,
      actionMeta: `${jutsu.category} · ${jutsu.nature} · -${effectiveCost} CH`,
      summary: calc.isHit
        ? `${character.name} acerta ${activeMission.enemyName} com ${jutsu.name} causando ${calc.damage} de dano.`
        : `${activeMission.enemyName} evade a técnica ${jutsu.name}!`,
      calc,
      statusTicks: statusLogsCombined,
      extraNotes: extraNotesList.length > 0 ? extraNotesList : undefined,
      hpSnapshot: {
        playerHp: playerTick.nextHp,
        playerMaxHp: combatEffStats.maxHp,
        enemyHp: nextEnemyHp,
        enemyMaxHp: activeMission.scaledHp,
      },
    });

    if (strain.triggered && strain.logMessage) {
      appendBattleLog({
        turn: turnNumber,
        actor: 'system',
        actorName: 'Integridade Ocular',
        category: 'system',
        actionName: strain.instantBlindness
          ? `Sacrifício Ocular (${jutsu.name})`
          : `Desgaste do Mangekyou (${jutsu.name})`,
        actionMeta: `Cegueira Esq ${nextOcular.leftEyeBlindness}% · Dir ${nextOcular.rightEyeBlindness}%`,
        summary: strain.logMessage,
      });
    }

    if (nextEnemyHp <= 0) {
      setTimeout(async () => {
        await finishCombatOnServer(true, consumedInBattle, nextOcular, nextOcularEvents);
        setTurnBusy(false);
      }, 400);
      return;
    }

    if (playerTick.nextHp <= 0) {
      setTimeout(async () => {
        await finishCombatOnServer(false, consumedInBattle, nextOcular, nextOcularEvents);
        setTurnBusy(false);
      }, 400);
      return;
    }

    executeEnemyCounter(
      playerTick.nextHp,
      playerTick.nextChakra,
      playerTick.nextStatuses,
      nextEnemyHp,
      workingEnemyStatuses,
      consumedInBattle,
      turnNumber,
      nextGrid,
      upkeepRes.stillActive,
      nextOcular,
      nextOcularEvents
    );
  };

  const handleUseMeleeStrike = async (strike: MeleeStrikeSpec) => {
    if (turnBusy || outcome || !activeMission) return;
    if (gridDistance < strike.minRange || gridDistance > strike.maxRange) return;
    if (playerChakra < strike.chakraCost) return;

    setTurnBusy(true);
    const ctrl = resolveTurnStartControl(playerStatuses, combatEffStats.maxHp);
    let workingPlayerStatuses = ctrl.updatedStatuses;

    if (!ctrl.canAct) {
      setTurnBusy(false);
      await handlePassTurnOrControl();
      return;
    }

    shinobiAudio.playJutsuCast();
    const enemyStats = {
      ninjutsu: Math.round(activeMission.scaledAttack * 0.6),
      taijutsu: Math.round(activeMission.scaledAttack * 0.6),
      genjutsu: 12,
      velocidade: activeMission.scaledSpeed,
      forca: 14,
      inteligencia: 14,
      resistencia: Math.round(activeMission.scaledAttack * 0.45),
      controleChakra: 14,
      maxHp: activeMission.scaledHp,
      maxChakra: 300,
      chakraEfficiency: 1,
    };

    const calc = calculateHitAndDamage(
      combatEffStats,
      'Neutro',
      enemyStats,
      activeMission.enemyNature,
      {
        id: strike.id,
        category: 'Taijutsu',
        nature: 'Neutro',
        basePower: strike.basePower,
        accuracyMod: strike.accuracyMod,
        critBonus: strike.critBonus,
        effects: strike.effects,
      },
      Math.random,
      {
        attackerStatuses: workingPlayerStatuses,
        defenderStatuses: enemyStatuses,
        attackerClan: character.clan,
        attackerKekkei: character.kekkeiGenkai,
        sharinganActive: effectiveSharinganOn,
      }
    );

    let workingEnemyStatuses = [...enemyStatuses];
    for (const fx of calc.appliedEffects) {
      if (fx.target === 'enemy') {
        workingEnemyStatuses = mergeStatusEffects(workingEnemyStatuses, fx, strike.name);
      } else {
        workingPlayerStatuses = mergeStatusEffects(workingPlayerStatuses, fx, strike.name);
      }
    }

    let nextGrid = tacticalGrid;
    let knockbackNote = '';
    if (calc.isHit && strike.knockbackTiles > 0) {
      const pushedPos = computeKnockbackTile(
        tacticalGrid,
        tacticalGrid.playerPos,
        tacticalGrid.enemyPos,
        strike.knockbackTiles
      );
      if (pushedPos.x !== tacticalGrid.enemyPos.x || pushedPos.y !== tacticalGrid.enemyPos.y) {
        nextGrid = { ...tacticalGrid, enemyPos: pushedPos };
        knockbackNote = ` O impacto empurra ${activeMission.enemyName} para ${String.fromCharCode(65 + pushedPos.x)}${pushedPos.y + 1}!`;
      }
    }

    if (calc.isHit && calc.damage > 0) shinobiAudio.playHitImpact(calc.isCrit);
    else if (!calc.isHit) shinobiAudio.playMissWhoosh();

    const nextChakraDirect = Math.max(0, playerChakra - strike.chakraCost);
    const upkeepRes = applySharinganUpkeepForTurn(nextChakraDirect);
    const nextEnemyHp = calc.isHit && calc.damage > 0 ? Math.max(0, enemyHp - calc.damage) : enemyHp;
    const playerTick = tickEndOfTurnStatuses(
      workingPlayerStatuses,
      playerHp,
      combatEffStats.maxHp,
      upkeepRes.nextChakra,
      combatEffStats.maxChakra
    );
    const meleeLogs = [
      ...playerTick.logs.map((l) => `${character.name}: ${l}`),
      ...(upkeepRes.note ? [upkeepRes.note] : []),
    ];

    setTacticalGrid(nextGrid);
    setPlayerChakra(playerTick.nextChakra);
    setPlayerHp(playerTick.nextHp);
    setPlayerStatuses(playerTick.nextStatuses);
    setEnemyHp(nextEnemyHp);
    setEnemyStatuses(workingEnemyStatuses);

    const narration =
      (customActionNote.trim()
        ? `${customActionNote.trim()} — Golpe físico: ${strike.name}.`
        : `${character.name} avança em combate corpo a corpo com ${strike.name} contra ${activeMission.enemyName}.`) +
      knockbackNote;
    setCustomActionNote('');

    setBattlePosts((prev) => [
      ...prev,
      {
        id: `player_melee_${Date.now()}`,
        turn: turnNumber,
        actor: 'player',
        authorName: character.name,
        authorAvatar: character.avatarUrl,
        authorVillage: character.village,
        narration,
        calc,
        statusLogs: meleeLogs,
        hpRemaining: nextEnemyHp,
        maxHp: activeMission.scaledHp,
      },
    ]);

    appendBattleLog({
      turn: turnNumber,
      actor: 'player',
      actorName: character.name,
      category: 'attack',
      actionName: strike.name,
      actionMeta: `Taijutsu Direto · -${strike.chakraCost} CH`,
      summary: calc.isHit
        ? `${character.name} conecta ${strike.name} causando ${calc.damage} de dano.${knockbackNote}`
        : `${activeMission.enemyName} esquiva do golpe ${strike.name}.`,
      calc,
      statusTicks: meleeLogs,
      extraNotes: knockbackNote ? [knockbackNote.trim()] : undefined,
      hpSnapshot: {
        playerHp: playerTick.nextHp,
        playerMaxHp: combatEffStats.maxHp,
        enemyHp: nextEnemyHp,
        enemyMaxHp: activeMission.scaledHp,
      },
    });

    if (nextEnemyHp <= 0) {
      setTimeout(async () => {
        await finishCombatOnServer(true, consumedInBattle, battleOcular, battleOcularEvents);
        setTurnBusy(false);
      }, 400);
      return;
    }

    executeEnemyCounter(
      playerTick.nextHp,
      playerTick.nextChakra,
      playerTick.nextStatuses,
      nextEnemyHp,
      workingEnemyStatuses,
      consumedInBattle,
      turnNumber,
      nextGrid,
      upkeepRes.stillActive
    );
  };

  const handleUseNinjaWeapon = async (weapon: NinjaWeaponCombatDef) => {
    if (turnBusy || outcome || !activeMission) return;
    if (gridDistance < weapon.minRange || gridDistance > weapon.maxRange) return;

    const canInfuseWeapon =
      weapon.kind !== 'smoke_bomb' &&
      !weapon.nature &&
      weapon.kind !== 'explosive_tag' &&
      weaponInfusionElement !== 'none';
    const infusionExtraCost = canInfuseWeapon ? 4 : 0;
    const totalWeaponChakraCost = weapon.chakraCost + infusionExtraCost;
    if (playerChakra < totalWeaponChakraCost) return;

    setTurnBusy(true);
    shinobiAudio.playUiClick();

    // Smoke bomb deploys smoke cloud centered on player for concealment & unlocks Secret Actions
    if (weapon.kind === 'smoke_bomb') {
      const nextClouds = applyTileCloudArea(
        tacticalGrid.clouds,
        tacticalGrid.playerPos,
        weapon.cloudRadius || 1,
        'smoke',
        3
      );
      const nextGrid: TacticalGridState = { ...tacticalGrid, clouds: nextClouds };
      const upkeepSmoke = applySharinganUpkeepForTurn(Math.max(0, playerChakra - weapon.chakraCost));
      const playerTick = tickEndOfTurnStatuses(
        playerStatuses,
        playerHp,
        combatEffStats.maxHp,
        upkeepSmoke.nextChakra,
        combatEffStats.maxChakra
      );
      const smokeLogs = [
        ...playerTick.logs,
        ...(upkeepSmoke.note ? [upkeepSmoke.note] : []),
      ];
      setTacticalGrid(nextGrid);
      setPlayerHp(playerTick.nextHp);
      setPlayerChakra(playerTick.nextChakra);
      setPlayerStatuses(playerTick.nextStatuses);

      setBattlePosts((prev) => [
        ...prev,
        {
          id: `player_smoke_${Date.now()}`,
          turn: turnNumber,
          actor: 'player',
          authorName: character.name,
          authorAvatar: character.avatarUrl,
          authorVillage: character.village,
          narration: `${character.name} detona ${weapon.name}! Uma nuvem densa de Fumaça cobre 3×3 casas no grid por 3 turnos, ocultando seus movimentos para Ações Secretas.`,
          statusLogs: smokeLogs,
          hpRemaining: enemyHp,
          maxHp: activeMission.scaledHp,
        },
      ]);

      appendBattleLog({
        turn: turnNumber,
        actor: 'player',
        actorName: character.name,
        category: 'item',
        actionName: weapon.name,
        actionMeta: `Fumaça 3×3 (3t) · -${weapon.chakraCost} CH`,
        summary: `Cobertura de Fumaça criada ao redor de ${String.fromCharCode(65 + tacticalGrid.playerPos.x)}${tacticalGrid.playerPos.y + 1}, habilitando Ações Secretas contra oponentes sem Dojutsu.`,
        statusTicks: smokeLogs.map((l) => `${character.name}: ${l}`),
        hpSnapshot: {
          playerHp: playerTick.nextHp,
          playerMaxHp: combatEffStats.maxHp,
          enemyHp,
          enemyMaxHp: activeMission.scaledHp,
        },
      });

      executeEnemyCounter(
        playerTick.nextHp,
        playerTick.nextChakra,
        playerTick.nextStatuses,
        enemyHp,
        enemyStatuses,
        consumedInBattle,
        turnNumber,
        nextGrid,
        upkeepSmoke.stillActive
      );
      return;
    }

    const enemyStats = {
      ninjutsu: Math.round(activeMission.scaledAttack * 0.6),
      taijutsu: Math.round(activeMission.scaledAttack * 0.6),
      genjutsu: 12,
      velocidade: activeMission.scaledSpeed,
      forca: 14,
      inteligencia: 14,
      resistencia: Math.round(activeMission.scaledAttack * 0.45),
      controleChakra: 14,
      maxHp: activeMission.scaledHp,
      maxChakra: 300,
      chakraEfficiency: 1,
    };

    const resolvedWeaponNature: ChakraNature | 'Neutro' =
      weapon.nature ||
      (weapon.kind === 'explosive_tag'
        ? 'Katon'
        : canInfuseWeapon
        ? (weaponInfusionElement as ChakraNature)
        : 'Neutro');

    const weaponEffects: JutsuEffectSpec[] = weapon.appliesEffect
      ? [
          {
            type: weapon.appliesEffect,
            target: 'enemy',
            chance: 75,
            duration: 2,
            potency: Math.max(12, Math.round(weapon.basePower * 0.25)),
            label: weapon.appliesEffect,
          },
        ]
      : [];

    const effectiveDefStatuses =
      enemyTerrain === 'water' &&
      resolvedWeaponNature === 'Raiton' &&
      !enemyStatuses.some((s) => s.type === 'soaked')
        ? [
            ...enemyStatuses,
            { type: 'soaked' as const, label: 'Água no Grid', turnsRemaining: 1, potency: 0 },
          ]
        : enemyStatuses;

    const calc = calculateHitAndDamage(
      combatEffStats,
      character.chakraNature,
      enemyStats,
      activeMission.enemyNature,
      {
        id: weapon.id,
        category: 'Taijutsu',
        nature: resolvedWeaponNature,
        basePower: weapon.basePower + (canInfuseWeapon ? 6 : 0),
        accuracyMod: weapon.accuracyMod,
        critBonus: weapon.critBonus,
        effects: weaponEffects,
      },
      Math.random,
      {
        attackerStatuses: playerStatuses,
        defenderStatuses: effectiveDefStatuses,
        attackerClan: character.clan,
        attackerKekkei: character.kekkeiGenkai,
        attackerSecondaryNature: character.secondaryChakraNature,
        sharinganActive: effectiveSharinganOn,
      }
    );

    let workingEnemyStatuses = [...enemyStatuses];
    let workingPlayerStatuses = [...playerStatuses];
    for (const fx of calc.appliedEffects) {
      if (fx.target === 'enemy') {
        workingEnemyStatuses = mergeStatusEffects(workingEnemyStatuses, fx, weapon.name);
      } else {
        workingPlayerStatuses = mergeStatusEffects(workingPlayerStatuses, fx, weapon.name);
      }
    }

    let nextGrid = { ...tacticalGrid };
    let extraNote = '';
    if (weapon.createsCloud) {
      nextGrid = {
        ...nextGrid,
        clouds: applyTileCloudArea(
          nextGrid.clouds,
          nextGrid.enemyPos,
          weapon.cloudRadius || 1,
          weapon.createsCloud,
          2
        ),
      };
      extraNote += ' A explosão cobre o setor com Fuligem (2t).';
    }
    if (calc.isHit && weapon.knockbackTiles && weapon.knockbackTiles > 0) {
      const pushed = computeKnockbackTile(
        nextGrid,
        nextGrid.playerPos,
        nextGrid.enemyPos,
        weapon.knockbackTiles
      );
      if (pushed.x !== nextGrid.enemyPos.x || pushed.y !== nextGrid.enemyPos.y) {
        nextGrid = { ...nextGrid, enemyPos: pushed };
        extraNote += ` Alvo repelido para ${String.fromCharCode(65 + pushed.x)}${pushed.y + 1}!`;
      }
    }

    if (calc.isHit && calc.damage > 0) shinobiAudio.playHitImpact(calc.isCrit);
    else if (!calc.isHit) shinobiAudio.playMissWhoosh();

    const nextChakra = Math.max(0, playerChakra - totalWeaponChakraCost);
    const upkeepWp = applySharinganUpkeepForTurn(nextChakra);
    const nextEnemyHp = calc.isHit && calc.damage > 0 ? Math.max(0, enemyHp - calc.damage) : enemyHp;
    const playerTick = tickEndOfTurnStatuses(
      workingPlayerStatuses,
      playerHp,
      combatEffStats.maxHp,
      upkeepWp.nextChakra,
      combatEffStats.maxChakra
    );
    const wpLogs = [
      ...playerTick.logs.map((l) => `${character.name}: ${l}`),
      ...(upkeepWp.note ? [upkeepWp.note] : []),
    ];

    setTacticalGrid(nextGrid);
    setPlayerHp(playerTick.nextHp);
    setPlayerChakra(playerTick.nextChakra);
    setPlayerStatuses(playerTick.nextStatuses);
    setEnemyHp(nextEnemyHp);
    setEnemyStatuses(workingEnemyStatuses);

    const weaponElemSuffix =
      resolvedWeaponNature !== 'Neutro'
        ? ` [${formatElementalLabel(resolvedWeaponNature)}]`
        : '';
    const narration =
      (customActionNote.trim()
        ? `${customActionNote.trim()} — Arma Ninja: ${weapon.name}${weaponElemSuffix}.`
        : `${character.name} utiliza ${weapon.name}${weaponElemSuffix} contra ${activeMission.enemyName}.`) + extraNote;
    setCustomActionNote('');

    setBattlePosts((prev) => [
      ...prev,
      {
        id: `player_wp_${Date.now()}`,
        turn: turnNumber,
        actor: 'player',
        authorName: character.name,
        authorAvatar: character.avatarUrl,
        authorVillage: character.village,
        narration,
        calc,
        statusLogs: wpLogs,
        hpRemaining: nextEnemyHp,
        maxHp: activeMission.scaledHp,
      },
    ]);

    appendBattleLog({
      turn: turnNumber,
      actor: 'player',
      actorName: character.name,
      category: 'attack',
      actionName: `${weapon.name}${weaponElemSuffix}`,
      actionMeta: `Arma Ninja · ${formatElementalLabel(resolvedWeaponNature)} · -${totalWeaponChakraCost} CH`,
      summary: calc.isHit
        ? `${character.name} atinge ${activeMission.enemyName} com ${weapon.name}${weaponElemSuffix} (${calc.damage} Dano).`
        : `${activeMission.enemyName} desvia de ${weapon.name}.`,
      calc,
      statusTicks: wpLogs,
      extraNotes: extraNote ? [extraNote.trim()] : undefined,
      hpSnapshot: {
        playerHp: playerTick.nextHp,
        playerMaxHp: combatEffStats.maxHp,
        enemyHp: nextEnemyHp,
        enemyMaxHp: activeMission.scaledHp,
      },
    });

    if (nextEnemyHp <= 0) {
      setTimeout(async () => {
        await finishCombatOnServer(true, consumedInBattle, battleOcular, battleOcularEvents);
        setTurnBusy(false);
      }, 400);
      return;
    }

    executeEnemyCounter(
      playerTick.nextHp,
      playerTick.nextChakra,
      playerTick.nextStatuses,
      nextEnemyHp,
      workingEnemyStatuses,
      consumedInBattle,
      turnNumber,
      nextGrid,
      upkeepWp.stillActive
    );
  };

  const handlePrepareSecretAction = (secret: SecretActionDef) => {
    if (turnBusy || outcome || !activeMission) return;
    if (!secretActionStatus.allowed) return;
    const prepCost = Math.max(4, Math.floor(secret.chakraCost / 2));
    if (playerChakra < prepCost) return;

    setTurnBusy(true);
    shinobiAudio.playUiClick();
    setPreparedSecret(secret);

    const nextStatuses = mergeStatusEffects(
      playerStatuses,
      { type: 'shield', label: 'Oculto na Fumaça', target: 'self', duration: 1, potency: 0 },
      'Preparação Secreta'
    );
    const nextChakra = Math.max(0, playerChakra - prepCost);
    const upkeepPrep = applySharinganUpkeepForTurn(nextChakra);
    const playerTick = tickEndOfTurnStatuses(
      nextStatuses,
      playerHp,
      combatEffStats.maxHp,
      upkeepPrep.nextChakra,
      combatEffStats.maxChakra
    );

    setPlayerHp(playerTick.nextHp);
    setPlayerChakra(playerTick.nextChakra);
    setPlayerStatuses(playerTick.nextStatuses);

    setBattlePosts((prev) => [
      ...prev,
      {
        id: `player_prep_secret_${Date.now()}`,
        turn: turnNumber,
        actor: 'player',
        authorName: character.name,
        authorAvatar: character.avatarUrl,
        authorVillage: character.village,
        narration: `${character.name} prepara silenciosamente "${secret.name}" (-${prepCost} CH) oculto pela cobertura visual! (+35% Poder e +15% Crítico quando disparar).`,
        statusLogs: [...playerTick.logs, ...(upkeepPrep.note ? [upkeepPrep.note] : [])],
        hpRemaining: enemyHp,
        maxHp: activeMission.scaledHp,
      },
    ]);

    appendBattleLog({
      turn: turnNumber,
      actor: 'player',
      actorName: character.name,
      category: 'secret',
      actionName: `Preparar: ${secret.name}`,
      actionMeta: `Oculto · -${prepCost} CH`,
      summary: `${character.name} ocultou-se na cobertura preparando "${secret.name}" (+35% Poder e +15% Crítico no disparo).`,
      statusTicks: [
        ...playerTick.logs.map((l) => `${character.name}: ${l}`),
        ...(upkeepPrep.note ? [upkeepPrep.note] : []),
      ],
      hpSnapshot: {
        playerHp: playerTick.nextHp,
        playerMaxHp: combatEffStats.maxHp,
        enemyHp,
        enemyMaxHp: activeMission.scaledHp,
      },
    });

    executeEnemyCounter(
      playerTick.nextHp,
      playerTick.nextChakra,
      playerTick.nextStatuses,
      enemyHp,
      enemyStatuses,
      consumedInBattle,
      turnNumber,
      tacticalGrid,
      upkeepPrep.stillActive
    );
  };

  const handleExecuteSecretAction = async (secret: SecretActionDef) => {
    if (turnBusy || outcome || !activeMission) return;
    if (!secretActionStatus.allowed) return;
    if (gridDistance < secret.minRange || gridDistance > secret.maxRange) return;
    if (playerChakra < secret.chakraCost) return;

    setTurnBusy(true);
    shinobiAudio.playJutsuCast();

    const wasPrepared = preparedSecret?.id === secret.id;
    const profMult = 1 + (combatEffStats.secretBonus || 0) + (wasPrepared ? 0.35 : 0);
    const bonusCrit = wasPrepared ? 15 : 0;

    const enemyStats = {
      ninjutsu: Math.round(activeMission.scaledAttack * 0.6),
      taijutsu: Math.round(activeMission.scaledAttack * 0.6),
      genjutsu: 12,
      velocidade: activeMission.scaledSpeed,
      forca: 14,
      inteligencia: 14,
      resistencia: Math.round(activeMission.scaledAttack * 0.45),
      controleChakra: 14,
      maxHp: activeMission.scaledHp,
      maxChakra: 300,
      chakraEfficiency: 1,
    };

    const secretEffects: JutsuEffectSpec[] = [];
    if (secret.appliesEffect) {
      secretEffects.push({
        type: secret.appliesEffect,
        target: 'enemy',
        chance: 90,
        duration: 2,
        potency: 20,
        label: secret.appliesEffect,
      });
    }
    if (secret.grantsSelfShield) {
      secretEffects.push({
        type: 'shield',
        target: 'self',
        chance: 100,
        duration: 2,
        label: 'Isca Oculta (Escudo 2t)',
      });
    }

    const calc = calculateHitAndDamage(
      combatEffStats,
      character.chakraNature,
      enemyStats,
      activeMission.enemyNature,
      {
        id: secret.id,
        category: 'Taijutsu',
        nature: 'Neutro',
        basePower: Math.round(secret.basePower * profMult),
        accuracyMod: secret.accuracyMod,
        critBonus: secret.critBonus + bonusCrit,
        effects: secretEffects,
      },
      Math.random,
      {
        attackerStatuses: playerStatuses,
        defenderStatuses: enemyStatuses,
        attackerClan: character.clan,
        attackerKekkei: character.kekkeiGenkai,
        sharinganActive: effectiveSharinganOn,
      }
    );

    let workingEnemyStatuses = [...enemyStatuses];
    let workingPlayerStatuses = [...playerStatuses];
    for (const fx of calc.appliedEffects) {
      if (fx.target === 'enemy') {
        workingEnemyStatuses = mergeStatusEffects(workingEnemyStatuses, fx, secret.name);
      } else {
        workingPlayerStatuses = mergeStatusEffects(workingPlayerStatuses, fx, secret.name);
      }
    }

    if (calc.isHit && calc.damage > 0) shinobiAudio.playHitImpact(calc.isCrit);
    else if (!calc.isHit) shinobiAudio.playMissWhoosh();

    const nextChakra = Math.max(0, playerChakra - secret.chakraCost);
    const upkeepSec = applySharinganUpkeepForTurn(nextChakra);
    const nextEnemyHp = calc.isHit && calc.damage > 0 ? Math.max(0, enemyHp - calc.damage) : enemyHp;
    const playerTick = tickEndOfTurnStatuses(
      workingPlayerStatuses,
      playerHp,
      combatEffStats.maxHp,
      upkeepSec.nextChakra,
      combatEffStats.maxChakra
    );
    const secLogs = [
      ...playerTick.logs.map((l) => `${character.name}: ${l}`),
      ...(upkeepSec.note ? [upkeepSec.note] : []),
    ];

    setPreparedSecret(null);
    setPlayerHp(playerTick.nextHp);
    setPlayerChakra(playerTick.nextChakra);
    setPlayerStatuses(playerTick.nextStatuses);
    setEnemyHp(nextEnemyHp);
    setEnemyStatuses(workingEnemyStatuses);

    setBattlePosts((prev) => [
      ...prev,
      {
        id: `player_exec_secret_${Date.now()}`,
        turn: turnNumber,
        actor: 'player',
        authorName: character.name,
        authorAvatar: character.avatarUrl,
        authorVillage: character.village,
        narration: `${character.name} executa ${secret.name}${wasPrepared ? ' (Emboscada Preparada!)' : ''} a partir da cobertura visual contra ${activeMission.enemyName}!`,
        calc,
        statusLogs: secLogs,
        hpRemaining: nextEnemyHp,
        maxHp: activeMission.scaledHp,
      },
    ]);

    appendBattleLog({
      turn: turnNumber,
      actor: 'player',
      actorName: character.name,
      category: 'secret',
      actionName: `${secret.name}${wasPrepared ? ' (Emboscada)' : ''}`,
      actionMeta: `Ação Secreta · -${secret.chakraCost} CH`,
      summary: calc.isHit
        ? `Emboscada bem-sucedida! ${secret.name} causa ${calc.damage} de dano.`
        : `${activeMission.enemyName} percebeu a emboscada no último instante!`,
      calc,
      statusTicks: secLogs,
      hpSnapshot: {
        playerHp: playerTick.nextHp,
        playerMaxHp: combatEffStats.maxHp,
        enemyHp: nextEnemyHp,
        enemyMaxHp: activeMission.scaledHp,
      },
    });

    if (nextEnemyHp <= 0) {
      setTimeout(async () => {
        await finishCombatOnServer(true, consumedInBattle, battleOcular, battleOcularEvents);
        setTurnBusy(false);
      }, 400);
      return;
    }

    executeEnemyCounter(
      playerTick.nextHp,
      playerTick.nextChakra,
      playerTick.nextStatuses,
      nextEnemyHp,
      workingEnemyStatuses,
      consumedInBattle,
      turnNumber,
      tacticalGrid,
      upkeepSec.stillActive
    );
  };

  const handleUseConsumable = (itemId: string) => {
    if (turnBusy || outcome) return;
    const def = ITEM_CATALOG.find((i) => i.id === itemId);
    if (!def) return;
    const usedCount = consumedInBattle.filter((x) => x === itemId).length;
    const owned = character.inventory.find((x) => x.itemId === itemId)?.qty || 0;
    if (usedCount >= owned) return;

    setTurnBusy(true);
    shinobiAudio.playUiClick();
    const nextUsed = [...consumedInBattle, itemId];
    setConsumedInBattle(nextUsed);

    const nextHp = Math.min(combatEffStats.maxHp, playerHp + (def.healHp || 0));
    const rawCh = Math.min(combatEffStats.maxChakra, playerChakra + (def.healChakra || 0));
    const upkeepItem = applySharinganUpkeepForTurn(rawCh);
    const nextCh = upkeepItem.nextChakra;
    setPlayerHp(nextHp);
    setPlayerChakra(nextCh);

    setBattlePosts((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        turn: turnNumber,
        actor: 'player',
        authorName: character.name,
        authorAvatar: character.avatarUrl,
        authorVillage: character.village,
        narration: `${character.name} saca ${def.name} da bolsa tática (${def.healHp ? `+${def.healHp} HP` : `+${def.healChakra} Chakra`}).`,
        statusLogs: upkeepItem.note ? [upkeepItem.note] : undefined,
      },
    ]);

    appendBattleLog({
      turn: turnNumber,
      actor: 'player',
      actorName: character.name,
      category: 'item',
      actionName: `Consumível: ${def.name}`,
      actionMeta: def.healHp ? `+${def.healHp} HP` : `+${def.healChakra} CH`,
      healingAmount: def.healHp || 0,
      summary: `${character.name} usou ${def.name} recuperando ${def.healHp ? `${def.healHp} HP` : `${def.healChakra} Chakra`}.`,
      statusTicks: upkeepItem.note ? [upkeepItem.note] : undefined,
      hpSnapshot: {
        playerHp: nextHp,
        playerMaxHp: combatEffStats.maxHp,
        enemyHp,
        enemyMaxHp: activeMission.scaledHp,
      },
    });
    executeEnemyCounter(
      nextHp,
      nextCh,
      playerStatuses,
      enemyHp,
      enemyStatuses,
      nextUsed,
      turnNumber,
      tacticalGrid,
      upkeepItem.stillActive
    );
  };

  const standardQuests = useMemo(
    () => summonQuests.filter((q) => !q.isGreatSummon),
    [summonQuests]
  );
  const greatSageQuests = useMemo(
    () => summonQuests.filter((q) => q.isGreatSummon),
    [summonQuests]
  );

  const renderQuestCard = (q: PublicSummonQuest) => {
    const isExpanded = expandedTrialQuestId === q.id;
    const currentAnswers = trialAnswers[q.id] || {};
    const allAnswered = q.trialQuestions.every((tq) => currentAnswers[tq.id] !== undefined);
    const activeOwned = q.eligibility.alreadyOwned;

    return (
      <article
        key={q.id}
        className={`rounded-xl border p-5 space-y-4 bg-[#0C0C10] ${
          q.isGreatSummon ? 'border-amber-500/50' : 'border-[#24242E]'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            {q.bossAvatar ? (
              <NinjaAvatar src={q.bossAvatar} alt={q.bossName} sizeClass="w-16 h-16" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-[#08080B] border border-[#10B981] flex items-center justify-center shrink-0">
                <Scroll className="w-6 h-6 text-[#22C55E]" />
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <div
                className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                  q.isGreatSummon ? 'text-amber-300' : 'text-[#22C55E]'
                }`}
              >
                {q.complexityLabel}
              </div>
              <h3 className="font-display text-base md:text-lg font-bold text-[#F4F4F6]">
                {q.contractName}
              </h3>
              <p className="text-xs text-[#8E8E9A] leading-relaxed">{q.description}</p>
            </div>
          </div>

          <div className="md:text-right font-mono text-xs tabular-nums shrink-0 space-y-1 bg-[#08080B] md:bg-transparent px-3 py-2 md:p-0 rounded-lg border border-[#24242E] md:border-0">
            <div className="text-[#E4E4EA]">Oferenda: {q.costRyo} Ryo</div>
            <div className="text-[#22C55E]">
              +{q.rewardXp} XP · +{q.rewardMerit} Mérito
            </div>
            <div className="text-[11px] text-[#8E8E9A]">
              Chefe: {q.bossName} (HP {q.bossHp})
            </div>
          </div>
        </div>

        {/* Stage 1 Prerequisites Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px] font-mono tabular-nums">
          <div className="px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
            <span className="text-[#8E8E9A]">Patente: </span>
            <span className="text-[#F4F4F6]">{q.minRank}+</span>
          </div>
          <div className="px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
            <span className="text-[#8E8E9A]">Nível: </span>
            <span className="text-[#F4F4F6]">{character.level}/{q.minLevel}</span>
          </div>
          <div className="px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
            <span className="text-[#8E8E9A]">Chakra: </span>
            <span className="text-[#F4F4F6]">{character.chakraLevel}/{q.minChakraLevel}</span>
          </div>
          <div className="px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
            <span className="text-[#8E8E9A]">Missões: </span>
            <span className="text-[#F4F4F6]">{character.missionsCompleted}/{q.minMissions}</span>
          </div>
          <div className="px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
            <span className="text-[#8E8E9A]">Mérito: </span>
            <span className="text-[#F4F4F6]">{character.meritPoints}/{q.minMerit}</span>
          </div>
          <div className="px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
            <span className="text-[#8E8E9A]">Etapa 2: </span>
            <span className={q.trialPassed ? 'text-[#22C55E]' : 'text-amber-300'}>
              {q.trialPassed ? 'Provação OK' : `${q.trialQuestions.length} Perguntas`}
            </span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-2 border-t border-[#24242E] flex flex-wrap items-center justify-between gap-3">
          {activeOwned ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22C55E]">
              <CheckCircle2 className="w-4 h-4" />
              Contrato de Invocação atualmente assinado por {character.name}.
            </div>
          ) : q.trialPassed ? (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="inline-flex items-center gap-1.5 text-xs text-[#22C55E] font-mono">
                <CheckCircle2 className="w-4 h-4" />
                Provação Sábia concluída · Derrote {q.bossName} para selar o pacto!
              </div>
              <button
                type="button"
                onClick={() => handleLaunchQuestDuel(q)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer font-mono tabular-nums"
              >
                <Swords className="w-3.5 h-3.5" />
                Iniciar Duelo Final vs {q.bossName} (-{getMissionStaminaCost(q.isGreatSummon ? 'S' : 'B', true)} STA)
              </button>
            </div>
          ) : q.eligibility.eligible ? (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <span className="text-xs text-[#E4E4EA]">
                Requisitos cumpridos! Passe na Provação de Selamento ({q.trialQuestions.length} questões, 100% exigido) e oferte {q.costRyo} Ryo.
              </span>
              <button
                type="button"
                onClick={() => setExpandedTrialQuestId(isExpanded ? null : q.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold cursor-pointer ${
                  q.isGreatSummon
                    ? 'bg-amber-400 hover:bg-amber-300 text-[#050505]'
                    : 'bg-[#10B981] hover:bg-[#22C55E] text-[#050505]'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                {isExpanded ? 'Fechar Provação' : 'Iniciar Provação da Quest'}
              </button>
            </div>
          ) : (
            <div className="w-full p-2.5 rounded bg-[#08080B] border border-[#24242E] text-[11px] text-[#F59E0B] flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Falta cumprir: {q.eligibility.unmetReasons.join(' · ')}</span>
            </div>
          )}
        </div>

        {/* Inline Stage 2 Trial Questions */}
        {isExpanded && !q.trialPassed && !activeOwned && (
          <div className="p-4 rounded-lg bg-[#08080B] border border-[#10B981] space-y-4">
            <div className="text-xs font-semibold text-[#22C55E]">
              Etapa 2 · Provação de Conhecimento & Energia Natural ({q.sanctuary})
            </div>
            {q.trialQuestions.map((tq, idx) => (
              <div key={tq.id} className="space-y-2">
                <div className="text-xs font-semibold text-[#F4F4F6]">
                  {idx + 1}. [{tq.topic}] {tq.prompt}
                </div>
                <div className="space-y-1.5">
                  {tq.options.map((opt, optIdx) => {
                    const selected = currentAnswers[tq.id] === optIdx;
                    return (
                      <label
                        key={`${tq.id}-${optIdx}`}
                        className={`flex items-start gap-2.5 p-2.5 rounded border text-xs cursor-pointer ${
                          selected
                            ? 'bg-[#121218] border-[#10B981] text-[#22C55E] font-semibold'
                            : 'bg-[#050505] border-[#24242E] text-[#8E8E9A] hover:text-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`${q.id}-${tq.id}`}
                          checked={selected}
                          onChange={() =>
                            setTrialAnswers((prev) => ({
                              ...prev,
                              [q.id]: { ...(prev[q.id] || {}), [tq.id]: optIdx },
                            }))
                          }
                          className="mt-0.5 accent-[#10B981]"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={!allAnswered || ritualBusyId === q.id}
              onClick={() => handleSubmitRitual(q)}
              className="px-4 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-45 text-[#050505] text-xs font-bold cursor-pointer"
            >
              {ritualBusyId === q.id
                ? 'Validando Provação...'
                : `Confirmar Provação & Ofertar ${q.costRyo} Ryo`}
            </button>
          </div>
        )}
      </article>
    );
  };

  const filteredMissions = useMemo(() => {
    const q = missionSearch.trim().toLowerCase();
    return boardMissions.filter((m) => {
      if (missionRankFilter !== 'Todas' && m.rank !== missionRankFilter) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.enemyName.toLowerCase().includes(q) ||
        m.enemyVillage.toLowerCase().includes(q) ||
        m.enemyNature.toLowerCase().includes(q)
      );
    });
  }, [boardMissions, missionRankFilter, missionSearch]);

  const filteredWarMissions = useMemo(() => {
    const q = missionSearch.trim().toLowerCase();
    return warMissions.filter((m) => {
      if (warRankFilter !== 'Todas' && m.rank !== warRankFilter) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.enemyName.toLowerCase().includes(q) ||
        m.enemyVillage.toLowerCase().includes(q) ||
        (m.warMeta?.frontName || '').toLowerCase().includes(q)
      );
    });
  }, [warMissions, warRankFilter, missionSearch]);

  const ownedElementsList = getOwnedElements(character);

  const renderJutsuQuestCard = (q: PublicJutsuQuest) => {
    const isExpanded = expandedJutsuQuestId === q.id;
    const currentAnswers = jutsuTrialAnswers[q.id] || {};
    const allAnswered = q.trialQuestions.every((tq) => currentAnswers[tq.id] !== undefined);
    const completed = q.eligibility.alreadyCompleted;
    const clanlessOk = isClanless(character.clan);
    const noKgOk = hasNoKekkeiGenkai(character.kekkeiGenkai);

    return (
      <article
        key={q.id}
        className={`rounded-xl border p-5 space-y-4 bg-[#0C0C10] ${
          q.requiresNoClan ? 'border-amber-500/50' : 'border-[#24242E]'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            {q.bossAvatar ? (
              <NinjaAvatar src={q.bossAvatar} alt={q.bossName} sizeClass="w-16 h-16" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-[#08080B] border border-[#10B981] flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6 text-[#22C55E]" />
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <div
                className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                  q.requiresNoClan ? 'text-amber-300' : 'text-[#22C55E]'
                }`}
              >
                {q.complexityLabel}
              </div>
              <h3 className="font-display text-base md:text-lg font-bold text-[#F4F4F6]">
                {q.title}
              </h3>
              <p className="text-xs text-[#8E8E9A] leading-relaxed">{q.description}</p>
              <div className="text-xs font-semibold text-[#22C55E] pt-0.5">
                Recompensa: {q.rewardLabel}
              </div>
            </div>
          </div>

          <div className="md:text-right font-mono text-xs tabular-nums shrink-0 space-y-1 bg-[#08080B] md:bg-transparent px-3 py-2 md:p-0 rounded-lg border border-[#24242E] md:border-0">
            <div className="text-[#E4E4EA]">Treino: {q.costRyo} Ryo</div>
            <div className="text-[#22C55E]">
              +{q.rewardXp} XP · +{q.rewardMerit} Mérito
            </div>
            <div className="text-[11px] text-[#8E8E9A]">
              Instrutor: {q.bossName} (HP {q.bossHp})
            </div>
          </div>
        </div>

        {/* Strict Lineage Restrictions for Eight Gates */}
        {q.requiresNoClan && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
            <div
              className={`px-3 py-2 rounded border ${
                clanlessOk
                  ? 'bg-[#08080B] border-[#10B981] text-[#22C55E]'
                  : 'bg-[#08080B] border-red-500/50 text-red-300'
              }`}
            >
              Requisito de Clã: Sem Clã (Independente) — Atual: {character.clan}
            </div>
            <div
              className={`px-3 py-2 rounded border ${
                noKgOk
                  ? 'bg-[#08080B] border-[#10B981] text-[#22C55E]'
                  : 'bg-[#08080B] border-red-500/50 text-red-300'
              }`}
            >
              Requisito de Linhagem: Sem Kekkei Genkai (Nenhum) — Atual: {character.kekkeiGenkai}
            </div>
          </div>
        )}

        {/* Stage 1 Prerequisites Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px] font-mono tabular-nums">
          <div className="px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
            <span className="text-[#8E8E9A]">Patente: </span>
            <span className="text-[#F4F4F6]">{q.minRank}+</span>
          </div>
          <div className="px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
            <span className="text-[#8E8E9A]">Nível: </span>
            <span className="text-[#F4F4F6]">
              {character.level}/{q.minLevel}
            </span>
          </div>
          <div className="px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
            <span className="text-[#8E8E9A]">Chakra: </span>
            <span className="text-[#F4F4F6]">
              {character.chakraLevel}/{q.minChakraLevel}
            </span>
          </div>
          <div className="px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
            <span className="text-[#8E8E9A]">Missões: </span>
            <span className="text-[#F4F4F6]">
              {character.missionsCompleted}/{q.minMissions}
            </span>
          </div>
          {q.minTaijutsu ? (
            <div className="px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
              <span className="text-[#8E8E9A]">Taijutsu: </span>
              <span className="text-[#F4F4F6]">
                {effStats.taijutsu}/{q.minTaijutsu}
              </span>
            </div>
          ) : (
            <div className="px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
              <span className="text-[#8E8E9A]">Ctrl. CH: </span>
              <span className="text-[#F4F4F6]">
                {effStats.controleChakra}/{q.minChakraControl || 14}
              </span>
            </div>
          )}
          <div className="px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
            <span className="text-[#8E8E9A]">Etapa 2: </span>
            <span className={q.trialPassed ? 'text-[#22C55E]' : 'text-amber-300'}>
              {q.trialPassed ? 'Provação OK' : `${q.trialQuestions.length} Perguntas`}
            </span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-2 border-t border-[#24242E] flex flex-wrap items-center justify-between gap-3">
          {completed ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22C55E]">
              <CheckCircle2 className="w-4 h-4" />
              Quest concluída por {character.name}!{' '}
              {q.grantsSecondElement &&
                character.secondaryChakraNature &&
                character.secondaryChakraNature !== 'Nenhum' &&
                `· 2º Elemento: ${character.secondaryChakraNature}`}
            </div>
          ) : q.trialPassed ? (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="inline-flex items-center gap-1.5 text-xs text-[#22C55E] font-mono">
                <CheckCircle2 className="w-4 h-4" />
                Provação concluída
                {q.selectedTargetElement ? ` (Alvo: ${q.selectedTargetElement})` : ''} · Derrote{' '}
                {q.bossName} para concluir!
              </div>
              <button
                type="button"
                onClick={() => handleLaunchJutsuQuestDuel(q)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer font-mono tabular-nums"
              >
                <Swords className="w-3.5 h-3.5" />
                Iniciar Duelo Final vs {q.bossName} (-{getMissionStaminaCost('A', true)} STA)
              </button>
            </div>
          ) : q.eligibility.eligible ? (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <span className="text-xs text-[#E4E4EA]">
                Requisitos cumpridos! Passe na Provação de Treinamento (100% exigido) e invista{' '}
                {q.costRyo} Ryo.
              </span>
              <button
                type="button"
                onClick={() => setExpandedJutsuQuestId(isExpanded ? null : q.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                {isExpanded ? 'Fechar Provação' : 'Iniciar Provação da Quest'}
              </button>
            </div>
          ) : (
            <div className="w-full p-2.5 rounded bg-[#08080B] border border-[#24242E] text-[11px] text-[#F59E0B] flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Falta cumprir: {q.eligibility.unmetReasons.join(' · ')}</span>
            </div>
          )}
        </div>

        {/* Inline Stage 2 Trial Questions (+ 2nd Element Selection) */}
        {isExpanded && !q.trialPassed && !completed && (
          <div className="p-4 rounded-lg bg-[#08080B] border border-[#10B981] space-y-4">
            <div className="text-xs font-semibold text-[#22C55E]">
              Etapa 2 · Provação Teórica & Domínio de Chakra ({q.title})
            </div>

            {q.grantsSecondElement && (
              <div className="p-3 rounded bg-[#050505] border border-[#24242E] space-y-2">
                <div className="text-xs font-semibold text-[#F4F4F6]">
                  Escolha seu 2º Elemento de Chakra (Primário atual: {character.chakraNature}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSecondElements.map((elem) => (
                    <button
                      key={elem}
                      type="button"
                      onClick={() => setSelectedSecondElement(elem)}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-semibold border cursor-pointer ${
                        selectedSecondElement === elem
                          ? 'bg-[#10B981] border-[#10B981] text-[#050505]'
                          : 'bg-[#08080B] border-[#24242E] text-[#8E8E9A] hover:text-white'
                      }`}
                    >
                      {elem}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {q.trialQuestions.map((tq, idx) => (
              <div key={tq.id} className="space-y-2">
                <div className="text-xs font-semibold text-[#F4F4F6]">
                  {idx + 1}. [{tq.topic}] {tq.prompt}
                </div>
                <div className="space-y-1.5">
                  {tq.options.map((opt, optIdx) => {
                    const selected = currentAnswers[tq.id] === optIdx;
                    return (
                      <label
                        key={`${tq.id}-${optIdx}`}
                        className={`flex items-start gap-2.5 p-2.5 rounded border text-xs cursor-pointer ${
                          selected
                            ? 'bg-[#121218] border-[#10B981] text-[#22C55E] font-semibold'
                            : 'bg-[#050505] border-[#24242E] text-[#8E8E9A] hover:text-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`${q.id}-${tq.id}`}
                          checked={selected}
                          onChange={() =>
                            setJutsuTrialAnswers((prev) => ({
                              ...prev,
                              [q.id]: { ...(prev[q.id] || {}), [tq.id]: optIdx },
                            }))
                          }
                          className="mt-0.5 accent-[#10B981]"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              type="button"
              disabled={
                !allAnswered ||
                (q.grantsSecondElement && !selectedSecondElement) ||
                jutsuRitualBusyId === q.id
              }
              onClick={() => handleSubmitJutsuRitual(q)}
              className="px-4 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-45 text-[#050505] text-xs font-bold cursor-pointer"
            >
              {jutsuRitualBusyId === q.id
                ? 'Validando Provação...'
                : `Confirmar Provação & Investir ${q.costRyo} Ryo`}
            </button>
          </div>
        )}
      </article>
    );
  };

  if (!inBattle) {
    const ownVillageMeta = VILLAGES.find((v) => v.name === ownVillage) || VILLAGES[0];
    const ownVillageBanner =
      getVillageImage(ownVillage) ||
      'https://static.wikia.nocookie.net/naruto/images/b/b1/Chunin_Examination_Arena.png/revision/latest/scale-to-width-down/800?cb=20120422120447';
    const staminaPct = Math.max(
      0,
      Math.min(100, Math.round((liveStamina.stamina / liveStamina.maxStamina) * 100))
    );

    return (
      <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-6 space-y-5">
        <div className="relative overflow-hidden bg-[#08080B] border border-[#24242E] rounded-xl p-6 min-h-[150px] flex flex-wrap items-end justify-between gap-4">
          <img
            src={ownVillageBanner}
            alt={`Quadro de Missões — ${ownVillage}`}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/90 to-[#050505]/50" />
          <div className="relative z-10">
            <div className="text-xs font-mono text-[#22C55E] mb-1">
              {ownVillageMeta.country} · Jurisdição Exclusiva de {ownVillage}
            </div>
            <h1 className="font-display text-xl md:text-2xl font-bold text-[#F4F4F6]">
              Quadro Oficial de Missões — {ownVillage}
            </h1>
            <p className="text-xs md:text-sm text-[#D4D4DC] mt-1 max-w-2xl">
              Você só pode executar o quadro de missões do seu próprio vilarejo ({ownVillage}), além das Missões da Guerra Ativa, Quests Especiais de Jutsus e Quests de Invocação.
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-end gap-2">
            <div className="font-mono text-xs tabular-nums text-[#22C55E]">
              Registro: {character.wins} Vitórias · {character.losses} Derrotas
            </div>
            {postMissionReport && (
              <button
                type="button"
                onClick={() => setShowPostMissionModal(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#10B981] bg-[#0B120E] px-3 py-1.5 text-xs font-semibold text-[#22C55E] hover:bg-[#10B981] hover:text-[#050505] transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5" />
                Ver Último Relatório Pós-Missão
              </button>
            )}
          </div>
        </div>

        {/* Painel de Stamina & Descanso Social Play-by-Forum */}
        <section className="rounded-xl border border-[#24242E] bg-[#0C0C10] p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#F4F4F6]">
                <Clock className="w-4 h-4 text-[#22C55E] shrink-0" />
                <span>Stamina de Operação Shinobi</span>
                <span aria-hidden="true" className="text-[#6E6E7A]">·</span>
                <span className="font-mono tabular-nums text-[#22C55E]">
                  STA {liveStamina.stamina}/{liveStamina.maxStamina}
                </span>
                <span aria-hidden="true" className="text-[#6E6E7A]">·</span>
                <span className="font-mono tabular-nums text-[#A1A1AA]">
                  {liveStamina.isFull
                    ? 'Fôlego Completo (+1 STA a cada 2 min)'
                    : `+1 STA em ${formatStaminaCountdown(liveStamina.secondsUntilNextPoint)} · Carga total em ${formatStaminaCountdown(liveStamina.secondsUntilFull)}`}
                </span>
              </div>
              <p className="text-xs text-[#8E8E9A] max-w-3xl">
                Cada missão consome Stamina por Rank (D: 18 · C: 24 · B: 30 · A: 38 · S: 45). A Stamina recupera exclusivamente pelo tempo (+1 a cada 2 min) para equilibrar a progressão e incentivar a interpretação entre jogadores nos intervalos.
              </p>
            </div>

            {onOpenVillageRp && (
              <button
                type="button"
                onClick={onOpenVillageRp}
                className="inline-flex items-center gap-2 rounded-md border border-[#10B981] bg-[#09120D] px-4 py-2 text-xs font-semibold text-[#22C55E] hover:bg-[#10B981] hover:text-[#050505] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Descansar & Interagir nos Locais RP de {ownVillage}
              </button>
            )}
          </div>

          <div className="h-2.5 w-full rounded-full bg-[#08080B] border border-[#1E1E26] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                liveStamina.stamina < 18
                  ? 'bg-amber-400'
                  : 'bg-[#10B981]'
              }`}
              style={{ width: `${staminaPct}%` }}
            />
          </div>

          {staminaAlert && (
            <div className="rounded-lg border border-amber-500/50 bg-[#141008] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{staminaAlert}</span>
              </div>
              {onOpenVillageRp && (
                <button
                  type="button"
                  onClick={onOpenVillageRp}
                  className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-[#050505] text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Ir aos Locais RP de {ownVillage}
                </button>
              )}
            </div>
          )}
        </section>

        {boardConflictBonus.bonusPct > 0 && boardConflictBonus.activeConflict && (
          <div className="rounded-xl border border-emerald-500/40 bg-[#09110D] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-emerald-400 flex flex-wrap items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>
                  Guerra Ativa em Curso: {boardConflictBonus.activeConflict.villageA} vs{' '}
                  {boardConflictBonus.activeConflict.villageB}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  +{boardConflictBonus.bonusPct}% Ryo & Mérito + Missões de Guerra Liberadas
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Teatro ativo: {boardConflictBonus.activeConflict.frontName} —{' '}
                {boardConflictBonus.activeConflict.summary}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setBoardTab('war_missions')}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#10B981] hover:bg-[#22C55E] px-3.5 py-2 text-xs font-bold text-[#050505] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Swords className="w-3.5 h-3.5" />
                Abrir Missões da Guerra ({warMissions.length})
              </button>
              {onOpenGeopolitics && (
                <button
                  type="button"
                  onClick={onOpenGeopolitics}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-[#0D1117] px-3.5 py-2 text-xs font-semibold text-zinc-100 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  Painel de Geopolítica
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sub-view Switcher: Own-Village Missions vs Active War Missions vs Jutsu Quests vs Summon Quests */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBoardTab('missions')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap ${
              boardTab === 'missions'
                ? 'bg-[#10B981] text-[#050505]'
                : 'bg-[#0C0C10] border border-[#24242E] text-[#8E8E9A] hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            Quadro de {ownVillage} ({boardMissions.length})
          </button>
          <button
            type="button"
            onClick={() => setBoardTab('war_missions')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap ${
              boardTab === 'war_missions'
                ? 'bg-[#10B981] text-[#050505]'
                : 'bg-[#0C0C10] border border-[#24242E] text-[#8E8E9A] hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Missões da Guerra ({warMissions.length})
          </button>
          <button
            type="button"
            onClick={() => setBoardTab('team_missions')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap ${
              boardTab === 'team_missions'
                ? 'bg-[#10B981] text-[#050505]'
                : 'bg-[#0C0C10] border border-[#24242E] text-[#8E8E9A] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Missões em Equipe (1+3)
          </button>
          <button
            type="button"
            onClick={() => setBoardTab('pvp')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap ${
              boardTab === 'pvp'
                ? 'bg-[#10B981] text-[#050505]'
                : 'bg-[#0C0C10] border border-[#24242E] text-[#8E8E9A] hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            Arena PvP (1v1)
          </button>
          <button
            type="button"
            onClick={() => setBoardTab('jutsu_quests')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap ${
              boardTab === 'jutsu_quests'
                ? 'bg-[#10B981] text-[#050505]'
                : 'bg-[#0C0C10] border border-[#24242E] text-[#8E8E9A] hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Quests Especiais de Jutsus ({jutsuQuests.length || 3})
          </button>
          <button
            type="button"
            onClick={() => setBoardTab('summon_quests')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap ${
              boardTab === 'summon_quests'
                ? 'bg-[#10B981] text-[#050505]'
                : 'bg-[#0C0C10] border border-[#24242E] text-[#8E8E9A] hover:text-white'
            }`}
          >
            <Scroll className="w-3.5 h-3.5" />
            Quests de Invocação (Kuchiyose)
          </button>
        </div>

        {boardTab === 'missions' ? (
          <div className="bg-[#0C0C10] border border-[#24242E] rounded-lg overflow-hidden">
            {/* Exclusive Own-Village Jurisdiction Header */}
            <div className="px-5 py-3.5 bg-[#09090D] border-b border-[#24242E] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                <span className="font-semibold text-[#F4F4F6]">
                  Quadro Exclusivo de {ownVillage} ({ownVillageMeta.country})
                </span>
                <span aria-hidden="true" className="text-[#6E6E7A]">·</span>
                <span className="text-[#8E8E9A]">
                  Restrito aos ninjas registrados em {ownVillage}
                </span>
              </div>
              <div className="text-[11px] font-mono tabular-nums text-[#22C55E]">
                Stamina atual: {liveStamina.stamina}/{liveStamina.maxStamina} STA
              </div>
            </div>

            <div className="px-5 py-3 bg-[#121218] border-b border-[#24242E] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['Todas', 'D', 'C', 'B', 'A', 'S'] as const).map((rankKey) => {
                  const count =
                    rankKey === 'Todas'
                      ? boardMissions.length
                      : boardMissions.filter((m) => m.rank === rankKey).length;
                  return (
                    <button
                      key={rankKey}
                      type="button"
                      onClick={() => setMissionRankFilter(rankKey)}
                      className={`px-3 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
                        missionRankFilter === rankKey
                          ? 'bg-[#10B981] text-[#050505] font-bold'
                          : 'bg-[#08080B] border border-[#24242E] text-[#8E8E9A] hover:text-white'
                      }`}
                    >
                      {rankKey === 'Todas' ? `Todas (${count})` : `Rank ${rankKey} (${count})`}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#8E8E9A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={missionSearch}
                  onChange={(e) => setMissionSearch(e.target.value)}
                  placeholder={`Buscar em ${ownVillage}...`}
                  className="w-full pl-8 pr-3 py-1.5 rounded bg-[#08080B] border border-[#24242E] focus:border-[#10B981] focus:outline-none text-xs text-white"
                />
              </div>
            </div>

            <div className="divide-y divide-[#1A1A22]">
              {loadingVillageBoard ? (
                <div className="p-8 text-center text-xs font-mono text-[#22C55E]">
                  Carregando quadro oficial de missões de {ownVillage}...
                </div>
              ) : filteredMissions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8E8E9A]">
                  Nenhuma missão encontrada para o filtro atual.
                </div>
              ) : (
                filteredMissions.map((m) => {
                  const staCost = m.staminaCost ?? getMissionStaminaCost(m.rank, false);
                  const enoughSta = liveStamina.stamina >= staCost;
                  const primaryMatchup = evaluateElementalAffinity({
                    attackNature: character.chakraNature,
                    attackerPrimaryNature: character.chakraNature,
                    attackerSecondaryNature: character.secondaryChakraNature,
                    defenderPrimaryNature: m.enemyNature,
                  });
                  const secondaryMatchup =
                    character.secondaryChakraNature &&
                    character.secondaryChakraNature !== 'Nenhum'
                      ? evaluateElementalAffinity({
                          attackNature: character.secondaryChakraNature,
                          attackerPrimaryNature: character.chakraNature,
                          attackerSecondaryNature: character.secondaryChakraNature,
                          defenderPrimaryNature: m.enemyNature,
                        })
                      : null;
                  const bestMatchup =
                    secondaryMatchup &&
                    secondaryMatchup.elementalMultiplier > primaryMatchup.elementalMultiplier
                      ? secondaryMatchup
                      : primaryMatchup;
                  return (
                    <div
                      key={m.id}
                      className="p-5 grid grid-cols-1 lg:grid-cols-12 items-center gap-4 hover:bg-[#121218]"
                    >
                      <div className="lg:col-span-6 flex items-start gap-3.5">
                        {m.enemyAvatar ? (
                          <NinjaAvatar src={m.enemyAvatar} alt={m.enemyName} sizeClass="w-12 h-12" />
                        ) : (
                          <span className="w-11 h-11 rounded bg-[#08080B] border border-[#10B981] flex items-center justify-center font-display font-bold text-sm text-[#22C55E] shrink-0">
                            {m.rank}
                          </span>
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-[#22C55E]">Rank {m.rank}</span>
                            <span aria-hidden="true" className="text-[#6E6E7A]">·</span>
                            <span className="font-mono text-[#A1A1AA]">{m.assignedVillage || ownVillage}</span>
                            <span aria-hidden="true" className="text-[#6E6E7A]">·</span>
                            <h2 className="text-sm font-semibold text-[#F4F4F6]">{m.title}</h2>
                          </div>
                          <p className="text-xs text-[#8E8E9A] mt-0.5">{m.briefing}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono tabular-nums text-[#E4E4EA] mt-1">
                            <span>
                              Alvo: {m.enemyName} ({m.enemyVillage} · Elemento {formatElementalLabel(m.enemyNature)}) · HP {m.scaledHp}
                            </span>
                            <span aria-hidden="true" className="text-[#6E6E7A]">·</span>
                            <span
                              className={
                                bestMatchup.relation === 'advantage'
                                  ? 'text-[#22C55E] font-semibold'
                                  : bestMatchup.relation === 'disadvantage'
                                  ? 'text-[#F87171] font-semibold'
                                  : 'text-[#8E8E9A]'
                              }
                            >
                              {bestMatchup.relation === 'advantage'
                                ? `Sua Afinidade ${formatElementalLabel(bestMatchup.attackElement)}: Vantagem ×${bestMatchup.elementalMultiplier.toFixed(2)}`
                                : bestMatchup.relation === 'disadvantage'
                                ? `Sua Afinidade ${formatElementalLabel(bestMatchup.attackElement)}: Desvantagem ×${bestMatchup.elementalMultiplier.toFixed(2)}`
                                : `Equilíbrio Elemental ×1.00`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-3 font-mono text-xs tabular-nums text-[#8E8E9A] space-y-0.5">
                        <div>
                          +{m.rewardXp} XP · +{m.rewardChakraXp} C-XP
                        </div>
                        <div className="text-[#22C55E]">
                          +{Math.round(m.rewardRyo * (1 + boardConflictBonus.bonusPct / 100))} Ryo · +
                          {Math.round(m.rewardMerit * (1 + boardConflictBonus.bonusPct / 100))} Mérito
                          {boardConflictBonus.bonusPct > 0 ? (
                            <span className="text-emerald-300"> (+{boardConflictBonus.bonusPct}%)</span>
                          ) : null}
                        </div>
                        <div className={`text-[11px] ${enoughSta ? 'text-zinc-400' : 'text-amber-300'}`}>
                          Custo: -{staCost} STA · Espólios & Itens Raros
                        </div>
                      </div>

                      <div className="lg:col-span-3 lg:text-right">
                        <button
                          type="button"
                          onClick={() => startBattle(m)}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-bold cursor-pointer font-mono tabular-nums whitespace-nowrap ${
                            enoughSta
                              ? 'bg-[#10B981] hover:bg-[#22C55E] text-[#050505]'
                              : 'bg-[#181820] hover:bg-[#22222E] border border-amber-500/45 text-amber-200'
                          }`}
                        >
                          <Swords className="w-3.5 h-3.5" />
                          {enoughSta
                            ? `Abrir Tópico (-${staCost} STA)`
                            : `Sem Stamina (${liveStamina.stamina}/${staCost} STA)`}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : boardTab === 'war_missions' ? (
          <div className="bg-[#0C0C10] border border-[#24242E] rounded-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#090E0B] border-b border-[#24242E] flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#22C55E]">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>Campanhas & Missões da Guerra Ativa</span>
                  <span aria-hidden="true" className="text-[#6E6E7A]">·</span>
                  <span className="font-mono tabular-nums text-[#E4E4EA]">
                    {warMissions.length} operação(ões) militar(es) em aberto
                  </span>
                </div>
                <p className="text-xs text-[#8E8E9A] max-w-3xl">
                  Operações geradas dinamicamente a partir das guerras ativas no mundo shinobi. Combata diretamente pelo seu vilarejo ({ownVillage}), apoie nações aliadas ou contenha incursões de fronteira com bônus de campanha em Ryo e Mérito.
                </p>
              </div>
              {onOpenGeopolitics && (
                <button
                  type="button"
                  onClick={onOpenGeopolitics}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#10B981] bg-[#08080B] px-3.5 py-2 text-xs font-semibold text-[#22C55E] hover:bg-[#10B981] hover:text-[#050505] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Ver Mapa Geopolítico
                </button>
              )}
            </div>

            <div className="px-5 py-3 bg-[#121218] border-b border-[#24242E] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['Todas', 'C', 'B', 'A', 'S'] as const).map((rankKey) => {
                  const count =
                    rankKey === 'Todas'
                      ? warMissions.length
                      : warMissions.filter((m) => m.rank === rankKey).length;
                  return (
                    <button
                      key={rankKey}
                      type="button"
                      onClick={() => setWarRankFilter(rankKey)}
                      className={`px-3 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
                        warRankFilter === rankKey
                          ? 'bg-[#10B981] text-[#050505] font-bold'
                          : 'bg-[#08080B] border border-[#24242E] text-[#8E8E9A] hover:text-white'
                      }`}
                    >
                      {rankKey === 'Todas' ? `Todas (${count})` : `Rank ${rankKey} (${count})`}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#8E8E9A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={missionSearch}
                  onChange={(e) => setMissionSearch(e.target.value)}
                  placeholder="Filtrar frente ou comandante..."
                  className="w-full pl-8 pr-3 py-1.5 rounded bg-[#08080B] border border-[#24242E] focus:border-[#10B981] focus:outline-none text-xs text-white"
                />
              </div>
            </div>

            <div className="divide-y divide-[#1A1A22]">
              {warMissions.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="text-sm font-semibold text-[#F4F4F6]">
                    Nenhum confronto armado ativo no continente shinobi
                  </div>
                  <p className="text-xs text-[#8E8E9A] max-w-lg mx-auto">
                    Todas as vilas encontram-se em armistício ou paz diplomática no momento. Consulte o Painel de Geopolítica para acompanhar tratados e tensões de fronteira.
                  </p>
                </div>
              ) : filteredWarMissions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8E8E9A]">
                  Nenhuma missão de guerra encontrada para o filtro selecionado.
                </div>
              ) : (
                filteredWarMissions.map((wm) => {
                  const staCost = wm.staminaCost ?? getMissionStaminaCost(wm.rank, true);
                  const enoughSta = liveStamina.stamina >= staCost;
                  const roleLabel =
                    wm.warMeta?.participationRole === 'belligerent'
                      ? 'Guerra Direta'
                      : wm.warMeta?.participationRole === 'ally'
                      ? 'Reforço Aliado'
                      : 'Contenção de Guerra';
                  return (
                    <div
                      key={wm.id}
                      className="p-5 grid grid-cols-1 lg:grid-cols-12 items-center gap-4 hover:bg-[#121218]"
                    >
                      <div className="lg:col-span-6 flex items-start gap-3.5">
                        {wm.enemyAvatar ? (
                          <NinjaAvatar src={wm.enemyAvatar} alt={wm.enemyName} sizeClass="w-12 h-12" />
                        ) : (
                          <span className="w-11 h-11 rounded bg-[#08080B] border border-[#10B981] flex items-center justify-center font-display font-bold text-sm text-[#22C55E] shrink-0">
                            {wm.rank}
                          </span>
                        )}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
                            <span className="font-bold text-[#22C55E]">Rank {wm.rank}</span>
                            <span aria-hidden="true" className="text-[#6E6E7A]">·</span>
                            <span className="text-amber-300 font-semibold">{roleLabel}</span>
                            {wm.warMeta && (
                              <>
                                <span aria-hidden="true" className="text-[#6E6E7A]">·</span>
                                <span className="text-[#A1A1AA]">
                                  {wm.warMeta.belligerentA} vs {wm.warMeta.belligerentB} (Intensidade {wm.warMeta.intensity}%)
                                </span>
                              </>
                            )}
                          </div>
                          <h2 className="text-sm font-semibold text-[#F4F4F6]">{wm.title}</h2>
                          <p className="text-xs text-[#8E8E9A] leading-relaxed">{wm.briefing}</p>
                          <div className="text-[11px] font-mono tabular-nums text-[#E4E4EA]">
                            Comandante Inimigo: {wm.enemyName} ({wm.enemyVillage} · {formatElementalLabel(wm.enemyNature)}) · HP {wm.scaledHp}
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-3 font-mono text-xs tabular-nums text-[#8E8E9A] space-y-0.5">
                        <div>
                          +{wm.rewardXp} XP · +{wm.rewardChakraXp} C-XP
                        </div>
                        <div className="text-[#22C55E]">
                          +{wm.rewardRyo} Ryo · +{wm.rewardMerit} Mérito
                          {wm.warMeta && (
                            <span className="text-emerald-300">
                              {' '}(+{wm.warMeta.warBonusRyoPct}% Bônus)
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] ${enoughSta ? 'text-zinc-400' : 'text-amber-300'}`}>
                          Custo de Campanha: -{staCost} STA
                        </div>
                      </div>

                      <div className="lg:col-span-3 lg:text-right">
                        <button
                          type="button"
                          onClick={() => startBattle(wm)}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-bold cursor-pointer font-mono tabular-nums whitespace-nowrap ${
                            enoughSta
                              ? 'bg-[#10B981] hover:bg-[#22C55E] text-[#050505]'
                              : 'bg-[#181820] hover:bg-[#22222E] border border-amber-500/45 text-amber-200'
                          }`}
                        >
                          <Swords className="w-3.5 h-3.5" />
                          {enoughSta
                            ? `Combater na Guerra (-${staCost} STA)`
                            : `Sem Stamina (${liveStamina.stamina}/${staCost} STA)`}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : boardTab === 'jutsu_quests' ? (
          <div className="space-y-5">
            <div className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-5 space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-[#22C55E]">
                <Flame className="w-4 h-4" />
                <span>
                  ELEMENTOS ATIVOS: {ownedElementsList.join(' · ')} · CLÃ: {character.clan} · KEKKEI: {character.kekkeiGenkai}
                </span>
              </div>
              <p className="text-xs text-[#8E8E9A] max-w-3xl">
                Quests Especiais de Treinamento para desbloquear habilidades únicas: 2º Elemento de Chakra, Rasengan e os Portões de Chakra (Hachimon Tonkou — exclusivo para shinobis sem Clã e sem Kekkei Genkai).
              </p>
            </div>

            {jutsuQuestFeedback && (
              <div
                className={`px-4 py-2.5 rounded-md border text-xs ${
                  jutsuQuestFeedback.ok
                    ? 'bg-[#0C0C10] border-[#10B981] text-[#F4F4F6]'
                    : 'bg-[#0C0C10] border-red-500/50 text-red-200'
                }`}
              >
                {jutsuQuestFeedback.text}
              </div>
            )}

            {loadingJutsuQuests && jutsuQuests.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8E8E9A] bg-[#0C0C10] rounded-lg border border-[#24242E]">
                Carregando Quests Especiais de Jutsus...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">{jutsuQuests.map(renderJutsuQuestCard)}</div>
            )}
          </div>
        ) : boardTab === 'summon_quests' ? (
          <div className="space-y-6">
            <div className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-[#22C55E]">
                  <Award className="w-4 h-4" />
                  <span>CONTRATO ATIVO: {character.summonContract || 'Nenhum'}</span>
                </div>
                <p className="text-xs text-[#8E8E9A] max-w-3xl">
                  Não é possível escolher invocação na criação de personagem. Para conquistar qualquer contrato é obrigatório cumprir os requisitos, concluir a Provação de Selamento e derrotar o Guardião. Os Três Grandes Sábios (Sapos, Lesmas e Cobras) exigem uma Quest Sábia extrema de 3 etapas!
                </p>
              </div>
            </div>

            {questFeedback && (
              <div
                className={`px-4 py-2.5 rounded-md border text-xs ${
                  questFeedback.ok
                    ? 'bg-[#0C0C10] border-[#10B981] text-[#F4F4F6]'
                    : 'bg-[#0C0C10] border-red-500/50 text-red-200'
                }`}
              >
                {questFeedback.text}
              </div>
            )}

            {loadingQuests && summonQuests.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8E8E9A] bg-[#0C0C10] rounded-lg border border-[#24242E]">
                Carregando santuários de invocação...
              </div>
            ) : (
              <>
                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-amber-500/30 pb-2">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <h2 className="font-display text-base md:text-lg font-bold text-amber-200">
                      Os Três Grandes Contratos Sábios (Sapos · Lesmas · Cobras — Quest Complexa)
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {greatSageQuests.map(renderQuestCard)}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-[#24242E] pb-2">
                    <Scroll className="w-4 h-4 text-[#22C55E]" />
                    <h2 className="font-display text-base md:text-lg font-bold text-[#F4F4F6]">
                      Contratos de Invocação Padrão (Quest Especial)
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {standardQuests.map(renderQuestCard)}
                  </div>
                </section>
              </>
            )}
          </div>
        ) : boardTab === 'team_missions' ? (
          <TeamMissionView
            character={character}
            customJutsus={customJutsus}
            socket={socket}
            onOpenTeamsTab={onOpenTeamsTab}
            onMissionSettled={onCombatFinished}
          />
        ) : (
          <PvpArenaView
            character={character}
            customJutsus={customJutsus}
            socket={socket}
            initialOpponentId={initialPvpOpponentId}
            onPvpFinished={onCombatFinished}
          />
        )}

        <PostMissionReportModal
          report={showPostMissionModal ? postMissionReport : null}
          onClose={() => setShowPostMissionModal(false)}
          onOpenArsenal={onOpenArsenal}
          onOpenVillageRp={onOpenVillageRp}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-5">
      {/* Battle Thread Header */}
      <div className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24242E] pb-3">
          <div>
            <div className="text-xs text-[#22C55E] font-mono tabular-nums">
              {activeQuestBattle
                ? 'Quest de Invocação'
                : activeJutsuQuestBattle
                ? 'Quest Especial de Jutsu'
                : 'Tópico de Combate por Turnos'}{' '}
              · Turno {turnNumber} · Rank {activeMission.rank}
            </div>
            <h1 className="font-display text-xl font-bold text-[#F4F4F6]">
              {activeMission.title}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setInBattle(false);
              setActiveQuestBattle(null);
              setActiveJutsuQuestBattle(null);
            }}
            className="px-3.5 py-1.5 rounded bg-[#08080B] hover:border-[#10B981] border border-[#24242E] text-xs text-[#F4F4F6] cursor-pointer"
          >
            {activeQuestBattle
              ? 'Voltar às Quests de Invocação'
              : activeJutsuQuestBattle
              ? 'Voltar às Quests de Jutsus'
              : 'Voltar ao Quadro de Missões'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded bg-[#08080B] border border-[#10B981] space-y-2.5">
            <div className="flex items-center gap-3">
              <NinjaAvatar src={character.avatarUrl} alt={character.name} sizeClass="w-12 h-12" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="truncate">{character.name}</span>
                  <span className="font-mono tabular-nums text-[#E4E4EA] shrink-0">
                    HP {playerHp}/{combatEffStats.maxHp} · CH {playerChakra}/{combatEffStats.maxChakra}
                  </span>
                </div>
                <div className="h-2 bg-[#121218] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#10B981] transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.round((playerHp / combatEffStats.maxHp) * 100))}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono tabular-nums text-[#8E8E9A]">
                  <span>
                    Afinidade: <strong className="text-[#22C55E]">{formatElementalLabel(character.chakraNature)}</strong>
                    {character.secondaryChakraNature && character.secondaryChakraNature !== 'Nenhum' && (
                      <>
                        {' '}+ <strong className="text-sky-300">{formatElementalLabel(character.secondaryChakraNature)}</strong>
                      </>
                    )}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Ressonância +10% Dano</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-300">
                    Clã {activeClanBonuses.clanName}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Active Clan Bonuses & Live Combat Stats */}
            <div className="pt-2 border-t border-[#1E1E26] space-y-2" data-testid="combat-clan-bonuses">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono tabular-nums">
                <span className="text-[#22C55E] font-bold uppercase tracking-wider">
                  Clã {activeClanBonuses.clanName} & Atributos em Combate
                </span>
                <span className="text-[#A1A1AA]">
                  Prec +{combatEffStats.accuracyBonus || 0}% · Esq{' '}
                  {(combatEffStats.evasionBonus || 0) + (playerTerrain === 'tree' ? 10 : 0) >= 0 ? '+' : ''}
                  {(combatEffStats.evasionBonus || 0) + (playerTerrain === 'tree' ? 10 : 0)}% · Crít +{combatEffStats.critBonus || 0}%
                  {(combatEffStats.chakraCostReduction || 0) > 0
                    ? ` · -${Math.round((combatEffStats.chakraCostReduction || 0) * 100)}% CH`
                    : ''}
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-[10px] font-mono tabular-nums">
                {(
                  [
                    ['NIN', 'ninjutsu'],
                    ['TAI', 'taijutsu'],
                    ['GEN', 'genjutsu'],
                    ['VEL', 'velocidade'],
                    ['FOR', 'forca'],
                    ['RES', 'resistencia'],
                    ['CON', 'controleChakra'],
                  ] as const
                ).map(([abbr, statKey]) => {
                  const val = combatEffStats[statKey];
                  const delta = val - character[statKey];
                  const clanPart = activeClanBonuses.attributeBoosts[statKey] || 0;
                  return (
                    <div
                      key={statKey}
                      title={
                        clanPart > 0
                          ? `Base ${character[statKey]} + Clã ${clanPart}${delta - clanPart > 0 ? ` + Outros ${delta - clanPart}` : ''}`
                          : `Base ${character[statKey]}${delta > 0 ? ` + Bônus ${delta}` : ''}`
                      }
                      className={`px-1.5 py-1 rounded border text-center ${
                        clanPart > 0
                          ? 'bg-[#0B1711] border-[#10B981]/50 text-[#F4F4F6]'
                          : 'bg-[#0C0C10] border-[#1E1E26] text-[#D4D4DC]'
                      }`}
                    >
                      <div className="text-[9px] text-[#8E8E9A]">{abbr}</div>
                      <div className="font-bold">
                        {val}
                        {delta > 0 && <span className="text-[#22C55E] ml-0.5">+{delta}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeClanBonuses.summaryChips.map((chip) => (
                  <span
                    key={chip}
                    className="px-2 py-0.5 rounded bg-[#0C0C10] border border-[#10B981]/40 text-[10px] font-mono tabular-nums text-[#E4E4EA]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            {playerStatuses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {playerStatuses.map((st) => {
                  const meta = STATUS_EFFECT_META[st.type];
                  return (
                    <span
                      key={st.type}
                      title={meta?.summary}
                      className={`px-2 py-0.5 rounded border text-[11px] font-mono tabular-nums ${getToneClasses(meta?.tone)}`}
                    >
                      {st.label} ({st.turnsRemaining}t)
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded bg-[#08080B] border border-red-500/45 space-y-2.5">
            <div className="flex items-center gap-3">
              <NinjaAvatar src={activeMission.enemyAvatar} alt={activeMission.enemyName} sizeClass="w-12 h-12" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="truncate">{activeMission.enemyName}</span>
                  <span className="font-mono tabular-nums text-[#EF4444] shrink-0">
                    HP {enemyHp}/{activeMission.scaledHp}
                  </span>
                </div>
                <div className="h-2 bg-[#121218] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#EF4444] transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.round((enemyHp / activeMission.scaledHp) * 100))}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono tabular-nums text-[#8E8E9A]">
                  <span>
                    Elemento Alvo: <strong className="text-red-300">{formatElementalLabel(activeMission.enemyNature)}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-300">
                    Vulnerável a {formatElementalLabel(getElementalCounterFor(activeMission.enemyNature))} (×1.25)
                  </span>
                </div>
              </div>
            </div>
            {enemyStatuses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {enemyStatuses.map((st) => {
                  const meta = STATUS_EFFECT_META[st.type];
                  return (
                    <span
                      key={st.type}
                      title={meta?.summary}
                      className={`px-2 py-0.5 rounded border text-[11px] font-mono tabular-nums ${getToneClasses(meta?.tone)}`}
                    >
                      {st.label} ({st.turnsRemaining}t)
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Painel Ocular de Combate: Ativação do Sharingan & Integridade dos Olhos */}
        {(sharinganStage >= 1 || ocularLive.leftBlindness > 0 || ocularLive.rightBlindness > 0) && (
          <div
            className={`rounded-lg border p-3.5 space-y-3 ${
              ocularLive.bothBlind
                ? 'bg-[#120A0A] border-red-500/50'
                : effectiveSharinganOn
                ? 'bg-[#09120D] border-[#10B981]'
                : 'bg-[#08080B] border-[#24242E]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <Eye
                    className={`w-4 h-4 shrink-0 ${
                      ocularLive.bothBlind
                        ? 'text-red-400'
                        : effectiveSharinganOn
                        ? 'text-[#22C55E]'
                        : 'text-[#8E8E9A]'
                    }`}
                  />
                  <span className="text-[#F4F4F6]">
                    {ocularLive.bothBlind
                      ? 'Sharingan Selado — Cegueira Ocular Total (100%)'
                      : effectiveSharinganOn
                      ? `${sharinganCfg.shortTitle} Ativo em Batalha`
                      : `${sharinganCfg.shortTitle} Inativo — Bônus Desligados`}
                  </span>
                  {!ocularLive.bothBlind && sharinganStage >= 1 && (
                    <>
                      <span aria-hidden="true" className="text-[#6E6E7A]">·</span>
                      <span
                        className={`font-mono tabular-nums text-[11px] ${
                          effectiveSharinganOn ? 'text-[#22C55E]' : 'text-[#8E8E9A]'
                        }`}
                      >
                        {effectiveSharinganOn
                          ? sharinganCfg.bonusBadge
                          : 'Ative no seu turno para liberar precisão, esquiva, crítico e técnicas oculares'}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-[#A1A1AA]">
                  Estado visual: <strong className="text-[#E4E4EA]">{ocularLive.visionLabel}</strong>
                  {(ocularLive.accuracyPenalty > 0 || ocularLive.evasionPenalty > 0) && (
                    <span className="text-red-300">
                      {' '}· Penalidade Ocular: -{ocularLive.accuracyPenalty}% Precisão
                      {ocularLive.evasionPenalty > 0 ? ` · -${ocularLive.evasionPenalty}% Esquiva` : ''}
                    </span>
                  )}
                </div>
              </div>

              {sharinganStage >= 1 && (
                <button
                  type="button"
                  disabled={
                    turnBusy ||
                    !!outcome ||
                    ocularLive.bothBlind ||
                    (!effectiveSharinganOn && playerChakra < sharinganCfg.activationChakra)
                  }
                  onClick={handleToggleSharingan}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-bold font-mono tabular-nums cursor-pointer whitespace-nowrap disabled:opacity-45 ${
                    effectiveSharinganOn
                      ? 'bg-[#121218] hover:bg-[#1A1A24] border border-[#10B981] text-[#22C55E]'
                      : 'bg-[#10B981] hover:bg-[#22C55E] text-[#050505]'
                  }`}
                >
                  {effectiveSharinganOn ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Desativar Sharingan (-{sharinganCfg.upkeepChakra} CH/turno)
                    </>
                  ) : ocularLive.bothBlind ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      Sharingan Selado (Cegueira 100%)
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Ativar {sharinganCfg.shortTitle} (-{sharinganCfg.activationChakra} CH · -{sharinganCfg.upkeepChakra} CH/t)
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono tabular-nums">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[#D4D4DC]">
                  <span>Olho Esquerdo</span>
                  <span className={ocularLive.leftSealed ? 'text-red-400 font-bold' : 'text-[#22C55E]'}>
                    {ocularLive.leftSealed
                      ? 'CEGO (0% Luz · 100% Cegueira)'
                      : `${ocularLive.leftLightPct}% Luz (${ocularLive.leftBlindness}% Cegueira)`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#121218] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      ocularLive.leftSealed
                        ? 'bg-red-500'
                        : ocularLive.leftBlindness >= 50
                        ? 'bg-amber-400'
                        : 'bg-[#10B981]'
                    }`}
                    style={{ width: `${ocularLive.leftLightPct}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[#D4D4DC]">
                  <span>Olho Direito</span>
                  <span className={ocularLive.rightSealed ? 'text-red-400 font-bold' : 'text-[#22C55E]'}>
                    {ocularLive.rightSealed
                      ? 'CEGO (0% Luz · 100% Cegueira)'
                      : `${ocularLive.rightLightPct}% Luz (${ocularLive.rightBlindness}% Cegueira)`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#121218] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      ocularLive.rightSealed
                        ? 'bg-red-500'
                        : ocularLive.rightBlindness >= 50
                        ? 'bg-amber-400'
                        : 'bg-[#10B981]'
                    }`}
                    style={{ width: `${ocularLive.rightLightPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Elemental Affinity Cycle Strip */}
        <div className="rounded bg-[#08080B] border border-[#24242E] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono tabular-nums">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#8E8E9A] mr-1">Ciclo Elemental:</span>
            {FIVE_ELEMENTAL_AFFINITIES.map((elem, idx) => {
              const meta = ELEMENTAL_AFFINITY_CYCLE[elem];
              const isPlayerOwned = ownedElementsList.some(
                (owned) => normalizeElementalNature(owned) === elem
              );
              const isEnemyElem = normalizeElementalNature(activeMission.enemyNature) === elem;
              const isCounterToEnemy = getElementalCounterFor(activeMission.enemyNature) === elem;
              return (
                <React.Fragment key={elem}>
                  <span
                    title={`${meta.displayLabel} vence ${ELEMENTAL_AFFINITY_CYCLE[meta.strongAgainst].shortLabel} (×1.25) e cede a ${ELEMENTAL_AFFINITY_CYCLE[meta.weakAgainst].shortLabel} (×0.85)`}
                    className={`px-2 py-0.5 rounded border whitespace-nowrap ${
                      isCounterToEnemy && isPlayerOwned
                        ? 'bg-[#10B981] border-[#10B981] text-[#050505] font-bold'
                        : isEnemyElem
                        ? 'bg-[#121218] border-red-500/60 text-red-200 font-bold'
                        : isPlayerOwned
                        ? 'bg-[#121218] border-[#10B981] text-[#22C55E] font-semibold'
                        : 'bg-[#050505] border-[#24242E] text-[#8E8E9A]'
                    }`}
                  >
                    {meta.shortLabel}
                    {isPlayerOwned ? ' (Você)' : ''}
                    {isEnemyElem ? ' (Alvo)' : ''}
                  </span>
                  <span className="text-[#6E6E7A]" aria-hidden="true">
                    {idx < FIVE_ELEMENTAL_AFFINITIES.length - 1 ? '>' : '> Katon'}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
          <div className="text-[#8E8E9A] whitespace-nowrap">
            Vantagem <strong className="text-[#22C55E]">×1.25</strong> · Desvantagem{' '}
            <strong className="text-[#F87171]">×0.85</strong> · Afinidade{' '}
            <strong className="text-sky-300">+10%</strong>
          </div>
        </div>
      </div>

      {/* Tabletop 2-Column Combat Split: Arena & Actions (Left) + Battle Log Side Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 space-y-5">
      {/* Interactive 7x5 Tactical RPG Combat Grid */}
      <section className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24242E] pb-3">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#22C55E]">
              <Crosshair className="w-4 h-4" />
              <span>GRID TÁTICO DE COMBATE (7×5 CASAS)</span>
            </div>
            <p className="text-xs text-[#8E8E9A]">
              Clique nas casas verdes destacadas para mover seu shinobi ({moveRemaining} passos neste turno). Posição, alcance e cobertura definem seus golpes e Ações Secretas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
            <span className="px-2.5 py-1 rounded bg-[#08080B] border border-[#24242E] text-[#F4F4F6]">
              Distância: <strong className="text-[#22C55E]">{gridDistance}</strong> casa(s)
            </span>
            <span className="px-2.5 py-1 rounded bg-[#08080B] border border-[#10B981] text-[#E4E4EA]">
              Movimento: <strong className="text-[#22C55E]">{moveRemaining}</strong> passo(s)
            </span>
            {playerTerrain === 'tree' && (
              <span className="px-2.5 py-1 rounded bg-[#08080B] border border-[#10B981] text-[#22C55E]">
                Cobertura Árvore (+10% Esquiva)
              </span>
            )}
            {enemyTerrain === 'water' && (
              <span className="px-2.5 py-1 rounded bg-sky-950/60 border border-sky-400/45 text-sky-200">
                Alvo na Água (+Raiton)
              </span>
            )}
          </div>
        </div>

        {/* Visual Perception & Secret Action Banner */}
        <div
          className={`px-3.5 py-2.5 rounded-md border text-xs flex flex-wrap items-center justify-between gap-2 ${
            secretActionStatus.enemySeesThrough
              ? 'bg-[#08080B] border-amber-500/50 text-amber-200'
              : secretActionStatus.allowed
              ? 'bg-[#08080B] border-[#10B981] text-[#22C55E]'
              : 'bg-[#08080B] border-[#24242E] text-[#8E8E9A]'
          }`}
        >
          <div className="inline-flex items-center gap-2">
            {secretActionStatus.enemySeesThrough ? (
              <Eye className="w-4 h-4 shrink-0 text-amber-300" />
            ) : secretActionStatus.allowed ? (
              <EyeOff className="w-4 h-4 shrink-0 text-[#22C55E]" />
            ) : (
              <Eye className="w-4 h-4 shrink-0 text-[#8E8E9A]" />
            )}
            <span>{secretActionStatus.reason}</span>
          </div>
          {preparedSecret && secretActionStatus.allowed && (
            <span className="font-mono text-[11px] font-bold text-amber-300">
              Preparada: {preparedSecret.name} (+35% Dano)
            </span>
          )}
        </div>

        {/* 7x5 Tactical Square Grid */}
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[540px] grid grid-cols-7 gap-1.5 bg-[#050505] p-2.5 rounded-lg border border-[#24242E]">
            {tacticalGrid.terrain.map((row, y) =>
              row.map((cellTerrain, x) => {
                const isPlayer = tacticalGrid.playerPos.x === x && tacticalGrid.playerPos.y === y;
                const isEnemy = tacticalGrid.enemyPos.x === x && tacticalGrid.enemyPos.y === y;
                const cloud = tacticalGrid.clouds[`${x},${y}`];
                const canMoveHere =
                  !turnBusy &&
                  !outcome &&
                  canMoveToTile(
                    tacticalGrid,
                    tacticalGrid.playerPos,
                    { x, y },
                    moveRemaining,
                    tacticalGrid.enemyPos
                  );
                const coordLabel = `${String.fromCharCode(65 + x)}${y + 1}`;
                const cloudLabel =
                  cloud?.kind === 'smoke'
                    ? `Fumaça ${cloud.turnsRemaining}t`
                    : cloud?.kind === 'soot'
                    ? `Fuligem ${cloud.turnsRemaining}t`
                    : cloud?.kind === 'mist'
                    ? `Névoa ${cloud.turnsRemaining}t`
                    : '';

                return (
                  <button
                    key={coordLabel}
                    type="button"
                    disabled={!canMoveHere}
                    onClick={() => handleMoveOnGrid({ x, y })}
                    aria-label={`Casa ${coordLabel}${isPlayer ? ' Jogador' : ''}${isEnemy ? ' Inimigo' : ''}${cloudLabel ? ` ${cloudLabel}` : ''}`}
                    className={`relative min-h-[58px] rounded border p-1.5 flex flex-col items-center justify-between text-[10px] font-mono transition-colors ${
                      isPlayer
                        ? 'bg-[#121218] border-2 border-[#10B981] text-[#F4F4F6]'
                        : isEnemy
                        ? 'bg-[#1A0A0B] border-2 border-[#EF4444] text-red-100'
                        : cellTerrain === 'rock'
                        ? 'bg-[#181820] border-[#2A2A36] text-[#8E8E9A] cursor-not-allowed'
                        : canMoveHere
                        ? 'bg-[#0C0C10] hover:bg-[#16161E] border-[#10B981] text-[#22C55E] cursor-pointer'
                        : cellTerrain === 'water'
                        ? 'bg-[#08121C] border-sky-500/30 text-sky-300 cursor-default'
                        : cellTerrain === 'tree'
                        ? 'bg-[#0C0C10] border-[#24242E] text-[#22C55E] cursor-default'
                        : 'bg-[#08080B] border-[#1E1E26] text-[#6E6E7A] cursor-default'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between text-[9px] leading-none opacity-80">
                      <span>{coordLabel}</span>
                      {cellTerrain === 'rock' && <Mountain className="w-3 h-3" />}
                      {cellTerrain === 'tree' && <Trees className="w-3 h-3" />}
                      {cellTerrain === 'water' && <Droplets className="w-3 h-3" />}
                    </div>

                    {isPlayer ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <NinjaAvatar src={character.avatarUrl} alt={character.name} sizeClass="w-6 h-6" />
                        <span className="text-[9px] font-bold text-[#22C55E]">VOCÊ</span>
                      </div>
                    ) : isEnemy ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <NinjaAvatar src={activeMission.enemyAvatar} alt={activeMission.enemyName} sizeClass="w-6 h-6" />
                        <span className="text-[9px] font-bold text-red-300">ALVO</span>
                      </div>
                    ) : cellTerrain === 'rock' ? (
                      <span className="text-[9px] text-[#8E8E9A]">Rocha</span>
                    ) : canMoveHere ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[#22C55E]">
                        <Footprints className="w-3 h-3" />
                        Mover
                      </span>
                    ) : (
                      <span className="text-[9px]">
                        {cellTerrain === 'water'
                          ? 'Água'
                          : cellTerrain === 'tree'
                          ? 'Árvore'
                          : 'Solo'}
                      </span>
                    )}

                    {cloud && (
                      <div
                        className={`w-full text-center px-1 py-0.5 rounded text-[8px] font-bold truncate ${
                          cloud.kind === 'smoke'
                            ? 'bg-zinc-600/80 text-white'
                            : cloud.kind === 'soot'
                            ? 'bg-orange-950/90 text-orange-200 border border-orange-500/40'
                            : 'bg-sky-950/90 text-sky-200 border border-sky-400/40'
                        }`}
                      >
                        {cloudLabel}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Forum-Style Turn Posts */}
      <div className="space-y-3">
        {battlePosts.map((bp) => (
          <article
            key={bp.id}
            className="bg-[#0C0C10] border border-[#24242E] rounded-lg grid grid-cols-1 md:grid-cols-12 overflow-hidden"
          >
            <aside className="md:col-span-3 bg-[#121218] border-b md:border-b-0 md:border-r border-[#24242E] p-4 flex items-center gap-3">
              <NinjaAvatar src={bp.authorAvatar} alt={bp.authorName} sizeClass="w-11 h-11" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#F4F4F6] truncate">{bp.authorName}</div>
                <div className="text-xs text-[#8E8E9A]">{bp.authorVillage} · Turno {bp.turn}</div>
              </div>
            </aside>
            <div className="md:col-span-9 p-4 space-y-2.5">
              <p className="text-sm text-[#E4E4EA] leading-relaxed">{bp.narration}</p>
              {bp.calc && (
                <div className="bg-[#08080B] border border-[#24242E] rounded p-2.5 text-xs font-mono tabular-nums space-y-1.5">
                  <div className="flex items-center gap-2 text-[#22C55E]">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{bp.calc.formulaSummary}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {bp.calc.isHit ? (
                      <>
                        <span className="text-[#22C55E]">
                          Resultado: ACERTO{bp.calc.isCrit ? ' CRÍTICO' : ''}
                        </span>
                        {bp.calc.damage > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-red-950/75 border border-red-500/50 text-red-400 font-bold">
                            DANO -{bp.calc.damage} HP
                          </span>
                        )}
                        {bp.calc.healing > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/75 border border-emerald-500/50 text-emerald-400 font-bold">
                            CURA +{bp.calc.healing} HP
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-red-400">Resultado: ATAQUE EVADIDO</span>
                    )}
                  </div>
                  {bp.calc.synergyNotes.length > 0 && (
                    <div className="text-amber-300 text-[11px]">
                      Sinergia: {bp.calc.synergyNotes.join(' · ')}
                    </div>
                  )}
                  {bp.calc.appliedEffects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {bp.calc.appliedEffects.map((fx, i) => {
                        const meta = STATUS_EFFECT_META[fx.type];
                        return (
                          <span
                            key={`${fx.type}-${i}`}
                            className={`px-2 py-0.5 rounded border text-[10px] ${getToneClasses(meta?.tone)}`}
                          >
                            {fx.target === 'self' ? 'Em si' : 'No alvo'}: {fx.label} ({fx.duration}t)
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {bp.statusLogs && bp.statusLogs.length > 0 && (
                <div className="bg-[#08080B] border border-[#24242E] rounded px-3 py-1.5 text-[11px] font-mono text-[#E4E4EA]">
                  Efeitos contínuos do turno: {bp.statusLogs.join(' · ')}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Turn Reply / Strategic Action Composer */}
      <div className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#22C55E]" />
            <h2 className="font-display text-sm font-bold text-[#F4F4F6]">
              Ações Táticas do Turno ({character.name})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {enemyIsSoaked && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-950/60 border border-sky-400/50 text-[11px] font-mono text-sky-200">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                Alvo Encharcado: Raiton +35% Dano
              </div>
            )}
            <button
              type="button"
              disabled={turnBusy || !!outcome}
              onClick={handleDefensiveStance}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#08080B] hover:border-[#22C55E] border border-[#10B981] text-xs font-semibold text-[#F4F4F6] cursor-pointer disabled:opacity-45"
            >
              <Shield className="w-3.5 h-3.5 text-[#22C55E]" />
              Postura Defensiva (+14 CH)
            </button>
          </div>
        </div>

        {playerIsStunned && (
          <div className="p-3 rounded bg-amber-950/40 border border-amber-400/50 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
            <span>Você está sob efeito de Atordoamento elétrico e perderá a próxima ação.</span>
            <button
              type="button"
              disabled={turnBusy || !!outcome}
              onClick={() => handlePassTurnOrControl()}
              className="px-3.5 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-[#050505] font-bold cursor-pointer"
            >
              Avançar Turno (Recuperar de Atordoamento)
            </button>
          </div>
        )}

        <input
          type="text"
          aria-label="Narração opcional do turno"
          value={customActionNote}
          onChange={(e) => setCustomActionNote(e.target.value)}
          placeholder="Opcional: descreva sua narração antes de executar o golpe, arma, ação secreta ou jutsu..."
          className="w-full px-3.5 py-2 rounded bg-[#08080B] border border-[#24242E] focus:border-[#10B981] focus:outline-none text-xs text-white"
        />

        {/* Strategic Category Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#24242E] pb-3">
          <button
            type="button"
            onClick={() => setActionTab('jutsus')}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold cursor-pointer ${
              actionTab === 'jutsus'
                ? 'bg-[#10B981] text-[#050505]'
                : 'bg-[#08080B] border border-[#24242E] text-[#8E8E9A] hover:text-white'
            }`}
          >
            Jutsus ({learnedJutsus.length})
          </button>
          <button
            type="button"
            onClick={() => setActionTab('melee')}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold cursor-pointer ${
              actionTab === 'melee'
                ? 'bg-[#10B981] text-[#050505]'
                : 'bg-[#08080B] border border-[#24242E] text-[#8E8E9A] hover:text-white'
            }`}
          >
            Socos & Chutes ({MELEE_STRIKES.length})
          </button>
          <button
            type="button"
            onClick={() => setActionTab('weapons')}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold cursor-pointer ${
              actionTab === 'weapons'
                ? 'bg-[#10B981] text-[#050505]'
                : 'bg-[#08080B] border border-[#24242E] text-[#8E8E9A] hover:text-white'
            }`}
          >
            Armas Ninjas ({availableNinjaWeapons.length})
          </button>
          <button
            type="button"
            onClick={() => setActionTab('secret')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold cursor-pointer ${
              actionTab === 'secret'
                ? 'bg-[#10B981] text-[#050505]'
                : 'bg-[#08080B] border border-[#24242E] text-[#8E8E9A] hover:text-white'
            }`}
          >
            <CloudFog className="w-3.5 h-3.5" />
            Ações Secretas ({secretActionStatus.allowed ? 'Liberadas' : 'Ocultação Necessária'})
          </button>
        </div>

        {/* Tab 1: Jutsus */}
        {actionTab === 'jutsus' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {learnedJutsus.map((j) => {
              const effectiveCost = getEffectiveJutsuChakraCost(j, combatEffStats);
              const range = getJutsuGridRange(j);
              const inRange = gridDistance >= range.minRange && gridDistance <= range.maxRange;
              const ocularGate = canUseOcularJutsuInCombat(j, effectiveSharinganOn, ocularLive);
              const isKinjutsuBlindness = isInstantBlindnessKinjutsu(j.id);
              const isMsStrain = !isKinjutsuBlindness && isMangekyouJutsu(j);
              const disabled =
                turnBusy ||
                !!outcome ||
                playerChakra < effectiveCost ||
                !inRange ||
                !ocularGate.allowed;
              const jutsuEffects = getEffectiveJutsuEffects(
                j,
                character.clan,
                character.kekkeiGenkai,
                effectiveSharinganOn
              );
              const normalizedJNature = normalizeElementalNature(j.nature);
              const hasSoakCombo =
                (enemyIsSoaked || enemyTerrain === 'water') && normalizedJNature === 'Raiton';
              const elemPreview = evaluateElementalAffinity({
                attackNature: j.nature,
                attackerPrimaryNature: character.chakraNature,
                attackerSecondaryNature: character.secondaryChakraNature,
                defenderPrimaryNature: activeMission.enemyNature,
              });
              const clanJutsuBoost = getClanJutsuBoostSummary(character.clan, combatEffStats, j);
              return (
                <button
                  key={j.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePassTurnOrControl(j)}
                  className={`text-left p-3 rounded bg-[#08080B] hover:bg-[#121218] border disabled:opacity-45 transition-colors cursor-pointer space-y-1.5 ${
                    isKinjutsuBlindness
                      ? 'border-red-500/60 hover:border-red-400'
                      : hasSoakCombo
                      ? 'border-amber-400/60'
                      : elemPreview.relation === 'advantage'
                      ? 'border-[#10B981] hover:border-[#22C55E]'
                      : 'border-[#24242E] hover:border-[#10B981]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#F4F4F6]">
                    <span className="truncate">{j.name}</span>
                    <span className="font-mono tabular-nums text-[#22C55E] shrink-0">
                      -{effectiveCost} CH
                      {effectiveCost < j.chakraCost && (
                        <span className="text-[10px] text-[#8E8E9A] line-through ml-1">
                          {j.chakraCost}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-[#8E8E9A]">
                    {j.category} · {formatElementalLabel(j.nature)} · Poder {j.basePower} · Alcance {range.minRange}–{range.maxRange}
                  </div>
                  {isKinjutsuBlindness && (
                    <div className="text-[10px] font-mono font-bold text-red-400">
                      SACRIFÍCIO OCULAR: Cegueira Instantânea 100% em 1 Olho
                    </div>
                  )}
                  {isMsStrain && (
                    <div className="text-[10px] font-mono font-semibold text-amber-300">
                      Mangekyou: Acumula Cegueira Progressiva por uso
                    </div>
                  )}
                  {!ocularGate.allowed && ocularGate.reason && (
                    <div className="text-[10px] font-mono text-amber-300">
                      {ocularGate.reason}
                    </div>
                  )}
                  {elemPreview.attackElement && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono tabular-nums">
                      <span
                        className={
                          elemPreview.relation === 'advantage'
                            ? 'text-[#22C55E] font-semibold'
                            : elemPreview.relation === 'disadvantage'
                            ? 'text-[#F87171] font-semibold'
                            : 'text-[#8E8E9A]'
                        }
                      >
                        {elemPreview.relation === 'advantage'
                          ? `Vantagem Elemental ×${elemPreview.elementalMultiplier.toFixed(2)}`
                          : elemPreview.relation === 'disadvantage'
                          ? `Desvantagem Elemental ×${elemPreview.elementalMultiplier.toFixed(2)}`
                          : `Elemento Neutro ×1.00`}
                      </span>
                      {elemPreview.affinityResonanceMultiplier > 1 && (
                        <span className="text-sky-300">
                          · Afinidade +{Math.round((elemPreview.affinityResonanceMultiplier - 1) * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                  {clanJutsuBoost.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[10px] font-mono tabular-nums text-[#22C55E] font-semibold">
                      {clanJutsuBoost.badges.map((b) => (
                        <span
                          key={b}
                          className="px-1.5 py-0.5 rounded bg-[#0C1D15] border border-[#10B981]/45"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                  {!inRange && (
                    <div className="text-[10px] font-mono text-amber-300">
                      Fora de alcance no grid (Distância atual: {gridDistance}, aproxime-se até {range.maxRange} casas)
                    </div>
                  )}
                  {hasSoakCombo && (
                    <div className="text-[10px] font-mono text-amber-300 font-semibold">
                      Combo Encharcado: +35% Dano · 2x Atordoamento
                    </div>
                  )}
                  {jutsuEffects.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {jutsuEffects.map((fx, idx) => {
                        const meta = STATUS_EFFECT_META[fx.type];
                        return (
                          <span
                            key={`${j.id}-${fx.type}-${idx}`}
                            title={meta?.summary}
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${getToneClasses(meta?.tone)}`}
                          >
                            {meta?.shortTag || fx.label} {fx.chance}%
                          </span>
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 2: Socos & Chutes */}
        {actionTab === 'melee' && (
          <div className="space-y-3">
            {gridDistance > 1 && (
              <div className="p-3 rounded bg-amber-950/35 border border-amber-500/40 text-xs text-amber-200">
                Socos e Chutes exigem distância corpo a corpo (<strong>1 casa</strong> no grid — atual: {gridDistance} casas). Clique em uma casa verde no grid acima para se aproximar do alvo!
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {MELEE_STRIKES.map((strike) => {
                const inRange = gridDistance >= strike.minRange && gridDistance <= strike.maxRange;
                const disabled = turnBusy || !!outcome || !inRange || playerChakra < strike.chakraCost;
                const taijutsuClanBoost = getClanJutsuBoostSummary(character.clan, combatEffStats, {
                  nature: 'Neutro',
                  category: 'Taijutsu',
                });
                return (
                  <button
                    key={strike.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleUseMeleeStrike(strike)}
                    className="text-left p-3.5 rounded bg-[#08080B] hover:bg-[#121218] border border-[#24242E] hover:border-[#10B981] disabled:opacity-45 space-y-1.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#F4F4F6]">
                      <span>{strike.name}</span>
                      <span className="font-mono text-[#22C55E]">
                        {strike.chakraCost === 0 ? '0 CH' : `-${strike.chakraCost} CH`}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-[#8E8E9A]">
                      Alcance {strike.minRange} casa · Poder {strike.basePower} · Prec +{strike.accuracyMod + (combatEffStats.accuracyBonus || 0)}% · Crít +{strike.critBonus + (combatEffStats.critBonus || 0)}%
                    </div>
                    {taijutsuClanBoost.damageBonusPct > 0 && (
                      <div className="text-[10px] font-mono font-semibold text-[#22C55E]">
                        Clã {character.clan}: +{taijutsuClanBoost.damageBonusPct}% Dano Taijutsu
                      </div>
                    )}
                    <p className="text-[11px] text-[#8E8E9A] leading-relaxed">{strike.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Armas Ninjas */}
        {actionTab === 'weapons' && (
          <div className="space-y-3">
            <div className="p-3 rounded bg-[#08080B] border border-[#24242E] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#8E8E9A]">
                Fluxo de Afinidade Elemental nas Armas (+4 CH · +6 Poder Base):
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setWeaponInfusionElement('none')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer whitespace-nowrap ${
                    weaponInfusionElement === 'none'
                      ? 'bg-[#10B981] text-[#050505] font-bold'
                      : 'bg-[#0C0C10] border border-[#24242E] text-[#8E8E9A] hover:text-white'
                  }`}
                >
                  Sem Fluxo (Neutro)
                </button>
                {ownedElementsList.map((el) => {
                  const canonical = normalizeElementalNature(el);
                  if (!canonical) return null;
                  const matchup = evaluateElementalAffinity({
                    attackNature: canonical,
                    attackerPrimaryNature: character.chakraNature,
                    attackerSecondaryNature: character.secondaryChakraNature,
                    defenderPrimaryNature: activeMission.enemyNature,
                  });
                  return (
                    <button
                      key={canonical}
                      type="button"
                      onClick={() => setWeaponInfusionElement(canonical)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer whitespace-nowrap ${
                        weaponInfusionElement === canonical
                          ? 'bg-[#10B981] text-[#050505] font-bold'
                          : 'bg-[#0C0C10] border border-[#10B981] text-[#F4F4F6] hover:border-[#22C55E]'
                      }`}
                    >
                      Infundir {formatElementalLabel(canonical)} (×{matchup.elementalMultiplier.toFixed(2)})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableNinjaWeapons.map((weapon) => {
                const inRange = gridDistance >= weapon.minRange && gridDistance <= weapon.maxRange;
                const canInfuse =
                  weapon.kind !== 'smoke_bomb' &&
                  !weapon.nature &&
                  weapon.kind !== 'explosive_tag' &&
                  weaponInfusionElement !== 'none';
                const totalCost = weapon.chakraCost + (canInfuse ? 4 : 0);
                const resolvedNature =
                  weapon.nature ||
                  (weapon.kind === 'explosive_tag'
                    ? 'Katon'
                    : canInfuse
                    ? weaponInfusionElement
                    : 'Neutro');
                const wpElemPreview = evaluateElementalAffinity({
                  attackNature: resolvedNature,
                  attackerPrimaryNature: character.chakraNature,
                  attackerSecondaryNature: character.secondaryChakraNature,
                  defenderPrimaryNature: activeMission.enemyNature,
                });
                const wpClanBoost = getClanJutsuBoostSummary(character.clan, combatEffStats, {
                  nature: resolvedNature,
                  category: 'Taijutsu',
                });
                const disabled = turnBusy || !!outcome || !inRange || playerChakra < totalCost;
                return (
                  <button
                    key={weapon.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleUseNinjaWeapon(weapon)}
                    className={`text-left p-3.5 rounded bg-[#08080B] hover:bg-[#121218] border disabled:opacity-45 space-y-1.5 cursor-pointer ${
                      wpElemPreview.relation === 'advantage'
                        ? 'border-[#10B981] hover:border-[#22C55E]'
                        : 'border-[#24242E] hover:border-[#10B981]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#F4F4F6]">
                      <span>{weapon.name}</span>
                      <span className="font-mono text-[#22C55E]">
                        {totalCost === 0 ? '0 CH' : `-${totalCost} CH`}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-[#8E8E9A]">
                      {formatElementalLabel(resolvedNature)} · Alcance {weapon.minRange}–{weapon.maxRange} casas · Poder {weapon.basePower + (canInfuse ? 6 : 0)}
                      {weapon.createsCloud === 'smoke' && ' · Cria Fumaça (3t)'}
                      {weapon.createsCloud === 'soot' && ' · Cria Fuligem (2t)'}
                    </div>
                    {wpElemPreview.attackElement && (
                      <div
                        className={`text-[10px] font-mono tabular-nums font-semibold ${
                          wpElemPreview.relation === 'advantage'
                            ? 'text-[#22C55E]'
                            : wpElemPreview.relation === 'disadvantage'
                            ? 'text-[#F87171]'
                            : 'text-[#8E8E9A]'
                        }`}
                      >
                        {wpElemPreview.relationLabel}
                      </div>
                    )}
                    {wpClanBoost.damageBonusPct > 0 && (
                      <div className="text-[10px] font-mono font-semibold text-[#22C55E]">
                        Clã {character.clan}: +{wpClanBoost.damageBonusPct}% Dano
                      </div>
                    )}
                    <p className="text-[11px] text-[#8E8E9A] leading-relaxed">{weapon.description}</p>
                    {!inRange && (
                      <div className="text-[10px] font-mono text-amber-300">
                        Fora de alcance no grid (Distância: {gridDistance})
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Ações Secretas */}
        {actionTab === 'secret' && (
          <div className="space-y-3">
            {!secretActionStatus.allowed && (
              <div className="p-3.5 rounded bg-amber-950/35 border border-amber-500/45 text-xs text-amber-200 flex items-start gap-2">
                <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
                <span>
                  {secretActionStatus.reason}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SECRET_ACTION_CATALOG.map((secret) => {
                const inRange = gridDistance >= secret.minRange && gridDistance <= secret.maxRange;
                const prepCost = Math.max(4, Math.floor(secret.chakraCost / 2));
                const canPrepare =
                  !turnBusy &&
                  !outcome &&
                  secretActionStatus.allowed &&
                  playerChakra >= prepCost;
                const canExecute =
                  !turnBusy &&
                  !outcome &&
                  secretActionStatus.allowed &&
                  inRange &&
                  playerChakra >= secret.chakraCost;
                const isPrepared = preparedSecret?.id === secret.id;

                return (
                  <div
                    key={secret.id}
                    className={`p-3.5 rounded border flex flex-col justify-between gap-3 ${
                      isPrepared
                        ? 'bg-[#121218] border-amber-400'
                        : 'bg-[#08080B] border-[#24242E]'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#F4F4F6]">
                        <span>{secret.name}</span>
                        <span className="font-mono text-[#22C55E]">-{secret.chakraCost} CH</span>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-[#8E8E9A]">
                        Alcance {secret.minRange}–{secret.maxRange} · Poder {secret.basePower} · Crít +{secret.critBonus}%
                      </div>
                      <p className="text-[11px] text-[#8E8E9A] leading-relaxed">{secret.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        disabled={!canPrepare}
                        onClick={() => handlePrepareSecretAction(secret)}
                        className="py-1.5 px-2.5 rounded bg-[#121218] hover:border-[#22C55E] border border-[#10B981] disabled:opacity-40 text-[11px] font-semibold text-[#22C55E] cursor-pointer"
                      >
                        {isPrepared ? 'Preparada!' : `Preparar (-${prepCost} CH)`}
                      </button>
                      <button
                        type="button"
                        disabled={!canExecute}
                        onClick={() => handleExecuteSecretAction(secret)}
                        className="py-1.5 px-2.5 rounded bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-40 text-[11px] font-bold text-[#050505] cursor-pointer"
                      >
                        Executar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {consumables.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#24242E]">
            <span className="text-xs text-[#8E8E9A]">Itens Rápidos:</span>
            {consumables.map(({ entry, def }) => {
              if (!def) return null;
              const usedCount = consumedInBattle.filter((x) => x === def.id).length;
              const remaining = entry.qty - usedCount;
              if (remaining <= 0) return null;
              return (
                <button
                  key={def.id}
                  type="button"
                  disabled={turnBusy || !!outcome}
                  onClick={() => handleUseConsumable(def.id)}
                  className="px-3 py-1.5 rounded bg-[#08080B] hover:border-[#22C55E] border border-[#10B981] text-xs text-[#F4F4F6] cursor-pointer"
                >
                  {def.name} ({remaining})
                </button>
              );
            })}
          </div>
        )}
      </div>
        </div>

        {/* Side Panel: Tabletop Battle Log */}
        <div className="lg:col-span-4 lg:sticky lg:top-20">
          <BattleLogPanel entries={battleLog} currentTurn={turnNumber} />
        </div>
      </div>

      <PostMissionReportModal
        report={showPostMissionModal ? postMissionReport : null}
        onClose={() => {
          setShowPostMissionModal(false);
          setOutcome(null);
          setInBattle(false);
          setActiveQuestBattle(null);
          setActiveJutsuQuestBattle(null);
        }}
        onOpenArsenal={() => {
          setShowPostMissionModal(false);
          setOutcome(null);
          setInBattle(false);
          setActiveQuestBattle(null);
          setActiveJutsuQuestBattle(null);
          onOpenArsenal?.();
        }}
        onOpenVillageRp={
          onOpenVillageRp
            ? () => {
                setShowPostMissionModal(false);
                setOutcome(null);
                setInBattle(false);
                setActiveQuestBattle(null);
                setActiveJutsuQuestBattle(null);
                onOpenVillageRp();
              }
            : undefined
        }
      />

      {outcome && !showPostMissionModal && !postMissionReport && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0C0C10] border border-[#10B981] rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="font-display text-xl font-bold text-[#F4F4F6]">
              {outcome.won ? 'Vitória em Combate' : 'Retirada Tática'}
            </h2>
            <p className="text-sm text-[#8E8E9A]">
              {outcome.won
                ? 'Missão encerrada com sucesso.'
                : 'Você recuou para a vila com experiência parcial de combate.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setOutcome(null);
                setInBattle(false);
                setActiveQuestBattle(null);
                setActiveJutsuQuestBattle(null);
              }}
              className="w-full py-2.5 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer"
            >
              Voltar ao Quadro de Missões
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
