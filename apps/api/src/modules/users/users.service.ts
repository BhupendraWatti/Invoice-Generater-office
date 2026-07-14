import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updateUser(id: string, data: { firstName?: string; lastName?: string; mfaEnabled?: boolean }) {
    const updateData: any = { ...data };
    if (data.mfaEnabled !== undefined) {
      if (data.mfaEnabled) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user?.mfaSecret) {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
          let secret = '';
          for (let i = 0; i < 16; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          updateData.mfaSecret = secret;
        }
      } else {
        updateData.mfaSecret = null;
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        mfaEnabled: true,
        mfaSecret: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  }

  async listAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
      },
      orderBy: { email: 'asc' },
    });
  }

  async changeRole(id: string, role: any) {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}

