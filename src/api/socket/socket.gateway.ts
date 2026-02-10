import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: { origin: '*' } })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly jwtService: JwtService) {}

  private normalizeToken(raw?: string): string | null {
    if (!raw) return null;

    if (raw.startsWith('Bearer ')) return raw.slice(7).trim();

    const t = raw.trim();
    if (
      (t.startsWith('"') && t.endsWith('"')) ||
      (t.startsWith("'") && t.endsWith("'"))
    ) {
      return t.slice(1, -1);
    }

    return t;
  }

  async handleConnection(client: Socket) {
    try {
      const rawToken = client.handshake.auth?.token;

      const token = this.normalizeToken(rawToken as any);


      if (!token) {
        return client.disconnect(true);
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.id;

      await client.join(`user_${userId}`);


      client.emit('connection_success', {
        message: 'Siz shaxsiy xonaga ulandingiz!',
        userId,
      });
    } catch (e: any) {
      console.error('Socket ulanishda xato ❌:', e?.message);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected 🔌 socketId:', client.id);
  }

  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }
}
