// Cliente Supabase do BACKEND (funções serverless da Vercel).
// Usa a SUPABASE_SERVICE_ROLE_KEY, que ignora RLS — por isso este arquivo NUNCA deve
// ser importado por código que roda no navegador. Ele só é usado dentro de /api/*.

import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Configuração do Supabase ausente no servidor: defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente da Vercel.'
    );
  }

  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}
