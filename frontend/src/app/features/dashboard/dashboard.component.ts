import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApplicationsService } from '../../core/services/applications.service';
import { NotificationsApiService } from '../../core/services/notifications-api.service';
import { Application } from '../../core/models/application.model';
import { AppNotification } from '../../core/models/notification.model';
import { ApplicationStatus } from '../../core/enums/application-status.enum';

const DASHBOARD_STATUSES: { key: ApplicationStatus | 'DRAFT'; label: string }[] = [
  { key: ApplicationStatus.DRAFT, label: 'Draft' },
  { key: ApplicationStatus.SUBMITTED, label: 'Submitted' },
  { key: ApplicationStatus.UNDER_REVIEW, label: 'Under review' },
  { key: ApplicationStatus.CHANGES_REQUESTED, label: 'Changes requested' },
  { key: ApplicationStatus.APPROVED, label: 'Approved' },
  { key: ApplicationStatus.REJECTED, label: 'Rejected' },
  { key: ApplicationStatus.LIVE, label: 'Live' },
  { key: ApplicationStatus.COMPLETED, label: 'Completed' },
];

@Component({
  selector: 'app-organizer-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="app-topbar">
      <div>
        <p class="auth-card__eyebrow mb-0">Overview</p>
        <h1 class="mt-0">Dashboard</h1>
      </div>
      <a routerLink="/organizer/applications/new" class="btn btn-accent">File a new application</a>
    </div>

    <div class="stat-ledger">
      @for (stat of statCards(); track stat.label) {
        <div class="stat-ledger__item">
          <div class="stat-ledger__value">{{ stat.value }}</div>
          <div class="stat-ledger__label">{{ stat.label }}</div>
        </div>
      }
    </div>

    <div class="panel" style="margin-bottom: 2rem;">
      <div class="panel__header">
        <h3 class="mt-0 mb-0">Upcoming events</h3>
        <a routerLink="/organizer/applications" class="btn-text text-sm">View all applications</a>
      </div>
      @if (upcoming().length === 0) {
        <p class="empty-row">Nothing scheduled yet. File an application to get started.</p>
      } @else {
        <table class="ledger-table">
          <thead>
            <tr><th>Application</th><th>Festival event</th><th>Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            @for (app of upcoming(); track app.id) {
              <tr>
                <td class="ledger-table__no">{{ app.applicationNo || '—' }}</td>
                <td>{{ app.eventName }}</td>
                <td>{{ app.eventDate | date: 'mediumDate' }}</td>
                <td><span class="status" [class]="'status--' + app.status.toLowerCase()">{{ app.status }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <div class="panel">
      <div class="panel__header"><h3 class="mt-0 mb-0">Recent notifications</h3></div>
      @if (notifications().length === 0) {
        <p class="empty-row">No notifications yet.</p>
      } @else {
        <ul style="list-style: none; margin: 0; padding: 0;">
          @for (note of notifications(); track note.id) {
            <li style="padding: 0.9rem 1.25rem; border-bottom: 1px solid var(--color-rule);">
              <strong>{{ note.title }}</strong>
              @if (note.body) { <div class="text-sm text-muted">{{ note.body }}</div> }
              <div class="text-sm text-muted">{{ note.createdAt | date: 'medium' }}</div>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class DashboardComponent {
  private applicationsService = inject(ApplicationsService);
  private notificationsApi = inject(NotificationsApiService);

  private applications = signal<Application[]>([]);
  notifications = signal<AppNotification[]>([]);

  statCards = computed(() => {
    const apps = this.applications();
    return DASHBOARD_STATUSES.map((s) => ({
      label: s.label,
      value: apps.filter((a) => a.status === s.key).length,
    }));
  });

  upcoming = computed(() =>
    this.applications()
      .filter((a) => new Date(a.eventDate).getTime() >= Date.now() - 1000 * 60 * 60 * 24)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
      .slice(0, 5),
  );

  constructor() {
    // The dashboard pulls from the same /applications and /notifications endpoints the
    // list screen and notification feed use - there's no separate dashboard-summary
    // endpoint on the backend, so counts are derived client-side from this organizer's
    // own application set (pageSize 100 covers any organizer's realistic volume; a
    // true aggregate endpoint is a reasonable follow-up once volumes grow).
    this.applicationsService.list({ pageSize: 100, sortBy: 'eventDate' }).subscribe({
      next: (res) => this.applications.set(res.items),
    });
    this.notificationsApi.list().subscribe({
      next: (notes) => this.notifications.set(notes.slice(0, 6)),
    });
  }
}
