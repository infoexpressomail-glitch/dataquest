import { Survey } from '../types';
import { logSyncEventToDB } from '../utils/indexedDBStorage';
import { isSupabaseBrowserConfigured } from './supabaseClient';
import { uploadSurveyToServer } from './serverSurveyService';

// ─────────────────────────────────────────────────────────────────────────────
// POR QUE ESTE ARQUIVO NÃO ESCREVE MAIS DIRETO NO SUPABASE A PARTIR DO NAVEGADOR
// ─────────────────────────────────────────────────────────────────────────────
// As políticas de RLS da tabela `pesquisas` (supabase/migrations/0001_initial_schema.sql)
// só liberam escrita para quem tem uma sessão REAL do Supabase Auth — elas checam
// `auth.uid()` via `public.has_permission()` / `public.current_permissions()`.
//
// Hoje o DataQuest nunca cria essa sessão: o login do painel web compara a senha no
// próprio frontend contra o registro em memória/mockData, e o login do app de campo
// (`POST /api/auth`) autentica contra a função `autenticar_campo` usando a
// SUPABASE_SERVICE_ROLE_KEY no servidor — nenhum dos dois chama
// `supabase.auth.signInWithPassword` (ver seção "Sobre autenticação" do README).
//
// Ou seja: o cliente anônimo do navegador (`supabaseClient.ts`) NUNCA fica autenticado
// aos olhos do RLS, então qualquer `insert`/`update`/`upsert` feito diretamente daqui
// seria sempre rejeitado em produção com RLS habilitado (mesmo que pareça funcionar
// em ambientes onde as variáveis de ambiente ainda não estão configuradas e o app cai
// no modo simulado).
//
// A persistência de verdade já existe e funciona: as rotas `/api/surveys*` usam a
// SUPABASE_SERVICE_ROLE_KEY no servidor (que ignora RLS por design) — é o mesmo
// caminho usado por `serverSurveyService.ts`. Este arquivo agora delega para lá,
// mantendo os mesmos nomes/contrato usados pelo restante do app (`isSupabaseConfigured`,
// `syncSurveyToSupabase`, `syncBatchSurveysToSupabase`), para não exigir nenhuma
// mudança em `AppContext.tsx`.

export function isSupabaseConfigured(): boolean {
  return isSupabaseBrowserConfigured();
}

export interface SupabaseSyncResult {
  success: boolean;
  mode: 'live' | 'simulated';
  message: string;
  error?: string;
  timestamp: string;
}

/**
 * Transmite uma pesquisa para o servidor central (que persiste no Supabase com a
 * service role, contornando o RLS). Respeita a sincronização prévia mandatória:
 * se a pesquisa estiver em andamento sem um syncToken válido, retorna erro
 * `SYNC_REQUIRED_BEFORE_UPLOAD` em vez de tentar forçar a escrita.
 */
export async function syncSurveyToSupabase(survey: Survey): Promise<SupabaseSyncResult> {
  const timestamp = new Date().toISOString();

  try {
    const result = await uploadSurveyToServer(survey);

    if (result.success) {
      await logSyncEventToDB({
        type: 'SUPABASE_SYNC_SURVEY',
        status: 'success',
        details: `Pesquisa "${survey.nome}" (${survey.codigo}) sincronizada com o servidor central.`,
      });

      return {
        success: true,
        mode: 'live',
        message: result.message || 'Pesquisa sincronizada com o servidor central com sucesso.',
        timestamp,
      };
    }

    await logSyncEventToDB({
      type: 'SUPABASE_SYNC_SURVEY',
      status: 'failed',
      details: `Falha ao sincronizar pesquisa "${survey.nome}" com o servidor: ${result.message}`,
    });

    return {
      success: false,
      mode: 'live',
      message: result.message || 'Falha ao sincronizar com o servidor central.',
      error: result.error,
      timestamp,
    };
  } catch (err: any) {
    console.error('[Sync Error]', err);
    await logSyncEventToDB({
      type: 'SUPABASE_SYNC_SURVEY',
      status: 'failed',
      details: `Falha ao sincronizar pesquisa "${survey.nome}": ${err?.message || err}`,
    });

    return {
      success: false,
      mode: 'live',
      message: `Erro na comunicação com o servidor: ${err?.message || 'Falha de rede'}`,
      error: err?.message,
      timestamp,
    };
  }
}

/**
 * Transmite um lote de pesquisas pendentes para o servidor central, uma a uma
 * (cada uma passa pela mesma validação de sincronização prévia mandatória).
 */
export async function syncBatchSurveysToSupabase(
  surveys: Survey[]
): Promise<{ success: boolean; count: number; mode: 'live' | 'simulated'; message: string }> {
  if (surveys.length === 0) {
    return {
      success: true,
      count: 0,
      mode: isSupabaseConfigured() ? 'live' : 'simulated',
      message: 'Nenhuma pesquisa pendente de sincronização.',
    };
  }

  let successCount = 0;
  const failures: string[] = [];

  for (const survey of surveys) {
    const res = await syncSurveyToSupabase(survey);
    if (res.success) {
      successCount++;
    } else {
      failures.push(`${survey.nome}: ${res.message}`);
    }
  }

  await logSyncEventToDB({
    type: 'SUPABASE_BATCH_SYNC',
    status: failures.length === 0 ? 'success' : 'failed',
    details:
      failures.length === 0
        ? `${successCount} pesquisa(s) do cache IndexedDB sincronizadas em lote com o servidor.`
        : `${successCount}/${surveys.length} sincronizadas. Falhas: ${failures.join(' | ')}`,
  });

  return {
    success: failures.length === 0,
    count: successCount,
    mode: 'live',
    message:
      failures.length === 0
        ? `${successCount} pesquisa(s) sincronizadas com o servidor com sucesso!`
        : `${successCount}/${surveys.length} pesquisa(s) sincronizadas. ${failures.length} falharam.`,
  };
}

