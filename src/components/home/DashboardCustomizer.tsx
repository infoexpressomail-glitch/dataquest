import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';

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
  /** Índice do item na ordem personalizada (menor = primeiro). */
  orderOf: (id: string) => number;
  onToggle: (id: string) => void;
  /** Move `fromId` para a posição de `toId`. */
  onMove: (fromId: string, toId: string, allIds: string[]) => void;
  onShowAll: () => void;
  onHideAll: (ids: string[]) => void;
  onResetOrder: () => void;
  onClose: () => void;
}

/**
 * Painel "Personalizar dashboard": lista TODOS os itens que compõem o painel,
 * agrupados por seção, com um interruptor Exibir / Ocultar e reordenação por
 * arrastar e soltar (com setas ↑/↓ como alternativa acessível para toque).
 * As escolhas são aplicadas na hora e salvas por usuário.
 */
export const DashboardCustomizer: React.FC<DashboardCustomizerProps> = ({
  sections,
  hidden,
  orderOf,
  onToggle,
  onMove,
  onShowAll,
  onHideAll,
  onResetOrder,
  onClose,
}) => {
  const allIds = sections.flatMap((s) => s.items.map((i) => i.id));
  const total = allIds.length;
  const visibleCount = allIds.filter((id) => !hidden.includes(id)).length;

  // Ordem efetiva exibida em cada seção (respeita a personalização).
  const orderedItems = (items: DashboardCatalogItem[]) =>
    [...items].sort((a, b) => orderOf(a.id) - orderOf(b.id));

  // ------------------------- Arrastar e soltar -------------------------
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    setDragOverId(null);
    e.dataTransfer.effectAllowed = 'move';
    // Necessário para o Firefox iniciar o arraste.
    try {
      e.dataTransfer.setData('text/plain', id);
    } catch {
      /* alguns navegadores bloqueiam setData em eventos sintéticos */
    }
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!draggingId || draggingId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggingId && draggingId !== id) onMove(draggingId, id, allIds);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

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
                Arraste os itens para reordenar e escolha o que exibir. Tudo é salvo para o seu usuário.
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onResetOrder}
              title="Voltar os itens para a ordem padrão"
              className="inline-flex items-center gap-1 rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-[11px] font-bold text-secondary transition hover:bg-surface-hover hover:text-primary"
            >
              <RotateCcw className="h-3 w-3" />
              Restaurar ordem
            </button>
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
          {sections.map((section) => {
            const items = orderedItems(section.items);
            return (
              <div key={section.title}>
                <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                  {section.title}
                </div>
                <div className="space-y-1.5">
                  {items.map((item, index) => {
                    const isVisible = !hidden.includes(item.id);
                    const isDragging = draggingId === item.id;
                    const isDragTarget =
                      dragOverId === item.id && draggingId !== null && draggingId !== item.id;
                    const canMoveUp = index > 0;
                    const canMoveDown = index < items.length - 1;
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragOver={(e) => handleDragOver(e, item.id)}
                        onDrop={(e) => handleDrop(e, item.id)}
                        onDragEnd={handleDragEnd}
                        aria-grabbed={isDragging}
                        className={`flex items-stretch gap-1 rounded-xl border p-1.5 transition ${
                          isDragTarget
                            ? 'border-accent-primary ring-2 ring-accent-primary/30'
                            : isVisible
                            ? 'border-accent-primary-soft-border bg-accent-primary-soft'
                            : 'border-ui bg-surface-card hover:bg-surface-raised'
                        } ${isDragging ? 'opacity-50' : ''}`}
                      >
                        {/* Alça de arraste */}
                        <span
                          className="flex w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted active:cursor-grabbing"
                          title="Arraste para reordenar"
                          aria-hidden="true"
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>

                        {/* Interruptor + rótulo (clique alterna Exibir/Ocultar) */}
                        <button
                          type="button"
                          onClick={() => onToggle(item.id)}
                          aria-pressed={isVisible}
                          className="flex flex-1 items-center gap-3 rounded-lg p-1.5 text-left transition hover:bg-surface-hover/60"
                        >
                          <span
                            className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${
                              isVisible
                                ? 'bg-accent-primary-solid justify-end'
                                : 'bg-surface-active justify-start'
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

                        {/* Setas de reordenação (alternativa ao arraste no toque) */}
                        <div className="flex w-7 shrink-0 flex-col items-center justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => canMoveUp && onMove(item.id, items[index - 1].id, allIds)}
                            disabled={!canMoveUp}
                            aria-label={`Mover ${item.label} para cima`}
                            className="rounded p-0.5 text-muted transition hover:bg-surface-hover hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              canMoveDown && onMove(item.id, items[index + 1].id, allIds)
                            }
                            disabled={!canMoveDown}
                            aria-label={`Mover ${item.label} para baixo`}
                            className="rounded p-0.5 text-muted transition hover:bg-surface-hover hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
