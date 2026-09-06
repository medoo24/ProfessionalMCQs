// ═══════════════════════════════════════════════════════
// exportUtils.ts — Export questions to Text, DOCX, and PDF
// ═══════════════════════════════════════════════════════

import { Question, DisplaySettings, ToastType } from '../types';
import { qNum } from '../parser';

export interface ExportContext {
  visibleQuestions: Question[];
  displaySettings: DisplaySettings;
  customTags: Record<string, string>;
  notes: Record<string, string>;
  completedIds: Set<string>;
  weakIds: Set<string>;
  favIds?: Set<string>;
  titleLabel: string;
  showToast: (msg: string, type?: ToastType) => void;
}

/**
 * Export visible questions as formatted plain text to clipboard.
 */
export async function exportToText({
  visibleQuestions,
  displaySettings,
  customTags,
  notes,
  showToast
}: Pick<ExportContext, 'visibleQuestions' | 'displaySettings' | 'customTags' | 'notes' | 'showToast'>): Promise<void> {
  if (!visibleQuestions.length) {
    showToast('Nothing to export', 'warn');
    return;
  }

  let text = `QnA Hub Export\n${'='.repeat(50)}\n\n`;
  visibleQuestions.forEach(q => {
    text += `[ID: ${qNum(q.id)}] ${q.lesson !== 'General' ? '[' + q.lesson + ']' : ''}\n${q.question}\n`;
    if (displaySettings.showOptions && q.options && q.options.length > 0) {
      q.options.forEach((o, i) => {
        text += `  ${String.fromCharCode(65 + i)}) ${o}\n`;
      });
    }
    if (displaySettings.showAnswer) {
      text += `  ✓ ${q.answerKey ? q.answerKey + ' — ' : ''}${q.answerText}\n`;
    }
    if (displaySettings.showExplanation && q.explanation) {
      text += `  📖 ${q.explanation}\n`;
    }
    const tag = customTags[q.id] || q.tag;
    if (tag) text += `  🏷️ ${tag}\n`;
    if (notes[q.id]) text += `  📝 ${notes[q.id]}\n`;
    text += `\n${'—'.repeat(40)}\n\n`;
  });

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!');
    } else {
      showToast('Clipboard API not available', 'warn');
    }
  } catch (err: any) {
    showToast('Failed to copy: ' + err.message, 'error');
  }
}

/**
 * Export visible questions to Microsoft Word (.docx).
 */
