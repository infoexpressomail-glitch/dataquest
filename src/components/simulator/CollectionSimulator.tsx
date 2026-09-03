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
} from 'lucide-react';
import { Survey, Question, InterviewSubmission, AnswerItem } from '../../types';
import { generatePlayableWavBlob, formatAudioDuration } from '../../utils/audioUtils';

export const CollectionSimulator: React.FC = () => {
  const { surveys, editingSurvey, currentUser, addSubmission, setActiveModule } = useApp();

  const activeSurvey: Survey | undefined =
    editingSurvey || surveys.find((s) => s.status === 'ativa') || surveys[0];

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [audioSeconds, setAudioSeconds] = useState<number>(0);
  const [audioTranscript, setAudioTranscript] = useState<string>('Gravação ambiental de campo');

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

  if (!activeSurvey || activeSurvey.perguntas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 bg-[#16171d] p-8 text-center shadow-xl">
        <Smartphone className="mx-auto h-10 w-10 text-slate-500" />
        <h3 className="mt-2 text-sm font-bold text-white">
          Nenhuma pergunta configurada para esta pesquisa
        </h3>
        <button
          onClick={() => setActiveModule('pesquisas')}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-colors"
        >
          Voltar para Pesquisas
        </button>
      </div>
    );
  }

  const currentQuestion: Question = activeSurvey.perguntas[currentQuestionIndex];

  // Evaluate conditional rules for this question
  const evaluateNextStep = (currentAns: any) => {
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
        handleSubmitFinal(currentAns);
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

    // Default: Next question
    if (currentQuestionIndex < activeSurvey.perguntas.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmitFinal(currentAns);
    }
  };

  const handleNext = () => {
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

  const handleSubmitFinal = (lastAnswer?: any) => {
    const finalAnswers = { ...answers };
    if (lastAnswer !== undefined) {
      finalAnswers[currentQuestion.id] = lastAnswer;
    }

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
    reader.onloadend = () => {
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
              transcricaoTrecho: 'Áudio gravado com sucesso durante a entrevista de campo.',
              audioUrl: audioDataUrl,
              iniciouNaPerguntaCodigo: startQuestionObj?.codigo || 'P01',
              tempoConfiguradoMinutos: configuredMinutes,
            }
          : undefined,
        geolocalizacao: {
          latitude: -23.55052 + (Math.random() - 0.5) * 0.02,
          longitude: -46.633308 + (Math.random() - 0.5) * 0.02,
          bairro: 'Jardins / Região Central',
          cidade: 'São Paulo',
        },
      };

      addSubmission(newSub);
      setIsCompleted(true);
    };
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsCompleted(false);
    setAudioSeconds(0);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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

      {isCompleted ? (
        <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">
            Entrevista Concluída e Sincronizada!
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Os dados coletados, coordenadas GPS e gravação de áudio foram registrados com sucesso no banco de dados e já estão disponíveis no dashboard de métricas e na visualização de respostas.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 shadow-sm hover:bg-slate-700 hover:text-white transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Realizar Nova Coleta</span>
            </button>
            <button
              onClick={() => setActiveModule('respostas')}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-colors"
            >
              Ver Respostas Registradas
            </button>
          </div>
        </div>
      ) : (
        /* Active Question Card */
        <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-6 shadow-xl">
          {/* Progress header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs text-slate-400">
            <span>
              Pergunta {currentQuestionIndex + 1} de {activeSurvey.perguntas.length}
            </span>
            <span className="font-bold text-blue-400">
              {currentQuestion.codigo}
            </span>
          </div>

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

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500 active:scale-95"
            >
              <span>
                {currentQuestionIndex === activeSurvey.perguntas.length - 1
                  ? 'Concluir Coleta'
                  : 'Avançar'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
