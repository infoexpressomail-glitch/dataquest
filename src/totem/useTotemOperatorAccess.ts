/**
 * Acesso do operador no Modo Totem — DataQuest.
 *
 * No totem, a barra do operador (relatório, login do tablet, trocar pesquisa,
 * atualizar, sair, tela cheia) fica **oculta por padrão**: o respondente vê
 * apenas a pesquisa (e, na primeira vez, a tela de login do pesquisador).
 *
 * O operador revela a barra com um dos atalhos abaixo e ela se fecha sozinha
 * após alguns segundos sem interação:
 *
 *   1) Toque no canto superior direito 5x em até 2,5s (gesto de toque);
 *   2) Pressione e segure o canto superior direito por 2,5s (toque longo);
 *   3) Teclado físico: Ctrl + Shift + O (O de Operador);
 *   4) URL: abrir o totem com `?operador=1` (útil na configuração).
 *
 * Pressionar Esc (ou o botão "Ocultar") fecha a barra na hora.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/** Texto exibido na documentação/rodapé da barra do operador. */
export const OPERATOR_SHORTCUT_LABEL = 'Ctrl + Shift + O';

/** Tempo (ms) que a barra permanece aberta sem interação antes de se ocultar. */
const AUTO_HIDE_MS = 30_000;
/** Janela (ms) para contar os toques do gesto. */
const TAP_WINDOW_MS = 2_500;
/** Quantidade de toques no canto para revelar a barra. */
const TAPS_TO_OPEN = 5;
/** Tempo (ms) de toque contínuo no canto para revelar a barra. */
const LONG_PRESS_MS = 2_500;

export interface TotemOperatorHotspotProps {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
}

export interface TotemOperatorAccess {
  /** A barra do operador está visível? */
  operatorVisible: boolean;
  /** Revela a barra e agenda o fechamento automático. */
  showOperator: () => void;
  /** Oculta a barra imediatamente. */
  hideOperator: () => void;
  /** Alterna a barra (usado pelo atalho de teclado). */
  toggleOperator: () => void;
  /** Props do ponto sensível (canto superior direito) que escuta os gestos. */
  hotspotProps: TotemOperatorHotspotProps;
}

/**
 * Lê `?operador=1` (ou `?barra=1`) da URL para já abrir a barra do operador.
 * Facilita a configuração do tablet sem depender de gesto/teclado.
 */
function readOperatorUrlFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const value = (params.get('operador') ?? params.get('barra') ?? '').toLowerCase();
    return value === '1' || value === 'true' || value === 'sim';
  } catch {
    return false;
  }
}

/** Hook que controla a visibilidade da barra do operador no totem. */
export function useTotemOperatorAccess(): TotemOperatorAccess {
  const [operatorVisible, setOperatorVisible] = useState<boolean>(() => readOperatorUrlFlag());

  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimesRef = useRef<number[]>([]);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const clearAutoHide = useCallback(() => {
    if (autoHideRef.current) {
      clearTimeout(autoHideRef.current);
      autoHideRef.current = null;
    }
  }, []);

  const hideOperator = useCallback(() => {
    clearAutoHide();
    setOperatorVisible(false);
  }, [clearAutoHide]);

  const showOperator = useCallback(() => {
    clearAutoHide();
    setOperatorVisible(true);
    autoHideRef.current = setTimeout(() => setOperatorVisible(false), AUTO_HIDE_MS);
  }, [clearAutoHide]);

  const toggleOperator = useCallback(() => {
    setOperatorVisible((prev) => {
      if (prev) {
        clearAutoHide();
        return false;
      }
      clearAutoHide();
      autoHideRef.current = setTimeout(() => setOperatorVisible(false), AUTO_HIDE_MS);
      return true;
    });
  }, [clearAutoHide]);

  // Teclado físico: Ctrl+Shift+O abre/fecha; Esc fecha.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key?.toLowerCase();
      if (event.ctrlKey && event.shiftKey && key === 'o') {
        event.preventDefault();
        toggleOperator();
        return;
      }
      if (key === 'escape') {
        setOperatorVisible((prev) => {
          if (prev) clearAutoHide();
          return false;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleOperator, clearAutoHide]);

  useEffect(
    () => () => {
      clearAutoHide();
      if (longPressRef.current) clearTimeout(longPressRef.current);
    },
    [clearAutoHide]
  );

  // Gesto no canto: 5 toques rápidos ou toque longo de 2,5s.
  const cancelLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const hotspotProps: TotemOperatorHotspotProps = {
    onPointerDown: () => {
      longPressFiredRef.current = false;
      cancelLongPress();
      longPressRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        showOperator();
      }, LONG_PRESS_MS);
    },
    onPointerUp: () => {
      cancelLongPress();
      if (longPressFiredRef.current) {
        // Toque longo já revelou a barra — não conta como toque do gesto.
        longPressFiredRef.current = false;
        return;
      }
      const now = Date.now();
      tapTimesRef.current = [...tapTimesRef.current, now].filter((t) => now - t <= TAP_WINDOW_MS);
      if (tapTimesRef.current.length >= TAPS_TO_OPEN) {
        tapTimesRef.current = [];
        showOperator();
      }
    },
    onPointerLeave: cancelLongPress,
    onPointerCancel: cancelLongPress,
  };

  return { operatorVisible, showOperator, hideOperator, toggleOperator, hotspotProps };
}

export default useTotemOperatorAccess;
