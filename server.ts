import http from 'http';
import path from 'path';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import bcrypt from 'bcryptjs';
import { and, desc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  analyticsEvents,
  characters,
  chatMessages,
  customContent,
  forumPosts,
  forumThreads,
  marketListings,
  pvpDuels,
  shinobiTeamMembers,
  shinobiTeams,
  teamMissions,
  users,
} from './src/db/schema.ts';
import { ensureWorldSeeded } from './src/db/seed.ts';
import {
  AuthRequest,
  requireAuth,
  signJwtToken,
  upsertUserRecord,
} from './src/middleware/auth.ts';
import {
  ACADEMY_EXAM_QUESTIONS,
  ACADEMY_PASS_SCORE,
  applyDailyLoginReward,
  applyOcularJutsuStrain,
  applyProgression,
  buildDefaultGeopoliticsState,
  calculateEffectiveStats,
  calculateHitAndDamage,
  canCharacterLearnJutsu,
  canExecuteMissionForCharacter,
  chakraXpRequiredForLevel,
  CharacterModel,
  CharacterProgressSnapshot,
  checkJutsuQuestEligibility,
  checkProfessionEligibility,
  checkSharinganEvolutionEligibility,
  checkSummonQuestEligibility,
  CHUNIN_EXAM_PASS_SCORE,
  CHUNIN_EXAM_QUESTIONS,
  CHUNIN_MISSION_REQUIREMENT,
  computeCurrentStamina,
  consumeCharacterStamina,
  ELEMENTAL_NATURES,
  generateActiveWarMissions,
  generateDynamicMission,
  getBimesterInfo,
  getGeopoliticalMissionBonus,
  getGraduationPathInfo,
  getJutsuQuestById,
  getMissionStaminaCost,
  getOcularState,
  getProfessionByIdOrName,
  getSummonQuestById,
  gradeExam,
  KAGE_APPOINTABLE_RANKS,
  mergeLootIntoInventory,
  normalizeCreationKekkeiGenkai,
  normalizeGeopoliticsState,
  rollMissionLootDrops,
  setBilateralRelation,
  stripExamAnswers,
  upsertOrResolveConflict,
  validateAvatarUrl,
  xpRequiredForLevel,
} from './src/game/engine.ts';
import {
  DiplomaticStatus,
  GeopoliticsWorldState,
  getMissionsForVillage,
  getVillageLocations,
  ITEM_CATALOG,
  JUTSU_CATALOG,
  JutsuDef,
  PROFESSIONS,
  SPECIAL_JUTSU_QUESTS,
  SUMMON_QUESTS,
  VILLAGES,
} from './src/game/narutoData.ts';
import {
  attachPvpOpponent,
  buildInitialPvpState,
  buildInitialTeamMissionState,
  computeTeamSynergy,
  executeSparAiTurn,
  PvpActionPayload,
  PvpBattleState,
  resolvePvpAction,
  resolveTeamMissionMemberAction,
  scaleTeamMission,
  ShinobiTeamMemberRecord,
  ShinobiTeamRecord,
  TEAM_MISSION_TEMPLATES,
  TeamMemberRole,
  TeamMissionActionPayload,
  TeamMissionBattleState,
  validateTeamSlotAddition,
} from './src/game/teamPvpEngine.ts';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function main() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  app.use(express.json({ limit: '1mb' }));

  // Socket.io Real-Time Multi-User Handlers
  const onlinePresence = new Map<string, { uid: string; name: string; village: string }>();

  io.on('connection', (socket) => {
    socket.on('presence:join', (payload: { uid: string; name: string; village: string }) => {
      if (!payload?.uid) return;
      onlinePresence.set(socket.id, payload);
      socket.join(`user:${payload.uid}`);
      if (payload.village) socket.join(`village:${payload.village}`);
      socket.join('global');
      io.emit('presence:list', Array.from(onlinePresence.values()));
    });

    socket.on('chat:join', (channel: string) => {
      if (channel) socket.join(channel);
    });

    socket.on('team:join', (teamId: number | string) => {
      if (teamId) socket.join(`team:${teamId}`);
    });

    socket.on('pvp:join', (duelId: number | string) => {
      if (duelId) socket.join(`pvp:${duelId}`);
    });

    socket.on(
      'chat:send',
      async (payload: {
        channel: string;
        senderUid: string;
        senderName: string;
        senderVillage: string;
        message: string;
      }) => {
        if (!payload?.message?.trim() || !payload.senderUid) return;
        const cleanMsg = payload.message.trim().slice(0, 600);
        try {
          const [saved] = await db
            .insert(chatMessages)
            .values({
              channel: payload.channel || 'global',
              senderUid: payload.senderUid,
              senderName: payload.senderName || 'Shinobi',
              senderVillage: payload.senderVillage || 'Konohagakure',
              message: cleanMsg,
            })
            .returning();

          io.to(payload.channel || 'global').emit('chat:message', saved);
          if (payload.channel?.startsWith('dm:')) {
            const parts = payload.channel.split(':');
            for (const targetUid of parts.slice(1)) {
              if (targetUid !== payload.senderUid) {
                io.to(`user:${targetUid}`).emit('push:notify', {
                  title: `Mensagem de ${payload.senderName}`,
                  body: cleanMsg,
                  kind: 'dm',
                });
              }
            }
          }
        } catch (err) {
          console.error('Socket chat error:', err);
        }
      }
    );

    socket.on('disconnect', () => {
      onlinePresence.delete(socket.id);
      io.emit('presence:list', Array.from(onlinePresence.values()));
    });
  });

  // Health & World Bootstrap
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'konoha-defenders', timestamp: Date.now() });
  });

  // Auth: Instant Demo JWT Session (for frictionless exploration & testing)
  app.post('/api/auth/demo', async (_req, res) => {
    try {
      await ensureWorldSeeded();
      const [demoUser] = await db
        .select()
        .from(users)
        .where(eq(users.uid, 'demo:renjiro'))
        .limit(1);

      const userRecord =
        demoUser ||
        (await upsertUserRecord('demo:renjiro', 'renjiro@konoha.rpg', 'Renjiro Uchiha', 'admin'));

      const token = signJwtToken({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: userRecord.role,
      });

      res.json({ token, user: userRecord });
    } catch (error) {
      console.error('Demo auth error:', error);
      res.status(500).json({ error: 'Falha ao iniciar sessão shinobi.' });
    }
  });

  // Auth: Register with Email/Password (JWT)
  app.post('/api/auth/register', async (req, res) => {
    try {
      await ensureWorldSeeded();
      const { email, password, displayName } = req.body || {};
      if (!email || !password || password.length < 4) {
        return res.status(400).json({ error: 'E-mail válido e senha (mín. 4 caracteres) são obrigatórios.' });
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Este e-mail ninja já está registrado.' });
      }

      const uid = `local:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const passwordHash = await bcrypt.hash(String(password), 10);
      const [created] = await db
        .insert(users)
        .values({
          uid,
          email: normalizedEmail,
          displayName: String(displayName || normalizedEmail.split('@')[0]).slice(0, 40),
          passwordHash,
          role: 'player',
        })
        .returning();

      const token = signJwtToken({
        uid: created.uid,
        email: created.email,
        displayName: created.displayName,
        role: created.role,
      });

      res.status(201).json({ token, user: created });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Erro ao registrar conta.' });
    }
  });

  // Auth: Login with Email/Password (JWT)
  app.post('/api/auth/login', async (req, res) => {
    try {
      await ensureWorldSeeded();
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Informe e-mail e senha.' });
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }
      const valid = await bcrypt.compare(String(password), user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      const token = signJwtToken({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      });

      res.json({ token, user });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro ao autenticar.' });
    }
  });

  // Auth: Sync Google Firebase User & Preferences
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureWorldSeeded();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.uid, req.authUser!.uid))
        .limit(1);
      res.json({ user });
    } catch (error) {
      console.error('Auth me error:', error);
      res.status(500).json({ error: 'Falha ao carregar usuário.' });
    }
  });

  app.patch('/api/auth/preferences', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { language, pushEnabled } = req.body || {};
      const updates: Partial<typeof users.$inferInsert> = {};
      if (typeof language === 'string' && ['pt', 'en', 'es', 'ja'].includes(language)) {
        updates.language = language;
      }
      if (typeof pushEnabled === 'boolean') {
        updates.pushEnabled = pushEnabled;
      }
      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.uid, req.authUser!.uid))
        .returning();
      res.json({ user: updated });
    } catch (error) {
      console.error('Update prefs error:', error);
      res.status(500).json({ error: 'Falha ao salvar preferências.' });
    }
  });

  const withLiveStamina = <T extends typeof characters.$inferSelect>(row: T) => {
    const live = computeCurrentStamina(row as unknown as CharacterModel);
    return {
      ...row,
      stamina: live.stamina,
      maxStamina: live.maxStamina,
    };
  };

  // Characters: Get active user's character (returns null + needsCreation if not yet created)
  app.get('/api/characters/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureWorldSeeded();
      const existing = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      if (existing.length > 0) {
        return res.json({ character: withLiveStamina(existing[0]), needsCreation: false });
      }

      return res.json({ character: null, needsCreation: true });
    } catch (error) {
      console.error('Get character error:', error);
      res.status(500).json({ error: 'Falha ao carregar personagem.' });
    }
  });

  // Daily Login Reward: Grants Ryo or XP on the player's first visit of the UTC day (atomic idempotent update)
  app.post('/api/characters/daily-login', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureWorldSeeded();
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      if (!char) {
        return res.status(404).json({ error: 'Personagem não encontrado. Crie sua ficha primeiro.' });
      }

      const result = applyDailyLoginReward(char as unknown as CharacterModel);
      if (!result.claimed) {
        return res.json({
          claimed: false,
          alreadyClaimedToday: true,
          reward: null,
          character: withLiveStamina(char),
        });
      }

      const [updated] = await db
        .update(characters)
        .set({
          level: result.updated.level,
          xp: result.updated.xp,
          statPoints: result.updated.statPoints,
          ryo: result.updated.ryo,
          maxHp: result.updated.maxHp,
          hp: result.leveledUp ? result.updated.maxHp : result.updated.hp,
          maxChakra: result.updated.maxChakra,
          chakra: result.leveledUp ? result.updated.maxChakra : result.updated.chakra,
          lastDailyRewardDate: result.evaluation.dateKey,
          dailyLoginStreak: result.evaluation.streakDay,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(characters.id, char.id),
            or(
              isNull(characters.lastDailyRewardDate),
              ne(characters.lastDailyRewardDate, result.evaluation.dateKey)
            )
          )
        )
        .returning();

      if (!updated) {
        const [latest] = await db
          .select()
          .from(characters)
          .where(eq(characters.id, char.id))
          .limit(1);
        return res.json({
          claimed: false,
          alreadyClaimedToday: true,
          reward: null,
          character: withLiveStamina(latest || char),
        });
      }

      await db.insert(analyticsEvents).values({
        eventType: 'daily_login_reward',
        userUid: updated.userUid,
        characterName: updated.name,
        village: updated.village,
        valueNum:
          result.evaluation.ryoGranted > 0
            ? result.evaluation.ryoGranted
            : result.evaluation.xpGranted,
        meta: {
          dateKey: result.evaluation.dateKey,
          streakDay: result.evaluation.streakDay,
          rewardType: result.evaluation.rewardType,
          ryoGranted: result.evaluation.ryoGranted,
          xpGranted: result.evaluation.xpGranted,
        },
      });

      return res.json({
        claimed: true,
        alreadyClaimedToday: false,
        reward: {
          ...result.evaluation,
          prevRyo: result.prevRyo,
          newRyo: updated.ryo,
          prevXp: result.prevXp,
          newXp: updated.xp,
          prevLevel: result.prevLevel,
          newLevel: updated.level,
          leveledUp: result.leveledUp,
          xpNeeded: result.xpNeeded,
        },
        character: withLiveStamina(updated),
      });
    } catch (error) {
      console.error('Daily login reward error:', error);
      res.status(500).json({ error: 'Falha ao processar recompensa diária de login.' });
    }
  });

  // Persist Ocular Blindness Strain Immediately When Casting Izanagi, Izanami or Mangekyou Techniques
  app.post('/api/characters/ocular-strain', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { jutsuId, jutsuName, kekkeiRequired } = req.body || {};
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) {
        return res.status(404).json({ error: 'Personagem não encontrado.' });
      }

      const catalogJutsu = JUTSU_CATALOG.find((j) => j.id === String(jutsuId || ''));
      const jutsuRef = catalogJutsu || {
        id: String(jutsuId || ''),
        name: String(jutsuName || jutsuId || 'Técnica Ocular'),
        kekkeiRequired: kekkeiRequired ? String(kekkeiRequired) : undefined,
      };

      const strain = applyOcularJutsuStrain(
        {
          leftEyeBlindness: char.leftEyeBlindness ?? 0,
          rightEyeBlindness: char.rightEyeBlindness ?? 0,
        },
        jutsuRef
      );

      if (!strain.triggered) {
        return res.json({
          character: withLiveStamina(char),
          strain,
          ocular: getOcularState(char),
        });
      }

      const [saved] = await db
        .update(characters)
        .set({
          leftEyeBlindness: strain.leftEyeBlindness,
          rightEyeBlindness: strain.rightEyeBlindness,
          updatedAt: new Date(),
        })
        .where(eq(characters.id, char.id))
        .returning();

      await db.insert(analyticsEvents).values({
        eventType: strain.instantBlindness ? 'ocular_instant_blindness' : 'ocular_mangekyou_strain',
        userUid: saved.userUid,
        characterName: saved.name,
        village: saved.village,
        valueNum: Math.round((strain.leftEyeBlindness + strain.rightEyeBlindness) / 2),
        meta: {
          jutsuId: jutsuRef.id,
          jutsuName: jutsuRef.name,
          leftEyeBlindness: strain.leftEyeBlindness,
          rightEyeBlindness: strain.rightEyeBlindness,
          becameCompletelyBlind: strain.becameCompletelyBlind,
        },
      });

      return res.json({
        character: withLiveStamina(saved),
        strain,
        ocular: getOcularState(saved),
      });
    } catch (error) {
      console.error('Ocular strain error:', error);
      res.status(500).json({ error: 'Erro ao registrar desgaste ocular.' });
    }
  });

  // Update Character Avatar URL Only (all other sheet fields are permanently locked after creation)
  app.put('/api/characters/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const [existing] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: 'Personagem não encontrado. Crie sua ficha primeiro.' });
      }

      const body = req.body || {};
      const lockedFieldChecks: Array<[string, string]> = [
        ['name', String(existing.name)],
        ['village', String(existing.village)],
        ['country', String(existing.country)],
        ['clan', String(existing.clan)],
        ['specialization', String(existing.specialization)],
        ['chakraNature', String(existing.chakraNature)],
        ['kekkeiGenkai', String(existing.kekkeiGenkai)],
        ['summonContract', String(existing.summonContract)],
        ['bio', String(existing.bio)],
      ];

      for (const [field, currentVal] of lockedFieldChecks) {
        if (body[field] !== undefined && String(body[field]).trim() !== currentVal.trim()) {
          return res.status(403).json({
            error:
              'Após a criação da ficha, os campos da ficha ficam bloqueados. Apenas o Link do Avatar (URL) pode ser editado.',
          });
        }
      }

      const nextAvatarUrl =
        body.avatarUrl !== undefined ? validateAvatarUrl(String(body.avatarUrl)) : existing.avatarUrl;

      const [updated] = await db
        .update(characters)
        .set({
          avatarUrl: nextAvatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(characters.id, existing.id))
        .returning();

      await db
        .update(forumPosts)
        .set({
          characterAvatar: updated.avatarUrl,
        })
        .where(eq(forumPosts.authorUid, req.authUser!.uid));

      res.json({ character: updated });
    } catch (error) {
      console.error('Update character error:', error);
      res.status(500).json({ error: 'Falha ao atualizar avatar.' });
    }
  });

  // Create Initial Character Sheet (once per account; subsequent edits locked to avatarUrl only)
  app.post('/api/characters/create', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureWorldSeeded();
      const [existing] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      if (existing) {
        return res.status(403).json({
          error:
            'Sua ficha já foi criada e está bloqueada. Apenas o Link do Avatar (URL) pode ser editado.',
        });
      }

      const body = req.body || {};
      const cleanName = String(body.name || req.authUser!.displayName || '').trim().slice(0, 40);
      if (!cleanName) {
        return res.status(400).json({ error: 'Informe um nome válido para sua ficha shinobi.' });
      }

      const villageName = String(body.village || 'Konohagakure');
      const villageMeta = VILLAGES.find((v) => v.name === villageName);
      const avatarUrl = validateAvatarUrl(String(body.avatarUrl || ''));

      const bonusMap = (body.initialStats || {}) as Record<string, number>;
      const validStats = [
        'ninjutsu',
        'taijutsu',
        'genjutsu',
        'velocidade',
        'forca',
        'inteligencia',
        'resistencia',
        'controleChakra',
      ] as const;

      const baseStats: Record<string, number> = {
        ninjutsu: 14,
        taijutsu: 11,
        genjutsu: 9,
        velocidade: 12,
        forca: 11,
        inteligencia: 13,
        resistencia: 11,
        controleChakra: 13,
      };

      let spentPoints = 0;
      for (const k of validStats) {
        const add = Math.max(0, Math.min(6, Math.floor(Number(bonusMap[k]) || 0)));
        if (spentPoints + add <= 6) {
          baseStats[k] += add;
          spentPoints += add;
        }
      }
      const remainingStatPoints = Math.max(0, 6 - spentPoints);

      const chosenClan = String(body.clan || 'Sem Clã (Independente)');
      const normalizedKekkei = normalizeCreationKekkeiGenkai(
        String(body.kekkeiGenkai || 'Nenhum'),
        chosenClan
      );

      const draft: CharacterModel = {
        id: 0,
        userUid: req.authUser!.uid,
        name: cleanName,
        avatarUrl,
        country: villageMeta ? villageMeta.country : String(body.country || 'País do Fogo'),
        village: villageMeta ? villageMeta.name : 'Konohagakure',
        clan: chosenClan,
        specialization: String(body.specialization || 'Mestre em Ninjutsu Elemental'),
        chakraNature: String(body.chakraNature || 'Katon'),
        secondaryChakraNature: 'Nenhum',
        kekkeiGenkai: normalizedKekkei,
        summonContract: 'Nenhum',
        rank: 'Estudante da Academia',
        profession: 'Nenhuma',
        isKage: false,
        level: 1,
        xp: 0,
        chakraLevel: 1,
        chakraXp: 0,
        ryo: 1500,
        meritPoints: 100,
        statPoints: remainingStatPoints,
        hp: 180,
        maxHp: 180,
        chakra: 150,
        maxChakra: 150,
        ninjutsu: baseStats.ninjutsu,
        taijutsu: baseStats.taijutsu,
        genjutsu: baseStats.genjutsu,
        velocidade: baseStats.velocidade,
        forca: baseStats.forca,
        inteligencia: baseStats.inteligencia,
        resistencia: baseStats.resistencia,
        controleChakra: baseStats.controleChakra,
        learnedJutsus: ['bunshin', 'kawarimi', 'konoha_senpuu'],
        equippedGear: { weapon: 'kunai_tatica', armor: null, headband: 'bandana_vila', accessory: null },
        inventory: [
          { itemId: 'pilula_soldado', qty: 2 },
          { itemId: 'kit_medico', qty: 2 },
        ],
        missionsCompleted: 0,
        wins: 0,
        losses: 0,
        bio: String(body.bio || 'Novo defensor shinobi pronto para missões no fórum Konoha Defenders.').slice(0, 400),
      };

      const eff = calculateEffectiveStats(draft);
      const [savedChar] = await db
        .insert(characters)
        .values({
          userUid: req.authUser!.uid,
          name: draft.name,
          avatarUrl: draft.avatarUrl,
          country: draft.country,
          village: draft.village,
          clan: draft.clan,
          specialization: draft.specialization,
          chakraNature: draft.chakraNature,
          secondaryChakraNature: draft.secondaryChakraNature || 'Nenhum',
          kekkeiGenkai: draft.kekkeiGenkai,
          summonContract: draft.summonContract,
          rank: draft.rank,
          profession: 'Nenhuma',
          isKage: false,
          statPoints: remainingStatPoints,
          hp: eff.maxHp,
          maxHp: eff.maxHp,
          chakra: eff.maxChakra,
          maxChakra: eff.maxChakra,
          ninjutsu: draft.ninjutsu,
          taijutsu: draft.taijutsu,
          genjutsu: draft.genjutsu,
          velocidade: draft.velocidade,
          forca: draft.forca,
          inteligencia: draft.inteligencia,
          resistencia: draft.resistencia,
          controleChakra: draft.controleChakra,
          learnedJutsus: draft.learnedJutsus,
          equippedGear: { weapon: 'kunai_tatica', armor: null, headband: 'bandana_vila', accessory: null },
          inventory: draft.inventory,
          bio: draft.bio,
        })
        .returning();

      res.status(201).json({ character: savedChar });
    } catch (error) {
      console.error('Create character sheet error:', error);
      res.status(500).json({ error: 'Falha ao criar nova ficha ninja.' });
    }
  });

  // Allocate Stat Point
  app.post('/api/characters/allocate-stat', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { stat } = req.body || {};
      const validStats = [
        'ninjutsu',
        'taijutsu',
        'genjutsu',
        'velocidade',
        'forca',
        'inteligencia',
        'resistencia',
        'controleChakra',
      ];
      if (!validStats.includes(stat)) {
        return res.status(400).json({ error: 'Atributo inválido.' });
      }

      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      if (!char || char.statPoints <= 0) {
        return res.status(400).json({ error: 'Sem pontos de atributo disponíveis.' });
      }

      const draft: CharacterModel = {
        ...(char as unknown as CharacterModel),
        [stat]: (char as unknown as Record<string, number>)[stat] + 1,
        statPoints: char.statPoints - 1,
      };
      const eff = calculateEffectiveStats(draft);

      const [updated] = await db
        .update(characters)
        .set({
          [stat]: (draft as unknown as Record<string, number>)[stat],
          statPoints: draft.statPoints,
          maxHp: eff.maxHp,
          hp: eff.maxHp,
          maxChakra: eff.maxChakra,
          chakra: eff.maxChakra,
          updatedAt: new Date(),
        })
        .where(eq(characters.id, char.id))
        .returning();

      res.json({ character: updated });
    } catch (error) {
      console.error('Allocate stat error:', error);
      res.status(500).json({ error: 'Erro ao distribuir atributo.' });
    }
  });

  // Choose or Resign Shinobi Profession (Chunin+: ANBU, Guarda do Portão, Sensei, Médico Ninja; Tokubetsu Jonin+: Interrogador, Espião, Rastreador, Médico Ninja)
  app.post('/api/characters/profession', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { professionId } = req.body || {};
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      if (!char) {
        return res.status(404).json({ error: 'Personagem não encontrado.' });
      }

      if (!professionId || professionId === 'none' || professionId === 'Nenhuma') {
        const draft: CharacterModel = {
          ...(char as unknown as CharacterModel),
          profession: 'Nenhuma',
        };
        const eff = calculateEffectiveStats(draft);
        const [updated] = await db
          .update(characters)
          .set({
            profession: 'Nenhuma',
            maxHp: eff.maxHp,
            hp: Math.min(char.hp, eff.maxHp),
            maxChakra: eff.maxChakra,
            chakra: Math.min(char.chakra, eff.maxChakra),
            updatedAt: new Date(),
          })
          .where(eq(characters.id, char.id))
          .returning();

        return res.json({ character: updated, profession: null });
      }

      const prof =
        getProfessionByIdOrName(String(professionId)) ||
        PROFESSIONS.find((p) => p.id === professionId || p.name === professionId);
      if (!prof) {
        return res.status(404).json({ error: 'Profissão shinobi não encontrada.' });
      }

      const check = checkProfessionEligibility(char as unknown as CharacterModel, prof);
      if (!check.eligible) {
        return res.status(403).json({
          error: check.reason || `Graduação mínima exigida: ${prof.minRank}.`,
        });
      }

      const draft: CharacterModel = {
        ...(char as unknown as CharacterModel),
        profession: prof.name,
      };
      const eff = calculateEffectiveStats(draft);

      const [updated] = await db
        .update(characters)
        .set({
          profession: prof.name,
          maxHp: eff.maxHp,
          hp: eff.maxHp,
          maxChakra: eff.maxChakra,
          chakra: eff.maxChakra,
          updatedAt: new Date(),
        })
        .where(eq(characters.id, char.id))
        .returning();

      res.json({ character: updated, profession: prof });
    } catch (error) {
      console.error('Set profession error:', error);
      res.status(500).json({ error: 'Erro ao definir profissão shinobi.' });
    }
  });

  // Sharingan Evolution (Nível 1 -> Nível 2 -> Mangekyou Sharingan)
  app.post('/api/characters/evolve-sharingan', requireAuth, async (req: AuthRequest, res) => {
    try {
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      if (!char) {
        return res.status(404).json({ error: 'Personagem não encontrado.' });
      }

      const check = checkSharinganEvolutionEligibility(char as unknown as CharacterModel);
      if (!check.eligible || !check.nextStageDef) {
        return res.status(400).json({
          error:
            check.unmetReasons[0] ||
            'Requisitos de evolução ocular ainda não foram cumpridos.',
          unmetReasons: check.unmetReasons,
        });
      }

      const nextStage = check.nextStageDef;
      const draft: CharacterModel = {
        ...(char as unknown as CharacterModel),
        kekkeiGenkai: nextStage.kekkeiValue,
        ryo: Math.max(0, char.ryo - nextStage.costRyo),
      };
      const eff = calculateEffectiveStats(draft);

      const [updated] = await db
        .update(characters)
        .set({
          kekkeiGenkai: nextStage.kekkeiValue,
          ryo: draft.ryo,
          maxHp: eff.maxHp,
          hp: eff.maxHp,
          maxChakra: eff.maxChakra,
          chakra: eff.maxChakra,
          updatedAt: new Date(),
        })
        .where(eq(characters.id, char.id))
        .returning();

      await db.insert(analyticsEvents).values({
        eventType: 'sharingan_evolved',
        userUid: req.authUser!.uid,
        characterName: updated.name,
        village: updated.village,
        valueNum: nextStage.costRyo,
        meta: {
          stage: nextStage.stage,
          kekkeiValue: nextStage.kekkeiValue,
          title: nextStage.title,
        },
      });

      res.json({ character: updated, stage: nextStage });
    } catch (error) {
      console.error('Evolve Sharingan error:', error);
      res.status(500).json({ error: 'Erro ao evoluir o Sharingan.' });
    }
  });

  // Learn Jutsu (enforces graduation rank limits & owned chakra elements)
  app.post('/api/characters/learn-jutsu', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { jutsuId } = req.body || {};
      const customRows = await db.select().from(customContent).where(eq(customContent.kind, 'jutsu'));
      const customJutsus = customRows.map((r) => r.payload as unknown as (typeof JUTSU_CATALOG)[number]);
      const allJutsus = [...JUTSU_CATALOG, ...customJutsus];
      const jutsu = allJutsus.find((j) => j.id === jutsuId);
      if (!jutsu) return res.status(404).json({ error: 'Jutsu não encontrado.' });

      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const check = canCharacterLearnJutsu(char as unknown as CharacterModel, jutsu);
      if (!check.allowed) {
        return res.status(400).json({ error: check.reason || 'Não é possível aprender esta técnica.' });
      }

      const nextJutsus = [...char.learnedJutsus, jutsu.id];
      const [updated] = await db
        .update(characters)
        .set({
          learnedJutsus: nextJutsus,
          ryo: char.ryo - jutsu.learnCostRyo,
          updatedAt: new Date(),
        })
        .where(eq(characters.id, char.id))
        .returning();

      await db.insert(analyticsEvents).values({
        eventType: 'jutsu_learned',
        userUid: req.authUser!.uid,
        characterName: char.name,
        village: char.village,
        valueNum: jutsu.learnCostRyo,
        meta: { jutsuId: jutsu.id, jutsuName: jutsu.name },
      });

      res.json({ character: updated });
    } catch (error) {
      console.error('Learn jutsu error:', error);
      res.status(500).json({ error: 'Erro ao aprender jutsu.' });
    }
  });

  // Shop Buy & Equip Gear
  app.post('/api/inventory/buy', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { itemId } = req.body || {};
      const item = ITEM_CATALOG.find((i) => i.id === itemId);
      if (!item) return res.status(404).json({ error: 'Item não encontrado.' });
      if (item.dropOnly) {
        return res.status(400).json({
          error: 'Este artefato é um espólio raro obtido apenas em missões ou no Mercado P2P.',
        });
      }

      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });
      if (item.villageRequired && char.village !== item.villageRequired) {
        return res.status(403).json({
          error: `Apenas ninjas de ${item.villageRequired} podem adquirir ${item.name}.`,
        });
      }
      if (char.ryo < item.priceRyo) {
        return res.status(400).json({ error: 'Ryo insuficiente.' });
      }

      const inv = [...(char.inventory || [])];
      const existingIdx = inv.findIndex((entry) => entry.itemId === item.id);
      if (existingIdx >= 0) {
        inv[existingIdx] = { ...inv[existingIdx], qty: inv[existingIdx].qty + 1 };
      } else {
        inv.push({ itemId: item.id, qty: 1 });
      }

      const [updated] = await db
        .update(characters)
        .set({ ryo: char.ryo - item.priceRyo, inventory: inv, updatedAt: new Date() })
        .where(eq(characters.id, char.id))
        .returning();

      res.json({ character: updated });
    } catch (error) {
      console.error('Buy item error:', error);
      res.status(500).json({ error: 'Erro ao comprar item.' });
    }
  });

  app.post('/api/inventory/equip', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { itemId, unequipSlot } = req.body || {};
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const equipped = { ...(char.equippedGear || { weapon: null, armor: null, headband: null, accessory: null }) };
      const inv = [...(char.inventory || [])];

      if (unequipSlot) {
        const currentEquippedId = equipped[unequipSlot as keyof typeof equipped];
        if (currentEquippedId) {
          const idx = inv.findIndex((i) => i.itemId === currentEquippedId);
          if (idx >= 0) inv[idx] = { ...inv[idx], qty: inv[idx].qty + 1 };
          else inv.push({ itemId: currentEquippedId, qty: 1 });
          equipped[unequipSlot as keyof typeof equipped] = null;
        }
      } else if (itemId) {
        const item = ITEM_CATALOG.find((i) => i.id === itemId);
        if (!item || item.category === 'consumable') {
          return res.status(400).json({ error: 'Item não equipável.' });
        }
        if (item.villageRequired && char.village !== item.villageRequired) {
          return res.status(403).json({
            error: `Apenas ninjas de ${item.villageRequired} podem empunhar ${item.name}.`,
          });
        }
        const invIdx = inv.findIndex((i) => i.itemId === itemId && i.qty > 0);
        if (invIdx < 0) {
          return res.status(400).json({ error: 'Item não está no inventário.' });
        }

        // Remove 1 from bag
        if (inv[invIdx].qty <= 1) inv.splice(invIdx, 1);
        else inv[invIdx] = { ...inv[invIdx], qty: inv[invIdx].qty - 1 };

        // Return previously equipped item to bag
        const prev = equipped[item.category];
        if (prev) {
          const prevIdx = inv.findIndex((i) => i.itemId === prev);
          if (prevIdx >= 0) inv[prevIdx] = { ...inv[prevIdx], qty: inv[prevIdx].qty + 1 };
          else inv.push({ itemId: prev, qty: 1 });
        }
        equipped[item.category] = item.id;
      }

      const draft = { ...(char as unknown as CharacterModel), equippedGear: equipped, inventory: inv };
      const eff = calculateEffectiveStats(draft);

      const [updated] = await db
        .update(characters)
        .set({
          equippedGear: equipped,
          inventory: inv,
          maxHp: eff.maxHp,
          hp: eff.maxHp,
          maxChakra: eff.maxChakra,
          chakra: eff.maxChakra,
          updatedAt: new Date(),
        })
        .where(eq(characters.id, char.id))
        .returning();

      res.json({ character: updated });
    } catch (error) {
      console.error('Equip error:', error);
      res.status(500).json({ error: 'Erro ao equipar item.' });
    }
  });

  // Geopolitics Persistence & Diplomacy API
  const GEOPOLITICS_SLUG = 'world_geopolitics_v1';

  async function getOrInitGeopoliticsState(): Promise<GeopoliticsWorldState> {
    const [existing] = await db
      .select()
      .from(customContent)
      .where(and(eq(customContent.kind, 'geopolitics'), eq(customContent.slug, GEOPOLITICS_SLUG)))
      .limit(1);
    if (existing && existing.payload) {
      return normalizeGeopoliticsState(existing.payload);
    }
    const seeded = buildDefaultGeopoliticsState();
    await db
      .insert(customContent)
      .values({
        kind: 'geopolitics',
        slug: GEOPOLITICS_SLUG,
        title: 'Geopolítica Mundial Shinobi',
        payload: seeded as unknown as Record<string, unknown>,
        createdByUid: 'system:council',
      })
      .onConflictDoNothing();
    return seeded;
  }

  async function saveGeopoliticsState(nextState: GeopoliticsWorldState): Promise<void> {
    const [existing] = await db
      .select()
      .from(customContent)
      .where(and(eq(customContent.kind, 'geopolitics'), eq(customContent.slug, GEOPOLITICS_SLUG)))
      .limit(1);
    if (existing) {
      await db
        .update(customContent)
        .set({ payload: nextState as unknown as Record<string, unknown> })
        .where(eq(customContent.id, existing.id));
    } else {
      await db.insert(customContent).values({
        kind: 'geopolitics',
        slug: GEOPOLITICS_SLUG,
        title: 'Geopolítica Mundial Shinobi',
        payload: nextState as unknown as Record<string, unknown>,
        createdByUid: 'system:council',
      });
    }
  }

  app.get('/api/geopolitics', requireAuth, async (_req, res) => {
    try {
      await ensureWorldSeeded();
      const geopolitics = await getOrInitGeopoliticsState();
      res.json({ geopolitics });
    } catch (error) {
      console.error('Geopolitics fetch error:', error);
      res.status(500).json({ error: 'Erro ao carregar painel geopolítico.' });
    }
  });

  app.post('/api/geopolitics/relation', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { villageA, villageB, status, treatyTitle } = req.body || {};
      const validStatuses: DiplomaticStatus[] = ['allied', 'enemy', 'neutral'];
      if (!villageA || !villageB || villageA === villageB || !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Selecione duas vilas distintas e um status válido.' });
      }
      const vAExists = VILLAGES.some((v) => v.name === villageA);
      const vBExists = VILLAGES.some((v) => v.name === villageB);
      if (!vAExists || !vBExists) {
        return res.status(400).json({ error: 'Vilarejo inválido.' });
      }

      const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.uid, req.authUser!.uid))
        .limit(1);
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      const isAdmin = userRecord?.role === 'admin';
      const isAuthorizedKage =
        Boolean(char?.isKage) && (char?.village === villageA || char?.village === villageB);

      if (!isAdmin && !isAuthorizedKage) {
        return res.status(403).json({
          error: 'Apenas o Kage regente da vila envolvida ou a Administração podem alterar tratados diplomáticos.',
        });
      }

      const actorName = char?.name || req.authUser!.displayName || 'Chancelaria Kage';
      const current = await getOrInitGeopoliticsState();
      const next = setBilateralRelation(
        current,
        String(villageA),
        String(villageB),
        status as DiplomaticStatus,
        String(treatyTitle || ''),
        actorName
      );
      await saveGeopoliticsState(next);

      const statusPt =
        status === 'allied' ? 'Aliança' : status === 'enemy' ? 'Hostilidade' : 'Neutralidade';
      io.emit('geopolitics:updated', next);
      io.emit('push:notify', {
        title: `Tratado Diplomático: ${villageA} & ${villageB}`,
        body: `${actorName} declarou estado de ${statusPt} entre ${villageA} e ${villageB}.`,
        kind: 'geopolitics',
      });

      res.json({ geopolitics: next });
    } catch (error) {
      console.error('Update geopolitical relation error:', error);
      res.status(500).json({ error: 'Erro ao atualizar tratado diplomático.' });
    }
  });

  app.post('/api/geopolitics/conflict', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { villageA, villageB, frontName, conflictType, intensity, summary, active } = req.body || {};
      if (!villageA || !villageB || villageA === villageB) {
        return res.status(400).json({ error: 'Selecione duas vilas distintas para o confronto.' });
      }
      const vAExists = VILLAGES.some((v) => v.name === villageA);
      const vBExists = VILLAGES.some((v) => v.name === villageB);
      if (!vAExists || !vBExists) {
        return res.status(400).json({ error: 'Vilarejo inválido.' });
      }

      const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.uid, req.authUser!.uid))
        .limit(1);
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      const isAdmin = userRecord?.role === 'admin';
      const isAuthorizedKage =
        Boolean(char?.isKage) && (char?.village === villageA || char?.village === villageB);

      if (!isAdmin && !isAuthorizedKage) {
        return res.status(403).json({
          error: 'Apenas o Kage regente da vila envolvida ou a Administração podem declarar ou encerrar confrontos.',
        });
      }

      const actorName = char?.name || req.authUser!.displayName || 'Conselho Militar';
      const current = await getOrInitGeopoliticsState();
      const next = upsertOrResolveConflict(current, {
        villageA: String(villageA),
        villageB: String(villageB),
        frontName: frontName ? String(frontName) : undefined,
        conflictType: conflictType ? String(conflictType) : undefined,
        intensity: intensity !== undefined ? Number(intensity) : undefined,
        summary: summary ? String(summary) : undefined,
        active: Boolean(active),
        actorName,
      });
      await saveGeopoliticsState(next);

      io.emit('geopolitics:updated', next);
      io.emit('push:notify', {
        title: Boolean(active)
          ? `Confronto Declarado: ${villageA} vs ${villageB}`
          : `Cessar-Fogo Assinado: ${villageA} & ${villageB}`,
        body: Boolean(active)
          ? `Frente ativa em ${frontName || `${villageA}–${villageB}`} (+15% Ryo & Mérito em missões locais).`
          : `${actorName} encerrou as operações militares abertas entre ${villageA} e ${villageB}.`,
        kind: 'geopolitics',
      });

      res.json({ geopolitics: next });
    } catch (error) {
      console.error('Update geopolitical conflict error:', error);
      res.status(500).json({ error: 'Erro ao atualizar confronto geopolítico.' });
    }
  });

  // Dynamic Missions & Combat Resolution (Locked Exclusively to Character's Own Village + Active War Missions)
  app.get('/api/missions/dynamic', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureWorldSeeded();
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      const customMissionRows = await db.select().from(customContent).where(eq(customContent.kind, 'mission'));
      const customJutsuRows = await db.select().from(customContent).where(eq(customContent.kind, 'jutsu'));
      const geoState = await getOrInitGeopoliticsState();

      const requestedVillageRaw = req.query.village ? String(req.query.village).trim() : '';
      if (
        char?.village &&
        requestedVillageRaw &&
        requestedVillageRaw.toLowerCase() !== char.village.toLowerCase() &&
        req.query.strict === '1'
      ) {
        return res.status(403).json({
          error: `Acesso restrito: ninjas de ${char.village} só podem acessar o quadro de missões de ${char.village}.`,
        });
      }

      const boardVillage = char?.village || 'Konohagakure';

      const villageTemplates = getMissionsForVillage(boardVillage);
      const scaled = villageTemplates.map((tpl) =>
        generateDynamicMission(
          char || { level: 1, missionsCompleted: 0, village: boardVillage },
          tpl.id,
          boardVillage
        )
      );

      const customScaled = customMissionRows
        .filter((row) => {
          const p = row.payload as Record<string, unknown>;
          if (!p.village) return true;
          return String(p.village).toLowerCase() === boardVillage.toLowerCase();
        })
        .map((row) => {
          const p = row.payload as Record<string, unknown>;
          const baseHp = Number(p.baseHp) || 180;
          const rank = ((p.rank as 'D' | 'C' | 'B' | 'A' | 'S') || 'B');
          const scale = 1 + Math.max(0, (char?.level || 1) - 1) * 0.1;
          return {
            id: row.slug,
            assignedVillage: boardVillage,
            title: row.title,
            rank,
            minLevel: 1,
            enemyName: `Guardião de ${row.title}`,
            enemyClan: 'Sem Clã (Independente)',
            enemyVillage: boardVillage,
            enemyAvatar: '',
            enemyNature: 'Katon' as const,
            baseHp,
            baseAttack: Math.round(baseHp * 0.16),
            baseSpeed: 15,
            baseXp: Math.round(baseHp * 1.1),
            baseChakraXp: Math.round(baseHp * 0.8),
            baseRyo: Math.round(baseHp * 3),
            baseMerit: Math.round(baseHp * 0.5),
            briefing: 'Missão especial publicada pelo Conselho Administrativo.',
            difficultyScale: Number(scale.toFixed(2)),
            staminaCost: getMissionStaminaCost(rank, false),
            scaledHp: Math.round(baseHp * scale),
            scaledAttack: Math.round(baseHp * 0.16 * scale),
            scaledSpeed: Math.round(15 * scale),
            rewardXp: Math.round(baseHp * 1.1 * scale),
            rewardChakraXp: Math.round(baseHp * 0.8 * scale),
            rewardRyo: Math.round(baseHp * 3 * scale),
            rewardMerit: Math.round(baseHp * 0.5 * scale),
          };
        });

      const warMissions = generateActiveWarMissions(
        geoState,
        (char as unknown as CharacterModel) || {
          village: boardVillage,
          level: 1,
          missionsCompleted: 0,
        }
      );

      res.json({
        boardVillage,
        missions: [...scaled, ...customScaled],
        warMissions,
        customJutsus: customJutsuRows.map((r) => r.payload),
      });
    } catch (error) {
      console.error('Dynamic missions error:', error);
      res.status(500).json({ error: 'Erro ao gerar missões dinâmicas.' });
    }
  });

  app.post('/api/combat/complete', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { missionId, won, consumedItems, ocularState, ocularEvents } = req.body || {};
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const geoState = await getOrInitGeopoliticsState();
      const accessCheck = canExecuteMissionForCharacter(
        char as unknown as CharacterModel,
        String(missionId || ''),
        geoState
      );
      if (!accessCheck.allowed) {
        return res.status(403).json({
          error:
            accessCheck.reason ||
            `Ninjas de ${char.village} só podem realizar o quadro de missões de ${char.village}.`,
        });
      }

      let mission =
        accessCheck.isWarMission && accessCheck.resolvedWarMission
          ? accessCheck.resolvedWarMission
          : generateDynamicMission(
              char as unknown as CharacterModel,
              missionId,
              char.village
            );

      if (!accessCheck.isWarMission && missionId && mission.id !== missionId) {
        const [customRow] = await db
          .select()
          .from(customContent)
          .where(and(eq(customContent.kind, 'mission'), eq(customContent.slug, String(missionId))))
          .limit(1);
        if (customRow) {
          const p = customRow.payload as Record<string, unknown>;
          if (p.village && String(p.village).toLowerCase() !== char.village.toLowerCase()) {
            return res.status(403).json({
              error: `Acesso restrito: esta missão pertence exclusivamente a ${String(p.village)}.`,
            });
          }
          const baseHp = Number(p.baseHp) || 180;
          const rank = ((p.rank as 'D' | 'C' | 'B' | 'A' | 'S') || 'B');
          const scale = 1 + Math.max(0, (char.level || 1) - 1) * 0.1;
          mission = {
            ...mission,
            id: customRow.slug,
            assignedVillage: char.village,
            rank,
            title: customRow.title,
            staminaCost: getMissionStaminaCost(rank, false),
            rewardXp: Math.round(baseHp * 1.1 * scale),
            rewardChakraXp: Math.round(baseHp * 0.8 * scale),
            rewardRyo: Math.round(baseHp * 3 * scale),
            rewardMerit: Math.round(baseHp * 0.5 * scale),
          };
        }
      }

      const requiredStamina =
        mission.staminaCost ?? getMissionStaminaCost(mission.rank, accessCheck.isWarMission);
      const staminaConsumption = consumeCharacterStamina(
        char as unknown as CharacterModel,
        requiredStamina
      );
      if (!staminaConsumption.allowed) {
        return res.status(400).json({
          error: staminaConsumption.reason,
          stamina: staminaConsumption.currentStamina,
          requiredStamina,
          waitSeconds: staminaConsumption.waitSeconds,
        });
      }

      const nextLeftBlindness = Math.max(
        char.leftEyeBlindness ?? 0,
        Math.min(100, Math.round(Number(ocularState?.leftEyeBlindness) || 0))
      );
      const nextRightBlindness = Math.max(
        char.rightEyeBlindness ?? 0,
        Math.min(100, Math.round(Number(ocularState?.rightEyeBlindness) || 0))
      );

      const inv = [...(char.inventory || [])];
      if (Array.isArray(consumedItems)) {
        for (const usedId of consumedItems) {
          const idx = inv.findIndex((i) => i.itemId === usedId && i.qty > 0);
          if (idx >= 0) {
            if (inv[idx].qty <= 1) inv.splice(idx, 1);
            else inv[idx] = { ...inv[idx], qty: inv[idx].qty - 1 };
          }
        }
      }

      const geoBonus = getGeopoliticalMissionBonus(geoState, char.village);
      const isWarMission = Boolean(accessCheck.isWarMission && mission.warMeta);

      if (won) {
        let baseRyo = mission.rewardRyo;
        let geopoliticalBonusRyo = 0;
        let totalRyo = mission.rewardRyo;
        let baseMerit = mission.rewardMerit;
        let geopoliticalBonusMerit = 0;
        let totalMerit = mission.rewardMerit;
        let effectiveBonusPct = geoBonus.bonusPct;
        let effectiveFront = geoBonus.frontName;

        if (isWarMission && mission.warMeta) {
          effectiveBonusPct = mission.warMeta.warBonusRyoPct;
          effectiveFront = mission.warMeta.frontName;
          baseRyo = Math.round(mission.rewardRyo / (1 + effectiveBonusPct / 100));
          geopoliticalBonusRyo = Math.max(0, mission.rewardRyo - baseRyo);
          totalRyo = mission.rewardRyo;

          baseMerit = Math.round(
            mission.rewardMerit / (1 + mission.warMeta.warBonusMeritPct / 100)
          );
          geopoliticalBonusMerit = Math.max(0, mission.rewardMerit - baseMerit);
          totalMerit = mission.rewardMerit;
        } else if (geoBonus.bonusPct > 0) {
          geopoliticalBonusRyo = Math.round(baseRyo * (geoBonus.bonusPct / 100));
          totalRyo = baseRyo + geopoliticalBonusRyo;
          geopoliticalBonusMerit = Math.round(baseMerit * (geoBonus.bonusPct / 100));
          totalMerit = baseMerit + geopoliticalBonusMerit;
        }

        const lootDrops = rollMissionLootDrops(mission.rank, char.level, char.village);
        const invWithLoot = mergeLootIntoInventory(inv, lootDrops);

        const progression = applyProgression(
          { ...(char as unknown as CharacterModel), inventory: invWithLoot },
          mission.rewardXp,
          mission.rewardChakraXp,
          totalRyo,
          totalMerit
        );

        const becameKage = false;

        const [saved] = await db
          .update(characters)
          .set({
            level: progression.updated.level,
            xp: progression.updated.xp,
            chakraLevel: progression.updated.chakraLevel,
            chakraXp: progression.updated.chakraXp,
            statPoints: progression.updated.statPoints,
            meritPoints: progression.updated.meritPoints,
            ryo: progression.updated.ryo,
            rank: progression.updated.rank,
            isKage: progression.updated.isKage,
            maxHp: progression.updated.maxHp,
            hp: progression.updated.maxHp,
            maxChakra: progression.updated.maxChakra,
            chakra: progression.updated.maxChakra,
            stamina: staminaConsumption.remainingStamina,
            staminaUpdatedAt: staminaConsumption.nextUpdatedAt,
            leftEyeBlindness: nextLeftBlindness,
            rightEyeBlindness: nextRightBlindness,
            inventory: invWithLoot,
            missionsCompleted: char.missionsCompleted + 1,
            wins: char.wins + 1,
            updatedAt: new Date(),
          })
          .where(eq(characters.id, char.id))
          .returning();

        const characterProgress: CharacterProgressSnapshot = {
          prevLevel: char.level,
          newLevel: saved.level,
          prevXp: char.xp,
          newXp: saved.xp,
          xpNeeded: xpRequiredForLevel(saved.level),
          prevChakraLevel: char.chakraLevel,
          newChakraLevel: saved.chakraLevel,
          prevChakraXp: char.chakraXp,
          newChakraXp: saved.chakraXp,
          chakraXpNeeded: chakraXpRequiredForLevel(saved.chakraLevel),
          prevRyo: char.ryo,
          newRyo: saved.ryo,
          prevRank: char.rank,
          newRank: saved.rank,
        };

        const ocularSummary =
          nextLeftBlindness > 0 ||
          nextRightBlindness > 0 ||
          (Array.isArray(ocularEvents) && ocularEvents.length > 0)
            ? {
                leftBlindness: nextLeftBlindness,
                rightBlindness: nextRightBlindness,
                visionLabel: getOcularState(saved).visionLabel,
                events: Array.isArray(ocularEvents)
                  ? ocularEvents.map((e: unknown) => String(e))
                  : [],
              }
            : null;

        await db.insert(analyticsEvents).values({
          eventType: isWarMission ? 'war_mission_win' : 'combat_win',
          userUid: req.authUser!.uid,
          characterName: saved.name,
          village: saved.village,
          valueNum: totalRyo,
          meta: {
            mission: mission.title,
            isWarMission,
            staminaSpent: staminaConsumption.cost,
            leveledUp: progression.leveledUp,
            becameKage,
            geopoliticalBonusPct: effectiveBonusPct,
            lootDrops: lootDrops.map((d) => ({ itemId: d.itemId, qty: d.qty, rarity: d.rarity })),
          },
        });

        return res.json({
          character: withLiveStamina(saved),
          rewards: {
            xp: mission.rewardXp,
            chakraXp: mission.rewardChakraXp,
            ryo: totalRyo,
            merit: totalMerit,
            baseRyo,
            geopoliticalBonusRyo,
            geopoliticalBonusMerit,
          },
          lootDrops,
          isWarMission,
          staminaSpent: staminaConsumption.cost,
          remainingStamina: staminaConsumption.remainingStamina,
          maxStamina: staminaConsumption.maxStamina,
          ocularSummary,
          geopoliticalBonusPct: effectiveBonusPct,
          activeConflictFront: effectiveFront,
          characterProgress,
          leveledUp: progression.leveledUp,
          chakraLeveledUp: progression.chakraLeveledUp,
          rankPromoted: progression.rankPromoted,
          becameKage,
        });
      } else {
        const consolationXp = Math.round(mission.rewardXp * 0.2);
        const [saved] = await db
          .update(characters)
          .set({
            losses: char.losses + 1,
            inventory: inv,
            xp: char.xp + consolationXp,
            stamina: staminaConsumption.remainingStamina,
            staminaUpdatedAt: staminaConsumption.nextUpdatedAt,
            leftEyeBlindness: nextLeftBlindness,
            rightEyeBlindness: nextRightBlindness,
            updatedAt: new Date(),
          })
          .where(eq(characters.id, char.id))
          .returning();

        const characterProgress: CharacterProgressSnapshot = {
          prevLevel: char.level,
          newLevel: saved.level,
          prevXp: char.xp,
          newXp: saved.xp,
          xpNeeded: xpRequiredForLevel(saved.level),
          prevChakraLevel: char.chakraLevel,
          newChakraLevel: saved.chakraLevel,
          prevChakraXp: char.chakraXp,
          newChakraXp: saved.chakraXp,
          chakraXpNeeded: chakraXpRequiredForLevel(saved.chakraLevel),
          prevRyo: char.ryo,
          newRyo: saved.ryo,
          prevRank: char.rank,
          newRank: saved.rank,
        };

        const ocularSummary =
          nextLeftBlindness > 0 ||
          nextRightBlindness > 0 ||
          (Array.isArray(ocularEvents) && ocularEvents.length > 0)
            ? {
                leftBlindness: nextLeftBlindness,
                rightBlindness: nextRightBlindness,
                visionLabel: getOcularState(saved).visionLabel,
                events: Array.isArray(ocularEvents)
                  ? ocularEvents.map((e: unknown) => String(e))
                  : [],
              }
            : null;

        await db.insert(analyticsEvents).values({
          eventType: isWarMission ? 'war_mission_loss' : 'combat_loss',
          userUid: req.authUser!.uid,
          characterName: saved.name,
          village: saved.village,
          valueNum: 0,
          meta: { mission: mission.title, isWarMission, staminaSpent: staminaConsumption.cost },
        });

        return res.json({
          character: withLiveStamina(saved),
          rewards: { xp: consolationXp, chakraXp: 0, ryo: 0, merit: 0 },
          lootDrops: [],
          isWarMission,
          staminaSpent: staminaConsumption.cost,
          remainingStamina: staminaConsumption.remainingStamina,
          maxStamina: staminaConsumption.maxStamina,
          ocularSummary,
          geopoliticalBonusPct: isWarMission && mission.warMeta ? mission.warMeta.warBonusRyoPct : geoBonus.bonusPct,
          activeConflictFront: isWarMission && mission.warMeta ? mission.warMeta.frontName : geoBonus.frontName,
          characterProgress,
        });
      }
    } catch (error) {
      console.error('Complete combat error:', error);
      res.status(500).json({ error: 'Erro ao registrar resultado de combate.' });
    }
  });

  // Play-by-Forum RP Threads & Posts
  app.get('/api/forum/threads', requireAuth, async (_req, res) => {
    try {
      await ensureWorldSeeded();
      const threads = await db
        .select()
        .from(forumThreads)
        .orderBy(desc(forumThreads.isPinned), desc(forumThreads.createdAt));
      const posts = await db.select().from(forumPosts).orderBy(forumPosts.createdAt);
      res.json({ threads, posts });
    } catch (error) {
      console.error('Forum threads error:', error);
      res.status(500).json({ error: 'Erro ao carregar tópicos do fórum.' });
    }
  });

  app.post('/api/forum/threads', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, village, category, content } = req.body || {};
      if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({ error: 'Título e narração inicial são obrigatórios.' });
      }
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      const [thread] = await db
        .insert(forumThreads)
        .values({
          title: String(title).trim().slice(0, 120),
          village: village || char?.village || 'Konohagakure',
          category: category || 'rp_narration',
          authorUid: req.authUser!.uid,
          authorName: char?.name || req.authUser!.displayName,
          authorRank: char?.rank || 'Genin',
        })
        .returning();

      const [firstPost] = await db
        .insert(forumPosts)
        .values({
          threadId: thread.id,
          authorUid: req.authUser!.uid,
          characterName: char?.name || req.authUser!.displayName,
          characterAvatar: char?.avatarUrl || '',
          characterVillage: char?.village || 'Konohagakure',
          characterRank: char?.rank || 'Genin',
          content: String(content).trim().slice(0, 3000),
          actionRoll: null,
        })
        .returning();

      io.emit('forum:thread_created', { thread, firstPost });
      res.status(201).json({ thread, post: firstPost });
    } catch (error) {
      console.error('Create thread error:', error);
      res.status(500).json({ error: 'Erro ao criar tópico RP.' });
    }
  });

  app.post('/api/forum/threads/:id/posts', requireAuth, async (req: AuthRequest, res) => {
    try {
      const threadId = Number(req.params.id);
      const { content, jutsuId } = req.body || {};
      if (!content?.trim()) {
        return res.status(400).json({ error: 'Escreva sua narração RP antes de enviar.' });
      }
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      let actionRoll = null;
      if (jutsuId && char) {
        let jutsu = JUTSU_CATALOG.find((j) => j.id === jutsuId);
        if (!jutsu) {
          const [customJutsuRow] = await db
            .select()
            .from(customContent)
            .where(and(eq(customContent.kind, 'jutsu'), eq(customContent.slug, String(jutsuId))))
            .limit(1);
          if (customJutsuRow) {
            jutsu = customJutsuRow.payload as unknown as (typeof JUTSU_CATALOG)[number];
          }
        }
        if (jutsu) {
          const eff = calculateEffectiveStats(char as unknown as CharacterModel);
          const calc = calculateHitAndDamage(eff, char.chakraNature, eff, 'Neutro', jutsu, Math.random, {
            attackerClan: char.clan,
            attackerKekkei: char.kekkeiGenkai,
          });
          actionRoll = {
            jutsuName: jutsu.name,
            hitChance: calc.hitChance,
            rolled: calc.rolled,
            isHit: calc.isHit,
            isCrit: calc.isCrit,
            damage: calc.damage,
            appliedEffects: calc.appliedEffects.map(
              (fx) => `${fx.target === 'self' ? 'Em si' : 'No alvo'}: ${fx.label} (${fx.duration}t)`
            ),
            synergyNotes: calc.synergyNotes,
          };
        }
      }

      const [post] = await db
        .insert(forumPosts)
        .values({
          threadId,
          authorUid: req.authUser!.uid,
          characterName: char?.name || req.authUser!.displayName,
          characterAvatar: char?.avatarUrl || '',
          characterVillage: char?.village || 'Konohagakure',
          characterRank: char?.rank || 'Genin',
          content: String(content).trim().slice(0, 3000),
          actionRoll,
        })
        .returning();

      if (char) {
        const prog = applyProgression(char as unknown as CharacterModel, 25, 10, 0, 10);
        await db
          .update(characters)
          .set({
            level: prog.updated.level,
            xp: prog.updated.xp,
            chakraLevel: prog.updated.chakraLevel,
            chakraXp: prog.updated.chakraXp,
            statPoints: prog.updated.statPoints,
            meritPoints: prog.updated.meritPoints,
            maxHp: prog.updated.maxHp,
            hp: prog.updated.maxHp,
            maxChakra: prog.updated.maxChakra,
            chakra: prog.updated.maxChakra,
            updatedAt: new Date(),
          })
          .where(eq(characters.id, char.id));
      }

      await db.insert(analyticsEvents).values({
        eventType: 'forum_post',
        userUid: req.authUser!.uid,
        characterName: char?.name || req.authUser!.displayName,
        village: char?.village || 'Konohagakure',
        valueNum: 25,
        meta: { threadId },
      });

      io.emit('forum:post_created', post);
      res.status(201).json({ post });
    } catch (error) {
      console.error('Create forum post error:', error);
      res.status(500).json({ error: 'Erro ao publicar post.' });
    }
  });

  // Play-by-Forum Village Locations Interaction
  app.post('/api/forum/locations/post', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { village, locationId, content, jutsuId } = req.body || {};
      if (!content?.trim() || !locationId) {
        return res.status(400).json({ error: 'Selecione um local e escreva sua mensagem Play-by-Forum.' });
      }

      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      const targetVillage = String(village || char?.village || 'Konohagakure');
      const villageLocs = getVillageLocations(targetVillage);
      const locDef = villageLocs.find((l) => l.id === String(locationId));
      if (!locDef) {
        return res.status(404).json({ error: 'Local de interação não encontrado nesta vila.' });
      }

      const locCategory = `loc:${locDef.id}`;
      let [existingThread] = await db
        .select()
        .from(forumThreads)
        .where(and(eq(forumThreads.village, targetVillage), eq(forumThreads.category, locCategory)))
        .limit(1);

      let createdNewThread = false;
      if (!existingThread) {
        const [newThread] = await db
          .insert(forumThreads)
          .values({
            title: `[Local] ${locDef.name} — ${locDef.zoneLabel}`,
            village: targetVillage,
            category: locCategory,
            authorUid: 'system:narrador',
            authorName: 'Narrador Oficial',
            authorRank: 'Descrição do Local',
            isPinned: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          })
          .returning();
        existingThread = newThread;
        createdNewThread = true;

        const [openingPost] = await db
          .insert(forumPosts)
          .values({
            threadId: newThread.id,
            authorUid: 'system:narrador',
            characterName: locDef.name,
            characterAvatar: locDef.imageUrl,
            characterVillage: targetVillage,
            characterRank: 'Descrição do Local',
            content: locDef.openingNarrative,
            actionRoll: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          })
          .returning();

        io.emit('forum:thread_created', { thread: newThread, firstPost: openingPost });
      }

      let actionRoll = null;
      if (jutsuId && char) {
        let jutsu = JUTSU_CATALOG.find((j) => j.id === jutsuId);
        if (!jutsu) {
          const [customJutsuRow] = await db
            .select()
            .from(customContent)
            .where(and(eq(customContent.kind, 'jutsu'), eq(customContent.slug, String(jutsuId))))
            .limit(1);
          if (customJutsuRow) {
            jutsu = customJutsuRow.payload as unknown as (typeof JUTSU_CATALOG)[number];
          }
        }
        if (jutsu) {
          const eff = calculateEffectiveStats(char as unknown as CharacterModel);
          const calc = calculateHitAndDamage(eff, char.chakraNature, eff, 'Neutro', jutsu, Math.random, {
            attackerClan: char.clan,
            attackerKekkei: char.kekkeiGenkai,
          });
          actionRoll = {
            jutsuName: jutsu.name,
            hitChance: calc.hitChance,
            rolled: calc.rolled,
            isHit: calc.isHit,
            isCrit: calc.isCrit,
            damage: calc.damage,
            appliedEffects: calc.appliedEffects.map(
              (fx) => `${fx.target === 'self' ? 'Em si' : 'No alvo'}: ${fx.label} (${fx.duration}t)`
            ),
            synergyNotes: calc.synergyNotes,
          };
        }
      }

      const [post] = await db
        .insert(forumPosts)
        .values({
          threadId: existingThread.id,
          authorUid: req.authUser!.uid,
          characterName: char?.name || req.authUser!.displayName,
          characterAvatar: char?.avatarUrl || '',
          characterVillage: char?.village || targetVillage,
          characterRank: char?.rank || 'Genin',
          content: String(content).trim().slice(0, 3000),
          actionRoll,
        })
        .returning();

      let updatedCharacter = null;
      if (char) {
        const prog = applyProgression(char as unknown as CharacterModel, 25, 10, 0, 10);
        const [savedChar] = await db
          .update(characters)
          .set({
            level: prog.updated.level,
            xp: prog.updated.xp,
            chakraLevel: prog.updated.chakraLevel,
            chakraXp: prog.updated.chakraXp,
            statPoints: prog.updated.statPoints,
            meritPoints: prog.updated.meritPoints,
            maxHp: prog.updated.maxHp,
            hp: prog.updated.maxHp,
            maxChakra: prog.updated.maxChakra,
            chakra: prog.updated.maxChakra,
            updatedAt: new Date(),
          })
          .where(eq(characters.id, char.id))
          .returning();
        updatedCharacter = savedChar;
      }

      await db.insert(analyticsEvents).values({
        eventType: 'forum_location_post',
        userUid: req.authUser!.uid,
        characterName: char?.name || req.authUser!.displayName,
        village: targetVillage,
        valueNum: 25,
        meta: { threadId: existingThread.id, locationId: locDef.id, locationName: locDef.name },
      });

      io.emit('forum:post_created', post);

      res.status(201).json({
        thread: existingThread,
        post,
        createdNewThread,
        character: updatedCharacter,
      });
    } catch (error) {
      console.error('Location post error:', error);
      res.status(500).json({ error: 'Erro ao publicar interação no local da vila.' });
    }
  });

  // Marketplace P2P
  app.get('/api/market/listings', requireAuth, async (_req, res) => {
    try {
      await ensureWorldSeeded();
      const rows = await db
        .select()
        .from(marketListings)
        .where(eq(marketListings.status, 'active'))
        .orderBy(desc(marketListings.createdAt));
      res.json({ listings: rows });
    } catch (error) {
      console.error('Market list error:', error);
      res.status(500).json({ error: 'Erro ao carregar mercado.' });
    }
  });

  app.post('/api/market/list', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { itemId, priceRyo } = req.body || {};
      const parsedPrice = Math.max(50, Math.min(500000, Math.round(Number(priceRyo))));
      if (!itemId || Number.isNaN(parsedPrice)) {
        return res.status(400).json({ error: 'Item e preço válidos são obrigatórios.' });
      }
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const inv = [...(char.inventory || [])];
      const idx = inv.findIndex((i) => i.itemId === itemId && i.qty > 0);
      if (idx < 0) return res.status(400).json({ error: 'Item indisponível no inventário.' });

      if (inv[idx].qty <= 1) inv.splice(idx, 1);
      else inv[idx] = { ...inv[idx], qty: inv[idx].qty - 1 };

      await db.update(characters).set({ inventory: inv }).where(eq(characters.id, char.id));

      const [listing] = await db
        .insert(marketListings)
        .values({
          sellerUid: req.authUser!.uid,
          sellerName: char.name,
          sellerVillage: char.village,
          itemId,
          qty: 1,
          priceRyo: parsedPrice,
          status: 'active',
        })
        .returning();

      io.emit('market:updated');
      res.status(201).json({ listing });
    } catch (error) {
      console.error('Market list create error:', error);
      res.status(500).json({ error: 'Erro ao anunciar item.' });
    }
  });

  app.post('/api/market/buy/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const listingId = Number(req.params.id);
      const [listing] = await db
        .select()
        .from(marketListings)
        .where(and(eq(marketListings.id, listingId), eq(marketListings.status, 'active')))
        .limit(1);
      if (!listing) return res.status(404).json({ error: 'Anúncio não disponível.' });

      const [buyer] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!buyer) return res.status(404).json({ error: 'Personagem comprador não encontrado.' });
      if (buyer.userUid === listing.sellerUid) {
        return res.status(400).json({ error: 'Você não pode comprar seu próprio anúncio.' });
      }
      if (buyer.ryo < listing.priceRyo) {
        return res.status(400).json({ error: 'Ryo insuficiente.' });
      }

      const buyerInv = [...(buyer.inventory || [])];
      const idx = buyerInv.findIndex((i) => i.itemId === listing.itemId);
      if (idx >= 0) buyerInv[idx] = { ...buyerInv[idx], qty: buyerInv[idx].qty + listing.qty };
      else buyerInv.push({ itemId: listing.itemId, qty: listing.qty });

      const [updatedBuyer] = await db
        .update(characters)
        .set({ ryo: buyer.ryo - listing.priceRyo, inventory: buyerInv })
        .where(eq(characters.id, buyer.id))
        .returning();

      const [seller] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, listing.sellerUid))
        .limit(1);
      if (seller) {
        await db
          .update(characters)
          .set({ ryo: seller.ryo + listing.priceRyo })
          .where(eq(characters.id, seller.id));
      }

      await db
        .update(marketListings)
        .set({ status: 'sold', buyerUid: buyer.userUid })
        .where(eq(marketListings.id, listing.id));

      await db.insert(analyticsEvents).values({
        eventType: 'market_trade',
        userUid: buyer.userUid,
        characterName: buyer.name,
        village: buyer.village,
        valueNum: listing.priceRyo,
        meta: { itemId: listing.itemId, seller: listing.sellerName },
      });

      io.to(`user:${listing.sellerUid}`).emit('push:notify', {
        title: 'Venda Concluída no Mercado',
        body: `${buyer.name} comprou seu item por ${listing.priceRyo} Ryo!`,
        kind: 'market',
      });
      io.emit('market:updated');

      res.json({ character: updatedBuyer });
    } catch (error) {
      console.error('Market buy error:', error);
      res.status(500).json({ error: 'Erro ao concluir compra.' });
    }
  });

  // Rankings & Kage Ascension
  app.get('/api/rankings', requireAuth, async (_req, res) => {
    try {
      await ensureWorldSeeded();
      const allChars = await db
        .select()
        .from(characters)
        .orderBy(desc(characters.meritPoints));
      res.json({ characters: allChars });
    } catch (error) {
      console.error('Rankings error:', error);
      res.status(500).json({ error: 'Erro ao carregar ranking.' });
    }
  });

  // Chat history
  app.get('/api/chat/messages', requireAuth, async (req, res) => {
    try {
      await ensureWorldSeeded();
      const channel = String(req.query.channel || 'global');
      const rows = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.channel, channel))
        .orderBy(desc(chatMessages.createdAt))
        .limit(50);
      res.json({ messages: rows.reverse() });
    } catch (error) {
      console.error('Chat fetch error:', error);
      res.status(500).json({ error: 'Erro ao carregar mensagens.' });
    }
  });

  // Stripe Payment Checkout (Live Stripe REST if configured, clean Sandbox Checkout in preview)
  app.post('/api/payments/checkout', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { packId } = req.body || {};
      const packs: Record<string, { name: string; ryo: number; vipTier?: string; priceCents: number }> = {
        ryo_pouch: { name: 'Bolsa de 2.500 Ryo', ryo: 2500, priceCents: 990 },
        jonin_pass: { name: 'Passe Jonin + 5.000 Ryo', ryo: 5000, vipTier: 'jonin_pass', priceCents: 1990 },
        kage_patron: { name: 'Patrono Kage + 12.000 Ryo', ryo: 12000, vipTier: 'kage_patron', priceCents: 3990 },
      };
      const pack = packs[packId];
      if (!pack) return res.status(400).json({ error: 'Pacote inválido.' });

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      let checkoutMode = 'sandbox_verified';
      let stripeSessionId = `cs_test_${Date.now()}`;

      if (stripeKey && stripeKey.startsWith('sk_')) {
        // Real Stripe Checkout Session creation
        const params = new URLSearchParams({
          mode: 'payment',
          success_url: `${process.env.APP_URL || 'http://localhost:3000'}/?payment=success`,
          cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/?payment=cancel`,
          'line_items[0][price_data][currency]': 'brl',
          'line_items[0][price_data][product_data][name]': pack.name,
          'line_items[0][price_data][unit_amount]': String(pack.priceCents),
          'line_items[0][quantity]': '1',
        });
        const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        if (stripeResp.ok) {
          const data = (await stripeResp.json()) as { id: string; url?: string };
          checkoutMode = 'stripe_live';
          stripeSessionId = data.id;
          return res.json({ mode: checkoutMode, checkoutUrl: data.url, sessionId: stripeSessionId });
        }
      }

      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      if (char) {
        await db
          .update(characters)
          .set({ ryo: char.ryo + pack.ryo })
          .where(eq(characters.id, char.id));
      }
      if (pack.vipTier) {
        await db
          .update(users)
          .set({ vipTier: pack.vipTier })
          .where(eq(users.uid, req.authUser!.uid));
      }

      await db.insert(analyticsEvents).values({
        eventType: 'stripe_checkout',
        userUid: req.authUser!.uid,
        characterName: char?.name || req.authUser!.displayName,
        village: char?.village || 'Konohagakure',
        valueNum: pack.priceCents,
        meta: { packId, ryoGranted: pack.ryo, sessionId: stripeSessionId },
      });

      const [updatedChar] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      res.json({
        mode: checkoutMode,
        sessionId: stripeSessionId,
        ryoGranted: pack.ryo,
        vipTier: pack.vipTier || null,
        character: updatedChar,
      });
    } catch (error) {
      console.error('Checkout error:', error);
      res.status(500).json({ error: 'Erro ao processar pagamento.' });
    }
  });

  // Analytics & Admin Console
  app.get('/api/analytics/overview', requireAuth, async (_req, res) => {
    try {
      await ensureWorldSeeded();
      const allChars = await db.select().from(characters);
      const events = await db
        .select()
        .from(analyticsEvents)
        .orderBy(desc(analyticsEvents.createdAt))
        .limit(100);
      const allCustom = await db.select().from(customContent).orderBy(desc(customContent.createdAt));

      const villageDistribution: Record<string, number> = {};
      const clanDistribution: Record<string, number> = {};
      let totalRyoCirculation = 0;
      let totalWins = 0;
      let totalLosses = 0;

      for (const c of allChars) {
        villageDistribution[c.village] = (villageDistribution[c.village] || 0) + 1;
        clanDistribution[c.clan] = (clanDistribution[c.clan] || 0) + 1;
        totalRyoCirculation += c.ryo;
        totalWins += c.wins;
        totalLosses += c.losses;
      }

      res.json({
        summary: {
          totalNinjas: allChars.length,
          totalRyoCirculation,
          totalWins,
          totalLosses,
          winRate: totalWins + totalLosses > 0 ? Math.round((totalWins / (totalWins + totalLosses)) * 100) : 0,
        },
        villageDistribution,
        clanDistribution,
        recentEvents: events,
        customContent: allCustom,
        characters: allChars,
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ error: 'Erro ao carregar analytics.' });
    }
  });

  app.get('/api/analytics/export.csv', requireAuth, async (_req, res) => {
    try {
      const allChars = await db.select().from(characters).orderBy(desc(characters.meritPoints));
      const header = ['Nome', 'Vila', 'Pais', 'Cla', 'Rank', 'Nivel', 'ChakraNivel', 'Merito', 'Ryo', 'Vitorias', 'Derrotas'].join(',');
      const lines = allChars.map((c) =>
        [
          `"${c.name.replace(/"/g, '""')}"`,
          `"${c.village}"`,
          `"${c.country}"`,
          `"${c.clan}"`,
          `"${c.rank}"`,
          c.level,
          c.chakraLevel,
          c.meritPoints,
          c.ryo,
          c.wins,
          c.losses,
        ].join(',')
      );
      const csv = [header, ...lines].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="konoha-defenders-report.csv"');
      res.send(csv);
    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ error: 'Erro ao exportar CSV.' });
    }
  });

  app.post('/api/admin/custom-content', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { kind, title, payload } = req.body || {};
      if (!kind || !title?.trim() || !payload) {
        return res.status(400).json({ error: 'Tipo, título e parâmetros são obrigatórios.' });
      }
      const slug = `${kind}_${Date.now()}`;
      const [created] = await db
        .insert(customContent)
        .values({
          kind,
          slug,
          title: String(title).trim(),
          payload: { ...payload, id: slug, name: String(title).trim(), title: String(title).trim() },
          createdByUid: req.authUser!.uid,
        })
        .returning();

      io.emit('push:notify', {
        title: kind === 'mission' ? 'Nova Missão Customizada' : 'Novo Jutsu Desbloqueável',
        body: `${created.title} foi adicionado ao mundo shinobi.`,
        kind: 'admin',
      });

      res.status(201).json({ item: created });
    } catch (error) {
      console.error('Admin custom content error:', error);
      res.status(500).json({ error: 'Erro ao criar conteúdo customizado.' });
    }
  });

  app.post('/api/admin/broadcast-push', requireAuth, async (req, res) => {
    const { title, body } = req.body || {};
    if (!title || !body) return res.status(400).json({ error: 'Título e mensagem obrigatórios.' });
    io.emit('push:notify', { title: String(title), body: String(body), kind: 'broadcast' });
    res.json({ sent: true });
  });

  // Canon Graduation System & Kage Jonin Appointment
  app.get('/api/graduation/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureWorldSeeded();
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const bimester = getBimesterInfo();
      const userEvents = await db
        .select()
        .from(analyticsEvents)
        .where(eq(analyticsEvents.userUid, char.userUid))
        .orderBy(desc(analyticsEvents.createdAt))
        .limit(80);

      const chuninAttempts = userEvents.filter((e) => e.eventType === 'chunin_exam_attempt');
      const bimesterAttempted = chuninAttempts.some(
        (e) => (e.meta as Record<string, unknown> | null)?.bimesterKey === bimester.key
      );
      const lastChuninAttempt = chuninAttempts[0] || null;
      const lastAcademyAttempt =
        userEvents.find((e) => e.eventType === 'academy_exam_attempt') || null;

      const allChars = await db.select().from(characters);
      const villageKage =
        allChars.find((c) => c.village === char.village && c.isKage) || null;

      const canAppointJonin = char.isKage || req.authUser!.role === 'admin';
      const appointableCandidates = canAppointJonin
        ? allChars.filter((c) => {
            if (c.isKage) return false;
            if (!char.isKage && req.authUser!.role === 'admin') {
              return ['Chunin', 'Tokubetsu Jonin', 'Jonin'].includes(c.rank);
            }
            return (
              c.village === char.village &&
              ['Chunin', 'Tokubetsu Jonin', 'Jonin'].includes(c.rank)
            );
          })
        : [];

      const graduationInfo = getGraduationPathInfo(
        char as unknown as CharacterModel,
        bimesterAttempted
      );

      res.json({
        bimester,
        bimesterAttempted,
        lastAcademyAttempt,
        lastChuninAttempt,
        villageKage,
        canAppointJonin,
        isActingAsAdmin: !char.isKage && req.authUser!.role === 'admin',
        appointableCandidates,
        graduationInfo,
        academyQuestions: stripExamAnswers(ACADEMY_EXAM_QUESTIONS),
        chuninQuestions: stripExamAnswers(CHUNIN_EXAM_QUESTIONS),
        thresholds: {
          academyPassScore: ACADEMY_PASS_SCORE,
          chuninPassScore: CHUNIN_EXAM_PASS_SCORE,
          chuninMissionRequirement: CHUNIN_MISSION_REQUIREMENT,
        },
      });
    } catch (error) {
      console.error('Graduation status error:', error);
      res.status(500).json({ error: 'Erro ao carregar sistema de graduações.' });
    }
  });

  app.post('/api/graduation/academy-exam', requireAuth, async (req: AuthRequest, res) => {
    try {
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });
      if (char.rank !== 'Estudante da Academia') {
        return res.status(400).json({
          error: `Você já concluiu a Academia Ninja (patente atual: ${char.rank}).`,
        });
      }

      const answers = (req.body?.answers || {}) as Record<string, number>;
      const result = gradeExam(ACADEMY_EXAM_QUESTIONS, answers, ACADEMY_PASS_SCORE);

      await db.insert(analyticsEvents).values({
        eventType: 'academy_exam_attempt',
        userUid: char.userUid,
        characterName: char.name,
        village: char.village,
        valueNum: result.scorePercent,
        meta: {
          passed: result.passed,
          correctCount: result.correctCount,
          total: result.total,
        },
      });

      if (!result.passed) {
        return res.json({ character: char, result, promoted: false });
      }

      const [updated] = await db
        .update(characters)
        .set({ rank: 'Genin', updatedAt: new Date() })
        .where(eq(characters.id, char.id))
        .returning();

      await db
        .update(forumPosts)
        .set({ characterRank: 'Genin' })
        .where(eq(forumPosts.authorUid, updated.userUid));

      io.to(`user:${updated.userUid}`).emit('push:notify', {
        title: 'Aprovado no Teste da Academia!',
        body: `${updated.name} recebeu a bandana de ${updated.village} e graduou-se para Genin (Rank C liberado).`,
        kind: 'graduation',
      });

      res.json({ character: updated, result, promoted: true });
    } catch (error) {
      console.error('Academy exam error:', error);
      res.status(500).json({ error: 'Erro ao corrigir Teste da Academia.' });
    }
  });

  app.post('/api/graduation/chunin-exam', requireAuth, async (req: AuthRequest, res) => {
    try {
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });
      if (char.rank !== 'Genin') {
        return res.status(400).json({
          error: `Apenas ninjas Genin podem prestar o Exame Chunin (patente atual: ${char.rank}).`,
        });
      }

      const bimester = getBimesterInfo();
      const priorAttempts = await db
        .select()
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.userUid, char.userUid),
            eq(analyticsEvents.eventType, 'chunin_exam_attempt')
          )
        );
      const alreadyTriedThisBimester = priorAttempts.some(
        (e) => (e.meta as Record<string, unknown> | null)?.bimesterKey === bimester.key
      );

      if (alreadyTriedThisBimester) {
        return res.status(409).json({
          error: `O Exame Chunin ocorre apenas 1 vez por bimestre e você já usou sua tentativa no ${bimester.label}. Aguarde o próximo bimestre ou conclua ${CHUNIN_MISSION_REQUIREMENT} missões.`,
        });
      }

      const answers = (req.body?.answers || {}) as Record<string, number>;
      const result = gradeExam(CHUNIN_EXAM_QUESTIONS, answers, CHUNIN_EXAM_PASS_SCORE);

      await db.insert(analyticsEvents).values({
        eventType: 'chunin_exam_attempt',
        userUid: char.userUid,
        characterName: char.name,
        village: char.village,
        valueNum: result.scorePercent,
        meta: {
          bimesterKey: bimester.key,
          bimesterLabel: bimester.label,
          passed: result.passed,
          correctCount: result.correctCount,
          total: result.total,
        },
      });

      if (!result.passed) {
        return res.json({ character: char, result, bimester, promoted: false });
      }

      const [updated] = await db
        .update(characters)
        .set({ rank: 'Chunin', updatedAt: new Date() })
        .where(eq(characters.id, char.id))
        .returning();

      await db
        .update(forumPosts)
        .set({ characterRank: 'Chunin' })
        .where(eq(forumPosts.authorUid, updated.userUid));

      io.emit('push:notify', {
        title: `Novo Chunin em ${updated.village}!`,
        body: `${updated.name} foi aprovado no Exame Chunin (${bimester.label}) e desbloqueou técnicas até Rank B.`,
        kind: 'graduation',
      });

      res.json({ character: updated, result, bimester, promoted: true });
    } catch (error) {
      console.error('Chunin exam error:', error);
      res.status(500).json({ error: 'Erro ao processar Exame Chunin Bimestral.' });
    }
  });

  app.post('/api/graduation/chunin-missions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });
      if (char.rank !== 'Genin') {
        return res.status(400).json({
          error: `A promoção por experiência de missões aplica-se apenas a Genin (patente atual: ${char.rank}).`,
        });
      }
      if (char.missionsCompleted < CHUNIN_MISSION_REQUIREMENT) {
        return res.status(400).json({
          error: `São necessárias ${CHUNIN_MISSION_REQUIREMENT} missões concluídas (você completou ${char.missionsCompleted}).`,
        });
      }

      const [updated] = await db
        .update(characters)
        .set({ rank: 'Chunin', updatedAt: new Date() })
        .where(eq(characters.id, char.id))
        .returning();

      await db
        .update(forumPosts)
        .set({ characterRank: 'Chunin' })
        .where(eq(forumPosts.authorUid, updated.userUid));

      await db.insert(analyticsEvents).values({
        eventType: 'chunin_mission_promo',
        userUid: updated.userUid,
        characterName: updated.name,
        village: updated.village,
        valueNum: updated.missionsCompleted,
        meta: { required: CHUNIN_MISSION_REQUIREMENT },
      });

      io.emit('push:notify', {
        title: `Promoção a Chunin por Mérito em Campo`,
        body: `${updated.name} completou ${updated.missionsCompleted} missões e recebeu o colete de Chunin!`,
        kind: 'graduation',
      });

      res.json({ character: updated, promoted: true });
    } catch (error) {
      console.error('Chunin missions promotion error:', error);
      res.status(500).json({ error: 'Erro ao promover Genin por missões.' });
    }
  });

  // Summoning Contract Special Quests (Pactos de Invocação & Três Grandes Sábios)
  app.get('/api/summon-quests/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const trialEvents = await db
        .select()
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.userUid, char.userUid),
            eq(analyticsEvents.eventType, 'summon_quest_trial_passed')
          )
        );
      const passedQuestIds = new Set(
        trialEvents
          .map((e) => (e.meta as Record<string, unknown> | null)?.questId as string)
          .filter(Boolean)
      );

      const quests = SUMMON_QUESTS.map((q) => {
        const trialPassed = passedQuestIds.has(q.id);
        const charForEligibility = {
          ...(char as unknown as CharacterModel),
          // Once Stage 2 offering Ryo is already paid, do not re-block Stage 3 boss duel on costRyo
          ryo: trialPassed ? Math.max(char.ryo, q.costRyo) : char.ryo,
        };
        const eligibility = checkSummonQuestEligibility(charForEligibility, q);
        return {
          id: q.id,
          contractName: q.contractName,
          tier: q.tier,
          isGreatSummon: q.isGreatSummon,
          sanctuary: q.sanctuary,
          guardianTitle: q.guardianTitle,
          minRank: q.minRank,
          minLevel: q.minLevel,
          minChakraLevel: q.minChakraLevel,
          minMissions: q.minMissions,
          minMerit: q.minMerit,
          costRyo: q.costRyo,
          complexityLabel: q.complexityLabel,
          description: q.description,
          bossName: q.bossName,
          bossNature: q.bossNature,
          bossAvatar: q.bossAvatar,
          bossHp: q.bossHp,
          bossAttack: q.bossAttack,
          bossSpeed: q.bossSpeed,
          rewardXp: q.rewardXp,
          rewardChakraXp: q.rewardChakraXp,
          rewardMerit: q.rewardMerit,
          trialQuestions: stripExamAnswers(q.trialQuestions),
          eligibility,
          trialPassed,
        };
      });

      res.json({
        activeContract: char.summonContract,
        quests,
      });
    } catch (error) {
      console.error('Summon quests status error:', error);
      res.status(500).json({ error: 'Erro ao carregar Quests de Invocação.' });
    }
  });

  app.post('/api/summon-quests/ritual', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { questId, answers } = req.body || {};
      const quest = getSummonQuestById(String(questId || ''));
      if (!quest) return res.status(404).json({ error: 'Quest de Invocação não encontrada.' });

      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const existingPassed = await db
        .select()
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.userUid, char.userUid),
            eq(analyticsEvents.eventType, 'summon_quest_trial_passed')
          )
        );
      const alreadyPassed = existingPassed.some(
        (e) => (e.meta as Record<string, unknown> | null)?.questId === quest.id
      );

      if (alreadyPassed) {
        return res.json({
          passed: true,
          alreadyCleared: true,
          result: { scorePercent: 100, correctCount: quest.trialQuestions.length, total: quest.trialQuestions.length, passed: true },
          character: char,
        });
      }

      const eligibility = checkSummonQuestEligibility(char as unknown as CharacterModel, quest);
      if (!eligibility.eligible) {
        return res.status(400).json({
          error: `Requisitos ainda não cumpridos: ${eligibility.unmetReasons.join(' · ')}`,
        });
      }

      const result = gradeExam(
        quest.trialQuestions,
        (answers || {}) as Record<string, number>,
        100
      );

      if (!result.passed) {
        await db.insert(analyticsEvents).values({
          eventType: 'summon_quest_trial_failed',
          userUid: char.userUid,
          characterName: char.name,
          village: char.village,
          valueNum: result.scorePercent,
          meta: { questId: quest.id, contractName: quest.contractName },
        });
        return res.json({ passed: false, result, character: char });
      }

      const [updated] = await db
        .update(characters)
        .set({
          ryo: Math.max(0, char.ryo - quest.costRyo),
          updatedAt: new Date(),
        })
        .where(eq(characters.id, char.id))
        .returning();

      await db.insert(analyticsEvents).values({
        eventType: 'summon_quest_trial_passed',
        userUid: updated.userUid,
        characterName: updated.name,
        village: updated.village,
        valueNum: quest.costRyo,
        meta: {
          questId: quest.id,
          contractName: quest.contractName,
          isGreatSummon: quest.isGreatSummon,
        },
      });

      res.json({ passed: true, result, character: updated });
    } catch (error) {
      console.error('Summon ritual error:', error);
      res.status(500).json({ error: 'Erro ao validar Provação da Quest de Invocação.' });
    }
  });

  app.post('/api/summon-quests/complete', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { questId, won, consumedItems, ocularState } = req.body || {};
      const quest = getSummonQuestById(String(questId || ''));
      if (!quest) return res.status(404).json({ error: 'Quest de Invocação não encontrada.' });

      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const trialEvents = await db
        .select()
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.userUid, char.userUid),
            eq(analyticsEvents.eventType, 'summon_quest_trial_passed')
          )
        );
      const trialCleared = trialEvents.some(
        (e) => (e.meta as Record<string, unknown> | null)?.questId === quest.id
      );
      if (!trialCleared) {
        return res.status(403).json({
          error: 'Conclua primeiro a Provação de Selamento (Etapa 2) antes do duelo final da Quest.',
        });
      }

      const questRank = quest.isGreatSummon ? 'S' : 'B';
      const staminaConsumption = consumeCharacterStamina(
        char as unknown as CharacterModel,
        getMissionStaminaCost(questRank, true)
      );
      if (!staminaConsumption.allowed) {
        return res.status(400).json({
          error: staminaConsumption.reason,
          stamina: staminaConsumption.currentStamina,
          requiredStamina: staminaConsumption.cost,
        });
      }

      const nextLeftBlindness = Math.max(
        char.leftEyeBlindness ?? 0,
        Math.min(100, Math.round(Number(ocularState?.leftEyeBlindness) || 0))
      );
      const nextRightBlindness = Math.max(
        char.rightEyeBlindness ?? 0,
        Math.min(100, Math.round(Number(ocularState?.rightEyeBlindness) || 0))
      );

      const inv = [...(char.inventory || [])];
      if (Array.isArray(consumedItems)) {
        for (const itemId of consumedItems) {
          const idx = inv.findIndex((i) => i.itemId === itemId && i.qty > 0);
          if (idx >= 0) {
            if (inv[idx].qty <= 1) inv.splice(idx, 1);
            else inv[idx] = { ...inv[idx], qty: inv[idx].qty - 1 };
          }
        }
      }

      const lootDrops = won
        ? rollMissionLootDrops(quest.isGreatSummon ? 'S' : 'A', char.level, char.village)
        : [];
      const invWithLoot = mergeLootIntoInventory(inv, lootDrops);

      const draftChar = { ...(char as unknown as CharacterModel), inventory: invWithLoot };
      const gainedXp = won ? quest.rewardXp : Math.round(quest.rewardXp * 0.25);
      const gainedChakraXp = won ? quest.rewardChakraXp : Math.round(quest.rewardChakraXp * 0.25);
      const gainedMerit = won ? quest.rewardMerit : 15;

      const prog = applyProgression(draftChar, gainedXp, gainedChakraXp, 0, gainedMerit);
      const nextContract = won ? quest.contractName : char.summonContract;

      const [updated] = await db
        .update(characters)
        .set({
          summonContract: nextContract,
          level: prog.updated.level,
          xp: prog.updated.xp,
          chakraLevel: prog.updated.chakraLevel,
          chakraXp: prog.updated.chakraXp,
          statPoints: prog.updated.statPoints,
          meritPoints: prog.updated.meritPoints,
          hp: prog.updated.hp,
          maxHp: prog.updated.maxHp,
          chakra: prog.updated.chakra,
          maxChakra: prog.updated.maxChakra,
          stamina: staminaConsumption.remainingStamina,
          staminaUpdatedAt: staminaConsumption.nextUpdatedAt,
          leftEyeBlindness: nextLeftBlindness,
          rightEyeBlindness: nextRightBlindness,
          inventory: invWithLoot,
          missionsCompleted: char.missionsCompleted + (won ? 1 : 0),
          wins: char.wins + (won ? 1 : 0),
          losses: char.losses + (won ? 0 : 1),
          updatedAt: new Date(),
        })
        .where(eq(characters.id, char.id))
        .returning();

      const characterProgress: CharacterProgressSnapshot = {
        prevLevel: char.level,
        newLevel: updated.level,
        prevXp: char.xp,
        newXp: updated.xp,
        xpNeeded: xpRequiredForLevel(updated.level),
        prevChakraLevel: char.chakraLevel,
        newChakraLevel: updated.chakraLevel,
        prevChakraXp: char.chakraXp,
        newChakraXp: updated.chakraXp,
        chakraXpNeeded: chakraXpRequiredForLevel(updated.chakraLevel),
        prevRyo: char.ryo,
        newRyo: updated.ryo,
        prevRank: char.rank,
        newRank: updated.rank,
      };

      if (won) {
        await db.insert(analyticsEvents).values({
          eventType: 'summon_contract_signed',
          userUid: updated.userUid,
          characterName: updated.name,
          village: updated.village,
          valueNum: quest.isGreatSummon ? 2 : 1,
          meta: {
            questId: quest.id,
            contractName: quest.contractName,
            isGreatSummon: quest.isGreatSummon,
          },
        });

        const notifyPayload = {
          title: quest.isGreatSummon
            ? `Pacto Lendário Assinado: ${quest.contractName}!`
            : `Novo Pacto Kuchiyose: ${quest.contractName}`,
          body: `${updated.name} superou ${quest.bossName} e gravou seu nome em sangue no pergaminho de ${quest.sanctuary}.`,
          kind: 'summon',
        };
        if (quest.isGreatSummon) io.emit('push:notify', notifyPayload);
        else io.to(`user:${updated.userUid}`).emit('push:notify', notifyPayload);
      }

      res.json({
        character: withLiveStamina(updated),
        rewards: { xp: gainedXp, chakraXp: gainedChakraXp, ryo: 0, merit: gainedMerit },
        lootDrops,
        staminaSpent: staminaConsumption.cost,
        remainingStamina: staminaConsumption.remainingStamina,
        maxStamina: staminaConsumption.maxStamina,
        characterProgress,
        leveledUp: prog.leveledUp,
        chakraLeveledUp: prog.chakraLeveledUp,
        rankPromoted: false,
        signedContract: won ? quest.contractName : null,
      });
    } catch (error) {
      console.error('Complete summon quest error:', error);
      res.status(500).json({ error: 'Erro ao concluir Quest de Invocação.' });
    }
  });

  // Special Jutsu Quests (Segundo Elemento, Rasengan, Portões de Chakra)
  app.get('/api/jutsu-quests/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const effStats = calculateEffectiveStats(char as unknown as CharacterModel);
      const trialEvents = await db
        .select()
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.userUid, char.userUid),
            eq(analyticsEvents.eventType, 'jutsu_quest_trial_passed')
          )
        );
      const trialByQuestId = new Map<string, Record<string, unknown>>();
      for (const ev of trialEvents) {
        const meta = (ev.meta || {}) as Record<string, unknown>;
        const qid = String(meta.questId || '');
        if (qid) trialByQuestId.set(qid, meta);
      }

      const availableSecondElements = ELEMENTAL_NATURES.filter(
        (el) => el !== char.chakraNature
      );

      const quests = SPECIAL_JUTSU_QUESTS.map((q) => {
        const trialMeta = trialByQuestId.get(q.id);
        const trialPassed = Boolean(trialMeta);
        const charForEligibility: CharacterModel = {
          ...(char as unknown as CharacterModel),
          taijutsu: Math.max(char.taijutsu, effStats.taijutsu),
          controleChakra: Math.max(char.controleChakra, effStats.controleChakra),
          ryo: trialPassed ? Math.max(char.ryo, q.costRyo) : char.ryo,
        };
        const eligibility = checkJutsuQuestEligibility(charForEligibility, q);
        return {
          id: q.id,
          kind: q.kind,
          title: q.title,
          rewardLabel: q.rewardLabel,
          rewardJutsuId: q.rewardJutsuId,
          grantsSecondElement: Boolean(q.grantsSecondElement),
          requiresNoClan: q.requiresNoClan,
          requiresNoKekkeiGenkai: q.requiresNoKekkeiGenkai,
          minRank: q.minRank,
          minLevel: q.minLevel,
          minChakraLevel: q.minChakraLevel,
          minMissions: q.minMissions,
          minMerit: q.minMerit,
          minTaijutsu: q.minTaijutsu,
          minChakraControl: q.minChakraControl,
          costRyo: q.costRyo,
          complexityLabel: q.complexityLabel,
          description: q.description,
          bossName: q.bossName,
          bossTitle: q.bossTitle,
          bossNature: q.bossNature,
          bossAvatar: q.bossAvatar,
          bossHp: q.bossHp,
          bossAttack: q.bossAttack,
          bossSpeed: q.bossSpeed,
          rewardXp: q.rewardXp,
          rewardChakraXp: q.rewardChakraXp,
          rewardMerit: q.rewardMerit,
          trialQuestions: stripExamAnswers(q.trialQuestions),
          eligibility,
          trialPassed,
          selectedTargetElement: (trialMeta?.targetElement as string) || null,
        };
      });

      res.json({
        primaryElement: char.chakraNature,
        secondaryElement: char.secondaryChakraNature || 'Nenhum',
        availableSecondElements,
        quests,
      });
    } catch (error) {
      console.error('Jutsu quests status error:', error);
      res.status(500).json({ error: 'Erro ao carregar Quests Especiais de Jutsus.' });
    }
  });

  app.post('/api/jutsu-quests/ritual', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { questId, answers, targetElement } = req.body || {};
      const quest = getJutsuQuestById(String(questId || ''));
      if (!quest) return res.status(404).json({ error: 'Quest Especial de Jutsu não encontrada.' });

      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const effStats = calculateEffectiveStats(char as unknown as CharacterModel);
      const existingPassed = await db
        .select()
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.userUid, char.userUid),
            eq(analyticsEvents.eventType, 'jutsu_quest_trial_passed')
          )
        );
      const existingMeta = existingPassed.find(
        (e) => (e.meta as Record<string, unknown> | null)?.questId === quest.id
      )?.meta as Record<string, unknown> | undefined;

      if (existingMeta) {
        return res.json({
          passed: true,
          alreadyCleared: true,
          selectedTargetElement: (existingMeta.targetElement as string) || null,
          result: {
            scorePercent: 100,
            correctCount: quest.trialQuestions.length,
            total: quest.trialQuestions.length,
            passed: true,
          },
          character: char,
        });
      }

      let chosenElement: string | null = null;
      if (quest.grantsSecondElement) {
        const candidate = String(targetElement || '').trim();
        if (
          !ELEMENTAL_NATURES.includes(candidate as (typeof ELEMENTAL_NATURES)[number]) ||
          candidate === char.chakraNature
        ) {
          return res.status(400).json({
            error: `Selecione um 2º elemento válido diferente do seu elemento primário (${char.chakraNature}).`,
          });
        }
        chosenElement = candidate;
      }

      const charForCheck: CharacterModel = {
        ...(char as unknown as CharacterModel),
        taijutsu: Math.max(char.taijutsu, effStats.taijutsu),
        controleChakra: Math.max(char.controleChakra, effStats.controleChakra),
      };
      const eligibility = checkJutsuQuestEligibility(charForCheck, quest);
      if (!eligibility.eligible) {
        return res.status(400).json({
          error: `Requisitos não cumpridos: ${eligibility.unmetReasons.join(' · ')}`,
        });
      }

      const result = gradeExam(
        quest.trialQuestions,
        (answers || {}) as Record<string, number>,
        100
      );

      if (!result.passed) {
        await db.insert(analyticsEvents).values({
          eventType: 'jutsu_quest_trial_failed',
          userUid: char.userUid,
          characterName: char.name,
          village: char.village,
          valueNum: result.scorePercent,
          meta: { questId: quest.id, title: quest.title },
        });
        return res.json({ passed: false, result, character: char });
      }

      const [updated] = await db
        .update(characters)
        .set({
          ryo: Math.max(0, char.ryo - quest.costRyo),
          updatedAt: new Date(),
        })
        .where(eq(characters.id, char.id))
        .returning();

      await db.insert(analyticsEvents).values({
        eventType: 'jutsu_quest_trial_passed',
        userUid: updated.userUid,
        characterName: updated.name,
        village: updated.village,
        valueNum: quest.costRyo,
        meta: {
          questId: quest.id,
          title: quest.title,
          targetElement: chosenElement,
        },
      });

      res.json({
        passed: true,
        selectedTargetElement: chosenElement,
        result,
        character: updated,
      });
    } catch (error) {
      console.error('Jutsu quest ritual error:', error);
      res.status(500).json({ error: 'Erro ao validar Provação da Quest de Jutsu.' });
    }
  });

  app.post('/api/jutsu-quests/complete', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { questId, won, consumedItems, targetElement, ocularState } = req.body || {};
      const quest = getJutsuQuestById(String(questId || ''));
      if (!quest) return res.status(404).json({ error: 'Quest Especial de Jutsu não encontrada.' });

      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const trialEvents = await db
        .select()
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.userUid, char.userUid),
            eq(analyticsEvents.eventType, 'jutsu_quest_trial_passed')
          )
        );
      const trialEvent = trialEvents.find(
        (e) => (e.meta as Record<string, unknown> | null)?.questId === quest.id
      );
      if (!trialEvent) {
        return res.status(403).json({
          error: 'Conclua primeiro a Provação Teórica/Ritual (Etapa 2) antes do duelo prático final.',
        });
      }

      if (won) {
        const effStats = calculateEffectiveStats(char as unknown as CharacterModel);
        const charForCheck: CharacterModel = {
          ...(char as unknown as CharacterModel),
          taijutsu: Math.max(char.taijutsu, effStats.taijutsu),
          controleChakra: Math.max(char.controleChakra, effStats.controleChakra),
          ryo: Math.max(char.ryo, quest.costRyo),
        };
        const eligibility = checkJutsuQuestEligibility(charForCheck, quest);
        if (!eligibility.eligible && !eligibility.alreadyCompleted) {
          return res.status(403).json({
            error: `Requisitos inválidos para concluir esta quest: ${eligibility.unmetReasons.join(' · ')}`,
          });
        }
      }

      const staminaConsumption = consumeCharacterStamina(
        char as unknown as CharacterModel,
        getMissionStaminaCost('A', true)
      );
      if (!staminaConsumption.allowed) {
        return res.status(400).json({
          error: staminaConsumption.reason,
          stamina: staminaConsumption.currentStamina,
          requiredStamina: staminaConsumption.cost,
        });
      }

      const nextLeftBlindness = Math.max(
        char.leftEyeBlindness ?? 0,
        Math.min(100, Math.round(Number(ocularState?.leftEyeBlindness) || 0))
      );
      const nextRightBlindness = Math.max(
        char.rightEyeBlindness ?? 0,
        Math.min(100, Math.round(Number(ocularState?.rightEyeBlindness) || 0))
      );

      const inv = [...(char.inventory || [])];
      if (Array.isArray(consumedItems)) {
        for (const itemId of consumedItems) {
          const idx = inv.findIndex((i) => i.itemId === itemId && i.qty > 0);
          if (idx >= 0) {
            if (inv[idx].qty <= 1) inv.splice(idx, 1);
            else inv[idx] = { ...inv[idx], qty: inv[idx].qty - 1 };
          }
        }
      }

      const lootDrops = won ? rollMissionLootDrops('A', char.level, char.village) : [];
      const invWithLoot = mergeLootIntoInventory(inv, lootDrops);

      const draftChar = { ...(char as unknown as CharacterModel), inventory: invWithLoot };
      const gainedXp = won ? quest.rewardXp : Math.round(quest.rewardXp * 0.25);
      const gainedChakraXp = won ? quest.rewardChakraXp : Math.round(quest.rewardChakraXp * 0.25);
      const gainedMerit = won ? quest.rewardMerit : 15;

      const prog = applyProgression(draftChar, gainedXp, gainedChakraXp, 0, gainedMerit);

      let nextSecondaryElement = char.secondaryChakraNature || 'Nenhum';
      const nextLearnedJutsus = [...(char.learnedJutsus || [])];
      let unlockedRewardLabel: string | null = null;

      if (won) {
        if (quest.grantsSecondElement) {
          const metaTarget = (trialEvent.meta as Record<string, unknown> | null)?.targetElement;
          const resolvedEl = String(metaTarget || targetElement || '').trim();
          if (
            ELEMENTAL_NATURES.includes(resolvedEl as (typeof ELEMENTAL_NATURES)[number]) &&
            resolvedEl !== char.chakraNature
          ) {
            nextSecondaryElement = resolvedEl;
            unlockedRewardLabel = `2º Elemento Despertado: ${resolvedEl}`;
          }
        } else if (quest.rewardJutsuId && !nextLearnedJutsus.includes(quest.rewardJutsuId)) {
          nextLearnedJutsus.push(quest.rewardJutsuId);
          unlockedRewardLabel = quest.rewardLabel;
        }
      }

      const [updated] = await db
        .update(characters)
        .set({
          secondaryChakraNature: nextSecondaryElement,
          learnedJutsus: nextLearnedJutsus,
          level: prog.updated.level,
          xp: prog.updated.xp,
          chakraLevel: prog.updated.chakraLevel,
          chakraXp: prog.updated.chakraXp,
          statPoints: prog.updated.statPoints,
          meritPoints: prog.updated.meritPoints,
          hp: prog.updated.hp,
          maxHp: prog.updated.maxHp,
          chakra: prog.updated.chakra,
          maxChakra: prog.updated.maxChakra,
          stamina: staminaConsumption.remainingStamina,
          staminaUpdatedAt: staminaConsumption.nextUpdatedAt,
          leftEyeBlindness: nextLeftBlindness,
          rightEyeBlindness: nextRightBlindness,
          inventory: invWithLoot,
          missionsCompleted: char.missionsCompleted + (won ? 1 : 0),
          wins: char.wins + (won ? 1 : 0),
          losses: char.losses + (won ? 0 : 1),
          updatedAt: new Date(),
        })
        .where(eq(characters.id, char.id))
        .returning();

      const characterProgress: CharacterProgressSnapshot = {
        prevLevel: char.level,
        newLevel: updated.level,
        prevXp: char.xp,
        newXp: updated.xp,
        xpNeeded: xpRequiredForLevel(updated.level),
        prevChakraLevel: char.chakraLevel,
        newChakraLevel: updated.chakraLevel,
        prevChakraXp: char.chakraXp,
        newChakraXp: updated.chakraXp,
        chakraXpNeeded: chakraXpRequiredForLevel(updated.chakraLevel),
        prevRyo: char.ryo,
        newRyo: updated.ryo,
        prevRank: char.rank,
        newRank: updated.rank,
      };

      if (won) {
        await db.insert(analyticsEvents).values({
          eventType: 'jutsu_quest_completed',
          userUid: updated.userUid,
          characterName: updated.name,
          village: updated.village,
          valueNum: quest.rewardXp,
          meta: {
            questId: quest.id,
            title: quest.title,
            unlockedRewardLabel,
            secondaryChakraNature: updated.secondaryChakraNature,
          },
        });

        io.to(`user:${updated.userUid}`).emit('push:notify', {
          title: `Quest Especial Concluída: ${quest.title}!`,
          body: unlockedRewardLabel || quest.rewardLabel,
          kind: 'jutsu_quest',
        });
      }

      res.json({
        character: withLiveStamina(updated),
        rewards: { xp: gainedXp, chakraXp: gainedChakraXp, ryo: 0, merit: gainedMerit },
        lootDrops,
        staminaSpent: staminaConsumption.cost,
        remainingStamina: staminaConsumption.remainingStamina,
        maxStamina: staminaConsumption.maxStamina,
        characterProgress,
        leveledUp: prog.leveledUp,
        chakraLeveledUp: prog.chakraLeveledUp,
        rankPromoted: false,
        unlockedJutsuReward: unlockedRewardLabel,
      });
    } catch (error) {
      console.error('Complete jutsu quest error:', error);
      res.status(500).json({ error: 'Erro ao concluir Quest Especial de Jutsu.' });
    }
  });

  app.post('/api/kage/appoint-jonin', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { characterId, targetRank } = req.body || {};
      const desiredRank = String(targetRank || 'Jonin') as (typeof KAGE_APPOINTABLE_RANKS)[number];
      if (!KAGE_APPOINTABLE_RANKS.includes(desiredRank)) {
        return res.status(400).json({
          error: 'Patente inválida. O Kage pode nomear para Tokubetsu Jonin, Jonin ou Jounin Experiente.',
        });
      }

      const [actor] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!actor) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const isKageActor = Boolean(actor.isKage);
      const isAdminActor = req.authUser!.role === 'admin';
      if (!isKageActor && !isAdminActor) {
        return res.status(403).json({
          error: 'Apenas o Kage da vila pode apontar e nomear Jounins.',
        });
      }

      const [target] = await db
        .select()
        .from(characters)
        .where(eq(characters.id, Number(characterId)))
        .limit(1);
      if (!target) return res.status(404).json({ error: 'Shinobi alvo não encontrado.' });

      if (isKageActor && !isAdminActor && target.village !== actor.village) {
        return res.status(403).json({
          error: `Como Kage de ${actor.village}, você só pode nomear shinobis da sua própria vila.`,
        });
      }
      if (target.isKage) {
        return res.status(400).json({ error: 'Este shinobi já ocupa o posto de Kage.' });
      }
      if (target.rank === 'Estudante da Academia' || target.rank === 'Genin') {
        return res.status(400).json({
          error: `Apenas ninjas já graduados como Chunin ou superior podem ser escolhidos como Jounin pelo Kage (atual: ${target.rank}).`,
        });
      }

      const [updated] = await db
        .update(characters)
        .set({ rank: desiredRank, updatedAt: new Date() })
        .where(eq(characters.id, target.id))
        .returning();

      await db
        .update(forumPosts)
        .set({ characterRank: desiredRank })
        .where(eq(forumPosts.authorUid, updated.userUid));

      await db.insert(analyticsEvents).values({
        eventType: 'jonin_appointed',
        userUid: updated.userUid,
        characterName: updated.name,
        village: updated.village,
        valueNum: 1,
        meta: { appointedBy: actor.name, rank: desiredRank },
      });

      io.emit('push:notify', {
        title: `Nomeação do Kage em ${updated.village}`,
        body: `${actor.name} escolheu e nomeou ${updated.name} como ${desiredRank}!`,
        kind: 'graduation',
      });

      res.json({ character: updated });
    } catch (error) {
      console.error('Kage appoint jonin error:', error);
      res.status(500).json({ error: 'Erro ao nomear Jounin pelo Kage.' });
    }
  });

  app.post('/api/admin/promote-kage', requireAuth, async (req, res) => {
    try {
      const { characterId } = req.body || {};
      const [target] = await db.select().from(characters).where(eq(characters.id, Number(characterId))).limit(1);
      if (!target) return res.status(404).json({ error: 'Ninja não encontrado.' });

      const currentKages = await db
        .select()
        .from(characters)
        .where(and(eq(characters.village, target.village), eq(characters.isKage, true)));

      for (const prev of currentKages) {
        if (prev.id !== target.id) {
          const restoredRank = 'Jounin Experiente';
          await db
            .update(characters)
            .set({ isKage: false, rank: restoredRank, updatedAt: new Date() })
            .where(eq(characters.id, prev.id));
          await db
            .update(forumPosts)
            .set({ characterRank: restoredRank })
            .where(eq(forumPosts.authorUid, prev.userUid));
        }
      }

      const [updated] = await db
        .update(characters)
        .set({ isKage: true, rank: 'Kage', updatedAt: new Date() })
        .where(eq(characters.id, target.id))
        .returning();

      await db
        .update(forumPosts)
        .set({ characterRank: 'Kage' })
        .where(eq(forumPosts.authorUid, updated.userUid));

      io.emit('push:notify', {
        title: `Decreto de Kage em ${target.village}`,
        body: `A Administração nomeou ${target.name} como Kage de ${target.village}!`,
        kind: 'kage',
      });

      res.json({ character: updated });
    } catch (error) {
      console.error('Promote kage error:', error);
      res.status(500).json({ error: 'Erro ao nomear Kage.' });
    }
  });

  app.post('/api/admin/revoke-kage', requireAuth, async (req, res) => {
    try {
      const { characterId } = req.body || {};
      const [target] = await db.select().from(characters).where(eq(characters.id, Number(characterId))).limit(1);
      if (!target) return res.status(404).json({ error: 'Ninja não encontrado.' });

      const restoredRank = 'Jounin Experiente';
      const [updated] = await db
        .update(characters)
        .set({ isKage: false, rank: restoredRank, updatedAt: new Date() })
        .where(eq(characters.id, target.id))
        .returning();

      await db
        .update(forumPosts)
        .set({ characterRank: restoredRank })
        .where(eq(forumPosts.authorUid, updated.userUid));

      res.json({ character: updated });
    } catch (error) {
      console.error('Revoke kage error:', error);
      res.status(500).json({ error: 'Erro ao remover posto de Kage.' });
    }
  });

  // ============================================================================
  // SHINOBI TEAMS (1 SENSEI + 3 ALUNOS), CO-OP TEAM MISSIONS & PVP 1v1
  // ============================================================================

  const hydrateTeamsList = async (): Promise<ShinobiTeamRecord[]> => {
    const teamRows = await db.select().from(shinobiTeams).orderBy(desc(shinobiTeams.createdAt));
    if (teamRows.length === 0) return [];
    const teamIds = teamRows.map((t) => t.id);
    const memberRows = await db
      .select()
      .from(shinobiTeamMembers)
      .where(inArray(shinobiTeamMembers.teamId, teamIds));

    const charIds = Array.from(new Set(memberRows.map((m) => m.characterId)));
    const charRows =
      charIds.length > 0
        ? await db.select().from(characters).where(inArray(characters.id, charIds))
        : [];
    const charById = new Map(charRows.map((c) => [c.id, c]));

    return teamRows.map((team) => {
      const members: ShinobiTeamMemberRecord[] = memberRows
        .filter((m) => m.teamId === team.id)
        .sort((a, b) => a.slotIndex - b.slotIndex)
        .map((m) => {
          const c = charById.get(m.characterId);
          return {
            id: m.id,
            teamId: m.teamId,
            characterId: m.characterId,
            userUid: m.userUid,
            characterName: c?.name || m.characterName,
            characterAvatar: c?.avatarUrl || m.characterAvatar,
            characterRank: c?.rank || m.characterRank,
            characterVillage: c?.village || m.characterVillage,
            role: (m.role === 'sensei' ? 'sensei' : 'student') as TeamMemberRole,
            slotIndex: m.slotIndex,
            status: (m.status === 'invited' ? 'invited' : 'active') as 'active' | 'invited',
            level: c?.level,
            chakraNature: c?.chakraNature,
            joinedAt: m.joinedAt ? new Date(m.joinedAt).toISOString() : undefined,
          };
        });

      return {
        id: team.id,
        name: team.name,
        village: team.village,
        motto: team.motto,
        senseiCharacterId: team.senseiCharacterId,
        senseiUid: team.senseiUid,
        senseiName: team.senseiName,
        missionsCompleted: team.missionsCompleted,
        wins: team.wins,
        createdAt: team.createdAt ? new Date(team.createdAt).toISOString() : undefined,
        members,
        synergy: computeTeamSynergy(members),
      };
    });
  };

  app.get('/api/teams', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureWorldSeeded();
      const [myChar] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      const allTeams = await hydrateTeamsList();
      const myTeams = myChar
        ? allTeams.filter((t) =>
            t.members.some((m) => m.characterId === myChar.id && m.status === 'active')
          )
        : [];
      const myInvites = myChar
        ? allTeams.filter((t) =>
            t.members.some((m) => m.characterId === myChar.id && m.status === 'invited')
          )
        : [];

      const allChars = await db.select().from(characters).orderBy(desc(characters.level));
      const availableNinjas = allChars.map((c) => ({
        id: c.id,
        userUid: c.userUid,
        name: c.name,
        avatarUrl: c.avatarUrl,
        rank: c.rank,
        village: c.village,
        level: c.level,
        chakraNature: c.chakraNature,
        specialization: c.specialization,
      }));

      res.json({ teams: allTeams, myTeams, myInvites, availableNinjas });
    } catch (error) {
      console.error('Get teams error:', error);
      res.status(500).json({ error: 'Erro ao carregar equipes shinobi.' });
    }
  });

  app.post('/api/teams', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureWorldSeeded();
      const { name, motto, preferredRole } = req.body || {};
      const cleanName = String(name || '').trim().slice(0, 60);
      if (cleanName.length < 3) {
        return res.status(400).json({ error: 'Informe um nome para a equipe (mín. 3 caracteres).' });
      }

      const [myChar] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!myChar) return res.status(404).json({ error: 'Crie seu personagem primeiro.' });

      const roleCheck = validateTeamSlotAddition([], {
        characterId: myChar.id,
        rank: myChar.rank,
        requestedRole:
          preferredRole === 'sensei' || preferredRole === 'student'
            ? (preferredRole as TeamMemberRole)
            : undefined,
      });

      if (!roleCheck.allowed) {
        return res.status(400).json({ error: roleCheck.reason });
      }

      const [created] = await db
        .insert(shinobiTeams)
        .values({
          name: cleanName,
          village: myChar.village,
          motto: String(motto || 'Trabalho em equipe acima de tudo.').trim().slice(0, 140),
          senseiCharacterId: roleCheck.role === 'sensei' ? myChar.id : 0,
          senseiUid: roleCheck.role === 'sensei' ? myChar.userUid : '',
          senseiName: roleCheck.role === 'sensei' ? myChar.name : 'Vaga de Sensei Aberta',
        })
        .returning();

      await db.insert(shinobiTeamMembers).values({
        teamId: created.id,
        characterId: myChar.id,
        userUid: myChar.userUid,
        characterName: myChar.name,
        characterAvatar: myChar.avatarUrl,
        characterRank: myChar.rank,
        characterVillage: myChar.village,
        role: roleCheck.role,
        slotIndex: roleCheck.slotIndex,
        status: 'active',
      });

      io.emit('teams:updated');
      const allTeams = await hydrateTeamsList();
      const team = allTeams.find((t) => t.id === created.id);
      res.status(201).json({ team });
    } catch (error) {
      console.error('Create team error:', error);
      res.status(500).json({ error: 'Erro ao criar equipe shinobi.' });
    }
  });

  const handleAddTeamMember = async (
    req: AuthRequest,
    res: express.Response,
    mode: 'invite' | 'direct_add' | 'self_join'
  ) => {
    try {
      const teamId = Number(req.params.id);
      const { characterId, requestedRole } = req.body || {};

      const [myChar] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!myChar) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const [team] = await db
        .select()
        .from(shinobiTeams)
        .where(eq(shinobiTeams.id, teamId))
        .limit(1);
      if (!team) return res.status(404).json({ error: 'Equipe não encontrada.' });

      const existingMembers = await db
        .select()
        .from(shinobiTeamMembers)
        .where(eq(shinobiTeamMembers.teamId, teamId));

      const targetCharId = mode === 'self_join' ? myChar.id : Number(characterId);
      const [targetChar] = await db
        .select()
        .from(characters)
        .where(eq(characters.id, targetCharId))
        .limit(1);
      if (!targetChar) return res.status(404).json({ error: 'Shinobi alvo não encontrado.' });

      if (mode !== 'self_join') {
        const callerInTeam = existingMembers.some(
          (m) => m.characterId === myChar.id && m.status === 'active'
        );
        if (!callerInTeam && req.authUser!.role !== 'admin') {
          return res.status(403).json({ error: 'Apenas integrantes ativos da equipe podem recrutar.' });
        }
      }

      const check = validateTeamSlotAddition(
        existingMembers.map((m) => ({
          characterId: m.characterId,
          role: (m.role === 'sensei' ? 'sensei' : 'student') as TeamMemberRole,
          slotIndex: m.slotIndex,
          status: (m.status === 'invited' ? 'invited' : 'active') as 'active' | 'invited',
        })),
        {
          characterId: targetChar.id,
          rank: targetChar.rank,
          requestedRole:
            requestedRole === 'sensei' || requestedRole === 'student'
              ? (requestedRole as TeamMemberRole)
              : undefined,
        }
      );

      if (!check.allowed) {
        return res.status(400).json({ error: check.reason });
      }

      // NPC roster characters & direct self-join activate immediately; real player invites require acceptance unless direct_add on npc
      const isNpc = targetChar.userUid.startsWith('npc:');
      const memberStatus = mode === 'self_join' || isNpc || targetChar.userUid === req.authUser!.uid
        ? 'active'
        : mode === 'direct_add'
        ? 'invited'
        : 'invited';

      await db.insert(shinobiTeamMembers).values({
        teamId,
        characterId: targetChar.id,
        userUid: targetChar.userUid,
        characterName: targetChar.name,
        characterAvatar: targetChar.avatarUrl,
        characterRank: targetChar.rank,
        characterVillage: targetChar.village,
        role: check.role,
        slotIndex: check.slotIndex,
        status: memberStatus,
      });

      if (check.role === 'sensei' && memberStatus === 'active') {
        await db
          .update(shinobiTeams)
          .set({
            senseiCharacterId: targetChar.id,
            senseiUid: targetChar.userUid,
            senseiName: targetChar.name,
            updatedAt: new Date(),
          })
          .where(eq(shinobiTeams.id, teamId));
      }

      if (memberStatus === 'invited') {
        io.to(`user:${targetChar.userUid}`).emit('push:notify', {
          title: `Convite de Equipe: ${team.name}`,
          body: `${myChar.name} convidou você para ocupar a vaga de ${
            check.role === 'sensei' ? 'Sensei' : `Aluno #${check.slotIndex}`
          }.`,
          kind: 'team',
        });
      }

      io.emit('teams:updated');
      const allTeams = await hydrateTeamsList();
      res.json({ team: allTeams.find((t) => t.id === teamId), memberStatus });
    } catch (error) {
      console.error('Add team member error:', error);
      res.status(500).json({ error: 'Erro ao atualizar integrantes da equipe.' });
    }
  };

  app.post('/api/teams/:id/invite', requireAuth, (req: AuthRequest, res) =>
    handleAddTeamMember(req, res, 'invite')
  );
  app.post('/api/teams/:id/add-member', requireAuth, (req: AuthRequest, res) =>
    handleAddTeamMember(req, res, 'direct_add')
  );
  app.post('/api/teams/:id/join', requireAuth, (req: AuthRequest, res) =>
    handleAddTeamMember(req, res, 'self_join')
  );

  app.post('/api/teams/:id/respond', requireAuth, async (req: AuthRequest, res) => {
    try {
      const teamId = Number(req.params.id);
      const { accept } = req.body || {};
      const [myChar] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!myChar) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const [membership] = await db
        .select()
        .from(shinobiTeamMembers)
        .where(
          and(
            eq(shinobiTeamMembers.teamId, teamId),
            eq(shinobiTeamMembers.characterId, myChar.id)
          )
        )
        .limit(1);

      if (!membership) {
        return res.status(404).json({ error: 'Convite não encontrado nesta equipe.' });
      }

      if (accept) {
        await db
          .update(shinobiTeamMembers)
          .set({ status: 'active' })
          .where(eq(shinobiTeamMembers.id, membership.id));

        if (membership.role === 'sensei') {
          await db
            .update(shinobiTeams)
            .set({
              senseiCharacterId: myChar.id,
              senseiUid: myChar.userUid,
              senseiName: myChar.name,
              updatedAt: new Date(),
            })
            .where(eq(shinobiTeams.id, teamId));
        }
      } else {
        await db.delete(shinobiTeamMembers).where(eq(shinobiTeamMembers.id, membership.id));
      }

      io.emit('teams:updated');
      res.json({ ok: true, accepted: Boolean(accept) });
    } catch (error) {
      console.error('Respond team invite error:', error);
      res.status(500).json({ error: 'Erro ao responder convite de equipe.' });
    }
  });

  app.post('/api/teams/:id/remove', requireAuth, async (req: AuthRequest, res) => {
    try {
      const teamId = Number(req.params.id);
      const { characterId } = req.body || {};
      const [myChar] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!myChar) return res.status(404).json({ error: 'Personagem não encontrado.' });

      const [team] = await db.select().from(shinobiTeams).where(eq(shinobiTeams.id, teamId)).limit(1);
      if (!team) return res.status(404).json({ error: 'Equipe não encontrada.' });

      const targetId = Number(characterId || myChar.id);
      const isLeader = team.senseiUid === myChar.userUid || req.authUser!.role === 'admin';
      if (targetId !== myChar.id && !isLeader) {
        return res.status(403).json({ error: 'Apenas o Sensei da equipe pode remover outro integrante.' });
      }

      await db
        .delete(shinobiTeamMembers)
        .where(
          and(eq(shinobiTeamMembers.teamId, teamId), eq(shinobiTeamMembers.characterId, targetId))
        );

      const remaining = await db
        .select()
        .from(shinobiTeamMembers)
        .where(eq(shinobiTeamMembers.teamId, teamId));

      if (remaining.length === 0) {
        await db.delete(teamMissions).where(eq(teamMissions.teamId, teamId));
        await db.delete(shinobiTeams).where(eq(shinobiTeams.id, teamId));
      } else if (team.senseiCharacterId === targetId) {
        await db
          .update(shinobiTeams)
          .set({
            senseiCharacterId: 0,
            senseiUid: '',
            senseiName: 'Vaga de Sensei Aberta',
            updatedAt: new Date(),
          })
          .where(eq(shinobiTeams.id, teamId));
      }

      io.emit('teams:updated');
      res.json({ ok: true });
    } catch (error) {
      console.error('Remove team member error:', error);
      res.status(500).json({ error: 'Erro ao remover integrante da equipe.' });
    }
  });

  // Team Co-op Missions
  app.get('/api/team-missions/catalog', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureWorldSeeded();
      const [myChar] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      const allTeams = await hydrateTeamsList();
      const myTeams = myChar
        ? allTeams.filter((t) =>
            t.members.some((m) => m.characterId === myChar.id && m.status === 'active')
          )
        : [];
      const activeTeam = myTeams[0] || null;

      const activeMembers = activeTeam
        ? activeTeam.members.filter((m) => m.status === 'active')
        : [];
      const squadSize = Math.max(1, activeMembers.length);
      const avgLevel =
        activeMembers.length > 0
          ? activeMembers.reduce((s, m) => s + (m.level || 1), 0) / activeMembers.length
          : myChar?.level || 1;

      const catalog = TEAM_MISSION_TEMPLATES.map((tpl) =>
        scaleTeamMission(tpl, squadSize, avgLevel, activeTeam?.synergy)
      );

      const myTeamIds = myTeams.map((t) => t.id);
      const runs =
        myTeamIds.length > 0
          ? await db
              .select()
              .from(teamMissions)
              .where(inArray(teamMissions.teamId, myTeamIds))
              .orderBy(desc(teamMissions.createdAt))
              .limit(10)
          : [];

      res.json({ catalog, myTeams, activeTeam, runs });
    } catch (error) {
      console.error('Get team missions catalog error:', error);
      res.status(500).json({ error: 'Erro ao carregar missões em equipe.' });
    }
  });

  app.post('/api/team-missions/start', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { teamId, missionId } = req.body || {};
      const tpl = TEAM_MISSION_TEMPLATES.find((t) => t.id === missionId);
      if (!tpl) return res.status(404).json({ error: 'Missão em equipe não encontrada.' });

      const allTeams = await hydrateTeamsList();
      const team = allTeams.find((t) => t.id === Number(teamId));
      if (!team) return res.status(404).json({ error: 'Equipe não encontrada.' });

      const activeMembers = team.members.filter((m) => m.status === 'active');
      if (activeMembers.length === 0) {
        return res.status(400).json({ error: 'A equipe não possui membros ativos.' });
      }

      const isMember = activeMembers.some((m) => m.userUid === req.authUser!.uid);
      if (!isMember) {
        return res.status(403).json({ error: 'Você precisa pertencer a esta equipe para iniciar a missão.' });
      }

      // Close any lingering active run on this team only if user restarts, or reject if already active
      const existingActive = await db
        .select()
        .from(teamMissions)
        .where(and(eq(teamMissions.teamId, team.id), eq(teamMissions.status, 'active')))
        .limit(1);
      if (existingActive.length > 0) {
        return res.json({ run: existingActive[0] });
      }

      const charRows = await db
        .select()
        .from(characters)
        .where(inArray(characters.id, activeMembers.map((m) => m.characterId)));
      const charById = new Map(charRows.map((c) => [c.id, c]));

      const nowMs = Date.now();
      // Validate stamina on all human active members
      const humanMemberChecks = [];
      for (const m of activeMembers) {
        const c = charById.get(m.characterId);
        if (!c) continue;
        if (!c.userUid.startsWith('npc:')) {
          const check = consumeCharacterStamina(c, tpl.staminaCostPerMember, nowMs);
          if (!check.allowed) {
            return res.status(400).json({
              error: `${c.name}: ${check.reason}`,
            });
          }
          humanMemberChecks.push({ charId: c.id, check });
        }
      }

      // Deduct stamina upfront for human participants
      for (const item of humanMemberChecks) {
        await db
          .update(characters)
          .set({
            stamina: item.check.remainingStamina,
            staminaUpdatedAt: item.check.nextUpdatedAt,
            updatedAt: new Date(),
          })
          .where(eq(characters.id, item.charId));
      }

      const avgLevel =
        charRows.reduce((sum, c) => sum + (c.level || 1), 0) / Math.max(1, charRows.length);
      const scaled = scaleTeamMission(tpl, activeMembers.length, avgLevel, team.synergy);

      const memberPayloads = activeMembers
        .map((m) => {
          const c = charById.get(m.characterId);
          return c
            ? {
                character: c as unknown as CharacterModel,
                role: m.role,
                slotIndex: m.slotIndex,
              }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

      const battleState = buildInitialTeamMissionState({
        teamId: team.id,
        teamName: team.name,
        synergy: team.synergy,
        mission: scaled,
        members: memberPayloads,
      });

      const [savedRun] = await db
        .insert(teamMissions)
        .values({
          teamId: team.id,
          missionId: scaled.id,
          missionTitle: scaled.title,
          rank: scaled.rank,
          status: 'active',
          turnNumber: battleState.turnNumber,
          activeSlotIndex: battleState.activeSlotIndex,
          won: null,
          state: battleState as unknown as Record<string, unknown>,
        })
        .returning();

      io.to(`team:${team.id}`).emit('team:mission_updated', savedRun);
      res.status(201).json({ run: savedRun });
    } catch (error) {
      console.error('Start team mission error:', error);
      res.status(500).json({ error: 'Erro ao iniciar missão em equipe.' });
    }
  });

  app.post('/api/team-missions/:id/action', requireAuth, async (req: AuthRequest, res) => {
    try {
      const runId = Number(req.params.id);
      const { action } = req.body || {};
      const [run] = await db
        .select()
        .from(teamMissions)
        .where(eq(teamMissions.id, runId))
        .limit(1);
      if (!run) return res.status(404).json({ error: 'Missão em equipe não encontrada.' });

      const currentState = run.state as unknown as TeamMissionBattleState;
      if (currentState.status !== 'active') {
        return res.status(400).json({ error: 'Esta missão em equipe já terminou.' });
      }

      const activeFighter = currentState.squad.find(
        (f) => f.slotIndex === currentState.activeSlotIndex
      );
      if (!activeFighter) {
        return res.status(400).json({ error: 'Slot ativo inválido.' });
      }

      // Authorization: active slot owner OR team member controlling NPC teammate
      const callerIsMember = currentState.squad.some((f) => f.userUid === req.authUser!.uid);
      if (!callerIsMember) {
        return res.status(403).json({ error: 'Você não participa desta equipe.' });
      }
      const isNpcSlot = activeFighter.userUid.startsWith('npc:');
      if (!isNpcSlot && activeFighter.userUid !== req.authUser!.uid && req.authUser!.role !== 'admin') {
        return res.status(403).json({
          error: `Agora é a vez de ${activeFighter.name}. Aguarde a ação do colega de equipe.`,
        });
      }

      const parsedAction: TeamMissionActionPayload = structuredClone(action);
      if (parsedAction?.type === 'jutsu' && parsedAction.jutsuId) {
        const customRows = await db
          .select()
          .from(customContent)
          .where(and(eq(customContent.kind, 'jutsu'), eq(customContent.slug, parsedAction.jutsuId)));
        if (customRows[0]) {
          parsedAction.customJutsu = {
            ...(customRows[0].payload as unknown as JutsuDef),
            id: customRows[0].slug,
          };
        }
      }

      const prevStrainLen = currentState.ocularStrainEvents?.length || 0;
      const result = resolveTeamMissionMemberAction(
        currentState,
        currentState.activeSlotIndex,
        parsedAction
      );
      if (!result.ok) {
        return res.status(400).json({ error: result.error });
      }

      const nextState = result.state;
      const newStrains = (nextState.ocularStrainEvents || []).slice(prevStrainLen);
      for (const st of newStrains) {
        if (!st.userUid.startsWith('npc:')) {
          await db
            .update(characters)
            .set({
              leftEyeBlindness: st.leftEyeBlindness,
              rightEyeBlindness: st.rightEyeBlindness,
              updatedAt: new Date(),
            })
            .where(eq(characters.id, st.characterId));
        }
      }

      let settlementSummary: Array<{
        characterId: number;
        name: string;
        xp: number;
        ryo: number;
        merit: number;
        lootDrops: ReturnType<typeof rollMissionLootDrops>;
      }> | null = null;

      if (nextState.status === 'won' || nextState.status === 'lost') {
        const won = nextState.status === 'won';
        settlementSummary = [];
        for (const f of nextState.squad) {
          if (f.userUid.startsWith('npc:')) continue;
          const [char] = await db
            .select()
            .from(characters)
            .where(eq(characters.id, f.characterId))
            .limit(1);
          if (!char) continue;

          if (won) {
            const lootDrops = rollMissionLootDrops(nextState.mission.rank, char.level, char.village);
            const invWithLoot = mergeLootIntoInventory(char.inventory || [], lootDrops);
            const prog = applyProgression(
              { ...(char as unknown as CharacterModel), inventory: invWithLoot },
              nextState.mission.rewardXp,
              nextState.mission.rewardChakraXp,
              nextState.mission.rewardRyo,
              nextState.mission.rewardMerit
            );
            await db
              .update(characters)
              .set({
                level: prog.updated.level,
                xp: prog.updated.xp,
                chakraLevel: prog.updated.chakraLevel,
                chakraXp: prog.updated.chakraXp,
                statPoints: prog.updated.statPoints,
                meritPoints: prog.updated.meritPoints,
                ryo: prog.updated.ryo,
                rank: prog.updated.rank,
                maxHp: prog.updated.maxHp,
                hp: prog.updated.maxHp,
                maxChakra: prog.updated.maxChakra,
                chakra: prog.updated.maxChakra,
                inventory: invWithLoot,
                missionsCompleted: char.missionsCompleted + 1,
                wins: char.wins + 1,
                updatedAt: new Date(),
              })
              .where(eq(characters.id, char.id));

            settlementSummary.push({
              characterId: char.id,
              name: char.name,
              xp: nextState.mission.rewardXp,
              ryo: nextState.mission.rewardRyo,
              merit: nextState.mission.rewardMerit,
              lootDrops,
            });
          } else {
            const consolationXp = Math.round(nextState.mission.rewardXp * 0.25);
            await db
              .update(characters)
              .set({
                xp: char.xp + consolationXp,
                losses: char.losses + 1,
                updatedAt: new Date(),
              })
              .where(eq(characters.id, char.id));
            settlementSummary.push({
              characterId: char.id,
              name: char.name,
              xp: consolationXp,
              ryo: 0,
              merit: 0,
              lootDrops: [],
            });
          }
        }

        if (won) {
          const [teamRow] = await db
            .select()
            .from(shinobiTeams)
            .where(eq(shinobiTeams.id, nextState.teamId))
            .limit(1);
          if (teamRow) {
            await db
              .update(shinobiTeams)
              .set({
                missionsCompleted: teamRow.missionsCompleted + 1,
                wins: teamRow.wins + 1,
                updatedAt: new Date(),
              })
              .where(eq(shinobiTeams.id, teamRow.id));
          }
          io.emit('teams:updated');
        }
      }

      const [updatedRun] = await db
        .update(teamMissions)
        .set({
          status: nextState.status,
          turnNumber: nextState.turnNumber,
          activeSlotIndex: nextState.activeSlotIndex,
          won: nextState.status === 'active' ? null : nextState.status === 'won',
          state: nextState as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(teamMissions.id, runId))
        .returning();

      io.to(`team:${nextState.teamId}`).emit('team:mission_updated', updatedRun);
      res.json({ run: updatedRun, settlementSummary });
    } catch (error) {
      console.error('Team mission action error:', error);
      res.status(500).json({ error: 'Erro ao executar ação da missão em equipe.' });
    }
  });

  // PvP 1v1 Arena Routes
  app.get('/api/pvp/list', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureWorldSeeded();
      const [myChar] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);

      const duels = await db
        .select()
        .from(pvpDuels)
        .orderBy(desc(pvpDuels.updatedAt))
        .limit(25);

      const allChars = await db.select().from(characters).orderBy(desc(characters.level));
      const opponents = allChars
        .filter((c) => !myChar || c.id !== myChar.id)
        .map((c) => ({
          id: c.id,
          userUid: c.userUid,
          name: c.name,
          avatarUrl: c.avatarUrl,
          rank: c.rank,
          village: c.village,
          level: c.level,
          chakraNature: c.chakraNature,
          clan: c.clan,
          meritPoints: c.meritPoints,
          isNpc: c.userUid.startsWith('npc:'),
        }));

      res.json({ duels, opponents });
    } catch (error) {
      console.error('List PvP duels error:', error);
      res.status(500).json({ error: 'Erro ao listar duelos PvP.' });
    }
  });

  app.post('/api/pvp/challenge', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureWorldSeeded();
      const { mode = 'live_pvp', targetCharacterId, wagerRyo = 150 } = req.body || {};
      const safeWager = Math.max(0, Math.min(2500, Math.round(Number(wagerRyo) || 0)));

      const [myChar] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!myChar) return res.status(404).json({ error: 'Personagem não encontrado.' });

      if (myChar.ryo < safeWager) {
        return res.status(400).json({
          error: `Ryo insuficiente para esta aposta (${myChar.ryo}/${safeWager} Ryo).`,
        });
      }

      let opponentChar: typeof characters.$inferSelect | null = null;
      if (targetCharacterId) {
        const [found] = await db
          .select()
          .from(characters)
          .where(eq(characters.id, Number(targetCharacterId)))
          .limit(1);
        if (!found || found.id === myChar.id) {
          return res.status(400).json({ error: 'Oponente selecionado inválido.' });
        }
        opponentChar = found;
      }

      const resolvedMode: 'live_pvp' | 'ranked_spar' =
        mode === 'ranked_spar' || (opponentChar && opponentChar.userUid.startsWith('npc:'))
          ? 'ranked_spar'
          : 'live_pvp';

      if (resolvedMode === 'ranked_spar' && !opponentChar) {
        const candidates = await db.select().from(characters);
        opponentChar = candidates.find((c) => c.id !== myChar.id) || null;
        if (!opponentChar) {
          return res.status(400).json({ error: 'Nenhum adversário disponível no ranking ainda.' });
        }
      }

      const pvpState = buildInitialPvpState({
        mode: resolvedMode,
        village: myChar.village,
        wagerRyo: safeWager,
        challenger: myChar as unknown as CharacterModel,
        opponent:
          resolvedMode === 'ranked_spar' && opponentChar
            ? (opponentChar as unknown as CharacterModel)
            : null,
      });

      const [saved] = await db
        .insert(pvpDuels)
        .values({
          mode: resolvedMode,
          status: resolvedMode === 'ranked_spar' ? 'active' : 'waiting',
          village: myChar.village,
          wagerRyo: safeWager,
          challengerUid: myChar.userUid,
          challengerCharId: myChar.id,
          challengerName: myChar.name,
          opponentUid: opponentChar?.userUid || null,
          opponentCharId: opponentChar?.id || null,
          opponentName: opponentChar?.name || null,
          currentTurnUid: myChar.userUid,
          turnNumber: 1,
          state: pvpState as unknown as Record<string, unknown>,
        })
        .returning();

      if (resolvedMode === 'live_pvp' && opponentChar && !opponentChar.userUid.startsWith('npc:')) {
        io.to(`user:${opponentChar.userUid}`).emit('push:notify', {
          title: 'Desafio PvP 1v1 Recebido!',
          body: `${myChar.name} desafiou você na Arena PvP (aposta: ${safeWager} Ryo).`,
          kind: 'pvp',
        });
      }

      io.emit('pvp:list_updated');
      res.status(201).json({ duel: saved });
    } catch (error) {
      console.error('Create PvP challenge error:', error);
      res.status(500).json({ error: 'Erro ao criar duelo PvP.' });
    }
  });

  app.post('/api/pvp/:id/accept', requireAuth, async (req: AuthRequest, res) => {
    try {
      const duelId = Number(req.params.id);
      const [duel] = await db.select().from(pvpDuels).where(eq(pvpDuels.id, duelId)).limit(1);
      if (!duel) return res.status(404).json({ error: 'Sala PvP não encontrada.' });
      if (duel.status !== 'waiting') {
        return res.status(400).json({ error: 'Este desafio PvP já foi iniciado ou encerrado.' });
      }

      const [myChar] = await db
        .select()
        .from(characters)
        .where(eq(characters.userUid, req.authUser!.uid))
        .limit(1);
      if (!myChar) return res.status(404).json({ error: 'Personagem não encontrado.' });

      if (myChar.id === duel.challengerCharId) {
        return res.status(400).json({ error: 'Você não pode aceitar o próprio desafio.' });
      }
      if (duel.opponentCharId && duel.opponentCharId !== myChar.id) {
        return res.status(403).json({ error: 'Este desafio PvP é direcionado a outro shinobi.' });
      }
      if (myChar.ryo < duel.wagerRyo) {
        return res.status(400).json({
          error: `Ryo insuficiente para cobrir a aposta de ${duel.wagerRyo} Ryo.`,
        });
      }

      const currentState = duel.state as unknown as PvpBattleState;
      const nextState = attachPvpOpponent(currentState, myChar as unknown as CharacterModel);

      const [updated] = await db
        .update(pvpDuels)
        .set({
          status: 'active',
          opponentUid: myChar.userUid,
          opponentCharId: myChar.id,
          opponentName: myChar.name,
          currentTurnUid: duel.challengerUid,
          state: nextState as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(pvpDuels.id, duelId))
        .returning();

      io.to(`pvp:${duelId}`).emit('pvp:updated', updated);
      io.emit('pvp:list_updated');
      res.json({ duel: updated });
    } catch (error) {
      console.error('Accept PvP error:', error);
      res.status(500).json({ error: 'Erro ao aceitar duelo PvP.' });
    }
  });

  app.post('/api/pvp/:id/action', requireAuth, async (req: AuthRequest, res) => {
    try {
      const duelId = Number(req.params.id);
      const { action } = req.body || {};
      const [duel] = await db.select().from(pvpDuels).where(eq(pvpDuels.id, duelId)).limit(1);
      if (!duel) return res.status(404).json({ error: 'Duelo PvP não encontrado.' });
      if (duel.status !== 'active') {
        return res.status(400).json({ error: 'Este duelo não está ativo para ações.' });
      }

      const side: 'challenger' | 'opponent' | null =
        duel.challengerUid === req.authUser!.uid
          ? 'challenger'
          : duel.opponentUid === req.authUser!.uid
          ? 'opponent'
          : null;

      if (!side) {
        return res.status(403).json({ error: 'Você não é um dos combatentes deste duelo PvP.' });
      }

      const currentState = duel.state as unknown as PvpBattleState;
      const prevStrainLen = currentState.ocularStrainEvents?.length || 0;

      const parsedAction: PvpActionPayload = structuredClone(action);
      if (parsedAction?.type === 'jutsu' && parsedAction.jutsuId) {
        const customRows = await db
          .select()
          .from(customContent)
          .where(and(eq(customContent.kind, 'jutsu'), eq(customContent.slug, parsedAction.jutsuId)));
        if (customRows[0]) {
          parsedAction.customJutsu = {
            ...(customRows[0].payload as unknown as JutsuDef),
            id: customRows[0].slug,
          };
        }
      }

      const resAction = resolvePvpAction(currentState, side, parsedAction);
      if (!resAction.ok) {
        return res.status(400).json({ error: resAction.error });
      }

      let nextState = resAction.state;

      // In Ranked Spar 1v1, the opponent counter-acts immediately on server
      if (
        nextState.mode === 'ranked_spar' &&
        !nextState.winnerSide &&
        nextState.activeTurnSide === 'opponent'
      ) {
        nextState = executeSparAiTurn(nextState);
      }

      // Sync ocular blindness strain to characters
      const newStrains = (nextState.ocularStrainEvents || []).slice(prevStrainLen);
      for (const st of newStrains) {
        if (!st.userUid.startsWith('npc:')) {
          await db
            .update(characters)
            .set({
              leftEyeBlindness: st.leftEyeBlindness,
              rightEyeBlindness: st.rightEyeBlindness,
              updatedAt: new Date(),
            })
            .where(eq(characters.id, st.characterId));
        }
      }

      let winnerUid: string | null = null;
      let winnerName: string | null = null;

      if (nextState.winnerSide) {
        const winnerFighter =
          nextState.winnerSide === 'challenger' ? nextState.challenger : nextState.opponent!;
        const loserFighter =
          nextState.winnerSide === 'challenger' ? nextState.opponent! : nextState.challenger;
        winnerUid = winnerFighter.userUid;
        winnerName = winnerFighter.name;

        const [winnerRow] = await db
          .select()
          .from(characters)
          .where(eq(characters.id, winnerFighter.characterId))
          .limit(1);
        const [loserRow] = await db
          .select()
          .from(characters)
          .where(eq(characters.id, loserFighter.characterId))
          .limit(1);

        const wagerTransfer = nextState.wagerRyo;
        const meritGain = nextState.mode === 'live_pvp' ? 65 : 40;
        const xpGain = nextState.mode === 'live_pvp' ? 85 : 55;

        if (winnerRow) {
          const prog = applyProgression(
            winnerRow as unknown as CharacterModel,
            xpGain,
            Math.round(xpGain * 0.6),
            wagerTransfer,
            meritGain
          );
          await db
            .update(characters)
            .set({
              level: prog.updated.level,
              xp: prog.updated.xp,
              chakraLevel: prog.updated.chakraLevel,
              chakraXp: prog.updated.chakraXp,
              statPoints: prog.updated.statPoints,
              meritPoints: prog.updated.meritPoints,
              ryo: prog.updated.ryo,
              wins: winnerRow.wins + 1,
              updatedAt: new Date(),
            })
            .where(eq(characters.id, winnerRow.id));
        }

        if (loserRow && !loserRow.userUid.startsWith('npc:')) {
          await db
            .update(characters)
            .set({
              ryo: Math.max(0, loserRow.ryo - wagerTransfer),
              losses: loserRow.losses + 1,
              updatedAt: new Date(),
            })
            .where(eq(characters.id, loserRow.id));
        }

        await db.insert(analyticsEvents).values({
          eventType: 'pvp_duel_finished',
          userUid: winnerFighter.userUid,
          characterName: winnerFighter.name,
          village: winnerFighter.village,
          valueNum: wagerTransfer,
          meta: {
            duelId,
            mode: nextState.mode,
            loserName: loserFighter.name,
            turns: nextState.turnNumber,
          },
        });
      }

      const nextTurnUid =
        nextState.activeTurnSide === 'challenger'
          ? duel.challengerUid
          : duel.opponentUid || duel.challengerUid;

      const [updated] = await db
        .update(pvpDuels)
        .set({
          status: nextState.winnerSide ? 'finished' : 'active',
          currentTurnUid: nextTurnUid,
          turnNumber: nextState.turnNumber,
          winnerUid,
          winnerName,
          state: nextState as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(pvpDuels.id, duelId))
        .returning();

      io.to(`pvp:${duelId}`).emit('pvp:updated', updated);
      io.emit('pvp:list_updated');
      res.json({ duel: updated });
    } catch (error) {
      console.error('PvP action error:', error);
      res.status(500).json({ error: 'Erro ao processar ação no duelo PvP.' });
    }
  });

  // Vite dev middleware or static dist serving (lazy-awaited so port 3000 binds immediately on cold start)
  if (!isProduction) {
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: { middlewareMode: true, hmr: false, ws: false },
        appType: 'spa',
      })
    );
    vitePromise.catch((err) => {
      console.error('Vite dev middleware initialization error:', err);
    });
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Konoha Defenders server listening on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
