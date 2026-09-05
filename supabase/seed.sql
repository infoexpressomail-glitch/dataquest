-- =====================================================================================
-- DataQuest — Seed inicial (v2 — inclui senhas reais por colaborador e plano amostral)
-- =====================================================================================
-- Gerado a partir dos dados reais de src/mockData.ts (perfis, colaboradores, pesquisas,
-- respostas, conexões, importações e auditoria). Idempotente via ON CONFLICT DO UPDATE/
-- NOTHING — pode ser executado múltiplas vezes com segurança no SQL Editor do Supabase.
--
-- SENHAS DEMO: cada colaborador usa EXATAMENTE a senha em texto puro definida no
-- mockData.ts do frontend (carlos.admin/admin123, mariana.coord/coord123,
-- rodrigo.pesquisador e aline.pesquisador/pesq123, fernando.analista/analista123).
-- O hash é gerado aqui com pgcrypto (bcrypt) para armazenamento seguro no banco.
-- Troque essas senhas antes de expor o sistema publicamente.
-- =====================================================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------------------------
-- 1. Perfis de acesso (AccessProfile)
-- -------------------------------------------------------------------------------------

insert into public.perfis_acesso (id, nome, descricao, permissions) values (
  '00000000-0000-4000-8000-000000000001',
  $q$Administrador Master$q$,
  $q$Acesso irrestrito a todos os módulos, configurações, exclusões e edições de respostas.$q$,
  $j${"colaboradores_alterar_senha": true, "colaboradores_desativar": true, "colaboradores_editar": true, "colaboradores_acesso": true, "colaboradores_incluir": true, "analise_acesso": true, "analise_criar_alterar_excluir_resposta": true, "importacao_importar_planilha": true, "importacao_excluir": true, "importacao_acesso": true, "meta_criar_alterar_excluir": true, "meta_acesso": true, "pesquisa_visualizar_excluidas": true, "pesquisa_acesso": true, "pesquisa_criar": true, "pesquisa_alterar": true, "pesquisa_excluir": true, "pesquisa_ouvir_audio": true, "pesquisa_visualizar_georeferenciamento": true, "pesquisa_exportar_resultados": true, "pesquisa_visualizar_inativas": true, "pesquisa_replicar": true, "pesquisa_desativar": true, "pesquisa_acessa_todas_sem_associacao": true, "pesquisa_alteracao_resposta_espontanea": true, "respostas_acesso": true, "respostas_alterar": true, "home_acesso": true, "home_visualiza_paineis_superiores": true, "home_visualiza_conexoes_recentes": true, "politicas_acesso": true}$j$::jsonb
) on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao, permissions = excluded.permissions;

insert into public.perfis_acesso (id, nome, descricao, permissions) values (
  '00000000-0000-4000-8000-000000000002',
  $q$Coordenador de Campo$q$,
  $q$Gerencia pesquisadores, pesquisas ativas e visualiza respostas e metas.$q$,
  $j${"colaboradores_alterar_senha": false, "colaboradores_desativar": false, "colaboradores_editar": true, "colaboradores_acesso": true, "colaboradores_incluir": true, "analise_acesso": true, "analise_criar_alterar_excluir_resposta": false, "importacao_importar_planilha": true, "importacao_excluir": false, "importacao_acesso": true, "meta_criar_alterar_excluir": true, "meta_acesso": true, "pesquisa_visualizar_excluidas": false, "pesquisa_acesso": true, "pesquisa_criar": true, "pesquisa_alterar": true, "pesquisa_excluir": false, "pesquisa_ouvir_audio": true, "pesquisa_visualizar_georeferenciamento": true, "pesquisa_exportar_resultados": true, "pesquisa_visualizar_inativas": true, "pesquisa_replicar": true, "pesquisa_desativar": true, "pesquisa_acessa_todas_sem_associacao": false, "pesquisa_alteracao_resposta_espontanea": false, "respostas_acesso": true, "respostas_alterar": false, "home_acesso": true, "home_visualiza_paineis_superiores": true, "home_visualiza_conexoes_recentes": true, "politicas_acesso": false}$j$::jsonb
) on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao, permissions = excluded.permissions;

insert into public.perfis_acesso (id, nome, descricao, permissions) values (
  '00000000-0000-4000-8000-000000000003',
  $q$Pesquisador de Campo$q$,
  $q$Coleta entrevistas em campo e acessa formulários vinculados.$q$,
  $j${"colaboradores_alterar_senha": false, "colaboradores_desativar": false, "colaboradores_editar": false, "colaboradores_acesso": false, "colaboradores_incluir": false, "analise_acesso": false, "analise_criar_alterar_excluir_resposta": false, "importacao_importar_planilha": false, "importacao_excluir": false, "importacao_acesso": false, "meta_criar_alterar_excluir": false, "meta_acesso": true, "pesquisa_visualizar_excluidas": false, "pesquisa_acesso": true, "pesquisa_criar": false, "pesquisa_alterar": false, "pesquisa_excluir": false, "pesquisa_ouvir_audio": false, "pesquisa_visualizar_georeferenciamento": false, "pesquisa_exportar_resultados": false, "pesquisa_visualizar_inativas": false, "pesquisa_replicar": false, "pesquisa_desativar": false, "pesquisa_acessa_todas_sem_associacao": false, "pesquisa_alteracao_resposta_espontanea": false, "respostas_acesso": false, "respostas_alterar": false, "home_acesso": true, "home_visualiza_paineis_superiores": false, "home_visualiza_conexoes_recentes": false, "politicas_acesso": false}$j$::jsonb
) on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao, permissions = excluded.permissions;

insert into public.perfis_acesso (id, nome, descricao, permissions) values (
  '00000000-0000-4000-8000-000000000004',
  $q$Analista Estatístico$q$,
  $q$Acesso a análises, gráficos, dashboards e exportação em CSV/PDF.$q$,
  $j${"colaboradores_alterar_senha": false, "colaboradores_desativar": false, "colaboradores_editar": false, "colaboradores_acesso": false, "colaboradores_incluir": false, "analise_acesso": true, "analise_criar_alterar_excluir_resposta": false, "importacao_importar_planilha": true, "importacao_excluir": false, "importacao_acesso": true, "meta_criar_alterar_excluir": false, "meta_acesso": true, "pesquisa_visualizar_excluidas": false, "pesquisa_acesso": true, "pesquisa_criar": false, "pesquisa_alterar": false, "pesquisa_excluir": false, "pesquisa_ouvir_audio": true, "pesquisa_visualizar_georeferenciamento": true, "pesquisa_exportar_resultados": true, "pesquisa_visualizar_inativas": true, "pesquisa_replicar": false, "pesquisa_desativar": false, "pesquisa_acessa_todas_sem_associacao": true, "pesquisa_alteracao_resposta_espontanea": false, "respostas_acesso": true, "respostas_alterar": false, "home_acesso": true, "home_visualiza_paineis_superiores": true, "home_visualiza_conexoes_recentes": true, "politicas_acesso": false}$j$::jsonb
) on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao, permissions = excluded.permissions;

-- -------------------------------------------------------------------------------------
-- 2. Colaboradores (Collaborator) — cada um com a senha demo real do mockData.ts,
--    hasheada com bcrypt (pgcrypto) para armazenamento seguro.
-- -------------------------------------------------------------------------------------

insert into public.colaboradores (
  id, cpf, nome, rg, data_nascimento, sexo, login, senha, perfil_acesso_id,
  email, celular, nome_contato_celular, telefone_fixo, nome_contato_fixo,
  ativo, pesquisas_vinculadas_ids, criado_em
) values (
  $q$colab_1$q$,
  $q$123.456.789-00$q$,
  $q$Carlos Eduardo Silveira$q$,
  $q$14.285.910-X$q$,
  $q$1985-04-12$q$::date,
  $q$M$q$,
  $q$carlos.admin$q$,
  crypt($q$admin123$q$, gen_salt('bf')),
  '00000000-0000-4000-8000-000000000001',
  $q$carlos.silveira@dataquest.gov.br$q$,
  $q$(11) 98765-4321$q$,
  $q$Esposa Mariana$q$,
  $q$(11) 3214-5500$q$,
  $q$Escritório Central$q$,
  true,
  '{"pesq_literarraial_2025","pesq_saude_2025"}',
  $q$2025-01-10T10:00:00Z$q$
) on conflict (id) do update set
  cpf = excluded.cpf, nome = excluded.nome, login = excluded.login,
  perfil_acesso_id = excluded.perfil_acesso_id, email = excluded.email,
  ativo = excluded.ativo, pesquisas_vinculadas_ids = excluded.pesquisas_vinculadas_ids;

insert into public.colaboradores (
  id, cpf, nome, rg, data_nascimento, sexo, login, senha, perfil_acesso_id,
  email, celular, nome_contato_celular, telefone_fixo, nome_contato_fixo,
  ativo, pesquisas_vinculadas_ids, criado_em
) values (
  $q$colab_2$q$,
  $q$234.567.890-11$q$,
  $q$Mariana Vasconcelos$q$,
  $q$22.333.444-5$q$,
  $q$1990-08-23$q$::date,
  $q$F$q$,
  $q$mariana.coord$q$,
  crypt($q$coord123$q$, gen_salt('bf')),
  '00000000-0000-4000-8000-000000000002',
  $q$mariana.vasconcelos@dataquest.gov.br$q$,
  $q$(11) 97654-3210$q$,
  $q$Mãe Helena$q$,
  $q$(11) 3214-5502$q$,
  $q$Recepção$q$,
  true,
  '{"pesq_literarraial_2025"}',
  $q$2025-02-01T14:30:00Z$q$
) on conflict (id) do update set
  cpf = excluded.cpf, nome = excluded.nome, login = excluded.login,
  perfil_acesso_id = excluded.perfil_acesso_id, email = excluded.email,
  ativo = excluded.ativo, pesquisas_vinculadas_ids = excluded.pesquisas_vinculadas_ids;

