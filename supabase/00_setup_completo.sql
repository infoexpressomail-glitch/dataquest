-- =====================================================================================
-- DataQuest — SETUP COMPLETO DO BANCO (arquivo único)
-- =====================================================================================
-- Este arquivo consolida, nesta ordem obrigatoria, os tres scripts que antes eram
-- separados: schema inicial, migration de plano amostral, e seed de dados iniciais.
--
-- COMO USAR:
--   1. Abra o SQL Editor do projeto Supabase novo e vazio.
--   2. Cole este arquivo inteiro em uma unica query.
--   3. Clique em Run.
--
-- E seguro rodar este arquivo mais de uma vez, pois e idempotente em toda sua extensao.
--
-- A ordem entre as tres partes importa: a parte 2 redefine duas funcoes ja criadas na
-- parte 1, e a parte 3 insere dados nas tabelas criadas na parte 1.
-- =====================================================================================


-- #######################################################################################
-- ##  PARTE 1 DE 3 - SCHEMA INICIAL: tabelas, RLS, funcoes, views e storage
-- #######################################################################################

-- =====================================================================================
-- DataQuest — Migration inicial completa
-- =====================================================================================
-- Este arquivo é IDEMPOTENTE: pode ser executado múltiplas vezes no SQL Editor do
-- Supabase sem gerar erro. Ele cria toda a infraestrutura de banco necessária para
-- persistir o que hoje vive em memória (server.ts) e no IndexedDB (frontend).
--
-- IMPORTANTE: nenhuma tabela, coluna ou nome semântico aqui diverge dos tipos
-- TypeScript existentes em `src/types.ts`. O mapeamento é sempre:
--   snake_case no banco  <->  camelCase no TypeScript (feito nos services/API)
--
-- Ordem de execução recomendada: rode este arquivo inteiro de uma vez no SQL Editor,
-- ou via `supabase db push` (ele já está na pasta supabase/migrations).
-- =====================================================================================


-- =====================================================================================
-- 1. EXTENSÕES
-- =====================================================================================

create extension if not exists pgcrypto;      -- gen_random_uuid()
create extension if not exists "uuid-ossp";   -- uuid_generate_v4() (compatibilidade)

-- PostGIS é opcional. Se disponível no seu projeto Supabase, descomente a linha abaixo
-- para habilitar buscas geoespaciais otimizadas sobre `respostas.geolocalizacao`.
-- Caso a extensão não esteja disponível no seu plano, o índice GIN comum (criado mais
-- abaixo) sobre a coluna jsonb já cobre buscas básicas por bairro/cidade.
-- create extension if not exists postgis;


-- =====================================================================================
-- 2. FUNÇÃO UTILITÁRIA: updated_at automático
-- =====================================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if TG_TABLE_NAME = 'pesquisas' then
    new.atualizada_em = now();
  elsif TG_TABLE_NAME = 'metas_globais' then
    new.atualizado_em = now();
  elsif TG_TABLE_NAME = 'perfis_acesso' then
    new.atualizado_em = now();
  end if;
  return new;
end;
$$;


-- =====================================================================================
-- 3. TABELAS
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 3.1 perfis_acesso  (AccessProfile)
-- -------------------------------------------------------------------------------------
create table if not exists public.perfis_acesso (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  descricao     text not null default '',
  permissions   jsonb not null default '{}'::jsonb, -- AccessPolicyPermissions completo
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.perfis_acesso is 'AccessProfile — perfis de acesso com permissões granulares (AccessPolicyPermissions)';

drop trigger if exists trg_perfis_acesso_updated_at on public.perfis_acesso;
create trigger trg_perfis_acesso_updated_at
  before update on public.perfis_acesso
  for each row execute function public.set_updated_at();


-- -------------------------------------------------------------------------------------
-- 3.2 colaboradores  (Collaborator)
-- -------------------------------------------------------------------------------------
create table if not exists public.colaboradores (
  id                     text primary key,
  cpf                    text not null unique,
  nome                   text not null,
  rg                     text,
  data_nascimento        date,
  sexo                   text check (sexo in ('M', 'F', 'Outro', '') or sexo is null),
  login                  text not null unique,
  senha                  text,              -- hash (nunca texto puro)
  perfil_acesso_id       uuid references public.perfis_acesso(id) on delete restrict,
  email                  text not null,
  celular                text,
  nome_contato_celular   text,
  telefone_fixo          text,
  nome_contato_fixo      text,
  ativo                  boolean not null default true,
  pesquisas_vinculadas_ids text[] not null default '{}',
  criado_em              timestamptz not null default now()
);

comment on table public.colaboradores is 'Collaborator — cadastro de colaboradores/pesquisadores';

create index if not exists idx_colaboradores_login on public.colaboradores (login);
create index if not exists idx_colaboradores_cpf on public.colaboradores (cpf);
create index if not exists idx_colaboradores_perfil_acesso_id on public.colaboradores (perfil_acesso_id);


-- -------------------------------------------------------------------------------------
-- 3.3 pesquisas  (Survey)
-- -------------------------------------------------------------------------------------
create table if not exists public.pesquisas (
  id                     text primary key,
  codigo                 text not null,
  nome                   text not null,
  descricao              text not null default '',
  status                 text not null default 'ativa' check (status in ('ativa', 'inativa', 'excluida')),
  habilitar_coleta_web   boolean not null default false,
  tipo_coleta_web        text not null default 'interno' check (tipo_coleta_web in ('publico', 'interno')),
  colaborador_web_id     text references public.colaboradores(id) on delete set null,
  perguntas              jsonb not null default '[]'::jsonb,   -- Question[]
  regras                 jsonb not null default '[]'::jsonb,   -- ConditionalRule[]
  metas                  jsonb not null default '[]'::jsonb,   -- MetaTarget[] (espelho; fonte de verdade é a tabela metas)
  metas_globais          jsonb not null default '[]'::jsonb,   -- GlobalDemographicTarget[] (espelho; fonte é metas_globais)
  pesquisadores_ids      text[] not null default '{}',
  ciclo_atual            int not null default 1,
  versao                 int not null default 1,
  criada_em              timestamptz not null default now(),
  atualizada_em          timestamptz not null default now(),
  em_andamento           boolean not null default false,
  server_version         int not null default 1,
  dados_completos        jsonb  -- Survey completo (objeto TS inteiro), usado pelo supabaseSyncService.ts
);

comment on table public.pesquisas is 'Survey — pesquisas de campo. dados_completos guarda o objeto Survey inteiro em jsonb (upsert usado por supabaseSyncService.ts)';

create index if not exists idx_pesquisas_codigo on public.pesquisas (codigo);
create index if not exists idx_pesquisas_status on public.pesquisas (status);

drop trigger if exists trg_pesquisas_updated_at on public.pesquisas;
create trigger trg_pesquisas_updated_at
  before update on public.pesquisas
  for each row execute function public.set_updated_at();


-- -------------------------------------------------------------------------------------
-- 3.4 respostas  (InterviewSubmission)
-- -------------------------------------------------------------------------------------
create table if not exists public.respostas (
  id                              text primary key,
  codigo_pesquisa                 text not null,
  pesquisa_id                     text not null references public.pesquisas(id) on delete cascade,
  pesquisa_nome                   text not null,
  pesquisador_id                  text references public.colaboradores(id) on delete set null,
  pesquisador_nome                text not null,
  data_hora                       timestamptz not null default now(),
  status                          text not null default 'concluida' check (status in ('concluida', 'em_andamento', 'cancelada')),
  respostas                       jsonb not null default '[]'::jsonb,  -- AnswerItem[]
  geolocalizacao                  jsonb,  -- { latitude, longitude, bairro?, cidade? }
  audio_gravacao                  jsonb,  -- { duracaoSegundos, tamanhoKb, nomeArquivo, transcricaoTrecho? }
  respostas_alteradas_pelo_admin  boolean default false,
  historico_edicao                jsonb default '[]'::jsonb  -- { alteradoPor, dataHora, motivo }[]
);

comment on table public.respostas is 'InterviewSubmission — entrevistas/coletas de campo';

create index if not exists idx_respostas_pesquisa_id on public.respostas (pesquisa_id);
create index if not exists idx_respostas_pesquisador_id on public.respostas (pesquisador_id);
create index if not exists idx_respostas_data_hora on public.respostas (data_hora);
create index if not exists idx_respostas_status on public.respostas (status);
-- Índice GIN para consultas por campos dentro do jsonb de geolocalização (bairro/cidade)
create index if not exists idx_respostas_geolocalizacao_gin on public.respostas using gin (geolocalizacao);
-- Se a extensão PostGIS estiver habilitada no seu projeto, prefira um índice espacial:
-- alter table public.respostas add column if not exists geo_point geography(Point, 4326);
-- create index if not exists idx_respostas_geo_point_gist on public.respostas using gist (geo_point);


-- -------------------------------------------------------------------------------------
-- 3.5 metas  (MetaTarget)
-- -------------------------------------------------------------------------------------
create table if not exists public.metas (
  id                    text primary key,
  pesquisa_id           text not null references public.pesquisas(id) on delete cascade,
  pergunta_id           text not null,
  condicao              text not null check (condicao in ('igual', 'diferente', 'contem', 'maior_que', 'menor_que')),
  resposta              text not null,
  quantidade_alvo       int not null default 0,
  quantidade_atingida   int not null default 0,
  ciclo                 text not null default '1'
);

comment on table public.metas is 'MetaTarget — metas por pergunta de uma pesquisa';

create index if not exists idx_metas_pesquisa_id on public.metas (pesquisa_id);


-- -------------------------------------------------------------------------------------
-- 3.6 metas_globais  (GlobalDemographicTarget)
-- -------------------------------------------------------------------------------------
create table if not exists public.metas_globais (
  id                     text primary key,
  pesquisa_id            text not null references public.pesquisas(id) on delete cascade,
  titulo                 text not null,
  descricao              text,
  criterios              jsonb not null default '{}'::jsonb,  -- { faixaEtaria?, sexo?, bairro? }
  meta_global_alvo       int not null default 0,
  meta_global_atingida   int not null default 0,
  atribuicoes            jsonb not null default '[]'::jsonb,  -- ResearcherQuotaAssignment[]
  status                 text not null default 'ativa' check (status in ('ativa', 'concluida', 'pausada')),
  ciclo                  text,
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now()
);

comment on table public.metas_globais is 'GlobalDemographicTarget — metas globais por demografia (idade/sexo/bairro) com cotas por pesquisador';

create index if not exists idx_metas_globais_pesquisa_id on public.metas_globais (pesquisa_id);
create index if not exists idx_metas_globais_status on public.metas_globais (status);

drop trigger if exists trg_metas_globais_updated_at on public.metas_globais;
create trigger trg_metas_globais_updated_at
  before update on public.metas_globais
  for each row execute function public.set_updated_at();


-- -------------------------------------------------------------------------------------
-- 3.7 historico_acoes  (ActionAuditLog)
-- -------------------------------------------------------------------------------------
create table if not exists public.historico_acoes (
  id                     text primary key,
  categoria              text not null check (categoria in ('PESQUISA', 'RESPOSTA', 'CONFIGURACAO', 'SISTEMA')),
  tipo_acao              text not null,
  titulo_acao            text not null,
  descricao_detalhada    text not null default '',
  autor                  jsonb not null,  -- { id, nome, login, perfil, ip? }
  alvo                   jsonb not null,  -- { tipo, id, identificador, nome? }
  alteracoes             jsonb default '[]'::jsonb,  -- FieldChange[]
  motivo_conformidade    text,
  timestamp              timestamptz not null default now(),
  hash_integridade       text not null,
  status_conformidade    text not null default 'conforme' check (status_conformidade in ('conforme', 'atencao', 'critico'))
);

comment on table public.historico_acoes is 'ActionAuditLog — trilha de auditoria com hash de integridade';

create index if not exists idx_historico_acoes_timestamp on public.historico_acoes ("timestamp");
create index if not exists idx_historico_acoes_categoria on public.historico_acoes (categoria);
create index if not exists idx_historico_acoes_tipo_acao on public.historico_acoes (tipo_acao);
create index if not exists idx_historico_acoes_alvo_id on public.historico_acoes ((alvo ->> 'id'));


-- -------------------------------------------------------------------------------------
-- 3.8 conexoes_recentes  (RecentConnection)
-- -------------------------------------------------------------------------------------
create table if not exists public.conexoes_recentes (
  id         text primary key,
  usuario    text not null,
  perfil     text not null,
  ip         text not null default '',
  data_hora  timestamptz not null default now(),
  navegador  text not null default '',
  status     text not null default 'sucesso' check (status in ('sucesso', 'bloqueado', 'aviso'))
);

comment on table public.conexoes_recentes is 'RecentConnection — painel de conexões recentes exibido na Home';

create index if not exists idx_conexoes_recentes_data_hora on public.conexoes_recentes (data_hora);


-- -------------------------------------------------------------------------------------
-- 3.9 importacoes_externas  (ExternalImport)
-- -------------------------------------------------------------------------------------
create table if not exists public.importacoes_externas (
  id                 text primary key,
  nome_arquivo       text not null,
  pesquisa_id        text not null references public.pesquisas(id) on delete cascade,
  data_importacao    timestamptz not null default now(),
  total_registros    int not null default 0,
  colunas            text[] not null default '{}',
  status             text not null default 'processando' check (status in ('concluido', 'processando', 'erro'))
);

comment on table public.importacoes_externas is 'ExternalImport — importações de planilhas externas';

create index if not exists idx_importacoes_externas_pesquisa_id on public.importacoes_externas (pesquisa_id);


-- -------------------------------------------------------------------------------------
-- 3.10 sync_tokens  (auxiliar — sincronização prévia mandatória com o Servidor Central)
-- -------------------------------------------------------------------------------------
-- Substitui o Map em memória do server.ts (syncTokensStore) por persistência real,
-- necessária porque funções serverless da Vercel não mantêm estado entre invocações.
create table if not exists public.sync_tokens (
  token           text primary key,
  survey_id       text not null references public.pesquisas(id) on delete cascade,
  client_version  int not null default 1,
  generated_at    timestamptz not null default now(),
  expires_at      timestamptz not null
);

comment on table public.sync_tokens is 'Tokens de autorização de upload emitidos por /api/surveys/:id/sync (equivalente ao syncTokensStore do server.ts)';

create index if not exists idx_sync_tokens_survey_id on public.sync_tokens (survey_id);
create index if not exists idx_sync_tokens_expires_at on public.sync_tokens (expires_at);


-- =====================================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================================================
-- Modelo de login do app: colaboradores com login/senha (tabela `colaboradores`), não
-- necessariamente o Supabase Auth nativo. Duas estratégias são suportadas:
--
--   (A) Supabase Auth (recomendado para produção): cada colaborador tem também uma conta
--       em auth.users, sincronizada via trigger (seção 4.1). Políticas usam auth.uid().
--   (B) Sessão própria do app: se você preferir não usar Supabase Auth, o backend
--       (funções serverless) deve usar a SUPABASE_SERVICE_ROLE_KEY, que ignora RLS,
--       e todo o controle de acesso fica no `api/*` (Node), nunca exposto ao frontend.
--
-- Este arquivo implementa a estratégia (A) como padrão, mas os dois modelos coexistem:
-- a service_role sempre pode ler/escrever (bypassa RLS), então (B) funciona mesmo sem
-- nenhum usuário jamais logar via Supabase Auth.

-- -------------------------------------------------------------------------------------
-- 4.1 Sincronização auth.users -> colaboradores (apenas relevante se usar Supabase Auth)
-- -------------------------------------------------------------------------------------
-- Quando um novo usuário é criado no Supabase Auth (signup), tentamos vincular pelo
-- e-mail a um colaborador já cadastrado (não cria colaborador novo automaticamente,
-- pois o cadastro de colaboradores é feito pela tela "Cadastro de Colaboradores").
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.colaboradores
  set login = coalesce(login, new.email)
  where email = new.email
    and id is not null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- -------------------------------------------------------------------------------------
-- 4.2 Funções helper de autorização
-- -------------------------------------------------------------------------------------

-- Colaborador vinculado ao usuário autenticado atual (via e-mail do Supabase Auth)
create or replace function public.current_colaborador_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.colaboradores c
  join auth.users u on u.email = c.email
  where u.id = auth.uid()
  limit 1;
$$;

create or replace function public.is_authenticated()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

-- Retorna as permissions (jsonb) do colaborador autenticado
create or replace function public.current_permissions()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select pa.permissions
  from public.colaboradores c
  join public.perfis_acesso pa on pa.id = c.perfil_acesso_id
  join auth.users u on u.email = c.email
  where u.id = auth.uid()
  limit 1;
$$;

-- Checa uma permissão booleana específica pelo nome do campo em AccessPolicyPermissions
create or replace function public.has_permission(perm_key text)
returns boolean
language sql
stable
as $$
  select coalesce((public.current_permissions() ->> perm_key)::boolean, false);
$$;

-- Verifica se o colaborador autenticado é ADMIN (perfil com politicas_acesso = true,
-- usado como proxy de "administrador" já que não há coluna de role separada)
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.has_permission('politicas_acesso');
$$;

-- -------------------------------------------------------------------------------------
-- 4.3 Habilitar RLS em todas as tabelas
-- -------------------------------------------------------------------------------------
alter table public.perfis_acesso enable row level security;
alter table public.colaboradores enable row level security;
alter table public.pesquisas enable row level security;
alter table public.respostas enable row level security;
alter table public.metas enable row level security;
alter table public.metas_globais enable row level security;
alter table public.historico_acoes enable row level security;
alter table public.conexoes_recentes enable row level security;
alter table public.importacoes_externas enable row level security;
alter table public.sync_tokens enable row level security;

-- -------------------------------------------------------------------------------------
-- 4.4 Políticas — perfis_acesso
-- -------------------------------------------------------------------------------------
drop policy if exists "perfis_acesso_select_authenticated" on public.perfis_acesso;
create policy "perfis_acesso_select_authenticated"
  on public.perfis_acesso for select
  using (public.is_authenticated());

drop policy if exists "perfis_acesso_write_politicas_acesso" on public.perfis_acesso;
create policy "perfis_acesso_write_politicas_acesso"
  on public.perfis_acesso for all
  using (public.has_permission('politicas_acesso'))
  with check (public.has_permission('politicas_acesso'));

-- -------------------------------------------------------------------------------------
-- 4.5 Políticas — colaboradores
-- -------------------------------------------------------------------------------------
drop policy if exists "colaboradores_select_com_permissao" on public.colaboradores;
create policy "colaboradores_select_com_permissao"
  on public.colaboradores for select
  using (public.has_permission('colaboradores_acesso') or id = public.current_colaborador_id());

drop policy if exists "colaboradores_insert" on public.colaboradores;
create policy "colaboradores_insert"
  on public.colaboradores for insert
  with check (public.has_permission('colaboradores_incluir'));

drop policy if exists "colaboradores_update" on public.colaboradores;
create policy "colaboradores_update"
  on public.colaboradores for update
  using (public.has_permission('colaboradores_editar') or public.has_permission('colaboradores_desativar') or public.has_permission('colaboradores_alterar_senha'))
  with check (public.has_permission('colaboradores_editar') or public.has_permission('colaboradores_desativar') or public.has_permission('colaboradores_alterar_senha'));

drop policy if exists "colaboradores_delete" on public.colaboradores;
create policy "colaboradores_delete"
  on public.colaboradores for delete
  using (public.has_permission('colaboradores_desativar'));

-- -------------------------------------------------------------------------------------
-- 4.6 Políticas — pesquisas
-- -------------------------------------------------------------------------------------
drop policy if exists "pesquisas_select" on public.pesquisas;
create policy "pesquisas_select"
  on public.pesquisas for select
  using (
    public.has_permission('pesquisa_acesso')
    and (
      public.has_permission('pesquisa_acessa_todas_sem_associacao')
      or public.current_colaborador_id() = any (pesquisadores_ids)
      or colaborador_web_id = public.current_colaborador_id()
      or status <> 'excluida'
    )
  );

drop policy if exists "pesquisas_insert" on public.pesquisas;
create policy "pesquisas_insert"
  on public.pesquisas for insert
  with check (public.has_permission('pesquisa_criar'));

drop policy if exists "pesquisas_update" on public.pesquisas;
create policy "pesquisas_update"
  on public.pesquisas for update
  using (public.has_permission('pesquisa_alterar') or public.has_permission('pesquisa_desativar'))
  with check (public.has_permission('pesquisa_alterar') or public.has_permission('pesquisa_desativar'));

drop policy if exists "pesquisas_delete" on public.pesquisas;
create policy "pesquisas_delete"
  on public.pesquisas for delete
  using (public.has_permission('pesquisa_excluir'));

-- -------------------------------------------------------------------------------------
-- 4.7 Políticas — respostas
-- -------------------------------------------------------------------------------------
drop policy if exists "respostas_select" on public.respostas;
create policy "respostas_select"
  on public.respostas for select
  using (public.has_permission('respostas_acesso') or pesquisador_id = public.current_colaborador_id());

drop policy if exists "respostas_insert" on public.respostas;
create policy "respostas_insert"
  on public.respostas for insert
  with check (public.is_authenticated());

drop policy if exists "respostas_update" on public.respostas;
create policy "respostas_update"
  on public.respostas for update
  using (public.has_permission('respostas_alterar') or public.has_permission('analise_criar_alterar_excluir_resposta'))
  with check (public.has_permission('respostas_alterar') or public.has_permission('analise_criar_alterar_excluir_resposta'));

drop policy if exists "respostas_delete" on public.respostas;
create policy "respostas_delete"
  on public.respostas for delete
  using (public.has_permission('analise_criar_alterar_excluir_resposta'));

-- -------------------------------------------------------------------------------------
-- 4.8 Políticas — metas
-- -------------------------------------------------------------------------------------
drop policy if exists "metas_select" on public.metas;
create policy "metas_select"
  on public.metas for select
  using (public.has_permission('meta_acesso'));

drop policy if exists "metas_write" on public.metas;
create policy "metas_write"
  on public.metas for all
  using (public.has_permission('meta_criar_alterar_excluir'))
  with check (public.has_permission('meta_criar_alterar_excluir'));

-- -------------------------------------------------------------------------------------
-- 4.9 Políticas — metas_globais
-- -------------------------------------------------------------------------------------
drop policy if exists "metas_globais_select" on public.metas_globais;
create policy "metas_globais_select"
  on public.metas_globais for select
  using (public.has_permission('meta_acesso'));

drop policy if exists "metas_globais_write" on public.metas_globais;
create policy "metas_globais_write"
  on public.metas_globais for all
  using (public.has_permission('meta_criar_alterar_excluir'))
  with check (public.has_permission('meta_criar_alterar_excluir'));

-- -------------------------------------------------------------------------------------
-- 4.10 Políticas — historico_acoes (auditoria: leitura ampla, escrita apenas via sistema)
-- -------------------------------------------------------------------------------------
drop policy if exists "historico_acoes_select" on public.historico_acoes;
create policy "historico_acoes_select"
  on public.historico_acoes for select
  using (public.is_authenticated());

drop policy if exists "historico_acoes_insert" on public.historico_acoes;
create policy "historico_acoes_insert"
  on public.historico_acoes for insert
  with check (public.is_authenticated());

-- Nenhuma política de UPDATE/DELETE é criada propositalmente: registros de auditoria
-- são imutáveis por design (append-only). Apenas a service_role (que ignora RLS) pode
-- corrigir dados em caso de necessidade operacional excepcional.

-- -------------------------------------------------------------------------------------
-- 4.11 Políticas — conexoes_recentes
-- -------------------------------------------------------------------------------------
drop policy if exists "conexoes_recentes_select" on public.conexoes_recentes;
create policy "conexoes_recentes_select"
  on public.conexoes_recentes for select
  using (public.has_permission('home_visualiza_conexoes_recentes'));

drop policy if exists "conexoes_recentes_insert" on public.conexoes_recentes;
create policy "conexoes_recentes_insert"
  on public.conexoes_recentes for insert
  with check (public.is_authenticated());

-- -------------------------------------------------------------------------------------
-- 4.12 Políticas — importacoes_externas
-- -------------------------------------------------------------------------------------
drop policy if exists "importacoes_externas_select" on public.importacoes_externas;
create policy "importacoes_externas_select"
  on public.importacoes_externas for select
  using (public.has_permission('importacao_acesso'));

drop policy if exists "importacoes_externas_insert" on public.importacoes_externas;
create policy "importacoes_externas_insert"
  on public.importacoes_externas for insert
  with check (public.has_permission('importacao_importar_planilha'));

drop policy if exists "importacoes_externas_delete" on public.importacoes_externas;
create policy "importacoes_externas_delete"
  on public.importacoes_externas for delete
  using (public.has_permission('importacao_excluir'));

-- -------------------------------------------------------------------------------------
-- 4.13 Políticas — sync_tokens (uso interno do backend; frontend nunca acessa direto)
-- -------------------------------------------------------------------------------------
-- Sem políticas de SELECT/INSERT/UPDATE/DELETE para usuários comuns: esta tabela só é
-- manipulada pelas funções serverless usando a SUPABASE_SERVICE_ROLE_KEY, que ignora
-- RLS. Isso impede qualquer client-side (anon key) de ler ou forjar tokens de sync.


-- =====================================================================================
-- 5. FUNÇÕES DE CRUD E REGRAS DE NEGÓCIO
-- =====================================================================================
-- Todas SECURITY DEFINER + search_path fixo (boa prática contra search_path hijacking).
-- Podem ser chamadas via supabase-js: `client.rpc('nome_funcao', { ...params })`.

-- -------------------------------------------------------------------------------------
-- 5.1 Pesquisas
-- -------------------------------------------------------------------------------------
create or replace function public.criar_pesquisa(p_survey jsonb)
returns public.pesquisas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.pesquisas;
begin
  insert into public.pesquisas (
    id, codigo, nome, descricao, status, habilitar_coleta_web, tipo_coleta_web,
    colaborador_web_id, perguntas, regras, metas, metas_globais, pesquisadores_ids,
    ciclo_atual, versao, criada_em, atualizada_em, em_andamento, server_version, dados_completos
  ) values (
    coalesce(p_survey->>'id', 'pesq_' || extract(epoch from now())::bigint),
    p_survey->>'codigo',
    p_survey->>'nome',
    coalesce(p_survey->>'descricao', ''),
    coalesce(p_survey->>'status', 'ativa'),
    coalesce((p_survey->>'habilitarColetaWeb')::boolean, false),
    coalesce(p_survey->>'tipoColetaWeb', 'interno'),
    p_survey->>'colaboradorWebId',
    coalesce(p_survey->'perguntas', '[]'::jsonb),
    coalesce(p_survey->'regras', '[]'::jsonb),
    coalesce(p_survey->'metas', '[]'::jsonb),
    coalesce(p_survey->'metasGlobais', '[]'::jsonb),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_survey->'pesquisadoresIds', '[]'::jsonb)) x), '{}'),
    coalesce((p_survey->>'cicloAtual')::int, 1),
    1,
    now(),
    now(),
    coalesce(p_survey->>'status', 'ativa') = 'ativa',
    1,
    p_survey
  )
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.atualizar_pesquisa(p_id text, p_survey jsonb)
returns public.pesquisas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.pesquisas;
begin
  update public.pesquisas set
    codigo = coalesce(p_survey->>'codigo', codigo),
    nome = coalesce(p_survey->>'nome', nome),
    descricao = coalesce(p_survey->>'descricao', descricao),
    status = coalesce(p_survey->>'status', status),
    habilitar_coleta_web = coalesce((p_survey->>'habilitarColetaWeb')::boolean, habilitar_coleta_web),
    tipo_coleta_web = coalesce(p_survey->>'tipoColetaWeb', tipo_coleta_web),
    colaborador_web_id = coalesce(p_survey->>'colaboradorWebId', colaborador_web_id),
    perguntas = coalesce(p_survey->'perguntas', perguntas),
    regras = coalesce(p_survey->'regras', regras),
    metas = coalesce(p_survey->'metas', metas),
    metas_globais = coalesce(p_survey->'metasGlobais', metas_globais),
    pesquisadores_ids = coalesce((select array_agg(x) from jsonb_array_elements_text(p_survey->'pesquisadoresIds') x), pesquisadores_ids),
    ciclo_atual = coalesce((p_survey->>'cicloAtual')::int, ciclo_atual),
    versao = versao + 1,
    server_version = server_version + 1,
    atualizada_em = now(),
    dados_completos = coalesce(p_survey, dados_completos)
  where id = p_id
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.listar_pesquisas()
returns setof public.pesquisas
language sql
security definer
set search_path = public
as $$
  select * from public.pesquisas order by atualizada_em desc;
