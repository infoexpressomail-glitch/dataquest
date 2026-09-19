import React, { useState } from 'react';
import { FieldSession } from './fieldTypes';
import { FieldWorkspace } from './FieldWorkspace';
import { FieldLogin } from './FieldLogin';
import { resyncFieldSurveys } from '../services/fieldSyncService';
import { getFieldTargetSurveyCode } from './fieldRoute';
import {
  persistFieldSession,
  loadFieldSession,
  clearFieldSession,
} from '../services/fieldSessionStore';

interface FieldAppProps {
  onExit: () => void;
}

/**
 * Sub-app do Modo Pesquisador (reescrito).
 *
 * Estrutura reduzida e direta, no padrão "modo pesquisador":
 *   login      -> única porta de entrada (FieldLogin)
 *   pesquisas  -> lista APENAS das pesquisas ativas atribuídas ao login
 *   coleta     -> formulário da pesquisa selecionada (CollectionSimulator fieldMode)
 *
 * Não há mais menu lateral com Início/Metas/Sincronizar separados: as metas
 * aparecem dentro de cada pesquisa e a sincronização é uma ação do cabeçalho.
 * Toda a lógica de sessão/sincronização existente é preservada.
 */
export const FieldApp: React.FC<FieldAppProps> = ({ onExit }) => {
  const [session, setSession] = useState<FieldSession | null>(() => loadFieldSession());
  const [autoStartSurveyId, setAutoStartSurveyId] = useState<string | null>(null);

  // Re-sincroniza automaticamente na montagem quando já havia uma sessão
  // persistida: garante que remoções/alterações feitas pela coordenação no
  // sistema base (ex.: tirar uma pesquisa do pesquisador) se reflitam ao entrar.
  const initialSessionRef = React.useRef(session);
  React.useEffect(() => {
    const stored = initialSessionRef.current;
    if (!stored) return;
    let active = true;
    resyncFieldSurveys(stored)
      .then((updated) => {
        if (active) {
          setSession(updated);
          persistFieldSession(updated);
          const code = getFieldTargetSurveyCode();
          if (code) setAutoStartSurveyId(code);
        }
      })
      .catch(() => {
        // Falha de rede: mantém a sessão persistida (usuário vê dados em cache).
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autentica (vindo do FieldLogin): persiste e segue para as pesquisas.
  const handleAuthenticated = (s: FieldSession) => {
    setSession(s);
    persistFieldSession(s);
    const code = getFieldTargetSurveyCode();
    setAutoStartSurveyId(code);
  };

  // Re-sincroniza as pesquisas do pesquisador (ação de sincronização).
  const handleResync = async (current: FieldSession): Promise<FieldSession> => {
    const updated = await resyncFieldSurveys(current);
    setSession(updated);
    persistFieldSession(updated);
    return updated;
  };

  // Sair do Modo Pesquisador: limpa a sessão persistida e volta ao ambiente de gestão.
  const handleLogout = () => {
    clearFieldSession();
    setSession(null);
    setAutoStartSurveyId(null);
  };

  // Sem sessão autenticada de campo → tela de login (única porta de entrada).
  if (!session) {
    return <FieldLogin onAuthenticated={handleAuthenticated} onExit={onExit} />;
  }

  return (
    <FieldWorkspace
      session={session}
      onResync={handleResync}
      onLogout={handleLogout}
      autoStartSurveyId={autoStartSurveyId}
    />
  );
};
