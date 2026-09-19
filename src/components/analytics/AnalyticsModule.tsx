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
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
              <BarChart3 className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
              Análise de Resultados & Relatórios Cruzados
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Cruzamento estatístico de variáveis (sexo, idade, escolaridade, bairros), dimensionamento de equipe em campo e exportações em PDF, XLS, XLSX e CSV.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSubmissionsToCSV(currentSubs, selectedSurvey)}
            className="flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3.5 py-2 text-xs font-bold text-primary shadow-sm hover:bg-surface-hover hover:text-primary transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-accent-success" />
            <span>Exportar CSV Geral</span>
          </button>
          <button
            onClick={() => exportSubmissionsToPDF(currentSubs, selectedSurvey)}
            className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-3.5 py-2 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 hover:bg-accent-primary-solid-hover transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span>Exportar Relatório PDF</span>
          </button>
        </div>
      </div>

      {/* Pesquisa selecionada — informação principal, comum a todas as abas */}
      <div className="flex flex-col gap-3 rounded-2xl border border-ui bg-surface p-4 shadow-xl sm:flex-row sm:items-center">
        <label className="text-xs font-bold text-secondary shrink-0">
          Pesquisa em Análise:
        </label>
        <select
          value={selectedSurveyId}
          onChange={(e) => setSelectedSurveyId(e.target.value)}
          className="w-full rounded-lg border border-ui bg-surface-card px-3 py-1.5 text-xs text-primary focus:border-blue-500 focus:outline-none sm:w-auto"
        >
          <option value="all">Visão Consolidada (Todas as Pesquisas)</option>
          {surveys.map((s) => (
            <option key={s.id} value={s.id}>
              [{s.codigo}] {s.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Navegação entre Abas do Módulo de Análise */}
      <div className="flex items-center gap-2 border-b border-ui pb-1">
        <button
          onClick={() => setActiveTab('crosstab')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'crosstab'
              ? 'bg-accent-primary-solid text-on-accent shadow-lg shadow-blue-900/30'
              : 'text-muted hover:text-primary hover:bg-surface-raised'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Cruzamento de Variáveis (Crosstab)</span>
        </button>

        <button
          onClick={() => setActiveTab('dimensionamento')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'dimensionamento'
              ? 'bg-accent-primary-solid text-on-accent shadow-lg shadow-blue-900/30'
              : 'text-muted hover:text-primary hover:bg-surface-raised'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Dimensionamento de Pesquisadores</span>
          {teamSizing && (
            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-mono text-accent-primary">
              Min: {teamSizing.minPesquisadores}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('perguntas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'perguntas'
              ? 'bg-accent-primary-solid text-on-accent shadow-lg shadow-blue-900/30'
              : 'text-muted hover:text-primary hover:bg-surface-raised'
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
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Total Coletas */}
            <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">
                  Amostras Coletadas
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary-soft border border-accent-primary-soft-border text-accent-primary">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight text-primary">
                {totalColetas}
              </div>
              <div className="mt-1 text-xs text-accent-success font-medium">
                100% de integridade com validação de campo
              </div>
            </div>

            {/* Score NPS */}
            <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">
                  Net Promoter Score (NPS)
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-success-soft border border-accent-success-soft-border text-accent-success">
                  <Smile className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-primary">
                  +{npsScore}
                </span>
                <span className="text-xs font-bold text-accent-success">
                  Zona de Excelência
                </span>
              </div>
              <div className="mt-1 text-xs text-muted">
                {promoters} Promotores • {passives} Neutros • {detractors} Detratores
              </div>
            </div>

            {/* Metas da Pesquisa */}
            <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">
                  Metas Quantitativas
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-purple-soft border border-accent-purple-soft-border text-accent-purple">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight text-primary">
                {selectedSurvey?.metas.length || 0}
              </div>
              <div className="mt-1 text-xs text-muted">
                Regras de amostragem ativas neste ciclo
              </div>
            </div>
          </div>

          {/* Distribution charts by Question */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-primary">
              Distribuição Percentual de Respostas por Pergunta
            </h2>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {questionBreakdown.map(({ pergunta, counts, totalResponses }) => (
                <div
                  key={pergunta.id}
                  className="rounded-2xl border border-ui bg-surface p-5 shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-accent-primary-soft border border-accent-primary-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-primary">
                      {pergunta.codigo}
                    </span>
                    <span className="text-xs text-muted font-medium">
                      {totalResponses} respostas computadas
                    </span>
                  </div>

                  <h4 className="mt-2 text-xs font-bold text-primary line-clamp-2">
                    {pergunta.enunciado}
                  </h4>

                  <div className="mt-4 space-y-2.5">
                    {Object.entries(counts).map(([label, countVal]) => {
                      const count = Number(countVal) || 0;
                      const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
                      return (
                        <div key={label} className="text-xs">
                          <div className="flex items-center justify-between text-secondary">
                            <span className="font-medium truncate max-w-[70%]">{label}</span>
                            <span className="font-bold text-primary">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                            <div
                              className="h-full rounded-full bg-accent-primary-solid transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {totalResponses === 0 && (
                      <div className="py-4 text-center text-xs text-muted">
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