$$;

create or replace function public.buscar_pesquisa_por_id(p_id text)
returns public.pesquisas
language sql
security definer
set search_path = public
as $$
  select * from public.pesquisas where id = p_id;
$$;

-- Soft-delete: nunca apaga fisicamente, apenas marca status='excluida'
create or replace function public.excluir_pesquisa(p_id text)
returns public.pesquisas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.pesquisas;
begin
  update public.pesquisas
  set status = 'excluida', atualizada_em = now()
  where id = p_id
  returning * into v_row;
  return v_row;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 5.2 Colaboradores
-- -------------------------------------------------------------------------------------
create or replace function public.criar_colaborador(p_collab jsonb, p_senha_hash text)
returns public.colaboradores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.colaboradores;
begin
  insert into public.colaboradores (
    id, cpf, nome, rg, data_nascimento, sexo, login, senha, perfil_acesso_id,
    email, celular, nome_contato_celular, telefone_fixo, nome_contato_fixo,
    ativo, pesquisas_vinculadas_ids, criado_em
  ) values (
    coalesce(p_collab->>'id', 'colab_' || extract(epoch from now())::bigint),
    p_collab->>'cpf',
    p_collab->>'nome',
    p_collab->>'rg',
    nullif(p_collab->>'dataNascimento', '')::date,
    p_collab->>'sexo',
    p_collab->>'login',
    p_senha_hash,
    (p_collab->>'perfilAcessoId')::uuid,
    p_collab->>'email',
    p_collab->>'celular',
    p_collab->>'nomeContatoCelular',
    p_collab->>'telefoneFixo',
    p_collab->>'nomeContatoFixo',
    coalesce((p_collab->>'ativo')::boolean, true),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_collab->'pesquisasVinculadasIds', '[]'::jsonb)) x), '{}'),
    now()
  )
  returning * into v_row;
  return v_row;
end;
$$;

-- Autentica um colaborador comparando o hash de senha (use crypt/pgcrypto no client
-- ou compare o hash gerado pelo backend — este exemplo assume hash já comparável via
-- extensão pgcrypto `crypt()`, se as senhas forem gravadas com `crypt(senha, gen_salt('bf'))`)
create or replace function public.autenticar_colaborador(p_login text, p_senha text)
returns public.colaboradores
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.colaboradores;
begin
  select * into v_row
  from public.colaboradores
  where login = p_login
    and ativo = true
    and senha = crypt(p_senha, senha);

  return v_row; -- null se não autenticar
end;
$$;

