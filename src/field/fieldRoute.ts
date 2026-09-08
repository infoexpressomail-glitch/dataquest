/**
 * Roteamento por hash do Modo Pesquisador (Etapa 5).
 *
 * O pesquisador acessa o sub-app por uma URL dedicada:  /#app-pesquisador
 * Sem dependência nova (react-router), usando apenas window.location.hash.
 *
 *   - isFieldRoute()        → true quando a URL atual é a do Modo Pesquisador
 *   - navigateToFieldRoute()→ navega até o Modo Pesquisador
 *   - leaveFieldRoute()     → volta para o ambiente de gestão (remove o hash)
 */

export const FIELD_ROUTE_HASH = '#app-pesquisador';

/** Retorna true se a URL atual é a rota do Modo Pesquisador. */
export function isFieldRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hash === FIELD_ROUTE_HASH ||
    window.location.hash.startsWith(`${FIELD_ROUTE_HASH}/`)
  );
}

/** Navega até o Modo Pesquisador (adiciona o hash à URL). */
export function navigateToFieldRoute(): void {
  if (!isFieldRoute()) {
    window.location.hash = FIELD_ROUTE_HASH;
  }
}

/** Sai do Modo Pesquisador (remove o hash e volta ao ambiente de gestão). */
export function leaveFieldRoute(): void {
  if (isFieldRoute()) {
    // Substitui a URL removendo o hash sem recarregar a página.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    // Dispara o evento para o App reagir (replaceState não dispara hashchange).
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}
