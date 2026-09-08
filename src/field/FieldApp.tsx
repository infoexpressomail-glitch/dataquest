import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FieldSection } from './fieldTypes';
import { FieldLayout } from './FieldLayout';
import { FieldDashboard } from './FieldDashboard';
import { FieldColeta } from './FieldColeta';
import { FieldMetas } from './FieldMetas';
import { FieldHistorico } from './FieldHistorico';
import { FieldSync } from './FieldSync';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface FieldAppProps {
  onExit: () => void;
}

/**
 * Root do sub-app "Modo Pesquisador".
 * Age como um app separado (fullscreen, sem o shell administrativo),
 * mas compartilhando o mesmo backend/estado via AppContext.
 */
export const FieldApp: React.FC<FieldAppProps> = ({ onExit }) => {
  const { currentUser, currentProfile, isAuthenticated } = useApp();
  const [section, setSection] = useState<FieldSection>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  // Regra de acesso: o sub-app só é acessível a quem tem perfil pesquisador.
  if (!isAuthenticated || !isResearcher) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-surface-app text-on-accent">
        <div className="w-full max-w-md rounded-2xl border border-ui bg-surface p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-warning-soft border border-accent-warning-soft-border text-accent-warning">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-base font-bold text-primary">
            Acesso restrito ao ambiente de campo
          </h2>
          <p className="mt-2 text-xs text-muted leading-relaxed">
            O Modo Pesquisador está disponível apenas para o perfil de
            pesquisador de campo (prof_pesq). Alterne o usuário de teste no
            cabeçalho e tente novamente.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={onExit}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Ambiente de Gestão</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navigate = (s: FieldSection) => {
    setSection(s);
    setMobileSidebarOpen(false);
  };

  return (
    <FieldLayout
      section={section}
      onNavigate={navigate}
      onExit={onExit}
      mobileSidebarOpen={mobileSidebarOpen}
      onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
      onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
    >
      {section === 'dashboard' && (
        <FieldDashboard
          onStartColeta={() => navigate('coleta')}
          onGoHistorico={() => navigate('historico')}
          onGoSync={() => navigate('sync')}
        />
      )}
      {section === 'coleta' && <FieldColeta />}
      {section === 'metas' && <FieldMetas />}
      {section === 'historico' && <FieldHistorico />}
      {section === 'sync' && <FieldSync />}
    </FieldLayout>
  );
};