create or replace function public.atualizar_senha(p_colaborador_id text, p_nova_senha_hash text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.colaboradores set senha = p_nova_senha_hash where id = p_colaborador_id;
$$;

create or replace function public.desativar_colaborador(p_colaborador_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.colaboradores set ativo = false where id = p_colaborador_id;
$$;

create or replace function public.listar_colaboradores()
returns setof public.colaboradores
language sql
security definer
set search_path = public
as $$
  select * from public.colaboradores order by nome;
$$;

create or replace function public.buscar_colaborador_por_login(p_login text)
returns public.colaboradores
language sql
security definer
set search_path = public
as $$
  select * from public.colaboradores where login = p_login;
$$;

-- -------------------------------------------------------------------------------------
-- 5.3 Perfis de Acesso
-- -------------------------------------------------------------------------------------
create or replace function public.criar_perfil_acesso(p_nome text, p_descricao text, p_permissions jsonb)
returns public.perfis_acesso
language sql
security definer
set search_path = public
as $$
  insert into public.perfis_acesso (nome, descricao, permissions)
  values (p_nome, p_descricao, p_permissions)
  returning *;
$$;

create or replace function public.atualizar_perfil_acesso(p_id uuid, p_nome text, p_descricao text, p_permissions jsonb)
returns public.perfis_acesso
language sql
security definer
set search_path = public
as $$
  update public.perfis_acesso
  set nome = coalesce(p_nome, nome),
      descricao = coalesce(p_descricao, descricao),
      permissions = coalesce(p_permissions, permissions)
  where id = p_id
  returning *;
$$;

create or replace function public.listar_perfis()
returns setof public.perfis_acesso
language sql
security definer
set search_path = public
as $$
  select * from public.perfis_acesso order by nome;
$$;

-- -------------------------------------------------------------------------------------
-- 5.4 Respostas (entrevistas de campo)
-- -------------------------------------------------------------------------------------
create or replace function public.registrar_resposta(p_resposta jsonb)
returns public.respostas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.respostas;
begin
  insert into public.respostas (
    id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
    data_hora, status, respostas, geolocalizacao, audio_gravacao,
    respostas_alteradas_pelo_admin, historico_edicao
  ) values (
    coalesce(p_resposta->>'id', 'resp_' || extract(epoch from now())::bigint),
    p_resposta->>'codigoPesquisa',
    p_resposta->>'pesquisaId',
    p_resposta->>'pesquisaNome',
    p_resposta->>'pesquisadorId',
    p_resposta->>'pesquisadorNome',
    coalesce((p_resposta->>'dataHora')::timestamptz, now()),
    coalesce(p_resposta->>'status', 'concluida'),
    coalesce(p_resposta->'respostas', '[]'::jsonb),
    p_resposta->'geolocalizacao',
    p_resposta->'audioGravacao',
    coalesce((p_resposta->>'respostasAlteradasPeloAdmin')::boolean, false),
    coalesce(p_resposta->'historicoEdicao', '[]'::jsonb)
  )
  returning * into v_row;

  -- Atualiza metas automaticamente após cada nova coleta concluída
  if v_row.status = 'concluida' then
    perform public.recalcular_metas_da_pesquisa(v_row.pesquisa_id);
  end if;

  return v_row;
end;
$$;

create or replace function public.listar_respostas_por_pesquisa(p_pesquisa_id text)
returns setof public.respostas
language sql
security definer
set search_path = public
as $$
  select * from public.respostas where pesquisa_id = p_pesquisa_id order by data_hora desc;
$$;

create or replace function public.buscar_resposta_por_id(p_id text)
returns public.respostas
language sql
security definer
set search_path = public
as $$
  select * from public.respostas where id = p_id;
$$;

create or replace function public.atualizar_resposta(p_id text, p_resposta jsonb, p_motivo text default null, p_alterado_por text default null)
returns public.respostas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.respostas;
  v_novo_historico jsonb;
begin
  select historico_edicao into v_novo_historico from public.respostas where id = p_id;

  if p_alterado_por is not null then
    v_novo_historico := coalesce(v_novo_historico, '[]'::jsonb) || jsonb_build_object(
      'alteradoPor', p_alterado_por,
      'dataHora', now(),
      'motivo', coalesce(p_motivo, '')
    );
  end if;

  update public.respostas set
    respostas = coalesce(p_resposta->'respostas', respostas),
    geolocalizacao = coalesce(p_resposta->'geolocalizacao', geolocalizacao),
    status = coalesce(p_resposta->>'status', status),
    respostas_alteradas_pelo_admin = true,
    historico_edicao = coalesce(v_novo_historico, historico_edicao)
  where id = p_id
  returning * into v_row;

  perform public.recalcular_metas_da_pesquisa(v_row.pesquisa_id);

  return v_row;
end;
$$;

create or replace function public.excluir_resposta(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pesquisa_id text;
begin
  select pesquisa_id into v_pesquisa_id from public.respostas where id = p_id;
  delete from public.respostas where id = p_id;
  if v_pesquisa_id is not null then
    perform public.recalcular_metas_da_pesquisa(v_pesquisa_id);
  end if;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 5.5 Metas por pergunta
-- -------------------------------------------------------------------------------------
create or replace function public.criar_meta(p_meta jsonb)
returns public.metas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.metas;
begin
  insert into public.metas (id, pesquisa_id, pergunta_id, condicao, resposta, quantidade_alvo, quantidade_atingida, ciclo)
  values (
    coalesce(p_meta->>'id', 'meta_' || extract(epoch from now())::bigint),
    p_meta->>'pesquisaId',
    p_meta->>'perguntaId',
    p_meta->>'condicao',
    p_meta->>'resposta',
    coalesce((p_meta->>'quantidadeAlvo')::int, 0),
    coalesce((p_meta->>'quantidadeAtingida')::int, 0),
    coalesce(p_meta->>'ciclo', '1')
  )
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.atualizar_meta(p_id text, p_meta jsonb)
returns public.metas
language sql
security definer
set search_path = public
as $$
  update public.metas set
    condicao = coalesce(p_meta->>'condicao', condicao),
    resposta = coalesce(p_meta->>'resposta', resposta),
    quantidade_alvo = coalesce((p_meta->>'quantidadeAlvo')::int, quantidade_alvo),
    ciclo = coalesce(p_meta->>'ciclo', ciclo)
  where id = p_id
  returning *;
$$;

-- Conta em `respostas` quantos registros batem a condição e atualiza quantidade_atingida
create or replace function public.calcular_meta_atingida(
  p_pesquisa_id text,
  p_pergunta_id text,
  p_condicao text,
  p_resposta text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
begin
  select count(*) into v_total
  from public.respostas r,
       jsonb_array_elements(r.respostas) item
  where r.pesquisa_id = p_pesquisa_id
    and r.status = 'concluida'
    and item->>'perguntaId' = p_pergunta_id
    and (
      (p_condicao = 'igual'      and item->>'resposta' = p_resposta) or
      (p_condicao = 'diferente'  and item->>'resposta' <> p_resposta) or
      (p_condicao = 'contem'     and item->>'resposta' ilike '%' || p_resposta || '%') or
      (p_condicao = 'maior_que'  and (item->>'resposta') ~ '^-?[0-9.]+$' and (item->>'resposta')::numeric > p_resposta::numeric) or
      (p_condicao = 'menor_que'  and (item->>'resposta') ~ '^-?[0-9.]+$' and (item->>'resposta')::numeric < p_resposta::numeric)
    );

  update public.metas
  set quantidade_atingida = v_total
  where pesquisa_id = p_pesquisa_id and pergunta_id = p_pergunta_id and condicao = p_condicao and resposta = p_resposta;

  return v_total;
end;
$$;

-- Recalcula todas as metas (por pergunta) de uma pesquisa de uma vez
create or replace function public.recalcular_metas_da_pesquisa(p_pesquisa_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
begin
  for m in select * from public.metas where pesquisa_id = p_pesquisa_id loop
    perform public.calcular_meta_atingida(p_pesquisa_id, m.pergunta_id, m.condicao, m.resposta);
  end loop;

  perform public.calcular_meta_global(p_pesquisa_id);
end;
$$;

-- -------------------------------------------------------------------------------------
-- 5.6 Metas Globais por Demografia
-- -------------------------------------------------------------------------------------
create or replace function public.criar_meta_global(p_meta jsonb)
returns public.metas_globais
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.metas_globais;
begin
  insert into public.metas_globais (
    id, pesquisa_id, titulo, descricao, criterios, meta_global_alvo,
    meta_global_atingida, atribuicoes, status, ciclo, criado_em, atualizado_em
  ) values (
    coalesce(p_meta->>'id', 'mg_' || extract(epoch from now())::bigint),
    p_meta->>'pesquisaId',
    p_meta->>'titulo',
    p_meta->>'descricao',
    coalesce(p_meta->'criterios', '{}'::jsonb),
    coalesce((p_meta->>'metaGlobalAlvo')::int, 0),
    coalesce((p_meta->>'metaGlobalAtingida')::int, 0),
    coalesce(p_meta->'atribuicoes', '[]'::jsonb),
    coalesce(p_meta->>'status', 'ativa'),
    p_meta->>'ciclo',
    now(),
    now()
  )
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.atualizar_meta_global(p_id text, p_meta jsonb)
returns public.metas_globais
language sql
security definer
set search_path = public
as $$
  update public.metas_globais set
    titulo = coalesce(p_meta->>'titulo', titulo),
    descricao = coalesce(p_meta->>'descricao', descricao),
    criterios = coalesce(p_meta->'criterios', criterios),
    meta_global_alvo = coalesce((p_meta->>'metaGlobalAlvo')::int, meta_global_alvo),
    atribuicoes = coalesce(p_meta->'atribuicoes', atribuicoes),
    status = coalesce(p_meta->>'status', status),
    ciclo = coalesce(p_meta->>'ciclo', ciclo)
  where id = p_id
  returning *;
$$;

-- Agrega respostas por critérios demográficos (faixa etária/sexo/bairro) e atualiza
-- meta_global_atingida + o cotaAtingida de cada atribuição por pesquisador
create or replace function public.calcular_meta_global(p_pesquisa_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mg record;
  v_total int;
  v_atribuicoes jsonb;
  v_atr jsonb;
  v_nova_atribuicoes jsonb;
  v_cota_atingida int;
begin
  for mg in select * from public.metas_globais where pesquisa_id = p_pesquisa_id loop

    -- Total geral que bate os critérios demográficos da meta global
    select count(*) into v_total
    from public.respostas r
    where r.pesquisa_id = p_pesquisa_id
      and r.status = 'concluida'
      and (
        mg.criterios->>'bairro' is null or mg.criterios->>'bairro' = 'Todos'
        or r.geolocalizacao->>'bairro' = mg.criterios->>'bairro'
      );
    -- Nota: idade/sexo dependem de como o front grava a resposta correspondente às
    -- perguntas demográficas dentro de `respostas` (jsonb). Ajuste os filtros acima
    -- para casar com os códigos de pergunta usados por sua pesquisa, se necessário.

    -- Recalcula cotaAtingida de cada pesquisador nas atribuições
    v_atribuicoes := mg.atribuicoes;
    v_nova_atribuicoes := '[]'::jsonb;

    for v_atr in select * from jsonb_array_elements(coalesce(v_atribuicoes, '[]'::jsonb)) loop
      select count(*) into v_cota_atingida
      from public.respostas r
      where r.pesquisa_id = p_pesquisa_id
        and r.status = 'concluida'
        and r.pesquisador_id = (v_atr->>'pesquisadorId');

      v_nova_atribuicoes := v_nova_atribuicoes || jsonb_set(v_atr, '{cotaAtingida}', to_jsonb(v_cota_atingida));
    end loop;

    update public.metas_globais
    set meta_global_atingida = v_total,
        atribuicoes = v_nova_atribuicoes
    where id = mg.id;

  end loop;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 5.7 Auditoria
-- -------------------------------------------------------------------------------------
create or replace function public.registrar_log_auditoria(p_log jsonb)
returns public.historico_acoes
language sql
security definer
set search_path = public
as $$
  insert into public.historico_acoes (
    id, categoria, tipo_acao, titulo_acao, descricao_detalhada, autor, alvo,
    alteracoes, motivo_conformidade, "timestamp", hash_integridade, status_conformidade
  ) values (
    coalesce(p_log->>'id', 'log_' || extract(epoch from now())::bigint),
    p_log->>'categoria',
    p_log->>'tipoAcao',
    p_log->>'tituloAcao',
    p_log->>'descricaoDetalhada',
    p_log->'autor',
    p_log->'alvo',
    coalesce(p_log->'alteracoes', '[]'::jsonb),
    p_log->>'motivoConformidade',
    coalesce((p_log->>'timestamp')::timestamptz, now()),
    p_log->>'hashIntegridade',
    coalesce(p_log->>'statusConformidade', 'conforme')
  )
  returning *;
$$;

create or replace function public.listar_auditoria(
  p_categoria text default null,
  p_tipo_acao text default null,
  p_data_inicio timestamptz default null,
  p_data_fim timestamptz default null
)
returns setof public.historico_acoes
language sql
security definer
set search_path = public
as $$
  select * from public.historico_acoes
  where (p_categoria is null or categoria = p_categoria)
    and (p_tipo_acao is null or tipo_acao = p_tipo_acao)
    and (p_data_inicio is null or "timestamp" >= p_data_inicio)
    and (p_data_fim is null or "timestamp" <= p_data_fim)
  order by "timestamp" desc;
$$;

-- "Exportar" apenas materializa o result set — a serialização para CSV/JSON é feita
-- no frontend (exportUtils.ts), que já existe e não deve ser alterado.
create or replace function public.exportar_auditoria(
  p_data_inicio timestamptz default null,
  p_data_fim timestamptz default null
)
returns setof public.historico_acoes
language sql
security definer
set search_path = public
as $$
  select * from public.listar_auditoria(null, null, p_data_inicio, p_data_fim);
$$;

-- -------------------------------------------------------------------------------------
-- 5.8 Conexões recentes
-- -------------------------------------------------------------------------------------
create or replace function public.registrar_conexao(p_conexao jsonb)
returns public.conexoes_recentes
language sql
security definer
set search_path = public
as $$
  insert into public.conexoes_recentes (id, usuario, perfil, ip, data_hora, navegador, status)
  values (
    coalesce(p_conexao->>'id', 'conn_' || extract(epoch from now())::bigint),
    p_conexao->>'usuario',
    p_conexao->>'perfil',
    coalesce(p_conexao->>'ip', ''),
    coalesce((p_conexao->>'dataHora')::timestamptz, now()),
    coalesce(p_conexao->>'navegador', ''),
    coalesce(p_conexao->>'status', 'sucesso')
  )
  returning *;
$$;

create or replace function public.listar_conexoes_recentes(p_limite int default 50)
returns setof public.conexoes_recentes
language sql
security definer
set search_path = public
as $$
  select * from public.conexoes_recentes order by data_hora desc limit p_limite;
$$;

-- -------------------------------------------------------------------------------------
-- 5.9 Importações externas
-- -------------------------------------------------------------------------------------
create or replace function public.registrar_importacao(p_import jsonb)
returns public.importacoes_externas
language sql
security definer
set search_path = public
as $$
  insert into public.importacoes_externas (id, nome_arquivo, pesquisa_id, data_importacao, total_registros, colunas, status)
  values (
    coalesce(p_import->>'id', 'imp_' || extract(epoch from now())::bigint),
    p_import->>'nomeArquivo',
    p_import->>'pesquisaId',
    coalesce((p_import->>'dataImportacao')::timestamptz, now()),
    coalesce((p_import->>'totalRegistros')::int, 0),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_import->'colunas', '[]'::jsonb)) x), '{}'),
    coalesce(p_import->>'status', 'processando')
  )
  returning *;
$$;

create or replace function public.listar_importacoes(p_pesquisa_id text default null)
returns setof public.importacoes_externas
language sql
security definer
set search_path = public
as $$
  select * from public.importacoes_externas
  where p_pesquisa_id is null or pesquisa_id = p_pesquisa_id
  order by data_importacao desc;
$$;


-- =====================================================================================
-- 6. VIEWS ANALÍTICAS (alimentam os painéis existentes: dashboard, metas, coleta diária)
-- =====================================================================================

-- 6.1 Total de entrevistas concluídas por pesquisa
create or replace view public.view_total_entrevistas_por_pesquisa as
select
  p.id as pesquisa_id,
  p.nome as pesquisa_nome,
  p.codigo as pesquisa_codigo,
  count(r.id) filter (where r.status = 'concluida') as total_concluidas,
  count(r.id) filter (where r.status = 'em_andamento') as total_em_andamento,
  count(r.id) filter (where r.status = 'cancelada') as total_canceladas,
  count(r.id) as total_geral
from public.pesquisas p
left join public.respostas r on r.pesquisa_id = p.id
group by p.id, p.nome, p.codigo;

-- 6.2 Progresso das metas por pesquisa (join metas <-> pesquisas com percentual)
create or replace view public.view_metas_por_pesquisa as
select
  m.id as meta_id,
  m.pesquisa_id,
  p.nome as pesquisa_nome,
  m.pergunta_id,
  m.condicao,
  m.resposta,
  m.quantidade_alvo,
  m.quantidade_atingida,
  case when m.quantidade_alvo > 0
    then round((m.quantidade_atingida::numeric / m.quantidade_alvo::numeric) * 100, 2)
    else 0
  end as percentual_atingimento,
  m.ciclo
from public.metas m
join public.pesquisas p on p.id = m.pesquisa_id;

-- 6.3 Progresso das metas globais por demografia
create or replace view public.view_metas_globais_progresso as
select
  mg.id as meta_global_id,
  mg.pesquisa_id,
  p.nome as pesquisa_nome,
  mg.titulo,
  mg.criterios,
  mg.meta_global_alvo,
  mg.meta_global_atingida,
  case when mg.meta_global_alvo > 0
    then round((mg.meta_global_atingida::numeric / mg.meta_global_alvo::numeric) * 100, 2)
    else 0
  end as percentual_atingimento,
  mg.status,
  mg.atribuicoes
from public.metas_globais mg
join public.pesquisas p on p.id = mg.pesquisa_id;

-- 6.4 Coleta diária agregada (usada pelo DailyCollectionMetric no frontend)
create or replace view public.view_coleta_diaria as
select
  date(r.data_hora) as data,
  r.pesquisa_id,
  count(*) as total_entrevistas,
  count(distinct r.pesquisador_id) as pesquisadores_ativos,
  count(*) filter (where r.status = 'concluida') as concluidas,
  count(*) filter (where r.status = 'cancelada') as canceladas,
  round(avg(
    case when r.status = 'concluida'
      then extract(epoch from (r.data_hora - r.data_hora)) -- placeholder: duração real não é modelada em InterviewSubmission
      else null
    end
  ), 2) as tempo_medio
from public.respostas r
group by date(r.data_hora), r.pesquisa_id
order by data desc;

comment on view public.view_coleta_diaria is 'tempo_medio é um placeholder (0), pois o tipo InterviewSubmission não registra duração da entrevista — apenas dataHora. Se o front vier a enviar duração, adicione a coluna e ajuste esta view.';

-- 6.5 Progresso individual por pesquisador (para ResearcherIndividualGoalsView)
create or replace view public.view_progresso_pesquisador as
select
  r.pesquisador_id,
  r.pesquisador_nome,
  r.pesquisa_id,
  p.nome as pesquisa_nome,
  count(*) filter (where r.status = 'concluida') as total_coletado
from public.respostas r
join public.pesquisas p on p.id = r.pesquisa_id
group by r.pesquisador_id, r.pesquisador_nome, r.pesquisa_id, p.nome;

-- 6.6 Progresso demográfico agregado (bairro extraído de geolocalizacao)
create or replace view public.view_progresso_demografico as
select
  r.pesquisa_id,
  coalesce(r.geolocalizacao->>'bairro', 'Não informado') as bairro,
  coalesce(r.geolocalizacao->>'cidade', 'Não informado') as cidade,
  count(*) as total
from public.respostas r
where r.status = 'concluida'
group by r.pesquisa_id, r.geolocalizacao->>'bairro', r.geolocalizacao->>'cidade';

-- 6.7 Percentual de atingimento da meta diária (usada em DailyCollectionMetric.atingimentoPercentual)
create or replace function public.calcular_atingimento_meta_diaria(p_pesquisa_id text, p_data date, p_meta_diaria int)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case when p_meta_diaria > 0
    then round((
      (select count(*) from public.respostas r
       where r.pesquisa_id = p_pesquisa_id
         and date(r.data_hora) = p_data
         and r.status = 'concluida')::numeric / p_meta_diaria::numeric
    ) * 100, 2)
    else 0
  end;
$$;


-- =====================================================================================
-- 7. STORAGE (gravações de áudio e planilhas de importação)
-- =====================================================================================

insert into storage.buckets (id, name, public)
values ('audio-gravacoes', 'audio-gravacoes', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('importacoes', 'importacoes', false)
on conflict (id) do nothing;

-- 7.1 Políticas — bucket audio-gravacoes
-- Leitura: apenas quem tem a permissão pesquisa_ouvir_audio
drop policy if exists "audio_gravacoes_select" on storage.objects;
create policy "audio_gravacoes_select"
  on storage.objects for select
  using (bucket_id = 'audio-gravacoes' and public.has_permission('pesquisa_ouvir_audio'));

-- Escrita: autenticados com acesso a pesquisa (coleta em campo)
drop policy if exists "audio_gravacoes_insert" on storage.objects;
create policy "audio_gravacoes_insert"
  on storage.objects for insert
  with check (bucket_id = 'audio-gravacoes' and public.has_permission('pesquisa_acesso'));

drop policy if exists "audio_gravacoes_delete" on storage.objects;
create policy "audio_gravacoes_delete"
  on storage.objects for delete
  using (bucket_id = 'audio-gravacoes' and public.has_permission('pesquisa_excluir'));

-- 7.2 Políticas — bucket importacoes
drop policy if exists "importacoes_select" on storage.objects;
create policy "importacoes_select"
  on storage.objects for select
  using (bucket_id = 'importacoes' and public.has_permission('importacao_acesso'));

drop policy if exists "importacoes_insert" on storage.objects;
create policy "importacoes_insert"
  on storage.objects for insert
  with check (bucket_id = 'importacoes' and public.has_permission('importacao_importar_planilha'));

drop policy if exists "importacoes_delete" on storage.objects;
create policy "importacoes_delete"
  on storage.objects for delete
  using (bucket_id = 'importacoes' and public.has_permission('importacao_excluir'));


-- =====================================================================================
-- FIM DA MIGRATION
-- =====================================================================================


-- #######################################################################################
-- ##  PARTE 2 DE 3 - PLANO AMOSTRAL, COTAS POR SEXO E CONFIGURACAO DE AUDIO
-- #######################################################################################

-- =====================================================================================
-- DataQuest — Migration 0002: Plano Amostral, Cotas por Sexo e Configuração de Áudio
-- =====================================================================================
-- Esta migration acompanha a evolução do tipo TypeScript `Survey` (src/types.ts):
-- novos campos de dimensionamento de equipe/plano amostral (usados pelo
-- TeamSizingModule.tsx e pelo simulador de amostragem), cotas por sexo, datas de
-- campo e configuração de gravação de áudio (usada pelo AudioExportModal.tsx e
-- audioUtils.ts). Nenhum campo, tabela ou coluna anterior é renomeado ou removido.
--
-- IDEMPOTENTE: usa `ADD COLUMN IF NOT EXISTS` em todas as alterações, portanto pode
-- ser executada com segurança mesmo que já tenha rodado antes.
--
-- Observação importante: como `pesquisas.dados_completos` (jsonb) já guarda o objeto
-- Survey inteiro, esses campos JÁ estavam sendo persistidos mesmo antes desta
-- migration — o que esta migration adiciona são COLUNAS NORMALIZADAS equivalentes,
-- úteis para índices, filtros e relatórios via SQL direto (sem precisar abrir o jsonb).
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Datas de campo
-- -------------------------------------------------------------------------------------
alter table public.pesquisas add column if not exists data_inicio date;
alter table public.pesquisas add column if not exists data_fim date;

comment on column public.pesquisas.data_inicio is 'Data de início do campo (Survey.dataInicio)';
comment on column public.pesquisas.data_fim is 'Data limite/término do campo (Survey.dataFim)';

-- -------------------------------------------------------------------------------------
-- 2. Plano amostral e dimensionamento de equipe em campo
-- -------------------------------------------------------------------------------------
alter table public.pesquisas add column if not exists meta_total_coletas int;
alter table public.pesquisas add column if not exists nivel_confianca_percentual numeric(5,2) default 95;
alter table public.pesquisas add column if not exists margem_erro_percentual numeric(5,2) default 3.5;
alter table public.pesquisas add column if not exists populacao_universo int;
alter table public.pesquisas add column if not exists meta_sexo_masculino int;
alter table public.pesquisas add column if not exists meta_sexo_feminino int;
alter table public.pesquisas add column if not exists meta_sexo_outro int;
alter table public.pesquisas add column if not exists dias_previstos_campo int default 3;
alter table public.pesquisas add column if not exists media_coletas_dia_pesquisador int default 15;
alter table public.pesquisas add column if not exists reserva_tecnica_percentual numeric(5,2) default 15;

comment on column public.pesquisas.meta_total_coletas is 'Meta total estabelecida de coletas / amostra total N (Survey.metaTotalColetas)';
comment on column public.pesquisas.nivel_confianca_percentual is 'Nível de confiança da amostra, ex. 90/95/99 (Survey.nivelConfiancaPercentual)';
comment on column public.pesquisas.margem_erro_percentual is 'Margem de erro máxima aceitável, ex. 3.5 (Survey.margemErroPercentual)';
comment on column public.pesquisas.populacao_universo is 'População total finita / universo amostral (Survey.populacaoUniverso)';
comment on column public.pesquisas.meta_sexo_masculino is 'Cota de sexo masculino (Survey.metaSexoMasculino)';
comment on column public.pesquisas.meta_sexo_feminino is 'Cota de sexo feminino (Survey.metaSexoFeminino)';
comment on column public.pesquisas.meta_sexo_outro is 'Cota de sexo outro/não binário (Survey.metaSexoOutro)';
comment on column public.pesquisas.dias_previstos_campo is 'Dias úteis estimados para o trabalho de campo (Survey.diasPrevistosCampo)';
comment on column public.pesquisas.media_coletas_dia_pesquisador is 'Capacidade média diária por pesquisador (Survey.mediaColetasDiaPesquisador)';
comment on column public.pesquisas.reserva_tecnica_percentual is 'Margem de segurança de amostragem, ex. 15% (Survey.reservaTecnicaPercentual)';

-- -------------------------------------------------------------------------------------
-- 3. Configuração de gravação de áudio de campo (por pesquisa)
-- -------------------------------------------------------------------------------------
alter table public.pesquisas add column if not exists habilitar_gravacao_audio boolean default true;
alter table public.pesquisas add column if not exists gravar_audio_a_partir_pergunta_id text;
alter table public.pesquisas add column if not exists tempo_limite_gravacao_minutos int default 2;

comment on column public.pesquisas.habilitar_gravacao_audio is 'Se a gravação de áudio está habilitada nesta pesquisa (Survey.habilitarGravacaoAudio)';
comment on column public.pesquisas.gravar_audio_a_partir_pergunta_id is 'ID da pergunta a partir de onde a gravação é iniciada (Survey.gravarAudioAPartirPerguntaId)';
comment on column public.pesquisas.tempo_limite_gravacao_minutos is 'Tempo máximo de gravação em minutos, 1 a 10 (Survey.tempoLimiteGravacaoMinutos)';

-- -------------------------------------------------------------------------------------
-- 4. Metadados extras de áudio por resposta (InterviewSubmission.audioGravacao)
-- -------------------------------------------------------------------------------------
-- audio_gravacao já é jsonb (migration 0001) e já comporta os novos subcampos
-- audioUrl, iniciouNaPerguntaCodigo e tempoConfiguradoMinutos sem alteração de schema.
-- Nada a fazer aqui além deste comentário informativo.

-- -------------------------------------------------------------------------------------
-- 5. Função utilitária: sincronizar as colunas normalizadas a partir de dados_completos
-- -------------------------------------------------------------------------------------
-- Útil para pesquisas que já foram inseridas via upsert do supabaseSyncService.ts
-- (que grava o objeto inteiro em dados_completos) mas ainda não têm as colunas
-- normalizadas acima preenchidas. Rode manualmente uma vez após a migration, se
-- necessário: select public.sincronizar_colunas_plano_amostral();
create or replace function public.sincronizar_colunas_plano_amostral()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  update public.pesquisas
  set
    data_inicio = coalesce(data_inicio, nullif(dados_completos->>'dataInicio', '')::date),
    data_fim = coalesce(data_fim, nullif(dados_completos->>'dataFim', '')::date),
    meta_total_coletas = coalesce(meta_total_coletas, (dados_completos->>'metaTotalColetas')::int),
    nivel_confianca_percentual = coalesce(nivel_confianca_percentual, (dados_completos->>'nivelConfiancaPercentual')::numeric),
    margem_erro_percentual = coalesce(margem_erro_percentual, (dados_completos->>'margemErroPercentual')::numeric),
    populacao_universo = coalesce(populacao_universo, (dados_completos->>'populacaoUniverso')::int),
    meta_sexo_masculino = coalesce(meta_sexo_masculino, (dados_completos->>'metaSexoMasculino')::int),
    meta_sexo_feminino = coalesce(meta_sexo_feminino, (dados_completos->>'metaSexoFeminino')::int),
    meta_sexo_outro = coalesce(meta_sexo_outro, (dados_completos->>'metaSexoOutro')::int),
    dias_previstos_campo = coalesce(dias_previstos_campo, (dados_completos->>'diasPrevistosCampo')::int),
    media_coletas_dia_pesquisador = coalesce(media_coletas_dia_pesquisador, (dados_completos->>'mediaColetasDiaPesquisador')::int),
    reserva_tecnica_percentual = coalesce(reserva_tecnica_percentual, (dados_completos->>'reservaTecnicaPercentual')::numeric),
    habilitar_gravacao_audio = coalesce(habilitar_gravacao_audio, (dados_completos->>'habilitarGravacaoAudio')::boolean),
    gravar_audio_a_partir_pergunta_id = coalesce(gravar_audio_a_partir_pergunta_id, dados_completos->>'gravarAudioAPartirPerguntaId'),
    tempo_limite_gravacao_minutos = coalesce(tempo_limite_gravacao_minutos, (dados_completos->>'tempoLimiteGravacaoMinutos')::int)
  where dados_completos is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 6. Atualiza criar_pesquisa / atualizar_pesquisa para também gravar as novas colunas
-- -------------------------------------------------------------------------------------
create or replace function public.criar_pesquisa(p_survey jsonb)
returns public.pesquisas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.pesquisas;
begin
  insert into public.pesquisas (
    id, codigo, nome, descricao, status, habilitar_coleta_web, tipo_coleta_web,
    colaborador_web_id, perguntas, regras, metas, metas_globais, pesquisadores_ids,
    ciclo_atual, versao, criada_em, atualizada_em, em_andamento, server_version, dados_completos,
    data_inicio, data_fim, meta_total_coletas, nivel_confianca_percentual, margem_erro_percentual,
    populacao_universo, meta_sexo_masculino, meta_sexo_feminino, meta_sexo_outro,
    dias_previstos_campo, media_coletas_dia_pesquisador, reserva_tecnica_percentual,
    habilitar_gravacao_audio, gravar_audio_a_partir_pergunta_id, tempo_limite_gravacao_minutos
  ) values (
    coalesce(p_survey->>'id', 'pesq_' || extract(epoch from now())::bigint),
    p_survey->>'codigo',
    p_survey->>'nome',
    coalesce(p_survey->>'descricao', ''),
    coalesce(p_survey->>'status', 'ativa'),
    coalesce((p_survey->>'habilitarColetaWeb')::boolean, false),
    coalesce(p_survey->>'tipoColetaWeb', 'interno'),
    p_survey->>'colaboradorWebId',
    coalesce(p_survey->'perguntas', '[]'::jsonb),
    coalesce(p_survey->'regras', '[]'::jsonb),
    coalesce(p_survey->'metas', '[]'::jsonb),
    coalesce(p_survey->'metasGlobais', '[]'::jsonb),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_survey->'pesquisadoresIds', '[]'::jsonb)) x), '{}'),
    coalesce((p_survey->>'cicloAtual')::int, 1),
    1,
    now(),
    now(),
    coalesce(p_survey->>'status', 'ativa') = 'ativa',
    1,
    p_survey,
    nullif(p_survey->>'dataInicio', '')::date,
    nullif(p_survey->>'dataFim', '')::date,
    (p_survey->>'metaTotalColetas')::int,
    coalesce((p_survey->>'nivelConfiancaPercentual')::numeric, 95),
    coalesce((p_survey->>'margemErroPercentual')::numeric, 3.5),
    (p_survey->>'populacaoUniverso')::int,
    (p_survey->>'metaSexoMasculino')::int,
    (p_survey->>'metaSexoFeminino')::int,
    (p_survey->>'metaSexoOutro')::int,
    coalesce((p_survey->>'diasPrevistosCampo')::int, 3),
    coalesce((p_survey->>'mediaColetasDiaPesquisador')::int, 15),
    coalesce((p_survey->>'reservaTecnicaPercentual')::numeric, 15),
    coalesce((p_survey->>'habilitarGravacaoAudio')::boolean, true),
    p_survey->>'gravarAudioAPartirPerguntaId',
    coalesce((p_survey->>'tempoLimiteGravacaoMinutos')::int, 2)
  )
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.atualizar_pesquisa(p_id text, p_survey jsonb)
returns public.pesquisas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.pesquisas;
begin
  update public.pesquisas set
    codigo = coalesce(p_survey->>'codigo', codigo),
    nome = coalesce(p_survey->>'nome', nome),
    descricao = coalesce(p_survey->>'descricao', descricao),
    status = coalesce(p_survey->>'status', status),
    habilitar_coleta_web = coalesce((p_survey->>'habilitarColetaWeb')::boolean, habilitar_coleta_web),
    tipo_coleta_web = coalesce(p_survey->>'tipoColetaWeb', tipo_coleta_web),
    colaborador_web_id = coalesce(p_survey->>'colaboradorWebId', colaborador_web_id),
    perguntas = coalesce(p_survey->'perguntas', perguntas),
    regras = coalesce(p_survey->'regras', regras),
    metas = coalesce(p_survey->'metas', metas),
    metas_globais = coalesce(p_survey->'metasGlobais', metas_globais),
    pesquisadores_ids = coalesce((select array_agg(x) from jsonb_array_elements_text(p_survey->'pesquisadoresIds') x), pesquisadores_ids),
    ciclo_atual = coalesce((p_survey->>'cicloAtual')::int, ciclo_atual),
    versao = versao + 1,
    server_version = server_version + 1,
    atualizada_em = now(),
    dados_completos = coalesce(p_survey, dados_completos),
    data_inicio = coalesce(nullif(p_survey->>'dataInicio', '')::date, data_inicio),
    data_fim = coalesce(nullif(p_survey->>'dataFim', '')::date, data_fim),
    meta_total_coletas = coalesce((p_survey->>'metaTotalColetas')::int, meta_total_coletas),
    nivel_confianca_percentual = coalesce((p_survey->>'nivelConfiancaPercentual')::numeric, nivel_confianca_percentual),
    margem_erro_percentual = coalesce((p_survey->>'margemErroPercentual')::numeric, margem_erro_percentual),
    populacao_universo = coalesce((p_survey->>'populacaoUniverso')::int, populacao_universo),
    meta_sexo_masculino = coalesce((p_survey->>'metaSexoMasculino')::int, meta_sexo_masculino),
    meta_sexo_feminino = coalesce((p_survey->>'metaSexoFeminino')::int, meta_sexo_feminino),
    meta_sexo_outro = coalesce((p_survey->>'metaSexoOutro')::int, meta_sexo_outro),
    dias_previstos_campo = coalesce((p_survey->>'diasPrevistosCampo')::int, dias_previstos_campo),
    media_coletas_dia_pesquisador = coalesce((p_survey->>'mediaColetasDiaPesquisador')::int, media_coletas_dia_pesquisador),
    reserva_tecnica_percentual = coalesce((p_survey->>'reservaTecnicaPercentual')::numeric, reserva_tecnica_percentual),
    habilitar_gravacao_audio = coalesce((p_survey->>'habilitarGravacaoAudio')::boolean, habilitar_gravacao_audio),
    gravar_audio_a_partir_pergunta_id = coalesce(p_survey->>'gravarAudioAPartirPerguntaId', gravar_audio_a_partir_pergunta_id),
    tempo_limite_gravacao_minutos = coalesce((p_survey->>'tempoLimiteGravacaoMinutos')::int, tempo_limite_gravacao_minutos)
  where id = p_id
  returning * into v_row;
  return v_row;
