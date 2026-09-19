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
  ShieldCheck,
  MapPin,
  Wifi,
  ArrowLeft,
} from 'lucide-react';
import './fieldMobile.css';

interface FieldLoginProps {
  onAuthenticated: (session: FieldSession) => void;
  onExit: () => void;
}

/**
 * Tela de login do APP DE CAMPO (Modo Pesquisador) — redesign mobile-first.
 *
 * O fluxo funcional é IDÊNTICO ao existente:
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
    <div className="field-login-screen">
      <div style={{ width: '100%', maxWidth: 400 }}>
        <button
          type="button"
          onClick={onExit}
          className="field-btn field-btn-ghost"
          style={{ marginBottom: '0.85rem' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="field-login-card">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div className="field-avatar" style={{ height: '3.6rem', width: '3.6rem' }} aria-hidden="true">
              DQ
            </div>
            <h1 style={{ marginTop: '0.75rem', fontSize: '1.05rem', fontWeight: 900 }}>
              Modo Pesquisador de Campo
            </h1>
            <p className="field-text-xs field-text-muted" style={{ marginTop: '0.35rem', lineHeight: 1.5 }}>
              Entre com suas credenciais e toque em <strong>Sincronizar</strong> para baixar as
              pesquisas e políticas relacionadas ao seu login.
            </p>
          </div>

          {errorMessage && (
            <div className="field-alert is-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {infoMessage && !errorMessage && (
            <div className="field-alert is-success">
              <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
              <span>{infoMessage}</span>
            </div>
          )}

          <form onSubmit={handleSync} style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '0.85rem' }}>
              <label className="field-field-label" htmlFor="field-login-user">
                Login de Acesso
              </label>
              <div className="field-input-wrap">
                <span className="field-input-icon">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="field-login-user"
                  type="text"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Ex: rodrigo.pesquisador"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  className="field-input"
                />
              </div>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <label className="field-field-label" htmlFor="field-login-pass">
                Senha
              </label>
              <div className="field-input-wrap">
                <span className="field-input-icon">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="field-login-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={senhaInput}
                  onChange={(e) => setSenhaInput(e.target.value)}
                  placeholder="Sua senha cadastrada"
                  autoComplete="current-password"
                  className="field-input"
                  style={{ paddingRight: '2.6rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="field-input-icon"
                  style={{ left: 'auto', right: '0.7rem', pointerEvents: 'auto', background: 'none', border: 'none' }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="field-btn field-btn-primary field-btn-block"
              style={{ marginTop: '0.85rem' }}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sincronizar
                </>
              )}
            </button>
          </form>

          <div
            className="field-text-xs field-text-muted"
            style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}
          >
            <span>
              <ShieldCheck className="h-3 w-3 inline text-accent-success" /> Autenticação segura
            </span>
            <span>
              <Wifi className="h-3 w-3 inline text-accent-primary" /> Sincroniza com o servidor
            </span>
            <span>
              <MapPin className="h-3 w-3 inline text-accent-info" /> Coleta com GPS e áudio
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
