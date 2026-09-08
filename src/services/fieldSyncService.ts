import { fetchFieldSurveys } from './fieldApi';
import { FieldSession } from '../field/fieldTypes';
import { persistFieldSession } from './fieldSessionStore';

/**
 * Re-sincroniza as pesquisas do pesquisador com o servidor central.
 *
 * Chama GET /api/collaborators/:id/pesquisas e devolve uma NOVA FieldSession
 * com as pesquisas atualizadas (mesmo colaborador e perfil). Também persiste a
 * sessão atualizada em sessionStorage.
 *
 * Útil para o botão "Re-sincronizar pesquisas" na tela de Sincronização e para
 * refazer o download das políticas de acesso após mudanças na coordenação.
 *
 * @throws {Error} com mensagem amigável em caso de falha de rede/HTTP.
 */
export async function resyncFieldSurveys(session: FieldSession): Promise<FieldSession> {
  const result = await fetchFieldSurveys(session.user.id);

  const updated: FieldSession = {
    user: session.user,
    profile: session.profile,
    surveys: result.pesquisas,
  };

  persistFieldSession(updated);
  return updated;
}
