import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
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
  }

  async updateMe(userId: string, data: UpdateMeDto) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(data.name !== undefined && {
          name: data.name,
        }),
        ...(data.phone !== undefined && {
          phone: data.phone,
        }),
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
  }
}