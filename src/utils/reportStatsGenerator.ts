import { Survey, InterviewSubmission, Question, AnswerItem } from '../types';

const STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'é', 'em', 'um', 'uma',
  'uns', 'umas', 'para', 'com', 'sem', 'por', 'que', 'se', 'na', 'no', 'nas', 'nos',
  'ao', 'aos', 'à', 'às', 'como', 'mais', 'muito', 'muita', 'mas', 'ou', 'já', 'não',
  'sim', 'foi', 'ser', 'tem', 'têm', 'este', 'esta', 'isso', 'seu', 'sua', 'meu',
  'minha', 'pelo', 'pela', 'sobre', 'entre', 'até', 'também', 'só', 'nós', 'eles',
  'elas', 'ele', 'ela', 'me', 'te', 'lhe', 'nem', 'quando', 'onde', 'porque',
]);

function pct(n: number, total: number): string {
  if (total === 0) return '0,0%';
  return `${((n / total) * 100).toFixed(1).replace('.', ',')}%`;
}

function respostasValidasDaPergunta(submissions: InterviewSubmission[], perguntaId: string): AnswerItem[] {
  const itens: AnswerItem[] = [];
  submissions.forEach((s) => {
    if (s.status !== 'concluida') return;
    const item = s.respostas.find((r) => r.perguntaId === perguntaId);
    if (item && item.resposta !== undefined && item.resposta !== '' && !(Array.isArray(item.resposta) && item.resposta.length === 0)) {
      itens.push(item);
    }
  });
  return itens;
}

function contarFrequencias(respostas: AnswerItem[]): Map<string, number> {
  const freq = new Map<string, number>();
  respostas.forEach((r) => {
    const valores = Array.isArray(r.resposta) ? r.resposta : [r.resposta];
    valores.forEach((v) => {
      const key = String(v).trim();
      if (!key) return;
      freq.set(key, (freq.get(key) || 0) + 1);
    });
  });
  return freq;
}

function ordenarFrequencias(freq: Map<string, number>): [string, number][] {
  return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
}

function calcularNps(respostas: AnswerItem[]): { score: number; promotores: number; neutros: number; detratores: number; total: number } | null {
  const valores = respostas
    .map((r) => parseInt(String(Array.isArray(r.resposta) ? r.resposta[0] : r.resposta), 10))
    .filter((n) => Number.isFinite(n));
  if (valores.length === 0) return null;

  const promotores = valores.filter((n) => n >= 9).length;
  const neutros = valores.filter((n) => n >= 7 && n <= 8).length;
  const detratores = valores.filter((n) => n <= 6).length;
  const total = valores.length;
  const score = Math.round(((promotores - detratores) / total) * 100);

  return { score, promotores, neutros, detratores, total };
}

function calcularMediaEscala(respostas: AnswerItem[]): { media: number; total: number } | null {
  const valores = respostas
    .map((r) => parseFloat(String(Array.isArray(r.resposta) ? r.resposta[0] : r.resposta)))
    .filter((n) => Number.isFinite(n));
  if (valores.length === 0) return null;
  const media = valores.reduce((acc, v) => acc + v, 0) / valores.length;
  return { media, total: valores.length };
}

function extrairPalavrasChave(respostas: AnswerItem[], topN = 8): [string, number][] {
  const freq = new Map<string, number>();
  respostas.forEach((r) => {
    const texto = String(Array.isArray(r.resposta) ? r.resposta.join(' ') : r.resposta)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ');
    texto.split(/\s+/).forEach((palavra) => {
      if (palavra.length < 4 || STOPWORDS.has(palavra)) return;
      freq.set(palavra, (freq.get(palavra) || 0) + 1);
    });
  });
  return ordenarFrequencias(freq).slice(0, topN);
}

/**
 * Gera um bloco de texto ANALÍTICO-QUANTITATIVO (tom estatístico e profissional)
 * a partir dos resultados reais da pesquisa. O texto é apenas um PONTO DE PARTIDA
 * — o usuário pode e deve revisar/editar livremente depois.
 */
