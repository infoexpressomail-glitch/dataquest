import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import {
  LayoutDashboard,
  FileQuestion,
  MessageSquare,
  BarChart3,
  Target,
  FileSpreadsheet,
  FolderCog,
  ShieldCheck,
  Users,
  ChevronDown,
  ChevronRight,
  Smartphone,
  Sparkles,
  RotateCcw,
  History,
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpenMobile, onCloseMobile }) => {
  const {
    language,
    activeModule,
    setActiveModule,
    hasPermission,
    currentProfile,
    currentUser,
    resetToDefaults,
    auditLogs,
  } = useApp();

  const [cadastrosOpen, setCadastrosOpen] = useState(true);

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const navItemClass = (isActive: boolean) =>
    `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
      isActive
        ? 'bg-blue-600/15 text-blue-400 border border-blue-600/25 shadow-xs font-bold'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
    }`;

  const subNavItemClass = (isActive: boolean) =>
    `flex items-center gap-2.5 w-full pl-6 pr-3 py-2 rounded-lg text-xs font-medium transition-colors ${
      isActive
        ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 font-semibold'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
    }`;

  const handleNavigate = (module: string) => {
    setActiveModule(module);
    onCloseMobile();
  };

  const showCadastros =
    hasPermission('politicas_acesso') || hasPermission('colaboradores_acesso');

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800/80 bg-[#111218] pt-16 md:pt-0 transition-transform duration-200 ease-in-out shadow-2xl md:static md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
          {isResearcher ? (
            /* Dedicated Researcher Environment Navigation */
            <>
              <div className="pt-2 pb-2 px-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Portal do Pesquisador
              </div>

              <button
                id="menu-item-pesquisador-home"
                onClick={() => handleNavigate('pesquisador')}
                className={navItemClass(activeModule === 'pesquisador' || activeModule === 'home')}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Ambiente do Pesquisador</span>
              </button>

              <button
                id="menu-item-pesquisador-pesquisas"
                onClick={() => handleNavigate('pesquisas')}
                className={navItemClass(activeModule === 'pesquisas')}
              >
                <FileQuestion className="h-4 w-4 shrink-0" />
                <span>Pesquisas Liberadas</span>
              </button>

              <button
                id="menu-item-pesquisador-coleta"
                onClick={() => handleNavigate('simulador')}
                className={navItemClass(activeModule === 'simulador')}
              >
                <Smartphone className="h-4 w-4 shrink-0 text-blue-400" />
                <span>Formulário de Coleta</span>
              </button>

              <button
                id="menu-item-pesquisador-metas"
                onClick={() => handleNavigate('metas')}
                className={navItemClass(activeModule === 'metas')}
              >
                <Target className="h-4 w-4 shrink-0" />
                <span>Minhas Metas & Cotas</span>
              </button>

              <button
                id="menu-item-pesquisador-auditoria"
                onClick={() => handleNavigate('historico_acoes')}
                className={navItemClass(activeModule === 'historico_acoes')}
              >
                <History className="h-4 w-4 shrink-0 text-blue-400" />
                <span>Trilha de Conformidade</span>
              </button>
            </>
          ) : (
            /* General / Administrator Navigation */
            <>
              <div className="pt-2 pb-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Navegação Principal
              </div>

              {/* Módulo Home */}
              {hasPermission('home_acesso') && (
                <button
                  id="menu-item-home"
                  onClick={() => handleNavigate('home')}
                  className={navItemClass(activeModule === 'home')}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  <span>{t('home')}</span>
                </button>
              )}

          {/* Módulo de Pesquisa */}
          {hasPermission('pesquisa_acesso') && (
            <button
              id="menu-item-pesquisas"
              onClick={() => handleNavigate('pesquisas')}
              className={navItemClass(activeModule === 'pesquisas' || activeModule === 'wizard')}
            >
              <FileQuestion className="h-4 w-4 shrink-0" />
              <span>{t('surveys')}</span>
            </button>
          )}

          {/* Módulo de Visualização de Respostas */}
          {hasPermission('respostas_acesso') && (
            <button
              id="menu-item-respostas"
              onClick={() => handleNavigate('respostas')}
              className={navItemClass(activeModule === 'respostas')}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span>{t('responses')}</span>
            </button>
          )}

          {/* Módulo de Análise de Resultados */}
          {hasPermission('analise_acesso') && (
            <button
              id="menu-item-analise"
              onClick={() => handleNavigate('analise')}
              className={navItemClass(activeModule === 'analise')}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span>{t('analytics')}</span>
            </button>
          )}

          {/* Módulo de Meta */}
          {hasPermission('meta_acesso') && (
            <button
              id="menu-item-metas"
              onClick={() => handleNavigate('metas')}
              className={navItemClass(activeModule === 'metas')}
            >
              <Target className="h-4 w-4 shrink-0" />
              <span>{t('metas')}</span>
            </button>
          )}

          {/* Módulo de Importação Externa */}
          {hasPermission('importacao_acesso') && (
            <button
              id="menu-item-importacao"
              onClick={() => handleNavigate('importacao')}
              className={navItemClass(activeModule === 'importacao')}
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span>{t('imports')}</span>
            </button>
          )}

          {/* Módulo de Histórico de Ações / Auditoria e Conformidade */}
          <button
            id="menu-item-historico-acoes"
            onClick={() => handleNavigate('historico_acoes')}
            className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeModule === 'historico_acoes'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-600/25 shadow-xs font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <History className="h-4 w-4 shrink-0 text-blue-400" />
              <span>Histórico de Ações</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {auditLogs.length}
            </span>
          </button>

          {/* Menu Cadastros com os dois submenus: Políticas de Acesso e Cadastro de Colaboradores */}
          {showCadastros && (
            <div className="pt-3">
              <div className="px-2 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Gestão & Acesso
              </div>
              <button
                id="menu-item-cadastros-dropdown"
                onClick={() => setCadastrosOpen(!cadastrosOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FolderCog className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{t('registrations')}</span>
                </div>
                {cadastrosOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>

              {cadastrosOpen && (
                <div className="mt-1 space-y-1 pl-2 border-l border-slate-800/80 ml-4">
                  {hasPermission('politicas_acesso') && (
                    <button
                      id="menu-submenu-politicas-acesso"
                      onClick={() => handleNavigate('politicas_acesso')}
                      className={subNavItemClass(activeModule === 'politicas_acesso')}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                      <span>{t('accessPolicies')}</span>
                    </button>
                  )}

                  {hasPermission('colaboradores_acesso') && (
                    <button
                      id="menu-submenu-cadastro-colaboradores"
                      onClick={() => handleNavigate('colaboradores')}
                      className={subNavItemClass(activeModule === 'colaboradores')}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                      <span>{t('collaborators')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick simulator & researcher shortcuts */}
          <div className="pt-4 mt-4 border-t border-slate-800/80 space-y-1">
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Coleta em Campo
            </div>
            <button
              id="menu-item-pesquisador-view"
              onClick={() => handleNavigate('pesquisador')}
              className={navItemClass(activeModule === 'pesquisador')}
            >
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Ambiente Pesquisador</span>
            </button>
            <button
              id="menu-item-simulator"
              onClick={() => handleNavigate('simulador')}
              className={navItemClass(activeModule === 'simulador')}
            >
              <Smartphone className="h-4 w-4 shrink-0 text-blue-400" />
              <span>Simulador de Campo</span>
            </button>
          </div>
        </>
      )}
    </div>

        {/* Profile info footer (Immersive UI style) */}
        <div className="border-t border-slate-800/80 p-4 space-y-3 bg-[#0d0e14]">
          <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-950/60 shrink-0">
              {currentUser.nome.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{currentUser.nome}</p>
              <p className="text-[10px] text-slate-400 truncate">Perfil: {currentProfile?.name}</p>
            </div>
          </div>

          <button
            id="btn-reset-demo-data"
            onClick={() => {
              if (window.confirm('Restaurar os dados de exemplo padrão do sistema?')) {
                resetToDefaults();
              }
            }}
            title="Restaurar dados originais"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Restaurar Demonstração</span>
          </button>
        </div>
      </aside>
    </>
  );
};
