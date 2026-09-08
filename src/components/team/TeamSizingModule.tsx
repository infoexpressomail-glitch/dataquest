import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Survey, Collaborator } from '../../types';
import { calculateTeamSizing, TeamSizingResult } from '../../utils/crosstabUtils';
import {
  exportTeamSizingToPDF,
  exportTeamSizingToXLSX,
  generateSensitivityMatrix,
} from '../../utils/teamSizingExport';
import {
  Users,
  Calculator,
  UserCheck,
  UserPlus,
  UserMinus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Save,
  Clock,
  Briefcase,
  Target,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  BarChart3,
  Sliders,
  Percent,
} from 'lucide-react';
import { ConfidenceSampleCalculator } from '../common/ConfidenceSampleCalculator';
import { calculateMarginOfErrorFromSample } from '../../utils/samplingUtils';

export const TeamSizingModule: React.FC = () => {
  const {
    surveys,
    saveSurvey,
    collaborators,
    submissions,
    addAuditLog,
    currentUser,
    currentProfile,
    hasPermission,
  } = useApp();

  // Consulta é aberta a todos os perfis; gravar os parâmetros na pesquisa é uma
  // alteração de planejamento e segue a mesma permissão do módulo de Metas.
  const canSaveSizing = hasPermission('meta_criar_alterar_excluir');

  // Seleção de Pesquisa
  const activeSurveys = useMemo(() => surveys.filter((s) => s.status !== 'excluida'), [surveys]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(() => {
    return activeSurveys[0]?.id || '';
  });

  const currentSurvey = useMemo(() => {
    return activeSurveys.find((s) => s.id === selectedSurveyId) || activeSurveys[0];
  }, [activeSurveys, selectedSurveyId]);

  // Parâmetros Operacionais Editáveis (Estado do Formulário)
  const [metaTotalInput, setMetaTotalInput] = useState<number>(400);
  const [diasCampoInput, setDiasCampoInput] = useState<number>(3);
  const [produtividadeInput, setProdutividadeInput] = useState<number>(15);
  const [tempoMinutosEntrevista, setTempoMinutosEntrevista] = useState<number>(12);
  const [jornadaHorasDia, setJornadaHorasDia] = useState<number>(8);
  const [reservaTecnicaPercent, setReservaTecnicaPercent] = useState<number>(15);

  // Margem de Confiança e Amostragem Estatística
  const [nivelConfiancaInput, setNivelConfiancaInput] = useState<number>(95);
  const [margemErroInput, setMargemErroInput] = useState<number>(3.5);
  const [populacaoUniversoInput, setPopulacaoUniversoInput] = useState<number | undefined>(undefined);

  // Proporção de Sexo (Masculino + Feminino = 100% da Meta)
  const [masculinoPercent, setMasculinoPercent] = useState<number>(50);

  // Lista local de IDs de pesquisadores alocados (para permitir simulação e salvar)
  const [allocatedIds, setAllocatedIds] = useState<string[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sincroniza parâmetros quando a pesquisa selecionada muda
  useEffect(() => {
    if (currentSurvey) {
      const initialMeta = currentSurvey.metaTotalColetas || 400;
      setMetaTotalInput(initialMeta);
      setDiasCampoInput(currentSurvey.diasPrevistosCampo || 3);
      setProdutividadeInput(currentSurvey.mediaColetasDiaPesquisador || 15);
      setReservaTecnicaPercent(
        currentSurvey.reservaTecnicaPercentual
          ? Math.round(currentSurvey.reservaTecnicaPercentual)
          : 15
      );
      setNivelConfiancaInput(currentSurvey.nivelConfiancaPercentual || 95);
      setMargemErroInput(currentSurvey.margemErroPercentual || 3.5);
      setPopulacaoUniversoInput(currentSurvey.populacaoUniverso);

      if (currentSurvey.metaSexoMasculino && currentSurvey.metaTotalColetas) {
        const pctMasc = Math.round((currentSurvey.metaSexoMasculino / currentSurvey.metaTotalColetas) * 100);
        setMasculinoPercent(pctMasc > 0 && pctMasc < 100 ? pctMasc : 50);
      } else {
        setMasculinoPercent(50);
      }

      setAllocatedIds(currentSurvey.pesquisadoresIds || []);
      setSaveSuccessMsg(null);
    }
  }, [currentSurvey]);

  // Cálculo da Margem de Erro Estimada para a Meta atual (com o nível de confiança selecionado)
  const currentEstimatedMarginOfError = useMemo(() => {
    return calculateMarginOfErrorFromSample(metaTotalInput, nivelConfiancaInput, populacaoUniversoInput);
  }, [metaTotalInput, nivelConfiancaInput, populacaoUniversoInput]);

  // Cálculo das Metas de Sexo com equivalência de 100% de N
  const metaSexoMasc = useMemo(() => {
    return Math.round((metaTotalInput * masculinoPercent) / 100);
  }, [metaTotalInput, masculinoPercent]);

  const metaSexoFem = useMemo(() => {
    return Math.max(0, metaTotalInput - metaSexoMasc);
  }, [metaTotalInput, metaSexoMasc]);

  // Cria objeto temporário da pesquisa com parâmetros atuais
  const virtualSurvey: Survey = useMemo(() => {
    if (!currentSurvey) {
      return {
        id: 'virtual_sim',
        codigo: 'SIM-001',
        nome: 'Simulação Operacional de Campo',
        descricao: 'Cenário avulso de dimensionamento',
        status: 'ativa',
        habilitarColetaWeb: true,
        tipoColetaWeb: 'interno',
        perguntas: [],
        regras: [],
        metas: [],
        pesquisadoresIds: allocatedIds,
        cicloAtual: 1,
        versao: 1,
        criadaEm: new Date().toISOString(),
        atualizadaEm: new Date().toISOString(),
        metaTotalColetas: metaTotalInput,
        diasPrevistosCampo: diasCampoInput,
        mediaColetasDiaPesquisador: produtividadeInput,
        reservaTecnicaPercentual: reservaTecnicaPercent,
        metaSexoMasculino: metaSexoMasc,
        metaSexoFeminino: metaSexoFem,
      };
    }

    return {
      ...currentSurvey,
      metaTotalColetas: metaTotalInput,
      diasPrevistosCampo: diasCampoInput,
      mediaColetasDiaPesquisador: produtividadeInput,
      reservaTecnicaPercentual: reservaTecnicaPercent,
      metaSexoMasculino: metaSexoMasc,
      metaSexoFeminino: metaSexoFem,
      pesquisadoresIds: allocatedIds,
    };
  }, [
    currentSurvey,
    metaTotalInput,
    diasCampoInput,
    produtividadeInput,
    reservaTecnicaPercent,
    metaSexoMasc,
    metaSexoFem,
    allocatedIds,
  ]);

  // Cálculo Técnico do Dimensionamento
  const sizing: TeamSizingResult = useMemo(() => {
    return calculateTeamSizing(virtualSurvey, submissions, {
      metaTotal: metaTotalInput,
      diasCampo: diasCampoInput,
      mediaDiaPesquisador: produtividadeInput,
      metaMasc: metaSexoMasc,
      metaFem: metaSexoFem,
    });
  }, [virtualSurvey, submissions, metaTotalInput, diasCampoInput, produtividadeInput, metaSexoMasc, metaSexoFem]);

  // Filtra colaboradores com perfil de pesquisador ou disponíveis
  const availableResearchers = useMemo(() => {
    return collaborators.filter((c) => c.ativo);
  }, [collaborators]);

  const allocatedCollaborators = useMemo(() => {
    return availableResearchers.filter((c) => allocatedIds.includes(c.id));
  }, [availableResearchers, allocatedIds]);

  // Manipulação de Alocação de Pesquisadores
  const toggleAllocateResearcher = (colabId: string) => {
    setAllocatedIds((prev) => {
      if (prev.includes(colabId)) {
        return prev.filter((id) => id !== colabId);
      } else {
        return [...prev, colabId];
      }
    });
    setSaveSuccessMsg(null);
  };

  const allocateAllAvailable = () => {
    setAllocatedIds(availableResearchers.map((c) => c.id));
    setSaveSuccessMsg(null);
  };

  const clearAllocation = () => {
    setAllocatedIds([]);
    setSaveSuccessMsg(null);
  };

  // Salvar Parâmetros na Pesquisa Oficial
  const handleSaveToSurvey = () => {
    if (!currentSurvey || !canSaveSizing) return;

    const updated: Survey = {
      ...currentSurvey,
      metaTotalColetas: metaTotalInput,
      nivelConfiancaPercentual: nivelConfiancaInput,
      margemErroPercentual: margemErroInput,
      populacaoUniverso: populacaoUniversoInput,
      diasPrevistosCampo: diasCampoInput,
      mediaColetasDiaPesquisador: produtividadeInput,
      reservaTecnicaPercentual: reservaTecnicaPercent,
      metaSexoMasculino: metaSexoMasc,
      metaSexoFeminino: metaSexoFem,
      pesquisadoresIds: allocatedIds,
      atualizadaEm: new Date().toISOString(),
    };

    saveSurvey(updated);

    addAuditLog({
      categoria: 'PESQUISA',
      tipoAcao: 'EDICAO_PESQUISA',
      tituloAcao: `Dimensionamento de Equipe Atualizado: ${updated.nome}`,
      descricaoDetalhada: `Parâmetros operacionais atualizados: Meta N=${metaTotalInput}, Prazo=${diasCampoInput} dias, Produtividade=${produtividadeInput} entr./dia, Equipe=${allocatedIds.length} pesquisadores (Mínimo calculado: ${sizing.minPesquisadores}).`,
      autor: {
        id: currentUser.id,
        nome: currentUser.nome,
        login: currentUser.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'pesquisa',
        id: updated.id,
        identificador: updated.codigo,
        nome: updated.nome,
      },
      motivoConformidade: 'Dimensionamento estatístico e operacional de equipe para cobertura do campo amostral.',
      statusConformidade: 'conforme',
    });

    setSaveSuccessMsg('Parâmetros de dimensionamento e equipe salvos com sucesso na pesquisa!');
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  // Matriz de Sensibilidade
  const { diasList, prodList, matrix } = useMemo(() => {
    return generateSensitivityMatrix(metaTotalInput, reservaTecnicaPercent / 100);
  }, [metaTotalInput, reservaTecnicaPercent]);

  // Contagem de entrevistas já realizadas por pesquisador
  const countByPesq = useMemo(() => {
    const map: Record<string, number> = {};
    submissions.forEach((s) => {
      if (s.pesquisaId === currentSurvey?.id || s.codigoPesquisa === currentSurvey?.codigo) {
        if (s.pesquisadorId) {
          map[s.pesquisadorId] = (map[s.pesquisadorId] || 0) + 1;
        }
      }
    });
    return map;
  }, [submissions, currentSurvey]);

  // Estimativas de Horas de Campo
  const tempoTotalHorasCampoPorPesquisador = useMemo(() => {
    // Minutos de entrevista pura por dia
    const minEntrevistasDia = produtividadeInput * tempoMinutosEntrevista;
    const horasEntrevistasDia = minEntrevistasDia / 60;
    // Restante da jornada para deslocamento e abordagem
    const horasDeslocamentoDia = Math.max(0, jornadaHorasDia - horasEntrevistasDia);
    return {
      horasEntrevistasDia: Math.round(horasEntrevistasDia * 10) / 10,
      horasDeslocamentoDia: Math.round(horasDeslocamentoDia * 10) / 10,
      totalHorasPeriodo: Math.round(jornadaHorasDia * diasCampoInput),
    };
  }, [produtividadeInput, tempoMinutosEntrevista, jornadaHorasDia, diasCampoInput]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header do Módulo */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          'bg-surface border-ui shadow-xl'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1
                    className={`text-xl font-bold tracking-tight ${
                      'text-primary'
                    }`}
                  >
                    Dimensionamento de Equipe em Campo
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
                    Planejamento & Amostragem
                  </span>
                </div>
                <p className={`text-xs mt-0.5 text-muted`}>
                  Cálculo técnico da quantidade mínima de pesquisadores necessária para cobrir a amostra com base na meta de entrevistas e produtividade esperada.
                </p>
              </div>
            </div>
          </div>

          {/* Seleção de Pesquisa & Ações de Exportação */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[240px]">
              <select
                id="select-survey-dimensionamento"
                value={selectedSurveyId}
                onChange={(e) => setSelectedSurveyId(e.target.value)}
                className={`w-full text-xs font-semibold px-3 py-2 rounded-lg border appearance-none pr-8 transition-colors ${
                  'bg-surface-raised border-ui text-primary focus:border-emerald-500'
                }`}
              >
                {activeSurveys.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.codigo}] {s.nome.length > 32 ? s.nome.substring(0, 32) + '...' : s.nome}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted">
                <Sliders className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Exportar PDF */}
            <button
              id="btn-export-pdf-dimensionamento"
              onClick={() =>
                exportTeamSizingToPDF(
                  virtualSurvey,
                  sizing,
                  allocatedCollaborators,
                  availableResearchers,
                  submissions
                )
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                'bg-surface-raised border-ui text-primary hover:bg-surface-hover hover:text-primary'
              }`}
              title="Exportar Relatório Executivo em PDF"
            >
              <FileText className="h-3.5 w-3.5 text-accent-danger" />
              <span>PDF</span>
            </button>

            {/* Exportar Excel */}
            <button
              id="btn-export-xlsx-dimensionamento"
              onClick={() =>
                exportTeamSizingToXLSX(
                  virtualSurvey,
                  sizing,
                  allocatedCollaborators,
                  submissions
                )
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                'bg-surface-raised border-ui text-primary hover:bg-surface-hover hover:text-primary'
              }`}
              title="Exportar Planilha Excel com Abas"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-accent-success" />
              <span>Excel</span>
            </button>

            {/* Salvar na Pesquisa — apenas para quem administra metas/planejamento */}
            {canSaveSizing && (
              <button
                id="btn-save-dimensionamento"
                onClick={handleSaveToSurvey}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-accent-primary-solid text-on-accent shadow-md shadow-emerald-600/30 hover:bg-accent-primary-solid-hover transition-colors"
                title="Gravar estes parâmetros na pesquisa selecionada"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Salvar na Pesquisa</span>
              </button>
            )}
          </div>
        </div>

        {/* Mensagem de sucesso ao salvar */}
        {saveSuccessMsg && (
          <div className="mt-4 p-3 rounded-xl bg-accent-success-soft border border-accent-success-soft-border text-accent-success text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-success" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* 2. Destaque dos Resultados do Cálculo (KPIs Principais) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Quantidade Mínima Necessária */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            'bg-surface border-accent-primary-soft-border shadow-lg shadow-emerald-950/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider text-accent-primary`}>
              Equipe Mínima Necessária
            </span>
            <div className="p-2 rounded-xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
              <Calculator className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight text-primary`}>
              {sizing.minPesquisadores}
            </span>
            <span className={`text-xs font-semibold text-muted`}>
              pesquisadores em campo
            </span>
          </div>
          <p className={`mt-2 text-[11px] leading-relaxed text-muted`}>
            Cálculo: <span className="font-mono font-bold">teto({sizing.totalMetaColetas} / ({sizing.diasCampo}d × {sizing.mediaDiaPesquisador}))</span>
          </p>
          <div className="mt-3 pt-3 border-t border-ui/80 flex items-center justify-between text-[10px]">
            <span className="text-muted">Com reserva técnica (+{reservaTecnicaPercent}%):</span>
            <span className="font-bold text-accent-primary">{sizing.pesquisadoresRecomendados} pesquisadores</span>
          </div>
        </div>

        {/* Card 2: Status da Equipe Alocada */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            sizing.isSuficiente
              ? 'bg-surface border-accent-success-soft-border'
              : 'bg-surface border-accent-warning-soft-border shadow-lg shadow-amber-950/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                sizing.isSuficiente ? 'text-accent-success' : 'text-accent-warning'
              }`}
            >
              Equipe Atual Alocada
            </span>
            <div
              className={`p-2 rounded-xl border ${
                sizing.isSuficiente
                  ? 'bg-accent-success-soft text-accent-success border-accent-success-soft-border'
                  : 'bg-accent-warning-soft text-accent-warning border-accent-warning-soft-border'
              }`}
            >
              {sizing.isSuficiente ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight text-primary`}>
              {sizing.pesquisadoresAlocados}
            </span>
            <span className={`text-xs font-semibold text-muted`}>
              pesquisadores escalados
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {sizing.isSuficiente ? (
              <span className="text-[11px] font-bold text-accent-success flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Cobertura suficiente para o prazo
              </span>
            ) : (
              <span className="text-[11px] font-bold text-accent-warning flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Déficit de {sizing.deficit} pesquisador(es)
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-ui/80 flex items-center justify-between text-[10px]">
            <span className="text-muted">Meta por pesquisador:</span>
            <span className="font-bold text-secondary">
              {sizing.pesquisadoresAlocados > 0
                ? `${Math.ceil(sizing.totalMetaColetas / sizing.pesquisadoresAlocados)} coletas`
                : 'Nenhum alocado'}
            </span>
          </div>
        </div>

        {/* Card 3: Capacidade Operacional do Período */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            'bg-surface border-ui'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider text-muted`}>
              Capacidade Individual
            </span>
            <div className="p-2 rounded-xl bg-surface-raised text-muted border border-ui/50">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight text-primary`}>
              {sizing.capacidadeIndividualPeriodo}
            </span>
            <span className={`text-xs font-semibold text-muted`}>
              coletas por pesquisador
            </span>
          </div>
          <p className={`mt-2 text-[11px] leading-relaxed text-muted`}>
            {sizing.mediaDiaPesquisador} coletas/dia ao longo de {sizing.diasCampo} dias de campo.
          </p>
          <div className="mt-3 pt-3 border-t border-ui/80 flex items-center justify-between text-[10px]">
            <span className="text-muted">Tempo útil/entrevista:</span>
            <span className="font-bold text-secondary">{tempoMinutosEntrevista} minutos</span>
          </div>
        </div>

        {/* Card 4: Progresso de Coleta em Campo */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            'bg-surface border-ui'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider text-muted`}>
              Coletas em Tempo Real
            </span>
            <div className="p-2 rounded-xl bg-surface-raised text-muted border border-ui/50">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight text-primary`}>
              {sizing.coletasRealizadas}
            </span>
            <span className={`text-xs font-semibold text-muted`}>
              de {sizing.totalMetaColetas} ({sizing.percentualConcluido}%)
            </span>
          </div>
          {/* Barra de Progresso */}
          <div className="mt-2.5 h-2 w-full bg-surface-raised rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                sizing.percentualConcluido >= 100
                  ? 'bg-accent-success-solid'
                  : sizing.percentualConcluido >= 50
                  ? 'bg-accent-primary-solid'
                  : 'bg-accent-warning-solid'
              }`}
              style={{ width: `${Math.min(100, sizing.percentualConcluido)}%` }}
            />
          </div>
          <div className="mt-3 pt-3 border-t border-ui/80 flex items-center justify-between text-[10px]">
            <span className="text-muted">Restante para a meta:</span>
            <span className="font-bold text-secondary">{sizing.coletasRestantes} entrevistas</span>
          </div>
        </div>
      </div>

      {/* 2.5 Calculadora Estatística de Margem de Confiança & Amostra Mínima Ideal */}
      <ConfidenceSampleCalculator
        currentGoal={metaTotalInput}
        initialConfidence={nivelConfiancaInput}
        initialMarginOfError={margemErroInput}
        initialPopulation={populacaoUniversoInput}
        onApplyGoal={(minSample, conf, margin, pop) => {
          setMetaTotalInput(minSample);
          setNivelConfiancaInput(conf);
          setMargemErroInput(margin);
          setPopulacaoUniversoInput(pop);
        }}
      />

      {/* 3. Painel de Parâmetros Operacionais (Interativo em Tempo Real) */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          'bg-surface border-ui'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-ui/80 mb-6">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-accent-primary" />
            <h2 className={`text-sm font-bold uppercase tracking-wider text-primary`}>
              Parâmetros Operacionais da Pesquisa
            </h2>
          </div>
          <span className={`text-xs text-muted`}>
            Ajuste os valores para recalcular o contingente imediatamente
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Meta Total de Entrevistas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold text-secondary`}>
                Meta Total de Entrevistas (N Amostral)
              </label>
              <span className="text-xs font-mono font-bold text-accent-primary">{metaTotalInput}</span>
            </div>
            <input
              id="input-meta-total-coletas"
              type="number"
              min={10}
              max={50000}
              step={10}
              value={metaTotalInput}
              onChange={(e) => setMetaTotalInput(Math.max(10, parseInt(e.target.value) || 0))}
              className={`w-full text-sm font-semibold px-3 py-2 rounded-lg border transition-colors ${
                'bg-surface-raised border-ui text-primary focus:border-emerald-500'
              }`}
            />
            {/* Margem de Confiança & Erro em Tempo Real */}
            <div
              className={`px-2.5 py-1.5 rounded-md border flex items-center justify-between text-[11px] ${
                'bg-accent-primary-soft border-accent-primary-soft-border text-accent-primary'
              }`}
            >
              <div className="flex items-center gap-1">
                <Percent className="h-3 w-3 text-accent-primary" />
                <span>Confiança: <strong>{nivelConfiancaInput}%</strong></span>
              </div>
              <span>Margem de erro: <strong>±{currentEstimatedMarginOfError.marginOfErrorPercent}%</strong></span>
            </div>

            {/* Presets Rápidos */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-muted">Presets:</span>
              {[200, 400, 600, 800, 1000, 1500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMetaTotalInput(val)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                    metaTotalInput === val
                      ? 'bg-accent-primary-solid text-on-accent border-emerald-500'
                      : 'bg-surface-raised text-muted border-ui hover:text-primary'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Produtividade Média Diária Esperada */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold text-secondary`}>
                Produtividade Média Esperada (entr./pesquisador/dia)
              </label>
              <span className="text-xs font-mono font-bold text-accent-primary">{produtividadeInput} /dia</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="slider-produtividade-dia"
                type="range"
                min={5}
                max={40}
                step={1}
                value={produtividadeInput}
                onChange={(e) => setProdutividadeInput(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <input
                id="input-produtividade-dia"
                type="number"
                min={1}
                max={100}
                value={produtividadeInput}
                onChange={(e) => setProdutividadeInput(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border ${
                  'bg-surface-raised border-ui text-primary'
                }`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted">
              <span>5 (questionário denso)</span>
              <span>15 (padrão)</span>
              <span>30 (fluxo rápido)</span>
            </div>
          </div>

          {/* 3. Prazo Previsto em Dias de Campo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold text-secondary`}>
                Prazo Previsto de Campo (Dias Úteis)
              </label>
              <span className="text-xs font-mono font-bold text-accent-primary">{diasCampoInput} dias</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="slider-dias-campo"
                type="range"
                min={1}
                max={20}
                step={1}
                value={diasCampoInput}
                onChange={(e) => setDiasCampoInput(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <input
                id="input-dias-campo"
                type="number"
                min={1}
                max={60}
                value={diasCampoInput}
                onChange={(e) => setDiasCampoInput(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border ${
                  'bg-surface-raised border-ui text-primary'
                }`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted">
              <span>1 dia (flash)</span>
              <span>3 a 5 dias (típico)</span>
              <span>15+ dias (longo)</span>
            </div>
          </div>

          {/* 4. Tempo Médio de Aplicação do Questionário */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold text-secondary`}>
                Duração Média da Entrevista (minutos)
              </label>
              <span className="text-xs font-mono font-bold text-accent-primary">{tempoMinutosEntrevista} min</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="slider-tempo-entrevista"
                type="range"
                min={3}
                max={45}
                step={1}
                value={tempoMinutosEntrevista}
                onChange={(e) => setTempoMinutosEntrevista(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <input
                id="input-tempo-entrevista"
                type="number"
                min={1}
                max={120}
                value={tempoMinutosEntrevista}
                onChange={(e) => setTempoMinutosEntrevista(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border ${
                  'bg-surface-raised border-ui text-primary'
                }`}
              />
            </div>
            <p className="text-[10px] text-muted">
              Tempo útil de entrevista por dia: {tempoTotalHorasCampoPorPesquisador.horasEntrevistasDia}h
            </p>
          </div>

          {/* 5. Jornada Diária de Trabalho */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold text-secondary`}>
                Jornada Diária de Campo (horas/dia)
              </label>
              <span className="text-xs font-mono font-bold text-accent-primary">{jornadaHorasDia}h/dia</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="slider-jornada-horas"
                type="range"
                min={4}
                max={10}
                step={1}
                value={jornadaHorasDia}
                onChange={(e) => setJornadaHorasDia(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <input
                id="input-jornada-horas"
                type="number"
                min={2}
                max={14}
                value={jornadaHorasDia}
                onChange={(e) => setJornadaHorasDia(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border ${
                  'bg-surface-raised border-ui text-primary'
                }`}
              />
            </div>
            <p className="text-[10px] text-muted">
              Deslocamento e abordagem estimados: {tempoTotalHorasCampoPorPesquisador.horasDeslocamentoDia}h/dia
            </p>
          </div>

          {/* 6. Reserva Técnica / Margem de Segurança */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold text-secondary`}>
                Margem de Reserva Técnica
              </label>
              <span className="text-xs font-mono font-bold text-accent-primary">+{reservaTecnicaPercent}%</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="slider-reserva-tecnica"
                type="range"
                min={0}
                max={40}
                step={5}
                value={reservaTecnicaPercent}
                onChange={(e) => setReservaTecnicaPercent(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <input
                id="input-reserva-tecnica"
                type="number"
                min={0}
                max={100}
                value={reservaTecnicaPercent}
                onChange={(e) => setReservaTecnicaPercent(Math.max(0, parseInt(e.target.value) || 0))}
                className={`w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border ${
                  'bg-surface-raised border-ui text-primary'
                }`}
              />
            </div>
            <p className="text-[10px] text-muted">
              Garante cobertura contra faltas de pesquisadores e rejeições em campo.
            </p>
          </div>
        </div>

        {/* Equivalência de Metas por Sexo (100% da Meta Total) */}
        <div className="mt-6 pt-5 border-t border-ui/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent-success" />
              <h3 className={`text-xs font-bold uppercase tracking-wider text-primary`}>
                Equivalência Amostral por Sexo (Soma = 100% da Meta N)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-accent-success">
              Total Sexo: {metaSexoMasc + metaSexoFem} / {metaTotalInput} (100% Amostral)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Masculino */}
            <div className={`p-3 rounded-xl border bg-surface-raised border-ui`}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-accent-primary font-bold">Masculino</span>
                <span className="font-mono">{masculinoPercent}%</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-bold text-primary">{metaSexoMasc}</span>
                <span className="text-[10px] text-muted">coletas alvo</span>
              </div>
            </div>

            {/* Slider de Proporção */}
            <div className="space-y-1">
              <input
                id="slider-proporcao-sexo"
                type="range"
                min={20}
                max={80}
                value={masculinoPercent}
                onChange={(e) => setMasculinoPercent(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted">
                <span>Mais Masculino</span>
                <button
                  type="button"
                  onClick={() => setMasculinoPercent(50)}
                  className="underline hover:text-accent-primary"
                >
                  Resetar 50%/50%
                </button>
                <span>Mais Feminino</span>
              </div>
            </div>

            {/* Feminino */}
            <div className={`p-3 rounded-xl border bg-surface-raised border-ui`}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-accent-danger font-bold">Feminino</span>
                <span className="font-mono">{100 - masculinoPercent}%</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-bold text-primary">{metaSexoFem}</span>
                <span className="text-[10px] text-muted">coletas alvo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Matriz de Sensibilidade & Análise de Cenários */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          'bg-surface border-ui'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent-primary" />
              <h2 className={`text-sm font-bold uppercase tracking-wider text-primary`}>
                Matriz de Sensibilidade: Prazo de Campo vs. Produtividade
              </h2>
            </div>
            <p className={`text-xs mt-0.5 text-muted`}>
              Quantidade mínima de pesquisadores necessária em cada combinação de prazo e produtividade para a meta de {metaTotalInput} entrevistas. Clique em uma célula para adotar o cenário.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-raised text-secondary border border-ui">
            Célula destacada = Cenário Atual
          </span>
        </div>

        {/* Tabela da Matriz de Sensibilidade */}
        <div className="overflow-x-auto rounded-xl border border-ui/80">
          <table className="w-full text-xs text-left">
            <thead className={`text-[11px] font-bold uppercase tracking-wider bg-surface-raised text-secondary`}>
              <tr>
                <th className="px-4 py-3 border-r border-ui">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-accent-primary" />
                    <span>Prazo (Dias)</span>
                  </div>
                </th>
                {prodList.map((prod) => (
                  <th key={prod} className="px-3 py-3 text-center">
                    {prod} entr./dia
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ui/60">
              {diasList.map((dias, dIdx) => {
                const isCurrentDias = dias === diasCampoInput;
                return (
                  <tr
                    key={dias}
                    className={`transition-colors ${
                      isCurrentDias
                        ? 'bg-accent-primary-soft'
                        : 'hover:bg-surface-raised'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-bold border-r border-ui whitespace-nowrap">
                      <span className={isCurrentDias ? 'text-accent-primary font-extrabold' : 'text-secondary'}>
                        {dias} dia{dias > 1 ? 's' : ''} de campo
                      </span>
                    </td>
                    {prodList.map((prod, pIdx) => {
                      const count = matrix[dIdx][pIdx];
                      const isCurrentCell = isCurrentDias && prod === produtividadeInput;

                      return (
                        <td key={prod} className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setDiasCampoInput(dias);
                              setProdutividadeInput(prod);
                            }}
                            className={`w-full py-1.5 px-2 rounded-lg font-bold text-xs transition-all ${
                              isCurrentCell
                                ? 'bg-accent-primary-solid text-on-accent shadow-md shadow-emerald-600/40 ring-2 ring-emerald-400'
                                : count <= 5
                                ? 'bg-accent-success-soft text-accent-success hover:bg-accent-success-solid/20 border border-emerald-800/30'
                                : count <= 12
                                ? 'bg-surface-raised text-primary hover:bg-surface-raised'
                                : 'bg-accent-warning-soft text-accent-warning hover:bg-accent-warning-solid/20 border border-amber-800/30'
                            }`}
                            title={`Adotar cenário: ${dias} dias x ${prod} entr./dia = ${count} pesquisadores`}
                          >
                            {count}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Escalação da Equipe & Gestão de Colaboradores de Campo */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          'bg-surface border-ui'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-ui/80 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent-primary" />
              <h2 className={`text-sm font-bold uppercase tracking-wider text-primary`}>
                Escalação da Equipe de Campo ({allocatedCollaborators.length} de {availableResearchers.length} alocados)
              </h2>
            </div>
            <p className={`text-xs mt-0.5 text-muted`}>
              Vincule pesquisadores à pesquisa para cobrir a cota mínima de {sizing.minPesquisadores} profissionais.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={allocateAllAvailable}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                'bg-surface-raised border-ui text-secondary hover:text-primary'
              }`}
            >
              Alocar Todos
            </button>
            <button
              type="button"
              onClick={clearAllocation}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                'bg-surface-raised border-ui text-secondary hover:text-primary'
              }`}
            >
              Limpar Equipe
            </button>
          </div>
        </div>

        {/* Tabela de Pesquisadores */}
        <div className="overflow-x-auto rounded-xl border border-ui/80">
          <table className="w-full text-xs text-left">
            <thead className={`text-[11px] font-bold uppercase tracking-wider bg-surface-raised text-secondary`}>
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pesquisador</th>
                <th className="px-4 py-3">Login / Contato</th>
                <th className="px-4 py-3 text-center">Cota Atribuída</th>
                <th className="px-4 py-3 text-center">Realizadas</th>
                <th className="px-4 py-3">Progresso da Cota</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui/60">
              {availableResearchers.map((colab) => {
                const isAllocated = allocatedIds.includes(colab.id);
                const cotaIndividual =
                  allocatedCollaborators.length > 0 && isAllocated
                    ? Math.ceil(metaTotalInput / allocatedCollaborators.length)
                    : 0;
                const realizadas = countByPesq[colab.id] || 0;
                const pct = cotaIndividual > 0 ? Math.min(100, Math.round((realizadas / cotaIndividual) * 100)) : 0;

                return (
                  <tr
                    key={colab.id}
                    className={`transition-colors ${
                      isAllocated
                        ? 'bg-accent-primary-soft'
                        : 'hover:bg-surface-raised'
                    }`}
                  >
                    {/* Status da Alocação */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isAllocated ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-success-soft text-accent-success border border-accent-success-soft-border">
                          <CheckCircle2 className="h-3 w-3" /> Escalado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-raised text-muted border border-ui">
                          Não Alocado
                        </span>
                      )}
                    </td>

                    {/* Nome do Pesquisador */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            isAllocated
                              ? 'bg-accent-primary-solid text-on-accent'
                              : 'bg-surface-raised text-muted'
                          }`}
                        >
                          {colab.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={`font-bold text-primary`}>
                            {colab.nome}
                          </div>
                          <div className="text-[10px] text-muted">
                            CPF: {colab.cpf || 'Não informado'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-4 py-3 text-muted font-mono text-[11px]">
                      <div>@{colab.login}</div>
                      <div className="text-[10px] text-muted">{colab.celular || colab.email}</div>
                    </td>

                    {/* Cota Atribuída */}
                    <td className="px-4 py-3 text-center">
                      {isAllocated ? (
                        <span className="font-bold text-accent-primary font-mono">
                          {cotaIndividual} entr.
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Realizadas */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold font-mono text-primary">
                        {realizadas}
                      </span>
                    </td>

                    {/* Progresso da Cota */}
                    <td className="px-4 py-3">
                      {isAllocated ? (
                        <div className="w-32">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-muted font-semibold">{pct}%</span>
                            <span className="text-muted">{realizadas}/{cotaIndividual}</span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                            <div
                              className={`h-full ${pct >= 100 ? 'bg-accent-success-solid' : 'bg-accent-primary-solid'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted text-[11px]">Não atribuído</span>
                      )}
                    </td>

                    {/* Botão de Toggle */}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleAllocateResearcher(colab.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          isAllocated
                            ? 'bg-accent-danger-soft text-accent-danger border border-accent-danger-soft-border hover:bg-accent-danger-soft'
                            : 'bg-accent-primary-solid text-on-accent shadow-xs hover:bg-accent-primary-solid-hover'
                        }`}
                      >
                        {isAllocated ? (
                          <>
                            <UserMinus className="h-3.5 w-3.5" />
                            <span>Desalocar</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Alocar</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
