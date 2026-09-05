/**
 * Utilitário Estatístico de Teoria de Amostragem Probabilística (Cochran / Yamane)
 * Calcula margem de erro, nível de confiança (Z-score) e tamanho amostral mínimo ideal
 * Conforme padrões do TSE (Tribunal Superior Eleitoral), ABEP e WAPOR
 */

/**
 * Aproximação de alta precisão de Hastings para a função quantil da Normal Padrão
 * Inversa da CDF Normal (probit), precisão superior a 6 casas decimais.
 */
export function getZScore(confidencePercent: number): number {
  // Limita a porcentagem entre 50% e 99.99%
  const c = Math.min(99.99, Math.max(50, confidencePercent));
  
  // Níveis clássicos fixos com máxima precisão
  const rounded = Math.round(c * 10) / 10;
  if (rounded === 90) return 1.645;
  if (rounded === 95) return 1.960;
  if (rounded === 95.5) return 2.000;
  if (rounded === 98) return 2.326;
  if (rounded === 99) return 2.576;
  if (rounded === 99.9) return 3.291;

  // Cauda unilateral: alpha/2
  const alpha = 1 - c / 100;
  const p = 1 - alpha / 2; // ex: para 95%, p = 0.975

  // Aproximação de Peter J. Acklam / Hastings
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c_coeff = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d_coeff = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const q = p - 0.5;
  if (Math.abs(q) <= 0.425) {
    const r = 0.180625 - q * q;
    return (
      (q *
        (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5])) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    const r = p < 0.5 ? p : 1 - p;
    const s = Math.sqrt(-Math.log(r));
    const z =
      (((((c_coeff[0] * s + c_coeff[1]) * s + c_coeff[2]) * s + c_coeff[3]) * s +
        c_coeff[4]) *
        s +
        c_coeff[5]) /
      ((((d_coeff[0] * s + d_coeff[1]) * s + d_coeff[2]) * s + d_coeff[3]) * s + 1);
    return p < 0.5 ? -z : z;
  }
}

/**
 * Função cumulativa aproximada da Normal Padrão Phi(z)
 */
export function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

export const STANDARD_CONFIDENCE_LEVELS = [
  {
    level: 90,
    zScore: 1.645,
    label: '90%',
    title: '90% (Exploratória)',
    description: 'Pesquisas de sondagem rápida e menor custo amostral',
    tseRecommended: false,
    alpha: '10%',
  },
  {
    level: 95,
    zScore: 1.960,
    label: '95%',
    title: '95% (Padrão Ouro)',
    description: 'Padrão oficial adotado pelo TSE, WAPOR e institutos',
    tseRecommended: true,
    alpha: '5%',
  },
  {
    level: 99,
    zScore: 2.576,
    label: '99%',
    title: '99% (Alta Certeza)',
    description: 'Máximo rigor estatístico para decisões críticas',
    tseRecommended: false,
    alpha: '1%',
  },
] as const;

/**
 * Retorna o Nível de Confiança correspondente a um determinado Z-Score (inversa)
 */
export function getConfidenceFromZScore(z: number): number {
  if (isNaN(z) || z <= 0) return 50;
  const phi = normalCDF(z);
  const confidence = (2 * phi - 1) * 100;
  return Math.min(99.99, Math.max(50, Math.round(confidence * 10) / 10));
}

export interface SampleCalculationResult {
  confidencePercent: number; // Ex: 95 (%)
  zScore: number; // Ex: 1.96
  marginOfErrorPercent: number; // Ex: 3.5 (%)
  sampleSize: number; // Ex: 784 (teto mínimo de coletas)
  population?: number; // Tamanho do universo, se informado
  isFiniteCorrectionApplied: boolean;
  idealRecomendadoReserva: number; // Com margem de segurança (+15%)
  heterogeneity: number; // Padrão 0.5 (máxima dispersão p = 50%)
  formulaAplicada: string;
}

/**
 * Calcula o número mínimo ideal de coletas dado o Nível de Confiança e a Margem de Erro
 * Fórmula de Cochran: n0 = (Z^2 * p * (1-p)) / e^2
 * Ajuste para população finita: n = n0 / (1 + (n0 - 1) / N)
 */
