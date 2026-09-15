import { IsEnum } from 'class-validator';
import { RestaurantStatus } from '@prisma/client';

export class UpdateRestaurantStatusDto {
  @IsEnum(RestaurantStatus)
  status!: RestaurantStatus;
}