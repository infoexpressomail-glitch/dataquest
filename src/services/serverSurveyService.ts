import { Survey, ServerSyncCheckResult } from '../types';

/**
 * Cliente de Comunicação com o Servidor Central de Pesquisas
 * Responsável por garantir que qualquer alteração em pesquisa em andamento
 * passe obrigatoriamente por sincronização prévia antes de subir (upload/commit).
 */

const API_BASE = '/api';

export interface ServerUploadResult {
  success: boolean;
  survey?: Survey;
  error?: string;
  message: string;
  requiresSync?: boolean;
}

/**
 * Verifica se a API do servidor central está online e responsiva
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Recupera todas as pesquisas armazenadas no servidor central
 */
export async function fetchServerSurveys(): Promise<{ success: boolean; surveys: Survey[]; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/surveys`);
    if (!res.ok) {
      throw new Error(`Servidor respondeu com código ${res.status}`);
    }
    const data = await res.json();
    return { success: true, surveys: data.surveys || [] };
  } catch (err: any) {
    return { success: false, surveys: [], message: err.message || 'Falha ao conectar com o servidor' };
  }
}

/**
 * Recupera uma pesquisa específica armazenada no servidor
 */
export async function fetchServerSurveyById(surveyId: string): Promise<{ success: boolean; survey?: Survey; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/surveys/${encodeURIComponent(surveyId)}`);
    if (!res.ok) {
      throw new Error(`Pesquisa não encontrada ou erro no servidor (${res.status})`);
    }
    const data = await res.json();
    return { success: true, survey: data.survey };
  } catch (err: any) {
    return { success: false, message: err.message || 'Falha ao buscar pesquisa no servidor' };
  }
}

/**
 * Realiza a SINCRONIZAÇÃO PRÉVIA MANDATÓRIA com o Servidor Central
 * Antes de subir qualquer alteração ou ajuste em pesquisa em andamento:
 * 1. Compara a versão local com a do servidor
 * 2. Checa integridade de coletas ativas em campo
 * 3. Valida ausência de conflitos
 * 4. Obtém o token de autorização de upload emitido pelo servidor
 */
export async function syncSurveyWithServer(
  surveyId: string,
  clientDraft?: Partial<Survey>
): Promise<ServerSyncCheckResult> {
  try {
    const res = await fetch(`${API_BASE}/surveys/${encodeURIComponent(surveyId)}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        surveyId,
        clientDraft,
        timestamp: new Date().toISOString(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        emAndamento: data.emAndamento ?? true,
        serverVersion: data.serverVersion ?? 1,
        submissionsCount: data.submissionsCount ?? 0,
        message: data.message || 'Falha na validação de sincronização com o servidor.',
        divergences: data.divergences,
      };
    }

    return {
      success: true,
      emAndamento: data.emAndamento ?? true,
      serverVersion: data.serverVersion,
      syncToken: data.syncToken,
      expiresAt: data.expiresAt,
      submissionsCount: data.submissionsCount,
      message: data.message || 'Sincronização com o servidor validada com sucesso!',
      serverSurvey: data.serverSurvey,
    };
  } catch (err: any) {
    return {
      success: false,
      emAndamento: true,
      serverVersion: 1,
      submissionsCount: 0,
      message: `Erro ao conectar com o servidor para sincronização: ${err.message || err}`,
    };
  }
}

/**
 * Sobe (Upload/Commit) as alterações para o Servidor Central
 * Se a pesquisa estiver em andamento, o servidor EXIGE o syncToken obtido na etapa de sincronização prévia.
 */
export async function uploadSurveyToServer(
  survey: Survey,
  syncToken?: string
): Promise<ServerUploadResult> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (syncToken) {
      headers['x-sync-token'] = syncToken;
    }

    const res = await fetch(`${API_BASE}/surveys/${encodeURIComponent(survey.id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        survey,
        syncToken,
        updatedAt: new Date().toISOString(),
      }),
    });

    const data = await res.json();

    // Se o servidor retornar 428 (Precondition Required) ou erro de sincronização pendente
    if (res.status === 428 || data.error === 'SYNC_REQUIRED_BEFORE_UPLOAD') {
      return {
        success: false,
        requiresSync: true,
        error: data.error,
        message: data.message || 'Sincronização com o servidor necessária antes de subir qualquer alteração.',
      };
    }

    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'SERVER_ERROR',
        message: data.message || `Erro no servidor (${res.status}) ao subir pesquisa.`,
      };
    }

    return {
      success: true,
      survey: data.survey,
      message: data.message || 'Pesquisa e alterações subidas com sucesso para o servidor!',
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: `Não foi possível contatar o servidor para subir as alterações: ${err.message || err}`,
    };
  }
}

/**
 * Cria uma nova pesquisa diretamente no servidor
 */
export async function createServerSurvey(survey: Survey): Promise<ServerUploadResult> {
  try {
    const res = await fetch(`${API_BASE}/surveys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(survey),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'CREATE_ERROR',
        message: data.message || 'Falha ao registrar nova pesquisa no servidor.',
      };
    }

    return {
      success: true,
      survey: data.survey,
      message: 'Nova pesquisa criada com sucesso no servidor!',
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: `Erro ao enviar nova pesquisa para o servidor: ${err.message || err}`,
    };
  }
}
