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

Seguir a ordem do prompt mestre a partir daqui:

### A. `ExternalImportModule.tsx` (§27 do prompt mestre)
- **Achado a investigar primeiro:** o componente usa
  `hasPermission('importacao_pesquisa_externa')` e
  `hasPermission('importacao_resposta_externa')` — essas duas chaves **não
  existem** em `AccessPolicyPermissions` (`src/types.ts`), que só define
  `importacao_importar_planilha`, `importacao_excluir` e `importacao_acesso`.
  - Isso é um bug pré-existente de tipagem/regra de negócio, **fora do
    escopo desta tarefa de UX** (o prompt mestre proíbe alterar regras de
    permissão). Estranhamente `tsc --noEmit` não acusa erro nisso — vale
    entender por que antes de decidir o que fazer.
  - **Não corrigir sem autorização explícita do usuário.** Se for
    mencionar, expor como observação separada no relatório final, não como
    mudança já feita.
- Reorganizar visualmente em: Arquivo → Mapeamento → Processamento →
  Resultado, **somente se** essas etapas já estiverem representadas no fluxo
  atual (não inventar um novo fluxo de importação).

### B. `ActionHistory.tsx` — Auditoria (§28 do prompt mestre)
- Ainda não auditado nesta sessão (arquivo tem ~700 linhas).
- Organizar: data, usuário, ação, registro, informações existentes.
- Não alterar o mecanismo de auditoria, não remover informações, não
  inventar novos eventos.
- Verificar se há algum gate de permissão faltando (mesmo padrão do que foi
  encontrado no TeamSizingModule) — por exemplo, se qualquer perfil consegue
  ver/exportar auditoria sem checagem adequada.

### C. Ainda não revisados nesta rodada (auditoria + reorganização pendente)
- `SurveyList.tsx` (§21 — filtros existentes, sem inventar novos)
- `SurveyWizard.tsx` (§22 — não recriar o wizard, só hierarquia/espaçamento)
- `ResponsesModule.tsx` (§23 — orientado à consulta, sem novos recursos de
  edição)
- `CollectionSimulator.tsx` (§29 — só navegação/apresentação)
- `AccessPolicies.tsx` — **já revisado e considerado adequado** ao prompt
  (grupos por módulo, "Marcar todos"/"Desmarcar todos", em PT-BR); não
  precisou de mudança.
- `Header.tsx` — revisado superficialmente, parece adequado; não houve
  necessidade de alteração até agora.

### D. Revisão transversal (fases finais do prompt mestre, §58-§60)
- Teste de perfis: simular cada um dos 4 perfis reais
  (`prof_admin`, `prof_coord`, `prof_pesq`, `prof_analista`) e confirmar
  que Sidebar/Dashboard/módulos aparecem corretamente para cada um.
- Teste do pesquisador: login, ambiente do pesquisador, pesquisas
  vinculadas, coleta, metas, histórico, offline, sincronização, GPS, áudio —
  nada disso foi tocado nesta tarefa, mas vale confirmar que a reorganização
  visual não quebrou nenhum fluxo.
- Teste mobile: viewport pequeno, sem overflow horizontal.
- Build final: `npx tsc --noEmit` + `npm run build:web` novamente depois de
  todas as mudanças pendentes.

### E. Relatório final (§70 do prompt mestre)
Ao concluir os itens pendentes, montar o relatório final cobrindo:
Navegação, Perfis, Dashboard, Mobile, Idioma, Permissões, Segurança,
Funcionalidades (confirmar nada removido), Infraestrutura (Supabase/Vercel/
API/PWA/sincronização preservados).

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
