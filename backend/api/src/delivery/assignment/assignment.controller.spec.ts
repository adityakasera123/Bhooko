import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';

type MockFn = jest.MockedFunction<any>;

describe('AssignmentController', () => {
  let controller: AssignmentController;

  const assignmentServiceMock = {
    assignRider: jest.fn() as MockFn,
    acceptAssignment: jest.fn() as MockFn,
    rejectAssignment: jest.fn() as MockFn,
    arriveAtRestaurant: jest.fn() as MockFn,
    pickupDelivery: jest.fn() as MockFn,
    outForDelivery: jest.fn() as MockFn,
    completeDelivery: jest.fn() as MockFn,
    failDelivery: jest.fn() as MockFn,
    cancelDelivery: jest.fn() as MockFn,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [AssignmentController],
        providers: [
          {
            provide: AssignmentService,
            useValue: assignmentServiceMock,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({
          canActivate: jest.fn().mockReturnValue(true),
        })
        .compile();

    controller =
      module.get<AssignmentController>(
        AssignmentController,
      );
  });

  describe('assignRider', () => {
    it('should assign a rider to a delivery', async () => {
      const deliveryId = 'delivery-1';
      const riderId = 'rider-1';

      const assignment = {
        id: 'assignment-1',
        deliveryId,
        riderId,
        status: 'PENDING',
      };

      assignmentServiceMock.assignRider.mockResolvedValue(
        assignment,
      );

      const result = await controller.assignRider({
        deliveryId,
        riderId,
      });

      expect(result).toEqual(assignment);

      expect(
        assignmentServiceMock.assignRider,
      ).toHaveBeenCalledWith(
        deliveryId,
        riderId,
      );

      expect(
        assignmentServiceMock.assignRider,
      ).toHaveBeenCalledTimes(1);
    });

    it('should pass the DTO values to the service correctly', async () => {
      const dto = {
        deliveryId: 'delivery-123',
        riderId: 'rider-456',
      };

      assignmentServiceMock.assignRider.mockResolvedValue({
        id: 'assignment-1',
        deliveryId: dto.deliveryId,
        riderId: dto.riderId,
        status: 'PENDING',
      });

      await controller.assignRider(dto);

      expect(
        assignmentServiceMock.assignRider,
      ).toHaveBeenCalledWith(
        dto.deliveryId,
        dto.riderId,
      );
    });

    it('should propagate service errors', async () => {
      const error = new Error('Assignment failed');

      assignmentServiceMock.assignRider.mockRejectedValue(
        error,
      );

      await expect(
        controller.assignRider({
          deliveryId: 'delivery-1',
          riderId: 'rider-1',
        }),
      ).rejects.toThrow(error);
    });
  });

  describe('acceptAssignment', () => {
    it('should accept an assignment', async () => {
      const assignmentId = 'assignment-1';

      const result = {
        id: assignmentId,
        status: 'ACCEPTED',
      };

      assignmentServiceMock.acceptAssignment.mockResolvedValue(
        result,
      );

      await expect(
        controller.acceptAssignment(assignmentId),
      ).resolves.toEqual(result);

      expect(
        assignmentServiceMock.acceptAssignment,
      ).toHaveBeenCalledWith(assignmentId);

      expect(
        assignmentServiceMock.acceptAssignment,
      ).toHaveBeenCalledTimes(1);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Acceptance failed');

      assignmentServiceMock.acceptAssignment.mockRejectedValue(
        error,
      );

      await expect(
        controller.acceptAssignment(
          'assignment-1',
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('rejectAssignment', () => {
    it('should reject an assignment', async () => {
      const assignmentId = 'assignment-1';

      const result = {
        id: assignmentId,
        status: 'REJECTED',
      };

      assignmentServiceMock.rejectAssignment.mockResolvedValue(
        result,
      );

      await expect(
        controller.rejectAssignment(assignmentId),
      ).resolves.toEqual(result);

      expect(
        assignmentServiceMock.rejectAssignment,
      ).toHaveBeenCalledWith(assignmentId);

      expect(
        assignmentServiceMock.rejectAssignment,
      ).toHaveBeenCalledTimes(1);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Rejection failed');

      assignmentServiceMock.rejectAssignment.mockRejectedValue(
        error,
      );

      await expect(
        controller.rejectAssignment(
          'assignment-1',
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('arriveAtRestaurant', () => {
    it('should mark rider arrival at restaurant', async () => {
      const assignmentId = 'assignment-1';

      const result = {
        id: 'delivery-1',
        status: 'ARRIVED_AT_RESTAURANT',
      };

      assignmentServiceMock.arriveAtRestaurant.mockResolvedValue(
        result,
      );

      await expect(
        controller.arriveAtRestaurant(
          assignmentId,
        ),
      ).resolves.toEqual(result);

      expect(
        assignmentServiceMock.arriveAtRestaurant,
      ).toHaveBeenCalledWith(assignmentId);

      expect(
        assignmentServiceMock.arriveAtRestaurant,
      ).toHaveBeenCalledTimes(1);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Arrival failed');

      assignmentServiceMock.arriveAtRestaurant.mockRejectedValue(
        error,
      );

      await expect(
        controller.arriveAtRestaurant(
          'assignment-1',
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('pickupDelivery', () => {
    it('should pick up the delivery', async () => {
      const assignmentId = 'assignment-1';

      const result = {
        id: 'delivery-1',
        status: 'PICKED_UP',
      };

      assignmentServiceMock.pickupDelivery.mockResolvedValue(
        result,
      );

      await expect(
        controller.pickupDelivery(
          assignmentId,
        ),
      ).resolves.toEqual(result);

      expect(
        assignmentServiceMock.pickupDelivery,
      ).toHaveBeenCalledWith(assignmentId);

      expect(
        assignmentServiceMock.pickupDelivery,
      ).toHaveBeenCalledTimes(1);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Pickup failed');

      assignmentServiceMock.pickupDelivery.mockRejectedValue(
        error,
      );

      await expect(
        controller.pickupDelivery(
          'assignment-1',
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('outForDelivery', () => {
    it('should mark delivery as out for delivery', async () => {
      const assignmentId = 'assignment-1';

      const result = {
        id: 'delivery-1',
        status: 'OUT_FOR_DELIVERY',
      };

      assignmentServiceMock.outForDelivery.mockResolvedValue(
        result,
      );

      await expect(
        controller.outForDelivery(
          assignmentId,
        ),
      ).resolves.toEqual(result);

      expect(
        assignmentServiceMock.outForDelivery,
      ).toHaveBeenCalledWith(assignmentId);

      expect(
        assignmentServiceMock.outForDelivery,
      ).toHaveBeenCalledTimes(1);
    });

    it('should propagate service errors', async () => {
      const error = new Error(
        'Out-for-delivery failed',
      );

      assignmentServiceMock.outForDelivery.mockRejectedValue(
        error,
      );

      await expect(
        controller.outForDelivery(
          'assignment-1',
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('completeDelivery', () => {
    it('should complete the delivery', async () => {
      const assignmentId = 'assignment-1';

      const result = {
        id: 'delivery-1',
        status: 'DELIVERED',
      };

      assignmentServiceMock.completeDelivery.mockResolvedValue(
        result,
      );

      await expect(
        controller.completeDelivery(
          assignmentId,
        ),
      ).resolves.toEqual(result);

      expect(
        assignmentServiceMock.completeDelivery,
      ).toHaveBeenCalledWith(assignmentId);

      expect(
        assignmentServiceMock.completeDelivery,
      ).toHaveBeenCalledTimes(1);
    });

    it('should propagate service errors', async () => {
      const error = new Error(
        'Completion failed',
      );

      assignmentServiceMock.completeDelivery.mockRejectedValue(
        error,
      );

      await expect(
        controller.completeDelivery(
          'assignment-1',
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('failDelivery', () => {
    it('should fail the delivery with a reason', async () => {
      const assignmentId = 'assignment-1';

      const dto = {
        reason: 'Restaurant was closed',
      };

      const result = {
        id: 'delivery-1',
        status: 'FAILED',
      };

      assignmentServiceMock.failDelivery.mockResolvedValue(
        result,
      );

      await expect(
        controller.failDelivery(
          assignmentId,
          dto,
        ),
      ).resolves.toEqual(result);

      expect(
        assignmentServiceMock.failDelivery,
      ).toHaveBeenCalledWith(
        assignmentId,
        dto.reason,
      );

      expect(
        assignmentServiceMock.failDelivery,
      ).toHaveBeenCalledTimes(1);
    });

    it('should propagate service errors', async () => {
      const error = new Error(
        'Failure update failed',
      );

      assignmentServiceMock.failDelivery.mockRejectedValue(
        error,
      );

      await expect(
        controller.failDelivery(
          'assignment-1',
          {
            reason: 'Test reason',
          },
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('cancelDelivery', () => {
    it('should cancel the delivery with a reason', async () => {
      const assignmentId = 'assignment-1';

      const dto = {
        reason: 'Customer cancelled',
      };

      const result = {
        id: 'delivery-1',
        status: 'CANCELLED',
      };

      assignmentServiceMock.cancelDelivery.mockResolvedValue(
        result,
      );

      await expect(
        controller.cancelDelivery(
          assignmentId,
          dto,
        ),
      ).resolves.toEqual(result);

      expect(
        assignmentServiceMock.cancelDelivery,
      ).toHaveBeenCalledWith(
        assignmentId,
        dto.reason,
      );

      expect(
        assignmentServiceMock.cancelDelivery,
      ).toHaveBeenCalledTimes(1);
    });

    it('should propagate service errors', async () => {
      const error = new Error(
        'Cancellation failed',
      );

      assignmentServiceMock.cancelDelivery.mockRejectedValue(
        error,
      );

      await expect(
        controller.cancelDelivery(
          'assignment-1',
          {
            reason: 'Test reason',
          },
        ),
      ).rejects.toThrow(error);
    });
  });
});