end;
$$;

-- =====================================================================================
-- FIM DA MIGRATION 0002
-- =====================================================================================


-- #######################################################################################
-- ##  PARTE 3 DE 3 - SEED: dados iniciais de demonstracao
-- #######################################################################################

-- =====================================================================================
-- DataQuest — Seed inicial (v2 — inclui senhas reais por colaborador e plano amostral)
-- =====================================================================================
-- Gerado a partir dos dados reais de src/mockData.ts (perfis, colaboradores, pesquisas,
-- respostas, conexões, importações e auditoria). Idempotente via ON CONFLICT DO UPDATE/
-- NOTHING — pode ser executado múltiplas vezes com segurança no SQL Editor do Supabase.
--
-- SENHAS DEMO: cada colaborador usa EXATAMENTE a senha em texto puro definida no
-- mockData.ts do frontend (carlos.admin/admin123, mariana.coord/coord123,
-- rodrigo.pesquisador e aline.pesquisador/pesq123, fernando.analista/analista123).
-- O hash é gerado aqui com pgcrypto (bcrypt) para armazenamento seguro no banco.
-- Troque essas senhas antes de expor o sistema publicamente.
-- =====================================================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------------------------
-- 1. Perfis de acesso (AccessProfile)
-- -------------------------------------------------------------------------------------

