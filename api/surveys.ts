// GET  /api/surveys — listar todas as pesquisas armazenadas no servidor
// POST /api/surveys — criar nova pesquisa no servidor
// Mesmo contrato de server.ts original (rotas 2 e 6).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { rowToDTO, surveyPayloadToRow, SurveyRow } from './_lib/surveyMapper.js';

async function getSubmissionsCounts(surveyIds: string[]): Promise<Record<string, number>> {
  if (surveyIds.length === 0) return {};
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('respostas')
    .select('pesquisa_id')
    .in('pesquisa_id', surveyIds);

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data as { pesquisa_id: string }[]) {
    counts[row.pesquisa_id] = (counts[row.pesquisa_id] || 0) + 1;
  }
  return counts;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('pesquisas')
      .select('*')
      .order('atualizada_em', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: `Erro ao listar pesquisas: ${error.message}` });
    }

    const rows = (data || []) as SurveyRow[];
    const counts = await getSubmissionsCounts(rows.map((r) => r.id));
    const list = rows.map((r) => rowToDTO(r, counts[r.id] || 0));

    return res.status(200).json({ success: true, surveys: list });
  }

  if (req.method === 'POST') {
    const newSurveyData = req.body || {};
    const id = newSurveyData.id || `pesq_${Date.now()}`;

    const row = surveyPayloadToRow({ ...newSurveyData, id });
    row.versao = 1;
    row.server_version = 1;
    row.criada_em = newSurveyData.criadaEm || new Date().toISOString();
    row.atualizada_em = new Date().toISOString();
    row.em_andamento = newSurveyData.status === 'ativa';

    const { data, error } = await supabase.from('pesquisas').insert(row).select('*').single();

    if (error) {
      return res.status(500).json({ success: false, message: `Falha ao registrar nova pesquisa no servidor: ${error.message}` });
    }

    return res.status(201).json({
      success: true,
      survey: rowToDTO(data as SurveyRow, 0),
      message: 'Pesquisa criada com sucesso no servidor!',
    });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ success: false, message: 'Método não permitido.' });
}
