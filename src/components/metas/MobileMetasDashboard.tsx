import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Survey } from '../../types';
import {
  calculateResearcherIndividualProgress,
  ResearcherIndividualProgressResult,
} from '../../utils/demographicGoalsHelper';
import {
  Smartphone,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Clock,
  MapPin,
  Wifi,
  WifiOff,
  Battery,
  Radio,
  Target,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Award,
  Sparkles,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';

interface MobileMetasDashboardProps {
  activeSurvey: Survey;
  onNavigateToCollection?: () => void;
}

export const MobileMetasDashboard: React.FC<MobileMetasDashboardProps> = ({
  activeSurvey,
  onNavigateToCollection,
}) => {
  const {
    currentUser,
    collaborators,
    submissions,
    effectiveOnline,
    hasPermission,
    setActiveModule,
  } = useApp();

  const canSimulateOthers = hasPermission('meta_criar_alterar_excluir');
  const [selectedResearcherId, setSelectedResearcherId] = useState<string>(currentUser.id);
  const activeResearcherId = canSimulateOthers ? selectedResearcherId : currentUser.id;
  const activeResearcher =
    collaborators.find((c) => c.id === activeResearcherId) || currentUser;

  // Viewport mode: 'frame' (smartphone frame simulation) or 'fullscreen'
  const [viewMode, setViewMode] = useState<'frame' | 'fullscreen'>('frame');
  const [filterSegment, setFilterSegment] = useState<'todos' | 'pendentes' | 'concluidas'>('todos');
  const [currentTime, setCurrentTime] = useState<string>('12:45');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const metasGlobais = activeSurvey.metasGlobais || [];

  const individualGoals = metasGlobais
    .map((target) => {
      const progress = calculateResearcherIndividualProgress(
        target,
        submissions,
        activeResearcherId
      );
      return {
        target,
        progress,
      };
    })
    .filter((item): item is { target: typeof item.target; progress: ResearcherIndividualProgressResult } => {
      return item.progress !== null;
    });

  const totalCotasAlvo = individualGoals.reduce((acc, g) => acc + g.progress.cotaAlvo, 0);
  const totalCotasAtingidas = individualGoals.reduce((acc, g) => acc + g.progress.cotaAtingida, 0);
  const totalMetasConcluidas = individualGoals.filter((g) => g.progress.isConcluida).length;
  const percentualGeral =
    totalCotasAlvo > 0
      ? Math.min(100, Math.round((totalCotasAtingidas / totalCotasAlvo) * 100))
      : 0;

  const filteredGoals = individualGoals.filter(({ progress }) => {
    if (filterSegment === 'todos') return true;
    if (filterSegment === 'pendentes') return !progress.isConcluida;
    if (filterSegment === 'concluidas') return progress.isConcluida;
    return true;
  });

  // Prioridade recomendada para coleta em campo: a meta mais atrasada ou com menor %
  const priorityGoal = [...individualGoals]
    .filter((g) => !g.progress.isConcluida)
    .sort((a, b) => a.progress.percentual - b.progress.percentual)[0];

  const handleStartCollection = () => {
    if (onNavigateToCollection) {
      onNavigateToCollection();
    } else {
      setActiveModule('pesquisa');
    }
  };

  const renderMobileContent = () => (
    <div className="flex flex-col h-full bg-[#0d0e12] text-slate-100 overflow-y-auto">
      {/* Mobile OS Status Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-[#0d0e12]/95 px-5 py-2 text-[11px] font-semibold text-slate-400 backdrop-blur-md border-b border-slate-800/60">
        <span className="font-mono">{currentTime}</span>
        <div className="flex items-center gap-2">
          {effectiveOnline ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="h-3 w-3" />
              <span className="text-[10px]">4G</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400">
              <WifiOff className="h-3 w-3" />
              <span className="text-[10px]">Off</span>
            </span>
          )}
          <span className="flex items-center gap-0.5 text-slate-300">
            <span className="text-[10px]">98%</span>
            <Battery className="h-3 w-3 text-emerald-400" />
          </span>
        </div>
      </div>

      {/* Researcher Identity Header */}
      <div className="bg-gradient-to-b from-[#161822] to-[#0d0e12] px-5 pt-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-black text-white shadow-md shadow-blue-900/40">
              {activeResearcher.nome.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-white tracking-tight">{activeResearcher.nome}</h2>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-400">
                {activeResearcher.cargo || 'Pesquisador'} • Campo Ativo
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-center">
            <span className="block text-[10px] uppercase font-bold text-blue-400">Cotas</span>
            <span className="text-xs font-black text-white">
              {totalMetasConcluidas}/{individualGoals.length}
            </span>
          </div>
        </div>

        {/* Survey Badge */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900/80 border border-slate-800 p-2.5">
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] uppercase font-bold tracking-wider text-slate-500">
              Pesquisa em Andamento
            </span>
            <p className="text-xs font-bold text-slate-200 truncate">
              {activeSurvey.nome}
            </p>
          </div>
          <span className="rounded-md bg-blue-600/20 px-2 py-0.5 text-[10px] font-bold text-blue-400">
            Ciclo {activeSurvey.cicloAtual}
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-4 flex-1">
        {/* Overall Progress Widget */}
        <div className="rounded-2xl border border-slate-800 bg-[#16171d] p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400">Progresso Geral das Cotas</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-white">{totalCotasAtingidas}</span>
                <span className="text-xs text-slate-400">/ {totalCotasAlvo} coletas</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="text-sm font-black">{percentualGeral}%</span>
            </div>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${percentualGeral}%` }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
            <span>{totalMetasConcluidas} cotas concluídas</span>
            <span className="text-amber-400 font-medium">
              Faltam {Math.max(0, totalCotasAlvo - totalCotasAtingidas)} coletas
            </span>
          </div>
        </div>

        {/* Priority Focus Card for the Field */}
        {priorityGoal && (
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 to-[#16171d] p-3.5 shadow-md">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Prioridade Recomendada de Campo:</span>
            </div>
            <p className="text-xs font-bold text-white">{priorityGoal.target.titulo}</p>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-300">
                Faltam <strong>{priorityGoal.progress.restante}</strong> entrevistas
              </span>
              <button
                type="button"
                onClick={handleStartCollection}
                className="flex items-center gap-1 rounded-lg bg-amber-500 text-black px-2.5 py-1 text-[11px] font-bold hover:bg-amber-400 transition-colors shadow"
              >
                <span>Coletar Perfil</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Filter Chips for Mobile Touch */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['todos', 'pendentes', 'concluidas'] as const).map((seg) => (
            <button
              key={seg}
              onClick={() => setFilterSegment(seg)}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold shrink-0 transition-all ${
                filterSegment === seg
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {seg === 'todos'
                ? `Todas as Cotas (${individualGoals.length})`
                : seg === 'pendentes'
                ? `Em Aberto (${individualGoals.filter((g) => !g.progress.isConcluida).length})`
                : `Concluídas (${totalMetasConcluidas})`}
            </button>
          ))}
        </div>

        {/* Quota Cards for Mobile */}
        <div className="space-y-3">
          {filteredGoals.map(({ target, progress }) => (
            <div
              key={target.id}
              className={`rounded-2xl border p-4 transition-all ${
                progress.isConcluida
                  ? 'border-emerald-800/60 bg-[#121c17]'
                  : progress.percentual >= 75
                  ? 'border-blue-800/50 bg-[#141a24]'
                  : 'border-slate-800 bg-[#16171d]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    {progress.isConcluida ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Concluída
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                        <Clock className="h-3 w-3" /> Faltam {progress.restante}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-white leading-tight line-clamp-2">
                    {target.titulo}
                  </h3>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-lg font-black text-white">{progress.cotaAtingida}</span>
                    <span className="text-xs text-slate-400">/{progress.cotaAlvo}</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold block ${
                      progress.isConcluida ? 'text-emerald-400' : 'text-blue-400'
                    }`}
                  >
                    {progress.percentual}%
                  </span>
                </div>
              </div>

              {/* Demographic Badges for Mobile */}
              <div className="mt-2.5 flex flex-wrap gap-1">
                {target.criterios.faixaEtaria && target.criterios.faixaEtaria !== 'Todas' && (
                  <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                    🎂 {target.criterios.faixaEtaria}
                  </span>
                )}
                {target.criterios.sexo && target.criterios.sexo !== 'Todos' && (
                  <span className="rounded bg-pink-500/10 px-2 py-0.5 text-[10px] font-medium text-pink-300">
                    ⚧ {target.criterios.sexo === 'F' ? 'Feminino' : target.criterios.sexo === 'M' ? 'Masculino' : target.criterios.sexo}
                  </span>
                )}
                {target.criterios.bairro && target.criterios.bairro !== 'Todos' && (
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    📍 {target.criterios.bairro}
                  </span>
                )}
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    progress.isConcluida ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, progress.percentual)}%` }}
                />
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">
                  {progress.isConcluida
                    ? 'Meta atingida no ciclo'
                    : `Restam ${progress.restante} coletas`}
                </span>
                {!progress.isConcluida && (
                  <button
                    type="button"
                    onClick={handleStartCollection}
                    className="flex items-center gap-1 font-bold text-blue-400 hover:text-blue-300"
                  >
                    <span>+ Iniciar Coleta</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredGoals.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-[#16171d] p-8 text-center">
              <Target className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-2 text-xs font-bold text-slate-400">
                Nenhuma cota nesta categoria.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar at Bottom of Mobile */}
      <div className="sticky bottom-0 z-20 bg-[#0d0e12]/95 border-t border-slate-800/80 p-3.5 backdrop-blur-md">
        <button
          type="button"
          onClick={handleStartCollection}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 active:scale-[0.98] transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Realizar Nova Entrevista de Campo</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Control Bar for Desktop / Tablet */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-800 bg-[#16171d] p-4 shadow-xl">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-blue-400" />
            Painel de Metas Mobile (Visualização de Campo)
          </h2>
          <p className="text-xs text-slate-400">
            Interface tátil otimizada para smartphones em campo, com feedback de cota em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de simulação para gestores */}
          {canSimulateOthers && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 hidden lg:inline">Pesquisador:</label>
              <select
                value={selectedResearcherId}
                onChange={(e) => setSelectedResearcherId(e.target.value)}
                className="rounded-xl border border-slate-800 bg-[#111218] px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                {collaborators
                  .filter((c) => c.ativo)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.cargo || 'Colaborador'})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Toggle Modo Moldura Celular / Tela Cheia */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-[#111218] p-1">
            <button
              type="button"
              onClick={() => setViewMode('frame')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === 'frame'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Moldura Celular</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('fullscreen')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === 'fullscreen'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Tela Cheia Fluida</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rendering Container */}
      {viewMode === 'frame' ? (
        <div className="flex justify-center items-center py-4">
          {/* Mockup do Smartphone */}
          <div className="relative w-full max-w-[390px] h-[780px] rounded-[48px] border-[8px] border-slate-800 bg-[#0d0e12] shadow-2xl ring-1 ring-slate-700/50 overflow-hidden flex flex-col">
            {/* Speaker / Camera Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 h-4 w-32 rounded-full bg-slate-900 border border-slate-800/80 flex items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-slate-800" />
            </div>

            {/* Mobile Screen Content */}
            <div className="pt-2 flex-1 flex flex-col overflow-hidden">
              {renderMobileContent()}
            </div>

            {/* Home Indicator bar */}
            <div className="bg-[#0d0e12] py-2 flex justify-center border-t border-slate-900">
              <div className="h-1 w-32 rounded-full bg-slate-700/80" />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-2xl mx-auto rounded-3xl border border-slate-800 shadow-2xl overflow-hidden min-h-[600px]">
          {renderMobileContent()}
        </div>
      )}
    </div>
  );
};
