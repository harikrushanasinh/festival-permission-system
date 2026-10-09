import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApplicationsService } from '../../../core/services/applications.service';
import { MastersService } from '../../../core/services/masters.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Application, EventType, Festival } from '../../../core/models/application.model';
import { ApplicationStatus } from '../../../core/enums/application-status.enum';

const EDITABLE_STATUSES = new Set<ApplicationStatus>([ApplicationStatus.DRAFT, ApplicationStatus.CHANGES_REQUESTED]);

@Component({
  selector: 'app-application-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="app-topbar">
      <div>
        <p class="auth-card__eyebrow mb-0">{{ applicationId ? (application()?.applicationNo || 'Draft') : 'New entry' }}</p>
        <h1 class="mt-0">{{ applicationId ? 'Application' : 'File a new application' }}</h1>
      </div>
      <a routerLink="/organizer/applications" class="btn-text text-sm">Back to applications</a>
    </div>

    @if (applicationId && application(); as app) {
      <div class="panel" style="margin-bottom: 1.5rem;">
        <div class="panel__body flex-between">
          <span class="status" [class]="'status--' + app.status.toLowerCase()">{{ app.status }}</span>
          @if (canSubmit()) {
            <button type="button" class="btn btn-accent" (click)="submit()" [disabled]="submitting()">
              {{ submitting() ? 'Submitting…' : 'Submit for police review' }}
            </button>
          }
        </div>
      </div>
    }

    <form [formGroup]="form" (ngSubmit)="save()" class="panel">
      <div class="panel__body">
        <h3 class="mt-0">Festival and event type</h3>
        <div class="field-row">
          <div class="field">
            <label for="festivalId">Festival</label>
            <select id="festivalId" formControlName="festivalId">
              <option value="" disabled>Choose a festival</option>
              @for (f of festivals(); track f.id) { <option [value]="f.id">{{ f.name }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="eventTypeId">Aagman or Visarjan</label>
            <select id="eventTypeId" formControlName="eventTypeId">
              <option value="" disabled>Choose one</option>
              @for (et of eventTypes(); track et.id) { <option [value]="et.id">{{ et.name }}</option> }
            </select>
          </div>
        </div>

        <hr class="rule" />

        <h3>Organizer and event details</h3>
        <div class="field-row">
          <div class="field">
            <label for="mandalName">Mandal name</label>
            <input id="mandalName" formControlName="mandalName" type="text" placeholder="e.g. Shree Ganesh Mitra Mandal" />
          </div>
          <div class="field">
            <label for="eventName">Event name</label>
            <input id="eventName" formControlName="eventName" type="text" placeholder="e.g. Ganpati Aagman 2026" />
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="eventDate">Event date</label>
            <input id="eventDate" formControlName="eventDate" type="date" />
          </div>
          <div class="field">
            <label for="startTime">Start time</label>
            <input id="startTime" formControlName="startTime" type="time" />
          </div>
          <div class="field">
            <label for="endTime">Expected end time</label>
            <input id="endTime" formControlName="endTime" type="time" />
            @if (form.errors?.['timeOrder'] && form.controls.endTime.touched) {
              <p class="field__error">End time must be after start time.</p>
            }
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="expectedCrowd">Expected crowd</label>
            <input id="expectedCrowd" formControlName="expectedCrowd" type="number" min="1" />
          </div>
          <div class="field">
            <label for="vehicleCount">Number of vehicles</label>
            <input id="vehicleCount" formControlName="vehicleCount" type="number" min="0" />
          </div>
          <div class="field">
            <label for="vehicleType">Vehicle type</label>
            <input id="vehicleType" formControlName="vehicleType" type="text" placeholder="e.g. Truck, tableau" />
          </div>
        </div>

        <div class="checkbox-grid">
          <label class="checkbox-row"><input type="checkbox" formControlName="hasSoundSystem" /> Sound system</label>
          <label class="checkbox-row"><input type="checkbox" formControlName="hasDj" /> DJ</label>
          <label class="checkbox-row"><input type="checkbox" formControlName="hasDhol" /> Dhol</label>
          <label class="checkbox-row"><input type="checkbox" formControlName="hasGenerator" /> Generator</label>
        </div>

        <div class="field">
          <label for="specialRequirements">Special requirements</label>
          <textarea id="specialRequirements" formControlName="specialRequirements" placeholder="Anything the police station should know in advance"></textarea>
        </div>

        <div class="field">
          <label for="description">Description</label>
          <textarea id="description" formControlName="description" placeholder="Describe the procession for the record"></textarea>
        </div>

        <p class="field__hint">
          Start location, destination and the route itself are set up after saving, in the route builder - a
          follow-up module. Save this as a draft first.
        </p>

        <div class="btn-row">
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving() || !isEditable()">
            {{ saving() ? 'Saving…' : (applicationId ? 'Save changes' : 'Save as draft') }}
          </button>
          @if (applicationId && !isEditable()) {
            <span class="text-sm text-muted">This application can no longer be edited while it's {{ application()?.status }}.</span>
          }
        </div>
      </div>
    </form>
  `,
})
export class ApplicationFormComponent {
  private fb = inject(FormBuilder);
  private applicationsService = inject(ApplicationsService);
  private mastersService = inject(MastersService);
  private notify = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  festivals = signal<Festival[]>([]);
  eventTypes = signal<EventType[]>([]);
  application = signal<Application | null>(null);
  saving = signal(false);
  submitting = signal(false);

  applicationId: string | null = this.route.snapshot.paramMap.get('id');

  isEditable = computed(() => {
    const app = this.application();
    return !app || EDITABLE_STATUSES.has(app.status);
  });

  canSubmit = computed(() => {
    const app = this.application();
    return !!app && EDITABLE_STATUSES.has(app.status);
  });

  form = this.fb.nonNullable.group(
    {
      festivalId: ['', Validators.required],
      eventTypeId: ['', Validators.required],
      mandalName: ['', Validators.required],
      eventName: ['', Validators.required],
      eventDate: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      expectedCrowd: [500, [Validators.required, Validators.min(1)]],
      vehicleCount: [0, [Validators.min(0)]],
      vehicleType: [''],
      hasSoundSystem: [false],
      hasDj: [false],
      hasDhol: [false],
      hasGenerator: [false],
      specialRequirements: [''],
      description: [''],
    },
    { validators: [timeOrderValidator] },
  );

  constructor() {
    this.mastersService.listFestivals().subscribe({ next: (list) => this.festivals.set(list) });
    this.mastersService.listEventTypes().subscribe({ next: (list) => this.eventTypes.set(list) });

    if (this.applicationId) {
      this.applicationsService.getOne(this.applicationId).subscribe({
        next: (app) => {
          this.application.set(app);
          this.form.patchValue({ ...app, vehicleType: app.vehicleType ?? '', specialRequirements: app.specialRequirements ?? '', description: app.description ?? '' });
          if (!EDITABLE_STATUSES.has(app.status)) this.form.disable();
        },
      });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const payload = this.form.getRawValue();

    const request$ = this.applicationId
      ? this.applicationsService.update(this.applicationId, payload)
      : this.applicationsService.create(payload);

    request$.subscribe({
      next: (app) => {
        this.saving.set(false);
        this.notify.success(this.applicationId ? 'Application updated.' : 'Saved as draft.');
        if (!this.applicationId) {
          this.router.navigate(['/organizer/applications', app.id]);
        } else {
          this.application.set(app);
        }
      },
      error: () => this.saving.set(false),
    });
  }

  submit(): void {
    if (!this.applicationId) return;
    this.submitting.set(true);
    this.applicationsService.submit(this.applicationId).subscribe({
      next: (app) => {
        this.submitting.set(false);
        this.application.set(app);
        this.notify.success('Application submitted for police review.');
      },
      error: () => this.submitting.set(false),
    });
  }
}

const timeOrderValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const start = group.get('startTime')?.value;
  const end = group.get('endTime')?.value;
  if (start && end && start >= end) return { timeOrder: true };
  return null;
};
