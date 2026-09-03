import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Tipagem básica interna para o servidor
interface ServerSurvey {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  status: 'ativa' | 'inativa' | 'excluida';
  habilitarColetaWeb: boolean;
  tipoColetaWeb: 'publico' | 'interno';
  colaboradorWebId?: string;
  perguntas: any[];
  regras: any[];
  metas: any[];
  pesquisadoresIds: string[];
  cicloAtual: number;
  versao: number;
  criadaEm: string;
  atualizadaEm: string;
  emAndamento?: boolean;
  serverVersion?: number;
  submissionsCount?: number;
}

// Repositório em memória persistente do servidor
const surveysStore = new Map<string, ServerSurvey>();

// Total de entrevistas vinculadas por pesquisa (simula coletas ativas em campo)
const submissionsCountStore = new Map<string, number>([
  ['pesq_literarraial_2025', 18],
  ['pesq_saude_2025', 12],
  ['pesq_transporte_2025', 6],
]);

// Tokens emitidos após sincronização prévia mandatória
// Mapeia token -> { surveyId, expiresAt, generatedAt }
interface SyncTokenRecord {
  surveyId: string;
  expiresAt: number;
  generatedAt: number;
  clientVersion: number;
}
const syncTokensStore = new Map<string, SyncTokenRecord>();

// Inicialização com as pesquisas padrão do sistema
function seedInitialSurveys() {
  const initialList: ServerSurvey[] = [
    {
      id: 'pesq_literarraial_2025',
      codigo: 'LIT-2025-01',
      nome: 'LiterArraial 2025 - Prefeitura',
      descricao: 'Dados sobre a percepção da Feira Literária.',
      status: 'ativa',
      habilitarColetaWeb: true,
      tipoColetaWeb: 'publico',
      colaboradorWebId: 'colab_2',
      pesquisadoresIds: ['colab_1', 'colab_2', 'colab_3', 'colab_4'],
      cicloAtual: 1,
      versao: 1,
      criadaEm: '2025-05-10T08:00:00Z',
      atualizadaEm: '2025-06-01T17:30:00Z',
      emAndamento: true,
      serverVersion: 1,
      submissionsCount: 18,
      perguntas: [
        {
          id: 'q1',
          codigo: 'P01',
          enunciado: 'Você reside no município onde a feira literária está sendo realizada?',
          tipo: 'sim_nao',
          obrigatoria: true,
          ordem: 1,
          opcoes: [
            { id: 'opt_sim', label: 'Sim, sou morador', value: 'Sim' },
            { id: 'opt_nao', label: 'Não, sou visitante/turista', value: 'Não' },
          ],
        },
        {
          id: 'q2',
          codigo: 'P02',
          enunciado: 'Qual a sua faixa etária?',
          tipo: 'multipla_escolha',
          obrigatoria: true,
          ordem: 2,
          opcoes: [
            { id: 'opt_1825', label: '18 a 25 anos', value: '18 a 25 anos' },
            { id: 'opt_2640', label: '26 a 40 anos', value: '26 a 40 anos' },
            { id: 'opt_4160', label: '41 a 60 anos', value: '41 a 60 anos' },
            { id: 'opt_60mais', label: 'Acima de 60 anos', value: 'Acima de 60 anos' },
          ],
        },
        {
          id: 'q3',
          codigo: 'P03',
          enunciado: 'Como você avalia a infraestrutura e acessibilidade do evento?',
          tipo: 'escala_numerica',
          obrigatoria: true,
          ordem: 3,
          escalaMin: 1,
          escalaMax: 5,
          escalaMinLabel: 'Muito Insatisfeito',
          escalaMaxLabel: 'Muito Satisfeito',
        },
      ],
      regras: [],
      metas: [],
    },
    {
      id: 'pesq_saude_2025',
      codigo: 'SAU-2025-02',
      nome: 'Avaliação da Saúde Municipal 2025',
      descricao: 'Satisfação dos usuários com UBS e hospitais municipais.',
      status: 'ativa',
      habilitarColetaWeb: true,
      tipoColetaWeb: 'publico',
      colaboradorWebId: 'colab_1',
      pesquisadoresIds: ['colab_1', 'colab_3', 'colab_5'],
      cicloAtual: 1,
      versao: 1,
      criadaEm: '2025-04-01T09:00:00Z',
      atualizadaEm: '2025-05-15T14:00:00Z',
      emAndamento: true,
      serverVersion: 1,
      submissionsCount: 12,
      perguntas: [
        {
          id: 'qs1',
          codigo: 'P01',
          enunciado: 'Qual UBS você mais frequenta na sua região?',
          tipo: 'multipla_escolha',
          obrigatoria: true,
          ordem: 1,
          opcoes: [
            { id: 'ubs_centro', label: 'UBS Central Dr. Silva', value: 'UBS Central' },
            { id: 'ubs_norte', label: 'UBS Zona Norte', value: 'UBS Norte' },
            { id: 'ubs_sul', label: 'UBS São Pedro (Sul)', value: 'UBS Sul' },
          ],
        },
      ],
      regras: [],
      metas: [],
    },
  ];

  for (const s of initialList) {
    surveysStore.set(s.id, s);
  }
}

