import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, Flame, Lock, ScrollText, Search, ShieldAlert, Sparkles } from 'lucide-react';
import {
  canCharacterLearnJutsu,
  CharacterModel,
  classifyJutsuSection,
  getEffectiveJutsuEffects,
  getMaxJutsuRankForGraduation,
  getOwnedElements,
  getSharinganStageDef,
  getSharinganStageNumber,
  JutsuDojoSectionKey,
  matchesJutsuDojoFilter,
} from '../game/engine.ts';
import { LanguageCode, t } from '../game/i18n.ts';
import {
  getJutsuImage,
  JUTSU_CATALOG,
  JutsuDef,
  STATUS_EFFECT_META,
  StatusEffectMeta,
} from '../game/narutoData.ts';
import { shinobiAudio } from '../game/sound.ts';
import { apiFetch } from '../utils/api.ts';
import { XpProgressPanel } from './XpProgressPanel.tsx';

function getEffectBadgeClasses(tone?: StatusEffectMeta['tone']): string {
  switch (tone) {
    case 'fire':
      return 'bg-[#1A0D08] border-orange-500/60 text-orange-300';
    case 'lightning':
      return 'bg-[#1A1508] border-amber-400/60 text-amber-200';
    case 'water':
      return 'bg-[#08151E] border-sky-400/60 text-sky-200';
    case 'earth':
      return 'bg-[#181408] border-yellow-600/60 text-yellow-200';
    case 'wind':
      return 'bg-[#081715] border-teal-400/60 text-teal-200';
    case 'illusion':
      return 'bg-[#160B1E] border-purple-400/60 text-purple-200';
    case 'seal':
      return 'bg-[#1C0A11] border-rose-500/60 text-rose-200';
    case 'heal':
    default:
      return 'bg-[#0A0A0E] border-[#10B981] text-[#22C55E]';
  }
}

interface JutsuDojoProps {
  character: CharacterModel;
  customJutsus?: JutsuDef[];
  lang: LanguageCode;
  onOpenGraduation?: () => void;
  onOpenCharacterSheet?: () => void;
  onOpenJutsuQuests?: () => void;
  onOpenSummonQuests?: () => void;
  onRefreshCharacter: () => Promise<void>;
}

const SECTION_TABS: Array<'Todos' | JutsuDojoSectionKey> = [
  'Todos',
  'Ninjutsu',
  'Ninjutsu Elemental',
  'Taijutsu',
  'Kenjutsu',
  'Genjutsu',
  'Por Clã',
  'Kekkei Genkai',
  'Fuinjutsu',
  'Iryou',
  'Kuchiyose',
];

const GROUPED_SECTION_ORDER: JutsuDojoSectionKey[] = [
  'Ninjutsu',
  'Ninjutsu Elemental',
  'Kenjutsu',
  'Taijutsu',
  'Genjutsu',
  'Por Clã',
  'Kekkei Genkai',
  'Iryou',
  'Fuinjutsu',
  'Kuchiyose',
];

const ELEMENT_SUBFILTERS = ['Todos', 'Katon', 'Suiton', 'Fuuton', 'Doton', 'Raiton'];
const KENJUTSU_SUBFILTERS = ['Todos', 'Neutro', 'Katon', 'Suiton', 'Fuuton', 'Raiton'];
const RANK_FILTERS = ['Todos', 'E/D', 'C', 'B', 'A', 'S'] as const;

