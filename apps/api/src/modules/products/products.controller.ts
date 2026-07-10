import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ==========================================
  // PRODUCTS CRUD ENDPOINTS
  // ==========================================

  @Get('products')
  async findAllProducts() {
    return this.productsService.findAllProducts();
  }

  @Get('products/:id')
  async findOneProduct(@Param('id') id: string) {
    return this.productsService.findOneProduct(id);
  }

  @Post('products')
  async createProduct(@Body() body: any) {
    return this.productsService.createProduct(body);
  }

  @Put('products/:id')
  async updateProduct(@Param('id') id: string, @Body() body: any) {
    return this.productsService.updateProduct(id, body);
  }

  @Delete('products/:id')
  async removeProduct(@Param('id') id: string) {
    return this.productsService.removeProduct(id);
  }

  // ==========================================
  // UNITS OF MEASUREMENT CRUD ENDPOINTS
  // ==========================================

  @Get('units')
  async findAllUnits() {
    return this.productsService.findAllUnits();
  }

  @Post('units')
  async createUnit(@Body() body: any) {
    return this.productsService.createUnit(body);
  }

  @Delete('units/:id')
  async removeUnit(@Param('id') id: string) {
    return this.productsService.removeUnit(id);
  }

  // ==========================================
  // TAX CONFIGURATION CRUD ENDPOINTS
  // ==========================================

  @Get('taxes')
  async findAllTaxes() {
    return this.productsService.findAllTaxes();
  }

  @Post('taxes')
  async createTax(@Body() body: any) {
    return this.productsService.createTax(body);
  }

  @Put('taxes/:id')
  async updateTax(@Param('id') id: string, @Body() body: any) {
    return this.productsService.updateTax(id, body);
  }

  @Delete('taxes/:id')
  async removeTax(@Param('id') id: string) {
    return this.productsService.removeTax(id);
  }
}
