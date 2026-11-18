import React, { useMemo, useState } from 'react';
import {
  Flame,
  Globe,
  Handshake,
  MapPin,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  Swords,
} from 'lucide-react';
import {
  DiplomaticStatus,
  GeopoliticsWorldState,
  VILLAGES,
  VillageInfo,
} from '../game/narutoData';
import {
  CharacterModel,
  VillageDiplomaticPeer,
  getVillageGeopoliticsOverview,
} from '../game/engine';

interface GeopoliticsPanelProps {
  geopolitics: GeopoliticsWorldState;
  character: CharacterModel | null;
  userRole?: string;
  token: string | null;
  onGeopoliticsUpdated: (next: GeopoliticsWorldState) => void;
  onNavigateToMissions?: (villageName: string) => void;
  onNavigateToVillageForum?: (villageName: string) => void;
}

type RelationFilterTab = 'all' | 'allied' | 'enemy' | 'neutral' | 'conflict';

export const GeopoliticsPanel: React.FC<GeopoliticsPanelProps> = ({
  geopolitics,
  character,
  userRole,
  token,
  onGeopoliticsUpdated,
  onNavigateToMissions,
  onNavigateToVillageForum,
}) => {
  const [selectedVillage, setSelectedVillage] = useState<string>(
    character?.village || 'Konohagakure'
  );
  const [filterTab, setFilterTab] = useState<RelationFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Chancellery (Kage / Admin) controls
  const [targetPeerVillage, setTargetPeerVillage] = useState<string>('Otogakure');
  const [newStatus, setNewStatus] = useState<DiplomaticStatus>('allied');
  const [treatyTitleInput, setTreatyTitleInput] = useState('');
  const [conflictFrontInput, setConflictFrontInput] = useState('');
  const [conflictTypeInput, setConflictTypeInput] = useState('Escaramuça de Fronteira');
  const [conflictIntensityInput, setConflictIntensityInput] = useState(80);
  const [conflictSummaryInput, setConflictSummaryInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const overview = useMemo(
    () => getVillageGeopoliticsOverview(geopolitics, selectedVillage),
    [geopolitics, selectedVillage]
  );

  const isAdmin = userRole === 'admin';
  const canManageSelectedVillage =
    isAdmin || Boolean(character?.isKage && character.village === overview.targetVillage.name);

  const filterPeerList = (peers: VillageDiplomaticPeer[]) => {
    if (!searchQuery.trim()) return peers;
    const q = searchQuery.toLowerCase().trim();
    return peers.filter(
      (p) =>
        p.village.name.toLowerCase().includes(q) ||
        p.village.country.toLowerCase().includes(q) ||
        p.treatyTitle.toLowerCase().includes(q)
    );
  };

  const filteredAllies = useMemo(
    () => filterPeerList(overview.allies),
    [overview.allies, searchQuery]
  );
  const filteredEnemies = useMemo(() => {
    const base =
      filterTab === 'conflict'
        ? overview.enemies.filter((e) => e.inActiveConflict)
        : overview.enemies;
    return filterPeerList(base);
  }, [overview.enemies, filterTab, searchQuery]);
  const filteredNeutrals = useMemo(
    () => filterPeerList(overview.neutrals),
    [overview.neutrals, searchQuery]
  );

  const getVillageMeta = (name: string): VillageInfo | undefined =>
    VILLAGES.find((v) => v.name === name);

  const handleSaveRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const resp = await fetch('/api/geopolitics/relation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          villageA: overview.targetVillage.name,
          villageB: targetPeerVillage,
          status: newStatus,
          treatyTitle: treatyTitleInput.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setFeedback({ type: 'err', text: data.error || 'Falha ao atualizar tratado.' });
      } else {
        onGeopoliticsUpdated(data.geopolitics);
        setTreatyTitleInput('');
        setFeedback({
          type: 'ok',
          text: `Tratado atualizado entre ${overview.targetVillage.name} e ${targetPeerVillage}.`,
        });
      }
    } catch {
      setFeedback({ type: 'err', text: 'Erro de conexão com o servidor diplomático.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleConflict = async (
    villageA: string,
    villageB: string,
    active: boolean,
    customFields?: {
      frontName?: string;
      conflictType?: string;
      intensity?: number;
      summary?: string;
    }
  ) => {
    if (!token) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const resp = await fetch('/api/geopolitics/conflict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          villageA,
          villageB,
          active,
          ...customFields,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setFeedback({ type: 'err', text: data.error || 'Falha ao atualizar confronto.' });
      } else {
        onGeopoliticsUpdated(data.geopolitics);
        setFeedback({
          type: 'ok',
          text: active
            ? `Confronto declarado: ${villageA} vs ${villageB}.`
            : `Cessar-fogo assinado entre ${villageA} e ${villageB}.`,
        });
      }
    } catch {
      setFeedback({ type: 'err', text: 'Erro ao registrar movimentação militar.' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderPeerCard = (peer: VillageDiplomaticPeer) => {
    const imgKey = peer.village.id;
    const hasImg = Boolean(peer.village.imageUrl && !failedImages[imgKey]);

    return (
      <div
        key={peer.village.id}
        className={`rounded-lg border p-3.5 transition-colors ${
          peer.inActiveConflict
            ? 'border-red-500/45 bg-[#120A0C]'
            : peer.status === 'allied'
              ? 'border-emerald-500/35 bg-[#09110D]'
              : peer.status === 'enemy'
                ? 'border-amber-500/30 bg-[#100D09]'
                : 'border-zinc-800/90 bg-[#0B0D11]'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg border border-zinc-800 bg-[#07080A] overflow-hidden shrink-0 flex items-center justify-center">
            {hasImg ? (
              <img
                src={peer.village.imageUrl}
                alt={peer.village.name}
                referrerPolicy="no-referrer"
                onError={() => setFailedImages((prev) => ({ ...prev, [imgKey]: true }))}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-display text-sm font-bold text-emerald-400">
                {peer.village.emblemGlyph}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedVillage(peer.village.name)}
                className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors text-left truncate"
              >
                {peer.village.name}
              </button>
              <span
                className={`text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  peer.inActiveConflict
                    ? 'text-red-400'
                    : peer.status === 'allied'
                      ? 'text-emerald-400'
                      : peer.status === 'enemy'
                        ? 'text-amber-400'
                        : 'text-zinc-400'
                }`}
              >
                {peer.inActiveConflict
                  ? 'Em Confronto'
                  : peer.status === 'allied'
                    ? 'Aliado'
                    : peer.status === 'enemy'
                      ? 'Inimigo'
                      : 'Neutro'}
              </span>
            </div>

            <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-1.5">
              <span>{peer.village.country}</span>
              <span aria-hidden="true">·</span>
              <span>{peer.village.kageTitle}</span>
              <span aria-hidden="true">·</span>
              <span>{peer.village.primaryNature}</span>
            </div>

            <p className="text-xs text-zinc-300 pt-0.5">{peer.treatyTitle}</p>

            {peer.inActiveConflict && peer.conflict && (
              <div className="pt-1.5 text-[11px] text-red-300/95 flex flex-wrap items-center justify-between gap-2 border-t border-red-500/20 mt-1.5">
                <span>
                  Frente: <strong>{peer.conflict.frontName}</strong> · Intensidade{' '}
                  <span className="tabular-nums">{peer.conflict.intensity}%</span>
                </span>
                {onNavigateToMissions && (
                  <button
                    type="button"
                    onClick={() => onNavigateToMissions(peer.village.name)}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold whitespace-nowrap cursor-pointer"
                  >
                    Missões da Guerra (+{peer.conflict.bonusRyoPct}% Ryo) →
                  </button>
                )}
              </div>
            )}

            {!peer.inActiveConflict && onNavigateToVillageForum && (
              <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-400">
                <button
                  type="button"
                  onClick={() => setSelectedVillage(peer.village.name)}
                  className="hover:text-zinc-200 transition-colors"
                >
                  Inspecionar diplomacia
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToVillageForum(peer.village.name)}
                  className="text-emerald-400/90 hover:text-emerald-300 transition-colors"
                >
                  Visitar Vila RP →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Overview Header */}
      <section className="rounded-xl border border-zinc-800/90 bg-[#08090C] p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <Globe className="w-3.5 h-3.5" />
              <span>Conselho Geopolítico das Nações Shinobi</span>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span className="text-zinc-400">18 Territórios Monitorados</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Mapa de Alianças, Rivalidades e Confrontos Ativos
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Consulte tratados vigentes entre os vilarejos ocultos, identifique zonas de guerra ativa com bônus de recompensa em missões e acompanhe decretos oficiais dos Kages.
            </p>
          </div>

          {/* 4 Tabular KPI Summary Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="rounded-lg border border-red-500/30 bg-[#11090B] px-3.5 py-2.5">
              <div className="text-[11px] text-zinc-400">Em Confronto</div>
              <div className="font-mono text-xl font-bold text-red-400 tabular-nums">
                {overview.globalActiveConflicts.length}
              </div>
              <div className="text-[11px] text-red-300/80">Frentes mundiais</div>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-[#09120D] px-3.5 py-2.5">
              <div className="text-[11px] text-zinc-400">Vilarejos Aliados</div>
              <div className="font-mono text-xl font-bold text-emerald-400 tabular-nums">
                {overview.allies.length}
              </div>
              <div className="text-[11px] text-zinc-400 truncate">{overview.targetVillage.name}</div>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-[#110E09] px-3.5 py-2.5">
              <div className="text-[11px] text-zinc-400">Vilarejos Inimigos</div>
              <div className="font-mono text-xl font-bold text-amber-400 tabular-nums">
                {overview.enemies.length}
              </div>
              <div className="text-[11px] text-zinc-400 tabular-nums">
                {overview.activeConflicts.length} em guerra direta
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-[#0C0E12] px-3.5 py-2.5">
              <div className="text-[11px] text-zinc-400">Vilarejos Neutros</div>
              <div className="font-mono text-xl font-bold text-zinc-200 tabular-nums">
                {overview.neutrals.length}
              </div>
              <div className="text-[11px] text-zinc-400">Comércio aberto</div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Armed Confrontations Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400" />
              Vilarejos em Confronto Armado Agora
            </h2>
            <p className="text-xs text-zinc-400">
              O quadro regular é exclusivo da sua vila, mas todo shinobi pode ingressar nas Missões da Guerra Ativa geradas pelos confrontos abaixo (+15% a +25% Ryo e Mérito).
            </p>
          </div>
          <span className="text-xs text-zinc-400 tabular-nums">
            {overview.globalActiveConflicts.length}{' '}
            {overview.globalActiveConflicts.length === 1
              ? 'confronto ativo registrado'
              : 'confrontos ativos registrados'}
          </span>
        </div>

        {overview.globalActiveConflicts.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-[#08090C] p-6 text-center space-y-1.5">
            <p className="text-sm font-semibold text-emerald-400">
              Paz Continental Temporária — Nenhum Confronto Militar Aberto
            </p>
            <p className="text-xs text-zinc-400">
              Todos os vilarejos operam sob tratados diplomáticos ou vigilância fria de fronteira.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {overview.globalActiveConflicts.map((conflict) => {
              const vA = getVillageMeta(conflict.villageA);
              const vB = getVillageMeta(conflict.villageB);
              const involvesPlayer =
                character?.village === conflict.villageA ||
                character?.village === conflict.villageB;

              return (
                <div
                  key={conflict.id}
                  className={`rounded-xl border p-5 space-y-4 ${
                    involvesPlayer
                      ? 'border-emerald-500/45 bg-[#090F0D]'
                      : 'border-zinc-800/90 bg-[#08090C]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-red-400 font-semibold">
                      <Swords className="w-3.5 h-3.5 shrink-0" />
                      <span>{conflict.conflictType}</span>
                      <span aria-hidden="true" className="text-zinc-600">·</span>
                      <span className="text-zinc-400 font-normal">{conflict.startedAt}</span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-emerald-400 tabular-nums">
                      +{conflict.bonusRyoPct}% Ryo & Mérito
                    </span>
                  </div>

                  {/* Belligerent Villages Row */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-zinc-800/90 bg-[#0B0D11] p-3">
                    <button
                      type="button"
                      onClick={() => setSelectedVillage(conflict.villageA)}
                      className="flex items-center gap-2.5 min-w-0 text-left hover:text-emerald-400 transition-colors"
                    >
                      <span className="w-9 h-9 rounded-md border border-zinc-800 bg-[#07080A] flex items-center justify-center font-display text-xs font-bold text-emerald-400 shrink-0">
                        {vA?.emblemGlyph || '忍'}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {conflict.villageA}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {vA?.country || 'Nação Shinobi'}
                        </div>
                      </div>
                    </button>

                    <div className="px-2 text-center">
                      <span className="font-mono text-xs font-bold text-red-400">VS</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedVillage(conflict.villageB)}
                      className="flex items-center justify-end gap-2.5 min-w-0 text-right hover:text-emerald-400 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {conflict.villageB}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {vB?.country || 'Nação Shinobi'}
                        </div>
                      </div>
                      <span className="w-9 h-9 rounded-md border border-zinc-800 bg-[#07080A] flex items-center justify-center font-display text-xs font-bold text-red-400 shrink-0">
                        {vB?.emblemGlyph || '忍'}
                      </span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        Teatro: {conflict.frontName}
                      </span>
                      <span className="font-mono text-zinc-300 tabular-nums">
                        Intensidade {conflict.intensity}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                      <div
                        className="h-full bg-red-500/85 origin-left transition-transform duration-200"
                        style={{ transform: `scaleX(${Math.min(100, conflict.intensity) / 100})` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{conflict.summary}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
                    <div className="flex flex-wrap items-center gap-2">
                      {onNavigateToMissions && (
                        <button
                          type="button"
                          onClick={() => onNavigateToMissions(conflict.villageA)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <Swords className="w-3.5 h-3.5" />
                          <span>Combater nas Missões da Guerra</span>
                        </button>
                      )}
                      {involvesPlayer && (
                        <span className="text-[11px] font-mono text-emerald-400">
                          Sua vila está diretamente neste front
                        </span>
                      )}
                    </div>

                    {(isAdmin ||
                      (character?.isKage &&
                        (character.village === conflict.villageA ||
                          character.village === conflict.villageB))) && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() =>
                          handleToggleConflict(conflict.villageA, conflict.villageB, false)
                        }
                        className="text-xs font-medium text-zinc-400 hover:text-emerald-400 transition-colors whitespace-nowrap"
                      >
                        Assinar Cessar-Fogo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Diplomatic Relations Matrix by Selected Village */}
      <section className="rounded-xl border border-zinc-800/90 bg-[#08090C] p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="space-y-1">
            <span className="text-xs text-emerald-400 font-medium">
              Relações Bilaterais por Vilarejo
            </span>
            <h2 className="font-display text-xl font-bold text-white">
              Diplomacia de {overview.targetVillage.name} ({overview.targetVillage.country})
            </h2>
            <p className="text-xs text-zinc-400">{overview.targetVillage.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label htmlFor="geopolitics-village-select" className="sr-only">
              Selecionar vilarejo para inspeção diplomática
            </label>
            <select
              id="geopolitics-village-select"
              value={overview.targetVillage.name}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-[#0D1016] px-3.5 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
            >
              {VILLAGES.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name} — {v.country}
                </option>
              ))}
            </select>

            {character?.village && character.village !== overview.targetVillage.name && (
              <button
                type="button"
                onClick={() => setSelectedVillage(character.village)}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
              >
                Minha Vila ({character.village})
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#0D1016] p-1 border border-zinc-800">
            {(
              [
                { id: 'all', label: 'Visão Completa' },
                { id: 'allied', label: `Aliados (${overview.allies.length})` },
                { id: 'enemy', label: `Inimigos (${overview.enemies.length})` },
                { id: 'neutral', label: `Neutros (${overview.neutrals.length})` },
                { id: 'conflict', label: `Em Confronto (${overview.activeConflicts.length})` },
              ] as Array<{ id: RelationFilterTab; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  filterTab === tab.id
                    ? 'bg-emerald-500 text-black font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar vila, país ou tratado..."
              aria-label="Filtrar relações diplomáticas"
              className="w-full rounded-lg border border-zinc-800 bg-[#0D1016] pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 3 Columns or Filtered View */}
        {filterTab === 'all' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Allied Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Handshake className="w-4 h-4" />
                  Vilarejos Aliados
                </h3>
                <span className="font-mono text-xs text-zinc-400 tabular-nums">
                  {filteredAllies.length}
                </span>
              </div>
              {filteredAllies.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4">
                  Nenhum vilarejo aliado corresponde ao filtro atual.
                </p>
              ) : (
                <div className="space-y-2.5">{filteredAllies.map(renderPeerCard)}</div>
              )}
            </div>

            {/* Enemy Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Vilarejos Inimigos & Rivais
                </h3>
                <span className="font-mono text-xs text-zinc-400 tabular-nums">
                  {filteredEnemies.length}
                </span>
              </div>
              {filteredEnemies.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4">
                  Nenhuma hostilidade ativa para este vilarejo.
                </p>
              ) : (
                <div className="space-y-2.5">{filteredEnemies.map(renderPeerCard)}</div>
              )}
            </div>

            {/* Neutral Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-zinc-400" />
                  Vilarejos Neutros
                </h3>
                <span className="font-mono text-xs text-zinc-400 tabular-nums">
                  {filteredNeutrals.length}
                </span>
              </div>
              {filteredNeutrals.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4">
                  Nenhum vilarejo neutro encontrado.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                  {filteredNeutrals.map(renderPeerCard)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(filterTab === 'allied'
              ? filteredAllies
              : filterTab === 'neutral'
                ? filteredNeutrals
                : filteredEnemies
            ).map(renderPeerCard)}
          </div>
        )}
      </section>

      {/* Diplomatic Chancellery (Kage / Admin Actions) */}
      <section className="rounded-xl border border-zinc-800/90 bg-[#08090C] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Chancelaria Diplomática & Decretos de Guerra
            </h2>
            <p className="text-xs text-zinc-400">
              O Kage regente de {overview.targetVillage.name} e a Administração podem celebrar alianças, declarar neutralidade ou abrir frentes de confronto.
            </p>
          </div>
          <span className="text-xs text-zinc-400">
            {canManageSelectedVillage
              ? 'Autoridade Diplomática Ativa'
              : 'Modo Consulta (Requer cargo Kage da vila ou Admin)'}
          </span>
        </div>

        {feedback && (
          <div
            className={`rounded-lg border px-4 py-2.5 text-xs ${
              feedback.type === 'ok'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/40 bg-red-500/10 text-red-300'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {canManageSelectedVillage ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Update Bilateral Treaty Form */}
            <form
              onSubmit={handleSaveRelation}
              className="rounded-lg border border-zinc-800 bg-[#0B0D11] p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-white">
                Atualizar Tratado de {overview.targetVillage.name}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="geo-peer-village" className="block text-[11px] text-zinc-400 mb-1">
                    Vilarejo Contraparte
                  </label>
                  <select
                    id="geo-peer-village"
                    value={targetPeerVillage}
                    onChange={(e) => setTargetPeerVillage(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-[#07080A] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {VILLAGES.filter((v) => v.name !== overview.targetVillage.name).map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="geo-diplomatic-status" className="block text-[11px] text-zinc-400 mb-1">
                    Status Diplomático
                  </label>
                  <select
                    id="geo-diplomatic-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as DiplomaticStatus)}
                    className="w-full rounded-lg border border-zinc-700 bg-[#07080A] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="allied">Aliado</option>
                    <option value="neutral">Neutro</option>
                    <option value="enemy">Inimigo</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="geo-treaty-title" className="block text-[11px] text-zinc-400 mb-1">
                  Título do Tratado / Motivo
                </label>
                <input
                  id="geo-treaty-title"
                  type="text"
                  value={treatyTitleInput}
                  onChange={(e) => setTreatyTitleInput(e.target.value)}
                  placeholder="Ex: Pacto de Defesa Mútua das Fronteiras"
                  className="w-full rounded-lg border border-zinc-700 bg-[#07080A] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
              >
                Ratificar Tratado Oficial
              </button>
            </form>

            {/* Declare Armed Confrontation Form */}
            <div className="rounded-lg border border-zinc-800 bg-[#0B0D11] p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">
                Declarar Mobilização de Confronto ({overview.targetVillage.name} vs {targetPeerVillage})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="geo-conflict-front" className="block text-[11px] text-zinc-400 mb-1">
                    Nome da Frente / Fronteira
                  </label>
                  <input
                    id="geo-conflict-front"
                    type="text"
                    value={conflictFrontInput}
                    onChange={(e) => setConflictFrontInput(e.target.value)}
                    placeholder={`Fronteira ${overview.targetVillage.name}–${targetPeerVillage}`}
                    className="w-full rounded-lg border border-zinc-700 bg-[#07080A] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="geo-conflict-intensity" className="block text-[11px] text-zinc-400 mb-1">
                    Intensidade Militar ({conflictIntensityInput}%)
                  </label>
                  <input
                    id="geo-conflict-intensity"
                    aria-label="Intensidade Militar"
                    type="range"
                    min={30}
                    max={100}
                    value={conflictIntensityInput}
                    onChange={(e) => setConflictIntensityInput(Number(e.target.value))}
                    className="w-full accent-emerald-500 mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  aria-label="Tipo de Operação"
                  value={conflictTypeInput}
                  onChange={(e) => setConflictTypeInput(e.target.value)}
                  placeholder="Tipo de Operação"
                  className="w-full rounded-lg border border-zinc-700 bg-[#07080A] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="text"
                  aria-label="Resumo estratégico da campanha"
                  value={conflictSummaryInput}
                  onChange={(e) => setConflictSummaryInput(e.target.value)}
                  placeholder="Resumo estratégico da campanha..."
                  className="w-full rounded-lg border border-zinc-700 bg-[#07080A] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  handleToggleConflict(overview.targetVillage.name, targetPeerVillage, true, {
                    frontName: conflictFrontInput,
                    conflictType: conflictTypeInput,
                    intensity: conflictIntensityInput,
                    summary: conflictSummaryInput,
                  })
                }
                className="rounded-lg border border-red-500/50 bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50 transition-colors"
              >
                Iniciar Confronto Armado (+15% Bônus em Missões)
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Torne-se o Kage nomeado da sua vila oculta para negociar alianças, encerrar guerras ou mobilizar frentes militares em tempo real.
          </p>
        )}
      </section>
    </div>
  );
};
