import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { PublicService } from './public.service.js';
import { QueryPublicProcessionsDto } from './dto/query-public-processions.dto.js';

// No JwtAuthGuard anywhere in this controller - this is the entire point of
// the public portal (F23/F24): no login required.
@Controller('public/processions')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get()
  list(@Query() query: QueryPublicProcessionsDto) {
    return this.publicService.listProcessions(query);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicService.getProcession(id);
  }
}
