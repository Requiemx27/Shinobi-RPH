import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Backpack,
  BookOpen,
  Clock,
  Crown,
  Eye,
  Flame,
  Globe,
  MapPin,
  MessageSquare,
  ScrollText,
  Swords,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  buildDefaultGeopoliticsState,
  calculateEffectiveStats,
  CharacterModel,
  computeCurrentStamina,
  formatStaminaCountdown,
  generateActiveWarMissions,
  getOcularState,
  getSharinganStageNumber,
  getVillageGeopoliticsOverview,
  xpRequiredForLevel,
} from '../game/engine.ts';
import {
  GeopoliticsWorldState,
  getJutsuImage,
  getVillageImage,
  JUTSU_CATALOG,
  VILLAGES,
} from '../game/narutoData.ts';
import { ForumNavSection } from './ForumHeader.tsx';
import { ForumPost, ForumThread } from './ForumBoard.tsx';
import { NinjaAvatar } from './NinjaAvatar.tsx';

interface HomePageProps {
  character: CharacterModel;
  allCharacters: CharacterModel[];
  threads: ForumThread[];
  posts: ForumPost[];
  onlineCount: number;
  geopolitics?: GeopoliticsWorldState;
  onNavigateSection: (section: ForumNavSection) => void;
  onOpenVillageBoard: (villageName: string) => void;
  onOpenThread: (threadId: number, boardName: string) => void;
  onOpenFrontlineMissions?: (villageName: string) => void;
  onOpenPvpArena?: () => void;
}

const FEATURED_JUTSU_IDS = [
  'rasenshuriken',
  'amaterasu',
  'mokuton_shinsuusenju',
  'kenjutsu_mikazuki_no_mai',
];

