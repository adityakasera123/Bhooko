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
};

type TransactionMock = MockFn;

describe('AssignmentService', () => {
  let service: AssignmentService;

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

});