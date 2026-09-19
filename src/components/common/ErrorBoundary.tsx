import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Error Boundary global da aplicação.
 *
 * Antes desta correção, não existia nenhum Error Boundary no projeto: um erro de
 * render em QUALQUER componente (ex.: o bug de hooks do AudioPlayerModal, ou o
 * AudioExportModal sem `surveys`/`submissions`, ambos corrigidos nesta mesma
 * rodada) derrubava a aplicação inteira para uma tela branca, sem log e sem
 * chance de recuperação — especialmente grave num app de coleta de campo, onde
 * isso pode significar perder uma entrevista em andamento.
 *
 * Não substitui corrigir os bugs na origem (o ideal é nunca chegar aqui), mas
 * garante que um erro inesperado em uma tela não derrube o app inteiro sem
 * explicação nem chance de voltar.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erro não tratado capturado:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface p-6">
          <div className="w-full max-w-md rounded-2xl border border-accent-danger-soft-border bg-surface-card p-6 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-danger-soft text-accent-danger">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="text-sm font-black text-primary">Algo deu errado nesta tela</h1>
            <p className="mt-2 text-xs text-muted">
              Um erro inesperado interrompeu a exibição. Seus dados salvos (rascunhos e coletas
              pendentes) continuam guardados no dispositivo. Tente recarregar a página.
            </p>
            {this.state.error.message && (
              <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-left font-mono text-[10px] text-muted break-words">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReload}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-xs font-bold text-white hover:opacity-90 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
