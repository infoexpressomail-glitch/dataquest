// =============================================================================
// Cliente HTTP autenticado (F1)
//
// Toda chamada a /api passa por aqui: anexa o token de sessão (Bearer) e envia
// os cookies de sessão (credentials: 'same-origin'). O cookie `dq_session` é
// HttpOnly — o JavaScript não o lê nem o forja; quem valida é o servidor.
//
// O token em sessionStorage é apenas um reforço para ambientes onde o cookie não
// circula; ele é um valor OPACO e ASSINADO, não uma decisão de autenticação.
// =============================================================================

const TOKEN_KEY = 'dataquest_session_token';

export function getSessionToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token?: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ambiente sem sessionStorage — o cookie de sessão segue valendo */
  }
}

export function clearSessionToken(): void {
  setSessionToken(null);
}

/** fetch que já envia a sessão (Bearer + cookie) para as rotas /api. */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getSessionToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers, credentials: 'same-origin' });
}
