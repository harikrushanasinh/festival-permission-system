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
      {
        path: 'applications/:id/route',
        loadComponent: () => import('./features/route-builder/route-builder.component').then((m) => m.RouteBuilderComponent),
      },
    ],
  },
  {
    path: 'police',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.POLICE_OFFICER, UserRole.POLICE_ADMIN, UserRole.SUPER_ADMIN] },
    loadComponent: () => import('./features/shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', loadComponent: () => import('./features/police/police-dashboard.component').then((m) => m.PoliceDashboardComponent) },
      {
        path: 'applications',
        loadComponent: () => import('./features/applications/list/application-list.component').then((m) => m.ApplicationListComponent),
      },
      {
        path: 'applications/:id',
        loadComponent: () => import('./features/police/application-review.component').then((m) => m.ApplicationReviewComponent),
      },
    ],
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' },
];
