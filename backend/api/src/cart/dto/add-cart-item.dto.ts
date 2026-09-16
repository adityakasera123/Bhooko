import { IsInt, IsString, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @IsString()
  foodItemId!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;
}
