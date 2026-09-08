import {
  GlobalDemographicTarget,
  InterviewSubmission,
  ResearcherQuotaAssignment,
} from '../types';

export const FAIXAS_ETARIAS_PADRAO = [
  '18 a 25 anos',
  '26 a 40 anos',
  '41 a 60 anos',
  'Acima de 60 anos',
];

export const OPCOES_SEXO_PADRAO = [
  'Feminino',
  'Masculino',
  'Outro / Não informado',
];

export const OPCOES_BAIRROS_PADRAO = [
  'Centro',
  'Praça da Matriz',
  'Zona Norte',
  'Zona Sul',
  'Jardim das Flores',
  'UBS Central',
  'Vila Mariana',
  'Bela Vista',
];

export const OPCOES_ESCOLARIDADE_PADRAO = [
  'Sem instrução',
  'Ensino Fundamental',
  'Ensino Médio',
  'Ensino Superior',
  'Pós-graduação',
];

/**
 * Valida se uma submissão de entrevista atende aos critérios demográficos da meta
 */
export function matchDemographicCriteria(
  submission: InterviewSubmission,
  target: GlobalDemographicTarget
): boolean {
  const { faixaEtaria, sexo, escolaridade, bairro } = target.criterios;

  // 1. Validação de Faixa Etária
  if (faixaEtaria && faixaEtaria !== 'Todas' && faixaEtaria !== 'Todos') {
    const ageAnswer = submission.respostas.find(
      (r) =>
        r.perguntaEnunciado.toLowerCase().includes('faixa etária') ||
        r.perguntaEnunciado.toLowerCase().includes('idade') ||
        r.perguntaCodigo === 'P02'
    );

    if (ageAnswer) {
      const respStr = Array.isArray(ageAnswer.resposta)
        ? ageAnswer.resposta.join(' ')
        : String(ageAnswer.resposta);

      const normalizedCriteria = faixaEtaria.toLowerCase();
      const normalizedResp = respStr.toLowerCase();

      if (!normalizedResp.includes(normalizedCriteria) && !normalizedCriteria.includes(normalizedResp)) {
        return false;
      }
    }
  }

  // 2. Validação de Sexo
  if (sexo && sexo !== 'Todos') {
    const genderAnswer = submission.respostas.find(
      (r) =>
        r.perguntaEnunciado.toLowerCase().includes('sexo') ||
        r.perguntaEnunciado.toLowerCase().includes('gênero')
    );

    if (genderAnswer) {
      const respStr = Array.isArray(genderAnswer.resposta)
        ? genderAnswer.resposta.join(' ')
        : String(genderAnswer.resposta);

      const normalizedGender = sexo.toLowerCase();
      const normalizedResp = respStr.toLowerCase();

      if (!normalizedResp.startsWith(normalizedGender.slice(0, 3))) {
        return false;
      }
    }
  }

  // 3. Validação de Escolaridade
  if (escolaridade && escolaridade !== 'Todos' && escolaridade !== 'Todas') {
    const eduAnswer = submission.respostas.find(
      (r) =>
        r.perguntaEnunciado.toLowerCase().includes('escolaridade') ||
        r.perguntaEnunciado.toLowerCase().includes('escolar') ||
        r.perguntaEnunciado.toLowerCase().includes('instrução') ||
        r.perguntaEnunciado.toLowerCase().includes('grau')
    );

    if (eduAnswer) {
      const respStr = Array.isArray(eduAnswer.resposta)
        ? eduAnswer.resposta.join(' ')
        : String(eduAnswer.resposta);

      const normalizedCriteria = escolaridade.toLowerCase();
      const normalizedResp = respStr.toLowerCase();

      if (
        !normalizedResp.includes(normalizedCriteria) &&
        !normalizedCriteria.includes(normalizedResp)
      ) {
        return false;
      }
    }
  }

  // 4. Validação de Bairro / Região
  if (bairro && bairro !== 'Todos' && bairro !== 'Todas') {
    const subBairro = submission.geolocalizacao?.bairro || '';
    const neighborhoodAnswer = submission.respostas.find(
      (r) =>
        r.perguntaEnunciado.toLowerCase().includes('bairro') ||
        r.perguntaEnunciado.toLowerCase().includes('região') ||
        r.perguntaEnunciado.toLowerCase().includes('unidade')
    );
    const respStr = neighborhoodAnswer
      ? Array.isArray(neighborhoodAnswer.resposta)
        ? neighborhoodAnswer.resposta.join(' ')
        : String(neighborhoodAnswer.resposta)
      : '';

    const matchesGeo = subBairro.toLowerCase().includes(bairro.toLowerCase());
    const matchesResp = respStr.toLowerCase().includes(bairro.toLowerCase());

    if (!matchesGeo && !matchesResp) {
      return false;
    }
  }

  return true;
}

