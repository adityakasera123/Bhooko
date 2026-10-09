import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PushPlatform } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { PushDevicesService } from './push-devices.service';

describe('PushDevicesService', () => {
  let service: PushDevicesService;

  
  const prisma = {
    pushDevice: {
      upsert: jest.fn<() => Promise<{
        id: string;
        platform: PushPlatform;
        deviceName: string | null;
        isActive: boolean;
        createdAt: Date;
        lastRegisteredAt: Date;
      }>>(),
      findFirst: jest.fn<() => Promise<{ id: string } | null>>(),
      update: jest.fn<() => Promise<{ id: string; isActive: boolean }>>(),
    },
  };


  beforeEach(() => {
    jest.clearAllMocks();

    service = new PushDevicesService(
      prisma as unknown as PrismaService,
    );
  });

  describe('register', () => {
    const userId = 'user-123';

    const dto = {
      pushToken: 'ExponentPushToken[test-token]',
      platform: PushPlatform.ANDROID,
      deviceName: 'Test Android',
    };

    it('should register a push device', async () => {
      const expected = {
        id: 'device-123',
        platform: PushPlatform.ANDROID,
        deviceName: 'Test Android',
        isActive: true,
        createdAt: new Date(),
        lastRegisteredAt: new Date(),
      };

      prisma.pushDevice.upsert.mockResolvedValue(expected);

      const result = await service.register(userId, dto);

      expect(prisma.pushDevice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pushToken: dto.pushToken },
          create: expect.objectContaining({
            userId,
            pushToken: dto.pushToken,
            platform: dto.platform,
            isActive: true,
          }),
          update: expect.objectContaining({
            userId,
            platform: dto.platform,
            isActive: true,
          }),
        }),
      );

      expect(result).toEqual(expected);
    });

    it('should reactivate and reassign an existing token', async () => {
      prisma.pushDevice.upsert.mockResolvedValue({
        id: 'device-123',
        platform: PushPlatform.IOS,
        deviceName: 'iPhone',
        isActive: true,
        createdAt: new Date(),
        lastRegisteredAt: new Date(),
      });

      await service.register('another-user', {
        ...dto,
        platform: PushPlatform.IOS,
        deviceName: 'iPhone',
      });

      expect(prisma.pushDevice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pushToken: dto.pushToken },
          update: expect.objectContaining({
            userId: 'another-user',
            platform: PushPlatform.IOS,
            deviceName: 'iPhone',
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate the authenticated user device', async () => {
      prisma.pushDevice.findFirst.mockResolvedValue({
        id: 'device-123',
      });

      prisma.pushDevice.update.mockResolvedValue({
        id: 'device-123',
        isActive: false,
      });

      const result = await service.deactivate(
        'user-123',
        'ExponentPushToken[test-token]',
      );

      expect(prisma.pushDevice.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          pushToken: 'ExponentPushToken[test-token]',
          isActive: true,
        },
        select: { id: true },
      });

      expect(prisma.pushDevice.update).toHaveBeenCalledWith({
        where: { id: 'device-123' },
        data: { isActive: false },
        select: { id: true, isActive: true },
      });

      expect(result).toEqual({
        id: 'device-123',
        isActive: false,
      });
    });

    it('should throw when the device is not owned by the user or inactive', async () => {
      prisma.pushDevice.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivate(
          'user-123',
          'ExponentPushToken[other-device]',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.pushDevice.update).not.toHaveBeenCalled();
    });
  });
});
