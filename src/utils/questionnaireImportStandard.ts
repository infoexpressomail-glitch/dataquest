import { Question, QuestionOption, QuestionType } from '../types';

/**
 * PADRÃO MÍNIMO DE IMPORTAÇÃO DE QUESTIONÁRIO EXTERNO
 * =====================================================
 * Este arquivo define o CONTRATO (schema) que qualquer questionário externo
 * precisa seguir para ser importado para dentro do sistema. O conteúdo de
 * cada pergunta é livre (enunciado, alternativas, escalas...), mas a
 * ESTRUTURA do arquivo (colunas, nomes de coluna, valores aceitos para
 * "tipo" e "obrigatoria") é fixa e validada linha a linha.
 *
 * Formato aceito: CSV (separador ";" ou ",", detectado automaticamente),
 * UTF-8, uma pergunta por linha, na ordem abaixo:
 *
 *   codigo | enunciado | tipo | obrigatoria | ordem | opcoes |
 *   escala_min | escala_max | escala_min_label | escala_max_label |
 *   iniciar_gravacao_aqui
 *
 * Apenas "enunciado" e "tipo" são obrigatórios; os demais têm um valor
 * padrão sensato quando ausentes (ver STRUCTURED_IMPORT_COLUMNS).
 */

export const STRUCTURED_IMPORT_HEADER = [
  'codigo',
  'enunciado',
  'tipo',
  'obrigatoria',
  'ordem',
  'opcoes',
  'escala_min',
  'escala_max',
  'escala_min_label',
  'escala_max_label',
  'iniciar_gravacao_aqui',
] as const;

export type StructuredImportColumn = (typeof STRUCTURED_IMPORT_HEADER)[number];

export const STRUCTURED_IMPORT_COLUMNS: {
  key: StructuredImportColumn;
  label: string;
  obrigatoria: boolean;
  descricao: string;
}[] = [
  { key: 'codigo', label: 'Código', obrigatoria: false, descricao: 'Identificador curto (ex: P01). Se vazio, é gerado automaticamente.' },
  { key: 'enunciado', label: 'Enunciado', obrigatoria: true, descricao: 'Texto da pergunta.' },
  { key: 'tipo', label: 'Tipo', obrigatoria: true, descricao: 'Um dos valores aceitos (ver QUESTION_TYPE_ALIASES).' },
  { key: 'obrigatoria', label: 'Obrigatória', obrigatoria: false, descricao: 'SIM ou NAO. Padrão: SIM.' },
  { key: 'ordem', label: 'Ordem', obrigatoria: false, descricao: 'Número da posição. Padrão: ordem da linha no arquivo.' },
  { key: 'opcoes', label: 'Opções', obrigatoria: false, descricao: 'Alternativas separadas por "|". Obrigatório para múltipla escolha/seleção.' },
  { key: 'escala_min', label: 'Escala Mín.', obrigatoria: false, descricao: 'Aplicável a escala_numerica. Padrão: 1.' },
  { key: 'escala_max', label: 'Escala Máx.', obrigatoria: false, descricao: 'Aplicável a escala_numerica. Padrão: 5.' },
  { key: 'escala_min_label', label: 'Rótulo Mín.', obrigatoria: false, descricao: 'Rótulo do menor valor da escala.' },
  { key: 'escala_max_label', label: 'Rótulo Máx.', obrigatoria: false, descricao: 'Rótulo do maior valor da escala.' },
  { key: 'iniciar_gravacao_aqui', label: 'Iniciar Gravação Aqui', obrigatoria: false, descricao: 'SIM ou NAO. Padrão: NAO.' },
];

// Aliases amigáveis aceitos na coluna "tipo" (case/acento-insensível), mapeados para o QuestionType canônico
const QUESTION_TYPE_ALIASES: Record<string, QuestionType> = {
  multipla_escolha: 'multipla_escolha',
  'multipla escolha': 'multipla_escolha',
  unica_escolha: 'multipla_escolha',
  'unica escolha': 'multipla_escolha',
  multipla_selecao: 'multipla_selecao',
  'multipla selecao': 'multipla_selecao',
  'multipla seleção': 'multipla_selecao',
  checkbox: 'multipla_selecao',
  texto_aberto: 'texto_aberto',
  'texto aberto': 'texto_aberto',
  aberta: 'texto_aberto',
  texto: 'texto_aberto',
  escala_numerica: 'escala_numerica',
  'escala numerica': 'escala_numerica',
  'escala numérica': 'escala_numerica',
  escala: 'escala_numerica',
  nps: 'nps',
  sim_nao: 'sim_nao',
  'sim nao': 'sim_nao',
  'sim/nao': 'sim_nao',
  'sim/não': 'sim_nao',
  data_hora: 'data_hora',
  'data hora': 'data_hora',
  data: 'data_hora',
};

