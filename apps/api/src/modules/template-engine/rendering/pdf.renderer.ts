import { InvoiceData, TemplateDefinitionDto, buildRenderModel, SharedRenderModel } from '@docflow/shared-types';
import { InvoiceRenderer } from './renderer.interface';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

interface RenderContext {
  doc: any;
  model: SharedRenderModel;
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
  // Totals block anchor: always right half of page, independent of column positions
  totalsStartX: number;
  totalsWidth: number;

  // Signature area
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
        const model = buildRenderModel(data, template);

        const doc = new PDFDocument({
          size: model.theme.pageSize === 'LETTER' ? 'LETTER' : 'A4',
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

        const { primary: primaryColor, text: textColor, muted: mutedColor, border: borderColor, tableHeaderBg: headerBgColor, tableHeaderText: headerTextColor, zebraBg: zebraBgColor } = model.theme.colors;

        // Totals anchor: right 45% of content width, always stable regardless of column layout
        const totalsStartX = leftMargin + contentWidth * 0.55;
        const totalsWidth = contentWidth * 0.45;

        const ctx: RenderContext = {
          doc,
          model,
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

          totalsStartX,
          totalsWidth,

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
          if (model.watermark.enabled && model.watermark.text) {
            doc.save();
            doc.opacity(model.watermark.opacity);
            doc.fillColor(mutedColor);
            doc.fontSize(48);
            doc.font(model.theme.fonts.heading);
            doc.translate(pageWidth / 2, doc.page.height / 2);
            doc.rotate(-model.watermark.angle);
            doc.text(model.watermark.text, -200, -24, { width: 400, align: 'center' });
            doc.restore();
          }
        };

        drawPageBackground();
        doc.on('pageAdded', drawPageBackground);

        // Core rendering sequence
        this.drawHeader(ctx);
        this.drawItemsTable(ctx);
        this.drawTotals(ctx);
        this.drawNotes(ctx);
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
    if (ctx.model.logo.enabled && ctx.model.logo.url) {
      const logoAlign = ctx.model.logo.position || 'left';
      const logoX = logoAlign === 'right'
        ? ctx.leftMargin + ctx.contentWidth * 0.5 - ctx.model.logo.maxWidth
        : logoAlign === 'center'
          ? ctx.leftMargin + (ctx.contentWidth * 0.5 - ctx.model.logo.maxWidth) / 2
          : ctx.leftMargin;
      this.drawBase64Image(ctx, ctx.model.logo.url, logoX, leftY, { fit: [ctx.model.logo.maxWidth, logoHeight] });
      leftY += logoHeight + SPACING.sm;
    }

    if (ctx.model.customer.showBillTo) {
      leftY += SPACING.md;
      
      ctx.doc.font(ctx.model.theme.fonts.heading).fillColor(ctx.primaryColor).fontSize(ctx.model.theme.baseFontSize - 1);
      const billToHeading = ctx.model.customer.heading.toUpperCase();
      ctx.doc.text(billToHeading, ctx.leftMargin, leftY, { width: ctx.leftColWidth });
      leftY += ctx.doc.heightOfString(billToHeading, { width: ctx.leftColWidth }) + SPACING.sm;

      ctx.doc.fillColor(ctx.textColor).fontSize(ctx.model.theme.baseFontSize);
      if (ctx.model.customer.name) {
        ctx.doc.font(ctx.model.theme.fonts.heading);
        ctx.doc.text(ctx.model.customer.name, ctx.leftMargin, leftY, { width: ctx.leftColWidth });
        leftY += ctx.doc.heightOfString(ctx.model.customer.name, { width: ctx.leftColWidth }) + SPACING.sm;
      }

      ctx.doc.font(ctx.model.theme.fonts.body).fillColor(ctx.mutedColor).fontSize(ctx.model.theme.baseFontSize - 1);
      ctx.model.customer.lines.forEach(line => {
        ctx.doc.text(line, ctx.leftMargin, leftY, { width: ctx.leftColWidth });
        leftY += ctx.doc.heightOfString(line, { width: ctx.leftColWidth });
      });
      ctx.model.customer.fields.forEach(field => {
        if (field.value) {
          ctx.doc.text(field.value, ctx.leftMargin, leftY, { width: ctx.leftColWidth });
          leftY += ctx.doc.heightOfString(field.value, { width: ctx.leftColWidth });
        }
      });
    }

    // RIGHT COLUMN: Title + Company Info
    if (ctx.model.header.showTitle) {
      const titleText = ctx.model.header.titleText.toUpperCase();
      ctx.doc.fillColor(ctx.primaryColor).font(ctx.model.theme.fonts.heading).fontSize(ctx.model.theme.baseFontSize + 12);
      ctx.doc.text(titleText, ctx.rightColStartX, rightY, { width: ctx.rightColWidth, align: 'right' });
      rightY += ctx.doc.heightOfString(titleText, { width: ctx.rightColWidth, align: 'right' }) + SPACING.xs;

      if (ctx.model.header.accentBar) {
        ctx.doc.strokeColor(ctx.primaryColor).lineWidth(1.5).moveTo(ctx.rightColStartX, rightY).lineTo(ctx.leftMargin + ctx.contentWidth, rightY).stroke();
        rightY += SPACING.sm;
      }
    }

    // Fixed two-column layout for document details:
    // Label column is fixed at 80pt; value is right-aligned to the right edge.
    const META_LABEL_WIDTH = 80;
    const META_VALUE_X = ctx.rightColStartX + ctx.rightColWidth - META_LABEL_WIDTH;
    ctx.model.metadata.fields.forEach(f => {
      rightY += this.drawMetadataRow(ctx, f.label, f.value, rightY, META_LABEL_WIDTH, META_VALUE_X) + SPACING.xs;
    });

    rightY += SPACING.sm;
    ctx.doc.font(ctx.model.theme.fonts.heading).fillColor(ctx.textColor).fontSize(ctx.model.theme.baseFontSize);
    ctx.doc.text(ctx.model.company.name, ctx.rightColStartX, rightY, { width: ctx.rightColWidth, align: 'right' });
    rightY += ctx.doc.heightOfString(ctx.model.company.name, { width: ctx.rightColWidth, align: 'right' }) + SPACING.xs;

    ctx.doc.font(ctx.model.theme.fonts.body).fillColor(ctx.mutedColor).fontSize(ctx.model.theme.baseFontSize - 1);
    ctx.model.company.lines.forEach(line => {
      ctx.doc.text(line, ctx.rightColStartX, rightY, { width: ctx.rightColWidth, align: 'right' });
      rightY += ctx.doc.heightOfString(line, { width: ctx.rightColWidth, align: 'right' });
    });

    ctx.model.company.fields.forEach(field => {
      if (field.value) {
        const labelMapping: Record<string, string> = {
          email: 'Email: ',
          website: 'Website: ',
          phone: 'Phone: ',
          taxId: 'GSTIN/VAT: ',
          cin: 'CIN: ',
          pan: 'PAN: '
        };
        const prefix = labelMapping[field.key] || `${field.label}: `;
        const fullTxt = `${prefix}${field.value}`;
        ctx.doc.text(fullTxt, ctx.rightColStartX, rightY, { width: ctx.rightColWidth, align: 'right' });
        rightY += ctx.doc.heightOfString(fullTxt, { width: ctx.rightColWidth, align: 'right' });
      }
    });

    ctx.y = Math.max(leftY, rightY) + SPACING.xl;
  }

  private drawItemsTable(ctx: RenderContext) {
    // Inner cell horizontal padding to prevent text collision between adjacent columns
    const CELL_PAD_H = 3;
    const CELL_PAD_V = 4; // vertical padding inside a row (top + bottom combined)
    const tableHeaderHeight = 20;

    // Build column geometry from model — columns are pre-normalized and sorted by buildRenderModel
    const preparedColumns = (() => {
      let x = ctx.leftMargin;
      return ctx.model.table.columns.map(col => {
        const fullWidth = (col.width / 100) * ctx.contentWidth;
        const colX = x;
        x += fullWidth;
        // Inner text render area: shrink by horizontal padding on each side
        const textX = colX + CELL_PAD_H;
        const textWidth = fullWidth - CELL_PAD_H * 2;
        const align = col.align as 'left' | 'center' | 'right' | 'justify';
        return { ...col, fullWidth, colX, textX, textWidth, align };
      });
    })();

    const drawTableHeader = (headerY: number) => {
      ctx.doc.fillColor(ctx.headerBgColor);
      ctx.doc.rect(ctx.leftMargin, headerY, ctx.contentWidth, tableHeaderHeight).fill();
      ctx.doc.fillColor(ctx.headerTextColor).font(ctx.model.theme.fonts.heading).fontSize(ctx.model.theme.baseFontSize - 1);

      preparedColumns.forEach(col => {
        const textH = ctx.doc.heightOfString(col.label.toUpperCase(), { width: col.textWidth });
        const textY = headerY + (tableHeaderHeight - textH) / 2;
        ctx.doc.text(col.label.toUpperCase(), col.textX, textY, { width: col.textWidth, align: col.align, lineBreak: false });
      });
    };

    drawTableHeader(ctx.y);
    ctx.y += tableHeaderHeight;

    ctx.doc.font(ctx.model.theme.fonts.body).fontSize(ctx.model.theme.baseFontSize - 1);

    ctx.model.table.rows.forEach((row, rIdx) => {
      const isZebra = ctx.model.table.zebra && rIdx % 2 === 1;

      // Dynamic row height: measure each cell text
      ctx.doc.font(ctx.model.theme.fonts.body).fontSize(ctx.model.theme.baseFontSize - 1);
      let rowHeight = CELL_PAD_V * 2 + ctx.doc.currentLineHeight(true);
      preparedColumns.forEach(col => {
        const txt = row.cells[col.key] || '';
        const cellH = ctx.doc.heightOfString(txt, { width: col.textWidth }) + CELL_PAD_V * 2;
        if (cellH > rowHeight) rowHeight = cellH;
      });

      this.ensurePageSpace(ctx, rowHeight, () => {
        drawTableHeader(ctx.y);
        ctx.y += tableHeaderHeight;
        ctx.doc.font(ctx.model.theme.fonts.body).fontSize(ctx.model.theme.baseFontSize - 1);
      });

      if (isZebra) {
        ctx.doc.fillColor(ctx.zebraBgColor);
        ctx.doc.rect(ctx.leftMargin, ctx.y, ctx.contentWidth, rowHeight).fill();
      }

      ctx.doc.fillColor(ctx.textColor);
      preparedColumns.forEach(col => {
        const txt = row.cells[col.key] || '';
        const textH = ctx.doc.heightOfString(txt, { width: col.textWidth });
        const textY = ctx.y + (rowHeight - textH) / 2;
        // Render text within padded cell area to prevent clipping/overflow into adjacent columns
        ctx.doc.text(txt, col.textX, textY, { width: col.textWidth, align: col.align });
      });

      if (ctx.model.table.showBorders) {
        ctx.doc.strokeColor(ctx.borderColor).lineWidth(0.5)
          .moveTo(ctx.leftMargin, ctx.y + rowHeight).lineTo(ctx.leftMargin + ctx.contentWidth, ctx.y + rowHeight).stroke();
      }

      ctx.y += rowHeight;
    });

    if (ctx.model.table.showBorders) {
      ctx.doc.strokeColor(ctx.borderColor).lineWidth(1)
        .moveTo(ctx.leftMargin, ctx.y).lineTo(ctx.leftMargin + ctx.contentWidth, ctx.y).stroke();
    }

    ctx.y += 16; // gap before totals
  }

  /**
   * Renders the Totals block. Always anchored to the right 45% of the page,
   * independent of column layout. Dynamically renders from model.totals.rows
   * respecting visibility, order, labels and emphasis styling.
   */
  private drawTotals(ctx: RenderContext) {
    const SPACING = { xs: 4, sm: 8, md: 12 };
    const totalsRows = ctx.model.totals.rows;
    if (totalsRows.length === 0) return;

    // Measure total height needed
    let totalsHeight = 0;
    totalsRows.forEach(row => {
      const fontSize = row.emphasis ? ctx.model.theme.baseFontSize + 1 : ctx.model.theme.baseFontSize - 1;
      ctx.doc.font(row.emphasis ? ctx.model.theme.fonts.heading : ctx.model.theme.fonts.body).fontSize(fontSize);
      const rowH = ctx.doc.currentLineHeight(true);
      if (row.emphasis) {
        totalsHeight += rowH + 6 + SPACING.xs; // banner: 3px padding top+bottom + gap
      } else {
        totalsHeight += rowH + SPACING.xs;
      }
    });

    this.ensurePageSpace(ctx, totalsHeight + SPACING.sm);

    let totalsY = ctx.y;
    totalsRows.forEach(row => {
      const rowH = this.drawTotalsRow(ctx, `${row.label}: `, row.value, totalsY, row.emphasis);
      totalsY += rowH + SPACING.xs;
    });

    ctx.y = totalsY + SPACING.md;
  }

  /**
   * Renders Notes below the Totals block as a full-width banner.
   */
  private drawNotes(ctx: RenderContext) {
    const SPACING = { xs: 4, sm: 8, md: 12 };
    const notesText = ctx.model.notes.text;
    if (!ctx.model.notes.show || !notesText) return;

    ctx.doc.font(ctx.model.theme.fonts.heading).fontSize(ctx.model.theme.baseFontSize - 1);
    const headingH = ctx.doc.heightOfString(ctx.model.notes.heading.toUpperCase(), { width: ctx.contentWidth });
    ctx.doc.font(ctx.model.theme.fonts.body).fontSize(ctx.model.theme.baseFontSize - 1);
    const textH = ctx.doc.heightOfString(notesText, { width: ctx.contentWidth - SPACING.sm * 2 });
    const notesHeight = headingH + textH + SPACING.sm * 2 + SPACING.xs;

    this.ensurePageSpace(ctx, notesHeight);

    ctx.doc.fillColor(ctx.model.theme.colors.zebraBg || '#F3F4F6');
    ctx.doc.roundedRect(ctx.leftMargin, ctx.y, ctx.contentWidth, notesHeight, 3).fill();

    ctx.doc.font(ctx.model.theme.fonts.heading).fillColor(ctx.primaryColor).fontSize(ctx.model.theme.baseFontSize - 1);
    const notesHeading = ctx.model.notes.heading.toUpperCase();
    ctx.doc.text(notesHeading, ctx.leftMargin + SPACING.sm, ctx.y + SPACING.sm, { width: ctx.contentWidth - SPACING.sm * 2 });

    ctx.doc.font(ctx.model.theme.fonts.body).fillColor(ctx.textColor).fontSize(ctx.model.theme.baseFontSize - 1);
    ctx.doc.text(notesText, ctx.leftMargin + SPACING.sm, ctx.y + SPACING.sm + headingH + SPACING.xs, { width: ctx.contentWidth - SPACING.sm * 2 });

    ctx.y += notesHeight + SPACING.md;
  }

  private drawFooterBlocks(ctx: RenderContext) {
    const SPACING = { xs: 4, sm: 8, md: 12 };
    const blocks = ctx.model.footerBlocks.filter(b => b.key !== 'signature' && b.key !== 'footer');

    blocks.forEach(block => {
      if (block.key === 'payment' && block.data.show && block.data.instructions) {
        const blockHeight = this.getPaymentBlockHeight(ctx);
        this.ensurePageSpace(ctx, blockHeight);

        ctx.doc.font(ctx.model.theme.fonts.heading).fillColor(ctx.primaryColor).fontSize(ctx.model.theme.baseFontSize);
        const headingText = block.data.heading.toUpperCase();
        ctx.doc.text(headingText, ctx.leftMargin, ctx.y, { width: ctx.contentWidth });
        ctx.y += ctx.doc.heightOfString(headingText, { width: ctx.contentWidth }) + SPACING.sm;

        ctx.doc.font(ctx.model.theme.fonts.body).fillColor(ctx.mutedColor).fontSize(ctx.model.theme.baseFontSize - 1);
        const instrText = block.data.instructions || '';
        ctx.doc.text(instrText, ctx.leftMargin, ctx.y, { width: ctx.contentWidth });
        ctx.y += ctx.doc.heightOfString(instrText, { width: ctx.contentWidth }) + SPACING.md;
      }

      if (block.key === 'bank' && block.data.show && block.data.fields && block.data.fields.length > 0) {
        const blockHeight = this.getBankBlockHeight(ctx, block.data.fields);
        this.ensurePageSpace(ctx, blockHeight);

        ctx.doc.font(ctx.model.theme.fonts.heading).fillColor(ctx.primaryColor).fontSize(ctx.model.theme.baseFontSize);
        const headingText = block.data.heading.toUpperCase();
        ctx.doc.text(headingText, ctx.leftMargin, ctx.y, { width: ctx.contentWidth });
        ctx.y += ctx.doc.heightOfString(headingText, { width: ctx.contentWidth }) + SPACING.sm;

        block.data.fields.forEach((f: any) => {
          ctx.y += this.drawBankDetailsRow(ctx, `${f.label}: `, f.value, ctx.y) + SPACING.xs;
        });
        ctx.y += SPACING.sm;
      }

      if (block.key === 'qr' && block.data.show && block.data.url) {
        const blockHeight = 75 + SPACING.sm;
        this.ensurePageSpace(ctx, blockHeight);
        this.drawBase64Image(ctx, block.data.url, ctx.leftMargin, ctx.y, { width: 75, height: 75 });
        ctx.y += 75 + SPACING.sm;
      }
    });
  }

  private drawSignature(ctx: RenderContext) {
    const sigBlock = ctx.model.footerBlocks.find(b => b.key === 'signature');
    if (!sigBlock || !sigBlock.data.show) return;

    const SPACING = { xs: 4, sm: 8 };
    const sigHeight = sigBlock.data.signatureUrl ? 60 : 36;

    this.ensurePageSpace(ctx, sigHeight + SPACING.sm);

    // Render signature immediately after content — no usableBottom pinning to avoid whitespace gap
    const sigY = ctx.y + SPACING.sm;

    if (sigBlock.data.showStamp && sigBlock.data.stampUrl) {
      this.drawBase64Image(ctx, sigBlock.data.stampUrl, ctx.leftMargin + ctx.contentWidth * 0.45, sigY, { fit: [55, 55] });
    }

    if (sigBlock.data.signatureUrl) {
      this.drawBase64Image(ctx, sigBlock.data.signatureUrl, ctx.sigImageStartX, sigY, { fit: [120, 40] });
    }

    const lineY = sigBlock.data.signatureUrl ? sigY + 44 : sigY + 10;
    ctx.doc.strokeColor(ctx.mutedColor).lineWidth(0.5).moveTo(ctx.sigStartX, lineY).lineTo(ctx.leftMargin + ctx.contentWidth, lineY).stroke();

    ctx.doc.font(ctx.model.theme.fonts.heading).fillColor(ctx.textColor).fontSize(ctx.model.theme.baseFontSize - 1);
    const sigLabel = sigBlock.data.label;
    ctx.doc.text(sigLabel, ctx.sigStartX, lineY + 4, {
      width: ctx.sigWidth,
      align: 'center',
    });

    ctx.y = lineY + 4 + ctx.doc.currentLineHeight(true) + SPACING.xs;
  }

  private drawFooter(ctx: RenderContext) {
    const footerBlock = ctx.model.footerBlocks.find(b => b.key === 'footer');
    if (!footerBlock || !footerBlock.data.show) return;

    const totalPages = ctx.doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      ctx.doc.switchToPage(i);
      
      const oldMargin = ctx.doc.page.margins.bottom;
      ctx.doc.page.margins.bottom = 0;

      ctx.doc.strokeColor(ctx.borderColor).lineWidth(0.5);
      ctx.doc.moveTo(ctx.leftMargin, ctx.doc.page.height - ctx.bottomMargin - 14)
        .lineTo(ctx.pageWidth - ctx.rightMargin, ctx.doc.page.height - ctx.bottomMargin - 14).stroke();

      ctx.doc.font(ctx.model.theme.fonts.body);
      ctx.doc.fontSize(ctx.model.theme.baseFontSize - 2);
      ctx.doc.fillColor(ctx.mutedColor);
      ctx.doc.text(footerBlock.data.text || '', ctx.leftMargin, ctx.doc.page.height - ctx.bottomMargin - 8, {
        width: ctx.contentWidth,
        align: 'center',
      });

      if (footerBlock.data.showPageNumbers) {
        ctx.doc.text(`Page ${i + 1} of ${totalPages}`, ctx.leftMargin, ctx.doc.page.height - ctx.bottomMargin - 8, {
          width: ctx.contentWidth,
          align: 'right',
        });
      }
      
      ctx.doc.page.margins.bottom = oldMargin;
    }
  }

