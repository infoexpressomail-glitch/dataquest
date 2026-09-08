import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FieldSection, FieldSession } from './fieldTypes';
import { FieldLayout } from './FieldLayout';
import { FieldDashboard } from './FieldDashboard';
import { FieldColeta } from './FieldColeta';
import { FieldMetas } from './FieldMetas';
import { FieldHistorico } from './FieldHistorico';
import { FieldSync } from './FieldSync';
import { FieldLogin } from './FieldLogin';
import { loadFieldSession, clearFieldSession, persistFieldSession } from '../services/fieldSessionStore';
import { resyncFieldSurveys } from '../services/fieldSyncService';

interface FieldAppProps {
  onExit: () => void;
}

/**
 * Root do sub-app "Modo Pesquisador".
 * Age como um app separado (fullscreen, sem o shell administrativo),
 * mas compartilhando o mesmo backend/estado via AppContext.
 *
 * Fluxo de entrada (Etapa 3/4):
 *   1. Tenta restaurar a sessão persistida (sessionStorage). Se existir, entra
 *      direto no ambiente sem pedir login de novo.
 *   2. Sem sessão → FieldLogin (login + Sincronizar), que autentica contra o
 *      servidor e baixa as pesquisas/políticas do pesquisador.
 *   3. Após autenticar, persiste a sessão e exibe o ambiente de campo.
 *   4. O pesquisador pode re-sincronizar as pesquisas (FieldSync) ou sair.
 */
export const FieldApp: React.FC<FieldAppProps> = ({ onExit }) => {
  const { isAuthenticated } = useApp();
  // Restaura a sessão persistida uma única vez na montagem.
  const [session, setSession] = useState<FieldSession | null>(() => loadFieldSession());
  const [section, setSection] = useState<FieldSection>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Autentica (vindo do FieldLogin): persiste e segue para o ambiente.
  const handleAuthenticated = (newSession: FieldSession) => {
    persistFieldSession(newSession);
    setSession(newSession);
    setSection('dashboard');
  };

  // Re-sincroniza as pesquisas do pesquisador (usado pelo FieldSync).
  const handleResync = async (current: FieldSession): Promise<FieldSession> => {
    const updated = await resyncFieldSurveys(current);
    setSession(updated);
    return updated;
  };

  // Sair do Modo Pesquisador: limpa a sessão persistida e volta ao shell.
  const handleLogout = () => {
    clearFieldSession();
    setSession(null);
    setSection('dashboard');
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
      onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
    >
      {section === 'dashboard' && (
        <FieldDashboard
          session={session}
          onStartColeta={() => navigate('coleta')}
          onGoHistorico={() => navigate('historico')}
          onGoSync={() => navigate('sync')}
        />
      )}
      {section === 'coleta' && <FieldColeta session={session} />}
      {section === 'metas' && <FieldMetas session={session} />}
      {section === 'historico' && <FieldHistorico session={session} />}
      {section === 'sync' && (
        <FieldSync session={session} onResync={handleResync} />
      )}
    </FieldLayout>
  );
};
