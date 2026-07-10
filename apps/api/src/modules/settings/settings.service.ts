import { Injectable } from '@nestjs/common';

export interface SystemSettings {
  archivePeriodMonths: number;
  maxFileSizeMb: number;
}

@Injectable()
export class SettingsService {
  private systemSettings: SystemSettings = {
    archivePeriodMonths: 12,
    maxFileSizeMb: 50,
  };

  async getSystemSettings(): Promise<SystemSettings> {
    return this.systemSettings;
  }

  async updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    this.systemSettings = {
      ...this.systemSettings,
      ...data,
    };
    return this.systemSettings;
  }
}
