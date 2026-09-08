import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { filterResearcherVisibleSurveys } from '../utils/researcherUtils';
import { ResearcherIndividualGoalsView } from '../components/metas/ResearcherIndividualGoalsView';
import { FieldSession } from './fieldTypes';
import {
  ClipboardList,
  WifiOff,
  ArrowRight,
  CheckCircle2,
  Inbox,
  TrendingUp,
  Sparkles,
  Target,
  ChevronDown,
} from 'lucide-react';

interface FieldDashboardProps {
  /** Sessão autenticada no sub-app (opcional — usa o contexto quando ausente). */
  session?: FieldSession;
  onStartColeta: () => void;
  onGoSync: () => void;
}

/**
 * Tela inicial do sub-app: identidade + cards de resumo + pesquisas liberadas.
 */
export const FieldDashboard: React.FC<FieldDashboardProps> = ({
  session,
  onStartColeta,
  onGoSync,
}) => {
  const {
    currentUser: ctxUser,
    currentProfile: ctxProfile,
    surveys: ctxSurveys,
    submissions,
    effectiveOnline,
    offlineQueue,
    pendingIndexedDbCount,
  } = useApp();

  // Usa o pesquisador autenticado (sessão) quando presente; senão cai no mock do contexto.
  const currentUser = session?.user ?? ctxUser;
  const currentProfile = session?.profile ?? ctxProfile;
  const surveys = session?.surveys ?? ctxSurveys;

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  const availableSurveys = isResearcher
    ? filterResearcherVisibleSurveys(surveys, currentUser)
    : surveys.filter((s) => s.status !== 'excluida');

  const researcherSubmissions = submissions.filter(
    (sub) => sub.pesquisadorId === currentUser.id
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const submissionsToday = researcherSubmissions.filter(
    (sub) => sub.dataHora && sub.dataHora.slice(0, 10) === todayStr
  );

  const totalCount = researcherSubmissions.length;

  // Meta diária simples (reaproveita a mesma premissa do ResearcherEnvironment)
  const dailyTarget = 20;
  const todayProgressPercent = Math.min(
    100,
    Math.round((submissionsToday.length / dailyTarget) * 100)
  );

  const pendingCount = offlineQueue.length + pendingIndexedDbCount;

  // Pesquisa cujas metas estão expandidas no card do dashboard.
  const [expandedGoalsSurveyId, setExpandedGoalsSurveyId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Banner de identidade */}
      <div className="relative overflow-hidden rounded-2xl border border-accent-primary-soft-border bg-gradient-to-r from-surface via-surface-raised to-surface p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-on-accent font-black text-xl shadow-lg shadow-emerald-900/50 shrink-0">
              {currentUser.nome.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-success-soft border border-accent-success-soft-border px-2.5 py-0.5 text-[10px] font-bold text-accent-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-success-solid animate-pulse" />
                  Pesquisador de Campo
                </span>
                <span className="rounded-md bg-surface-raised px-2 py-0.5 text-[10px] font-mono text-secondary border border-ui">
                  Login: {currentUser.login}
                </span>
              </div>
              <h1 className="mt-1.5 text-lg font-black text-primary">
                Olá, {currentUser.nome.split(' ')[0]}
              </h1>
              <p className="text-[11px] text-muted font-medium">
                Matrícula {currentUser.cpf} • Foco no seu trabalho de campo
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2">
            <button
              onClick={onStartColeta}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-primary-solid px-5 py-3 text-sm font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              Iniciar nova coleta
            </button>
            <span
              className={`inline-flex items-center gap-1.5 self-start sm:self-end text-[10px] font-bold ${
                effectiveOnline ? 'text-accent-success' : 'text-accent-warning'
              }`}
            >
              {effectiveOnline ? (
                <>Conectado ao servidor</>
              ) : (
                <><WifiOff className="h-3 w-3" /> Modo offline — coletas serão sincronizadas depois</>
              )}
            </span>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-accent-primary-soft blur-3xl" />
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Coletas de hoje"
          value={String(submissionsToday.length)}
          hint={`${todayProgressPercent}% da meta diária (${dailyTarget})`}
          tone="primary"
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Total acumulado"
          value={String(totalCount)}
          hint="Suas entrevistas concluídas"
          tone="success"
        />
        <SummaryCard
          icon={<WifiOff className="h-4 w-4" />}
          label="Fila offline"
          value={String(pendingCount)}
          hint={pendingCount > 0 ? 'Pendentes de sincronização' : 'Tudo sincronizado'}
          tone={pendingCount > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* CTA para sincronização quando há pendências */}
      {pendingCount > 0 && (
        <button
          onClick={onGoSync}
          className="w-full inline-flex items-center justify-between gap-3 rounded-xl border border-accent-warning-soft-border bg-accent-warning-soft px-4 py-3 text-xs font-semibold text-accent-warning hover:opacity-90 transition"
        >
          <span className="inline-flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            Você tem {pendingCount} registro(s) na fila offline aguardando sincronização.
          </span>
          <span className="inline-flex items-center gap-1 font-bold">
            Sincronizar <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </button>
      )}

      {/* Pesquisas liberadas para coletar */}
      <div className="rounded-2xl border border-ui bg-surface-card p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-primary">
                Pesquisas liberadas para coletar
              </h2>
              <p className="text-[10px] text-muted">
                Apenas pesquisas ativas/vínculadas ou re-habilitadas para o seu login.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-surface-raised border border-ui px-2.5 py-1 text-[10px] font-bold text-secondary">
            {availableSurveys.length} disponível(is)
          </span>
        </div>

        <div className="mt-4">
          {availableSurveys.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ui bg-surface p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-muted">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-primary">
                Nenhuma pesquisa liberada no momento
              </h3>
              <p className="mt-1 max-w-sm text-[11px] text-muted leading-relaxed">
                As pesquisas ativas atribuídas a você (ou re-habilitadas pela
                coordenação) aparecerão aqui. Pesquisas finalizadas não são exibidas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableSurveys.map((survey) => {
                const doneCount = researcherSubmissions.filter(
                  (s) => s.pesquisaId === survey.id
                ).length;
                return (
                  <div
                    key={survey.id}
                    className="rounded-xl border border-ui bg-surface p-4 flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-md bg-surface-raised border border-ui px-2 py-0.5 text-[10px] font-mono text-accent-primary">
                        {survey.codigo}
                      </span>
                      <span className="text-[10px] text-muted font-semibold">
                        {survey.perguntas?.length ?? 0} perguntas
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-primary leading-snug">
                      {survey.nome}
                    </h3>
                    <p className="mt-1 text-[11px] text-muted line-clamp-2">
                      {survey.descricao}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-muted font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent-success" />
                      {doneCount} coletas feitas por você
                    </div>

                    {/* Metas relacionadas à pesquisa liberada (apenas pesquisador de campo) */}
                    <div className="mt-3 border-t border-subtle pt-3">
                      <button
                        onClick={() =>
                          setExpandedGoalsSurveyId((prev) =>
                            prev === survey.id ? null : survey.id
                          )
                        }
                        className="w-full inline-flex items-center justify-between gap-2 rounded-lg border border-ui bg-surface-raised px-3 py-2 text-[11px] font-bold text-primary hover:bg-surface-hover transition"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-accent-primary" />
                          Metas desta pesquisa
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-muted transition-transform ${
                            expandedGoalsSurveyId === survey.id ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {expandedGoalsSurveyId === survey.id && (
                        <div className="mt-2">
                          <ResearcherIndividualGoalsView activeSurvey={survey} />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={onStartColeta}
                      className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-md shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors"
                    >
                      Coletar agora <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: 'primary' | 'success' | 'warning' | 'info' | 'danger';
}

const TONE_MAP: Record<SummaryCardProps['tone'], string> = {
  primary: 'bg-accent-primary-soft text-accent-primary border-accent-primary-soft-border',
  success: 'bg-accent-success-soft text-accent-success border-accent-success-soft-border',
  warning: 'bg-accent-warning-soft text-accent-warning border-accent-warning-soft-border',
  info: 'bg-accent-info-soft text-accent-info border-accent-info-soft-border',
  danger: 'bg-accent-danger-soft text-accent-danger border-accent-danger-soft-border',
};

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value, hint, tone }) => {
  return (
    <div className="rounded-2xl border border-ui bg-surface-card p-4 shadow-xl">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${TONE_MAP[tone]}`}>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-black text-primary">{value}</div>
      <div className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-[10px] text-muted">{hint}</div>
    </div>
  );
};
