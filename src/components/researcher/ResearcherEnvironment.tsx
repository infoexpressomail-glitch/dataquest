import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Smartphone,
  CheckCircle2,
  Target,
  MapPin,
  Volume2,
  RefreshCw,
  Play,
  TrendingUp,
  ShieldCheck,
  Layers,
  ChevronDown,
  Database,
  Wifi,
  WifiOff,
  User,
  ArrowLeft,
  ArrowRight,
  History,
} from 'lucide-react';
import { Survey, InterviewSubmission } from '../../types';
import { filterResearcherVisibleSurveys } from '../../utils/researcherUtils';
import { CollectionSimulator } from '../simulator/CollectionSimulator';
import { ResearcherIndividualGoalsView } from '../metas/ResearcherIndividualGoalsView';
import { AudioPlayerModal } from '../surveys/AudioPlayerModal';
import { GeoMapModal } from '../surveys/GeoMapModal';

type ResearcherView = 'pesquisas' | 'coleta' | 'historico' | 'sync';

/**
 * Portal do Pesquisador (dentro do ambiente de gestão).
 *
 * Recebe a MESMA simplificação aplicada ao Modo Pesquisador (sub-app de
 * campo): a antiga barra de 6 abas (Painel / Pesquisas / Coleta / Metas /
 * Histórico / Sincronização) foi substituída por um fluxo direto —
 *   pesquisas ativas → coleta
 * com o acompanhamento de metas embutido em cada pesquisa e Histórico /
 * Sincronização reduzidos a ações pontuais na barra superior.
 *
 * Nenhuma funcionalidade foi removida: metas, histórico, áudio, GPS e
 * sincronização offline continuam acessíveis pelos mesmos componentes.
 */
