/**
 * Roteamento do Modo Totem (tablet em quiosque) — DataQuest.
 *
 * O Modo Totem é uma alternativa de uso desassistido: o tablet fica exposto ao
 * público e a pesquisa roda do início ao fim automaticamente, sem operador.
 * Duas formas de acesso (sem dependência nova — apenas window.location):
 *
 *   - Rota curta (recomendada):  /totem
 *     Ex.: https://meusistema.vercel.app/totem?pesquisa=CODE
 *   - Rota por hash:             /#app-totem
 *     Ex.: https://meusistema.vercel.app/#app-totem
 *
 *   - isTotemRoute()        → true quando a URL atual é a do Modo Totem
 *   - navigateToTotemRoute()→ navega até o Modo Totem
 *   - leaveTotemRoute()     → volta para o ambiente de gestão (remove rota/hash)
 *   - buildTotemLink(code)  → URL absoluta para abrir o quiosque
 */

/** Rota curta por caminho: /totem */
export const TOTEM_ROUTE_PATH = '/totem';
/** Rota por hash: #app-totem */
export const TOTEM_ROUTE_HASH = '#app-totem';

/** Retorna true se a URL atual é a rota do Modo Totem. */
export function isTotemRoute(): boolean {
  if (typeof window === 'undefined') return false;

  const path = window.location.pathname;
  const hash = window.location.hash;

  // 1) Rota curta por caminho: /totem ou /totem/qualquercoisa
  if (path === TOTEM_ROUTE_PATH || path.startsWith(`${TOTEM_ROUTE_PATH}/`)) {
    return true;
  }

  // 2) Rota por hash
  return hash === TOTEM_ROUTE_HASH || hash.startsWith(`${TOTEM_ROUTE_HASH}/`);
}

/** Navega até o Modo Totem. */
export function navigateToTotemRoute(): void {
  if (isTotemRoute()) return;
  window.history.pushState(null, '', TOTEM_ROUTE_PATH);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Lê o parâmetro `?pesquisa=<CODIGO>` da URL atual (link do quiosque).
 * Permite apontar o totem diretamente para uma pesquisa específica.
 */
export function getTotemSurveyCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('pesquisa');
    return code ? code.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Monta a URL absoluta do Modo Totem para a pesquisa informada.
 * Usada pelos botões de compartilhamento/configuração do tablet.
 */
export function buildTotemLink(surveyCode?: string): string {
  if (typeof window === 'undefined') return TOTEM_ROUTE_PATH;
  const base = window.location.origin;
  const path = `${base}${TOTEM_ROUTE_PATH}`;
  if (surveyCode) {
    return `${path}?pesquisa=${encodeURIComponent(surveyCode)}`;
  }
  return path;
}

/** Sai do Modo Totem (volta ao ambiente de gestão). */
export function leaveTotemRoute(): void {
  if (!isTotemRoute()) return;
  if (
    window.location.pathname === TOTEM_ROUTE_PATH ||
    window.location.pathname.startsWith(`${TOTEM_ROUTE_PATH}/`)
  ) {
    window.history.pushState(
      null,
      '',
      window.location.pathname === TOTEM_ROUTE_PATH
        ? '/'
        : window.location.pathname.slice(TOTEM_ROUTE_PATH.length) || '/'
    );
  } else {
    // Estava no hash: remove o hash e volta ao ambiente de gestão.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}
