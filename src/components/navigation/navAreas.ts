import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Compass,
  Smartphone,
  BarChart3,
  ShieldCheck,
  FileQuestion,
  PlusCircle,
  Target,
  Calculator,
  MessageSquare,
  FileBarChart2,
  FileSpreadsheet,
  Download,
  Users,
  KeyRound,
  History,
  Sparkles,
  Database,
} from 'lucide-react';
import { translations } from '../../i18n';
import type { AccessPolicyPermissions } from '../../types';

/** Chave de tradução aceita por getTranslation(). */
export type NavTranslationKey = keyof (typeof translations)['pt'];

/**
 * Navegação por ÁREAS (Opção A).
 *
 * Substitui a lista longa de itens (até 14 no mesmo nível) por 4 áreas que
 * seguem o ciclo da pesquisa — Planejar, Coletar, Analisar, Administrar —
 * mais o Início. As telas atuais são reaproveitadas: só o "casco" muda.
 *
 * A visibilidade de cada item continua vindo das permissões reais do RBAC
 * (`hasPermission`), então nenhum perfil ganha acesso novo.
 */

export type IconType = ComponentType<{ className?: string }>;

export interface NavItem {
  id: string;
  /** Módulo consumido por setActiveModule() no AppContext. */
  module: string;
  label: string;
  /** Descrição curta do que a funcionalidade faz (orienta o clique). */
  hint?: string;
  icon: IconType;
  iconClassName?: string;
  badge?: number;
}

export interface NavArea {
  id: string;
  label: string;
  icon: IconType;
  items: NavItem[];
}

export interface BuildAreasArgs {
  hasPermission: (perm: keyof AccessPolicyPermissions) => boolean;
  t: (key: NavTranslationKey) => string;
  isResearcher: boolean;
  isAnalyst: boolean;
  auditCount: number;
}

function push(arr: NavItem[], cond: boolean, item: NavItem): void {
  if (cond) arr.push(item);
}

/** Portal do Pesquisador — áreas próprias, focadas em coleta e metas. */
function researcherAreas(args: BuildAreasArgs): NavArea[] {
  const { t } = args;
  return [
    {
      id: 'inicio',
      label: 'Meu Espaço',
      icon: LayoutDashboard,
      items: [
        {
          id: 'r-home',
          module: 'pesquisador',
          label: 'Ambiente do Pesquisador',
          hint: 'Painel e atalhos da sua coleta',
          icon: Sparkles,
          iconClassName: 'text-accent-success',
        },
      ],
    },
    {
      id: 'coletar',
      label: 'Coletar',
      icon: Smartphone,
      items: [
        {
          id: 'r-pesquisas',
          module: 'pesquisas',
          label: t('surveys'),
          hint: 'Somente as ativas para você',
          icon: FileQuestion,
        },
        {
          id: 'r-form',
          module: 'simulador',
          label: 'Formulário de Coleta',
          hint: 'Responder a entrevista',
          icon: Smartphone,
          iconClassName: 'text-accent-primary',
        },
      ],
    },
    {
      id: 'desempenho',
      label: 'Desempenho',
      icon: Target,
      items: [
        {
          id: 'r-metas',
          module: 'metas',
          label: t('metas'),
          hint: 'Acompanhar o atingimento',
          icon: Target,
        },
        {
          id: 'r-dim',
          module: 'dimensionamento',
          label: t('teamSizing'),
          hint: 'Planejamento de campo',
          icon: Calculator,
          iconClassName: 'text-accent-primary',
        },
      ],
    },
    {
      id: 'conformidade',
      label: 'Conformidade',
      icon: History,
      items: [
        {
          id: 'r-auditoria',
          module: 'historico_acoes',
          label: 'Trilha de Conformidade',
          hint: 'Histórico das suas ações',
          icon: History,
          iconClassName: 'text-accent-primary',
        },
      ],
    },
  ];
}

/** Portal do Analista — orientado a dados, sem áreas administrativas. */
function analystAreas(args: BuildAreasArgs): NavArea[] {
  const { hasPermission: has, t } = args;
  const areas: NavArea[] = [];

  const inicio: NavItem[] = [];
  push(inicio, has('home_acesso'), {
    id: 'a-home',
    module: 'home',
    label: 'Início',
    hint: 'Visão geral dos indicadores',
    icon: LayoutDashboard,
  });
  if (inicio.length) areas.push({ id: 'inicio', label: 'Início', icon: LayoutDashboard, items: inicio });

  const dados: NavItem[] = [];
  push(dados, has('pesquisa_acesso'), {
    id: 'a-pesquisas',
    module: 'pesquisas',
    label: t('surveys'),
    hint: 'Instrumentos de coleta',
    icon: FileQuestion,
  });
  push(dados, has('respostas_acesso'), {
    id: 'a-respostas',
    module: 'respostas',
    label: t('responses'),
    hint: 'Respostas coletadas',
    icon: MessageSquare,
  });
  if (dados.length) areas.push({ id: 'dados', label: 'Dados', icon: Database, items: dados });

  const analise: NavItem[] = [];
  push(analise, has('analise_acesso'), {
    id: 'a-analise',
    module: 'analise',
    label: t('analytics'),
    hint: 'Análises e cruzamentos',
    icon: BarChart3,
  });
  push(analise, has('relatorios_acesso'), {
    id: 'a-relatorios',
    module: 'relatorios',
    label: t('analyticalReports'),
    hint: 'Relatórios gerenciais',
    icon: FileBarChart2,
    iconClassName: 'text-accent-purple',
  });
  push(analise, has('pesquisa_exportar_resultados'), {
    id: 'a-export',
    module: 'analise',
    label: 'Exportações (CSV / PDF)',
    hint: 'Baixar resultados',
    icon: Download,
  });
  if (analise.length) areas.push({ id: 'analisar', label: 'Analisar', icon: BarChart3, items: analise });

  return areas;
}

