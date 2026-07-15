import { InvoiceData, TemplateDefinitionDto } from '@docflow/shared-types';
import { InvoiceRenderer, formatCurrency, formatDate, replaceTokens } from './renderer.interface';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

interface RenderContext {
  doc: any;
  data: InvoiceData;
  template: TemplateDefinitionDto;
  leftMargin: number;
  rightMargin: number;
  topMargin: number;
  bottomMargin: number;
  pageWidth: number;
  contentWidth: number;
  usableBottom: number;
  y: number;

  // Layout columns and coordinates
  leftColWidth: number;
  rightColStartX: number;
  rightColWidth: number;
  // amountCol is resolved at table-render time from template columns
  amountColX: number;
  amountColWidth: number;
  sigStartX: number;
  sigWidth: number;
  sigImageStartX: number;

  // Colors & styles
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  headerBgColor: string;
  headerTextColor: string;
  zebraBgColor: string;
}

export class PdfRenderer implements InvoiceRenderer {
  render(data: InvoiceData, template: TemplateDefinitionDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: template.page.size === 'LETTER' ? 'LETTER' : 'A4',
          margins: {
            top: template.page.margins.top,
            bottom: template.page.margins.bottom,
            left: template.page.margins.left,
            right: template.page.margins.right,
          },
          bufferPages: true,
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });

        const leftMargin = template.page.margins.left;
        const rightMargin = template.page.margins.right;
        const topMargin = template.page.margins.top;
        const bottomMargin = template.page.margins.bottom;
        const pageWidth = doc.page.width;
        const contentWidth = pageWidth - leftMargin - rightMargin;

        const usableBottom = doc.page.height - bottomMargin - (template.footer.show ? 24 : 0);

        const { primary: primaryColor, text: textColor, muted: mutedColor, border: borderColor, tableHeaderBg: headerBgColor, tableHeaderText: headerTextColor, zebraBg: zebraBgColor } = template.theme.colors;

        const ctx: RenderContext = {
          doc,
          data,
          template,
          leftMargin,
          rightMargin,
          topMargin,
          bottomMargin,
          pageWidth,
          contentWidth,
          usableBottom,
          y: topMargin,

          leftColWidth: contentWidth * 0.5,
          rightColStartX: leftMargin + contentWidth * 0.55,
          rightColWidth: contentWidth * 0.45,
          // Will be set during drawItemsTable from the amount/last column
          amountColX: leftMargin + contentWidth * 0.52,
          amountColWidth: contentWidth * 0.48,
          sigStartX: leftMargin + contentWidth * 0.62,
          sigWidth: contentWidth * 0.38,
          sigImageStartX: leftMargin + contentWidth * 0.7,

          primaryColor,
          textColor,
          mutedColor,
          borderColor,
          headerBgColor,
          headerTextColor,
          zebraBgColor,
        };

        const drawPageBackground = () => {
          if (template.watermark.enabled && template.watermark.text) {
            doc.save();
            doc.opacity(template.watermark.opacity);
            doc.fillColor(mutedColor);
            doc.fontSize(48);
            doc.font(template.theme.fonts.heading);
            doc.translate(pageWidth / 2, doc.page.height / 2);
            doc.rotate(-template.watermark.angle);
            doc.text(template.watermark.text, -200, -24, { width: 400, align: 'center' });
            doc.restore();
          }
        };

        drawPageBackground();
        doc.on('pageAdded', drawPageBackground);

        // Core rendering sequence
        this.drawHeader(ctx);
        this.drawItemsTable(ctx);
        this.drawNotesAndTotals(ctx);
        this.drawFooterBlocks(ctx);
        this.drawSignature(ctx);
        this.drawFooter(ctx);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ========================================================
  // Core Drawing Methods (Private)
  // ========================================================

  private drawHeader(ctx: RenderContext) {
    const SPACING = { xs: 4, sm: 8, md: 12, xl: 20 };
    const headerYStart = ctx.y;
    let leftY = headerYStart;
    let rightY = headerYStart;

    // LEFT COLUMN: Logo + Bill To
    const logoHeight = 50;
    if (ctx.template.logo.enabled && ctx.data.logoUrl) {
      const logoAlign = ctx.template.logo.position || 'left';
      const logoX = logoAlign === 'right'
        ? ctx.leftMargin + ctx.contentWidth * 0.5 - ctx.template.logo.maxWidth
        : logoAlign === 'center'
          ? ctx.leftMargin + (ctx.contentWidth * 0.5 - ctx.template.logo.maxWidth) / 2
          : ctx.leftMargin;
      this.drawBase64Image(ctx, ctx.data.logoUrl, logoX, leftY, { fit: [ctx.template.logo.maxWidth, logoHeight] });
      leftY += logoHeight + SPACING.sm;
    }

    if (ctx.template.customer.showBillTo) {
      leftY += SPACING.md;
      
      ctx.doc.font(ctx.template.theme.fonts.heading).fillColor(ctx.primaryColor).fontSize(ctx.template.theme.baseFontSize - 1);
      const billToHeading = ctx.template.customer.billToHeading.toUpperCase();
      ctx.doc.text(billToHeading, ctx.leftMargin, leftY, { width: ctx.leftColWidth });
      leftY += ctx.doc.heightOfString(billToHeading, { width: ctx.leftColWidth }) + SPACING.sm;

      ctx.doc.fillColor(ctx.textColor).fontSize(ctx.template.theme.baseFontSize);
      if (ctx.data.billTo.name) {
        ctx.doc.font(ctx.template.theme.fonts.heading);
        ctx.doc.text(ctx.data.billTo.name, ctx.leftMargin, leftY, { width: ctx.leftColWidth });
        leftY += ctx.doc.heightOfString(ctx.data.billTo.name, { width: ctx.leftColWidth }) + SPACING.sm;
      }

      ctx.doc.font(ctx.template.theme.fonts.body).fillColor(ctx.mutedColor).fontSize(ctx.template.theme.baseFontSize - 1);
      ctx.data.billTo.lines.forEach(line => {
        ctx.doc.text(line, ctx.leftMargin, leftY, { width: ctx.leftColWidth });
        leftY += ctx.doc.heightOfString(line, { width: ctx.leftColWidth });
      });
      if (ctx.data.billTo.phone) {
        ctx.doc.text(ctx.data.billTo.phone, ctx.leftMargin, leftY, { width: ctx.leftColWidth });
        leftY += ctx.doc.heightOfString(ctx.data.billTo.phone, { width: ctx.leftColWidth });
      }
      if (ctx.data.billTo.email) {
        ctx.doc.text(ctx.data.billTo.email, ctx.leftMargin, leftY, { width: ctx.leftColWidth });
        leftY += ctx.doc.heightOfString(ctx.data.billTo.email, { width: ctx.leftColWidth });
      }
      if (ctx.data.billTo.taxId) {
        ctx.doc.font(ctx.template.theme.fonts.heading);
        ctx.doc.text(ctx.data.billTo.taxId, ctx.leftMargin, leftY, { width: ctx.leftColWidth });
        leftY += ctx.doc.heightOfString(ctx.data.billTo.taxId, { width: ctx.leftColWidth });
      }
    }

    // RIGHT COLUMN: Title + Company Info
    if (ctx.template.header.showTitle) {
      const titleText = replaceTokens(ctx.template.header.titleText, ctx.data).toUpperCase();
      ctx.doc.fillColor(ctx.primaryColor).font(ctx.template.theme.fonts.heading).fontSize(ctx.template.theme.baseFontSize + 12);
      ctx.doc.text(titleText, ctx.rightColStartX, rightY, { width: ctx.rightColWidth, align: 'right' });
      rightY += ctx.doc.heightOfString(titleText, { width: ctx.rightColWidth, align: 'right' }) + SPACING.xs;

      if (ctx.template.header.accentBar) {
        ctx.doc.strokeColor(ctx.primaryColor).lineWidth(1.5).moveTo(ctx.rightColStartX, rightY).lineTo(ctx.leftMargin + ctx.contentWidth, rightY).stroke();
        rightY += SPACING.sm;
      }
    }

    if (ctx.template.documentDetails.show) {
      const sortedMetaFields = [...ctx.template.documentDetails.fields].sort((a, b) => a.order - b.order);
      sortedMetaFields.forEach(f => {
        if (!f.visible) return;
        let valText = '';
        if (f.key === 'number') valText = ctx.data.documentNumber;
        else if (f.key === 'date') valText = formatDate(ctx.data.issueDate);
        else if (f.key === 'dueDate' && ctx.data.dueDate) valText = formatDate(ctx.data.dueDate);
        else if (f.key === 'terms') valText = 'Due on Receipt';

        if (valText) {
          rightY += this.drawMetadataRow(ctx, `${f.label}: `, valText, rightY) + SPACING.xs;
        }
      });
    }

    rightY += SPACING.sm;
    ctx.doc.font(ctx.template.theme.fonts.heading).fillColor(ctx.textColor).fontSize(ctx.template.theme.baseFontSize);
    ctx.doc.text(ctx.data.organization.name, ctx.rightColStartX, rightY, { width: ctx.rightColWidth, align: 'right' });
    rightY += ctx.doc.heightOfString(ctx.data.organization.name, { width: ctx.rightColWidth, align: 'right' }) + SPACING.xs;

    ctx.doc.font(ctx.template.theme.fonts.body).fillColor(ctx.mutedColor).fontSize(ctx.template.theme.baseFontSize - 1);
    ctx.data.organization.lines.forEach(line => {
      ctx.doc.text(line, ctx.rightColStartX, rightY, { width: ctx.rightColWidth, align: 'right' });
      rightY += ctx.doc.heightOfString(line, { width: ctx.rightColWidth, align: 'right' });
    });

    [
      ctx.data.organization.email ? `Email: ${ctx.data.organization.email}` : null,
      ctx.data.organization.website ? `Website: ${ctx.data.organization.website}` : null,
      ctx.data.organization.phone ? `Phone: ${ctx.data.organization.phone}` : null,
      ctx.data.organization.taxId ? `GSTIN/VAT: ${ctx.data.organization.taxId}` : null,
      ctx.data.organization.cin ? `CIN: ${ctx.data.organization.cin}` : null,
      ctx.data.organization.pan ? `PAN: ${ctx.data.organization.pan}` : null,
    ]
      .filter(Boolean)
      .forEach(detail => {
        const txt = detail as string;
        ctx.doc.text(txt, ctx.rightColStartX, rightY, { width: ctx.rightColWidth, align: 'right' });
        rightY += ctx.doc.heightOfString(txt, { width: ctx.rightColWidth, align: 'right' });
      });

    ctx.y = Math.max(leftY, rightY) + SPACING.xl;
  }

  private drawItemsTable(ctx: RenderContext) {
    const CELL_PAD_V = 4; // vertical padding inside a row (top + bottom combined)
    const tableHeaderHeight = 18;

    const sortedColumns = [...ctx.template.table.columns]
      .filter(c => c.visible)
      .sort((a, b) => a.order - b.order);

    // Build column geometry from template — no padding offsets, no overrides.
    // colX is the left edge of each column cell; cellWidth is the full template width.
    const preparedColumns = (() => {
      let x = ctx.leftMargin;
      return sortedColumns.map(col => {
        const cellWidth = ((col.width || 10) / 100) * ctx.contentWidth;
        const align = (col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left') as 'left' | 'center' | 'right' | 'justify';
        const colX = x;
        x += cellWidth;
        return { ...col, cellWidth, align, colX };
      });
    })();

    // Anchor totals to the rightmost visible column (amount or last column).
    // This makes the totals block track the Amount column width/position exactly.
    const amountCol = preparedColumns.find(c => c.key === 'amount') ?? preparedColumns[preparedColumns.length - 1];
    if (amountCol) {
      ctx.amountColX = amountCol.colX;
      ctx.amountColWidth = amountCol.cellWidth;
    }

    const drawTableHeader = (headerY: number) => {
      ctx.doc.fillColor(ctx.headerBgColor);
      ctx.doc.rect(ctx.leftMargin, headerY, ctx.contentWidth, tableHeaderHeight).fill();
      ctx.doc.fillColor(ctx.headerTextColor).font(ctx.template.theme.fonts.heading).fontSize(ctx.template.theme.baseFontSize - 1);

      preparedColumns.forEach(col => {
        const textH = ctx.doc.heightOfString(col.label.toUpperCase(), { width: col.cellWidth });
        const textY = headerY + (tableHeaderHeight - textH) / 2;
        ctx.doc.text(col.label.toUpperCase(), col.colX, textY, { width: col.cellWidth, align: col.align });
      });
    };

    drawTableHeader(ctx.y);
    ctx.y += tableHeaderHeight;

    ctx.doc.font(ctx.template.theme.fonts.body).fontSize(ctx.template.theme.baseFontSize - 1);

    ctx.data.items.forEach((item, rIdx) => {
      const isZebra = ctx.template.table.zebra && rIdx % 2 === 1;

      // Dynamic row height: measure each cell using the exact template column width.
      ctx.doc.font(ctx.template.theme.fonts.body).fontSize(ctx.template.theme.baseFontSize - 1);
      let rowHeight = CELL_PAD_V * 2;
      preparedColumns.forEach(col => {
        const txt = this.getCellText(ctx.data, item, col.key);
        const cellH = ctx.doc.heightOfString(txt, { width: col.cellWidth }) + CELL_PAD_V * 2;
        if (cellH > rowHeight) rowHeight = cellH;
      });

      this.ensurePageSpace(ctx, rowHeight, () => {
        drawTableHeader(ctx.y);
        ctx.y += tableHeaderHeight;
        ctx.doc.font(ctx.template.theme.fonts.body).fontSize(ctx.template.theme.baseFontSize - 1);
      });

      if (isZebra) {
        ctx.doc.fillColor(ctx.zebraBgColor);
        ctx.doc.rect(ctx.leftMargin, ctx.y, ctx.contentWidth, rowHeight).fill();
      }

      // Render each cell: start at colX (template position), full cellWidth, template align.
      ctx.doc.fillColor(ctx.textColor);
      preparedColumns.forEach(col => {
        const txt = this.getCellText(ctx.data, item, col.key);
        const textH = ctx.doc.heightOfString(txt, { width: col.cellWidth });
        // Vertically center within the row
        const textY = ctx.y + (rowHeight - textH) / 2;
        ctx.doc.text(txt, col.colX, textY, { width: col.cellWidth, align: col.align });
      });

      if (ctx.template.table.showBorders) {
        ctx.doc.strokeColor(ctx.borderColor).lineWidth(0.5)
          .moveTo(ctx.leftMargin, ctx.y).lineTo(ctx.leftMargin + ctx.contentWidth, ctx.y).stroke();
      }

      ctx.y += rowHeight;
    });

    if (ctx.template.table.showBorders) {
      ctx.doc.strokeColor(ctx.borderColor).lineWidth(1)
        .moveTo(ctx.leftMargin, ctx.y).lineTo(ctx.leftMargin + ctx.contentWidth, ctx.y).stroke();
    }

    ctx.y += 16; // SPACING.lg
  }

  private drawNotesAndTotals(ctx: RenderContext) {
    const SPACING = { xs: 4, sm: 8, md: 12, xl: 20 };
    const totalsRows = [...ctx.template.totals.rows]
      .filter(r => r.visible)
      .sort((a, b) => a.order - b.order);

    const notesText = (ctx.data.notes || ctx.template.notes.text || '').trim();
    const showNotes = ctx.template.notes.show && !!notesText;

    // ---- Measure totals height ----
    let totalsHeight = 0;
    totalsRows.forEach(row => {
      const val = this.getRowValue(ctx.data, row.key);
      const formattedVal = formatCurrency(val, ctx.data.currencySymbol);
      const labelText = `${row.label}: `;
      const fontSize = row.emphasis ? ctx.template.theme.baseFontSize + 1 : ctx.template.theme.baseFontSize - 1;
      ctx.doc.font(row.emphasis ? ctx.template.theme.fonts.heading : ctx.template.theme.fonts.body).fontSize(fontSize);
      const labelW = ctx.doc.widthOfString(labelText);
      const valueW = ctx.doc.widthOfString(formattedVal);
      const rowTextH = Math.max(
        ctx.doc.heightOfString(labelText, { width: labelW }),
        ctx.doc.heightOfString(formattedVal, { width: valueW })
      );
      if (row.emphasis) {
        totalsHeight += rowTextH + SPACING.xs * 2 + SPACING.xs; // banner padding + gap
      } else {
        totalsHeight += rowTextH + SPACING.xs;
      }
    });

    this.ensurePageSpace(ctx, totalsHeight);

    // ---- Render totals (right-aligned block) ----
    let totalsY = ctx.y;
    totalsRows.forEach(row => {
      const val = this.getRowValue(ctx.data, row.key);
      const formattedVal = formatCurrency(val, ctx.data.currencySymbol);
      totalsY += this.drawTotalsRow(ctx, `${row.label}: `, formattedVal, totalsY, row.emphasis) + SPACING.xs;
    });

    ctx.y = totalsY + SPACING.md;

    // ---- Render notes BELOW totals as full-width block ----
    if (showNotes) {
      ctx.doc.font(ctx.template.theme.fonts.heading).fontSize(ctx.template.theme.baseFontSize - 1);
      const headingH = ctx.doc.heightOfString((ctx.template.notes.heading || 'Notes').toUpperCase(), { width: ctx.contentWidth });
      ctx.doc.font(ctx.template.theme.fonts.body).fontSize(ctx.template.theme.baseFontSize - 1);
      const textH = ctx.doc.heightOfString(notesText, { width: ctx.contentWidth - SPACING.sm * 2 });
      const notesHeight = headingH + textH + SPACING.sm * 2 + SPACING.xs;

      this.ensurePageSpace(ctx, notesHeight);

      ctx.doc.fillColor(ctx.template.theme.colors.border || '#F3F4F6');
      ctx.doc.roundedRect(ctx.leftMargin, ctx.y, ctx.contentWidth, notesHeight, 3).fill();

      ctx.doc.font(ctx.template.theme.fonts.heading).fillColor(ctx.primaryColor).fontSize(ctx.template.theme.baseFontSize - 1);
      const notesHeading = (ctx.template.notes.heading || 'Notes').toUpperCase();
      ctx.doc.text(notesHeading, ctx.leftMargin + SPACING.sm, ctx.y + SPACING.sm, { width: ctx.contentWidth - SPACING.sm * 2 });

      ctx.doc.font(ctx.template.theme.fonts.body).fillColor(ctx.textColor).fontSize(ctx.template.theme.baseFontSize - 1);
      ctx.doc.text(notesText, ctx.leftMargin + SPACING.sm, ctx.y + SPACING.sm + headingH + SPACING.xs, { width: ctx.contentWidth - SPACING.sm * 2 });

      ctx.y += notesHeight + SPACING.md;
    }

    ctx.y += SPACING.sm;
  }

  private drawFooterBlocks(ctx: RenderContext) {
    const SPACING = { xs: 4, sm: 8, md: 12 };
    const footerBlocks = ctx.template.footerBlocks || [
      { key: 'payment', label: 'Payment Instructions', visible: ctx.template.payment.show, order: 0 },
      { key: 'bank', label: 'Bank Details', visible: ctx.template.bank.show, order: 1 },
      { key: 'qr', label: 'QR Code', visible: true, order: 2 },
      { key: 'signature', label: 'Signature', visible: ctx.template.signature.show, order: 3 },
    ];

    const sortedBankFields = ctx.template.bank.show && ctx.data.bank
      ? [...ctx.template.bank.fields].sort((a, b) => a.order - b.order)
      : [];

    [...footerBlocks]
      .filter(b => b.key !== 'signature')
      .sort((a, b) => a.order - b.order)
      .forEach(block => {
        if (!block.visible) return;

        if (block.key === 'payment' && ctx.template.payment.show && ctx.template.payment.instructions) {
          const blockHeight = this.getPaymentBlockHeight(ctx);
          this.ensurePageSpace(ctx, blockHeight);

          ctx.doc.font(ctx.template.theme.fonts.heading).fillColor(ctx.primaryColor);
          const headingText = (ctx.template.payment.heading || 'Payment Instructions').toUpperCase();
          ctx.doc.text(headingText, ctx.leftMargin, ctx.y, { width: ctx.contentWidth });
          ctx.y += ctx.doc.heightOfString(headingText, { width: ctx.contentWidth }) + SPACING.sm;

          ctx.doc.font(ctx.template.theme.fonts.body).fillColor(ctx.mutedColor).fontSize(ctx.template.theme.baseFontSize - 1);
          const instrText = ctx.template.payment.instructions || '';
          ctx.doc.text(instrText, ctx.leftMargin, ctx.y, { width: ctx.contentWidth });
          ctx.y += ctx.doc.heightOfString(instrText, { width: ctx.contentWidth }) + SPACING.md;
        }

        if (block.key === 'bank' && ctx.template.bank.show && ctx.data.bank) {
          const blockHeight = this.getBankBlockHeight(ctx, sortedBankFields);
          this.ensurePageSpace(ctx, blockHeight);

          ctx.doc.font(ctx.template.theme.fonts.heading).fillColor(ctx.primaryColor);
          const headingText = (ctx.template.bank.heading || 'Bank Details').toUpperCase();
          ctx.doc.text(headingText, ctx.leftMargin, ctx.y, { width: ctx.contentWidth });
          ctx.y += ctx.doc.heightOfString(headingText, { width: ctx.contentWidth }) + SPACING.sm;

          sortedBankFields.forEach(f => {
            if (!f.visible) return;
            const txt = this.getBankValue(ctx.data, f.key);
            if (txt) {
              ctx.y += this.drawBankDetailsRow(ctx, `${f.label}: `, txt, ctx.y) + SPACING.xs;
            }
          });
        }

        if (block.key === 'qr' && ctx.data.qrUrl) {
          const blockHeight = 75 + SPACING.sm;
          this.ensurePageSpace(ctx, blockHeight);
          this.drawBase64Image(ctx, ctx.data.qrUrl, ctx.leftMargin, ctx.y, { width: 75, height: 75 });
          ctx.y += 75 + SPACING.sm;
        }
      });
  }

  private drawSignature(ctx: RenderContext) {
    if (!ctx.template.signature.show) return;

    const sigHeight = ctx.data.signatureUrl ? 80 : 50;
    const stampOffset = (ctx.template.signature.showStamp && ctx.data.stampUrl) ? 10 : 0;

    this.ensurePageSpace(ctx, sigHeight + stampOffset);

    // Pin signature just above footer, but never leave a large blank gap
    const sigY = Math.max(ctx.y + 8, ctx.usableBottom - sigHeight);

    // Draw stamp if enabled
    if (ctx.template.signature.showStamp && ctx.data.stampUrl) {
      this.drawBase64Image(ctx, ctx.data.stampUrl, ctx.leftMargin + ctx.contentWidth * 0.45, sigY - 10, { fit: [60, 60] });
    }

    if (ctx.data.signatureUrl) {
      this.drawBase64Image(ctx, ctx.data.signatureUrl, ctx.sigImageStartX, sigY, { fit: [120, 40] });
    }

    const lineY = ctx.data.signatureUrl ? sigY + 44 : sigY + 10;
    ctx.doc.strokeColor(ctx.mutedColor).lineWidth(0.5).moveTo(ctx.sigStartX, lineY).lineTo(ctx.leftMargin + ctx.contentWidth, lineY).stroke();

    ctx.doc.font(ctx.template.theme.fonts.heading).fillColor(ctx.textColor).fontSize(ctx.template.theme.baseFontSize - 1);
    const sigLabel = ctx.template.signature.label || 'Authorised Signatory';
    ctx.doc.text(sigLabel, ctx.sigStartX, lineY + 4, {
      width: ctx.sigWidth,
      align: 'center',
    });
  }

  private drawFooter(ctx: RenderContext) {
    if (!ctx.template.footer.show) return;

    const totalPages = ctx.doc.bufferedPageRange().count;
    const currentPageIndex = ctx.doc.bufferedPageRange().start + totalPages - 1;
    for (let i = 0; i < totalPages; i++) {
      ctx.doc.switchToPage(i);
      const oldY = ctx.doc.y;
      const oldMargin = ctx.doc.page.margins.bottom;
      ctx.doc.page.margins.bottom = 0;

      ctx.doc.strokeColor(ctx.borderColor).lineWidth(0.5).moveTo(ctx.leftMargin, ctx.doc.page.height - ctx.bottomMargin - 14).lineTo(ctx.pageWidth - ctx.rightMargin, ctx.doc.page.height - ctx.bottomMargin - 14).stroke();

      ctx.doc.font(ctx.template.theme.fonts.body).fontSize(ctx.template.theme.baseFontSize - 2).fillColor(ctx.mutedColor);
      ctx.doc.text(ctx.template.footer.text || '', ctx.leftMargin, ctx.doc.page.height - ctx.bottomMargin - 8, {
        width: ctx.contentWidth,
        align: 'center',
      });

      if (ctx.template.footer.showPageNumbers) {
        ctx.doc.text(`Page ${i + 1} of ${totalPages}`, ctx.leftMargin, ctx.doc.page.height - ctx.bottomMargin - 8, {
          width: ctx.contentWidth,
          align: 'right',
        });
      }

      ctx.doc.page.margins.bottom = oldMargin;
      ctx.doc.y = oldY;
    }
    ctx.doc.switchToPage(currentPageIndex);
  }

  // ========================================================
  // Layout Helper Functions (Private)
  // ========================================================

  private drawBase64Image(ctx: RenderContext, base64Url: string, x: number, y: number, options: any) {
    try {
      const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, '');
      const imgBuffer = Buffer.from(base64Data, 'base64');
      ctx.doc.image(imgBuffer, x, y, options);
    } catch (err) {
      console.error('Failed to render base64 image in PDF:', err);
    }
  }

  private ensurePageSpace(ctx: RenderContext, requiredHeight: number, onPageAdded?: () => void) {
    if (ctx.y + requiredHeight > ctx.usableBottom) {
      ctx.doc.addPage();
      ctx.y = ctx.topMargin;
      if (onPageAdded) {
        onPageAdded();
      }
    }
  }

  private drawMetadataRow(ctx: RenderContext, label: string, value: string, startY: number): number {
    ctx.doc.save();

    // Measure widest visible label so all values share one vertical alignment column
    const visibleFields = ctx.template.documentDetails.fields
      .filter(f => f.visible)
      .filter(f => {
        if (f.key === 'number') return !!ctx.data.documentNumber;
        if (f.key === 'date') return !!ctx.data.issueDate;
        if (f.key === 'dueDate') return !!ctx.data.dueDate;
        if (f.key === 'terms') return true;
        return false;
      });

    ctx.doc.font(ctx.template.theme.fonts.heading).fontSize(ctx.template.theme.baseFontSize - 1);
    const widestLabelW = visibleFields.reduce((max, f) => {
      const w = ctx.doc.widthOfString(`${f.label}: `);
      return w > max ? w : max;
    }, 0);

    // Value column starts right after the widest label (+ 4pt gap)
    const GAP = 4;
    const labelStartX = ctx.leftMargin + ctx.contentWidth - widestLabelW - GAP - ctx.doc.widthOfString(value);
    const valueStartX = ctx.leftMargin + ctx.contentWidth - ctx.doc.widthOfString(value);

    ctx.doc.font(ctx.template.theme.fonts.heading).fontSize(ctx.template.theme.baseFontSize - 1).fillColor(ctx.textColor);
    ctx.doc.text(label, ctx.rightColStartX, startY, { width: widestLabelW, align: 'right' });
    const h1 = ctx.doc.heightOfString(label, { width: widestLabelW });

    ctx.doc.font(ctx.template.theme.fonts.body).fontSize(ctx.template.theme.baseFontSize - 1).fillColor(ctx.textColor);
    ctx.doc.text(value, valueStartX, startY, { lineBreak: false });
    const h2 = ctx.doc.currentLineHeight(true);

    ctx.doc.restore();
    return Math.max(h1, h2);
  }

  private drawTotalsRow(ctx: RenderContext, label: string, value: string, startY: number, emphasis: boolean): number {
    ctx.doc.save();

    const fontSize = emphasis ? ctx.template.theme.baseFontSize + 1 : ctx.template.theme.baseFontSize - 1;
    const font = emphasis ? ctx.template.theme.fonts.heading : ctx.template.theme.fonts.body;

    ctx.doc.font(font).fontSize(fontSize);

    // The totals block is anchored to the Amount column from the template.
    // ctx.amountColX / ctx.amountColWidth are set during drawItemsTable from the
    // actual amount (or last) column geometry — no hardcoded ratios.
    const colStartX = ctx.amountColX;
    const colWidth = ctx.amountColWidth;

    // Value is right-aligned inside the amount column (mirrors the column's own alignment).
    const valueW = ctx.doc.widthOfString(value);
    const valueStartX = colStartX + colWidth - valueW;

    // Label sits to the left of the amount column, right-aligned up to colStartX.
    const labelW = ctx.doc.widthOfString(label);
    const GAP = 8;
    const labelStartX = colStartX - labelW - GAP;

    const textHeight = ctx.doc.currentLineHeight(true);

    if (emphasis) {
      const BANNER_PAD_Y = 4;
      const BANNER_PAD_X = 4;
      // Banner spans from label start to right edge, anchored to amount column
      const bannerStartX = Math.max(ctx.leftMargin, labelStartX - BANNER_PAD_X);
      const bannerWidth = ctx.leftMargin + ctx.contentWidth - bannerStartX;
      const bannerHeight = textHeight + BANNER_PAD_Y * 2;

      ctx.doc.fillColor(ctx.primaryColor);
      ctx.doc.roundedRect(bannerStartX, startY, bannerWidth, bannerHeight, 2).fill();

      ctx.doc.fillColor('#ffffff').font(font).fontSize(fontSize);
      ctx.doc.text(label, labelStartX, startY + BANNER_PAD_Y, { lineBreak: false });
      ctx.doc.text(value, valueStartX, startY + BANNER_PAD_Y, { lineBreak: false });

      ctx.doc.restore();
      return bannerHeight;
    } else {
      ctx.doc.fillColor(ctx.textColor);
      ctx.doc.text(label, labelStartX, startY, { lineBreak: false });
      ctx.doc.text(value, valueStartX, startY, { lineBreak: false });

      ctx.doc.restore();
      return textHeight;
    }
  }

  private drawBankDetailsRow(ctx: RenderContext, label: string, value: string, startY: number): number {
    ctx.doc.save();

    // Measure the label width naturally; value starts right after
    ctx.doc.font(ctx.template.theme.fonts.heading).fontSize(ctx.template.theme.baseFontSize - 1);
    const labelW = ctx.doc.widthOfString(label);
    const GAP = 6;
    const valueStartX = ctx.leftMargin + labelW + GAP;
    const valueWidth = ctx.contentWidth - labelW - GAP;

    ctx.doc.fillColor(ctx.textColor);
    ctx.doc.text(label, ctx.leftMargin, startY, { lineBreak: false });
    const h1 = ctx.doc.currentLineHeight(true);

    ctx.doc.font(ctx.template.theme.fonts.body).fontSize(ctx.template.theme.baseFontSize - 1).fillColor(ctx.mutedColor);
    ctx.doc.text(value, valueStartX, startY, { width: valueWidth, align: 'left' });
    const h2 = ctx.doc.heightOfString(value, { width: valueWidth });

    ctx.doc.restore();
    return Math.max(h1, h2);
  }

  private getCellText(data: InvoiceData, item: any, colKey: string): string {
    switch (colKey) {
      case 'index': return String(item.index);
      case 'sku': return item.sku || '';
      case 'description': return item.description || '';
      case 'type': return item.type || '';
      case 'quantity': return String(item.quantity || 0);
      case 'unit': return item.unit || 'PCS';
      case 'rate': return formatCurrency(item.rate || 0, data.currencySymbol);
      case 'tax': return item.taxLabel || 'EXEMPT';
      case 'amount': return formatCurrency(item.amount || 0, data.currencySymbol);
      default: return String(item.customFields?.[colKey] || '');
    }
  }

  private getBankValue(data: InvoiceData, key: string): string {
    if (!data.bank) return '';
    switch (key) {
      case 'bankName': return data.bank.bankName || '';
      case 'accountHolder': return data.bank.accountHolder || '';
      case 'accountNumber': return data.bank.accountNumber || '';
      case 'iban': return data.bank.iban || '';
      case 'bic': return data.bank.bic || '';
      default: return '';
    }
  }

  private getRowValue(data: InvoiceData, key: string): number {
    switch (key) {
      case 'subtotal': return data.subtotal;
      case 'discount': return data.discount;
      case 'tax': return data.taxTotal;
      case 'shipping': return data.shipping;
      case 'grandTotal': return data.grandTotal;
      default: return 0;
    }
  }

  private getPaymentBlockHeight(ctx: RenderContext): number {
    if (!ctx.template.payment.show || !ctx.template.payment.instructions) return 0;
    ctx.doc.save();
    ctx.doc.font(ctx.template.theme.fonts.heading).fontSize(ctx.template.theme.baseFontSize);
    const headingH = ctx.doc.heightOfString((ctx.template.payment.heading || 'Payment Instructions').toUpperCase(), { width: ctx.contentWidth });
    ctx.doc.font(ctx.template.theme.fonts.body).fontSize(ctx.template.theme.baseFontSize - 1);
    const textH = ctx.doc.heightOfString(ctx.template.payment.instructions, { width: ctx.contentWidth });
    ctx.doc.restore();
    return headingH + 8 + textH + 12; // SPACING.sm + heading + SPACING.md
  }

  private getBankBlockHeight(ctx: RenderContext, sortedBankFields: any[]): number {
    if (!ctx.template.bank.show || !ctx.data.bank) return 0;
    ctx.doc.save();
    ctx.doc.font(ctx.template.theme.fonts.heading).fontSize(ctx.template.theme.baseFontSize);
    const headingH = ctx.doc.heightOfString((ctx.template.bank.heading || 'Bank Details').toUpperCase(), { width: ctx.contentWidth });
    let bankHeight = headingH + 8; // SPACING.sm

    sortedBankFields.forEach(f => {
      if (!f.visible) return;
      const txt = this.getBankValue(ctx.data, f.key);
      if (txt) {
        ctx.doc.font(ctx.template.theme.fonts.heading).fontSize(ctx.template.theme.baseFontSize - 1);
        const labelW = ctx.doc.widthOfString(`${f.label}: `);
        ctx.doc.font(ctx.template.theme.fonts.body).fontSize(ctx.template.theme.baseFontSize - 1);
        const valueW = ctx.doc.widthOfString(txt);
        const rowH = Math.max(
          ctx.doc.heightOfString(`${f.label}: `, { width: labelW }),
          ctx.doc.heightOfString(txt, { width: valueW })
        );
        bankHeight += rowH + 4; // SPACING.xs
      }
    });
    ctx.doc.restore();
    return bankHeight + 8; // SPACING.sm
  }
}
