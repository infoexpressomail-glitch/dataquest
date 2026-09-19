import React from 'react';
import { Check, Eye, EyeOff, SlidersHorizontal, X } from 'lucide-react';

/** Item configurável do dashboard. */
export interface DashboardCatalogItem {
  id: string;
  label: string;
  description?: string;
}

/** Agrupamento de itens configuráveis (mesmos blocos visuais do dashboard). */
export interface DashboardCatalogSection {
  title: string;
  items: DashboardCatalogItem[];
}

interface DashboardCustomizerProps {
  sections: DashboardCatalogSection[];
  hidden: string[];
  onToggle: (id: string) => void;
  onShowAll: () => void;
  onHideAll: (ids: string[]) => void;
  onClose: () => void;
}

/**
 * Painel "Personalizar dashboard": lista TODOS os itens que compõem o painel,
 * agrupados por seção, com um interruptor Exibir / Ocultar para cada um.
 * A escolha é aplicada na hora e salva por usuário.
 */
export const DashboardCustomizer: React.FC<DashboardCustomizerProps> = ({
  sections,
  hidden,
  onToggle,
  onShowAll,
  onHideAll,
  onClose,
}) => {
  const allIds = sections.flatMap((s) => s.items.map((i) => i.id));
  const total = allIds.length;
  const visibleCount = allIds.filter((id) => !hidden.includes(id)).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay-modal p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-customizer-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-ui bg-surface shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 border-b border-ui p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
              <SlidersHorizontal className="h-5 w-5" />
            </span>
            <div>
              <h2 id="dashboard-customizer-title" className="text-sm font-bold text-primary">
                Personalizar dashboard
              </h2>
              <p className="text-xs text-muted">
                Escolha o que exibir. As alterações são salvas para o seu usuário.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-raised hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Resumo + ações rápidas */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ui bg-surface-card px-5 py-3">
          <span className="text-[11px] font-semibold text-muted">
            <strong className="text-primary">{visibleCount}</strong> de {total} item(ns) visível(is)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShowAll}
              className="rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-[11px] font-bold text-secondary transition hover:bg-surface-hover hover:text-primary"
            >
              Exibir todos
            </button>
            <button
              type="button"
              onClick={() => onHideAll(allIds)}
              className="rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-[11px] font-bold text-secondary transition hover:bg-surface-hover hover:text-primary"
            >
              Ocultar todos
            </button>
          </div>
        </div>

        {/* Lista de itens */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                {section.title}
              </div>
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const isVisible = !hidden.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onToggle(item.id)}
                      aria-pressed={isVisible}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        isVisible
                          ? 'border-accent-primary-soft-border bg-accent-primary-soft'
                          : 'border-ui bg-surface-card hover:bg-surface-raised'
                      }`}
                    >
                      {/* Interruptor */}
                      <span
                        className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${
                          isVisible ? 'bg-accent-primary-solid justify-end' : 'bg-surface-active justify-start'
                        }`}
                        aria-hidden="true"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-accent-primary shadow-sm">
                          {isVisible && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                        </span>
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-primary">
                          {item.label}
                        </span>
                        {item.description && (
                          <span className="mt-0.5 block truncate text-[10px] text-muted">
                            {item.description}
                          </span>
                        )}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          isVisible
                            ? 'bg-accent-success-soft text-accent-success border border-accent-success-soft-border'
                            : 'bg-surface-raised text-muted border border-ui'
                        }`}
                      >
                        {isVisible ? (
                          <>
                            <Eye className="h-3 w-3" /> Exibindo
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" /> Oculto
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="border-t border-ui p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-accent-primary-solid py-2.5 text-xs font-bold text-on-accent shadow-lg shadow-brand-900/40 transition hover:bg-accent-primary-solid-hover"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
