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
- [ ] 07. Google Maps integration
- [ ] 08. Route builder + versioning
- [ ] 09. PostGIS route analysis + police station recommendation
- [ ] 10. Documents module
- [ ] 11. Police review + multi-station approval
- [ ] 12. Permission + QR
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
