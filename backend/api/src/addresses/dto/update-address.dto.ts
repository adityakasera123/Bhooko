import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  line1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  area?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(10)
  pincode?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryInstructions?: string;
}