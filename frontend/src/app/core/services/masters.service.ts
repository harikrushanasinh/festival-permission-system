import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../constants/api-endpoints.constant';
import { EventType, Festival } from '../models/application.model';

/** Read-only reference data (F06): festivals and event types, both Super-Admin-managed. */
@Injectable({ providedIn: 'root' })
export class MastersService {
  constructor(private http: HttpClient) {}

  listFestivals(): Observable<Festival[]> {
    return this.http.get<Festival[]>(`${environment.apiUrl}${API_ENDPOINTS.FESTIVALS}`);
  }

  listEventTypes(): Observable<EventType[]> {
    return this.http.get<EventType[]>(`${environment.apiUrl}${API_ENDPOINTS.EVENT_TYPES}`);
  }
}
