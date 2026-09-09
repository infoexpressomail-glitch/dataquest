import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PlusCircle,
  Copy,
  Power,
  Trash2,
  Edit3,
  Volume2,
  MapPin,
  FileSpreadsheet,
  FileText,
  Smartphone,
  Search,
  Users,
  CheckCircle2,
  RotateCcw,
  BarChart3,
  X,
  History,
  Upload,
  Server,
  Share2,
  Database,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Survey, InterviewSubmission, Question } from '../../types';
import { exportSubmissionsToCSV, exportSubmissionsToPDF } from '../../utils/exportUtils';
import { AudioPlayerModal } from './AudioPlayerModal';
import { AudioExportModal } from './AudioExportModal';
import { GeoMapModal } from './GeoMapModal';
import { SurveyDailyTrackingModal } from './SurveyDailyTrackingModal';
import { ConsolidatedPdfExportModal } from './ConsolidatedPdfExportModal';
import { ServerSyncCheckModal } from '../wizard/ServerSyncCheckModal';
import { QuestionnaireImportModal } from '../wizard/QuestionnaireImportModal';
import { shareFieldLink } from '../../field/fieldRoute';

/**
 * Tela unificada de Pesquisas — padrão TABELA (Consulta de Pesquisas).
 *
 * Concentra TODAS as funções que antes ficavam no SurveyList (cards) no formato
 * de tabela do SurveyConsultaTable:
 *   - abas de status (ativas/inativas-concluídas/excluídas) + busca
 *   - seleção em massa + ações em lote (ativar, inativar, replicar, excluir,
 *     gráfico diário, PDF consolidado)
 *   - ações por linha: compartilhar link, editar, replicar ciclo, coleta,
 *     gráfico diário, áudio, mapa, exportar CSV/PDF, ativar/desativar,
 *     finalizar/reabrir, excluir/restaurar
 *   - ações de topo: histórico de auditoria, exportar áudios, importar
 *     questionário, criar pesquisa
 *   - sincronização com servidor central (pill) e modais de exportação/áudio/geo
 */