seedInitialSurveys();

// Helper: Determina se a pesquisa está em andamento no servidor
function isSurveyInProgress(survey: ServerSurvey): boolean {
  const subsCount = submissionsCountStore.get(survey.id) || survey.submissionsCount || 0;
  return survey.status === 'ativa' || subsCount > 0 || !!survey.emAndamento;
}

// -------------------------------------------------------------
// ROTAS DE API DO SERVIDOR (/api/*)
// -------------------------------------------------------------

// 1. Healthcheck
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    surveysCount: surveysStore.size,
  });
});

// 2. Listar todas as pesquisas armazenadas no servidor
app.get('/api/surveys', (req: Request, res: Response) => {
  const list = Array.from(surveysStore.values()).map((s) => ({
    ...s,
    emAndamento: isSurveyInProgress(s),
    serverVersion: s.versao || 1,
    totalEntrevistasColetadas: submissionsCountStore.get(s.id) || s.submissionsCount || 0,
  }));
  res.json({ success: true, surveys: list });
});

// 3. Obter pesquisa específica no servidor
app.get('/api/surveys/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const survey = surveysStore.get(id);
  if (!survey) {
    return res.status(404).json({ success: false, message: 'Pesquisa não encontrada no servidor.' });
  }

  const emAndamento = isSurveyInProgress(survey);
  const submissionsCount = submissionsCountStore.get(id) || survey.submissionsCount || 0;

  res.json({
    success: true,
    survey: {
      ...survey,
      emAndamento,
      serverVersion: survey.versao || 1,
      totalEntrevistasColetadas: submissionsCount,
    },
  });
});

// 4. SINCRONIZAÇÃO PRÉVIA MANDATÓRIA (/api/surveys/:id/sync)
// Valida o estado com o servidor antes de permitir subir qualquer alteração em pesquisa em andamento
app.post('/api/surveys/:id/sync', (req: Request, res: Response) => {
  const { id } = req.params;
  const { clientDraft, timestamp } = req.body;

  let survey = surveysStore.get(id);

  // Se não existir no repositório ainda mas foi enviada no draft (por exemplo, criada inicialmente offline)
  if (!survey && clientDraft) {
    survey = {
      ...clientDraft,
      id,
      versao: clientDraft.versao || 1,
      emAndamento: clientDraft.status === 'ativa',
      submissionsCount: 0,
    };
    surveysStore.set(id, survey);
  }

  if (!survey) {
    return res.status(404).json({
      success: false,
      message: 'Pesquisa não localizada no servidor para sincronização.',
    });
  }

  const emAndamento = isSurveyInProgress(survey);
  const subsCount = submissionsCountStore.get(id) || survey.submissionsCount || 0;

  // Analisa possíveis divergências ou impacto nas coletas ativas
  const divergences: string[] = [];
  if (clientDraft && clientDraft.perguntas) {
    const existingQuestionIds = new Set(survey.perguntas.map((q: any) => q.id));
    const removedCount = survey.perguntas.filter((q: any) => !clientDraft.perguntas.some((cq: any) => cq.id === q.id)).length;
    if (removedCount > 0 && subsCount > 0) {
      divergences.push(`Atenção: ${removedCount} pergunta(s) foram excluídas localmente enquanto existem ${subsCount} entrevistas coletadas em campo.`);
    }
  }

  // Gera token de autorização de upload válido por 15 minutos
  const randomSuffix = Math.random().toString(36).substring(2, 9).toUpperCase();
  const syncToken = `SYNC-AUTH-${Date.now()}-${randomSuffix}`;
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutos

  syncTokensStore.set(syncToken, {
    surveyId: id,
    expiresAt,
    generatedAt: Date.now(),
    clientVersion: clientDraft?.versao || survey.versao || 1,
  });

  console.log(`[Servidor Central] Sincronização prévia efetuada para a pesquisa "${survey.nome}" (${id}). Token gerado: ${syncToken}`);

  return res.json({
    success: true,
    emAndamento,
    serverVersion: survey.versao || 1,
    syncToken,
    expiresAt: new Date(expiresAt).toISOString(),
    submissionsCount: subsCount,
    message: emAndamento
      ? `Sincronização com o servidor validada com sucesso! A pesquisa em andamento possui ${subsCount} entrevista(s) vinculada(s). Autorização de upload liberada.`
      : 'Sincronização com o servidor efetuada com sucesso. Pesquisa autorizada para upload.',
    divergences,
    serverSurvey: {
      ...survey,
      emAndamento,
      serverVersion: survey.versao || 1,
      totalEntrevistasColetadas: subsCount,
    },
  });
});

