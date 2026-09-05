// Cliente Supabase centralizado do FRONTEND.
// Usa exclusivamente a anon/public key — nunca a service role key aqui.
// As funções serverless (pasta /api) têm seu próprio cliente com a service role,
// veja api/_lib/supabaseAdmin.ts.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

/**
 * Retorna a instância singleton do cliente Supabase do frontend, ou null se as
 * variáveis de ambiente VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não estiverem
 * configuradas (o app continua funcionando em modo offline/simulado nesse caso).
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'MY_SUPABASE_URL') {
    return null;
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL !== 'MY_SUPABASE_URL' &&
    SUPABASE_URL.startsWith('http')
  );
}