insert into public.colaboradores (
  id, cpf, nome, rg, data_nascimento, sexo, login, senha, perfil_acesso_id,
  email, celular, nome_contato_celular, telefone_fixo, nome_contato_fixo,
  ativo, pesquisas_vinculadas_ids, criado_em
) values (
  $q$colab_3$q$,
  $q$345.678.901-22$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$33.444.555-6$q$,
  $q$1995-11-05$q$::date,
  $q$M$q$,
  $q$rodrigo.pesquisador$q$,
  crypt($q$pesq123$q$, gen_salt('bf')),
  '00000000-0000-4000-8000-000000000003',
  $q$rodrigo.fontes@dataquest.gov.br$q$,
  $q$(11) 96543-2109$q$,
  $q$Irmão Lucas$q$,
  $q$(11) 3214-5508$q$,
  $q$Base Operacional$q$,
  true,
  '{"pesq_literarraial_2025","pesq_saude_2025"}',
  $q$2025-02-15T09:00:00Z$q$
) on conflict (id) do update set
  cpf = excluded.cpf, nome = excluded.nome, login = excluded.login,
  perfil_acesso_id = excluded.perfil_acesso_id, email = excluded.email,
  ativo = excluded.ativo, pesquisas_vinculadas_ids = excluded.pesquisas_vinculadas_ids;

insert into public.colaboradores (
  id, cpf, nome, rg, data_nascimento, sexo, login, senha, perfil_acesso_id,
  email, celular, nome_contato_celular, telefone_fixo, nome_contato_fixo,
  ativo, pesquisas_vinculadas_ids, criado_em
) values (
  $q$colab_4$q$,
  $q$456.789.012-33$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$44.555.666-7$q$,
  $q$1998-03-17$q$::date,
  $q$F$q$,
  $q$aline.pesquisador$q$,
  crypt($q$pesq123$q$, gen_salt('bf')),
  '00000000-0000-4000-8000-000000000003',
  $q$aline.barbosa@dataquest.gov.br$q$,
  $q$(11) 95432-1098$q$,
  $q$Pai Roberto$q$,
  $q$$q$,
  $q$$q$,
  true,
  '{"pesq_literarraial_2025"}',
  $q$2025-03-01T11:20:00Z$q$
) on conflict (id) do update set
  cpf = excluded.cpf, nome = excluded.nome, login = excluded.login,
  perfil_acesso_id = excluded.perfil_acesso_id, email = excluded.email,
  ativo = excluded.ativo, pesquisas_vinculadas_ids = excluded.pesquisas_vinculadas_ids;

insert into public.colaboradores (
  id, cpf, nome, rg, data_nascimento, sexo, login, senha, perfil_acesso_id,
  email, celular, nome_contato_celular, telefone_fixo, nome_contato_fixo,
  ativo, pesquisas_vinculadas_ids, criado_em
) values (
  $q$colab_5$q$,
  $q$567.890.123-44$q$,
  $q$Fernando Guimarães$q$,
  $q$55.666.777-8$q$,
  $q$1992-07-30$q$::date,
  $q$M$q$,
  $q$fernando.analista$q$,
  crypt($q$analista123$q$, gen_salt('bf')),
  '00000000-0000-4000-8000-000000000004',
  $q$fernando.guimaraes@dataquest.gov.br$q$,
  $q$(11) 94321-0987$q$,
  $q$Esposa Juliana$q$,
  $q$(11) 3214-5510$q$,
  $q$Depto Estatística$q$,
  true,
  '{"pesq_literarraial_2025","pesq_saude_2025"}',
  $q$2025-03-10T16:45:00Z$q$
) on conflict (id) do update set
  cpf = excluded.cpf, nome = excluded.nome, login = excluded.login,
  perfil_acesso_id = excluded.perfil_acesso_id, email = excluded.email,
  ativo = excluded.ativo, pesquisas_vinculadas_ids = excluded.pesquisas_vinculadas_ids;

-- -------------------------------------------------------------------------------------
-- 3. Pesquisas (Survey) — inclui as colunas normalizadas de plano amostral, cotas por
--    sexo, datas de campo e configuração de gravação de áudio (migration 0002).
-- -------------------------------------------------------------------------------------

