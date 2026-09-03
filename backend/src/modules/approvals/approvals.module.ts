import { Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service.js';
import { ApprovalsController } from './approvals.controller.js';
import { PermitsModule } from '../permits/permits.module.js';

@Module({
  imports: [PermitsModule],
  providers: [ApprovalsService],
  controllers: [ApprovalsController],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
