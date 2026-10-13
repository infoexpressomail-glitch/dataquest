import type { Survey } from '../types';

/**
 * Estatísticas de coleta do MODO TOTEM.
 *
 * O totem é desassistido, então cada respondente gera uma "sessão de coleta":
 * começa ao tocar em “Toque para começar” e termina de duas formas —
 *   • concluída  → chegou ao envio e à tela de agradecimento;
 *   • abandonada → voltou à atração (inatividade, botão Voltar na 1ª questão,
 *                  troca de pesquisa pelo operador ou recarregamento da página).
 *
 * Guardamos um log local (localStorage) dessas sessões para montar o relatório
 * de coletas do totem: contagem por pesquisa, tempo médio de resposta e taxa de
 * conclusão. Tudo funciona offline; nada é enviado ao servidor.
 */

const EVENTS_KEY = 'dataquest_totem_stats_v1';
const ACTIVE_KEY = 'dataquest_totem_active_v1';
/** Limite de eventos guardados (os mais antigos são descartados). */
const MAX_EVENTS = 5000;

export type TotemEndReason = 'submitted' | 'abandoned' | 'inactivity' | 'timeout';

export interface TotemSessionEvent {
  id: string;
  surveyId: string;
  surveyCode: string;
  surveyName: string;
  startedAt: string; // ISO
  endedAt: string; // ISO
  durationMs: number;
  completed: boolean;
  reason: TotemEndReason;
  answersCount: number;
}

interface ActiveTotemSession {
  id: string;
  surveyId: string;
  surveyCode: string;
  surveyName: string;
  startedAt: string;
}

export interface TotemSurveyReportRow {
  surveyId: string;
  surveyCode: string;
  surveyName: string;
  started: number;
  completed: number;
  abandoned: number;
  /** Concluídas / iniciadas (0 a 1). */
  completionRate: number;
  /** Tempo médio de resposta das coletas concluídas (ms) ou null. */
  avgResponseMs: number | null;
  medianResponseMs: number | null;
  fastestMs: number | null;
  slowestMs: number | null;
  lastActivityAt: string | null;
}

export interface TotemReportTotals {
  started: number;
  completed: number;
  abandoned: number;
  completionRate: number;
  avgResponseMs: number | null;
}

export interface TotemReport {
  rows: TotemSurveyReportRow[];
  totals: TotemReportTotals;
  generatedAt: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage cheio/indisponível — ignora
  }
}

function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignora
  }
}

function isEvent(value: unknown): value is TotemSessionEvent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.surveyId === 'string' &&
    typeof v.startedAt === 'string' &&
    typeof v.endedAt === 'string' &&
    typeof v.durationMs === 'number'
  );
}

/** Log de sessões encerradas (mais antigas primeiro). */
export function getTotemEvents(): TotemSessionEvent[] {
  const raw = readJson<unknown>(EVENTS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isEvent);
}

/** Apaga o histórico do relatório (mantém a sessão ativa, se houver). */
export function clearTotemStats(): void {
  removeKey(EVENTS_KEY);
}

function finalizeActive(reason: TotemEndReason): void {
  const active = readJson<ActiveTotemSession | null>(ACTIVE_KEY, null);
  if (!active || !active.id) return;

  const endedAt = new Date();
  const started = new Date(active.startedAt);
  const durationMs = Number.isFinite(started.getTime())
    ? Math.max(0, endedAt.getTime() - started.getTime())
    : 0;

  const event: TotemSessionEvent = {
    id: active.id,
    surveyId: active.surveyId,
    surveyCode: active.surveyCode,
    surveyName: active.surveyName,
    startedAt: active.startedAt,
    endedAt: endedAt.toISOString(),
    durationMs,
    completed: false,
    reason,
    answersCount: 0,
  };

  const events = getTotemEvents();
  events.push(event);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  writeJson(EVENTS_KEY, events);
  removeKey(ACTIVE_KEY);
}

/**
 * Abre uma sessão de coleta do totem. Se havia uma sessão ativa (ex.: o tablet
 * foi recarregado no meio de uma coleta), ela é encerrada como abandonada.
 * Retorna o id da sessão para ser usado em `endTotemSession`.
 */
