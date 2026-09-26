import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  RiderAvailability,
  RiderStatus,
  UserRole,
} from '@prisma/client';
import { RiderService } from './rider.service';

describe('RiderService', () => {
  let service: RiderService;

const prismaMock = {
  user: {
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  rider: {
    create: jest.fn<(...args: any[]) => Promise<any>>(),
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    update: jest.fn<(...args: any[]) => Promise<any>>(),
  },
};

  beforeEach(() => {
    jest.clearAllMocks();

    service = new RiderService(prismaMock as any);
  });

  describe('createRider', () => {
    it('should create a rider for a valid delivery partner user', async () => {
      const userId = 'user-1';

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        name: 'Test Rider',
        email: 'rider@example.com',
        phone: '9999999999',
        role: UserRole.DELIVERY_PARTNER,
        rider: null,
      });

      prismaMock.rider.create.mockResolvedValue({
        id: 'rider-1',
        userId,
        status: RiderStatus.REGISTERED,
        availability: RiderAvailability.OFFLINE,
        vehicleType: 'BIKE',
        vehicleNumber: 'UP65AB1234',
      });

      const result = await service.createRider(
        userId,
        'BIKE',
        'UP65AB1234',
      );

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          rider: true,
        },
      });

      expect(prismaMock.rider.create).toHaveBeenCalledWith({
        data: {
          userId,
          status: RiderStatus.REGISTERED,
          availability: RiderAvailability.OFFLINE,
          vehicleType: 'BIKE',
          vehicleNumber: 'UP65AB1234',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
      });

      expect(result).toBeDefined();
    });

    it('should throw when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createRider('missing-user'),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.rider.create).not.toHaveBeenCalled();
    });

    it('should reject users without DELIVERY_PARTNER role', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: UserRole.CUSTOMER,
        rider: null,
      });

      await expect(
        service.createRider('user-1'),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.rider.create).not.toHaveBeenCalled();
    });

    it('should reject duplicate rider profiles', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: UserRole.DELIVERY_PARTNER,
        rider: {
          id: 'rider-existing',
        },
      });

      await expect(
        service.createRider('user-1'),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.rider.create).not.toHaveBeenCalled();
    });
  });

  describe('getRiderByUserId', () => {
    it('should return rider profile for a user', async () => {
      const rider = {
        id: 'rider-1',
        userId: 'user-1',
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.ONLINE,
      };

      prismaMock.rider.findUnique.mockResolvedValue(rider);

      const result = await service.getRiderByUserId('user-1');

      expect(prismaMock.rider.findUnique).toHaveBeenCalled();
      expect(result).toEqual(rider);
    });

    it('should throw when rider profile does not exist', async () => {
      prismaMock.rider.findUnique.mockResolvedValue(null);

      await expect(
        service.getRiderByUserId('user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRiderById', () => {
    it('should return rider by id', async () => {
      const rider = {
        id: 'rider-1',
        userId: 'user-1',
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.ONLINE,
      };

      prismaMock.rider.findUnique.mockResolvedValue(rider);

      const result = await service.getRiderById('rider-1');

      expect(prismaMock.rider.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'rider-1',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
      });

      expect(result).toEqual(rider);
    });

    it('should throw when rider does not exist', async () => {
      prismaMock.rider.findUnique.mockResolvedValue(null);

      await expect(
        service.getRiderById('missing-rider'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateRider', () => {
    it('should activate an inactive rider', async () => {
      const rider = {
        id: 'rider-1',
        userId: 'user-1',
        status: RiderStatus.INACTIVE,
        availability: RiderAvailability.OFFLINE,
      };

      prismaMock.rider.findUnique.mockResolvedValue(rider);

      prismaMock.rider.update.mockResolvedValue({
        ...rider,
        status: RiderStatus.ACTIVE,
      });

      const result = await service.activateRider('rider-1');

      expect(prismaMock.rider.update).toHaveBeenCalledWith({
        where: {
          id: 'rider-1',
        },
        data: {
          status: RiderStatus.ACTIVE,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
      });

      expect(result.status).toBe(RiderStatus.ACTIVE);
    });

    it('should return the rider without updating when already active', async () => {
      const rider = {
        id: 'rider-1',
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.OFFLINE,
      };

      prismaMock.rider.findUnique.mockResolvedValue(rider);

      const result = await service.activateRider('rider-1');

      expect(result).toEqual(rider);
      expect(prismaMock.rider.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivateRider', () => {
    it('should deactivate an offline rider', async () => {
      const rider = {
        id: 'rider-1',
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.OFFLINE,
      };

      prismaMock.rider.findUnique.mockResolvedValue(rider);

      prismaMock.rider.update.mockResolvedValue({
        ...rider,
        status: RiderStatus.INACTIVE,
        availability: RiderAvailability.OFFLINE,
      });

      const result = await service.deactivateRider('rider-1');

      expect(prismaMock.rider.update).toHaveBeenCalled();
      expect(result.status).toBe(RiderStatus.INACTIVE);
    });

    it('should reject deactivation while rider is not offline', async () => {
      const rider = {
        id: 'rider-1',
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.ONLINE,
      };

      prismaMock.rider.findUnique.mockResolvedValue(rider);

      await expect(
        service.deactivateRider('rider-1'),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.rider.update).not.toHaveBeenCalled();
    });

    it('should return the rider when already inactive', async () => {
      const rider = {
        id: 'rider-1',
        status: RiderStatus.INACTIVE,
        availability: RiderAvailability.OFFLINE,
      };

      prismaMock.rider.findUnique.mockResolvedValue(rider);

      const result = await service.deactivateRider('rider-1');

      expect(result).toEqual(rider);
      expect(prismaMock.rider.update).not.toHaveBeenCalled();
    });
  });

  describe('setAvailability', () => {
    it('should allow an active rider to go online', async () => {
      const rider = {
        id: 'rider-1',
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.OFFLINE,
      };

      prismaMock.rider.findUnique.mockResolvedValue(rider);

      prismaMock.rider.update.mockResolvedValue({
        ...rider,
        availability: RiderAvailability.ONLINE,
      });

      const result = await service.setAvailability(
        'rider-1',
        RiderAvailability.ONLINE,
      );

      expect(prismaMock.rider.update).toHaveBeenCalledWith({
        where: {
          id: 'rider-1',
        },
        data: {
          availability: RiderAvailability.ONLINE,
        },
      });

      expect(result.availability).toBe(RiderAvailability.ONLINE);
    });

    it('should reject availability changes for inactive riders', async () => {
      const rider = {
        id: 'rider-1',
        status: RiderStatus.INACTIVE,
        availability: RiderAvailability.OFFLINE,
      };

      prismaMock.rider.findUnique.mockResolvedValue(rider);

      await expect(
        service.setAvailability(
          'rider-1',
          RiderAvailability.ONLINE,
        ),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.rider.update).not.toHaveBeenCalled();
    });

    it('should allow an active rider to go offline', async () => {
      const rider = {
        id: 'rider-1',
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.ONLINE,
      };

      prismaMock.rider.findUnique.mockResolvedValue(rider);

      prismaMock.rider.update.mockResolvedValue({
        ...rider,
        availability: RiderAvailability.OFFLINE,
      });

      const result = await service.setAvailability(
        'rider-1',
        RiderAvailability.OFFLINE,
      );

      expect(result.availability).toBe(RiderAvailability.OFFLINE);
    });

    it('should reject going offline during an assigned delivery', async () => {
      const rider = {
        id: 'rider-1',
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.ASSIGNED,
      };

      prismaMock.rider.findUnique.mockResolvedValue(rider);

      await expect(
        service.setAvailability(
          'rider-1',
          RiderAvailability.OFFLINE,
        ),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.rider.update).not.toHaveBeenCalled();
    });

    it('should reject going offline during an active delivery', async () => {
      const rider = {
        id: 'rider-1',
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.ON_DELIVERY,
      };

      prismaMock.rider.findUnique.mockResolvedValue(rider);

      await expect(
        service.setAvailability(
          'rider-1',
          RiderAvailability.OFFLINE,
        ),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.rider.update).not.toHaveBeenCalled();
    });
  });

  describe('updateVehicle', () => {
    it('should update rider vehicle information', async () => {
      const rider = {
        id: 'rider-1',
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.OFFLINE,
      };

      prismaMock.rider.findUnique.mockResolvedValue(rider);

      prismaMock.rider.update.mockResolvedValue({
        ...rider,
        vehicleType: 'SCOOTER',
        vehicleNumber: 'UP65XY9999',
      });

      const result = await service.updateVehicle(
        'rider-1',
        'SCOOTER',
        'UP65XY9999',
      );

      expect(prismaMock.rider.update).toHaveBeenCalledWith({
        where: {
          id: 'rider-1',
        },
        data: {
          vehicleType: 'SCOOTER',
          vehicleNumber: 'UP65XY9999',
        },
      });

      expect(result.vehicleType).toBe('SCOOTER');
      expect(result.vehicleNumber).toBe('UP65XY9999');
    });

    it('should reject vehicle update for a missing rider', async () => {
      prismaMock.rider.findUnique.mockResolvedValue(null);

      await expect(
        service.updateVehicle(
          'missing-rider',
          'BIKE',
          'UP65AB1234',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.rider.update).not.toHaveBeenCalled();
    });
  });
});