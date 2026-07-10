import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { RenewalsModule } from './modules/renewals/renewals.module';
import { ActivitiesModule } from './modules/activities/activities.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    CustomersModule,
    DocumentsModule,
    RenewalsModule,
    ActivitiesModule,
  ],
})
export class AppModule {}
