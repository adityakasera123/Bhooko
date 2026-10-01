import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { ServiceabilityService } from './serviceability.service';

@Module({
  imports: [PrismaModule],
  providers: [ServiceabilityService],
  exports: [ServiceabilityService],
})
export class ServiceabilityModule {}