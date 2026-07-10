import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async checkHealth() {
    let dbStatus = 'UP';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      dbStatus = 'DOWN';
    }

    return {
      status: dbStatus === 'UP' ? 'OK' : 'ERROR',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      details: {
        database: dbStatus,
        memoryUsage: process.memoryUsage(),
      },
    };
  }
}
