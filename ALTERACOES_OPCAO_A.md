# DataQuest — Opção A + Paleta nova

Este pacote implementa, no código real, as duas decisões aprovadas:

1. **Navegação por 4 áreas + busca global (Ctrl K)** — Opção A.
2. **Paleta clara nova** (fundo branco + azul de marca `#2b66b0`), com tons
   semânticos recalculados e contraste ≥ 4,5:1.

A **fundação F1–F6 ficou de fora**, por decisão.

---

## 1. Navegação por áreas (Opção A)

### Arquivos novos
- `src/components/navigation/navAreas.ts`
  - Define as **áreas** e os **itens**, montados a partir das **permissões reais**
    (`hasPermission`). Nenhum perfil ganhou acesso novo.
  - Áreas da gestão: **Início · Planejar · Coletar · Analisar · Administrar**.
  - Portal do Pesquisador e Portal do Analista têm áreas próprias.
  - Exporta também `flattenAreas()` para a busca global.
- `src/components/navigation/AreaNav.tsx`
  - Substitui o `Sidebar` (lista longa) por um menu de **4 áreas em acordeão**.
  - Mantém o rodapé de perfil, logout e "Restaurar Demonstração".
  - Inclui o gatilho de busca ("Buscar… Ctrl K").
- `src/components/navigation/GlobalSearch.tsx`
  - Busca global em **Ctrl/Cmd + K**, com grupos **Telas · Pesquisas · Pessoas ·
    Ações rápidas**, navegação por teclado (↑ ↓ Enter Esc).
  - Selecionar uma **pesquisa** já aplica o filtro na tela de Pesquisas.

### Arquivos alterados
- `src/App.tsx`
  - `<Sidebar …>` → `<AreaNav …>`.
  - Adicionado `<GlobalSearch />` (o atalho Ctrl K é global).
  - As telas continuam sendo as mesmas — só o "casco" mudou.
- `src/components/Header.tsx`
  - Botão **Buscar (Ctrl K)** no cabeçalho.
  - Logo "Q" e avatares com gradiente iniciando no azul de marca
    (`from-brand-500` = `#2b66b0`).
- `src/components/Sidebar.tsx` — mantido no projeto (não é mais usado pelo `App`).

> O menu de gestão passa de **até 14 itens no mesmo nível** para **4 áreas**.

---

## 2. Paleta clara nova

- `src/index.css` — bloco `html.light, html:not(.dark)` atualizado.
  O **tema escuro (`:root`) não foi alterado**.

### Contraste (medido sobre `#ffffff`)

| Token | Valor | Contraste |
|---|---|---|
| `--accent-primary` | `#2b66b0` | 5,78:1 |
| `--accent-success` | `#047857` | 5,48:1 |
| `--accent-warning` | `#b45309` | 5,02:1 |
| `--accent-danger` | `#b91c1c` | 6,47:1 |
| `--accent-info` | `#0e7490` | 5,36:1 |
| `--accent-purple` | `#7e22ce` | 6,98:1 |

Os **sólidos** usam os mesmos valores, portanto o texto branco por cima também
passa de 4,5:1 (antes, por exemplo, branco sobre `#059669` dava 3,77:1).

Superfícies: `--surface-app: #f7f9fc`, `--surface: #ffffff`,
`--surface-hover: #eef3f9`, bordas claras (`--border: #cbd5e1`).

---

## Como rodar / validar

```bash
npm install
npm run dev        # desenvolvimento
npm run typecheck  # tsc --noEmit
npm run build:web  # build de produção
```

Validação feita neste pacote: `tsc --noEmit` sem erros e `vite build` concluído.
