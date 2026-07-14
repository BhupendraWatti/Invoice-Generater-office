import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCompanyDto } from '@docflow/shared-types';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateCompanyDto) {
    try {
      return await this.companiesService.create(body);
    } catch (err: any) {
      console.error('Failed to create company:', err);
      throw new HttpException(
        { message: err?.message || 'Failed to create company', detail: err?.stack || '' },
        500
      );
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<CreateCompanyDto>) {
    try {
      return await this.companiesService.update(id, body);
    } catch (err: any) {
      console.error(`Failed to update company ${id}:`, err);
      throw new HttpException(
        { message: err?.message || 'Failed to update company', detail: err?.stack || '' },
        500
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}
