import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentStatus, DocumentType } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { companyId?: string; customerId?: string; limit?: number; recent?: boolean }) {
    const where: any = {};
    if (query.companyId) {
      where.companyId = query.companyId;
    }
    if (query.customerId) {
      where.customerId = query.customerId;
    }

    return this.prisma.document.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: query.limit ? Number(query.limit) : undefined,
      include: {
        company: true,
        customer: true,
        author: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        blocks: {
          orderBy: { sortOrder: 'asc' },
        },
        company: true,
        customer: true,
        author: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID "${id}" not found`);
    }

    return doc;
  }

  async create(authorId: string, data: { title: string; type: DocumentType; companyId?: string; customerId?: string }) {
    let finalTitle = data.title;
    
    // Auto-generate increment serial number format if title is blank or generic
    if (!finalTitle || finalTitle.toLowerCase() === 'untitled' || finalTitle.toLowerCase() === 'new document') {
      const typeStr = data.type.toString();
      const numConfig = await this.prisma.documentNumbering.findUnique({
        where: { documentType: typeStr }
      });
      if (numConfig) {
        const nextVal = numConfig.currentNumber;
        const padded = String(nextVal).padStart(numConfig.paddingDigits, '0');
        finalTitle = `${numConfig.prefix}${padded}${numConfig.suffix || ''}`;
        
        await this.prisma.documentNumbering.update({
          where: { id: numConfig.id },
          data: { currentNumber: nextVal + 1 }
        });
      } else {
        finalTitle = `${data.type.toString().replace('_', ' ')} #${Date.now()}`;
      }
    }

    return this.prisma.document.create({
      data: {
        title: finalTitle,
        type: data.type,
        status: DocumentStatus.DRAFT,
        companyId: data.companyId || null,
        customerId: data.customerId || null,
        authorId,
        templateId: 'base-classic',
      },
    });
  }

  async update(id: string, data: { title?: string; companyId?: string | null; customerId?: string | null; accentColor?: string | null; fontFamily?: string | null; showWatermark?: boolean; watermarkText?: string | null; showStamp?: boolean; templateId?: string | null }) {
    await this.findOne(id);
    return this.prisma.document.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        companyId: data.companyId !== undefined ? data.companyId : undefined,
        customerId: data.customerId !== undefined ? data.customerId : undefined,
        accentColor: data.accentColor !== undefined ? data.accentColor : undefined,
        fontFamily: data.fontFamily !== undefined ? data.fontFamily : undefined,
        showWatermark: data.showWatermark !== undefined ? data.showWatermark : undefined,
        watermarkText: data.watermarkText !== undefined ? data.watermarkText : undefined,
        showStamp: data.showStamp !== undefined ? data.showStamp : undefined,
        templateId: data.templateId !== undefined ? data.templateId : undefined,
      },
    });
  }

  async updateBlocks(id: string, blocks: Array<{ sortOrder: number; blockType: string; content: string }>) {
    await this.findOne(id); // Ensure document exists

    // Use a transaction to clean and recreate blocks
    return this.prisma.$transaction(async (tx) => {
      await tx.documentBlock.deleteMany({
        where: { documentId: id },
      });

      return tx.document.update({
        where: { id },
        data: {
          blocks: {
            createMany: {
              data: blocks.map((b) => ({
                sortOrder: b.sortOrder,
                blockType: b.blockType,
                content: b.content,
              })),
            },
          },
        },
        include: {
          blocks: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });
  }

  async updateStatus(id: string, status: DocumentStatus) {
    await this.findOne(id);
    return this.prisma.document.update({
      where: { id },
      data: { status },
    });
  }

  async duplicate(id: string, authorId: string) {
    const original = await this.findOne(id);
    
    // Auto-generate serial sequence numbering for duplicate copies
    const typeStr = original.type.toString();
    const numConfig = await this.prisma.documentNumbering.findUnique({
      where: { documentType: typeStr }
    });
    
    let newTitle = `${original.title} (Copy)`;
    if (numConfig) {
      const nextVal = numConfig.currentNumber;
      const padded = String(nextVal).padStart(numConfig.paddingDigits, '0');
      newTitle = `${numConfig.prefix}${padded}${numConfig.suffix || ''}`;
      
      await this.prisma.documentNumbering.update({
        where: { id: numConfig.id },
        data: { currentNumber: nextVal + 1 }
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const cloned = await tx.document.create({
        data: {
          title: newTitle,
          type: original.type,
          status: original.status,
          companyId: original.companyId,
          customerId: original.customerId,
          authorId,
          accentColor: original.accentColor,
          fontFamily: original.fontFamily,
          showWatermark: original.showWatermark,
          watermarkText: original.watermarkText,
          showStamp: original.showStamp,
        }
      });

      if (original.blocks && original.blocks.length > 0) {
        await tx.documentBlock.createMany({
          data: original.blocks.map(b => ({
            documentId: cloned.id,
            sortOrder: b.sortOrder,
            blockType: b.blockType,
            content: b.content
          }))
        });
      }

      return tx.document.findUnique({
        where: { id: cloned.id },
        include: { blocks: true }
      });
    });
  }

  async listVersions(documentId: string) {
    return this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' }
    });
  }

  async saveVersion(documentId: string, title: string) {
    const doc = await this.findOne(documentId);
    const serializedBlocks = JSON.stringify(doc.blocks || []);
    
    const count = await this.prisma.documentVersion.count({
      where: { documentId }
    });

    return this.prisma.documentVersion.create({
      data: {
        documentId,
        version: count + 1,
        title: title || `Revision snapshot ${count + 1}`,
        content: serializedBlocks
      }
    });
  }

  async restoreVersion(documentId: string, versionId: string) {
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: versionId }
    });
    if (!version) {
      throw new NotFoundException(`Revision Version snapshot with ID "${versionId}" not found`);
    }

    const blocks = JSON.parse(version.content);

    return this.prisma.$transaction(async (tx) => {
      await tx.documentBlock.deleteMany({
        where: { documentId }
      });

      if (blocks.length > 0) {
        await tx.documentBlock.createMany({
          data: blocks.map((b: any) => ({
            documentId,
            sortOrder: b.sortOrder,
            blockType: b.blockType,
            content: b.content
          }))
        });
      }

      return tx.document.findUnique({
        where: { id: documentId },
        include: {
          blocks: { orderBy: { sortOrder: 'asc' } }
        }
      });
    });
  }

  async getStats() {
    const pendingReviewCount = await this.prisma.document.count({
      where: { status: DocumentStatus.REVIEW },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const approvedSevenDaysCount = await this.prisma.document.count({
      where: {
        status: DocumentStatus.COMPLETED,
        updatedAt: { gte: sevenDaysAgo },
      },
    });

    // Mock storage percentage as requested in Stitch designs
    const storageUsedPercent = 64;

    return {
      pendingReviewCount,
      approvedSevenDaysCount,
      storageUsedPercent,
    };
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.document.delete({
      where: { id },
    });
  }
}
