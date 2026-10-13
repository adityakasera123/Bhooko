
import { getCorsOrigins } from '../../config/cors.config';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
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
    origin: (origin, callback) => {
      try {
        const allowedOrigins = getCorsOrigins();
        callback(null, !origin || allowedOrigins.includes(origin));
      } catch (error) {
        callback(
          error instanceof Error
            ? error
            : new Error('CORS configuration failed'),
        );
      }
    },
    credentials: true,
  },
})
export class DeliveryGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeAuth: DeliveryRealtimeAuthService,
    private readonly realtimeService: DeliveryRealtimeService,
  ) {}

  afterInit(server: Server) {
    console.log('[DeliveryGateway] initialized: /delivery');
    this.realtimeService.setServer(server);
  }

  handleConnection(client: Socket) {
    console.log(
      '[DeliveryGateway] connection attempt:',
      client.id,
    );

    const token = this.extractToken(client);

    if (!token) {
      console.warn(
        '[DeliveryGateway] connection rejected: missing token',
        client.id,
      );
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        algorithms: ['HS256'],
      });

      if (!payload.sub || !payload.role) {
        console.warn(
          '[DeliveryGateway] connection rejected: invalid JWT payload',
          client.id,
        );
        client.disconnect(true);
        return;
      }

      const authenticatedClient = client as AuthenticatedSocket;

      authenticatedClient.data.user = {
        userId: payload.sub,
        role: payload.role,
      };

      console.log(
        '[DeliveryGateway] authenticated:',
        client.id,
        'role:',
        payload.role,
      );
    } catch {
      console.warn(
        '[DeliveryGateway] connection rejected: JWT verification failed',
        client.id,
      );
      client.disconnect(true);
    }
  }

  @SubscribeMessage('joinDelivery')
  async handleJoinDelivery(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { deliveryId?: string },
  ) {
    console.log(
  '[DeliveryGateway] raw joinDelivery payload:',
  JSON.stringify(payload),
  'type:',
  typeof payload,
);
    const deliveryId = payload?.deliveryId;

    console.log(
      '[DeliveryGateway] joinDelivery received:',
      client.id,
      'deliveryId:',
      deliveryId ?? 'missing',
    );

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
      const allowed = await this.realtimeAuth.canJoinDelivery(
        deliveryId,
        user.userId,
        user.role,
      );

      if (!allowed) {
        console.warn(
          '[DeliveryGateway] delivery room access denied:',
          deliveryId,
          'user:',
          user.userId,
        );

        return {
          event: 'joinDelivery:error',
          data: {
            message: 'You are not authorized to join this delivery',
          },
        };
      }

      const room = `delivery:${deliveryId}`;

      await client.join(room);
      console.log('[DeliveryGateway] sending join success acknowledgement:', {
  deliveryId,
  room,
});

      console.log(
        '[DeliveryGateway] joined room:',
        room,
        'socket:',
        client.id,
      );

      return {
        event: 'joinDelivery:success',
        data: {
          deliveryId,
          room,
        },
      };
    } catch (error) {
      console.error(
        '[DeliveryGateway] failed to join delivery:',
        error instanceof Error ? error.message : 'Unknown error',
      );

      return {
        event: 'joinDelivery:error',
        data: {
          message: 'Unable to join delivery',
        },
      };
    }
  }

  handleDisconnect(client: Socket) {
    console.log(
      '[DeliveryGateway] disconnected:',
      client.id,
      'reason:',
      client.disconnected ? 'disconnected' : 'unknown',
    );
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.length > 0) {
      return this.normalizeToken(authToken);
    }

    const authorization = client.handshake.headers.authorization;

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
