import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACADEMY_EXAM_QUESTIONS,
  ACADEMY_PASS_SCORE,
  ActiveStatusEffect,
  applyDailyLoginReward,
  applyOcularJutsuStrain,
  applyProgression,
  applyTileCloudArea,
  buildDefaultGeopoliticsState,
  calculateClanBonuses,
  calculateEffectiveStats,
  calculateHitAndDamage,
  canActivateSharinganInCombat,
  canCharacterLearnJutsu,
  canExecuteMissionForCharacter,
  canMoveToTile,
  canUseOcularJutsuInCombat,
  canUseSecretAction,
  CharacterModel,
  checkJutsuQuestEligibility,
  checkProfessionEligibility,
  checkSharinganEvolutionEligibility,
  checkSummonQuestEligibility,
  CHUNIN_EXAM_PASS_SCORE,
  CHUNIN_EXAM_QUESTIONS,
  classifyJutsuSection,
  computeCurrentStamina,
  computeEnemyGridMove,
  computeKnockbackTile,
  consumeCharacterStamina,
  createTacticalGrid,
  determineRankForCharacter,
  evaluateDailyLoginReward,
  evaluateElementalAffinity,
  formatStaminaCountdown,
  generateActiveWarMissions,
  generateDynamicMission,
  getBimesterInfo,
  getClanJutsuBoostSummary,
  getDailyLoginSchedule,
  getEffectiveJutsuChakraCost,
  getEffectiveJutsuEffects,
  getElementalCounterFor,
  getElementalMultiplier,
  getGeopoliticalMissionBonus,
  getGraduationLadderMatrix,
  getGraduationPathInfo,
  getJutsuGridRange,
  getMaxJutsuRankForGraduation,
  getMissionStaminaCost,
  getOcularState,
  getOwnedElements,
  getPreviousUtcDateKey,
  getSharinganStageDef,
  getSharinganStageNumber,
  getVillageGeopoliticsOverview,
  normalizeCreationKekkeiGenkai,
  normalizeElementalNature,
  getProfessionByIdOrName,
  gradeExam,
  hasDojutsuPerception,
  isGreatSummonContract,
  manhattanDistance,
  matchesJutsuDojoFilter,
  MELEE_STRIKES,
  mergeLootIntoInventory,
  mergeStatusEffects,
  resolveTurnStartControl,
  rollMissionLootDrops,
  SECRET_ACTION_CATALOG,
  setBilateralRelation,
  tickEndOfTurnStatuses,
  tickTileClouds,
  toUtcDateKey,
  upsertOrResolveConflict,
  validateAvatarUrl,
} from './engine';
import {
  CLANS,
  CREATION_KEKKEI_GENKAI_LIST,
  EQUIPPED_WEAPON_PROFILES,
  getJutsuImage,
  getMissionsForVillage,
  getVillageImage,
  getVillageLocations,
  ITEM_CATALOG,
  JUTSU_CATALOG,
  MISSION_TEMPLATES,
  PROFESSIONS,
  SHARINGAN_EVOLUTION_STAGES,
  SPECIAL_JUTSU_QUESTS,
  STANDARD_NINJA_TOOLS,
  SUMMON_QUESTS,
  VILLAGES,
} from './narutoData';

function makeBaseChar(overrides: Partial<CharacterModel> = {}): CharacterModel {
  return {
    id: 1,
    userUid: 'demo:naruto',
    name: 'Renjiro Uchiha',
    avatarUrl: '',
    country: 'País do Fogo',
    village: 'Konohagakure',
    clan: 'Uchiha',
    specialization: 'Mestre em Ninjutsu Elemental',
    chakraNature: 'Katon',
    kekkeiGenkai: 'Sharingan',
    summonContract: 'Corvos de Ilusão',
    rank: 'Estudante da Academia',
    isKage: false,
    level: 1,
    xp: 0,
    chakraLevel: 1,
    chakraXp: 0,
    ryo: 1500,
    meritPoints: 100,
    statPoints: 5,
    hp: 180,
    maxHp: 180,
    chakra: 150,
    maxChakra: 150,
    ninjutsu: 14,
    taijutsu: 11,
    genjutsu: 9,
    velocidade: 12,
    forca: 11,
    inteligencia: 13,
    resistencia: 11,
    controleChakra: 13,
    learnedJutsus: ['bunshin', 'kawarimi', 'konoha_senpuu'],
    equippedGear: { weapon: 'kunai_tatica', armor: null, headband: 'bandana_vila', accessory: null },
    inventory: [],
    missionsCompleted: 0,
    wins: 0,
    losses: 0,
    bio: '',
    ...overrides,
  };
}

test('calculateEffectiveStats combines clan, specialization, and equipped gear bonuses', () => {
  const char = makeBaseChar();
  const stats = calculateEffectiveStats(char);
  assert.equal(stats.ninjutsu, 22);
  assert.equal(stats.velocidade, 17);
  assert.ok(stats.maxHp > 180);
  assert.ok(stats.maxChakra > 150);
  assert.equal(stats.accuracyBonus, 7);
  assert.equal(stats.critBonus, 5);
  assert.equal(stats.natureBonuses?.Katon, 1.15);
});

test('every clan grants two specific mechanical bonuses with matching stat sums', () => {
  assert.equal(CLANS.length, 23);
  for (const clan of CLANS) {
    assert.equal(clan.twoBonuses.length, 2, `${clan.name} should have 2 bonuses`);
    assert.ok(clan.twoBonuses[0].title && clan.twoBonuses[0].description);
    assert.ok(clan.twoBonuses[1].title && clan.twoBonuses[1].description);
    assert.ok(clan.twoBonuses[0].combatEffect || clan.twoBonuses[1].combatEffect);
  }
  const naraStats = calculateEffectiveStats(makeBaseChar({ clan: 'Nara' }));
  assert.equal(getEffectiveJutsuChakraCost({ chakraCost: 40 }, naraStats), 34);
});

test('elemental advantage cycle Katon > Fuuton > Raiton > Doton > Suiton > Katon', () => {
  assert.equal(getElementalMultiplier('Katon', 'Fuuton'), 1.25);
  assert.equal(getElementalMultiplier('Katon', 'Suiton'), 0.85);
  assert.equal(getElementalMultiplier('Raiton', 'Doton'), 1.25);
  assert.equal(getElementalMultiplier('Suiton', 'Doton'), 0.85);
  assert.equal(getElementalMultiplier('Katon', 'Doton'), 1.0);
});

test('calculateHitAndDamage computes deterministic hit, miss, crit, and elemental damage', () => {
  const attacker = calculateEffectiveStats(makeBaseChar());
  const defender = calculateEffectiveStats(makeBaseChar({ clan: 'Sem Clã (Independente)' }));
  const fireball = JUTSU_CATALOG.find((j) => j.id === 'katon_goukakyuu')!;

  const hitResult = calculateHitAndDamage(attacker, 'Katon', defender, 'Fuuton', fireball, () => 0.01);
  assert.equal(hitResult.isHit, true);
  assert.equal(hitResult.isCrit, true);
  assert.equal(hitResult.elementalMultiplier, 1.25);
  assert.ok(hitResult.damage > 50);

  const missResult = calculateHitAndDamage(attacker, 'Katon', defender, 'Fuuton', fireball, () => 0.999);
  assert.equal(missResult.isHit, false);
  assert.equal(missResult.isEvaded, true);
  assert.equal(missResult.damage, 0);
});

test('graduation caps jutsu rank: Estudante D, Genin C, Chunin B, Jonin A, Jounin Experiente S', () => {
  assert.equal(getMaxJutsuRankForGraduation('Estudante da Academia'), 'D');
  assert.equal(getMaxJutsuRankForGraduation('Genin'), 'C');
  assert.equal(getMaxJutsuRankForGraduation('Chunin'), 'B');
  assert.equal(getMaxJutsuRankForGraduation('Jonin'), 'A');
  assert.equal(getMaxJutsuRankForGraduation('Jounin Experiente'), 'S');
});

test('canCharacterLearnJutsu enforces graduation rank cap and possessed elements', () => {
  const rankDKaton = JUTSU_CATALOG.find((j) => j.id === 'katon_hibashiri')!;
  const rankDSuiton = JUTSU_CATALOG.find((j) => j.id === 'suiton_teppoudama')!;
  const rankCKaton = JUTSU_CATALOG.find((j) => j.id === 'katon_goukakyuu')!;
  const rankARasengan = JUTSU_CATALOG.find((j) => j.id === 'rasengan')!;
  const rankSFuuton = JUTSU_CATALOG.find((j) => j.id === 'rasenshuriken')!;

  const estudanteKaton = makeBaseChar({ rank: 'Estudante da Academia', chakraNature: 'Katon', level: 5, chakraLevel: 3, ryo: 5000 });
  assert.equal(canCharacterLearnJutsu(estudanteKaton, rankDKaton).allowed, true);
  assert.equal(canCharacterLearnJutsu(estudanteKaton, rankCKaton).allowed, false);
  assert.equal(canCharacterLearnJutsu(estudanteKaton, rankDSuiton).allowed, false);

  const chuninKaton = makeBaseChar({ rank: 'Chunin', chakraNature: 'Katon', level: 10, chakraLevel: 4, ryo: 5000 });
  assert.equal(canCharacterLearnJutsu(chuninKaton, rankCKaton).allowed, true);
  assert.equal(canCharacterLearnJutsu(chuninKaton, rankARasengan).allowed, false);

  const expJoninFuuton = makeBaseChar({ rank: 'Jounin Experiente', chakraNature: 'Fuuton', level: 20, chakraLevel: 6, ryo: 8000 });
  assert.equal(canCharacterLearnJutsu(expJoninFuuton, rankSFuuton).allowed, true);
});

test('applyProgression advances ninja level and chakra level without auto-promoting canon rank', () => {
  const starter = makeBaseChar({
    rank: 'Estudante da Academia',
    level: 1,
    xp: 0,
    chakraLevel: 1,
    chakraXp: 0,
    meritPoints: 100,
  });
  const { updated, leveledUp, chakraLeveledUp, rankPromoted } = applyProgression(
    starter,
    400,
    250,
    500,
    100
  );
  assert.equal(leveledUp, true);
  assert.equal(chakraLeveledUp, true);
  assert.equal(rankPromoted, false);
  assert.ok(updated.level >= 2);
  assert.ok(updated.chakraLevel >= 2);
  assert.equal(updated.rank, 'Estudante da Academia');
  assert.equal(updated.ryo, 2000);
});

test('generateDynamicMission scales difficulty and rewards as character progresses', () => {
  const low = generateDynamicMission({ level: 1, missionsCompleted: 0 }, 'patrulha_fronteira');
  const high = generateDynamicMission({ level: 12, missionsCompleted: 10 }, 'patrulha_fronteira');
  assert.ok(high.scaledHp > low.scaledHp);
  assert.ok(high.rewardRyo > low.rewardRyo);
  assert.ok(high.difficultyScale > low.difficultyScale);
});

test('validateAvatarUrl accepts https URLs and clears unsafe schemes without AI fallback', () => {
  assert.equal(
    validateAvatarUrl('https://example.com/ninja.png'),
    'https://example.com/ninja.png'
  );
  assert.equal(
    validateAvatarUrl('javascript:alert(1)'),
    ''
  );
});

