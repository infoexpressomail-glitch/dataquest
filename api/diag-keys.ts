// GET /api/diag-keys — DIAGNÓSTICO TEMPORÁRIO das chaves do Supabase no servidor.
// Mostra apenas o FORMATO (prefixo curto) e o resultado de testes reais.
// NUNCA devolve a chave inteira. REMOVA este arquivo depois de resolver o problema.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function formato(k?: string): string {
  if (!k) return 'AUSENTE';
  if (k.startsWith('sb_secret_')) return 'sb_secret_… (chave NOVA, correta para backend)';
  if (k.startsWith('sb_publishable_')) return 'sb_publishable_… (chave pública — ERRADA para o backend)';
  if (k.startsWith('eyJ')) return 'eyJ… (JWT LEGADO — desativado, é este o problema)';
  return `formato desconhecido (${k.length} caracteres)`;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const resultado: Record<string, unknown> = {
    url_definida: Boolean(url),
    SUPABASE_SERVICE_ROLE_KEY: formato(key),
    VITE_SUPABASE_ANON_KEY_no_build: 'ver /api/diag-keys apenas informa o backend',
  };

  if (url && key) {
    const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const tabela = await c.from('pesquisas').select('id', { count: 'exact', head: true });
    const rpc = await c.rpc('autenticar_campo', { p_login: '__diag__', p_senha: '__diag__' });
    resultado.teste_from_pesquisas = tabela.error ? `FALHOU: ${tabela.error.message}` : 'OK';
    resultado.teste_rpc_autenticar_campo = rpc.error ? `FALHOU: ${rpc.error.message}` : 'OK (função alcançável)';
  }

  return res.status(200).json(resultado);
}
