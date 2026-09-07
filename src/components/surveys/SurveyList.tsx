import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getTranslation } from '../../i18n';
import {
  FileQuestion,
  PlusCircle,
  Copy,
  Power,
  Trash2,
  Edit3,
  Volume2,
  MapPin,
  Download,
  FileSpreadsheet,
  FileText,
  Smartphone,
  Search,
  Filter,
  Users,
  CheckCircle2,
  RotateCcw,
  Target,
  Sparkles,
  History,
  BarChart3,
  CheckSquare,
  Square,
  Check,
  Calendar,
  Server,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { Survey, InterviewSubmission, Question } from '../../types';
import { exportSubmissionsToCSV, exportSubmissionsToPDF, exportConsolidatedSurveysToPDF } from '../../utils/exportUtils';
import { AudioPlayerModal } from './AudioPlayerModal';
import { AudioExportModal } from './AudioExportModal';
import { GeoMapModal } from './GeoMapModal';
import { SurveyDailyTrackingModal } from './SurveyDailyTrackingModal';
import { ConsolidatedPdfExportModal } from './ConsolidatedPdfExportModal';
import { ServerSyncCheckModal } from '../wizard/ServerSyncCheckModal';
import { QuestionnaireImportModal } from '../wizard/QuestionnaireImportModal';

export const SurveyList: React.FC = () => {
  const {
    language,
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
    deleteSurvey,
    restoreSurvey,
    bulkUpdateSurveysStatus,
    bulkDeleteSurveys,
    bulkReplicateSurveys,
    isSurveyInProgress,
  } = useApp();

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const [activeTab, setActiveTab] = useState<'ativas' | 'inativas' | 'excluidas'>('ativas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSurveyForExport, setSelectedSurveyForExport] = useState<Survey | null>(null);

  // Bulk Selection State
  const [selectedSurveyIds, setSelectedSurveyIds] = useState<string[]>([]);

  // Modals
  const [audioModalSubmission, setAudioModalSubmission] = useState<InterviewSubmission | null>(null);
  const [geoModalOpen, setGeoModalOpen] = useState(false);
  const [geoModalSurvey, setGeoModalSurvey] = useState<Survey | null>(null);
  const [replicationNotice, setReplicationNotice] = useState<string | null>(null);

  // Daily Tracking Chart Modal State
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingSurveys, setTrackingSurveys] = useState<Survey[]>([]);
  const [trackingInitialId, setTrackingInitialId] = useState<string | undefined>(undefined);

  // Central Server Sync Modal State
  const [syncModalSurvey, setSyncModalSurvey] = useState<Survey | null>(null);

  // Consolidated Multi-Survey PDF Export Modal State
  const [consolidatedPdfModalOpen, setConsolidatedPdfModalOpen] = useState(false);

  // Questionnaire Import Modal State
  const [questionnaireImportModalOpen, setQuestionnaireImportModalOpen] = useState(false);

  // Audio Export Modal State
  const [audioExportModalOpen, setAudioExportModalOpen] = useState(false);
  const [audioExportSurveyId, setAudioExportSurveyId] = useState<string | undefined>(undefined);

  // Check permissions
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

  // Filter surveys based on association if not permitted to see all
  const filteredSurveys = surveys.filter((s) => {
    // Researcher restriction: only active surveys assigned to this researcher; past/inactive are hidden
    if (isResearcher) {
      if (s.status !== 'ativa') return false;
      const isAssociated =
        s.pesquisadoresIds.includes(currentUser.id) ||
        (currentUser.pesquisasVinculadasIds && currentUser.pesquisasVinculadasIds.includes(s.id));
      if (!isAssociated) return false;
    } else {
      // Association check for non-researchers without global access
      if (!accessAllWithoutAssociation) {
        const isAssociated =
          s.pesquisadoresIds.includes(currentUser.id) ||
          (currentUser.pesquisasVinculadasIds && currentUser.pesquisasVinculadasIds.includes(s.id));
        if (!isAssociated) return false;
      }

      // Status filter
      if (activeTab === 'ativas' && s.status !== 'ativa') return false;
      if (activeTab === 'inativas' && s.status !== 'inativa') return false;
      if (activeTab === 'excluidas' && s.status !== 'excluida') return false;
    }

    // Search term
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
    const surveySubs = submissions.filter((s) => s.pesquisaId === survey.id);
    exportSubmissionsToCSV(surveySubs, survey);
  };

  const handleExportPDF = (survey: Survey) => {
    const surveySubs = submissions.filter((s) => s.pesquisaId === survey.id);
    exportSubmissionsToPDF(surveySubs, survey);
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
      perguntas: imported.map((q, idx) => ({
        ...q,
        ordem: idx + 1,
        codigo: q.codigo || `P${String(idx + 1).padStart(2, '0')}`,
      })),
      regras: [],
      metas: [],
    };
    saveSurvey(newSurvey);
    setEditingSurvey(newSurvey);
    setActiveModule('wizard');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
            Módulo de Pesquisas e Questionários
          </h1>
          <p className="text-xs text-muted">
            Criação com wizard em 5 etapas, replicação de ciclos, gestão de pesquisadores e exportação oficial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-nav-to-audit-from-surveys"
            onClick={() => setActiveModule('historico_acoes')}
            className="flex items-center gap-1.5 rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft px-3.5 py-2 text-xs font-bold text-accent-primary hover:bg-accent-primary-soft transition-colors shadow-xs"
            title="Abrir Trilha de Auditoria e Histórico de Conformidade"
          >
            <History className="h-4 w-4 text-accent-primary" />
            <span>Histórico de Auditoria</span>
          </button>

          {canListenAudio && (
            <button
              id="btn-export-audios-by-survey"
              onClick={() => {
                setAudioExportSurveyId(undefined);
                setAudioExportModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-accent-purple-soft-border bg-accent-purple-soft px-3.5 py-2 text-xs font-bold text-accent-purple hover:bg-accent-purple-soft transition-colors shadow-xs"
              title="Exportar gravações de áudio separadas por pesquisa (individual ou lote .ZIP)"
            >
              <Volume2 className="h-4 w-4 text-accent-purple" />
              <span>Exportar Áudios (.ZIP)</span>
            </button>
          )}

          {canCreate && (
            <>
              <button
                id="btn-survey-import-questionnaire"
                onClick={() => setQuestionnaireImportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-accent-purple-soft-border bg-accent-purple-soft px-3.5 py-2 text-xs font-bold text-accent-purple hover:bg-accent-purple-soft transition-colors shadow-xs"
                title="Importar questionário de texto/arquivo com questões e alternativas organizadas"
              >
                <Upload className="h-4 w-4 text-accent-purple" />
                <span>Importar Questionário</span>
              </button>

              <button
                id="btn-survey-create-new"
                onClick={handleCreateNew}
                className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 transition hover:bg-accent-primary-solid-hover active:scale-95"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Criar Pesquisa (Abrir Wizard)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Replication Banner notification */}
      {replicationNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-accent-success-soft-border bg-accent-success-soft p-4 text-xs font-semibold text-accent-success">
          <CheckCircle2 className="h-4 w-4 text-accent-success" />
          <span>{replicationNotice}</span>
        </div>
      )}

      {/* Search Bar & Status Tabs */}
      <div className="flex flex-col justify-between gap-3 border-b border-ui pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          {isResearcher ? (
            <div className="flex items-center gap-2">
              <span className="rounded-lg px-3.5 py-1.5 text-xs font-bold border bg-accent-success-soft text-accent-success border-accent-success-soft-border shadow-xs flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-success-solid animate-pulse" />
                Ativas Atribuídas ({filteredSurveys.length})
              </span>
            </div>
          ) : (
            <>
              <button
                id="tab-surveys-active"
                onClick={() => setActiveTab('ativas')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition border ${
                  activeTab === 'ativas'
                    ? 'bg-accent-primary-soft text-accent-primary border-accent-primary-soft-border shadow-xs'
                    : 'bg-surface-card text-muted border-ui hover:text-primary hover:bg-surface-raised'
                }`}
              >
                Ativas ({surveys.filter((s) => s.status === 'ativa').length})
              </button>

              {canViewInactive && (
                <button
                  id="tab-surveys-inactive"
                  onClick={() => setActiveTab('inativas')}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition border ${
                    activeTab === 'inativas'
                      ? 'bg-accent-primary-soft text-accent-primary border-accent-primary-soft-border shadow-xs'
                      : 'bg-surface-card text-muted border-ui hover:text-primary hover:bg-surface-raised'
                  }`}
                >
                  Inativas ({surveys.filter((s) => s.status === 'inativa').length})
                </button>
              )}

              {canViewExcluded && (
                <button
                  id="tab-surveys-deleted"
                  onClick={() => setActiveTab('excluidas')}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition border ${
                    activeTab === 'excluidas'
                      ? 'bg-accent-primary-soft text-accent-primary border-accent-primary-soft-border shadow-xs'
                      : 'bg-surface-card text-muted border-ui hover:text-primary hover:bg-surface-raised'
                  }`}
                >
                  Excluídas ({surveys.filter((s) => s.status === 'excluida').length})
                </button>
              )}
            </>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="w-full rounded-lg border border-ui bg-surface-card py-1.5 pl-8 pr-3 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Bulk Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ui bg-surface px-4 py-2.5 shadow-md">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-secondary hover:text-primary select-none">
            <input
              type="checkbox"
              id="checkbox-select-all-surveys"
              checked={filteredSurveys.length > 0 && filteredSurveys.every((s) => selectedSurveyIds.includes(s.id))}
              onChange={() => {
                const allSelected = filteredSurveys.length > 0 && filteredSurveys.every((s) => selectedSurveyIds.includes(s.id));
                if (allSelected) {
                  setSelectedSurveyIds((prev) => prev.filter((id) => !filteredSurveys.some((s) => s.id === id)));
                } else {
                  const currentIds = filteredSurveys.map((s) => s.id);
                  setSelectedSurveyIds((prev) => Array.from(new Set([...prev, ...currentIds])));
                }
              }}
              className="h-4 w-4 rounded border-ui bg-surface-raised text-accent-primary-solid focus:ring-blue-500 focus:ring-offset-surface cursor-pointer"
            />
            <span>Selecionar todas ({filteredSurveys.length})</span>
          </label>

          {selectedSurveyIds.length > 0 && (
            <span className="rounded-full bg-accent-primary-soft border border-accent-primary-soft-border px-2.5 py-0.5 text-xs font-bold text-accent-primary">
              {selectedSurveyIds.length} selecionada(s)
            </span>
          )}
        </div>

        {selectedSurveyIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Open Daily Tracking Chart for all selected surveys */}
            <button
              id="btn-bulk-daily-chart"
              onClick={() => {
                const selected = surveys.filter((s) => selectedSurveyIds.includes(s.id));
                setTrackingSurveys(selected);
                setTrackingInitialId(selected[0]?.id);
                setTrackingModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft px-3 py-1.5 text-xs font-bold text-accent-primary hover:bg-accent-primary-solid-hover hover:text-on-accent transition-colors shadow-xs"
              title="Acompanhamento diário individual dos dias realizados das pesquisas selecionadas"
            >
              <BarChart3 className="h-3.5 w-3.5 text-accent-primary" />
              <span>Gráfico Diário ({selectedSurveyIds.length})</span>
            </button>

            {/* Export Consolidated PDF for all selected surveys */}
            {canExport && (
              <button
                id="btn-bulk-export-consolidated-pdf"
                onClick={() => setConsolidatedPdfModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-accent-danger-soft-border bg-accent-danger-soft px-3 py-1.5 text-xs font-bold text-accent-danger hover:bg-accent-danger-solid-hover hover:text-on-accent transition-colors shadow-xs"
                title="Exportar todas as pesquisas selecionadas para um único arquivo PDF consolidado"
              >
                <FileText className="h-3.5 w-3.5 text-accent-danger" />
                <span>Exportar PDF Consolidado ({selectedSurveyIds.length})</span>
              </button>
            )}

            {canToggleActive && (
              <>
                <button
                  id="btn-bulk-activate-surveys"
                  onClick={() => {
                    bulkUpdateSurveysStatus(selectedSurveyIds, 'ativa');
                  }}
                  className="flex items-center gap-1 rounded-lg border border-accent-success-soft-border bg-accent-success-soft px-2.5 py-1.5 text-xs font-semibold text-accent-success hover:bg-accent-success-soft transition-colors"
                  title="Ativar todas as pesquisas selecionadas"
                >
                  <Power className="h-3.5 w-3.5 text-accent-success" />
                  <span>Ativar</span>
                </button>

                <button
                  id="btn-bulk-deactivate-surveys"
                  onClick={() => {
                    bulkUpdateSurveysStatus(selectedSurveyIds, 'inativa');
                  }}
                  className="flex items-center gap-1 rounded-lg border border-accent-warning-soft-border bg-accent-warning-soft px-2.5 py-1.5 text-xs font-semibold text-accent-warning hover:bg-accent-warning-soft transition-colors"
                  title="Inativar todas as pesquisas selecionadas"
                >
                  <Power className="h-3.5 w-3.5 text-accent-warning" />
                  <span>Inativar</span>
                </button>
              </>
            )}

            {canReplicate && (
              <button
                id="btn-bulk-replicate-surveys"
                onClick={() => {
                  bulkReplicateSurveys(selectedSurveyIds);
                  setReplicationNotice(`${selectedSurveyIds.length} pesquisa(s) replicada(s) para novo ciclo com sucesso!`);
                  setTimeout(() => setReplicationNotice(null), 5000);
                }}
                className="flex items-center gap-1 rounded-lg border border-ui bg-surface-raised px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-surface-hover transition-colors"
                title="Replicar ciclos das pesquisas selecionadas"
              >
                <Copy className="h-3.5 w-3.5 text-accent-primary" />
                <span>Replicar</span>
              </button>
            )}

            {canDelete && (
              <button
                id="btn-bulk-delete-surveys"
                onClick={() => {
                  if (window.confirm(`Deseja realmente mover ${selectedSurveyIds.length} pesquisa(s) para a lixeira?`)) {
                    bulkDeleteSurveys(selectedSurveyIds);
                    setSelectedSurveyIds([]);
                  }
                }}
                className="flex items-center gap-1 rounded-lg border border-accent-danger-soft-border bg-accent-danger-soft px-2.5 py-1.5 text-xs font-semibold text-accent-danger hover:bg-accent-danger-soft transition-colors"
                title="Excluir pesquisas selecionadas"
              >
                <Trash2 className="h-3.5 w-3.5 text-accent-danger" />
                <span>Excluir</span>
              </button>
            )}

            <button
              id="btn-bulk-clear-selection"
              onClick={() => setSelectedSurveyIds([])}
              className="text-xs text-muted hover:text-primary px-2 py-1 transition-colors"
            >
              Desmarcar
            </button>
          </div>
        )}
      </div>

      {/* Survey Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredSurveys.map((survey) => {
          const surveySubs = submissions.filter((sub) => sub.pesquisaId === survey.id);
          const assignedResearchers = collaborators.filter((c) =>
            survey.pesquisadoresIds.includes(c.id)
          );
          const firstAudioSub = surveySubs.find((s) => s.audioGravacao);
          const isSelected = selectedSurveyIds.includes(survey.id);

          return (
            <div
              key={survey.id}
              className={`flex flex-col justify-between rounded-2xl border bg-surface p-5 shadow-xl transition ${
                isSelected
                  ? 'border-accent-primary-soft-border ring-1 ring-blue-500/30 bg-surface-raised'
                  : 'border-ui hover:border-ui'
              }`}
            >
              <div>
                {/* Header row with badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`checkbox-survey-${survey.id}`}
                      checked={isSelected}
                      onChange={() => {
                        setSelectedSurveyIds((prev) =>
                          prev.includes(survey.id)
                            ? prev.filter((id) => id !== survey.id)
                            : [...prev, survey.id]
                        );
                      }}
                      className="h-4 w-4 rounded border-ui bg-surface-raised text-accent-primary-solid focus:ring-blue-500 focus:ring-offset-surface cursor-pointer mr-0.5"
                    />
                    <span className="rounded bg-accent-primary-soft border border-accent-primary-soft-border px-2 py-0.5 text-xs font-bold text-accent-primary">
                      {survey.codigo}
                    </span>
                    <span className="rounded bg-surface-raised border border-ui px-2 py-0.5 text-[10px] font-semibold text-secondary">
                      Ciclo {survey.cicloAtual} (v{survey.versao})
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                        survey.status === 'ativa'
                          ? 'bg-accent-success-soft text-accent-success border-accent-success-soft-border'
                          : survey.status === 'inativa'
                          ? 'bg-accent-warning-soft text-accent-warning border-accent-warning-soft-border'
                          : 'bg-accent-danger-soft text-accent-danger border-accent-danger-soft-border'
                      }`}
                    >
                      {survey.status.toUpperCase()}
                    </span>

                    {/* Central Server Sync Status Pill */}
                    {isSurveyInProgress(survey) && (
                      <button
                        type="button"
                        id={`btn-server-sync-pill-${survey.id}`}
                        onClick={() => setSyncModalSurvey(survey)}
                        className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border transition ${
                          survey.serverSyncToken
                            ? 'bg-accent-success-soft border-accent-success-soft-border text-accent-success hover:bg-accent-success-soft'
                            : 'bg-accent-warning-soft border-accent-warning-soft-border text-accent-warning hover:bg-accent-warning-soft'
                        }`}
                        title={
                          survey.serverSyncToken
                            ? 'Sincronizado com o servidor. Pronto para subir alterações.'
                            : 'Pesquisa em andamento no servidor: sincronização obrigatória antes de subir alterações.'
                        }
                      >
                        <Server className="h-3 w-3" />
                        <span>
                          {survey.serverSyncToken
                            ? 'Servidor: Autorizado'
                            : 'Servidor: Sync Obrigatório'}
                        </span>
                      </button>
                    )}
                  </div>

                  {survey.habilitarColetaWeb && (
                    <span className="rounded bg-accent-info-soft border border-accent-info-soft-border px-2 py-0.5 text-[10px] font-semibold text-accent-info">
                      Coleta Web ({survey.tipoColetaWeb})
                    </span>
                  )}
                </div>

                <h3 className="mt-2.5 text-base font-bold text-primary">
                  {survey.nome}
                </h3>
                <p className="mt-1 text-xs text-muted line-clamp-2 leading-relaxed">
                  {survey.descricao}
                </p>

                {/* Metadata summary */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-surface-raised border border-ui/80 p-3 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-muted font-medium">Perguntas</div>
                    <div className="font-bold text-primary text-sm mt-0.5">
                      {survey.perguntas.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted font-medium">Regras / Pulos</div>
                    <div className="font-bold text-primary text-sm mt-0.5">
                      {survey.regras.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted font-medium">Entrevistas</div>
                    <div className="font-bold text-primary text-sm mt-0.5">
                      {surveySubs.length}
                    </div>
                  </div>
                </div>

                {/* Pesquisadores vinculados */}
                <div className="mt-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                    <Users className="h-3.5 w-3.5 text-muted" />
                    <span>Pesquisadores Vinculados ({assignedResearchers.length}):</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {assignedResearchers.map((r) => (
                      <span
                        key={r.id}
                        className="rounded bg-surface-raised border border-ui/60 px-2 py-0.5 text-[10px] text-secondary"
                      >
                        {r.nome.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="mt-5 border-t border-ui pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Left: Wizard / Edit & Replicate */}
                  <div className="flex items-center gap-1.5">
                    {canEdit && survey.status !== 'excluida' && (
                      <button
                        id={`btn-edit-survey-${survey.id}`}
                        onClick={() => handleEdit(survey)}
                        className="flex items-center gap-1 rounded-lg bg-surface-raised px-2.5 py-1.5 text-xs font-semibold text-primary border border-ui hover:bg-surface-hover hover:text-primary transition-colors"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Editar</span>
                      </button>
                    )}

                    {canReplicate && survey.status !== 'excluida' && (
                      <button
                        id={`btn-replicate-survey-${survey.id}`}
                        onClick={() => handleReplicate(survey)}
                        title="Replicar toda a pesquisa e metas para novo ciclo sem perder o histórico"
                        className="flex items-center gap-1 rounded-lg bg-surface-raised px-2.5 py-1.5 text-xs font-semibold text-primary border border-ui hover:bg-surface-hover hover:text-primary transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5 text-accent-primary" />
                        <span>Replicar Ciclo</span>
                      </button>
                    )}

                    {/* Test simulator */}
                    <button
                      id={`btn-simulate-survey-${survey.id}`}
                      onClick={() => {
                        setEditingSurvey(survey);
                        setActiveModule('simulador');
                      }}
                      className="flex items-center gap-1 rounded-lg bg-accent-primary-soft px-2.5 py-1.5 text-xs font-semibold text-accent-primary border border-accent-primary-soft-border hover:bg-accent-primary-solid-hover hover:text-on-accent transition-colors"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span>Coleta</span>
                    </button>
                  </div>

                  {/* Right: Daily Tracking Chart, Audio, Geo & Export */}
                  <div className="flex items-center gap-1">
                    {/* Daily Tracking Chart button */}
                    <button
                      id={`btn-daily-chart-${survey.id}`}
                      onClick={() => {
                        setTrackingSurveys([survey]);
                        setTrackingInitialId(survey.id);
                        setTrackingModalOpen(true);
                      }}
                      title="Ver Gráfico de Acompanhamento Diário (dias de coleta, metas, produtividade)"
                      className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-accent-primary transition-colors"
                    >
                      <BarChart3 className="h-4 w-4 text-accent-primary" />
                    </button>

                    {canListenAudio && (
                      <button
                        id={`btn-audio-survey-${survey.id}`}
                        onClick={() => {
                          setAudioExportSurveyId(survey.id);
                          setAudioExportModalOpen(true);
                        }}
                        title={`Exportar em lote ou ouvir gravações de áudio da pesquisa "${survey.nome}"`}
                        className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-accent-purple transition-colors"
                      >
                        <Volume2 className="h-4 w-4 text-accent-purple" />
                      </button>
                    )}

                    {canViewGeo && (
                      <button
                        id={`btn-geo-survey-${survey.id}`}
                        onClick={() => {
                          setGeoModalSurvey(survey);
                          setGeoModalOpen(true);
                        }}
                        title="Visualizar georreferenciamento em mapa"
                        className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-accent-success transition-colors"
                      >
                        <MapPin className="h-4 w-4 text-accent-success" />
                      </button>
                    )}

                    {/* Export results CSV / PDF */}
                    {canExport && (
                      <>
                        <button
                          id={`btn-export-csv-${survey.id}`}
                          onClick={() => handleExportCSV(survey)}
                          title="Exportar Resultados em CSV (com código, pesquisador, data/hora)"
                          className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-accent-success transition-colors"
                        >
                          <FileSpreadsheet className="h-4 w-4 text-accent-success" />
                        </button>
                        <button
                          id={`btn-export-pdf-${survey.id}`}
                          onClick={() => handleExportPDF(survey)}
                          title="Exportar Relatório em PDF"
                          className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-accent-danger transition-colors"
                        >
                          <FileText className="h-4 w-4 text-accent-danger" />
                        </button>
                      </>
                    )}

                    {/* Deactivate / Activate */}
                    {canToggleActive && survey.status !== 'excluida' && (
                      <button
                        id={`btn-toggle-status-${survey.id}`}
                        onClick={() => toggleSurveyStatus(survey.id)}
                        title={survey.status === 'ativa' ? 'Desativar Pesquisa' : 'Ativar Pesquisa'}
                        className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-accent-warning transition-colors"
                      >
                        <Power className="h-4 w-4 text-accent-warning" />
                      </button>
                    )}

                    {/* Delete / Restore */}
                    {survey.status === 'excluida' ? (
                      <button
                        id={`btn-restore-survey-${survey.id}`}
                        onClick={() => restoreSurvey(survey.id)}
                        title="Restaurar pesquisa excluída"
                        className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-accent-success transition-colors"
                      >
                        <RotateCcw className="h-4 w-4 text-accent-success" />
                      </button>
                    ) : (
                      canDelete && (
                        <button
                          id={`btn-delete-survey-${survey.id}`}
                          onClick={() => {
                            if (window.confirm(`Deseja mover a pesquisa "${survey.nome}" para a lixeira?`)) {
                              deleteSurvey(survey.id);
                            }
                          }}
                          title="Excluir pesquisa"
                          className="rounded-lg p-1.5 text-muted hover:bg-accent-danger-soft hover:text-accent-danger transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSurveys.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ui p-8 text-center">
          <FileQuestion className="mx-auto h-10 w-10 text-muted" />
          <h3 className="mt-3 text-sm font-bold text-secondary">
            Nenhuma pesquisa encontrada nesta categoria
          </h3>
          <p className="mt-1 text-xs text-muted">
            Verifique os filtros selecionados ou crie uma nova pesquisa utilizando o Wizard.
          </p>
        </div>
      )}

      {/* Audio Modal */}
      {audioModalSubmission && (
        <AudioPlayerModal
          submission={audioModalSubmission}
          onClose={() => setAudioModalSubmission(null)}
        />
      )}

      {/* Georeferencing Modal */}
      {geoModalOpen && (
        <GeoMapModal
          submissions={
            geoModalSurvey
              ? submissions.filter((s) => s.pesquisaId === geoModalSurvey.id)
              : submissions
          }
          surveyName={geoModalSurvey?.nome}
          onClose={() => {
            setGeoModalOpen(false);
            setGeoModalSurvey(null);
          }}
        />
      )}

      {/* Daily Tracking Chart Modal */}
      {trackingModalOpen && (
        <SurveyDailyTrackingModal
          surveys={trackingSurveys.length > 0 ? trackingSurveys : surveys}
          submissions={submissions}
          initialSurveyId={trackingInitialId}
          onClose={() => setTrackingModalOpen(false)}
        />
      )}

      {/* Central Server Sync Modal */}
      {syncModalSurvey && (
        <ServerSyncCheckModal
          isOpen={!!syncModalSurvey}
          onClose={() => setSyncModalSurvey(null)}
          survey={syncModalSurvey}
          hasLocalModifications={false}
          onUploadSuccess={() => {
            setSyncModalSurvey(null);
          }}
        />
      )}

      {/* Consolidated PDF Export Modal */}
      {consolidatedPdfModalOpen && (
        <ConsolidatedPdfExportModal
          surveys={surveys.filter((s) => selectedSurveyIds.includes(s.id))}
          submissions={submissions}
          onClose={() => setConsolidatedPdfModalOpen(false)}
          onSuccess={() => {
            setConsolidatedPdfModalOpen(false);
          }}
        />
      )}

      {/* Questionnaire Import Modal */}
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

      {/* Audio Batch & Individual Export Modal strictly segregated by survey */}
      {audioExportModalOpen && (
        <AudioExportModal
          isOpen={audioExportModalOpen}
          onClose={() => setAudioExportModalOpen(false)}
          initialSurveyId={audioExportSurveyId}
        />
      )}
    </div>
  );
};
