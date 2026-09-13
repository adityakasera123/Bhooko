import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, {
    message: 'phone must be a valid phone number',
  })
  phone: string;

  @IsString()
  @Length(8, 128)
  password: string;
}
