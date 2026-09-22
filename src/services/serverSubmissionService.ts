import { InterviewSubmission } from '../types';
import { apiFetch, setSessionToken } from './apiClient';

/**
 * Cliente de Comunicação com o Servidor Central de Entrevistas Coletadas
 * Responsável por enviar as entrevistas (InterviewSubmission) coletadas em campo —
 * seja de imediato quando online, seja da fila offline ao reconectar — para o
 * servidor central (que grava na tabela `respostas` com a service role).
 */

const API_BASE = '/api';

export interface SubmissionUploadItemResult {
  id: string;
  success: boolean;
  message?: string;
}

export interface SubmissionUploadResult {
  success: boolean;
  results: SubmissionUploadItemResult[];
  message: string;
}

/**
 * Envia uma ou mais entrevistas coletadas para o servidor central em uma única
 * chamada (upsert por id — seguro reenviar o mesmo item sem duplicar).
 */
export async function uploadSubmissionsToServer(
  submissions: InterviewSubmission[]
): Promise<SubmissionUploadResult> {
  if (submissions.length === 0) {
    return { success: true, results: [], message: 'Nenhuma entrevista para enviar.' };
  }

  try {
    const res = await apiFetch(`${API_BASE}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissions }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok && !data?.results) {
      return {
        success: false,
        results: submissions.map((s) => ({ id: s.id, success: false, message: data?.message || `Erro ${res.status}` })),
        message: data?.message || `Erro ${res.status} ao enviar entrevistas ao servidor.`,
      };
    }

    return {
      success: !!data.success,
      results: data.results || [],
      message: data.message || (data.success ? 'Entrevistas sincronizadas.' : 'Falha ao sincronizar entrevistas.'),
    };
  } catch (err: any) {
    return {
      success: false,
      results: submissions.map((s) => ({ id: s.id, success: false, message: err?.message || 'Falha de rede' })),
      message: `Erro na comunicação com o servidor: ${err?.message || 'Falha de rede'}`,
    };
  }
}

/**
 * Envia uma única entrevista coletada para o servidor central.
 */
export async function uploadSubmissionToServer(
  submission: InterviewSubmission
): Promise<{ success: boolean; message: string }> {
  const res = await uploadSubmissionsToServer([submission]);
  const item = res.results.find((r) => r.id === submission.id);
  return {
    success: item?.success ?? res.success,
    message: item?.message || res.message,
  };
}
