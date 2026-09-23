import { createContext, useContext, useEffect, useState } from 'react';
import {
  AccessProfile,
  AccessPolicyPermissions,
  Collaborator,
  FieldChange,
  Language,
} from '../../types';
import { initialCollaborators } from '../../mockData';
import { fetchServerProfiles, saveProfileToServer } from '../../services/serverProfileService';
import { fetchServerCollaborators } from '../../services/serverCollaboratorService';
import { fetchServerSurveys } from '../../services/serverSurveyService';
import { apiFetch, setSessionToken, clearSessionToken } from '../../services/apiClient';
import type { AuthDomain, AuthInternal } from './types';
import { domainBridge as bridge } from './bridge';

// =============================================================================
// F3 · Domínio AUTENTICAÇÃO E PERMISSÕES
// Dono do estado: sessão (isAuthenticated/isAuthChecking), usuário atual, perfis
// de acesso (políticas), 2FA e preferências de idioma/tema.
// =============================================================================

const STORAGE_KEYS = {
  LANGUAGE: 'dataquest_lang',
  DARK_MODE: 'dataquest_dark',
  CURRENT_USER_ID: 'dataquest_user_id',
};

export const AuthContext = createContext<AuthDomain | null>(null);

export function useAuthDomain(): { domain: AuthDomain; internal: AuthInternal } {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem(STORAGE_KEYS.LANGUAGE) as Language) || 'pt';
  });

  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    // Paleta aprovada = clara (branco predominante + azul #2b66b0).
    return stored !== null ? stored === 'true' : false;
  });

  // F2 — os perfis vivem no Supabase (fonte única), hidratados após o login.
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);

  const [currentUser, setCurrentUser] = useState<Collaborator>(() => {
    const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (savedId) {
      const found = initialCollaborators.find((c) => c.id === savedId);
      if (found) return found;
    }
    return initialCollaborators[0]; // Admin Master
  });

  // F1 — a autenticação NÃO é decidida por um valor do navegador. O estado
  // inicial é deslogado e a sessão é validada no servidor (GET /api/auth).
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [twoFactorVerified, setTwoFactorVerified] = useState<boolean>(true);
  // Módulo ativo da casca — nasce do login, conforme o perfil do usuário.
  const [activeModule, setActiveModule] = useState<string>('home');

  const setLanguage = (l: Language) => setLanguageState(l);
  const setDarkMode = (d: boolean) => setDarkModeState(d);

  const currentProfile =
    profiles.find((p) => p.id === currentUser.perfilAcessoId) || profiles[0];

  const hasPermission = (perm: keyof AccessPolicyPermissions): boolean => {
    if (!currentProfile) return false;
    return !!currentProfile.permissions[perm];
  };

  const verify2FA = (code: string): boolean => {
    if (code.length === 6) {
      setTwoFactorVerified(true);
      return true;
    }
    return false;
  };

  const updateProfile = (
    updatedProfile: AccessProfile
  ): { changed: boolean; changes: FieldChange[] } => {
    const previous = profiles.find((p) => p.id === updatedProfile.id);
    const keys = Array.from(
      new Set([
        ...Object.keys(previous?.permissions || {}),
        ...Object.keys(updatedProfile.permissions || {}),
      ])
    ) as (keyof AccessPolicyPermissions)[];

    const changes: FieldChange[] = keys
      .filter((k) => Boolean(previous?.permissions?.[k]) !== Boolean(updatedProfile.permissions?.[k]))
      .map((k) => ({
        campo: String(k),
        rotulo: String(k),
        valorAnterior: Boolean(previous?.permissions?.[k]),
        valorNovo: Boolean(updatedProfile.permissions?.[k]),
      }));

    if (changes.length === 0) {
      return { changed: false, changes };
    }

    setProfiles((prev) => prev.map((p) => (p.id === updatedProfile.id ? updatedProfile : p)));

    // F2 — persiste no Supabase (fonte única). Em caso de falha, recarrega do banco
    // para a tela nunca exibir um estado que não foi salvo.
    void saveProfileToServer(updatedProfile)
      .then((res) => {
        if (!res?.profile) return;
        const saved = res.profile;
        setProfiles((prev) => {
          const idx = prev.findIndex((p) => p.id === updatedProfile.id);
          if (idx < 0) return [...prev, saved];
          const next = [...prev];
          next[idx] = saved;
          return next;
        });
      })
      .catch((err) => {
        console.warn('[F2] Falha ao salvar perfil no servidor; recarregando do banco:', err);
        fetchServerProfiles()
          .then((r) => setProfiles(r.profiles))
          .catch(() => undefined);
      });

    const currentUserForLog = bridge.getCurrentUser?.();
    const currentProfileForLog = bridge.getCurrentProfile?.();
    const ativadas = changes.filter((c) => c.valorNovo === true).length;
    const removidas = changes.length - ativadas;
    bridge.addAuditLog?.({
      categoria: 'CONFIGURACAO',
      tipoAcao: 'ALTERACAO_POLITICA_ACESSO',
      tituloAcao: `Política de acesso alterada: ${updatedProfile.name}`,
      descricaoDetalhada: `${changes.length} permissão(ões) alterada(s) no perfil "${updatedProfile.name}" (${ativadas} concedida(s), ${removidas} revogada(s)).`,
      autor: {
        id: currentUserForLog?.id,
        nome: currentUserForLog?.nome,
        login: currentUserForLog?.login,
        perfil: currentProfileForLog?.name || 'Administrador',
      },
      alvo: {
        tipo: 'perfil',
        id: updatedProfile.id,
        identificador: updatedProfile.name,
        nome: updatedProfile.name,
      },
      alteracoes: changes,
      motivoConformidade: 'Ajuste da matriz de privilégios (RBAC) pelo administrador.',
      statusConformidade: removidas > 0 || ativadas > 0 ? 'atencao' : 'conforme',
    });

    return { changed: true, changes };
  };

  /**
   * F1 — aplica o usuário/perfil vindos do servidor no estado local, criando o
   * perfil na lista local se ele ainda não existir.
   */
  const applyServerUser = (serverColab: Collaborator, serverPerfil: AccessProfile): Collaborator => {
    const serverPerms = (serverPerfil?.permissions || {}) as AccessPolicyPermissions;
    const existing =
      profiles.find((p) => p.name === serverPerfil?.name) || profiles.find((p) => p.id === serverPerfil?.id);

    if (existing) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === existing.id ? { ...p, permissions: { ...p.permissions, ...serverPerms } } : p
        )
      );
    } else if (serverPerfil?.id || serverPerfil?.name) {
      setProfiles((prev) => [...prev, { ...serverPerfil, permissions: serverPerms }]);
    }

    const resolvedProfileId = existing?.id || serverPerfil?.id || serverColab.perfilAcessoId;
    const collaborators = bridge.getCollaborators?.() || [];
    const base = collaborators.find((c) => c.login === serverColab.login) || ({} as Collaborator);
    return { ...base, ...serverColab, perfilAcessoId: resolvedProfileId } as Collaborator;
  };

  // Restaura a sessão (se houver) validando SEMPRE no servidor.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/auth', { method: 'GET' });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (!cancelled && data?.success && data.session) {
            const s = data.session as {
              sub: string;
              login: string;
              nome: string;
              perfilId: string;
              perfilNome: string;
              permissions: Record<string, boolean>;
            };
            const user = applyServerUser(
              { id: s.sub, login: s.login, nome: s.nome, perfilAcessoId: s.perfilId, ativo: true } as Collaborator,
              {
                id: s.perfilId,
                name: s.perfilNome,
                description: '',
                permissions: s.permissions as unknown as AccessPolicyPermissions,
              }
            );
            setCurrentUser(user);
            setIsAuthenticated(true);
          }
        }
      } catch {
        // Servidor indisponível: permanece deslogado (não há bypass no cliente).
      } finally {
        if (!cancelled) setIsAuthChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * F2 — HIDRATAÇÃO A PARTIR DO SERVIDOR (fonte única).
   * Lê perfis, colaboradores e pesquisas de /api após a sessão ser validada. O
   * disparo do efeito fica na raiz (AppProvider), que enxerga o domínio de
   * coletas (`effectiveOnline`) e pode reexecutar quando a conexão volta.
   */
  const hydrateFromServer = async () => {
    if (!bridge.getEffectiveOnline?.()) return;

    const [profRes, colabRes, surveyRes] = await Promise.allSettled([
      fetchServerProfiles(),
      fetchServerCollaborators(),
      fetchServerSurveys(),
    ]);

    if (profRes.status === 'fulfilled' && profRes.value.profiles.length > 0) {
      setProfiles(profRes.value.profiles);
    }

    if (colabRes.status === 'fulfilled') {
      const list = colabRes.value;
      bridge.setCollaborators?.(list);
      const me = list.find((c) => c.id === currentUser.id);
      if (me) setCurrentUser(me);
    }

    if (surveyRes.status === 'fulfilled' && surveyRes.value.success) {
      const serverList = surveyRes.value.surveys;
      bridge.setSurveys?.((prev) => {
        // Preserva pesquisas que só existem localmente (cache offline ainda não subiu).
        const serverIds = new Set(serverList.map((s) => s.id));
        const localOnly = prev.filter((s) => !serverIds.has(s.id));
        return [...serverList, ...localOnly];
      });
    }
  };

  const login = async (
    loginInput: string,
    senhaInput: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginInput.trim(), senha: senhaInput }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success || !data.colaborador) {
        return { success: false, error: data?.message || 'Login ou senha inválidos.' };
      }

      setSessionToken(data.sessionToken);
      const colab = applyServerUser(data.colaborador as Collaborator, data.perfil as AccessProfile);
      setCurrentUser(colab);
      setIsAuthenticated(true);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, colab.id);

      const prof = profiles.find((p) => p.id === colab.perfilAcessoId) || (data.perfil as AccessProfile);
      if (prof?.id === 'prof_pesq' || prof?.name?.toLowerCase().includes('pesquisador')) {
        setActiveModule('pesquisador');
      } else {
        setActiveModule('home');
      }

      bridge.addAuditLog?.({
        categoria: 'SISTEMA',
        tipoAcao: 'SINCRONIZACAO_OFFLINE',
        tituloAcao: `Autenticação de Usuário: @${colab.login}`,
        descricaoDetalhada: `Colaborador ${colab.nome} realizou login com sucesso no sistema pelo perfil ${prof?.name || 'Padrão'}.`,
        autor: {
          id: colab.id,
          nome: colab.nome,
          login: colab.login,
          perfil: prof?.name || 'Colaborador',
          ip: '189.40.12.88',
        },
        alvo: {
          tipo: 'colaborador',
          id: colab.id,
          identificador: colab.login,
          nome: colab.nome,
        },
        alteracoes: [{ campo: 'sessao', rotulo: 'Sessão de Acesso', valorNovo: 'Iniciada' }],
        motivoConformidade: 'Autenticação formal de credenciais conforme políticas de segurança.',
        statusConformidade: 'conforme',
      });

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: `Não foi possível concluir o login no servidor: ${err?.message || 'falha de rede'}.`,
      };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    clearSessionToken();
    // Encerra a sessão no servidor (limpa o cookie HttpOnly). Silencioso se offline.
    void apiFetch('/api/auth', { method: 'DELETE' }).catch(() => undefined);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    const themeColor = darkMode ? '#0f172a' : '#f7f9fc';
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', themeColor);
  }, [darkMode]);

  const domain: AuthDomain = {
    isAuthenticated,
    login,
    isAuthChecking,
    logout,
    language,
    setLanguage,
    darkMode,
    setDarkMode,
    currentUser,
    setCurrentUser,
    currentProfile,
    twoFactorVerified,
    setTwoFactorVerified,
    verify2FA,
    profiles,
    updateProfile,
    hasPermission,
    activeModule,
    setActiveModule,
    hydrateFromServer,
  };

  return { domain, internal: {} };
}

/** Hook do domínio de Autenticação/Permissões. */
export function useAuth(): AuthDomain {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AppProvider> (domínio Autenticação).');
  }
  return ctx;
}
