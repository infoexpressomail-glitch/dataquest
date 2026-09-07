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
          className={`inline-flex items-center gap-1.5 rounded-lg border border-accent-info-soft-border bg-accent-info-soft px-2.5 py-1 text-[11px] font-bold text-accent-info hover:bg-accent-info-soft transition-colors ${className}`}
        >
          <Smartphone className="h-3.5 w-3.5 animate-pulse text-accent-info" />
          <span>Instalar App Mobile</span>
        </button>
      );
    }

    if (variant === 'minimal') {
      return (
        <button
          onClick={handleClick}
          title="Instalar App no dispositivo"
          className={`flex items-center gap-2 rounded-lg bg-accent-primary-solid px-3 py-1.5 text-xs font-bold text-on-accent shadow-md hover:bg-accent-primary-solid-hover transition-colors ${className}`}
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
        className={`flex items-center gap-1.5 rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft px-3 py-1.5 text-xs font-semibold text-accent-primary hover:bg-accent-primary-soft hover:text-primary transition-colors ${className}`}
      >
        <Smartphone className="h-3.5 w-3.5 text-accent-primary" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-ui bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ui pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Instalar DataQuest PWA</h3>
                  <p className="text-[11px] text-muted">Acesso rápido na tela inicial do celular</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="rounded-lg p-1 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-secondary">
              {isIOS ? (
                <>
                  <p className="text-secondary">
                    Para instalar o aplicativo no <strong>iPhone</strong> ou <strong>iPad</strong>:
                  </p>
                  <div className="space-y-2 rounded-xl bg-surface-raised p-3.5 border border-ui">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-primary-soft text-accent-primary font-bold text-[10px]">
                        1
                      </div>
                      <p>
                        Toque no botão de <strong>Compartilhar</strong> (<Share2 className="inline h-3.5 w-3.5 text-accent-primary" />) na barra inferior do navegador Safari.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-primary-soft text-accent-primary font-bold text-[10px]">
                        2
                      </div>
                      <p>
                        Role a lista e toque em <strong>"Adicionar à Tela de Início"</strong> (<PlusSquare className="inline h-3.5 w-3.5 text-accent-success" />).
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-primary-soft text-accent-primary font-bold text-[10px]">
                        3
                      </div>
                      <p>Confirme tocando em <strong>Adicionar</strong> no canto superior direito.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-secondary">
                    Para instalar no <strong>Android</strong> ou <strong>Computador</strong>:
                  </p>
                  <div className="space-y-2 rounded-xl bg-surface-raised p-3.5 border border-ui">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-primary-soft text-accent-primary font-bold text-[10px]">
                        1
                      </div>
                      <p>
                        No menu do navegador (três pontos ⋮ no canto superior), selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-primary-soft text-accent-primary font-bold text-[10px]">
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
                  className="w-full rounded-lg bg-accent-primary-solid py-2 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 hover:bg-accent-primary-solid-hover transition-colors"
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
