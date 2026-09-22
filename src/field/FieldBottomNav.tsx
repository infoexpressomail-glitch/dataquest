import React from 'react';
import { Home, ClipboardList, User } from 'lucide-react';

/**
 * Abas da navegação inferior do Modo Pesquisador.
 *
 * 'sync' continua existindo como DESTINO contextual (aberto pela faixa de
 * sincronização da tela de missão e pelo cabeçalho), mas deixou de ser uma
 * aba fixa: o modo missão usa 3 abas em vez de 4.
 */
export type FieldTab = 'home' | 'pesquisas' | 'sync' | 'perfil';

interface FieldBottomNavProps {
  /** Aba atualmente ativa. */
  active: FieldTab;
  /** Quantidade de itens pendentes de sincronização (badge). */
  pendingCount: number;
  /** Seleciona uma aba existente. */
  onSelect: (tab: FieldTab) => void;
}

interface TabItem {
  id: FieldTab;
  label: string;
  icon: React.ReactNode;
}

/**
 * Navegação inferior do Modo Pesquisador (mobile-first).
 *
 * As abas apontam para funcionalidades que JÁ existem no sub-app de campo:
 *   Hoje     → modo missão (meta do dia, cotas faltantes, nova entrevista)
 *   Coletas  → lista de pesquisas ativas liberadas (abre a coleta)
 *   Perfil   → dados do pesquisador, status e sair/trocar pesquisador
 *
 * A sincronização virou um aviso discreto dentro da tela "Hoje".
 */
export const FieldBottomNav: React.FC<FieldBottomNavProps> = ({
  active,
  pendingCount,
  onSelect,
}) => {
  const items: TabItem[] = [
    { id: 'home', label: 'Hoje', icon: <Home className="h-5 w-5" /> },
    { id: 'pesquisas', label: 'Coletas', icon: <ClipboardList className="h-5 w-5" /> },
    { id: 'perfil', label: 'Perfil', icon: <User className="h-5 w-5" /> },
  ];

  return (
    <nav className="field-bottom-nav" aria-label="Navegação do Modo Pesquisador">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          aria-current={active === item.id ? 'page' : undefined}
          className={`field-tab ${active === item.id ? 'is-active' : ''}`}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.id === 'home' && pendingCount > 0 && (
            <span className="field-tab-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>
          )}
        </button>
      ))}
    </nav>
  );
};
