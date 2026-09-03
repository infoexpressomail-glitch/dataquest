import { Question, QuestionType, QuestionOption } from '../types';

export interface ParsedQuestionnaireResult {
  questions: Question[];
  title?: string;
  description?: string;
  rawText?: string;
  totalAlternativesDetected: number;
}

/**
 * Intelligent questionnaire text parser
 * Parses questions with varying numbering styles (1., 01-, P01:, etc.)
 * and alternative styles (A), a., 1-, -, •, [ ], etc.)
 */
export function parseQuestionnaireText(input: string): ParsedQuestionnaireResult {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const questions: Question[] = [];
  let currentQuestion: Partial<Question> | null = null;
  let currentOptions: QuestionOption[] = [];
  let extractedTitle = '';
  let questionCounter = 0;
  let totalAlternatives = 0;

  // Regexes for detecting questions and options
  const questionNumberRegex = /^(?:(?:Q|P|QUEST[AÃ]O|PERGUNTA)\s*[-_.:]?\s*)?(\d+)[\s.:)-]+\s*(.+)$/i;
  const optionLetterRegex = /^(?:[-*•]\s*)?(?:\[\s*\]|\(\s*\))?\s*([A-Za-z0-9]+)[\s.):-]+\s*(.+)$/;
  const bulletOptionRegex = /^(?:[-*•]|\[\s*\]|\(\s*\))\s+(.+)$/;

  // Check if first line looks like a title
  if (lines.length > 0) {
    const firstLine = lines[0];
    if (
      !questionNumberRegex.test(firstLine) &&
      !firstLine.endsWith('?') &&
      firstLine.length < 120 &&
      (firstLine.toUpperCase() === firstLine || firstLine.includes('Pesquisa') || firstLine.includes('Questionário') || firstLine.includes('Censo'))
    ) {
      extractedTitle = firstLine.replace(/^#+\s*/, '').trim();
    }
  }

  const finalizeCurrentQuestion = () => {
    if (!currentQuestion || !currentQuestion.enunciado) return;

    questionCounter++;
    const qCode = currentQuestion.codigo || `P${String(questionCounter).padStart(2, '0')}`;
    const enunciado = currentQuestion.enunciado.trim();

    // Auto-detect question type based on options and keywords
    let detectedType: QuestionType = 'multipla_escolha';

    if (currentOptions.length === 0) {
      // No options detected
      const lowerEnunciado = enunciado.toLowerCase();
      if (
        lowerEnunciado.includes('de 0 a 10') ||
        lowerEnunciado.includes('nps') ||
        lowerEnunciado.includes('recomendaria')
      ) {
        detectedType = 'nps';
      } else if (
        lowerEnunciado.includes('data') ||
        lowerEnunciado.includes('quando ocorreu') ||
        lowerEnunciado.includes('horário')
      ) {
        detectedType = 'data_hora';
      } else {
        detectedType = 'texto_aberto';
      }
    } else if (currentOptions.length === 2) {
      const optLabels = currentOptions.map((o) => o.label.toLowerCase());
      if (
        (optLabels.includes('sim') && optLabels.includes('não')) ||
        (optLabels.includes('sim') && optLabels.includes('nao')) ||
        (optLabels.includes('yes') && optLabels.includes('no'))
      ) {
        detectedType = 'sim_nao';
      }
    } else if (currentOptions.length >= 3 && currentOptions.length <= 7) {
      const lowerEnunciado = enunciado.toLowerCase();
      const firstOpt = currentOptions[0].label.toLowerCase();
      const lastOpt = currentOptions[currentOptions.length - 1].label.toLowerCase();

      if (
        lowerEnunciado.includes('de 1 a 5') ||
        lowerEnunciado.includes('escala') ||
        (firstOpt.includes('péssimo') || firstOpt.includes('muito ruim') || firstOpt.includes('discordo')) ||
        (lastOpt.includes('excelente') || lastOpt.includes('muito bom') || lastOpt.includes('concordo'))
      ) {
        detectedType = 'escala_numerica';
      } else if (
        lowerEnunciado.includes('quantos quiser') ||
        lowerEnunciado.includes('mais de uma') ||
        lowerEnunciado.includes('quais') ||
        lowerEnunciado.includes('marque todas')
      ) {
        detectedType = 'multipla_selecao';
      }
    }

    questions.push({
      id: `q_imp_${Date.now()}_${questionCounter}`,
      codigo: qCode,
      enunciado,
      tipo: detectedType,
      obrigatoria: true,
      ordem: questionCounter,
      opcoes: currentOptions.length > 0 ? [...currentOptions] : undefined,
      escalaMin: detectedType === 'escala_numerica' ? 1 : undefined,
      escalaMax: detectedType === 'escala_numerica' ? (currentOptions.length > 0 ? currentOptions.length : 5) : undefined,
      escalaMinLabel: detectedType === 'escala_numerica' && currentOptions[0] ? currentOptions[0].label : undefined,
      escalaMaxLabel: detectedType === 'escala_numerica' && currentOptions.length > 0 ? currentOptions[currentOptions.length - 1].label : undefined,
    });

    totalAlternatives += currentOptions.length;
    currentQuestion = null;
    currentOptions = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is CSV / table header
    if (i === 0 && (line.toLowerCase().includes('enunciado') || line.toLowerCase().includes('codigo;'))) {
      continue;
    }

    // Check if line is a question
    const qMatch = line.match(questionNumberRegex);
    const looksLikeQuestion =
      qMatch ||
      line.endsWith('?') ||
      (/^(\d+)[.)-]\s+/.test(line) && !line.match(/^[a-dA-D][.)-]/)) ||
      (line.startsWith('P') && /P\d{1,2}[:.-]/.test(line));

    // Notice: if line starts with a letter option like A) or B), it's NOT a question, even if it ends with ?
    const isOptionLine =
      /^[a-zA-Z][.)-]\s+/.test(line) ||
      /^[-*•]\s+/.test(line) ||
      /^\[\s*\]\s+/.test(line) ||
      /^\(\s*\)\s+/.test(line) ||
      (currentQuestion !== null && /^\d+[\s.:-]+[A-Za-zÀ-ÿ]/.test(line) && !line.endsWith('?'));

    if (looksLikeQuestion && !isOptionLine) {
      finalizeCurrentQuestion();

      let qText = line;
      let qNum: string | undefined;

      if (qMatch) {
        qNum = qMatch[1];
        qText = qMatch[2];
      } else {
        // Strip prefix like "1. " or "P01 - "
        qText = line.replace(/^(?:(?:Q|P|QUEST[AÃ]O|PERGUNTA)\s*[-_.:]?\s*)?\d+[\s.:)-]+\s*/i, '');
      }

      const qCode = qNum ? `P${String(qNum).padStart(2, '0')}` : `P${String(questionCounter + 1).padStart(2, '0')}`;

      currentQuestion = {
        codigo: qCode,
        enunciado: qText,
      };
      currentOptions = [];
      continue;
    }

    // If we have an active question, try parsing as an alternative/option
    if (currentQuestion) {
      let optLabel = '';

      const letterMatch = line.match(optionLetterRegex);
      const bulletMatch = line.match(bulletOptionRegex);

      if (letterMatch) {
        optLabel = letterMatch[2].trim();
      } else if (bulletMatch) {
        optLabel = bulletMatch[1].trim();
      } else if (line.includes(';') || line.includes('|')) {
        // Multiple options in single line separated by semicolon or pipe
        const parts = line.split(/[;|]/).map((p) => p.trim()).filter(Boolean);
        parts.forEach((p, idx) => {
          const cleanP = p.replace(/^[a-zA-Z0-9]+[.):-]\s*/, '').trim();
          if (cleanP) {
            currentOptions.push({
              id: `opt_${Date.now()}_${currentOptions.length + idx + 1}`,
              label: cleanP,
              value: cleanP,
            });
          }
        });
        continue;
      } else {
        // Fallback: take entire trimmed line as option
        optLabel = line.replace(/^[a-zA-Z0-9]+[.):-]\s*/, '').trim();
      }

      if (optLabel) {
        currentOptions.push({
          id: `opt_${Date.now()}_${currentOptions.length + 1}`,
          label: optLabel,
          value: optLabel,
        });
      }
    }
  }

  finalizeCurrentQuestion();

  return {
    questions,
    title: extractedTitle,
    rawText: input,
    totalAlternativesDetected: totalAlternatives,
  };
}

