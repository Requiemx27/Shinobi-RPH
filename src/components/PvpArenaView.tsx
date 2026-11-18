import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Socket } from 'socket.io-client';
import {
  CheckCircle2,
  Coins,
  Eye,
  Flag,
  Flame,
  Footprints,
  HeartPulse,
  Shield,
  Swords,
  Trophy,
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
import {
  EQUIPPED_WEAPON_PROFILES,
  getJutsuImage,
  ITEM_CATALOG,
  JUTSU_CATALOG,
  JutsuDef,
  STANDARD_NINJA_TOOLS,
} from '../game/narutoData.ts';
import { PvpActionPayload, PvpBattleState } from '../game/teamPvpEngine.ts';
import { apiFetch } from '../utils/api.ts';
import { shinobiAudio } from '../game/sound.ts';
import { BattleLogEntry, BattleLogPanel } from './BattleLogPanel.tsx';
import { NinjaAvatar } from './NinjaAvatar.tsx';

interface PvpOpponentOption {
  id: number;
  userUid: string;
  name: string;
  avatarUrl: string;
  rank: string;
  village: string;
  level: number;
  chakraNature: string;
  clan: string;
  meritPoints: number;
  isNpc: boolean;
}

interface PvpDuelRow {
  id: number;
  mode: 'live_pvp' | 'ranked_spar';
  status: 'waiting' | 'active' | 'finished';
  village: string;
  wagerRyo: number;
  challengerUid: string;
  challengerCharId: number;
  challengerName: string;
  opponentUid: string | null;
  opponentCharId: number | null;
  opponentName: string | null;
  currentTurnUid: string;
  turnNumber: number;
  winnerUid: string | null;
  winnerName: string | null;
  state: PvpBattleState;
}

interface PvpArenaViewProps {
  character: CharacterModel;
  customJutsus?: JutsuDef[];
  socket?: Socket | null;
  initialOpponentId?: number | null;
  onPvpFinished?: () => Promise<void>;
}

export const PvpArenaView: React.FC<PvpArenaViewProps> = ({
  character,
  customJutsus = [],
  socket = null,
  initialOpponentId = null,
  onPvpFinished,
}) => {
  const [duels, setDuels] = useState<PvpDuelRow[]>([]);
  const [opponents, setOpponents] = useState<PvpOpponentOption[]>([]);
  const [activeDuel, setActiveDuel] = useState<PvpDuelRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Challenge builder
  const [challengeMode, setChallengeMode] = useState<'ranked_spar' | 'live_pvp'>('ranked_spar');
  const [targetCharId, setTargetCharId] = useState<string>(
    initialOpponentId ? String(initialOpponentId) : ''
  );
  const [wagerRyo, setWagerRyo] = useState<number>(150);

  // Duel combat controls
  const [actionTab, setActionTab] = useState<'jutsus' | 'melee' | 'weapons' | 'items'>('jutsus');
  const [infusionElement, setInfusionElement] = useState<string>('none');

  const allJutsus = useMemo(() => [...JUTSU_CATALOG, ...customJutsus], [customJutsus]);

  useEffect(() => {
    if (initialOpponentId) {
      setTargetCharId(String(initialOpponentId));
    }
  }, [initialOpponentId]);

  const loadPvpList = useCallback(async () => {
    try {
      const res = await apiFetch<{ duels: PvpDuelRow[]; opponents: PvpOpponentOption[] }>(
        '/api/pvp/list'
      );
      setDuels(res.duels || []);
      setOpponents(res.opponents || []);
      setTargetCharId((prev) => prev || String(res.opponents?.[0]?.id || ''));
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPvpList();
  }, [loadPvpList]);

  useEffect(() => {
    if (!socket) return;
    const onListUpdated = () => loadPvpList();
    socket.on('pvp:list_updated', onListUpdated);
    return () => {
      socket.off('pvp:list_updated', onListUpdated);
    };
  }, [socket, loadPvpList]);

  useEffect(() => {
    if (!socket || !activeDuel) return;
    socket.emit('pvp:join', activeDuel.id);
    const onDuelUpdated = (updated: PvpDuelRow) => {
      if (updated.id === activeDuel.id) {
        setActiveDuel(updated);
        if (updated.status === 'finished' && onPvpFinished) {
          onPvpFinished();
        }
      }
    };
    socket.on('pvp:updated', onDuelUpdated);
    return () => {
      socket.off('pvp:updated', onDuelUpdated);
    };
  }, [socket, activeDuel, onPvpFinished]);

  const handleCreateChallenge = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      shinobiAudio.playUiClick();
      const res = await apiFetch<{ duel: PvpDuelRow }>('/api/pvp/challenge', {
        method: 'POST',
        body: JSON.stringify({
          mode: challengeMode,
          targetCharacterId: targetCharId ? Number(targetCharId) : undefined,
          wagerRyo,
        }),
      });
      setActiveDuel(res.duel);
      await loadPvpList();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptDuel = async (duelId: number) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      shinobiAudio.playUiClick();
      const res = await apiFetch<{ duel: PvpDuelRow }>(`/api/pvp/${duelId}/accept`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setActiveDuel(res.duel);
      await loadPvpList();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDuelAction = async (action: PvpActionPayload) => {
    if (!activeDuel || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      shinobiAudio.playUiClick();
      const res = await apiFetch<{ duel: PvpDuelRow }>(`/api/pvp/${activeDuel.id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setActiveDuel(res.duel);
      if (res.duel.status === 'finished' && onPvpFinished) {
        await onPvpFinished();
      }
      await loadPvpList();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-[#0C0C10] border border-[#24242E] rounded-xl text-center text-xs text-[#8E8E9A]">
        Carregando Arena PvP 1v1...
      </div>
    );
  }

  // Active Duel Screen
  if (activeDuel) {
    const st = activeDuel.state;
    const mySide: 'challenger' | 'opponent' | null =
      st.challenger.userUid === character.userUid
        ? 'challenger'
        : st.opponent?.userUid === character.userUid
        ? 'opponent'
        : null;
    const isMyTurn =
      activeDuel.status === 'active' &&
      mySide !== null &&
      st.activeTurnSide === mySide &&
      !st.winnerSide;

    const selfFighter = mySide === 'opponent' && st.opponent ? st.opponent : st.challenger;
    const rivalFighter = mySide === 'opponent' ? st.challenger : st.opponent;

    const dist = rivalFighter ? manhattanDistance(selfFighter.pos, rivalFighter.pos) : 0;

    const fighterJutsus = selfFighter.learnedJutsus
      .map((id) => allJutsus.find((j) => j.id === id))
      .filter((j): j is JutsuDef => Boolean(j));

    const equippedWpId = selfFighter.baseCharacter?.equippedGear?.weapon;
    const customWp = equippedWpId ? EQUIPPED_WEAPON_PROFILES[equippedWpId] : undefined;
    const availableWeapons = customWp ? [customWp, ...STANDARD_NINJA_TOOLS] : STANDARD_NINJA_TOOLS;

    const availableConsumables = (selfFighter.consumables || [])
      .filter((slot) => slot.qty > 0)
      .map((slot) => ({
        slot,
        def: ITEM_CATALOG.find((i) => i.id === slot.itemId),
      }))
      .filter((x): x is { slot: { itemId: string; qty: number }; def: NonNullable<typeof x.def> } =>
        Boolean(x.def)
      );

    const shStage = getSharinganStageNumber(selfFighter.kekkeiGenkai, selfFighter.clan);
    const shCfg = getSharinganCombatConfig(shStage);
    const shCheck = canActivateSharinganInCombat(
      {
        clan: selfFighter.clan,
        kekkeiGenkai: selfFighter.kekkeiGenkai,
        leftEyeBlindness: selfFighter.leftEyeBlindness,
        rightEyeBlindness: selfFighter.rightEyeBlindness,
      },
      selfFighter.chakra
    );

    const mappedLogs: BattleLogEntry[] = (st.logs || []).map((log) => {
      if (log.actor === 'system' || !mySide) return log as BattleLogEntry;
      const isSelfLog = log.actorName === selfFighter.name;
      return {
        ...log,
        actor: isSelfLog ? 'player' : 'enemy',
      };
    });

    return (
      <div className="space-y-5">
        {/* Top Duel Header & Combatant Bars */}
        <div className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24242E] pb-3">
            <div>
              <div className="text-xs font-mono text-[#22C55E] tabular-nums">
                {activeDuel.mode === 'live_pvp' ? 'PvP Ao Vivo 1v1' : 'Duelo Rankeado 1v1'} · Arena{' '}
                {st.village} · Turno {st.turnNumber} · Aposta {st.wagerRyo} Ryo
              </div>
              <h2 className="font-display text-xl font-bold text-[#F8FAFC]">
                {st.challenger.name} vs {st.opponent?.name || 'Aguardando Oponente...'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {activeDuel.status === 'active' && mySide && (
                <button
                  type="button"
                  disabled={!isMyTurn || busy}
                  onClick={() => handleDuelAction({ type: 'surrender' })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#08080B] border border-red-500/40 hover:border-red-400 text-xs text-red-300 cursor-pointer disabled:opacity-45"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Render-se
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveDuel(null)}
                className="px-3.5 py-1.5 rounded bg-[#08080B] border border-[#24242E] hover:border-[#10B981] text-xs text-[#F4F4F6] cursor-pointer"
              >
                Voltar à Lista PvP
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="px-3.5 py-2.5 rounded bg-red-950/40 border border-red-500/50 text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          {/* Fighter Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Self / Challenger Side */}
            <div
              className={`p-4 rounded-lg border space-y-2.5 ${
                st.activeTurnSide === (mySide || 'challenger') && !st.winnerSide
                  ? 'bg-[#09140E] border-[#22C55E]'
                  : 'bg-[#08080B] border-[#24242E]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <NinjaAvatar src={selfFighter.avatarUrl} alt={selfFighter.name} sizeClass="w-11 h-11" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#F8FAFC] truncate">
                      {selfFighter.name} {mySide ? '(Você)' : ''}
                    </div>
                    <div className="text-[11px] font-mono text-[#A1A1AA]">
                      {selfFighter.rank} · {formatElementalLabel(selfFighter.chakraNature)}
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono text-xs tabular-nums">
                  <div className="text-[#22C55E] font-bold">
                    HP {selfFighter.hp}/{selfFighter.maxHp}
                  </div>
                  <div className="text-sky-300">
                    CH {selfFighter.chakra}/{selfFighter.maxChakra}
                  </div>
                </div>
              </div>
              <div className="h-2 rounded-full bg-[#15151D] overflow-hidden">
                <div
                  className="h-full bg-[#10B981] transition-all duration-300"
                  style={{
                    width: `${Math.max(0, Math.round((selfFighter.hp / selfFighter.maxHp) * 100))}%`,
                  }}
                />
              </div>
              <div className="pt-1.5 border-t border-[#1C1C24] flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono tabular-nums text-[#A1A1AA]">
                <span className="text-[#22C55E] font-semibold">
                  Clã {selfFighter.clan}: {calculateClanBonuses(selfFighter.clan).summaryChips.slice(0, 4).join(' · ')}
                </span>
                <span>
                  NIN {selfFighter.stats.ninjutsu} · TAI {selfFighter.stats.taijutsu} · VEL {selfFighter.stats.velocidade}
                </span>
              </div>
            </div>

            {/* Rival Side */}
            {rivalFighter ? (
              <div
                className={`p-4 rounded-lg border space-y-2.5 ${
                  st.activeTurnSide !== (mySide || 'challenger') && !st.winnerSide
                    ? 'bg-[#17090C] border-red-400'
                    : 'bg-[#08080B] border-red-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <NinjaAvatar src={rivalFighter.avatarUrl} alt={rivalFighter.name} sizeClass="w-11 h-11" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#F8FAFC] truncate">
                        {rivalFighter.name}
                      </div>
                      <div className="text-[11px] font-mono text-[#A1A1AA]">
                        {rivalFighter.rank} · {formatElementalLabel(rivalFighter.chakraNature)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs tabular-nums">
                    <div className="text-red-400 font-bold">
                      HP {rivalFighter.hp}/{rivalFighter.maxHp}
                    </div>
                    <div className="text-sky-300">
                      CH {rivalFighter.chakra}/{rivalFighter.maxChakra}
                    </div>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[#15151D] overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{
                      width: `${Math.max(0, Math.round((rivalFighter.hp / rivalFighter.maxHp) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[#08080B] border border-dashed border-[#2A2A36] flex items-center justify-between">
                <div className="text-xs text-[#A1A1AA]">
                  Aguardando desafiante aceitar a sala PvP em tempo real...
                </div>
                {activeDuel.challengerUid !== character.userUid && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleAcceptDuel(activeDuel.id)}
                    className="px-4 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer"
                  >
                    Aceitar Duelo Agora
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Finished Banner */}
        {st.winnerSide && (
          <div className="bg-[#09140E] border border-[#10B981] rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-base font-display font-bold text-[#F8FAFC]">
              <Trophy className="w-5 h-5 text-amber-300" />
              <span>
                Vencedor Oficial: {activeDuel.winnerName} · Aposta {st.wagerRyo} Ryo & Mérito liquidados!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveDuel(null)}
              className="px-4 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer"
            >
              Nova Partida PvP
            </button>
          </div>
        )}

        {/* Grid + Controls + Battle Log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 space-y-4">
            {/* 7x5 PvP Grid */}
            <section className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#F4F4F6]">
                  Arena Tática PvP 7×5 ·{' '}
                  {isMyTurn ? (
                    <strong className="text-[#22C55E]">Seu Turno</strong>
                  ) : st.winnerSide ? (
                    'Duelo Encerrado'
                  ) : (
                    <span className="text-amber-300">
                      Turno de {st.activeTurnSide === 'challenger' ? st.challenger.name : st.opponent?.name}
                    </span>
                  )}
                </span>
                {rivalFighter && (
                  <span className="font-mono text-[11px] tabular-nums text-[#A1A1AA]">
                    Distância: <strong className="text-[#22C55E]">{dist}</strong> casa(s) · Passo:{' '}
                    {selfFighter.moveRemaining}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 5 }).map((_, y) =>
                  Array.from({ length: 7 }).map((__, x) => {
                    const coord: GridCoord = { x, y };
                    const isSelf = selfFighter.pos.x === x && selfFighter.pos.y === y;
                    const isRival = rivalFighter && rivalFighter.pos.x === x && rivalFighter.pos.y === y;
                    const terrain = st.grid.terrain[y]?.[x] || 'ground';
                    const canMove =
                      isMyTurn &&
                      !busy &&
                      rivalFighter &&
                      !isSelf &&
                      !isRival &&
                      canMoveToTile(
                        st.grid,
                        selfFighter.pos,
                        coord,
                        selfFighter.moveRemaining,
                        rivalFighter.pos
                      );

                    return (
                      <button
                        key={`${x}-${y}`}
                        type="button"
                        disabled={!canMove}
                        onClick={() => handleDuelAction({ type: 'move', to: coord })}
                        className={`min-h-[54px] rounded border p-1 flex flex-col items-center justify-between text-[10px] font-mono transition-colors ${
                          isSelf
                            ? 'bg-[#0C261A] border-[#22C55E] text-[#22C55E] font-bold'
                            : isRival
                            ? 'bg-red-950/60 border-red-500 text-red-300 font-bold'
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
                        {isSelf ? (
                          <span>VOCÊ</span>
                        ) : isRival ? (
                          <span>RIVAL</span>
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

            {/* Combat Actions */}
            {activeDuel.status === 'active' && !st.winnerSide && mySide && (
              <section className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'jutsus' as const, label: `Jutsus (${fighterJutsus.length})` },
                      { id: 'melee' as const, label: 'Taijutsu' },
                      { id: 'weapons' as const, label: 'Armas Ninja' },
                      { id: 'items' as const, label: `Bolsa (${availableConsumables.length})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActionTab(tab.id)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                          actionTab === tab.id
                            ? 'bg-[#10B981] text-[#050505]'
                            : 'bg-[#08080B] border border-[#24242E] text-[#A1A1AA] hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {shStage >= 1 && (
                      <button
                        type="button"
                        disabled={!isMyTurn || busy || (!selfFighter.sharinganActive && !shCheck.allowed)}
                        onClick={() => handleDuelAction({ type: 'toggle_sharingan' })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#08080B] border border-[#10B981] text-xs font-semibold text-[#22C55E] cursor-pointer disabled:opacity-45"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {selfFighter.sharinganActive
                          ? `Desativar ${shCfg.shortTitle}`
                          : `Ativar ${shCfg.shortTitle}`}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!isMyTurn || busy}
                      onClick={() => handleDuelAction({ type: 'defend' })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#08080B] border border-[#24242E] hover:border-[#10B981] text-xs font-semibold text-[#F4F4F6] cursor-pointer disabled:opacity-45"
                    >
                      <Shield className="w-3.5 h-3.5 text-[#22C55E]" />
                      Defender (+14 CH)
                    </button>
                  </div>
                </div>

                {actionTab === 'jutsus' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {fighterJutsus.map((j) => {
                      const cost = getEffectiveJutsuChakraCost(j, selfFighter.stats);
                      const range = getJutsuGridRange(j);
                      const inRange = dist >= range.minRange && dist <= range.maxRange;
                      const enoughCh = selfFighter.chakra >= cost;
                      const img = getJutsuImage(j);

                      return (
                        <button
                          key={j.id}
                          type="button"
                          disabled={!isMyTurn || busy || !inRange || !enoughCh}
                          onClick={() => handleDuelAction({ type: 'jutsu', jutsuId: j.id })}
                          className="p-3 rounded-lg bg-[#08080B] hover:border-[#10B981] border border-[#24242E] disabled:opacity-45 text-left flex items-center gap-3 cursor-pointer"
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
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {actionTab === 'melee' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {MELEE_STRIKES.map((s) => {
                      const inRange = dist >= s.minRange && dist <= s.maxRange;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={!isMyTurn || busy || !inRange || selfFighter.chakra < s.chakraCost}
                          onClick={() => handleDuelAction({ type: 'melee', strikeId: s.id })}
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
                )}

                {actionTab === 'weapons' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[#A1A1AA]">Fluxo Elemental:</span>
                      <select
                        aria-label="Fluxo elemental na arma"
                        value={infusionElement}
                        onChange={(e) => setInfusionElement(e.target.value)}
                        className="bg-[#08080B] border border-[#24242E] rounded px-2.5 py-1 text-xs text-white"
                      >
                        <option value="none">Sem Infusão (Físico)</option>
                        <option value={selfFighter.chakraNature}>{selfFighter.chakraNature} (+4 CH)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {availableWeapons.map((w) => {
                        const inRange = dist >= w.minRange && dist <= w.maxRange;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            disabled={!isMyTurn || busy || !inRange || selfFighter.chakra < w.chakraCost}
                            onClick={() =>
                              handleDuelAction({
                                type: 'weapon',
                                weaponId: w.id,
                                infusionElement,
                              })
                            }
                            className="p-3 rounded-lg bg-[#08080B] hover:border-[#10B981] border border-[#24242E] disabled:opacity-45 text-left cursor-pointer"
                          >
                            <div className="text-xs font-bold text-[#F8FAFC]">{w.name}</div>
                            <div className="text-[10px] font-mono text-[#A1A1AA]">
                              Poder {w.basePower} · -{w.chakraCost} CH · Alc. {w.minRange}–{w.maxRange}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {actionTab === 'items' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {availableConsumables.length === 0 ? (
                      <p className="text-xs text-[#8E8E9A]">Sem consumíveis disponíveis na bolsa.</p>
                    ) : (
                      availableConsumables.map(({ slot, def }) => (
                        <button
                          key={slot.itemId}
                          type="button"
                          disabled={!isMyTurn || busy}
                          onClick={() => handleDuelAction({ type: 'consumable', itemId: def.id })}
                          className="p-3 rounded-lg bg-emerald-950/25 hover:bg-emerald-950/45 border border-emerald-500/45 disabled:opacity-45 text-left flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div>
                            <div className="text-xs font-bold text-emerald-300">
                              {def.name} (×{slot.qty})
                            </div>
                            <div className="text-[10px] font-mono text-[#D4D4DC]">
                              {def.healHp ? `+${def.healHp} HP` : `+${def.healChakra} CH`}
                            </div>
                          </div>
                          <HeartPulse className="w-4 h-4 text-emerald-400 shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </section>
            )}
          </div>

          <div className="lg:col-span-5">
            <BattleLogPanel
              entries={mappedLogs}
              currentTurn={st.turnNumber}
              title="Battle Log PvP 1v1"
            />
          </div>
        </div>
      </div>
    );
  }

  // PvP Hub View
  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="px-4 py-3 rounded bg-red-950/40 border border-red-500/50 text-xs text-red-200">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Create Challenge Card */}
        <section className="lg:col-span-5 bg-[#0C0C10] border border-[#24242E] rounded-xl p-5 space-y-4">
          <div className="border-b border-[#24242E] pb-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#22C55E]">
              <Swords className="w-4 h-4" />
              <span>ARENA PVP OFICIAL 1v1</span>
            </div>
            <h2 className="font-display text-lg font-bold text-[#F8FAFC] mt-1">
              Lançar Desafio PvP Shinobi
            </h2>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#D4D4D8]">Modalidade de Duelo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChallengeMode('ranked_spar')}
                className={`p-2.5 rounded-lg border text-left text-xs cursor-pointer ${
                  challengeMode === 'ranked_spar'
                    ? 'bg-[#09140E] border-[#10B981] text-[#22C55E] font-bold'
                    : 'bg-[#08080B] border-[#24242E] text-[#A1A1AA]'
                }`}
              >
                <div>Duelo Rankeado 1v1</div>
                <div className="text-[10px] font-normal opacity-80">Combate imediato vs rival</div>
              </button>
              <button
                type="button"
                onClick={() => setChallengeMode('live_pvp')}
                className={`p-2.5 rounded-lg border text-left text-xs cursor-pointer ${
                  challengeMode === 'live_pvp'
                    ? 'bg-[#09140E] border-[#10B981] text-[#22C55E] font-bold'
                    : 'bg-[#08080B] border-[#24242E] text-[#A1A1AA]'
                }`}
              >
                <div>PvP Ao Vivo (Sala)</div>
                <div className="text-[10px] font-normal opacity-80">Sincronizado Socket.IO</div>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pvp-opponent-select" className="text-xs font-medium text-[#D4D4D8]">
              Selecionar Adversário
            </label>
            <select
              id="pvp-opponent-select"
              value={targetCharId}
              onChange={(e) => setTargetCharId(e.target.value)}
              className="w-full bg-[#08080B] border border-[#24242E] rounded px-3 py-2 text-xs text-[#F8FAFC]"
            >
              {challengeMode === 'live_pvp' && (
                <option value="">Qualquer Desafiante Online (Sala Aberta)</option>
              )}
              {opponents.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} — {o.rank} (Nv.{o.level} · {o.village} · {o.chakraNature})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#D4D4D8] inline-flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-[#22C55E]" />
              Aposta da Arena (Ryo)
            </label>
            <div className="flex flex-wrap gap-2">
              {[0, 100, 150, 300, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setWagerRyo(amt)}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-bold cursor-pointer ${
                    wagerRyo === amt
                      ? 'bg-[#10B981] text-[#050505]'
                      : 'bg-[#08080B] border border-[#24242E] text-[#A1A1AA]'
                  }`}
                >
                  {amt === 0 ? 'Amistoso (0)' : `${amt} Ryo`}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={busy || (challengeMode === 'ranked_spar' && opponents.length === 0)}
            onClick={handleCreateChallenge}
            className="w-full py-2.5 rounded-md bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-45 text-[#050505] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            {challengeMode === 'ranked_spar' ? 'Iniciar Duelo Rankeado 1v1' : 'Abrir Sala PvP Ao Vivo'}
          </button>
        </section>

        {/* Active / Waiting / Finished Duels List */}
        <section className="lg:col-span-7 bg-[#0C0C10] border border-[#24242E] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#24242E] pb-3">
            <h3 className="font-display text-base font-bold text-[#F8FAFC] inline-flex items-center gap-2">
              <Users className="w-4 h-4 text-[#22C55E]" />
              Salas & Histórico de Duelos PvP ({duels.length})
            </h3>
          </div>

          {duels.length === 0 ? (
            <p className="text-xs text-[#8E8E9A] py-4">
              Nenhum duelo PvP registrado ainda. Lance o primeiro desafio ao lado!
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {duels.map((d) => {
                const canAccept =
                  d.status === 'waiting' &&
                  d.challengerCharId !== character.id &&
                  (!d.opponentCharId || d.opponentCharId === character.id);
                const isParticipant =
                  d.challengerCharId === character.id || d.opponentCharId === character.id;

                return (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-lg bg-[#08080B] border border-[#24242E] flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            d.status === 'active'
                              ? 'bg-emerald-950/80 border border-emerald-500/50 text-[#22C55E]'
                              : d.status === 'waiting'
                              ? 'bg-amber-950/70 border border-amber-400/50 text-amber-300'
                              : 'bg-[#121218] border border-[#24242E] text-[#A1A1AA]'
                          }`}
                        >
                          {d.status === 'active'
                            ? 'EM COMBATE'
                            : d.status === 'waiting'
                            ? 'AGUARDANDO OPONENTE'
                            : 'FINALIZADO'}
                        </span>
                        <span className="font-bold text-[#F8FAFC]">
                          {d.challengerName} vs {d.opponentName || 'Aberto'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#8E8E9A]">
                        {d.mode === 'live_pvp' ? 'PvP Ao Vivo' : 'Rankeado'} · Aposta {d.wagerRyo} Ryo · T
                        {d.turnNumber}
                        {d.winnerName ? ` · Vencedor: ${d.winnerName}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canAccept && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleAcceptDuel(d.id)}
                          className="px-3 py-1.5 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer"
                        >
                          Aceitar Duelo
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveDuel(d)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#121218] hover:border-[#10B981] border border-[#24242E] text-xs text-[#F4F4F6] cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                        {isParticipant && d.status === 'active' ? 'Lutar Agora' : 'Abrir Sala'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
