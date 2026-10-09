
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PushPlatform } from '@prisma/client';

export class RegisterPushDeviceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  pushToken!: string;

  @IsEnum(PushPlatform)
  platform!: PushPlatform;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}
