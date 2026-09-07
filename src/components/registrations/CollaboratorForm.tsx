import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Plus,
  Edit2,
  Power,
  KeyRound,
  Trash2,
  CheckCircle2,
  Search,
  Lock,
  Phone,
  User,
  Mail,
  Shield,
  X,
  FileCheck,
} from 'lucide-react';
import { Collaborator } from '../../types';

export const CollaboratorForm: React.FC = () => {
  const {
    collaborators,
    profiles,
    surveys,
    saveCollaborator,
    toggleCollaboratorStatus,
    hasPermission,
    bulkUpdateCollaboratorsStatus,
    bulkUpdateCollaboratorsProfile,
    bulkDeleteCollaborators,
    bulkAssignCollaboratorsToSurveys,
  } = useApp();

  const canAdd = hasPermission('colaboradores_incluir');
  const canEdit = hasPermission('colaboradores_editar');
  const canToggle = hasPermission('colaboradores_desativar');
  const canChangePassword = hasPermission('colaboradores_alterar_senha');

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTargetColab, setPasswordTargetColab] = useState<Collaborator | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedColabIds, setSelectedColabIds] = useState<string[]>([]);
  const [bulkProfileModalOpen, setBulkProfileModalOpen] = useState(false);
  const [bulkTargetProfileId, setBulkTargetProfileId] = useState<string>(profiles[0]?.id || '');
  const [bulkSurveyAssignModalOpen, setBulkSurveyAssignModalOpen] = useState(false);
  const [bulkSelectedSurveyIds, setBulkSelectedSurveyIds] = useState<string[]>([]);

  // Form State
  const initialForm: Collaborator = {
    id: '',
    cpf: '',
    nome: '',
    rg: '',
    dataNascimento: '',
    sexo: 'M',
    login: '',
    senha: '',
    perfilAcessoId: profiles[0]?.id || '',
    email: '',
    celular: '',
    nomeContatoCelular: '',
    telefoneFixo: '',
    nomeContatoFixo: '',
    ativo: true,
    pesquisasVinculadasIds: [],
    criadoEm: new Date().toISOString(),
  };

  const [formData, setFormData] = useState<Collaborator>(initialForm);
  const [isEditing, setIsEditing] = useState(false);

  const handleOpenNew = () => {
    setFormData({
      ...initialForm,
      id: `colab_${Date.now()}`,
      perfilAcessoId: profiles[1]?.id || profiles[0]?.id,
    });
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (colab: Collaborator) => {
    setFormData({ ...colab });
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.cpf.trim() || !formData.login.trim()) {
      alert('Por favor preencha os campos obrigatórios (Nome, CPF e Login).');
      return;
    }

    saveCollaborator(formData);
    setModalOpen(false);
    setSuccessNotice(
      `Colaborador "${formData.nome}" ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`
    );
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleOpenPasswordModal = (colab: Collaborator) => {
    setPasswordTargetColab(colab);
    setNewPassword('');
    setPasswordModalOpen(true);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetColab || !newPassword.trim()) return;

    saveCollaborator({
      ...passwordTargetColab,
      senha: newPassword.trim(),
    });

    setPasswordModalOpen(false);
    setSuccessNotice(`Senha do usuário "${passwordTargetColab.login}" redefinida com sucesso!`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const filteredCollaborators = collaborators.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.nome.toLowerCase().includes(term) ||
      c.cpf.includes(term) ||
      c.login.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
            Cadastro e Gestão de Colaboradores
          </h1>
          <p className="text-xs text-muted">
            Cadastre os pesquisadores e colaboradores, vincule a pesquisas específicas e gerencie credenciais de acesso.
          </p>
        </div>

        {canAdd && (
          <button
            id="btn-new-collaborator"
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 rounded-xl bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 transition hover:bg-accent-primary-solid-hover active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar Novo Colaborador</span>
          </button>
        )}
      </div>

      {successNotice && (
        <div className="flex items-center gap-2 rounded-2xl border border-accent-success-soft-border bg-accent-success-soft p-4 text-xs font-bold text-accent-success">
          <CheckCircle2 className="h-4 w-4 text-accent-success" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Toolbar: busca + seleção em massa (unificada, sem duplicar o total) */}
      <div className="rounded-2xl border border-ui bg-surface shadow-xl divide-y divide-ui">
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, CPF, login ou email..."
              className="w-full rounded-lg border border-ui bg-surface-card py-1.5 pl-8 pr-3 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="text-xs text-muted whitespace-nowrap">
            Total: <strong className="text-primary">{filteredCollaborators.length}</strong> colaboradores
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-secondary hover:text-primary select-none">
              <input
                type="checkbox"
                id="checkbox-select-all-collaborators"
                checked={
                  filteredCollaborators.length > 0 &&
                  filteredCollaborators.every((c) => selectedColabIds.includes(c.id))
                }
                onChange={() => {
                  const allSelected = filteredCollaborators.every((c) =>
                    selectedColabIds.includes(c.id)
                  );
                  if (allSelected) {
                    setSelectedColabIds((prev) =>
                      prev.filter((id) => !filteredCollaborators.some((c) => c.id === id))
                    );
                  } else {
                    const currentIds = filteredCollaborators.map((c) => c.id);
                    setSelectedColabIds((prev) => Array.from(new Set([...prev, ...currentIds])));
                  }
                }}
                className="h-4 w-4 rounded border-ui bg-surface-raised text-accent-primary-solid focus:ring-blue-500 focus:ring-offset-surface cursor-pointer"
              />
              <span>Selecionar todos ({filteredCollaborators.length})</span>
            </label>

            {selectedColabIds.length > 0 && (
              <span className="rounded-full bg-accent-primary-soft border border-accent-primary-soft-border px-2.5 py-0.5 text-xs font-bold text-accent-primary">
                {selectedColabIds.length} selecionado(s)
              </span>
            )}
          </div>

          {selectedColabIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {canToggle && (
                <>
                  <button
                    id="btn-bulk-activate-colab"
                    onClick={() => {
                      bulkUpdateCollaboratorsStatus(selectedColabIds, true);
                      setSuccessNotice(`${selectedColabIds.length} colaborador(es) ativado(s)!`);
                      setTimeout(() => setSuccessNotice(null), 4000);
                    }}
                    className="flex items-center gap-1 rounded-lg border border-accent-success-soft-border bg-accent-success-soft px-2.5 py-1.5 text-xs font-semibold text-accent-success hover:bg-accent-success-soft transition-colors"
                    title="Ativar colaboradores selecionados"
                  >
                    <Power className="h-3.5 w-3.5 text-accent-success" />
                    <span>Ativar</span>
                  </button>

                  <button
                    id="btn-bulk-deactivate-colab"
                    onClick={() => {
                      bulkUpdateCollaboratorsStatus(selectedColabIds, false);
                      setSuccessNotice(`${selectedColabIds.length} colaborador(es) inativado(s)!`);
                      setTimeout(() => setSuccessNotice(null), 4000);
                    }}
                    className="flex items-center gap-1 rounded-lg border border-accent-warning-soft-border bg-accent-warning-soft px-2.5 py-1.5 text-xs font-semibold text-accent-warning hover:bg-accent-warning-soft transition-colors"
                    title="Inativar colaboradores selecionados"
                  >
                    <Power className="h-3.5 w-3.5 text-accent-warning" />
                    <span>Inativar</span>
                  </button>
                </>
              )}

              {canEdit && (
                <>
                  <button
                    id="btn-bulk-change-profile"
                    onClick={() => setBulkProfileModalOpen(true)}
                    className="flex items-center gap-1 rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft px-2.5 py-1.5 text-xs font-semibold text-accent-primary hover:bg-accent-primary-solid-hover hover:text-on-accent transition-colors"
                    title="Alterar perfil de acesso dos colaboradores selecionados"
                  >
                    <Shield className="h-3.5 w-3.5 text-accent-primary" />
                    <span>Alterar Perfil</span>
                  </button>

                  <button
                    id="btn-bulk-assign-surveys"
                    onClick={() => {
                      setBulkSelectedSurveyIds([]);
                      setBulkSurveyAssignModalOpen(true);
                    }}
                    className="flex items-center gap-1 rounded-lg border border-accent-purple-soft-border bg-accent-purple-soft px-2.5 py-1.5 text-xs font-semibold text-accent-purple hover:bg-accent-purple-solid-hover hover:text-on-accent transition-colors"
                    title="Vincular pesquisas aos colaboradores selecionados"
                  >
                    <FileCheck className="h-3.5 w-3.5 text-accent-purple" />
                    <span>Vincular Pesquisas</span>
                  </button>
                </>
              )}

              {canToggle && (
                <button
                  id="btn-bulk-delete-colab"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Deseja realmente excluir ${selectedColabIds.length} colaborador(es) selecionado(s)?`
                      )
                    ) {
                      bulkDeleteCollaborators(selectedColabIds);
                      setSelectedColabIds([]);
                      setSuccessNotice('Colaboradores selecionados foram excluídos com sucesso.');
                      setTimeout(() => setSuccessNotice(null), 4000);
                    }
                  }}
                  className="flex items-center gap-1 rounded-lg border border-accent-danger-soft-border bg-accent-danger-soft px-2.5 py-1.5 text-xs font-semibold text-accent-danger hover:bg-accent-danger-soft transition-colors"
                  title="Excluir colaboradores selecionados"
                >
                  <Trash2 className="h-3.5 w-3.5 text-accent-danger" />
                  <span>Excluir</span>
                </button>
              )}

              <button
                id="btn-bulk-colab-clear"
                onClick={() => setSelectedColabIds([])}
                className="text-xs text-muted hover:text-primary px-2 py-1 transition-colors"
              >
                Desmarcar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table list */}
      <div className="overflow-hidden rounded-2xl border border-ui bg-surface shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ui bg-surface-card font-bold text-secondary">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos os colaboradores da página"
                    checked={
                      filteredCollaborators.length > 0 &&
                      filteredCollaborators.every((c) => selectedColabIds.includes(c.id))
                    }
                    onChange={() => {
                      const allSelected = filteredCollaborators.every((c) =>
                        selectedColabIds.includes(c.id)
                      );
                      if (allSelected) {
                        setSelectedColabIds((prev) =>
                          prev.filter((id) => !filteredCollaborators.some((c) => c.id === id))
                        );
                      } else {
                        const currentIds = filteredCollaborators.map((c) => c.id);
                        setSelectedColabIds((prev) =>
                          Array.from(new Set([...prev, ...currentIds]))
                        );
                      }
                    }}
                    className="h-4 w-4 rounded border-ui bg-surface-raised text-accent-primary-solid focus:ring-blue-500 focus:ring-offset-surface cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 whitespace-nowrap">Nome & CPF</th>
                <th className="py-3 px-4 whitespace-nowrap">Login & Email</th>
                <th className="py-3 px-4 whitespace-nowrap">Perfil de Acesso</th>
                <th className="py-3 px-4 whitespace-nowrap">Contatos</th>
                <th className="py-3 px-4 whitespace-nowrap">Pesquisas Vinculadas</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui">
              {filteredCollaborators.map((c) => {
                const profile = profiles.find((p) => p.id === c.perfilAcessoId);
                const assignedCount = c.pesquisasVinculadasIds?.length || 0;
                const isSelected = selectedColabIds.includes(c.id);

                return (
                  <tr
                    key={c.id}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-accent-primary-soft hover:bg-accent-primary-soft'
                        : 'hover:bg-surface-raised'
                    }`}
                  >
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        id={`checkbox-colab-${c.id}`}
                        checked={isSelected}
                        onChange={() => {
                          setSelectedColabIds((prev) =>
                            prev.includes(c.id)
                              ? prev.filter((id) => id !== c.id)
                              : [...prev, c.id]
                          );
                        }}
                        className="h-4 w-4 rounded border-ui bg-surface-raised text-accent-primary-solid focus:ring-blue-500 focus:ring-offset-surface cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-primary">{c.nome}</div>
                      <div className="text-[11px] text-muted">
                        CPF: {c.cpf} {c.rg ? `• RG: ${c.rg}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-primary font-semibold">
                        {c.login}
                      </div>
                      <div className="text-[11px] text-muted">{c.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="whitespace-nowrap rounded-md border border-accent-primary-soft-border bg-accent-primary-soft px-2 py-0.5 text-[11px] font-bold text-accent-primary">
                        {profile?.name || 'Não atribuído'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-secondary whitespace-nowrap">
                      <div>{c.celular || '-'}</div>
                      {c.telefoneFixo && (
                        <div className="text-[10px] text-muted">Fixo: {c.telefoneFixo}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="whitespace-nowrap rounded-md border border-ui bg-surface-card px-2 py-0.5 text-[10px] font-bold text-secondary">
                        {assignedCount} pesquisa(s)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          c.ativo
                            ? 'border-accent-success-soft-border bg-accent-success-soft text-accent-success'
                            : 'border-ui bg-surface-raised text-muted'
                        }`}
                      >
                        {c.ativo ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {canChangePassword && (
                          <button
                            onClick={() => handleOpenPasswordModal(c)}
                            title="Alterar Senha do Colaborador"
                            className="rounded p-1 text-muted hover:bg-surface-raised hover:text-accent-primary transition-colors"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                        )}

                        {canEdit && (
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Editar Dados do Colaborador"
                            className="rounded p-1 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}

                        {canToggle && (
                          <button
                            onClick={() => toggleCollaboratorStatus(c.id)}
                            title={c.ativo ? 'Desativar Colaborador' : 'Ativar Colaborador'}
                            className={`rounded p-1 transition-colors ${
                              c.ativo
                                ? 'text-accent-success hover:bg-accent-success-soft'
                                : 'text-muted hover:bg-surface-raised'
                            }`}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastro / Edição com todos os campos especificados */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-xs p-4">
          <div className="flex h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-ui bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ui pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft text-accent-primary">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">
                    {isEditing ? 'Editar Colaborador' : 'Cadastrar Novo Colaborador'}
                  </h3>
                  <p className="text-[11px] text-muted">
                    Dados pessoais, credenciais, perfil de acesso e vínculos de formulários
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto py-4 space-y-5 pr-2">
              {/* Seção 1: Identificação */}
              <div className="rounded-xl border border-ui bg-surface-card p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  1. Identificação
                </h4>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-secondary">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Carlos Eduardo de Souza"
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-1.5 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary">
                      CPF *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-1.5 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary">
                      RG
                    </label>
                    <input
                      type="text"
                      value={formData.rg || ''}
                      onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                      placeholder="Ex: 12.345.678-9 SSP/SP"
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-1.5 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={formData.dataNascimento || ''}
                      onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-1.5 text-xs text-primary focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary">
                      Sexo
                    </label>
                    <select
                      value={formData.sexo || 'M'}
                      onChange={(e) =>
                        setFormData({ ...formData, sexo: e.target.value as 'M' | 'F' | 'Outro' })
                      }
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-1.5 text-xs text-primary focus:border-blue-500 focus:outline-none"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Outro">Outro / Prefere não informar</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção 2: Contato */}
              <div className="rounded-xl border border-ui bg-surface-card p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  2. Contato
                </h4>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-secondary">
                      Telefone Celular / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={formData.celular || ''}
                      onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                      placeholder="(11) 98765-4321"
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-1.5 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary">
                      Nome Contato Celular
                    </label>
                    <input
                      type="text"
                      value={formData.nomeContatoCelular || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, nomeContatoCelular: e.target.value })
                      }
                      placeholder="Próprio / Contato emergencial"
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-1.5 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary">
                      Telefone Fixo
                    </label>
                    <input
                      type="text"
                      value={formData.telefoneFixo || ''}
                      onChange={(e) => setFormData({ ...formData, telefoneFixo: e.target.value })}
                      placeholder="(11) 3456-7890"
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-1.5 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary">
                      Nome Contato Fixo
                    </label>
                    <input
                      type="text"
                      value={formData.nomeContatoFixo || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, nomeContatoFixo: e.target.value })
                      }
                      placeholder="Ex: Residência / Escritório"
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-1.5 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Acesso */}
              <div className="rounded-xl border border-ui bg-surface-card p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  3. Acesso
                </h4>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-secondary">
                      Login de Acesso *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.login}
                      onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                      placeholder="usuario.sobrenome"
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-1.5 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary">
                      E-mail Institucional *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="colaborador@organizacao.com.br"
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-1.5 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {!isEditing && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-secondary">
                        Senha Inicial *
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.senha || ''}
                        onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                        placeholder="Mínimo de 6 dígitos"
                        className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-1.5 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-secondary">
                      Perfil de Acesso (RBAC) *
                    </label>
                    <select
                      value={formData.perfilAcessoId}
                      onChange={(e) => setFormData({ ...formData, perfilAcessoId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-ui bg-surface px-3 py-1.5 text-xs text-primary focus:border-blue-500 focus:outline-none"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - {p.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção 4: Pesquisas Vinculadas */}
              <div className="rounded-xl border border-ui bg-surface-card p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  4. Pesquisas Vinculadas
                </h4>
                <p className="mt-1 text-[11px] text-muted">
                  Defina a quais pesquisas este pesquisador terá permissão operacional de campo:
                </p>

                <div className="mt-3 space-y-2 max-h-36 overflow-y-auto">
                  {surveys.map((s) => {
                    const isChecked = formData.pesquisasVinculadasIds?.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border border-ui bg-surface p-2.5 text-xs text-primary"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const list = formData.pesquisasVinculadasIds || [];
                              const updated = isChecked
                                ? list.filter((id) => id !== s.id)
                                : [...list, s.id];
                              setFormData({ ...formData, pesquisasVinculadasIds: updated });
                            }}
                            className="rounded text-accent-primary-solid focus:ring-blue-500"
                          />
                          <span className="font-bold text-primary">
                            [{s.codigo}] {s.nome}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted">Ciclo {s.cicloAtual}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-ui pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-ui bg-surface-raised px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-accent-primary-solid px-5 py-2 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 hover:bg-accent-primary-solid-hover transition-colors"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alterar Senha de Colaborador */}
      {passwordModalOpen && passwordTargetColab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-ui bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ui pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft text-accent-primary">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">
                    Alterar Senha do Colaborador
                  </h3>
                  <p className="text-[11px] text-muted">
                    Usuário: {passwordTargetColab.login} ({passwordTargetColab.nome})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPasswordModalOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-secondary">
                  Nova Senha de Acesso *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha..."
                  className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-3 py-2 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-accent-primary-solid px-4 py-1.5 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 hover:bg-accent-primary-solid-hover transition-colors"
                >
                  Confirmar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alteração de Perfil em Lote */}
      {bulkProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-ui bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ui pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent-primary-soft-border bg-accent-primary-soft text-accent-primary">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">
                    Alterar Perfil em Lote
                  </h3>
                  <p className="text-[11px] text-muted">
                    Aplicar novo perfil para {selectedColabIds.length} colaborador(es)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkProfileModalOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">
                  Selecione o Perfil de Acesso Desejado
                </label>
                <select
                  value={bulkTargetProfileId}
                  onChange={(e) => setBulkTargetProfileId(e.target.value)}
                  className="w-full rounded-lg border border-ui bg-surface-card px-3 py-2 text-xs text-primary focus:border-blue-500 focus:outline-none"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.permissions.length} permissões)
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-3 text-xs text-accent-primary">
                Esta ação atualizará as permissões de acesso de todos os colaboradores selecionados e criará registros de auditoria em conformidade.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkProfileModalOpen(false)}
                  className="rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    bulkUpdateCollaboratorsProfile(selectedColabIds, bulkTargetProfileId);
                    setBulkProfileModalOpen(false);
                    setSelectedColabIds([]);
                    setSuccessNotice('Perfis de acesso atualizados com sucesso em lote.');
                    setTimeout(() => setSuccessNotice(null), 4000);
                  }}
                  className="rounded-lg bg-accent-primary-solid px-4 py-1.5 text-xs font-bold text-on-accent shadow-lg shadow-blue-900/40 hover:bg-accent-primary-solid-hover transition-colors"
                >
                  Aplicar Perfil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vinculação de Pesquisas em Lote */}
      {bulkSurveyAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-ui bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ui pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent-purple-soft-border bg-accent-purple-soft text-accent-purple">
                  <FileCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">
                    Vincular Pesquisas em Lote
                  </h3>
                  <p className="text-[11px] text-muted">
                    Atribuir pesquisas a {selectedColabIds.length} colaborador(es)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkSurveyAssignModalOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-secondary mb-2">
                  Selecione as pesquisas para vincular:
                </label>
                <div className="max-h-60 overflow-y-auto space-y-1.5 rounded-xl border border-ui bg-surface-card p-3">
                  {surveys
                    .filter((s) => s.status !== 'excluida')
                    .map((sv) => {
                      const isChecked = bulkSelectedSurveyIds.includes(sv.id);
                      return (
                        <label
                          key={sv.id}
                          className="flex items-center gap-2 rounded-lg p-2 hover:bg-surface-raised cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setBulkSelectedSurveyIds((prev) =>
                                isChecked
                                  ? prev.filter((id) => id !== sv.id)
                                  : [...prev, sv.id]
                              );
                            }}
                            className="h-4 w-4 rounded border-ui bg-surface-raised text-accent-purple-solid focus:ring-purple-500 focus:ring-offset-surface cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-primary">{sv.codigo}</span>
                            <span className="text-muted ml-1.5">{sv.nome}</span>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkSurveyAssignModalOpen(false)}
                  className="rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={bulkSelectedSurveyIds.length === 0}
                  onClick={() => {
                    bulkAssignCollaboratorsToSurveys(selectedColabIds, bulkSelectedSurveyIds);
                    setBulkSurveyAssignModalOpen(false);
                    setSelectedColabIds([]);
                    setSuccessNotice('Pesquisas vinculadas em lote aos colaboradores selecionados.');
                    setTimeout(() => setSuccessNotice(null), 4000);
                  }}
                  className="rounded-lg bg-accent-purple-solid px-4 py-1.5 text-xs font-bold text-on-accent shadow-lg shadow-purple-900/40 hover:bg-accent-purple-solid-hover disabled:opacity-50 transition-colors"
                >
                  Vincular ({bulkSelectedSurveyIds.length}) Pesquisas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
