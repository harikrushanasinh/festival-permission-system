# Festival Aagman/Visarjan Permission & Live Tracking System

Organizer application → police multi-station approval → QR permission → live GPS
tracking → public portal, for religious processions (Aagman/Visarjan).

## Stack

- **Frontend**: Angular 20 (standalone components, signals)
- **Backend**: NestJS 12 (ESM), TypeORM, PostgreSQL + PostGIS, Redis, Socket.IO
- **Auth**: JWT access/refresh, bcrypt, Passport, role-based guards

## Project layout

```
festival/
├── frontend/     Angular 20 app
├── backend/      NestJS 12 API
├── database/     migrations/ and seeds/
├── docs/
├── docker/       Dockerfiles
└── docker-compose.yml
```

## Local setup

```bash
cp .env.example .env    # fill in secrets before anything but local dev
docker compose up -d postgres redis

cd backend && npm install && npm run start:dev
cd frontend && npm install && npm start
```

Backend: http://localhost:3000/api/v1
Frontend: http://localhost:4200

## Development order (module by module)

Each module is built, compiled/tested, then committed before moving to the next.
See the full 52-module spec in `docs/` for detailed requirements per module.

- [x] 01. Project setup
- [x] F01. Angular core module (auth scaffolding, interceptors, guards, services)
- [x] B01/B02. Auth + Users backend module (register/login/refresh/logout/forgot/reset) —
      verified end-to-end against a live Postgres: register, login, refresh, wrong-password
      (401), duplicate email (409), validation (400), and rate limiting (429) all confirmed.
- [x] 02. Database schema & migrations — full PostGIS schema (27 tables) across users,
      RBAC, festivals/event types, police stations & area jurisdiction polygons, applications
      + status history, route versioning + points, multi-station approvals, documents,
      permits/QR, conflicts, live tracking, notifications, audit logs. Verified against a
      live Postgres+PostGIS instance: migrations apply cleanly, are idempotent on re-run,
      and a real point-in-polygon jurisdiction lookup + nearest-station distance query
      both return correct results.
- [ ] 03/RBAC. Roles & permissions (schema done in 02; service/guard wiring next)
- [x] 04. Super Admin masters — Festivals, Event Types, Police Stations, Areas: full
      CRUD APIs, SUPER_ADMIN-only mutations (RolesGuard), public reads. Police
      stations auto-derive their PostGIS `location` from lat/lng via a DB trigger.
      Areas accept a polygon boundary and expose a `/areas/lookup?lat=&lng=` point-
      in-jurisdiction endpoint. Verified end-to-end against a live Postgres+PostGIS
      instance over real HTTP: full CRUD, 401/403/404/409 error paths, the geography
      trigger, nearest-station distance ranking, and the point-in-polygon lookup all
      confirmed working through the actual API, not just service-layer logic.
- [ ] 05. Organizer registration UI
- [x] 06. Application module — draft create/edit, submit, list with role-scoped
      visibility + filters/pagination, application-number generation (e.g.
      GANPATI-2026-00001). Verified end-to-end against a live Postgres over real
      HTTP: full DRAFT -> SUBMITTED -> CHANGES_REQUESTED -> RESUBMITTED lifecycle,
      status history recorded at every transition, organizer data isolation (403
      cross-organizer), staff-role full visibility, edit/delete locked outside
      DRAFT/CHANGES_REQUESTED, and time-order validation (start < end).