test('determineRankForCharacter assigns Kage only when appointed via isKage flag', () => {
  assert.equal(determineRankForCharacter(40, 8000, false), 'Sannin');
  assert.equal(determineRankForCharacter(6, 520, false), 'Chunin');
  assert.equal(determineRankForCharacter(6, 520, true), 'Kage');
});

test('gradeExam evaluates Academy and Chunin exam thresholds accurately', () => {
  const allCorrectAcad = Object.fromEntries(ACADEMY_EXAM_QUESTIONS.map((q) => [q.id, q.correctIndex]));
  const passAcad = gradeExam(ACADEMY_EXAM_QUESTIONS, allCorrectAcad, ACADEMY_PASS_SCORE);
  assert.equal(passAcad.passed, true);
  assert.equal(passAcad.scorePercent, 100);

  const failAcad = gradeExam(ACADEMY_EXAM_QUESTIONS, { acad_1: 0, acad_2: 1 }, ACADEMY_PASS_SCORE);
  assert.equal(failAcad.passed, false);
  assert.equal(failAcad.scorePercent, 40);

  const allCorrectChunin = Object.fromEntries(CHUNIN_EXAM_QUESTIONS.map((q) => [q.id, q.correctIndex]));
  const passChunin = gradeExam(CHUNIN_EXAM_QUESTIONS, allCorrectChunin, CHUNIN_EXAM_PASS_SCORE);
  assert.equal(passChunin.passed, true);
  assert.equal(passChunin.scorePercent, 100);
});

test('getBimesterInfo calculates bimester window deterministically', () => {
  const nov = getBimesterInfo(new Date('2026-11-17T12:00:00Z'));
  assert.equal(nov.key, '2026-B6');
  assert.equal(nov.bimesterNumber, 6);
  assert.equal(nov.periodLabel, 'Nov–Dez');

  const jan = getBimesterInfo(new Date('2026-01-15T12:00:00Z'));
  assert.equal(jan.key, '2026-B1');
  assert.equal(jan.bimesterNumber, 1);
  assert.equal(jan.periodLabel, 'Jan–Fev');
});

test('getGraduationPathInfo and getGraduationLadderMatrix expose blocked jutsu ranks and canon milestones', () => {
  const estInfo = getGraduationPathInfo(
    makeBaseChar({ rank: 'Estudante da Academia', level: 1, xp: 60 }),
    false
  );
  assert.equal(estInfo.maxJutsuRank, 'D');
  assert.deepEqual(estInfo.unlockedJutsuRanks, ['E', 'D']);
  assert.deepEqual(estInfo.blockedJutsuRanks, ['C', 'B', 'A', 'S']);
  assert.equal(estInfo.xpPercent, 50);
  assert.equal(estInfo.canTakeAcademyTest, true);

  const geninBusy = getGraduationPathInfo(
    makeBaseChar({ rank: 'Genin', missionsCompleted: 10 }),
    true
  );
  assert.equal(geninBusy.canTakeBimesterChuninExam, false);
  assert.equal(geninBusy.canPromoteChuninByMissions, true);
  assert.equal(geninBusy.missionsProgressPercent, 100);

  const chuninInfo = getGraduationPathInfo(makeBaseChar({ rank: 'Chunin' }), false);
  assert.equal(chuninInfo.requiresKageAppointment, true);

  const ladder = getGraduationLadderMatrix('Estudante da Academia');
  assert.equal(ladder.length, 5);
  assert.equal(ladder[0].isCurrent, true);
  assert.deepEqual(ladder[0].blockedRanks, ['C', 'B', 'A', 'S']);
});

test('villages and jutsus use authentic anime/manga Narutopedia URLs or null when absent', () => {
  assert.equal(VILLAGES.length, 18);
  for (const village of VILLAGES) {
    const resolved = getVillageImage(village.name);
    if (resolved !== null) {
      assert.ok(
        resolved.startsWith('https://static.wikia.nocookie.net/naruto/images/'),
        `Village ${village.name} should use official Narutopedia anime/manga image`
      );
    }
  }
  // Major 5 nations must all have official Narutopedia images
  for (const major of VILLAGES.slice(0, 5)) {
    assert.ok(getVillageImage(major.name) !== null);
  }
  // Villages without wiki image stay cleanly null
  assert.equal(getVillageImage('Shimogakure'), null);
  assert.equal(getVillageImage('Tanigakure'), null);

  for (const jutsu of JUTSU_CATALOG) {
    const resolved = getJutsuImage(jutsu);
    if (resolved !== null) {
      assert.ok(
        resolved.startsWith('https://static.wikia.nocookie.net/naruto/images/'),
        `Jutsu ${jutsu.name} should use official Narutopedia anime/manga image`
      );
    }
  }
  // Custom jutsu or technique without anime/manga image stays cleanly null
  assert.equal(getJutsuImage({ id: 'custom_1', category: 'Ninjutsu', nature: 'Katon' }), null);
});

test('elemental, genjutsu, dojutsu, and clan status effects trigger deterministically', () => {
  const attacker = calculateEffectiveStats(makeBaseChar({ clan: 'Sem Clã (Independente)', kekkeiGenkai: 'Nenhum' }));
  const defender = calculateEffectiveStats(makeBaseChar({ clan: 'Sem Clã (Independente)', kekkeiGenkai: 'Nenhum' }));

  const katon = JUTSU_CATALOG.find((j) => j.id === 'katon_goukakyuu')!;
  const katonCalc = calculateHitAndDamage(attacker, 'Katon', defender, 'Neutro', katon, () => 0.05);
  assert.equal(katonCalc.isHit, true);
  assert.ok(katonCalc.appliedEffects.some((e) => e.type === 'burn'));

  const suiton = JUTSU_CATALOG.find((j) => j.id === 'suiton_suiryuudan')!;
  const suitonCalc = calculateHitAndDamage(attacker, 'Suiton', defender, 'Neutro', suiton, () => 0.05);
  assert.ok(suitonCalc.appliedEffects.some((e) => e.type === 'soaked'));
  assert.ok(suitonCalc.appliedEffects.some((e) => e.type === 'drowning'));

  const doton = JUTSU_CATALOG.find((j) => j.id === 'doton_shinjuu')!;
  const dotonCalc = calculateHitAndDamage(attacker, 'Doton', defender, 'Neutro', doton, () => 0.05);
  assert.ok(dotonCalc.appliedEffects.some((e) => e.type === 'crush'));
  assert.ok(dotonCalc.appliedEffects.some((e) => e.type === 'paralysis'));

  const jubaku = JUTSU_CATALOG.find((j) => j.id === 'genjutsu_karasu')!;
  const jubakuCalc = calculateHitAndDamage(attacker, 'Yin', defender, 'Neutro', jubaku, () => 0.05);
  assert.ok(jubakuCalc.appliedEffects.some((e) => e.type === 'paralysis'));
  assert.equal(jubakuCalc.appliedEffects.some((e) => e.type === 'mind_control'), false);

  const subjugacao = JUTSU_CATALOG.find((j) => j.id === 'magen_subjugacao')!;
  const subjugacaoCalc = calculateHitAndDamage(attacker, 'Yin', defender, 'Neutro', subjugacao, () => 0.05);
  assert.ok(subjugacaoCalc.appliedEffects.some((e) => e.type === 'mind_control'));

  const shintenshin = JUTSU_CATALOG.find((j) => j.id === 'yamanaka_shintenshin')!;
  const shintenshinCalc = calculateHitAndDamage(attacker, 'Yin', defender, 'Neutro', shintenshin, () => 0.05, {
    attackerClan: 'Yamanaka',
  });
  assert.ok(shintenshinCalc.appliedEffects.some((e) => e.type === 'mind_control'));
});

test('soaked target amplifies Raiton damage by +35%, doubles stun chance, and weakens Katon by 15%', () => {
  const attacker = calculateEffectiveStats(makeBaseChar({ clan: 'Sem Clã (Independente)' }));
  const defender = calculateEffectiveStats(makeBaseChar({ clan: 'Sem Clã (Independente)' }));
  const chidori = JUTSU_CATALOG.find((j) => j.id === 'chidori')!;
  const fireball = JUTSU_CATALOG.find((j) => j.id === 'katon_goukakyuu')!;

  const soakedStatus: ActiveStatusEffect[] = [
    { type: 'soaked', label: 'Encharcado', turnsRemaining: 2, potency: 0 },
  ];

  const dryRaiton = calculateHitAndDamage(attacker, 'Raiton', defender, 'Neutro', chidori, () => 0.5);
  const wetRaiton = calculateHitAndDamage(attacker, 'Raiton', defender, 'Neutro', chidori, () => 0.5, {
    defenderStatuses: soakedStatus,
  });
  assert.ok(wetRaiton.damage > Math.round(dryRaiton.damage * 1.28));
  assert.ok(wetRaiton.synergyNotes.some((n) => n.includes('Raiton')));
  // Base Chidori stun is 65%; on roll 0.8 (81), dry fails to stun, while wet has doubled 100% stun chance
  const stunDryRoll = calculateHitAndDamage(attacker, 'Raiton', defender, 'Neutro', chidori, () => 0.8);
  const stunWetRoll = calculateHitAndDamage(attacker, 'Raiton', defender, 'Neutro', chidori, () => 0.8, {
    defenderStatuses: soakedStatus,
  });
  assert.equal(stunDryRoll.appliedEffects.some((e) => e.type === 'stun'), false);
  assert.equal(stunWetRoll.appliedEffects.some((e) => e.type === 'stun'), true);

  const dryKaton = calculateHitAndDamage(attacker, 'Katon', defender, 'Neutro', fireball, () => 0.5);
  const wetKaton = calculateHitAndDamage(attacker, 'Katon', defender, 'Neutro', fireball, () => 0.5, {
    defenderStatuses: soakedStatus,
  });
  assert.ok(wetKaton.damage < dryKaton.damage);
  assert.ok(wetKaton.synergyNotes.some((n) => n.includes('Katon')));
});

test('mind_control is restricted to specific Genjutsus and Yamanaka jutsus; Byakugan, Aburame, and Akimichi retain passives', () => {
  const taijutsu = JUTSU_CATALOG.find((j) => j.id === 'konoha_senpuu')!;
  const katon = JUTSU_CATALOG.find((j) => j.id === 'katon_goukakyuu')!;
  const sharinganGenjutsu = JUTSU_CATALOG.find((j) => j.id === 'genjutsu_sharingan')!;
  const yamanakaJutsu = JUTSU_CATALOG.find((j) => j.id === 'yamanaka_shintenshin')!;

  // Uchiha + Sharingan casting Katon must NOT apply mind_control
  const uchihaKatonEffects = getEffectiveJutsuEffects(katon, 'Uchiha', 'Sharingan');
  assert.equal(uchihaKatonEffects.some((e) => e.type === 'mind_control'), false);

  // Sharingan amplifies specific Genjutsus that already manipulate minds
  const boostedGenjutsuEffects = getEffectiveJutsuEffects(sharinganGenjutsu, 'Uchiha', 'Sharingan');
  assert.equal(boostedGenjutsuEffects.find((e) => e.type === 'mind_control')?.chance, 90);

  // Yamanaka exclusive jutsu carries 100% chance with clan boost (90 + 10)
  const yamanakaEffects = getEffectiveJutsuEffects(yamanakaJutsu, 'Yamanaka', 'Nenhum');
  assert.equal(yamanakaEffects.find((e) => e.type === 'mind_control')?.chance, 100);

  const hyugaEffects = getEffectiveJutsuEffects(taijutsu, 'Hyuga', 'Byakugan');
  assert.ok(hyugaEffects.some((e) => e.type === 'chakra_seal'));

  const aburameEffects = getEffectiveJutsuEffects(katon, 'Aburame', 'Nenhum');
  assert.ok(aburameEffects.some((e) => e.type === 'chakra_seal'));

  const akimichiEffects = getEffectiveJutsuEffects(taijutsu, 'Akimichi', 'Nenhum');
  assert.ok(akimichiEffects.some((e) => e.type === 'crush'));
});

