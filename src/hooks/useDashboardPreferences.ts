import { useCallback, useEffect, useState } from 'react';

/**
 * Preferências de personalização do dashboard.
 *
 * Guarda, por usuário, a lista de IDs de itens OCULTADOS. Tudo o que não
 * estiver nessa lista aparece normalmente. A persistência é local
 * (localStorage), então a escolha sobrevive a recarregamentos sem tocar em
 * banco/API/regras de negócio.
 */

const STORAGE_PREFIX = 'dataquest.dashboard.hidden';

function readHidden(storageKey: string): string[] {
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
  /** Retorna true se o item deve ser exibido. */
  isVisible: (id: string) => boolean;
  /** Alterna exibição/ocultação de um item. */
  toggle: (id: string) => void;
  /** Exibe todos os itens. */
  showAll: () => void;
  /** Oculta todos os itens informados. */
  hideAll: (ids: string[]) => void;
}

export function useDashboardPreferences(userId: string): DashboardPreferences {
  const storageKey = `${STORAGE_PREFIX}.${userId || 'anonimo'}`;

  const [hidden, setHidden] = useState<string[]>(() => readHidden(storageKey));

  // Troca de usuário (ex.: "Alternar Usuário para Testes") recarrega a
  // preferência correta daquele perfil.
  useEffect(() => {
    setHidden(readHidden(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (next: string[]) => {
      setHidden(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Sem localStorage disponível: mantém apenas em memória.
      }
    },
    [storageKey]
  );

  const isVisible = useCallback((id: string) => !hidden.includes(id), [hidden]);

  const toggle = useCallback(
    (id: string) => {
      persist(hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id]);
    },
    [hidden, persist]
  );

  const showAll = useCallback(() => persist([]), [persist]);

  const hideAll = useCallback(
    (ids: string[]) => persist(Array.from(new Set(ids))),
    [persist]
  );

  return { hidden, isVisible, toggle, showAll, hideAll };
}
