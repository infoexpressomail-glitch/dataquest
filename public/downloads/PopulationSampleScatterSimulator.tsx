import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Percent,
  Users,
  Target,
  Info,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  BarChart2,
  Layers,
  Zap,
  SlidersHorizontal,
  Check,
  Download,
  FileCode,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import {
  calculateSampleSize,
  getZScore,
  calculateMarginOfErrorFromSample,
  STANDARD_CONFIDENCE_LEVELS,
  getConfidenceFromZScore,
} from '../../utils/samplingUtils';
import { Survey } from '../../types';

interface PopulationSampleScatterSimulatorProps {
  activeSurvey?: Survey;
  onApplySampleToSurvey?: (sampleSize: number, confidence: number, margin: number, population?: number) => void;
}

export const PopulationSampleScatterSimulator: React.FC<PopulationSampleScatterSimulatorProps> = ({
  activeSurvey,
  onApplySampleToSurvey,
}) => {
  const { darkMode, saveSurvey } = useApp();

  // Estados dos parâmetros da fórmula n = (Z² · p · (1-p)) / E²
  const [confidencePercent, setConfidencePercent] = useState<number>(
    activeSurvey?.nivelConfiancaPercentual || 95
  );
  const [zScoreInput, setZScoreInput] = useState<string>(() => {
    const initConf = activeSurvey?.nivelConfiancaPercentual || 95;
    return getZScore(initConf).toFixed(3);
  });
  const [lastAutoFilledFeedback, setLastAutoFilledFeedback] = useState<string | null>(() => {
    const initConf = activeSurvey?.nivelConfiancaPercentual || 95;
    if (Math.abs(initConf - 90) < 0.1) return 'Z = 1,645 preenchido automaticamente (90% de confiança)';
    if (Math.abs(initConf - 99) < 0.1) return 'Z = 2,576 preenchido automaticamente (99% de confiança)';
    return 'Z = 1,960 preenchido automaticamente (Padrão Ouro TSE - 95%)';
  });
  const [showCustomConfidenceControls, setShowCustomConfidenceControls] = useState<boolean>(false);

  const [marginOfErrorPercent, setMarginOfErrorPercent] = useState<number>(
    activeSurvey?.margemErroPercentual || 3.5
  );
  const [hasFinitePopulation, setHasFinitePopulation] = useState<boolean>(
    Boolean(activeSurvey?.populacaoUniverso && activeSurvey.populacaoUniverso > 0)
  );
  const [populationInput, setPopulationInput] = useState<string>(
    activeSurvey?.populacaoUniverso ? String(activeSurvey.populacaoUniverso) : '50000'
  );

  // Proporção populacional p (padrão 0.5 para máxima variabilidade p*(1-p) = 0.25)
  const [heterogeneity, setHeterogeneity] = useState<number>(0.5);
  const [showAdvancedParams, setShowAdvancedParams] = useState<boolean>(false);

  // Modo do gráfico de dispersão: 'error_vs_sample' (Margem de erro x Amostra) ou 'pop_vs_sample' (População x Amostra)
  const [chartViewMode, setChartViewMode] = useState<'error_vs_sample' | 'pop_vs_sample'>('error_vs_sample');

  // População numérica tratada
  const parsedPopulation = useMemo(() => {
    if (!hasFinitePopulation) return undefined;
    const num = parseInt(populationInput.replace(/\D/g, ''), 10);
    return isNaN(num) || num <= 0 ? undefined : num;
  }, [hasFinitePopulation, populationInput]);

  // Escore Z correspondente ao campo de entrada (com fallback para getZScore)
  const parsedZScore = useMemo(() => {
    const cleaned = zScoreInput.replace(',', '.').trim();
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) return num;
    return getZScore(confidencePercent);
  }, [zScoreInput, confidencePercent]);

  // Handler para seleção rápida de Nível Padrão (90%, 95%, 99%)
  const handleSelectStandardConfidence = (level: number, zVal: number, title: string) => {
    setConfidencePercent(level);
    const formattedZ = zVal.toFixed(3);
    setZScoreInput(formattedZ);
    setLastAutoFilledFeedback(
      `✓ Z-score preenchido automaticamente: ${formattedZ.replace('.', ',')} para ${title}`
    );
  };

  // Handler para digitação manual no campo de Z-score
  const handleZScoreInputChange = (rawVal: string) => {
    setZScoreInput(rawVal);
    const cleaned = rawVal.replace(',', '.').trim();
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0 && num <= 5.0) {
      const derivedConf = getConfidenceFromZScore(num);
      setConfidencePercent(derivedConf);
      setLastAutoFilledFeedback(
        `Escore Z customizado (${num.toFixed(3).replace('.', ',')}) aplicado. Confiança equivalente: ${derivedConf.toFixed(1)}%`
      );
    }
  };

  // Handler para alteração da porcentagem de confiança
  const handleConfidencePercentChange = (val: number) => {
    const bounded = Math.min(99.9, Math.max(50, val));
    setConfidencePercent(bounded);
    const newZ = getZScore(bounded);
    const formattedZ = newZ.toFixed(3);
    setZScoreInput(formattedZ);
    setLastAutoFilledFeedback(
      `Z-score atualizado para ${formattedZ.replace('.', ',')} (${bounded.toFixed(1)}% de confiança)`
    );
  };

  // Escore Z efetivo utilizado no simulador
  const zScore = parsedZScore;

  // Cálculo principal dinâmico do tamanho amostral
  const calculationResult = useMemo(() => {
    return calculateSampleSize(
      confidencePercent,
      marginOfErrorPercent,
      parsedPopulation,
      heterogeneity,
      0.15, // 15% de reserva técnica recomendada
      parsedZScore
    );
  }, [confidencePercent, marginOfErrorPercent, parsedPopulation, heterogeneity, parsedZScore]);

  // Variância p*(1-p)
  const variance = heterogeneity * (1 - heterogeneity);
  const eDec = marginOfErrorPercent / 100;
  const n0Infinite = Math.ceil((zScore * zScore * variance) / (eDec * eDec));

  // Dados para o Gráfico de Dispersão 1: Margem de Erro vs Tamanho da Amostra (n)
  // Geramos pontos ao longo de margens de erro de 1.0% a 7.0%
  const scatterDataByError = useMemo(() => {
    const errorSteps = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0];
    
    // Série 1: Nível de confiança selecionado pelo usuário
    const currentConfSeries = errorSteps.map((err) => {
      const res = calculateSampleSize(confidencePercent, err, parsedPopulation, heterogeneity);
      return {
        marginOfError: err,
        sampleSize: res.sampleSize,
        confidence: confidencePercent,
        z: zScore,
        population: parsedPopulation || 'Infinita',
        type: 'current_confidence',
      };
    });

    // Série 2: Nível de confiança comparativo 95% (se o usuário escolheu outro) ou 99%
    const compConfidence = confidencePercent === 95 ? 99 : 95;
    const compZ = getZScore(compConfidence);
    const compSeries = errorSteps.map((err) => {
      const res = calculateSampleSize(compConfidence, err, parsedPopulation, heterogeneity);
      return {
        marginOfError: err,
        sampleSize: res.sampleSize,
        confidence: compConfidence,
        z: compZ,
        population: parsedPopulation || 'Infinita',
        type: 'comparison_confidence',
      };
    });

    return {
      currentConfSeries,
      compSeries,
      compConfidence,
    };
  }, [confidencePercent, parsedPopulation, heterogeneity, zScore]);

  // Dados para o Gráfico de Dispersão 2: População (N) vs Tamanho da Amostra (n)
  // Mostra o comportamento de amortecimento amostral conforme o tamanho do universo cresce
  const scatterDataByPopulation = useMemo(() => {
    const popSteps = [
      500, 1000, 2500, 5000, 10000, 20000, 50000, 100000, 250000, 500000, 1000000
    ];

    const currentMarginSeries = popSteps.map((pop) => {
      const res = calculateSampleSize(confidencePercent, marginOfErrorPercent, pop, heterogeneity);
      return {
        population: pop,
        sampleSize: res.sampleSize,
        marginOfError: marginOfErrorPercent,
        confidence: confidencePercent,
        type: 'population_curve',
      };
    });

    return currentMarginSeries;
  }, [confidencePercent, marginOfErrorPercent, heterogeneity]);

  // Ponto ativo destacado no gráfico (coordenadas exatas do usuário)
  const activeScatterPoint = useMemo(() => {
    return [
      {
        marginOfError: marginOfErrorPercent,
        population: parsedPopulation || 100000,
        sampleSize: calculationResult.sampleSize,
        confidence: confidencePercent,
        z: zScore,
        isUserPoint: true,
      },
    ];
  }, [marginOfErrorPercent, parsedPopulation, calculationResult.sampleSize, confidencePercent, zScore]);

  // Feedback de salvamento / aplicação na pesquisa
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  const handleApplyToSurvey = () => {
    if (onApplySampleToSurvey) {
      onApplySampleToSurvey(
        calculationResult.sampleSize,
        confidencePercent,
        marginOfErrorPercent,
        parsedPopulation
      );
    } else if (activeSurvey && saveSurvey) {
      saveSurvey({
        ...activeSurvey,
        metaTotalColetas: calculationResult.sampleSize,
        nivelConfiancaPercentual: confidencePercent,
        margemErroPercentual: marginOfErrorPercent,
        populacaoUniverso: parsedPopulation,
      });
    }
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Simulador Amostral */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 transition-all ${
          darkMode
            ? 'bg-[#16171d] border-slate-800'
            : 'bg-white border-slate-300 shadow-sm'
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-500 border border-emerald-500/30 shrink-0">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  Teoria Amostral de Cochran & Yamane
                </span>
                <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  Conforme Padrão TSE / WAPOR
                </span>
              </div>
              <h2
                className={`text-lg sm:text-xl font-bold mt-1 ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Simulador de Amostragem Probabilística & Dispersão
              </h2>
              <p
                className={`text-xs mt-0.5 max-w-2xl leading-relaxed ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Calcule dinamicamente o tamanho amostral necessário ($n$) a partir do nível de confiança, margem de erro e universo populacional, com visualização em gráfico de dispersão estatística.
              </p>
            </div>
          </div>

          {/* Ações: Download dos Arquivos e Aplicar à Pesquisa */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 rounded-xl bg-slate-900/90 border border-slate-800 p-1">
              <a
                href="/downloads/samplingUtils.ts"
                download="samplingUtils.ts"
                title="Baixar samplingUtils.ts"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>samplingUtils.ts</span>
              </a>
              <span className="text-slate-700">|</span>
              <a
                href="/downloads/PopulationSampleScatterSimulator.tsx"
                download="PopulationSampleScatterSimulator.tsx"
                title="Baixar PopulationSampleScatterSimulator.tsx"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>ScatterSimulator.tsx</span>
              </a>
              <span className="text-slate-700">|</span>
              <a
                href="/downloads/CollectionSimulator.tsx"
                download="CollectionSimulator.tsx"
                title="Baixar CollectionSimulator.tsx"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>CollectionSimulator.tsx</span>
              </a>
            </div>

            <button
              id="btn-adotar-amostra-simulador"
              onClick={handleApplyToSurvey}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 active:scale-95 transition-all"
            >
              {appliedSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>Meta de {calculationResult.sampleSize} Coletas Aplicada!</span>
                </>
              ) : (
                <>
                  <Target className="h-4 w-4" />
                  <span>Adotar {calculationResult.sampleSize} Coletas na Pesquisa</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Parâmetros de Entrada + Demonstração da Fórmula */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna da Esquerda: Controles Interativos (7 colunas) */}
        <div
          className={`lg:col-span-7 rounded-2xl border p-5 space-y-5 ${
            darkMode
              ? 'bg-[#16171d] border-slate-800'
              : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-3 border-slate-800/80">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-emerald-500" />
              <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Parâmetros Amostrais
              </h3>
            </div>
            <span className="text-[11px] font-mono font-semibold text-emerald-500">
              Z = {zScore.toFixed(3)}
            </span>
          </div>

          {/* 1. SELETOR DE NÍVEIS DE CONFIANÇA PADRÃO (90%, 95%, 99%) & CAMPO DE Z-SCORE */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <label className={`text-xs font-bold flex items-center gap-1.5 ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    <span>Níveis de Confiança Padrão</span>
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 font-mono">
                      (1 - α)
                    </span>
                  </label>
                </div>
                <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Selecione um nível padrão para preenchimento automático do Escore Z (<span className="font-mono">Z_α/2</span>).
                </p>
              </div>

              <button
                type="button"
                id="btn-toggle-custom-confidence"
                onClick={() => setShowCustomConfidenceControls(!showCustomConfidenceControls)}
                className={`text-[11px] font-semibold flex items-center gap-1 transition-colors self-start sm:self-auto ${
                  showCustomConfidenceControls ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span>{showCustomConfidenceControls ? 'Ocultar ajuste fino' : 'Ajuste fino / Outros %'}</span>
              </button>
            </div>

            {/* Cards dos 3 Níveis de Confiança Padrão: 90%, 95%, 99% */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {STANDARD_CONFIDENCE_LEVELS.map((std) => {
                const isSelected = Math.abs(confidencePercent - std.level) < 0.2;
                return (
                  <button
                    key={std.level}
                    type="button"
                    id={`btn-confianca-padrao-${std.level}`}
                    onClick={() => handleSelectStandardConfidence(std.level, std.zScore, std.title)}
                    className={`relative flex flex-col p-3 rounded-xl border text-left transition-all group ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-600/15 ring-2 ring-emerald-500/30 shadow-md shadow-emerald-950/40'
                        : darkMode
                        ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {std.tseRecommended && (
                      <span className="absolute -top-2 right-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-xs">
                        ★ Padrão Ouro TSE
                      </span>
                    )}

                    <div className="flex items-baseline justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-base font-black ${
                          isSelected ? 'text-emerald-400' : darkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {std.label}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                      </div>
                      <span className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800/80 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        Z = {std.zScore.toFixed(3).replace('.', ',')}
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] font-semibold leading-tight">
                      <span className={isSelected ? 'text-emerald-300' : darkMode ? 'text-slate-300' : 'text-slate-700'}>
                        {std.level === 90 && 'Sondagens Rápidas'}
                        {std.level === 95 && 'Oficial TSE & Institutos'}
                        {std.level === 99 && 'Máxima Certeza & Rigor'}
                      </span>
                    </div>

                    <p className={`mt-1 text-[10px] leading-relaxed line-clamp-2 ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {std.description}
                    </p>

                    <div className="mt-2 pt-1.5 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Significância (α)</span>
                      <span className="text-slate-300 font-semibold">{std.alpha}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* CAMPO DE ESCORE Z CORRESPONDENTE (COM AUTO-PREENCHIMENTO E EDIÇÃO) */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <label
                    htmlFor="input-z-score"
                    className={`text-xs font-bold flex items-center gap-1.5 ${
                      darkMode ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>Campo de Escore Z Correspondente (Z-score)</span>
                    <span className="text-[10px] font-mono text-emerald-400">(Z_α/2)</span>
                  </label>
                  <p className={`text-[11px] leading-tight ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Preenchido automaticamente pelo seletor de confiança. Pode ser ajustado pelo pesquisador.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-emerald-400">
                      Z =
                    </span>
                    <input
                      id="input-z-score"
                      type="text"
                      value={zScoreInput}
                      onChange={(e) => handleZScoreInputChange(e.target.value)}
                      placeholder="1.960"
                      className={`w-28 rounded-lg border py-1.5 pl-9 pr-2.5 text-right font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                        darkMode
                          ? 'bg-slate-950 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Mensagem de Feedback de Auto-Preenchimento */}
              {lastAutoFilledFeedback && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">{lastAutoFilledFeedback}</span>
                </div>
              )}
            </div>

            {/* Ajuste Fino / Outros % (Exibido sob demanda) */}
            {showCustomConfidenceControls && (
              <div className={`p-3.5 rounded-xl border space-y-2.5 animate-in fade-in duration-150 ${
                darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Porcentagem Personalizada de Confiança:
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      id="input-custom-confidence-percent"
                      type="number"
                      min="80"
                      max="99.9"
                      step="0.1"
                      value={confidencePercent}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) handleConfidencePercentChange(v);
                      }}
                      className={`w-20 rounded-lg border px-2 py-1 text-right text-xs font-mono font-bold ${
                        darkMode
                          ? 'bg-slate-900 border-slate-700 text-emerald-400'
                          : 'bg-slate-50 border-slate-300 text-emerald-700'
                      }`}
                    />
                    <span className="text-xs font-bold text-emerald-500">%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="80"
                  max="99.9"
                  step="0.1"
                  value={confidencePercent}
                  onChange={(e) => handleConfidencePercentChange(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>80.0%</span>
                  <span>90.0% (Z=1.645)</span>
                  <span>95.0% (Z=1.960)</span>
                  <span>99.0% (Z=2.576)</span>
                  <span>99.9%</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Margem de Erro Máxima Aceitável (E %) */}
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between">
              <label
                htmlFor="input-margin-error"
                className={`text-xs font-semibold flex items-center gap-1.5 ${
                  darkMode ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                <span>Margem de Erro Máxima Aceitável</span>
                <span className="text-[10px] text-amber-500 font-mono">(E)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-amber-500">±</span>
                <input
                  id="input-margin-error"
                  type="number"
                  min="0.5"
                  max="15.0"
                  step="0.1"
                  value={marginOfErrorPercent}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setMarginOfErrorPercent(Math.min(15, Math.max(0.5, val)));
                  }}
                  className={`w-20 rounded-lg border px-2.5 py-1 text-right text-xs font-bold font-mono focus:outline-none ${
                    darkMode
                      ? 'bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500'
                      : 'bg-slate-50 border-slate-300 text-amber-900 focus:border-amber-600'
                  }`}
                />
                <span className="text-xs font-bold text-amber-500">%</span>
              </div>
            </div>

            {/* Slider de Margem de Erro */}
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.1"
              value={marginOfErrorPercent}
              onChange={(e) => setMarginOfErrorPercent(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />

            {/* Presets Rápidos de Margem de Erro */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                Presets:
              </span>
              {[2.0, 2.5, 3.0, 3.5, 4.0, 5.0].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMarginOfErrorPercent(val)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    marginOfErrorPercent === val
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : darkMode
                      ? 'border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
                      : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ±{val.toFixed(1)}%
                </button>
              ))}
            </div>
          </div>

          {/* 3. Tamanho da População (N) / Universo Amostral */}
          <div className="space-y-3 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasFinitePopulation}
                  onChange={(e) => setHasFinitePopulation(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                />
                <span
                  className={`text-xs font-semibold flex items-center gap-1.5 ${
                    darkMode ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  <Users className="h-3.5 w-3.5 text-purple-400" />
                  <span>Considerar População Finita Conhecida (N)</span>
                </span>
              </label>
              <span className="text-[10px] font-semibold text-purple-400">
                {hasFinitePopulation ? 'Fator de Correção Ativo' : 'População Infinita (N > 100k)'}
              </span>
            </div>

            {hasFinitePopulation ? (
              <div className="space-y-2 pl-6 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={populationInput}
                    onChange={(e) => setPopulationInput(e.target.value)}
                    placeholder="Ex: 50.000 eleitores"
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs font-semibold focus:outline-none ${
                      darkMode
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-purple-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-purple-600'
                    }`}
                  />
                  {parsedPopulation && (
                    <span className="text-xs font-mono font-bold text-purple-400 shrink-0">
                      {parsedPopulation.toLocaleString('pt-BR')} hab.
                    </span>
                  )}
                </div>

                {/* Presets Rápidos de População */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                    Exemplos:
                  </span>
                  {[
                    { label: '5.000', val: 5000 },
                    { label: '20.000', val: 20000 },
                    { label: '50.000', val: 50000 },
                    { label: '100.000', val: 100000 },
                    { label: '500.000', val: 500000 },
                    { label: '1.000.000', val: 1000000 },
                  ].map((pop) => (
                    <button
                      key={pop.label}
                      type="button"
                      onClick={() => setPopulationInput(String(pop.val))}
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold transition-all ${
                        parsedPopulation === pop.val
                          ? 'bg-purple-600 text-white font-bold'
                          : darkMode
                          ? 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                          : 'border border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {pop.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p
                className={`text-[11px] pl-6 italic ${
                  darkMode ? 'text-slate-500' : 'text-slate-600'
                }`}
              >
                Para populações superiores a 100.000 indivíduos ou desconhecidas, a teoria estatística demonstra que a variação amostral necessária torna-se constante (população infinita).
              </p>
            )}
          </div>

          {/* Parâmetros Avançados (Variabilidade p) */}
          <div className="pt-2 border-t border-slate-800/60">
            <button
              type="button"
              onClick={() => setShowAdvancedParams(!showAdvancedParams)}
              className="text-[11px] font-semibold text-emerald-500 hover:underline flex items-center gap-1"
            >
              <span>{showAdvancedParams ? 'Ocultar' : 'Ajustar'} Proporção Populacional (p = {(heterogeneity * 100).toFixed(0)}%)</span>
            </button>

            {showAdvancedParams && (
              <div className="mt-2.5 p-3 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Proporção Esperada do Evento (p):</span>
                  <span className="font-mono font-bold text-emerald-400">{(heterogeneity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={heterogeneity}
                  onChange={(e) => setHeterogeneity(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>p = 10% (Alta homogeneidade)</span>
                  <span className="text-emerald-400 font-bold">p = 50% (Pior caso - Máx. variabilidade)</span>
                  <span>p = 90%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coluna da Direita: Memória de Cálculo & Cards de Resultado (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card Principal: Tamanho da Amostra Necessário (n) */}
          <div
            className={`rounded-2xl border p-5 relative overflow-hidden transition-all ${
              darkMode
                ? 'bg-gradient-to-br from-emerald-950/40 via-[#16171d] to-[#111218] border-emerald-500/40 shadow-xl'
                : 'bg-gradient-to-br from-emerald-50 via-white to-slate-50 border-emerald-300 shadow-md'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  Tamanho Amostral Mínimo Necessário
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-extrabold text-emerald-500 font-mono tracking-tight">
                    {calculationResult.sampleSize.toLocaleString('pt-BR')}
                  </span>
                  <span className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    entrevistas (n)
                  </span>
                </div>
              </div>

              <div className="h-10 w-10 rounded-xl bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center">
                <Target className="h-5 w-5" />
              </div>
            </div>

            {/* Detalhes de Segurança e Reserva */}
            <div className="mt-4 pt-3 border-t border-emerald-500/20 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className={`block text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Com Reserva Técnica (+15%):
                </span>
                <strong className={`font-mono text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  {calculationResult.idealRecomendadoReserva.toLocaleString('pt-BR')} coletas
                </strong>
              </div>

              <div>
                <span className={`block text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Precisão Assegurada:
                </span>
                <strong className={`font-mono text-sm ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                  {confidencePercent}% (±{marginOfErrorPercent}%)
                </strong>
              </div>
            </div>
          </div>

          {/* Demonstração Matemática da Fórmula Exata */}
          <div
            className={`rounded-2xl border p-4 space-y-2.5 text-xs ${
              darkMode
                ? 'bg-[#111218] border-slate-800 text-slate-300'
                : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Fórmula e Demonstração do Cálculo</span>
            </div>

            <div
              className={`p-2.5 rounded-xl font-mono text-[11px] border leading-relaxed ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-emerald-300'
                  : 'bg-white border-slate-300 text-emerald-900 font-semibold'
              }`}
            >
              <div className="font-bold text-center pb-1 border-b border-emerald-500/20 mb-1">
                n₀ = [Z² · p(1 - p)] / E²
              </div>
              <div className="flex justify-between text-[10px] pt-0.5">
                <span>Z = {zScore.toFixed(3)}</span>
                <span>p(1-p) = {variance.toFixed(2)}</span>
                <span>E² = {(eDec * eDec).toFixed(6)}</span>
              </div>
              <div className="mt-1 pt-1 border-t border-emerald-500/20 text-center font-bold">
                n₀ = [({zScore.toFixed(3)})² · {variance.toFixed(2)}] / ({eDec}²) = {n0Infinite}
              </div>
              {hasFinitePopulation && parsedPopulation && (
                <div className="mt-1 pt-1 border-t border-purple-500/20 text-center text-[10px] text-purple-400 font-bold">
                  Com População Finita N = {parsedPopulation.toLocaleString('pt-BR')}:<br />
                  n = {n0Infinite} ÷ [1 + ({n0Infinite - 1} / {parsedPopulation})] = <strong>{calculationResult.sampleSize}</strong>
                </div>
              )}
            </div>

            <div className={`text-[10px] leading-normal ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              • <strong>Z</strong>: Coeficiente da distribuição normal para {confidencePercent}% de confiança.<br />
              • <strong>p(1-p) = 0.25</strong>: Proporção conservadora para máxima segurança estatística.<br />
              • <strong>E = {(eDec * 100).toFixed(1)}%</strong>: Tolerância máxima de desvio em pontos percentuais.
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Dispersão Estatística (Scatter Plot) */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 transition-all ${
          darkMode
            ? 'bg-[#16171d] border-slate-800'
            : 'bg-white border-slate-300 shadow-sm'
        }`}
      >
        {/* Cabeçalho do Gráfico com Alternador de Visões */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4 border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <h3 className={`text-sm sm:text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Gráfico de Dispersão Amostral
              </h3>
            </div>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Distribuição de pontos amostrais com destaque para o parâmetro selecionado na pesquisa.
            </p>
          </div>

          {/* Seletor de Visão do Gráfico de Dispersão */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/60 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setChartViewMode('error_vs_sample')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                chartViewMode === 'error_vs_sample'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Margem de Erro vs. Amostra
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('pop_vs_sample')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                chartViewMode === 'pop_vs_sample'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              População vs. Amostra
            </button>
          </div>
        </div>

        {/* Área do Gráfico Recharts */}
        <div className="mt-6 h-80 sm:h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartViewMode === 'error_vs_sample' ? (
              <ScatterChart
                margin={{ top: 20, right: 30, bottom: 25, left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={darkMode ? '#334155' : '#cbd5e1'}
                  opacity={0.6}
                />
                <XAxis
                  type="number"
                  dataKey="marginOfError"
                  name="Margem de Erro"
                  unit="%"
                  domain={[0.8, 7.2]}
                  stroke={darkMode ? '#94a3b8' : '#475569'}
                  fontSize={11}
                  tickFormatter={(val) => `±${val}%`}
                  label={{
                    value: 'Margem de Erro Aceitável (± %)',
                    position: 'insideBottom',
                    offset: -15,
                    fill: darkMode ? '#cbd5e1' : '#1e293b',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="sampleSize"
                  name="Tamanho da Amostra"
                  stroke={darkMode ? '#94a3b8' : '#475569'}
                  fontSize={11}
                  domain={[0, 'dataMax + 400']}
                  tickFormatter={(val) => val.toLocaleString('pt-BR')}
                  label={{
                    value: 'Tamanho da Amostra (n)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: darkMode ? '#cbd5e1' : '#1e293b',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <ZAxis type="number" range={[40, 250]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#10b981' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isUser = Boolean(data.isUserPoint);
                      return (
                        <div
                          className={`rounded-xl border p-3 shadow-2xl text-xs font-sans space-y-1.5 ${
                            darkMode
                              ? 'bg-[#111218] border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 border-b border-slate-800 pb-1 font-bold">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                isUser ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
                              }`}
                            />
                            <span>
                              {isUser ? 'Seu Ponto Amostral Ativo' : `Confiança ${data.confidence}%`}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <span className="text-slate-400">Margem de Erro:</span>
                            <span className="font-mono font-bold text-amber-500">±{data.marginOfError}%</span>
                            <span className="text-slate-400">Amostra (n):</span>
                            <span className="font-mono font-bold text-emerald-500">
                              {data.sampleSize?.toLocaleString('pt-BR')} coletas
                            </span>
                            <span className="text-slate-400">Nível Confiança:</span>
                            <span className="font-mono font-semibold">{data.confidence}%</span>
                            <span className="text-slate-400">Z-Score:</span>
                            <span className="font-mono">{data.z?.toFixed(3)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: darkMode ? '#cbd5e1' : '#1e293b',
                  }}
                />

                {/* Linha de referência no erro do usuário */}
                <ReferenceLine
                  x={marginOfErrorPercent}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <ReferenceLine
                  y={calculationResult.sampleSize}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />

                {/* Série Comparativa (ex: 99% ou 95%) */}
                <Scatter
                  name={`Curva Amostral ${scatterDataByError.compConfidence}%`}
                  data={scatterDataByError.compSeries}
                  fill="#94a3b8"
                  opacity={0.5}
                  line={{ stroke: '#64748b', strokeWidth: 1.5 }}
                />

                {/* Série Principal: Nível de Confiança Escolhido */}
                <Scatter
                  name={`Nível Escolhido: ${confidencePercent}%`}
                  data={scatterDataByError.currentConfSeries}
                  fill="#10b981"
                  line={{ stroke: '#059669', strokeWidth: 2 }}
                />

                {/* Ponto Ativo do Usuário com Destaque Máximo */}
                <Scatter
                  name="★ Ponto Amostral Ativo"
                  data={activeScatterPoint}
                  fill="#f59e0b"
                  shape="star"
                >
                  <Cell fill="#f59e0b" stroke="#ffffff" strokeWidth={2} />
                </Scatter>
              </ScatterChart>
            ) : (
              /* Visão População vs Amostra */
              <ScatterChart
                margin={{ top: 20, right: 30, bottom: 25, left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={darkMode ? '#334155' : '#cbd5e1'}
                  opacity={0.6}
                />
                <XAxis
                  type="number"
                  dataKey="population"
                  name="População (N)"
                  domain={[0, 1050000]}
                  stroke={darkMode ? '#94a3b8' : '#475569'}
                  fontSize={11}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  label={{
                    value: 'Tamanho da População (N habitantes/eleitores)',
                    position: 'insideBottom',
                    offset: -15,
                    fill: darkMode ? '#cbd5e1' : '#1e293b',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="sampleSize"
                  name="Tamanho da Amostra"
                  stroke={darkMode ? '#94a3b8' : '#475569'}
                  fontSize={11}
                  domain={[0, 'dataMax + 200']}
                  tickFormatter={(val) => val.toLocaleString('pt-BR')}
                  label={{
                    value: 'Tamanho da Amostra (n)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: darkMode ? '#cbd5e1' : '#1e293b',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <ZAxis type="number" range={[40, 250]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#8b5cf6' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isUser = Boolean(data.isUserPoint);
                      return (
                        <div
                          className={`rounded-xl border p-3 shadow-2xl text-xs font-sans space-y-1.5 ${
                            darkMode
                              ? 'bg-[#111218] border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 border-b border-slate-800 pb-1 font-bold">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                isUser ? 'bg-amber-400 animate-pulse' : 'bg-purple-500'
                              }`}
                            />
                            <span>{isUser ? 'Seu Ponto de Amostra' : 'Cenário Populacional'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <span className="text-slate-400">População (N):</span>
                            <span className="font-mono font-bold text-purple-400">
                              {data.population?.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-slate-400">Amostra (n):</span>
                            <span className="font-mono font-bold text-emerald-500">
                              {data.sampleSize?.toLocaleString('pt-BR')} coletas
                            </span>
                            <span className="text-slate-400">Margem Erro:</span>
                            <span className="font-mono">±{data.marginOfError}%</span>
                            <span className="text-slate-400">Confiança:</span>
                            <span className="font-mono">{data.confidence}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: darkMode ? '#cbd5e1' : '#1e293b',
                  }}
                />

                {/* Curva de Dispersão Populacional */}
                <Scatter
                  name={`Dispersão População vs. n (Erro ±${marginOfErrorPercent}%)`}
                  data={scatterDataByPopulation}
                  fill="#8b5cf6"
                  line={{ stroke: '#7c3aed', strokeWidth: 2 }}
                />

                {/* Ponto Ativo do Usuário */}
                <Scatter
                  name="★ Sua População & Amostra"
                  data={activeScatterPoint}
                  fill="#f59e0b"
                  shape="star"
                >
                  <Cell fill="#f59e0b" stroke="#ffffff" strokeWidth={2} />
                </Scatter>
              </ScatterChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legenda Explicativa do Gráfico de Dispersão */}
        <div
          className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
            darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span>Pontos Amostrais Calculados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <strong className={darkMode ? 'text-amber-300' : 'text-amber-800'}>
                ★ Seu Ponto: {confidencePercent}% conf., ±{marginOfErrorPercent}% erro → {calculationResult.sampleSize} coletas
              </strong>
            </div>
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            Amostragem Aleatória Simples (AAS)
          </span>
        </div>
      </div>
    </div>
  );
};
