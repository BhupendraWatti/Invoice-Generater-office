import { InvoiceData, TemplateDefinitionDto } from '@docflow/shared-types';
import { InvoiceRenderer, formatCurrency, formatDate, replaceTokens } from './renderer.interface';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

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

        const pageBottomY = doc.page.height - bottomMargin;
        const footerReserve = template.footer.show ? 24 : 0;
        const usableBottom = pageBottomY - footerReserve;

        const drawPageBackground = () => {
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
        };

        // Draw background for the first page
        drawPageBackground();

        // Listen for new pages to apply background automatically
        doc.on('pageAdded', () => {
          drawPageBackground();
        });

        let y = topMargin;

        // ========================================================
        // Redesigned Header: Left Column & Right Column
        // ========================================================
        const headerYStart = y;
        let leftY = headerYStart;
        let rightY = headerYStart;

        // LEFT COLUMN: Logo + Bill To
        if (template.logo.enabled && data.logoUrl) {
          try {
            const base64Data = data.logoUrl.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            const logoAlign = template.logo.position || 'left';
            const logoX = logoAlign === 'right' ? leftMargin + contentWidth * 0.5 - template.logo.maxWidth : logoAlign === 'center' ? leftMargin + (contentWidth * 0.5 - template.logo.maxWidth) / 2 : leftMargin;
            doc.image(imgBuffer, logoX, leftY, { fit: [template.logo.maxWidth, 50] });
            leftY += 58;
          } catch (err) {
            console.error('Failed to draw logo in PDF:', err);
          }
        }

        if (template.customer.showBillTo) {
          leftY += 12;
          doc.font(template.theme.fonts.heading);
          doc.fillColor(primaryColor);
          doc.fontSize(template.theme.baseFontSize - 1);
          doc.text(template.customer.billToHeading.toUpperCase(), leftMargin, leftY, { width: contentWidth * 0.5 });
          leftY += 14;

          doc.fillColor(textColor);
          doc.fontSize(template.theme.baseFontSize);
          if (data.billTo.name) {
            doc.font(template.theme.fonts.heading);
            doc.text(data.billTo.name, leftMargin, leftY, { width: contentWidth * 0.5 });
            leftY += 14;
          }

          doc.font(template.theme.fonts.body);
          doc.fillColor(mutedColor);
          doc.fontSize(template.theme.baseFontSize - 1);
          data.billTo.lines.forEach(line => {
            doc.text(line, leftMargin, leftY, { width: contentWidth * 0.5 });
            leftY += 12;
          });
          if (data.billTo.phone) {
            doc.text(data.billTo.phone, leftMargin, leftY, { width: contentWidth * 0.5 });
            leftY += 12;
          }
          if (data.billTo.email) {
            doc.text(data.billTo.email, leftMargin, leftY, { width: contentWidth * 0.5 });
            leftY += 12;
          }
          if (data.billTo.taxId) {
            doc.font(template.theme.fonts.heading);
            doc.text(data.billTo.taxId, leftMargin, leftY, { width: contentWidth * 0.5 });
            leftY += 12;
          }
        }

        // RIGHT COLUMN: Title + Company Info
        const rightX = leftMargin + contentWidth * 0.55;
        const rightWidth = contentWidth * 0.45;

        if (template.header.showTitle) {
          const titleText = replaceTokens(template.header.titleText, data);
          doc.fillColor(primaryColor);
          doc.font(template.theme.fonts.heading);
          doc.fontSize(template.theme.baseFontSize + 12);
          doc.text(titleText.toUpperCase(), rightX, rightY, { width: rightWidth, align: 'right' });
          rightY += 22;

          if (template.header.accentBar) {
            doc.strokeColor(primaryColor);
            doc.lineWidth(1.5);
            doc.moveTo(rightX, rightY).lineTo(leftMargin + contentWidth, rightY).stroke();
            rightY += 10;
          }
        }

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
              doc.fontSize(template.theme.baseFontSize - 1);
              doc.text(`${f.label}: `, rightX, rightY, { width: rightWidth, align: 'right', continued: true });
              doc.font(template.theme.fonts.body);
              doc.text(valText, { align: 'right' });
              rightY += 14;
            }
          });
        }

        rightY += 10;
        doc.font(template.theme.fonts.heading);
        doc.fillColor(textColor);
        doc.fontSize(template.theme.baseFontSize);
        doc.text(data.organization.name, rightX, rightY, { width: rightWidth, align: 'right' });
        rightY += 14;

        doc.font(template.theme.fonts.body);
        doc.fillColor(mutedColor);
        doc.fontSize(template.theme.baseFontSize - 1);
        data.organization.lines.forEach(line => {
          doc.text(line, rightX, rightY, { width: rightWidth, align: 'right' });
          rightY += 12;
        });

        if (data.organization.email) {
          doc.text(`Email: ${data.organization.email}`, rightX, rightY, { width: rightWidth, align: 'right' });
          rightY += 12;
        }
        if (data.organization.website) {
          doc.text(`Website: ${data.organization.website}`, rightX, rightY, { width: rightWidth, align: 'right' });
          rightY += 12;
        }
        if (data.organization.phone) {
          doc.text(`Phone: ${data.organization.phone}`, rightX, rightY, { width: rightWidth, align: 'right' });
          rightY += 12;
        }
        if (data.organization.taxId) {
          doc.text(`GSTIN/VAT: ${data.organization.taxId}`, rightX, rightY, { width: rightWidth, align: 'right' });
          rightY += 12;
        }
        if (data.organization.cin) {
          doc.text(`CIN: ${data.organization.cin}`, rightX, rightY, { width: rightWidth, align: 'right' });
          rightY += 12;
        }
        if (data.organization.pan) {
          doc.text(`PAN: ${data.organization.pan}`, rightX, rightY, { width: rightWidth, align: 'right' });
          rightY += 12;
        }

        y = Math.max(leftY, rightY) + 20;

        // ========================================================
        // 4. Items Table
        // ========================================================
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
          const cellWidth = ((col.width || 10) / 100) * contentWidth;
          const align = col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left';
          doc.text(col.label.toUpperCase(), colX + 4, y + 4, { width: Math.max(0, cellWidth - 8), align });
          colX += cellWidth;
        });

        y += 18;

        // Table Data Lines
        doc.font(template.theme.fonts.body);
        doc.fontSize(template.theme.baseFontSize - 1);

        data.items.forEach((item, rIdx) => {
          const isZebra = template.table.zebra && rIdx % 2 === 1;

          // Calculate dynamic row height based on cell text wrapping
          let rowHeight = 20; // baseline height with vertical padding
          sortedColumns.forEach(col => {
            const cellWidth = ((col.width || 10) / 100) * contentWidth;
            let txt = '';
            if (col.key === 'index') txt = String(item.index);
            else if (col.key === 'sku') txt = item.sku || '';
            else if (col.key === 'description') txt = item.description || '';
            else if (col.key === 'type') txt = item.type || '';
            else if (col.key === 'quantity') txt = String(item.quantity || 0);
            else if (col.key === 'unit') txt = item.unit || 'PCS';
            else if (col.key === 'rate') txt = formatCurrency(item.rate || 0, data.currencySymbol);
            else if (col.key === 'tax') txt = item.taxLabel || 'EXEMPT';
            else if (col.key === 'amount') txt = formatCurrency(item.amount || 0, data.currencySymbol);
            else txt = String(item.customFields?.[col.key] || '');

            const cellHeight = doc.heightOfString(txt, { width: Math.max(0, cellWidth - 8) }) + 8;
            if (cellHeight > rowHeight) {
              rowHeight = cellHeight;
            }
          });

          // Check for manual page overflow before drawing
          if (y + rowHeight > usableBottom) {
            doc.addPage();
            y = topMargin;

            // Re-draw Table Header on the new page
            doc.fillColor(headerBgColor);
            doc.rect(leftMargin, y, contentWidth, 18).fill();
            
            doc.fillColor(headerTextColor);
            doc.font(template.theme.fonts.heading);
            doc.fontSize(template.theme.baseFontSize - 1);

            let colX = leftMargin;
            sortedColumns.forEach(col => {
              const cellWidth = ((col.width || 10) / 100) * contentWidth;
              const align = col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left';
              doc.text(col.label.toUpperCase(), colX + 4, y + 4, { width: Math.max(0, cellWidth - 8), align });
              colX += cellWidth;
            });

            y += 18;
            doc.font(template.theme.fonts.body);
            doc.fontSize(template.theme.baseFontSize - 1);
          }

          if (isZebra) {
            doc.fillColor(zebraBgColor);
            doc.rect(leftMargin, y, contentWidth, rowHeight).fill();
          }

          doc.fillColor(textColor);
          let itemX = leftMargin;
          
          sortedColumns.forEach(col => {
            const cellWidth = ((col.width || 10) / 100) * contentWidth;
            const align = col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left';

            let txt = '';
            if (col.key === 'index') txt = String(item.index);
            else if (col.key === 'sku') txt = item.sku || '';
            else if (col.key === 'description') txt = item.description || '';
            else if (col.key === 'type') txt = item.type || '';
            else if (col.key === 'quantity') txt = String(item.quantity || 0);
            else if (col.key === 'unit') txt = item.unit || 'PCS';
            else if (col.key === 'rate') txt = formatCurrency(item.rate || 0, data.currencySymbol);
            else if (col.key === 'tax') txt = item.taxLabel || 'EXEMPT';
            else if (col.key === 'amount') txt = formatCurrency(item.amount || 0, data.currencySymbol);
            else txt = String(item.customFields?.[col.key] || '');

            doc.text(txt, itemX + 4, y + 4, { width: Math.max(0, cellWidth - 8), align });
            itemX += cellWidth;
          });

          // Table borders
          if (template.table.showBorders) {
            doc.strokeColor(borderColor);
            doc.lineWidth(0.5);
            doc.moveTo(leftMargin, y).lineTo(leftMargin + contentWidth, y).stroke();
          }

          y += rowHeight;
        });

        // Bottom border of table
        if (template.table.showBorders) {
          doc.strokeColor(borderColor);
          doc.lineWidth(1);
          doc.moveTo(leftMargin, y).lineTo(leftMargin + contentWidth, y).stroke();
        }

        y += 16;

        // ========================================================
        // 5. Totals & Notes block (Side-by-side)
        // ========================================================
        const totalsRows = [...template.totals.rows]
          .filter(r => r.visible)
          .sort((a, b) => a.order - b.order);

        // Precheck height for notes & totals block to prevent page overflow
        let notesHeight = 0;
        const notesText = (data.notes || template.notes.text || '').trim();
        if (template.notes.show && notesText) {
          notesHeight = doc.heightOfString(notesText, { width: contentWidth * 0.48 }) + 28;
        }

        const totalsHeight = totalsRows.length * 16 + 10;
        const summaryHeight = Math.max(notesHeight, totalsHeight);

        if (y + summaryHeight > usableBottom) {
          doc.addPage();
          y = topMargin;
        }

        const summaryYStart = y;

        if (template.notes.show && notesText) {
          // Render a clean callout background card for notes
          doc.fillColor(template.theme.colors.border || '#F3F4F6');
          doc.roundedRect(leftMargin, summaryYStart, contentWidth * 0.5, notesHeight - 4, 3).fill();
          
          doc.font(template.theme.fonts.heading);
          doc.fillColor(primaryColor);
          doc.fontSize(template.theme.baseFontSize - 1);
          doc.text((template.notes.heading || 'Notes').toUpperCase(), leftMargin + 8, summaryYStart + 6, { width: contentWidth * 0.48 });
          
          doc.font(template.theme.fonts.body);
          doc.fillColor(textColor);
          doc.fontSize(template.theme.baseFontSize - 1);
          doc.text(notesText, leftMargin + 8, summaryYStart + 18, { width: contentWidth * 0.48 });
        }

        let totalsY = summaryYStart;
        totalsRows.forEach(row => {
          let val = 0;
          if (row.key === 'subtotal') val = data.subtotal;
          else if (row.key === 'discount') val = data.discount;
          else if (row.key === 'tax') val = data.taxTotal;
          else if (row.key === 'shipping') val = data.shipping;
          else if (row.key === 'grandTotal') val = data.grandTotal;

          const formattedVal = formatCurrency(val, data.currencySymbol);

          if (row.emphasis) {
            // Draw a subtle highlighted banner for the grand total
            totalsY += 4;
            doc.fillColor(primaryColor);
            doc.roundedRect(leftMargin + contentWidth * 0.52, totalsY - 2, contentWidth * 0.48, 20, 2).fill();
            doc.fillColor('#ffffff');
            doc.font(template.theme.fonts.heading);
            doc.fontSize(template.theme.baseFontSize + 1);
            doc.text(`${row.label}: `, leftMargin + contentWidth * 0.54, totalsY + 3, { width: contentWidth * 0.44, align: 'right', continued: true });
            doc.text(formattedVal, { align: 'right' });
            totalsY += 26;
          } else {
            doc.font(template.theme.fonts.body);
            doc.fillColor(textColor);
            doc.fontSize(template.theme.baseFontSize - 1);
            doc.text(`${row.label}: `, leftMargin + contentWidth * 0.55, totalsY, { width: contentWidth * 0.45, align: 'right', continued: true });
            doc.text(formattedVal, { align: 'right' });
            totalsY += 16;
          }
        });

        y = Math.max(summaryYStart + notesHeight, totalsY) + 20;

        // ========================================================
        // 6. Footer Blocks — payment, bank, qr (inline after content)
        // ========================================================
        const footerBlocks = template.footerBlocks || [
          { key: 'payment', label: 'Payment Instructions', visible: template.payment.show, order: 0 },
          { key: 'bank', label: 'Bank Details', visible: template.bank.show, order: 1 },
          { key: 'qr', label: 'QR Code', visible: true, order: 2 },
          { key: 'signature', label: 'Signature', visible: template.signature.show, order: 3 },
        ];

        [...footerBlocks]
          .filter(b => b.key !== 'signature') // signature handled separately below
          .sort((a, b) => a.order - b.order)
          .forEach(block => {
            if (!block.visible) return;

            // Only add a new page if we'll genuinely overflow
            const neededSpace = 60;
            if (y + neededSpace > usableBottom) {
              doc.addPage();
              y = topMargin;
            }

            if (block.key === 'payment' && template.payment.show && template.payment.instructions) {
              doc.font(template.theme.fonts.heading);
              doc.fillColor(primaryColor);
              doc.text((template.payment.heading || 'Payment Instructions').toUpperCase(), leftMargin, y, { width: contentWidth });
              y += 14;

              doc.font(template.theme.fonts.body);
              doc.fillColor(mutedColor);
              const instrText = template.payment.instructions || '';
              doc.text(instrText, leftMargin, y, { width: contentWidth });
              y += doc.heightOfString(instrText, { width: contentWidth }) + 14;
            }

            if (block.key === 'bank' && template.bank.show && data.bank) {
              doc.font(template.theme.fonts.heading);
              doc.fillColor(primaryColor);
              doc.text((template.bank.heading || 'Bank Details').toUpperCase(), leftMargin, y, { width: contentWidth });
              y += 14;

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
                  doc.text(`${f.label}: `, leftMargin, y, { width: contentWidth, continued: true });
                  doc.font(template.theme.fonts.body);
                  doc.fillColor(mutedColor);
                  doc.text(txt);
                  y += 12;
                }
              });
              y += 8;
            }

            if (block.key === 'qr' && data.qrUrl) {
              try {
                const base64Data = data.qrUrl.replace(/^data:image\/\w+;base64,/, '');
                const imgBuffer = Buffer.from(base64Data, 'base64');
                doc.image(imgBuffer, leftMargin, y, { width: 75, height: 75 });
                y += 85;
              } catch (err) {
                console.error('Failed to draw QR in PDF:', err);
              }
            }
          });

        // ========================================================
        // 7. Signature — always pinned to bottom of current page
        // ========================================================
        if (template.signature.show) {
          // Pin to bottom of the LAST content page (no new page needed for short invoices)
          const sigHeight = data.signatureUrl ? 80 : 50;
          const sigY = Math.max(y + 20, usableBottom - sigHeight - footerReserve - 10);

          // Draw stamp if enabled
          if (template.signature.showStamp && data.stampUrl) {
            try {
              const base64Data = data.stampUrl.replace(/^data:image\/\w+;base64,/, '');
              const imgBuffer = Buffer.from(base64Data, 'base64');
              // Render stamp slightly to the left of the signature line
              doc.image(imgBuffer, leftMargin + contentWidth * 0.45, sigY - 10, { fit: [60, 60] });
            } catch (err) {
              console.error('Failed to render stamp image in PDF:', err);
            }
          }

          if (data.signatureUrl) {
            try {
              const base64Data = data.signatureUrl.replace(/^data:image\/\w+;base64,/, '');
              const imgBuffer = Buffer.from(base64Data, 'base64');
              doc.image(imgBuffer, leftMargin + contentWidth * 0.7, sigY, { fit: [120, 40] });
            } catch (err) {
              console.error('Failed to render signature image in PDF:', err);
            }
          }

          const lineY = data.signatureUrl ? sigY + 44 : sigY + 10;
          doc.strokeColor(mutedColor);
          doc.lineWidth(0.5);
          doc.moveTo(leftMargin + contentWidth * 0.62, lineY).lineTo(leftMargin + contentWidth, lineY).stroke();

          doc.font(template.theme.fonts.heading);
          doc.fillColor(textColor);
          doc.fontSize(template.theme.baseFontSize - 1);
          doc.text(template.signature.label || 'Authorised Signatory', leftMargin + contentWidth * 0.62, lineY + 4, {
            width: contentWidth * 0.38,
            align: 'center',
          });
        }

        // ========================================================
        // 8. Footer text — fixed at bottom of every page
        // ========================================================
        if (template.footer.show) {
          const totalPages = doc.bufferedPageRange().count;
          for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i);
            
            // Prevent auto page break on absolute footer placement
            const oldMargin = doc.page.margins.bottom;
            doc.page.margins.bottom = 0;

            doc.strokeColor(borderColor);
            doc.lineWidth(0.5);
            doc.moveTo(leftMargin, doc.page.height - bottomMargin - 14).lineTo(pageWidth - rightMargin, doc.page.height - bottomMargin - 14).stroke();

            doc.font(template.theme.fonts.body);
            doc.fontSize(template.theme.baseFontSize - 2);
            doc.fillColor(mutedColor);
            doc.text(template.footer.text || '', leftMargin, doc.page.height - bottomMargin - 8, {
              width: contentWidth,
              align: 'center',
            });

            if (template.footer.showPageNumbers) {
              doc.text(`Page ${i + 1} of ${totalPages}`, leftMargin, doc.page.height - bottomMargin - 8, {
                width: contentWidth,
                align: 'right',
              });
            }
            
            // Restore margin
            doc.page.margins.bottom = oldMargin;
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

