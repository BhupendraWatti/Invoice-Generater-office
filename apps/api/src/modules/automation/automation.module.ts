import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailQueueModule } from '../email-queue/email-queue.module';

@Module({
  imports: [NotificationsModule, EmailQueueModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class AutomationModule {}
