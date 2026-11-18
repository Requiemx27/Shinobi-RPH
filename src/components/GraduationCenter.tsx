import React, { useCallback, useEffect, useState } from 'react';
import { Award, Briefcase, CheckCircle2, Crown, GraduationCap, Lock, ScrollText, ShieldAlert } from 'lucide-react';
import {
  BimesterInfo,
  CharacterModel,
  checkProfessionEligibility,
  getGraduationLadderMatrix,
  getProfessionByIdOrName,
  GraduationProgressInfo,
  KAGE_APPOINTABLE_RANKS,
  PublicExamQuestion,
} from '../game/engine.ts';
import { NinjaRank, PROFESSIONS, ProfessionDef } from '../game/narutoData.ts';
import { shinobiAudio } from '../game/sound.ts';
import { apiFetch } from '../utils/api.ts';
import { NinjaAvatar } from './NinjaAvatar.tsx';
import { XpProgressPanel } from './XpProgressPanel.tsx';

interface GraduationStatusResponse {
  bimester: BimesterInfo;
  bimesterAttempted: boolean;
  lastAcademyAttempt: { valueNum: number; meta?: { passed?: boolean; correctCount?: number; total?: number } } | null;
  lastChuninAttempt: { valueNum: number; meta?: { bimesterLabel?: string; passed?: boolean; correctCount?: number; total?: number } } | null;
  villageKage: CharacterModel | null;
  canAppointJonin: boolean;
  isActingAsAdmin: boolean;
  appointableCandidates: CharacterModel[];
  graduationInfo: GraduationProgressInfo;
  academyQuestions: PublicExamQuestion[];
  chuninQuestions: PublicExamQuestion[];
  thresholds: {
    academyPassScore: number;
    chuninPassScore: number;
    chuninMissionRequirement: number;
  };
}

interface GraduationCenterProps {
  character: CharacterModel;
  onRefreshAll: () => Promise<void>;
  onGoToJutsus: () => void;
  onGoToMissions: () => void;
}

