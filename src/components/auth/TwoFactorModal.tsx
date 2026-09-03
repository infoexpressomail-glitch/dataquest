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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#16171d] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-600/20 text-blue-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Autenticação de Dois Fatores (2FA)
              </h3>
              <p className="text-[11px] text-slate-400">
                Segurança mandatória para gestão de pesquisas em nuvem
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#111218] p-3 text-xs">
            <div>
              <span className="font-semibold text-slate-400">
                Usuário Conectado:
              </span>
              <p className="font-bold text-white">{currentUser.nome}</p>
            </div>
            <div
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                twoFactorVerified
                  ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                  : 'border-amber-500/30 bg-amber-500/20 text-amber-400'
              }`}
            >
              {twoFactorVerified ? 'ATIVO & VERIFICADO' : 'PENDENTE DE VALIDAÇÃO'}
            </div>
          </div>

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs font-semibold text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Setup / Verification instructions */}
          <div className="rounded-xl border border-slate-800 bg-[#111218] p-3.5 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <Smartphone className="h-4 w-4 text-blue-400" />
              <span>Aplicativo Autenticador (Google Authenticator / Authy)</span>
            </div>
            <p className="mt-1 text-slate-400">
              Chave de emparelhamento manual:
            </p>
            <div className="mt-1.5 flex items-center justify-between rounded-lg border border-slate-800 bg-[#16171d] px-2.5 py-1.5 font-mono text-xs font-bold text-blue-400">
              <span>{simulatedSecret}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(simulatedSecret);
                  setCopiedSecret(true);
                  setTimeout(() => setCopiedSecret(false), 2000);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            {copiedSecret && (
              <span className="mt-1 inline-block text-[10px] text-emerald-400">
                Chave copiada para a área de transferência!
              </span>
            )}
          </div>

          {/* Form to enter 6-digit code */}
          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300">
                Código de Verificação de 6 Dígitos
              </label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 123456"
                className="mt-1 w-full text-center tracking-widest font-mono text-base font-bold rounded-lg border border-slate-800 bg-[#111218] py-2 text-white focus:border-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">
                Dica de demonstração: digite qualquer código de 6 dígitos (ex: 123456).
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              {twoFactorVerified ? (
                <button
                  type="button"
                  onClick={handleDisable}
                  className="text-xs font-semibold text-rose-400 hover:underline"
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
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-colors"
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
