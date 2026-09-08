// POST /api/collaborators — Persistência do cadastro de colaboradores/pesquisadores
// feita a partir do SISTEMA BASE (área administrativa).
//
// Recebe o colaborador (campos do formulário) e, opcionalmente, a senha, e grava
// no Supabase via a função `salvar_colaborador()` (migration 0004). A senha é
// armazenada em hash bcrypt (crypt + gen_salt('bf')) no servidor — nunca em texto
// puro. Se a senha vier vazia, a senha atual é preservada (edição de dados).
//
// Isso garante que as credenciais cadastradas pela interface passem a autenticar
// no APP DE CAMPO (POST /api/auth -> autenticar_campo).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

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
    const supabase = getSupabaseAdmin();

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
      colaborador: data,
      message: 'Colaborador salvo com sucesso no servidor.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Falha ao salvar colaborador: ${err?.message || err}`,
    });
  }
}
