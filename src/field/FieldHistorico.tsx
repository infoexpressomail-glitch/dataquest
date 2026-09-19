import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { InterviewSubmission } from '../types';
import { AudioPlayerModal } from '../components/surveys/AudioPlayerModal';
import { GeoMapModal } from '../components/surveys/GeoMapModal';
import { FieldSession } from './fieldTypes';
import { History, Mic, MapPin, Clock, Inbox, Download } from 'lucide-react';
import './fieldMobile.css';

interface FieldHistoricoProps {
  /** Sessão autenticada no sub-app (opcional — usa o contexto quando ausente). */
  session?: FieldSession;
}

/**
 * Histórico do sub-app: lista APENAS as coletas do pesquisador logado.
 * Redesign mobile-first: cartões em vez de tabela, mantendo áudio e GPS.
 */
export const FieldHistorico: React.FC<FieldHistoricoProps> = ({ session }) => {
  const { currentUser: ctxUser, submissions } = useApp();

  const currentUser = session?.user ?? ctxUser;

  const [selectedAudioSub, setSelectedAudioSub] = useState<InterviewSubmission | null>(null);
  const [selectedGeoSub, setSelectedGeoSub] = useState<InterviewSubmission | null>(null);

  const mySubmissions = submissions
    .filter((sub) => sub.pesquisadorId === currentUser.id)
    .sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || ''));

  const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');

  const fmtDuration = (sec?: number) => (sec ? `${Math.round(sec / 60)}min ${sec % 60}s` : '—');

  return (
    <div className="field-stack">
      <div className="field-card" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
        <span className="field-survey-icon" aria-hidden="true">
          <History className="h-5 w-5" />
        </span>
        <div>
          <div className="field-text-sm" style={{ fontWeight: 800 }}>
            Histórico das minhas coletas
          </div>
          <div className="field-text-xs field-text-muted">
            {mySubmissions.length} registro(s) realizados por você.
          </div>
        </div>
      </div>

      {mySubmissions.length === 0 ? (
        <div className="field-empty">
          <div className="field-empty-icon">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="field-text-sm" style={{ fontWeight: 800 }}>
            Nenhuma coleta sua ainda
          </div>
          <div className="field-text-xs field-text-muted">
            Quando você concluir entrevistas, elas aparecerão aqui com protocolo, áudio e
            geolocalização.
          </div>
        </div>
      ) : (
        mySubmissions.map((sub) => (
          <div className="field-survey-card" key={sub.id}>
            <div className="field-survey-top">
              <div style={{ minWidth: 0 }}>
                <span className="field-survey-code">{sub.codigoPesquisa}</span>
                <div className="field-survey-name">{sub.pesquisaNome}</div>
              </div>
              <span
                className={`field-status-pill ${sub.status === 'concluida' ? 'is-online' : 'is-offline'}`}
                style={{ flexShrink: 0 }}
              >
                {sub.status}
              </span>
            </div>

            <div className="field-survey-meta">
              <span>
                <Clock className="h-3.5 w-3.5" />
                {fmtDate(sub.dataHora)}
              </span>
              <span>Duração: {fmtDuration(sub.audioGravacao?.duracaoSegundos)}</span>
            </div>

            <div className="field-actions-row">
              {sub.audioGravacao && (
                <button
                  type="button"
                  onClick={() => setSelectedAudioSub(sub)}
                  className="field-btn field-btn-ghost"
                  style={{ flex: 1 }}
                >
                  <Mic className="h-4 w-4" /> Ouvir
                </button>
              )}
              {sub.geolocalizacao && (
                <button
                  type="button"
                  onClick={() => setSelectedGeoSub(sub)}
                  className="field-btn field-btn-ghost"
                  style={{ flex: 1 }}
                >
                  <MapPin className="h-4 w-4" /> GPS
                </button>
              )}
              {sub.audioGravacao?.audioUrl && (
                <a
                  href={sub.audioGravacao.audioUrl}
                  download={sub.audioGravacao.nomeArquivo}
                  className="field-btn field-btn-ghost"
                  style={{ flex: '0 0 auto' }}
                  title="Baixar áudio"
                  aria-label="Baixar áudio"
                >
                  <Download className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        ))
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
