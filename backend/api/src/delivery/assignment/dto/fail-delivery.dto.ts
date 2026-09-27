import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FailDeliveryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
