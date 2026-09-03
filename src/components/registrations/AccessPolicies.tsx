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

  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    const found = profiles.find((p) => p.id === id);
    if (found) {
      setActiveProfile(JSON.parse(JSON.stringify(found)));
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Políticas de Acesso e Permissões
          </h1>
          <p className="text-xs text-slate-400">
            Configure detalhadamente a matriz de privilégios e controle de acesso baseado em papéis (RBAC).
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500 active:scale-95"
        >
          <Save className="h-4 w-4" />
          <span>Salvar Alterações de Política</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-xs font-bold text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Políticas de acesso do perfil salvas e propagadas com sucesso!</span>
        </div>
      )}

      {/* Profile Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {profiles.map((p) => {
          const isSelected = p.id === activeProfile?.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelectProfile(p.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border border-blue-500'
                  : 'bg-[#16171d] text-slate-300 hover:bg-slate-800 border border-slate-800 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Profile Summary Info */}
      <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Perfil Selecionado
            </span>
            <h3 className="text-base font-bold text-white">
              {activeProfile.name}
            </h3>
            <p className="text-xs text-slate-400">
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
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
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
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Desmarcar Todos
            </button>
          </div>
        </div>
      </div>

      {/* Permission Matrix by Module */}
      <div className="space-y-4">
        {PERMISSION_GROUPS.map((group) => {
          const totalInGroup = group.items.length;
          const activeInGroup = group.items.filter(
            (i) => activeProfile.permissions[i.key]
          ).length;
          const isAllChecked = activeInGroup === totalInGroup;

          return (
            <div
              key={group.category}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-[#16171d] shadow-xl"
            >
              {/* Group header */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-[#111218] px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    {group.moduleName}
                  </h4>
                  <span className="rounded-md border border-slate-800 bg-[#16171d] px-2 py-0.5 text-[10px] font-bold text-slate-300">
                    {activeInGroup} de {totalInGroup} ativas
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(group, !isAllChecked)}
                    className="text-[11px] font-semibold text-blue-400 hover:underline"
                  >
                    {isAllChecked ? 'Desmarcar grupo' : 'Marcar todas do grupo'}
                  </button>
                </div>
              </div>

              {/* Group checkboxes */}
              <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => {
                  const isChecked = Boolean(activeProfile.permissions[item.key]);

                  return (
                    <label
                      key={item.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        isChecked
                          ? 'border-blue-500/60 bg-blue-600/10 shadow-sm shadow-blue-950/40'
                          : 'border-slate-800 bg-[#111218] hover:bg-slate-800/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePermission(item.key)}
                        className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div
                          className={`text-xs font-bold ${
                            isChecked
                              ? 'text-blue-300'
                              : 'text-slate-200'
                          }`}
                        >
                          {item.label}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500 active:scale-95"
        >
          <Save className="h-4 w-4" />
          <span>Salvar Alterações de Política</span>
        </button>
      </div>
    </div>
  );
};
