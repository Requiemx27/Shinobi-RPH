import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Socket } from 'socket.io-client';
import {
  CheckCircle2,
  Crown,
  Send,
  Shield,
  Sparkles,
  Swords,
  UserMinus,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { CharacterModel } from '../game/engine.ts';
import {
  isSenseiEligibleRank,
  isStudentEligibleRank,
  ShinobiTeamRecord,
} from '../game/teamPvpEngine.ts';
import { apiFetch } from '../utils/api.ts';
import { shinobiAudio } from '../game/sound.ts';
import { NinjaAvatar } from './NinjaAvatar.tsx';
import { ChatMsg } from './KageChatPanel.tsx';

interface AvailableNinja {
  id: number;
  userUid: string;
  name: string;
  avatarUrl: string;
  rank: string;
  village: string;
  level: number;
  chakraNature: string;
  specialization: string;
}

interface TeamsPanelProps {
  character: CharacterModel;
  socket: Socket | null;
  onOpenTeamMissions: () => void;
  onChallengePvp?: (targetCharacterId: number) => void;
}

export const TeamsPanel: React.FC<TeamsPanelProps> = ({
  character,
  socket,
  onOpenTeamMissions,
  onChallengePvp,
}) => {
  const [teams, setTeams] = useState<ShinobiTeamRecord[]>([]);
  const [myTeams, setMyTeams] = useState<ShinobiTeamRecord[]>([]);
  const [myInvites, setMyInvites] = useState<ShinobiTeamRecord[]>([]);
  const [availableNinjas, setAvailableNinjas] = useState<AvailableNinja[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  // Create team form
  const [teamName, setTeamName] = useState('');
  const [teamMotto, setTeamMotto] = useState('');

  // Recruit dropdown per slot
  const [selectedNinjaId, setSelectedNinjaId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  // Team live chat
  const [teamChat, setTeamChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');

  const loadTeams = useCallback(async () => {
    try {
      const res = await apiFetch<{
        teams: ShinobiTeamRecord[];
        myTeams: ShinobiTeamRecord[];
        myInvites: ShinobiTeamRecord[];
        availableNinjas: AvailableNinja[];
      }>('/api/teams');
      setTeams(res.teams || []);
      setMyTeams(res.myTeams || []);
      setMyInvites(res.myInvites || []);
      setAvailableNinjas(res.availableNinjas || []);
      setSelectedTeamId((prev) => {
        if (prev && (res.myTeams || []).some((t) => t.id === prev)) return prev;
        return res.myTeams?.[0]?.id ?? null;
      });
    } catch (err) {
      setFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    if (!socket) return;
    const onUpdated = () => {
      loadTeams();
    };
    socket.on('teams:updated', onUpdated);
    return () => {
      socket.off('teams:updated', onUpdated);
    };
  }, [socket, loadTeams]);

  const activeTeam = useMemo(
    () => myTeams.find((t) => t.id === selectedTeamId) || myTeams[0] || null,
    [myTeams, selectedTeamId]
  );

  // Team live chat sync
  useEffect(() => {
    if (!activeTeam) {
      setTeamChat([]);
      return;
    }
    const channel = `team:${activeTeam.id}`;
    apiFetch<{ messages: ChatMsg[] }>(`/api/chat/messages?channel=${encodeURIComponent(channel)}`)
      .then((res) => setTeamChat(res.messages || []))
      .catch(() => {});
    socket?.emit('chat:join', channel);
    socket?.emit('team:join', activeTeam.id);

    if (!socket) return;
    const onMsg = (msg: ChatMsg) => {
      if (msg.channel === channel) {
        setTeamChat((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
    };
    socket.on('chat:message', onMsg);
    return () => {
      socket.off('chat:message', onMsg);
    };
  }, [activeTeam, socket]);

  const isSenseiSelf = isSenseiEligibleRank(character.rank);
  const isStudentSelf = isStudentEligibleRank(character.rank);

  const recruitCandidates = useMemo(() => {
    if (!activeTeam) return [];
    const memberCharIds = new Set(activeTeam.members.map((m) => m.characterId));
    const hasSensei = activeTeam.members.some((m) => m.role === 'sensei' || m.slotIndex === 0);
    const studentCount = activeTeam.members.filter((m) => m.role === 'student').length;

    return availableNinjas.filter((n) => {
      if (memberCharIds.has(n.id)) return false;
      if (!hasSensei && isSenseiEligibleRank(n.rank)) return true;
      if (studentCount < 3 && isStudentEligibleRank(n.rank)) return true;
      return false;
    });
  }, [activeTeam, availableNinjas]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setBusy(true);
    setFeedback(null);
    try {
      shinobiAudio.playUiClick();
      const res = await apiFetch<{ team: ShinobiTeamRecord }>('/api/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: teamName.trim(),
          motto: teamMotto.trim() || 'Trabalho em equipe acima de tudo.',
        }),
      });
      setTeamName('');
      setTeamMotto('');
      setSelectedTeamId(res.team?.id ?? null);
      setFeedback({
        text: `Equipe "${res.team?.name}" criada com sucesso no formato 1 Sensei + 3 Alunos!`,
        ok: true,
      });
      await loadTeams();
    } catch (err) {
      setFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setBusy(false);
    }
  };

  const handleRecruitMember = async (candidateId?: number) => {
    const idToAdd = candidateId ?? Number(selectedNinjaId);
    if (!activeTeam || !idToAdd) return;
    setBusy(true);
    setFeedback(null);
    try {
      shinobiAudio.playUiClick();
      const res = await apiFetch<{ team: ShinobiTeamRecord; memberStatus: string }>(
        `/api/teams/${activeTeam.id}/add-member`,
        {
          method: 'POST',
          body: JSON.stringify({ characterId: idToAdd }),
        }
      );
      setSelectedNinjaId('');
      setFeedback({
        text:
          res.memberStatus === 'active'
            ? 'Shinobi integrado imediatamente à formação da equipe!'
            : 'Convite oficial enviado para a caixa do shinobi.',
        ok: true,
      });
      await loadTeams();
    } catch (err) {
      setFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setBusy(false);
    }
  };

  const handleRespondInvite = async (teamId: number, accept: boolean) => {
    setBusy(true);
    setFeedback(null);
    try {
      shinobiAudio.playUiClick();
      await apiFetch(`/api/teams/${teamId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept }),
      });
      setFeedback({
        text: accept ? 'Você entrou na equipe!' : 'Convite recusado.',
        ok: true,
      });
      await loadTeams();
    } catch (err) {
      setFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setBusy(false);
    }
  };

  const handleJoinOpenTeam = async (teamId: number) => {
    setBusy(true);
    setFeedback(null);
    try {
      shinobiAudio.playUiClick();
      await apiFetch(`/api/teams/${teamId}/join`, { method: 'POST', body: JSON.stringify({}) });
      setSelectedTeamId(teamId);
      setFeedback({ text: 'Você ingressou na equipe shinobi!', ok: true });
      await loadTeams();
    } catch (err) {
      setFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (teamId: number, targetCharId: number) => {
    setBusy(true);
    setFeedback(null);
    try {
      await apiFetch(`/api/teams/${teamId}/remove`, {
        method: 'POST',
        body: JSON.stringify({ characterId: targetCharId }),
      });
      setFeedback({ text: 'Formação atualizada.', ok: true });
      await loadTeams();
    } catch (err) {
      setFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setBusy(false);
    }
  };

  const handleSendTeamChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !chatInput.trim() || !socket) return;
    socket.emit('chat:send', {
      channel: `team:${activeTeam.id}`,
      senderUid: character.userUid,
      senderName: character.name,
      senderVillage: character.village,
      message: chatInput.trim(),
    });
    setChatInput('');
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <section className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#22C55E]">
            <Users className="w-4 h-4" />
            <span>SISTEMA CANÔNICO DE ESQUADRÕES SHINOBI · FORMAÇÃO 1 SENSEI + 3 ALUNOS</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
            Equipes & Células Genin-Sensei
          </h1>
          <p className="text-xs text-[#A1A1AA] max-w-2xl">
            Cada esquadrão segue a estrutura tradicional da obra: <strong>1 Sensei</strong> (Tokubetsu Jonin, Jonin, Jounin Experiente, ANBU, Sannin ou Kage) liderando até{' '}
            <strong>3 Alunos</strong> (Estudante da Academia, Genin ou Chunin). Células completas liberam bônus de XP, Ryo e Ataque Coordenado em Missões em Equipe!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="px-3.5 py-2 rounded-lg bg-[#08080B] border border-[#24242E] text-xs font-mono">
            Sua Elegibilidade:{' '}
            <strong className="text-[#22C55E]">
              {isSenseiSelf ? 'Sensei (Slot 0)' : isStudentSelf ? 'Aluno (Slots 1–3)' : character.rank}
            </strong>
          </div>
          <button
            type="button"
            onClick={onOpenTeamMissions}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            <Swords className="w-4 h-4" />
            Ir para Missões em Equipe
          </button>
        </div>
      </section>

      {feedback && (
        <div
          className={`px-4 py-3 rounded-lg border text-xs ${
            feedback.ok
              ? 'bg-[#08120E] border-[#10B981] text-[#22C55E]'
              : 'bg-[#17090C] border-red-500/60 text-red-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Pending Invites */}
      {myInvites.length > 0 && (
        <section className="bg-[#0C0C10] border border-[#10B981] rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono font-bold text-[#22C55E] uppercase">
            Convites Pendentes ({myInvites.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myInvites.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 rounded-lg bg-[#08080B] border border-[#24242E] flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-bold text-[#F8FAFC]">{inv.name}</div>
                  <div className="text-xs text-[#A1A1AA]">
                    {inv.village} · Sensei: {inv.senseiName}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRespondInvite(inv.id, true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Aceitar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRespondInvite(inv.id, false)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#121218] border border-[#24242E] hover:border-red-500 text-xs text-red-300 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Active Squad 4-Slot Canonical Cell (7 cols) */}
        <section className="lg:col-span-7 space-y-5">
          {loading ? (
            <div className="p-8 bg-[#0C0C10] border border-[#24242E] rounded-xl text-center text-xs text-[#A1A1AA]">
              Carregando células shinobi...
            </div>
          ) : activeTeam ? (
            <div className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-5 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#24242E] pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#08080B] border border-[#10B981] text-[10px] font-mono font-bold text-[#22C55E]">
                      {activeTeam.village}
                    </span>
                    <span className="text-[11px] font-mono text-[#A1A1AA]">
                      {activeTeam.synergy.formationLabel}
                    </span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-[#F8FAFC]">
                    {activeTeam.name}
                  </h2>
                  <p className="text-xs text-[#A1A1AA] italic">"{activeTeam.motto}"</p>
                </div>

                {myTeams.length > 1 && (
                  <select
                    aria-label="Selecionar equipe ativa"
                    value={activeTeam.id}
                    onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                    className="bg-[#08080B] border border-[#24242E] rounded px-3 py-1.5 text-xs text-[#F4F4F6]"
                  >
                    {myTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Synergy Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs tabular-nums">
                <div className="p-3 rounded-lg bg-[#08080B] border border-[#24242E]">
                  <div className="text-[10px] text-[#8E8E9A] uppercase">Bônus XP</div>
                  <div className="text-sm font-bold text-[#22C55E]">+{activeTeam.synergy.xpBonusPct}%</div>
                </div>
                <div className="p-3 rounded-lg bg-[#08080B] border border-[#24242E]">
                  <div className="text-[10px] text-[#8E8E9A] uppercase">Bônus Ryo</div>
                  <div className="text-sm font-bold text-[#22C55E]">+{activeTeam.synergy.ryoBonusPct}%</div>
                </div>
                <div className="p-3 rounded-lg bg-[#08080B] border border-[#24242E]">
                  <div className="text-[10px] text-[#8E8E9A] uppercase">Combo Ataque</div>
                  <div className="text-sm font-bold text-amber-300">+{activeTeam.synergy.attackBonusPct}%</div>
                </div>
                <div className="p-3 rounded-lg bg-[#08080B] border border-[#24242E]">
                  <div className="text-[10px] text-[#8E8E9A] uppercase">Missões</div>
                  <div className="text-sm font-bold text-[#F8FAFC]">{activeTeam.missionsCompleted}</div>
                </div>
              </div>

              {/* 4-Slot Canonical Grid: Slot 0 = Sensei, Slots 1..3 = Alunos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#22C55E] font-semibold">
                    ESCALAÇÃO OFICIAL ({activeTeam.synergy.activeCount}/4 VAGAS ATIVAS)
                  </span>
                  {activeTeam.synergy.isCanonicalFullCell && (
                    <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      Formação Completa 1+3 Ativa
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((slotIdx) => {
                    const occupant = activeTeam.members.find((m) => m.slotIndex === slotIdx);
                    const isSenseiSlot = slotIdx === 0;
                    const canManage =
                      activeTeam.senseiUid === character.userUid ||
                      (occupant && occupant.characterId === character.id);

                    return (
                      <div
                        key={slotIdx}
                        data-testid={`team-slot-${slotIdx}`}
                        className={`rounded-lg p-3.5 border flex flex-col justify-between gap-3 ${
                          isSenseiSlot
                            ? 'bg-[#09120D] border-[#10B981]'
                            : occupant
                            ? 'bg-[#08080B] border-[#24242E]'
                            : 'bg-[#060608] border-dashed border-[#2A2A36]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                          <span
                            className={`font-bold inline-flex items-center gap-1 ${
                              isSenseiSlot ? 'text-[#22C55E]' : 'text-[#A1A1AA]'
                            }`}
                          >
                            {isSenseiSlot ? (
                              <>
                                <Crown className="w-3.5 h-3.5" />
                                Sensei Responsável (Slot 0)
                              </>
                            ) : (
                              <>
                                <Shield className="w-3 h-3" />
                                Aluno #{slotIdx} (Academia/Genin/Chunin)
                              </>
                            )}
                          </span>
                          {occupant && (
                            <span
                              className={
                                occupant.status === 'active'
                                  ? 'text-[#22C55E]'
                                  : 'text-amber-300'
                              }
                            >
                              {occupant.status === 'active' ? 'Ativo' : 'Convidado'}
                            </span>
                          )}
                        </div>

                        {occupant ? (
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <NinjaAvatar
                                src={occupant.characterAvatar}
                                alt={occupant.characterName}
                                sizeClass="w-11 h-11"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-[#F8FAFC] truncate">
                                  {occupant.characterName}
                                </div>
                                <div className="text-[11px] text-[#A1A1AA] truncate font-mono">
                                  {occupant.characterRank} · Nv.{occupant.level || 1} · {occupant.chakraNature || 'Neutro'}
                                </div>
                              </div>
                            </div>

                            {canManage && (
                              <button
                                type="button"
                                disabled={busy}
                                title={
                                  occupant.characterId === character.id
                                    ? 'Sair da equipe'
                                    : `Remover ${occupant.characterName}`
                                }
                                onClick={() => handleRemoveMember(activeTeam.id, occupant.characterId)}
                                className="p-1.5 rounded bg-[#121218] hover:border-red-500 border border-[#24242E] text-[#A1A1AA] hover:text-red-400 cursor-pointer shrink-0"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="py-2 text-xs text-[#71717A]">
                            {isSenseiSlot
                              ? 'Vaga reservada para 1 Tokubetsu Jonin, Jonin, ANBU, Sannin ou Kage.'
                              : 'Vaga aberta para Estudante da Academia, Genin ou Chunin.'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recruit Bar */}
              {activeTeam.members.length < 4 && (
                <div className="p-4 rounded-lg bg-[#08080B] border border-[#24242E] space-y-3">
                  <div className="text-xs font-semibold text-[#F8FAFC] flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-[#22C55E]" />
                    <span>Recrutar Shinobi Elegível para a Equipe</span>
                  </div>

                  {recruitCandidates.length === 0 ? (
                    <p className="text-xs text-[#8E8E9A]">
                      Nenhum shinobi elegível disponível fora da equipe neste momento.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          aria-label="Selecionar shinobi para recrutar"
                          value={selectedNinjaId}
                          onChange={(e) => setSelectedNinjaId(e.target.value)}
                          className="flex-1 bg-[#050505] border border-[#24242E] rounded px-3 py-2 text-xs text-[#F8FAFC]"
                        >
                          <option value="">Selecione um Sensei ou Aluno elegível...</option>
                          {recruitCandidates.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.name} — {n.rank} (Nv.{n.level} · {n.village} · {n.specialization})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={busy || !selectedNinjaId}
                          onClick={() => handleRecruitMember()}
                          className="px-4 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-45 text-[#050505] text-xs font-bold cursor-pointer whitespace-nowrap"
                        >
                          Recrutar para Vaga
                        </button>
                      </div>

                      {/* Quick 1-click roster cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {recruitCandidates.slice(0, 4).map((n) => (
                          <div
                            key={n.id}
                            className="p-2.5 rounded bg-[#050505] border border-[#1E1E26] flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <NinjaAvatar src={n.avatarUrl} alt={n.name} sizeClass="w-8 h-8" />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-[#F8FAFC] truncate">
                                  {n.name}
                                </div>
                                <div className="text-[10px] text-[#8E8E9A] truncate font-mono">
                                  {n.rank} · {n.specialization}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleRecruitMember(n.id)}
                              className="px-2.5 py-1 rounded bg-[#121218] hover:bg-[#10B981] hover:text-[#050505] border border-[#10B981] text-[11px] font-semibold text-[#22C55E] cursor-pointer shrink-0"
                            >
                              + Adicionar
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Live Team Chat */}
              <div className="p-4 rounded-lg bg-[#08080B] border border-[#24242E] space-y-3">
                <div className="text-xs font-semibold text-[#22C55E]">
                  Rádio Tático da Equipe ({activeTeam.name})
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {teamChat.length === 0 ? (
                    <p className="text-[11px] text-[#8E8E9A]">
                      Combine estratégias, posições e curas antes de lançar uma Missão em Equipe.
                    </p>
                  ) : (
                    teamChat.map((m) => (
                      <div key={m.id} className="text-xs bg-[#050505] border border-[#1E1E26] rounded px-3 py-2">
                        <span className="font-semibold text-[#22C55E]">{m.senderName}: </span>
                        <span className="text-[#E4E4EA]">{m.message}</span>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendTeamChat} className="flex gap-2">
                  <input
                    type="text"
                    aria-label="Mensagem para a equipe"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Enviar ordem ou mensagem tática ao time..."
                    className="flex-1 bg-[#050505] border border-[#24242E] focus:border-[#10B981] focus:outline-none rounded px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#F8FAFC]">
                Você ainda não integra nenhuma Equipe Shinobi
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Fundar sua própria célula posicionará você automaticamente como{' '}
                <strong className="text-[#22C55E]">
                  {isSenseiSelf ? 'Sensei (Slot 0)' : 'Aluno #1 (Slot 1)'}
                </strong>
                , ou você pode ingressar diretamente em uma das equipes abertas listadas ao lado.
              </p>
            </div>
          )}
        </section>

        {/* Right: Create Squad Form & Open World Squads (5 cols) */}
        <aside className="lg:col-span-5 space-y-5">
          <form
            onSubmit={handleCreateTeam}
            className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-5 space-y-3.5"
          >
            <div className="border-b border-[#24242E] pb-2.5">
              <h2 className="font-display text-base font-bold text-[#F8FAFC]">
                Fundar Nova Célula (1 Sensei + 3 Alunos)
              </h2>
              <p className="text-[11px] text-[#8E8E9A]">
                Seu posto inicial será definido pela patente ({character.rank}).
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="team-name-input" className="text-xs font-medium text-[#D4D4D8]">
                Nome da Equipe
              </label>
              <input
                id="team-name-input"
                type="text"
                required
                minLength={3}
                maxLength={60}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Ex: Time 07 de Konoha"
                className="w-full px-3 py-2 rounded bg-[#08080B] border border-[#24242E] focus:border-[#10B981] focus:outline-none text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="team-motto-input" className="text-xs font-medium text-[#D4D4D8]">
                Lema do Esquadrão
              </label>
              <input
                id="team-motto-input"
                type="text"
                maxLength={120}
                value={teamMotto}
                onChange={(e) => setTeamMotto(e.target.value)}
                placeholder="Ex: Quem abandona os companheiros é pior que escória."
                className="w-full px-3 py-2 rounded bg-[#08080B] border border-[#24242E] focus:border-[#10B981] focus:outline-none text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={busy || (!isSenseiSelf && !isStudentSelf)}
              className="w-full py-2.5 rounded-md bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-45 text-[#050505] text-xs font-bold cursor-pointer"
            >
              Criar Equipe ({isSenseiSelf ? 'Assumir como Sensei' : 'Assumir como Aluno'})
            </button>
          </form>

          {/* All Registered Squads */}
          <div className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#24242E] pb-2.5">
              <h3 className="font-display text-base font-bold text-[#F8FAFC]">
                Equipes Registradas ({teams.length})
              </h3>
            </div>

            {teams.length === 0 ? (
              <p className="text-xs text-[#8E8E9A]">
                Nenhuma equipe criada ainda. Seja o primeiro a formar uma célula 1+3!
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {teams.map((t) => {
                  const isMine = t.members.some(
                    (m) => m.characterId === character.id && m.status === 'active'
                  );
                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-lg border space-y-2 ${
                        isMine
                          ? 'bg-[#09120D] border-[#10B981]'
                          : 'bg-[#08080B] border-[#24242E]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-[#F8FAFC]">{t.name}</div>
                          <div className="text-[11px] text-[#A1A1AA]">
                            {t.village} · Sensei: {t.senseiName} · {t.synergy.activeCount}/4 Membros
                          </div>
                        </div>
                        {isMine ? (
                          <button
                            type="button"
                            onClick={() => setSelectedTeamId(t.id)}
                            className="px-2.5 py-1 rounded bg-[#10B981] text-[#050505] text-[11px] font-bold cursor-pointer"
                          >
                            Selecionada
                          </button>
                        ) : (
                          t.members.length < 4 && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleJoinOpenTeam(t.id)}
                              className="px-2.5 py-1 rounded bg-[#121218] hover:bg-[#10B981] hover:text-[#050505] border border-[#10B981] text-[11px] font-semibold text-[#22C55E] cursor-pointer"
                            >
                              Ingressar
                            </button>
                          )
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {t.members.map((m) => (
                          <span
                            key={m.id}
                            className="px-2 py-0.5 rounded bg-[#050505] border border-[#24242E] text-[10px] font-mono text-[#E4E4EA]"
                          >
                            {m.role === 'sensei' ? 'Sensei' : `A${m.slotIndex}`}: {m.characterName}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {onChallengePvp && availableNinjas.length > 0 && (
            <div className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-5 space-y-2.5">
              <h3 className="font-display text-sm font-bold text-[#F8FAFC]">
                Treino PvP Rápido contra Membros
              </h3>
              <div className="space-y-1.5">
                {availableNinjas
                  .filter((n) => n.id !== character.id)
                  .slice(0, 3)
                  .map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between gap-2 text-xs bg-[#08080B] border border-[#1E1E26] rounded px-3 py-2"
                    >
                      <span className="truncate text-[#F4F4F6]">
                        {n.name} <span className="text-[#8E8E9A]">({n.rank})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onChallengePvp(n.id)}
                        className="px-2.5 py-1 rounded bg-[#121218] hover:bg-[#10B981] hover:text-[#050505] border border-[#10B981] text-[11px] font-semibold text-[#22C55E] cursor-pointer shrink-0"
                      >
                        Desafiar PvP
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
