import { InvoiceData, TemplateDefinitionDto } from '@docflow/shared-types';
import { InvoiceRenderer, formatCurrency, formatDate, replaceTokens } from './renderer.interface';
import { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, Packer, Footer, ImageRun } from 'docx';

export class DocxRenderer implements InvoiceRenderer {
  async render(data: InvoiceData, template: TemplateDefinitionDto): Promise<Buffer> {
    const primaryColor = template.theme.colors.primary.replace('#', '');
    const textColor = template.theme.colors.text.replace('#', '');
    const mutedColor = template.theme.colors.muted.replace('#', '');
    const borderColor = template.theme.colors.border.replace('#', '');
    const headerBgColor = template.theme.colors.tableHeaderBg.replace('#', '');
    const headerTextColor = template.theme.colors.tableHeaderText.replace('#', '');
    const zebraBgColor = template.theme.colors.zebraBg.replace('#', '');

    const documentChildren: any[] = [];

    // 0. Branding Logo
    if (data.logoUrl) {
      try {
        const base64Data = data.logoUrl.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        documentChildren.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imgBuffer,
                transformation: { width: 140, height: 50 },
                type: 'png'
              })
            ],
            spacing: { after: 200 }
          })
        );
      } catch (err) {
        console.error('Failed to draw logo in docx:', err);
      }
    }

    // 1. Header Title
    if (template.header.showTitle) {
      const titleText = replaceTokens(template.header.titleText, data);
      documentChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 120 },
          children: [
            new TextRun({
              text: titleText.toUpperCase(),
              bold: true,
              size: (template.theme.baseFontSize + 10) * 2,
              color: primaryColor,
            }),
          ],
        })
      );

      if (template.header.accentBar) {
        documentChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.SINGLE, size: 24, color: primaryColor },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [],
                    shading: { fill: primaryColor },
                  }),
                ],
              }),
            ],
          })
        );
        documentChildren.push(new Paragraph({ spacing: { after: 180 } }));
      }
    }

    // 2. Organization Info & Document Meta Row
    const orgLines: any[] = [];
    if (template.organization.showHeading) {
      orgLines.push(new TextRun({ text: template.organization.heading, bold: true, color: primaryColor }));
    }
    
    // Sort and filter organization fields
    const sortedOrgFields = [...template.organization.fields].sort((a, b) => a.order - b.order);
    sortedOrgFields.forEach(f => {
      if (!f.visible) return;
      if (f.key === 'name' && data.organization.name) {
        orgLines.push(new TextRun({ text: data.organization.name, bold: true, color: textColor, break: orgLines.length > 0 ? 1 : 0 }));
      } else if (f.key === 'addressLine1' && data.organization.lines[0]) {
        orgLines.push(new TextRun({ text: data.organization.lines[0], color: mutedColor, break: 1 }));
      } else if (f.key === 'addressLine2' && data.organization.lines[1]) {
        orgLines.push(new TextRun({ text: data.organization.lines[1], color: mutedColor, break: 1 }));
      } else if (f.key === 'city' && data.organization.lines[2]) {
        orgLines.push(new TextRun({ text: data.organization.lines[2], color: mutedColor, break: 1 }));
      } else if (f.key === 'taxId' && data.organization.taxId) {
        orgLines.push(new TextRun({ text: `${f.label}: ${data.organization.taxId}`, color: mutedColor, break: 1 }));
      }
    });

    const metaLines: any[] = [];
    if (template.documentDetails.show) {
      const sortedMetaFields = [...template.documentDetails.fields].sort((a, b) => a.order - b.order);
      sortedMetaFields.forEach(f => {
        if (!f.visible) return;
        let textVal = '';
        if (f.key === 'number') textVal = data.documentNumber;
        else if (f.key === 'date') textVal = formatDate(data.issueDate);
        else if (f.key === 'dueDate' && data.dueDate) textVal = formatDate(data.dueDate);
        else if (f.key === 'terms') textVal = 'Due on Receipt';

        if (textVal) {
          metaLines.push(new TextRun({ text: `${f.label}: `, bold: true, color: textColor, break: metaLines.length > 0 ? 1 : 0 }));
          metaLines.push(new TextRun({ text: textVal, color: textColor }));
        }
      });
    }

    // Two-column layout for Org Details + Document Meta
    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: orgLines })],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: metaLines, alignment: AlignmentType.RIGHT })],
            }),
          ],
        }),
      ],
    });
    documentChildren.push(headerTable);
    documentChildren.push(new Paragraph({ spacing: { after: 200 } }));

    // 3. Bill To / Ship To Addresses Row
    const billToLines: any[] = [];
    if (template.customer.showBillTo) {
      billToLines.push(new TextRun({ text: template.customer.billToHeading.toUpperCase(), bold: true, color: primaryColor }));
      
      const sortedCustFields = [...template.customer.fields].sort((a, b) => a.order - b.order);
      sortedCustFields.forEach(f => {
        if (!f.visible) return;
        if (f.key === 'name' && data.billTo.name) {
          billToLines.push(new TextRun({ text: data.billTo.name, bold: true, color: textColor, break: 1 }));
        } else if (f.key === 'addressLine1' && data.billTo.lines[0]) {
          billToLines.push(new TextRun({ text: data.billTo.lines[0], color: mutedColor, break: 1 }));
        } else if (f.key === 'addressLine2' && data.billTo.lines[1]) {
          billToLines.push(new TextRun({ text: data.billTo.lines[1], color: mutedColor, break: 1 }));
        } else if (f.key === 'city' && data.billTo.lines[2]) {
          billToLines.push(new TextRun({ text: data.billTo.lines[2], color: mutedColor, break: 1 }));
        } else if (f.key === 'email' && data.billTo.email) {
          billToLines.push(new TextRun({ text: data.billTo.email, color: mutedColor, break: 1 }));
        } else if (f.key === 'phone' && data.billTo.phone) {
          billToLines.push(new TextRun({ text: data.billTo.phone, color: mutedColor, break: 1 }));
        }
      });
    }

    const shipToLines: any[] = [];
    if (template.customer.showShipTo && data.shipTo) {
      shipToLines.push(new TextRun({ text: template.customer.shipToHeading.toUpperCase(), bold: true, color: primaryColor }));
      shipToLines.push(new TextRun({ text: data.shipTo.name, bold: true, color: textColor, break: 1 }));
      data.shipTo.lines.forEach(ln => {
        shipToLines.push(new TextRun({ text: ln, color: mutedColor, break: 1 }));
      });
    }

    const addressesTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: billToLines })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: shipToLines })],
            }),
          ],
        }),
      ],
    });
    documentChildren.push(addressesTable);
    documentChildren.push(new Paragraph({ spacing: { after: 240 } }));

    // 4. Line Items Table
    const sortedColumns = [...template.table.columns]
      .filter(c => c.visible)
      .sort((a, b) => a.order - b.order);

    const tableHeaderCells = sortedColumns.map(col => {
      let align: any = AlignmentType.LEFT;
      if (col.align === 'center') align = AlignmentType.CENTER;
      if (col.align === 'right') align = AlignmentType.RIGHT;

      return new TableCell({
        width: { size: col.width, type: WidthType.PERCENTAGE },
        shading: { fill: headerBgColor },
        children: [
          new Paragraph({
            alignment: align,
            children: [
              new TextRun({
                text: col.label.toUpperCase(),
                bold: true,
                color: headerTextColor,
                size: template.theme.baseFontSize * 2,
              }),
            ],
          }),
        ],
      });
    });

    const tableRows = [
      new TableRow({
        children: tableHeaderCells,
      }),
    ];

    data.items.forEach((item, rIdx) => {
      const isZebra = template.table.zebra && rIdx % 2 === 1;
      const rowFill = isZebra ? zebraBgColor : 'FFFFFF';

      const cells = sortedColumns.map(col => {
        let align: any = AlignmentType.LEFT;
        if (col.align === 'center') align = AlignmentType.CENTER;
        if (col.align === 'right') align = AlignmentType.RIGHT;

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

        return new TableCell({
          width: { size: col.width, type: WidthType.PERCENTAGE },
          shading: { fill: rowFill },
          children: [
            new Paragraph({
              alignment: align,
              children: [
                new TextRun({
                  text: txt,
                  color: textColor,
                  size: template.theme.baseFontSize * 2,
                }),
              ],
            }),
          ],
        });
      });

      tableRows.push(
        new TableRow({
          children: cells,
        })
      );
    });

    const itemsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: template.table.showBorders
        ? {
            top: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
            left: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
            right: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
            insideVertical: { style: BorderStyle.NONE },
          }
        : {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
      rows: tableRows,
    });
    documentChildren.push(itemsTable);
    documentChildren.push(new Paragraph({ spacing: { after: 200 } }));

    // 5. Totals Block & Notes
    const totalsRows = [...template.totals.rows]
      .filter(r => r.visible)
      .sort((a, b) => a.order - b.order);

    const totalsParagraphs: Paragraph[] = [];
    totalsRows.forEach(row => {
      let val = 0;
      if (row.key === 'subtotal') val = data.subtotal;
      else if (row.key === 'discount') val = data.discount;
      else if (row.key === 'tax') val = data.taxTotal;
      else if (row.key === 'shipping') val = data.shipping;
      else if (row.key === 'grandTotal') val = data.grandTotal;

      const formattedVal = formatCurrency(val, data.currencySymbol);

      totalsParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: `${row.label}: `,
              bold: row.emphasis,
              color: row.emphasis ? primaryColor : textColor,
              size: template.theme.baseFontSize * 2,
            }),
            new TextRun({
              text: formattedVal,
              bold: row.emphasis,
              color: row.emphasis ? primaryColor : textColor,
              size: template.theme.baseFontSize * 2,
            }),
          ],
        })
      );
    });

    const notesLines: any[] = [];
    if (template.notes.show && (data.notes || template.notes.text)) {
      notesLines.push(new TextRun({ text: template.notes.heading.toUpperCase(), bold: true, color: primaryColor }));
      notesLines.push(new TextRun({ text: data.notes || template.notes.text, color: mutedColor, break: 1 }));
    }

    const summaryTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: notesLines })],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: totalsParagraphs,
            }),
          ],
        }),
      ],
    });
    documentChildren.push(summaryTable);
    documentChildren.push(new Paragraph({ spacing: { after: 200 } }));

    // 6. Bank Details & Payment instructions
    const paymentLines: any[] = [];
    if (template.payment.show && template.payment.instructions) {
      paymentLines.push(new TextRun({ text: template.payment.heading.toUpperCase(), bold: true, color: primaryColor }));
      paymentLines.push(new TextRun({ text: template.payment.instructions, color: mutedColor, break: 1 }));
    }
    if (data.qrUrl) {
      try {
        const base64Data = data.qrUrl.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        paymentLines.push(new TextRun({ text: "", break: 2 }));
        paymentLines.push(new ImageRun({
          data: imgBuffer,
          transformation: { width: 80, height: 80 },
          type: 'png'
        }));
      } catch (err) {
        console.error('Failed to draw QR in docx:', err);
      }
    }

    const bankLines: any[] = [];
    if (template.bank.show && data.bank) {
      bankLines.push(new TextRun({ text: template.bank.heading.toUpperCase(), bold: true, color: primaryColor }));
      
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
          bankLines.push(new TextRun({ text: `${f.label}: `, bold: true, color: textColor, break: 1 }));
          bankLines.push(new TextRun({ text: txt, color: mutedColor }));
        }
      });
    }

    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: paymentLines })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: bankLines })],
            }),
          ],
        }),
      ],
    });
    documentChildren.push(infoTable);
    documentChildren.push(new Paragraph({ spacing: { after: 200 } }));

    // 7. Signature & Seal
    if (template.signature.show) {
      const sigPara = new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: '__________________________', color: mutedColor }),
          new TextRun({ text: template.signature.label, bold: true, color: textColor, break: 1 }),
        ],
      });
      documentChildren.push(sigPara);
    }

    // 8. Footer
    let docFooter = undefined;
    if (template.footer.show) {
      docFooter = {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: template.footer.text,
                  color: mutedColor,
                  size: (template.theme.baseFontSize - 2) * 2,
                }),
              ],
            }),
          ],
        }),
      };
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                width: template.page.size === 'LETTER' ? '8.5in' : '21cm',
                height: template.page.size === 'LETTER' ? '11in' : '29.7cm',
              },
              margin: {
                top: `${template.page.margins.top}pt`,
                bottom: `${template.page.margins.bottom}pt`,
                left: `${template.page.margins.left}pt`,
                right: `${template.page.margins.right}pt`,
              },
            },
          },
          children: documentChildren,
          footers: docFooter,
        },
      ],
    });

    return Packer.toBuffer(doc);
  }
}
