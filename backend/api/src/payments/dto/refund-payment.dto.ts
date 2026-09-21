import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RefundPaymentDto {
  @IsInt()
  @Min(1)
  amountInPaise!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idempotencyKey!: string;
}