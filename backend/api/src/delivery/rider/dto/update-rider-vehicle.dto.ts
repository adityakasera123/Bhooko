import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateRiderVehicleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  vehicleType?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  vehicleNumber?: string;
}