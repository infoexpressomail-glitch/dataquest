# DataQuest — F1 (Fundação de segurança)

Implementação da **F1 — Fechar a porta**. As demais fundações (F2–F6) continuam
fora de escopo.

## O que foi corrigido

| Furo (diagnóstico) | Correção |
|---|---|
| 5 senhas padrão dentro do código enviado ao navegador (`mockData`) | Removidas. Nenhuma senha é persistida no cliente (nem em `localStorage`). |
| Login decidido por `sessionStorage.dataquest_auth_session` | O navegador **não decide mais** nada. A sessão é um token **assinado (HMAC-SHA256)** emitido e validado pelo servidor. |
| Rotas `/api` sem checagem de credencial (service role, ignora RLS) | Todas as rotas `/api` agora exigem **sessão válida + permissão do perfil**. |

## Como funciona agora

### 1. Sessão assinada — `api/_lib/session.ts`
- Token: `base64url(payload).base64url(HMAC-SHA256)`, com `iat`/`exp`.
- Segredo: env `SESSION_SECRET` (fallback: `SUPABASE_SERVICE_ROLE_KEY`) — **nunca** vai ao cliente.
- Entrega por **cookie `dq_session` HttpOnly + SameSite=Strict** e também no corpo
  (`sessionToken`), para clientes que não usam cookie.
- Helpers: `requireSession`, `requirePermission`, `sessionHasPermission`, `setSessionCookie`, `clearSessionCookie`.

### 2. Login no servidor — `POST /api/auth`
- Valida login/senha contra a tabela `colaboradores` via RPC `autenticar_campo`
  (hash **bcrypt** no banco). **Nunca retorna o hash.**
- Emite a sessão (cookie + token) com o perfil e as permissões do usuário.
- `GET /api/auth` → restaura a sessão no reload. `DELETE /api/auth` → logout.
- Se o Supabase não estiver configurado, responde **503** — **não existe caminho
  alternativo no cliente** (era exatamente o furo antigo).

### 3. Permissão por rota

| Rota | Exige |
|---|---|
| `GET /api/surveys`, `GET /api/surveys/:id` | `pesquisa_acesso` |
| `POST /api/surveys`, `PUT /api/surveys/:id`, `POST /api/surveys/:id/sync` | `pesquisa_criar` ou `pesquisa_alterar` |
| `GET /api/submissions` | `respostas_acesso` |
| `POST /api/submissions` | `respostas_acesso` **ou** sessão de pesquisador de campo |
| `POST /api/collaborators` | `colaboradores_acesso` |
| `POST/DELETE /api/survey-assets` | `pesquisa_criar` ou `pesquisa_alterar` |
| `GET /api/collaborators/:id/pesquisas` | sessão + (próprio id **ou** `pesquisa_acesso`/`colaboradores_acesso`) |
| `GET /api/health` | pública (healthcheck) |

O `server.ts` (dev) aplica exatamente as mesmas regras.

### 4. Cliente
- `src/services/apiClient.ts` — `apiFetch` anexa o Bearer e envia o cookie de sessão.
- Todos os serviços (`serverSurveyService`, `serverSubmissionService`,
  `serverCollaboratorService`, `surveyAssetsService`, `fieldApi`) passaram a usá-lo.
- `AppContext`: `login()` agora é **assíncrono** e chama o servidor; a sessão é
  restaurada com `GET /api/auth`; `logout()` encerra no servidor.
- `LoginScreen`: removeu a exibição/preenchimento de senhas de demonstração.
- `App.tsx`: mostra "Verificando sessão no servidor…" enquanto valida a sessão.

## Arquivos alterados
- **Novos:** `api/_lib/session.ts`, `src/services/apiClient.ts`
- **Reescrito:** `api/auth.ts`
- **Protegidos:** `api/surveys.ts`, `api/surveys/[id].ts`, `api/surveys/[id]/sync.ts`,
  `api/submissions.ts`, `api/collaborators.ts`, `api/collaborators/[id]/pesquisas.ts`,
  `api/survey-assets.ts`, `server.ts`
- **Removido:** `api/diag-keys.ts` (endpoint de diagnóstico que expunha formato de chaves)
- **Sem senha:** `src/mockData.ts`, `src/context/AppContext.tsx`,
  `src/components/auth/LoginScreen.tsx`

## Configuração necessária (backend)
```env
SESSION_SECRET=            # ex.: openssl rand -hex 32
SESSION_TTL_SECONDS=        # opcional, padrão 28800 (8h)
VITE_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Importante sobre o login
As credenciais agora são validadas **no Supabase** (`colaboradores` + `perfis_acesso`).
Um ambiente sem Supabase configurado **não autentica** — isso é intencional: não há
mais fallback de comparação no navegador. Garanta que os colaboradores existam na
tabela `colaboradores` (com senha em hash) e que os perfis estejam em `perfis_acesso`.

## Validação
- `npm run typecheck` (`tsc --noEmit`) → **0 erros**
- `npm run build:web` (`vite build`) → **concluído**
- Bundle do cliente conferido: **nenhuma** das senhas antigas
  (`admin123`, `coord123`, `pesq123`, `analista123`) nem a flag
  `dataquest_auth_session` permanecem no JavaScript distribuído.

## Fora de escopo (continua pendente)
- F2: fonte única de dados no Supabase (hoje ainda há estado no `localStorage`).
- F3: dividir o `AppContext`.
- F4: testes automatizados.
- F5: carregar por módulo.
- F6: tokens visuais únicos.
- `GET /api/health` segue público (healthcheck) e retorna só uma contagem.
