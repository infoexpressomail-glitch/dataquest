// =============================================================================
// Sessão de servidor assinada (F1 — fundação de segurança)
//
// Substitui o antigo "login decidido pelo navegador"
// (sessionStorage.dataquest_auth_session === 'true') por um token de sessão
// ASSINADO com HMAC-SHA256 e validado SEMPRE no servidor. O cliente guarda um
// valor opaco; quem decide se está autenticado — e o que pode fazer — é o
// servidor.
//
// Token:  base64url(payload JSON) + "." + base64url(HMAC-SHA256)
// Segredo: env `SESSION_SECRET` (fallback: SUPABASE_SERVICE_ROLE_KEY).
//
// Este arquivo é usado tanto pelas funções serverless (api/*) quanto pelo
// servidor Express de desenvolvimento (server.ts).
// =============================================================================
import crypto from 'crypto';

export interface SessionPayload {
  /** id do colaborador (sub) */
  sub: string;
  login: string;
  nome: string;
  perfilId: string;
  perfilNome: string;
  /** mapa de permissões do perfil (AccessPolicyPermissions) */
  permissions: Record<string, boolean>;
  /** true quando o perfil é de pesquisador de campo */
  pesquisador: boolean;
  iat: number;
  exp: number;
}

export const SESSION_COOKIE = 'dq_session';
const DEFAULT_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 8 * 60 * 60);

/** Interface mínima aceita por req/res — cobre Vercel e Express sem acoplar. */
export interface HttpReq {
  headers: Record<string, any>;
  method?: string;
}
export interface HttpRes {
  status: (code: number) => any;
  json: (body: any) => any;
  setHeader?: (name: string, value: string | string[]) => void;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      'Segredo de sessão ausente no servidor: defina SESSION_SECRET (recomendado) ou SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  return secret;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export type SessionInput = Omit<SessionPayload, 'iat' | 'exp'>;

export function createSessionToken(p: SessionInput, ttlSeconds: number = DEFAULT_TTL_SECONDS): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { ...p, iat, exp: iat + ttlSeconds };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = b64url(crypto.createHmac('sha256', getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  let expected: string;
  try {
    expected = b64url(crypto.createHmac('sha256', getSecret()).update(body).digest());
  } catch {
    return null;
  }

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(fromB64url(body).toString('utf8')) as SessionPayload;
    if (!payload?.sub || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Lê o token de `Authorization: Bearer` ou do cookie `dq_session`. */
export function readTokenFromRequest(req: HttpReq): string | null {
  const auth = req.headers?.['authorization'];
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim() || null;
  }
  const cookie = req.headers?.['cookie'];
  if (typeof cookie === 'string') {
    const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

export function getSession(req: HttpReq): SessionPayload | null {
  return verifySessionToken(readTokenFromRequest(req));
}

/** Exige sessão válida. Responde 401 e retorna null quando ausente/expirada. */
export function requireSession(req: HttpReq, res: HttpRes): SessionPayload | null {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHENTICATED',
      message: 'Sessão ausente ou expirada. Faça login novamente.',
    });
    return null;
  }
  return session;
}

/** Sessão tem a permissão? (pesquisador de campo é tratado à parte). */
export function sessionHasPermission(session: SessionPayload, perm: string): boolean {
  return session.permissions?.[perm] === true;
}

/** Exige ao menos uma das permissões. Responde 403 e retorna false caso falte. */
export function requirePermission(res: HttpRes, session: SessionPayload, perms: string[]): boolean {
  const ok = perms.some((p) => sessionHasPermission(session, p));
  if (!ok) {
    res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Seu perfil não tem permissão para executar esta operação.',
    });
    return false;
  }
  return true;
}

export function setSessionCookie(res: HttpRes, token: string, maxAgeSeconds: number = DEFAULT_TTL_SECONDS): void {
  const cookie = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
    // Secure só quando o servidor roda sob HTTPS (produção).
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
  res.setHeader?.('Set-Cookie', cookie);
}

export function clearSessionCookie(res: HttpRes): void {
  res.setHeader?.(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
  );
}
