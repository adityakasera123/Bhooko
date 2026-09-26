import { IsEnum } from 'class-validator';
import { RiderAvailability } from '@prisma/client';

export class UpdateRiderAvailabilityDto {
  @IsEnum(RiderAvailability)
  availability!: RiderAvailability;
}