insert into public.pesquisas (
  id, codigo, nome, descricao, status, habilitar_coleta_web, tipo_coleta_web,
  colaborador_web_id, perguntas, regras, metas, metas_globais, pesquisadores_ids,
  ciclo_atual, versao, criada_em, atualizada_em, em_andamento, server_version, dados_completos,
  data_inicio, data_fim, meta_total_coletas, nivel_confianca_percentual, margem_erro_percentual,
  populacao_universo, meta_sexo_masculino, meta_sexo_feminino, meta_sexo_outro,
  dias_previstos_campo, media_coletas_dia_pesquisador, reserva_tecnica_percentual,
  habilitar_gravacao_audio, gravar_audio_a_partir_pergunta_id, tempo_limite_gravacao_minutos
) values (
  $q$pesq_literarraial_2025$q$,
  $q$LIT-2025-01$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$Dados sobre a percepção da Feira Literária.$q$,
  $q$ativa$q$,
  true,
  $q$publico$q$,
  $q$colab_2$q$,
  $j$[{"id": "q1", "codigo": "P01", "enunciado": "Você reside no município onde a feira literária está sendo realizada?", "tipo": "sim_nao", "obrigatoria": true, "ordem": 1, "opcoes": [{"id": "opt_sim", "label": "Sim, sou morador", "value": "Sim"}, {"id": "opt_nao", "label": "Não, sou visitante/turista", "value": "Não"}]}, {"id": "q2", "codigo": "P02", "enunciado": "Qual a sua faixa etária?", "tipo": "multipla_escolha", "obrigatoria": true, "ordem": 2, "opcoes": [{"id": "opt_1825", "label": "18 a 25 anos", "value": "18 a 25 anos"}, {"id": "opt_2640", "label": "26 a 40 anos", "value": "26 a 40 anos"}, {"id": "opt_4160", "label": "41 a 60 anos", "value": "41 a 60 anos"}, {"id": "opt_60mais", "label": "Acima de 60 anos", "value": "Acima de 60 anos"}]}, {"id": "q3", "codigo": "P03", "enunciado": "Como você avalia a infraestrutura e acessibilidade do evento?", "tipo": "escala_numerica", "obrigatoria": true, "ordem": 3, "escalaMin": 1, "escalaMax": 5, "escalaMinLabel": "Muito Insatisfeito", "escalaMaxLabel": "Muito Satisfeito"}, {"id": "q4", "codigo": "P04", "enunciado": "Você realizou compras de livros ou artesanato no local?", "tipo": "multipla_escolha", "obrigatoria": true, "ordem": 4, "opcoes": [{"id": "opt_compras_sim", "label": "Sim, comprei livros", "value": "Sim"}, {"id": "opt_compras_nao", "label": "Não comprei nada", "value": "Não"}, {"id": "opt_compras_ambos", "label": "Comprei livros e outros itens", "value": "Sim, livros e outros"}]}, {"id": "q5", "codigo": "P05", "enunciado": "Qual o principal motivo para não ter realizado compras de livros?", "tipo": "multipla_escolha", "obrigatoria": false, "ordem": 5, "opcoes": [{"id": "opt_motivo_preco", "label": "Preços elevados", "value": "Preços elevados"}, {"id": "opt_motivo_titulos", "label": "Não encontrei títulos de interesse", "value": "Falta de títulos"}, {"id": "opt_motivo_visitante", "label": "Apenas passeando no evento", "value": "Apenas passeando"}]}, {"id": "q6", "codigo": "P06", "enunciado": "Em uma escala de 0 a 10, qual a probabilidade de você indicar a feira a amigos e familiares? (NPS)", "tipo": "nps", "obrigatoria": true, "ordem": 6, "escalaMin": 0, "escalaMax": 10, "escalaMinLabel": "Não indicaria", "escalaMaxLabel": "Com certeza indicaria"}, {"id": "q7", "codigo": "P07", "enunciado": "Deixe sua crítica, sugestão ou elogio para as próximas edições:", "tipo": "texto_aberto", "obrigatoria": false, "ordem": 7}]$j$::jsonb,
  $j$[{"id": "regra_1", "perguntaOrigemId": "q4", "condicao": "igual", "valorComparacao": "Não", "acao": "saltar_para", "perguntaDestinoId": "q5", "descricao": "Se não comprou nada, exibe o motivo da não compra (Q05)"}, {"id": "regra_2", "perguntaOrigemId": "q4", "condicao": "diferente", "valorComparacao": "Não", "acao": "esconder_pergunta", "perguntaDestinoId": "q5", "descricao": "Se comprou livros, esconde o motivo de não compra e pula para NPS (Q06)"}]$j$::jsonb,
  $j$[{"id": "meta_1", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q1", "condicao": "igual", "resposta": "Sim", "quantidadeAlvo": 300, "quantidadeAtingida": 245, "ciclo": "Ciclo 1 - 2025"}, {"id": "meta_2", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q1", "condicao": "igual", "resposta": "Não", "quantidadeAlvo": 150, "quantidadeAtingida": 132, "ciclo": "Ciclo 1 - 2025"}, {"id": "meta_3", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q2", "condicao": "igual", "resposta": "18 a 25 anos", "quantidadeAlvo": 120, "quantidadeAtingida": 114, "ciclo": "Ciclo 1 - 2025"}, {"id": "meta_4", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q4", "condicao": "contem", "resposta": "Sim", "quantidadeAlvo": 200, "quantidadeAtingida": 189, "ciclo": "Ciclo 1 - 2025"}]$j$::jsonb,
  $j$[{"id": "mg_001", "pesquisaId": "pesq_literarraial_2025", "titulo": "Jovens 18 a 25 anos - Praça da Matriz", "descricao": "Amostragem de jovens no perímetro cultural e estandes de livros.", "criterios": {"faixaEtaria": "18 a 25 anos", "sexo": "Todos", "bairro": "Praça da Matriz"}, "metaGlobalAlvo": 60, "metaGlobalAtingida": 48, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-12T10:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 30, "cotaAtingida": 24, "dataAtribuicao": "2025-05-12T10:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 30, "cotaAtingida": 24, "dataAtribuicao": "2025-05-12T10:30:00Z"}]}, {"id": "mg_002", "pesquisaId": "pesq_literarraial_2025", "titulo": "Público Feminino - Amostragem Central", "descricao": "Garantia de paridade amostral de mulheres com foco no Bairro Centro.", "criterios": {"faixaEtaria": "Todas", "sexo": "Feminino", "bairro": "Centro"}, "metaGlobalAlvo": 80, "metaGlobalAtingida": 62, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-14T11:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 28, "dataAtribuicao": "2025-05-14T11:15:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 34, "dataAtribuicao": "2025-05-14T11:15:00Z"}]}, {"id": "mg_003", "pesquisaId": "pesq_literarraial_2025", "titulo": "Adultos 41 a 60 anos - Centro & Matriz", "descricao": "Amostragem de chefes de família e consumidores de literatura.", "criterios": {"faixaEtaria": "41 a 60 anos", "sexo": "Todos", "bairro": "Centro"}, "metaGlobalAlvo": 50, "metaGlobalAtingida": 50, "status": "concluida", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-15T09:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 25, "cotaAtingida": 25, "dataAtribuicao": "2025-05-15T09:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 25, "cotaAtingida": 25, "dataAtribuicao": "2025-05-15T09:30:00Z"}]}, {"id": "mg_004", "pesquisaId": "pesq_literarraial_2025", "titulo": "Terceira Idade (Acima de 60 anos) - Zona Norte", "descricao": "Avaliação de acessibilidade e mobilidade para idosos.", "criterios": {"faixaEtaria": "Acima de 60 anos", "sexo": "Todos", "bairro": "Zona Norte"}, "metaGlobalAlvo": 40, "metaGlobalAtingida": 18, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-18T14:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 20, "cotaAtingida": 9, "dataAtribuicao": "2025-05-18T14:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 20, "cotaAtingida": 9, "dataAtribuicao": "2025-05-18T14:30:00Z"}]}]$j$::jsonb,
  '{"colab_1","colab_2","colab_3","colab_4"}',
  1,
  1,
  $q$2025-05-10T08:00:00Z$q$,
  $q$2025-06-01T17:30:00Z$q$,
  true,
  1,
  $j${"id": "pesq_literarraial_2025", "codigo": "LIT-2025-01", "nome": "LiterArraial 2025 - Prefeitura", "descricao": "Dados sobre a percepção da Feira Literária.", "status": "ativa", "habilitarColetaWeb": true, "tipoColetaWeb": "publico", "colaboradorWebId": "colab_2", "pesquisadoresIds": ["colab_1", "colab_2", "colab_3", "colab_4"], "cicloAtual": 1, "versao": 1, "criadaEm": "2025-05-10T08:00:00Z", "atualizadaEm": "2025-06-01T17:30:00Z", "perguntas": [{"id": "q1", "codigo": "P01", "enunciado": "Você reside no município onde a feira literária está sendo realizada?", "tipo": "sim_nao", "obrigatoria": true, "ordem": 1, "opcoes": [{"id": "opt_sim", "label": "Sim, sou morador", "value": "Sim"}, {"id": "opt_nao", "label": "Não, sou visitante/turista", "value": "Não"}]}, {"id": "q2", "codigo": "P02", "enunciado": "Qual a sua faixa etária?", "tipo": "multipla_escolha", "obrigatoria": true, "ordem": 2, "opcoes": [{"id": "opt_1825", "label": "18 a 25 anos", "value": "18 a 25 anos"}, {"id": "opt_2640", "label": "26 a 40 anos", "value": "26 a 40 anos"}, {"id": "opt_4160", "label": "41 a 60 anos", "value": "41 a 60 anos"}, {"id": "opt_60mais", "label": "Acima de 60 anos", "value": "Acima de 60 anos"}]}, {"id": "q3", "codigo": "P03", "enunciado": "Como você avalia a infraestrutura e acessibilidade do evento?", "tipo": "escala_numerica", "obrigatoria": true, "ordem": 3, "escalaMin": 1, "escalaMax": 5, "escalaMinLabel": "Muito Insatisfeito", "escalaMaxLabel": "Muito Satisfeito"}, {"id": "q4", "codigo": "P04", "enunciado": "Você realizou compras de livros ou artesanato no local?", "tipo": "multipla_escolha", "obrigatoria": true, "ordem": 4, "opcoes": [{"id": "opt_compras_sim", "label": "Sim, comprei livros", "value": "Sim"}, {"id": "opt_compras_nao", "label": "Não comprei nada", "value": "Não"}, {"id": "opt_compras_ambos", "label": "Comprei livros e outros itens", "value": "Sim, livros e outros"}]}, {"id": "q5", "codigo": "P05", "enunciado": "Qual o principal motivo para não ter realizado compras de livros?", "tipo": "multipla_escolha", "obrigatoria": false, "ordem": 5, "opcoes": [{"id": "opt_motivo_preco", "label": "Preços elevados", "value": "Preços elevados"}, {"id": "opt_motivo_titulos", "label": "Não encontrei títulos de interesse", "value": "Falta de títulos"}, {"id": "opt_motivo_visitante", "label": "Apenas passeando no evento", "value": "Apenas passeando"}]}, {"id": "q6", "codigo": "P06", "enunciado": "Em uma escala de 0 a 10, qual a probabilidade de você indicar a feira a amigos e familiares? (NPS)", "tipo": "nps", "obrigatoria": true, "ordem": 6, "escalaMin": 0, "escalaMax": 10, "escalaMinLabel": "Não indicaria", "escalaMaxLabel": "Com certeza indicaria"}, {"id": "q7", "codigo": "P07", "enunciado": "Deixe sua crítica, sugestão ou elogio para as próximas edições:", "tipo": "texto_aberto", "obrigatoria": false, "ordem": 7}], "regras": [{"id": "regra_1", "perguntaOrigemId": "q4", "condicao": "igual", "valorComparacao": "Não", "acao": "saltar_para", "perguntaDestinoId": "q5", "descricao": "Se não comprou nada, exibe o motivo da não compra (Q05)"}, {"id": "regra_2", "perguntaOrigemId": "q4", "condicao": "diferente", "valorComparacao": "Não", "acao": "esconder_pergunta", "perguntaDestinoId": "q5", "descricao": "Se comprou livros, esconde o motivo de não compra e pula para NPS (Q06)"}], "metas": [{"id": "meta_1", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q1", "condicao": "igual", "resposta": "Sim", "quantidadeAlvo": 300, "quantidadeAtingida": 245, "ciclo": "Ciclo 1 - 2025"}, {"id": "meta_2", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q1", "condicao": "igual", "resposta": "Não", "quantidadeAlvo": 150, "quantidadeAtingida": 132, "ciclo": "Ciclo 1 - 2025"}, {"id": "meta_3", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q2", "condicao": "igual", "resposta": "18 a 25 anos", "quantidadeAlvo": 120, "quantidadeAtingida": 114, "ciclo": "Ciclo 1 - 2025"}, {"id": "meta_4", "pesquisaId": "pesq_literarraial_2025", "perguntaId": "q4", "condicao": "contem", "resposta": "Sim", "quantidadeAlvo": 200, "quantidadeAtingida": 189, "ciclo": "Ciclo 1 - 2025"}], "metasGlobais": [{"id": "mg_001", "pesquisaId": "pesq_literarraial_2025", "titulo": "Jovens 18 a 25 anos - Praça da Matriz", "descricao": "Amostragem de jovens no perímetro cultural e estandes de livros.", "criterios": {"faixaEtaria": "18 a 25 anos", "sexo": "Todos", "bairro": "Praça da Matriz"}, "metaGlobalAlvo": 60, "metaGlobalAtingida": 48, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-12T10:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 30, "cotaAtingida": 24, "dataAtribuicao": "2025-05-12T10:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 30, "cotaAtingida": 24, "dataAtribuicao": "2025-05-12T10:30:00Z"}]}, {"id": "mg_002", "pesquisaId": "pesq_literarraial_2025", "titulo": "Público Feminino - Amostragem Central", "descricao": "Garantia de paridade amostral de mulheres com foco no Bairro Centro.", "criterios": {"faixaEtaria": "Todas", "sexo": "Feminino", "bairro": "Centro"}, "metaGlobalAlvo": 80, "metaGlobalAtingida": 62, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-14T11:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 28, "dataAtribuicao": "2025-05-14T11:15:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 34, "dataAtribuicao": "2025-05-14T11:15:00Z"}]}, {"id": "mg_003", "pesquisaId": "pesq_literarraial_2025", "titulo": "Adultos 41 a 60 anos - Centro & Matriz", "descricao": "Amostragem de chefes de família e consumidores de literatura.", "criterios": {"faixaEtaria": "41 a 60 anos", "sexo": "Todos", "bairro": "Centro"}, "metaGlobalAlvo": 50, "metaGlobalAtingida": 50, "status": "concluida", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-15T09:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 25, "cotaAtingida": 25, "dataAtribuicao": "2025-05-15T09:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 25, "cotaAtingida": 25, "dataAtribuicao": "2025-05-15T09:30:00Z"}]}, {"id": "mg_004", "pesquisaId": "pesq_literarraial_2025", "titulo": "Terceira Idade (Acima de 60 anos) - Zona Norte", "descricao": "Avaliação de acessibilidade e mobilidade para idosos.", "criterios": {"faixaEtaria": "Acima de 60 anos", "sexo": "Todos", "bairro": "Zona Norte"}, "metaGlobalAlvo": 40, "metaGlobalAtingida": 18, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-05-18T14:00:00Z", "atualizadoEm": "2025-06-02T16:00:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 20, "cotaAtingida": 9, "dataAtribuicao": "2025-05-18T14:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 20, "cotaAtingida": 9, "dataAtribuicao": "2025-05-18T14:30:00Z"}]}]}$j$::jsonb,
  NULL,
  NULL,
  NULL,
  95,
  3.5,
  NULL,
  NULL,
  NULL,
  NULL,
  3,
  15,
  15,
  true,
  NULL,
  2
) on conflict (id) do update set
  codigo = excluded.codigo, nome = excluded.nome, descricao = excluded.descricao,
  status = excluded.status, perguntas = excluded.perguntas, regras = excluded.regras,
  metas = excluded.metas, metas_globais = excluded.metas_globais,
  pesquisadores_ids = excluded.pesquisadores_ids, dados_completos = excluded.dados_completos;