const TYPES_THAT_REQUIRE_OPTIONS: QuestionType[] = ['multipla_escolha', 'multipla_selecao'];

export interface StructuredImportError {
  linha: number; // número da linha no arquivo (cabeçalho = linha 1)
  campo?: StructuredImportColumn;
  mensagem: string;
  bloqueante: boolean; // se true, impede a importação da pergunta/arquivo
}

export interface StructuredImportResult {
  questions: Question[];
  errors: StructuredImportError[];
  totalLinhasLidas: number;
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseBoolean(raw: string | undefined, defaultValue: boolean): boolean {
  if (!raw || !raw.trim()) return defaultValue;
  const v = normalize(raw);
  return ['sim', 'true', '1', 's', 'yes'].includes(v);
}

/**
 * Parser de CSV que respeita aspas (campos com ; , ou quebras de linha dentro
 * de "..."), com detecção automática do separador (";" tem prioridade sobre
 * "," por ser o padrão do Excel em pt-BR).
 */
export function parseDelimitedText(raw: string): string[][] {
  const text = raw.replace(/^\uFEFF/, ''); // remove BOM
  const delimiter = text.split('\n')[0]?.includes(';') ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // ignore, \n handles the line break
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  // last field/row (arquivo pode não terminar com quebra de linha)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

/**
 * Valida e converte o conteúdo bruto de um arquivo (.csv) no formato padrão
 * de importação de questionário em uma lista de Question[], reportando um
 * erro por linha/campo quando a estrutura não é respeitada.
 */
export function parseStructuredQuestionnaire(raw: string): StructuredImportResult {
  const rows = parseDelimitedText(raw);
  const errors: StructuredImportError[] = [];
  const questions: Question[] = [];

  if (rows.length === 0) {
    return {
      questions: [],
      errors: [{ linha: 1, mensagem: 'Arquivo vazio ou ilegível.', bloqueante: true }],
      totalLinhasLidas: 0,
    };
  }

  const headerRow = rows[0].map((h) => normalize(h));
  const isHeaderPresent = headerRow.includes('enunciado') && headerRow.includes('tipo');

  // Mapa coluna -> índice. Se não houver cabeçalho reconhecível, assume a
  // ordem canônica fixa (fallback), mas isso gera um aviso não-bloqueante.
  let columnIndex: Record<StructuredImportColumn, number>;
  let dataRows: string[][];

  if (isHeaderPresent) {
    columnIndex = STRUCTURED_IMPORT_HEADER.reduce((acc, col) => {
      acc[col] = headerRow.indexOf(col);
      return acc;
    }, {} as Record<StructuredImportColumn, number>);
    dataRows = rows.slice(1);
  } else {
    columnIndex = STRUCTURED_IMPORT_HEADER.reduce((acc, col, idx) => {
      acc[col] = idx;
      return acc;
    }, {} as Record<StructuredImportColumn, number>);
    dataRows = rows;
    errors.push({
      linha: 1,
      mensagem:
        'Cabeçalho não reconhecido (esperado ao menos "enunciado" e "tipo"). Assumindo a ordem padrão de colunas: ' +
        STRUCTURED_IMPORT_HEADER.join(', ') + '.',
      bloqueante: false,
    });
  }

  const usedCodes = new Set<string>();

  dataRows.forEach((cols, idx) => {
    const linha = idx + (isHeaderPresent ? 2 : 1); // número real da linha no arquivo
    const get = (col: StructuredImportColumn): string => {
      const i = columnIndex[col];
      return i >= 0 && i < cols.length ? (cols[i] ?? '').trim() : '';
    };

    const enunciado = get('enunciado');
    if (!enunciado) {
      errors.push({ linha, campo: 'enunciado', mensagem: 'Enunciado vazio — linha ignorada.', bloqueante: true });
      return;
    }

    const tipoRaw = get('tipo');
    const tipo = QUESTION_TYPE_ALIASES[normalize(tipoRaw)];
    if (!tipo) {
      errors.push({
        linha,
        campo: 'tipo',
        mensagem: `Tipo "${tipoRaw}" não reconhecido. Valores aceitos: multipla_escolha, multipla_selecao, texto_aberto, escala_numerica, nps, sim_nao, data_hora. Linha ignorada.`,
        bloqueante: true,
      });
      return;
    }

    let codigo = get('codigo');
    if (codigo) {
      if (usedCodes.has(normalize(codigo))) {
        errors.push({ linha, campo: 'codigo', mensagem: `Código "${codigo}" duplicado — foi gerado um novo código automaticamente.`, bloqueante: false });
        codigo = '';
      } else {
        usedCodes.add(normalize(codigo));
      }
    }
    if (!codigo) {
      codigo = `P${String(questions.length + 1).padStart(2, '0')}`;
      usedCodes.add(normalize(codigo));
    }

    const obrigatoria = parseBoolean(get('obrigatoria'), true);

    const ordemRaw = get('ordem');
    const ordemParsed = parseInt(ordemRaw, 10);
    const ordem = Number.isFinite(ordemParsed) && ordemRaw !== '' ? ordemParsed : questions.length + 1;

    let opcoes: QuestionOption[] | undefined;
    const opcoesRaw = get('opcoes');
    if (opcoesRaw) {
      opcoes = opcoesRaw
        .split('|')
        .map((o) => o.trim())
        .filter(Boolean)
        .map((label, i) => ({ id: `opt_${Date.now()}_${idx}_${i}`, label, value: label }));
    }

    if (tipo === 'sim_nao' && (!opcoes || opcoes.length === 0)) {
      opcoes = [
        { id: `opt_${Date.now()}_${idx}_1`, label: 'Sim', value: 'Sim' },
        { id: `opt_${Date.now()}_${idx}_2`, label: 'Não', value: 'Não' },
      ];
    }

    if (TYPES_THAT_REQUIRE_OPTIONS.includes(tipo) && (!opcoes || opcoes.length < 2)) {
      errors.push({
        linha,
        campo: 'opcoes',
        mensagem: `Tipo "${tipoRaw}" exige ao menos 2 opções separadas por "|" na coluna "opcoes". Linha ignorada.`,
        bloqueante: true,
      });
      return;
    }

    let escalaMin: number | undefined;
    let escalaMax: number | undefined;
    let escalaMinLabel: string | undefined;
    let escalaMaxLabel: string | undefined;

    if (tipo === 'escala_numerica') {
      const minRaw = get('escala_min');
      const maxRaw = get('escala_max');
      escalaMin = minRaw ? parseInt(minRaw, 10) : opcoes?.length ? 1 : 1;
      escalaMax = maxRaw ? parseInt(maxRaw, 10) : opcoes?.length || 5;
      if (!Number.isFinite(escalaMin)) escalaMin = 1;
      if (!Number.isFinite(escalaMax)) escalaMax = 5;
      escalaMinLabel = get('escala_min_label') || opcoes?.[0]?.label;
      escalaMaxLabel = get('escala_max_label') || opcoes?.[opcoes.length - 1]?.label;
    } else if (tipo === 'nps') {
      escalaMin = 0;
      escalaMax = 10;
    }

    const iniciarGravacaoAqui = parseBoolean(get('iniciar_gravacao_aqui'), false) || undefined;

    questions.push({
      id: `q_imp_${Date.now()}_${idx}`,
      codigo,
      enunciado,
      tipo,
      obrigatoria,
      ordem,
      opcoes,
      escalaMin,
      escalaMax,
      escalaMinLabel,
      escalaMaxLabel,
      iniciarGravacaoAqui,
    });
  });

  questions.sort((a, b) => a.ordem - b.ordem);

  return { questions, errors, totalLinhasLidas: dataRows.length };
}

/**
 * Gera o conteúdo (texto) do modelo/template oficial de importação, pronto
 * para ser distribuído externamente e preenchido em qualquer planilha.
 */
export function generateStructuredImportTemplate(): string {
  const header = STRUCTURED_IMPORT_HEADER.join(';');
  const exampleRows = [
    ['P01', 'Você é morador do município ou visitante?', 'multipla_escolha', 'SIM', '1', 'Morador do município|Visitante / Turista|Trabalho na cidade', '', '', '', '', 'NAO'],
    ['P02', 'Quais problemas o seu bairro mais enfrenta? (marque quantos quiser)', 'multipla_selecao', 'NAO', '2', 'Pavimentação|Iluminação pública|Coleta de lixo|Segurança', '', '', '', '', 'NAO'],
    ['P03', 'De modo geral, como avalia os serviços de saúde pública?', 'escala_numerica', 'SIM', '3', '', '1', '5', 'Péssimo', 'Excelente', 'NAO'],
    ['P04', 'De 0 a 10, qual a probabilidade de recomendar a cidade a um amigo?', 'nps', 'SIM', '4', '', '', '', '', '', 'NAO'],
    ['P05', 'O problema relatado foi resolvido?', 'sim_nao', 'SIM', '5', '', '', '', '', '', 'NAO'],
    ['P06', 'Descreva a principal melhoria que você gostaria de ver na cidade:', 'texto_aberto', 'NAO', '6', '', '', '', '', '', 'SIM'],
  ];

  const lines = [header, ...exampleRows.map((r) => r.join(';'))];
  return lines.join('\r\n');
}
