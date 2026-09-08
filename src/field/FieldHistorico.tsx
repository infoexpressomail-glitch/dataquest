import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { InterviewSubmission } from '../types';
import { AudioPlayerModal } from '../components/surveys/AudioPlayerModal';
import { GeoMapModal } from '../components/surveys/GeoMapModal';
import { FieldSession } from './fieldTypes';
import { History, Mic, MapPin, Clock, Inbox, Download } from 'lucide-react';

interface FieldHistoricoProps {
  /** Sessão autenticada no sub-app (opcional — usa o contexto quando ausente). */
  session?: FieldSession;
}

/**
 * Histórico do sub-app: lista APENAS as coletas do pesquisador logado.
 */
export const FieldHistorico: React.FC<FieldHistoricoProps> = ({ session }) => {
  const { currentUser: ctxUser, submissions } = useApp();

  const currentUser = session?.user ?? ctxUser;

  const [selectedAudioSub, setSelectedAudioSub] = useState<InterviewSubmission | null>(null);
  const [selectedGeoSub, setSelectedGeoSub] = useState<InterviewSubmission | null>(null);

  const mySubmissions = submissions
    .filter((sub) => sub.pesquisadorId === currentUser.id)
    .sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || ''));

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('pt-BR') : '—';

  const fmtDuration = (sec?: number) =>
    sec ? `${Math.round(sec / 60)}min ${sec % 60}s` : '—';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ui bg-surface-card p-5 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-primary">Histórico das minhas coletas</h2>
            <p className="text-[10px] text-muted">
              {mySubmissions.length} registro(s) realizados por você.
            </p>
          </div>
        </div>
      </div>

      {mySubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ui bg-surface p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-muted">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-primary">
            Nenhuma coleta sua ainda
          </h3>
          <p className="mt-1 max-w-sm text-[11px] text-muted leading-relaxed">
            Quando você concluir entrevistas, elas aparecerão aqui com protocolo,
            áudio e geolocalização.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ui bg-surface-card shadow-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ui text-[10px] uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-bold">Protocolo</th>
                <th className="px-4 py-3 font-bold">Pesquisa</th>
                <th className="px-4 py-3 font-bold">Data/Hora</th>
                <th className="px-4 py-3 font-bold">Duração</th>
                <th className="px-4 py-3 font-bold">Áudio</th>
                <th className="px-4 py-3 font-bold">GPS</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mySubmissions.map((sub) => (
                <tr key={sub.id} className="border-b border-subtle last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-3 font-mono text-accent-primary font-semibold">
                    {sub.codigoPesquisa}
                  </td>
                  <td className="px-4 py-3 text-primary font-semibold max-w-[180px] truncate">
                    {sub.pesquisaNome}
                  </td>
                  <td className="px-4 py-3 text-secondary whitespace-nowrap">
                    {fmtDate(sub.dataHora)}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {fmtDuration(sub.audioGravacao?.duracaoSegundos)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {sub.audioGravacao ? (
                      <button
                        onClick={() => setSelectedAudioSub(sub)}
                        className="inline-flex items-center gap-1 rounded-md bg-accent-purple-soft text-accent-purple border border-accent-purple-soft-border px-2 py-1 text-[10px] font-bold hover:opacity-90"
                      >
                        <Mic className="h-3 w-3" /> Ouvir
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {sub.geolocalizacao ? (
                      <button
                        onClick={() => setSelectedGeoSub(sub)}
                        className="inline-flex items-center gap-1 rounded-md bg-accent-info-soft text-accent-info border border-accent-info-soft-border px-2 py-1 text-[10px] font-bold hover:opacity-90"
                      >
                        <MapPin className="h-3 w-3" /> Ver
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        sub.status === 'concluida'
                          ? 'bg-accent-success-soft text-accent-success'
                          : sub.status === 'cancelada'
                          ? 'bg-accent-danger-soft text-accent-danger'
                          : 'bg-accent-warning-soft text-accent-warning'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {sub.audioGravacao?.audioUrl && (
                      <a
                        href={sub.audioGravacao.audioUrl}
                        download={sub.audioGravacao.nomeArquivo}
                        className="inline-flex items-center gap-1 text-accent-primary hover:underline"
                        title="Baixar áudio"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AudioPlayerModal submission={selectedAudioSub} onClose={() => setSelectedAudioSub(null)} />
      <GeoMapModal
        submissions={selectedGeoSub ? [selectedGeoSub] : []}
        surveyName={selectedGeoSub?.pesquisaNome || ''}
        onClose={() => setSelectedGeoSub(null)}
      />
    </div>
  );
};
