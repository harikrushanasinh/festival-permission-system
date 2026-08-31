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

- [x] 01. Project setup (this commit)
- [x] F01. Angular core module (auth scaffolding, interceptors, guards, services)
- [x] B01/B02. Auth + Users backend module (register/login/refresh/logout/forgot/reset)
- [ ] 02. Database schema & migrations (PostGIS-enabled)
- [ ] 03/RBAC. Roles & permissions
- [ ] 04. Super Admin masters (festivals, event types, police stations, areas)
- [ ] 05. Organizer registration UI
- [ ] 06. Application module (list/filters)
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

## Notes for contributors

- Backend uses native ESM (`"type": "module"`) — all local relative imports need
  the `.js` extension even though the source files are `.ts`.
- `synchronize: true` on TypeORM is dev-only; migrations in `database/migrations`
  own the schema from module 02 onward.
- Route data must go through PostGIS geometry types (see B07/B11) — do not store
  route points as plain lat/lng pairs once the migrations module lands.
