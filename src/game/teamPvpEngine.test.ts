import assert from 'node:assert/strict';
import test from 'node:test';
import { CharacterModel, CombatCalculationResult, evaluateElementalAffinity } from './engine.ts';
import {
  attachPvpOpponent,
  buildInitialPvpState,
  buildInitialTeamMissionState,
  classifyCombatLogDelta,
  computeTeamSynergy,
  executeSparAiTurn,
  isSenseiEligibleRank,
  isStudentEligibleRank,
  parseStatusTickLine,
  resolvePvpAction,
  resolveTeamMissionMemberAction,
  scaleTeamMission,
  TEAM_MISSION_TEMPLATES,
  validateTeamSlotAddition,
} from './teamPvpEngine.ts';

function makeChar(overrides: Partial<CharacterModel> = {}): CharacterModel {
  return {
    id: 1,
    userUid: 'user:1',
    name: 'Shinobi Teste',
    avatarUrl: '',
    country: 'País do Fogo',
    village: 'Konohagakure',
    clan: 'Uchiha',
    specialization: 'Mestre em Ninjutsu Elemental',
    chakraNature: 'Katon',
    secondaryChakraNature: 'Nenhum',
    kekkeiGenkai: 'Sharingan (Nível 3)',
    summonContract: 'Nenhum',
    rank: 'Jounin Experiente',
    profession: 'Nenhuma',
    isKage: false,
    level: 9,
    xp: 0,
    chakraLevel: 4,
    chakraXp: 0,
    ryo: 3000,
    meritPoints: 500,
    statPoints: 0,
    hp: 360,
    maxHp: 360,
    chakra: 320,
    maxChakra: 320,
    stamina: 100,
    maxStamina: 100,
    leftEyeBlindness: 0,
    rightEyeBlindness: 0,
    ninjutsu: 24,
    taijutsu: 18,
    genjutsu: 18,
    velocidade: 20,
    forca: 16,
    inteligencia: 20,
    resistencia: 17,
    controleChakra: 21,
    learnedJutsus: ['bunshin', 'katon_goukakyuu', 'shousen_jutsu', 'chidori'],
    equippedGear: { weapon: 'kunai_tatica', armor: null, headband: null, accessory: null },
    inventory: [{ itemId: 'kit_medico', qty: 2 }],
    missionsCompleted: 10,
    wins: 5,
    losses: 1,
    bio: '',
    ...overrides,
  };
}

function makeCalc(damage: number, healing: number, isHit = true): CombatCalculationResult {
  return {
    hitChance: 90,
    rolled: 15,
    isHit,
    isEvaded: !isHit,
    isCrit: false,
    critChance: 10,
    critRolled: 50,
    damage,
    healing,
    elementalMultiplier: 1.0,
    affinityMultiplier: 1.0,
    clanDamageMultiplier: 1.0,
    elementalRelation: 'neutral',
    elementalBreakdown: evaluateElementalAffinity({ attackNature: 'Katon' }),
    appliedEffects: [],
    effectRolls: [],
    synergyNotes: [],
    formulaSummary: 'Precisão 90%',
  };
}

test('Combat Log Classifier separates damage (Red) from healing (Green) accurately', () => {
  const dmgEntry = classifyCombatLogDelta({
    calc: makeCalc(88, 0, true),
    statusTicks: ['Queimadura (-14 HP)', 'Tenketsu Selados (-18 CH)'],
  });
  assert.equal(dmgEntry.damageDealtToTarget, 88);
  assert.equal(dmgEntry.damageFromTicks, 14);
  assert.equal(dmgEntry.totalRedDamage, 102);
  assert.equal(dmgEntry.totalGreenHealing, 0);
  assert.equal(dmgEntry.tone, 'damage');

  const healEntry = classifyCombatLogDelta({
    calc: makeCalc(0, 72, true),
    statusTicks: ['Regeneração (+24 HP)'],
  });
  assert.equal(healEntry.healingDirect, 72);
  assert.equal(healEntry.healingFromTicks, 24);
  assert.equal(healEntry.totalGreenHealing, 96);
  assert.equal(healEntry.totalRedDamage, 0);
  assert.equal(healEntry.tone, 'heal');

  const itemFallback = classifyCombatLogDelta({
    actionMeta: '+120 HP',
    category: 'item',
  });
  assert.equal(itemFallback.totalGreenHealing, 120);
  assert.equal(itemFallback.tone, 'heal');

  const parsedNeg = parseStatusTickLine('Chamas Negras (-25 HP)');
  assert.equal(parsedNeg.kind, 'damage');
  assert.equal(parsedNeg.hpAmount, 25);
});

test('Team Slot Validation enforces canonical 1 Sensei + 3 Alunos structure', () => {
  assert.equal(isSenseiEligibleRank('Jounin Experiente'), true);
  assert.equal(isSenseiEligibleRank('Kage'), true);
  assert.equal(isSenseiEligibleRank('Genin'), false);
  assert.equal(isStudentEligibleRank('Genin'), true);
  assert.equal(isStudentEligibleRank('Chunin'), true);
  assert.equal(isStudentEligibleRank('Jounin Experiente'), false);

  const members: Array<{ characterId: number; role: 'sensei' | 'student'; slotIndex: number; status: 'active' | 'invited' }> = [
    { characterId: 10, role: 'sensei', slotIndex: 0, status: 'active' },
  ];

  // Second sensei must be rejected
  const secondSensei = validateTeamSlotAddition(members, { characterId: 11, rank: 'Kage', requestedRole: 'sensei' });
  assert.equal(secondSensei.allowed, false);

  // Add 3 students into slots 1, 2, 3
  for (let i = 1; i <= 3; i++) {
    const check = validateTeamSlotAddition(members, { characterId: 20 + i, rank: 'Genin', requestedRole: 'student' });
    assert.equal(check.allowed, true);
    assert.equal(check.slotIndex, i);
    members.push({ characterId: 20 + i, role: 'student', slotIndex: check.slotIndex, status: 'active' });
  }

  // 4th student must be rejected
  const fourthStudent = validateTeamSlotAddition(members, { characterId: 99, rank: 'Chunin', requestedRole: 'student' });
  assert.equal(fourthStudent.allowed, false);

  const synergy = computeTeamSynergy(
    members.map((m) => ({ ...m, characterVillage: 'Konohagakure' }))
  );
  assert.equal(synergy.isCanonicalFullCell, true);
  assert.equal(synergy.xpBonusPct >= 25, true);
  assert.equal(synergy.ryoBonusPct >= 20, true);
});

