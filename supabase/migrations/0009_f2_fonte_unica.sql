-- =============================================================================
-- Migration 0009 — F2 · Fonte única de dados no Supabase
--
-- Objetivo: perfis de acesso, colaboradores e pesquisas passam a viver no banco.
-- O navegador deixa de ser a fonte de verdade (nenhuma dessas três entidades é
-- persistida em localStorage) e guarda apenas o CACHE OFFLINE DE CAMPO
-- (IndexedDB: pesquisas baixadas e fila de coletas).
--
-- O que esta migration garante no banco:
--   1. Os 4 perfis padrão existem sempre (seed idempotente por UUID canônico).
--      Permissões JÁ personalizadas pelo administrador são PRESERVADAS — o
--      seed só cria o que falta e refresca nome/descrição.
--   2. Funções para o painel gravar perfis e colaboradores de forma segura e
--      parcial (sem reenviar o objeto inteiro, sem risco de zerar colunas):
--        - public.salvar_perfil_acesso(...)         (upsert por id OU nome)
--        - public.definir_ativo_colaborador(...)    (ativar/desativar)
--        - public.definir_perfil_colaborador(...)   (troca de perfil em lote)
--        - public.definir_reabilitadas_colaborador(...) (pesquisas re-habilitadas)
--   3. View de leitura SEGURA de colaboradores (sem a coluna `senha`), usada
--      pelo endpoint GET /api/collaborators. O hash bcrypt nunca sai do banco.
--
-- Depende de: 0001 (tabelas/RLS), 0003 (autenticar_campo), 0004/0005
-- (salvar_colaborador), 0006 (vínculo pesquisador↔pesquisa).
-- Idempotente: pode ser executada mais de uma vez sem erro.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Seed idempotente dos perfis padrão (UUIDs canônicos de supabase/seed.sql)
-- ---------------------------------------------------------------------------
insert into public.perfis_acesso (id, nome, descricao, permissions) values (
  '00000000-0000-4000-8000-000000000001',
  $q$Administrador Master$q$,
  $q$Acesso irrestrito a todos os módulos, configurações, exclusões e edições de respostas.$q$,
  $j${"colaboradores_alterar_senha": true, "colaboradores_desativar": true, "colaboradores_editar": true, "colaboradores_acesso": true, "colaboradores_incluir": true, "analise_acesso": true, "analise_criar_alterar_excluir_resposta": true, "importacao_importar_planilha": true, "importacao_excluir": true, "importacao_acesso": true, "meta_criar_alterar_excluir": true, "meta_acesso": true, "pesquisa_visualizar_excluidas": true, "pesquisa_acesso": true, "pesquisa_criar": true, "pesquisa_alterar": true, "pesquisa_excluir": true, "pesquisa_ouvir_audio": true, "pesquisa_visualizar_georeferenciamento": true, "pesquisa_exportar_resultados": true, "pesquisa_visualizar_inativas": true, "pesquisa_replicar": true, "pesquisa_desativar": true, "pesquisa_acessa_todas_sem_associacao": true, "pesquisa_alteracao_resposta_espontanea": true, "respostas_acesso": true, "respostas_alterar": true, "home_acesso": true, "home_visualiza_paineis_superiores": true, "home_visualiza_conexoes_recentes": true, "politicas_acesso": true}$j$::jsonb
) on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao;

