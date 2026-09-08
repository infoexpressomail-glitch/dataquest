-- =============================================================================
-- Migration 0003 — Autenticação e acesso do APP DE CAMPO (Modo Pesquisador)
--
-- Etapa 1 (backend) do "Modo Pesquisador". Adiciona:
--   1. A coluna `pesquisas_reabilitadas_ids` em colaboradores, necessária para a
--      regra de visibilidade do pesquisador (uma pesquisa concluída pela
--      coordenação só volta a aparecer para o login que foi explicitamente
--      re-habilitado — ver src/utils/researcherUtils.ts).
--   2. A função `autenticar_campo()`, que valida login/senha contra a tabela
--      `colaboradores` comparando o hash bcrypt (pgcrypto `crypt()`), SEM
--      expor o hash — ao contrário da `autenticar_colaborador()` existente,
--      que retorna a linha completa. Retorna os campos seguros do colaborador,
--      o perfil (uuid) com permissões e a flag `pesquisador`.
-- =============================================================================

-- 1. Coluna de pesquisas re-habilitadas para um login específico
alter table public.colaboradores
  add column if not exists pesquisas_reabilitadas_ids text[] not null default '{}';

-- 2. Função de autenticação de campo (retorna JSONB seguro, nunca a senha)
create or replace function public.autenticar_campo(p_login text, p_senha text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row      public.colaboradores;
  v_perfil   public.perfis_acesso;
  v_pesq     boolean;
begin
  select * into v_row
  from public.colaboradores
  where login = p_login
    and ativo = true
    and senha = crypt(p_senha, senha);

  if v_row is null then
    return jsonb_build_object('success', false, 'error', 'Login ou senha inválidos.');
  end if;

  select * into v_perfil
  from public.perfis_acesso
  where id = v_row.perfil_acesso_id;

  v_pesq := v_perfil.nome ilike '%pesquisador%';

  return jsonb_build_object(
    'success', true,
    'colaborador', jsonb_build_object(
      'id', v_row.id,
      'cpf', v_row.cpf,
      'nome', v_row.nome,
      'login', v_row.login,
      'email', v_row.email,
      'celular', v_row.celular,
      'ativo', v_row.ativo,
      'perfilAcessoId', v_row.perfil_acesso_id,
      'pesquisasVinculadasIds', coalesce(v_row.pesquisas_vinculadas_ids, '{}'::text[]),
      'pesquisasReabilitadasIds', coalesce(v_row.pesquisas_reabilitadas_ids, '{}'::text[])
    ),
    'perfil', jsonb_build_object(
      'id', v_perfil.id,
      'name', v_perfil.nome,
      'description', v_perfil.descricao,
      'permissions', coalesce(v_perfil.permissions, '{}'::jsonb)
    ),
    'pesquisador', v_pesq
  );
end;
$$;
