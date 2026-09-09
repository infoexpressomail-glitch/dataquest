import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import {
  FileQuestion,
  MessageSquare,
  Key,
  Users,
  Activity,
  ArrowUpRight,
  PlusCircle,
  Smartphone,
  CheckCircle2,
  Clock,
  Sparkles,
  Wifi,
  WifiOff,
  RefreshCw,
  CloudOff,
  Gauge,
  Share2,
  MonitorCog,
  Table2,
  Link2,
} from 'lucide-react';
import { SurveyEvolutionCard } from './home/SurveyEvolutionCard';
import { SurveyConsultaTable } from './home/SurveyConsultaTable';
import { shareFieldLink } from '../field/fieldRoute';
import { Survey } from '../types';

/** Cabeçalho de seção do dashboard — melhora a organização e a leitura. */
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-2.5">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
      {icon}
    </span>
    <div className="min-w-0">
      <h2 className="text-sm font-bold tracking-tight text-primary">{title}</h2>
      {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
    </div>
  </div>
);

export const HomeDashboard: React.FC = () => {
  const {
    language,
    surveys,
    submissions,
    collaborators,
    connections,
    hasPermission,
    setActiveModule,
    setEditingSurvey,
    effectiveOnline,
    offlineQueue,
    pendingIndexedDbCount,
    syncProgress,
  } = useApp();

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const activeSurveysCount = surveys.filter((s) => s.status === 'ativa').length;
  const inativeSurveysCount = surveys.filter((s) => s.status === 'inativa').length;
  const totalSurveysCount = surveys.filter((s) => s.status !== 'excluida').length;
  const totalInterviews = submissions.length;
  // Licença = colaborador ativo. O total de licenças é o total de colaboradores
  // cadastrados; as licenças em uso são os colaboradores ativos.
  const activeLicenses = collaborators.length; // Total de licenças disponibilizáveis
  const usedLicenses = collaborators.filter((c) => c.ativo).length;

  const canViewPaineis = hasPermission('home_visualiza_paineis_superiores');
  const canViewConexoes = hasPermission('home_visualiza_conexoes_recentes');
  const canViewEquipe = hasPermission('colaboradores_acesso');

  // Feedback visual (toast) para o compartilhamento do link de coleta de campo
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const notify = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  };

  // Compartilha o link do Modo Pesquisador (login de campo) da pesquisa ativa
  const handleShare = async (survey: Survey) => {
    const result = await shareFieldLink({
      surveyName: survey.nome,
      surveyCode: survey.codigo,
    });
    if (result === 'shared') {
      notify(`Link de coleta compartilhado: ${survey.nome}.`);
    } else if (result === 'copied') {
      notify(`Link de coleta copiado! Compartilhe com o pesquisador de ${survey.nome}.`);
    } else {
      notify('Não foi possível copiar o link automaticamente. Abra /campo no navegador.');
    }
  };

  // Grade de cards do topo é dinâmica: só entra o que o perfil pode agir sobre.
  // Isso evita "dashboard showcase" (mostrar tudo que existe) para perfis
  // como o Analista, que não administra colaboradores/licenças.
  const painelCardCount = 3 + (canViewEquipe ? 1 : 0);
  const painelGridClass =
    painelCardCount === 4
      ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid grid-cols-1 gap-4 sm:grid-cols-3';

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Header */}
      <div className="relative overflow-hidden flex flex-col justify-between gap-4 rounded-2xl border border-ui bg-surface p-6 text-primary shadow-xl md:flex-row md:items-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary-soft rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold border ${
                syncProgress.isActive
                  ? 'bg-accent-primary-soft text-accent-primary border-accent-primary-soft-border'
                  : effectiveOnline
                  ? 'bg-accent-success-soft text-accent-success border-accent-success-soft-border'
                  : 'bg-accent-warning-soft text-accent-warning border-accent-warning-soft-border'
              }`}
            >
              {syncProgress.isActive ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : effectiveOnline ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              {syncProgress.isActive
                ? `Sincronizando (${syncProgress.percent}%)`
                : effectiveOnline
                ? 'Online'
                : 'Offline'}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-primary">
            Painel Geral de Controle
          </h1>
          <p className="mt-1 text-sm text-muted max-w-2xl leading-relaxed">
            Monitoramento em tempo real de coletas, regras condicionais, metas quantitativas e sincronização de dados.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          {hasPermission('pesquisa_criar') && (
            <button
              id="btn-home-quick-new-survey"
              onClick={() => {
                setEditingSurvey(null);
                setActiveModule('wizard');
              }}
              className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 transition hover:bg-accent-primary-solid-hover active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{t('newSurvey')}</span>
            </button>
          )}

          <button
            id="btn-home-quick-simulator"
            onClick={() => setActiveModule('simulador')}
            className="flex items-center gap-1.5 rounded-lg bg-surface-raised px-4 py-2 text-xs font-semibold text-primary border border-ui transition hover:bg-surface-hover hover:text-primary active:scale-95"
          >
            <Smartphone className="h-4 w-4 text-accent-primary" />
            <span>Simulador de Coleta</span>
          </button>
        </div>
      </div>

      {/* Seção 1: Indicadores Gerais (cards de topo) */}
      {canViewPaineis && (
        <div className="space-y-3">
        <SectionHeader
          icon={<Gauge className="h-4 w-4" />}
          title="Indicadores Gerais"
          subtitle="Visão consolidada de pesquisas, coletas e equipe"
        />
        <div className={painelGridClass}>
          {/* Card 1: Total de Pesquisas */}
          <div className="relative overflow-hidden rounded-2xl border border-ui bg-surface p-5 shadow-xl transition-all hover:border-ui">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-primary-soft rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t('totalSurveys')}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
                <FileQuestion className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-primary">
                {totalSurveysCount}
              </span>
              <span className="text-xs font-semibold text-accent-success">
                {activeSurveysCount} ativas
              </span>
            </div>
            <div className="mt-2 text-xs text-muted">
              {inativeSurveysCount} inativas no repositório
            </div>
          </div>

          {/* Card 2: Entrevistas Realizadas */}
          <div className="relative overflow-hidden rounded-2xl border border-ui bg-surface p-5 shadow-xl transition-all hover:border-ui">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-info-soft rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t('completedInterviews')}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-info-soft text-accent-info border border-accent-info-soft-border">
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-primary">
                {totalInterviews}
              </span>
              <span className="text-xs font-semibold text-accent-success">
                100% validadas
              </span>
            </div>
            <div className="mt-2 text-xs text-muted">
              Coletas com áudio e coordenadas GPS
            </div>
          </div>

          {/* Card 3: Licenças e Dispositivos */}
          <div className="relative overflow-hidden rounded-2xl border border-ui bg-surface p-5 shadow-xl transition-all hover:border-ui">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-success-soft rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t('activeLicenses')}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-success-soft text-accent-success border border-accent-success-soft-border">
                <Key className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-primary">
                {usedLicenses} / {activeLicenses}
              </span>
              <span className="text-xs font-medium text-muted">
                colaboradores
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-accent-success-solid shadow-sm"
                style={{ width: `${activeLicenses > 0 ? (usedLicenses / activeLicenses) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-muted">
              Licenças em uso / disponibilizáveis
            </div>
          </div>

          {/* Card 4: Colaboradores Ativos — só para quem administra a equipe */}
          {canViewEquipe && (
            <div className="relative overflow-hidden rounded-2xl border border-ui bg-surface p-5 shadow-xl transition-all hover:border-ui">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent-purple-soft rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Equipe em Campo
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-purple-solid/10 text-accent-purple border border-accent-purple-soft-border">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-primary">
                  {collaborators.length}
                </span>
                <span className="text-xs font-medium text-muted">
                  colaboradores
                </span>
              </div>
              <div className="mt-2 text-xs text-muted">
                Pesquisadores, coordenadores e analistas
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Seção 2: Consulta de Pesquisas (quadro abaixo dos cards de indicadores) */}
      <div className="space-y-3">
        <SectionHeader
          icon={<Table2 className="h-4 w-4" />}
          title="Consulta de Pesquisas"
          subtitle="Gerencie, ative e compartilhe o link de coleta de campo"
        />
        <SurveyConsultaTable />
      </div>

      {/* Seção 3: Monitoramento de Coleta + Conexões Recentes */}
      <div className="space-y-3">
      <SectionHeader
        icon={<MonitorCog className="h-4 w-4" />}
        title="Monitoramento de Coleta"
        subtitle="Acompanhamento de metas, volume coletado e conexões em tempo real"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna 1 & 2: Pesquisas Ativas e Monitoramento */}
        <div className="space-y-6 lg:col-span-2">
          {/* Gráfico de Evolução da Pesquisa em Andamento e Anteriores */}
          <SurveyEvolutionCard surveys={surveys} submissions={submissions} />

          <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-ui pb-4">
              <div>
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <span className="w-1 h-3 bg-accent-primary-solid rounded-full" />
                  Pesquisas em Execução
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Acompanhamento de metas e volume coletado
                </p>
              </div>

              <button
                id="btn-view-all-surveys"
                onClick={() => setActiveModule('pesquisas')}
                className="flex items-center gap-1 text-xs font-semibold text-accent-primary hover:text-accent-primary transition-colors"
              >
                <span>Ver todas</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {surveys
                .filter((s) => s.status === 'ativa')
                .map((survey) => {
                  const surveySubs = submissions.filter((sub) => sub.pesquisaId === survey.id);
                  const totalMetasAlvo = survey.metas.reduce((acc, m) => acc + (m.quantidadeAlvo || 0), 0);
                  const totalMetasAtingidas = survey.metas.reduce((acc, m) => acc + (m.quantidadeAtingida || 0), 0);
                  const metaProgress = totalMetasAlvo > 0 ? Math.min(100, Math.round((totalMetasAtingidas / totalMetasAlvo) * 100)) : 0;

                  return (
                    <div
                      key={survey.id}
                      className="group rounded-xl border border-ui/80 bg-surface-raised p-4 transition hover:border-ui"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-accent-primary-soft border border-accent-primary-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-primary">
                              {survey.codigo}
                            </span>
                            <span className="text-xs text-muted">
                              Ciclo {survey.cicloAtual} • v{survey.versao}
                            </span>
                            {survey.habilitarColetaWeb && (
                              <span className="rounded bg-accent-info-soft border border-accent-info-soft-border px-1.5 py-0.5 text-[9px] font-medium text-accent-info">
                                Coleta Web Ativa
                              </span>
                            )}
                          </div>
                          <h4 className="mt-1.5 text-sm font-semibold text-primary">
                            {survey.nome}
                          </h4>
                          <p className="text-xs text-muted line-clamp-1 mt-0.5">
                            {survey.descricao}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            id={`btn-survey-share-${survey.id}`}
                            onClick={() => handleShare(survey)}
                            title="Compartilhar link de coleta (login de campo)"
                            className="inline-flex items-center gap-1 rounded-lg bg-surface-raised px-3 py-1.5 text-xs font-semibold text-accent-primary border border-ui hover:bg-accent-primary-soft hover:text-accent-primary transition-colors"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Compartilhar</span>
                          </button>
                          <button
                            id={`btn-survey-detail-${survey.id}`}
                            onClick={() => {
                              setEditingSurvey(survey);
                              setActiveModule('wizard');
                            }}
                            className="rounded-lg bg-surface-raised px-3 py-1.5 text-xs font-semibold text-primary border border-ui hover:bg-surface-hover hover:text-primary transition-colors"
                          >
                            Abrir Wizard
                          </button>
                          <button
                            id={`btn-survey-responses-${survey.id}`}
                            onClick={() => setActiveModule('respostas')}
                            className="rounded-lg bg-accent-primary-soft px-3 py-1.5 text-xs font-semibold text-accent-primary border border-accent-primary-soft-border hover:bg-accent-primary-solid-hover hover:text-on-accent transition-colors"
                          >
                            Respostas ({surveySubs.length})
                          </button>
                        </div>
                      </div>

                      {/* Metas preview bar */}
                      {survey.metas.length > 0 && (
                        <div className="mt-3 border-t border-ui pt-3">
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>Progresso das Metas Amostrais</span>
                            <span className="font-semibold text-primary">
                              {totalMetasAtingidas} / {totalMetasAlvo} ({metaProgress}%)
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                            <div
                              className="h-full rounded-full bg-accent-primary-solid transition-all duration-500 shadow-sm"
                              style={{ width: `${metaProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Coluna 3: Conexões Recentes (Conforme requisito do Módulo Home) */}
        <div className="space-y-6">
          {canViewConexoes && (
            <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-ui pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent-success" />
                  <h3 className="text-sm font-bold text-primary">
                    {t('recentConnections')}
                  </h3>
                </div>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-success-solid opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-success-solid"></span>
                </span>
              </div>

              <div className="mt-3 divide-y divide-ui/60">
                {connections.map((conn) => (
                  <div key={conn.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary">
                        {conn.usuario}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                          conn.status === 'sucesso'
                            ? 'bg-accent-success-soft text-accent-success border-accent-success-soft-border'
                            : conn.status === 'bloqueado'
                            ? 'bg-accent-danger-soft text-accent-danger border-accent-danger-soft-border'
                            : 'bg-accent-warning-soft text-accent-warning border-accent-warning-soft-border'
                        }`}
                      >
                        {conn.status}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                      <span>{conn.perfil}</span>
                      <span className="font-mono">{conn.ip}</span>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                      <Clock className="h-3 w-3" />
                      <span>{conn.dataHora}</span>
                      <span>• {conn.navegador.split('/')[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status de Sincronização em Nuvem — dados reais do sistema */}
          <div className="rounded-2xl border border-accent-primary-soft-border bg-surface p-5 text-xs shadow-xl">
            <div className="flex items-center gap-2 font-bold text-primary">
              <CloudOff className="h-4 w-4 text-accent-primary" />
              <span>Sincronização em Nuvem</span>
            </div>
            <p className="mt-2 text-secondary leading-relaxed">
              Dados são persistidos localmente e sincronizados quando a conexão é restabelecida.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold">
              <span
                className={`inline-flex items-center gap-1 ${
                  syncProgress.isActive
                    ? 'text-accent-primary'
                    : effectiveOnline
                    ? 'text-accent-success'
                    : 'text-accent-warning'
                }`}
              >
                {syncProgress.isActive ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : effectiveOnline ? (
                  <Wifi className="h-3.5 w-3.5" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5" />
                )}
                {syncProgress.isActive
                  ? `Sincronizando (${syncProgress.percent}%)`
                  : effectiveOnline
                  ? 'Online — conectado'
                  : 'Offline — operando localmente'}
              </span>
              {(pendingIndexedDbCount > 0 || offlineQueue.length > 0) && (
                <span className="inline-flex items-center gap-1 text-accent-warning">
                  <Clock className="h-3 w-3" />
                  {pendingIndexedDbCount} no IndexedDB{pendingIndexedDbCount > 0 && offlineQueue.length > 0 ? ' • ' : ''}
                  {offlineQueue.length > 0 ? `${offlineQueue.length} p/ sincronizar` : ''}
                </span>
              )}
            </div>
            {pendingIndexedDbCount === 0 && offlineQueue.length === 0 && effectiveOnline && (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-accent-success font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Repositório sincronizado — nada pendente</span>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Toast de feedback do compartilhamento de link */}
      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed bottom-14 right-4 z-50 flex max-w-sm items-center gap-2.5 rounded-xl border border-accent-success-soft-border bg-surface-raised px-4 py-3 text-xs font-semibold text-primary shadow-2xl"
        >
          {toast.includes('copiado') || toast.includes('compartilhado') ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-success" />
          ) : (
            <Link2 className="h-4 w-4 shrink-0 text-accent-primary" />
          )}
          <span className="leading-snug">{toast}</span>
        </div>
      )}
    </div>
  );
};
