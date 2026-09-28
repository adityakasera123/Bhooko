import { jest } from '@jest/globals';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

import { DeliveryGateway } from './delivery.gateway';
import { DeliveryRealtimeAuthService } from './delivery-realtime-auth.service';
import { DeliveryRealtimeService } from './delivery-realtime.service';

describe('DeliveryGateway', () => {
  let gateway: DeliveryGateway;

  let jwtService: {
    verify: jest.Mock;
  };

  let realtimeAuth: {
    canJoinDelivery: jest.MockedFunction<
      (
        deliveryId: string,
        userId: string,
        role: string,
      ) => Promise<boolean>
    >;
  };

  let realtimeService: {
    setServer: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jwtService = {
      verify: jest.fn(),
    };

    realtimeAuth = {
      canJoinDelivery: jest.fn(),
    };

    realtimeService = {
      setServer: jest.fn(),
    };

    gateway = new DeliveryGateway(
      jwtService as unknown as JwtService,
      realtimeAuth as unknown as DeliveryRealtimeAuthService,
      realtimeService as unknown as DeliveryRealtimeService,
    );
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should authenticate a socket using handshake auth token', () => {
    jwtService.verify.mockReturnValue({
      sub: 'user-1',
      role: UserRole.CUSTOMER,
    });

    const client = {
      handshake: {
        auth: {
          token: 'jwt-token',
        },
        headers: {},
      },
      data: {},
      disconnect: jest.fn(),
    } as unknown as Socket;

    gateway.handleConnection(client);

    expect(jwtService.verify).toHaveBeenCalledWith(
      'jwt-token',
    );

    expect(client.data).toEqual({
      user: {
        userId: 'user-1',
        role: UserRole.CUSTOMER,
      },
    });

    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('should authenticate a socket using Bearer authorization header', () => {
    jwtService.verify.mockReturnValue({
      sub: 'user-1',
      role: UserRole.CUSTOMER,
    });

    const client = {
      handshake: {
        auth: {},
        headers: {
          authorization: 'Bearer jwt-token',
        },
      },
      data: {},
      disconnect: jest.fn(),
    } as unknown as Socket;

    gateway.handleConnection(client);

    expect(jwtService.verify).toHaveBeenCalledWith(
      'jwt-token',
    );

    expect(client.data).toEqual({
      user: {
        userId: 'user-1',
        role: UserRole.CUSTOMER,
      },
    });

    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('should disconnect a socket when token is missing', () => {
    const client = {
      handshake: {
        auth: {},
        headers: {},
      },
      data: {},
      disconnect: jest.fn(),
    } as unknown as Socket;

    gateway.handleConnection(client);

    expect(jwtService.verify).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('should disconnect a socket when token is invalid', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const client = {
      handshake: {
        auth: {
          token: 'invalid-token',
        },
        headers: {},
      },
      data: {},
      disconnect: jest.fn(),
    } as unknown as Socket;

    gateway.handleConnection(client);

    expect(jwtService.verify).toHaveBeenCalledWith(
      'invalid-token',
    );

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('should disconnect a socket when JWT payload is incomplete', () => {
    jwtService.verify.mockReturnValue({
      sub: 'user-1',
    });

    const client = {
      handshake: {
        auth: {
          token: 'jwt-token',
        },
        headers: {},
      },
      data: {},
      disconnect: jest.fn(),
    } as unknown as Socket;

    gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('should allow an authorized customer to join a delivery room', async () => {
    realtimeAuth.canJoinDelivery.mockResolvedValue(true);

    const client = {
      data: {
        user: {
          userId: 'customer-1',
          role: UserRole.CUSTOMER,
        },
      },
      join: jest.fn(),
    } as any;

    const result = await gateway.handleJoinDelivery(
      client,
      {
        deliveryId: 'delivery-1',
      },
    );

    expect(
      realtimeAuth.canJoinDelivery,
    ).toHaveBeenCalledWith(
      'delivery-1',
      'customer-1',
      UserRole.CUSTOMER,
    );

    expect(client.join).toHaveBeenCalledWith(
      'delivery:delivery-1',
    );

    expect(result).toEqual({
      event: 'joinDelivery:success',
      data: {
        deliveryId: 'delivery-1',
        room: 'delivery:delivery-1',
      },
    });
  });

  it('should allow an authorized rider to join a delivery room', async () => {
    realtimeAuth.canJoinDelivery.mockResolvedValue(true);

    const client = {
      data: {
        user: {
          userId: 'rider-user-1',
          role: UserRole.DELIVERY_PARTNER,
        },
      },
      join: jest.fn(),
    } as any;

    const result = await gateway.handleJoinDelivery(
      client,
      {
        deliveryId: 'delivery-1',
      },
    );

    expect(
      realtimeAuth.canJoinDelivery,
    ).toHaveBeenCalledWith(
      'delivery-1',
      'rider-user-1',
      UserRole.DELIVERY_PARTNER,
    );

    expect(client.join).toHaveBeenCalledWith(
      'delivery:delivery-1',
    );

    expect(result).toEqual({
      event: 'joinDelivery:success',
      data: {
        deliveryId: 'delivery-1',
        room: 'delivery:delivery-1',
      },
    });
  });

  it('should reject an unauthorized user from joining a delivery room', async () => {
    realtimeAuth.canJoinDelivery.mockResolvedValue(false);

    const client = {
      data: {
        user: {
          userId: 'customer-2',
          role: UserRole.CUSTOMER,
        },
      },
      join: jest.fn(),
    } as any;

    const result = await gateway.handleJoinDelivery(
      client,
      {
        deliveryId: 'delivery-1',
      },
    );

    expect(
      realtimeAuth.canJoinDelivery,
    ).toHaveBeenCalledWith(
      'delivery-1',
      'customer-2',
      UserRole.CUSTOMER,
    );

    expect(client.join).not.toHaveBeenCalled();

    expect(result).toEqual({
      event: 'joinDelivery:error',
      data: {
        message:
          'You are not authorized to join this delivery',
      },
    });
  });

  it('should reject joining when deliveryId is missing', async () => {
    const client = {
      data: {
        user: {
          userId: 'customer-1',
          role: UserRole.CUSTOMER,
        },
      },
      join: jest.fn(),
    } as any;

    const result = await gateway.handleJoinDelivery(
      client,
      {},
    );

    expect(
      realtimeAuth.canJoinDelivery,
    ).not.toHaveBeenCalled();

    expect(client.join).not.toHaveBeenCalled();

    expect(result).toEqual({
      event: 'joinDelivery:error',
      data: {
        message: 'deliveryId is required',
      },
    });
  });

  it('should reject joining when socket is not authenticated', async () => {
    const client = {
      data: {},
      join: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    const result = await gateway.handleJoinDelivery(
      client,
      {
        deliveryId: 'delivery-1',
      },
    );

    expect(
      realtimeAuth.canJoinDelivery,
    ).not.toHaveBeenCalled();

    expect(client.join).not.toHaveBeenCalled();

    expect(client.disconnect).toHaveBeenCalledWith(true);

    expect(result).toEqual({
      event: 'joinDelivery:error',
      data: {
        message: 'Socket is not authenticated',
      },
    });
  });

  it('should handle socket disconnect', () => {
    const client = {
      id: 'socket-1',
    } as unknown as Socket;

    expect(() =>
      gateway.handleDisconnect(client),
    ).not.toThrow();
  });
});
