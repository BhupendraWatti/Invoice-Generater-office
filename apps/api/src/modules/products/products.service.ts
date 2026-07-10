import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // PRODUCTS LIBRARY CRUD
  // ==========================================

  async findAllProducts() {
    return this.prisma.product.findMany({
      include: {
        unit: true,
        tax: true,
      },
      orderBy: { sku: 'asc' },
    });
  }

  async findOneProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        unit: true,
        tax: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }

  async createProduct(data: any) {
    return this.prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        rate: data.rate,
        unitId: data.unitId || null,
        taxId: data.taxId || null,
      },
      include: {
        unit: true,
        tax: true,
      },
    });
  }

  async updateProduct(id: string, data: any) {
    await this.findOneProduct(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        rate: data.rate,
        unitId: data.unitId !== undefined ? data.unitId : undefined,
        taxId: data.taxId !== undefined ? data.taxId : undefined,
      },
      include: {
        unit: true,
        tax: true,
      },
    });
  }

  async removeProduct(id: string) {
    await this.findOneProduct(id);
    return this.prisma.product.delete({
      where: { id },
    });
  }

  // ==========================================
  // UNITS OF MEASUREMENT (UOM) CRUD
  // ==========================================

  async findAllUnits() {
    return this.prisma.unit.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async createUnit(data: any) {
    return this.prisma.unit.create({
      data: {
        code: data.code,
        name: data.name,
      },
    });
  }

  async removeUnit(id: string) {
    return this.prisma.unit.delete({
      where: { id },
    });
  }

  // ==========================================
  // TAX CONFIGURATION CRUD
  // ==========================================

  async findAllTaxes() {
    return this.prisma.taxConfiguration.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async createTax(data: any) {
    if (data.isDefault) {
      // Reset other defaults
      await this.prisma.taxConfiguration.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.taxConfiguration.create({
      data: {
        name: data.name,
        ratePercent: data.ratePercent,
        code: data.code,
        isDefault: !!data.isDefault,
      },
    });
  }

  async updateTax(id: string, data: any) {
    if (data.isDefault) {
      await this.prisma.taxConfiguration.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.taxConfiguration.update({
      where: { id },
      data: {
        name: data.name,
        ratePercent: data.ratePercent,
        code: data.code,
        isDefault: data.isDefault !== undefined ? !!data.isDefault : undefined,
      },
    });
  }

  async removeTax(id: string) {
    return this.prisma.taxConfiguration.delete({
      where: { id },
    });
  }
}
