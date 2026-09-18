// ============================================================================
// GALERIA DE SMILES — Modelo Mobile First Premium
// ----------------------------------------------------------------------------
// Biblioteca oficial de escalas de satisfação/frequência/intensidade/
// concordância e infantil. Cada grupo é uma escala completa com emoji, rótulo
// e valor. O administrador pode usar qualquer grupo (ou apenas os smiles
// individuais) na configuração da pesquisa.
// ============================================================================

export interface SmileItem {
  id: string;
  /** Emoji desenhado em estilo flat. */
  emoji: string;
  label: string;
  /** Valor persistido na resposta. */
  value: string;
  /** Pontuação sugerida (quando a escala é numérica). */
  score?: number;
}

export interface SmileGroup {
  id: string;
  nome: string;
  descricao: string;
  smiles: SmileItem[];
}

export const SMILE_GROUPS: SmileGroup[] = [
  {
    id: 'satisfacao',
    nome: 'Grupo 1 — Satisfação',
    descricao: 'Avaliação geral de satisfação.',
    smiles: [
      { id: 'satisfacao-1', emoji: '😁', label: 'Excelente', value: 'Excelente', score: 6 },
      { id: 'satisfacao-2', emoji: '😊', label: 'Muito Bom', value: 'Muito Bom', score: 5 },
      { id: 'satisfacao-3', emoji: '🙂', label: 'Bom', value: 'Bom', score: 4 },
      { id: 'satisfacao-4', emoji: '😐', label: 'Regular', value: 'Regular', score: 3 },
      { id: 'satisfacao-5', emoji: '🙁', label: 'Ruim', value: 'Ruim', score: 2 },
      { id: 'satisfacao-6', emoji: '😠', label: 'Péssimo', value: 'Péssimo', score: 1 },
    ],
  },
  {
    id: 'frequencia',
    nome: 'Grupo 2 — Frequência',
    descricao: 'Com que frequência algo acontece.',
    smiles: [
      { id: 'frequencia-1', emoji: '🟢', label: 'Sempre', value: 'Sempre', score: 5 },
      { id: 'frequencia-2', emoji: '🟡', label: 'Frequentemente', value: 'Frequentemente', score: 4 },
      { id: 'frequencia-3', emoji: '🟠', label: 'Às vezes', value: 'Às vezes', score: 3 },
      { id: 'frequencia-4', emoji: '🔴', label: 'Raramente', value: 'Raramente', score: 2 },
      { id: 'frequencia-5', emoji: '⚪', label: 'Nunca', value: 'Nunca', score: 1 },
    ],
  },
  {
    id: 'intensidade',
    nome: 'Grupo 3 — Intensidade',
    descricao: 'Grau/intensidade de algo.',
    smiles: [
      { id: 'intensidade-1', emoji: '🔥', label: 'Muito', value: 'Muito', score: 4 },
      { id: 'intensidade-2', emoji: '⚡', label: 'Médio', value: 'Médio', score: 3 },
      { id: 'intensidade-3', emoji: '🌱', label: 'Pouco', value: 'Pouco', score: 2 },
      { id: 'intensidade-4', emoji: '⭕', label: 'Nada', value: 'Nada', score: 1 },
    ],
  },
  {
    id: 'concordancia',
    nome: 'Grupo 4 — Concordância',
    descricao: 'Escala de concordância (Likert).',
    smiles: [
      { id: 'concordancia-1', emoji: '👍👍', label: 'Concordo totalmente', value: 'Concordo totalmente', score: 5 },
      { id: 'concordancia-2', emoji: '👍', label: 'Concordo', value: 'Concordo', score: 4 },
      { id: 'concordancia-3', emoji: '😐', label: 'Neutro', value: 'Neutro', score: 3 },
      { id: 'concordancia-4', emoji: '👎', label: 'Discordo', value: 'Discordo', score: 2 },
      { id: 'concordancia-5', emoji: '👎👎', label: 'Discordo totalmente', value: 'Discordo totalmente', score: 1 },
    ],
  },
  {
    id: 'infantil',
    nome: 'Grupo 5 — Educação Infantil',
    descricao: 'Escala lúdica para crianças.',
    smiles: [
      { id: 'infantil-1', emoji: '😍', label: 'Adorei', value: 'Adorei', score: 5 },
      { id: 'infantil-2', emoji: '😀', label: 'Gostei', value: 'Gostei', score: 4 },
      { id: 'infantil-3', emoji: '🙂', label: 'Legal', value: 'Legal', score: 3 },
      { id: 'infantil-4', emoji: '😕', label: 'Não gostei', value: 'Não gostei', score: 2 },
      { id: 'infantil-5', emoji: '😭', label: 'Não gostei nada', value: 'Não gostei nada', score: 1 },
    ],
  },
];

const SMILE_BY_ID = new Map<string, SmileItem>();
SMILE_GROUPS.forEach((g) => g.smiles.forEach((s) => SMILE_BY_ID.set(s.id, s)));

export function getSmileById(id?: string): SmileItem | undefined {
  if (!id) return undefined;
  return SMILE_BY_ID.get(id);
}

export function getSmileGroupById(id?: string): SmileGroup | undefined {
  if (!id) return undefined;
  return SMILE_GROUPS.find((g) => g.id === id);
}

/**
 * Gera uma escala rápida de emojis (Muito feliz → Muito triste) com a
 * quantidade de níveis solicitada (5, 7 ou 10).
 */
export function buildEmojiScale(steps: number): SmileItem[] {
  if (steps <= 5) {
    return [
      { id: 'scale-1', emoji: '😁', label: 'Muito feliz', value: 'Muito feliz', score: 5 },
      { id: 'scale-2', emoji: '🙂', label: 'Feliz', value: 'Feliz', score: 4 },
      { id: 'scale-3', emoji: '😐', label: 'Neutro', value: 'Neutro', score: 3 },
      { id: 'scale-4', emoji: '🙁', label: 'Triste', value: 'Triste', score: 2 },
      { id: 'scale-5', emoji: '😢', label: 'Muito triste', value: 'Muito triste', score: 1 },
    ];
  }
  if (steps >= 7 && steps < 10) {
    return [
      { id: 'scale-1', emoji: '😁', label: 'Muito feliz', value: 'Muito feliz', score: 7 },
      { id: 'scale-2', emoji: '😀', label: 'Feliz', value: 'Feliz', score: 6 },
      { id: 'scale-3', emoji: '🙂', label: 'Satisfeito', value: 'Satisfeito', score: 5 },
      { id: 'scale-4', emoji: '😐', label: 'Neutro', value: 'Neutro', score: 4 },
      { id: 'scale-5', emoji: '😕', label: 'Insatisfeito', value: 'Insatisfeito', score: 3 },
      { id: 'scale-6', emoji: '🙁', label: 'Triste', value: 'Triste', score: 2 },
      { id: 'scale-7', emoji: '😭', label: 'Muito triste', value: 'Muito triste', score: 1 },
    ];
  }
  // 10 níveis (ou mais) — interpolado entre os extremos.
  const emojis = ['😁', '😀', '😃', '🙂', '😉', '😐', '😕', '🙁', '😢', '😭'];
  const labels = [
    'Muito feliz', 'Muito satisfeito', 'Satisfeito', 'Bem', 'Neutro positivo',
    'Neutro', 'Pouco insatisfeito', 'Insatisfeito', 'Triste', 'Muito triste',
  ];
  return emojis.map((emoji, i) => ({
    id: `scale-${i + 1}`,
    emoji,
    label: labels[i],
    value: labels[i],
    score: 10 - i,
  }));
}