export const HomePage: React.FC<HomePageProps> = ({
  character,
  allCharacters,
  threads,
  posts,
  onlineCount,
  geopolitics,
  onNavigateSection,
  onOpenVillageBoard,
  onOpenThread,
  onOpenFrontlineMissions,
  onOpenPvpArena,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const worldGeo = useMemo(
    () => geopolitics || buildDefaultGeopoliticsState(),
    [geopolitics]
  );

  const liveStamina = useMemo(
    () => computeCurrentStamina(character, nowMs),
    [character, nowMs]
  );

  const sharinganStage = useMemo(
    () => getSharinganStageNumber(character.kekkeiGenkai, character.clan),
    [character.kekkeiGenkai, character.clan]
  );
  const ocularState = useMemo(() => getOcularState(character), [character]);

  const activeWarMissions = useMemo(
    () => generateActiveWarMissions(worldGeo, character),
    [worldGeo, character]
  );

  const greatNations = useMemo(() => VILLAGES.slice(0, 5), []);
  const homeVillageMeta = useMemo(
    () => VILLAGES.find((v) => v.name === character.village) || VILLAGES[0],
    [character.village]
  );
  const heroBackdrop = useMemo(
    () =>
      getVillageImage(character.village) ||
      'https://static.wikia.nocookie.net/naruto/images/3/34/Konohagakure.png/revision/latest/scale-to-width-down/800?cb=20160728115517',
    [character.village]
  );

  const featuredJutsus = useMemo(
    () =>
      FEATURED_JUTSU_IDS.map((id) => JUTSU_CATALOG.find((j) => j.id === id)).filter(
        (j): j is NonNullable<typeof j> => Boolean(j)
      ),
    []
  );
  const appointedKages = useMemo(() => allCharacters.filter((c) => c.isKage), [allCharacters]);
  const activeRpThreads = useMemo(() => {
    const repliedIds = new Set<number>();
    for (const p of posts) {
      if (p.authorUid !== 'system:narrador') repliedIds.add(p.threadId);
    }
    return threads.filter((th) => !th.category.startsWith('loc:') || repliedIds.has(th.id));
  }, [threads, posts]);
  const villageLocationCount = useMemo(
    () => threads.filter((th) => th.village === character.village && th.category.startsWith('loc:')).length,
    [threads, character.village]
  );
  const recentThreads = useMemo(() => activeRpThreads.slice(0, 5), [activeRpThreads]);
  const effStats = useMemo(() => calculateEffectiveStats(character), [character]);
  const xpNeeded = useMemo(() => xpRequiredForLevel(character.level), [character.level]);
  const xpPercent = Math.min(
    100,
    Math.max(4, Math.round((character.xp / Math.max(1, xpNeeded)) * 100))
  );
  const staminaPercent = Math.min(
    100,
    Math.max(0, Math.round((liveStamina.stamina / Math.max(1, liveStamina.maxStamina)) * 100))
  );
  const totalBagItems = useMemo(
    () => (character.inventory || []).reduce((sum, i) => sum + (i.qty || 0), 0),
    [character.inventory]
  );
  const geoOverview = useMemo(
    () => getVillageGeopoliticsOverview(worldGeo, character.village),
    [worldGeo, character.village]
  );

  return (
    <div className="space-y-11 pb-16 bg-[#050505]">
      {/* 1. Portal de Boas-Vindas & Entrada no RPG */}
      <section className="relative overflow-hidden border-b border-[#1E1E26] bg-[#050505] min-h-[450px] md:min-h-[510px] flex items-end">
        <img
          src={heroBackdrop}
          alt={`Portal de Entrada Konoha Defenders — ${character.village}`}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/92 to-[#050505]/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/45 to-transparent" />

        <div className="relative z-10 max-w-[1360px] w-full mx-auto px-4 md:px-6 py-10 md:py-14 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#22C55E]">
              <span>Portal Oficial de Entrada</span>
              <span aria-hidden="true" className="text-[#52525B]">·</span>
              <span>RPG Play-by-Forum Shinobi</span>
              <span aria-hidden="true" className="text-[#52525B]">·</span>
              <span className="tabular-nums">{onlineCount} Shinobi Online</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-[54px] font-bold text-[#F8FAFC] tracking-tight leading-[1.06] text-balance">
              Bem-vindo ao Konoha Defenders
            </h1>

            <p className="text-sm md:text-base text-[#D4D4D8] leading-relaxed max-w-xl">
              Sua jornada começa em <strong className="text-[#F8FAFC]">{character.village}</strong> ({homeVillageMeta.country}). Construa sua lenda escrevendo nos locais Play-by-Forum da sua vila, cumpra o quadro exclusivo de missões locais ou lute nas Missões da Guerra Ativa enquanto equilibra sua Stamina em tempo real com descanso e interpretação entre jogadores.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onOpenVillageBoard(character.village)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Entrar nos Locais RP de {character.village}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateSection('missions')}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-md bg-[#0C0C10] hover:bg-[#15151C] border border-[#10B981] text-[#F8FAFC] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Swords className="w-4 h-4 text-[#22C55E]" />
                <span>Quadro de {character.village}</span>
              </button>

              {activeWarMissions.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenFrontlineMissions
                      ? onOpenFrontlineMissions(character.village)
                      : onNavigateSection('missions')
                  }
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-md bg-[#0C0C10] hover:bg-[#15151C] border border-[#272732] hover:border-[#10B981] text-[#E4E4E7] text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Flame className="w-4 h-4 text-red-400" />
                  <span>Missões da Guerra ({activeWarMissions.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Live World Entry Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 bg-[#0C0C10] border border-[#24242E] rounded-xl p-5 shrink-0 font-mono tabular-nums">
            <div>
              <div className="text-[11px] text-[#A1A1AA]">Vilas Ocultas</div>
              <div className="text-xl md:text-2xl font-bold text-[#F8FAFC]">{VILLAGES.length}</div>
              <div className="text-[11px] text-[#71717A]">Quadros próprios</div>
            </div>
            <div className="border-l border-[#24242E] pl-4 sm:pl-5">
              <div className="text-[11px] text-[#A1A1AA]">Jutsus da Obra</div>
              <div className="text-xl md:text-2xl font-bold text-[#22C55E]">{JUTSU_CATALOG.length}</div>
              <div className="text-[11px] text-[#71717A]">Ninjutsu & Kenjutsu</div>
            </div>
            <div className="border-l border-[#24242E] pl-4 sm:pl-5">
              <div className="text-[11px] text-[#A1A1AA]">Guerras Ativas</div>
              <div className="text-xl md:text-2xl font-bold text-red-400">
                {geoOverview.globalActiveConflicts.length}
              </div>
              <div className="text-[11px] text-[#71717A]">{activeWarMissions.length} missões bélicas</div>
            </div>
            <div className="border-l border-[#24242E] pl-4 sm:pl-5">
              <div className="text-[11px] text-[#A1A1AA]">Locais de {character.village}</div>
              <div className="text-xl md:text-2xl font-bold text-[#F8FAFC]">
                {Math.max(5, villageLocationCount)}
              </div>
              <div className="text-[11px] text-[#22C55E]">Abertos p/ RP</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Guia de Entrada: Como Funciona o RPG (01 - 04) */}
      <section className="max-w-[1360px] mx-auto px-4 md:px-6 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1E1E26] pb-3.5">
          <div>
            <div className="text-xs font-mono text-[#22C55E]">
              Guia Oficial de Entrada · Primeiros Passos no Mundo Shinobi
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-[#F8FAFC] text-balance">
              Como Jogar do Início à Ascensão Ninja
            </h2>
          </div>
          <span className="text-xs text-[#A1A1AA]">
            Progressão cadenciada por Stamina para valorizar o Roleplay entre jogadores
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="jcink-shell rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-[#10B981] transition-colors">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono text-[#22C55E]">
                <span>01. Origem & Linhagem</span>
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="font-display text-base font-bold text-[#F8FAFC]">
                Ficha, Clãs & Dōjutsu em Batalha
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Escolha entre 23 clãs canônicos. Uchihas evoluem o Sharingan (Nv. 1 → 2 → 3 → Mangekyou), precisam ativá-lo na luta e lidam com o risco real de cegueira no Mangekyou, Izanagi e Izanami.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('character')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22C55E] hover:text-[#4ADE80] cursor-pointer whitespace-nowrap"
            >
              <span>Inspecionar Minha Ficha</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="jcink-shell rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-[#10B981] transition-colors">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono text-[#22C55E]">
                <span>02. Imersão Play-by-Forum</span>
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="font-display text-base font-bold text-[#F8FAFC]">
                Locais Ilustrados & Descanso Social
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Cada vilarejo conta com cenários oficiais iniciados por narrativa descritiva e arte da obra. Enquanto sua Stamina se recupera com o tempo, reúna-se nos locais da vila para interpretar com outros ninjas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenVillageBoard(character.village)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22C55E] hover:text-[#4ADE80] cursor-pointer whitespace-nowrap"
            >
              <span>Visitar Locais de {character.village}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="jcink-shell rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-[#10B981] transition-colors">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono text-[#22C55E]">
                <span>03. Dever & Stamina</span>
                <Swords className="w-4 h-4" />
              </div>
              <h3 className="font-display text-base font-bold text-[#F8FAFC]">
                Quadro Exclusivo da Sua Vila & Grid 7×5
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Todo shinobi cumpre exclusivamente o quadro de missões de {character.village} (Ranks D a S). Cada missão consome Stamina (+1 STA a cada 2 min), impedindo rush solitário e equilibrando o mundo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('missions')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22C55E] hover:text-[#4ADE80] cursor-pointer whitespace-nowrap"
            >
              <span>Abrir Quadro de {character.village}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="jcink-shell rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-[#10B981] transition-colors">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono text-[#22C55E]">
                <span>04. Guerra & Diplomacia</span>
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="font-display text-base font-bold text-[#F8FAFC]">
                Missões da Guerra Ativa & Kages
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Quando vilarejos entram em confronto armado, abrem-se Missões da Guerra no front com recompensas ampliadas de Ryo e Mérito, além de tratados diplomáticos geridos pelos Kages.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                activeWarMissions.length > 0 && onOpenFrontlineMissions
                  ? onOpenFrontlineMissions(character.village)
                  : onNavigateSection('geopolitics')
              }
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22C55E] hover:text-[#4ADE80] cursor-pointer whitespace-nowrap"
            >
              <span>
                {activeWarMissions.length > 0 ? 'Ir às Missões da Guerra' : 'Abrir Mapa Geopolítico'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Passaporte de Entrada do Seu Shinobi (Status Vivo, Stamina & Luz Ocular) */}
      <section className="max-w-[1360px] mx-auto px-4 md:px-6">
        <div className="jcink-shell rounded-xl p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <NinjaAvatar src={character.avatarUrl} alt={character.name} sizeClass="w-14 h-14" />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#A1A1AA]">
                  <span className="font-semibold text-[#22C55E]">Passaporte Shinobi Ativo</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#F8FAFC] font-medium">{character.rank}</span>
                  <span aria-hidden="true">·</span>
                  <span>{character.village}</span>
                  <span aria-hidden="true">·</span>
                  <span>Clã {character.clan}</span>
                  {character.profession && character.profession !== 'Nenhuma' ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#E4E4E7]">{character.profession}</span>
                    </>
                  ) : null}
                </div>
                <div className="font-display text-xl font-bold text-[#F8FAFC] truncate">
                  {character.name}
                </div>
                <div className="flex items-center gap-3 max-w-sm">
                  <div className="h-1.5 flex-1 rounded-full bg-[#16161E] overflow-hidden">
                    <div
                      className="h-full bg-[#10B981] origin-left transition-transform duration-200"
                      style={{ transform: `scaleX(${xpPercent / 100})` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-[#A1A1AA] whitespace-nowrap">
                    Nv.{character.level} ({character.xp}/{xpNeeded} XP)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenVillageBoard(character.village)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer whitespace-nowrap transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                RP em {character.village}
              </button>
              <button
                type="button"
                onClick={() => onNavigateSection('character')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#08080B] hover:border-[#10B981] border border-[#24242E] text-xs font-medium text-[#F8FAFC] cursor-pointer whitespace-nowrap"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                Ficha
              </button>
              <button
                type="button"
                onClick={() => onNavigateSection('jutsus')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#08080B] hover:border-[#10B981] border border-[#24242E] text-xs font-medium text-[#F8FAFC] cursor-pointer whitespace-nowrap"
              >
                <ScrollText className="w-3.5 h-3.5 text-[#22C55E]" />
                Dojo ({JUTSU_CATALOG.length})
              </button>
              <button
                type="button"
                onClick={() => onNavigateSection('teams')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#08080B] hover:border-[#10B981] border border-[#24242E] text-xs font-medium text-[#F8FAFC] cursor-pointer whitespace-nowrap"
              >
                <Users className="w-3.5 h-3.5 text-[#22C55E]" />
                Equipes (1+3)
              </button>
              {onOpenPvpArena && (
                <button
                  type="button"
                  onClick={onOpenPvpArena}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#08080B] hover:border-[#10B981] border border-[#24242E] text-xs font-medium text-[#F8FAFC] cursor-pointer whitespace-nowrap"
                >
                  <Swords className="w-3.5 h-3.5 text-red-400" />
                  Arena PvP 1v1
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigateSection('market')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#08080B] hover:border-[#10B981] border border-[#24242E] text-xs font-medium text-[#F8FAFC] cursor-pointer whitespace-nowrap"
              >
                <Backpack className="w-3.5 h-3.5 text-[#22C55E]" />
                Mochila ({totalBagItems})
              </button>
            </div>
          </div>

          {/* Live Telemetry Row: Stamina + Ocular/Combat + Wallet + Diplomacy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-[#1E1E26] font-mono text-xs tabular-nums">
            <div className="rounded-lg bg-[#08080B] border border-[#1E1E26] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#A1A1AA] inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#22C55E]" />
                  Stamina de Missão
                </span>
                <span className={liveStamina.stamina < 24 ? 'text-amber-400 font-bold' : 'text-[#22C55E] font-bold'}>
                  {liveStamina.stamina}/{liveStamina.maxStamina} STA
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#15151D] overflow-hidden">
                <div
                  className={`h-full origin-left transition-transform duration-200 ${
                    liveStamina.stamina < 24 ? 'bg-amber-400' : 'bg-[#10B981]'
                  }`}
                  style={{ transform: `scaleX(${staminaPercent / 100})` }}
                />
              </div>
              <div className="text-[11px] text-[#A1A1AA]">
                {liveStamina.isFull
                  ? 'Fôlego completo · Pronto para missões'
                  : `+1 STA em ${formatStaminaCountdown(liveStamina.secondsUntilNextPoint)} (Total em ${formatStaminaCountdown(liveStamina.secondsUntilFull)})`}
              </div>
            </div>

            <div className="rounded-lg bg-[#08080B] border border-[#1E1E26] p-3.5 space-y-1.5">
              <div className="text-[11px] text-[#A1A1AA]">Prontidão de Combate</div>
              <div className="text-sm font-bold text-[#F8FAFC]">
                HP {effStats.maxHp} · CH {effStats.maxChakra}
              </div>
              <div className="text-[11px] text-[#22C55E]">
                {character.learnedJutsus.length} Jutsus · {character.missionsCompleted} Missões concl.
              </div>
            </div>

            {sharinganStage >= 1 ? (
              <div className="rounded-lg bg-[#08080B] border border-[#1E1E26] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#A1A1AA] inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-[#22C55E]" />
                    Luz Ocular (Sharingan)
                  </span>
                  <span className={ocularState.bothBlind ? 'text-red-400 font-bold' : 'text-[#22C55E]'}>
                    Esq {ocularState.leftLightPct}% · Dir {ocularState.rightLightPct}%
                  </span>
                </div>
                <div className="text-xs font-bold text-[#F8FAFC] truncate">
                  {character.kekkeiGenkai === 'Sharingan' ? 'Sharingan (Nível 1)' : character.kekkeiGenkai}
                </div>
                <div className="text-[11px] text-[#A1A1AA] truncate">{ocularState.visionLabel}</div>
              </div>
            ) : (
              <div className="rounded-lg bg-[#08080B] border border-[#1E1E26] p-3.5 space-y-1.5">
                <div className="text-[11px] text-[#A1A1AA]">Afinidade & Linhagem</div>
                <div className="text-sm font-bold text-[#F8FAFC] truncate">
                  {character.chakraNature}
                  {character.secondaryChakraNature && character.secondaryChakraNature !== 'Nenhum'
                    ? ` + ${character.secondaryChakraNature}`
                    : ''}
                </div>
                <div className="text-[11px] text-[#22C55E] truncate">
                  Kekkei: {character.kekkeiGenkai}
                </div>
              </div>
            )}

            <div className="rounded-lg bg-[#08080B] border border-[#1E1E26] p-3.5 space-y-1.5">
              <div className="text-[11px] text-[#A1A1AA]">Tesouraria & Alianças</div>
              <div className="text-sm font-bold text-[#22C55E]">
                {character.ryo.toLocaleString('pt-BR')} Ryo
              </div>
              <div className="text-[11px] text-[#A1A1AA]">
                {geoOverview.allies.length} Aliados · {geoOverview.enemies.length} Rivais · {character.meritPoints} Mérito
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Guerras Ativas & Acesso Direto às Missões da Guerra */}
      {geoOverview.globalActiveConflicts.length > 0 && (
        <section className="max-w-[1360px] mx-auto px-4 md:px-6 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1E1E26] pb-3">
            <div>
              <div className="text-xs font-mono text-red-400">
                Campanhas Militares Abertas · Missões da Guerra Disponíveis
              </div>
              <h2 className="font-display text-xl md:text-2xl font-bold text-[#F8FAFC]">
                Frentes de Guerra em Andamento ({geoOverview.globalActiveConflicts.length})
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {onOpenFrontlineMissions && (
                <button
                  type="button"
                  onClick={() => onOpenFrontlineMissions(character.village)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#22C55E] hover:text-[#4ADE80] cursor-pointer whitespace-nowrap"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Abrir Quadro de Missões da Guerra ({activeWarMissions.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigateSection('geopolitics')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F8FAFC] cursor-pointer whitespace-nowrap"
              >
                <span>Painel de Geopolítica</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {geoOverview.globalActiveConflicts.slice(0, 4).map((c) => {
              const involvesOwnVillage =
                c.villageA === character.village || c.villageB === character.village;
              return (
                <div
                  key={c.id}
                  className={`jcink-shell rounded-xl p-4 flex flex-col justify-between gap-3 border transition-colors ${
                    involvesOwnVillage
                      ? 'border-[#10B981] bg-[#09100D]'
                      : 'border-[#261B1E] hover:border-[#10B981]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className="text-red-400 inline-flex items-center gap-1 font-semibold">
                        <Flame className="w-3.5 h-3.5" />
                        Intensidade {c.intensity}%
                      </span>
                      <span className="text-[#22C55E] font-semibold">
                        +{involvesOwnVillage ? Math.max(25, c.bonusRyoPct + 10) : c.bonusRyoPct}% Ryo
                      </span>
                    </div>
                    <div className="font-display text-sm font-bold text-[#F8FAFC]">
                      {c.villageA} <span className="text-red-400 font-mono text-xs">VS</span>{' '}
                      {c.villageB}
                    </div>
                    <div className="text-[11px] text-[#E4E4E7] font-medium">{c.frontName}</div>
                    <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">{c.summary}</p>
                  </div>

                  <div className="pt-2 border-t border-[#1E1E26] flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenFrontlineMissions
                          ? onOpenFrontlineMissions(character.village)
                          : onNavigateSection('missions')
                      }
                      className="text-[#22C55E] hover:text-[#4ADE80] font-semibold cursor-pointer whitespace-nowrap"
                    >
                      Combater na Guerra →
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateSection('geopolitics')}
                      className="text-[#A1A1AA] hover:text-white cursor-pointer whitespace-nowrap"
                    >
                      Tratados
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. As Cinco Grandes Nações Shinobi — Locais Play-by-Forum */}
      <section className="max-w-[1360px] mx-auto px-4 md:px-6 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1E1E26] pb-3.5">
          <div>
            <div className="text-xs font-mono text-[#22C55E]">
              Territórios & Cenários Play-by-Forum
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-[#F8FAFC] text-balance">
              As Cinco Grandes Nações Shinobi
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateSection('forum')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22C55E] hover:text-[#4ADE80] cursor-pointer whitespace-nowrap"
          >
            <span>Explorar todas as {VILLAGES.length} vilas no Fórum</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {greatNations.map((v) => {
            const kage = allCharacters.find((c) => c.village === v.name && c.isKage);
            const villageThreadCount = activeRpThreads.filter((th) => th.village === v.name).length;
            const isHome = v.name === character.village;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onOpenVillageBoard(v.name)}
                className={`group jcink-shell rounded-xl overflow-hidden text-left flex flex-col transition-colors cursor-pointer ${
                  isHome ? 'border-[#10B981]' : 'hover:border-[#10B981]'
                }`}
              >
                {v.imageUrl ? (
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#070709]">
                    <img
                      src={v.imageUrl}
                      alt={`${v.name} — ${v.country}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C10] via-[#0C0C10]/35 to-transparent" />
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs">
                      <span className="font-display text-sm font-bold text-[#F8FAFC] drop-shadow">
                        {v.emblemGlyph}
                      </span>
                      {isHome && (
                        <span className="font-mono text-[10px] font-semibold text-[#22C55E] drop-shadow">
                          Sua Vila
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-2.5 left-3 right-3">
                      <div className="font-display text-base font-bold text-[#F8FAFC] leading-tight">
                        {v.name}
                      </div>
                      <div className="text-[11px] text-[#22C55E] font-medium">{v.country}</div>
                    </div>
                  </div>
                ) : (
                  <div className="px-3.5 pt-3.5 pb-1 border-b border-[#1E1E26] flex items-center justify-between gap-2">
                    <div>
                      <div className="font-display text-base font-bold text-[#F8FAFC] leading-tight">
                        {v.name}
                      </div>
                      <div className="text-[11px] text-[#22C55E] font-medium">{v.country}</div>
                    </div>
                    <div className="font-display text-sm font-bold text-[#22C55E]">
                      {v.emblemGlyph}
                    </div>
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col justify-between gap-2 text-xs">
                  <p className="text-[#A1A1AA] line-clamp-2 leading-relaxed">{v.description}</p>
                  <div className="pt-2.5 border-t border-[#1E1E26] flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
                    <span className="text-[#E4E4E7] truncate">
                      {kage ? `${v.kageTitle}: ${kage.name}` : `${v.kageTitle}: Vago`}
                    </span>
                    <span className="text-[#22C55E] shrink-0">{villageThreadCount} tóp.</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. Crônicas Recentes do Fórum, Acervo de Jutsus & Kages Vigentes */}
      <section className="max-w-[1360px] mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Threads Feed (7 cols) */}
        <div className="lg:col-span-7 jcink-shell rounded-xl overflow-hidden">
          <div className="jcink-cat-head px-5 py-3.5 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-[#22C55E]">
              Crônicas & Interações Recentes no Fórum
            </h2>
            <button
              type="button"
              onClick={() => onNavigateSection('forum')}
              className="text-xs text-[#A1A1AA] hover:text-[#F8FAFC] cursor-pointer whitespace-nowrap"
            >
              Ver Índice Completo
            </button>
          </div>
          <div className="divide-y divide-[#1E1E26]">
            {recentThreads.map((th) => {
              const threadPosts = posts.filter((p) => p.threadId === th.id);
              const last = threadPosts[threadPosts.length - 1];
              const boardTarget =
                th.category === 'kage_council'
                  ? 'Conselho Kage'
                  : th.category === 'spar_duel'
                  ? 'Arena de Duelos'
                  : th.village;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => onOpenThread(th.id, boardTarget)}
                  className="w-full text-left px-5 py-4 hover:bg-[#14141C] flex items-center justify-between gap-4 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <NinjaAvatar
                      src={last?.characterAvatar || character.avatarUrl}
                      alt={last?.characterName || th.authorName}
                      sizeClass="w-10 h-10"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#F8FAFC] truncate">{th.title}</div>
                      <div className="text-xs text-[#A1A1AA] truncate">
                        {boardTarget} · Por {th.authorName} ({th.authorRank})
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] tabular-nums shrink-0 text-[#A1A1AA]">
                    <div className="text-[#22C55E]">{threadPosts.length} posts</div>
                    <div>{last ? new Date(last.createdAt).toLocaleDateString('pt-BR') : '—'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Featured Jutsu Artworks & Council of Kages (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="jcink-shell rounded-xl overflow-hidden">
            <div className="jcink-cat-head px-5 py-3.5 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-[#22C55E]">
                Técnicas & Kenjutsus da Obra
              </h2>
              <button
                type="button"
                onClick={() => onNavigateSection('jutsus')}
                className="text-xs text-[#A1A1AA] hover:text-[#F8FAFC] cursor-pointer whitespace-nowrap"
              >
                Abrir Dojo
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {featuredJutsus.map((j) => {
                const img = getJutsuImage(j);
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => onNavigateSection('jutsus')}
                    className="group relative rounded-lg overflow-hidden border border-[#24242E] hover:border-[#10B981] bg-[#070709] text-left cursor-pointer transition-colors"
                  >
                    {img ? (
                      <>
                        <div className="aspect-[4/3] w-full overflow-hidden">
                          <img
                            src={img}
                            alt={j.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/45 to-transparent" />
                        <div className="absolute bottom-2 left-2.5 right-2.5">
                          <div className="text-[10px] font-mono text-[#22C55E]">
                            Rank {j.rank} · {j.category}
                          </div>
                          <div className="text-xs font-semibold text-[#F8FAFC] truncate">{j.name}</div>
                        </div>
                      </>
                    ) : (
                      <div className="p-3.5 h-full flex flex-col justify-end min-h-[110px]">
                        <div className="text-[10px] font-mono text-[#22C55E]">
                          Rank {j.rank} · {j.category}
                        </div>
                        <div className="text-xs font-semibold text-[#F8FAFC] truncate">{j.name}</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="jcink-shell rounded-xl overflow-hidden">
            <div className="jcink-cat-head px-5 py-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-[#22C55E] inline-flex items-center gap-1.5">
                <Crown className="w-4 h-4" />
                Kages Vigentes
              </h2>
              <button
                type="button"
                onClick={() => onNavigateSection('admin')}
                className="text-xs text-[#A1A1AA] hover:text-[#F8FAFC] cursor-pointer"
              >
                ACP
              </button>
            </div>
            <div className="p-4 space-y-2.5 text-xs">
              {appointedKages.length === 0 ? (
                <p className="text-[#A1A1AA]">Nenhum Kage nomeado pela Administração ainda.</p>
              ) : (
                appointedKages.map((k) => (
                  <div key={k.id} className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <NinjaAvatar src={k.avatarUrl} alt={k.name} sizeClass="w-8 h-8" />
                      <div className="min-w-0">
                        <div className="font-semibold text-[#F8FAFC] truncate">{k.name}</div>
                        <div className="text-[11px] text-[#A1A1AA] truncate">{k.village}</div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-[#22C55E] shrink-0">Kage</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