export function beginTotemSession(survey: Survey): string {
  finalizeActive('timeout');

  const id = `totem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const active: ActiveTotemSession = {
    id,
    surveyId: survey.id,
    surveyCode: survey.codigo || '',
    surveyName: survey.nome || 'Pesquisa',
    startedAt: new Date().toISOString(),
  };
  writeJson(ACTIVE_KEY, active);
  return id;
}

/** Recupera uma sessão ativa órfã (após crash/reload). Chamar ao abrir o totem. */
export function recoverActiveTotemSession(): void {
  finalizeActive('timeout');
}

/** Encerra a sessão de coleta e grava o evento no histórico do relatório. */
export function endTotemSession(
  id: string | null,
  options: { completed: boolean; reason: TotemEndReason; answersCount?: number }
): void {
  const active = readJson<ActiveTotemSession | null>(ACTIVE_KEY, null);
  if (!active || !active.id) return;
  // Só encerra a sessão que está de fato ativa.
  if (id && active.id !== id) return;

  const endedAt = new Date();
  const started = new Date(active.startedAt);
  const durationMs = Number.isFinite(started.getTime())
    ? Math.max(0, endedAt.getTime() - started.getTime())
    : 0;

  const event: TotemSessionEvent = {
    id: active.id,
    surveyId: active.surveyId,
    surveyCode: active.surveyCode,
    surveyName: active.surveyName,
    startedAt: active.startedAt,
    endedAt: endedAt.toISOString(),
    durationMs,
    completed: options.completed,
    reason: options.reason,
    answersCount: Math.max(0, options.answersCount ?? 0),
  };

  const events = getTotemEvents();
  events.push(event);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  writeJson(EVENTS_KEY, events);
  removeKey(ACTIVE_KEY);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Consolida o log em um relatório por pesquisa:
 *   - contagem de coletas (concluídas) e de inícios;
 *   - taxa de conclusão (concluídas / iniciadas);
 *   - tempo médio (e mediana) de resposta das coletas concluídas.
 */
export function computeTotemReport(events: TotemSessionEvent[] = getTotemEvents()): TotemReport {
  const bySurvey = new Map<string, TotemSessionEvent[]>();
  events.forEach((e) => {
    const list = bySurvey.get(e.surveyId) || [];
    list.push(e);
    bySurvey.set(e.surveyId, list);
  });

  const rows: TotemSurveyReportRow[] = [];
  bySurvey.forEach((list, surveyId) => {
    const completedEvents = list.filter((e) => e.completed);
    const durations = completedEvents.map((e) => e.durationMs);
    const last = list.reduce(
      (acc, e) => (e.endedAt > acc ? e.endedAt : acc),
      list[0]?.endedAt || ''
    );
    const sample = list[list.length - 1];
    rows.push({
      surveyId,
      surveyCode: sample.surveyCode,
      surveyName: sample.surveyName,
      started: list.length,
      completed: completedEvents.length,
      abandoned: list.length - completedEvents.length,
      completionRate: list.length > 0 ? completedEvents.length / list.length : 0,
      avgResponseMs: average(durations),
      medianResponseMs: median(durations),
      fastestMs: durations.length ? Math.min(...durations) : null,
      slowestMs: durations.length ? Math.max(...durations) : null,
      lastActivityAt: last || null,
    });
  });

  rows.sort((a, b) => b.completed - a.completed || b.started - a.started);

  const allCompleted = events.filter((e) => e.completed);
  const allDurations = allCompleted.map((e) => e.durationMs);
  const totals: TotemReportTotals = {
    started: events.length,
    completed: allCompleted.length,
    abandoned: events.length - allCompleted.length,
    completionRate: events.length > 0 ? allCompleted.length / events.length : 0,
    avgResponseMs: average(allDurations),
  };

  return { rows, totals, generatedAt: new Date().toISOString() };
}

/** Formata uma duração em ms como "1m 23s" / "45s" / "—". */
export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return '—';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return `${hours}h ${String(restMinutes).padStart(2, '0')}m`;
}

/** Formata uma fração 0..1 como percentual pt-BR ("87,5%"). */
export function formatPercent(fraction: number): string {
  const safe = Number.isFinite(fraction) ? fraction : 0;
  return `${(safe * 100).toFixed(1).replace('.', ',')}%`;
}
