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

  // Filter surveys based on association if not permitted to see all
  const filteredSurveys = surveys.filter((s) => {
    // Association check
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
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Módulo de Pesquisas e Questionários
          </h1>
          <p className="text-xs text-slate-400">
            Criação com wizard em 5 etapas, replicação de ciclos, gestão de pesquisadores e exportação oficial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-nav-to-audit-from-surveys"
            onClick={() => setActiveModule('historico_acoes')}
            className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-600/10 px-3.5 py-2 text-xs font-bold text-blue-400 hover:bg-blue-600/20 transition-colors shadow-xs"
            title="Abrir Trilha de Auditoria e Histórico de Conformidade"
          >
            <History className="h-4 w-4 text-blue-400" />
            <span>Histórico de Auditoria</span>
          </button>

          {canListenAudio && (
            <button
              id="btn-export-audios-by-survey"
              onClick={() => {
                setAudioExportSurveyId(undefined);
                setAudioExportModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-600/10 px-3.5 py-2 text-xs font-bold text-purple-400 hover:bg-purple-600/20 transition-colors shadow-xs"
              title="Exportar gravações de áudio separadas por pesquisa (individual ou lote .ZIP)"
            >
              <Volume2 className="h-4 w-4 text-purple-400" />
              <span>Exportar Áudios (.ZIP)</span>
            </button>
          )}

          {canCreate && (
            <>
              <button
                id="btn-survey-import-questionnaire"
                onClick={() => setQuestionnaireImportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-600/10 px-3.5 py-2 text-xs font-bold text-purple-400 hover:bg-purple-600/20 transition-colors shadow-xs"
                title="Importar questionário de texto/arquivo com questões e alternativas organizadas"
              >
                <Upload className="h-4 w-4 text-purple-400" />
                <span>Importar Questionário</span>
              </button>

              <button
                id="btn-survey-create-new"
                onClick={handleCreateNew}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500 active:scale-95"
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
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{replicationNotice}</span>
        </div>
      )}

      {/* Search Bar & Status Tabs */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <button
            id="tab-surveys-active"
            onClick={() => setActiveTab('ativas')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition border ${
              activeTab === 'ativas'
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-xs'
                : 'bg-[#111218] text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
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
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-xs'
                  : 'bg-[#111218] text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
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
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-xs'
                  : 'bg-[#111218] text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            >
              Excluídas ({surveys.filter((s) => s.status === 'excluida').length})
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="w-full rounded-lg border border-slate-800 bg-[#111218] py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Bulk Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#16171d] px-4 py-2.5 shadow-md">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white select-none">
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
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <span>Selecionar todas ({filteredSurveys.length})</span>
          </label>

          {selectedSurveyIds.length > 0 && (
            <span className="rounded-full bg-blue-600/20 border border-blue-500/30 px-2.5 py-0.5 text-xs font-bold text-blue-400">
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
              className="flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-600/20 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-600 hover:text-white transition-colors shadow-xs"
              title="Acompanhamento diário individual dos dias realizados das pesquisas selecionadas"
            >
              <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
              <span>Gráfico Diário ({selectedSurveyIds.length})</span>
            </button>

            {/* Export Consolidated PDF for all selected surveys */}
            {canExport && (
              <button
                id="btn-bulk-export-consolidated-pdf"
                onClick={() => setConsolidatedPdfModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-600/20 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition-colors shadow-xs"
                title="Exportar todas as pesquisas selecionadas para um único arquivo PDF consolidado"
              >
                <FileText className="h-3.5 w-3.5 text-rose-400" />
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
                  className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-600/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/20 transition-colors"
                  title="Ativar todas as pesquisas selecionadas"
                >
                  <Power className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Ativar</span>
                </button>

                <button
                  id="btn-bulk-deactivate-surveys"
                  onClick={() => {
                    bulkUpdateSurveysStatus(selectedSurveyIds, 'inativa');
                  }}
                  className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-600/10 px-2.5 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-600/20 transition-colors"
                  title="Inativar todas as pesquisas selecionadas"
                >
                  <Power className="h-3.5 w-3.5 text-amber-400" />
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
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                title="Replicar ciclos das pesquisas selecionadas"
              >
                <Copy className="h-3.5 w-3.5 text-blue-400" />
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
                className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-600/10 px-2.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-600/20 transition-colors"
                title="Excluir pesquisas selecionadas"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                <span>Excluir</span>
              </button>
            )}

            <button
              id="btn-bulk-clear-selection"
              onClick={() => setSelectedSurveyIds([])}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors"
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
              className={`flex flex-col justify-between rounded-2xl border bg-[#16171d] p-5 shadow-xl transition ${
                isSelected
                  ? 'border-blue-500/60 ring-1 ring-blue-500/30 bg-slate-900/40'
                  : 'border-slate-800 hover:border-slate-700'
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
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer mr-0.5"
                    />
                    <span className="rounded bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-xs font-bold text-blue-400">
                      {survey.codigo}
                    </span>
                    <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                      Ciclo {survey.cicloAtual} (v{survey.versao})
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                        survey.status === 'ativa'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : survey.status === 'inativa'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
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
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
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
                    <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                      Coleta Web ({survey.tipoColetaWeb})
                    </span>
                  )}
                </div>

                <h3 className="mt-2.5 text-base font-bold text-white">
                  {survey.nome}
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {survey.descricao}
                </p>

                {/* Metadata summary */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-900/50 border border-slate-800/80 p-3 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Perguntas</div>
                    <div className="font-bold text-white text-sm mt-0.5">
                      {survey.perguntas.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Regras / Pulos</div>
                    <div className="font-bold text-white text-sm mt-0.5">
                      {survey.regras.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Entrevistas</div>
                    <div className="font-bold text-white text-sm mt-0.5">
                      {surveySubs.length}
                    </div>
                  </div>
                </div>

                {/* Pesquisadores vinculados */}
                <div className="mt-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                    <span>Pesquisadores Vinculados ({assignedResearchers.length}):</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {assignedResearchers.map((r) => (
                      <span
                        key={r.id}
                        className="rounded bg-slate-800 border border-slate-700/60 px-2 py-0.5 text-[10px] text-slate-300"
                      >
                        {r.nome.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="mt-5 border-t border-slate-800 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Left: Wizard / Edit & Replicate */}
                  <div className="flex items-center gap-1.5">
                    {canEdit && survey.status !== 'excluida' && (
                      <button
                        id={`btn-edit-survey-${survey.id}`}
                        onClick={() => handleEdit(survey)}
                        className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
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
                        className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5 text-blue-400" />
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
                      className="flex items-center gap-1 rounded-lg bg-blue-600/15 px-2.5 py-1.5 text-xs font-semibold text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-colors"
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
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-blue-400 transition-colors"
                    >
                      <BarChart3 className="h-4 w-4 text-blue-400" />
                    </button>

                    {canListenAudio && (
                      <button
                        id={`btn-audio-survey-${survey.id}`}
                        onClick={() => {
                          setAudioExportSurveyId(survey.id);
                          setAudioExportModalOpen(true);
                        }}
                        title={`Exportar em lote ou ouvir gravações de áudio da pesquisa "${survey.nome}"`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-purple-400 transition-colors"
                      >
                        <Volume2 className="h-4 w-4 text-purple-400" />
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
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
                      >
                        <MapPin className="h-4 w-4 text-emerald-400" />
                      </button>
                    )}

                    {/* Export results CSV / PDF */}
                    {canExport && (
                      <>
                        <button
                          id={`btn-export-csv-${survey.id}`}
                          onClick={() => handleExportCSV(survey)}
                          title="Exportar Resultados em CSV (com código, pesquisador, data/hora)"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
                        >
                          <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                        </button>
                        <button
                          id={`btn-export-pdf-${survey.id}`}
                          onClick={() => handleExportPDF(survey)}
                          title="Exportar Relatório em PDF"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-red-400" />
                        </button>
                      </>
                    )}

                    {/* Deactivate / Activate */}
                    {canToggleActive && survey.status !== 'excluida' && (
                      <button
                        id={`btn-toggle-status-${survey.id}`}
                        onClick={() => toggleSurveyStatus(survey.id)}
                        title={survey.status === 'ativa' ? 'Desativar Pesquisa' : 'Ativar Pesquisa'}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-amber-400 transition-colors"
                      >
                        <Power className="h-4 w-4 text-amber-400" />
                      </button>
                    )}

                    {/* Delete / Restore */}
                    {survey.status === 'excluida' ? (
                      <button
                        id={`btn-restore-survey-${survey.id}`}
                        onClick={() => restoreSurvey(survey.id)}
                        title="Restaurar pesquisa excluída"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
                      >
                        <RotateCcw className="h-4 w-4 text-emerald-400" />
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
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
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
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <FileQuestion className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
            Nenhuma pesquisa encontrada nesta categoria
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
