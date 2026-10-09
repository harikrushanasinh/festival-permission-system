import { User } from './user.model';

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
  name: string; mobile: string; email: string; password: string;
  address: string; city: string; area: string; organizationName: string;
}
// The backend returns these directly - no {success,data} envelope. (Confirmed against a
// live /auth/login and /auth/register response - there is no ApiResponse<T> wrapper
// anywhere in this API; PaginatedResponse<T> below is the only "shaped" response shape
// the backend actually uses, and only for list endpoints.)
export interface AuthResponse { accessToken: string; refreshToken: string; user: User; }
export interface RegisterResponse { user: User; }