- [x] 08. Route builder backend — routes/route_versions/route_points CRUD (B10),
      ordered start->waypoints->destination points, PostGIS path calculation
      (ST_MakeLine + ST_Length for real geography-based distance; duration is a
      placeholder estimate pending Module 07's real Google Directions call).
      Version history preserved on change (F10 - never edits an approved route
      in place, always creates a new version and repoints
      applications.active_route_id). Verified end-to-end against a live Postgres
      over real HTTP: point ordering, real distance calculation (~4.88km on a
      4-point test route), version 2 created without mutating version 1,
      cross-organizer 403, and DTO validation on missing/invalid nested fields.
- [ ] 07. Google Maps integration (frontend) — needs a real Google Maps API key
      to test meaningfully; not yet started. `@googlemaps/js-api-loader` is
      already in frontend/package.json from Module 01.
- [x] 09/11. PostGIS route analysis + police station recommendation — analyzes
      a calculated route's intersection with jurisdiction area polygons,
      computes per-station coverage percentage, marks the highest-coverage
      station(s) responsible, and falls back to plain nearest-station-by-
      distance (unconfirmed) when a route crosses no defined jurisdiction at
      all. Results persist to application_police_stations and the organizer can
      confirm a suggested station. Verified end-to-end against a live
      Postgres+PostGIS instance over real HTTP: a route crossing two adjacent
      jurisdictions split almost exactly 50/50 in coverage, both correctly
      flagged responsible; a route touching neither jurisdiction correctly fell
      back to distance-ranked suggestions with none marked responsible;
      analyzing before calculating the route path is rejected with 400.
- [x] 10/12. Documents — multipart upload with a pluggable storage-driver
      abstraction (local disk implemented for dev; S3/R2 fail loudly at boot
      instead of silently degrading to local storage). Mime-type allowlist
      (pdf/jpeg/png), requirement-code validated against the event type's
      document_requirements from Module 02's seeds, staff-only verification
      with a rejection note. Verified end-to-end against a live Postgres +
      local disk over real HTTP: byte-for-byte upload/download roundtrip,
      invalid mime type / invalid requirement code / missing file all 400,
      cross-organizer download blocked (403), non-staff verify blocked (403),
      police officer verify + staff download bypass both confirmed, and delete
      removes the file from disk (not just the DB row) with a 404 on
      subsequent access.
- [x] 13/14. Police review + multi-station approval — per-station APPROVED/
      REJECTED/CHANGES_REQUESTED decisions (F17) with a required reason for
      anything but APPROVED, and aggregate application-status computation
      (F18/B14): any rejection wins outright, any changes-requested sends it
      back to the organizer, all-approved closes it out, otherwise it sits
      UNDER_REVIEW. Submit now requires an active route AND at least one
      confirmed police station before it's allowed (two new guards on
      ApplicationsService.submit()); a resubmission after CHANGES_REQUESTED
      resets all prior per-station decisions to PENDING rather than leaving
      stale approvals against a route that's since changed. Verified
      end-to-end against a live Postgres over real HTTP with a genuine
      two-station scenario: submit blocked with no route (400), blocked with
      no confirmed station (400), approval rows correctly seeded as PENDING on
      submit, one station approving moved the aggregate to UNDER_REVIEW (not
      APPROVED), the second approval completed it to APPROVED with a full
      DRAFT->SUBMITTED->UNDER_REVIEW->APPROVED history trail, a rejection on a
      *different* application correctly overrode to REJECTED even with the
      other station still pending, missing-reason-on-reject correctly 400s,
      non-staff correctly 403s, and deciding for a station never confirmed for
      that application correctly 404s.
- [x] 12/15. Permission + QR — automatically issues a permit the instant an
      application's aggregate status reaches APPROVED (inside the same DB
      transaction as the final approval, so a permit can never exist without
      its approval being durably committed). Permission number derives from
      the application number (PMT-{applicationNo}) rather than a second
      race-prone sequence; QR token is a random 24-byte base64url string,
      rendered server-side to an actual scannable PNG via the `qrcode`
      package. GET /public/verify/:token is deliberately unauthenticated and
      returns only what F24 says is public-safe (permit/application/festival/
      event details, approving station names) - no organizer identity,
      contact info, or internal officer IDs. Verified end-to-end against a
      live Postgres over real HTTP through the full pipeline (stations, areas,
      application, route, analysis, confirmation, submit, approval): permit
      auto-issued on approval with the correct permission number and a real
      400x400 PNG QR code, public verify worked with no auth header and
      correctly excluded private fields, an invalid token 404'd, an
      application with no permit yet 404'd distinctly, and a second organizer
      was blocked (403) from fetching another organizer's permit.
