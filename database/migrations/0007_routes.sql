-- Routes, versions, points (B10) — never edit an approved route in place;
-- police-requested changes create a new route_version instead.

CREATE TABLE routes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE route_version_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SUPERSEDED');

CREATE TABLE route_versions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id         UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  version_number   INTEGER NOT NULL,
  status           route_version_status NOT NULL DEFAULT 'DRAFT',

  start_address     TEXT NOT NULL,
  start_place_id    VARCHAR(255),
  start_point       GEOGRAPHY(Point, 4326) NOT NULL,

  destination_address  TEXT NOT NULL,
  destination_place_id VARCHAR(255),
  destination_point    GEOGRAPHY(Point, 4326) NOT NULL,

  path              GEOGRAPHY(LineString, 4326),  -- full route geometry, computed on "Calculate Route"
  distance_meters   NUMERIC(10, 2),
  duration_seconds  INTEGER,

  change_reason     TEXT,  -- populated when this version exists because police requested changes
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (route_id, version_number)
);

CREATE INDEX idx_route_versions_route ON route_versions(route_id);
CREATE INDEX idx_route_versions_path ON route_versions USING GIST (path);
CREATE INDEX idx_route_versions_status ON route_versions(status);

-- Ordered waypoints for a version: Start (0), Point 1..N, Destination (last).
CREATE TABLE route_points (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_version_id UUID NOT NULL REFERENCES route_versions(id) ON DELETE CASCADE,
  sequence_no      INTEGER NOT NULL,
  point_type       VARCHAR(20) NOT NULL DEFAULT 'WAYPOINT', -- START, WAYPOINT, DESTINATION
  address          TEXT,
  place_id         VARCHAR(255),
  location         GEOGRAPHY(Point, 4326) NOT NULL,

  UNIQUE (route_version_id, sequence_no)
);

CREATE INDEX idx_route_points_version ON route_points(route_version_id);

ALTER TABLE applications
  ADD CONSTRAINT fk_applications_active_route FOREIGN KEY (active_route_id) REFERENCES route_versions(id);