/** Gestão (Administrador Master e Coordenador de Campo) — as 4 áreas. */
function managementAreas(args: BuildAreasArgs): NavArea[] {
  const { hasPermission: has, t } = args;
  const areas: NavArea[] = [];

  const inicio: NavItem[] = [];
  push(inicio, has('home_acesso'), {
    id: 'm-home',
    module: 'home',
    label: 'Início',
    hint: 'Visão geral e indicadores',
    icon: LayoutDashboard,
  });
  if (inicio.length) areas.push({ id: 'inicio', label: 'Início', icon: LayoutDashboard, items: inicio });

  const planejar: NavItem[] = [];
  push(planejar, has('pesquisa_acesso'), {
    id: 'm-pesquisas',
    module: 'pesquisas',
    label: t('surveys'),
    hint: 'Criar, editar e publicar',
    icon: FileQuestion,
  });
  push(planejar, has('pesquisa_criar') || has('pesquisa_alterar'), {
    id: 'm-wizard',
    module: 'wizard',
    label: 'Nova pesquisa',
    hint: 'Assistente de criação',
    icon: PlusCircle,
    iconClassName: 'text-accent-success',
  });
  push(planejar, has('meta_acesso'), {
    id: 'm-metas',
    module: 'metas',
    label: t('metas'),
    hint: 'Metas, cotas e catálogo',
    icon: Target,
  });
  push(planejar, has('meta_acesso'), {
    id: 'm-dimensionamento',
    module: 'dimensionamento',
    label: t('teamSizing'),
    hint: 'Dimensionar equipe de campo',
    icon: Calculator,
    iconClassName: 'text-accent-primary',
  });
  if (planejar.length) areas.push({ id: 'planejar', label: 'Planejar', icon: Compass, items: planejar });

  const coletar: NavItem[] = [];
  push(coletar, has('respostas_acesso'), {
    id: 'm-respostas',
    module: 'respostas',
    label: t('responses'),
    hint: 'Coletas recebidas',
    icon: MessageSquare,
  });
  coletar.push({
    id: 'm-simulador',
    module: 'simulador',
    label: 'Simulador de coleta',
    hint: 'Testar o formulário',
    icon: Smartphone,
    iconClassName: 'text-accent-primary',
  });
  areas.push({ id: 'coletar', label: 'Coletar', icon: Smartphone, items: coletar });

  const analisar: NavItem[] = [];
  push(analisar, has('analise_acesso'), {
    id: 'm-analise',
    module: 'analise',
    label: 'Análise',
    hint: 'Análises e cruzamentos',
    icon: BarChart3,
  });
  push(analisar, has('relatorios_acesso'), {
    id: 'm-relatorios',
    module: 'relatorios',
    label: 'Relatórios',
    hint: 'Relatórios gerenciais',
    icon: FileBarChart2,
    iconClassName: 'text-accent-purple',
  });
  push(analisar, has('importacao_acesso'), {
    id: 'm-importacao',
    module: 'importacao',
    label: t('imports'),
    hint: 'Importar planilhas externas',
    icon: FileSpreadsheet,
  });
  push(analisar, has('pesquisa_exportar_resultados'), {
    id: 'm-export',
    module: 'analise',
    label: 'Exportações (CSV / PDF)',
    hint: 'Baixar resultados',
    icon: Download,
  });
  if (analisar.length) areas.push({ id: 'analisar', label: 'Analisar', icon: BarChart3, items: analisar });

  const administrar: NavItem[] = [];
  push(administrar, has('colaboradores_acesso'), {
    id: 'm-colaboradores',
    module: 'colaboradores',
    label: t('collaborators'),
    hint: 'Usuários e vínculos',
    icon: Users,
  });
  push(administrar, has('colaboradores_acesso'), {
    id: 'm-licencas',
    module: 'licencas',
    label: 'Licenças',
    hint: 'Chaves e ativações',
    icon: KeyRound,
    iconClassName: 'text-accent-success',
  });
  push(administrar, has('politicas_acesso'), {
    id: 'm-politicas',
    module: 'politicas_acesso',
    label: t('accessPolicies'),
    hint: 'Permissões por perfil',
    icon: ShieldCheck,
  });
  administrar.push({
    id: 'm-historico',
    module: 'historico_acoes',
    label: 'Histórico de ações',
    hint: 'Trilha de auditoria',
    icon: History,
    iconClassName: 'text-accent-primary',
    badge: args.auditCount,
  });
  if (administrar.length) areas.push({ id: 'administrar', label: 'Administrar', icon: ShieldCheck, items: administrar });

  return areas;
}

export function buildNavAreas(args: BuildAreasArgs): NavArea[] {
  if (args.isResearcher) return researcherAreas(args);
  if (args.isAnalyst) return analystAreas(args);
  return managementAreas(args);
}

/** Lista plana das telas — usada pela busca global (Ctrl K). */
export function flattenAreas(areas: NavArea[]): Array<NavItem & { area: string }> {
  return areas.flatMap((area) => area.items.map((item) => ({ ...item, area: area.label })));
}
