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
import { DeliveryRealtimeService } from '../gateway/delivery-realtime.service';

type MockFn = jest.MockedFunction<any>;

type TxMock = {
  delivery: {
    update: MockFn;
  };
  deliveryAssignment: {
    create: MockFn;
    update: MockFn;
  };
  rider: {
    update: MockFn;
  };
  deliveryEvent: {
    create: MockFn;
  };
  order: {
  update: MockFn;
};
};

type TransactionMock = MockFn;

describe('AssignmentService', () => {
  let service: AssignmentService;
  let realtimeService: {
  emitToDelivery: jest.Mock;
};

  const deliveryId = 'delivery-1';
  const riderId = 'rider-1';
  const assignmentId = 'assignment-1';

 const txMock: TxMock = {
  delivery: {
    update: jest.fn() as MockFn,
  },
  deliveryAssignment: {
    create: jest.fn() as MockFn,
    update: jest.fn() as MockFn,
  },
  rider: {
    update: jest.fn() as MockFn,
  },
  deliveryEvent: {
    create: jest.fn() as MockFn,
  },
  order: {
    update: jest.fn() as MockFn,
  },
};

  const transactionMock = jest.fn() as TransactionMock;

 const prismaMock = {
  delivery: {
    findUnique: jest.fn() as MockFn,
    findFirst: jest.fn() as MockFn,
  },
  deliveryAssignment: {
    findUnique: jest.fn() as MockFn,
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
realtimeService = {
    emitToDelivery: jest.fn(),
  };
   service = new AssignmentService(
  prismaMock as unknown as PrismaService,
  realtimeService as unknown as DeliveryRealtimeService,
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
          status: DeliveryStatus.ASSIGNED,
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

  describe('acceptAssignment', () => {
    const acceptedAssignment = {
      id: assignmentId,
      deliveryId,
      riderId,
      status: DeliveryAssignmentStatus.PENDING,
    };

    beforeEach(() => {
      prismaMock.deliveryAssignment = {
        findUnique: jest.fn() as MockFn,
      } as any;
    });

    it('should throw when assignment does not exist', async () => {
      prismaMock.deliveryAssignment.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptAssignment(assignmentId),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject an assignment that is not PENDING', async () => {
      prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
        ...acceptedAssignment,
        status: DeliveryAssignmentStatus.ACCEPTED,
      });

      await expect(
        service.acceptAssignment(assignmentId),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject acceptance when delivery is not ASSIGNED', async () => {
      prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
        ...acceptedAssignment,
        delivery: {
          id: deliveryId,
          status: DeliveryStatus.CREATED,
        },
        rider: {
          id: riderId,
          availability: RiderAvailability.ASSIGNED,
        },
      });

      await expect(
        service.acceptAssignment(assignmentId),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should accept a valid assignment', async () => {
      prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
        ...acceptedAssignment,
        delivery: {
          id: deliveryId,
          status: DeliveryStatus.ASSIGNED,
        },
        rider: {
          id: riderId,
          availability: RiderAvailability.ASSIGNED,
        },
      });

      txMock.deliveryAssignment.update.mockResolvedValue({
        ...acceptedAssignment,
        status: DeliveryAssignmentStatus.ACCEPTED,
      });

      txMock.delivery.update.mockResolvedValue({
        id: deliveryId,
        status: DeliveryStatus.RIDER_ACCEPTED,
      });

      txMock.rider.update.mockResolvedValue({
        id: riderId,
        availability: RiderAvailability.ON_DELIVERY,
      });

      txMock.deliveryEvent.create.mockResolvedValue({
        id: 'event-accept-1',
        deliveryId,
        type: DeliveryEventType.ACCEPTED,
      });

      const result = await service.acceptAssignment(
        assignmentId,
      );

      expect(result).toEqual({
        ...acceptedAssignment,
        status: DeliveryAssignmentStatus.ACCEPTED,
      });
    });

    it('should change assignment status to ACCEPTED', async () => {
      prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
        ...acceptedAssignment,
        delivery: {
          id: deliveryId,
          status: DeliveryStatus.ASSIGNED,
        },
        rider: {
          id: riderId,
          availability: RiderAvailability.ASSIGNED,
        },
      });

      txMock.deliveryAssignment.update.mockResolvedValue({});
      txMock.delivery.update.mockResolvedValue({});
      txMock.rider.update.mockResolvedValue({});
      txMock.deliveryEvent.create.mockResolvedValue({});

      await service.acceptAssignment(assignmentId);

      expect(
        txMock.deliveryAssignment.update,
      ).toHaveBeenCalledWith({
        where: {
          id: assignmentId,
        },
        data: {
          status: DeliveryAssignmentStatus.ACCEPTED,
          acceptedAt: expect.any(Date),
        },
      });
    });

    it('should change delivery status to RIDER_ACCEPTED', async () => {
      prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
        ...acceptedAssignment,
        delivery: {
          id: deliveryId,
          status: DeliveryStatus.ASSIGNED,
        },
        rider: {
          id: riderId,
          availability: RiderAvailability.ASSIGNED,
        },
      });

      txMock.deliveryAssignment.update.mockResolvedValue({});
      txMock.delivery.update.mockResolvedValue({});
      txMock.rider.update.mockResolvedValue({});
      txMock.deliveryEvent.create.mockResolvedValue({});

      await service.acceptAssignment(assignmentId);

      expect(txMock.delivery.update).toHaveBeenCalledWith({
        where: {
          id: deliveryId,
        },
        data: {
          status: DeliveryStatus.RIDER_ACCEPTED,
        },
      });
    });

    it('should change rider availability to ON_DELIVERY', async () => {
      prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
        ...acceptedAssignment,
        delivery: {
          id: deliveryId,
          status: DeliveryStatus.ASSIGNED,
        },
        rider: {
          id: riderId,
          availability: RiderAvailability.ASSIGNED,
        },
      });

      txMock.deliveryAssignment.update.mockResolvedValue({});
      txMock.delivery.update.mockResolvedValue({});
      txMock.rider.update.mockResolvedValue({});
      txMock.deliveryEvent.create.mockResolvedValue({});

      await service.acceptAssignment(assignmentId);

      expect(txMock.rider.update).toHaveBeenCalledWith({
        where: {
          id: riderId,
        },
        data: {
          availability: RiderAvailability.ON_DELIVERY,
        },
      });
    });

    it('should create an ACCEPTED delivery event', async () => {
      prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
        ...acceptedAssignment,
        delivery: {
          id: deliveryId,
          status: DeliveryStatus.ASSIGNED,
        },
        rider: {
          id: riderId,
          availability: RiderAvailability.ASSIGNED,
        },
      });

      txMock.deliveryAssignment.update.mockResolvedValue({});
      txMock.delivery.update.mockResolvedValue({});
      txMock.rider.update.mockResolvedValue({});
      txMock.deliveryEvent.create.mockResolvedValue({});

      await service.acceptAssignment(assignmentId);

      expect(
        txMock.deliveryEvent.create,
      ).toHaveBeenCalledWith({
        data: {
          deliveryId,
          type: DeliveryEventType.ACCEPTED,
          metadata: {
            riderId,
            assignmentId,
          },
        },
      });
    });

    it('should execute acceptance changes inside a transaction', async () => {
      prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
        ...acceptedAssignment,
        delivery: {
          id: deliveryId,
          status: DeliveryStatus.ASSIGNED,
        },
        rider: {
          id: riderId,
          availability: RiderAvailability.ASSIGNED,
        },
      });

      txMock.deliveryAssignment.update.mockResolvedValue({});
      txMock.delivery.update.mockResolvedValue({});
      txMock.rider.update.mockResolvedValue({});
      txMock.deliveryEvent.create.mockResolvedValue({});

      await service.acceptAssignment(assignmentId);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(
        txMock.deliveryAssignment.update,
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

  describe('arriveAtRestaurant', () => {
  const assignmentId = 'assignment-123';

  it('should throw when assignment does not exist', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue(null);

    await expect(
      service.arriveAtRestaurant(assignmentId),
    ).rejects.toThrow('Delivery assignment not found');
  });

  it('should reject an assignment that is not ACCEPTED', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.PENDING,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.ASSIGNED,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ASSIGNED,
      },
    });

    await expect(
      service.arriveAtRestaurant(assignmentId),
    ).rejects.toThrow(
      'Only accepted assignments can mark arrival',
    );
  });

  it('should reject when delivery is not RIDER_ACCEPTED', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.ASSIGNED,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    await expect(
      service.arriveAtRestaurant(assignmentId),
    ).rejects.toThrow(
      'Delivery is not ready for restaurant arrival',
    );
  });

  it('should reject when rider is not ON_DELIVERY', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.RIDER_ACCEPTED,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ASSIGNED,
      },
    });

    await expect(
      service.arriveAtRestaurant(assignmentId),
    ).rejects.toThrow(
      'Rider must be on delivery before arrival',
    );
  });

  it('should successfully mark rider as arrived at restaurant', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.RIDER_ACCEPTED,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.ARRIVED_AT_RESTAURANT,
    });

    txMock.deliveryEvent.create.mockResolvedValue({
      id: 'event-123',
      deliveryId: 'delivery-123',
      type: DeliveryEventType.ARRIVED,
    });

    const result =
      await service.arriveAtRestaurant(assignmentId);

    expect(result).toEqual({
      id: 'delivery-123',
      status: DeliveryStatus.ARRIVED_AT_RESTAURANT,
    });
  });

  it('should change delivery status to ARRIVED_AT_RESTAURANT', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.RIDER_ACCEPTED,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.ARRIVED_AT_RESTAURANT,
    });

    await service.arriveAtRestaurant(assignmentId);

    expect(
      txMock.delivery.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'delivery-123',
      },
      data: {
        status: DeliveryStatus.ARRIVED_AT_RESTAURANT,
      },
    });
  });

  it('should create an ARRIVED delivery event', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.RIDER_ACCEPTED,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.ARRIVED_AT_RESTAURANT,
    });

    await service.arriveAtRestaurant(assignmentId);

    expect(
      txMock.deliveryEvent.create,
    ).toHaveBeenCalledWith({
      data: {
        deliveryId: 'delivery-123',
        type: DeliveryEventType.ARRIVED,
        metadata: {
          riderId: 'rider-123',
          assignmentId,
        },
      },
    });
  });

  it('should execute arrival changes inside a transaction', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.RIDER_ACCEPTED,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.ARRIVED_AT_RESTAURANT,
    });

    await service.arriveAtRestaurant(assignmentId);

    expect(
      prismaMock.$transaction,
    ).toHaveBeenCalled();
  });
  });

  describe('pickupDelivery', () => {
  const assignmentId = 'assignment-123';

  it('should throw when assignment does not exist', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue(null);

    await expect(
      service.pickupDelivery(assignmentId),
    ).rejects.toThrow('Delivery assignment not found');
  });

  it('should reject an assignment that is not ACCEPTED', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.PENDING,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.ARRIVED_AT_RESTAURANT,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    await expect(
      service.pickupDelivery(assignmentId),
    ).rejects.toThrow(
      'Only accepted assignments can pick up delivery',
    );
  });

  it('should reject when delivery is not ARRIVED_AT_RESTAURANT', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.RIDER_ACCEPTED,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    await expect(
      service.pickupDelivery(assignmentId),
    ).rejects.toThrow(
      'Delivery is not ready for pickup',
    );
  });

  it('should reject when rider is not ON_DELIVERY', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.ARRIVED_AT_RESTAURANT,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ASSIGNED,
      },
    });

    await expect(
      service.pickupDelivery(assignmentId),
    ).rejects.toThrow(
      'Rider must be on delivery before pickup',
    );
  });

  it('should successfully mark delivery as picked up', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.ARRIVED_AT_RESTAURANT,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.PICKED_UP,
    });

    txMock.deliveryEvent.create.mockResolvedValue({
      id: 'event-123',
      deliveryId: 'delivery-123',
      type: DeliveryEventType.PICKED_UP,
    });

    const result =
      await service.pickupDelivery(assignmentId);

    expect(result).toEqual({
      id: 'delivery-123',
      status: DeliveryStatus.PICKED_UP,
    });
  });

  it('should change delivery status to PICKED_UP', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.ARRIVED_AT_RESTAURANT,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.PICKED_UP,
    });

    await service.pickupDelivery(assignmentId);

    expect(
      txMock.delivery.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'delivery-123',
      },
      data: {
        status: DeliveryStatus.PICKED_UP,
        pickupAt: expect.any(Date),
      },
    });
  });

  it('should create a PICKED_UP delivery event', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.ARRIVED_AT_RESTAURANT,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.PICKED_UP,
    });

    await service.pickupDelivery(assignmentId);

    expect(
      txMock.deliveryEvent.create,
    ).toHaveBeenCalledWith({
      data: {
        deliveryId: 'delivery-123',
        type: DeliveryEventType.PICKED_UP,
        metadata: {
          riderId: 'rider-123',
          assignmentId,
        },
      },
    });
  });

  it('should execute pickup changes inside a transaction', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.ARRIVED_AT_RESTAURANT,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.PICKED_UP,
    });

    await service.pickupDelivery(assignmentId);

    expect(
      prismaMock.$transaction,
    ).toHaveBeenCalled();
  });
  });

  describe('outForDelivery', () => {
  const assignmentId = 'assignment-123';

  it('should throw when assignment does not exist', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue(null);

    await expect(
      service.outForDelivery(assignmentId),
    ).rejects.toThrow('Delivery assignment not found');
  });

  it('should reject an assignment that is not ACCEPTED', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.PENDING,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.PICKED_UP,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    await expect(
      service.outForDelivery(assignmentId),
    ).rejects.toThrow(
      'Only accepted assignments can go out for delivery',
    );
  });

  it('should reject when delivery is not PICKED_UP', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.ARRIVED_AT_RESTAURANT,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    await expect(
      service.outForDelivery(assignmentId),
    ).rejects.toThrow(
      'Delivery is not ready to go out for delivery',
    );
  });

  it('should reject when rider is not ON_DELIVERY', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.PICKED_UP,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ASSIGNED,
      },
    });

    await expect(
      service.outForDelivery(assignmentId),
    ).rejects.toThrow(
      'Rider must be on delivery before going out for delivery',
    );
  });

  it('should successfully mark delivery as out for delivery', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.PICKED_UP,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.OUT_FOR_DELIVERY,
    });

    txMock.deliveryEvent.create.mockResolvedValue({
      id: 'event-123',
      deliveryId: 'delivery-123',
      type: DeliveryEventType.OUT_FOR_DELIVERY,
    });

    const result =
      await service.outForDelivery(assignmentId);

    expect(result).toEqual({
      id: 'delivery-123',
      status: DeliveryStatus.OUT_FOR_DELIVERY,
    });
  });

  it('should change delivery status to OUT_FOR_DELIVERY', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.PICKED_UP,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.OUT_FOR_DELIVERY,
    });

    await service.outForDelivery(assignmentId);

    expect(
      txMock.delivery.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'delivery-123',
      },
      data: {
        status: DeliveryStatus.OUT_FOR_DELIVERY,
        outForDeliveryAt: expect.any(Date),
      },
    });
  });

  it('should create an OUT_FOR_DELIVERY delivery event', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.PICKED_UP,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.OUT_FOR_DELIVERY,
    });

    await service.outForDelivery(assignmentId);

    expect(
      txMock.deliveryEvent.create,
    ).toHaveBeenCalledWith({
      data: {
        deliveryId: 'delivery-123',
        type: DeliveryEventType.OUT_FOR_DELIVERY,
        metadata: {
          riderId: 'rider-123',
          assignmentId,
        },
      },
    });
  });

  it('should execute out-for-delivery changes inside a transaction', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.PICKED_UP,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.OUT_FOR_DELIVERY,
    });

    await service.outForDelivery(assignmentId);

    expect(
      prismaMock.$transaction,
    ).toHaveBeenCalled();
  });
  });

  describe('completeDelivery', () => {
  const assignmentId = 'assignment-123';

  it('should throw when assignment does not exist', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue(null);

    await expect(
      service.completeDelivery(assignmentId),
    ).rejects.toThrow('Delivery assignment not found');
  });

  it('should reject an assignment that is not ACCEPTED', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.PENDING,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    await expect(
      service.completeDelivery(assignmentId),
    ).rejects.toThrow(
      'Only accepted assignments can complete delivery',
    );
  });

  it('should reject when delivery is not OUT_FOR_DELIVERY', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.PICKED_UP,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    await expect(
      service.completeDelivery(assignmentId),
    ).rejects.toThrow(
      'Delivery is not out for delivery',
    );
  });

  it('should reject when rider is not ON_DELIVERY', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ASSIGNED,
      },
    });

    await expect(
      service.completeDelivery(assignmentId),
    ).rejects.toThrow(
      'Rider must be on delivery before completing delivery',
    );
  });

  it('should successfully complete the delivery', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.DELIVERED,
    });

    txMock.rider.update.mockResolvedValue({
      id: 'rider-123',
      availability: RiderAvailability.OFFLINE,
    });

    txMock.deliveryEvent.create.mockResolvedValue({
      id: 'event-123',
      deliveryId: 'delivery-123',
      type: DeliveryEventType.DELIVERED,
    });

    const result =
      await service.completeDelivery(assignmentId);

    expect(result).toEqual({
      id: 'delivery-123',
      status: DeliveryStatus.DELIVERED,
    });
  });

  it('should change delivery status to DELIVERED', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.DELIVERED,
    });

    await service.completeDelivery(assignmentId);

    expect(
      txMock.delivery.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'delivery-123',
      },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: expect.any(Date),
      },
    });
  });

  it('should change rider availability to OFFLINE', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.DELIVERED,
    });

    txMock.rider.update.mockResolvedValue({
      id: 'rider-123',
      availability: RiderAvailability.OFFLINE,
    });

    await service.completeDelivery(assignmentId);

    expect(
      txMock.rider.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'rider-123',
      },
      data: {
        availability: RiderAvailability.OFFLINE,
      },
    });
  });

  it('should create a DELIVERED delivery event', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.DELIVERED,
    });

    await service.completeDelivery(assignmentId);

    expect(
      txMock.deliveryEvent.create,
    ).toHaveBeenCalledWith({
      data: {
        deliveryId: 'delivery-123',
        type: DeliveryEventType.DELIVERED,
        metadata: {
          riderId: 'rider-123',
          assignmentId,
        },
      },
    });
  });

  it('should execute completion changes inside a transaction', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.DELIVERED,
    });

    txMock.rider.update.mockResolvedValue({
      id: 'rider-123',
      availability: RiderAvailability.OFFLINE,
    });

    await service.completeDelivery(assignmentId);

    expect(
      prismaMock.$transaction,
    ).toHaveBeenCalled();
  });
  });

  describe('failDelivery', () => {
  const assignmentId = 'assignment-123';

  it('should throw when assignment does not exist', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue(null);

    await expect(
      service.failDelivery(assignmentId),
    ).rejects.toThrow('Delivery assignment not found');
  });

  it('should reject an assignment that is not ACCEPTED', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.PENDING,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    await expect(
      service.failDelivery(assignmentId),
    ).rejects.toThrow(
      'Only accepted assignments can fail delivery',
    );
  });

  it('should reject when delivery is not OUT_FOR_DELIVERY', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.PICKED_UP,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    await expect(
      service.failDelivery(assignmentId),
    ).rejects.toThrow(
      'Delivery is not out for delivery',
    );
  });

  it('should reject when rider is not ON_DELIVERY', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ASSIGNED,
      },
    });

    await expect(
      service.failDelivery(assignmentId),
    ).rejects.toThrow(
      'Rider must be on delivery before failing delivery',
    );
  });

  it('should successfully fail the delivery', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.FAILED,
    });

    txMock.rider.update.mockResolvedValue({
      id: 'rider-123',
      availability: RiderAvailability.OFFLINE,
    });

    txMock.deliveryEvent.create.mockResolvedValue({
      id: 'event-123',
      deliveryId: 'delivery-123',
      type: DeliveryEventType.FAILED,
    });

    const result =
      await service.failDelivery(assignmentId);

    expect(result).toEqual({
      id: 'delivery-123',
      status: DeliveryStatus.FAILED,
    });
  });

  it('should change delivery status to FAILED', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.FAILED,
    });

    await service.failDelivery(assignmentId);

    expect(
      txMock.delivery.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'delivery-123',
      },
      data: {
        status: DeliveryStatus.FAILED,
        failedAt: expect.any(Date),
        failureReason: null,
      },
    });
  });

  it('should change rider availability to OFFLINE', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.FAILED,
    });

    txMock.rider.update.mockResolvedValue({
      id: 'rider-123',
      availability: RiderAvailability.OFFLINE,
    });

    await service.failDelivery(assignmentId);

    expect(
      txMock.rider.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'rider-123',
      },
      data: {
        availability: RiderAvailability.OFFLINE,
      },
    });
  });

  it('should create a FAILED delivery event', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.FAILED,
    });

    await service.failDelivery(assignmentId);

    expect(
      txMock.deliveryEvent.create,
    ).toHaveBeenCalledWith({
      data: {
        deliveryId: 'delivery-123',
        type: DeliveryEventType.FAILED,
        metadata: {
          riderId: 'rider-123',
          assignmentId,
          reason: null,
        },
      },
    });
  });

  it('should execute failure changes inside a transaction', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.FAILED,
    });

    txMock.rider.update.mockResolvedValue({
      id: 'rider-123',
      availability: RiderAvailability.OFFLINE,
    });

    await service.failDelivery(assignmentId);

    expect(
      prismaMock.$transaction,
    ).toHaveBeenCalled();
  });
  });
  
  describe('rejectAssignment', () => {
  it('should throw when assignment does not exist', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue(null);

    await expect(
      service.rejectAssignment(assignmentId),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('should reject an assignment that is not PENDING', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      deliveryId,
      riderId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      delivery: {
        id: deliveryId,
        status: DeliveryStatus.ASSIGNED,
        riderId,
      },
      rider: {
        id: riderId,
        availability: RiderAvailability.ASSIGNED,
      },
    });

    await expect(
      service.rejectAssignment(assignmentId),
    ).rejects.toThrow(ConflictException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('should reject when delivery is not ASSIGNED', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      deliveryId,
      riderId,
      status: DeliveryAssignmentStatus.PENDING,
      delivery: {
        id: deliveryId,
        status: DeliveryStatus.RIDER_ACCEPTED,
        riderId,
      },
      rider: {
        id: riderId,
        availability: RiderAvailability.ASSIGNED,
      },
    });

    await expect(
      service.rejectAssignment(assignmentId),
    ).rejects.toThrow(ConflictException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('should reject when rider is not ASSIGNED', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      deliveryId,
      riderId,
      status: DeliveryAssignmentStatus.PENDING,
      delivery: {
        id: deliveryId,
        status: DeliveryStatus.ASSIGNED,
        riderId,
      },
      rider: {
        id: riderId,
        availability: RiderAvailability.ONLINE,
      },
    });

    await expect(
      service.rejectAssignment(assignmentId),
    ).rejects.toThrow(ConflictException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('should successfully reject a valid assignment', async () => {
    const rejectedAssignment = {
      id: assignmentId,
      deliveryId,
      riderId,
      status: DeliveryAssignmentStatus.REJECTED,
    };

    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      deliveryId,
      riderId,
      status: DeliveryAssignmentStatus.PENDING,
      delivery: {
        id: deliveryId,
        status: DeliveryStatus.ASSIGNED,
        riderId,
      },
      rider: {
        id: riderId,
        availability: RiderAvailability.ASSIGNED,
      },
    });

    txMock.deliveryAssignment.update.mockResolvedValue(
      rejectedAssignment,
    );

    const result = await service.rejectAssignment(
      assignmentId,
    );

    expect(result).toEqual(rejectedAssignment);
  });

  it('should change assignment status to REJECTED', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      deliveryId,
      riderId,
      status: DeliveryAssignmentStatus.PENDING,
      delivery: {
        id: deliveryId,
        status: DeliveryStatus.ASSIGNED,
        riderId,
      },
      rider: {
        id: riderId,
        availability: RiderAvailability.ASSIGNED,
      },
    });

    txMock.deliveryAssignment.update.mockResolvedValue({});

    await service.rejectAssignment(assignmentId);

   expect(
  txMock.deliveryAssignment.update,
).toHaveBeenCalledWith({
  where: {
    id: assignmentId,
  },
  data: {
    status: DeliveryAssignmentStatus.REJECTED,
    rejectedAt: expect.any(Date),
  },
});
  });

  it('should release the rider from the delivery', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      deliveryId,
      riderId,
      status: DeliveryAssignmentStatus.PENDING,
      delivery: {
        id: deliveryId,
        status: DeliveryStatus.ASSIGNED,
        riderId,
      },
      rider: {
        id: riderId,
        availability: RiderAvailability.ASSIGNED,
      },
    });

    txMock.deliveryAssignment.update.mockResolvedValue({});
    txMock.delivery.update.mockResolvedValue({});

    await service.rejectAssignment(assignmentId);

    expect(txMock.delivery.update).toHaveBeenCalledWith({
      where: {
        id: deliveryId,
      },
      data: {
        riderId: null,
        status: DeliveryStatus.CREATED,
      },
    });
  });

  it('should change rider availability back to ONLINE', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      deliveryId,
      riderId,
      status: DeliveryAssignmentStatus.PENDING,
      delivery: {
        id: deliveryId,
        status: DeliveryStatus.ASSIGNED,
        riderId,
      },
      rider: {
        id: riderId,
        availability: RiderAvailability.ASSIGNED,
      },
    });

    txMock.deliveryAssignment.update.mockResolvedValue({});
    txMock.delivery.update.mockResolvedValue({});
    txMock.rider.update.mockResolvedValue({});

    await service.rejectAssignment(assignmentId);

    expect(txMock.rider.update).toHaveBeenCalledWith({
      where: {
        id: riderId,
      },
      data: {
        availability: RiderAvailability.ONLINE,
      },
    });
  });

  it('should create a REJECTED delivery event', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      deliveryId,
      riderId,
      status: DeliveryAssignmentStatus.PENDING,
      delivery: {
        id: deliveryId,
        status: DeliveryStatus.ASSIGNED,
        riderId,
      },
      rider: {
        id: riderId,
        availability: RiderAvailability.ASSIGNED,
      },
    });

    txMock.deliveryAssignment.update.mockResolvedValue({});
    txMock.delivery.update.mockResolvedValue({});
    txMock.rider.update.mockResolvedValue({});
    txMock.deliveryEvent.create.mockResolvedValue({});

    await service.rejectAssignment(assignmentId);

    expect(
      txMock.deliveryEvent.create,
    ).toHaveBeenCalledWith({
      data: {
        deliveryId,
        type: DeliveryEventType.REJECTED,
        metadata: {
          riderId,
          assignmentId,
        },
      },
    });
  });

  it('should execute rejection changes inside a transaction', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      deliveryId,
      riderId,
      status: DeliveryAssignmentStatus.PENDING,
      delivery: {
        id: deliveryId,
        status: DeliveryStatus.ASSIGNED,
        riderId,
      },
      rider: {
        id: riderId,
        availability: RiderAvailability.ASSIGNED,
      },
    });

    txMock.deliveryAssignment.update.mockResolvedValue({});
    txMock.delivery.update.mockResolvedValue({});
    txMock.rider.update.mockResolvedValue({});
    txMock.deliveryEvent.create.mockResolvedValue({});

    await service.rejectAssignment(assignmentId);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(
      txMock.deliveryAssignment.update,
    ).toHaveBeenCalled();
    expect(txMock.delivery.update).toHaveBeenCalled();
    expect(txMock.rider.update).toHaveBeenCalled();
    expect(txMock.deliveryEvent.create).toHaveBeenCalled();
  });
});

  describe('cancelDelivery', () => {
  const assignmentId = 'assignment-123';

  it('should throw when assignment does not exist', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue(null);

    await expect(
      service.cancelDelivery(assignmentId),
    ).rejects.toThrow('Delivery assignment not found');
  });

  it('should reject an assignment that is not ACCEPTED', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.PENDING,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.ASSIGNED,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ASSIGNED,
      },
    });

    await expect(
      service.cancelDelivery(assignmentId),
    ).rejects.toThrow(
      'Only accepted assignments can cancel delivery',
    );
  });

  it('should reject when delivery is already completed', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.DELIVERED,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    await expect(
      service.cancelDelivery(assignmentId),
    ).rejects.toThrow(
      'Delivery cannot be cancelled in its current state',
    );
  });

  it('should reject when delivery is already failed', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.FAILED,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    await expect(
      service.cancelDelivery(assignmentId),
    ).rejects.toThrow(
      'Delivery cannot be cancelled in its current state',
    );
  });

  it('should reject when delivery is already cancelled', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.CANCELLED,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    await expect(
      service.cancelDelivery(assignmentId),
    ).rejects.toThrow(
      'Delivery cannot be cancelled in its current state',
    );
  });

  it('should successfully cancel an accepted delivery', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.CANCELLED,
    });

    txMock.rider.update.mockResolvedValue({
      id: 'rider-123',
      availability: RiderAvailability.OFFLINE,
    });

    txMock.deliveryEvent.create.mockResolvedValue({
      id: 'event-123',
      deliveryId: 'delivery-123',
      type: DeliveryEventType.CANCELLED,
    });

    const result =
      await service.cancelDelivery(assignmentId);

    expect(result).toEqual({
      id: 'delivery-123',
      status: DeliveryStatus.CANCELLED,
    });
  });

  it('should change delivery status to CANCELLED', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.CANCELLED,
    });

    await service.cancelDelivery(assignmentId);

    expect(
      txMock.delivery.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'delivery-123',
      },
      data: {
        status: DeliveryStatus.CANCELLED,
        cancelledAt: expect.any(Date),
        cancellationReason: null,
      },
    });
  });

  it('should release rider availability', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.CANCELLED,
    });

    txMock.rider.update.mockResolvedValue({
      id: 'rider-123',
      availability: RiderAvailability.OFFLINE,
    });

    await service.cancelDelivery(assignmentId);

    expect(
      txMock.rider.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'rider-123',
      },
      data: {
        availability: RiderAvailability.OFFLINE,
      },
    });
  });

  it('should create a CANCELLED delivery event', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.CANCELLED,
    });

    await service.cancelDelivery(assignmentId);

    expect(
      txMock.deliveryEvent.create,
    ).toHaveBeenCalledWith({
      data: {
        deliveryId: 'delivery-123',
        type: DeliveryEventType.CANCELLED,
        metadata: {
          riderId: 'rider-123',
          assignmentId,
          reason: null,
        },
      },
    });
  });

  it('should execute cancellation changes inside a transaction', async () => {
    prismaMock.deliveryAssignment.findUnique.mockResolvedValue({
      id: assignmentId,
      status: DeliveryAssignmentStatus.ACCEPTED,
      deliveryId: 'delivery-123',
      riderId: 'rider-123',
      delivery: {
        id: 'delivery-123',
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
      rider: {
        id: 'rider-123',
        availability: RiderAvailability.ON_DELIVERY,
      },
    });

    txMock.delivery.update.mockResolvedValue({
      id: 'delivery-123',
      status: DeliveryStatus.CANCELLED,
    });

    txMock.rider.update.mockResolvedValue({
      id: 'rider-123',
      availability: RiderAvailability.OFFLINE,
    });

    await service.cancelDelivery(assignmentId);

    expect(
      prismaMock.$transaction,
    ).toHaveBeenCalled();
  });
  });
  

});