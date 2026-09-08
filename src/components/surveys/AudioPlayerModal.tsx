import React, { useState, useEffect } from 'react';
import { Volume2, Play, Pause, RotateCcw, X, Mic, CheckCircle2, Download } from 'lucide-react';
import { InterviewSubmission } from '../../types';
import { exportSingleAudio } from '../../utils/audioUtils';

interface AudioPlayerModalProps {
  submission: InterviewSubmission | null;
  onClose: () => void;
}

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({ submission, onClose }) => {
  if (!submission) return null;

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const duration = submission.audioGravacao?.duracaoSegundos || 120;

  const handleDownload = async () => {
    try {
      await exportSingleAudio(submission);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao exportar gravação.');
    }
  };

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-ui bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-ui pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary-soft border border-accent-primary-soft-border text-accent-primary">
              <Volume2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">
                Gravação de Áudio da Entrevista
              </h3>
              <p className="text-[11px] text-muted">
                Arquivo: {submission.audioGravacao?.nomeArquivo || 'gravacao_audio.wav'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Metadata info */}
        <div className="mt-4 rounded-xl bg-surface-card border border-ui p-3 text-xs">
          <div className="grid grid-cols-2 gap-2 text-secondary">
            <div>
              <span className="font-semibold text-muted">Pesquisa:</span> {submission.pesquisaNome}
            </div>
            <div>
              <span className="font-semibold text-muted">Cód:</span> {submission.codigoPesquisa}
            </div>
            <div>
              <span className="font-semibold text-muted">Pesquisador:</span> {submission.pesquisadorNome}
            </div>
            <div>
              <span className="font-semibold text-muted">Data:</span> {new Date(submission.dataHora).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Audio Waveform visualization */}
        <div className="mt-6 rounded-xl border border-ui bg-surface-app p-5 text-primary">
          <div className="flex h-16 items-end justify-between gap-1 px-2">
            {Array.from({ length: 36 }).map((_, idx) => {
              const activeRatio = progress / duration;
              const isPassed = idx / 36 <= activeRatio;
              // Pseudorandom organic wave bar height
              const height = 15 + ((idx * 7 + 13) % 45);

              return (
                <div
                  key={idx}
                  className={`w-1.5 rounded-full transition-all duration-300 ${
                    isPassed
                      ? 'bg-accent-primary-solid shadow-sm shadow-emerald-500/50'
                      : 'bg-surface-raised'
                  }`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>

          {/* Time & Progress bar */}
          <div className="mt-4 flex items-center justify-between text-xs font-mono text-muted">
            <span>{formatSeconds(progress)}</span>
            <span>{formatSeconds(duration)}</span>
          </div>

          {/* Player controls */}
          <div className="mt-3 flex items-center justify-center gap-4">
            <button
              onClick={() => setProgress(0)}
              title="Reiniciar"
              className="rounded-full p-2 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary-solid text-on-accent shadow-lg shadow-emerald-900/40 transition hover:bg-accent-primary-solid-hover active:scale-95"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
            </button>

            <div className="flex items-center gap-1 text-xs text-muted">
              <Mic className="h-3.5 w-3.5 text-accent-success" />
              <span>44.1 kHz • WAV</span>
            </div>
          </div>
        </div>

        {/* Transcription snippet */}
        {submission.audioGravacao?.transcricaoTrecho && (
          <div className="mt-4 rounded-xl border border-ui bg-surface-card p-3 text-xs">
            <span className="font-bold text-secondary">
              Transcrição Fonética Registrada:
            </span>
            <p className="mt-1 italic text-muted">
              "{submission.audioGravacao.transcricaoTrecho}"
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg border border-accent-purple-soft-border bg-accent-purple-soft px-3.5 py-2 text-xs font-bold text-accent-purple hover:bg-accent-purple-soft transition-colors shadow-xs"
            title="Exportar esta gravação individualmente (.wav)"
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-accent-success" />
                <span className="text-accent-success">Download Concluído</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Exportar Gravação (.WAV)</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="rounded-lg border border-ui bg-surface-raised px-4 py-2 text-xs font-bold text-primary hover:bg-surface-hover hover:text-primary transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