export const GraduationCenter: React.FC<GraduationCenterProps> = ({
  character,
  onRefreshAll,
  onGoToJutsus,
  onGoToMissions,
}) => {
  const [status, setStatus] = useState<GraduationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [academyAnswers, setAcademyAnswers] = useState<Record<string, number>>({});
  const [chuninAnswers, setChuninAnswers] = useState<Record<string, number>>({});
  const [selectedJoninRank, setSelectedJoninRank] = useState<Record<number, NinjaRank>>({});
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<GraduationStatusResponse>('/api/graduation/status');
      setStatus(res);
    } catch (err) {
      setFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus, character.rank, character.missionsCompleted, character.xp, character.isKage]);

  const handleSubmitAcademyExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{
        promoted: boolean;
        result: { scorePercent: number; correctCount: number; total: number; passed: boolean };
      }>('/api/graduation/academy-exam', {
        method: 'POST',
        body: JSON.stringify({ answers: academyAnswers }),
      });

      if (res.promoted) {
        shinobiAudio.playLevelUpChime();
        setFeedback({
          text: `Aprovado com ${res.result.scorePercent}% (${res.result.correctCount}/${res.result.total})! Você graduou-se como Genin e desbloqueou jutsus até Rank C.`,
          ok: true,
        });
      } else {
        setFeedback({
          text: `Desempenho insuficiente no Teste da Academia: ${res.result.scorePercent}% (${res.result.correctCount}/${res.result.total}). Necessário mínimo de ${status.thresholds.academyPassScore}%. Revise os fundamentos e tente novamente.`,
          ok: false,
        });
      }
      await Promise.all([onRefreshAll(), loadStatus()]);
    } catch (err) {
      setFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitChuninExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{
        promoted: boolean;
        bimester: BimesterInfo;
        result: { scorePercent: number; correctCount: number; total: number; passed: boolean };
      }>('/api/graduation/chunin-exam', {
        method: 'POST',
        body: JSON.stringify({ answers: chuninAnswers }),
      });

      if (res.promoted) {
        shinobiAudio.playLevelUpChime();
        setFeedback({
          text: `Aprovado no Exame Chunin (${res.bimester.label}) com ${res.result.scorePercent}%! Você foi promovido a Chunin e desbloqueou técnicas até Rank B.`,
          ok: true,
        });
      } else {
        setFeedback({
          text: `Nota no Exame Chunin (${res.bimester.label}): ${res.result.scorePercent}%. Mínimo exigido: ${status.thresholds.chuninPassScore}%. Tentativa bimestral registrada — conclua ${status.thresholds.chuninMissionRequirement} missões ou aguarde o próximo bimestre.`,
          ok: false,
        });
      }
      await Promise.all([onRefreshAll(), loadStatus()]);
    } catch (err) {
      setFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromoteChuninMissions = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiFetch('/api/graduation/chunin-missions', { method: 'POST' });
      shinobiAudio.playLevelUpChime();
      setFeedback({
        text: 'Promoção concedida por mérito em campo! Você atingiu a meta de missões e tornou-se Chunin (Rank B liberado).',
        ok: true,
      });
      await Promise.all([onRefreshAll(), loadStatus()]);
    } catch (err) {
      setFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppointJonin = async (targetId: number, currentRank: string) => {
    setSubmitting(true);
    setFeedback(null);
    const chosen =
      selectedJoninRank[targetId] ||
      (currentRank === 'Chunin' ? 'Jonin' : 'Jounin Experiente');
    try {
      const res = await apiFetch<{ character: CharacterModel }>('/api/kage/appoint-jonin', {
        method: 'POST',
        body: JSON.stringify({ characterId: targetId, targetRank: chosen }),
      });
      shinobiAudio.playLevelUpChime();
      setFeedback({
        text: `${res.character.name} foi nomeado oficialmente como ${res.character.rank}!`,
        ok: true,
      });
      await Promise.all([onRefreshAll(), loadStatus()]);
    } catch (err) {
      setFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectProfession = async (professionId: string) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ character: CharacterModel; profession: string }>(
        '/api/characters/profession',
        {
          method: 'POST',
          body: JSON.stringify({ professionId }),
        }
      );
      if (res.profession === 'Nenhuma') {
        shinobiAudio.playUiClick();
        setFeedback({
          text: 'Você deixou sua profissão shinobi ativa. Os bônus foram removidos.',
          ok: true,
        });
      } else {
        shinobiAudio.playLevelUpChime();
        setFeedback({
          text: `Profissão "${res.profession}" assumida oficialmente! Seus bônus táticos já estão ativos em combate.`,
          ok: true,
        });
      }
      await Promise.all([onRefreshAll(), loadStatus()]);
    } catch (err) {
      setFeedback({ text: (err as Error).message, ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const ladder = getGraduationLadderMatrix(character.rank);
  const activeProfession = getProfessionByIdOrName(character.profession);
  const chuninProfessions = PROFESSIONS.filter((p) => p.availableInTiers.includes('Chunin'));
  const tokubetsuProfessions = PROFESSIONS.filter((p) =>
    p.availableInTiers.includes('Tokubetsu Jonin')
  );

  const renderProfessionCard = (prof: ProfessionDef, tierLabel: string) => {
    const elig = checkProfessionEligibility(character, prof);
    return (
      <article
        key={`${tierLabel}-${prof.id}`}
        className={`p-4 rounded-lg border flex flex-col justify-between gap-3 ${
          elig.isActive
            ? 'bg-[#121218] border-[#10B981]'
            : 'bg-[#08080B] border-[#24242E]'
        }`}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#22C55E]">
                {prof.division}
              </span>
              <h3 className="font-display text-base font-bold text-[#F4F4F6]">{prof.name}</h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono border shrink-0 ${
                elig.isActive
                  ? 'bg-[#10B981] border-[#10B981] text-[#050505] font-bold'
                  : elig.eligible
                  ? 'bg-[#050505] border-[#10B981] text-[#22C55E]'
                  : 'bg-[#050505] border-amber-500/45 text-[#F59E0B]'
              }`}
            >
              {elig.isActive ? 'Ativa' : `Mín. ${prof.minRank}`}
            </span>
          </div>

          <p className="text-xs text-[#8E8E9A] leading-relaxed">{prof.description}</p>

          <div className="p-2.5 rounded bg-[#050505] border border-[#24242E] text-[11px] font-mono text-[#E4E4EA]">
            {prof.combatBonusSummary}
          </div>
        </div>

        <div className="pt-2 border-t border-[#24242E] flex items-center justify-between gap-2">
          {elig.isActive ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSelectProfession('none')}
              className="w-full py-2 px-3 rounded bg-[#121218] hover:border-red-500/60 border border-[#24242E] text-xs font-semibold text-[#F4F4F6] cursor-pointer"
            >
              Deixar Profissão Atual
            </button>
          ) : elig.eligible ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSelectProfession(prof.id)}
              className="w-full py-2 px-3 rounded bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-50 text-xs font-bold text-[#050505] cursor-pointer"
            >
              Assumir {prof.name}
            </button>
          ) : (
            <div className="w-full inline-flex items-center gap-1.5 text-[11px] font-mono text-[#F59E0B]">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>{elig.reason}</span>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header + Visual XP / Chakra Progress */}
      <section className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#24242E] pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#22C55E]">
              <GraduationCap className="w-4 h-4" />
              <span>HIERARQUIA SHINOBI & EXAMES OFICIAIS</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-[#F4F4F6]">
              Centro de Graduação, Experiência & Requisitos de Jutsu
            </h1>
            <p className="text-xs text-[#8E8E9A] max-w-3xl">
              As patentes seguem o cânone ninja: Estudantes prestam o Teste da Academia, Genins avançam no Exame Chunin Bimestral ou por volume de missões, e Jounins são escolhidos pelo Kage da vila.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onGoToMissions}
              className="px-3.5 py-2 rounded-md bg-[#08080B] hover:border-[#10B981] border border-[#24242E] text-xs font-semibold text-[#F4F4F6] cursor-pointer whitespace-nowrap"
            >
              Missões de Campo
            </button>
            <button
              type="button"
              onClick={onGoToJutsus}
              className="px-3.5 py-2 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              Abrir Dojo Jutsus
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-[#08080B] border border-[#24242E] rounded-lg p-4">
            <XpProgressPanel character={character} showJutsuCaps />
          </div>

          <div className="lg:col-span-5 bg-[#08080B] border border-[#10B981] rounded-lg p-4 space-y-2.5">
            <div className="text-xs font-semibold text-[#22C55E]">
              Próximo Objetivo de Graduação
            </div>
            <div className="text-sm font-bold text-[#F4F4F6]">
              {status?.graduationInfo.nextPromotionTitle || 'Carregando meta...'}
            </div>
            <p className="text-xs text-[#8E8E9A] leading-relaxed">
              {status?.graduationInfo.nextPromotionRule || ''}
            </p>
            <div className="pt-2 border-t border-[#24242E] flex items-center justify-between text-xs font-mono tabular-nums text-[#E4E4EA]">
              <span>Missões Concluídas: {character.missionsCompleted}</span>
              <span>
                Kage ({character.village}):{' '}
                <strong className="text-[#22C55E]">
                  {status?.villageKage ? status.villageKage.name : 'Vago (Admin)'}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {feedback && (
        <div
          className={`px-4 py-3 rounded-md border text-xs ${
            feedback.ok
              ? 'bg-[#0C0C10] border-[#10B981] text-[#F4F4F6]'
              : 'bg-[#0C0C10] border-red-500/60 text-red-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Visual Matrix of Jutsu Learning Requirements per Graduation */}
      <section className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#24242E] pb-3">
          <ScrollText className="w-4 h-4 text-[#22C55E]" />
          <h2 className="font-display text-lg font-bold text-[#F4F4F6]">
            Requisitos de Técnicas por Graduação
          </h2>
        </div>

        <div className="space-y-2.5">
          {ladder.map((tier) => (
            <div
              key={tier.id}
              className={`p-3.5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                tier.isCurrent
                  ? 'bg-[#121218] border-[#10B981]'
                  : 'bg-[#08080B] border-[#24242E]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#F4F4F6]">{tier.rankLabel}</span>
                  {tier.isCurrent && (
                    <span className="text-[11px] font-mono font-bold text-[#22C55E]">
                      · Sua Graduação Atual
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#8E8E9A]">{tier.requirementSummary}</div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono tabular-nums shrink-0 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[#22C55E]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Liberado: {tier.unlockedRanks.join(', ')}
                </span>
                {tier.blockedRanks.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[#F59E0B]">
                    <Lock className="w-3.5 h-3.5" />
                    Bloqueado: {tier.blockedRanks.join(', ')}
                  </span>
                ) : (
                  <span className="text-[#22C55E] font-semibold">Sem bloqueios de patente</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Active Graduation Path Action */}
      {loading && !status ? (
        <div className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-6 text-xs text-[#8E8E9A]">
          Carregando exames e conselho shinobi...
        </div>
      ) : (
        status && (
          <>
            {/* 1. Estudante -> Teste da Academia Ninja */}
            {character.rank === 'Estudante da Academia' && (
              <section className="bg-[#0C0C10] border border-[#10B981] rounded-lg p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24242E] pb-3">
                  <div className="space-y-1">
                    <h2 className="font-display text-lg font-bold text-[#F4F4F6]">
                      Teste da Academia Ninja (Estudante → Genin)
                    </h2>
                    <p className="text-xs text-[#8E8E9A]">
                      Apresente desempenho satisfatório (mínimo de {status.thresholds.academyPassScore}% de acertos) para conquistar sua bandana e desbloqueear técnicas de Rank C.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#F59E0B]">
                    Atualmente limitado até Rank D
                  </span>
                </div>

                <form onSubmit={handleSubmitAcademyExam} className="space-y-4">
                  {status.academyQuestions.map((q, idx) => (
                    <div key={q.id} className="p-4 rounded-lg bg-[#08080B] border border-[#24242E] space-y-2.5">
                      <div className="text-[11px] font-mono text-[#22C55E]">
                        Questão {idx + 1} · {q.topic}
                      </div>
                      <div className="text-sm font-medium text-[#F4F4F6]">{q.prompt}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const selected = academyAnswers[q.id] === optIdx;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                setAcademyAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                              }
                              className={`text-left px-3 py-2 rounded border text-xs transition-colors cursor-pointer ${
                                selected
                                  ? 'bg-[#121218] border-[#10B981] text-[#22C55E] font-semibold'
                                  : 'bg-[#050505] border-[#24242E] text-[#8E8E9A] hover:text-white'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-[#8E8E9A]">
                      Respondidas: {Object.keys(academyAnswers).length} / {status.academyQuestions.length}
                    </span>
                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        Object.keys(academyAnswers).length < status.academyQuestions.length
                      }
                      className="px-5 py-2.5 rounded-md bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-50 text-[#050505] text-xs font-bold cursor-pointer"
                    >
                      {submitting ? 'Corrigindo Prova...' : 'Finalizar Teste da Academia'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* 2. Genin -> Exame Chunin Bimestral OU X Missões */}
            {character.rank === 'Genin' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Path A: Bimonthly Chunin Exam */}
                <section className="lg:col-span-8 bg-[#0C0C10] border border-[#24242E] rounded-lg p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#24242E] pb-3">
                    <div className="space-y-1">
                      <h2 className="font-display text-lg font-bold text-[#F4F4F6]">
                        Via 1 · Exame Chunin Bimestral ({status.bimester.label})
                      </h2>
                      <p className="text-xs text-[#8E8E9A]">
                        Acontece 1 vez por bimestre. Obtenha nota mínima de {status.thresholds.chuninPassScore}% nas provas teórica e tática para ascender a Chunin (Rank B).
                      </p>
                    </div>
                    <span className="font-mono text-xs text-[#22C55E] tabular-nums">
                      Restam {status.bimester.daysRemaining}d no bimestre
                    </span>
                  </div>

                  {status.bimesterAttempted ? (
                    <div className="p-4 rounded-lg bg-[#08080B] border border-amber-500/40 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#F59E0B]">
                        <ShieldAlert className="w-4 h-4" />
                        Tentativa de Exame Chunin já utilizada neste bimestre ({status.bimester.key})
                      </div>
                      <p className="text-xs text-[#8E8E9A]">
                        Cada Genin pode prestar o Exame Chunin oficial uma única vez por bimestre. Você ainda pode conquistar a promoção imediatamente concluindo {status.thresholds.chuninMissionRequirement} missões de campo ao lado!
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitChuninExam} className="space-y-4">
                      {status.chuninQuestions.map((q, idx) => (
                        <div key={q.id} className="p-4 rounded-lg bg-[#08080B] border border-[#24242E] space-y-2.5">
                          <div className="text-[11px] font-mono text-[#22C55E]">
                            Etapa {idx + 1} · {q.topic}
                          </div>
                          <div className="text-sm font-medium text-[#F4F4F6]">{q.prompt}</div>
                          <div className="grid grid-cols-1 gap-2 pt-1">
                            {q.options.map((opt, optIdx) => {
                              const selected = chuninAnswers[q.id] === optIdx;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() =>
                                    setChuninAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                                  }
                                  className={`text-left px-3 py-2 rounded border text-xs transition-colors cursor-pointer ${
                                    selected
                                      ? 'bg-[#121218] border-[#10B981] text-[#22C55E] font-semibold'
                                      : 'bg-[#050505] border-[#24242E] text-[#8E8E9A] hover:text-white'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-[#8E8E9A]">
                          Etapas respondidas: {Object.keys(chuninAnswers).length} / {status.chuninQuestions.length}
                        </span>
                        <button
                          type="submit"
                          disabled={
                            submitting ||
                            Object.keys(chuninAnswers).length < status.chuninQuestions.length
                          }
                          className="px-5 py-2.5 rounded-md bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-50 text-[#050505] text-xs font-bold cursor-pointer"
                        >
                          {submitting ? 'Avaliando Exame...' : 'Enviar Exame Chunin Bimestral'}
                        </button>
                      </div>
                    </form>
                  )}
                </section>

                {/* Path B: X Completed Missions */}
                <section className="lg:col-span-4 bg-[#0C0C10] border border-[#24242E] rounded-lg p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#22C55E]">
                      <Award className="w-4 h-4" />
                      <span>VIA 2 · EXPERIÊNCIA DE CAMPO</span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-[#F4F4F6]">
                      Promoção por {status.thresholds.chuninMissionRequirement} Missões
                    </h2>
                    <p className="text-xs text-[#8E8E9A] leading-relaxed">
                      Genins que comprovarem serviço ativo contínuo na vila concluindo{' '}
                      <strong className="text-[#F4F4F6]">
                        {status.thresholds.chuninMissionRequirement} missões
                      </strong>{' '}
                      recebem promoção direta a Chunin sem depender da data do exame bimestral.
                    </p>

                    <div className="p-3.5 rounded-lg bg-[#08080B] border border-[#24242E] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#E4E4EA]">Missões Concluídas</span>
                        <span className="font-mono font-bold tabular-nums text-[#22C55E]">
                          {status.graduationInfo.missionsCompleted} / {status.thresholds.chuninMissionRequirement} ({status.graduationInfo.missionsProgressPercent}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-[#050505] overflow-hidden">
                        <div
                          className="h-full bg-[#10B981]"
                          style={{ width: `${status.graduationInfo.missionsProgressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={submitting || !status.graduationInfo.canPromoteChuninByMissions}
                      onClick={handlePromoteChuninMissions}
                      className="w-full py-2.5 px-4 rounded-md bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-40 text-[#050505] text-xs font-bold cursor-pointer"
                    >
                      {status.graduationInfo.canPromoteChuninByMissions
                        ? 'Reivindicar Promoção a Chunin'
                        : `Faltam ${Math.max(0, status.thresholds.chuninMissionRequirement - status.graduationInfo.missionsCompleted)} missões`}
                    </button>
                    <button
                      type="button"
                      onClick={onGoToMissions}
                      className="w-full py-2 px-4 rounded-md bg-[#08080B] hover:border-[#10B981] border border-[#24242E] text-xs font-medium text-[#F4F4F6] cursor-pointer"
                    >
                      Ir para Arena de Missões
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* 3. Chunin / Jonin -> Appointed by Village Kage */}
            {(character.rank === 'Chunin' ||
              character.rank === 'Tokubetsu Jonin' ||
              character.rank === 'Jonin' ||
              character.rank === 'Jounin Experiente' ||
              character.rank === 'Kage') && (
              <section className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24242E] pb-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 text-xs font-mono text-[#22C55E]">
                      <Crown className="w-4 h-4" />
                      <span>NOMEAÇÃO DE JOUNINS PELO KAGE</span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-[#F4F4F6]">
                      Gabinete do Kage · Promoção a Tokubetsu Jonin, Jonin e Jounin Experiente
                    </h2>
                    <p className="text-xs text-[#8E8E9A]">
                      Diferente da Academia e do Exame Chunin, as patentes de Jounin não dependem de prova automática — os shinobis são apontados e escolhidos pelo Kage da vila.
                    </p>
                  </div>

                  {status.villageKage && (
                    <div className="text-xs text-[#E4E4EA]">
                      Kage de {character.village}:{' '}
                      <strong className="text-[#22C55E]">{status.villageKage.name}</strong>
                    </div>
                  )}
                </div>

                {!status.canAppointJonin ? (
                  <div className="p-4 rounded-lg bg-[#08080B] border border-[#24242E] text-xs text-[#E4E4EA] space-y-1.5">
                    <div>
                      Sua patente atual é <strong className="text-[#22C55E]">{character.rank}</strong>.
                    </div>
                    <p className="text-[#8E8E9A]">
                      Somente o Kage nomeado de{' '}
                      <strong className="text-[#F4F4F6]">{character.village}</strong>{' '}
                      {status.villageKage ? `(${status.villageKage.name})` : ''} pode avaliar seu histórico de missões e nomeá-lo como Tokubetsu Jonin, Jonin ou Jounin Experiente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {status.isActingAsAdmin && (
                      <div className="p-3 rounded bg-[#08080B] border border-[#10B981] text-xs text-[#8E8E9A]">
                        Você está com permissão administrativa de Conselho Kage. Abaixo estão os ninjas Chunin ou superiores elegíveis para nomeação de Jounin.
                      </div>
                    )}

                    {status.appointableCandidates.length === 0 ? (
                      <div className="p-4 rounded bg-[#08080B] border border-[#24242E] text-xs text-[#8E8E9A]">
                        Nenhum Chunin ou Jonin elegível encontrado na fila de nomeação no momento.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#24242E] text-[#8E8E9A]">
                              <th className="py-2 pr-4">Shinobi</th>
                              <th className="py-2 pr-4">Vila</th>
                              <th className="py-2 pr-4">Patente Atual</th>
                              <th className="py-2 pr-4 text-right">Nível · Missões</th>
                              <th className="py-2 pr-4">Patente Escolhida</th>
                              <th className="py-2 text-right">Ação do Kage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {status.appointableCandidates.map((cand) => {
                              const defaultChoice =
                                selectedJoninRank[cand.id] ||
                                (cand.rank === 'Chunin' ? 'Jonin' : 'Jounin Experiente');
                              return (
                                <tr key={cand.id} className="border-b border-[#1A1A22] hover:bg-[#121218]">
                                  <td className="py-2.5 pr-4">
                                    <div className="flex items-center gap-2.5">
                                      <NinjaAvatar src={cand.avatarUrl} alt={cand.name} sizeClass="w-8 h-8" />
                                      <span className="font-semibold text-[#F4F4F6]">{cand.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 pr-4 text-[#E4E4EA]">{cand.village}</td>
                                  <td className="py-2.5 pr-4 text-[#22C55E] font-semibold">{cand.rank}</td>
                                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-[#8E8E9A]">
                                    Nv.{cand.level} · {cand.missionsCompleted} mis.
                                  </td>
                                  <td className="py-2.5 pr-4">
                                    <select
                                      aria-label={`Patente Jounin para ${cand.name}`}
                                      value={defaultChoice}
                                      onChange={(e) =>
                                        setSelectedJoninRank((prev) => ({
                                          ...prev,
                                          [cand.id]: e.target.value as NinjaRank,
                                        }))
                                      }
                                      className="bg-[#08080B] border border-[#24242E] rounded px-2.5 py-1 text-xs text-white"
                                    >
                                      {KAGE_APPOINTABLE_RANKS.map((r) => (
                                        <option key={r} value={r}>
                                          {r}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-2.5 text-right">
                                    <button
                                      type="button"
                                      disabled={submitting}
                                      onClick={() => handleAppointJonin(cand.id, cand.rank)}
                                      className="px-3 py-1.5 rounded bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-50 text-[11px] font-bold text-[#050505] cursor-pointer whitespace-nowrap"
                                    >
                                      Nomear Jounin
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </>
        )
      )}
      {/* Shinobi Professions System (Chunin & Tokubetsu Jonin) */}
      <section className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#24242E] pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#22C55E]">
              <Briefcase className="w-4 h-4" />
              <span>CARREIRAS & DIVISÕES DA VILA</span>
            </div>
            <h2 className="font-display text-lg font-bold text-[#F4F4F6]">
              Sistema de Profissões Shinobi
            </h2>
            <p className="text-xs text-[#8E8E9A] max-w-3xl">
              Ao atingir a patente de <strong className="text-[#F4F4F6]">Chunin</strong> ou{' '}
              <strong className="text-[#F4F4F6]">Tokubetsu Jonin</strong>, o shinobi pode se especializar em uma divisão oficial da vila com bônus permanentes de atributos e combate.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#08080B] border border-[#10B981] text-xs space-y-1 shrink-0">
            <div className="text-[#8E8E9A]">Profissão Ativa:</div>
            <div className="font-display font-bold text-[#22C55E]">
              {activeProfession ? activeProfession.name : 'Nenhuma selecionada'}
            </div>
          </div>
        </div>

        {/* Tier 1: Profissões para Chunin */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-[#24242E] pb-2">
            <h3 className="font-display text-sm font-bold text-[#F4F4F6]">
              Profissões para Chunin (Requisito mínimo: Chunin)
            </h3>
            <span className="text-[11px] font-mono text-[#22C55E]">
              ANBU · Guarda do Portão · Sensei · Médico Ninja
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {chuninProfessions.map((p) => renderProfessionCard(p, 'chunin'))}
          </div>
        </div>

        {/* Tier 2: Profissões para Tokubetsu Jonin */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2 border-b border-[#24242E] pb-2">
            <h3 className="font-display text-sm font-bold text-[#F4F4F6]">
              Profissões para Tokubetsu Jonin (Requisito mínimo: Tokubetsu Jonin)
            </h3>
            <span className="text-[11px] font-mono text-[#22C55E]">
              Interrogador · Espião · Rastreador · Médico Ninja
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {tokubetsuProfessions.map((p) => renderProfessionCard(p, 'tokubetsu'))}
          </div>
        </div>
      </section>
    </div>
  );
};
