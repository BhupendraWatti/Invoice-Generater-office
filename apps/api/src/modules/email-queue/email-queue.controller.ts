import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { EmailQueueService } from './email-queue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('emails')
@UseGuards(JwtAuthGuard)
export class EmailQueueController {
  constructor(private readonly emailQueueService: EmailQueueService) {}

  @Get('jobs')
  async findAll() {
    return this.emailQueueService.findAll();
  }

  @Post('jobs/process')
  async processQueue() {
    await this.emailQueueService.processQueue();
    return { success: true, message: 'Queue sweep triggered.' };
  }

  @Post('jobs/:id/retry')
  async retryJob(@Param('id') id: string) {
    return this.emailQueueService.retryJob(id);
  }
}
