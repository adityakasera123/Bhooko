import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  label!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  area!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(10)
  pincode!: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contactName!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(15)
  contactPhone!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryInstructions?: string;
}