test('resolveTurnStartControl and tickEndOfTurnStatuses handle stun, mind_control, DoT, drain, and regen cleanse', () => {
  const stunned: ActiveStatusEffect[] = [{ type: 'stun', label: 'Atordoamento', turnsRemaining: 1, potency: 0 }];
  const stunRes = resolveTurnStartControl(stunned, 200);
  assert.equal(stunRes.canAct, false);
  assert.equal(stunRes.reason, 'stun');
  assert.equal(stunRes.updatedStatuses.length, 0);

  const mindControlled: ActiveStatusEffect[] = [{ type: 'mind_control', label: 'Controle Mental', turnsRemaining: 1, potency: 0 }];
  const mindRes = resolveTurnStartControl(mindControlled, 200, () => 0.1);
  assert.equal(mindRes.canAct, false);
  assert.equal(mindRes.reason, 'mind_control');
  assert.ok(mindRes.selfDamage >= 14);

  const burnedThenRegen = mergeStatusEffects(
    [{ type: 'burn', label: 'Queimadura', turnsRemaining: 2, potency: 18 }],
    { type: 'regen', label: 'Regeneração', target: 'self', duration: 2, potency: 24 }
  );
  assert.equal(burnedThenRegen.some((s) => s.type === 'burn'), false);
  assert.equal(burnedThenRegen.some((s) => s.type === 'regen'), true);

  const tick = tickEndOfTurnStatuses(
    [
      { type: 'drowning', label: 'Afogamento', turnsRemaining: 2, potency: 16 },
      { type: 'burn', label: 'Queimadura', turnsRemaining: 1, potency: 14 },
    ],
    200,
    200,
    150,
    150
  );
  assert.equal(tick.nextHp, 170);
  assert.equal(tick.nextChakra, 138);
  assert.equal(tick.nextStatuses.length, 1);
  assert.equal(tick.nextStatuses[0].turnsRemaining, 1);
});

test('expanded Narutopedia jutsu catalog separates cleanly by category, element, clan, and kekkei genkai without leaking mind_control', () => {
  assert.ok(JUTSU_CATALOG.length >= 45, `Expected expanded catalog >= 45, got ${JUTSU_CATALOG.length}`);

  const katonItems = JUTSU_CATALOG.filter((j) => matchesJutsuDojoFilter(j, 'Ninjutsu Elemental', 'Katon'));
  assert.ok(katonItems.length >= 5);
  assert.ok(katonItems.every((j) => j.category === 'Ninjutsu' && j.nature === 'Katon'));

  const taijutsuItems = JUTSU_CATALOG.filter((j) => matchesJutsuDojoFilter(j, 'Taijutsu'));
  assert.ok(taijutsuItems.some((j) => j.id === 'yagai'));
  assert.ok(taijutsuItems.some((j) => j.id === 'hirudora'));

  const genjutsuItems = JUTSU_CATALOG.filter((j) => matchesJutsuDojoFilter(j, 'Genjutsu'));
  assert.ok(genjutsuItems.some((j) => j.id === 'kotoamatsukami'));
  assert.ok(genjutsuItems.some((j) => j.id === 'nehan_shouja'));

  const naraItems = JUTSU_CATALOG.filter((j) => matchesJutsuDojoFilter(j, 'Por Clã', 'Nara'));
  assert.ok(naraItems.some((j) => j.id === 'kagemane'));
  assert.ok(naraItems.some((j) => j.id === 'kage_kubishibari'));

  const hyugaKg = JUTSU_CATALOG.filter((j) => matchesJutsuDojoFilter(j, 'Kekkei Genkai', 'Byakugan'));
  assert.ok(hyugaKg.length >= 3);

  assert.equal(classifyJutsuSection(JUTSU_CATALOG.find((j) => j.id === 'rasengan')!), 'Ninjutsu');
  assert.equal(classifyJutsuSection(JUTSU_CATALOG.find((j) => j.id === 'kagemane')!), 'Por Clã');
  assert.equal(classifyJutsuSection(JUTSU_CATALOG.find((j) => j.id === 'jinton_genkai_hakuri')!), 'Kekkei Genkai');

  // Verify mind_control only ever appears on allowed mental Genjutsus or Yamanaka techniques
  const allowedMindIds = new Set([
    'yamanaka_shintenshin',
    'yamanaka_shinranshin',
    'genjutsu_sharingan',
    'magen_subjugacao',
    'tsukuyomi',
    'kotoamatsukami',
  ]);
  for (const j of JUTSU_CATALOG) {
    const hasMind = (j.effects || []).some((e) => e.type === 'mind_control');
    assert.equal(hasMind, allowedMindIds.has(j.id), `Unexpected mind_control config on ${j.id}`);
  }
});

test('Kuchiyose jutsus require contracts unlocked via Summon Quests and Great Sage Summon requires Toads/Slugs/Snakes', () => {
  const combatSummon = JUTSU_CATALOG.find((j) => j.id === 'kuchiyose_gamabunta')!;
  const greatSageSummon = JUTSU_CATALOG.find((j) => j.id === 'kuchiyose_grande_sabio')!;

  const noContractChar = makeBaseChar({
    rank: 'Jounin Experiente',
    level: 20,
    chakraLevel: 6,
    ryo: 10000,
    summonContract: 'Nenhum',
  });
  assert.equal(canCharacterLearnJutsu(noContractChar, combatSummon).allowed, false);
  assert.equal(canCharacterLearnJutsu(noContractChar, greatSageSummon).allowed, false);

  const standardContractChar = { ...noContractChar, summonContract: 'Cães Ninjas (Ninken)' };
  assert.equal(canCharacterLearnJutsu(standardContractChar, combatSummon).allowed, true);
  assert.equal(canCharacterLearnJutsu(standardContractChar, greatSageSummon).allowed, false);

  const sageContractChar = { ...noContractChar, summonContract: 'Sapos do Monte Myoboku (Gamabunta)' };
  assert.equal(canCharacterLearnJutsu(sageContractChar, combatSummon).allowed, true);
  assert.equal(canCharacterLearnJutsu(sageContractChar, greatSageSummon).allowed, true);
});

test('SUMMON_QUESTS distinguishes standard quests from the demanding Three Great Sage quests', () => {
  assert.equal(SUMMON_QUESTS.length, 8);
  const standardQuests = SUMMON_QUESTS.filter((q) => !q.isGreatSummon);
  const greatQuests = SUMMON_QUESTS.filter((q) => q.isGreatSummon);
  assert.equal(standardQuests.length, 5);
  assert.equal(greatQuests.length, 3);
  for (const gq of greatQuests) {
    assert.equal(isGreatSummonContract(gq.contractName), true);
    assert.equal(gq.minRank, 'Chunin');
    assert.ok(gq.minLevel >= 10);
    assert.ok(gq.minMissions >= 12);
    assert.ok(gq.costRyo >= 2500);
    assert.equal(gq.trialQuestions.length, 3);
  }

  const geninEligible = makeBaseChar({
    rank: 'Genin',
    level: 4,
    chakraLevel: 2,
    missionsCompleted: 3,
    meritPoints: 150,
    ryo: 600,
    summonContract: 'Nenhum',
  });
  const ninkenQuest = SUMMON_QUESTS.find((q) => q.id === 'quest_ninken')!;
  const gamabuntaQuest = SUMMON_QUESTS.find((q) => q.id === 'quest_sapos_myoboku')!;

  assert.equal(checkSummonQuestEligibility(geninEligible, ninkenQuest).eligible, true);
  assert.equal(checkSummonQuestEligibility(geninEligible, gamabuntaQuest).eligible, false);

  const veteranSage = makeBaseChar({
    rank: 'Chunin',
    level: 12,
    chakraLevel: 5,
    missionsCompleted: 14,
    meritPoints: 450,
    ryo: 3500,
    summonContract: 'Cães Ninjas (Ninken)',
  });
  assert.equal(checkSummonQuestEligibility(veteranSage, gamabuntaQuest).eligible, true);
});

test('MISSION_TEMPLATES includes an extensive mission board covering Ranks D through S', () => {
  assert.ok(MISSION_TEMPLATES.length >= 24, `Expected >= 24 missions, got ${MISSION_TEMPLATES.length}`);
  const counts: Record<string, number> = { D: 0, C: 0, B: 0, A: 0, S: 0 };
  for (const m of MISSION_TEMPLATES) {
    counts[m.rank] = (counts[m.rank] || 0) + 1;
    const scaled = generateDynamicMission({ level: m.minLevel + 2, missionsCompleted: 5 }, m.id);
    assert.ok(scaled.scaledHp >= m.baseHp);
    assert.ok(scaled.rewardRyo >= m.baseRyo);
  }
  assert.ok(counts.D >= 4);
  assert.ok(counts.C >= 4);
  assert.ok(counts.B >= 4);
  assert.ok(counts.A >= 4);
  assert.ok(counts.S >= 4);
});

test('getOwnedElements supports unlocking a secondary chakra nature and allows learning 2nd element jutsus', () => {
  const rankCSuiton = JUTSU_CATALOG.find((j) => j.id === 'suiton_suiryuudan')!;
  const rankCRaiton = JUTSU_CATALOG.find((j) => j.id === 'raiton_jibashi')!;

  const singleEl = makeBaseChar({
    rank: 'Chunin',
    chakraNature: 'Katon',
    secondaryChakraNature: 'Nenhum',
    level: 10,
    chakraLevel: 5,
    ryo: 5000,
  });
  assert.deepEqual(getOwnedElements(singleEl), ['Katon']);
  assert.equal(canCharacterLearnJutsu(singleEl, rankCSuiton).allowed, false);

  const dualEl = { ...singleEl, secondaryChakraNature: 'Suiton' };
  assert.deepEqual(getOwnedElements(dualEl), ['Katon', 'Suiton']);
  assert.equal(canCharacterLearnJutsu(dualEl, rankCSuiton).allowed, true);
  assert.equal(canCharacterLearnJutsu(dualEl, rankCRaiton).allowed, false);
});

