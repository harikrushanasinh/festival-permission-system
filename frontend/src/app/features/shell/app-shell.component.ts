import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <aside class="app-shell__sidebar">
        <div class="app-shell__mark">Festival Register</div>
        <nav class="app-nav">
          <a routerLink="/organizer" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
          <a routerLink="/organizer/applications" routerLinkActive="active">Applications</a>
          <a routerLink="/organizer/applications/new" routerLinkActive="active">New application</a>
        </nav>
        <div class="app-shell__user">
          <strong>{{ auth.currentUser()?.name }}</strong>
          {{ auth.currentUser()?.organizationName || auth.currentUser()?.email }}
          <button type="button" class="app-shell__logout" (click)="logout()">Sign out</button>
        </div>
      </aside>
      <main class="app-shell__main">
        <div class="container">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
})
export class AppShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
