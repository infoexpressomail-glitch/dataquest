import React, { useState } from 'react';
import { BarChart3, CheckCircle2, Clock, Download, RefreshCw, Trash2, TrendingDown, X } from 'lucide-react';
import {
  clearTotemStats,
  computeTotemReport,
  formatDuration,
  formatPercent,
  getTotemEvents,
  type TotemReport,
} from './totemStatsStore';
import './totemReport.css';

export interface TotemCollectionReportProps {
  /** Fecha o relatório (volta ao quiosque). */
  onClose: () => void;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Relatório de coletas do MODO TOTEM.
 *
 * Lê o histórico local de sessões do quiosque e mostra, por pesquisa:
 *   • contagem de coletas concluídas e de inícios;
 *   • taxa de conclusão (concluídas ÷ iniciadas);
 *   • tempo médio de resposta das coletas concluídas (e mediana).
 *
 * É um painel do operador: abre por um botão no canto do totem, funciona
 * offline e pode exportar CSV ou limpar o histórico do aparelho.
 */
export const TotemCollectionReport: React.FC<TotemCollectionReportProps> = ({ onClose }) => {
  const [report, setReport] = useState<TotemReport>(() => computeTotemReport(getTotemEvents()));

  const handleRefresh = () => setReport(computeTotemReport(getTotemEvents()));

  const handleClear = () => {
    const ok = window.confirm(
      'Limpar o histórico de coletas do totem neste tablet? Esta ação não pode ser desfeita.'
    );
    if (!ok) return;
    clearTotemStats();
    setReport(computeTotemReport(getTotemEvents()));
  };

  const handleExportCsv = () => {
    const header = [
      'Pesquisa',
      'Codigo',
      'Iniciadas',
      'Concluidas',
      'Abandonadas',
      'Taxa de conclusao (%)',
      'Tempo medio (s)',
      'Tempo mediano (s)',
      'Ultima atividade',
    ];
    const lines = report.rows.map((r) => [
      `"${r.surveyName.replace(/"/g, '""')}"`,
      `"${(r.surveyCode || '').replace(/"/g, '""')}"`,
      r.started,
      r.completed,
      r.abandoned,
      (r.completionRate * 100).toFixed(1),
      r.avgResponseMs === null ? '' : (r.avgResponseMs / 1000).toFixed(1),
      r.medianResponseMs === null ? '' : (r.medianResponseMs / 1000).toFixed(1),
      r.lastActivityAt ? new Date(r.lastActivityAt).toISOString() : '',
    ]);
    const csv = [header.join(';'), ...lines.map((l) => l.join(';'))].join('\n');
    try {
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-totem-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // ambiente sem download — ignora
    }
  };

  const { totals, rows } = report;

  return (
    <div className="totem-report-overlay" role="dialog" aria-modal="true" aria-label="Relatório de coletas do Modo Totem">
      <div className="totem-report">
        <header className="totem-report-header">
          <div className="totem-report-title">
            <BarChart3 size={22} />
            <div>
              <h2>Relatório de coletas — Modo Totem</h2>
              <p>Contagem por pesquisa, tempo médio de resposta e taxa de conclusão.</p>
            </div>
          </div>
          <button type="button" className="totem-report-close" onClick={onClose} aria-label="Fechar relatório">
            <X size={20} />
          </button>
        </header>

        <section className="totem-report-cards">
          <div className="totem-report-card is-primary">
            <CheckCircle2 size={20} />
            <span className="totem-report-card-value">{totals.completed}</span>
            <span className="totem-report-card-label">Coletas concluídas</span>
          </div>
          <div className="totem-report-card is-info">
            <TrendingDown size={20} />
            <span className="totem-report-card-value">{formatPercent(totals.completionRate)}</span>
            <span className="totem-report-card-label">Taxa de conclusão</span>
          </div>
          <div className="totem-report-card is-warn">
            <Clock size={20} />
            <span className="totem-report-card-value">{formatDuration(totals.avgResponseMs)}</span>
            <span className="totem-report-card-label">Tempo médio de resposta</span>
          </div>
          <div className="totem-report-card">
            <X size={20} />
            <span className="totem-report-card-value">{totals.abandoned}</span>
            <span className="totem-report-card-label">Coletas abandonadas</span>
          </div>
        </section>

        {rows.length === 0 ? (
          <div className="totem-report-empty">
            <p>
              Ainda não há coletas registradas neste tablet. Os dados aparecem aqui assim que o
              primeiro respondente iniciar uma pesquisa no totem.
            </p>
            <p className="totem-report-empty-hint">
              {totals.started} início(s) registrado(s) até agora.
            </p>
          </div>
        ) : (
          <div className="totem-report-table-wrap">
            <table className="totem-report-table">
              <thead>
                <tr>
                  <th>Pesquisa</th>
                  <th>Concluídas</th>
                  <th>Iniciadas</th>
                  <th>Taxa de conclusão</th>
                  <th>Tempo médio</th>
                  <th>Mediana</th>
                  <th>Última atividade</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.surveyId}>
                    <td>
                      <span className="totem-report-survey-name">{r.surveyName}</span>
                      {r.surveyCode && <span className="totem-report-survey-code">{r.surveyCode}</span>}
                    </td>
                    <td className="is-strong">{r.completed}</td>
                    <td>{r.started}</td>
                    <td>
                      <div className="totem-report-rate">
                        <span className="totem-report-rate-bar">
                          <span
                            className="totem-report-rate-fill"
                            style={{ width: `${Math.round(r.completionRate * 100)}%` }}
                          />
                        </span>
                        <span className="totem-report-rate-value">{formatPercent(r.completionRate)}</span>
                      </div>
                    </td>
                    <td>{formatDuration(r.avgResponseMs)}</td>
                    <td>{formatDuration(r.medianResponseMs)}</td>
                    <td>{formatDateTime(r.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="totem-report-actions">
          <span className="totem-report-generated">
            Gerado em {formatDateTime(report.generatedAt)}
          </span>
          <div className="totem-report-action-buttons">
            <button type="button" className="totem-report-btn" onClick={handleRefresh}>
              <RefreshCw size={16} />
              <span>Atualizar</span>
            </button>
            <button
              type="button"
              className="totem-report-btn"
              onClick={handleExportCsv}
              disabled={rows.length === 0}
            >
              <Download size={16} />
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              className="totem-report-btn is-danger"
              onClick={handleClear}
              disabled={rows.length === 0}
            >
              <Trash2 size={16} />
              <span>Limpar histórico</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default TotemCollectionReport;
