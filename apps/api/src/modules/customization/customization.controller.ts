import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpException } from '@nestjs/common';
import { CustomizationService } from './customization.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('customization')
@UseGuards(JwtAuthGuard)
export class CustomizationController {
  constructor(private readonly customizationService: CustomizationService) {}

  // Field Configs
  @Get('fields')
  async listFieldConfigs(@Query('entityType') entityType?: string) {
    return this.customizationService.listFieldConfigs(entityType);
  }

  @Post('fields')
  async createFieldConfig(@Body() body: any) {
    return this.customizationService.createFieldConfig(body);
  }

  @Delete('fields/:id')
  async deleteFieldConfig(@Param('id') id: string) {
    return this.customizationService.deleteFieldConfig(id);
  }

  // Document Types
  @Get('types')
  async listDocumentTypes() {
    return this.customizationService.listDocumentTypes();
  }

  @Post('types')
  async createDocumentType(@Body() body: any) {
    return this.customizationService.createDocumentType(body);
  }

  @Delete('types/:id')
  async deleteDocumentType(@Param('id') id: string) {
    return this.customizationService.deleteDocumentType(id);
  }

  // Preferences
  @Get('preferences')
  async getPreferences(@Request() req: any) {
    return this.customizationService.getPreferences(req.user.userId);
  }

  @Put('preferences')
  async updatePreferences(@Request() req: any, @Body() body: any) {
    return this.customizationService.updatePreferences(req.user.userId, body);
  }

  // Company Branding
  @Get('branding/:companyId')
  async getBranding(@Param('companyId') companyId: string) {
    return this.customizationService.getBranding(companyId);
  }

  @Put('branding/:companyId')
  async updateBranding(@Param('companyId') companyId: string, @Body() body: any) {
    try {
      return await this.customizationService.updateBranding(companyId, body);
    } catch (err: any) {
      console.error(`Branding update failed for company ${companyId}:`, err);
      throw new HttpException(
        { message: err?.message || 'Branding update failed', detail: err?.stack || '' },
        500
      );
    }
  }
}
