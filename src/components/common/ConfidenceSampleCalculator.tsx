import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Percent,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Info,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import {
  calculateSampleSize,
  calculateMarginOfErrorFromSample,
  getStandardSamplingMatrix,
  SampleCalculationResult,
} from '../../utils/samplingUtils';

interface ConfidenceSampleCalculatorProps {
  currentGoal?: number;
  initialConfidence?: number; // Padrão: 95 (%)
  initialMarginOfError?: number; // Padrão: 3.5 (%)
  initialPopulation?: number;
  onApplyGoal?: (minSample: number, confidence: number, margin: number) => void;
  compact?: boolean;
}

export const ConfidenceSampleCalculator: React.FC<ConfidenceSampleCalculatorProps> = ({
  currentGoal = 400,
  initialConfidence = 95,
  initialMarginOfError = 3.5,
  initialPopulation,
  onApplyGoal,
  compact = false,
}) => {
  const [confidencePercent, setConfidencePercent] = useState<number>(initialConfidence);
  const [marginOfError, setMarginOfError] = useState<number>(initialMarginOfError);
  const [population, setPopulation] = useState<number | undefined>(initialPopulation);
  const [usePopulation, setUsePopulation] = useState<boolean>(Boolean(initialPopulation));
  const [showMatrix, setShowMatrix] = useState<boolean>(false);
  const [appliedFeedback, setAppliedFeedback] = useState<boolean>(false);

  // Cálculos Amostrais Reativos
  const sampleResult: SampleCalculationResult = useMemo(() => {
    return calculateSampleSize(
      confidencePercent,
      marginOfError,
      usePopulation ? population : undefined
    );
  }, [confidencePercent, marginOfError, population, usePopulation]);

  // Margem de erro correspondente para a Meta Atual com esse Nível de Confiança
  const currentGoalMargin = useMemo(() => {
    return calculateMarginOfErrorFromSample(
      currentGoal,
      confidencePercent,
      usePopulation ? population : undefined
    );
  }, [currentGoal, confidencePercent, population, usePopulation]);

  // Matriz de Referência
  const matrixData = useMemo(() => {
    return getStandardSamplingMatrix(usePopulation ? population : undefined);
  }, [population, usePopulation]);

  const handleApply = () => {
    if (onApplyGoal) {
      onApplyGoal(sampleResult.sampleSize, sampleResult.confidencePercent, sampleResult.marginOfErrorPercent);
      setAppliedFeedback(true);
      setTimeout(() => setAppliedFeedback(false), 2500);
    }
  };

  const confidencePresets = [90, 95, 95.5, 98, 99];
  const marginPresets = [2.0, 2.5, 3.0, 3.5, 4.0, 5.0];

  return (
    <div className="rounded-xl bg-surface border border-ui/80 shadow-md overflow-hidden transition-all">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-surface-raised border-b border-ui/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent-primary-soft border border-accent-primary-soft-border flex items-center justify-center text-accent-primary shrink-0">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-primary flex items-center gap-2">
              <span>Cálculo da Margem de Confiança & Amostra Mínima Ideal</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-primary-soft text-accent-primary border border-emerald-400/40">
                Padrão Estatístico Cochran
              </span>
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Defina a porcentagem de confiança desejada e veja o número exato de coletas mínimas para garantir a precisão ideal.
            </p>
          </div>
        </div>

        {onApplyGoal && (
          <button
            type="button"
            onClick={handleApply}
            className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0 ${
              appliedFeedback
                ? 'bg-accent-success-solid text-on-accent'
                : 'bg-accent-primary-solid hover:bg-accent-primary-solid-hover text-on-accent border border-emerald-500'
            }`}
          >
            {appliedFeedback ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Meta Aplicada com Sucesso!</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Adotar {sampleResult.sampleSize} Coletas na Pesquisa</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Controls Grid */}
      <div className="p-4 sm:p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Nível / Margem de Confiança (%) */}
          <div className="space-y-3 p-3.5 rounded-xl bg-surface-raised border border-ui/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-accent-primary" />
                <span>Nível de Confiança da Pesquisa (%)</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-base font-extrabold text-accent-primary">{confidencePercent}%</span>
                <span className="text-[11px] text-muted">(Z = {sampleResult.zScore})</span>
              </div>
            </div>

            {/* Slider interativo */}
            <input
              type="range"
              min="80"
              max="99.9"
              step="0.1"
              value={confidencePercent}
              onChange={(e) => setConfidencePercent(parseFloat(e.target.value))}
              className="w-full h-2 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            {/* Presets Rápidos */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-muted mr-1">Atalhos:</span>
              {confidencePresets.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setConfidencePercent(pct)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                    confidencePercent === pct
                      ? 'bg-accent-primary-solid text-on-accent shadow-xs border border-emerald-400'
                      : 'bg-surface-raised text-secondary hover:bg-surface-hover hover:text-primary border border-ui'
                  }`}
                >
                  {pct}%
                </button>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="number"
                  min="50"
                  max="99.99"
                  step="0.1"
                  value={confidencePercent}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setConfidencePercent(val);
                  }}
                  className="w-16 px-1.5 py-0.5 text-xs text-right font-bold rounded bg-surface-app border border-ui text-primary"
                />
                <span className="text-xs text-muted">%</span>
              </div>
            </div>
          </div>

          {/* Margem de Erro Aceitável (%) */}
          <div className="space-y-3 p-3.5 rounded-xl bg-surface-raised border border-ui/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-accent-success" />
                <span>Margem de Erro Máxima Aceitável (± %)</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-base font-extrabold text-accent-success">±{marginOfError}%</span>
                <span className="text-[11px] text-muted">pontos percentuais</span>
              </div>
            </div>

            {/* Slider interativo */}
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.1"
              value={marginOfError}
              onChange={(e) => setMarginOfError(parseFloat(e.target.value))}
              className="w-full h-2 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            {/* Presets Rápidos */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-muted mr-1">Padrões:</span>
              {marginPresets.map((err) => (
                <button
                  key={err}
                  type="button"
                  onClick={() => setMarginOfError(err)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                    marginOfError === err
                      ? 'bg-accent-success-solid text-on-accent shadow-xs border border-emerald-400'
                      : 'bg-surface-raised text-secondary hover:bg-surface-hover hover:text-primary border border-ui'
                  }`}
                >
                  ±{err}%
                </button>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="number"
                  min="0.5"
                  max="20"
                  step="0.1"
                  value={marginOfError}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setMarginOfError(val);
                  }}
                  className="w-16 px-1.5 py-0.5 text-xs text-right font-bold rounded bg-surface-app border border-ui text-primary"
                />
                <span className="text-xs text-muted">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* População Finita Opcional */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-surface-raised border border-ui/60 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={usePopulation}
              onChange={(e) => setUsePopulation(e.target.checked)}
              className="rounded border-ui text-accent-primary-solid focus:ring-emerald-500 h-4 w-4 bg-surface-raised"
            />
            <span className="font-semibold text-primary">
              Aplicar correção para População / Eleitorado Finito (Município/Região)
            </span>
          </label>

          {usePopulation && (
            <div className="flex items-center gap-2">
              <span className="text-muted">Total de Habitantes / Eleitores (N):</span>
              <input
                type="number"
                min="100"
                max="50000000"
                step="1000"
                value={population || 50000}
                onChange={(e) => setPopulation(parseInt(e.target.value) || 1000)}
                className="w-28 px-2 py-1 text-xs font-bold rounded bg-surface-app border border-ui text-primary text-right"
              />
            </div>
          )}
        </div>

        {/* Resultados Calculados em Destaque */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Coletas Mínimas Ideais */}
          <div className="p-4 rounded-xl bg-accent-primary-soft border border-accent-primary-soft-border flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent-primary flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-accent-primary" />
                Número Mínimo Ideal (n)
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-primary">
                  {sampleResult.sampleSize.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-secondary font-semibold">entrevistas</span>
              </div>
            </div>
            <p className="text-[11px] text-secondary mt-2 border-t border-ui/60 pt-2">
              Garante o nível de confiança de <strong className="text-primary">{sampleResult.confidencePercent}%</strong> com margem máxima de <strong className="text-primary">±{sampleResult.marginOfErrorPercent}%</strong>.
            </p>
          </div>

          {/* Card 2: Recomendação com Reserva Técnica */}
          <div className="p-4 rounded-xl bg-accent-purple-soft border border-accent-purple-soft-border flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent-purple flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-accent-purple" />
                Recomendado com Reserva (+15%)
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-primary">
                  {sampleResult.idealRecomendadoReserva.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-secondary font-semibold">entrevistas</span>
              </div>
            </div>
            <p className="text-[11px] text-secondary mt-2 border-t border-ui/60 pt-2">
              Margem de segurança para absorver recusas, cotas difíceis e auditorias de controle de qualidade.
            </p>
          </div>

          {/* Card 3: Análise da Meta Atual da Pesquisa */}
          <div className="p-4 rounded-xl bg-accent-success-soft border border-accent-success-soft-border flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent-success flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-accent-success" />
                Precisão na Meta Atual ({currentGoal})
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-primary">
                  ±{currentGoalMargin.marginOfErrorPercent}%
                </span>
                <span className="text-xs text-secondary font-semibold">margem de erro</span>
              </div>
            </div>
            <p className="text-[11px] text-secondary mt-2 border-t border-ui/60 pt-2">
              {currentGoal >= sampleResult.sampleSize ? (
                <span className="text-accent-success font-semibold">
                  ✓ A meta atual ({currentGoal}) supera a amostra mínima necessária ({sampleResult.sampleSize}).
                </span>
              ) : (
                <span className="text-accent-warning font-semibold">
                  ⚠ A meta atual ({currentGoal}) tem margem de erro maior que os ±{marginOfError}% pretendidos.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Detalhes Técnicos e Fórmula Estatística */}
        <div className="p-3 rounded-lg bg-surface-raised border border-ui/70 text-xs text-secondary space-y-1.5 font-mono">
          <div className="flex items-center gap-2 text-primary font-bold font-sans">
            <Info className="h-4 w-4 text-accent-primary shrink-0" />
            <span>Memória de Cálculo Probabilístico:</span>
          </div>
          <div className="pl-6 text-[11px] leading-relaxed text-secondary">
            {sampleResult.formulaAplicada} (com variabilidade máxima p=50%, q=50%).
          </div>
        </div>

        {/* Tabela de Sensibilidade Alternável */}
        <div>
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="inline-flex items-center gap-2 text-xs font-bold text-accent-primary hover:text-accent-primary transition-colors"
          >
            <Layers className="h-4 w-4" />
            <span>
              {showMatrix ? 'Ocultar' : 'Ver'} Matriz Comparativa (Confiança × Margem de Erro)
            </span>
            {showMatrix ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showMatrix && (
            <div className="mt-3 overflow-x-auto rounded-xl border border-ui/80">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-raised text-primary border-b border-ui/80">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Nível de Confiança</th>
                    {matrixData.marginsOfError.map((err) => (
                      <th key={err} className="py-2.5 px-3 font-bold text-center">
                        ±{err}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui text-secondary bg-surface">
                  {matrixData.confidenceLevels.map((conf, cIdx) => {
                    const isCurrentConf = Math.abs(confidencePercent - conf) < 0.2;
                    return (
                      <tr
                        key={conf}
                        className={isCurrentConf ? 'bg-accent-primary-soft font-bold' : 'hover:bg-surface-raised'}
                      >
                        <td className="py-2.5 px-3 flex items-center gap-1.5 text-primary">
                          <span>{conf}%</span>
                          {isCurrentConf && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-accent-primary-soft text-accent-primary">
                              ativo
                            </span>
                          )}
                        </td>
                        {matrixData.marginsOfError.map((err, mIdx) => {
                          const nVal = matrixData.matrix[cIdx][mIdx];
                          const isCurrentCell =
                            isCurrentConf && Math.abs(marginOfError - err) < 0.2;
                          return (
                            <td key={err} className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfidencePercent(conf);
                                  setMarginOfError(err);
                                }}
                                className={`w-full py-1 px-1.5 rounded transition-all font-bold ${
                                  isCurrentCell
                                    ? 'bg-accent-primary-solid text-on-accent shadow-xs'
                                    : 'hover:bg-surface-raised text-primary'
                                }`}
                                title={`Clique para adotar: ${conf}% de confiança e ±${err}% de erro`}
                              >
                                {nVal.toLocaleString('pt-BR')}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-2 bg-surface-raised border-t border-ui/80 text-[10px] text-muted text-center">
                Dica: Clique em qualquer célula da tabela para simular instantaneamente o número de coletas correspondente.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
