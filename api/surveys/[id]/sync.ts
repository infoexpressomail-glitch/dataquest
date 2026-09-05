// POST /api/surveys/:id/sync — SINCRONIZAÇÃO PRÉVIA MANDATÓRIA
// Valida o estado com o servidor antes de permitir subir qualquer alteração em
// pesquisa em andamento, e emite um token de autorização de upload válido por 15 min.
// Mesmo contrato de server.ts original (rota 4). O token agora é persistido na
// tabela `sync_tokens` (Postgres) em vez de um Map em memória, porque funções
// serverless não mantêm estado entre invocações.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { isSurveyInProgress, rowToDTO, surveyPayloadToRow, SurveyRow } from '../../_lib/surveyMapper.js';

function generateSyncToken(): string {
  const randomSuffix = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `SYNC-AUTH-${Date.now()}-${randomSuffix}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  const { id } = req.query as { id: string };
  const { clientDraft } = req.body || {};
  const supabase = getSupabaseAdmin();

  let { data: existing, error: fetchError } = await supabase
    .from('pesquisas')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return res.status(500).json({ success: false, message: `Erro no servidor: ${fetchError.message}` });
  }

  // Se não existir ainda no repositório mas foi enviada no draft (criada offline)
  if (!existing && clientDraft) {
    const row = surveyPayloadToRow({ ...clientDraft, id });
    row.versao = clientDraft.versao || 1;
    row.server_version = clientDraft.versao || 1;
    row.em_andamento = clientDraft.status === 'ativa';
    row.criada_em = clientDraft.criadaEm || new Date().toISOString();
    row.atualizada_em = new Date().toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from('pesquisas')
      .insert(row)
      .select('*')
      .single();

    if (insertError) {
      return res.status(500).json({ success: false, message: `Erro ao registrar pesquisa: ${insertError.message}` });
    }
    existing = inserted;
  }

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Pesquisa não localizada no servidor para sincronização.',
    });
  }

  const survey = existing as SurveyRow;
  const { count } = await supabase
    .from('respostas')
    .select('*', { count: 'exact', head: true })
    .eq('pesquisa_id', id);
  const subsCount = count ?? 0;

  const emAndamento = isSurveyInProgress(survey, subsCount);

  // Analisa possíveis divergências ou impacto nas coletas ativas
  const divergences: string[] = [];
  if (clientDraft && clientDraft.perguntas) {
    const clientQuestionIds = new Set((clientDraft.perguntas || []).map((q: any) => q.id));
    const removedCount = (survey.perguntas || []).filter((q: any) => !clientQuestionIds.has(q.id)).length;
    if (removedCount > 0 && subsCount > 0) {
      divergences.push(
        `Atenção: ${removedCount} pergunta(s) foram excluídas localmente enquanto existem ${subsCount} entrevistas coletadas em campo.`
      );
    }
  }

  // Gera e persiste o token de autorização de upload, válido por 15 minutos
  const syncToken = generateSyncToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const { error: tokenInsertError } = await supabase.from('sync_tokens').insert({
    token: syncToken,
    survey_id: id,
    client_version: clientDraft?.versao || survey.versao || 1,
    expires_at: expiresAt.toISOString(),
  });

  if (tokenInsertError) {
    return res.status(500).json({ success: false, message: `Erro ao gerar token de sincronização: ${tokenInsertError.message}` });
  }

  return res.status(200).json({
    success: true,
    emAndamento,
    serverVersion: survey.versao || 1,
    syncToken,
    expiresAt: expiresAt.toISOString(),
    submissionsCount: subsCount,
    message: emAndamento
      ? `Sincronização com o servidor validada com sucesso! A pesquisa em andamento possui ${subsCount} entrevista(s) vinculada(s). Autorização de upload liberada.`
      : 'Sincronização com o servidor efetuada com sucesso. Pesquisa autorizada para upload.',
    divergences,
    serverSurvey: rowToDTO(survey, subsCount),
  });
}
