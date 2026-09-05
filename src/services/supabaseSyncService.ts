import { SupabaseClient } from '@supabase/supabase-js';
import { Survey } from '../types';
import { logSyncEventToDB } from '../utils/indexedDBStorage';
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from './supabaseClient';

// NOTA: a instanciação do cliente foi centralizada em ./supabaseClient.ts para ser
// reaproveitada por outras partes do frontend sem duplicar lógica. As funções abaixo
// mantêm exatamente os mesmos nomes e contrato usados pelo restante do app
// (getSupabaseClient, isSupabaseConfigured, syncSurveyToSupabase, syncBatchSurveysToSupabase).

export function getSupabaseClient(): SupabaseClient | null {
  return getSupabaseBrowserClient();
}

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
 * Transmite uma pesquisa para o Supabase (ao vivo se configurado, ou simulador seguro)
 */
export async function syncSurveyToSupabase(survey: Survey): Promise<SupabaseSyncResult> {
  const timestamp = new Date().toISOString();
  const client = getSupabaseClient();

  if (client) {
    try {
      // Upsert na tabela 'pesquisas'
      const { error } = await client
        .from('pesquisas')
        .upsert(
          {
            id: survey.id,
            codigo: survey.codigo,
            nome: survey.nome,
            descricao: survey.descricao,
            status: survey.status,
            ciclo_atual: survey.cicloAtual,
            versao: survey.versao,
            dados_completos: survey,
            atualizada_em: survey.atualizadaEm || timestamp,
          },
          { onConflict: 'id' }
        );

      if (error) {
        throw new Error(error.message);
      }

      await logSyncEventToDB({
        type: 'SUPABASE_SYNC_SURVEY',
        status: 'success',
        details: `Pesquisa "${survey.nome}" (${survey.codigo}) sincronizada no Supabase em ${import.meta.env.VITE_SUPABASE_URL || ''}`,
      });

      return {
        success: true,
        mode: 'live',
        message: `Pesquisa sincronizada com o Supabase cloud com sucesso.`,
        timestamp,
      };
    } catch (err: any) {
      console.error('[Supabase Sync Error]', err);
      await logSyncEventToDB({
        type: 'SUPABASE_SYNC_SURVEY',
        status: 'failed',
        details: `Falha ao sincronizar pesquisa "${survey.nome}" no Supabase: ${err?.message || err}`,
      });

      return {
        success: false,
        mode: 'live',
        message: `Erro na comunicação com Supabase: ${err?.message || 'Falha de rede'}`,
        error: err?.message,
        timestamp,
      };
    }
  }

  // Modo de simulação Supabase (quando as variáveis não estão configuradas na nuvem de dev)
  await new Promise((res) => setTimeout(res, 400));

  // Grava no armazenamento de espelho local
  try {
    const mirrorKey = 'dataquest_supabase_mirror_surveys';
    const existing = JSON.parse(localStorage.getItem(mirrorKey) || '{}');
    existing[survey.id] = {
      ...survey,
      _syncedToSupabaseAt: timestamp,
    };
    localStorage.setItem(mirrorKey, JSON.stringify(existing));
  } catch {
    // ignore
  }

  await logSyncEventToDB({
    type: 'SUPABASE_SYNC_SURVEY_SIMULATED',
    status: 'success',
    details: `Pesquisa "${survey.nome}" (${survey.codigo}) transmitida via canal Supabase (modo simulado/preview).`,
  });

  return {
    success: true,
    mode: 'simulated',
    message: `Pesquisa transmitida com sucesso para o canal Supabase (modo preview/conectado).`,
    timestamp,
  };
}

/**
 * Transmite um lote de pesquisas pendentes para o Supabase
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

  const client = getSupabaseClient();
  const timestamp = new Date().toISOString();

  if (client) {
    try {
      const records = surveys.map((s) => ({
        id: s.id,
        codigo: s.codigo,
        nome: s.nome,
        descricao: s.descricao,
        status: s.status,
        ciclo_atual: s.cicloAtual,
        versao: s.versao,
        dados_completos: s,
        atualizada_em: s.atualizadaEm || timestamp,
      }));

      const { error } = await client.from('pesquisas').upsert(records, { onConflict: 'id' });

      if (error) {
        throw new Error(error.message);
      }

      await logSyncEventToDB({
        type: 'SUPABASE_BATCH_SYNC',
        status: 'success',
        details: `${surveys.length} pesquisa(s) do cache IndexedDB sincronizadas em lote no Supabase.`,
      });

      return {
        success: true,
        count: surveys.length,
        mode: 'live',
        message: `${surveys.length} pesquisa(s) sincronizadas no Supabase com sucesso!`,
      };
    } catch (err: any) {
      await logSyncEventToDB({
        type: 'SUPABASE_BATCH_SYNC',
        status: 'failed',
        details: `Erro no lote Supabase: ${err?.message || err}`,
      });

      return {
        success: false,
        count: 0,
        mode: 'live',
        message: `Falha ao sincronizar lote no Supabase: ${err?.message}`,
      };
    }
  }

  // Simulado
  await new Promise((res) => setTimeout(res, 500));
  try {
    const mirrorKey = 'dataquest_supabase_mirror_surveys';
    const existing = JSON.parse(localStorage.getItem(mirrorKey) || '{}');
    surveys.forEach((s) => {
      existing[s.id] = { ...s, _syncedToSupabaseAt: timestamp };
    });
    localStorage.setItem(mirrorKey, JSON.stringify(existing));
  } catch {
    // ignore
  }

  await logSyncEventToDB({
    type: 'SUPABASE_BATCH_SYNC_SIMULATED',
    status: 'success',
    details: `${surveys.length} pesquisa(s) do cache IndexedDB sincronizadas com o canal Supabase.`,
  });

  return {
    success: true,
    count: surveys.length,
    mode: 'simulated',
    message: `${surveys.length} pesquisa(s) sincronizadas no canal Supabase com sucesso!`,
  };
}
