# Modo Totem (tablet em quiosque) — DataQuest

Alternativa de uso **desassistido** da pesquisa: um tablet fica exposto ao público
(em um totem, balcão, recepção etc.) e a pesquisa roda **do início ao fim sozinha**.
Não exige operador para cada entrevista.

## Como acessar

| Forma | URL |
| --- | --- |
| Rota curta (recomendada) | `/totem` |
| Rota por hash | `/#app-totem` |
| Apontando uma pesquisa | `/totem?pesquisa=<CODIGO>` |

O link pode ser copiado na etapa **Wizard → Aparência da Pesquisa → Totem**
(botão “Copiar link”).

## Comportamento automático

1. **Abertura (atração):** o tablet mostra capa, logo, instituição, título e um
   botão grande “Toque para começar”. Opcionalmente inicia sozinho após N segundos.
2. **Avanço automático:** ao escolher uma alternativa (múltipla escolha, sim/não,
   NPS, escala visual/smiles), o sistema **passa para a próxima pergunta
   automaticamente**, com um pequeno atraso configurável para feedback visual.
   Perguntas de **texto**, **data/hora**, **múltipla seleção** e perguntas **com
   comentário** exigem o toque em “Próxima” (não dá para automatizar a digitação).
3. **Botão Voltar:** presente em **todas** as questões. Na primeira questão ele
   retorna à tela de atração (permite desistir).
4. **Confirmação final:** ao terminar, aparece o diálogo
   **“Deseja finalizar o formulário e enviar?”** com as opções
   **Sim, finalizar e enviar** e **Não, revisar respostas**.
5. **Agradecimento e reinício:** após o envio, mostra a tela de agradecimento e
   volta sozinho para a atração (pronto para o próximo respondente).
6. **Inatividade:** se ninguém interagir por N segundos, a coleta em andamento é
   descartada e o totem volta à atração (evita coletas pela metade).

## Configuração (por pesquisa)

Em **Wizard → Aparência da Pesquisa**, escolha o modelo **Totem (tablet em quiosque)**.
As opções ficam em “Comportamento do Totem”:

| Campo | Padrão | Descrição |
| --- | --- | --- |
| Iniciar sozinho (sem toque) | desligado | Inicia a pesquisa automaticamente. |
| Segundos de atração antes de iniciar | 5 | Contagem na tela de atração quando o início automático está ligado. |
| Atraso ao avançar (ms) | 420 | Tempo entre escolher a alternativa e mudar de questão. |
| Inatividade até reiniciar (s) | 150 | Volta à atração após esse tempo sem interação (0 desativa). |
| Tempo de agradecimento (s) | 8 | Tempo na tela final antes de reiniciar. |
| Confirmar antes de enviar | ligado | Exibe a pergunta “Deseja finalizar o formulário e enviar?”. |
| Botão Voltar em todas as questões | ligado | Mantém o botão Voltar visível. |
| Entrar em tela cheia ao iniciar | ligado | Ao tocar em “Toque para começar”, entra em tela cheia (esconde as barras do navegador). O navegador só permite tela cheia após um toque. |

## Sessão e dados

- O totem reaproveita a **sessão do Modo Pesquisador** (mesmo login de campo). Ao
  abrir `/totem` sem sessão, ele mostra o login do pesquisador; depois disso o
  tablet entra direto no quiosque.
- **Persistência da sessão no tablet:** por padrão o totem guarda a sessão do
  pesquisador em **`localStorage`**, então o tablet **não pede login depois de
  reiniciar** (o tablet fica ligado no quiosque). A senha nunca é gravada — só
  colaborador, perfil e pesquisas liberadas.
- **Como desativar a persistência** (a sessão passa a durar só a aba):
  - botão **“Login do tablet”** no canto do quiosque — liga/desliga na hora; ou
  - abrir o totem com **`?sessao=temporaria`** (aceita também `?sessao=local`
    para forçar ligado). O parâmetro define a preferência do aparelho uma vez e
    depois o botão do operador manda.
- O envio usa **o mesmo pipeline do sistema** (`AppContext.addSubmission`), com
  gravação automática em IndexedDB quando estiver offline.
- A escolha da pesquisa segue esta ordem: `?pesquisa=CODIGO` → pesquisa marcada
  como `TOTEM` → primeira pesquisa ativa vinculada ao login.

## Barra do operador oculta (sem barras na tela)

No totem **não aparecem barras de título, de status nem a barra do operador**: o
respondente vê apenas a pesquisa — e, na primeira vez, apenas a **tela de login
do pesquisador**. Os controles do operador (relatório, login do tablet, trocar
pesquisa, atualizar, sair e tela cheia) ficam **ocultos por padrão** e só
aparecem quando o operador chama o atalho.

