import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// -------------------------------------------------------------------------------------
// Cliente Supabase do backend (service role — ignora RLS).
// Em dev local, se as variáveis não estiverem configuradas, o servidor sobe mas as
// rotas /api/* retornam erro 500 explicando o que falta (sem cair de volta para o
// repositório em memória, para não mascarar problemas de configuração em produção).
// -------------------------------------------------------------------------------------
let supabase: SupabaseClient | null = null;
function getDb(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase não configurado no servidor. Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env (veja .env.example).'
    );
  }
  if (!supabase) {
    supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return supabase;
}

// Tipagem básica interna para o servidor (equivalente ao Survey de src/types.ts)
interface ServerSurveyRow {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  status: 'ativa' | 'inativa' | 'excluida';
  habilitar_coleta_web: boolean;
  tipo_coleta_web: 'publico' | 'interno';
  colaborador_web_id: string | null;
  perguntas: any[];
  regras: any[];
  metas: any[];
  metas_globais: any[];
  pesquisadores_ids: string[];
  ciclo_atual: number;
  versao: number;
  criada_em: string;
  atualizada_em: string;
  em_andamento: boolean;
  server_version: number;
  dados_completos: any;
  data_inicio: string | null;
  data_fim: string | null;
  meta_total_coletas: number | null;
  nivel_confianca_percentual: number | null;
  margem_erro_percentual: number | null;
  populacao_universo: number | null;
  meta_sexo_masculino: number | null;
  meta_sexo_feminino: number | null;
  meta_sexo_outro: number | null;
  dias_previstos_campo: number | null;
  media_coletas_dia_pesquisador: number | null;
  reserva_tecnica_percentual: number | null;
  habilitar_gravacao_audio: boolean | null;
  gravar_audio_a_partir_pergunta_id: string | null;
  tempo_limite_gravacao_minutos: number | null;
}

function isSurveyInProgress(row: ServerSurveyRow, subsCount: number): boolean {
  return row.status === 'ativa' || subsCount > 0 || !!row.em_andamento;
}

function toDTO(row: ServerSurveyRow, subsCount: number) {
  const emAndamento = isSurveyInProgress(row, subsCount);
  return {
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    descricao: row.descricao,
    status: row.status,
    habilitarColetaWeb: row.habilitar_coleta_web,
    tipoColetaWeb: row.tipo_coleta_web,
    colaboradorWebId: row.colaborador_web_id || undefined,
    perguntas: row.perguntas || [],
    regras: row.regras || [],
    metas: row.metas || [],
    metasGlobais: row.metas_globais || [],
    pesquisadoresIds: row.pesquisadores_ids || [],
    cicloAtual: row.ciclo_atual,
    versao: row.versao,
    criadaEm: row.criada_em,
    atualizadaEm: row.atualizada_em,
    emAndamento,
    serverVersion: row.versao || 1,
    totalEntrevistasColetadas: subsCount,
    dataInicio: row.data_inicio || undefined,
    dataFim: row.data_fim || undefined,
    metaTotalColetas: row.meta_total_coletas ?? undefined,
    nivelConfiancaPercentual: row.nivel_confianca_percentual ?? undefined,
    margemErroPercentual: row.margem_erro_percentual ?? undefined,
    populacaoUniverso: row.populacao_universo ?? undefined,
    metaSexoMasculino: row.meta_sexo_masculino ?? undefined,
    metaSexoFeminino: row.meta_sexo_feminino ?? undefined,
    metaSexoOutro: row.meta_sexo_outro ?? undefined,
    diasPrevistosCampo: row.dias_previstos_campo ?? undefined,
    mediaColetasDiaPesquisador: row.media_coletas_dia_pesquisador ?? undefined,
    reservaTecnicaPercentual: row.reserva_tecnica_percentual ?? undefined,
    habilitarGravacaoAudio: row.habilitar_gravacao_audio ?? undefined,
    gravarAudioAPartirPerguntaId: row.gravar_audio_a_partir_pergunta_id || undefined,
    tempoLimiteGravacaoMinutos: row.tempo_limite_gravacao_minutos ?? undefined,
  };
}

