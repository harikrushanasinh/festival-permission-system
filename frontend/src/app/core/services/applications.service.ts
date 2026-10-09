import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../constants/api-endpoints.constant';
import { Application, ApplicationQuery, CreateApplicationRequest } from '../models/application.model';
import { PaginatedResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ApplicationsService {
  private readonly baseUrl = `${environment.apiUrl}${API_ENDPOINTS.APPLICATIONS}`;

  constructor(private http: HttpClient) {}

  list(query: ApplicationQuery = {}): Observable<PaginatedResponse<Application>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedResponse<Application>>(this.baseUrl, { params });
  }

  getOne(id: string): Observable<Application> {
    return this.http.get<Application>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateApplicationRequest): Observable<Application> {
    return this.http.post<Application>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<CreateApplicationRequest>): Observable<Application> {
    return this.http.patch<Application>(`${this.baseUrl}/${id}`, payload);
  }

  submit(id: string): Observable<Application> {
    return this.http.post<Application>(`${this.baseUrl}/${id}/submit`, {});
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
