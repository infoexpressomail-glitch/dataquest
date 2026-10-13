import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MousePointerClick,
  RotateCcw,
  Send,
  WifiOff,
} from 'lucide-react';
import type { AnswerMap, AnswerValue, ConditionalRule, Question, Survey } from '../../../types';
import { getTheme, resolveImageUrl } from '../mobile-premium/mobilePremiumUtils';
import { QuestionCard } from '../mobile-premium/QuestionCard';
import {
  beginTotemSession,
  endTotemSession,
  type TotemEndReason,
} from '../../../totem/totemStatsStore';
import '../mobile-premium/mobilePremium.css';
import './totem.css';

export interface TotemSurveyProps {
  survey: Survey;
  /** Grava a coleta final. Recebe as respostas e os comentários. */
  onSubmit: (answers: AnswerMap, comments: Record<string, string>) => Promise<void> | void;
  /** Quando true, a última coleta foi guardada offline. */
  savedOffline?: boolean;
  /** Controles do operador (sair, trocar pesquisa) exibidos na tela de atração. */
  operatorSlot?: React.ReactNode;
}

type TotemPhase = 'attract' | 'active' | 'confirm' | 'sending' | 'thanks';

const DEFAULTS = {
  autoStart: false,
  autoStartDelaySeconds: 5,
  autoAdvanceDelayMs: 420,
  inactivityResetSeconds: 150,
  confirmBeforeSubmit: true,
  thankYouSeconds: 8,
  showBackButton: true,
};

/** Tipos cuja resposta é escolhida com um único toque (avanço automático). */
function isSingleTapQuestion(question: Question): boolean {
  if (question.tipo === 'texto_aberto' || question.tipo === 'data_hora') return false;
  if (question.tipo === 'multipla_selecao') return false;
  // Perguntas com comentário opcional precisam de tempo para digitar.
  if (question.visual?.commentEnabled) return false;
  return true;
}

/**
 * TotemSurvey — renderizador do Modo Totem (tablet em quiosque).
 *
 * Fluxo desassistido do início ao fim:
 *   atração → (toque ou início automático) → perguntas com AVANÇO AUTOMÁTICO
 *   ao escolher uma alternativa → confirmação "Deseja finalizar e enviar?"
 *   → agradecimento → volta sozinho para a atração (pronto para o próximo).
 *
 * Sempre há botão Voltar em todas as questões e a confirmação final antes do
 * envio. Reutiliza o visual "Mobile First Premium" (cards, ícones, smiles,
 * escalas e imagens) para manter a consistência das pesquisas já configuradas.
 */