export function generateQuantitativeDraft(survey: Survey, submissions: InterviewSubmission[]): string {
  const concluidas = submissions.filter((s) => s.pesquisaId === survey.id && s.status === 'concluida');
  const total = concluidas.length;

  if (total === 0) {
    return `Ainda não há coletas concluídas suficientes para a pesquisa "${survey.nome}" para compor uma análise quantitativa. Assim que as primeiras entrevistas forem finalizadas, gere novamente este rascunho para obter a leitura estatística dos resultados.`;
  }

  const paragrafos: string[] = [];
  paragrafos.push(
    `A análise quantitativa da pesquisa **${survey.nome}** considera uma base de **${total} entrevista(s) concluída(s)** até o momento da extração destes dados. Os percentuais a seguir foram calculados sobre o total de respondentes válidos para cada questão, e não sobre o total geral da amostra, uma vez que perguntas condicionais e não-obrigatórias podem apresentar bases distintas.`
  );

  const perguntasOrdenadas = [...survey.perguntas].sort((a, b) => a.ordem - b.ordem);

  perguntasOrdenadas.forEach((q: Question) => {
    const respostas = respostasValidasDaPergunta(concluidas, q.id);
    if (respostas.length === 0) return;

    if (q.tipo === 'multipla_escolha' || q.tipo === 'multipla_selecao' || q.tipo === 'sim_nao') {
      const freq = ordenarFrequencias(contarFrequencias(respostas));
      const [maisFrequente, maisFrequenteN] = freq[0];
      const baseN = q.tipo === 'multipla_selecao' ? respostas.length : respostas.length;

      let paragrafo = `Em relação à questão "${q.enunciado}" (${respostas.length} resposta(s) válida(s)), a alternativa de maior incidência foi **"${maisFrequente}"**, mencionada por ${pct(maisFrequenteN, baseN)} dos respondentes (${maisFrequenteN} ocorrência(s)).`;

      if (freq.length > 1) {
        const [segunda, segundaN] = freq[1];
        paragrafo += ` Em seguida, aparece "${segunda}" com ${pct(segundaN, baseN)} (${segundaN} ocorrência(s))`;
        if (freq.length > 2) {
          const outrasN = freq.slice(2).reduce((acc, [, n]) => acc + n, 0);
          paragrafo += `, restando ${pct(outrasN, baseN)} distribuídos entre as ${freq.length - 2} demais alternativa(s).`;
        } else {
          paragrafo += '.';
        }
      }
      paragrafos.push(paragrafo);
    } else if (q.tipo === 'escala_numerica') {
      const stats = calcularMediaEscala(respostas);
      if (stats) {
        const amplitude = (q.escalaMax ?? 5) - (q.escalaMin ?? 1);
        const posicaoRelativa = amplitude > 0 ? (stats.media - (q.escalaMin ?? 1)) / amplitude : 0;
        const leitura =
          posicaoRelativa >= 0.75
            ? 'aproximando-se do limite superior da escala, o que indica avaliação predominantemente positiva'
            : posicaoRelativa >= 0.5
            ? 'situando-se acima do ponto médio da escala, sugerindo avaliação moderadamente favorável'
            : posicaoRelativa >= 0.25
            ? 'situando-se abaixo do ponto médio, o que aponta para uma percepção de insatisfação relativa'
            : 'próxima ao limite inferior da escala, evidenciando um quadro de avaliação crítica';
        paragrafos.push(
          `Para a questão "${q.enunciado}", que utiliza escala de ${q.escalaMin ?? 1} a ${q.escalaMax ?? 5}${q.escalaMinLabel && q.escalaMaxLabel ? ` (de "${q.escalaMinLabel}" a "${q.escalaMaxLabel}")` : ''}, a média aritmética obtida foi de **${stats.media.toFixed(2).replace('.', ',')}** pontos, com base em ${stats.total} resposta(s), ${leitura}.`
        );
      }
    } else if (q.tipo === 'nps') {
      const nps = calcularNps(respostas);
      if (nps) {
        const classificacao =
          nps.score >= 75
            ? 'excelente'
            : nps.score >= 50
            ? 'muito bom'
            : nps.score >= 0
            ? 'razoável, com espaço relevante para melhoria'
            : 'crítico, indicando predominância de detratores';
        paragrafos.push(
          `O indicador de Net Promoter Score (NPS) para "${q.enunciado}" resultou em **${nps.score >= 0 ? '+' : ''}${nps.score}**, classificado como ${classificacao}. A composição da base (${nps.total} resposta(s)) foi de ${pct(nps.promotores, nps.total)} de promotores (notas 9–10), ${pct(nps.neutros, nps.total)} de neutros (notas 7–8) e ${pct(nps.detratores, nps.total)} de detratores (notas 0–6).`
        );
      }
    }
  });

  paragrafos.push(
    `Recomenda-se cruzar os indicadores acima com os filtros demográficos e territoriais disponíveis no módulo de Análise para identificar variações relevantes entre subgrupos da amostra, bem como acompanhar a evolução destes percentuais ao longo dos próximos ciclos de coleta.`
  );

  return paragrafos.join('\n\n');
}

