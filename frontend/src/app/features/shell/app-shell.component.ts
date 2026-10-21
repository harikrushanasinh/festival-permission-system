import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/enums/user-role.enum';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <aside class="app-shell__sidebar">
        <div class="app-shell__mark">Festival Register</div>
        <nav class="app-nav">
          @for (item of nav; track item.link) {
            <a [routerLink]="item.link" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.exact }">{{ item.label }}</a>
          }
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

  nav = this.auth.currentUser()?.role === UserRole.ORGANIZER
    ? [
        { link: '/organizer', label: 'Dashboard', exact: true },
        { link: '/organizer/applications', label: 'Applications', exact: false },
        { link: '/organizer/applications/new', label: 'New application', exact: false },
      ]
    : [
        { link: '/police', label: 'Dashboard', exact: true },
        { link: '/police/applications', label: 'Review queue', exact: false },
      ];

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