test('Rasengan and Hachimon Tonkou require completing Special Jutsu Quests and Eight Gates strictly forbids Clan and Kekkei Genkai', () => {
  const rasengan = JUTSU_CATALOG.find((j) => j.id === 'rasengan')!;
  const hachimon = JUTSU_CATALOG.find((j) => j.id === 'hachimon_tonkou')!;
  assert.equal(rasengan.questRequired, 'quest_rasengan');
  assert.equal(hachimon.questRequired, 'quest_portoes_chakra');

  const joninHigh = makeBaseChar({
    rank: 'Jonin',
    clan: 'Sem Clã (Independente)',
    kekkeiGenkai: 'Nenhum',
    level: 16,
    chakraLevel: 6,
    ryo: 10000,
  });
  // Even with high rank/level/ryo, direct dojo learning is locked until the Special Quest grants the jutsu
  assert.equal(canCharacterLearnJutsu(joninHigh, rasengan).allowed, false);
  assert.equal(canCharacterLearnJutsu(joninHigh, hachimon).allowed, false);

  assert.equal(SPECIAL_JUTSU_QUESTS.length, 3);
  const qSecondEl = SPECIAL_JUTSU_QUESTS.find((q) => q.id === 'quest_segundo_elemento')!;
  const qRasengan = SPECIAL_JUTSU_QUESTS.find((q) => q.id === 'quest_rasengan')!;
  const qGates = SPECIAL_JUTSU_QUESTS.find((q) => q.id === 'quest_portoes_chakra')!;

  const pureTaijutsuNinja = makeBaseChar({
    rank: 'Chunin',
    clan: 'Sem Clã (Independente)',
    kekkeiGenkai: 'Nenhum',
    level: 11,
    chakraLevel: 4,
    missionsCompleted: 8,
    meritPoints: 300,
    ryo: 3000,
    taijutsu: 24,
    controleChakra: 22,
  });

  assert.equal(checkJutsuQuestEligibility(pureTaijutsuNinja, qSecondEl).eligible, true);
  assert.equal(checkJutsuQuestEligibility(pureTaijutsuNinja, qRasengan).eligible, true);
  assert.equal(checkJutsuQuestEligibility(pureTaijutsuNinja, qGates).eligible, true);

  // Having a Clan OR having a Kekkei Genkai strictly disqualifies Eight Gates
  const withClan = { ...pureTaijutsuNinja, clan: 'Hyuga', kekkeiGenkai: 'Nenhum' };
  const withKekkei = { ...pureTaijutsuNinja, clan: 'Sem Clã (Independente)', kekkeiGenkai: 'Sharingan' };
  assert.equal(checkJutsuQuestEligibility(withClan, qGates).eligible, false);
  assert.ok(
    checkJutsuQuestEligibility(withClan, qGates).unmetReasons.some((r) => r.includes('Não pode possuir Clã'))
  );
  assert.equal(checkJutsuQuestEligibility(withKekkei, qGates).eligible, false);
  assert.ok(
    checkJutsuQuestEligibility(withKekkei, qGates).unmetReasons.some((r) =>
      r.includes('Não pode possuir Kekkei Genkai')
    )
  );
});

test('Shinobi Professions cover Chunin and Tokubetsu Jonin tiers with accurate eligibility & stat bonuses', () => {
  const chuninProfs = PROFESSIONS.filter((p) => p.availableInTiers.includes('Chunin')).map((p) => p.name);
  assert.deepEqual(chuninProfs, ['ANBU', 'Guarda do Portão', 'Sensei', 'Médico Ninja']);

  const tokubetsuProfs = PROFESSIONS.filter((p) =>
    p.availableInTiers.includes('Tokubetsu Jonin')
  ).map((p) => p.name);
  assert.deepEqual(tokubetsuProfs, ['Médico Ninja', 'Interrogador', 'Espião', 'Rastreador']);

  const anbu = getProfessionByIdOrName('anbu')!;
  const espiao = getProfessionByIdOrName('espiao')!;
  const medico = getProfessionByIdOrName('medico_ninja')!;

  const genin = makeBaseChar({ rank: 'Genin' });
  assert.equal(checkProfessionEligibility(genin, anbu).eligible, false);
  assert.equal(checkProfessionEligibility(genin, espiao).eligible, false);

  const chunin = makeBaseChar({ rank: 'Chunin' });
  assert.equal(checkProfessionEligibility(chunin, anbu).eligible, true);
  assert.equal(checkProfessionEligibility(chunin, medico).eligible, true);
  assert.equal(checkProfessionEligibility(chunin, espiao).eligible, false);

  const tokubetsu = makeBaseChar({ rank: 'Tokubetsu Jonin' });
  assert.equal(checkProfessionEligibility(tokubetsu, espiao).eligible, true);

  const baseStats = calculateEffectiveStats(makeBaseChar({ rank: 'Chunin', profession: 'Nenhuma' }));
  const anbuStats = calculateEffectiveStats(makeBaseChar({ rank: 'Chunin', profession: 'ANBU' }));
  assert.equal(anbuStats.velocidade, baseStats.velocidade + 4);
  assert.equal(anbuStats.secretBonus, 0.15);

  const medicoStats = calculateEffectiveStats(
    makeBaseChar({ rank: 'Chunin', profession: 'Médico Ninja' })
  );
  assert.equal(medicoStats.healBoost, 0.25);
});

test('Tactical RPG Grid validates movement, obstacles, knockback, and cloud mechanics', () => {
  const grid = createTacticalGrid('patrulha_fronteira');
  assert.equal(grid.cols, 7);
  assert.equal(grid.rows, 5);
  assert.equal(manhattanDistance(grid.playerPos, grid.enemyPos), 4);

  // Adjacent open tile is movable within 2 steps; enemy tile & out-of-range tile are blocked
  assert.equal(canMoveToTile(grid, { x: 1, y: 2 }, { x: 2, y: 2 }, 2, grid.enemyPos), true);
  assert.equal(canMoveToTile(grid, { x: 1, y: 2 }, grid.enemyPos, 4, grid.enemyPos), false);
  assert.equal(canMoveToTile(grid, { x: 1, y: 2 }, { x: 6, y: 4 }, 2, grid.enemyPos), false);

  // Knockback moves enemy away along primary axis without leaving grid
  const pushed = computeKnockbackTile(grid, { x: 4, y: 2 }, { x: 5, y: 2 }, 1);
  assert.deepEqual(pushed, { x: 6, y: 2 });

  // Enemy moves closer when far away
  const movedEnemy = computeEnemyGridMove(grid, { x: 6, y: 0 }, { x: 0, y: 4 }, 2);
  assert.ok(manhattanDistance(movedEnemy, { x: 0, y: 4 }) < manhattanDistance({ x: 6, y: 0 }, { x: 0, y: 4 }));
});

test('Secret Actions require smoke/soot/mist cover and NEVER fool Sharingan or Byakugan opponents', () => {
  const grid = createTacticalGrid('arena_teste');

  // Open battlefield -> Secret Actions blocked
  const clearCheck = canUseSecretAction(grid, grid.playerPos, grid.enemyPos, 'Nara');
  assert.equal(clearCheck.allowed, false);

  // Cover player with smoke from Smoke Bomb -> Secret Actions unlocked vs normal enemy
  const smokedGrid = {
    ...grid,
    clouds: applyTileCloudArea(grid.clouds, grid.playerPos, 1, 'smoke', 3),
  };
  const smokeCheck = canUseSecretAction(smokedGrid, smokedGrid.playerPos, smokedGrid.enemyPos, 'Nara');
  assert.equal(smokeCheck.allowed, true);
  assert.equal(smokeCheck.concealed, true);

  // Cover with Katon soot -> Secret Actions unlocked vs normal enemy
  const sootGrid = {
    ...grid,
    clouds: applyTileCloudArea(grid.clouds, grid.playerPos, 1, 'soot', 2),
  };
  assert.equal(canUseSecretAction(sootGrid, sootGrid.playerPos, sootGrid.enemyPos, 'Akimichi').allowed, true);

  // Opponent with Sharingan or Byakugan NEVER falls for Secret Actions even inside smoke/soot
  assert.equal(hasDojutsuPerception('Uchiha', undefined), true);
  assert.equal(hasDojutsuPerception('Hyuga', undefined), true);
  const vsSharingan = canUseSecretAction(smokedGrid, smokedGrid.playerPos, smokedGrid.enemyPos, 'Uchiha');
  const vsByakugan = canUseSecretAction(sootGrid, sootGrid.playerPos, sootGrid.enemyPos, 'Hyuga', 'Byakugan');
  assert.equal(vsSharingan.allowed, false);
  assert.equal(vsSharingan.enemySeesThrough, true);
  assert.equal(vsByakugan.allowed, false);
  assert.equal(vsByakugan.enemySeesThrough, true);

  // Clouds expire properly after turns tick
  let clouds = applyTileCloudArea({}, { x: 1, y: 2 }, 0, 'smoke', 2);
  clouds = tickTileClouds(clouds);
  assert.equal(clouds['1,2']?.turnsRemaining, 1);
  clouds = tickTileClouds(clouds);
  assert.equal(clouds['1,2'], undefined);
});

test('Melee strikes (punches/kicks), ninja tools, equipped weapons, and secret actions are complete', () => {
  assert.equal(MELEE_STRIKES.length, 3);
  assert.ok(MELEE_STRIKES.some((s) => s.id === 'soco_direto'));
  assert.ok(MELEE_STRIKES.some((s) => s.id === 'chute_giratorio' && s.knockbackTiles === 1));
  assert.ok(STANDARD_NINJA_TOOLS.some((w) => w.kind === 'smoke_bomb' && w.createsCloud === 'smoke'));
  assert.ok(STANDARD_NINJA_TOOLS.some((w) => w.kind === 'explosive_tag' && w.createsCloud === 'soot'));
  assert.ok(EQUIPPED_WEAPON_PROFILES.kubikiribocho);
  assert.equal(SECRET_ACTION_CATALOG.length, 3);
});

test('calculateHitAndDamage returns tabletop critRolled and effectRolls outcomes', () => {
  const attacker = calculateEffectiveStats(makeBaseChar({ clan: 'Sem Clã (Independente)', kekkeiGenkai: 'Nenhum' }));
  const defender = calculateEffectiveStats(makeBaseChar({ clan: 'Sem Clã (Independente)', kekkeiGenkai: 'Nenhum' }));
  const fireball = JUTSU_CATALOG.find((j) => j.id === 'katon_goukakyuu')!;

  const lowRoll = calculateHitAndDamage(attacker, 'Katon', defender, 'Fuuton', fireball, () => 0.05);
  assert.equal(lowRoll.critRolled, 6);
  assert.ok(lowRoll.effectRolls.length >= 1);
  assert.equal(lowRoll.effectRolls[0].applied, true);
  assert.equal(lowRoll.effectRolls[0].rolled, 6);

  // Use sequence: hit=0.1(11), crit=0.9(91), variance=0.5, fxRoll=0.95(96 -> resisted)
  const seq = [0.1, 0.9, 0.5, 0.95];
  let idx = 0;
  const resistedRoll = calculateHitAndDamage(attacker, 'Katon', defender, 'Fuuton', fireball, () => seq[idx++]);
  assert.equal(resistedRoll.isHit, true);
  assert.equal(resistedRoll.critRolled, 91);
  assert.equal(resistedRoll.isCrit, false);
  assert.equal(resistedRoll.effectRolls[0].applied, false);
  assert.equal(resistedRoll.effectRolls[0].rolled, 96);
});

