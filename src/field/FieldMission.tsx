import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FieldSession } from './fieldTypes';
import { Survey, InterviewSubmission, GlobalDemographicTarget } from '../types';
import { calculateResearcherIndividualProgress } from '../utils/demographicGoalsHelper';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Inbox,
  MapPin,
  RefreshCw,
  Send,
  Target,
  WifiOff,
} from 'lucide-react';
import './fieldMobile.css';

interface FieldMissionProps {
  session: FieldSession;
  /** Pesquisas ativas liberadas para este login. */
  activeSurveys: Survey[];
  /** Coletas reais do pesquisador logado. */
  researcherSubmissions: InterviewSubmission[];
  /** Coletas feitas hoje. */
  submissionsToday: InterviewSubmission[];
  /** Meta somada das pesquisas ativas. */
  totalMeta: number;
  /** Itens aguardando sincronização (fila offline + IndexedDB). */
  pendingCount: number;
  effectiveOnline: boolean;
  busy: 'load' | 'unload' | null;
  /** Abre a coleta da pesquisa informada. */
  onStartColeta: (surveyId: string) => void;
  /** Abre a tela de sincronização (Carregar / Descarregar). */
  onOpenSync: () => void;
  /** Chama a sincronização (Descarregar coletas) imediatamente. */
  onSendNow: () => void;
  /** Vai para a aba de coletas (todas as pesquisas). */
  onOpenPesquisas: () => void;
}

interface GapItem {
  id: string;
  label: string;
  restante: number;
  cotaAtingida: number;
  cotaAlvo: number;
  percentual: number;
}

