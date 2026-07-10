import { Injectable, NotFoundException } from '@nestjs/common';
import { TemplateDto } from '@docflow/shared-types';

@Injectable()
export class TemplatesService {
  private templates: TemplateDto[] = [
    {
      id: 'template-1',
      name: 'Modern Standard',
      category: 'INVOICE',
      isDefault: true,
      accentColor: '#3525CD',
      primaryFont: 'inter',
      showPaymentStub: true,
      includeTermsPage: false,
      compactLineItems: true,
      lastEdited: '2 days ago',
    },
    {
      id: 'template-2',
      name: 'Creative Split',
      category: 'INVOICE',
      isDefault: false,
      accentColor: '#10B981',
      primaryFont: 'roboto',
      showPaymentStub: false,
      includeTermsPage: true,
      compactLineItems: false,
      lastEdited: 'Used in 14 invoices',
    },
    {
      id: 'template-3',
      name: 'Agency Sidebar',
      category: 'INVOICE',
      isDefault: false,
      accentColor: '#EF4444',
      primaryFont: 'merriweather',
      showPaymentStub: true,
      includeTermsPage: true,
      compactLineItems: true,
      lastEdited: 'New',
    },
  ];

  async findAll() {
    return this.templates;
  }

  async findOne(id: string) {
    const template = this.templates.find((t) => t.id === id);
    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }
    return template;
  }

  async create(data: Omit<TemplateDto, 'id' | 'lastEdited'>) {
    const newTemplate: TemplateDto = {
      ...data,
      id: `template-${Date.now()}`,
      lastEdited: 'Just now',
    };
    this.templates.push(newTemplate);
    return newTemplate;
  }

  async update(id: string, data: Partial<Omit<TemplateDto, 'id' | 'lastEdited'>>) {
    const idx = this.templates.findIndex((t) => t.id === id);
    if (idx === -1) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }
    this.templates[idx] = {
      ...this.templates[idx],
      ...data,
    };
    return this.templates[idx];
  }

  async remove(id: string) {
    const idx = this.templates.findIndex((t) => t.id === id);
    if (idx === -1) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }
    const deleted = this.templates[idx];
    this.templates.splice(idx, 1);
    return deleted;
  }
}