  // ========================================================
  // Low-level Layout Helpers (Private)
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

  /**
   * Renders a document-details metadata row with a fixed two-column layout.
   * Label is left-aligned in a fixed-width column; value is right-aligned.
   */
  private drawMetadataRow(
    ctx: RenderContext,
    label: string,
    value: string,
    startY: number,
    labelColWidth: number,
    valueColX: number
  ): number {
    ctx.doc.save();
    const fontSize = ctx.model.theme.baseFontSize - 1;
    ctx.doc.fontSize(fontSize);

    // Label: bold, left-aligned, fixed column
    ctx.doc.font(ctx.model.theme.fonts.heading).fillColor(ctx.mutedColor);
    ctx.doc.text(`${label}:`, ctx.rightColStartX, startY, { width: labelColWidth, lineBreak: false });

    // Value: body, right-aligned within remaining width
    const remainingWidth = ctx.rightColWidth - labelColWidth - 4;
    ctx.doc.font(ctx.model.theme.fonts.body).fillColor(ctx.textColor);
    ctx.doc.text(value, valueColX, startY, { width: remainingWidth, align: 'right', lineBreak: false });

    ctx.doc.restore();
    return ctx.doc.currentLineHeight(true);
  }

  /**
   * Renders a single totals row anchored to the right 45% of the content area.
   * Grand Total (emphasis=true) renders with a primary-color banner.
   */
  private drawTotalsRow(ctx: RenderContext, label: string, value: string, startY: number, emphasis: boolean): number {
    ctx.doc.save();

    const fontSize = emphasis ? ctx.model.theme.baseFontSize + 1 : ctx.model.theme.baseFontSize - 1;
    const font = emphasis ? ctx.model.theme.fonts.heading : ctx.model.theme.fonts.body;

    ctx.doc.font(font).fontSize(fontSize);
    const labelWidth = ctx.doc.widthOfString(label);
    const valueWidth = ctx.doc.widthOfString(value);
    const totalRowWidth = ctx.totalsWidth;
    const rightEdge = ctx.totalsStartX + totalRowWidth;

    const GAP = 8;
    // Both label and value are right-aligned to the right edge, label before value
    const valueStartX = rightEdge - valueWidth;
    const labelStartX = valueStartX - labelWidth - GAP;

    // Clamp labelStartX so it doesn't go before totalsStartX
    const clampedLabelX = Math.max(ctx.totalsStartX, labelStartX);

    const textHeight = ctx.doc.currentLineHeight(true);

    if (emphasis) {
      const BANNER_PAD_Y = 3;
      const bannerHeight = textHeight + BANNER_PAD_Y * 2;

      ctx.doc.fillColor(ctx.primaryColor);
      ctx.doc.roundedRect(ctx.totalsStartX, startY, totalRowWidth, bannerHeight, 2).fill();

      ctx.doc.fillColor('#ffffff').font(font).fontSize(fontSize);
      ctx.doc.text(label, clampedLabelX, startY + BANNER_PAD_Y, { lineBreak: false });
      ctx.doc.text(value, valueStartX, startY + BANNER_PAD_Y, { lineBreak: false });

      ctx.doc.restore();
      return bannerHeight;
    } else {
      ctx.doc.strokeColor(ctx.borderColor).lineWidth(0.3)
        .moveTo(ctx.totalsStartX, startY - 1).lineTo(rightEdge, startY - 1).stroke();

      ctx.doc.fillColor(ctx.textColor);
      ctx.doc.text(label, clampedLabelX, startY, { lineBreak: false });
      ctx.doc.text(value, valueStartX, startY, { lineBreak: false });

      ctx.doc.restore();
      return textHeight;
    }
  }

