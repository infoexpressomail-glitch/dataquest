# Handoff — Reorganização de UX/UI do DataQuest

> Documento de continuidade para retomar esta tarefa em outra sessão.
> Regra vigente em toda a tarefa: **não criar funcionalidades novas, não alterar
> banco/API/autenticação/regras de negócio — apenas reorganizar UX/UI/navegação
> do que já existe**, preservando permissões, dados e IDs internos.

## Como retomar

1. Extraia o zip de arquivos alterados na raiz do seu repositório local (mantém a
   estrutura de pastas `src/...`).
2. Rode `npm install`, depois `npx tsc --noEmit` e `npm run build:web` para
   confirmar que está tudo verde antes de continuar.
3. Continue pela seção "Pendente" abaixo, na ordem sugerida.

---

## Já concluído

### 1. Sidebar (`src/components/Sidebar.tsx`) — reescrito
- Antes: Administrador, Coordenador e Analista viam a mesma lista plana de
  módulos (só variando o que aparecia via permissão).
- Agora: 3 experiências contextuais, reaproveitando os mesmos módulos/IDs:
  - **Pesquisador**: Início → Coleta → Desempenho → Conformidade
  - **Analista** (detectado pelas permissões reais: sem `colaboradores_acesso`
    e sem `politicas_acesso`, com `analise_acesso`): Visão Geral → Dados →
    Análise → Exportação
  - **Administrador/Coordenador**: Visão Geral → Pesquisa → Coleta → Análise →
    Metas e Planejamento → Operação → Segurança e Controle (blocos do prompt
    mestre), com seções recolhíveis
- Todas as checagens `hasPermission(...)` foram preservadas exatamente como
  estavam; nenhuma nova permissão foi criada.

### 2. Cadastro de Colaboradores (`src/components/registrations/CollaboratorForm.tsx`)
- Reordenei as seções do formulário para bater com o prompt mestre:
  **Identificação → Contato → Acesso → Pesquisas Vinculadas**
  (antes era Dados Pessoais → Dados de Acesso → Telefones de Contato → Vínculo).
- Nenhum campo foi removido, adicionado ou renomeado no nível de dado —
  apenas a ordem/rótulo das seções visuais.
- A listagem de colaboradores (`nome, login, perfil, contatos, pesquisas
  vinculadas, status, ações`) já estava correta e não foi alterada.

### 3. Dashboard (`src/components/HomeDashboard.tsx`)
- Card **"Equipe em Campo"** agora só aparece para quem tem
  `colaboradores_acesso` (antes o Analista via esse card administrativo sem
  poder agir sobre ele — violava o princípio "não mostrar dashboard showcase").
- Grid de cards do topo (`painelGridClass`) se ajusta dinamicamente entre 3 ou
  4 colunas conforme os cards realmente visíveis para o perfil.

### 4. Módulo de Análise (`src/components/analytics/AnalyticsModule.tsx`)
- Existiam **dois seletores de pesquisa duplicados** (um na aba
  "Dimensionamento", outro na aba "Distribuição por Pergunta"). Unifiquei em
  um único seletor comum, exibido acima das abas, seguindo a hierarquia
  "informação principal primeiro" (§21/§50 do prompt mestre).

### 5. Ambiente do Pesquisador (`src/components/researcher/ResearcherEnvironment.tsx`)
- Rótulos de abas simplificados sem alterar lógica, `activeTab` ou IDs:
  - "Minhas Pesquisas Atribuídas (N)" → "Minhas Pesquisas (N)"
  - "Coleta em Campo (Formulário)" → "Coleta"
  - "Minhas Coletas (N)" → "Histórico (N)"
- A ordem das abas já batia com o prompt mestre (Painel → Pesquisas → Coleta →
  Metas → Histórico → Sincronização) e não precisou ser alterada.

### 6. Módulo de Metas (`src/components/metas/MetasModule.tsx`)
- Pesquisador de campo (`!canManageMetas && !hasPermission('analise_acesso')`,
  variável `isFieldResearcher`) agora só vê as abas relevantes ao seu
  trabalho: **Meu Progresso Individual** + **Painel de Metas Mobile**.
- Abas administrativas/analíticas (Gerenciamento de Metas Globais,
  Dimensionamento de Pesquisadores, Metas por Questão) ficam ocultas para
  esse perfil — elas continuam existindo e funcionando normalmente para quem
  tem permissão.
- Adicionei `effectiveTab` como proteção de navegação: se o estado
  `activeTab` apontar para uma aba restrita (ex: usuário trocou de perfil em
  runtime via "Restaurar Demonstração"/troca de usuário de teste), a
  renderização cai automaticamente para `individual`.

