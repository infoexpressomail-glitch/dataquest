-- =============================================================================
-- Migration 0008 — Fecha o acesso de escrita anônimo ao bucket survey-assets
--
-- Problema: a migration 0007 criou o bucket `survey-assets` com policies de
-- INSERT/UPDATE/DELETE em storage.objects sem nenhuma condição de autenticação
-- (apenas `bucket_id = 'survey-assets'`) — ou seja, liberadas para QUALQUER
-- visitante, incluindo quem nunca fez login, usando apenas a anon key (que é
-- pública por natureza: fica embarcada em todo carregamento do app no
-- navegador). Isso permitia a qualquer pessoa na internet fazer upload de
-- arquivo arbitrário, ou apagar/sobrescrever a capa, logo ou imagens de
-- qualquer pesquisa, sem limite de tamanho ou tipo de arquivo.
--
-- Correção: a partir de agora, o upload/remoção de assets passam pelo servidor
-- (POST/DELETE /api/survey-assets — ver api/survey-assets.ts e server.ts), que
-- usa a SUPABASE_SERVICE_ROLE_KEY e por isso ignora RLS independentemente das
-- policies abaixo. Não é necessário recriar as policies de escrita para
-- nenhuma role: a leitura pública (survey_assets_public_read) é mantida, pois
-- as imagens realmente precisam aparecer para o cidadão respondendo a
-- pesquisa; escrita direta do navegador deixa de ser permitida para todos.
-- =============================================================================

drop policy if exists "survey_assets_write" on storage.objects;
drop policy if exists "survey_assets_update" on storage.objects;
drop policy if exists "survey_assets_delete" on storage.objects;

-- A policy de leitura pública (survey_assets_public_read), criada na migration
-- 0007, é mantida sem alteração.
