import { createContext, useContext, useEffect, useState } from 'react';
import {
  AnalyticalReport,
  BaseMeta,
  GlobalDemographicTarget,
  ResearcherQuotaAssignment,
  Survey,
} from '../../types';
import { initialAnalyticalReports, initialBaseMetas } from '../../mockData';
import { diffSurveys } from '../../utils/auditUtils';
import { saveOfflineSurveyToDB } from '../../utils/indexedDBStorage';
import { syncSurveyToSupabase } from '../../services/supabaseSyncService';
import { createServerSurvey } from '../../services/serverSurveyService';
import type { SurveysDomain, SurveysInternal } from './types';
import { domainBridge as bridge } from './bridge';

// =============================================================================
// F3 · Domínio PESQUISAS
// Dono do estado: pesquisas, catálogo de metas base, relatórios analíticos e o
// contexto de navegação (pesquisa em edição / filtro selecionado).
// Publica `surveys` na ponte — Coletas e Cadastros leem/escrevem nele.
// =============================================================================

const STORAGE_KEYS = {
  ANALYTICAL_REPORTS: 'dataquest_analytical_reports_v1',
  BASE_METAS: 'dataquest_base_metas_v1',
};

export const SurveysContext = createContext<SurveysDomain | null>(null);

export function useSurveysDomain(): { domain: SurveysDomain; internal: SurveysInternal } {
  // F2 — pesquisas vivem no Supabase (fonte única); a lista fica em memória e o
  // IndexedDB é apenas cache offline de campo.
  const [surveys, setSurveys] = useState<Survey[]>([]);

  const [baseMetas, setBaseMetas] = useState<BaseMeta[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BASE_METAS);
    return saved ? JSON.parse(saved) : initialBaseMetas || [];
  });

  const [analyticalReports, setAnalyticalReports] = useState<AnalyticalReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ANALYTICAL_REPORTS);
      if (!saved) return initialAnalyticalReports;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : initialAnalyticalReports;
    } catch {
      return initialAnalyticalReports;
    }
  });

  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [filterSurveyId, setFilterSurveyId] = useState<string>('all');

  /**
   * F2 — grava uma alteração de pesquisa na FONTE ÚNICA (Supabase, via /api).
   * Offline, vai para o CACHE DE CAMPO no IndexedDB e sobe na próxima reconexão.
   */
  const persistSurveyChange = (survey: Survey, resumo?: string) => {
    if (!bridge.getEffectiveOnline?.()) {
      bridge.addOfflineItem?.({
        tipo: 'PESQUISA_SALVA',
        titulo: `Pesquisa: ${survey.nome}`,
        resumo: resumo || `Código ${survey.codigo} • Ciclo ${survey.cicloAtual} • ${survey.perguntas?.length || 0} questões`,
        payload: survey,
      });
      saveOfflineSurveyToDB(survey)
        .then(() => bridge.notifyPendingOfflineSave?.())
        .catch((err) => console.warn('[IndexedDB] Falha ao gravar pesquisa offline:', err));
      return;
    }

    syncSurveyToSupabase(survey)
      .then((res) => bridge.notifySurveySyncResult?.(res.success))
      .catch((err) => {
        bridge.notifySurveySyncResult?.(false);
        console.warn('[Supabase] Falha ao enviar pesquisa:', err);
      });
  };

  const saveSurvey = (survey: Survey) => {
    const orig = surveys.find((s) => s.id === survey.id);
    const isNew = !orig;
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();

    if (isNew) {
      bridge.addAuditLog?.({
        categoria: 'PESQUISA',
        tipoAcao: 'CRIACAO_PESQUISA',
        tituloAcao: 'Criação de Instrumento de Pesquisa',
        descricaoDetalhada: `Novo formulário de pesquisa "${survey.nome}" criado com ${survey.perguntas?.length || 0} questões e ${survey.regras?.length || 0} regras.`,
        autor: {
          id: currentUser?.id,
          nome: currentUser?.nome,
          login: currentUser?.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: {
          tipo: 'pesquisa',
          id: survey.id,
          identificador: survey.codigo || 'PESQ-NOVA',
          nome: survey.nome,
        },
        alteracoes: [
          { campo: 'nome', rotulo: 'Nome da Pesquisa', valorNovo: survey.nome },
          { campo: 'perguntas', rotulo: 'Total de Perguntas', valorNovo: `${survey.perguntas?.length || 0} perguntas` },
          { campo: 'coletaWeb', rotulo: 'Coleta Web', valorNovo: survey.habilitarColetaWeb ? 'Habilitada' : 'Desabilitada' },
        ],
        motivoConformidade: 'Cadastro e aprovação de novo instrumento para coleta em conformidade com as diretrizes.',
        statusConformidade: 'conforme',
      });
    } else {
      const diffs = diffSurveys(orig, survey);
      bridge.addAuditLog?.({
        categoria: 'PESQUISA',
        tipoAcao: 'EDICAO_PESQUISA',
        tituloAcao: 'Edição de Pesquisa',
        descricaoDetalhada: `Configurações da pesquisa "${survey.nome}" (${survey.codigo}) atualizadas via editor.`,
        autor: {
          id: currentUser?.id,
          nome: currentUser?.nome,
          login: currentUser?.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: {
          tipo: 'pesquisa',
          id: survey.id,
          identificador: survey.codigo,
          nome: survey.nome,
        },
        alteracoes: diffs.length > 0 ? diffs : [{ campo: 'geral', rotulo: 'Atualização Cadastral', valorNovo: 'Parâmetros atualizados' }],
        motivoConformidade: 'Revisão técnica de conteúdo, roteiro e parâmetros de amostragem pelo administrador.',
        statusConformidade: 'conforme',
      });
    }

    persistSurveyChange(survey);

    setSurveys((prev) => {
      const idx = prev.findIndex((s) => s.id === survey.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...survey, atualizadaEm: new Date().toISOString() };
        return updated;
      }
      return [{ ...survey, atualizadaEm: new Date().toISOString() }, ...prev];
    });
  };

  // Replicar pesquisa e metas sem perder o histórico anterior
  const replicateSurvey = (surveyId: string): Survey => {
    const orig = surveys.find((s) => s.id === surveyId);
    if (!orig) throw new Error('Pesquisa não encontrada');

    const nextCiclo = (orig.cicloAtual || 1) + 1;
    const nextVersao = (orig.versao || 1) + 1;
    const newSurveyId = `pesq_${Date.now()}`;

    const clonedMetas = orig.metas.map((m, idx) => ({
      ...m,
      id: `meta_rep_${Date.now()}_${idx}`,
      pesquisaId: newSurveyId,
      quantidadeAtingida: 0,
      ciclo: `Ciclo ${nextCiclo} - ${new Date().getFullYear()}`,
    }));

    const clonedSurvey: Survey = {
      ...orig,
      id: newSurveyId,
      codigo: `${orig.codigo.split('-')[0] || 'PESQ'}-${new Date().getFullYear()}-C${nextCiclo}`,
      nome: `${orig.nome} (Ciclo ${nextCiclo})`,
      descricao: `Cópia replicada do Ciclo ${orig.cicloAtual} para nova coleta. ${orig.descricao}`,
      status: 'ativa',
      cicloAtual: nextCiclo,
      versao: nextVersao,
      criadaEm: new Date().toISOString(),
      atualizadaEm: new Date().toISOString(),
      metas: clonedMetas,
    };

    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    bridge.addAuditLog?.({
      categoria: 'PESQUISA',
      tipoAcao: 'REPLICACAO_PESQUISA',
      tituloAcao: 'Replicação de Ciclo de Pesquisa',
      descricaoDetalhada: `Pesquisa "${orig.nome}" replicada com sucesso para o Ciclo ${nextCiclo}, gerando nova versão ${nextVersao} e preservando registros anteriores.`,
      autor: {
        id: currentUser?.id,
        nome: currentUser?.nome,
        login: currentUser?.login,
        perfil: currentProfile?.name || 'Colaborador',
      },
      alvo: {
        tipo: 'pesquisa',
        id: newSurveyId,
        identificador: clonedSurvey.codigo,
        nome: clonedSurvey.nome,
      },
      alteracoes: [
        { campo: 'cicloAtual', rotulo: 'Ciclo', valorAnterior: orig.cicloAtual, valorNovo: nextCiclo },
        { campo: 'versao', rotulo: 'Versão', valorAnterior: orig.versao || 1, valorNovo: nextVersao },
      ],
      motivoConformidade: 'Abertura de nova rodada/ciclo de coleta mantendo integridade histórica dos dados amostrais.',
      statusConformidade: 'conforme',
    });

    setSurveys((prev) => [clonedSurvey, ...prev]);

    void createServerSurvey(clonedSurvey)
      .then((res) => {
        if (res.success && res.survey) {
          const saved = res.survey;
          setSurveys((prev) => prev.map((s) => (s.id === clonedSurvey.id ? { ...s, ...saved } : s)));
        } else {
          console.warn('[F2] Falha ao replicar pesquisa no servidor:', res.message);
        }
      })
      .catch((err) => console.warn('[F2] Erro ao replicar pesquisa no servidor:', err));

    return clonedSurvey;
  };

  const toggleSurveyStatus = (surveyId: string) => {
    const target = surveys.find((s) => s.id === surveyId);
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    if (target) {
      const nextStatus = target.status === 'ativa' ? 'inativa' : 'ativa';
      bridge.addAuditLog?.({
        categoria: 'PESQUISA',
        tipoAcao: 'STATUS_PESQUISA',
        tituloAcao: `Alteração de Status para ${nextStatus.toUpperCase()}`,
        descricaoDetalhada: `Pesquisa "${target.nome}" (${target.codigo}) alterada de ${target.status} para ${nextStatus}.`,
        autor: {
          id: currentUser?.id,
          nome: currentUser?.nome,
          login: currentUser?.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: { tipo: 'pesquisa', id: target.id, identificador: target.codigo, nome: target.nome },
        alteracoes: [{ campo: 'status', rotulo: 'Status Operacional', valorAnterior: target.status, valorNovo: nextStatus }],
        motivoConformidade: nextStatus === 'inativa' ? 'Pausa operacional para auditoria de metas e contingência de campo.' : 'Reabertura de coleta autorizada pela coordenação.',
        statusConformidade: 'conforme',
      });
    }

    setSurveys((prev) =>
      prev.map((s) => {
        if (s.id === surveyId) {
          const nextStatus = s.status === 'ativa' ? 'inativa' : 'ativa';
          return { ...s, status: nextStatus, atualizadaEm: new Date().toISOString() };
        }
        return s;
      })
    );

    if (target) {
      const nextStatus = target.status === 'ativa' ? 'inativa' : 'ativa';
      persistSurveyChange(
        { ...target, status: nextStatus, atualizadaEm: new Date().toISOString() },
        `Status: ${nextStatus}`
      );
    }
  };

  const finalizeSurvey = (surveyId: string) => {
    const target = surveys.find((s) => s.id === surveyId);
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    if (target) {
      bridge.addAuditLog?.({
        categoria: 'PESQUISA',
        tipoAcao: 'STATUS_PESQUISA',
        tituloAcao: 'Finalização da Pesquisa (Concluída)',
        descricaoDetalhada: `Pesquisa "${target.nome}" (${target.codigo}) finalizada pela coordenação. Deixou de ser exibida aos pesquisadores.`,
        autor: {
          id: currentUser?.id,
          nome: currentUser?.nome,
          login: currentUser?.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: { tipo: 'pesquisa', id: target.id, identificador: target.codigo, nome: target.nome },
        alteracoes: [{ campo: 'status', rotulo: 'Status', valorAnterior: target.status, valorNovo: 'concluida' }],
        motivoConformidade: 'Encerramento oficial do ciclo de coleta pela coordenação.',
        statusConformidade: 'conforme',
      });
    }

    setSurveys((prev) =>
      prev.map((s) =>
        s.id === surveyId ? { ...s, status: 'concluida', emAndamento: false, atualizadaEm: new Date().toISOString() } : s
      )
    );

    if (target) {
      persistSurveyChange(
        { ...target, status: 'concluida', emAndamento: false, atualizadaEm: new Date().toISOString() },
        'Status: concluida'
      );
    }
  };

  const reopenSurvey = (surveyId: string) => {
    const target = surveys.find((s) => s.id === surveyId);
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    if (target) {
      bridge.addAuditLog?.({
        categoria: 'PESQUISA',
        tipoAcao: 'STATUS_PESQUISA',
        tituloAcao: 'Reabertura de Pesquisa',
        descricaoDetalhada: `Pesquisa "${target.nome}" (${target.codigo}) reaberta pela coordenação para novas coletas.`,
        autor: {
          id: currentUser?.id,
          nome: currentUser?.nome,
          login: currentUser?.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: { tipo: 'pesquisa', id: target.id, identificador: target.codigo, nome: target.nome },
        alteracoes: [{ campo: 'status', rotulo: 'Status', valorAnterior: target.status, valorNovo: 'ativa' }],
        motivoConformidade: 'Autorização de retomada de coleta pela coordenação.',
        statusConformidade: 'conforme',
      });
    }

    setSurveys((prev) =>
      prev.map((s) =>
        s.id === surveyId ? { ...s, status: 'ativa', emAndamento: true, atualizadaEm: new Date().toISOString() } : s
      )
    );

    if (target) {
      persistSurveyChange(
        { ...target, status: 'ativa', emAndamento: true, atualizadaEm: new Date().toISOString() },
        'Status: ativa'
      );
    }
  };

  const deleteSurvey = (surveyId: string) => {
    const target = surveys.find((s) => s.id === surveyId);
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    if (target) {
      bridge.addAuditLog?.({
        categoria: 'PESQUISA',
        tipoAcao: 'EXCLUSAO_PESQUISA',
        tituloAcao: 'Arquivamento/Exclusão Lógica de Pesquisa',
        descricaoDetalhada: `Pesquisa "${target.nome}" (${target.codigo}) movida para lixeira lógica.`,
        autor: {
          id: currentUser?.id,
          nome: currentUser?.nome,
          login: currentUser?.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: { tipo: 'pesquisa', id: target.id, identificador: target.codigo, nome: target.nome },
        alteracoes: [{ campo: 'status', rotulo: 'Status', valorAnterior: target.status, valorNovo: 'excluida' }],
        motivoConformidade: 'Exclusão lógica mantida em quarentena conforme política de retenção de dados.',
        statusConformidade: 'atencao',
      });
    }

    setSurveys((prev) => prev.map((s) => (s.id === surveyId ? { ...s, status: 'excluida' } : s)));
    if (target) persistSurveyChange({ ...target, status: 'excluida' }, 'Status: excluida');
  };

  const restoreSurvey = (surveyId: string) => {
    const target = surveys.find((s) => s.id === surveyId);
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    if (target) {
      bridge.addAuditLog?.({
        categoria: 'PESQUISA',
        tipoAcao: 'RESTAURACAO_PESQUISA',
        tituloAcao: 'Restauração de Pesquisa Excluída',
        descricaoDetalhada: `Pesquisa "${target.nome}" restaurada com status ativa.`,
        autor: {
          id: currentUser?.id,
          nome: currentUser?.nome,
          login: currentUser?.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: { tipo: 'pesquisa', id: target.id, identificador: target.codigo, nome: target.nome },
        alteracoes: [{ campo: 'status', rotulo: 'Status', valorAnterior: 'excluida', valorNovo: 'ativa' }],
        motivoConformidade: 'Restauração solicitada e aprovada pelo coordenador responsável.',
        statusConformidade: 'conforme',
      });
    }

    setSurveys((prev) => prev.map((s) => (s.id === surveyId ? { ...s, status: 'ativa' } : s)));
    if (target) persistSurveyChange({ ...target, status: 'ativa' }, 'Status: ativa');
  };

  // Módulo de Relatórios Analíticos
  const saveAnalyticalReport = (report: AnalyticalReport) => {
    const orig = analyticalReports.find((r) => r.id === report.id);
    const isNew = !orig;
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();

    bridge.addAuditLog?.({
      categoria: 'CONFIGURACAO',
      tipoAcao: isNew ? 'CRIACAO_RELATORIO' : 'EDICAO_RELATORIO',
      tituloAcao: isNew ? 'Criação de Relatório Analítico' : 'Edição de Relatório Analítico',
      descricaoDetalhada: isNew
        ? `Novo relatório analítico "${report.titulo}" criado para a pesquisa "${report.pesquisaNome}" com ${report.blocos.length} bloco(s) de texto.`
        : `Relatório analítico "${report.titulo}" atualizado (${report.blocos.length} bloco(s) de texto).`,
      autor: {
        id: currentUser?.id,
        nome: currentUser?.nome,
        login: currentUser?.login,
        perfil: currentProfile?.name || 'Colaborador',
      },
      alvo: { tipo: 'relatorio', id: report.id, identificador: report.id, nome: report.titulo },
      alteracoes: [
        { campo: 'titulo', rotulo: 'Título', valorNovo: report.titulo },
        { campo: 'blocos', rotulo: 'Total de Blocos', valorNovo: `${report.blocos.length} blocos` },
      ],
      motivoConformidade: 'Documentação analítica dos resultados de pesquisa para fins de registro e conformidade.',
      statusConformidade: 'conforme',
    });

    setAnalyticalReports((prev) => {
      const existingIdx = prev.findIndex((r) => r.id === report.id);
      if (existingIdx === -1) return [...prev, report];
      const updated = [...prev];
      updated[existingIdx] = report;
      return updated;
    });
  };

  const deleteAnalyticalReport = (reportId: string) => {
    const target = analyticalReports.find((r) => r.id === reportId);
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    if (target) {
      bridge.addAuditLog?.({
        categoria: 'CONFIGURACAO',
        tipoAcao: 'EXCLUSAO_RELATORIO',
        tituloAcao: 'Exclusão de Relatório Analítico',
        descricaoDetalhada: `Relatório analítico "${target.titulo}" (pesquisa "${target.pesquisaNome}") excluído definitivamente.`,
        autor: {
          id: currentUser?.id,
          nome: currentUser?.nome,
          login: currentUser?.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: { tipo: 'relatorio', id: target.id, identificador: target.id, nome: target.titulo },
        motivoConformidade: 'Exclusão solicitada pelo responsável pela análise.',
        statusConformidade: 'atencao',
      });
    }

    setAnalyticalReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  // Metas Globais Demográficas
  const saveGlobalTarget = (surveyId: string, target: GlobalDemographicTarget) => {
    setSurveys((prev) =>
      prev.map((s) => {
        if (s.id !== surveyId) return s;
        const currentMetas = s.metasGlobais || [];
        const index = currentMetas.findIndex((m) => m.id === target.id);
        const newMetas =
          index >= 0 ? currentMetas.map((m) => (m.id === target.id ? target : m)) : [...currentMetas, target];
        return { ...s, metasGlobais: newMetas, atualizadaEm: new Date().toISOString() };
      })
    );

    {
      const base = surveys.find((s) => s.id === surveyId);
      if (base) {
        const currentMetas = base.metasGlobais || [];
        const idx = currentMetas.findIndex((m) => m.id === target.id);
        const newMetas =
          idx >= 0 ? currentMetas.map((m) => (m.id === target.id ? target : m)) : [...currentMetas, target];
        persistSurveyChange(
          { ...base, metasGlobais: newMetas, atualizadaEm: new Date().toISOString() },
          `Meta global: ${target.titulo}`
        );
      }
    }

    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    bridge.addAuditLog?.({
      categoria: 'PESQUISA',
      tipoAcao: 'CRIACAO_PESQUISA',
      tituloAcao: 'Configuração de Meta Global Demográfica',
      descricaoDetalhada: `Meta Global Demográfica "${target.titulo}" atualizada na pesquisa ${surveyId}. Alvo total: ${target.metaGlobalAlvo} coletas. Critérios: [Idade: ${target.criterios.faixaEtaria || 'Todas'}, Sexo: ${target.criterios.sexo || 'Todos'}, Bairro: ${target.criterios.bairro || 'Todos'}].`,
      autor: {
        id: currentUser?.id,
        nome: currentUser?.nome,
        login: currentUser?.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: { tipo: 'pesquisa', id: surveyId, identificador: target.id, nome: target.titulo },
      alteracoes: [
        { campo: 'metaGlobalAlvo', rotulo: 'Meta Global Alvo', valorNovo: String(target.metaGlobalAlvo) },
        { campo: 'pesquisadoresVinculados', rotulo: 'Pesquisadores Alocados', valorNovo: `${target.atribuicoes.length} pesquisador(es)` },
      ],
      motivoConformidade: 'Controle e auditoria de quotas demográficas para assegurar representatividade amostral.',
      statusConformidade: 'conforme',
    });
  };

  const deleteGlobalTarget = (surveyId: string, targetId: string) => {
    setSurveys((prev) =>
      prev.map((s) =>
        s.id === surveyId
          ? { ...s, metasGlobais: (s.metasGlobais || []).filter((m) => m.id !== targetId), atualizadaEm: new Date().toISOString() }
          : s
      )
    );

    {
      const base = surveys.find((s) => s.id === surveyId);
      if (base) {
        const newMetas = (base.metasGlobais || []).filter((m) => m.id !== targetId);
        persistSurveyChange(
          { ...base, metasGlobais: newMetas, atualizadaEm: new Date().toISOString() },
          `Meta global removida: ${targetId}`
        );
      }
    }

    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    bridge.addAuditLog?.({
      categoria: 'PESQUISA',
      tipoAcao: 'EXCLUSAO_PESQUISA',
      tituloAcao: 'Exclusão de Meta Global Demográfica',
      descricaoDetalhada: `Meta Global Demográfica ID ${targetId} removida da pesquisa ${surveyId}.`,
      autor: {
        id: currentUser?.id,
        nome: currentUser?.nome,
        login: currentUser?.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: { tipo: 'pesquisa', id: surveyId, identificador: targetId, nome: 'Meta Removida' },
      alteracoes: [{ campo: 'status', rotulo: 'Status Meta', valorAnterior: 'ativa', valorNovo: 'excluida' }],
      motivoConformidade: 'Ajuste no plano amostral por solicitação da coordenação.',
      statusConformidade: 'atencao',
    });
  };

  const assignResearcherQuota = (
    surveyId: string,
    targetId: string,
    assignment: ResearcherQuotaAssignment
  ) => {
    setSurveys((prev) =>
      prev.map((s) => {
        if (s.id !== surveyId) return s;
        const currentMetas = s.metasGlobais || [];
        const target = currentMetas.find((m) => m.id === targetId);
        if (!target) return s;

        const existingIdx = target.atribuicoes.findIndex((a) => a.pesquisadorId === assignment.pesquisadorId);
        const newAssignments =
          existingIdx >= 0
            ? target.atribuicoes.map((a) => (a.pesquisadorId === assignment.pesquisadorId ? assignment : a))
            : [...target.atribuicoes, assignment];

        const updatedTarget: GlobalDemographicTarget = {
          ...target,
          atribuicoes: newAssignments,
          atualizadoEm: new Date().toISOString(),
        };

        return {
          ...s,
          metasGlobais: currentMetas.map((m) => (m.id === targetId ? updatedTarget : m)),
          atualizadaEm: new Date().toISOString(),
        };
      })
    );

    {
      const base = surveys.find((s) => s.id === surveyId);
      if (base) {
        const currentMetas = base.metasGlobais || [];
        const target = currentMetas.find((m) => m.id === targetId);
        if (target) {
          const existingIdx = target.atribuicoes.findIndex((a) => a.pesquisadorId === assignment.pesquisadorId);
          const newAssignments =
            existingIdx >= 0
              ? target.atribuicoes.map((a) => (a.pesquisadorId === assignment.pesquisadorId ? assignment : a))
              : [...target.atribuicoes, assignment];
          const updatedTarget: GlobalDemographicTarget = {
            ...target,
            atribuicoes: newAssignments,
            atualizadoEm: new Date().toISOString(),
          };
          persistSurveyChange(
            {
              ...base,
              metasGlobais: currentMetas.map((m) => (m.id === targetId ? updatedTarget : m)),
              atualizadaEm: new Date().toISOString(),
            },
            `Cota: ${updatedTarget.titulo}`
          );
        }
      }
    }
  };

  // Catálogo de Metas Base reutilizáveis
  const saveBaseMeta = (meta: BaseMeta) => {
    setBaseMetas((prev) => {
      const index = prev.findIndex((m) => m.id === meta.id);
      if (index >= 0) return prev.map((m) => (m.id === meta.id ? meta : m));
      return [...prev, meta];
    });

    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    bridge.addAuditLog?.({
      categoria: 'METAS',
      tipoAcao: 'CRIACAO_PESQUISA',
      tituloAcao: 'Cadastro de Meta Base no Sistema',
      descricaoDetalhada: `Meta base "${meta.titulo}" cadastrada no catálogo reutilizável.`,
      autor: {
        id: currentUser?.id,
        nome: currentUser?.nome,
        login: currentUser?.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: { tipo: 'metas', id: meta.id, identificador: meta.id, nome: meta.titulo },
      alteracoes: [{ campo: 'status', rotulo: 'Status', valorAnterior: '—', valorNovo: 'ativa' }],
      motivoConformidade: 'Registro no catálogo base para reutilização em novas pesquisas.',
      statusConformidade: 'ok',
    });
  };

  const deleteBaseMeta = (metaId: string) => {
    setBaseMetas((prev) => prev.filter((m) => m.id !== metaId));
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    bridge.addAuditLog?.({
      categoria: 'METAS',
      tipoAcao: 'EXCLUSAO_PESQUISA',
      tituloAcao: 'Exclusão de Meta Base do Sistema',
      descricaoDetalhada: `Meta base ID ${metaId} removida do catálogo reutilizável.`,
      autor: {
        id: currentUser?.id,
        nome: currentUser?.nome,
        login: currentUser?.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: { tipo: 'metas', id: metaId, identificador: metaId, nome: 'Meta Base' },
      alteracoes: [{ campo: 'status', rotulo: 'Status', valorAnterior: 'ativa', valorNovo: 'excluida' }],
      motivoConformidade: 'Remoção de meta base do catálogo por solicitação da coordenação.',
      statusConformidade: 'atencao',
    });
  };

  // Bulk Survey Operations
  const bulkUpdateSurveysStatus = (ids: string[], status: 'ativa' | 'inativa') => {
    if (ids.length === 0) return;
    setSurveys((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status, atualizadaEm: new Date().toISOString() } : s))
    );
    ids.forEach((id) => {
      const base = surveys.find((s) => s.id === id);
      if (base) persistSurveyChange({ ...base, status, atualizadaEm: new Date().toISOString() }, `Status: ${status}`);
    });
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    bridge.addAuditLog?.({
      categoria: 'PESQUISA',
      tipoAcao: 'ACAO_EM_LOTE',
      tituloAcao: `Alteração de Status em Lote (${ids.length} pesquisas)`,
      descricaoDetalhada: `Status de ${ids.length} pesquisa(s) alterado para "${status.toUpperCase()}".`,
      autor: {
        id: currentUser?.id,
        nome: currentUser?.nome,
        login: currentUser?.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'pesquisa',
        id: `bulk_survey_${Date.now()}`,
        identificador: `${ids.length} pesquisas selecionadas`,
        nome: `Lote de ${ids.length} pesquisas`,
      },
      alteracoes: [{ campo: 'status', rotulo: 'Status', valorNovo: status }],
      motivoConformidade: 'Gestão em lote de disponibilidade e ciclo operacional de pesquisas.',
      statusConformidade: 'conforme',
    });
  };

  const bulkDeleteSurveys = (ids: string[]) => {
    if (ids.length === 0) return;
    setSurveys((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status: 'excluida', atualizadaEm: new Date().toISOString() } : s))
    );
    ids.forEach((id) => {
      const base = surveys.find((s) => s.id === id);
      if (base) persistSurveyChange({ ...base, status: 'excluida', atualizadaEm: new Date().toISOString() }, 'Status: excluida');
    });
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    bridge.addAuditLog?.({
      categoria: 'PESQUISA',
      tipoAcao: 'ACAO_EM_LOTE',
      tituloAcao: `Exclusão em Lote (${ids.length} pesquisas)`,
      descricaoDetalhada: `${ids.length} pesquisa(s) selecionada(s) foram movidas para a lixeira por ${currentUser?.nome}.`,
      autor: {
        id: currentUser?.id,
        nome: currentUser?.nome,
        login: currentUser?.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'pesquisa',
        id: `bulk_del_${Date.now()}`,
        identificador: `${ids.length} pesquisas`,
        nome: 'Exclusão em Lote',
      },
      alteracoes: [{ campo: 'status', rotulo: 'Status', valorNovo: 'excluida' }],
      motivoConformidade: 'Exclusão coletiva autorizada pelo administrador.',
      statusConformidade: 'atencao',
    });
  };

  const bulkReplicateSurveys = (ids: string[]): Survey[] => {
    const list: Survey[] = [];
    ids.forEach((id) => {
      try {
        const rep = replicateSurvey(id);
        list.push(rep);
      } catch (err) {
        console.error('Erro ao replicar pesquisa:', err);
      }
    });
    return list;
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ANALYTICAL_REPORTS, JSON.stringify(analyticalReports));
  }, [analyticalReports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BASE_METAS, JSON.stringify(baseMetas));
  }, [baseMetas]);

  const domain: SurveysDomain = {
    surveys,
    saveSurvey,
    replicateSurvey,
    toggleSurveyStatus,
    finalizeSurvey,
    reopenSurvey,
    deleteSurvey,
    restoreSurvey,
    analyticalReports,
    saveAnalyticalReport,
    deleteAnalyticalReport,
    editingSurvey,
    setEditingSurvey,
    filterSurveyId,
    setFilterSurveyId,
    saveGlobalTarget,
    deleteGlobalTarget,
    assignResearcherQuota,
    baseMetas,
    saveBaseMeta,
    deleteBaseMeta,
    bulkUpdateSurveysStatus,
    bulkDeleteSurveys,
    bulkReplicateSurveys,
  };

  return { domain, internal: { setSurveys } };
}

/** Hook do domínio de Pesquisas. */
export function useSurveys(): SurveysDomain {
  const ctx = useContext(SurveysContext);
  if (!ctx) {
    throw new Error('useSurveys deve ser usado dentro de <AppProvider> (domínio Pesquisas).');
  }
  return ctx;
}
