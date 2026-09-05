import { jsPDF } from 'jspdf';
import { InterviewSubmission, Survey } from '../types';

export function exportSubmissionsToCSV(submissions: InterviewSubmission[], survey?: Survey) {
  if (!submissions || submissions.length === 0) {
    alert('Nenhuma entrevista disponível para exportação.');
    return;
  }

  // Get all unique questions
  const questionMap = new Map<string, string>();
  submissions.forEach((sub) => {
    sub.respostas.forEach((r) => {
      if (!questionMap.has(r.perguntaId)) {
        questionMap.set(r.perguntaId, `[${r.perguntaCodigo}] ${r.perguntaEnunciado}`);
      }
    });
  });

  const questionKeys = Array.from(questionMap.keys());
  const questionHeaders = questionKeys.map((k) => `"${(questionMap.get(k) || k).replace(/"/g, '""')}"`);

  const baseHeaders = [
    '"Código da Pesquisa"',
    '"Nome da Pesquisa"',
    '"Pesquisador"',
    '"Data e Hora Realizada"',
    '"Status da Entrevista"',
    '"Latitude"',
    '"Longitude"',
    '"Bairro / Localidade"',
    '"Áudio Gravado"',
    '"Duração Áudio (s)"',
    '"Revisado / Corrigido pelo Admin"',
  ];

  const fullHeader = [...baseHeaders, ...questionHeaders].join(';');

  const rows = submissions.map((sub) => {
    const formattedDate = new Date(sub.dataHora).toLocaleString('pt-BR');
    const lat = sub.geolocalizacao?.latitude?.toString() || 'N/A';
    const lng = sub.geolocalizacao?.longitude?.toString() || 'N/A';
    const bairro = sub.geolocalizacao?.bairro ? `"${sub.geolocalizacao.bairro.replace(/"/g, '""')}"` : '""';
    const audioName = sub.audioGravacao?.nomeArquivo ? `"${sub.audioGravacao.nomeArquivo}"` : '"Não"';
    const audioSecs = sub.audioGravacao?.duracaoSegundos?.toString() || '0';
    const adminEdited = sub.respostasAlteradasPeloAdmin ? '"SIM (Revisado)"' : '"NÃO (Original)"';

    const answersPart = questionKeys.map((qId) => {
      const found = sub.respostas.find((r) => r.perguntaId === qId);
      if (!found) return '""';
      const val = Array.isArray(found.resposta) ? found.resposta.join(', ') : found.resposta;
      return `"${(val || '').replace(/"/g, '""')}"`;
    });

    const baseRow = [
      `"${sub.codigoPesquisa}"`,
      `"${sub.pesquisaNome.replace(/"/g, '""')}"`,
      `"${sub.pesquisadorNome.replace(/"/g, '""')}"`,
      `"${formattedDate}"`,
      `"${sub.status}"`,
      `"${lat}"`,
      `"${lng}"`,
      bairro,
      audioName,
      `"${audioSecs}"`,
      adminEdited,
    ];

    return [...baseRow, ...answersPart].join(';');
  });

  const csvContent = '\uFEFF' + [fullHeader, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `Pesquisa_${survey?.codigo || 'Export'}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSubmissionsToPDF(submissions: InterviewSubmission[], survey?: Survey) {
  if (!submissions || submissions.length === 0) {
    alert('Nenhuma entrevista disponível para exportação.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header banner
  doc.setFillColor(220, 38, 38); // Brand red matching system theme
  doc.rect(14, y, pageWidth - 28, 14, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DATAQUEST - RELATÓRIO OFICIAL DE PESQUISA EM CAMPO', 18, y + 9);

  y += 22;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Pesquisa: ${survey?.nome || submissions[0]?.pesquisaNome}`, 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Código Relacionado: ${survey?.codigo || submissions[0]?.codigoPesquisa}  |  Total de Entrevistas: ${submissions.length}  |  Emissão: ${new Date().toLocaleString('pt-BR')}`, 14, y);
  y += 8;

  // Submissions summary
  submissions.forEach((sub, index) => {
    // Check page break
    if (y > 250) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Entrevista #${index + 1} - Cód: ${sub.codigoPesquisa}`, 18, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const dateStr = new Date(sub.dataHora).toLocaleString('pt-BR');
    doc.text(`Pesquisador: ${sub.pesquisadorNome} | Data/Hora: ${dateStr}`, 18, y + 10);

    if (sub.respostasAlteradasPeloAdmin) {
      doc.setTextColor(185, 28, 28);
      doc.setFont('helvetica', 'bold');
      doc.text('[Auditado / Corrigido pelo Administrador]', pageWidth - 75, y + 8);
    }

    y += 18;

    // Questions and Answers
    sub.respostas.forEach((resp) => {
      if (y > 270) {
        doc.addPage();
        y = 15;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const qText = `${resp.perguntaCodigo}: ${resp.perguntaEnunciado}`;
      const splitQ = doc.splitTextToSize(qText, pageWidth - 36);
      doc.text(splitQ, 18, y);
      y += splitQ.length * 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const answerVal = Array.isArray(resp.resposta) ? resp.resposta.join(', ') : (resp.resposta || '(Sem resposta)');
      const aText = `Resposta: ${answerVal}`;
      const splitA = doc.splitTextToSize(aText, pageWidth - 36);
      doc.text(splitA, 22, y);
      y += splitA.length * 4 + 2;
    });

    // Geolocation and Audio note
    if (sub.geolocalizacao || sub.audioGravacao) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const geoStr = sub.geolocalizacao
        ? `GPS: (${sub.geolocalizacao.latitude.toFixed(5)}, ${sub.geolocalizacao.longitude.toFixed(5)}) ${sub.geolocalizacao.bairro || ''}`
        : '';
      const audioStr = sub.audioGravacao
        ? `Áudio: ${sub.audioGravacao.nomeArquivo} (${sub.audioGravacao.duracaoSegundos}s)`
        : '';
      doc.text([geoStr, audioStr].filter(Boolean).join(' | '), 18, y);
      y += 5;
    }

    y += 4;
  });

  const filename = `Relatorio_Pesquisa_${survey?.codigo || 'DataQuest'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export function exportConsolidatedSurveysToPDF(surveys: Survey[], allSubmissions: InterviewSubmission[]) {
  if (!surveys || surveys.length === 0) {
    alert('Nenhuma pesquisa selecionada para exportação.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = 15;
      return true;
    }
    return false;
  };

  // Header banner principal
  doc.setFillColor(37, 99, 235); // Blue-600 oficial do DataQuest
  doc.rect(14, y, pageWidth - 28, 16, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DATAQUEST - RELATÓRIO CONSOLIDADO DE PESQUISAS', 18, y + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('DOCUMENTO OFICIAL DE CONFORMIDADE E GESTÃO DE DADOS EM CAMPO', 18, y + 12.5);

  y += 24;

  // Bloco Executivo Resumo
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD');

  const totalSelectedSurveys = surveys.length;
  const consolidatedSubmissions = allSubmissions.filter((sub) =>
    surveys.some((surv) => surv.id === sub.pesquisaId)
  );
  const totalInterviews = consolidatedSubmissions.length;
  const uniqueResearchers = new Set(consolidatedSubmissions.map((s) => s.pesquisadorNome)).size;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SUMÁRIO EXECUTIVO DA EXPORTAÇÃO', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Total de Pesquisas Selecionadas: ${totalSelectedSurveys}   |   Total de Entrevistas Coletadas: ${totalInterviews}   |   Pesquisadores Ativos: ${uniqueResearchers}`,
    18,
    y + 11.5
  );

  const nowFormatted = new Date().toLocaleString('pt-BR');
  doc.text(
    `Emissão: ${nowFormatted}   |   Ambiente: SA-EAST-1   |   Hash do Lote: DQ-${Date.now().toString(36).toUpperCase()}`,
    18,
    y + 16.5
  );

  y += 28;

  // Tabela Resumo das Pesquisas Selecionadas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('PESQUISAS INCLUÍDAS NESTE RELATÓRIO CONSOLIDADO:', 14, y);
  y += 5;

  // Cabeçalho da mini tabela
  doc.setFillColor(226, 232, 240);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CÓDIGO', 16, y + 4.5);
  doc.text('NOME DA PESQUISA', 42, y + 4.5);
  doc.text('STATUS', 130, y + 4.5);
  doc.text('CICLO/VER.', 150, y + 4.5);
  doc.text('ENTREVISTAS', 172, y + 4.5);
  y += 7;

  surveys.forEach((survey, sIndex) => {
    checkPageBreak(8);
    const count = allSubmissions.filter((s) => s.pesquisaId === survey.id).length;

    doc.setFillColor(sIndex % 2 === 0 ? 255 : 248, sIndex % 2 === 0 ? 255 : 250, sIndex % 2 === 0 ? 255 : 252);
    doc.rect(14, y, pageWidth - 28, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(37, 99, 235);
    doc.text(survey.codigo, 16, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const splitName = doc.splitTextToSize(survey.nome, 85);
    doc.text(splitName[0] || survey.nome, 42, y + 4);

    doc.setTextColor(survey.status === 'ativa' ? 16 : 100, survey.status === 'ativa' ? 185 : 116, survey.status === 'ativa' ? 129 : 139);
    doc.text(survey.status.toUpperCase(), 130, y + 4);

    doc.setTextColor(71, 85, 105);
    doc.text(`C${survey.cicloAtual} v${survey.versao}`, 150, y + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(count), 175, y + 4);

    y += 6;
  });

  y += 8;

  // Seções Detalhadas por Pesquisa
  surveys.forEach((survey, sIdx) => {
    // Quebra de página para cada pesquisa iniciar limpa
    doc.addPage();
    y = 15;

    const surveySubs = allSubmissions.filter((sub) => sub.pesquisaId === survey.id);

    // Banner da Pesquisa
    doc.setFillColor(30, 41, 59);
    doc.rect(14, y, pageWidth - 28, 12, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(`[${sIdx + 1}/${surveys.length}] ${survey.codigo} - ${survey.nome}`, 18, y + 7.5);

    y += 17;

    // Metadados da Pesquisa
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Status: ${survey.status.toUpperCase()}  |  Ciclo: ${survey.cicloAtual}  |  Versão: ${survey.versao}  |  Coleta Web: ${survey.habilitarColetaWeb ? 'Habilitada' : 'Desabilitada'}  |  Total de Entrevistas: ${surveySubs.length}`,
      14,
      y
    );
    y += 5;

    if (survey.descricao) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const splitDesc = doc.splitTextToSize(`Descrição: ${survey.descricao}`, pageWidth - 28);
      doc.text(splitDesc, 14, y);
      y += splitDesc.length * 3.5 + 2;
    }

    // Perguntas do Questionário
    if (survey.perguntas && survey.perguntas.length > 0) {
      checkPageBreak(12);
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, pageWidth - 28, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`ESTRUTURA DO QUESTIONÁRIO (${survey.perguntas.length} PERGUNTAS CADASTRADAS)`, 16, y + 3.5);
      y += 7;

      survey.perguntas.forEach((q) => {
        checkPageBreak(5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(37, 99, 235);
        doc.text(`${q.codigo}:`, 16, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const qText = `${q.enunciado} [${q.tipo}${q.obrigatoria ? ' - Obrigatória' : ''}]`;
        const splitQ = doc.splitTextToSize(qText, pageWidth - 38);
        doc.text(splitQ, 27, y);
        y += Math.max(splitQ.length * 3.2, 4);
      });
      y += 4;
    }

    // Divisor para entrevistas
    checkPageBreak(12);
    doc.setFillColor(226, 232, 240);
    doc.rect(14, y, pageWidth - 28, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`ENTREVISTAS COLETADAS NESTA PESQUISA (${surveySubs.length})`, 16, y + 4.2);
    y += 9;

    if (surveySubs.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Nenhuma entrevista realizada ou sincronizada para esta pesquisa até o momento.', 16, y);
      y += 8;
    } else {
      surveySubs.forEach((sub, subIdx) => {
        checkPageBreak(25);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(14, y, pageWidth - 28, 12, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(`Entrevista #${subIdx + 1} - Cód: ${sub.codigoPesquisa}`, 18, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const dateStr = new Date(sub.dataHora).toLocaleString('pt-BR');
        doc.text(`Pesquisador: ${sub.pesquisadorNome} | Data/Hora: ${dateStr}`, 18, y + 9);

        if (sub.respostasAlteradasPeloAdmin) {
          doc.setTextColor(185, 28, 28);
          doc.setFont('helvetica', 'bold');
          doc.text('[Auditado / Corrigido pelo Admin]', pageWidth - 70, y + 7);
        }

        y += 15;

        // Respostas
        sub.respostas.forEach((resp) => {
          checkPageBreak(10);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          const qText = `${resp.perguntaCodigo}: ${resp.perguntaEnunciado}`;
          const splitQ = doc.splitTextToSize(qText, pageWidth - 36);
          doc.text(splitQ, 18, y);
          y += splitQ.length * 3.3;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          const answerVal = Array.isArray(resp.resposta) ? resp.resposta.join(', ') : resp.resposta || '(Sem resposta)';
          const aText = `Resposta: ${answerVal}`;
          const splitA = doc.splitTextToSize(aText, pageWidth - 36);
          doc.text(splitA, 22, y);
          y += splitA.length * 3.3 + 1.5;
        });

        // Geolocation / Audio
        if (sub.geolocalizacao || sub.audioGravacao) {
          checkPageBreak(6);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          const geoStr = sub.geolocalizacao
            ? `GPS: (${sub.geolocalizacao.latitude.toFixed(5)}, ${sub.geolocalizacao.longitude.toFixed(5)}) ${sub.geolocalizacao.bairro || ''}`
            : '';
          const audioStr = sub.audioGravacao
            ? `Áudio: ${sub.audioGravacao.nomeArquivo} (${sub.audioGravacao.duracaoSegundos}s)`
            : '';
          doc.text([geoStr, audioStr].filter(Boolean).join(' | '), 18, y);
          y += 4.5;
        }

        y += 3;
      });
    }
  });

  // Numeração de páginas no rodapé
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);

    doc.text('DataQuest v2.4.1-stable • Sistema de Gestão de Pesquisas • Relatório Consolidado', 14, pageHeight - 6);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 32, pageHeight - 6);
  }

  const filename = `Relatorio_Consolidado_${surveys.length}_Pesquisas_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
