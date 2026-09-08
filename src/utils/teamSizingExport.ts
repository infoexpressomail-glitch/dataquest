import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Survey, Collaborator, InterviewSubmission } from '../types';
import { TeamSizingResult } from './crosstabUtils';

export interface SizingScenario {
  dias: number;
  produtividade: number;
  minPesquisadores: number;
  recomendado: number;
}

export function generateSensitivityMatrix(
  metaTotal: number,
  reservaTecnica: number = 0.15
): {
  diasList: number[];
  prodList: number[];
  matrix: number[][]; // [diasIdx][prodIdx]
} {
  const diasList = [1, 2, 3, 4, 5, 7, 10, 15];
  const prodList = [8, 10, 12, 15, 18, 20, 25];

  const matrix = diasList.map((dias) =>
    prodList.map((prod) => {
      const capacidade = dias * prod;
      return Math.max(1, Math.ceil(metaTotal / capacidade));
    })
  );

  return { diasList, prodList, matrix };
}

/**
 * Exporta o Relatório Técnico de Dimensionamento de Equipe em PDF
 */
export function exportTeamSizingToPDF(
  survey: Survey,
  sizing: TeamSizingResult,
  allocatedResearchers: Collaborator[],
  allResearchers: Collaborator[],
  submissions: InterviewSubmission[]
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // 1. Cabeçalho Institucional
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('DATAQUEST • SISTEMA DE GESTÃO DE PESQUISAS', 14, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `PLANO OPERACIONAL DE DIMENSIONAMENTO DE EQUIPE EM CAMPO • ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
    14,
    y
  );

  y = 36;

  // 2. Informações da Pesquisa
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Pesquisa: [${survey.codigo}] ${survey.nome}`, 14, y);

  y += 6;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Status: ${survey.status.toUpperCase()} | Ciclo: ${survey.cicloAtual || 1} | Versão: ${survey.versao || 1} | Data Início: ${survey.dataInicio || 'Imediato'} | Prazo: ${sizing.diasCampo} dias úteis`,
    14,
    y
  );

  y += 8;

  // 3. Bloco de Principais Indicadores de Dimensionamento
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(14, y, pageWidth - 28, 38, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('CÁLCULO TÉCNICO DE DIMENSIONAMENTO DA EQUIPE DE CAMPO', 18, y + 7);

  // 4 Colunas de Métricas
  const colW = (pageWidth - 36) / 4;

  // Col 1: Min Pesquisadores
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Qtd. Mínima Necessária:', 18, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`${sizing.minPesquisadores}`, 18, y + 25);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`(Rec: ${sizing.pesquisadoresRecomendados} com margem)`, 18, y + 32);

  // Col 2: Meta Total de Entrevistas
  const c2X = 18 + colW;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Meta de Entrevistas (N):', c2X, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`${sizing.totalMetaColetas}`, c2X, y + 25);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Realizadas: ${sizing.coletasRealizadas} (${sizing.percentualConcluido}%)`, c2X, y + 32);

  // Col 3: Produtividade e Prazo
  const c3X = 18 + colW * 2;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Capacidade Operacional:', c3X, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${sizing.mediaDiaPesquisador} entr./dia`, c3X, y + 25);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Prazo: ${sizing.diasCampo} dias de campo`, c3X, y + 32);

  // Col 4: Status da Equipe
  const c4X = 18 + colW * 3;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Equipe Alocada:', c4X, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  if (sizing.isSuficiente) {
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(`${sizing.pesquisadoresAlocados}`, c4X, y + 25);
    doc.setFontSize(7);
    doc.text('Equipe Suficiente', c4X, y + 32);
  } else {
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(`${sizing.pesquisadoresAlocados}`, c4X, y + 25);
    doc.setFontSize(7);
    doc.text(`Déficit: -${sizing.deficit} pesquisador(es)`, c4X, y + 32);
  }

  y += 46;

  // 4. Detalhamento da Fórmula Aplicada
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(14, y, pageWidth - 28, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text('FÓRMULA OPERACIONAL APLICADA:', 18, y + 6);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `P_min = teto(Meta_Total / (Dias_Campo x Produtividade_Dia)) = teto(${sizing.totalMetaColetas} / (${sizing.diasCampo} x ${sizing.mediaDiaPesquisador})) = ${sizing.minPesquisadores} pesquisadores`,
    18,
    y + 12
  );

  y += 24;

  // 5. Metas Demográficas de Sexo (Equivalência = 100% da Meta)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. EQUIVALÊNCIA DAS METAS POR SEXO (TOTAL = 100% DA AMOSTRA)', 14, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Masculino: ${sizing.metaSexoMasculino} coletas (${Math.round((sizing.metaSexoMasculino / sizing.somaMetasSexo) * 100)}%) | ` +
      `Feminino: ${sizing.metaSexoFeminino} coletas (${Math.round((sizing.metaSexoFeminino / sizing.somaMetasSexo) * 100)}%) | ` +
      `Soma Sexo: ${sizing.somaMetasSexo} = Meta Total N (${sizing.totalMetaColetas})`,
    14,
    y
  );

  y += 10;

  // 6. Escalação da Equipe e Cotas Individuais Atribuídas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. ESCALAÇÃO DA EQUIPE DE CAMPO & COTAS INDIVIDUAIS', 14, y);

  y += 6;

  // Tabela de Pesquisadores Alocados
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Pesquisador', 18, y + 4.5);
  doc.text('Login / Contato', 80, y + 4.5);
  doc.text('Cota Total Atribuída', 130, y + 4.5);
  doc.text('Coletas Realizadas', 165, y + 4.5);
  doc.text('Progresso', 190, y + 4.5);

  y += 7;

  const countByPesq: Record<string, number> = {};
  submissions.forEach((s) => {
    if (s.pesquisadorId) {
      countByPesq[s.pesquisadorId] = (countByPesq[s.pesquisadorId] || 0) + 1;
    }
  });

  const cotaIndividualMedia =
    allocatedResearchers.length > 0
      ? Math.ceil(sizing.totalMetaColetas / allocatedResearchers.length)
      : 0;

  if (allocatedResearchers.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text('Nenhum pesquisador formalmente vinculado a esta pesquisa ainda.', 18, y + 5);
    y += 10;
  } else {
    allocatedResearchers.forEach((pesq, idx) => {
      const realizadas = countByPesq[pesq.id] || 0;
      const pct = cotaIndividualMedia > 0 ? Math.min(100, Math.round((realizadas / cotaIndividualMedia) * 100)) : 0;

      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252);
      }
      doc.rect(14, y, pageWidth - 28, 6.5, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(pesq.nome.length > 30 ? pesq.nome.substring(0, 30) + '...' : pesq.nome, 18, y + 4.5);
      doc.setTextColor(100, 116, 139);
      doc.text(pesq.login || pesq.celular || 'N/A', 80, y + 4.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${cotaIndividualMedia} entr.`, 130, y + 4.5);
      doc.text(`${realizadas} entr.`, 165, y + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(pct >= 100 ? 5 : 37, pct >= 100 ? 150 : 99, pct >= 100 ? 105 : 235);
      doc.text(`${pct}%`, 190, y + 4.5);

      y += 6.5;
    });
  }

  y += 6;

  // 7. Matriz de Sensibilidade (Dias x Produtividade)
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. MATRIZ DE SENSIBILIDADE: PESQUISADORES MÍNIMOS POR CENÁRIO', 14, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Simulação cruzando o prazo de campo (dias) com a produtividade média (entrevistas/dia) para meta total N = ${sizing.totalMetaColetas}:`,
    14,
    y
  );

  y += 6;

  const { diasList, prodList, matrix } = generateSensitivityMatrix(sizing.totalMetaColetas);

  // Tabela de Sensibilidade
  const cellW = (pageWidth - 28 - 25) / prodList.length;

  // Cabeçalho da matriz
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Prazo (Dias)', 16, y + 4);

  prodList.forEach((prod, pIdx) => {
    doc.text(`${prod}/dia`, 39 + pIdx * cellW, y + 4);
  });

  y += 6;

  // Linhas da matriz
  diasList.slice(0, 6).forEach((dias, dIdx) => {
    const isCurrentDias = dias === sizing.diasCampo;
    doc.setFillColor(isCurrentDias ? 238 : dIdx % 2 === 0 ? 255 : 248, isCurrentDias ? 242 : 250, isCurrentDias ? 255 : 252);
    doc.rect(14, y, pageWidth - 28, 5.5, 'F');

    doc.setFont('helvetica', isCurrentDias ? 'bold' : 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(`${dias} dia${dias > 1 ? 's' : ''}`, 16, y + 3.8);

    prodList.forEach((prod, pIdx) => {
      const pCount = matrix[dIdx][pIdx];
      const isCurrentCell = isCurrentDias && prod === sizing.mediaDiaPesquisador;
      if (isCurrentCell) {
        doc.setTextColor(5, 150, 105);
        doc.setFont('helvetica', 'bold');
        doc.text(`*${pCount}*`, 39 + pIdx * cellW, y + 3.8);
      } else {
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        doc.text(`${pCount}`, 39 + pIdx * cellW, y + 3.8);
      }
    });

    y += 5.5;
  });

  // Rodapé do PDF
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Documento gerado eletronicamente pelo Sistema DataQuest • Válido para coordenação e planejamento operacional.',
      14,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - 28,
      doc.internal.pageSize.getHeight() - 8
    );
  }

  const cleanSurveyCode = survey.codigo.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Dimensionamento_Equipe_${cleanSurveyCode}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Exporta o Plano de Dimensionamento de Equipe em XLSX com abas
 */
export function exportTeamSizingToXLSX(
  survey: Survey,
  sizing: TeamSizingResult,
  allocatedResearchers: Collaborator[],
  submissions: InterviewSubmission[]
) {
  const wb = XLSX.utils.book_new();

  // ABA 1: Resumo do Dimensionamento
  const ws1Data: (string | number)[][] = [
    ['DATAQUEST - PLANO OPERACIONAL DE DIMENSIONAMENTO DE EQUIPE'],
    ['Pesquisa', survey.nome],
    ['Código', survey.codigo],
    ['Data do Relatório', new Date().toLocaleString('pt-BR')],
    [],
    ['MÉTRICA OPERACIONAL', 'VALOR', 'UNIDADE', 'OBSERVAÇÃO'],
    ['Meta Total de Entrevistas (N)', sizing.totalMetaColetas, 'entrevistas', 'Tamanho da amostra'],
    ['Prazo Previsto de Campo', sizing.diasCampo, 'dias úteis', 'Período total de coleta'],
    ['Produtividade Média Esperada', sizing.mediaDiaPesquisador, 'coletas/dia', 'Capacidade média individual'],
    ['Capacidade Individual no Período', sizing.capacidadeIndividualPeriodo, 'coletas/período', 'Dias x Produtividade'],
    ['Quantidade Mínima de Pesquisadores', sizing.minPesquisadores, 'pesquisadores', 'Fórmula: teto(N / Capacidade)'],
    ['Pesquisadores com Reserva Técnica (+15%)', sizing.pesquisadoresRecomendados, 'pesquisadores', 'Margem de segurança'],
    ['Pesquisadores Atualmente Alocados', sizing.pesquisadoresAlocados, 'pesquisadores', 'Equipe cadastrada na pesquisa'],
    ['Saldo Operacional', sizing.isSuficiente ? 'Equipe Suficiente' : `Déficit de ${sizing.deficit} pesquisador(es)`, '', 'Status de cobertura'],
    ['Entrevistas Realizadas', sizing.coletasRealizadas, 'entrevistas', `${sizing.percentualConcluido}% concluído`],
    ['Entrevistas Restantes', sizing.coletasRestantes, 'entrevistas', 'Para conclusão da meta'],
    [],
    ['DISTRIBUIÇÃO DE METAS POR SEXO (100% DA META TOTAL)', '', '', ''],
    ['Sexo Masculino', sizing.metaSexoMasculino, 'coletas', `${Math.round((sizing.metaSexoMasculino / sizing.somaMetasSexo) * 100)}%`],
    ['Sexo Feminino', sizing.metaSexoFeminino, 'coletas', `${Math.round((sizing.metaSexoFeminino / sizing.somaMetasSexo) * 100)}%`],
    ['Soma das Metas de Sexo', sizing.somaMetasSexo, 'coletas', sizing.sexoEqualsTotal ? 'Equivale a 100% da Meta N' : 'Ajustar meta'],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
  XLSX.utils.book_append_sheet(wb, ws1, 'Dimensionamento');

  // ABA 2: Matriz de Sensibilidade
  const { diasList, prodList, matrix } = generateSensitivityMatrix(sizing.totalMetaColetas);
  const ws2Data: (string | number)[][] = [
    ['MATRIZ DE SENSIBILIDADE - PESQUISADORES MÍNIMOS NECESSÁRIOS'],
    [`Meta Total de Entrevistas (N): ${sizing.totalMetaColetas}`],
    [],
    ['Prazo em Dias', ...prodList.map((p) => `${p} entr./dia`)],
  ];

  diasList.forEach((dias, dIdx) => {
    ws2Data.push([`${dias} dia(s)`, ...matrix[dIdx]]);
  });

  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
  XLSX.utils.book_append_sheet(wb, ws2, 'Matriz de Sensibilidade');

  // ABA 3: Equipe Alocada e Cotas Individuais
  const countByPesq: Record<string, number> = {};
  submissions.forEach((s) => {
    if (s.pesquisadorId) {
      countByPesq[s.pesquisadorId] = (countByPesq[s.pesquisadorId] || 0) + 1;
    }
  });

  const cotaIndividualMedia =
    allocatedResearchers.length > 0
      ? Math.ceil(sizing.totalMetaColetas / allocatedResearchers.length)
      : 0;

  const ws3Data: (string | number)[][] = [
    ['EQUIPE ALOCADA & COTAS INDIVIDUAIS'],
    ['Nome do Pesquisador', 'Login', 'Celular', 'Cota Total Atribuída', 'Realizadas', '% Progresso', 'Status'],
  ];

  allocatedResearchers.forEach((pesq) => {
    const realizadas = countByPesq[pesq.id] || 0;
    const pct = cotaIndividualMedia > 0 ? Math.min(100, Math.round((realizadas / cotaIndividualMedia) * 100)) : 0;
    ws3Data.push([
      pesq.nome,
      pesq.login,
      pesq.celular || 'N/A',
      cotaIndividualMedia,
      realizadas,
      `${pct}%`,
      pct >= 100 ? 'Meta Atingida' : 'Em Campo',
    ]);
  });

  const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
  XLSX.utils.book_append_sheet(wb, ws3, 'Equipe e Cotas');

  const cleanSurveyCode = survey.codigo.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Dimensionamento_Equipe_${cleanSurveyCode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
