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
        <div className="rounded-xl border border-ui bg-surface/95 p-3.5 shadow-2xl backdrop-blur-md text-xs">
          <p className="font-bold text-primary mb-2 flex items-center gap-1.5 border-b border-ui pb-1.5">
            <Calendar className="h-3.5 w-3.5 text-accent-primary" />
            <span>Dia {label} ({dataPoint?.dataIso})</span>
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4 text-secondary">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent-primary-solid" />
                Coletas do Dia:
              </span>
              <span className="font-bold text-primary">{dataPoint?.coletasDoDia}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-accent-success">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent-success-solid" />
                Total Acumulado:
              </span>
              <span className="font-bold">{dataPoint?.coletasAcumuladas}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-accent-purple">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent-purple-solid" />
                Com Gravação de Áudio:
              </span>
              <span className="font-bold">{dataPoint?.comAudio}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-accent-warning">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent-warning-solid" />
                Com Georreferenciamento:
              </span>
              <span className="font-bold">{dataPoint?.comGPS}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-muted pt-1 border-t border-ui/80 text-[11px]">
              <span>Pesquisadores em Campo:</span>
              <span className="font-medium text-primary">{dataPoint?.pesquisadoresAtivos}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl transition-all">
      {/* Top Header com Seletor da Pesquisa Atual e Anteriores */}
      <div className="flex flex-col justify-between gap-4 border-b border-ui pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-accent-primary-solid rounded-full" />
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <span>Evolução da Coleta em Campo</span>
              {selectedSurvey?.status === 'ativa' ? (
                <span className="flex items-center gap-1 rounded-full bg-accent-success-soft border border-accent-success-soft-border px-2 py-0.5 text-[10px] font-semibold text-accent-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-success-solid animate-pulse" />
                  Pesquisa em Andamento
                </span>
              ) : (
                <span className="rounded-full bg-surface-raised border border-ui px-2 py-0.5 text-[10px] font-semibold text-muted">
                  Pesquisa Anterior ({selectedSurvey?.status || 'Inativa'})
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-muted mt-0.5">
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
              className="appearance-none rounded-lg border border-ui bg-surface-raised py-1.5 pl-3 pr-8 text-xs font-semibold text-primary focus:border-blue-500 focus:outline-none cursor-pointer max-w-xs truncate"
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
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
          </div>

          {/* Filtro de Período */}
          <div className="flex items-center rounded-lg border border-ui bg-surface-raised p-0.5 text-xs">
            <button
              onClick={() => setPeriodFilter('7d')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                periodFilter === '7d'
                  ? 'bg-accent-primary-solid text-on-accent shadow-xs'
                  : 'text-muted hover:text-primary'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setPeriodFilter('14d')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                periodFilter === '14d'
                  ? 'bg-accent-primary-solid text-on-accent shadow-xs'
                  : 'text-muted hover:text-primary'
              }`}
            >
              14D
            </button>
            <button
              onClick={() => setPeriodFilter('all')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                periodFilter === 'all'
                  ? 'bg-accent-primary-solid text-on-accent shadow-xs'
                  : 'text-muted hover:text-primary'
              }`}
            >
              Tudo
            </button>
          </div>
        </div>
      </div>

      {/* Mini KPIs da Pesquisa Selecionada */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-ui/80 bg-surface-raised p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Total Coletado
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-primary">{totalColetadas}</span>
            <span className="text-[11px] text-muted">entrevistas</span>
          </div>
        </div>

        <div className="rounded-xl border border-ui/80 bg-surface-raised p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Média por Dia
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-accent-primary">{mediaDiaria}</span>
            <span className="text-[11px] text-muted">coletas/dia</span>
          </div>
        </div>

        <div className="rounded-xl border border-ui/80 bg-surface-raised p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Com Áudio Gravado
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-accent-purple">{percentAudio}%</span>
            <span className="text-[11px] text-muted">({totalComAudio})</span>
          </div>
        </div>

        <div className="rounded-xl border border-ui/80 bg-surface-raised p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Georreferenciadas
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-accent-success">{percentGPS}%</span>
            <span className="text-[11px] text-muted">({totalComGPS})</span>
          </div>
        </div>
      </div>

      {/* Gráfico Recharts de Evolução */}
      <div className="mt-5">
        {evolutionData.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ui bg-surface-raised py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border mb-3">
              <Activity className="h-6 w-6" />
            </div>
            <h4 className="text-xs font-bold text-secondary">
              Nenhuma entrevista registrada para {selectedSurvey?.nome || 'esta pesquisa'}
            </h4>
            <p className="text-[11px] text-muted max-w-sm mt-1">
              Colete respostas utilizando o Simulador de Coleta ou sincronize as entrevistas realizadas em campo.
            </p>
            <button
              onClick={() => setActiveModule('simulador')}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-3.5 py-1.5 text-xs font-bold text-on-accent shadow-md hover:bg-accent-primary-solid-hover transition-colors"
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="dataFormatada"
                  stroke="var(--border)"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickLine={{ stroke: 'var(--border-subtle)' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="var(--border)"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickLine={{ stroke: 'var(--border-subtle)' }}
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
                  formatter={(value) => <span className="text-secondary">{value}</span>}
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ui/80 pt-3 text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className="text-muted font-mono text-[11px]">
            Código: {selectedSurvey?.codigo}
          </span>
          <span>•</span>
          <span className="text-muted">
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
          className="inline-flex items-center gap-1 font-semibold text-accent-primary hover:text-accent-primary transition-colors"
        >
          <span>Ver Respostas Detalhadas</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
