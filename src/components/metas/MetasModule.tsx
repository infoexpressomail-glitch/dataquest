import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Target,
  Plus,
  Trash2,
  Globe2,
  User,
  Users,
  Smartphone,
  Layers,
  Sparkles,
  Info,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import { MetaTarget, ConditionOperator } from '../../types';
import { GlobalMetasManager } from './GlobalMetasManager';
import { ResearcherIndividualGoalsView } from './ResearcherIndividualGoalsView';
import { MobileMetasDashboard } from './MobileMetasDashboard';
import { FieldTeamSizingCard } from './FieldTeamSizingCard';
import { calculateTeamSizing } from '../../utils/crosstabUtils';

export const MetasModule: React.FC = () => {
  const { surveys, submissions, saveSurvey, hasPermission, setActiveModule } = useApp();

  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(surveys[0]?.id || '');
  const activeSurvey = surveys.find((s) => s.id === selectedSurveyId) || surveys[0];

  const canManageMetas = hasPermission('meta_criar_alterar_excluir');
  // Pesquisador de campo enxerga apenas o próprio progresso: as demais abas (gestão de
  // metas globais, dimensionamento de equipe e metas por questão) são de uso
  // administrativo/analítico e não fazem parte do trabalho de coleta.
  const isFieldResearcher = !canManageMetas && !hasPermission('analise_acesso');

  // Se o usuário for pesquisador (sem permissão de gestão), abre por padrão no progresso individual
  const [activeTab, setActiveTab] = useState<'globais' | 'dimensionamento' | 'individual' | 'mobile' | 'questoes'>(
    canManageMetas ? 'globais' : 'individual'
  );

  const teamSizing = activeSurvey
    ? calculateTeamSizing(activeSurvey, submissions)
    : null;

  // New Meta por questão state
  const [perguntaId, setPerguntaId] = useState<string>('');
  const [condicao, setCondicao] = useState<ConditionOperator>('igual');
  const [resposta, setResposta] = useState<string>('');
  const [quantidadeAlvo, setQuantidadeAlvo] = useState<number>(100);

  const handleAddMeta = () => {
    if (!activeSurvey) return;
    if (!perguntaId || !resposta.trim()) {
      alert('Selecione a questão e informe a resposta esperada para a meta.');
      return;
    }

    const newMeta: MetaTarget = {
      id: `meta_${Date.now()}`,
      pesquisaId: activeSurvey.id,
      perguntaId,
      condicao,
      resposta: resposta.trim(),
      quantidadeAlvo: Number(quantidadeAlvo) || 50,
      quantidadeAtingida: 0,
      ciclo: `Ciclo ${activeSurvey.cicloAtual} - ${new Date().getFullYear()}`,
    };

    const updatedSurvey = {
      ...activeSurvey,
      metas: [...activeSurvey.metas, newMeta],
    };

    saveSurvey(updatedSurvey);
    setResposta('');
  };

  const handleDeleteMeta = (metaId: string) => {
    if (!activeSurvey) return;
    const updatedSurvey = {
      ...activeSurvey,
      metas: activeSurvey.metas.filter((m) => m.id !== metaId),
    };
    saveSurvey(updatedSurvey);
  };

  const totalMetasGlobais = activeSurvey?.metasGlobais?.length || 0;
  const totalMetasQuestoes = activeSurvey?.metas?.length || 0;

  // Proteção de navegação: mesmo que activeTab aponte para uma aba administrativa,
  // o pesquisador de campo é redirecionado para o seu progresso individual.
  const restrictedTabsForResearcher: Array<typeof activeTab> = ['globais', 'dimensionamento', 'questoes'];
  const effectiveTab =
    isFieldResearcher && restrictedTabsForResearcher.includes(activeTab) ? 'individual' : activeTab;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
              Módulo de Metas e Quotas Amostrais
            </h1>
            <span className="rounded-full bg-accent-primary-soft px-2.5 py-0.5 text-[11px] font-bold text-accent-primary border border-accent-primary-soft-border">
              Demografia & Tempo Real
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Gerenciamento agregado por demografia (idade, sexo, bairro), vinculação individual por
            pesquisador e painel de campo mobile.
          </p>
        </div>

        {/* Survey Selector */}
        <div className="flex items-center gap-2 bg-surface border border-ui rounded-xl px-3 py-1.5 shadow-sm">
          <label className="text-xs font-semibold text-muted whitespace-nowrap">
            Pesquisa:
          </label>
          <select
            value={selectedSurveyId}
            onChange={(e) => setSelectedSurveyId(e.target.value)}
            className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer max-w-[260px] truncate"
          >
            {surveys.map((s) => (
              <option key={s.id} value={s.id} className="bg-surface text-primary">
                [{s.codigo}] {s.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-ui pb-1 overflow-x-auto no-scrollbar">
        {!isFieldResearcher && (
          <button
            type="button"
            onClick={() => setActiveTab('globais')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'globais'
                ? 'bg-accent-primary-solid text-on-accent shadow-lg shadow-emerald-900/30'
                : 'text-muted hover:text-primary hover:bg-surface-raised'
            }`}
          >
            <Globe2 className="h-4 w-4" />
            <span>Gerenciamento de Metas Globais</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                activeTab === 'globais'
                  ? 'bg-accent-primary-soft text-accent-primary-soft-text'
                  : 'bg-surface-raised text-muted'
              }`}
            >
              {totalMetasGlobais}
            </span>
          </button>
        )}

        {!isFieldResearcher && (
          <button
            type="button"
            onClick={() => setActiveTab('dimensionamento')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'dimensionamento'
                ? 'bg-accent-primary-solid text-on-accent shadow-lg shadow-emerald-900/30'
                : 'text-muted hover:text-primary hover:bg-surface-raised'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Dimensionamento de Pesquisadores</span>
            {teamSizing && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  activeTab === 'dimensionamento'
                    ? 'bg-accent-primary-soft text-accent-primary-soft-text'
                    : 'bg-surface-raised text-secondary'
                }`}
              >
                Min: {teamSizing.minPesquisadores}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('individual')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'individual'
              ? 'bg-accent-primary-solid text-on-accent shadow-lg shadow-emerald-900/30'
              : 'text-muted hover:text-primary hover:bg-surface-raised'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Meu Progresso Individual</span>
          <span className="flex h-2 w-2 rounded-full bg-accent-success-solid animate-pulse" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mobile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'mobile'
              ? 'bg-accent-primary-solid text-on-accent shadow-lg shadow-emerald-900/30'
              : 'text-muted hover:text-primary hover:bg-surface-raised'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span>Painel de Metas Mobile</span>
        </button>

        {!isFieldResearcher && (
          <button
            type="button"
            onClick={() => setActiveTab('questoes')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'questoes'
                ? 'bg-accent-primary-solid text-on-accent shadow-lg shadow-emerald-900/30'
                : 'text-muted hover:text-primary hover:bg-surface-raised'
            }`}
          >
            <Target className="h-4 w-4" />
            <span>Metas por Questão</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                activeTab === 'questoes'
                  ? 'bg-accent-primary-soft text-accent-primary-soft-text'
                  : 'bg-surface-raised text-muted'
              }`}
            >
              {totalMetasQuestoes}
            </span>
          </button>
        )}
      </div>

      {/* Submodule View 1: Gerenciamento de Metas Globais */}
      {effectiveTab === 'globais' && activeSurvey && (
        <GlobalMetasManager activeSurvey={activeSurvey} canManageMetas={canManageMetas} />
      )}

      {/* Submodule View: Dimensionamento de Equipe em Campo */}
      {effectiveTab === 'dimensionamento' && activeSurvey && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-accent-primary-soft border border-accent-primary-soft-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-accent-primary" />
                <span>Módulo Dedicado de Dimensionamento & Alocação de Equipe</span>
              </h4>
              <p className="text-[11px] text-muted mt-0.5">
                Acesse a matriz completa de sensibilidade, alocação rápida de colaboradores e exportações multiformato.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModule('dimensionamento')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-accent-primary-solid text-on-accent shadow-xs hover:bg-accent-primary-solid-hover transition-colors whitespace-nowrap"
            >
              <span>Abrir Módulo de Dimensionamento</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <FieldTeamSizingCard
            survey={activeSurvey}
            submissions={submissions}
            onUpdateSurveyParams={(params) => {
              saveSurvey({
                ...activeSurvey,
                ...params,
              });
            }}
          />
        </div>
      )}

      {/* Submodule View 2: Meu Progresso Individual em Tempo Real */}
      {effectiveTab === 'individual' && activeSurvey && (
        <ResearcherIndividualGoalsView activeSurvey={activeSurvey} />
      )}

      {/* Submodule View 3: Painel de Metas Mobile */}
      {effectiveTab === 'mobile' && activeSurvey && (
        <MobileMetasDashboard activeSurvey={activeSurvey} />
      )}

      {/* Submodule View 4: Metas Tradicionais por Questão */}
      {effectiveTab === 'questoes' && activeSurvey && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-ui bg-surface p-4 text-xs text-muted">
            <div className="flex items-center gap-2 text-primary font-bold mb-1">
              <Info className="h-4 w-4 text-accent-primary" />
              <span>Controle de Quotas Amostrais por Questão</span>
            </div>
            Estruturado obrigatoriamente pela tríade: <strong className="text-secondary">Questão</strong>,{' '}
            <strong className="text-secondary">Condição</strong> e{' '}
            <strong className="text-secondary">Resposta</strong>.
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeSurvey.metas.map((meta) => {
              const q = activeSurvey.perguntas.find((p) => p.id === meta.perguntaId);
              const progress =
                meta.quantidadeAlvo > 0
                  ? Math.min(100, Math.round((meta.quantidadeAtingida / meta.quantidadeAlvo) * 100))
                  : 0;

              return (
                <div
                  key={meta.id}
                  className="flex flex-col justify-between rounded-2xl border border-ui bg-surface p-4 shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-accent-primary" />
                        <span className="font-bold text-xs text-primary">
                          {meta.quantidadeAtingida} / {meta.quantidadeAlvo} Coletas
                        </span>
                      </div>

                      {canManageMetas && (
                        <button
                          onClick={() => handleDeleteMeta(meta.id)}
                          className="rounded-lg p-1 text-muted hover:bg-accent-danger-soft hover:text-accent-danger transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-secondary">
                      <div>
                        <strong className="text-muted">1. Questão:</strong> [{q?.codigo}] {q?.enunciado.slice(0, 40)}...
                      </div>
                      <div>
                        <strong className="text-muted">2. Condição:</strong> {meta.condicao.toUpperCase()}
                      </div>
                      <div>
                        <strong className="text-muted">3. Resposta:</strong> "{meta.resposta}"
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-ui pt-3">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-muted">Progresso</span>
                      <span className="text-accent-primary">{progress}%</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                      <div
                        className="h-full rounded-full bg-accent-primary-solid transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {activeSurvey.metas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ui bg-surface p-8 text-center">
              <Target className="mx-auto h-8 w-8 text-muted" />
              <p className="mt-2 text-xs font-semibold text-muted">
                Nenhuma meta por questão cadastrada para esta pesquisa.
              </p>
            </div>
          )}

          {/* Form to add new meta if has permission */}
          {canManageMetas && (
            <div className="mt-6 rounded-2xl border border-ui bg-surface p-5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                + Cadastrar Nova Meta Amostral por Questão
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Questão */}
                <div>
                  <label className="block text-xs font-bold text-secondary">
                    1. Questão *
                  </label>
                  <select
                    value={perguntaId}
                    onChange={(e) => {
                      setPerguntaId(e.target.value);
                      const q = activeSurvey.perguntas.find((x) => x.id === e.target.value);
                      if (q?.opcoes && q.opcoes.length > 0) {
                        setResposta(q.opcoes[0].value);
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-3 py-2 text-xs text-primary focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Selecione a questão...</option>
                    {activeSurvey.perguntas.map((q) => (
                      <option key={q.id} value={q.id}>
                        [{q.codigo}] {q.enunciado.slice(0, 35)}...
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Condição */}
                <div>
                  <label className="block text-xs font-bold text-secondary">
                    2. Condição *
                  </label>
                  <select
                    value={condicao}
                    onChange={(e) => setCondicao(e.target.value as ConditionOperator)}
                    className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-3 py-2 text-xs text-primary focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="igual">Igual a (=)</option>
                    <option value="diferente">Diferente de (≠)</option>
                    <option value="contem">Contém o termo</option>
                  </select>
                </div>

                {/* 3. Resposta */}
                <div>
                  <label className="block text-xs font-bold text-secondary">
                    3. Resposta Esperada *
                  </label>
                  <input
                    type="text"
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    placeholder="Ex: Sim, Não, ou categoria..."
                    className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-3 py-2 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Quantidade Alvo */}
                <div>
                  <label className="block text-xs font-bold text-secondary">
                    Meta Amostral (Qtd)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quantidadeAlvo}
                    onChange={(e) => setQuantidadeAlvo(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-3 py-2 text-xs text-primary focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  id="btn-add-new-meta"
                  onClick={handleAddMeta}
                  className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Meta por Questão</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

