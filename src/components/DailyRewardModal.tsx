import React, { useEffect } from 'react';
import {
  CalendarCheck2,
  CheckCircle2,
  Coins,
  Flame,
  Gift,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { DailyLoginRewardPopupData } from '../game/engine.ts';

interface DailyRewardModalProps {
  reward: DailyLoginRewardPopupData | null;
  onClose: () => void;
}

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({ reward, onClose }) => {
  useEffect(() => {
    if (!reward) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reward, onClose]);

  if (!reward) return null;

  const isRyo = reward.rewardType === 'ryo';
  const xpPct = Math.min(
    100,
    Math.max(4, Math.round((reward.newXp / Math.max(1, reward.xpNeeded)) * 100))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-reward-modal-title"
      data-testid="daily-login-reward-modal"
    >
      <div className="relative w-full max-w-2xl rounded-xl border border-[#10B981]/50 bg-[#08090C] text-[#F8FAFC] shadow-2xl overflow-hidden my-auto">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#1E1E26] bg-[#0B0D11] px-6 py-5">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#A1A1AA]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#22C55E]">
                <CalendarCheck2 className="w-3.5 h-3.5 text-[#10B981]" />
                Primeiro Acesso do Dia
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-[#F8FAFC] font-medium">
                <Flame className="w-3.5 h-3.5 text-[#22C55E]" />
                Dia {reward.streakDay} de Sequência
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[11px] text-[#A1A1AA]">{reward.dateKey}</span>
            </div>

            <h2
              id="daily-reward-modal-title"
              className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white"
            >
              {reward.title}
            </h2>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">{reward.description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar notificação de recompensa diária"
            className="rounded-lg border border-[#272732] bg-[#0E1015] p-2 text-[#A1A1AA] hover:border-[#10B981]/60 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Main Reward Box */}
          <div className="rounded-xl border border-[#10B981]/40 bg-[#0A110E] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-lg border border-[#10B981]/50 bg-[#050505] flex items-center justify-center shrink-0">
                  {isRyo ? (
                    <Coins className="w-6 h-6 text-[#22C55E]" />
                  ) : (
                    <TrendingUp className="w-6 h-6 text-[#22C55E]" />
                  )}
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-[#22C55E]">
                    {isRyo ? 'Recompensa em Ryo' : 'Recompensa em Experiência'}
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-white tabular-nums">
                    {isRyo
                      ? `+${reward.ryoGranted.toLocaleString('pt-BR')} Ryo`
                      : `+${reward.xpGranted.toLocaleString('pt-BR')} XP`}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#1E1E26] bg-[#07080A] px-3.5 py-2 text-right tabular-nums">
                {isRyo ? (
                  <>
                    <div className="text-[11px] text-[#A1A1AA]">Saldo Atualizado</div>
                    <div className="font-mono text-sm font-bold text-[#22C55E]">
                      {reward.prevRyo.toLocaleString('pt-BR')} → {reward.newRyo.toLocaleString('pt-BR')} Ryo
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[11px] text-[#A1A1AA]">
                      {reward.leveledUp
                        ? `Subiu para Nível ${reward.newLevel}!`
                        : `Experiência · Nível ${reward.newLevel}`}
                    </div>
                    <div className="font-mono text-sm font-bold text-[#22C55E]">
                      {reward.newXp.toLocaleString('pt-BR')} / {reward.xpNeeded.toLocaleString('pt-BR')} XP
                    </div>
                  </>
                )}
              </div>
            </div>

            {!isRyo && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-[#A1A1AA] tabular-nums">
                  <span>Progresso Ninja</span>
                  <span className="text-[#22C55E] font-medium">{xpPct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#050505] border border-[#1E1E26] overflow-hidden">
                  <div
                    className="h-full bg-[#10B981] transition-transform duration-300 origin-left"
                    style={{ transform: `scaleX(${xpPct / 100})` }}
                  />
                </div>
                {reward.leveledUp && (
                  <div className="flex items-center gap-1.5 text-xs text-[#22C55E] font-semibold pt-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Avanço de Nível! (+4 Pontos de Atributo livres concedidos)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 7-Day Rotation Preview */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#F8FAFC] flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-[#10B981]" />
                Ciclo Semanal de Recompensas Diárias
              </span>
              <span className="text-[11px] text-[#A1A1AA] tabular-nums">
                Dia {reward.cycleDay} de 7 no ciclo
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
              {reward.schedule.map((slot) => {
                const isToday = slot.day === reward.cycleDay;
                const isPast = slot.day < reward.cycleDay;

                return (
                  <div
                    key={slot.day}
                    className={`rounded-lg border px-2.5 py-2.5 text-center space-y-1 transition-colors ${
                      isToday
                        ? 'border-[#10B981] bg-[#0B1712]'
                        : isPast
                        ? 'border-[#1E1E26] bg-[#0B0C10] opacity-75'
                        : 'border-[#1E1E26] bg-[#070709]'
                    }`}
                  >
                    <div
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        isToday ? 'text-[#22C55E]' : 'text-[#A1A1AA]'
                      }`}
                    >
                      Dia {slot.day}
                    </div>
                    <div className="flex justify-center py-0.5">
                      {slot.rewardType === 'ryo' ? (
                        <Coins
                          className={`w-4 h-4 ${isToday ? 'text-[#22C55E]' : 'text-zinc-400'}`}
                        />
                      ) : (
                        <TrendingUp
                          className={`w-4 h-4 ${isToday ? 'text-[#22C55E]' : 'text-zinc-400'}`}
                        />
                      )}
                    </div>
                    <div
                      className={`font-mono text-[11px] font-bold tabular-nums ${
                        isToday ? 'text-white' : 'text-zinc-300'
                      }`}
                    >
                      {slot.label}
                    </div>
                    {isToday ? (
                      <div className="text-[10px] font-semibold text-[#22C55E]">Resgatado</div>
                    ) : isPast ? (
                      <div className="text-[10px] text-zinc-500">Concluído</div>
                    ) : (
                      <div className="text-[10px] text-zinc-500">Próximo</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1E1E26] bg-[#0B0D11] px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>Recompensa salva automaticamente na sua ficha shinobi</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg bg-[#10B981] hover:bg-[#22C55E] px-4 py-2 text-xs font-bold text-[#050505] transition-colors cursor-pointer whitespace-nowrap"
          >
            Resgatar & Continuar no RPG
          </button>
        </div>
      </div>
    </div>
  );
};
