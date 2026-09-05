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
