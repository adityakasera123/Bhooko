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

import { DeliveryRealtimeAuthService } from './delivery-realtime-auth.service';
import { DeliveryRealtimeService } from './delivery-realtime.service';

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
  namespace: '/delivery',
  cors: {
    origin: '*',
  },
})
export class DeliveryGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeAuth: DeliveryRealtimeAuthService,
    private readonly realtimeService: DeliveryRealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtimeService.setServer(server);
  }

  handleConnection(client: Socket) {
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

  @SubscribeMessage('joinDelivery')
  async handleJoinDelivery(
    @ConnectedSocket() client: AuthenticatedSocket,
    payload: { deliveryId?: string },
  ) {
    const deliveryId = payload?.deliveryId;

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

    try {
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

      const room = `delivery:${deliveryId}`;

      await client.join(room);

      return {
        event: 'joinDelivery:success',
        data: {
          deliveryId,
          room,
        },
      };
    } catch {
      return {
        event: 'joinDelivery:error',
        data: {
          message: 'Unable to join delivery',
        },
      };
    }
  }

  handleDisconnect(client: Socket) {
    // Socket.IO automatically removes the client
    // from all rooms when it disconnects.
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;

    if (
      typeof authToken === 'string' &&
      authToken.length > 0
    ) {
      return this.normalizeToken(authToken);
    }

    const authorization =
      client.handshake.headers.authorization;

    if (typeof authorization === 'string') {
      return this.normalizeToken(authorization);
    }

    return null;
  }

  private normalizeToken(token: string): string {
    if (token.startsWith('Bearer ')) {
      return token.slice(7);
    }

    return token;
  }
}