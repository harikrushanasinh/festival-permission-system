export enum ConflictSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum ConflictResolution {
  UNRESOLVED = 'UNRESOLVED',
  ALLOWED = 'ALLOWED',
  TIME_CHANGED = 'TIME_CHANGED',
  ROUTE_CHANGED = 'ROUTE_CHANGED',
  REJECTED = 'REJECTED',
}
