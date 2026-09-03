import React, { useState } from 'react';
import {
  Users,
  Target,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Clock,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Percent,
  Calculator,
} from 'lucide-react';
import { Survey, InterviewSubmission } from '../../types';
import { calculateTeamSizing } from '../../utils/crosstabUtils';
import { ConfidenceSampleCalculator } from '../common/ConfidenceSampleCalculator';
import { calculateMarginOfErrorFromSample } from '../../utils/samplingUtils';

interface FieldTeamSizingCardProps {
  survey: Survey;
  submissions?: InterviewSubmission[];
  onUpdateSurveyParams?: (params: {
    metaTotalColetas: number;
    metaSexoMasculino: number;
    metaSexoFeminino: number;
    diasPrevistosCampo: number;
    mediaColetasDiaPesquisador: number;
    nivelConfiancaPercentual?: number;
    margemErroPercentual?: number;
    populacaoUniverso?: number;
  }) => void;
}

export const FieldTeamSizingCard: React.FC<FieldTeamSizingCardProps> = ({
  survey,
  submissions = [],
  onUpdateSurveyParams,
}) => {
  const [isEditingParams, setIsEditingParams] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Estados locais para simulação/ajuste de parâmetros operacionais
  const [diasCampo, setDiasCampo] = useState<number>(survey.diasPrevistosCampo || 3);
  const [mediaDia, setMediaDia] = useState<number>(survey.mediaColetasDiaPesquisador || 15);
  const [nivelConfianca, setNivelConfianca] = useState<number>(survey.nivelConfiancaPercentual || 95);
  const [margemErro, setMargemErro] = useState<number>(survey.margemErroPercentual || 3.5);
  const [populacaoUniverso, setPopulacaoUniverso] = useState<number | undefined>(survey.populacaoUniverso);

  const [metaTotal, setMetaTotal] = useState<number>(() => {
    if (survey.metaTotalColetas) return survey.metaTotalColetas;
    const sumM = (survey.metaSexoMasculino || 0) + (survey.metaSexoFeminino || 0);
    return sumM > 0 ? sumM : 400;
  });
  const [metaMasc, setMetaMasc] = useState<number>(() => {
    return survey.metaSexoMasculino || Math.floor(metaTotal / 2);
  });
  const [metaFem, setMetaFem] = useState<number>(() => {
    return survey.metaSexoFeminino || metaTotal - Math.floor(metaTotal / 2);
  });

  // Atualização sincronizada: ajustar sexo atualiza total, ou vice-versa
  const handleMetaTotalChange = (val: number) => {
    const num = Math.max(10, val);
    setMetaTotal(num);
    const masc = Math.floor(num / 2);
    setMetaMasc(masc);
    setMetaFem(num - masc);
  };

  const handleMetaMascChange = (val: number) => {
    const masc = Math.max(0, val);
    setMetaMasc(masc);
    setMetaTotal(masc + metaFem);
  };

  const handleMetaFemChange = (val: number) => {
    const fem = Math.max(0, val);
    setMetaFem(fem);
    setMetaTotal(metaMasc + fem);
  };

  const sizing = calculateTeamSizing(survey, submissions, {
    diasCampo,
    mediaDiaPesquisador: mediaDia,
    metaTotal,
    metaMasc,
    metaFem,
  });

  const handleSaveParams = () => {
    if (onUpdateSurveyParams) {
      onUpdateSurveyParams({
        metaTotalColetas: metaTotal,
        metaSexoMasculino: metaMasc,
        metaSexoFeminino: metaFem,
        diasPrevistosCampo: diasCampo,
        mediaColetasDiaPesquisador: mediaDia,
        nivelConfiancaPercentual: nivelConfianca,
        margemErroPercentual: margemErro,
        populacaoUniverso: populacaoUniverso,
      });
    }
    setIsEditingParams(false);
  };

  const currentEstimatedMargin = calculateMarginOfErrorFromSample(metaTotal, nivelConfianca, populacaoUniverso);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-5 shadow-xl transition-all">
      {/* Cabeçalho do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Dimensionamento de Equipe em Campo
              </h3>
              <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                Amostragem & Coletas
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cálculo da quantidade mínima de pesquisadores e margem de confiança ideal da amostragem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isCalculatorOpen
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Calculator className="h-3.5 w-3.5 text-blue-400" />
            <span>{isCalculatorOpen ? 'Fechar Calculadora' : 'Margem de Confiança'}</span>
          </button>

          <button
            onClick={() => setIsEditingParams(!isEditingParams)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Sliders className="h-3.5 w-3.5 text-blue-400" />
            <span>{isEditingParams ? 'Ocultar Parâmetros' : 'Ajustar Parâmetros'}</span>
            {isEditingParams ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Calculador de Margem de Confiança e Amostra Mínima (Quando Expandido) */}
      {isCalculatorOpen && (
        <div className="mt-4">
          <ConfidenceSampleCalculator
            currentGoal={metaTotal}
            initialConfidence={nivelConfianca}
            initialMarginOfError={margemErro}
            initialPopulation={populacaoUniverso}
            onApplyGoal={(minSample, conf, margin, pop) => {
              handleMetaTotalChange(minSample);
              setNivelConfianca(conf);
              setMargemErro(margin);
              setPopulacaoUniverso(pop);
              setIsCalculatorOpen(false);
            }}
          />
        </div>
      )}

      {/* Grid de Principais Métricas de Campo */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Quantidade Mínima de Pesquisadores */}
        <div
          className={`rounded-xl border p-4 transition-all ${
            sizing.isSuficiente
              ? 'border-emerald-500/30 bg-emerald-950/10'
              : 'border-amber-500/30 bg-amber-950/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              Pesquisadores Mínimos
            </span>
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                sizing.isSuficiente ? 'bg-emerald-600/20 text-emerald-400' : 'bg-amber-600/20 text-amber-400'
              }`}
            >
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {sizing.minPesquisadores}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              (rec: <strong className="text-blue-400">{sizing.pesquisadoresRecomendados}</strong> com reserva)
            </span>
          </div>
          <div className="mt-2 text-[11px] flex items-center gap-1 font-semibold">
            {sizing.isSuficiente ? (
              <span className="text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Equipe atual ({sizing.pesquisadoresAlocados}) cobre o plano
              </span>
            ) : (
              <span className="text-amber-400 inline-flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Déficit de {sizing.deficit} pesquisador(es)
              </span>
            )}
          </div>
        </div>

        {/* 2. Meta Total de Coletas */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              Meta Total de Coletas (N)
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {sizing.totalMetaColetas}
            </span>
            <span className="text-xs text-slate-400">entrevistas</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-400 font-medium">
            Progresso: {sizing.coletasRealizadas} ({sizing.percentualConcluido}%) realizadas
          </div>
        </div>

        {/* 3. Equivalência de Sexo = 100% da Meta */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              Equivalência por Sexo
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between text-xs">
            <span className="text-slate-300">
              Masc: <strong className="text-white">{sizing.metaSexoMasculino}</strong>
            </span>
            <span className="text-slate-300">
              Fem: <strong className="text-white">{sizing.metaSexoFeminino}</strong>
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800 flex">
            <div
              className="bg-blue-600 h-full"
              style={{
                width: `${(sizing.metaSexoMasculino / (sizing.somaMetasSexo || 1)) * 100}%`,
              }}
              title={`Masculino: ${sizing.metaSexoMasculino}`}
            />
            <div
              className="bg-rose-500 h-full"
              style={{
                width: `${(sizing.metaSexoFeminino / (sizing.somaMetasSexo || 1)) * 100}%`,
              }}
              title={`Feminino: ${sizing.metaSexoFeminino}`}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            Soma: <strong>{sizing.somaMetasSexo}</strong> = 100% da Meta Total
          </div>
        </div>

        {/* 4. Ritmo Operacional & Prazos */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              Ritmo de Campo
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-white">
              {sizing.diasCampo} dias
            </span>
            <span className="text-xs text-slate-400">de campo</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-300">
            Meta individual: <strong className="text-white">{sizing.mediaDiaPesquisador}</strong> coletas/pesquisador/dia
          </div>
        </div>
      </div>

      {/* Painel de Parâmetros Ajustáveis (Quando Aberto) */}
      {isEditingParams && (
        <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="h-4 w-4 text-blue-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Simulação de Dimensionamento Operacional
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Meta Total */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Meta Total de Coletas (N)
                </label>
                <span className="text-[10px] font-bold text-blue-400">±{currentEstimatedMargin}% erro</span>
              </div>
              <input
                type="number"
                min="10"
                step="10"
                value={metaTotal}
                onChange={(e) => handleMetaTotalChange(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>Masc + Fem</span>
                <span className="text-blue-400 font-medium">Confiança: {nivelConfianca}%</span>
              </div>
            </div>

            {/* Dias de Campo */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Prazo de Campo (Dias)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={diasCampo}
                onChange={(e) => setDiasCampo(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
              />
              <span className="text-[10px] text-slate-400">Período para finalizar a coleta</span>
            </div>

            {/* Média Diária por Pesquisador */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Coletas / Pesquisador / Dia
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={mediaDia}
                onChange={(e) => setMediaDia(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
              />
              <span className="text-[10px] text-slate-400">Capacidade média operacional</span>
            </div>

            {/* Divisão de Metas de Sexo */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Divisão por Sexo (M / F)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={metaMasc}
                  onChange={(e) => handleMetaMascChange(parseInt(e.target.value) || 0)}
                  placeholder="Masc"
                  title="Meta Masculino"
                  className="w-1/2 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="number"
                  min="0"
                  value={metaFem}
                  onChange={(e) => handleMetaFemChange(parseInt(e.target.value) || 0)}
                  placeholder="Fem"
                  title="Meta Feminino"
                  className="w-1/2 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <span className="text-[10px] text-slate-400">Masc: {metaMasc} | Fem: {metaFem}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-3">
            <div className="text-xs text-slate-300">
              Fórmula aplicada: <code>P_min = ⌈ Meta_Total / (Dias × Coletas/Dia) ⌉</code> ={' '}
              <strong className="text-blue-400 font-mono">
                ⌈ {metaTotal} / ({diasCampo} × {mediaDia}) ⌉ = {sizing.minPesquisadores} pesquisadores
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingParams(false)}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </button>
              {onUpdateSurveyParams && (
                <button
                  onClick={handleSaveParams}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-colors"
                >
                  Salvar na Pesquisa
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resumo da Regra Amostral (Sexo = 100%, Idade/Escolaridade/Bairros = Plano Amostral) */}
      <div className="mt-4 rounded-xl border border-slate-800/90 bg-slate-900/30 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
          <span className="text-slate-300 leading-relaxed">
            <strong className="text-white">Diretriz Amostral:</strong> As metas de sexo totalizam{' '}
            <strong className="text-blue-400">{sizing.somaMetasSexo}</strong> coletas (equivalente a 100% da meta da pesquisa). As metas de faixa etária, escolaridade e bairros são distribuídas conforme as cotas amostrais do plano.
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>Capacidade individual: <strong>{sizing.capacidadeIndividualPeriodo}</strong> coletas/prazo</span>
          </div>
        </div>
      </div>
    </div>
  );
};