test('Elemental Affinity System covers all 5 natures (Katon, Suiton, Raiton, Doton, Futon) with advantage, disadvantage, affinity resonance, and dual-element defense', () => {
  // Normalization handles both Futon and Fuuton seamlessly
  assert.equal(normalizeElementalNature('Futon'), 'Fuuton');
  assert.equal(normalizeElementalNature('fuuton'), 'Fuuton');
  assert.equal(normalizeElementalNature('KATON'), 'Katon');
  assert.equal(normalizeElementalNature('Neutro'), null);

  // Full 5-element cycle advantage (x1.25) and disadvantage (x0.85)
  assert.equal(getElementalMultiplier('Katon', 'Futon'), 1.25);
  assert.equal(getElementalMultiplier('Futon', 'Raiton'), 1.25);
  assert.equal(getElementalMultiplier('Raiton', 'Doton'), 1.25);
  assert.equal(getElementalMultiplier('Doton', 'Suiton'), 1.25);
  assert.equal(getElementalMultiplier('Suiton', 'Katon'), 1.25);

  assert.equal(getElementalMultiplier('Futon', 'Katon'), 0.85);
  assert.equal(getElementalMultiplier('Raiton', 'Futon'), 0.85);
  assert.equal(getElementalMultiplier('Doton', 'Raiton'), 0.85);
  assert.equal(getElementalMultiplier('Suiton', 'Doton'), 0.85);
  assert.equal(getElementalMultiplier('Katon', 'Suiton'), 0.85);

  // Elemental counter lookup
  assert.equal(getElementalCounterFor('Katon'), 'Suiton');
  assert.equal(getElementalCounterFor('Futon'), 'Katon');
  assert.equal(getElementalCounterFor('Raiton'), 'Fuuton');
  assert.equal(getElementalCounterFor('Doton'), 'Raiton');
  assert.equal(getElementalCounterFor('Suiton'), 'Doton');

  // Damage calculation reflects advantage > neutral > disadvantage deterministically
  const attacker = calculateEffectiveStats(makeBaseChar({ clan: 'Sem Clã (Independente)', kekkeiGenkai: 'Nenhum' }));
  const defender = calculateEffectiveStats(makeBaseChar({ clan: 'Sem Clã (Independente)', kekkeiGenkai: 'Nenhum' }));
  const fireball = JUTSU_CATALOG.find((j) => j.id === 'katon_goukakyuu')!;
  const neutralKick = JUTSU_CATALOG.find((j) => j.id === 'konoha_senpuu')!;

  const advHit = calculateHitAndDamage(attacker, 'Katon', defender, 'Futon', fireball, () => 0.35);
  const neuHit = calculateHitAndDamage(attacker, 'Katon', defender, 'Doton', fireball, () => 0.35);
  const disHit = calculateHitAndDamage(attacker, 'Katon', defender, 'Suiton', fireball, () => 0.35);

  assert.equal(advHit.elementalRelation, 'advantage');
  assert.equal(advHit.elementalMultiplier, 1.25);
  assert.equal(advHit.affinityMultiplier, 1.1);
  assert.equal(neuHit.elementalRelation, 'neutral');
  assert.equal(neuHit.elementalMultiplier, 1.0);
  assert.equal(disHit.elementalRelation, 'disadvantage');
  assert.equal(disHit.elementalMultiplier, 0.85);
  assert.ok(advHit.damage > neuHit.damage);
  assert.ok(neuHit.damage > disHit.damage);

  // Secondary elemental affinity grants +5% resonance (1.05x) vs off-affinity (1.0x)
  const waterDragon = JUTSU_CATALOG.find((j) => j.id === 'suiton_suiryuudan')!;
  const secondaryAffinityHit = calculateHitAndDamage(attacker, 'Katon', defender, 'Doton', waterDragon, () => 0.35, {
    attackerSecondaryNature: 'Suiton',
  });
  const noAffinityHit = calculateHitAndDamage(attacker, 'Katon', defender, 'Doton', waterDragon, () => 0.35);
  assert.equal(secondaryAffinityHit.affinityMultiplier, 1.05);
  assert.equal(noAffinityHit.affinityMultiplier, 1.0);
  assert.ok(secondaryAffinityHit.damage > noAffinityHit.damage);

  // Non-elemental Taijutsu stays 1.0x neutral even when caster has Katon affinity vs Futon defender
  const kickCalc = calculateHitAndDamage(attacker, 'Katon', defender, 'Futon', neutralKick, () => 0.35);
  assert.equal(kickCalc.elementalMultiplier, 1.0);
  assert.equal(kickCalc.affinityMultiplier, 1.0);
  assert.equal(kickCalc.elementalRelation, 'neutral');

  // Dual-element defender mitigates incoming attack when 2nd element counters attacker
  const dualDefEval = evaluateElementalAffinity({
    attackNature: 'Katon',
    attackerPrimaryNature: 'Katon',
    defenderPrimaryNature: 'Doton',
    defenderSecondaryNature: 'Suiton',
  });
  assert.equal(dualDefEval.elementalMultiplier, 0.9);
  assert.equal(dualDefEval.relation, 'disadvantage');
});

test('Sharingan Evolution (Level 1 -> Level 2 -> Level 3 -> Mangekyou Sharingan) enforces requirements, distinct stage bonuses, and ocular jutsu gates', () => {
  assert.equal(SHARINGAN_EVOLUTION_STAGES.length, 4);
  assert.equal(CREATION_KEKKEI_GENKAI_LIST.includes('Sharingan (Nível 1)'), true);
  assert.equal(CREATION_KEKKEI_GENKAI_LIST.includes('Sharingan (Nível 2)'), false);
  assert.equal(CREATION_KEKKEI_GENKAI_LIST.includes('Sharingan (Nível 3)'), false);
  assert.equal(CREATION_KEKKEI_GENKAI_LIST.includes('Mangekyo Sharingan'), false);

  for (const st of SHARINGAN_EVOLUTION_STAGES) {
    assert.ok(st.imageUrl.startsWith('https://static.wikia.nocookie.net/naruto/images/'));
  }

  // Creation normalization prevents starting directly at Stage 2, Stage 3, or MS
  assert.equal(normalizeCreationKekkeiGenkai('Mangekyo Sharingan', 'Uchiha'), 'Sharingan (Nível 1)');
  assert.equal(normalizeCreationKekkeiGenkai('Sharingan (Nível 3)', 'Uchiha'), 'Sharingan (Nível 1)');
  assert.equal(normalizeCreationKekkeiGenkai('Sharingan (Nível 2)', 'Uchiha'), 'Sharingan (Nível 1)');
  assert.equal(normalizeCreationKekkeiGenkai('Sharingan', 'Uchiha'), 'Sharingan (Nível 1)');
  assert.equal(normalizeCreationKekkeiGenkai('Sharingan (Nível 3)', 'Hyuga'), 'Nenhum');
  assert.equal(normalizeCreationKekkeiGenkai('Mangekyo Sharingan', 'Hyuga'), 'Nenhum');

  // Stage detection handles legacy 'Sharingan' and explicit stages 1..4
  assert.equal(getSharinganStageNumber('Sharingan', 'Uchiha'), 1);
  assert.equal(getSharinganStageNumber('Sharingan (Nível 1)', 'Uchiha'), 1);
  assert.equal(getSharinganStageNumber('Sharingan (Nível 2)', 'Uchiha'), 2);
  assert.equal(getSharinganStageNumber('Sharingan (Nível 3)', 'Uchiha'), 3);
  assert.equal(getSharinganStageNumber('Mangekyo Sharingan', 'Uchiha'), 4);
  assert.equal(getSharinganStageNumber('Byakugan', 'Hyuga'), 0);
  assert.equal(getSharinganStageDef(3).kekkeiValue, 'Sharingan (Nível 3)');
  assert.equal(getSharinganStageDef(4).kekkeiValue, 'Mangekyo Sharingan');

  // Distinct progressive stat bonuses across all 4 Sharingan stages
  const uchihaStage1 = makeBaseChar({
    clan: 'Uchiha',
    kekkeiGenkai: 'Sharingan (Nível 1)',
    rank: 'Estudante da Academia',
    level: 2,
    chakraLevel: 1,
    missionsCompleted: 0,
    wins: 0,
    meritPoints: 20,
    ryo: 200,
  });
  const uchihaStage2 = { ...uchihaStage1, kekkeiGenkai: 'Sharingan (Nível 2)' };
  const uchihaStage3 = { ...uchihaStage1, kekkeiGenkai: 'Sharingan (Nível 3)' };
  const uchihaStage4 = { ...uchihaStage1, kekkeiGenkai: 'Mangekyo Sharingan' };

  const s1 = calculateEffectiveStats(uchihaStage1);
  const s2 = calculateEffectiveStats(uchihaStage2);
  const s3 = calculateEffectiveStats(uchihaStage3);
  const s4 = calculateEffectiveStats(uchihaStage4);

  assert.ok(s2.velocidade > s1.velocidade);
  assert.ok(s2.genjutsu > s1.genjutsu);
  assert.ok((s2.evasionBonus || 0) > (s1.evasionBonus || 0));
  assert.ok((s2.accuracyBonus || 0) > (s1.accuracyBonus || 0));
  assert.ok((s2.critBonus || 0) > (s1.critBonus || 0));
  assert.ok((s2.chakraCostReduction || 0) > (s1.chakraCostReduction || 0));

  assert.ok(s3.ninjutsu > s2.ninjutsu);
  assert.ok(s3.genjutsu > s2.genjutsu);
  assert.ok(s3.velocidade > s2.velocidade);
  assert.ok((s3.evasionBonus || 0) > (s2.evasionBonus || 0));
  assert.ok((s3.accuracyBonus || 0) > (s2.accuracyBonus || 0));
  assert.ok((s3.critBonus || 0) > (s2.critBonus || 0));
  assert.ok((s3.chakraCostReduction || 0) > (s2.chakraCostReduction || 0));

  assert.ok(s4.ninjutsu > s3.ninjutsu);
  assert.ok(s4.genjutsu > s3.genjutsu);
  assert.ok(s4.velocidade > s3.velocidade);
  assert.ok((s4.evasionBonus || 0) > (s3.evasionBonus || 0));
  assert.ok((s4.accuracyBonus || 0) > (s3.accuracyBonus || 0));
  assert.ok((s4.critBonus || 0) > (s3.critBonus || 0));
  assert.ok((s4.chakraCostReduction || 0) > (s3.chakraCostReduction || 0));

  // Eligibility: Stage 1 -> Stage 2 -> Stage 3 -> Stage 4 (MS)
  const rookieElig = checkSharinganEvolutionEligibility(uchihaStage1);
  assert.equal(rookieElig.currentStage, 1);
  assert.equal(rookieElig.nextStageDef?.stage, 2);
  assert.equal(rookieElig.eligible, false);

  const readyForStage2 = makeBaseChar({
    clan: 'Uchiha',
    kekkeiGenkai: 'Sharingan (Nível 1)',
    rank: 'Genin',
    level: 5,
    chakraLevel: 2,
    missionsCompleted: 3,
    wins: 2,
    meritPoints: 150,
    ryo: 700,
  });
  const stage2Elig = checkSharinganEvolutionEligibility(readyForStage2);
  assert.equal(stage2Elig.eligible, true);
  assert.equal(stage2Elig.nextStageDef?.kekkeiValue, 'Sharingan (Nível 2)');

  const readyForStage3 = makeBaseChar({
    clan: 'Uchiha',
    kekkeiGenkai: 'Sharingan (Nível 2)',
    rank: 'Chunin',
    level: 8,
    chakraLevel: 3,
    missionsCompleted: 7,
    wins: 5,
    meritPoints: 320,
    ryo: 1300,
  });
  const stage3Elig = checkSharinganEvolutionEligibility(readyForStage3);
  assert.equal(stage3Elig.eligible, true);
  assert.equal(stage3Elig.nextStageDef?.kekkeiValue, 'Sharingan (Nível 3)');

  const readyForMS = makeBaseChar({
    clan: 'Uchiha',
    kekkeiGenkai: 'Sharingan (Nível 3)',
    rank: 'Jonin',
    level: 14,
    chakraLevel: 5,
    missionsCompleted: 12,
    wins: 10,
    meritPoints: 600,
    ryo: 5000,
  });
  const msElig = checkSharinganEvolutionEligibility(readyForMS);
  assert.equal(msElig.eligible, true);
  assert.equal(msElig.nextStageDef?.kekkeiValue, 'Mangekyo Sharingan');

  // Hierarchical Sharingan Jutsu Learning Gates
  const izanagi = JUTSU_CATALOG.find((j) => j.id === 'uchiha_izanagi')!;
  const kagutsuchi = JUTSU_CATALOG.find((j) => j.id === 'enton_kagutsuchi')!;
  const yasaka = JUTSU_CATALOG.find((j) => j.id === 'yasaka_magatama')!;

  const highUchihaS2 = { ...readyForMS, rank: 'Kage' as const, level: 22, chakraLevel: 7, ryo: 15000, kekkeiGenkai: 'Sharingan (Nível 2)' };
  const highUchihaS3 = { ...highUchihaS2, kekkeiGenkai: 'Sharingan (Nível 3)' };
  const highUchihaMS = { ...highUchihaS2, kekkeiGenkai: 'Mangekyo Sharingan' };

  assert.equal(canCharacterLearnJutsu(highUchihaS2, izanagi).allowed, false);
  assert.equal(canCharacterLearnJutsu(highUchihaS3, izanagi).allowed, true);
  assert.equal(canCharacterLearnJutsu(highUchihaMS, izanagi).allowed, true);

  assert.equal(canCharacterLearnJutsu(highUchihaS3, kagutsuchi).allowed, false);
  assert.equal(canCharacterLearnJutsu(highUchihaMS, kagutsuchi).allowed, true);
  assert.equal(canCharacterLearnJutsu(highUchihaMS, yasaka).allowed, true);
});

