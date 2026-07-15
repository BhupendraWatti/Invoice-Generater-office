import { InvoiceData, TemplateDefinitionDto, buildRenderModel, SharedRenderModel } from '@docflow/shared-types';
import { InvoiceRenderer } from './renderer.interface';
import { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, Packer, Footer, ImageRun } from 'docx';

export class DocxRenderer implements InvoiceRenderer {
  async render(data: InvoiceData, template: TemplateDefinitionDto): Promise<Buffer> {
    const model = buildRenderModel(data, template);

    const primaryColor = model.theme.colors.primary.replace('#', '');
    const textColor = model.theme.colors.text.replace('#', '');
    const mutedColor = model.theme.colors.muted.replace('#', '');
    const borderColor = model.theme.colors.border.replace('#', '');
    const headerBgColor = model.theme.colors.tableHeaderBg.replace('#', '');
    const headerTextColor = model.theme.colors.tableHeaderText.replace('#', '');
    const zebraBgColor = model.theme.colors.zebraBg.replace('#', '');

    const documentChildren: any[] = [];

    // ========================================================
    // Header Layout: Left Column & Right Column
    // ========================================================
    const leftColumnChildren: any[] = [];
    const rightColumnChildren: any[] = [];

    // LEFT COLUMN: Logo + Bill To
    if (model.logo.enabled && model.logo.url) {
      try {
        const base64Data = model.logo.url.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        leftColumnChildren.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imgBuffer,
                transformation: { width: model.logo.maxWidth, height: 45 },
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

    if (model.customer.showBillTo) {
      leftColumnChildren.push(
        new Paragraph({
          spacing: { before: 80, after: 60 },
          children: [
            new TextRun({
              text: model.customer.heading.toUpperCase(),
              bold: true,
              color: primaryColor,
              size: (model.theme.baseFontSize - 1) * 2,
            })
          ]
        })
      );

      const customerDetailsTexts: any[] = [];
      if (model.customer.name) {
        customerDetailsTexts.push(
          new TextRun({ text: model.customer.name, bold: true, color: textColor })
        );
      }
      model.customer.lines.forEach(line => {
        customerDetailsTexts.push(
          new TextRun({ text: line, color: mutedColor, break: 1 })
        );
      });
      model.customer.fields.forEach(field => {
        if (field.value) {
          customerDetailsTexts.push(
            new TextRun({ text: field.value, color: mutedColor, break: 1 })
          );
        }
      });

      leftColumnChildren.push(
        new Paragraph({
          children: customerDetailsTexts,
          spacing: { after: 120 }
        })
      );
    }

    // RIGHT COLUMN: Title, Meta, and Company Info
    if (model.header.showTitle) {
      rightColumnChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: model.header.titleText.toUpperCase(),
              bold: true,
              size: (model.theme.baseFontSize + 12) * 2,
              color: primaryColor,
            }),
          ],
        })
      );
    }

    const metaDetailsParagraphs: any[] = [];
    model.metadata.fields.forEach(f => {
      metaDetailsParagraphs.push(
        new TextRun({ text: `${f.label}: `, bold: true, color: textColor, break: metaDetailsParagraphs.length > 0 ? 1 : 0 }),
        new TextRun({ text: f.value, color: textColor })
      );
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

    const companyInfoTexts: any[] = [];
    companyInfoTexts.push(
      new TextRun({ text: model.company.name, bold: true, color: textColor })
    );
    model.company.lines.forEach(line => {
      companyInfoTexts.push(
        new TextRun({ text: line, color: mutedColor, break: 1 })
      );
    });
    model.company.fields.forEach(field => {
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
        companyInfoTexts.push(
          new TextRun({ text: `${prefix}${field.value}`, color: mutedColor, break: 1 })
        );
      }
    });

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

    // ========================================================
    // Line Items Table
    // ========================================================
    const tableHeaderCells = model.table.columns.map(col => {
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
                size: model.theme.baseFontSize * 2,
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

    model.table.rows.forEach((row, rIdx) => {
      const isZebra = model.table.zebra && rIdx % 2 === 1;
      const rowFill = isZebra ? zebraBgColor : 'FFFFFF';

      const cells = model.table.columns.map(col => {
        let align: any = AlignmentType.LEFT;
        if (col.align === 'center') align = AlignmentType.CENTER;
        if (col.align === 'right') align = AlignmentType.RIGHT;

        const txt = row.cells[col.key] || '';

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
                  size: model.theme.baseFontSize * 2,
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
      borders: model.table.showBorders
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

    // ========================================================
    // Totals Block & Notes
    // ========================================================
    const totalsParagraphs: Paragraph[] = [];
    model.totals.rows.forEach(row => {
      totalsParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: `${row.label}: `,
              bold: row.emphasis,
              color: row.emphasis ? primaryColor : textColor,
              size: model.theme.baseFontSize * 2,
            }),
            new TextRun({
              text: row.value,
              bold: row.emphasis,
              color: row.emphasis ? primaryColor : textColor,
              size: model.theme.baseFontSize * 2,
            }),
          ],
        })
      );
    });

    const notesLines: any[] = [];
    if (model.notes.show && model.notes.text) {
      notesLines.push(new TextRun({ text: model.notes.heading.toUpperCase(), bold: true, color: primaryColor }));
      notesLines.push(new TextRun({ text: model.notes.text, color: mutedColor, break: 1 }));
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
              children: notesLines.length > 0 ? [new Paragraph({ children: notesLines })] : [],
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
    // Movable Footer Blocks
    // ========================================================
    const blocks = model.footerBlocks.filter(b => b.key !== 'footer');

    blocks.forEach(block => {
      if (block.key === 'payment' && block.data.show && block.data.instructions) {
        documentChildren.push(
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [
              new TextRun({
                text: block.data.heading.toUpperCase(),
                bold: true,
                color: primaryColor,
                size: model.theme.baseFontSize * 2,
              })
            ]
          })
        );
        documentChildren.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: block.data.instructions,
                color: mutedColor,
                size: model.theme.baseFontSize * 2,
              })
            ]
          })
        );
      }

      if (block.key === 'bank' && block.data.show && block.data.fields && block.data.fields.length > 0) {
        documentChildren.push(
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [
              new TextRun({
                text: block.data.heading.toUpperCase(),
                bold: true,
                color: primaryColor,
                size: model.theme.baseFontSize * 2,
              })
            ]
          })
        );

        const bankFieldsText: any[] = [];
        block.data.fields.forEach((f: any) => {
          bankFieldsText.push(
            new TextRun({ text: `${f.label}: `, bold: true, color: textColor, break: bankFieldsText.length > 0 ? 1 : 0 }),
            new TextRun({ text: f.value, color: mutedColor })
          );
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

      if (block.key === 'qr' && block.data.show && block.data.url) {
        try {
          const base64Data = block.data.url.replace(/^data:image\/\w+;base64,/, '');
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

      if (block.key === 'signature' && block.data.show) {
        const sigParagraphChildren: any[] = [];
        if (block.data.signatureUrl) {
          try {
            const base64Data = block.data.signatureUrl.replace(/^data:image\/\w+;base64,/, '');
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

        // Draw stamp if enabled
        if (block.data.showStamp && block.data.stampUrl) {
          try {
            const base64Data = block.data.stampUrl.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            // Signature and stamp side-by-side or stacked in DOCX. We prepend or append:
            documentChildren.push(
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 60, after: 40 },
                children: [
                  new ImageRun({
                    data: imgBuffer,
                    transformation: { width: 60, height: 60 },
                    type: 'png'
                  })
                ]
              })
            );
          } catch (err) {
            console.error('Failed to draw stamp image in docx:', err);
          }
        }

        sigParagraphChildren.push(
          new TextRun({ text: '__________________________', color: mutedColor }),
          new TextRun({ text: block.data.label, bold: true, color: textColor, break: 1 })
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
    const footerBlock = model.footerBlocks.find(b => b.key === 'footer');
    if (footerBlock && footerBlock.data.show) {
      docFooter = {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: footerBlock.data.text || '',
                  color: mutedColor,
                  size: (model.theme.baseFontSize - 2) * 2,
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
                width: model.theme.pageSize === 'LETTER' ? '8.5in' : '21cm',
                height: model.theme.pageSize === 'LETTER' ? '11in' : '29.7cm',
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
