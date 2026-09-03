import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, Share2, PlusSquare, X } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'hero' | 'minimal' | 'badge';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed and running in standalone mode, do not show
  if (isInstalled) {
    return null;
  }

  // Common trigger for Android / Chromium or fallback
  const handleClick = () => {
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Desktop without prompt or generic browser: show helper modal
      setShowIOSGuide(true);
    }
  };

  const renderContent = () => {
    if (variant === 'badge') {
      return (
        <button
          onClick={handleClick}
          title="Instalar DataQuest PWA no dispositivo"
          className={`inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-400 hover:bg-cyan-500/20 transition-colors ${className}`}
        >
          <Smartphone className="h-3.5 w-3.5 animate-pulse text-cyan-400" />
          <span>Instalar App Mobile</span>
        </button>
      );
    }

    if (variant === 'minimal') {
      return (
        <button
          onClick={handleClick}
          title="Instalar App no dispositivo"
          className={`flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors ${className}`}
        >
          <Download className="h-3.5 w-3.5" />
          <span>Instalar App</span>
        </button>
      );
    }

    // Default header / bar style
    return (
      <button
        onClick={handleClick}
        title="Instalar aplicativo móvel (PWA)"
        className={`flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-600/20 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 hover:text-white transition-colors ${className}`}
      >
        <Smartphone className="h-3.5 w-3.5 text-blue-400" />
        <span className="hidden sm:inline">Instalar</span>
        <span className="sm:hidden">App</span>
      </button>
    );
  };

  return (
    <>
      {renderContent()}

      {/* Guide Modal for iOS Safari and other browsers */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-[#16171d] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Instalar DataQuest PWA</h3>
                  <p className="text-[11px] text-slate-400">Acesso rápido na tela inicial do celular</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-300">
              {isIOS ? (
                <>
                  <p className="text-slate-300">
                    Para instalar o aplicativo no <strong>iPhone</strong> ou <strong>iPad</strong>:
                  </p>
                  <div className="space-y-2 rounded-xl bg-slate-900/80 p-3.5 border border-slate-800">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-blue-400 font-bold text-[10px]">
                        1
                      </div>
                      <p>
                        Toque no botão de <strong>Compartilhar</strong> (<Share2 className="inline h-3.5 w-3.5 text-blue-400" />) na barra inferior do navegador Safari.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-blue-400 font-bold text-[10px]">
                        2
                      </div>
                      <p>
                        Role a lista e toque em <strong>"Adicionar à Tela de Início"</strong> (<PlusSquare className="inline h-3.5 w-3.5 text-emerald-400" />).
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-blue-400 font-bold text-[10px]">
                        3
                      </div>
                      <p>Confirme tocando em <strong>Adicionar</strong> no canto superior direito.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-300">
                    Para instalar no <strong>Android</strong> ou <strong>Computador</strong>:
                  </p>
                  <div className="space-y-2 rounded-xl bg-slate-900/80 p-3.5 border border-slate-800">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-blue-400 font-bold text-[10px]">
                        1
                      </div>
                      <p>
                        No menu do navegador (três pontos ⋮ no canto superior), selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-blue-400 font-bold text-[10px]">
                        2
                      </div>
                      <p>O DataQuest funcionará com ícone próprio na sua tela e suporte offline completo!</p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-colors"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