test('Kenjutsu category provides canonical sword techniques, Dojo filtering, and hybrid blade combat scaling', () => {
  const kenjutsuList = JUTSU_CATALOG.filter((j) => j.category === 'Kenjutsu');
  assert.ok(kenjutsuList.length >= 10, `Expected >= 10 Kenjutsu jutsus, got ${kenjutsuList.length}`);
  assert.ok(kenjutsuList.some((j) => j.id === 'kenjutsu_mikazuki_no_mai'));
  assert.ok(kenjutsuList.some((j) => j.id === 'kenjutsu_iaido'));
  assert.ok(kenjutsuList.some((j) => j.id === 'kenjutsu_chidori_katana'));

  for (const kj of kenjutsuList) {
    assert.equal(classifyJutsuSection(kj), 'Kenjutsu');
    assert.equal(matchesJutsuDojoFilter(kj, 'Kenjutsu', 'Todos'), true);
    const range = getJutsuGridRange(kj);
    assert.equal(range.minRange, 1);
    assert.ok(range.maxRange >= 2 && range.maxRange <= 3);
  }

  const fuutonKenjutsu = JUTSU_CATALOG.filter((j) => matchesJutsuDojoFilter(j, 'Kenjutsu', 'Fuuton'));
  assert.ok(fuutonKenjutsu.length >= 2);
  const raitonKenjutsu = JUTSU_CATALOG.filter((j) => matchesJutsuDojoFilter(j, 'Kenjutsu', 'Raiton'));
  assert.ok(raitonKenjutsu.length >= 1);

  const swordsman = calculateEffectiveStats(
    makeBaseChar({ taijutsu: 26, forca: 22, velocidade: 24, clan: 'Sem Clã (Independente)', kekkeiGenkai: 'Nenhum' })
  );
  const target = calculateEffectiveStats(
    makeBaseChar({ clan: 'Sem Clã (Independente)', kekkeiGenkai: 'Nenhum' })
  );
  const mikazuki = JUTSU_CATALOG.find((j) => j.id === 'kenjutsu_mikazuki_no_mai')!;
  const calc = calculateHitAndDamage(swordsman, 'Katon', target, 'Doton', mikazuki, () => 0.25);
  assert.equal(calc.isHit, true);
  assert.ok(calc.damage > 50);
});

test('Village Play-by-Forum locations return 6 interactive locations with verified imageUrl and openingNarrative for every village', () => {
  for (const v of VILLAGES) {
    const locs = getVillageLocations(v.name);
    assert.equal(locs.length, 6, `Expected 6 locations for ${v.name}`);
    for (const loc of locs) {
      assert.ok(loc.id.length > 3);
      assert.ok(loc.name.length > 3);
      assert.ok(loc.zoneLabel.length > 3);
      assert.ok(loc.description.length > 10);
      assert.ok(loc.ambientPrompt.length > 10);
      assert.ok(
        loc.imageUrl.startsWith('https://static.wikia.nocookie.net/naruto/images/'),
        `Missing verified Narutopedia imageUrl on ${loc.id}`
      );
      assert.ok(
        loc.openingNarrative.length >= 60,
        `Expected rich openingNarrative on ${loc.id}`
      );
    }
  }

  const konohaLocs = getVillageLocations('Konohagakure');
  assert.ok(konohaLocs.some((l) => l.name.includes('Ichiraku')));
  const kiriLocs = getVillageLocations('Kirigakure');
  assert.ok(kiriLocs.some((l) => l.name.includes('Sete Espadachins')));
});

test('Every village has its own dedicated Mission Board across Ranks D-S with zero original canon characters', () => {
  const canonNamesRegex =
    /\b(Naruto|Sasuke|Sakura|Kakashi|Itachi|Madara|Obito|Orochimaru|Kabuto|Jiraiya|Tsunade|Minato|Hashirama|Tobirama|Hiruzen|Danzo|Zabuza|Haku|Kisame|Mei Terumi|Gaara|Kankuro|Temari|Sasori|Deidara|Onoki|Ōnoki|Kakuzu|Hidan|Konan|Nagato|Pain|Hanzo|Kimimaro|Jugo|Might Guy|Rock Lee|Pakkun|Jashin)\b/i;

  for (const v of VILLAGES) {
    const board = getMissionsForVillage(v.name);
    assert.equal(board.length, 10, `Expected 10 dedicated missions for ${v.name}`);
    for (const r of ['D', 'C', 'B', 'A', 'S'] as const) {
      assert.ok(
        board.some((m) => m.rank === r),
        `Expected ${v.name} board to include Rank ${r} missions`
      );
    }
    for (const m of board) {
      assert.equal(m.assignedVillage, v.name);
    }
  }

  // Distinct mission sets between villages
  const konohaIds = new Set(getMissionsForVillage('Konohagakure').map((m) => m.id));
  const sunaIds = new Set(getMissionsForVillage('Sunagakure').map((m) => m.id));
  const kiriIds = new Set(getMissionsForVillage('Kirigakure').map((m) => m.id));
  for (const sid of sunaIds) assert.equal(konohaIds.has(sid), false);
  for (const kid of kiriIds) assert.equal(konohaIds.has(kid), false);

  // Zero original canon characters or portraits in MISSION_TEMPLATES & SPECIAL_JUTSU_QUESTS
  for (const m of MISSION_TEMPLATES) {
    assert.equal(m.enemyAvatar, '', `Mission ${m.id} must not use canon character portrait`);
    assert.equal(canonNamesRegex.test(m.title), false, `Canon name in mission title: ${m.title}`);
    assert.equal(canonNamesRegex.test(m.enemyName), false, `Canon name in mission enemy: ${m.enemyName}`);
    assert.equal(canonNamesRegex.test(m.briefing), false, `Canon name in mission briefing: ${m.briefing}`);
  }

  for (const q of SPECIAL_JUTSU_QUESTS) {
    assert.equal(q.bossAvatar, '', `Quest ${q.id} must not use canon character portrait`);
    assert.equal(canonNamesRegex.test(q.bossName), false, `Canon name in quest bossName: ${q.bossName}`);
    assert.equal(canonNamesRegex.test(q.bossTitle), false, `Canon name in quest bossTitle: ${q.bossTitle}`);
    assert.equal(canonNamesRegex.test(q.description), false, `Canon name in quest description: ${q.description}`);
  }
});

test('Expanded Jutsu Database contains 120+ canonical techniques and 100% verified Narutopedia artwork', () => {
  assert.ok(JUTSU_CATALOG.length >= 120, `Expected at least 120 jutsus, got ${JUTSU_CATALOG.length}`);

  const ids = new Set<string>();
  for (const jutsu of JUTSU_CATALOG) {
    assert.equal(ids.has(jutsu.id), false, `Duplicate jutsu id: ${jutsu.id}`);
    ids.add(jutsu.id);

    const img = getJutsuImage(jutsu);
    assert.ok(
      typeof img === 'string' && img.startsWith('https://static.wikia.nocookie.net/naruto/images/'),
      `Expected verified Narutopedia image URL for jutsu ${jutsu.id}, got "${img}"`
    );
  }

  for (const item of ITEM_CATALOG) {
    assert.ok(
      typeof item.imageUrl === 'string' && item.imageUrl.startsWith('https://static.wikia.nocookie.net/naruto/images/'),
      `Expected verified Narutopedia image URL for item ${item.id}`
    );
  }
});

test('Post-mission loot drops scale by rank, respect village exclusivity, and merge cleanly into inventory', () => {
  // Rank D victory yields at least 1 supply/spoil and never drops Legendary items
  const rankDLoot = rollMissionLootDrops('D', 3, 'Konohagakure', () => 0.25);
  assert.ok(rankDLoot.length >= 1);
  assert.equal(rankDLoot.some((d) => d.rarity === 'Lendário'), false);

  // Rank S victory guarantees at least one Épico/Lendário spoil and never leaks Kirigakure-only swords to Konoha
  const rankSLoot = rollMissionLootDrops('S', 18, 'Konohagakure', () => 0.05);
  assert.ok(rankSLoot.length >= 1);
  assert.ok(
    rankSLoot.some((d) => d.rarity === 'Épico' || d.rarity === 'Lendário'),
    'Expected Rank S victory to drop at least 1 Épico or Lendário spoil'
  );

  for (const drop of rankSLoot) {
    assert.ok(drop.isRareOrAbove || drop.rarity === 'Comum');
    const def = ITEM_CATALOG.find((i) => i.id === drop.itemId);
    assert.ok(def, `Dropped item ${drop.itemId} must exist in ITEM_CATALOG`);
    if (def.villageRequired) {
      assert.equal(def.villageRequired, 'Konohagakure');
    }
  }

  // Merge stacks existing quantities and appends newly obtained items
  const initialInv = [{ itemId: 'kunai_ferro', qty: 3 }];
  const merged = mergeLootIntoInventory(initialInv, [
    { itemId: 'kunai_ferro', qty: 2 },
    { itemId: 'elixir_byakugou', qty: 1 },
  ]);

  assert.equal(merged.length, 2);
  assert.equal(merged.find((i) => i.itemId === 'kunai_ferro')?.qty, 5);
  assert.equal(merged.find((i) => i.itemId === 'elixir_byakugou')?.qty, 1);
});

