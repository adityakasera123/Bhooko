import { Module } from '@nestjs/common';

import { RealtimeGateway } from './gateway/realtime.gateway';
import { RealtimeAuthService } from './gateway/realtime-auth.service';
import { RealtimeService } from './services/realtime.service';
import { RoomService } from './rooms/room.service';

@Module({
  providers: [
    RealtimeGateway,
    RealtimeAuthService,
    RealtimeService,
    RoomService,
  ],
  exports: [
    RealtimeGateway,
    RealtimeAuthService,
    RealtimeService,
    RoomService,
  ],
})
export class RealtimeModule {}