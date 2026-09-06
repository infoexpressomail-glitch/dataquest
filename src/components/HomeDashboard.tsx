import React from 'react';
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
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { SurveyEvolutionCard } from './home/SurveyEvolutionCard';

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
  } = useApp();

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const activeSurveysCount = surveys.filter((s) => s.status === 'ativa').length;
  const inativeSurveysCount = surveys.filter((s) => s.status === 'inativa').length;
  const totalSurveysCount = surveys.filter((s) => s.status !== 'excluida').length;
  const totalInterviews = submissions.length;
  const activeLicenses = 50; // Total licensed devices/collectors
  const usedLicenses = collaborators.filter((c) => c.ativo).length;

  const canViewPaineis = hasPermission('home_visualiza_paineis_superiores');
  const canViewConexoes = hasPermission('home_visualiza_conexoes_recentes');
  const canViewEquipe = hasPermission('colaboradores_acesso');

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
      <div className="relative overflow-hidden flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-[#16171d] p-6 text-white shadow-xl md:flex-row md:items-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-blue-600/15 px-2.5 py-1 text-xs font-bold text-blue-400 border border-blue-500/30">
              Cluster SA-EAST-1 • Alta Disponibilidade
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-white">
            Painel Geral de Controle
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl leading-relaxed">
            Monitoramento em tempo real de coletas, regras condicionais, metas quantitativas e sincronização em nuvem.
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
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500 active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{t('newSurvey')}</span>
            </button>
          )}

          <button
            id="btn-home-quick-simulator"
            onClick={() => setActiveModule('simulador')}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-700 transition hover:bg-slate-700 hover:text-white active:scale-95"
          >
            <Smartphone className="h-4 w-4 text-blue-400" />
            <span>Simulador de Coleta</span>
          </button>
        </div>
      </div>

      {/* Paineis Superiores com quantidades de todas as pesquisas, entrevistas e licenças */}
      {canViewPaineis && (
        <div className={painelGridClass}>
          {/* Card 1: Total de Pesquisas */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#16171d] p-5 shadow-xl transition-all hover:border-slate-700">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {t('totalSurveys')}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20">
                <FileQuestion className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white">
                {totalSurveysCount}
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                {activeSurveysCount} ativas
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {inativeSurveysCount} inativas no repositório
            </div>
          </div>

          {/* Card 2: Entrevistas Realizadas */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#16171d] p-5 shadow-xl transition-all hover:border-slate-700">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {t('completedInterviews')}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-600/10 text-cyan-400 border border-cyan-500/20">
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white">
                {totalInterviews}
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                100% validadas
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Coletas com áudio e coordenadas GPS
            </div>
          </div>

          {/* Card 3: Licenças e Dispositivos */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#16171d] p-5 shadow-xl transition-all hover:border-slate-700">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {t('activeLicenses')}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Key className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white">
                {usedLicenses} / {activeLicenses}
              </span>
              <span className="text-xs font-medium text-slate-400">
                dispositivos
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 shadow-sm"
                style={{ width: `${(usedLicenses / activeLicenses) * 100}%` }}
              />
            </div>
          </div>

          {/* Card 4: Colaboradores Ativos — só para quem administra a equipe */}
          {canViewEquipe && (
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#16171d] p-5 shadow-xl transition-all hover:border-slate-700">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Equipe em Campo
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-white">
                  {collaborators.length}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  colaboradores
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Pesquisadores, coordenadores e analistas
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Pesquisas em Andamento + Conexões Recentes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna 1 & 2: Pesquisas Ativas e Monitoramento */}
        <div className="space-y-6 lg:col-span-2">
          {/* Gráfico de Evolução da Pesquisa em Andamento e Anteriores */}
          <SurveyEvolutionCard surveys={surveys} submissions={submissions} />

          <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-1 h-3 bg-blue-500 rounded-full" />
                  Pesquisas em Execução
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Acompanhamento de metas e volume coletado
                </p>
              </div>

              <button
                id="btn-view-all-surveys"
                onClick={() => setActiveModule('pesquisas')}
                className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
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
                      className="group rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 transition hover:border-slate-700"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-blue-500/15 border border-blue-500/25 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                              {survey.codigo}
                            </span>
                            <span className="text-xs text-slate-400">
                              Ciclo {survey.cicloAtual} • v{survey.versao}
                            </span>
                            {survey.habilitarColetaWeb && (
                              <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 text-[9px] font-medium text-cyan-300">
                                Coleta Web Ativa
                              </span>
                            )}
                          </div>
                          <h4 className="mt-1.5 text-sm font-semibold text-white">
                            {survey.nome}
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {survey.descricao}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            id={`btn-survey-detail-${survey.id}`}
                            onClick={() => {
                              setEditingSurvey(survey);
                              setActiveModule('wizard');
                            }}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
                          >
                            Abrir Wizard
                          </button>
                          <button
                            id={`btn-survey-responses-${survey.id}`}
                            onClick={() => setActiveModule('respostas')}
                            className="rounded-lg bg-blue-600/15 px-3 py-1.5 text-xs font-semibold text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-colors"
                          >
                            Respostas ({surveySubs.length})
                          </button>
                        </div>
                      </div>

                      {/* Metas preview bar */}
                      {survey.metas.length > 0 && (
                        <div className="mt-3 border-t border-slate-800 pt-3">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Progresso das Metas Amostrais</span>
                            <span className="font-semibold text-slate-200">
                              {totalMetasAtingidas} / {totalMetasAlvo} ({metaProgress}%)
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-500 shadow-sm"
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
            <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    {t('recentConnections')}
                  </h3>
                </div>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>

              <div className="mt-3 divide-y divide-slate-800/60">
                {connections.map((conn) => (
                  <div key={conn.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">
                        {conn.usuario}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                          conn.status === 'sucesso'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : conn.status === 'bloqueado'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {conn.status}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{conn.perfil}</span>
                      <span className="font-mono">{conn.ip}</span>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>{conn.dataHora}</span>
                      <span>• {conn.navegador.split('/')[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cloud High-Availability Status Box */}
          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 p-5 text-xs shadow-xl">
            <div className="flex items-center gap-2 font-bold text-white">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              <span>Infraestrutura em Nuvem</span>
            </div>
            <p className="mt-2 text-slate-300 leading-relaxed">
              Escalabilidade automática ativa. Cluster <span className="text-blue-400 font-bold">SA-EAST-1</span> operando com redundância multi-zona e alta disponibilidade.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>99.98% de disponibilidade operacional</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
