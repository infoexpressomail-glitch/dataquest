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
    <div className="rounded-xl bg-[#16171d] border border-slate-700/80 shadow-md overflow-hidden transition-all">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-indigo-900/30 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Cálculo da Margem de Confiança & Amostra Mínima Ideal</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40">
                Padrão Estatístico Cochran
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
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
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500'
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
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                <span>Nível de Confiança da Pesquisa (%)</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-base font-extrabold text-blue-400">{confidencePercent}%</span>
                <span className="text-[11px] text-slate-400">(Z = {sampleResult.zScore})</span>
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
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            {/* Presets Rápidos */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Atalhos:</span>
              {confidencePresets.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setConfidencePercent(pct)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                    confidencePercent === pct
                      ? 'bg-blue-600 text-white shadow-xs border border-blue-400'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
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
                  className="w-16 px-1.5 py-0.5 text-xs text-right font-bold rounded bg-slate-950 border border-slate-700 text-white"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
          </div>

          {/* Margem de Erro Aceitável (%) */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-emerald-400" />
                <span>Margem de Erro Máxima Aceitável (± %)</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-base font-extrabold text-emerald-400">±{marginOfError}%</span>
                <span className="text-[11px] text-slate-400">pontos percentuais</span>
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
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            {/* Presets Rápidos */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Padrões:</span>
              {marginPresets.map((err) => (
                <button
                  key={err}
                  type="button"
                  onClick={() => setMarginOfError(err)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                    marginOfError === err
                      ? 'bg-emerald-600 text-white shadow-xs border border-emerald-400'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
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
                  className="w-16 px-1.5 py-0.5 text-xs text-right font-bold rounded bg-slate-950 border border-slate-700 text-white"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* População Finita Opcional */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-slate-900/40 border border-slate-700/60 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={usePopulation}
              onChange={(e) => setUsePopulation(e.target.checked)}
              className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-slate-900"
            />
            <span className="font-semibold text-slate-200">
              Aplicar correção para População / Eleitorado Finito (Município/Região)
            </span>
          </label>

          {usePopulation && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Total de Habitantes / Eleitores (N):</span>
              <input
                type="number"
                min="100"
                max="50000000"
                step="1000"
                value={population || 50000}
                onChange={(e) => setPopulation(parseInt(e.target.value) || 1000)}
                className="w-28 px-2 py-1 text-xs font-bold rounded bg-slate-950 border border-slate-700 text-white text-right"
              />
            </div>
          )}
        </div>

        {/* Resultados Calculados em Destaque */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Coletas Mínimas Ideais */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-500/40 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-blue-400" />
                Número Mínimo Ideal (n)
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-white">
                  {sampleResult.sampleSize.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-slate-300 font-semibold">entrevistas</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 mt-2 border-t border-slate-700/60 pt-2">
              Garante o nível de confiança de <strong className="text-white">{sampleResult.confidencePercent}%</strong> com margem máxima de <strong className="text-white">±{sampleResult.marginOfErrorPercent}%</strong>.
            </p>
          </div>

          {/* Card 2: Recomendação com Reserva Técnica */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/40 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                Recomendado com Reserva (+15%)
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-white">
                  {sampleResult.idealRecomendadoReserva.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-slate-300 font-semibold">entrevistas</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 mt-2 border-t border-slate-700/60 pt-2">
              Margem de segurança para absorver recusas, cotas difíceis e auditorias de controle de qualidade.
            </p>
          </div>

          {/* Card 3: Análise da Meta Atual da Pesquisa */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Precisão na Meta Atual ({currentGoal})
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-white">
                  ±{currentGoalMargin.marginOfErrorPercent}%
                </span>
                <span className="text-xs text-slate-300 font-semibold">margem de erro</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 mt-2 border-t border-slate-700/60 pt-2">
              {currentGoal >= sampleResult.sampleSize ? (
                <span className="text-emerald-400 font-semibold">
                  ✓ A meta atual ({currentGoal}) supera a amostra mínima necessária ({sampleResult.sampleSize}).
                </span>
              ) : (
                <span className="text-amber-400 font-semibold">
                  ⚠ A meta atual ({currentGoal}) tem margem de erro maior que os ±{marginOfError}% pretendidos.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Detalhes Técnicos e Fórmula Estatística */}
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-700/70 text-xs text-slate-300 space-y-1.5 font-mono">
          <div className="flex items-center gap-2 text-slate-200 font-bold font-sans">
            <Info className="h-4 w-4 text-blue-400 shrink-0" />
            <span>Memória de Cálculo Probabilístico:</span>
          </div>
          <div className="pl-6 text-[11px] leading-relaxed text-slate-300">
            {sampleResult.formulaAplicada} (com variabilidade máxima p=50%, q=50%).
          </div>
        </div>

        {/* Tabela de Sensibilidade Alternável */}
        <div>
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Layers className="h-4 w-4" />
            <span>
              {showMatrix ? 'Ocultar' : 'Ver'} Matriz Comparativa (Confiança × Margem de Erro)
            </span>
            {showMatrix ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showMatrix && (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-700/80">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/90 text-slate-200 border-b border-slate-700/80">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Nível de Confiança</th>
                    {matrixData.marginsOfError.map((err) => (
                      <th key={err} className="py-2.5 px-3 font-bold text-center">
                        ±{err}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 bg-[#16171d]">
                  {matrixData.confidenceLevels.map((conf, cIdx) => {
                    const isCurrentConf = Math.abs(confidencePercent - conf) < 0.2;
                    return (
                      <tr
                        key={conf}
                        className={isCurrentConf ? 'bg-blue-600/10 font-bold' : 'hover:bg-slate-900/50'}
                      >
                        <td className="py-2.5 px-3 flex items-center gap-1.5 text-white">
                          <span>{conf}%</span>
                          {isCurrentConf && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-500/20 text-blue-300">
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
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'hover:bg-slate-800 text-slate-200'
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
              <div className="p-2 bg-slate-900/60 border-t border-slate-700/80 text-[10px] text-slate-400 text-center">
                Dica: Clique em qualquer célula da tabela para simular instantaneamente o número de coletas correspondente.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
