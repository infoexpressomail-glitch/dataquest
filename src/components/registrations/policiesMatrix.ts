/**
 * Matriz de Políticas de Acesso — definição dos MÓDULOS e NÍVEIS.
 *
 * Cada módulo vira uma LINHA da matriz e cada perfil uma COLUNA. O nível
 * (Sem acesso, Ver, Operacional, Gestão, Total…) resume, de forma cumulativa,
 * os passos das permissões REAIS já existentes em `AccessPolicyPermissions`.
 *
 * Regra de ouro: aplicar um nível liga/desliga exatamente as permissões
 * daquele módulo. Nenhuma permissão nova é criada e nenhum módulo fora do
 * RBAC atual é exposto. A soma das permissões dos 9 módulos = 33 permissões,
 * o mesmo universo que já existia (132 interruptores = 33 × 4 perfis).
 */

import type { AccessPolicyPermissions } from '../../types';

export type PermissionKey = keyof AccessPolicyPermissions;

export interface PolicyLevel {
  /** Identificador estável do nível dentro do módulo. */
  id: string;
  /** Rótulo exibido na matriz. */
  label: string;
  /** Descrição curta usada no menu de níveis. */
  description: string;
  /** Permissões que este nível ADICIONA sobre os níveis anteriores (cumulativo). */
  keys: PermissionKey[];
}

export interface PolicyModuleDef {
  id: string;
  label: string;
  /** Explicação do que o módulo cobre (usada no cabeçalho/linha). */
  hint: string;
  /** Níveis em ordem crescente de poder. O primeiro nível já liga permissões. */
  levels: PolicyLevel[];
}

