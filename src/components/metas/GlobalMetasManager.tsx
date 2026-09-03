import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GlobalDemographicTarget,
  ResearcherQuotaAssignment,
  Survey,
} from '../../types';
import {
  calculateGlobalDemographicProgress,
  calculateResearcherIndividualProgress,
  FAIXAS_ETARIAS_PADRAO,
  OPCOES_BAIRROS_PADRAO,
  OPCOES_SEXO_PADRAO,
} from '../../utils/demographicGoalsHelper';
import {
  Globe2,
  Users,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  UserCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Share2,
  Sliders,
  Check,
  Percent,
} from 'lucide-react';

interface GlobalMetasManagerProps {
  activeSurvey: Survey;
  canManageMetas: boolean;
}

export const GlobalMetasManager: React.FC<GlobalMetasManagerProps> = ({
  activeSurvey,
  canManageMetas,
}) => {
  const {
    collaborators,
    submissions,
    saveGlobalTarget,
    deleteGlobalTarget,
    assignResearcherQuota,
  } = useApp();

  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(null);
  const [filterDimension, setFilterDimension] = useState<'todas' | 'idade' | 'sexo' | 'bairro'>('todas');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);

  // Form State
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [faixaEtaria, setFaixaEtaria] = useState<string>('Todas');
  const [sexo, setSexo] = useState<'M' | 'F' | 'Outro' | 'Todos'>('Todos');
  const [bairro, setBairro] = useState<string>('Todos');
  const [metaGlobalAlvo, setMetaGlobalAlvo] = useState<number>(50);
  const [selectedResearchers, setSelectedResearchers] = useState<{ [id: string]: number }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const metasGlobais = activeSurvey.metasGlobais || [];

  // Filtrar pesquisadores vinculados à pesquisa atual
  const surveyResearchers = collaborators.filter(
    (c) =>
      c.ativo &&
      (activeSurvey.pesquisadoresIds?.includes(c.id) ||
        c.perfilAcessoId === 'prof_pesq' ||
        c.perfilAcessoId === 'prof_coord')
  );

  // Estatísticas agregadas
  const totalMetas = metasGlobais.length;
  let totalAlvoGeral = 0;
  let totalAtingidoGeral = 0;
  let metasConcluidasCount = 0;

  metasGlobais.forEach((target) => {
    const summary = calculateGlobalDemographicProgress(target, submissions);
    totalAlvoGeral += summary.metaGlobalAlvo;
    totalAtingidoGeral += summary.metaGlobalAtingida;
    if (summary.status === 'concluida') {
      metasConcluidasCount += 1;
    }
  });

  const percentualConsolidado =
    totalAlvoGeral > 0
      ? Math.min(100, Math.round((totalAtingidoGeral / totalAlvoGeral) * 100))
      : 0;

  // Filtrar metas por dimensão
  const filteredMetas = metasGlobais.filter((target) => {
    if (filterDimension === 'todas') return true;
    if (filterDimension === 'idade') return target.criterios.faixaEtaria && target.criterios.faixaEtaria !== 'Todas';
    if (filterDimension === 'sexo') return target.criterios.sexo && target.criterios.sexo !== 'Todos';
    if (filterDimension === 'bairro') return target.criterios.bairro && target.criterios.bairro !== 'Todos';
    return true;
  });

  const handleOpenCreateModal = () => {
    setEditingTargetId(null);
    setTitulo('');
    setDescricao('');
    setFaixaEtaria('Todas');
    setSexo('Todos');
    setBairro('Todos');
    setMetaGlobalAlvo(60);

    // Inicializar cotas divididas igualmente entre os pesquisadores vinculados
    const initialQuotass: { [id: string]: number } = {};
    const count = surveyResearchers.length || 1;
    const split = Math.floor(60 / count);
    surveyResearchers.forEach((r, idx) => {
      // ajusta o resto na primeira cota
      initialQuotass[r.id] = idx === 0 ? split + (60 % count) : split;
    });
    setSelectedResearchers(initialQuotass);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (target: GlobalDemographicTarget) => {
    setEditingTargetId(target.id);
    setTitulo(target.titulo);
    setDescricao(target.descricao || '');
    setFaixaEtaria(target.criterios.faixaEtaria || 'Todas');
    setSexo(target.criterios.sexo || 'Todos');
    setBairro(target.criterios.bairro || 'Todos');
    setMetaGlobalAlvo(target.metaGlobalAlvo);

    const quotas: { [id: string]: number } = {};
    target.atribuicoes.forEach((a) => {
      quotas[a.pesquisadorId] = a.cotaAlvo;
    });
    setSelectedResearchers(quotas);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDistributeEqually = () => {
    const selectedIds = Object.keys(selectedResearchers).filter((id) => selectedResearchers[id] !== undefined);
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const base = Math.floor(metaGlobalAlvo / count);
    const remainder = metaGlobalAlvo % count;

    const newQuotas: { [id: string]: number } = {};
    selectedIds.forEach((id, idx) => {
      newQuotas[id] = idx === 0 ? base + remainder : base;
    });
    setSelectedResearchers(newQuotas);
  };

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setFormError('Informe um título descritivo para a meta global.');
      return;
    }

    const assignedEntries = Object.entries(selectedResearchers).filter(
      ([, quota]) => quota !== undefined && Number(quota) > 0
    );

    if (assignedEntries.length === 0) {
      setFormError('Vincule ao menos um pesquisador e defina uma cota individual maior que 0.');
      return;
    }

    const somaCotas = assignedEntries.reduce((acc, [, quota]) => acc + (Number(quota) || 0), 0);

    const atribuicoes: ResearcherQuotaAssignment[] = assignedEntries.map(([resId, quota]) => {
      const res = collaborators.find((c) => c.id === resId);
      // Preserva histórico anterior se já existia na meta editada
      let atingidaAnterior = 0;
      if (editingTargetId) {
        const currentTarget = metasGlobais.find((m) => m.id === editingTargetId);
        const prevAtrib = currentTarget?.atribuicoes.find((a) => a.pesquisadorId === resId);
        if (prevAtrib) {
          atingidaAnterior = prevAtrib.cotaAtingida;
        }
      }

      return {
        pesquisadorId: resId,
        pesquisadorNome: res?.nome || 'Pesquisador de Campo',
        perfilAcessoNome: res?.cargo || 'Pesquisador',
        cotaAlvo: Number(quota),
        cotaAtingida: atingidaAnterior,
        dataAtribuicao: new Date().toISOString(),
      };
    });

    const targetToSave: GlobalDemographicTarget = {
      id: editingTargetId || `mg_${Date.now()}`,
      pesquisaId: activeSurvey.id,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      criterios: {
        faixaEtaria,
        sexo,
        bairro,
      },
      metaGlobalAlvo: Math.max(metaGlobalAlvo, somaCotas),
      metaGlobalAtingida: 0,
      status: 'ativa',
      ciclo: `Ciclo ${activeSurvey.cicloAtual} - ${new Date().getFullYear()}`,
      criadoEm: editingTargetId
        ? metasGlobais.find((m) => m.id === editingTargetId)?.criadoEm || new Date().toISOString()
        : new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      atribuicoes,
    };

    saveGlobalTarget(activeSurvey.id, targetToSave);
    setIsModalOpen(false);
  };

  const handleTogglePause = (target: GlobalDemographicTarget) => {
    const updatedStatus = target.status === 'pausada' ? 'ativa' : 'pausada';
    saveGlobalTarget(activeSurvey.id, {
      ...target,
      status: updatedStatus,
      atualizadoEm: new Date().toISOString(),
    });
  };

  const handleDelete = (targetId: string, tituloTarget: string) => {
    if (confirm(`Tem certeza que deseja remover a meta global "${tituloTarget}"?`)) {
      deleteGlobalTarget(activeSurvey.id, targetId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Metas Globais Ativas</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <Globe2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{totalMetas}</span>
            <span className="text-xs text-slate-400">demográficas</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Amostragens agregadas por idade, sexo e bairro
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Progresso Amostral Geral</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{percentualConsolidado}%</span>
            <span className="text-xs text-emerald-400">
              {totalAtingidoGeral} / {totalAlvoGeral}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${percentualConsolidado}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pesquisadores Vinculados</span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{surveyResearchers.length}</span>
            <span className="text-xs text-indigo-400">perfis alocados</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Cada pesquisador visualiza apenas seu progresso
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Metas Concluídas</span>
            <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{metasConcluidasCount}</span>
            <span className="text-xs text-slate-400">de {totalMetas}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Segmentos que já alcançaram 100% da cota
          </p>
        </div>
      </div>

      {/* Action Bar & Dimension Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-800 bg-[#16171d] p-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-300 mr-2 flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-blue-400" />
            Filtrar por Demografia:
          </span>
          {(['todas', 'idade', 'sexo', 'bairro'] as const).map((dim) => (
            <button
              key={dim}
              onClick={() => setFilterDimension(dim)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filterDimension === dim
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {dim === 'todas'
                ? 'Todas as Dimensões'
                : dim === 'idade'
                ? '🎂 Idade / Faixa Etária'
                : dim === 'sexo'
                ? '⚧ Sexo / Gênero'
                : '📍 Bairro / Região'}
            </button>
          ))}
        </div>

        {canManageMetas && (
          <button
            type="button"
            id="btn-open-create-global-meta"
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-all shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Meta Global Demográfica</span>
          </button>
        )}
      </div>

      {/* List of Global Demographic Goals */}
      <div className="space-y-4">
        {filteredMetas.map((target) => {
          const summary = calculateGlobalDemographicProgress(target, submissions);
          const isExpanded = expandedTargetId === target.id;

          return (
            <div
              key={target.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                target.status === 'pausada'
                  ? 'border-amber-900/40 bg-[#16171d]/80 opacity-80'
                  : summary.status === 'concluida'
                  ? 'border-emerald-800/50 bg-[#141c19]'
                  : 'border-slate-800 bg-[#16171d]'
              }`}
            >
              {/* Card Header & Summary */}
              <div className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          target.status === 'pausada'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : summary.status === 'concluida'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {target.status === 'pausada' ? (
                          <>
                            <PauseCircle className="h-3 w-3" /> Meta Pausada
                          </>
                        ) : summary.status === 'concluida' ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Cota Global Atingida
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" /> Em Andamento
                          </>
                        )}
                      </span>

                      {target.ciclo && (
                        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] text-slate-400">
                          {target.ciclo}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white">{target.titulo}</h3>

                    {target.descricao && (
                      <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                        {target.descricao}
                      </p>
                    )}

                    {/* Demographic Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {target.criterios.faixaEtaria && target.criterios.faixaEtaria !== 'Todas' && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 text-xs font-medium text-purple-300">
                          🎂 Faixa: {target.criterios.faixaEtaria}
                        </span>
                      )}
                      {target.criterios.sexo && target.criterios.sexo !== 'Todos' && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 text-xs font-medium text-pink-300">
                          ⚧ Sexo: {target.criterios.sexo === 'F' ? 'Feminino' : target.criterios.sexo === 'M' ? 'Masculino' : target.criterios.sexo}
                        </span>
                      )}
                      {target.criterios.bairro && target.criterios.bairro !== 'Todos' && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300">
                          <MapPin className="h-3 w-3" /> Bairro: {target.criterios.bairro}
                        </span>
                      )}
                      {(!target.criterios.faixaEtaria || target.criterios.faixaEtaria === 'Todas') &&
                        (!target.criterios.sexo || target.criterios.sexo === 'Todos') &&
                        (!target.criterios.bairro || target.criterios.bairro === 'Todos') && (
                          <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                            Demografia Aberta (Todos os Segmentos)
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Progress KPI & Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 min-w-[220px]">
                    <div className="w-full text-right">
                      <div className="flex items-baseline justify-end gap-2">
                        <span className="text-2xl font-black text-white">
                          {summary.metaGlobalAtingida}
                        </span>
                        <span className="text-xs text-slate-400">/ {summary.metaGlobalAlvo}</span>
                        <span
                          className={`text-sm font-bold ${
                            summary.percentual >= 100
                              ? 'text-emerald-400'
                              : summary.percentual >= 75
                              ? 'text-blue-400'
                              : 'text-amber-400'
                          }`}
                        >
                          ({summary.percentual}%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            summary.percentual >= 100
                              ? 'bg-emerald-500'
                              : summary.percentual >= 75
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${summary.percentual}%` }}
                        />
                      </div>
                      <span className="mt-1 block text-[10px] text-slate-500">
                        {summary.pesquisadoresConcluidos} de {summary.totalPesquisadoresVinculados}{' '}
                        pesquisadores com cota fechada
                      </span>
                    </div>

                    {/* Action buttons */}
                    {canManageMetas && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleTogglePause(target)}
                          title={target.status === 'pausada' ? 'Reativar meta' : 'Pausar meta'}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                        >
                          {target.status === 'pausada' ? (
                            <PlayCircle className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <PauseCircle className="h-4 w-4 text-amber-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(target)}
                          title="Editar meta e cotas"
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-blue-400 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(target.id, target.titulo)}
                          title="Excluir meta"
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Collapsible toggle for researcher assignments */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-semibold text-slate-300">
                      Pesquisadores Vinculados e Cotas Individuais ({target.atribuicoes.length})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedTargetId(isExpanded ? null : target.id)}
                    className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>{isExpanded ? 'Ocultar Detalhamento' : 'Ver Progresso por Pesquisador'}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Detailed Researcher Assignment Table */}
              {isExpanded && (
                <div className="border-t border-slate-800 bg-[#111218]/80 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Progresso individual apurado em tempo real com base nas entrevistas correspondentes:
                    </p>
                    <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                      Tempo Real Ativo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {target.atribuicoes.map((assignment) => {
                      const resProgress = calculateResearcherIndividualProgress(
                        target,
                        submissions,
                        assignment.pesquisadorId
                      );
                      const currentAtingida = resProgress ? resProgress.cotaAtingida : assignment.cotaAtingida;
                      const percent = resProgress ? resProgress.percentual : Math.round((currentAtingida / assignment.cotaAlvo) * 100);
                      const isFechada = percent >= 100;

                      return (
                        <div
                          key={assignment.pesquisadorId}
                          className={`rounded-xl border p-3.5 transition-all ${
                            isFechada
                              ? 'border-emerald-800/60 bg-emerald-950/20'
                              : 'border-slate-800 bg-[#16171d]'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-200">
                                {assignment.pesquisadorNome.charAt(0)}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white leading-tight">
                                  {assignment.pesquisadorNome}
                                </h4>
                                <span className="text-[10px] text-slate-400">
                                  {assignment.perfilAcessoNome || 'Pesquisador de Campo'}
                                </span>
                              </div>
                            </div>

                            {isFechada ? (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                <Check className="h-3 w-3" /> Cota Feita
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-300">
                                {currentAtingida} / {assignment.cotaAlvo}
                              </span>
                            )}
                          </div>

                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[11px] font-medium">
                              <span className="text-slate-400">Progresso Individual</span>
                              <span className={isFechada ? 'text-emerald-400 font-bold' : 'text-blue-400 font-bold'}>
                                {percent}%
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isFechada ? 'bg-emerald-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(100, percent)}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
                            <span>
                              {isFechada
                                ? 'Meta alcançada com sucesso'
                                : `Faltam ${Math.max(0, assignment.cotaAlvo - currentAtingida)} coletas`}
                            </span>
                            <span>ID: {assignment.pesquisadorId}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredMetas.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-[#16171d] p-12 text-center">
            <Globe2 className="mx-auto h-10 w-10 text-slate-600" />
            <h3 className="mt-3 text-sm font-bold text-slate-300">
              Nenhuma Meta Global Demográfica Encontrada
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Defina metas de amostragem por Idade, Sexo e Bairro para garantir a representatividade
              estatística da pesquisa e vincule quotas individuais a cada pesquisador.
            </p>
            {canManageMetas && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Primeira Meta Global
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal: Criar / Editar Meta Global Demográfica */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#16171d] p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Globe2 className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">
                  {editingTargetId ? 'Editar Meta Global Demográfica' : 'Nova Meta Global Demográfica'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTarget} className="mt-4 space-y-4">
              {/* Título e Descrição */}
              <div>
                <label className="block text-xs font-bold text-slate-300">
                  Título da Meta Amostral *
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Jovens 18 a 25 anos - Praça da Matriz"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-[#111218] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300">
                  Instruções de Campo / Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Abordar no perímetro do estande municipal ou entrada sul..."
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-[#111218] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              {/* Critérios Demográficos (Idade, Sexo, Bairro) */}
              <div className="rounded-xl border border-slate-800 bg-[#111218]/80 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-blue-400" />
                  Critérios de Agregação Demográfica
                </h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Faixa Etária */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400">
                      🎂 Faixa Etária
                    </label>
                    <select
                      value={faixaEtaria}
                      onChange={(e) => setFaixaEtaria(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-[#16171d] px-2.5 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Todas">Todas as faixas</option>
                      {FAIXAS_ETARIAS_PADRAO.map((faixa) => (
                        <option key={faixa} value={faixa}>
                          {faixa}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sexo */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400">
                      ⚧ Sexo / Gênero
                    </label>
                    <select
                      value={sexo}
                      onChange={(e) => setSexo(e.target.value as any)}
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-[#16171d] px-2.5 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Todos">Todos os gêneros</option>
                      <option value="F">Feminino</option>
                      <option value="M">Masculino</option>
                      <option value="Outro">Outro / Não informado</option>
                    </select>
                  </div>

                  {/* Bairro */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400">
                      📍 Bairro / Região
                    </label>
                    <select
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-[#16171d] px-2.5 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Todos">Todos os bairros</option>
                      {OPCOES_BAIRROS_PADRAO.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Meta Alvo Total */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300">
                    Meta Global Alvo (Coletas Consolidadas)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Total esperado para este estrato demográfico
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  required
                  value={metaGlobalAlvo}
                  onChange={(e) => setMetaGlobalAlvo(Number(e.target.value))}
                  className="w-32 rounded-xl border border-slate-800 bg-[#111218] px-3.5 py-2 text-xs font-bold text-white text-right focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Vinculação de Pesquisadores e Distribuição de Cotas */}
              <div className="rounded-xl border border-slate-800 bg-[#111218]/80 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-blue-400" />
                      Vinculação de Perfis de Pesquisadores
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Cada pesquisador visualiza apenas a cota atribuída a ele
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDistributeEqually}
                    className="self-start sm:self-auto rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] font-semibold text-blue-400 hover:bg-blue-500/20 transition-colors"
                  >
                    Distribuir {metaGlobalAlvo} igualmente
                  </button>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {surveyResearchers.map((researcher) => {
                    const currentQuota = selectedResearchers[researcher.id] || 0;

                    return (
                      <div
                        key={researcher.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-[#16171d] p-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            id={`chk-${researcher.id}`}
                            checked={selectedResearchers[researcher.id] !== undefined}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedResearchers((prev) => ({
                                  ...prev,
                                  [researcher.id]: Math.max(10, Math.floor(metaGlobalAlvo / 2)),
                                }));
                              } else {
                                const copy = { ...selectedResearchers };
                                delete copy[researcher.id];
                                setSelectedResearchers(copy);
                              }
                            }}
                            className="h-4 w-4 rounded border-slate-700 bg-[#111218] text-blue-600 focus:ring-0"
                          />
                          <div>
                            <label
                              htmlFor={`chk-${researcher.id}`}
                              className="text-xs font-bold text-white cursor-pointer"
                            >
                              {researcher.nome}
                            </label>
                            <span className="block text-[10px] text-slate-400">
                              {researcher.cargo || 'Pesquisador'} • Login: {researcher.login}
                            </span>
                          </div>
                        </div>

                        {selectedResearchers[researcher.id] !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-400">Cota:</span>
                            <input
                              type="number"
                              min={1}
                              value={currentQuota}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setSelectedResearchers((prev) => ({
                                  ...prev,
                                  [researcher.id]: val,
                                }));
                              }}
                              className="w-20 rounded-lg border border-slate-700 bg-[#111218] px-2 py-1 text-xs text-white text-center focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-save-global-meta"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-colors"
                >
                  {editingTargetId ? 'Atualizar Meta Global' : 'Salvar e Atribuir Metas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
