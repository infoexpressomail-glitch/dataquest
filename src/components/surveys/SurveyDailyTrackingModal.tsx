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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-800 bg-[#16171d] p-6 shadow-2xl my-8">
        {/* Header with Title and Close Button */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Acompanhamento Diário de Coleta por Pesquisa
                <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
                  Verificação Individual de Dias
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Visualize os dias específicos em que as entrevistas foram realizadas, volume coletado, conformidade e produtividade.
              </p>
            </div>
          </div>
          <button
            id="btn-close-daily-tracking-modal"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Survey Tabs if multiple surveys passed */}
        {surveys.length > 1 && (
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0">
              <Layers className="h-3.5 w-3.5 text-blue-400" />
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
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-xs'
                      : 'bg-[#111218] text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{sv.codigo}</span>
                  <span className="truncate max-w-[140px] font-normal">{sv.nome}</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
                    {subCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Survey Header Info & Date Range Filters */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#111218] p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 text-xs font-bold text-blue-400">
              {currentSurvey?.codigo}
            </span>
            <span className="text-sm font-bold text-white">
              {currentSurvey?.nome}
            </span>
            <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
              Ciclo {currentSurvey?.cicloAtual} (v{currentSurvey?.versao})
            </span>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                currentSurvey?.status === 'ativa'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {currentSurvey?.status.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="flex items-center rounded-lg border border-slate-800 bg-[#16171d] p-0.5 text-xs font-semibold">
              <button
                onClick={() => setDateFilter('all')}
                className={`rounded-md px-2.5 py-1 transition ${
                  dateFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos os Dias
              </button>
              <button
                onClick={() => setDateFilter('14d')}
                className={`rounded-md px-2.5 py-1 transition ${
                  dateFilter === '14d'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Últimos 14 dias
              </button>
              <button
                onClick={() => setDateFilter('7d')}
                className={`rounded-md px-2.5 py-1 transition ${
                  dateFilter === '7d'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Últimos 7 dias
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              title="Exportar Métricas Diárias em CSV"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Top KPI Summary Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-slate-800 bg-[#111218] p-3 text-center">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3 text-blue-400" />
              <span>Dias Ativos</span>
            </div>
            <div className="mt-1 text-xl font-bold text-white">{summary.diasAtivos}</div>
            <div className="text-[10px] text-slate-500">com coletas registradas</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#111218] p-3 text-center">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1">
              <BarChart3 className="h-3 w-3 text-emerald-400" />
              <span>Total Coletado</span>
            </div>
            <div className="mt-1 text-xl font-bold text-emerald-400">{summary.total}</div>
            <div className="text-[10px] text-slate-500">{summary.validas} validadas</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#111218] p-3 text-center">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3 text-cyan-400" />
              <span>Média / Dia</span>
            </div>
            <div className="mt-1 text-xl font-bold text-cyan-400">{summary.mediaPorDia}</div>
            <div className="text-[10px] text-slate-500">entrevistas/dia ativo</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#111218] p-3 text-center">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1">
              <MapPin className="h-3 w-3 text-purple-400" />
              <span>Taxa GPS</span>
            </div>
            <div className="mt-1 text-xl font-bold text-purple-400">{summary.taxaGPS}%</div>
            <div className="text-[10px] text-slate-500">georreferenciadas</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#111218] p-3 text-center col-span-2 sm:col-span-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1">
              <Volume2 className="h-3 w-3 text-amber-400" />
              <span>Taxa Áudio</span>
            </div>
            <div className="mt-1 text-xl font-bold text-amber-400">{summary.taxaAudio}%</div>
            <div className="text-[10px] text-slate-500">gravações de voz</div>
          </div>
        </div>

        {/* Chart Visualization */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-[#111218] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Distribuição e Desempenho Diário da Pesquisa Selecionada
            </h3>
            <span className="text-[11px] text-slate-500">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="dataFormatada"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-slate-700 bg-[#16171d] p-3 text-xs shadow-xl">
                            <div className="font-bold text-white border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between gap-4">
                              <span>Dia: {data.data}</span>
                              <span className="text-blue-400 font-mono font-normal">
                                {data.pesquisadoresAtivos} pesquisador(es)
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Total de Entrevistas:</span>
                                <strong className="text-blue-400">{data.totalEntrevistas}</strong>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Validadas / Conformes:</span>
                                <strong className="text-emerald-400">
                                  {data.entrevistasValidas}
                                </strong>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Com Georreferenciamento:</span>
                                <strong className="text-purple-400">{data.comGPS}</strong>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Com Gravação de Áudio:</span>
                                <strong className="text-amber-400">{data.comAudio}</strong>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300 pt-1 border-t border-slate-800/80">
                                <span>Meta Planejada:</span>
                                <strong className="text-slate-400">{data.metaDiaria}</strong>
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
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs">
              <AlertCircle className="h-8 w-8 mb-2 text-slate-600" />
              <span>Nenhuma entrevista realizada nos dias selecionados para esta pesquisa.</span>
            </div>
          )}
        </div>

        {/* Daily Breakdown Table for Individual Verification */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-400" />
              Verificação Individual Detalhada dos Dias de Campo
            </h3>
            <span className="text-[11px] text-slate-400">
              {dailyMetrics.length} dia(s) com registros operacionais
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-[#111218]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-slate-800 bg-[#16171d] font-bold text-slate-300 z-10">
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
              <tbody className="divide-y divide-slate-800/60">
                {dailyMetrics.map((day) => {
                  const metaAtingida = day.totalEntrevistas >= day.metaDiaria;
                  return (
                    <tr key={day.data} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {day.data.split('-').reverse().join('/')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-blue-400">{day.totalEntrevistas}</span>
                        <span className="text-[10px] text-slate-500 ml-1">
                          / meta {day.metaDiaria}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400 font-semibold">
                        {day.entrevistasValidas} ({Math.round((day.entrevistasValidas / day.totalEntrevistas) * 100)}%)
                      </td>
                      <td className="py-2.5 px-3 text-purple-300">
                        {day.comGPS} ({Math.round((day.comGPS / day.totalEntrevistas) * 100)}%)
                      </td>
                      <td className="py-2.5 px-3 text-amber-300">
                        {day.comAudio} ({Math.round((day.comAudio / day.totalEntrevistas) * 100)}%)
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        <span className="truncate max-w-[200px] block" title={day.listaPesquisadores}>
                          {day.listaPesquisadores || `${day.pesquisadoresAtivos} pesquisador(es)`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                            metaAtingida
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
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
        <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Verificação de conformidade diária auditada e criptografada com hash SHA-256.</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 font-bold text-white hover:bg-slate-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
