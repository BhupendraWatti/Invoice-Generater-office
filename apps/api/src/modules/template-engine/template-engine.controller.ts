import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TemplateEngineService } from './template-engine.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('template-engine')
@UseGuards(JwtAuthGuard)
export class TemplateEngineController {
  constructor(private readonly service: TemplateEngineService) {}

  @Get('definitions')
  async listDefinitions() {
    return this.service.listDefinitions();
  }

  @Get('definitions/:id')
  async getDefinition(@Param('id') id: string) {
    return this.service.getDefinition(id);
  }

  @Post('definitions')
  async createDefinition(@Body() body: any) {
    return this.service.createDefinition(body);
  }

  @Put('definitions/:id')
  async updateDefinition(@Param('id') id: string, @Body() body: any) {
    return this.service.updateDefinition(id, body);
  }

  @Delete('definitions/:id')
  async deleteDefinition(@Param('id') id: string) {
    return this.service.deleteDefinition(id);
  }

  @Post('render/:documentId')
  async render(
    @Param('documentId') documentId: string,
    @Body() body: { templateId: string; format: 'pdf' | 'docx' }
  ) {
    return this.service.render(documentId, body.templateId, body.format);
  }

  @Post('preview')
  async getPreview(@Body() body: { template: any; documentId?: string }) {
    return this.service.getPreview(body.template, body.documentId);
  }
}
