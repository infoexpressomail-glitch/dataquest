import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import {
  ShieldCheck,
  Moon,
  Sun,
  Globe,
  User,
  LogOut,
  KeyRound,
  PlusCircle,
  Menu,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { Language } from '../types';
import { OfflineSyncModal } from './OfflineSyncModal';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onOpen2FAModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar, onOpen2FAModal }) => {
  const {
    language,
    setLanguage,
    darkMode,
    setDarkMode,
    currentUser,
    setCurrentUser,
    currentProfile,
    twoFactorVerified,
    collaborators,
    setActiveModule,
    setEditingSurvey,
    hasPermission,
    effectiveOnline,
    offlineQueue,
    connectionState,
    syncProgress,
    pendingIndexedDbCount,
    logout,
  } = useApp();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const handleStartNewSurvey = () => {
    setEditingSurvey(null);
    setActiveModule('wizard');
  };

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ui bg-surface-app/90 px-4 backdrop-blur-md transition-colors sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          id="btn-mobile-menu-toggle"
          onClick={onToggleMobileSidebar}
          aria-label="Abrir menu de navegação"
          className="rounded-lg p-2 text-muted hover:bg-surface-raised hover:text-primary md:hidden transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary-solid font-bold text-on-accent shadow-lg shadow-blue-900/40">
            Q
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-primary">
              Data<span className="text-accent-primary">Quest</span>
            </span>
            <span className="ml-2 hidden text-xs font-medium text-muted sm:inline-block">
              Gestão de Questionários
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Researcher Environment Badge */}
        {isResearcher && (
          <button
            id="btn-header-researcher-badge"
            onClick={() => setActiveModule('pesquisador')}
            title="Ir para o Ambiente do Pesquisador"
            className="flex items-center gap-1.5 rounded-full bg-accent-success-soft border border-accent-success-soft-border px-3 py-1 text-xs font-bold text-accent-success hover:bg-accent-success-soft transition shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-accent-success-solid animate-pulse" />
            <span className="hidden sm:inline">Ambiente do Pesquisador</span>
            <span className="sm:hidden">Pesquisador</span>
          </button>
        )}

        {/* Nova Pesquisa Button if has permission */}
        {hasPermission('pesquisa_criar') && (
          <button
            id="btn-header-new-survey"
            onClick={handleStartNewSurvey}
            className="flex items-center gap-1.5 rounded-lg bg-accent-primary-solid px-3.5 py-1.5 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 transition hover:bg-accent-primary-solid-hover active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{t('newSurvey')}</span>
          </button>
        )}

        {/* Offline / Online Sync Status Button with Live Monitor */}
        <button
          id="btn-header-offline-status"
          onClick={() => setOfflineModalOpen(true)}
          title="Monitor de Status de Conexão e Sincronização IndexedDB/Supabase"
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition ${
            syncProgress.isActive
              ? 'bg-accent-primary-soft border-accent-primary-soft-border text-accent-primary animate-pulse shadow-lg shadow-blue-500/10'
              : !effectiveOnline
              ? 'bg-accent-warning-soft border-accent-warning-soft-border text-accent-warning hover:bg-accent-warning-soft'
              : pendingIndexedDbCount > 0 || offlineQueue.length > 0
              ? 'bg-accent-primary-soft border-accent-primary-soft-border text-accent-primary hover:bg-accent-primary-soft'
              : 'bg-accent-success-soft border-accent-success-soft-border text-accent-success hover:bg-accent-success-soft'
          }`}
        >
          {syncProgress.isActive ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent-primary" />
          ) : effectiveOnline ? (
            <Wifi className="h-3.5 w-3.5" />
          ) : (
            <WifiOff className="h-3.5 w-3.5" />
          )}
          <span className="hidden md:inline">
            {syncProgress.isActive
              ? `Sincronizando (${syncProgress.percent}%)`
              : !effectiveOnline
              ? 'Offline'
              : pendingIndexedDbCount > 0
              ? `${pendingIndexedDbCount} no IndexedDB`
              : offlineQueue.length > 0
              ? `${offlineQueue.length} p/ sincronizar`
              : 'Online'}
          </span>
          {(pendingIndexedDbCount > 0 || offlineQueue.length > 0) && !syncProgress.isActive && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-warning-solid text-[10px] font-bold text-on-warning">
              {pendingIndexedDbCount || offlineQueue.length}
            </span>
          )}
        </button>

        {/* Language Selector (icon-only) */}
        <div className="relative">
          <button
            id="btn-header-lang-selector"
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            title="Idioma / Language"
            aria-label="Selecionar idioma"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-ui bg-surface text-muted hover:bg-surface-raised hover:text-primary transition"
          >
            <Globe className="h-4 w-4" />
          </button>

          {langDropdownOpen && (
            <div className="absolute right-0 mt-2 w-36 rounded-xl border border-ui bg-surface p-1 shadow-2xl z-50">
              {(['pt', 'en', 'es'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  id={`btn-lang-${lang}`}
                  onClick={() => {
                    setLanguage(lang);
                    setLangDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs rounded-lg transition-colors ${
                    language === lang
                      ? 'bg-accent-primary-soft font-bold text-accent-primary border border-blue-600/20'
                      : 'text-secondary hover:bg-surface-raised hover:text-primary'
                  }`}
                >
                  <span>
                    {lang === 'pt' && 'Português (BR)'}
                    {lang === 'en' && 'English'}
                    {lang === 'es' && 'Español'}
                  </span>
                  {language === lang && <CheckCircle2 className="h-3.5 w-3.5 text-accent-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          id="btn-header-dark-mode-toggle"
          onClick={() => setDarkMode(!darkMode)}
          aria-label="Alternar modo escuro"
          className="rounded-lg border border-ui bg-surface p-2 text-muted hover:bg-surface-raised hover:text-primary transition"
        >
          {darkMode ? <Sun className="h-4 w-4 text-accent-warning" /> : <Moon className="h-4 w-4 text-muted" />}
        </button>

        {/* User Profile Switcher */}
        <div className="relative">
          <button
            id="btn-header-user-menu"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 rounded-xl border border-ui bg-surface p-1.5 pr-2.5 text-left text-xs transition hover:bg-surface-raised"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-xs font-bold text-primary shadow-md shadow-blue-900/40">
              {currentUser.nome.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-left lg:block">
              <div className="font-bold text-primary leading-tight">
                {currentUser.nome.split(' ')[0]} {currentUser.nome.split(' ')[1] || ''}
              </div>
              <div className="text-[10px] text-muted">
                {currentProfile?.name || 'Perfil'}
              </div>
            </div>
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-ui bg-surface p-3 shadow-2xl z-50">
              <div className="border-b border-ui pb-2.5 px-1 text-xs">
                <div className="font-bold text-primary">{currentUser.nome}</div>
                <div className="text-muted text-[11px]">{currentUser.email}</div>
                <span className="mt-1.5 inline-block rounded-md bg-accent-primary-soft border border-accent-primary-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-primary">
                  {currentProfile?.name}
                </span>
              </div>

              {/* 2FA status — consolidated from the header badge */}
              <button
                id="btn-dropdown-2fa-status"
                onClick={() => {
                  setUserDropdownOpen(false);
                  onOpen2FAModal();
                }}
                className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-ui bg-surface-raised/60 px-2.5 py-2 transition hover:bg-surface-raised"
              >
                <span className="flex items-center gap-2 text-[11px] font-semibold text-secondary">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full ${twoFactorVerified ? 'bg-accent-success-solid' : 'bg-accent-warning-solid'}`}>
                    <KeyRound className="h-2.5 w-2.5 text-on-accent" />
                  </span>
                  <span>2FA {twoFactorVerified ? 'Ativo' : 'Pendente'}</span>
                </span>
                <span className="text-[10px] font-bold text-accent-primary">Configurar</span>
              </button>

              <div className="py-2">
                <div className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                  Alternar Usuário para Testes
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {collaborators.map((c) => (
                    <button
                      key={c.id}
                      id={`btn-switch-user-${c.id}`}
                      onClick={() => {
                        setCurrentUser(c);
                        setUserDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                        currentUser.id === c.id
                          ? 'bg-accent-primary-soft font-bold text-accent-primary border border-blue-600/20'
                          : 'text-secondary hover:bg-surface-raised hover:text-primary'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{c.nome}</div>
                        <div className="text-[10px] text-muted">login: {c.login}</div>
                      </div>
                      {currentUser.id === c.id && <CheckCircle2 className="h-3.5 w-3.5 text-accent-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-ui pt-2 space-y-1">
                <button
                  id="btn-header-logout"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-accent-danger hover:bg-accent-danger-soft transition font-semibold"
                >
                  <LogOut className="h-3.5 w-3.5 text-accent-danger" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {offlineModalOpen && (
        <OfflineSyncModal onClose={() => setOfflineModalOpen(false)} />
      )}
    </header>
  );
};