insert into public.metas (id, pesquisa_id, pergunta_id, condicao, resposta, quantidade_alvo, quantidade_atingida, ciclo) values (
  $q$meta_1$q$, $q$pesq_literarraial_2025$q$, $q$q1$q$, $q$igual$q$,
  $q$Sim$q$, 300, 245, $q$Ciclo 1 - 2025$q$
) on conflict (id) do update set quantidade_alvo = excluded.quantidade_alvo, quantidade_atingida = excluded.quantidade_atingida;

insert into public.metas (id, pesquisa_id, pergunta_id, condicao, resposta, quantidade_alvo, quantidade_atingida, ciclo) values (
  $q$meta_2$q$, $q$pesq_literarraial_2025$q$, $q$q1$q$, $q$igual$q$,
  $q$Não$q$, 150, 132, $q$Ciclo 1 - 2025$q$
) on conflict (id) do update set quantidade_alvo = excluded.quantidade_alvo, quantidade_atingida = excluded.quantidade_atingida;

insert into public.metas (id, pesquisa_id, pergunta_id, condicao, resposta, quantidade_alvo, quantidade_atingida, ciclo) values (
  $q$meta_3$q$, $q$pesq_literarraial_2025$q$, $q$q2$q$, $q$igual$q$,
  $q$18 a 25 anos$q$, 120, 114, $q$Ciclo 1 - 2025$q$
) on conflict (id) do update set quantidade_alvo = excluded.quantidade_alvo, quantidade_atingida = excluded.quantidade_atingida;

insert into public.metas (id, pesquisa_id, pergunta_id, condicao, resposta, quantidade_alvo, quantidade_atingida, ciclo) values (
  $q$meta_4$q$, $q$pesq_literarraial_2025$q$, $q$q4$q$, $q$contem$q$,
  $q$Sim$q$, 200, 189, $q$Ciclo 1 - 2025$q$
) on conflict (id) do update set quantidade_alvo = excluded.quantidade_alvo, quantidade_atingida = excluded.quantidade_atingida;

