import {
  IsDateString,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateDeliveryLocationDto {
  @IsNumber({
    allowNaN: false,
    allowInfinity: false,
  })
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber({
    allowNaN: false,
    allowInfinity: false,
  })
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsNumber({
    allowNaN: false,
    allowInfinity: false,
  })
  @Min(0)
  @Max(10000)
  accuracyMeters?: number;

  @IsDateString({ strict: true })
  recordedAt!: string;
}