insert into public.perfis_acesso (id, nome, descricao, permissions) values (
  '00000000-0000-4000-8000-000000000001',
  $q$Administrador Master$q$,
  $q$Acesso irrestrito a todos os módulos, configurações, exclusões e edições de respostas.$q$,
  $j${"colaboradores_alterar_senha": true, "colaboradores_desativar": true, "colaboradores_editar": true, "colaboradores_acesso": true, "colaboradores_incluir": true, "analise_acesso": true, "analise_criar_alterar_excluir_resposta": true, "importacao_importar_planilha": true, "importacao_excluir": true, "importacao_acesso": true, "meta_criar_alterar_excluir": true, "meta_acesso": true, "pesquisa_visualizar_excluidas": true, "pesquisa_acesso": true, "pesquisa_criar": true, "pesquisa_alterar": true, "pesquisa_excluir": true, "pesquisa_ouvir_audio": true, "pesquisa_visualizar_georeferenciamento": true, "pesquisa_exportar_resultados": true, "pesquisa_visualizar_inativas": true, "pesquisa_replicar": true, "pesquisa_desativar": true, "pesquisa_acessa_todas_sem_associacao": true, "pesquisa_alteracao_resposta_espontanea": true, "respostas_acesso": true, "respostas_alterar": true, "home_acesso": true, "home_visualiza_paineis_superiores": true, "home_visualiza_conexoes_recentes": true, "politicas_acesso": true}$j$::jsonb
) on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao, permissions = excluded.permissions;

insert into public.perfis_acesso (id, nome, descricao, permissions) values (
  '00000000-0000-4000-8000-000000000002',
  $q$Coordenador de Campo$q$,
  $q$Gerencia pesquisadores, pesquisas ativas e visualiza respostas e metas.$q$,
  $j${"colaboradores_alterar_senha": false, "colaboradores_desativar": false, "colaboradores_editar": true, "colaboradores_acesso": true, "colaboradores_incluir": true, "analise_acesso": true, "analise_criar_alterar_excluir_resposta": false, "importacao_importar_planilha": true, "importacao_excluir": false, "importacao_acesso": true, "meta_criar_alterar_excluir": true, "meta_acesso": true, "pesquisa_visualizar_excluidas": false, "pesquisa_acesso": true, "pesquisa_criar": true, "pesquisa_alterar": true, "pesquisa_excluir": false, "pesquisa_ouvir_audio": true, "pesquisa_visualizar_georeferenciamento": true, "pesquisa_exportar_resultados": true, "pesquisa_visualizar_inativas": true, "pesquisa_replicar": true, "pesquisa_desativar": true, "pesquisa_acessa_todas_sem_associacao": false, "pesquisa_alteracao_resposta_espontanea": false, "respostas_acesso": true, "respostas_alterar": false, "home_acesso": true, "home_visualiza_paineis_superiores": true, "home_visualiza_conexoes_recentes": true, "politicas_acesso": false}$j$::jsonb
) on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao, permissions = excluded.permissions;

insert into public.perfis_acesso (id, nome, descricao, permissions) values (
  '00000000-0000-4000-8000-000000000003',
  $q$Pesquisador de Campo$q$,
  $q$Coleta entrevistas em campo e acessa formulários vinculados.$q$,
  $j${"colaboradores_alterar_senha": false, "colaboradores_desativar": false, "colaboradores_editar": false, "colaboradores_acesso": false, "colaboradores_incluir": false, "analise_acesso": false, "analise_criar_alterar_excluir_resposta": false, "importacao_importar_planilha": false, "importacao_excluir": false, "importacao_acesso": false, "meta_criar_alterar_excluir": false, "meta_acesso": true, "pesquisa_visualizar_excluidas": false, "pesquisa_acesso": true, "pesquisa_criar": false, "pesquisa_alterar": false, "pesquisa_excluir": false, "pesquisa_ouvir_audio": false, "pesquisa_visualizar_georeferenciamento": false, "pesquisa_exportar_resultados": false, "pesquisa_visualizar_inativas": false, "pesquisa_replicar": false, "pesquisa_desativar": false, "pesquisa_acessa_todas_sem_associacao": false, "pesquisa_alteracao_resposta_espontanea": false, "respostas_acesso": false, "respostas_alterar": false, "home_acesso": true, "home_visualiza_paineis_superiores": false, "home_visualiza_conexoes_recentes": false, "politicas_acesso": false}$j$::jsonb
) on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao, permissions = excluded.permissions;

insert into public.perfis_acesso (id, nome, descricao, permissions) values (
  '00000000-0000-4000-8000-000000000004',
  $q$Analista Estatístico$q$,
  $q$Acesso a análises, gráficos, dashboards e exportação em CSV/PDF.$q$,
  $j${"colaboradores_alterar_senha": false, "colaboradores_desativar": false, "colaboradores_editar": false, "colaboradores_acesso": false, "colaboradores_incluir": false, "analise_acesso": true, "analise_criar_alterar_excluir_resposta": false, "importacao_importar_planilha": true, "importacao_excluir": false, "importacao_acesso": true, "meta_criar_alterar_excluir": false, "meta_acesso": true, "pesquisa_visualizar_excluidas": false, "pesquisa_acesso": true, "pesquisa_criar": false, "pesquisa_alterar": false, "pesquisa_excluir": false, "pesquisa_ouvir_audio": true, "pesquisa_visualizar_georeferenciamento": true, "pesquisa_exportar_resultados": true, "pesquisa_visualizar_inativas": true, "pesquisa_replicar": false, "pesquisa_desativar": false, "pesquisa_acessa_todas_sem_associacao": true, "pesquisa_alteracao_resposta_espontanea": false, "respostas_acesso": true, "respostas_alterar": false, "home_acesso": true, "home_visualiza_paineis_superiores": true, "home_visualiza_conexoes_recentes": true, "politicas_acesso": false}$j$::jsonb
) on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao, permissions = excluded.permissions;

-- -------------------------------------------------------------------------------------
-- 2. Colaboradores (Collaborator) — cada um com a senha demo real do mockData.ts,
--    hasheada com bcrypt (pgcrypto) para armazenamento seguro.
-- -------------------------------------------------------------------------------------

insert into public.colaboradores (
  id, cpf, nome, rg, data_nascimento, sexo, login, senha, perfil_acesso_id,
  email, celular, nome_contato_celular, telefone_fixo, nome_contato_fixo,
  ativo, pesquisas_vinculadas_ids, criado_em
) values (
  $q$colab_1$q$,
  $q$123.456.789-00$q$,
  $q$Carlos Eduardo Silveira$q$,
  $q$14.285.910-X$q$,
  $q$1985-04-12$q$::date,
  $q$M$q$,
  $q$carlos.admin$q$,
  crypt($q$admin123$q$, gen_salt('bf')),
  '00000000-0000-4000-8000-000000000001',
  $q$carlos.silveira@dataquest.gov.br$q$,
  $q$(11) 98765-4321$q$,
  $q$Esposa Mariana$q$,
  $q$(11) 3214-5500$q$,
  $q$Escritório Central$q$,
  true,
  '{"pesq_literarraial_2025","pesq_saude_2025"}',
  $q$2025-01-10T10:00:00Z$q$
) on conflict (id) do update set
  cpf = excluded.cpf, nome = excluded.nome, login = excluded.login,
  perfil_acesso_id = excluded.perfil_acesso_id, email = excluded.email,
  ativo = excluded.ativo, pesquisas_vinculadas_ids = excluded.pesquisas_vinculadas_ids;

insert into public.colaboradores (
  id, cpf, nome, rg, data_nascimento, sexo, login, senha, perfil_acesso_id,
  email, celular, nome_contato_celular, telefone_fixo, nome_contato_fixo,
  ativo, pesquisas_vinculadas_ids, criado_em
) values (
  $q$colab_2$q$,
  $q$234.567.890-11$q$,
  $q$Mariana Vasconcelos$q$,
  $q$22.333.444-5$q$,
  $q$1990-08-23$q$::date,
  $q$F$q$,
  $q$mariana.coord$q$,
  crypt($q$coord123$q$, gen_salt('bf')),
  '00000000-0000-4000-8000-000000000002',
  $q$mariana.vasconcelos@dataquest.gov.br$q$,
  $q$(11) 97654-3210$q$,
  $q$Mãe Helena$q$,
  $q$(11) 3214-5502$q$,
  $q$Recepção$q$,
  true,
  '{"pesq_literarraial_2025"}',
  $q$2025-02-01T14:30:00Z$q$
) on conflict (id) do update set
  cpf = excluded.cpf, nome = excluded.nome, login = excluded.login,
  perfil_acesso_id = excluded.perfil_acesso_id, email = excluded.email,
  ativo = excluded.ativo, pesquisas_vinculadas_ids = excluded.pesquisas_vinculadas_ids;

insert into public.colaboradores (
  id, cpf, nome, rg, data_nascimento, sexo, login, senha, perfil_acesso_id,
  email, celular, nome_contato_celular, telefone_fixo, nome_contato_fixo,
  ativo, pesquisas_vinculadas_ids, criado_em
) values (
  $q$colab_3$q$,
  $q$345.678.901-22$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$33.444.555-6$q$,
  $q$1995-11-05$q$::date,
  $q$M$q$,
  $q$rodrigo.pesquisador$q$,
  crypt($q$pesq123$q$, gen_salt('bf')),
  '00000000-0000-4000-8000-000000000003',
  $q$rodrigo.fontes@dataquest.gov.br$q$,
  $q$(11) 96543-2109$q$,
  $q$Irmão Lucas$q$,
  $q$(11) 3214-5508$q$,
  $q$Base Operacional$q$,
  true,
  '{"pesq_literarraial_2025","pesq_saude_2025"}',
  $q$2025-02-15T09:00:00Z$q$
) on conflict (id) do update set
  cpf = excluded.cpf, nome = excluded.nome, login = excluded.login,
  perfil_acesso_id = excluded.perfil_acesso_id, email = excluded.email,
  ativo = excluded.ativo, pesquisas_vinculadas_ids = excluded.pesquisas_vinculadas_ids;

insert into public.colaboradores (
  id, cpf, nome, rg, data_nascimento, sexo, login, senha, perfil_acesso_id,
  email, celular, nome_contato_celular, telefone_fixo, nome_contato_fixo,
  ativo, pesquisas_vinculadas_ids, criado_em
) values (
  $q$colab_4$q$,
  $q$456.789.012-33$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$44.555.666-7$q$,
  $q$1998-03-17$q$::date,
  $q$F$q$,
  $q$aline.pesquisador$q$,
  crypt($q$pesq123$q$, gen_salt('bf')),
  '00000000-0000-4000-8000-000000000003',
  $q$aline.barbosa@dataquest.gov.br$q$,
  $q$(11) 95432-1098$q$,
  $q$Pai Roberto$q$,
  $q$$q$,
  $q$$q$,
  true,
  '{"pesq_literarraial_2025"}',
  $q$2025-03-01T11:20:00Z$q$
) on conflict (id) do update set
  cpf = excluded.cpf, nome = excluded.nome, login = excluded.login,
  perfil_acesso_id = excluded.perfil_acesso_id, email = excluded.email,
  ativo = excluded.ativo, pesquisas_vinculadas_ids = excluded.pesquisas_vinculadas_ids;

insert into public.colaboradores (
  id, cpf, nome, rg, data_nascimento, sexo, login, senha, perfil_acesso_id,
  email, celular, nome_contato_celular, telefone_fixo, nome_contato_fixo,
  ativo, pesquisas_vinculadas_ids, criado_em
) values (
  $q$colab_5$q$,
  $q$567.890.123-44$q$,
  $q$Fernando Guimarães$q$,
  $q$55.666.777-8$q$,
  $q$1992-07-30$q$::date,
  $q$M$q$,
  $q$fernando.analista$q$,
  crypt($q$analista123$q$, gen_salt('bf')),
  '00000000-0000-4000-8000-000000000004',
  $q$fernando.guimaraes@dataquest.gov.br$q$,
  $q$(11) 94321-0987$q$,
  $q$Esposa Juliana$q$,
  $q$(11) 3214-5510$q$,
  $q$Depto Estatística$q$,
  true,
  '{"pesq_literarraial_2025","pesq_saude_2025"}',
  $q$2025-03-10T16:45:00Z$q$
) on conflict (id) do update set
  cpf = excluded.cpf, nome = excluded.nome, login = excluded.login,
  perfil_acesso_id = excluded.perfil_acesso_id, email = excluded.email,
  ativo = excluded.ativo, pesquisas_vinculadas_ids = excluded.pesquisas_vinculadas_ids;

-- -------------------------------------------------------------------------------------
-- 3. Pesquisas (Survey) — inclui as colunas normalizadas de plano amostral, cotas por
--    sexo, datas de campo e configuração de gravação de áudio (migration 0002).
-- -------------------------------------------------------------------------------------

