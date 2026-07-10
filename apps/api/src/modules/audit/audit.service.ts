import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Response } from 'express';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    userId: string | null,
    action: string,
    details?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          details,
          ipAddress,
          userAgent,
        },
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }

  async listLogs(page = 1, limit = 20, actionFilter?: string, emailFilter?: string) {
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {};
    if (actionFilter) {
      where.action = { contains: actionFilter };
    }

    if (emailFilter) {
      // Find matching user IDs first
      const users = await this.prisma.user.findMany({
        where: {
          email: { contains: emailFilter },
        },
        select: { id: true },
      });
      const userIds = users.map((u) => u.id);
      where.userId = { in: userIds };
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Map user email info into logs DTO
    const userIds = Array.from(new Set(items.map((i) => i.userId).filter(Boolean))) as string[];
    const usersMap = new Map<string, string>();
    if (userIds.length > 0) {
      const dbUsers = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      });
      dbUsers.forEach((u) => usersMap.set(u.id, u.email));
    }

    const logs = items.map((i) => ({
      id: i.id,
      userId: i.userId,
      userEmail: i.userId ? usersMap.get(i.userId) || 'Unknown User' : 'System / Guest',
      action: i.action,
      ipAddress: i.ipAddress,
      userAgent: i.userAgent,
      details: i.details,
      createdAt: i.createdAt.toISOString(),
    }));

    return {
      logs,
      total,
      page,
      pagesCount: Math.ceil(total / limit),
    };
  }

  async exportLogsCsv(res: Response) {
    const items = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const userIds = Array.from(new Set(items.map((i) => i.userId).filter(Boolean))) as string[];
    const usersMap = new Map<string, string>();
    if (userIds.length > 0) {
      const dbUsers = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      });
      dbUsers.forEach((u) => usersMap.set(u.id, u.email));
    }

    // Generate CSV contents
    const headers = ['Log ID', 'User Email', 'Action Code', 'IP Address', 'User Agent', 'Details Log', 'Created Timestamp'];
    const rows = items.map((i) => [
      i.id,
      i.userId ? usersMap.get(i.userId) || 'Unknown' : 'System',
      i.action,
      i.ipAddress || '-',
      (i.userAgent || '-').replace(/"/g, '""'),
      (i.details || '-').replace(/"/g, '""').replace(/\n/g, ' '),
      i.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=compliance_audit_logs.csv');
    res.status(200).send(csvContent);
  }
}