export const JutsuDojo: React.FC<JutsuDojoProps> = ({
  character,
  customJutsus = [],
  lang,
  onOpenGraduation,
  onOpenCharacterSheet,
  onOpenJutsuQuests,
  onOpenSummonQuests,
  onRefreshCharacter,
}) => {
  const [primaryTab, setPrimaryTab] = useState<'Todos' | JutsuDojoSectionKey>('Todos');
  const [subFilter, setSubFilter] = useState<string>('Todos');
  const [rankFilter, setRankFilter] = useState<(typeof RANK_FILTERS)[number]>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyLearnable, setOnlyLearnable] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const maxRank = getMaxJutsuRankForGraduation(character.rank);
  const ownedElements = getOwnedElements(character);
  const allJutsus = useMemo(() => [...JUTSU_CATALOG, ...customJutsus], [customJutsus]);
  const sharinganStage = useMemo(
    () => getSharinganStageNumber(character.kekkeiGenkai, character.clan),
    [character.kekkeiGenkai, character.clan]
  );

  const clanSubfilters = useMemo(() => {
    const clans = Array.from(
      new Set(allJutsus.map((j) => j.clanExclusive).filter((x): x is string => Boolean(x)))
    );
    return ['Todos', ...clans];
  }, [allJutsus]);

  const kekkeiSubfilters = useMemo(() => {
    const bloodlines = Array.from(
      new Set(allJutsus.map((j) => j.kekkeiRequired).filter((x): x is string => Boolean(x)))
    );
    return ['Todos', ...bloodlines];
  }, [allJutsus]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: allJutsus.length };
    for (const tab of SECTION_TABS) {
      if (tab === 'Todos') continue;
      counts[tab] = allJutsus.filter((j) => matchesJutsuDojoFilter(j, tab, 'Todos')).length;
    }
    return counts;
  }, [allJutsus]);

  const activeBloodlineEffectNote = useMemo(() => {
    const notes: string[] = [];
    const kk = character.kekkeiGenkai.toLowerCase();
    const cl = character.clan.toLowerCase();
    if (sharinganStage !== 0) {
      const stDef = getSharinganStageDef(sharinganStage);
      notes.push(`${stDef.title}: ${stDef.bonusSummary}`);
    } else if (kk.includes('sharingan') || cl === 'uchiha') {
      notes.push(
        'Sharingan/Uchiha: Amplia em +15% a chance de efeitos de Genjutsu (como Paralisia ou Controle Mental em Genjutsus específicos)'
      );
    }
    if (kk.includes('byakugan') || cl === 'hyuga') {
      notes.push('Byakugan/Hyuga: Taijutsu & Kekkei Genkai podem selar Tenketsu de Chakra');
    }
    if (cl === 'yamanaka') {
      notes.push(
        'Clã Yamanaka: Técnicas mentais do clã (Shintenshin/Shinranshin) e Genjutsus aplicam Controle Mental Momentâneo'
      );
    }
    if (cl === 'kurama' || kk.includes('ketsuryugan')) {
      notes.push('Linhagem Ilusória: Genjutsus ampliam pressão de Paralisia Ilusória');
    }
    if (cl === 'aburame') {
      notes.push('Kikaichu Aburame: Ninjutsus podem drenar Chakra por Selo de Chakra');
    }
    if (cl === 'akimichi' || cl === 'kaguya') {
      notes.push(`Clã ${character.clan}: Taijutsus aplicam Esmagamento que reduz defesa do alvo`);
    }
    return notes;
  }, [character.clan, character.kekkeiGenkai, sharinganStage]);

  const filteredJutsus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allJutsus.filter((j) => {
      if (!matchesJutsuDojoFilter(j, primaryTab, subFilter)) return false;
      if (rankFilter !== 'Todos') {
        if (rankFilter === 'E/D') {
          if (j.rank !== 'E' && j.rank !== 'D') return false;
        } else if (j.rank !== rankFilter) {
          return false;
        }
      }
      if (q) {
        const haystack = [
          j.name,
          j.description,
          j.category,
          j.nature,
          j.clanExclusive || '',
          j.kekkeiRequired || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (onlyLearnable) {
        const check = canCharacterLearnJutsu(character, j);
        return check.allowed || character.learnedJutsus.includes(j.id);
      }
      return true;
    });
  }, [allJutsus, primaryTab, subFilter, rankFilter, searchQuery, onlyLearnable, character]);

  const groupedSections = useMemo(() => {
    if (primaryTab !== 'Todos') {
      return [{ title: primaryTab, items: filteredJutsus }];
    }
    return GROUPED_SECTION_ORDER.map((section) => ({
      title: section,
      items: filteredJutsus.filter((j) => classifyJutsuSection(j) === section),
    })).filter((g) => g.items.length > 0);
  }, [primaryTab, filteredJutsus]);

  const handleLearnJutsu = async (jutsuId: string) => {
    setBusyId(jutsuId);
    setStatusMsg(null);
    try {
      await apiFetch('/api/characters/learn-jutsu', {
        method: 'POST',
        body: JSON.stringify({ jutsuId }),
      });
      shinobiAudio.playJutsuCast();
      setStatusMsg({
        text: 'Nova técnica dominada e registrada no pergaminho shinobi!',
        ok: true,
      });
      await onRefreshCharacter();
    } catch (err) {
      setStatusMsg({ text: (err as Error).message, ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const renderJutsuCard = (j: JutsuDef) => {
    const learned = character.learnedJutsus.includes(j.id);
    const check = canCharacterLearnJutsu(character, j);
    const artwork = getJutsuImage(j);
    const effectiveEffects = getEffectiveJutsuEffects(
      j,
      character.clan,
      character.kekkeiGenkai
    );

    return (
      <article
        key={j.id}
        className={`group rounded-xl border overflow-hidden flex flex-col justify-between transition-colors ${
          learned
            ? 'bg-[#0C0C10] border-[#10B981]'
            : check.allowed
            ? 'bg-[#0A0A0E] border-[#272732] hover:border-[#10B981]'
            : 'bg-[#07070A] border-[#1A1A22]'
        }`}
      >
        <div>
          {artwork && !failedImages[j.id] ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#050505]">
              <img
                src={artwork}
                alt={j.name}
                referrerPolicy="no-referrer"
                onError={() => setFailedImages((prev) => ({ ...prev, [j.id]: true }))}
                className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                  !learned && !check.allowed ? 'opacity-70 grayscale-[20%]' : ''
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0E] via-[#0A0A0E]/35 to-transparent" />
              <div className="absolute bottom-2.5 left-4 right-4 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-mono tabular-nums text-[#22C55E] font-semibold">
                    Rank {j.rank} · {j.category} · {j.nature}
                  </div>
                  <h3 className="font-display text-base font-bold text-[#F8FAFC] leading-snug truncate">
                    {j.name}
                  </h3>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 pt-4 pb-2.5 border-b border-[#1E1E26] bg-[#101016]">
              <div className="text-[11px] font-mono tabular-nums text-[#22C55E] font-semibold">
                Rank {j.rank} · {j.category} · {j.nature}
              </div>
              <h3 className="font-display text-base font-bold text-[#F8FAFC] leading-snug mt-0.5">
                {j.name}
              </h3>
            </div>
          )}

          <div className="px-4 pt-3 pb-2 space-y-2">
            <p className="text-xs text-[#A1A1AA] leading-relaxed">{j.description}</p>
            <div className="text-[11px] font-mono tabular-nums text-[#E4E4E7]">
              Poder {j.basePower} · Custo {j.chakraCost} CH · Req Nv.{j.requiredLevel} / CH{' '}
              {j.requiredChakraLevel}
            </div>
            {effectiveEffects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {effectiveEffects.map((fx, idx) => {
                  const meta = STATUS_EFFECT_META[fx.type];
                  return (
                    <span
                      key={`${j.id}-fx-${fx.type}-${idx}`}
                      title={meta?.summary}
                      className={`px-2 py-0.5 rounded border text-[10px] font-mono ${getEffectBadgeClasses(
                        meta?.tone
                      )}`}
                    >
                      {fx.label}
                    </span>
                  );
                })}
              </div>
            )}
            {(j.clanExclusive || j.kekkeiRequired) && (
              <div className="text-[11px] text-[#FBBF24]">
                Exclusivo:{' '}
                {[j.clanExclusive ? `Clã ${j.clanExclusive}` : '', j.kekkeiRequired || '']
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-[#1E1E26] space-y-2">
          {learned ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22C55E] py-1">
              <CheckCircle2 className="w-4 h-4" />
              Técnica Dominada
            </div>
          ) : check.allowed ? (
            <button
              type="button"
              disabled={busyId === j.id}
              onClick={() => handleLearnJutsu(j.id)}
              className="w-full py-2.5 px-3 rounded-md bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-50 text-xs font-bold text-[#050505] cursor-pointer transition-colors"
            >
              {busyId === j.id
                ? 'Treinando...'
                : `${t(lang, 'learnJutsu')} · ${j.learnCostRyo} Ryo`}
            </button>
          ) : (
            <div className="p-2.5 rounded-md bg-[#050505] border border-[#1E1E26] text-[11px] text-[#F59E0B] flex items-start justify-between gap-2">
              <div className="flex items-start gap-1.5">
                {check.reason?.includes('Elemento') || check.reason?.includes('graduação') ? (
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span>{check.reason}</span>
              </div>
              {j.category === 'Kuchiyose' && onOpenSummonQuests && (
                <button
                  type="button"
                  onClick={onOpenSummonQuests}
                  className="px-2 py-1 rounded bg-[#121218] border border-[#10B981] text-[10px] font-semibold text-[#22C55E] shrink-0 cursor-pointer whitespace-nowrap"
                >
                  Fazer Quest
                </button>
              )}
              {j.questRequired && onOpenJutsuQuests && (
                <button
                  type="button"
                  onClick={onOpenJutsuQuests}
                  className="px-2 py-1 rounded bg-[#191308] border border-amber-400/60 text-[10px] font-semibold text-amber-300 shrink-0 cursor-pointer whitespace-nowrap"
                >
                  Fazer Quest
                </button>
              )}
              {j.kekkeiRequired && j.kekkeiRequired.includes('Sharingan') && onOpenCharacterSheet && (
                <button
                  type="button"
                  onClick={onOpenCharacterSheet}
                  className="px-2 py-1 rounded bg-[#121218] border border-[#10B981] text-[10px] font-semibold text-[#22C55E] shrink-0 cursor-pointer whitespace-nowrap"
                >
                  Evoluir
                </button>
              )}
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Dojo Summary & Graduation/Element Rules */}
      <section className="jcink-shell rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1E1E26] pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#22C55E]">
              <ScrollText className="w-4 h-4" />
              <span>Enciclopédia Shinobi · Narutopedia ({allJutsus.length} Técnicas)</span>
            </div>
            <h1 className="font-display text-xl md:text-2xl font-bold text-[#F8FAFC]">
              Pergaminho de Jutsus, Kenjutsu, Elementos, Clãs & Kekkei Genkai
            </h1>
            <p className="text-xs text-[#A1A1AA] max-w-2xl">
              Catálogo expandido com imagens oficiais da obra Naruto, organizado em Ninjutsu Geral, Ninjutsu Elemental, Kenjutsu, Taijutsu, Genjutsu, Clãs Hiden, Kekkei Genkai, Fuinjutsu, Iryou e Kuchiyose.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-xs font-mono tabular-nums shrink-0">
            <div className="px-3 py-2 rounded-lg bg-[#08080B] border border-[#10B981]">
              <div className="text-[10px] text-[#A1A1AA]">Rank Máximo</div>
              <div className="text-sm font-bold text-[#22C55E]">Até Rank {maxRank}</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[#08080B] border border-[#24242E]">
              <div className="text-[10px] text-[#A1A1AA]">
                {ownedElements.length > 1 ? 'Elementos (2)' : 'Elemento'}
              </div>
              <div className="text-sm font-bold text-[#22C55E] inline-flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                {ownedElements.join(' · ')}
              </div>
              {ownedElements.length === 1 && onOpenJutsuQuests && (
                <button
                  type="button"
                  onClick={onOpenJutsuQuests}
                  className="block text-[10px] text-amber-300 hover:underline mt-0.5 cursor-pointer"
                >
                  + Desbloquear 2º Elemento
                </button>
              )}
            </div>
            <div className="px-3 py-2 rounded-lg bg-[#08080B] border border-[#24242E]">
              <div className="text-[10px] text-[#A1A1AA]">Dominados / Ryo</div>
              <div className="text-sm font-bold text-[#F8FAFC]">
                {character.learnedJutsus.length} · {character.ryo.toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </div>

        {/* Visual XP Progress & Unlocked/Blocked Ranks */}
        <div className="p-4 rounded-lg bg-[#08080B] border border-[#1E1E26]">
          <XpProgressPanel
            character={character}
            showJutsuCaps
            onOpenGraduation={onOpenGraduation}
          />
        </div>

        {activeBloodlineEffectNote.length > 0 && (
          <div className="p-3.5 rounded-lg bg-[#08080B] border border-[#10B981] text-xs text-[#E4E4E7] flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-mono text-[11px] text-[#22C55E]">
                Efeitos Passivos Ativos ({character.clan} · {character.kekkeiGenkai})
              </div>
              {activeBloodlineEffectNote.map((note) => (
                <div key={note}>{note}</div>
              ))}
            </div>
            {sharinganStage > 0 && sharinganStage < 4 && onOpenCharacterSheet && (
              <button
                type="button"
                onClick={onOpenCharacterSheet}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer whitespace-nowrap transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Evoluir Sharingan na Ficha
              </button>
            )}
          </div>
        )}

        {/* Graduation Ladder Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
          {[
            { label: 'Estudante', cap: 'Até Rank D', active: character.rank === 'Estudante da Academia' },
            { label: 'Genin', cap: 'Até Rank C', active: character.rank === 'Genin' },
            { label: 'Chunin', cap: 'Até Rank B', active: character.rank === 'Chunin' },
            {
              label: 'Jonin / Tokubetsu',
              cap: 'Até Rank A',
              active: character.rank === 'Jonin' || character.rank === 'Tokubetsu Jonin',
            },
            {
              label: 'Jounin Experiente+',
              cap: 'Até Rank S',
              active:
                character.rank === 'Jounin Experiente' ||
                character.rank === 'Anbu' ||
                character.rank === 'Sannin' ||
                character.rank === 'Kage',
            },
          ].map((tier) => (
            <div
              key={tier.label}
              className={`px-3 py-2 rounded-md border flex items-center justify-between gap-2 ${
                tier.active
                  ? 'bg-[#121218] border-[#10B981] text-[#F8FAFC]'
                  : 'bg-[#08080B] border-[#1E1E26] text-[#A1A1AA]'
              }`}
            >
              <span className="font-medium truncate">{tier.label}</span>
              <span
                className={`font-mono font-semibold shrink-0 ${
                  tier.active ? 'text-[#22C55E]' : 'text-[#71717A]'
                }`}
              >
                {tier.cap}
              </span>
            </div>
          ))}
        </div>
      </section>

      {statusMsg && (
        <div
          className={`px-4 py-2.5 rounded-md border text-xs ${
            statusMsg.ok
              ? 'bg-[#0C0C10] border-[#10B981] text-[#F8FAFC]'
              : 'bg-[#180B0E] border-red-500 text-red-200'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Structured Separation Filter Bar & Sectioned Jutsu Catalog */}
      <section className="jcink-shell rounded-xl p-6 space-y-5">
        <div className="space-y-3 border-b border-[#1E1E26] pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {SECTION_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setPrimaryTab(tab);
                    setSubFilter('Todos');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${
                    primaryTab === tab
                      ? 'bg-[#10B981] text-[#050505] font-bold'
                      : 'bg-[#08080B] text-[#A1A1AA] hover:text-white border border-[#1E1E26]'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`font-mono text-[10px] tabular-nums ${
                      primaryTab === tab ? 'text-[#050505]/80' : 'text-[#71717A]'
                    }`}
                  >
                    ({tabCounts[tab] || 0})
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setOnlyLearnable((v) => !v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border cursor-pointer whitespace-nowrap transition-colors ${
                onlyLearnable
                  ? 'bg-[#121218] border-[#10B981] text-[#22C55E]'
                  : 'bg-[#08080B] border-[#24242E] text-[#A1A1AA] hover:text-white'
              }`}
            >
              {onlyLearnable ? 'Mostrando Compatíveis' : 'Filtrar Compatíveis'}
            </button>
          </div>

          {/* Search & Rank Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1E1E26]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-mono text-[#A1A1AA] mr-1">Rank:</span>
              {RANK_FILTERS.map((rk) => (
                <button
                  key={rk}
                  type="button"
                  onClick={() => setRankFilter(rk)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                    rankFilter === rk
                      ? 'bg-[#10B981] text-[#050505] font-bold'
                      : 'bg-[#08080B] border border-[#24242E] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {rk === 'Todos' ? 'Todos' : `Rank ${rk}`}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar jutsu, efeito, clã ou elemento..."
                aria-label="Buscar técnica no Dojo"
                className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#08080B] border border-[#24242E] focus:border-[#10B981] focus:outline-none text-xs text-[#F8FAFC] placeholder-[#71717A]"
              />
            </div>
          </div>

          {/* Contextual Sub-filters for Element / Kenjutsu / Clan / Kekkei Genkai */}
          {primaryTab === 'Ninjutsu Elemental' && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1E1E26]">
              <span className="text-[11px] font-mono text-[#A1A1AA] mr-1">Elemento:</span>
              {ELEMENT_SUBFILTERS.map((elem) => (
                <button
                  key={elem}
                  type="button"
                  onClick={() => setSubFilter(elem)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer ${
                    subFilter === elem
                      ? 'bg-[#10B981] text-[#050505] font-bold'
                      : 'bg-[#08080B] border border-[#24242E] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {elem}
                </button>
              ))}
            </div>
          )}

          {primaryTab === 'Kenjutsu' && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1E1E26]">
              <span className="text-[11px] font-mono text-[#A1A1AA] mr-1">Fluxo de Lâmina:</span>
              {KENJUTSU_SUBFILTERS.map((elem) => (
                <button
                  key={elem}
                  type="button"
                  onClick={() => setSubFilter(elem)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer ${
                    subFilter === elem
                      ? 'bg-[#10B981] text-[#050505] font-bold'
                      : 'bg-[#08080B] border border-[#24242E] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {elem}
                </button>
              ))}
            </div>
          )}

          {primaryTab === 'Por Clã' && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1E1E26]">
              <span className="text-[11px] font-mono text-[#A1A1AA] mr-1">Clã:</span>
              {clanSubfilters.map((cl) => (
                <button
                  key={cl}
                  type="button"
                  onClick={() => setSubFilter(cl)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer ${
                    subFilter === cl
                      ? 'bg-[#10B981] text-[#050505] font-bold'
                      : 'bg-[#08080B] border border-[#24242E] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {cl}
                </button>
              ))}
            </div>
          )}

          {primaryTab === 'Kekkei Genkai' && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1E1E26]">
              <span className="text-[11px] font-mono text-[#A1A1AA] mr-1">Linhagem:</span>
              {kekkeiSubfilters.map((kg) => (
                <button
                  key={kg}
                  type="button"
                  onClick={() => setSubFilter(kg)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer ${
                    subFilter === kg
                      ? 'bg-[#10B981] text-[#050505] font-bold'
                      : 'bg-[#08080B] border border-[#24242E] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {kg}
                </button>
              ))}
            </div>
          )}
        </div>

        {groupedSections.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#A1A1AA] bg-[#08080B] rounded-lg border border-[#1E1E26]">
            Nenhuma técnica encontrada para o filtro selecionado.
          </div>
        ) : (
          <div className="space-y-8">
            {groupedSections.map((group) => (
              <div key={group.title} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E1E26] pb-2">
                  <div className="inline-flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#22C55E]" />
                    <h2 className="font-display text-base md:text-lg font-bold text-[#F8FAFC]">
                      {group.title}
                    </h2>
                    <span className="text-xs font-mono tabular-nums text-[#A1A1AA]">
                      ({group.items.length})
                    </span>
                  </div>

                  {group.title === 'Kuchiyose' && onOpenSummonQuests && (
                    <button
                      type="button"
                      onClick={onOpenSummonQuests}
                      className="px-3 py-1 rounded-md bg-[#121218] hover:bg-[#10B981] hover:text-[#050505] border border-[#10B981] text-[11px] font-semibold text-[#22C55E] cursor-pointer transition-colors"
                    >
                      Contrato Atual: {character.summonContract || 'Nenhum'} · Abrir Quests
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.items.map(renderJutsuCard)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
