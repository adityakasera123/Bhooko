import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

import { RealtimeAuthService } from './realtime-auth.service';
import { RealtimeService } from '../services/realtime.service';
import { RoomService } from '../rooms/room.service';

interface JwtPayload {
  sub: string;
  role: string;
}

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      userId: string;
      role: string;
    };
  };
}

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeAuth: RealtimeAuthService,
    private readonly realtimeService: RealtimeService,
    private readonly roomService: RoomService,
  ) {}

  afterInit(server: Server): void {
    this.realtimeService.setServer(server);
  }

  handleConnection(client: Socket): void {
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload =
        this.jwtService.verify<JwtPayload>(token);

      if (!payload.sub || !payload.role) {
        client.disconnect(true);
        return;
      }

      const authenticatedClient =
        client as AuthenticatedSocket;

      authenticatedClient.data.user = {
        userId: payload.sub,
        role: payload.role,
      };
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('joinOrder')
  async handleJoinOrder(
    @ConnectedSocket()
    client: AuthenticatedSocket,
    payload: { orderId?: string },
  ) {
    const orderId = payload?.orderId;

    if (!orderId) {
      return {
        event: 'joinOrder:error',
        data: {
          message: 'orderId is required',
        },
      };
    }

    const user = client.data.user;

    if (!user) {
      client.disconnect(true);

      return {
        event: 'joinOrder:error',
        data: {
          message: 'Socket is not authenticated',
        },
      };
    }

    const allowed =
      await this.realtimeAuth.canJoinOrder(
        orderId,
        user.userId,
        user.role,
      );

    if (!allowed) {
      return {
        event: 'joinOrder:error',
        data: {
          message:
            'You are not authorized to join this order',
        },
      };
    }

    const room =
      this.roomService.order(orderId);

    await client.join(room);

    return {
      event: 'joinOrder:success',
      data: {
        orderId,
        room,
      },
    };
  }

  @SubscribeMessage('joinDelivery')
  async handleJoinDelivery(
    @ConnectedSocket()
    client: AuthenticatedSocket,
    payload: { deliveryId?: string },
  ) {
    const deliveryId =
      payload?.deliveryId;

    if (!deliveryId) {
      return {
        event: 'joinDelivery:error',
        data: {
          message: 'deliveryId is required',
        },
      };
    }

    const user = client.data.user;

    if (!user) {
      client.disconnect(true);

      return {
        event: 'joinDelivery:error',
        data: {
          message: 'Socket is not authenticated',
        },
      };
    }

    const allowed =
      await this.realtimeAuth.canJoinDelivery(
        deliveryId,
        user.userId,
        user.role,
      );

    if (!allowed) {
      return {
        event: 'joinDelivery:error',
        data: {
          message:
            'You are not authorized to join this delivery',
        },
      };
    }

    const room =
      this.roomService.delivery(
        deliveryId,
      );

    await client.join(room);

    return {
      event: 'joinDelivery:success',
      data: {
        deliveryId,
        room,
      },
    };
  }

  @SubscribeMessage('joinRestaurant')
  async handleJoinRestaurant(
    @ConnectedSocket()
    client: AuthenticatedSocket,
    payload: { restaurantId?: string },
  ) {
    const restaurantId =
      payload?.restaurantId;

    if (!restaurantId) {
      return {
        event: 'joinRestaurant:error',
        data: {
          message: 'restaurantId is required',
        },
      };
    }

    const user = client.data.user;

    if (!user) {
      client.disconnect(true);

      return {
        event: 'joinRestaurant:error',
        data: {
          message: 'Socket is not authenticated',
        },
      };
    }

    const allowed =
      await this.realtimeAuth.canJoinRestaurant(
        restaurantId,
        user.userId,
        user.role,
      );

    if (!allowed) {
      return {
        event: 'joinRestaurant:error',
        data: {
          message:
            'You are not authorized to join this restaurant',
        },
      };
    }

    const room =
      this.roomService.restaurant(
        restaurantId,
      );

    await client.join(room);

    return {
      event: 'joinRestaurant:success',
      data: {
        restaurantId,
        room,
      },
    };
  }

  @SubscribeMessage('joinRider')
  async handleJoinRider(
    @ConnectedSocket()
    client: AuthenticatedSocket,
    payload: { riderId?: string },
  ) {
    const riderId = payload?.riderId;

    if (!riderId) {
      return {
        event: 'joinRider:error',
        data: {
          message: 'riderId is required',
        },
      };
    }

    const user = client.data.user;

    if (!user) {
      client.disconnect(true);

      return {
        event: 'joinRider:error',
        data: {
          message: 'Socket is not authenticated',
        },
      };
    }

    const allowed =
      await this.realtimeAuth.canJoinRider(
        riderId,
        user.userId,
        user.role,
      );

    if (!allowed) {
      return {
        event: 'joinRider:error',
        data: {
          message:
            'You are not authorized to join this rider room',
        },
      };
    }

    const room =
      this.roomService.rider(riderId);

    await client.join(room);

    return {
      event: 'joinRider:success',
      data: {
        riderId,
        room,
      },
    };
  }

  @SubscribeMessage('joinCustomer')
  async handleJoinCustomer(
    @ConnectedSocket()
    client: AuthenticatedSocket,
    payload: { customerId?: string },
  ) {
    const customerId =
      payload?.customerId;

    if (!customerId) {
      return {
        event: 'joinCustomer:error',
        data: {
          message: 'customerId is required',
        },
      };
    }

    const user = client.data.user;

    if (!user) {
      client.disconnect(true);

      return {
        event: 'joinCustomer:error',
        data: {
          message: 'Socket is not authenticated',
        },
      };
    }

    const allowed =
      await this.realtimeAuth.canJoinCustomer(
        customerId,
        user.userId,
        user.role,
      );

    if (!allowed) {
      return {
        event: 'joinCustomer:error',
        data: {
          message:
            'You are not authorized to join this customer room',
        },
      };
    }

    const room =
      this.roomService.customer(
        customerId,
      );

    await client.join(room);

    return {
      event: 'joinCustomer:success',
      data: {
        customerId,
        room,
      },
    };
  }

  handleDisconnect(client: Socket): void {
    // Socket.IO automatically removes
    // disconnected clients from their rooms.
  }

  private extractToken(
    client: Socket,
  ): string | null {
    const authToken =
      client.handshake.auth?.token;

    if (
      typeof authToken === 'string' &&
      authToken.length > 0
    ) {
      return this.normalizeToken(authToken);
    }

    const authorization =
      client.handshake.headers.authorization;

    if (typeof authorization === 'string') {
      return this.normalizeToken(
        authorization,
      );
    }

    return null;
  }

  private normalizeToken(
    token: string,
  ): string {
    if (token.startsWith('Bearer ')) {
      return token.slice(7);
    }

    return token;
  }
}