export function calculateSampleSize(
  confidencePercent: number,
  marginOfErrorPercent: number,
  population?: number,
  heterogeneity: number = 0.5,
  reservaTecnica: number = 0.15,
  overrideZScore?: number
): SampleCalculationResult {
  const conf = Math.min(99.99, Math.max(50, confidencePercent));
  const err = Math.min(25, Math.max(0.1, marginOfErrorPercent));
  const eDec = err / 100;
  const z = overrideZScore && overrideZScore > 0 ? overrideZScore : getZScore(conf);

  const p = Math.min(0.99, Math.max(0.01, heterogeneity));
  const variance = p * (1 - p); // No pior caso p = 0.5 => 0.25

  // Tamanho para população infinita
  const n0 = (z * z * variance) / (eDec * eDec);

  let nFinal: number;
  let isFinite = false;

  if (population && population > 0 && population < 10000000) {
    // População finita conhecida
    nFinal = Math.ceil(n0 / (1 + (n0 - 1) / population));
    isFinite = true;
  } else {
    nFinal = Math.ceil(n0);
  }

  const idealRecomendado = Math.ceil(nFinal * (1 + reservaTecnica));

  const formulaAplicada = isFinite
    ? `n = [Z² · p(1-p) / e²] ÷ [1 + (n₀ - 1) / N] = [(${z.toFixed(3)})² · ${variance} / (${eDec.toFixed(4)})²] com N=${population?.toLocaleString('pt-BR')} => ${nFinal} coletas`
    : `n = [Z² · p(1-p)] / e² = [(${z.toFixed(3)})² · 0.25] / (${eDec.toFixed(4)})² => ${nFinal} coletas`;

  return {
    confidencePercent: Math.round(conf * 100) / 100,
    zScore: Math.round(z * 1000) / 1000,
    marginOfErrorPercent: Math.round(err * 100) / 100,
    sampleSize: Math.max(1, nFinal),
    population,
    isFiniteCorrectionApplied: isFinite,
    idealRecomendadoReserva: Math.max(1, idealRecomendado),
    heterogeneity: p,
    formulaAplicada,
  };
}

/**
 * Calcula a Margem de Erro exata proporcionada por um determinado número de coletas
 * Dado o Nível de Confiança e o Tamanho da Amostra (n)
 * e = Z * sqrt(p(1-p)/n) * sqrt((N - n)/(N - 1))
 */
export function calculateMarginOfErrorFromSample(
  sampleSize: number,
  confidencePercent: number,
  population?: number,
  heterogeneity: number = 0.5
): {
  marginOfErrorPercent: number;
  zScore: number;
  confidencePercent: number;
  sampleSize: number;
} {
  const n = Math.max(1, sampleSize);
  const conf = Math.min(99.99, Math.max(50, confidencePercent));
  const z = getZScore(conf);
  const p = Math.min(0.99, Math.max(0.01, heterogeneity));
  const variance = p * (1 - p);

  let eDec = z * Math.sqrt(variance / n);

  if (population && population > n && population < 10000000) {
    const finiteCorrection = Math.sqrt((population - n) / (population - 1));
    eDec *= finiteCorrection;
  }

  const marginOfErrorPercent = Math.round(eDec * 100 * 100) / 100;

  return {
    marginOfErrorPercent,
    zScore: Math.round(z * 1000) / 1000,
    confidencePercent: conf,
    sampleSize: n,
  };
}

/**
 * Matriz de Referência Estatística para Comparação Imediata
 * Cruzando Níveis de Confiança (90%, 95%, 95.5%, 99%) com Margens de Erro (2%, 3%, 4%, 5%)
 */
export function getStandardSamplingMatrix(population?: number): {
  confidenceLevels: number[];
  marginsOfError: number[];
  matrix: number[][]; // [confIdx][marginIdx] => n mínimo
} {
  const confidenceLevels = [90, 95, 95.5, 98, 99];
  const marginsOfError = [2.0, 2.5, 3.0, 3.5, 4.0, 5.0];

  const matrix = confidenceLevels.map((conf) =>
    marginsOfError.map((err) => {
      const res = calculateSampleSize(conf, err, population);
      return res.sampleSize;
    })
  );

  return { confidenceLevels, marginsOfError, matrix };
}
