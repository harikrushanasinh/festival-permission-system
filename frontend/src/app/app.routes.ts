import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserRole } from './core/enums/user-role.enum';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'organizer',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.ORGANIZER] },
    loadComponent: () => import('./features/shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      {
        path: 'applications',
        loadComponent: () => import('./features/applications/list/application-list.component').then((m) => m.ApplicationListComponent),
      },
      {
        path: 'applications/new',
        loadComponent: () => import('./features/applications/form/application-form.component').then((m) => m.ApplicationFormComponent),
      },
      {
        path: 'applications/:id',
        loadComponent: () => import('./features/applications/form/application-form.component').then((m) => m.ApplicationFormComponent),
      },
    ],
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' },
];
