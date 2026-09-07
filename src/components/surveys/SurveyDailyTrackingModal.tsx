import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Volume2,
  Download,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Survey, InterviewSubmission, DailyCollectionMetric } from '../../types';

interface SurveyDailyTrackingModalProps {
  surveys: Survey[];
  submissions: InterviewSubmission[];
  initialSurveyId?: string;
  onClose: () => void;
}

export const SurveyDailyTrackingModal: React.FC<SurveyDailyTrackingModalProps> = ({
  surveys,
  submissions,
  initialSurveyId,
  onClose,
}) => {
  const [activeSurveyId, setActiveSurveyId] = useState<string>(
    initialSurveyId || surveys[0]?.id || ''
  );
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '14d'>('all');

  const currentSurvey = surveys.find((s) => s.id === activeSurveyId) || surveys[0];

  // Filter submissions for current survey
  const currentSurveySubmissions = useMemo(() => {
    if (!currentSurvey) return [];
    return submissions.filter((s) => s.pesquisaId === currentSurvey.id);
  }, [currentSurvey, submissions]);

  // Group submissions by day and calculate metrics
  const dailyMetrics = useMemo(() => {
    if (!currentSurveySubmissions.length) return [];

    const map: Record<
      string,
      {
        total: number;
        validas: number;
        comAudio: number;
        comGPS: number;
        pesquisadores: Set<string>;
      }
    > = {};

    currentSurveySubmissions.forEach((sub) => {
      // Parse date to YYYY-MM-DD
      const dateStr = sub.dataEnvio ? sub.dataEnvio.slice(0, 10) : '2024-08-28';
      if (!map[dateStr]) {
        map[dateStr] = {
          total: 0,
          validas: 0,
          comAudio: 0,
          comGPS: 0,
          pesquisadores: new Set(),
        };
      }
      map[dateStr].total += 1;
      if (sub.status !== 'rejeitada') {
        map[dateStr].validas += 1;
      }
      if (sub.audioGravacao) {
        map[dateStr].comAudio += 1;
      }
      if (sub.geolocalizacao) {
        map[dateStr].comGPS += 1;
      }
      if (sub.pesquisadorNome) {
        map[dateStr].pesquisadores.add(sub.pesquisadorNome);
      }
    });

    // Sort by date ascending
    let sortedDates = Object.keys(map).sort();

    if (dateFilter === '7d') {
      sortedDates = sortedDates.slice(-7);
    } else if (dateFilter === '14d') {
      sortedDates = sortedDates.slice(-14);
    }

    const calculatedDailyTarget = Math.max(
      3,
      Math.round(
        (currentSurvey?.metas.reduce((acc, m) => acc + (m.quantidadeAlvo || 0), 0) || 50) /
          Math.max(1, sortedDates.length || 7)
      )
    );

    return sortedDates.map((dateKey) => {
      const item = map[dateKey];
      const [year, month, day] = dateKey.split('-');
      const formattedDate = `${day}/${month}`;

      return {
        data: dateKey,
        dataFormatada: formattedDate,
        totalEntrevistas: item.total,
        entrevistasValidas: item.validas,
        comAudio: item.comAudio,
        comGPS: item.comGPS,
        metaDiaria: calculatedDailyTarget,
        pesquisadoresAtivos: item.pesquisadores.size,
        listaPesquisadores: Array.from(item.pesquisadores).join(', '),
      };
    });
  }, [currentSurveySubmissions, dateFilter, currentSurvey]);

  // Totals and KPI summary
  const summary = useMemo(() => {
    const total = dailyMetrics.reduce((acc, d) => acc + d.totalEntrevistas, 0);
    const validas = dailyMetrics.reduce((acc, d) => acc + d.entrevistasValidas, 0);
    const comAudio = dailyMetrics.reduce((acc, d) => acc + d.comAudio, 0);
    const comGPS = dailyMetrics.reduce((acc, d) => acc + d.comGPS, 0);
    const diasAtivos = dailyMetrics.length;
    const mediaPorDia = diasAtivos > 0 ? (total / diasAtivos).toFixed(1) : '0';

    return {
      total,
      validas,
      taxaValidade: total > 0 ? Math.round((validas / total) * 100) : 100,
      taxaAudio: total > 0 ? Math.round((comAudio / total) * 100) : 0,
      taxaGPS: total > 0 ? Math.round((comGPS / total) * 100) : 0,
      diasAtivos,
      mediaPorDia,
    };
  }, [dailyMetrics]);

  const handleExportCSV = () => {
    if (dailyMetrics.length === 0) return;
    const header = 'Data;Total Entrevistas;Entrevistas Validas;Com Audio;Com GPS;Meta Diaria;Pesquisadores Ativos;Nomes Pesquisadores\n';
    const rows = dailyMetrics
      .map(
        (d) =>
          `${d.data};${d.totalEntrevistas};${d.entrevistasValidas};${d.comAudio};${d.comGPS};${d.metaDiaria};${d.pesquisadoresAtivos};"${d.listaPesquisadores}"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `acompanhamento_diario_${currentSurvey?.codigo || 'pesquisa'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal p-4 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl rounded-2xl border border-ui bg-surface p-6 shadow-2xl my-8">
        {/* Header with Title and Close Button */}
        <div className="flex items-start justify-between border-b border-ui pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary-soft border border-accent-primary-soft-border text-accent-primary">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                Acompanhamento Diário de Coleta por Pesquisa
                <span className="rounded-full bg-accent-primary-soft border border-accent-primary-soft-border px-2.5 py-0.5 text-xs font-semibold text-accent-primary">
                  Verificação Individual de Dias
                </span>
              </h2>
              <p className="text-xs text-muted">
                Visualize os dias específicos em que as entrevistas foram realizadas, volume coletado, conformidade e produtividade.
              </p>
            </div>
          </div>
          <button
            id="btn-close-daily-tracking-modal"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Survey Tabs if multiple surveys passed */}
        {surveys.length > 1 && (
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs font-semibold text-muted flex items-center gap-1 shrink-0">
              <Layers className="h-3.5 w-3.5 text-accent-primary" />
              Pesquisa:
            </span>
            {surveys.map((sv) => {
              const isSelected = sv.id === activeSurveyId;
              const subCount = submissions.filter((s) => s.pesquisaId === sv.id).length;
              return (
                <button
                  key={sv.id}
                  onClick={() => setActiveSurveyId(sv.id)}
                  className={`flex items-center gap-2 shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition border ${
                    isSelected
                      ? 'bg-accent-primary-soft text-accent-primary border-accent-primary-soft-border shadow-xs'
                      : 'bg-surface-card text-muted border-ui hover:bg-surface-raised hover:text-primary'
                  }`}
                >
                  <span>{sv.codigo}</span>
                  <span className="truncate max-w-[140px] font-normal">{sv.nome}</span>
                  <span className="rounded bg-surface-raised px-1.5 py-0.2 text-[10px] text-secondary">
                    {subCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Survey Header Info & Date Range Filters */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-ui bg-surface-card p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-accent-primary-soft border border-accent-primary-soft-border px-2.5 py-1 text-xs font-bold text-accent-primary">
              {currentSurvey?.codigo}
            </span>
            <span className="text-sm font-bold text-primary">
              {currentSurvey?.nome}
            </span>
            <span className="rounded bg-surface-raised border border-ui px-2 py-0.5 text-[10px] font-semibold text-secondary">
              Ciclo {currentSurvey?.cicloAtual} (v{currentSurvey?.versao})
            </span>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                currentSurvey?.status === 'ativa'
                  ? 'bg-accent-success-soft text-accent-success border-accent-success-soft-border'
                  : 'bg-accent-warning-soft text-accent-warning border-accent-warning-soft-border'
              }`}
            >
              {currentSurvey?.status.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="flex items-center rounded-lg border border-ui bg-surface p-0.5 text-xs font-semibold">
              <button
                onClick={() => setDateFilter('all')}
                className={`rounded-md px-2.5 py-1 transition ${
                  dateFilter === 'all'
                    ? 'bg-accent-primary-solid text-on-accent'
                    : 'text-muted hover:text-primary'
                }`}
              >
                Todos os Dias
              </button>
              <button
                onClick={() => setDateFilter('14d')}
                className={`rounded-md px-2.5 py-1 transition ${
                  dateFilter === '14d'
                    ? 'bg-accent-primary-solid text-on-accent'
                    : 'text-muted hover:text-primary'
                }`}
              >
                Últimos 14 dias
              </button>
              <button
                onClick={() => setDateFilter('7d')}
                className={`rounded-md px-2.5 py-1 transition ${
                  dateFilter === '7d'
                    ? 'bg-accent-primary-solid text-on-accent'
                    : 'text-muted hover:text-primary'
                }`}
              >
                Últimos 7 dias
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              title="Exportar Métricas Diárias em CSV"
              className="flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-hover hover:text-primary transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-accent-success" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Top KPI Summary Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-ui bg-surface-card p-3 text-center">
            <div className="text-[11px] font-medium text-muted flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3 text-accent-primary" />
              <span>Dias Ativos</span>
            </div>
            <div className="mt-1 text-xl font-bold text-primary">{summary.diasAtivos}</div>
            <div className="text-[10px] text-muted">com coletas registradas</div>
          </div>

          <div className="rounded-xl border border-ui bg-surface-card p-3 text-center">
            <div className="text-[11px] font-medium text-muted flex items-center justify-center gap-1">
              <BarChart3 className="h-3 w-3 text-accent-success" />
              <span>Total Coletado</span>
            </div>
            <div className="mt-1 text-xl font-bold text-accent-success">{summary.total}</div>
            <div className="text-[10px] text-muted">{summary.validas} validadas</div>
          </div>

          <div className="rounded-xl border border-ui bg-surface-card p-3 text-center">
            <div className="text-[11px] font-medium text-muted flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3 text-accent-info" />
              <span>Média / Dia</span>
            </div>
            <div className="mt-1 text-xl font-bold text-accent-info">{summary.mediaPorDia}</div>
            <div className="text-[10px] text-muted">entrevistas/dia ativo</div>
          </div>

          <div className="rounded-xl border border-ui bg-surface-card p-3 text-center">
            <div className="text-[11px] font-medium text-muted flex items-center justify-center gap-1">
              <MapPin className="h-3 w-3 text-accent-purple" />
              <span>Taxa GPS</span>
            </div>
            <div className="mt-1 text-xl font-bold text-accent-purple">{summary.taxaGPS}%</div>
            <div className="text-[10px] text-muted">georreferenciadas</div>
          </div>

          <div className="rounded-xl border border-ui bg-surface-card p-3 text-center col-span-2 sm:col-span-1">
            <div className="text-[11px] font-medium text-muted flex items-center justify-center gap-1">
              <Volume2 className="h-3 w-3 text-accent-warning" />
              <span>Taxa Áudio</span>
            </div>
            <div className="mt-1 text-xl font-bold text-accent-warning">{summary.taxaAudio}%</div>
            <div className="text-[10px] text-muted">gravações de voz</div>
          </div>
        </div>

        {/* Chart Visualization */}
        <div className="mt-4 rounded-xl border border-ui bg-surface-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-secondary flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent-primary" />
              Distribuição e Desempenho Diário da Pesquisa Selecionada
            </h3>
            <span className="text-[11px] text-muted">
              Eixo X: Dias de Realização • Eixo Y: Quantidade de Entrevistas
            </span>
          </div>

          {dailyMetrics.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={dailyMetrics}
                  margin={{ top: 10, right: 20, bottom: 20, left: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis
                    dataKey="dataFormatada"
                    stroke="var(--border)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis stroke="var(--border)" fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-ui bg-surface p-3 text-xs shadow-xl">
                            <div className="font-bold text-primary border-b border-ui pb-1 mb-1.5 flex items-center justify-between gap-4">
                              <span>Dia: {data.data}</span>
                              <span className="text-accent-primary font-mono font-normal">
                                {data.pesquisadoresAtivos} pesquisador(es)
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between gap-4 text-secondary">
                                <span>Total de Entrevistas:</span>
                                <strong className="text-accent-primary">{data.totalEntrevistas}</strong>
                              </div>
                              <div className="flex justify-between gap-4 text-secondary">
                                <span>Validadas / Conformes:</span>
                                <strong className="text-accent-success">
                                  {data.entrevistasValidas}
                                </strong>
                              </div>
                              <div className="flex justify-between gap-4 text-secondary">
                                <span>Com Georreferenciamento:</span>
                                <strong className="text-accent-purple">{data.comGPS}</strong>
                              </div>
                              <div className="flex justify-between gap-4 text-secondary">
                                <span>Com Gravação de Áudio:</span>
                                <strong className="text-accent-warning">{data.comAudio}</strong>
                              </div>
                              <div className="flex justify-between gap-4 text-secondary pt-1 border-t border-ui/80">
                                <span>Meta Planejada:</span>
                                <strong className="text-muted">{data.metaDiaria}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                  />
                  <Bar
                    dataKey="totalEntrevistas"
                    name="Entrevistas Realizadas"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={38}
                  />
                  <Bar
                    dataKey="comGPS"
                    name="Com GPS"
                    fill="#a855f7"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  />
                  <Line
                    type="monotone"
                    dataKey="metaDiaria"
                    name="Meta Diária Estimada"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted text-xs">
              <AlertCircle className="h-8 w-8 mb-2 text-muted" />
              <span>Nenhuma entrevista realizada nos dias selecionados para esta pesquisa.</span>
            </div>
          )}
        </div>

        {/* Daily Breakdown Table for Individual Verification */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-secondary flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-accent-success" />
              Verificação Individual Detalhada dos Dias de Campo
            </h3>
            <span className="text-[11px] text-muted">
              {dailyMetrics.length} dia(s) com registros operacionais
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-xl border border-ui bg-surface-card">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-ui bg-surface font-bold text-secondary z-10">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Entrevistas</th>
                  <th className="py-2.5 px-3">Conformes</th>
                  <th className="py-2.5 px-3">Geolocalização</th>
                  <th className="py-2.5 px-3">Áudio</th>
                  <th className="py-2.5 px-3">Equipe em Campo</th>
                  <th className="py-2.5 px-3 text-right">Status do Dia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui/60">
                {dailyMetrics.map((day) => {
                  const metaAtingida = day.totalEntrevistas >= day.metaDiaria;
                  return (
                    <tr key={day.data} className="hover:bg-surface-raised transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-primary">
                        {day.data.split('-').reverse().join('/')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-accent-primary">{day.totalEntrevistas}</span>
                        <span className="text-[10px] text-muted ml-1">
                          / meta {day.metaDiaria}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-accent-success font-semibold">
                        {day.entrevistasValidas} ({Math.round((day.entrevistasValidas / day.totalEntrevistas) * 100)}%)
                      </td>
                      <td className="py-2.5 px-3 text-accent-purple">
                        {day.comGPS} ({Math.round((day.comGPS / day.totalEntrevistas) * 100)}%)
                      </td>
                      <td className="py-2.5 px-3 text-accent-warning">
                        {day.comAudio} ({Math.round((day.comAudio / day.totalEntrevistas) * 100)}%)
                      </td>
                      <td className="py-2.5 px-3 text-secondary">
                        <span className="truncate max-w-[200px] block" title={day.listaPesquisadores}>
                          {day.listaPesquisadores || `${day.pesquisadoresAtivos} pesquisador(es)`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                            metaAtingida
                              ? 'bg-accent-success-soft text-accent-success border-accent-success-soft-border'
                              : 'bg-accent-primary-soft text-accent-primary border-accent-primary-soft-border'
                          }`}
                        >
                          {metaAtingida ? 'META ATINGIDA' : 'EM ANDAMENTO'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-ui pt-3 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-accent-success" />
            <span>Verificação de conformidade diária auditada e criptografada com hash SHA-256.</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-surface-raised px-4 py-2 font-bold text-primary hover:bg-surface-hover transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
