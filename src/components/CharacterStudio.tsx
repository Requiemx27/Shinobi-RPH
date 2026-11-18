import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  ImagePlus,
  Link2,
  Lock,
  Minus,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  CharacterModel,
  calculateClanBonuses,
  calculateEffectiveStats,
  checkSharinganEvolutionEligibility,
  computeCurrentStamina,
  formatStaminaCountdown,
  getOcularState,
  getSharinganCombatConfig,
  getSharinganStageNumber,
} from '../game/engine.ts';
import {
  AttributeKey,
  CLANS,
  CREATION_KEKKEI_GENKAI_LIST,
  ChakraNature,
  KEKKEI_GENKAI_LIST,
  PRESET_AVATARS,
  SHARINGAN_EVOLUTION_STAGES,
  SPECIALIZATIONS,
  VILLAGES,
} from '../game/narutoData.ts';
import { shinobiAudio } from '../game/sound.ts';
import { apiFetch } from '../utils/api.ts';
import { NinjaAvatar } from './NinjaAvatar.tsx';
import { XpProgressPanel } from './XpProgressPanel.tsx';

interface CharacterStudioProps {
  character: CharacterModel | null;
  defaultName?: string;
  onRefreshCharacter: () => Promise<void>;
  onCreatedCharacter?: () => void;
  onOpenJutsuQuests?: () => void;
  onOpenSummonQuests?: () => void;
}

const ATTRIBUTE_LABELS: Array<{ key: AttributeKey; label: string }> = [
  { key: 'ninjutsu', label: 'Ninjutsu' },
  { key: 'taijutsu', label: 'Taijutsu' },
  { key: 'genjutsu', label: 'Genjutsu' },
  { key: 'velocidade', label: 'Velocidade' },
  { key: 'forca', label: 'Força' },
  { key: 'inteligencia', label: 'Inteligência' },
  { key: 'resistencia', label: 'Resistência' },
  { key: 'controleChakra', label: 'Controle de Chakra' },
];