insert into public.perfis_acesso (id, nome, descricao, permissions) values (
  '00000000-0000-4000-8000-000000000002',
  $q$Coordenador de Campo$q$,
  $q$Gerencia pesquisadores, pesquisas ativas e visualiza respostas e metas.$q$,
  $j${"colaboradores_alterar_senha": false, "colaboradores_desativar": false, "colaboradores_editar": true, "colaboradores_acesso": true, "colaboradores_incluir": true, "analise_acesso": true, "analise_criar_alterar_excluir_resposta": false, "importacao_importar_planilha": true, "importacao_excluir": false, "importacao_acesso": true, "meta_criar_alterar_excluir": true, "meta_acesso": true, "pesquisa_visualizar_excluidas": false, "pesquisa_acesso": true, "pesquisa_criar": true, "pesquisa_alterar": true, "pesquisa_excluir": false, "pesquisa_ouvir_audio": true, "pesquisa_visualizar_georeferenciamento": true, "pesquisa_exportar_resultados": true, "pesquisa_visualizar_inativas": true, "pesquisa_replicar": true, "pesquisa_desativar": true, "pesquisa_acessa_todas_sem_associacao": false, "pesquisa_alteracao_resposta_espontanea": false, "respostas_acesso": true, "respostas_alterar": false, "home_acesso": true, "home_visualiza_paineis_superiores": true, "home_visualiza_conexoes_recentes": true, "politicas_acesso": false}$j$::jsonb
) on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao;

insert into public.perfis_acesso (id, nome, descricao, permissions) values (
  '00000000-0000-4000-8000-000000000003',
  $q$Pesquisador de Campo$q$,
  $q$Coleta entrevistas em campo e acessa formulários vinculados.$q$,
  $j${"colaboradores_alterar_senha": false, "colaboradores_desativar": false, "colaboradores_editar": false, "colaboradores_acesso": false, "colaboradores_incluir": false, "analise_acesso": false, "analise_criar_alterar_excluir_resposta": false, "importacao_importar_planilha": false, "importacao_excluir": false, "importacao_acesso": false, "meta_criar_alterar_excluir": false, "meta_acesso": true, "pesquisa_visualizar_excluidas": false, "pesquisa_acesso": true, "pesquisa_criar": false, "pesquisa_alterar": false, "pesquisa_excluir": false, "pesquisa_ouvir_audio": false, "pesquisa_visualizar_georeferenciamento": false, "pesquisa_exportar_resultados": false, "pesquisa_visualizar_inativas": false, "pesquisa_replicar": false, "pesquisa_desativar": false, "pesquisa_acessa_todas_sem_associacao": false, "pesquisa_alteracao_resposta_espontanea": false, "respostas_acesso": false, "respostas_alterar": false, "home_acesso": true, "home_visualiza_paineis_superiores": false, "home_visualiza_conexoes_recentes": false, "politicas_acesso": false}$j$::jsonb
) on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao;

insert into public.perfis_acesso (id, nome, descricao, permissions) values (
  '00000000-0000-4000-8000-000000000004',
  $q$Analista Estatístico$q$,
  $q$Acesso a análises, gráficos, dashboards e exportação em CSV/PDF.$q$,
  $j${"colaboradores_alterar_senha": false, "colaboradores_desativar": false, "colaboradores_editar": false, "colaboradores_acesso": false, "colaboradores_incluir": false, "analise_acesso": true, "analise_criar_alterar_excluir_resposta": false, "importacao_importar_planilha": true, "importacao_excluir": false, "importacao_acesso": true, "meta_criar_alterar_excluir": false, "meta_acesso": true, "pesquisa_visualizar_excluidas": false, "pesquisa_acesso": true, "pesquisa_criar": false, "pesquisa_alterar": false, "pesquisa_excluir": false, "pesquisa_ouvir_audio": true, "pesquisa_visualizar_georeferenciamento": true, "pesquisa_exportar_resultados": true, "pesquisa_visualizar_inativas": true, "pesquisa_replicar": false, "pesquisa_desativar": false, "pesquisa_acessa_todas_sem_associacao": true, "pesquisa_alteracao_resposta_espontanea": false, "respostas_acesso": true, "respostas_alterar": false, "home_acesso": true, "home_visualiza_paineis_superiores": true, "home_visualiza_conexoes_recentes": true, "politicas_acesso": false}$j$::jsonb
) on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao;