// 5. SUBIR ALTERAÇÕES DA PESQUISA (/api/surveys/:id)
// SE A PESQUISA ESTIVER EM ANDAMENTO, O SERVIDOR EXIGE O TOKEN DE PRÉ-SINCRONIZAÇÃO
app.put('/api/surveys/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { survey, syncToken: bodyToken } = req.body;
  const headerToken = req.headers['x-sync-token'] as string | undefined;
  const providedToken = headerToken || bodyToken;

  let existing = surveysStore.get(id);

  // Se não existir, podemos tratar como inclusão caso seja nova
  if (!existing && survey) {
    const newSurvey: ServerSurvey = {
      ...survey,
      id,
      versao: 1,
      criadaEm: survey.criadaEm || new Date().toISOString(),
      atualizadaEm: new Date().toISOString(),
      emAndamento: survey.status === 'ativa',
      submissionsCount: 0,
    };
    surveysStore.set(id, newSurvey);
    return res.json({
      success: true,
      survey: newSurvey,
      message: 'Pesquisa registrada com sucesso no servidor.',
    });
  }

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Pesquisa não encontrada no servidor.',
    });
  }

  const emAndamento = isSurveyInProgress(existing);
  const subsCount = submissionsCountStore.get(id) || existing.submissionsCount || 0;

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

    const tokenRecord = syncTokensStore.get(providedToken);
    if (!tokenRecord || tokenRecord.surveyId !== id || Date.now() > tokenRecord.expiresAt) {
      return res.status(428).json({
        success: false,
        error: 'SYNC_REQUIRED_BEFORE_UPLOAD',
        message: 'A autorização de sincronização prévia expirou ou é inválida. Você precisa sincronizar novamente com o servidor antes de subir as alterações.',
      });
    }

    // Consome o token para prevenir reuso
    syncTokensStore.delete(providedToken);
  }

  // Incrementa versão no servidor e salva dados
  const nextVersao = (existing.versao || 1) + 1;
  const updatedSurvey: ServerSurvey = {
    ...existing,
    ...survey,
    id,
    versao: nextVersao,
    serverVersion: nextVersao,
    atualizadaEm: new Date().toISOString(),
    emAndamento,
    submissionsCount: subsCount,
  };

  surveysStore.set(id, updatedSurvey);

  console.log(`[Servidor Central] Pesquisa "${updatedSurvey.nome}" atualizada para v${nextVersao} com sucesso no servidor!`);

  res.json({
    success: true,
    survey: {
      ...updatedSurvey,
      totalEntrevistasColetadas: subsCount,
    },
    message: `Alterações subidas com sucesso para o servidor! Versão atualizada para v${nextVersao}.`,
  });
});

// 6. Criar nova pesquisa no servidor
app.post('/api/surveys', (req: Request, res: Response) => {
  const newSurveyData = req.body;
  const id = newSurveyData.id || `pesq_${Date.now()}`;

  const created: ServerSurvey = {
    ...newSurveyData,
    id,
    versao: 1,
    serverVersion: 1,
    criadaEm: newSurveyData.criadaEm || new Date().toISOString(),
    atualizadaEm: new Date().toISOString(),
    emAndamento: newSurveyData.status === 'ativa',
    submissionsCount: 0,
  };

  surveysStore.set(id, created);

  res.status(201).json({
    success: true,
    survey: created,
    message: 'Pesquisa criada com sucesso no servidor!',
  });
});

// -------------------------------------------------------------
// INTEGRAÇÃO COM O VITE (FRONTEND)
// -------------------------------------------------------------
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