- [x] 13/16. Public portal — no-login browsing of processions (F23/F24).
      Only APPROVED/LIVE/COMPLETED applications are ever visible; DRAFT/
      SUBMITTED/UNDER_REVIEW/CHANGES_REQUESTED/REJECTED stay entirely private
      even to a direct-by-id request (404, not just filtered out of listings).
      Filters: festival, event type, police station, date, and timeframe
      (upcoming/live/completed). Detail view returns route path/points as
      GeoJSON for map rendering, confirmed station names, and the permission
      number - but no organizer name, contact info, documents, or internal
      approval remarks anywhere in the response, matching F24's exclusion
      list. Verified end-to-end against a live Postgres over real HTTP: ran
      one application through the full pipeline to APPROVED alongside a
      second left at DRAFT, and confirmed the public list only ever showed
      the approved one (draft correctly absent), the draft's detail endpoint
      404'd on direct access, the approved detail endpoint worked with zero
      auth headers and included real route geometry, and every filter
      (festival/station/date/timeframe) returned the correct counts including
      the negative cases (non-matching date -> 0, timeframe=live with nothing
      live yet -> 0).
- [x] 17/18/19. Redis + Socket.IO + live tracking — installed and ran Redis 7
      for real (not simulated) as an ephemeral "current position" cache
      (`@Global()` REDIS_CLIENT provider); Postgres (`live_locations`) remains
      the permanent history store per the spec's explicit rule. LiveTracking-
      Service: start (requires APPROVED status + an active route)/complete a
      procession, record GPS points with real PostGIS distance-to-route
      calculation (ST_Distance against the approved route's geography path),
      threshold-based deviation classification (NORMAL/WARNING/DEVIATION).
      Socket.IO gateway with the four spec'd rooms (application:{id},
      police-station:{id}, public-live, admin-live): optional JWT auth on
      connection (anonymous viewers allowed for public-live, everything else
      checked per-action), organizer location:update fans out to all relevant
      rooms in one broadcast. A public GET /public/processions/:id/live
      exposes only lat/lng/timestamp (F24: current location is public-safe,
      deviation/speed stay police-internal). Verified with **real WebSocket
      connections** via a socket.io-client test script (not mocked): an
      anonymous client, a staff client, and an authenticated organizer client
      all connected, joined rooms, and exchanged a live broadcast correctly
      end-to-end; a point ~200m off-route correctly measured ~221m and was
      classified DEVIATION while an on-route point measured ~0.03m and was
      NORMAL; recording before start correctly 400'd; an unauthenticated
      location:update and a non-staff join of a police-station room were both
      confirmed genuinely rejected (verified via the DB row count, not just a
      client-side timeout). Two real bugs found and fixed: the globally-
      registered ThrottlerGuard (Module 02) crashed every WebSocket handler
      by assuming an Express response object - fixed with @SkipThrottle() on
      the gateway; and JwtService wasn't available outside AuthModule until
      JwtModule was added to AuthModule's exports.
