import React, { useEffect, useState } from 'react';
import { BarChart3, Crown, Download, FileText, ShieldCheck } from 'lucide-react';
import { CharacterModel } from '../game/engine.ts';
import { LanguageCode, t } from '../game/i18n.ts';
import { VILLAGES } from '../game/narutoData.ts';
import { apiFetch, getAuthToken } from '../utils/api.ts';
import { clearQueuedActions, getQueuedActions } from '../utils/offlineStore.ts';
import { exportShinobiPdfReport } from '../utils/pdfExport.ts';

interface AnalyticsOverview {
  summary: {
    totalNinjas: number;
    totalRyoCirculation: number;
    totalWins: number;
    totalLosses: number;
    winRate: number;
  };
  villageDistribution: Record<string, number>;
  clanDistribution: Record<string, number>;
  recentEvents: Array<{
    id: number;
    eventType: string;
    characterName: string;
    village: string;
    valueNum: number;
    createdAt: string;
  }>;
  customContent: Array<{
    id: number;
    kind: string;
    title: string;
    createdAt: string;
  }>;
  characters: CharacterModel[];
}

interface AdminAnalyticsPanelProps {
  character: CharacterModel;
  lang: LanguageCode;
  isOnline: boolean;
  onRefreshAll: () => Promise<void>;
}

