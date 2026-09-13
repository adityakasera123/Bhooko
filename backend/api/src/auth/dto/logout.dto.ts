import { IsString, Length } from 'class-validator';

export class LogoutDto {
  @IsString()
  @Length(64, 128)
  refreshToken: string;
}
