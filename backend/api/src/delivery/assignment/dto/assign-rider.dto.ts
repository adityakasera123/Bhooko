import { IsUUID } from 'class-validator';

export class AssignRiderDto {
  @IsUUID()
  deliveryId: string;

  @IsUUID()
  riderId: string;
}