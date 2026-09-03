-- Suggested + confirmed police stations per application (B11/B12), and the
-- per-station approval trail that drives overall multi-station approval (B14/F18).

CREATE TABLE application_police_stations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  police_station_id   UUID NOT NULL REFERENCES police_stations(id),
  route_version_id    UUID NOT NULL REFERENCES route_versions(id),

  distance_km          NUMERIC(6, 2),
  coverage_percentage  NUMERIC(5, 2),   -- % of route geometry inside this station's jurisdiction
  is_responsible       BOOLEAN NOT NULL DEFAULT false,  -- jurisdiction-based, not just nearest (B12)
  is_confirmed         BOOLEAN NOT NULL DEFAULT false,  -- organizer confirmed this suggestion

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, police_station_id, route_version_id)
);

CREATE INDEX idx_aps_application ON application_police_stations(application_id);
CREATE INDEX idx_aps_station ON application_police_stations(police_station_id);

CREATE TYPE approval_decision AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

CREATE TABLE application_approvals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id       UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  police_station_id    UUID NOT NULL REFERENCES police_stations(id),
  decision             approval_decision NOT NULL DEFAULT 'PENDING',
  reason               TEXT,  -- required for REJECTED / CHANGES_REQUESTED (F17)
  decided_by           UUID REFERENCES users(id),
  decided_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (application_id, police_station_id)
);

CREATE INDEX idx_approvals_application ON application_approvals(application_id);
CREATE INDEX idx_approvals_decision ON application_approvals(decision);
