# Auditoria da F3 (divisão do AppContext em domínios) — 23/09/2026

Comparei este zip contra o anterior (auditado ontem, com a remoção do
`diag-keys.ts` já aplicada — confirmei que ela se manteve). A única mudança
de fundo aqui é a F3: `AppContext.tsx` caiu de 2.963 para 141 linhas, dividido
em 5 domínios (`AuthDomain`, `SurveysDomain`, `ColetasDomain`,
`CadastrosDomain`, `AuditDomain`) que se comunicam por uma "ponte" — um objeto
mutável compartilhado, preenchido por um `useLayoutEffect` na raiz.

Esse tipo de refatoração é exatamente onde bugs sutis de sincronização
costumam se esconder: tudo parece certo lendo o código, mas só quebra em
runtime, numa ordem de execução específica. Por isso não confiei na leitura —
rodei o sistema de verdade.

## O que testei de ponta a ponta (não só lido, executado)

Usei o `AppContext` real dentro de um `AppProvider`, com um mock de rede fiel
ao formato exato de cada rota `/api` (copiei o formato de resposta direto dos
handlers) e dados verdadeiros do `mockData.ts`. 19 verificações, todas
passando:

- **A ponte funciona em runtime:** login como Administrador → hidratação do
  servidor → `AuthDomain` escreve corretamente em `collaborators`
  (`CadastrosDomain`) e `surveys` (`SurveysDomain`) através do objeto
  compartilhado. Essa era a dúvida mais importante da auditoria, porque a
  ponte só é populada depois da montagem — se a ordem dos efeitos estivesse
  errada, a primeira hidratação chegaria com a ponte vazia.
- **Matriz de Políticas, testada de novo neste código:** as 4 colunas, os 9
  módulos, e — o teste mais importante — cliquei para remover "Políticas de
  acesso" do próprio Administrador logado e o bloqueio de lock-out disparou
  corretamente. Isso depende de `updateProfile` (que hoje mora em
  `AuthDomain`) e do componente (que ainda usa `useApp()` sem migrar) agindo
  em conjunto — funciona.
- **Modo Missão, testado de novo:** pesquisador real (Rodrigo), pesquisa real
  com meta (`pesq_literarraial_2025`), saudação, nome da pesquisa e clique no
  botão "Nova entrevista" navegando para o id certo.
- **O cenário de maior risco da divisão inteira — salvar uma pesquisa
  OFFLINE:** essa gravação nasce em `SurveysDomain` mas precisa cair na fila
  de `ColetasDomain`, atravessando a ponte no sentido contrário do login.
  Simulei estado offline de verdade (`setSimulatedOffline(true)`), chamei
  `saveSurvey()` e confirmei que o item apareceu em `offlineQueue`, com o
  tipo e o título certos. Esse é o caminho que um pesquisador em campo sem
  sinal realmente usa — funciona.
- **As duas telas "migradas como exemplo"** (`TwoFactorModal.tsx` para
  `useAuth()`; `ActionHistory.tsx` para 4 hooks de domínio ao mesmo tempo):
  ambas renderizam sem exceção depois da migração.

## Números que confirmei, não só li no documento

- `tsc --noEmit`: **0 erros**, nos dois zips (antes e depois da F3).
- `npm run build:web`: passa nos dois, bundle final quase idêntico (2,36 MB
  → 2,37 MB — F5/code-splitting continua fora de escopo, como já estava).
- Lint global: **145 erros nos dois lados**, nenhum novo. A F3 introduziu
  só 4 avisos a mais (`any`/`console`), do mesmo tipo que já existia no
  arquivo monólito antes de ser dividido.
- Bundle final sem segredos (rechecei `SESSION_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY`, as senhas antigas e o `diag-keys.ts`).

## O que encontrei — e já corrigi neste pacote

Lendo `resetToDefaults()` linha por linha contra a versão anterior, percebi
que quatro chamadas do original sumiram: três delas (`setOfflineQueue([])`,
`setPendingIndexedDbCount(0)`, `setSupabaseSyncStatus('synced')`) foram
corretamente consolidadas dentro de `resetOfflineCacheState()` no
`ColetasDomain` — não é problema. A quarta, `clearCurrentSurveyDraftFromDB()`,
não estava em lugar nenhum.

Na prática: `resetOfflineCacheState()` zera o **estado React** do rascunho
(`setCurrentSurveyDraft(null)`), mas não apaga o **registro físico** salvo no
IndexedDB do navegador. O botão afetado é "Restaurar dados originais" (menu
lateral) — não é um fluxo do dia a dia, é usado em demonstração ou para
resetar o ambiente. O rascunho órfão fica invisível na tela (o estado React
foi zerado) e seria sobrescrito automaticamente pelo próximo rascunho salvo
(a chave no IndexedDB é fixa), então o impacto real é pequeno: nenhuma perda
de dado visível ao usuário, só um registro obsoleto ocupando espaço até ser
substituído.

Corrigi chamando `coletas.clearCurrentSurveyDraft()` — que já existia no
domínio e faz as duas coisas — em vez de só `resetOfflineCacheState()`.
Testei com um mock de IndexedDB fiel à implementação real: confirmei que o
rascunho de fato existe no banco depois de salvo, e que o fix realmente o
remove ao chamar "Restaurar dados originais".

## O que está neste pacote

Uma linha alterada em `src/context/AppContext.tsx` (mais um comentário
explicando o porquê). `tsc` e `build:web` revalidados depois do fix.

## O que fica para você decidir

Nada novo desta vez — os itens em aberto da auditoria anterior (o
`Sidebar.tsx` órfão, F5/code-splitting) continuam como estavam.
