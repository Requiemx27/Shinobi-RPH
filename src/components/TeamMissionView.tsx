import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Socket } from 'socket.io-client';
import {
  CheckCircle2,
  Crown,
  Eye,
  Flame,
  Footprints,
  HeartPulse,
  Shield,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import {
  calculateClanBonuses,
  canActivateSharinganInCombat,
  canMoveToTile,
  CharacterModel,
  formatElementalLabel,
  getEffectiveJutsuChakraCost,
  getJutsuGridRange,
  getSharinganCombatConfig,
  getSharinganStageNumber,
  GridCoord,
  manhattanDistance,
  MELEE_STRIKES,
} from '../game/engine.ts';
import { getJutsuImage, JUTSU_CATALOG, JutsuDef } from '../game/narutoData.ts';
import {
  ScaledTeamMission,
  ShinobiTeamRecord,
  TeamMissionActionPayload,
  TeamMissionBattleState,
} from '../game/teamPvpEngine.ts';
import { apiFetch } from '../utils/api.ts';
import { shinobiAudio } from '../game/sound.ts';
import { BattleLogEntry, BattleLogPanel } from './BattleLogPanel.tsx';
import { NinjaAvatar } from './NinjaAvatar.tsx';

interface TeamMissionRow {
  id: number;
  teamId: number;
  missionId: string;
  missionTitle: string;
  rank: string;
  status: 'active' | 'won' | 'lost';
  turnNumber: number;
  activeSlotIndex: number;
  won: boolean | null;
  state: TeamMissionBattleState;
}

interface TeamMissionViewProps {
  character: CharacterModel;
  customJutsus?: JutsuDef[];
  socket?: Socket | null;
  onOpenTeamsTab?: () => void;
  onMissionSettled?: () => Promise<void>;
}

export const TeamMissionView: React.FC<TeamMissionViewProps> = ({
  character,
  customJutsus = [],
  socket = null,
  onOpenTeamsTab,
  onMissionSettled,
}) => {
  const [catalog, setCatalog] = useState<ScaledTeamMission[]>([]);
  const [myTeams, setMyTeams] = useState<ShinobiTeamRecord[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [runs, setRuns] = useState<TeamMissionRow[]>([]);
  const [activeRun, setActiveRun] = useState<TeamMissionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionTab, setActionTab] = useState<'jutsus' | 'heal' | 'melee'>('jutsus');
  const [settlement, setSettlement] = useState<Array<{
    characterId: number;
    name: string;
    xp: number;
    ryo: number;
    merit: number;
    lootDrops?: Array<{ itemId: string; name: string; rarity: string; qty: number }>;
  }> | null>(null);

  const allJutsus = useMemo(() => [...JUTSU_CATALOG, ...customJutsus], [customJutsus]);

  const loadCatalogAndRuns = useCallback(async () => {
    try {
      const res = await apiFetch<{
        catalog: ScaledTeamMission[];
        myTeams: ShinobiTeamRecord[];
        activeTeam: ShinobiTeamRecord | null;
        runs: TeamMissionRow[];
      }>('/api/team-missions/catalog');
      setCatalog(res.catalog || []);
      setMyTeams(res.myTeams || []);
      setRuns(res.runs || []);
      setSelectedTeamId((prev) => prev || res.activeTeam?.id || res.myTeams?.[0]?.id || null);

      const running = (res.runs || []).find((r) => r.status === 'active');
      if (running) {
        setActiveRun(running);
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogAndRuns();
  }, [loadCatalogAndRuns]);

  const selectedTeam = useMemo(
    () => myTeams.find((t) => t.id === selectedTeamId) || myTeams[0] || null,
    [myTeams, selectedTeamId]
  );

  useEffect(() => {
    if (!socket || !selectedTeam) return;
    socket.emit('team:join', selectedTeam.id);
    const onMissionUpdate = (updatedRun: TeamMissionRow) => {
      if (updatedRun.teamId === selectedTeam.id) {
        setActiveRun(updatedRun);
        if (updatedRun.status !== 'active' && onMissionSettled) {
          onMissionSettled();
        }
      }
    };
    socket.on('team:mission_updated', onMissionUpdate);
    return () => {
      socket.off('team:mission_updated', onMissionUpdate);
    };
  }, [socket, selectedTeam, onMissionSettled]);

  const handleStartMission = async (missionId: string) => {
    if (!selectedTeam) return;
    setBusy(true);
    setErrorMsg(null);
    setSettlement(null);
    try {
      shinobiAudio.playUiClick();
      const res = await apiFetch<{ run: TeamMissionRow }>('/api/team-missions/start', {
        method: 'POST',
        body: JSON.stringify({ teamId: selectedTeam.id, missionId }),
      });
      setActiveRun(res.run);
      await loadCatalogAndRuns();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSendAction = async (action: TeamMissionActionPayload) => {
    if (!activeRun || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      shinobiAudio.playUiClick();
      const res = await apiFetch<{
        run: TeamMissionRow;
        settlementSummary: typeof settlement;
      }>(`/api/team-missions/${activeRun.id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setActiveRun(res.run);
      if (res.settlementSummary) {
        setSettlement(res.settlementSummary);
      }
      if (res.run.status !== 'active' && onMissionSettled) {
        await onMissionSettled();
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-[#0C0C10] border border-[#24242E] rounded-xl text-center text-xs text-[#8E8E9A]">
        Carregando Missões em Equipe...
      </div>
    );
  }

  if (!selectedTeam && !activeRun) {
    return (
      <div className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-8 text-center space-y-4">
        <Users className="w-8 h-8 text-[#22C55E] mx-auto" />
        <div className="space-y-1">
          <h2 className="font-display text-lg font-bold text-[#F8FAFC]">
            Nenhuma Equipe Ativa Encontrada
          </h2>
          <p className="text-xs text-[#A1A1AA] max-w-lg mx-auto">
            As Missões em Equipe reúnem até <strong>1 Sensei + 3 Alunos</strong> no mesmo grid tático contra chefes de alto nível. Crie ou entre em uma equipe na aba Equipes para começar!
          </p>
        </div>
        {onOpenTeamsTab && (
          <button
            type="button"
            onClick={onOpenTeamsTab}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer"
          >
            <Users className="w-4 h-4" />
            Ir para Equipes (1 Sensei + 3 Alunos)
          </button>
        )}
      </div>
    );
  }

  // Active Co-op Battle View
  if (activeRun) {
    const st = activeRun.state;
    const activeFighter = st.squad.find((f) => f.slotIndex === st.activeSlotIndex) || st.squad[0];
    const canCommandSlot =
      st.status === 'active' &&
      Boolean(
        activeFighter &&
          (activeFighter.userUid === character.userUid || activeFighter.userUid.startsWith('npc:'))
      );

    const occupiedSet = new Set<string>([
      `${st.boss.pos.x},${st.boss.pos.y}`,
      ...st.squad
        .filter((f) => f.hp > 0 && f.slotIndex !== activeFighter?.slotIndex)
        .map((f) => `${f.pos.x},${f.pos.y}`),
    ]);

    const distToBoss = activeFighter ? manhattanDistance(activeFighter.pos, st.boss.pos) : 99;
    const fighterJutsus = activeFighter
      ? activeFighter.learnedJutsus
          .map((id) => allJutsus.find((j) => j.id === id))
          .filter((j): j is JutsuDef => Boolean(j))
      : [];

    const sharinganStage = activeFighter
      ? getSharinganStageNumber(activeFighter.kekkeiGenkai, activeFighter.clan)
      : 0;
    const sharinganCfg = getSharinganCombatConfig(sharinganStage);
    const sharinganCheck = activeFighter
      ? canActivateSharinganInCombat(
          {
            clan: activeFighter.clan,
            kekkeiGenkai: activeFighter.kekkeiGenkai,
            leftEyeBlindness: activeFighter.leftEyeBlindness,
            rightEyeBlindness: activeFighter.rightEyeBlindness,
          },
          activeFighter.chakra
        )
      : null;

    return (
      <div className="space-y-5">
        {/* Header Bar */}
        <div className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24242E] pb-3">
            <div>
              <div className="text-xs font-mono text-[#22C55E] tabular-nums">
                Missão em Equipe · {st.teamName} · Round {st.roundNumber} · Turno {st.turnNumber} · Rank{' '}
                {st.mission.rank}
              </div>
              <h2 className="font-display text-xl font-bold text-[#F8FAFC]">{st.mission.title}</h2>
            </div>

            <div className="flex items-center gap-2">
              {st.status !== 'active' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveRun(null);
                    setSettlement(null);
                    loadCatalogAndRuns();
                  }}
                  className="px-4 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer"
                >
                  Voltar ao Quadro da Equipe
                </button>
              )}
              {st.status === 'active' && (
                <button
                  type="button"
                  onClick={() => setActiveRun(null)}
                  className="px-3.5 py-1.5 rounded bg-[#08080B] border border-[#24242E] hover:border-[#10B981] text-xs text-[#E4E4EA] cursor-pointer"
                >
                  Minimizar Arena
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="px-3.5 py-2.5 rounded bg-red-950/40 border border-red-500/50 text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          {/* Boss Status Card */}
          <div className="p-4 rounded-lg bg-[#08080B] border border-red-500/45 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-red-300">{st.boss.name}</div>
                <div className="text-[11px] text-[#A1A1AA]">
                  {st.boss.title} · {st.boss.village} · Natureza {formatElementalLabel(st.boss.nature)}
                </div>
              </div>
              <div className="text-xs font-mono font-bold tabular-nums text-red-400">
                HP {st.boss.hp}/{st.boss.maxHp}
              </div>
            </div>
            <div className="h-2 rounded-full bg-[#15151D] overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.round((st.boss.hp / st.boss.maxHp) * 100))}%` }}
              />
            </div>
          </div>

          {/* Squad Formation Strip (1 Sensei + 3 Alunos) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {st.squad.map((m) => {
              const isTurn = st.status === 'active' && m.slotIndex === st.activeSlotIndex;
              const isDown = m.hp <= 0;
              return (
                <div
                  key={m.characterId}
                  className={`p-3 rounded-lg border space-y-2 transition-colors ${
                    isDown
                      ? 'bg-[#08080B] border-red-500/35 opacity-60'
                      : isTurn
                      ? 'bg-[#09140E] border-[#22C55E]'
                      : 'bg-[#08080B] border-[#24242E]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <NinjaAvatar src={m.avatarUrl} alt={m.name} sizeClass="w-9 h-9" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                        <span className={m.role === 'sensei' ? 'text-[#22C55E] font-bold' : 'text-[#A1A1AA]'}>
                          {m.role === 'sensei' ? 'SENSEI' : `ALUNO ${m.slotIndex}`}
                        </span>
                        {isTurn && <span className="text-[#22C55E] font-bold">TURNO ATIVO</span>}
                      </div>
                      <div className="text-xs font-bold text-[#F8FAFC] truncate">{m.name}</div>
                    </div>
                  </div>
                  <div className="space-y-1 text-[10px] font-mono tabular-nums">
                    <div className="flex justify-between text-[#E4E4EA]">
                      <span>HP {m.hp}/{m.maxHp}</span>
                      <span className="text-sky-300">CH {m.chakra}/{m.maxChakra}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#15151D] overflow-hidden">
                      <div
                        className="h-full bg-[#10B981]"
                        style={{ width: `${Math.max(0, Math.round((m.hp / m.maxHp) * 100))}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-[#8E8E9A] truncate" title={calculateClanBonuses(m.clan).summaryChips.join(' · ')}>
                      Clã {m.clan} · NIN {m.stats.ninjutsu} · TAI {m.stats.taijutsu} · Prec +{m.stats.accuracyBonus || 0}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Victory / Defeat Summary Banner */}
        {st.status !== 'active' && (
          <div
            className={`rounded-xl p-5 border space-y-3 ${
              st.status === 'won'
                ? 'bg-[#09140E] border-[#10B981]'
                : 'bg-[#17090C] border-red-500/50'
            }`}
          >
            <div className="flex items-center gap-2 text-base font-display font-bold text-[#F8FAFC]">
              <CheckCircle2
                className={`w-5 h-5 ${st.status === 'won' ? 'text-[#22C55E]' : 'text-red-400'}`}
              />
              <span>
                {st.status === 'won'
                  ? `Vitória do Esquadrão! ${st.boss.name} foi derrotado!`
                  : `Derrota Tática — ${st.boss.name} superou a célula.`}
              </span>
            </div>
            {settlement && settlement.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {settlement.map((s) => (
                  <div
                    key={s.characterId}
                    className="p-3 rounded bg-[#050505] border border-[#24242E] space-y-1"
                  >
                    <div className="font-bold text-[#F8FAFC]">{s.name}</div>
                    <div className="text-[#22C55E]">
                      +{s.xp} XP · +{s.ryo} Ryo · +{s.merit} Mérito
                    </div>
                    {s.lootDrops && s.lootDrops.length > 0 && (
                      <div className="text-[11px] text-amber-300">
                        Itens: {s.lootDrops.map((d) => `${d.qty}x ${d.name} (${d.rarity})`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Tactical Grid + Battle Log Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 7 Cols: Grid + Squad Turn Controls */}
          <div className="lg:col-span-7 space-y-4">
            {/* 7x5 Tactical Grid */}
            <section className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-semibold text-[#F4F4F6]">
                  Grid Tático Co-op 7×5 · Vez de{' '}
                  <strong className="text-[#22C55E]">{activeFighter?.name}</strong>
                </div>
                <div className="font-mono tabular-nums text-[11px] text-[#A1A1AA]">
                  Distância ao Chefe: <strong className="text-[#22C55E]">{distToBoss}</strong> casa(s) ·
                  Passo restante: {activeFighter?.moveRemaining ?? 0}
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 5 }).map((_, y) =>
                  Array.from({ length: 7 }).map((__, x) => {
                    const coord: GridCoord = { x, y };
                    const occupantSquad = st.squad.find(
                      (f) => f.hp > 0 && f.pos.x === x && f.pos.y === y
                    );
                    const isBoss = st.boss.pos.x === x && st.boss.pos.y === y;
                    const terrain = st.grid.terrain[y]?.[x] || 'ground';
                    const isOccupied = occupiedSet.has(`${x},${y}`);
                    const canMove =
                      canCommandSlot &&
                      !busy &&
                      Boolean(activeFighter) &&
                      !isOccupied &&
                      !(activeFighter.pos.x === x && activeFighter.pos.y === y) &&
                      canMoveToTile(st.grid, activeFighter.pos, coord, activeFighter.moveRemaining);

                    return (
                      <button
                        key={`${x}-${y}`}
                        type="button"
                        disabled={!canMove}
                        onClick={() => handleSendAction({ type: 'move', to: coord })}
                        className={`min-h-[54px] rounded border p-1 flex flex-col items-center justify-between text-[10px] font-mono transition-colors ${
                          isBoss
                            ? 'bg-red-950/60 border-red-500 text-red-200'
                            : occupantSquad
                            ? occupantSquad.slotIndex === st.activeSlotIndex
                              ? 'bg-[#0C261A] border-[#22C55E] text-[#22C55E] font-bold'
                              : 'bg-[#091310] border-[#10B981]/60 text-[#E4E4EA]'
                            : terrain === 'rock'
                            ? 'bg-[#181820] border-[#2C2C38] text-[#71717A]'
                            : canMove
                            ? 'bg-[#08130E] border-[#10B981]/50 hover:border-[#22C55E] text-[#22C55E] cursor-pointer'
                            : 'bg-[#070709] border-[#1C1C24] text-[#52525B]'
                        }`}
                      >
                        <span className="self-start text-[9px] opacity-60">
                          {String.fromCharCode(65 + x)}
                          {y + 1}
                        </span>
                        {isBoss ? (
                          <span className="font-bold text-red-400">CHEFE</span>
                        ) : occupantSquad ? (
                          <span className="truncate max-w-full font-bold">
                            {occupantSquad.role === 'sensei' ? 'SNS' : `AL${occupantSquad.slotIndex}`}
                          </span>
                        ) : canMove ? (
                          <Footprints className="w-3 h-3" />
                        ) : terrain === 'rock' ? (
                          <span>Rocha</span>
                        ) : (
                          <span>·</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            {/* Action Panel */}
            {st.status === 'active' && activeFighter && (
              <section className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'jutsus' as const, label: `Jutsus (${fighterJutsus.length})` },
                      { id: 'heal' as const, label: 'Curar Aliado (Verde) & Apoio' },
                      { id: 'melee' as const, label: 'Taijutsu & Guarda' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActionTab(t.id)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                          actionTab === t.id
                            ? 'bg-[#10B981] text-[#050505]'
                            : 'bg-[#08080B] border border-[#24242E] text-[#A1A1AA] hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {sharinganStage >= 1 && (
                      <button
                        type="button"
                        disabled={!canCommandSlot || busy || (!activeFighter.sharinganActive && !sharinganCheck?.allowed)}
                        onClick={() => handleSendAction({ type: 'toggle_sharingan' })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#08080B] border border-[#10B981] text-xs font-semibold text-[#22C55E] cursor-pointer disabled:opacity-45"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {activeFighter.sharinganActive
                          ? `Desativar ${sharinganCfg.shortTitle}`
                          : `Ativar ${sharinganCfg.shortTitle}`}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!canCommandSlot || busy || st.comboCooldown > 0}
                      onClick={() => handleSendAction({ type: 'team_combo' })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 disabled:opacity-45 text-[#050505] text-xs font-bold cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {st.comboCooldown > 0
                        ? `Formação Sincronizada (${st.comboCooldown}r)`
                        : 'Formação Sincronizada (-28 CH)'}
                    </button>
                  </div>
                </div>

                {!canCommandSlot && (
                  <div className="p-3 rounded bg-[#08080B] border border-amber-500/40 text-xs text-amber-200">
                    Turno de <strong>{activeFighter.name}</strong>. Aguardando comando do jogador responsável em tempo real.
                  </div>
                )}

                {actionTab === 'jutsus' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {fighterJutsus.map((j) => {
                      const cost = getEffectiveJutsuChakraCost(j, activeFighter.stats);
                      const range = getJutsuGridRange(j);
                      const inRange = distToBoss >= range.minRange && distToBoss <= range.maxRange;
                      const enoughCh = activeFighter.chakra >= cost;
                      const img = getJutsuImage(j);

                      return (
                        <button
                          key={j.id}
                          type="button"
                          disabled={!canCommandSlot || busy || !inRange || !enoughCh}
                          onClick={() => handleSendAction({ type: 'jutsu', jutsuId: j.id })}
                          className="p-3 rounded-lg bg-[#08080B] hover:border-[#10B981] border border-[#24242E] disabled:opacity-45 text-left flex items-center gap-3 cursor-pointer transition-colors"
                        >
                          {img ? (
                            <img
                              src={img}
                              alt={j.name}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 rounded object-cover border border-[#24242E] shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded bg-[#121218] border border-[#24242E] flex items-center justify-center shrink-0">
                              <Flame className="w-4 h-4 text-[#22C55E]" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-[#F8FAFC] truncate">{j.name}</div>
                            <div className="text-[10px] font-mono text-[#A1A1AA]">
                              {j.nature} · Poder {j.basePower} · -{cost} CH · Alc. {range.minRange}–{range.maxRange}
                            </div>
                            {!inRange && (
                              <div className="text-[10px] text-amber-300 font-mono">
                                Fora de alcance (dist. {distToBoss})
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {actionTab === 'heal' && (
                  <div className="space-y-3">
                    <div className="text-xs text-emerald-300 flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-emerald-400" />
                      <span>
                        Selecione um integrante para aplicar <strong>Cura em Equipe (-22 CH)</strong> (exibida em Verde no Battle Log e remove queimaduras/sangramentos):
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {st.squad
                        .filter((m) => m.hp > 0)
                        .map((target) => (
                          <button
                            key={target.characterId}
                            type="button"
                            disabled={!canCommandSlot || busy || activeFighter.chakra < 22}
                            onClick={() =>
                              handleSendAction({
                                type: 'heal_ally',
                                targetSlotIndex: target.slotIndex,
                              })
                            }
                            className="p-3 rounded-lg bg-emerald-950/25 hover:bg-emerald-950/45 border border-emerald-500/45 disabled:opacity-45 text-left flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div>
                              <div className="text-xs font-bold text-emerald-300">
                                Curar {target.name}
                              </div>
                              <div className="text-[10px] font-mono text-[#D4D4DC]">
                                {target.role === 'sensei' ? 'Sensei' : `Aluno ${target.slotIndex}`} · HP{' '}
                                {target.hp}/{target.maxHp}
                              </div>
                            </div>
                            <HeartPulse className="w-4 h-4 text-emerald-400 shrink-0" />
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {actionTab === 'melee' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {MELEE_STRIKES.map((s) => {
                        const inRange = distToBoss >= s.minRange && distToBoss <= s.maxRange;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={!canCommandSlot || busy || !inRange || activeFighter.chakra < s.chakraCost}
                            onClick={() => handleSendAction({ type: 'melee', strikeId: s.id })}
                            className="p-3 rounded-lg bg-[#08080B] hover:border-[#10B981] border border-[#24242E] disabled:opacity-45 text-left cursor-pointer"
                          >
                            <div className="text-xs font-bold text-[#F8FAFC]">{s.name}</div>
                            <div className="text-[10px] font-mono text-[#A1A1AA]">
                              Poder {s.basePower} · -{s.chakraCost} CH · Alc. {s.maxRange}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={!canCommandSlot || busy}
                      onClick={() => handleSendAction({ type: 'defend' })}
                      className="w-full py-2.5 rounded-lg bg-[#08080B] hover:border-[#10B981] border border-[#10B981]/60 text-xs font-bold text-[#22C55E] inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Shield className="w-4 h-4" />
                      Postura Defensiva Coordenada (+16 CH · -30% Dano)
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right 5 Cols: Color-Coded Battle Log (Red Damage / Green Healing) */}
          <div className="lg:col-span-5">
            <BattleLogPanel
              entries={st.logs as BattleLogEntry[]}
              currentTurn={st.turnNumber}
              title="Battle Log da Equipe"
            />
          </div>
        </div>
      </div>
    );
  }

  // Team Missions Catalog View
  return (
    <div className="space-y-5">
      <div className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#22C55E]">
            <Crown className="w-4 h-4" />
            <span>
              EQUIPE ATIVA: {selectedTeam?.name} · {selectedTeam?.synergy.formationLabel}
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Bônus ativos da célula: +{selectedTeam?.synergy.xpBonusPct || 0}% XP · +
            {selectedTeam?.synergy.ryoBonusPct || 0}% Ryo · +
            {selectedTeam?.synergy.attackBonusPct || 0}% Ataque Sincronizado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {myTeams.length > 1 && (
            <select
              aria-label="Escolher equipe para missão"
              value={selectedTeam?.id || ''}
              onChange={(e) => setSelectedTeamId(Number(e.target.value))}
              className="bg-[#08080B] border border-[#24242E] rounded px-3 py-2 text-xs text-[#F8FAFC]"
            >
              {myTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          {onOpenTeamsTab && (
            <button
              type="button"
              onClick={onOpenTeamsTab}
              className="px-3.5 py-2 rounded bg-[#08080B] border border-[#24242E] hover:border-[#10B981] text-xs font-semibold text-[#F8FAFC] cursor-pointer"
            >
              Gerenciar Escalação (1+3)
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="px-4 py-3 rounded bg-red-950/40 border border-red-500/50 text-xs text-red-200">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {catalog.map((m) => (
          <article
            key={m.id}
            className="bg-[#0C0C10] border border-[#24242E] hover:border-[#10B981] rounded-xl p-5 flex flex-col justify-between gap-4 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-[#08080B] border border-[#10B981] text-[#22C55E] font-bold">
                  Rank {m.rank} · Co-op
                </span>
                <span className="text-red-400 font-semibold">
                  Chefe HP {m.scaledHp} · {formatElementalLabel(m.bossNature)}
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-[#F8FAFC]">{m.title}</h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">{m.briefing}</p>
              <div className="text-[11px] font-mono text-[#D4D4DC]">
                Alvo: <strong>{m.bossName}</strong> ({m.bossVillage})
              </div>
            </div>

            <div className="pt-3 border-t border-[#24242E] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-mono tabular-nums text-[#22C55E]">
                +{m.rewardXp} XP · +{m.rewardRyo} Ryo · +{m.rewardMerit} Mérito
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleStartMission(m.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-45 text-[#050505] text-xs font-bold cursor-pointer"
              >
                <Swords className="w-3.5 h-3.5" />
                Iniciar Missão em Equipe (-{m.staminaCostPerMember} STA)
              </button>
            </div>
          </article>
        ))}
      </div>

      {runs.length > 0 && (
        <div className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-[#F8FAFC]">
            Operações Recentes da Equipe
          </h3>
          <div className="space-y-2">
            {runs.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="p-3 rounded bg-[#08080B] border border-[#24242E] flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-semibold text-[#F8FAFC]">{r.missionTitle}</span>
                  <span className="text-[#8E8E9A] ml-2 font-mono">
                    Rank {r.rank} · T{r.turnNumber} ·{' '}
                    {r.status === 'active'
                      ? 'Em Andamento'
                      : r.won
                      ? 'Vitória'
                      : 'Derrota'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRun(r)}
                  className="px-3 py-1 rounded bg-[#121218] border border-[#10B981] text-[#22C55E] font-semibold cursor-pointer"
                >
                  {r.status === 'active' ? 'Retomar Combate' : 'Ver Battle Log'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
