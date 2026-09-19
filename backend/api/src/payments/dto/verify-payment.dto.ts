import {
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class VerifyPaymentDto {
  @IsUUID('4')
  paymentTransactionId!: string;

  @IsString()
  razorpayOrderId!: string;

  @IsString()
  razorpayPaymentId!: string;

  @IsString()
  @Length(64, 64)
  razorpaySignature!: string;
}