# DataQuest — F3 (Divisão do AppContext em domínios)

Implementação da **F3 — Dividir o AppContext em domínios**. As demais fundações
(F4–F6) continuam fora de escopo.

> **Resumo:** o arquivo `AppContext.tsx` tinha **2.963 linhas** e um único estado
> que todas as telas consumiam. Ele foi dividido em **cinco domínios**, cada um
> dono do seu próprio estado e da sua lógica, e o `useApp()` continua devolvendo
> a API completa — **nenhuma tela precisou mudar para continuar funcionando**.

---

## Como ficou a arquitetura

| Domínio | Hook para consumir | Arquivo | Dono do estado |
|---|---|---|---|
| Autenticação e permissões | `useAuth()` | `src/context/domains/AuthDomain.tsx` | sessão, usuário, perfis/políticas, 2FA, idioma/tema, módulo ativo |
| Cadastros | `useCadastros()` | `src/context/domains/CadastrosDomain.tsx` | colaboradores, quota de licenças |
| Coletas e sincronização | `useColetas()` | `src/context/domains/ColetasDomain.tsx` | entrevistas, importações, fila offline, cache IndexedDB, conexão, progresso de sync |
| Pesquisas | `useSurveys()` | `src/context/domains/SurveysDomain.tsx` | pesquisas, metas base, relatórios, pesquisa em edição/filtro |
| Auditoria | `useAuditoria()` | `src/context/domains/AuditDomain.tsx` | trilha de auditoria, conexões recentes |

O `src/context/AppContext.tsx` passou de 2.963 para **123 linhas**: virou apenas a
composição dos cinco domínios, a fiação da ponte e a montagem do valor agregado.

### Por que uma “ponte” entre domínios?
Pesquisas, Coletas e Cadastros se referenciam mutuamente (ex.: `addSubmission`
atualiza as metas da pesquisa; a sincronização atualiza a lista de pesquisas; o
cadastro de pesquisador atualiza `pesquisadoresIds`). Em vez de importar um
domínio no outro (import circular), a raiz monta uma **ponte explícita**
(`src/context/domains/bridge.ts`) com as poucas funções que cruzam domínios. Cada
domínio só **lê** a ponte, dentro dos seus callbacks; **a raiz é a única que
escreve**, num `useLayoutEffect` (que roda antes dos efeitos passivos dos
domínios). Isso mantém o render puro e satisfaz as regras do React Compiler.

### Compatibilidade
`useApp()` devolve `AppContextType` = união dos cinco domínios + `resetToDefaults`.
Todas as 43 telas que usavam `useApp()` continuam iguais e tipadas — o typecheck
confirma que nenhum campo foi perdido. Duas telas já foram migradas como exemplo
do novo padrão (`TwoFactorModal` → `useAuth`; `ActionHistory` → `useAuditoria`,
`useSurveys`, `useCadastros`, `useAuth`). A migração das demais é incremental e
opcional: basta trocar `useApp()` pelo(s) hook(s) do domínio usado.

---

## Arquivos
- **Novos:**
  - `src/context/domains/types.ts` — contratos das fatias e da ponte.
  - `src/context/domains/bridge.ts` — singleton da ponte entre domínios.
  - `src/context/domains/AuditDomain.tsx`
  - `src/context/domains/AuthDomain.tsx`
  - `src/context/domains/CadastrosDomain.tsx`
  - `src/context/domains/ColetasDomain.tsx`
  - `src/context/domains/SurveysDomain.tsx`
- **Reescrito:** `src/context/AppContext.tsx` (agora composição + `useApp`).
- **Migrados (exemplo):** `src/components/auth/TwoFactorModal.tsx`,
  `src/components/audit/ActionHistory.tsx`.

## Preservado da F1/F2
- Nenhum estado de perfis, colaboradores ou pesquisas é gravado em `localStorage`
  (fonte única no Supabase). O cache offline de campo segue no IndexedDB.
- Sessão validada no servidor, filtro de permissões, trilha de auditoria com hash,
  sincronização prévia/upload, fila offline e reconexão automática — tudo intacto.

## Validação
- `npm run typecheck` (`tsc --noEmit`) → **0 erros**
- `npm run build` (frontend + servidor) → **concluído**
- `npx eslint src/context/domains src/context/AppContext.tsx` → **0 erros**
  (apenas avisos de `console` pré-existentes)
- As telas continuam compilando contra `AppContextType` sem alteração — prova de
  que a API de contexto permaneceu compatível.

## Observações
- A aplicação tem um único `AppProvider` (ver `src/main.tsx`); por isso a ponte é
  um singleton de módulo. Se um dia houver múltiplos providers simultâneos, a
  ponte deve virar um `WeakMap` por instância.
- O lint global do repositório já tinha erros pré-existentes (imports não usados,
  `Date.now()` no render, acessibilidade) que **não** foram introduzidos pela F3.
- F4: testes automatizados dos fluxos críticos.
- F5: carregar por módulo (code splitting).
- F6: tokens visuais únicos (gestão + campo).
