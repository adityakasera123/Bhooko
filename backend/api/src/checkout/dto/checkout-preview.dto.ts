import { IsUUID } from 'class-validator';

export class CheckoutPreviewDto {
  @IsUUID('4')
  addressId!: string;
}