export const SurveyManagementTable: React.FC = () => {
  const {
    surveys,
    submissions,
    collaborators,
    currentUser,
    currentProfile,
    saveSurvey,
    hasPermission,
    setActiveModule,
    setEditingSurvey,
    replicateSurvey,
    toggleSurveyStatus,
    finalizeSurvey,
    reopenSurvey,
    deleteSurvey,
    restoreSurvey,
    bulkUpdateSurveysStatus,
    bulkDeleteSurveys,
    bulkReplicateSurveys,
    isSurveyInProgress,
  } = useApp();

  // --- Filtros / estado de tabela ---
  const [activeTab, setActiveTab] = useState<'ativas' | 'inativas' | 'excluidas'>('ativas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSurveyIds, setSelectedSurveyIds] = useState<string[]>([]);

  // --- Estado de modais ---
  const [audioModalSubmission, setAudioModalSubmission] = useState<InterviewSubmission | null>(null);
  const [geoModalOpen, setGeoModalOpen] = useState(false);
  const [geoModalSurvey, setGeoModalSurvey] = useState<Survey | null>(null);
  const [replicationNotice, setReplicationNotice] = useState<string | null>(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingSurveys, setTrackingSurveys] = useState<Survey[]>([]);
  const [trackingInitialId, setTrackingInitialId] = useState<string | undefined>(undefined);
  const [syncModalSurvey, setSyncModalSurvey] = useState<Survey | null>(null);
  const [consolidatedPdfModalOpen, setConsolidatedPdfModalOpen] = useState(false);
  const [questionnaireImportModalOpen, setQuestionnaireImportModalOpen] = useState(false);
  const [audioExportModalOpen, setAudioExportModalOpen] = useState(false);
  const [audioExportSurveyId, setAudioExportSurveyId] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTimer, setToastTimer] = useState<number | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    if (toastTimer) window.clearTimeout(toastTimer);
    setToastTimer(window.setTimeout(() => setToast(null), 4000));
  };

  // --- Permissões ---
  const canCreate = hasPermission('pesquisa_criar');
  const canEdit = hasPermission('pesquisa_alterar');
  const canDelete = hasPermission('pesquisa_excluir');
  const canReplicate = hasPermission('pesquisa_replicar');
  const canToggleActive = hasPermission('pesquisa_desativar');
  const canViewInactive = hasPermission('pesquisa_visualizar_inativas');
  const canViewExcluded = hasPermission('pesquisa_visualizar_excluidas');
  const canListenAudio = hasPermission('pesquisa_ouvir_audio');
  const canViewGeo = hasPermission('pesquisa_visualizar_georeferenciamento');
  const canExport = hasPermission('pesquisa_exportar_resultados');
  const accessAllWithoutAssociation = hasPermission('pesquisa_acessa_todas_sem_associacao');

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  // --- Filtragem (mesma regra do SurveyList) ---
  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      if (isResearcher) {
        if (s.status !== 'ativa') return false;
        const isAssociated =
          s.pesquisadoresIds.includes(currentUser.id) ||
          (currentUser.pesquisasVinculadasIds && currentUser.pesquisasVinculadasIds.includes(s.id));
        if (!isAssociated) return false;
      } else {
        if (!accessAllWithoutAssociation) {
          const isAssociated =
            s.pesquisadoresIds.includes(currentUser.id) ||
            (currentUser.pesquisasVinculadasIds && currentUser.pesquisasVinculadasIds.includes(s.id));
          if (!isAssociated) return false;
        }
        if (activeTab === 'ativas' && s.status !== 'ativa') return false;
        if (activeTab === 'inativas' && s.status !== 'inativa' && s.status !== 'concluida') return false;
        if (activeTab === 'excluidas' && s.status !== 'excluida') return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          s.nome.toLowerCase().includes(term) ||
          s.codigo.toLowerCase().includes(term) ||
          s.descricao.toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [surveys, collaborators, currentUser, isResearcher, activeTab, searchTerm, accessAllWithoutAssociation]);

  const ordenados = useMemo(
    () => [...filteredSurveys].sort((a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime()),
    [filteredSurveys]
  );

  const formatarData = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR');
  };

  const statusPill = (status: Survey['status']) => {
    const map: Record<Survey['status'], string> = {
      ativa: 'bg-accent-success-soft text-accent-success border-accent-success-soft-border',
      inativa: 'bg-accent-warning-soft text-accent-warning border-accent-warning-soft-border',
      concluida: 'bg-accent-purple-soft text-accent-purple border-accent-purple-soft-border',
      excluida: 'bg-accent-danger-soft text-accent-danger border-accent-danger-soft-border',
    };
    return map[status] || map.ativa;
  };

  // --- Ações ---
  const handleCreateNew = () => {
    setEditingSurvey(null);
    setActiveModule('wizard');
  };

  const handleEdit = (survey: Survey) => {
    setEditingSurvey(survey);
    setActiveModule('wizard');
  };

  const handleReplicate = (survey: Survey) => {
    const cloned = replicateSurvey(survey.id);
    setReplicationNotice(
      `Pesquisa replicada com sucesso para o Ciclo ${cloned.cicloAtual} (v${cloned.versao}) mantendo todo o histórico e metas!`
    );
    setTimeout(() => setReplicationNotice(null), 5000);
  };

  const handleExportCSV = (survey: Survey) => {
    exportSubmissionsToCSV(submissions.filter((s) => s.pesquisaId === survey.id), survey);
  };

  const handleExportPDF = (survey: Survey) => {
    exportSubmissionsToPDF(submissions.filter((s) => s.pesquisaId === survey.id), survey);
  };

  const handleShare = async (survey: Survey) => {
    const result = await shareFieldLink({ surveyName: survey.nome, surveyCode: survey.codigo });
    if (result === 'shared') notify(`Link de coleta compartilhado: ${survey.nome}.`);
    else if (result === 'copied') notify(`Link de coleta copiado! Compartilhe com o pesquisador de ${survey.nome}.`);
    else notify('Não foi possível copiar o link automaticamente. Abra /campo no navegador.');
  };

  const handleImportQuestionsToList = (imported: Question[]) => {
    const newSurvey: Survey = {
      id: `pesq_${Date.now()}`,
      codigo: `PESQ-${new Date().getFullYear()}-${String(surveys.length + 1).padStart(2, '0')}`,
      nome: `Questionário Importado - ${new Date().toLocaleDateString('pt-BR')}`,
      descricao: 'Questionário importado com questões e alternativas organizadas.',
      status: 'ativa',
      habilitarColetaWeb: true,
      tipoColetaWeb: 'publico',
      colaboradorWebId: collaborators[0]?.id || '',
      pesquisadoresIds: collaborators.map((c) => c.id),
      cicloAtual: 1,
      versao: 1,
      criadaEm: new Date().toISOString(),
      atualizadaEm: new Date().toISOString(),
      perguntas: imported.map((q, idx) => ({ ...q, ordem: idx + 1, codigo: q.codigo || `P${String(idx + 1).padStart(2, '0')}` })),
      regras: [],
      metas: [],
    };
    saveSurvey(newSurvey);
    setEditingSurvey(newSurvey);
    setActiveModule('wizard');
  };

  const toggleSelectAll = () => {
    const allSelected = ordenados.length > 0 && ordenados.every((s) => selectedSurveyIds.includes(s.id));
    if (allSelected) {
      setSelectedSurveyIds((prev) => prev.filter((id) => !ordenados.some((s) => s.id === id)));
    } else {
      setSelectedSurveyIds((prev) => Array.from(new Set([...prev, ...ordenados.map((s) => s.id)])));
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho com ações de topo */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
            Módulo de Pesquisas e Questionários
          </h1>
          <p className="text-xs text-muted">
            Criação com wizard, replicação de ciclos, gestão de pesquisadores e exportação oficial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-nav-to-audit-from-surveys"
            onClick={() => setActiveModule('historico_acoes')}
            className="flex items-center gap-1.5 rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft px-3.5 py-2 text-xs font-bold text-accent-primary hover:bg-accent-primary-soft transition-colors shadow-xs"
          >
            <History className="h-4 w-4" />
            <span>Histórico de Auditoria</span>
          </button>

          {canListenAudio && (
            <button
              id="btn-export-audios-by-survey"
              onClick={() => { setAudioExportSurveyId(undefined); setAudioExportModalOpen(true); }}
              className="flex items-center gap-1.5 rounded-lg border border-accent-purple-soft-border bg-accent-purple-soft px-3.5 py-2 text-xs font-bold text-accent-purple hover:bg-accent-purple-soft transition-colors shadow-xs"
            >
              <Volume2 className="h-4 w-4" />
              <span>Exportar Áudios (.ZIP)</span>
            </button>
          )}

          {canCreate && (
            <>
              <button
                id="btn-survey-import-questionnaire"
                onClick={() => setQuestionnaireImportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-accent-purple-soft-border bg-accent-purple-soft px-3.5 py-2 text-xs font-bold text-accent-purple hover:bg-accent-purple-soft transition-colors shadow-xs"
              >
                <Upload className="h-4 w-4" />
                <span>Importar Questionário</span>
              </button>

              <button
                id="btn-survey-create-new"
                onClick={handleCreateNew}
                className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 transition hover:bg-accent-primary-solid-hover active:scale-95"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Criar Pesquisa (Abrir Wizard)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {replicationNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-accent-success-soft-border bg-accent-success-soft p-4 text-xs font-semibold text-accent-success">
          <CheckCircle2 className="h-4 w-4" />
          <span>{replicationNotice}</span>
        </div>
      )}

      {/* Abas de status + busca */}
      <div className="flex flex-col justify-between gap-3 border-b border-ui pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          {isResearcher ? (
            <span className="rounded-lg px-3.5 py-1.5 text-xs font-bold border bg-accent-success-soft text-accent-success border-accent-success-soft-border shadow-xs flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-success-solid animate-pulse" />
              Ativas Atribuídas ({filteredSurveys.length})
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-ui bg-surface-card p-1.5 shadow-xs">
              {(['ativas', 'inativas', 'excluidas'] as const).map((tab) => {
                const show = tab === 'ativas' ? true : tab === 'inativas' ? canViewInactive : canViewExcluded;
                if (!show) return null;
                const count =
                  tab === 'ativas'
                    ? surveys.filter((s) => s.status === 'ativa').length
                    : tab === 'inativas'
                    ? surveys.filter((s) => s.status === 'inativa' || s.status === 'concluida').length
                    : surveys.filter((s) => s.status === 'excluida').length;
                const label = tab === 'ativas' ? 'Ativas' : tab === 'inativas' ? 'Inativas/Concluídas' : 'Excluídas';
                return (
                  <button
                    key={tab}
                    id={`tab-surveys-${tab}`}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition border ${
                      activeTab === tab
                        ? 'bg-accent-primary-soft text-accent-primary border-accent-primary-soft-border shadow-xs'
                        : 'bg-transparent text-muted border-transparent hover:text-primary hover:bg-surface-raised'
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, código ou descrição..."
            className="w-full rounded-lg border border-ui bg-surface-card py-2 pl-9 pr-8 text-xs text-primary placeholder-slate-500 shadow-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:bg-surface-raised hover:text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Barra de seleção em massa */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 shadow-md transition-colors ${
          selectedSurveyIds.length > 0
            ? 'border-accent-primary/40 bg-surface-raised ring-1 ring-emerald-500/20'
            : 'border-ui bg-surface'
        }`}
      >
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-secondary select-none">
            <input
              type="checkbox"
              checked={ordenados.length > 0 && ordenados.every((s) => selectedSurveyIds.includes(s.id))}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-ui bg-surface-raised text-accent-primary-solid cursor-pointer"
            />
            <span>Selecionar todas ({ordenados.length})</span>
          </label>
          {selectedSurveyIds.length > 0 && (
            <span className="rounded-full bg-accent-primary-soft border border-accent-primary-soft-border px-2.5 py-0.5 text-xs font-bold text-accent-primary">
              {selectedSurveyIds.length} selecionada(s)
            </span>
          )}
        </div>

        {selectedSurveyIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-bulk-daily-chart"
              onClick={() => {
                const selected = surveys.filter((s) => selectedSurveyIds.includes(s.id));
                setTrackingSurveys(selected);
                setTrackingInitialId(selected[0]?.id);
                setTrackingModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft px-3 py-1.5 text-xs font-bold text-accent-primary hover:bg-accent-primary-solid-hover hover:text-on-accent transition-colors shadow-xs"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Gráfico Diário ({selectedSurveyIds.length})</span>
            </button>

            {canExport && (
              <button
                id="btn-bulk-export-consolidated-pdf"
                onClick={() => setConsolidatedPdfModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-accent-danger-soft-border bg-accent-danger-soft px-3 py-1.5 text-xs font-bold text-accent-danger hover:bg-accent-danger-solid-hover hover:text-on-accent transition-colors shadow-xs"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Exportar PDF Consolidado ({selectedSurveyIds.length})</span>
              </button>
            )}

            {canToggleActive && (
              <>
                <button
                  onClick={() => bulkUpdateSurveysStatus(selectedSurveyIds, 'ativa')}
                  className="flex items-center gap-1 rounded-lg border border-accent-success-soft-border bg-accent-success-soft px-2.5 py-1.5 text-xs font-semibold text-accent-success hover:bg-accent-success-soft transition-colors"
                >
                  <Power className="h-3.5 w-3.5" /> Ativar
                </button>
                <button
                  onClick={() => bulkUpdateSurveysStatus(selectedSurveyIds, 'inativa')}
                  className="flex items-center gap-1 rounded-lg border border-accent-warning-soft-border bg-accent-warning-soft px-2.5 py-1.5 text-xs font-semibold text-accent-warning hover:bg-accent-warning-soft transition-colors"
                >
                  <Power className="h-3.5 w-3.5" /> Inativar
                </button>
              </>
            )}

            {canReplicate && (
              <button
                onClick={() => {
                  bulkReplicateSurveys(selectedSurveyIds);
                  setReplicationNotice(`${selectedSurveyIds.length} pesquisa(s) replicada(s) para novo ciclo com sucesso!`);
                  setTimeout(() => setReplicationNotice(null), 5000);
                }}
                className="flex items-center gap-1 rounded-lg border border-ui bg-surface-raised px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-surface-hover transition-colors"
              >
                <Copy className="h-3.5 w-3.5" /> Replicar
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => {
                  if (window.confirm(`Deseja realmente mover ${selectedSurveyIds.length} pesquisa(s) para a lixeira?`)) {
                    bulkDeleteSurveys(selectedSurveyIds);
                    setSelectedSurveyIds([]);
                  }
                }}
                className="flex items-center gap-1 rounded-lg border border-accent-danger-soft-border bg-accent-danger-soft px-2.5 py-1.5 text-xs font-semibold text-accent-danger hover:bg-accent-danger-soft transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            )}

            <button onClick={() => setSelectedSurveyIds([])} className="text-xs text-muted hover:text-primary px-2 py-1 transition-colors">
              Desmarcar
            </button>
          </div>
        )}
      </div>

      {/* Tabela — largura 100% sem esticar/horizontal scroll */}
      <div className="overflow-hidden rounded-xl border border-ui">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="bg-surface-raised text-muted">
            <tr>
              <th className="w-8 px-2 py-2.5">
                <input
                  type="checkbox"
                  checked={ordenados.length > 0 && ordenados.every((s) => selectedSurveyIds.includes(s.id))}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-ui bg-surface-card text-accent-primary-solid cursor-pointer"
                />
              </th>
              <th className="w-[15%] px-2 py-2.5 font-bold">Código</th>
              <th className="w-[30%] px-2 py-2.5 font-bold">Descrição</th>
              <th className="w-[16%] px-2 py-2.5 font-bold">Status</th>
              <th className="w-[15%] px-2 py-2.5 font-bold">Pesquisadores</th>
              <th className="w-[11%] px-2 py-2.5 font-bold">Data</th>
              <th className="w-[15%] px-2 py-2.5 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ui">
            {ordenados.map((survey) => {
              const excluida = survey.status === 'excluida';
              const concluida = survey.status === 'concluida';
              const ativa = survey.status === 'ativa';
              const surveySubs = submissions.filter((sub) => sub.pesquisaId === survey.id);
              const assignedResearchers = collaborators.filter((c) => survey.pesquisadoresIds.includes(c.id));
              const isSelected = selectedSurveyIds.includes(survey.id);

              return (
                <tr
                  key={survey.id}
                  className={`${isSelected ? 'bg-accent-primary-soft/20' : 'bg-surface'} ${excluida ? 'opacity-70' : ''}`}
                >
                  <td className="px-2 py-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        setSelectedSurveyIds((prev) =>
                          prev.includes(survey.id) ? prev.filter((id) => id !== survey.id) : [...prev, survey.id]
                        )
                      }
                      className="h-3.5 w-3.5 rounded border-ui bg-surface-card text-accent-primary-solid cursor-pointer"
                    />
                  </td>

                  <td className="px-2 py-2.5">
                    <span className="inline-block w-full truncate rounded bg-surface-raised border border-ui/60 px-1.5 py-0.5 font-mono font-bold text-primary">
                      {survey.codigo}
                    </span>
                  </td>

                  <td className="px-2 py-2.5">
                    <span className="block w-full truncate font-semibold text-primary">{survey.nome}</span>
                    {survey.descricao && (
                      <span className="mt-0.5 block w-full truncate text-[11px] text-muted">{survey.descricao}</span>
                    )}
                    {survey.habilitarColetaWeb && (
                      <span className="mt-0.5 inline-block rounded bg-accent-info-soft border border-accent-info-soft-border px-1.5 py-0.5 text-[9px] font-semibold text-accent-info">
                        Coleta Web ({survey.tipoColetaWeb})
                      </span>
                    )}
                  </td>

                  <td className="px-2 py-2.5">
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border ${statusPill(survey.status)}`}>
                      {survey.status.toUpperCase()}
                    </span>
                    {isSurveyInProgress(survey) && (
                      <button
                        type="button"
                        onClick={() => setSyncModalSurvey(survey)}
                        className={`mt-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold border transition ${
                          survey.serverSyncToken
                            ? 'bg-accent-success-soft border-accent-success-soft-border text-accent-success'
                            : 'bg-accent-warning-soft border-accent-warning-soft-border text-accent-warning'
                        }`}
                        title={survey.serverSyncToken ? 'Sincronizado com o servidor.' : 'Sync obrigatório antes de subir alterações.'}
                      >
                        <Server className="h-2.5 w-2.5" />
                        {survey.serverSyncToken ? 'Servidor: Autorizado' : 'Servidor: Sync Obrigatório'}
                      </button>
                    )}
                  </td>

                  <td className="px-2 py-2.5 text-secondary">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted shrink-0" />
                      <span className="truncate">{assignedResearchers.length}</span>
                    </span>
                    <span className="mt-0.5 block w-full truncate text-[10px] text-muted">
                      {assignedResearchers.map((r) => r.nome.split(' ')[0]).join(', ') || '—'}
                    </span>
                  </td>

                  <td className="px-2 py-2.5 text-muted whitespace-nowrap">{formatarData(survey.criadaEm)}</td>

                  <td className="px-2 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      {/* Compartilhar link de coleta */}
                      {!excluida && (
                        <button
                          type="button"
                          onClick={() => handleShare(survey)}
                          title="Compartilhar link de coleta (login de campo)"
                          className="rounded-md p-1 text-accent-primary hover:bg-accent-primary-soft transition-colors"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Coleta (simulador) */}
                      <button
                        type="button"
                        onClick={() => { setEditingSurvey(survey); setActiveModule('simulador'); }}
                        title="Coleta (simulador)"
                        className="rounded-md p-1 text-accent-primary hover:bg-surface-raised transition-colors"
                      >
                        <Smartphone className="h-4 w-4" />
                      </button>

                      {/* Editar */}
                      {canEdit && !excluida && (
                        <button
                          type="button"
                          onClick={() => handleEdit(survey)}
                          title="Editar pesquisa (Wizard)"
                          className="rounded-md p-1 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Replicar ciclo */}
                      {canReplicate && !excluida && (
                        <button
                          type="button"
                          onClick={() => handleReplicate(survey)}
                          title="Replicar ciclo"
                          className="rounded-md p-1 text-accent-primary hover:bg-surface-raised transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      )}

                      {/* Gráfico diário */}
                      <button
                        type="button"
                        onClick={() => { setTrackingSurveys([survey]); setTrackingInitialId(survey.id); setTrackingModalOpen(true); }}
                        title="Acompanhamento diário"
                        className="rounded-md p-1 text-accent-primary hover:bg-surface-raised transition-colors"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>

                      {/* Áudio */}
                      {canListenAudio && (
                        <button
                          type="button"
                          onClick={() => { setAudioExportSurveyId(survey.id); setAudioExportModalOpen(true); }}
                          title="Exportar/ouvir áudios"
                          className="rounded-md p-1 text-accent-purple hover:bg-surface-raised transition-colors"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Mapa */}
                      {canViewGeo && (
                        <button
                          type="button"
                          onClick={() => { setGeoModalSurvey(survey); setGeoModalOpen(true); }}
                          title="Georreferenciamento em mapa"
                          className="rounded-md p-1 text-accent-success hover:bg-surface-raised transition-colors"
                        >
                          <MapPin className="h-4 w-4" />
                        </button>
                      )}

                      {/* Exportar CSV / PDF */}
                      {canExport && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleExportCSV(survey)}
                            title="Exportar CSV"
                            className="rounded-md p-1 text-accent-success hover:bg-surface-raised transition-colors"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportPDF(survey)}
                            title="Exportar PDF"
                            className="rounded-md p-1 text-accent-danger hover:bg-surface-raised transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      {/* Ativar / Desativar */}
                      {canToggleActive && !excluida && !concluida && (
                        <button
                          type="button"
                          onClick={() => toggleSurveyStatus(survey.id)}
                          title={ativa ? 'Desativar pesquisa' : 'Ativar pesquisa'}
                          className="rounded-md p-1 text-accent-warning hover:bg-surface-raised transition-colors"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      )}

                      {/* Finalizar / Reabrir */}
                      {canToggleActive && !excluida && (
                        concluida ? (
                          <button
                            type="button"
                            onClick={() => reopenSurvey(survey.id)}
                            title="Reabrir pesquisa"
                            className="rounded-md p-1 text-accent-success hover:bg-surface-raised transition-colors"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Deseja finalizar (concluir) a pesquisa "${survey.nome}"? Ela deixará de aparecer para os pesquisadores.`)) {
                                finalizeSurvey(survey.id);
                              }
                            }}
                            title="Finalizar pesquisa (concluir)"
                            className="rounded-md p-1 text-accent-purple hover:bg-surface-raised transition-colors"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )
                      )}

                      {/* Excluir / Restaurar */}
                      {excluida ? (
                        <button
                          type="button"
                          onClick={() => restoreSurvey(survey.id)}
                          title="Restaurar pesquisa"
                          className="rounded-md p-1 text-accent-success hover:bg-surface-raised transition-colors"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : (
                        canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Deseja mover a pesquisa "${survey.nome}" para a lixeira?`)) deleteSurvey(survey.id);
                            }}
                            title="Excluir pesquisa"
                            className="rounded-md p-1 text-accent-info hover:bg-accent-danger-soft hover:text-accent-danger transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {ordenados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center">
                  <FileQuestion className="mx-auto h-9 w-9 text-muted" />
                  <p className="mt-2 text-xs font-semibold text-muted">Nenhuma pesquisa encontrada nesta categoria.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé */}
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Database className="h-3.5 w-3.5" />
        {ordenados.length} registro(s) encontrado(s)
        {selectedSurveyIds.length > 0 && (
          <span className="ml-1 rounded-full bg-accent-primary-soft border border-accent-primary-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-primary">
            {selectedSurveyIds.length} selecionada(s)
          </span>
        )}
      </div>

      {/* Modais */}
      {audioModalSubmission && (
        <AudioPlayerModal submission={audioModalSubmission} onClose={() => setAudioModalSubmission(null)} />
      )}
      {geoModalOpen && (
        <GeoMapModal
          submissions={geoModalSurvey ? submissions.filter((s) => s.pesquisaId === geoModalSurvey.id) : submissions}
          surveyName={geoModalSurvey?.nome}
          onClose={() => { setGeoModalOpen(false); setGeoModalSurvey(null); }}
        />
      )}
      {trackingModalOpen && (
        <SurveyDailyTrackingModal
          surveys={trackingSurveys.length > 0 ? trackingSurveys : surveys}
          submissions={submissions}
          initialSurveyId={trackingInitialId}
          onClose={() => setTrackingModalOpen(false)}
        />
      )}
      {syncModalSurvey && (
        <ServerSyncCheckModal
          isOpen={!!syncModalSurvey}
          onClose={() => setSyncModalSurvey(null)}
          survey={syncModalSurvey}
          hasLocalModifications={false}
          onUploadSuccess={() => setSyncModalSurvey(null)}
        />
      )}
      {consolidatedPdfModalOpen && (
        <ConsolidatedPdfExportModal
          surveys={surveys.filter((s) => selectedSurveyIds.includes(s.id))}
          submissions={submissions}
          onClose={() => setConsolidatedPdfModalOpen(false)}
          onSuccess={() => setConsolidatedPdfModalOpen(false)}
        />
      )}
      {questionnaireImportModalOpen && (
        <QuestionnaireImportModal
          isOpen={questionnaireImportModalOpen}
          onClose={() => setQuestionnaireImportModalOpen(false)}
          existingQuestionsCount={0}
          onImport={(imported) => {
            handleImportQuestionsToList(imported);
            setQuestionnaireImportModalOpen(false);
          }}
        />
      )}
      {audioExportModalOpen && (
        <AudioExportModal
          isOpen={audioExportModalOpen}
          onClose={() => setAudioExportModalOpen(false)}
          initialSurveyId={audioExportSurveyId}
        />
      )}

      {/* Toast de compartilhamento */}
      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed bottom-14 right-4 z-50 flex max-w-sm items-center gap-2.5 rounded-xl border border-accent-success-soft-border bg-surface-raised px-4 py-3 text-xs font-semibold text-primary shadow-2xl"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-success" />
          <span className="leading-snug">{toast}</span>
        </div>
      )}
    </div>
  );
};
