export type ApprovalDecision = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface ApprovalRow {
  id: string;
  policeStationId: string;
  policeStationName: string;
  policeStationCode: string;
  decision: ApprovalDecision;
  reason: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
}

export type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type ConflictResolution = 'UNRESOLVED' | 'ALLOWED' | 'TIME_CHANGED' | 'ROUTE_CHANGED' | 'REJECTED';

export interface RouteConflict {
  id: string;
  overlapMeters: number;
  severity: ConflictSeverity;
  resolution: ConflictResolution;
  resolvedAt: string | null;
  detectedAt: string;
  conflictingApplicationId: string;
  conflictingApplicationNo: string | null;
  conflictingMandalName: string;
  conflictingEventDate: string;
  conflictingStartTime: string;
  conflictingEndTime: string;
  conflictingFestivalName: string;
}
