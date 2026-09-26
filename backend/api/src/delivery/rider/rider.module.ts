import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RiderController } from './rider.controller';
import { RiderService } from './rider.service';

@Module({
  imports: [PrismaModule],
  controllers: [RiderController],
  providers: [RiderService],
  exports: [RiderService],
})
export class RiderModule {}