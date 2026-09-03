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
