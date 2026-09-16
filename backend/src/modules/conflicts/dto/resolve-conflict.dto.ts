import { IsEnum } from 'class-validator';
import { ConflictResolution } from '../conflict-severity.enum.js';

export class ResolveConflictDto {
  @IsEnum([ConflictResolution.ALLOWED, ConflictResolution.TIME_CHANGED, ConflictResolution.ROUTE_CHANGED, ConflictResolution.REJECTED])
  resolution!: Exclude<ConflictResolution, ConflictResolution.UNRESOLVED>;
}
