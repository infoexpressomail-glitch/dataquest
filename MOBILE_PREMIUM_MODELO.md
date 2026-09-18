# Modelo Mobile First Premium (Opção 6) — DataQuest

Implementação **incremental** de um novo modelo de pesquisa mobile-first. Nenhuma
funcionalidade, tela ou modelo existente foi alterado: as pesquisas atuais continuam
usando exatamente o mesmo fluxo.

## Como funciona

A pesquisa ganhou a propriedade `layoutStyle` com os valores:

| Valor            | Comportamento                                                        |
| ---------------- | -------------------------------------------------------------------- |
| `DEFAULT`        | Layout clássico atual (nada muda).                                    |
| `CARD`           | Reservado para variação em cartões.                                   |
| `SIDEBAR`        | Reservado para variação com navegação lateral.                        |
| `MOBILE_PREMIUM` | Ativa a nova interface Mobile First Premium.                          |

O `CollectionSimulator` (usado pela coleta de campo e pelo simulador) faz um desvio
controlado **antes** de renderizar a UI antiga:

```tsx
if (activeSurvey && hasValidQuestions && activeSurvey.layoutStyle === 'MOBILE_PREMIUM') {
  return <MobilePremiumSurvey ... />;
}
```

Toda a lógica já existente (respostas, regras condicionais, gravação de áudio, submissão,
auditoria, offline/IndexedDB) é reaproveitada — o componente novo é apenas de interface.

## Onde configurar

No **Wizard de criação de pesquisa**, nova aba **"6. Aparência da Pesquisa"**:

- Modelo (DEFAULT / CARD / SIDEBAR / MOBILE_PREMIUM)
- Tema (cor principal/secundária, padrão azul institucional GIDE)
- Nome da instituição, logo, mensagem inicial e final, mensagem da Prefeitura, QR Code
- Imagem de capa (galeria padrão ou upload) e imagem final
- Exibição de percentual e do indicador "Pergunta X de Y"
- Botões para abrir a **Galeria Visual** (ícones, smiles e imagens), com busca,
  filtro por categoria, favoritos e seleção.

Na aba **"2. Perguntas"**, ao expandir uma pergunta em *Alterar Tipo / Alternativas*,
há o bloco **Aparência Visual (Mobile Premium)**:

- Aparência do enunciado: texto, +ícone, +smile, +emoji, +imagem, +cor, +badge, +foto
- Estilo das respostas: lista tradicional, cards, ícones, smileys, imagem, emoji, escala
- Escalas: emojis, estrelas (com meia estrela), corações, polegares, círculos coloridos,
  termômetro (horizontal/vertical)
- Cor de destaque, badge, comentário opcional com limite de caracteres
- Visual individual de cada alternativa (ícone / smile / imagem)

## Arquivos novos

```
src/components/surveys/mobile-premium/
  MobilePremiumSurvey.tsx      # orquestrador (capa → perguntas → tela final)
  MobilePremiumHeader.tsx      # cabeçalho azul + progresso + acessibilidade
  QuestionCard.tsx             # card da pergunta + aparência + comentário
  AnswerGallery.tsx            # 7 tipos visuais de resposta + escalas
  ProgressBar.tsx
  QuestionIndicator.tsx
  FooterNavigation.tsx         # rodapé fixo (Voltar / Próxima / Finalizar)
  CoverScreen.tsx
  FinishScreen.tsx
  iconLibrary.ts               # galeria universal de ícones (Lucide React)
  smileLibrary.ts              # grupos de smiles + escala de emojis
  imageLibrary.ts              # imagens padrão (SVG data URI, offline)
  mobilePremiumUtils.ts        # resolução de tema/aparência/escala
  mobilePremium.css            # estilos isolados (.mp-*), animações, a11y

src/components/wizard/
  SurveyAppearanceStep.tsx     # aba 6 do Wizard
  QuestionVisualEditor.tsx     # aparência por pergunta (aba 2)
  VisualGalleryModal.tsx       # painel da Galeria Visual

src/services/surveyAssetsService.ts   # upload Supabase Storage (survey-assets)
supabase/migrations/0007_mobile_premium_appearance.sql
```

