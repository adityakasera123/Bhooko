import {
  IsEnum,
  IsInt,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FoodType } from '@prisma/client';

export class CreateFoodItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description!: string;

  @IsUrl()
  @MaxLength(500)
  imageUrl!: string;

  @IsInt()
  @Min(1)
  priceInPaise!: number;

  @IsString()
  categoryId!: string;

  @IsEnum(FoodType)
  foodType!: FoodType;
}