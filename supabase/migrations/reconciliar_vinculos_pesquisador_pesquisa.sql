-- =============================================================================
-- Reconciliação em lote do vínculo pesquisador↔pesquisa
--
-- Corrige de uma vez, para TODOS os colaboradores, qualquer divergência entre
-- pesquisas.pesquisadores_ids (fonte de verdade) e
-- colaboradores.pesquisas_vinculadas_ids (espelho) que tenha ficado acumulada
-- de antes da migration 0006 (que passa a manter isso sincronizado
-- automaticamente dali em diante).
--
-- Faz o mesmo que supabase/diagnostico_vinculos.sql fazia manualmente, um login
-- por vez — aqui é para o cadastro inteiro, em uma única operação.
--
-- Como usar:
--   1) Rode a consulta da SEÇÃO 1 primeiro: ela só mostra o que vai mudar
--      (nenhum dado é alterado ainda). Confira se os valores em
--      "vinculadas_corrigido" fazem sentido.
--   2) Rode a SEÇÃO 2 para aplicar de fato a correção.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SEÇÃO 1 — Prévia (somente leitura, não altera nada)
-- ---------------------------------------------------------------------------
select
  c.id,
  c.nome,
  c.login,
  c.pesquisas_vinculadas_ids as vinculadas_atual,
  coalesce(
    (
      select array_agg(p.id order by p.id)
      from public.pesquisas p
      where c.id = any(p.pesquisadores_ids)
    ),
    '{}'
  ) as vinculadas_corrigido
from public.colaboradores c
where c.pesquisas_vinculadas_ids is distinct from coalesce(
  (
    select array_agg(p.id order by p.id)
    from public.pesquisas p
    where c.id = any(p.pesquisadores_ids)
  ),
  '{}'
)
order by c.nome;

-- ---------------------------------------------------------------------------
-- SEÇÃO 2 — Aplica a correção
--
-- Sobrescreve pesquisas_vinculadas_ids de todo colaborador com o que estiver
-- de fato em pesquisadores_ids das pesquisas. Qualquer vínculo "fantasma"
-- (presente só do lado do colaborador, sem correspondência do lado da
-- pesquisa) é removido.
-- ---------------------------------------------------------------------------
begin;

update public.colaboradores c
set pesquisas_vinculadas_ids = coalesce(
  (
    select array_agg(p.id order by p.id)
    from public.pesquisas p
    where c.id = any(p.pesquisadores_ids)
  ),
  '{}'
)
where c.pesquisas_vinculadas_ids is distinct from coalesce(
  (
    select array_agg(p.id order by p.id)
    from public.pesquisas p
    where c.id = any(p.pesquisadores_ids)
  ),
  '{}'
);

commit;

-- Depois de rodar a SEÇÃO 2, a SEÇÃO 1 deve retornar zero linhas.
