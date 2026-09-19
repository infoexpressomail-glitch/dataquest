import React from 'react';
import { RefreshCw, Wifi, WifiOff, LogOut } from 'lucide-react';
import { Collaborator, AccessProfile } from '../types';

interface FieldHeaderProps {
  /** Colaborador autenticado no sub-app. */
  user: Collaborator;
  /** Perfil do colaborador autenticado. */
  profile?: AccessProfile;
  /** Estado efetivo de conexão (Online/Offline). */
  online: boolean;
  /** Quantidade de itens pendentes de sincronização. */
  pendingCount: number;
  /** Abre o painel de sincronização. */
  onSync: () => void;
  /** Sair do Modo Pesquisador (volta ao login de campo). */
  onLogout: () => void;
  /** Indica que a sincronização está em andamento (spinner). */
  syncing?: boolean;
}

/**
 * Cabeçalho fixo do app de campo: identidade DataQuest + pesquisador,
 * status Online/Offline, pendências de sincronização, ação de sincronizar e
 * sair/trocar pesquisador. Mantém todas as ações existentes do fluxo de campo.
 */
export const FieldHeader: React.FC<FieldHeaderProps> = ({
  user,
  profile,
  online,
  pendingCount,
  onSync,
  onLogout,
  syncing = false,
}) => {
  return (
    <header className="field-header">
      <div className="field-header-row">
        <div className="field-header-brand">
          <div className="field-header-logo" aria-hidden="true">
            DQ
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="field-header-title">DataQuest Campo</div>
            <div className="field-header-subtitle">
              {user?.nome}
              {profile?.name ? ` • ${profile.name}` : ''}
            </div>
          </div>
        </div>

        <div className="field-header-actions">
          <button
            type="button"
            onClick={onSync}
            className="field-icon-btn"
            aria-label={pendingCount > 0 ? `Sincronizar — ${pendingCount} pendente(s)` : 'Sincronizar'}
            title="Sincronizar pesquisas e enviar coletas"
          >
            <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
            {pendingCount > 0 && (
              <span className="field-header-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>
            )}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="field-icon-btn"
            aria-label="Sair / trocar pesquisador"
            title="Sair / trocar pesquisador"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="field-status-strip">
        <span className={`field-status-pill ${online ? 'is-online' : 'is-offline'}`}>
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {online ? 'Online' : 'Offline'}
        </span>

        <span className="field-status-sync">
          {syncing
            ? '⟳ Sincronizando...'
            : pendingCount > 0
              ? `☁ ${pendingCount} pendente(s)`
              : '✓ Tudo sincronizado'}
        </span>
      </div>
    </header>
  );
};
