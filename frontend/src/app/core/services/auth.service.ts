import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../constants/api-endpoints.constant';
import { STORAGE_KEYS } from '../constants/storage-keys.constant';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';
import { User } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(this.readStoredUser());

  constructor(private http: HttpClient, private tokenService: TokenService) {}

  login(payload: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${environment.apiUrl}${API_ENDPOINTS.AUTH.LOGIN}`, payload)
      .pipe(tap((res) => this.persistSession(res.data)));
  }

  register(payload: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${environment.apiUrl}${API_ENDPOINTS.AUTH.REGISTER}`, payload);
  }

  refresh(): Observable<ApiResponse<AuthResponse>> {
    const refreshToken = this.tokenService.getRefreshToken();
    return this.http
      .post<ApiResponse<AuthResponse>>(`${environment.apiUrl}${API_ENDPOINTS.AUTH.REFRESH}`, { refreshToken })
      .pipe(tap((res) => this.persistSession(res.data)));
  }

  logout(): void {
    this.tokenService.clear();
    this.currentUser.set(null);
  }

  isAuthenticated(): boolean { return !!this.tokenService.getAccessToken(); }

  private persistSession(data: AuthResponse): void {
    this.tokenService.setTokens(data.accessToken, data.refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
    this.currentUser.set(data.user);
  }

  private readStoredUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? (JSON.parse(raw) as User) : null;
  }
}
