import { Module } from '@nestjs/common';
import { TemplateEngineController } from './template-engine.controller';
import { TemplateEngineService } from './template-engine.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TemplateEngineController],
  providers: [TemplateEngineService],
  exports: [TemplateEngineService],
})
export class TemplateEngineModule {}
