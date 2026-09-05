import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getTranslation } from '../../i18n';
import {
  Lock,
  User,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  Smartphone,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Sun,
  Moon,
  Sparkles,
  Info,
} from 'lucide-react';
import { Language } from '../../types';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const {
    login,
    collaborators,
    profiles,
    language,
    setLanguage,
    darkMode,
    setDarkMode,
  } = useApp();

  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(true);

  const { isInstallable, isInstalled, install, isMobile, isIOS } = usePWAInstall();

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginInput.trim() || !senhaInput.trim()) {
      setErrorMessage('Por favor, informe seu login e sua senha de acesso.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = login(loginInput, senhaInput);
      setIsLoading(false);

      if (result.success) {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setErrorMessage(result.error || 'Credenciais inválidas.');
      }
    }, 300);
  };

  const handleSelectQuickAccount = (loginValue: string, senhaValue: string) => {
    setLoginInput(loginValue);
    setSenhaInput(senhaValue);
    setErrorMessage(null);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Top bar with Theme & Language */}
      <header className="flex items-center justify-between px-6 py-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-900/40">
            Q
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white">
              Data<span className="text-blue-500">Quest</span>
            </span>
            <span className="ml-2 text-xs text-slate-400 hidden sm:inline">
              Sistema de Gestão de Pesquisas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language selection */}
          <div className="flex items-center bg-[#16171d] border border-slate-800 rounded-lg p-1 text-xs">
            {(['pt', 'en', 'es'] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 rounded font-semibold uppercase transition-colors ${
                  language === lang
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Dark / Light mode toggle */}
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            title="Alternar Modo Escuro / Claro"
            className="p-2 rounded-lg bg-[#16171d] border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md space-y-5">
          {/* PWA Mobile Install Banner (if installable or on mobile) */}
          {!isInstalled && isInstallable && (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-950/30 p-3.5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Instalar App no Celular</div>
                  <div className="text-[11px] text-slate-400">Acesso offline e gravação de campo</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => install()}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors shrink-0"
              >
                Instalar
              </button>
            </div>
          )}

          {/* Login Form Box */}
          <div className="rounded-3xl border border-slate-800 bg-[#16171d] p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            <div className="text-center space-y-1.5 mb-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-900/40 mb-3">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                Acesso ao Sistema
              </h1>
              <p className="text-xs text-slate-400">
                Insira o seu login e a senha definidos pelo administrador para autenticar no DataQuest.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="font-medium">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Login Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Login de Acesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder="Ex: rodrigo.pesquisador ou carlos.admin"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full rounded-xl border border-slate-800 bg-[#111218] py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Senha
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={senhaInput}
                    onChange={(e) => setSenhaInput(e.target.value)}
                    placeholder="Sua senha cadastrada"
                    className="w-full rounded-xl border border-slate-800 bg-[#111218] py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Validando credenciais...
                  </span>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Accounts Selection */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Contas de Demonstração
                </span>
                <button
                  type="button"
                  onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                  className="text-[10px] text-blue-400 hover:underline font-semibold"
                >
                  {showDemoAccounts ? 'Ocultar' : 'Exibir'}
                </button>
              </div>

              {showDemoAccounts && (
                <div className="space-y-1.5">
                  {collaborators.map((c) => {
                    const profile = profiles.find((p) => p.id === c.perfilAcessoId);
                    const isSelected = loginInput === c.login;
                    const isPesquisador =
                      profile?.id === 'prof_pesq' || profile?.name.toLowerCase().includes('pesquisador');

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectQuickAccount(c.login, c.senha || 'pesq123')}
                        className={`w-full flex items-center justify-between p-2 rounded-xl border text-left text-xs transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-600/15 text-white font-bold'
                            : 'border-slate-800 bg-[#111218] text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-semibold text-white truncate flex items-center gap-1.5">
                            <span>{c.nome}</span>
                            {isPesquisador && (
                              <span className="text-[9px] rounded px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Pesquisador
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            login: <strong className="text-slate-200">{c.login}</strong> • senha: <strong className="text-slate-200">{c.senha}</strong>
                          </div>
                        </div>
                        <span className="text-[10px] text-blue-400 shrink-0 font-medium">
                          Usar
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="py-4 text-center text-[11px] text-slate-500 z-10">
        <div className="flex items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Servidores Seguros Online</span>
          <span>•</span>
          <span>DataQuest v2.4.1-stable</span>
        </div>
      </footer>
    </div>
  );
};
