import { User } from './user.model';

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
  name: string; mobile: string; email: string; password: string;
  address: string; city: string; area: string; organizationName: string;
}
export interface AuthResponse { accessToken: string; refreshToken: string; user: User; }
