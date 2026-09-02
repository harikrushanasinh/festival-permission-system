import { PartialType } from '@nestjs/mapped-types';
import { CreateFestivalDto } from './create-festival.dto.js';

export class UpdateFestivalDto extends PartialType(CreateFestivalDto) {}
