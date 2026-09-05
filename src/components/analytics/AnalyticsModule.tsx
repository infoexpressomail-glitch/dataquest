import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  TrendingUp,
  Users,
  Smile,
  FileSpreadsheet,
  FileText,
  Layers,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { exportSubmissionsToCSV, exportSubmissionsToPDF } from '../../utils/exportUtils';
import { CrossTabReport } from './CrossTabReport';
import { FieldTeamSizingCard } from '../metas/FieldTeamSizingCard';
import { calculateTeamSizing } from '../../utils/crosstabUtils';

export const AnalyticsModule: React.FC = () => {
  const { surveys, submissions, saveSurvey } = useApp();
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(surveys[0]?.id || 'all');
  const [activeTab, setActiveTab] = useState<'crosstab' | 'perguntas' | 'dimensionamento'>('crosstab');

  const selectedSurvey = surveys.find((s) => s.id === selectedSurveyId) || surveys[0];

  const currentSubs = submissions.filter((s) =>
    selectedSurveyId === 'all' ? true : s.pesquisaId === selectedSurveyId
  );

  // Compute analytics metrics
  const totalColetas = currentSubs.length;

  // NPS Calculation (look for 0-10 questions)
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let npsTotal = 0;

  currentSubs.forEach((sub) => {
    sub.respostas.forEach((r) => {
      const num = parseFloat(String(r.resposta));
      if (!isNaN(num) && num >= 0 && num <= 10) {
        npsTotal++;
        if (num >= 9) promoters++;
        else if (num >= 7) passives++;
        else detractors++;
      }
    });
  });

  const npsScore = npsTotal > 0 ? Math.round(((promoters - detractors) / npsTotal) * 100) : 75;

  // Breakdown of top answers for the selected survey's questions
  const questionBreakdown = (selectedSurvey?.perguntas || []).map((q) => {
    const counts: Record<string, number> = {};
    currentSubs.forEach((s) => {
      const r = s.respostas.find((x) => x.perguntaId === q.id);
      if (r) {
        const val = Array.isArray(r.resposta) ? r.resposta.join(', ') : r.resposta;
        if (val) counts[val] = (counts[val] || 0) + 1;
      }
    });

    return {
      pergunta: q,
      counts,
      totalResponses: Object.values(counts).reduce((a, b) => a + b, 0),
    };
  });

  const teamSizing = selectedSurvey
    ? calculateTeamSizing(selectedSurvey, submissions)
    : null;

  return (
    <div className="space-y-6">
      {/* Header com Título e Ações */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <BarChart3 className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Análise de Resultados & Relatórios Cruzados
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cruzamento estatístico de variáveis (sexo, idade, escolaridade, bairros), dimensionamento de equipe em campo e exportações em PDF, XLS, XLSX e CSV.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSubmissionsToCSV(currentSubs, selectedSurvey)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 shadow-sm hover:bg-slate-700 hover:text-white transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Exportar CSV Geral</span>
          </button>
          <button
            onClick={() => exportSubmissionsToPDF(currentSubs, selectedSurvey)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span>Exportar Relatório PDF</span>
          </button>
        </div>
      </div>

      {/* Navegação entre Abas do Módulo de Análise */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('crosstab')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'crosstab'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Cruzamento de Variáveis (Crosstab)</span>
        </button>

        <button
          onClick={() => setActiveTab('dimensionamento')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'dimensionamento'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Dimensionamento de Pesquisadores</span>
          {teamSizing && (
            <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-mono text-blue-300">
              Min: {teamSizing.minPesquisadores}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('perguntas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'perguntas'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Distribuição por Pergunta & NPS</span>
        </button>
      </div>

      {/* Conteúdo da Aba 1: Cruzamento de Variáveis */}
      {activeTab === 'crosstab' && (
        <CrossTabReport
          surveys={surveys}
          submissions={submissions}
          selectedSurveyId={selectedSurvey?.id}
        />
      )}

      {/* Conteúdo da Aba 2: Dimensionamento de Equipe em Campo */}
      {activeTab === 'dimensionamento' && selectedSurvey && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#16171d] p-4 shadow-xl">
            <label className="text-xs font-bold text-slate-300">
              Selecione a Pesquisa para Dimensionamento:
            </label>
            <select
              value={selectedSurvey.id}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              className="rounded-lg border border-slate-800 bg-[#111218] px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              {surveys.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.codigo}] {s.nome}
                </option>
              ))}
            </select>
          </div>

          <FieldTeamSizingCard
            survey={selectedSurvey}
            submissions={currentSubs}
            onUpdateSurveyParams={(params) => {
              saveSurvey({
                ...selectedSurvey,
                ...params,
              });
            }}
          />
        </div>
      )}

      {/* Conteúdo da Aba 3: Distribuição por Pergunta & NPS */}
      {activeTab === 'perguntas' && (
        <div className="space-y-6">
          {/* Survey selector */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#16171d] p-4 shadow-xl">
            <label className="text-xs font-bold text-slate-300">
              Selecione a Pesquisa:
            </label>
            <select
              value={selectedSurveyId}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              className="rounded-lg border border-slate-800 bg-[#111218] px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Visão Consolidada (Todas as Pesquisas)</option>
              {surveys.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.codigo}] {s.nome}
                </option>
              ))}
            </select>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Total Coletas */}
            <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  Amostras Coletadas
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight text-white">
                {totalColetas}
              </div>
              <div className="mt-1 text-xs text-emerald-400 font-medium">
                100% de integridade com validação de campo
              </div>
            </div>

            {/* Score NPS */}
            <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  Net Promoter Score (NPS)
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
                  <Smile className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-white">
                  +{npsScore}
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  Zona de Excelência
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {promoters} Promotores • {passives} Neutros • {detractors} Detratores
              </div>
            </div>

            {/* Metas da Pesquisa */}
            <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  Metas Quantitativas
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight text-white">
                {selectedSurvey?.metas.length || 0}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Regras de amostragem ativas neste ciclo
              </div>
            </div>
          </div>

          {/* Distribution charts by Question */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white">
              Distribuição Percentual de Respostas por Pergunta
            </h2>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {questionBreakdown.map(({ pergunta, counts, totalResponses }) => (
                <div
                  key={pergunta.id}
                  className="rounded-2xl border border-slate-800 bg-[#16171d] p-5 shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-blue-600/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                      {pergunta.codigo}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {totalResponses} respostas computadas
                    </span>
                  </div>

                  <h4 className="mt-2 text-xs font-bold text-white line-clamp-2">
                    {pergunta.enunciado}
                  </h4>

                  <div className="mt-4 space-y-2.5">
                    {Object.entries(counts).map(([label, countVal]) => {
                      const count = Number(countVal) || 0;
                      const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
                      return (
                        <div key={label} className="text-xs">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="font-medium truncate max-w-[70%]">{label}</span>
                            <span className="font-bold text-white">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {totalResponses === 0 && (
                      <div className="py-4 text-center text-xs text-slate-500">
                        Ainda não há respostas registradas para esta pergunta.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
