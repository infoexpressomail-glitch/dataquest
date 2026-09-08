import React, { useState } from 'react';
import {
  Server,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowUpCircle,
  X,
  Clock,
  Database,
  Users,
  FileQuestion,
} from 'lucide-react';
import { Survey, ServerSyncCheckResult } from '../../types';
import { useApp } from '../../context/AppContext';

interface ServerSyncCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: Survey;
  hasLocalModifications: boolean;
  onUploadSuccess: (updatedSurvey: Survey) => void;
}

export const ServerSyncCheckModal: React.FC<ServerSyncCheckModalProps> = ({
  isOpen,
  onClose,
  survey,
  hasLocalModifications,
  onUploadSuccess,
}) => {
  const {
    effectiveOnline,
    syncSurveyWithCentralServer,
    uploadSurveyChangesToCentralServer,
  } = useApp();

  const [step, setStep] = useState<'prompt' | 'syncing' | 'authorized' | 'uploading' | 'error'>(
    survey.serverSyncToken ? 'authorized' : 'prompt'
  );
  const [syncResult, setSyncResult] = useState<ServerSyncCheckResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authorizedToken, setAuthorizedToken] = useState<string | undefined>(survey.serverSyncToken);

  if (!isOpen) return null;

  const totalSubs = survey.totalEntrevistasColetadas ?? 18;

  const handleExecuteSync = async () => {
    setStep('syncing');
    setErrorMessage(null);

    try {
      const result = await syncSurveyWithCentralServer(survey.id, survey);
      setSyncResult(result);

      if (result.success && result.syncToken) {
        setAuthorizedToken(result.syncToken);
        setStep('authorized');
      } else {
        setErrorMessage(result.message || 'O servidor recusou a autorização de sincronização.');
        setStep('error');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao sincronizar com o servidor.');
      setStep('error');
    }
  };

  const handleUploadNow = async () => {
    setStep('uploading');
    setErrorMessage(null);

    try {
      const res = await uploadSurveyChangesToCentralServer(survey, authorizedToken);
      if (res.success && res.survey) {
        onUploadSuccess(res.survey);
        onClose();
      } else {
        if (res.requiresSync) {
          setErrorMessage('O servidor exigiu nova sincronização prévia. O token pode ter expirado.');
          setStep('prompt');
        } else {
          setErrorMessage(res.message || 'Erro ao subir alterações para o servidor.');
          setStep('error');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro de conexão ao subir alterações.');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-ui bg-surface-card shadow-2xl p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={step === 'syncing' || step === 'uploading'}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted hover:bg-surface-raised hover:text-primary transition disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-primary-soft border border-accent-primary-soft-border text-accent-primary">
            <Server className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-accent-warning-soft border border-accent-warning-soft-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-warning">
                Sincronização Mandatória
              </span>
              <span className="rounded bg-accent-success-soft border border-accent-success-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-success">
                Servidor Central
              </span>
            </div>
            <h3 className="mt-1 text-lg font-bold text-primary">
              Sincronização Obrigatória com o Servidor
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Esta pesquisa está <strong>em andamento</strong> e recebendo coletas ativas. Qualquer ajuste ou alteração exige sincronização prévia com o servidor antes de subir (upload).
            </p>
          </div>
        </div>

        {/* Survey Info Card */}
        <div className="rounded-xl border border-ui/80 bg-surface-raised p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ui/60 pb-2.5">
            <div>
              <span className="text-[10px] font-medium text-muted">Pesquisa em Andamento:</span>
              <div className="text-sm font-bold text-primary">{survey.nome}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted">{survey.codigo}</span>
              <span className="rounded bg-surface-raised border border-ui px-2 py-0.5 text-[11px] font-semibold text-primary">
                v{survey.versao}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-surface-raised p-2 border border-ui">
              <div className="text-[10px] text-muted font-medium flex items-center justify-center gap-1">
                <Users className="h-3 w-3 text-accent-primary" />
                Coletas Ativas
              </div>
              <div className="text-base font-bold text-primary mt-0.5">
                {totalSubs} entrevistas
              </div>
            </div>
            <div className="rounded-lg bg-surface-raised p-2 border border-ui">
              <div className="text-[10px] text-muted font-medium flex items-center justify-center gap-1">
                <FileQuestion className="h-3 w-3 text-accent-success" />
                Perguntas
              </div>
              <div className="text-base font-bold text-primary mt-0.5">
                {survey.perguntas.length} questões
              </div>
            </div>
            <div className="rounded-lg bg-surface-raised p-2 border border-ui">
              <div className="text-[10px] text-muted font-medium flex items-center justify-center gap-1">
                <Lock className="h-3 w-3 text-accent-warning" />
                Governança
              </div>
              <div className="text-[11px] font-bold text-accent-warning mt-1">
                Anti-Colisão
              </div>
            </div>
          </div>
        </div>

        {/* Offline Warning if offline */}
        {!effectiveOnline && (
          <div className="flex items-start gap-3 rounded-xl border border-accent-warning-soft-border bg-accent-warning-soft p-3.5 text-xs text-accent-warning">
            <AlertTriangle className="h-5 w-5 shrink-0 text-accent-warning" />
            <div>
              <strong>Você está no modo offline.</strong> Para pesquisas em andamento no servidor central, é obrigatório restabelecer a conexão para sincronizar antes de subir as alterações. As modificações estão preservadas no cache local IndexedDB.
            </div>
          </div>
        )}

        {/* Status / Step Content */}
        {step === 'prompt' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-ui bg-surface-raised p-4 text-xs space-y-2.5">
              <div className="font-semibold text-primary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent-primary" />
                O que a sincronização prévia com o servidor executa:
              </div>
              <ul className="space-y-1.5 text-muted pl-5 list-disc">
                <li>Consulta em tempo real a versão armazenada no servidor central.</li>
                <li>Verifica se pesquisadores submeteram novas coletas em campo enquanto a edição ocorria.</li>
                <li>Audita a consistência das perguntas, opções e regras condicionais para não corromper entrevistas existentes.</li>
                <li>Emite um <strong>Token de Autorização Criptográfico</strong> válido para upload seguro.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-muted hover:bg-surface-raised hover:text-primary transition"
              >
                Voltar à Edição
              </button>
              <button
                type="button"
                id="btn-confirm-server-sync"
                onClick={handleExecuteSync}
                disabled={!effectiveOnline}
                className="flex items-center gap-2 rounded-xl bg-accent-primary-solid hover:bg-accent-primary-solid-hover px-5 py-2.5 text-xs font-bold text-on-accent transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Sincronizar com o Servidor Agora</span>
              </button>
            </div>
          </div>
        )}

        {step === 'syncing' && (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full border-2 border-accent-primary-soft-border border-t-emerald-500 animate-spin flex items-center justify-center">
                <Server className="h-5 w-5 text-accent-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-primary">Sincronizando com o Servidor Central...</h4>
              <p className="text-xs text-muted">
                Checando concorrência de coletas e obtendo autorização de upload...
              </p>
            </div>
          </div>
        )}

        {step === 'authorized' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-accent-success-soft-border bg-accent-success-soft p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-accent-success">
                <CheckCircle2 className="h-5 w-5" />
                Sincronização com o Servidor Validada com Sucesso!
              </div>
              <p className="text-xs text-accent-success-soft-text/90 leading-relaxed">
                {syncResult?.message || 'A pesquisa foi reconciliada com o servidor central e está autorizada para receber o upload das alterações.'}
              </p>
              {authorizedToken && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-accent-success-soft border border-accent-success-soft-border px-3 py-1.5 font-mono text-[11px] text-accent-success">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Token: {authorizedToken}</span>
                </div>
              )}
            </div>

            {syncResult?.divergences && syncResult.divergences.length > 0 && (
              <div className="rounded-xl border border-accent-warning-soft-border bg-accent-warning-soft p-3.5 text-xs text-accent-warning space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-accent-warning" />
                  Avisos de Integridade Detectados:
                </div>
                {syncResult.divergences.map((div, i) => (
                  <div key={i} className="pl-5">• {div}</div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleExecuteSync}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Re-sincronizar</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-muted hover:bg-surface-raised hover:text-primary transition"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  id="btn-upload-authorized-changes"
                  onClick={handleUploadNow}
                  className="flex items-center gap-2 rounded-xl bg-accent-success-solid hover:bg-accent-success-solid-hover px-5 py-2.5 text-xs font-bold text-on-accent transition shadow-lg shadow-emerald-500/20"
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  <span>Subir Alterações para o Servidor</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'uploading' && (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full border-2 border-accent-success-soft-border border-t-emerald-500 animate-spin flex items-center justify-center">
                <ArrowUpCircle className="h-5 w-5 text-accent-success animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-primary">Subindo Alterações para o Servidor...</h4>
              <p className="text-xs text-muted">
                Persistindo nova versão e atualizando repositório central...
              </p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-accent-danger-soft-border bg-accent-danger-soft p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-accent-danger">
                <AlertTriangle className="h-5 w-5" />
                Falha na Operação com o Servidor
              </div>
              <p className="text-xs text-accent-danger-soft-text/90 leading-relaxed">
                {errorMessage || 'Não foi possível completar a operação com o servidor central.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-muted hover:bg-surface-raised hover:text-primary transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteSync}
                className="flex items-center gap-2 rounded-xl bg-accent-primary-solid hover:bg-accent-primary-solid-hover px-5 py-2.5 text-xs font-bold text-on-accent transition"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Tentar Sincronizar Novamente</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
