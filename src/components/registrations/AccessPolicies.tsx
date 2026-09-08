import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Save,
  Plus,
  Edit2,
  Check,
  AlertCircle,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { AccessProfile, AccessPolicyPermissions } from '../../types';

interface PermissionGroup {
  moduleName: string;
  category: string;
  items: { key: keyof AccessPolicyPermissions; label: string; description: string }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    moduleName: 'Módulo Home',
    category: 'home',
    items: [
      {
        key: 'home_acesso',
        label: 'Acesso ao Módulo Home',
        description: 'Permite visualizar o painel inicial e métricas gerais do sistema.',
      },
      {
        key: 'home_visualiza_paineis_superiores',
        label: 'Visualiza Painéis Superiores',
        description: 'Exibe cartões estatísticos de topo (pesquisas ativas, coletas e metas).',
      },
      {
        key: 'home_visualiza_conexoes_recentes',
        label: 'Visualiza Conexões Recentes',
        description: 'Monitora sessões de login, endereços IP e auditoria de acessos em tempo real.',
      },
    ],
  },
  {
    moduleName: 'Cadastro de Colaboradores',
    category: 'colaboradores',
    items: [
      {
        key: 'colaboradores_acesso',
        label: 'Acesso ao Módulo de Colaboradores',
        description: 'Permite visualizar o menu e listagem de colaboradores da organização.',
      },
      {
        key: 'colaboradores_incluir',
        label: 'Incluir Colaborador',
        description: 'Permite cadastrar novos colaboradores com CPF, RG e telefones.',
      },
      {
        key: 'colaboradores_editar',
        label: 'Editar Colaborador',
        description: 'Permite atualizar dados cadastrais e vínculos de pesquisas.',
      },
      {
        key: 'colaboradores_desativar',
        label: 'Desativar Colaborador',
        description: 'Permite suspender o acesso de colaboradores ao sistema.',
      },
      {
        key: 'colaboradores_alterar_senha',
        label: 'Alterar Senha do Colaborador',
        description: 'Permite redefinir credenciais de acesso de terceiros.',
      },
    ],
  },
  {
    moduleName: 'Módulo de Pesquisa',
    category: 'pesquisa',
    items: [
      {
        key: 'pesquisa_acesso',
        label: 'Acesso ao Módulo de Pesquisa',
        description: 'Permite visualizar o inventário de questionários.',
      },
      {
        key: 'pesquisa_criar',
        label: 'Criar Pesquisa',
        description: 'Habilita o wizard de criação com configuração de perguntas e metas.',
      },
      {
        key: 'pesquisa_alterar',
        label: 'Alterar Pesquisa',
        description: 'Permite editar enunciados, opções e regras de questionários.',
      },
      {
        key: 'pesquisa_excluir',
        label: 'Excluir Pesquisa',
        description: 'Permite mover pesquisas para a lixeira ou exclusão permanente.',
      },
      {
        key: 'pesquisa_replicar',
        label: 'Replicar Pesquisa',
        description: 'Permite replicar toda a pesquisa e metas para novo ciclo sem perder o histórico.',
      },
      {
        key: 'pesquisa_desativar',
        label: 'Desativar Pesquisa',
        description: 'Permite pausar ou reativar a coleta de questionários em campo.',
      },
      {
        key: 'pesquisa_visualizar_inativas',
        label: 'Visualizar Pesquisas Inativas',
        description: 'Exibe questionários que tiveram suas coletas suspensas.',
      },
      {
        key: 'pesquisa_visualizar_excluidas',
        label: 'Visualizar Pesquisas Excluídas',
        description: 'Permite auditar questionários descartados ou restaurá-los.',
      },
      {
        key: 'pesquisa_acessa_todas_sem_associacao',
        label: 'Acessa todas sem necessidade de estar associado',
        description: 'Garante acesso global sem exigência de estar expressamente vinculado.',
      },
      {
        key: 'pesquisa_ouvir_audio',
        label: 'Ouvir Áudio das Entrevistas',
        description: 'Permite reproduzir gravações sonoras coletadas no campo.',
      },
      {
        key: 'pesquisa_visualizar_georeferenciamento',
        label: 'Visualizar Georreferenciamento',
        description: 'Acessa mapa e coordenadas GPS de onde a coleta foi realizada.',
      },
      {
        key: 'pesquisa_exportar_resultados',
        label: 'Exportar Resultados',
        description: 'Permite gerar relatórios automáticos nos formatos CSV e PDF.',
      },
      {
        key: 'pesquisa_alteracao_resposta_espontanea',
        label: 'Alteração de Respostas Espontâneas',
        description: 'Habilita a correção administrativa de termos espontâneos antes de exportar.',
      },
    ],
  },
  {
    moduleName: 'Módulo de Visualização de Respostas',
    category: 'respostas',
    items: [
      {
        key: 'respostas_acesso',
        label: 'Acesso à Visualização de Respostas',
        description: 'Permite visualizar dados brutos submetidos pelos pesquisadores.',
      },
      {
        key: 'respostas_alterar',
        label: 'Alterar Respostas (Privilégio Administrativo)',
        description: 'Permite correções ortográficas e de consistência em coletas com trilha de auditoria.',
      },
    ],
  },
  {
    moduleName: 'Módulo de Análise de Resultados',
    category: 'analise',
    items: [
      {
        key: 'analise_acesso',
        label: 'Acesso ao Módulo de Análise',
        description: 'Visualização de gráficos em tempo real, NPS e distribuições.',
      },
      {
        key: 'analise_criar_alterar_excluir_resposta',
        label: 'Criar, Alterar ou Excluir Respostas na Base Analítica',
        description: 'Permite gestão profunda da base de dados analítica consolidada.',
      },
    ],
  },
  {
    moduleName: 'Módulo de Meta',
    category: 'meta',
    items: [
      {
        key: 'meta_acesso',
        label: 'Acesso ao Módulo de Meta',
        description: 'Visualiza quotas amostrais estruturadas (Questão + Condição + Resposta).',
      },
      {
        key: 'meta_criar_alterar_excluir',
        label: 'Criar, Alterar ou Excluir Meta',
        description: 'Permite estipular novas metas e ajustar regras para novos ciclos.',
      },
    ],
  },
  {
    moduleName: 'Módulo de Importação Externa',
    category: 'importacao',
    items: [
      {
        key: 'importacao_acesso',
        label: 'Acesso ao Módulo de Importação',
        description: 'Acessa a interface de upload e mapeamento de arquivos externos.',
      },
      {
        key: 'importacao_importar_planilha',
        label: 'Importar Pesquisa / Respostas Externa',
        description: 'Permite carregar arquivos CSV ou planilhas Excel para a base da nuvem.',
      },
      {
        key: 'importacao_excluir',
        label: 'Excluir Arquivos de Importação',
        description: 'Permite expurgar lotes importados indevidamente.',
      },
    ],
  },
  {
    moduleName: 'Módulo de Relatórios Analíticos',
    category: 'relatorios',
    items: [
      {
        key: 'relatorios_acesso',
        label: 'Acesso ao Módulo de Relatórios Analíticos',
        description: 'Visualiza os relatórios de análise quantitativa e qualitativa das pesquisas.',
      },
      {
        key: 'relatorios_criar_alterar_excluir',
        label: 'Criar, Alterar ou Excluir Relatório',
        description: 'Permite criar novos relatórios, editar blocos de texto e gerar rascunhos automáticos a partir dos resultados.',
      },
    ],
  },
  {
    moduleName: 'Políticas de Acesso (Administração)',
    category: 'politicas',
    items: [
      {
        key: 'politicas_acesso',
        label: 'Acesso e Gestão de Políticas de Acesso',
        description: 'Controle mestre de perfis e matriz de privilégios dos usuários.',
      },
    ],
  },
];

