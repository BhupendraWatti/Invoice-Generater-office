import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplateDefinitionDto, TemplateDefinitionInput, InvoiceData } from '@docflow/shared-types';
import { BASE_TEMPLATE, resolveTemplate } from './rendering/template-schema';
import { mapDocumentToInvoiceData } from './rendering/invoice-data.mapper';
import { DocxRenderer } from './rendering/docx.renderer';
import { PdfRenderer } from './rendering/pdf.renderer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TemplateEngineService implements OnModuleInit {
  private readonly definitionsDir = path.join(process.cwd(), 'template-definitions');

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Ensure template definitions storage directory exists
    if (!fs.existsSync(this.definitionsDir)) {
      fs.mkdirSync(this.definitionsDir, { recursive: true });
    }

    // Seed default template definitions if empty
    const files = fs.readdirSync(this.definitionsDir);
    if (files.length === 0) {
      // 1. Base Classic template
      const baseFile = path.join(this.definitionsDir, 'base-classic.json');
      fs.writeFileSync(baseFile, JSON.stringify(BASE_TEMPLATE, null, 2));

      // 2. Modern Blue template child overriding colors
      const modernTemplate: TemplateDefinitionDto = {
        ...BASE_TEMPLATE,
        meta: {
          id: 'modern-blue',
          name: 'Modern Blue Theme',
          category: 'INVOICE',
          isDefault: false,
          extends: 'base-classic',
          description: 'A contemporary child layout with dark primary slate hues',
          version: 1,
        },
        theme: {
          fonts: { heading: 'Helvetica-Bold', body: 'Helvetica', mono: 'Courier' },
          baseFontSize: 10,
          colors: {
            primary: '#0D9488', // Teal accent
            text: '#1F2937',
            muted: '#6B7280',
            border: '#F3F4F6',
            tableHeaderBg: '#E6F4F2',
            tableHeaderText: '#0F766E',
            zebraBg: '#F0F9F8',
          },
        },
        table: {
          ...BASE_TEMPLATE.table,
          zebra: true,
          showBorders: false,
        },
      };
      const modernFile = path.join(this.definitionsDir, 'modern-blue.json');
      fs.writeFileSync(modernFile, JSON.stringify(modernTemplate, null, 2));
    }
  }

  // --- CRUD API ---

  async listDefinitions(): Promise<TemplateDefinitionDto[]> {
    const files = fs.readdirSync(this.definitionsDir);
    const list: TemplateDefinitionDto[] = [];
    files.forEach(file => {
      if (file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(path.join(this.definitionsDir, file), 'utf8');
          list.push(JSON.parse(content));
        } catch (e) {
          console.error(`Failed to parse template definition file: ${file}`, e);
        }
      }
    });
    return list;
  }

  async getDefinition(id: string): Promise<TemplateDefinitionDto> {
    const filePath = path.join(this.definitionsDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Template definition with ID "${id}" not found`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }

  async createDefinition(input: TemplateDefinitionInput): Promise<TemplateDefinitionDto> {
    const id = input.meta?.id || `tmpl-${Date.now()}`;
    const name = input.meta?.name || 'Untitled Layout';
    const filePath = path.join(this.definitionsDir, `${id}.json`);

    // Base template structure overrides
    const newTemplate = {
      ...BASE_TEMPLATE,
      ...input,
      meta: {
        ...BASE_TEMPLATE.meta,
        ...(input.meta || {}),
        id,
        name,
        isDefault: false,
        extends: input.meta?.extends || null,
        version: 1,
      },
    };

    fs.writeFileSync(filePath, JSON.stringify(newTemplate, null, 2));
    return newTemplate;
  }

  async updateDefinition(id: string, input: any): Promise<TemplateDefinitionDto> {
    const filePath = path.join(this.definitionsDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Template definition with ID "${id}" not found`);
    }

    const existing = await this.getDefinition(id);
    const updated = {
      ...existing,
      ...input,
      meta: {
        ...existing.meta,
        ...(input.meta || {}),
        id, // Keep original id immutable
      },
    };

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    return updated;
  }

  async deleteDefinition(id: string): Promise<{ success: boolean }> {
    const filePath = path.join(this.definitionsDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Template definition with ID "${id}" not found`);
    }
    fs.unlinkSync(filePath);
    return { success: true };
  }

  // --- Render & Preview Pipeline ---

  async render(
    documentId: string,
    templateId: string,
    format: 'pdf' | 'docx'
  ) {
    // 1. Fetch document with nested inclusions
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        blocks: { orderBy: { sortOrder: 'asc' } },
        company: {
          include: {
            bankAccounts: true,
            branding: true,
          }
        },
        customer: true,
      }
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID "${documentId}" not found`);
    }

    // 2. Resolve template configuration layout
    const definitions = await this.listDefinitions();
    const target = definitions.find(d => d.meta.id === templateId) || BASE_TEMPLATE;
    const resolvedTemplate = resolveTemplate(target, () => definitions);

    if (doc.accentColor) {
      resolvedTemplate.theme.colors.primary = doc.accentColor;
    }
    if (doc.fontFamily) {
      if (doc.fontFamily === 'font-serif') {
        resolvedTemplate.theme.fonts.heading = 'Times-Bold';
        resolvedTemplate.theme.fonts.body = 'Times-Roman';
      } else if (doc.fontFamily === 'font-mono') {
        resolvedTemplate.theme.fonts.heading = 'Courier-Bold';
        resolvedTemplate.theme.fonts.body = 'Courier';
      } else {
        resolvedTemplate.theme.fonts.heading = 'Helvetica-Bold';
        resolvedTemplate.theme.fonts.body = 'Helvetica';
      }
    }

    // 3. Map document to normalized view-model
    const invoiceData = mapDocumentToInvoiceData(doc);

    // 4. Select renderer and run builder
    let buffer: Buffer;
    let mimeType = '';
    let ext = '';

    if (format === 'docx') {
      const renderer = new DocxRenderer();
      buffer = await renderer.render(invoiceData, resolvedTemplate);
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      ext = 'docx';
    } else {
      const renderer = new PdfRenderer();
      buffer = await renderer.render(invoiceData, resolvedTemplate);
      mimeType = 'application/pdf';
      ext = 'pdf';
    }

    const filename = `${doc.title.replace(/\s+/g, '_')}_invoice.${ext}`;

    return {
      success: true,
      filename,
      mimeType,
      base64: buffer.toString('base64'),
      sizeBytes: buffer.length,
    };
  }

  async getPreview(template: any, documentId?: string) {
    let invoiceData: InvoiceData;

    if (documentId) {
      const doc = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          blocks: { orderBy: { sortOrder: 'asc' } },
          company: {
            include: {
              bankAccounts: true,
              branding: true,
            }
          },
          customer: true,
        }
      });
      if (doc) {
        invoiceData = mapDocumentToInvoiceData(doc);
      }
    }

    // Sample mock invoice fallback data
    if (!invoiceData) {
      invoiceData = {
        documentId: 'preview-id',
        documentType: 'INVOICE',
        documentNumber: 'INV-2026-0089',
        title: 'Draft Invoice #0089',
        status: 'DRAFT',
        issueDate: '2026-07-11',
        dueDate: '2026-08-11',
        currencySymbol: '₹',
        organization: {
          name: 'Granth Infotech Pvt. Ltd.',
          lines: ['304 Lotus Corporate Park, Goregaon', 'Mumbai, Maharashtra'],
          taxId: 'PAN: AAACG1234F',
          email: 'accounts@granthinfotech.com',
          phone: '+91 22 4567 8901',
        },
        billTo: {
          name: 'Acme Software Solutions',
          lines: ['18 Ring Road, Tech Corridor', 'Bangalore, Karnataka'],
          taxId: 'GSTIN: 29AABCA1234F1Z5',
          email: 'procurement@acme.com',
          phone: '+91 80 1234 5678',
        },
        items: [
          {
            index: 1,
            sku: 'DEV-SR',
            description: 'Senior Software Engineer Consultant retainer hours',
            quantity: 120,
            unit: 'HRS',
            rate: 2200,
            taxLabel: 'GST 18%',
            taxRate: 18,
            taxAmount: 47520,
            amount: 264000,
          },
          {
            index: 2,
            sku: 'HOST-CLOUD',
            description: 'AWS Enterprise Production Server infrastructure provisioning',
            quantity: 1,
            unit: 'PCS',
            rate: 45000,
            taxLabel: 'GST 18%',
            taxRate: 18,
            taxAmount: 8100,
            amount: 45000,
          },
        ],
        subtotal: 309000,
        discount: 0,
        taxTotal: 55620,
        shipping: 0,
        adjustment: 0,
        grandTotal: 364620,
        notes: 'Terms of payment is net 30 days. Thank you for choosing Granth Infotech as your primary engineering delivery vendor.',
        bank: {
          bankName: 'ICICI Commercial Bank Ltd.',
          accountHolder: 'Granth Infotech Private Limited',
          accountNumber: '10998877665544',
          iban: 'ICIC0001099',
          bic: 'ICICINBBXXX',
        },
      };
    }

    const definitions = await this.listDefinitions();
    const resolvedTemplate = resolveTemplate(template, () => definitions);

    return {
      template: resolvedTemplate,
      invoiceData,
    };
  }
}
