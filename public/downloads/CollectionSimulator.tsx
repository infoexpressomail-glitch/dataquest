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
  Calculator,
  Zap,
} from 'lucide-react';
import { Survey, Question, InterviewSubmission, AnswerItem } from '../../types';
import { generatePlayableWavBlob, formatAudioDuration } from '../../utils/audioUtils';
import { saveOfflineSubmissionToDB } from '../../utils/indexedDBStorage';
import { PopulationSampleScatterSimulator } from './PopulationSampleScatterSimulator';
import {
  STANDARD_CONFIDENCE_LEVELS,
  calculateSampleSize,
} from '../../utils/samplingUtils';

export const CollectionSimulator: React.FC = () => {
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

  // Filter surveys strictly for researchers: only active surveys assigned to them
  const availableSurveys = surveys.filter((s) => {
    if (s.status !== 'ativa') return false;
    if (isResearcher) {
      return (
        (currentUser.pesquisasVinculadasIds && currentUser.pesquisasVinculadasIds.includes(s.id)) ||
        (s.pesquisadoresIds && s.pesquisadoresIds.includes(currentUser.id))
      );
    }
    return true;
  });

  const activeSurvey: Survey | undefined =
    (editingSurvey && availableSurveys.some((s) => s.id === editingSurvey.id) ? editingSurvey : undefined) ||
    availableSurveys[0];

  const [simulatorTab, setSimulatorTab] = useState<'amostragem' | 'coleta'>('amostragem');
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
    <div className={`mx-auto space-y-5 ${simulatorTab === 'amostragem' ? 'max-w-5xl' : 'max-w-2xl'}`}>
      {/* Top Segmented Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            id="tab-simulador-amostragem"
            onClick={() => setSimulatorTab('amostragem')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
              simulatorTab === 'amostragem'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>Calculadora Amostral & Gráfico de Dispersão</span>
          </button>

          <button
            type="button"
            id="tab-simulador-coleta-mobile"
            onClick={() => setSimulatorTab('coleta')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
              simulatorTab === 'coleta'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Simulador de Coleta Mobile</span>
          </button>
        </div>

        {activeSurvey && (
          <div className="text-xs text-slate-400 flex items-center gap-1.5 self-end sm:self-center">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Pesquisa Ativa: <strong className="text-slate-200">{activeSurvey.nome}</strong></span>
          </div>
        )}
      </div>

      {/* Barra de Níveis de Confiança Padrão com Preenchimento de Z-score */}
      {activeSurvey && (
        <div className="rounded-xl border border-slate-800 bg-[#16171d] p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Níveis de Confiança Padrão</span>
                <span className="text-[10px] text-blue-400 font-mono">
                  (Atual: {activeSurvey.nivelConfiancaPercentual || 95}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
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
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/40'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span>{std.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-blue-700 text-white' : 'bg-slate-800 text-blue-400'
                  }`}>
                    Z = {std.zScore.toFixed(3).replace('.', ',')}
                  </span>
                </button>
              );
            })}

            {simulatorTab === 'coleta' && (
              <button
                type="button"
                id="btn-ver-grafico-dispersao-quick"
                onClick={() => setSimulatorTab('amostragem')}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors ml-1"
              >
                <Calculator className="h-3.5 w-3.5" />
                <span>Ver Dispersão</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Alerta de Feedback de Confiança Rápida */}
      {quickConfidenceFeedback && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-300 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{quickConfidenceFeedback}</span>
        </div>
      )}

      {simulatorTab === 'amostragem' ? (
        <PopulationSampleScatterSimulator activeSurvey={activeSurvey} />
      ) : !activeSurvey || !hasValidQuestions ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-[#16171d] p-8 text-center shadow-xl space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
            <Smartphone className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-white">
            Nenhuma pergunta configurada para esta pesquisa
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Utilize a Calculadora Amostral para planejar o tamanho ideal da amostragem ou configure as perguntas no módulo de questionário.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setSimulatorTab('amostragem')}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-colors"
            >
              <Calculator className="h-4 w-4" />
              <span>Abrir Calculadora Amostral & Dispersão</span>
            </button>
            <button
              onClick={() => setActiveModule('pesquisas')}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
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
              <span className="rounded-md bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 text-xs font-bold text-blue-400">
                Coleta em Tempo Real & Coleta Web
              </span>
              <h1 className="mt-1 text-lg font-bold text-white">
                {activeSurvey.nome}
              </h1>
              <p className="text-xs text-slate-400">
                Ciclo {activeSurvey.cicloAtual} (v{activeSurvey.versao}) • Cód: {activeSurvey.codigo}
              </p>
            </div>

            {/* Live status indicators */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSimulatorTab('amostragem')}
                className="hidden sm:flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-600/10 px-2 py-1 text-[11px] font-semibold text-blue-400 hover:bg-blue-600/20 transition-colors"
              >
                <Calculator className="h-3 w-3" />
                <span>Calcular Amostra (n)</span>
              </button>

              <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#16171d] px-2.5 py-1 text-[11px] font-semibold text-slate-300 shadow-xs">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                <span>GPS Ativo</span>
              </div>

          {!isAudioEnabled ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] font-medium text-slate-500">
              <MicOff className="h-3.5 w-3.5" />
              <span>Áudio Desativado</span>
            </div>
          ) : !hasAudioStarted ? (
            <div
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300"
              title={`A gravação será iniciada a partir da pergunta ${
                activeSurvey.perguntas[audioStartQuestionIndex]?.codigo || 'configurada'
              }`}
            >
              <Clock className="h-3.5 w-3.5 animate-pulse text-amber-400" />
              <span>Inicia na {activeSurvey.perguntas[audioStartQuestionIndex]?.codigo || 'Ponto'}</span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold shadow-xs ${
                isAudioAtLimit
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  : 'border-purple-500/30 bg-purple-600/20 text-purple-300'
              }`}
              title={`Gravação de áudio em andamento (limite: ${configuredMinutes} min)`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isAudioAtLimit
                    ? 'bg-amber-400'
                    : 'bg-red-500 animate-pulse'
                }`}
              />
              <Mic className="h-3.5 w-3.5" />
              <span className="font-mono">
                {formatAudioDuration(audioSeconds)} / {configuredMinutes}m
              </span>
              {isAudioAtLimit && <span className="text-[10px] text-amber-400 font-bold">(Máx)</span>}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Finalizar Formulário - Gravar ou Descartar */}
      {confirmFinalizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#16171d] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <CheckSquare className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Finalizar Formulário</h3>
                  <p className="text-xs text-slate-400">Status da entrevista em andamento</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmFinalizeModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#111218] p-4 space-y-2.5">
              <p className="text-sm font-semibold text-slate-200">
                Deseja gravar o formulário atual ou descartá-lo?
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800/80">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Respondidas</span>
                  <span className="text-sm font-bold text-blue-400">
                    {Object.keys(answers).length} de {activeSurvey.perguntas.length}
                  </span>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800/80">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Áudio de Campo</span>
                  <span className="text-sm font-bold text-purple-400">
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 transition active:scale-[0.99]"
              >
                <Save className="h-4 w-4" />
                <span>Gravar Formulário Atual</span>
              </button>

              <button
                id="btn-descartar-formulario"
                type="button"
                onClick={handleDiscardForm}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition active:scale-[0.99]"
              >
                <Trash2 className="h-4 w-4" />
                <span>Descartar Formulário</span>
              </button>

              <button
                id="btn-continuar-preenchendo"
                type="button"
                onClick={() => setConfirmFinalizeModalOpen(false)}
                className="flex w-full items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                Continuar Preenchendo
              </button>
            </div>
          </div>
        </div>
      )}

      {isCompleted ? (
        <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-8 text-center shadow-xl space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {wasSavedOffline
              ? 'Pesquisa Finalizada e Armazenada no Navegador!'
              : 'Pesquisa Finalizada e Sincronizada!'}
          </h2>

          {wasSavedOffline ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Armazenado Offline com Sucesso</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Você está sem conexão de internet no momento. Todo o progresso foi salvo com segurança no seu navegador (IndexedDB) e será sincronizado automaticamente quando o sinal de internet for reestabelecido.
              </p>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-amber-500/20 flex flex-wrap justify-between gap-2">
                <span>Pesquisador: <strong className="text-slate-200">{currentUser.nome}</strong></span>
                <span>Armazenamento local persistido</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Os dados coletados pelo pesquisador <strong className="text-slate-200">{currentUser.nome}</strong>, coordenadas GPS e gravação de áudio foram registrados e sincronizados com sucesso nos servidores.
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3 pt-2">
            <button
              id="btn-nova-coleta"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 shadow-sm hover:bg-slate-700 hover:text-white transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Realizar Nova Coleta</span>
            </button>
            <button
              id="btn-ver-respostas-coletadas"
              onClick={() => setActiveModule('respostas')}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-colors"
            >
              Ver Respostas Registradas
            </button>
          </div>
        </div>
      ) : isReviewStep ? (
        /* Finalization Step: Review before final submission */
        <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="rounded-md bg-blue-600/20 border border-blue-500/30 px-2.5 py-0.5 text-xs font-bold text-blue-400">
                Etapa Final
              </span>
              <h2 className="text-lg font-bold text-white mt-1">Finalizar Pesquisa de Campo</h2>
              <p className="text-xs text-slate-400">
                Confirme os dados antes de gravar e encerrar oficialmente o formulário.
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <CheckSquare className="h-5 w-5" />
            </div>
          </div>

          {/* Nome do pesquisador atualmente logado marcado como padrão */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pesquisador Responsável da Coleta
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base font-bold text-white">{currentUser.nome}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shadow-xs">
                    <CheckCircle2 className="h-3 w-3" /> Padrão (Usuário Logado)
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>Login: <strong className="font-mono text-slate-300">@{currentUser.login || currentUser.email}</strong></span>
                  <span>•</span>
                  <span>ID: <strong className="font-mono text-slate-300">{currentUser.id}</strong></span>
                  <span>•</span>
                  <span>Perfil: <strong className="text-slate-300">{currentProfile?.name || 'Pesquisador'}</strong></span>
                </div>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md">
                {currentUser.nome.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Resumo da Coleta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-800 bg-[#111218] p-3.5">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Questões</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                {Object.keys(answers).length} de {activeSurvey.perguntas.length}
              </span>
              <span className="text-[10px] text-slate-400">Respostas preenchidas</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#111218] p-3.5">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Áudio Gravado</span>
              <span className="text-base font-bold text-purple-400 mt-0.5 block font-mono">
                {formatAudioDuration(audioSeconds)}
              </span>
              <span className="text-[10px] text-slate-400">Gravação de campo</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#111218] p-3.5">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Geolocalização</span>
              <span className="text-base font-bold text-emerald-400 mt-0.5 block flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> GPS Registrado
              </span>
              <span className="text-[10px] text-slate-400">Coordenadas fixadas</span>
            </div>
          </div>

          {/* Status de Conectividade com a Internet */}
          {effectiveOnline ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
              <Wifi className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-emerald-300">Conexão com a Internet Ativa</p>
                <p className="text-[11px] text-emerald-400/80 mt-0.5">
                  A pesquisa será sincronizada imediatamente com os servidores centrais.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
              <WifiOff className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-amber-300">Sem Sinal de Internet (Modo Offline)</p>
                <p className="text-[11px] text-amber-400/80 mt-0.5">
                  Todo o progresso será armazenado de forma segura no seu navegador (IndexedDB) e sincronizado automaticamente quando o sinal retornar.
                </p>
              </div>
            </div>
          )}

          {/* Ações da Etapa Final */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setIsReviewStep(false)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition w-full sm:w-auto justify-center"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar às Perguntas</span>
            </button>

            <button
              id="btn-finalizar-pesquisa"
              type="button"
              disabled={isSaving}
              onClick={handleSubmitFinal}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition active:scale-95 disabled:opacity-50 w-full sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSaving ? 'Gravando progresso...' : 'Finalizar Pesquisa'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active Question Card */
        <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-6 shadow-xl">
          {/* Progress header & Finalizar formulário button */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>
                Pergunta {currentQuestionIndex + 1} de {activeSurvey.perguntas.length}
              </span>
              <span className="font-bold text-blue-400">
                ({currentQuestion?.codigo || 'Q'})
              </span>
            </div>

            {/* Botão de Finalizar Formulário no cabeçalho */}
            <button
              id="btn-finalizar-formulario"
              onClick={() => setConfirmFinalizeModalOpen(true)}
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors shadow-xs"
              title="Finalizar o formulário agora (gravar ou descartar)"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Finalizar formulário</span>
            </button>
          </div>

          {currentQuestion && (
            <div className="mt-4">
              <h3 className="text-base font-bold text-white">
                {currentQuestion.enunciado}
                {currentQuestion.obrigatoria && (
                  <span className="ml-1 text-blue-400">*</span>
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
                          ? 'border-blue-500 bg-blue-600/20 text-white font-bold'
                          : 'border-slate-800 bg-[#111218] text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        value={opt.value}
                        checked={answers[currentQuestion.id] === opt.value}
                        onChange={() =>
                          setAnswers({ ...answers, [currentQuestion.id]: opt.value })
                        }
                        className="text-blue-600 focus:ring-blue-500"
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
                            ? 'border-blue-500 bg-blue-600/20 text-white font-bold'
                            : 'border-slate-800 bg-[#111218] text-slate-300 hover:bg-slate-800/60'
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
                          className="rounded text-blue-600 focus:ring-blue-500"
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
                        onClick={() => setAnswers({ ...answers, [currentQuestion.id]: opt })}
                        className={`rounded-xl border p-3.5 text-xs font-bold transition ${
                          answers[currentQuestion.id] === opt
                            ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                            : 'border-slate-800 bg-[#111218] text-slate-300 hover:bg-slate-800'
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
                            setAnswers({ ...answers, [currentQuestion.id]: String(n) })
                          }
                          className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold text-xs transition ${
                            answers[currentQuestion.id] === String(n)
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                              : 'border border-slate-800 bg-[#111218] text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-slate-400">
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
                    placeholder="Digite a resposta do entrevistado..."
                    className="w-full rounded-xl border border-slate-800 bg-[#111218] p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
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
                    placeholder="Informe o valor numérico..."
                    className="w-full rounded-xl border border-slate-800 bg-[#111218] p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-800 bg-[#111218] p-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* Navigation controls */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-1 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Anterior</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmFinalizeModalOpen(true)}
                className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Finalizar formulário</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500 active:scale-95"
              >
                <span>
                  {currentQuestionIndex === activeSurvey.perguntas.length - 1
                    ? 'Finalizar Pesquisa'
                    : 'Avançar'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};
