import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../constants/api-endpoints.constant';
import { CreateRouteVersionRequest, RouteVersion, StationSuggestion } from '../models/route.model';

@Injectable({ providedIn: 'root' })
export class RoutesApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private applicationUrl(applicationId: string): string {
    return `${this.apiUrl}/applications/${applicationId}`;
  }

  createVersion(applicationId: string, payload: CreateRouteVersionRequest): Observable<RouteVersion> {
    return this.http.post<RouteVersion>(`${this.applicationUrl(applicationId)}/routes`, payload);
  }

  findByApplication(applicationId: string): Observable<RouteVersion[]> {
    return this.http.get<RouteVersion[]>(`${this.applicationUrl(applicationId)}/routes`);
  }

  getActive(applicationId: string): Observable<RouteVersion> {
    return this.http.get<RouteVersion>(`${this.applicationUrl(applicationId)}/routes/active`);
  }

  calculate(routeVersionId: string): Observable<RouteVersion> {
    return this.http.post<RouteVersion>(`${this.apiUrl}${API_ENDPOINTS.ROUTE_VERSIONS}/${routeVersionId}/calculate`, {});
  }

  analyze(applicationId: string, routeVersionId: string): Observable<StationSuggestion[]> {
    return this.http.post<StationSuggestion[]>(`${this.applicationUrl(applicationId)}/routes/${routeVersionId}/analyze`, {});
  }

  getSuggestions(applicationId: string): Observable<StationSuggestion[]> {
    return this.http.get<StationSuggestion[]>(`${this.applicationUrl(applicationId)}/police-station-suggestions`);
  }

  confirmStation(applicationId: string, stationId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.applicationUrl(applicationId)}/police-station-suggestions/${stationId}/confirm`,
      {},
    );
  }
}