export const AccessPolicies: React.FC = () => {
  const { profiles, updateProfile } = useApp();
  const [selectedProfileId, setSelectedProfileId] = useState<string>(profiles[0]?.id || '');
  const [activeProfile, setActiveProfile] = useState<AccessProfile>(
    profiles.find((p) => p.id === selectedProfileId) || profiles[0]
  );
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Por padrão, grupos totalmente vazios ficam recolhidos — reduz a "parede de
  // checkboxes" e ajuda a responder rápido "o que este perfil PODE fazer?"
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    const found = profiles.find((p) => p.id === id);
    if (found) {
      setActiveProfile(JSON.parse(JSON.stringify(found)));
      setCollapsedGroups({});
      setSearchTerm('');
    }
  };

  const toggleGroupCollapse = (category: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleTogglePermission = (key: keyof AccessPolicyPermissions) => {
    setActiveProfile((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const handleToggleCategory = (group: PermissionGroup, enableAll: boolean) => {
    setActiveProfile((prev) => {
      const updated = { ...prev.permissions };
      group.items.forEach((item) => {
        updated[item.key] = enableAll;
      });
      return {
        ...prev,
        permissions: updated,
      };
    });
  };

  const handleSave = () => {
    updateProfile(activeProfile);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Filtra os grupos/itens pelo termo de busca (nome do módulo, permissão ou descrição).
  // Facilita achar uma permissão específica sem rolar pela lista inteira.
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleGroups = normalizedSearch
    ? PERMISSION_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(normalizedSearch) ||
            item.description.toLowerCase().includes(normalizedSearch) ||
            group.moduleName.toLowerCase().includes(normalizedSearch)
        ),
      })).filter((group) => group.items.length > 0)
    : PERMISSION_GROUPS;

  // Resumo geral do perfil: quantos módulos têm acesso total, parcial ou nenhum.
  // Responde de forma imediata "o que este perfil pode fazer?" sem precisar
  // abrir cada grupo individualmente.
  const groupStatusCounts = PERMISSION_GROUPS.reduce(
    (acc, group) => {
      const active = group.items.filter((i) => activeProfile.permissions[i.key]).length;
      if (active === 0) acc.none += 1;
      else if (active === group.items.length) acc.full += 1;
      else acc.partial += 1;
      return acc;
    },
    { full: 0, partial: 0, none: 0 }
  );

  const getGroupStatus = (group: PermissionGroup) => {
    const active = group.items.filter((i) => activeProfile.permissions[i.key]).length;
    if (active === 0) return { label: 'Nenhum acesso', tone: 'none' as const, active };
    if (active === group.items.length) return { label: 'Acesso total', tone: 'full' as const, active };
    return { label: 'Acesso parcial', tone: 'partial' as const, active };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
            Políticas de Acesso e Permissões
          </h1>
          <p className="text-xs text-muted">
            Configure detalhadamente a matriz de privilégios e controle de acesso baseado em papéis (RBAC).
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-xl bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 transition hover:bg-accent-primary-solid-hover active:scale-95"
        >
          <Save className="h-4 w-4" />
          <span>Salvar Alterações de Política</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-2xl border border-accent-success-soft-border bg-accent-success-soft p-4 text-xs font-bold text-accent-success">
          <CheckCircle2 className="h-4 w-4 text-accent-success" />
          <span>Políticas de acesso do perfil salvas e propagadas com sucesso!</span>
        </div>
      )}

      {/* Profile Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-ui pb-3">
        {profiles.map((p) => {
          const isSelected = p.id === activeProfile?.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelectProfile(p.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                isSelected
                  ? 'bg-accent-primary-solid text-on-accent shadow-lg shadow-emerald-900/40 border border-emerald-500'
                  : 'bg-surface text-secondary hover:bg-surface-raised border border-ui hover:text-primary'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Profile Summary Info */}
      <div className="rounded-2xl border border-ui bg-surface p-4 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent-primary">
              Perfil Selecionado
            </span>
            <h3 className="text-base font-bold text-primary">
              {activeProfile.name}
            </h3>
            <p className="text-xs text-muted">
              {activeProfile.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const updated = { ...activeProfile.permissions };
                PERMISSION_GROUPS.forEach((g) => {
                  g.items.forEach((item) => {
                    updated[item.key] = true;
                  });
                });
                setActiveProfile({ ...activeProfile, permissions: updated });
              }}
              className="rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
            >
              Marcar Todos
            </button>
            <button
              type="button"
              onClick={() => {
                const updated = { ...activeProfile.permissions };
                PERMISSION_GROUPS.forEach((g) => {
                  g.items.forEach((item) => {
                    updated[item.key] = false;
                  });
                });
                setActiveProfile({ ...activeProfile, permissions: updated });
              }}
              className="rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
            >
              Desmarcar Todos
            </button>
          </div>
        </div>

        {/* Resumo geral: "O que este perfil pode fazer?" de forma imediata */}
        <div className="flex flex-wrap items-center gap-2 border-t border-ui pt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted mr-1">
            Resumo de {PERMISSION_GROUPS.length} módulos:
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-accent-success-soft-border bg-accent-success-soft px-2.5 py-1 text-[11px] font-bold text-accent-success">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-success-solid" />
            {groupStatusCounts.full} com acesso total
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-accent-warning-soft-border bg-accent-warning-soft px-2.5 py-1 text-[11px] font-bold text-accent-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-warning-solid" />
            {groupStatusCounts.partial} com acesso parcial
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-2.5 py-1 text-[11px] font-bold text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-strong" />
            {groupStatusCounts.none} sem acesso
          </span>
        </div>

        {/* Busca rápida por permissão */}
        <div className="relative border-t border-ui pt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 mt-1.5 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por permissão, módulo ou descrição..."
            className="w-full rounded-lg border border-ui bg-surface-card py-2 pl-9 pr-3 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {searchTerm && visibleGroups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ui bg-surface p-6 text-center text-xs text-muted">
          Nenhuma permissão encontrada para "{searchTerm}".
        </div>
      )}

      {/* Permission Matrix by Module */}
      <div className="space-y-4">
        {visibleGroups.map((group) => {
          const totalInGroup = group.items.length;
          const status = getGroupStatus(group);
          const isCollapsed = Boolean(collapsedGroups[group.category]) && !normalizedSearch;

          const toneClasses = {
            full: 'border-accent-success-soft-border bg-accent-success-soft text-accent-success',
            partial: 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning',
            none: 'border-ui bg-surface-raised text-muted',
          }[status.tone];

          const dotClasses = {
            full: 'bg-accent-success-solid',
            partial: 'bg-accent-warning-solid',
            none: 'bg-strong',
          }[status.tone];

          return (
            <div
              key={group.category}
              className="overflow-hidden rounded-2xl border border-ui bg-surface shadow-xl"
            >
              {/* Group header — clicável para recolher/expandir */}
              <button
                type="button"
                onClick={() => toggleGroupCollapse(group.category)}
                className="flex w-full items-center justify-between gap-3 border-b border-ui bg-surface-card px-5 py-3 text-left transition-colors hover:bg-surface"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
                  )}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                    {group.moduleName}
                  </h4>
                  <span
                    className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold ${toneClasses}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${dotClasses}`} />
                    {status.label} ({status.active}/{totalInGroup})
                  </span>
                </div>

                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleCategory(group, status.active !== totalInGroup);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      handleToggleCategory(group, status.active !== totalInGroup);
                    }
                  }}
                  className="shrink-0 text-[11px] font-semibold text-accent-primary hover:underline cursor-pointer"
                >
                  {status.active === totalInGroup ? 'Desmarcar grupo' : 'Marcar todas do grupo'}
                </span>
              </button>

              {/* Group checkboxes */}
              {!isCollapsed && (
                <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => {
                    const isChecked = Boolean(activeProfile.permissions[item.key]);

                    return (
                      <label
                        key={item.key}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                          isChecked
                            ? 'border-accent-primary-soft-border bg-accent-primary-soft shadow-sm shadow-emerald-950/40'
                            : 'border-ui bg-surface-card hover:bg-surface-raised'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(item.key)}
                          className="mt-0.5 h-4 w-4 rounded text-accent-primary-solid focus:ring-emerald-500"
                        />
                        <div className="flex-1">
                          <div
                            className={`text-xs font-bold ${
                              isChecked
                                ? 'text-accent-primary'
                                : 'text-primary'
                            }`}
                          >
                            {item.label}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                            {item.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-xl bg-accent-primary-solid px-6 py-2.5 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 transition hover:bg-accent-primary-solid-hover active:scale-95"
        >
          <Save className="h-4 w-4" />
          <span>Salvar Alterações de Política</span>
        </button>
      </div>
    </div>
  );
};
