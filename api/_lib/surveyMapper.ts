// Mapeamento entre a linha da tabela `pesquisas` (snake_case, Postgres) e o tipo
// TypeScript `Survey` (camelCase) usado pelo frontend — ver src/types.ts.
// Mantém EXATAMENTE os mesmos nomes de campo já usados por serverSurveyService.ts.

export interface SurveyRow {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  status: 'ativa' | 'inativa' | 'excluida';
  habilitar_coleta_web: boolean;
  tipo_coleta_web: 'publico' | 'interno';
  colaborador_web_id: string | null;
  perguntas: any[];
  regras: any[];
  metas: any[];
  metas_globais: any[];
  pesquisadores_ids: string[];
  ciclo_atual: number;
  versao: number;
  criada_em: string;
  atualizada_em: string;
  em_andamento: boolean;
  server_version: number;
  dados_completos: any;
  // Plano amostral, cotas por sexo e configuração de áudio (migration 0002)
  data_inicio: string | null;
  data_fim: string | null;
  meta_total_coletas: number | null;
  nivel_confianca_percentual: number | null;
  margem_erro_percentual: number | null;
  populacao_universo: number | null;
  meta_sexo_masculino: number | null;
  meta_sexo_feminino: number | null;
  meta_sexo_outro: number | null;
  dias_previstos_campo: number | null;
  media_coletas_dia_pesquisador: number | null;
  reserva_tecnica_percentual: number | null;
  habilitar_gravacao_audio: boolean | null;
  gravar_audio_a_partir_pergunta_id: string | null;
  tempo_limite_gravacao_minutos: number | null;
}

export interface SurveyDTO {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  status: 'ativa' | 'inativa' | 'excluida';
  habilitarColetaWeb: boolean;
  tipoColetaWeb: 'publico' | 'interno';
  colaboradorWebId?: string;
  perguntas: any[];
  regras: any[];
  metas: any[];
  metasGlobais?: any[];
  pesquisadoresIds: string[];
  cicloAtual: number;
  versao: number;
  criadaEm: string;
  atualizadaEm: string;
  emAndamento?: boolean;
  serverVersion?: number;
  totalEntrevistasColetadas?: number;
  // Plano amostral, cotas por sexo e configuração de áudio (migration 0002)
  dataInicio?: string;
  dataFim?: string;
  metaTotalColetas?: number;
  nivelConfiancaPercentual?: number;
  margemErroPercentual?: number;
  populacaoUniverso?: number;
  metaSexoMasculino?: number;
  metaSexoFeminino?: number;
  metaSexoOutro?: number;
  diasPrevistosCampo?: number;
  mediaColetasDiaPesquisador?: number;
  reservaTecnicaPercentual?: number;
  habilitarGravacaoAudio?: boolean;
  gravarAudioAPartirPerguntaId?: string;
  tempoLimiteGravacaoMinutos?: number;
}

/**
 * Determina se a pesquisa está em andamento no servidor.
 * Mesma regra do server.ts original: ativa OU possui entrevistas coletadas OU
 * a flag em_andamento já está marcada.
 */
export function isSurveyInProgress(row: SurveyRow, submissionsCount: number): boolean {
  return row.status === 'ativa' || submissionsCount > 0 || !!row.em_andamento;
}

export function rowToDTO(row: SurveyRow, submissionsCount: number): SurveyDTO {
  const emAndamento = isSurveyInProgress(row, submissionsCount);
  return {
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    descricao: row.descricao,
    status: row.status,
    habilitarColetaWeb: row.habilitar_coleta_web,
    tipoColetaWeb: row.tipo_coleta_web,
    colaboradorWebId: row.colaborador_web_id || undefined,
    perguntas: row.perguntas || [],
    regras: row.regras || [],
    metas: row.metas || [],
    metasGlobais: row.metas_globais || [],
    pesquisadoresIds: row.pesquisadores_ids || [],
    cicloAtual: row.ciclo_atual,
    versao: row.versao,
    criadaEm: row.criada_em,
    atualizadaEm: row.atualizada_em,
    emAndamento,
    serverVersion: row.versao || 1,
    totalEntrevistasColetadas: submissionsCount,
    dataInicio: row.data_inicio || undefined,
    dataFim: row.data_fim || undefined,
    metaTotalColetas: row.meta_total_coletas ?? undefined,
    nivelConfiancaPercentual: row.nivel_confianca_percentual ?? undefined,
    margemErroPercentual: row.margem_erro_percentual ?? undefined,
    populacaoUniverso: row.populacao_universo ?? undefined,
    metaSexoMasculino: row.meta_sexo_masculino ?? undefined,
    metaSexoFeminino: row.meta_sexo_feminino ?? undefined,
    metaSexoOutro: row.meta_sexo_outro ?? undefined,
    diasPrevistosCampo: row.dias_previstos_campo ?? undefined,
    mediaColetasDiaPesquisador: row.media_coletas_dia_pesquisador ?? undefined,
    reservaTecnicaPercentual: row.reserva_tecnica_percentual ?? undefined,
    habilitarGravacaoAudio: row.habilitar_gravacao_audio ?? undefined,
    gravarAudioAPartirPerguntaId: row.gravar_audio_a_partir_pergunta_id || undefined,
    tempoLimiteGravacaoMinutos: row.tempo_limite_gravacao_minutos ?? undefined,
  };
}

