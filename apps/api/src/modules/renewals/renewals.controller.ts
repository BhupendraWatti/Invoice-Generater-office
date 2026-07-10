import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RenewalsService } from './renewals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('renewals')
@UseGuards(JwtAuthGuard)
export class RenewalsController {
  constructor(private readonly renewalsService: RenewalsService) {}

  @Get()
  async findAll() {
    return this.renewalsService.findAll();
  }

  @Post()
  async create(@Body() body: any) {
    return this.renewalsService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.renewalsService.update(id, body);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.renewalsService.updateStatus(id, body.status);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.renewalsService.delete(id);
  }

  @Post('bulk')
  async bulkUpdate(@Body() body: { updates: Array<{ id: string; data: any }> }) {
    return this.renewalsService.bulkUpdate(body.updates);
  }
}
