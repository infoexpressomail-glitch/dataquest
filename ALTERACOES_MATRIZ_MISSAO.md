# DataQuest — Remodelagem: Matriz de Políticas + Modo Missão + Paleta clara

Este pacote fecha as decisões aprovadas no documento de decisão da remodelagem:

| Decisão | Status neste pacote |
|---|---|
| **X1 · Navegação A (Áreas + busca Ctrl K)** | Já implementada no pacote anterior (`AreaNav`, `GlobalSearch`, `navAreas`) — preservada sem alterações. |
| **X2 · Políticas de acesso em matriz perfil × módulo** | **Implementada agora** (`AccessPoliciesMatrix`). |
| **X3 · App de campo em “modo missão”** | **Implementado agora** (`FieldMission` + navegação de 3 abas). |
| **Paleta clara** (branco predominante + azul de marca `#2b66b0`) | **Refinada agora**: cabeçalho, hero e status do app de campo passaram a acompanhar o tema (branco no claro). |
| **Fundação F1 (segurança)** | Já implementada no pacote anterior (`ALTERACOES_F1_SEGURANCA.md`) — preservada. |

> Regra mantida em toda a tarefa: **nenhuma funcionalidade nova, nenhuma alteração de
> banco/API/autenticação/regra de negócio** — apenas reorganização de UX/UI e cores,
> preservando permissões, dados e IDs internos.

---

## 1 · X2 — Matriz de Políticas de Acesso (perfil × módulo)

### O problema
A tela de Políticas expunha **132 interruptores** (33 permissões × 4 perfis), um perfil
por vez, sem permitir comparar perfis. Era uma “parede de checkboxes”.

### A solução
Uma **matriz 9 linhas × 4 colunas**. Cada linha é um módulo e cada coluna um perfil.
Cada célula resume um **nível cumulativo** das permissões reais:

`Sem acesso → Ver → Operacional / Importar → Gestão → Total`

Clicar na célula abre o menu de níveis. A coluna mostra **quantas pessoas** cada
mudança afeta e o total `N/33`. Casos fora do padrão aparecem como **“+N”**.

### Arquivos
- **Novo:** `src/components/registrations/policiesMatrix.ts`
  - Define os 9 módulos e seus níveis cumulativos, mapeando **exatamente as 33
    permissões reais** de `AccessPolicyPermissions`.
  - Funções: `getModuleLevelState`, `applyLevelToPermissions`,
    `countActivePermissions`, `diffPermissions`.
- **Novo:** `src/components/registrations/AccessPoliciesMatrix.tsx`
  - A matriz em si, com menu de níveis por célula, ações por coluna
    (“Restaurar modelo padrão” e “Remover acesso a todos os módulos”), resumo de
    alterações e salvamento em lote via `updateProfile` (que já grava a trilha de
    auditoria e preserva a proteção do administrador).
- **Alterado:** `src/components/registrations/AccessPolicies.tsx`
  - Passou a abrir na **matriz** por padrão, com botão para a **lista detalhada das
    33 permissões** (a visão antiga continua existindo e intacta).

### Garantia de equivalência (verificada)
A matriz reproduz **exatamente** os 4 perfis padrão:

| Módulo | Administrador | Coordenador | Pesquisador | Analista |
|---|---|---|---|---|
| Início | Total | Total | Ver | Total |
| Colaboradores | Total | Cadastrar e editar | Sem acesso | Sem acesso |
| Pesquisas | Total | Gestão | Ver | Consulta ampliada **+1** |
| Respostas | Total | Ver | Sem acesso | Ver |
| Análise | Total | Ver | Sem acesso | Ver |
| Metas | Total | Total | Ver | Ver |
| Importação | Total | Importar | Sem acesso | Importar |
| Relatórios | Total | Total | Sem acesso | Total |
| Políticas de acesso | Total | Sem acesso | Sem acesso | Sem acesso |

O único caso não linear (“+1” do Analista em Pesquisas, que também tem
“Acessa todas sem necessidade de estar associado”) é sinalizado na célula.

### Proteções preservadas
- O administrador **não consegue** remover “Políticas de acesso” do próprio perfil.
- Salvar continua passando por `updateProfile`, que registra
  `ALTERACAO_POLITICA_ACESSO` no Histórico de Ações.

---

## 2 · X3 — App de campo em “modo missão”

### O problema
A tela inicial do campo era uma grade de ações administrativas (Pesquisas,
Carregar, Descarregar, Atualizar Meta) e a sincronização era uma das **4 abas**.
O pesquisador em pé, no sol, com uma mão, não tinha uma ação principal clara.

### A solução
A tela **“Hoje”** responde “o que eu faço agora?”:
- **Meta do dia e progresso** da pesquisa em foco (`N hoje`, `X de Y na meta`).
- **O que falta por cota** — chips como `Faltam 3 · Mulheres · 18 a 25 anos`.
- **Botão grande “Nova entrevista”**, alcançável com o polegar.
- **Sincronização discreta**: uma faixa com “N coleta(s) no aparelho”,
  “Envio automático ligado” e **Enviar agora**.