-- ---------------------------------------------------------------------------
-- 1.1 Status "concluida" para pesquisas
--     O painel sempre teve o status CONCLUÍDA (finalização pela coordenação),
--     mas o CHECK da 0001 só permitia ativa/inativa/excluida — a finalização
--     nunca chegava ao banco. F2 torna o banco a fonte única, então o CHECK
--     precisa aceitar o status que o produto já usa.
-- ---------------------------------------------------------------------------
alter table public.pesquisas drop constraint if exists pesquisas_status_check;
alter table public.pesquisas
  add constraint pesquisas_status_check
  check (status in ('ativa', 'inativa', 'concluida', 'excluida'));

-- ---------------------------------------------------------------------------
-- 2. Upsert de perfil de acesso pelo painel (id uuid OU nome)
--    - p_id pode vir nulo/ inválido (perfil novo criado no cliente): resolve por nome.
--    - Preserva campos não enviados (coalesce).
-- ---------------------------------------------------------------------------
create or replace function public.salvar_perfil_acesso(
  p_id uuid,
  p_nome text,
  p_descricao text,
  p_permissions jsonb
)
returns public.perfis_acesso
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.perfis_acesso;
  v_id  uuid := p_id;
begin
  -- Sem uuid válido: tenta resolver pelo nome (perfil criado localmente no cliente).
  if v_id is null and coalesce(p_nome, '') <> '' then
    select id into v_id from public.perfis_acesso where nome ilike p_nome limit 1;
  end if;

  if v_id is not null then
    update public.perfis_acesso
    set nome = coalesce(p_nome, nome),
        descricao = coalesce(p_descricao, descricao),
        permissions = coalesce(p_permissions, permissions)
    where id = v_id
    returning * into v_row;
  end if;

  if v_row is null then
    insert into public.perfis_acesso (nome, descricao, permissions)
    values (coalesce(p_nome, 'Perfil sem nome'), coalesce(p_descricao, ''), coalesce(p_permissions, '{}'::jsonb))
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

comment on function public.salvar_perfil_acesso(uuid, text, text, jsonb) is
  'F2 — upsert de perfil de acesso do painel: por id (uuid) ou por nome; preserva campos ausentes.';

-- ---------------------------------------------------------------------------
-- 3. Atualizações parciais e seguras de colaborador (nunca tocam a senha)
-- ---------------------------------------------------------------------------
create or replace function public.definir_ativo_colaborador(p_id text, p_ativo boolean)
returns public.colaboradores
language sql
security definer
set search_path = public
as $$
  update public.colaboradores set ativo = p_ativo where id = p_id returning *;
$$;

create or replace function public.definir_perfil_colaborador(p_id text, p_perfil_id uuid)
returns public.colaboradores
language sql
security definer
set search_path = public
as $$
  update public.colaboradores set perfil_acesso_id = p_perfil_id where id = p_id returning *;
$$;

create or replace function public.definir_reabilitadas_colaborador(p_id text, p_ids text[])
returns public.colaboradores
language sql
security definer
set search_path = public
as $$
  update public.colaboradores
  set pesquisas_reabilitadas_ids = coalesce(p_ids, '{}')
  where id = p_id
  returning *;
$$;

comment on function public.definir_ativo_colaborador(text, boolean) is
  'F2 — ativa/desativa colaborador sem reenviar o cadastro inteiro.';

-- ---------------------------------------------------------------------------
-- 4. Leitura segura de colaboradores (sem `senha`)
-- ---------------------------------------------------------------------------
create or replace view public.colaboradores_publicos as
select
  id, cpf, nome, rg, data_nascimento, sexo, login, perfil_acesso_id,
  email, celular, nome_contato_celular, telefone_fixo, nome_contato_fixo,
  ativo, pesquisas_vinculadas_ids, pesquisas_reabilitadas_ids, criado_em
from public.colaboradores;

comment on view public.colaboradores_publicos is
  'F2 — colaboradores sem a coluna senha. Fonte de leitura de GET /api/collaborators.';

create or replace function public.listar_colaboradores_seguro()
returns setof public.colaboradores_publicos
language sql
security definer
set search_path = public
as $$
  select * from public.colaboradores_publicos order by nome;
$$;

comment on function public.listar_colaboradores_seguro() is
  'F2 — lista colaboradores sem expor o hash de senha.';
