import { Logger, UnauthorizedException } from '@nestjs/common';
import {
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage,
  WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { Server, Socket } from 'socket.io';
import { LiveTrackingService } from './live-tracking.service.js';
import { RecordLocationDto } from './dto/record-location.dto.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER];

// Rooms (B18): application:{id}, police-station:{id}, public-live, admin-live.
// Organizer -> Socket.IO -> validate -> Postgres+Redis (LiveTrackingService) ->
// broadcast to the application room, every confirmed station's room, and the
// public/admin aggregate rooms.
//
// @SkipThrottle() - the globally-registered ThrottlerGuard (APP_GUARD, see
// Module 02) assumes an Express request/response and calls res.header(...),
// which doesn't exist on a WS context and crashes every message handler.
// Socket.IO doesn't need HTTP-style rate limiting the same way; per-message
// throttling would need a WS-specific guard, not this one.
@SkipThrottle()
@WebSocketGateway({ cors: { origin: '*' } })
export class LiveTrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(LiveTrackingGateway.name);

  constructor(
    private readonly liveTrackingService: LiveTrackingService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  handleConnection(client: Socket): void {
    // Auth is optional at the transport level - public/anonymous viewers can
    // connect and join public-live, but every privileged room join or write
    // is checked individually below. A bad/expired token just leaves the
    // socket anonymous rather than being disconnected outright, since a
    // public map viewer shouldn't need to hold a valid JWT at all.
    const token = client.handshake.auth?.token as string | undefined;
    if (token) {
      try {
        client.data.user = this.jwtService.verify<JwtPayload>(token, {
          secret: this.config.get<string>('jwt.accessSecret'),
        });
      } catch {
        client.data.user = null;
      }
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: { room: string }): Promise<{ joined: string }> {
    const user = client.data.user as JwtPayload | null;
    const room = payload.room;

    if ((room === 'admin-live' || room.startsWith('police-station:')) && (!user || !STAFF_ROLES.includes(user.role))) {
      throw new UnauthorizedException('Only staff can join this room');
    }

    await client.join(room);
    return { joined: room };
  }

  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { applicationId: string } & RecordLocationDto,
  ) {
    const user = client.data.user as JwtPayload | null;
    if (!user) throw new UnauthorizedException('Authentication required to send location updates');

    const { applicationId, ...dto } = payload;
    const broadcast = await this.liveTrackingService.recordLocation(applicationId, user, dto);

    const stations: { policeStationId: string }[] = await this.dataSource.query(
      `SELECT DISTINCT police_station_id AS "policeStationId" FROM application_police_stations
       WHERE application_id = $1 AND is_confirmed = true`,
      [applicationId],
    );

    this.server.to(`application:${applicationId}`).emit('location:broadcast', broadcast);
    this.server.to('public-live').emit('location:broadcast', broadcast);
    this.server.to('admin-live').emit('location:broadcast', broadcast);
    for (const s of stations) {
      this.server.to(`police-station:${s.policeStationId}`).emit('location:broadcast', broadcast);
    }

    return { success: true };
  }
}
