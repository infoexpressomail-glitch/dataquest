# Remoção do Sidebar.tsx órfão — 24/09/2026

## O que foi feito

Removido `src/components/Sidebar.tsx` (601 linhas), o menu lateral antigo,
substituído pela navegação por áreas (`src/components/navigation/AreaNav.tsx`)
desde a Opção A.

## Como confirmei que era seguro remover

Não bastava um `grep` simples — já tinha achado antes 7 falsos positivos
(variáveis como `mobileSidebarOpen`, o componente diferente `FieldSidebar.tsx`
do app de campo, um rótulo de tema chamado "Sidebar"). Desta vez:

1. **Busca ampla e depois cada resultado lido individualmente**, não só a
   contagem: nenhum dos 6 arquivos que mencionam "Sidebar" de alguma forma
   importa `components/Sidebar.tsx`.
2. **`tsc --noEmit` antes e depois:** 0 erros nos dois casos — nada dependia
   dele nos tipos.
3. **`npm run build:web` antes e depois:** o bundle final ficou **exatamente
   do mesmo tamanho** (2.371.671 bytes) — prova de que o bundler já excluía
   esse arquivo do pacote final por ele não fazer parte do grafo de
   dependências real. A remoção não muda o que chega ao navegador, só limpa
   o repositório.
4. **Rodei o `App.tsx` completo, de verdade, com login pela UI** (preenchi os
   campos de login e senha como um usuário faria, cliquei em Entrar) — não só
   testei o componente isolado. O painel de gestão inteiro monta, com a
   navegação por Áreas (Planejar/Coletar/Analisar/Administrar) e a busca
   global funcionando.

## Efeito colateral bom, não planejado

O lint global caiu de 145 para **143 erros**. Os 2 erros de acessibilidade
que eu tinha identificado como pré-existentes (`jsx-a11y/click-events-have-
key-events` no backdrop do menu mobile, linha 603) saíam junto — eles só
existiam naquele arquivo morto.

## Números finais

| | Antes | Depois |
|---|---|---|
| `tsc --noEmit` | 0 erros | 0 erros |
| `npm run build:web` | passa, 2.371.671 bytes | passa, 2.371.671 bytes |
| Lint global | 145 erros / 242 avisos | 143 erros / 242 avisos |
| App real (login pela UI) | — | monta corretamente |

## O que fica para você decidir

F5 (dividir o bundle por módulo, code-splitting) continua fora de escopo,
como já estava — é o único item pendente das auditorias anteriores.
