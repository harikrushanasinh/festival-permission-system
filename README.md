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
- [ ] 13. Public portal
- [ ] 14. Redis + Socket.IO
- [ ] 15. Live tracking + deviation/GPS-lost detection
- [ ] 16. Police control room
- [ ] 17. Conflict detection
- [ ] 18. Notifications
- [ ] 19. Reports & audit logs
- [ ] 20. Security hardening, testing, deployment

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
