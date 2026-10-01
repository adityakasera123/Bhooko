import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

import { ServiceabilityController } from './serviceability.controller';
import { ServiceabilityService } from './serviceability.service';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
  ],
  controllers: [ServiceabilityController],
  providers: [ServiceabilityService],
  exports: [ServiceabilityService],
})
export class ServiceabilityModule {}