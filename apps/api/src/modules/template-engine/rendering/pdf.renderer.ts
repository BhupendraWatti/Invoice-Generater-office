import { InvoiceData, TemplateDefinitionDto } from '@docflow/shared-types';
import { InvoiceRenderer, formatCurrency, formatDate, replaceTokens } from './renderer.interface';
import PDFDocument from 'pdfkit';

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

        const primaryColor = template.theme.colors.primary;
        const textColor = template.theme.colors.text;
        const mutedColor = template.theme.colors.muted;
        const borderColor = template.theme.colors.border;
        const headerBgColor = template.theme.colors.tableHeaderBg;
        const headerTextColor = template.theme.colors.tableHeaderText;
        const zebraBgColor = template.theme.colors.zebraBg;

        const leftMargin = template.page.margins.left;
        const rightMargin = template.page.margins.right;
        const topMargin = template.page.margins.top;
        const bottomMargin = template.page.margins.bottom;
        const pageWidth = doc.page.width;
        const contentWidth = pageWidth - leftMargin - rightMargin;

        let y = topMargin;

        // Draw Watermark in Background
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

        // 0. Branding Logo
        if (data.logoUrl) {
          try {
            const base64Data = data.logoUrl.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            doc.image(imgBuffer, leftMargin, y, { fit: [140, 50] });
            y += 62;
          } catch (err) {
            console.error('Failed to draw logo in PDF:', err);
          }
        }

        // 1. Header Title
        if (template.header.showTitle) {
          const titleText = replaceTokens(template.header.titleText, data);
          doc.fillColor(primaryColor);
          doc.font(template.theme.fonts.heading);
          doc.fontSize(template.theme.baseFontSize + 12);
          doc.text(titleText.toUpperCase(), leftMargin, y);
          y += 24;

          if (template.header.accentBar) {
            doc.strokeColor(primaryColor);
            doc.lineWidth(2);
            doc.moveTo(leftMargin, y).lineTo(leftMargin + contentWidth, y).stroke();
            y += 12;
          }
        }

        // 2. Org Info & Doc Meta details (Side-by-side)
        const orgYStart = y;
        doc.fillColor(textColor);
        doc.fontSize(template.theme.baseFontSize);

        let orgY = orgYStart;
        if (template.organization.showHeading) {
          doc.font(template.theme.fonts.heading);
          doc.text(template.organization.heading, leftMargin, orgY, { width: contentWidth * 0.55 });
          orgY += 14;
        }

        const sortedOrgFields = [...template.organization.fields].sort((a, b) => a.order - b.order);
        sortedOrgFields.forEach(f => {
          if (!f.visible) return;
          doc.font(template.theme.fonts.body);
          doc.fillColor(textColor);
          
          if (f.key === 'name' && data.organization.name) {
            doc.font(template.theme.fonts.heading);
            doc.text(data.organization.name, leftMargin, orgY, { width: contentWidth * 0.55 });
            orgY += 14;
          } else if (f.key === 'addressLine1' && data.organization.lines[0]) {
            doc.fillColor(mutedColor);
            doc.text(data.organization.lines[0], leftMargin, orgY, { width: contentWidth * 0.55 });
            orgY += 12;
          } else if (f.key === 'addressLine2' && data.organization.lines[1]) {
            doc.fillColor(mutedColor);
            doc.text(data.organization.lines[1], leftMargin, orgY, { width: contentWidth * 0.55 });
            orgY += 12;
          } else if (f.key === 'city' && data.organization.lines[2]) {
            doc.fillColor(mutedColor);
            doc.text(data.organization.lines[2], leftMargin, orgY, { width: contentWidth * 0.55 });
            orgY += 12;
          } else if (f.key === 'taxId' && data.organization.taxId) {
            doc.fillColor(mutedColor);
            doc.text(`${f.label}: ${data.organization.taxId}`, leftMargin, orgY, { width: contentWidth * 0.55 });
            orgY += 12;
          }
        });

        let metaY = orgYStart;
        if (template.documentDetails.show) {
          const sortedMetaFields = [...template.documentDetails.fields].sort((a, b) => a.order - b.order);
          sortedMetaFields.forEach(f => {
            if (!f.visible) return;
            let valText = '';
            if (f.key === 'number') valText = data.documentNumber;
            else if (f.key === 'date') valText = formatDate(data.issueDate);
            else if (f.key === 'dueDate' && data.dueDate) valText = formatDate(data.dueDate);
            else if (f.key === 'terms') valText = 'Due on Receipt';

            if (valText) {
              doc.font(template.theme.fonts.heading);
              doc.fillColor(textColor);
              doc.text(`${f.label}: `, leftMargin + contentWidth * 0.6, metaY, { width: contentWidth * 0.4, align: 'right', continued: true });
              doc.font(template.theme.fonts.body);
              doc.text(valText, { align: 'right' });
              metaY += 14;
            }
          });
        }

        y = Math.max(orgY, metaY) + 18;

        // 3. Customer Address Row (Bill To / Ship To)
        const addrYStart = y;
        let billY = addrYStart;
        if (template.customer.showBillTo) {
          doc.font(template.theme.fonts.heading);
          doc.fillColor(primaryColor);
          doc.text(template.customer.billToHeading.toUpperCase(), leftMargin, billY, { width: contentWidth * 0.45 });
          billY += 14;

          const sortedCustFields = [...template.customer.fields].sort((a, b) => a.order - b.order);
          sortedCustFields.forEach(f => {
            if (!f.visible) return;
            doc.fillColor(textColor);
            if (f.key === 'name' && data.billTo.name) {
              doc.font(template.theme.fonts.heading);
              doc.text(data.billTo.name, leftMargin, billY, { width: contentWidth * 0.45 });
              billY += 14;
            } else if (f.key === 'addressLine1' && data.billTo.lines[0]) {
              doc.font(template.theme.fonts.body);
              doc.fillColor(mutedColor);
              doc.text(data.billTo.lines[0], leftMargin, billY, { width: contentWidth * 0.45 });
              billY += 12;
            } else if (f.key === 'addressLine2' && data.billTo.lines[1]) {
              doc.font(template.theme.fonts.body);
              doc.fillColor(mutedColor);
              doc.text(data.billTo.lines[1], leftMargin, billY, { width: contentWidth * 0.45 });
              billY += 12;
            } else if (f.key === 'city' && data.billTo.lines[2]) {
              doc.font(template.theme.fonts.body);
              doc.fillColor(mutedColor);
              doc.text(data.billTo.lines[2], leftMargin, billY, { width: contentWidth * 0.45 });
              billY += 12;
            } else if (f.key === 'email' && data.billTo.email) {
              doc.font(template.theme.fonts.body);
              doc.fillColor(mutedColor);
              doc.text(data.billTo.email, leftMargin, billY, { width: contentWidth * 0.45 });
              billY += 12;
            } else if (f.key === 'phone' && data.billTo.phone) {
              doc.font(template.theme.fonts.body);
              doc.fillColor(mutedColor);
              doc.text(data.billTo.phone, leftMargin, billY, { width: contentWidth * 0.45 });
              billY += 12;
            }
          });
        }

        let shipY = addrYStart;
        if (template.customer.showShipTo && data.shipTo) {
          doc.font(template.theme.fonts.heading);
          doc.fillColor(primaryColor);
          doc.text(template.customer.shipToHeading.toUpperCase(), leftMargin + contentWidth * 0.52, shipY, { width: contentWidth * 0.48 });
          shipY += 14;

          doc.fillColor(textColor);
          doc.text(data.shipTo.name, leftMargin + contentWidth * 0.52, shipY, { width: contentWidth * 0.48 });
          shipY += 14;

          doc.font(template.theme.fonts.body);
          doc.fillColor(mutedColor);
          data.shipTo.lines.forEach(ln => {
            doc.text(ln, leftMargin + contentWidth * 0.52, shipY, { width: contentWidth * 0.48 });
            shipY += 12;
          });
        }

        y = Math.max(billY, shipY) + 20;

        // 4. Items Table
        const sortedColumns = [...template.table.columns]
          .filter(c => c.visible)
          .sort((a, b) => a.order - b.order);

        // Header Row
        doc.fillColor(headerBgColor);
        doc.rect(leftMargin, y, contentWidth, 18).fill();
        
        doc.fillColor(headerTextColor);
        doc.font(template.theme.fonts.heading);
        doc.fontSize(template.theme.baseFontSize - 1);

        let colX = leftMargin;
        sortedColumns.forEach(col => {
          const cellWidth = (col.width / 100) * contentWidth;
          const align = col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left';
          doc.text(col.label.toUpperCase(), colX + 4, y + 4, { width: cellWidth - 8, align });
          colX += cellWidth;
        });

        y += 18;

        // Table Data Lines
        doc.font(template.theme.fonts.body);
        doc.fontSize(template.theme.baseFontSize - 1);

        data.items.forEach((item, rIdx) => {
          const isZebra = template.table.zebra && rIdx % 2 === 1;
          
          if (isZebra) {
            doc.fillColor(zebraBgColor);
            doc.rect(leftMargin, y, contentWidth, 16).fill();
          }

          doc.fillColor(textColor);
          let itemX = leftMargin;
          
          sortedColumns.forEach(col => {
            const cellWidth = (col.width / 100) * contentWidth;
            const align = col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left';

            let txt = '';
            if (col.key === 'index') txt = String(item.index);
            else if (col.key === 'sku') txt = item.sku;
            else if (col.key === 'description') txt = item.description;
            else if (col.key === 'type') txt = item.type || '';
            else if (col.key === 'quantity') txt = String(item.quantity);
            else if (col.key === 'unit') txt = item.unit;
            else if (col.key === 'rate') txt = formatCurrency(item.rate, data.currencySymbol);
            else if (col.key === 'tax') txt = item.taxLabel;
            else if (col.key === 'amount') txt = formatCurrency(item.amount, data.currencySymbol);

            doc.text(txt, itemX + 4, y + 4, { width: cellWidth - 8, align });
            itemX += cellWidth;
          });

          // Table borders
          if (template.table.showBorders) {
            doc.strokeColor(borderColor);
            doc.lineWidth(0.5);
            doc.moveTo(leftMargin, y).lineTo(leftMargin + contentWidth, y).stroke();
          }

          y += 16;
        });

        // Bottom border of table
        if (template.table.showBorders) {
          doc.strokeColor(borderColor);
          doc.lineWidth(1);
          doc.moveTo(leftMargin, y).lineTo(leftMargin + contentWidth, y).stroke();
        }

        y += 16;

        // 5. Totals & Notes block (Side-by-side)
        const summaryYStart = y;
        let notesY = summaryYStart;
        if (template.notes.show && (data.notes || template.notes.text)) {
          doc.font(template.theme.fonts.heading);
          doc.fillColor(primaryColor);
          doc.text(template.notes.heading.toUpperCase(), leftMargin, notesY, { width: contentWidth * 0.52 });
          notesY += 14;

          doc.font(template.theme.fonts.body);
          doc.fillColor(mutedColor);
          doc.text(data.notes || template.notes.text, leftMargin, notesY, { width: contentWidth * 0.52 });
        }

        let totalsY = summaryYStart;
        const totalsRows = [...template.totals.rows]
          .filter(r => r.visible)
          .sort((a, b) => a.order - b.order);

        totalsRows.forEach(row => {
          let val = 0;
          if (row.key === 'subtotal') val = data.subtotal;
          else if (row.key === 'discount') val = data.discount;
          else if (row.key === 'tax') val = data.taxTotal;
          else if (row.key === 'shipping') val = data.shipping;
          else if (row.key === 'grandTotal') val = data.grandTotal;

          const formattedVal = formatCurrency(val, data.currencySymbol);

          doc.font(row.emphasis ? template.theme.fonts.heading : template.theme.fonts.body);
          doc.fillColor(row.emphasis ? primaryColor : textColor);
          
          doc.text(`${row.label}: `, leftMargin + contentWidth * 0.55, totalsY, { width: contentWidth * 0.45, align: 'right', continued: true });
          doc.text(formattedVal, { align: 'right' });
          totalsY += 14;
        });

        y = Math.max(notesY + doc.heightOfString(data.notes || template.notes.text || '', { width: contentWidth * 0.52 }), totalsY) + 20;

        // 6. Payment Instructions & Bank Details
        const infoYStart = y;
        let payY = infoYStart;
        if (template.payment.show && template.payment.instructions) {
          doc.font(template.theme.fonts.heading);
          doc.fillColor(primaryColor);
          doc.text(template.payment.heading.toUpperCase(), leftMargin, payY, { width: contentWidth * 0.45 });
          payY += 14;

          doc.font(template.theme.fonts.body);
          doc.fillColor(mutedColor);
          doc.text(template.payment.instructions, leftMargin, payY, { width: contentWidth * 0.45 });
          
          if (data.qrUrl) {
            try {
              const base64Data = data.qrUrl.replace(/^data:image\/\w+;base64,/, '');
              const imgBuffer = Buffer.from(base64Data, 'base64');
              const instHeight = doc.heightOfString(template.payment.instructions, { width: contentWidth * 0.45 });
              doc.image(imgBuffer, leftMargin, payY + instHeight + 8, { width: 80, height: 80 });
              payY += instHeight + 92;
            } catch (err) {
              console.error('Failed to draw QR in PDF:', err);
              payY += doc.heightOfString(template.payment.instructions, { width: contentWidth * 0.45 });
            }
          } else {
            payY += doc.heightOfString(template.payment.instructions, { width: contentWidth * 0.45 });
          }
        }

        let bankY = infoYStart;
        if (template.bank.show && data.bank) {
          doc.font(template.theme.fonts.heading);
          doc.fillColor(primaryColor);
          doc.text(template.bank.heading.toUpperCase(), leftMargin + contentWidth * 0.52, bankY, { width: contentWidth * 0.48 });
          bankY += 14;

          const sortedBank = [...template.bank.fields].sort((a, b) => a.order - b.order);
          sortedBank.forEach(f => {
            if (!f.visible) return;
            let txt = '';
            if (f.key === 'bankName') txt = data.bank?.bankName || '';
            else if (f.key === 'accountHolder') txt = data.bank?.accountHolder || '';
            else if (f.key === 'accountNumber') txt = data.bank?.accountNumber || '';
            else if (f.key === 'iban') txt = data.bank?.iban || '';
            else if (f.key === 'bic') txt = data.bank?.bic || '';

            if (txt) {
              doc.font(template.theme.fonts.heading);
              doc.fillColor(textColor);
              doc.text(`${f.label}: `, leftMargin + contentWidth * 0.52, bankY, { width: contentWidth * 0.48, continued: true });
              doc.font(template.theme.fonts.body);
              doc.fillColor(mutedColor);
              doc.text(txt);
              bankY += 12;
            }
          });
        }

        y = Math.max(payY, bankY) + 20;

        // 7. Signature stamp
        if (template.signature.show) {
          y += 24;
          doc.strokeColor(mutedColor);
          doc.lineWidth(0.5);
          doc.moveTo(leftMargin + contentWidth * 0.65, y).lineTo(leftMargin + contentWidth, y).stroke();
          
          y += 4;
          doc.font(template.theme.fonts.heading);
          doc.fillColor(textColor);
          doc.text(template.signature.label, leftMargin + contentWidth * 0.65, y, { width: contentWidth * 0.35, align: 'center' });
        }

        // 8. Footer (Fixed at the bottom of the page)
        if (template.footer.show) {
          const totalPages = doc.bufferedPageRange().count;
          for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i);
            
            doc.strokeColor(borderColor);
            doc.lineWidth(0.5);
            doc.moveTo(leftMargin, doc.page.height - bottomMargin - 14).lineTo(pageWidth - rightMargin, doc.page.height - bottomMargin - 14).stroke();

            doc.font(template.theme.fonts.body);
            doc.fontSize(template.theme.baseFontSize - 2);
            doc.fillColor(mutedColor);
            doc.text(template.footer.text, leftMargin, doc.page.height - bottomMargin - 8, {
              width: contentWidth,
              align: 'center',
            });

            if (template.footer.showPageNumbers) {
              doc.text(`Page ${i + 1} of ${totalPages}`, leftMargin, doc.page.height - bottomMargin - 8, {
                width: contentWidth,
                align: 'right',
              });
            }
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
