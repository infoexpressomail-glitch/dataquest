import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Survey } from '../../../types';
import { MobilePremiumHeader, type MobilePremiumAudioStatus } from './MobilePremiumHeader';
import { QuestionCard } from './QuestionCard';
import { FooterNavigation } from './FooterNavigation';
import { CoverScreen } from './CoverScreen';
import { FinishScreen } from './FinishScreen';
import { getTheme } from './mobilePremiumUtils';
import './mobilePremium.css';

export interface MobilePremiumSurveyProps {
  survey: Survey;
  currentQuestionIndex: number;
  answers: Record<string, any>;
  comments: Record<string, string>;
  isCompleted: boolean;
  wasSavedOffline?: boolean;
  fieldMode?: boolean;
  saving?: boolean;
  /** Estado da gravação de áudio exibido no cabeçalho (coleta de campo). */
  audio?: MobilePremiumAudioStatus;
  onAnswer: (questionId: string, value: any) => void;
  onComment: (questionId: string, value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onSubmitFinal: () => void;
  onReset: () => void;
}

/**
 * MobilePremiumSurvey — renderizador completo do modelo
 * "Mobile First Premium (Opção 6)". Totalmente incremental: só é montado
 * quando a pesquisa possui `layoutStyle === 'MOBILE_PREMIUM'`; os modelos
 * DEFAULT/CARD/SIDEBAR continuam usando o fluxo original do CollectionSimulator.
 */
export const MobilePremiumSurvey: React.FC<MobilePremiumSurveyProps> = ({
  survey,
  currentQuestionIndex,
  answers,
  comments,
  isCompleted,
  wasSavedOffline,
  fieldMode,
  saving,
  audio,
  onAnswer,
  onComment,
  onNext,
  onPrev,
  onSubmitFinal,
  onReset,
}) => {
  const theme = useMemo(() => getTheme(survey), [survey.themeAccent, survey.themeSecondary]);
  const [started, setStarted] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeFont, setLargeFont] = useState(false);

  const questions = survey.perguntas || [];
  const total = Math.max(1, questions.length);
  const currentQuestion = questions[currentQuestionIndex];
  const isLast = currentQuestionIndex >= questions.length - 1;
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] !== undefined && answers[k] !== '' && !(Array.isArray(answers[k]) && answers[k].length === 0)
  ).length;

  // Percentual de conclusão: reflete a posição atual (ex.: 4 de 12 ≈ 33%),
  // chegando a 100% na tela final.
  const percent = isCompleted
    ? 100
    : Math.round((Math.min(currentQuestionIndex, total - 1) / total) * 100);

  useEffect(() => {
    if (isCompleted) setStarted(true);
  }, [isCompleted]);

  const rootClass = [
    'mp-root',
    highContrast ? 'mp-high-contrast' : '',
    largeFont ? 'mp-large-font' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const styleVars = {
    '--mp-primary': theme.primary,
    '--mp-primary-dark': theme.primaryDark,
    '--mp-secondary': theme.secondary,
  } as React.CSSProperties;

  // ----------------------------- Tela final ------------------------------
  if (isCompleted) {
    return (
      <div className={rootClass} style={styleVars}>
        <div className="mp-shell" style={{ paddingBottom: 24 }}>
          <FinishScreen
            survey={survey}
            theme={theme}
            wasSavedOffline={wasSavedOffline}
            onRestart={onReset}
          />
        </div>
      </div>
    );
  }

  // ------------------------------- Capa ----------------------------------
  if (!started) {
    return (
      <div className={rootClass} style={styleVars}>
        <div className="mp-shell" style={{ paddingBottom: 24 }}>
          <CoverScreen survey={survey} theme={theme} onStart={() => setStarted(true)} />
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className={rootClass} style={styleVars}>
        <div className="mp-shell" style={{ paddingBottom: 24 }}>
          <div className="mp-card">
            <h2 className="mp-question-title">Nenhuma pergunta disponível</h2>
            <p className="mp-cover-desc">
              Esta pesquisa ainda não possui perguntas configuradas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={rootClass} style={styleVars}>
      <div className="mp-shell">
        <MobilePremiumHeader
          survey={survey}
          percent={percent}
          current={currentQuestionIndex + 1}
          total={total}
          showPercent={survey.showProgressPercent !== false}
          showIndicator={survey.showQuestionIndicator !== false}
          highContrast={highContrast}
          largeFont={largeFont}
          onToggleHighContrast={() => setHighContrast((v) => !v)}
          onToggleLargeFont={() => setLargeFont((v) => !v)}
          audio={audio}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <QuestionCard
              question={currentQuestion}
              value={answers[currentQuestion.id]}
              comment={comments[currentQuestion.id]}
              theme={theme}
              onAnswer={(value) => onAnswer(currentQuestion.id, value)}
              onComment={(text) => onComment(currentQuestion.id, text)}
            />
          </motion.div>
        </AnimatePresence>

        {fieldMode && (
          <p
            className="mp-cover-desc"
            style={{ textAlign: 'center', marginTop: 14 }}
            aria-live="polite"
          >
            {answeredCount} resposta(s) registrada(s) de {total}
          </p>
        )}
      </div>

      <FooterNavigation
        canGoBack={currentQuestionIndex > 0}
        isLast={isLast}
        saving={saving}
        onBack={onPrev}
        onNext={onNext}
        onFinish={onSubmitFinal}
        nextLabel="Próxima"
        finishLabel="Finalizar"
      />
    </div>
  );
};
