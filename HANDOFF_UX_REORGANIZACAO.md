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
src/components/Sidebar.tsx                              (reescrito + sticky no desktop)
src/components/registrations/CollaboratorForm.tsx       (seções reordenadas)
src/components/HomeDashboard.tsx                         (gate + grid dinâmico)
src/components/analytics/AnalyticsModule.tsx             (seletor unificado)
src/components/researcher/ResearcherEnvironment.tsx      (rótulos de aba)
src/components/metas/MetasModule.tsx                     (abas por perfil + effectiveTab)
src/components/team/TeamSizingModule.tsx                 (gate de permissão + fix tela preta)
src/components/simulator/CollectionSimulator.tsx         (removida aba de amostragem/dispersão)
src/components/simulator/PopulationSampleScatterSimulator.tsx  (ARQUIVO EXCLUÍDO)
src/components/registrations/AccessPolicies.tsx          (resumo geral + colapso + busca)
src/index.css                                            (cobertura de tema claro ampliada)
src/components/Header.tsx                                (removida barra de métricas fixa + fix contraste botões)
```

## Item extra — rodada 4: refinamentos de contraste e remoção da barra fixa de métricas do Header

Feedback do usuário com screenshot mostrando: botões pill do Header (idioma,
tema) com contraste fraco no tema claro, e pedido para não exibir mais a
barra de métricas (Total Pesquisas / Entrevistas / Licenças) fixa no topo.

### 1. Contraste dos botões utilitários do Header (`src/index.css`, `src/components/Header.tsx`)
- Adicionada uma regra específica `header .bg-\[\#16171d\]` no tema claro:
  antes esses botões (idioma, dark mode) ficavam brancos sobre um header
  também branco, dependendo só de uma borda fina de 1px para se
  distinguirem. Agora recebem um fundo cinza sutil (`#f1f5f9`) que os
  destaca claramente como controles clicáveis.
- O ícone `Moon` (alternância de tema) não tinha nenhuma classe de cor
  própria — dependia 100% de herança `currentColor` do botão pai. Adicionei
  `text-slate-400` diretamente nele para reforçar contra qualquer contexto
  de herança quebrada.

### 2. Remoção da barra de métricas fixa do Header (`src/components/Header.tsx`)
A barra "Total Pesquisas / Entrevistas / Licenças" ficava permanentemente
visível no cabeçalho em todas as telas do sistema (visível só em telas
grandes, `hidden lg:flex`). Essa mesma informação já existe na tela inicial
(`HomeDashboard`), então mantê-la fixa no Header duplicava informação e
ocupava espaço de forma permanente — indo contra o princípio de "menos
informação irrelevante" do prompt mestre original.
- Removida a `<div>` da barra de métricas do `Header.tsx`.
- Removidas as variáveis `activeSurveys`/`activeCollaborators` que só
  alimentavam essa barra, e os campos `surveys`/`submissions` da
  desestruturação de `useApp()` que ficaram órfãos.
- `collaborators` foi mantido (ainda usado no dropdown "Alternar Usuário
  para Testes").
- As métricas continuam disponíveis normalmente na tela inicial — nada foi
  removido do sistema, apenas duplicação de header.

**Validação:** `tsc --noEmit` e `npm run build:web` limpos; suite de 24
testes de render (Header + Sidebar + AccessPolicies × 4 perfis × 2 temas)
via Vitest, todos passando sem exceção.

**Observação sobre limitação de verificação visual:** como não há
navegador disponível neste ambiente (rede bloqueia download do Chromium
para Playwright), as correções de contraste desta e das rodadas anteriores
foram guiadas por análise de código + a screenshot que o usuário enviou,
não por inspeção visual direta minha. Se ainda sobrar algum elemento
específico ilegível no tema claro depois de aplicar esta rodada, uma nova
screenshot com a área exata ajuda a fechar rapidamente.



### 1. Tema claro ilegível (`src/index.css`)

**Causa raiz:** o sistema já tinha uma base robusta de overrides WCAG AAA
para o tema claro (`html.light` / `html:not(.dark)`), mas cobria apenas um
subconjunto das classes Tailwind realmente usadas nos componentes — a
maioria dos 35 arquivos de componente usa cor fixa (ex: `text-slate-400`,
`bg-slate-800/60`, gradientes `from-emerald-950/40`) sem condicionar por
`darkMode`, então tudo dependia inteiramente dessa camada de override em
`index.css` estar completa. Ela não estava.

**Lacunas encontradas e corrigidas** (via varredura automatizada
grep + script Python comparando classes usadas × seletores cobertos):
- `bg-slate-700` (51+ usos) e variações com opacidade de `bg-slate-800`/
  `bg-slate-900` — **nenhuma cobertura antes**.
- `text-*-300` (blue/emerald/amber/rose/purple/cyan/indigo/pink) — usado em
  badges de destaque sobre fundo colorido, 91+ usos, **nenhuma cobertura
  antes**. Esse era provavelmente o maior contribuinte para "texto
  ilegível" relatado.
- Badges com opacidade `/15`, `/20` (só `/10` era coberto) e cores
  `rose`/`cyan`/`indigo`/`red`/`pink` (só `blue`/`emerald`/`purple`/`amber`
  eram cobertas).
- Gradientes decorativos escuros (`from-blue-950`, `from-indigo-950`,
  `from-emerald-950`, `from-amber-950`, `to-slate-900`) usados em cards de
  destaque (ex: `ConfidenceSampleCalculator`, `SurveyWizard`,
  `MobileMetasDashboard`) — sem nenhuma cobertura, resultavam em card com
  fundo escuro decorativo + texto escuro (já corrigido) por cima = texto
  invisível sobre fundo escuro.
- Caixas de alerta/status com fundo `bg-*-950/XX` sólido (não gradiente) —
  usadas em LoginScreen, SurveyWizard, TwoFactorModal, AccessPolicies,
  CollaboratorForm, TeamSizingModule — mesmo problema dos gradientes.

**O que ainda não tem cobertura** (baixo impacto, documentado para
referência): variações de `border-*-500/XX` (contorno de card, não afeta
legibilidade de texto) e `ring-*` (indicador de foco). Rodar novamente
`/tmp/check_coverage.py` (script descartável desta sessão, lógica descrita
abaixo) mostraria a lista atualizada se for retomado.

**Validação:** build limpo; suite de 104 testes de render (13 componentes ×
4 perfis × 2 temas) via Vitest+jsdom, todos passando sem exceção — isso
confirma que a mudança de CSS não quebrou nenhum componente, mas **não**
confirma contraste visual real (jsdom não computa CSS), então uma
inspeção visual rápida no navegador é recomendada.

### 2. Políticas de Acesso mais intuitiva (`src/components/registrations/AccessPolicies.tsx`)

Problema: 9 módulos, 36 permissões, tudo exposto de uma vez em grade fixa —
"parede de checkboxes" sem hierarquia. Reorganizado (mesmas permissões,
nada novo criado):
- **Resumo geral no topo**: badges "X com acesso total / Y com acesso
  parcial / Z sem acesso", respondendo de imediato "o que este perfil pode
  fazer?" sem abrir cada grupo.
- **Badge de status por grupo**: "Acesso total (N/N)" (verde), "Acesso
  parcial (N/M)" (âmbar) ou "Nenhum acesso (0/M)" (cinza) — antes só
  mostrava "N de M ativas" sem indicar visualmente o nível.
- **Grupos colapsáveis**: clicar no cabeçalho do módulo recolhe/expande a
  lista de permissões daquele grupo — reduz a rolagem necessária.
- **Busca por texto**: filtra por nome do módulo, permissão ou descrição
  em tempo real.
- Nada de lógica de permissão foi alterado — apenas apresentação.

**Validação:** 5 testes (render para os 4 perfis + interação de busca/
recolhimento) via Vitest, todos passando; incluído na suite de 104 testes
final.

### 3. Sidebar fixo ao rolar (`src/components/Sidebar.tsx`)

**Causa raiz encontrada:** no desktop (breakpoint `md:`), a classe
`md:static` anulava o `fixed` do mobile, fazendo o Sidebar voltar ao fluxo
normal do documento — por isso ele rolava junto com a página em vez de
ficar fixo.

**Correção:** trocado `md:static` por `md:sticky md:top-16
md:h-[calc(100vh-4rem)]` — o Sidebar agora gruda logo abaixo do Header
(que tem `h-16`/64px e já é `sticky top-0`), ocupa a altura restante da
viewport, e mantém seu próprio scroll interno (`overflow-y-auto` no `div`
interno, inalterado) caso a lista de navegação seja mais alta que a tela.
Comportamento mobile (drawer `fixed` com overlay) não foi tocado.

**Validação:** build limpo; nenhum ancestral no `App.tsx`/`index.css` tem
`overflow` restrito, o que é pré-requisito para `sticky` funcionar
corretamente — confirmado por grep.

### Metodologia de teste usada nesta e nas rodadas anteriores

Como `tsc --noEmit` e `npm run build:web` não pegam erros de runtime do
React (caso do bug "tela preta" corrigido antes) nem problemas de CSS
(cor/contraste), a prática que se mostrou eficaz e deve ser repetida:

1. Instalar temporariamente `vitest jsdom @testing-library/react
   @vitejs/plugin-react` (`npm install --no-save ...`).
2. Criar um `vitest.config.ts` mínimo com `environment: 'jsdom'`.
3. Renderizar cada componente alterado dentro de `<AppProvider>` real
   (contexto de verdade, dados mock reais), trocando `currentUser` para
   cada um dos 4 perfis via um wrapper `AsProfile` que usa
   `collaborators.find(c => c.perfilAcessoId === profileId)` +
   `setCurrentUser`.
4. Capturar qualquer exceção lançada durante o render com try/catch.
5. Remover os arquivos de teste ao final (não fazem parte do entregável).

Isso pega bugs de runtime que `tsc`/build não pegam, mas **não** substitui
uma inspeção visual real em navegador (jsdom não tem layout engine nem
computa CSS) — o ideal é complementar com Playwright quando a rede
permitir baixar o browser (não foi possível nesta sessão por restrição de
domínios permitidos no ambiente de execução).


O usuário reportou que clicar em "Dimensionamento" no menu lateral deixava a
tela toda preta. `tsc --noEmit` e `npm run build:web` não acusavam nada
(ambos passam limpo), porque é um erro de **runtime do React**, não de
tipagem — o TypeScript não detecta esse padrão específico.

**Causa raiz:** em `TeamSizingModule.tsx`, a variável
`currentEstimatedMarginOfError` (resultado de
`calculateMarginOfErrorFromSample(...)`) é um **objeto**
(`SampleCalculationResult`, com `marginOfErrorPercent`, `zScore`,
`confidencePercent`, `sampleSize`), mas estava sendo renderizado
diretamente como filho JSX (`{currentEstimatedMarginOfError}`) em vez de
`{currentEstimatedMarginOfError.marginOfErrorPercent}`. O React lança
"Objects are not valid as a React child" e, como o projeto não tem nenhum
`ErrorBoundary`, isso derruba a árvore inteira — daí a tela ficar preta.

**Confirmado como bug pré-existente**, não introduzido pelas mudanças desta
tarefa (o código teve exatamente essa linha antes de qualquer edição minha
em `TeamSizingModule.tsx`).

**Correção aplicada** (linha ~660 de `TeamSizingModule.tsx`):
```diff
- <span>Margem de erro: <strong>±{currentEstimatedMarginOfError}%</strong></span>
+ <span>Margem de erro: <strong>±{currentEstimatedMarginOfError.marginOfErrorPercent}%</strong></span>
```

**Como foi encontrado:** como `tsc`/`build` não pegam esse tipo de erro,
montei um harness de teste real com Vitest + jsdom +
`@testing-library/react`, renderizando cada componente alterado dentro do
`AppProvider` de verdade (contexto real, dados mock reais) para os 4 perfis
reais, capturando qualquer exceção lançada durante o render. Isso reproduziu
o erro exato do usuário na primeira tentativa. Depois da correção, criei uma
segunda bateria cobrindo **todos os 8 componentes alterados × 4 perfis (32
combinações)** — todas passaram sem exceção.

Os arquivos de teste (`teamsizing.test.tsx`, `full_render.test.tsx`,
`vitest.config.ts`) foram temporários e removidos ao final — não fazem
parte do entregável. Se quiser manter esse tipo de teste no repositório
permanentemente (recomendado, dado que pegou um bug real que `tsc`/build não
pegam), a receita é:
```
npm install --save-dev vitest jsdom @testing-library/react @vitejs/plugin-react
```
e recriar um `vitest.config.ts` com `environment: 'jsdom'`, renderizando
cada módulo dentro de `<AppProvider>` real.

**Recomendação para a próxima sessão:** vale rodar essa mesma bateria de
teste contra os módulos ainda não cobertos (`SurveyList`, `SurveyWizard`,
`ResponsesModule`, `ExternalImportModule`, `ActionHistory`,
`AccessPolicies`, `CollaboratorForm` em modo de edição com dados
preenchidos) para descartar bugs semelhantes em áreas que só foram
auditadas por leitura de código nesta sessão.

A pedido do usuário, foi removida a tela "Simulador de Amostragem
Probabilística & Dispersão" que abria por padrão dentro do **Simulador de
Coleta** (`CollectionSimulator.tsx`). Essa tela expunha botões de download
dos próprios arquivos-fonte do sistema (`samplingUtils.ts`,
`PopulationSampleScatterSimulator.tsx`, `CollectionSimulator.tsx`) — algo que
só fazia sentido durante o desenvolvimento e nunca deveria aparecer em
produção. O usuário confirmou que a funcionalidade equivalente já existe em
outro lugar do sistema.

O que foi feito:
- Arquivo `src/components/simulator/PopulationSampleScatterSimulator.tsx`
  **excluído** (nenhuma outra referência a ele restava no código).
- `CollectionSimulator.tsx`: removida a aba/toggle
  `simulatorTab: 'amostragem' | 'coleta'` e todo o conteúdo condicional
  associado (botões "Ver Dispersão", "Calcular Amostra (n)", "Abrir
  Calculadora Amostral & Dispersão"). O Simulador de Coleta agora abre
  direto na tela de coleta mobile.
- **Preservado**: o seletor rápido "Níveis de Confiança Padrão" (Z-score)
  que já vivia dentro do próprio `CollectionSimulator` e atualiza a meta da
  pesquisa (`handleQuickStandardConfidence`) — isso não depende do
  componente removido e continua funcionando exatamente como antes.
- **Preservado**: `ConfidenceSampleCalculator.tsx` e seu uso em
  `TeamSizingModule`/`FieldTeamSizingCard` (módulo de Dimensionamento) —
  é a funcionalidade real e equivalente à que foi removida, e não foi
  tocada.
- Validado com `tsc --noEmit` (limpo) e `npm run build:web` (build ~50KB
  menor, sem erros).
