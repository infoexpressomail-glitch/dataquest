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
    surveys,
    submissions,
    setActiveModule,
    setEditingSurvey,
    hasPermission,
    effectiveOnline,
    offlineQueue,
    connectionState,
    syncProgress,
    pendingIndexedDbCount,
  } = useApp();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const handleStartNewSurvey = () => {
    setEditingSurvey(null);
    setActiveModule('wizard');
  };

  const activeSurveys = surveys.filter((s) => s.status !== 'excluida').length;
  const activeCollaborators = collaborators.filter((c) => c.ativo).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-[#0a0b10]/90 px-4 backdrop-blur-md transition-colors sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          id="btn-mobile-menu-toggle"
          onClick={onToggleMobileSidebar}
          aria-label="Abrir menu de navegação"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-lg shadow-blue-900/40">
            Q
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white">
              Data<span className="text-blue-500">Quest</span>
            </span>
            <span className="ml-2 hidden text-xs font-medium text-slate-500 sm:inline-block">
              Gestão de Questionários
            </span>
          </div>
        </div>

        {/* Header Metrics Bar (Immersive UI) */}
        <div className="hidden lg:flex items-center gap-8 pl-6 border-l border-slate-800/80">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Pesquisas</span>
            <span className="text-sm font-bold text-white">{activeSurveys}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Entrevistas</span>
            <span className="text-sm font-bold text-white">{submissions.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Licenças</span>
            <span className="text-sm font-bold text-white">
              {activeCollaborators} <span className="text-slate-600 font-normal">/ 50</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Nova Pesquisa Button if has permission */}
        {hasPermission('pesquisa_criar') && (
          <button
            id="btn-header-new-survey"
            onClick={handleStartNewSurvey}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500 active:scale-95"
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
              ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 animate-pulse shadow-lg shadow-blue-500/10'
              : !effectiveOnline
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
              : pendingIndexedDbCount > 0 || offlineQueue.length > 0
              ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          {syncProgress.isActive ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
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
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950">
              {pendingIndexedDbCount || offlineQueue.length}
            </span>
          )}
        </button>

        {/* 2FA Status Badge */}
        <button
          id="btn-header-2fa-status"
          onClick={onOpen2FAModal}
          title="Autenticação em Dois Fatores (2FA)"
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition ${
            twoFactorVerified
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${twoFactorVerified ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>2FA {twoFactorVerified ? 'ATIVO' : 'PENDENTE'}</span>
        </button>

        {/* Language Selector */}
        <div className="relative">
          <button
            id="btn-header-lang-selector"
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#16171d] px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <span className="uppercase">{language}</span>
          </button>

          {langDropdownOpen && (
            <div className="absolute right-0 mt-2 w-36 rounded-xl border border-slate-800 bg-[#16171d] p-1 shadow-2xl z-50">
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
                      ? 'bg-blue-600/15 font-bold text-blue-400 border border-blue-600/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>
                    {lang === 'pt' && 'Português (BR)'}
                    {lang === 'en' && 'English'}
                    {lang === 'es' && 'Español'}
                  </span>
                  {language === lang && <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />}
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
          className="rounded-lg border border-slate-800 bg-[#16171d] p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User Profile Switcher */}
        <div className="relative">
          <button
            id="btn-header-user-menu"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#16171d] p-1.5 pr-2.5 text-left text-xs transition hover:bg-slate-800"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-xs font-bold text-white shadow-md shadow-blue-900/40">
              {currentUser.nome.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-left lg:block">
              <div className="font-bold text-white leading-tight">
                {currentUser.nome.split(' ')[0]} {currentUser.nome.split(' ')[1] || ''}
              </div>
              <div className="text-[10px] text-slate-400">
                {currentProfile?.name || 'Perfil'}
              </div>
            </div>
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-800 bg-[#16171d] p-3 shadow-2xl z-50">
              <div className="border-b border-slate-800 pb-2.5 px-1 text-xs">
                <div className="font-bold text-white">{currentUser.nome}</div>
                <div className="text-slate-400 text-[11px]">{currentUser.email}</div>
                <span className="mt-1.5 inline-block rounded-md bg-blue-600/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                  {currentProfile?.name}
                </span>
              </div>

              <div className="py-2">
                <div className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                          ? 'bg-blue-600/15 font-bold text-blue-400 border border-blue-600/20'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{c.nome}</div>
                        <div className="text-[10px] text-slate-500">login: {c.login}</div>
                      </div>
                      {currentUser.id === c.id && <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-2">
                <button
                  id="btn-header-open-2fa"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onOpen2FAModal();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  <KeyRound className="h-3.5 w-3.5 text-blue-400" />
                  <span>Configurar 2FA (Dois Fatores)</span>
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
