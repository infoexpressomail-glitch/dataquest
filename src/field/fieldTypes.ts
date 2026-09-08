/**
 * Modo Pesquisador — DataQuest
 * Tipos compartilhados do sub-app de campo.
 */
import { Collaborator, AccessProfile, Survey } from '../types';

export type FieldSection =
  | 'home'
  | 'pesquisas'
  | 'coleta'
  | 'metas'
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
  home: 'Início',
  pesquisas: 'Pesquisas',
  coleta: 'Coleta',
  metas: 'Metas',
  sync: 'Sincronizar',
};
