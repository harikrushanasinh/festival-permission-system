import { PartialType } from '@nestjs/mapped-types';
import { CreatePoliceStationDto } from './create-police-station.dto.js';

export class UpdatePoliceStationDto extends PartialType(CreatePoliceStationDto) {}
