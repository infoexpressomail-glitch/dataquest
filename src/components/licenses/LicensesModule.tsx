import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  KeyRound,
  Key,
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  Info,
  SearchX,
} from 'lucide-react';
import { Collaborator } from '../../types';

/**
 * Módulo de Licenças
 * ---------------------------------------------------------------
 * Modelo de negócio atual: UMA LICENÇA = UM COLABORADOR ATIVO.
 * Um colaborador cadastrado com `ativo === true` consome uma licença
 * (pode autenticar e acessar o sistema); `ativo === false` = licença
 * disponível/não utilizada (o login já bloqueia colaboradores inativos).
 *
 * Este módulo centraliza a gestão dessas licenças:
 *  - Resumo (total, em uso, disponíveis)
 *  - Lista dos colaboradores com o estado da sua licença
 *  - Disponibilizar (conceder) / Revogar (suspender) licença
 *  - Busca e filtro por perfil/estado
 */
export const LicensesModule: React.FC = () => {
  const {
    collaborators,
    profiles,
    toggleCollaboratorStatus,
    currentProfile,
    hasPermission,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'em_uso' | 'disponivel'>('todos');
  const [profileFilter, setProfileFilter] = useState<string>('todos');

  // Pode gerenciar licenças? (licença = colaborador ativo => mesmas permissões de gestão de colaboradores)
  const canManageLicenses =
    hasPermission('colaboradores_acesso') && hasPermission('colaboradores_editar');

  const totalLicenses = collaborators.length;
  const usedLicenses = collaborators.filter((c) => c.ativo).length;
  const availableLicenses = totalLicenses - usedLicenses;
  const usagePercent = totalLicenses > 0 ? Math.round((usedLicenses / totalLicenses) * 100) : 0;

  const profileName = (id: string) => profiles.find((p) => p.id === id)?.name || 'Perfil não definido';
  const profileBadge = (id: string) => {
    const p = profiles.find((p) => p.id === id);
    return p?.id === 'prof_pesq'
      ? 'bg-accent-success-soft text-accent-success border-accent-success-soft-border'
      : p?.id === 'prof_analista'
      ? 'bg-accent-purple-soft text-accent-purple border-accent-purple-soft-border'
      : p?.id === 'prof_coord'
      ? 'bg-accent-info-soft text-accent-info border-accent-info-soft-border'
      : 'bg-accent-primary-soft text-accent-primary border-accent-primary-soft-border';
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return collaborators.filter((c: Collaborator) => {
      if (statusFilter === 'em_uso' && !c.ativo) return false;
      if (statusFilter === 'disponivel' && c.ativo) return false;
      if (profileFilter !== 'todos' && c.perfilAcessoId !== profileFilter) return false;
      if (term) {
        const hay = `${c.nome} ${c.login} ${c.email}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [collaborators, searchTerm, statusFilter, profileFilter]);

  const toggleLicense = (c: Collaborator) => {
    if (!canManageLicenses) return;
    toggleCollaboratorStatus(c.id);
  };

  const hasAnyFilter =
    searchTerm.trim() !== '' || statusFilter !== 'todos' || profileFilter !== 'todos';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    setProfileFilter('todos');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden flex flex-col justify-between gap-4 rounded-2xl border border-ui bg-surface p-6 text-primary shadow-xl md:flex-row md:items-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary-soft rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-accent-primary-soft px-2.5 py-1 text-xs font-bold text-accent-primary border border-accent-primary-soft-border">
              <KeyRound className="h-3.5 w-3.5 mr-1.5" />
              Gestão de Acessos
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-primary">
            Licenças do Sistema
          </h1>
          <p className="mt-1 text-sm text-muted max-w-2xl leading-relaxed">
            Uma licença equivale a um colaborador ativo. Gerencie quais colaboradores possuem acesso liberado (licença em uso) e quais estão com licença disponível.
          </p>
        </div>

        {canManageLicenses && (
          <div className="relative z-10 flex items-center gap-2 rounded-xl bg-accent-success-soft border border-accent-success-soft-border px-3 py-2 text-xs font-semibold text-accent-success">
            <CheckCircle2 className="h-4 w-4" />
            <span>Você pode gerenciar licenças</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-ui bg-surface p-5 shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent-primary-soft rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Total de Licenças
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
              <Key className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-primary">{totalLicenses}</span>
            <span className="text-xs font-medium text-muted">colaboradores cadastrados</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-ui bg-surface p-5 shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent-success-soft rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Licenças em Uso
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-success-soft text-accent-success border border-accent-success-soft-border">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-primary">{usedLicenses}</span>
            <span className="text-xs font-semibold text-accent-success">{usagePercent}% do total</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
            <div className="h-full rounded-full bg-accent-success-solid shadow-sm" style={{ width: `${usagePercent}%` }} />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-ui bg-surface p-5 shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent-info-soft rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Licenças Disponíveis
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-info-soft text-accent-info border border-accent-info-soft-border">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-primary">{availableLicenses}</span>
            <span className="text-xs font-medium text-muted">sem acesso ativo</span>
          </div>
        </div>
      </div>

      {/* Toolbar: busca + filtros */}
      <div className="rounded-2xl border border-ui bg-surface p-4 shadow-xl space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, login ou e-mail..."
              className="w-full rounded-xl border border-ui bg-surface-card py-2.5 pl-10 pr-4 text-xs text-primary placeholder-muted focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-muted">
              <Filter className="h-3.5 w-3.5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="bg-transparent text-secondary focus:outline-none cursor-pointer"
              >
                <option value="todos">Status: Todos</option>
                <option value="em_uso">Em uso</option>
                <option value="disponivel">Disponíveis</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-muted">
              <select
                value={profileFilter}
                onChange={(e) => setProfileFilter(e.target.value)}
                className="bg-transparent text-secondary focus:outline-none cursor-pointer"
              >
                <option value="todos">Perfil: Todos</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {hasAnyFilter && (
              <button
                onClick={clearFilters}
                className="rounded-xl border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-accent-primary hover:bg-surface-hover transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted">
          <Info className="h-3.5 w-3.5" />
          <span>
            {filtered.length} de {totalLicenses} colaborador(es) listados.
          </span>
          {!canManageLicenses && (
            <span className="ml-auto text-[11px] font-medium text-muted">
              Seu perfil não possui permissão para alterar licenças.
            </span>
          )}
        </div>
      </div>

      {/* Lista de licenças */}
      <div className="rounded-2xl border border-ui bg-surface p-4 shadow-xl">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <SearchX className="h-10 w-10 text-muted mb-3" />
            <p className="text-sm font-semibold text-primary">Nenhum colaborador encontrado</p>
            <p className="text-xs text-muted mt-1">Ajuste a busca ou os filtros para ver mais resultados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => {
              const licensed = c.ativo;
              return (
                <div
                  key={c.id}
                  className="group flex flex-col gap-3 rounded-xl border border-ui/80 bg-surface-raised p-4 transition hover:border-ui sm:flex-row sm:items-center"
                >
                  {/* Identificação */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-bold shrink-0 ${
                      licensed
                        ? 'bg-accent-success-soft text-accent-success border-accent-success-soft-border'
                        : 'bg-surface text-muted border-ui'
                    }`}>
                      {c.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-primary truncate">{c.nome}</span>
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${profileBadge(c.perfilAcessoId)}`}>
                          {profileName(c.perfilAcessoId)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted font-mono truncate">
                        {c.login} • {c.email}
                      </div>
                    </div>
                  </div>

                  {/* Status da licença */}
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2 shrink-0">
                      {licensed ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-accent-success-soft border border-accent-success-soft-border px-3 py-1 text-[11px] font-bold text-accent-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-success-solid" />
                          Licença em uso
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 rounded-full bg-surface border border-ui px-3 py-1 text-[11px] font-bold text-muted">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                          Licença disponível
                        </span>
                      )}
                    </div>

                    {/* Ação */}
                    {canManageLicenses ? (
                      <button
                        onClick={() => toggleLicense(c)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold border transition-colors shrink-0 ${
                          licensed
                            ? 'bg-accent-danger-soft text-accent-danger border-accent-danger-soft-border hover:bg-accent-danger-soft'
                            : 'bg-accent-success-soft text-accent-success border-accent-success-soft-border hover:bg-accent-success-soft'
                        }`}
                      >
                        {licensed ? (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            Revogar licença
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            Disponibilizar
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted shrink-0">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Sem permissão
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aviso informativo */}
      <div className="rounded-2xl border border-ui bg-surface p-4 text-xs text-muted shadow-xl flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-accent-primary shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <b className="text-secondary">Como funciona:</b> revogar uma licença desativa o acesso do
          colaborador ao sistema (ele não conseguirá mais autenticar). Disponibilizar uma licença
          reativa o acesso. A contagem de licenças alimenta o card "Licenças e Dispositivos" no
          Painel Geral, que agora reflete os dados reais cadastrados.
        </p>
      </div>
    </div>
  );
};
