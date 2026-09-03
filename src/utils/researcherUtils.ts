import { Survey, Collaborator } from '../types';

/**
 * Checks if a survey has expired or passed its field collection period
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
 * Checks if a survey is active, assigned to the given researcher, and has not passed its expiration date.
 * User requirement:
 * "O pesquisador só precisa ver as pesquisas que estão ativas atribuídas a ele, as que já passaram não precisam mais aparecer."
 */
export function isSurveyActiveAndAssignedToResearcher(
  survey: Survey,
  researcher: Collaborator
): boolean {
  // 1. Must be active (not inativa, not excluida)
  if (survey.status !== 'ativa') {
    return false;
  }

  // 2. Must be assigned to this researcher (via survey.pesquisadoresIds or researcher.pesquisasVinculadasIds)
  const assignedInSurvey =
    Array.isArray(survey.pesquisadoresIds) && survey.pesquisadoresIds.includes(researcher.id);
  const assignedInProfile =
    Array.isArray(researcher.pesquisasVinculadasIds) &&
    researcher.pesquisasVinculadasIds.includes(survey.id);

  if (!assignedInSurvey && !assignedInProfile) {
    return false;
  }

  // 3. Must not have passed its end date
  if (isSurveyPassed(survey)) {
    return false;
  }

  return true;
}

/**
 * Returns only surveys that are active, not expired, and assigned to the researcher
 */
export function filterResearcherActiveSurveys(
  surveys: Survey[],
  researcher: Collaborator
): Survey[] {
  return surveys.filter((s) => isSurveyActiveAndAssignedToResearcher(s, researcher));
}
