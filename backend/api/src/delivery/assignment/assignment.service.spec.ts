import { jest } from '@jest/globals';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryAssignmentStatus,
  DeliveryEventType,
  DeliveryStatus,
  RiderAvailability,
  RiderStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AssignmentService } from './assignment.service';

type MockFn = jest.MockedFunction<any>;

type TxMock = {
  deliveryAssignment: {
    create: MockFn;
  };
  delivery: {
    update: MockFn;
  };
  rider: {
    update: MockFn;
  };
  deliveryEvent: {
    create: MockFn;
  };
};

type TransactionMock = MockFn;

describe('AssignmentService', () => {
  let service: AssignmentService;

  const deliveryId = 'delivery-1';
  const riderId = 'rider-1';
  const assignmentId = 'assignment-1';

  const txMock: TxMock = {
    deliveryAssignment: {
      create: jest.fn() as MockFn,
    },
    delivery: {
      update: jest.fn() as MockFn,
    },
    rider: {
      update: jest.fn() as MockFn,
    },
    deliveryEvent: {
      create: jest.fn() as MockFn,
    },
  };

  const transactionMock = jest.fn() as TransactionMock;

  const prismaMock = {
    delivery: {
      findUnique: jest.fn() as MockFn,
      findFirst: jest.fn() as MockFn,
    },
    rider: {
      findUnique: jest.fn() as MockFn,
    },
    $transaction: transactionMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    transactionMock.mockImplementation(
      async (callback: any) => {
        return callback(txMock);
      },
    );

    service = new AssignmentService(
      prismaMock as unknown as PrismaService,
    );
  });

  describe('assignRider', () => {
    it('should throw when delivery does not exist', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(null);

      await expect(
        service.assignRider(deliveryId, riderId),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.rider.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject delivery that is not in CREATED status', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        riderId: null,
        status: DeliveryStatus.OUT_FOR_DELIVERY,
        rider: null,
        assignments: [],
      });

      await expect(
        service.assignRider(deliveryId, riderId),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.rider.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject delivery that already has a rider', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        riderId: 'existing-rider',
        status: DeliveryStatus.CREATED,
        rider: {
          id: 'existing-rider',
        },
        assignments: [],
      });

      await expect(
        service.assignRider(deliveryId, riderId),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.rider.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject delivery with an active assignment', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        riderId: null,
        status: DeliveryStatus.CREATED,
        rider: null,
        assignments: [
          {
            id: 'existing-assignment',
            status: DeliveryAssignmentStatus.PENDING,
          },
        ],
      });

      await expect(
        service.assignRider(deliveryId, riderId),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.rider.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw when rider does not exist', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        riderId: null,
        status: DeliveryStatus.CREATED,
        rider: null,
        assignments: [],
      });

      prismaMock.rider.findUnique.mockResolvedValue(null);

      await expect(
        service.assignRider(deliveryId, riderId),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject an inactive rider', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        riderId: null,
        status: DeliveryStatus.CREATED,
        rider: null,
        assignments: [],
      });

      prismaMock.rider.findUnique.mockResolvedValue({
        id: riderId,
        status: RiderStatus.INACTIVE,
        availability: RiderAvailability.ONLINE,
      });

      await expect(
        service.assignRider(deliveryId, riderId),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject an offline rider', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        riderId: null,
        status: DeliveryStatus.CREATED,
        rider: null,
        assignments: [],
      });

      prismaMock.rider.findUnique.mockResolvedValue({
        id: riderId,
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.OFFLINE,
      });

      await expect(
        service.assignRider(deliveryId, riderId),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject a rider who already has an active delivery', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        riderId: null,
        status: DeliveryStatus.CREATED,
        rider: null,
        assignments: [],
      });

      prismaMock.rider.findUnique.mockResolvedValue({
        id: riderId,
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.ONLINE,
      });

      prismaMock.delivery.findFirst.mockResolvedValue({
        id: 'active-delivery',
      });

      await expect(
        service.assignRider(deliveryId, riderId),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should create a valid rider assignment', async () => {
      const assignment = {
        id: assignmentId,
        deliveryId,
        riderId,
        status: DeliveryAssignmentStatus.PENDING,
      };

      prismaMock.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        riderId: null,
        status: DeliveryStatus.CREATED,
        rider: null,
        assignments: [],
      });

      prismaMock.rider.findUnique.mockResolvedValue({
        id: riderId,
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.ONLINE,
      });

      prismaMock.delivery.findFirst.mockResolvedValue(null);

      txMock.deliveryAssignment.create.mockResolvedValue(
        assignment,
      );

      txMock.delivery.update.mockResolvedValue({
        id: deliveryId,
        riderId,
      });

      txMock.rider.update.mockResolvedValue({
        id: riderId,
        availability: RiderAvailability.ASSIGNED,
      });

      txMock.deliveryEvent.create.mockResolvedValue({
        id: 'event-1',
        deliveryId,
        type: DeliveryEventType.ASSIGNED,
      });

      const result = await service.assignRider(
        deliveryId,
        riderId,
      );

      expect(result).toEqual(assignment);
    });

    it('should create the assignment with PENDING status', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        riderId: null,
        status: DeliveryStatus.CREATED,
        rider: null,
        assignments: [],
      });

      prismaMock.rider.findUnique.mockResolvedValue({
        id: riderId,
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.ONLINE,
      });

      prismaMock.delivery.findFirst.mockResolvedValue(null);

      txMock.deliveryAssignment.create.mockResolvedValue({
        id: assignmentId,
        deliveryId,
        riderId,
        status: DeliveryAssignmentStatus.PENDING,
      });

      txMock.delivery.update.mockResolvedValue({});
      txMock.rider.update.mockResolvedValue({});
      txMock.deliveryEvent.create.mockResolvedValue({});

      await service.assignRider(
        deliveryId,
        riderId,
      );

      expect(
        txMock.deliveryAssignment.create,
      ).toHaveBeenCalledWith({
        data: {
          deliveryId,
          riderId,
          status: DeliveryAssignmentStatus.PENDING,
        },
      });
    });

    it('should assign the rider to the delivery', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        riderId: null,
        status: DeliveryStatus.CREATED,
        rider: null,
        assignments: [],
      });

      prismaMock.rider.findUnique.mockResolvedValue({
        id: riderId,
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.ONLINE,
      });

      prismaMock.delivery.findFirst.mockResolvedValue(null);

      txMock.deliveryAssignment.create.mockResolvedValue({
        id: assignmentId,
        deliveryId,
        riderId,
        status: DeliveryAssignmentStatus.PENDING,
      });

      txMock.delivery.update.mockResolvedValue({});
      txMock.rider.update.mockResolvedValue({});
      txMock.deliveryEvent.create.mockResolvedValue({});

      await service.assignRider(
        deliveryId,
        riderId,
      );

      expect(
        txMock.delivery.update,
      ).toHaveBeenCalledWith({
        where: {
          id: deliveryId,
        },
        data: {
          riderId,
        },
      });
    });

    it('should change rider availability to ASSIGNED', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        riderId: null,
        status: DeliveryStatus.CREATED,
        rider: null,
        assignments: [],
      });

      prismaMock.rider.findUnique.mockResolvedValue({
        id: riderId,
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.ONLINE,
      });

      prismaMock.delivery.findFirst.mockResolvedValue(null);

      txMock.deliveryAssignment.create.mockResolvedValue({
        id: assignmentId,
        deliveryId,
        riderId,
        status: DeliveryAssignmentStatus.PENDING,
      });

      txMock.delivery.update.mockResolvedValue({});
      txMock.rider.update.mockResolvedValue({});
      txMock.deliveryEvent.create.mockResolvedValue({});

      await service.assignRider(
        deliveryId,
        riderId,
      );

      expect(
        txMock.rider.update,
      ).toHaveBeenCalledWith({
        where: {
          id: riderId,
        },
        data: {
          availability: RiderAvailability.ASSIGNED,
        },
      });
    });

    it('should create an ASSIGNED delivery event', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        riderId: null,
        status: DeliveryStatus.CREATED,
        rider: null,
        assignments: [],
      });

      prismaMock.rider.findUnique.mockResolvedValue({
        id: riderId,
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.ONLINE,
      });

      prismaMock.delivery.findFirst.mockResolvedValue(null);

      txMock.deliveryAssignment.create.mockResolvedValue({
        id: assignmentId,
        deliveryId,
        riderId,
        status: DeliveryAssignmentStatus.PENDING,
      });

      txMock.delivery.update.mockResolvedValue({});
      txMock.rider.update.mockResolvedValue({});
      txMock.deliveryEvent.create.mockResolvedValue({});

      await service.assignRider(
        deliveryId,
        riderId,
      );

      expect(
        txMock.deliveryEvent.create,
      ).toHaveBeenCalledWith({
        data: {
          deliveryId,
          type: DeliveryEventType.ASSIGNED,
          metadata: {
            riderId,
            assignmentId,
          },
        },
      });
    });

    it('should execute assignment changes inside a transaction', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        riderId: null,
        status: DeliveryStatus.CREATED,
        rider: null,
        assignments: [],
      });

      prismaMock.rider.findUnique.mockResolvedValue({
        id: riderId,
        status: RiderStatus.ACTIVE,
        availability: RiderAvailability.ONLINE,
      });

      prismaMock.delivery.findFirst.mockResolvedValue(null);

      txMock.deliveryAssignment.create.mockResolvedValue({
        id: assignmentId,
        deliveryId,
        riderId,
        status: DeliveryAssignmentStatus.PENDING,
      });

      txMock.delivery.update.mockResolvedValue({});
      txMock.rider.update.mockResolvedValue({});
      txMock.deliveryEvent.create.mockResolvedValue({});

      await service.assignRider(
        deliveryId,
        riderId,
      );

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(
        txMock.deliveryAssignment.create,
      ).toHaveBeenCalledTimes(1);
      expect(
        txMock.delivery.update,
      ).toHaveBeenCalledTimes(1);
      expect(
        txMock.rider.update,
      ).toHaveBeenCalledTimes(1);
      expect(
        txMock.deliveryEvent.create,
      ).toHaveBeenCalledTimes(1);
    });
  });
});