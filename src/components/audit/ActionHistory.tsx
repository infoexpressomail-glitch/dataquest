import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  History,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  User,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  MessageSquare,
  Hash,
  Copy,
  Check,
  ChevronDown,
  Info,
  Layers,
  ArrowLeft,
  Eye,
  X,
  Lock,
} from 'lucide-react';
import { ActionAuditLog, ActionCategory, ActionType } from '../../types';
import {
  getActionTypeMeta,
  exportAuditLogsToCSV,
  exportAuditLogsToJSON,
} from '../../utils/auditUtils';

export const ActionHistory: React.FC = () => {
  const { auditLogs, surveys, collaborators, setActiveModule } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTargetType, setSelectedTargetType] = useState<string>('all');
  const [selectedUserLogin, setSelectedUserLogin] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all'); // all, 24h, 7d, 30d
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [inspectingLog, setInspectingLog] = useState<ActionAuditLog | null>(null);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Category filter
      if (selectedCategory !== 'all' && log.categoria !== selectedCategory) {
        return false;
      }

      // Target type filter
      if (selectedTargetType !== 'all' && log.alvo.tipo !== selectedTargetType) {
        return false;
      }

      // User filter
      if (selectedUserLogin !== 'all' && log.autor.login !== selectedUserLogin) {
        return false;
      }

      // Time filter
      if (timeFilter !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        const now = Date.now();
        const diffHours = (now - logTime) / (1000 * 60 * 60);

        if (timeFilter === '24h' && diffHours > 24) return false;
        if (timeFilter === '7d' && diffHours > 24 * 7) return false;
        if (timeFilter === '30d' && diffHours > 24 * 30) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesAuthor =
          log.autor.nome.toLowerCase().includes(term) ||
          log.autor.login.toLowerCase().includes(term) ||
          log.autor.perfil.toLowerCase().includes(term);
        const matchesTarget =
          log.alvo.identificador.toLowerCase().includes(term) ||
          (log.alvo.nome && log.alvo.nome.toLowerCase().includes(term));
        const matchesDescription = log.descricaoDetalhada.toLowerCase().includes(term);
        const matchesTitle = log.tituloAcao.toLowerCase().includes(term);
        const matchesReason =
          log.motivoConformidade && log.motivoConformidade.toLowerCase().includes(term);
        const matchesChanges = log.alteracoes?.some(
          (a) =>
            a.campo.toLowerCase().includes(term) ||
            String(a.valorAnterior || '').toLowerCase().includes(term) ||
            String(a.valorNovo || '').toLowerCase().includes(term)
        );

        if (
          !matchesAuthor &&
          !matchesTarget &&
          !matchesDescription &&
          !matchesTitle &&
          !matchesReason &&
          !matchesChanges
        ) {
          return false;
        }
      }

      return true;
    });
  }, [auditLogs, selectedCategory, selectedTargetType, selectedUserLogin, timeFilter, searchTerm]);

  // Statistics
  const totalLogs = auditLogs.length;
  const surveyLogsCount = auditLogs.filter((l) => l.categoria === 'PESQUISA').length;
  const responseLogsCount = auditLogs.filter((l) => l.categoria === 'RESPOSTA').length;
  const uniqueAuthorsCount = new Set(auditLogs.map((l) => l.autor.login)).size;

  const handleCopyHash = (id: string, hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2500);
  };

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return {
        dateStr: date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        timeStr: date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };
    } catch {
      return { dateStr: isoString, timeStr: '' };
    }
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'agora mesmo';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `há ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `há ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'ontem';
      return `há ${diffDays} dias`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header with Compliance Badges */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Lock className="w-3 h-3" />
              Auditoria de Conformidade
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              LGPD Art. 16 / ISO 27001
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center gap-2.5">
            <History className="h-6 w-6 text-blue-400" />
            <span>Histórico de Ações & Trilha de Auditoria</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Registro detalhado e rastreável de todas as edições feitas em pesquisas ou respostas. Exibe{' '}
            <strong className="text-slate-200">quem</strong> realizou a alteração,{' '}
            <strong className="text-slate-200">o que</strong> foi modificado (com comparativo antes x depois) e{' '}
            <strong className="text-slate-200">quando</strong> ocorreu, garantindo conformidade regulatória.
          </p>
        </div>

        {/* Quick Actions / Exports */}
        <div className="flex items-center gap-2">
          <button
            id="btn-export-audit-csv"
            onClick={() => exportAuditLogsToCSV(filteredLogs)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors shadow-sm"
            title="Exportar registros filtrados para planilha CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>
          <button
            id="btn-export-audit-json"
            onClick={() => exportAuditLogsToJSON(filteredLogs)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors shadow-sm"
            title="Exportar pacote digital JSON com hashes de integridade"
          >
            <FileCode className="h-4 w-4 text-cyan-400" />
            <span>Exportar JSON</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Eventos */}
        <div className="bg-[#16171d] p-4 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total de Ações
            </p>
            <p className="text-2xl font-bold text-white mt-1">{totalLogs}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Trilha ativa com integridade</p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400">
            <History className="h-5 w-5" />
          </div>
        </div>

        {/* Edições em Respostas */}
        <div className="bg-[#16171d] p-4 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Edições em Respostas
            </p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{responseLogsCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Retificações com justificativa</p>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <MessageSquare className="h-5 w-5" />
          </div>
        </div>

        {/* Edições em Pesquisas */}
        <div className="bg-[#16171d] p-4 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Edições em Pesquisas
            </p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{surveyLogsCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Configurações & questionários</p>
          </div>
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <FileQuestion className="h-5 w-5" />
          </div>
        </div>

        {/* Operadores Auditados */}
        <div className="bg-[#16171d] p-4 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Operadores Auditados
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{uniqueAuthorsCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Identificação nominal 100%</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <User className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#16171d] p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              id="input-search-audit"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por operador, código de pesquisa, justificativa de compliance ou campo alterado..."
              className="w-full pl-9 pr-8 py-2 bg-[#0a0b10] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Tabs */}
          <div className="flex items-center gap-1 bg-[#0a0b10] p-1 rounded-lg border border-slate-800/80 overflow-x-auto text-xs shrink-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({auditLogs.length})
            </button>
            <button
              onClick={() => setSelectedCategory('RESPOSTA')}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'RESPOSTA'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Respostas ({responseLogsCount})
            </button>
            <button
              onClick={() => setSelectedCategory('PESQUISA')}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'PESQUISA'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pesquisas ({surveyLogsCount})
            </button>
          </div>
        </div>

        {/* Secondary filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/60 text-xs">
          {/* Filter by Operator */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Quem:</span>
            <select
              id="select-filter-operator"
              value={selectedUserLogin}
              onChange={(e) => setSelectedUserLogin(e.target.value)}
              className="w-full bg-[#0a0b10] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos os Operadores ({collaborators.length})</option>
              {collaborators.map((c) => (
                <option key={c.id} value={c.login}>
                  {c.nome} (@{c.login})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Target Type */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Alvo:</span>
            <select
              id="select-filter-target"
              value={selectedTargetType}
              onChange={(e) => setSelectedTargetType(e.target.value)}
              className="w-full bg-[#0a0b10] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Qualquer Tipo de Alvo</option>
              <option value="resposta">Somente Respostas / Coletas</option>
              <option value="pesquisa">Somente Instrumentos de Pesquisa</option>
            </select>
          </div>

          {/* Filter by Period */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Período:</span>
            <select
              id="select-filter-time"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full bg-[#0a0b10] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todo o Histórico</option>
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300">
            Exibindo {filteredLogs.length} registro(s) de conformidade
          </span>
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Integridade Criptográfica SHA-256 ativa
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="bg-[#16171d] rounded-xl border border-slate-800 p-12 text-center text-slate-400">
            <History className="h-10 w-10 mx-auto text-slate-600 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">Nenhum registro encontrado</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Nenhuma ação de edição atende aos filtros selecionados. Tente ajustar os termos de busca ou selecionar &quot;Todo o Histórico&quot;.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const meta = getActionTypeMeta(log.tipoAcao);
            const { dateStr, timeStr } = formatDateTime(log.timestamp);
            const relativeTime = getRelativeTime(log.timestamp);

            return (
              <div
                key={log.id}
                id={`audit-card-${log.id}`}
                className="bg-[#16171d] rounded-xl border border-slate-800 p-4 sm:p-5 hover:border-slate-700/80 transition-all shadow-sm space-y-4"
              >
                {/* Card Top: Badges, Target, and Timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Action Type Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                    >
                      {meta.label}
                    </span>

                    {/* Target identifier tag */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-900 text-slate-300 border border-slate-700/80">
                      {log.alvo.tipo === 'pesquisa' ? (
                        <FileQuestion className="h-3 w-3 text-cyan-400" />
                      ) : (
                        <MessageSquare className="h-3 w-3 text-purple-400" />
                      )}
                      <span>{log.alvo.identificador}</span>
                    </span>

                    {/* Target survey name if present */}
                    {log.alvo.nome && (
                      <span className="text-xs text-slate-400 font-medium truncate max-w-xs sm:max-w-md">
                        • {log.alvo.nome}
                      </span>
                    )}
                  </div>

                  {/* QUANDO (When) Header info */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-semibold text-slate-300">
                      {dateStr} às {timeStr}
                    </span>
                    <span className="text-[11px] text-slate-500 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 font-mono">
                      {relativeTime}
                    </span>
                  </div>
                </div>

                {/* Card Main: QUEM (Who) + O QUÊ (What) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* QUEM (Who) Column - 4 cols */}
                  <div className="lg:col-span-4 bg-[#111218] p-3 rounded-lg border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <User className="h-3 w-3 text-blue-400" />
                        Quem Alterou
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        IP: {log.autor.ip || '127.0.0.1'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0">
                        {log.autor.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="overflow-hidden min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{log.autor.nome}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          Login: <span className="font-mono text-slate-300">@{log.autor.login}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Perfil:</span>
                      <span className="font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-[10px] border border-blue-500/20">
                        {log.autor.perfil}
                      </span>
                    </div>
                  </div>

                  {/* O QUÊ (What) Column - 8 cols */}
                  <div className="lg:col-span-8 space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{log.tituloAcao}</span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {log.descricaoDetalhada}
                      </p>
                    </div>

                    {/* Diff Table / Field Changes (Antes x Depois) */}
                    {log.alteracoes && log.alteracoes.length > 0 && (
                      <div className="bg-[#0e0f14] rounded-lg border border-slate-800/90 overflow-hidden text-xs">
                        <div className="bg-slate-900/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                          <span>Modificações Realizadas (Antes x Depois)</span>
                          <span className="text-slate-500">{log.alteracoes.length} item(ns)</span>
                        </div>

                        <div className="divide-y divide-slate-800/60">
                          {log.alteracoes.map((alt, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-2 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                            >
                              <div className="sm:col-span-4 font-semibold text-slate-300 truncate">
                                {alt.rotulo || alt.campo}
                              </div>

                              <div className="sm:col-span-8 flex items-center gap-2 flex-wrap">
                                {alt.valorAnterior !== undefined && (
                                  <span
                                    className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px] line-through max-w-xs truncate"
                                    title={`Valor anterior: ${String(alt.valorAnterior)}`}
                                  >
                                    {String(alt.valorAnterior || '(vazio)')}
                                  </span>
                                )}

                                {alt.valorAnterior !== undefined && (
                                  <ArrowRight className="h-3 w-3 text-slate-500 shrink-0" />
                                )}

                                <span
                                  className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold max-w-xs truncate"
                                  title={`Novo valor: ${String(alt.valorNovo)}`}
                                >
                                  {String(alt.valorNovo || '(vazio)')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Motivo de Conformidade / Compliance Justification */}
                    {log.motivoConformidade && (
                      <div className="bg-amber-950/15 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-200/90 flex items-start gap-2">
                        <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-300">
                            Justificativa de Conformidade Legal:
                          </span>{' '}
                          <span className="text-amber-100/80">{log.motivoConformidade}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Hash de Integridade & Compliance Signature */}
                <div className="pt-2.5 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2 overflow-hidden min-w-0">
                    <span className="font-mono text-slate-500 flex items-center gap-1 shrink-0">
                      <Hash className="h-3 w-3 text-slate-400" />
                      SHA-256:
                    </span>
                    <span
                      className="font-mono text-[10px] text-slate-400 truncate max-w-xs sm:max-w-md select-all"
                      title={log.hashIntegridade}
                    >
                      {log.hashIntegridade}
                    </span>
                    <button
                      onClick={() => handleCopyHash(log.id, log.hashIntegridade)}
                      className="p-1 hover:text-white text-slate-400 transition-colors shrink-0"
                      title="Copiar Hash SHA-256"
                    >
                      {copiedHashId === log.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Assinatura Válida
                    </span>
                    <button
                      onClick={() => setInspectingLog(log)}
                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold text-[11px] transition-colors"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Inspecionar Pacote</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Inspection of Audit Packet */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-[#16171d] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#111218]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Pacote Criptográfico de Auditoria
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Identificador de Evento: #{inspectingLog.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingLog(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-semibold">Timestamp UTC:</span>
                  <span className="font-mono text-slate-200">{inspectingLog.timestamp}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-semibold">Responsável:</span>
                  <span className="text-slate-200">
                    {inspectingLog.autor.nome} ({inspectingLog.autor.login} - {inspectingLog.autor.perfil})
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-semibold">Tipo de Ação:</span>
                  <span className="font-mono text-blue-400">{inspectingLog.tipoAcao}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-semibold">Alvo Auditado:</span>
                  <span className="text-slate-200">
                    {inspectingLog.alvo.identificador} ({inspectingLog.alvo.nome || inspectingLog.alvo.tipo})
                  </span>
                </div>
                <div className="flex flex-col gap-1 pt-1 border-t border-slate-800 text-slate-400">
                  <span className="font-semibold">Hash SHA-256 de Não-Repúdio:</span>
                  <span className="font-mono text-[11px] text-emerald-400 break-all select-all bg-black/40 p-1.5 rounded">
                    {inspectingLog.hashIntegridade}
                  </span>
                </div>
              </div>

              {inspectingLog.motivoConformidade && (
                <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 text-amber-200">
                  <p className="font-bold text-xs text-amber-300 mb-1">
                    Justificativa de Conformidade Registrada:
                  </p>
                  <p className="text-xs text-amber-100/90 leading-relaxed">
                    {inspectingLog.motivoConformidade}
                  </p>
                </div>
              )}

              <div>
                <p className="font-bold text-xs text-slate-300 mb-1.5">
                  Payload Bruto (JSON para Auditoria Externa):
                </p>
                <pre className="bg-[#0a0b10] border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48 leading-relaxed">
                  {JSON.stringify(inspectingLog, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#111218] flex items-center justify-between">
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Em conformidade com Marco Civil & LGPD
              </span>
              <button
                onClick={() => setInspectingLog(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
