import React from 'react';
import { ClipboardList, LogOut, RefreshCw } from 'lucide-react';

interface FieldBottomNavProps {
  /** Aba atualmente ativa dentro do Modo Pesquisador. */
  active: 'pesquisas' | 'coleta';
  /** Quantidade de itens pendentes de sincronização (badge). */
  pendingCount: number;
  /** Volta para a lista de pesquisas ativas. */
  onGoPesquisas: () => void;
  /** Abre o painel de sincronização (Carregar / Descarregar). */
  onSync: () => void;
  /** Encerra a sessão de campo e volta ao login. */
  onLogout: () => void;
}

/**
 * Navegação inferior do Modo Pesquisador (somente mobile).
 *
 * Mantém o fluxo direto definido para o app de campo:
 *   login → pesquisas ativas → coleta
 *
 * A aba "Pesquisas" leva de volta à lista de pesquisas ativas e a ação
 * "Sincronizar" abre o mesmo painel de Carregar/Descarregar do cabeçalho,
 * preservando toda a lógica de sincronização já existente. É exibida apenas
 * em telas pequenas (`md:hidden`) — no desktop o cabeçalho continua
 * concentrando essas ações.
 */
export const FieldBottomNav: React.FC<FieldBottomNavProps> = ({
  active,
  pendingCount,
  onGoPesquisas,
  onSync,
  onLogout,
}) => {
  const itemClass = (isActive: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold transition-colors ${
      isActive
        ? 'bg-accent-primary-soft text-accent-primary'
        : 'text-muted hover:bg-surface-raised hover:text-primary'
    }`;

  return (
    <nav
      aria-label="Navegação do Modo Pesquisador"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-ui bg-surface-app/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-3xl items-stretch justify-around gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={onGoPesquisas}
          aria-current={active === 'pesquisas' ? 'page' : undefined}
          className={itemClass(active === 'pesquisas')}
        >
          <ClipboardList className="h-5 w-5" />
          <span>Pesquisas</span>
        </button>

        <button
          type="button"
          onClick={onSync}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold text-on-accent bg-accent-primary-solid shadow-lg shadow-brand-900/30 transition-colors hover:bg-accent-primary-solid-hover active:scale-[0.98]"
        >
          <RefreshCw className="h-5 w-5" />
          <span>Sincronizar</span>
          {pendingCount > 0 && (
            <span className="absolute right-2 top-1 rounded-full bg-accent-warning-solid px-1.5 text-[9px] font-black text-on-warning">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onLogout}
          className={itemClass(false)}
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
};
