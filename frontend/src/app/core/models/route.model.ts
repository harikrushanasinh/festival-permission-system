export interface LocationPoint {
  address: string;
  placeId?: string;
  lat: number;
  lng: number;
}

export interface CreateRouteVersionRequest {
  start: LocationPoint;
  destination: LocationPoint;
  points?: LocationPoint[];
  changeReason?: string;
}

export interface RoutePoint {
  sequenceNo: number;
  pointType: 'START' | 'WAYPOINT' | 'DESTINATION';
  address: string | null;
  location: { type: 'Point'; coordinates: [number, number] };
}

export type RouteVersionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'SUPERSEDED';

export interface RouteVersion {
  id: string;
  routeId: string;
  versionNumber: number;
  status: RouteVersionStatus;
  startAddress: string;
  destinationAddress: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  changeReason: string | null;
  createdAt: string;
  path: { type: 'LineString'; coordinates: [number, number][] } | null;
  points: RoutePoint[];
}

export interface StationSuggestion {
  stationId: string;
  stationName: string;
  stationCode: string;
  distanceKm: number;
  coveragePercentage: number;
  isResponsible: boolean;
  isConfirmed?: boolean;
}