insert into public.pesquisas (
  id, codigo, nome, descricao, status, habilitar_coleta_web, tipo_coleta_web,
  colaborador_web_id, perguntas, regras, metas, metas_globais, pesquisadores_ids,
  ciclo_atual, versao, criada_em, atualizada_em, em_andamento, server_version, dados_completos,
  data_inicio, data_fim, meta_total_coletas, nivel_confianca_percentual, margem_erro_percentual,
  populacao_universo, meta_sexo_masculino, meta_sexo_feminino, meta_sexo_outro,
  dias_previstos_campo, media_coletas_dia_pesquisador, reserva_tecnica_percentual,
  habilitar_gravacao_audio, gravar_audio_a_partir_pergunta_id, tempo_limite_gravacao_minutos
) values (
  $q$pesq_literarraial_2025$q$,
  $q$LIT-2025-01$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$Dados sobre a percepção da Feira Literária.$q$,
  $q$ativa$q$,
  true,
  $q$publico$q$,
  $q$colab_2$q$,
  $j$[{"id": "q1", "codigo": "P01", "enunciado": "Você reside no município onde a feira literária está sendo realizada?", "tipo": "sim_nao", "obrigatoria": true, "ordem": 1, "opcoes": [{"id": "opt_sim", "label": "Sim, sou morador", "value": "Sim"}, {"id": "opt_nao", "label": "Não, sou visitante/turista", "value": "Não"}]}, {"id": "q2", "codigo": "P02", "enunciado": "Qual a sua faixa etária?", "tipo": "multipla_escolha", "obrigatoria": true, "ordem": 2, "opcoes": [{"id": "opt_1825", "label": "18 a 25 anos", "value": "18 a 25 anos"}, {"id": "opt_2640", "label": "26 a 40 anos", "value": "26 a 40 anos"}, {"id": "opt_4160", "label": "41 a 60 anos", "value": "41 a 60 anos"}, {"id": "opt_60mais", "label": "Acima de 60 anos", "value": "Acima de 60 anos"}]}, {"id": "q3", "codigo": "P03", "enunciado": "Como você avalia a infraestrutura e acessibilidade do evento?", "tipo": "escala_numerica", "obrigatoria": true, "ordem": 3, "escalaMin": 1, "escalaMax": 5, "escalaMinLabel": "Muito Insatisfeito", "escalaMaxLabel": "Muito Satisfeito"}, {"id": "q4", "codigo": "P04", "enunciado": "Você realizou compras de livros ou artesanato no local?", "tipo": "multipla_escolha", "obrigatoria": true, "ordem": 4, "opcoes": [{"id": "opt_compras_sim", "label": "Sim, comprei livros", "value": "Sim"}, {"id": "opt_compras_nao", "label": "Não comprei nada", "value": "Não"}, {"id": "opt_compras_ambos", "label": "Comprei livros e outros itens", "value": "Sim, livros e outros"}]}, {"id": "q5", "codigo": "P05", "enunciado": "Qual o principal motivo para não ter realizado compras de livros?", "tipo": "multipla_escolha", "obrigatoria": false, "ordem": 5, "opcoes": [{"id": "opt_motivo_preco", "label": "Preços elevados", "value": "Preços elevados"}, {"id": "opt_motivo_titulos", "label": "Não encontrei títulos de interesse", "value": "Falta de títulos"}, {"id": "opt_motivo_visitante", "label": "Apenas passeando no evento", "value": "Apenas passeando"}]}, {"id": "q6", "codigo": "P06", "enunciado": "Em uma escala de 0 a 10, qual a probabilidade de você indicar a feira a amigos e familiares? (NPS)", "tipo": "nps", "obrigatoria": true, "ordem": 6, "escalaMin": 0, "escalaMax": 10, "escalaMinLabel": "Não indicaria", "escalaMaxLabel": "Com certeza indicaria"}, {"id": "q7", "codigo": "P07", "enunciado": "Deixe sua crítica, sugestão ou elogio para as próximas edições:", "tipo": "texto_aberto", "obrigatoria": false, "ordem": 7}]$j$::jsonb,
  $j$[{"id": "regra_1", "perguntaOrigemId": "q4", "condicao": "igual", "valorComparacao": "Não", "acao": "saltar_para", "perguntaDestinoId": "q5", "descricao": "Se não comprou nada, exibe o motivo da não compra (Q05)"}, {"id": "regra_2", "perguntaOrigemId": "q4", "condicao": "diferente", "valorComparacao": "Não", "acao": "esconder_pergunta", "perguntaDestinoId": "q5", "descricao": "Se comprou livros, esconde o motivo de não compra e pula para NPS (Q06)"}]$j$::jsonb,
  $j$[{"id": "meta_1", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q1", "condicao": "igual", "resposta": "Sim", "quantidadeAlvo": 300, "quantidadeAtingida": 245, "ciclo": "Ciclo 1 - 2025"}, {"id": "meta_2", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q1", "condicao": "igual", "resposta": "Não", "quantidadeAlvo": 150, "quantidadeAtingida": 132, "ciclo": "Ciclo 1 - 2025"}, {"id": "meta_3", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q2", "condicao": "igual", "resposta": "18 a 25 anos", "quantidadeAlvo": 120, "quantidadeAtingida": 114, "ciclo": "Ciclo 1 - 2025"}, {"id": "meta_4", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q4", "condicao": "contem", "resposta": "Sim", "quantidadeAlvo": 200, "quantidadeAtingida": 189, "ciclo": "Ciclo 1 - 2025"}]$j$::jsonb,
  $j$[{"id": "mg_001", "pesquisaId": "pesq_literarraial_2025", "titulo": "Jovens 18 a 25 anos - Praça da Matriz", "descricao": "Amostragem de jovens no perímetro cultural e estandes de livros.", "criterios": {"faixaEtaria": "18 a 25 anos", "sexo": "Todos", "bairro": "Praça da Matriz"}, "metaGlobalAlvo": 60, "metaGlobalAtingida": 48, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-12T10:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 30, "cotaAtingida": 24, "dataAtribuicao": "2025-05-12T10:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 30, "cotaAtingida": 24, "dataAtribuicao": "2025-05-12T10:30:00Z"}]}, {"id": "mg_002", "pesquisaId": "pesq_literarraial_2025", "titulo": "Público Feminino - Amostragem Central", "descricao": "Garantia de paridade amostral de mulheres com foco no Bairro Centro.", "criterios": {"faixaEtaria": "Todas", "sexo": "Feminino", "bairro": "Centro"}, "metaGlobalAlvo": 80, "metaGlobalAtingida": 62, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-14T11:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 28, "dataAtribuicao": "2025-05-14T11:15:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 34, "dataAtribuicao": "2025-05-14T11:15:00Z"}]}, {"id": "mg_003", "pesquisaId": "pesq_literarraial_2025", "titulo": "Adultos 41 a 60 anos - Centro & Matriz", "descricao": "Amostragem de chefes de família e consumidores de literatura.", "criterios": {"faixaEtaria": "41 a 60 anos", "sexo": "Todos", "bairro": "Centro"}, "metaGlobalAlvo": 50, "metaGlobalAtingida": 50, "status": "concluida", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-15T09:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 25, "cotaAtingida": 25, "dataAtribuicao": "2025-05-15T09:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 25, "cotaAtingida": 25, "dataAtribuicao": "2025-05-15T09:30:00Z"}]}, {"id": "mg_004", "pesquisaId": "pesq_literarraial_2025", "titulo": "Terceira Idade (Acima de 60 anos) - Zona Norte", "descricao": "Avaliação de acessibilidade e mobilidade para idosos.", "criterios": {"faixaEtaria": "Acima de 60 anos", "sexo": "Todos", "bairro": "Zona Norte"}, "metaGlobalAlvo": 40, "metaGlobalAtingida": 18, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-18T14:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 20, "cotaAtingida": 9, "dataAtribuicao": "2025-05-18T14:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 20, "cotaAtingida": 9, "dataAtribuicao": "2025-05-18T14:30:00Z"}]}]$j$::jsonb,
  '{"colab_1","colab_2","colab_3","colab_4"}',
  1,
  1,
  $q$2025-05-10T08:00:00Z$q$,
  $q$2025-06-01T17:30:00Z$q$,
  true,
  1,
  $j${"id": "pesq_literarraial_2025", "codigo": "LIT-2025-01", "nome": "LiterArraial 2025 - Prefeitura", "descricao": "Dados sobre a percepção da Feira Literária.", "status": "ativa", "habilitarColetaWeb": true, "tipoColetaWeb": "publico", "colaboradorWebId": "colab_2", "pesquisadoresIds": ["colab_1", "colab_2", "colab_3", "colab_4"], "cicloAtual": 1, "versao": 1, "criadaEm": "2025-05-10T08:00:00Z", "atualizadaEm": "2025-06-01T17:30:00Z", "perguntas": [{"id": "q1", "codigo": "P01", "enunciado": "Você reside no município onde a feira literária está sendo realizada?", "tipo": "sim_nao", "obrigatoria": true, "ordem": 1, "opcoes": [{"id": "opt_sim", "label": "Sim, sou morador", "value": "Sim"}, {"id": "opt_nao", "label": "Não, sou visitante/turista", "value": "Não"}]}, {"id": "q2", "codigo": "P02", "enunciado": "Qual a sua faixa etária?", "tipo": "multipla_escolha", "obrigatoria": true, "ordem": 2, "opcoes": [{"id": "opt_1825", "label": "18 a 25 anos", "value": "18 a 25 anos"}, {"id": "opt_2640", "label": "26 a 40 anos", "value": "26 a 40 anos"}, {"id": "opt_4160", "label": "41 a 60 anos", "value": "41 a 60 anos"}, {"id": "opt_60mais", "label": "Acima de 60 anos", "value": "Acima de 60 anos"}]}, {"id": "q3", "codigo": "P03", "enunciado": "Como você avalia a infraestrutura e acessibilidade do evento?", "tipo": "escala_numerica", "obrigatoria": true, "ordem": 3, "escalaMin": 1, "escalaMax": 5, "escalaMinLabel": "Muito Insatisfeito", "escalaMaxLabel": "Muito Satisfeito"}, {"id": "q4", "codigo": "P04", "enunciado": "Você realizou compras de livros ou artesanato no local?", "tipo": "multipla_escolha", "obrigatoria": true, "ordem": 4, "opcoes": [{"id": "opt_compras_sim", "label": "Sim, comprei livros", "value": "Sim"}, {"id": "opt_compras_nao", "label": "Não comprei nada", "value": "Não"}, {"id": "opt_compras_ambos", "label": "Comprei livros e outros itens", "value": "Sim, livros e outros"}]}, {"id": "q5", "codigo": "P05", "enunciado": "Qual o principal motivo para não ter realizado compras de livros?", "tipo": "multipla_escolha", "obrigatoria": false, "ordem": 5, "opcoes": [{"id": "opt_motivo_preco", "label": "Preços elevados", "value": "Preços elevados"}, {"id": "opt_motivo_titulos", "label": "Não encontrei títulos de interesse", "value": "Falta de títulos"}, {"id": "opt_motivo_visitante", "label": "Apenas passeando no evento", "value": "Apenas passeando"}]}, {"id": "q6", "codigo": "P06", "enunciado": "Em uma escala de 0 a 10, qual a probabilidade de você indicar a feira a amigos e familiares? (NPS)", "tipo": "nps", "obrigatoria": true, "ordem": 6, "escalaMin": 0, "escalaMax": 10, "escalaMinLabel": "Não indicaria", "escalaMaxLabel": "Com certeza indicaria"}, {"id": "q7", "codigo": "P07", "enunciado": "Deixe sua crítica, sugestão ou elogio para as próximas edições:", "tipo": "texto_aberto", "obrigatoria": false, "ordem": 7}], "regras": [{"id": "regra_1", "perguntaOrigemId": "q4", "condicao": "igual", "valorComparacao": "Não", "acao": "saltar_para", "perguntaDestinoId": "q5", "descricao": "Se não comprou nada, exibe o motivo da não compra (Q05)"}, {"id": "regra_2", "perguntaOrigemId": "q4", "condicao": "diferente", "valorComparacao": "Não", "acao": "esconder_pergunta", "perguntaDestinoId": "q5", "descricao": "Se comprou livros, esconde o motivo de não compra e pula para NPS (Q06)"}], "metas": [{"id": "meta_1", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q1", "condicao": "igual", "resposta": "Sim", "quantidadeAlvo": 300, "quantidadeAtingida": 245, "ciclo": "Ciclo 1 - 2025"}, {"id": "meta_2", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q1", "condicao": "igual", "resposta": "Não", "quantidadeAlvo": 150, "quantidadeAtingida": 132, "ciclo": "Ciclo 1 - 2025"}, {"id": "meta_3", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q2", "condicao": "igual", "resposta": "18 a 25 anos", "quantidadeAlvo": 120, "quantidadeAtingida": 114, "ciclo": "Ciclo 1 - 2025"}, {"id": "meta_4", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q4", "condicao": "contem", "resposta": "Sim", "quantidadeAlvo": 200, "quantidadeAtingida": 189, "ciclo": "Ciclo 1 - 2025"}], "metasGlobais": [{"id": "mg_001", "pesquisaId": "pesq_literarraial_2025", "titulo": "Jovens 18 a 25 anos - Praça da Matriz", "descricao": "Amostragem de jovens no perímetro cultural e estandes de livros.", "criterios": {"faixaEtaria": "18 a 25 anos", "sexo": "Todos", "bairro": "Praça da Matriz"}, "metaGlobalAlvo": 60, "metaGlobalAtingida": 48, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-12T10:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 30, "cotaAtingida": 24, "dataAtribuicao": "2025-05-12T10:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 30, "cotaAtingida": 24, "dataAtribuicao": "2025-05-12T10:30:00Z"}]}, {"id": "mg_002", "pesquisaId": "pesq_literarraial_2025", "titulo": "Público Feminino - Amostragem Central", "descricao": "Garantia de paridade amostral de mulheres com foco no Bairro Centro.", "criterios": {"faixaEtaria": "Todas", "sexo": "Feminino", "bairro": "Centro"}, "metaGlobalAlvo": 80, "metaGlobalAtingida": 62, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-14T11:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 28, "dataAtribuicao": "2025-05-14T11:15:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 34, "dataAtribuicao": "2025-05-14T11:15:00Z"}]}, {"id": "mg_003", "pesquisaId": "pesq_literarraial_2025", "titulo": "Adultos 41 a 60 anos - Centro & Matriz", "descricao": "Amostragem de chefes de família e consumidores de literatura.", "criterios": {"faixaEtaria": "41 a 60 anos", "sexo": "Todos", "bairro": "Centro"}, "metaGlobalAlvo": 50, "metaGlobalAtingida": 50, "status": "concluida", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-15T09:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 25, "cotaAtingida": 25, "dataAtribuicao": "2025-05-15T09:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 25, "cotaAtingida": 25, "dataAtribuicao": "2025-05-15T09:30:00Z"}]}, {"id": "mg_004", "pesquisaId": "pesq_literarraial_2025", "titulo": "Terceira Idade (Acima de 60 anos) - Zona Norte", "descricao": "Avaliação de acessibilidade e mobilidade para idosos.", "criterios": {"faixaEtaria": "Acima de 60 anos", "sexo": "Todos", "bairro": "Zona Norte"}, "metaGlobalAlvo": 40, "metaGlobalAtingida": 18, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-18T14:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 20, "cotaAtingida": 9, "dataAtribuicao": "2025-05-18T14:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 20, "cotaAtingida": 9, "dataAtribuicao": "2025-05-18T14:30:00Z"}]}]}$j$::jsonb,
  NULL,
  NULL,
  NULL,
  95,
  3.5,
  NULL,
  NULL,
  NULL,
  NULL,
  3,
  15,
  15,
  true,
  NULL,
  2
) on conflict (id) do update set
  codigo = excluded.codigo, nome = excluded.nome, descricao = excluded.descricao,
  status = excluded.status, perguntas = excluded.perguntas, regras = excluded.regras,
  metas = excluded.metas, metas_globais = excluded.metas_globais,
  pesquisadores_ids = excluded.pesquisadores_ids, dados_completos = excluded.dados_completos;

insert into public.metas (id, pesquisa_id, pergunta_id, condicao, resposta, quantidade_alvo, quantidade_atingida, ciclo) values (
  $q$meta_1$q$, $q$pesq_literarraial_2025$q$, $q$q1$q$, $q$igual$q$,
  $q$Sim$q$, 300, 245, $q$Ciclo 1 - 2025$q$
) on conflict (id) do update set quantidade_alvo = excluded.quantidade_alvo, quantidade_atingida = excluded.quantidade_atingida;

insert into public.metas (id, pesquisa_id, pergunta_id, condicao, resposta, quantidade_alvo, quantidade_atingida, ciclo) values (
  $q$meta_2$q$, $q$pesq_literarraial_2025$q$, $q$q1$q$, $q$igual$q$,
  $q$Não$q$, 150, 132, $q$Ciclo 1 - 2025$q$
) on conflict (id) do update set quantidade_alvo = excluded.quantidade_alvo, quantidade_atingida = excluded.quantidade_atingida;

insert into public.metas (id, pesquisa_id, pergunta_id, condicao, resposta, quantidade_alvo, quantidade_atingida, ciclo) values (
  $q$meta_3$q$, $q$pesq_literarraial_2025$q$, $q$q2$q$, $q$igual$q$,
  $q$18 a 25 anos$q$, 120, 114, $q$Ciclo 1 - 2025$q$
) on conflict (id) do update set quantidade_alvo = excluded.quantidade_alvo, quantidade_atingida = excluded.quantidade_atingida;

insert into public.metas (id, pesquisa_id, pergunta_id, condicao, resposta, quantidade_alvo, quantidade_atingida, ciclo) values (
  $q$meta_4$q$, $q$pesq_literarraial_2025$q$, $q$q4$q$, $q$contem$q$,
  $q$Sim$q$, 200, 189, $q$Ciclo 1 - 2025$q$
) on conflict (id) do update set quantidade_alvo = excluded.quantidade_alvo, quantidade_atingida = excluded.quantidade_atingida;

