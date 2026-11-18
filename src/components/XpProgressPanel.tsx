import React from 'react';
import {
  CharacterModel,
  chakraXpRequiredForLevel,
  getMaxJutsuRankForGraduation,
  JUTSU_RANK_ORDER,
  xpRequiredForLevel,
} from '../game/engine.ts';
import { JutsuDef } from '../game/narutoData.ts';

const ALL_JUTSU_RANKS: JutsuDef['rank'][] = ['E', 'D', 'C', 'B', 'A', 'S'];

interface XpProgressPanelProps {
  character: CharacterModel;
  compact?: boolean;
  showJutsuCaps?: boolean;
  onOpenGraduation?: () => void;
}

export const XpProgressPanel: React.FC<XpProgressPanelProps> = ({
  character,
  compact = false,
  showJutsuCaps = false,
  onOpenGraduation,
}) => {
  const xpReq = Math.max(1, xpRequiredForLevel(character.level));
  const xpCurr = Math.max(0, character.xp);
  const xpPct = Math.min(100, Math.round((xpCurr / xpReq) * 100));
  const xpRemaining = Math.max(0, xpReq - xpCurr);

  const chakraReq = Math.max(1, chakraXpRequiredForLevel(character.chakraLevel));
  const chakraCurr = Math.max(0, character.chakraXp);
  const chakraPct = Math.min(100, Math.round((chakraCurr / chakraReq) * 100));
  const chakraRemaining = Math.max(0, chakraReq - chakraCurr);

  const maxRank = getMaxJutsuRankForGraduation(character.rank);
  const maxOrder = JUTSU_RANK_ORDER[maxRank];
  const unlockedRanks = ALL_JUTSU_RANKS.filter((r) => JUTSU_RANK_ORDER[r] <= maxOrder);
  const blockedRanks = ALL_JUTSU_RANKS.filter((r) => JUTSU_RANK_ORDER[r] > maxOrder);

  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-3.5'}>
      {/* Ninja Experience Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#ECFDF5] whitespace-nowrap">
            {compact ? `XP · Nv.${character.level}` : `Experiência Ninja · Nível ${character.level}`}
          </span>
          <span className="font-mono tabular-nums text-[#4ADE80] whitespace-nowrap">
            {xpCurr} / {xpReq} ({xpPct}%)
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Barra de Experiência Ninja"
          aria-valuenow={xpPct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2.5 w-full rounded-full bg-[#050806] border border-white/10 overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#059669] to-[#4ADE80] transition-all duration-300"
            style={{ width: `${xpPct}%` }}
          />
        </div>
        {!compact && (
          <div className="text-[11px] font-mono tabular-nums text-[#9CAFA3]">
            Faltam {xpRemaining} XP para o Nível {character.level + 1}
          </div>
        )}
      </div>

      {/* Chakra Experience Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#D1FAE5] whitespace-nowrap">
            {compact ? `Chakra · Nv.${character.chakraLevel}` : `Nível de Chakra ${character.chakraLevel}`}
          </span>
          <span className="font-mono tabular-nums text-[#34D399] whitespace-nowrap">
            {chakraCurr} / {chakraReq} ({chakraPct}%)
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Barra de Experiência de Chakra"
          aria-valuenow={chakraPct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2.5 w-full rounded-full bg-[#050806] border border-white/10 overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0D9488] to-[#34D399] transition-all duration-300"
            style={{ width: `${chakraPct}%` }}
          />
        </div>
        {!compact && (
          <div className="text-[11px] font-mono tabular-nums text-[#9CAFA3]">
            Faltam {chakraRemaining} C-XP para Chakra Nv.{character.chakraLevel + 1}
          </div>
        )}
      </div>

      {/* Explicit Graduation Jutsu Rank Cap Indicator */}
      {showJutsuCaps && (
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-xs">
            <div className="text-[#ECFDF5] font-medium">
              Graduação Atual: <span className="text-[#4ADE80] font-bold">{character.rank}</span>{' '}
              · Limite de Técnicas:{' '}
              <span className="font-mono font-bold text-[#4ADE80]">Até Rank {maxRank}</span>
            </div>
            <div className="text-[11px] text-[#9CAFA3] flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Liberados:{' '}
                <strong className="font-mono text-[#4ADE80]">
                  {unlockedRanks.join(', ')}
                </strong>
              </span>
              {blockedRanks.length > 0 ? (
                <span>
                  Bloqueados acima de {maxRank}:{' '}
                  <strong className="font-mono text-[#F59E0B]">
                    {blockedRanks.join(', ')}
                  </strong>
                </span>
              ) : (
                <span className="text-[#4ADE80] font-medium">
                  Todos os ranks técnicos desbloqueados
                </span>
              )}
            </div>
          </div>

          {onOpenGraduation && (
            <button
              type="button"
              onClick={onOpenGraduation}
              className="px-3.5 py-2 rounded-md bg-[#10B981] hover:bg-[#059669] text-[#04120A] text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Graduações & Exames
            </button>
          )}
        </div>
      )}
    </div>
  );
};
