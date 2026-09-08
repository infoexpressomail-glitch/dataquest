import React from 'react';
import { useApp } from '../context/AppContext';
import { Collaborator, AccessProfile } from '../types';
import { FieldSection } from './fieldTypes';
import { Menu, ArrowLeft, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface FieldHeaderProps {
  section: FieldSection;
  /** Colaborador autenticado no sub-app (opcional — usa o contexto quando ausente). */
  user?: Collaborator;
  /** Perfil do colaborador autenticado (opcional). */
  profile?: AccessProfile;
  onToggleMobileSidebar: () => void;
  onExit: () => void;
}

/**
 * Cabeçalho fixo do sub-app: identidade + status de conexão/sincronização.
 */
export const FieldHeader: React.FC<FieldHeaderProps> = ({
  section,
  user,
  profile,
  onToggleMobileSidebar,
  onExit,
}) => {
  const {
    currentUser: ctxUser,
    currentProfile: ctxProfile,
    effectiveOnline,
    offlineQueue,
    pendingIndexedDbCount,
  } = useApp();

  const currentUser = user ?? ctxUser;
  const currentProfile = profile ?? ctxProfile;

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  const pendingCount = offlineQueue.length + pendingIndexedDbCount;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-ui bg-surface-header/95 backdrop-blur px-4 sm:px-6 py-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger (mobile) */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden text-muted hover:text-primary"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-600 to-emerald-500 text-on-accent font-bold text-sm shadow-md shadow-emerald-900/40 shrink-0">
            {currentUser.nome.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-primary">
              {currentUser.nome}
            </div>
            <div className="truncate text-[10px] text-muted font-mono">
              {currentUser.login} • Matr. {currentUser.cpf}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Status de conexão */}
        <span
          className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
            effectiveOnline
              ? 'bg-accent-success-soft text-accent-success border border-accent-success-soft-border'
              : 'bg-accent-warning-soft text-accent-warning border border-accent-warning-soft-border'
          }`}
        >
          {effectiveOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {effectiveOnline ? 'Online' : 'Offline'}
        </span>

        {/* Fila pendente */}
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-info-soft text-accent-info border border-accent-info-soft-border px-2.5 py-1 text-[10px] font-bold">
            <RefreshCw className="h-3 w-3" />
            {pendingCount} pendente(s)
          </span>
        )}

        {/* Voltar à gestão */}
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-accent-primary" />
          <span className="hidden sm:inline">
            {isResearcher ? 'Alternar p/ Gestão' : 'Sair'}
          </span>
        </button>
      </div>
    </header>
  );
};
