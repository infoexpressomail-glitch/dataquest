# DataQuest — F2 (Fonte única de dados no Supabase)

Implementação da **F2 — Fonte única de dados no Supabase**. As demais fundações
(F3–F6) continuam fora de escopo.

> **Resumo:** perfis de acesso, colaboradores e pesquisas passam a viver no banco.
> O navegador deixou de ser a fonte de verdade dessas três entidades e mantém
> apenas o **cache offline de campo** (IndexedDB). Acaba a “política que só vale
> num navegador”.

---

## O problema que a F2 resolve

Antes desta etapa, `perfis`, `colaboradores` e `pesquisas` eram gravados em 14
chaves de `localStorage` **e**, em parte, no Supabase. A consequência já
observada: uma política editada num navegador não chegava ao app de campo, que
lê o perfil do banco — as duas “verdades” divergiam.

A F2 elimina a cópia local e centraliza tudo no servidor:

| Entidade | Antes (F1) | Depois (F2) |
|---|---|---|
| Perfis / Políticas | `localStorage.dataquest_profiles_v1` (+ mock) | Tabela `perfis_acesso`, via `GET/POST /api/profiles` |
| Colaboradores | `localStorage.dataquest_collaborators_v1` (+ mock) | Tabela `colaboradores`, via `GET/POST/PATCH /api/collaborators` |
| Pesquisas | `localStorage.dataquest_surveys_v1` (+ mock) | Tabela `pesquisas`, via `GET/POST/PUT /api/surveys` |
| Cache do navegador | Fonte de verdade + fila offline | **Somente** cache offline de campo (IndexedDB) |

---

## Como funciona agora

### 1. Migração `supabase/migrations/0009_f2_fonte_unica.sql`
- **Seed idempotente dos 4 perfis padrão** (Administrador Master, Coordenador de
  Campo, Pesquisador de Campo, Analista Estatístico) com os UUIDs canônicos.
  Permissões já personalizadas pelo administrador são **preservadas** — o seed só
  cria o que falta e refresca nome/descrição.
- `public.salvar_perfil_acesso(p_id uuid, p_nome, p_descricao, p_permissions)` —
  upsert por id (uuid) **ou** por nome, preservando campos ausentes. É o que faz
  uma edição da matriz chegar ao banco.
- `public.definir_ativo_colaborador`, `public.definir_perfil_colaborador`,
  `public.definir_reabilitadas_colaborador` — atualizações **parciais** de
  colaborador (ativar/desativar, trocar perfil, re-habilitar pesquisas) sem
  reenviar o cadastro e **sem nunca tocar na senha**.
- `public.colaboradores_publicos` (view) e `public.listar_colaboradores_seguro()`
  — leitura de colaboradores **sem a coluna `senha`**; o hash bcrypt nunca sai do
  banco.
- Passa a aceitar `status = 'concluida'` em `pesquisas` (o painel sempre teve esse
  status, mas o `CHECK` da 0001 só permitia ativa/inativa/excluida — a finalização
  nunca chegava ao banco).

### 2. Rotas `/api` (servidor, service role)
| Rota | Método | Exige |
|---|---|---|
| `/api/profiles` | `GET` | sessão válida |
| `/api/profiles` | `POST` | `politicas_acesso` |
| `/api/collaborators` | `GET` | `colaboradores_acesso`/`colaboradores_editar` |
| `/api/collaborators` | `POST` | `colaboradores_acesso` (já existia) |
| `/api/collaborators` | `PATCH` | `colaboradores_editar`/`colaboradores_desativar` conforme o campo |

O `server.ts` (dev) aplica exatamente as mesmas regras.

### 3. Cliente
- **`src/context/AppContext.tsx`** — `profiles`, `collaborators` e `surveys`
  nascem **vazios** e são hidratados do servidor após a sessão ser validada
  (`hydrateFromServer`), e sempre que a conexão volta. Nenhum deles é gravado em
  `localStorage` (as chaves `dataquest_profiles_v1`, `dataquest_collaborators_v1`
  e `dataquest_surveys_v1` deixaram de existir).
- `hasPermission` **nega** quando não há perfil carregado (antes retornava `true`,
  o que dava permissão total em qualquer estado intermediário).
- Toda mutação persiste no servidor:
  - `updateProfile` → `POST /api/profiles` (e recarrega do banco em caso de falha).
  - `saveCollaborator`, `toggleCollaboratorStatus`, bulk de status/perfil e
    reabilitação de pesquisa → `/api/collaborators`.
  - `saveSurvey`, `toggleSurveyStatus`, `finalizeSurvey`, `reopenSurvey`,
    `deleteSurvey`, `restoreSurvey`, `replicateSurvey`, metas globais e ações em
    lote → `/api/surveys` (ou cache offline de campo quando sem rede).
- **Offline:** alterações de pesquisa vão para o IndexedDB (cache de campo) e
  sobem na próxima reconexão via `forceSyncPendingWithSupabase` — mecanismo que já
  existia e foi mantido. O navegador não é mais dono da pesquisa.
- **A exclusão em lote de colaboradores virou desativação** (`ativo = false`) no
  banco: preserva a trilha de auditoria e o histórico de coletas do operador.

### 4. Novos services
- `src/services/serverProfileService.ts` — `fetchServerProfiles`, `saveProfileToServer`.
- `src/services/serverCollaboratorService.ts` — ganhou `fetchServerCollaborators`
  e `updateCollaboratorPartial`.

---

## Arquivos alterados
- **Novos:** `supabase/migrations/0009_f2_fonte_unica.sql`, `api/profiles.ts`,
  `src/services/serverProfileService.ts`.
- **Alterados:** `api/collaborators.ts`, `api/_lib/surveyMapper.ts`, `server.ts`,
  `src/context/AppContext.tsx`, `src/services/serverCollaboratorService.ts`,
  `src/components/registrations/AccessPolicies.tsx`,
  `src/components/registrations/AccessPoliciesMatrix.tsx`.

## Aplicação da migração (obrigatória)
Rode a migração no SQL Editor do Supabase (ou `supabase db push`):
```
supabase/migrations/0009_f2_fonte_unica.sql
```
Sem ela, `GET /api/profiles` funciona (tabela existente), mas
`salvar_perfil_acesso` e as funções de atualização parcial de colaborador não
existem, e a finalização de pesquisa continua bloqueada pelo `CHECK`.

## Validação
- `npm run typecheck` (`tsc --noEmit`) → **0 erros**
- `npm run build:web` (`vite build`) → **concluído**
- Bundle do cliente conferido: nenhuma chave `dataquest_profiles_v1`,
  `dataquest_collaborators_v1` ou `dataquest_surveys_v1` é gravada/lida.
- Rotas de API conferidas com `tsc`/esbuild (`api/profiles.ts`, `api/collaborators.ts`).

## Fora de escopo (continua pendente)
- F3: dividir o `AppContext` em domínios.
- F4: testes automatizados.
- F5: carregar por módulo (code splitting).
- F6: tokens visuais únicos (gestão + campo).
- Ainda em `localStorage` (fora das três entidades da F2): preferências de
  tema/idioma, catálogo de metas base, respostas, importações, relatórios e a
  trilha de auditoria — candidatos naturais às próximas etapas.
