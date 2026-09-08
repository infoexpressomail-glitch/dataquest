// GET /api/collaborators/:id/pesquisas — Pesquisas liberadas para o pesquisador de campo.
//
// Replica, no servidor, a regra de visibilidade centralizada em
// src/utils/researcherUtils.ts (isSurveyVisibleToResearcher):
//   - a pesquisa precisa estar VINCULADA ao colaborador
//     (pesquisas.pesquisadores_ids contém o id do colaborador);
//   - e estar ATIVA (não passou da data_fim); OU
//   - estar CONCLUÍDA pela coordenação, porém RE-HABILITADA para este login
//     (colaboradores.pesquisas_reabilitadas_ids contém a pesquisa).
// Pesquisas excluídas/inativas não aparecem.
//
// É o endpoint que o botão "Sincronizar" da tela de login de campo chama para
// baixar as pesquisas e políticas relacionadas àquele pesquisador.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { rowToDTO, SurveyRow } from '../../_lib/surveyMapper.js';

function isSurveyPassed(row: SurveyRow): boolean {
  if (row.status === 'excluida' || row.status === 'inativa') return true;
  if (!row.data_fim) return false;
  try {
    const end = new Date(row.data_fim);
    end.setHours(23, 59, 59, 999);
    return Date.now() > end.getTime();
  } catch {
    return false;
  }
}

async function getSubmissionsCount(supabase: ReturnType<typeof getSupabaseAdmin>, surveyId: string): Promise<number> {
  const { count } = await supabase
    .from('respostas')
    .select('*', { count: 'exact', head: true })
    .eq('pesquisa_id', surveyId);
  return count ?? 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  const { id } = req.query as { id?: string };
  if (!id) {
    return res.status(400).json({ success: false, message: 'Informe o id do colaborador.' });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Busca o colaborador para saber quais pesquisas foram re-habilitadas para ele
    const { data: colab, error: colabErr } = await supabase
      .from('colaboradores')
      .select('id, pesquisas_reabilitadas_ids')
      .eq('id', id)
      .maybeSingle();

    if (colabErr) {
      return res.status(500).json({ success: false, message: `Erro ao consultar colaborador: ${colabErr.message}` });
    }
    if (!colab) {
      return res.status(404).json({ success: false, message: 'Colaborador não encontrado.' });
    }

    const reabilitadas: string[] = colab.pesquisas_reabilitadas_ids || [];

    // Busca todas as pesquisas vinculadas ao colaborador
    const { data: rows, error: surveysErr } = await supabase
      .from('pesquisas')
      .select('*')
      .contains('pesquisadores_ids', [id]);

    if (surveysErr) {
      return res.status(500).json({ success: false, message: `Erro ao consultar pesquisas: ${surveysErr.message}` });
    }

    const list = [];
    for (const row of (rows || []) as SurveyRow[]) {
      // Regra de visibilidade replicada no servidor
      if (row.status === 'excluida' || row.status === 'inativa') continue;
      if (row.status === 'concluida') {
        if (!reabilitadas.includes(row.id)) continue;
      } else if (row.status === 'ativa') {
        if (isSurveyPassed(row)) continue;
      } else {
        continue;
      }
      const count = await getSubmissionsCount(supabase, row.id);
      list.push(rowToDTO(row, count));
    }

    return res.status(200).json({
      success: true,
      pesquisadorId: id,
      pesquisas: list,
      count: list.length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Falha ao buscar pesquisas do pesquisador: ${err?.message || err}`,
    });
  }
}
