import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Survey } from '../../types';
import {
  calculateResearcherIndividualProgress,
  ResearcherIndividualProgressResult,
} from '../../utils/demographicGoalsHelper';
import {
  User,
  CheckCircle2,
  Clock,
  Target,
  MapPin,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Zap,
  Radio,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ResearcherIndividualGoalsViewProps {
  activeSurvey: Survey;
  /** Quando true (sub-app de campo), oculta o painel consolidado (header de inspeção e KPIs) e mostra apenas os campos das metas atribuídas na pesquisa. */
  fieldMode?: boolean;
}

export const ResearcherIndividualGoalsView: React.FC<ResearcherIndividualGoalsViewProps> = ({
  activeSurvey,
  fieldMode = false,
}) => {
  const { currentUser, collaborators, submissions, hasPermission } = useApp();

  const canSimulateOthers = hasPermission('meta_criar_alterar_excluir');

  // Se for admin/coord, permite selecionar qualquer pesquisador para visualizar.
  // Se for pesquisador de campo, fica estritamente travado no currentUser.id.
  const [selectedResearcherId, setSelectedResearcherId] = useState<string>(currentUser.id);

  // Pesquisador atualmente em foco
  const activeResearcherId = canSimulateOthers ? selectedResearcherId : currentUser.id;
  const activeResearcher =
    collaborators.find((c) => c.id === activeResearcherId) || currentUser;

  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(null);

  const metasGlobais = activeSurvey.metasGlobais || [];

  // Filtrar apenas as metas que possuem atribuição para este pesquisador
  const researcherGoals = metasGlobais
    .map((target) => {
      const progress = calculateResearcherIndividualProgress(
        target,
        submissions,
        activeResearcherId
      );
      return {
        target,
        progress,
      };
    })
    .filter((item): item is { target: typeof item.target; progress: ResearcherIndividualProgressResult } => {
      return item.progress !== null;
    });

  // Métricas consolidadas do pesquisador para esta pesquisa
  const totalMetasAtribuidas = researcherGoals.length;
  const totalCotasAlvo = researcherGoals.reduce((acc, g) => acc + g.progress.cotaAlvo, 0);
  const totalCotasAtingidas = researcherGoals.reduce((acc, g) => acc + g.progress.cotaAtingida, 0);
  const totalMetasConcluidas = researcherGoals.filter((g) => g.progress.isConcluida).length;

  const percentualGeral =
    totalCotasAlvo > 0
      ? Math.min(100, Math.round((totalCotasAtingidas / totalCotasAlvo) * 100))
      : 0;

  return (
    <div className="space-y-6">
      {/* Header com Identificação do Pesquisador & Indicador de Tempo Real (oculto no campo) */}
      {!fieldMode && (
      <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-lg font-bold text-primary shadow-lg shadow-emerald-900/30">
                {activeResearcher.nome.charAt(0)}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-success-solid ring-2 ring-[#16171d]">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-primary">{activeResearcher.nome}</h2>
                <span className="rounded-full bg-accent-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent-primary border border-accent-primary-soft-border">
                  {activeResearcher.cargo || 'Pesquisador de Campo'}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Painel individual de metas e cotas demográficas em tempo real • ID:{' '}
                <span className="font-mono text-secondary">{activeResearcher.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de visualização (disponível apenas para coordenadores/admins para simular a visão de qualquer pesquisador) */}
            {canSimulateOthers && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted hidden sm:inline">Inspecionar Pesquisador:</label>
                <select
                  value={selectedResearcherId}
                  onChange={(e) => setSelectedResearcherId(e.target.value)}
                  className="rounded-xl border border-ui bg-surface-card px-3 py-1.5 text-xs text-primary focus:border-emerald-500 focus:outline-none"
                >
                  {collaborators
                    .filter((c) => c.ativo)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.cargo || 'Colaborador'})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 rounded-full bg-accent-success-soft px-3 py-1 text-xs font-semibold text-accent-success border border-accent-success-soft-border">
              <Radio className="h-3 w-3 animate-pulse text-accent-success" />
              <span>Ao Vivo</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* KPI Cards do Pesquisador (oculto no campo) */}
      {!fieldMode && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-ui bg-surface p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Minhas Metas</span>
            <div className="rounded-lg bg-accent-primary-soft p-2 text-accent-primary">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{totalMetasAtribuidas}</span>
            <span className="text-xs text-muted">segmentos atribuídos</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Amostragens sob sua responsabilidade direta
          </p>
        </div>

        <div className="rounded-2xl border border-ui bg-surface p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Minha Produtividade</span>
            <div className="rounded-lg bg-accent-success-soft p-2 text-accent-success">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{percentualGeral}%</span>
            <span className="text-xs text-accent-success">
              {totalCotasAtingidas} / {totalCotasAlvo} entrevistas
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
            <div
              className="h-full rounded-full bg-accent-success-solid transition-all duration-500"
              style={{ width: `${percentualGeral}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-ui bg-surface p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Cotas Atingidas</span>
            <div className="rounded-lg bg-accent-info-soft p-2 text-accent-info">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{totalMetasConcluidas}</span>
            <span className="text-xs text-muted">de {totalMetasAtribuidas}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {totalMetasConcluidas === totalMetasAtribuidas && totalMetasAtribuidas > 0
              ? 'Todas as suas cotas foram concluídas!'
              : `${totalMetasAtribuidas - totalMetasConcluidas} cotas ainda em andamento`}
          </p>
        </div>

        <div className="rounded-2xl border border-ui bg-surface p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Coletas Restantes</span>
            <div className="rounded-lg bg-accent-warning-soft p-2 text-accent-warning">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">
              {Math.max(0, totalCotasAlvo - totalCotasAtingidas)}
            </span>
            <span className="text-xs text-accent-warning">entrevistas para meta</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Foco de coleta recomendado para o ciclo
          </p>
        </div>
      </div>
      )}

      {/* Lista de Metas Individuais do Pesquisador */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary">
            Metas Demográficas Atribuídas a Você ({researcherGoals.length})
          </h3>
          <span className="text-xs text-muted">
            Atualização instantânea a cada nova entrevista enviada
          </span>
        </div>

        {researcherGoals.map(({ target, progress }) => {
          const isExpanded = expandedTargetId === target.id;

          return (
            <div
              key={target.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                progress.isConcluida
                  ? 'border-emerald-800/60 bg-accent-success-soft'
                  : progress.percentual >= 75
                  ? 'border-emerald-800/50 bg-accent-primary-soft'
                  : 'border-ui bg-surface'
              }`}
            >
              <div className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          progress.isConcluida
                            ? 'bg-accent-success-soft text-accent-success border border-accent-success-soft-border'
                            : progress.percentual >= 80
                            ? 'bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border'
                            : 'bg-accent-warning-soft text-accent-warning border border-accent-warning-soft-border'
                        }`}
                      >
                        {progress.isConcluida ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Cota Individual Atingida
                          </>
                        ) : progress.percentual >= 80 ? (
                          <>
                            <Sparkles className="h-3 w-3" /> Reta Final (Faltam {progress.restante})
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" /> Em Andamento (Faltam {progress.restante})
                          </>
                        )}
                      </span>

                      {target.ciclo && (
                        <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-[10px] text-muted">
                          {target.ciclo}
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-primary">{target.titulo}</h4>

                    {target.descricao && (
                      <p className="text-xs text-muted max-w-2xl leading-relaxed">
                        {target.descricao}
                      </p>
                    )}

                    {/* Chips dos Critérios Demográficos da Meta */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {target.criterios.faixaEtaria && target.criterios.faixaEtaria !== 'Todas' && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-accent-purple-soft border border-accent-purple-soft-border px-2.5 py-1 text-xs font-medium text-accent-purple">
                          🎂 Faixa Etária: {target.criterios.faixaEtaria}
                        </span>
                      )}
                      {target.criterios.sexo && target.criterios.sexo !== 'Todos' && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 text-xs font-medium text-accent-danger">
                          ⚧ Sexo: {target.criterios.sexo === 'F' ? 'Feminino' : target.criterios.sexo === 'M' ? 'Masculino' : target.criterios.sexo}
                        </span>
                      )}
                      {target.criterios.bairro && target.criterios.bairro !== 'Todos' && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-accent-success-soft border border-accent-success-soft-border px-2.5 py-1 text-xs font-medium text-accent-success">
                          <MapPin className="h-3 w-3" /> Bairro: {target.criterios.bairro}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Indicador Numérico Individual do Pesquisador */}
                  <div className="w-full lg:w-64 shrink-0 rounded-xl bg-surface-card/90 border border-ui/80 p-3.5 text-right">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs font-semibold text-muted">Sua Cota:</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-primary">
                          {progress.cotaAtingida}
                        </span>
                        <span className="text-xs text-muted">/ {progress.cotaAlvo}</span>
                        <span
                          className={`text-xs font-bold ${
                            progress.isConcluida
                              ? 'text-accent-success'
                              : progress.percentual >= 75
                              ? 'text-accent-primary'
                              : 'text-accent-warning'
                          }`}
                        >
                          ({progress.percentual}%)
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          progress.isConcluida
                            ? 'bg-accent-success-solid'
                            : progress.percentual >= 75
                            ? 'bg-accent-primary-solid'
                            : 'bg-accent-warning-solid'
                        }`}
                        style={{ width: `${Math.min(100, progress.percentual)}%` }}
                      />
                    </div>

                    <p className="mt-2 text-[11px] font-medium text-muted text-left">
                      {progress.isConcluida ? (
                        <span className="text-accent-success font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 inline" /> Cota concluída com êxito!
                        </span>
                      ) : (
                        <span>Restam <strong className="text-primary">{progress.restante}</strong> coletas válidas</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Submissões correspondentes (Histórico recente em tempo real) */}
                <div className="mt-4 border-t border-ui/80 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-accent-primary" />
                    <span className="text-xs text-secondary">
                      {progress.coletasCorrespondentes.length > 0
                        ? `${progress.coletasCorrespondentes.length} entrevistas suas atendem a este perfil demográfico`
                        : 'Nenhuma entrevista registrada para este perfil até o momento'}
                    </span>
                  </div>

                  {progress.coletasCorrespondentes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedTargetId(isExpanded ? null : target.id)}
                      className="flex items-center gap-1 text-xs font-medium text-accent-primary hover:text-accent-primary transition-colors"
                    >
                      <span>{isExpanded ? 'Ocultar Coletas' : 'Ver Coletas Computadas'}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Tabela expansível com as coletas computadas */}
              {isExpanded && progress.coletasCorrespondentes.length > 0 && (
                <div className="border-t border-ui bg-surface-card p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-2">
                    Últimas Entrevistas Computadas para esta Cota:
                  </span>
                  <div className="divide-y divide-ui/60 max-h-48 overflow-y-auto">
                    {progress.coletasCorrespondentes.slice(0, 10).map((sub) => (
                      <div
                        key={sub.id}
                        className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted text-[11px]">{sub.id}</span>
                          <span className="text-secondary">
                            {new Date(sub.dataHora).toLocaleString('pt-BR')}
                          </span>
                          {sub.geolocalizacao?.bairro && (
                            <span className="rounded bg-surface-raised px-1.5 py-0.5 text-[10px] text-accent-success">
                              {sub.geolocalizacao.bairro}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted">
                          Status: <strong className="text-accent-success">Concluída & Validada</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {researcherGoals.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ui bg-surface p-12 text-center">
            <Target className="mx-auto h-10 w-10 text-muted" />
            <h3 className="mt-3 text-sm font-bold text-secondary">
              Nenhuma Cota Individual Atribuída a Você
            </h3>
            <p className="mt-1 text-xs text-muted max-w-md mx-auto">
              A coordenação de campo ainda não alocou cotas demográficas específicas para o seu
              perfil nesta pesquisa. Assim que forem atribuídas, elas aparecerão aqui automaticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
