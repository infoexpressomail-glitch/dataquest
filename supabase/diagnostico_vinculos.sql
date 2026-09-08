-- =============================================================================
-- DIAGNÓSTICO — Pesquisa SAU-2025-02 ainda aparece para o pesquisador
--
-- Objetivo: revelar POR QUAL LADO a pesquisa ainda está vinculada ao pesquisador:
--   1) pesquisas.pesquisadores_ids  (pesquisa aponta para o pesquisador)
--   2) colaboradores.pesquisas_vinculadas_ids (colaborador aponta para a pesquisa)
--
-- Como usar: troque o valor de v_login abaixo pelo LOGIN do pesquisador e rode
-- o script inteiro no Supabase SQL Editor.
-- =============================================================================

DO $$
DECLARE
  v_login     text := 'LOGIN_DO_PESQUISADOR';  -- <<< TROQUE AQUI
  v_colab_id  text;
  v_codigo    text := 'SAU-2025-02';           -- código da pesquisa em questão
  v_pesq_id   text;
BEGIN

  RAISE NOTICE '==================================================';
  RAISE NOTICE '0) COLABORADOR (pesquisador)';
  RAISE NOTICE '==================================================';
  SELECT id INTO v_colab_id FROM public.colaboradores WHERE login = v_login;
  IF v_colab_id IS NULL THEN
    RAISE NOTICE '>>> NENHUM colaborador com login = %', v_login;
    RAISE NOTICE '>>> Confira o login (case-sensitive) ou se o pesquisador foi criado no banco.';
    RETURN;
  END IF;
  RAISE NOTICE 'colaborador id = %', v_colab_id;

  SELECT id INTO v_pesq_id FROM public.pesquisas WHERE codigo = v_codigo LIMIT 1;
  IF v_pesq_id IS NULL THEN
    RAISE NOTICE '>>> NENHUMA pesquisa com codigo = %', v_codigo;
    RETURN;
  END IF;
  RAISE NOTICE 'pesquisa id   = % (codigo %)', v_pesq_id, v_codigo;
  RAISE NOTICE '';

  RAISE NOTICE '==================================================';
  RAISE NOTICE '1) VÍNCULO PELO LADO DA PESQUISA (pesquisas.pesquisadores_ids)';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '>> Todas as pesquisas que LISTAM este pesquisador em pesquisadores_ids:';
  FOR r IN
    SELECT p.codigo, p.nome, p.status,
           (p.pesquisadores_ids @> array[v_colab_id]) AS contem_colaborador,
           array_length(p.pesquisadores_ids, 1) AS qtd_pesquisadores
    FROM public.pesquisas p
    WHERE p.pesquisadores_ids @> array[v_colab_id]
    ORDER BY p.codigo
  LOOP
    RAISE NOTICE '  [%] % | status=% | contem_colaborador=% | qtd_pesquisadores=%',
      r.codigo, r.nome, r.status, r.contem_colaborador, r.qtd_pesquisadores;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '>> Confirmação pontual da SAU-2025-02:';
  SELECT
    (p.pesquisadores_ids @> array[v_colab_id]) AS ainda_na_pesquisa,
    p.pesquisadores_ids
  INTO r2
  FROM public.pesquisas p WHERE p.id = v_pesq_id;
  RAISE NOTICE '  pesquisas.pesquisadores_ids contém o pesquisador? = %', r2.ainda_na_pesquisa;
  RAISE NOTICE '  pesquisadores_ids atuais = %', r2.pesquisadores_ids;
  RAISE NOTICE '  >>> Se = true, o SurveyForm NÃO removeu (não salvou no banco).';
  RAISE NOTICE '';

  RAISE NOTICE '==================================================';
  RAISE NOTICE '2) VÍNCULO PELO LADO DO COLABORADOR (colaboradores.pesquisas_vinculadas_ids)';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '>> Todas as pesquisas que o COLABORADOR lista em pesquisas_vinculadas_ids:';
  FOR c IN
    SELECT c.id, c.nome, c.login, c.pesquisas_vinculadas_ids
    FROM public.colaboradores c WHERE c.id = v_colab_id
  LOOP
    RAISE NOTICE '  colaborador: % (%)', c.nome, c.login;
    RAISE NOTICE '  pesquisas_vinculadas_ids = %', c.pesquisas_vinculadas_ids;
    RAISE NOTICE '  >>> Contém a SAU-2025-02? = %', (c.pesquisas_vinculadas_ids @> array[v_pesq_id]);
  END LOOP;
  RAISE NOTICE '';

  RAISE NOTICE '==================================================';
  RAISE NOTICE '3) CONCLUSÃO (qual lado ainda segura a pesquisa)';
  RAISE NOTICE '==================================================';
  SELECT (p.pesquisadores_ids @> array[v_colab_id]) INTO r2.ainda_na_pesquisa
  FROM public.pesquisas p WHERE p.id = v_pesq_id;

  IF r2.ainda_na_pesquisa THEN
    RAISE NOTICE '  >>> LADO DA PESQUISA (pesquisadores_ids) AINDA VINCULA.';
    RAISE NOTICE '      O SurveyForm não persistiu a remoção no Supabase.';
    RAISE NOTICE '      Ação: desvincular via SurveyForm e garantir o deploy; ou rodar o UPDATE abaixo.';
  ELSE
    RAISE NOTICE '  Lado da pesquisa (pesquisadores_ids): OK (não vincula mais).';
  END IF;

  -- Se a pesquisa estiver apenas em pesquisas_vinculadas_ids do colaborador:
  IF EXISTS (SELECT 1 FROM public.colaboradores
             WHERE id = v_colab_id AND pesquisas_vinculadas_ids @> array[v_pesq_id]) THEN
    RAISE NOTICE '  >>> LADO DO COLABORADOR (pesquisas_vinculadas_ids) AINDA VINCULA.';
    RAISE NOTICE '      Ação: rodar o UPDATE abaixo para limpar o vínculo neste lado.';
  ELSE
    RAISE NOTICE '  Lado do colaborador (pesquisas_vinculadas_ids): OK (não vincula mais).';
  END IF;

END $$;

-- =============================================================================
-- COMANDOS CORRETIVOS (execute APÓS ler o diagnóstico, se aplicável)
-- =============================================================================

-- Corrigir o LADO DA PESQUISA (remover o pesquisador de pesquisadores_ids):
-- Descomente e troque o LOGIN do pesquisador:
/*
UPDATE public.pesquisas p
SET pesquisadores_ids = array_remove(
      p.pesquisadores_ids,
      (SELECT id FROM public.colaboradores WHERE login = 'LOGIN_DO_PESQUISADOR')
    )
WHERE p.codigo = 'SAU-2025-02';
*/

-- Corrigir o LADO DO COLABORADOR (remover a pesquisa de pesquisas_vinculadas_ids):
/*
UPDATE public.colaboradores c
SET pesquisas_vinculadas_ids = array_remove(
      c.pesquisas_vinculadas_ids,
      (SELECT id FROM public.pesquisas WHERE codigo = 'SAU-2025-02')
    )
WHERE c.login = 'LOGIN_DO_PESQUISADOR';
*/
