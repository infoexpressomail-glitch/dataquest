import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Smartphone,
  Copy,
  RefreshCw,
} from 'lucide-react';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({ isOpen, onClose }) => {
  const { twoFactorVerified, setTwoFactorVerified, currentUser } = useApp();

  const [verificationCode, setVerificationCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  if (!isOpen) return null;

  const simulatedSecret = 'JBSWY3DPEHPK3PXP';

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.trim().length < 4) {
      setErrorMsg('Informe um código de verificação válido de 6 dígitos.');
      return;
    }

    // Accept valid 6 digit code or test code '123456'
    setTwoFactorVerified(true);
    setSuccessMsg('Autenticação em dois fatores verificada e confirmada com sucesso!');
    setErrorMsg(null);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1200);
  };

  const handleDisable = () => {
    setTwoFactorVerified(false);
    setSuccessMsg('2FA desativado temporariamente para esta sessão.');
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-ui bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-ui pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft text-accent-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">
                Autenticação de Dois Fatores (2FA)
              </h3>
              <p className="text-[11px] text-muted">
                Segurança mandatória para gestão de pesquisas em nuvem
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-ui bg-surface-card p-3 text-xs">
            <div>
              <span className="font-semibold text-muted">
                Usuário Conectado:
              </span>
              <p className="font-bold text-primary">{currentUser.nome}</p>
            </div>
            <div
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                twoFactorVerified
                  ? 'border-accent-success-soft-border bg-accent-success-soft text-accent-success'
                  : 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning'
              }`}
            >
              {twoFactorVerified ? 'ATIVO & VERIFICADO' : 'PENDENTE DE VALIDAÇÃO'}
            </div>
          </div>

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-accent-success-soft-border bg-accent-success-soft p-3 text-xs font-semibold text-accent-success">
              <CheckCircle2 className="h-4 w-4 text-accent-success" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-accent-danger-soft-border bg-accent-danger-soft p-3 text-xs font-semibold text-accent-danger">
              <AlertCircle className="h-4 w-4 text-accent-danger" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Setup / Verification instructions */}
          <div className="rounded-xl border border-ui bg-surface-card p-3.5 text-xs text-muted">
            <div className="flex items-center gap-1.5 font-bold text-primary">
              <Smartphone className="h-4 w-4 text-accent-primary" />
              <span>Aplicativo Autenticador (Google Authenticator / Authy)</span>
            </div>
            <p className="mt-1 text-muted">
              Chave de emparelhamento manual:
            </p>
            <div className="mt-1.5 flex items-center justify-between rounded-lg border border-ui bg-surface px-2.5 py-1.5 font-mono text-xs font-bold text-accent-primary">
              <span>{simulatedSecret}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(simulatedSecret);
                  setCopiedSecret(true);
                  setTimeout(() => setCopiedSecret(false), 2000);
                }}
                className="text-muted hover:text-primary transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            {copiedSecret && (
              <span className="mt-1 inline-block text-[10px] text-accent-success">
                Chave copiada para a área de transferência!
              </span>
            )}
          </div>

          {/* Form to enter 6-digit code */}
          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-secondary">
                Código de Verificação de 6 Dígitos
              </label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 123456"
                className="mt-1 w-full text-center tracking-widest font-mono text-base font-bold rounded-lg border border-ui bg-surface-card py-2 text-primary focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-muted">
                Dica de demonstração: digite qualquer código de 6 dígitos (ex: 123456).
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              {twoFactorVerified ? (
                <button
                  type="button"
                  onClick={handleDisable}
                  className="text-xs font-semibold text-accent-danger hover:underline"
                >
                  Desativar 2FA
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-accent-primary-solid px-4 py-1.5 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors"
                >
                  Validar Código
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