- **Offline explicado em linguagem simples** (“pode continuar entrevistando…”).

A navegação inferior cai de **4 para 3 abas**: `Hoje · Coletas · Perfil`. A
sincronização deixa de ser aba e continua acessível pelo ícone do cabeçalho e pela
faixa de envio.

### Arquivos
- **Novo:** `src/field/FieldMission.tsx`
  - Usa dados **reais** do pesquisador: `submissions` do `AppContext` e
    `calculateResearcherIndividualProgress` para as cotas. Não inventa metas.
- **Alterado:** `src/field/FieldBottomNav.tsx` — 3 abas; badge de pendências foi
  para “Hoje”. O destino `sync` continua existindo (aberto contextualmente).
- **Alterado:** `src/field/FieldWorkspace.tsx` — a aba `home` passou a renderizar
  `FieldMission`. Login, coleta, histórico, perfil, fila offline, IndexedDB, GPS,
  áudio e sincronização **não foram tocados**.
- **Alterado:** `src/field/fieldMobile.css` — estilos do modo missão.

### Envio automático
O envio automático ao voltar a conexão **já existe** no `AppContext`
(`forceSyncPendingWithSupabase` + `syncOfflineQueue` no evento de reconexão). O
modo missão apenas o torna visível (“Envio automático ligado”).

---

## 3 · Paleta clara (branco + azul `#2b66b0`)

- O sistema **já estava migrado para tokens semânticos** (`bg-surface`, `text-primary`,
  `accent-*`) e o **tema claro já era o padrão** para quem nunca escolheu tema.
- **Refinamento deste pacote:** o app de campo ainda usava um cabeçalho/hero com
  gradiente azul-escuro fixo, em qualquer tema. Foram criados tokens
  (`--field-header-*`, `--field-hero-*`, `--field-status-*`) em `src/index.css`, e o
  `fieldMobile.css` passou a consumi-los:
  - **Tema claro:** cabeçalho e hero **brancos**, com toques suaves em azul
    (`#eef4fb` / `#dbe7f6`) e texto escuro legível.
  - **Tema escuro:** mantém o azul institucional sólido.
- Contraste no claro (medido sobre `#ffffff`): primário `#2b66b0` 5,78:1;
  sucesso `#047857` 5,48:1; aviso `#b45309` 5,02:1; perigo `#b91c1c` 6,47:1.

---

## 4 · Arquivos do pacote

```
NOVOS
  src/components/registrations/policiesMatrix.ts
  src/components/registrations/AccessPoliciesMatrix.tsx
  src/field/FieldMission.tsx
  ALTERACOES_MATRIZ_MISSAO.md              (este documento)

ALTERADOS
  src/components/registrations/AccessPolicies.tsx
  src/field/FieldBottomNav.tsx
  src/field/FieldWorkspace.tsx
  src/field/fieldMobile.css
  src/index.css
```

---

## 5 · Validação executada

```bash
npm install
npm run typecheck   # tsc --noEmit  → 0 erros
npm run build:web   # vite build    → concluído
```

Além disso, foi montado um harness temporário com **Vitest + jsdom +
@testing-library/react** renderizando a matriz para os **4 perfis reais** e o modo
missão (online e offline) dentro do `AppProvider` real — **7/7 testes passando**,
incluindo a interação de trocar o nível de uma célula e ver o “Salvar Matriz”
aparecer. Os arquivos de teste foram removidos (não fazem parte do entregável).

> Limitação: o ambiente não tem navegador para inspeção visual real. A conferência
> de contraste/layout deve ser feita por você ao subir o app (ver checklist abaixo).

### Checklist rápido no navegador
1. `npm run dev` e abrir como **Administrador** → Administrar → Políticas de acesso:
   a matriz deve abrir com 9 linhas × 4 colunas e “Sem acesso/Ver/…/Total”.
2. Clicar numa célula, trocar o nível e conferir “Salvar Matriz (N)”. Trocar o
   Administrador para “Sem acesso” em *Políticas de acesso* deve ser **bloqueado**.
3. Alternar para **Analista** e confirmar a célula *Pesquisas = Consulta ampliada +1*.
4. Abrir o **Modo Pesquisador** (`/campo`), logar e ver a tela **Hoje** com meta,
   cotas faltantes e “Nova entrevista”; conferir as **3 abas**.
5. Simular offline e confirmar o aviso em linguagem simples; voltar online e ver a
   faixa “Envio automático ligado”.

---

## 6 · Fora de escopo (continua pendente, por decisão)

- **F2** — fonte única de dados no Supabase.
- **F3** — dividir o `AppContext` (2.636 linhas).
- **F4** — testes automatizados permanentes nos fluxos críticos.
- **F5** — carregar módulos sob demanda (code-splitting).
- **F6** — tokens visuais únicos formais (hoje já há tokens semânticos compartilhados).
