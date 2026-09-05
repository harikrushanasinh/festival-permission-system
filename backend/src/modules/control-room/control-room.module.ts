import { Module } from '@nestjs/common';
import { ControlRoomService } from './control-room.service.js';
import { ControlRoomController } from './control-room.controller.js';

@Module({
  providers: [ControlRoomService],
  controllers: [ControlRoomController],
})
export class ControlRoomModule {}