insert into public.metas_globais (id, pesquisa_id, titulo, descricao, criterios, meta_global_alvo, meta_global_atingida, atribuicoes, status, ciclo, criado_em, atualizado_em) values (
  $q$mg_001$q$, $q$pesq_literarraial_2025$q$, $q$Jovens 18 a 25 anos - Praça da Matriz$q$, $q$Amostragem de jovens no perímetro cultural e estandes de livros.$q$,
  $j${"faixaEtaria": "18 a 25 anos", "sexo": "Todos", "bairro": "Praça da Matriz"}$j$::jsonb, 60, 48,
  $j$[{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 30, "cotaAtingida": 24, "dataAtribuicao": "2025-05-12T10:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 30, "cotaAtingida": 24, "dataAtribuicao": "2025-05-12T10:30:00Z"}]$j$::jsonb, $q$ativa$q$, $q$Ciclo 1 - 2025$q$,
  $q$2025-05-12T10:00:00Z$q$, $q$2025-06-02T16:00:00Z$q$
) on conflict (id) do update set meta_global_alvo = excluded.meta_global_alvo, meta_global_atingida = excluded.meta_global_atingida, atribuicoes = excluded.atribuicoes, status = excluded.status;

insert into public.metas_globais (id, pesquisa_id, titulo, descricao, criterios, meta_global_alvo, meta_global_atingida, atribuicoes, status, ciclo, criado_em, atualizado_em) values (
  $q$mg_002$q$, $q$pesq_literarraial_2025$q$, $q$Público Feminino - Amostragem Central$q$, $q$Garantia de paridade amostral de mulheres com foco no Bairro Centro.$q$,
  $j${"faixaEtaria": "Todas", "sexo": "Feminino", "bairro": "Centro"}$j$::jsonb, 80, 62,
  $j$[{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 28, "dataAtribuicao": "2025-05-14T11:15:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 34, "dataAtribuicao": "2025-05-14T11:15:00Z"}]$j$::jsonb, $q$ativa$q$, $q$Ciclo 1 - 2025$q$,
  $q$2025-05-14T11:00:00Z$q$, $q$2025-06-02T16:00:00Z$q$
) on conflict (id) do update set meta_global_alvo = excluded.meta_global_alvo, meta_global_atingida = excluded.meta_global_atingida, atribuicoes = excluded.atribuicoes, status = excluded.status;

insert into public.metas_globais (id, pesquisa_id, titulo, descricao, criterios, meta_global_alvo, meta_global_atingida, atribuicoes, status, ciclo, criado_em, atualizado_em) values (
  $q$mg_003$q$, $q$pesq_literarraial_2025$q$, $q$Adultos 41 a 60 anos - Centro & Matriz$q$, $q$Amostragem de chefes de família e consumidores de literatura.$q$,
  $j${"faixaEtaria": "41 a 60 anos", "sexo": "Todos", "bairro": "Centro"}$j$::jsonb, 50, 50,
  $j$[{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 25, "cotaAtingida": 25, "dataAtribuicao": "2025-05-15T09:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 25, "cotaAtingida": 25, "dataAtribuicao": "2025-05-15T09:30:00Z"}]$j$::jsonb, $q$concluida$q$, $q$Ciclo 1 - 2025$q$,
  $q$2025-05-15T09:00:00Z$q$, $q$2025-06-02T16:00:00Z$q$
) on conflict (id) do update set meta_global_alvo = excluded.meta_global_alvo, meta_global_atingida = excluded.meta_global_atingida, atribuicoes = excluded.atribuicoes, status = excluded.status;

insert into public.metas_globais (id, pesquisa_id, titulo, descricao, criterios, meta_global_alvo, meta_global_atingida, atribuicoes, status, ciclo, criado_em, atualizado_em) values (
  $q$mg_004$q$, $q$pesq_literarraial_2025$q$, $q$Terceira Idade (Acima de 60 anos) - Zona Norte$q$, $q$Avaliação de acessibilidade e mobilidade para idosos.$q$,
  $j${"faixaEtaria": "Acima de 60 anos", "sexo": "Todos", "bairro": "Zona Norte"}$j$::jsonb, 40, 18,
  $j$[{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 20, "cotaAtingida": 9, "dataAtribuicao": "2025-05-18T14:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 20, "cotaAtingida": 9, "dataAtribuicao": "2025-05-18T14:30:00Z"}]$j$::jsonb, $q$ativa$q$, $q$Ciclo 1 - 2025$q$,
  $q$2025-05-18T14:00:00Z$q$, $q$2025-06-02T16:00:00Z$q$
) on conflict (id) do update set meta_global_alvo = excluded.meta_global_alvo, meta_global_atingida = excluded.meta_global_atingida, atribuicoes = excluded.atribuicoes, status = excluded.status;

insert into public.pesquisas (
  id, codigo, nome, descricao, status, habilitar_coleta_web, tipo_coleta_web,
  colaborador_web_id, perguntas, regras, metas, metas_globais, pesquisadores_ids,
  ciclo_atual, versao, criada_em, atualizada_em, em_andamento, server_version, dados_completos,
  data_inicio, data_fim, meta_total_coletas, nivel_confianca_percentual, margem_erro_percentual,
  populacao_universo, meta_sexo_masculino, meta_sexo_feminino, meta_sexo_outro,
  dias_previstos_campo, media_coletas_dia_pesquisador, reserva_tecnica_percentual,
  habilitar_gravacao_audio, gravar_audio_a_partir_pergunta_id, tempo_limite_gravacao_minutos
) values (
  $q$pesq_saude_2025$q$,
  $q$SAU-2025-02$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$Mapeamento de satisfação e tempo de espera nas UBS.$q$,
  $q$ativa$q$,
  false,
  $q$interno$q$,
  $q$colab_1$q$,
  $j$[{"id": "qs1", "codigo": "P01", "enunciado": "Qual a sua unidade básica de saúde de referência?", "tipo": "multipla_escolha", "obrigatoria": true, "ordem": 1, "opcoes": [{"id": "ubs_central", "label": "UBS Central Dr. Paulo", "value": "UBS Central"}, {"id": "ubs_norte", "label": "UBS Zona Norte", "value": "UBS Zona Norte"}, {"id": "ubs_sul", "label": "UBS Jardim das Flores", "value": "UBS Sul"}]}, {"id": "qs2", "codigo": "P02", "enunciado": "Você conseguiu agendar sua consulta no mesmo mês?", "tipo": "sim_nao", "obrigatoria": true, "ordem": 2, "opcoes": [{"id": "opt_sim_s", "label": "Sim", "value": "Sim"}, {"id": "opt_nao_s", "label": "Não", "value": "Não"}]}, {"id": "qs3", "codigo": "P03", "enunciado": "Qual o grau de satisfação com o atendimento médico?", "tipo": "escala_numerica", "obrigatoria": true, "ordem": 3, "escalaMin": 1, "escalaMax": 5, "escalaMinLabel": "Péssimo", "escalaMaxLabel": "Excelente"}]$j$::jsonb,
  $j$[]$j$::jsonb,
  $j$[{"id": "meta_s1", "pesquisaId": "pesq_saude_2025", "perguntaId": "qs2", "condicao": "igual", "resposta": "Sim", "quantidadeAlvo": 500, "quantidadeAtingida": 412, "ciclo": "Ciclo 1 - 2025"}]$j$::jsonb,
  $j$[{"id": "mgs_001", "pesquisaId": "pesq_saude_2025", "titulo": "Idosos (Acima de 60 anos) - UBS Central", "descricao": "Meta prioritária de acolhimento e tempo de espera para pacientes geriátricos.", "criterios": {"faixaEtaria": "Acima de 60 anos", "sexo": "Todos", "bairro": "UBS Central"}, "metaGlobalAlvo": 100, "metaGlobalAtingida": 75, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-04-20T10:00:00Z", "atualizadoEm": "2025-05-20T14:10:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 50, "cotaAtingida": 42, "dataAtribuicao": "2025-04-20T10:30:00Z"}, {"pesquisadorId": "colab_1", "pesquisadorNome": "Carlos Eduardo Silveira", "perfilAcessoNome": "Administrador Master", "cotaAlvo": 50, "cotaAtingida": 33, "dataAtribuicao": "2025-04-20T10:30:00Z"}]}, {"id": "mgs_002", "pesquisaId": "pesq_saude_2025", "titulo": "Mulheres 26 a 40 anos - UBS Jardim das Flores", "descricao": "Saúde da mulher, pré-natal e consultas preventivas.", "criterios": {"faixaEtaria": "26 a 40 anos", "sexo": "Feminino", "bairro": "UBS Sul"}, "metaGlobalAlvo": 80, "metaGlobalAtingida": 45, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-04-22T08:00:00Z", "atualizadoEm": "2025-05-20T14:10:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 25, "dataAtribuicao": "2025-04-22T08:30:00Z"}, {"pesquisadorId": "colab_5", "pesquisadorNome": "Fernando Guimarães", "perfilAcessoNome": "Analista Estatístico", "cotaAlvo": 40, "cotaAtingida": 20, "dataAtribuicao": "2025-04-22T08:30:00Z"}]}]$j$::jsonb,
  '{"colab_1","colab_3","colab_5"}',
  1,
  1,
  $q$2025-04-15T09:00:00Z$q$,
  $q$2025-05-20T14:10:00Z$q$,
  true,
  1,
  $j${"id": "pesq_saude_2025", "codigo": "SAU-2025-02", "nome": "Censo Municipal de Atenção Básica de Saúde", "descricao": "Mapeamento de satisfação e tempo de espera nas UBS.", "status": "ativa", "habilitarColetaWeb": false, "tipoColetaWeb": "interno", "colaboradorWebId": "colab_1", "pesquisadoresIds": ["colab_1", "colab_3", "colab_5"], "cicloAtual": 1, "versao": 1, "criadaEm": "2025-04-15T09:00:00Z", "atualizadaEm": "2025-05-20T14:10:00Z", "perguntas": [{"id": "qs1", "codigo": "P01", "enunciado": "Qual a sua unidade básica de saúde de referência?", "tipo": "multipla_escolha", "obrigatoria": true, "ordem": 1, "opcoes": [{"id": "ubs_central", "label": "UBS Central Dr. Paulo", "value": "UBS Central"}, {"id": "ubs_norte", "label": "UBS Zona Norte", "value": "UBS Zona Norte"}, {"id": "ubs_sul", "label": "UBS Jardim das Flores", "value": "UBS Sul"}]}, {"id": "qs2", "codigo": "P02", "enunciado": "Você conseguiu agendar sua consulta no mesmo mês?", "tipo": "sim_nao", "obrigatoria": true, "ordem": 2, "opcoes": [{"id": "opt_sim_s", "label": "Sim", "value": "Sim"}, {"id": "opt_nao_s", "label": "Não", "value": "Não"}]}, {"id": "qs3", "codigo": "P03", "enunciado": "Qual o grau de satisfação com o atendimento médico?", "tipo": "escala_numerica", "obrigatoria": true, "ordem": 3, "escalaMin": 1, "escalaMax": 5, "escalaMinLabel": "Péssimo", "escalaMaxLabel": "Excelente"}], "regras": [], "metas": [{"id": "meta_s1", "pesquisaId": "pesq_saude_2025", "perguntaId": "qs2", "condicao": "igual", "resposta": "Sim", "quantidadeAlvo": 500, "quantidadeAtingida": 412, "ciclo": "Ciclo 1 - 2025"}], "metasGlobais": [{"id": "mgs_001", "pesquisaId": "pesq_saude_2025", "titulo": "Idosos (Acima de 60 anos) - UBS Central", "descricao": "Meta prioritária de acolhimento e tempo de espera para pacientes geriátricos.", "criterios": {"faixaEtaria": "Acima de 60 anos", "sexo": "Todos", "bairro": "UBS Central"}, "metaGlobalAlvo": 100, "metaGlobalAtingida": 75, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-04-20T10:00:00Z", "atualizadoEm": "2025-05-20T14:10:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 50, "cotaAtingida": 42, "dataAtribuicao": "2025-04-20T10:30:00Z"}, {"pesquisadorId": "colab_1", "pesquisadorNome": "Carlos Eduardo Silveira", "perfilAcessoNome": "Administrador Master", "cotaAlvo": 50, "cotaAtingida": 33, "dataAtribuicao": "2025-04-20T10:30:00Z"}]}, {"id": "mgs_002", "pesquisaId": "pesq_saude_2025", "titulo": "Mulheres 26 a 40 anos - UBS Jardim das Flores", "descricao": "Saúde da mulher, pré-natal e consultas preventivas.", "criterios": {"faixaEtaria": "26 a 40 anos", "sexo": "Feminino", "bairro": "UBS Sul"}, "metaGlobalAlvo": 80, "metaGlobalAtingida": 45, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-04-22T08:00:00Z", "atualizadoEm": "2025-05-20T14:10:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 25, "dataAtribuicao": "2025-04-22T08:30:00Z"}, {"pesquisadorId": "colab_5", "pesquisadorNome": "Fernando Guimarães", "perfilAcessoNome": "Analista Estatístico", "cotaAlvo": 40, "cotaAtingida": 20, "dataAtribuicao": "2025-04-22T08:30:00Z"}]}]}$j$::jsonb,
  NULL,
  NULL,
  NULL,
  95,
  3.5,
  NULL,
  NULL,
  NULL,
  NULL,
  3,
  15,
  15,
  true,
  NULL,
  2
) on conflict (id) do update set
  codigo = excluded.codigo, nome = excluded.nome, descricao = excluded.descricao,
  status = excluded.status, perguntas = excluded.perguntas, regras = excluded.regras,
  metas = excluded.metas, metas_globais = excluded.metas_globais,
  pesquisadores_ids = excluded.pesquisadores_ids, dados_completos = excluded.dados_completos;

insert into public.metas (id, pesquisa_id, pergunta_id, condicao, resposta, quantidade_alvo, quantidade_atingida, ciclo) values (
  $q$meta_s1$q$, $q$pesq_saude_2025$q$, $q$qs2$q$, $q$igual$q$,
  $q$Sim$q$, 500, 412, $q$Ciclo 1 - 2025$q$
) on conflict (id) do update set quantidade_alvo = excluded.quantidade_alvo, quantidade_atingida = excluded.quantidade_atingida;

insert into public.metas_globais (id, pesquisa_id, titulo, descricao, criterios, meta_global_alvo, meta_global_atingida, atribuicoes, status, ciclo, criado_em, atualizado_em) values (
  $q$mgs_001$q$, $q$pesq_saude_2025$q$, $q$Idosos (Acima de 60 anos) - UBS Central$q$, $q$Meta prioritária de acolhimento e tempo de espera para pacientes geriátricos.$q$,
  $j${"faixaEtaria": "Acima de 60 anos", "sexo": "Todos", "bairro": "UBS Central"}$j$::jsonb, 100, 75,
  $j$[{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 50, "cotaAtingida": 42, "dataAtribuicao": "2025-04-20T10:30:00Z"}, {"pesquisadorId": "colab_1", "pesquisadorNome": "Carlos Eduardo Silveira", "perfilAcessoNome": "Administrador Master", "cotaAlvo": 50, "cotaAtingida": 33, "dataAtribuicao": "2025-04-20T10:30:00Z"}]$j$::jsonb, $q$ativa$q$, $q$Ciclo 1 - 2025$q$,
  $q$2025-04-20T10:00:00Z$q$, $q$2025-05-20T14:10:00Z$q$
) on conflict (id) do update set meta_global_alvo = excluded.meta_global_alvo, meta_global_atingida = excluded.meta_global_atingida, atribuicoes = excluded.atribuicoes, status = excluded.status;

insert into public.metas_globais (id, pesquisa_id, titulo, descricao, criterios, meta_global_alvo, meta_global_atingida, atribuicoes, status, ciclo, criado_em, atualizado_em) values (
  $q$mgs_002$q$, $q$pesq_saude_2025$q$, $q$Mulheres 26 a 40 anos - UBS Jardim das Flores$q$, $q$Saúde da mulher, pré-natal e consultas preventivas.$q$,
  $j${"faixaEtaria": "26 a 40 anos", "sexo": "Feminino", "bairro": "UBS Sul"}$j$::jsonb, 80, 45,
  $j$[{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 25, "dataAtribuicao": "2025-04-22T08:30:00Z"}, {"pesquisadorId": "colab_5", "pesquisadorNome": "Fernando Guimarães", "perfilAcessoNome": "Analista Estatístico", "cotaAlvo": 40, "cotaAtingida": 20, "dataAtribuicao": "2025-04-22T08:30:00Z"}]$j$::jsonb, $q$ativa$q$, $q$Ciclo 1 - 2025$q$,
  $q$2025-04-22T08:00:00Z$q$, $q$2025-05-20T14:10:00Z$q$
) on conflict (id) do update set meta_global_alvo = excluded.meta_global_alvo, meta_global_atingida = excluded.meta_global_atingida, atribuicoes = excluded.atribuicoes, status = excluded.status;

insert into public.pesquisas (
  id, codigo, nome, descricao, status, habilitar_coleta_web, tipo_coleta_web,
  colaborador_web_id, perguntas, regras, metas, metas_globais, pesquisadores_ids,
  ciclo_atual, versao, criada_em, atualizada_em, em_andamento, server_version, dados_completos,
  data_inicio, data_fim, meta_total_coletas, nivel_confianca_percentual, margem_erro_percentual,
  populacao_universo, meta_sexo_masculino, meta_sexo_feminino, meta_sexo_outro,
  dias_previstos_campo, media_coletas_dia_pesquisador, reserva_tecnica_percentual,
  habilitar_gravacao_audio, gravar_audio_a_partir_pergunta_id, tempo_limite_gravacao_minutos
) values (
  $q$pesq_inativa_demo$q$,
  $q$HAB-2024-04$q$,
  $q$Diagnóstico Habitacional 2024 (Ciclo Anterior)$q$,
  $q$Levantamento concluído do programa de habitação popular.$q$,
  $q$inativa$q$,
  true,
  $q$publico$q$,
  NULL,
  $j$[]$j$::jsonb,
  $j$[]$j$::jsonb,
  $j$[]$j$::jsonb,
  $j$[]$j$::jsonb,
  '{"colab_1","colab_2"}',
  2,
  2,
  $q$2024-06-01T10:00:00Z$q$,
  $q$2024-12-15T18:00:00Z$q$,
  false,
  2,
  $j${"id": "pesq_inativa_demo", "codigo": "HAB-2024-04", "nome": "Diagnóstico Habitacional 2024 (Ciclo Anterior)", "descricao": "Levantamento concluído do programa de habitação popular.", "status": "inativa", "habilitarColetaWeb": true, "tipoColetaWeb": "publico", "pesquisadoresIds": ["colab_1", "colab_2"], "cicloAtual": 2, "versao": 2, "criadaEm": "2024-06-01T10:00:00Z", "atualizadaEm": "2024-12-15T18:00:00Z", "perguntas": [], "regras": [], "metas": []}$j$::jsonb,
  NULL,
  NULL,
  NULL,
  95,
  3.5,
  NULL,
  NULL,
  NULL,
  NULL,
  3,
  15,
  15,
  true,
  NULL,
  2
) on conflict (id) do update set
  codigo = excluded.codigo, nome = excluded.nome, descricao = excluded.descricao,
  status = excluded.status, perguntas = excluded.perguntas, regras = excluded.regras,
  metas = excluded.metas, metas_globais = excluded.metas_globais,
  pesquisadores_ids = excluded.pesquisadores_ids, dados_completos = excluded.dados_completos;