export const POLICY_MODULES: PolicyModuleDef[] = [
  {
    id: 'home',
    label: 'Início',
    hint: 'Painel inicial, indicadores e monitor de conexões.',
    levels: [
      { id: 'view', label: 'Ver', description: 'Só abre o painel inicial.', keys: ['home_acesso'] },
      {
        id: 'operational',
        label: 'Operacional',
        description: 'Painel + cartões estatísticos de topo.',
        keys: ['home_visualiza_paineis_superiores'],
      },
      {
        id: 'total',
        label: 'Total',
        description: 'Painel + estatísticas + monitor de conexões recentes.',
        keys: ['home_visualiza_conexoes_recentes'],
      },
    ],
  },
  {
    id: 'colaboradores',
    label: 'Colaboradores',
    hint: 'Cadastro, vínculos e credenciais da equipe.',
    levels: [
      {
        id: 'view',
        label: 'Ver',
        description: 'Lista de colaboradores.',
        keys: ['colaboradores_acesso'],
      },
      {
        id: 'operational',
        label: 'Cadastrar e editar',
        description: 'Cria novos colaboradores e edita dados cadastrais.',
        keys: ['colaboradores_incluir', 'colaboradores_editar'],
      },
      {
        id: 'manage',
        label: 'Gestão',
        description: 'Também desativa colaboradores.',
        keys: ['colaboradores_desativar'],
      },
      {
        id: 'total',
        label: 'Total',
        description: 'Também redefine senhas.',
        keys: ['colaboradores_alterar_senha'],
      },
    ],
  },
  {
    id: 'pesquisas',
    label: 'Pesquisas',
    hint: 'Instrumentos de coleta, ciclo de vida e acesso aos dados sensíveis.',
    levels: [
      { id: 'view', label: 'Ver', description: 'Vê os questionários.', keys: ['pesquisa_acesso'] },
      {
        id: 'expanded',
        label: 'Consulta ampliada',
        description: 'Inativas, áudio, georreferenciamento e exportação.',
        keys: [
          'pesquisa_visualizar_inativas',
          'pesquisa_ouvir_audio',
          'pesquisa_visualizar_georeferenciamento',
          'pesquisa_exportar_resultados',
        ],
      },
      {
        id: 'manage',
        label: 'Gestão',
        description: 'Cria, altera, replica e desativa pesquisas.',
        keys: ['pesquisa_criar', 'pesquisa_alterar', 'pesquisa_replicar', 'pesquisa_desativar'],
      },
      {
        id: 'total',
        label: 'Total',
        description: 'Exclui, vê excluídas, acessa todas sem vínculo e altera respostas espontâneas.',
        keys: [
          'pesquisa_excluir',
          'pesquisa_visualizar_excluidas',
          'pesquisa_acessa_todas_sem_associacao',
          'pesquisa_alteracao_resposta_espontanea',
        ],
      },
    ],
  },
  {
    id: 'respostas',
    label: 'Respostas',
    hint: 'Visualização e correção administrativa das coletas.',
    levels: [
      { id: 'view', label: 'Ver', description: 'Vê os dados brutos.', keys: ['respostas_acesso'] },
      {
        id: 'total',
        label: 'Total',
        description: 'Também altera respostas (com trilha de auditoria).',
        keys: ['respostas_alterar'],
      },
    ],
  },
  {
    id: 'analise',
    label: 'Análise',
    hint: 'Gráficos, NPS, distribuições e base analítica.',
    levels: [
      {
        id: 'view',
        label: 'Ver',
        description: 'Visualiza análise em tempo real.',
        keys: ['analise_acesso'],
      },
      {
        id: 'total',
        label: 'Total',
        description: 'Também cria, altera ou exclui respostas na base analítica.',
        keys: ['analise_criar_alterar_excluir_resposta'],
      },
    ],
  },
  {
    id: 'meta',
    label: 'Metas',
    hint: 'Cotas amostrais, composição e planejamento de campo.',
    levels: [
      { id: 'view', label: 'Ver', description: 'Vê as metas.', keys: ['meta_acesso'] },
      {
        id: 'total',
        label: 'Total',
        description: 'Também cria, altera ou exclui metas.',
        keys: ['meta_criar_alterar_excluir'],
      },
    ],
  },
  {
    id: 'importacao',
    label: 'Importação',
    hint: 'Upload e mapeamento de planilhas externas.',
    levels: [
      { id: 'view', label: 'Ver', description: 'Abre a interface de importação.', keys: ['importacao_acesso'] },
      {
        id: 'import',
        label: 'Importar',
        description: 'Importa pesquisas/respostas de planilhas.',
        keys: ['importacao_importar_planilha'],
      },
      {
        id: 'total',
        label: 'Total',
        description: 'Também exclui lotes importados.',
        keys: ['importacao_excluir'],
      },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    hint: 'Relatórios analíticos e blocos de texto.',
    levels: [
      { id: 'view', label: 'Ver', description: 'Vê os relatórios.', keys: ['relatorios_acesso'] },
      {
        id: 'total',
        label: 'Total',
        description: 'Também cria, altera ou exclui relatórios.',
        keys: ['relatorios_criar_alterar_excluir'],
      },
    ],
  },
  {
    id: 'politicas',
    label: 'Políticas de acesso',
    hint: 'Controle mestre de perfis e privilégios.',
    levels: [
      {
        id: 'total',
        label: 'Total',
        description: 'Acessa e edita as políticas de acesso.',
        keys: ['politicas_acesso'],
      },
    ],
  },
];

/** Todas as permissões cobertas pela matriz (universo completo = 33). */
export const ALL_MATRIX_KEYS: PermissionKey[] = POLICY_MODULES.flatMap((m) =>
  m.levels.flatMap((l) => l.keys)
);

/**
 * Chaves acumuladas até um nível (inclusive). Ex.: nível 'manage' inclui
 * as chaves de 'view' + 'operational' + 'manage'.
 */
export function cumulativeKeys(moduleDef: PolicyModuleDef, levelId: string): PermissionKey[] {
  const out: PermissionKey[] = [];
  for (const level of moduleDef.levels) {
    out.push(...level.keys);
    if (level.id === levelId) break;
  }
  return out;
}

export interface ModuleLevelState {
  /** 'none' quando nenhuma permissão do módulo está ativa. */
  levelId: string;
  levelLabel: string;
  /** Índice do nível em POLICY_MODULES[..].levels ( -1 = none ). */
  levelIndex: number;
  /** Quantidade de permissões do módulo ativas agora. */
  activeCount: number;
  totalCount: number;
  /** Permissões ativas que estão FORA do nível detectado (caso "+1"). */
  extraKeys: PermissionKey[];
  isStandard: boolean;
}

/**
 * Detecta o nível atual de um módulo comparando as permissões reais com os
 * níveis cumulativos. Retorna também as permissões "extras" (fora do padrão),
 * que a interface mostra como "+N" — exatamente o caso do Analista em
 * Pesquisas (Consulta ampliada +1).
 */
export function getModuleLevelState(
  moduleDef: PolicyModuleDef,
  permissions: AccessPolicyPermissions
): ModuleLevelState {
  const allModuleKeys = cumulativeKeys(moduleDef, moduleDef.levels[moduleDef.levels.length - 1].id);
  const activeSet = new Set(allModuleKeys.filter((k) => Boolean(permissions[k])));
  const activeCount = activeSet.size;
  const totalCount = allModuleKeys.length;

  let levelIndex = -1;
  for (let i = moduleDef.levels.length - 1; i >= 0; i -= 1) {
    const keys = cumulativeKeys(moduleDef, moduleDef.levels[i].id);
    if (keys.every((k) => activeSet.has(k)) && keys.length > 0) {
      levelIndex = i;
      break;
    }
  }

  if (levelIndex === -1) {
    return {
      levelId: 'none',
      levelLabel: 'Sem acesso',
      levelIndex: -1,
      activeCount,
      totalCount,
      extraKeys: [],
      isStandard: activeCount === 0,
    };
  }

  const levelKeys = new Set(
    cumulativeKeys(moduleDef, moduleDef.levels[levelIndex].id)
  );
  const extraKeys = Array.from(activeSet).filter((k) => !levelKeys.has(k));

  return {
    levelId: moduleDef.levels[levelIndex].id,
    levelLabel: moduleDef.levels[levelIndex].label,
    levelIndex,
    activeCount,
    totalCount,
    extraKeys,
    isStandard: extraKeys.length === 0,
  };
}

/** 'none' | id do nível. Aplica o nível ao módulo, preservando o resto. */
export function applyLevelToPermissions(
  moduleDef: PolicyModuleDef,
  levelId: string,
  permissions: AccessPolicyPermissions
): AccessPolicyPermissions {
  const next: AccessPolicyPermissions = { ...permissions };
  const lastLevelId = moduleDef.levels[moduleDef.levels.length - 1].id;
  // Zera todas as permissões do módulo…
  cumulativeKeys(moduleDef, lastLevelId).forEach((k) => {
    next[k] = false;
  });
  // …e liga as do nível escolhido (acumulado).
  if (levelId !== 'none') {
    cumulativeKeys(moduleDef, levelId).forEach((k) => {
      next[k] = true;
    });
  }
  return next;
}

/** Conta quantas das 33 permissões estão ativas no perfil. */
export function countActivePermissions(permissions: AccessPolicyPermissions): number {
  return ALL_MATRIX_KEYS.filter((k) => Boolean(permissions[k])).length;
}

/** Diferença de permissões entre dois retratos do mesmo perfil. */
export function diffPermissions(
  before: AccessPolicyPermissions,
  after: AccessPolicyPermissions
): PermissionKey[] {
  return ALL_MATRIX_KEYS.filter((k) => Boolean(before[k]) !== Boolean(after[k]));
}
