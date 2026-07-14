import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RenewalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.renewal.findMany({
      orderBy: { renewalDate: 'asc' },
      include: {
        document: true,
      },
    });
  }

  async findOne(id: string) {
    const renewal = await this.prisma.renewal.findUnique({
      where: { id },
      include: { document: true }
    });
    if (!renewal) {
      throw new NotFoundException(`Renewal with ID "${id}" not found`);
    }
    return renewal;
  }

  async create(data: any) {
    return this.prisma.renewal.create({
      data: {
        itemName: data.itemName,
        renewalType: data.renewalType,
        renewalDate: new Date(data.renewalDate),
        amount: data.amount,
        status: data.status || 'PENDING',
        vendor: data.vendor || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        gracePeriodDays: Number(data.gracePeriodDays) || 0,
        paymentStatus: data.paymentStatus || 'UNPAID',
        assignedEmployee: data.assignedEmployee || null,
        notes: data.notes || null,
        emailId: data.emailId || null,
        password: data.password || null,
        documentId: data.documentId || null,
      },
      include: { document: true }
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id); // Ensure existence
    return this.prisma.renewal.update({
      where: { id },
      data: {
        itemName: data.itemName,
        renewalType: data.renewalType,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : undefined,
        amount: data.amount !== undefined ? Number(data.amount) : undefined,
        status: data.status,
        vendor: data.vendor,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        gracePeriodDays: data.gracePeriodDays !== undefined ? Number(data.gracePeriodDays) : undefined,
        paymentStatus: data.paymentStatus,
        assignedEmployee: data.assignedEmployee,
        notes: data.notes,
        emailId: data.emailId,
        password: data.password,
        documentId: data.documentId || undefined,
      },
      include: { document: true }
    });
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.renewal.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.renewal.delete({
      where: { id },
    });
  }

  async bulkUpdate(updates: Array<{ id: string; data: any }>) {
    return this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.renewal.update({
          where: { id: u.id },
          data: {
            itemName: u.data.itemName,
            renewalType: u.data.renewalType,
            renewalDate: u.data.renewalDate ? new Date(u.data.renewalDate) : undefined,
            amount: u.data.amount !== undefined ? Number(u.data.amount) : undefined,
            status: u.data.status,
            vendor: u.data.vendor,
            paymentStatus: u.data.paymentStatus,
            assignedEmployee: u.data.assignedEmployee,
            notes: u.data.notes,
            emailId: u.data.emailId,
            password: u.data.password,
          },
        })
      )
    );
  }
}