export const AdminAnalyticsPanel: React.FC<AdminAnalyticsPanelProps> = ({
  character,
  lang,
  isOnline,
  onRefreshAll,
}) => {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [customKind, setCustomKind] = useState<'mission' | 'jutsu'>('mission');
  const [customTitle, setCustomTitle] = useState('');
  const [customPower, setCustomPower] = useState('120');
  const [customCategory, setCustomCategory] = useState<'Ninjutsu' | 'Taijutsu' | 'Genjutsu' | 'Kenjutsu' | 'Fuinjutsu' | 'Iryou' | 'Kekkei Genkai'>('Ninjutsu');
  const [customNature, setCustomNature] = useState<'Katon' | 'Suiton' | 'Fuuton' | 'Doton' | 'Raiton' | 'Yin' | 'Yang' | 'Neutro'>('Katon');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [kageVillageFilter, setKageVillageFilter] = useState<string>('Todas');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [queuedCount, setQueuedCount] = useState(getQueuedActions().length);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<AnalyticsOverview>('/api/analytics/overview');
      setData(res);
    } catch (err) {
      setFeedback((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleDownloadCsv = async () => {
    try {
      const token = getAuthToken();
      const resp = await fetch('/api/analytics/export.csv', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'konoha-defenders-report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setFeedback((err as Error).message);
    }
  };

  const handleDownloadPdf = () => {
    if (!data) return;
    exportShinobiPdfReport(character, data.characters, data.summary);
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    try {
      await apiFetch('/api/admin/custom-content', {
        method: 'POST',
        body: JSON.stringify({
          kind: customKind,
          title: customTitle,
          payload:
            customKind === 'mission'
              ? { baseHp: Number(customPower) || 180, rank: 'B' }
              : {
                  basePower: Number(customPower) || 65,
                  chakraCost: 30,
                  rank: 'B',
                  category: customCategory,
                  nature: customNature,
                  accuracyMod: 10,
                  critBonus: 10,
                  requiredLevel: 1,
                  requiredChakraLevel: 1,
                  learnCostRyo: 400,
                  description: `Técnica (${customCategory} · ${customNature}) criada pela Administração de Konoha Defenders.`,
                },
        }),
      });
      setCustomTitle('');
      setFeedback('Conteúdo customizado salvo e publicado no servidor.');
      await Promise.all([loadAnalytics(), onRefreshAll()]);
    } catch (err) {
      setFeedback((err as Error).message);
    }
  };

  const handleBroadcastPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;
    try {
      await apiFetch('/api/admin/broadcast-push', {
        method: 'POST',
        body: JSON.stringify({ title: pushTitle, body: pushBody }),
      });
      setPushTitle('');
      setPushBody('');
      setFeedback('Notificação push enviada para todos os jogadores online!');
    } catch (err) {
      setFeedback((err as Error).message);
    }
  };

  const handlePromoteKage = async (characterId: number) => {
    try {
      await apiFetch('/api/admin/promote-kage', {
        method: 'POST',
        body: JSON.stringify({ characterId }),
      });
      setFeedback('Kage nomeado oficialmente pela Administração!');
      await Promise.all([loadAnalytics(), onRefreshAll()]);
    } catch (err) {
      setFeedback((err as Error).message);
    }
  };

  const handleRevokeKage = async (characterId: number) => {
    try {
      await apiFetch('/api/admin/revoke-kage', {
        method: 'POST',
        body: JSON.stringify({ characterId }),
      });
      setFeedback('Posto de Kage revogado pela Administração.');
      await Promise.all([loadAnalytics(), onRefreshAll()]);
    } catch (err) {
      setFeedback((err as Error).message);
    }
  };

  const handleFlushOfflineQueue = async () => {
    const queue = getQueuedActions();
    if (queue.length === 0) return;
    for (const q of queue) {
      await apiFetch(q.endpoint, {
        method: q.method,
        body: JSON.stringify(q.body),
      });
    }
    clearQueuedActions();
    setQueuedCount(0);
    setFeedback(`${queue.length} ação(ões) offline sincronizada(s) com o banco!`);
    await onRefreshAll();
  };

  if (loading && !data) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-8 text-sm text-[#9CAFA3]">
        Carregando telemetria analítica do banco relacional...
      </div>
    );
  }

  const villageEntries = Object.entries(data?.villageDistribution || {}).sort((a, b) => b[1] - a[1]);
  const maxVillageCount = Math.max(1, ...villageEntries.map(([, v]) => v));
  const filteredCharacters = (data?.characters || []).filter((c) =>
    kageVillageFilter === 'Todas' ? true : c.village === kageVillageFilter
  );

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header & Exports */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#24242E] pb-4">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-[#22C55E]" />
          <h2 className="font-display text-2xl font-bold text-[#F4F4F6]">
            ACP — Administração, Nomeação de Kages & Analytics
          </h2>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#0C0C10] hover:border-[#10B981] border border-[#24242E] text-xs font-medium text-[#F4F4F6] cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            {t(lang, 'exportCsv')}
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] text-xs font-bold text-[#050505] cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            {t(lang, 'exportPdf')}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="px-4 py-2.5 rounded bg-[#0C0C10] border border-[#10B981] text-xs text-[#F4F4F6]">
          {feedback}
        </div>
      )}

      {/* KPI Strip */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-4">
            <div className="text-xs text-[#8E8E9A]">Ninjas Registrados</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-[#F4F4F6] mt-1">
              {data.summary.totalNinjas}
            </div>
          </div>
          <div className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-4">
            <div className="text-xs text-[#8E8E9A]">Ryo em Circulação</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-[#22C55E] mt-1">
              {data.summary.totalRyoCirculation.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-4">
            <div className="text-xs text-[#8E8E9A]">Combates Vencidos</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-[#22C55E] mt-1">
              {data.summary.totalWins}
            </div>
          </div>
          <div className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-4">
            <div className="text-xs text-[#8E8E9A]">Taxa Global de Vitória</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-[#F4F4F6] mt-1">
              {data.summary.winRate}%
            </div>
          </div>
        </div>
      )}

      {/* Charts & Admin Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-[#0C0C10] border border-[#24242E] rounded-lg p-5 space-y-4">
          <h3 className="font-display text-base font-bold text-[#F4F4F6]">
            Distribuição de Shinobis por Vila
          </h3>
          <div className="space-y-3">
            {villageEntries.map(([villageName, count]) => (
              <div key={villageName} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#E4E4EA]">{villageName}</span>
                  <span className="font-mono tabular-nums text-[#22C55E]">{count}</span>
                </div>
                <div className="h-2 bg-[#08080B] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#10B981]"
                    style={{ width: `${Math.round((count / maxVillageCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#24242E] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8E8E9A]">
                Cache Offline Local ({isOnline ? 'Online' : 'Offline'}) · Fila pendente: {queuedCount}
              </span>
              {queuedCount > 0 && isOnline && (
                <button
                  type="button"
                  onClick={handleFlushOfflineQueue}
                  className="px-2.5 py-1 rounded bg-[#10B981] text-[#050505] text-xs font-bold cursor-pointer"
                >
                  Sincronizar Fila
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#0C0C10] border border-[#24242E] rounded-lg p-5 space-y-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#22C55E]" />
            <h3 className="font-display text-base font-bold text-[#F4F4F6]">
              Administração: Missões, Jutsus & Push
            </h3>
          </div>

          <form onSubmit={handleCreateCustom} className="space-y-3 border-b border-[#24242E] pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                aria-label="Tipo de conteúdo customizado"
                value={customKind}
                onChange={(e) => setCustomKind(e.target.value as 'mission' | 'jutsu')}
                className="px-3 py-2 rounded bg-[#08080B] border border-[#24242E] text-xs text-white"
              >
                <option value="mission">Missão Customizada</option>
                <option value="jutsu">Jutsu Customizado</option>
              </select>
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Título da Missão ou Jutsu"
                className="px-3 py-2 rounded bg-[#08080B] border border-[#24242E] text-xs text-white"
              />
              <input
                type="number"
                required
                value={customPower}
                onChange={(e) => setCustomPower(e.target.value)}
                placeholder="Poder / HP"
                className="px-3 py-2 rounded bg-[#08080B] border border-[#24242E] text-xs font-mono text-white"
              />
            </div>
            {customKind === 'jutsu' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <select
                  aria-label="Categoria do Jutsu"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as typeof customCategory)}
                  className="px-3 py-2 rounded bg-[#08080B] border border-[#24242E] text-xs text-white"
                >
                  <option value="Ninjutsu">Ninjutsu</option>
                  <option value="Taijutsu">Taijutsu</option>
                  <option value="Genjutsu">Genjutsu</option>
                  <option value="Kenjutsu">Kenjutsu</option>
                  <option value="Fuinjutsu">Fuinjutsu</option>
                  <option value="Iryou">Iryou (Médico)</option>
                  <option value="Kekkei Genkai">Kekkei Genkai</option>
                </select>
                <select
                  aria-label="Elemento do Jutsu"
                  value={customNature}
                  onChange={(e) => setCustomNature(e.target.value as typeof customNature)}
                  className="px-3 py-2 rounded bg-[#08080B] border border-[#24242E] text-xs text-white"
                >
                  <option value="Katon">Katon (Queimadura)</option>
                  <option value="Raiton">Raiton (Atordoamento)</option>
                  <option value="Suiton">Suiton (Encharcado / Afogamento)</option>
                  <option value="Doton">Doton (Esmagamento / Paralisia)</option>
                  <option value="Fuuton">Fuuton (Laceração)</option>
                  <option value="Yin">Yin (Ilusão / Selo)</option>
                  <option value="Yang">Yang (Regeneração)</option>
                  <option value="Neutro">Neutro</option>
                </select>
              </div>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded bg-[#121218] hover:bg-[#10B981] hover:text-[#050505] border border-[#10B981] text-white text-xs font-semibold cursor-pointer"
            >
              Publicar no Banco de Dados
            </button>
          </form>

          <form onSubmit={handleBroadcastPush} className="space-y-2.5">
            <div className="text-xs font-semibold text-[#E4E4EA]">
              Disparar Notificação Push Global
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                required
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="Título do Alerta"
                className="px-3 py-2 rounded bg-[#08080B] border border-[#24242E] text-xs text-white"
              />
              <input
                type="text"
                required
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                placeholder="Mensagem para os jogadores..."
                className="px-3 py-2 rounded bg-[#08080B] border border-[#24242E] text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer"
            >
              Enviar Push via Socket.io
            </button>
          </form>
        </div>
      </div>

      {/* Admin-Only Kage Appointment & Shinobi Roster */}
      {data && (
        <div className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-5 space-y-4 overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-[#22C55E]" />
                <h3 className="font-display text-base font-bold text-[#F4F4F6]">
                  Nomeação & Escolha Oficial de Kages pela Administração
                </h3>
              </div>
              <p className="text-xs text-[#8E8E9A]">
                Kages não sobem automaticamente por mérito — são apontados ou removidos exclusivamente por esta tabela administrativa.
              </p>
            </div>

            <select
              aria-label="Filtrar shinobis por vila"
              value={kageVillageFilter}
              onChange={(e) => setKageVillageFilter(e.target.value)}
              className="bg-[#08080B] border border-[#24242E] rounded px-3 py-1.5 text-xs text-white"
            >
              <option value="Todas">Todas as Vilas</option>
              {VILLAGES.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#24242E] text-[#8E8E9A]">
                <th className="py-2 pr-4">Ninja</th>
                <th className="py-2 pr-4">Vila</th>
                <th className="py-2 pr-4">Clã</th>
                <th className="py-2 pr-4">Rank</th>
                <th className="py-2 pr-4 text-right">Nível</th>
                <th className="py-2 pr-4 text-right">Mérito</th>
                <th className="py-2 text-right">Escolha da Administração</th>
              </tr>
            </thead>
            <tbody>
              {filteredCharacters.map((c) => (
                <tr key={c.id} className="border-b border-[#1A1A22] hover:bg-[#121218]">
                  <td className="py-2.5 pr-4 font-semibold text-[#F4F4F6]">{c.name}</td>
                  <td className="py-2.5 pr-4 text-[#E4E4EA]">{c.village}</td>
                  <td className="py-2.5 pr-4 text-[#8E8E9A]">{c.clan}</td>
                  <td className="py-2.5 pr-4 text-[#22C55E] font-semibold">{c.rank}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{c.level}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{c.meritPoints}</td>
                  <td className="py-2.5 text-right space-x-2">
                    {!c.isKage ? (
                      <button
                        type="button"
                        onClick={() => handlePromoteKage(c.id)}
                        className="px-3 py-1 rounded bg-[#10B981] hover:bg-[#22C55E] text-[11px] font-bold text-[#050505] cursor-pointer"
                      >
                        Nomear Kage
                      </button>
                    ) : (
                      <>
                        <span className="text-[11px] font-semibold text-[#22C55E] mr-2">Kage Vigente</span>
                        <button
                          type="button"
                          onClick={() => handleRevokeKage(c.id)}
                          className="px-2.5 py-1 rounded bg-[#08080B] hover:border-red-400 border border-red-500/50 text-[11px] text-red-400 cursor-pointer"
                        >
                          Remover Kage
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