function payloadToRow(survey: Record<string, any>): Record<string, any> {
  const row: Record<string, any> = {};
  if (survey.id !== undefined) row.id = survey.id;
  if (survey.codigo !== undefined) row.codigo = survey.codigo;
  if (survey.nome !== undefined) row.nome = survey.nome;
  if (survey.descricao !== undefined) row.descricao = survey.descricao;
  if (survey.status !== undefined) row.status = survey.status;
  if (survey.habilitarColetaWeb !== undefined) row.habilitar_coleta_web = survey.habilitarColetaWeb;
  if (survey.tipoColetaWeb !== undefined) row.tipo_coleta_web = survey.tipoColetaWeb;
  if (survey.colaboradorWebId !== undefined) row.colaborador_web_id = survey.colaboradorWebId;
  if (survey.perguntas !== undefined) row.perguntas = survey.perguntas;
  if (survey.regras !== undefined) row.regras = survey.regras;
  if (survey.metas !== undefined) row.metas = survey.metas;
  if (survey.metasGlobais !== undefined) row.metas_globais = survey.metasGlobais;
  if (survey.pesquisadoresIds !== undefined) row.pesquisadores_ids = survey.pesquisadoresIds;
  if (survey.cicloAtual !== undefined) row.ciclo_atual = survey.cicloAtual;
  if (survey.criadaEm !== undefined) row.criada_em = survey.criadaEm;
  if (survey.dataInicio !== undefined) row.data_inicio = survey.dataInicio || null;
  if (survey.dataFim !== undefined) row.data_fim = survey.dataFim || null;
  if (survey.metaTotalColetas !== undefined) row.meta_total_coletas = survey.metaTotalColetas;
  if (survey.nivelConfiancaPercentual !== undefined) row.nivel_confianca_percentual = survey.nivelConfiancaPercentual;
  if (survey.margemErroPercentual !== undefined) row.margem_erro_percentual = survey.margemErroPercentual;
  if (survey.populacaoUniverso !== undefined) row.populacao_universo = survey.populacaoUniverso;
  if (survey.metaSexoMasculino !== undefined) row.meta_sexo_masculino = survey.metaSexoMasculino;
  if (survey.metaSexoFeminino !== undefined) row.meta_sexo_feminino = survey.metaSexoFeminino;
  if (survey.metaSexoOutro !== undefined) row.meta_sexo_outro = survey.metaSexoOutro;
  if (survey.diasPrevistosCampo !== undefined) row.dias_previstos_campo = survey.diasPrevistosCampo;
  if (survey.mediaColetasDiaPesquisador !== undefined) row.media_coletas_dia_pesquisador = survey.mediaColetasDiaPesquisador;
  if (survey.reservaTecnicaPercentual !== undefined) row.reserva_tecnica_percentual = survey.reservaTecnicaPercentual;
  if (survey.habilitarGravacaoAudio !== undefined) row.habilitar_gravacao_audio = survey.habilitarGravacaoAudio;
  if (survey.gravarAudioAPartirPerguntaId !== undefined) row.gravar_audio_a_partir_pergunta_id = survey.gravarAudioAPartirPerguntaId;
  if (survey.tempoLimiteGravacaoMinutos !== undefined) row.tempo_limite_gravacao_minutos = survey.tempoLimiteGravacaoMinutos;
  row.dados_completos = survey;
  return row;
}

async function getSubmissionsCount(db: SupabaseClient, surveyId: string): Promise<number> {
  const { count } = await db.from('respostas').select('*', { count: 'exact', head: true }).eq('pesquisa_id', surveyId);
  return count ?? 0;
}

function handleDbError(res: Response, err: any) {
  console.error('[Servidor Central] Erro de banco:', err);
  return res.status(500).json({ success: false, message: err?.message || 'Erro interno do servidor.' });
}

// -------------------------------------------------------------------------------------
// ROTAS DE API DO SERVIDOR (/api/*)
// Mesmo contrato de rotas, erros e formato de resposta da versão anterior em memória.
// -------------------------------------------------------------------------------------

// 1. Healthcheck
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { count } = await db.from('pesquisas').select('*', { count: 'exact', head: true });
    res.json({ status: 'ok', serverTime: new Date().toISOString(), surveysCount: count ?? 0 });
  } catch (err: any) {
    res.json({ status: 'degraded', serverTime: new Date().toISOString(), surveysCount: 0, error: err?.message });
  }
});

// 2. Listar todas as pesquisas armazenadas no servidor
app.get('/api/surveys', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { data, error } = await db.from('pesquisas').select('*').order('atualizada_em', { ascending: false });
    if (error) throw error;

    const rows = (data || []) as ServerSurveyRow[];
    const counts: Record<string, number> = {};
    if (rows.length > 0) {
      const { data: subs } = await db
        .from('respostas')
        .select('pesquisa_id')
        .in('pesquisa_id', rows.map((r) => r.id));
      for (const s of subs || []) {
        counts[s.pesquisa_id] = (counts[s.pesquisa_id] || 0) + 1;
      }
    }

    const list = rows.map((r) => toDTO(r, counts[r.id] || 0));
    res.json({ success: true, surveys: list });
  } catch (err: any) {
    handleDbError(res, err);
  }
});

