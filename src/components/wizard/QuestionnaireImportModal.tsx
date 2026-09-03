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

  if (!isOpen) return null;

  const handleParse = () => {
    if (!inputText.trim()) {
      alert('Por favor, digite, cole ou carregue o conteúdo do questionário.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-800 bg-[#111218] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-[#14161f]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Importação Estruturada de Questionário
                <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/30">
                  Perguntas & Alternativas
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Organize automaticamente questões e alternativas e altere os tipos conforme necessário.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b border-slate-800/80 bg-[#0d0e14] px-6 py-2.5 text-xs font-semibold gap-6">
          <button
            onClick={() => setActiveStep('input')}
            className={`flex items-center gap-2 transition ${
              activeStep === 'input'
                ? 'text-blue-400 font-bold border-b-2 border-blue-500 pb-1'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px]">
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
                ? 'text-blue-400 font-bold border-b-2 border-blue-500 pb-1'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px]">
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
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                    Modelos Rápidos Pré-configurados (1-Clique)
                  </span>
                  <span className="text-[11px] text-slate-500">
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
                          ? 'border-blue-500/50 bg-blue-600/10 text-white shadow-md'
                          : 'border-slate-800 bg-[#14161f] text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="text-xs font-bold text-blue-400 mb-1">{tpl.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2">{tpl.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload or Paste */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Texto ou Conteúdo do Questionário
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition">
                      <Upload className="h-3.5 w-3.5 text-blue-400" />
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
                      }}
                      className="text-xs text-slate-500 hover:text-slate-300"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {feedbackMsg && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-400">
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
                  className="w-full rounded-xl border border-slate-800 bg-[#0d0e14] p-4 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition leading-relaxed"
                />

                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                  <HelpCircle className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>
                    O analisador inteligente reconhece números de questões (1., 02-, Q3), letras de alternativas (A), B), a., b.), marcadores (-, •) e sugere automaticamente tipos como Múltipla Escolha, Sim/Não, Escala ou NPS.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Review and Edit Types / Alternatives */
            <div className="space-y-6">
              {/* Summary Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-500/20 bg-blue-600/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md">
                    {parsedQuestions.length}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Questões Organizadas com Sucesso
                    </h3>
                    <p className="text-xs text-slate-300">
                      Total de <strong className="text-blue-400">{totalAlternatives}</strong> alternativas detectadas. Você pode alterar o tipo de qualquer questão e customizar as alternativas abaixo antes de importar.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAddNewEmptyQuestion}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
                  >
                    <Plus className="h-3.5 w-3.5 text-blue-400" />
                    <span>+ Nova Questão</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep('input')}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
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
                    className="rounded-xl border border-slate-800 bg-[#14161f] p-4 transition-all hover:border-slate-700"
                  >
                    {/* Question Header & Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-12 items-center justify-center rounded-md bg-blue-600/20 font-mono text-xs font-bold text-blue-400 border border-blue-500/30">
                          {q.codigo || `P${String(qIdx + 1).padStart(2, '0')}`}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          Item #{qIdx + 1}
                        </span>
                      </div>

                      {/* Type Selector (CRITICAL USER REQUIREMENT: alterar o tipo das alternativas depois de importadas) */}
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-400">
                          Tipo da Questão / Alternativas:
                        </label>
                        <select
                          value={q.tipo}
                          onChange={(e) =>
                            handleUpdateQuestionType(qIdx, e.target.value as QuestionType)
                          }
                          className="rounded-lg border border-blue-500/40 bg-[#0d0e14] px-3 py-1.5 text-xs font-semibold text-blue-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {q.obrigatoria ? 'Obrigatória' : 'Opcional'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(qIdx)}
                          title="Excluir questão"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition"
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
                        className="w-full rounded-lg border border-slate-800 bg-[#0d0e14] px-3 py-2 text-xs font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Alternatives / Options Area */}
                    {(q.tipo === 'multipla_escolha' ||
                      q.tipo === 'multipla_selecao' ||
                      q.tipo === 'sim_nao' ||
                      q.tipo === 'escala_numerica') && (
                      <div className="rounded-lg border border-slate-800/80 bg-[#0d0e14]/60 p-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <ListOrdered className="h-3.5 w-3.5 text-blue-400" />
                            Alternativas Organizadas ({q.opcoes?.length || 0}):
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIdx)}
                            className="flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Adicionar Alternativa</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {(q.opcoes || []).map((opt, optIdx) => (
                            <div
                              key={opt.id || optIdx}
                              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#16171d] px-2.5 py-1.5"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-400">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <input
                                type="text"
                                value={opt.label}
                                onChange={(e) =>
                                  handleUpdateOptionLabel(qIdx, optIdx, e.target.value)
                                }
                                className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteOption(qIdx, optIdx)}
                                className="text-slate-500 hover:text-rose-400 transition"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {(!q.opcoes || q.opcoes.length === 0) && (
                          <div className="py-2 text-center text-xs text-slate-500">
                            Nenhuma alternativa cadastrada.{' '}
                            <button
                              type="button"
                              onClick={() => handleAddOption(qIdx)}
                              className="text-blue-400 underline font-semibold ml-1"
                            >
                              Clique para adicionar
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Specific helper info for Text, NPS, Data */}
                    {q.tipo === 'texto_aberto' && (
                      <div className="text-[11px] text-slate-500 italic bg-[#0d0e14]/40 p-2 rounded-md border border-slate-800/60">
                        Campo de resposta aberta: o entrevistado responderá livremente com texto dissertativo.
                      </div>
                    )}

                    {q.tipo === 'nps' && (
                      <div className="text-[11px] text-blue-400/80 bg-blue-600/5 p-2 rounded-md border border-blue-500/20">
                        Escala NPS automática de 0 (Nada Provável) a 10 (Extremamente Provável) com métricas de Detratores, Neutros e Promotores.
                      </div>
                    )}

                    {q.tipo === 'data_hora' && (
                      <div className="text-[11px] text-slate-500 italic bg-[#0d0e14]/40 p-2 rounded-md border border-slate-800/60">
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
        <div className="flex flex-wrap items-center justify-between border-t border-slate-800/80 px-6 py-4 bg-[#14161f] gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-400">Modo de Inserção:</span>
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="append"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>Adicionar às perguntas existentes</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>Substituir todo o questionário</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-[#16171d] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              Cancelar
            </button>

            {activeStep === 'input' ? (
              <button
                type="button"
                onClick={handleParse}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition"
              >
                <span>Analisar e Organizar Questões</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 transition active:scale-95"
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
