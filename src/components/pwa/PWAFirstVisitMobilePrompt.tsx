import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Smartphone, Download, ArrowRight, CheckCircle2, Shield, Mic, WifiOff, X } from 'lucide-react';

interface PWAFirstVisitMobilePromptProps {
  onProceedToLogin: () => void;
}

export const PWAFirstVisitMobilePrompt: React.FC<PWAFirstVisitMobilePromptProps> = ({
  onProceedToLogin,
}) => {
  const { isInstallable, isInstalled, isIOS, isMobile, install } = usePWAInstall();
  const [isOpen, setIsOpen] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    // If already installed in standalone mode, proceed straight to login
    if (isInstalled) {
      return;
    }

    // Check if prompt was dismissed in this browser
    const dismissed = localStorage.getItem('dataquest_pwa_first_visit_dismissed');
    if (!dismissed) {
      // Show on first visit, especially prioritized for mobile devices or any installable browser
      setIsOpen(true);
    }
  }, [isInstalled]);

  if (!isOpen || isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (installed) {
        localStorage.setItem('dataquest_pwa_first_visit_dismissed', 'true');
        setIsOpen(false);
        onProceedToLogin();
      }
    } else if (isIOS) {
      setShowIOSSteps(true);
    } else {
      setShowIOSSteps(true);
    }
  };

  const handleDismissAndProceed = () => {
    localStorage.setItem('dataquest_pwa_first_visit_dismissed', 'true');
    setIsOpen(false);
    onProceedToLogin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-blue-500/30 bg-[#121625] p-6 shadow-2xl">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-emerald-600/20 blur-3xl" />

        <div className="relative z-10 space-y-5">
          {/* Header with App Brand */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-2 shadow-xl shadow-blue-900/50">
                <img
                  src="/icon.svg"
                  alt="DataQuest Logo"
                  className="h-10 w-10 drop-shadow-md"
                  onError={(e) => {
                    // Fallback to Smartphone icon if image not yet loaded
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/30">
                  <Smartphone className="h-3 w-3" />
                  App PWA Mobile Disponível
                </span>
                <h2 className="mt-1 text-lg font-black text-white sm:text-xl">
                  Instalar DataQuest no Celular
                </h2>
              </div>
            </div>

            <button
              onClick={handleDismissAndProceed}
              title="Fechar e ir para login"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Bem-vindo ao <strong>DataQuest</strong>. Para realizar entrevistas em campo com gravação de áudio contínua, geolocalização por GPS e sincronização mesmo sem internet, recomendamos instalar o aplicativo no seu dispositivo móvel.
          </p>

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5">
              <div className="flex items-center gap-2 text-emerald-400">
                <WifiOff className="h-4 w-4" />
                <span className="text-[11px] font-bold text-white">Coleta 100% Offline</span>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">Armazena entrevistas no aparelho sem conexão</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5">
              <div className="flex items-center gap-2 text-purple-400">
                <Mic className="h-4 w-4" />
                <span className="text-[11px] font-bold text-white">Gravação de Áudio</span>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">Grava conversas de auditoria automaticamente</p>
            </div>
          </div>

          {/* iOS Safari Instruction card if clicked or if iOS */}
          {showIOSSteps && (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-950/40 p-4 space-y-2 text-xs text-slate-200 animate-in slide-in-from-top-2">
              <h4 className="font-bold text-blue-300 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4" />
                Como instalar no seu celular:
              </h4>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-300">
                <li>
                  No navegador Safari / Chrome, toque no botão <strong>Compartilhar</strong> ou no menu de <strong>3 pontos</strong>.
                </li>
                <li>
                  Toque em <strong>"Adicionar à Tela de Início"</strong> ou <strong>"Instalar aplicativo"</strong>.
                </li>
                <li>Abra o ícone criado na tela inicial para entrar direto!</li>
              </ol>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3 text-xs font-black text-white shadow-xl shadow-blue-900/40 hover:from-blue-500 hover:to-cyan-500 transition-all active:scale-[0.99]"
            >
              <Download className="h-4 w-4" />
              <span>Instalar Aplicativo no Celular</span>
            </button>

            <button
              onClick={handleDismissAndProceed}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <span>Continuar para a Tela de Login</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
