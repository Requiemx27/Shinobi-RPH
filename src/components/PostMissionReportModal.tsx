import React, { useEffect, useState } from 'react';
import {
  Award,
  Backpack,
  CheckCircle2,
  Clock,
  Coins,
  Eye,
  Flame,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Swords,
  TrendingUp,
  X,
} from 'lucide-react';
import { PostMissionReportData } from '../game/engine';

interface PostMissionReportModalProps {
  report: PostMissionReportData | null;
  onClose: () => void;
  onOpenArsenal?: () => void;
  onOpenVillageRp?: () => void;
}

const RARITY_STYLES: Record<
  string,
  { border: string; accentText: string; tagBg: string; label: string }
> = {
  Lendário: {
    border: 'border-amber-400/55 bg-[#12100B]',
    accentText: 'text-amber-300',
    tagBg: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
    label: 'Item Lendário',
  },
  Épico: {
    border: 'border-emerald-400/55 bg-[#0A120E]',
    accentText: 'text-emerald-300',
    tagBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
    label: 'Item Épico',
  },
  Raro: {
    border: 'border-sky-400/45 bg-[#0A0F14]',
    accentText: 'text-sky-300',
    tagBg: 'bg-sky-500/15 text-sky-300 border-sky-400/40',
    label: 'Item Raro',
  },
  Comum: {
    border: 'border-zinc-800 bg-[#0B0C0E]',
    accentText: 'text-zinc-300',
    tagBg: 'bg-zinc-800/80 text-zinc-300 border-zinc-700',
    label: 'Suprimento Tático',
  },
};

const STAT_LABELS: Record<string, string> = {
  ninjutsu: 'NIN',
  taijutsu: 'TAI',
  genjutsu: 'GEN',
  velocidade: 'VEL',
  forca: 'FOR',
  inteligencia: 'INT',
  resistencia: 'RES',
  controleChakra: 'CHK',
};

function computeTacticalGrade(won: boolean, turns: number): { grade: string; label: string } {
  if (!won) return { grade: 'D', label: 'Retirada Tática' };
  if (turns <= 4) return { grade: 'S', label: 'Execução Impecável' };
  if (turns <= 7) return { grade: 'A', label: 'Domínio Tático' };
  if (turns <= 11) return { grade: 'B', label: 'Operação Sólida' };
  return { grade: 'C', label: 'Vitória de Atrito' };
}

