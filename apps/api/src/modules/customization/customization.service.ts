import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomizationService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // 1. Custom Field Configs
  // =========================================================================
  async listFieldConfigs(entityType?: string) {
    return this.prisma.customFieldConfig.findMany({
      where: entityType ? { entityType } : {},
      orderBy: { createdAt: 'asc' },
    });
  }

  async createFieldConfig(data: any) {
    return this.prisma.customFieldConfig.create({
      data: {
        entityType: data.entityType,
        fieldName: data.fieldName.toLowerCase().replace(/\s+/g, '_'),
        fieldLabel: data.fieldLabel,
        fieldType: data.fieldType,
        validation: data.validation || null,
        isRequired: !!data.isRequired,
        options: data.options || null,
      },
    });
  }

  async deleteFieldConfig(id: string) {
    return this.prisma.customFieldConfig.delete({
      where: { id },
    });
  }

  // =========================================================================
  // 2. Custom Document Types
  // =========================================================================
  async listDocumentTypes() {
    return this.prisma.customDocumentType.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async createDocumentType(data: any) {
    return this.prisma.customDocumentType.create({
      data: {
        name: data.name.toUpperCase().replace(/\s+/g, '_'),
        label: data.label,
        prefix: data.prefix.toUpperCase(),
        description: data.description || null,
      },
    });
  }

  async deleteDocumentType(id: string) {
    return this.prisma.customDocumentType.delete({
      where: { id },
    });
  }

  // =========================================================================
  // 3. Workspace Preferences
  // =========================================================================
  async getPreferences(userId: string) {
    let pref = await this.prisma.workspacePreference.findFirst({
      where: { userId },
    });
    if (!pref) {
      pref = await this.prisma.workspacePreference.create({
        data: {
          userId,
          densityMode: 'DEFAULT',
          theme: 'LIGHT',
        },
      });
    }
    return pref;
  }

  async updatePreferences(userId: string, data: any) {
    const pref = await this.getPreferences(userId);
    return this.prisma.workspacePreference.update({
      where: { id: pref.id },
      data: {
        densityMode: data.densityMode,
        theme: data.theme,
        shortcuts: data.shortcuts,
        savedViews: data.savedViews,
      },
    });
  }

  // =========================================================================
  // 4. Company Branding
  // =========================================================================
  async getBranding(companyId: string) {
    let branding = await this.prisma.companyBranding.findUnique({
      where: { companyId },
    });
    if (!branding) {
      branding = await this.prisma.companyBranding.create({
        data: {
          companyId,
          primaryColor: '#3525CD',
          fontFamily: 'inter',
        },
      });
    }
    return branding;
  }

  async updateBranding(companyId: string, data: any) {
    const branding = await this.getBranding(companyId);
    return this.prisma.companyBranding.update({
      where: { id: branding.id },
      data: {
        logoUrl: data.logoUrl,
        signatures: data.signatures || [],
        stamps: data.stamps || [],
        letterhead: data.letterhead,
        primaryColor: data.primaryColor || '#3525CD',
        fontFamily: data.fontFamily || 'inter',
      },
    });
  }
}