export async function exportToDocx({
  visibleQuestions,
  displaySettings,
  customTags,
  notes,
  completedIds,
  weakIds,
  favIds = new Set(),
  titleLabel,
  showToast
}: ExportContext): Promise<void> {
  if (!visibleQuestions.length) {
    showToast('Nothing to export', 'warn');
    return;
  }

  showToast('Building DOCX...', 'success');
  try {
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      Table,
      TableRow,
      TableCell,
      BorderStyle,
      WidthType,
      ShadingType
    } = await import('docx');

    const BLUE = '2E5FAD', GREEN = '006644', GRAY = 'CCCCCC', DARKGRAY = '555555';
    const border = { style: BorderStyle.SINGLE, size: 1, color: GRAY };
    const borders = { top: border, bottom: border, left: border, right: border };
    const cellMarg = { top: 80, bottom: 80, left: 120, right: 120 };

    const showOpts = displaySettings.showOptions;
    const showAns = displaySettings.showAnswer;
    const showExp = displaySettings.showExplanation;
    const showTags = displaySettings.showTags;

    const children: any[] = [];
    children.push(new Paragraph({
      children: [new TextRun({ text: `QnA Hub — ${titleLabel}`, bold: true, size: 36, color: BLUE, font: 'Arial' })],
      spacing: { after: 120 }
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: `${visibleQuestions.length} questions · ${new Date().toLocaleDateString()}`, size: 18, color: '888888', font: 'Arial' })],
      spacing: { after: 400 }
    }));

    visibleQuestions.forEach((q, qi) => {
      const isDoneQ = completedIds.has(q.id);
      const isWeakQ = weakIds.has(q.id);
      const isFavQ = favIds.has(q.id);
      const tag = customTags[q.id] || q.tag;
      const note = notes[q.id];

      children.push(new Paragraph({
        children: [
          new TextRun({ text: `Q${qNum(q.id)}. `, bold: true, size: 24, color: BLUE, font: 'Arial' }),
          new TextRun({
            text: q.question,
            bold: true,
            size: 24,
            font: 'Arial',
            color: isDoneQ ? '22AA66' : isWeakQ ? 'CC3333' : '111111'
          })
        ],
        spacing: { before: 280, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD', space: 4 } }
      }));

      if (q.lesson && q.lesson !== 'General') {
        children.push(new Paragraph({
          children: [new TextRun({ text: q.lesson, size: 17, color: '777777', italics: true, font: 'Arial' })],
          spacing: { after: 60 }
        }));
      }

      if (showOpts && q.options && q.options.length > 0) {
        const rows = q.options.map((opt, oi) => {
          const letter = String.fromCharCode(65 + oi);
          const isCorrect = showAns && q.answerKey && q.answerKey.toUpperCase() === letter;
          return new TableRow({
            children: [
              new TableCell({
                borders,
                margins: cellMarg,
                width: { size: 720, type: WidthType.DXA },
                shading: isCorrect ? { fill: 'D5F0E8', type: ShadingType.CLEAR } : {},
                children: [new Paragraph({
                  children: [new TextRun({ text: letter + ')', bold: true, size: 20, font: 'Arial', color: isCorrect ? GREEN : '333333' })]
                })]
              }),
              new TableCell({
                borders,
                margins: cellMarg,
                width: { size: 8640, type: WidthType.DXA },
                shading: isCorrect ? { fill: 'D5F0E8', type: ShadingType.CLEAR } : {},
                children: [new Paragraph({
                  children: [new TextRun({ text: opt, size: 20, font: 'Arial', bold: !!isCorrect, color: isCorrect ? GREEN : '222222' })]
                })]
              })
            ]
          });
        });
        children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [720, 8640], rows }));
        children.push(new Paragraph({ spacing: { after: 60 } }));
      }

      if (showAns) {
        const ansLine = (q.answerKey ? q.answerKey + ' — ' : '') + (q.answerText || '');
        if (ansLine.trim()) {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: 'Answer: ', bold: true, size: 20, color: GREEN, font: 'Arial' }),
              new TextRun({ text: ansLine, size: 20, font: 'Arial', color: GREEN })
            ],
            spacing: { before: 60, after: 60 },
            indent: { left: 240 }
          }));
        }
      }

      if (showExp && q.explanation) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: 'Explanation: ', bold: true, size: 18, color: DARKGRAY, font: 'Arial', italics: true }),
            new TextRun({ text: q.explanation, size: 18, font: 'Arial', color: DARKGRAY, italics: true })
          ],
          spacing: { before: 40, after: 60 },
          indent: { left: 240 }
        }));
      }

      if (showTags && tag) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `Tag: ${tag}`, size: 17, color: '888888', font: 'Arial' })],
          indent: { left: 240 },
          spacing: { after: 30 }
        }));
      }

      if (note) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `Note: ${note}`, size: 17, color: 'AA8800', font: 'Arial', italics: true })],
          indent: { left: 240 },
          spacing: { after: 30 }
        }));
      }

      const badges: string[] = [];
      if (isDoneQ) badges.push('Done');
      if (isWeakQ) badges.push('Weak');
      if (isFavQ) badges.push('Fav');
      if (badges.length) {
        children.push(new Paragraph({
          children: [new TextRun({ text: badges.join('  '), size: 16, color: 'AAAAAA', font: 'Arial' })],
          indent: { left: 240 },
          spacing: { after: 100 }
        }));
      }

      if (qi < visibleQuestions.length - 1) {
        children.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
      }
    });

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
          }
        },
        children
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QnA_${(titleLabel || 'export').replace(/[^a-z0-9]/gi, '_')}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('DOCX exported! 📄');
  } catch (err: any) {
    console.error('DOCX error', err);
    showToast('DOCX failed: ' + err.message, 'error');
  }
}

/**
 * Export visible questions to Adobe PDF (.pdf).
 */
