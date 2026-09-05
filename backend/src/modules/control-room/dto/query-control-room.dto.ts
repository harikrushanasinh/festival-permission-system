import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class QueryControlRoomDto {
  @IsOptional() @IsUUID()
  festivalId?: string;

  @IsOptional() @IsUUID()
  eventTypeId?: string;

  @IsOptional() @IsUUID()
  policeStationId?: string;

  @IsOptional() @IsUUID()
  areaId?: string;

  @IsOptional() @IsIn(['NOT_STARTED', 'LIVE', 'GPS_WARNING', 'GPS_LOST', 'COMPLETED'])
  status?: string;

  @IsOptional() @IsIn(['NORMAL', 'WARNING', 'DEVIATION'])
  deviationStatus?: string;
}
