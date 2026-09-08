import React, { useState } from 'react';
import { fieldLogin, fetchFieldSurveys } from '../services/fieldApi';
import { FieldSession } from './fieldTypes';
import { toFieldSession } from './fieldSessionMapper';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Wifi,
} from 'lucide-react';

interface FieldLoginProps {
  onAuthenticated: (session: FieldSession) => void;
  onExit: () => void;
}

/**
 * Tela de login do APP DE CAMPO (Modo Pesquisador).
 *
 * Fluxo:
 *   1. Usuário digita login/senha (definidos no sistema principal).
 *   2. Botão "Sincronizar" → autentica via POST /api/auth (fieldLogin).
 *   3. Se o perfil for pesquisador, baixa as pesquisas relacionadas +
 *      políticas via GET /api/collaborators/:id/pesquisas (fetchFieldSurveys).
 *   4. Em caso de sucesso, monta a FieldSession e chama onAuthenticated.
 */
export const FieldLogin: React.FC<FieldLoginProps> = ({ onAuthenticated, onExit }) => {
  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!loginInput.trim() || !senhaInput.trim()) {
      setErrorMessage('Informe seu login e sua senha de acesso.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Autentica no servidor central
      const auth = await fieldLogin(loginInput.trim(), senhaInput);

      if (!auth.pesquisador) {
        setErrorMessage(
          'Este usuário não possui o perfil de Pesquisador de Campo. O Modo Pesquisador é exclusivo para esse perfil.'
        );
        return;
      }

      setInfoMessage('Autenticado! Sincronizando pesquisas e políticas de acesso...');

      // 2. Baixa as pesquisas relacionadas + políticas
      const surveys = await fetchFieldSurveys(auth.colaborador.id);

      // 3. Monta a sessão e segue para o ambiente de campo
      const session = toFieldSession(auth.colaborador, auth.perfil, surveys.pesquisas);
      onAuthenticated(session);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha na sincronização. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6 sm:p-4 font-sans bg-surface-app text-on-accent">
      <div className="w-full max-w-md">
        {/* Botão voltar */}
        <button
          onClick={onExit}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition"
        >
          <span className="hidden sm:inline">Voltar</span>
          <ArrowLeft className="h-3.5 w-3.5 text-accent-primary" />
          <span>Voltar</span>
        </button>

        <div className="rounded-2xl border border-accent-primary-soft-border bg-gradient-to-r from-surface via-surface-raised to-surface p-5 sm:p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-on-accent font-black text-xl shadow-lg shadow-emerald-900/50">
              <span className="sr-only">DataQuest</span>
              DQ
            </div>
            <h1 className="mt-4 text-lg font-black text-primary sm:text-xl">
              Modo Pesquisador de Campo
            </h1>
            <p className="mt-1 text-[11px] leading-relaxed text-muted sm:text-xs">
              Entre com suas credenciais e clique em <strong className="text-accent-primary">Sincronizar</strong> para baixar as pesquisas e políticas relacionadas ao seu login.
            </p>
          </div>

          {/* Feedback */}
          {errorMessage && (
            <div className="mt-5 rounded-xl border border-accent-danger-soft-border bg-accent-danger-soft p-3 text-xs text-accent-danger flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMessage}</div>
            </div>
          )}
          {infoMessage && !errorMessage && (
            <div className="mt-5 rounded-xl border border-accent-info-soft-border bg-accent-info-soft p-3 text-xs text-accent-info flex items-start gap-2.5">
              <RefreshCw className="h-4 w-4 shrink-0 mt-0.5 animate-spin" />
              <div className="font-medium">{infoMessage}</div>
            </div>
          )}

          <form onSubmit={handleSync} className="mt-5 space-y-4">
            {/* Login */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                Login de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Ex: rodrigo.pesquisador"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full rounded-xl border border-ui bg-surface-card py-2.5 pl-10 pr-4 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={senhaInput}
                  onChange={(e) => setSenhaInput(e.target.value)}
                  placeholder="Sua senha cadastrada"
                  className="w-full rounded-xl border border-ui bg-surface-card py-2.5 pl-10 pr-10 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Botão Sincronizar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-accent-primary-solid py-3 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sincronizando...
                </span>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sincronizar
                </>
              )}
            </button>
          </form>

          {/* Rodapé de segurança */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-accent-success" /> Autenticação segura
            </span>
            <span className="inline-flex items-center gap-1">
              <Wifi className="h-3 w-3 text-accent-primary" /> Sincroniza com o servidor
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-accent-info" /> Coleta com GPS e áudio
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
