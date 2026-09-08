/**
 * Roteamento do Modo Pesquisador (Etapa 5 + rota curta /campo).
 *
 * O pesquisador acessa o sub-app por uma URL própria, sem depender do encurtador.
 * Duas formas suportadas (sem dependência nova — apenas window.location):
 *
 *   - Rota curta (recomendada):  /campo
 *     Ex.: https://meusistema.vercel.app/campo
 *   - Rota por hash (legado):    /#app-pesquisador
 *     Ex.: https://meusistema.vercel.app/#app-pesquisador
 *
 *   - isFieldRoute()        → true quando a URL atual é a do Modo Pesquisador
 *   - navigateToFieldRoute()→ navega até o Modo Pesquisador
 *   - leaveFieldRoute()     → volta para o ambiente de gestão (remove rota/hash)
 */

/** Rota curta por caminho: /campo */
export const FIELD_ROUTE_PATH = '/campo';
/** Rota legada por hash: #app-pesquisador */
export const FIELD_ROUTE_HASH = '#app-pesquisador';

/** Retorna true se a URL atual é a rota do Modo Pesquisador. */
export function isFieldRoute(): boolean {
  if (typeof window === 'undefined') return false;

  const path = window.location.pathname;
  const hash = window.location.hash;

  // 1) Rota curta por caminho: /campo ou /campo/qualquercoisa
  if (path === FIELD_ROUTE_PATH || path.startsWith(`${FIELD_ROUTE_PATH}/`)) {
    return true;
  }

  // 2) Rota legada por hash
  return hash === FIELD_ROUTE_HASH || hash.startsWith(`${FIELD_ROUTE_HASH}/`);
}

/** Navega até o Modo Pesquisador. */
export function navigateToFieldRoute(): void {
  if (isFieldRoute()) return;
  // Usa a rota curta por caminho (mais confiável que o hash em redirecionamentos).
  window.history.pushState(null, '', FIELD_ROUTE_PATH);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Sai do Modo Pesquisador (volta ao ambiente de gestão). */
export function leaveFieldRoute(): void {
  if (!isFieldRoute()) return;
  // Se estava na rota curta /campo, volta para a raiz.
  if (window.location.pathname === FIELD_ROUTE_PATH || window.location.pathname.startsWith(`${FIELD_ROUTE_PATH}/`)) {
    window.history.pushState(null, '', window.location.pathname === FIELD_ROUTE_PATH
      ? '/'
      : window.location.pathname.slice(FIELD_ROUTE_PATH.length) || '/');
  } else {
    // Estava no hash legado: remove o hash e volta ao ambiente de gestão.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}