  private drawBankDetailsRow(ctx: RenderContext, label: string, value: string, startY: number): number {
    ctx.doc.save();

    ctx.doc.font(ctx.model.theme.fonts.heading).fontSize(ctx.model.theme.baseFontSize - 1);
    const labelW = ctx.doc.widthOfString(label);
    const GAP = 6;
    const valueStartX = ctx.leftMargin + labelW + GAP;
    const valueWidth = ctx.contentWidth - labelW - GAP;

    ctx.doc.fillColor(ctx.textColor);
    ctx.doc.text(label, ctx.leftMargin, startY, { lineBreak: false });
    const h1 = ctx.doc.currentLineHeight(true);

    ctx.doc.font(ctx.model.theme.fonts.body).fontSize(ctx.model.theme.baseFontSize - 1).fillColor(ctx.mutedColor);
    ctx.doc.text(value, valueStartX, startY, { width: valueWidth, align: 'left' });
    const h2 = ctx.doc.heightOfString(value, { width: valueWidth });

    ctx.doc.restore();
    return Math.max(h1, h2);
  }

  private getPaymentBlockHeight(ctx: RenderContext): number {
    const block = ctx.model.footerBlocks.find(b => b.key === 'payment');
    if (!block || !block.data.show || !block.data.instructions) return 0;
    ctx.doc.save();
    ctx.doc.font(ctx.model.theme.fonts.heading).fontSize(ctx.model.theme.baseFontSize);
    const headingH = ctx.doc.heightOfString(block.data.heading.toUpperCase(), { width: ctx.contentWidth });
    ctx.doc.font(ctx.model.theme.fonts.body).fontSize(ctx.model.theme.baseFontSize - 1);
    const textH = ctx.doc.heightOfString(block.data.instructions, { width: ctx.contentWidth });
    ctx.doc.restore();
    return headingH + 8 + textH + 12;
  }