/**
 * Pre-formatted questionnaire templates to facilitate testing and instant import
 */
export const QUESTIONNAIRE_TEMPLATES = [
  {
    id: 'tpl_opiniao_publica',
    title: 'Pesquisa de Opinião Pública & Serviços Municipais',
    description: 'Avaliação de serviços públicos urbanos, saúde, transporte, iluminação e perfil.',
    content: `Pesquisa de Opinião Pública - Gestão Municipal 2025

1. Você é morador do município ou visitante?
A) Morador do município
B) Visitante / Turista
C) Trabalho na cidade mas resido em outro município

2. Qual a sua faixa etária?
A) 16 a 24 anos
B) 25 a 34 anos
C) 35 a 49 anos
D) 50 a 64 anos
E) 65 anos ou mais

3. Em qual região da cidade você reside?
A) Centro Histórico
B) Zona Norte
C) Zona Sul / Praias
D) Zona Oeste
E) Distrito Rural

4. De modo geral, como você avalia os serviços de saúde pública municipais?
1 - Péssimo
2 - Ruim
3 - Regular
4 - Bom
5 - Excelente

5. Quais os principais problemas que necessitam de intervenção urgente no seu bairro? (Marque quantos quiser)
[ ] Pavimentação e recapeamento asfáltico
[ ] Iluminação pública e segurança
[ ] Limpeza urbana e coleta seletiva
[ ] Atendimento nas unidades de saúde
[ ] Transporte coletivo e linhas de ônibus
[ ] Áreas de lazer e praças

6. De 0 a 10, qual sua nota para a qualidade de vida na nossa cidade?

7. Descreva a principal melhoria que você gostaria de ver implementada na cidade nos próximos 12 meses:`,
  },
  {
    id: 'tpl_satisfacao_nps',
    title: 'Pesquisa de Satisfação & Atendimento (NPS)',
    description: 'Mapeamento de experiência, canais de contato, probabilidade de indicação e feedbacks.',
    content: `Pesquisa de Satisfação do Cidadão e Atendimento

1. Qual canal de atendimento você mais utilizou no último mês?
A) Balcão presencial
B) Aplicativo oficial no celular
C) Portal web na internet
D) Central telefônica / WhatsApp

2. O seu problema ou solicitação foi resolvido na primeira tentativa?
- Sim
- Não

3. Como você avalia a cordialidade e preparo da equipe de atendimento?
1 - Muito Insatisfeito
2 - Insatisfeito
3 - Neutro
4 - Satisfeito
5 - Muito Satisfeito

4. De 0 a 10, qual a probabilidade de recomendar os serviços municipais a um conhecido?

5. Deixe seus comentários, elogios ou sugestões para aprimorarmos o atendimento:`,
  },
  {
    id: 'tpl_eleitoral',
    title: 'Pesquisa Eleitoral & Intenção de Voto',
    description: 'Espontânea, estimulada, rejeição eleitoral e avaliação de mandatos.',
    content: `Pesquisa Eleitoral e Avaliação Política

1. Se a eleição fosse hoje, em quem você votaria para Prefeito? (Espontânea)

2. Se a eleição fosse hoje com estes candidatos, em quem você votaria? (Estimulada)
A) Candidato A (Coligação Esperança)
B) Candidato B (União Democrática)
C) Candidato C (Frente Popular)
D) Candidato D (Aliança Cidadã)
E) Branco / Nulo
F) Não Sabe / Indeciso

3. E em qual desses candidatos você NÃO votaria de jeito nenhum? (Rejeição)
[ ] Candidato A (Coligação Esperança)
[ ] Candidato B (União Democrática)
[ ] Candidato C (Frente Popular)
[ ] Candidato D (Aliança Cidadã)
[ ] Rejeita Todos
[ ] Não Rejeita Nenhum

4. Como você avalia a atual gestão municipal até o momento?
A) Ótima
B) Boa
C) Regular positiva
D) Regular negativa
E) Ruim
F) Péssima

5. O município está no caminho certo ou no caminho errado?
- Sim, caminho certo
- Não, caminho errado`,
  },
];
