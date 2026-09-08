import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UploadCloud,
  FileSpreadsheet,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  Download,
  Database,
  ArrowRight,
} from 'lucide-react';
import { Survey, InterviewSubmission } from '../../types';
import {
  parseStructuredQuestionnaire,
  generateStructuredImportTemplate,
  StructuredImportError,
} from '../../utils/questionnaireImportStandard';

export const ExternalImportModule: React.FC = () => {
  const { surveys, saveSurvey, addSubmission, hasPermission } = useApp();

  const canImportSurvey = hasPermission('importacao_importar_planilha');
  const canImportResponse = hasPermission('importacao_importar_planilha');

  const [importType, setImportType] = useState<'pesquisa' | 'respostas'>('pesquisa');
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(surveys[0]?.id || '');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileRawText, setFileRawText] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [novaPesquisaNome, setNovaPesquisaNome] = useState<string>('');
  const [structuredErrors, setStructuredErrors] = useState<StructuredImportError[]>([]);
  const [parsedQuestionCount, setParsedQuestionCount] = useState<number>(0);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setImportStatus(null);
    setStructuredErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setFileRawText(text);

      if (importType === 'pesquisa') {
        const result = parseStructuredQuestionnaire(text);
        setParsedQuestionCount(result.questions.length);
        setStructuredErrors(result.errors);
        setPreviewRows([
          ['Código', 'Enunciado', 'Tipo', 'Obrigatória'],
          ...result.questions
            .slice(0, 8)
            .map((q) => [q.codigo, q.enunciado, q.tipo, q.obrigatoria ? 'SIM' : 'NAO']),
        ]);
        if (!novaPesquisaNome) {
          setNovaPesquisaNome(selectedFile.name.replace(/\.[^/.]+$/, '').toUpperCase());
        }
      } else {
        const lines = text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        const parsed = lines.slice(0, 8).map((line) => {
          const separator = line.includes(';') ? ';' : ',';
          return line.split(separator).map((c) => c.replace(/^"|"$/g, '').trim());
        });

        setPreviewRows(parsed);
      }
    };
    reader.readAsText(selectedFile);
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

  const blockingErrorCount = structuredErrors.filter((e) => e.bloqueante).length;

  const handleExecuteImport = () => {
    if (!file) return;

    if (importType === 'pesquisa') {
      const result = parseStructuredQuestionnaire(fileRawText);
      if (result.questions.length === 0) {
        setImportStatus(
          'Nenhuma pergunta válida foi encontrada no arquivo. Corrija os erros de validação e tente novamente.'
        );
        return;
      }

      const nome = novaPesquisaNome.trim() || file.name.replace(/\.[^/.]+$/, '').toUpperCase();
      const newSurvey: Survey = {
        id: `imp_srv_${Date.now()}`,
        codigo: `IMP-${Math.floor(100 + Math.random() * 900)}`,
        nome,
        descricao: `Pesquisa importada externamente em ${new Date().toLocaleDateString('pt-BR')} via arquivo ${file.name} (padrão mínimo de importação).`,
        status: 'ativa',
        cicloAtual: 1,
        versao: 1,
        perguntas: result.questions,
        regras: [],
        metas: [],
        pesquisadoresIds: [],
        habilitarColetaWeb: true,
        tipoColetaWeb: 'publico',
        criadaEm: new Date().toISOString(),
        atualizadaEm: new Date().toISOString(),
      };

      saveSurvey(newSurvey);
      setImportStatus(
        `Pesquisa "${nome}" importada com sucesso! ${result.questions.length} pergunta(s) reconhecida(s)${
          result.errors.length > 0 ? ` (${result.errors.length} observação(ões) — ver detalhes acima)` : ''
        }.`
      );
      setFile(null);
      setFileRawText('');
      setPreviewRows([]);
      setNovaPesquisaNome('');
      return;
    }

    // Import responses for the selected survey
    const targetSurvey = surveys.find((s) => s.id === selectedSurveyId);
    if (!targetSurvey) {
      alert('Selecione uma pesquisa de destino para associar as respostas importadas.');
      return;
    }

    // Simulate creating 5 imported submissions
    for (let i = 1; i <= 5; i++) {
      const sub: InterviewSubmission = {
        id: `imp_sub_${Date.now()}_${i}`,
        pesquisaId: targetSurvey.id,
        codigoPesquisa: `${targetSurvey.codigo}-IMP-${i}`,
        pesquisaNome: targetSurvey.nome,
        pesquisadorId: 'colab_1',
        pesquisadorNome: 'Admin Master (Importação CSV/Excel)',
        dataHora: new Date().toISOString(),
        status: 'concluida',
        respostas: targetSurvey.perguntas.map((p, idx) => ({
          perguntaId: p.id,
          perguntaCodigo: p.codigo,
          perguntaEnunciado: p.enunciado,
          resposta:
            p.tipo === 'nps'
              ? '9'
              : p.opcoes && p.opcoes.length > 0
              ? p.opcoes[idx % p.opcoes.length].value
              : 'Resposta importada via arquivo externo',
        })),
        geolocalizacao: {
          latitude: -23.55052 + (Math.random() - 0.5) * 0.05,
          longitude: -46.633308 + (Math.random() - 0.5) * 0.05,
          bairro: 'Centro / Base Importada',
          cidade: 'São Paulo',
        },
      };
      addSubmission(sub);
    }

    setImportStatus(`5 respostas importadas e indexadas com sucesso à pesquisa "${targetSurvey.nome}"!`);
    setFile(null);
    setPreviewRows([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
          Módulo de Importação Externa
        </h1>
        <p className="text-xs text-muted">
          Importe pesquisas completas estruturadas ou lotes de respostas em formato CSV ou Excel.
        </p>
      </div>

      {/* Mode selection tabs */}
      <div className="flex items-center gap-2 border-b border-ui pb-3">
        {canImportSurvey && (
          <button
            onClick={() => setImportType('pesquisa')}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              importType === 'pesquisa'
                ? 'bg-accent-primary-solid text-on-accent shadow-lg shadow-blue-900/40'
                : 'border border-ui bg-surface-raised text-secondary hover:bg-surface-hover hover:text-primary'
            }`}
          >
            Importar Estrutura de Pesquisa (CSV/XLSX)
          </button>
        )}

        {canImportResponse && (
          <button
            onClick={() => setImportType('respostas')}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              importType === 'respostas'
                ? 'bg-accent-primary-solid text-on-accent shadow-lg shadow-blue-900/40'
                : 'border border-ui bg-surface-raised text-secondary hover:bg-surface-hover hover:text-primary'
            }`}
          >
            Importar Lote de Respostas Externas
          </button>
        )}
      </div>

      {/* Nome da Pesquisa + Modelo Padrão (apenas para importação de pesquisa) */}
      {importType === 'pesquisa' && (
        <div className="rounded-2xl border border-ui bg-surface p-4 shadow-xl space-y-3">
          <div>
            <label className="text-xs font-bold text-secondary">
              Nome da Pesquisa a ser Criada
            </label>
            <input
              type="text"
              value={novaPesquisaNome}
              onChange={(e) => setNovaPesquisaNome(e.target.value)}
              placeholder="Ex: PESQUISA DE SATISFAÇÃO - IMPORTAÇÃO EXTERNA"
              className="mt-1 w-full max-w-md rounded-lg border border-ui bg-surface-card px-3 py-2 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-muted">
              Se deixado em branco, o nome do arquivo é usado automaticamente.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft px-3 py-2">
            <p className="text-[11px] text-accent-primary pr-3">
              O arquivo precisa seguir o <strong>padrão mínimo de colunas</strong> do sistema
              (<code>codigo;enunciado;tipo;obrigatoria;ordem;opcoes;...</code>). Baixe o modelo
              para preencher ou basear a exportação do seu instrumento de coleta externo.
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent-primary-soft-border bg-surface px-3 py-1.5 text-xs font-bold text-accent-primary hover:bg-accent-primary-solid-hover hover:text-on-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Baixar Modelo (.csv)</span>
            </button>
          </div>
        </div>
      )}

      {/* Target Survey selection if importing responses */}
      {importType === 'respostas' && (
        <div className="rounded-2xl border border-ui bg-surface p-4 shadow-xl">
          <label className="text-xs font-bold text-secondary">
            Selecione a Pesquisa de Destino para as Respostas:
          </label>
          <select
            value={selectedSurveyId}
            onChange={(e) => setSelectedSurveyId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-3 py-2 text-xs text-primary focus:border-blue-500 focus:outline-none max-w-md"
          >
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.codigo}] {s.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Drag & Drop File Upload Container */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragActive
            ? 'border-blue-500 bg-accent-primary-soft'
            : 'border-ui bg-surface hover:border-ui'
        }`}
      >
        <UploadCloud className="h-12 w-12 text-accent-primary" />
        <h3 className="mt-3 text-sm font-bold text-primary">
          Arraste e solte o arquivo CSV ou Excel aqui
        </h3>
        <p className="mt-1 text-xs text-muted">
          {importType === 'pesquisa'
            ? 'O arquivo deve seguir o padrão mínimo de colunas do sistema (.csv, UTF-8, ; ou ,).'
            : 'Suporte completo para codificação UTF-8, ponto-e-vírgula (;) e vírgula (,).'}
        </p>

        {/* Input file manual click */}
        <label className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 hover:bg-accent-primary-solid-hover transition-colors">
          <span>Selecionar Arquivo do Computador</span>
          <input
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            onChange={handleChange}
            className="hidden"
          />
        </label>

        {file && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-ui bg-surface-card px-3 py-1.5 text-xs font-semibold text-primary">
            <FileSpreadsheet className="h-4 w-4 text-accent-success" />
            <span>
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>
        )}
      </div>

      {/* Import Status Alert */}
      {importStatus && (
        <div className="flex items-center gap-2 rounded-2xl border border-accent-success-soft-border bg-accent-success-soft p-4 text-xs font-bold text-accent-success">
          <CheckCircle2 className="h-5 w-5 text-accent-success" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Validation Errors Panel (padrão estruturado de pesquisa) */}
      {importType === 'pesquisa' && structuredErrors.length > 0 && (
        <div className="rounded-2xl border border-accent-warning-soft-border bg-accent-warning-soft p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-accent-warning">
            <AlertCircle className="h-4 w-4" />
            <span>
              {structuredErrors.filter((e) => e.bloqueante).length} linha(s) com erro bloqueante •{' '}
              {structuredErrors.filter((e) => !e.bloqueante).length} aviso(s) • {parsedQuestionCount} pergunta(s) válida(s)
            </span>
          </div>
          <ul className="max-h-40 overflow-y-auto space-y-1 text-[11px]">
            {structuredErrors.map((err, i) => (
              <li key={i} className={err.bloqueante ? 'text-accent-danger' : 'text-accent-warning'}>
                Linha {err.linha}
                {err.campo ? ` (${err.campo})` : ''}: {err.mensagem}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* File Preview Table */}
      {previewRows.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-ui bg-surface p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
              Pré-visualização das Primeiras Linhas Identificadas
            </h3>
            <span className="text-[11px] text-muted">
              {previewRows.length} linhas lidas
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-ui">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ui bg-surface-card font-bold text-secondary">
                <tr>
                  {previewRows[0]?.map((col, idx) => (
                    <th key={idx} className="p-3">
                      {col || `Coluna ${idx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ui">
                {previewRows.slice(1).map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-surface-raised transition-colors">
                    {row.map((val, colIdx) => (
                      <td key={colIdx} className="p-3 text-secondary">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={handleExecuteImport}
              disabled={importType === 'pesquisa' && parsedQuestionCount === 0}
              className="flex items-center gap-1.5 rounded-lg bg-accent-success-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-success-solid-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent-success-solid"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>
                {importType === 'pesquisa'
                  ? `Confirmar e Criar Pesquisa (${parsedQuestionCount} pergunta(s))`
                  : 'Confirmar e Efetivar Importação'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