export interface ResearcherIndividualProgressResult {
  assignment: ResearcherQuotaAssignment;
  cotaAlvo: number;
  cotaAtingida: number;
  percentual: number;
  restante: number;
  isConcluida: boolean;
  statusAlerta: 'sucesso' | 'quase_la' | 'em_andamento' | 'iniciando';
  coletasCorrespondentes: InterviewSubmission[];
}

/**
 * Calcula o progresso estritamente individual de um pesquisador para uma meta global em tempo real
 */
export function calculateResearcherIndividualProgress(
  target: GlobalDemographicTarget,
  submissions: InterviewSubmission[],
  researcherId: string
): ResearcherIndividualProgressResult | null {
  const assignment = target.atribuicoes.find((a) => a.pesquisadorId === researcherId);
  if (!assignment) return null;

  // Filtra as submissões concluídas do pesquisador para esta pesquisa
  const researcherSubmissions = submissions.filter(
    (s) =>
      s.pesquisaId === target.pesquisaId &&
      s.pesquisadorId === researcherId &&
      s.status === 'concluida'
  );

  // Submissões que atendem aos filtros demográficos
  const matchingSubmissions = researcherSubmissions.filter((sub) =>
    matchDemographicCriteria(sub, target)
  );

  // Combinamos o histórico gravado com as novas submissões em tempo real
  const computedCount = Math.max(assignment.cotaAtingida, matchingSubmissions.length);
  const alvo = assignment.cotaAlvo || 1;
  const percentual = Math.min(100, Math.round((computedCount / alvo) * 100));
  const restante = Math.max(0, alvo - computedCount);
  const isConcluida = computedCount >= alvo;

  let statusAlerta: 'sucesso' | 'quase_la' | 'em_andamento' | 'iniciando' = 'em_andamento';
  if (isConcluida) {
    statusAlerta = 'sucesso';
  } else if (percentual >= 80) {
    statusAlerta = 'quase_la';
  } else if (percentual <= 25) {
    statusAlerta = 'iniciando';
  }

  return {
    assignment,
    cotaAlvo: alvo,
    cotaAtingida: computedCount,
    percentual,
    restante,
    isConcluida,
    statusAlerta,
    coletasCorrespondentes: matchingSubmissions,
  };
}

export interface GlobalDemographicSummary {
  metaGlobalAlvo: number;
  metaGlobalAtingida: number;
  percentual: number;
  totalPesquisadoresVinculados: number;
  pesquisadoresConcluidos: number;
  status: 'concluida' | 'em_andamento' | 'pausada';
}

/**
 * Calcula o progresso global consolidado da meta somando o progresso de todos os pesquisadores
 */
export function calculateGlobalDemographicProgress(
  target: GlobalDemographicTarget,
  submissions: InterviewSubmission[]
): GlobalDemographicSummary {
  let somaAtingida = 0;
  let concluidos = 0;

  target.atribuicoes.forEach((atrib) => {
    const res = calculateResearcherIndividualProgress(target, submissions, atrib.pesquisadorId);
    if (res) {
      somaAtingida += res.cotaAtingida;
      if (res.isConcluida) {
        concluidos += 1;
      }
    } else {
      somaAtingida += atrib.cotaAtingida;
    }
  });

  const totalAlvo = target.metaGlobalAlvo || 1;
  const percentual = Math.min(100, Math.round((somaAtingida / totalAlvo) * 100));

  return {
    metaGlobalAlvo: target.metaGlobalAlvo,
    metaGlobalAtingida: somaAtingida,
    percentual,
    totalPesquisadoresVinculados: target.atribuicoes.length,
    pesquisadoresConcluidos: concluidos,
    status: target.status === 'pausada' ? 'pausada' : percentual >= 100 ? 'concluida' : 'em_andamento',
  };
}
