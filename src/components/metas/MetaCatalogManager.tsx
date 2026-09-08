import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BaseMeta } from '../../types';
import {
  FAIXAS_ETARIAS_PADRAO,
  OPCOES_BAIRROS_PADRAO,
  OPCOES_SEXO_PADRAO,
  OPCOES_ESCOLARIDADE_PADRAO,
} from '../../utils/demographicGoalsHelper';
import {
  Library,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Sliders,
  MapPin,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

interface MetaCatalogManagerProps {
  canManageMetas: boolean;
}

/**
 * Gerenciamento do Catálogo de Metas Base reutilizáveis no sistema base.
 * As metas aqui são apenas critérios amostrais (idade, sexo, escolaridade,
 * bairro). Ao montar uma pesquisa, o Wizard permite selecionar estas metas e
 * configurar as cotas por pesquisador (gerando os GlobalDemographicTarget).
 */
export const MetaCatalogManager: React.FC<MetaCatalogManagerProps> = ({
  canManageMetas,
}) => {
  const { baseMetas, saveBaseMeta, deleteBaseMeta } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [faixaEtaria, setFaixaEtaria] = useState<string>('Todas');
  const [sexo, setSexo] = useState<string>('Todos');
  const [escolaridade, setEscolaridade] = useState<string>('Todos');
  const [bairro, setBairro] = useState<string>('Todos');
  const [metaGlobalAlvo, setMetaGlobalAlvo] = useState<number>(50);
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitulo('');
    setDescricao('');
    setFaixaEtaria('Todas');
    setSexo('Todos');
    setEscolaridade('Todos');
    setBairro('Todos');
    setMetaGlobalAlvo(50);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (meta: BaseMeta) => {
    setEditingId(meta.id);
    setTitulo(meta.titulo);
    setDescricao(meta.descricao || '');
    setFaixaEtaria(meta.criterios.faixaEtaria || 'Todas');
    setSexo(meta.criterios.sexo || 'Todos');
    setEscolaridade(meta.criterios.escolaridade || 'Todos');
    setBairro(meta.criterios.bairro || 'Todos');
    setMetaGlobalAlvo(meta.metaGlobalAlvo);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setFormError('Informe um título descritivo para a meta base.');
      return;
    }

    const meta: BaseMeta = {
      id: editingId || `base_${Date.now()}`,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      criterios: {
        faixaEtaria,
        sexo: sexo as any,
        escolaridade,
        bairro,
      },
      metaGlobalAlvo: Number(metaGlobalAlvo) || 1,
      status: 'ativa',
      criadoEm: editingId
        ? baseMetas.find((m) => m.id === editingId)?.criadoEm || new Date().toISOString()
        : new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    saveBaseMeta(meta);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, tituloMeta: string) => {
    if (confirm(`Tem certeza que deseja remover a meta base "${tituloMeta}" do catálogo?`)) {
      deleteBaseMeta(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
              <Library className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-primary">
                Catálogo de Metas Base
              </h2>
              <p className="text-[11px] text-muted">
                Metas amostrais reutilizáveis (idade, sexo, escolaridade, bairro). Ao montar uma pesquisa, o Wizard permite selecioná-las e configurar as cotas por pesquisador.
              </p>
            </div>
          </div>

          {canManageMetas && (
            <button
              type="button"
              id="btn-open-create-base-meta"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-primary-solid px-4 py-2.5 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-all shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Meta Base</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista de metas base */}
      <div className="space-y-3">
        {baseMetas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ui bg-surface p-12 text-center">
            <Library className="mx-auto h-10 w-10 text-muted" />
            <h3 className="mt-3 text-sm font-bold text-secondary">
              Nenhuma meta base cadastrada
            </h3>
            <p className="mt-1 text-xs text-muted max-w-md mx-auto">
              Cadastre critérios amostrais reutilizáveis (idade, sexo, escolaridade, bairro) que
              serão oferecidos ao montar novas pesquisas.
            </p>
            {canManageMetas && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Primeira Meta Base
              </button>
            )}
          </div>
        ) : (
          baseMetas.map((meta) => {
            const hasCriteria =
              (meta.criterios.faixaEtaria && meta.criterios.faixaEtaria !== 'Todas') ||
              (meta.criterios.sexo && meta.criterios.sexo !== 'Todos') ||
              (meta.criterios.escolaridade && meta.criterios.escolaridade !== 'Todos') ||
              (meta.criterios.bairro && meta.criterios.bairro !== 'Todos');

            return (
              <div
                key={meta.id}
                className="rounded-2xl border border-ui bg-surface-card overflow-hidden shadow-xl"
              >
                <div className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-primary-soft border border-accent-primary-soft-border px-2.5 py-0.5 text-[11px] font-bold text-accent-primary">
                          <Sparkles className="h-3 w-3" /> Meta Base Reutilizável
                        </span>
                        <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-[10px] font-mono text-muted">
                          {meta.id}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-primary">{meta.titulo}</h3>

                      {meta.descricao && (
                        <p className="text-xs text-muted leading-relaxed max-w-3xl">
                          {meta.descricao}
                        </p>
                      )}

                      {/* Critérios */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {meta.criterios.faixaEtaria && meta.criterios.faixaEtaria !== 'Todas' && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-accent-purple-soft border border-accent-purple-soft-border px-2.5 py-1 text-xs font-medium text-accent-purple">
                            🎂 Faixa Etária: {meta.criterios.faixaEtaria}
                          </span>
                        )}
                        {meta.criterios.sexo && meta.criterios.sexo !== 'Todos' && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 text-xs font-medium text-accent-danger">
                            ⚧ Sexo:{' '}
                            {meta.criterios.sexo === 'F'
                              ? 'Feminino'
                              : meta.criterios.sexo === 'M'
                              ? 'Masculino'
                              : meta.criterios.sexo}
                          </span>
                        )}
                        {meta.criterios.escolaridade && meta.criterios.escolaridade !== 'Todos' && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-accent-info-soft border border-accent-info-soft-border px-2.5 py-1 text-xs font-medium text-accent-info">
                            <GraduationCap className="h-3 w-3" /> Escolaridade: {meta.criterios.escolaridade}
                          </span>
                        )}
                        {meta.criterios.bairro && meta.criterios.bairro !== 'Todos' && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-accent-success-soft border border-accent-success-soft-border px-2.5 py-1 text-xs font-medium text-accent-success">
                            <MapPin className="h-3 w-3" /> Bairro: {meta.criterios.bairro}
                          </span>
                        )}
                        {!hasCriteria && (
                          <span className="rounded-lg bg-surface-raised px-2.5 py-1 text-xs text-muted">
                            Demografia Aberta (Todos os Segmentos)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 lg:flex-col lg:items-end">
                      <div className="text-right">
                        <span className="block text-2xl font-black text-primary">
                          {meta.metaGlobalAlvo}
                        </span>
                        <span className="text-[10px] text-muted">alvo global (amostra)</span>
                      </div>

                      {canManageMetas && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(meta)}
                            title="Editar meta base"
                            className="rounded-lg p-2 text-muted hover:bg-surface-raised hover:text-accent-primary transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(meta.id, meta.titulo)}
                            title="Excluir meta base"
                            className="rounded-lg p-2 text-muted hover:bg-accent-danger-soft hover:text-accent-danger transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Criar/Editar Meta Base */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-ui bg-surface p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-ui pb-4">
              <div className="flex items-center gap-2">
                <Library className="h-5 w-5 text-accent-primary" />
                <h3 className="text-base font-bold text-primary">
                  {editingId ? 'Editar Meta Base' : 'Nova Meta Base do Catálogo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent-danger-soft-border bg-accent-danger-soft p-3 text-xs text-accent-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-secondary">
                  Título da Meta Base *
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Cota de Sexo Feminino, Jovens 18 a 25 anos..."
                  className="mt-1 w-full rounded-xl border border-ui bg-surface-card px-3.5 py-2.5 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary">
                  Instruções de Campo / Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Abordar no perímetro do estande municipal..."
                  className="mt-1 w-full rounded-xl border border-ui bg-surface-card px-3.5 py-2 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
                />
              </div>

              {/* Critérios Demográficos */}
              <div className="rounded-xl border border-ui bg-surface-card/80 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-accent-primary" />
                  Critérios de Agregação Demográfica
                </h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted">
                      🎂 Faixa Etária
                    </label>
                    <select
                      value={faixaEtaria}
                      onChange={(e) => setFaixaEtaria(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-2.5 py-2 text-xs text-primary focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Todas">Todas as faixas</option>
                      {FAIXAS_ETARIAS_PADRAO.map((faixa) => (
                        <option key={faixa} value={faixa}>
                          {faixa}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted">
                      ⚧ Sexo / Gênero
                    </label>
                    <select
                      value={sexo}
                      onChange={(e) => setSexo(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-2.5 py-2 text-xs text-primary focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Todos">Todos os gêneros</option>
                      <option value="F">Feminino</option>
                      <option value="M">Masculino</option>
                      <option value="Outro">Outro / Não informado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted">
                      <GraduationCap className="h-3 w-3 inline mr-1" />
                      Escolaridade
                    </label>
                    <select
                      value={escolaridade}
                      onChange={(e) => setEscolaridade(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-2.5 py-2 text-xs text-primary focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Todos">Todas as escolaridades</option>
                      {OPCOES_ESCOLARIDADE_PADRAO.map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted">
                      📍 Bairro / Região
                    </label>
                    <select
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-2.5 py-2 text-xs text-primary focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Todos">Todos os bairros</option>
                      {OPCOES_BAIRROS_PADRAO.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Meta Alvo Total */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-secondary">
                    Meta Global Alvo (Coletas Consolidadas)
                  </label>
                  <span className="text-[11px] text-muted">
                    Total esperado para este estrato amostral
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  required
                  value={metaGlobalAlvo}
                  onChange={(e) => setMetaGlobalAlvo(Number(e.target.value))}
                  className="w-32 rounded-xl border border-ui bg-surface-card px-3.5 py-2 text-xs font-bold text-primary text-right focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-ui">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-muted hover:bg-surface-raised hover:text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-save-base-meta"
                  className="rounded-xl bg-accent-primary-solid px-5 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors"
                >
                  {editingId ? 'Atualizar Meta Base' : 'Salvar Meta Base'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
