import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BarChart3, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FieldLogin } from '../field/FieldLogin';
import { FieldSession } from '../field/fieldTypes';
import { filterResearcherVisibleSurveys } from '../utils/researcherUtils';
import { resyncFieldSurveys } from '../services/fieldSyncService';
import {
  clearFieldSession,
  loadFieldSession,
  persistFieldSession,
} from '../services/fieldSessionStore';
import { saveOfflineSubmissionToDB } from '../utils/indexedDBStorage';
import type { AnswerItem, AnswerMap, InterviewSubmission, Survey } from '../types';
import { TotemSurvey } from '../components/surveys/totem/TotemSurvey';
import { getTotemSurveyCode } from './totemRoute';
import {
  applyTotemPersistenceUrlOverride,
  clearTotemSession,
  isTotemPersistenceEnabled,
  loadTotemSession,
  persistTotemSession,
  setTotemPersistenceEnabled,
} from './totemSessionStore';
import { recoverActiveTotemSession } from './totemStatsStore';
import { TotemCollectionReport } from './TotemCollectionReport';

interface TotemAppProps {
  /** Sai do Modo Totem e volta ao ambiente de gestão. */
  onExit: () => void;
}

/**
 * TotemApp — casca do Modo Totem (tablet em quiosque).
 *
 * Reaproveita a sessão do Modo Pesquisador (mesmo login de campo persistido em
 * sessionStorage) para saber QUAIS pesquisas o tablet pode exibir. A partir daí
 * a experiência é totalmente desassistida: o respondente só toca nas opções e
 * o quiosque conduz a pesquisa do início ao fim.
 *
 * A submissão reaproveita exatamente o mesmo pipeline do restante do sistema
 * (AppContext.addSubmission → servidor/IndexedDB), sem criar um caminho novo.
 *
 * A sessão do pesquisador é persistida em localStorage (opção "Login do
 * tablet"), para o tablet não pedir login depois de reiniciar. A persistência
 * pode ser desligada pelo operador ou por `?sessao=temporaria`.
 */
