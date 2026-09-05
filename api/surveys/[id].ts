// GET /api/surveys/:id — obter pesquisa específica no servidor
// PUT /api/surveys/:id — subir (upload/commit) alterações; exige syncToken válido
//                        quando a pesquisa está em andamento (erro 428 / SYNC_REQUIRED_BEFORE_UPLOAD)
// Mesmo contrato de server.ts original (rotas 3 e 5).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { isSurveyInProgress, rowToDTO, surveyPayloadToRow, SurveyRow } from '../_lib/surveyMapper.js';

async function getSubmissionsCount(supabase: ReturnType<typeof getSupabaseAdmin>, surveyId: string): Promise<number> {
  const { count } = await supabase
    .from('respostas')
    .select('*', { count: 'exact', head: true })
    .eq('pesquisa_id', surveyId);
  return count ?? 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query as { id: string };
  const supabase = getSupabaseAdmin();

  // -----------------------------------------------------------------------------
  // GET /api/surveys/:id
  // -----------------------------------------------------------------------------
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('pesquisas').select('*').eq('id', id).maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, message: `Erro no servidor: ${error.message}` });
    }
    if (!data) {
      return res.status(404).json({ success: false, message: 'Pesquisa não encontrada no servidor.' });
    }

    const submissionsCount = await getSubmissionsCount(supabase, id);
    return res.status(200).json({ success: true, survey: rowToDTO(data as SurveyRow, submissionsCount) });
  }

  // -----------------------------------------------------------------------------
  // PUT /api/surveys/:id
  // -----------------------------------------------------------------------------
  if (req.method === 'PUT') {
    const { survey, syncToken: bodyToken } = req.body || {};
    const headerToken = (req.headers['x-sync-token'] as string | undefined) || undefined;
    const providedToken = headerToken || bodyToken;

    const { data: existingData, error: fetchError } = await supabase
      .from('pesquisas')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      return res.status(500).json({ success: false, message: `Erro no servidor: ${fetchError.message}` });
    }

    // Se não existir, tratamos como inclusão (mesmo comportamento do server.ts original)
    if (!existingData) {
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Pesquisa não encontrada no servidor.' });
      }

      const row = surveyPayloadToRow({ ...survey, id });
      row.versao = 1;
      row.server_version = 1;
      row.criada_em = survey.criadaEm || new Date().toISOString();
      row.atualizada_em = new Date().toISOString();
      row.em_andamento = survey.status === 'ativa';

      const { data: inserted, error: insertError } = await supabase
        .from('pesquisas')
        .insert(row)
        .select('*')
        .single();

      if (insertError) {
        return res.status(500).json({ success: false, message: `Erro ao registrar pesquisa: ${insertError.message}` });
      }

      return res.status(200).json({
        success: true,
        survey: rowToDTO(inserted as SurveyRow, 0),
        message: 'Pesquisa registrada com sucesso no servidor.',
      });
    }

    const existing = existingData as SurveyRow;
    const subsCount = await getSubmissionsCount(supabase, id);
    const emAndamento = isSurveyInProgress(existing, subsCount);

    // VERIFICAÇÃO MANDATÓRIA: pesquisa em andamento exige token de sincronização prévia válido.
    if (emAndamento) {
      if (!providedToken) {
        return res.status(428).json({
          success: false,
          error: 'SYNC_REQUIRED_BEFORE_UPLOAD',
          message: `A pesquisa "${existing.nome}" está EM ANDAMENTO com ${subsCount} entrevistas coletadas. É OBRIGATÓRIO sincronizar com o servidor antes de subir qualquer alteração ou ajuste.`,
        });
      }

      const { data: tokenRow, error: tokenError } = await supabase
        .from('sync_tokens')
        .select('*')
        .eq('token', providedToken)
        .maybeSingle();

      if (tokenError) {
        return res.status(500).json({ success: false, message: `Erro ao validar token: ${tokenError.message}` });
      }

      const now = Date.now();
      const isValid = tokenRow && tokenRow.survey_id === id && new Date(tokenRow.expires_at).getTime() > now;

      if (!isValid) {
        return res.status(428).json({
          success: false,
          error: 'SYNC_REQUIRED_BEFORE_UPLOAD',
          message: 'A autorização de sincronização prévia expirou ou é inválida. Você precisa sincronizar novamente com o servidor antes de subir as alterações.',
        });
      }

      // Consome o token para prevenir reuso
      await supabase.from('sync_tokens').delete().eq('token', providedToken);
    }

    const nextVersao = (existing.versao || 1) + 1;
    const row = surveyPayloadToRow(survey || {});
    delete row.id; // nunca sobrescreve a PK no update
    row.versao = nextVersao;
    row.server_version = nextVersao;
    row.atualizada_em = new Date().toISOString();
    row.em_andamento = emAndamento;

    const { data: updated, error: updateError } = await supabase
      .from('pesquisas')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return res.status(500).json({ success: false, message: `Erro ao atualizar pesquisa: ${updateError.message}` });
    }

    return res.status(200).json({
      success: true,
      survey: rowToDTO(updated as SurveyRow, subsCount),
      message: `Alterações subidas com sucesso para o servidor! Versão atualizada para v${nextVersao}.`,
    });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ success: false, message: 'Método não permitido.' });
}
