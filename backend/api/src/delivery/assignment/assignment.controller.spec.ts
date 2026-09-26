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

      expect(
        assignmentServiceMock.assignRider,
      ).toHaveBeenCalledWith(
        'delivery-1',
        'rider-1',
      );
    });
  });
});