### Como revelar a barra do operador

| Forma | Como fazer |
| --- | --- |
| **Toque (tablet)** | Toque **5x rápido** no **canto superior direito** (janela de 2,5s). |
| **Toque longo (tablet)** | Pressione e segure o **canto superior direito** por **2,5s**. |
| **Teclado físico** | **`Ctrl + Shift + O`** (O de Operador) abre e fecha. |
| **URL (configuração)** | Abra `/totem?operador=1` — a barra já inicia aberta. |

A barra **se fecha sozinha após 30s** sem interação. Também fecha na hora com
**`Esc`** ou com o botão **“Ocultar”** do próprio painel.

> O ponto sensível é invisível: fica em um quadrado de 96×96 px no canto
> superior direito e não interfere nos toques do respondente.

### Ocultar as barras do navegador (título/status)

Para o totem rodar realmente “sem barras” do sistema operacional/navegador:

1. Entre em **tela cheia** pelo botão do painel do operador (atalho acima) — em
   muitos teclados físicos, `F11` também funciona; ou
2. Instale o sistema como **PWA** (“Adicionar à tela inicial” no Android/iOS): no
   modo standalone o navegador não mostra barra de endereço nem status; ou
3. Configure o tablet em **modo quiosque** (Android: *Fixação de tela*;
   iPad: *Acesso Guiado*, em Ajustes → Acessibilidade).

O login do tablet continua persistido em `localStorage` (opção **“Login do
tablet”** no painel do operador), então o totem não pede login novamente depois
de reiniciar.

## Relatório de coletas do Totem

O botão **“Relatório”** no canto do quiosque abre um painel do operador com os
números de coleta do tablet, por pesquisa:

| Indicador | Como é calculado |
| --- | --- |
| Coletas concluídas | sessões que chegaram ao envio e à tela de agradecimento |
| Iniciadas | sessões iniciadas em “Toque para começar” |
| **Taxa de conclusão** | concluídas ÷ iniciadas |
| **Tempo médio de resposta** | média do tempo (início → envio) das coletas concluídas |
| Mediana / mais rápida / mais lenta | distribuição do tempo das coletas concluídas |
| Última atividade | carimbo da última sessão encerrada da pesquisa |

- Uma sessão é contada como **abandonada** quando o respondente volta à atração
  (inatividade, botão Voltar na 1ª questão), quando o operador troca de pesquisa
  ou quando o tablet é recarregado no meio de uma coleta.
- O histórico fica **no próprio tablet** (`localStorage`), funciona **offline** e
  tem os botões **Atualizar**, **Exportar CSV** e **Limpar histórico**.
- Os dados são por aparelho: cada totem tem o seu próprio relatório.

## Arquivos principais

- `src/totem/totemRoute.ts` — rota `/totem`, link e leitura de `?pesquisa=`.
- `src/totem/totemSessionStore.ts` — sessão do totem em `localStorage` + opção
  de desativar (`?sessao=` e preferência do aparelho).
- `src/totem/totemStatsStore.ts` — log de sessões de coleta e cálculo do
  relatório (contagem, tempo médio, taxa de conclusão).
- `src/totem/useTotemOperatorAccess.ts` — barra do operador oculta no quiosque:
  gesto de toque, toque longo, atalho de teclado (`Ctrl + Shift + O`) e `?operador=1`.
- `src/totem/TotemCollectionReport.tsx` + `src/totem/totemReport.css` — painel
  do relatório de coletas do totem.
- `src/totem/TotemApp.tsx` — casca do quiosque, sessão, submissão e operador.
- `src/components/surveys/totem/TotemSurvey.tsx` — fluxo/estado do totem e
  registro das sessões de coleta (início/conclusão/abandono).
- `src/components/surveys/totem/totem.css` — estilos de quiosque (tablet).
- `src/types.ts` — `layoutStyle: 'TOTEM'` e `totemConfig`.
- `src/App.tsx` — roteamento do `/totem` (carregado sob demanda).
- `src/components/wizard/SurveyAppearanceStep.tsx` — opção e configuração no wizard.

## Teste local

```bash
npm install
npm run dev
# abra http://localhost:3000/totem
# sem persistência de login: http://localhost:3000/totem?sessao=temporaria
```

### Teste rápido do relatório

1. Abra `/totem`, faça login e responda uma pesquisa até o fim (coleta concluída).
2. Inicie outra e deixe a inatividade reiniciar (coleta abandonada).
3. Toque em **Relatório** no canto: deve mostrar 1 concluída, 1 iniciada a mais,
   taxa de conclusão e tempo médio de resposta.
4. Recarregue o tablet: o login deve continuar (com “Login do tablet” ligado).
