import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export interface InventoryEntry {
  itemId: string;
  qty: number;
}

export interface EquippedGearMap {
  weapon: string | null;
  armor: string | null;
  headband: string | null;
  accessory: string | null;
}

export interface MissionRankCounts {
  D: number;
  C: number;
  B: number;
  A: number;
  S: number;
}

export interface ForumActionRoll {
  jutsuName: string;
  hitChance: number;
  rolled: number;
  isHit: boolean;
  isCrit: boolean;
  damage: number;
  appliedEffects?: string[];
  synergyNotes?: string[];
}

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('player'),
  language: text('language').notNull().default('pt'),
  pushEnabled: boolean('push_enabled').notNull().default(true),
  vipTier: text('vip_tier').notNull().default('genin_free'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const characters = pgTable('characters', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url').notNull(),
  country: text('country').notNull(),
  village: text('village').notNull(),
  clan: text('clan').notNull(),
  specialization: text('specialization').notNull(),
  chakraNature: text('chakra_nature').notNull(),
  secondaryChakraNature: text('secondary_chakra_nature').notNull().default('Nenhum'),
  kekkeiGenkai: text('kekkei_genkai').notNull().default('Nenhum'),
  summonContract: text('summon_contract').notNull().default('Nenhum'),
  rank: text('rank').notNull().default('Estudante da Academia'),
  profession: text('profession').notNull().default('Nenhuma'),
  isKage: boolean('is_kage').notNull().default(false),
  jinchuurikiBijuuId: text('jinchuuriki_bijuu_id'),
  bijuuMastery: integer('bijuu_mastery').notNull().default(0),
  level: integer('level').notNull().default(1),
  xp: integer('xp').notNull().default(0),
  chakraLevel: integer('chakra_level').notNull().default(1),
  chakraXp: integer('chakra_xp').notNull().default(0),
  ryo: integer('ryo').notNull().default(1500),
  meritPoints: integer('merit_points').notNull().default(100),
  statPoints: integer('stat_points').notNull().default(5),
  hp: integer('hp').notNull().default(180),
  maxHp: integer('max_hp').notNull().default(180),
  chakra: integer('chakra').notNull().default(150),
  maxChakra: integer('max_chakra').notNull().default(150),
  stamina: integer('stamina').notNull().default(100),
  maxStamina: integer('max_stamina').notNull().default(100),
  staminaUpdatedAt: timestamp('stamina_updated_at').defaultNow(),
  leftEyeBlindness: integer('left_eye_blindness').notNull().default(0),
  rightEyeBlindness: integer('right_eye_blindness').notNull().default(0),
  ninjutsu: integer('ninjutsu').notNull().default(14),
  taijutsu: integer('taijutsu').notNull().default(11),
  genjutsu: integer('genjutsu').notNull().default(9),
  velocidade: integer('velocidade').notNull().default(12),
  forca: integer('forca').notNull().default(11),
  inteligencia: integer('inteligencia').notNull().default(13),
  resistencia: integer('resistencia').notNull().default(11),
  controleChakra: integer('controle_chakra').notNull().default(13),
  learnedJutsus: jsonb('learned_jutsus').$type<string[]>().notNull().default([]),
  equippedGear: jsonb('equipped_gear')
    .$type<EquippedGearMap>()
    .notNull()
    .default({ weapon: null, armor: null, headband: null, accessory: null }),
  inventory: jsonb('inventory').$type<InventoryEntry[]>().notNull().default([]),
  missionsCompleted: integer('missions_completed').notNull().default(0),
  missionCountsByRank: jsonb('mission_counts_by_rank')
    .$type<MissionRankCounts>()
    .notNull()
    .default({ D: 0, C: 0, B: 0, A: 0, S: 0 }),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  lastDailyRewardDate: text('last_daily_reward_date'),
  dailyLoginStreak: integer('daily_login_streak').notNull().default(0),
  bio: text('bio').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const forumThreads = pgTable('forum_threads', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  village: text('village').notNull(),
  category: text('category').notNull(),
  authorUid: text('author_uid').notNull(),
  authorName: text('author_name').notNull(),
  authorRank: text('author_rank').notNull(),
  isPinned: boolean('is_pinned').notNull().default(false),
  isLocked: boolean('is_locked').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const forumPosts = pgTable('forum_posts', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id')
    .notNull()
    .references(() => forumThreads.id),
  authorUid: text('author_uid').notNull(),
  characterName: text('character_name').notNull(),
  characterAvatar: text('character_avatar').notNull(),
  characterVillage: text('character_village').notNull(),
  characterRank: text('character_rank').notNull(),
  content: text('content').notNull(),
  actionRoll: jsonb('action_roll').$type<ForumActionRoll | null>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const customContent = pgTable('custom_content', {
  id: serial('id').primaryKey(),
  kind: text('kind').notNull(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdByUid: text('created_by_uid').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const marketListings = pgTable('market_listings', {
  id: serial('id').primaryKey(),
  sellerUid: text('seller_uid').notNull(),
  sellerName: text('seller_name').notNull(),
  sellerVillage: text('seller_village').notNull(),
  itemId: text('item_id').notNull(),
  qty: integer('qty').notNull().default(1),
  priceRyo: integer('price_ryo').notNull(),
  status: text('status').notNull().default('active'),
  buyerUid: text('buyer_uid'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  channel: text('channel').notNull(),
  senderUid: text('sender_uid').notNull(),
  senderName: text('sender_name').notNull(),
  senderVillage: text('sender_village').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(),
  userUid: text('user_uid').notNull(),
  characterName: text('character_name').notNull(),
  village: text('village').notNull(),
  valueNum: integer('value_num').notNull().default(0),
  meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

export const shinobiTeams = pgTable('shinobi_teams', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  village: text('village').notNull(),
  motto: text('motto').notNull().default('Trabalho em equipe acima de tudo.'),
  senseiCharacterId: integer('sensei_character_id').notNull(),
  senseiUid: text('sensei_uid').notNull(),
  senseiName: text('sensei_name').notNull(),
  missionsCompleted: integer('missions_completed').notNull().default(0),
  wins: integer('wins').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const shinobiTeamMembers = pgTable('shinobi_team_members', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => shinobiTeams.id),
  characterId: integer('character_id').notNull(),
  userUid: text('user_uid').notNull(),
  characterName: text('character_name').notNull(),
  characterAvatar: text('character_avatar').notNull(),
  characterRank: text('character_rank').notNull(),
  characterVillage: text('character_village').notNull(),
  role: text('role').notNull().default('student'),
  slotIndex: integer('slot_index').notNull().default(1),
  status: text('status').notNull().default('active'),
  joinedAt: timestamp('joined_at').defaultNow(),
});

export const pvpDuels = pgTable('pvp_duels', {
  id: serial('id').primaryKey(),
  mode: text('mode').notNull().default('live_pvp'),
  status: text('status').notNull().default('waiting'),
  village: text('village').notNull(),
  wagerRyo: integer('wager_ryo').notNull().default(150),
  challengerUid: text('challenger_uid').notNull(),
  challengerCharId: integer('challenger_char_id').notNull(),
  challengerName: text('challenger_name').notNull(),
  opponentUid: text('opponent_uid'),
  opponentCharId: integer('opponent_char_id'),
  opponentName: text('opponent_name'),
  currentTurnUid: text('current_turn_uid').notNull(),
  turnNumber: integer('turn_number').notNull().default(1),
  winnerUid: text('winner_uid'),
  winnerName: text('winner_name'),
  state: jsonb('state').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const teamMissions = pgTable('team_missions', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => shinobiTeams.id),
  missionId: text('mission_id').notNull(),
  missionTitle: text('mission_title').notNull(),
  rank: text('rank').notNull(),
  status: text('status').notNull().default('active'),
  turnNumber: integer('turn_number').notNull().default(1),
  activeSlotIndex: integer('active_slot_index').notNull().default(0),
  won: boolean('won'),
  state: jsonb('state').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