export async function exportToPDF({
  visibleQuestions,
  displaySettings,
  customTags,
  notes,
  completedIds,
  weakIds,
  titleLabel,
  showToast,
  setIsExporting
}: ExportContext & { setIsExporting?: (val: boolean) => void }): Promise<void> {
  if (!visibleQuestions.length) {
    showToast('Nothing to export', 'warn');
    return;
  }

  if (setIsExporting) setIsExporting(true);
  showToast('Generating PDF...');

  try {
    const { jsPDF } = await import('jspdf');

    const showOpts = displaySettings.showOptions;
    const showAns = displaySettings.showAnswer;
    const showExp = displaySettings.showExplanation;
    const showTags = displaySettings.showTags;

    const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
    const PW = 612, PH = 792, ML = 44, MR = 44, MT = 44, MB = 44, CW = PW - ML - MR;

    const PRIMARY: [number, number, number] = [37, 99, 235];
    const DARK: [number, number, number] = [17, 24, 39];
    const BODY: [number, number, number] = [31, 41, 55];
    const MUTED: [number, number, number] = [107, 114, 128];
    const LINE: [number, number, number] = [229, 231, 235];
    const GREEN: [number, number, number] = [16, 149, 106];
    const GREEN_BG: [number, number, number] = [236, 253, 245];
    const GREEN_BORDER: [number, number, number] = [167, 243, 208];
    const OPT_BG: [number, number, number] = [248, 250, 252];
    const OPT_BORDER: [number, number, number] = [226, 232, 240];
    const RED: [number, number, number] = [220, 38, 38];
    const AMBER: [number, number, number] = [180, 83, 9];
    const AMBER_BG: [number, number, number] = [254, 243, 199];

    let y = MT;
    const checkPage = (need = 20) => {
      if (y + need > PH - MB) {
        doc.addPage();
        y = MT;
        return true;
      }
      return false;
    };

    // Header Bar
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(ML, y, CW, 4, 2, 2, 'F');
    y += 14;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...PRIMARY);
    doc.text(`QnA Hub — ${titleLabel}`, ML, y);
    y += 18;

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(
      `${visibleQuestions.length} questions  ·  Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })}`,
      ML,
      y
    );
    y += 12;

    // Separator
    doc.setDrawColor(...LINE);
    doc.setLineWidth(1);
    doc.line(ML, y, ML + CW, y);
    y += 16;

    visibleQuestions.forEach((q, qi) => {
      const isDoneQ = completedIds.has(q.id);
      const isWeakQ = weakIds.has(q.id);
      const tag = customTags[q.id] || q.tag;
      const note = notes[q.id];
      const qLabel = `Q${qNum(q.id)}`;

      // Calculate Question layout
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const badgeW = doc.getTextWidth(qLabel) + 12;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      const qLines = doc.splitTextToSize(q.question || '', CW - badgeW - 10);
      const qLineH = 14.5;
      const qTextH = qLines.length * qLineH;
      const qBoxH = Math.max(18, qTextH);

      checkPage(qBoxH + 25);

      // Draw Badge
      const badgeColor: [number, number, number] = isDoneQ ? [16, 149, 106] : isWeakQ ? [220, 38, 38] : PRIMARY;
      doc.setFillColor(...badgeColor);
      doc.roundedRect(ML, y, badgeW, 16, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(qLabel, ML + 6, y + 11.5);

      // Draw Question Text
      const qColor: [number, number, number] = isDoneQ ? [16, 149, 106] : isWeakQ ? RED : DARK;
      doc.setTextColor(...qColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      qLines.forEach((line: string, li: number) => {
        doc.text(line, ML + badgeW + 8, y + 11.5 + li * qLineH);
      });
      y += qBoxH + 4;

      // Lesson Tag
      if (q.lesson && q.lesson !== 'General') {
        checkPage(14);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        doc.text(`[ ${q.lesson} ]`, ML + 4, y + 9);
        y += 14;
      }

      // Options
      if (showOpts && q.options && q.options.length > 0) {
        y += 2;
        q.options.forEach((opt, oi) => {
          const letter = String.fromCharCode(65 + oi);
          const isCorrect = showAns && q.answerKey && q.answerKey.toUpperCase() === letter;

          doc.setFont('helvetica', isCorrect ? 'bold' : 'normal');
          doc.setFontSize(9.5);
          const optLines = doc.splitTextToSize(opt || '', CW - 36);
          const optLineH = 13.5;
          const padY = 5;
          const rowH = Math.max(20, optLines.length * optLineH + padY * 2);

          checkPage(rowH + 4);

          // Row background
          doc.setFillColor(...(isCorrect ? GREEN_BG : OPT_BG));
          doc.setDrawColor(...(isCorrect ? GREEN_BORDER : OPT_BORDER));
          doc.setLineWidth(0.75);
          doc.roundedRect(ML, y, CW, rowH, 3, 3, 'FD');

          // Option Letter Circle Badge
          const circleY = y + padY + 5.5;
          const circleColor: [number, number, number] = isCorrect ? GREEN : [100, 116, 139];
          doc.setFillColor(...circleColor);
          doc.circle(ML + 12, circleY, 6.5, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text(letter, ML + 9.5, circleY + 2.8);

          // Option Text lines
          doc.setFont('helvetica', isCorrect ? 'bold' : 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(...(isCorrect ? GREEN : BODY));
          optLines.forEach((line: string, li: number) => {
            doc.text(line, ML + 26, y + padY + 9 + li * optLineH);
          });

          y += rowH + 4;
        });
        y += 2;
      }

      // Answer
      if (showAns) {
        const ansLine =
          (q.answerKey ? `Correct Answer: [ Option ${q.answerKey} ] ` : 'Correct Answer: ') +
          (q.answerText ? `— ${q.answerText}` : '');
        if (ansLine.trim()) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          const aLines = doc.splitTextToSize(ansLine, CW - 16);
          const aBoxH = aLines.length * 13.5 + 8;
          checkPage(aBoxH + 4);

          doc.setFillColor(240, 253, 244);
          doc.setDrawColor(187, 247, 208);
          doc.setLineWidth(0.5);
          doc.roundedRect(ML, y, CW, aBoxH, 2, 2, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(...GREEN);
          aLines.forEach((line: string, li: number) => {
            doc.text(line, ML + 8, y + 9.5 + li * 13.5);
          });
          y += aBoxH + 4;
        }
      }

      // Explanation
      if (showExp && q.explanation) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        const expLines = doc.splitTextToSize(`Explanation: ${q.explanation}`, CW - 16);
        const expBoxH = expLines.length * 12.5 + 8;
        checkPage(expBoxH + 4);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.roundedRect(ML, y, CW, expBoxH, 2, 2, 'FD');

        doc.setTextColor(...BODY);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        expLines.forEach((line: string, li: number) => {
          doc.text(line, ML + 8, y + 9 + li * 12.5);
        });
        y += expBoxH + 4;
      }

      // Tags
      if (showTags && tag) {
        checkPage(14);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(`Tag: ${tag}`, ML + 4, y + 8);
        y += 12;
      }

      // Notes
      if (note) {
        checkPage(14);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        const noteLines = doc.splitTextToSize(`Note: ${note}`, CW - 16);
        const noteH = noteLines.length * 12 + 6;
        checkPage(noteH + 4);

        doc.setFillColor(...AMBER_BG);
        doc.roundedRect(ML, y, CW, noteH, 2, 2, 'F');
        doc.setTextColor(...AMBER);
        noteLines.forEach((line: string, li: number) => {
          doc.text(line, ML + 6, y + 8.5 + li * 12);
        });
        y += noteH + 4;
      }

      // Divider
      y += 4;
      if (qi < visibleQuestions.length - 1) {
        checkPage(14);
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.75);
        doc.line(ML, y, ML + CW, y);
        y += 12;
      }
    });

    // Page numbers & Running Footer
    const pageCount = (doc.internal as any).getNumberOfPages
      ? (doc.internal as any).getNumberOfPages()
      : (doc as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`Page ${i} of ${pageCount}`, PW / 2, PH - 20, { align: 'center' });
      doc.text('QnA Hub', ML, PH - 20);
      doc.text(new Date().toLocaleDateString(), PW - MR, PH - 20, { align: 'right' });
    }

    doc.save(`QnA_${(titleLabel || 'export').replace(/[^a-z0-9]/gi, '_')}.pdf`);
    showToast('PDF exported! ✓');
  } catch (err: any) {
    console.error('PDF error', err);
    showToast('PDF failed: ' + err.message, 'error');
  } finally {
    if (setIsExporting) setIsExporting(false);
  }
}
