import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AnalyticalReport, ReportBlock } from '../../types';
import { generateQuantitativeDraft, generateQualitativeDraft } from '../../utils/reportStatsGenerator';
import {
  FileBarChart2,
  Plus,
  ArrowLeft,
  Trash2,
  Sparkles,
  MessageSquareText,
  ChevronUp,
  ChevronDown,
  Save,
  Pencil,
  Clock,
  User,
  X,
} from 'lucide-react';

function renderPreview(text: string): React.ReactNode {
  // Renderizador simples: **negrito**, linhas "- " viram lista, quebras de linha viram parágrafos
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((paragraph, pIdx) => {
    const lines = paragraph.split('\n');
    const isList = lines.every((l) => l.trim().startsWith('- ') || l.trim() === '');
    const renderInline = (line: string) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="text-primary font-bold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      );
    };

    if (isList) {
      return (
        <ul key={pIdx} className="list-disc list-inside space-y-1">
          {lines
            .filter((l) => l.trim())
            .map((l, i) => (
              <li key={i}>{renderInline(l.trim().replace(/^-\s*/, ''))}</li>
            ))}
        </ul>
      );
    }

    return (
      <p key={pIdx}>
        {lines.map((line, i) => (
          <React.Fragment key={i}>
            {renderInline(line)}
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

const ORIGEM_BADGE: Record<ReportBlock['origem'], { label: string; className: string }> = {
  automatico_quantitativo: {
    label: 'Rascunho Quantitativo',
    className: 'bg-accent-primary-soft text-accent-primary border-accent-primary-soft-border',
  },
  automatico_qualitativo: {
    label: 'Rascunho Qualitativo',
    className: 'bg-accent-purple-soft text-accent-purple border-accent-purple-soft-border',
  },
  manual: {
    label: 'Texto Manual',
    className: 'bg-surface-raised text-secondary border-ui',
  },
};

export const AnalyticalReportsModule: React.FC = () => {
  const {
    surveys,
    submissions,
    analyticalReports,
    saveAnalyticalReport,
    deleteAnalyticalReport,
    currentUser,
    hasPermission,
  } = useApp();

  const canManage = hasPermission('relatorios_criar_alterar_excluir');

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnalyticalReport | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportSurveyId, setNewReportSurveyId] = useState(surveys[0]?.id || '');
  const [previewMode, setPreviewMode] = useState(true);

  const openReport = (report: AnalyticalReport) => {
    setSelectedReportId(report.id);
    setDraft(JSON.parse(JSON.stringify(report)));
  };

  const closeReport = () => {
    setSelectedReportId(null);
    setDraft(null);
  };

  const handleCreateReport = () => {
    const survey = surveys.find((s) => s.id === newReportSurveyId);
    if (!survey) {
      alert('Selecione a pesquisa à qual este relatório se refere.');
      return;
    }
    const nowIso = new Date().toISOString();
    const newReport: AnalyticalReport = {
      id: `rep_${Date.now()}`,
      pesquisaId: survey.id,
      pesquisaNome: survey.nome,
      titulo: newReportTitle.trim() || `Relatório Analítico — ${survey.nome}`,
      blocos: [],
      criadoPorId: currentUser.id,
      criadoPorNome: currentUser.nome,
      criadoEm: nowIso,
      atualizadoEm: nowIso,
    };
    saveAnalyticalReport(newReport);
    setIsCreating(false);
    setNewReportTitle('');
    openReport(newReport);
  };

  const handleAddBlock = (origem: ReportBlock['origem'], conteudoInicial = '') => {
    if (!draft) return;
    const nowIso = new Date().toISOString();
    const survey = surveys.find((s) => s.id === draft.pesquisaId);

    let conteudo = conteudoInicial;
    let titulo = 'Novo Bloco';
    if (origem === 'automatico_quantitativo' && survey) {
      conteudo = generateQuantitativeDraft(survey, submissions);
      titulo = 'Análise Quantitativa';
    } else if (origem === 'automatico_qualitativo' && survey) {
      conteudo = generateQualitativeDraft(survey, submissions);
      titulo = 'Análise Qualitativa';
    }

    const newBlock: ReportBlock = {
      id: `blk_${Date.now()}`,
      titulo,
      conteudo,
      ordem: draft.blocos.length + 1,
      origem,
      criadoEm: nowIso,
      atualizadoEm: nowIso,
    };

    setDraft({ ...draft, blocos: [...draft.blocos, newBlock] });
  };

  const handleUpdateBlock = (blockId: string, field: 'titulo' | 'conteudo', value: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      blocos: draft.blocos.map((b) =>
        b.id === blockId ? { ...b, [field]: value, atualizadoEm: new Date().toISOString() } : b
      ),
    });
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!draft) return;
    if (!window.confirm('Remover este bloco do relatório?')) return;
    setDraft({ ...draft, blocos: draft.blocos.filter((b) => b.id !== blockId) });
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    if (!draft) return;
    const idx = draft.blocos.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= draft.blocos.length) return;

    const reordered = [...draft.blocos];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    setDraft({ ...draft, blocos: reordered.map((b, i) => ({ ...b, ordem: i + 1 })) });
  };

  const handleSaveDraft = () => {
    if (!draft) return;
    saveAnalyticalReport({ ...draft, atualizadoEm: new Date().toISOString() });
    setSelectedReportId(draft.id);
  };

  const handleDeleteReport = (reportId: string) => {
    if (!window.confirm('Excluir este relatório analítico permanentemente? Esta ação não pode ser desfeita.')) return;
    deleteAnalyticalReport(reportId);
    if (selectedReportId === reportId) closeReport();
  };

  if (!canManage && analyticalReports.length === 0) {
    return (
      <div className="rounded-2xl border border-ui bg-surface p-8 text-center shadow-xl">
        <FileBarChart2 className="mx-auto h-10 w-10 text-muted" />
        <h3 className="mt-3 text-sm font-bold text-primary">Sem relatórios disponíveis</h3>
        <p className="mt-1 text-xs text-muted">
          Você não possui permissão para criar relatórios analíticos e ainda não há nenhum disponível para visualização.
        </p>
      </div>
    );
  }

  // ===================== EDITOR DE RELATÓRIO =====================
  if (draft) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={closeReport}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar para a lista de relatórios</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode((p) => !p)}
              className="flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>{previewMode ? 'Editar Texto' : 'Pré-visualizar'}</span>
            </button>
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 rounded-lg bg-accent-success-solid px-4 py-1.5 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-success-solid-hover transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Salvar Relatório</span>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl space-y-4">
          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-wider">
              Título do Relatório
            </label>
            <input
              type="text"
              value={draft.titulo}
              onChange={(e) => setDraft({ ...draft, titulo: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-3 py-2 text-sm font-bold text-primary focus:border-emerald-500 focus:outline-none"
            />
            <p className="mt-1 flex items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <FileBarChart2 className="h-3 w-3" /> {draft.pesquisaNome}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {draft.criadoPorNome}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Atualizado em {new Date(draft.atualizadoEm).toLocaleString('pt-BR')}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-ui pt-4">
            <button
              onClick={() => handleAddBlock('automatico_quantitativo')}
              className="flex items-center gap-1.5 rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft px-3 py-1.5 text-xs font-bold text-accent-primary hover:bg-accent-primary-solid-hover hover:text-on-accent transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Gerar Rascunho Quantitativo</span>
            </button>
            <button
              onClick={() => handleAddBlock('automatico_qualitativo')}
              className="flex items-center gap-1.5 rounded-lg border border-accent-purple-soft-border bg-accent-purple-soft px-3 py-1.5 text-xs font-bold text-accent-purple hover:bg-accent-purple-solid-hover hover:text-on-accent transition-colors"
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              <span>Gerar Rascunho Qualitativo</span>
            </button>
            <button
              onClick={() => handleAddBlock('manual')}
              className="flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Adicionar Bloco em Branco</span>
            </button>
          </div>
        </div>

        {draft.blocos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ui bg-surface p-8 text-center">
            <p className="text-xs text-muted">
              Este relatório ainda não tem blocos de texto. Use os botões acima para gerar um rascunho a partir dos resultados ou adicionar um bloco em branco.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {draft.blocos.map((block, idx) => {
            const badge = ORIGEM_BADGE[block.origem];
            return (
              <div key={block.id} className="rounded-2xl border border-ui bg-surface p-5 shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <input
                    type="text"
                    value={block.titulo}
                    onChange={(e) => handleUpdateBlock(block.id, 'titulo', e.target.value)}
                    className="flex-1 min-w-[200px] rounded-lg border border-ui bg-surface-card px-3 py-1.5 text-sm font-bold text-primary focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${badge.className}`}>
                      {badge.label}
                    </span>
                    <button
                      onClick={() => handleMoveBlock(block.id, 'up')}
                      disabled={idx === 0}
                      className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Mover para cima"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMoveBlock(block.id, 'down')}
                      disabled={idx === draft.blocos.length - 1}
                      className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Mover para baixo"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      className="rounded-lg p-1.5 text-accent-danger hover:bg-accent-danger-soft transition-colors"
                      title="Remover bloco"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {previewMode ? (
                  <div className="rounded-lg border border-ui bg-surface-card p-4 text-xs leading-relaxed text-secondary space-y-3">
                    {block.conteudo.trim() ? renderPreview(block.conteudo) : (
                      <span className="text-muted italic">Bloco vazio — clique em "Editar Texto" para escrever o conteúdo.</span>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={block.conteudo}
                    onChange={(e) => handleUpdateBlock(block.id, 'conteudo', e.target.value)}
                    rows={10}
                    placeholder="Escreva aqui a análise deste bloco. Use **texto** para negrito e linhas iniciadas com '- ' para listas."
                    className="w-full rounded-lg border border-ui bg-surface-card p-3 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none leading-relaxed font-mono"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ===================== LISTA DE RELATÓRIOS =====================
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
            Relatórios Analíticos
          </h1>
          <p className="text-xs text-muted">
            Análises quantitativas e qualitativas em texto, construídas a partir dos resultados de cada pesquisa.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setIsCreating(true);
              setNewReportSurveyId(surveys[0]?.id || '');
              setNewReportTitle('');
            }}
            className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Relatório</span>
          </button>
        )}
      </div>

      {isCreating && (
        <div className="rounded-2xl border border-accent-primary-soft-border bg-accent-primary-soft p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary">Novo Relatório Analítico</h3>
            <button onClick={() => setIsCreating(false)} className="text-muted hover:text-primary">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-secondary">Pesquisa</label>
              <select
                value={newReportSurveyId}
                onChange={(e) => setNewReportSurveyId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-3 py-2 text-xs text-primary focus:border-emerald-500 focus:outline-none"
              >
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.codigo}] {s.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-secondary">Título do Relatório (opcional)</label>
              <input
                type="text"
                value={newReportTitle}
                onChange={(e) => setNewReportTitle(e.target.value)}
                placeholder="Ex: Relatório Final — Ciclo 1"
                className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-3 py-2 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreateReport}
              className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent hover:bg-accent-primary-solid-hover transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Criar e Começar a Editar</span>
            </button>
          </div>
        </div>
      )}

      {analyticalReports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ui bg-surface p-10 text-center">
          <FileBarChart2 className="mx-auto h-10 w-10 text-muted" />
          <h3 className="mt-3 text-sm font-bold text-primary">Nenhum relatório analítico criado ainda</h3>
          <p className="mt-1 text-xs text-muted">
            Crie o primeiro relatório para começar a documentar as análises quantitativas e qualitativas de uma pesquisa.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {analyticalReports
            .slice()
            .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime())
            .map((report) => (
              <div
                key={report.id}
                className="group flex flex-col justify-between rounded-2xl border border-ui bg-surface p-5 shadow-xl hover:border-accent-primary-soft-border transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-primary leading-snug">{report.titulo}</h3>
                    {canManage && (
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="shrink-0 rounded-lg p-1.5 text-muted opacity-0 group-hover:opacity-100 hover:bg-accent-danger-soft hover:text-accent-danger transition-all"
                        title="Excluir relatório"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">{report.pesquisaNome}</p>
                  <p className="mt-3 text-[11px] text-muted">
                    {report.blocos.length} bloco(s) de texto • Atualizado em{' '}
                    {new Date(report.atualizadoEm).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={() => openReport(report)}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-2 text-xs font-bold text-secondary hover:bg-accent-primary-solid hover:text-on-accent hover:border-accent-primary-solid transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>{canManage ? 'Abrir e Editar' : 'Visualizar'}</span>
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
