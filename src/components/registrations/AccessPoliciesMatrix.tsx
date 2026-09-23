import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { initialProfiles } from '../../mockData';
import { AccessProfile } from '../../types';
import {
  POLICY_MODULES,
  PolicyModuleDef,
  PermissionKey,
  applyLevelToPermissions,
  countActivePermissions,
  diffPermissions,
  getModuleLevelState,
} from './policiesMatrix';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  Undo2,
  Users,
  Info,
  RotateCcw,
  Ban,
  ChevronDown,
  X,
} from 'lucide-react';

interface AccessPoliciesMatrixProps {
  /** Volta para a visualização detalhada (lista de permissões por módulo). */
  onSwitchToDetailed: () => void;
}

type DraftMap = Record<string, AccessProfile>;

function cloneProfiles(list: AccessProfile[]): DraftMap {
  const map: DraftMap = {};
  list.forEach((p) => {
    map[p.id] = JSON.parse(JSON.stringify(p)) as AccessProfile;
  });
  return map;
}

/** Tom visual por nível — mantém a leitura "quanto mais escuro, mais poder". */
function levelTone(levelId: string): string {
  switch (levelId) {
    case 'total':
      return 'border-accent-success-soft-border bg-accent-success-soft text-accent-success';
    case 'manage':
      return 'border-accent-purple-soft-border bg-accent-purple-soft text-accent-purple';
    case 'operational':
    case 'import':
      return 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning';
    case 'expanded':
    case 'view':
      return 'border-accent-primary-soft-border bg-accent-primary-soft text-accent-primary';
    default:
      return 'border-ui bg-surface-raised text-muted';
  }
}

/**
 * Matriz perfil × módulo — substitui a "parede de interruptores" (132 no total)
 * por 9 linhas × 4 colunas. Cada célula resume um nível cumulativo; o detalhe
 * completo das 33 permissões continua disponível na visualização detalhada.
 *
 * Nenhuma regra de negócio nova: salvar aqui chama `updateProfile`, que já
 * grava a trilha de auditoria e a proteção do administrador.
 */
