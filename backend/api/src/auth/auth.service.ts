import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
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

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.passwordService.verify(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const tokenHash = this.tokenService.hashRefreshToken(
      refreshTokenDto.refreshToken,
    );

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: storedToken.userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const newRefreshToken = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: {
          id: storedToken.id,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      const refreshToken = this.tokenService.generateRefreshToken();
      const newTokenHash = this.tokenService.hashRefreshToken(refreshToken);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          expiresAt,
        },
      });

      return refreshToken;
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(logoutDto: LogoutDto) {
    const tokenHash = this.tokenService.hashRefreshToken(
      logoutDto.refreshToken,
    );

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      throw new UnauthorizedException('Refresh token has already been revoked');
    }

    await this.prisma.refreshToken.update({
      where: {
        id: storedToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: 'Logged out successfully',
    };
  }

  private async createRefreshToken(userId: string) {
    const refreshToken = this.tokenService.generateRefreshToken();
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return refreshToken;
  }
}