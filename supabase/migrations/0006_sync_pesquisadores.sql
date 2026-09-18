-- =============================================================================
-- Migration 0006 — Sincronização automática do vínculo pesquisador↔pesquisa
--
-- Problema diagnosticado (ver supabase/diagnostico_vinculos.sql):
--   O vínculo colaborador↔pesquisa é guardado duplicado em dois lugares:
--     1) pesquisas.pesquisadores_ids        (a pesquisa lista os pesquisadores)
--     2) colaboradores.pesquisas_vinculadas_ids (o colaborador lista as pesquisas)
--   Cada tela do sistema só atualizava um dos dois lados, então eles podiam
--   divergir com o tempo (ex.: uma pesquisa "desvinculada" de um lado continuar
--   aparecendo pelo outro).
--
--   A aplicação (AppContext.tsx → saveCollaborator / bulkAssignCollaboratorsToSurveys)
--   já foi corrigida para atualizar os dois lados sempre que grava pelo frontend.
--   Esta migration adiciona uma segunda camada de proteção NO BANCO: mesmo que
--   algum código futuro, script manual ou integração externa escreva direto em
--   `pesquisas.pesquisadores_ids` sem passar pelo frontend, o lado do colaborador
--   é recalculado automaticamente — a garantia deixa de depender de todo mundo
--   lembrar de atualizar os dois lados.
--
-- Fonte de verdade: pesquisas.pesquisadores_ids (é o campo que
--   GET /api/collaborators/:id/pesquisas e a policy de RLS de `pesquisas`
--   realmente usam para decidir o que o pesquisador vê/recebe). A sincronização
--   é sempre em UMA via: pesquisas -> colaboradores. Escritas diretas em
--   colaboradores.pesquisas_vinculadas_ids continuam possíveis, mas não são
--   propagadas de volta para pesquisas.pesquisadores_ids — para reconciliar
--   dados que já divergiram ANTES desta migration, use
--   supabase/reconciliar_vinculos_pesquisador_pesquisa.sql (script único, rodar
--   uma vez).
-- =============================================================================

create or replace function public.sync_pesquisas_vinculadas_ids()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_ids text[] := '{}';
  v_new_ids text[] := '{}';
  v_survey_id text;
  v_added text[];
  v_removed text[];
begin
  v_survey_id := coalesce(new.id, old.id);

  if TG_OP = 'INSERT' then
    v_new_ids := coalesce(new.pesquisadores_ids, '{}');
  elsif TG_OP = 'UPDATE' then
    v_old_ids := coalesce(old.pesquisadores_ids, '{}');
    v_new_ids := coalesce(new.pesquisadores_ids, '{}');
  elsif TG_OP = 'DELETE' then
    v_old_ids := coalesce(old.pesquisadores_ids, '{}');
  end if;

  -- Nada mudou (ex.: UPDATE em outra coluna que disparou o trigger por engano) — sai cedo.
  if v_old_ids is not distinct from v_new_ids then
    return coalesce(new, old);
  end if;

  -- ids que passaram a ter esta pesquisa vinculada
  select coalesce(array_agg(x), '{}')
    into v_added
  from unnest(v_new_ids) x
  where not (x = any(v_old_ids));

  -- ids que deixaram de ter esta pesquisa vinculada
  select coalesce(array_agg(x), '{}')
    into v_removed
  from unnest(v_old_ids) x
  where not (x = any(v_new_ids));

  if array_length(v_added, 1) > 0 then
    update public.colaboradores c
    set pesquisas_vinculadas_ids = (
      select array_agg(distinct e)
      from unnest(c.pesquisas_vinculadas_ids || array[v_survey_id]) e
    )
    where c.id = any(v_added)
      and not (v_survey_id = any(c.pesquisas_vinculadas_ids));
  end if;

  if array_length(v_removed, 1) > 0 then
    update public.colaboradores c
    set pesquisas_vinculadas_ids = array_remove(c.pesquisas_vinculadas_ids, v_survey_id)
    where c.id = any(v_removed);
  end if;

  return coalesce(new, old);
end;
$$;

comment on function public.sync_pesquisas_vinculadas_ids() is
  'Mantém colaboradores.pesquisas_vinculadas_ids espelhando pesquisas.pesquisadores_ids (fonte de verdade). Ver migration 0006.';

drop trigger if exists trg_sync_pesquisas_vinculadas_ids on public.pesquisas;
create trigger trg_sync_pesquisas_vinculadas_ids
  after insert or update of pesquisadores_ids or delete on public.pesquisas
  for each row execute function public.sync_pesquisas_vinculadas_ids();
