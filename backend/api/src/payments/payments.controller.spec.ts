import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RazorpayService } from './razorpay.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const paymentsServiceMock: any = {
    createPayment: jest.fn(),
    verifyPayment: jest.fn(),
    requestRefund: jest.fn(),
    handleWebhook: jest.fn(),
  };

  const razorpayServiceMock: any = {
    verifyWebhookSignature: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [PaymentsController],
        providers: [
          {
            provide: PaymentsService,
            useValue: paymentsServiceMock,
          },
          {
            provide: RazorpayService,
            useValue: razorpayServiceMock,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

    controller =
      module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should reject a webhook with an invalid Razorpay signature', async () => {
    const body = {
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_test_123',
            payment_id: 'pay_test_123',
            amount: 9000,
            status: 'processed',
          },
        },
      },
    };

    const request = {
      rawBody: Buffer.from(JSON.stringify(body)),
    };

    razorpayServiceMock.verifyWebhookSignature.mockReturnValue(
      false,
    );

    await expect(
      controller.handleWebhook(
        request as any,
        'invalid-signature',
        body,
      ),
    ).rejects.toThrow(
      'Invalid Razorpay webhook signature',
    );

    expect(
      razorpayServiceMock.verifyWebhookSignature,
    ).toHaveBeenCalledWith(
      request.rawBody,
      'invalid-signature',
    );

    expect(
      paymentsServiceMock.handleWebhook,
    ).not.toHaveBeenCalled();
  });

  it('should forward a valid webhook to PaymentsService', async () => {
    const body = {
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_test_123',
            payment_id: 'pay_test_123',
            amount: 9000,
            status: 'processed',
          },
        },
      },
    };

    const rawBody = Buffer.from(JSON.stringify(body));

    const request = {
      rawBody,
    };

    razorpayServiceMock.verifyWebhookSignature.mockReturnValue(
      true,
    );

    paymentsServiceMock.handleWebhook.mockResolvedValue({
      received: true,
      processed: true,
      event: 'refund.processed',
    });

    const result = await controller.handleWebhook(
      request as any,
      'valid-signature',
      body,
    );

    expect(
      razorpayServiceMock.verifyWebhookSignature,
    ).toHaveBeenCalledWith(
      rawBody,
      'valid-signature',
    );

    expect(
      paymentsServiceMock.handleWebhook,
    ).toHaveBeenCalledWith(body);

    expect(result).toEqual({
      received: true,
      processed: true,
      event: 'refund.processed',
    });
  });

    it('should reject a webhook when raw body is not available', async () => {
    const body = {
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_test_123',
            payment_id: 'pay_test_123',
            amount: 9000,
            status: 'processed',
          },
        },
      },
    };

    const request = {};

    await expect(
      controller.handleWebhook(
        request as any,
        'valid-signature',
        body,
      ),
    ).rejects.toThrow(
      'Webhook raw body is not available',
    );

    expect(
      razorpayServiceMock.verifyWebhookSignature,
    ).not.toHaveBeenCalled();

    expect(
      paymentsServiceMock.handleWebhook,
    ).not.toHaveBeenCalled();
  });
});