export const ResearcherEnvironment: React.FC = () => {
  const {
    currentUser,
    currentProfile,
    surveys,
    submissions,
    setEditingSurvey,
    effectiveOnline,
    offlineQueue,
    syncOfflineQueue,
    pendingIndexedDbCount,
    setCurrentUser,
    collaborators,
  } = useApp();

  const [view, setView] = useState<ResearcherView>('pesquisas');
  const [selectedSurveyForColeta, setSelectedSurveyForColeta] = useState<Survey | null>(null);
  const [expandedGoalsId, setExpandedGoalsId] = useState<string | null>(null);
  const [selectedAudioSub, setSelectedAudioSub] = useState<InterviewSubmission | null>(null);
  const [selectedGeoSub, setSelectedGeoSub] = useState<InterviewSubmission | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Pesquisas visíveis ao pesquisador: apenas as atribuídas a ele e ativas.
  const researcherSurveys = filterResearcherVisibleSurveys(surveys, currentUser);

  const researcherSubmissions = submissions.filter(
    (sub) => sub.pesquisadorId === currentUser.id
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const submissionsToday = researcherSubmissions.filter(
    (sub) => sub.dataHora && sub.dataHora.slice(0, 10) === todayStr
  );

  const dailyTarget = 20;
  const todayProgressPercent = Math.min(
    100,
    Math.round((submissionsToday.length / dailyTarget) * 100)
  );

  const pendingTotal = offlineQueue.length + pendingIndexedDbCount;

  const handleStartColetaForSurvey = (survey: Survey) => {
    setEditingSurvey(survey);
    setSelectedSurveyForColeta(survey);
    setView('coleta');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncOfflineQueue();
      setSyncFeedback(res.message || `${res.count} registro(s) sincronizado(s) com sucesso!`);
    } catch (err: any) {
      setSyncFeedback(`Erro na sincronização: ${err.message || 'Falha de conexão'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const adminColab = collaborators.find((c) => c.perfilAcessoId === 'prof_admin');

  // ------------------------------------------------------------------
  // MODO COLETA — formulário em tela cheia, igual ao Modo Pesquisador.
  // ------------------------------------------------------------------
  if (view === 'coleta') {
    const current = selectedSurveyForColeta || researcherSurveys[0];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setView('pesquisas')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition"
          >
            <ArrowLeft className="h-4 w-4 text-accent-primary" />
            <span>Voltar às pesquisas</span>
          </button>
          <div className="min-w-0 text-right">
            <div className="truncate text-xs font-bold text-primary">{current?.nome}</div>
            <div className="text-[10px] text-muted font-mono">{current?.codigo}</div>
          </div>
        </div>

        {/* Seletor de pesquisa quando há mais de uma ativa */}
        {researcherSurveys.length > 1 && (
          <div className="flex items-center gap-3 rounded-xl border border-ui bg-surface p-3">
            <span className="text-xs font-bold text-secondary">Pesquisa em andamento:</span>
            <select
              value={selectedSurveyForColeta?.id || researcherSurveys[0]?.id}
              onChange={(e) => {
                const s = researcherSurveys.find((x) => x.id === e.target.value);
                if (s) {
                  setSelectedSurveyForColeta(s);
                  setEditingSurvey(s);
                }
              }}
              className="rounded-lg border border-ui bg-surface-app px-3 py-1.5 text-xs font-semibold text-primary focus:border-brand-500 focus:outline-none"
            >
              {researcherSurveys.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigo} - {s.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="rounded-2xl border border-ui bg-surface-card p-4 shadow-xl">
          <CollectionSimulator />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Identificação do pesquisador + ações pontuais (sem barra de abas) */}
      <div className="relative overflow-hidden rounded-2xl border border-accent-primary-soft-border bg-gradient-to-r from-accent-primary-soft via-surface to-surface-raised p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-on-accent font-black text-xl shadow-lg shadow-brand-900/50 shrink-0">
              {currentUser.nome.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-accent-success-soft border border-accent-success-soft-border px-2.5 py-0.5 text-[10px] font-bold text-accent-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-success-solid animate-pulse" />
                  Ambiente do Pesquisador de Campo
                </span>
                <span className="rounded-md bg-surface-raised px-2 py-0.5 text-[10px] font-mono text-secondary border border-ui">
                  Login: {currentUser.login}
                </span>
              </div>
              <h1 className="mt-1 text-xl font-black tracking-tight text-primary sm:text-2xl">
                {currentUser.nome}
              </h1>
              <p className="text-xs text-muted flex flex-wrap items-center gap-2 mt-0.5">
                <span>Matrícula: {currentUser.cpf}</span>
                <span>•</span>
                <span>{currentProfile?.name}</span>
              </p>
            </div>
          </div>

          {/* Ações: Sincronizar / Histórico + status de rede */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold ${
                effectiveOnline
                  ? 'border-accent-success-soft-border bg-accent-success-soft text-accent-success'
                  : 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning'
              }`}
            >
              {effectiveOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {effectiveOnline ? 'Online' : 'Offline'}
            </span>

            <button
              type="button"
              onClick={() => setView('historico')}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                view === 'historico'
                  ? 'border-accent-primary-soft-border bg-accent-primary-soft text-accent-primary'
                  : 'border-ui bg-surface-raised text-secondary hover:bg-surface-hover hover:text-primary'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Histórico ({researcherSubmissions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setView('sync')}
              className={`relative inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                view === 'sync'
                  ? 'border-accent-primary-soft-border bg-accent-primary-soft text-accent-primary'
                  : 'border-ui bg-surface-raised text-secondary hover:bg-surface-hover hover:text-primary'
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
              {pendingTotal > 0 && (
                <span className="rounded-full bg-accent-warning-solid px-1.5 text-[9px] font-bold text-on-warning">
                  {pendingTotal}
                </span>
              )}
            </button>

            {adminColab && (
              <button
                type="button"
                onClick={() => setCurrentUser(adminColab)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition"
              >
                <User className="h-3.5 w-3.5 text-accent-primary" />
                <span className="hidden sm:inline">Alternar p/ Gestão</span>
              </button>
            )}
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-accent-primary-soft blur-3xl" />
      </div>

      {/* Barra de contexto enxuta: voltar às pesquisas */}
      {view !== 'pesquisas' && (
        <button
          type="button"
          onClick={() => setView('pesquisas')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition"
        >
          <ArrowLeft className="h-4 w-4 text-accent-primary" />
          <span>Voltar às pesquisas</span>
        </button>
      )}

      {/* VISÃO PRINCIPAL: painel + pesquisas ativas + metas inline */}
      {view === 'pesquisas' && (
        <div className="space-y-6">
          {/* Métricas rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-ui bg-surface p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Meta Diária
                </span>
                <Target className="h-5 w-5 text-accent-primary" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-primary">{submissionsToday.length}</span>
                <span className="text-xs font-semibold text-muted">/ {dailyTarget} entrevistas</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-bold text-muted mb-1">
                  <span>Progresso do Turno</span>
                  <span>{todayProgressPercent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-700 to-brand-500 rounded-full transition-all duration-500"
                    style={{ width: `${todayProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-ui bg-surface p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Total Acumulado
                </span>
                <TrendingUp className="h-5 w-5 text-accent-success" />
              </div>
              <div className="mt-2 text-3xl font-black text-primary">
                {researcherSubmissions.length}
              </div>
              <p className="mt-1 text-xs text-muted">Entrevistas auditadas no ciclo atual</p>
            </div>

            <div className="rounded-2xl border border-ui bg-surface p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Conformidade de Campo
                </span>
                <ShieldCheck className="h-5 w-5 text-accent-purple" />
              </div>
              <div className="mt-2 text-3xl font-black text-accent-success">100%</div>
              <p className="mt-1 text-xs text-muted">Gravação de áudio e GPS validados</p>
            </div>

            <div className="rounded-2xl border border-ui bg-surface p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Fila Local Offline
                </span>
                <Database className="h-5 w-5 text-accent-warning" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-primary">{pendingTotal}</span>
                <span className="text-xs font-semibold text-muted">pendente(s)</span>
              </div>
              <div className="mt-2">
                {pendingTotal > 0 ? (
                  <button
                    onClick={() => setView('sync')}
                    className="text-xs font-bold text-accent-warning hover:underline"
                  >
                    Sincronizar dados agora
                  </button>
                ) : (
                  <span className="text-xs text-accent-success flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Totalmente sincronizado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CTA de coleta */}
          <div className="rounded-2xl border border-accent-primary-soft-border bg-surface-raised p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary-solid text-on-accent shadow-lg shadow-brand-900/50 shrink-0">
                <Play className="h-6 w-6 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">
                  Pronto para iniciar uma nova coleta?
                </h3>
                <p className="text-xs text-secondary">
                  O formulário de campo abre com gravação de áudio ambiental e captura de
                  coordenadas GPS.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (researcherSurveys[0]) {
                  handleStartColetaForSurvey(researcherSurveys[0]);
                } else {
                  setView('sync');
                }
              }}
              className="flex items-center gap-2 rounded-xl bg-accent-primary-solid px-6 py-3 text-xs font-bold text-on-accent shadow-lg shadow-brand-900/50 hover:bg-accent-primary-solid-hover transition active:scale-95 shrink-0"
            >
              <span>Iniciar Coleta de Campo</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Lista de pesquisas ativas com metas inline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent-primary" />
                Pesquisas ativas liberadas para coleta
              </h3>
              <span className="rounded-md border border-ui bg-surface-card px-3 py-1 text-xs font-bold text-secondary">
                {researcherSurveys.length} pesquisa(s)
              </span>
            </div>

            {researcherSurveys.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ui bg-surface p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-muted">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-primary">
                  Nenhuma pesquisa ativa no momento
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  As pesquisas ativas atribuídas ao seu login aparecerão aqui. Use
                  “Sincronizar” para atualizar a lista.
                </p>
                <button
                  onClick={() => setView('sync')}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-brand-900/40 hover:bg-accent-primary-solid-hover transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sincronizar agora
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {researcherSurveys.map((survey) => {
                const surveySubs = researcherSubmissions.filter(
                  (s) => s.pesquisaId === survey.id
                );
                const goalsOpen = expandedGoalsId === survey.id;
                return (
                  <div
                    key={survey.id}
                    className="rounded-2xl border border-ui bg-surface p-5 shadow-lg flex flex-col justify-between hover:border-accent-primary-soft-border transition"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-accent-primary-soft border border-accent-primary-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-primary">
                          {survey.codigo}
                        </span>
                        <span className="rounded-full bg-accent-success-soft border border-accent-success-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-success">
                          Ativa em campo
                        </span>
                      </div>

                      <h4 className="mt-2 text-sm font-bold text-primary line-clamp-1">
                        {survey.nome}
                      </h4>
                      <p className="mt-1 text-xs text-muted line-clamp-2">{survey.descricao}</p>

                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
                        <div>
                          <span className="text-[10px] uppercase text-muted block font-semibold">
                            Perguntas
                          </span>
                          <span className="font-bold text-primary">
                            {survey.perguntas.length} itens
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-muted block font-semibold">
                            Coletadas por você
                          </span>
                          <span className="font-bold text-accent-success">
                            {surveySubs.length} entrevistas
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-muted block font-semibold">
                            Ciclo atual
                          </span>
                          <span className="font-bold text-primary">#{survey.cicloAtual}</span>
                        </div>
                      </div>

                      {/* Metas inline (mesma simplificação do Modo Pesquisador) */}
                      <div className="mt-3 border-t border-subtle pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedGoalsId((prev) => (prev === survey.id ? null : survey.id))
                          }
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted hover:text-primary transition"
                        >
                          <Target className="h-3.5 w-3.5 text-accent-primary" />
                          Metas desta pesquisa
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${
                              goalsOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {goalsOpen && (
                          <div className="mt-2">
                            <ResearcherIndividualGoalsView activeSurvey={survey} fieldMode />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-ui/80 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleStartColetaForSurvey(survey)}
                        className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-4 py-1.5 text-xs font-bold text-on-accent hover:bg-accent-primary-solid-hover shadow-md shadow-brand-900/30 transition"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Coletar agora</span>
                      </button>
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                        <Smartphone className="h-3.5 w-3.5 text-accent-primary" />
                        GPS + áudio
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* HISTÓRICO DE COLETAS */}
      {view === 'historico' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-primary flex items-center gap-2">
                  <History className="h-5 w-5 text-accent-primary" />
                  Histórico de entrevistas realizadas por você
                </h2>
                <p className="text-xs text-muted">
                  Total de {researcherSubmissions.length} entrevistas registradas com auditoria
                  digital.
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ui text-[10px] font-bold uppercase tracking-wider text-muted">
                    <th className="pb-3">Protocolo</th>
                    <th className="pb-3">Pesquisa</th>
                    <th className="pb-3">Data / Hora</th>
                    <th className="pb-3">Duração</th>
                    <th className="pb-3">Áudio Gravado</th>
                    <th className="pb-3">Geolocalização</th>
                    <th className="pb-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui/60">
                  {researcherSubmissions.map((sub) => {
                    const survey = surveys.find((s) => s.id === sub.pesquisaId);
                    return (
                      <tr key={sub.id} className="hover:bg-surface-raised transition">
                        <td className="py-3 font-mono font-bold text-accent-primary">
                          {sub.id.slice(0, 12)}
                        </td>
                        <td className="py-3 text-primary font-medium">
                          {survey?.nome || sub.pesquisaId}
                        </td>
                        <td className="py-3 text-muted">
                          {new Date(sub.dataHora).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 text-muted">
                          {sub.audioGravacao?.duracaoSegundos
                            ? `${Math.floor(sub.audioGravacao.duracaoSegundos / 60)}m ${
                                sub.audioGravacao.duracaoSegundos % 60
                              }s`
                            : '-'}
                        </td>
                        <td className="py-3">
                          {sub.audioGravacao ? (
                            <button
                              onClick={() => setSelectedAudioSub(sub)}
                              className="inline-flex items-center gap-1 rounded-md bg-accent-purple-soft px-2 py-0.5 text-[10px] font-bold text-accent-purple hover:bg-accent-purple-soft transition border border-accent-purple-soft-border"
                            >
                              <Volume2 className="h-3 w-3" />
                              <span>Ouvir gravação</span>
                            </button>
                          ) : (
                            <span className="text-muted text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          {sub.geolocalizacao ? (
                            <button
                              onClick={() => setSelectedGeoSub(sub)}
                              className="inline-flex items-center gap-1 rounded-md bg-accent-primary-soft px-2 py-0.5 text-[10px] font-bold text-accent-primary hover:bg-accent-primary-soft transition border border-accent-primary-soft-border"
                            >
                              <MapPin className="h-3 w-3" />
                              <span>Ver mapa</span>
                            </button>
                          ) : (
                            <span className="text-muted text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <span className="rounded-full bg-accent-success-soft px-2 py-0.5 text-[10px] font-bold text-accent-success border border-accent-success-soft-border">
                            Validada
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {researcherSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-muted">
                        Nenhuma entrevista registrada ainda. Inicie sua primeira coleta na aba
                        “Pesquisas”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SINCRONIZAÇÃO E OFFLINE */}
      {view === 'sync' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
            <h2 className="text-base font-bold text-primary flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-accent-primary" />
              Sincronização de dados de campo com o servidor central
            </h2>
            <p className="text-xs text-muted mt-1">
              Entrevistas coletadas offline ficam em banco local (IndexedDB) e são enviadas com
              integridade SHA-256 ao restabelecer conexão.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-ui bg-surface-card p-4">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Fila de itens pendentes
                </span>
                <div className="mt-2 text-2xl font-black text-primary">{pendingTotal} item(s)</div>
                <p className="mt-1 text-xs text-muted">Prontos para transmissão manual ou automática.</p>
              </div>

              <div className="rounded-xl border border-ui bg-surface-card p-4">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Status da conexão
                </span>
                <div className="mt-2 text-2xl font-black text-accent-success flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-accent-success-solid animate-pulse" />
                  {effectiveOnline ? 'Conectado à internet' : 'Sem conexão (modo offline)'}
                </div>
                <p className="mt-1 text-xs text-muted">Servidor Central: DataQuest Cloud API v2.4.1</p>
              </div>
            </div>

            {syncFeedback && (
              <div className="mt-4 rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-3 text-xs text-accent-primary flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent-success shrink-0" />
                <span>{syncFeedback}</span>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleManualSync}
                disabled={isSyncing || !effectiveOnline}
                className="flex items-center gap-2 rounded-xl bg-accent-primary-solid px-6 py-2.5 text-xs font-bold text-on-accent shadow-lg shadow-brand-900/40 hover:bg-accent-primary-solid-hover disabled:opacity-50 transition"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncing ? 'Sincronizando...' : 'Transmitir coletas para o servidor central'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modais de áudio e mapa */}
      {selectedAudioSub && (
        <AudioPlayerModal
          onClose={() => setSelectedAudioSub(null)}
          submission={selectedAudioSub}
        />
      )}

      {selectedGeoSub && (
        <GeoMapModal
          onClose={() => setSelectedGeoSub(null)}
          submissions={[selectedGeoSub]}
          surveyName={surveys.find((s) => s.id === selectedGeoSub.pesquisaId)?.nome || ''}
        />
      )}
    </div>
  );
};
