# Auditoria do que já foi implementado — 23/09/2026

Verifiquei o zip mais recente (idêntico nas duas últimas mensagens) contra os
quatro documentos que vieram junto: `ALTERACOES_F1_SEGURANCA.md`,
`ALTERACOES_F2_FONTE_UNICA.md`, `ALTERACOES_OPCAO_A.md` e
`ALTERACOES_MATRIZ_MISSAO.md`. Não confiei nos resumos: reli o código-fonte,
rodei `tsc` e `build:web`, inspecionei o bundle final e testei os fluxos
críticos com o `AppContext` real (login → hidratação do servidor → telas),
usando dados verdadeiros do `mockData.ts`.

**Conclusão: os quatro itens foram implementados de verdade, com qualidade
alta.** Achei um problema de segurança (corrigido neste pacote) e duas notas
menores, sem risco, para você decidir.

## F1 — Fechar a porta (segurança)

- **Confirmado por leitura de código:** todas as rotas `/api` de dados
  (`surveys`, `submissions`, `collaborators`, `survey-assets`, `profiles`)
  exigem `requireSession`. `api/health.ts` é público por design.
- **Confirmado no bundle compilado**, não só no código-fonte: rodei
  `npm run build:web` e procurei por senhas antigas
  (`admin123`/`coord123`/etc.), pela flag antiga de sessão
  (`dataquest_auth_session`) e pelos segredos de servidor
  (`SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) no JavaScript final que vai
  para o navegador. Nenhum apareceu.
- **`api/_lib/session.ts` foi lido por completo:** usa HMAC-SHA256 de
  verdade, compara assinaturas com `timingSafeEqual` (evita timing attack),
  confere expiração, e o cookie é `HttpOnly` + `SameSite=Strict`. Implementação
  sólida.
- **Achado — corrigido neste pacote:** `api/diag-keys.ts` continuava no
  código, mesmo o documento dizendo que foi removido. Era o endpoint que eu
  mesmo tinha criado antes da F1, para diagnosticar um problema de chave já
  resolvido. Ele não exige sessão (ao contrário de todas as outras rotas) e
  não é importado por nada do sistema — sobrou por descuido. Ele não expõe a
  chave inteira, só o formato dela (`sb_secret_…` vs. `eyJ…`), mas isso já é
  informação demais para um visitante anônimo tentar mapear o sistema. Este
  pacote remove o arquivo.

## F2 — Fonte única de dados no Supabase

- Confirmado: `profiles`, `collaborators` e `surveys` no `AppContext` partem
  de `useState([])` e são preenchidos por `hydrateFromServer()`, que busca em
  `/api/profiles`, `/api/collaborators` e `/api/surveys` depois da sessão
  validada.
- Testei o fluxo completo com um mock de `fetch` fiel ao formato real de
  resposta de cada rota (li o `handler` de cada uma para replicar o formato
  exato) e dados verdadeiros do `mockData.ts`: login → hidratação →
  `ctx.profiles.length === 4`, `ctx.collaborators` e `ctx.surveys` populados
  corretamente.
- Um detalhe que vale saber: `GET /api/collaborators` exige a permissão
  `colaboradores_acesso` ou `colaboradores_editar`. O Pesquisador de Campo não
  tem nenhuma das duas, então recebe 403 nessa chamada durante a hidratação.
  Confirmei que isso é tratado sem quebrar nada — `hydrateFromServer` usa
  `Promise.allSettled`, então essa falha específica só significa que ele não
  recebe a lista de colaboradores (que ele não usa mesmo). Não é um bug.

## Opção A — Navegação por áreas + busca global

- A implementação entregue foi mais abrangente do que a minha: dá áreas
  próprias também para Pesquisador e Analista (eu tinha deixado só o
  Administrador/Coordenador com áreas, por decisão de escopo da sessão
  anterior). É uma escolha de design diferente, não um erro — e cobre mais
  casos.
- **Verificação mais importante que fiz:** como essa versão reconstrói a
  lista de módulos do zero (`navigation/navAreas.ts`), em vez de reaproveitar
  o `Sidebar.tsx` antigo, existia o risco de esquecer algum item que só
  estava no menu original. Comparei programaticamente os 15 módulos de cada
  lado — zero perdido, zero sobrando.
- A busca global nova (`navigation/GlobalSearch.tsx`) reaproveita a mesma
  função `buildNavAreas()` do menu para listar "Telas", o que é mais robusto
  que a minha versão anterior (eu tinha uma lista separada, com risco de a
  busca e o menu divergirem com o tempo).
- **Achado, sem risco — decisão sua:** o `src/components/Sidebar.tsx` antigo
  (que eu tinha editado numa sessão anterior) ficou no projeto, mas nada mais
  o importa — confirmei com uma busca em todo o `src/`. Não atrapalha nada,
  só ocupa espaço. Não removi porque pode ter sido deixado de propósito como
  referência.

## Matriz de Políticas + Modo Missão

- **Verificação matemática:** as 33 chaves de `AccessPolicyPermissions`
  aparecem exatamente 33 vezes na composição dos níveis da matriz — nenhuma
  faltando, nenhuma duplicada, nenhuma sobrando.
- **Rodei a lógica de verdade** (`getModuleLevelState`) contra os 4 perfis
  reais do `mockData.ts` e o resultado bateu célula por célula com a tabela
  do documento, incluindo o caso especial do Analista em Pesquisas
  ("Consulta ampliada +1").
- **Testei a interação real**, não só a leitura: abri a célula "Políticas de
  acesso" do próprio Administrador logado, cliquei em "Sem acesso", cliquei
  em Salvar, e confirmei que o sistema bloqueia com a mensagem correta — a
  proteção contra lock-out funciona de ponta a ponta.
- **Modo Missão testado com dados reais:** usei o pesquisador Rodrigo e a
  pesquisa real `pesq_literarraial_2025` (que tem meta global cadastrada no
  mock). A saudação, o nome da pesquisa, a contagem de pendências e o botão
  "Nova entrevista" (que precisa navegar para o id certo da pesquisa) — tudo
  funcionou.

## O que está neste pacote

Só uma mudança: remoção de `api/diag-keys.ts`. Rodei `tsc --noEmit` e
`npm run build:web` depois da remoção — ambos passam, e confirmei de novo que
o bundle final não tem segredos.

## O que fica para você decidir

- Remover ou manter o `src/components/Sidebar.tsx` órfão (não incluí essa
  remoção neste pacote — é sua chamada).
- F5 (carregar por módulo) continua fora de escopo, como já estava. O aviso
  de build "chunks maiores que 500 kB" persiste — o bundle principal
  compilado tem 2,36 MB (651 kB comprimido).
