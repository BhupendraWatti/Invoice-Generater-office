import { PrismaClient, UserRole, DocumentType, DocumentStatus, ActivityType, RenewalType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  // Clean up
  await prisma.comment.deleteMany();
  await prisma.renewal.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.documentBlock.deleteMany();
  await prisma.document.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const userAlex = await prisma.user.create({
    data: {
      email: 'alex@docflow.studio',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', // mock hash
      firstName: 'Alex',
      lastName: 'Carter',
      role: UserRole.ADMIN,
      mfaEnabled: false,
    }
  });

  const userSarah = await prisma.user.create({
    data: {
      email: 'sarah.j@docflow.studio',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      role: UserRole.MANAGER,
    }
  });

  const userMike = await prisma.user.create({
    data: {
      email: 'mike.t@docflow.studio',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      firstName: 'Mike',
      lastName: 'Taylor',
      role: UserRole.USER,
    }
  });

  // Create Companies
  const companyAcme = await prisma.company.create({
    data: {
      name: 'Acme Properties LLC',
      registrationNumber: 'REG-1234567',
      taxId: 'TX-9876543',
      addressLine1: '123 Enterprise Way',
      addressLine2: 'Suite 400',
      city: 'Austin',
      postalCode: '78701',
      country: 'USA',
      bankName: 'Silicon Valley Bank',
      bankIban: 'US12345678901234567890',
      bankBic: 'SVB123',
    }
  });

  // Create Customers
  const customerGlobex = await prisma.customer.create({
    data: {
      companyId: companyAcme.id,
      name: 'Globex Inc.',
      email: 'billing@globex.com',
      phone: '+1 555-0199',
      addressLine1: '456 Globex Road',
      city: 'San Francisco',
      postalCode: '94103',
      country: 'USA',
    }
  });

  // Create Documents
  const docPdf = await prisma.document.create({
    data: {
      title: 'Q3_Financial_Report_Final.pdf',
      type: DocumentType.PDF,
      status: DocumentStatus.REVIEW,
      companyId: companyAcme.id,
      customerId: customerGlobex.id,
      authorId: userSarah.id,
    }
  });

  const docDocx = await prisma.document.create({
    data: {
      title: 'Acme_Corp_MSA_Draft_v2.docx',
      type: DocumentType.DOCX,
      status: DocumentStatus.DRAFT,
      companyId: companyAcme.id,
      customerId: customerGlobex.id,
      authorId: userMike.id,
    }
  });

  const docZip = await prisma.document.create({
    data: {
      title: 'Marketing_Campaign_Assets.zip',
      type: DocumentType.ZIP,
      status: DocumentStatus.COMPLETED,
      companyId: companyAcme.id,
      customerId: customerGlobex.id,
      authorId: userAlex.id,
    }
  });

  // Create Activities
  await prisma.activity.createMany({
    data: [
      {
        userId: userSarah.id,
        actionType: ActivityType.EDIT,
        documentId: docPdf.id,
        details: 'Sarah J. edited Q3_Financial_Report_Final.pdf',
      },
      {
        userId: userMike.id,
        actionType: ActivityType.COMMENT,
        documentId: docDocx.id,
        details: 'Mike T. commented on Acme_Corp_MSA_Draft_v2.docx',
      },
      {
        userId: userAlex.id,
        actionType: ActivityType.APPROVE,
        documentId: docZip.id,
        details: 'System approved Marketing_Campaign_Assets.zip',
      }
    ]
  });

  // Create Comments
  await prisma.comment.create({
    data: {
      documentId: docDocx.id,
      userId: userMike.id,
      text: 'Please review row 45...',
    }
  });

  // Create Renewals
  await prisma.renewal.createMany({
    data: [
      {
        itemName: 'Software Lic. X',
        renewalType: RenewalType.SOFTWARE,
        renewalDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // in 3 days
        amount: 1200.00,
        status: 'PENDING',
      },
      {
        itemName: 'Office Lease',
        renewalType: RenewalType.LEASE,
        renewalDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // in 14 days
        amount: 8500.00,
        status: 'PENDING',
      },
      {
        itemName: 'Insurance Policy',
        renewalType: RenewalType.INSURANCE,
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // in 30 days
        amount: 450.00,
        status: 'PENDING',
      }
    ]
  });

  console.log('Database seeded successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
