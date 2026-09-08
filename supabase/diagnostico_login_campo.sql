-- =============================================================================
-- DIAGNÓSTICO — Login de campo (Modo Pesquisador) falhando
-- Execute isto no Supabase SQL Editor (com o banco onde os dados estão).
-- Ele aponta QUAL das três causas está impedindo o login: perfil, vínculo ou hash.
-- =============================================================================

-- Substitua pelo LOGIN do pesquisador que está tentando entrar:
DO $$
DECLARE
  v_login text := 'COLOQUE_O_LOGIN_AQUI';
  v_colab public.colaboradores;
  v_perf  public.perfis_acesso;
  v_qtd_vinculadas int;
  v_qtd_pesq_ids   int;
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE '1) COLABORADOR (credenciais)';
  RAISE NOTICE '==================================================';

  SELECT * INTO v_colab FROM public.colaboradores WHERE login = v_login;

  IF v_colab IS NULL THEN
    RAISE NOTICE '>>> NENHUM colaborador com login = %', v_login;
  ELSE
    RAISE NOTICE 'id          = %', v_colab.id;
    RAISE NOTICE 'nome        = %', v_colab.nome;
    RAISE NOTICE 'ativo       = %', v_colab.ativo;
    RAISE NOTICE 'perfil_id   = %', v_colab.perfil_acesso_id;
    RAISE NOTICE 'senha_hash  = %', coalesce(left(v_colab.senha, 10), '(NULL)');
    RAISE NOTICE '  -> hash válido (bcrypt $2...) = %', (left(coalesce(v_colab.senha,''),4) = '$2a$' or left(coalesce(v_colab.senha,''),4)='$2b$' or left(coalesce(v_colab.senha,''),4)='$2y$');
    RAISE NOTICE '  >>> Se senha_hash = (NULL) ou não começa com $2, a senha NÃO foi gravada com crypt() -> login NUNCA vai funcionar.';
    RAISE NOTICE 'pesquisas_vinculadas_ids = %', v_colab.pesquisas_vinculadas_ids;
    RAISE NOTICE 'pesquisas_reabilitadas_ids = %', v_colab.pesquisas_reabilitadas_ids;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '2) PERFIL DE ACESSO';
  RAISE NOTICE '==================================================';

  IF v_colab IS NOT NULL AND v_colab.perfil_acesso_id IS NOT NULL THEN
    SELECT * INTO v_perf FROM public.perfis_acesso WHERE id = v_colab.perfil_acesso_id;
    IF v_perf IS NULL THEN
      RAISE NOTICE '>>> perfil_acesso_id = % não existe na tabela perfis_acesso!', v_colab.perfil_acesso_id;
    ELSE
      RAISE NOTICE 'perfil = % (id %)', v_perf.nome, v_perf.id;
      RAISE NOTICE '  -> contém "pesquisador" no nome? = %', (v_perf.nome ilike '%pesquisador%');
      RAISE NOTICE '  >>> Se NÃO contém, o login de campo rejeita (perfil de pesquisador obrigatório).';
    END IF;
  ELSE
    RAISE NOTICE '>>> Colaborador sem perfil (perfil_acesso_id nulo).';
    RAISE NOTICE '  >>> Causa provável: form enviou id mock "prof_pesq" e o perfil nao existia no banco.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '3) VÍNCULO COM PESQUISAS';
  RAISE NOTICE '==================================================';

  IF v_colab IS NOT NULL THEN
    SELECT count(*) INTO v_qtd_vinculadas FROM public.pesquisas
      WHERE id = any(coalesce(v_colab.pesquisas_vinculadas_ids, '{}'::text[]))
        AND status = 'ativa';
    SELECT count(*) INTO v_qtd_pesq_ids FROM public.pesquisas
      WHERE pesquisadores_ids @> array[v_colab.id]
        AND status = 'ativa';
    RAISE NOTICE 'pesquisas ATIVAS via colaborador.pesquisas_vinculadas_ids = %', v_qtd_vinculadas;
    RAISE NOTICE 'pesquisas ATIVAS via pesquisa.pesquisadores_ids          = %', v_qtd_pesq_ids;
    RAISE NOTICE '  >>> Se ambos = 0, o pesquisador não vê nenhuma pesquisa (precisa estar em pelo menos um dos dois lados).';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '4) SIMULAÇÃO do autenticar_campo (testa a senha)';
  RAISE NOTICE '==================================================';

  IF v_colab IS NOT NULL THEN
    -- Testa uma senha específica (troque pelo que você digitou ao cadastrar):
    RAISE NOTICE '>>> Para testar, rode manualmente:';
    RAISE NOTICE '    select public.autenticar_campo(''%'', ''SENHA_QUE_VC_DIGITOU'');', v_login;
    RAISE NOTICE '  -> Se retornar {"success":false,"error":"Login ou senha inválidos."} a senha não confere com o hash salvo.';
  END IF;
END $$;
