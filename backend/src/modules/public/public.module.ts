import { Module } from '@nestjs/common';
import { PublicService } from './public.service.js';
import { PublicController } from './public.controller.js';

@Module({
  providers: [PublicService],
  controllers: [PublicController],
})
export class PublicModule {}