test('Geopolitics engine models 18-village alliances, enemies, neutrals, active wars, and +15% frontline bonuses', () => {
  const initial = buildDefaultGeopoliticsState();
  assert.ok(initial.conflicts.filter((c) => c.active).length >= 4);

  // Every village accounts for all 17 peer villages across Allied + Enemy + Neutral
  for (const v of VILLAGES) {
    const overview = getVillageGeopoliticsOverview(initial, v.name);
    const totalPeers = overview.allies.length + overview.enemies.length + overview.neutrals.length;
    assert.equal(totalPeers, VILLAGES.length - 1, `Expected 17 peers for ${v.name}, got ${totalPeers}`);
  }

  // Konohagakure starts allied with Sunagakure, in active conflict with Otogakure (+15% frontline bonus)
  const konohaOverview = getVillageGeopoliticsOverview(initial, 'Konohagakure');
  assert.ok(konohaOverview.allies.some((p) => p.village.name === 'Sunagakure'));
  assert.ok(konohaOverview.enemies.some((p) => p.village.name === 'Otogakure' && p.inActiveConflict));

  const konohaBonus = getGeopoliticalMissionBonus(initial, 'Konohagakure');
  assert.equal(konohaBonus.bonusPct, 15);
  assert.equal(konohaBonus.opponentVillage, 'Otogakure');

  // Signing an alliance treaty between belligerents resolves their active armed conflict
  const afterPeace = setBilateralRelation(
    initial,
    'Konohagakure',
    'Otogakure',
    'allied',
    'Armistício da Fronteira Verde',
    'Hokage'
  );
  const konohaAfterPeace = getVillageGeopoliticsOverview(afterPeace, 'Konohagakure');
  assert.ok(konohaAfterPeace.allies.some((p) => p.village.name === 'Otogakure'));
  assert.equal(
    konohaAfterPeace.activeConflicts.some(
      (c) =>
        (c.villageA === 'Konohagakure' && c.villageB === 'Otogakure') ||
        (c.villageA === 'Otogakure' && c.villageB === 'Konohagakure')
    ),
    false
  );

  // Declaring a new conflict automatically marks the pair as enemies and grants +15% frontline bonus
  const afterNewWar = upsertOrResolveConflict(afterPeace, {
    villageA: 'Takigakure',
    villageB: 'Yugakure',
    frontName: 'Cânion das Águas Termais',
    intensity: 78,
    summary: 'Escaramuças pelo controle das nascentes termais da fronteira norte.',
    active: true,
    actorName: 'Conselho Shinobi',
  });
  const takiBonus = getGeopoliticalMissionBonus(afterNewWar, 'Takigakure');
  assert.equal(takiBonus.bonusPct, 15);
  assert.equal(takiBonus.opponentVillage, 'Yugakure');
  const takiOverview = getVillageGeopoliticsOverview(afterNewWar, 'Takigakure');
  assert.ok(takiOverview.enemies.some((p) => p.village.name === 'Yugakure' && p.inActiveConflict));
});

test('Stamina mechanic recovers strictly over time (+1 STA every 2 min) and blocks missions when insufficient', () => {
  assert.equal(getMissionStaminaCost('D', false), 18);
  assert.equal(getMissionStaminaCost('C', false), 24);
  assert.equal(getMissionStaminaCost('B', false), 30);
  assert.equal(getMissionStaminaCost('A', false), 38);
  assert.equal(getMissionStaminaCost('S', false), 45);
  assert.equal(getMissionStaminaCost('D', true), 26);
  assert.equal(formatStaminaCountdown(125), '02:05');

  const t0 = 1_700_000_000_000;
  const charLow = makeBaseChar({
    village: 'Konohagakure',
    stamina: 10,
    maxStamina: 100,
    staminaUpdatedAt: new Date(t0).toISOString(),
  });

  // After 3 minutes (180s), +1 STA recovered (11 STA), 60s until next point
  const snap3m = computeCurrentStamina(charLow, t0 + 180_000);
  assert.equal(snap3m.stamina, 11);
  assert.equal(snap3m.secondsUntilNextPoint, 60);
  assert.equal(snap3m.isFull, false);

  // Trying a Rank D mission (cost 18) at 11 STA is blocked and tells player to rest in RP locations
  const blocked = consumeCharacterStamina(charLow, 18, t0 + 180_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.deficit, 7);
  assert.ok((blocked.reason || '').includes('Konohagakure'));

  // After 20 minutes (10 points recovered -> 20 STA), Rank D mission (18 STA) succeeds -> 2 STA left
  const allowed = consumeCharacterStamina(charLow, 18, t0 + 20 * 60_000);
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.currentStamina, 20);
  assert.equal(allowed.remainingStamina, 2);
});

test('Own-village mission lock & Active War Missions generation work deterministically without canon names', () => {
  const geo = buildDefaultGeopoliticsState();
  const konohaNinja = makeBaseChar({ village: 'Konohagakure', level: 8, missionsCompleted: 12 });
  const kiriNinja = makeBaseChar({ village: 'Kirigakure', level: 8, missionsCompleted: 12 });

  const konohaBoard = getMissionsForVillage('Konohagakure');
  const kiriBoard = getMissionsForVillage('Kirigakure');
  assert.ok(konohaBoard.length > 0 && kiriBoard.length > 0);

  // Own village mission allowed, foreign village mission strictly rejected
  const ownCheck = canExecuteMissionForCharacter(konohaNinja, konohaBoard[0].id, geo);
  assert.equal(ownCheck.allowed, true);
  assert.equal(ownCheck.isWarMission, false);

  const foreignCheck = canExecuteMissionForCharacter(konohaNinja, kiriBoard[0].id, geo);
  assert.equal(foreignCheck.allowed, false);
  assert.ok((foreignCheck.reason || '').includes('Konohagakure'));

  // Active war missions generated for belligerents, allies, and border containment
  const warList = generateActiveWarMissions(geo, konohaNinja);
  assert.ok(warList.length >= 4);
  const directWar = warList.find((w) => w.warMeta?.participationRole === 'belligerent');
  assert.ok(directWar, 'Konohagakure should have direct war missions from active conflict');
  assert.ok(directWar.warMeta!.warBonusRyoPct >= 25);

  const execWar = canExecuteMissionForCharacter(konohaNinja, directWar.id, geo);
  assert.equal(execWar.allowed, true);
  assert.equal(execWar.isWarMission, true);
  assert.ok(execWar.resolvedWarMission);

  // Kiri ninja also gets war campaign missions appropriate to Kirigakure's diplomatic stance
  const kiriWar = generateActiveWarMissions(geo, kiriNinja);
  assert.ok(kiriWar.length >= 4);
});

test('Sharingan starts inactive in battle (bonuses withheld) and unlocks bonuses only when activated', () => {
  const uchihaMs = makeBaseChar({
    clan: 'Uchiha',
    kekkeiGenkai: 'Mangekyou Sharingan',
    ninjutsu: 30,
    genjutsu: 30,
    velocidade: 25,
    inteligencia: 22,
  });

  const statsInactive = calculateEffectiveStats(uchihaMs, {
    inCombat: true,
    sharinganActive: false,
  });
  const statsActive = calculateEffectiveStats(uchihaMs, {
    inCombat: true,
    sharinganActive: true,
  });

  assert.ok(statsActive.genjutsu > statsInactive.genjutsu);
  assert.ok((statsActive.accuracyBonus || 0) > (statsInactive.accuracyBonus || 0));
  assert.ok((statsActive.evasionBonus || 0) > (statsInactive.evasionBonus || 0));
  assert.ok((statsActive.critBonus || 0) > (statsInactive.critBonus || 0));
  assert.ok((statsActive.chakraCostReduction || 0) > (statsInactive.chakraCostReduction || 0));

  // Dojutsu anti-stealth perception requires Sharingan active for Uchiha in combat
  assert.equal(hasDojutsuPerception('Uchiha', 'Kenshin', false), false);
  assert.equal(hasDojutsuPerception('Uchiha', 'Kenshin', true), true);
  assert.equal(hasDojutsuPerception('Hyuuga', 'Hinata', false), true);

  // Sharingan/Mangekyou jutsus are locked while Sharingan is inactive in battle
  const amaterasu = JUTSU_CATALOG.find((j) => j.id === 'amaterasu')!;
  const healthyOcular = getOcularState({ leftEyeBlindness: 0, rightEyeBlindness: 0 });
  assert.equal(canUseOcularJutsuInCombat(amaterasu, false, healthyOcular).allowed, false);
  assert.equal(canUseOcularJutsuInCombat(amaterasu, true, healthyOcular).allowed, true);
});

test('Izanagi & Izanami cause instant 100% blindness per eye, and Mangekyou builds progressive blindness', () => {
  const izanagi = JUTSU_CATALOG.find((j) => j.id === 'uchiha_izanagi')!;
  const izanami = JUTSU_CATALOG.find((j) => j.id === 'uchiha_izanami')!;
  const amaterasu = JUTSU_CATALOG.find((j) => j.id === 'amaterasu')!;
  const susanoo = JUTSU_CATALOG.find((j) => j.id === 'susanoo')!;
  assert.ok(izanagi && izanami && amaterasu && susanoo);

  // 1st cast of Izanagi -> instant 100% blindness in Left Eye (Right Eye stays 0%)
  const firstCast = applyOcularJutsuStrain({ leftEyeBlindness: 0, rightEyeBlindness: 0 }, izanagi);
  assert.equal(firstCast.triggered, true);
  assert.equal(firstCast.instantBlindness, true);
  assert.equal(firstCast.leftEyeBlindness, 100);
  assert.equal(firstCast.rightEyeBlindness, 0);
  assert.equal(firstCast.becameCompletelyBlind, false);

  const oneEyeState = getOcularState(firstCast);
  assert.equal(oneEyeState.leftSealed, true);
  assert.equal(oneEyeState.rightSealed, false);
  assert.equal(oneEyeState.usableEyes, 1);
  assert.ok(oneEyeState.accuracyPenalty >= 10);

  // 2nd cast with Izanami -> instant 100% blindness in Right Eye -> Total Blindness (both eyes 100%)
  const secondCast = applyOcularJutsuStrain(firstCast, izanami);
  assert.equal(secondCast.triggered, true);
  assert.equal(secondCast.instantBlindness, true);
  assert.equal(secondCast.leftEyeBlindness, 100);
  assert.equal(secondCast.rightEyeBlindness, 100);
  assert.equal(secondCast.becameCompletelyBlind, true);

  const blindState = getOcularState(secondCast);
  assert.equal(blindState.bothBlind, true);
  assert.equal(blindState.usableEyes, 0);
  assert.equal(blindState.accuracyPenalty, 28);

  // Totally blind Uchiha cannot activate Sharingan or cast ocular jutsus anymore
  const actCheck = canActivateSharinganInCombat(
    {
      clan: 'Uchiha',
      kekkeiGenkai: 'Mangekyou Sharingan',
      leftEyeBlindness: 100,
      rightEyeBlindness: 100,
    },
    300
  );
  assert.equal(actCheck.allowed, false);
  assert.equal(canUseOcularJutsuInCombat(amaterasu, true, blindState).allowed, false);

  // Progressive Mangekyou blindness build-up from 0%
  let msEyes = { leftEyeBlindness: 0, rightEyeBlindness: 0 };
  const s1 = applyOcularJutsuStrain(msEyes, amaterasu);
  assert.equal(s1.instantBlindness, false);
  assert.ok(s1.leftEyeBlindness > 0 && s1.leftEyeBlindness < 100);
  assert.ok(s1.rightEyeBlindness > 0 && s1.rightEyeBlindness < 100);

  msEyes = { leftEyeBlindness: s1.leftEyeBlindness, rightEyeBlindness: s1.rightEyeBlindness };
  for (let i = 0; i < 6; i++) {
    const step = applyOcularJutsuStrain(msEyes, susanoo);
    msEyes = { leftEyeBlindness: step.leftEyeBlindness, rightEyeBlindness: step.rightEyeBlindness };
  }
  assert.equal(msEyes.leftEyeBlindness, 100);
  assert.equal(msEyes.rightEyeBlindness, 100);
});

