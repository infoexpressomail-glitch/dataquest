import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  Calendar,
  Users,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Survey, InterviewSubmission } from '../../types';
import { exportConsolidatedSurveysToPDF } from '../../utils/exportUtils';
import { useApp } from '../../context/AppContext';

interface ConsolidatedPdfExportModalProps {
  surveys: Survey[];
  submissions: InterviewSubmission[];
  onClose: () => void;
  onSuccess?: () => void;
}

export const ConsolidatedPdfExportModal: React.FC<ConsolidatedPdfExportModalProps> = ({
  surveys,
  submissions,
  onClose,
  onSuccess,
}) => {
  const { currentUser, addAuditLog } = useApp();
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const totalInterviews = surveys.reduce((acc, survey) => {
    return acc + submissions.filter((s) => s.pesquisaId === survey.id).length;
  }, 0);

  const handleExecuteExport = () => {
    try {
      setIsExporting(true);

      // Chamar utilitário oficial de geração de PDF consolidado
      exportConsolidatedSurveysToPDF(surveys, submissions);

      // Registrar no histórico de auditoria e conformidade (Compliance)
      addAuditLog({
        categoria: 'PESQUISA',
        tipoAcao: 'ACAO_EM_LOTE',
        tituloAcao: 'Exportação Consolidada de Resultados em PDF Único',
        descricaoDetalhada: `Exportação executada para ${surveys.length} pesquisa(s) (${surveys.map((s) => s.codigo).join(', ')}) reunindo ${totalInterviews} entrevista(s) com questionários, dados de GPS e registro de áudios em um documento oficial único.`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentUser.perfilAcessoId,
          ip: '192.168.1.100',
        },
        alvo: {
          tipo: 'PESQUISA',
          id: 'export_pdf_lote',
          identificador: surveys.map((s) => s.codigo).join('; '),
          nome: `Consolidação de ${surveys.length} Pesquisas em PDF`,
        },
        alteracoes: [
          {
            campo: 'relatorio_consolidado_pdf',
            rotulo: 'Lote de Pesquisas Consolidadas',
            valorAnterior: 'Nenhum',
            valorNovo: `${surveys.length} pesquisas (${totalInterviews} entrevistas)`,
          },
        ],
        motivoConformidade: 'Geração e download de relatório consolidado em PDF para auditoria institucional e prestação de contas.',
        statusConformidade: 'conforme',
      });

      setExportComplete(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Erro na exportação consolidada:', err);
      alert('Ocorreu um erro ao gerar o relatório consolidado em PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#16171d] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Exportação Consolidada em PDF</span>
                <span className="rounded-md bg-blue-600/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                  {surveys.length} selecionadas
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Reúne os questionários, respostas completas, auditoria e metadados de múltiplas pesquisas em um único arquivo oficial.
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

        {/* Resumo e Indicadores */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold">Pesquisas</span>
              <Layers className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-1 text-xl font-bold text-white">
              {surveys.length}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              agrupadas em seções no PDF
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold">Total de Entrevistas</span>
              <Users className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-1 text-xl font-bold text-emerald-400">
              {totalInterviews}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              respostas auditadas e formatadas
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold">Formato do Relatório</span>
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-1 text-base font-bold text-slate-200">
              PDF A4 Oficial
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Com sumário e numeração
            </p>
          </div>
        </div>

        {/* Lista de Pesquisas que compõem o PDF */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span>Pesquisas que serão unificadas no relatório:</span>
            <span className="text-slate-500 font-normal text-[11px]">
              Ordem de inserção sequencial
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5">
            {surveys.map((survey, index) => {
              const subsCount = submissions.filter((s) => s.pesquisaId === survey.id).length;
              return (
                <div
                  key={survey.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#16171d] p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600/15 border border-blue-500/30 text-[10px] font-bold text-blue-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-400">{survey.codigo}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 font-medium truncate">{survey.nome}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>Ciclo {survey.cicloAtual} (v{survey.versao})</span>
                        <span>•</span>
                        <span className={survey.status === 'ativa' ? 'text-emerald-400' : 'text-slate-400'}>
                          {survey.status.toUpperCase()}
                        </span>
                        <span>•</span>
                        <span>{survey.perguntas?.length || 0} perguntas</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right pl-3">
                    <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200 border border-slate-700">
                      {subsCount} entrevista{subsCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notificação de sucesso */}
        {exportComplete && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>Relatório consolidado gerado com sucesso! O download foi iniciado automaticamente.</span>
          </div>
        )}

        {/* Footer com Botões */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            id="btn-confirm-consolidated-pdf-export"
            onClick={handleExecuteExport}
            disabled={isExporting || exportComplete}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 disabled:opacity-50 transition-all active:scale-95"
          >
            {isExporting ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processando Documento...</span>
              </>
            ) : exportComplete ? (
              <>
                <Check className="h-4 w-4 text-white" />
                <span>PDF Consolidado Baixado</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Gerar e Baixar PDF Consolidado</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
