import { IsBoolean } from 'class-validator';

export class UpdateFoodItemAvailabilityDto {
  @IsBoolean()
  isAvailable!: boolean;
}