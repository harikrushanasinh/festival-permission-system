import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../constants/api-endpoints.constant';
import { AppNotification } from '../models/notification.model';

/** The organizer/staff in-app notification feed (B22's in-app slice) - distinct from
 *  NotificationService, which is this app's own local toast/snackbar mechanism. */
@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private readonly baseUrl = `${environment.apiUrl}${API_ENDPOINTS.NOTIFICATIONS}`;

  constructor(private http: HttpClient) {}

  list(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(this.baseUrl);
  }

  markRead(id: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.baseUrl}/${id}/read`, {});
  }
}
