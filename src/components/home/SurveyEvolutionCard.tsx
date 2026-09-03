import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  CheckCircle2,
  Volume2,
  MapPin,
  Users,
  ChevronDown,
  ArrowUpRight,
  Sparkles,
  Smartphone,
  Activity,
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
import { Survey, InterviewSubmission } from '../../types';
import { useApp } from '../../context/AppContext';

interface SurveyEvolutionCardProps {
  surveys: Survey[];
  submissions: InterviewSubmission[];
}

export const SurveyEvolutionCard: React.FC<SurveyEvolutionCardProps> = ({
  surveys,
  submissions,
}) => {
  const { setActiveModule, setFilterSurveyId } = useApp();

  // Encontrar a pesquisa em andamento por padrão (ativa ou com flag emAndamento)
  const defaultSurvey = useMemo(() => {
    const inProgress = surveys.find((s) => s.status === 'ativa' && s.emAndamento);
    if (inProgress) return inProgress;
    const firstActive = surveys.find((s) => s.status === 'ativa');
    if (firstActive) return firstActive;
    return surveys[0] || null;
  }, [surveys]);

  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(defaultSurvey?.id || '');
  const [periodFilter, setPeriodFilter] = useState<'all' | '7d' | '14d'>('all');

  // Atualiza a seleção se a lista de pesquisas mudar e nada estiver selecionado
  React.useEffect(() => {
    if (!selectedSurveyId && defaultSurvey) {
      setSelectedSurveyId(defaultSurvey.id);
    }
  }, [defaultSurvey, selectedSurveyId]);

  const selectedSurvey = useMemo(() => {
    return surveys.find((s) => s.id === selectedSurveyId) || defaultSurvey;
  }, [surveys, selectedSurveyId, defaultSurvey]);

  // Filtrar entrevistas da pesquisa selecionada
  const surveySubmissions = useMemo(() => {
    if (!selectedSurvey) return [];
    return submissions.filter((s) => s.pesquisaId === selectedSurvey.id);
  }, [selectedSurvey, submissions]);

  // Calcular métricas diárias de evolução
  const evolutionData = useMemo(() => {
    if (!surveySubmissions.length) return [];

    const map: Record<
      string,
      {
        total: number;
        comAudio: number;
        comGPS: number;
        pesquisadores: Set<string>;
      }
    > = {};

    surveySubmissions.forEach((sub) => {
      const dateStr = sub.dataHora ? sub.dataHora.slice(0, 10) : '2025-06-01';
      if (!map[dateStr]) {
        map[dateStr] = {
          total: 0,
          comAudio: 0,
          comGPS: 0,
          pesquisadores: new Set(),
        };
      }
      map[dateStr].total += 1;
      if (sub.audioGravacao) map[dateStr].comAudio += 1;
      if (sub.geolocalizacao) map[dateStr].comGPS += 1;
      if (sub.pesquisadorNome) map[dateStr].pesquisadores.add(sub.pesquisadorNome);
    });

    let sortedDates = Object.keys(map).sort();

    if (periodFilter === '7d') {
      sortedDates = sortedDates.slice(-7);
    } else if (periodFilter === '14d') {
      sortedDates = sortedDates.slice(-14);
    }

    let runningTotal = 0;
    return sortedDates.map((dateKey) => {
      const item = map[dateKey];
      runningTotal += item.total;
      const parts = dateKey.split('-');
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateKey;

      return {
        dataIso: dateKey,
        dataFormatada: formattedDate,
        coletasDoDia: item.total,
        coletasAcumuladas: runningTotal,
        comAudio: item.comAudio,
        comGPS: item.comGPS,
        pesquisadoresAtivos: item.pesquisadores.size,
      };
    });
  }, [surveySubmissions, periodFilter]);

  // Indicadores síntese
  const totalColetadas = surveySubmissions.length;
  const totalComAudio = surveySubmissions.filter((s) => s.audioGravacao).length;
  const totalComGPS = surveySubmissions.filter((s) => s.geolocalizacao).length;
  const totalDias = evolutionData.length;
  const mediaDiaria = totalDias > 0 ? (totalColetadas / totalDias).toFixed(1) : '0';
  const percentAudio = totalColetadas > 0 ? Math.round((totalComAudio / totalColetadas) * 100) : 0;
  const percentGPS = totalColetadas > 0 ? Math.round((totalComGPS / totalColetadas) * 100) : 0;

  // Custom Tooltip
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;
      return (
        <div className="rounded-xl border border-slate-800 bg-[#16171d]/95 p-3.5 shadow-2xl backdrop-blur-md text-xs">
          <p className="font-bold text-white mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <Calendar className="h-3.5 w-3.5 text-blue-400" />
            <span>Dia {label} ({dataPoint?.dataIso})</span>
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Coletas do Dia:
              </span>
              <span className="font-bold text-white">{dataPoint?.coletasDoDia}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Total Acumulado:
              </span>
              <span className="font-bold">{dataPoint?.coletasAcumuladas}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-purple-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                Com Gravação de Áudio:
              </span>
              <span className="font-bold">{dataPoint?.comAudio}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-amber-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Com Georreferenciamento:
              </span>
              <span className="font-bold">{dataPoint?.comGPS}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-400 pt-1 border-t border-slate-800/80 text-[11px]">
              <span>Pesquisadores em Campo:</span>
              <span className="font-medium text-slate-200">{dataPoint?.pesquisadoresAtivos}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-5 shadow-xl transition-all">
      {/* Top Header com Seletor da Pesquisa Atual e Anteriores */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Evolução da Coleta em Campo</span>
              {selectedSurvey?.status === 'ativa' ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Pesquisa em Andamento
                </span>
              ) : (
                <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                  Pesquisa Anterior ({selectedSurvey?.status || 'Inativa'})
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Acompanhe o volume diário e a curva acumulada de entrevistas realizadas ao longo do tempo.
          </p>
        </div>

        {/* Controles: Seletor de Pesquisas (Atual ou Anteriores) + Filtro de Período */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown / Seletor de Pesquisas */}
          <div className="relative">
            <select
              id="select-home-evolution-survey"
              value={selectedSurveyId}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              className="appearance-none rounded-lg border border-slate-700 bg-slate-900/90 py-1.5 pl-3 pr-8 text-xs font-semibold text-white focus:border-blue-500 focus:outline-none cursor-pointer max-w-xs truncate"
            >
              <optgroup label="Pesquisas em Andamento (Ativas)">
                {surveys
                  .filter((s) => s.status === 'ativa')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      🟢 {s.codigo} - {s.nome} (C{s.cicloAtual})
                    </option>
                  ))}
              </optgroup>

              {surveys.some((s) => s.status !== 'ativa' && s.status !== 'excluida') && (
                <optgroup label="Pesquisas Anteriores / Inativas">
                  {surveys
                    .filter((s) => s.status !== 'ativa' && s.status !== 'excluida')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        ⚪ {s.codigo} - {s.nome} (C{s.cicloAtual} - Inativa)
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Filtro de Período */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/80 p-0.5 text-xs">
            <button
              onClick={() => setPeriodFilter('7d')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                periodFilter === '7d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setPeriodFilter('14d')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                periodFilter === '14d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              14D
            </button>
            <button
              onClick={() => setPeriodFilter('all')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                periodFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tudo
            </button>
          </div>
        </div>
      </div>

      {/* Mini KPIs da Pesquisa Selecionada */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Total Coletado
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white">{totalColetadas}</span>
            <span className="text-[11px] text-slate-500">entrevistas</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Média por Dia
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-blue-400">{mediaDiaria}</span>
            <span className="text-[11px] text-slate-500">coletas/dia</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Com Áudio Gravado
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-purple-400">{percentAudio}%</span>
            <span className="text-[11px] text-slate-500">({totalComAudio})</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Georreferenciadas
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-emerald-400">{percentGPS}%</span>
            <span className="text-[11px] text-slate-500">({totalComGPS})</span>
          </div>
        </div>
      </div>

      {/* Gráfico Recharts de Evolução */}
      <div className="mt-5">
        {evolutionData.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 mb-3">
              <Activity className="h-6 w-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-300">
              Nenhuma entrevista registrada para {selectedSurvey?.nome || 'esta pesquisa'}
            </h4>
            <p className="text-[11px] text-slate-500 max-w-sm mt-1">
              Colete respostas utilizando o Simulador de Coleta ou sincronize as entrevistas realizadas em campo.
            </p>
            <button
              onClick={() => setActiveModule('simulador')}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Abrir Simulador de Coleta</span>
            </button>
          </div>
        ) : (
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={evolutionData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2230" vertical={false} />
                <XAxis
                  dataKey="dataFormatada"
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={{ stroke: '#334155' }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  tick={{ fontSize: 11, fill: '#10b981' }}
                  tickLine={{ stroke: '#10b981' }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value) => <span className="text-slate-300">{value}</span>}
                />
                <Bar
                  yAxisId="left"
                  dataKey="coletasDoDia"
                  name="Coletas no Dia"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="coletasAcumuladas"
                  name="Total Acumulado"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981', strokeWidth: 1 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="comAudio"
                  name="Com Áudio"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Rodapé com atalho para o módulo de respostas e visualização completa */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-mono text-[11px]">
            Código: {selectedSurvey?.codigo}
          </span>
          <span>•</span>
          <span className="text-slate-400">
            Ciclo {selectedSurvey?.cicloAtual} (v{selectedSurvey?.versao})
          </span>
        </div>

        <button
          id={`btn-home-evolution-view-responses-${selectedSurvey?.id}`}
          onClick={() => {
            if (selectedSurvey) {
              setFilterSurveyId(selectedSurvey.id);
            }
            setActiveModule('respostas');
          }}
          className="inline-flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300 transition-colors"
        >
          <span>Ver Respostas Detalhadas</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
