import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApplicationsService } from '../../core/services/applications.service';
import { Application } from '../../core/models/application.model';
import { ApplicationStatus } from '../../core/enums/application-status.enum';

@Component({
  selector: 'app-police-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="app-topbar">
      <div>
        <p class="auth-card__eyebrow mb-0">Police desk</p>
        <h1 class="mt-0">Today's register</h1>
      </div>
      <a routerLink="/police/applications" class="btn btn-accent">Open review queue</a>
    </div>

    <div class="stat-ledger" style="margin-bottom: 1.5rem;">
      @for (c of counts(); track c.label) {
        <div class="stat-ledger__item">
          <div class="stat-ledger__value">{{ c.value }}</div>
          <div class="stat-ledger__label">{{ c.label }}</div>
        </div>
      }
    </div>

    <div class="panel">
      <div class="panel__header"><h3 class="mt-0 mb-0">Awaiting review</h3></div>
      @if (pending().length === 0) {
        <p class="empty-row">Nothing is waiting for review.</p>
      } @else {
        <table class="ledger-table">
          <thead><tr><th>Application No</th><th>Mandal</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (a of pending(); track a.id) {
              <tr>
                <td class="ledger-table__no">{{ a.applicationNo || 'Draft' }}</td>
                <td>{{ a.mandalName }}</td>
                <td>{{ a.eventDate | date: 'mediumDate' }}</td>
                <td><span class="status" [class]="'status--' + a.status.toLowerCase()">{{ a.status }}</span></td>
                <td><a [routerLink]="['/police/applications', a.id]" class="btn-text text-sm">Review</a></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class PoliceDashboardComponent {
  private applicationsService = inject(ApplicationsService);
  applications = signal<Application[]>([]);

  pending = computed(() =>
    this.applications().filter((a) => [ApplicationStatus.SUBMITTED, ApplicationStatus.RESUBMITTED, ApplicationStatus.UNDER_REVIEW].includes(a.status)),
  );

  counts = computed(() => {
    const apps = this.applications();
    const n = (...s: ApplicationStatus[]) => apps.filter((a) => s.includes(a.status)).length;
    const today = new Date().toISOString().slice(0, 10);
    return [
      { label: 'Total', value: apps.length },
      { label: 'Pending review', value: this.pending().length },
      { label: "Today's events", value: apps.filter((a) => a.eventDate?.slice(0, 10) === today && a.status !== ApplicationStatus.DRAFT).length },
      { label: 'Approved', value: n(ApplicationStatus.APPROVED) },
      { label: 'Rejected', value: n(ApplicationStatus.REJECTED) },
      { label: 'Changes requested', value: n(ApplicationStatus.CHANGES_REQUESTED) },
      { label: 'Live', value: n(ApplicationStatus.LIVE) },
    ];
  });

  constructor() {
    // No dedicated police summary endpoint exists, so counts come from the list (first 100).
    this.applicationsService.list({ pageSize: 100 }).subscribe({ next: (res) => this.applications.set(res.items) });
  }
}
