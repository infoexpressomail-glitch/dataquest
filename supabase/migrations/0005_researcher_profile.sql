-- =============================================================================
-- Migration 0005 — Garantir que pesquisadores cadastrados nasçam sempre com o
--              perfil correto no Supabase + robustez do vínculo.
--
-- Problema diagnosticado:
--   O formulário de Colaboradores usa os perfis do MOCK (localStorage), enviando
--   `perfilAcessoId` como 'prof_pesq' (NÃO é um uuid do banco). A função
--   `salvar_colaborador()` tenta `::uuid` (falha -> null) e depois resolve por
--   `perfilAcessoNome`. PORÉM, se o perfil "Pesquisador de Campo" NÃO existir na
--   tabela `perfis_acesso`, o perfil fica nulo -> `autenticar_campo` não detecta
--   o pesquisador -> login de campo rejeitado ("não possui o perfil...").
--
-- Correção:
--   1. Seed (idempotente) do perfil "Pesquisador de Campo" em `perfis_acesso`,
--      caso ainda não exista, com as mesmas permissões do mock (prof_pesq).
--   2. `salvar_colaborador()` reescrita para RESOLVER OU CRIAR o perfil:
--        a. por uuid (perfilAcessoId);
--        b. senão por nome (perfilAcessoNome, ilike);
--        c. senão, se o nome indicar pesquisador, cria automaticamente um perfil
--           de pesquisador com as permissões padrão (garante que o login de campo
--           reconheça o pesquisador mesmo sem o perfil pré-existente).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Seed do perfil "Pesquisador de Campo" (idempotente)
-- ---------------------------------------------------------------------------
insert into public.perfis_acesso (nome, descricao, permissions)
select
  'Pesquisador de Campo',
  'Coleta entrevistas em campo e acessa formulários vinculados.',
  jsonb_build_object(
    'colaboradores_alterar_senha', false,
    'colaboradores_desativar', false,
    'colaboradores_editar', false,
    'colaboradores_acesso', false,
    'colaboradores_incluir', false,
    'analise_acesso', false,
    'analise_criar_alterar_excluir_resposta', false,
    'importacao_importar_planilha', false,
    'importacao_excluir', false,
    'importacao_acesso', false,
    'meta_criar_alterar_excluir', false,
    'meta_acesso', true,
    'pesquisa_visualizar_excluidas', false,
    'pesquisa_acesso', true,
    'pesquisa_criar', false,
    'pesquisa_alterar', false,
    'pesquisa_excluir', false,
    'pesquisa_ouvir_audio', false,
    'pesquisa_visualizar_georeferenciamento', false,
    'pesquisa_exportar_resultados', false,
    'pesquisa_visualizar_inativas', false,
    'pesquisa_replicar', false,
    'pesquisa_desativar', false,
    'pesquisa_acessa_todas_sem_associacao', false,
    'pesquisa_alteracao_resposta_espontanea', false,
    'respostas_acesso', false,
    'respostas_alterar', false,
    'home_acesso', true,
    'home_visualiza_paineis_superiores', false,
    'home_visualiza_conexoes_recentes', false,
    'politicas_acesso', false,
    'relatorios_acesso', false,
    'relatorios_criar_alterar_excluir', false
  )::jsonb
where not exists (
  select 1 from public.perfis_acesso
  where nome ilike 'pesquisador%'
);

-- ---------------------------------------------------------------------------
-- 2. salvar_colaborador reescrita — resolve OU cria o perfil
-- ---------------------------------------------------------------------------
create or replace function public.salvar_colaborador(p_collab jsonb, p_senha text default null)
returns public.colaboradores
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id        text;
  v_row       public.colaboradores;
  v_senha     text;
  v_perf_uuid uuid;
  v_perf_nome text;
begin
  v_id := coalesce(p_collab->>'id', 'colab_' || extract(epoch from now())::bigint);

  -- 1) Tenta resolver o perfil por UUID
  begin
    v_perf_uuid := nullif(p_collab->>'perfilAcessoId', '')::uuid;
  exception when others then
    v_perf_uuid := null;
  end;

  -- 2) Se não achou por uuid, tenta por NOME (perfilAcessoNome ou nome do uuid)
  if v_perf_uuid is null then
    v_perf_nome := coalesce(p_collab->>'perfilAcessoNome', '');
    if v_perf_nome = '' and v_perf_uuid is not null then
      select nome into v_perf_nome from public.perfis_acesso where id = v_perf_uuid;
    end if;
    if v_perf_nome <> '' then
      select id into v_perf_uuid from public.perfis_acesso where nome ilike v_perf_nome limit 1;
    end if;
  end if;

  -- 3) Se o nome indica pesquisador e ainda não há perfil, cria automaticamente
  if v_perf_uuid is null and coalesce(p_collab->>'perfilAcessoNome', '') ilike '%pesquisador%' then
    insert into public.perfis_acesso (nome, descricao, permissions)
    values (p_collab->>'perfilAcessoNome', 'Perfil de pesquisador criado automaticamente.', '{}'::jsonb)
    returning id into v_perf_uuid;
  end if;

  -- Senha: hash bcrypt quando fornecida; preserva a atual caso contrário.
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
