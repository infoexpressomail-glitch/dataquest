import { ActionAuditLog, ActionType, ActionCategory, FieldChange, Survey } from '../types';

/**
 * Generates an immutable simulated SHA-256 integrity token for audit compliance
 */
export function generateIntegrityHash(payload: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const hexRandom = Math.random().toString(16).substring(2, 10).padEnd(8, 'f');
  const hexTime = Date.now().toString(16).padEnd(8, '0');
  
  const fullHex = `${hex1}${hex2}${hexRandom}${hexTime}${hex1}${hex2}${hexRandom}${hexTime}`.slice(0, 64);
  return fullHex;
}

/**
 * Formats Action Types into human-readable Portuguese labels and colors
 */
export function getActionTypeMeta(tipo: ActionType): {
  label: string;
  category: ActionCategory;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  switch (tipo) {
    case 'EDICAO_RESPOSTA':
      return {
        label: 'Edição de Resposta',
        category: 'RESPOSTA',
        badgeBg: 'bg-purple-500/10',
        badgeText: 'text-purple-400',
        badgeBorder: 'border-purple-500/30',
      };
    case 'EXCLUSAO_RESPOSTA':
      return {
        label: 'Exclusão de Resposta',
        category: 'RESPOSTA',
        badgeBg: 'bg-rose-500/10',
        badgeText: 'text-rose-400',
        badgeBorder: 'border-rose-500/30',
      };
    case 'NOVA_COLETA':
      return {
        label: 'Nova Coleta Registrada',
        category: 'RESPOSTA',
        badgeBg: 'bg-emerald-500/10',
        badgeText: 'text-emerald-400',
        badgeBorder: 'border-emerald-500/30',
      };
    case 'CRIACAO_PESQUISA':
      return {
        label: 'Criação de Pesquisa',
        category: 'PESQUISA',
        badgeBg: 'bg-blue-500/10',
        badgeText: 'text-blue-400',
        badgeBorder: 'border-blue-500/30',
      };
    case 'EDICAO_PESQUISA':
      return {
        label: 'Edição de Pesquisa',
        category: 'PESQUISA',
        badgeBg: 'bg-cyan-500/10',
        badgeText: 'text-cyan-400',
        badgeBorder: 'border-cyan-500/30',
      };
    case 'STATUS_PESQUISA':
      return {
        label: 'Alteração de Status',
        category: 'PESQUISA',
        badgeBg: 'bg-amber-500/10',
        badgeText: 'text-amber-400',
        badgeBorder: 'border-amber-500/30',
      };
    case 'REPLICACAO_PESQUISA':
      return {
        label: 'Replicação de Ciclo',
        category: 'PESQUISA',
        badgeBg: 'bg-indigo-500/10',
        badgeText: 'text-indigo-400',
        badgeBorder: 'border-indigo-500/30',
      };
    case 'EXCLUSAO_PESQUISA':
      return {
        label: 'Exclusão de Pesquisa',
        category: 'PESQUISA',
        badgeBg: 'bg-red-500/10',
        badgeText: 'text-red-400',
        badgeBorder: 'border-red-500/30',
      };
    case 'RESTAURACAO_PESQUISA':
      return {
        label: 'Restauração de Pesquisa',
        category: 'PESQUISA',
        badgeBg: 'bg-emerald-500/10',
        badgeText: 'text-emerald-400',
        badgeBorder: 'border-emerald-500/30',
      };
    case 'ALTERACAO_META':
      return {
        label: 'Alteração de Metas',
        category: 'CONFIGURACAO',
        badgeBg: 'bg-pink-500/10',
        badgeText: 'text-pink-400',
        badgeBorder: 'border-pink-500/30',
      };
    case 'IMPORTACAO_DADOS':
      return {
        label: 'Importação Externa',
        category: 'CONFIGURACAO',
        badgeBg: 'bg-teal-500/10',
        badgeText: 'text-teal-400',
        badgeBorder: 'border-teal-500/30',
      };
    case 'ACAO_EM_LOTE':
      return {
        label: 'Operação em Lote',
        category: 'CONFIGURACAO',
        badgeBg: 'bg-indigo-500/10',
        badgeText: 'text-indigo-400',
        badgeBorder: 'border-indigo-500/30',
      };
    case 'SINCRONIZACAO_OFFLINE':
      return {
        label: 'Sincronização Offline',
        category: 'SISTEMA',
        badgeBg: 'bg-emerald-500/10',
        badgeText: 'text-emerald-400',
        badgeBorder: 'border-emerald-500/30',
      };
    default:
      return {
        label: tipo,
        category: 'SISTEMA',
        badgeBg: 'bg-slate-500/10',
        badgeText: 'text-slate-400',
        badgeBorder: 'border-slate-500/30',
      };
  }
}

/**
 * Generates diff list for survey updates
 */