export const AccessPoliciesMatrix: React.FC<AccessPoliciesMatrixProps> = ({
  onSwitchToDetailed,
}) => {
  const { profiles, collaborators, currentProfile, updateProfile } = useApp();

  const [drafts, setDrafts] = useState<DraftMap>(() => cloneProfiles(profiles));
  const [openCell, setOpenCell] = useState<{ profileId: string; moduleId: string } | null>(null);
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(
    null
  );

  // Quando os perfis salvos mudam (ex.: primeira carga vinda do servidor),
  // reflete no rascunho desde que não haja alteração pendente.
  useEffect(() => {
    setDrafts((prev) => {
      const hasPending = profiles.some(
        (p) => prev[p.id] && diffPermissions(p.permissions, prev[p.id].permissions).length > 0
      );
      return hasPending ? prev : cloneProfiles(profiles);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles]);

  const peopleCount = useMemo(() => {
    const counts: Record<string, number> = {};
    profiles.forEach((p) => {
      counts[p.id] = collaborators.filter((c) => c.perfilAcessoId === p.id).length;
    });
    return counts;
  }, [profiles, collaborators]);

  const dirtyProfiles = useMemo(
    () =>
      profiles
        .filter((p) => drafts[p.id] && diffPermissions(p.permissions, drafts[p.id].permissions).length > 0)
        .map((p) => drafts[p.id]),
    [profiles, drafts]
  );

  const totalPending = dirtyProfiles.reduce(
    (acc, d) => acc + diffPermissions(
      profiles.find((p) => p.id === d.id)?.permissions || d.permissions,
      d.permissions
    ).length,
    0
  );

  const commitCell = (moduleDef: PolicyModuleDef, profileId: string, levelId: string) => {
    setFeedback(null);
    setDrafts((prev) => {
      const current = prev[profileId];
      if (!current) return prev;
      const nextPermissions = applyLevelToPermissions(moduleDef, levelId, current.permissions);
      return {
        ...prev,
        [profileId]: { ...current, permissions: nextPermissions },
      };
    });
    setOpenCell(null);
  };

  const restoreDefaultModel = (profileId: string) => {
    // F2 — os perfis agora vêm do Supabase (ids uuid). O "modelo padrão" de cada
    // perfil é resolvido pelo NOME (o conjunto canônico vive em initialProfiles),
    // preservando o id real do banco.
    const current = profiles.find((p) => p.id === profileId);
    const standard = initialProfiles.find((p) => p.name === current?.name);
    if (!standard) return;
    setFeedback(null);
    setDrafts((prev) => ({
      ...prev,
      [profileId]: { ...(JSON.parse(JSON.stringify(standard)) as AccessProfile), id: profileId },
    }));
    setOpenColumn(null);
  };

  const clearProfileModules = (profileId: string) => {
    setFeedback(null);
    setDrafts((prev) => {
      const current = prev[profileId];
      if (!current) return prev;
      let permissions = { ...current.permissions };
      POLICY_MODULES.forEach((m) => {
        permissions = applyLevelToPermissions(m, 'none', permissions);
      });
      return { ...prev, [profileId]: { ...current, permissions } };
    });
    setOpenColumn(null);
  };

  const handleDiscard = () => {
    setDrafts(cloneProfiles(profiles));
    setFeedback(null);
    setOpenCell(null);
    setOpenColumn(null);
  };

  const handleSave = () => {
    if (dirtyProfiles.length === 0) {
      setFeedback({ tone: 'info', text: 'Nenhuma alteração para salvar na matriz.' });
      return;
    }

    // Proteção: o administrador logado não pode remover, do próprio perfil,
    // o acesso a este módulo — ninguém mais conseguiria restaurá-lo.
    const ownDraft = currentProfile ? drafts[currentProfile.id] : null;
    if (ownDraft && currentProfile && !ownDraft.permissions.politicas_acesso) {
      setFeedback({
        tone: 'error',
        text: 'Não é possível remover "Políticas de acesso" (Total) do seu próprio perfil: você perderia o acesso a esta tela. Peça a outro administrador ou mantenha essa permissão.',
      });
      return;
    }

    let saved = 0;
    let changed = 0;
    dirtyProfiles.forEach((draft) => {
      const result = updateProfile(draft);
      if (result.changed) {
        saved += 1;
        changed += result.changes.length;
      }
    });

    if (saved === 0) {
      setFeedback({ tone: 'info', text: 'Nenhuma alteração efetiva para salvar.' });
      return;
    }

    setFeedback({
      tone: 'success',
      text: `${saved} perfil(is) salvo(s): ${changed} permissão(ões) alterada(s). As alterações são gravadas no servidor (fonte única) e ficam registradas no Histórico de Ações.`,
    });
    setOpenCell(null);
    setOpenColumn(null);
  };

  const isDirtyProfile = (profileId: string) => {
    const saved = profiles.find((p) => p.id === profileId);
    const draft = drafts[profileId];
    if (!saved || !draft) return false;
    return diffPermissions(saved.permissions, draft.permissions).length > 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
              Políticas de Acesso
            </h1>
            <span className="rounded-full border border-accent-primary-soft-border bg-accent-primary-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-primary">
              Matriz perfil × módulo
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted">
            Compare os perfis lado a lado. Cada célula é um nível cumulativo das permissões reais
            (Sem acesso → Ver → Operacional → Gestão → Total). Clique na célula para trocar o nível.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSwitchToDetailed}
            className="flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-surface-hover hover:text-primary"
          >
            <Info className="h-4 w-4" />
            <span>Ver lista detalhada (33 permissões)</span>
          </button>
          {dirtyProfiles.length > 0 && (
            <button
              type="button"
              onClick={handleDiscard}
              className="flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-surface-hover hover:text-primary"
            >
              <Undo2 className="h-4 w-4" />
              <span>Descartar</span>
            </button>
          )}
          <button
            id="btn-salvar-matriz"
            type="button"
            onClick={handleSave}
            disabled={dirtyProfiles.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-brand-900/40 transition hover:bg-accent-primary-solid-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            <Save className="h-4 w-4" />
            <span>
              {dirtyProfiles.length > 0
                ? `Salvar Matriz (${totalPending})`
                : 'Salvar Alterações de Política'}
            </span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-2 rounded-2xl border p-4 text-xs font-bold ${
            feedback.tone === 'success'
              ? 'border-accent-success-soft-border bg-accent-success-soft text-accent-success'
              : feedback.tone === 'error'
                ? 'border-accent-danger-soft-border bg-accent-danger-soft text-accent-danger'
                : 'border-ui bg-surface-raised text-secondary'
          }`}
        >
          {feedback.tone === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ui bg-surface p-3 text-[11px]">
        <span className="font-bold uppercase tracking-wider text-muted">Níveis:</span>
        {['Sem acesso', 'Ver', 'Operacional / Importar', 'Gestão', 'Total'].map((label, idx) => {
          const ids = ['none', 'view', 'operational', 'manage', 'total'];
          return (
            <span
              key={label}
              className={`rounded-md border px-2 py-0.5 font-bold ${levelTone(ids[idx])}`}
            >
              {label}
            </span>
          );
        })}
        <span className="ml-auto flex items-center gap-1 text-muted">
          <Info className="h-3.5 w-3.5" /> "+1" indica permissão fora do nível padrão.
        </span>
      </div>

      {/* Matriz */}
      <div className="overflow-x-auto rounded-2xl border border-ui bg-surface shadow-xl">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-ui bg-surface-card">
              <th className="sticky left-0 z-10 min-w-[180px] bg-surface-card px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted">
                Módulo
              </th>
              {profiles.map((p) => {
                const draft = drafts[p.id] || p;
                const count = countActivePermissions(draft.permissions);
                const people = peopleCount[p.id] || 0;
                const dirty = isDirtyProfile(p.id);
                return (
                  <th key={p.id} className="relative px-3 py-3 align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-primary">{p.name}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                          <Users className="h-3 w-3" />
                          {people} pessoa{people === 1 ? '' : 's'} · {count}/33
                        </div>
                        {dirty && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-accent-warning-soft-border bg-accent-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-accent-warning">
                            afeta {people} pessoa{people === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`Ações para o perfil ${p.name}`}
                        onClick={() => setOpenColumn((prev) => (prev === p.id ? null : p.id))}
                        className="rounded-lg border border-ui bg-surface-raised p-1 text-muted transition hover:text-primary"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {openColumn === p.id && (
                      <div className="absolute right-2 top-14 z-30 w-60 rounded-xl border border-ui bg-surface p-2 text-left shadow-2xl">
                        <button
                          type="button"
                          onClick={() => restoreDefaultModel(p.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-secondary transition hover:bg-surface-hover hover:text-primary"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restaurar modelo padrão
                        </button>
                        <button
                          type="button"
                          onClick={() => clearProfileModules(p.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-accent-danger transition hover:bg-surface-hover"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Remover acesso a todos os módulos
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenColumn(null)}
                          className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-ui px-2.5 py-1.5 text-[10px] font-semibold text-muted transition hover:text-primary"
                        >
                          <X className="h-3 w-3" /> Fechar
                        </button>
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {POLICY_MODULES.map((moduleDef) => (
              <tr key={moduleDef.id} className="border-b border-subtle last:border-b-0">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-surface px-4 py-3 align-top"
                >
                  <div className="text-xs font-bold text-primary">{moduleDef.label}</div>
                  <div className="mt-0.5 text-[10px] font-normal leading-snug text-muted">
                    {moduleDef.hint}
                  </div>
                </th>

                {profiles.map((p) => {
                  const draft = drafts[p.id];
                  if (!draft) {
                    return (
                      <td key={p.id} className="px-3 py-3">
                        <span className="text-[11px] text-muted">—</span>
                      </td>
                    );
                  }
                  const state = getModuleLevelState(moduleDef, draft.permissions);
                  const isOpen =
                    openCell?.profileId === p.id && openCell?.moduleId === moduleDef.id;

                  return (
                    <td key={p.id} className="relative px-3 py-3 align-top">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenCell((prev) =>
                            prev && prev.profileId === p.id && prev.moduleId === moduleDef.id
                              ? null
                              : { profileId: p.id, moduleId: moduleDef.id }
                          )
                        }
                        aria-expanded={isOpen}
                        className={`flex w-full items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition hover:brightness-105 ${levelTone(
                          state.levelId
                        )}`}
                      >
                        <span className="truncate">{state.levelLabel}</span>
                        <span className="flex items-center gap-1">
                          {state.extraKeys.length > 0 && (
                            <span className="rounded bg-surface/70 px-1 text-[10px] font-black">
                              +{state.extraKeys.length}
                            </span>
                          )}
                          <span className="text-[9px] opacity-70">
                            {state.activeCount}/{state.totalCount}
                          </span>
                        </span>
                      </button>

                      {isOpen && (
                        <div className="absolute left-2 top-12 z-40 w-64 rounded-xl border border-ui bg-surface p-2 shadow-2xl">
                          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                            {moduleDef.label} · {p.name.split(' ')[0]}
                          </div>
                          <button
                            type="button"
                            onClick={() => commitCell(moduleDef, p.id, 'none')}
                            className={`mb-1 flex w-full flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition ${
                              state.levelId === 'none'
                                ? 'border-accent-primary-soft-border bg-accent-primary-soft'
                                : 'border-ui hover:bg-surface-hover'
                            }`}
                          >
                            <span className="text-[11px] font-bold text-primary">Sem acesso</span>
                            <span className="text-[10px] text-muted">Nenhuma permissão do módulo.</span>
                          </button>
                          {moduleDef.levels.map((level) => (
                            <button
                              key={level.id}
                              type="button"
                              onClick={() => commitCell(moduleDef, p.id, level.id)}
                              className={`mb-1 flex w-full flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition ${
                                state.levelId === level.id
                                  ? 'border-accent-primary-soft-border bg-accent-primary-soft'
                                  : 'border-ui hover:bg-surface-hover'
                              }`}
                            >
                              <span className="text-[11px] font-bold text-primary">{level.label}</span>
                              <span className="text-[10px] text-muted">{level.description}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {state.extraKeys.length > 0 && (
                        <div className="mt-1 text-[10px] text-muted">
                          Extra: {state.extraKeys.map((k: PermissionKey) => k).join(', ')}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-ui bg-surface p-4 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-primary" />
          A matriz reproduz exatamente os 4 perfis padrão. Casos fora do padrão aparecem como "+N".
        </span>
        <button
          type="button"
          onClick={onSwitchToDetailed}
          className="self-start font-bold text-accent-primary hover:underline sm:self-auto"
        >
          Abrir lista detalhada das 33 permissões →
        </button>
      </div>

      {dirtyProfiles.length > 0 && (
        <div className="flex justify-end">
          <button
            id="btn-salvar-matriz-rodape"
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-accent-primary-solid px-6 py-2.5 text-xs font-bold text-on-accent shadow-lg shadow-brand-900/40 transition hover:bg-accent-primary-solid-hover active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>Salvar Matriz ({totalPending})</span>
          </button>
        </div>
      )}
    </div>
  );
};
