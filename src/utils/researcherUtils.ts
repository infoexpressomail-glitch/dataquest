import { Survey, Collaborator } from '../types';

/**
 * Checks if a survey has expired or passed its field collection period.
 * Note: a survey marked as `concluida` by the coordination is NOT "passed"
 * here — its visibility is governed by the per-researcher re-enable list.
 */
export function isSurveyPassed(survey: Survey): boolean {
  if (survey.status === 'excluida' || survey.status === 'inativa') {
    return true;
  }
  if (!survey.dataFim) {
    return false;
  }

  try {
    const end = new Date(survey.dataFim);
    // Set to end of the day
    end.setHours(23, 59, 59, 999);
    const now = new Date();
    return now.getTime() > end.getTime();
  } catch {
    return false;
  }
}

/**
 * Checks if a researcher was assigned to a given survey.
 *
 * Fonte de verdade única: `survey.pesquisadoresIds` — o mesmo campo usado por
 * `GET /api/collaborators/:id/pesquisas` (o que o app de campo realmente baixa) e
 * pela policy de RLS de `pesquisas`. `researcher.pesquisasVinculadasIds` é mantido
 * em sincronia com este campo sempre que o colaborador é salvo (ver
 * `saveCollaborator` em AppContext.tsx), mas não é mais consultado aqui: usar os
 * dois lados com OR é o que fazia uma pesquisa "removida" de um lado continuar
 * aparecendo no painel web mesmo depois de não ser mais entregue ao app de campo
 * (ver supabase/reconciliar_vinculos_pesquisador_pesquisa.sql).
 */
export function isResearcherAssignedToSurvey(
  survey: Survey,
  researcher: Collaborator
): boolean {
  return Array.isArray(survey.pesquisadoresIds) && survey.pesquisadoresIds.includes(researcher.id);
}

/**
 * Returns true if this specific researcher (login) was granted a re-enable
 * for an already-concluded survey.
 */
export function isSurveyReEnabledForResearcher(
  survey: Survey,
  researcher: Collaborator
): boolean {
  return (
    survey.status === 'concluida' &&
    Array.isArray(researcher.pesquisasReabilitadasIds) &&
    researcher.pesquisasReabilitadasIds.includes(survey.id)
  );
}

/**
 * A survey is visible to a researcher when:
 *   1. It is assigned to that researcher; AND
 *   2. It is ACTIVE and has not passed its end date; OR
 *   3. It is CONCLUDED by the coordination but was explicitly re-enabled
 *      for this specific login (researcher.pesquisasReabilitadasIds).
 *
 * User requirement:
 * "A tela do pesquisador deve ser o mais simples possível: se uma pesquisa já
 * foi finalizada (concluída) para esse pesquisador, ela não precisa aparecer,
 * a não ser que seja novamente habilitada para esse login."
 */
export function isSurveyVisibleToResearcher(
  survey: Survey,
  researcher: Collaborator
): boolean {
  // 1. Must be assigned to this researcher
  if (!isResearcherAssignedToSurvey(survey, researcher)) {
    return false;
  }

  // 2. Excluded surveys are never visible
  if (survey.status === 'excluida') {
    return false;
  }

  // 3. Concluded survey: only visible if re-enabled for this login
  if (survey.status === 'concluida') {
    return isSurveyReEnabledForResearcher(survey, researcher);
  }

  // 4. Otherwise must be active and not have passed its end date
  if (survey.status !== 'ativa') {
    return false;
  }
  if (isSurveyPassed(survey)) {
    return false;
  }

  return true;
}

/**
 * Returns only the surveys that are visible to the given researcher.
 */
export function filterResearcherVisibleSurveys(
  surveys: Survey[],
  researcher: Collaborator
): Survey[] {
  return surveys.filter((s) => isSurveyVisibleToResearcher(s, researcher));
}

/**
 * Legacy alias — a survey is "active and assigned" when it is ACTIVE
 * (not concluded), assigned and not passed. Concluded surveys are NOT
 * included here; use filterResearcherVisibleSurveys for the full rule.
 */
export function isSurveyActiveAndAssignedToResearcher(
  survey: Survey,
  researcher: Collaborator
): boolean {
  return isSurveyVisibleToResearcher(survey, researcher);
}

/**
 * Legacy alias for the full visibility filter.
 */
export function filterResearcherActiveSurveys(
  surveys: Survey[],
  researcher: Collaborator
): Survey[] {
  return filterResearcherVisibleSurveys(surveys, researcher);
}
