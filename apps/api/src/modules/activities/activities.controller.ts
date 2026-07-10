import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityType } from '@prisma/client';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  async findAll(@Query('limit') limit?: number) {
    return this.activitiesService.findAll(limit);
  }

  @Post()
  async create(
    @Req() req: any,
    @Body() body: { actionType: ActivityType; documentId?: string; details: string },
  ) {
    return this.activitiesService.create({
      userId: req.user.id,
      actionType: body.actionType,
      documentId: body.documentId,
      details: body.details,
    });
  }
}
