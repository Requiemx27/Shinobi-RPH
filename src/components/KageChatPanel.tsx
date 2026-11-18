import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Crown, Send } from 'lucide-react';
import { CharacterModel } from '../game/engine.ts';
import { VILLAGES } from '../game/narutoData.ts';
import { shinobiAudio } from '../game/sound.ts';
import { NinjaAvatar } from './NinjaAvatar.tsx';

export interface ChatMsg {
  id: number;
  channel: string;
  senderUid: string;
  senderName: string;
  senderVillage: string;
  message: string;
  createdAt: string;
}

interface KageChatPanelProps {
  character: CharacterModel;
  rankings: CharacterModel[];
  chatMessages: ChatMsg[];
  activeChannel: string;
  onSelectChannel: (ch: string) => void;
  onSendChat: (channel: string, message: string) => void;
  pushEnabled: boolean;
  onTogglePush: () => Promise<void>;
  onChallengePvp?: (targetCharId: number) => void;
}

export const KageChatPanel: React.FC<KageChatPanelProps> = ({
  character,
  rankings,
  chatMessages,
  activeChannel,
  onSelectChannel,
  onSendChat,
  pushEnabled,
  onTogglePush,
  onChallengePvp,
}) => {
  const [villageFilter, setVillageFilter] = useState<string>('Todas');
  const [chatText, setChatText] = useState('');
  const [dmTargetUid, setDmTargetUid] = useState<string>('');

  const filteredRankings = useMemo(() => {
    if (villageFilter === 'Todas') return rankings;
    return rankings.filter((r) => r.village === villageFilter);
  }, [rankings, villageFilter]);

  const currentVillageKage = useMemo(
    () => rankings.find((r) => r.village === character.village && r.isKage),
    [rankings, character.village]
  );

  useEffect(() => {
    if (dmTargetUid) {
      const pair = [character.userUid, dmTargetUid].sort().join(':');
      onSelectChannel(`dm:${pair}`);
    }
  }, [dmTargetUid, character.userUid, onSelectChannel]);

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    shinobiAudio.playUiClick();
    onSendChat(activeChannel, chatText.trim());
    setChatText('');
  };

  const handleRequestBrowserPush = async () => {
    await onTogglePush();
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission().catch(() => {});
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Village Ranking & Admin-Appointed Kages */}
      <section className="lg:col-span-6 bg-[#0C0C10] border border-[#24242E] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24242E] pb-3">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#22C55E]" />
            <h2 className="font-display text-lg font-bold text-[#F4F4F6]">
              Membros, Ranking & Kages Nomeados
            </h2>
          </div>

          <select
            aria-label="Filtrar ranking por vila"
            value={villageFilter}
            onChange={(e) => setVillageFilter(e.target.value)}
            className="bg-[#08080B] border border-[#24242E] rounded px-2.5 py-1.5 text-xs text-[#F4F4F6]"
          >
            <option value="Todas">Todas as Vilas</option>
            {VILLAGES.map((v) => (
              <option key={v.id} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="p-3.5 rounded bg-[#08080B] border border-[#10B981] text-xs text-[#E4E4EA] space-y-1">
          <div>
            Kage atual de {character.village}:{' '}
            <strong className="text-[#22C55E]">
              {currentVillageKage ? currentVillageKage.name : 'Posto Vago — Aguardando Escolha da Administração'}
            </strong>
          </div>
          <div className="font-mono tabular-nums text-[#8E8E9A]">
            Seu Mérito: {character.meritPoints} · Kages são apontados exclusivamente pela Administração no ACP.
          </div>
        </div>

        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
          {filteredRankings.map((ninja, idx) => (
            <div
              key={ninja.id}
              className="p-3 rounded bg-[#08080B] border border-[#24242E] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs font-bold tabular-nums text-[#22C55E] w-6">
                  #{idx + 1}
                </span>
                <NinjaAvatar src={ninja.avatarUrl} alt={ninja.name} sizeClass="w-10 h-10" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#F4F4F6] truncate">
                    {ninja.name} {ninja.isKage ? '· Kage' : ''}
                  </div>
                  <div className="text-xs text-[#8E8E9A] truncate">
                    {ninja.village} · {ninja.rank} · Nv.{ninja.level}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-xs font-semibold tabular-nums text-[#22C55E]">
                  {ninja.meritPoints} M
                </span>
                {ninja.userUid !== character.userUid && (
                  <div className="flex items-center gap-1.5">
                    {onChallengePvp && (
                      <button
                        type="button"
                        onClick={() => onChallengePvp(ninja.id)}
                        className="px-2.5 py-1 rounded bg-[#08080B] hover:bg-red-500 hover:text-[#050505] border border-red-500/50 text-[11px] text-red-300 font-semibold whitespace-nowrap cursor-pointer"
                      >
                        Desafiar PvP
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDmTargetUid(ninja.userUid)}
                      className="px-2.5 py-1 rounded bg-[#121218] hover:bg-[#10B981] hover:text-[#050505] border border-[#10B981] text-[11px] text-white font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Chat Privado
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Right: Real-Time Socket.io Team & Private Chat + Push Controls */}
      <section className="lg:col-span-6 bg-[#0C0C10] border border-[#24242E] rounded-lg p-5 flex flex-col justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#24242E] pb-3">
            <h2 className="font-display text-lg font-bold text-[#F4F4F6]">
              Chat em Tempo Real & MPs Privadas
            </h2>
            <button
              type="button"
              onClick={handleRequestBrowserPush}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border whitespace-nowrap cursor-pointer ${
                pushEnabled
                  ? 'bg-[#08080B] border-[#10B981] text-[#22C55E]'
                  : 'bg-[#08080B] border-[#24242E] text-[#8E8E9A]'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              {pushEnabled ? 'Notificações Push Ativas' : 'Ativar Push'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'global', label: 'Global' },
              { id: `village:${character.village}`, label: `Vila (${character.village})` },
              { id: 'squad:Time-7', label: 'Equipe / Esquadrão' },
            ].map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  setDmTargetUid('');
                  onSelectChannel(ch.id);
                }}
                className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap cursor-pointer ${
                  activeChannel === ch.id
                    ? 'bg-[#10B981] text-[#050505] font-bold'
                    : 'bg-[#08080B] border border-[#24242E] text-[#8E8E9A] hover:text-white'
                }`}
              >
                {ch.label}
              </button>
            ))}
            {activeChannel.startsWith('dm:') && (
              <span className="text-xs text-[#22C55E] px-2">Canal Privado Ativo</span>
            )}
          </div>

          <div className="bg-[#050505] border border-[#24242E] rounded-lg p-4 h-[340px] overflow-y-auto space-y-2.5">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-[#8E8E9A]">
                Nenhuma mensagem neste canal ainda. Inicie a conversa em tempo real!
              </p>
            ) : (
              chatMessages.map((msg) => {
                const isSelf = msg.senderUid === character.userUid;
                return (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded text-xs space-y-1 ${
                      isSelf
                        ? 'bg-[#0C0C10] border border-[#10B981] ml-8'
                        : 'bg-[#121218] border border-[#24242E] mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#8E8E9A]">
                      <span className="font-semibold text-[#22C55E]">
                        {msg.senderName} · {msg.senderVillage}
                      </span>
                      <span className="font-mono tabular-nums">
                        {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[#F4F4F6] leading-relaxed">{msg.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <form onSubmit={handleSubmitChat} className="flex gap-2">
          <input
            type="text"
            aria-label="Mensagem de chat"
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder="Digite sua mensagem para a equipe ou ninja..."
            className="flex-1 px-3.5 py-2 rounded bg-[#08080B] border border-[#24242E] focus:border-[#10B981] focus:outline-none text-sm text-white"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            Enviar
          </button>
        </form>
      </section>
    </div>
  );
};
