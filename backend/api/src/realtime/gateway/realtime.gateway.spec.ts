import { jest } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { Socket } from 'socket.io';

import { RealtimeGateway } from './realtime.gateway';
import { RealtimeAuthService } from './realtime-auth.service';
import { RealtimeService } from '../services/realtime.service';
import { RoomService } from '../rooms/room.service';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;

  let jwtService: {
    verify: jest.Mock;
  };

    let realtimeAuth: {
    canJoinOrder: jest.MockedFunction<
      (
        orderId: string,
        userId: string,
        role: string,
      ) => Promise<boolean>
    >;

    canJoinDelivery: jest.MockedFunction<
      (
        deliveryId: string,
        userId: string,
        role: string,
      ) => Promise<boolean>
    >;

    canJoinRestaurant: jest.MockedFunction<
      (
        restaurantId: string,
        userId: string,
        role: string,
      ) => Promise<boolean>
    >;

    canJoinRider: jest.MockedFunction<
      (
        riderId: string,
        userId: string,
        role: string,
      ) => Promise<boolean>
    >;

    canJoinCustomer: jest.MockedFunction<
      (
        customerId: string,
        userId: string,
        role: string,
      ) => Promise<boolean>
    >;
  };

  let realtimeService: {
    setServer: jest.Mock;
  };

  let roomService: {
    order: jest.Mock;
    delivery: jest.Mock;
    restaurant: jest.Mock;
    rider: jest.Mock;
    customer: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jwtService = {
      verify: jest.fn(),
    };

       realtimeAuth = {
      canJoinOrder: jest.fn<
        (
          orderId: string,
          userId: string,
          role: string,
        ) => Promise<boolean>
      >(),

      canJoinDelivery: jest.fn<
        (
          deliveryId: string,
          userId: string,
          role: string,
        ) => Promise<boolean>
      >(),

      canJoinRestaurant: jest.fn<
        (
          restaurantId: string,
          userId: string,
          role: string,
        ) => Promise<boolean>
      >(),

      canJoinRider: jest.fn<
        (
          riderId: string,
          userId: string,
          role: string,
        ) => Promise<boolean>
      >(),

      canJoinCustomer: jest.fn<
        (
          customerId: string,
          userId: string,
          role: string,
        ) => Promise<boolean>
      >(),
    };

    realtimeService = {
      setServer: jest.fn(),
    };

    roomService = {
      order: jest.fn(),
      delivery: jest.fn(),
      restaurant: jest.fn(),
      rider: jest.fn(),
      customer: jest.fn(),
    };

    gateway = new RealtimeGateway(
      jwtService as unknown as JwtService,
      realtimeAuth as unknown as RealtimeAuthService,
      realtimeService as unknown as RealtimeService,
      roomService as unknown as RoomService,
    );
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('afterInit', () => {
    it('should provide the Socket.IO server to RealtimeService', () => {
      const server = {} as any;

      gateway.afterInit(server);

      expect(
        realtimeService.setServer,
      ).toHaveBeenCalledWith(server);
    });
  });

  describe('handleConnection', () => {
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

      expect(
        client.disconnect,
      ).not.toHaveBeenCalled();
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

      expect(
        client.disconnect,
      ).not.toHaveBeenCalled();
    });

    it('should disconnect when token is missing', () => {
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
      expect(
        client.disconnect,
      ).toHaveBeenCalledWith(true);
    });

    it('should disconnect when token is invalid', () => {
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

      expect(
        client.disconnect,
      ).toHaveBeenCalledWith(true);
    });

    it('should disconnect when JWT payload is incomplete', () => {
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

      expect(
        client.disconnect,
      ).toHaveBeenCalledWith(true);
    });

    it('should remove Bearer prefix from handshake auth token', () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        role: UserRole.CUSTOMER,
      });

      const client = {
        handshake: {
          auth: {
            token: 'Bearer jwt-token',
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
    });
  });

  describe('joinOrder', () => {
    it('should allow an authorized user to join an order room', async () => {
      realtimeAuth.canJoinOrder.mockResolvedValue(true);
      roomService.order.mockReturnValue(
        'order:order-1',
      );

      const client = {
        data: {
          user: {
            userId: 'customer-1',
            role: UserRole.CUSTOMER,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinOrder(
          client,
          {
            orderId: 'order-1',
          },
        );

      expect(
        realtimeAuth.canJoinOrder,
      ).toHaveBeenCalledWith(
        'order-1',
        'customer-1',
        UserRole.CUSTOMER,
      );

      expect(roomService.order).toHaveBeenCalledWith(
        'order-1',
      );

      expect(client.join).toHaveBeenCalledWith(
        'order:order-1',
      );

      expect(result).toEqual({
        event: 'joinOrder:success',
        data: {
          orderId: 'order-1',
          room: 'order:order-1',
        },
      });
    });

    it('should reject an unauthorized user', async () => {
      realtimeAuth.canJoinOrder.mockResolvedValue(
        false,
      );

      const client = {
        data: {
          user: {
            userId: 'customer-2',
            role: UserRole.CUSTOMER,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinOrder(
          client,
          {
            orderId: 'order-1',
          },
        );

      expect(client.join).not.toHaveBeenCalled();

      expect(result).toEqual({
        event: 'joinOrder:error',
        data: {
          message:
            'You are not authorized to join this order',
        },
      });
    });

    it('should reject when orderId is missing', async () => {
      const client = {
        data: {
          user: {
            userId: 'customer-1',
            role: UserRole.CUSTOMER,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinOrder(
          client,
          {},
        );

      expect(
        realtimeAuth.canJoinOrder,
      ).not.toHaveBeenCalled();

      expect(client.join).not.toHaveBeenCalled();

      expect(result).toEqual({
        event: 'joinOrder:error',
        data: {
          message: 'orderId is required',
        },
      });
    });

    it('should disconnect an unauthenticated socket', async () => {
      const client = {
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinOrder(
          client,
          {
            orderId: 'order-1',
          },
        );

      expect(
        client.disconnect,
      ).toHaveBeenCalledWith(true);

      expect(result).toEqual({
        event: 'joinOrder:error',
        data: {
          message: 'Socket is not authenticated',
        },
      });
    });
  });

  describe('joinDelivery', () => {
    it('should allow an authorized user to join a delivery room', async () => {
      realtimeAuth.canJoinDelivery.mockResolvedValue(
        true,
      );

      roomService.delivery.mockReturnValue(
        'delivery:delivery-1',
      );

      const client = {
        data: {
          user: {
            userId: 'customer-1',
            role: UserRole.CUSTOMER,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinDelivery(
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

      expect(
        roomService.delivery,
      ).toHaveBeenCalledWith(
        'delivery-1',
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

    it('should reject an unauthorized user', async () => {
      realtimeAuth.canJoinDelivery.mockResolvedValue(
        false,
      );

      const client = {
        data: {
          user: {
            userId: 'customer-2',
            role: UserRole.CUSTOMER,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinDelivery(
          client,
          {
            deliveryId: 'delivery-1',
          },
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

    it('should reject when deliveryId is missing', async () => {
      const client = {
        data: {
          user: {
            userId: 'customer-1',
            role: UserRole.CUSTOMER,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinDelivery(
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
  });

  describe('joinRestaurant', () => {
    it('should allow an authorized restaurant user to join', async () => {
      realtimeAuth.canJoinRestaurant.mockResolvedValue(
        true,
      );

      roomService.restaurant.mockReturnValue(
        'restaurant:restaurant-1',
      );

      const client = {
        data: {
          user: {
            userId: 'restaurant-owner-1',
            role: UserRole.RESTAURANT,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinRestaurant(
          client,
          {
            restaurantId: 'restaurant-1',
          },
        );

      expect(
        realtimeAuth.canJoinRestaurant,
      ).toHaveBeenCalledWith(
        'restaurant-1',
        'restaurant-owner-1',
        UserRole.RESTAURANT,
      );

      expect(
        roomService.restaurant,
      ).toHaveBeenCalledWith(
        'restaurant-1',
      );

      expect(client.join).toHaveBeenCalledWith(
        'restaurant:restaurant-1',
      );

      expect(result).toEqual({
        event: 'joinRestaurant:success',
        data: {
          restaurantId: 'restaurant-1',
          room: 'restaurant:restaurant-1',
        },
      });
    });

    it('should reject an unauthorized restaurant user', async () => {
      realtimeAuth.canJoinRestaurant.mockResolvedValue(
        false,
      );

      const client = {
        data: {
          user: {
            userId: 'restaurant-owner-2',
            role: UserRole.RESTAURANT,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinRestaurant(
          client,
          {
            restaurantId: 'restaurant-1',
          },
        );

      expect(client.join).not.toHaveBeenCalled();

      expect(result).toEqual({
        event: 'joinRestaurant:error',
        data: {
          message:
            'You are not authorized to join this restaurant',
        },
      });
    });

    it('should reject when restaurantId is missing', async () => {
      const client = {
        data: {
          user: {
            userId: 'restaurant-owner-1',
            role: UserRole.RESTAURANT,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinRestaurant(
          client,
          {},
        );

      expect(
        realtimeAuth.canJoinRestaurant,
      ).not.toHaveBeenCalled();

      expect(client.join).not.toHaveBeenCalled();

      expect(result).toEqual({
        event: 'joinRestaurant:error',
        data: {
          message: 'restaurantId is required',
        },
      });
    });
  });

  describe('joinRider', () => {
    it('should allow the assigned rider user to join', async () => {
      realtimeAuth.canJoinRider.mockResolvedValue(
        true,
      );

      roomService.rider.mockReturnValue(
        'rider:rider-1',
      );

      const client = {
        data: {
          user: {
            userId: 'rider-user-1',
            role: UserRole.DELIVERY_PARTNER,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinRider(
          client,
          {
            riderId: 'rider-1',
          },
        );

      expect(
        realtimeAuth.canJoinRider,
      ).toHaveBeenCalledWith(
        'rider-1',
        'rider-user-1',
        UserRole.DELIVERY_PARTNER,
      );

      expect(roomService.rider).toHaveBeenCalledWith(
        'rider-1',
      );

      expect(client.join).toHaveBeenCalledWith(
        'rider:rider-1',
      );

      expect(result).toEqual({
        event: 'joinRider:success',
        data: {
          riderId: 'rider-1',
          room: 'rider:rider-1',
        },
      });
    });

    it('should reject an unauthorized rider', async () => {
      realtimeAuth.canJoinRider.mockResolvedValue(
        false,
      );

      const client = {
        data: {
          user: {
            userId: 'rider-user-2',
            role: UserRole.DELIVERY_PARTNER,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinRider(
          client,
          {
            riderId: 'rider-1',
          },
        );

      expect(client.join).not.toHaveBeenCalled();

      expect(result).toEqual({
        event: 'joinRider:error',
        data: {
          message:
            'You are not authorized to join this rider room',
        },
      });
    });

    it('should reject when riderId is missing', async () => {
      const client = {
        data: {
          user: {
            userId: 'rider-user-1',
            role: UserRole.DELIVERY_PARTNER,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinRider(
          client,
          {},
        );

      expect(
        realtimeAuth.canJoinRider,
      ).not.toHaveBeenCalled();

      expect(client.join).not.toHaveBeenCalled();

      expect(result).toEqual({
        event: 'joinRider:error',
        data: {
          message: 'riderId is required',
        },
      });
    });
  });

  describe('joinCustomer', () => {
    it('should allow a customer to join their own room', async () => {
      realtimeAuth.canJoinCustomer.mockResolvedValue(
        true,
      );

      roomService.customer.mockReturnValue(
        'customer:customer-1',
      );

      const client = {
        data: {
          user: {
            userId: 'customer-1',
            role: UserRole.CUSTOMER,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinCustomer(
          client,
          {
            customerId: 'customer-1',
          },
        );

      expect(
        realtimeAuth.canJoinCustomer,
      ).toHaveBeenCalledWith(
        'customer-1',
        'customer-1',
        UserRole.CUSTOMER,
      );

      expect(
        roomService.customer,
      ).toHaveBeenCalledWith(
        'customer-1',
      );

      expect(client.join).toHaveBeenCalledWith(
        'customer:customer-1',
      );

      expect(result).toEqual({
        event: 'joinCustomer:success',
        data: {
          customerId: 'customer-1',
          room: 'customer:customer-1',
        },
      });
    });

    it('should reject another customer', async () => {
      realtimeAuth.canJoinCustomer.mockResolvedValue(
        false,
      );

      const client = {
        data: {
          user: {
            userId: 'customer-2',
            role: UserRole.CUSTOMER,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinCustomer(
          client,
          {
            customerId: 'customer-1',
          },
        );

      expect(client.join).not.toHaveBeenCalled();

      expect(result).toEqual({
        event: 'joinCustomer:error',
        data: {
          message:
            'You are not authorized to join this customer room',
        },
      });
    });

    it('should reject when customerId is missing', async () => {
      const client = {
        data: {
          user: {
            userId: 'customer-1',
            role: UserRole.CUSTOMER,
          },
        },
        join: jest.fn(),
      } as any;

      const result =
        await gateway.handleJoinCustomer(
          client,
          {},
        );

      expect(
        realtimeAuth.canJoinCustomer,
      ).not.toHaveBeenCalled();

      expect(client.join).not.toHaveBeenCalled();

      expect(result).toEqual({
        event: 'joinCustomer:error',
        data: {
          message: 'customerId is required',
        },
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should safely handle socket disconnect', () => {
      const client = {
        id: 'socket-1',
      } as unknown as Socket;

      expect(() =>
        gateway.handleDisconnect(client),
      ).not.toThrow();
    });
  });
});