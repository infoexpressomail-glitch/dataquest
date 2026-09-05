# DataQuest — Sistema de Gestão de Pesquisas

Sistema de gestão de pesquisas (questionários de campo): criação de pesquisas com lógica
condicional, coleta de respostas em campo (com geolocalização e áudio), metas por
pergunta e metas globais por demografia, plano amostral e dimensionamento de equipe
(Cochran/Yamane, com seletor de Níveis de Confiança 90/95/99%), importação externa,
cadastro de colaboradores com perfis de acesso granulares, autenticação com 2FA,
auditoria com hash de integridade, sincronização offline (PWA instalável) e
sincronização prévia mandatória com o servidor central.

Este repositório contém a infraestrutura completa para rodar o DataQuest **online e
persistente**, usando **GitHub** (código + CI), **Supabase** (Postgres + Auth + RLS +
Storage) e **Vercel** (hospedagem do frontend + funções serverless da API).

## Stack

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS 4, Recharts, lucide-react,
  jspdf, motion, xlsx (importação/exportação de planilhas), jszip (exportação de áudios
  em lote), vite-plugin-pwa (app instalável / offline-first).
- **Backend:** Node + Express (`server.ts`, usado em desenvolvimento local) e funções
  serverless da Vercel (`api/*.ts`, usadas em produção) — ambos com o mesmo contrato de
  rotas e a mesma persistência no Supabase.
- **Banco de dados:** Supabase (Postgres), com Row Level Security habilitada em todas as
  tabelas e Storage para gravações de áudio e planilhas de importação.
- **IA:** Google Gemini (`@google/genai`), usado no backend.

## Como o deploy conecta GitHub → Vercel → Supabase

1. O código-fonte vive no **GitHub**. Cada push na branch `main` dispara o workflow
   `.github/workflows/ci.yml`, que roda `npm ci`, verificação de tipos (`npm run lint`) e
   o build completo (`npm run build`).
2. A **Vercel** está conectada ao mesmo repositório GitHub (integração nativa): a cada
   push na `main` ela builda o frontend (`vite build`, saída em `dist/`, incluindo o
   service worker do PWA) e publica as funções serverless da pasta `api/` como
   endpoints `https://SEU-PROJETO.vercel.app/api/*`.
3. Tanto as funções serverless quanto o `server.ts` (dev local) se conectam ao
   **Supabase** usando `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` — é lá que
   pesquisas, respostas, metas, colaboradores e auditoria são persistidos de verdade,
   com RLS controlando quem pode ler/escrever o quê.

## Como rodar localmente