export const TotemSurvey: React.FC<TotemSurveyProps> = ({
  survey,
  onSubmit,
  savedOffline,
  operatorSlot,
}) => {
  const cfg = useMemo(() => ({ ...DEFAULTS, ...(survey.totemConfig || {}) }), [survey.totemConfig]);
  const theme = useMemo(() => getTheme(survey), [survey]);
  const questions = useMemo(
    () => [...(survey.perguntas || [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [survey]
  );

  const [phase, setPhase] = useState<TotemPhase>('attract');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [autoStartIn, setAutoStartIn] = useState<number>(cfg.autoStartDelaySeconds);
  const [thankIn, setThankIn] = useState<number>(cfg.thankYouSeconds);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sessão de coleta em andamento no relatório do totem (contagem/tempo/taxa).
  const sessionIdRef = useRef<string | null>(null);
  const answersRef = useRef<AnswerMap>({});

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const total = questions.length;
  const currentQuestion = questions[index];

  // ---------------------------------------------------------------------------
  // Regras condicionais (mesma semântica do CollectionSimulator)
  // ---------------------------------------------------------------------------
  const isHiddenByRule = useCallback(
    (candidateId: string, given: AnswerMap): boolean =>
      (survey.regras ?? []).some((r: ConditionalRule) => {
        if (r.acao !== 'esconder_pergunta' || r.perguntaDestinoId !== candidateId) return false;
        const origin = given[r.perguntaOrigemId];
        if (origin === undefined || origin === null) return false;
        const val = String(origin).trim().toLowerCase();
        const ruleVal = String(r.valorComparacao ?? '').trim().toLowerCase();
        return (
          (r.condicao === 'igual' && val === ruleVal) ||
          (r.condicao === 'diferente' && val !== ruleVal) ||
          (r.condicao === 'contem' && val.includes(ruleVal))
        );
      }),
    [survey.regras]
  );

  const matchedRuleFor = useCallback(
    (questionId: string, value: AnswerValue): ConditionalRule | undefined =>
      (survey.regras ?? []).find((r) => {
        if (r.perguntaOrigemId !== questionId) return false;
        const val = String(value ?? '').trim().toLowerCase();
        const ruleVal = String(r.valorComparacao ?? '').trim().toLowerCase();
        if (r.condicao === 'igual') return val === ruleVal;
        if (r.condicao === 'diferente') return val !== ruleVal;
        if (r.condicao === 'contem') return val.includes(ruleVal);
        return false;
      }),
    [survey.regras]
  );

  const nextVisibleIndex = useCallback(
    (from: number, given: AnswerMap): number => {
      for (let i = from + 1; i < total; i++) {
        if (!isHiddenByRule(questions[i].id, given)) return i;
      }
      return -1;
    },
    [isHiddenByRule, questions, total]
  );

  const prevVisibleIndex = useCallback(
    (from: number, given: AnswerMap): number => {
      for (let i = from - 1; i >= 0; i--) {
        if (!isHiddenByRule(questions[i].id, given)) return i;
      }
      return -1;
    },
    [isHiddenByRule, questions]
  );

  // ---------------------------------------------------------------------------
  // Controle do quiosque
  // ---------------------------------------------------------------------------
  const clearTimers = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    if (idleRef.current) {
      clearTimeout(idleRef.current);
      idleRef.current = null;
    }
  }, []);

  const resetToAttract = useCallback(
    (reason: TotemEndReason = 'abandoned') => {
      clearTimers();
      // Sessão iniciada e não concluída → conta como abandono no relatório.
      if (sessionIdRef.current) {
        endTotemSession(sessionIdRef.current, {
          completed: false,
          reason,
          answersCount: Object.keys(answersRef.current).length,
        });
        sessionIdRef.current = null;
      }
      setAnswers({});
      setComments({});
      setIndex(0);
      setAutoStartIn(cfg.autoStartDelaySeconds);
      setThankIn(cfg.thankYouSeconds);
      setPhase('attract');
    },
    [clearTimers, cfg.autoStartDelaySeconds, cfg.thankYouSeconds]
  );

  const startSurvey = useCallback(() => {
    clearTimers();
    setAnswers({});
    setComments({});
    setIndex(0);
    // Abre a sessão de coleta para o relatório do totem.
    sessionIdRef.current = beginTotemSession(survey);
    setPhase('active');
  }, [clearTimers, survey]);

  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch {
      // Navegador sem suporte/permissão — ignora silenciosamente.
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Finalização / envio
  // ---------------------------------------------------------------------------
  const finishOrConfirm = useCallback(
    (merged: AnswerMap) => {
      setAnswers(merged);
      if (cfg.confirmBeforeSubmit) {
        setPhase('confirm');
      } else {
        setPhase('sending');
      }
    },
    [cfg.confirmBeforeSubmit]
  );

  const goNext = useCallback(
    (extra: AnswerMap = {}) => {
      if (!currentQuestion) return;
      const merged = { ...answers, ...extra };
      const value = merged[currentQuestion.id];
      const rule = matchedRuleFor(currentQuestion.id, value);

      if (rule?.acao === 'finalizar_formulario') {
        finishOrConfirm(merged);
        return;
      }
      if (rule?.acao === 'saltar_para' && rule.perguntaDestinoId) {
        const dest = questions.findIndex((q) => q.id === rule.perguntaDestinoId);
        if (dest !== -1) {
          setAnswers(merged);
          setIndex(dest);
          return;
        }
      }

      const next = nextVisibleIndex(index, merged);
      if (next === -1) {
        finishOrConfirm(merged);
      } else {
        setAnswers(merged);
        setIndex(next);
      }
    },
    [answers, currentQuestion, finishOrConfirm, index, matchedRuleFor, nextVisibleIndex, questions]
  );

  const handleAnswer = useCallback(
    (question: Question, value: AnswerValue) => {
      setAnswers((prev) => ({ ...prev, [question.id]: value }));
      if (isSingleTapQuestion(question)) {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = setTimeout(() => {
          autoAdvanceRef.current = null;
          goNext({ [question.id]: value });
        }, cfg.autoAdvanceDelayMs);
      }
    },
    [cfg.autoAdvanceDelayMs, goNext]
  );

  const handleNextClick = useCallback(() => {
    if (!currentQuestion) return;
    const value = answers[currentQuestion.id];
    const empty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);
    if (currentQuestion.obrigatoria && empty) {
      alert('Esta pergunta é obrigatória. Por favor, escolha uma resposta para prosseguir.');
      return;
    }
    goNext();
  }, [answers, currentQuestion, goNext]);

  const handleBack = useCallback(() => {
    clearTimers();
    if (index <= 0) {
      // Na primeira questão, "Voltar" retorna à tela de atração.
      resetToAttract();
      return;
    }
    const prev = prevVisibleIndex(index, answers);
    setIndex(prev >= 0 ? prev : 0);
  }, [answers, clearTimers, index, prevVisibleIndex, resetToAttract]);

  const handleConfirmSubmit = useCallback(() => {
    clearTimers();
    setPhase('sending');
  }, [clearTimers]);

  const handleConfirmReview = useCallback(() => {
    // "Não": volta para a última questão visível para revisar.
    const last = (() => {
      for (let i = total - 1; i >= 0; i--) {
        if (!isHiddenByRule(questions[i].id, answers)) return i;
      }
      return 0;
    })();
    setIndex(last);
    setPhase('active');
  }, [answers, isHiddenByRule, questions, total]);

  // ---------------------------------------------------------------------------
  // Efeitos: início automático, agradecimento e inatividade
  // ---------------------------------------------------------------------------
  // Envio: dispara a gravação e vai para a tela de agradecimento.
  useEffect(() => {
    if (phase !== 'sending') return;
    let active = true;
    Promise.resolve()
      .then(() => onSubmit(answers, comments))
      .catch(() => undefined)
      .finally(() => {
        if (!active) return;
        // Coleta concluída e enviada → registra no relatório do totem.
        if (sessionIdRef.current) {
          endTotemSession(sessionIdRef.current, {
            completed: true,
            reason: 'submitted',
            answersCount: Object.keys(answersRef.current).length,
          });
          sessionIdRef.current = null;
        }
        setPhase('thanks');
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Tela de atração: contagem para o início automático.
  useEffect(() => {
    if (phase !== 'attract' || !cfg.autoStart) return;
    if (autoStartIn <= 0) {
      // Transição disparada de forma assíncrona para não sincronizar setState no efeito.
      Promise.resolve().then(() => startSurvey());
      return;
    }
    const t = setTimeout(() => setAutoStartIn((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, cfg.autoStart, autoStartIn, startSurvey]);

  // Tela de agradecimento: volta sozinho para a atração (próximo respondente).
  useEffect(() => {
    if (phase !== 'thanks') return;
    if (thankIn <= 0) {
      // Transição disparada de forma assíncrona para não sincronizar setState no efeito.
      Promise.resolve().then(() => resetToAttract());
      return;
    }
    const t = setTimeout(() => setThankIn((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, thankIn, resetToAttract]);

  // Inatividade: volta à atração para não deixar coleta pela metade.
  const bumpIdle = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current);
    const seconds = cfg.inactivityResetSeconds;
    if (!seconds || seconds <= 0) return;
    if (phase !== 'active' && phase !== 'confirm') return;
    idleRef.current = setTimeout(() => resetToAttract('inactivity'), seconds * 1000);
  }, [cfg.inactivityResetSeconds, phase, resetToAttract]);

  useEffect(() => {
    bumpIdle();
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, [bumpIdle]);

  // Limpa timers e encerra a sessão em andamento ao desmontar (ex.: o operador
  // troca de pesquisa ou sai do totem no meio de uma coleta).
  useEffect(
    () => () => {
      clearTimers();
      if (sessionIdRef.current) {
        endTotemSession(sessionIdRef.current, {
          completed: false,
          reason: 'abandoned',
          answersCount: Object.keys(answersRef.current).length,
        });
        sessionIdRef.current = null;
      }
    },
    [clearTimers]
  );

  // ---------------------------------------------------------------------------
  // Renderização
  // ---------------------------------------------------------------------------
  const styleVars = {
    '--mp-primary': theme.primary,
    '--mp-primary-dark': theme.primaryDark,
    '--mp-secondary': theme.secondary,
  } as React.CSSProperties;

  const percent =
    phase === 'thanks'
      ? 100
      : total > 0
      ? Math.round((Math.min(index, total - 1) / total) * 100)
      : 0;

  const autoAdvanceCurrent = !!currentQuestion && isSingleTapQuestion(currentQuestion);
  const isLastVisible = currentQuestion ? nextVisibleIndex(index, answers) === -1 : true;
  const answeredCount = Object.keys(answers).filter(
    (k) =>
      answers[k] !== undefined &&
      answers[k] !== '' &&
      !(Array.isArray(answers[k]) && answers[k].length === 0)
  ).length;

  if (total === 0) {
    return (
      <div className="mp-root totem-root" style={styleVars}>
        <div className="totem-empty">
          <h1>Pesquisa sem perguntas</h1>
          <p>Configure as perguntas no ambiente de gestão para usar o Modo Totem.</p>
        </div>
      </div>
    );
  }

  const cover = resolveImageUrl(survey.coverImage);

  return (
    <div
      className="mp-root totem-root"
      role="presentation"
      style={styleVars}
      onPointerDown={bumpIdle}
      onKeyDown={bumpIdle}
    >
      {/* ----------------------------- ATRAÇÃO ----------------------------- */}
      {phase === 'attract' && (
        <div className="totem-attract mp-anim-fade">
          <div className="totem-operator">{operatorSlot}</div>

          <div className="totem-attract-card">
            {cover && (
              <div className="totem-attract-media">
                <img src={cover} alt="" />
              </div>
            )}

            <div className="totem-attract-body">
              {survey.logoImage ? (
                <div className="totem-attract-logo">
                  <img src={survey.logoImage} alt={survey.institutionName || 'Logo'} />
                </div>
              ) : null}

              {survey.institutionName && (
                <div className="totem-institution" style={{ color: theme.primary }}>
                  {survey.institutionName}
                </div>
              )}

              <h1 className="totem-attract-title">{survey.nome}</h1>
              {survey.descricao && <p className="totem-attract-desc">{survey.descricao}</p>}
              {survey.welcomeMessage && (
                <p className="totem-attract-desc">{survey.welcomeMessage}</p>
              )}

              <div className="totem-attract-meta">
                <span>{total} pergunta{total === 1 ? '' : 's'}</span>
                <span>•</span>
                <span>~{Math.max(1, Math.ceil(total * 0.4))} min</span>
                <span>•</span>
                <span>Anônimo e confidencial</span>
              </div>

              <button
                type="button"
                className="totem-start-btn"
                style={{ background: theme.primary }}
                onClick={startSurvey}
              >
                <MousePointerClick size={28} />
                <span>{survey.startButtonLabel || 'Toque para começar'}</span>
              </button>

              {cfg.autoStart && (
                <p className="totem-autostart">
                  Início automático em <strong>{Math.max(0, autoStartIn)}s</strong>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            className="totem-fullscreen"
            onClick={requestFullscreen}
            aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          </button>
        </div>
      )}

      {/* ----------------------------- PERGUNTAS ---------------------------- */}
      {(phase === 'active' || phase === 'confirm') && currentQuestion && (
        <div className="totem-stage">
          <header className="totem-topbar">
            <div className="totem-progress">
              <div className="totem-progress-meta">
                <span>
                  Pergunta <strong>{index + 1}</strong> de {total}
                </span>
                <span>{percent}%</span>
              </div>
              <div className="totem-progress-track">
                <span className="totem-progress-fill" style={{ width: `${percent}%` }} />
              </div>
            </div>
            <div className="totem-topbar-operator">{operatorSlot}</div>
          </header>

          <main className="totem-question-area">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="totem-question-card"
              >
                <QuestionCard
                  question={currentQuestion}
                  value={answers[currentQuestion.id]}
                  comment={comments[currentQuestion.id]}
                  theme={theme}
                  disabled={phase === 'confirm'}
                  onAnswer={(value) => handleAnswer(currentQuestion, value)}
                  onComment={(text) =>
                    setComments((prev) => ({ ...prev, [currentQuestion.id]: text }))
                  }
                />
              </motion.div>
            </AnimatePresence>

            {autoAdvanceCurrent && phase === 'active' && (
              <p className="totem-auto-hint" aria-live="polite">
                Selecione uma opção para avançar automaticamente
              </p>
            )}
          </main>

          <footer className="totem-footer">
            {cfg.showBackButton && (
              <button type="button" className="totem-btn totem-btn-ghost" onClick={handleBack}>
                <ArrowLeft size={22} />
                <span>Voltar</span>
              </button>
            )}

            {!autoAdvanceCurrent && (
              <button
                type="button"
                className="totem-btn totem-btn-primary"
                style={{ background: theme.primary }}
                onClick={handleNextClick}
              >
                <span>{isLastVisible ? 'Finalizar' : 'Próxima'}</span>
                {isLastVisible ? <CheckCircle2 size={22} /> : <ArrowRight size={22} />}
              </button>
            )}
            {autoAdvanceCurrent && isLastVisible && (
              <button
                type="button"
                className="totem-btn totem-btn-primary"
                style={{ background: theme.primary }}
                onClick={handleNextClick}
              >
                <span>Finalizar</span>
                <CheckCircle2 size={22} />
              </button>
            )}
          </footer>

          {/* ----------------------- CONFIRMAÇÃO FINAL ---------------------- */}
          {phase === 'confirm' && (
            <div className="totem-overlay" role="dialog" aria-modal="true">
              <div className="totem-confirm mp-anim-scale">
                <div className="totem-confirm-icon">
                  <CheckCircle2 size={40} />
                </div>
                <h2>Deseja finalizar o formulário e enviar?</h2>
                <p>
                  Você respondeu <strong>{answeredCount}</strong> de <strong>{total}</strong>{' '}
                  pergunta(s). Ao confirmar, suas respostas serão registradas.
                </p>
                <div className="totem-confirm-actions">
                  <button
                    type="button"
                    className="totem-btn totem-btn-success"
                    onClick={handleConfirmSubmit}
                  >
                    <Send size={20} />
                    <span>Sim, finalizar e enviar</span>
                  </button>
                  <button
                    type="button"
                    className="totem-btn totem-btn-ghost"
                    onClick={handleConfirmReview}
                  >
                    <ArrowLeft size={20} />
                    <span>Não, revisar respostas</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------ ENVIO ------------------------------ */}
      {phase === 'sending' && (
        <div className="totem-center mp-anim-fade">
          <div className="totem-spinner" />
          <h2>Enviando suas respostas…</h2>
          <p>Aguarde um instante.</p>
        </div>
      )}

      {/* --------------------------- AGRADECIMENTO ------------------------- */}
      {phase === 'thanks' && (
        <div className="totem-thanks mp-anim-scale">
          <div className={`totem-thanks-icon ${savedOffline ? 'is-offline' : ''}`}>
            {savedOffline ? <WifiOff size={54} /> : <CheckCircle2 size={54} />}
          </div>
          <h1>{savedOffline ? 'Respostas salvas neste dispositivo' : 'Obrigado por participar!'}</h1>
          <p>
            {survey.finishMessage ||
              'Sua opinião é fundamental para melhorarmos os serviços públicos da nossa cidade.'}
          </p>
          {savedOffline && (
            <p className="totem-thanks-offline">
              Sem conexão no momento: a coleta foi guardada com segurança e será enviada
              automaticamente quando a internet voltar.
            </p>
          )}
          {survey.prefeituraMessage && (
            <div className="totem-institution-msg" style={{ background: `${theme.primary}14`, color: theme.primary }}>
              {survey.prefeituraMessage}
            </div>
          )}

          <p className="totem-thanks-countdown">
            Próxima pesquisa em <strong>{Math.max(0, thankIn)}s</strong>
          </p>
          <button type="button" className="totem-btn totem-btn-ghost" onClick={() => resetToAttract()}>
            <RotateCcw size={20} />
            <span>Iniciar agora</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TotemSurvey;
