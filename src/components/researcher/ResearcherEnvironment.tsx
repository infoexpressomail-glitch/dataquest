import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Smartphone,
  CheckCircle2,
  Clock,
  Target,
  MapPin,
  Mic,
  Volume2,
  RefreshCw,
  Sparkles,
  Play,
  TrendingUp,
  Layers,
  ChevronDown,
  Database,
  Wifi,
  WifiOff,
  User,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  DownloadCloud,
  X,
} from 'lucide-react';
import { Survey, InterviewSubmission } from '../../types';
import { filterResearcherVisibleSurveys } from '../../utils/researcherUtils';
import { CollectionSimulator } from '../simulator/CollectionSimulator';
import { ResearcherIndividualGoalsView } from '../metas/ResearcherIndividualGoalsView';
import { AudioPlayerModal } from '../surveys/AudioPlayerModal';
import { GeoMapModal } from '../surveys/GeoMapModal';

/**
 * Portal do Pesquisador dentro da gestão (reescrito).
 *
 * Mesma simplificação aplicada ao Modo Pesquisador de campo:
 *   - Lista APENAS as pesquisas ativas liberadas para o login.
 *   - Metas inline em cada pesquisa (não há mais aba separada).
 *   - Sincronização é uma ação pontual (cabeçalho/painel), não um menu.
 *   - Coleta abre o formulário com um botão "Voltar às pesquisas".
 *
 * O histórico de coletas continua acessível, mas recolhido, preservando a
 * reprodução de áudio e o mapa de geolocalização.
 */
