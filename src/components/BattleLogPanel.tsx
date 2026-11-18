import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownUp,
  Crosshair,
  Dices,
  Flame,
  Footprints,
  HeartPulse,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
} from 'lucide-react';
import { CombatCalculationResult } from '../game/engine.ts';
import { STATUS_EFFECT_META, StatusEffectMeta } from '../game/narutoData.ts';
import { classifyCombatLogDelta } from '../game/teamPvpEngine.ts';

export type BattleLogCategory =
  | 'attack'
  | 'move'
  | 'stance'
  | 'item'
  | 'secret'
  | 'control'
  | 'system'
  | 'outcome';

export interface BattleLogEntry {
  id: string;
  turn: number;
  timestampLabel: string;
  actor: 'player' | 'ally' | 'enemy' | 'system';
  actorName: string;
  category: BattleLogCategory;
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

interface BattleLogPanelProps {
  entries: BattleLogEntry[];
  currentTurn: number;
  title?: string;
}

type LogFilter = 'all' | 'damage' | 'heal' | 'rolls' | 'tactical';

function getToneBadgeClasses(tone?: StatusEffectMeta['tone']): string {
  switch (tone) {
    case 'fire':
      return 'bg-orange-950/70 border-orange-500/45 text-orange-200';
    case 'lightning':
      return 'bg-amber-950/70 border-amber-400/50 text-amber-200';
    case 'water':
      return 'bg-sky-950/70 border-sky-400/45 text-sky-200';
    case 'earth':
      return 'bg-yellow-950/70 border-yellow-600/45 text-yellow-200';
    case 'wind':
      return 'bg-teal-950/70 border-teal-400/45 text-teal-200';
    case 'illusion':
      return 'bg-purple-950/70 border-purple-400/50 text-purple-200';
    case 'seal':
      return 'bg-rose-950/70 border-rose-500/45 text-rose-200';
    case 'heal':
    default:
      return 'bg-emerald-950/70 border-emerald-400/45 text-emerald-200';
  }
}

export const BattleLogPanel: React.FC<BattleLogPanelProps> = ({
  entries,
  currentTurn,
  title = 'Battle Log',
}) => {
  const [filter, setFilter] = useState<LogFilter>('all');
  const [newestFirst, setNewestFirst] = useState(true);

  const classifiedEntries = useMemo(
    () =>
      entries.map((entry) => ({
        entry,
        delta: classifyCombatLogDelta({
          calc: entry.calc,
          damageAmount: entry.damageAmount,
          healingAmount: entry.healingAmount,
          actionMeta: entry.actionMeta,
          statusTicks: entry.statusTicks,
          category: entry.category,
        }),
      })),
    [entries]
  );

  const metrics = useMemo(() => {
    let playerHits = 0;
    let playerRolls = 0;
    let totalRedDamage = 0;
    let totalGreenHealing = 0;
    let totalEffectsApplied = 0;
    let maxSingleHit = 1;

    for (const { entry, delta } of classifiedEntries) {
      totalRedDamage += delta.totalRedDamage;
      totalGreenHealing += delta.totalGreenHealing;
      if (delta.totalRedDamage > maxSingleHit) maxSingleHit = delta.totalRedDamage;
      if (delta.totalGreenHealing > maxSingleHit) maxSingleHit = delta.totalGreenHealing;

      if (entry.calc) {
        if (entry.actor === 'player' || entry.actor === 'ally') {
          playerRolls += 1;
          if (entry.calc.isHit) playerHits += 1;
        }
        totalEffectsApplied += entry.calc.appliedEffects.length;
      }
    }

    return {
      playerHits,
      playerRolls,
      totalRedDamage,
      totalGreenHealing,
      totalEffectsApplied,
      maxSingleHit,
    };
  }, [classifiedEntries]);

  const filteredEntries = useMemo(() => {
    const base = classifiedEntries.filter(({ entry, delta }) => {
      if (filter === 'all') return true;
      if (filter === 'damage') return delta.totalRedDamage > 0;
      if (filter === 'heal') return delta.totalGreenHealing > 0;
      if (filter === 'rolls') {
        const hasCalcEffects = Boolean(
          entry.calc && (entry.calc.appliedEffects.length > 0 || entry.calc.effectRolls.length > 0)
        );
        const hasTicks = Boolean(entry.statusTicks && entry.statusTicks.length > 0);
        return Boolean(entry.calc) || hasCalcEffects || hasTicks || entry.category === 'control';
      }
      return (
        entry.category === 'move' ||
        entry.category === 'stance' ||
        entry.category === 'secret' ||
        entry.category === 'item'
      );
    });
    return newestFirst ? [...base].reverse() : base;
  }, [classifiedEntries, filter, newestFirst]);

  return (
    <aside
      aria-label={title}
      data-testid="battle-log-panel"
      className="bg-[#0C0C10] border border-[#24242E] rounded-lg overflow-hidden flex flex-col lg:max-h-[calc(100vh-6rem)]"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-[#121218] border-b border-[#24242E] space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded bg-[#08080B] border border-[#10B981] flex items-center justify-center shrink-0">
              <ScrollText className="w-4 h-4 text-[#22C55E]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-[#F4F4F6] tracking-tight truncate">
                {title}
              </h2>
              <p className="text-[11px] font-mono tabular-nums text-[#8E8E9A] truncate">
                Log Visual d100 · Turno {currentTurn}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNewestFirst((v) => !v)}
            title={newestFirst ? 'Mostrando mais recentes primeiro' : 'Mostrando em ordem cronológica'}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#08080B] hover:border-[#10B981] border border-[#24242E] text-[11px] font-mono text-[#E4E4EA] whitespace-nowrap cursor-pointer shrink-0"
          >
            <ArrowDownUp className="w-3 h-3 text-[#22C55E]" />
            {newestFirst ? 'Recente' : 'Turno 1'}
          </button>
        </div>

        {/* Color-Coded Legend Strip (Red = Damage, Green = Healing) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[#08080B] border border-[#24242E] text-[10px] font-mono">
          <span className="inline-flex items-center gap-1.5 text-red-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 border border-red-300 inline-block" />
            Dano = Vermelho (-HP)
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 border border-emerald-300 inline-block" />
            Cura = Verde (+HP)
          </span>
        </div>

        {/* Combat Roll Summary Metrics */}
        <div className="grid grid-cols-4 gap-1.5 text-center font-mono tabular-nums">
          <div className="px-1.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
            <div className="text-[10px] text-[#8E8E9A] uppercase">Acertos</div>
            <div className="text-xs font-bold text-[#F4F4F6]">
              {metrics.playerHits}/{metrics.playerRolls}
            </div>
          </div>
          <div className="px-1.5 py-1.5 rounded bg-red-950/35 border border-red-500/40">
            <div className="text-[10px] text-red-300 uppercase">Dano Total</div>
            <div className="text-xs font-bold text-red-400">-{metrics.totalRedDamage}</div>
          </div>
          <div className="px-1.5 py-1.5 rounded bg-emerald-950/35 border border-emerald-500/40">
            <div className="text-[10px] text-emerald-300 uppercase">Cura Total</div>
            <div className="text-xs font-bold text-emerald-400">+{metrics.totalGreenHealing}</div>
          </div>
          <div className="px-1.5 py-1.5 rounded bg-[#08080B] border border-[#24242E]">
            <div className="text-[10px] text-[#8E8E9A] uppercase">Efeitos</div>
            <div className="text-xs font-bold text-amber-300">{metrics.totalEffectsApplied}</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all' as const, label: `Todos (${entries.length})` },
            { id: 'damage' as const, label: 'Dano (Vermelho)' },
            { id: 'heal' as const, label: 'Cura (Verde)' },
            { id: 'rolls' as const, label: 'Dados & Efeitos' },
            { id: 'tactical' as const, label: 'Tático' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                filter === tab.id
                  ? tab.id === 'damage'
                    ? 'bg-red-500 text-[#050505]'
                    : 'bg-[#10B981] text-[#050505]'
                  : 'bg-[#08080B] border border-[#24242E] text-[#8E8E9A] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Entries Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[300px]">
        {filteredEntries.length === 0 ? (
          <div className="p-6 text-center rounded-md bg-[#08080B] border border-[#24242E] text-xs text-[#8E8E9A]">
            Nenhum evento registrado para este filtro ainda.
          </div>
        ) : (
          filteredEntries.map(({ entry, delta }) => {
            const actorTag =
              entry.actor === 'player'
                ? 'VOCÊ'
                : entry.actor === 'ally'
                ? 'ALIADO'
                : entry.actor === 'enemy'
                ? 'INIMIGO'
                : 'ARENA';

            const actorStyle =
              entry.actor === 'player'
                ? 'bg-[#050505] border-[#10B981] text-[#22C55E]'
                : entry.actor === 'ally'
                ? 'bg-[#050505] border-teal-400/70 text-teal-300'
                : entry.actor === 'enemy'
                ? 'bg-[#050505] border-red-500/60 text-red-400'
                : 'bg-[#121218] border-[#24242E] text-[#E4E4EA]';

            const cardBorder =
              delta.tone === 'damage'
                ? 'border-red-500/35'
                : delta.tone === 'heal'
                ? 'border-emerald-500/45'
                : delta.tone === 'mixed'
                ? 'border-amber-400/40'
                : 'border-[#24242E]';

            const CategoryIcon =
              entry.category === 'move'
                ? Footprints
                : entry.category === 'stance'
                ? Shield
                : entry.category === 'attack'
                ? Swords
                : entry.category === 'secret'
                ? Crosshair
                : entry.category === 'control'
                ? Flame
                : entry.category === 'outcome'
                ? Sparkles
                : delta.totalGreenHealing > 0
                ? HeartPulse
                : Activity;

            const iconTone =
              delta.totalGreenHealing > 0 && delta.totalRedDamage === 0
                ? 'text-emerald-400'
                : delta.totalRedDamage > 0
                ? 'text-red-400'
                : 'text-[#22C55E]';

            const dmgBarPct = Math.min(
              100,
              Math.max(12, Math.round((delta.totalRedDamage / metrics.maxSingleHit) * 100))
            );
            const healBarPct = Math.min(
              100,
              Math.max(12, Math.round((delta.totalGreenHealing / metrics.maxSingleHit) * 100))
            );

            return (
              <div
                key={entry.id}
                className={`bg-[#08080B] border ${cardBorder} rounded-md p-3 space-y-2`}
              >
                {/* Turn & Actor Header */}
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono tabular-nums">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-[#121218] border border-[#24242E] text-[#F4F4F6] font-semibold">
                      T{entry.turn}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border font-semibold ${actorStyle}`}>
                      {actorTag}
                    </span>
                    <span className="text-[#8E8E9A] truncate">{entry.actorName}</span>
                  </div>
                  <span className="text-[#8E8E9A] shrink-0">{entry.timestampLabel}</span>
                </div>

                {/* Action Title + Prominent Color-Coded Delta Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CategoryIcon className={`w-3.5 h-3.5 shrink-0 ${iconTone}`} />
                    <span className="text-xs font-bold text-[#F4F4F6] truncate">
                      {entry.actionName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {delta.totalRedDamage > 0 && (
                      <span
                        data-testid="log-damage-badge"
                        className="px-1.5 py-0.5 rounded bg-red-950/85 border border-red-500/60 text-red-400 text-[10px] font-mono font-bold tabular-nums"
                      >
                        DANO -{delta.totalRedDamage} HP
                      </span>
                    )}
                    {delta.totalGreenHealing > 0 && (
                      <span
                        data-testid="log-heal-badge"
                        className="px-1.5 py-0.5 rounded bg-emerald-950/85 border border-emerald-500/60 text-emerald-400 text-[10px] font-mono font-bold tabular-nums"
                      >
                        CURA +{delta.totalGreenHealing} HP
                      </span>
                    )}
                  </div>
                </div>

                {entry.actionMeta && (
                  <div className="text-[10px] font-mono tabular-nums text-[#8E8E9A]">
                    {entry.actionMeta}
                  </div>
                )}

                <p className="text-[11px] text-[#D4D4DC] leading-relaxed">{entry.summary}</p>

                {/* Color-Coded Visual Impact Meter (Red Damage / Green Healing) */}
                {(delta.totalRedDamage > 0 || delta.totalGreenHealing > 0) && (
                  <div className="space-y-1.5">
                    {delta.totalRedDamage > 0 && (
                      <div className="rounded bg-red-950/35 border border-red-500/40 px-2.5 py-1.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
                          <span className="inline-flex items-center gap-1 text-red-300 font-semibold">
                            <Flame className="w-3 h-3 text-red-400" />
                            Impacto de Dano
                          </span>
                          <span className="text-red-400 font-bold">-{delta.totalRedDamage} HP</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-red-950/70 overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${dmgBarPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {delta.totalGreenHealing > 0 && (
                      <div className="rounded bg-emerald-950/35 border border-emerald-500/40 px-2.5 py-1.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
                          <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                            <HeartPulse className="w-3 h-3 text-emerald-400" />
                            Recuperação Vital
                          </span>
                          <span className="text-emerald-400 font-bold">+{delta.totalGreenHealing} HP</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-emerald-950/70 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${healBarPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tabletop d100 Dice & Calculation Breakdown */}
                {entry.calc && (
                  <div className="rounded bg-[#050505] border border-[#24242E] p-2.5 space-y-2 text-[11px] font-mono tabular-nums">
                    {/* Hit / Miss Roll */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[#9CAFA3]">
                        <Dices className="w-3.5 h-3.5 text-[#4ADE80]" />
                        Teste Acerto (d100)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#ECFDF5]">
                          {entry.calc.rolled} ≤ {entry.calc.hitChance}%
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            entry.calc.isHit
                              ? 'bg-emerald-950/80 border-emerald-500/50 text-[#4ADE80]'
                              : 'bg-red-950/80 border-red-500/50 text-red-400'
                          }`}
                        >
                          {entry.calc.isHit ? 'ACERTO' : 'ERRO'}
                        </span>
                      </div>
                    </div>

                    {/* Critical Roll + Elemental Affinity Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                      <span className="text-[#9CAFA3]">
                        Crítico: <strong className="text-[#ECFDF5]">{entry.calc.critRolled}</strong>/{entry.calc.critChance}%
                        {entry.calc.isCrit && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-400/50 text-amber-300 text-[10px] font-bold">
                            CRÍTICO ×1.55
                          </span>
                        )}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                            entry.calc.elementalRelation === 'advantage'
                              ? 'bg-emerald-950/80 border-emerald-500/50 text-[#4ADE80]'
                              : entry.calc.elementalRelation === 'disadvantage'
                              ? 'bg-red-950/80 border-red-500/50 text-red-400'
                              : 'bg-[#08080B] border-[#24242E] text-[#8E8E9A]'
                          }`}
                        >
                          {entry.calc.elementalRelation === 'advantage'
                            ? `VANTAGEM ×${entry.calc.elementalMultiplier.toFixed(2)}`
                            : entry.calc.elementalRelation === 'disadvantage'
                            ? `DESVANTAGEM ×${entry.calc.elementalMultiplier.toFixed(2)}`
                            : `ELEM ×${entry.calc.elementalMultiplier.toFixed(2)}`}
                        </span>
                        {entry.calc.affinityMultiplier > 1 && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-950/75 border border-sky-400/45 text-sky-200 text-[10px] font-bold">
                            AFINIDADE ×{entry.calc.affinityMultiplier.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                      <span className="text-[#8E8E9A]">Impacto Final</span>
                      <div className="flex items-center gap-2 font-bold">
                        {entry.calc.isHit && entry.calc.damage > 0 ? (
                          <span className="text-red-400">-{entry.calc.damage} HP (Dano)</span>
                        ) : entry.calc.isHit ? (
                          <span className="text-[#8E8E9A]">0 Dano</span>
                        ) : (
                          <span className="text-[#8E8E9A]">0 Dano (Evadido)</span>
                        )}
                        {entry.calc.healing > 0 && (
                          <span className="text-emerald-400">+{entry.calc.healing} HP (Cura)</span>
                        )}
                      </div>
                    </div>

                    {/* Synergies */}
                    {entry.calc.synergyNotes.length > 0 && (
                      <div className="pt-1 border-t border-white/5 text-[10px] text-amber-300 space-y-0.5">
                        {entry.calc.synergyNotes.map((note, idx) => (
                          <div key={idx}>Sinergia: {note}</div>
                        ))}
                      </div>
                    )}

                    {/* Status Effect Rolls (Applied & Resisted) */}
                    {entry.calc.effectRolls && entry.calc.effectRolls.length > 0 ? (
                      <div className="pt-1.5 border-t border-white/5 space-y-1">
                        <div className="text-[10px] text-[#8E8E9A] uppercase">
                          Rolagens de Efeitos
                        </div>
                        <div className="space-y-1">
                          {entry.calc.effectRolls.map((er, idx) => {
                            const meta = STATUS_EFFECT_META[er.type];
                            return (
                              <div
                                key={`${er.type}-${idx}`}
                                className="flex items-center justify-between gap-2 text-[10px]"
                              >
                                <span
                                  className={`px-1.5 py-0.5 rounded border ${
                                    er.applied
                                      ? getToneBadgeClasses(meta?.tone)
                                      : 'bg-[#08080B] border-[#24242E] text-[#8E8E9A]'
                                  }`}
                                >
                                  {er.label} ({er.target === 'self' ? 'Si' : 'Alvo'})
                                </span>
                                <span
                                  className={
                                    er.applied ? 'text-emerald-400 font-semibold' : 'text-[#8E8E9A]'
                                  }
                                >
                                  d100: {er.rolled} vs {er.chance}% ·{' '}
                                  {er.applied ? `APLICADO (${er.duration}t)` : 'RESISTIU'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      entry.calc.appliedEffects.length > 0 && (
                        <div className="pt-1.5 border-t border-white/5 flex flex-wrap gap-1">
                          {entry.calc.appliedEffects.map((fx, idx) => {
                            const meta = STATUS_EFFECT_META[fx.type];
                            return (
                              <span
                                key={`${fx.type}-${idx}`}
                                className={`px-1.5 py-0.5 rounded border text-[10px] ${getToneBadgeClasses(meta?.tone)}`}
                              >
                                + {fx.label} ({fx.duration}t)
                              </span>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* End-of-Turn Continuous Status Effect Ticks (Color-coded per tick line) */}
                {delta.parsedTicks.length > 0 && (
                  <div className="rounded bg-[#050505] border border-[#24242E] px-2.5 py-1.5 text-[10px] font-mono tabular-nums space-y-1">
                    {delta.parsedTicks.map((tick, idx) => (
                      <div
                        key={idx}
                        className={
                          tick.kind === 'damage'
                            ? 'text-red-400 font-semibold'
                            : tick.kind === 'heal'
                            ? 'text-emerald-400 font-semibold'
                            : tick.kind === 'chakra'
                            ? 'text-sky-300'
                            : 'text-[#E4E4EA]'
                        }
                      >
                        {tick.kind === 'damage'
                          ? '[DANO] '
                          : tick.kind === 'heal'
                          ? '[CURA] '
                          : ''}
                        {tick.text}
                      </div>
                    ))}
                  </div>
                )}

                {/* Extra Tactical Notes (clouds, knockback, terrain, eye strain) */}
                {entry.extraNotes && entry.extraNotes.length > 0 && (
                  <div className="text-[10px] font-mono text-sky-300 space-y-0.5">
                    {entry.extraNotes.map((n, idx) => (
                      <div key={idx}>{n}</div>
                    ))}
                  </div>
                )}

                {/* Compact HP Snapshot Footer */}
                {entry.hpSnapshot && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-[10px] font-mono tabular-nums text-[#9CAFA3]">
                    <span>
                      Aliados/Você: {entry.hpSnapshot.playerHp}/{entry.hpSnapshot.playerMaxHp} HP
                    </span>
                    <span>
                      Alvo: {entry.hpSnapshot.enemyHp}/{entry.hpSnapshot.enemyMaxHp} HP
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
