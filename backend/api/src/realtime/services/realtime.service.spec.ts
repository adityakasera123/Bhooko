import { jest } from '@jest/globals';
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  let service: RealtimeService;

  beforeEach(() => {
    service = new RealtimeService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should safely ignore emits when server is not configured', () => {
    expect(() =>
      service.emitToDelivery('delivery-1', {
        event: 'delivery:test',
        timestamp: '2026-01-01T00:00:00.000Z',
      }),
    ).not.toThrow();
  });

  it('should emit to a delivery room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({
      emit,
    });

    service.setServer({
      to,
    } as any);

    const event = {
      event: 'delivery:test',
      timestamp: '2026-01-01T00:00:00.000Z',
    };

    service.emitToDelivery('delivery-1', event);

    expect(to).toHaveBeenCalledWith(
      'delivery:delivery-1',
    );
    expect(emit).toHaveBeenCalledWith(
  'delivery:test',
  {
    ...event,
    deliveryId: 'delivery-1',
  },
);
  });

  it('should emit to an order room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({
      emit,
    });

    service.setServer({
      to,
    } as any);

    const event = {
      event: 'order:accepted',
      timestamp: '2026-01-01T00:00:00.000Z',
    };

    service.emitToOrder('order-1', event);

    expect(to).toHaveBeenCalledWith(
      'order:order-1',
    );
    expect(emit).toHaveBeenCalledWith(
      'order:accepted',
      event,
    );
  });

  it('should emit to a restaurant room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({
      emit,
    });

    service.setServer({
      to,
    } as any);

    const event = {
      event: 'restaurant:test',
      timestamp: '2026-01-01T00:00:00.000Z',
    };

    service.emitToRestaurant(
      'restaurant-1',
      event,
    );

    expect(to).toHaveBeenCalledWith(
      'restaurant:restaurant-1',
    );
    expect(emit).toHaveBeenCalledWith(
      'restaurant:test',
      event,
    );
  });

  it('should emit to a rider room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({
      emit,
    });

    service.setServer({
      to,
    } as any);

    const event = {
      event: 'rider:test',
      timestamp: '2026-01-01T00:00:00.000Z',
    };

    service.emitToRider('rider-1', event);

    expect(to).toHaveBeenCalledWith(
      'rider:rider-1',
    );
    expect(emit).toHaveBeenCalledWith(
      'rider:test',
      event,
    );
  });

  it('should emit to a customer room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({
      emit,
    });

    service.setServer({
      to,
    } as any);

    const event = {
      event: 'customer:test',
      timestamp: '2026-01-01T00:00:00.000Z',
    };

    service.emitToCustomer('customer-1', event);

    expect(to).toHaveBeenCalledWith(
      'customer:customer-1',
    );
    expect(emit).toHaveBeenCalledWith(
      'customer:test',
      event,
    );
  });

  it('should create a realtime event', () => {
    const event = service.createEvent(
      'order:ready',
      {
        status: 'READY',
        data: {
          orderId: 'order-1',
        },
      },
    );

    expect(event.event).toBe('order:ready');
    expect(event.status).toBe('READY');
    expect(event.data).toEqual({
      orderId: 'order-1',
    });
    expect(event.timestamp).toEqual(
      expect.any(String),
    );
  });

  it('should emit an order status changed event', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({
      emit,
    });

    service.setServer({
      to,
    } as any);

    service.emitOrderStatusChanged(
      'order-1',
      'CONFIRMED',
      {
        source: 'order-service',
      },
    );

    expect(to).toHaveBeenCalledWith(
      'order:order-1',
    );

    expect(emit).toHaveBeenCalledWith(
      'order:statusChanged',
      expect.objectContaining({
        event: 'order:statusChanged',
        status: 'CONFIRMED',
        data: {
          source: 'order-service',
        },
        timestamp: expect.any(String),
      }),
    );
  });

  it('should emit an order updated event', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({
      emit,
    });

    service.setServer({
      to,
    } as any);

    service.emitOrderUpdated(
      'order-1',
      {
        itemCount: 3,
      },
    );

    expect(to).toHaveBeenCalledWith(
      'order:order-1',
    );

    expect(emit).toHaveBeenCalledWith(
      'order:updated',
      expect.objectContaining({
        event: 'order:updated',
        data: {
          itemCount: 3,
        },
        timestamp: expect.any(String),
      }),
    );
  });

  it('should emit a delivery status changed event', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({
      emit,
    });

    service.setServer({
      to,
    } as any);

    service.emitDeliveryStatusChanged(
      'delivery-1',
      'OUT_FOR_DELIVERY',
      {
        riderId: 'rider-1',
      },
    );

    expect(to).toHaveBeenCalledWith(
      'delivery:delivery-1',
    );

    expect(emit).toHaveBeenCalledWith(
      'delivery:statusChanged',
      expect.objectContaining({
        event: 'delivery:statusChanged',
        status: 'OUT_FOR_DELIVERY',
        data: {
          riderId: 'rider-1',
        },
        timestamp: expect.any(String),
      }),
    );
  });

  it('should emit a delivery updated event', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({
      emit,
    });

    service.setServer({
      to,
    } as any);

    service.emitDeliveryUpdated(
      'delivery-1',
      {
        eta: '20 minutes',
      },
    );

    expect(to).toHaveBeenCalledWith(
      'delivery:delivery-1',
    );

    expect(emit).toHaveBeenCalledWith(
      'delivery:updated',
      expect.objectContaining({
        event: 'delivery:updated',
        data: {
          eta: '20 minutes',
        },
        timestamp: expect.any(String),
      }),
    );
  });

  it('should emit a restaurant order received event', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({
      emit,
    });

    service.setServer({
      to,
    } as any);

    service.emitRestaurantOrderReceived(
      'restaurant-1',
      {
        orderId: 'order-1',
      },
    );

    expect(to).toHaveBeenCalledWith(
      'restaurant:restaurant-1',
    );

    expect(emit).toHaveBeenCalledWith(
      'restaurant:orderReceived',
      expect.objectContaining({
        event: 'restaurant:orderReceived',
        data: {
          orderId: 'order-1',
        },
        timestamp: expect.any(String),
      }),
    );
  });

  it('should emit a restaurant order updated event', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({
      emit,
    });

    service.setServer({
      to,
    } as any);

    service.emitRestaurantOrderUpdated(
      'restaurant-1',
      {
        orderId: 'order-1',
        status: 'PREPARING',
      },
    );

    expect(to).toHaveBeenCalledWith(
      'restaurant:restaurant-1',
    );

    expect(emit).toHaveBeenCalledWith(
      'restaurant:orderUpdated',
      expect.objectContaining({
        event: 'restaurant:orderUpdated',
        data: {
          orderId: 'order-1',
          status: 'PREPARING',
        },
        timestamp: expect.any(String),
      }),
    );
  });

  it('should emit a rider delivery assigned event', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({
      emit,
    });

    service.setServer({
      to,
    } as any);

    service.emitRiderDeliveryAssigned(
      'rider-1',
      {
        deliveryId: 'delivery-1',
      },
    );

    expect(to).toHaveBeenCalledWith(
      'rider:rider-1',
    );

    expect(emit).toHaveBeenCalledWith(
      'rider:deliveryAssigned',
      expect.objectContaining({
        event: 'rider:deliveryAssigned',
        data: {
          deliveryId: 'delivery-1',
        },
        timestamp: expect.any(String),
      }),
    );
  });

  it('should emit a customer order updated event', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({
      emit,
    });

    service.setServer({
      to,
    } as any);

    service.emitCustomerOrderUpdated(
      'customer-1',
      {
        orderId: 'order-1',
        status: 'READY',
      },
    );

    expect(to).toHaveBeenCalledWith(
      'customer:customer-1',
    );

    expect(emit).toHaveBeenCalledWith(
      'customer:orderUpdated',
      expect.objectContaining({
        event: 'customer:orderUpdated',
        data: {
          orderId: 'order-1',
          status: 'READY',
        },
        timestamp: expect.any(String),
      }),
    );
  });
});
