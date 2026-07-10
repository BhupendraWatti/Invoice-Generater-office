import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmailQueueService {
  private readonly smtpConfig = {
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: 'billing@docflow-workspace.com',
      pass: 'HostingerSecurePassword123!',
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.emailJob.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createJob(data: { recipient: string; subject: string; message: string }) {
    return this.prisma.emailJob.create({
      data: {
        recipient: data.recipient,
        subject: data.subject,
        message: data.message,
        status: 'PENDING',
        retryCount: 0,
      },
    });
  }

  async processQueue() {
    const pendingJobs = await this.prisma.emailJob.findMany({
      where: { status: 'PENDING' },
    });

    for (const job of pendingJobs) {
      try {
        // Simulated SMTP Dispatch using Hostinger config parameters
        console.log(`[Hostinger SMTP] Dispatching message to ${job.recipient} via ${this.smtpConfig.host}:${this.smtpConfig.port}`);
        
        // Simulating a random failures edge case to demonstrate retry queue monitoring UI
        if (job.recipient.toLowerCase().includes('fail')) {
          throw new Error('550 Recipient address rejected: Access Denied by Hostinger SMTP gateway.');
        }

        await this.prisma.emailJob.update({
          where: { id: job.id },
          data: { status: 'SENT', updatedAt: new Date() },
        });
      } catch (err: any) {
        console.error(`SMTP Dispatch failed for Job ${job.id}:`, err);
        const nextRetries = job.retryCount + 1;
        await this.prisma.emailJob.update({
          where: { id: job.id },
          data: {
            retryCount: nextRetries,
            status: nextRetries >= 3 ? 'FAILED' : 'PENDING', // Fail permanently after 3 attempts
            errorMessage: err.message || 'Unknown SMTP error',
            updatedAt: new Date(),
          },
        });
      }
    }
  }

  async retryJob(id: string) {
    const job = await this.prisma.emailJob.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Email Job with ID "${id}" not found`);
    }

    return this.prisma.emailJob.update({
      where: { id },
      data: {
        status: 'PENDING',
        retryCount: 0,
        errorMessage: null,
      },
    });
  }
}
