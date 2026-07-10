import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCustomerDto } from '@docflow/shared-types';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@Query('companyId') companyId?: string) {
    return this.customersService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateCustomerDto) {
    return this.customersService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<CreateCustomerDto>) {
    return this.customersService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