insert into public.metas_globais (id, pesquisa_id, titulo, descricao, criterios, meta_global_alvo, meta_global_atingida, atribuicoes, status, ciclo, criado_em, atualizado_em) values (
  $q$mg_001$q$, $q$pesq_literarraial_2025$q$, $q$Jovens 18 a 25 anos - Praça da Matriz$q$, $q$Amostragem de jovens no perímetro cultural e estandes de livros.$q$,
  $j${"faixaEtaria": "18 a 25 anos", "sexo": "Todos", "bairro": "Praça da Matriz"}$j$::jsonb, 60, 48,
  $j$[{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 30, "cotaAtingida": 24, "dataAtribuicao": "2025-05-12T10:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 30, "cotaAtingida": 24, "dataAtribuicao": "2025-05-12T10:30:00Z"}]$j$::jsonb, $q$ativa$q$, $q$Ciclo 1 - 2025$q$,
  $q$2025-05-12T10:00:00Z$q$, $q$2025-06-02T16:00:00Z$q$
) on conflict (id) do update set meta_global_alvo = excluded.meta_global_alvo, meta_global_atingida = excluded.meta_global_atingida, atribuicoes = excluded.atribuicoes, status = excluded.status;

insert into public.metas_globais (id, pesquisa_id, titulo, descricao, criterios, meta_global_alvo, meta_global_atingida, atribuicoes, status, ciclo, criado_em, atualizado_em) values (
  $q$mg_002$q$, $q$pesq_literarraial_2025$q$, $q$Público Feminino - Amostragem Central$q$, $q$Garantia de paridade amostral de mulheres com foco no Bairro Centro.$q$,
  $j${"faixaEtaria": "Todas", "sexo": "Feminino", "bairro": "Centro"}$j$::jsonb, 80, 62,
  $j$[{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 28, "dataAtribuicao": "2025-05-14T11:15:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 34, "dataAtribuicao": "2025-05-14T11:15:00Z"}]$j$::jsonb, $q$ativa$q$, $q$Ciclo 1 - 2025$q$,
  $q$2025-05-14T11:00:00Z$q$, $q$2025-06-02T16:00:00Z$q$
) on conflict (id) do update set meta_global_alvo = excluded.meta_global_alvo, meta_global_atingida = excluded.meta_global_atingida, atribuicoes = excluded.atribuicoes, status = excluded.status;

insert into public.metas_globais (id, pesquisa_id, titulo, descricao, criterios, meta_global_alvo, meta_global_atingida, atribuicoes, status, ciclo, criado_em, atualizado_em) values (
  $q$mg_003$q$, $q$pesq_literarraial_2025$q$, $q$Adultos 41 a 60 anos - Centro & Matriz$q$, $q$Amostragem de chefes de família e consumidores de literatura.$q$,
  $j${"faixaEtaria": "41 a 60 anos", "sexo": "Todos", "bairro": "Centro"}$j$::jsonb, 50, 50,
  $j$[{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 25, "cotaAtingida": 25, "dataAtribuicao": "2025-05-15T09:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 25, "cotaAtingida": 25, "dataAtribuicao": "2025-05-15T09:30:00Z"}]$j$::jsonb, $q$concluida$q$, $q$Ciclo 1 - 2025$q$,
  $q$2025-05-15T09:00:00Z$q$, $q$2025-06-02T16:00:00Z$q$
) on conflict (id) do update set meta_global_alvo = excluded.meta_global_alvo, meta_global_atingida = excluded.meta_global_atingida, atribuicoes = excluded.atribuicoes, status = excluded.status;

insert into public.metas_globais (id, pesquisa_id, titulo, descricao, criterios, meta_global_alvo, meta_global_atingida, atribuicoes, status, ciclo, criado_em, atualizado_em) values (
  $q$mg_004$q$, $q$pesq_literarraial_2025$q$, $q$Terceira Idade (Acima de 60 anos) - Zona Norte$q$, $q$Avaliação de acessibilidade e mobilidade para idosos.$q$,
  $j${"faixaEtaria": "Acima de 60 anos", "sexo": "Todos", "bairro": "Zona Norte"}$j$::jsonb, 40, 18,
  $j$[{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 20, "cotaAtingida": 9, "dataAtribuicao": "2025-05-18T14:30:00Z"}, {"pesquisadorId": "colab_4", "pesquisadorNome": "Aline Barbosa Ramos", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 20, "cotaAtingida": 9, "dataAtribuicao": "2025-05-18T14:30:00Z"}]$j$::jsonb, $q$ativa$q$, $q$Ciclo 1 - 2025$q$,
  $q$2025-05-18T14:00:00Z$q$, $q$2025-06-02T16:00:00Z$q$
) on conflict (id) do update set meta_global_alvo = excluded.meta_global_alvo, meta_global_atingida = excluded.meta_global_atingida, atribuicoes = excluded.atribuicoes, status = excluded.status;

insert into public.pesquisas (
  id, codigo, nome, descricao, status, habilitar_coleta_web, tipo_coleta_web,
  colaborador_web_id, perguntas, regras, metas, metas_globais, pesquisadores_ids,
  ciclo_atual, versao, criada_em, atualizada_em, em_andamento, server_version, dados_completos,
  data_inicio, data_fim, meta_total_coletas, nivel_confianca_percentual, margem_erro_percentual,
  populacao_universo, meta_sexo_masculino, meta_sexo_feminino, meta_sexo_outro,
  dias_previstos_campo, media_coletas_dia_pesquisador, reserva_tecnica_percentual,
  habilitar_gravacao_audio, gravar_audio_a_partir_pergunta_id, tempo_limite_gravacao_minutos
) values (
  $q$pesq_saude_2025$q$,
  $q$SAU-2025-02$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$Mapeamento de satisfação e tempo de espera nas UBS.$q$,
  $q$ativa$q$,
  false,
  $q$interno$q$,
  $q$colab_1$q$,
  $j$[{"id": "qs1", "codigo": "P01", "enunciado": "Qual a sua unidade básica de saúde de referência?", "tipo": "multipla_escolha", "obrigatoria": true, "ordem": 1, "opcoes": [{"id": "ubs_central", "label": "UBS Central Dr. Paulo", "value": "UBS Central"}, {"id": "ubs_norte", "label": "UBS Zona Norte", "value": "UBS Zona Norte"}, {"id": "ubs_sul", "label": "UBS Jardim das Flores", "value": "UBS Sul"}]}, {"id": "qs2", "codigo": "P02", "enunciado": "Você conseguiu agendar sua consulta no mesmo mês?", "tipo": "sim_nao", "obrigatoria": true, "ordem": 2, "opcoes": [{"id": "opt_sim_s", "label": "Sim", "value": "Sim"}, {"id": "opt_nao_s", "label": "Não", "value": "Não"}]}, {"id": "qs3", "codigo": "P03", "enunciado": "Qual o grau de satisfação com o atendimento médico?", "tipo": "escala_numerica", "obrigatoria": true, "ordem": 3, "escalaMin": 1, "escalaMax": 5, "escalaMinLabel": "Péssimo", "escalaMaxLabel": "Excelente"}]$j$::jsonb,
  $j$[]$j$::jsonb,
  $j$[{"id": "meta_s1", "pesquisaId": "pesq_saude_2025", "perguntaId": "qs2", "condicao": "igual", "resposta": "Sim", "quantidadeAlvo": 500, "quantidadeAtingida": 412, "ciclo": "Ciclo 1 - 2025"}]$j$::jsonb,
  $j$[{"id": "mgs_001", "pesquisaId": "pesq_saude_2025", "titulo": "Idosos (Acima de 60 anos) - UBS Central", "descricao": "Meta prioritária de acolhimento e tempo de espera para pacientes geriátricos.", "criterios": {"faixaEtaria": "Acima de 60 anos", "sexo": "Todos", "bairro": "UBS Central"}, "metaGlobalAlvo": 100, "metaGlobalAtingida": 75, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-04-20T10:00:00Z", "atualizadoEm": "2025-05-20T14:10:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 50, "cotaAtingida": 42, "dataAtribuicao": "2025-04-20T10:30:00Z"}, {"pesquisadorId": "colab_1", "pesquisadorNome": "Carlos Eduardo Silveira", "perfilAcessoNome": "Administrador Master", "cotaAlvo": 50, "cotaAtingida": 33, "dataAtribuicao": "2025-04-20T10:30:00Z"}]}, {"id": "mgs_002", "pesquisaId": "pesq_saude_2025", "titulo": "Mulheres 26 a 40 anos - UBS Jardim das Flores", "descricao": "Saúde da mulher, pré-natal e consultas preventivas.", "criterios": {"faixaEtaria": "26 a 40 anos", "sexo": "Feminino", "bairro": "UBS Sul"}, "metaGlobalAlvo": 80, "metaGlobalAtingida": 45, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-04-22T08:00:00Z", "atualizadoEm": "2025-05-20T14:10:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 25, "dataAtribuicao": "2025-04-22T08:30:00Z"}, {"pesquisadorId": "colab_5", "pesquisadorNome": "Fernando Guimarães", "perfilAcessoNome": "Analista Estatístico", "cotaAlvo": 40, "cotaAtingida": 20, "dataAtribuicao": "2025-04-22T08:30:00Z"}]}]$j$::jsonb,
  '{"colab_1","colab_3","colab_5"}',
  1,
  1,
  $q$2025-04-15T09:00:00Z$q$,
  $q$2025-05-20T14:10:00Z$q$,
  true,
  1,
  $j${"id": "pesq_saude_2025", "codigo": "SAU-2025-02", "nome": "Censo Municipal de Atenção Básica de Saúde", "descricao": "Mapeamento de satisfação e tempo de espera nas UBS.", "status": "ativa", "habilitarColetaWeb": false, "tipoColetaWeb": "interno", "colaboradorWebId": "colab_1", "pesquisadoresIds": ["colab_1", "colab_3", "colab_5"], "cicloAtual": 1, "versao": 1, "criadaEm": "2025-04-15T09:00:00Z", "atualizadaEm": "2025-05-20T14:10:00Z", "perguntas": [{"id": "qs1", "codigo": "P01", "enunciado": "Qual a sua unidade básica de saúde de referência?", "tipo": "multipla_escolha", "obrigatoria": true, "ordem": 1, "opcoes": [{"id": "ubs_central", "label": "UBS Central Dr. Paulo", "value": "UBS Central"}, {"id": "ubs_norte", "label": "UBS Zona Norte", "value": "UBS Zona Norte"}, {"id": "ubs_sul", "label": "UBS Jardim das Flores", "value": "UBS Sul"}]}, {"id": "qs2", "codigo": "P02", "enunciado": "Você conseguiu agendar sua consulta no mesmo mês?", "tipo": "sim_nao", "obrigatoria": true, "ordem": 2, "opcoes": [{"id": "opt_sim_s", "label": "Sim", "value": "Sim"}, {"id": "opt_nao_s", "label": "Não", "value": "Não"}]}, {"id": "qs3", "codigo": "P03", "enunciado": "Qual o grau de satisfação com o atendimento médico?", "tipo": "escala_numerica", "obrigatoria": true, "ordem": 3, "escalaMin": 1, "escalaMax": 5, "escalaMinLabel": "Péssimo", "escalaMaxLabel": "Excelente"}], "regras": [], "metas": [{"id": "meta_s1", "pesquisaId": "pesq_saude_2025", "perguntaId": "qs2", "condicao": "igual", "resposta": "Sim", "quantidadeAlvo": 500, "quantidadeAtingida": 412, "ciclo": "Ciclo 1 - 2025"}], "metasGlobais": [{"id": "mgs_001", "pesquisaId": "pesq_saude_2025", "titulo": "Idosos (Acima de 60 anos) - UBS Central", "descricao": "Meta prioritária de acolhimento e tempo de espera para pacientes geriátricos.", "criterios": {"faixaEtaria": "Acima de 60 anos", "sexo": "Todos", "bairro": "UBS Central"}, "metaGlobalAlvo": 100, "metaGlobalAtingida": 75, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-04-20T10:00:00Z", "atualizadoEm": "2025-05-20T14:10:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 50, "cotaAtingida": 42, "dataAtribuicao": "2025-04-20T10:30:00Z"}, {"pesquisadorId": "colab_1", "pesquisadorNome": "Carlos Eduardo Silveira", "perfilAcessoNome": "Administrador Master", "cotaAlvo": 50, "cotaAtingida": 33, "dataAtribuicao": "2025-04-20T10:30:00Z"}]}, {"id": "mgs_002", "pesquisaId": "pesq_saude_2025", "titulo": "Mulheres 26 a 40 anos - UBS Jardim das Flores", "descricao": "Saúde da mulher, pré-natal e consultas preventivas.", "criterios": {"faixaEtaria": "26 a 40 anos", "sexo": "Feminino", "bairro": "UBS Sul"}, "metaGlobalAlvo": 80, "metaGlobalAtingida": 45, "status": "ativa", "ciclo": "Ciclo 1 - 2025", "criadoEm": "2025-04-22T08:00:00Z", "atualizadoEm": "2025-05-20T14:10:00Z", "atribuicoes": [{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 25, "dataAtribuicao": "2025-04-22T08:30:00Z"}, {"pesquisadorId": "colab_5", "pesquisadorNome": "Fernando Guimarães", "perfilAcessoNome": "Analista Estatístico", "cotaAlvo": 40, "cotaAtingida": 20, "dataAtribuicao": "2025-04-22T08:30:00Z"}]}]}$j$::jsonb,
  NULL,
  NULL,
  NULL,
  95,
  3.5,
  NULL,
  NULL,
  NULL,
  NULL,
  3,
  15,
  15,
  true,
  NULL,
  2
) on conflict (id) do update set
  codigo = excluded.codigo, nome = excluded.nome, descricao = excluded.descricao,
  status = excluded.status, perguntas = excluded.perguntas, regras = excluded.regras,
  metas = excluded.metas, metas_globais = excluded.metas_globais,
  pesquisadores_ids = excluded.pesquisadores_ids, dados_completos = excluded.dados_completos;

