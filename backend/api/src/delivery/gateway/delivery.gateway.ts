import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface SocketJwtPayload {
  sub: string;
  role: string;
}

interface AuthenticatedSocket extends Socket {
  data: Socket['data'] & {
    user?: {
      userId: string;
      role: string;
    };
  };
}

@WebSocketGateway({
  namespace: '/delivery',
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
  },
})
export class DeliveryGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly jwtService: JwtService) {}

  handleConnection(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    try {
      const token = this.extractToken(client);

      if (!token) {
        throw new UnauthorizedException(
          'Authentication token is required',
        );
      }

      const payload =
        this.jwtService.verify<SocketJwtPayload>(token);

      if (!payload.sub || !payload.role) {
        throw new UnauthorizedException(
          'Invalid authentication token',
        );
      }

      client.data.user = {
        userId: payload.sub,
        role: payload.role,
      };
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    // Connection cleanup will be added when room subscriptions
    // are introduced.
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const authorizationHeader =
      client.handshake.headers.authorization;

    if (
      typeof authorizationHeader === 'string' &&
      authorizationHeader.startsWith('Bearer ')
    ) {
      return authorizationHeader.slice('Bearer '.length);
    }

    return null;
  }
}