## Banco de dados / Storage

Execute a migration:

```sql
-- supabase/migrations/0007_mobile_premium_appearance.sql
```

Ela adiciona (idempotente, com `IF NOT EXISTS`) as colunas na tabela `pesquisas`:
`layout_style`, `institution_name`, `logo_image`, `cover_image`, `finish_image`,
`welcome_message`, `finish_message`, `prefeitura_message`, `qr_code_url`,
`theme_accent`, `theme_secondary`.

Os campos visuais **por pergunta** (`question_icon`, `question_emoji`,
`question_image`, `answer_visual_type`, `answer_icon`, `answer_emoji`,
`answer_image`, `card_color`, `icon_color`, `badge_color`) vivem dentro do jsonb
`perguntas` (bloco `visual` de cada pergunta) — ver comentários e exemplos de
consulta no final da migration.

Cria o bucket **`survey-assets`** com as pastas sugeridas
`covers/`, `questions/`, `answers/`, `gallery/`, `logos/` e as políticas de
leitura/escrita. Se o Supabase não estiver configurado, o upload faz fallback
transparente para data URL (funciona offline).

> Como `pesquisas.dados_completos` já guarda o objeto `Survey` inteiro, o modelo
> funciona mesmo antes de rodar a migration — as colunas normalizadas servem para
> índices, filtros e relatórios via SQL.

## Pesquisa GIDE de demonstração

O `mockData.ts` inclui a pesquisa **"Pesquisa GIDE 2026 — Avaliação da Rede
Municipal de Ensino"** (`id: pesq_gide_2026`, código `GIDE-2026-01`) já configurada
com `layoutStyle: 'MOBILE_PREMIUM'`:

- **Capa** com imagem, nome da instituição, mensagem de boas-vindas e botão iniciar;
- **Tela final** com imagem, mensagem de agradecimento e mensagem da Secretaria;
- **11 perguntas** cobrindo ícones (vínculo, infraestrutura), smiles (merenda,
frequência, concordância), imagens (ambientes da escola), escala de estrelas
(limpeza), círculos coloridos (NPS 0–10), emojis (sentimento, 7 níveis) e
corações (afeto pela escola), além de texto aberto;
- Comentário opcional (500 caracteres) na pergunta de limpeza.

Ela aparece na lista de pesquisas para administradores e também para os
pesquisadores vinculados (`colab_1`…`colab_5`), permitindo demonstrar o novo
modelo tanto no simulador quanto na coleta de campo.

## Indicador de gravação de áudio

No cabeçalho do Mobile Premium foi adicionado um indicador de áudio usado na
coleta de campo, com três estados:

| Estado | Exibição |
| ------ | -------- |
| Aguardando | Relógio + "Gravação inicia na pergunta PXX" |
| Gravando | Ponto vermelho pulsante + microfone + `mm:ss / Xm` |
| Limite atingido | Alerta + "Limite de X min atingido" |

O estado vem das mesmas variáveis já usadas pelo `CollectionSimulator`
(`isAudioEnabled`, `hasAudioStarted`, `isRecordingAudio`, `isAudioAtLimit`,
`audioSeconds`, `configuredMinutes`), sem duplicar lógica. O indicador só
aparece quando a pesquisa tem gravação habilitada.

## Acessibilidade e performance

- ARIA (`radiogroup`, `radio`, `checkbox`, `progressbar`, `aria-live`), foco visível
  e navegação por teclado.
- Modo alto contraste e fonte ampliada (botões no cabeçalho).
- Animações suaves de no máximo 250ms (slide/fade/escala) com respeito a
  `prefers-reduced-motion`; `motion/react` já é dependência do projeto.
- Headers/estilos isolados sob `.mp-*` — o bundle e o CSS existentes não foram
  alterados em comportamento.
