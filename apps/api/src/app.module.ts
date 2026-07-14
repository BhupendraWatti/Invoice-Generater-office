import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { RenewalsModule } from './modules/renewals/renewals.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ProductsModule } from './modules/products/products.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EmailQueueModule } from './modules/email-queue/email-queue.module';
import { AutomationModule } from './modules/automation/automation.module';
import { CustomizationModule } from './modules/customization/customization.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { RolesGuard } from './modules/auth/roles.guard';
import { TemplateEngineModule } from './modules/template-engine/template-engine.module';

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
    TemplatesModule,
    SettingsModule,
    ProductsModule,
    MasterDataModule,
    NotificationsModule,
    EmailQueueModule,
    AutomationModule,
    CustomizationModule,
    AuditModule,
    HealthModule,
    TemplateEngineModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
