import React, { useEffect, useState } from 'react';
import { Download, LogIn, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import {
  CharacterModel,
  calculateEffectiveStats,
  computeCurrentStamina,
  formatStaminaCountdown,
} from '../game/engine.ts';
import { LANGUAGE_LABELS, LanguageCode } from '../game/i18n.ts';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { NinjaAvatar } from './NinjaAvatar.tsx';

export type ForumNavSection =
  | 'home'
  | 'forum'
  | 'missions'
  | 'teams'
  | 'geopolitics'
  | 'character'
  | 'jutsus'
  | 'graduation'
  | 'market'
  | 'members_chat'
  | 'admin';

interface ForumHeaderProps {
  character: CharacterModel | null;
  needsCharacterCreation?: boolean;
  activeSection: ForumNavSection;
  onSelectSection: (section: ForumNavSection) => void;
  breadcrumbs: Array<{ label: string; onClick?: () => void }>;
  lang: LanguageCode;
  onChangeLang: (lang: LanguageCode) => void;
  muted: boolean;
  onToggleMute: () => void;
  isOnline: boolean;
  onlineCount: number;
  onOpenAuthModal: () => void;
}

export const ForumHeader: React.FC<ForumHeaderProps> = ({
  character,
  needsCharacterCreation = false,
  activeSection,
  onSelectSection,
  breadcrumbs,
  lang,
  onChangeLang,
  muted,
  onToggleMute,
  isOnline,
  onlineCount,
  onOpenAuthModal,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const eff = character ? calculateEffectiveStats(character) : null;
  const liveStamina = character ? computeCurrentStamina(character, nowMs) : null;

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const navItems: Array<{ id: ForumNavSection; label: string }> = [
    { id: 'home', label: 'Início' },
    { id: 'forum', label: 'Fórum' },
    { id: 'missions', label: 'Missões' },
    { id: 'teams', label: 'Equipes' },
    { id: 'geopolitics', label: 'Geopolítica' },
    { id: 'character', label: needsCharacterCreation ? 'Criar Ficha' : 'Ficha' },
    { id: 'jutsus', label: 'Jutsus' },
    { id: 'graduation', label: 'Graduações' },
    { id: 'market', label: 'Mercado' },
    { id: 'members_chat', label: 'Membros' },
    { id: 'admin', label: 'ACP' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#050505] border-b border-[#1E1E26]">
      {/* 3-Zone Top Bar Contract */}
      <div className="max-w-[1360px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4 xl:gap-8">
        {/* Zone 1: Brand Crest & Wordmark */}
        <button
          type="button"
          onClick={() => !needsCharacterCreation && onSelectSection('home')}
          className="inline-flex items-center gap-2.5 font-display text-base md:text-lg font-bold tracking-wide text-[#F8FAFC] hover:text-[#22C55E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <svg viewBox="0 0 28 28" className="w-7 h-7 shrink-0" aria-hidden="true">
            <rect x="2" y="2" width="24" height="24" rx="6" fill="#0C0C10" stroke="#10B981" strokeWidth="1.6" />
            <path d="M14 6C9.5 9.5 8 15 11.5 19.5C14.5 22 19 20.5 20.5 16.5C21.5 13 18.5 9 14 6Z" fill="none" stroke="#22C55E" strokeWidth="1.7" />
            <path d="M14 9V19M11 15H17" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Konoha Defenders</span>
        </button>

        {/* Zone 2: Single-line forum navigation links */}
        <nav
          aria-label="Navegação do Fórum"
          className="hidden lg:flex items-center gap-3.5 xl:gap-5 text-[13px] font-medium"
        >
          {navItems.map((item) => {
            const active = activeSection === item.id;
            const locked = needsCharacterCreation && item.id !== 'character';
            return (
              <button
                key={item.id}
                type="button"
                disabled={locked}
                onClick={() => onSelectSection(item.id)}
                className={`py-1.5 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  locked
                    ? 'text-[#52525B] border-transparent cursor-not-allowed'
                    : active
                    ? 'text-[#22C55E] border-[#10B981] font-semibold cursor-pointer'
                    : 'text-[#A1A1AA] border-transparent hover:text-[#F8FAFC] cursor-pointer'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Account / Login Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            {character || needsCharacterCreation ? 'Trocar Conta' : 'Entrar'}
          </button>
        </div>
      </div>

      {/* Mobile Nav Strip */}
      <nav
        aria-label="Navegação Móvel do Fórum"
        className="lg:hidden max-w-[1360px] mx-auto px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto border-t border-[#1A1A22]"
      >
        {navItems.map((item) => {
          const active = activeSection === item.id;
          const locked = needsCharacterCreation && item.id !== 'character';
          return (
            <button
              key={item.id}
              type="button"
              disabled={locked}
              onClick={() => onSelectSection(item.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap shrink-0 ${
                locked
                  ? 'text-[#52525B] cursor-not-allowed'
                  : active
                  ? 'bg-[#10B981] text-[#050505] font-bold cursor-pointer'
                  : 'text-[#A1A1AA] hover:text-white cursor-pointer'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Sub-Bar: Breadcrumbs & Live User Strip */}
      <div className="bg-[#0A0A0E] border-t border-[#1A1A22]">
        <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-[#A1A1AA] min-w-0 flex-wrap">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={`${crumb.label}-${idx}`}>
                {idx > 0 && <span aria-hidden="true">/</span>}
                {crumb.onClick ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    className="hover:text-[#22C55E] transition-colors cursor-pointer truncate max-w-[220px]"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-[#F8FAFC] font-medium truncate max-w-[260px]">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Right User Summary & Utilities */}
          <div className="flex items-center gap-3 flex-wrap">
            {character && eff && liveStamina && (
              <button
                type="button"
                onClick={() => onSelectSection('character')}
                className="flex items-center gap-2 text-left hover:text-[#22C55E] transition-colors cursor-pointer"
              >
                <NinjaAvatar src={character.avatarUrl} alt={character.name} sizeClass="w-6 h-6" />
                <span className="text-[#F8FAFC] font-medium">{character.name}</span>
                <span className="hidden sm:inline text-[#A1A1AA] font-mono tabular-nums">
                  · {character.rank} · Nv.{character.level} ·{' '}
                  <span className={liveStamina.stamina < 24 ? 'text-amber-400 font-semibold' : 'text-[#22C55E] font-semibold'}>
                    STA {liveStamina.stamina}/{liveStamina.maxStamina}
                  </span>
                  {!liveStamina.isFull
                    ? ` (+1 em ${formatStaminaCountdown(liveStamina.secondsUntilNextPoint)})`
                    : ''}{' '}
                  · {character.ryo.toLocaleString('pt-BR')} Ryo · HP {eff.maxHp}
                </span>
              </button>
            )}

            <span className="inline-flex items-center gap-1 text-[#A1A1AA] font-mono tabular-nums">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-[#22C55E]" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-[#F59E0B]" />
              )}
              {onlineCount}
            </span>

            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#121218] border border-[#272732] text-[#F8FAFC] hover:border-[#10B981] cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3 h-3" />
                PWA
              </button>
            )}
            {!isInstalled && !isInstallable && isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSGuide(true)}
                className="px-2 py-1 rounded bg-[#121218] border border-[#272732] text-[#F8FAFC] hover:border-[#10B981] cursor-pointer whitespace-nowrap"
              >
                iOS App
              </button>
            )}

            <select
              aria-label="Selecionar idioma"
              value={lang}
              onChange={(e) => onChangeLang(e.target.value as LanguageCode)}
              className="bg-[#121218] border border-[#272732] text-[11px] text-[#F8FAFC] px-2 py-1 rounded cursor-pointer"
            >
              {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((code) => (
                <option key={code} value={code}>
                  {code.toUpperCase()}
                </option>
              ))}
            </select>

            <button
              type="button"
              aria-label={muted ? 'Ativar som' : 'Silenciar som'}
              onClick={onToggleMute}
              className="p-1 rounded bg-[#121218] border border-[#272732] text-[#A1A1AA] hover:text-white cursor-pointer"
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-6 max-w-sm w-full space-y-3">
            <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
              Instalar no iOS Safari
            </h3>
            <p className="text-sm text-[#A1A1AA]">
              1. Toque em Compartilhar no Safari. 2. Selecione Adicionar à Tela de Início.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 rounded-md bg-[#10B981] text-[#050505] text-sm font-bold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
