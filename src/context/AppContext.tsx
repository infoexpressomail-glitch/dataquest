import React, { createContext, useContext, useEffect, useLayoutEffect } from 'react';
import type {
  AuditDomain,
  AuthDomain,
  CadastrosDomain,
  ColetasDomain,
  SurveysDomain,
} from './domains/types';
import { domainBridge } from './domains/bridge';
import { AuditContext, useAuditDomain } from './domains/AuditDomain';
import { AuthContext, useAuthDomain } from './domains/AuthDomain';
import { CadastrosContext, useCadastrosDomain } from './domains/CadastrosDomain';
import { ColetasContext, useColetasDomain } from './domains/ColetasDomain';
import { SurveysContext, useSurveysDomain } from './domains/SurveysDomain';

export type {
  AuditDomain,
  AuthDomain,
  CadastrosDomain,
  ColetasDomain,
  SurveysDomain,
} from './domains/types';
export { useAuditoria } from './domains/AuditDomain';
export { useAuth } from './domains/AuthDomain';
export { useCadastros } from './domains/CadastrosDomain';
export { useColetas } from './domains/ColetasDomain';
export { useSurveys } from './domains/SurveysDomain';

// =============================================================================
// F3 — AppContext dividido em domínios
//
// O antigo arquivo monólito (2.963 linhas) foi separado em cinco domínios, cada
// um dono do seu estado e da sua lógica:
//
//   1. Autenticação e permissões  →  useAuth()        (AuthDomain.tsx)
//   2. Cadastros                  →  useCadastros()   (CadastrosDomain.tsx)
//   3. Coletas e sincronização    →  useColetas()     (ColetasDomain.tsx)
//   4. Pesquisas                  →  useSurveys()     (SurveysDomain.tsx)
//   5. Auditoria                  →  useAuditoria()   (AuditDomain.tsx)
//
// Cada tela pode consumir só o domínio de que precisa. O `useApp()` continua
// devolvendo a API COMPLETA (união dos domínios), então nenhuma tela atual
// precisou mudar — a compatibilidade é total.
//
// Os domínios conversam por uma ponte explícita (`DomainBridge`), preenchida
// durante o render por cada domínio. É isso que quebra as dependências cruzadas
// (Pesquisas ↔ Coletas ↔ Cadastros) sem criar imports circulares.
// =============================================================================

export interface AppContextType extends AuthDomain, CadastrosDomain, ColetasDomain, SurveysDomain, AuditDomain {
  resetToDefaults: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Ordem de criação = ordem de dependência dos domínios.
  const { domain: audit } = useAuditDomain();
  const { domain: auth } = useAuthDomain();
  const { domain: cadastros, internal: cadastrosInternal } = useCadastrosDomain();
  const { domain: coletas, internal: coletasInternal } = useColetasDomain();
  const { domain: surveys, internal: surveysInternal } = useSurveysDomain();

  // A RAIZ é a única que escreve na ponte. A ligação acontece num layout effect
  // (síncrono, no commit) — assim os efeitos passivos dos domínios, que rodam
  // depois, já encontram a ponte preenchida. Escrever na ponte durante o render
  // seria uma mutação impura e violaria as regras do React Compiler.
  useLayoutEffect(() => {
    domainBridge.addAuditLog = audit.addAuditLog;
    domainBridge.getCurrentUser = () => auth.currentUser;
    domainBridge.getCurrentProfile = () => auth.currentProfile;
    domainBridge.setCurrentUser = auth.setCurrentUser;
    domainBridge.getProfiles = () => auth.profiles;
    domainBridge.setActiveModule = auth.setActiveModule;
    domainBridge.getCollaborators = () => cadastros.collaborators;
    domainBridge.setCollaborators = cadastrosInternal.setCollaborators;
    domainBridge.getSubmissions = () => coletas.submissions;
    domainBridge.getEffectiveOnline = () => coletas.effectiveOnline;
    domainBridge.addOfflineItem = coletas.addOfflineItem;
    domainBridge.notifySurveySyncResult = coletasInternal.notifySurveySyncResult;
    domainBridge.notifyPendingOfflineSave = coletasInternal.notifyPendingOfflineSave;
    domainBridge.getSurveys = () => surveys.surveys;
    domainBridge.setSurveys = surveysInternal.setSurveys;
  });

  // F2 — hidratação a partir do servidor (fonte única). Fica na raiz porque precisa
  // observar `isAuthenticated` (Auth) e `effectiveOnline` (Coletas) ao mesmo tempo.
  useEffect(() => {
    if (!auth.isAuthenticated || !coletas.effectiveOnline) return;
    void auth.hydrateFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, coletas.effectiveOnline]);

  const resetToDefaults = () => {
    // F2 — "reset" não volta para dados de exemplo no navegador: limpa o CACHE
    // OFFLINE DE CAMPO e recarrega perfis, colaboradores e pesquisas do servidor.
    cadastros.setLicenseQuota(null);
    auth.setTwoFactorVerified(true);
    auth.setActiveModule('home');
    coletas.resetOfflineCacheState();
    coletas.setSimulatedOffline(false);
    localStorage.removeItem('dataquest_simulated_offline');
    void auth.hydrateFromServer();
  };

  const value: AppContextType = {
    ...audit,
    ...auth,
    ...cadastros,
    ...coletas,
    ...surveys,
    resetToDefaults,
  };

  return (
    <AuditContext.Provider value={audit}>
      <AuthContext.Provider value={auth}>
        <CadastrosContext.Provider value={cadastros}>
          <ColetasContext.Provider value={coletas}>
            <SurveysContext.Provider value={surveys}>
              <AppContext.Provider value={value}>{children}</AppContext.Provider>
            </SurveysContext.Provider>
          </ColetasContext.Provider>
        </CadastrosContext.Provider>
      </AuthContext.Provider>
    </AuditContext.Provider>
  );
};

/**
 * Compatibilidade total: devolve a API completa (união dos cinco domínios).
 * Telas específicas podem migrar para `useAuth`, `useSurveys`, `useColetas`,
 * `useCadastros` ou `useAuditoria` e passar a depender só do que usam.
 */
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
