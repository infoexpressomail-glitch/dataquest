import React from 'react';
import { useApp } from '../context/AppContext';
import { Collaborator, AccessProfile } from '../types';
import { FieldSection } from './fieldTypes';
import {
  LayoutDashboard,
  ClipboardList,
  Target,
  History,
  RefreshCw,
  ArrowLeft,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface FieldSidebarProps {
  section: FieldSection;
  /** Colaborador autenticado no sub-app (opcional — usa o contexto quando ausente). */
  user?: Collaborator;
  /** Perfil do colaborador autenticado (opcional). */
  profile?: AccessProfile;
  onNavigate: (s: FieldSection) => void;
  onExit: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: FieldSection; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'coleta', label: 'Coleta', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'metas', label: 'Minhas Metas & Cotas', icon: <Target className="h-4 w-4" /> },
  { id: 'historico', label: 'Histórico', icon: <History className="h-4 w-4" /> },
  { id: 'sync', label: 'Sincronização', icon: <RefreshCw className="h-4 w-4" /> },
];

/**
 * Sidebar do sub-app — visual escuro/esmeralda, consistente com os tokens
 * semânticos do tema (NENHUM azul hardcoded).
 */
export const FieldSidebar: React.FC<FieldSidebarProps> = ({
  section,
  user,
  profile,
  onNavigate,
  onExit,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentUser: ctxUser, currentProfile: ctxProfile, effectiveOnline } = useApp();

  const currentUser = user ?? ctxUser;
  const currentProfile = profile ?? ctxProfile;

  const canBackToGestao =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  const content = (
    <div className="flex h-full flex-col bg-surface-card border-r border-ui">
      {/* Marca do sub-app */}
      <div className="flex items-center justify-between gap-3 border-b border-ui px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-on-accent font-black text-lg shadow-lg shadow-emerald-900/50 shrink-0">
            DQ
          </div>
          <div>
            <div className="text-sm font-black text-primary leading-tight">Modo Pesquisador</div>
            <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">
              DataQuest • Campo
            </div>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="md:hidden text-muted hover:text-primary"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Identidade resumida */}
      <div className="mx-4 mt-4 rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary-solid text-on-accent font-bold text-sm shrink-0">
            {currentUser.nome.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-primary">{currentUser.nome}</div>
            <div className="truncate text-[10px] text-muted font-mono">Matr. {currentUser.cpf}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold">
          {effectiveOnline ? (
            <span className="inline-flex items-center gap-1 text-accent-success">
              <Wifi className="h-3 w-3" />
              Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-accent-warning">
              <WifiOff className="h-3 w-3" />
              Modo Offline
            </span>
          )}
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                active
                  ? 'bg-accent-primary-solid text-on-accent shadow-md shadow-emerald-900/30 font-bold'
                  : 'text-muted hover:bg-surface-raised hover:text-primary'
              }`}
            >
              <span className={active ? 'text-on-accent' : 'text-accent-primary'}>{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}

      </nav>

      {/* Rodapé: voltar ao ambiente de gestão */}
      <div className="border-t border-ui p-3">
        <button
          onClick={onExit}
          className="w-full inline-flex items-center gap-2 rounded-xl border border-ui bg-surface-raised px-3 py-2.5 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition"
        >
          <ArrowLeft className="h-4 w-4 text-accent-primary" />
          <span>{canBackToGestao ? 'Alternar p/ Gestão' : 'Sair do Modo'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:block fixed inset-y-0 left-0 z-30 w-64">
        {content}
      </aside>

      {/* Mobile overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onCloseMobile}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
