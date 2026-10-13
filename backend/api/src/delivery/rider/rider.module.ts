import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RiderController } from './rider.controller';
import { RiderService } from './rider.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RiderController],
  providers: [RiderService],
  exports: [RiderService],
})
export class RiderModule {}