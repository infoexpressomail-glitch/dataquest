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
  ShieldCheck,
  Users,
  Calculator,
  ChevronDown,
  ChevronRight,
  Smartphone,
  Sparkles,
  RotateCcw,
  History,
  LogOut,
  Download,
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

/** Item de navegação de uma seção do Sidebar. */
interface NavLeaf {
  id: string;
  module: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  badge?: number;
}

/** Bloco de tarefas do Sidebar (agrupamento contextual, não um módulo novo). */
interface NavSection {
  title: string;
  items: NavLeaf[];
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
    logout,
  } = useApp();

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const navItemClass = (isActive: boolean) =>
    `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
      isActive
        ? 'bg-blue-600/15 text-blue-400 border border-blue-600/25 shadow-xs font-bold'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
    }`;

  const handleNavigate = (module: string) => {
    setActiveModule(module);
    onCloseMobile();
  };

  const toggleSection = (title: string) =>
    setCollapsedSections((prev) => ({ ...prev, [title]: !prev[title] }));

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  // Analista: perfil orientado a dados (pesquisas, respostas, análise e exportações),
  // sem administração de colaboradores/políticas. Identificado pelas permissões reais,
  // não por um novo campo — preserva o RBAC existente.
  const isAnalyst =
    !isResearcher &&
    (currentProfile?.id === 'prof_analista' ||
      (!hasPermission('colaboradores_acesso') &&
        !hasPermission('politicas_acesso') &&
        hasPermission('analise_acesso')));

  const isActiveIn = (modules: string[]) => modules.includes(activeModule);

  /** Renderiza um item simples de navegação. */
  const renderLeaf = (leaf: NavLeaf, active: boolean) => (
    <button
      key={leaf.id}
      id={leaf.id}
      onClick={() => handleNavigate(leaf.module)}
      className={
        leaf.badge !== undefined
          ? `flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              active
                ? 'bg-blue-600/15 text-blue-400 border border-blue-600/25 shadow-xs font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`
          : navItemClass(active)
      }
    >
      <div className="flex items-center gap-3">
        <leaf.icon className={`h-4 w-4 shrink-0 ${leaf.iconClassName || ''}`} />
        <span>{leaf.label}</span>
      </div>
      {leaf.badge !== undefined && (
        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
          {leaf.badge}
        </span>
      )}
    </button>
  );

  /** Renderiza um bloco de tarefas com título de seção, recolhível. */
  const renderSection = (section: NavSection, index: number) => {
    if (section.items.length === 0) return null;
    const isCollapsed = collapsedSections[section.title];

    return (
      <div key={section.title} className={index === 0 ? '' : 'pt-3'}>
        <button
          type="button"
          onClick={() => toggleSection(section.title)}
          className="flex w-full items-center justify-between px-2 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
        >
          <span>{section.title}</span>
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
        {!isCollapsed && (
          <div className="space-y-1">
            {section.items.map((leaf) => renderLeaf(leaf, isActiveIn([leaf.module])))}
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------
  // PORTAL DO PESQUISADOR — ambiente próprio, focado em coleta e metas.
  // ---------------------------------------------------------------------
  const researcherSections: NavSection[] = [
    {
      title: 'Início',
      items: [
        {
          id: 'menu-item-pesquisador-home',
          module: 'pesquisador',
          label: 'Ambiente do Pesquisador',
          icon: Sparkles,
          iconClassName: 'text-emerald-400',
        },
      ],
    },
    {
      title: 'Coleta',
      items: [
        {
          id: 'menu-item-pesquisador-pesquisas',
          module: 'pesquisas',
          label: 'Minhas Pesquisas',
          icon: FileQuestion,
        },
        {
          id: 'menu-item-pesquisador-coleta',
          module: 'simulador',
          label: 'Formulário de Coleta',
          icon: Smartphone,
          iconClassName: 'text-blue-400',
        },
      ],
    },
    {
      title: 'Desempenho',
      items: [
        {
          id: 'menu-item-pesquisador-metas',
          module: 'metas',
          label: 'Minhas Metas & Cotas',
          icon: Target,
        },
        {
          id: 'menu-item-pesquisador-dimensionamento',
          module: 'dimensionamento',
          label: t('teamSizing'),
          icon: Calculator,
          iconClassName: 'text-blue-400',
        },
      ],
    },
    {
      title: 'Conformidade',
      items: [
        {
          id: 'menu-item-pesquisador-auditoria',
          module: 'historico_acoes',
          label: 'Trilha de Conformidade',
          icon: History,
          iconClassName: 'text-blue-400',
        },
      ],
    },
  ];

  // ---------------------------------------------------------------------
  // ANALISTA — interface orientada a dados: pesquisas, respostas, análise
  // e exportações. Sem menus administrativos.
  // ---------------------------------------------------------------------
  const analystSections: NavSection[] = [
    {
      title: 'Visão Geral',
      items: hasPermission('home_acesso')
        ? [
            {
              id: 'menu-item-home',
              module: 'home',
              label: t('home'),
              icon: LayoutDashboard,
            },
          ]
        : [],
    },
    {
      title: 'Dados',
      items: [
        ...(hasPermission('pesquisa_acesso')
          ? [
              {
                id: 'menu-item-pesquisas',
                module: 'pesquisas',
                label: t('surveys'),
                icon: FileQuestion,
              },
            ]
          : []),
        ...(hasPermission('respostas_acesso')
          ? [
              {
                id: 'menu-item-respostas',
                module: 'respostas',
                label: t('responses'),
                icon: MessageSquare,
              },
            ]
          : []),
      ],
    },
    {
      title: 'Análise',
      items: hasPermission('analise_acesso')
        ? [
            {
              id: 'menu-item-analise',
              module: 'analise',
              label: t('analytics'),
              icon: BarChart3,
            },
          ]
        : [],
    },
    {
      title: 'Exportação',
      items: hasPermission('pesquisa_exportar_resultados')
        ? [
            {
              id: 'menu-item-analise-exportacao',
              module: 'analise',
              label: 'Exportações (CSV / PDF)',
              icon: Download,
            },
          ]
        : [],
    },
  ];

  // ---------------------------------------------------------------------
  // GESTÃO / ADMINISTRAÇÃO — organizado por blocos de tarefas (não por
  // lista plana de módulos). Cobre Administrador Master e Coordenador de
  // Campo, cada bloco continua condicionado às permissões reais.
  // ---------------------------------------------------------------------
  const managementSections: NavSection[] = [
    {
      title: 'Visão Geral',
      items: hasPermission('home_acesso')
        ? [
            {
              id: 'menu-item-home',
              module: 'home',
              label: t('home'),
              icon: LayoutDashboard,
            },
          ]
        : [],
    },
    {
      title: 'Pesquisa',
      items: hasPermission('pesquisa_acesso')
        ? [
            {
              id: 'menu-item-pesquisas',
              module: 'pesquisas',
              label: t('surveys'),
              icon: FileQuestion,
            },
          ]
        : [],
    },
    {
      title: 'Coleta',
      items: [
        ...(hasPermission('respostas_acesso')
          ? [
              {
                id: 'menu-item-respostas',
                module: 'respostas',
                label: t('responses'),
                icon: MessageSquare,
              },
            ]
          : []),
        {
          id: 'menu-item-simulator',
          module: 'simulador',
          label: 'Simulador de Coleta',
          icon: Smartphone,
          iconClassName: 'text-blue-400',
        },
      ],
    },
    {
      title: 'Análise',
      items: hasPermission('analise_acesso')
        ? [
            {
              id: 'menu-item-analise',
              module: 'analise',
              label: t('analytics'),
              icon: BarChart3,
            },
          ]
        : [],
    },
    {
      title: 'Metas e Planejamento',
      items: hasPermission('meta_acesso')
        ? [
            {
              id: 'menu-item-metas',
              module: 'metas',
              label: t('metas'),
              icon: Target,
            },
            {
              id: 'menu-item-dimensionamento',
              module: 'dimensionamento',
              label: t('teamSizing'),
              icon: Calculator,
              iconClassName: 'text-blue-400',
            },
          ]
        : [],
    },
    {
      title: 'Operação',
      items: [
        ...(hasPermission('importacao_acesso')
          ? [
              {
                id: 'menu-item-importacao',
                module: 'importacao',
                label: t('imports'),
                icon: FileSpreadsheet,
              },
            ]
          : []),
        ...(hasPermission('colaboradores_acesso')
          ? [
              {
                id: 'menu-submenu-cadastro-colaboradores',
                module: 'colaboradores',
                label: t('collaborators'),
                icon: Users,
              },
            ]
          : []),
      ],
    },
    {
      title: 'Segurança e Controle',
      items: [
        ...(hasPermission('politicas_acesso')
          ? [
              {
                id: 'menu-submenu-politicas-acesso',
                module: 'politicas_acesso',
                label: t('accessPolicies'),
                icon: ShieldCheck,
              },
            ]
          : []),
        {
          id: 'menu-item-historico-acoes',
          module: 'historico_acoes',
          label: 'Histórico de Ações',
          icon: History,
          iconClassName: 'text-blue-400',
          badge: auditLogs.length,
        },
      ],
    },
  ];

  const sections = isResearcher
    ? researcherSections
    : isAnalyst
    ? analystSections
    : managementSections;

  const portalLabel = isResearcher
    ? 'Portal do Pesquisador'
    : isAnalyst
    ? 'Portal do Analista'
    : 'Navegação Principal';

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
          <div
            className={`pt-2 pb-2 px-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
              isResearcher ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {isResearcher && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            {portalLabel}
          </div>

          {sections.map((section, index) => renderSection(section, index))}
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
            id="btn-sidebar-logout"
            onClick={() => {
              onCloseMobile();
              logout();
            }}
            title="Encerrar sessão de acesso"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-400" />
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
