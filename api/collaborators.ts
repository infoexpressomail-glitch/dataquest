// =============================================================================
// /api/collaborators — F2 · Colaboradores como FONTE ÚNICA no Supabase
//
//   GET   → lista colaboradores SEM senha (view `colaboradores_publicos`).
//   POST  → cria/atualiza o cadastro completo (RPC `salvar_colaborador`, senha
//           bcrypt no banco). Já existia desde a F1.
//   PATCH → atualização PARCIAL e segura (ativo, perfil, vínculos e pesquisas
//           re-habilitadas) usando funções dedicadas — nunca reenvia o cadastro
//           inteiro nem toca na senha. Usado por ativar/desativar e ações em lote.
//
// Permissões (F1): leitura exige `colaboradores_acesso`; escrita exige
// `colaboradores_acesso` (cadastro) e as operações parciais aceitam
// `colaboradores_editar` / `colaboradores_desativar`.
// =============================================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireSession, requirePermission } from './_lib/session.js';

interface ColaboradorRow {
  id: string;
  cpf: string;
  nome: string;
  rg: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  login: string;
  perfil_acesso_id: string | null;
  email: string;
  celular: string | null;
  nome_contato_celular: string | null;
  telefone_fixo: string | null;
  nome_contato_fixo: string | null;
  ativo: boolean;
  pesquisas_vinculadas_ids: string[] | null;
  pesquisas_reabilitadas_ids: string[] | null;
  criado_em: string;
}

/** Nunca inclui a coluna `senha`. */
function rowToDTO(row: ColaboradorRow) {
  return {
    id: row.id,
    cpf: row.cpf,
    nome: row.nome,
    rg: row.rg || undefined,
    dataNascimento: row.data_nascimento || undefined,
    sexo: row.sexo || undefined,
    login: row.login,
    perfilAcessoId: row.perfil_acesso_id || '',
    email: row.email,
    celular: row.celular || undefined,
    nomeContatoCelular: row.nome_contato_celular || undefined,
    telefoneFixo: row.telefone_fixo || undefined,
    nomeContatoFixo: row.nome_contato_fixo || undefined,
    ativo: row.ativo,
    pesquisasVinculadasIds: row.pesquisas_vinculadas_ids || [],
    pesquisasReabilitadasIds: row.pesquisas_reabilitadas_ids || [],
    criadoEm: row.criado_em,
  };
}

function isValidUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireSession(req, res);
  if (!session) return;

  const supabase = getSupabaseAdmin();

  // ---------------------------------------------------------------------------
  // GET /api/collaborators — lista sem senha
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    if (!requirePermission(res, session, ['colaboradores_acesso', 'colaboradores_editar'])) return;

    const { data, error } = await supabase
      .from('colaboradores_publicos')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, message: `Erro ao listar colaboradores: ${error.message}` });
    }

    return res.status(200).json({
      success: true,
      collaborators: (data as ColaboradorRow[]).map(rowToDTO),
    });
  }

  // ---------------------------------------------------------------------------
  // POST /api/collaborators — cadastro completo (cria/atualiza)
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    if (!requirePermission(res, session, ['colaboradores_acesso'])) return;

    const body = (req.body || {}) as { colaborador?: Record<string, any>; senha?: string };
    const colab = body.colaborador;
    const senha = body.senha;

    if (!colab || !colab.login || !colab.cpf || !colab.nome) {
      return res.status(400).json({
        success: false,
        message: 'Dados do colaborador incompletos (login, CPF e nome são obrigatórios).',
      });
    }

    try {
      // A senha pode vir vazia na edição (mantém a atual). O hash é feito no banco.
      const { data, error } = await supabase.rpc('salvar_colaborador', {
        p_collab: colab,
        p_senha: typeof senha === 'string' ? senha : null,
      });

      if (error) {
        return res.status(500).json({
          success: false,
          message: `Erro ao salvar colaborador no servidor: ${error.message}`,
        });
      }

      return res.status(200).json({
        success: true,
        colaborador: rowToDTO(data as ColaboradorRow),
        message: 'Colaborador salvo com sucesso no servidor.',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Falha ao salvar colaborador: ${err?.message || err}`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // PATCH /api/collaborators — atualização parcial (sem senha, sem cadastro)
  // ---------------------------------------------------------------------------
  if (req.method === 'PATCH') {
    const body = (req.body || {}) as {
      id?: string;
      ativo?: boolean;
      perfilAcessoId?: string | null;
      pesquisasReabilitadasIds?: string[];
    };

    if (!body.id) {
      return res.status(400).json({ success: false, message: 'Informe o id do colaborador.' });
    }

    // Cada campo exige a permissão correspondente.
    const needsEditar = body.perfilAcessoId !== undefined;
    const needsDesativar = body.ativo !== undefined;
    const needsReabilitar = body.pesquisasReabilitadasIds !== undefined;

    if (needsEditar && !requirePermission(res, session, ['colaboradores_editar', 'colaboradores_acesso'])) return;
    if (needsDesativar && !requirePermission(res, session, ['colaboradores_desativar', 'colaboradores_acesso'])) return;
    if (needsReabilitar && !requirePermission(res, session, ['colaboradores_editar', 'colaboradores_acesso'])) return;

    try {
      let updated: ColaboradorRow | null = null;

      if (body.ativo !== undefined) {
        const { data, error } = await supabase.rpc('definir_ativo_colaborador', {
          p_id: body.id,
          p_ativo: Boolean(body.ativo),
        });
        if (error) throw new Error(error.message);
        updated = data as ColaboradorRow;
      }

      if (body.perfilAcessoId !== undefined) {
        const { data, error } = await supabase.rpc('definir_perfil_colaborador', {
          p_id: body.id,
          // perfilAcessoId pode chegar como uuid do banco; se vier nulo, não altera.
          p_perfil_id: isValidUuid(body.perfilAcessoId) ? body.perfilAcessoId : null,
        });
        if (error) throw new Error(error.message);
        if (!updated) updated = data as ColaboradorRow;
      }

      if (body.pesquisasReabilitadasIds !== undefined) {
        const { data, error } = await supabase.rpc('definir_reabilitadas_colaborador', {
          p_id: body.id,
          p_ids: Array.isArray(body.pesquisasReabilitadasIds) ? body.pesquisasReabilitadasIds : [],
        });
        if (error) throw new Error(error.message);
        if (!updated) updated = data as ColaboradorRow;
      }

      // Observação: os vínculos pesquisador↔pesquisa NÃO são gravados aqui pelo
      // lado do colaborador. A fonte de verdade é `pesquisas.pesquisadores_ids`
      // e o trigger da migration 0006 espelha em `colaboradores.pesquisas_vinculadas_ids`.

      if (!updated) {
        return res.status(400).json({ success: false, message: 'Nada para atualizar (informe ao menos um campo).' });
      }

      return res.status(200).json({
        success: true,
        colaborador: rowToDTO(updated),
        message: 'Colaborador atualizado no servidor.',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Falha ao atualizar colaborador: ${err?.message || err}`,
      });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  return res.status(405).json({ success: false, message: 'Método não permitido.' });
}
