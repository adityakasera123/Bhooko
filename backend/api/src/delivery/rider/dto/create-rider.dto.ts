import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRiderDto {
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