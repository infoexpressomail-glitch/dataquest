// Mapeamento entre a linha da tabela `respostas` (snake_case, Postgres) e o tipo
// TypeScript `InterviewSubmission` (camelCase) usado pelo frontend — ver src/types.ts.
// Segue o mesmo padrão de api/_lib/surveyMapper.ts.

export interface SubmissionRow {
  id: string;
  codigo_pesquisa: string;
  pesquisa_id: string;
  pesquisa_nome: string;
  pesquisador_id: string | null;
  pesquisador_nome: string;
  data_hora: string;
  status: 'concluida' | 'em_andamento' | 'cancelada';
  respostas: any[];
  geolocalizacao: any | null;
  audio_gravacao: any | null;
  respostas_alteradas_pelo_admin: boolean | null;
  historico_edicao: any[] | null;
}

export interface SubmissionDTO {
  id: string;
  codigoPesquisa: string;
  pesquisaId: string;
  pesquisaNome: string;
  pesquisadorId?: string;
  pesquisadorNome: string;
  dataHora: string;
  status: 'concluida' | 'em_andamento' | 'cancelada';
  respostas: any[];
  geolocalizacao?: any;
  audioGravacao?: any;
  respostasAlteradasPeloAdmin?: boolean;
  historicoEdicao?: any[];
}

export function rowToSubmissionDTO(row: SubmissionRow): SubmissionDTO {
  return {
    id: row.id,
    codigoPesquisa: row.codigo_pesquisa,
    pesquisaId: row.pesquisa_id,
    pesquisaNome: row.pesquisa_nome,
    pesquisadorId: row.pesquisador_id || undefined,
    pesquisadorNome: row.pesquisador_nome,
    dataHora: row.data_hora,
    status: row.status,
    respostas: row.respostas || [],
    geolocalizacao: row.geolocalizacao || undefined,
    audioGravacao: row.audio_gravacao || undefined,
    respostasAlteradasPeloAdmin: row.respostas_alteradas_pelo_admin || undefined,
    historicoEdicao: row.historico_edicao || undefined,
  };
}

/**
 * Converte o payload camelCase (InterviewSubmission) recebido do frontend para as
 * colunas snake_case da tabela `respostas`, pronto para insert/upsert no Supabase.
 * Valida os campos mínimos indispensáveis antes de montar a linha.
 */
export function submissionPayloadToRow(sub: Partial<SubmissionDTO>): { row?: Record<string, any>; error?: string } {
  if (!sub || typeof sub !== 'object') {
    return { error: 'Submissão inválida ou ausente.' };
  }
  if (!sub.id) return { error: 'Submissão sem id.' };
  if (!sub.pesquisaId) return { error: `Submissão ${sub.id} sem pesquisaId.` };
  if (!Array.isArray(sub.respostas)) return { error: `Submissão ${sub.id} sem respostas (deve ser um array).` };

  const row: Record<string, any> = {
    id: sub.id,
    codigo_pesquisa: sub.codigoPesquisa || '',
    pesquisa_id: sub.pesquisaId,
    pesquisa_nome: sub.pesquisaNome || '',
    pesquisador_id: sub.pesquisadorId || null,
    pesquisador_nome: sub.pesquisadorNome || 'Não identificado',
    data_hora: sub.dataHora || new Date().toISOString(),
    status: sub.status || 'concluida',
    respostas: sub.respostas,
    geolocalizacao: sub.geolocalizacao || null,
    audio_gravacao: sub.audioGravacao || null,
    respostas_alteradas_pelo_admin: sub.respostasAlteradasPeloAdmin || false,
    historico_edicao: sub.historicoEdicao || [],
  };

  return { row };
}