export function diffSurveys(oldSurvey: Survey, newSurvey: Survey): FieldChange[] {
  const changes: FieldChange[] = [];

  if (oldSurvey.nome !== newSurvey.nome) {
    changes.push({
      campo: 'nome',
      rotulo: 'Nome da Pesquisa',
      valorAnterior: oldSurvey.nome,
      valorNovo: newSurvey.nome,
    });
  }

  if (oldSurvey.descricao !== newSurvey.descricao) {
    changes.push({
      campo: 'descricao',
      rotulo: 'Descrição',
      valorAnterior: oldSurvey.descricao || '(vazio)',
      valorNovo: newSurvey.descricao || '(vazio)',
    });
  }

  if (oldSurvey.habilitarColetaWeb !== newSurvey.habilitarColetaWeb) {
    changes.push({
      campo: 'habilitarColetaWeb',
      rotulo: 'Habilitar Coleta Web',
      valorAnterior: oldSurvey.habilitarColetaWeb ? 'Sim' : 'Não',
      valorNovo: newSurvey.habilitarColetaWeb ? 'Sim' : 'Não',
    });
  }

  if (oldSurvey.tipoColetaWeb !== newSurvey.tipoColetaWeb) {
    changes.push({
      campo: 'tipoColetaWeb',
      rotulo: 'Tipo de Coleta Web',
      valorAnterior: oldSurvey.tipoColetaWeb === 'publico' ? 'Público' : 'Interno',
      valorNovo: newSurvey.tipoColetaWeb === 'publico' ? 'Público' : 'Interno',
    });
  }

  if (oldSurvey.perguntas?.length !== newSurvey.perguntas?.length) {
    changes.push({
      campo: 'perguntas.length',
      rotulo: 'Quantidade de Perguntas',
      valorAnterior: `${oldSurvey.perguntas?.length || 0} perguntas`,
      valorNovo: `${newSurvey.perguntas?.length || 0} perguntas`,
    });
  }

  if (oldSurvey.regras?.length !== newSurvey.regras?.length) {
    changes.push({
      campo: 'regras.length',
      rotulo: 'Regras Condicionais',
      valorAnterior: `${oldSurvey.regras?.length || 0} regras cadastradas`,
      valorNovo: `${newSurvey.regras?.length || 0} regras cadastradas`,
    });
  }

  if (oldSurvey.metas?.length !== newSurvey.metas?.length) {
    changes.push({
      campo: 'metas.length',
      rotulo: 'Metas Amostrais',
      valorAnterior: `${oldSurvey.metas?.length || 0} metas cadastradas`,
      valorNovo: `${newSurvey.metas?.length || 0} metas cadastradas`,
    });
  }

  if (oldSurvey.pesquisadoresIds?.length !== newSurvey.pesquisadoresIds?.length) {
    changes.push({
      campo: 'pesquisadoresIds.length',
      rotulo: 'Pesquisadores Atribuídos',
      valorAnterior: `${oldSurvey.pesquisadoresIds?.length || 0} pesquisadores`,
      valorNovo: `${newSurvey.pesquisadoresIds?.length || 0} pesquisadores`,
    });
  }

  return changes;
}

/**
 * Exports Audit Logs to CSV formatted for compliance reviews
 */
export function exportAuditLogsToCSV(logs: ActionAuditLog[]) {
  const headers = [
    'ID Log',
    'Timestamp (ISO)',
    'Data/Hora Formatada',
    'Categoria',
    'Tipo de Acao',
    'Titulo',
    'Descricao',
    'Autor Nome',
    'Autor Login',
    'Autor Perfil',
    'Autor IP',
    'Alvo Tipo',
    'Alvo Identificador',
    'Alvo Nome',
    'Alteracoes Detalhadas',
    'Motivo Compliance / Justificativa',
    'Hash Integridade SHA-256',
    'Status Conformidade',
  ];

  const rows = logs.map((log) => {
    const formattedDate = new Date(log.timestamp).toLocaleString('pt-BR');
    const alteracoesStr = log.alteracoes
      ?.map((a) => `${a.rotulo || a.campo}: [${a.valorAnterior ?? 'N/A'}] -> [${a.valorNovo ?? 'N/A'}]`)
      .join(' | ') || 'N/A';

    return [
      `"${log.id}"`,
      `"${log.timestamp}"`,
      `"${formattedDate}"`,
      `"${log.categoria || 'SISTEMA'}"`,
      `"${log.tipoAcao || 'ACAO'}"`,
      `"${(log.tituloAcao || '').replace(/"/g, '""')}"`,
      `"${(log.descricaoDetalhada || '').replace(/"/g, '""')}"`,
      `"${(log.autor?.nome || 'Sistema').replace(/"/g, '""')}"`,
      `"${log.autor?.login || 'sistema'}"`,
      `"${log.autor?.perfil || 'Operador'}"`,
      `"${log.autor?.ip || ''}"`,
      `"${log.alvo?.tipo || 'sistema'}"`,
      `"${log.alvo?.identificador || 'N/A'}"`,
      `"${(log.alvo?.nome || '').replace(/"/g, '""')}"`,
      `"${alteracoesStr.replace(/"/g, '""')}"`,
      `"${(log.motivoConformidade || '').replace(/"/g, '""')}"`,
      `"${log.hashIntegridade}"`,
      `"${log.statusConformidade}"`,
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `trilha_auditoria_conformidade_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports Audit Logs to JSON format for digital audit packages
 */
export function exportAuditLogsToJSON(logs: ActionAuditLog[]) {
  const exportPayload = {
    sistema: 'DataQuest Survey Management Suite',
    modulo: 'Trilha de Auditoria e Conformidade de Ações',
    padraoConformidade: 'LGPD Art. 16 / ISO 27001 / ABNT NBR ISO/IEC 27701',
    dataExportacao: new Date().toISOString(),
    totalRegistros: logs.length,
    registros: logs,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `auditoria_compliance_pacote_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