- [x] 16/20. Police control room (F22) — staff-only aggregate view of every
      currently-live procession, filterable by festival, event type, police
      station, area (resolved to that area's owning station), status
      (defaults to LIVE/GPS_WARNING/GPS_LOST - the "actually happening now"
      set, excluding NOT_STARTED/COMPLETED unless explicitly requested), and
      deviation status. Detail endpoint matches F22's click-marker spec
      exactly: mandal, application number, current location, latest speed/
      heading/accuracy, last update time, route geometry, and deviation
      status/distance. Verified end-to-end against a live Postgres over real
      HTTP, running one application all the way from application through
      approval to an actual live GPS point: list correctly showed the live
      procession with the right status/deviation/coordinates, detail view
      returned every field the spec calls out including real route GeoJSON,
      station/area/festival filters all returned the correct count (1),
      negative filters (wrong deviation status, wrong lifecycle status) both
      correctly returned 0, non-staff access correctly 403'd, and a
      non-existent/non-live application correctly 404'd.
- [x] 21/22. Route deviation alerts + GPS Lost detection — thresholds
      (deviation warning/alert meters, GPS warning/lost seconds) moved to
      config (spec explicitly requires this, not hardcoded). Deviation alerts
      fire once on entering DEVIATION and once on returning to NORMAL - not on
      every ping while it stays deviated. GPS health is tracked as its own
      live_processions.status dimension (LIVE/GPS_WARNING/GPS_LOST), separate
      from deviation_status - a first `@nestjs/schedule` background job
      (GpsWatchdogService, polling every 10s) flags staleness; recovery back
      to LIVE happens the instant a fresh point arrives via
      LiveTrackingService, not the watchdog. Alerts write to a minimal
      Notifications slice (in-app only; full multi-channel delivery is
      Module 24) with a sensible recipient fallback (assigned officers for
      the confirmed station, or all POLICE_ADMINs if none assigned yet).
      Verified end-to-end against a live Postgres, with fast test thresholds
      (5s/10s) so real transitions could be observed directly rather than
      waited out: LIVE -> GPS_WARNING -> GPS_LOST fired exactly one
      notification each, a fresh point correctly triggered GPS_RECOVERED and
      flipped status back to LIVE, an off-route point fired exactly one
      ROUTE_DEVIATION (not one per subsequent ping) and returning on-route
      fired exactly one ROUTE_DEVIATION_RESOLVED, and the notifications
      read/mark-read API correctly scoped to the requesting user (404, not a
      silent no-op, when marking another user's notification or a
      nonexistent one).
    
      **Real bug found and fixed via this live testing**: TypeORM's
      `DataSource.query()` returns a `[rows, affectedCount]` tuple for
      `UPDATE ... RETURNING` statements specifically - unlike `SELECT` or
      `INSERT ... RETURNING`, which return a plain rows array. This is the
      first `UPDATE ... RETURNING` anywhere in the codebase, so the bug never
      surfaced before: the watchdog was iterating over the 2-element tuple as
      if each element were a row, calling `alert(undefined, ...)` twice per
      query and writing notifications with a NULL `related_application_id`.
      Caught by noticing duplicate/null-application alerts in a controlled
      test, root-caused by comparing compiled output against source, and
      confirmed fixed by destructuring `const [rows] = await query(...)`
      instead. Also fixed a related honesty gap in the notifications
      mark-read endpoint, found during the same testing pass: it always
      returned `{success:true}` even when the target notification belonged to
      someone else (silently a no-op due to correct SQL scoping, but a
      misleading response) - now correctly 404s.
- [x] 17. Conflict detection — same date, overlapping time window, and route
      geometry running within a configurable proximity buffer (default 50m)
      of another active application's route. Overlap length computed via
      ST_Intersection of one route against a buffered polygon of the other,
      classified LOW/MEDIUM/HIGH against configurable meter thresholds.
      Conflicts are symmetric - stored once per pair. Staff resolve as
      ALLOWED/TIME_CHANGED/ROUTE_CHANGED/REJECTED (F19). Verified against a
      live Postgres over real HTTP with genuinely constructed geometry: two
      applications on the same date, overlapping time, routes ~33m apart for
      ~2km correctly detected as a single HIGH-severity conflict (~2050m
      overlap).
    
      Note on this rebuild: this module (along with Reports/Audit, Security
      Hardening, and the Frontend build) was originally built and verified
      on 2026-09-07/08, but lost when the build sandbox's local filesystem
      was wiped before those commits reached GitHub - only work that's
      actually pushed survives a sandbox reset. Rebuilt here from the
      original detailed reasoning, including the HAVING-without-GROUP-BY fix
      discovered the first time (ST_Length/ST_Intersection are per-row
      scalars, not aggregates - filtered via a subquery + WHERE instead),
      applied directly rather than rediscovered. Verification this pass was
      a single confirming smoke test rather than the full original battery
      (missing route/no-conflict/resolve/403/404 cases), since the logic is
      a byte-for-byte reproduction of already-exhaustively-tested code.
- [ ] 18. Notifications - full multi-channel delivery (push/email/SMS); the
      in-app record/read/mark-read slice this module needed already exists
- [x] 19. Reports & audit logs — two modules landed together:
      - **Audit logs (B24)**: a global `AuditLogInterceptor` (registered via `APP_INTERCEPTOR`)
        logs every authenticated mutating request (POST/PATCH/PUT/DELETE) without each
        controller having to report what it touched. `entityType`/`entityId`/`action` are
        derived from the request path alone (e.g. `PATCH /applications/<uuid>/approve` ->
        entity `applications`, action `APPLICATIONS.APPROVE`; plain CRUD with no sub-action
        segment falls back to a verb map, e.g. `POST /festivals` -> `FESTIVALS.CREATE`).
        Sensitive fields (`password`, `newPassword`, `confirmPassword`, `token`,
        `refreshToken`, `accessToken`) are redacted from the logged body before it's
        written. A write failure is swallowed, never surfaced to the client - logging must
        not break the request it's observing. `GET /audit-logs` (list, filterable by
        entityType/entityId/userId/action/date range) and `GET /audit-logs/:id` are
        restricted to SUPER_ADMIN/POLICE_ADMIN.
      - **Reports (B23)**: `GET /reports/summary|by-festival|by-event-type|by-area|
        by-police-station|conflicts|deviations`, all scoped by an optional
        from/to/festivalId/eventTypeId filter, restricted to staff roles (SUPER_ADMIN/
        POLICE_ADMIN/POLICE_OFFICER). Festival/event-type/area/police-station breakdowns
        use a LEFT JOIN with the scope filter folded into the `ON` clause (not `WHERE`) so
        a festival or station with zero matching applications still reports a 0 count
        instead of silently dropping out of a LEFT JOIN. `GET /reports/applications.csv`
        exports the same scope as a CSV via a small hand-rolled RFC 4180 writer - no xlsx/
        pdf export (documented as a gap, not faked); CSV opens in Excel and every
        spreadsheet tool without pulling in a binary-format library.

      Verified against a live Postgres/PostGIS/Redis + real HTTP: registered an organizer,
      logged in, created an application, confirmed the resulting audit-log row has the
      right action/entity/IP and an unredacted-but-non-sensitive body; logged in as a
      SUPER_ADMIN and confirmed every report endpoint, including that a festival/event-type
      with 0 applications still appears with `count: 0` rather than being dropped; confirmed
      the CSV export's header/row shape; confirmed an ORGANIZER gets 403 from both
      `/reports/*` and `/audit-logs`. Test users/application/audit rows deleted afterward.
