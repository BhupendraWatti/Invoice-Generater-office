import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with clean configuration...');
  
  // Clean up existing records in dependency order
  await prisma.reminderLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.renewal.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.documentBlock.deleteMany();
  await prisma.document.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.taxConfiguration.deleteMany();
  await prisma.paymentTerm.deleteMany();
  await prisma.currency.deleteMany();

  // 1. Create Default Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin',
      passwordHash: '$2b$10$5i1j1pgm35uDabhUy7bEqOIrUurgb7/JGwCNcy9bPyhLetKPowTVW', // password: admin
      firstName: 'Alex',
      lastName: 'Carter',
      role: UserRole.ADMIN,
      mfaEnabled: false,
    }
  });
  console.log('Admin user initialized successfully.');

  // 2. Seed Standard Billing Units (UOM)
  await prisma.unit.createMany({
    data: [
      { code: 'HRS', name: 'Hourly Rates' },
      { code: 'DAYS', name: 'Daily Services' },
      { code: 'MOS', name: 'Monthly Retainer' },
      { code: 'PROJ', name: 'Fixed Project Scope' },
      { code: 'PCS', name: 'Software Licenses' },
    ]
  });
  console.log('Billing units initialized.');

  // 3. Seed Standard Tax Policies
  await prisma.taxConfiguration.createMany({
    data: [
      { code: 'EXEMPT', name: 'Zero/Exempt Tax Rate', ratePercent: 0, isDefault: true },
      { code: 'VAT', name: 'Value Added Tax (UK/EU)', ratePercent: 20, isDefault: false },
      { code: 'GST', name: 'Goods & Services Tax (India)', ratePercent: 18, isDefault: false },
      { code: 'US-TAX', name: 'State Services Tax', ratePercent: 8.25, isDefault: false },
    ]
  });
  console.log('Tax configurations initialized.');

  // 4. Seed Standard Currencies
  await prisma.currency.createMany({
    data: [
      { code: 'USD', name: 'US Dollar', symbol: '$', isDefault: true },
      { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false },
      { code: 'GBP', name: 'British Pound', symbol: '£', isDefault: false },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', isDefault: false },
    ]
  });
  console.log('Currencies initialized.');

  // 5. Seed Standard Payment Terms
  await prisma.paymentTerm.createMany({
    data: [
      { name: 'Due on Receipt', daysDue: 0, isDefault: true },
      { name: 'Net 15 Days', daysDue: 15, isDefault: false },
      { name: 'Net 30 Days', daysDue: 30, isDefault: false },
      { name: 'Net 60 Days', daysDue: 60, isDefault: false },
    ]
  });
  console.log('Payment terms initialized.');

  console.log('Database configuration seed complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
