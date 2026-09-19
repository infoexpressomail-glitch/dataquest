import { useCallback, useEffect, useState } from 'react';

/**
 * Preferências de personalização do dashboard.
 *
 * Guarda, por usuário, duas listas independentes:
 *  - `hidden`: IDs de itens OCULTOS. Tudo o que não estiver nessa lista aparece.
 *  - `order`:  IDs na ordem desejada pelo usuário (arrastar e soltar).
 *
 * A persistência é local (localStorage), então as escolhas sobrevivem a
 * recarregamentos sem tocar em banco/API/regras de negócio.
 */

const HIDDEN_PREFIX = 'dataquest.dashboard.hidden';
const ORDER_PREFIX = 'dataquest.dashboard.order';

function readStringArray(storageKey: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export interface DashboardPreferences {
  /** IDs atualmente ocultos. */
  hidden: string[];
  /** IDs na ordem personalizada (pode estar vazia antes da primeira troca). */
  order: string[];
  /** Retorna true se o item deve ser exibido. */
  isVisible: (id: string) => boolean;
  /** Alterna exibição/ocultação de um item. */
  toggle: (id: string) => void;
  /** Exibe todos os itens. */
  showAll: () => void;
  /** Oculta todos os itens informados. */
  hideAll: (ids: string[]) => void;
  /**
   * Move `fromId` para a posição de `toId` (fica logo antes dele).
   * `allIds` é o catálogo completo, usado para semear a ordem na primeira troca.
   */
  move: (fromId: string, toId: string, allIds: string[]) => void;
  /** Restaura a ordem padrão do catálogo. */
  resetOrder: () => void;
}

export function useDashboardPreferences(userId: string): DashboardPreferences {
  const hiddenKey = `${HIDDEN_PREFIX}.${userId || 'anonimo'}`;
  const orderKey = `${ORDER_PREFIX}.${userId || 'anonimo'}`;

  const [hidden, setHidden] = useState<string[]>(() => readStringArray(hiddenKey));
  const [order, setOrder] = useState<string[]>(() => readStringArray(orderKey));

  // Troca de usuário (ex.: "Alternar Usuário para Testes") recarrega a
  // preferência correta daquele perfil.
  useEffect(() => {
    setHidden(readStringArray(hiddenKey));
    setOrder(readStringArray(orderKey));
  }, [hiddenKey, orderKey]);

  const persistHidden = useCallback(
    (next: string[]) => {
      setHidden(next);
      try {
        window.localStorage.setItem(hiddenKey, JSON.stringify(next));
      } catch {
        // Sem localStorage disponível: mantém apenas em memória.
      }
    },
    [hiddenKey]
  );

  const persistOrder = useCallback(
    (next: string[]) => {
      setOrder(next);
      try {
        window.localStorage.setItem(orderKey, JSON.stringify(next));
      } catch {
        // Sem localStorage disponível: mantém apenas em memória.
      }
    },
    [orderKey]
  );

  const isVisible = useCallback((id: string) => !hidden.includes(id), [hidden]);

  const toggle = useCallback(
    (id: string) => {
      persistHidden(hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id]);
    },
    [hidden, persistHidden]
  );

  const showAll = useCallback(() => persistHidden([]), [persistHidden]);

  const hideAll = useCallback(
    (ids: string[]) => persistHidden(Array.from(new Set(ids))),
    [persistHidden]
  );

  const move = useCallback(
    (fromId: string, toId: string, allIds: string[]) => {
      const allowed = new Set(allIds);
      const base = order.filter((id) => allowed.has(id));
      // Semeia os itens que ainda não estavam na ordem salva, preservando a
      // ordem do catálogo para não "embaralhar" o que o usuário não tocou.
      for (const id of allIds) {
        if (!base.includes(id)) base.push(id);
      }
      const from = base.indexOf(fromId);
      const to = base.indexOf(toId);
      if (from < 0 || to < 0 || from === to) return;
      base.splice(from, 1);
      // Reinsere logo antes do alvo (comportamento previsível de "soltar sobre").
      const target = base.indexOf(toId);
      base.splice(target, 0, fromId);
      persistOrder(base);
    },
    [order, persistOrder]
  );

  const resetOrder = useCallback(() => persistOrder([]), [persistOrder]);

  return { hidden, order, isVisible, toggle, showAll, hideAll, move, resetOrder };
}
