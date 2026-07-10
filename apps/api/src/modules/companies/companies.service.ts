import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto } from '@docflow/shared-types';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.company.findMany({
      include: {
        addresses: true,
        contacts: true,
        bankAccounts: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        addresses: true,
        contacts: true,
        bankAccounts: true,
        notes: true,
        attachments: true,
        _count: {
          select: { documents: true, customers: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID "${id}" not found`);
    }

    return company;
  }

  async create(dto: CreateCompanyDto) {
    const { addresses, contacts, bankAccounts, ...companyData } = dto as any;

    return this.prisma.company.create({
      data: {
        ...companyData,
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

  async update(id: string, dto: Partial<CreateCompanyDto>) {
    await this.findOne(id); // Ensure company exists
    const { addresses, contacts, bankAccounts, ...companyData } = dto as any;

    // Delete existing relations and insert new ones atomically
    return this.prisma.$transaction(async (tx) => {
      if (addresses !== undefined) {
        await tx.address.deleteMany({ where: { companyId: id } });
      }
      if (contacts !== undefined) {
        await tx.contact.deleteMany({ where: { companyId: id } });
      }
      if (bankAccounts !== undefined) {
        await tx.bankAccount.deleteMany({ where: { companyId: id } });
      }

      return tx.company.update({
        where: { id },
        data: {
          ...companyData,
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
    return this.prisma.company.delete({
      where: { id },
    });
  }
}