/**
 * Gera um bloco de texto ANALÍTICO-QUALITATIVO a partir das respostas abertas
 * (texto_aberto) da pesquisa: contagem de manifestações e termos mais
 * recorrentes, como ponto de partida para a leitura qualitativa do analista.
 */
export function generateQualitativeDraft(survey: Survey, submissions: InterviewSubmission[]): string {
  const concluidas = submissions.filter((s) => s.pesquisaId === survey.id && s.status === 'concluida');
  const perguntasAbertas = survey.perguntas
    .filter((q) => q.tipo === 'texto_aberto')
    .sort((a, b) => a.ordem - b.ordem);

  if (perguntasAbertas.length === 0) {
    return `A pesquisa "${survey.nome}" não possui questões de texto aberto configuradas, portanto não há material textual espontâneo disponível para uma leitura qualitativa automática. Considere adicionar ao menos uma pergunta discursiva em versões futuras do instrumento para enriquecer esta análise.`;
  }

  const paragrafos: string[] = [];
  paragrafos.push(
    `A leitura qualitativa a seguir baseia-se nas manifestações espontâneas registradas nas questões discursivas da pesquisa **${survey.nome}**, com ${concluidas.length} entrevista(s) concluída(s) na base de referência.`
  );

  perguntasAbertas.forEach((q) => {
    const respostas = respostasValidasDaPergunta(concluidas, q.id);
    if (respostas.length === 0) {
      paragrafos.push(`Nenhuma manifestação registrada até o momento para a questão "${q.enunciado}".`);
      return;
    }

    const termos = extrairPalavrasChave(respostas);
    let paragrafo = `Na questão "${q.enunciado}", foram registradas ${respostas.length} manifestação(ões) textual(is) válida(s).`;

    if (termos.length > 0) {
      const listaTermos = termos.map(([palavra, n]) => `"${palavra}" (${n}x)`).join(', ');
      paragrafo += ` Entre os termos mais recorrentes no conteúdo das respostas, destacam-se: ${listaTermos}. Essa recorrência sugere um possível padrão temático que merece validação por leitura integral das respostas, dado que a contagem de termos é apenas indicativa e não substitui a análise de conteúdo qualificada.`;
    }

    paragrafos.push(paragrafo);

    const amostras = respostas.slice(0, 3).map((r) => (Array.isArray(r.resposta) ? r.resposta.join('; ') : r.resposta));
    if (amostras.length > 0) {
      paragrafo = `A título de ilustração, seguem trechos representativos: ${amostras.map((a) => `"${a}"`).join(' | ')}.`;
      paragrafos.push(paragrafo);
    }
  });

  paragrafos.push(
    `Recomenda-se complementar esta leitura automática com a categorização manual das respostas em eixos temáticos, de modo a qualificar os achados apresentados acima e permitir comparações consistentes entre ciclos de coleta.`
  );

  return paragrafos.join('\n\n');
}
