import { createContext, useContext, useEffect, useState } from 'react';
import { ActionAuditLog, RecentConnection } from '../../types';
import { initialAuditLogs, initialConnections } from '../../mockData';
import { generateIntegrityHash } from '../../utils/auditUtils';
import type { AuditDomain, AuditInternal } from './types';
import { domainBridge as bridge } from './bridge';

// =============================================================================
// F3 · Domínio AUDITORIA
// Dono do estado: trilha de auditoria (`auditLogs`) e conexões recentes.
// Não depende de nenhum outro domínio — expõe `addAuditLog` na ponte para que
// os demais domínios registrem suas ações.
// =============================================================================

const STORAGE_AUDIT_LOGS = 'dataquest_audit_logs_v1';

export const AuditContext = createContext<AuditDomain | null>(null);

export function useAuditDomain(): { domain: AuditDomain; internal: AuditInternal } {
  const [auditLogs, setAuditLogs] = useState<ActionAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUDIT_LOGS);
      if (!saved) return initialAuditLogs;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return initialAuditLogs;
      return parsed.map((l: any) => ({
        ...l,
        autor: l.autor || {
          id: l.usuarioId || 'sys',
          nome: l.usuarioNome || 'Usuário do Sistema',
          login: l.usuarioLogin || 'usuario',
          perfil: l.usuarioPerfil || 'Operador',
        },
        alvo: {
          tipo: l.alvo?.tipo || 'sistema',
          id: l.alvo?.id || l.registroId || 'sys',
          identificador: l.alvo?.identificador || l.registroId || 'REG-SISTEMA',
          nome: l.alvo?.nome || l.detalhes || '',
        },
      }));
    } catch {
      return initialAuditLogs;
    }
  });

  // Conexões recentes (painel da Home) — somente leitura.
  const [connections] = useState<RecentConnection[]>(initialConnections);

  const addAuditLog = (logData: any): ActionAuditLog => {
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    const timestamp = logData.timestamp || new Date().toISOString();
    const safeAlvo = {
      tipo: logData.alvo?.tipo || 'sistema',
      id: logData.alvo?.id || logData.registroId || `sys_${Date.now()}`,
      identificador:
        logData.alvo?.identificador || logData.registroId || logData.identificador || 'REG-SISTEMA',
      nome: logData.alvo?.nome || logData.detalhes || logData.tituloAcao || '',
    };
    const safeAutor = logData.autor || {
      id: logData.usuarioId || currentUser?.id || 'sys',
      nome: logData.usuarioNome || currentUser?.nome || 'Sistema',
      login: currentUser?.login || 'sistema',
      perfil: logData.usuarioPerfil || currentProfile?.name || 'Operador',
    };
    const hash =
      logData.hashIntegridade ||
      generateIntegrityHash(
        `${timestamp}-${logData.tipoAcao || 'ACAO'}-${safeAlvo.identificador}-${currentUser?.id || 'sys'}`
      );
    const newLog: ActionAuditLog = {
      ...logData,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      categoria: logData.categoria || 'SISTEMA',
      tipoAcao: logData.tipoAcao || 'ALTERACAO_SISTEMA',
      tituloAcao: logData.tituloAcao || logData.acao || 'Ação do Sistema',
      descricaoDetalhada: logData.descricaoDetalhada || logData.detalhes || '',
      autor: safeAutor,
      alvo: safeAlvo,
      timestamp,
      hashIntegridade: hash,
      statusConformidade: logData.statusConformidade || 'conforme',
    };

    setAuditLogs((prev) => [newLog, ...prev]);
    return newLog;
  };

  const clearAuditLogs = () => {
    setAuditLogs([]);
    localStorage.removeItem(STORAGE_AUDIT_LOGS);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_AUDIT_LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  const domain: AuditDomain = { auditLogs, addAuditLog, clearAuditLogs, connections };

  return { domain, internal: {} };
}

/** Hook do domínio de Auditoria — uma tela que só mostra/limpa histórico usa este. */
export function useAuditoria(): AuditDomain {
  const ctx = useContext(AuditContext);
  if (!ctx) {
    throw new Error('useAuditoria deve ser usado dentro de <AppProvider> (domínio Auditoria).');
  }
  return ctx;
}
