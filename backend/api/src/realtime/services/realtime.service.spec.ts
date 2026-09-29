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
      event,
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
});
