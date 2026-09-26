import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RiderController } from './rider.controller';
import { RiderService } from './rider.service';
import { RiderAvailability } from '@prisma/client';

describe('RiderController', () => {
  let controller: RiderController;

  const riderServiceMock = {
    createRider: jest.fn<(...args: any[]) => Promise<any>>(),
    getRiderByUserId: jest.fn<(...args: any[]) => Promise<any>>(),
    activateRider: jest.fn<(...args: any[]) => Promise<any>>(),
    deactivateRider: jest.fn<(...args: any[]) => Promise<any>>(),
    setAvailability: jest.fn<(...args: any[]) => Promise<any>>(),
    updateVehicle: jest.fn<(...args: any[]) => Promise<any>>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new RiderController(
      riderServiceMock as unknown as RiderService,
    );
  });

  describe('createRider', () => {
    it('should create a rider for the authenticated user', async () => {
      const req = {
        user: {
          id: 'user-1',
        },
      };

      const dto = {
        vehicleType: 'BIKE',
        vehicleNumber: 'UP65AB1234',
      };

      const rider = {
        id: 'rider-1',
        userId: 'user-1',
        vehicleType: 'BIKE',
        vehicleNumber: 'UP65AB1234',
      };

      riderServiceMock.createRider.mockResolvedValue(rider);

      const result = await controller.createRider(req, dto);

      expect(riderServiceMock.createRider).toHaveBeenCalledWith(
        'user-1',
        'BIKE',
        'UP65AB1234',
      );

      expect(result).toEqual(rider);
    });

    it('should allow rider creation without vehicle information', async () => {
      const req = {
        user: {
          id: 'user-1',
        },
      };

      const dto = {};

      const rider = {
        id: 'rider-1',
        userId: 'user-1',
      };

      riderServiceMock.createRider.mockResolvedValue(rider);

      const result = await controller.createRider(req, dto);

      expect(riderServiceMock.createRider).toHaveBeenCalledWith(
        'user-1',
        undefined,
        undefined,
      );

      expect(result).toEqual(rider);
    });
  });

  describe('getMyRider', () => {
    it('should return the authenticated user rider profile', async () => {
      const req = {
        user: {
          id: 'user-1',
        },
      };

      const rider = {
        id: 'rider-1',
        userId: 'user-1',
      };

      riderServiceMock.getRiderByUserId.mockResolvedValue(rider);

      const result = await controller.getMyRider(req);

      expect(
        riderServiceMock.getRiderByUserId,
      ).toHaveBeenCalledWith('user-1');

      expect(result).toEqual(rider);
    });
  });

  describe('activate', () => {
    it('should activate the authenticated user rider', async () => {
      const req = {
        user: {
          id: 'user-1',
        },
      };

      const rider = {
        id: 'rider-1',
        userId: 'user-1',
      };

      const activatedRider = {
        ...rider,
        status: 'ACTIVE',
      };

      riderServiceMock.getRiderByUserId.mockResolvedValue(rider);
      riderServiceMock.activateRider.mockResolvedValue(activatedRider);

      const result = await controller.activate(req);

      expect(
        riderServiceMock.getRiderByUserId,
      ).toHaveBeenCalledWith('user-1');

      expect(riderServiceMock.activateRider).toHaveBeenCalledWith(
        'rider-1',
      );

      expect(result).toEqual(activatedRider);
    });
  });

  describe('deactivate', () => {
    it('should deactivate the authenticated user rider', async () => {
      const req = {
        user: {
          id: 'user-1',
        },
      };

      const rider = {
        id: 'rider-1',
        userId: 'user-1',
      };

      const deactivatedRider = {
        ...rider,
        status: 'INACTIVE',
      };

      riderServiceMock.getRiderByUserId.mockResolvedValue(rider);
      riderServiceMock.deactivateRider.mockResolvedValue(
        deactivatedRider,
      );

      const result = await controller.deactivate(req);

      expect(
        riderServiceMock.getRiderByUserId,
      ).toHaveBeenCalledWith('user-1');

      expect(riderServiceMock.deactivateRider).toHaveBeenCalledWith(
        'rider-1',
      );

      expect(result).toEqual(deactivatedRider);
    });
  });

  describe('setAvailability', () => {
    it('should update rider availability', async () => {
      const req = {
        user: {
          id: 'user-1',
        },
      };

      const dto = {
        availability: RiderAvailability.ONLINE,
      };

      const rider = {
        id: 'rider-1',
        userId: 'user-1',
      };

      const updatedRider = {
        ...rider,
        availability: RiderAvailability.ONLINE,
      };

      riderServiceMock.getRiderByUserId.mockResolvedValue(rider);
      riderServiceMock.setAvailability.mockResolvedValue(
        updatedRider,
      );

      const result = await controller.setAvailability(req, dto);

      expect(
        riderServiceMock.getRiderByUserId,
      ).toHaveBeenCalledWith('user-1');

      expect(riderServiceMock.setAvailability).toHaveBeenCalledWith(
        'rider-1',
        RiderAvailability.ONLINE,
      );

      expect(result).toEqual(updatedRider);
    });
  });

  describe('updateVehicle', () => {
    it('should update rider vehicle information', async () => {
      const req = {
        user: {
          id: 'user-1',
        },
      };

      const dto = {
        vehicleType: 'SCOOTER',
        vehicleNumber: 'UP65XY9999',
      };

      const rider = {
        id: 'rider-1',
        userId: 'user-1',
      };

      const updatedRider = {
        ...rider,
        vehicleType: 'SCOOTER',
        vehicleNumber: 'UP65XY9999',
      };

      riderServiceMock.getRiderByUserId.mockResolvedValue(rider);
      riderServiceMock.updateVehicle.mockResolvedValue(updatedRider);

      const result = await controller.updateVehicle(req, dto);

      expect(
        riderServiceMock.getRiderByUserId,
      ).toHaveBeenCalledWith('user-1');

      expect(riderServiceMock.updateVehicle).toHaveBeenCalledWith(
        'rider-1',
        'SCOOTER',
        'UP65XY9999',
      );

      expect(result).toEqual(updatedRider);
    });

    it('should allow partial vehicle information', async () => {
      const req = {
        user: {
          id: 'user-1',
        },
      };

      const dto = {
        vehicleNumber: 'UP65NEW123',
      };

      const rider = {
        id: 'rider-1',
        userId: 'user-1',
      };

      const updatedRider = {
        ...rider,
        vehicleNumber: 'UP65NEW123',
      };

      riderServiceMock.getRiderByUserId.mockResolvedValue(rider);
      riderServiceMock.updateVehicle.mockResolvedValue(updatedRider);

      const result = await controller.updateVehicle(req, dto);

      expect(riderServiceMock.updateVehicle).toHaveBeenCalledWith(
        'rider-1',
        undefined,
        'UP65NEW123',
      );

      expect(result).toEqual(updatedRider);
    });
  });
});