import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import {
  LayoutDashboard,
  FileQuestion,
  MessageSquare,
  BarChart3,
  FileBarChart2,
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
  KeyRound,
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
    `group relative flex items-center gap-3 w-full pl-3 pr-2 py-2 rounded-lg text-xs font-semibold transition-all ${
      isActive
        ? 'bg-accent-primary-soft text-accent-primary shadow-sm font-bold'
        : 'text-muted hover:text-primary hover:bg-surface-raised'
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
          ? `relative flex items-center justify-between w-full pl-3 pr-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              active
                ? 'bg-accent-primary-soft text-accent-primary shadow-sm font-bold'
                : 'text-muted hover:text-primary hover:bg-surface-raised'
            }`
          : navItemClass(active)
      }
    >
      {active && <span className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-accent-primary shadow-sm" />}
      <div className="flex items-center gap-3">
        <leaf.icon
          className={`h-4 w-4 shrink-0 ${
            active ? 'text-accent-primary' : leaf.iconClassName || ''
          }`}
        />
        <span>{leaf.label}</span>
      </div>
      {leaf.badge !== undefined && (
        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
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
      <div key={section.title} className={index === 0 ? '' : 'mt-3'}>
        <div className="flex items-center gap-2 px-1 pb-1">
          <button
            type="button"
            onClick={() => toggleSection(section.title)}
            className="flex flex-1 items-center justify-between gap-2 rounded px-2 py-1 text-[10px] font-bold text-muted uppercase tracking-widest hover:text-secondary hover:bg-surface-raised transition-colors"
          >
            <span>{section.title}</span>
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        </div>
        {!isCollapsed && (
          <div className="space-y-0.5">
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
          iconClassName: 'text-accent-success',
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
          iconClassName: 'text-accent-primary',
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
          iconClassName: 'text-accent-primary',
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
          iconClassName: 'text-accent-primary',
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
      items: [
        ...(hasPermission('analise_acesso')
          ? [
              {
                id: 'menu-item-analise',
                module: 'analise',
                label: t('analytics'),
                icon: BarChart3,
              },
            ]
          : []),
        ...(hasPermission('relatorios_acesso')
          ? [
              {
                id: 'menu-item-relatorios',
                module: 'relatorios',
                label: t('analyticalReports'),
                icon: FileBarChart2,
                iconClassName: 'text-accent-purple',
              },
            ]
          : []),
      ],
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
          iconClassName: 'text-accent-primary',
        },
      ],
    },
    {
      title: 'Análise',
      items: [
        ...(hasPermission('analise_acesso')
          ? [
              {
                id: 'menu-item-analise',
                module: 'analise',
                label: t('analytics'),
                icon: BarChart3,
              },
            ]
          : []),
        ...(hasPermission('relatorios_acesso')
          ? [
              {
                id: 'menu-item-relatorios',
                module: 'relatorios',
                label: t('analyticalReports'),
                icon: FileBarChart2,
                iconClassName: 'text-accent-purple',
              },
            ]
          : []),
      ],
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
              iconClassName: 'text-accent-primary',
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
                id: 'menu-item-licencas',
                module: 'licencas',
                label: 'Licenças',
                icon: KeyRound,
                iconClassName: 'text-accent-success',
              },
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
          iconClassName: 'text-accent-primary',
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
          className="fixed inset-0 z-40 bg-overlay-modal backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-ui/80 bg-surface-card pt-16 md:pt-0 transition-transform duration-200 ease-in-out shadow-2xl md:sticky md:top-16 md:bottom-auto md:h-[calc(100vh-4rem)] md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-3 py-5 space-y-0.5">
          <div
            className={`px-1 pb-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
              isResearcher ? 'text-accent-success' : 'text-muted'
            }`}
          >
            {isResearcher && (
              <span className="h-1.5 w-1.5 rounded-full bg-accent-success-solid animate-pulse" />
            )}
            {portalLabel}
          </div>

          {sections.map((section, index) => renderSection(section, index))}
        </div>

        {/* Profile info footer (Immersive UI style) */}
        <div className="border-t border-ui/80 p-4 space-y-3 bg-surface-app">
          <div className="flex items-center gap-3 bg-surface-raised p-3 rounded-xl border border-ui shadow-sm">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-xs font-bold text-primary shadow-lg shadow-emerald-950/60 shrink-0">
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
