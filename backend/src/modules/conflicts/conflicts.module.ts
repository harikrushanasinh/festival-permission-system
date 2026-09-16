import { Module } from '@nestjs/common';
import { ConflictsService } from './conflicts.service.js';
import { ConflictsController } from './conflicts.controller.js';

@Module({
  providers: [ConflictsService],
  controllers: [ConflictsController],
})
export class ConflictsModule {}