test('calculateClanBonuses computes passive attribute, HP/Chakra, combat modifiers, and summary chips per clan', () => {
  const uchiha = calculateClanBonuses('Uchiha', {
    level: 5,
    chakraLevel: 3,
    resistencia: 14,
    controleChakra: 16,
  });
  assert.equal(uchiha.clanName, 'Uchiha');
  assert.equal(uchiha.attributeBoosts.ninjutsu, 4);
  assert.equal(uchiha.attributeBoosts.genjutsu, 4);
  assert.equal(uchiha.attributeBoosts.velocidade, 2);
  assert.equal(uchiha.totalAttributePoints, 10);
  assert.equal(uchiha.accuracyBonus, 7);
  assert.equal(uchiha.critBonus, 5);
  assert.equal(uchiha.natureBonuses.some((n) => n.nature === 'Katon' && n.damageMult === 1.15), true);
  assert.ok(uchiha.summaryChips.includes('NIN +4'));
  assert.ok(uchiha.summaryChips.includes('+7% Precisão'));
  assert.ok(uchiha.summaryChips.includes('+15% Dano Katon'));

  const uzumaki = calculateClanBonuses('Uzumaki', {
    level: 5,
    chakraLevel: 3,
    resistencia: 15,
    controleChakra: 14,
  });
  assert.equal(uzumaki.clanName, 'Uzumaki');
  assert.equal(uzumaki.attributeBoosts.resistencia, 5);
  assert.equal(uzumaki.attributeBoosts.controleChakra, 3);
  assert.ok(uzumaki.hpMultiplier > 1);
  assert.ok(uzumaki.chakraMultiplier > 1);
  assert.ok(uzumaki.calculatedHpBoost > 0);
  assert.ok(uzumaki.calculatedChakraBoost > 0);

  const nara = calculateClanBonuses('Nara', { level: 3, chakraLevel: 2 });
  assert.equal(nara.clanName, 'Nara');
  assert.ok(nara.chakraCostReductionPct > 0);
  assert.ok(nara.evasionBonus > 0 || nara.accuracyBonus > 0);

  const hyuga = calculateClanBonuses('Hyuga', { level: 4, chakraLevel: 2 });
  assert.equal(hyuga.clanName, 'Hyuga');
  assert.equal(hyuga.categoryBonuses.some((c) => c.category === 'Taijutsu' && c.damageMult === 1.15), true);

  const semCla = calculateClanBonuses('Sem Clã (Independente)', { level: 2, chakraLevel: 1 });
  assert.equal(semCla.clanId, 'sem_cla');
  assert.equal(semCla.totalAttributePoints, 10);
  assert.ok(semCla.summaryChips.length > 0);
});

test('getClanJutsuBoostSummary and calculateHitAndDamage expose Clan Bonus multipliers and synergyNotes in combat', () => {
  const katonJutsu = JUTSU_CATALOG.find((j) => j.id === 'katon_goukakyuu')!;
  const taijutsuMove = JUTSU_CATALOG.find((j) => j.category === 'Taijutsu' && j.basePower > 0)!;
  assert.ok(katonJutsu && taijutsuMove);

  const uchihaChar: CharacterModel = {
    id: 901,
    userUid: 'test-uchiha',
    name: 'Itachi Test',
    avatarUrl: '',
    country: 'País do Fogo',
    village: 'Konohagakure',
    clan: 'Uchiha',
    specialization: 'Ninjutsu',
    chakraNature: 'Katon',
    kekkeiGenkai: 'Sharingan (Nível 3)',
    summonContract: 'Nenhum',
    rank: 'Chunin',
    isKage: false,
    level: 8,
    xp: 0,
    chakraLevel: 3,
    chakraXp: 0,
    ryo: 1000,
    meritPoints: 120,
    statPoints: 0,
    hp: 300,
    maxHp: 300,
    chakra: 260,
    maxChakra: 260,
    ninjutsu: 20,
    taijutsu: 12,
    genjutsu: 18,
    velocidade: 16,
    forca: 12,
    inteligencia: 16,
    resistencia: 14,
    controleChakra: 16,
    learnedJutsus: [katonJutsu.id],
    equippedGear: {},
    inventory: [],
    missionsCompleted: 12,
    wins: 6,
    losses: 0,
    bio: '',
  };

  const effUchiha = calculateEffectiveStats(uchihaChar, { inCombat: true, sharinganActive: true });
  const boostSummary = getClanJutsuBoostSummary('Uchiha', effUchiha, katonJutsu);
  assert.equal(boostSummary.damageMult, 1.15);
  assert.equal(boostSummary.damageBonusPct, 15);
  assert.ok(boostSummary.badges.some((b) => b.includes('Clã Uchiha +15% Dano')));

  const defenderStats = calculateEffectiveStats(
    {
      ...uchihaChar,
      id: 902,
      userUid: 'test-def',
      name: 'Bandido',
      clan: 'Sem Clã (Independente)',
      chakraNature: 'Doton',
      kekkeiGenkai: 'Nenhum',
    },
    { inCombat: true, sharinganActive: false }
  );

  const hitResult = calculateHitAndDamage(
    effUchiha,
    'Katon',
    defenderStats,
    'Doton',
    katonJutsu,
    () => 0.1, // guaranteed hit
    { attackerClan: 'Uchiha' }
  );
  assert.equal(hitResult.isHit, true);
  assert.equal(hitResult.clanDamageMultiplier, 1.15);
  assert.ok(hitResult.synergyNotes.some((note) => note.includes('Bônus de Clã (Uchiha): +15% Dano Katon')));

  const hyugaChar: CharacterModel = {
    ...uchihaChar,
    id: 903,
    userUid: 'test-hyuga',
    name: 'Neji Test',
    clan: 'Hyuga',
    kekkeiGenkai: 'Byakugan',
    chakraNature: 'Fuuton',
  };
  const effHyuga = calculateEffectiveStats(hyugaChar, { inCombat: true, sharinganActive: false });
  const hyugaHit = calculateHitAndDamage(
    effHyuga,
    'Fuuton',
    defenderStats,
    'Doton',
    taijutsuMove,
    () => 0.1,
    { attackerClan: 'Hyuga' }
  );
  assert.equal(hyugaHit.isHit, true);
  assert.equal(hyugaHit.clanDamageMultiplier, 1.15);
  assert.ok(hyugaHit.synergyNotes.some((note) => note.includes('Bônus de Clã/Linhagem (Hyuga): +15% Dano Taijutsu')));
});

test('Daily login reward grants Ryo or XP once per UTC day, tracks streaks, and resets on skipped days', () => {
  assert.equal(toUtcDateKey('2026-11-18T14:00:00Z'), '2026-11-18');
  assert.equal(getPreviousUtcDateKey('2026-11-18'), '2026-11-17');
  assert.equal(getPreviousUtcDateKey('2026-01-01'), '2025-12-31');

  const scheduleLv1 = getDailyLoginSchedule(1);
  assert.equal(scheduleLv1.length, 7);
  assert.equal(scheduleLv1[0].rewardType, 'ryo');
  assert.equal(scheduleLv1[0].amount, 120);
  assert.equal(scheduleLv1[1].rewardType, 'xp');
  assert.equal(scheduleLv1[1].amount, 45);

  const rookieChar: CharacterModel = {
    id: 501,
    userUid: 'daily-test',
    name: 'Boruto Rookie',
    avatarUrl: '',
    country: 'País do Fogo',
    village: 'Konohagakure',
    clan: 'Sem Clã (Independente)',
    specialization: 'Taijutsu',
    chakraNature: 'Raiton',
    kekkeiGenkai: 'Nenhum',
    summonContract: 'Nenhum',
    rank: 'Estudante da Academia',
    isKage: false,
    level: 1,
    xp: 90,
    chakraLevel: 1,
    chakraXp: 0,
    ryo: 1500,
    meritPoints: 100,
    statPoints: 0,
    hp: 180,
    maxHp: 180,
    chakra: 150,
    maxChakra: 150,
    ninjutsu: 14,
    taijutsu: 11,
    genjutsu: 9,
    velocidade: 12,
    forca: 11,
    inteligencia: 13,
    resistencia: 11,
    controleChakra: 13,
    learnedJutsus: ['bunshin'],
    equippedGear: {},
    inventory: [],
    missionsCompleted: 0,
    wins: 0,
    losses: 0,
    lastDailyRewardDate: null,
    dailyLoginStreak: 0,
    bio: '',
  };

  // Day 1: First login ever -> eligible, grants Ryo (120 Ryo, 0 XP)
  const day1 = applyDailyLoginReward(rookieChar, '2026-11-18T09:00:00Z');
  assert.equal(day1.claimed, true);
  assert.equal(day1.evaluation.streakDay, 1);
  assert.equal(day1.evaluation.rewardType, 'ryo');
  assert.equal(day1.evaluation.ryoGranted, 120);
  assert.equal(day1.evaluation.xpGranted, 0);
  assert.equal(day1.updated.ryo, 1620);
  assert.equal(day1.updated.lastDailyRewardDate, '2026-11-18');
  assert.equal(day1.updated.dailyLoginStreak, 1);

  // Same-day revisit -> blocked (alreadyClaimedToday = true)
  const sameDay = applyDailyLoginReward(day1.updated, '2026-11-18T23:50:00Z');
  assert.equal(sameDay.claimed, false);
  assert.equal(sameDay.evaluation.alreadyClaimedToday, true);
  assert.equal(sameDay.updated.ryo, 1620);

  // Day 2: Consecutive day -> streakDay = 2, grants XP (45 XP -> 90 + 45 = 135 >= 120 -> Level Up to Lv.2!)
  const day2 = applyDailyLoginReward(day1.updated, '2026-11-19T08:00:00Z');
  assert.equal(day2.claimed, true);
  assert.equal(day2.evaluation.streakDay, 2);
  assert.equal(day2.evaluation.rewardType, 'xp');
  assert.equal(day2.evaluation.xpGranted, 45);
  assert.equal(day2.evaluation.ryoGranted, 0);
  assert.equal(day2.leveledUp, true);
  assert.equal(day2.updated.level, 2);
  assert.equal(day2.updated.statPoints, 4);
  assert.equal(day2.updated.dailyLoginStreak, 2);

  // Skipped a day (2026-11-21 instead of 2026-11-20) -> streak resets to Day 1
  const skippedEval = evaluateDailyLoginReward(day2.updated, '2026-11-21T10:00:00Z');
  assert.equal(skippedEval.eligible, true);
  assert.equal(skippedEval.streakDay, 1);
  assert.equal(skippedEval.rewardType, 'ryo');
});

