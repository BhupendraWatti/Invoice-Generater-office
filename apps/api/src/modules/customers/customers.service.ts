import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from '@docflow/shared-types';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.customer.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        addresses: true,
        contacts: true,
        bankAccounts: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        company: true,
        addresses: true,
        contacts: true,
        bankAccounts: true,
        notes: true,
        attachments: true,
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const { addresses, contacts, bankAccounts, ...customerData } = dto as any;

    return this.prisma.customer.create({
      data: {
        ...customerData,
        addresses: addresses && addresses.length > 0 ? { create: addresses } : undefined,
        contacts: contacts && contacts.length > 0 ? { create: contacts } : undefined,
        bankAccounts: bankAccounts && bankAccounts.length > 0 ? { create: bankAccounts } : undefined,
      },
      include: {
        addresses: true,
        contacts: true,
        bankAccounts: true,
      },
    });
  }

  async update(id: string, dto: Partial<CreateCustomerDto>) {
    await this.findOne(id); // Ensure customer exists
    const { addresses, contacts, bankAccounts, ...customerData } = dto as any;

    // Delete existing relations and insert new ones atomically
    return this.prisma.$transaction(async (tx) => {
      if (addresses !== undefined) {
        await tx.address.deleteMany({ where: { customerId: id } });
      }
      if (contacts !== undefined) {
        await tx.contact.deleteMany({ where: { customerId: id } });
      }
      if (bankAccounts !== undefined) {
        await tx.bankAccount.deleteMany({ where: { customerId: id } });
      }

      return tx.customer.update({
        where: { id },
        data: {
          ...customerData,
          addresses: addresses && addresses.length > 0 ? { create: addresses } : undefined,
          contacts: contacts && contacts.length > 0 ? { create: contacts } : undefined,
          bankAccounts: bankAccounts && bankAccounts.length > 0 ? { create: bankAccounts } : undefined,
        },
        include: {
          addresses: true,
          contacts: true,
          bankAccounts: true,
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure exists
    return this.prisma.customer.delete({
      where: { id },
    });
  }
}
