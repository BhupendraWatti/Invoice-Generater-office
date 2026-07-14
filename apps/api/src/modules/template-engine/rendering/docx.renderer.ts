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

    // ========================================================
    // Redesigned Header: Left Column & Right Column Layout
    // ========================================================
    const leftColumnChildren: any[] = [];
    const rightColumnChildren: any[] = [];

    // LEFT COLUMN: Logo + Bill To
    if (template.logo.enabled && data.logoUrl) {
      try {
        const base64Data = data.logoUrl.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        leftColumnChildren.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imgBuffer,
                transformation: { width: 120, height: 45 },
                type: 'png'
              })
            ],
            spacing: { after: 120 }
          })
        );
      } catch (err) {
        console.error('Failed to draw logo in DOCX:', err);
      }
    }

    if (template.customer.showBillTo) {
      leftColumnChildren.push(
        new Paragraph({
          spacing: { before: 80, after: 60 },
          children: [
            new TextRun({
              text: template.customer.billToHeading.toUpperCase(),
              bold: true,
              color: primaryColor,
              size: (template.theme.baseFontSize - 1) * 2,
            })
          ]
        })
      );

      const customerDetailsTexts: any[] = [];
      if (data.billTo.name) {
        customerDetailsTexts.push(
          new TextRun({ text: data.billTo.name, bold: true, color: textColor })
        );
      }
      data.billTo.lines.forEach(line => {
        customerDetailsTexts.push(
          new TextRun({ text: line, color: mutedColor, break: 1 })
        );
      });
      if (data.billTo.phone) {
        customerDetailsTexts.push(
          new TextRun({ text: data.billTo.phone, color: mutedColor, break: 1 })
        );
      }
      if (data.billTo.email) {
        customerDetailsTexts.push(
          new TextRun({ text: data.billTo.email, color: mutedColor, break: 1 })
        );
      }
      if (data.billTo.taxId) {
        customerDetailsTexts.push(
          new TextRun({ text: data.billTo.taxId, color: mutedColor, break: 1 })
        );
      }

      leftColumnChildren.push(
        new Paragraph({
          children: customerDetailsTexts,
          spacing: { after: 120 }
        })
      );
    }

    // RIGHT COLUMN: Title, Meta, and Company Info
    const rightXPercent = 50;
    const rightWidth = 50;

    if (template.header.showTitle) {
      const titleText = replaceTokens(template.header.titleText, data);
      rightColumnChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: titleText.toUpperCase(),
              bold: true,
              size: (template.theme.baseFontSize + 12) * 2,
              color: primaryColor,
            }),
          ],
        })
      );
    }

    if (template.documentDetails.show) {
      const metaDetailsParagraphs: any[] = [];
      const sortedMetaFields = [...template.documentDetails.fields].sort((a, b) => a.order - b.order);
      sortedMetaFields.forEach(f => {
        if (!f.visible) return;
        let textVal = '';
        if (f.key === 'number') textVal = data.documentNumber;
        else if (f.key === 'date') textVal = formatDate(data.issueDate);
        else if (f.key === 'dueDate' && data.dueDate) textVal = formatDate(data.dueDate);
        else if (f.key === 'terms') textVal = 'Due on Receipt';

        if (textVal) {
          metaDetailsParagraphs.push(
            new TextRun({ text: `${f.label}: `, bold: true, color: textColor, break: metaDetailsParagraphs.length > 0 ? 1 : 0 }),
            new TextRun({ text: textVal, color: textColor })
          );
        }
      });
      if (metaDetailsParagraphs.length > 0) {
        rightColumnChildren.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: metaDetailsParagraphs,
            spacing: { after: 100 }
          })
        );
      }
    }

    const companyInfoTexts: any[] = [];
    companyInfoTexts.push(
      new TextRun({ text: data.organization.name, bold: true, color: textColor })
    );
    data.organization.lines.forEach(line => {
      companyInfoTexts.push(
        new TextRun({ text: line, color: mutedColor, break: 1 })
      );
    });
    if (data.organization.email) {
      companyInfoTexts.push(new TextRun({ text: `Email: ${data.organization.email}`, color: mutedColor, break: 1 }));
    }
    if (data.organization.website) {
      companyInfoTexts.push(new TextRun({ text: `Website: ${data.organization.website}`, color: mutedColor, break: 1 }));
    }
    if (data.organization.phone) {
      companyInfoTexts.push(new TextRun({ text: `Phone: ${data.organization.phone}`, color: mutedColor, break: 1 }));
    }
    if (data.organization.taxId) {
      companyInfoTexts.push(new TextRun({ text: `GSTIN/VAT: ${data.organization.taxId}`, color: mutedColor, break: 1 }));
    }
    if (data.organization.cin) {
      companyInfoTexts.push(new TextRun({ text: `CIN: ${data.organization.cin}`, color: mutedColor, break: 1 }));
    }
    if (data.organization.pan) {
      companyInfoTexts.push(new TextRun({ text: `PAN: ${data.organization.pan}`, color: mutedColor, break: 1 }));
    }

    rightColumnChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: companyInfoTexts,
        spacing: { after: 120 }
      })
    );

    const headerColumnsTable = new Table({
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
              children: leftColumnChildren,
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: rightColumnChildren,
            }),
          ],
        }),
      ],
    });
    documentChildren.push(headerColumnsTable);
    documentChildren.push(new Paragraph({ spacing: { after: 180 } }));

    // 4. Line Items Table
    const sortedColumns = [...template.table.columns]
      .filter(c => c.visible)
      .sort((a, b) => a.order - b.order);

    const tableHeaderCells = sortedColumns.map(col => {
      let align: any = AlignmentType.LEFT;
      if (col.align === 'center') align = AlignmentType.CENTER;
      if (col.align === 'right') align = AlignmentType.RIGHT;

      return new TableCell({
        width: { size: col.width || 10, type: WidthType.PERCENTAGE },
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
        else if (col.key === 'sku') txt = item.sku || '';
        else if (col.key === 'description') txt = item.description || '';
        else if (col.key === 'type') txt = item.type || '';
        else if (col.key === 'quantity') txt = String(item.quantity || 0);
        else if (col.key === 'unit') txt = item.unit || 'PCS';
        else if (col.key === 'rate') txt = formatCurrency(item.rate || 0, data.currencySymbol);
        else if (col.key === 'tax') txt = item.taxLabel || 'EXEMPT';
        else if (col.key === 'amount') txt = formatCurrency(item.amount || 0, data.currencySymbol);
        else txt = String(item.customFields?.[col.key] || '');

        return new TableCell({
          width: { size: col.width || 10, type: WidthType.PERCENTAGE },
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
      notesLines.push(new TextRun({ text: (template.notes.heading || 'Notes').toUpperCase(), bold: true, color: primaryColor }));
      notesLines.push(new TextRun({ text: (data.notes || template.notes.text || ''), color: mutedColor, break: 1 }));
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

    // ========================================================
    // 6. Movable Footer Blocks sequentially
    // ========================================================
    const footerBlocks = template.footerBlocks || [
      { key: 'payment', label: 'Payment Instructions', visible: template.payment.show, order: 0 },
      { key: 'bank', label: 'Bank Details', visible: template.bank.show, order: 1 },
      { key: 'qr', label: 'QR Code', visible: true, order: 2 },
      { key: 'signature', label: 'Signature', visible: template.signature.show, order: 3 },
      { key: 'footer', label: 'Footer Declaration', visible: template.footer.show, order: 4 },
    ];

    [...footerBlocks]
      .sort((a, b) => a.order - b.order)
      .forEach(block => {
        if (!block.visible) return;

        if (block.key === 'payment' && template.payment.show && template.payment.instructions) {
          documentChildren.push(
            new Paragraph({
              spacing: { before: 120, after: 40 },
              children: [
                new TextRun({
                  text: (template.payment.heading || 'Payment Instructions').toUpperCase(),
                  bold: true,
                  color: primaryColor,
                  size: template.theme.baseFontSize * 2,
                })
              ]
            })
          );
          documentChildren.push(
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: template.payment.instructions,
                  color: mutedColor,
                  size: template.theme.baseFontSize * 2,
                })
              ]
            })
          );
        }

        if (block.key === 'bank' && template.bank.show && data.bank) {
          documentChildren.push(
            new Paragraph({
              spacing: { before: 120, after: 40 },
              children: [
                new TextRun({
                  text: template.bank.heading.toUpperCase(),
                  bold: true,
                  color: primaryColor,
                  size: template.theme.baseFontSize * 2,
                })
              ]
            })
          );

          const bankFieldsText: any[] = [];
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
              bankFieldsText.push(
                new TextRun({ text: `${f.label}: `, bold: true, color: textColor, break: bankFieldsText.length > 0 ? 1 : 0 }),
                new TextRun({ text: txt, color: mutedColor })
              );
            }
          });

          if (bankFieldsText.length > 0) {
            documentChildren.push(
              new Paragraph({
                children: bankFieldsText,
                spacing: { after: 120 }
              })
            );
          }
        }

        if (block.key === 'qr' && data.qrUrl) {
          try {
            const base64Data = data.qrUrl.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            documentChildren.push(
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [
                  new ImageRun({
                    data: imgBuffer,
                    transformation: { width: 75, height: 75 },
                    type: 'png'
                  })
                ]
              })
            );
          } catch (err) {
            console.error('Failed to draw QR in docx:', err);
          }
        }

        if (block.key === 'signature' && template.signature.show) {
          const sigParagraphChildren: any[] = [];
          if (data.signatureUrl) {
            try {
              const base64Data = data.signatureUrl.replace(/^data:image\/\w+;base64,/, '');
              const imgBuffer = Buffer.from(base64Data, 'base64');
              sigParagraphChildren.push(
                new ImageRun({
                  data: imgBuffer,
                  transformation: { width: 120, height: 40 },
                  type: 'png'
                }),
                new TextRun({ text: "", break: 1 })
              );
            } catch (err) {
              console.error('Failed to draw signature image in docx:', err);
            }
          }

          sigParagraphChildren.push(
            new TextRun({ text: '__________________________', color: mutedColor }),
            new TextRun({ text: template.signature.label, bold: true, color: textColor, break: 1 })
          );

          documentChildren.push(
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 180, after: 120 },
              children: sigParagraphChildren
            })
          );
        }
      });

    // 8. Footer (radix / docx section footer)
    let docFooter = undefined;
    const footerBlockConfig = footerBlocks.find(b => b.key === 'footer');
    if (template.footer.show && footerBlockConfig?.visible) {
      docFooter = {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: template.footer.text || '',
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
