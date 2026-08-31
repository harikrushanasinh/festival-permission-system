import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../enums/user-role.enum';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data?.['roles'] as UserRole[] | undefined;
  const user = auth.currentUser();

  if (!allowedRoles || !user) return true;
  if (allowedRoles.includes(user.role)) return true;

  router.navigate(['/auth/login']);
  return false;
};
