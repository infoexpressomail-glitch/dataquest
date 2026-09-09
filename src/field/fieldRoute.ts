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

/**
 * Retorna a URL absoluta da tela de login de campo (Modo Pesquisador).
 *
 * Usada no botão "Compartilhar link de coleta": o link leva o pesquisador
 * direto para a tela de login de campo (/campo), onde ele entra com o login
 * e a senha previamente cadastrados no sistema. Ao autenticar, só aparecem
 * as pesquisas HABILITADAS (ativas) e vinculadas ao login dele.
 *
 * Quando `surveyCode` é informado, o código é anexado à URL como parâmetro
 * (?pesquisa=...) para que o login de campo possa destacar a pesquisa alvo.
 */
export function buildFieldLink(surveyCode?: string): string {
  if (typeof window === 'undefined') return FIELD_ROUTE_PATH;
  const base = window.location.origin;
  const path = `${base}${FIELD_ROUTE_PATH}`;
  if (surveyCode) {
    return `${path}?pesquisa=${encodeURIComponent(surveyCode)}`;
  }
  return path;
}

export type ShareFieldLinkResult = 'shared' | 'copied' | 'failed';

/**
 * Compartilha o link do Modo Pesquisador (login de campo).
 *
 * 1. Usa a Web Share API nativa (navigator.share) quando disponível
 *    (celulares e desktops compatíveis).
 * 2. Caso contrário, copia o link para a área de transferência
 *    (navigator.clipboard), com fallback legado via execCommand.
 */
export async function shareFieldLink(opts: {
  surveyName?: string;
  surveyCode?: string;
} = {}): Promise<ShareFieldLinkResult> {
  const url = buildFieldLink(opts.surveyCode);
  const title = opts.surveyName
    ? `DataQuest — Coleta: ${opts.surveyName}`
    : 'DataQuest — Modo Pesquisador de Campo';
  const text = `Acesse a coleta de campo no DataQuest: ${url}`;

  // 1) Compartilhamento nativo (Web Share API)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (e: any) {
      // AbortError = usuário cancelou a folha de compartilhamento.
      if (e?.name === 'AbortError') return 'failed';
      // Qualquer outra falha cai no fallback de copiar link.
    }
  }

  // 2) Copiar para a área de transferência
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return 'copied';
    }
  } catch {
    // segue para o fallback legado
  }

  // 3) Fallback legado (navegadores sem Clipboard API)
  try {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return 'copied';
  } catch {
    return 'failed';
  }
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