export const CharacterStudio: React.FC<CharacterStudioProps> = ({
  character,
  defaultName = '',
  onRefreshCharacter,
  onCreatedCharacter,
  onOpenJutsuQuests,
  onOpenSummonQuests,
}) => {
  const isCreationMode = !character;

  const [name, setName] = useState(character?.name || defaultName);
  const [avatarUrl, setAvatarUrl] = useState(
    character?.avatarUrl ?? PRESET_AVATARS[0].url
  );
  const [avatarOk, setAvatarOk] = useState(true);
  const [village, setVillage] = useState(character?.village || 'Konohagakure');
  const [clan, setClan] = useState(character?.clan || 'Uchiha');
  const [specialization, setSpecialization] = useState(
    character?.specialization || 'Mestre em Ninjutsu Elemental'
  );
  const [chakraNature, setChakraNature] = useState<string>(character?.chakraNature || 'Katon');
  const [kekkeiGenkai, setKekkeiGenkai] = useState(
    character?.kekkeiGenkai || 'Sharingan (Nível 1)'
  );
  const summonContract = character?.summonContract || 'Nenhum';
  const [bio, setBio] = useState(character?.bio || '');

  const [starterAlloc, setStarterAlloc] = useState<Record<AttributeKey, number>>({
    ninjutsu: 2,
    taijutsu: 0,
    genjutsu: 0,
    velocidade: 1,
    forca: 0,
    inteligencia: 1,
    resistencia: 1,
    controleChakra: 1,
  });

  const [saving, setSaving] = useState(false);
  const [evolvingSharingan, setEvolvingSharingan] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (character) {
      setName(character.name);
      setAvatarUrl(character.avatarUrl);
      setVillage(character.village);
      setClan(character.clan);
      setSpecialization(character.specialization);
      setChakraNature(character.chakraNature);
      setKekkeiGenkai(character.kekkeiGenkai);
      setBio(character.bio);
    } else if (defaultName) {
      setName((prev) => prev || defaultName);
    }
  }, [character, defaultName]);

  const effective = useMemo(
    () => (character ? calculateEffectiveStats(character) : null),
    [character]
  );

  const sharinganEvolution = useMemo(
    () => (character ? checkSharinganEvolutionEligibility(character) : null),
    [character]
  );

  const ocularSummary = useMemo(
    () => (character ? getOcularState(character) : null),
    [character]
  );

  const sharinganCombatCfg = useMemo(() => {
    if (!character) return null;
    const st = getSharinganStageNumber(character.kekkeiGenkai, character.clan);
    return getSharinganCombatConfig(st);
  }, [character]);

  const liveStamina = useMemo(
    () => (character ? computeCurrentStamina(character) : null),
    [character]
  );

  const activeClanName = character ? character.clan : clan;
  const activeClan = CLANS.find((c) => c.name === activeClanName);
  const selectedVillage = VILLAGES.find((v) => v.name === (character ? character.village : village));

  const clanBonuses = useMemo(
    () =>
      calculateClanBonuses(
        activeClanName,
        character || {
          level: 1,
          chakraLevel: 1,
          resistencia: 11 + (starterAlloc.resistencia || 0),
          controleChakra: 13 + (starterAlloc.controleChakra || 0),
        }
      ),
    [activeClanName, character, starterAlloc.resistencia, starterAlloc.controleChakra]
  );

  const starterSpent = (Object.values(starterAlloc) as number[]).reduce((a, b) => a + b, 0);
  const starterRemaining = Math.max(0, 6 - starterSpent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      if (isCreationMode) {
        await apiFetch('/api/characters/create', {
          method: 'POST',
          body: JSON.stringify({
            name,
            avatarUrl,
            village,
            country: selectedVillage?.country || 'País do Fogo',
            clan,
            specialization,
            chakraNature,
            kekkeiGenkai,
            bio,
            initialStats: starterAlloc,
          }),
        });
        shinobiAudio.playLevelUpChime();
        setStatusMsg({ text: 'Ficha shinobi criada definitivamente e liberada no fórum!' });
        await onRefreshCharacter();
        onCreatedCharacter?.();
      } else {
        await apiFetch('/api/characters/me', {
          method: 'PUT',
          body: JSON.stringify({ avatarUrl }),
        });
        shinobiAudio.playUiClick();
        setStatusMsg({ text: 'Link do avatar atualizado e sincronizado no fórum.' });
        await onRefreshCharacter();
      }
    } catch (err) {
      setStatusMsg({ text: (err as Error).message, isError: true });
    } finally {
      setSaving(false);
    }
  };

  const handleAllocateStat = async (stat: AttributeKey) => {
    try {
      await apiFetch('/api/characters/allocate-stat', {
        method: 'POST',
        body: JSON.stringify({ stat }),
      });
      shinobiAudio.playUiClick();
      await onRefreshCharacter();
    } catch (err) {
      setStatusMsg({ text: (err as Error).message, isError: true });
    }
  };

  const handleEvolveSharingan = async () => {
    if (!character) return;
    setEvolvingSharingan(true);
    setStatusMsg(null);
    try {
      const res = await apiFetch<{ stage: { title: string; bonusSummary: string } }>(
        '/api/characters/evolve-sharingan',
        { method: 'POST' }
      );
      shinobiAudio.playLevelUpChime();
      setStatusMsg({
        text: `Despertar Ocular concluído: ${res.stage.title} ativado! (${res.stage.bonusSummary})`,
      });
      await onRefreshCharacter();
    } catch (err) {
      setStatusMsg({ text: (err as Error).message, isError: true });
    } finally {
      setEvolvingSharingan(false);
    }
  };

  const isExternalLink =
    avatarUrl.trim().startsWith('http://') || avatarUrl.trim().startsWith('https://');

  const kekkeiOptions = isCreationMode
    ? CREATION_KEKKEI_GENKAI_LIST
    : KEKKEI_GENKAI_LIST;

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Top Status Banner */}
      <div className="jcink-shell rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#22C55E]">
            {isCreationMode ? <Sparkles className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>
              {isCreationMode ? 'Criação Inicial de Personagem' : 'Ficha Definitiva · Progressão Shinobi'}
            </span>
          </div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-[#F8FAFC]">
            {isCreationMode
              ? 'Crie sua Ficha Shinobi — Konoha Defenders'
              : `Ficha de ${character.name} & Linhagem Ocular`}
          </h1>
          <p className="text-xs text-[#A1A1AA]">
            {isCreationMode
              ? 'Escolha clã (2 bônus específicos), vila, elemento, cole um link de imagem para o avatar e distribua os 6 pontos iniciais. Uchihas iniciam no Sharingan (Nível 1) e evoluem até o Mangekyou!'
              : 'Os dados de origem são definitivos. Você pode atualizar o Link do Avatar (URL), evoluir o Sharingan e distribuir pontos de atributo.'}
          </p>
        </div>

        {!isCreationMode && (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#121218] border border-[#10B981] text-xs text-[#22C55E] font-mono tabular-nums">
            <ShieldCheck className="w-4 h-4" />
            <span>{character.rank} · Nv.{character.level}</span>
          </div>
        )}
      </div>

      {statusMsg && (
        <div
          className={`px-4 py-3 rounded-lg border text-xs ${
            statusMsg.isError
              ? 'bg-[#180B0E] border-red-500 text-red-200'
              : 'bg-[#0C0C10] border-[#10B981] text-[#F8FAFC]'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* SHARINGAN EVOLUTION PANEL (STAGE 1 -> STAGE 2 -> STAGE 3 -> MANGEKYOU SHARINGAN) */}
      {!isCreationMode && sharinganEvolution?.isSharinganUser && (
        <section className="jcink-shell rounded-xl overflow-hidden">
          <div className="jcink-cat-head px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#22C55E]" />
              <h2 className="font-display text-base font-bold text-[#F8FAFC]">
                Evolução do Sharingan (Nível 1 → Nível 2 → Nível 3 → Mangekyou Sharingan)
              </h2>
            </div>
            <span className="font-mono text-xs tabular-nums text-[#22C55E]">
              Estágio Atual: {character.kekkeiGenkai === 'Sharingan' ? 'Sharingan (Nível 1)' : character.kekkeiGenkai}
            </span>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {SHARINGAN_EVOLUTION_STAGES.map((st) => {
                const charStage = getSharinganStageNumber(character.kekkeiGenkai, character.clan);
                const isUnlocked = charStage >= st.stage;
                const isCurrent = charStage === st.stage;
                const isNext = sharinganEvolution.nextStageDef?.stage === st.stage;

                return (
                  <div
                    key={st.id}
                    className={`rounded-xl p-4 border flex flex-col justify-between gap-3 ${
                      isCurrent
                        ? 'bg-[#12121A] border-[#10B981]'
                        : isUnlocked
                        ? 'bg-[#0B0B10] border-[#2C2C38]'
                        : 'bg-[#08080B] border-[#1E1E26]'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-[#22C55E]">
                          Estágio {st.stage} · {st.tomoeLabel}
                        </span>
                        {isCurrent ? (
                          <span className="text-[11px] font-semibold text-[#22C55E] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-[11px] text-[#A1A1AA]">Superado</span>
                        ) : (
                          <span className="text-[11px] text-[#A1A1AA]">Bloqueado</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <img
                          src={st.imageUrl}
                          alt={st.title}
                          referrerPolicy="no-referrer"
                          className={`w-11 h-11 rounded-lg bg-[#050505] p-1.5 border object-contain shrink-0 ${
                            isCurrent ? 'border-[#10B981]' : 'border-[#24242E]'
                          } ${!isUnlocked && !isNext ? 'opacity-60' : ''}`}
                        />
                        <h3 className="font-display text-sm md:text-base font-bold text-[#F8FAFC] leading-snug">
                          {st.title}
                        </h3>
                      </div>

                      <p className="text-xs text-[#E4E4E7] font-medium leading-relaxed">
                        {st.bonusSummary}
                      </p>

                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                        {st.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#1E1E26] text-[11px] font-mono tabular-nums text-[#A1A1AA] space-y-1">
                      {st.stage === 1 ? (
                        <div className="text-[#22C55E]">Despertar Inicial da Linhagem Uchiha</div>
                      ) : (
                        <>
                          <div>
                            Req: {st.minRank} · Nv.{st.minLevel} · CH {st.minChakraLevel}
                          </div>
                          <div>
                            {st.minMissions} Missões · {st.minWins} Vitórias · {st.minMerit} Mérito · {st.costRyo} Ryo
                          </div>
                        </>
                      )}

                      {isNext && (
                        <div className="pt-2">
                          <button
                            type="button"
                            disabled={!sharinganEvolution.eligible || evolvingSharingan}
                            onClick={handleEvolveSharingan}
                            className="w-full py-2 px-3 rounded-md bg-[#10B981] hover:bg-[#22C55E] disabled:bg-[#191922] disabled:text-[#71717A] text-[#050505] text-xs font-sans font-bold text-center leading-snug cursor-pointer disabled:cursor-not-allowed transition-colors"
                          >
                            {evolvingSharingan
                              ? 'Despertando...'
                              : sharinganEvolution.eligible
                              ? `Despertar ${st.kekkeiValue} (${st.costRyo} Ryo)`
                              : 'Requisitos Pendentes'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!sharinganEvolution.maxStageReached &&
              !sharinganEvolution.eligible &&
              sharinganEvolution.unmetReasons.length > 0 && (
                <div className="p-3.5 rounded-lg bg-[#08080B] border border-[#24242E] text-xs text-[#A1A1AA] space-y-1">
                  <div className="font-semibold text-[#F8FAFC]">
                    Pendências para despertar {sharinganEvolution.nextStageDef?.title}:
                  </div>
                  <div>{sharinganEvolution.unmetReasons.join(' · ')}</div>
                </div>
              )}

            {/* Dual-Eye Ocular Blindness & In-Battle Sharingan Activation Rules */}
            {ocularSummary && sharinganCombatCfg?.canEverActivate && (
              <div className="p-4 rounded-xl bg-[#08080B] border border-[#24242E] space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#F8FAFC]">
                    {ocularSummary.bothBlind ? (
                      <EyeOff className="w-4 h-4 text-red-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-[#22C55E]" />
                    )}
                    <span>Integridade Ocular & Ativação do Sharingan em Batalha</span>
                  </div>
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      ocularSummary.bothBlind
                        ? 'text-red-400 font-bold'
                        : ocularSummary.averageBlindness > 0
                        ? 'text-amber-300 font-semibold'
                        : 'text-[#22C55E]'
                    }`}
                  >
                    {ocularSummary.visionLabel}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs tabular-nums">
                  <div className="p-3 rounded-lg bg-[#0C0C10] border border-[#1E1E26] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#A1A1AA]">Olho Esquerdo</span>
                      <span className={ocularSummary.leftSealed ? 'text-red-400 font-bold' : 'text-[#22C55E] font-semibold'}>
                        {ocularSummary.leftSealed
                          ? 'Selado (100% Cego)'
                          : `${ocularSummary.leftLightPct}% Luz (${ocularSummary.leftBlindness}% Cegueira)`}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#181820] overflow-hidden">
                      <div
                        className={`h-full origin-left transition-transform duration-200 ${
                          ocularSummary.leftSealed
                            ? 'bg-red-500'
                            : ocularSummary.leftBlindness >= 50
                            ? 'bg-amber-400'
                            : 'bg-[#10B981]'
                        }`}
                        style={{ transform: `scaleX(${ocularSummary.leftLightPct / 100})` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0C0C10] border border-[#1E1E26] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#A1A1AA]">Olho Direito</span>
                      <span className={ocularSummary.rightSealed ? 'text-red-400 font-bold' : 'text-[#22C55E] font-semibold'}>
                        {ocularSummary.rightSealed
                          ? 'Selado (100% Cego)'
                          : `${ocularSummary.rightLightPct}% Luz (${ocularSummary.rightBlindness}% Cegueira)`}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#181820] overflow-hidden">
                      <div
                        className={`h-full origin-left transition-transform duration-200 ${
                          ocularSummary.rightSealed
                            ? 'bg-red-500'
                            : ocularSummary.rightBlindness >= 50
                            ? 'bg-amber-400'
                            : 'bg-[#10B981]'
                        }`}
                        style={{ transform: `scaleX(${ocularSummary.rightLightPct / 100})` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-[#A1A1AA] leading-relaxed space-y-1">
                  <div>
                    <strong className="text-[#E4E4E7]">Ativação em Combate:</strong> O Sharingan inicia desativado em toda luta. Ative-o no seu turno (-{sharinganCombatCfg.activationChakra} CH · -{sharinganCombatCfg.upkeepChakra} CH/turno) para liberar os bônus ({sharinganCombatCfg.bonusBadge}).
                  </div>
                  <div>
                    <strong className="text-amber-300">Risco de Cegueira:</strong> Técnicas do Mangekyou acumulam cegueira progressiva a cada uso, enquanto <strong className="text-red-300">Izanagi</strong> e <strong className="text-red-300">Izanami</strong> causam cegueira instantânea e permanente (100%) em um olho por execução.
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Avatar URL + Identity Sheet */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 jcink-shell rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-4 border-b border-[#1E1E26] pb-4">
            <h2 className="font-display text-lg font-bold text-[#F8FAFC]">
              {isCreationMode ? 'Identidade, Linhagem & Avatar' : 'Avatar (URL) & Dados da Ficha'}
            </h2>
            <span className="text-xs text-[#22C55E]">
              {selectedVillage?.country || character?.country}
            </span>
          </div>

          {/* Dedicated Avatar Image Link Editor */}
          <div className="bg-[#08080B] border border-[#24242E] rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <NinjaAvatar
              src={avatarUrl}
              alt={name || 'Avatar Ninja'}
              sizeClass="w-24 h-24"
              onStatusChange={setAvatarOk}
            />
            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="char-avatar-url"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F8FAFC]"
                >
                  <Link2 className="w-3.5 h-3.5 text-[#22C55E]" />
                  Link de Imagem do Avatar (URL)
                </label>
                <span className={`text-[11px] font-mono ${avatarOk ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {avatarOk
                    ? isExternalLink
                      ? 'URL externa carregada'
                      : 'Imagem pronta'
                    : 'Falha ao carregar imagem — use link direto (.png/.jpg/.webp)'}
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  id="char-avatar-url"
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://exemplo.com/seu-ninja.png"
                  className="flex-1 px-3 py-2 rounded-md bg-[#050505] border border-[#272732] focus:border-[#10B981] focus:outline-none text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="px-3 py-2 rounded-md bg-[#121218] hover:bg-[#1B1B24] border border-[#272732] text-[11px] text-[#A1A1AA] hover:text-white cursor-pointer"
                >
                  Limpar
                </button>
              </div>

              <div className="space-y-2 pt-1">
                <span className="text-[11px] text-[#A1A1AA] inline-flex items-center gap-1">
                  <ImagePlus className="w-3 h-3 text-[#22C55E]" /> Galeria de Retratos da Obra (ou cole qualquer URL acima):
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAvatarUrl(preset.url)}
                      className={`group flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors cursor-pointer ${
                        avatarUrl === preset.url
                          ? 'bg-[#12121A] border-[#10B981] text-[#22C55E]'
                          : 'bg-[#050505] hover:bg-[#101016] border-[#1E1E26] text-[#A1A1AA]'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded object-cover border border-[#24242E]"
                      />
                      <span className="truncate w-full text-center font-medium">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {!isCreationMode && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md bg-[#08080B] border border-[#1E1E26] text-xs text-[#A1A1AA]">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
                Campos de origem bloqueados após criação. Apenas o Link do Avatar (acima) é editável.
              </span>
            </div>
          )}

          {/* Character Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="char-name" className="block text-xs text-[#A1A1AA] mb-1">
                Nome do Ninja
              </label>
              <input
                id="char-name"
                type="text"
                required
                disabled={!isCreationMode}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Itachi Uzumaki"
                className="w-full px-3 py-2 rounded-md bg-[#08080B] border border-[#24242E] focus:border-[#10B981] focus:outline-none text-sm text-white disabled:opacity-65 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="char-village" className="block text-xs text-[#A1A1AA] mb-1">
                País & Vilarejo Oculto ({VILLAGES.length} regiões)
              </label>
              <select
                id="char-village"
                disabled={!isCreationMode}
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#08080B] border border-[#24242E] text-sm text-white disabled:opacity-65 disabled:cursor-not-allowed"
              >
                {VILLAGES.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name} — {v.country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="char-clan" className="block text-xs text-[#A1A1AA] mb-1">
                Clã ({CLANS.length} linhagens)
              </label>
              <select
                id="char-clan"
                disabled={!isCreationMode}
                value={clan}
                onChange={(e) => {
                  const nextClan = e.target.value;
                  setClan(nextClan);
                  const found = CLANS.find((c) => c.name === nextClan);
                  if (found) {
                    if (found.name === 'Uchiha') {
                      setKekkeiGenkai('Sharingan (Nível 1)');
                    } else if (found.kekkeiGenkai !== 'Nenhum') {
                      setKekkeiGenkai(found.kekkeiGenkai);
                    } else {
                      setKekkeiGenkai('Nenhum');
                    }
                  }
                }}
                className="w-full px-3 py-2 rounded-md bg-[#08080B] border border-[#24242E] text-sm text-white disabled:opacity-65 disabled:cursor-not-allowed"
              >
                {CLANS.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="char-spec" className="block text-xs text-[#A1A1AA] mb-1">
                Especialização Ninja
              </label>
              <select
                id="char-spec"
                disabled={!isCreationMode}
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#08080B] border border-[#24242E] text-sm text-white disabled:opacity-65 disabled:cursor-not-allowed"
              >
                {SPECIALIZATIONS.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="char-nature" className="block text-xs text-[#A1A1AA] mb-1">
                Elemento de Chakra Possuído
              </label>
              <select
                id="char-nature"
                disabled={!isCreationMode}
                value={chakraNature}
                onChange={(e) => setChakraNature(e.target.value as ChakraNature)}
                className="w-full px-3 py-2 rounded-md bg-[#08080B] border border-[#24242E] text-sm text-white disabled:opacity-65 disabled:cursor-not-allowed"
              >
                {(['Katon', 'Suiton', 'Fuuton', 'Doton', 'Raiton'] as ChakraNature[]).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {isCreationMode ? (
                <p className="text-[11px] text-[#22C55E] mt-1">
                  Você só poderá aprender jutsus elementais de {chakraNature} inicialmente. Um 2º elemento pode ser conquistado por Quest Especial!
                </p>
              ) : (
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-[#A1A1AA]">
                    2º Elemento:{' '}
                    <span className="text-[#22C55E] font-semibold">
                      {character.secondaryChakraNature && character.secondaryChakraNature !== 'Nenhum'
                        ? character.secondaryChakraNature
                        : 'Nenhum (Desbloqueável via Quest)'}
                    </span>
                  </span>
                  {onOpenJutsuQuests && (
                    <button
                      type="button"
                      onClick={onOpenJutsuQuests}
                      className="text-[#22C55E] hover:underline font-semibold cursor-pointer"
                    >
                      Quests de Jutsus
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="char-kg" className="block text-xs text-[#A1A1AA] mb-1">
                Kekkei Genkai
              </label>
              <select
                id="char-kg"
                disabled={!isCreationMode}
                value={kekkeiGenkai}
                onChange={(e) => setKekkeiGenkai(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#08080B] border border-[#24242E] text-sm text-white disabled:opacity-65 disabled:cursor-not-allowed"
              >
                {kekkeiOptions.map((kg) => (
                  <option key={kg} value={kg}>
                    {kg}
                  </option>
                ))}
              </select>
              {isCreationMode && clan === 'Uchiha' && (
                <p className="text-[11px] text-[#22C55E] mt-1">
                  Inicia no Sharingan Nível 1 e evolui pelos Níveis 2, 3 até o Mangekyou Sharingan na ficha!
                </p>
              )}
            </div>

            {!isCreationMode && (
              <div className="sm:col-span-2">
                <div className="block text-xs text-[#A1A1AA] mb-1">
                  Profissão Shinobi (Chunin / Tokubetsu Jonin)
                </div>
                <div className="p-3 rounded-md bg-[#08080B] border border-[#1E1E26] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#F8FAFC]">
                    {character.profession && character.profession !== 'Nenhuma'
                      ? character.profession
                      : 'Nenhuma profissão ativa'}
                  </span>
                  <span className="font-mono text-[11px] text-[#22C55E]">
                    {character.profession && character.profession !== 'Nenhuma'
                      ? 'Bônus de profissão aplicados aos atributos'
                      : 'Disponível na aba Graduações a partir de Chunin'}
                  </span>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <div className="block text-xs text-[#A1A1AA] mb-1">
                Contrato de Invocação (Kuchiyose)
              </div>
              <div className="p-3.5 rounded-md bg-[#08080B] border border-[#1E1E26] flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-[#F8FAFC] inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>{summonContract}</span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA]">
                    {isCreationMode
                      ? 'Não é possível começar escolhendo invocação. Após criar a ficha, realize uma Quest Especial em Missões (as Três Grandes — Sapos, Lesmas e Cobras — exigem uma Quest Sábia bem complicada).'
                      : summonContract === 'Nenhum'
                      ? 'Nenhum contrato assinado ainda. Conclua uma Quest Especial de Invocação para desbloquear Kuchiyose!'
                      : 'Contrato selado em pergaminho de sangue. Você pode disputar outros pactos na aba de Quests de Invocação.'}
                  </p>
                </div>
                {!isCreationMode && onOpenSummonQuests && (
                  <button
                    type="button"
                    onClick={onOpenSummonQuests}
                    className="px-3 py-1.5 rounded-md bg-[#121218] hover:bg-[#10B981] hover:text-[#050505] border border-[#10B981] text-xs font-semibold text-[#22C55E] cursor-pointer shrink-0 transition-colors whitespace-nowrap"
                  >
                    Quests de Invocação
                  </button>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="char-bio" className="block text-xs text-[#A1A1AA] mb-1">
                História & Objetivos do Shinobi
              </label>
              <textarea
                id="char-bio"
                rows={2}
                disabled={!isCreationMode}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Descreva a origem e objetivo do seu personagem..."
                className="w-full px-3 py-2 rounded-md bg-[#08080B] border border-[#24242E] text-sm text-white disabled:opacity-65 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-50 text-[#050505] text-xs font-bold cursor-pointer transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {saving
              ? 'Salvando...'
              : isCreationMode
              ? 'Criar Ficha Shinobi Definitiva'
              : 'Salvar Avatar (URL)'}
          </button>
        </form>

        {/* Right Column: Calculated Passive Clan Bonuses + Starter Points OR Active Attributes */}
        <div className="lg:col-span-5 space-y-5">
          <section aria-label="Bônus Passivos do Clã" className="jcink-shell rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E1E26] pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#22C55E]">
                  Linhagem & Passivas Calculadas
                </div>
                <h2 className="font-display text-base font-bold text-[#F8FAFC]">
                  Bônus Passivos do Clã — {clanBonuses.clanName}
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#08080B] border border-[#24242E] text-[11px] font-mono text-[#A1A1AA]">
                Kekkei: {clanBonuses.kekkeiGenkai}
              </span>
            </div>

            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              {clanBonuses.passiveTrait}
            </p>

            {/* Calculated Numeric Impact Summary */}
            <div className="p-3.5 rounded-lg bg-[#08080B] border border-[#10B981]/50 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#22C55E] font-bold uppercase tracking-wider">
                  Impacto Calculado na Ficha & Combate
                </span>
                <span className="text-[#A1A1AA] tabular-nums">
                  +{clanBonuses.totalAttributePoints} pts atributo
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
                <div className="p-2.5 rounded bg-[#0C0C10] border border-[#1E1E26]">
                  <div className="text-[10px] text-[#8E8E9A]">Bônus HP Máx (Clã)</div>
                  <div className="text-sm font-bold text-[#22C55E]">
                    +{clanBonuses.calculatedHpBoost} HP
                    {clanBonuses.hpBonusPct > 0 && (
                      <span className="text-[11px] text-emerald-300 ml-1">
                        (+{clanBonuses.hpBonusPct}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-[#0C0C10] border border-[#1E1E26]">
                  <div className="text-[10px] text-[#8E8E9A]">Bônus Chakra Máx (Clã)</div>
                  <div className="text-sm font-bold text-sky-300">
                    +{clanBonuses.calculatedChakraBoost} CH
                    {clanBonuses.chakraBonusPct > 0 && (
                      <span className="text-[11px] text-sky-200 ml-1">
                        (+{clanBonuses.chakraBonusPct}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {clanBonuses.summaryChips.map((chip) => (
                  <span
                    key={chip}
                    className="px-2 py-0.5 rounded bg-[#101915] border border-[#10B981]/45 text-[11px] font-mono tabular-nums text-[#E4E4E7]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {activeClan && (
              <div className="grid grid-cols-1 gap-2.5">
                {activeClan.twoBonuses.map((bonus, idx) => (
                  <div
                    key={bonus.title}
                    className="p-3 rounded-lg bg-[#08080B] border border-[#1E1E26] space-y-1"
                  >
                    <div className="text-xs font-semibold text-[#F8FAFC]">
                      Passiva {idx + 1}: {bonus.title}
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                      {bonus.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="jcink-shell rounded-xl p-6 space-y-5">
            {isCreationMode ? (
              <>
                <div className="flex items-center justify-between border-b border-[#1E1E26] pb-4">
                  <h2 className="font-display text-lg font-bold text-[#F8FAFC]">
                    Atributos Iniciais da Ficha
                  </h2>
                  <span className="font-mono text-xs tabular-nums text-[#22C55E]">
                    Pontos Restantes: {starterRemaining} / 6
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#08080B] border border-[#1E1E26] text-xs text-[#A1A1AA]">
                  Distribua até 6 pontos iniciais antes de finalizar sua ficha como Estudante da Academia em {village}.
                </div>

                <div className="space-y-2.5">
                  {ATTRIBUTE_LABELS.map(({ key, label }) => {
                    const baseVal =
                      key === 'ninjutsu'
                        ? 14
                        : key === 'inteligencia' || key === 'controleChakra'
                        ? 13
                        : key === 'velocidade'
                        ? 12
                        : key === 'genjutsu'
                        ? 9
                        : 11;
                    const added = starterAlloc[key] || 0;
                    const clanAdd = activeClan?.bonuses[key] || 0;
                    const tagParts = [
                      added > 0 ? `+${added}` : '',
                      clanAdd > 0 ? `clã +${clanAdd}` : '',
                    ].filter(Boolean);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 py-2 border-b border-[#1E1E26] last:border-0"
                      >
                        <span className="text-sm text-[#E4E4E7]">{label}</span>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm tabular-nums text-[#F8FAFC]">
                            {baseVal + added + clanAdd}
                            {tagParts.length > 0 && (
                              <span className="text-xs text-[#22C55E] ml-1.5">
                                ({tagParts.join(' · ')})
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            disabled={added <= 0}
                            onClick={() =>
                              setStarterAlloc((prev) => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }))
                            }
                            aria-label={`Diminuir ${label}`}
                            className="w-7 h-7 rounded bg-[#121218] hover:bg-[#1B1B24] disabled:opacity-30 flex items-center justify-center text-white cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={starterRemaining <= 0}
                            onClick={() =>
                              setStarterAlloc((prev) => ({ ...prev, [key]: prev[key] + 1 }))
                            }
                            aria-label={`Aumentar ${label}`}
                            className="w-7 h-7 rounded bg-[#121218] hover:bg-[#10B981] hover:text-[#050505] border border-[#10B981] disabled:opacity-30 flex items-center justify-center text-[#22C55E] cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              effective && (
                <>
                  <div className="flex items-center justify-between border-b border-[#1E1E26] pb-4">
                    <h2 className="font-display text-lg font-bold text-[#F8FAFC]">
                      Atributos & Nível de Chakra
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-[#22C55E]">
                      Pontos Livres: {character.statPoints}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#08080B] border border-[#1E1E26] space-y-2.5">
                    <XpProgressPanel character={character} />
                    <div className="pt-2 border-t border-[#1E1E26] grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
                      <div>
                        <span className="text-[#8E8E9A]">HP Máx Efetivo: </span>
                        <strong className="text-[#22C55E]">{effective.maxHp}</strong>
                        {clanBonuses.calculatedHpBoost > 0 && (
                          <span className="text-emerald-300/90 ml-1">
                            (clã +{clanBonuses.calculatedHpBoost})
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[#8E8E9A]">Chakra Máx: </span>
                        <strong className="text-sky-300">{effective.maxChakra}</strong>
                        {clanBonuses.calculatedChakraBoost > 0 && (
                          <span className="text-sky-200/90 ml-1">
                            (clã +{clanBonuses.calculatedChakraBoost})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono tabular-nums text-[#A1A1AA]">
                      <span>Precisão +{effective.accuracyBonus || 0}%</span>
                      <span aria-hidden="true">·</span>
                      <span>Esquiva +{effective.evasionBonus || 0}%</span>
                      <span aria-hidden="true">·</span>
                      <span>Crítico +{effective.critBonus || 0}%</span>
                      {(effective.chakraCostReduction || 0) > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#22C55E]">
                            Custo CH -{Math.round((effective.chakraCostReduction || 0) * 100)}%
                          </span>
                        </>
                      )}
                    </div>
                    <div className="pt-2 border-t border-[#1E1E26] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-[#A1A1AA]">
                      <span>
                        Eficiência CH: x{effective.chakraEfficiency} · Missões: {character.missionsCompleted}
                      </span>
                      {liveStamina && (
                        <span className="inline-flex items-center gap-1 text-[#22C55E] font-semibold">
                          <Clock className="w-3 h-3" />
                          STA {liveStamina.stamina}/{liveStamina.maxStamina}
                          {!liveStamina.isFull
                            ? ` (+1 em ${formatStaminaCountdown(liveStamina.secondsUntilNextPoint)})`
                            : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {ATTRIBUTE_LABELS.map(({ key, label }) => {
                      const baseVal = character[key];
                      const effVal = effective[key];
                      const bonus = effVal - baseVal;
                      const clanAdd = clanBonuses.attributeBoosts[key] || 0;
                      const otherBonus = Math.max(0, bonus - clanAdd);
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3 py-2 border-b border-[#1E1E26] last:border-0"
                        >
                          <span className="text-sm text-[#E4E4E7]">{label}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm tabular-nums text-[#F8FAFC]">
                              {effVal}
                              {bonus > 0 && (
                                <span className="text-xs text-[#22C55E] ml-1">
                                  ({clanAdd > 0 && otherBonus > 0
                                    ? `+${bonus}: clã +${clanAdd} · outros +${otherBonus}`
                                    : clanAdd > 0
                                    ? `+${bonus} clã`
                                    : `+${bonus}`})
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              disabled={character.statPoints <= 0}
                              onClick={() => handleAllocateStat(key)}
                              aria-label={`Aumentar ${label}`}
                              className="w-7 h-7 rounded bg-[#121218] hover:bg-[#10B981] hover:text-[#050505] border border-[#272732] disabled:opacity-30 flex items-center justify-center text-white cursor-pointer transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