export const ResearcherEnvironment: React.FC = () => {
  const {
    currentUser,
    surveys,
    submissions,
    setEditingSurvey,
    effectiveOnline,
    offlineQueue,
    syncOfflineQueue,
    forceSyncPendingWithSupabase,
    pendingIndexedDbCount,
    setCurrentUser,
    collaborators,
  } = useApp();

  // Somente pesquisas ATIVAS liberadas para este login.
  const researcherSurveys = filterResearcherVisibleSurveys(surveys, currentUser);
  const researcherSubmissions = submissions.filter(
    (sub) => sub.pesquisadorId === currentUser.id
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const submissionsToday = researcherSubmissions.filter(
    (sub) => sub.dataHora && sub.dataHora.slice(0, 10) === todayStr
  );
  const pendingCount = offlineQueue.length + pendingIndexedDbCount;

  const [view, setView] = useState<'pesquisas' | 'coleta'>('pesquisas');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [expandedGoalsId, setExpandedGoalsId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [selectedAudioSub, setSelectedAudioSub] = useState<InterviewSubmission | null>(null);
  const [selectedGeoSub, setSelectedGeoSub] = useState<InterviewSubmission | null>(null);

  const adminColab = collaborators.find((c) => c.perfilAcessoId === 'prof_admin');

  const handleStartColeta = (survey: Survey) => {
    setEditingSurvey(survey);
    setSelectedSurvey(survey);
    setView('coleta');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const [queueRes, surveyRes] = await Promise.all([
        syncOfflineQueue(),
        forceSyncPendingWithSupabase(false),
      ]);
      const total = queueRes.count + surveyRes.count;
      setSyncFeedback(
        total > 0
          ? `${total} registro(s) enviado(s) ao servidor.`
          : 'Não havia nada pendente para enviar.'
      );
    } catch (err: any) {
      setSyncFeedback(`Erro na sincronização: ${err?.message || 'Falha de conexão'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // ============================ COLETA ====================================
  if (view === 'coleta') {
    const current = selectedSurvey || researcherSurveys[0];
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-ui bg-surface p-4 shadow-xl">
          <button
            onClick={() => setView('pesquisas')}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl border border-ui bg-surface-raised px-3.5 py-2 text-xs font-bold text-secondary hover:bg-surface-hover hover:text-primary transition"
          >
            <ArrowLeft className="h-4 w-4 text-accent-primary" />
            <span>Voltar às pesquisas</span>
          </button>
          <div className="min-w-0 sm:text-right">
            <div className="truncate text-sm font-bold text-primary">{current?.nome}</div>
            <div className="font-mono text-[10px] text-muted">{current?.codigo}</div>
          </div>
        </div>

        {researcherSurveys.length > 1 && (
          <div className="flex items-center gap-3 rounded-xl border border-ui bg-surface p-3">
            <span className="text-xs font-bold text-secondary">Pesquisa em andamento:</span>
            <select
              value={current?.id || researcherSurveys[0]?.id}
              onChange={(e) => {
                const s = researcherSurveys.find((x) => x.id === e.target.value);
                if (s) {
                  setSelectedSurvey(s);
                  setEditingSurvey(s);
                }
              }}
              className="rounded-lg border border-ui bg-surface-app px-3 py-1.5 text-xs font-semibold text-primary focus:border-accent-primary focus:outline-none"
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

  // =========================== PESQUISAS ==================================
  return (
    <div className="space-y-5">
      {/* Cabeçalho compacto do pesquisador */}
      <div className="relative overflow-hidden rounded-2xl border border-accent-primary-soft-border bg-gradient-to-r from-surface via-surface-raised to-surface p-5 shadow-2xl">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-primary-solid text-on-accent text-lg font-black shadow-lg shadow-accent-primary-solid/40">
              {currentUser.nome.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-success-soft-border bg-accent-success-soft px-2.5 py-0.5 text-[10px] font-bold text-accent-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-success-solid animate-pulse" />
                  Pesquisador de Campo
                </span>
                <span className="rounded-md border border-ui bg-surface-raised px-2 py-0.5 font-mono text-[10px] text-secondary">
                  {currentUser.login}
                </span>
              </div>
              <h1 className="mt-1 truncate text-lg font-black text-primary">
                Olá, {currentUser.nome.split(' ')[0]}!
              </h1>
              <p className="text-[11px] text-muted">
                {researcherSurveys.length} pesquisa(s) ativa(s) ·{' '}
                {submissionsToday.length} coleta(s) hoje
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                effectiveOnline
                  ? 'border-accent-success-soft-border bg-accent-success-soft text-accent-success'
                  : 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning'
              }`}
            >
              {effectiveOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {effectiveOnline ? 'Online' : 'Offline'}
            </span>

            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-warning-soft-border bg-accent-warning-soft px-2.5 py-1 text-[10px] font-bold text-accent-warning">
                <Database className="h-3 w-3" />
                {pendingCount} pendente(s)
              </span>
            )}

            <button
              onClick={() => setSyncOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-3 py-2 text-xs font-bold text-secondary hover:bg-surface-hover hover:text-primary transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>

            {adminColab && (
              <button
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

      {/* Painel de sincronização (ação pontual) */}
      {syncOpen && (
        <div className="rounded-2xl border border-ui bg-surface p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-primary">Carregar / Descarregar</h3>
              <p className="text-[10px] text-muted">
                Recarregue as pesquisas ativas e envie as coletas feitas offline.
              </p>
            </div>
            <button
              onClick={() => setSyncOpen(false)}
              className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !effectiveOnline}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-md hover:bg-accent-primary-solid-hover disabled:opacity-50 transition"
            >
              {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {isSyncing ? 'Sincronizando...' : 'Transmitir coletas'}
            </button>
            <span className="text-[10px] text-muted">
              {pendingCount > 0 ? `${pendingCount} pendente(s)` : 'Tudo sincronizado'}
            </span>
          </div>
          {syncFeedback && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent-success-soft-border bg-accent-success-soft p-2.5 text-[11px] text-accent-success">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}
        </div>
      )}

      {/* Pesquisas ativas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-accent-primary" />
          <h2 className="text-sm font-black text-primary">Pesquisas ativas para você</h2>
        </div>
        <span className="rounded-full border border-ui bg-surface-raised px-2.5 py-1 text-[10px] font-bold text-secondary">
          {researcherSurveys.length}
        </span>
      </div>

      <div className="space-y-3">
        {researcherSurveys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ui bg-surface p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-muted">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-primary">
              Nenhuma pesquisa ativa no momento
            </h3>
            <p className="mt-1 text-[11px] text-muted">
              As pesquisas ativas vinculadas ao seu login aparecerão aqui.
            </p>
          </div>
        ) : (
          researcherSurveys.map((survey) => {
            const surveySubs = researcherSubmissions.filter((s) => s.pesquisaId === survey.id);
            const isOpen = expandedGoalsId === survey.id;
            return (
              <div
                key={survey.id}
                className="rounded-2xl border border-ui bg-surface-card p-4 shadow-xl transition hover:border-accent-primary-soft-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-block rounded-md border border-ui bg-surface-raised px-2 py-0.5 font-mono text-[10px] text-accent-primary">
                      {survey.codigo}
                    </span>
                    <h3 className="mt-2 text-sm font-bold leading-snug text-primary">
                      {survey.nome}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted">{survey.descricao}</p>
                  </div>
                  {survey.layoutStyle === 'MOBILE_PREMIUM' && (
                    <span className="shrink-0 rounded-full border border-accent-primary-soft-border bg-accent-primary-soft px-2 py-0.5 text-[9px] font-bold text-accent-primary">
                      Premium
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-accent-success" />
                    {surveySubs.length} coleta(s) por você
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Ciclo #{survey.cicloAtual}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-accent-primary" /> GPS + áudio
                  </span>
                </div>

                {/* Metas inline */}
                <div className="mt-3 border-t border-subtle pt-3">
                  <button
                    onClick={() => setExpandedGoalsId((prev) => (prev === survey.id ? null : survey.id))}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted hover:text-primary transition"
                  >
                    <Target className="h-3.5 w-3.5 text-accent-primary" />
                    Metas desta pesquisa
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="mt-2">
                      <ResearcherIndividualGoalsView activeSurvey={survey} fieldMode />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleStartColeta(survey)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-primary-solid px-4 py-3 text-xs font-bold text-on-accent shadow-lg hover:bg-accent-primary-solid-hover active:scale-[0.99] transition"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Iniciar coleta
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Histórico recolhido (preserva áudio e mapa) */}
      <div className="rounded-2xl border border-ui bg-surface shadow-xl">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent-success" />
            <span className="text-sm font-bold text-primary">Minhas coletas recentes</span>
            <span className="rounded-full border border-ui bg-surface-raised px-2 py-0.5 text-[10px] font-bold text-secondary">
              {researcherSubmissions.length}
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 text-muted transition-transform ${showHistory ? 'rotate-180' : ''}`} />
        </button>

        {showHistory && (
          <div className="overflow-x-auto border-t border-ui px-5 py-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ui text-[10px] font-bold uppercase tracking-wider text-muted">
                  <th className="pb-2">Pesquisa</th>
                  <th className="pb-2">Data / Hora</th>
                  <th className="pb-2">Áudio</th>
                  <th className="pb-2">Mapa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui/60">
                {researcherSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-surface-raised transition">
                    <td className="py-2.5 pr-3 text-primary">
                      {surveys.find((s) => s.id === sub.pesquisaId)?.nome || sub.pesquisaId}
                    </td>
                    <td className="py-2.5 pr-3 text-muted">
                      {new Date(sub.dataHora).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 pr-3">
                      {sub.audioGravacao ? (
                        <button
                          onClick={() => setSelectedAudioSub(sub)}
                          className="inline-flex items-center gap-1 rounded-md border border-accent-purple-soft-border bg-accent-purple-soft px-2 py-0.5 text-[10px] font-bold text-accent-purple"
                        >
                          <Volume2 className="h-3 w-3" />
                          Ouvir
                        </button>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {sub.geolocalizacao ? (
                        <button
                          onClick={() => setSelectedGeoSub(sub)}
                          className="inline-flex items-center gap-1 rounded-md border border-accent-primary-soft-border bg-accent-primary-soft px-2 py-0.5 text-[10px] font-bold text-accent-primary"
                        >
                          <MapPin className="h-3 w-3" />
                          Ver mapa
                        </button>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {researcherSubmissions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-muted">
                      Nenhuma coleta registrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      {selectedAudioSub && (
        <AudioPlayerModal onClose={() => setSelectedAudioSub(null)} submission={selectedAudioSub} />
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
