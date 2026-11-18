import bcrypt from 'bcryptjs';
import { and, count, eq, inArray, isNotNull, like } from 'drizzle-orm';
import { db } from './index.ts';
import {
  analyticsEvents,
  characters,
  chatMessages,
  forumPosts,
  forumThreads,
  marketListings,
  users,
} from './schema.ts';
import { getVillageLocations, VILLAGES } from '../game/narutoData.ts';

const PORTRAIT_SASUKE =
  'https://static.wikia.nocookie.net/naruto/images/2/21/Sasuke_Part_1.png/revision/latest/scale-to-width-down/800?cb=20170716092103';
const PORTRAIT_GAARA =
  'https://static.wikia.nocookie.net/naruto/images/2/20/Gaara_in_Part_I.png/revision/latest/scale-to-width-down/800?cb=20221010023824';
const PORTRAIT_MEI =
  'https://static.wikia.nocookie.net/naruto/images/6/6f/Mei.png/revision/latest/scale-to-width-down/800?cb=20170927110950';
const PORTRAIT_ONOKI =
  'https://static.wikia.nocookie.net/naruto/images/6/67/%C5%8Cnoki.png/revision/latest?cb=20181203071043';
const PORTRAIT_RAIKAGE =
  'https://static.wikia.nocookie.net/naruto/images/4/4c/Fourth_Raikage_2.png/revision/latest/scale-to-width-down/800?cb=20180901014100';

let seededOnce = false;

async function migrateStaleLocalAvatars() {
  const uidPortraitMap: Array<[string, string]> = [
    ['demo:renjiro', PORTRAIT_SASUKE],
    ['npc:kaze', PORTRAIT_GAARA],
    ['npc:mizuki', PORTRAIT_MEI],
    ['npc:iwao', PORTRAIT_ONOKI],
    ['npc:raiden', PORTRAIT_RAIKAGE],
  ];

  const staleChars = await db
    .select({ id: characters.id, userUid: characters.userUid, avatarUrl: characters.avatarUrl })
    .from(characters)
    .where(like(characters.avatarUrl, '/src/assets/images/%'));

  for (const row of staleChars) {
    const mapped = uidPortraitMap.find(([uid]) => uid === row.userUid)?.[1] ?? '';
    await db.update(characters).set({ avatarUrl: mapped }).where(eq(characters.id, row.id));
  }

  const stalePosts = await db
    .select({ id: forumPosts.id, authorUid: forumPosts.authorUid })
    .from(forumPosts)
    .where(like(forumPosts.characterAvatar, '/src/assets/images/%'));

  for (const row of stalePosts) {
    const mapped = uidPortraitMap.find(([uid]) => uid === row.authorUid)?.[1] ?? '';
    await db.update(forumPosts).set({ characterAvatar: mapped }).where(eq(forumPosts.id, row.id));
  }
}