### 7. Dimensionamento de Equipe (`src/components/team/TeamSizingModule.tsx`)
- **Corrigi uma brecha de segurança pré-existente** (não introduzida por
  esta tarefa, mas alinhada ao princípio "permissão deve controlar a
  navegação", §12/§44/§45 do prompt): qualquer perfil — inclusive
  Pesquisador — podia clicar em "Salvar na Pesquisa" e persistir alterações
  nos parâmetros de dimensionamento, sem nenhuma checagem de permissão.
- Adicionei `canSaveSizing = hasPermission('meta_criar_alterar_excluir')`
  (mesma permissão já usada no módulo de Metas) e apliquei o gate em dois
  níveis (defesa em profundidade):
  - Visual: o botão "Salvar na Pesquisa" só renderiza se `canSaveSizing`.
  - Lógico: `handleSaveToSurvey` retorna cedo (`return`) se `!canSaveSizing`,
    mesmo que o botão seja acionado por outro caminho.
- Nenhuma fórmula, cálculo estatístico ou regra de amostragem foi alterada.

**Validação em todas as etapas acima:** `npx tsc --noEmit -p tsconfig.json`
rodado repetidamente (9x) sempre com saída limpa; `npm run build:web`
concluído com sucesso ao final da primeira leva de mudanças.

---

## Pendente (para a próxima sessão)

### A. `ExternalImportModule.tsx` — investigado, achado documentado, não corrigido
- **Bug pré-existente confirmado (fora do escopo desta tarefa):** o componente
  usa `hasPermission('importacao_pesquisa_externa')` e
  `hasPermission('importacao_resposta_externa')`. Essas duas chaves **não
  existem** em `AccessPolicyPermissions` (`src/types.ts`), que só define
  `importacao_importar_planilha`, `importacao_excluir` e `importacao_acesso`.
  - Efeito prático: `canImportSurvey` e `canImportResponse` são sempre
    `false` em runtime (a propriedade nunca existe no objeto de permissões),
    então **nenhum perfil consegue ver os botões de modo de importação** —
    o módulo fica com a área de upload visível, mas sem nenhuma aba de modo
    selecionável. Isso não foi causado por esta tarefa; já estava assim.
  - `tsc --noEmit` não acusa erro nisso (seguimos sem entender por quê —
    possivelmente widening de tipo em algum ponto da cadeia de tipos).
  - **Não corrigir sem autorização explícita do usuário** — corrigir a
    regra de permissão está fora do mandato de "só UX/reorganização". Se for
    resolvido futuramente, a correção mínima seria trocar essas duas chaves
    por `importacao_acesso` (a permissão real e já existente que controla
    a visibilidade do módulo no Sidebar), mas isso é uma decisão de regra de
    negócio que deve ser validada com o time antes de aplicar.
- Fluxo visual (Arquivo → Mapeamento → Processamento → Resultado): já está
  coberto pelo fluxo atual (seleção de tipo → destino se respostas → upload
  → pré-visualização → confirmar → status). Não precisou de reorganização.

### B. `ActionHistory.tsx` — Auditoria — revisado, sem mudanças necessárias
- Já transmite segurança/rastreabilidade: badges de conformidade (LGPD/ISO
  27001), KPIs (total de ações, edições em respostas, edições em pesquisas,
  operadores auditados), exportação CSV/JSON com hash de integridade,
  filtros por categoria/tipo de alvo/usuário/período.
- Módulo é intencionalmente acessível a todos os perfis (trilha de
  conformidade não é restrita por `hasPermission` — isso é esperado, não é
  uma brecha).
- Nenhuma alteração aplicada.

### C. Módulos revisados nesta rodada — sem necessidade de mudança
- `SurveyList.tsx` (§21): já bem gated por permissões
  (`pesquisa_criar/alterar/excluir/replicar/desativar/...`), organizado em
  abas Ativas/Inativas/Excluídas, cards com código/ciclo/status/pesquisadores
  vinculados/ações. Adequado ao prompt mestre, não precisou de mudança.
- `SurveyWizard.tsx` (§22): não foi tocado, por instrução explícita do
  prompt mestre ("não recrie o wizard, não altere sua lógica"). A navegação
  até ele já é protegida na origem (`SurveyList` só mostra o botão de
  criar/editar quando `canCreate`/`canEdit` são verdadeiros).
- `ResponsesModule.tsx` (§23): bem gated
  (`respostas_alterar`, `pesquisa_alteracao_resposta_espontanea`,
  `analise_criar_alterar_excluir_resposta`, `pesquisa_excluir`,
  `pesquisa_exportar_resultados`, `pesquisa_ouvir_audio`,
  `pesquisa_visualizar_georeferenciamento`), filtros existentes preservados,
  nenhum novo recurso de edição. Não precisou de mudança.
- `CollectionSimulator.tsx` (§29): sem `hasPermission` interno, mas a
  navegação até ele já é protegida pelo Sidebar/permissão de módulo. É a
  própria ferramenta de coleta — comportamento correto, não precisou de
  mudança.
- `AccessPolicies.tsx`: já adequado (grupos por módulo, "Marcar
  todos"/"Desmarcar todos", PT-BR). Não precisou de mudança.
- `Header.tsx`: revisado, adequado. Não precisou de mudança.

### D. Revisão transversal (§58-§60 do prompt mestre) — simulação estática concluída, teste manual em runtime ainda pendente
- **Simulação estática por perfil (feita via script cruzando `mockData.ts` com
  a lógica de cada componente) — todos os resultados bateram com o
  esperado:**

  | Perfil | Sidebar | Cards do Dashboard | Abas de Metas | Pode salvar Dimensionamento |
  |---|---|---|---|---|
  | Administrador Master | Gestão (7 blocos, com Políticas de Acesso) | 4 (todos) | 5 (todas) | Sim |
  | Coordenador de Campo | Gestão (7 blocos, sem Políticas de Acesso) | 4 (todos) | 5 (todas) | Sim |
  | Pesquisador de Campo | Portal do Pesquisador (4 blocos) | — (usa `ResearcherEnvironment`) | 2 (só as suas) | Não |
  | Analista Estatístico | Portal do Analista (4 blocos) | 3 (sem "Equipe em Campo") | 5 (todas, pois tem `analise_acesso`) | Não |

  Os scripts de simulação ficaram em `/tmp` desta sessão (não fazem parte do
  entregável) — se quiser reproduzir, a lógica é: ler `initialProfiles` de
  `src/mockData.ts` e aplicar as mesmas condições booleanas usadas em
  `Sidebar.tsx` (`isResearcher`/`isAnalyst`), `MetasModule.tsx`
  (`isFieldResearcher`), `TeamSizingModule.tsx` (`canSaveSizing`) e
  `HomeDashboard.tsx` (`canViewEquipe`).

- **Investigação sobre o `ExternalImportModule` (§ A):** confirmei que, em
  isolamento, o TypeScript rejeita corretamente as chaves inválidas
  (`importacao_pesquisa_externa`/`importacao_resposta_externa`) — o erro
  aparece com `tsc` puro sobre uma reprodução mínima. No entanto,
  `npx tsc --noEmit -p tsconfig.json` sobre o projeto completo não acusa
  esse erro nem mesmo forçando a compilação isolada do arquivo com todas as
  flags do `tsconfig.json`. Não identifiquei a causa exata (possivelmente
  cache incremental do `tsc`, ou alguma interação com `isolatedModules`/
  `moduleDetection: force`). Isso não bloqueia a entrega — o bug de runtime
  (bugs sempre `false`, módulo de importação achatado sem abas de modo)
  já está documentado no item A e é anterior a esta tarefa.

- **Servidor de preview**: subi `npm run build:web && npm run preview` neste
  ambiente e confirmei `HTTP 200` na raiz — a aplicação builda e serve
  normalmente após todas as mudanças. Não há navegador disponível neste
  ambiente de execução para clicar na UI de fato (login, navegação, mobile
  viewport), então os itens abaixo ainda dependem de um teste manual seu:
  - Login como cada um dos 4 perfis na aplicação rodando e confirmar
    visualmente que a experiência bate com a tabela acima.
  - Fluxo do pesquisador: login → `ResearcherEnvironment` → pesquisas
    vinculadas → coleta → metas → histórico → offline → sincronização → GPS
    → áudio. Nenhum desses fluxos foi alterado nesta tarefa, mas vale
    confirmar em runtime que a reorganização visual não quebrou nada.
  - Viewport mobile (DevTools ou dispositivo real): sem overflow horizontal
    no Sidebar, Dashboard, tabelas, modais e formulários.

- Build final: já validado (`tsc --noEmit` limpo + `npm run build:web`
  concluído com sucesso; chunk-size warning é pré-existente e não
  relacionado a esta tarefa).

### E. Relatório final (§70 do prompt mestre) — ainda não escrito
Ao concluir o item D (testes em runtime), montar o relatório final cobrindo:
Navegação, Perfis, Dashboard, Mobile, Idioma, Permissões, Segurança,
Funcionalidades (confirmar nada removido), Infraestrutura (Supabase/Vercel/
API/PWA/sincronização preservados). Este handoff já reúne praticamente todo
o conteúdo necessário para escrever esse relatório — falta apenas a
confirmação visual em runtime (item D) antes de fechar.

---

## Perfis reais do sistema (referência rápida)

| ID              | Nome                     | Observações                                  |
|-----------------|--------------------------|-----------------------------------------------|
| `prof_admin`    | Administrador Master     | Acesso irrestrito                             |
| `prof_coord`    | Coordenador de Campo     | Gerencia pesquisadores/pesquisas/metas        |
| `prof_pesq`     | Pesquisador de Campo     | Ambiente próprio (`ResearcherEnvironment`)    |
| `prof_analista` | Analista Estatístico     | Sem `colaboradores_acesso`/`politicas_acesso` |

Não criar novos perfis. IDs internos (`prof_admin` etc.) nunca devem ser
alterados — apenas o nome exibido pode ser ajustado, se necessário.

## Arquivos alterados até agora (para referência de diff)

```
src/components/Sidebar.tsx                              (reescrito)
src/components/registrations/CollaboratorForm.tsx       (seções reordenadas)
src/components/HomeDashboard.tsx                         (gate + grid dinâmico)
src/components/analytics/AnalyticsModule.tsx             (seletor unificado)
src/components/researcher/ResearcherEnvironment.tsx      (rótulos de aba)
src/components/metas/MetasModule.tsx                     (abas por perfil + effectiveTab)
src/components/team/TeamSizingModule.tsx                 (gate de permissão no salvar)
```
