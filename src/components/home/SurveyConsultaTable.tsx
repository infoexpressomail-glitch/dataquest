import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PlusCircle,
  Trash2,
  RotateCcw,
  Server,
  Power,
  Search,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
  Database,
  Share2,
  Link2,
  CheckCircle2,
} from 'lucide-react';
import { Survey } from '../../types';
import { shareFieldLink } from '../../field/fieldRoute';

/**
 * Nova seção "Consulta de Pesquisas" do Dashboard principal, em formato de tabela.
 * Replica os elementos da tela de referência: breadcrumb Home / Pesquisas / Consulta,
 * botão "Criar uma Nova Pesquisa", toggle "Exibir pesquisas excluidas?", paginação
 * "Visualizando X registros por página", filtro "Filtrar registros:" e a tabela com
 * Código, Descrição, Colaborador, Data e Ações (toggle ativo/inativo, lixeira, servidor).
 */
export const SurveyConsultaTable: React.FC = () => {
  const {
    surveys,
    collaborators,
    currentUser,
    currentProfile,
    hasPermission,
    setActiveModule,
    setEditingSurvey,
    toggleSurveyStatus,
    deleteSurvey,
    restoreSurvey,
  } = useApp();

  const [exibirExcluidas, setExibirExcluidas] = useState(false);
  const [termo, setTermo] = useState('');
  const [porPagina, setPorPagina] = useState(10);
  const [pagina, setPagina] = useState(1);

  // Feedback visual (toast) para o compartilhamento de link de coleta
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  };

  const canCreate = hasPermission('pesquisa_criar');
  const canDelete = hasPermission('pesquisa_excluir');
  const canToggleActive = hasPermission('pesquisa_desativar');
  const accessAllWithoutAssociation = hasPermission('pesquisa_acessa_todas_sem_associacao');

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  const colaboradorDe = (survey: Survey): string => {
    // O "Colaborador" é o pesquisador vinculado à pesquisa (primeiro associado)
    // ou, na ausência, o colaboradorWebId, ou o próprio usuário logado.
    const assoc = survey.pesquisadoresIds
      .map((id) => collaborators.find((c) => c.id === id))
      .find((c) => c);
    const web = collaborators.find((c) => c.id === survey.colaboradorWebId);
    const res = assoc || web;
    if (res) return res.nome;
    return currentUser?.nome || '—';
  };

  const filtrados = useMemo(() => {
    return surveys.filter((s) => {
      // Modo pesquisador: apenas pesquisas ativas atribuídas a ele.
      if (isResearcher) {
        if (s.status !== 'ativa') return false;
        const isAssociated =
          s.pesquisadoresIds.includes(currentUser.id) ||
          (currentUser.pesquisasVinculadasIds && currentUser.pesquisasVinculadasIds.includes(s.id));
        if (!isAssociated) return false;
      } else if (!accessAllWithoutAssociation) {
        const isAssociated =
          s.pesquisadoresIds.includes(currentUser.id) ||
          (currentUser.pesquisasVinculadasIds && currentUser.pesquisasVinculadasIds.includes(s.id));
        if (!isAssociated) return false;
      }

      // Toggle "Exibir pesquisas excluidas?"
      if (!exibirExcluidas && s.status === 'excluida') return false;

      // Filtro por termo
      if (termo.trim()) {
        const t = termo.toLowerCase();
        const matches =
          s.nome.toLowerCase().includes(t) ||
          s.codigo.toLowerCase().includes(t) ||
          s.descricao.toLowerCase().includes(t);
        if (!matches) return false;
      }
      return true;
    });
  }, [surveys, collaborators, currentUser, isResearcher, exibirExcluidas, termo, accessAllWithoutAssociation]);

  // Ordena por data de criação (mais recente primeiro), como na referência.
  const ordenados = useMemo(
    () =>
      [...filtrados].sort(
        (a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime()
      ),
    [filtrados]
  );

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visiveis = ordenados.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina);

  const formatarData = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR');
  };

  const handleCreateNew = () => {
    setEditingSurvey(null);
    setActiveModule('wizard');
  };

  // Compartilha o link do Modo Pesquisador (login de campo) relacionado à pesquisa.
  // O link leva o pesquisador à tela de login de campo (/campo), onde ele entra
  // com login e senha cadastrados; ao autenticar, só veem as pesquisas habilitadas
  // (ativas) vinculadas ao login.
  const handleShare = async (survey: Survey) => {
    const result = await shareFieldLink({
      surveyName: survey.nome,
      surveyCode: survey.codigo,
    });
    if (result === 'shared') {
      notify(`Link de coleta compartilhado: ${survey.nome}.`);
    } else if (result === 'copied') {
      notify(`Link de coleta copiado! Compartilhe com o pesquisador de ${survey.nome}.`);
    } else {
      notify('Não foi possível copiar o link automaticamente. Abra /campo no navegador.');
    }
  };

  return (
    <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[11px] text-muted">
        <span>Home</span>
        <span className="text-muted/50">/</span>
        <span>Pesquisas</span>
        <span className="text-muted/50">/</span>
        <span className="font-semibold text-primary">Consulta</span>
      </nav>

      {/* Cabeçalho da seção */}
      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-bold tracking-tight text-primary">
            Consulta de Pesquisas
          </h2>
          <p className="text-xs text-muted">
            Visualize e gerencie as pesquisas cadastradas no sistema.
          </p>
        </div>

        {canCreate && (
          <button
            id="btn-consulta-nova-pesquisa"
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-danger-solid px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-900/30 hover:bg-accent-danger-solid-hover transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Criar uma Nova Pesquisa
          </button>
        )}
      </div>

      {/* Barra de controles: toggle excluídas + paginação + filtro */}
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          {/* Toggle exibir excluídas */}
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-secondary select-none">
            <button
              type="button"
              role="switch"
              aria-checked={exibirExcluidas}
              onClick={() => {
                setExibirExcluidas((v) => !v);
                setPagina(1);
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                exibirExcluidas ? 'bg-accent-danger-solid' : 'bg-surface-raised'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  exibirExcluidas ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span>Exibir pesquisas excluidas?</span>
          </label>

          {/* Paginação */}
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Visualizando</span>
            <select
              value={porPagina}
              onChange={(e) => {
                setPorPagina(Number(e.target.value));
                setPagina(1);
              }}
              className="w-20 rounded-lg border border-ui bg-surface-card px-2 py-1.5 text-xs font-bold text-primary focus:border-emerald-500 focus:outline-none"
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>registros por página</span>
          </div>
        </div>

        {/* Filtro */}
        <div className="flex w-full items-center gap-2 lg:w-auto">
          <span className="text-xs text-muted whitespace-nowrap">Filtrar registros:</span>
          <div className="relative flex-1 lg:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={termo}
              onChange={(e) => {
                setTermo(e.target.value);
                setPagina(1);
              }}
              placeholder="Nome, código ou descrição..."
              className="w-full rounded-lg border border-ui bg-surface-card py-2 pl-9 pr-3 text-xs text-primary placeholder-slate-500 shadow-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tabela de pesquisas */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-ui">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-surface-raised text-muted">
            <tr>
              <th className="px-3 py-2.5 font-bold">Código</th>
              <th className="px-3 py-2.5 font-bold">Descrição</th>
              <th className="px-3 py-2.5 font-bold">Colaborador</th>
              <th className="px-3 py-2.5 font-bold">Data</th>
              <th className="px-3 py-2.5 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ui">
            {visiveis.map((survey) => {
              const excluida = survey.status === 'excluida';
              const ativa = survey.status === 'ativa';
              return (
                <tr key={survey.id} className={`bg-surface ${excluida ? 'opacity-70' : ''}`}>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-surface-raised border border-ui/60 px-2 py-0.5 font-mono font-bold text-primary">
                      {survey.codigo}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-primary">{survey.nome}</span>
                    {survey.descricao && (
                      <span className="mt-0.5 block max-w-[360px] truncate text-[11px] text-muted">
                        {survey.descricao}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-secondary">
                    {colaboradorDe(survey)}
                  </td>
                  <td className="px-3 py-2.5 text-muted whitespace-nowrap">
                    {formatarData(survey.criadaEm)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Compartilhar link de coleta (login de campo) — só para pesquisa habilitada/ativa */}
                      {survey.status === 'ativa' && !excluida && (
                        <button
                          type="button"
                          onClick={() => handleShare(survey)}
                          title="Compartilhar link de coleta (login de campo)"
                          className="rounded-lg p-1.5 text-accent-primary hover:bg-accent-primary-soft hover:text-accent-primary transition-colors"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Toggle ativo/inativo */}
                      {canToggleActive && !excluida && survey.status !== 'concluida' && (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={ativa}
                          onClick={() => toggleSurveyStatus(survey.id)}
                          title={ativa ? 'Desativar pesquisa' : 'Ativar pesquisa'}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                            ativa ? 'bg-accent-success-solid' : 'bg-accent-danger-solid'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              ativa ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      )}

                      {/* Servidor / banco de dados */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSurvey(survey);
                          setActiveModule('wizard');
                        }}
                        title="Abrir pesquisa (Wizard)"
                        className="rounded-lg p-1.5 text-accent-info hover:bg-surface-raised transition-colors"
                      >
                        <Server className="h-4 w-4" />
                      </button>

                      {/* Excluir / Restaurar */}
                      {excluida ? (
                        <button
                          type="button"
                          onClick={() => restoreSurvey(survey.id)}
                          title="Restaurar pesquisa excluída"
                          className="rounded-lg p-1.5 text-accent-success hover:bg-surface-raised transition-colors"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : (
                        canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Deseja mover a pesquisa "${survey.nome}" para a lixeira?`)) {
                                deleteSurvey(survey.id);
                              }
                            }}
                            title="Excluir pesquisa"
                            className="rounded-lg p-1.5 text-accent-info hover:bg-accent-danger-soft hover:text-accent-danger transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center">
                  <FileQuestion className="mx-auto h-8 w-8 text-muted" />
                  <p className="mt-2 text-xs font-semibold text-muted">
                    Nenhuma pesquisa encontrada.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé da tabela: contagem + navegação */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" />
          {ordenados.length} registro(s) encontrado(s)
        </span>

        {totalPaginas > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={paginaSegura <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-ui bg-surface-card px-2 py-1 text-xs font-bold text-primary disabled:opacity-40 hover:bg-surface-raised transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="font-semibold text-secondary">
              Página {paginaSegura} de {totalPaginas}
            </span>
            <button
              type="button"
              disabled={paginaSegura >= totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              className="rounded-lg border border-ui bg-surface-card px-2 py-1 text-xs font-bold text-primary disabled:opacity-40 hover:bg-surface-raised transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Toast de feedback do compartilhamento de link */}
      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed bottom-14 right-4 z-50 flex max-w-sm items-center gap-2.5 rounded-xl border border-accent-success-soft-border bg-surface-raised px-4 py-3 text-xs font-semibold text-primary shadow-2xl"
        >
          {toast.includes('copiado') || toast.includes('compartilhado') ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-success" />
          ) : (
            <Link2 className="h-4 w-4 shrink-0 text-accent-primary" />
          )}
          <span className="leading-snug">{toast}</span>
        </div>
      )}
    </div>
  );
};
