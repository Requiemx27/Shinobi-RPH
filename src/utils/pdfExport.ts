import { jsPDF } from 'jspdf';
import { CharacterModel, calculateEffectiveStats } from '../game/engine.ts';

export function exportShinobiPdfReport(
  character: CharacterModel,
  rankings: CharacterModel[],
  summary: {
    totalNinjas: number;
    totalRyoCirculation: number;
    totalWins: number;
    totalLosses: number;
    winRate: number;
  }
) {
  const doc = new jsPDF();
  const eff = calculateEffectiveStats(character);

  doc.setFillColor(7, 10, 8);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(74, 222, 128);
  doc.setFontSize(18);
  doc.text('KONOHA DEFENDERS — DOSSIÊ & RELATÓRIO ANALÍTICO', 14, 18);

  doc.setTextColor(236, 253, 245);
  doc.setFontSize(10);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 27);

  doc.setTextColor(20, 24, 32);
  doc.setFontSize(13);
  doc.text(`Ficha Ninja: ${character.name}`, 14, 48);

  doc.setFontSize(10);
  doc.text(`Vila / País: ${character.village} (${character.country})`, 14, 56);
  doc.text(`Clã: ${character.clan} · Kekkei Genkai: ${character.kekkeiGenkai}`, 14, 62);
  doc.text(`Rank: ${character.rank} · Nível ${character.level} · Nível de Chakra ${character.chakraLevel}`, 14, 68);
  doc.text(`Especialização: ${character.specialization} · Natureza: ${character.chakraNature}`, 14, 74);
  doc.text(`Invocação: ${character.summonContract} · Ryo: ${character.ryo} · Mérito: ${character.meritPoints}`, 14, 80);

  doc.setFontSize(12);
  doc.text('Atributos Efetivos em Combate', 14, 94);
  doc.setFontSize(10);
  doc.text(
    `HP Máx: ${eff.maxHp}  |  Chakra Máx: ${eff.maxChakra}  |  Ninjutsu: ${eff.ninjutsu}  |  Taijutsu: ${eff.taijutsu}`,
    14,
    102
  );
  doc.text(
    `Genjutsu: ${eff.genjutsu}  |  Velocidade: ${eff.velocidade}  |  Força: ${eff.forca}  |  Inteligência: ${eff.inteligencia}  |  Resistência: ${eff.resistencia}`,
    14,
    108
  );

  doc.setFontSize(12);
  doc.text('Resumo Analítico Global do Servidor', 14, 124);
  doc.setFontSize(10);
  doc.text(`Ninjas Ativos: ${summary.totalNinjas}  |  Ryo em Circulação: ${summary.totalRyoCirculation}`, 14, 132);
  doc.text(`Combates Vencidos: ${summary.totalWins}  |  Derrotas: ${summary.totalLosses}  |  Taxa de Vitória: ${summary.winRate}%`, 14, 138);

  doc.setFontSize(12);
  doc.text('Top Ranking de Mérito & Kages', 14, 154);
  doc.setFontSize(9.5);
  rankings.slice(0, 10).forEach((r, idx) => {
    const y = 162 + idx * 7;
    doc.text(
      `${idx + 1}. ${r.name} — ${r.village} (${r.rank}) — Nv.${r.level} — ${r.meritPoints} Mérito — ${r.ryo} Ryo`,
      14,
      y
    );
  });

  doc.save(`shinobi-report-${character.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
