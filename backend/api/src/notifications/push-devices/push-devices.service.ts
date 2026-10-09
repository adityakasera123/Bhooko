
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { RegisterPushDeviceDto } from './dto/register-push-device.dto';

@Injectable()
export class PushDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: RegisterPushDeviceDto) {
    return this.prisma.pushDevice.upsert({
      where: {
        pushToken: dto.pushToken,
      },
      create: {
        userId,
        pushToken: dto.pushToken,
        platform: dto.platform,
        deviceName: dto.deviceName,
        isActive: true,
        lastRegisteredAt: new Date(),
      },
      update: {
        userId,
        platform: dto.platform,
        deviceName: dto.deviceName,
        isActive: true,
        lastRegisteredAt: new Date(),
      },
      select: {
        id: true,
        platform: true,
        deviceName: true,
        isActive: true,
        createdAt: true,
        lastRegisteredAt: true,
      },
    });
  }

  async deactivate(userId: string, pushToken: string) {
    const device = await this.prisma.pushDevice.findFirst({
      where: {
        userId,
        pushToken,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!device) {
      throw new NotFoundException('Active push device not found');
    }

    return this.prisma.pushDevice.update({
      where: {
        id: device.id,
      },
      data: {
        isActive: false,
      },
      select: {
        id: true,
        isActive: true,
      },
    });
  }
}
