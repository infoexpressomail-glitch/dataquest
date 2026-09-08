import { ConditionOperator, InterviewSubmission, MetaCompositionRule, MetaTarget } from '../types';

/**
 * Avalia se o valor de resposta atende a uma condição (Igual / Diferente / Contém).
 * Também suporta comparações numéricas (maior_que / menor_que) quando aplicável.
 */
export function evaluateCondition(
  respStr: string,
  condicao: ConditionOperator,
  valorEsperado: string
): boolean {
  const left = String(respStr ?? '').trim().toLowerCase();
  const right = String(valorEsperado ?? '').trim().toLowerCase();

  switch (condicao) {
    case 'igual':
      return left === right;
    case 'diferente':
      return left !== right;
    case 'contem':
      return left.includes(right);
    case 'maior_que': {
      const a = parseFloat(left);
      const b = parseFloat(right);
      return !isNaN(a) && !isNaN(b) ? a > b : false;
    }
    case 'menor_que': {
      const a = parseFloat(left);
      const b = parseFloat(right);
      return !isNaN(a) && !isNaN(b) ? a < b : false;
    }
    default:
      return left === right;
  }
}

/** Converte a resposta da submissão (string ou array) em texto plano para comparação. */
export function answerToString(resposta: string | string[]): string {
  if (Array.isArray(resposta)) return resposta.join(', ');
  return String(resposta ?? '');
}

/**
 * Retorna as regras de composição efetivas de uma meta.
 * Prioriza o array `composicao`; para metas legadas, sintetiza uma regra a partir
 * de perguntaId/condicao/resposta para manter compatibilidade.
 */
export function getCompositionRules(meta: MetaTarget): MetaCompositionRule[] {
  if (meta.composicao && meta.composicao.length > 0) {
    return meta.composicao;
  }
  if (meta.perguntaId && meta.resposta) {
    return [
      {
        id: `${meta.id}_legacy`,
        perguntaId: meta.perguntaId,
        perguntaCodigo: meta.perguntaId,
        perguntaEnunciado: meta.perguntaId,
        condicao: meta.condicao,
        resposta: meta.resposta,
      },
    ];
  }
  return [];
}

/**
 * Verifica se uma submissão (entrevista) atende a TODAS as regras de composição da meta
 * (semântica AND). Se não houver regras, a submissão não conta.
 */
export function matchSubmissionToMeta(meta: MetaTarget, sub: InterviewSubmission): boolean {
  const rules = getCompositionRules(meta);
  if (rules.length === 0) return false;

  for (const rule of rules) {
    const resp = sub.respostas?.find((r) => r.perguntaId === rule.perguntaId);
    if (!resp) return false;
    if (!evaluateCondition(answerToString(resp.resposta), rule.condicao, rule.resposta)) {
      return false;
    }
  }
  return true;
}

export interface CompositionMetaProgress {
  meta: MetaTarget;
  atingidaGeral: number;
  alvo: number;
  percentual: number;
  porPesquisador: Record<string, number>;
  pesquisadoresVinculados: number;
  status: 'ativa' | 'concluida' | 'pausada';
  atingida: boolean;
}

/**
 * Calcula o progresso real de uma meta de composição a partir das submissões coletadas.
 */
export function calculateCompositionMetaProgress(
  meta: MetaTarget,
  submissions: InterviewSubmission[]
): CompositionMetaProgress {
  const matched = submissions.filter(
    (s) => s.status === 'concluida' && matchSubmissionToMeta(meta, s)
  );

  const porPesquisador: Record<string, number> = {};
  matched.forEach((s) => {
    porPesquisador[s.pesquisadorId] = (porPesquisador[s.pesquisadorId] || 0) + 1;
  });

  const atingidaGeral = matched.length;
  const alvo =
    meta.distribuicao === 'por_pesquisador'
      ? meta.quantidadeAlvoPorPesquisador || meta.quantidadeAlvo || 0
      : meta.quantidadeAlvo || 0;

  const percentual = alvo > 0 ? Math.min(100, Math.round((atingidaGeral / alvo) * 100)) : 0;
  const atingida = alvo > 0 && atingidaGeral >= alvo;
  const status: CompositionMetaProgress['status'] =
    meta.status === 'pausada' ? 'pausada' : atingida ? 'concluida' : 'ativa';

  return {
    meta,
    atingidaGeral,
    alvo,
    percentual,
    porPesquisador,
    pesquisadoresVinculados: Object.keys(porPesquisador).length,
    status,
    atingida,
  };
}

/**
 * Verifica se um pesquisador específico já atingiu a meta (usado para bloquear coletas).
 * - Geral: a meta é atingida quando a soma de coletas de TODA a equipe >= alvo.
 * - Por pesquisador: cada pesquisador é bloqueado quando a PRÓPRIA contagem >= alvo individual.
 */
export function isResearcherReached(
  meta: MetaTarget,
  submissions: InterviewSubmission[],
  pesquisadorId: string
): boolean {
  if (!meta.bloquearAposAtingir) return false;
  const progress = calculateCompositionMetaProgress(meta, submissions);
  if (meta.distribuicao === 'por_pesquisador') {
    const individual = progress.porPesquisador[pesquisadorId] || 0;
    return individual >= progress.alvo;
  }
  return progress.atingida;
}

/** Rótulo legível para a condição (ex.: 'igual' → 'Igual a'). */
export const CONDITION_LABELS: Record<ConditionOperator, string> = {
  igual: 'Igual a',
  diferente: 'Diferente de',
  contem: 'Contém o termo',
  maior_que: 'Maior que',
  menor_que: 'Menor que',
};

/** Condições oferecidas na composição da meta. */
export const COMPOSITION_CONDITIONS: ConditionOperator[] = ['igual', 'diferente', 'contem'];