-- -------------------------------------------------------------------------------------
-- 4. Respostas (InterviewSubmission) — coletas de campo demo
-- -------------------------------------------------------------------------------------

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_001$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-06-02T14:32:15$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município onde a feira literária está sendo realizada?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Qual a sua faixa etária?", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Como você avalia a infraestrutura e acessibilidade do evento?", "resposta": "5"}, {"perguntaId": "q4", "perguntaCodigo": "P04", "perguntaEnunciado": "Você realizou compras de livros ou artesanato no local?", "resposta": "Sim"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "Em uma escala de 0 a 10, qual a probabilidade de você indicar a feira a amigos e familiares? (NPS)", "resposta": "10"}, {"perguntaId": "q7", "perguntaCodigo": "P07", "perguntaEnunciado": "Deixe sua crítica, sugestão ou elogio para as próximas edições:", "resposta": "Organização impecável, excelente curadoria de autores nacionais!"}]$j$::jsonb,
  $j${"latitude": -23.55052, "longitude": -46.633308, "bairro": "Centro Histórico", "cidade": "São Paulo - SP"}$j$::jsonb,
  $j${"duracaoSegundos": 142, "tamanhoKb": 890, "nomeArquivo": "gravacao_entrevista_001_audio.wav", "transcricaoTrecho": "Entrevistado confirma moradia no centro e elogia a acessibilidade e estandes."}$j$::jsonb,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_002$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-06-02T15:10:44$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município onde a feira literária está sendo realizada?", "resposta": "Não"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Qual a sua faixa etária?", "resposta": "18 a 25 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Como você avalia a infraestrutura e acessibilidade do evento?", "resposta": "4"}, {"perguntaId": "q4", "perguntaCodigo": "P04", "perguntaEnunciado": "Você realizou compras de livros ou artesanato no local?", "resposta": "Não"}, {"perguntaId": "q5", "perguntaCodigo": "P05", "perguntaEnunciado": "Qual o principal motivo para não ter realizado compras de livros?", "resposta": "Preços elevados"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "Em uma escala de 0 a 10, qual a probabilidade de você indicar a feira a amigos e familiares? (NPS)", "resposta": "8"}, {"perguntaId": "q7", "perguntaCodigo": "P07", "perguntaEnunciado": "Deixe sua crítica, sugestão ou elogio para as próximas edições:", "resposta": "Gostei muito das oficinas, mas os livros poderiam ter mais descontos de feira."}]$j$::jsonb,
  $j${"latitude": -23.5518, "longitude": -46.6345, "bairro": "Praça da Matriz", "cidade": "São Paulo - SP"}$j$::jsonb,
  $j${"duracaoSegundos": 95, "tamanhoKb": 610, "nomeArquivo": "gravacao_entrevista_002_audio.wav", "transcricaoTrecho": "Jovem visitante universitária comenta sobre preços e interesse em palestras."}$j$::jsonb,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_003$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-06-02T16:05:20$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município onde a feira literária está sendo realizada?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Qual a sua faixa etária?", "resposta": "41 a 60 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Como você avalia a infraestrutura e acessibilidade do evento?", "resposta": "5"}, {"perguntaId": "q4", "perguntaCodigo": "P04", "perguntaEnunciado": "Você realizou compras de livros ou artesanato no local?", "resposta": "Sim, livros e outros"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "Em uma escala de 0 a 10, qual a probabilidade de você indicar a feira a amigos e familiares? (NPS)", "resposta": "9"}, {"perguntaId": "q7", "perguntaCodigo": "P07", "perguntaEnunciado": "Deixe sua crítica, sugestão ou elogio para as próximas edições:", "resposta": "Excelente praça de alimentação e banheiros bem cuidados."}]$j$::jsonb,
  $j${"latitude": -23.5492, "longitude": -46.6321, "bairro": "Pavilhão das Letras", "cidade": "São Paulo - SP"}$j$::jsonb,
  $j${"duracaoSegundos": 165, "tamanhoKb": 980, "nomeArquivo": "gravacao_entrevista_003_audio.wav", "transcricaoTrecho": "Entrevistado acompanhado da família comprou 3 títulos infantis e 1 romance."}$j$::jsonb,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_004$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_1$q$,
  $q$Carlos Eduardo Silveira$q$,
  $q$2025-06-02T16:40:11$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Qual a sua unidade básica de saúde de referência?", "resposta": "UBS Central"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Você conseguiu agendar sua consulta no mesmo mês?", "resposta": "Sim"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Qual o grau de satisfação com o atendimento médico?", "resposta": "4"}]$j$::jsonb,
  $j${"latitude": -23.553, "longitude": -46.637, "bairro": "Bela Vista", "cidade": "São Paulo - SP"}$j$::jsonb,
  $j${"duracaoSegundos": 80, "tamanhoKb": 450, "nomeArquivo": "gravacao_entrevista_sau_001.wav", "transcricaoTrecho": "Paciente relata bom atendimento na triagem de enfermagem."}$j$::jsonb,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_005$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-26T10:15:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "18 a 25 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "10"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_006$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-05-26T14:40:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "4"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "9"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_007$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-27T09:20:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Não"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "41 a 60 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "4"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "8"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_008$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-05-27T11:50:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "Mais de 60 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "10"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_009$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-27T16:10:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "9"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_010$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-05-28T10:00:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "18 a 25 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "4"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "8"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_011$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-28T14:30:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "10"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_012$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-05-29T11:15:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Não"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "41 a 60 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "4"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "9"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_013$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-29T15:45:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "18 a 25 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "10"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_014$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-05-30T10:40:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "9"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_015$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-30T16:20:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "41 a 60 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "4"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "8"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_016$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-05-31T09:30:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "18 a 25 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "10"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_017$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-31T14:10:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "4"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "9"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_018$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-06-01T10:00:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "Mais de 60 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "10"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_019$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-06-01T15:30:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "9"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_sau_002$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_1$q$,
  $q$Carlos Eduardo Silveira$q$,
  $q$2025-05-27T08:30:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Unidade de referência", "resposta": "UBS Jardim das Flores"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Agendamento no mesmo mês", "resposta": "Sim"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Satisfação atendimento", "resposta": "5"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_sau_003$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_2$q$,
  $q$Mariana Vasconcelos$q$,
  $q$2025-05-28T09:15:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Unidade de referência", "resposta": "UBS Central"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Agendamento no mesmo mês", "resposta": "Não"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Satisfação atendimento", "resposta": "3"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_sau_004$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_1$q$,
  $q$Carlos Eduardo Silveira$q$,
  $q$2025-05-29T11:00:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Unidade de referência", "resposta": "UBS Vila Esperança"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Agendamento no mesmo mês", "resposta": "Sim"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Satisfação atendimento", "resposta": "5"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_sau_005$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_2$q$,
  $q$Mariana Vasconcelos$q$,
  $q$2025-05-30T14:20:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Unidade de referência", "resposta": "UBS Central"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Agendamento no mesmo mês", "resposta": "Sim"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Satisfação atendimento", "resposta": "4"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_sau_006$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_1$q$,
  $q$Carlos Eduardo Silveira$q$,
  $q$2025-05-31T10:45:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Unidade de referência", "resposta": "UBS Central"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Agendamento no mesmo mês", "resposta": "Sim"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Satisfação atendimento", "resposta": "5"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_sau_007$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_2$q$,
  $q$Mariana Vasconcelos$q$,
  $q$2025-06-01T11:30:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Unidade de referência", "resposta": "UBS Bela Vista"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Agendamento no mesmo mês", "resposta": "Sim"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Satisfação atendimento", "resposta": "4"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

-- -------------------------------------------------------------------------------------
-- 5. Conexões recentes (RecentConnection)
-- -------------------------------------------------------------------------------------

insert into public.conexoes_recentes (id, usuario, perfil, ip, data_hora, navegador, status) values (
  $q$conn_1$q$, $q$carlos.admin (Carlos Eduardo)$q$, $q$Administrador Master$q$, $q$189.40.112.54$q$,
  $q$02/06/2025 17:15:32$q$, $q$Chrome 125 / Linux x86_64$q$, $q$sucesso$q$
) on conflict (id) do nothing;

insert into public.conexoes_recentes (id, usuario, perfil, ip, data_hora, navegador, status) values (
  $q$conn_2$q$, $q$mariana.coord (Mariana V.)$q$, $q$Coordenador de Campo$q$, $q$177.102.88.19$q$,
  $q$02/06/2025 16:50:12$q$, $q$Edge 124 / Windows 11$q$, $q$sucesso$q$
) on conflict (id) do nothing;

insert into public.conexoes_recentes (id, usuario, perfil, ip, data_hora, navegador, status) values (
  $q$conn_3$q$, $q$rodrigo.pesquisador (Rodrigo F.)$q$, $q$Pesquisador de Campo$q$, $q$191.22.45.101$q$,
  $q$02/06/2025 16:04:02$q$, $q$Mobile Safari / iOS 17.5$q$, $q$sucesso$q$
) on conflict (id) do nothing;

insert into public.conexoes_recentes (id, usuario, perfil, ip, data_hora, navegador, status) values (
  $q$conn_4$q$, $q$aline.pesquisador (Aline B.)$q$, $q$Pesquisador de Campo$q$, $q$179.184.21.7$q$,
  $q$02/06/2025 15:09:18$q$, $q$Chrome Mobile / Android 14$q$, $q$sucesso$q$
) on conflict (id) do nothing;

insert into public.conexoes_recentes (id, usuario, perfil, ip, data_hora, navegador, status) values (
  $q$conn_5$q$, $q$usuario.desconhecido$q$, $q$Não autenticado$q$, $q$45.12.98.11$q$,
  $q$02/06/2025 12:45:00$q$, $q$Firefox 126 / macOS$q$, $q$bloqueado$q$
) on conflict (id) do nothing;

-- -------------------------------------------------------------------------------------
-- 6. Importações externas (ExternalImport)
-- -------------------------------------------------------------------------------------

insert into public.importacoes_externas (id, nome_arquivo, pesquisa_id, data_importacao, total_registros, colunas, status) values (
  $q$imp_01$q$, $q$Censo_Literario_Dados_Preliminares_2025.csv$q$, $q$pesq_literarraial_2025$q$, $q$2025-05-28 14:22:10$q$,
  140, '{"cpf_anonimizado","residente_municipio","faixa_etaria","nota_infra","comprou_livro","nps"}', $q$concluido$q$
) on conflict (id) do nothing;

insert into public.importacoes_externas (id, nome_arquivo, pesquisa_id, data_importacao, total_registros, colunas, status) values (
  $q$imp_02$q$, $q$UBS_Amostragem_Piloto_Maio.xlsx$q$, $q$pesq_saude_2025$q$, $q$2025-05-15 09:10:44$q$,
  85, '{"unidade_ubs","agendamento_mesmo_mes","grau_satisfacao"}', $q$concluido$q$
) on conflict (id) do nothing;

-- -------------------------------------------------------------------------------------
-- 7. Histórico de ações / auditoria (ActionAuditLog)
-- -------------------------------------------------------------------------------------

insert into public.historico_acoes (id, categoria, tipo_acao, titulo_acao, descricao_detalhada, autor, alvo, alteracoes, motivo_conformidade, "timestamp", hash_integridade, status_conformidade) values (
  $q$log_001$q$, $q$RESPOSTA$q$, $q$EDICAO_RESPOSTA$q$, $q$Edição de Resposta em Coleta$q$, $q$Retificação administrativa de resposta no formulário de entrevista #INT-8831 (LiterArraial 2025).$q$,
  $j${"id": "colab_01", "nome": "Carlos Eduardo Silva", "login": "admin", "perfil": "Administrador Master", "ip": "189.40.72.19"}$j$::jsonb, $j${"tipo": "resposta", "id": "sub_001", "identificador": "Coleta #INT-8831", "nome": "LiterArraial 2025 - Prefeitura"}$j$::jsonb, $j$[{"campo": "P03 - Você adquiriu algum livro durante o evento?", "rotulo": "Questão P03", "valorAnterior": "Não", "valorNovo": "Sim (1 a 2 livros)"}]$j$::jsonb, $q$Correção de erro de digitação do pesquisador em campo após conferência do áudio da gravação e validação com o supervisor.$q$,
  $q$2026-09-02T16:42:15.000Z$q$, $q$e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855$q$, $q$conforme$q$
) on conflict (id) do nothing;

insert into public.historico_acoes (id, categoria, tipo_acao, titulo_acao, descricao_detalhada, autor, alvo, alteracoes, motivo_conformidade, "timestamp", hash_integridade, status_conformidade) values (
  $q$log_002$q$, $q$PESQUISA$q$, $q$EDICAO_PESQUISA$q$, $q$Alteração de Configuração de Pesquisa$q$, $q$Habilitação da Coleta Web Pública e inclusão da regra condicional de salto para questão P05.$q$,
  $j${"id": "colab_01", "nome": "Carlos Eduardo Silva", "login": "admin", "perfil": "Administrador Master", "ip": "189.40.72.19"}$j$::jsonb, $j${"tipo": "pesquisa", "id": "pesq_literarraial_2025", "identificador": "PESQ-2025-01", "nome": "LiterArraial 2025 - Prefeitura"}$j$::jsonb, $j$[{"campo": "habilitarColetaWeb", "rotulo": "Coleta Web", "valorAnterior": "Inativo (false)", "valorNovo": "Ativo (true - Público)"}, {"campo": "regras", "rotulo": "Regras Condicionais", "valorAnterior": "0 regras", "valorNovo": "1 regra (P01 = Não -> Saltar para P05)"}]$j$::jsonb, $q$Abertura do canal de coleta web para munícipes e otimização do roteiro de perguntas conforme protocolo da Secretaria de Cultura.$q$,
  $q$2026-09-01T14:15:30.000Z$q$, $q$7d793037a0760186574b0282f2f435e7b1e7a6acc941e07400eeb7e12075487a$q$, $q$conforme$q$
) on conflict (id) do nothing;

insert into public.historico_acoes (id, categoria, tipo_acao, titulo_acao, descricao_detalhada, autor, alvo, alteracoes, motivo_conformidade, "timestamp", hash_integridade, status_conformidade) values (
  $q$log_003$q$, $q$PESQUISA$q$, $q$REPLICACAO_PESQUISA$q$, $q$Replicação de Pesquisa para Novo Ciclo$q$, $q$Pesquisa duplicada para o Ciclo 2 preservando estrutura de questionário e reiniciando metas de amostragem.$q$,
  $j${"id": "colab_02", "nome": "Mariana Costa Oliveira", "login": "mariana.coord", "perfil": "Coordenador de Campo", "ip": "201.86.115.44"}$j$::jsonb, $j${"tipo": "pesquisa", "id": "pesq_literarraial_2025_c2", "identificador": "PESQ-2025-01-C2", "nome": "LiterArraial 2025 - Prefeitura (Ciclo 2)"}$j$::jsonb, $j$[{"campo": "cicloAtual", "rotulo": "Ciclo", "valorAnterior": "Ciclo 1", "valorNovo": "Ciclo 2"}, {"campo": "versao", "rotulo": "Versão", "valorAnterior": "1", "valorNovo": "2"}]$j$::jsonb, $q$Abertura da segunda fase de coleta após atingimento das metas amostrais da primeira fase.$q$,
  $q$2026-08-30T11:00:22.000Z$q$, $q$f454f0a3952d7e00858e72ef78385adadcdad3f2a89327ee0cf075be8c0762cf$q$, $q$conforme$q$
) on conflict (id) do nothing;

insert into public.historico_acoes (id, categoria, tipo_acao, titulo_acao, descricao_detalhada, autor, alvo, alteracoes, motivo_conformidade, "timestamp", hash_integridade, status_conformidade) values (
  $q$log_004$q$, $q$RESPOSTA$q$, $q$EDICAO_RESPOSTA$q$, $q$Ajuste de Dado Espontâneo em Resposta$q$, $q$Adequação da transcrição da resposta aberta na coleta #INT-8833 (UBS São Francisco).$q$,
  $j${"id": "colab_01", "nome": "Carlos Eduardo Silva", "login": "admin", "perfil": "Administrador Master", "ip": "189.40.72.19"}$j$::jsonb, $j${"tipo": "resposta", "id": "sub_003", "identificador": "Coleta #INT-8833", "nome": "Avaliação dos Serviços de Saúde - UBS"}$j$::jsonb, $j$[{"campo": "P03 - Sugestões de Melhoria", "rotulo": "Resposta Espontânea", "valorAnterior": "falta remdio na farmacia", "valorNovo": "Falta de medicamentos de uso contínuo na farmácia básica"}]$j$::jsonb, $q$Padronização ortográfica para codificação temática na análise quanti-qualitativa, sem alteração de sentido semântico.$q$,
  $q$2026-08-28T09:20:00.000Z$q$, $q$9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08$q$, $q$conforme$q$
) on conflict (id) do nothing;

insert into public.historico_acoes (id, categoria, tipo_acao, titulo_acao, descricao_detalhada, autor, alvo, alteracoes, motivo_conformidade, "timestamp", hash_integridade, status_conformidade) values (
  $q$log_005$q$, $q$PESQUISA$q$, $q$STATUS_PESQUISA$q$, $q$Alteração de Status da Pesquisa$q$, $q$Pesquisa alterada de Inativa para Ativa para início das coletas dos agentes de campo.$q$,
  $j${"id": "colab_01", "nome": "Carlos Eduardo Silva", "login": "admin", "perfil": "Administrador Master", "ip": "189.40.72.19"}$j$::jsonb, $j${"tipo": "pesquisa", "id": "pesq_saude_2025", "identificador": "PESQ-2025-02", "nome": "Avaliação dos Serviços de Saúde - UBS"}$j$::jsonb, $j$[{"campo": "status", "rotulo": "Status Operacional", "valorAnterior": "inativa", "valorNovo": "ativa"}]$j$::jsonb, $q$Validação jurídica e ética do instrumento de pesquisa concluída pela Coordenadoria de Saúde.$q$,
  $q$2026-08-25T08:00:00.000Z$q$, $q$5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8$q$, $q$conforme$q$
) on conflict (id) do nothing;

insert into public.historico_acoes (id, categoria, tipo_acao, titulo_acao, descricao_detalhada, autor, alvo, alteracoes, motivo_conformidade, "timestamp", hash_integridade, status_conformidade) values (
  $q$log_006$q$, $q$PESQUISA$q$, $q$CRIACAO_PESQUISA$q$, $q$Criação de Novo Instrumento de Pesquisa$q$, $q$Cadastro inicial do questionário LiterArraial 2025 com 5 perguntas, regras e vinculação de 4 pesquisadores.$q$,
  $j${"id": "colab_01", "nome": "Carlos Eduardo Silva", "login": "admin", "perfil": "Administrador Master", "ip": "189.40.72.19"}$j$::jsonb, $j${"tipo": "pesquisa", "id": "pesq_literarraial_2025", "identificador": "PESQ-2025-01", "nome": "LiterArraial 2025 - Prefeitura"}$j$::jsonb, $j$[{"campo": "nome", "rotulo": "Nome", "valorNovo": "LiterArraial 2025 - Prefeitura"}, {"campo": "perguntas", "rotulo": "Perguntas Cadastradas", "valorNovo": "5 perguntas configuradas"}]$j$::jsonb, $q$Abertura oficial de edital de avaliação de satisfação pública do evento municipal.$q$,
  $q$2026-08-20T10:00:00.000Z$q$, $q$4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a$q$, $q$conforme$q$
) on conflict (id) do nothing;

-- =====================================================================================
-- FIM DO SEED
-- =====================================================================================

-- =====================================================================================
-- FIM DO SETUP COMPLETO
-- =====================================================================================