function greetingByHour(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Rótulo curto do critério demográfico: "Mulheres · 18 a 25 anos". */
function gapLabel(target: GlobalDemographicTarget): string {
  const c = (target.criterios || {}) as Record<string, string | undefined>;
  const parts: string[] = [];
  const sexo = c.sexo;
  if (sexo && sexo !== 'Todos') {
    if (sexo === 'F' || /fem/i.test(sexo)) parts.push('Mulheres');
    else if (sexo === 'M' || /masc/i.test(sexo)) parts.push('Homens');
    else parts.push(sexo);
  }
  const faixa = c.faixaEtaria;
  if (faixa && faixa !== 'Todas' && faixa !== 'Todos') parts.push(faixa);
  if (parts.length === 0 && c.bairro && c.bairro !== 'Todos') parts.push(c.bairro);
  return parts.length > 0 ? parts.join(' · ') : target.titulo;
}

/**
 * Modo missão — tela inicial do pesquisador em campo.
 *
 * Responde "o que eu faço agora?": meta do dia, o que falta por cota e um botão
 * grande para começar a próxima entrevista. A sincronização deixa de ser uma
 * aba e vira um aviso discreto com "Enviar agora" (o envio automático ao voltar
 * a conexão já é feito pelo AppContext).
 *
 * Toda a lógica de coleta/sincronização continua vindo do AppContext — aqui é
 * apenas a camada de apresentação, alimentada por dados REAIS do pesquisador.
 */
export const FieldMission: React.FC<FieldMissionProps> = ({
  session,
  activeSurveys,
  researcherSubmissions,
  submissionsToday,
  totalMeta,
  pendingCount,
  effectiveOnline,
  busy,
  onStartColeta,
  onOpenSync,
  onSendNow,
  onOpenPesquisas,
}) => {
  const { submissions } = useApp();

  const doneForSurvey = (surveyId: string) =>
    researcherSubmissions.filter((s) => s.pesquisaId === surveyId).length;

  // Pesquisa principal = a primeira com meta pendente; senão, a primeira ativa.
  const primarySurvey = useMemo(
    () =>
      activeSurveys.find((s) => {
        const meta = typeof s.metaTotalColetas === 'number' ? s.metaTotalColetas : 0;
        return meta > 0 && doneForSurvey(s.id) < meta;
      }) || activeSurveys[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSurveys, researcherSubmissions]
  );

  const primaryDone = primarySurvey ? doneForSurvey(primarySurvey.id) : 0;
  const primaryMeta =
    primarySurvey && typeof primarySurvey.metaTotalColetas === 'number'
      ? primarySurvey.metaTotalColetas
      : totalMeta;
  const primaryPct =
    primaryMeta > 0 ? Math.min(100, Math.round((primaryDone / primaryMeta) * 100)) : 0;

  // O que falta por cota, do mais perto de concluir para o mais distante.
  const gaps: GapItem[] = useMemo(() => {
    const list: GapItem[] = [];
    activeSurveys.forEach((survey) => {
      (survey.metasGlobais || []).forEach((target) => {
        const progress = calculateResearcherIndividualProgress(
          target,
          submissions,
          session.user.id
        );
        if (progress && !progress.isConcluida && progress.restante > 0) {
          list.push({
            id: target.id,
            label: gapLabel(target),
            restante: progress.restante,
            cotaAtingida: progress.cotaAtingida,
            cotaAlvo: progress.cotaAlvo,
            percentual: progress.percentual,
          });
        }
      });
    });
    return list.sort((a, b) => b.percentual - a.percentual).slice(0, 3);
  }, [activeSurveys, submissions, session.user.id]);

  const firstName = session.user.nome.split(' ')[0];

  // --------------------------- Sem pesquisas ativas -------------------------
  if (activeSurveys.length === 0) {
    return (
      <div className="field-stack">
        <div className="field-hero">
          <span className={`field-status-pill ${effectiveOnline ? 'is-online' : 'is-offline'}`}>
            {effectiveOnline ? 'Conectado ao servidor' : 'Modo Offline'}
          </span>
          <div className="field-hero-greeting" style={{ marginTop: '0.5rem' }}>
            {greetingByHour()}, {firstName}
          </div>
          <div className="field-hero-sub">
            Nenhuma pesquisa ativa no momento — sincronize para baixar as suas.
          </div>
        </div>

        <div className="field-empty">
          <div className="field-empty-icon">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="field-text-sm" style={{ fontWeight: 800 }}>
            Nenhuma pesquisa ativa
          </div>
          <div className="field-text-xs field-text-muted">
            As pesquisas ativas atribuídas ao seu login aparecerão aqui após o carregamento.
          </div>
          <button type="button" onClick={onOpenSync} className="field-btn field-btn-primary field-mt">
            <RefreshCw className="h-4 w-4" />
            Sincronizar agora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="field-stack">
      {/* Saudação + estado da conexão */}
      <div className="field-hero">
        <div className="field-row-between">
          <div>
            <div className="field-hero-greeting">
              {greetingByHour()}, {firstName}
            </div>
            <div className="field-hero-sub">Sua missão de hoje</div>
          </div>
          <span className={`field-status-pill ${effectiveOnline ? 'is-online' : 'is-offline'}`}>
            {effectiveOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Missão do dia */}
      <div className="field-card field-mt">
        <div className="field-row-between" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div className="field-text-xs" style={{ fontWeight: 800, color: 'var(--text-muted)' }}>
              <ClipboardList className="h-3.5 w-3.5 inline" /> Pesquisa em foco
            </div>
            <div className="field-survey-name" style={{ marginTop: '0.2rem' }}>
              {primarySurvey?.nome}
            </div>
            <span className="field-survey-code">{primarySurvey?.codigo}</span>
          </div>
          <div className="field-mission-today">
            <span className="field-mission-today-value">{submissionsToday.length}</span>
            <span className="field-mission-today-label">hoje</span>
          </div>
        </div>

        <div className="field-progress field-mt" aria-hidden="true">
          <span style={{ width: `${primaryPct}%` }} />
        </div>
        <div className="field-survey-progress-label">
          <span>
            {primaryDone} de {primaryMeta || '—'} na meta
          </span>
          <span>{primaryPct}%</span>
        </div>

        {/* O que falta por cota */}
        {gaps.length > 0 && (
          <div className="field-gap-list">
            <div className="field-text-xs" style={{ fontWeight: 800, color: 'var(--text-muted)' }}>
              <Target className="h-3.5 w-3.5 inline" /> O que falta
            </div>
            {gaps.map((g) => (
              <div className="field-gap-chip" key={g.id}>
                <span>Faltam {g.restante}</span>
                <span className="field-gap-sep">·</span>
                <span className="field-gap-label">{g.label}</span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => primarySurvey && onStartColeta(primarySurvey.id)}
          className="field-btn field-btn-primary field-btn-block field-mission-big-btn"
        >
          <ClipboardList className="h-5 w-5" />
          <span>Nova entrevista</span>
          <ArrowRight className="h-5 w-5" style={{ marginLeft: 'auto' }} />
        </button>

        {activeSurveys.length > 1 && (
          <button
            type="button"
            onClick={onOpenPesquisas}
            className="field-btn field-btn-ghost field-btn-block"
            style={{ marginTop: '0.5rem' }}
          >
            Ver todas as pesquisas ({activeSurveys.length})
          </button>
        )}
      </div>

      {/* Sincronização discreta */}
      <div className="field-sync-strip">
        <div className="field-sync-strip-info">
          <span className="field-survey-icon" aria-hidden="true">
            <Cloud className="h-4 w-4" />
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="field-text-sm" style={{ display: 'block', fontWeight: 800 }}>
              {pendingCount > 0
                ? `${pendingCount} coleta(s) no aparelho`
                : 'Tudo sincronizado'}
            </span>
            <span className="field-text-xs field-text-muted">
              {effectiveOnline ? 'Envio automático ligado' : 'Aguardando conexão'}
            </span>
          </span>
        </div>
        {pendingCount > 0 ? (
          <button
            type="button"
            onClick={onSendNow}
            disabled={busy !== null || !effectiveOnline}
            className="field-btn field-btn-success"
          >
            <Send className="h-4 w-4" />
            {busy === 'unload' ? 'Enviando...' : 'Enviar agora'}
          </button>
        ) : (
          <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--accent-success)' }} />
        )}
      </div>

      {/* Explicação simples do estado offline */}
      {!effectiveOnline && (
        <div className="field-alert is-warning" style={{ marginTop: 0 }}>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Você está offline — pode continuar entrevistando. Quando a internet voltar, o app envia
            suas coletas automaticamente.
          </span>
        </div>
      )}

      {pendingCount > 0 && effectiveOnline && (
        <p className="field-text-xs field-text-muted" style={{ display: 'flex', gap: '0.35rem' }}>
          <MapPin className="h-3.5 w-3.5" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          As coletas ficam guardadas no aparelho e são enviadas sem bloquear a próxima entrevista.
        </p>
      )}
    </div>
  );
};