async function seedVillageLocationThreads() {
  const allLocationSpecs = VILLAGES.flatMap((v) =>
    getVillageLocations(v.name).map((loc) => ({
      village: v.name,
      loc,
      category: `loc:${loc.id}`,
      title: `[Local] ${loc.name} — ${loc.zoneLabel}`,
    }))
  );

  const existingLocThreads = await db
    .select()
    .from(forumThreads)
    .where(like(forumThreads.category, 'loc:%'));

  // Clean up legacy Turn-10 fake test/NPC interactions inside location threads
  const legacyThreadIds = existingLocThreads
    .filter((t) => t.authorUid !== 'system:narrador')
    .map((t) => t.id);

  if (legacyThreadIds.length > 0) {
    await db
      .delete(forumPosts)
      .where(
        and(
          inArray(forumPosts.threadId, legacyThreadIds),
          inArray(forumPosts.authorUid, [
            'demo:renjiro',
            'npc:kaze',
            'npc:mizuki',
            'npc:iwao',
            'npc:raiden',
          ])
        )
      );

    await db
      .update(forumThreads)
      .set({
        authorUid: 'system:narrador',
        authorName: 'Narrador Oficial',
        authorRank: 'Descrição do Local',
      })
      .where(inArray(forumThreads.id, legacyThreadIds));
  }

  const threadByKey = new Map<string, { id: number; village: string; category: string }>();
  for (const t of existingLocThreads) {
    threadByKey.set(`${t.village}::${t.category}`, t);
  }

  const missingThreads = allLocationSpecs
    .filter((spec) => !threadByKey.has(`${spec.village}::${spec.category}`))
    .map((spec) => ({
      title: spec.title,
      village: spec.village,
      category: spec.category,
      authorUid: 'system:narrador',
      authorName: 'Narrador Oficial',
      authorRank: 'Descrição do Local',
      isPinned: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));

  if (missingThreads.length > 0) {
    const inserted = await db.insert(forumThreads).values(missingThreads).returning();
    for (const t of inserted) {
      threadByKey.set(`${t.village}::${t.category}`, t);
    }
  }

  const allThreadIds = Array.from(threadByKey.values()).map((t) => t.id);
  if (allThreadIds.length === 0) return;

  const existingSystemPosts = await db
    .select()
    .from(forumPosts)
    .where(
      and(
        inArray(forumPosts.threadId, allThreadIds),
        eq(forumPosts.authorUid, 'system:narrador')
      )
    );

  const systemPostByThreadId = new Map(existingSystemPosts.map((p) => [p.threadId, p]));

  const missingOpeningPosts = allLocationSpecs
    .map((spec) => {
      const thread = threadByKey.get(`${spec.village}::${spec.category}`);
      if (!thread || systemPostByThreadId.has(thread.id)) return null;
      return {
        threadId: thread.id,
        authorUid: 'system:narrador',
        characterName: spec.loc.name,
        characterAvatar: spec.loc.imageUrl,
        characterVillage: spec.village,
        characterRank: 'Descrição do Local',
        content: spec.loc.openingNarrative,
        actionRoll: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (missingOpeningPosts.length > 0) {
    await db.insert(forumPosts).values(missingOpeningPosts);
  }
}

async function seedRosterNinjas(demoHash?: string) {
  const hash = demoHash || (await bcrypt.hash('shinobi123', 10));
  const rosterSpecs = [
    {
      user: {
        uid: 'npc:kenshin',
        email: 'kenshin@konoha.rpg',
        displayName: 'Kenshin Sarutobi',
        passwordHash: hash,
        role: 'player',
        vipTier: 'jonin_pass',
      },
      char: {
        userUid: 'npc:kenshin',
        name: 'Kenshin Sarutobi',
        avatarUrl: '',
        country: 'País do Fogo',
        village: 'Konohagakure',
        clan: 'Sarutobi',
        specialization: 'Mestre em Ninjutsu Elemental',
        chakraNature: 'Katon',
        secondaryChakraNature: 'Doton',
        kekkeiGenkai: 'Nenhum',
        summonContract: 'Macacos Enma',
        rank: 'Jounin Experiente',
        isKage: false,
        level: 10,
        xp: 140,
        chakraLevel: 4,
        chakraXp: 80,
        ryo: 3600,
        meritPoints: 1120,
        statPoints: 0,
        hp: 380,
        maxHp: 380,
        chakra: 340,
        maxChakra: 340,
        ninjutsu: 25,
        taijutsu: 20,
        genjutsu: 16,
        velocidade: 21,
        forca: 19,
        inteligencia: 23,
        resistencia: 21,
        controleChakra: 24,
        learnedJutsus: ['bunshin', 'kawarimi', 'katon_goukakyuu', 'doton_doryuuheki'],
        equippedGear: { weapon: 'kunai_tatica', armor: 'colete_chunin', headband: 'bandana_vila', accessory: null },
        inventory: [{ itemId: 'kit_medico', qty: 2 }, { itemId: 'pilula_soldado', qty: 2 }],
        missionsCompleted: 26,
        missionCountsByRank: { D: 8, C: 6, B: 5, A: 5, S: 2 },
        wins: 12,
        losses: 2,
        bio: 'Jounin veterano de Konoha dedicado à formação tática de células genin (1 Sensei + 3 Alunos).',
      },
    },
    {
      user: {
        uid: 'npc:hana',
        email: 'hana@konoha.rpg',
        displayName: 'Hana Inuzuka',
        passwordHash: hash,
        role: 'player',
        vipTier: 'genin_free',
      },
      char: {
        userUid: 'npc:hana',
        name: 'Hana Inuzuka',
        avatarUrl: '',
        country: 'País do Fogo',
        village: 'Konohagakure',
        clan: 'Inuzuka',
        specialization: 'Especialista em Taijutsu',
        chakraNature: 'Fuuton',
        kekkeiGenkai: 'Nenhum',
        summonContract: 'Cães Ninjas (Ninken)',
        rank: 'Genin',
        isKage: false,
        level: 4,
        xp: 60,
        chakraLevel: 2,
        chakraXp: 35,
        ryo: 1250,
        meritPoints: 260,
        statPoints: 0,
        hp: 255,
        maxHp: 255,
        chakra: 205,
        maxChakra: 205,
        ninjutsu: 12,
        taijutsu: 20,
        genjutsu: 9,
        velocidade: 19,
        forca: 17,
        inteligencia: 13,
        resistencia: 15,
        controleChakra: 14,
        learnedJutsus: ['bunshin', 'konoha_senpuu', 'fuuton_daitoppa'],
        equippedGear: { weapon: 'kunai_tatica', armor: null, headband: 'bandana_vila', accessory: null },
        inventory: [{ itemId: 'pilula_soldado', qty: 2 }],
        missionsCompleted: 4,
        missionCountsByRank: { D: 3, C: 1, B: 0, A: 0, S: 0 },
        wins: 5,
        losses: 1,
        bio: 'Rastreadora Genin do Clã Inuzuka especialista em investidas rápidas no flanco.',
      },
    },
    {
      user: {
        uid: 'npc:yuna',
        email: 'yuna@konoha.rpg',
        displayName: 'Yuna Yamanaka',
        passwordHash: hash,
        role: 'player',
        vipTier: 'genin_free',
      },
      char: {
        userUid: 'npc:yuna',
        name: 'Yuna Yamanaka',
        avatarUrl: '',
        country: 'País do Fogo',
        village: 'Konohagakure',
        clan: 'Yamanaka',
        specialization: 'Ninja Médico (Iryou-Nin)',
        chakraNature: 'Suiton',
        kekkeiGenkai: 'Nenhum',
        summonContract: 'Nenhum',
        rank: 'Genin',
        isKage: false,
        level: 4,
        xp: 80,
        chakraLevel: 3,
        chakraXp: 40,
        ryo: 1420,
        meritPoints: 310,
        statPoints: 0,
        hp: 245,
        maxHp: 245,
        chakra: 260,
        maxChakra: 260,
        ninjutsu: 15,
        taijutsu: 11,
        genjutsu: 17,
        velocidade: 15,
        forca: 10,
        inteligencia: 19,
        resistencia: 14,
        controleChakra: 21,
        learnedJutsus: ['bunshin', 'shousen_jutsu', 'suiton_teppoudama'],
        equippedGear: { weapon: 'kunai_tatica', armor: null, headband: 'bandana_vila', accessory: null },
        inventory: [{ itemId: 'kit_medico', qty: 3 }],
        missionsCompleted: 5,
        missionCountsByRank: { D: 3, C: 2, B: 0, A: 0, S: 0 },
        wins: 4,
        losses: 1,
        bio: 'Nin-médica e sensorial Genin do Clã Yamanaka focada em sustentação de esquadrão.',
      },
    },
    {
      user: {
        uid: 'npc:daiki',
        email: 'daiki@konoha.rpg',
        displayName: 'Daiki Nara',
        passwordHash: hash,
        role: 'player',
        vipTier: 'genin_free',
      },
      char: {
        userUid: 'npc:daiki',
        name: 'Daiki Nara',
        avatarUrl: '',
        country: 'País do Fogo',
        village: 'Konohagakure',
        clan: 'Nara',
        specialization: 'Genjutsu & Controle Mental',
        chakraNature: 'Doton',
        kekkeiGenkai: 'Nenhum',
        summonContract: 'Nenhum',
        rank: 'Chunin',
        isKage: false,
        level: 6,
        xp: 90,
        chakraLevel: 3,
        chakraXp: 55,
        ryo: 1980,
        meritPoints: 490,
        statPoints: 0,
        hp: 280,
        maxHp: 280,
        chakra: 265,
        maxChakra: 265,
        ninjutsu: 17,
        taijutsu: 13,
        genjutsu: 20,
        velocidade: 15,
        forca: 12,
        inteligencia: 23,
        resistencia: 16,
        controleChakra: 20,
        learnedJutsus: ['bunshin', 'doton_doryuuheki', 'genjutsu_karasu'],
        equippedGear: { weapon: 'kunai_tatica', armor: 'colete_chunin', headband: 'bandana_vila', accessory: null },
        inventory: [{ itemId: 'bomba_fumaca', qty: 2 }, { itemId: 'kit_medico', qty: 1 }],
        missionsCompleted: 9,
        missionCountsByRank: { D: 4, C: 3, B: 2, A: 0, S: 0 },
        wins: 6,
        losses: 2,
        bio: 'Estrategista Chunin do Clã Nara voltado para contenção tática e apoio de célula.',
      },
    },
  ];

  const existingChars = await db
    .select({ userUid: characters.userUid })
    .from(characters)
    .where(inArray(characters.userUid, rosterSpecs.map((r) => r.user.uid)));
  const existingUids = new Set(existingChars.map((c) => c.userUid));

  for (const spec of rosterSpecs) {
    await db.insert(users).values(spec.user).onConflictDoNothing();
    if (!existingUids.has(spec.user.uid)) {
      await db.insert(characters).values(spec.char);
    }
  }
}

async function migrateRankCountsAndSeededBijuu() {
  const allChars = await db.select().from(characters);
  for (const ch of allChars) {
    const counts = ch.missionCountsByRank || { D: 0, C: 0, B: 0, A: 0, S: 0 };
    const totalTracked = (counts.D || 0) + (counts.C || 0) + (counts.B || 0) + (counts.A || 0) + (counts.S || 0);
    if (totalTracked === 0 && (ch.missionsCompleted || 0) > 0) {
      let backfilled = { D: ch.missionsCompleted || 0, C: 0, B: 0, A: 0, S: 0 };
      if (ch.rank === 'Kage' || ch.rank === 'Jounin Experiente') {
        backfilled = { D: 8, C: 6, B: 5, A: 5, S: 2 };
      } else if (ch.rank === 'Jonin') {
        backfilled = { D: 6, C: 5, B: 4, A: 3, S: 0 };
      } else if (ch.rank === 'Tokubetsu Jonin') {
        backfilled = { D: 5, C: 4, B: 2, A: 0, S: 0 };
      } else if (ch.rank === 'Chunin') {
        backfilled = { D: 4, C: 3, B: 1, A: 0, S: 0 };
      } else if (ch.rank === 'Genin') {
        const dCount = Math.min(3, ch.missionsCompleted || 0);
        const cCount = Math.max(0, (ch.missionsCompleted || 0) - dCount);
        backfilled = { D: dCount, C: cCount, B: 0, A: 0, S: 0 };
      }
      await db
        .update(characters)
        .set({ missionCountsByRank: backfilled })
        .where(eq(characters.id, ch.id));
    }
  }

  const [{ value: bijuuHostCount }] = await db
    .select({ value: count() })
    .from(characters)
    .where(isNotNull(characters.jinchuurikiBijuuId));
  if (Number(bijuuHostCount) === 0) {
    await db
      .update(characters)
      .set({ jinchuurikiBijuuId: 'son_goku', bijuuMastery: 65 })
      .where(eq(characters.userUid, 'npc:iwao'));
  }
}

export async function ensureWorldSeeded() {
  if (seededOnce) return;
  try {
    const [{ value: charCount }] = await db.select({ value: count() }).from(characters);
    if (Number(charCount) > 0) {
      await migrateStaleLocalAvatars();
      await seedVillageLocationThreads();
      await seedRosterNinjas();
      await migrateRankCountsAndSeededBijuu();
      seededOnce = true;
      return;
    }

    const demoHash = await bcrypt.hash('shinobi123', 10);

    const seedUsers = [
      { uid: 'demo:renjiro', email: 'renjiro@konoha.rpg', displayName: 'Renjiro Uchiha', passwordHash: demoHash, role: 'admin', vipTier: 'jonin_pass' },
      { uid: 'npc:kaze', email: 'kaze@suna.rpg', displayName: 'Kaze no Sabaku', passwordHash: demoHash, role: 'player', vipTier: 'kage_patron' },
      { uid: 'npc:mizuki', email: 'mizuki@kiri.rpg', displayName: 'Mizuki Hozuki', passwordHash: demoHash, role: 'player', vipTier: 'genin_free' },
      { uid: 'npc:iwao', email: 'iwao@iwa.rpg', displayName: 'Iwao Kamizuru', passwordHash: demoHash, role: 'player', vipTier: 'genin_free' },
      { uid: 'npc:raiden', email: 'raiden@kumo.rpg', displayName: 'Raiden Yotsuki', passwordHash: demoHash, role: 'player', vipTier: 'jonin_pass' },
    ];

    for (const u of seedUsers) {
      await db.insert(users).values(u).onConflictDoNothing();
    }

    await db.insert(characters).values([
      {
        userUid: 'demo:renjiro',
        name: 'Renjiro Uchiha',
        avatarUrl: PORTRAIT_SASUKE,
        country: 'País do Fogo',
        village: 'Konohagakure',
        clan: 'Uchiha',
        specialization: 'Mestre em Ninjutsu Elemental',
        chakraNature: 'Katon',
        kekkeiGenkai: 'Sharingan',
        summonContract: 'Corvos de Ilusão',
        rank: 'Chunin',
        isKage: false,
        level: 6,
        xp: 120,
        chakraLevel: 3,
        chakraXp: 85,
        ryo: 2450,
        meritPoints: 520,
        statPoints: 6,
        hp: 295,
        maxHp: 295,
        chakra: 265,
        maxChakra: 265,
        ninjutsu: 20,
        taijutsu: 15,
        genjutsu: 16,
        velocidade: 17,
        forca: 13,
        inteligencia: 17,
        resistencia: 14,
        controleChakra: 18,
        learnedJutsus: ['bunshin', 'kawarimi', 'katon_goukakyuu', 'konoha_senpuu', 'genjutsu_karasu'],
        equippedGear: { weapon: 'kunai_tatica', armor: 'colete_chunin', headband: 'bandana_vila', accessory: null },
        inventory: [
          { itemId: 'pilula_soldado', qty: 3 },
          { itemId: 'kit_medico', qty: 2 },
          { itemId: 'shuriken_fuuma', qty: 1 },
        ],
        missionsCompleted: 8,
        missionCountsByRank: { D: 4, C: 3, B: 1, A: 0, S: 0 },
        wins: 7,
        losses: 1,
        bio: 'Estrategista tático da Folha especializado em técnicas Katon e leitura Sharingan.',
      },
      {
        userUid: 'npc:kaze',
        name: 'Kaze no Sabaku',
        avatarUrl: PORTRAIT_GAARA,
        country: 'País do Vento',
        village: 'Sunagakure',
        clan: 'Linhagem Kazekage',
        specialization: 'Selador (Fuinjutsu)',
        chakraNature: 'Fuuton',
        kekkeiGenkai: 'Saten (Areia Magnética)',
        summonContract: 'Falcões Mensageiros',
        rank: 'Kage',
        isKage: true,
        level: 16,
        xp: 310,
        chakraLevel: 6,
        chakraXp: 140,
        ryo: 9200,
        meritPoints: 3450,
        statPoints: 0,
        hp: 510,
        maxHp: 510,
        chakra: 490,
        maxChakra: 490,
        ninjutsu: 32,
        taijutsu: 20,
        genjutsu: 21,
        velocidade: 24,
        forca: 19,
        inteligencia: 29,
        resistencia: 28,
        controleChakra: 34,
        learnedJutsus: ['bunshin', 'fuuton_daitoppa', 'fuuin_shishou', 'rasengan'],
        equippedGear: { weapon: 'shuriken_fuuma', armor: 'manto_akatsuki', headband: 'bandana_vila', accessory: 'anel_kage' },
        inventory: [{ itemId: 'pilula_soldado', qty: 5 }],
        missionsCompleted: 28,
        missionCountsByRank: { D: 9, C: 7, B: 5, A: 5, S: 2 },
        wins: 31,
        losses: 4,
        bio: 'Quinto Kazekage guardião das dunas e dos selos magnéticos de Sunagakure.',
      },
      {
        userUid: 'npc:mizuki',
        name: 'Mizuki Hozuki',
        avatarUrl: PORTRAIT_MEI,
        country: 'País da Água',
        village: 'Kirigakure',
        clan: 'Hozuki',
        specialization: 'Espadachim (Kenjutsu)',
        chakraNature: 'Suiton',
        kekkeiGenkai: 'Hyouton (Gelo)',
        summonContract: 'Nenhum',
        rank: 'Kage',
        isKage: true,
        level: 15,
        xp: 220,
        chakraLevel: 5,
        chakraXp: 90,
        ryo: 7800,
        meritPoints: 2980,
        statPoints: 0,
        hp: 465,
        maxHp: 465,
        chakra: 420,
        maxChakra: 420,
        ninjutsu: 28,
        taijutsu: 24,
        genjutsu: 18,
        velocidade: 29,
        forca: 23,
        inteligencia: 24,
        resistencia: 25,
        controleChakra: 27,
        learnedJutsus: ['bunshin', 'suiton_suiryuudan', 'hyouton_makyou'],
        equippedGear: { weapon: 'kubikiribocho', armor: 'colete_chunin', headband: 'bandana_vila', accessory: null },
        inventory: [],
        missionsCompleted: 19,
        wins: 26,
        losses: 3,
        bio: 'Mizukage e mestra das lâminas silenciosas da Névoa Oculta.',
      },
      {
        userUid: 'npc:iwao',
        name: 'Iwao Kamizuru',
        avatarUrl: PORTRAIT_ONOKI,
        country: 'País da Terra',
        village: 'Iwagakure',
        clan: 'Kamizuru',
        specialization: 'Ninja Médico (Iryou-Nin)',
        chakraNature: 'Doton',
        kekkeiGenkai: 'Youton (Lava)',
        summonContract: 'Lesmas da Floresta Shikkotsu (Katsuyu)',
        rank: 'Kage',
        isKage: true,
        level: 14,
        xp: 180,
        chakraLevel: 5,
        chakraXp: 40,
        ryo: 6400,
        meritPoints: 2710,
        statPoints: 0,
        hp: 455,
        maxHp: 455,
        chakra: 405,
        maxChakra: 405,
        ninjutsu: 27,
        taijutsu: 21,
        genjutsu: 16,
        velocidade: 19,
        forca: 25,
        inteligencia: 26,
        resistencia: 30,
        controleChakra: 28,
        learnedJutsus: ['doton_doryuuheki', 'shousen_jutsu'],
        equippedGear: { weapon: 'kunai_tatica', armor: 'armadura_kumo', headband: 'bandana_vila', accessory: null },
        inventory: [],
        missionsCompleted: 26,
        missionCountsByRank: { D: 8, C: 6, B: 5, A: 5, S: 2 },
        wins: 21,
        losses: 5,
        bio: 'Tsuchikage defensor da muralha rochosa e alquimista de enxames.',
      },
      {
        userUid: 'npc:raiden',
        name: 'Raiden Yotsuki',
        avatarUrl: PORTRAIT_RAIKAGE,
        country: 'País do Relâmpago',
        village: 'Kumogakure',
        clan: 'Sem Clã (Independente)',
        specialization: 'Especialista em Taijutsu',
        chakraNature: 'Raiton',
        kekkeiGenkai: 'Ranton (Tempestade)',
        summonContract: 'Águias de Combate',
        rank: 'Kage',
        isKage: true,
        level: 15,
        xp: 190,
        chakraLevel: 5,
        chakraXp: 70,
        ryo: 7100,
        meritPoints: 3120,
        statPoints: 0,
        hp: 480,
        maxHp: 480,
        chakra: 390,
        maxChakra: 390,
        ninjutsu: 24,
        taijutsu: 33,
        genjutsu: 14,
        velocidade: 32,
        forca: 30,
        inteligencia: 21,
        resistencia: 27,
        controleChakra: 24,
        learnedJutsus: ['raiton_jibashi', 'chidori', 'renge'],
        equippedGear: { weapon: 'kusanagi', armor: 'armadura_kumo', headband: 'bandana_vila', accessory: null },
        inventory: [],
        missionsCompleted: 27,
        missionCountsByRank: { D: 9, C: 6, B: 5, A: 5, S: 2 },
        wins: 28,
        losses: 4,
        bio: 'Raikage imbatível em velocidade elétrica e pressão de Nintaijutsu.',
      },
    ]);

    const insertedThreads = await db
      .insert(forumThreads)
      .values([
        {
          title: 'Cúpula dos Cinco Kages: Tensão na Fronteira do País da Chuva',
          village: 'Konohagakure',
          category: 'kage_council',
          authorUid: 'npc:kaze',
          authorName: 'Kaze no Sabaku',
          authorRank: 'Kage',
          isPinned: true,
        },
        {
          title: 'Missão Coletiva: Rastreamento de Pergaminhos na Ponte Tenchi',
          village: 'Konohagakure',
          category: 'rp_narration',
          authorUid: 'demo:renjiro',
          authorName: 'Renjiro Uchiha',
          authorRank: 'Chunin',
          isPinned: false,
        },
        {
          title: 'Arena de Treino da Névoa — Duelo Aberto de Kenjutsu',
          village: 'Kirigakure',
          category: 'spar_duel',
          authorUid: 'npc:mizuki',
          authorName: 'Mizuki Hozuki',
          authorRank: 'Kage',
          isPinned: false,
        },
      ])
      .returning();

    if (insertedThreads.length >= 2) {
      await db.insert(forumPosts).values([
        {
          threadId: insertedThreads[0].id,
          authorUid: 'npc:kaze',
          characterName: 'Kaze no Sabaku',
          characterAvatar: PORTRAIT_GAARA,
          characterVillage: 'Sunagakure',
          characterRank: 'Kage',
          content: 'Os batedores da Areia detectaram assinaturas de chakra incomuns cruzando o vale chuvoso de Amegakure. Solicitamos patrulhas coordenadas de Konoha e Kiri antes do amanhecer.',
          actionRoll: null,
        },
        {
          threadId: insertedThreads[0].id,
          authorUid: 'demo:renjiro',
          characterName: 'Renjiro Uchiha',
          characterAvatar: PORTRAIT_SASUKE,
          characterVillage: 'Konohagakure',
          characterRank: 'Chunin',
          content: 'Esquadrão de reconhecimento da Folha posicionado na crista norte. Ativo o Sharingan e executo uma cortina de fogo tática para iluminar a névoa e testar possíveis armadilhas.',
          actionRoll: {
            jutsuName: 'Katon: Goukakyuu no Jutsu',
            hitChance: 89,
            rolled: 24,
            isHit: true,
            isCrit: false,
            damage: 64,
          },
        },
        {
          threadId: insertedThreads[1].id,
          authorUid: 'demo:renjiro',
          characterName: 'Renjiro Uchiha',
          characterAvatar: PORTRAIT_SASUKE,
          characterVillage: 'Konohagakure',
          characterRank: 'Chunin',
          content: 'A ponte de madeira range sob a chuva fina. Deixo dois clones nas vigas inferiores enquanto avanço pelo arco central em busca do mensageiro desaparecido.',
          actionRoll: null,
        },
        ...(insertedThreads[2]
          ? [
              {
                threadId: insertedThreads[2].id,
                authorUid: 'npc:mizuki',
                characterName: 'Mizuki Hozuki',
                characterAvatar: PORTRAIT_MEI,
                characterVillage: 'Kirigakure',
                characterRank: 'Kage',
                content: 'A névoa densa cobre o lago de treinamento de Kirigakure. Qualquer shinobi que desejar testar lâminas ou técnicas Suiton pode assumir posição na margem leste.',
                actionRoll: null,
              },
            ]
          : []),
      ]);
    }

    await db.insert(marketListings).values([
      {
        sellerUid: 'npc:mizuki',
        sellerName: 'Mizuki Hozuki',
        sellerVillage: 'Kirigakure',
        itemId: 'shuriken_fuuma',
        qty: 1,
        priceRyo: 690,
        status: 'active',
      },
      {
        sellerUid: 'npc:raiden',
        sellerName: 'Raiden Yotsuki',
        sellerVillage: 'Kumogakure',
        itemId: 'armadura_kumo',
        qty: 1,
        priceRyo: 1950,
        status: 'active',
      },
      {
        sellerUid: 'npc:kaze',
        sellerName: 'Kaze no Sabaku',
        sellerVillage: 'Sunagakure',
        itemId: 'pergaminho_selamento',
        qty: 1,
        priceRyo: 820,
        status: 'active',
      },
    ]);

    await db.insert(chatMessages).values([
      {
        channel: 'global',
        senderUid: 'npc:kaze',
        senderName: 'Kaze no Sabaku',
        senderVillage: 'Sunagakure',
        message: 'Conselho Kage aberto. Novos Genins e Chunins podem aceitar missões dinâmicas na Arena!',
      },
      {
        channel: 'village:Konohagakure',
        senderUid: 'demo:renjiro',
        senderName: 'Renjiro Uchiha',
        senderVillage: 'Konohagakure',
        message: 'Alguém disponível para formar time na patrulha da Ponte Tenchi?',
      },
    ]);

    await db.insert(analyticsEvents).values([
      { eventType: 'combat_win', userUid: 'demo:renjiro', characterName: 'Renjiro Uchiha', village: 'Konohagakure', valueNum: 320, meta: { mission: 'Patrulha na Fronteira' } },
      { eventType: 'mission_complete', userUid: 'npc:kaze', characterName: 'Kaze no Sabaku', village: 'Sunagakure', valueNum: 1200, meta: { rank: 'S' } },
      { eventType: 'market_trade', userUid: 'npc:mizuki', characterName: 'Mizuki Hozuki', village: 'Kirigakure', valueNum: 1850, meta: { item: 'kubikiribocho' } },
      { eventType: 'jutsu_learned', userUid: 'npc:raiden', characterName: 'Raiden Yotsuki', village: 'Kumogakure', valueNum: 1500, meta: { jutsu: 'chidori' } },
    ]);

    await seedVillageLocationThreads();
    await seedRosterNinjas(demoHash);
    seededOnce = true;
  } catch (error) {
    console.error('World seed warning (will retry on next request):', error);
  }
}
