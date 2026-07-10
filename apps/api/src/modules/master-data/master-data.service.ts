import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // CURRENCIES CRUD
  // ==========================================

  async findAllCurrencies() {
    return this.prisma.currency.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async createCurrency(data: any) {
    if (data.isDefault) {
      await this.prisma.currency.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.currency.create({
      data: {
        code: data.code,
        name: data.name,
        symbol: data.symbol,
        exchangeRate: data.exchangeRate || 1.0,
        isDefault: !!data.isDefault,
      },
    });
  }

  async updateCurrency(id: string, data: any) {
    if (data.isDefault) {
      await this.prisma.currency.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.currency.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        symbol: data.symbol,
        exchangeRate: data.exchangeRate,
        isDefault: data.isDefault !== undefined ? !!data.isDefault : undefined,
      },
    });
  }

  async removeCurrency(id: string) {
    return this.prisma.currency.delete({
      where: { id },
    });
  }

  // ==========================================
  // PAYMENT TERMS CRUD
  // ==========================================

  async findAllPaymentTerms() {
    return this.prisma.paymentTerm.findMany({
      orderBy: { daysDue: 'asc' },
    });
  }

  async createPaymentTerm(data: any) {
    if (data.isDefault) {
      await this.prisma.paymentTerm.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.paymentTerm.create({
      data: {
        name: data.name,
        daysDue: Number(data.daysDue),
        description: data.description,
        isDefault: !!data.isDefault,
      },
    });
  }

  async updatePaymentTerm(id: string, data: any) {
    if (data.isDefault) {
      await this.prisma.paymentTerm.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.paymentTerm.update({
      where: { id },
      data: {
        name: data.name,
        daysDue: data.daysDue !== undefined ? Number(data.daysDue) : undefined,
        description: data.description,
        isDefault: data.isDefault !== undefined ? !!data.isDefault : undefined,
      },
    });
  }

  async removePaymentTerm(id: string) {
    return this.prisma.paymentTerm.delete({
      where: { id },
    });
  }

  // ==========================================
  // DOCUMENT NUMBERINGS CONFIGS
  // ==========================================

  async findAllNumberings() {
    return this.prisma.documentNumbering.findMany({
      orderBy: { documentType: 'asc' },
    });
  }

  async createOrUpdateNumbering(data: any) {
    const existing = await this.prisma.documentNumbering.findUnique({
      where: { documentType: data.documentType },
    });

    if (existing) {
      return this.prisma.documentNumbering.update({
        where: { id: existing.id },
        data: {
          prefix: data.prefix,
          suffix: data.suffix,
          currentNumber: data.currentNumber !== undefined ? Number(data.currentNumber) : undefined,
          paddingDigits: data.paddingDigits !== undefined ? Number(data.paddingDigits) : undefined,
        },
      });
    }

    return this.prisma.documentNumbering.create({
      data: {
        documentType: data.documentType,
        prefix: data.prefix,
        suffix: data.suffix,
        currentNumber: Number(data.currentNumber || 1),
        paddingDigits: Number(data.paddingDigits || 4),
      },
    });
  }

  // ==========================================
  // NOTE LOGGING
  // ==========================================

  async findNotesForEntity(companyId?: string, customerId?: string) {
    return this.prisma.note.findMany({
      where: {
        companyId: companyId || undefined,
        customerId: customerId || undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createNote(data: any) {
    return this.prisma.note.create({
      data: {
        content: data.content,
        authorId: data.authorId || 'system-user',
        companyId: data.companyId || null,
        customerId: data.customerId || null,
      },
    });
  }

  async removeNote(id: string) {
    return this.prisma.note.delete({
      where: { id },
    });
  }

  // ==========================================
  // ATTACHMENTS REGISTRY
  // ==========================================

  async findAttachmentsForEntity(companyId?: string, customerId?: string) {
    return this.prisma.attachment.findMany({
      where: {
        companyId: companyId || undefined,
        customerId: customerId || undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAttachment(data: any) {
    return this.prisma.attachment.create({
      data: {
        filename: data.filename,
        filepath: data.filepath,
        mimetype: data.mimetype,
        sizeBytes: Number(data.sizeBytes),
        uploaderId: data.uploaderId || 'system-user',
        companyId: data.companyId || null,
        customerId: data.customerId || null,
      },
    });
  }

  async removeAttachment(id: string) {
    return this.prisma.attachment.delete({
      where: { id },
    });
  }

  // ==========================================
  // TAGS CATEGORIZATION
  // ==========================================

  async findAllTags(entityType?: string) {
    return this.prisma.tag.findMany({
      where: entityType ? { entityType } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async createTag(data: any) {
    return this.prisma.tag.upsert({
      where: {
        name_entityType: {
          name: data.name,
          entityType: data.entityType,
        },
      },
      update: {
        color: data.color,
      },
      create: {
        name: data.name,
        color: data.color,
        entityType: data.entityType,
      },
    });
  }

  async removeTag(id: string) {
    return this.prisma.tag.delete({
      where: { id },
    });
  }
}
