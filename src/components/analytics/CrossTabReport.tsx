import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  ArrowLeftRight,
  Filter,
  BarChart2,
  Table as TableIcon,
  Users,
  Target,
  FileText,
  HelpCircle,
  TrendingUp,
  Layers,
  Sparkles,
  Calendar,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Survey, InterviewSubmission } from '../../types';
import {
  getSurveyCrossVariables,
  generateCrossTab,
  calculateTeamSizing,
  exportCrossTabToCSV,
  exportCrossTabToXLSX,
  exportCrossTabToXLS,
  exportCrossTabToPDF,
  CrossTabVariable,
} from '../../utils/crosstabUtils';

interface CrossTabReportProps {
  surveys: Survey[];
  submissions: InterviewSubmission[];
  selectedSurveyId?: string;
}

// Paleta de cores de alto contraste para o gráfico
const CHART_COLORS = [
  '#10b981', // Esmeralda 500
  '#059669', // Esmeralda 600
  '#d97706', // Âmbar 600
  '#7c3aed', // Roxo 600
  '#e11d48', // Rosa 600
  '#0891b2', // Ciano 600
  '#4f46e5', // Índigo 600
  '#ea580c', // Laranja 600
  '#64748b', // Slate 500
];

export const CrossTabReport: React.FC<CrossTabReportProps> = ({
  surveys,
  submissions,
  selectedSurveyId,
}) => {
  // 1. Pesquisa Selecionada
  const [currentSurveyId, setCurrentSurveyId] = useState<string>(() => {
    if (selectedSurveyId) return selectedSurveyId;
    return surveys[0]?.id || '';
  });

  const activeSurvey = useMemo(() => {
    return surveys.find((s) => s.id === currentSurveyId) || surveys[0];
  }, [surveys, currentSurveyId]);

  // Submissões vinculadas à pesquisa ativa
  const activeSubmissions = useMemo(() => {
    if (!activeSurvey) return [];
    return submissions.filter(
      (s) => s.pesquisaId === activeSurvey.id || s.codigoPesquisa === activeSurvey.codigo
    );
  }, [submissions, activeSurvey]);

  // Variáveis disponíveis para cruzamento
  const availableVariables = useMemo(() => {
    if (!activeSurvey) return [];
    return getSurveyCrossVariables(activeSurvey, activeSubmissions);
  }, [activeSurvey, activeSubmissions]);

  // 2. Variáveis Selecionadas para o Cruzamento (Linha x Coluna)
  // Padrão inicial: Sexo (Linha) x Faixa Etária (Coluna)
  const [rowVarId, setRowVarId] = useState<string>('demo_sexo');
  const [colVarId, setColVarId] = useState<string>('demo_faixa_etaria');

  // Modo de exibição da tabela de contingência
  const [viewMode, setViewMode] = useState<'both' | 'count' | 'rowPct' | 'colPct'>('both');

  // Tipo de Gráfico (Empilhado ou Agrupado)
  const [chartStacked, setChartStacked] = useState<boolean>(true);

  // Inverter Eixos
  const handleSwapAxes = () => {
    const temp = rowVarId;
    setRowVarId(colVarId);
    setColVarId(temp);
  };

  // Objeto das variáveis selecionadas
  const selectedRowVar = useMemo(() => {
    return (
      availableVariables.find((v) => v.id === rowVarId) ||
      availableVariables[0] || { id: 'demo_sexo', label: 'Sexo', tipo: 'demografica' }
    );
  }, [availableVariables, rowVarId]);

  const selectedColVar = useMemo(() => {
    return (
      availableVariables.find((v) => v.id === colVarId) ||
      availableVariables[1] || { id: 'demo_faixa_etaria', label: 'Faixa Etária', tipo: 'demografica' }
    );
  }, [availableVariables, colVarId]);

  // 3. Matriz de Cruzamento
  const crossTabMatrix = useMemo(() => {
    if (!activeSurvey) return null;
    return generateCrossTab(activeSubmissions, selectedRowVar, selectedColVar, activeSurvey);
  }, [activeSubmissions, selectedRowVar, selectedColVar, activeSurvey]);

  // 4. Dimensionamento de Equipe e Amostragem
  const teamSizing = useMemo(() => {
    if (!activeSurvey) return null;
    return calculateTeamSizing(activeSurvey, activeSubmissions);
  }, [activeSurvey, activeSubmissions]);

  if (!activeSurvey) {
    return (
      <div className="rounded-2xl border border-ui bg-surface p-8 text-center text-muted">
        Nenhuma pesquisa disponível para geração de relatórios cruzados.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra de Controles: Seleção de Pesquisa e Variáveis Cruzadas */}
      <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-ui pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
                <Layers className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-primary">
                Cruzamento de Dados & Análise Estatística (Crosstab)
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted">
              Cruze variáveis sociodemográficas (sexo, idade, escolaridade, bairros) com perguntas do questionário e exporte os dados.
            </p>
          </div>

          {/* Seleção de Pesquisa */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted shrink-0">Pesquisa:</span>
            <select
              value={currentSurveyId}
              onChange={(e) => setCurrentSurveyId(e.target.value)}
              className="rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-semibold text-primary focus:border-emerald-500 focus:outline-none"
            >
              {surveys.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.codigo}] {s.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Seleção dos Eixos: Linha x Coluna */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Eixo das Linhas */}
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-accent-primary mb-1 flex items-center gap-1.5">
              <span>Variável 1 (Eixo das Linhas):</span>
            </label>
            <select
              value={rowVarId}
              onChange={(e) => setRowVarId(e.target.value)}
              className="w-full rounded-lg border border-ui bg-surface-raised px-3 py-2 text-xs font-medium text-primary focus:border-emerald-500 focus:outline-none"
            >
              <optgroup label="Variáveis Sociodemográficas">
                {availableVariables
                  .filter((v) => v.tipo === 'demografica' || v.tipo === 'geografica')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Perguntas do Questionário">
                {availableVariables
                  .filter((v) => v.tipo === 'pergunta')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Botão de Inverter Eixos */}
          <div className="md:col-span-2 flex justify-center pt-2 md:pt-4">
            <button
              onClick={handleSwapAxes}
              title="Inverter Eixos (Trocar Linhas por Colunas)"
              className="inline-flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-primary hover:bg-surface-hover hover:text-primary transition-colors"
            >
              <ArrowLeftRight className="h-4 w-4 text-accent-primary" />
              <span>Inverter</span>
            </button>
          </div>

          {/* Eixo das Colunas */}
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-accent-success mb-1 flex items-center gap-1.5">
              <span>Variável 2 (Eixo das Colunas):</span>
            </label>
            <select
              value={colVarId}
              onChange={(e) => setColVarId(e.target.value)}
              className="w-full rounded-lg border border-ui bg-surface-raised px-3 py-2 text-xs font-medium text-primary focus:border-emerald-500 focus:outline-none"
            >
              <optgroup label="Variáveis Sociodemográficas">
                {availableVariables
                  .filter((v) => v.tipo === 'demografica' || v.tipo === 'geografica')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Perguntas do Questionário">
                {availableVariables
                  .filter((v) => v.tipo === 'pergunta')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Barra de Ações: Exportações em 4 Formatos */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ui/80 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted">Visualização da Tabela:</span>
            <div className="flex rounded-lg border border-ui bg-surface-raised p-0.5">
              <button
                onClick={() => setViewMode('both')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  viewMode === 'both' ? 'bg-accent-primary-solid text-on-accent shadow-xs' : 'text-muted hover:text-primary'
                }`}
              >
                N + % Linha
              </button>
              <button
                onClick={() => setViewMode('count')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  viewMode === 'count' ? 'bg-accent-primary-solid text-on-accent shadow-xs' : 'text-muted hover:text-primary'
                }`}
              >
                Apenas Contagem (N)
              </button>
              <button
                onClick={() => setViewMode('rowPct')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  viewMode === 'rowPct' ? 'bg-accent-primary-solid text-on-accent shadow-xs' : 'text-muted hover:text-primary'
                }`}
              >
                % da Linha
              </button>
              <button
                onClick={() => setViewMode('colPct')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  viewMode === 'colPct' ? 'bg-accent-primary-solid text-on-accent shadow-xs' : 'text-muted hover:text-primary'
                }`}
              >
                % da Coluna
              </button>
            </div>
          </div>

          {/* Botões de Exportação */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-secondary">Exportar:</span>

            {/* PDF */}
            <button
              onClick={() => {
                if (crossTabMatrix && teamSizing) {
                  exportCrossTabToPDF(crossTabMatrix, activeSurvey, teamSizing);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent-danger-soft-border bg-accent-danger-soft px-3 py-1.5 text-xs font-bold text-accent-danger hover:bg-accent-danger-solid-hover hover:text-on-accent transition-all shadow-xs"
              title="Baixar Relatório Executivo Oficial em PDF"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>PDF</span>
            </button>

            {/* XLSX (Excel Moderno) */}
            <button
              onClick={() => {
                if (crossTabMatrix && teamSizing) {
                  exportCrossTabToXLSX(crossTabMatrix, activeSurvey, activeSubmissions, teamSizing);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent-success-soft-border bg-accent-success-soft px-3 py-1.5 text-xs font-bold text-accent-success hover:bg-accent-success-solid-hover hover:text-on-accent transition-all shadow-xs"
              title="Baixar Planilha Excel (.xlsx) com múltiplas abas"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>XLSX</span>
            </button>

            {/* XLS (Compatível / SPSS) */}
            <button
              onClick={() => {
                if (crossTabMatrix && teamSizing) {
                  exportCrossTabToXLS(crossTabMatrix, activeSurvey, activeSubmissions, teamSizing);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft px-3 py-1.5 text-xs font-bold text-accent-primary hover:bg-accent-primary-solid-hover hover:text-on-accent transition-all shadow-xs"
              title="Baixar formato compatível (.xls) para SPSS e estatística"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>XLS</span>
            </button>

            {/* CSV */}
            <button
              onClick={() => {
                if (crossTabMatrix) {
                  exportCrossTabToCSV(crossTabMatrix, activeSurvey, viewMode);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-bold text-primary hover:bg-surface-hover hover:text-primary transition-all"
              title="Baixar arquivo delimitado por ponto-e-vírgula (.csv)"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Banner Informativo de Plano Amostral & Dimensionamento de Pesquisadores */}
      {teamSizing && (
        <div className="rounded-2xl border border-ui bg-surface p-4 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                    Plano Amostral & Quantidade Mínima de Pesquisadores em Campo
                  </h4>
                  <span className="rounded bg-accent-success-soft border border-accent-success-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-success">
                    {teamSizing.isSuficiente ? 'Equipe Suficiente' : 'Abaixo do Mínimo'}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Meta Total: <strong className="text-primary">{teamSizing.totalMetaColetas}</strong> coletas |
                  Metas de Sexo: Masculino (<strong className="text-accent-primary">{teamSizing.metaSexoMasculino}</strong>) + Feminino (<strong className="text-accent-danger">{teamSizing.metaSexoFeminino}</strong>) ={' '}
                  <strong className="text-primary">{teamSizing.somaMetasSexo}</strong> (equivalente a 100% das coletas).
                  Demais variáveis (idade, escolaridade, bairros) seguem o plano estratificado.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 rounded-xl border border-ui bg-surface-raised px-4 py-2.5">
              <div>
                <span className="text-[11px] font-semibold text-muted block">
                  Pesquisadores Mínimos:
                </span>
                <span className="text-xl font-black text-primary">
                  {teamSizing.minPesquisadores} <span className="text-xs text-muted font-normal">pesquisadores</span>
                </span>
              </div>
              <div className="border-l border-ui pl-3">
                <span className="text-[11px] font-semibold text-muted block">
                  Alocados:
                </span>
                <span className={`text-xl font-black ${teamSizing.isSuficiente ? 'text-accent-success' : 'text-accent-warning'}`}>
                  {teamSizing.pesquisadoresAlocados}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Contingência (Matriz Cruzada) */}
      {crossTabMatrix && (
        <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-accent-primary" />
              <h3 className="text-sm font-bold text-primary">
                Matriz de Contingência: {crossTabMatrix.rowVar.label} × {crossTabMatrix.colVar.label}
              </h3>
            </div>
            <span className="text-xs text-muted font-medium">
              Base de Cálculo: <strong className="text-primary">{crossTabMatrix.grandTotal}</strong> entrevistas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ui bg-surface-raised text-secondary">
                  <th className="py-3 px-4 font-bold text-primary uppercase tracking-wider">
                    {crossTabMatrix.rowVar.label}
                  </th>
                  {crossTabMatrix.cols.map((colHeader) => (
                    <th
                      key={colHeader}
                      className="py-3 px-3 font-bold text-center text-primary uppercase tracking-wider"
                    >
                      {colHeader}
                    </th>
                  ))}
                  <th className="py-3 px-4 font-black text-center text-primary bg-surface-raised">
                    TOTAL
                  </th>
                  <th className="py-3 px-4 font-black text-center text-accent-primary bg-surface-raised">
                    % TOTAL
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui/60">
                {crossTabMatrix.rows.map((rowLabel, rIdx) => {
                  const rowTot = crossTabMatrix.rowTotals[rIdx];
                  const rowPctTot = Math.round((rowTot / crossTabMatrix.grandTotal) * 1000) / 10;

                  return (
                    <tr
                      key={rowLabel}
                      className={`transition-colors hover:bg-surface-raised ${
                        rIdx % 2 === 0 ? 'bg-surface-raised' : 'bg-transparent'
                      }`}
                    >
                      {/* Célula de Cabeçalho da Linha */}
                      <td className="py-2.5 px-4 font-bold text-primary whitespace-nowrap">
                        {rowLabel}
                      </td>

                      {/* Células de Dados Cruzados */}
                      {crossTabMatrix.cols.map((colLabel, cIdx) => {
                        const count = crossTabMatrix.data[rIdx][cIdx];
                        const rPct = crossTabMatrix.rowPercentages[rIdx][cIdx];
                        const cPct = crossTabMatrix.colPercentages[rIdx][cIdx];
                        const tPct = crossTabMatrix.totalPercentages[rIdx][cIdx];

                        return (
                          <td
                            key={colLabel}
                            className="py-2.5 px-3 text-center whitespace-nowrap"
                          >
                            {viewMode === 'both' && (
                              <div>
                                <span className="font-bold text-primary">{count}</span>{' '}
                                <span className="text-[11px] text-accent-primary font-semibold">({rPct}%)</span>
                              </div>
                            )}
                            {viewMode === 'count' && (
                              <span className="font-bold text-primary">{count}</span>
                            )}
                            {viewMode === 'rowPct' && (
                              <span className="font-bold text-accent-primary">{rPct}%</span>
                            )}
                            {viewMode === 'colPct' && (
                              <span className="font-bold text-accent-success">{cPct}%</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total da Linha */}
                      <td className="py-2.5 px-4 text-center font-bold text-primary bg-surface-raised">
                        {rowTot}
                      </td>

                      {/* % Total da Linha */}
                      <td className="py-2.5 px-4 text-center font-bold text-accent-primary bg-surface-raised">
                        {rowPctTot}%
                      </td>
                    </tr>
                  );
                })}

                {/* Linha Final de Total Geral */}
                <tr className="border-t-2 border-ui bg-surface-raised font-black text-primary">
                  <td className="py-3 px-4 uppercase">TOTAL GERAL</td>
                  {crossTabMatrix.cols.map((colLabel, cIdx) => {
                    const cTot = crossTabMatrix.colTotals[cIdx];
                    const cPct = Math.round((cTot / crossTabMatrix.grandTotal) * 1000) / 10;

                    return (
                      <td key={colLabel} className="py-3 px-3 text-center whitespace-nowrap">
                        <span>{cTot}</span>{' '}
                        <span className="text-[11px] text-accent-success font-bold">({cPct}%)</span>
                      </td>
                    );
                  })}
                  <td className="py-3 px-4 text-center text-primary bg-surface-hover/60">
                    {crossTabMatrix.grandTotal}
                  </td>
                  <td className="py-3 px-4 text-center text-accent-primary bg-surface-hover/60">
                    100.0%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visualização Gráfica Interativa dos Dados Cruzados */}
      {crossTabMatrix && crossTabMatrix.chartData.length > 0 && (
        <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-accent-success" />
              <h3 className="text-sm font-bold text-primary">
                Distribuição Gráfica: {crossTabMatrix.rowVar.label} por {crossTabMatrix.colVar.label}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">Tipo de Gráfico:</span>
              <button
                onClick={() => setChartStacked(true)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  chartStacked ? 'bg-accent-primary-solid text-on-accent' : 'border border-ui text-muted hover:text-primary'
                }`}
              >
                Barras Empilhadas
              </button>
              <button
                onClick={() => setChartStacked(false)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  !chartStacked ? 'bg-accent-primary-solid text-on-accent' : 'border border-ui text-muted hover:text-primary'
                }`}
              >
                Barras Agrupadas
              </button>
            </div>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={crossTabMatrix.chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" opacity={0.5} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}
                  stroke="var(--border)"
                />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="var(--border)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#cbd5e1' }}
                />
                {crossTabMatrix.cols.map((colName, idx) => (
                  <Bar
                    key={colName}
                    dataKey={colName}
                    name={colName}
                    stackId={chartStacked ? 'stackA' : undefined}
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    radius={chartStacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
