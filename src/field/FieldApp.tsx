import React, { useState } from 'react';
import { FieldSection, FieldSession } from './fieldTypes';
import { FieldLayout } from './FieldLayout';
import { FieldHome } from './FieldHome';
import { FieldDashboard } from './FieldDashboard';
import { FieldColeta } from './FieldColeta';
import { FieldMetas } from './FieldMetas';
import { FieldSync } from './FieldSync';
import { FieldLogin } from './FieldLogin';
import { useApp } from '../context/AppContext';
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
 * Sub-app do Modo Pesquisador.
 * Estrutura de telas:
 *   home      -> grade de ações (Pesquisas, Carregar, Descarregar, Atualizar Meta)
 *   pesquisas -> seleção da pesquisa ativa + contadores (Realizadas / Falta enviar)
 *   coleta    -> formulário de coleta (CollectionSimulator com fieldMode)
 *   metas     -> acompanhamento das metas por pesquisa ativa
 *   sync      -> Carregar/Descarregar + status de sincronização
 */
export const FieldApp: React.FC<FieldAppProps> = ({ onExit }) => {
  const [session, setSession] = useState<FieldSession | null>(() => loadFieldSession());
  const [section, setSection] = useState<FieldSection>('home');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Permite pré-selecionar a pesquisa-alvo no contexto (usada pela tela de Coleta).
  const { setEditingSurvey } = useApp();

  // Pré-seleciona a pesquisa a partir do parâmetro `?pesquisa=<CODIGO>` na URL
  // (link compartilhado). Se encontrada e habilitada (ativa) para o pesquisador,
  // leva direto à Coleta dessa pesquisa — sem precisar selecioná-la. Caso
  // contrário (código ausente/inválido ou pesquisa não liberada), vai ao painel.
  const applyUrlTarget = (s: FieldSession) => {
    const code = getFieldTargetSurveyCode();
    if (!code) {
      setSection('home');
      return;
    }
    const target = s.surveys.find(
      (sv) =>
        (sv.codigo && sv.codigo.toLowerCase() === code.toLowerCase()) ||
        sv.id === code
    );
    if (target && target.status === 'ativa') {
      setEditingSurvey(target);
      setSection('coleta');
    } else {
      // Código não corresponde a uma pesquisa habilitada para este login.
      setSection('home');
    }
  };

  // Re-sincroniza automaticamente na montagem quando já havia uma sessão
  // persistida: garante que remoções/alterações feitas pela coordenação no
  // sistema base (ex.: tirar uma pesquisa do pesquisador) se reflitam ao entrar,
  // sem depender do pesquisador clicar em "Re-sincronizar".
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
          applyUrlTarget(updated);
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

  // Autentica (vindo do FieldLogin): persiste e segue para o ambiente.
  // Se o link compartilhado tinha `?pesquisa=<CODIGO>`, vai direto à coleta dela.
  const handleAuthenticated = (s: FieldSession) => {
    setSession(s);
    persistFieldSession(s);
    applyUrlTarget(s);
  };

  // Re-sincroniza as pesquisas do pesquisador (usado pelo FieldHome e FieldMetas).
  const handleResync = async (current: FieldSession): Promise<FieldSession> => {
    const updated = await resyncFieldSurveys(current);
    setSession(updated);
    persistFieldSession(updated);
    return updated;
  };

  // Sair do Modo Pesquisador: limpa a sessão persistida e volta ao shell.
  const handleLogout = () => {
    clearFieldSession();
    setSession(null);
    setSection('home');
  };

  // Sem sessão autenticada de campo → tela de login + sincronização.
  if (!session) {
    return (
      <FieldLogin
        onAuthenticated={handleAuthenticated}
        onExit={onExit}
      />
    );
  }

  const navigate = (s: FieldSection) => {
    setSection(s);
    setMobileSidebarOpen(false);
  };

  return (
    <FieldLayout
      section={section}
      user={session.user}
      profile={session.profile}
      onNavigate={navigate}
      onExit={handleLogout}
      onLogout={handleLogout}
      mobileSidebarOpen={mobileSidebarOpen}
      onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
    >
      {section === 'home' && (
        <FieldHome
          session={session}
          onNavigate={navigate}
          onResync={handleResync}
        />
      )}

      {section === 'pesquisas' && (
        <FieldDashboard
          session={session}
          onStartColeta={() => navigate('coleta')}
          onGoSync={() => navigate('sync')}
        />
      )}

      {section === 'coleta' && (
        <FieldColeta
          session={session}
          onBack={() => navigate('pesquisas')}
        />
      )}

      {section === 'metas' && (
        <FieldMetas
          session={session}
          onResync={handleResync}
        />
      )}

      {section === 'sync' && (
        <FieldSync
          session={session}
          onResync={handleResync}
        />
      )}
    </FieldLayout>
  );
};
