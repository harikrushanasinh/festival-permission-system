import { Module } from '@nestjs/common';
import { PermitsService } from './permits.service.js';
import { PermitsController } from './permits.controller.js';

@Module({
  providers: [PermitsService],
  controllers: [PermitsController],
  exports: [PermitsService],
})
export class PermitsModule {}