/**
 * Converte o payload camelCase recebido do frontend (Partial<Survey>) para as
 * colunas snake_case da tabela `pesquisas`, pronto para insert/update no Supabase.
 * Campos ausentes no payload são omitidos (não sobrescrevem o valor existente).
 */
export function surveyPayloadToRow(survey: Partial<SurveyDTO>): Record<string, any> {
  const row: Record<string, any> = {};

  if (survey.id !== undefined) row.id = survey.id;
  if (survey.codigo !== undefined) row.codigo = survey.codigo;
  if (survey.nome !== undefined) row.nome = survey.nome;
  if (survey.descricao !== undefined) row.descricao = survey.descricao;
  if (survey.status !== undefined) row.status = survey.status;
  if (survey.habilitarColetaWeb !== undefined) row.habilitar_coleta_web = survey.habilitarColetaWeb;
  if (survey.tipoColetaWeb !== undefined) row.tipo_coleta_web = survey.tipoColetaWeb;
  if (survey.colaboradorWebId !== undefined) row.colaborador_web_id = survey.colaboradorWebId;
  if (survey.perguntas !== undefined) row.perguntas = survey.perguntas;
  if (survey.regras !== undefined) row.regras = survey.regras;
  if (survey.metas !== undefined) row.metas = survey.metas;
  if (survey.metasGlobais !== undefined) row.metas_globais = survey.metasGlobais;
  if (survey.pesquisadoresIds !== undefined) row.pesquisadores_ids = survey.pesquisadoresIds;
  if (survey.cicloAtual !== undefined) row.ciclo_atual = survey.cicloAtual;
  if (survey.criadaEm !== undefined) row.criada_em = survey.criadaEm;

  // Plano amostral, cotas por sexo e configuração de áudio (migration 0002)
  if (survey.dataInicio !== undefined) row.data_inicio = survey.dataInicio || null;
  if (survey.dataFim !== undefined) row.data_fim = survey.dataFim || null;
  if (survey.metaTotalColetas !== undefined) row.meta_total_coletas = survey.metaTotalColetas;
  if (survey.nivelConfiancaPercentual !== undefined) row.nivel_confianca_percentual = survey.nivelConfiancaPercentual;
  if (survey.margemErroPercentual !== undefined) row.margem_erro_percentual = survey.margemErroPercentual;
  if (survey.populacaoUniverso !== undefined) row.populacao_universo = survey.populacaoUniverso;
  if (survey.metaSexoMasculino !== undefined) row.meta_sexo_masculino = survey.metaSexoMasculino;
  if (survey.metaSexoFeminino !== undefined) row.meta_sexo_feminino = survey.metaSexoFeminino;
  if (survey.metaSexoOutro !== undefined) row.meta_sexo_outro = survey.metaSexoOutro;
  if (survey.diasPrevistosCampo !== undefined) row.dias_previstos_campo = survey.diasPrevistosCampo;
  if (survey.mediaColetasDiaPesquisador !== undefined) row.media_coletas_dia_pesquisador = survey.mediaColetasDiaPesquisador;
  if (survey.reservaTecnicaPercentual !== undefined) row.reserva_tecnica_percentual = survey.reservaTecnicaPercentual;
  if (survey.habilitarGravacaoAudio !== undefined) row.habilitar_gravacao_audio = survey.habilitarGravacaoAudio;
  if (survey.gravarAudioAPartirPerguntaId !== undefined) row.gravar_audio_a_partir_pergunta_id = survey.gravarAudioAPartirPerguntaId;
  if (survey.tempoLimiteGravacaoMinutos !== undefined) row.tempo_limite_gravacao_minutos = survey.tempoLimiteGravacaoMinutos;

  // dados_completos sempre acompanha o objeto inteiro recebido, para uso pelo
  // supabaseSyncService.ts e para nunca perder campos não mapeados explicitamente.
  row.dados_completos = survey;

  return row;
}