export const TotemApp: React.FC<TotemAppProps> = ({ onExit }) => {
  const { addSubmission, effectiveOnline } = useApp();

  // Aplica um eventual `?sessao=` da URL como preferência do aparelho e carrega
  // a sessão persistida no totem; sem ela, tenta a sessão de campo da aba atual.
  const [session, setSession] = useState<FieldSession | null>(() => {
    applyTotemPersistenceUrlOverride();
    return loadTotemSession() ?? loadFieldSession();
  });
  const [persistSession, setPersistSession] = useState<boolean>(() => isTotemPersistenceEnabled());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const targetCode = useMemo(() => getTotemSurveyCode(), []);

  // Sessão de coleta órfã (tablet recarregado no meio de uma coleta) entra no
  // relatório como abandonada. A recuperação é idempotente.
  useEffect(() => {
    recoverActiveTotemSession();
  }, []);
  // Captura a geolocalização uma única vez (o totem é fixo).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        (coordsRef.current = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => undefined,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }, []);

  // Re-sincroniza as pesquisas ao abrir o quiosque (mantém o tablet atualizado).
  useEffect(() => {
    if (!session) return;
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setResyncing(true);
        return resyncFieldSurveys(session);
      })
      .then((updated) => {
        if (!active) return;
        setSession(updated);
        persistFieldSession(updated);
      })
      .catch(() => undefined)
      .finally(() => active && setResyncing(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSurveys = useMemo(
    () => (session ? filterResearcherVisibleSurveys(session.surveys, session.user) : []),
    [session]
  );

  // Escolha da pesquisa do quiosque:
  //   1) ?pesquisa=CODE na URL
  //   2) a pesquisa marcada com layoutStyle = 'TOTEM'
  //   3) a primeira pesquisa ativa vinculada
  const target: Survey | undefined = useMemo(() => {
    if (selectedId) {
      const chosen = activeSurveys.find((s) => s.id === selectedId);
      if (chosen) return chosen;
    }
    if (targetCode) {
      const byCode = activeSurveys.find(
        (s) =>
          s.id === targetCode || s.codigo?.toLowerCase() === targetCode.toLowerCase()
      );
      if (byCode) return byCode;
    }
    return activeSurveys.find((s) => s.layoutStyle === 'TOTEM') || activeSurveys[0];
  }, [activeSurveys, selectedId, targetCode]);

  const handleAuthenticated = useCallback((s: FieldSession) => {
    setSession(s);
    // Sempre guarda a sessão da aba (Modo Pesquisador) e, se a opção estiver
    // ligada, também no localStorage para sobreviver a reinícios do tablet.
    persistFieldSession(s);
    if (isTotemPersistenceEnabled()) persistTotemSession(s);
  }, []);

  const handleLogout = useCallback(() => {
    clearFieldSession();
    clearTotemSession();
    setSession(null);
    setSelectedId(null);
    setError(null);
  }, []);

  // Liga/desliga a persistência da sessão no tablet. Ao ligar, guarda a sessão
  // atual; ao desligar, apaga o que estava salvo em localStorage.
  const handleTogglePersist = useCallback(() => {
    const next = !isTotemPersistenceEnabled();
    setTotemPersistenceEnabled(next);
    setPersistSession(next);
    if (next && session) persistTotemSession(session);
  }, [session]);

  const handleResync = useCallback(async () => {
    if (!session) return;
    setResyncing(true);
    setError(null);
    try {
      const updated = await resyncFieldSurveys(session);
      setSession(updated);
      persistFieldSession(updated);
    } catch (e) {
      setError(e?.message || 'Falha ao atualizar as pesquisas. Tente novamente.');
    } finally {
      setResyncing(false);
    }
  }, [session]);

  const handleSubmit = useCallback(
    async (answers: AnswerMap, comments: Record<string, string>) => {
      if (!target || !session) return;

      const formattedAnswers: AnswerItem[] = Object.entries(answers).map(
        ([perguntaId, resposta]) => {
          const q = target.perguntas.find((p) => p.id === perguntaId);
          const comentario = comments[perguntaId];
          return {
            perguntaId,
            perguntaCodigo: q?.codigo || 'Q',
            perguntaEnunciado: q?.enunciado || '',
            resposta: Array.isArray(resposta) ? (resposta as string[]) : String(resposta ?? ''),
            ...(comentario ? { comentario } : {}),
          };
        }
      );

      const newSub: InterviewSubmission = {
        id: `sub_${Date.now()}`,
        pesquisaId: target.id,
        codigoPesquisa: `${target.codigo}-${Math.floor(100 + Math.random() * 900)}`,
        pesquisaNome: target.nome,
        pesquisadorId: session.user.id,
        pesquisadorNome: session.user.nome,
        dataHora: new Date().toISOString(),
        status: 'concluida',
        respostas: formattedAnswers,
        geolocalizacao: {
          latitude: coordsRef.current?.latitude ?? 0,
          longitude: coordsRef.current?.longitude ?? 0,
          bairro: 'Modo Totem',
          cidade: '—',
        },
      };

      addSubmission(newSub);

      if (!effectiveOnline) {
        await saveOfflineSubmissionToDB(newSub);
        setSavedOffline(true);
      } else {
        setSavedOffline(false);
      }
    },
    [addSubmission, effectiveOnline, session, target]
  );

  // Sem sessão de campo → login do pesquisador (mesma porta do Modo Pesquisador).
  if (!session) {
    return <FieldLogin onAuthenticated={handleAuthenticated} onExit={onExit} />;
  }

  const operatorSlot = (
    <div className="totem-operator">
      {activeSurveys.length > 1 && (
        <select
          value={target?.id || ''}
          onChange={(e) => setSelectedId(e.target.value)}
          aria-label="Selecionar pesquisa do totem"
        >
          {activeSurveys.map((s) => (
            <option key={s.id} value={s.id}>
              {s.codigo} — {s.nome}
            </option>
          ))}
        </select>
      )}
      <button type="button" onClick={() => setReportOpen(true)} aria-label="Abrir relatório de coletas do totem">
        <BarChart3 size={14} />
        <span>Relatório</span>
      </button>
      <button
        type="button"
        onClick={handleTogglePersist}
        className={persistSession ? 'is-active' : ''}
        aria-pressed={persistSession}
        title={
          persistSession
            ? 'Login guardado no tablet (localStorage). Toque para desativar.'
            : 'Login só nesta sessão. Toque para manter no tablet.'
        }
      >
        <ShieldCheck size={14} />
        <span>{persistSession ? 'Login do tablet' : 'Login da sessão'}</span>
      </button>
      <button type="button" onClick={handleResync} disabled={resyncing} aria-label="Atualizar pesquisas">
        <RefreshCw size={14} className={resyncing ? 'animate-spin' : ''} />
        <span>Atualizar</span>
      </button>
      <button type="button" onClick={handleLogout} aria-label="Sair do Modo Totem">
        <LogOut size={14} />
        <span>Sair</span>
      </button>
    </div>
  );

  // Sessão válida, mas nenhuma pesquisa disponível para o quiosque.
  if (!target) {
    return (
      <div className="mp-root totem-root" style={{ position: 'fixed', inset: 0, overflow: 'auto' }}>
        <div className="totem-empty" style={{ gap: 16 }}>
          <div className="totem-confirm-icon">
            <AlertTriangle size={40} />
          </div>
          <h1>Nenhuma pesquisa disponível</h1>
          <p>
            Não há pesquisas ativas vinculadas a este login. Use “Atualizar” para baixar as
            pesquisas liberadas ou saia do Modo Totem para revisar os vínculos.
          </p>
          {error && <p style={{ color: '#b45309', fontWeight: 700 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" className="totem-btn totem-btn-primary" onClick={handleResync} disabled={resyncing}>
              <RefreshCw size={20} />
              <span>{resyncing ? 'Atualizando…' : 'Atualizar pesquisas'}</span>
            </button>
            <button type="button" className="totem-btn totem-btn-ghost" onClick={onExit}>
              <LogOut size={20} />
              <span>Sair do Modo Totem</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <TotemSurvey
        key={target.id}
        survey={target}
        onSubmit={handleSubmit}
        savedOffline={savedOffline}
        operatorSlot={operatorSlot}
      />
      {reportOpen && <TotemCollectionReport onClose={() => setReportOpen(false)} />}
    </>
  );
};

export default TotemApp;
