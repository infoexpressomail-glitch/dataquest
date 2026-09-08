import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MessageSquare,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Edit3,
  Trash2,
  Volume2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  History,
  Save,
  X,
} from 'lucide-react';
import { InterviewSubmission, Survey } from '../../types';
import { exportSubmissionsToCSV, exportSubmissionsToPDF } from '../../utils/exportUtils';
import { exportSingleAudio } from '../../utils/audioUtils';
import { AudioPlayerModal } from '../surveys/AudioPlayerModal';
import { AudioExportModal } from '../surveys/AudioExportModal';
import { GeoMapModal } from '../surveys/GeoMapModal';

export const ResponsesModule: React.FC = () => {
  const {
    surveys,
    submissions,
    collaborators,
    currentUser,
    hasPermission,
    updateSubmissionAnswers,
    deleteSubmission,
    setActiveModule,
  } = useApp();

  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('all');
  const [selectedResearcherId, setSelectedResearcherId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Modals
  const [audioModalSub, setAudioModalSub] = useState<InterviewSubmission | null>(null);
  const [audioExportModalOpen, setAudioExportModalOpen] = useState(false);
  const [geoModalOpen, setGeoModalOpen] = useState(false);
  const [geoModalSub, setGeoModalSub] = useState<InterviewSubmission[]>([]);

  // Admin Edit Modal
  const [editingSubmission, setEditingSubmission] = useState<InterviewSubmission | null>(null);
  const [editAnswersState, setEditAnswersState] = useState<Record<string, string>>({});
  const [editReason, setEditReason] = useState<string>('Correção ortográfica e consistência pelo administrador');

  const canAlterarRespostas =
    hasPermission('respostas_alterar') ||
    hasPermission('pesquisa_alteracao_resposta_espontanea') ||
    hasPermission('analise_criar_alterar_excluir_resposta');

  const canExport = hasPermission('pesquisa_exportar_resultados');
  const canListenAudio = hasPermission('pesquisa_ouvir_audio');
  const canViewGeo = hasPermission('pesquisa_visualizar_georeferenciamento');

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    if (selectedSurveyId !== 'all' && sub.pesquisaId !== selectedSurveyId) return false;
    if (selectedResearcherId !== 'all' && sub.pesquisadorId !== selectedResearcherId) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matches =
        sub.codigoPesquisa.toLowerCase().includes(term) ||
        sub.pesquisadorNome.toLowerCase().includes(term) ||
        sub.pesquisaNome.toLowerCase().includes(term) ||
        sub.respostas.some((r) => {
          const val = Array.isArray(r.resposta) ? r.resposta.join(' ') : r.resposta;
          return val.toLowerCase().includes(term);
        });
      if (!matches) return false;
    }

    return true;
  });

  const handleOpenEditModal = (sub: InterviewSubmission) => {
    setEditingSubmission(sub);
    const initialMap: Record<string, string> = {};
    sub.respostas.forEach((r) => {
      initialMap[r.perguntaId] = Array.isArray(r.resposta) ? r.resposta.join(', ') : r.resposta;
    });
    setEditAnswersState(initialMap);
  };

  const handleSaveEditedAnswers = () => {
    if (!editingSubmission) return;

    const formattedList = Object.entries(editAnswersState).map(([perguntaId, val]) => ({
      perguntaId,
      resposta: val,
    }));

    updateSubmissionAnswers(editingSubmission.id, formattedList, editReason);
    setEditingSubmission(null);
  };

  const handleExportCSV = () => {
    const survey = surveys.find((s) => s.id === selectedSurveyId);
    exportSubmissionsToCSV(filteredSubmissions, survey);
  };

  const handleExportPDF = () => {
    const survey = surveys.find((s) => s.id === selectedSurveyId);
    exportSubmissionsToPDF(filteredSubmissions, survey);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
            Visualização e Auditoria de Respostas
          </h1>
          <p className="text-xs text-muted">
            Acompanhe respostas em tempo real, audite coordenadas GPS, gravações de áudio e efetue correções administrativas antes da exportação.
          </p>
        </div>

        {/* Export & Audit action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-nav-to-audit-from-responses"
            onClick={() => setActiveModule('historico_acoes')}
            className="flex items-center gap-1.5 rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft px-3.5 py-2 text-xs font-bold text-accent-primary hover:bg-accent-primary-soft transition-colors shadow-xs"
            title="Abrir Trilha de Auditoria e Histórico de Conformidade"
          >
            <History className="h-4 w-4 text-accent-primary" />
            <span>Histórico de Auditoria</span>
          </button>

          {hasPermission('pesquisa_ouvir_audio') && (
            <button
              id="btn-export-audios-from-responses"
              onClick={() => setAudioExportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-accent-purple-soft-border bg-accent-purple-soft px-3.5 py-2 text-xs font-bold text-accent-purple hover:bg-accent-purple-soft transition-colors shadow-xs"
              title="Exportar gravações de áudio separadas por pesquisa (individual ou lote .ZIP)"
            >
              <Volume2 className="h-4 w-4 text-accent-purple" />
              <span>Exportar Áudios (.ZIP)</span>
            </button>
          )}

          {canExport && (
            <>
              <button
                id="btn-export-all-csv"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3.5 py-2 text-xs font-bold text-primary shadow-sm hover:bg-surface-hover hover:text-primary transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-accent-success" />
                <span>Exportar CSV</span>
              </button>
              <button
                id="btn-export-all-pdf"
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-3.5 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>Exportar PDF Oficial</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-ui bg-surface p-4 shadow-xl sm:grid-cols-3">
        {/* Filter by Survey */}
        <div>
          <label className="block text-[11px] font-bold text-muted">
            Filtrar por Pesquisa:
          </label>
          <select
            value={selectedSurveyId}
            onChange={(e) => setSelectedSurveyId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-2.5 py-1.5 text-xs text-primary focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">Todas as Pesquisas ({submissions.length} coletas)</option>
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.codigo}] {s.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Researcher */}
        <div>
          <label className="block text-[11px] font-bold text-muted">
            Filtrar por Pesquisador:
          </label>
          <select
            value={selectedResearcherId}
            onChange={(e) => setSelectedResearcherId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-2.5 py-1.5 text-xs text-primary focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">Todos os Pesquisadores</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} ({c.login})
              </option>
            ))}
          </select>
        </div>

        {/* Search input */}
        <div>
          <label className="block text-[11px] font-bold text-muted">
            Pesquisar texto / resposta:
          </label>
          <div className="relative mt-1">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite termo, palavra ou código..."
              className="w-full rounded-lg border border-ui bg-surface-card py-1.5 pl-8 pr-2.5 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Submissions List / Table */}
      <div className="overflow-hidden rounded-2xl border border-ui bg-surface shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ui bg-surface-card font-bold text-muted">
              <tr>
                <th className="py-3 px-4">Cód. Pesquisa</th>
                <th className="py-3 px-4">Pesquisa</th>
                <th className="py-3 px-4">Pesquisador</th>
                <th className="py-3 px-4">Data e Hora</th>
                <th className="py-3 px-4">Evidências</th>
                <th className="py-3 px-4">Status & Auditoria</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui/80">
              {filteredSubmissions.map((sub) => {
                const isExpanded = expandedSubId === sub.id;

                return (
                  <React.Fragment key={sub.id}>
                    <tr className="hover:bg-surface-raised transition">
                      <td className="py-3 px-4 font-bold text-accent-primary">
                        {sub.codigoPesquisa}
                      </td>
                      <td className="py-3 px-4 font-semibold text-primary">
                        {sub.pesquisaNome}
                      </td>
                      <td className="py-3 px-4 text-secondary">
                        {sub.pesquisadorNome}
                      </td>
                      <td className="py-3 px-4 text-muted whitespace-nowrap">
                        {new Date(sub.dataHora).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {sub.audioGravacao && canListenAudio && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setAudioModalSub(sub)}
                                title="Ouvir gravação de áudio da entrevista"
                                className="rounded p-1 text-accent-purple hover:bg-surface-raised transition-colors"
                              >
                                <Volume2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => exportSingleAudio(sub)}
                                title={`Baixar gravação individual (.wav): ${sub.audioGravacao.nomeArquivo}`}
                                className="rounded p-1 text-accent-purple hover:bg-surface-raised hover:text-primary transition-colors"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                          {sub.geolocalizacao && canViewGeo && (
                            <button
                              onClick={() => {
                                setGeoModalSub([sub]);
                                setGeoModalOpen(true);
                              }}
                              title="Ver georreferenciamento de GPS"
                              className="rounded p-1 text-accent-success hover:bg-surface-raised transition-colors"
                            >
                              <MapPin className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className="inline-block rounded bg-accent-success-soft border border-accent-success-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-success">
                            Concluída
                          </span>
                          {sub.respostasAlteradasPeloAdmin && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-accent-danger">
                              <History className="h-3 w-3" />
                              <span>Auditada / Corrigida</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Question/Answers view */}
                          <button
                            onClick={() =>
                              setExpandedSubId(isExpanded ? null : sub.id)
                            }
                            className="flex items-center gap-1 rounded-lg bg-surface-raised border border-ui px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-surface-hover transition-colors"
                          >
                            <span>Respostas ({sub.respostas.length})</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>

                          {/* Admin Edit button */}
                          {canAlterarRespostas && (
                            <button
                              onClick={() => handleOpenEditModal(sub)}
                              title="Editar / Corrigir respostas antes da exportação"
                              className="rounded-lg bg-accent-primary-soft border border-accent-primary-soft-border p-1.5 text-accent-primary hover:bg-accent-primary-solid-hover hover:text-on-accent transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {hasPermission('pesquisa_excluir') && (
                            <button
                              onClick={() => {
                                if (window.confirm('Excluir este registro de entrevista?')) {
                                  deleteSubmission(sub.id);
                                }
                              }}
                              className="rounded-lg p-1.5 text-muted hover:bg-accent-danger-soft hover:text-accent-danger transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded question answers view */}
                    {isExpanded && (
                      <tr className="bg-surface-card/80">
                        <td colSpan={7} className="p-4 border-t border-ui">
                          <div className="rounded-xl border border-ui bg-surface p-4">
                            <div className="flex items-center justify-between border-b border-ui pb-2">
                              <span className="font-bold text-primary">
                                Detalhamento de Perguntas e Respostas da Coleta #{sub.id}
                              </span>
                              {sub.respostasAlteradasPeloAdmin && (
                                <span className="text-[10px] text-accent-danger">
                                  Última auditoria realizada por:{' '}
                                  {sub.historicoEdicao?.[sub.historicoEdicao.length - 1]?.alteradoPor}
                                </span>
                              )}
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {sub.respostas.map((item) => (
                                <div
                                  key={item.perguntaId}
                                  className="rounded-xl border border-ui bg-surface-card p-3 text-xs"
                                >
                                  <div className="font-semibold text-accent-primary">
                                    [{item.perguntaCodigo}] {item.perguntaEnunciado}
                                  </div>
                                  <div className="mt-1 font-bold text-primary">
                                    {Array.isArray(item.resposta)
                                      ? item.resposta.join(', ')
                                      : item.resposta || '(Sem resposta)'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredSubmissions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ui bg-surface p-8 text-center">
          <MessageSquare className="mx-auto h-9 w-9 text-muted" />
          <p className="mt-2 text-xs font-bold text-muted">
            Nenhuma resposta encontrada para os filtros selecionados.
          </p>
        </div>
      )}

      {/* Admin Edit Answers Modal (Permite realizar a alteração de respostas espontânea antes da exportação) */}
      {editingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-xs p-4">
          <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-ui bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ui pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary-soft border border-accent-primary-soft-border text-accent-primary">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">
                    Edição Administrativa de Respostas Espontâneas
                  </h3>
                  <p className="text-[11px] text-muted">
                    Permitido apenas ao Administrador antes da exportação final
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingSubmission(null)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              <div className="rounded-xl bg-accent-warning-soft border border-accent-warning-soft-border p-3 text-xs text-accent-warning">
                ⚠️ Todas as correções efetuadas aqui serão registradas na trilha de auditoria e constarão no relatório oficial em CSV/PDF.
              </div>

              {editingSubmission.respostas.map((resp) => (
                <div key={resp.perguntaId} className="space-y-1">
                  <label className="block text-xs font-bold text-secondary">
                    [{resp.perguntaCodigo}] {resp.perguntaEnunciado}
                  </label>
                  <input
                    type="text"
                    value={editAnswersState[resp.perguntaId] || ''}
                    onChange={(e) =>
                      setEditAnswersState({
                        ...editAnswersState,
                        [resp.perguntaId]: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-ui bg-surface-card px-3 py-1.5 text-xs text-primary shadow-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              ))}

              <div className="pt-2">
                <label className="block text-xs font-bold text-secondary">
                  Motivo da Alteração / Justificativa de Auditoria *
                </label>
                <textarea
                  rows={2}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-3 py-1.5 text-xs text-primary shadow-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-ui pt-3">
              <button
                type="button"
                onClick={() => setEditingSubmission(null)}
                className="rounded-lg border border-ui bg-surface-raised px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditedAnswers}
                className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Salvar Correções de Auditoria</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Modal */}
      {audioModalSub && (
        <AudioPlayerModal
          submission={audioModalSub}
          onClose={() => setAudioModalSub(null)}
        />
      )}

      {/* Audio Batch/Individual Export Modal */}
      {audioExportModalOpen && (
        <AudioExportModal
          isOpen={audioExportModalOpen}
          onClose={() => setAudioExportModalOpen(false)}
          initialSurveyId={selectedSurveyId !== 'all' ? selectedSurveyId : undefined}
        />
      )}

      {/* Geo Map Modal */}
      {geoModalOpen && (
        <GeoMapModal
          submissions={geoModalSub.length > 0 ? geoModalSub : submissions}
          onClose={() => {
            setGeoModalOpen(false);
            setGeoModalSub([]);
          }}
        />
      )}
    </div>
  );
};
