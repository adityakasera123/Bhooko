import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { jest } from '@jest/globals';

import { DeliveryGateway } from './delivery.gateway';

describe('DeliveryGateway', () => {
  let gateway: DeliveryGateway;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    gateway = new DeliveryGateway(jwtService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should authenticate a socket using handshake auth token', () => {
    jwtService.verify.mockReturnValue({
      sub: 'user-123',
      role: 'CUSTOMER',
    });

    const client = {
      handshake: {
        auth: {
          token: 'valid-token',
        },
        headers: {},
      },
      data: {},
      disconnect: jest.fn(),
    } as unknown as Socket & {
      data: {
        user?: {
          userId: string;
          role: string;
        };
      };
    };

    gateway.handleConnection(client);

    expect(jwtService.verify).toHaveBeenCalledWith(
      'valid-token',
    );

    expect(client.data.user).toEqual({
      userId: 'user-123',
      role: 'CUSTOMER',
    });

    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('should authenticate a socket using Bearer authorization header', () => {
    jwtService.verify.mockReturnValue({
      sub: 'user-456',
      role: 'RIDER',
    });

    const client = {
      handshake: {
        auth: {},
        headers: {
          authorization: 'Bearer valid-token',
        },
      },
      data: {},
      disconnect: jest.fn(),
    } as unknown as Socket & {
      data: {
        user?: {
          userId: string;
          role: string;
        };
      };
    };

    gateway.handleConnection(client);

    expect(jwtService.verify).toHaveBeenCalledWith(
      'valid-token',
    );

    expect(client.data.user).toEqual({
      userId: 'user-456',
      role: 'RIDER',
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
      sub: 'user-123',
    });

    const client = {
      handshake: {
        auth: {
          token: 'invalid-payload-token',
        },
        headers: {},
      },
      data: {},
      disconnect: jest.fn(),
    } as unknown as Socket;

    gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('should handle socket disconnect', () => {
    const client = {
      id: 'test-socket-id',
    } as Socket;

    expect(() => gateway.handleDisconnect(client)).not.toThrow();
  });
});