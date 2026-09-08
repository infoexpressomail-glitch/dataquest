import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Survey,
  GlobalDemographicTarget,
  ResearcherQuotaAssignment,
  BaseMeta,
} from '../../types';
import {
  Library,
  Plus,
  Target,
  MapPin,
  GraduationCap,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Inbox,
} from 'lucide-react';

interface MetaCatalogPickerProps {
  survey: Survey;
  /** Pesquisadores já selecionados na pesquisa (etapa 5). */
  researcherIds: string[];
  onApplyMetas: (metas: GlobalDemographicTarget[]) => void;
}

/**
 * Seleção de metas base do catálogo ao montar uma pesquisa.
 * Permite escolher metas reutilizáveis do sistema base e configurar as cotas
 * por pesquisador, gerando os GlobalDemographicTarget da pesquisa.
 */
export const MetaCatalogPicker: React.FC<MetaCatalogPickerProps> = ({
  survey,
  researcherIds,
  onApplyMetas,
}) => {
  const { baseMetas, collaborators } = useApp();

  const currentMetas = survey.metasGlobais || [];

  // Mapa: metaBaseId -> pesquisadorId -> cota
  const [quotas, setQuotas] = useState<Record<string, Record<string, number>>>(() => {
    const map: Record<string, Record<string, number>> = {};
    currentMetas.forEach((m) => {
      const inner: Record<string, number> = {};
      m.atribuicoes.forEach((a) => {
        inner[a.pesquisadorId] = a.cotaAlvo;
      });
      map[m.id] = inner;
    });
    return map;
  });

  // Mapa: metaBaseId -> alvo global ajustado
  const [globalTargets, setGlobalTargets] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    currentMetas.forEach((m) => {
      map[m.id] = m.metaGlobalAlvo;
    });
    return map;
  });

  const selectedResearchers = collaborators.filter((c) => researcherIds.includes(c.id));

  const isApplied = (baseMetaId: string) => currentMetas.some((m) => m.baseMetaId === baseMetaId);

  const distributeEqually = (baseMetaId: string, alvo: number) => {
    if (selectedResearchers.length === 0) return;
    const count = selectedResearchers.length;
    const base = Math.floor(alvo / count);
    const remainder = alvo % count;
    const inner: Record<string, number> = {};
    selectedResearchers.forEach((r, idx) => {
      inner[r.id] = idx === 0 ? base + remainder : base;
    });
    setQuotas((prev) => ({ ...prev, [baseMetaId]: inner }));
  };

  const handleApply = (meta: BaseMeta) => {
    const alvo = globalTargets[meta.id] || meta.metaGlobalAlvo;
    const inner = quotas[meta.id] || {};
    const assignedEntries = Object.entries(inner).filter(([, q]) => Number(q) > 0);

    if (assignedEntries.length === 0) {
      // Distribui igualmente por padrão ao aplicar
      const count = selectedResearchers.length || 1;
      const base = Math.floor(alvo / count);
      const remainder = alvo % count;
      selectedResearchers.forEach((r, idx) => {
        inner[r.id] = idx === 0 ? base + remainder : base;
      });
    }

    const atribuicoes: ResearcherQuotaAssignment[] = Object.entries(inner)
      .filter(([, q]) => Number(q) > 0)
      .map(([resId, quota]) => {
        const res = collaborators.find((c) => c.id === resId);
        return {
          pesquisadorId: resId,
          pesquisadorNome: res?.nome || 'Pesquisador de Campo',
          perfilAcessoNome: res?.cargo || 'Pesquisador',
          cotaAlvo: Number(quota),
          cotaAtingida: 0,
          dataAtribuicao: new Date().toISOString(),
        };
      });

    const target: GlobalDemographicTarget = {
      id: `mg_${Date.now()}`,
      // Identificador do catálogo para permitir reutilização/edição
      baseMetaId: meta.id,
      pesquisaId: survey.id,
      titulo: meta.titulo,
      descricao: meta.descricao,
      criterios: { ...meta.criterios },
      metaGlobalAlvo: Math.max(alvo, atribuicoes.reduce((acc, a) => acc + a.cotaAlvo, 0)),
      metaGlobalAtingida: 0,
      status: 'ativa',
      ciclo: `Ciclo ${survey.cicloAtual} - ${new Date().getFullYear()}`,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      atribuicoes,
    };

    onApplyMetas([...currentMetas, target]);
  };

  const handleRemove = (metaId: string) => {
    onApplyMetas(currentMetas.filter((m) => m.id !== metaId));
  };

  const hasSelectedResearchers = selectedResearchers.length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-3.5 text-xs text-accent-primary-soft-text">
        <div className="flex items-center gap-2 font-bold text-accent-primary">
          <Library className="h-4 w-4" />
          <span>Metas Base do Catálogo (Sistema)</span>
        </div>
        <p className="mt-1 text-[11px]">
          Selecione metas reutilizáveis cadastradas no sistema base e configure as cotas por
          pesquisador. As metas aplicadas são gravadas nesta pesquisa.
        </p>
      </div>

      {baseMetas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ui bg-surface p-8 text-center">
          <Library className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-2 text-xs font-semibold text-muted">
            Nenhuma meta base cadastrada no sistema. Cadastre no módulo de Metas → Catálogo de Metas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {baseMetas.map((meta) => {
            const applied = isApplied(meta.id);
            const alvo = globalTargets[meta.id] || meta.metaGlobalAlvo;
            const metaQuotas = quotas[meta.id] || {};

            return (
              <div
                key={meta.id}
                className={`rounded-2xl border overflow-hidden transition-all ${
                  applied ? 'border-accent-success-soft-border bg-accent-success-soft/40' : 'border-ui bg-surface-card'
                }`}
              >
                <div className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                          applied
                            ? 'bg-accent-success-soft text-accent-success border-accent-success-soft-border'
                            : 'bg-accent-primary-soft text-accent-primary border-accent-primary-soft-border'
                        }`}
                      >
                        <Target className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-primary">{meta.titulo}</h4>
                          {applied && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent-success-soft border border-accent-success-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-success">
                              <CheckCircle2 className="h-3 w-3" /> Aplicada
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {meta.criterios.faixaEtaria && meta.criterios.faixaEtaria !== 'Todas' && (
                            <span className="inline-flex items-center gap-1 rounded bg-accent-purple-soft border border-accent-purple-soft-border px-2 py-0.5 text-[10px] font-medium text-accent-purple">
                              🎂 {meta.criterios.faixaEtaria}
                            </span>
                          )}
                          {meta.criterios.sexo && meta.criterios.sexo !== 'Todos' && (
                            <span className="inline-flex items-center gap-1 rounded bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 text-[10px] font-medium text-accent-danger">
                              ⚧{' '}
                              {meta.criterios.sexo === 'F'
                                ? 'Feminino'
                                : meta.criterios.sexo === 'M'
                                ? 'Masculino'
                                : meta.criterios.sexo}
                            </span>
                          )}
                          {meta.criterios.escolaridade && meta.criterios.escolaridade !== 'Todos' && (
                            <span className="inline-flex items-center gap-1 rounded bg-accent-info-soft border border-accent-info-soft-border px-2 py-0.5 text-[10px] font-medium text-accent-info">
                              <GraduationCap className="h-3 w-3" /> {meta.criterios.escolaridade}
                            </span>
                          )}
                          {meta.criterios.bairro && meta.criterios.bairro !== 'Todos' && (
                            <span className="inline-flex items-center gap-1 rounded bg-accent-success-soft border border-accent-success-soft-border px-2 py-0.5 text-[10px] font-medium text-accent-success">
                              <MapPin className="h-3 w-3" /> {meta.criterios.bairro}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!applied ? (
                      <button
                        type="button"
                        onClick={() => handleApply(meta)}
                        disabled={!hasSelectedResearchers}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-md shadow-emerald-900/40 hover:bg-accent-primary-solid-hover disabled:opacity-40 transition-colors shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Aplicar à Pesquisa
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemove(meta.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-accent-danger-soft-border bg-accent-danger-soft px-4 py-2 text-xs font-bold text-accent-danger hover:opacity-90 transition-colors shrink-0"
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  {/* Configuração de cotas quando aplicada */}
                  {applied && (
                    <div className="mt-4 border-t border-ui pt-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-primary">
                          <UserCheck className="h-4 w-4 text-accent-primary" />
                          Cotas por Pesquisador
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-muted">Alvo global:</label>
                          <input
                            type="number"
                            min={1}
                            value={alvo}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setGlobalTargets((prev) => ({ ...prev, [meta.id]: val }));
                              setQuotas((prev) => {
                                const inner = { ...(prev[meta.id] || {}) };
                                Object.keys(inner).forEach((rid) => {
                                  const ids = selectedResearchers.map((r) => r.id);
                                  if (ids.includes(rid)) {
                                    inner[rid] = Math.max(1, Math.floor(val / ids.length));
                                  }
                                });
                                return { ...prev, [meta.id]: inner };
                              });
                            }}
                            className="w-20 rounded-lg border border-ui bg-surface-card px-2 py-1 text-xs font-bold text-primary text-center focus:border-emerald-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => distributeEqually(meta.id, alvo)}
                            className="rounded-lg bg-accent-primary-soft border border-accent-primary-soft-border px-2.5 py-1 text-[11px] font-semibold text-accent-primary hover:bg-accent-primary-soft transition-colors"
                          >
                            Distribuir igualmente
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {selectedResearchers.length === 0 ? (
                          <p className="text-[11px] text-accent-warning flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Selecione pesquisadores na etapa seguinte (Etapa 5) para distribuir cotas.
                          </p>
                        ) : (
                          selectedResearchers.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between rounded-lg border border-ui/80 bg-surface p-2.5"
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-raised text-[10px] font-bold text-primary">
                                  {r.nome.charAt(0)}
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-primary">{r.nome}</span>
                                  <span className="block text-[10px] text-muted">
                                    {r.cargo || 'Pesquisador'} • Login: {r.login}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-muted">Cota:</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={metaQuotas[r.id] || 0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setQuotas((prev) => ({
                                      ...prev,
                                      [meta.id]: { ...(prev[meta.id] || {}), [r.id]: val },
                                    }));
                                  }}
                                  className="w-20 rounded-lg border border-ui bg-surface-card px-2 py-1 text-xs text-primary text-center focus:border-emerald-500 focus:outline-none"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Metas já aplicadas na pesquisa */}
      {currentMetas.length > 0 && (
        <div className="rounded-xl border border-ui bg-surface p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-2">
            <CheckCircle2 className="h-4 w-4 text-accent-success" />
            Metas aplicadas nesta pesquisa ({currentMetas.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {currentMetas.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 rounded-lg bg-accent-success-soft border border-accent-success-soft-border px-2.5 py-1 text-[11px] font-semibold text-accent-success"
              >
                <Target className="h-3 w-3" />
                {m.titulo}
                {m.atribuicoes.length > 0 && ` (${m.atribuicoes.length} pesquisador(es))`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