export const PostMissionReportModal: React.FC<PostMissionReportModalProps> = ({
  report,
  onClose,
  onOpenArsenal,
  onOpenVillageRp,
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!report) return;
    const handleKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [report, onClose]);

  if (!report) return null;

  const xpPercent = Math.min(
    100,
    Math.max(4, Math.round((report.progress.newXp / Math.max(1, report.progress.xpNeeded)) * 100))
  );
  const chakraXpPercent = Math.min(
    100,
    Math.max(
      4,
      Math.round(
        (report.progress.newChakraXp / Math.max(1, report.progress.chakraXpNeeded)) * 100
      )
    )
  );

  const rareCount = report.lootDrops.filter((d) => d.isRareOrAbove).length;
  const totalItemsQty = report.lootDrops.reduce((sum, d) => sum + d.qty, 0);
  const totalLootValue = report.lootDrops.reduce((sum, d) => sum + d.valueRyo * d.qty, 0);
  const tactical = computeTacticalGrade(report.won, report.turnsElapsed);
  const maxStamina = report.maxStamina || 100;
  const lowStaminaAfterMission =
    report.remainingStamina !== undefined && report.remainingStamina < 30;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-mission-report-title"
    >
      <div className="relative w-full max-w-4xl rounded-xl border border-emerald-500/35 bg-[#08090C] text-zinc-100 shadow-2xl overflow-hidden my-auto">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800/90 bg-[#0B0D11] px-6 py-5">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className={report.won ? 'font-semibold text-emerald-400' : 'font-semibold text-amber-400'}>
                {report.won ? 'Relatório Pós-Missão · Concluída' : 'Relatório Pós-Missão · Retirada'}
              </span>
              {report.isWarMission && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-red-300">
                    <Flame className="w-3 h-3 text-red-400" />
                    Campanha de Guerra Ativa
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>Rank {report.missionRank}</span>
              <span aria-hidden="true">·</span>
              <span>{report.missionVillage}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{report.turnsElapsed} turnos</span>
            </div>
            <h2
              id="post-mission-report-title"
              className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white line-clamp-2"
            >
              {report.missionTitle}
            </h2>
            <p className="text-xs text-zinc-400">
              Oponente enfrentado: <span className="text-zinc-200 font-medium">{report.enemyName}</span>
              {report.activeConflictFront ? (
                <>
                  {' '}
                  <span aria-hidden="true">·</span>{' '}
                  <span className="text-emerald-400">
                    Frente Geopolítica: {report.activeConflictFront} (+{report.geopoliticalBonusPct}% Ryo)
                  </span>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex flex-col items-end border border-zinc-800 bg-[#07080A] px-3.5 py-2 rounded-lg">
              <span className="text-[11px] text-zinc-400">Avaliação Tática</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-xl font-bold text-emerald-400 tabular-nums">
                  {tactical.grade}
                </span>
                <span className="text-xs text-zinc-300">{tactical.label}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar relatório pós-missão"
              className="rounded-lg border border-zinc-800 bg-[#0E1015] p-2 text-zinc-400 hover:border-emerald-500/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Promotion / Level Up Highlight */}
          {(report.leveledUp || report.chakraLeveledUp || report.rankPromoted) && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/40 bg-[#0A130F] px-4 py-3">
              <div className="flex items-center gap-2.5 text-sm font-medium text-emerald-300">
                <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {report.rankPromoted
                    ? `Promoção Oficial Conquistada: ${report.progress.prevRank} → ${report.progress.newRank}`
                    : report.leveledUp
                      ? `Avanço de Nível Ninja: Nv. ${report.progress.prevLevel} → Nv. ${report.progress.newLevel}`
                      : `Domínio de Chakra Ampliado: Nv. ${report.progress.prevChakraLevel} → Nv. ${report.progress.newChakraLevel}`}
                </span>
              </div>
              <span className="text-xs text-emerald-400/90 tabular-nums">
                Atributos restaurados em 100%
              </span>
            </div>
          )}

          {/* Stamina Spent & Rest Reminder Strip */}
          {report.staminaSpent !== undefined && report.remainingStamina !== undefined && (
            <div
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-xs ${
                lowStaminaAfterMission
                  ? 'border-amber-500/45 bg-[#120F08] text-amber-200'
                  : 'border-zinc-800 bg-[#0B0D11] text-zinc-300'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 tabular-nums">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Fadiga de Missão: <strong className="text-white">-{report.staminaSpent} STA</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Stamina Restante:{' '}
                  <strong className={lowStaminaAfterMission ? 'text-amber-300' : 'text-emerald-400'}>
                    {report.remainingStamina}/{maxStamina} STA
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-zinc-400">Recuperação temporal: +1 STA a cada 2 min</span>
              </div>
              {lowStaminaAfterMission && (
                <span className="text-[11px] text-amber-300 font-medium">
                  Stamina baixa — descanse nos Locais Play-by-Forum da sua vila!
                </span>
              )}
            </div>
          )}

          {/* Ocular Blindness & Sharingan Strain Post-Combat Report */}
          {report.ocularSummary &&
            (report.ocularSummary.leftBlindness > 0 ||
              report.ocularSummary.rightBlindness > 0 ||
              (report.ocularSummary.events && report.ocularSummary.events.length > 0)) && (
              <div className="rounded-lg border border-red-500/45 bg-[#13090B] px-4 py-3.5 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-red-300">
                    <Eye className="w-4 h-4 text-red-400 shrink-0" />
                    Relatório de Integridade Ocular (Sharingan / Mangekyou)
                  </span>
                  <span className="font-mono tabular-nums text-zinc-200">
                    Luz Ocular: Esq {100 - report.ocularSummary.leftBlindness}% · Dir{' '}
                    {100 - report.ocularSummary.rightBlindness}% ({report.ocularSummary.visionLabel})
                  </span>
                </div>
                {report.ocularSummary.events && report.ocularSummary.events.length > 0 && (
                  <ul className="space-y-1 text-[11px] text-red-200/90 font-mono">
                    {report.ocularSummary.events.map((ev, i) => (
                      <li key={i}>• {ev}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

          {/* 3 Primary Metric Cards: XP, Ryo, Rare Loot */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* XP Card */}
            <div className="rounded-lg border border-zinc-800/90 bg-[#0B0D11] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Experiência Ganha
                </span>
                <span className="tabular-nums text-emerald-400 font-semibold">
                  Nv. {report.progress.newLevel}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-xl lg:text-2xl font-bold text-white tabular-nums whitespace-nowrap">
                  +{report.rewards.xp} XP
                </span>
                <span className="font-mono text-xs text-emerald-400 tabular-nums whitespace-nowrap">
                  +{report.rewards.chakraXp} C-XP
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <div>
                  <div className="flex justify-between text-[11px] text-zinc-400 tabular-nums mb-1">
                    <span>Progresso Ninja</span>
                    <span>
                      {report.progress.newXp} / {report.progress.xpNeeded}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-transform duration-200 origin-left"
                      style={{ transform: `scaleX(${xpPercent / 100})` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-zinc-400 tabular-nums mb-1">
                    <span>Controle Chakra (Nv. {report.progress.newChakraLevel})</span>
                    <span>
                      {report.progress.newChakraXp} / {report.progress.chakraXpNeeded}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400/75 transition-transform duration-200 origin-left"
                      style={{ transform: `scaleX(${chakraXpPercent / 100})` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ryo & Merit Card */}
            <div className="rounded-lg border border-zinc-800/90 bg-[#0B0D11] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  Ryo Coletado
                </span>
                <span className="tabular-nums text-zinc-300">
                  +{report.rewards.merit} Mérito
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-xl lg:text-2xl font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                  +{report.rewards.ryo.toLocaleString('pt-BR')} Ryo
                </span>
              </div>

              <div className="space-y-1.5 pt-1 text-xs text-zinc-400 border-t border-zinc-800/80">
                {report.rewards.geopoliticalBonusRyo && report.rewards.geopoliticalBonusRyo > 0 ? (
                  <div className="flex justify-between gap-2 tabular-nums">
                    <span className="truncate">Adicional de Guerra (+{report.geopoliticalBonusPct}%)</span>
                    <span className="text-emerald-400 font-medium whitespace-nowrap shrink-0">
                      +{report.rewards.geopoliticalBonusRyo} Ryo
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between gap-2 tabular-nums">
                    <span className="truncate">Pagamento Base do Quadro</span>
                    <span className="text-zinc-300 whitespace-nowrap shrink-0">{report.rewards.ryo} Ryo</span>
                  </div>
                )}
                <div className="flex justify-between gap-2 tabular-nums">
                  <span className="truncate">Saldo Atual na Carteira</span>
                  <span className="font-mono text-zinc-100 font-semibold whitespace-nowrap shrink-0">
                    {report.progress.newRyo.toLocaleString('pt-BR')} Ryo
                  </span>
                </div>
              </div>
            </div>

            {/* Rare Spoils Summary Card */}
            <div className="rounded-lg border border-zinc-800/90 bg-[#0B0D11] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Espólios Obtidos
                </span>
                <span className="tabular-nums text-emerald-400 font-medium whitespace-nowrap">
                  {rareCount > 0 ? `${rareCount} Raro+` : 'Padrão'}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-xl lg:text-2xl font-bold text-white tabular-nums whitespace-nowrap">
                  {totalItemsQty} {totalItemsQty === 1 ? 'Item' : 'Itens'}
                </span>
                <span className="font-mono text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                  ~{totalLootValue.toLocaleString('pt-BR')} Ryo
                </span>
              </div>

              <div className="space-y-1.5 pt-1 text-xs text-zinc-400 border-t border-zinc-800/80">
                <div className="flex justify-between gap-2">
                  <span className="truncate">Destino dos Espólios</span>
                  <span className="text-emerald-400 font-medium whitespace-nowrap shrink-0">Salvo na Mochila</span>
                </div>
                <div className="flex justify-between gap-2 tabular-nums">
                  <span className="truncate">Artefatos Raros / Relíquias</span>
                  <span className="text-zinc-200 font-semibold whitespace-nowrap shrink-0">{rareCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Loot Items Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Itens e Artefatos Obtidos na Tarefa
              </h3>
              <span className="text-xs text-zinc-400">
                {report.won
                  ? 'Transferidos automaticamente para o seu inventário'
                  : 'Missões interrompidas não concedem espólios materiais'}
              </span>
            </div>

            {report.lootDrops.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-[#0B0D11] px-4 py-6 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-zinc-500" />
                <span>
                  Nenhum item coletado nesta incursão. Vença missões do quadro para recuperar suprimentos e relíquias raras.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {report.lootDrops.map((drop) => {
                  const style = RARITY_STYLES[drop.rarity] || RARITY_STYLES.Comum;
                  const bonusEntries = Object.entries(drop.statBonuses || {}).filter(
                    ([, val]) => Number(val) > 0
                  );
                  const imgFailed = failedImages[drop.itemId];

                  return (
                    <div
                      key={drop.itemId}
                      className={`flex items-start gap-3.5 rounded-lg border p-3.5 ${style.border}`}
                    >
                      <div className="w-14 h-14 rounded-lg border border-zinc-800 bg-[#07080A] overflow-hidden shrink-0 flex items-center justify-center">
                        {drop.imageUrl && !imgFailed ? (
                          <img
                            src={drop.imageUrl}
                            alt={drop.name}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedImages((prev) => ({ ...prev, [drop.itemId]: true }))
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Swords className={`w-6 h-6 ${style.accentText}`} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[11px] font-semibold ${style.accentText}`}>
                            {drop.rarity} · {style.label}
                          </span>
                          <span className="font-mono text-xs font-bold text-white tabular-nums">
                            ×{drop.qty}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white truncate">{drop.name}</h4>
                        <p className="text-xs text-zinc-400 line-clamp-2">{drop.description}</p>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[11px] text-zinc-300 tabular-nums">
                          {bonusEntries.map(([statKey, val]) => (
                            <span key={statKey} className="text-emerald-400 font-medium">
                              +{val} {STAT_LABELS[statKey] || statKey}
                            </span>
                          ))}
                          {drop.healHp ? (
                            <span className="text-emerald-400 font-medium">+{drop.healHp} HP</span>
                          ) : null}
                          {drop.healChakra ? (
                            <span className="text-sky-300 font-medium">+{drop.healChakra} CH</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/90 bg-[#0B0D11] px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Progresso sincronizado com o banco de dados do RPG</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenVillageRp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVillageRp();
                }}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  lowStaminaAfterMission
                    ? 'border-amber-400/60 bg-[#1A1409] text-amber-300 hover:bg-amber-500/20'
                    : 'border-zinc-700 bg-[#12151C] text-zinc-200 hover:border-emerald-500/50 hover:text-emerald-300'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                Descansar nos Locais RP
              </button>
            )}
            {onOpenArsenal && report.lootDrops.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenArsenal();
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-[#12151C] px-4 py-2 text-xs font-semibold text-zinc-100 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0"
              >
                <Backpack className="w-3.5 h-3.5 text-emerald-400" />
                Abrir Mochila & Equipar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0"
            >
              Continuar no Quadro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
