import { IsUUID } from 'class-validator';

export class CheckServiceabilityDto {
  @IsUUID()
  addressId!: string;

  @IsUUID()
  restaurantId!: string;
}