import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RoutesApiService } from '../../core/services/routes-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { CreateRouteVersionRequest, RouteVersion, StationSuggestion } from '../../core/models/route.model';

@Component({
  selector: 'app-route-builder',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="app-topbar">
      <div>
        <p class="auth-card__eyebrow mb-0">Route builder</p>
        <h1 class="mt-0">Start, destination &amp; route points</h1>
      </div>
      <a [routerLink]="['/organizer/applications', applicationId]" class="btn-text text-sm">Back to application</a>
    </div>

    <p class="field__hint" style="margin-top: -0.5rem;">
      A live Google Maps picker isn't connected yet for this deployment, so points are entered as address text plus
      latitude/longitude. Everything else - versioning, distance calculation, police-jurisdiction analysis and
      station confirmation - runs against the real backend exactly as it will once the map is wired in.
    </p>

    <form [formGroup]="form" (ngSubmit)="saveRoute()" class="panel" style="margin-bottom: 1.5rem;">
      <div class="panel__header flex-between">
        <h3 class="mt-0 mb-0">Start &amp; destination</h3>
        <button type="button" class="btn-text text-sm" (click)="useCurrentLocationForStart()" [disabled]="locating()">
          {{ locating() ? 'Locating…' : 'Use my current location for start' }}
        </button>
      </div>
      <div class="panel__body">
        <h4 class="mt-0">Start location</h4>
        <div class="field-row">
          <div class="field" style="flex: 2;">
            <label for="startAddress">Address</label>
            <input id="startAddress" [formControl]="form.controls.startAddress" type="text" placeholder="e.g. Shree Ganesh Mandal, Manek Chowk" />
          </div>
          <div class="field">
            <label for="startLat">Latitude</label>
            <input id="startLat" [formControl]="form.controls.startLat" type="number" step="any" />
          </div>
          <div class="field">
            <label for="startLng">Longitude</label>
            <input id="startLng" [formControl]="form.controls.startLng" type="number" step="any" />
          </div>
        </div>

        <hr class="rule" />

        <h4>Destination</h4>
        <div class="field-row">
          <div class="field" style="flex: 2;">
            <label for="destAddress">Address</label>
            <input id="destAddress" [formControl]="form.controls.destinationAddress" type="text" placeholder="e.g. Sabarmati Riverfront Immersion Point" />
          </div>
          <div class="field">
            <label for="destLat">Latitude</label>
            <input id="destLat" [formControl]="form.controls.destinationLat" type="number" step="any" />
          </div>
          <div class="field">
            <label for="destLng">Longitude</label>
            <input id="destLng" [formControl]="form.controls.destinationLng" type="number" step="any" />
          </div>
        </div>

        <hr class="rule" />

        <div class="flex-between">
          <h4 class="mt-0 mb-0">Route points ({{ waypoints.length }})</h4>
          <button type="button" class="btn btn-ghost btn-sm" (click)="addWaypoint()">+ Add point</button>
        </div>

        @if (waypoints.length === 0) {
          <p class="text-sm text-muted">No intermediate points yet - the route will run directly from start to destination.</p>
        }

        @for (wp of waypoints.controls; track wp; let i = $index) {
          <div class="waypoint-row">
            <span class="waypoint-row__index">P{{ i + 1 }}</span>
            <div class="field mb-0">
              <label>Address</label>
              <input [formControl]="wp.controls.address" type="text" placeholder="Point along the route" />
            </div>
            <div class="field mb-0">
              <label>Latitude</label>
              <input [formControl]="wp.controls.lat" type="number" step="any" />
            </div>
            <div class="field mb-0">
              <label>Longitude</label>
              <input [formControl]="wp.controls.lng" type="number" step="any" />
            </div>
            <div class="waypoint-actions">
              <button type="button" class="icon-btn" (click)="moveWaypoint(i, -1)" [disabled]="i === 0" title="Move up">↑</button>
              <button type="button" class="icon-btn" (click)="moveWaypoint(i, 1)" [disabled]="i === waypoints.length - 1" title="Move down">↓</button>
              <button type="button" class="icon-btn" (click)="removeWaypoint(i)" title="Remove">✕</button>
            </div>
          </div>
        }

        @if (versions().length > 0) {
          <div class="field" style="margin-top: var(--space-4);">
            <label for="changeReason">Reason for this new version</label>
            <input id="changeReason" [formControl]="form.controls.changeReason" type="text" placeholder="e.g. Police requested change to point 2" />
          </div>
        }

        <div class="btn-row" style="margin-top: var(--space-4);">
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || waypoints.invalid || saving()">
            {{ saving() ? 'Saving…' : (versions().length > 0 ? 'Save as new route version' : 'Save route') }}
          </button>
        </div>
      </div>
    </form>

    @if (latestVersion(); as lv) {
      <div class="panel" style="margin-bottom: 1.5rem;">
        <div class="panel__header flex-between">
          <h3 class="mt-0 mb-0">Version {{ lv.versionNumber }} <span class="status" [class]="'status--' + lv.status.toLowerCase()">{{ lv.status }}</span></h3>
          <button type="button" class="btn btn-accent btn-sm" (click)="calculateRoute()" [disabled]="calculating()">
            {{ calculating() ? 'Calculating…' : 'Calculate route' }}
          </button>
        </div>
        <div class="panel__body">
          <div class="route-schematic">
            @for (pt of lv.points; track pt.sequenceNo; let last = $last) {
              <div class="route-schematic__stop" [class.route-schematic__stop--start]="pt.pointType === 'START'" [class.route-schematic__stop--destination]="pt.pointType === 'DESTINATION'">
                <span class="route-schematic__dot"></span>
                <span class="route-schematic__label">{{ pt.address || pt.pointType }}</span>
              </div>
              @if (!last) { <div class="route-schematic__connector"></div> }
            }
          </div>

          @if (lv.distanceMeters != null) {
            <p class="text-sm">
              <strong>{{ (lv.distanceMeters / 1000).toFixed(2) }} km</strong> &middot;
              estimated <strong>{{ formatDuration(lv.durationSeconds) }}</strong> on foot at procession pace
            </p>
          } @else {
            <p class="text-sm text-muted">Not calculated yet - click "Calculate route" to get distance and duration.</p>
          }
        </div>
      </div>

      <div class="panel">
        <div class="panel__header flex-between">
          <h3 class="mt-0 mb-0">Police station suggestions</h3>
          <button type="button" class="btn btn-ghost btn-sm" (click)="analyzeRoute()" [disabled]="analyzing() || lv.distanceMeters == null">
            {{ analyzing() ? 'Analyzing…' : 'Analyze route' }}
          </button>
        </div>
        <div class="panel__body">
          @if (lv.distanceMeters == null) {
            <p class="text-sm text-muted">Calculate the route first, then analyze it to see which police stations should be notified.</p>
          } @else if (suggestions().length === 0) {
            <p class="text-sm text-muted">No suggestions yet - click "Analyze route".</p>
          } @else {
            @for (s of suggestions(); track s.stationId) {
              <div class="suggestion-row">
                <div>
                  <strong>{{ s.stationName }}</strong>
                  <span class="text-muted"> ({{ s.stationCode }})</span>
                  @if (s.isResponsible) { <span class="badge-responsible">Responsible</span> }
                </div>
                <span class="text-sm">{{ s.distanceKm }} km away</span>
                <span class="text-sm">{{ s.coveragePercentage }}% route coverage</span>
                <span class="status" [class]="s.isConfirmed ? 'status--approved' : 'status--draft'">
                  {{ s.isConfirmed ? 'Confirmed' : 'Not confirmed' }}
                </span>
                <button type="button" class="btn btn-sm" [class.btn-primary]="!s.isConfirmed" [class.btn-ghost]="s.isConfirmed"
                        (click)="confirmStation(s.stationId)" [disabled]="s.isConfirmed || confirmingId() === s.stationId">
                  {{ confirmingId() === s.stationId ? '…' : (s.isConfirmed ? 'Confirmed' : 'Confirm') }}
                </button>
              </div>
            }
            <p class="field__hint">
              Confirm every station you intend to notify. The application can be submitted for police review once at
              least one station is confirmed; multi-station approval happens after submission.
            </p>
          }
        </div>
      </div>
    } @else {
      <p class="text-sm text-muted">Save a route above to start calculating distance and finding police stations.</p>
    }
  `,
})
export class RouteBuilderComponent implements OnInit {
  private fb = inject(FormBuilder);
  private routesApi = inject(RoutesApiService);
  private notify = inject(NotificationService);
  private route = inject(ActivatedRoute);

  applicationId = this.route.snapshot.paramMap.get('id')!;

  versions = signal<RouteVersion[]>([]);
  latestVersion = computed<RouteVersion | null>(() => {
    const v = this.versions();
    return v.length ? v[v.length - 1] : null;
  });
  suggestions = signal<StationSuggestion[]>([]);

  saving = signal(false);
  calculating = signal(false);
  analyzing = signal(false);
  confirmingId = signal<string | null>(null);
  locating = signal(false);

  form = this.fb.nonNullable.group({
    startAddress: ['', Validators.required],
    startLat: [0, Validators.required],
    startLng: [0, Validators.required],
    destinationAddress: ['', Validators.required],
    destinationLat: [0, Validators.required],
    destinationLng: [0, Validators.required],
    changeReason: [''],
  });

  waypoints = this.fb.array([this.newWaypoint()]);

  constructor() {
    this.waypoints.clear();
  }

  ngOnInit(): void {
    this.routesApi.findByApplication(this.applicationId).subscribe({
      next: (versions) => {
        this.versions.set(versions);
        const latest = versions.length ? versions[versions.length - 1] : null;
        if (latest) this.prefillFrom(latest);
      },
    });
    this.routesApi.getSuggestions(this.applicationId).subscribe({
      next: (suggestions) => this.suggestions.set(suggestions),
    });
  }

  private newWaypoint(address = '', lat = 0, lng = 0) {
    return this.fb.nonNullable.group({
      address: [address, Validators.required],
      lat: [lat, Validators.required],
      lng: [lng, Validators.required],
    });
  }

  private prefillFrom(version: RouteVersion): void {
    const start = version.points.find((p) => p.pointType === 'START');
    const destination = version.points.find((p) => p.pointType === 'DESTINATION');
    const mids = version.points.filter((p) => p.pointType === 'WAYPOINT').sort((a, b) => a.sequenceNo - b.sequenceNo);

    this.form.patchValue({
      startAddress: version.startAddress,
      startLat: start?.location.coordinates[1] ?? 0,
      startLng: start?.location.coordinates[0] ?? 0,
      destinationAddress: version.destinationAddress,
      destinationLat: destination?.location.coordinates[1] ?? 0,
      destinationLng: destination?.location.coordinates[0] ?? 0,
    });

    this.waypoints.clear();
    for (const m of mids) {
      this.waypoints.push(this.newWaypoint(m.address ?? '', m.location.coordinates[1], m.location.coordinates[0]));
    }
  }

  addWaypoint(): void {
    this.waypoints.push(this.newWaypoint());
  }

  removeWaypoint(i: number): void {
    this.waypoints.removeAt(i);
  }

  moveWaypoint(i: number, dir: -1 | 1): void {
    const j = i + dir;
    if (j < 0 || j >= this.waypoints.length) return;
    const a = this.waypoints.at(i);
    const b = this.waypoints.at(j);
    this.waypoints.setControl(i, b);
    this.waypoints.setControl(j, a);
  }

  useCurrentLocationForStart(): void {
    if (!navigator.geolocation) {
      this.notify.error('Geolocation is not available in this browser.');
      return;
    }
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.patchValue({ startLat: pos.coords.latitude, startLng: pos.coords.longitude });
        if (!this.form.controls.startAddress.value) {
          this.form.patchValue({ startAddress: 'Current location' });
        }
        this.locating.set(false);
      },
      () => {
        this.notify.error('Could not read your current location.');
        this.locating.set(false);
      },
    );
  }

  saveRoute(): void {
    if (this.form.invalid || this.waypoints.invalid) {
      this.notify.error('Fill in start, destination and every route point before saving.');
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const payload: CreateRouteVersionRequest = {
      start: { address: v.startAddress, lat: v.startLat, lng: v.startLng },
      destination: { address: v.destinationAddress, lat: v.destinationLat, lng: v.destinationLng },
      points: this.waypoints.getRawValue(),
      changeReason: v.changeReason || undefined,
    };
    this.routesApi.createVersion(this.applicationId, payload).subscribe({
      next: (version) => {
        this.saving.set(false);
        this.versions.update((list) => [...list, version]);
        this.suggestions.set([]);
        this.notify.success(`Route version ${version.versionNumber} saved.`);
      },
      error: () => this.saving.set(false),
    });
  }

  calculateRoute(): void {
    const lv = this.latestVersion();
    if (!lv) return;
    this.calculating.set(true);
    this.routesApi.calculate(lv.id).subscribe({
      next: (version) => {
        this.calculating.set(false);
        this.versions.update((list) => list.map((v) => (v.id === version.id ? version : v)));
        this.notify.success('Route calculated.');
      },
      error: () => this.calculating.set(false),
    });
  }

  analyzeRoute(): void {
    const lv = this.latestVersion();
    if (!lv) return;
    this.analyzing.set(true);
    this.routesApi.analyze(this.applicationId, lv.id).subscribe({
      next: () => {
        this.routesApi.getSuggestions(this.applicationId).subscribe({
          next: (suggestions) => {
            this.analyzing.set(false);
            this.suggestions.set(suggestions);
            if (suggestions.length === 0) {
              this.notify.error('No police stations found near this route. An administrator may need to add station/jurisdiction data.');
            } else {
              this.notify.success(`Found ${suggestions.length} nearby station(s).`);
            }
          },
          error: () => this.analyzing.set(false),
        });
      },
      error: () => this.analyzing.set(false),
    });
  }

  confirmStation(stationId: string): void {
    this.confirmingId.set(stationId);
    this.routesApi.confirmStation(this.applicationId, stationId).subscribe({
      next: () => {
        this.confirmingId.set(null);
        this.suggestions.update((list) => list.map((s) => (s.stationId === stationId ? { ...s, isConfirmed: true } : s)));
        this.notify.success('Station confirmed.');
      },
      error: () => this.confirmingId.set(null),
    });
  }

  formatDuration(seconds: number | null): string {
    if (seconds == null) return '-';
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }
}
