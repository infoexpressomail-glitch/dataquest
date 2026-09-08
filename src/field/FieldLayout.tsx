import React from 'react';
import { Collaborator, AccessProfile } from '../types';
import { FieldSection } from './fieldTypes';
import { FieldSidebar } from './FieldSidebar';
import { FieldHeader } from './FieldHeader';

interface FieldLayoutProps {
  section: FieldSection;
  /** Colaborador autenticado no sub-app (opcional — usado em vez do contexto quando presente). */
  user?: Collaborator;
  /** Perfil do colaborador autenticado (opcional). */
  profile?: AccessProfile;
  onNavigate: (s: FieldSection) => void;
  onExit: () => void;
  mobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
  onCloseMobileSidebar: () => void;
  children: React.ReactNode;
}

/**
 * Layout do sub-app: sidebar fixa (collapse em mobile) + área de conteúdo.
 */
export const FieldLayout: React.FC<FieldLayoutProps> = ({
  section,
  user,
  profile,
  onNavigate,
  onExit,
  mobileSidebarOpen,
  onToggleMobileSidebar,
  onCloseMobileSidebar,
  children,
}) => {
  return (
    <div className="min-h-screen flex font-sans transition-colors bg-surface-app text-on-accent">
      {/* Sidebar (desktop fixa à esquerda, mobile como overlay) */}
      <FieldSidebar
        section={section}
        user={user}
        profile={profile}
        onNavigate={onNavigate}
        onExit={onExit}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={onCloseMobileSidebar}
      />

      {/* Coluna de conteúdo */}
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        <FieldHeader
          section={section}
          user={user}
          profile={profile}
          onToggleMobileSidebar={onToggleMobileSidebar}
          onExit={onExit}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
