import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ConditionOperator,
  InterviewSubmission,
  MetaCompositionRule,
  MetaTarget,
  Survey,
} from '../../types';
import {
  calculateCompositionMetaProgress,
  CONDITION_LABELS,
  COMPOSITION_CONDITIONS,
} from '../../utils/metaComposition';
import {
  Target,
  Plus,
  Trash2,
  Sliders,
  Layers,
  Lock,
  LockOpen,
  CheckCircle2,
  Clock,
  Users,
  Save,
  Info,
  Globe2,
} from 'lucide-react';

interface MetaCompositionScreenProps {
  activeSurvey: Survey;
  canManageMetas: boolean;
}

/**
 * Tela "Metas" — Composição da meta.
 * Breadcrumb: Home / Pesquisa / Metas.
 * Cards: Composição da meta (Pergunta→Condição→Resposta + Incluir + tabela),
 * Configurações de Quantidade (Geral / Por pesquisador + Quantidade de coletas),
 * e rodapé (Nome da meta + toggle "Bloquear coletas após atingir a meta" + Salvar).
 */
export const MetaCompositionScreen: React.FC<MetaCompositionScreenProps> = ({
  activeSurvey,
  canManageMetas,
}) => {
  const { submissions, saveSurvey } = useApp();

  // ---- Estado do formulário ----
  const [nome, setNome] = useState('');
  const [perguntaId, setPerguntaId] = useState('');
  const [condicao, setCondicao] = useState<ConditionOperator>('igual');
  const [resposta, setResposta] = useState('');
  const [regras, setRegras] = useState<MetaCompositionRule[]>([]);
  const [distribuicao, setDistribuicao] = useState<'geral' | 'por_pesquisador'>('geral');
  const [quantidade, setQuantidade] = useState<number>(50);
  const [quantidadePorPesquisador, setQuantidadePorPesquisador] = useState<number>(10);
  const [bloquearAposAtingir, setBloquearAposAtingir] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const metas = activeSurvey.metas || [];
  const perguntas = activeSurvey.perguntas || [];

  const selectedPergunta = perguntas.find((p) => p.id === perguntaId);
  const hasOpcoes = !!selectedPergunta?.opcoes && selectedPergunta.opcoes.length > 0;

  // Quando seleciona a pergunta, pré-seleciona a primeira opção como resposta (se houver)
  const handleSelectPergunta = (id: string) => {
    setPerguntaId(id);
    const q = perguntas.find((p) => p.id === id);
    if (q?.opcoes && q.opcoes.length > 0) {
      setResposta(q.opcoes[0].value || q.opcoes[0].label);
    } else {
      setResposta('');
    }
  };

  const handleIncluirRegra = () => {
    if (!perguntaId) {
      setFormError('Selecione a Pergunta antes de incluir a regra.');
      return;
    }
    if (!resposta.trim()) {
      setFormError('Informe/Selecione a Resposta esperada para a regra.');
      return;
    }
    const pergunta = perguntas.find((p) => p.id === perguntaId);
    const novaRegra: MetaCompositionRule = {
      id: `regra_${Date.now()}`,
      perguntaId,
      perguntaCodigo: pergunta?.codigo || perguntaId,
      perguntaEnunciado: pergunta?.enunciado || perguntaId,
      condicao,
      resposta: resposta.trim(),
    };
    setRegras((prev) => [...prev, novaRegra]);
    setFormError(null);
  };

  const handleRemoverRegra = (id: string) => {
    setRegras((prev) => prev.filter((r) => r.id !== id));
  };

  const handleOpenEdit = (meta: MetaTarget) => {
    setEditingId(meta.id);
    setNome(meta.nome || '');
    setRegras(meta.composicao || []);
    setDistribuicao(meta.distribuicao || 'geral');
    setQuantidade(meta.quantidadeAlvo || 0);
    setQuantidadePorPesquisador(meta.quantidadeAlvoPorPesquisador || 10);
    setBloquearAposAtingir(!!meta.bloquearAposAtingir);
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetForm = () => {
    setEditingId(null);
    setNome('');
    setRegras([]);
    setDistribuicao('geral');
    setQuantidade(50);
    setQuantidadePorPesquisador(10);
    setBloquearAposAtingir(false);
    setPerguntaId('');
    setResposta('');
    setFormError(null);
  };

  const handleSalvar = () => {
    if (!nome.trim()) {
      setFormError('Informe o Nome da meta.');
      return;
    }
    if (regras.length === 0) {
      setFormError('Inclua ao menos uma regra de composição (Pergunta → Condição → Resposta).');
      return;
    }
    const alvo =
      distribuicao === 'por_pesquisador' ? quantidadePorPesquisador : quantidade;
    if (!alvo || alvo <= 0) {
      setFormError('Defina a Quantidade de coletas da meta (maior que 0).');
      return;
    }

    const agora = new Date().toISOString();
    const primeira = regras[0];
    const novaMeta: MetaTarget = {
      id: editingId || `mc_${Date.now()}`,
      pesquisaId: activeSurvey.id,
      perguntaId: primeira.perguntaId,
      condicao: primeira.condicao,
      resposta: primeira.resposta,
      quantidadeAlvo: distribuicao === 'geral' ? alvo : quantidade || alvo,
      quantidadeAtingida: 0,
      ciclo: `Ciclo ${activeSurvey.cicloAtual} - ${new Date().getFullYear()}`,
      nome: nome.trim(),
      composicao: regras,
      distribuicao,
      quantidadeAlvoPorPesquisador:
        distribuicao === 'por_pesquisador' ? alvo : undefined,
      bloquearAposAtingir,
      status: 'ativa',
      criadoEm: editingId
        ? metas.find((m) => m.id === editingId)?.criadoEm || agora
        : agora,
      atualizadoEm: agora,
    };

    const updated = editingId
      ? metas.map((m) => (m.id === editingId ? novaMeta : m))
      : [...metas, novaMeta];

    saveSurvey({ ...activeSurvey, metas: updated });
    handleResetForm();
  };

  const handleDelete = (metaId: string) => {
    const target = metas.find((m) => m.id === metaId);
    if (confirm(`Remover a meta "${target?.nome || metaId}"?`)) {
      saveSurvey({
        ...activeSurvey,
        metas: metas.filter((m) => m.id !== metaId),
      });
    }
  };

  const pesquisaSubmissions = useMemo(
    () => submissions.filter((s) => s.pesquisaId === activeSurvey.id),
    [submissions, activeSurvey.id]
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Título */}
      <div>
        <nav className="flex items-center gap-1.5 text-[11px] text-muted">
          <span>Home</span>
          <span className="text-muted/50">/</span>
          <span>Pesquisa</span>
          <span className="text-muted/50">/</span>
          <span className="font-semibold text-primary">Metas</span>
        </nav>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">Metas</h1>
          <span className="rounded-full bg-accent-primary-soft border border-accent-primary-soft-border px-2.5 py-0.5 text-[11px] font-bold text-accent-primary">
            {activeSurvey.nome}
          </span>
        </div>
      </div>

      {formError && (
        <div className="flex items-center gap-2 rounded-xl border border-accent-danger-soft-border bg-accent-danger-soft p-3 text-xs text-accent-danger">
          <Info className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {editingId && (
        <div className="flex items-center justify-between rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft px-4 py-2.5 text-xs font-semibold text-accent-primary">
          <span className="flex items-center gap-1.5">
            <Target className="h-4 w-4" /> Editando meta — preencha os campos e clique em Salvar.
          </span>
          <button
            type="button"
            onClick={handleResetForm}
            className="rounded-lg px-2 py-1 hover:bg-accent-primary-soft transition-colors"
          >
            Cancelar edição
          </button>
        </div>
      )}

      {/* Grid: Composição da meta (esquerda) + Configurações de Quantidade (direita) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Card Composição da meta */}
        <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
          <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
            <Layers className="h-4 w-4 text-accent-primary" />
            Composição da meta
          </h3>
          <p className="mt-1 text-[11px] text-muted">
            Defina as regras de filtro por pergunta. A entrevista só conta para a meta quando atende a
            todas as regras incluídas.
          </p>

          {/* Campos Pergunta / Condição / Resposta */}
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Pergunta */}
              <div>
                <label className="block text-xs font-bold text-secondary">Pergunta *</label>
                <select
                  value={perguntaId}
                  onChange={(e) => handleSelectPergunta(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-2.5 py-2 text-xs text-primary focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  {perguntas.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.codigo}. {q.enunciado.slice(0, 40)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condição */}
              <div>
                <label className="block text-xs font-bold text-secondary">Condição *</label>
                <select
                  value={condicao}
                  onChange={(e) => setCondicao(e.target.value as ConditionOperator)}
                  className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-2.5 py-2 text-xs text-primary focus:border-emerald-500 focus:outline-none"
                >
                  {COMPOSITION_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resposta */}
              <div>
                <label className="block text-xs font-bold text-secondary">Resposta *</label>
                {hasOpcoes ? (
                  <select
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-2.5 py-2 text-xs text-primary focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Selecione...</option>
                    {selectedPergunta!.opcoes!.map((o) => (
                      <option key={o.id} value={o.value || o.label}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    placeholder="Digite a resposta esperada..."
                    className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-2.5 py-2 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                id="btn-incluir-regra-meta"
                onClick={handleIncluirRegra}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-danger-solid px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-900/30 hover:bg-accent-danger-solid-hover transition-colors"
              >
                <Plus className="h-4 w-4" />
                Incluir
              </button>
            </div>
          </div>

          {/* Tabela de regras */}
          <div className="mt-5 overflow-hidden rounded-xl border border-ui">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-raised text-muted">
                <tr>
                  <th className="px-3 py-2 font-bold">Pergunta</th>
                  <th className="px-3 py-2 font-bold">Condição</th>
                  <th className="px-3 py-2 font-bold">Resposta</th>
                  <th className="px-3 py-2 font-bold text-right">Remover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui">
                {regras.map((regra) => (
                  <tr key={regra.id} className="bg-surface">
                    <td className="px-3 py-2 text-primary">
                      <span className="font-mono text-[10px] text-muted">[{regra.perguntaCodigo}]</span>{' '}
                      {regra.perguntaEnunciado.slice(0, 32)}
                    </td>
                    <td className="px-3 py-2 text-secondary">{CONDITION_LABELS[regra.condicao]}</td>
                    <td className="px-3 py-2 text-secondary">"{regra.resposta}"</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoverRegra(regra.id)}
                        className="rounded-lg p-1 text-muted hover:bg-accent-danger-soft hover:text-accent-danger transition-colors"
                        title="Remover regra"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {regras.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted">
                      Nenhuma regra incluída ainda. Use os campos acima e clique em{' '}
                      <strong>Incluir</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card Configurações de Quantidade */}
        <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl h-fit">
          <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
            <Sliders className="h-4 w-4 text-accent-primary" />
            Configurações de Quantidade
          </h3>

          {/* Radio Geral / Por pesquisador */}
          <div className="mt-4 space-y-2.5">
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                distribuicao === 'geral'
                  ? 'border-accent-success-soft-border bg-accent-success-soft'
                  : 'border-ui bg-surface-card hover:bg-surface-raised'
              }`}
            >
              <input
                type="radio"
                name="distribuicao"
                checked={distribuicao === 'geral'}
                onChange={() => setDistribuicao('geral')}
                className="h-4 w-4 accent-emerald-600"
              />
              <div>
                <span className="block text-xs font-bold text-primary">Geral</span>
                <span className="text-[10px] text-muted">
                  Meta comum a toda a equipe de pesquisadores.
                </span>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                distribuicao === 'por_pesquisador'
                  ? 'border-accent-success-soft-border bg-accent-success-soft'
                  : 'border-ui bg-surface-card hover:bg-surface-raised'
              }`}
            >
              <input
                type="radio"
                name="distribuicao"
                checked={distribuicao === 'por_pesquisador'}
                onChange={() => setDistribuicao('por_pesquisador')}
                className="h-4 w-4 accent-emerald-600"
              />
              <div>
                <span className="block text-xs font-bold text-primary">Por pesquisador</span>
                <span className="text-[10px] text-muted">
                  Cada pesquisador tem a própria meta de coleta.
                </span>
              </div>
            </label>
          </div>

          {/* Quantidade de coletas */}
          <div className="mt-4">
            <label className="block text-xs font-bold text-secondary">
              {distribuicao === 'por_pesquisador'
                ? 'Quantidade de coletas por pesquisador'
                : 'Quantidade de coletas'}
            </label>
            <input
              type="number"
              min={0}
              value={
                distribuicao === 'por_pesquisador' ? quantidadePorPesquisador : quantidade
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                if (distribuicao === 'por_pesquisador') setQuantidadePorPesquisador(v);
                else setQuantidade(v);
              }}
              className="mt-1 w-full rounded-xl border border-ui bg-surface-card px-3.5 py-2.5 text-xs font-bold text-primary focus:border-emerald-500 focus:outline-none"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              {distribuicao === 'por_pesquisador'
                ? 'Esta meta é individual. Defina a quantidade de questionários que cada pesquisador deve coletar.'
                : 'Esta meta é comum a todos os pesquisadores. Defina no campo acima a quantidade total de questionários a serem coletados por toda a equipe.'}
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé: Nome da meta + toggle bloquear + Salvar */}
      <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Nome da meta */}
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-secondary">Nome da meta</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Meta de bairro Praça da Bandeira"
              className="mt-1 w-full rounded-xl border border-ui bg-surface-card px-3.5 py-2.5 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Toggle Bloquear coletas */}
          <div className="lg:col-span-1 flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={bloquearAposAtingir}
              onClick={() => setBloquearAposAtingir((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                bloquearAposAtingir ? 'bg-accent-success-solid' : 'bg-surface-raised'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  bloquearAposAtingir ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <div className="flex items-start gap-2">
              {bloquearAposAtingir ? (
                <Lock className="mt-0.5 h-4 w-4 text-accent-success" />
              ) : (
                <LockOpen className="mt-0.5 h-4 w-4 text-muted" />
              )}
              <div>
                <span className="block text-xs font-bold text-primary">
                  Bloquear coletas após atingir a meta
                </span>
                <span className="text-[10px] text-muted">
                  {bloquearAposAtingir
                    ? 'Quando a meta for atingida, novas coletas que se encaixam são bloqueadas.'
                    : 'A meta não bloqueia novas coletas após ser atingida.'}
                </span>
              </div>
            </div>
          </div>

          {/* Salvar */}
          <div className="lg:col-span-1 flex items-end justify-start lg:justify-end">
            <button
              type="button"
              id="btn-salvar-meta-composicao"
              onClick={handleSalvar}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-danger-solid px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-900/30 hover:bg-accent-danger-solid-hover transition-colors"
            >
              <Save className="h-4 w-4" />
              Salvar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de metas de composição cadastradas */}
      {canManageMetas && metas.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
            <Target className="h-4 w-4 text-accent-primary" />
            Metas cadastradas ({metas.length})
          </h3>

          {metas.map((meta) => {
            const progress = calculateCompositionMetaProgress(meta, pesquisaSubmissions);
            const regrasMeta = meta.composicao || [];
            return (
              <div
                key={meta.id}
                className="rounded-2xl border border-ui bg-surface p-4 shadow-xl"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          progress.status === 'concluida'
                            ? 'bg-accent-success-soft text-accent-success border border-accent-success-soft-border'
                            : progress.status === 'pausada'
                            ? 'bg-accent-warning-soft text-accent-warning border border-accent-warning-soft-border'
                            : 'bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border'
                        }`}
                      >
                        {progress.status === 'concluida' ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Atingida
                          </>
                        ) : progress.status === 'pausada' ? (
                          <>
                            <Clock className="h-3 w-3" /> Pausada
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" /> Em Andamento
                          </>
                        )}
                      </span>
                      <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-[10px] text-muted">
                        {meta.distribuicao === 'por_pesquisador' ? 'Por pesquisador' : 'Geral'}
                      </span>
                      {meta.bloquearAposAtingir && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-danger-soft border border-accent-danger-soft-border px-2.5 py-0.5 text-[10px] font-bold text-accent-danger">
                          <Lock className="h-3 w-3" /> Bloqueia coletas
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-primary">
                      {meta.nome || 'Meta'}
                    </h4>

                    {/* Regras de composição */}
                    {regrasMeta.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {regrasMeta.map((r) => (
                          <span
                            key={r.id}
                            className="rounded-lg bg-surface-raised px-2 py-1 text-[10px] text-muted"
                          >
                            [{r.perguntaCodigo}] {r.perguntaEnunciado.slice(0, 18)} ·{' '}
                            {CONDITION_LABELS[r.condicao]} · "{r.resposta}"
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Progresso */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 min-w-[200px]">
                    <div className="w-full">
                      <div className="flex items-baseline justify-end gap-2">
                        <span className="text-xl font-black text-primary">
                          {progress.atingidaGeral}
                        </span>
                        <span className="text-xs text-muted">/ {progress.alvo}</span>
                        <span
                          className={`text-sm font-bold ${
                            progress.status === 'concluida'
                              ? 'text-accent-success'
                              : 'text-accent-primary'
                          }`}
                        >
                          ({progress.percentual}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            progress.status === 'concluida'
                              ? 'bg-accent-success-solid'
                              : 'bg-accent-primary-solid'
                          }`}
                          style={{ width: `${progress.percentual}%` }}
                        />
                      </div>
                      {meta.distribuicao === 'por_pesquisador' && (
                        <span className="mt-1 flex items-center gap-1 text-[10px] text-muted">
                          <Users className="h-3 w-3" /> {progress.pesquisadoresVinculados}{' '}
                          pesquisador(es) já contribuíram
                        </span>
                      )}
                    </div>

                    {canManageMetas && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(meta)}
                          className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-accent-primary hover:bg-accent-primary-soft transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(meta.id)}
                          className="rounded-lg p-1.5 text-muted hover:bg-accent-danger-soft hover:text-accent-danger transition-colors"
                          title="Excluir meta"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canManageMetas && metas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ui bg-surface p-10 text-center">
          <Globe2 className="mx-auto h-10 w-10 text-muted" />
          <h3 className="mt-3 text-sm font-bold text-secondary">Nenhuma meta cadastrada</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted">
            Monte a composição da meta acima (Pergunta → Condição → Resposta), defina a quantidade,
            informe o nome e clique em Salvar.
          </p>
        </div>
      )}
    </div>
  );
};
