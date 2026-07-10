import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuditService } from './audit.service';
import { Response } from 'express';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async listLogs(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('action') action?: string,
    @Query('email') email?: string
  ) {
    return this.auditService.listLogs(
      Number(page) || 1,
      Number(limit) || 20,
      action,
      email
    );
  }

  @Get('export')
  @Roles(UserRole.ADMIN)
  async exportCsv(@Res() res: Response) {
    return this.auditService.exportLogsCsv(res);
  }
}
