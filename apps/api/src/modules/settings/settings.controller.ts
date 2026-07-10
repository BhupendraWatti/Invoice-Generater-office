import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService, SystemSettings } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('system')
  async getSystemSettings(): Promise<SystemSettings> {
    return this.settingsService.getSystemSettings();
  }

  @Put('system')
  async updateSystemSettings(@Body() body: Partial<SystemSettings>): Promise<SystemSettings> {
    return this.settingsService.updateSystemSettings(body);
  }
}
