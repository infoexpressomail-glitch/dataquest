import { createContext, useContext, useState } from 'react';
import { Collaborator, Survey } from '../../types';
import {
  saveCollaboratorToServer,
  updateCollaboratorPartial,
} from '../../services/serverCollaboratorService';
import { uploadSurveyToServer } from '../../services/serverSurveyService';
import type { CadastrosDomain, CadastrosInternal } from './types';
import { domainBridge as bridge } from './bridge';

// =============================================================================
// F3 · Domínio CADASTROS
// Dono do estado: colaboradores/pesquisadores e a quota de licenças.
// Depende de Autenticação (ator + perfis) e publica `collaborators` na ponte,
// porque a hidratação (Auth) e o vínculo pesquisador↔pesquisa (Pesquisas) leem
// essa lista.
// =============================================================================

const STORAGE_LICENSE_QUOTA = 'dataquest_license_quota_v1';

export const CadastrosContext = createContext<CadastrosDomain | null>(null);

export function useCadastrosDomain(): { domain: CadastrosDomain; internal: CadastrosInternal } {
  // F2 — colaboradores vêm do servidor (/api/collaborators, sem senha) e ficam
  // apenas em memória. Nenhuma senha (nem hash) entra no estado do navegador.
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const [licenseQuota, setLicenseQuotaState] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_LICENSE_QUOTA);
    if (saved === null || saved === '' || saved === 'null') return null;
    const n = Number(saved);
    return Number.isFinite(n) && n > 0 ? n : null;
  });

  const setLicenseQuota = (q: number | null) => {
    setLicenseQuotaState(q);
    if (q === null || q <= 0) {
      localStorage.removeItem(STORAGE_LICENSE_QUOTA);
    } else {
      localStorage.setItem(STORAGE_LICENSE_QUOTA, String(Math.round(q)));
    }
  };

  const saveCollaborator = async (colab: Collaborator, senha?: string): Promise<boolean> => {
    // F1/F2 — a senha vai apenas para o servidor (hash bcrypt no banco). Nunca
    // entra no estado do navegador, e o cadastro NÃO é gravado em localStorage.
    {
      const semSenha = { ...(colab as Collaborator & { senha?: string }) };
      delete semSenha.senha;
      colab = semSenha as Collaborator;
    }

    let serverOk = false;
    const previous = collaborators.find((c) => c.id === colab.id);

    try {
      const result = await saveCollaboratorToServer(colab, senha);
      if (result?.success) {
        serverOk = true;
        if (result.colaborador) {
          colab = { ...colab, ...result.colaborador };
        }
      }
    } catch {
      // Mantém apenas o estado local; o formulário decide como avisar.
    }

    // Mantém `pesquisas.pesquisadoresIds` em sincronia com `pesquisasVinculadasIds`.
    if (serverOk) {
      const previousSurveyIds = new Set<string>(previous?.pesquisasVinculadasIds || []);
      const nextSurveyIds = new Set<string>(colab.pesquisasVinculadasIds || []);
      const addedSurveyIds = [...nextSurveyIds].filter((id) => !previousSurveyIds.has(id));
      const removedSurveyIds = [...previousSurveyIds].filter((id) => !nextSurveyIds.has(id));
      const syncFailures: string[] = [];
      const surveys = bridge.getSurveys?.() || [];
      const currentUser = bridge.getCurrentUser?.();
      const currentProfile = bridge.getCurrentProfile?.();

      for (const surveyId of [...addedSurveyIds, ...removedSurveyIds]) {
        const survey = surveys.find((s) => s.id === surveyId);
        if (!survey) continue;

        const currentResearcherIds = survey.pesquisadoresIds || [];
        const updatedResearcherIds = addedSurveyIds.includes(surveyId)
          ? Array.from(new Set([...currentResearcherIds, colab.id]))
          : currentResearcherIds.filter((id) => id !== colab.id);

        const updatedSurvey = { ...survey, pesquisadoresIds: updatedResearcherIds };

        try {
          const res = await uploadSurveyToServer(updatedSurvey);
          if (res.success) {
            bridge.setSurveys?.((prev: Survey[]) => prev.map((s) => (s.id === surveyId ? updatedSurvey : s)));
          } else {
            syncFailures.push(`${survey.nome}: ${res.message}`);
          }
        } catch (err: any) {
          syncFailures.push(`${survey.nome}: ${err?.message || 'falha de rede ao sincronizar'}`);
        }
      }

      if (syncFailures.length > 0) {
        bridge.addAuditLog?.({
          categoria: 'CONFIGURACAO',
          tipoAcao: 'ACAO_EM_LOTE',
          tituloAcao: 'Vínculo colaborador↔pesquisa não sincronizado no servidor',
          descricaoDetalhada: `Ao salvar "${colab.nome}", não foi possível atualizar o vínculo em todas as pesquisas: ${syncFailures.join(' | ')}. Ele pode não enxergar essas pesquisas no app de campo até isso ser corrigido (provável causa: pesquisa em andamento exigindo sincronização prévia).`,
          autor: {
            id: currentUser?.id,
            nome: currentUser?.nome,
            login: currentUser?.login,
            perfil: currentProfile?.name || 'Administrador',
          },
          alvo: { tipo: 'colaborador', id: colab.id, identificador: colab.nome },
          motivoConformidade: 'Consistência do vínculo pesquisador↔pesquisa usado pelo login de campo e pelo RLS.',
          statusConformidade: 'atencao',
        });
      }
    }

    setCollaborators((prev) => {
      const idx = prev.findIndex((c) => c.id === colab.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = colab;
        return next;
      }
      return [colab, ...prev];
    });

    return serverOk;
  };

  const toggleCollaboratorStatus = (id: string) => {
    const target = collaborators.find((c) => c.id === id);
    const nextAtivo = target ? !target.ativo : true;
    setCollaborators((prev) => prev.map((c) => (c.id === id ? { ...c, ativo: nextAtivo } : c)));
    // F2 — persiste no servidor (antes só mudava o estado do navegador).
    updateCollaboratorPartial(id, { ativo: nextAtivo }).catch((err) =>
      console.warn('[F2] Falha ao alterar status do colaborador no servidor:', err)
    );
  };

  // Habilita/desabilita uma pesquisa já concluída para um login específico.
  const setSurveyReEnabledForResearcher = (
    surveyId: string,
    researcherId: string,
    enabled: boolean
  ) => {
    const target = collaborators.find((c) => c.id === researcherId);
    const list = Array.isArray(target?.pesquisasReabilitadasIds) ? [...target!.pesquisasReabilitadasIds!] : [];
    const updated = enabled
      ? Array.from(new Set([...list, surveyId]))
      : list.filter((id) => id !== surveyId);

    setCollaborators((prev) => {
      const updatedColabs = prev.map((c) =>
        c.id === researcherId ? { ...c, pesquisasReabilitadasIds: updated } : c
      );

      if (researcherId === bridge.getCurrentUser?.()?.id) {
        const updatedCurrent = updatedColabs.find((c) => c.id === researcherId);
        if (updatedCurrent) bridge.setCurrentUser?.(updatedCurrent);
      }

      return updatedColabs;
    });

    // F2 — persiste no banco para a re-habilitação valer no app de campo.
    updateCollaboratorPartial(researcherId, { pesquisasReabilitadasIds: updated }).catch((err) =>
      console.warn('[F2] Falha ao persistir re-habilitação de pesquisa no servidor:', err)
    );
  };

  // Bulk Collaborator Operations
  const bulkUpdateCollaboratorsStatus = (ids: string[], ativo: boolean) => {
    if (ids.length === 0) return;
    setCollaborators((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, ativo } : c)));
    ids.forEach((id) => {
      updateCollaboratorPartial(id, { ativo }).catch((err) =>
        console.warn('[F2] Falha ao alterar status do colaborador no servidor:', err)
      );
    });
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    bridge.addAuditLog?.({
      categoria: 'CONFIGURACAO',
      tipoAcao: 'ACAO_EM_LOTE',
      tituloAcao: `Alteração de Status de Colaboradores em Lote (${ids.length} usuários)`,
      descricaoDetalhada: `${ids.length} colaborador(es) marcado(s) como ${ativo ? 'ATIVO' : 'INATIVO'} por ${currentUser?.nome}.`,
      autor: {
        id: currentUser?.id,
        nome: currentUser?.nome,
        login: currentUser?.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'colaborador',
        id: `bulk_colab_${Date.now()}`,
        identificador: `${ids.length} colaboradores`,
        nome: 'Lote de Colaboradores',
      },
      alteracoes: [{ campo: 'ativo', rotulo: 'Status Operacional', valorNovo: ativo ? 'Ativo' : 'Inativo' }],
      motivoConformidade: 'Gestão coletiva de acessos e ativação de operadores de campo.',
      statusConformidade: 'conforme',
    });
  };

  const bulkUpdateCollaboratorsProfile = (ids: string[], perfilId: string) => {
    if (ids.length === 0) return;
    const profiles = bridge.getProfiles?.() || [];
    const targetProf = profiles.find((p) => p.id === perfilId);
    setCollaborators((prev) =>
      prev.map((c) => (ids.includes(c.id) ? { ...c, perfilAcessoId: perfilId } : c))
    );
    ids.forEach((id) => {
      updateCollaboratorPartial(id, { perfilAcessoId: perfilId }).catch((err) =>
        console.warn('[F2] Falha ao alterar perfil do colaborador no servidor:', err)
      );
    });
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    bridge.addAuditLog?.({
      categoria: 'CONFIGURACAO',
      tipoAcao: 'ACAO_EM_LOTE',
      tituloAcao: `Alteração de Perfil de Acesso em Lote (${ids.length} colaboradores)`,
      descricaoDetalhada: `Perfil de ${ids.length} colaborador(es) alterado para "${targetProf?.name || perfilId}" por ${currentUser?.nome}.`,
      autor: {
        id: currentUser?.id,
        nome: currentUser?.nome,
        login: currentUser?.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'colaborador',
        id: `bulk_prof_${Date.now()}`,
        identificador: `${ids.length} colaboradores`,
        nome: targetProf?.name,
      },
      alteracoes: [{ campo: 'perfilAcessoId', rotulo: 'Perfil de Acesso', valorNovo: targetProf?.name }],
      motivoConformidade: 'Reclassificação coletiva de privilégios de segurança RBAC.',
      statusConformidade: 'atencao',
    });
  };

  const bulkDeleteCollaborators = (ids: string[]) => {
    if (ids.length === 0) return;
    // F2 — a exclusão vira DESATIVAÇÃO no banco (fonte única): preserva a trilha
    // de auditoria e o histórico de coletas do operador.
    setCollaborators((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, ativo: false } : c)));
    ids.forEach((id) => {
      updateCollaboratorPartial(id, { ativo: false }).catch((err) =>
        console.warn('[F2] Falha ao desativar colaborador no servidor:', err)
      );
    });
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    bridge.addAuditLog?.({
      categoria: 'CONFIGURACAO',
      tipoAcao: 'ACAO_EM_LOTE',
      tituloAcao: `Desativação em Lote de Colaboradores (${ids.length} registros)`,
      descricaoDetalhada: `${ids.length} colaborador(es) foram desativados no sistema por ${currentUser?.nome}.`,
      autor: {
        id: currentUser?.id,
        nome: currentUser?.nome,
        login: currentUser?.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'colaborador',
        id: `bulk_del_colab_${Date.now()}`,
        identificador: `${ids.length} colaboradores`,
      },
      motivoConformidade: 'Desligamento ou exclusão em lote de registros de operadores.',
      statusConformidade: 'atencao',
    });
  };

  const bulkAssignCollaboratorsToSurveys = async (colabIds: string[], surveyIds: string[]) => {
    if (colabIds.length === 0 || surveyIds.length === 0) return;

    for (const colabId of colabIds) {
      const colab = collaborators.find((c) => c.id === colabId);
      if (!colab) continue;
      const currentSurveys = colab.pesquisasVinculadasIds || [];
      const merged = Array.from(new Set([...currentSurveys, ...surveyIds]));
      await saveCollaborator({ ...colab, pesquisasVinculadasIds: merged });
    }

    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    bridge.addAuditLog?.({
      categoria: 'CONFIGURACAO',
      tipoAcao: 'ACAO_EM_LOTE',
      tituloAcao: 'Vinculação em Lote de Colaboradores e Pesquisas',
      descricaoDetalhada: `${colabIds.length} colaborador(es) alocado(s) em ${surveyIds.length} pesquisa(s).`,
      autor: {
        id: currentUser?.id,
        nome: currentUser?.nome,
        login: currentUser?.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'colaborador',
        id: `bulk_assign_${Date.now()}`,
        identificador: `${colabIds.length} colabs x ${surveyIds.length} pesquisas`,
      },
      motivoConformidade: 'Alocação de equipes de campo para coletas autorizadas.',
      statusConformidade: 'conforme',
    });
  };

  const domain: CadastrosDomain = {
    collaborators,
    saveCollaborator,
    toggleCollaboratorStatus,
    licenseQuota,
    setLicenseQuota,
    setSurveyReEnabledForResearcher,
    bulkUpdateCollaboratorsStatus,
    bulkUpdateCollaboratorsProfile,
    bulkDeleteCollaborators,
    bulkAssignCollaboratorsToSurveys,
  };

  return { domain, internal: { setCollaborators } };
}

/** Hook do domínio de Cadastros (colaboradores e licenças). */
export function useCadastros(): CadastrosDomain {
  const ctx = useContext(CadastrosContext);
  if (!ctx) {
    throw new Error('useCadastros deve ser usado dentro de <AppProvider> (domínio Cadastros).');
  }
  return ctx;
}
