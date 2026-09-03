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
import { ExternalImportModule } from './components/import/ExternalImportModule';
import { AccessPolicies } from './components/registrations/AccessPolicies';
import { CollaboratorForm } from './components/registrations/CollaboratorForm';
import { CollectionSimulator } from './components/simulator/CollectionSimulator';
import { TwoFactorModal } from './components/auth/TwoFactorModal';
import { ActionHistory } from './components/audit/ActionHistory';
import { ConnectionSyncNotification } from './components/common/ConnectionSyncNotification';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeModule, setActiveModule, hasPermission } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);

  // Determine permission requirement for current active module
  const checkModuleAccess = (module: string): boolean => {
    switch (module) {
      case 'home':
        return hasPermission('home_acesso');
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
      case 'importacao':
        return hasPermission('importacao_acesso');
      case 'politicas_acesso':
        return hasPermission('politicas_acesso');
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
        <div className="mx-auto my-12 max-w-lg rounded-2xl border border-slate-800 bg-[#16171d] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-base font-bold text-white">
            Acesso Restrito pelas Políticas de Acesso
          </h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            O seu perfil de colaborador atual não possui a permissão necessária para acessar este módulo. Solicite autorização a um Administrador ou alterne o usuário de teste no cabeçalho superior.
          </p>
          <button
            onClick={() => setActiveModule('home')}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retornar ao Início</span>
          </button>
        </div>
      );
    }

    switch (activeModule) {
      case 'home':
        return <HomeDashboard />;
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
      case 'importacao':
        return <ExternalImportModule />;
      case 'politicas_acesso':
        return <AccessPolicies />;
      case 'colaboradores':
        return <CollaboratorForm />;
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
    <div className="min-h-screen bg-[#0a0b10] text-[#e2e8f0] pb-10 flex flex-col font-sans transition-colors selection:bg-blue-600 selection:text-white">
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
      <footer className="fixed bottom-0 left-0 md:left-64 right-0 h-8 bg-[#0a0b10]/95 backdrop-blur-md border-t border-slate-800/80 px-4 sm:px-6 flex items-center justify-between z-20 text-[10px] text-slate-500">
        <div className="flex items-center gap-3 font-semibold">
          <span className="text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Servidores Online
          </span>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <span className="text-slate-500 hidden sm:inline">v2.4.1-stable</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-medium hidden sm:inline">Cluster SA-EAST-1</span>
          <div className="h-3 w-px bg-slate-800 hidden sm:inline"></div>
          <span className="text-slate-500 font-mono">UTC -03:00</span>
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
