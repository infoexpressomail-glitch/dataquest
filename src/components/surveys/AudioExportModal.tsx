import React, { useState, useMemo } from 'react';
import {
  X,
  Volume2,
  Download,
  ShieldCheck,
  Search,
  Play,
  FileArchive,
  CheckCircle2,
  Clock,
  Mic,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Survey, InterviewSubmission } from '../../types';
import {
  exportSurveyAudiosBatchZip,
  exportSingleAudio,
  formatAudioDuration,
} from '../../utils/audioUtils';

interface AudioExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveys: Survey[];
  submissions: InterviewSubmission[];
  defaultSurveyId?: string;
  onPlayAudio?: (submission: InterviewSubmission) => void;
}

export const AudioExportModal: React.FC<AudioExportModalProps> = ({
  isOpen,
  onClose,
  surveys,
  submissions,
  defaultSurveyId,
  onPlayAudio,
}) => {
  if (!isOpen) return null;

  // Lista de pesquisas que têm pelo menos 1 gravação ou pesquisas ativas
  const activeSurveysList = useMemo(() => {
    return surveys.filter((s) => s.status !== 'excluida');
  }, [surveys]);

  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(() => {
    if (defaultSurveyId && activeSurveysList.some((s) => s.id === defaultSurveyId)) {
      return defaultSurveyId;
    }
    // Prioriza primeira pesquisa que tenha áudios
    const withAudio = activeSurveysList.find((s) =>
      submissions.some((sub) => sub.pesquisaId === s.id && sub.audioGravacao)
    );
    return withAudio?.id || activeSurveysList[0]?.id || '';
  });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [zipStatusText, setZipStatusText] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSurvey = useMemo(() => {
    return surveys.find((s) => s.id === selectedSurveyId);
  }, [surveys, selectedSurveyId]);

  // Submissões com áudio ESTREITAMENTE da pesquisa selecionada
  const surveyAudioSubmissions = useMemo(() => {
    if (!selectedSurveyId) return [];
    return submissions.filter(
      (sub) => sub.pesquisaId === selectedSurveyId && sub.audioGravacao
    );
  }, [submissions, selectedSurveyId]);

  // Filtro de busca de texto
  const filteredSubmissions = useMemo(() => {
    if (!searchTerm.trim()) return surveyAudioSubmissions;
    const term = searchTerm.toLowerCase();
    return surveyAudioSubmissions.filter(
      (sub) =>
        sub.codigoPesquisa.toLowerCase().includes(term) ||
        sub.pesquisadorNome.toLowerCase().includes(term) ||
        (sub.audioGravacao?.nomeArquivo &&
          sub.audioGravacao.nomeArquivo.toLowerCase().includes(term))
    );
  }, [surveyAudioSubmissions, searchTerm]);

  // Estatísticas do lote da pesquisa
  const stats = useMemo(() => {
    const totalCount = surveyAudioSubmissions.length;
    const totalSeconds = surveyAudioSubmissions.reduce(
      (acc, s) => acc + (s.audioGravacao?.duracaoSegundos || 0),
      0
    );
    const totalKb = surveyAudioSubmissions.reduce(
      (acc, s) => acc + (s.audioGravacao?.tamanhoKb || 300),
      0
    );
    const researchers = new Set(surveyAudioSubmissions.map((s) => s.pesquisadorNome)).size;

    return {
      totalCount,
      totalSeconds,
      totalMb: (totalKb / 1024).toFixed(1),
      researchers,
    };
  }, [surveyAudioSubmissions]);

  // Identifica a pergunta de início da gravação da pesquisa
  const initialQuestionText = useMemo(() => {
    if (!selectedSurvey?.gravarAudioAPartirPerguntaId) {
      return 'Desde o Início da Entrevista (Pergunta 1)';
    }
    const q = selectedSurvey.perguntas?.find(
      (p) => p.id === selectedSurvey.gravarAudioAPartirPerguntaId
    );
    return q
      ? `${q.codigo} - ${q.enunciado.slice(0, 45)}...`
      : 'Pergunta específica configurada';
  }, [selectedSurvey]);

  const handleExportZip = async () => {
    if (!selectedSurvey || surveyAudioSubmissions.length === 0) return;

    setIsExportingZip(true);
    setZipProgress(5);
    setZipStatusText('Iniciando compactação dos áudios isolados...');
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const result = await exportSurveyAudiosBatchZip(
        selectedSurvey,
        submissions,
        (pct, text) => {
          setZipProgress(pct);
          setZipStatusText(text);
        }
      );

      setSuccessMessage(
        `Lote exportado com sucesso! ${result.count} gravação(ões) empacotadas no arquivo "${result.zipName}".`
      );
    } catch (err: any) {
      console.error('Erro ao exportar lote de áudios:', err);
      setErrorMessage(err.message || 'Falha ao gerar o arquivo ZIP dos áudios.');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleDownloadSingle = async (sub: InterviewSubmission) => {
    try {
      await exportSingleAudio(sub, selectedSurvey);
    } catch (err: any) {
      alert(err.message || 'Erro ao baixar o áudio individual.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl border border-ui bg-surface shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-ui px-6 py-4 bg-surface-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple-soft text-accent-purple border border-accent-purple-soft-border">
              <FileArchive className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-primary">
                  Central de Exportação de Gravações de Áudio
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-success-soft border border-accent-success-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-success">
                  <ShieldCheck className="h-3 w-3" />
                  Isolamento por Pesquisa
                </span>
              </div>
              <p className="text-xs text-muted">
                Exporte gravações de campo individualmente ou em lote (.ZIP), com separação estrita por pesquisa.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Survey Selector & Security Guarantee Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label
                htmlFor="select-export-survey"
                className="block text-xs font-bold text-secondary"
              >
                Selecione a Pesquisa Desejada:
              </label>
              <select
                id="select-export-survey"
                value={selectedSurveyId}
                onChange={(e) => {
                  setSelectedSurveyId(e.target.value);
                  setSuccessMessage(null);
                  setErrorMessage(null);
                }}
                className="w-full rounded-lg border border-ui bg-surface-card px-3.5 py-2.5 text-xs font-medium text-primary shadow-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {activeSurveysList.map((s) => {
                  const count = submissions.filter(
                    (sub) => sub.pesquisaId === s.id && sub.audioGravacao
                  ).length;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.codigo} - {s.nome} ({count} gravação{count !== 1 ? 'ões' : ''})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-3 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-accent-primary shrink-0 mt-0.5" />
              <div className="text-[11px] text-accent-primary/90 leading-relaxed">
                <strong className="text-accent-primary-soft-text">Garantia Anti-Mistura:</strong> As exportações
                filtram rigorosamente apenas os registros da pesquisa ativa.
              </div>
            </div>
          </div>

          {/* Survey Audio Settings Summary */}
          {selectedSurvey && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-ui bg-surface-card p-3">
                <div className="text-[11px] text-muted">Total de Áudios</div>
                <div className="mt-1 text-lg font-bold text-primary flex items-center gap-1.5">
                  <Volume2 className="h-4 w-4 text-accent-purple" />
                  {stats.totalCount}
                </div>
              </div>

              <div className="rounded-xl border border-ui bg-surface-card p-3">
                <div className="text-[11px] text-muted">Duração Somada</div>
                <div className="mt-1 text-lg font-bold text-primary flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-accent-info" />
                  {formatAudioDuration(stats.totalSeconds)}
                </div>
              </div>

              <div className="rounded-xl border border-ui bg-surface-card p-3">
                <div className="text-[11px] text-muted">Limite da Pesquisa</div>
                <div className="mt-1 text-sm font-bold text-primary flex items-center gap-1.5">
                  <Mic className="h-4 w-4 text-accent-success" />
                  {selectedSurvey.tempoLimiteGravacaoMinutos || 2} minutos
                </div>
              </div>

              <div className="rounded-xl border border-ui bg-surface-card p-3">
                <div className="text-[11px] text-muted">Início da Gravação</div>
                <div className="mt-1 text-xs font-bold text-secondary truncate" title={initialQuestionText}>
                  {selectedSurvey.gravarAudioAPartirPerguntaId ? 'Pergunta Específica' : 'Pergunta 1 (Início)'}
                </div>
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {successMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-accent-success-soft-border bg-accent-success-soft p-3 text-xs text-accent-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-accent-danger-soft-border bg-accent-danger-soft p-3 text-xs text-accent-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Export Zip Progress */}
          {isExportingZip && (
            <div className="space-y-2 rounded-xl border border-accent-purple-soft-border bg-accent-purple-soft p-4">
              <div className="flex justify-between text-xs text-accent-purple font-bold">
                <span>{zipStatusText}</span>
                <span>{zipProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden">
                <div
                  className="h-full bg-accent-purple-solid transition-all duration-300"
                  style={{ width: `${zipProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Bar: Search & Batch Export Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por protocolo ou pesquisador..."
                className="w-full rounded-lg border border-ui bg-surface-card pl-9 pr-3.5 py-2 text-xs text-primary placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <button
              id="btn-export-survey-audios-zip"
              onClick={handleExportZip}
              disabled={isExportingZip || surveyAudioSubmissions.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-accent-purple-solid px-5 py-2.5 text-xs font-bold text-on-accent shadow-lg shadow-purple-900/40 hover:bg-accent-purple-solid-hover disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
            >
              <FileArchive className="h-4 w-4" />
              <span>Exportar Lote desta Pesquisa (.ZIP)</span>
            </button>
          </div>

          {/* Audios Table */}
          <div className="rounded-xl border border-ui bg-surface-card overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs text-secondary">
                <thead className="sticky top-0 bg-surface-app border-b border-ui text-[11px] font-bold text-muted">
                  <tr>
                    <th className="px-4 py-3">Protocolo</th>
                    <th className="px-4 py-3">Pesquisador</th>
                    <th className="px-4 py-3">Data / Hora</th>
                    <th className="px-4 py-3">Duração</th>
                    <th className="px-4 py-3">Ponto de Início</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui/60">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted">
                        {surveyAudioSubmissions.length === 0
                          ? 'Nenhuma gravação de áudio encontrada para esta pesquisa.'
                          : 'Nenhuma gravação corresponde ao filtro de busca.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => {
                      const audio = sub.audioGravacao!;
                      return (
                        <tr key={sub.id} className="hover:bg-surface-raised transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-primary">
                            {sub.codigoPesquisa}
                          </td>
                          <td className="px-4 py-3 text-secondary">
                            {sub.pesquisadorNome}
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {new Date(sub.dataHora).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 font-mono text-accent-info">
                            {formatAudioDuration(audio.duracaoSegundos)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 rounded bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-secondary">
                              <Mic className="h-3 w-3 text-accent-success" />
                              {audio.iniciouNaPerguntaCodigo || 'Início'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onPlayAudio && (
                                <button
                                  onClick={() => onPlayAudio(sub)}
                                  title="Ouvir gravação"
                                  className="rounded-lg p-1.5 text-accent-primary hover:bg-accent-primary-soft transition-colors"
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadSingle(sub)}
                                title="Exportar este áudio individualmente (.wav)"
                                className="flex items-center gap-1 rounded-lg border border-ui bg-surface-raised px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-surface-hover hover:text-primary transition-colors"
                              >
                                <Download className="h-3.5 w-3.5 text-accent-purple" />
                                <span>Baixar .WAV</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-ui px-6 py-3.5 bg-surface-card">
          <span className="text-xs text-muted">
            {filteredSubmissions.length} de {surveyAudioSubmissions.length} gravações listadas
          </span>
          <button
            onClick={onClose}
            className="rounded-lg border border-ui bg-surface-raised px-4 py-2 text-xs font-bold text-primary hover:bg-surface-hover hover:text-primary transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
