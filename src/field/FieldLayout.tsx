import React from 'react';
import { FieldSection } from './fieldTypes';
import { FieldSidebar } from './FieldSidebar';

interface FieldLayoutProps {
  section: FieldSection;
  user: { nome: string };
  profile: { name: string };
  onNavigate: (s: FieldSection) => void;
  onExit: () => void;
  onLogout: () => void;
  mobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
  children: React.ReactNode;
}

/**
 * Layout do sub-app de campo: sidebar + área de conteúdo.
 */
export const FieldLayout: React.FC<FieldLayoutProps> = ({
  section,
  user,
  onNavigate,
  onLogout,
  mobileSidebarOpen,
  onToggleMobileSidebar,
  children,
}) => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface text-primary">
      <FieldSidebar
        section={section}
        onNavigate={onNavigate}
        onLogout={onLogout}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={onToggleMobileSidebar}
        userName={user.nome}
      />

      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
          {children}
        </div>
      </main>
    </div>
  );
};
