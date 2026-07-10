import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityType } from '@prisma/client';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(limit?: number) {
    return this.prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit ? Number(limit) : undefined,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        document: {
          select: { title: true, type: true },
        },
      },
    });
  }

  async create(data: { userId: string; actionType: ActivityType; documentId?: string; details: string }) {
    return this.prisma.activity.create({
      data: {
        userId: data.userId,
        actionType: data.actionType,
        documentId: data.documentId || null,
        details: data.details,
      },
    });
  }
}
