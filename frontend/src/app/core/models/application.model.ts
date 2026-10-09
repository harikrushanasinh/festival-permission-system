import { ApplicationStatus } from '../enums/application-status.enum';

export interface Festival {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface EventType {
  id: string;
  code: string;
  name: string;
}

export interface Application {
  id: string;
  applicationNo?: string | null;
  organizerId: string;
  festivalId: string;
  eventTypeId: string;
  mandalName: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  expectedCrowd: number;
  vehicleCount: number;
  vehicleType?: string | null;
  hasSoundSystem: boolean;
  hasDj: boolean;
  hasDhol: boolean;
  hasGenerator: boolean;
  specialRequirements?: string | null;
  description?: string | null;
  status: ApplicationStatus;
  activeRouteId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationRequest {
  festivalId: string;
  eventTypeId: string;
  mandalName: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  expectedCrowd: number;
  vehicleCount?: number;
  vehicleType?: string;
  hasSoundSystem?: boolean;
  hasDj?: boolean;
  hasDhol?: boolean;
  hasGenerator?: boolean;
  specialRequirements?: string;
  description?: string;
}

export interface ApplicationQuery {
  festivalId?: string;
  eventTypeId?: string;
  status?: ApplicationStatus;
  page?: number;
  pageSize?: number;
  sortBy?: 'eventDate' | 'createdAt';
}
