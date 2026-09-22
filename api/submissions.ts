// GET  /api/submissions?pesquisaId=... — lista entrevistas coletadas (opcionalmente filtradas por pesquisa)
// POST /api/submissions — grava em lote as entrevistas coletadas em campo (upsert por id,
//      então é seguro reenviar o mesmo item sem duplicar caso o cliente tente de novo).
//
// Sem este endpoint, uma entrevista coletada em campo nunca saía do navegador do
// pesquisador: ficava só em memória/IndexedDB local e a tabela `respostas` do Supabase
// nunca recebia escrita nenhuma (ver histórico de auditoria do projeto).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { rowToSubmissionDTO, submissionPayloadToRow, SubmissionRow } from './_lib/submissionMapper.js';
import { requireSession, requirePermission } from './_lib/session.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // F1 — exige sessão válida em qualquer método.
  const session = requireSession(req, res);
  if (!session) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    // Consultar entrevistas coletadas exige acesso ao módulo de respostas.
    if (!requirePermission(res, session, ['respostas_acesso'])) return;
    const pesquisaId = typeof req.query.pesquisaId === 'string' ? req.query.pesquisaId : undefined;

    let query = supabase.from('respostas').select('*').order('data_hora', { ascending: false });
    if (pesquisaId) query = query.eq('pesquisa_id', pesquisaId);

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ success: false, message: `Erro ao listar entrevistas: ${error.message}` });
    }

    const list = ((data || []) as SubmissionRow[]).map(rowToSubmissionDTO);
    return res.status(200).json({ success: true, submissions: list, count: list.length });
  }

  if (req.method === 'POST') {
    // Quem grava entrevista é o pesquisador de campo (que não tem
    // respostas_acesso) OU um perfil de gestão com o módulo de respostas.
    if (!session.pesquisador && !requirePermission(res, session, ['respostas_acesso'])) return;
    const body = (req.body || {}) as { submissions?: any[]; submission?: any };
    const incoming: any[] = Array.isArray(body.submissions)
      ? body.submissions
      : body.submission
      ? [body.submission]
      : [];

    if (incoming.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhuma submissão informada (envie "submission" ou "submissions").' });
    }

    const rows: Record<string, any>[] = [];
    const results: { id: string; success: boolean; message?: string }[] = [];

    for (const sub of incoming) {
      const { row, error } = submissionPayloadToRow(sub);
      if (error || !row) {
        results.push({ id: sub?.id || '(sem id)', success: false, message: error || 'Payload inválido.' });
        continue;
      }
      rows.push(row);
    }

    // Um upsert por item (não em lote): assim uma entrevista com dado inválido (ex.:
    // referenciando uma pesquisa já excluída) não derruba as demais que são válidas —
    // um INSERT em lote no Postgres é atômico e uma linha ruim reprova todas.
    for (const row of rows) {
      const { error } = await supabase.from('respostas').upsert(row, { onConflict: 'id' });
      results.push({ id: row.id, success: !error, message: error?.message });
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    return res.status(failedCount > 0 && successCount === 0 ? 500 : 200).json({
      success: failedCount === 0,
      results,
      message:
        failedCount === 0
          ? `${successCount} entrevista(s) gravada(s) com sucesso no servidor.`
          : `${successCount} gravada(s), ${failedCount} falharam.`,
    });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ success: false, message: 'Método não permitido.' });
}
