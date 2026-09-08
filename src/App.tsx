import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HomeDashboard } from './components/HomeDashboard';
import { SurveyList } from './components/surveys/SurveyList';
import { SurveyWizard } from './components/wizard/SurveyWizard';
import { ResponsesModule } from './components/responses/ResponsesModule';
import { AnalyticsModule } from './components/analytics/AnalyticsModule';
import { MetasModule } from './components/metas/MetasModule';
import { TeamSizingModule } from './components/team/TeamSizingModule';
import { ExternalImportModule } from './components/import/ExternalImportModule';
import { AnalyticalReportsModule } from './components/reports/AnalyticalReportsModule';
import { AccessPolicies } from './components/registrations/AccessPolicies';
import { CollaboratorForm } from './components/registrations/CollaboratorForm';
import { CollectionSimulator } from './components/simulator/CollectionSimulator';
import { LicensesModule } from './components/licenses/LicensesModule';
import { TwoFactorModal } from './components/auth/TwoFactorModal';
import { ActionHistory } from './components/audit/ActionHistory';
import { ConnectionSyncNotification } from './components/common/ConnectionSyncNotification';
import { ResearcherEnvironment } from './components/researcher/ResearcherEnvironment';
import { LoginScreen } from './components/auth/LoginScreen';
import { PWAFirstVisitMobilePrompt } from './components/pwa/PWAFirstVisitMobilePrompt';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const MainContent: React.FC = () => {
  const {
    isAuthenticated,
    activeModule,
    setActiveModule,
    hasPermission,
    currentProfile,
  } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex flex-col font-sans transition-colors selection:bg-accent-primary-solid selection:text-on-accent bg-surface-app text-on-accent"
      >
        <LoginScreen />
        <PWAFirstVisitMobilePrompt onProceedToLogin={() => {}} />
      </div>
    );
  }

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  // Determine permission requirement for current active module
  const checkModuleAccess = (module: string): boolean => {
    switch (module) {
      case 'pesquisador':
        return true;
      case 'home':
        return isResearcher ? true : hasPermission('home_acesso');
      case 'pesquisas':
      case 'pesquisa':
        return hasPermission('pesquisa_acesso');
      case 'wizard':
        return hasPermission('pesquisa_criar') || hasPermission('pesquisa_alterar');
      case 'respostas':
        return hasPermission('respostas_acesso');
      case 'analise':
        return hasPermission('analise_acesso');
      case 'metas':
      case 'meta':
        return hasPermission('meta_acesso');
      case 'dimensionamento':
      case 'equipe':
        return isResearcher ? true : hasPermission('meta_acesso');
      case 'importacao':
        return hasPermission('importacao_acesso');
      case 'relatorios':
        return hasPermission('relatorios_acesso');
      case 'politicas_acesso':
        return hasPermission('politicas_acesso');
      case 'licencas':
        return hasPermission('colaboradores_acesso');
      case 'colaboradores':
        return hasPermission('colaboradores_acesso');
      case 'historico_acoes':
      case 'auditoria':
        return true; // Compliance action history is accessible to audit operators
      case 'simulador':
        return true; // Field collection / test simulator is universally accessible
      default:
        return true;
    }
  };

  const isAllowed = checkModuleAccess(activeModule);

  const renderModule = () => {
    if (!isAllowed) {
      return (
        <div className="mx-auto my-12 max-w-lg rounded-2xl border border-ui bg-surface p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary-soft text-accent-primary-soft-text border border-accent-primary-soft-border">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-base font-bold text-primary">
            Acesso Restrito pelas Políticas de Acesso
          </h2>
          <p className="mt-2 text-xs text-muted leading-relaxed">
            O seu perfil de colaborador atual não possui a permissão necessária para acessar este módulo. Solicite autorização a um Administrador ou alterne o usuário de teste no cabeçalho superior.
          </p>
          <button
            onClick={() => setActiveModule('home')}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:opacity-90 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retornar ao Início</span>
          </button>
        </div>
      );
    }

    switch (activeModule) {
      case 'pesquisador':
        return <ResearcherEnvironment />;
      case 'home':
        return isResearcher ? <ResearcherEnvironment /> : <HomeDashboard />;
      case 'pesquisas':
      case 'pesquisa':
        return <SurveyList />;
      case 'wizard':
        return <SurveyWizard />;
      case 'respostas':
        return <ResponsesModule />;
      case 'analise':
        return <AnalyticsModule />;
      case 'metas':
      case 'meta':
        return <MetasModule />;
      case 'dimensionamento':
      case 'equipe':
        return <TeamSizingModule />;
      case 'importacao':
        return <ExternalImportModule />;
      case 'relatorios':
        return <AnalyticalReportsModule />;
      case 'politicas_acesso':
        return <AccessPolicies />;
      case 'colaboradores':
        return <CollaboratorForm />;
      case 'licencas':
        return <LicensesModule />;
      case 'historico_acoes':
      case 'auditoria':
        return <ActionHistory />;
      case 'simulador':
        return <CollectionSimulator />;
      default:
        return <HomeDashboard />;
    }
  };

  return (
    <div
      className="min-h-screen pb-10 flex flex-col font-sans transition-colors selection:bg-accent-primary-solid selection:text-on-accent bg-surface-app text-on-accent"
    >
      {/* Top Header */}
      <Header
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onOpen2FAModal={() => setTwoFactorModalOpen(true)}
      />

      {/* Main layout container with Sidebar & Content */}
      <div className="flex flex-1">
        <Sidebar
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderModule()}
        </main>
      </div>

      {/* Bottom Status/Language Bar (Immersive UI) */}
      <footer
        className="fixed bottom-0 left-0 md:left-64 right-0 h-8 backdrop-blur-md border-t border-subtle px-4 sm:px-6 flex items-center justify-between z-20 text-[10px] transition-colors bg-surface-app/95 text-muted shadow-xs"
      >
        <div className="flex items-center gap-3 font-semibold">
          <span className="text-accent-success flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse"></span>
            Servidores Online
          </span>
          <span className="text-muted hidden sm:inline">•</span>
          <span className="text-muted hidden sm:inline">v2.4.1-stable</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted font-medium hidden sm:inline">Cluster SA-EAST-1</span>
          <div className="h-3 w-px bg-strong hidden sm:inline"></div>
          <span className="text-muted font-mono">UTC -03:00</span>
        </div>
      </footer>

      {/* 2FA Modal */}
      <TwoFactorModal
        isOpen={twoFactorModalOpen}
        onClose={() => setTwoFactorModalOpen(false)}
      />

      {/* Connection Monitor & IndexedDB/Supabase Sync Progress Notification */}
      <ConnectionSyncNotification />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
