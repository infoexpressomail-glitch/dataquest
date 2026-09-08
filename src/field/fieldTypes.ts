/**
 * Modo Pesquisador — DataQuest
 * Tipos compartilhados do sub-app de campo.
 */
import { Collaborator, AccessProfile, Survey } from '../types';

export type FieldSection =
  | 'dashboard'
  | 'coleta'
  | 'sync';

/**
 * Sessão autenticada do pesquisador no sub-app de campo.
 * Contém o colaborador, o perfil e as pesquisas sincronizadas do servidor.
 */
export interface FieldSession {
  user: Collaborator;
  profile: AccessProfile;
  surveys: Survey[];
}

export const FIELD_SECTION_LABELS: Record<FieldSection, string> = {
  dashboard: 'Dashboard',
  coleta: 'Coleta',
  sync: 'Sincronização',
};
