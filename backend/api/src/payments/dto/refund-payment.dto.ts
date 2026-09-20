import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RefundPaymentDto {
  @IsInt()
  @Min(1)
  amountInPaise!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