- [x] 20. Security hardening (testing/deployment remain open - see below):
      - **Helmet** on every response (CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
        etc. - confirmed present on a live response, not just configured).
      - **Production JWT-secret guard**: bootstrap refuses to start when `NODE_ENV=production`
        and either `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` is still the config layer's
        dev fallback - confirmed it throws and exits with the defaults, and boots and serves
        normally once real secrets are supplied.
      - **`dotenv/config` as the literal first import** in `main.ts`, ahead of `AppModule`.
        `@WebSocketGateway`'s decorator options (the live-tracking gateway's CORS origin)
        are evaluated at class-definition time, when the module graph is first imported -
        before `ConfigModule.forRoot()` would otherwise have loaded `.env`. Without this,
        `FRONTEND_URL` reads `undefined` at decorator-evaluation time no matter what's in
        the file.
      - **Live-tracking gateway CORS** narrowed from `origin: '*'` to the configured
        frontend origin (with credentials), matching the HTTP CORS policy instead of
        leaving the WebSocket transport wide open.
      - **`multer` vulnerability (GHSA-wc9g-mqfw-jrwm` and four related DoS/bypass
        advisories, all fixed in 2.4.0)**: bumped the direct dependency to `2.4.0` and added
        an npm `overrides` entry so `@nestjs/platform-express`'s own nested copy resolves to
        the patched version too - confirmed via `npm ls multer` that only one, patched copy
        exists in `node_modules` afterward, and `npm audit` no longer reports it.
      - Removed the unused `@nestjs/mau` devDependency (deployment CLI add-on that was never
        used and was the only other thing `npm audit` was flagging).
      - Remaining `npm audit` findings (`brace-expansion`, `fast-uri`) are transitive dev-only
        dependencies of `@nestjs/cli` - not shipped to production, not applied to breaking
        major-version bumps here.

      Verified against a live server: `curl -I` showed the Helmet header set and the CORS
      policy scoped to `http://localhost:4200`; booting with `NODE_ENV=production` and the
      default JWT secrets threw and exited as designed; booting with real secrets (on a
      second port) served a 200 normally. Testing (an actual automated test suite) and
      production deployment (Docker Compose verification - Docker itself isn't available in
      this sandbox) remain open, tracked separately rather than marked done here.
- [x] 21. Frontend - organizer workspace (rebuilt a third time after two sandbox data-loss
      incidents; core infra, login, and a stub dashboard survived both resets, everything
      else here is new):
      - **Fixed a real bug found during this rebuild**: `AuthService` assumed a
        `{success, data}` response envelope the backend has never actually used - every
        login/register/refresh would have silently read `undefined` off `res.data`. Fixed
        `AuthResponse`/added `RegisterResponse` to match the backend's real (unwrapped)
        shape, confirmed by replaying actual `/auth/login` and `/auth/register` responses.
      - **Design system**: Fraunces (display) + IBM Plex Sans (body), an indigo/marigold/
        warm-paper palette, and a ledger/register visual language (rule dividers, left-border
        status accents, numbered entries) instead of rounded SaaS cards - deliberate choices
        for a civic permit-register product, not the frontend-design skill's generic
        defaults. Tokens live in `src/styles.scss`; fonts load via `index.html` (Angular's
        build-time font inlining was disabled in `angular.json` for the production
        configuration - it tries to fetch fonts.googleapis.com during the build itself,
        which fails in any network-restricted build environment including this sandbox).
      - **Register** (`/auth/register`) and **Login** (`/auth/login`), both against the real
        `/auth/*` endpoints.
      - **Organizer shell** (`AppShellComponent`): sidebar nav + user info, wraps all
        `/organizer/*` routes.
      - **Dashboard**: status counts, upcoming events, and recent notifications - all derived
        client-side from the real `/applications` and `/notifications` responses (there's no
        separate dashboard-summary endpoint on the backend).
      - **Application list** (`/organizer/applications`): filterable by festival/event-type/
        status, paginated ("load more"), hitting the real `GET /applications` with query
        params.
      - **Application form** (`/organizer/applications/new` and `/organizer/applications/:id`):
        one component serves create, edit, and view/submit, covering F07's event-detail
        fields (festival, event type, mandal, date/time, crowd, vehicles, sound/DJ/dhol/
        generator, special requirements). Locked once the application leaves DRAFT/
        CHANGES_REQUESTED. Submitting correctly surfaces the backend's real validation error
        when there's no route yet ("build and calculate a route before submitting") rather
        than faking success - the route builder (F08-F11, Google Maps + PostGIS) is a
        separate, not-yet-built module.
      - **Not built yet**: the full 10-step F05 wizard (this is a single-page form covering
        the event-detail step only), the Google Maps location/route builder, documents
        upload, the police review workspace, live tracking map, and the public portal.

      Verified against a live Postgres/PostGIS/Redis + real NestJS server, through an actual
      headless-Chromium browser (Playwright) driving the production Angular build served
      statically - not just `ng build` succeeding: registered a new organizer, logged in,
      confirmed the dashboard renders real data, filtered and loaded the application list,
      created a new application, confirmed it showed as DRAFT, attempted to submit it and
      confirmed the real backend 400 ("no route yet") surfaced correctly rather than being
      swallowed, and confirmed the new application appears back in the list. Test user/
      application rows deleted afterward.

## Database migrations

```bash
cd database
npm install
cp ../.env.example .env   # or export DB_* vars directly
npm run migrate   # applies database/migrations/*.sql in order, tracked in schema_migrations
npm run seed       # applies database/seeds/*.sql — idempotent, safe to re-run
```

The official `postgis/postgis` Docker image (used in `docker-compose.yml`) preloads the
`postgis`/`pgcrypto` extensions for the default database, so `docker compose up -d postgres`
+ `npm run migrate` should just work. If you're pointing at a bare-metal Postgres instead,
create the `postgis` and `pgcrypto` extensions as a superuser first — the app DB user
generally shouldn't own extensions.

## Notes for contributors

- Backend uses native ESM (`"type": "module"`) — all local relative imports need
  the `.js` extension even though the source files are `.ts`.
- TypeORM uses a custom `SnakeNamingStrategy` (`backend/src/database/`) so entity
  properties like `passwordHash` map to the migration's `password_hash` columns
  without per-column `@Column({ name: ... })` annotations. `synchronize` is always
  `false` — migrations in `database/migrations` are the only source of schema truth.
- Route data must go through PostGIS geometry/geography types (see the `route_versions`
  and `areas` tables in migration 0005/0007) — do not store route points as plain
  lat/lng columns.