### 1. Pré-requisitos
- Node.js 20+
- Uma conta no [Supabase](https://supabase.com) (plano gratuito é suficiente para começar)

### 2. Clonar e instalar
```bash
git clone <url-do-seu-repositorio>
cd dataquest
npm install
```

### 3. Configurar o Supabase
1. Crie um novo projeto no [painel do Supabase](https://supabase.com/dashboard).
2. Vá em **SQL Editor** e execute, **nesta ordem**:
   - `supabase/migrations/0001_initial_schema.sql` (cria todas as tabelas, RLS, funções,
     views e buckets de Storage)
   - `supabase/migrations/0002_survey_field_plan.sql` (adiciona as colunas de plano
     amostral, cotas por sexo, datas de campo e configuração de gravação de áudio)
   - `supabase/seed.sql` (popula com os perfis, colaboradores demo e as pesquisas
     padrão do sistema)
3. Em **Project Settings → API**, copie:
   - **Project URL** → vai em `VITE_SUPABASE_URL`
   - **anon public key** → vai em `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → vai em `SUPABASE_SERVICE_ROLE_KEY` (mantenha em segredo!)

### 4. Configurar variáveis de ambiente
```bash
cp .env.example .env
```
Preencha o `.env` com os valores copiados do Supabase e sua chave do Gemini.

### 5. Rodar em desenvolvimento
```bash
npm run dev
```
O app sobe em `http://localhost:3000`, com o Express servindo tanto o frontend (via Vite
em modo middleware) quanto as rotas `/api/*` — ambos já conectados ao Supabase.

## Como fazer deploy na Vercel

1. Importe o repositório GitHub no [painel da Vercel](https://vercel.com/new).
2. A Vercel detecta automaticamente o `vercel.json` deste projeto (build com
   `npm run build:web`, saída em `dist/`, funções serverless em `api/`).
3. Em **Project Settings → Environment Variables**, cadastre todas as variáveis da
   tabela abaixo (Production, Preview e Development).
4. Clique em **Deploy**. A partir daí, todo push na branch `main` gera um novo deploy de
   produção automaticamente.
5. Opcionalmente, dispare o deploy manualmente da sua máquina com `npm run deploy`
   (requer `vercel login` e `vercel link` uma vez).

## Variáveis de ambiente

| Variável                      | Onde é usada        | Descrição                                                                 |
|--------------------------------|---------------------|----------------------------------------------------------------------------|
| `VITE_SUPABASE_URL`            | Frontend + Backend  | URL do projeto Supabase.                                                   |
| `VITE_SUPABASE_ANON_KEY`       | Frontend            | Chave anônima/pública do Supabase (segura para expor no navegador; o RLS controla o acesso). |
| `SUPABASE_SERVICE_ROLE_KEY`    | Backend apenas      | Chave de service role — ignora RLS. **Nunca** exponha no frontend.         |
| `GEMINI_API_KEY`               | Backend             | Chave da API do Google Gemini, usada nas funcionalidades de IA do backend. |
| `APP_URL`                      | Backend             | URL pública onde a aplicação está hospedada.                               |

## Estrutura do projeto

```
dataquest/
├── .github/workflows/ci.yml        # CI: lint (tsc --noEmit) + build
├── .env.example                    # Todas as variáveis de ambiente documentadas
├── vercel.json                     # Configuração de deploy na Vercel
├── server.ts                       # Backend Express (usado em desenvolvimento local)
├── api/                            # Funções serverless da Vercel (produção)
│   ├── health.ts
│   ├── surveys.ts
│   ├── surveys/[id].ts
│   ├── surveys/[id]/sync.ts
│   └── _lib/                       # Helpers compartilhados (cliente admin, mapeamento)
├── supabase/
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql          # Schema completo, RLS, funções, views, storage
│   │   └── 0002_survey_field_plan.sql       # Plano amostral, cotas por sexo, config. de áudio
│   ├── seed.sql                             # Dados iniciais (perfis, colaboradores, pesquisas)
│   └── config.toml                          # Configuração do Supabase CLI
├── src/                             # Código do frontend (React/Vite/TS) — inalterado
│   └── services/
│       ├── supabaseClient.ts        # Cliente Supabase do frontend (anon key)
│       └── supabaseSyncService.ts   # Sincronização de pesquisas com a tabela `pesquisas`
```

## Sobre a sincronização prévia mandatória

Pesquisas **em andamento** (ativas, com entrevistas coletadas, ou marcadas como
`emAndamento`) exigem uma chamada a `POST /api/surveys/:id/sync` antes de qualquer
`PUT /api/surveys/:id`. Essa chamada retorna um `syncToken` (formato `SYNC-AUTH-...`,
válido por 15 minutos), persistido na tabela auxiliar `sync_tokens`. Sem um token
válido, o `PUT` retorna `428 Precondition Required` com
`error: "SYNC_REQUIRED_BEFORE_UPLOAD"`.

## Sobre autenticação e senhas de colaboradores

O login hoje é validado no **frontend** (`AppContext.tsx`), comparando a senha digitada
com o campo `Collaborator.senha` mantido em estado local/mockData — o Supabase ainda não
é a fonte de verdade da autenticação. A tabela `colaboradores` já está preparada para
isso: as senhas são gravadas com hash `bcrypt` (via `pgcrypto`) e existe a função
`autenticar_colaborador(login, senha)` pronta para uso.

**Recomendação de evolução (fora do escopo desta entrega):** mover a validação de login
para uma função serverless (`api/auth/login.ts`, por exemplo) que chame
`autenticar_colaborador` no Supabase com a `SUPABASE_SERVICE_ROLE_KEY`, em vez de
comparar senhas no navegador. Enquanto isso não for feito, trate as senhas demo
(`admin123`, `coord123`, `pesq123`, `analista123`) como não seguras para produção.

## Segurança

- Nenhum segredo é hardcoded em nenhum arquivo deste repositório — tudo vem de variáveis
  de ambiente.
- RLS está habilitada em todas as tabelas do Supabase; a `SUPABASE_SERVICE_ROLE_KEY`
  (que ignora RLS) só é usada no backend, nunca no bundle do frontend.
- As senhas de colaboradores são armazenadas com hash `bcrypt` (via `pgcrypto`) no
  banco — mesmo que a validação atual ainda ocorra no frontend (ver seção acima).
