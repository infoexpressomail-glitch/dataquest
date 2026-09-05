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
