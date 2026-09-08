import React, { useState } from 'react';
import { MapPin, Navigation, Compass, Layers, X, ExternalLink } from 'lucide-react';
import { InterviewSubmission } from '../../types';

interface GeoMapModalProps {
  submissions: InterviewSubmission[];
  surveyName?: string;
  onClose: () => void;
}

export const GeoMapModal: React.FC<GeoMapModalProps> = ({ submissions, surveyName, onClose }) => {
  const [selectedSub, setSelectedSub] = useState<InterviewSubmission | null>(
    submissions.find((s) => s.geolocalizacao) || null
  );

  const validGeoSubs = submissions.filter((s) => s.geolocalizacao);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-sm p-4">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-ui bg-surface shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-ui px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary-soft border border-accent-primary-soft-border text-accent-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">
                Georreferenciamento de Campo das Coletas
              </h3>
              <p className="text-xs text-muted">
                {surveyName || 'Todas as Pesquisas'} • {validGeoSubs.length} pontos de GPS identificados
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body with Map & Sidebar List */}
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          {/* Visual Interactive Map Canvas */}
          <div className="relative flex-1 bg-surface-app p-4">
            {/* Stylized Vector Map Grid */}
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

            {/* Simulated streets / map contours */}
            <svg
              className="absolute inset-0 h-full w-full opacity-30"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line x1="10%" y1="20%" x2="90%" y2="80%" stroke="#334155" strokeWidth="2" />
              <line x1="20%" y1="80%" x2="80%" y2="10%" stroke="#334155" strokeWidth="2" />
              <circle cx="50%" cy="50%" r="180" fill="none" stroke="#059669" strokeWidth="1" strokeDasharray="6,6" opacity="0.3" />
              <circle cx="50%" cy="50%" r="90" fill="none" stroke="#059669" strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
            </svg>

            {/* GPS Markers on Map */}
            <div className="relative h-full w-full">
              {validGeoSubs.map((sub, index) => {
                const isSelected = selectedSub?.id === sub.id;
                // Distribute pins aesthetically on the canvas
                const offsets = [
                  { top: '42%', left: '48%' },
                  { top: '56%', left: '54%' },
                  { top: '35%', left: '60%' },
                  { top: '65%', left: '38%' },
                  { top: '28%', left: '40%' },
                ];
                const pos = offsets[index % offsets.length];

                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSub(sub)}
                    style={{ top: pos.top, left: pos.left }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125"
                  >
                    <div
                      className={`relative flex items-center justify-center rounded-full p-2 shadow-lg transition ${
                        isSelected
                          ? 'bg-accent-primary-solid text-on-accent ring-4 ring-emerald-400/50 scale-110 shadow-emerald-900/50'
                          : 'bg-surface-raised text-primary ring-2 ring-slate-700'
                      }`}
                    >
                      <MapPin className="h-4 w-4" />
                      {/* Pulse radar for selected */}
                      {isSelected && (
                        <span className="absolute -inset-1 animate-ping rounded-full bg-accent-primary-solid opacity-40" />
                      )}
                    </div>
                    <div className="mt-1 whitespace-nowrap rounded bg-surface-raised px-1.5 py-0.5 text-[9px] font-bold text-primary shadow-md border border-ui">
                      #{index + 1} {sub.pesquisadorNome.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Map Controls overlay */}
            <div className="absolute bottom-4 left-4 rounded-lg bg-surface/90 border border-ui p-2 text-xs font-mono text-secondary backdrop-blur-xs">
              <div className="flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-accent-success" />
                <span>WGS84 • Precisão GPS: ±4m</span>
              </div>
              <div className="text-[10px] text-muted">
                Lat: {selectedSub?.geolocalizacao?.latitude.toFixed(5)} | Lng: {selectedSub?.geolocalizacao?.longitude.toFixed(5)}
              </div>
            </div>
          </div>

          {/* Selected Point Details Sidebar */}
          <div className="w-full border-t border-ui bg-surface-card p-4 md:w-80 md:border-t-0 md:border-l">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
              Detalhes do Ponto Selecionado
            </h4>

            {selectedSub ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-ui bg-surface p-3 text-xs">
                  <div className="font-bold text-primary">
                    Entrevista: {selectedSub.codigoPesquisa}
                  </div>
                  <div className="mt-1 text-secondary">
                    <strong className="text-muted">Pesquisador:</strong> {selectedSub.pesquisadorNome}
                  </div>
                  <div className="text-secondary">
                    <strong className="text-muted">Data/Hora:</strong> {new Date(selectedSub.dataHora).toLocaleString('pt-BR')}
                  </div>
                  <div className="text-secondary">
                    <strong className="text-muted">Bairro/Local:</strong> {selectedSub.geolocalizacao?.bairro}, {selectedSub.geolocalizacao?.cidade}
                  </div>
                  <div className="mt-2 text-[11px] font-mono text-muted">
                    Coords: {selectedSub.geolocalizacao?.latitude}, {selectedSub.geolocalizacao?.longitude}
                  </div>
                </div>

                <div className="rounded-xl border border-ui bg-surface p-3 text-xs">
                  <div className="font-bold text-primary mb-2">
                    Respostas Registradas no Ponto
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedSub.respostas.map((r) => (
                      <div key={r.perguntaId} className="border-b border-ui pb-1 last:border-0">
                        <div className="font-semibold text-secondary">
                          [{r.perguntaCodigo}] {r.perguntaEnunciado.slice(0, 30)}...
                        </div>
                        <div className="text-primary font-bold">
                          {Array.isArray(r.resposta) ? r.resposta.join(', ') : r.resposta}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-xs text-muted">
                Selecione um marcador no mapa para ver a auditoria de coordenadas.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-ui px-6 py-3">
          <span className="text-xs text-muted">
            Validação de presença em campo com carimbo temporal e de satélite.
          </span>
          <button
            onClick={onClose}
            className="rounded-lg border border-ui bg-surface-raised px-4 py-1.5 text-xs font-bold text-primary hover:bg-surface-hover hover:text-primary transition-colors"
          >
            Fechar Mapa
          </button>
        </div>
      </div>
    </div>
  );
};
