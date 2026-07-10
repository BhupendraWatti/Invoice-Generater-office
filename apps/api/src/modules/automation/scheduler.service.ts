import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailQueueService } from '../email-queue/email-queue.service';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly emails: EmailQueueService,
  ) {}

  onModuleInit() {
    // Run daily sweeps simulation every 1 minute in development to make it testable,
    // and process SMTP queue items.
    this.timer = setInterval(async () => {
      console.log('[Scheduler] Executing periodic automation sweeps...');
      await this.runOverdueSweeps();
      await this.runReminderSweeps();
      await this.runRecurringBillingSweeps();
      await this.emails.processQueue();
    }, 60000); // 1 minute interval loop
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /**
   * 1. Automatic Overdue Detection
   */
  async runOverdueSweeps() {
    const today = new Date();
    
    // Fetch all active pending renewals past expiry date
    const overdueRenewals = await this.prisma.renewal.findMany({
      where: {
        status: 'PENDING',
        renewalDate: { lt: today },
        paymentStatus: { not: 'OVERDUE' },
      },
    });

    for (const item of overdueRenewals) {
      await this.prisma.renewal.update({
        where: { id: item.id },
        data: { paymentStatus: 'OVERDUE' },
      });

      await this.notifications.create({
        title: 'Overdue Renewal alert',
        message: `The renewal for ${item.itemName} (${item.renewalType}) was due on ${item.renewalDate.toLocaleDateString()} and is now OVERDUE.`,
        type: 'ERROR',
      });
    }
  }

  /**
   * 2. Configure Reminder rules & alerts (e.g. 30, 15, 7, 3, 1 days warning)
   */
  async runReminderSweeps() {
    const today = new Date();
    const activeRenewals = await this.prisma.renewal.findMany({
      where: { status: 'PENDING' },
      include: { reminders: true },
    });

    const triggerIntervals = [30, 15, 7, 3, 1];

    for (const item of activeRenewals) {
      const diffMs = new Date(item.renewalDate).getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) continue;

      // Find if we hit any reminder threshold
      const matchedDays = triggerIntervals.find(days => diffDays <= days);
      if (matchedDays) {
        // Verify if a reminder log for this interval already exists to make it idempotent
        const alreadySent = item.reminders.some(r => r.daysBefore === matchedDays);
        if (!alreadySent) {
          // Log a ReminderLog row
          await this.prisma.reminderLog.create({
            data: {
              renewalId: item.id,
              daysBefore: matchedDays,
              status: 'SENT',
              details: `Auto reminder triggered ${diffDays} days before expiry date.`,
            },
          });

          // Create in-app notification
          await this.notifications.create({
            title: `Renewal Warning (${matchedDays} days)`,
            message: `Renewal for "${item.itemName}" is expiring in ${diffDays} days. Pre-compiled alert email added to SMTP queue.`,
            type: 'WARNING',
          });

          // Create scheduled SMTP email job
          await this.emails.createJob({
            recipient: 'client-billing@workspace.com',
            subject: `Action Required: Renewal Notice for ${item.itemName}`,
            message: `Hi Team,\n\nThis is an automated warning that your renewal for "${item.itemName}" (${item.renewalType}) is due on ${new Date(item.renewalDate).toLocaleDateString()}.\n\nTotal due: $${Number(item.amount).toFixed(2)}\n\nPlease process invoice parameters accordingly.`,
          });
        }
      }
    }
  }

  /**
   * 3. Recurring Billing documents generator
   */
  async runRecurringBillingSweeps() {
    const today = new Date();
    const activeConfigs = await this.prisma.recurringConfig.findMany({
      where: {
        isActive: true,
        nextRunDate: { lte: today },
      },
      include: {
        document: {
          include: { blocks: true },
        },
      },
    });

    for (const config of activeConfigs) {
      // Calculate next trigger date based on frequency
      const nextDate = new Date(config.nextRunDate);
      if (config.frequency === 'MONTHLY') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (config.frequency === 'QUARTERLY') {
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else if (config.frequency === 'ANNUALLY') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }

      await this.prisma.$transaction(async (tx) => {
        // Spawn a clone document draft sequence
        const newDoc = await tx.document.create({
          data: {
            title: `${config.document.title} (Recurring #${Date.now().toString().slice(-4)})`,
            type: config.document.type,
            status: 'DRAFT',
            companyId: config.document.companyId,
            customerId: config.document.customerId,
            authorId: config.document.authorId,
          },
        });

        // Clone all document block clauses
        if (config.document.blocks && config.document.blocks.length > 0) {
          await tx.documentBlock.createMany({
            data: config.document.blocks.map(b => ({
              documentId: newDoc.id,
              sortOrder: b.sortOrder,
              blockType: b.blockType,
              content: b.content,
            })),
          });
        }

        // Update recurring config scheduler next date parameters
        await tx.recurringConfig.update({
          where: { id: config.id },
          data: { nextRunDate: nextDate },
        });
      });

      // Notify users of recurring spawn success
      await this.notifications.create({
        title: 'Recurring document generated',
        message: `A new draft for ${config.document.title} has been generated automatically.`,
        type: 'SUCCESS',
      });
    }
  }
}
