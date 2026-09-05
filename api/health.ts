// GET /api/health — healthcheck. Mesmo contrato de resposta do server.ts original.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from('pesquisas')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return res.status(200).json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      surveysCount: count ?? 0,
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'degraded',
      serverTime: new Date().toISOString(),
      surveysCount: 0,
      error: err?.message,
    });
  }
}
