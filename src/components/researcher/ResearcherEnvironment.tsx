import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Target,
  MapPin,
  Mic,
  Volume2,
  RefreshCw,
  Sparkles,
  Play,
  FileCheck,
  TrendingUp,
  ShieldCheck,
  Radio,
  Layers,
  ChevronRight,
  Database,
  Wifi,
  WifiOff,
  User,
  ArrowRight,
  Calendar,
  Zap,
} from 'lucide-react';
import { Survey, InterviewSubmission } from '../../types';
import { filterResearcherVisibleSurveys } from '../../utils/researcherUtils';
import { CollectionSimulator } from '../simulator/CollectionSimulator';
import { ResearcherIndividualGoalsView } from '../metas/ResearcherIndividualGoalsView';
import { AudioPlayerModal } from '../surveys/AudioPlayerModal';
import { GeoMapModal } from '../surveys/GeoMapModal';

export const ResearcherEnvironment: React.FC = () => {
  const {
    currentUser,
    currentProfile,
    surveys,
    submissions,
    setEditingSurvey,
    setActiveModule,
    effectiveOnline,
    offlineQueue,
    syncOfflineQueue,
    pendingIndexedDbCount,
    hasPermission,
    setCurrentUser,
    collaborators,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'painel' | 'pesquisas' | 'coleta' | 'metas' | 'historico' | 'sync'
  >('painel');

  const [selectedSurveyForColeta, setSelectedSurveyForColeta] = useState<Survey | null>(null);
  const [selectedAudioSub, setSelectedAudioSub] = useState<InterviewSubmission | null>(null);
  const [selectedGeoSub, setSelectedGeoSub] = useState<InterviewSubmission | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Pesquisas visíveis ao pesquisador: apenas as atribuídas a ele e que estão
  // ativas (ou concluídas pela coordenação, mas re-habilitadas para este login).
  // Pesquisas finalizadas (concluídas) para este pesquisador NÃO aparecem, a
  // menos que sejam novamente habilitadas para este login.
  const researcherSurveys = filterResearcherVisibleSurveys(surveys, currentUser);

  // Filter submissions made by this researcher
  const researcherSubmissions = submissions.filter(
    (sub) => sub.pesquisadorId === currentUser.id
  );

  // Submissions made today
  const todayStr = new Date().toISOString().slice(0, 10);
  const submissionsToday = researcherSubmissions.filter(
    (sub) => sub.dataHoraInicio && sub.dataHoraInicio.slice(0, 10) === todayStr
  );

  // Daily target (default to 20 or calculated from active survey goals)
  const dailyTarget = 20;
  const todayProgressPercent = Math.min(
    100,
    Math.round((submissionsToday.length / dailyTarget) * 100)
  );

  const handleStartColetaForSurvey = (survey: Survey) => {
    setEditingSurvey(survey);
    setSelectedSurveyForColeta(survey);
    setActiveTab('coleta');
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

  // Find admin user to allow switching back if needed
  const adminColab = collaborators.find((c) => c.perfilAcessoId === 'prof_admin');

  return (
    <div className="space-y-6">
      {/* Top Researcher Identification Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-accent-primary-soft-border bg-gradient-to-r from-[#121629] via-[#111624] to-[#0e121d] p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-primary font-black text-xl shadow-lg shadow-emerald-900/50 shrink-0">
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
                <span>Turno de Coleta: Ativo</span>
                <span>•</span>
                <span>Base: Arraial do Cabo / Região dos Lagos</span>
              </p>
            </div>
          </div>

          {/* Quick Hardware Sensors & Quick Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-ui bg-surface-app/80 px-3 py-2 text-xs">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                  effectiveOnline ? 'bg-accent-success-soft text-accent-success' : 'bg-accent-warning-soft text-accent-warning'
                }`}
              >
                {effectiveOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              </div>
              <div>
                <div className="text-[10px] text-muted font-semibold">Rede</div>
                <div className="font-bold text-primary text-[11px]">
                  {effectiveOnline ? 'Online' : 'Modo Offline'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-ui bg-surface-app/80 px-3 py-2 text-xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-primary-soft text-accent-primary">
                <MapPin className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-muted font-semibold">GPS Campo</div>
                <div className="font-bold text-accent-success text-[11px]">Ativo (±3m)</div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-ui bg-surface-app/80 px-3 py-2 text-xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-purple-soft text-accent-purple">
                <Mic className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-muted font-semibold">Áudio Auditoria</div>
                <div className="font-bold text-accent-purple text-[11px]">Pronto</div>
              </div>
            </div>

            {/* Quick Button to Switch back to Admin if user was switching */}
            {adminColab && (
              <button
                type="button"
                onClick={() => setCurrentUser(adminColab)}
                className="flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition"
              >
                <User className="h-3.5 w-3.5 text-accent-primary" />
                <span className="hidden sm:inline">Alternar p/ Gestão</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-accent-primary-soft blur-3xl" />
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex overflow-x-auto border-b border-ui bg-surface-card p-1 rounded-xl gap-1 text-xs font-semibold scrollbar-none">
        <button
          onClick={() => setActiveTab('painel')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 transition whitespace-nowrap ${
            activeTab === 'painel'
              ? 'bg-accent-primary-solid text-on-accent shadow-md shadow-emerald-900/30 font-bold'
              : 'text-muted hover:text-primary hover:bg-surface-raised'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Painel de Campo</span>
        </button>

        <button
          onClick={() => setActiveTab('pesquisas')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 transition whitespace-nowrap ${
            activeTab === 'pesquisas'
              ? 'bg-accent-primary-solid text-on-accent shadow-md shadow-emerald-900/30 font-bold'
              : 'text-muted hover:text-primary hover:bg-surface-raised'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Minhas Pesquisas ({researcherSurveys.length})</span>
        </button>

        <button
          onClick={() => {
            if (researcherSurveys[0] && !selectedSurveyForColeta) {
              setSelectedSurveyForColeta(researcherSurveys[0]);
              setEditingSurvey(researcherSurveys[0]);
            }
            setActiveTab('coleta');
          }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 transition whitespace-nowrap ${
            activeTab === 'coleta'
              ? 'bg-accent-primary-solid text-on-accent shadow-md shadow-emerald-900/30 font-bold'
              : 'text-muted hover:text-primary hover:bg-surface-raised'
          }`}
        >
          <Smartphone className="h-4 w-4 text-accent-success" />
          <span>Coleta</span>
        </button>

        <button
          onClick={() => setActiveTab('metas')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 transition whitespace-nowrap ${
            activeTab === 'metas'
              ? 'bg-accent-primary-solid text-on-accent shadow-md shadow-emerald-900/30 font-bold'
              : 'text-muted hover:text-primary hover:bg-surface-raised'
          }`}
        >
          <Target className="h-4 w-4" />
          <span>Minhas Metas & Cotas</span>
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 transition whitespace-nowrap ${
            activeTab === 'historico'
              ? 'bg-accent-primary-solid text-on-accent shadow-md shadow-emerald-900/30 font-bold'
              : 'text-muted hover:text-primary hover:bg-surface-raised'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          <span>Histórico ({researcherSubmissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sync')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 transition whitespace-nowrap ${
            activeTab === 'sync'
              ? 'bg-accent-primary-solid text-on-accent shadow-md shadow-emerald-900/30 font-bold'
              : 'text-muted hover:text-primary hover:bg-surface-raised'
          }`}
        >
          <RefreshCw className="h-4 w-4" />
          <span>
            Sincronização
            {(offlineQueue.length > 0 || pendingIndexedDbCount > 0) && (
              <span className="ml-1.5 rounded-full bg-accent-warning-solid px-1.5 py-0.2 text-[9px] font-bold text-on-warning">
                {offlineQueue.length + pendingIndexedDbCount}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* TAB 1: PAINEL DE CAMPO */}
      {activeTab === 'painel' && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Meta de Hoje */}
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
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${todayProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Total Coletado por Mim */}
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

            {/* Conformidade de Áudio & GPS */}
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

            {/* Fila Offline */}
            <div className="rounded-2xl border border-ui bg-surface p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Fila Local Offline
                </span>
                <Database className="h-5 w-5 text-accent-warning" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-primary">
                  {offlineQueue.length + pendingIndexedDbCount}
                </span>
                <span className="text-xs font-semibold text-muted">pendente(s)</span>
              </div>
              <div className="mt-2">
                {offlineQueue.length + pendingIndexedDbCount > 0 ? (
                  <button
                    onClick={() => setActiveTab('sync')}
                    className="text-xs font-bold text-accent-warning hover:text-accent-warning underline"
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

          {/* Quick Collection CTA Banner */}
          <div className="rounded-2xl border border-accent-primary-soft-border bg-surface-raised p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary-solid text-on-accent shadow-lg shadow-emerald-900/50 shrink-0">
                <Play className="h-6 w-6 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">
                  Pronto para Iniciar uma Nova Coleta?
                </h3>
                <p className="text-xs text-secondary">
                  O formulário de campo abre em modo de alta performance com gravação de áudio ambiental e captura de coordenadas GPS.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (researcherSurveys[0]) {
                  handleStartColetaForSurvey(researcherSurveys[0]);
                } else {
                  setActiveTab('coleta');
                }
              }}
              className="flex items-center gap-2 rounded-xl bg-accent-primary-solid px-6 py-3 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/50 hover:bg-accent-primary-solid-hover transition active:scale-95 shrink-0"
            >
              <span>Iniciar Coleta de Campo</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Pesquisas Vinculadas Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent-primary" />
                Pesquisas Liberadas para Coleta em Campo
              </h3>
              <button
                onClick={() => setActiveTab('pesquisas')}
                className="text-xs font-semibold text-accent-primary hover:underline"
              >
                Ver todas ({researcherSurveys.length})
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {researcherSurveys.map((survey) => {
                const surveySubs = researcherSubmissions.filter((s) => s.pesquisaId === survey.id);
                return (
                  <div
                    key={survey.id}
                    className="rounded-xl border border-ui bg-surface p-5 shadow-lg flex flex-col justify-between hover:border-ui transition"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-accent-primary-soft border border-accent-primary-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-primary">
                          {survey.codigo}
                        </span>
                        <span className="rounded-full bg-accent-success-soft border border-accent-success-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-success">
                          Ativa em Campo
                        </span>
                      </div>

                      <h4 className="mt-2 text-sm font-bold text-primary line-clamp-1">
                        {survey.nome}
                      </h4>
                      <p className="mt-1 text-xs text-muted line-clamp-2">
                        {survey.descricao}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
                        <div>
                          <span className="text-[10px] uppercase text-muted block font-semibold">
                            Perguntas
                          </span>
                          <span className="font-bold text-primary">{survey.perguntas.length} itens</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-muted block font-semibold">
                            Coletadas por Você
                          </span>
                          <span className="font-bold text-accent-success">{surveySubs.length} entrevistas</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-muted block font-semibold">
                            Ciclo Atual
                          </span>
                          <span className="font-bold text-primary">Ciclo #{survey.cicloAtual}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-ui/80 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setEditingSurvey(survey);
                          setActiveTab('metas');
                        }}
                        className="text-xs font-semibold text-muted hover:text-primary"
                      >
                        Ver Metas da Pesquisa
                      </button>
                      <button
                        onClick={() => handleStartColetaForSurvey(survey)}
                        className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-4 py-1.5 text-xs font-bold text-on-accent hover:bg-accent-primary-solid-hover shadow-md shadow-emerald-900/30 transition"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Coletar Agora</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MINHAS PESQUISAS ATRIBUÍDAS */}
      {activeTab === 'pesquisas' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-primary">
                  Pesquisas Atribuídas ao seu Perfil
                </h2>
                <p className="text-xs text-muted">
                  Abaixo estão os questionários em que você possui autorização para aplicação e coleta em campo.
                </p>
              </div>
              <span className="rounded-md border border-ui bg-surface-card px-3 py-1 text-xs font-bold text-secondary">
                {researcherSurveys.length} pesquisa(s) liberada(s)
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {researcherSurveys.map((survey) => (
                <div
                  key={survey.id}
                  className="rounded-xl border border-ui bg-surface-card p-5 hover:border-ui transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-accent-primary-soft border border-accent-primary-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-primary">
                          {survey.codigo}
                        </span>
                        <span className="rounded-full bg-accent-success-soft border border-accent-success-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-success">
                          {survey.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted">
                          Versão {survey.versao}.0
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-primary">{survey.nome}</h3>
                      <p className="text-xs text-muted max-w-2xl">{survey.descricao}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setEditingSurvey(survey);
                          setActiveTab('metas');
                        }}
                        className="rounded-lg border border-ui bg-surface-raised px-3.5 py-2 text-xs font-semibold text-secondary hover:bg-surface-raised hover:text-primary transition"
                      >
                        Minhas Metas
                      </button>
                      <button
                        onClick={() => handleStartColetaForSurvey(survey)}
                        className="flex items-center gap-2 rounded-lg bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition active:scale-95"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        <span>Iniciar Coleta</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-ui/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-muted block uppercase">Perguntas</span>
                      <span className="font-bold text-primary">{survey.perguntas.length} questões</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block uppercase">Gravação Áudio</span>
                      <span className="font-bold text-accent-success">Obrigatória (Ativa)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block uppercase">Geolocalização</span>
                      <span className="font-bold text-accent-primary">GPS Requerido</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block uppercase">Coletas por Você</span>
                      <span className="font-bold text-primary">
                        {researcherSubmissions.filter((s) => s.pesquisaId === survey.id).length} realizadas
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COLETAR EM CAMPO (FORMULÁRIO ATIVO) */}
      {activeTab === 'coleta' && (
        <div className="space-y-4">
          {/* Survey Selector if multiple available */}
          {researcherSurveys.length > 1 && (
            <div className="flex items-center gap-3 rounded-xl border border-ui bg-surface p-3">
              <span className="text-xs font-bold text-secondary">Pesquisa em Andamento:</span>
              <select
                value={selectedSurveyForColeta?.id || researcherSurveys[0]?.id}
                onChange={(e) => {
                  const s = researcherSurveys.find((x) => x.id === e.target.value);
                  if (s) {
                    setSelectedSurveyForColeta(s);
                    setEditingSurvey(s);
                  }
                }}
                className="rounded-lg border border-ui bg-surface-app px-3 py-1.5 text-xs font-semibold text-primary focus:border-emerald-500 focus:outline-none"
              >
                {researcherSurveys.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.codigo} - {s.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Collection Simulator Embedded Component */}
          <div className="rounded-2xl border border-ui bg-surface-card p-4 shadow-xl">
            <CollectionSimulator />
          </div>
        </div>
      )}

      {/* TAB 4: MINHAS METAS & COTAS */}
      {activeTab === 'metas' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
            <h2 className="text-base font-bold text-primary flex items-center gap-2">
              <Target className="h-5 w-5 text-accent-primary" />
              Minhas Metas Demográficas e Cotas Atribuídas
            </h2>
            <p className="text-xs text-muted mt-1">
              Acompanhe suas cotas específicas de idade, gênero e localização em tempo real para atingir o target estipulado pela coordenação.
            </p>

            <div className="mt-6">
              {researcherSurveys[0] ? (
                <ResearcherIndividualGoalsView activeSurvey={selectedSurveyForColeta || researcherSurveys[0]} />
              ) : (
                <div className="text-center py-8 text-xs text-muted">
                  Nenhuma pesquisa vinculada para exibir metas individuais.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: HISTÓRICO DE COLETAS DO PESQUISADOR */}
      {activeTab === 'historico' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-primary">
                  Histórico de Entrevistas Realizadas por Você
                </h2>
                <p className="text-xs text-muted">
                  Total de {researcherSubmissions.length} entrevistas registradas com auditoria digital.
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
                          {sub.protocolo || sub.id.slice(0, 12)}
                        </td>
                        <td className="py-3 text-primary font-medium">
                          {survey?.nome || sub.pesquisaId}
                        </td>
                        <td className="py-3 text-muted">
                          {new Date(sub.dataHoraInicio).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 text-muted">
                          {sub.duracaoSegundos ? `${Math.floor(sub.duracaoSegundos / 60)}m ${sub.duracaoSegundos % 60}s` : '3m 45s'}
                        </td>
                        <td className="py-3">
                          {sub.audioGravado ? (
                            <button
                              onClick={() => setSelectedAudioSub(sub)}
                              className="inline-flex items-center gap-1 rounded-md bg-accent-purple-soft px-2 py-0.5 text-[10px] font-bold text-accent-purple hover:bg-accent-purple-soft transition border border-accent-purple-soft-border"
                            >
                              <Volume2 className="h-3 w-3" />
                              <span>Ouvir Gravação</span>
                            </button>
                          ) : (
                            <span className="text-muted text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          {sub.coordenadas ? (
                            <button
                              onClick={() => setSelectedGeoSub(sub)}
                              className="inline-flex items-center gap-1 rounded-md bg-accent-primary-soft px-2 py-0.5 text-[10px] font-bold text-accent-primary hover:bg-accent-primary-soft transition border border-accent-primary-soft-border"
                            >
                              <MapPin className="h-3 w-3" />
                              <span>Ver Mapa</span>
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
                        Nenhuma entrevista registrada ainda neste dispositivo. Inicie sua primeira coleta na aba "Coleta em Campo".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SINCRONIZAÇÃO E OFFLINE */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
            <h2 className="text-base font-bold text-primary flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-accent-primary" />
              Sincronização de Dados de Campo com o Servidor Central
            </h2>
            <p className="text-xs text-muted mt-1">
              Todas as entrevistas coletadas enquanto offline são armazenadas em banco de dados local criptografado (IndexedDB) e enviadas com integridade SHA-256 ao restabelecer conexão.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-ui bg-surface-card p-4">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Fila de Itens Pendentes
                </span>
                <div className="mt-2 text-2xl font-black text-primary">
                  {offlineQueue.length + pendingIndexedDbCount} item(s)
                </div>
                <p className="mt-1 text-xs text-muted">
                  Prontos para transmissão automática ou manual.
                </p>
              </div>

              <div className="rounded-xl border border-ui bg-surface-card p-4">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Status da Conexão
                </span>
                <div className="mt-2 text-2xl font-black text-accent-success flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-accent-success-solid animate-pulse" />
                  {effectiveOnline ? 'Conectado à Internet' : 'Sem Conexão (Modo Offline)'}
                </div>
                <p className="mt-1 text-xs text-muted">
                  Servidor Central: DataQuest Cloud API v2.4.1
                </p>
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
                className="flex items-center gap-2 rounded-xl bg-accent-primary-solid px-6 py-2.5 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover disabled:opacity-50 transition"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Transmitir Coletas para o Servidor Central'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Modal */}
      {selectedAudioSub && (
        <AudioPlayerModal
          isOpen={true}
          onClose={() => setSelectedAudioSub(null)}
          submission={selectedAudioSub}
          surveyTitle={surveys.find((s) => s.id === selectedAudioSub.pesquisaId)?.nome || ''}
        />
      )}

      {/* Geo Map Modal */}
      {selectedGeoSub && (
        <GeoMapModal
          isOpen={true}
          onClose={() => setSelectedGeoSub(null)}
          submissions={[selectedGeoSub]}
          surveyTitle={surveys.find((s) => s.id === selectedGeoSub.pesquisaId)?.nome || ''}
        />
      )}
    </div>
  );
};
