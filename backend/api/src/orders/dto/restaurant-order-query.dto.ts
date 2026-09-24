import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export enum RestaurantOrderView {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export class RestaurantOrderQueryDto {
  @IsOptional()
  @IsEnum(RestaurantOrderView)
  view?: RestaurantOrderView;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}