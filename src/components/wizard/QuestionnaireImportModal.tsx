import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  X,
  Copy,
  Layers,
  HelpCircle,
  Settings2,
  ListOrdered,
  FileText,
} from 'lucide-react';
import { Question, QuestionType, QuestionOption } from '../../types';
import {
  parseQuestionnaireText,
  QUESTIONNAIRE_TEMPLATES,
} from '../../utils/questionnaireParser';
import {
  parseStructuredQuestionnaire,
  generateStructuredImportTemplate,
  StructuredImportError,
} from '../../utils/questionnaireImportStandard';

interface QuestionnaireImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestions: (questions: Question[], mode: 'append' | 'replace') => void;
  surveyTitle?: string;
}

export const QuestionnaireImportModal: React.FC<QuestionnaireImportModalProps> = ({
  isOpen,
  onClose,
  onImportQuestions,
  surveyTitle,
}) => {
  const [activeStep, setActiveStep] = useState<'input' | 'review'>('input');
  const [inputText, setInputText] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [structuredErrors, setStructuredErrors] = useState<StructuredImportError[]>([]);

  if (!isOpen) return null;

  const looksLikeStructuredStandard = (text: string): boolean => {
    const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
    const normalized = firstLine
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return normalized.includes('enunciado') && normalized.includes('tipo');
  };

  const handleDownloadTemplate = () => {
    const content = generateStructuredImportTemplate();
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-importacao-questionario.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleParse = () => {
    if (!inputText.trim()) {
      alert('Por favor, digite, cole ou carregue o conteúdo do questionário.');
      return;
    }

    setStructuredErrors([]);

    if (looksLikeStructuredStandard(inputText)) {
      // Formato padrão estruturado (colunas fixas: codigo;enunciado;tipo;...)
      const result = parseStructuredQuestionnaire(inputText);
      if (result.questions.length === 0) {
        setStructuredErrors(result.errors);
        alert(
          'Nenhuma pergunta válida foi encontrada no arquivo do padrão estruturado. Verifique os erros de validação exibidos abaixo do campo de texto.'
        );
        return;
      }
      setParsedQuestions(result.questions);
      setStructuredErrors(result.errors);
      setActiveStep('review');
      return;
    }

    const result = parseQuestionnaireText(inputText);
    if (result.questions.length === 0) {
      alert('Não foi possível identificar perguntas no texto fornecido. Verifique a formatação (ex: 1. Pergunta? A) Opção 1 B) Opção 2).');
      return;
    }

    setParsedQuestions(result.questions);
    setActiveStep('review');
  };

  const handleApplyTemplate = (tplId: string) => {
    const tpl = QUESTIONNAIRE_TEMPLATES.find((t) => t.id === tplId);
    if (tpl) {
      setSelectedTemplate(tplId);
      setInputText(tpl.content);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setInputText(content);
        setFeedbackMsg(`Arquivo "${file.name}" carregado com sucesso (${content.split('\n').length} linhas).`);
      }
    };
    reader.readAsText(file);
  };

  // Change question type and automatically handle alternatives behavior
  const handleUpdateQuestionType = (qIndex: number, newType: QuestionType) => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      const q = { ...updated[qIndex] };
      q.tipo = newType;

      if (newType === 'sim_nao') {
        q.opcoes = [
          { id: `opt_${Date.now()}_1`, label: 'Sim', value: 'Sim' },
          { id: `opt_${Date.now()}_2`, label: 'Não', value: 'Não' },
        ];
      } else if (newType === 'escala_numerica') {
        q.escalaMin = 1;
        q.escalaMax = 5;
        q.escalaMinLabel = 'Péssimo';
        q.escalaMaxLabel = 'Excelente';
        if (!q.opcoes || q.opcoes.length === 0) {
          q.opcoes = [
            { id: `opt_${Date.now()}_1`, label: '1 - Péssimo', value: '1' },
            { id: `opt_${Date.now()}_2`, label: '2 - Ruim', value: '2' },
            { id: `opt_${Date.now()}_3`, label: '3 - Regular', value: '3' },
            { id: `opt_${Date.now()}_4`, label: '4 - Bom', value: '4' },
            { id: `opt_${Date.now()}_5`, label: '5 - Excelente', value: '5' },
          ];
        }
      } else if (newType === 'nps') {
        q.escalaMin = 0;
        q.escalaMax = 10;
        q.opcoes = undefined;
      } else if (newType === 'texto_aberto' || newType === 'data_hora') {
        q.opcoes = undefined;
      } else if (newType === 'multipla_escolha' || newType === 'multipla_selecao') {
        if (!q.opcoes || q.opcoes.length === 0) {
          q.opcoes = [
            { id: `opt_${Date.now()}_1`, label: 'Opção 1', value: 'Opção 1' },
            { id: `opt_${Date.now()}_2`, label: 'Opção 2', value: 'Opção 2' },
            { id: `opt_${Date.now()}_3`, label: 'Opção 3', value: 'Opção 3' },
          ];
        }
      }

      updated[qIndex] = q;
      return updated;
    });
  };

  const handleUpdateEnunciado = (qIndex: number, text: string) => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], enunciado: text };
      return updated;
    });
  };

  const handleUpdateCode = (qIndex: number, code: string) => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], codigo: code };
      return updated;
    });
  };

  const handleToggleObrigatoria = (qIndex: number) => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], obrigatoria: !updated[qIndex].obrigatoria };
      return updated;
    });
  };

  const handleAddOption = (qIndex: number) => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      const q = { ...updated[qIndex] };
      const currentOpts = q.opcoes || [];
      const newOptNum = currentOpts.length + 1;
      const newOpt: QuestionOption = {
        id: `opt_${Date.now()}_${newOptNum}`,
        label: `Nova Opção ${newOptNum}`,
        value: `Nova Opção ${newOptNum}`,
      };
      q.opcoes = [...currentOpts, newOpt];
      updated[qIndex] = q;
      return updated;
    });
  };

  const handleUpdateOptionLabel = (qIndex: number, optIndex: number, newLabel: string) => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      const q = { ...updated[qIndex] };
      if (!q.opcoes) return prev;
      const updatedOpts = [...q.opcoes];
      updatedOpts[optIndex] = {
        ...updatedOpts[optIndex],
        label: newLabel,
        value: newLabel,
      };
      q.opcoes = updatedOpts;
      updated[qIndex] = q;
      return updated;
    });
  };

  const handleDeleteOption = (qIndex: number, optIndex: number) => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      const q = { ...updated[qIndex] };
      if (!q.opcoes) return prev;
      q.opcoes = q.opcoes.filter((_, idx) => idx !== optIndex);
      updated[qIndex] = q;
      return updated;
    });
  };

  const handleDeleteQuestion = (qIndex: number) => {
    setParsedQuestions((prev) => prev.filter((_, idx) => idx !== qIndex));
  };

  const handleAddNewEmptyQuestion = () => {
    const nextNum = parsedQuestions.length + 1;
    const newQ: Question = {
      id: `q_imp_${Date.now()}_${nextNum}`,
      codigo: `P${String(nextNum).padStart(2, '0')}`,
      enunciado: 'Nova pergunta do questionário',
      tipo: 'multipla_escolha',
      obrigatoria: true,
      ordem: nextNum,
      opcoes: [
        { id: `opt_${Date.now()}_1`, label: 'Sim', value: 'Sim' },
        { id: `opt_${Date.now()}_2`, label: 'Não', value: 'Não' },
      ],
    };
    setParsedQuestions((prev) => [...prev, newQ]);
  };

  const handleFinalSubmit = () => {
    if (parsedQuestions.length === 0) {
      alert('Nenhuma pergunta disponível para importação.');
      return;
    }

    // Re-index orders and codes
    const sanitized = parsedQuestions.map((q, idx) => ({
      ...q,
      ordem: idx + 1,
    }));

    onImportQuestions(sanitized, importMode);
    onClose();
  };

  const totalAlternatives = parsedQuestions.reduce(
    (acc, q) => acc + (q.opcoes ? q.opcoes.length : 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl border border-ui bg-surface-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ui/80 px-6 py-4 bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                Importação Estruturada de Questionário
                <span className="rounded-full bg-accent-primary-soft px-2 py-0.5 text-[10px] font-bold text-accent-primary border border-accent-primary-soft-border">
                  Perguntas & Alternativas
                </span>
              </h2>
              <p className="text-xs text-muted">
                Organize automaticamente questões e alternativas e altere os tipos conforme necessário.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-surface-raised hover:text-primary transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b border-ui/80 bg-surface-app px-6 py-2.5 text-xs font-semibold gap-6">
          <button
            onClick={() => setActiveStep('input')}
            className={`flex items-center gap-2 transition ${
              activeStep === 'input'
                ? 'text-accent-primary font-bold border-b-2 border-blue-500 pb-1'
                : 'text-muted hover:text-secondary'
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-raised text-[10px]">
              1
            </span>
            <span>Entrada do Questionário (Texto / Arquivo / Modelos)</span>
          </button>

          <button
            onClick={() => {
              if (parsedQuestions.length > 0) setActiveStep('review');
              else handleParse();
            }}
            className={`flex items-center gap-2 transition ${
              activeStep === 'review'
                ? 'text-accent-primary font-bold border-b-2 border-blue-500 pb-1'
                : 'text-muted hover:text-secondary'
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-raised text-[10px]">
              2
            </span>
            <span>Organização e Alteração de Tipos das Alternativas ({parsedQuestions.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeStep === 'input' ? (
            <div className="space-y-5">
              {/* Templates Quick Load */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-secondary flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
                    Modelos Rápidos Pré-configurados (1-Clique)
                  </span>
                  <span className="text-[11px] text-muted">
                    Selecione para testar ou basear seu questionário
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {QUESTIONNAIRE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl.id)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        selectedTemplate === tpl.id
                          ? 'border-accent-primary-soft-border bg-accent-primary-soft text-primary shadow-md'
                          : 'border-ui bg-surface-raised text-secondary hover:border-ui hover:bg-surface-raised'
                      }`}
                    >
                      <div className="text-xs font-bold text-accent-primary mb-1">{tpl.title}</div>
                      <div className="text-[11px] text-muted line-clamp-2">{tpl.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload or Paste */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">
                    Texto ou Conteúdo do Questionário
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft px-3 py-1.5 text-xs font-bold text-accent-primary hover:bg-accent-primary-solid-hover hover:text-on-accent transition"
                      title="Baixa o modelo .csv com o padrão mínimo de colunas aceito pelo sistema"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Baixar Modelo Padrão (.csv)</span>
                    </button>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-medium text-secondary hover:bg-surface-raised hover:text-primary transition">
                      <Upload className="h-3.5 w-3.5 text-accent-primary" />
                      <span>Carregar Arquivo (.txt, .csv)</span>
                      <input
                        type="file"
                        accept=".txt,.csv,.tsv,.json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setInputText('');
                        setSelectedTemplate('');
                        setFeedbackMsg(null);
                        setStructuredErrors([]);
                      }}
                      className="text-xs text-muted hover:text-secondary"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {feedbackMsg && (
                  <div className="flex items-center gap-2 rounded-lg bg-accent-success-soft border border-accent-success-soft-border px-3 py-1.5 text-xs text-accent-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{feedbackMsg}</span>
                  </div>
                )}

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Cole aqui o texto do seu questionário em formato estruturado. Exemplo:

1. Qual a sua faixa etária?
A) 18 a 24 anos
B) 25 a 39 anos
C) 40 a 59 anos
D) 60 anos ou mais

2. Você reside no município de pesquisa?
- Sim
- Não

3. Como você avalia a limpeza urbana no seu bairro de 1 a 5?
1 - Péssimo
2 - Ruim
3 - Regular
4 - Bom
5 - Excelente

4. De 0 a 10, qual sua probabilidade de recomendar os serviços municipais?

5. Deixe um comentário com sugestões de melhoria:`}
                  rows={14}
                  className="w-full rounded-xl border border-ui bg-surface-app p-4 text-xs font-mono text-primary placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition leading-relaxed"
                />

                <div className="flex items-center gap-2 text-[11px] text-muted mt-1">
                  <HelpCircle className="h-3.5 w-3.5 text-accent-primary shrink-0" />
                  <span>
                    O analisador inteligente reconhece números de questões (1., 02-, Q3), letras de alternativas (A), B), a., b.), marcadores (-, •) e sugere automaticamente tipos como Múltipla Escolha, Sim/Não, Escala ou NPS. Para importações mais confiáveis, use o <strong className="text-secondary">Modelo Padrão (.csv)</strong> acima — quando o cabeçalho <code className="text-accent-primary">codigo;enunciado;tipo;...</code> é detectado, cada linha é validada individualmente contra o padrão mínimo do sistema.
                  </span>
                </div>

                {structuredErrors.length > 0 && (
                  <div className="mt-2 rounded-xl border border-accent-warning-soft-border bg-accent-warning-soft p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-accent-warning">
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>
                        {structuredErrors.filter((e) => e.bloqueante).length} linha(s) com erro bloqueante,{' '}
                        {structuredErrors.filter((e) => !e.bloqueante).length} aviso(s) — revise o arquivo ou ajuste as perguntas na próxima etapa
                      </span>
                    </div>
                    <ul className="max-h-32 overflow-y-auto space-y-1 text-[11px]">
                      {structuredErrors.map((err, i) => (
                        <li
                          key={i}
                          className={err.bloqueante ? 'text-accent-danger' : 'text-accent-warning'}
                        >
                          Linha {err.linha}
                          {err.campo ? ` (${err.campo})` : ''}: {err.mensagem}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Step 2: Review and Edit Types / Alternatives */
            <div className="space-y-6">
              {/* Summary Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary-solid text-on-accent font-bold text-sm shadow-md">
                    {parsedQuestions.length}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary">
                      Questões Organizadas com Sucesso
                    </h3>
                    <p className="text-xs text-secondary">
                      Total de <strong className="text-accent-primary">{totalAlternatives}</strong> alternativas detectadas. Você pode alterar o tipo de qualquer questão e customizar as alternativas abaixo antes de importar.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAddNewEmptyQuestion}
                    className="flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-hover hover:text-primary transition"
                  >
                    <Plus className="h-3.5 w-3.5 text-accent-primary" />
                    <span>+ Nova Questão</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep('input')}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Voltar para Entrada</span>
                  </button>
                </div>
              </div>

              {/* List of Parsed Questions */}
              <div className="space-y-4">
                {parsedQuestions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="rounded-xl border border-ui bg-surface-raised p-4 transition-all hover:border-ui"
                  >
                    {/* Question Header & Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ui/80 pb-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-12 items-center justify-center rounded-md bg-accent-primary-soft font-mono text-xs font-bold text-accent-primary border border-accent-primary-soft-border">
                          {q.codigo || `P${String(qIdx + 1).padStart(2, '0')}`}
                        </span>
                        <span className="text-xs text-muted font-medium">
                          Item #{qIdx + 1}
                        </span>
                      </div>

                      {/* Type Selector (CRITICAL USER REQUIREMENT: alterar o tipo das alternativas depois de importadas) */}
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-muted">
                          Tipo da Questão / Alternativas:
                        </label>
                        <select
                          value={q.tipo}
                          onChange={(e) =>
                            handleUpdateQuestionType(qIdx, e.target.value as QuestionType)
                          }
                          className="rounded-lg border border-accent-primary-soft-border bg-surface-app px-3 py-1.5 text-xs font-semibold text-accent-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="multipla_escolha">Múltipla Escolha (Opção Única)</option>
                          <option value="multipla_selecao">Múltipla Seleção (Múltiplas Opções)</option>
                          <option value="texto_aberto">Texto Aberto / Dissertativo</option>
                          <option value="escala_numerica">Escala Numérica (1 a 5 ou Personalizada)</option>
                          <option value="nps">NPS (Net Promoter Score 0 a 10)</option>
                          <option value="sim_nao">Sim / Não (Booleano)</option>
                          <option value="data_hora">Data / Horário</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleToggleObrigatoria(qIdx)}
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold border transition ${
                            q.obrigatoria
                              ? 'bg-accent-warning-soft border-accent-warning-soft-border text-accent-warning'
                              : 'bg-surface-raised border-ui text-muted'
                          }`}
                        >
                          {q.obrigatoria ? 'Obrigatória' : 'Opcional'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(qIdx)}
                          title="Excluir questão"
                          className="rounded-lg p-1.5 text-muted hover:bg-accent-danger-soft hover:text-accent-danger transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Enunciado Input */}
                    <div className="mb-3">
                      <input
                        type="text"
                        value={q.enunciado}
                        onChange={(e) => handleUpdateEnunciado(qIdx, e.target.value)}
                        placeholder="Enunciado da pergunta"
                        className="w-full rounded-lg border border-ui bg-surface-app px-3 py-2 text-xs font-medium text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Alternatives / Options Area */}
                    {(q.tipo === 'multipla_escolha' ||
                      q.tipo === 'multipla_selecao' ||
                      q.tipo === 'sim_nao' ||
                      q.tipo === 'escala_numerica') && (
                      <div className="rounded-lg border border-ui/80 bg-surface-app/60 p-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-muted">
                          <span className="flex items-center gap-1.5">
                            <ListOrdered className="h-3.5 w-3.5 text-accent-primary" />
                            Alternativas Organizadas ({q.opcoes?.length || 0}):
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIdx)}
                            className="flex items-center gap-1 text-[11px] font-bold text-accent-primary hover:text-accent-primary transition"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Adicionar Alternativa</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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
                                  handleUpdateOptionLabel(qIdx, optIdx, e.target.value)
                                }
                                className="flex-1 bg-transparent text-xs text-primary focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteOption(qIdx, optIdx)}
                                className="text-muted hover:text-accent-danger transition"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {(!q.opcoes || q.opcoes.length === 0) && (
                          <div className="py-2 text-center text-xs text-muted">
                            Nenhuma alternativa cadastrada.{' '}
                            <button
                              type="button"
                              onClick={() => handleAddOption(qIdx)}
                              className="text-accent-primary underline font-semibold ml-1"
                            >
                              Clique para adicionar
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Specific helper info for Text, NPS, Data */}
                    {q.tipo === 'texto_aberto' && (
                      <div className="text-[11px] text-muted italic bg-surface-app/40 p-2 rounded-md border border-ui/60">
                        Campo de resposta aberta: o entrevistado responderá livremente com texto dissertativo.
                      </div>
                    )}

                    {q.tipo === 'nps' && (
                      <div className="text-[11px] text-accent-primary/80 bg-accent-primary-soft p-2 rounded-md border border-accent-primary-soft-border">
                        Escala NPS automática de 0 (Nada Provável) a 10 (Extremamente Provável) com métricas de Detratores, Neutros e Promotores.
                      </div>
                    )}

                    {q.tipo === 'data_hora' && (
                      <div className="text-[11px] text-muted italic bg-surface-app/40 p-2 rounded-md border border-ui/60">
                        Entrada de data e horário com formatação automática de calendário e relógio.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between border-t border-ui/80 px-6 py-4 bg-surface-raised gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-muted">Modo de Inserção:</span>
            <label className="flex items-center gap-1.5 text-xs text-secondary cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="append"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="text-accent-primary-solid focus:ring-blue-500"
              />
              <span>Adicionar às perguntas existentes</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-secondary cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="text-accent-primary-solid focus:ring-blue-500"
              />
              <span>Substituir todo o questionário</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-ui bg-surface px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-raised hover:text-primary transition"
            >
              Cancelar
            </button>

            {activeStep === 'input' ? (
              <button
                type="button"
                onClick={handleParse}
                className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-5 py-2 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 hover:bg-accent-primary-solid-hover transition"
              >
                <span>Analisar e Organizar Questões</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="flex items-center gap-2 rounded-lg bg-accent-success-solid px-5 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-success-solid-hover transition active:scale-95"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirmar e Importar {parsedQuestions.length} Questões</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
