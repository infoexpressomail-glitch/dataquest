-- =====================================================================================
-- DataQuest — Migration 0007: Modelo Mobile First Premium (Opção 6)
-- =====================================================================================
-- Acompanha a evolução do tipo TypeScript `Survey` e `Question` (src/types.ts) com
-- o novo modelo de interface "Mobile First Premium". NENHUM campo, tabela, coluna,
-- função ou política anterior é removido ou renomeado.
--
-- IDEMPOTENTE: usa `ADD COLUMN IF NOT EXISTS` / `create or replace` / `on conflict`,
-- portanto pode ser executada com segurança mais de uma vez.
--
-- Observação: `pesquisas.dados_completos` (jsonb) já guarda o objeto Survey inteiro,
-- então TODOS os campos abaixo JÁ eram persistidos antes desta migration. As colunas
-- normalizadas servem para índices/filtros/relatórios via SQL direto.
--
-- Sobre os campos por PERGUNTA citados no prompt (question_icon, question_emoji,
-- question_image, answer_visual_type, answer_icon, answer_emoji, answer_image,
-- card_color, icon_color, badge_color): eles são atributos de CADA pergunta, não da
-- pesquisa, e por isso vivem (corretamente normalizados) dentro da coluna jsonb
-- `perguntas` — no novo bloco `visual` de cada pergunta. Criar colunas escalares na
-- tabela `pesquisas` seria um erro de modelagem (uma pesquisa tem N perguntas).
-- O script no final desta migration documenta/exemplifica a leitura desses campos.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Colunas normalizadas do modelo Mobile First Premium (nível pesquisa)
-- -------------------------------------------------------------------------------------
alter table public.pesquisas add column if not exists layout_style text default 'DEFAULT';
alter table public.pesquisas add column if not exists institution_name text;
alter table public.pesquisas add column if not exists logo_image text;
alter table public.pesquisas add column if not exists cover_image text;
alter table public.pesquisas add column if not exists finish_image text;
alter table public.pesquisas add column if not exists welcome_message text;
alter table public.pesquisas add column if not exists finish_message text;
alter table public.pesquisas add column if not exists prefeitura_message text;
alter table public.pesquisas add column if not exists qr_code_url text;
alter table public.pesquisas add column if not exists theme_accent text;
alter table public.pesquisas add column if not exists theme_secondary text;

comment on column public.pesquisas.layout_style is 'Modelo de layout: DEFAULT | CARD | SIDEBAR | MOBILE_PREMIUM (Survey.layoutStyle)';
comment on column public.pesquisas.institution_name is 'Nome da instituição exibido no cabeçalho premium (Survey.institutionName)';
comment on column public.pesquisas.logo_image is 'Logo da instituição — URL/Storage (Survey.logoImage)';
comment on column public.pesquisas.cover_image is 'Imagem de capa da tela inicial (Survey.coverImage)';
comment on column public.pesquisas.finish_image is 'Imagem da tela final (Survey.finishImage)';
comment on column public.pesquisas.welcome_message is 'Mensagem inicial da capa (Survey.welcomeMessage)';
comment on column public.pesquisas.finish_message is 'Mensagem final de agradecimento (Survey.finishMessage)';
comment on column public.pesquisas.prefeitura_message is 'Mensagem institucional da tela final (Survey.prefeituraMessage)';
comment on column public.pesquisas.qr_code_url is 'QR Code opcional da tela final (Survey.qrCodeUrl)';
comment on column public.pesquisas.theme_accent is 'Cor principal do tema (Survey.themeAccent)';
comment on column public.pesquisas.theme_secondary is 'Cor secundária do tema (Survey.themeSecondary)';

-- Restringe layout_style aos valores oficiais (sem quebrar linhas antigas nulas).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pesquisas_layout_style_check'
  ) then
    alter table public.pesquisas
      add constraint pesquisas_layout_style_check
      check (layout_style is null or layout_style in ('DEFAULT', 'CARD', 'SIDEBAR', 'MOBILE_PREMIUM'));
  end if;
end $$;

create index if not exists idx_pesquisas_layout_style on public.pesquisas (layout_style);

-- -------------------------------------------------------------------------------------
-- 2. Bucket de Storage: survey-assets + pastas covers/, questions/, answers/, gallery/, logos/
-- -------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('survey-assets', 'survey-assets', true)
on conflict (id) do update set public = true;

-- Políticas de acesso ao bucket (idempotentes).
do $$
begin
  -- Leitura pública (as imagens aparecem na pesquisa respondida pelo cidadão).
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'survey_assets_public_read') then
    create policy "survey_assets_public_read" on storage.objects
      for select using (bucket_id = 'survey-assets');
  end if;

  -- Upload/alteração/exclusão pelos administradores autenticados (ou anon key do app).
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'survey_assets_write') then
    create policy "survey_assets_write" on storage.objects
      for insert with check (bucket_id = 'survey-assets');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'survey_assets_update') then
    create policy "survey_assets_update" on storage.objects
      for update using (bucket_id = 'survey-assets');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'survey_assets_delete') then
    create policy "survey_assets_delete" on storage.objects
      for delete using (bucket_id = 'survey-assets');
  end if;
