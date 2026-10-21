import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApplicationsService } from '../../core/services/applications.service';
import { RoutesApiService } from '../../core/services/routes-api.service';
import { PoliceApiService } from '../../core/services/police-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Application } from '../../core/models/application.model';
import { RouteVersion } from '../../core/models/route.model';
import { ApprovalDecision, ApprovalRow, ConflictResolution, RouteConflict } from '../../core/models/review.model';

@Component({
  selector: 'app-application-review',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="app-topbar">
      <div>
        <p class="auth-card__eyebrow mb-0">{{ application()?.applicationNo || 'Application' }}</p>
        <h1 class="mt-0">{{ application()?.eventName || 'Review' }}</h1>
      </div>
      <a routerLink="/police/applications" class="btn-text text-sm">Back to queue</a>
    </div>

    @if (application(); as app) {
      <div class="panel" style="margin-bottom: 1.5rem;">
        <div class="panel__header flex-between">
          <h3 class="mt-0 mb-0">Event</h3>
          <span class="status" [class]="'status--' + app.status.toLowerCase()">{{ app.status }}</span>
        </div>
        <div class="panel__body">
          <p class="mb-0"><strong>{{ app.mandalName }}</strong> &middot; {{ app.eventDate | date: 'fullDate' }}, {{ app.startTime }}–{{ app.endTime }}</p>
          <p class="text-sm text-muted">
            Crowd {{ app.expectedCrowd }} &middot; {{ app.vehicleCount }} vehicle(s){{ app.vehicleType ? ' (' + app.vehicleType + ')' : '' }}
            @if (app.hasSoundSystem) { &middot; sound system }
            @if (app.hasDj) { &middot; DJ }
            @if (app.hasDhol) { &middot; dhol }
            @if (app.hasGenerator) { &middot; generator }
          </p>
          @if (app.specialRequirements) { <p class="text-sm"><strong>Special requirements:</strong> {{ app.specialRequirements }}</p> }
          @if (app.description) { <p class="text-sm mb-0">{{ app.description }}</p> }
        </div>
      </div>
    }

    <div class="panel" style="margin-bottom: 1.5rem;">
      <div class="panel__header"><h3 class="mt-0 mb-0">Route</h3></div>
      <div class="panel__body">
        @if (route(); as r) {
          <div class="route-schematic">
            @for (pt of r.points; track pt.sequenceNo; let last = $last) {
              <div class="route-schematic__stop" [class.route-schematic__stop--start]="pt.pointType === 'START'" [class.route-schematic__stop--destination]="pt.pointType === 'DESTINATION'">
                <span class="route-schematic__dot"></span>
                <span class="route-schematic__label">{{ pt.address || pt.pointType }}</span>
              </div>
              @if (!last) { <div class="route-schematic__connector"></div> }
            }
          </div>
          <p class="text-sm mb-0">
            Version {{ r.versionNumber }}
            @if (r.distanceMeters != null) { &middot; <strong>{{ (r.distanceMeters / 1000).toFixed(2) }} km</strong> }
            @if (r.changeReason) { &middot; {{ r.changeReason }} }
          </p>
        } @else {
          <p class="text-sm text-muted mb-0">No route has been recorded for this application.</p>
        }
      </div>
    </div>

    <div class="panel" style="margin-bottom: 1.5rem;">
      <div class="panel__header"><h3 class="mt-0 mb-0">Station decisions</h3></div>
      <div class="panel__body">
        @if (approvals().length === 0) {
          <p class="text-sm text-muted mb-0">No stations are on the approval list yet (the application must be submitted first).</p>
        }
        @for (a of approvals(); track a.id) {
          <div class="suggestion-row" style="grid-template-columns: 1fr auto;">
            <div>
              <strong>{{ a.policeStationName }}</strong> <span class="text-muted">({{ a.policeStationCode }})</span>
              @if (a.reason) { <div class="text-sm text-muted">“{{ a.reason }}”</div> }
            </div>
            <span class="status" [class]="'status--' + (a.decision === 'APPROVED' ? 'approved' : a.decision === 'REJECTED' ? 'rejected' : a.decision === 'CHANGES_REQUESTED' ? 'changes_requested' : 'draft')">{{ a.decision }}</span>
          </div>
          <div class="btn-row" style="padding: 0 0 var(--space-3);">
            <input class="reason-input" type="text" placeholder="Reason (required to reject or request changes)"
                   [ngModel]="reasons()[a.policeStationId] || ''" (ngModelChange)="setReason(a.policeStationId, $event)" style="flex: 1; min-width: 240px;" />
            <button type="button" class="btn btn-primary btn-sm" [disabled]="busy()" (click)="decide(a, 'APPROVED')">Approve</button>
            <button type="button" class="btn btn-ghost btn-sm" [disabled]="busy()" (click)="decide(a, 'CHANGES_REQUESTED')">Request changes</button>
            <button type="button" class="btn btn-ghost btn-sm" [disabled]="busy()" (click)="decide(a, 'REJECTED')">Reject</button>
          </div>
        }
        <p class="field__hint">The application is approved only when every listed station approves; any rejection rejects it, and any change request returns it to the organizer.</p>
      </div>
    </div>

    <div class="panel">
      <div class="panel__header flex-between">
        <h3 class="mt-0 mb-0">Route conflicts</h3>
        <button type="button" class="btn btn-ghost btn-sm" [disabled]="busy()" (click)="detect()">Check for conflicts</button>
      </div>
      <div class="panel__body">
        @if (conflicts().length === 0) {
          <p class="text-sm text-muted mb-0">No conflicts recorded.</p>
        }
        @for (c of conflicts(); track c.id) {
          <div class="suggestion-row" style="grid-template-columns: 1fr auto auto;">
            <div>
              <strong>{{ c.conflictingApplicationNo || 'Application' }}</strong> &middot; {{ c.conflictingFestivalName }} &middot; {{ c.conflictingMandalName }}
              <div class="text-sm text-muted">{{ c.conflictingEventDate | date: 'mediumDate' }}, {{ c.conflictingStartTime }}–{{ c.conflictingEndTime }} &middot; overlap {{ (c.overlapMeters / 1000).toFixed(2) }} km</div>
            </div>
            <span class="status" [class]="c.severity === 'HIGH' ? 'status--rejected' : 'status--submitted'">{{ c.severity }}</span>
            @if (c.resolution === 'UNRESOLVED') {
              <select class="reason-input" (change)="resolve(c, $any($event.target).value)">
                <option value="">Resolve…</option>
                <option value="ALLOWED">Allow</option>
                <option value="TIME_CHANGED">Change time</option>
                <option value="ROUTE_CHANGED">Change route</option>
                <option value="REJECTED">Reject</option>
              </select>
            } @else {
              <span class="status status--draft">{{ c.resolution }}</span>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ApplicationReviewComponent implements OnInit {
  private route$ = inject(ActivatedRoute);
  private applicationsService = inject(ApplicationsService);
  private routesApi = inject(RoutesApiService);
  private policeApi = inject(PoliceApiService);
  private notify = inject(NotificationService);

  private id = this.route$.snapshot.paramMap.get('id')!;

  application = signal<Application | null>(null);
  route = signal<RouteVersion | null>(null);
  approvals = signal<ApprovalRow[]>([]);
  conflicts = signal<RouteConflict[]>([]);
  reasons = signal<Record<string, string>>({});
  busy = signal(false);

  ngOnInit(): void {
    this.reload();
    this.routesApi.getActive(this.id).subscribe({ next: (r) => this.route.set(r), error: () => this.route.set(null) });
    this.policeApi.listConflicts(this.id).subscribe({ next: (c) => this.conflicts.set(c) });
  }

  private reload(): void {
    this.applicationsService.getOne(this.id).subscribe({ next: (a) => this.application.set(a) });
    this.policeApi.listApprovals(this.id).subscribe({ next: (a) => this.approvals.set(a) });
  }

  setReason(stationId: string, value: string): void {
    this.reasons.update((r) => ({ ...r, [stationId]: value }));
  }

  decide(row: ApprovalRow, decision: Exclude<ApprovalDecision, 'PENDING'>): void {
    const reason = (this.reasons()[row.policeStationId] || '').trim();
    if (decision !== 'APPROVED' && !reason) {
      this.notify.error('A reason is required to reject or request changes.');
      return;
    }
    this.busy.set(true);
    this.policeApi.decide(this.id, row.policeStationId, decision, reason || undefined).subscribe({
      next: () => {
        this.busy.set(false);
        this.notify.success(`${row.policeStationName}: ${decision.replace('_', ' ').toLowerCase()}.`);
        this.reload();
      },
      error: () => this.busy.set(false),
    });
  }

  detect(): void {
    this.busy.set(true);
    this.policeApi.detectConflicts(this.id).subscribe({
      next: (c) => { this.busy.set(false); this.conflicts.set(c); this.notify.success(c.length ? `${c.length} conflict(s) found.` : 'No conflicts found.'); },
      error: () => this.busy.set(false),
    });
  }

  resolve(c: RouteConflict, resolution: string): void {
    if (!resolution) return;
    this.policeApi.resolveConflict(c.id, resolution as Exclude<ConflictResolution, 'UNRESOLVED'>).subscribe({
      next: () => { this.notify.success('Conflict resolved.'); this.policeApi.listConflicts(this.id).subscribe((l) => this.conflicts.set(l)); },
    });
  }
}
