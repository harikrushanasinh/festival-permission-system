import { Injectable } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys.constant';

@Injectable({ providedIn: 'root' })
export class TokenService {
  getAccessToken(): string | null { return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN); }
  getRefreshToken(): string | null { return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN); }
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }
  clear(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}
