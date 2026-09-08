-- =============================================================================
-- Migration 0004 — Persistência do cadastro de colaboradores/pesquisadores
--              feita a partir do SISTEMA BASE (área administrativa).
--
-- Objetivo: permitir que o administrador cadastre/edite um colaborador (com
-- perfil, pesquisa vinculada e credenciais) pela interface do sistema base e
-- que esse cadastro seja GRAVADO no Supabase com a senha em hash bcrypt, de
-- modo que o login do APP DE CAMPO (POST /api/auth -> autenticar_campo) passe
-- a funcionar de verdade contra essas credenciais.
--
-- Funções adicionadas:
--   1. public.salvar_colaborador(p_collab jsonb, p_senha text)
--        - Upsert na tabela colaboradores.
--        - Se p_senha for não vazia, grava a senha com crypt(p_senha,
--          gen_salt('bf')). Se vazia, preserva a senha atual (edição sem
--          alterar a credencial).
--   2. public.definir_senha_colaborador(p_colaborador_id text, p_senha text)
--        - Redefine a senha de um colaborador existente, com hash bcrypt.
--        - Usada pelo botão "Alterar Senha" do formulário.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Upsert de colaborador com hash de senha
-- ---------------------------------------------------------------------------
create or replace function public.salvar_colaborador(p_collab jsonb, p_senha text default null)
returns public.colaboradores
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id       text;
  v_row      public.colaboradores;
  v_senha    text;
  v_perf_uuid uuid;
begin
  v_id := coalesce(p_collab->>'id', 'colab_' || extract(epoch from now())::bigint);

  -- Perfil: aceita uuid (perfilAcessoId) ou nome (perfilAcessoNome), nesta ordem.
  v_perf_uuid := nullif(p_collab->>'perfilAcessoId', '')::uuid;
  if v_perf_uuid is null and p_collab->>'perfilAcessoNome' is not null then
    select id into v_perf_uuid
    from public.perfis_acesso
    where nome = p_collab->>'perfilAcessoNome'
    limit 1;
  end if;

  -- Senha: se fornecida, grava o hash bcrypt; senão preserva a atual (edição).
  if coalesce(p_senha, '') <> '' then
    v_senha := crypt(p_senha, gen_salt('bf'));
  else
    select senha into v_senha from public.colaboradores where id = v_id;
  end if;

  insert into public.colaboradores (
    id, cpf, nome, rg, data_nascimento, sexo, login, senha, perfil_acesso_id,
    email, celular, nome_contato_celular, telefone_fixo, nome_contato_fixo,
    ativo, pesquisas_vinculadas_ids, pesquisas_reabilitadas_ids, criado_em
  ) values (
    v_id,
    p_collab->>'cpf',
    p_collab->>'nome',
    p_collab->>'rg',
    nullif(p_collab->>'dataNascimento', '')::date,
    nullif(p_collab->>'sexo', ''),
    p_collab->>'login',
    v_senha,
    v_perf_uuid,
    p_collab->>'email',
    p_collab->>'celular',
    p_collab->>'nomeContatoCelular',
    p_collab->>'telefoneFixo',
    p_collab->>'nomeContatoFixo',
    coalesce((p_collab->>'ativo')::boolean, true),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_collab->'pesquisasVinculadasIds', '[]'::jsonb)) x), '{}'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_collab->'pesquisasReabilitadasIds', '[]'::jsonb)) x), '{}'),
    now()
  )
  on conflict (id) do update set
    cpf = excluded.cpf,
    nome = excluded.nome,
    rg = excluded.rg,
    data_nascimento = excluded.data_nascimento,
    sexo = excluded.sexo,
    login = excluded.login,
    senha = coalesce(excluded.senha, public.colaboradores.senha),
    perfil_acesso_id = coalesce(excluded.perfil_acesso_id, public.colaboradores.perfil_acesso_id),
    email = excluded.email,
    celular = excluded.celular,
    nome_contato_celular = excluded.nome_contato_celular,
    telefone_fixo = excluded.telefone_fixo,
    nome_contato_fixo = excluded.nome_contato_fixo,
    ativo = excluded.ativo,
    pesquisas_vinculadas_ids = excluded.pesquisas_vinculadas_ids,
    pesquisas_reabilitadas_ids = excluded.pesquisas_reabilitadas_ids
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Redefinição de senha (botão "Alterar Senha")
-- ---------------------------------------------------------------------------
create or replace function public.definir_senha_colaborador(p_colaborador_id text, p_senha text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update public.colaboradores
  set senha = crypt(p_senha, gen_salt('bf'))
  where id = p_colaborador_id;
$$;
