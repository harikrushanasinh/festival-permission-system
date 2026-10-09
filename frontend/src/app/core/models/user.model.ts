import { UserRole } from '../enums/user-role.enum';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  address?: string | null;
  city?: string | null;
  area?: string | null;
  organizationName?: string | null;
  createdAt: string;
}
