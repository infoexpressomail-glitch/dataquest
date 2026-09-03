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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Módulo de Metas e Quotas Amostrais
            </h1>
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-blue-400 border border-blue-500/20">
              Demografia & Tempo Real
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gerenciamento agregado por demografia (idade, sexo, bairro), vinculação individual por
            pesquisador e painel de campo mobile.
          </p>
        </div>

        {/* Survey Selector */}
        <div className="flex items-center gap-2 bg-[#16171d] border border-slate-800 rounded-xl px-3 py-1.5 shadow-sm">
          <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">
            Pesquisa:
          </label>
          <select
            value={selectedSurveyId}
            onChange={(e) => setSelectedSurveyId(e.target.value)}
            className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer max-w-[260px] truncate"
          >
            {surveys.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#16171d] text-slate-200">
                [{s.codigo}] {s.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('globais')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'globais'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Globe2 className="h-4 w-4" />
          <span>Gerenciamento de Metas Globais</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeTab === 'globais'
                ? 'bg-blue-800 text-blue-100'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {totalMetasGlobais}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dimensionamento')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'dimensionamento'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Dimensionamento de Pesquisadores</span>
          {teamSizing && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                activeTab === 'dimensionamento'
                  ? 'bg-blue-800 text-blue-100'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              Min: {teamSizing.minPesquisadores}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('individual')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'individual'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Meu Progresso Individual</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mobile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'mobile'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span>Painel de Metas Mobile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('questoes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'questoes'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Target className="h-4 w-4" />
          <span>Metas por Questão</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeTab === 'questoes'
                ? 'bg-blue-800 text-blue-100'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {totalMetasQuestoes}
          </span>
        </button>
      </div>

      {/* Submodule View 1: Gerenciamento de Metas Globais */}
      {activeTab === 'globais' && activeSurvey && (
        <GlobalMetasManager activeSurvey={activeSurvey} canManageMetas={canManageMetas} />
      )}

      {/* Submodule View: Dimensionamento de Equipe em Campo */}
      {activeTab === 'dimensionamento' && activeSurvey && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-blue-400" />
                <span>Módulo Dedicado de Dimensionamento & Alocação de Equipe</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Acesse a matriz completa de sensibilidade, alocação rápida de colaboradores e exportações multiformato.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModule('dimensionamento')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs hover:bg-blue-500 transition-colors whitespace-nowrap"
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
      {activeTab === 'individual' && activeSurvey && (
        <ResearcherIndividualGoalsView activeSurvey={activeSurvey} />
      )}

      {/* Submodule View 3: Painel de Metas Mobile */}
      {activeTab === 'mobile' && activeSurvey && (
        <MobileMetasDashboard activeSurvey={activeSurvey} />
      )}

      {/* Submodule View 4: Metas Tradicionais por Questão */}
      {activeTab === 'questoes' && activeSurvey && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-200 font-bold mb-1">
              <Info className="h-4 w-4 text-blue-400" />
              <span>Controle de Quotas Amostrais por Questão</span>
            </div>
            Estruturado obrigatoriamente pela tríade: <strong className="text-slate-300">Questão</strong>,{' '}
            <strong className="text-slate-300">Condição</strong> e{' '}
            <strong className="text-slate-300">Resposta</strong>.
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
                  className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#16171d] p-4 shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-blue-400" />
                        <span className="font-bold text-xs text-white">
                          {meta.quantidadeAtingida} / {meta.quantidadeAlvo} Coletas
                        </span>
                      </div>

                      {canManageMetas && (
                        <button
                          onClick={() => handleDeleteMeta(meta.id)}
                          className="rounded-lg p-1 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-slate-300">
                      <div>
                        <strong className="text-slate-400">1. Questão:</strong> [{q?.codigo}] {q?.enunciado.slice(0, 40)}...
                      </div>
                      <div>
                        <strong className="text-slate-400">2. Condição:</strong> {meta.condicao.toUpperCase()}
                      </div>
                      <div>
                        <strong className="text-slate-400">3. Resposta:</strong> "{meta.resposta}"
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-800 pt-3">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-400">Progresso</span>
                      <span className="text-blue-400">{progress}%</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {activeSurvey.metas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-[#16171d] p-8 text-center">
              <Target className="mx-auto h-8 w-8 text-slate-500" />
              <p className="mt-2 text-xs font-semibold text-slate-400">
                Nenhuma meta por questão cadastrada para esta pesquisa.
              </p>
            </div>
          )}

          {/* Form to add new meta if has permission */}
          {canManageMetas && (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-[#16171d] p-5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                + Cadastrar Nova Meta Amostral por Questão
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Questão */}
                <div>
                  <label className="block text-xs font-bold text-slate-300">
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
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-[#111218] px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
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
                  <label className="block text-xs font-bold text-slate-300">
                    2. Condição *
                  </label>
                  <select
                    value={condicao}
                    onChange={(e) => setCondicao(e.target.value as ConditionOperator)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-[#111218] px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="igual">Igual a (=)</option>
                    <option value="diferente">Diferente de (≠)</option>
                    <option value="contem">Contém o termo</option>
                  </select>
                </div>

                {/* 3. Resposta */}
                <div>
                  <label className="block text-xs font-bold text-slate-300">
                    3. Resposta Esperada *
                  </label>
                  <input
                    type="text"
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    placeholder="Ex: Sim, Não, ou categoria..."
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-[#111218] px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Quantidade Alvo */}
                <div>
                  <label className="block text-xs font-bold text-slate-300">
                    Meta Amostral (Qtd)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quantidadeAlvo}
                    onChange={(e) => setQuantidadeAlvo(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-[#111218] px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  id="btn-add-new-meta"
                  onClick={handleAddMeta}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-colors"
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

