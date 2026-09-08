import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Mic,
  MicOff,
  Clock,
  MapPin,
  Send,
  RotateCcw,
  Volume2,
  CheckSquare,
  Save,
  Trash2,
  Wifi,
  WifiOff,
  UserCheck,
  ShieldCheck,
  FileText,
  X,
  AlertTriangle,
  Flag,
  Zap,
} from 'lucide-react';
import { Survey, Question, InterviewSubmission, AnswerItem } from '../../types';
import { filterResearcherVisibleSurveys } from '../../utils/researcherUtils';
import { generatePlayableWavBlob, formatAudioDuration } from '../../utils/audioUtils';
import { saveOfflineSubmissionToDB } from '../../utils/indexedDBStorage';
import {
  STANDARD_CONFIDENCE_LEVELS,
  calculateSampleSize,
} from '../../utils/samplingUtils';

interface CollectionSimulatorProps {
  /**
   * Quando true (Modo Pesquisador), oculta elementos técnicos/estatísticos que
   * não fazem sentido para o coletor de campo: barra de níveis de confiança
   * (Z-score), painel de status da entrevista e textos técnicos (IndexedDB/SHA-256).
   * O sistema padrão (simulador administrativo) mantém tudo.
   */
  fieldMode?: boolean;
}

export const CollectionSimulator: React.FC<CollectionSimulatorProps> = ({ fieldMode }) => {
  const {
    surveys,
    editingSurvey,
    currentUser,
    currentProfile,
    addSubmission,
    setActiveModule,
    effectiveOnline,
    addAuditLog,
    saveSurvey,
  } = useApp();

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  // Filter surveys strictly for researchers: only surveys visible to them
  // (ativas, ou concluídas mas re-habilitadas para este login).
  const availableSurveys = isResearcher
    ? filterResearcherVisibleSurveys(surveys, currentUser)
    : surveys.filter((s) => s.status !== 'excluida');

  const activeSurvey: Survey | undefined =
    (editingSurvey && availableSurveys.some((s) => s.id === editingSurvey.id) ? editingSurvey : undefined) ||
    availableSurveys[0];

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isReviewStep, setIsReviewStep] = useState<boolean>(false);
  const [confirmFinalizeModalOpen, setConfirmFinalizeModalOpen] = useState<boolean>(false);
  const [wasSavedOffline, setWasSavedOffline] = useState<boolean>(false);
  const [audioSeconds, setAudioSeconds] = useState<number>(0);
  const [audioTranscript, setAudioTranscript] = useState<string>('Gravação ambiental de campo');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Configurações da Pesquisa para Áudio
  const isAudioEnabled = activeSurvey ? activeSurvey.habilitarGravacaoAudio !== false : false;
  // Tempo limite configurado (padrão 2 minutos quando não especificado, máximo 10 minutos)
  const configuredMinutes = Math.min(10, Math.max(1, activeSurvey?.tempoLimiteGravacaoMinutos || 2));
  const maxRecordingSeconds = configuredMinutes * 60;

  // Identificação do ponto de início configurado na pesquisa
  const audioStartQuestionId =
    activeSurvey?.gravarAudioAPartirPerguntaId ||
    activeSurvey?.perguntas.find((p) => p.iniciarGravacaoAqui)?.id;

  const audioStartQuestionIndex = audioStartQuestionId && activeSurvey
    ? activeSurvey.perguntas.findIndex((p) => p.id === audioStartQuestionId)
    : 0;

  // A gravação inicia quando o usuário chega na pergunta inicial definida
  const hasAudioStarted =
    isAudioEnabled &&
    (audioStartQuestionIndex <= 0 || currentQuestionIndex >= audioStartQuestionIndex);

  const isAudioAtLimit = audioSeconds >= maxRecordingSeconds;
  const isRecordingAudio = hasAudioStarted && !isAudioAtLimit && !isCompleted;

  useEffect(() => {
    let timer: any;
    if (isRecordingAudio) {
      timer = setInterval(() => {
        setAudioSeconds((prev) => {
          if (prev + 1 >= maxRecordingSeconds) {
            return maxRecordingSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecordingAudio, maxRecordingSeconds]);

  const hasValidQuestions = Boolean(activeSurvey && activeSurvey.perguntas && activeSurvey.perguntas.length > 0);
  const currentQuestion: Question | undefined = hasValidQuestions ? activeSurvey?.perguntas[currentQuestionIndex] : undefined;

  // Open the final review screen
  const handleOpenFinalReview = (lastAnswer?: any) => {
    if (lastAnswer !== undefined && currentQuestion) {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: lastAnswer }));
    }
    setIsReviewStep(true);
  };

  // Evaluate conditional rules for this question
  const evaluateNextStep = (currentAns: any) => {
    if (!currentQuestion || !activeSurvey?.regras) return;

    const matchedRule = activeSurvey.regras.find((r) => {
      if (r.perguntaOrigemId !== currentQuestion.id) return false;
      const valStr = String(currentAns).trim().toLowerCase();
      const ruleValStr = String(r.valorComparacao).trim().toLowerCase();

      if (r.condicao === 'igual') return valStr === ruleValStr;
      if (r.condicao === 'diferente') return valStr !== ruleValStr;
      if (r.condicao === 'contem') return valStr.includes(ruleValStr);
      return false;
    });

    if (matchedRule) {
      if (matchedRule.acao === 'finalizar_formulario') {
        handleOpenFinalReview(currentAns);
        return;
      }

      if (matchedRule.acao === 'saltar_para' && matchedRule.perguntaDestinoId) {
        const destIdx = activeSurvey.perguntas.findIndex(
          (p) => p.id === matchedRule.perguntaDestinoId
        );
        if (destIdx !== -1) {
          setCurrentQuestionIndex(destIdx);
          return;
        }
      }
    }

    // Default: Next question or finalize review
    if (currentQuestionIndex < activeSurvey.perguntas.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleOpenFinalReview(currentAns);
    }
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    const currentAns = answers[currentQuestion.id];
    if (currentQuestion.obrigatoria && !currentAns) {
      alert('Esta pergunta é obrigatória. Por favor, forneça uma resposta para prosseguir.');
      return;
    }
    evaluateNextStep(currentAns);
  };

  /**
   * Avanço automático (Modo Pesquisador / fieldMode): registra a resposta e
   * já direciona para a próxima pergunta. Usado ao escolher uma opção ou ao
   * pressionar Enter em campos de texto/numérico/data.
   */
  const handleAutoAdvance = (value: any) => {
    if (!currentQuestion) return;
    const val = Array.isArray(value) ? value : String(value ?? '');
    if (currentQuestion.obrigatoria && !val) {
      alert('Esta pergunta é obrigatória. Por favor, forneça uma resposta para prosseguir.');
      return;
    }
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));

    const isLast = activeSurvey
      ? currentQuestionIndex >= activeSurvey.perguntas.length - 1
      : false;
    // Na última pergunta (modo pesquisador) não avançamos automaticamente:
    // o pesquisador conclui a coleta manualmente pelo botão "Finalizar Pesquisa".
    if (fieldMode && isLast) return;

    evaluateNextStep(value);
  };

  // Enter em campos de texto/numérico/data avança (Modo Pesquisador).
  const handleFieldKeyDown = (e: React.KeyboardEvent) => {
    if (!fieldMode) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAutoAdvance(answers[currentQuestion?.id ?? '']);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitFinal = async () => {
    if (!activeSurvey) return;
    setIsSaving(true);
    const finalAnswers = { ...answers };

    const formattedAnswers: AnswerItem[] = Object.entries(finalAnswers).map(([perguntaId, resposta]) => {
      const q = activeSurvey.perguntas.find((p) => p.id === perguntaId);
      return {
        perguntaId,
        perguntaCodigo: q?.codigo || 'Q',
        perguntaEnunciado: q?.enunciado || '',
        resposta: Array.isArray(resposta) ? (resposta as string[]) : String(resposta || ''),
      };
    });

    const recordedDuration = Math.max(5, audioSeconds);
    const audioWavBlob = generatePlayableWavBlob(recordedDuration);

    const startQuestionObj = audioStartQuestionId
      ? activeSurvey.perguntas.find((p) => p.id === audioStartQuestionId)
      : activeSurvey.perguntas[0];

    const reader = new FileReader();
    reader.readAsDataURL(audioWavBlob);
    reader.onloadend = async () => {
      const audioDataUrl = reader.result as string;

      const newSub: InterviewSubmission = {
        id: `sub_${Date.now()}`,
        pesquisaId: activeSurvey.id,
        codigoPesquisa: `${activeSurvey.codigo}-${Math.floor(100 + Math.random() * 900)}`,
        pesquisaNome: activeSurvey.nome,
        pesquisadorId: currentUser.id,
        pesquisadorNome: currentUser.nome,
        dataHora: new Date().toISOString(),
        status: 'concluida',
        respostas: formattedAnswers,
        audioGravacao: isAudioEnabled
          ? {
              nomeArquivo: `${activeSurvey.codigo}_audio_${Date.now()}.wav`,
              duracaoSegundos: recordedDuration,
              tamanhoKb: Math.round(recordedDuration * 16),
              transcricaoTrecho: 'Áudio ambiental gravado com sucesso durante a entrevista de campo.',
              audioUrl: audioDataUrl,
              iniciouNaPerguntaCodigo: startQuestionObj?.codigo || 'P01',
              tempoConfiguradoMinutos: configuredMinutes,
            }
          : undefined,
        geolocalizacao: {
          latitude: -23.55052 + (Math.random() - 0.5) * 0.02,
          longitude: -46.633308 + (Math.random() - 0.5) * 0.02,
          bairro: 'Região de Coleta em Campo',
          cidade: 'São Paulo',
        },
      };

      // Add to main AppContext state (which handles offline queues and audit logging automatically)
      addSubmission(newSub);

      // If offline, also explicitly persist in IndexedDB browser storage
      if (!effectiveOnline) {
        await saveOfflineSubmissionToDB(newSub);
        setWasSavedOffline(true);
      } else {
        setWasSavedOffline(false);
      }

      setIsSaving(false);
      setIsReviewStep(false);
      setIsCompleted(true);
    };
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsReviewStep(false);
    setIsCompleted(false);
    setAudioSeconds(0);
    setConfirmFinalizeModalOpen(false);
  };

  const handleDiscardForm = () => {
    if (window.confirm('Tem certeza de que deseja descartar este formulário? Todas as respostas preenchidas nesta entrevista serão canceladas.')) {
      handleReset();
    }
  };

  const [quickConfidenceFeedback, setQuickConfidenceFeedback] = useState<string | null>(null);

  const handleQuickStandardConfidence = (level: number, zVal: number) => {
    if (!activeSurvey) return;
    const margin = activeSurvey.margemErroPercentual || 3.5;
    const calc = calculateSampleSize(level, margin, activeSurvey.populacaoUniverso, 0.5, 0.15, zVal);
    saveSurvey({
      ...activeSurvey,
      nivelConfiancaPercentual: level,
      metaTotalColetas: calc.sampleSize,
    });
    const feedback = `Nível de confiança ${level}% selecionado (Z = ${zVal.toFixed(3).replace('.', ',')}) • Meta da pesquisa: ${calc.sampleSize} coletas (E = ±${margin}%)`;
    setQuickConfidenceFeedback(feedback);
    setTimeout(() => setQuickConfidenceFeedback(null), 4500);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Cabeçalho do Simulador de Coleta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ui pb-3">
        <div className="flex items-center gap-2 px-1">
          <Smartphone className="h-4 w-4 text-accent-primary" />
          <span className="text-xs font-bold text-primary">
            {fieldMode ? 'Formulário de Coleta' : 'Simulador de Coleta Mobile'}
          </span>
        </div>

        {activeSurvey && (
          <div className="text-xs text-muted flex items-center gap-1.5 self-end sm:self-center">
            <span className="h-2 w-2 rounded-full bg-accent-success-solid" />
            <span>Pesquisa Ativa: <strong className="text-primary">{activeSurvey.nome}</strong></span>
          </div>
        )}
      </div>

      {/* Barra de Níveis de Confiança Padrão com Preenchimento de Z-score */}
      {/* Oculto no Modo Pesquisador (fieldMode) — é estatístico, não faz sentido para o coletor */}
      {!fieldMode && activeSurvey && (
        <div className="rounded-xl border border-ui bg-surface p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">Níveis de Confiança Padrão</span>
                <span className="text-[10px] text-accent-primary font-mono">
                  (Atual: {activeSurvey.nivelConfiancaPercentual || 95}%)
                </span>
              </div>
              <p className="text-[11px] text-muted">
                Seletor rápido com preenchimento automático de Z-score para o pesquisador.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {STANDARD_CONFIDENCE_LEVELS.map((std) => {
              const isSelected = (activeSurvey.nivelConfiancaPercentual || 95) === std.level;
              return (
                <button
                  key={std.level}
                  type="button"
                  id={`btn-quick-confianca-${std.level}`}
                  onClick={() => handleQuickStandardConfidence(std.level, std.zScore)}
                  title={`${std.title} - Z=${std.zScore.toFixed(3)}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    isSelected
                      ? 'bg-accent-primary-solid text-on-accent shadow-sm ring-1 ring-emerald-400/40'
                      : 'bg-surface-raised border border-ui text-secondary hover:border-ui hover:text-primary'
                  }`}
                >
                  <span>{std.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-accent-primary-solid text-on-accent' : 'bg-surface-raised text-accent-primary'
                  }`}>
                    Z = {std.zScore.toFixed(3).replace('.', ',')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Alerta de Feedback de Confiança Rápida */}
      {quickConfidenceFeedback && (
        <div className="flex items-center gap-2 rounded-xl border border-accent-success-soft-border bg-accent-success-soft px-3.5 py-2 text-xs font-medium text-accent-success animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-success" />
          <span>{quickConfidenceFeedback}</span>
        </div>
      )}

      {!activeSurvey || !hasValidQuestions ? (
        <div className="rounded-2xl border border-dashed border-ui bg-surface p-8 text-center shadow-xl space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-muted">
            <Smartphone className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-primary">
            Nenhuma pergunta configurada para esta pesquisa
          </h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Configure as perguntas no módulo de questionário para simular a coleta em campo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveModule('pesquisas')}
              className="rounded-lg border border-ui bg-surface-raised px-4 py-2 text-xs font-bold text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
            >
              Voltar para Pesquisas
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="rounded-md bg-accent-primary-soft border border-accent-primary-soft-border px-2.5 py-1 text-xs font-bold text-accent-primary">
                {fieldMode ? 'Coleta de Campo' : 'Coleta em Tempo Real & Coleta Web'}
              </span>
              <h1 className="mt-1 text-lg font-bold text-primary">
                {activeSurvey.nome}
              </h1>
              <p className="text-xs text-muted">
                Ciclo {activeSurvey.cicloAtual} (v{activeSurvey.versao}) • Cód: {activeSurvey.codigo}
              </p>
            </div>

            {/* Live status indicators — oculto no Modo Pesquisador (fieldMode) */}
            {!fieldMode && (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 rounded-lg border border-ui bg-surface px-2.5 py-1 text-[11px] font-semibold text-secondary shadow-xs">
                <MapPin className="h-3.5 w-3.5 text-accent-success" />
                <span>GPS Ativo</span>
              </div>

          {!isAudioEnabled ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-2.5 py-1 text-[11px] font-medium text-muted">
              <MicOff className="h-3.5 w-3.5" />
              <span>Áudio Desativado</span>
            </div>
          ) : !hasAudioStarted ? (
            <div
              className="flex items-center gap-1.5 rounded-lg border border-accent-warning-soft-border bg-accent-warning-soft px-2.5 py-1 text-[11px] font-semibold text-accent-warning"
              title={`A gravação será iniciada a partir da pergunta ${
                activeSurvey.perguntas[audioStartQuestionIndex]?.codigo || 'configurada'
              }`}
            >
              <Clock className="h-3.5 w-3.5 animate-pulse text-accent-warning" />
              <span>Inicia na {activeSurvey.perguntas[audioStartQuestionIndex]?.codigo || 'Ponto'}</span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold shadow-xs ${
                isAudioAtLimit
                  ? 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning'
                  : 'border-accent-purple-soft-border bg-accent-purple-soft text-accent-purple'
              }`}
              title={`Gravação de áudio em andamento (limite: ${configuredMinutes} min)`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isAudioAtLimit
                    ? 'bg-accent-warning-solid'
                    : 'bg-accent-danger-solid animate-pulse'
                }`}
              />
              <Mic className="h-3.5 w-3.5" />
              <span className="font-mono">
                {formatAudioDuration(audioSeconds)} / {configuredMinutes}m
              </span>
              {isAudioAtLimit && <span className="text-[10px] text-accent-warning font-bold">(Máx)</span>}
            </div>
          )}
            </div>
            )}
      </div>

      {/* Modal: Finalizar Formulário - Gravar ou Descartar */}
      {confirmFinalizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-ui bg-surface p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-warning-soft text-accent-warning border border-accent-warning-soft-border">
                  <CheckSquare className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary">Finalizar Formulário</h3>
                  <p className="text-xs text-muted">
                    {fieldMode ? 'Confirme a conclusão da coleta' : 'Status da entrevista em andamento'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmFinalizeModalOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-ui bg-surface-card p-4 space-y-2.5">
              <p className="text-sm font-semibold text-primary">
                Deseja gravar o formulário atual ou descartá-lo?
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted pt-1">
                <div className="rounded-lg bg-surface-raised p-2.5 border border-ui/80">
                  <span className="block text-[10px] text-muted uppercase font-bold">Respondidas</span>
                  <span className="text-sm font-bold text-accent-primary">
                    {Object.keys(answers).length} de {activeSurvey.perguntas.length}
                  </span>
                </div>
                <div className="rounded-lg bg-surface-raised p-2.5 border border-ui/80">
                  <span className="block text-[10px] text-muted uppercase font-bold">Áudio de Campo</span>
                  <span className="text-sm font-bold text-accent-purple">
                    {formatAudioDuration(audioSeconds)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                id="btn-gravar-formulario-atual"
                type="button"
                onClick={() => {
                  setConfirmFinalizeModalOpen(false);
                  setIsReviewStep(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-success-solid px-4 py-3 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-success-solid-hover transition active:scale-[0.99]"
              >
                <Save className="h-4 w-4" />
                <span>Gravar Formulário Atual</span>
              </button>

              <button
                id="btn-descartar-formulario"
                type="button"
                onClick={handleDiscardForm}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent-danger-soft-border bg-accent-danger-soft px-4 py-2.5 text-xs font-bold text-accent-danger hover:bg-accent-danger-soft transition active:scale-[0.99]"
              >
                <Trash2 className="h-4 w-4" />
                <span>Descartar Formulário</span>
              </button>

              <button
                id="btn-continuar-preenchendo"
                type="button"
                onClick={() => setConfirmFinalizeModalOpen(false)}
                className="flex w-full items-center justify-center rounded-xl bg-surface-raised px-4 py-2 text-xs font-medium text-secondary hover:bg-surface-hover hover:text-primary transition"
              >
                Continuar Preenchendo
              </button>
            </div>
          </div>
        </div>
      )}

      {isCompleted ? (
        <div className="rounded-2xl border border-ui bg-surface p-8 text-center shadow-xl space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-success-soft border border-accent-success-soft-border text-accent-success">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-primary">
            {wasSavedOffline
              ? 'Pesquisa Finalizada e Armazenada no Navegador!'
              : 'Pesquisa Finalizada e Sincronizada!'}
          </h2>

          {wasSavedOffline ? (
            <div className="rounded-xl border border-accent-warning-soft-border bg-accent-warning-soft p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-accent-warning font-bold text-xs">
                <WifiOff className="h-4 w-4 shrink-0 text-accent-warning" />
                <span>Armazenado Offline com Sucesso</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                {fieldMode
                  ? 'Você está sem conexão de internet no momento. Sua coleta foi salva com segurança neste aparelho e será enviada automaticamente quando a conexão for restabelecida.'
                  : 'Você está sem conexão de internet no momento. Todo o progresso foi salvo com segurança no seu navegador (IndexedDB) e será sincronizado automaticamente quando o sinal de internet for reestabelecido.'}
              </p>
              <div className="text-[11px] text-muted pt-1 border-t border-accent-warning-soft-border flex flex-wrap justify-between gap-2">
                <span>Pesquisador: <strong className="text-primary">{currentUser.nome}</strong></span>
                <span>Armazenamento local persistido</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">
              Os dados coletados pelo pesquisador <strong className="text-primary">{currentUser.nome}</strong>, coordenadas GPS e gravação de áudio foram registrados e sincronizados com sucesso nos servidores.
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3 pt-2">
            <button
              id="btn-nova-coleta"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-4 py-2.5 text-xs font-bold text-primary shadow-sm hover:bg-surface-hover hover:text-primary transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Realizar Nova Coleta</span>
            </button>
            {/* Pesquisador não deve ver a opção de verificação de respostas */}
            {!fieldMode && (
              <button
                id="btn-ver-respostas-coletadas"
                onClick={() => setActiveModule('respostas')}
                className="rounded-lg bg-accent-primary-solid px-4 py-2.5 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors"
              >
                Ver Respostas Registradas
              </button>
            )}
          </div>
        </div>
      ) : isReviewStep ? (
        /* Finalization Step: Review before final submission */
        <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-ui pb-4">
            <div>
              <span className="rounded-md bg-accent-primary-soft border border-accent-primary-soft-border px-2.5 py-0.5 text-xs font-bold text-accent-primary">
                Etapa Final
              </span>
              <h2 className="text-lg font-bold text-primary mt-1">Finalizar Pesquisa de Campo</h2>
              <p className="text-xs text-muted">
                Confirme os dados antes de gravar e encerrar oficialmente o formulário.
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
              <CheckSquare className="h-5 w-5" />
            </div>
          </div>

          {/* Nome do pesquisador atualmente logado marcado como padrão */}
          <div className="rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Pesquisador Responsável da Coleta
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base font-bold text-primary">{currentUser.nome}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-success-soft border border-accent-success-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-success shadow-xs">
                    <CheckCircle2 className="h-3 w-3" /> Padrão (Usuário Logado)
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span>Login: <strong className="font-mono text-secondary">@{currentUser.login || currentUser.email}</strong></span>
                  <span>•</span>
                  <span>ID: <strong className="font-mono text-secondary">{currentUser.id}</strong></span>
                  <span>•</span>
                  <span>Perfil: <strong className="text-secondary">{currentProfile?.name || 'Pesquisador'}</strong></span>
                </div>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-xs font-bold text-primary shrink-0 shadow-md">
                {currentUser.nome.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Resumo da Coleta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-ui bg-surface-card p-3.5">
              <span className="block text-[10px] uppercase font-bold text-muted">Questões</span>
              <span className="text-base font-bold text-primary mt-0.5 block">
                {Object.keys(answers).length} de {activeSurvey.perguntas.length}
              </span>
              <span className="text-[10px] text-muted">Respostas preenchidas</span>
            </div>

            <div className="rounded-xl border border-ui bg-surface-card p-3.5">
              <span className="block text-[10px] uppercase font-bold text-muted">Áudio Gravado</span>
              <span className="text-base font-bold text-accent-purple mt-0.5 block font-mono">
                {formatAudioDuration(audioSeconds)}
              </span>
              <span className="text-[10px] text-muted">Gravação de campo</span>
            </div>

            <div className="rounded-xl border border-ui bg-surface-card p-3.5">
              <span className="block text-[10px] uppercase font-bold text-muted">Geolocalização</span>
              <span className="text-base font-bold text-accent-success mt-0.5 block flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> GPS Registrado
              </span>
              <span className="text-[10px] text-muted">Coordenadas fixadas</span>
            </div>
          </div>

          {/* Status de Conectividade com a Internet */}
          {effectiveOnline ? (
            <div className="flex items-center gap-3 rounded-xl border border-accent-success-soft-border bg-accent-success-soft p-3.5 text-xs text-accent-success">
              <Wifi className="h-5 w-5 text-accent-success shrink-0" />
              <div>
                <p className="font-bold text-accent-success">Conexão com a Internet Ativa</p>
                <p className="text-[11px] text-accent-success/80 mt-0.5">
                  A pesquisa será sincronizada imediatamente com os servidores centrais.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-accent-warning-soft-border bg-accent-warning-soft p-3.5 text-xs text-accent-warning">
              <WifiOff className="h-5 w-5 text-accent-warning shrink-0" />
              <div>
                <p className="font-bold text-accent-warning">Sem Sinal de Internet (Modo Offline)</p>
                <p className="text-[11px] text-accent-warning/80 mt-0.5">
                  {fieldMode
                    ? 'Sua coleta será salva com segurança neste aparelho e enviada automaticamente quando a conexão retornar.'
                    : 'Todo o progresso será armazenado de forma segura no seu navegador (IndexedDB) e sincronizado automaticamente quando o sinal retornar.'}
                </p>
              </div>
            </div>
          )}

          {/* Ações da Etapa Final */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-ui pt-4">
            <button
              type="button"
              onClick={() => setIsReviewStep(false)}
              className="flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition w-full sm:w-auto justify-center"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar às Perguntas</span>
            </button>

            <button
              id="btn-finalizar-pesquisa"
              type="button"
              disabled={isSaving}
              onClick={handleSubmitFinal}
              className="flex items-center justify-center gap-2 rounded-xl bg-accent-primary-solid px-6 py-2.5 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition active:scale-95 disabled:opacity-50 w-full sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSaving ? 'Gravando progresso...' : 'Finalizar Pesquisa'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active Question Card */
        <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
          {/* Progress header & Finalizar formulário button */}
          <div className="flex items-center justify-between border-b border-ui pb-3 text-xs text-muted">
            <div className="flex items-center gap-2">
              <span>
                Pergunta {currentQuestionIndex + 1} de {activeSurvey.perguntas.length}
              </span>
              <span className="font-bold text-accent-primary">
                ({currentQuestion?.codigo || 'Q'})
              </span>
            </div>

            {/* Botão de Finalizar Formulário no cabeçalho */}
            <button
              id="btn-finalizar-formulario"
              onClick={() => setConfirmFinalizeModalOpen(true)}
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-accent-warning-soft-border bg-accent-warning-soft px-2.5 py-1 text-xs font-bold text-accent-warning hover:bg-accent-warning-soft transition-colors shadow-xs"
              title="Finalizar o formulário agora (gravar ou descartar)"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Finalizar formulário</span>
            </button>
          </div>

          {currentQuestion && (
            <div className="mt-4">
              <h3 className="text-base font-bold text-primary">
                {currentQuestion.enunciado}
                {currentQuestion.obrigatoria && (
                  <span className="ml-1 text-accent-primary">*</span>
                )}
              </h3>

              {/* Answer inputs according to question type */}
              <div className="mt-6 space-y-3">
                {/* Múltipla Escolha (Única opção) */}
                {currentQuestion.tipo === 'multipla_escolha' &&
                  currentQuestion.opcoes?.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 text-xs transition ${
                        answers[currentQuestion.id] === opt.value
                          ? 'border-emerald-500 bg-accent-primary-soft text-primary font-bold'
                          : 'border-ui bg-surface-card text-secondary hover:bg-surface-raised'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        value={opt.value}
                        checked={answers[currentQuestion.id] === opt.value}
                        onChange={() =>
                          fieldMode
                            ? handleAutoAdvance(opt.value)
                            : setAnswers({ ...answers, [currentQuestion.id]: opt.value })
                        }
                        className="text-accent-primary-solid focus:ring-emerald-500"
                      />
                    </label>
                  ))}

                {/* Múltipla Seleção (Várias opções / Checkboxes) */}
                {currentQuestion.tipo === 'multipla_selecao' &&
                  currentQuestion.opcoes?.map((opt) => {
                    const currentSelected: string[] = Array.isArray(answers[currentQuestion.id])
                      ? answers[currentQuestion.id]
                      : [];
                    const isChecked = currentSelected.includes(opt.value);

                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 text-xs transition ${
                          isChecked
                            ? 'border-emerald-500 bg-accent-primary-soft text-primary font-bold'
                            : 'border-ui bg-surface-card text-secondary hover:bg-surface-raised'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const updated = isChecked
                              ? currentSelected.filter((v) => v !== opt.value)
                              : [...currentSelected, opt.value];
                            setAnswers({ ...answers, [currentQuestion.id]: updated });
                          }}
                          className="rounded text-accent-primary-solid focus:ring-emerald-500"
                          title="Selecione todas as opções aplicáveis e depois use o botão Avançar"
                        />
                      </label>
                    );
                  })}

                {/* Sim / Não */}
                {currentQuestion.tipo === 'sim_nao' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['Sim', 'Não'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          fieldMode
                            ? handleAutoAdvance(opt)
                            : setAnswers({ ...answers, [currentQuestion.id]: opt })
                        }
                        className={`rounded-xl border p-3.5 text-xs font-bold transition ${
                          answers[currentQuestion.id] === opt
                            ? 'border-emerald-500 bg-accent-primary-solid text-on-accent shadow-lg shadow-emerald-900/40'
                            : 'border-ui bg-surface-card text-secondary hover:bg-surface-raised'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* NPS Scale 0 to 10 */}
                {currentQuestion.tipo === 'nps' && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      {Array.from({ length: 11 }).map((_, n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            fieldMode
                              ? handleAutoAdvance(String(n))
                              : setAnswers({ ...answers, [currentQuestion.id]: String(n) })
                          }
                          className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold text-xs transition ${
                            answers[currentQuestion.id] === String(n)
                              ? 'bg-accent-primary-solid text-on-accent shadow-lg shadow-emerald-900/40'
                              : 'border border-ui bg-surface-card text-secondary hover:bg-surface-raised'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-muted">
                      <span>0 = Jamais recomendaria</span>
                      <span>10 = Recomendaria com certeza</span>
                    </div>
                  </div>
                )}

                {/* Texto Aberto */}
                {currentQuestion.tipo === 'texto_aberto' && (
                  <textarea
                    rows={4}
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) =>
                      setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                    }
                    onKeyDown={handleFieldKeyDown}
                    placeholder="Digite a resposta do entrevistado..."
                    className="w-full rounded-xl border border-ui bg-surface-card p-3 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                )}

                {/* Escala Numérica */}
                {currentQuestion.tipo === 'escala_numerica' && (
                  <input
                    type="number"
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) =>
                      setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                    }
                    onKeyDown={handleFieldKeyDown}
                    placeholder="Informe o valor numérico..."
                    className="w-full rounded-xl border border-ui bg-surface-card p-3 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                )}

                {/* Data / Hora */}
                {currentQuestion.tipo === 'data_hora' && (
                  <input
                    type="datetime-local"
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) =>
                      setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                    }
                    onKeyDown={handleFieldKeyDown}
                    className="w-full rounded-xl border border-ui bg-surface-card p-3 text-xs text-primary focus:border-emerald-500 focus:outline-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* Navigation controls */}
          <div className="mt-8 flex items-center justify-between border-t border-ui pt-4">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-1 rounded-lg px-3.5 py-2 text-xs font-semibold text-muted hover:bg-surface-raised hover:text-primary disabled:opacity-40 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Anterior</span>
            </button>

            <div className="flex items-center gap-2">
              {(() => {
                const isLast = activeSurvey
                  ? currentQuestionIndex === activeSurvey.perguntas.length - 1
                  : false;
                const showAdvance = !fieldMode || currentQuestion?.tipo === 'multipla_selecao';

                /* Em modo pesquisador: nas demais perguntas o avanço é automático ao
                   escolher a resposta ou pressionar Enter. Na última pergunta exibimos
                   o botão "Finalizar Pesquisa" para o pesquisador concluir manualmente.
                   Mantemos 'Finalizar formulário' apenas no cabeçalho (sem repetição). */
                if (fieldMode) {
                  if (isLast) {
                    return (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-5 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 transition hover:bg-accent-primary-solid-hover active:scale-95"
                      >
                        <span>Finalizar Pesquisa</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    );
                  }
                  if (showAdvance) {
                    return (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-5 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 transition hover:bg-accent-primary-solid-hover active:scale-95"
                      >
                        <span>Avançar</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    );
                  }
                  return null;
                }

                /* Sistema padrão (não pesquisador): fluxo completo com Finalizar + Avançar. */
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmFinalizeModalOpen(true)}
                      className="flex items-center gap-1 rounded-lg border border-accent-warning-soft-border bg-accent-warning-soft px-3 py-2 text-xs font-semibold text-accent-warning hover:bg-accent-warning-soft transition-colors"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      <span>Finalizar formulário</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-5 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 transition hover:bg-accent-primary-solid-hover active:scale-95"
                    >
                      <span>
                        {isLast ? 'Finalizar Pesquisa' : 'Avançar'}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};
