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
import { ShieldAlert, ArrowLeft, ClipboardList } from 'lucide-react';

interface FieldAppProps {
  onExit: () => void;
}

/**
 * Root do sub-app "Modo Pesquisador".
 * Age como um app separado (fullscreen, sem o shell administrativo),
 * mas compartilhando o mesmo backend/estado via AppContext.
 *
 * Fluxo de entrada (Etapa 3):
 *   1. Enquanto não houver uma FieldSession, exibe o FieldLogin (login + Sincronizar),
 *      que autentica contra o servidor e baixa as pesquisas/políticas do pesquisador.
 *   2. Após autenticar, exibe o ambiente de campo usando a sessão autenticada.
 */
export const FieldApp: React.FC<FieldAppProps> = ({ onExit }) => {
  const { isAuthenticated } = useApp();
  const [session, setSession] = useState<FieldSession | null>(null);
  const [section, setSection] = useState<FieldSection>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sem sessão autenticada de campo → tela de login + sincronização.
  if (!session) {
    return (
      <FieldLogin
        onAuthenticated={setSession}
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
      onExit={onExit}
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
      {section === 'sync' && <FieldSync session={session} />}
    </FieldLayout>
  );
};