insert into public.metas (id, pesquisa_id, pergunta_id, condicao, resposta, quantidade_alvo, quantidade_atingida, ciclo) values (
  $q$meta_s1$q$, $q$pesq_saude_2025$q$, $q$qs2$q$, $q$igual$q$,
  $q$Sim$q$, 500, 412, $q$Ciclo 1 - 2025$q$
) on conflict (id) do update set quantidade_alvo = excluded.quantidade_alvo, quantidade_atingida = excluded.quantidade_atingida;

insert into public.metas_globais (id, pesquisa_id, titulo, descricao, criterios, meta_global_alvo, meta_global_atingida, atribuicoes, status, ciclo, criado_em, atualizado_em) values (
  $q$mgs_001$q$, $q$pesq_saude_2025$q$, $q$Idosos (Acima de 60 anos) - UBS Central$q$, $q$Meta prioritária de acolhimento e tempo de espera para pacientes geriátricos.$q$,
  $j${"faixaEtaria": "Acima de 60 anos", "sexo": "Todos", "bairro": "UBS Central"}$j$::jsonb, 100, 75,
  $j$[{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 50, "cotaAtingida": 42, "dataAtribuicao": "2025-04-20T10:30:00Z"}, {"pesquisadorId": "colab_1", "pesquisadorNome": "Carlos Eduardo Silveira", "perfilAcessoNome": "Administrador Master", "cotaAlvo": 50, "cotaAtingida": 33, "dataAtribuicao": "2025-04-20T10:30:00Z"}]$j$::jsonb, $q$ativa$q$, $q$Ciclo 1 - 2025$q$,
  $q$2025-04-20T10:00:00Z$q$, $q$2025-05-20T14:10:00Z$q$
) on conflict (id) do update set meta_global_alvo = excluded.meta_global_alvo, meta_global_atingida = excluded.meta_global_atingida, atribuicoes = excluded.atribuicoes, status = excluded.status;

insert into public.metas_globais (id, pesquisa_id, titulo, descricao, criterios, meta_global_alvo, meta_global_atingida, atribuicoes, status, ciclo, criado_em, atualizado_em) values (
  $q$mgs_002$q$, $q$pesq_saude_2025$q$, $q$Mulheres 26 a 40 anos - UBS Jardim das Flores$q$, $q$Saúde da mulher, pré-natal e consultas preventivas.$q$,
  $j${"faixaEtaria": "26 a 40 anos", "sexo": "Feminino", "bairro": "UBS Sul"}$j$::jsonb, 80, 45,
  $j$[{"pesquisadorId": "colab_3", "pesquisadorNome": "Rodrigo Fontes Lima", "perfilAcessoNome": "Pesquisador de Campo", "cotaAlvo": 40, "cotaAtingida": 25, "dataAtribuicao": "2025-04-22T08:30:00Z"}, {"pesquisadorId": "colab_5", "pesquisadorNome": "Fernando Guimarães", "perfilAcessoNome": "Analista Estatístico", "cotaAlvo": 40, "cotaAtingida": 20, "dataAtribuicao": "2025-04-22T08:30:00Z"}]$j$::jsonb, $q$ativa$q$, $q$Ciclo 1 - 2025$q$,
  $q$2025-04-22T08:00:00Z$q$, $q$2025-05-20T14:10:00Z$q$
) on conflict (id) do update set meta_global_alvo = excluded.meta_global_alvo, meta_global_atingida = excluded.meta_global_atingida, atribuicoes = excluded.atribuicoes, status = excluded.status;

insert into public.pesquisas (
  id, codigo, nome, descricao, status, habilitar_coleta_web, tipo_coleta_web,
  colaborador_web_id, perguntas, regras, metas, metas_globais, pesquisadores_ids,
  ciclo_atual, versao, criada_em, atualizada_em, em_andamento, server_version, dados_completos,
  data_inicio, data_fim, meta_total_coletas, nivel_confianca_percentual, margem_erro_percentual,
  populacao_universo, meta_sexo_masculino, meta_sexo_feminino, meta_sexo_outro,
  dias_previstos_campo, media_coletas_dia_pesquisador, reserva_tecnica_percentual,
  habilitar_gravacao_audio, gravar_audio_a_partir_pergunta_id, tempo_limite_gravacao_minutos
) values (
  $q$pesq_inativa_demo$q$,
  $q$HAB-2024-04$q$,
  $q$Diagnóstico Habitacional 2024 (Ciclo Anterior)$q$,
  $q$Levantamento concluído do programa de habitação popular.$q$,
  $q$inativa$q$,
  true,
  $q$publico$q$,
  NULL,
  $j$[]$j$::jsonb,
  $j$[]$j$::jsonb,
  $j$[]$j$::jsonb,
  $j$[]$j$::jsonb,
  '{"colab_1","colab_2"}',
  2,
  2,
  $q$2024-06-01T10:00:00Z$q$,
  $q$2024-12-15T18:00:00Z$q$,
  false,
  2,
  $j${"id": "pesq_inativa_demo", "codigo": "HAB-2024-04", "nome": "Diagnóstico Habitacional 2024 (Ciclo Anterior)", "descricao": "Levantamento concluído do programa de habitação popular.", "status": "inativa", "habilitarColetaWeb": true, "tipoColetaWeb": "publico", "pesquisadoresIds": ["colab_1", "colab_2"], "cicloAtual": 2, "versao": 2, "criadaEm": "2024-06-01T10:00:00Z", "atualizadaEm": "2024-12-15T18:00:00Z", "perguntas": [], "regras": [], "metas": []}$j$::jsonb,
  NULL,
  NULL,
  NULL,
  95,
  3.5,
  NULL,
  NULL,
  NULL,
  NULL,
  3,
  15,
  15,
  true,
  NULL,
  2
) on conflict (id) do update set
  codigo = excluded.codigo, nome = excluded.nome, descricao = excluded.descricao,
  status = excluded.status, perguntas = excluded.perguntas, regras = excluded.regras,
  metas = excluded.metas, metas_globais = excluded.metas_globais,
  pesquisadores_ids = excluded.pesquisadores_ids, dados_completos = excluded.dados_completos;

