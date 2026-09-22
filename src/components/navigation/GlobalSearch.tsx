import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getTranslation } from '../../i18n';
import {
  Search,
  LayoutGrid,
  Users,
  Zap,
  FileQuestion,
  PlusCircle,
  ShieldCheck,
  History,
  Smartphone,
  ArrowRight,
} from 'lucide-react';
import { buildNavAreas, flattenAreas, type IconType } from './navAreas';

type ResultGroup = 'telas' | 'pesquisas' | 'pessoas' | 'acoes';

interface SearchResult {
  id: string;
  group: ResultGroup;
  label: string;
  hint?: string;
  icon: IconType;
  run: () => void;
}

const GROUP_LABEL: Record<ResultGroup, string> = {
  telas: 'Telas',
  pesquisas: 'Pesquisas',
  pessoas: 'Pessoas',
  acoes: 'Ações rápidas',
};

const GROUP_ORDER: ResultGroup[] = ['telas', 'pesquisas', 'pessoas', 'acoes'];

/**
 * Busca global (Ctrl K) — Opção A.
 *
 * Acha pesquisa, pessoa ou ação em um passo, sem depender de qual tela o
 * usuário está. Funciona com qualquer perfil, respeitando as permissões.
 */
export const GlobalSearch: React.FC = () => {
  const {
    language,
    setActiveModule,
    setEditingSurvey,
    setFilterSurveyId,
    hasPermission,
    currentProfile,
    collaborators,
    surveys,
    auditLogs,
  } = useApp();

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  const isAnalyst =
    !isResearcher &&
    (currentProfile?.id === 'prof_analista' ||
      (!hasPermission('colaboradores_acesso') &&
        !hasPermission('politicas_acesso') &&
        hasPermission('analise_acesso')));

  const areas = useMemo(
    () => buildNavAreas({ hasPermission, t, isResearcher, isAnalyst, auditCount: auditLogs.length }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, isResearcher, isAnalyst, auditLogs.length, currentProfile?.id],
  );

  const openSearch = useCallback(() => {
    setQuery('');
    setSel(0);
    setOpen(true);
    // Foca depois de o overlay montar.
    setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  const closeSearch = useCallback(() => setOpen(false), []);

  // Atalho global Ctrl/Cmd + K e gatilho por evento (btn do header/sidebar).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open ? closeSearch() : openSearch();
      } else if (e.key === 'Escape' && open) {
        closeSearch();
      }
    };
    const onOpenEvent = () => openSearch();
    window.addEventListener('keydown', onKey);
    window.addEventListener('dq:open-search', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('dq:open-search', onOpenEvent);
    };
  }, [open, openSearch, closeSearch]);

  const go = (module: string) => {
    setActiveModule(module);
    closeSearch();
  };

  const results: SearchResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (s: string) => !q || s.toLowerCase().includes(q);
    const out: SearchResult[] = [];

    // Telas / módulos
    flattenAreas(areas).forEach((item) => {
      if (!match(item.label) && !match(item.hint || '') && !match(item.area)) return;
      out.push({
        id: `nav-${item.id}`,
        group: 'telas',
        label: item.label,
        hint: item.hint || item.area,
        icon: item.icon,
        run: () => go(item.module),
      });
    });

    // Pesquisas (com filtro em um passo na tela de Pesquisas)
    if (hasPermission('pesquisa_acesso')) {
      surveys
        .filter((s) => s.status !== 'excluida')
        .filter((s) => match(s.nome) || match(s.codigo))
        .slice(0, 6)
        .forEach((s) => {
          out.push({
            id: `survey-${s.id}`,
            group: 'pesquisas',
            label: s.nome,
            hint: `Código ${s.codigo} · ${s.status}`,
            icon: FileQuestion,
            run: () => {
              setFilterSurveyId(s.id);
              go('pesquisas');
            },
          });
        });
    }

    // Pessoas (colaboradores)
    if (hasPermission('colaboradores_acesso')) {
      collaborators
        .filter((c) => match(c.nome) || match(c.login))
        .slice(0, 6)
        .forEach((c) => {
          out.push({
            id: `colab-${c.id}`,
            group: 'pessoas',
            label: c.nome,
            hint: `login: ${c.login}`,
            icon: Users,
            run: () => go('colaboradores'),
          });
        });
    }

    // Ações rápidas
    if (hasPermission('pesquisa_criar')) {
      out.push({
        id: 'action-new-survey',
        group: 'acoes',
        label: 'Nova pesquisa',
        hint: 'Abrir o assistente de criação',
        icon: PlusCircle,
        run: () => {
          setEditingSurvey(null);
          go('wizard');
        },
      });
    }
    out.push({
      id: 'action-simulator',
      group: 'acoes',
      label: 'Abrir simulador de coleta',
      hint: 'Testar o formulário',
      icon: Smartphone,
      run: () => go('simulador'),
    });
    if (hasPermission('politicas_acesso')) {
      out.push({
        id: 'action-politicas',
        group: 'acoes',
        label: 'Políticas de acesso',
        hint: 'Permissões por perfil',
        icon: ShieldCheck,
        run: () => go('politicas_acesso'),
      });
    }
    out.push({
      id: 'action-historico',
      group: 'acoes',
      label: 'Histórico de ações',
      hint: 'Trilha de auditoria',
      icon: History,
      run: () => go('historico_acoes'),
    });

    return out.filter((r) => match(r.label) || match(r.hint || ''));
  }, [query, areas, surveys, collaborators, hasPermission, setFilterSurveyId, setEditingSurvey]);

  // Mantém a seleção dentro dos limites ao filtrar.
  useEffect(() => {
    setSel((s) => Math.min(s, Math.max(results.length - 1, 0)));
  }, [results.length]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      results[sel]?.run();
    }
  };

  if (!open) return null;

  const grouped = GROUP_ORDER.map((g) => ({ g, items: results.filter((r) => r.group === g) })).filter(
    (x) => x.items.length > 0,
  );

  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-overlay-modal px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeSearch();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Busca global"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-ui bg-surface shadow-2xl">
        <div className="flex items-center gap-2.5 border-b border-ui px-4 py-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            ref={inputRef}
            id="global-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar pesquisa, pessoa ou ação…"
            className="flex-1 bg-transparent text-sm text-primary placeholder:text-muted outline-none"
          />
          <button
            type="button"
            onClick={closeSearch}
            className="rounded border border-ui bg-surface-raised px-1.5 py-0.5 text-[10px] font-bold text-muted hover:text-primary"
          >
            Esc
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {grouped.length === 0 && (
            <p className="px-3 py-10 text-center text-xs text-muted">
              Nada encontrado para “{query}”.
            </p>
          )}

          {grouped.map(({ g, items }) => (
            <div key={g} className="mb-1">
              <div className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                {g === 'telas' && <LayoutGrid className="h-3 w-3" />}
                {g === 'pesquisas' && <FileQuestion className="h-3 w-3" />}
                {g === 'pessoas' && <Users className="h-3 w-3" />}
                {g === 'acoes' && <Zap className="h-3 w-3" />}
                {GROUP_LABEL[g]}
              </div>
              {items.map((r) => {
                runningIndex += 1;
                const index = runningIndex;
                const active = index === sel;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onMouseEnter={() => setSel(index)}
                    onClick={r.run}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      active ? 'bg-accent-primary-soft' : 'hover:bg-surface-raised'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                        active
                          ? 'border-accent-primary-soft-border bg-surface text-accent-primary'
                          : 'border-ui bg-surface-raised text-muted'
                      }`}
                    >
                      <r.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-xs font-semibold ${active ? 'text-accent-primary' : 'text-primary'}`}>
                        {r.label}
                      </span>
                      {r.hint && <span className="block truncate text-[10px] text-muted">{r.hint}</span>}
                    </span>
                    {active && <ArrowRight className="h-3.5 w-3.5 text-accent-primary" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-ui px-4 py-2 text-[10px] text-muted">
          <span>↑↓ navegar</span>
          <span>Enter abrir</span>
          <span>Esc fechar</span>
          <span className="ml-auto font-bold">Ctrl K</span>
        </div>
      </div>
    </div>
  );
};