// 3. Obter pesquisa específica no servidor
app.get('/api/surveys/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const db = getDb();
    const { data, error } = await db.from('pesquisas').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, message: 'Pesquisa não encontrada no servidor.' });
    }

    const subsCount = await getSubmissionsCount(db, id);
    res.json({ success: true, survey: toDTO(data as ServerSurveyRow, subsCount) });
  } catch (err: any) {
    handleDbError(res, err);
  }
});

// 4. SINCRONIZAÇÃO PRÉVIA MANDATÓRIA (/api/surveys/:id/sync)
// Valida o estado com o servidor antes de permitir subir qualquer alteração em pesquisa em andamento
app.post('/api/surveys/:id/sync', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { clientDraft } = req.body;

  try {
    const db = getDb();
    let { data: existing, error } = await db.from('pesquisas').select('*').eq('id', id).maybeSingle();
    if (error) throw error;

    // Se não existir no repositório ainda mas foi enviada no draft (por exemplo, criada inicialmente offline)
    if (!existing && clientDraft) {
      const row = payloadToRow({ ...clientDraft, id });
      row.versao = clientDraft.versao || 1;
      row.server_version = clientDraft.versao || 1;
      row.em_andamento = clientDraft.status === 'ativa';
      row.criada_em = clientDraft.criadaEm || new Date().toISOString();
      row.atualizada_em = new Date().toISOString();

      const { data: inserted, error: insertError } = await db.from('pesquisas').insert(row).select('*').single();
      if (insertError) throw insertError;
      existing = inserted;
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Pesquisa não localizada no servidor para sincronização.',
      });
    }

    const survey = existing as ServerSurveyRow;
    const subsCount = await getSubmissionsCount(db, id);
    const emAndamento = isSurveyInProgress(survey, subsCount);

    // Analisa possíveis divergências ou impacto nas coletas ativas
    const divergences: string[] = [];
    if (clientDraft && clientDraft.perguntas) {
      const clientQuestionIds = new Set(clientDraft.perguntas.map((q: any) => q.id));
      const removedCount = (survey.perguntas || []).filter((q: any) => !clientQuestionIds.has(q.id)).length;
      if (removedCount > 0 && subsCount > 0) {
        divergences.push(`Atenção: ${removedCount} pergunta(s) foram excluídas localmente enquanto existem ${subsCount} entrevistas coletadas em campo.`);
      }
    }

    // Gera token de autorização de upload válido por 15 minutos, persistido em `sync_tokens`
    const randomSuffix = Math.random().toString(36).substring(2, 9).toUpperCase();
    const syncToken = `SYNC-AUTH-${Date.now()}-${randomSuffix}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const { error: tokenError } = await db.from('sync_tokens').insert({
      token: syncToken,
      survey_id: id,
      client_version: clientDraft?.versao || survey.versao || 1,
      expires_at: expiresAt.toISOString(),
    });
    if (tokenError) throw tokenError;

    console.log(`[Servidor Central] Sincronização prévia efetuada para a pesquisa "${survey.nome}" (${id}). Token gerado: ${syncToken}`);

    return res.json({
      success: true,
      emAndamento,
      serverVersion: survey.versao || 1,
      syncToken,
      expiresAt: expiresAt.toISOString(),
      submissionsCount: subsCount,
      message: emAndamento
        ? `Sincronização com o servidor validada com sucesso! A pesquisa em andamento possui ${subsCount} entrevista(s) vinculada(s). Autorização de upload liberada.`
        : 'Sincronização com o servidor efetuada com sucesso. Pesquisa autorizada para upload.',
      divergences,
      serverSurvey: toDTO(survey, subsCount),
    });
  } catch (err: any) {
    handleDbError(res, err);
  }
});

// 5. SUBIR ALTERAÇÕES DA PESQUISA (/api/surveys/:id)
// SE A PESQUISA ESTIVER EM ANDAMENTO, O SERVIDOR EXIGE O TOKEN DE PRÉ-SINCRONIZAÇÃO
app.put('/api/surveys/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { survey, syncToken: bodyToken } = req.body;
  const headerToken = req.headers['x-sync-token'] as string | undefined;
  const providedToken = headerToken || bodyToken;

  try {
    const db = getDb();
    const { data: existingData, error: fetchError } = await db.from('pesquisas').select('*').eq('id', id).maybeSingle();
    if (fetchError) throw fetchError;

    // Se não existir, podemos tratar como inclusão caso seja nova
    if (!existingData) {
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Pesquisa não encontrada no servidor.' });
      }

      const row = payloadToRow({ ...survey, id });
      row.versao = 1;
      row.server_version = 1;
      row.criada_em = survey.criadaEm || new Date().toISOString();
      row.atualizada_em = new Date().toISOString();
      row.em_andamento = survey.status === 'ativa';

      const { data: inserted, error: insertError } = await db.from('pesquisas').insert(row).select('*').single();
      if (insertError) throw insertError;

      return res.json({
        success: true,
        survey: toDTO(inserted as ServerSurveyRow, 0),
        message: 'Pesquisa registrada com sucesso no servidor.',
      });
    }

    const existing = existingData as ServerSurveyRow;
    const subsCount = await getSubmissionsCount(db, id);
    const emAndamento = isSurveyInProgress(existing, subsCount);

    // VERIFICAÇÃO MANDATÓRIA:
    // Se a pesquisa está em andamento, é OBRIGATÓRIO ter sincronizado antes e possuir token válido!
    if (emAndamento) {
      if (!providedToken) {
        console.warn(`[Servidor Central] Tentativa de subir alterações sem sincronização prévia na pesquisa em andamento "${existing.nome}" (${id})!`);
        return res.status(428).json({
          success: false,
          error: 'SYNC_REQUIRED_BEFORE_UPLOAD',
          message: `A pesquisa "${existing.nome}" está EM ANDAMENTO com ${subsCount} entrevistas coletadas. É OBRIGATÓRIO sincronizar com o servidor antes de subir qualquer alteração ou ajuste.`,
        });
      }

      const { data: tokenRow } = await db.from('sync_tokens').select('*').eq('token', providedToken).maybeSingle();
      const isValid = tokenRow && tokenRow.survey_id === id && new Date(tokenRow.expires_at).getTime() > Date.now();

      if (!isValid) {
        return res.status(428).json({
          success: false,
          error: 'SYNC_REQUIRED_BEFORE_UPLOAD',
          message: 'A autorização de sincronização prévia expirou ou é inválida. Você precisa sincronizar novamente com o servidor antes de subir as alterações.',
        });
      }

      // Consome o token para prevenir reuso
      await db.from('sync_tokens').delete().eq('token', providedToken);
    }

    // Incrementa versão no servidor e salva dados
    const nextVersao = (existing.versao || 1) + 1;
    const row = payloadToRow(survey || {});
    delete row.id;
    row.versao = nextVersao;
    row.server_version = nextVersao;
    row.atualizada_em = new Date().toISOString();
    row.em_andamento = emAndamento;

    const { data: updated, error: updateError } = await db.from('pesquisas').update(row).eq('id', id).select('*').single();
    if (updateError) throw updateError;

    console.log(`[Servidor Central] Pesquisa "${(updated as ServerSurveyRow).nome}" atualizada para v${nextVersao} com sucesso no servidor!`);

    res.json({
      success: true,
      survey: toDTO(updated as ServerSurveyRow, subsCount),
      message: `Alterações subidas com sucesso para o servidor! Versão atualizada para v${nextVersao}.`,
    });
  } catch (err: any) {
    handleDbError(res, err);
  }
});

// 6. Criar nova pesquisa no servidor
app.post('/api/surveys', async (req: Request, res: Response) => {
  const newSurveyData = req.body;
  const id = newSurveyData.id || `pesq_${Date.now()}`;

  try {
    const db = getDb();
    const row = payloadToRow({ ...newSurveyData, id });
    row.versao = 1;
    row.server_version = 1;
    row.criada_em = newSurveyData.criadaEm || new Date().toISOString();
    row.atualizada_em = new Date().toISOString();
    row.em_andamento = newSurveyData.status === 'ativa';

    const { data: created, error } = await db.from('pesquisas').insert(row).select('*').single();
    if (error) throw error;

    res.status(201).json({
      success: true,
      survey: toDTO(created as ServerSurveyRow, 0),
      message: 'Pesquisa criada com sucesso no servidor!',
    });
  } catch (err: any) {
    handleDbError(res, err);
  }
});

// -------------------------------------------------------------------------------------
// INTEGRAÇÃO COM O VITE (FRONTEND)
// -------------------------------------------------------------------------------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor DataQuest em execução na porta ${PORT}`);
  });
}

start();
