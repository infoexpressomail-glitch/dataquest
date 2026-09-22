import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getTranslation } from '../../i18n';
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  RotateCcw,
  Search,
} from 'lucide-react';
import { buildNavAreas, type NavArea, type NavItem } from './navAreas';

interface AreaNavProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

/**
 * Navegação por Áreas (Opção A).
 *
 * O menu de gestão passa de até 14 itens no mesmo nível para 4 áreas que
 * seguem o ciclo da pesquisa (Planejar · Coletar · Analisar · Administrar)
 * + Início. As telas continuam sendo as mesmas — só o "casco" mudou.
 */
export const AreaNav: React.FC<AreaNavProps> = ({ isOpenMobile, onCloseMobile }) => {
  const {
    language,
    activeModule,
    setActiveModule,
    hasPermission,
    currentProfile,
    currentUser,
    resetToDefaults,
    auditLogs,
    logout,
  } = useApp();

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  const isAnalyst =
    !isResearcher &&
    (currentProfile?.id === 'prof_analista' ||
      (!hasPermission('colaboradores_acesso') &&
        !hasPermission('politicas_acesso') &&
        hasPermission('analise_acesso')));

  const areas: NavArea[] = useMemo(
    () =>
      buildNavAreas({
        hasPermission,
        t,
        isResearcher,
        isAnalyst,
        auditCount: auditLogs.length,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, isResearcher, isAnalyst, auditLogs.length, currentProfile?.id],
  );

  /** Área que contém o módulo ativo (para abrir automaticamente). */
  const activeAreaId = useMemo(() => {
    const found = areas.find((area) => area.items.some((item) => item.module === activeModule));
    return found?.id;
  }, [areas, activeModule]);

  const [openAreas, setOpenAreas] = useState<Set<string>>(() => new Set());

  // Abre a área do módulo ativo (sem fechar as demais que o usuário abriu).
  useEffect(() => {
    if (activeAreaId) {
      setOpenAreas((prev) => {
        if (prev.has(activeAreaId)) return prev;
        const next = new Set(prev);
        next.add(activeAreaId);
        return next;
      });
    }
  }, [activeAreaId]);

  const toggleArea = (area: NavArea) => {
    setOpenAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area.id)) next.delete(area.id);
      else next.add(area.id);
      return next;
    });
  };

  const handleNavigate = (module: string) => {
    setActiveModule(module);
    onCloseMobile();
  };

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent('dq:open-search'));
    onCloseMobile();
  };

  const itemClass = (active: boolean) =>
    `relative flex items-center justify-between w-full pl-3 pr-2 py-2 rounded-lg text-xs font-semibold transition-all ${
      active
        ? 'bg-accent-primary-soft text-accent-primary shadow-sm font-bold'
        : 'text-muted hover:text-primary hover:bg-surface-raised'
    }`;

  const renderItem = (item: NavItem) => {
    const active = item.module === activeModule;
    return (
      <button
        key={item.id}
        id={item.id}
        onClick={() => handleNavigate(item.module)}
        title={item.hint}
        className={itemClass(active)}
      >
        {active && (
          <span className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-accent-primary shadow-sm" />
        )}
        <span className="flex items-start gap-3 min-w-0">
          <item.icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-accent-primary' : item.iconClassName || ''}`} />
          <span className="min-w-0">
            <span className="block truncate">{item.label}</span>
            {item.hint && (
              <span
                className={`mt-0.5 block truncate text-[10px] font-medium leading-tight ${
                  active ? 'text-accent-primary/80' : 'text-muted/80'
                }`}
              >
                {item.hint}
              </span>
            )}
          </span>
        </span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="text-[10px] font-bold px-1.5 rounded-full bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const renderArea = (area: NavArea) => {
    const isOpen = openAreas.has(area.id);
    const hasActive = area.items.some((item) => item.module === activeModule);
    const single = area.items.length === 1;
    return (
      <div key={area.id} className="mt-1">
        <button
          type="button"
          id={`area-${area.id}`}
          onClick={() => (single ? handleNavigate(area.items[0].module) : toggleArea(area))}
          aria-expanded={isOpen}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
            hasActive ? 'text-accent-primary' : 'text-secondary hover:bg-surface-raised hover:text-primary'
          }`}
        >
          <area.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{area.label}</span>
          {!single && (isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)}
          {!isOpen && !single && (
            <span className="text-[10px] font-bold text-muted">{area.items.length}</span>
          )}
        </button>
        {isOpen && !single && (
          <div className="mt-0.5 space-y-0.5 border-l border-ui/70 ml-4 pl-2">
            {area.items.map(renderItem)}
          </div>
        )}
      </div>
    );
  };

  const portalLabel = isResearcher
    ? 'Portal do Pesquisador'
    : isAnalyst
    ? 'Portal do Analista'
    : 'Navegação por Áreas';

  return (
    <>
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-overlay-modal backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-ui/80 bg-surface-card pt-16 md:pt-0 transition-transform duration-200 ease-in-out shadow-2xl md:sticky md:top-16 md:bottom-auto md:h-[calc(100vh-4rem)] md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <div
            className={`px-1 pb-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
              isResearcher ? 'text-accent-success' : 'text-muted'
            }`}
          >
            {isResearcher && <span className="h-1.5 w-1.5 rounded-full bg-accent-success-solid animate-pulse" />}
            {portalLabel}
          </div>

          {/* Gatilho da busca global — reforça o atalho Ctrl K */}
          <button
            type="button"
            id="btn-sidebar-search"
            onClick={openSearch}
            className="mb-2 flex w-full items-center gap-2 rounded-lg border border-ui bg-surface-raised/60 px-3 py-2 text-xs font-medium text-muted hover:border-accent-primary hover:text-primary transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Buscar…</span>
            <span className="rounded border border-ui bg-surface px-1.5 py-0.5 text-[10px] font-bold">Ctrl K</span>
          </button>

          {areas.map(renderArea)}
        </div>

        {/* Rodapé de perfil */}
        <div className="border-t border-ui/80 p-4 space-y-3 bg-surface-app">
          <div className="flex items-center gap-3 bg-surface-raised p-3 rounded-xl border border-ui shadow-sm">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-brand-400 flex items-center justify-center text-xs font-bold text-on-accent shadow-lg shadow-brand-950/60 shrink-0">
              {currentUser.nome.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <p className="text-xs font-bold text-primary truncate">{currentUser.nome}</p>
              <p className="text-[10px] text-muted truncate">Perfil: {currentProfile?.name}</p>
            </div>
          </div>

          <button
            id="btn-sidebar-logout"
            onClick={() => {
              onCloseMobile();
              logout();
            }}
            title="Encerrar sessão de acesso"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-accent-danger bg-accent-danger-soft hover:bg-accent-danger-soft border border-accent-danger-soft-border transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 text-accent-danger" />
            <span>Sair do Sistema</span>
          </button>

          <button
            id="btn-reset-demo-data"
            onClick={() => {
              if (window.confirm('Restaurar os dados de exemplo padrão do sistema?')) {
                resetToDefaults();
              }
            }}
            title="Restaurar dados originais"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium text-muted hover:bg-surface-raised hover:text-secondary transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Restaurar Demonstração</span>
          </button>
        </div>
      </aside>
    </>
  );
};
