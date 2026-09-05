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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#16171d] shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-[#111218]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <FileArchive className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Central de Exportação de Gravações de Áudio
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <ShieldCheck className="h-3 w-3" />
                  Isolamento por Pesquisa
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Exporte gravações de campo individualmente ou em lote (.ZIP), com separação estrita por pesquisa.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
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
                className="block text-xs font-bold text-slate-300"
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
                className="w-full rounded-lg border border-slate-800 bg-[#111218] px-3.5 py-2.5 text-xs font-medium text-white shadow-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-blue-300/90 leading-relaxed">
                <strong className="text-blue-200">Garantia Anti-Mistura:</strong> As exportações
                filtram rigorosamente apenas os registros da pesquisa ativa.
              </div>
            </div>
          </div>

          {/* Survey Audio Settings Summary */}
          {selectedSurvey && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-800 bg-[#111218] p-3">
                <div className="text-[11px] text-slate-400">Total de Áudios</div>
                <div className="mt-1 text-lg font-bold text-white flex items-center gap-1.5">
                  <Volume2 className="h-4 w-4 text-purple-400" />
                  {stats.totalCount}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#111218] p-3">
                <div className="text-[11px] text-slate-400">Duração Somada</div>
                <div className="mt-1 text-lg font-bold text-white flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  {formatAudioDuration(stats.totalSeconds)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#111218] p-3">
                <div className="text-[11px] text-slate-400">Limite da Pesquisa</div>
                <div className="mt-1 text-sm font-bold text-white flex items-center gap-1.5">
                  <Mic className="h-4 w-4 text-emerald-400" />
                  {selectedSurvey.tempoLimiteGravacaoMinutos || 2} minutos
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#111218] p-3">
                <div className="text-[11px] text-slate-400">Início da Gravação</div>
                <div className="mt-1 text-xs font-bold text-slate-300 truncate" title={initialQuestionText}>
                  {selectedSurvey.gravarAudioAPartirPerguntaId ? 'Pergunta Específica' : 'Pergunta 1 (Início)'}
                </div>
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {successMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Export Zip Progress */}
          {isExportingZip && (
            <div className="space-y-2 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
              <div className="flex justify-between text-xs text-purple-300 font-bold">
                <span>{zipStatusText}</span>
                <span>{zipProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${zipProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Bar: Search & Batch Export Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por protocolo ou pesquisador..."
                className="w-full rounded-lg border border-slate-800 bg-[#111218] pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <button
              id="btn-export-survey-audios-zip"
              onClick={handleExportZip}
              disabled={isExportingZip || surveyAudioSubmissions.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-900/40 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
            >
              <FileArchive className="h-4 w-4" />
              <span>Exportar Lote desta Pesquisa (.ZIP)</span>
            </button>
          </div>

          {/* Audios Table */}
          <div className="rounded-xl border border-slate-800 bg-[#111218] overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="sticky top-0 bg-[#0d0e14] border-b border-slate-800 text-[11px] font-bold text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Protocolo</th>
                    <th className="px-4 py-3">Pesquisador</th>
                    <th className="px-4 py-3">Data / Hora</th>
                    <th className="px-4 py-3">Duração</th>
                    <th className="px-4 py-3">Ponto de Início</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        {surveyAudioSubmissions.length === 0
                          ? 'Nenhuma gravação de áudio encontrada para esta pesquisa.'
                          : 'Nenhuma gravação corresponde ao filtro de busca.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => {
                      const audio = sub.audioGravacao!;
                      return (
                        <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-white">
                            {sub.codigoPesquisa}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {sub.pesquisadorNome}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {new Date(sub.dataHora).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 font-mono text-cyan-400">
                            {formatAudioDuration(audio.duracaoSegundos)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                              <Mic className="h-3 w-3 text-emerald-400" />
                              {audio.iniciouNaPerguntaCodigo || 'Início'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onPlayAudio && (
                                <button
                                  onClick={() => onPlayAudio(sub)}
                                  title="Ouvir gravação"
                                  className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-600/20 transition-colors"
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadSingle(sub)}
                                title="Exportar este áudio individualmente (.wav)"
                                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                              >
                                <Download className="h-3.5 w-3.5 text-purple-400" />
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
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3.5 bg-[#111218]">
          <span className="text-xs text-slate-400">
            {filteredSubmissions.length} de {surveyAudioSubmissions.length} gravações listadas
          </span>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
