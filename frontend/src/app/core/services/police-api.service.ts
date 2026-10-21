import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApprovalDecision, ApprovalRow, ConflictResolution, RouteConflict } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class PoliceApiService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listApprovals(applicationId: string): Observable<ApprovalRow[]> {
    return this.http.get<ApprovalRow[]>(`${this.api}/applications/${applicationId}/approvals`);
  }

  decide(applicationId: string, stationId: string, decision: Exclude<ApprovalDecision, 'PENDING'>, reason?: string): Observable<ApprovalRow> {
    return this.http.post<ApprovalRow>(`${this.api}/applications/${applicationId}/approvals/${stationId}/decide`, { decision, reason });
  }

  listConflicts(applicationId: string): Observable<RouteConflict[]> {
    return this.http.get<RouteConflict[]>(`${this.api}/applications/${applicationId}/conflicts`);
  }

  detectConflicts(applicationId: string): Observable<RouteConflict[]> {
    return this.http.post<RouteConflict[]>(`${this.api}/applications/${applicationId}/conflicts/detect`, {});
  }

  resolveConflict(conflictId: string, resolution: Exclude<ConflictResolution, 'UNRESOLVED'>): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.api}/conflicts/${conflictId}/resolve`, { resolution });
  }
}
