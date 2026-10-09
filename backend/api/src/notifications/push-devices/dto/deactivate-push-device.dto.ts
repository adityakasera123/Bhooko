
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeactivatePushDeviceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  pushToken!: string;
}