end $$;

-- -------------------------------------------------------------------------------------
-- 3. Função utilitária: sincronizar colunas normalizadas a partir de dados_completos
-- -------------------------------------------------------------------------------------
create or replace function public.sincronizar_colunas_mobile_premium()
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
    layout_style = coalesce(layout_style, dados_completos->>'layoutStyle', 'DEFAULT'),
    institution_name = coalesce(institution_name, dados_completos->>'institutionName'),
    logo_image = coalesce(logo_image, dados_completos->>'logoImage'),
    cover_image = coalesce(cover_image, dados_completos->>'coverImage'),
    finish_image = coalesce(finish_image, dados_completos->>'finishImage'),
    welcome_message = coalesce(welcome_message, dados_completos->>'welcomeMessage'),
    finish_message = coalesce(finish_message, dados_completos->>'finishMessage'),
    prefeitura_message = coalesce(prefeitura_message, dados_completos->>'prefeituraMessage'),
    qr_code_url = coalesce(qr_code_url, dados_completos->>'qrCodeUrl'),
    theme_accent = coalesce(theme_accent, dados_completos->>'themeAccent'),
    theme_secondary = coalesce(theme_secondary, dados_completos->>'themeSecondary')
  where dados_completos is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 4. Atualiza criar_pesquisa / atualizar_pesquisa para gravar as novas colunas
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
    habilitar_gravacao_audio, gravar_audio_a_partir_pergunta_id, tempo_limite_gravacao_minutos,
    layout_style, institution_name, logo_image, cover_image, finish_image,
    welcome_message, finish_message, prefeitura_message, qr_code_url, theme_accent, theme_secondary
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
    coalesce((p_survey->>'tempoLimiteGravacaoMinutos')::int, 2),
    coalesce(p_survey->>'layoutStyle', 'DEFAULT'),
    p_survey->>'institutionName',
    p_survey->>'logoImage',
    p_survey->>'coverImage',
    p_survey->>'finishImage',
    p_survey->>'welcomeMessage',
    p_survey->>'finishMessage',
    p_survey->>'prefeituraMessage',
    p_survey->>'qrCodeUrl',
    p_survey->>'themeAccent',
    p_survey->>'themeSecondary'
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
    tempo_limite_gravacao_minutos = coalesce((p_survey->>'tempoLimiteGravacaoMinutos')::int, tempo_limite_gravacao_minutos),
    layout_style = coalesce(p_survey->>'layoutStyle', layout_style),
    institution_name = coalesce(p_survey->>'institutionName', institution_name),
    logo_image = coalesce(p_survey->>'logoImage', logo_image),
    cover_image = coalesce(p_survey->>'coverImage', cover_image),
    finish_image = coalesce(p_survey->>'finishImage', finish_image),
    welcome_message = coalesce(p_survey->>'welcomeMessage', welcome_message),
    finish_message = coalesce(p_survey->>'finishMessage', finish_message),
    prefeitura_message = coalesce(p_survey->>'prefeituraMessage', prefeitura_message),
    qr_code_url = coalesce(p_survey->>'qrCodeUrl', qr_code_url),
    theme_accent = coalesce(p_survey->>'themeAccent', theme_accent),
    theme_secondary = coalesce(p_survey->>'themeSecondary', theme_secondary)
  where id = p_id
  returning * into v_row;
  return v_row;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 5. Como ler os campos de aparência POR PERGUNTA (dentro do jsonb perguntas)
-- -------------------------------------------------------------------------------------
-- Exemplo: listar perguntas de uma pesquisa com seu tipo visual e cores.
--
--   select
--     p.nome as pesquisa,
--     q->>'codigo'                            as codigo,
--     q->>'enunciado'                         as enunciado,
--     q->'visual'->>'answerVisualType'        as answer_visual_type,
--     q->'visual'->>'iconId'                  as question_icon,
--     q->'visual'->>'emoji'                   as question_emoji,
--     q->'visual'->>'imageUrl'                as question_image,
--     q->'visual'->>'cardColor'               as card_color,
--     q->'visual'->>'iconColor'               as icon_color,
--     q->'visual'->>'badgeColor'              as badge_color
--   from public.pesquisas p
--   cross join lateral jsonb_array_elements(p.perguntas) as q
--   where p.layout_style = 'MOBILE_PREMIUM';
--
-- E, por alternativa (respostas), dentro de q->'opcoes':
--   iconId, smileId, emoji, imageUrl, color, badge, description.

-- =====================================================================================
-- FIM DA MIGRATION 0007
-- =====================================================================================
