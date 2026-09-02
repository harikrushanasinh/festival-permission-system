import { PartialType } from '@nestjs/mapped-types';
import { CreateApplicationDto } from './create-application.dto.js';

export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {}
