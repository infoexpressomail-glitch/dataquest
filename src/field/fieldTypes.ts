/**
 * Modo Pesquisador — DataQuest
 * Tipos compartilhados do sub-app de campo.
 */
export type FieldSection =
  | 'dashboard'
  | 'coleta'
  | 'metas'
  | 'historico'
  | 'sync';

export const FIELD_SECTION_LABELS: Record<FieldSection, string> = {
  dashboard: 'Dashboard',
  coleta: 'Coleta',
  metas: 'Minhas Metas & Cotas',
  historico: 'Histórico',
  sync: 'Sincronização',
};
