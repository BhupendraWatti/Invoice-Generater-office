import { Module } from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { MasterDataController } from './master-data.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MasterDataService],
  controllers: [MasterDataController],
  exports: [MasterDataService],
})
export class MasterDataModule {}
