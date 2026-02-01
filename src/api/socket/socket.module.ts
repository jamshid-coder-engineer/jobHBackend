import { Module, Global } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

@Global() // Boshqa modullarda bemalol ishlatish uchun
@Module({
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}