test('Team Co-Op Mission heals ally (Green log), combos boss (Red log), and advances rounds', () => {
  const sensei = makeChar({ id: 1, userUid: 'u1', name: 'Sensei Renjiro', rank: 'Jounin Experiente' });
  const studentA = makeChar({ id: 2, userUid: 'u2', name: 'Aluno Hana', rank: 'Genin', chakraNature: 'Fuuton', kekkeiGenkai: 'Nenhum', clan: 'Inuzuka' });
  const studentB = makeChar({ id: 3, userUid: 'u3', name: 'Aluna Yuna', rank: 'Genin', specialization: 'Ninja Médico (Iryou-Nin)', chakraNature: 'Suiton', kekkeiGenkai: 'Nenhum', clan: 'Yamanaka' });

  const synergy = computeTeamSynergy([
    { role: 'sensei', status: 'active', characterVillage: 'Konohagakure' },
    { role: 'student', status: 'active', characterVillage: 'Konohagakure' },
    { role: 'student', status: 'active', characterVillage: 'Konohagakure' },
  ]);
  const scaled = scaleTeamMission(TEAM_MISSION_TEMPLATES[0], 3, 5, synergy);

  let state = buildInitialTeamMissionState({
    teamId: 1,
    teamName: 'Time 7',
    synergy,
    mission: scaled,
    members: [
      { character: sensei, role: 'sensei', slotIndex: 0 },
      { character: studentA, role: 'student', slotIndex: 1 },
      { character: studentB, role: 'student', slotIndex: 2 },
    ],
  });

  // Damage sensei slightly to test heal_ally
  state.squad[0].hp = Math.max(50, state.squad[0].hp - 80);

  // Slot 0 acts with team_combo
  const r1 = resolveTeamMissionMemberAction(state, 0, { type: 'team_combo' }, () => 0.1);
  assert.equal(r1.ok, true);
  state = r1.state;
  assert.equal(state.activeSlotIndex, 1);

  // Slot 1 acts with melee / move
  const r2 = resolveTeamMissionMemberAction(state, 1, { type: 'defend' }, () => 0.1);
  assert.equal(r2.ok, true);
  state = r2.state;
  assert.equal(state.activeSlotIndex, 2);

  // Slot 2 heals slot 0 (Sensei) -> Green healing entry logged, then boss acts & starts round 2
  const beforeHealHp = state.squad[0].hp;
  const r3 = resolveTeamMissionMemberAction(state, 2, { type: 'heal_ally', targetSlotIndex: 0 }, () => 0.1);
  assert.equal(r3.ok, true);
  state = r3.state;
  assert.equal(state.roundNumber, 2);
  const healLog = state.logs.find((l) => l.actionName.includes('Shousen'));
  assert.ok(healLog);
  const classifiedHeal = classifyCombatLogDelta(healLog);
  assert.equal(classifiedHeal.totalGreenHealing > 0, true);
  assert.equal(classifiedHeal.totalRedDamage, 0);
  assert.equal(beforeHealHp < state.squad[0].maxHp, true);
});

test('PvP 1v1 Server-Authoritative engine enforces turn ownership, consumables, Sharingan & KO', () => {
  const p1 = makeChar({ id: 1, userUid: 'u1', name: 'Challenger', clan: 'Uchiha', kekkeiGenkai: 'Sharingan (Nível 3)' });
  const p2 = makeChar({ id: 2, userUid: 'u2', name: 'Opponent', clan: 'Hyuga', kekkeiGenkai: 'Byakugan', chakraNature: 'Fuuton', learnedJutsus: ['bunshin'] });

  let pvp = buildInitialPvpState({
    mode: 'live_pvp',
    village: 'Konohagakure',
    wagerRyo: 200,
    challenger: p1,
  });
  pvp = attachPvpOpponent(pvp, p2);

  // Opponent cannot act during challenger's turn
  const invalidTurn = resolvePvpAction(pvp, 'opponent', { type: 'defend' });
  assert.equal(invalidTurn.ok, false);

  // Challenger activates Sharingan + casts Katons
  const sh = resolvePvpAction(pvp, 'challenger', { type: 'toggle_sharingan' }, () => 0.1);
  assert.equal(sh.ok, true);
  assert.equal(sh.state.challenger.sharinganActive, true);
  pvp = sh.state;

  const atk = resolvePvpAction(pvp, 'challenger', { type: 'jutsu', jutsuId: 'katon_goukakyuu' }, () => 0.1);
  assert.equal(atk.ok, true);
  pvp = atk.state;
  assert.equal(pvp.activeTurnSide, 'opponent');
  assert.equal(pvp.opponent!.hp < pvp.opponent!.maxHp, true);

  // Spar AI turn responds cleanly
  pvp = executeSparAiTurn(pvp, () => 0.1);
  assert.equal(pvp.activeTurnSide, 'challenger');
});
