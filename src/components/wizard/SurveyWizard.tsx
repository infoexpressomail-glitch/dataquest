import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getCurrentSurveyDraftFromDB } from '../../utils/indexedDBStorage';
import {
  Survey,
  Question,
  QuestionOption,
  ConditionalRule,
  MetaTarget,
  QuestionType,
  ConditionOperator,
  ConditionActionType,
} from '../../types';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Plus,
  Trash2,
  GripVertical,
  MoveUp,
  MoveDown,
  Sparkles,
  GitBranch,
  Target,
  UserCheck,
  AlertCircle,
  HelpCircle,
  Eye,
  Check,
  RotateCcw,
  CloudOff,
  Wifi,
  WifiOff,
  Save,
  RefreshCw,
  Database,
  Server,
  ShieldCheck,
  Lock,
  ArrowUpCircle,
  FileSpreadsheet,
  Edit3,
  ChevronDown,
  ChevronUp,
  ListOrdered,
  X,
  Mic,
  Volume2,
  Clock,
} from 'lucide-react';
import { ServerSyncCheckModal } from './ServerSyncCheckModal';
import { QuestionnaireImportModal } from './QuestionnaireImportModal';

export const SurveyWizard: React.FC = () => {
  const {
    surveys,
    saveSurvey,
    editingSurvey,
    setEditingSurvey,
    collaborators,
    setActiveModule,
    effectiveOnline,
    offlineQueue,
    syncOfflineQueue,
    // Central Server Sync
    isSurveyInProgress,
    serverOnline,
    syncSurveyWithCentralServer,
    uploadSurveyChangesToCentralServer,
    // IndexedDB & Supabase Sync
    currentSurveyDraft,
    lastIndexedDBSave,
    supabaseSyncStatus,
    lastSupabaseSync,
    pendingIndexedDbCount,
    saveCurrentSurveyDraft,
    clearCurrentSurveyDraft,
    syncAllPendingWithSupabase,
    isSupabaseLive,
    lastAutoSyncNotice,
    setLastAutoSyncNotice,
  } = useApp();

  // Offline Draft Saved Banner State
  const [offlineDraftNotice, setOfflineDraftNotice] = useState<string | null>(null);
  const [draftRecoveryAvailable, setDraftRecoveryAvailable] = useState<boolean>(false);
  const [recoveredDraft, setRecoveredDraft] = useState<Survey | null>(null);

  // Central Server Sync State
  const [serverSyncModalOpen, setServerSyncModalOpen] = useState<boolean>(false);

  // Wizard active step 1 to 5
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State initialized from editingSurvey or clean default
  const [formData, setFormData] = useState<Survey>(() => {
    if (editingSurvey) return JSON.parse(JSON.stringify(editingSurvey));

    return {
      id: `pesq_${Date.now()}`,
      codigo: `PESQ-${new Date().getFullYear()}-${String(surveys.length + 1).padStart(2, '0')}`,
      nome: 'LiterArraial 2025 - Prefeitura',
      descricao: 'Dados sobre a percepção da Feira Literária.',
      status: 'ativa',
      habilitarColetaWeb: true,
      tipoColetaWeb: 'publico',
      colaboradorWebId: collaborators[0]?.id || '',
      pesquisadoresIds: collaborators.map((c) => c.id),
      cicloAtual: 1,
      versao: 1,
      criadaEm: new Date().toISOString(),
      atualizadaEm: new Date().toISOString(),
      habilitarGravacaoAudio: true,
      gravarAudioAPartirPerguntaId: '',
      tempoLimiteGravacaoMinutos: 2,
      perguntas: [
        {
          id: 'q_default_1',
          codigo: 'P01',
          enunciado: 'Você reside no município onde a feira literária está sendo realizada?',
          tipo: 'sim_nao',
          obrigatoria: true,
          ordem: 1,
          opcoes: [
            { id: 'opt_1', label: 'Sim, sou morador', value: 'Sim' },
            { id: 'opt_2', label: 'Não, sou visitante/turista', value: 'Não' },
          ],
        },
        {
          id: 'q_default_2',
          codigo: 'P02',
          enunciado: 'Qual a sua faixa etária?',
          tipo: 'multipla_escolha',
          obrigatoria: true,
          ordem: 2,
          opcoes: [
            { id: 'opt_fe1', label: '18 a 25 anos', value: '18 a 25 anos' },
            { id: 'opt_fe2', label: '26 a 40 anos', value: '26 a 40 anos' },
            { id: 'opt_fe3', label: '41 a 60 anos', value: '41 a 60 anos' },
            { id: 'opt_fe4', label: 'Acima de 60 anos', value: 'Acima de 60 anos' },
          ],
        },
      ],
      regras: [],
      metas: [],
    };
  });

  // Simulator test inside Wizard step 3
  const [simTestAnswer, setSimTestAnswer] = useState<Record<string, string>>({});

  // STEP 2 State: Add Question form
  const [newQuestionEnunciado, setNewQuestionEnunciado] = useState('');
  const [newQuestionTipo, setNewQuestionTipo] = useState<QuestionType>('multipla_escolha');
  const [newQuestionObrigatoria, setNewQuestionObrigatoria] = useState(true);
  const [newQuestionOpcoes, setNewQuestionOpcoes] = useState<string>('Opção 1, Opção 2, Opção 3');
  const [questionnaireImportModalOpen, setQuestionnaireImportModalOpen] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // STEP 3 State: Add Rule form
  const [ruleOrigemId, setRuleOrigemId] = useState<string>('');
  const [ruleCondicao, setRuleCondicao] = useState<ConditionOperator>('igual');
  const [ruleValor, setRuleValor] = useState<string>('');
  const [ruleAcao, setRuleAcao] = useState<ConditionActionType>('saltar_para');
  const [ruleDestinoId, setRuleDestinoId] = useState<string>('');

  // STEP 4 State: Add Meta form
  const [metaPerguntaId, setMetaPerguntaId] = useState<string>('');
  const [metaCondicao, setMetaCondicao] = useState<ConditionOperator>('igual');
  const [metaResposta, setMetaResposta] = useState<string>('');
  const [metaQuantidadeAlvo, setMetaQuantidadeAlvo] = useState<number>(100);

  // Success message modal / toast
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Helper to reorder questions
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...formData.perguntas];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;

    // update ordem numbers
    newQuestions.forEach((q, i) => {
      q.ordem = i + 1;
      q.codigo = `P${String(i + 1).padStart(2, '0')}`;
    });

    setFormData({ ...formData, perguntas: newQuestions });
  };

  const handleAddQuestion = () => {
    if (!newQuestionEnunciado.trim()) return;

    const nextOrder = formData.perguntas.length + 1;
    const newQ: Question = {
      id: `q_${Date.now()}`,
      codigo: `P${String(nextOrder).padStart(2, '0')}`,
      enunciado: newQuestionEnunciado.trim(),
      tipo: newQuestionTipo,
      obrigatoria: newQuestionObrigatoria,
      ordem: nextOrder,
    };

    if (
      newQuestionTipo === 'multipla_escolha' ||
      newQuestionTipo === 'multipla_selecao'
    ) {
      newQ.opcoes = newQuestionOpcoes
        .split(',')
        .map((opt) => opt.trim())
        .filter(Boolean)
        .map((opt, idx) => ({
          id: `opt_${Date.now()}_${idx}`,
          label: opt,
          value: opt,
        }));
    } else if (newQuestionTipo === 'sim_nao') {
      newQ.opcoes = [
        { id: `opt_s_${Date.now()}`, label: 'Sim', value: 'Sim' },
        { id: `opt_n_${Date.now()}`, label: 'Não', value: 'Não' },
      ];
    } else if (newQuestionTipo === 'escala_numerica') {
      newQ.escalaMin = 1;
      newQ.escalaMax = 5;
      newQ.escalaMinLabel = 'Muito Ruim';
      newQ.escalaMaxLabel = 'Excelente';
    } else if (newQuestionTipo === 'nps') {
      newQ.escalaMin = 0;
      newQ.escalaMax = 10;
      newQ.escalaMinLabel = 'Não Indicaria';
      newQ.escalaMaxLabel = 'Indicaria com Certeza';
    }

    setFormData({
      ...formData,
      perguntas: [...formData.perguntas, newQ],
    });

    setNewQuestionEnunciado('');
    setNewQuestionOpcoes('Opção 1, Opção 2, Opção 3');
  };

  const handleDeleteQuestion = (qId: string) => {
    const remaining = formData.perguntas.filter((q) => q.id !== qId);
    remaining.forEach((q, i) => {
      q.ordem = i + 1;
      q.codigo = `P${String(i + 1).padStart(2, '0')}`;
    });
    // also clean rules pointing to this question
    const remainingRules = formData.regras.filter(
      (r) => r.perguntaOrigemId !== qId && r.perguntaDestinoId !== qId
    );
    const remainingMetas = formData.metas.filter((m) => m.perguntaId !== qId);

    setFormData({
      ...formData,
      perguntas: remaining,
      regras: remainingRules,
      metas: remainingMetas,
    });
  };

  const handleImportQuestions = (imported: Question[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      setFormData((prev) => ({
        ...prev,
        perguntas: imported.map((q, idx) => ({
          ...q,
          ordem: idx + 1,
          codigo: q.codigo || `P${String(idx + 1).padStart(2, '0')}`,
        })),
        regras: [],
      }));
    } else {
      const existing = [...formData.perguntas];
      const startIdx = existing.length;
      const mapped = imported.map((q, idx) => ({
        ...q,
        ordem: startIdx + idx + 1,
        codigo: `P${String(startIdx + idx + 1).padStart(2, '0')}`,
      }));
      setFormData((prev) => ({
        ...prev,
        perguntas: [...existing, ...mapped],
      }));
    }
  };

  const handleUpdateQuestionType = (qId: string, newType: QuestionType) => {
    setFormData((prev) => {
      const updated = prev.perguntas.map((q) => {
        if (q.id !== qId) return q;
        const updatedQ = { ...q, tipo: newType };
        if (newType === 'sim_nao') {
          updatedQ.opcoes = [
            { id: `opt_s_${Date.now()}`, label: 'Sim', value: 'Sim' },
            { id: `opt_n_${Date.now()}`, label: 'Não', value: 'Não' },
          ];
        } else if (newType === 'escala_numerica') {
          updatedQ.escalaMin = 1;
          updatedQ.escalaMax = 5;
          updatedQ.escalaMinLabel = 'Péssimo';
          updatedQ.escalaMaxLabel = 'Excelente';
          if (!updatedQ.opcoes || updatedQ.opcoes.length === 0) {
            updatedQ.opcoes = [
              { id: `opt_${Date.now()}_1`, label: '1 - Péssimo', value: '1' },
              { id: `opt_${Date.now()}_2`, label: '2 - Ruim', value: '2' },
              { id: `opt_${Date.now()}_3`, label: '3 - Regular', value: '3' },
              { id: `opt_${Date.now()}_4`, label: '4 - Bom', value: '4' },
              { id: `opt_${Date.now()}_5`, label: '5 - Excelente', value: '5' },
            ];
          }
        } else if (newType === 'nps') {
          updatedQ.escalaMin = 0;
          updatedQ.escalaMax = 10;
          updatedQ.escalaMinLabel = 'Não Indicaria';
          updatedQ.escalaMaxLabel = 'Indicaria com Certeza';
          updatedQ.opcoes = undefined;
        } else if (newType === 'texto_aberto' || newType === 'data_hora') {
          updatedQ.opcoes = undefined;
        } else if (newType === 'multipla_escolha' || newType === 'multipla_selecao') {
          if (!updatedQ.opcoes || updatedQ.opcoes.length === 0) {
            updatedQ.opcoes = [
              { id: `opt_${Date.now()}_1`, label: 'Opção 1', value: 'Opção 1' },
              { id: `opt_${Date.now()}_2`, label: 'Opção 2', value: 'Opção 2' },
              { id: `opt_${Date.now()}_3`, label: 'Opção 3', value: 'Opção 3' },
            ];
          }
        }
        return updatedQ;
      });
      return { ...prev, perguntas: updated };
    });
  };

  const handleUpdateOptionLabel = (qId: string, optIndex: number, newLabel: string) => {
    setFormData((prev) => {
      const updated = prev.perguntas.map((q) => {
        if (q.id !== qId || !q.opcoes) return q;
        const newOpts = [...q.opcoes];
        newOpts[optIndex] = { ...newOpts[optIndex], label: newLabel, value: newLabel };
        return { ...q, opcoes: newOpts };
      });
      return { ...prev, perguntas: updated };
    });
  };

  const handleAddOptionToQuestion = (qId: string) => {
    setFormData((prev) => {
      const updated = prev.perguntas.map((q) => {
        if (q.id !== qId) return q;
        const currentOpts = q.opcoes || [];
        const newOptNum = currentOpts.length + 1;
        const newOpt: QuestionOption = {
          id: `opt_${Date.now()}_${newOptNum}`,
          label: `Nova Opção ${newOptNum}`,
          value: `Nova Opção ${newOptNum}`,
        };
        return { ...q, opcoes: [...currentOpts, newOpt] };
      });
      return { ...prev, perguntas: updated };
    });
  };

  const handleDeleteOptionFromQuestion = (qId: string, optIndex: number) => {
    setFormData((prev) => {
      const updated = prev.perguntas.map((q) => {
        if (q.id !== qId || !q.opcoes) return q;
        return { ...q, opcoes: q.opcoes.filter((_, idx) => idx !== optIndex) };
      });
      return { ...prev, perguntas: updated };
    });
  };

  const toggleAudioStartQuestion = (questionId: string) => {
    const isCurrentlyStartingHere =
      formData.gravarAudioAPartirPerguntaId === questionId;
    const newStartId = isCurrentlyStartingHere ? '' : questionId;

    setFormData((prev) => ({
      ...prev,
      gravarAudioAPartirPerguntaId: newStartId,
      perguntas: prev.perguntas.map((q) => ({
        ...q,
        iniciarGravacaoAqui: q.id === newStartId,
      })),
    }));
  };

  const handleAddRule = () => {
    if (!ruleOrigemId || !ruleValor.trim()) {
      alert('Selecione a pergunta de origem e a resposta de comparação.');
      return;
    }
    if (
      (ruleAcao === 'saltar_para' || ruleAcao === 'esconder_pergunta') &&
      !ruleDestinoId
    ) {
      alert('Selecione a pergunta de destino para a ação.');
      return;
    }

    const qOrigem = formData.perguntas.find((q) => q.id === ruleOrigemId);
    const qDestino = formData.perguntas.find((q) => q.id === ruleDestinoId);

    const desc =
      ruleAcao === 'finalizar_formulario'
        ? `Se ${qOrigem?.codigo} for ${ruleCondicao} a "${ruleValor}", Finalizar formulário`
        : `Se ${qOrigem?.codigo} for ${ruleCondicao} a "${ruleValor}", ${
            ruleAcao === 'saltar_para' ? 'Saltar para' : 'Esconder'
          } ${qDestino?.codigo || 'pergunta'}`;

    const newRule: ConditionalRule = {
      id: `regra_${Date.now()}`,
      perguntaOrigemId: ruleOrigemId,
      condicao: ruleCondicao,
      valorComparacao: ruleValor.trim(),
      acao: ruleAcao,
      perguntaDestinoId: ruleDestinoId || undefined,
      descricao: desc,
    };

    setFormData({
      ...formData,
      regras: [...formData.regras, newRule],
    });

    setRuleValor('');
  };

  const handleDeleteRule = (ruleId: string) => {
    setFormData({
      ...formData,
      regras: formData.regras.filter((r) => r.id !== ruleId),
    });
  };

  const handleAddMeta = () => {
    if (!metaPerguntaId || !metaResposta.trim()) {
      alert('Selecione a questão e informe a resposta para a meta.');
      return;
    }

    const newMeta: MetaTarget = {
      id: `meta_${Date.now()}`,
      pesquisaId: formData.id,
      perguntaId: metaPerguntaId,
      condicao: metaCondicao,
      resposta: metaResposta.trim(),
      quantidadeAlvo: Number(metaQuantidadeAlvo) || 50,
      quantidadeAtingida: 0,
      ciclo: `Ciclo ${formData.cicloAtual} - ${new Date().getFullYear()}`,
    };

    setFormData({
      ...formData,
      metas: [...formData.metas, newMeta],
    });

    setMetaResposta('');
  };

  const handleDeleteMeta = (metaId: string) => {
    setFormData({
      ...formData,
      metas: formData.metas.filter((m) => m.id !== metaId),
    });
  };

  const toggleResearcher = (colabId: string) => {
    const exists = formData.pesquisadoresIds.includes(colabId);
    const updated = exists
      ? formData.pesquisadoresIds.filter((id) => id !== colabId)
      : [...formData.pesquisadoresIds, colabId];

    setFormData({ ...formData, pesquisadoresIds: updated });
  };

  // Check for previous cached draft in IndexedDB
  useEffect(() => {
    getCurrentSurveyDraftFromDB()
      .then((cached) => {
        if (cached && cached.survey && !editingSurvey) {
          if (cached.survey.id !== formData.id && cached.survey.nome) {
            setRecoveredDraft(cached.survey);
            setDraftRecoveryAvailable(true);
          }
        }
      })
      .catch((err) => console.warn('Erro ao verificar rascunho:', err));
  }, [editingSurvey]);

  // Debounced auto-save of current survey state to IndexedDB cache
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData && formData.nome && formData.nome.trim()) {
        saveCurrentSurveyDraft(formData, currentStep);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [formData, currentStep]);

  // Central Server Sync Governance Check
  const isInProgress = isSurveyInProgress(formData) || (editingSurvey ? isSurveyInProgress(editingSurvey) : false);
  const initialSnapshotRef = React.useRef<string>(JSON.stringify(editingSurvey || formData));
  const hasLocalModifications = React.useMemo(() => {
    try {
      return JSON.stringify(formData) !== initialSnapshotRef.current;
    } catch {
      return false;
    }
  }, [formData]);

  const handleFinishWizard = async () => {
    if (!formData.nome.trim()) {
      alert('Por favor, informe o nome da pesquisa.');
      setCurrentStep(1);
      return;
    }
    if (formData.perguntas.length === 0) {
      alert('Adicione pelo menos uma pergunta ao questionário.');
      setCurrentStep(2);
      return;
    }
    if (formData.pesquisadoresIds.length === 0) {
      alert('Selecione ao menos um pesquisador para atuar na pesquisa.');
      setCurrentStep(5);
      return;
    }

    // REGRA DE GOVERNANÇA: Pesquisa em andamento exige sincronização prévia antes de subir qualquer alteração!
    if (isInProgress && !formData.serverSyncToken) {
      setServerSyncModalOpen(true);
      return;
    }

    if (isInProgress && formData.serverSyncToken && effectiveOnline) {
      const uploadRes = await uploadSurveyChangesToCentralServer(formData, formData.serverSyncToken);
      if (!uploadRes.success && uploadRes.requiresSync) {
        setServerSyncModalOpen(true);
        return;
      }
    } else {
      saveSurvey(formData);
    }

    clearCurrentSurveyDraft();
    setSaveSuccess(true);
  };

  const handleSaveDraftOffline = () => {
    if (!formData.nome.trim()) {
      alert('Por favor, informe pelo menos o nome da pesquisa para salvar.');
      return;
    }
    saveCurrentSurveyDraft(formData, currentStep);
    saveSurvey(formData);
    setOfflineDraftNotice(
      !effectiveOnline
        ? `Pesquisa "${formData.nome}" salva no cache IndexedDB e enfileirada para sincronização!`
        : `Pesquisa "${formData.nome}" salva e sincronizada com o Supabase!`
    );
    setTimeout(() => setOfflineDraftNotice(null), 5000);
  };

  // Tab Header definitions as seen in Screenshot 1
  const tabs = [
    { step: 1, title: '1. Dados e Configurações Gerais' },
    { step: 2, title: '2. Perguntas' },
    { step: 3, title: '3. Pulos, Saltos e Regras' },
    { step: 4, title: '4. Consistência' },
    { step: 5, title: '5. Pesquisadores' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header matching Screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
            Wizard de criação de pesquisa
          </h1>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <span
              onClick={() => setActiveModule('home')}
              className="cursor-pointer hover:text-accent-primary hover:underline"
            >
              Home
            </span>
            <span>/</span>
            <span
              onClick={() => setActiveModule('pesquisas')}
              className="cursor-pointer hover:text-accent-primary hover:underline"
            >
              Nova Pesquisa
            </span>
            <span>/</span>
            <span className="font-semibold text-primary">
              Wizard
            </span>
          </div>
        </div>

        {/* Status badges & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* IndexedDB Status Badge */}
          <div
            className="flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-2.5 py-1.5 text-[11px] font-medium text-secondary"
            title="Gerenciador de cache IndexedDB ativo no navegador"
          >
            <Database className="h-3.5 w-3.5 text-accent-success shrink-0" />
            <span>
              Cache IndexedDB: <strong className="text-primary">{lastIndexedDBSave ? new Date(lastIndexedDBSave).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Ativo'}</strong>
            </span>
          </div>

          {/* Supabase Sync Badge */}
          <div
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition ${
              supabaseSyncStatus === 'syncing'
                ? 'border-accent-primary-soft-border bg-accent-primary-soft text-accent-primary'
                : !effectiveOnline || supabaseSyncStatus === 'pending'
                ? 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning'
                : 'border-accent-success-soft-border bg-accent-success-soft text-accent-success'
            }`}
            title="Status de sincronização com o banco central Supabase"
          >
            {supabaseSyncStatus === 'syncing' ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent-primary" />
                <span>Supabase: Sincronizando...</span>
              </>
            ) : !effectiveOnline || supabaseSyncStatus === 'pending' ? (
              <>
                <CloudOff className="h-3.5 w-3.5 text-accent-warning" />
                <span>Supabase: Pendente (Offline)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-accent-success" />
                <span>Supabase: Sincronizado {lastSupabaseSync ? `(${lastSupabaseSync})` : ''}</span>
              </>
            )}
          </div>

          {/* Force Sync button if online and pending */}
          {effectiveOnline && (supabaseSyncStatus === 'pending' || pendingIndexedDbCount > 0) && (
            <button
              type="button"
              id="btn-sync-supabase-now"
              onClick={async () => {
                const res = await syncAllPendingWithSupabase();
                setOfflineDraftNotice(res.message);
                setTimeout(() => setOfflineDraftNotice(null), 5000);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-accent-primary-solid px-3 py-1.5 text-xs font-bold text-on-accent hover:bg-accent-primary-solid-hover transition shadow-xs"
              title="Forçar sincronização das alterações locais para o Supabase"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sincronizar Supabase</span>
            </button>
          )}

          {/* Central Server Sync Status / Trigger Button */}
          <button
            type="button"
            id="btn-trigger-server-sync-header"
            onClick={() => setServerSyncModalOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-xs ${
              formData.serverSyncToken
                ? 'border-accent-success-soft-border bg-accent-success-soft text-accent-success hover:bg-accent-success-soft'
                : isInProgress
                ? 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning hover:bg-accent-warning-soft animate-pulse'
                : 'border-ui bg-surface-raised text-secondary hover:bg-surface-hover hover:text-primary'
            }`}
            title="Sincronização obrigatória com o servidor para pesquisas em andamento antes de subir alterações"
          >
            <Server className="h-3.5 w-3.5" />
            <span>
              {formData.serverSyncToken
                ? 'Servidor: Autorizado'
                : isInProgress
                ? 'Sincronizar com Servidor (Obrigatório)'
                : 'Servidor Central'}
            </span>
          </button>

          {/* Quick Offline Draft Save button at header */}
          <button
            type="button"
            id="btn-wizard-save-draft-top"
            onClick={handleSaveDraftOffline}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition shadow-xs ${
              !effectiveOnline
                ? 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning hover:bg-accent-warning-soft'
                : 'border-ui bg-surface-raised text-primary hover:bg-surface-hover hover:text-primary'
            }`}
            title="Salvar pesquisa atual no estado atual (online ou offline)"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{!effectiveOnline ? 'Salvar Pesquisa (Offline)' : 'Salvar Rascunho'}</span>
          </button>
        </div>
      </div>

      {/* Recoverable Draft Alert Banner */}
      {draftRecoveryAvailable && recoveredDraft && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-3.5 text-xs text-accent-primary-soft-text shadow-md">
          <div className="flex items-center gap-2.5">
            <Database className="h-4 w-4 shrink-0 text-accent-primary" />
            <div>
              <span className="font-bold text-primary">Rascunho recuperado do IndexedDB:</span> Encontramos a pesquisa "{recoveredDraft.nome}" ({recoveredDraft.perguntas.length} questões) salva localmente em cache offline. Deseja restaurá-la?
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setFormData(recoveredDraft);
                setDraftRecoveryAvailable(false);
                setOfflineDraftNotice(`Rascunho de "${recoveredDraft.nome}" recuperado do IndexedDB com sucesso!`);
                setTimeout(() => setOfflineDraftNotice(null), 4000);
              }}
              className="rounded-lg bg-accent-primary-solid px-3 py-1.5 font-bold text-on-accent hover:bg-accent-primary-solid-hover transition shadow-xs"
            >
              Restaurar Rascunho
            </button>
            <button
              type="button"
              onClick={() => {
                clearCurrentSurveyDraft();
                setDraftRecoveryAvailable(false);
              }}
              className="rounded-lg border border-ui bg-surface-raised px-2.5 py-1.5 text-secondary hover:text-primary transition"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* In-Progress Survey Central Server Sync Required Banner */}
      {isInProgress && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-4 text-xs text-accent-primary-soft-text shadow-lg">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary-soft border border-accent-primary-soft-border text-accent-primary">
              <Server className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary text-sm">Pesquisa em Andamento no Servidor Central</span>
                <span className="rounded bg-accent-warning-soft border border-accent-warning-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-warning">
                  {formData.serverSyncToken ? 'Autorizado para Subir' : 'Sincronização Prévia Obrigatória'}
                </span>
                <span className="rounded bg-surface-raised border border-ui px-1.5 py-0.5 text-[10px] font-mono text-secondary">
                  v{formData.versao}
                </span>
              </div>
              <p className="mt-1 text-secondary text-xs leading-relaxed">
                {formData.serverSyncToken ? (
                  <span className="text-accent-success font-medium">
                    ✓ Sincronização prévia concluída com sucesso! Token: <code className="bg-accent-success-soft px-1 py-0.5 rounded text-[11px]">{formData.serverSyncToken}</code>. Você pode subir as alterações com segurança.
                  </span>
                ) : (
                  <span>
                    Esta pesquisa está ativa e coletando entrevistas. Para alterar ou ajustar qualquer parte (perguntas, saltos, metas ou pesquisadores), <strong>é obrigatório sincronizar previamente com o servidor</strong> antes de subir qualquer alteração.
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0">
            {formData.serverSyncToken ? (
              <button
                type="button"
                id="btn-open-sync-status-modal"
                onClick={() => setServerSyncModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-accent-success-solid hover:bg-accent-success-solid-hover text-on-accent font-bold px-3.5 py-2 text-xs transition shadow-md shadow-emerald-600/20"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Pronto para Subir Alterações</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-sync-server-banner"
                onClick={() => setServerSyncModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-accent-warning-solid hover:bg-accent-warning-solid-hover text-on-warning font-bold px-4 py-2 text-xs transition shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Sincronizar com Servidor antes de Subir</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Auto-Sync Alert Banner */}
      {lastAutoSyncNotice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-accent-success-soft-border bg-accent-success-soft px-4 py-3 text-xs text-accent-success shadow-md animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-success" />
            <div>
              <span className="font-bold">Auto-Sync Supabase:</span> {lastAutoSyncNotice}
            </div>
          </div>
          <button
            onClick={() => setLastAutoSyncNotice(null)}
            className="text-xs text-accent-success hover:text-primary"
          >
            ✕
          </button>
        </div>
      )}

      {/* Offline Alert Banner */}
      {!effectiveOnline && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-accent-warning-soft-border bg-accent-warning-soft px-4 py-3 text-xs text-accent-warning shadow-md">
          <div className="flex items-center gap-2.5">
            <CloudOff className="h-4 w-4 shrink-0 text-accent-warning" />
            <div>
              <span className="font-bold">Modo Offline Ativo:</span> Você pode preencher, configurar e salvar a pesquisa corrente mesmo sem conexão com a internet. Ela ficará armazenada com segurança no dispositivo e poderá ser enviada ao servidor assim que reconectar.
            </div>
          </div>
          {offlineQueue.length > 0 && (
            <span className="rounded bg-accent-warning-soft border border-accent-warning-soft-border px-2.5 py-1 text-[11px] font-bold text-accent-warning-soft-text shrink-0">
              {offlineQueue.length} na fila
            </span>
          )}
        </div>
      )}

      {/* Draft Notification Toast */}
      {offlineDraftNotice && (
        <div className="rounded-xl border border-accent-success-soft-border bg-accent-success-soft p-3 text-xs text-accent-success flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-success" />
            <span>{offlineDraftNotice}</span>
          </div>
          <button
            onClick={() => setOfflineDraftNotice(null)}
            className="text-xs text-accent-success hover:text-primary"
          >
            ✕
          </button>
        </div>
      )}

      {/* Wizard Step Tabs matching Screenshot 1 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ui pb-3">
        {tabs.map((tab) => {
          const isActive = currentStep === tab.step;
          return (
            <button
              key={tab.step}
              id={`wizard-tab-step-${tab.step}`}
              onClick={() => setCurrentStep(tab.step)}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-accent-primary-solid text-on-accent shadow-lg shadow-blue-900/40 ring-2 ring-blue-500/30'
                  : 'border border-ui bg-surface text-secondary hover:bg-surface-raised hover:text-primary'
              }`}
            >
              {tab.title}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DADOS E CONFIGURAÇÕES GERAIS (Matching Screenshot 2) */}
      {currentStep === 1 && (
        <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
          <h2 className="text-lg font-bold text-primary">
            Informe aqui o nome, descrição e configurações da pesquisa
          </h2>

          <div className="mt-6 space-y-6 max-w-3xl">
            {/* Nome da pesquisa * */}
            <div>
              <label
                htmlFor="input-survey-name"
                className="block text-xs font-bold text-secondary"
              >
                Nome da pesquisa *
              </label>
              <input
                id="input-survey-name"
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: LiterArraial 2025 - Prefeitura"
                className="mt-1.5 w-full rounded-lg border border-ui bg-surface-card px-3.5 py-2 text-xs text-primary placeholder-slate-500 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Descrição da pesquisa */}
            <div>
              <label
                htmlFor="input-survey-description"
                className="block text-xs font-bold text-secondary"
              >
                Descrição da pesquisa
              </label>
              <textarea
                id="input-survey-description"
                rows={3}
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Dados sobre a percepção da Feira Literária."
                className="mt-1.5 w-full rounded-lg border border-ui bg-surface-card px-3.5 py-2 text-xs text-primary placeholder-slate-500 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Habilitar Coleta Web Switch */}
            <div className="border-t border-ui pt-5">
              <div className="flex items-center gap-3">
                <button
                  id="switch-habilitar-coleta-web"
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      habilitarColetaWeb: !formData.habilitarColetaWeb,
                    })
                  }
                  aria-checked={formData.habilitarColetaWeb}
                  role="switch"
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.habilitarColetaWeb ? 'bg-accent-primary-solid' : 'bg-surface-raised'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      formData.habilitarColetaWeb ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs font-bold text-primary">
                  Habilitar Coleta Web
                </span>
              </div>

              {formData.habilitarColetaWeb && (
                <div className="mt-4 space-y-4 pl-2">
                  {/* Radio buttons for Coleta Web */}
                  <div className="space-y-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoColetaWeb"
                        checked={formData.tipoColetaWeb === 'publico'}
                        onChange={() =>
                          setFormData({ ...formData, tipoColetaWeb: 'publico' })
                        }
                        className="mt-1 h-4 w-4 text-accent-primary-solid focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-primary">
                          Acesso público
                        </span>
                        <span className="ml-1.5 text-xs text-muted">
                          link público sem a necessidade de autenticação
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoColetaWeb"
                        checked={formData.tipoColetaWeb === 'interno'}
                        onChange={() =>
                          setFormData({ ...formData, tipoColetaWeb: 'interno' })
                        }
                        className="mt-1 h-4 w-4 text-accent-primary-solid focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-primary">
                          Acesso interno
                        </span>
                        <span className="ml-1.5 text-xs text-muted">
                          o acesso é feito pelo pesquisador através da sua autenticação
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Atribuição do pesquisador web */}
                  <div className="pt-2">
                    <label
                      htmlFor="select-web-researcher"
                      className="block text-xs font-bold text-secondary leading-snug"
                    >
                      Informe o Pesquisador para atribuir os registros das coletas WEB para identificá-los na exportação das coletas
                    </label>
                    <select
                      id="select-web-researcher"
                      value={formData.colaboradorWebId || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, colaboradorWebId: e.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-ui bg-surface-card px-3.5 py-2 text-xs text-primary shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Selecione o colaborador para registro das coletas web</option>
                      {collaborators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({c.login}) - CPF: {c.cpf}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Configurações de Gravação de Áudio de Campo */}
            <div className="border-t border-ui pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    id="switch-habilitar-gravacao-audio"
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        habilitarGravacaoAudio: formData.habilitarGravacaoAudio === false ? true : false,
                      })
                    }
                    aria-checked={formData.habilitarGravacaoAudio !== false}
                    role="switch"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.habilitarGravacaoAudio !== false ? 'bg-accent-purple-solid' : 'bg-surface-raised'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        formData.habilitarGravacaoAudio !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div>
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Mic className="h-4 w-4 text-accent-purple" />
                      Gravação de Áudio da Entrevista
                    </span>
                    <span className="text-[11px] text-muted">
                      Registra o áudio das entrevistas em campo para auditoria e controle de qualidade
                    </span>
                  </div>
                </div>

                <span className="rounded-full bg-accent-purple-soft border border-accent-purple-soft-border px-2.5 py-0.5 text-[10px] font-bold text-accent-purple">
                  {formData.habilitarGravacaoAudio !== false ? 'Ativado' : 'Desativado'}
                </span>
              </div>

              {formData.habilitarGravacaoAudio !== false && (
                <div className="rounded-xl border border-accent-purple-soft-border bg-accent-purple-soft p-4 space-y-4">
                  {/* Pergunta de Início da Gravação */}
                  <div>
                    <label
                      htmlFor="select-audio-start-question"
                      className="block text-xs font-bold text-primary"
                    >
                      Ponto de Início da Gravação (Pergunta a partir de onde será gravada)
                    </label>
                    <p className="text-[11px] text-muted mt-0.5">
                      Selecione a pergunta em que o áudio começará a ser capturado. Se não selecionada, inicia na Pergunta 1.
                    </p>
                    <select
                      id="select-audio-start-question"
                      value={formData.gravarAudioAPartirPerguntaId || ''}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        setFormData({
                          ...formData,
                          gravarAudioAPartirPerguntaId: targetId,
                          perguntas: formData.perguntas.map((q) => ({
                            ...q,
                            iniciarGravacaoAqui: q.id === targetId,
                          })),
                        });
                      }}
                      className="mt-2 w-full rounded-lg border border-ui bg-surface-card px-3.5 py-2 text-xs text-primary shadow-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Desde o Início da Entrevista (Pergunta 01 - Padrão)</option>
                      {formData.perguntas.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.codigo} - {q.enunciado.slice(0, 70)}...
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tempo Limite de Gravação */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-accent-info" />
                        Tempo Limite de Gravação de Áudio:
                      </label>
                      <span className="font-mono text-xs font-bold text-accent-info">
                        {formData.tempoLimiteGravacaoMinutos || 2} minuto(s)
                        {(formData.tempoLimiteGravacaoMinutos || 2) === 2 && (
                          <span className="ml-1.5 text-[10px] text-muted font-normal">
                            (Padrão do Sistema)
                          </span>
                        )}
                        {(formData.tempoLimiteGravacaoMinutos || 2) === 10 && (
                          <span className="ml-1.5 text-[10px] text-accent-warning font-normal">
                            (Tempo Máximo)
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={formData.tempoLimiteGravacaoMinutos || 2}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tempoLimiteGravacaoMinutos: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full h-1.5 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    {/* Botões rápidos de minutos */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((min) => {
                        const isSelected = (formData.tempoLimiteGravacaoMinutos || 2) === min;
                        return (
                          <button
                            key={min}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                tempoLimiteGravacaoMinutos: min,
                              })
                            }
                            className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                              isSelected
                                ? 'bg-accent-purple-solid text-on-accent shadow-xs'
                                : 'bg-surface-raised text-muted hover:text-primary hover:bg-surface-hover'
                            }`}
                          >
                            {min} min{min === 2 ? ' (Padrão)' : min === 10 ? ' (Máx)' : ''}
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-2 text-[10px] text-muted">
                      * O sistema grava por padrão <strong>2 minutos</strong> quando não especificado, com limite máximo de <strong>10 minutos</strong>. O tempo é ajustável individualmente para cada pesquisa.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERGUNTAS (Com ordenação, tipos de dados e personalização) */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-primary">
                  Gerenciamento de Perguntas e Respostas
                </h2>
                <p className="text-xs text-muted">
                  Adicione perguntas, importe questionários estruturados e organize ou altere o tipo das alternativas facilmente.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  id="btn-open-questionnaire-import"
                  onClick={() => setQuestionnaireImportModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-accent-primary-soft border border-accent-primary-soft-border px-3.5 py-1.5 text-xs font-bold text-accent-primary shadow-sm hover:bg-accent-primary-solid-hover hover:text-on-accent transition active:scale-95"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Importar Questionário</span>
                </button>
                <span className="rounded-md border border-ui bg-surface-card px-2.5 py-1 text-xs font-bold text-secondary">
                  {formData.perguntas.length} pergunta(s)
                </span>
              </div>
            </div>

            {/* List of existing questions */}
            <div className="mt-6 space-y-3">
              {formData.perguntas.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-ui bg-surface-card p-4 transition hover:border-ui">
                    <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center justify-center gap-1 pt-1 text-muted">
                      <button
                        onClick={() => moveQuestion(idx, 'up')}
                        disabled={idx === 0}
                        title="Subir posição"
                        className="rounded p-1 hover:bg-surface-raised hover:text-primary disabled:opacity-30 transition-colors"
                      >
                        <MoveUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveQuestion(idx, 'down')}
                        disabled={idx === formData.perguntas.length - 1}
                        title="Descer posição"
                        className="rounded p-1 hover:bg-surface-raised hover:text-primary disabled:opacity-30 transition-colors"
                      >
                        <MoveDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-accent-primary-soft-border bg-accent-primary-soft px-2 py-0.5 text-[10px] font-bold text-accent-primary">
                          {q.codigo}
                        </span>
                        <span className="rounded border border-ui bg-surface px-2 py-0.5 text-[10px] font-medium text-secondary">
                          {q.tipo.replace('_', ' ').toUpperCase()}
                        </span>
                        {q.obrigatoria && (
                          <span className="text-[10px] font-semibold text-accent-danger">
                            * Obrigatória
                          </span>
                        )}
                        {(formData.gravarAudioAPartirPerguntaId === q.id || q.iniciarGravacaoAqui) && (
                          <span className="inline-flex items-center gap-1 rounded border border-accent-success-soft-border bg-accent-success-soft px-2 py-0.5 text-[10px] font-bold text-accent-success">
                            <Mic className="h-3 w-3" />
                            Início da Gravação
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-xs font-semibold text-primary">
                        {q.enunciado}
                      </div>

                      {/* Options preview */}
                      {q.opcoes && q.opcoes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {q.opcoes.map((opt) => (
                            <span
                              key={opt.id}
                              className="rounded-md border border-ui bg-surface px-2 py-0.5 text-[11px] text-secondary"
                            >
                              • {opt.label}
                            </span>
                          ))}
                        </div>
                      )}

                      {q.tipo === 'escala_numerica' && (
                        <div className="mt-1 text-xs text-muted">
                          Escala: {q.escalaMin} ({q.escalaMinLabel}) até {q.escalaMax} ({q.escalaMaxLabel})
                        </div>
                      )}

                      {q.tipo === 'nps' && (
                        <div className="mt-1 text-xs text-muted">
                          Escala NPS: 0 a 10 (Detratores, Neutros, Promotores)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleAudioStartQuestion(q.id)}
                      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                        formData.gravarAudioAPartirPerguntaId === q.id || q.iniciarGravacaoAqui
                          ? 'border-accent-success-soft-border bg-accent-success-soft text-accent-success hover:bg-accent-success-soft shadow-xs'
                          : 'border-ui bg-surface-raised text-muted hover:text-primary hover:bg-surface-hover'
                      }`}
                      title="Definir esta pergunta como ponto onde a gravação de áudio da entrevista será acionada"
                    >
                      <Mic className="h-3 w-3" />
                      <span>
                        {formData.gravarAudioAPartirPerguntaId === q.id || q.iniciarGravacaoAqui
                          ? 'Início do Áudio'
                          : 'Gravar a partir daqui'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id)}
                      className="flex items-center gap-1 rounded-lg border border-ui bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-accent-primary hover:bg-surface-hover hover:text-accent-primary transition"
                      title="Alterar tipo da questão ou gerenciar alternativas"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>{expandedQuestionId === q.id ? 'Fechar' : 'Alterar Tipo / Alternativas'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      title="Excluir pergunta"
                      className="rounded-lg p-1.5 text-muted hover:bg-accent-danger-soft hover:text-accent-danger transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Type & Alternatives Editor for imported or created questions */}
                {expandedQuestionId === q.id && (
                  <div className="mt-2 rounded-xl border border-accent-primary-soft-border bg-surface-app p-4 space-y-3 shadow-inner">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ui pb-2.5">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-secondary">
                          Alterar Tipo de Resposta:
                        </label>
                        <select
                          value={q.tipo}
                          onChange={(e) => handleUpdateQuestionType(q.id, e.target.value as QuestionType)}
                          className="rounded-lg border border-accent-primary-soft-border bg-surface px-3 py-1.5 text-xs font-bold text-accent-primary focus:border-blue-400 focus:outline-none cursor-pointer"
                        >
                          <option value="multipla_escolha">Múltipla Escolha (Opção Única)</option>
                          <option value="multipla_selecao">Múltipla Seleção (Várias Opções)</option>
                          <option value="texto_aberto">Texto Aberto</option>
                          <option value="escala_numerica">Escala Numérica (1 a 5)</option>
                          <option value="nps">NPS (Escala 0 a 10)</option>
                          <option value="sim_nao">Sim / Não</option>
                          <option value="data_hora">Data / Hora</option>
                        </select>
                      </div>

                      {(q.tipo === 'multipla_escolha' ||
                        q.tipo === 'multipla_selecao' ||
                        q.tipo === 'sim_nao' ||
                        q.tipo === 'escala_numerica') && (
                        <button
                          type="button"
                          onClick={() => handleAddOptionToQuestion(q.id)}
                          className="flex items-center gap-1 rounded-md bg-accent-primary-soft border border-accent-primary-soft-border px-2.5 py-1 text-[11px] font-bold text-accent-primary hover:bg-accent-primary-soft transition"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Adicionar Alternativa</span>
                        </button>
                      )}
                    </div>

                    {/* Alternativas da questão */}
                    {(q.tipo === 'multipla_escolha' ||
                      q.tipo === 'multipla_selecao' ||
                      q.tipo === 'sim_nao' ||
                      q.tipo === 'escala_numerica') && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                          Alternativas Configuradas ({q.opcoes?.length || 0}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.opcoes || []).map((opt, optIdx) => (
                            <div
                              key={opt.id || optIdx}
                              className="flex items-center gap-2 rounded-lg border border-ui bg-surface px-2.5 py-1.5"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[10px] font-bold text-muted">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <input
                                type="text"
                                value={opt.label}
                                onChange={(e) =>
                                  handleUpdateOptionLabel(q.id, optIdx, e.target.value)
                                }
                                className="flex-1 bg-transparent text-xs text-primary focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteOptionFromQuestion(q.id, optIdx)}
                                className="text-muted hover:text-accent-danger transition"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            </div>

            {/* Form to add a new question */}
            <div className="mt-8 rounded-xl border border-dashed border-ui bg-surface-card/60 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                + Adicionar Nova Pergunta ao Questionário
              </h3>

              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-secondary">
                    Enunciado da Pergunta *
                  </label>
                  <input
                    type="text"
                    value={newQuestionEnunciado}
                    onChange={(e) => setNewQuestionEnunciado(e.target.value)}
                    placeholder="Ex: Como você avalia a qualidade do atendimento?"
                    className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-2 text-xs text-primary placeholder-slate-500 shadow-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary">
                    Tipo de Dado da Resposta
                  </label>
                  <select
                    value={newQuestionTipo}
                    onChange={(e) => setNewQuestionTipo(e.target.value as QuestionType)}
                    className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-2 text-xs text-primary shadow-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="multipla_escolha">Múltipla Escolha (Opção Única)</option>
                    <option value="multipla_selecao">Múltipla Seleção (Várias Opções)</option>
                    <option value="texto_aberto">Texto Aberto</option>
                    <option value="escala_numerica">Escala Numérica (1 a 5)</option>
                    <option value="nps">NPS (Escala 0 a 10)</option>
                    <option value="sim_nao">Sim / Não</option>
                    <option value="data_hora">Data / Hora</option>
                  </select>
                </div>
              </div>

              {(newQuestionTipo === 'multipla_escolha' ||
                newQuestionTipo === 'multipla_selecao') && (
                <div className="mt-3">
                  <label className="block text-xs font-bold text-secondary">
                    Opções de Resposta (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={newQuestionOpcoes}
                    onChange={(e) => setNewQuestionOpcoes(e.target.value)}
                    placeholder="Opção A, Opção B, Opção C"
                    className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-2 text-xs text-primary placeholder-slate-500 shadow-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newQuestionObrigatoria}
                    onChange={(e) => setNewQuestionObrigatoria(e.target.checked)}
                    className="rounded text-accent-primary-solid focus:ring-blue-500"
                  />
                  <span>Resposta Obrigatória</span>
                </label>

                <button
                  type="button"
                  id="btn-add-question-to-survey"
                  onClick={handleAddQuestion}
                  disabled={!newQuestionEnunciado.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 hover:bg-accent-primary-solid-hover disabled:opacity-40 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Inserir Pergunta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PULOS, SALTOS E REGRAS (Lógica condicional completa) */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
            <div>
              <h2 className="text-lg font-bold text-primary">
                Pulos, Saltos e Regras Condicionais
              </h2>
              <p className="text-xs text-muted">
                Defina o fluxo inteligente do questionário: pule para perguntas específicas, esconda perguntas irrelevantes ou finalize o formulário conforme a resposta anterior.
              </p>
            </div>

            {/* Existing rules table */}
            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Regras Cadastradas ({formData.regras.length})
              </h3>

              {formData.regras.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ui p-4 text-center text-xs text-muted">
                  Nenhuma regra de salto condicional definida. O questionário seguirá em ordem linear.
                </div>
              ) : (
                <div className="divide-y divide-ui rounded-xl border border-ui bg-surface-card">
                  {formData.regras.map((regra) => {
                    const qOrigem = formData.perguntas.find((q) => q.id === regra.perguntaOrigemId);
                    const qDest = formData.perguntas.find((q) => q.id === regra.perguntaDestinoId);

                    return (
                      <div
                        key={regra.id}
                        className="flex items-center justify-between p-3.5 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <GitBranch className="h-4 w-4 text-accent-primary shrink-0" />
                          <div>
                            <span className="font-bold text-primary">
                              Se {qOrigem?.codigo || 'Pergunta'} ({qOrigem?.enunciado.slice(0, 30)}...)
                            </span>
                            <span className="mx-1 text-muted font-semibold">
                              {regra.condicao.toUpperCase()}
                            </span>
                            <span className="rounded border border-ui bg-surface px-1.5 py-0.5 font-bold text-primary">
                              "{regra.valorComparacao}"
                            </span>
                            <span className="mx-1 text-muted">➔</span>
                            <span
                              className={`font-semibold rounded border px-2 py-0.5 ${
                                regra.acao === 'saltar_para'
                                  ? 'border-accent-primary-soft-border bg-accent-primary-soft text-accent-primary'
                                  : regra.acao === 'esconder_pergunta'
                                  ? 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning'
                                  : 'border-accent-danger-soft-border bg-accent-danger-soft text-accent-danger'
                              }`}
                            >
                              {regra.acao === 'saltar_para' && `Saltar para ${qDest?.codigo || ''}`}
                              {regra.acao === 'esconder_pergunta' && `Esconder ${qDest?.codigo || ''}`}
                              {regra.acao === 'finalizar_formulario' && 'Finalizar Formulário'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteRule(regra.id)}
                          className="text-muted hover:text-accent-danger transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add new rule form (Exact fields requested) */}
            <div className="mt-8 rounded-xl border border-ui bg-surface-card p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                + Nova Regra de Salto / Condicional
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Pergunta (caixa de seleção) */}
                <div>
                  <label className="block text-xs font-bold text-secondary">
                    Pergunta Anterior
                  </label>
                  <select
                    id="select-rule-origem"
                    value={ruleOrigemId}
                    onChange={(e) => {
                      setRuleOrigemId(e.target.value);
                      const q = formData.perguntas.find((x) => x.id === e.target.value);
                      if (q?.opcoes && q.opcoes.length > 0) {
                        setRuleValor(q.opcoes[0].value);
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-2 text-xs text-primary shadow-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione a pergunta...</option>
                    {formData.perguntas.map((q) => (
                      <option key={q.id} value={q.id}>
                        [{q.codigo}] {q.enunciado.slice(0, 40)}...
                      </option>
                    ))}
                  </select>
                </div>

                {/* Condições (igual, diferente, contem) */}
                <div>
                  <label className="block text-xs font-bold text-secondary">
                    Condição
                  </label>
                  <select
                    id="select-rule-condicao"
                    value={ruleCondicao}
                    onChange={(e) => setRuleCondicao(e.target.value as ConditionOperator)}
                    className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-2 text-xs text-primary shadow-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="igual">Igual a (=)</option>
                    <option value="diferente">Diferente de (≠)</option>
                    <option value="contem">Contém o termo</option>
                  </select>
                </div>

                {/* Respostas como devem ser exibidas de acordo com a condição */}
                <div>
                  <label className="block text-xs font-bold text-secondary">
                    Resposta de Comparação
                  </label>
                  <input
                    id="input-rule-valor"
                    type="text"
                    value={ruleValor}
                    onChange={(e) => setRuleValor(e.target.value)}
                    placeholder="Ex: Não, Sim, ou valor..."
                    className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-2 text-xs text-primary placeholder-slate-500 shadow-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Campo de ação de acordo com o filtro */}
                <div>
                  <label className="block text-xs font-bold text-secondary">
                    Ação a Executar
                  </label>
                  <select
                    id="select-rule-acao"
                    value={ruleAcao}
                    onChange={(e) => setRuleAcao(e.target.value as ConditionActionType)}
                    className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-2 text-xs text-primary shadow-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="saltar_para">Saltar para a pergunta</option>
                    <option value="esconder_pergunta">Esconder pergunta</option>
                    <option value="finalizar_formulario">Finalizar o formulário de perguntas</option>
                  </select>
                </div>
              </div>

              {/* Se a ação for saltar ou esconder, seleciona o destino */}
              {ruleAcao !== 'finalizar_formulario' && (
                <div className="mt-3 max-w-sm">
                  <label className="block text-xs font-bold text-secondary">
                    Pergunta de Destino
                  </label>
                  <select
                    id="select-rule-destino"
                    value={ruleDestinoId}
                    onChange={(e) => setRuleDestinoId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-2 text-xs text-primary shadow-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione para onde aplicar a ação...</option>
                    {formData.perguntas.map((q) => (
                      <option key={q.id} value={q.id}>
                        [{q.codigo}] {q.enunciado.slice(0, 45)}...
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  id="btn-save-rule"
                  onClick={handleAddRule}
                  className="flex items-center gap-1.5 rounded-xl bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 hover:bg-accent-primary-solid-hover transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Regra</span>
                </button>
              </div>
            </div>

            {/* Simulador Interativo de Condições */}
            <div className="mt-8 rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-accent-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-accent-primary">
                  Simulador de Comportamento em Tempo Real
                </h3>
              </div>
              <p className="mt-1 text-xs text-accent-primary/80">
                Teste interativamente abaixo como as perguntas e saltos se comportam dinamicamente com as respostas selecionadas:
              </p>

              <div className="mt-4 space-y-3">
                {formData.perguntas.map((q) => {
                  let isHidden = false;
                  formData.regras.forEach((r) => {
                    if (r.acao === 'esconder_pergunta' && r.perguntaDestinoId === q.id) {
                      const given = simTestAnswer[r.perguntaOrigemId];
                      if (given) {
                        if (r.condicao === 'igual' && given === r.valorComparacao) isHidden = true;
                        if (r.condicao === 'diferente' && given !== r.valorComparacao) isHidden = true;
                        if (r.condicao === 'contem' && given.includes(r.valorComparacao)) isHidden = true;
                      }
                    }
                  });

                  if (isHidden) {
                    return (
                      <div
                        key={q.id}
                        className="rounded-lg border border-dashed border-accent-warning-soft-border bg-accent-warning-soft p-2.5 text-xs text-accent-warning"
                      >
                        👁️ [{q.codigo}] <em>Esta pergunta foi ocultada pela regra condicional configurada.</em>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={q.id}
                      className="rounded-xl border border-ui bg-surface-card p-3.5 shadow-sm"
                    >
                      <div className="text-xs font-semibold text-primary">
                        [{q.codigo}] {q.enunciado}
                      </div>

                      {q.opcoes ? (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {q.opcoes.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                setSimTestAnswer({ ...simTestAnswer, [q.id]: opt.value })
                              }
                              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                                simTestAnswer[q.id] === opt.value
                                  ? 'bg-accent-primary-solid text-on-accent font-bold shadow-sm shadow-blue-900/50'
                                  : 'border border-ui bg-surface text-secondary hover:bg-surface-raised hover:text-primary'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={simTestAnswer[q.id] || ''}
                          onChange={(e) =>
                            setSimTestAnswer({ ...simTestAnswer, [q.id]: e.target.value })
                          }
                          placeholder="Digite para testar regra..."
                          className="mt-2 w-full rounded-lg border border-ui bg-surface px-2.5 py-1 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONSISTÊNCIA E CADASTRO DE METAS */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
            <div>
              <h2 className="text-lg font-bold text-primary">
                Consistência e Cadastro de Metas
              </h2>
              <p className="text-xs text-muted">
                Metas amostrais estruturadas obrigatoriamente pela tríade: <strong>Questão</strong>, <strong>Condição</strong> e <strong>Resposta</strong>, vinculadas ao ciclo atual.
              </p>
            </div>

            {/* Metas list */}
            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Metas Definidas ({formData.metas.length})
              </h3>

              {formData.metas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ui p-4 text-center text-xs text-muted">
                  Nenhuma meta cadastrada para este questionário.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {formData.metas.map((meta) => {
                    const q = formData.perguntas.find((x) => x.id === meta.perguntaId);
                    return (
                      <div
                        key={meta.id}
                        className="flex items-start justify-between rounded-xl border border-ui bg-surface-card p-3.5 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5 text-accent-primary" />
                            <span className="font-bold text-primary">
                              Meta: {meta.quantidadeAlvo} coletas
                            </span>
                            <span className="rounded border border-ui bg-surface px-1.5 py-0.5 text-[9px] text-secondary">
                              {meta.ciclo}
                            </span>
                          </div>

                          <div className="text-secondary">
                            <strong className="text-muted">Questão:</strong> [{q?.codigo}] {q?.enunciado.slice(0, 35)}...
                          </div>
                          <div className="text-secondary">
                            <strong className="text-muted">Condição:</strong> {meta.condicao.toUpperCase()}
                          </div>
                          <div className="text-secondary">
                            <strong className="text-muted">Resposta:</strong> "{meta.resposta}"
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteMeta(meta.id)}
                          className="text-muted hover:text-accent-danger transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Meta Form */}
            <div className="mt-8 rounded-xl border border-ui bg-surface-card p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                + Cadastrar Nova Meta (Composição Obrigatória)
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Campo 1: Questão */}
                <div>
                  <label className="block text-xs font-bold text-secondary">
                    1. Questão *
                  </label>
                  <select
                    id="select-meta-questao"
                    value={metaPerguntaId}
                    onChange={(e) => {
                      setMetaPerguntaId(e.target.value);
                      const q = formData.perguntas.find((x) => x.id === e.target.value);
                      if (q?.opcoes && q.opcoes.length > 0) {
                        setMetaResposta(q.opcoes[0].value);
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-2 text-xs text-primary shadow-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione a questão...</option>
                    {formData.perguntas.map((q) => (
                      <option key={q.id} value={q.id}>
                        [{q.codigo}] {q.enunciado.slice(0, 35)}...
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campo 2: Condição */}
                <div>
                  <label className="block text-xs font-bold text-secondary">
                    2. Condição *
                  </label>
                  <select
                    id="select-meta-condicao"
                    value={metaCondicao}
                    onChange={(e) => setMetaCondicao(e.target.value as ConditionOperator)}
                    className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-2 text-xs text-primary shadow-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="igual">Igual a (=)</option>
                    <option value="diferente">Diferente de (≠)</option>
                    <option value="contem">Contém o termo</option>
                  </select>
                </div>

                {/* Campo 3: Resposta */}
                <div>
                  <label className="block text-xs font-bold text-secondary">
                    3. Resposta Esperada *
                  </label>
                  <input
                    id="input-meta-resposta"
                    type="text"
                    value={metaResposta}
                    onChange={(e) => setMetaResposta(e.target.value)}
                    placeholder="Ex: Sim, 18 a 25 anos..."
                    className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-2 text-xs text-primary placeholder-slate-500 shadow-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Quantidade Alvo */}
                <div>
                  <label className="block text-xs font-bold text-secondary">
                    Quantidade Alvo (Amostragem)
                  </label>
                  <input
                    id="input-meta-quantidade"
                    type="number"
                    min={1}
                    value={metaQuantidadeAlvo}
                    onChange={(e) => setMetaQuantidadeAlvo(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-2 text-xs text-primary shadow-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  id="btn-add-meta"
                  onClick={handleAddMeta}
                  className="flex items-center gap-1.5 rounded-xl bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 hover:bg-accent-primary-solid-hover transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Meta da Questão</span>
                </button>
              </div>
            </div>

            {/* Verificação de Consistência Automática */}
            <div className="mt-8 rounded-2xl border border-accent-success-soft-border bg-accent-success-soft p-4 text-xs text-accent-success">
              <div className="flex items-center gap-2 font-bold text-accent-success">
                <CheckCircle2 className="h-4 w-4 text-accent-success" />
                <span>Auditoria de Consistência do Questionário</span>
              </div>
              <ul className="mt-2 space-y-1 text-accent-success/80">
                <li>• Nenhuma referência circular detectada nas regras de salto.</li>
                <li>• Todas as {formData.perguntas.length} perguntas possuem identificador único válido.</li>
                <li>• {formData.regras.length} regras de salto ativas e validadas contra o fluxo de perguntas.</li>
                <li>• {formData.metas.length} metas cadastradas em conformidade (Questão, Condição e Resposta).</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PESQUISADORES */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-primary">
                  Seleção de Pesquisadores Participantes
                </h2>
                <p className="text-xs text-muted">
                  Pesquisadores disponíveis e cadastrados no sistema. Selecione quais colaboradores irão participar efetivamente desta pesquisa em campo.
                </p>
              </div>

              <div className="text-xs font-bold text-secondary">
                {formData.pesquisadoresIds.length} selecionado(s) de {collaborators.length}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {collaborators.map((colab) => {
                const isSelected = formData.pesquisadoresIds.includes(colab.id);
                return (
                  <div
                    key={colab.id}
                    onClick={() => toggleResearcher(colab.id)}
                    className={`flex cursor-pointer items-start justify-between rounded-xl border p-4 transition ${
                      isSelected
                        ? 'border-accent-primary-soft-border bg-accent-primary-soft shadow-sm shadow-blue-950/40'
                        : 'border-ui bg-surface-card hover:border-ui'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-primary">
                          {colab.nome}
                        </span>
                        {!colab.ativo && (
                          <span className="rounded border border-accent-danger-soft-border bg-accent-danger-soft px-1.5 py-0.5 text-[9px] font-bold text-accent-danger">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">
                        Login: {colab.login} • CPF: {colab.cpf}
                      </div>
                      <div className="text-xs text-muted">
                        Email: {colab.email}
                      </div>
                      {colab.celular && (
                        <div className="text-[11px] text-muted">
                          Celular: {colab.celular} ({colab.nomeContatoCelular || 'Contato'})
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-accent-primary-solid text-on-accent'
                          : 'border-ui bg-surface-raised'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons: Voltar, Avançar e Concluir/Salvar */}
      <div className="flex items-center justify-between border-t border-ui pt-4">
        <button
          type="button"
          id="btn-wizard-prev"
          onClick={() => {
            if (currentStep > 1) {
              setCurrentStep(currentStep - 1);
            } else {
              setActiveModule('pesquisas');
            }
          }}
          className="flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{currentStep === 1 ? 'Cancelar e Voltar' : 'Etapa Anterior'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-wizard-save-draft-bottom"
            onClick={handleSaveDraftOffline}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
              !effectiveOnline
                ? 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning hover:bg-accent-warning-soft'
                : 'border-ui bg-surface-raised text-secondary hover:bg-surface-hover hover:text-primary'
            }`}
            title="Salvar rascunho da pesquisa atual"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{!effectiveOnline ? 'Salvar Offline' : 'Salvar Rascunho'}</span>
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              id="btn-wizard-next"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="flex items-center gap-1.5 rounded-xl bg-accent-primary-solid px-5 py-2 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 hover:bg-accent-primary-solid-hover transition-colors"
            >
              <span>Próxima Etapa</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : isInProgress && !formData.serverSyncToken ? (
            <button
              type="button"
              id="btn-wizard-sync-mandatory-finish"
              onClick={() => setServerSyncModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-accent-warning-solid hover:bg-accent-warning-solid-hover px-6 py-2.5 text-xs font-bold text-on-warning shadow-lg shadow-amber-500/30 transition active:scale-95 animate-pulse"
              title="Sincronização obrigatória com o servidor para pesquisas em andamento antes de subir alterações"
            >
              <Server className="h-4 w-4" />
              <span>Sincronizar com o Servidor antes de Subir</span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-wizard-finish"
              onClick={handleFinishWizard}
              className={`flex items-center gap-1.5 rounded-xl px-6 py-2.5 text-xs font-bold text-primary shadow-lg active:scale-95 transition-colors ${
                !effectiveOnline
                  ? 'bg-accent-warning-solid shadow-amber-900/40 hover:bg-accent-warning-solid-hover'
                  : formData.serverSyncToken
                  ? 'bg-accent-success-solid shadow-emerald-900/40 hover:bg-accent-success-solid-hover'
                  : 'bg-accent-success-solid shadow-emerald-900/40 hover:bg-accent-success-solid-hover'
              }`}
            >
              {!effectiveOnline ? (
                <CloudOff className="h-4 w-4" />
              ) : formData.serverSyncToken ? (
                <ArrowUpCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>
                {!effectiveOnline
                  ? 'Concluir e Salvar (Offline)'
                  : formData.serverSyncToken
                  ? 'Subir Alterações para o Servidor'
                  : 'Concluir e Salvar Questionário'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Central Server Sync Modal */}
      <ServerSyncCheckModal
        isOpen={serverSyncModalOpen}
        onClose={() => setServerSyncModalOpen(false)}
        survey={formData}
        hasLocalModifications={hasLocalModifications}
        onUploadSuccess={(updatedSurvey) => {
          setFormData(updatedSurvey);
          setServerSyncModalOpen(false);
          clearCurrentSurveyDraft();
          setSaveSuccess(true);
        }}
      />

      {/* Success Notification Modal */}
      {saveSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-ui bg-surface p-6 shadow-2xl text-center">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border ${
                !effectiveOnline
                  ? 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning'
                  : 'border-accent-success-soft-border bg-accent-success-soft text-accent-success'
              }`}
            >
              {!effectiveOnline ? (
                <CloudOff className="h-8 w-8" />
              ) : (
                <CheckCircle2 className="h-8 w-8" />
              )}
            </div>

            <h3 className="mt-4 text-base font-bold text-primary">
              {!effectiveOnline
                ? 'Pesquisa Salva Offline com Sucesso!'
                : 'Questionário Salvo com Sucesso!'}
            </h3>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              {!effectiveOnline ? (
                <>
                  A pesquisa <strong className="text-primary">{formData.nome}</strong> (Cód: {formData.codigo}) foi salva de forma segura no armazenamento local do navegador e colocada na fila de sincronização. Assim que a conexão for reestabelecida, ela poderá ser transmitida ao servidor.
                </>
              ) : (
                <>
                  A pesquisa <strong className="text-primary">{formData.nome}</strong> (Cód: {formData.codigo}) está configurada com {formData.perguntas.length} perguntas, {formData.regras.length} regras de salto e vinculada aos {formData.pesquisadoresIds.length} pesquisadores selecionados.
                </>
              )}
            </p>

            {!effectiveOnline && (
              <div className="mt-4 rounded-xl border border-accent-warning-soft-border bg-accent-warning-soft p-3 text-[11px] text-accent-warning text-left flex items-start gap-2">
                <CloudOff className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Você pode continuar criando ou coletando entrevistas normalmente. Nenhuma informação será perdida.
                </span>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={() => {
                  setSaveSuccess(false);
                  setActiveModule('pesquisas');
                }}
                className="rounded-xl border border-ui bg-surface-raised px-4 py-2 text-xs font-bold text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
              >
                Ir para Lista de Pesquisas
              </button>
              <button
                onClick={() => {
                  setSaveSuccess(false);
                  setActiveModule('simulador');
                }}
                className="rounded-xl bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 hover:bg-accent-primary-solid-hover transition-colors"
              >
                Testar Coleta no Simulador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structured Questionnaire Import Modal */}
      <QuestionnaireImportModal
        isOpen={questionnaireImportModalOpen}
        onClose={() => setQuestionnaireImportModalOpen(false)}
        onImportQuestions={handleImportQuestions}
        surveyTitle={formData.nome}
      />
    </div>
  );
};
