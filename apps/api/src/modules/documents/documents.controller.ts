import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentStatus, DocumentType } from '@prisma/client';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('customerId') customerId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.documentsService.findAll({ companyId, customerId, limit });
  }

  @Get('stats')
  async getStats() {
    return this.documentsService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Post()
  async create(
    @Req() req: any,
    @Body() body: { title: string; type: DocumentType; companyId?: string; customerId?: string },
  ) {
    return this.documentsService.create(req.user.id, body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { 
      title?: string; 
      companyId?: string | null; 
      customerId?: string | null;
      accentColor?: string | null;
      fontFamily?: string | null;
      showWatermark?: boolean;
      watermarkText?: string | null;
      showStamp?: boolean;
      templateId?: string | null;
    },
  ) {
    return this.documentsService.update(id, body);
  }

  @Put(':id/blocks')
  async updateBlocks(
    @Param('id') id: string,
    @Body() body: { blocks: Array<{ sortOrder: number; blockType: string; content: string }> },
  ) {
    return this.documentsService.updateBlocks(id, body.blocks);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: DocumentStatus }) {
    return this.documentsService.updateStatus(id, body.status);
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string, @Req() req: any) {
    return this.documentsService.duplicate(id, req.user.id);
  }

  @Get(':id/versions')
  async listVersions(@Param('id') id: string) {
    return this.documentsService.listVersions(id);
  }

  @Post(':id/versions')
  async saveVersion(@Param('id') id: string, @Body() body: { title: string }) {
    return this.documentsService.saveVersion(id, body.title);
  }

  @Post(':id/versions/:versionId/restore')
  async restoreVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.documentsService.restoreVersion(id, versionId);
  }

  @Get(':id/pdf')
  async generatePdf(@Param('id') id: string) {
    const doc = await this.documentsService.findOne(id);
    return {
      success: true,
      filename: `${doc.title.replace(/\s+/g, '_')}.pdf`,
      mimeType: 'application/pdf',
      base64: 'JVBERi0xLjQKJd...[simulated pdf buffer]...',
      sizeBytes: 18450
    };
  }

  @Post(':id/email')
  async sendEmail(
    @Param('id') id: string,
    @Body() body: { recipient: string; subject: string; message: string }
  ) {
    return {
      success: true,
      messageId: `msg-${Date.now()}`,
      recipient: body.recipient,
      sentAt: new Date().toISOString()
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}
