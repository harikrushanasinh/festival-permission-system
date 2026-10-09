import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { debounceTime } from 'rxjs';
import { ApplicationsService } from '../../../core/services/applications.service';
import { MastersService } from '../../../core/services/masters.service';
import { Application, EventType, Festival } from '../../../core/models/application.model';
import { ApplicationStatus } from '../../../core/enums/application-status.enum';

@Component({
  selector: 'app-application-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  template: `
    <div class="app-topbar">
      <div>
        <p class="auth-card__eyebrow mb-0">Register</p>
        <h1 class="mt-0">Applications</h1>
      </div>
      <a routerLink="/organizer/applications/new" class="btn btn-accent">File a new application</a>
    </div>

    <form [formGroup]="filters" class="field-row" style="margin-bottom: 1.5rem;">
      <div class="field">
        <label for="festivalId">Festival</label>
        <select id="festivalId" formControlName="festivalId">
          <option value="">All festivals</option>
          @for (f of festivals(); track f.id) { <option [value]="f.id">{{ f.name }}</option> }
        </select>
      </div>
      <div class="field">
        <label for="eventTypeId">Aagman / Visarjan</label>
        <select id="eventTypeId" formControlName="eventTypeId">
          <option value="">All</option>
          @for (et of eventTypes(); track et.id) { <option [value]="et.id">{{ et.name }}</option> }
        </select>
      </div>
      <div class="field">
        <label for="status">Status</label>
        <select id="status" formControlName="status">
          <option value="">All statuses</option>
          @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
        </select>
      </div>
    </form>

    <div class="panel">
      @if (loading()) {
        <p class="empty-row">Loading…</p>
      } @else if (applications().length === 0) {
        <p class="empty-row">No applications match these filters.</p>
      } @else {
        <table class="ledger-table">
          <thead>
            <tr>
              <th>Application No</th><th>Mandal</th><th>Event</th><th>Date</th>
              <th>Time</th><th>Crowd</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (app of applications(); track app.id) {
              <tr>
                <td class="ledger-table__no">{{ app.applicationNo || 'Draft' }}</td>
                <td>{{ app.mandalName }}</td>
                <td>{{ app.eventName }}</td>
                <td>{{ app.eventDate | date: 'mediumDate' }}</td>
                <td>{{ app.startTime }}–{{ app.endTime }}</td>
                <td>{{ app.expectedCrowd }}</td>
                <td><span class="status" [class]="'status--' + app.status.toLowerCase()">{{ app.status }}</span></td>
                <td><a [routerLink]="['/organizer/applications', app.id]" class="btn-text text-sm">View</a></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    @if (total() > applications().length) {
      <div class="flex-between" style="margin-top: 1rem;">
        <span class="text-sm text-muted">Showing {{ applications().length }} of {{ total() }}</span>
        <button type="button" class="btn btn-ghost btn-sm" (click)="loadMore()">Load more</button>
      </div>
    }
  `,
})
export class ApplicationListComponent {
  private applicationsService = inject(ApplicationsService);
  private mastersService = inject(MastersService);
  private fb = inject(FormBuilder);

  statuses = Object.values(ApplicationStatus);
  festivals = signal<Festival[]>([]);
  eventTypes = signal<EventType[]>([]);
  applications = signal<Application[]>([]);
  total = signal(0);
  loading = signal(true);

  private page = 1;
  private readonly pageSize = 20;

  filters = this.fb.group({
    festivalId: [''],
    eventTypeId: [''],
    status: [''],
  });

  constructor() {
    this.mastersService.listFestivals().subscribe({ next: (list) => this.festivals.set(list) });
    this.mastersService.listEventTypes().subscribe({ next: (list) => this.eventTypes.set(list) });

    this.filters.valueChanges.pipe(debounceTime(150)).subscribe(() => {
      this.page = 1;
      this.fetch();
    });

    this.fetch();
  }

  loadMore(): void {
    this.page += 1;
    this.fetch(true);
  }

  private fetch(append = false): void {
    this.loading.set(!append);
    const raw = this.filters.getRawValue();
    this.applicationsService
      .list({
        festivalId: raw.festivalId || undefined,
        eventTypeId: raw.eventTypeId || undefined,
        status: (raw.status as ApplicationStatus) || undefined,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.applications.set(append ? [...this.applications(), ...res.items] : res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
