import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingEmail = await this.prisma.user.findUnique({
      where: {
        email: registerDto.email,
      },
    });

    if (existingEmail) {
      throw new ConflictException('Email is already registered');
    }

    const existingPhone = await this.prisma.user.findUnique({
      where: {
        phone: registerDto.phone,
      },
    });

    if (existingPhone) {
      throw new ConflictException('Phone is already registered');
    }

    const passwordHash = await this.passwordService.hash(registerDto.password);

    const user = await this.prisma.user.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
        phone: registerDto.phone,
        passwordHash,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }
}