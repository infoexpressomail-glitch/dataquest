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
    <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl transition-all">
      {/* Cabeçalho do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ui/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary-soft border border-accent-primary-soft-border text-accent-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-primary">
                Dimensionamento de Equipe em Campo
              </h3>
              <span className="rounded-full bg-accent-primary-soft border border-accent-primary-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-primary">
                Amostragem & Coletas
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Cálculo da quantidade mínima de pesquisadores e margem de confiança ideal da amostragem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isCalculatorOpen
                ? 'bg-accent-primary-solid border-emerald-500 text-on-accent'
                : 'border-ui bg-surface-raised text-primary hover:bg-surface-hover hover:text-primary'
            }`}
          >
            <Calculator className="h-3.5 w-3.5 text-accent-primary" />
            <span>{isCalculatorOpen ? 'Fechar Calculadora' : 'Margem de Confiança'}</span>
          </button>

          <button
            onClick={() => setIsEditingParams(!isEditingParams)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-hover hover:text-primary transition-colors"
          >
            <Sliders className="h-3.5 w-3.5 text-accent-primary" />
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
              ? 'border-accent-success-soft-border bg-accent-success-soft'
              : 'border-accent-warning-soft-border bg-accent-warning-soft'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted">
              Pesquisadores Mínimos
            </span>
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                sizing.isSuficiente ? 'bg-accent-success-soft text-accent-success' : 'bg-accent-warning-soft text-accent-warning'
              }`}
            >
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-primary">
              {sizing.minPesquisadores}
            </span>
            <span className="text-xs text-muted font-medium">
              (rec: <strong className="text-accent-primary">{sizing.pesquisadoresRecomendados}</strong> com reserva)
            </span>
          </div>
          <div className="mt-2 text-[11px] flex items-center gap-1 font-semibold">
            {sizing.isSuficiente ? (
              <span className="text-accent-success inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Equipe atual ({sizing.pesquisadoresAlocados}) cobre o plano
              </span>
            ) : (
              <span className="text-accent-warning inline-flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Déficit de {sizing.deficit} pesquisador(es)
              </span>
            )}
          </div>
        </div>

        {/* 2. Meta Total de Coletas */}
        <div className="rounded-xl border border-ui bg-surface-raised p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted">
              Meta Total de Coletas (N)
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-primary-soft text-accent-primary">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-primary">
              {sizing.totalMetaColetas}
            </span>
            <span className="text-xs text-muted">entrevistas</span>
          </div>
          <div className="mt-2 text-[11px] text-accent-primary font-medium">
            Progresso: {sizing.coletasRealizadas} ({sizing.percentualConcluido}%) realizadas
          </div>
        </div>

        {/* 3. Equivalência de Sexo = 100% da Meta */}
        <div className="rounded-xl border border-ui bg-surface-raised p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted">
              Equivalência por Sexo
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-purple-soft text-accent-purple">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between text-xs">
            <span className="text-secondary">
              Masc: <strong className="text-primary">{sizing.metaSexoMasculino}</strong>
            </span>
            <span className="text-secondary">
              Fem: <strong className="text-primary">{sizing.metaSexoFeminino}</strong>
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-raised flex">
            <div
              className="bg-accent-primary-solid h-full"
              style={{
                width: `${(sizing.metaSexoMasculino / (sizing.somaMetasSexo || 1)) * 100}%`,
              }}
              title={`Masculino: ${sizing.metaSexoMasculino}`}
            />
            <div
              className="bg-accent-danger-solid h-full"
              style={{
                width: `${(sizing.metaSexoFeminino / (sizing.somaMetasSexo || 1)) * 100}%`,
              }}
              title={`Feminino: ${sizing.metaSexoFeminino}`}
            />
          </div>
          <div className="mt-2 text-[10px] text-muted">
            Soma: <strong>{sizing.somaMetasSexo}</strong> = 100% da Meta Total
          </div>
        </div>

        {/* 4. Ritmo Operacional & Prazos */}
        <div className="rounded-xl border border-ui bg-surface-raised p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted">
              Ritmo de Campo
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-success-soft text-accent-success">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-primary">
              {sizing.diasCampo} dias
            </span>
            <span className="text-xs text-muted">de campo</span>
          </div>
          <div className="mt-2 text-[11px] text-secondary">
            Meta individual: <strong className="text-primary">{sizing.mediaDiaPesquisador}</strong> coletas/pesquisador/dia
          </div>
        </div>
      </div>

      {/* Painel de Parâmetros Ajustáveis (Quando Aberto) */}
      {isEditingParams && (
        <div className="mt-4 rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="h-4 w-4 text-accent-primary" />
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
              Simulação de Dimensionamento Operacional
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Meta Total */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-secondary">
                  Meta Total de Coletas (N)
                </label>
                <span className="text-[10px] font-bold text-accent-primary">±{currentEstimatedMargin}% erro</span>
              </div>
              <input
                type="number"
                min="10"
                step="10"
                value={metaTotal}
                onChange={(e) => handleMetaTotalChange(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs text-primary"
              />
              <div className="flex items-center justify-between text-[10px] text-muted mt-1">
                <span>Masc + Fem</span>
                <span className="text-accent-primary font-medium">Confiança: {nivelConfianca}%</span>
              </div>
            </div>

            {/* Dias de Campo */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Prazo de Campo (Dias)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={diasCampo}
                onChange={(e) => setDiasCampo(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs text-primary"
              />
              <span className="text-[10px] text-muted">Período para finalizar a coleta</span>
            </div>

            {/* Média Diária por Pesquisador */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Coletas / Pesquisador / Dia
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={mediaDia}
                onChange={(e) => setMediaDia(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs text-primary"
              />
              <span className="text-[10px] text-muted">Capacidade média operacional</span>
            </div>

            {/* Divisão de Metas de Sexo */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
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
                  className="w-1/2 rounded-lg border border-ui bg-surface-raised px-2.5 py-1.5 text-xs text-primary"
                />
                <input
                  type="number"
                  min="0"
                  value={metaFem}
                  onChange={(e) => handleMetaFemChange(parseInt(e.target.value) || 0)}
                  placeholder="Fem"
                  title="Meta Feminino"
                  className="w-1/2 rounded-lg border border-ui bg-surface-raised px-2.5 py-1.5 text-xs text-primary"
                />
              </div>
              <span className="text-[10px] text-muted">Masc: {metaMasc} | Fem: {metaFem}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-ui/80 pt-3">
            <div className="text-xs text-secondary">
              Fórmula aplicada: <code>P_min = ⌈ Meta_Total / (Dias × Coletas/Dia) ⌉</code> ={' '}
              <strong className="text-accent-primary font-mono">
                ⌈ {metaTotal} / ({diasCampo} × {mediaDia}) ⌉ = {sizing.minPesquisadores} pesquisadores
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingParams(false)}
                className="rounded-lg border border-ui px-3 py-1 text-xs text-secondary hover:bg-surface-raised"
              >
                Cancelar
              </button>
              {onUpdateSurveyParams && (
                <button
                  onClick={handleSaveParams}
                  className="rounded-lg bg-accent-primary-solid px-3 py-1 text-xs font-bold text-on-accent hover:bg-accent-primary-solid-hover shadow-md transition-colors"
                >
                  Salvar na Pesquisa
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resumo da Regra Amostral (Sexo = 100%, Idade/Escolaridade/Bairros = Plano Amostral) */}
      <div className="mt-4 rounded-xl border border-ui/90 bg-surface-raised p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-accent-primary shrink-0" />
          <span className="text-secondary leading-relaxed">
            <strong className="text-primary">Diretriz Amostral:</strong> As metas de sexo totalizam{' '}
            <strong className="text-accent-primary">{sizing.somaMetasSexo}</strong> coletas (equivalente a 100% da meta da pesquisa). As metas de faixa etária, escolaridade e bairros são distribuídas conforme as cotas amostrais do plano.
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-muted">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted" />
            <span>Capacidade individual: <strong>{sizing.capacidadeIndividualPeriodo}</strong> coletas/prazo</span>
          </div>
        </div>
      </div>
    </div>
  );
};