  private getBankBlockHeight(ctx: RenderContext, sortedBankFields: any[]): number {
    const block = ctx.model.footerBlocks.find(b => b.key === 'bank');
    if (!block || !block.data.show || !sortedBankFields || sortedBankFields.length === 0) return 0;
    ctx.doc.save();
    ctx.doc.font(ctx.model.theme.fonts.heading).fontSize(ctx.model.theme.baseFontSize);
    const headingH = ctx.doc.heightOfString(block.data.heading.toUpperCase(), { width: ctx.contentWidth });
    let bankHeight = headingH + 8;

    sortedBankFields.forEach(f => {
      const txt = f.value;
      if (txt) {
        ctx.doc.font(ctx.model.theme.fonts.heading).fontSize(ctx.model.theme.baseFontSize - 1);
        const labelW = ctx.doc.widthOfString(`${f.label}: `);
        ctx.doc.font(ctx.model.theme.fonts.body).fontSize(ctx.model.theme.baseFontSize - 1);
        const valueW = ctx.doc.widthOfString(txt);
        const rowH = Math.max(
          ctx.doc.heightOfString(`${f.label}: `, { width: labelW }),
          ctx.doc.heightOfString(txt, { width: valueW })
        );
        bankHeight += rowH + 4;
      }
    });
    ctx.doc.restore();
    return bankHeight + 8;
  }
}