-- -------------------------------------------------------------------------------------
-- 4. Respostas (InterviewSubmission) — coletas de campo demo
-- -------------------------------------------------------------------------------------

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_001$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-06-02T14:32:15$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município onde a feira literária está sendo realizada?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Qual a sua faixa etária?", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Como você avalia a infraestrutura e acessibilidade do evento?", "resposta": "5"}, {"perguntaId": "q4", "perguntaCodigo": "P04", "perguntaEnunciado": "Você realizou compras de livros ou artesanato no local?", "resposta": "Sim"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "Em uma escala de 0 a 10, qual a probabilidade de você indicar a feira a amigos e familiares? (NPS)", "resposta": "10"}, {"perguntaId": "q7", "perguntaCodigo": "P07", "perguntaEnunciado": "Deixe sua crítica, sugestão ou elogio para as próximas edições:", "resposta": "Organização impecável, excelente curadoria de autores nacionais!"}]$j$::jsonb,
  $j${"latitude": -23.55052, "longitude": -46.633308, "bairro": "Centro Histórico", "cidade": "São Paulo - SP"}$j$::jsonb,
  $j${"duracaoSegundos": 142, "tamanhoKb": 890, "nomeArquivo": "gravacao_entrevista_001_audio.wav", "transcricaoTrecho": "Entrevistado confirma moradia no centro e elogia a acessibilidade e estandes."}$j$::jsonb,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_002$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-06-02T15:10:44$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município onde a feira literária está sendo realizada?", "resposta": "Não"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Qual a sua faixa etária?", "resposta": "18 a 25 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Como você avalia a infraestrutura e acessibilidade do evento?", "resposta": "4"}, {"perguntaId": "q4", "perguntaCodigo": "P04", "perguntaEnunciado": "Você realizou compras de livros ou artesanato no local?", "resposta": "Não"}, {"perguntaId": "q5", "perguntaCodigo": "P05", "perguntaEnunciado": "Qual o principal motivo para não ter realizado compras de livros?", "resposta": "Preços elevados"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "Em uma escala de 0 a 10, qual a probabilidade de você indicar a feira a amigos e familiares? (NPS)", "resposta": "8"}, {"perguntaId": "q7", "perguntaCodigo": "P07", "perguntaEnunciado": "Deixe sua crítica, sugestão ou elogio para as próximas edições:", "resposta": "Gostei muito das oficinas, mas os livros poderiam ter mais descontos de feira."}]$j$::jsonb,
  $j${"latitude": -23.5518, "longitude": -46.6345, "bairro": "Praça da Matriz", "cidade": "São Paulo - SP"}$j$::jsonb,
  $j${"duracaoSegundos": 95, "tamanhoKb": 610, "nomeArquivo": "gravacao_entrevista_002_audio.wav", "transcricaoTrecho": "Jovem visitante universitária comenta sobre preços e interesse em palestras."}$j$::jsonb,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_003$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-06-02T16:05:20$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município onde a feira literária está sendo realizada?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Qual a sua faixa etária?", "resposta": "41 a 60 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Como você avalia a infraestrutura e acessibilidade do evento?", "resposta": "5"}, {"perguntaId": "q4", "perguntaCodigo": "P04", "perguntaEnunciado": "Você realizou compras de livros ou artesanato no local?", "resposta": "Sim, livros e outros"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "Em uma escala de 0 a 10, qual a probabilidade de você indicar a feira a amigos e familiares? (NPS)", "resposta": "9"}, {"perguntaId": "q7", "perguntaCodigo": "P07", "perguntaEnunciado": "Deixe sua crítica, sugestão ou elogio para as próximas edições:", "resposta": "Excelente praça de alimentação e banheiros bem cuidados."}]$j$::jsonb,
  $j${"latitude": -23.5492, "longitude": -46.6321, "bairro": "Pavilhão das Letras", "cidade": "São Paulo - SP"}$j$::jsonb,
  $j${"duracaoSegundos": 165, "tamanhoKb": 980, "nomeArquivo": "gravacao_entrevista_003_audio.wav", "transcricaoTrecho": "Entrevistado acompanhado da família comprou 3 títulos infantis e 1 romance."}$j$::jsonb,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_004$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_1$q$,
  $q$Carlos Eduardo Silveira$q$,
  $q$2025-06-02T16:40:11$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Qual a sua unidade básica de saúde de referência?", "resposta": "UBS Central"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Você conseguiu agendar sua consulta no mesmo mês?", "resposta": "Sim"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Qual o grau de satisfação com o atendimento médico?", "resposta": "4"}]$j$::jsonb,
  $j${"latitude": -23.553, "longitude": -46.637, "bairro": "Bela Vista", "cidade": "São Paulo - SP"}$j$::jsonb,
  $j${"duracaoSegundos": 80, "tamanhoKb": 450, "nomeArquivo": "gravacao_entrevista_sau_001.wav", "transcricaoTrecho": "Paciente relata bom atendimento na triagem de enfermagem."}$j$::jsonb,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_005$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-26T10:15:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "18 a 25 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "10"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_006$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-05-26T14:40:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "4"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "9"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_007$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-27T09:20:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Não"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "41 a 60 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "4"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "8"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_008$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-05-27T11:50:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "Mais de 60 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "10"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_009$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-27T16:10:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "9"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_010$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-05-28T10:00:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "18 a 25 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "4"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "8"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_011$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-28T14:30:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "10"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_012$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-05-29T11:15:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Não"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "41 a 60 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "4"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "9"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_013$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-29T15:45:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "18 a 25 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "10"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_014$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-05-30T10:40:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "9"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_015$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-30T16:20:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "41 a 60 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "4"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "8"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_016$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-05-31T09:30:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "18 a 25 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "10"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_017$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-05-31T14:10:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "4"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "9"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_018$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_4$q$,
  $q$Aline Barbosa Ramos$q$,
  $q$2025-06-01T10:00:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "Mais de 60 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "10"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_019$q$,
  $q$LIT-2025-01$q$,
  $q$pesq_literarraial_2025$q$,
  $q$LiterArraial 2025 - Prefeitura$q$,
  $q$colab_3$q$,
  $q$Rodrigo Fontes Lima$q$,
  $q$2025-06-01T15:30:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "q1", "perguntaCodigo": "P01", "perguntaEnunciado": "Você reside no município?", "resposta": "Sim"}, {"perguntaId": "q2", "perguntaCodigo": "P02", "perguntaEnunciado": "Faixa etária", "resposta": "26 a 40 anos"}, {"perguntaId": "q3", "perguntaCodigo": "P03", "perguntaEnunciado": "Avaliação de infraestrutura", "resposta": "5"}, {"perguntaId": "q6", "perguntaCodigo": "P06", "perguntaEnunciado": "NPS", "resposta": "9"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_sau_002$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_1$q$,
  $q$Carlos Eduardo Silveira$q$,
  $q$2025-05-27T08:30:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Unidade de referência", "resposta": "UBS Jardim das Flores"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Agendamento no mesmo mês", "resposta": "Sim"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Satisfação atendimento", "resposta": "5"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_sau_003$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_2$q$,
  $q$Mariana Vasconcelos$q$,
  $q$2025-05-28T09:15:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Unidade de referência", "resposta": "UBS Central"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Agendamento no mesmo mês", "resposta": "Não"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Satisfação atendimento", "resposta": "3"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_sau_004$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_1$q$,
  $q$Carlos Eduardo Silveira$q$,
  $q$2025-05-29T11:00:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Unidade de referência", "resposta": "UBS Vila Esperança"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Agendamento no mesmo mês", "resposta": "Sim"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Satisfação atendimento", "resposta": "5"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_sau_005$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_2$q$,
  $q$Mariana Vasconcelos$q$,
  $q$2025-05-30T14:20:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Unidade de referência", "resposta": "UBS Central"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Agendamento no mesmo mês", "resposta": "Sim"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Satisfação atendimento", "resposta": "4"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_sau_006$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_1$q$,
  $q$Carlos Eduardo Silveira$q$,
  $q$2025-05-31T10:45:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Unidade de referência", "resposta": "UBS Central"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Agendamento no mesmo mês", "resposta": "Sim"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Satisfação atendimento", "resposta": "5"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

insert into public.respostas (
  id, codigo_pesquisa, pesquisa_id, pesquisa_nome, pesquisador_id, pesquisador_nome,
  data_hora, status, respostas, geolocalizacao, audio_gravacao,
  respostas_alteradas_pelo_admin, historico_edicao
) values (
  $q$sub_sau_007$q$,
  $q$SAU-2025-02$q$,
  $q$pesq_saude_2025$q$,
  $q$Censo Municipal de Atenção Básica de Saúde$q$,
  $q$colab_2$q$,
  $q$Mariana Vasconcelos$q$,
  $q$2025-06-01T11:30:00$q$,
  $q$concluida$q$,
  $j$[{"perguntaId": "qs1", "perguntaCodigo": "P01", "perguntaEnunciado": "Unidade de referência", "resposta": "UBS Bela Vista"}, {"perguntaId": "qs2", "perguntaCodigo": "P02", "perguntaEnunciado": "Agendamento no mesmo mês", "resposta": "Sim"}, {"perguntaId": "qs3", "perguntaCodigo": "P03", "perguntaEnunciado": "Satisfação atendimento", "resposta": "4"}]$j$::jsonb,
  NULL,
  NULL,
  false,
  $j$[]$j$::jsonb
) on conflict (id) do nothing;

-- -------------------------------------------------------------------------------------
-- 5. Conexões recentes (RecentConnection)
-- -------------------------------------------------------------------------------------

insert into public.conexoes_recentes (id, usuario, perfil, ip, data_hora, navegador, status) values (
  $q$conn_1$q$, $q$carlos.admin (Carlos Eduardo)$q$, $q$Administrador Master$q$, $q$189.40.112.54$q$,
  $q$02/06/2025 17:15:32$q$, $q$Chrome 125 / Linux x86_64$q$, $q$sucesso$q$
) on conflict (id) do nothing;

insert into public.conexoes_recentes (id, usuario, perfil, ip, data_hora, navegador, status) values (
  $q$conn_2$q$, $q$mariana.coord (Mariana V.)$q$, $q$Coordenador de Campo$q$, $q$177.102.88.19$q$,
  $q$02/06/2025 16:50:12$q$, $q$Edge 124 / Windows 11$q$, $q$sucesso$q$
) on conflict (id) do nothing;

insert into public.conexoes_recentes (id, usuario, perfil, ip, data_hora, navegador, status) values (
  $q$conn_3$q$, $q$rodrigo.pesquisador (Rodrigo F.)$q$, $q$Pesquisador de Campo$q$, $q$191.22.45.101$q$,
  $q$02/06/2025 16:04:02$q$, $q$Mobile Safari / iOS 17.5$q$, $q$sucesso$q$
) on conflict (id) do nothing;

insert into public.conexoes_recentes (id, usuario, perfil, ip, data_hora, navegador, status) values (
  $q$conn_4$q$, $q$aline.pesquisador (Aline B.)$q$, $q$Pesquisador de Campo$q$, $q$179.184.21.7$q$,
  $q$02/06/2025 15:09:18$q$, $q$Chrome Mobile / Android 14$q$, $q$sucesso$q$
) on conflict (id) do nothing;

insert into public.conexoes_recentes (id, usuario, perfil, ip, data_hora, navegador, status) values (
  $q$conn_5$q$, $q$usuario.desconhecido$q$, $q$Não autenticado$q$, $q$45.12.98.11$q$,
  $q$02/06/2025 12:45:00$q$, $q$Firefox 126 / macOS$q$, $q$bloqueado$q$
) on conflict (id) do nothing;

-- -------------------------------------------------------------------------------------
-- 6. Importações externas (ExternalImport)
-- -------------------------------------------------------------------------------------

insert into public.importacoes_externas (id, nome_arquivo, pesquisa_id, data_importacao, total_registros, colunas, status) values (
  $q$imp_01$q$, $q$Censo_Literario_Dados_Preliminares_2025.csv$q$, $q$pesq_literarraial_2025$q$, $q$2025-05-28 14:22:10$q$,
  140, '{"cpf_anonimizado","residente_municipio","faixa_etaria","nota_infra","comprou_livro","nps"}', $q$concluido$q$
) on conflict (id) do nothing;

insert into public.importacoes_externas (id, nome_arquivo, pesquisa_id, data_importacao, total_registros, colunas, status) values (
  $q$imp_02$q$, $q$UBS_Amostragem_Piloto_Maio.xlsx$q$, $q$pesq_saude_2025$q$, $q$2025-05-15 09:10:44$q$,
  85, '{"unidade_ubs","agendamento_mesmo_mes","grau_satisfacao"}', $q$concluido$q$
) on conflict (id) do nothing;

-- -------------------------------------------------------------------------------------
-- 7. Histórico de ações / auditoria (ActionAuditLog)
-- -------------------------------------------------------------------------------------

insert into public.historico_acoes (id, categoria, tipo_acao, titulo_acao, descricao_detalhada, autor, alvo, alteracoes, motivo_conformidade, "timestamp", hash_integridade, status_conformidade) values (
  $q$log_001$q$, $q$RESPOSTA$q$, $q$EDICAO_RESPOSTA$q$, $q$Edição de Resposta em Coleta$q$, $q$Retificação administrativa de resposta no formulário de entrevista #INT-8831 (LiterArraial 2025).$q$,
  $j${"id": "colab_01", "nome": "Carlos Eduardo Silva", "login": "admin", "perfil": "Administrador Master", "ip": "189.40.72.19"}$j$::jsonb, $j${"tipo": "resposta", "id": "sub_001", "identificador": "Coleta #INT-8831", "nome": "LiterArraial 2025 - Prefeitura"}$j$::jsonb, $j$[{"campo": "P03 - Você adquiriu algum livro durante o evento?", "rotulo": "Questão P03", "valorAnterior": "Não", "valorNovo": "Sim (1 a 2 livros)"}]$j$::jsonb, $q$Correção de erro de digitação do pesquisador em campo após conferência do áudio da gravação e validação com o supervisor.$q$,
  $q$2026-09-02T16:42:15.000Z$q$, $q$e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855$q$, $q$conforme$q$
) on conflict (id) do nothing;

insert into public.historico_acoes (id, categoria, tipo_acao, titulo_acao, descricao_detalhada, autor, alvo, alteracoes, motivo_conformidade, "timestamp", hash_integridade, status_conformidade) values (
  $q$log_002$q$, $q$PESQUISA$q$, $q$EDICAO_PESQUISA$q$, $q$Alteração de Configuração de Pesquisa$q$, $q$Habilitação da Coleta Web Pública e inclusão da regra condicional de salto para questão P05.$q$,
  $j${"id": "colab_01", "nome": "Carlos Eduardo Silva", "login": "admin", "perfil": "Administrador Master", "ip": "189.40.72.19"}$j$::jsonb, $j${"tipo": "pesquisa", "id": "pesq_literarraial_2025", "identificador": "PESQ-2025-01", "nome": "LiterArraial 2025 - Prefeitura"}$j$::jsonb, $j$[{"campo": "habilitarColetaWeb", "rotulo": "Coleta Web", "valorAnterior": "Inativo (false)", "valorNovo": "Ativo (true - Público)"}, {"campo": "regras", "rotulo": "Regras Condicionais", "valorAnterior": "0 regras", "valorNovo": "1 regra (P01 = Não -> Saltar para P05)"}]$j$::jsonb, $q$Abertura do canal de coleta web para munícipes e otimização do roteiro de perguntas conforme protocolo da Secretaria de Cultura.$q$,
  $q$2026-09-01T14:15:30.000Z$q$, $q$7d793037a0760186574b0282f2f435e7b1e7a6acc941e07400eeb7e12075487a$q$, $q$conforme$q$
) on conflict (id) do nothing;

insert into public.historico_acoes (id, categoria, tipo_acao, titulo_acao, descricao_detalhada, autor, alvo, alteracoes, motivo_conformidade, "timestamp", hash_integridade, status_conformidade) values (
  $q$log_003$q$, $q$PESQUISA$q$, $q$REPLICACAO_PESQUISA$q$, $q$Replicação de Pesquisa para Novo Ciclo$q$, $q$Pesquisa duplicada para o Ciclo 2 preservando estrutura de questionário e reiniciando metas de amostragem.$q$,
  $j${"id": "colab_02", "nome": "Mariana Costa Oliveira", "login": "mariana.coord", "perfil": "Coordenador de Campo", "ip": "201.86.115.44"}$j$::jsonb, $j${"tipo": "pesquisa", "id": "pesq_literarraial_2025_c2", "identificador": "PESQ-2025-01-C2", "nome": "LiterArraial 2025 - Prefeitura (Ciclo 2)"}$j$::jsonb, $j$[{"campo": "cicloAtual", "rotulo": "Ciclo", "valorAnterior": "Ciclo 1", "valorNovo": "Ciclo 2"}, {"campo": "versao", "rotulo": "Versão", "valorAnterior": "1", "valorNovo": "2"}]$j$::jsonb, $q$Abertura da segunda fase de coleta após atingimento das metas amostrais da primeira fase.$q$,
  $q$2026-08-30T11:00:22.000Z$q$, $q$f454f0a3952d7e00858e72ef78385adadcdad3f2a89327ee0cf075be8c0762cf$q$, $q$conforme$q$
) on conflict (id) do nothing;

insert into public.historico_acoes (id, categoria, tipo_acao, titulo_acao, descricao_detalhada, autor, alvo, alteracoes, motivo_conformidade, "timestamp", hash_integridade, status_conformidade) values (
  $q$log_004$q$, $q$RESPOSTA$q$, $q$EDICAO_RESPOSTA$q$, $q$Ajuste de Dado Espontâneo em Resposta$q$, $q$Adequação da transcrição da resposta aberta na coleta #INT-8833 (UBS São Francisco).$q$,
  $j${"id": "colab_01", "nome": "Carlos Eduardo Silva", "login": "admin", "perfil": "Administrador Master", "ip": "189.40.72.19"}$j$::jsonb, $j${"tipo": "resposta", "id": "sub_003", "identificador": "Coleta #INT-8833", "nome": "Avaliação dos Serviços de Saúde - UBS"}$j$::jsonb, $j$[{"campo": "P03 - Sugestões de Melhoria", "rotulo": "Resposta Espontânea", "valorAnterior": "falta remdio na farmacia", "valorNovo": "Falta de medicamentos de uso contínuo na farmácia básica"}]$j$::jsonb, $q$Padronização ortográfica para codificação temática na análise quanti-qualitativa, sem alteração de sentido semântico.$q$,
  $q$2026-08-28T09:20:00.000Z$q$, $q$9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08$q$, $q$conforme$q$
) on conflict (id) do nothing;

insert into public.historico_acoes (id, categoria, tipo_acao, titulo_acao, descricao_detalhada, autor, alvo, alteracoes, motivo_conformidade, "timestamp", hash_integridade, status_conformidade) values (
  $q$log_005$q$, $q$PESQUISA$q$, $q$STATUS_PESQUISA$q$, $q$Alteração de Status da Pesquisa$q$, $q$Pesquisa alterada de Inativa para Ativa para início das coletas dos agentes de campo.$q$,
  $j${"id": "colab_01", "nome": "Carlos Eduardo Silva", "login": "admin", "perfil": "Administrador Master", "ip": "189.40.72.19"}$j$::jsonb, $j${"tipo": "pesquisa", "id": "pesq_saude_2025", "identificador": "PESQ-2025-02", "nome": "Avaliação dos Serviços de Saúde - UBS"}$j$::jsonb, $j$[{"campo": "status", "rotulo": "Status Operacional", "valorAnterior": "inativa", "valorNovo": "ativa"}]$j$::jsonb, $q$Validação jurídica e ética do instrumento de pesquisa concluída pela Coordenadoria de Saúde.$q$,
  $q$2026-08-25T08:00:00.000Z$q$, $q$5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8$q$, $q$conforme$q$
) on conflict (id) do nothing;

insert into public.historico_acoes (id, categoria, tipo_acao, titulo_acao, descricao_detalhada, autor, alvo, alteracoes, motivo_conformidade, "timestamp", hash_integridade, status_conformidade) values (
  $q$log_006$q$, $q$PESQUISA$q$, $q$CRIACAO_PESQUISA$q$, $q$Criação de Novo Instrumento de Pesquisa$q$, $q$Cadastro inicial do questionário LiterArraial 2025 com 5 perguntas, regras e vinculação de 4 pesquisadores.$q$,
  $j${"id": "colab_01", "nome": "Carlos Eduardo Silva", "login": "admin", "perfil": "Administrador Master", "ip": "189.40.72.19"}$j$::jsonb, $j${"tipo": "pesquisa", "id": "pesq_literarraial_2025", "identificador": "PESQ-2025-01", "nome": "LiterArraial 2025 - Prefeitura"}$j$::jsonb, $j$[{"campo": "nome", "rotulo": "Nome", "valorNovo": "LiterArraial 2025 - Prefeitura"}, {"campo": "perguntas", "rotulo": "Perguntas Cadastradas", "valorNovo": "5 perguntas configuradas"}]$j$::jsonb, $q$Abertura oficial de edital de avaliação de satisfação pública do evento municipal.$q$,
  $q$2026-08-20T10:00:00.000Z$q$, $q$4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a$q$, $q$conforme$q$
) on conflict (id) do nothing;

-- =====================================================================================
-- FIM DO SEED
-- =====================================================================================
