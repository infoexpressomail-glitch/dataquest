import React from 'react';
import { FieldSection } from './fieldTypes';
import { useApp } from '../context/AppContext';
import {
  LayoutGrid,
  FolderOpen,
  Target,
  RefreshCw,
  LogOut,
  X,
  ChevronDown,
} from 'lucide-react';

interface FieldSidebarProps {
  section: FieldSection;
  onNavigate: (s: FieldSection) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  userName: string;
}

interface NavItem {
  section: FieldSection;
  label: string;
  icon: React.ReactNode;
}

/** Bloco de tarefas do menu de campo (agrupamento contextual). */
interface FieldNavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Menu lateral do sub-app de campo.
 * Itens: Início, Pesquisas, Metas e Sincronizar (Carregar/Descarregar).
 */
export const FieldSidebar: React.FC<FieldSidebarProps> = ({
  section,
  onNavigate,
  onLogout,
  mobileOpen,
  onCloseMobile,
  userName,
}) => {
  const { effectiveOnline } = useApp();

  const groups: FieldNavGroup[] = [
    {
      title: 'Início',
      items: [
        { section: 'home', label: 'Início', icon: <LayoutGrid className="h-4 w-4" /> },
        { section: 'pesquisas', label: 'Pesquisas', icon: <FolderOpen className="h-4 w-4" /> },
      ],
    },
    {
      title: 'Desempenho',
      items: [
        { section: 'metas', label: 'Metas', icon: <Target className="h-4 w-4" /> },
      ],
    },
    {
      title: 'Sincronização',
      items: [
        { section: 'sync', label: 'Sincronizar', icon: <RefreshCw className="h-4 w-4" /> },
      ],
    },
  ];

  // Mesma estrutura de alinhamento do sidebar principal: títulos de seção com
  // padding esquerdo igual ao dos itens, e itens com pl-3/pr-2 para a coluna
  // de texto ficar alinhada verticalmente.
  const navItemClass = (isActive: boolean) =>
    `flex w-full items-center gap-2.5 pl-3 pr-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
      isActive
        ? 'bg-accent-primary-soft text-accent-primary font-bold'
        : 'text-secondary hover:bg-surface-raised hover:text-primary'
    }`;

  const renderLeaf = (it: NavItem) => (
    <button
      key={it.section}
      onClick={() => onNavigate(it.section)}
      className={navItemClass(section === it.section)}
    >
      {it.icon}
      <span>{it.label}</span>
    </button>
  );

  const renderGroup = (group: FieldNavGroup, index: number) => (
    <div key={group.title} className={index === 0 ? '' : 'mt-3'}>
      <div className="flex items-center gap-2 px-1 pb-1">
        <span className="flex flex-1 items-center gap-2 rounded px-2 py-1 text-[10px] font-bold text-muted uppercase tracking-widest">
          {group.title}
          <ChevronDown className="h-3 w-3" />
        </span>
      </div>
      <div className="space-y-0.5">
        {group.items.map(renderLeaf)}
      </div>
    </div>
  );

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-overlay-modal backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-ui bg-surface px-3 py-5 transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Topo */}
        <div className="px-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-black text-primary">DataQuest</div>
                <div className="text-[10px] text-muted">Modo Pesquisador</div>
              </div>
            </div>
            <button onClick={onCloseMobile} className="rounded-lg p-1.5 text-muted hover:bg-surface-raised lg:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Usuário */}
          <div className="mt-4 rounded-xl border border-ui bg-surface-card p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary-soft text-accent-primary text-xs font-black">
                {userName.split(' ')[0]?.[0] || 'P'}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-primary">{userName}</div>
                <div className="text-[10px] text-muted">
                  {effectiveOnline ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navegação agrupada e alinhada */}
        <nav className="mt-2 overflow-y-auto">
          {groups.map((g, i) => renderGroup(g, i))}
        </nav>

        {/* Rodapé */}
        <div className="absolute bottom-3 left-3 right-3">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-lg pl-3 pr-2 py-2 text-xs font-semibold text-muted hover:bg-surface-raised hover:text-primary transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};
